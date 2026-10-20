import { z } from 'genkit';

import { ai, MODEL } from '@/ai/genkit';
import { normalizeFlowchart } from '@/lib/lessons/mermaid-source';
import { toPlainParagraphs } from '@/lib/lessons/plain-prose';

import { usageFrom } from '@/lib/ai-pricing';
import { recordAiUsage } from '@/lib/ai-usage';

import { memoize } from './memo';
import type { GapFocus, GapModule, GapPlan } from './plan';

/**
 * The two model calls behind a gap-closing course: one outline, then one call per lesson.
 * Both use structured output, and the code — not the model — decides how many modules
 * and lessons there are (see plan.ts); the outline is clamped to that shape afterwards.
 *
 * The writing rules are ScienceWerx's course generator's (generateCourseOutline and
 * generateLessonBody there): briefs that name a misconception, lessons ordered by
 * dependency, worked examples, "what is NOT true", lengths from reading time, an optional
 * diagram, and a hands-on workshop to close each module.
 */

/**
 * One structured model call, memoized by its exact request (memo.ts): an identical
 * prompt returns the stored output instead of calling the model again. The raw output is
 * what is cached; the clean-up after it (clamping, filtering) runs either way.
 */
/** Which course a call is for, so the cost report can total per course. */
export interface CallMeta {
  courseId?: string;
}

async function generateCached<S extends z.ZodTypeAny>(
  kind: 'outline' | 'lesson' | 'quiz',
  schema: S,
  temperature: number,
  prompt: string,
  meta: CallMeta = {},
): Promise<z.infer<S>> {
  return memoize(
    { kind, model: MODEL, temperature, schemaVersion: '1', prompt },
    async () => {
      const res = await ai.generate({ output: { schema }, config: { temperature }, prompt });
      if (!res.output) throw new Error(`The model returned no ${kind}.`);
      return { value: res.output as z.infer<S>, usage: usageFrom(res.usage) };
    },
    (value) => {
      const parsed = schema.safeParse(value);
      return parsed.success ? (parsed.data as z.infer<S>) : null;
    },
    undefined,
    (outcome) => recordAiUsage({ feature: kind, ...outcome, courseId: meta.courseId }),
  );
}

/** Prose is read at roughly this rate, which is how a lesson's length is derived. */
export const WORDS_PER_MINUTE = 160;
const MIN_LESSON_MIN = 6;
const MAX_LESSON_MIN = 14;

/** Words to aim for, given how long the founder is expected to spend. */
export const targetWordsFor = (durationMin: number) => Math.max(600, Math.round(durationMin * WORDS_PER_MINUTE));

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
          brief: z
            .string()
            .describe(
              'Two to four sentences stating exactly what this lesson teaches, in what order, and the one thing ' +
                'founders commonly get wrong about it. This is the ONLY instruction the writer of the lesson receives.',
            ),
          focusQuestionIds: z.array(z.string()).describe("Which of the module's gap ids this lesson closes"),
          durationMin: z.number().int().min(MIN_LESSON_MIN).max(MAX_LESSON_MIN).describe('Minutes the founder spends on it'),
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

export async function generateOutline(plan: GapPlan, meta: CallMeta = {}): Promise<CourseOutline> {
  const output = await generateCached('outline', OutlineSchema, 0.6, `You are designing the structure of a practical, personalised course for a startup founder. They just took the iSTARTUP investment-readiness assessment; this course closes the specific gaps it found. The founder will work through it lesson by lesson and be assessed against it, so it has to hold up as a plan rather than read well as a pitch.

THE STARTUP
${describeStartup(plan)}

THE MODULES — produce exactly these ${plan.modules.length} modules, in this order, with exactly the lesson count stated for each:
${plan.modules.map(describeModule).join('\n\n')}

HOW TO BUILD THE OUTLINE
- Order by dependency, not by importance. A lesson may only assume what earlier lessons have taught; the course reads as one path, module after module.
- Every lesson brief must name one thing founders get wrong. "Explains unit economics" is not a brief. "Shows that gross margin, not revenue, decides how far each funding round goes; founders usually report revenue growth and assume investors will infer the rest, and this corrects that" is a brief. The writer of the lesson sees nothing else, so anything you leave vague will be written vaguely.
- Titles are claims or tasks: "Price from the value you create, not your costs", "Write your 18-month hiring plan" — never "Introduction", "Overview" or a bare topic.
- Every lesson closes at least one listed gap id, and every gap id is covered by some lesson in its module. Start from where the founder is (their answer) and move them to the levels above it.
- The LAST lesson of every module is a hands-on workshop: the founder produces something real for their startup (a plan, a model, a one-pager, a list of names). Its title is the task.
- Lessons are about THIS startup's situation (sector, stage, team, funding), not generic startup advice.
- durationMin is how long the founder spends, between ${MIN_LESSON_MIN} and ${MAX_LESSON_MIN} minutes. Reading runs about ${WORDS_PER_MINUTE} words a minute; a workshop includes the time to do the task.

HARD RULES
- Plain text everywhere. No markdown, no asterisks, no headings inside any field.
- Invent no statistics, studies, dates or quotations. If a claim would need a citation, teach the idea without the number.
- Do not produce quiz, test or recap lessons; those are handled separately.`, meta);
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
        durationMin: Math.min(MAX_LESSON_MIN, Math.max(MIN_LESSON_MIN, Math.round(l.durationMin))),
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
  mermaid: z
    .string()
    .optional()
    .describe(
      'Mermaid `graph LR` or `graph TD` source for a small diagram, ONLY when the lesson describes a process, a flow or a structure. Omit otherwise.',
    ),
  callout: z.object({
    kind: z.enum(['warning', 'note']),
    text: z.string().describe('One short aside, usually the mistake this lesson exists to prevent'),
  }),
  exercise: z
    .string()
    .describe('A concrete task the founder does for their own startup this week, with a clear deliverable. 2–4 sentences.'),
  checkpoint: z.object({
    stem: z.string().describe('A scenario question about a startup like theirs that tests whether the IDEA landed, not recall'),
    options: z.array(z.object({ id: z.string(), label: z.string() })).length(4),
    correctOptionId: z.string(),
    explanation: z
      .string()
      .describe('Addressed to the founder as "you": why the right answer is right and the most tempting wrong one is wrong'),
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
  /** The module's closing workshop: the founder does something rather than reads. */
  isWorkshop: boolean;
}, meta: CallMeta = {}): Promise<GeneratedLesson> {
  const focus = input.module.focus.filter((f) => input.lesson.focusQuestionIds.includes(f.questionId));
  const targetWords = targetWordsFor(input.lesson.durationMin);

  const output = await generateCached('lesson', LessonSchema, 0.7, `You are writing one lesson of a personalised course for a startup founder, built from their iSTARTUP investment-readiness assessment.

THE STARTUP
${describeStartup(input.plan)}

MODULE: ${input.moduleTitle} (their ${input.module.title} score: ${input.module.percent}%)
THIS LESSON: ${input.lesson.title}

WHAT IT MUST TEACH
${input.lesson.brief}

THE GAPS THIS LESSON CLOSES
${(focus.length ? focus : input.module.focus).map(describeFocus).join('\n')}

${
  input.previousTitles.length
    ? `ALREADY TAUGHT, in order — assume all of it, and do not explain any of it again:\n${input.previousTitles.map((t) => `- ${t}`).join('\n')}`
    : 'This is the first lesson of the course. Assume nothing beyond what a founder at this stage knows.'
}
${
  input.nextTitle
    ? `COMING NEXT: ${input.nextTitle}. Do not cover it; you may point at it in a closing sentence.`
    : 'This is the last lesson of the course; end with momentum and the next step for their startup.'
}

Write about ${targetWords} words of body.
${
  input.isWorkshop
    ? `
This is a WORKSHOP, the module's hands-on lesson. The founder is going to produce something for their startup, not read about it. Set up the task in steps, give them whatever they need to work from (a structure, the questions to answer, a worked example from a different startup), and say plainly what a good result looks like and the most common way it goes wrong. Do not do the task for them.
`
    : ''
}
HOW TO WRITE IT
- Open with the thing itself. No throat-clearing, no "in this lesson we will". The first sentence should already be teaching.
- One idea per paragraph, three to five sentences. Separate paragraphs with a blank line (two newline characters); never run the lesson together as one block.
- Be concrete. A worked example beats a definition: show it with THIS startup's sector, stage and team. If you find yourself writing "it is important to", you have skipped the part that would have shown why.
- Start from where they are (what they answered) and show the concrete steps to the next level up.
- Correct the misconception the brief names, explicitly: say what founders usually assume, then what is actually the case.
- Say what is NOT true, or what does not apply. A lesson that only lists benefits teaches someone to misuse the thing.
- Plain text only. No markdown, no headings, no bullet characters, no bold. Blank lines are the only structure you have.
- Invent no statistics, studies, dates, quotations or named sources. Teach the idea without the number.

THE DIAGRAM: include \`mermaid\` ONLY if this lesson genuinely describes a process, a flow or a structure (a funnel, a hiring sequence, a fundraising timeline, how money moves). Use \`graph LR\` or \`graph TD\`, at most 8 nodes, short plain labels, one statement per line. A diagram of two boxes restating the title is worse than none; if in doubt, leave it out.

THE EXERCISE: a concrete task the founder does for their own startup this week, with a clear deliverable.

THE CHECKPOINT: one question about a situation like theirs, four options with ids "a", "b", "c", "d", exactly one right. It must test whether they understood the IDEA — a question answerable by recognising a phrase from the text tests nothing. Wrong options are things a founder who half-followed would actually pick, not obvious throwaways.`, meta);
  const diagram = output.mermaid ? normalizeFlowchart(output.mermaid) : '';
  return {
    ...output,
    mermaid: /^(graph|flowchart)\s/i.test(diagram) ? diagram : undefined,
    body: toPlainParagraphs(output.body),
    checkpoint: {
      ...output.checkpoint,
      correctOptionId: output.checkpoint.options.some((o) => o.id === output.checkpoint.correctOptionId)
        ? output.checkpoint.correctOptionId
        : output.checkpoint.options[0].id,
    },
  };
}

/* ───────────────────────────────── quizzes ───────────────────────────────── */

const QuizQuestionSchema = z.object({
  type: z.enum(['mcq_single', 'mcq_multi', 'true_false']),
  stem: z.string().describe('The question. Plain text, no markdown.'),
  options: z
    .array(z.object({ id: z.string(), label: z.string() }))
    .describe('For true_false, exactly two options with ids "true" and "false".'),
  correctOptionIds: z
    .array(z.string())
    .min(1)
    .describe('One id for mcq_single and true_false; two or more for mcq_multi.'),
  points: z.number().int().min(1).max(5),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string().describe('Why the right answer is right, addressed to the founder as "you". Always required.'),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

/** How many questions a module quiz has (at most 10: the store reads a quiz's questions in one getMany). */
export const QUIZ_QUESTIONS = 6;

/**
 * A module's graded quiz, drawn only from the lessons that module taught. ScienceWerx's
 * assessment prompt (generateAssessment), framed for a founder and their startup. Only the
 * three question types with unambiguous keys; anything ungradeable is dropped.
 */
export async function generateModuleQuiz(input: {
  plan: GapPlan;
  moduleTitle: string;
  lessons: Array<{ title: string; brief: string; keyPoints: string[] }>;
}, meta: CallMeta = {}): Promise<QuizQuestion[]> {
  const output = await generateCached('quiz', z.object({ questions: z.array(QuizQuestionSchema) }), 0.5, `You are writing ${QUIZ_QUESTIONS} questions for the graded quiz that closes the module "${input.moduleTitle}" of a personalised course for a startup founder.

THE STARTUP
${describeStartup(input.plan)}

This is a GRADED QUIZ. It exists to measure whether the founder understood the material well enough to act on it. They need 70% to pass, have three attempts, and see feedback only after they submit.

It may only draw on these lessons:
${input.lessons.map((l) => `- ${l.title}: ${l.brief}\n${l.keyPoints.map((k) => `  · ${k}`).join('\n')}`).join('\n')}

HOW TO WRITE THE QUESTIONS
- Test understanding, not recall of wording. If a question can be answered by spotting a phrase that also appears in the lesson, it tests reading, not learning. Ask what follows from the idea, or what the founder should do in a situation the lesson did not state outright — ideally one like their own startup's.
- Wrong options must be tempting: what a founder who half-understood would genuinely pick — a common misconception, a plausible overgeneralisation, the right idea applied to the wrong situation. An obviously silly option just narrows the guess.
- One unambiguous right answer. If a careful person could argue for two, rewrite the question. Check each one before moving on.
- Vary the difficulty across the set, and vary the type; do not make them all mcq_single.
- Keep stems short. A paragraph of setup followed by "which of the following" is a reading test with a question attached.
- Never ask about the course itself (its structure, its modules, what a lesson covered). Ask about the subject.
- Plain text. No markdown anywhere. Invent no statistics or named sources.

FORMATS
- mcq_single: four options, exactly one id in correctOptionIds.
- mcq_multi: four or five options, two or three correct. Use it when the point genuinely has several parts.
- true_false: exactly two options, ids "true" and "false", one correct id. Use it for a claim worth confronting directly.

The explanation is required on every question, written to the founder as "you": why the answer is right and, where a wrong option was tempting, why that one is not. Do not restate the question.`, meta);
  const questions = (output?.questions ?? []).filter((q) => {
    if (!q.stem.trim() || !q.explanation.trim() || q.correctOptionIds.length === 0) return false;
    if (q.type === 'true_false') return q.correctOptionIds.length === 1 && ['true', 'false'].includes(q.correctOptionIds[0]);
    const ids = new Set(q.options.map((o) => o.id));
    if (q.options.length < 2 || ids.size !== q.options.length || !q.correctOptionIds.every((id) => ids.has(id))) return false;
    return q.type === 'mcq_single' ? q.correctOptionIds.length === 1 : q.correctOptionIds.length >= 2;
  });
  if (questions.length < 3) throw new Error('The model returned too few gradeable questions.');
  return questions.slice(0, QUIZ_QUESTIONS);
}
