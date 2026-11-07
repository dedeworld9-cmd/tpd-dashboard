"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  ClipboardPlus,
  CornerDownLeft,
  ExternalLink,
  FileText,
  History,
  Keyboard,
  Moon,
  Play,
  Search,
  Square,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { usePatrol } from "@/components/patrol/patrol-provider";
import { Avatar } from "@/components/ui/identity";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/field";
import { Segmented } from "@/components/ui/tabs";
import { can } from "@/lib/authz";
import { cn } from "@/lib/cn";
import { notConnectedArea } from "@/components/auth/live-gate";
import { useIsLive, useVerifiedMember } from "@/lib/backend/auth";
import { highlight, PAGE_ALIASES, score } from "@/lib/ux/palette-search";
import { requestOpenMember } from "@/lib/ux/pending-member";
import { readRecents } from "@/lib/ux/recents";
import { useMe } from "@/lib/preview/hooks";
import { allMembers, ROLE_PERSONA, setRole, type PatrolDistrict, type PreviewRole } from "@/lib/preview/store";
import { HANDBOOK_URL, USE_OF_FORCE_URL } from "@/lib/public-nav";
import { DIVISIONS } from "@/lib/sample-data";
import { ANCHORCAD_URL, GO_TO, PAGES } from "./nav-config";
import { useShell } from "./shell-context";
import { toggleTheme } from "./theme";

interface Entry {
  id: string;
  group: "Recent" | "Actions" | "Pages" | "Personnel" | "Divisions" | "Policies" | "Preview";
  /** Keyboard shortcut shown as a hint, e.g. "G M". */
  shortcut?: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon?: LucideIcon;
  avatar?: string;
  disabled?: string;
  external?: boolean;
  run: () => void;
}

const GROUP_ORDER: Entry["group"][] = ["Recent", "Actions", "Pages", "Personnel", "Divisions", "Policies", "Preview"];

const SHORTCUT_FOR: Record<string, string> = Object.fromEntries(Object.entries(GO_TO).map(([k, href]) => [href, `G ${k.toUpperCase()}`]));
const pageKnown = (href: string) => PAGES.some((p) => p.href === href);

/**
 * Global command palette (Ctrl/⌘K). Every entry runs a real navigation or
 * store operation, and entries are filtered by the same `can()` checks the
 * pages enforce. Patrol start and end both pass through a confirmation.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const me = useMe();
  const live = useIsLive();
  const verified = useVerifiedMember();
  const [recentsState, setRecents] = useState<string[]>([]);
  const patrolApi = usePatrol();
  const { openNewRequest, openShortcuts } = useShell();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [confirmStart, setConfirmStart] = useState(false);
  const [district, setDistrict] = useState<PatrolDistrict>("North");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setQ("");
      setActive(0);
      setRecents(readRecents(verified?.id ?? "preview", pageKnown));
      setConfirmStart(false);
      d.showModal();
      requestAnimationFrame(() => input.current?.focus());
    }
    if (!open && d.open) d.close();
  }, [open, verified?.id]);

  useEffect(() => {
    if (me?.member.district === "South") setDistrict("South");
  }, [me?.member.district]);

  const entries = useMemo<Entry[]>(() => {
    if (!me) return [];
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    const pages = PAGES.filter((p) => !p.capability || can(me.actor, p.capability));
    const out: Entry[] = [];

    // Actions
    const onDuty = patrolApi.phase === "on-duty";
    // Live mode: patrol, requests and corrections have no server-side record yet, so they are not offered at all.
    if (live) {
      // nothing patrol- or request-related
    } else if (onDuty) {
      out.push({ id: "a-end", group: "Actions", label: "End patrol", hint: "Asks to confirm", icon: Square, keywords: "stop clock off duty", run: () => (onClose(), patrolApi.requestEnd()) });
    } else {
      out.push({
        id: "a-start",
        group: "Actions",
        label: "Start patrol",
        hint: patrolApi.canStart ? "Choose district, then confirm" : undefined,
        icon: Play,
        keywords: "clock on duty begin",
        disabled: patrolApi.canStart ? (patrolApi.phase === "idle" ? undefined : "Busy") : "Needs independent patrol approval (Handbook §3.1)",
        run: () => setConfirmStart(true),
      });
    }
    out.push({
      id: "a-anchorcad",
      group: "Actions",
      label: "Open AnchorCAD",
      icon: ExternalLink,
      keywords: "report arrest citation incident cad",
      disabled: ANCHORCAD_URL ? undefined : "Link not configured yet",
      external: true,
      run: () => (onClose(), window.open(ANCHORCAD_URL, "_blank", "noopener")),
    });
    if (!live) out.push({ id: "a-new", group: "Actions", label: "New request", hint: "N", icon: ClipboardPlus, keywords: "loa leave transfer division ride-along", run: () => (onClose(), openNewRequest()) });
    if (!live) out.push({ id: "a-loa", group: "Actions", label: "Request leave of absence", icon: ClipboardPlus, keywords: "loa", run: () => (onClose(), openNewRequest("Leave of absence")) });
    if (!live) out.push({ id: "a-correction", group: "Actions", label: "Request an activity correction", icon: History, keywords: "fix session time", run: go("/hq/patrol#history") });
    if (live) {
      if (can(me.actor, "command.view")) out.push({ id: "a-integrations", group: "Actions", label: "Check integrations", icon: FileText, keywords: "discord google sheets sync health", run: go("/hq/command/integrations") });
    } else if (can(me.actor, "command.view")) out.push({ id: "a-queue", group: "Actions", label: "Review decision queue", icon: FileText, keywords: "approve deny command", run: go("/hq/command") });
    else if (can(me.actor, "request.review")) out.push({ id: "a-queue", group: "Actions", label: "Review assigned requests", icon: FileText, keywords: "approve deny", run: go("/hq/requests?view=review") });
    out.push({ id: "a-theme", group: "Actions", label: "Toggle light or dark theme", icon: Moon, keywords: "appearance", run: () => toggleTheme() });
    out.push({ id: "a-keys", group: "Actions", label: "Keyboard shortcuts", hint: "?", icon: Keyboard, run: () => (onClose(), openShortcuts()) });

    for (const p of pages.filter((p) => !p.parent || PAGE_ALIASES[p.href])) {
      const closed = live ? notConnectedArea(p.href) : null;
      out.push({
        id: `p-${p.href}`,
        group: "Pages",
        label: p.label,
        hint: p.href.replace("/hq", "") || "/",
        keywords: PAGE_ALIASES[p.href],
        shortcut: SHORTCUT_FOR[p.href],
        icon: FileText,
        disabled: closed ? "Not connected yet" : undefined,
        run: go(p.href),
      });
    }
    for (const d of DIVISIONS) out.push({ id: `d-${d.slug}`, group: "Divisions", label: d.name, hint: d.callsign ? `${d.callsign} · ${d.prefix}` : d.prefix, icon: Building2, run: go(`/hq/divisions/${d.slug}`) });
    if (can(me.actor, "roster.view")) {
      for (const m of allMembers()) out.push({ id: `m-${m.id}`, group: "Personnel", label: m.name, hint: `${m.callsign} · ${m.rank}`, avatar: m.name, keywords: `${m.district} ${m.divisions.join(" ")}`, run: live ? () => (onClose(), requestOpenMember(m.id), router.push("/hq/roster")) : go(`/hq/roster?member=${m.id}`) });
    }
    out.push({ id: "pol-hb", group: "Policies", label: "Personnel Handbook", icon: BookOpen, keywords: "policy hb", external: true, run: () => (onClose(), window.open(HANDBOOK_URL, "_blank", "noopener")) });
    out.push({ id: "pol-uof", group: "Policies", label: "Use of Force Policy", icon: BookOpen, keywords: "policy uof", external: true, run: () => (onClose(), window.open(USE_OF_FORCE_URL, "_blank", "noopener")) });
    for (const r of live ? [] : (Object.keys(ROLE_PERSONA) as PreviewRole[])) {
      if (r === me.role) continue;
      out.push({ id: `r-${r}`, group: "Preview", label: `Preview as ${ROLE_PERSONA[r].label}`, hint: ROLE_PERSONA[r].description, icon: UserRound, keywords: "role persona switch", run: () => (setRole(r), onClose()) });
    }
    return out;
  }, [me, live, patrolApi, router, onClose, openNewRequest, openShortcuts]);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) {
      const recent: Entry[] = (recentsState ?? [])
        .map((href) => PAGES.find((p) => p.href === href))
        .filter((p): p is (typeof PAGES)[number] => !!p && (!p.capability || (!!me && can(me.actor, p.capability))) && !(live && notConnectedArea(p.href)))
        .slice(0, 4)
        .map((p) => ({ id: `rc-${p.href}`, group: "Recent", label: p.label, icon: History, run: () => (onClose(), router.push(p.href)) }));
      const top = entries.filter((e) => e.group === "Actions").slice(0, 6);
      const pages = entries.filter((e) => e.group === "Pages");
      return [...recent, ...top, ...pages];
    }
    return entries
      .map((e) => ({ e, s: score(e, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => GROUP_ORDER.indexOf(a.e.group) - GROUP_ORDER.indexOf(b.e.group) || b.s - a.s)
      .map((x) => x.e)
      .slice(0, 40);
  }, [q, entries, recentsState, me, live, onClose, router]);

  const selectable = results.filter((r) => !r.disabled);
  const current = selectable[Math.min(active, selectable.length - 1)];

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    list.current?.querySelector("[data-active=true]")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (confirmStart) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(1, selectable.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + selectable.length) % Math.max(1, selectable.length));
    } else if (e.key === "Enter" && current) {
      e.preventDefault();
      current.run();
    }
  }

  let lastGroup: string | null = null;
  const listId = "palette-list";

  return (
    <dialog
      ref={ref}
      aria-label="Command palette"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="mx-auto mt-[12vh] mb-auto w-[calc(100%-1.5rem)] max-w-xl overflow-hidden rounded-xl border border-line bg-surface p-0 text-ink shadow-lg open:animate-pop-in backdrop:animate-fade-in"
    >
      {confirmStart ? (
        <div className="p-5">
          <button type="button" onClick={() => setConfirmStart(false)} className="mb-3 inline-flex items-center gap-1.5 text-2xs font-medium text-muted hover:text-ink">
            <ArrowLeft className="size-3.5" aria-hidden /> Back
          </button>
          <h2 className="text-base font-semibold">Start patrol?</h2>
          <p className="mt-1 text-xs text-muted">Your clock starts when you confirm. Choose the district you are patrolling.</p>
          <div className="mt-4">
            <Segmented
              label="District"
              value={district}
              onChange={setDistrict}
              options={[
                { value: "North", label: "North District" },
                { value: "South", label: "South District" },
              ]}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmStart(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              autoFocus
              loading={patrolApi.phase === "starting"}
              onClick={async () => {
                await patrolApi.start(district);
                onClose();
              }}
            >
              {patrolApi.phase === "starting" ? "Starting…" : `Start in ${district}`}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search aria-hidden className="size-4 shrink-0 text-muted" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search pages, people, divisions, actions…"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={current ? `pal-${current.id}` : undefined}
              aria-label="Search commands"
              className="h-13 flex-1 bg-transparent text-sm outline-none placeholder:text-muted focus-visible:outline-none"
            />
            <Kbd>Esc</Kbd>
          </div>
          <p role="status" className="sr-only">
            {results.length === 0 ? "No results" : `${results.length} result${results.length === 1 ? "" : "s"}`}
          </p>
          <div ref={list} id={listId} role={results.length ? "listbox" : undefined} aria-label={results.length ? "Results" : undefined} className="scrollbar-thin max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <div className="px-3 py-9 text-center text-xs text-muted">
                <p>No pages, people or actions match “{q}”.</p>
                <p className="mt-1 text-3xs">Try a page name, a person’s name or call sign, or a word like “roster”, “handbook” or “discord”.</p>
              </div>
            ) : (
              results.map((r) => {
                const header = r.group !== lastGroup ? r.group : null;
                lastGroup = r.group;
                const isActive = current?.id === r.id;
                return (
                  <Row key={r.id} header={header}>
                    <div
                      id={`pal-${r.id}`}
                      role="option"
                      aria-selected={isActive}
                      aria-disabled={!!r.disabled || undefined}
                      data-active={isActive}
                      onMouseMove={() => !r.disabled && setActive(selectable.indexOf(r))}
                      onClick={() => !r.disabled && r.run()}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-xs",
                        r.disabled ? "cursor-not-allowed opacity-55" : isActive ? "bg-sunken" : "",
                      )}
                    >
                      {r.avatar ? (
                        <Avatar name={r.avatar} size={22} />
                      ) : r.icon ? (
                        <r.icon aria-hidden className={cn("size-4 shrink-0", isActive ? "text-gold-ink" : "text-muted")} />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {highlight(r.label, q).map((run, i) =>
                          run.hit ? (
                            <b key={i} className="font-bold text-gold-ink underline decoration-gold/60 decoration-2 underline-offset-2">
                              {run.text}
                            </b>
                          ) : (
                            <span key={i}>{run.text}</span>
                          ),
                        )}
                      </span>
                      <span className="max-w-[40%] truncate text-3xs text-muted">{r.disabled ?? r.hint}</span>
                      {r.shortcut && !r.disabled ? <Kbd>{r.shortcut}</Kbd> : null}
                      {r.external && !r.disabled ? <ExternalLink aria-label="Opens in a new tab" className="size-3 text-muted" /> : null}
                      {isActive ? <CornerDownLeft aria-hidden className="size-3.5 text-muted" /> : null}
                    </div>
                  </Row>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2 text-3xs text-muted">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> move
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> open
            </span>
            <span className="ml-auto">Results respect your access</span>
          </div>
        </>
      )}
    </dialog>
  );
}

function Row({ header, children }: { header: string | null; children: ReactNode }) {
  return (
    <>
      {header ? <p className="px-3 pt-2.5 pb-1 text-3xs font-semibold text-muted">{header}</p> : null}
      {children}
    </>
  );
}
