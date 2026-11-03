"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { HQ_FOOTER_NAV, HQ_NAV } from "@/lib/nav";
import { MEMBERS } from "@/lib/sample-data";
import { cn } from "@/lib/cn";

interface Entry {
  id: string;
  label: string;
  hint: string;
  href: string;
}

const PAGES: Entry[] = [...HQ_NAV.flatMap((g) => g.items), ...HQ_FOOTER_NAV].map((i) => ({
  id: i.href,
  label: i.label,
  hint: "Page",
  href: i.href,
}));

const PEOPLE: Entry[] = MEMBERS.map((m) => ({
  id: m.id,
  label: `${m.callsign} ${m.name}`,
  hint: m.rank,
  href: `/hq/roster?q=${encodeURIComponent(m.callsign)}`,
}));

/** Universal search: pages and personnel. Opens with ⌘K / Ctrl+K or "/". */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...PAGES, ...PEOPLE];
    if (!q) return PAGES;
    return all.filter((e) => e.label.toLowerCase().includes(q) || e.hint.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  function go(entry: Entry | undefined) {
    if (!entry) return;
    setOpen(false);
    router.push(entry.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-md border border-line bg-sunken px-2.5 text-left text-sm text-muted transition-colors hover:border-line-strong sm:w-full sm:max-w-xs sm:px-3"
        aria-label="Search pages and personnel"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="hidden flex-1 truncate sm:inline">Search pages and personnel</span>
        <kbd className="ml-auto hidden rounded border border-line bg-surface px-1.5 text-2xs font-medium text-muted md:inline">
          Ctrl K
        </kbd>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-md">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search aria-hidden className="size-4 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIndex((i) => Math.min(i + 1, results.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIndex((i) => Math.max(i - 1, 0));
                  }
                  if (e.key === "Enter") go(results[index]);
                }}
                placeholder="Search by page, name or call sign"
                className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-results"
                aria-activedescendant={results[index] ? `pal-${results[index].id}` : undefined}
              />
            </div>
            <ul id="palette-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted">No pages or personnel match “{query}”.</li>
              ) : (
                results.map((r, i) => (
                  <li
                    key={r.id}
                    id={`pal-${r.id}`}
                    role="option"
                    aria-selected={i === index}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => go(r)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                      i === index ? "bg-blue-soft text-blue" : "text-ink",
                    )}
                  >
                    <span className="truncate">{r.label}</span>
                    <span className="flex shrink-0 items-center gap-2 text-2xs text-muted">
                      {r.hint}
                      {i === index ? <CornerDownLeft aria-hidden className="size-3" /> : null}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
