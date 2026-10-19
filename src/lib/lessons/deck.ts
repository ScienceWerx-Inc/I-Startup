/**
 * Lesson decks: a lesson's reading, shown as interactive slides.
 *
 * Two sources, one shape:
 * - `deckFromLesson` turns any lesson into slides with no model call — title,
 *   the prose split into concept slides, the callout, the diagram, key points,
 *   the self-check and a recap — so every lesson has a slide view the moment
 *   this ships, including ones nobody regenerates.
 * - A stored, designed deck (`content.deck`, source 'generated') is never trusted
 *   as-is: `sanitizeDeck` clamps every field, restricts icons and layouts to the
 *   lists below, and drops what doesn't fit.
 *
 * Ported from ScienceWerx (src/lib/lms/lesson-deck.ts) without its narration.
 *
 * Slides are presentation, not content of record: the lesson text stays the
 * source, and a deck never touches structure, progress or completion.
 *
 * Pure and client-safe — the player builds the fallback deck in the browser.
 */

/* ------------------------------------------------------------------ types */

/**
 * The icons a slide may show — names of lucide icons the player maps to
 * components. A fixed list so a model can't name something that doesn't exist.
 */
export const SLIDE_ICONS = [
  'lightbulb', 'target', 'rocket', 'sparkles', 'brain', 'book-open', 'graduation-cap', 'compass',
  'map', 'flag', 'puzzle', 'layers', 'workflow', 'git-branch', 'settings', 'wrench', 'shield-check',
  'lock', 'key', 'mail', 'calendar', 'clock', 'users', 'user', 'message-circle', 'search', 'filter',
  'database', 'cpu', 'bot', 'zap', 'bar-chart', 'trending-up', 'check-circle', 'alert-triangle',
  'eye', 'pen-tool', 'file-text', 'link', 'globe', 'heart', 'star', 'repeat', 'list-checks',
] as const;
export type SlideIcon = (typeof SLIDE_ICONS)[number];

interface SlideBase {
  /** What the narrator says on this slide. Absent → derived from the slide's text. */
  say?: string;
}

export type DeckSlide =
  | (SlideBase & { kind: 'title'; title: string; subtitle?: string; icon: SlideIcon })
  | (SlideBase & { kind: 'concept'; title: string; points: string[]; icon: SlideIcon })
  | (SlideBase & { kind: 'steps'; title: string; steps: { label: string; detail?: string }[] })
  | (SlideBase & {
      kind: 'compare';
      title: string;
      left: { label: string; points: string[] };
      right: { label: string; points: string[] };
    })
  | (SlideBase & { kind: 'highlight'; text: string; tone: 'insight' | 'warning' })
  | (SlideBase & { kind: 'diagram'; title: string })
  | (SlideBase & { kind: 'keypoints'; title: string; points: string[] })
  | (SlideBase & { kind: 'check' })
  | (SlideBase & { kind: 'recap'; title: string; points: string[] });

export type SlideKind = DeckSlide['kind'];

export interface LessonDeck {
  slides: DeckSlide[];
  /** 'generated' by the model, or 'derived' from the text by `deckFromLesson`. */
  source: 'generated' | 'derived';
  generatedAt?: number;
  model?: string;
}

/* ----------------------------------------------------------------- limits */

export const DECK_MAX_SLIDES = 16;
const TITLE_MAX = 90;
const POINT_MAX = 180;
const TEXT_MAX = 320;
const SAY_MAX = 700;
const POINTS_MAX = 4;
const STEPS_MAX = 6;

/* ------------------------------------------------------------- sanitising */

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function list(value: unknown, max: number, each = POINT_MAX): string[] {
  return Array.isArray(value) ? value.map((v) => clip(v, each)).filter(Boolean).slice(0, max) : [];
}

function icon(value: unknown, fallback: SlideIcon = 'lightbulb'): SlideIcon {
  return (SLIDE_ICONS as readonly string[]).includes(value as string) ? (value as SlideIcon) : fallback;
}

function say(value: unknown): { say?: string } {
  const text = clip(value, SAY_MAX);
  return text ? { say: text } : {};
}

/**
 * A model's deck, made safe to store and render.
 *
 * Unknown layouts and empty slides are dropped; a `diagram` or `check` slide
 * survives only when the lesson actually has one; the deck always opens with a
 * title slide. Returns null when nothing usable is left — the caller then uses
 * the derived deck instead.
 */
export function sanitizeDeck(
  raw: unknown,
  lesson: { title: string; hasDiagram: boolean; hasCheckpoint: boolean },
): DeckSlide[] | null {
  const input = Array.isArray((raw as { slides?: unknown })?.slides)
    ? ((raw as { slides: unknown[] }).slides)
    : Array.isArray(raw)
      ? raw
      : [];
  const out: DeckSlide[] = [];
  let hadDiagram = false;
  let hadCheck = false;

  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    switch (s.kind) {
      case 'title': {
        const title = clip(s.title, TITLE_MAX);
        if (title) out.push({ kind: 'title', title, ...(clip(s.subtitle, TEXT_MAX) ? { subtitle: clip(s.subtitle, TEXT_MAX) } : {}), icon: icon(s.icon, 'graduation-cap'), ...say(s.say) });
        break;
      }
      case 'concept': {
        const title = clip(s.title, TITLE_MAX);
        const points = list(s.points, POINTS_MAX);
        if (title && points.length) out.push({ kind: 'concept', title, points, icon: icon(s.icon), ...say(s.say) });
        break;
      }
      case 'steps': {
        const title = clip(s.title, TITLE_MAX);
        const steps = (Array.isArray(s.steps) ? s.steps : [])
          .map((st) => {
            const step = (st ?? {}) as Record<string, unknown>;
            const label = clip(typeof st === 'string' ? st : step.label, TITLE_MAX);
            const detail = clip(step.detail, POINT_MAX);
            return label ? { label, ...(detail ? { detail } : {}) } : null;
          })
          .filter((x): x is { label: string; detail?: string } => Boolean(x))
          .slice(0, STEPS_MAX);
        if (title && steps.length >= 2) out.push({ kind: 'steps', title, steps, ...say(s.say) });
        break;
      }
      case 'compare': {
        const title = clip(s.title, TITLE_MAX);
        const side = (v: unknown) => {
          const o = (v ?? {}) as Record<string, unknown>;
          return { label: clip(o.label, 60), points: list(o.points, POINTS_MAX) };
        };
        const left = side(s.left);
        const right = side(s.right);
        if (title && left.label && right.label && left.points.length && right.points.length) {
          out.push({ kind: 'compare', title, left, right, ...say(s.say) });
        }
        break;
      }
      case 'highlight': {
        const text = clip(s.text, TEXT_MAX);
        if (text) out.push({ kind: 'highlight', text, tone: s.tone === 'warning' ? 'warning' : 'insight', ...say(s.say) });
        break;
      }
      case 'diagram':
        if (lesson.hasDiagram && !hadDiagram) {
          hadDiagram = true;
          out.push({ kind: 'diagram', title: clip(s.title, TITLE_MAX) || 'How it fits together', ...say(s.say) });
        }
        break;
      case 'keypoints': {
        const points = list(s.points, 5);
        if (points.length) out.push({ kind: 'keypoints', title: clip(s.title, TITLE_MAX) || 'Key points', points, ...say(s.say) });
        break;
      }
      case 'check':
        if (lesson.hasCheckpoint && !hadCheck) {
          hadCheck = true;
          out.push({ kind: 'check', ...say(s.say) });
        }
        break;
      case 'recap': {
        const points = list(s.points, POINTS_MAX);
        if (points.length) out.push({ kind: 'recap', title: clip(s.title, TITLE_MAX) || 'Recap', points, ...say(s.say) });
        break;
      }
      default:
        break;
    }
    if (out.length >= DECK_MAX_SLIDES) break;
  }

  if (out.length < 2) return null;
  if (out[0]!.kind !== 'title') {
    out.unshift({ kind: 'title', title: clip(lesson.title, TITLE_MAX), icon: 'graduation-cap' });
  }
  return out.slice(0, DECK_MAX_SLIDES);
}

/* ------------------------------------------------------- the derived deck */

export interface DeckLessonInput {
  title: string;
  body?: string;
  keyPoints?: string[];
  callout?: { kind: 'warning' | 'note'; text: string };
  diagram?: string;
  checkpoint?: unknown;
}

/** Sentences, kept whole — never split mid-thought. */
function sentences(paragraph: string): string[] {
  return (paragraph.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/** A slide title from a sentence: short, no trailing full stop. */
function headline(sentence: string): string {
  const s = sentence.replace(/[.!?]+$/, '').trim();
  if (s.length <= 70) return s;
  const cut = s.slice(0, 70);
  const at = Math.max(cut.lastIndexOf(','), cut.lastIndexOf(' — '), cut.lastIndexOf(':'));
  return (at > 30 ? cut.slice(0, at) : cut.replace(/\s+\S*$/, '')) + '…';
}

const CONCEPT_ICONS: SlideIcon[] = ['lightbulb', 'target', 'compass', 'puzzle', 'layers', 'brain', 'rocket', 'zap'];

/**
 * Any lesson as slides, from its text alone.
 *
 * Each paragraph becomes a concept slide — its first sentence the headline,
 * the rest its points (long paragraphs are split across two slides) — so a
 * slide never shows more than a learner takes in at a glance. Deterministic:
 * the same lesson always makes the same deck.
 */
export function deckFromLesson(lesson: DeckLessonInput): LessonDeck {
  const slides: DeckSlide[] = [];
  const paragraphs = (lesson.body ?? '').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const intro = paragraphs.length ? sentences(paragraphs[0]!)[0] : undefined;

  slides.push({
    kind: 'title',
    title: clip(lesson.title, TITLE_MAX),
    ...(intro && intro.length <= 200 ? { subtitle: intro } : {}),
    icon: 'graduation-cap',
  });

  let iconAt = 0;
  paragraphs.forEach((paragraph, p) => {
    let parts = sentences(paragraph);
    // The first sentence of the first paragraph is already the title slide's subtitle.
    if (p === 0 && intro && intro.length <= 200) parts = parts.slice(1);
    if (!parts.length) return;
    // At most 4 sentences a slide: a first as the headline, three as points.
    for (let at = 0; at < parts.length && slides.length < DECK_MAX_SLIDES - 4; at += 4) {
      const group = parts.slice(at, at + 4);
      const [lead, ...rest] = group;
      slides.push({
        kind: 'concept',
        title: headline(lead!),
        points: (rest.length ? rest : [lead!]).map((s) => clip(s, POINT_MAX)),
        icon: CONCEPT_ICONS[iconAt++ % CONCEPT_ICONS.length]!,
        say: clip(group.join(' '), SAY_MAX),
      });
    }
  });

  if (lesson.callout?.text?.trim()) {
    slides.push({ kind: 'highlight', text: clip(lesson.callout.text, TEXT_MAX), tone: lesson.callout.kind === 'warning' ? 'warning' : 'insight' });
  }
  if (lesson.diagram?.trim()) slides.push({ kind: 'diagram', title: 'How it fits together' });
  const points = (lesson.keyPoints ?? []).map((k) => clip(k, POINT_MAX)).filter(Boolean);
  if (points.length) slides.push({ kind: 'keypoints', title: 'Key points', points: points.slice(0, 5) });
  if (lesson.checkpoint) slides.push({ kind: 'check' });
  if (points.length >= 2) slides.push({ kind: 'recap', title: 'You’ve got this', points: points.slice(0, 3) });

  return { slides: slides.slice(0, DECK_MAX_SLIDES), source: 'derived' };
}

/* --------------------------------------------------- the slides shown */

/**
 * The slides a learner actually sees for a lesson: its designed deck when it
 * has a usable one, otherwise the deck derived from its text.

 */
export function lessonSlides(
  content: DeckLessonInput & { deck?: { source?: string; slides?: unknown } },
): DeckSlide[] {
  const designed =
    content.deck?.source === 'generated'
      ? sanitizeDeck(content.deck, {
          title: content.title,
          hasDiagram: Boolean(content.diagram),
          hasCheckpoint: Boolean(content.checkpoint),
        })
      : null;
  return designed ?? deckFromLesson(content).slides;
}
