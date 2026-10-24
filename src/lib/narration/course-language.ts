/**
 * The languages a course can be written in.
 *
 * One list, read by the studio picker, every generation prompt, the learner
 * pages (for `lang` and `dir`) and the catalogue, so adding a language is one
 * row here. Client-safe: no server imports.
 *
 * `Course.language` has always existed and always been 'en'; nothing read it.
 * A missing or unknown code is treated as English, which is what every course
 * before this was.
 */

export interface CourseLanguage {
  code: 'en' | 'fr' | 'ar' | 'de';
  /** In English, for prompts and admin copy. */
  english: string;
  /** In itself, for the picker and the catalogue badge. */
  native: string;
  dir: 'ltr' | 'rtl';
  /** BCP 47 tag for speech voices and `Intl` formatting. */
  locale: string;
}

export const COURSE_LANGUAGES: readonly CourseLanguage[] = [
  { code: 'en', english: 'English', native: 'English', dir: 'ltr', locale: 'en-GB' },
  { code: 'fr', english: 'French', native: 'Français', dir: 'ltr', locale: 'fr-FR' },
  { code: 'ar', english: 'Arabic', native: 'العربية', dir: 'rtl', locale: 'ar' },
  { code: 'de', english: 'German', native: 'Deutsch', dir: 'ltr', locale: 'de-DE' },
];

export type CourseLanguageCode = CourseLanguage['code'];

const DEFAULT = COURSE_LANGUAGES[0]!;

export function courseLanguage(code: string | undefined | null): CourseLanguage {
  const normalized = (code ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return COURSE_LANGUAGES.find((l) => l.code === normalized) ?? DEFAULT;
}

export function isCourseLanguage(code: unknown): code is CourseLanguageCode {
  return typeof code === 'string' && COURSE_LANGUAGES.some((l) => l.code === code);
}

/**
 * The instruction every writing prompt carries for a non-English course.
 *
 * Empty for English, so English prompts are byte-for-byte what they were.
 * Structural values stay English because code matches on them: JSON keys,
 * ids, enum values such as `lesson`/`practice`, Mermaid syntax and node ids.
 */
export function languageRule(code: string | undefined | null): string {
  const lang = courseLanguage(code);
  if (lang.code === 'en') return '';
  return [
    `LANGUAGE: This course is taught in ${lang.english} (${lang.native}).`,
    `Write every piece of text a learner will read — titles, briefs, prose, questions, options, explanations, feedback, labels — in natural, fluent ${lang.english}, as a native ${lang.english}-speaking teacher would write it. Do not translate word for word from English.`,
    'Keep in English only what software reads: JSON keys, ids and keys, enum values (such as lesson type), Mermaid keywords and node ids. Mermaid node LABELS are learner-facing and must be in the course language.',
    'Technical terms with no settled translation may stay in English, explained in the course language the first time.',
    ...(lang.code === 'ar'
      ? ['Write Modern Standard Arabic. Use Western digits (0-9) for numbers.']
      : []),
  ].join('\n');
}
