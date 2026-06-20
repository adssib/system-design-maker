// Tokenizes the structure/flow DSL into highlighted HTML for the editor overlay.
// Critical invariant: the visible text of the output equals the input exactly
// (no dropped or added characters), so it aligns char-for-char with the textarea.

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function commentIndex(line: string): number {
  const idxs = [line.indexOf("#"), line.indexOf("//")].filter((i) => i >= 0);
  return idxs.length ? Math.min(...idxs) : -1;
}

const TOKEN =
  /(<->|~>|->)|("(?:[^"\\]|\\.)*")|(\([^)]*\))|(\bflow\b)|([[\],:])|(\s+)|([^\s<>~\-[\],:()"]+)|(.)/g;

function highlightLine(line: string): string {
  const ci = commentIndex(line);
  const code = ci >= 0 ? line.slice(0, ci) : line;
  const comment = ci >= 0 ? line.slice(ci) : "";

  let html = "";
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m[1]) html += `<span class="tok-verb">${esc(m[1])}</span>`;
    else if (m[2]) html += `<span class="tok-string">${esc(m[2])}</span>`;
    else if (m[3]) html += `<span class="tok-label">${esc(m[3])}</span>`;
    else if (m[4]) html += `<span class="tok-keyword">${esc(m[4])}</span>`;
    else if (m[5]) html += `<span class="tok-punct">${esc(m[5])}</span>`;
    else if (m[6]) html += esc(m[6]);
    else if (m[7]) html += `<span class="tok-name">${esc(m[7])}</span>`;
    else if (m[8]) html += esc(m[8]);
  }
  if (comment) html += `<span class="tok-comment">${esc(comment)}</span>`;
  return html;
}

export function highlightDSL(text: string): string {
  return text.split("\n").map(highlightLine).join("\n");
}
