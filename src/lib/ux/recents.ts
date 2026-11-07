/**
 * Recently opened HQ pages, kept per signed-in member in this browser only.
 * Only page paths are stored (never names, search text or people), and only paths the caller allows.
 */

const MAX = 6;
const key = (scope: string) => `tpd-recents:${scope}`;

export function readRecents(scope: string, valid: (href: string) => boolean, storage: Pick<Storage, "getItem"> | null = safe()): string[] {
  try {
    const raw = storage?.getItem(key(scope));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((h): h is string => typeof h === "string" && valid(h)).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentPage(scope: string, href: string, valid: (href: string) => boolean, storage: Pick<Storage, "getItem" | "setItem"> | null = safe()) {
  if (!valid(href)) return;
  try {
    const next = [href, ...readRecents(scope, valid, storage).filter((h) => h !== href)].slice(0, MAX);
    storage?.setItem(key(scope), JSON.stringify(next));
  } catch {}
}

export function clearRecents(scope: string, storage: Pick<Storage, "removeItem"> | null = safe()) {
  try {
    storage?.removeItem(key(scope));
  } catch {}
}

function safe(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
