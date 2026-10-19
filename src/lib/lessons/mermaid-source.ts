/**
 * Repair model-written Mermaid flowcharts before they are stored or drawn.
 *
 * Models asked for "Mermaid `graph LR` source" inside a JSON field sometimes
 * return the whole diagram on one line:
 *
 *   graph LR A[Overview] --> B[Setup] B --> C[Integrations]
 *
 * Mermaid needs a newline (or `;`) after the header and between statements, so
 * that fails with "Expecting 'NEWLINE', got 'NODE_STRING'". The statements are
 * still unambiguous — a node directly followed by another node, with no edge
 * between them, is where one ends — so the line breaks can be put back.
 *
 * Conservative on purpose: anything it does not fully understand (subgraphs,
 * styling, other diagram types) is returned as it came, and Mermaid's own
 * error state still shows. Pure and client-safe.
 */

const HEADER = /^(graph|flowchart)[ \t]+(LR|RL|TD|TB|BT)\b[ \t]*;?/i;
const FENCE = /^```(?:mermaid)?\s*|\s*```$/g;

/** `id`, optionally with a shape: [..] [[..]] [(..)] (..) ((..)) {..} {{..}} >..] */
const NODE =
  /^[A-Za-z_]\w*(?:-(?![-.=>])\w+)*(?:\[\[[^\]]*\]\]|\[\([^)]*\)\]|\(\([^)]*\)\)|\{\{[^}]*\}\}|\["[^"]*"\]|\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|>[^\]]*\])?/;
/** `-->`, `---`, `-.->`, `==>`, `--x`, `<-->`, each with an optional `|label|`. */
const EDGE = /^<?(?:-{2,}|={2,}|-\.+-)[->xo]?(?:\s*\|[^|]*\|)?/;
/** Statements this repair cannot split reliably; their presence means "leave it alone". */
const UNSUPPORTED = /^(subgraph|end|classDef|class|style|linkStyle|click|direction)\b/;

export function normalizeFlowchart(source: string): string {
  const src = (source ?? '').replace(FENCE, '').trim();
  if (!HEADER.test(src)) return src;
  return quoteLabels(splitStatements(src));
}

/**
 * Quote a node label that contains brackets: `A[Goal (vague)]` → `A["Goal (vague)"]`.
 *
 * Inside `[...]` or `{...}` Mermaid reads a `(` as the start of another shape,
 * so a perfectly ordinary label fails with "Parse error". Quoting makes it
 * literal text. Labels already quoted, and the real bracket shapes (`[(db)]`,
 * `[[sub]]`, `[/io/]`), are left alone.
 */
function quoteLabels(src: string): string {
  const fix = (open: string, close: string) => (whole: string, id: string, label: string) => {
    const trimmed = label.trim();
    if (!/[(){}]/.test(trimmed) || /^["(\[/\\{]/.test(trimmed)) return whole;
    return `${id}${open}"${trimmed.replace(/"/g, '#quot;')}"${close}`;
  };
  return src
    .replace(/(\b[A-Za-z_]\w*(?:-\w+)*)\[([^\[\]]+)\]/g, fix('[', ']'))
    .replace(/(\b[A-Za-z_]\w*(?:-\w+)*)\{([^{}]+)\}/g, fix('{', '}'));
}

/** Put a flattened, single-line flowchart back onto one statement per line. */
function splitStatements(src: string): string {
  const header = HEADER.exec(src)!;

  const afterHeader = src.slice(header[0].length);
  // Header already on its own line: nothing here is flattened.
  if (/^[ \t]*\n/.test(afterHeader)) return src;

  const body = afterHeader.trim();
  const head = `${header[1]} ${header[2]}`;
  if (!body) return head;
  // Already multi-line: only the header's own line break can be missing.
  if (body.includes('\n')) return `${head}\n${body}`;

  const statements: string[][] = [];
  let current: string[] = [];
  let expectNode = true;
  let rest = body;

  const endStatement = () => {
    if (current.length) statements.push(current);
    current = [];
    expectNode = true;
  };

  while ((rest = rest.trimStart())) {
    if (rest.startsWith(';')) {
      endStatement();
      rest = rest.slice(1);
      continue;
    }
    if (UNSUPPORTED.test(rest)) return src;

    const edge = EDGE.exec(rest);
    if (edge) {
      if (expectNode) return src; // an edge with nothing on its left
      current.push(edge[0]);
      expectNode = true;
      rest = rest.slice(edge[0].length);
      continue;
    }
    if (rest.startsWith('&')) {
      current.push('&');
      expectNode = true;
      rest = rest.slice(1);
      continue;
    }

    const node = NODE.exec(rest);
    if (!node) return src;
    // Node after node: the previous statement ended here.
    if (!expectNode) endStatement();
    current.push(node[0]);
    expectNode = false;
    rest = rest.slice(node[0].length);
  }
  endStatement();

  return [head, ...statements.map((s) => `  ${s.join(' ')}`)].join('\n');
}
