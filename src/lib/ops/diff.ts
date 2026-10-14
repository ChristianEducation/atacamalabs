/** Diferencias por líneas (LCS) para «Pega tu versión» (spec v3 §7-2, anexo §G4). Puro: se usa en el navegador y en las pruebas. */
export type DiffLine = { op: "same" | "add" | "del"; text: string };

export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.replace(/\r\n/g, "\n").split("\n");
  const b = after.replace(/\r\n/g, "\n").split("\n");
  const n = a.length, m = b.length;
  // Tabla LCS (los correos son cortos: < 60 líneas).
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ op: "same", text: a[i] }); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) { out.push({ op: "del", text: a[i] }); i++; }
    else { out.push({ op: "add", text: b[j] }); j++; }
  }
  while (i < n) out.push({ op: "del", text: a[i++] });
  while (j < m) out.push({ op: "add", text: b[j++] });
  return out;
}

/**
 * Texto pegado (escrito con GPT) → asunto y cuerpo. Si la primera línea es «Asunto: …» (o «Subject: …»), ese es el asunto;
 * si no, se mantiene el asunto actual. Quita líneas vacías al inicio y al final.
 */
export function parsePasted(text: string, currentSubject: string): { subject: string; body: string; subjectFromPaste: boolean } {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  const m = lines.length ? lines[0].match(/^\s*(asunto|subject)\s*:\s*(.+)$/i) : null;
  if (m) {
    lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
  }
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return { subject: m ? m[2].trim() : currentSubject.trim(), body: lines.join("\n").trim(), subjectFromPaste: Boolean(m) };
}
