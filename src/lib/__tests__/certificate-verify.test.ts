import { describe, expect, it } from 'vitest';

import type { Certificate } from '@/features/lms/domain';
import { FakeRepository } from '@/features/lms/testing/fake-repo';
import { certificateVerifyUrl, normalizeCertificateCode, verifyCertificateCode } from '@/lib/certificate-verify';

const at = (iso: string) => Date.parse(iso);

async function repoWith(...certs: Array<Partial<Certificate> & { code: string }>) {
  const repo = new FakeRepository<Certificate>();
  for (const c of certs) {
    await repo.create({
      id: c.code,
      courseId: 'course_1',
      userId: 'u1',
      learnerNameSnap: 'Dana Okonjo',
      courseTitleSnap: 'Closing the gaps',
      issuedAt: at('2026-10-16T09:30:00Z'),
      curriculumVersion: 1,
      ...c,
    });
  }
  return repo;
}

describe('certificate verification', () => {
  const now = at('2026-11-25T00:00:00Z');

  it('reports a current certificate as valid, with only what the certificate prints', async () => {
    const repo = await repoWith({ code: '411-0A1B2C3D4E' });
    const result = await verifyCertificateCode('411-0A1B2C3D4E', repo, now);
    expect(result).toEqual({
      code: '411-0A1B2C3D4E',
      learnerName: 'Dana Okonjo',
      courseTitle: 'Closing the gaps',
      issuedAt: '2026-10-16T09:30:00.000Z',
      expiresAt: '2027-04-16T09:30:00.000Z',
      revokedAt: null,
      status: 'valid',
    });
  });

  it('accepts lower-case and padded input', async () => {
    const repo = await repoWith({ code: '411-0A1B2C3D4E' });
    expect((await verifyCertificateCode('  411-0a1b2c3d4e ', repo, now))?.status).toBe('valid');
  });

  it('reports expired after six months', async () => {
    const repo = await repoWith({ code: '411-0A1B2C3D4E', issuedAt: at('2026-01-10T00:00:00Z') });
    expect((await verifyCertificateCode('411-0A1B2C3D4E', repo, now))?.status).toBe('expired');
  });

  it('reports revoked (rather than unknown), even when also expired', async () => {
    const repo = await repoWith(
      { code: '411-0A1B2C3D4E', revokedAt: at('2026-11-01T00:00:00Z') },
      { code: '411-FFFFFFFFFF', issuedAt: at('2026-01-10T00:00:00Z'), revokedAt: at('2026-02-01T00:00:00Z') },
    );
    const revoked = await verifyCertificateCode('411-0A1B2C3D4E', repo, now);
    expect(revoked?.status).toBe('revoked');
    expect(revoked?.revokedAt).toBe('2026-11-01T00:00:00.000Z');
    expect((await verifyCertificateCode('411-FFFFFFFFFF', repo, now))?.status).toBe('revoked');
  });

  it('returns null for unknown and malformed codes', async () => {
    const repo = await repoWith({ code: '411-0A1B2C3D4E' });
    expect(await verifyCertificateCode('411-0000000000', repo, now)).toBeNull();
    expect(await verifyCertificateCode('CERT1', repo, now)).toBeNull();
    expect(await verifyCertificateCode('411-0A1B2C3D4E/../x', repo, now)).toBeNull();
    expect(await verifyCertificateCode(null, repo, now)).toBeNull();
  });

  it('normalizes codes and builds the printed URL', () => {
    expect(normalizeCertificateCode('411-abcdef0123')).toBe('411-ABCDEF0123');
    expect(normalizeCertificateCode('411-ABCDEF012')).toBeNull();
    expect(normalizeCertificateCode('411-GHIJKL0123')).toBeNull();
    expect(certificateVerifyUrl('411-ABCDEF0123', 'https://istartup.example/')).toBe('https://istartup.example/verify/411-ABCDEF0123');
    expect(certificateVerifyUrl('411-ABCDEF0123')).toBe('/verify/411-ABCDEF0123');
  });
});
