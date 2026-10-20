import { z } from 'zod';

/**
 * Co-founders' contact details, asked for in onboarding when a startup has more than one
 * founder. Shared by the form (browser) and the server: the list travels in the onboarding
 * answers as one JSON string under `cofounders`, and the server moves it into the company.
 * No imports beyond zod, so the client bundle stays small.
 */

export const CofounderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(40)
    .regex(/^[+\d][\d\s().-]{5,}$/),
});

export type Cofounder = z.infer<typeof CofounderSchema>;

/** How many co-founders the "How many founders?" answer calls for (4+ means at least 3). */
export function cofoundersNeeded(founders: string | undefined): number {
  if (!founders || founders === 'Solo founder') return 0;
  if (founders === '4+') return 3;
  const n = Number.parseInt(founders, 10);
  return Number.isFinite(n) && n > 1 ? n - 1 : 0;
}

export const MAX_COFOUNDERS = 9;

export function parseCofounders(raw: string | undefined): Array<Partial<Cofounder>> {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.slice(0, MAX_COFOUNDERS) : [];
  } catch {
    return [];
  }
}

/**
 * The validated list, or an error a founder can act on. Exactly the number the founders
 * answer calls for ("4+": three or more), every row complete, no repeated emails, and not
 * the lead's own email.
 */
export function validateCofounders(
  founders: string | undefined,
  raw: string | undefined,
  leadEmail?: string,
): { ok: true; cofounders: Cofounder[] } | { ok: false; error: string } {
  const needed = cofoundersNeeded(founders);
  const rows = parseCofounders(raw).filter((r) => r && (r.name || r.email || r.phone));
  if (needed === 0) return { ok: true, cofounders: [] };
  if (rows.length < needed || (founders !== '4+' && rows.length > needed)) {
    return { ok: false, error: `Add the contact details of ${founders === '4+' ? `at least ${needed}` : needed} co-founder${needed === 1 ? '' : 's'}.` };
  }
  const out: Cofounder[] = [];
  for (const [i, row] of rows.entries()) {
    const parsed = CofounderSchema.safeParse(row);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return { ok: false, error: `Co-founder ${i + 1}: enter a valid ${field === 'email' ? 'email' : field === 'phone' ? 'phone number' : 'name'}.` };
    }
    out.push(parsed.data);
  }
  const emails = out.map((c) => c.email);
  if (new Set(emails).size !== emails.length) return { ok: false, error: 'Each co-founder needs their own email address.' };
  if (leadEmail && emails.includes(leadEmail.trim().toLowerCase())) {
    return { ok: false, error: 'List your co-founders here, not yourself.' };
  }
  return { ok: true, cofounders: out };
}
