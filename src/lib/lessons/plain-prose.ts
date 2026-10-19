/**
 * Flattening model output to the plain paragraphs our readers actually render.
 *
 * Two places in this codebase display generated long-form text, and NEITHER of
 * them parses markdown:
 *
 *  - the public blog splits the body on blank lines and wraps each piece in a
 *    `<p>` itself (splitPublicBlogBody + blog-post-client.tsx);
 *  - the LMS lesson player renders the body in a `whitespace-pre-line` block.
 *
 * So a stray `##`, a `**bold**` or a leftover `<p>` does not degrade — it is
 * shown to the reader, verbatim, on a page that is already live. The prompts
 * all say "plain text, no markdown"; this is the belt to that pair of braces,
 * and it is cheap enough to run unconditionally on every generated body.
 *
 * Ported from ScienceWerx (src/lib/plain-prose.ts), plus the single-newline case.
 *
 * Pure, no imports: usable from a flow, a route, the client or a test.
 */

/**
 * Strip the markup the model was told not to emit, and normalise paragraphs.
 *
 * Block-level closing tags become paragraph breaks before every remaining tag
 * is dropped, so `<p>one</p><p>two</p>` survives as two paragraphs rather than
 * collapsing into one run-on line. Whitespace inside a paragraph is collapsed
 * because a soft-wrapped model response otherwise keeps its arbitrary newlines,
 * and `whitespace-pre-line` would honour every one of them.
 */
export function toPlainParagraphs(body: string): string {
  // A body with no blank line at all but several single line breaks is paragraphs the
  // model separated with one newline (Gemini often does); keep them as paragraphs.
  const text = /\n\s*\n/.test(body) ? body : body.replace(/\n+/g, '\n\n');
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|ul|ol|div)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

/** Words in a piece of prose, ignoring any markup it still carries. */
export function proseWordCount(text: string): number {
  return text
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}
