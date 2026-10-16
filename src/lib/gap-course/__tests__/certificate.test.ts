import { describe, expect, it } from 'vitest';

import { certificateExpiry, isCertificateExpired } from '../shared';

const at = (iso: string) => Date.parse(iso);

describe('certificateExpiry', () => {
  it('is six calendar months after issue', () => {
    expect(certificateExpiry(at('2026-10-16T09:30:00Z')).toISOString()).toBe('2027-04-16T09:30:00.000Z');
  });

  it('clamps to the last day of a shorter month', () => {
    expect(certificateExpiry(at('2026-08-31T12:00:00Z')).toISOString()).toBe('2027-02-28T12:00:00.000Z');
  });

  it('is expired from the expiry moment on', () => {
    const issued = at('2026-01-10T00:00:00Z');
    expect(isCertificateExpired(issued, at('2026-07-09T23:59:59Z'))).toBe(false);
    expect(isCertificateExpired(issued, at('2026-07-10T00:00:00Z'))).toBe(true);
  });
});
