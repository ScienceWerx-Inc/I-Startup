/**
 * Transactional email, sent through MoreWerx's partner email API: MoreWerx delivers from
 * its verified domain under the name "iStartup", so iStartup holds no email account of
 * its own. Env: `MOREWERX_API_URL` (e.g. https://…) and `MOREWERX_PARTNER_KEY` (secret).
 *
 * Returns 'off' when MoreWerx isn't configured (or refuses because email is off for this
 * key): the caller logs and carries on. Nothing here ever logs an address or a link.
 */

const FROM_NAME = 'iStartup';

export type SendResult = 'sent' | 'failed' | 'off';

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  const url = process.env.MOREWERX_API_URL;
  const key = process.env.MOREWERX_PARTNER_KEY;
  if (!url || !key) {
    console.info(`[email] (not configured) subject="${subject}"`);
    return 'off';
  }
  try {
    const res = await fetchImpl(`${url.replace(/\/+$/, '')}/api/partner/v1/email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, fromName: FROM_NAME }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return 'sent';
    const body = (await res.json().catch(() => ({}))) as { code?: string };
    if (body.code === 'EMAIL_OFF' || res.status === 403) {
      console.info(`[email] (off at MoreWerx) subject="${subject}"`);
      return 'off';
    }
    console.error(`[email] MoreWerx refused (${res.status} ${body.code ?? ''}) subject="${subject}"`);
    return 'failed';
  } catch (error) {
    console.error('[email] MoreWerx unreachable:', (error as Error)?.name ?? 'Error');
    return 'failed';
  }
}
