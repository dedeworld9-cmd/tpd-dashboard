/**
 * Deterministic palette search: no dependency, linear in the number of commands.
 * A command matches only if every query word matches somewhere; ranking prefers the label
 * (start, then word start, then anywhere) over aliases and hints.
 */

export interface Searchable {
  label: string;
  hint?: string;
  keywords?: string;
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function tokenScore(label: string, labelWords: string[], rest: string, restWords: string[], t: string): number {
  if (label.startsWith(t)) return 10;
  if (labelWords.some((w) => w.startsWith(t))) return 8;
  if (label.includes(t)) return 6;
  if (restWords.some((w) => w.startsWith(t))) return 4;
  if (rest.includes(t)) return 2;
  return 0;
}

/** 0 = no match. Higher is better. An empty query matches everything equally. */
export function score(e: Searchable, query: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return 1;
  const label = e.label.toLowerCase();
  const labelWords = words(e.label);
  const rest = `${e.hint ?? ""} ${e.keywords ?? ""}`.toLowerCase();
  const restWords = words(rest);
  let total = 0;
  for (const t of terms) {
    const s = tokenScore(label, labelWords, rest, restWords, t);
    if (!s) return 0;
    total += s;
  }
  return total / terms.length + (label === terms.join(" ") ? 5 : 0);
}

/** Splits text into runs, marking the parts that match a query word, so the UI can emphasise them. */
export function highlight(text: string, query: string): { text: string; hit: boolean }[] {
  const terms = [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))];
  if (!terms.length) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const hit = new Array<boolean>(text.length).fill(false);
  for (const t of terms) {
    let i = lower.indexOf(t);
    while (i !== -1) {
      for (let k = i; k < i + t.length; k++) hit[k] = true;
      i = lower.indexOf(t, i + t.length);
    }
  }
  const runs: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.hit === hit[i]) last.text += text[i];
    else runs.push({ text: text[i], hit: hit[i] });
  }
  return runs;
}

/** Alternate words people use for each page. Kept next to the search so a new page is one line. */
export const PAGE_ALIASES: Record<string, string> = {
  "/hq": "home dashboard start",
  "/hq/patrol": "clock duty shift on duty",
  "/hq/activity": "hours history sessions log time",
  "/hq/training": "qualifications classes certification academy",
  "/hq/structure": "org chart ranks positions vacancies chain of command",
  "/hq/roster": "roster directory members people staff officers search find",
  "/hq/divisions": "units teams swat waterfront traffic",
  "/hq/requests": "loa leave transfer ride-along applications tickets",
  "/hq/resources": "handbook fleet vehicles policy sop links forms",
  "/hq/supervisor": "review approvals sergeant desk",
  "/hq/command": "admin administration staffing decisions captain",
  "/hq/command/integrations": "discord google sheets sync health anchorcad status",
  "/hq/settings": "preferences theme dark light account profile",
};
