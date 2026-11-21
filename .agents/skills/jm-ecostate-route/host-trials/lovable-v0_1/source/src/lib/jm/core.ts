// JM Knowledge Contact Testbench — pure, local-only logic (no network).

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface SearchHit {
  line: number; // 1-indexed
  text: string;
  score: number;
}

export function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Lexical search: score = count of query-term occurrences per line. */
export function lexicalSearch(source: string, query: string, limit = 20): SearchHit[] {
  const terms = Array.from(new Set(tokenize(query)));
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  source.split(/\r?\n/).forEach((text, i) => {
    const toks = tokenize(text);
    let score = 0;
    for (const t of terms) score += toks.filter((x) => x === t).length;
    if (score > 0) hits.push({ line: i + 1, text, score });
  });
  return hits.sort((a, b) => b.score - a.score || a.line - b.line).slice(0, limit);
}

export type Matrix = number[][];

export function matmul(a: Matrix, b: Matrix): Matrix {
  if (!a.length || a[0]!.length !== b.length) throw new Error("matmul: shape mismatch");
  return a.map((row) => b[0]!.map((_, j) => row.reduce((s, v, k) => s + v * b[k]![j]!, 0)));
}

export function transpose(m: Matrix): Matrix {
  return m[0]!.map((_, j) => m.map((r) => r[j]!));
}

export function softmaxRow(row: number[]): number[] {
  const mx = Math.max(...row);
  const ex = row.map((v) => Math.exp(v - mx));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map((v) => v / s);
}

/** DEMO scaled dot-product attention: softmax(QKᵀ/√d)·V. Not a trained transformer. */
export function attention(Q: Matrix, K: Matrix, V: Matrix) {
  const d = Q[0]!.length;
  if (K[0]!.length !== d) throw new Error("Q and K must share dimension d");
  if (K.length !== V.length) throw new Error("K and V must have same row count");
  const scores = matmul(Q, transpose(K)).map((r) => r.map((v) => v / Math.sqrt(d)));
  const weights = scores.map(softmaxRow);
  const output = matmul(weights, V);
  return { scores, weights, output, d };
}

export function parseMatrix(text: string): Matrix {
  const rows = text
    .trim()
    .split(/\r?\n|;/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.split(/[\s,]+/).map(Number));
  if (!rows.length) throw new Error("empty matrix");
  const w = rows[0]!.length;
  if (rows.some((r) => r.length !== w || r.some((v) => !Number.isFinite(v))))
    throw new Error("matrix must be rectangular and numeric");
  return rows;
}

const INSTRUCTION_PATTERNS: RegExp[] = [
  /ignore (all |any )?(previous|prior|above) (instructions|prompts?)/i,
  /\bsystem prompt\b/i,
  /\byou are now\b/i,
  /\b(disregard|override) (the )?(rules|instructions|policy)/i,
  /\b(run|execute)\s+(`|this|the following|command)/i,
  /\b(api[_ -]?key|password|secret|token)\b/i,
  /\bcurl\s+https?:/i,
  /\bact as\b/i,
  /^\s*(system|assistant)\s*:/im,
];

export interface QuarantineResult {
  flagged: boolean;
  label: "UNTRUSTED DATA";
  matches: { line: number; text: string }[];
}

/** Flags instruction-shaped lines. Never executes or obeys them: content is always data. */
export function quarantine(source: string): QuarantineResult {
  const matches: { line: number; text: string }[] = [];
  source.split(/\r?\n/).forEach((text, i) => {
    if (INSTRUCTION_PATTERNS.some((p) => p.test(text))) matches.push({ line: i + 1, text });
  });
  return { flagged: matches.length > 0, label: "UNTRUSTED DATA", matches };
}

export interface Candidate {
  state: "HELD";
  autoInstall: false;
  sourceSha256: string;
  createdAt: string;
  citations: number[];
  quarantinedLines: number[];
  body: string;
}

export function makeCandidate(
  sha: string,
  body: string,
  citations: number[],
  q: QuarantineResult,
  now: string,
): Candidate {
  return {
    state: "HELD",
    autoInstall: false,
    sourceSha256: sha,
    createdAt: now,
    citations,
    quarantinedLines: q.matches.map((m) => m.line),
    body,
  };
}