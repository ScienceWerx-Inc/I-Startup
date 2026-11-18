import { createHealthHandler } from '@/lib/observability';
import { col, isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health — checked by the ScienceWerx uptime monitor every 10 minutes.
 *
 * Public, so it only says whether each dependency answered and how fast; never a
 * config value or a stack. One check, Firestore, the only data store: sign-in,
 * reports, courses and the admin console all need it. A one-document read of the
 * small config collection with no fields selected, so no data leaves the database
 * and it costs one read per check. Not behind the proxy (src/proxy.ts matches
 * only /admin, /interview, /learn, /certificate and /team).
 */
export const GET = createHealthHandler({
  service: 'i-startup-web',
  checks: {
    firestore: async () => {
      if (!isDatabaseConfigured()) throw new Error('database not configured');
      await col('config').select().limit(1).get();
    },
  },
});
