import { lmsRepos } from '@/brico/lms';
import type { StoredUser } from '@/lib/account';
import { col, emailKey, newestFirst } from '@/lib/db';
import { listJobsForViewer } from '@/lib/gap-course/service';
import { listCourseCards } from '@/lib/gap-course/view';
import type { ReportRow } from '@/lib/reports';

import type { FounderDirectory } from './istartup';

/**
 * The Firestore-backed directory a Connect provider reads. Every read is keyed by one
 * person: the email index document, then that user's own reports, courses and
 * certificates. Nothing here lists or searches other people.
 */
export const firestoreDirectory: FounderDirectory = {
  async findByEmail(email) {
    const index = await col('userEmails').doc(emailKey(email)).get();
    const userId = index.exists ? (index.get('user_id') as string | undefined) : undefined;
    if (!userId) return null;
    const snap = await col('users').doc(userId).get();
    if (!snap.exists) return null;
    const user = snap.data() as StoredUser;
    return { id: snap.id, email: user.email, email_verified_at: user.email_verified_at ?? null };
  },

  async latestReport(userId) {
    const snap = await col('reports').where('user_id', '==', userId).get();
    const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReportRow);
    return reports.sort(newestFirst)[0] ?? null;
  },

  async courses(userId) {
    const cards = await listCourseCards(await listJobsForViewer(userId), userId);
    return cards.map((c) => ({
      title: c.title,
      status: c.status,
      percent: c.percent,
      certificateId: c.certificateId,
      updatedAt: c.updatedAt,
    }));
  },

  async courseCertificates(userId) {
    const page = await lmsRepos().certificates.list({ where: { userId: { eq: userId } }, limit: 50 });
    return page.items;
  },
};
