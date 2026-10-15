import { z } from 'genkit';

import { ai } from '@/ai/genkit';
import type { GapFocus, GapModule, GapPlan } from './plan';

/**
 * The two model calls behind a gap-closing course: one outline, then one call per lesson.
 * Both use structured output, and the code — not the model — decides how many modules
 * and lessons there are (see plan.ts); the outline is clamped to that shape afterwards.
 */

/* ───────────────────────────────── outline ───────────────────────────────── */

const OutlineSchema = z.object({
  title: z.string().describe('Course title naming the startup and the outcome, max 80 chars'),
  subtitle: z.string().describe('One sentence, max 140 chars'),
  description: z.string().describe('2–3 sentences: what the founder will be able to do afterwards'),
  modules: z.array(
    z.object({
      key: z.string().describe('The module key exactly as given'),
      title: z.string().describe('Module title phrased as the outcome, max 60 chars'),
      lessons: z.array(
        z.object({
          title: z.string().describe('A claim or a task, max 70 chars, never a bare topic'),
          brief: z.string().describe('2–3 sentences: what this lesson teaches and the misconception it corrects'),
          focusQuestionIds: z.array(z.string()).describe('Which of the module\'s gap ids this lesson closes'),
          durationMin: z.number().int().min(4).max(12),
        }),
      ),
    }),
  ),
});

export type CourseOutline = z.infer<typeof OutlineSchema>;

const describeStartup = (plan: GapPlan) =>
  [
    `Name: ${plan.startup.name || 'Unnamed startup'}`,
    plan.startup.description ? `What it does: ${plan.startup.description}` : null,
    plan.startup.sector ? `Sector: ${plan.startup.sector}` : null,
    plan.startup.stage ? `Stage: ${plan.startup.stage}` : null,
    plan.startup.teamSize ? `Team size: ${plan.startup.teamSize}` : null,
    plan.startup.funding ? `Funding to date: ${plan.startup.funding}` : null,
    `iSTARTUP Score: ${plan.finalScore}/500 (${plan.band})`,
  ]
    .filter(Boolean)
    .join('\n');

const describeFocus = (f: GapFocus) =>
  [
    `  - [${f.questionId}] ${f.title}: "${f.prompt}"`,
    `    They answered (${f.value}/5): "${f.current}"`,
    f.better.length ? `    What better looks like: ${f.better.map((b) => `"${b}"`).join(' → ')}` : null,
    `    Why it matters: ${f.gap}`,
    `    Recommended next step: ${f.action}`,
  ]
    .filter(Boolean)
    .join('\n');

const describeModule = (m: GapModule) =>
  [
    `Module key: ${m.key} — ${m.title} (scored ${m.percent}%, ${m.level}). Exactly ${m.lessonCount} lessons.`,
    `Dimension: ${m.summary}`,
    'Gaps to close:',
    ...m.focus.map(describeFocus),
  ].join('\n');

export async function generateOutline(plan: GapPlan): Promise<CourseOutline> {
  const { output } = await ai.generate({
    output: { schema: OutlineSchema },
    config: { temperature: 0.6 },
    prompt: `You design short, practical courses for startup founders. This founder just took the iSTARTUP readiness assessment; build the course that closes the specific gaps it found.

THE STARTUP
${describeStartup(plan)}

THE MODULES — produce exactly these ${plan.modules.length} modules, in this order, with exactly the lesson count stated for each:
${plan.modules.map(describeModule).join('\n\n')}

RULES
- Every lesson targets at least one listed gap id, and every gap id is covered by some lesson in its module.
- Order lessons so each builds on the one before; the last lesson of a module is the most hands-on.
- Lessons are about THIS startup's situation (sector, stage, team), not generic advice.
- Each brief names the misconception the lesson corrects.
- Plain text only. Invent no statistics, studies, or named sources.
- Do not produce quiz, test, or recap lessons.`,
  });
  if (!output) throw new Error('The model returned no outline.');
  return clampOutline(output, plan);
}

/** Forces the outline into the plan's shape: plan order, plan lesson counts, known gap ids. */
function clampOutline(outline: CourseOutline, plan: GapPlan): CourseOutline {
  const byKey = new Map(outline.modules.map((m) => [m.key, m]));
  const modules = plan.modules.map((pm, i) => {
    const m = byKey.get(pm.key) ?? outline.modules[i];
    if (!m || m.lessons.length < 1) throw new Error(`Outline is missing module ${pm.key}.`);
    const ids = new Set(pm.focus.map((f) => f.questionId));
    const lessons = m.lessons.slice(0, pm.lessonCount).map((l, j) => {
      const focus = l.focusQuestionIds.filter((id) => ids.has(id));
      return {
        ...l,
        focusQuestionIds: focus.length ? focus : [pm.focus[j % pm.focus.length].questionId],
        durationMin: Math.min(12, Math.max(4, Math.round(l.durationMin))),
      };
    });
    return { key: pm.key, title: m.title || pm.title, lessons };
  });
  return { ...outline, modules };
}

/* ───────────────────────────────── lessons ───────────────────────────────── */

const LessonSchema = z.object({
  body: z
    .string()
    .describe('The lesson, plain-text paragraphs separated by a blank line. No markdown, no headings, no bullet lists.'),
  keyPoints: z.array(z.string()).min(3).max(5).describe('What the founder should still remember a week later'),
  callout: z.object({
    kind: z.enum(['warning', 'note']),
    text: z.string().describe('One short aside, usually the mistake this lesson exists to prevent'),
  }),
  exercise: z
    .string()
    .describe('A concrete task the founder does for their own startup this week, with a clear deliverable. 2–4 sentences.'),
  checkpoint: z.object({
    stem: z.string().describe('A scenario question that tests understanding, not recall'),
    options: z.array(z.object({ id: z.string(), label: z.string() })).length(4),
    correctOptionId: z.string(),
    explanation: z.string().describe('Why the right answer is right and the most tempting wrong one is wrong'),
  }),
});

export type GeneratedLesson = z.infer<typeof LessonSchema>;

export async function generateLesson(input: {
  plan: GapPlan;
  module: GapModule;
  moduleTitle: string;
  lesson: { title: string; brief: string; focusQuestionIds: string[]; durationMin: number };
  previousTitles: string[];
  nextTitle?: string;
}): Promise<GeneratedLesson> {
  const focus = input.module.focus.filter((f) => input.lesson.focusQuestionIds.includes(f.questionId));
  const targetWords = Math.min(600, Math.max(300, input.lesson.durationMin * 70));

  const { output } = await ai.generate({
    output: { schema: LessonSchema },
    config: { temperature: 0.7 },
    prompt: `You are writing one lesson of a personalised course for a startup founder, built from their iSTARTUP assessment.

THE STARTUP
${describeStartup(input.plan)}

MODULE: ${input.moduleTitle} (their ${input.module.title} score: ${input.module.percent}%)
LESSON: ${input.lesson.title}
BRIEF: ${input.lesson.brief}

THE GAPS THIS LESSON CLOSES
${(focus.length ? focus : input.module.focus).map(describeFocus).join('\n')}

${input.previousTitles.length ? `ALREADY TAUGHT (do not explain again): ${input.previousTitles.join(' | ')}` : 'This is the first lesson of the course.'}
${input.nextTitle ? `NEXT LESSON (leave it for then): ${input.nextTitle}` : 'This is the last lesson of the course; end with momentum.'}

WRITE
- About ${targetWords} words of body, never more than ${targetWords + 150}. Open with the idea itself, not a preamble.
- Start from where they are ("They answered: …") and show the concrete steps to the next level up.
- Use their startup's situation in examples — sector, stage, team size.
- One idea per paragraph. Plain text only: no markdown, asterisks, headings, or bullet lists.
- Correct the misconception named in the brief.
- Invent no statistics, studies, quotes, or named sources.
- The checkpoint has exactly 4 options with ids "a", "b", "c", "d"; wrong options must be plausible.`,
  });
  if (!output) throw new Error('The model returned no lesson.');
  return {
    ...output,
    body: toPlainParagraphs(output.body),
    checkpoint: {
      ...output.checkpoint,
      correctOptionId: output.checkpoint.options.some((o) => o.id === output.checkpoint.correctOptionId)
        ? output.checkpoint.correctOptionId
        : output.checkpoint.options[0].id,
    },
  };
}

/** Strips markdown the model slips in anyway, and normalises paragraph breaks. */
function toPlainParagraphs(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}
