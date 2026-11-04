"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClipboardList, LayoutDashboard, Menu, Radio, Search, X } from "lucide-react";
import { PatrolProvider } from "@/components/patrol/patrol-provider";
import { Dialog } from "@/components/ui/overlay";
import { Kbd } from "@/components/ui/field";
import { Toaster } from "@/components/ui/feedback";
import { AuthProvider } from "@/lib/backend/auth";
import { cn } from "@/lib/cn";
import { pushRecent } from "@/lib/preview/store";
import { CommandPalette } from "./command-palette";
import { GO_TO } from "./nav-config";
import { NewRequestDialog, type NewRequestType } from "./new-request-dialog";
import { isActive, Sidebar } from "./sidebar";
import { ShellContext, SHORTCUTS, type ShellApi } from "./shell-context";
import { Topbar } from "./topbar";

const COLLAPSE_KEY = "tpd-sidebar-collapsed";

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function HqShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PatrolProvider>
        <ShellInner>{children}</ShellInner>
        <Toaster />
      </PatrolProvider>
    </AuthProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [newReq, setNewReq] = useState<{ open: boolean; type?: NewRequestType }>({ open: false });
  const pendingG = useRef<number>(0);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    pushRecent(pathname);
    setDrawer(false);
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }, []);

  const api = useMemo<ShellApi>(
    () => ({
      collapsed,
      toggleCollapsed,
      openPalette: () => setPalette(true),
      openShortcuts: () => setShortcuts(true),
      openNewRequest: (type) => setNewReq({ open: true, type }),
      openDrawer: () => setDrawer(true),
    }),
    [collapsed, toggleCollapsed],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector("dialog[open]")) return;
      const k = e.key;
      if (pendingG.current && Date.now() - pendingG.current < 1200) {
        pendingG.current = 0;
        const href = GO_TO[k.toLowerCase()];
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }
      if (k === "g" || k === "G") pendingG.current = Date.now();
      else if (k === "/") {
        e.preventDefault();
        setPalette(true);
      } else if (k === "?") setShortcuts(true);
      else if (k === "[") toggleCollapsed();
      else if (k === "n" || k === "N") setNewReq({ open: true });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, toggleCollapsed]);

  return (
    <ShellContext.Provider value={api}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh bg-bg">
        <aside
          aria-label="Sidebar"
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 border-r border-dark-line transition-[width] duration-200 lg:block",
            collapsed ? "w-[60px]" : "w-[248px]",
          )}
        >
          <Sidebar collapsed={collapsed} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main" tabIndex={-1} className="flex-1 pb-24 outline-none lg:pb-10">
            {children}
          </main>
        </div>
      </div>

      <MobileTabBar pathname={pathname} onSearch={() => setPalette(true)} onMenu={() => setDrawer(true)} />
      <Drawer open={drawer} onClose={() => setDrawer(false)} />

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <NewRequestDialog open={newReq.open} initialType={newReq.type} onClose={() => setNewReq({ open: false })} />
      <Dialog open={shortcuts} onClose={() => setShortcuts(false)} title="Keyboard shortcuts" description="Shortcuts are off while you type in a field.">
        <ul className="divide-y divide-line">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between py-2 text-xs">
              <span>{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Dialog>
    </ShellContext.Provider>
  );
}

function MobileTabBar({ pathname, onSearch, onMenu }: { pathname: string; onSearch: () => void; onMenu: () => void }) {
  const tabs = [
    { href: "/hq", label: "Overview", icon: LayoutDashboard },
    { href: "/hq/patrol", label: "Patrol", icon: Radio },
    { href: "/hq/requests", label: "Requests", icon: ClipboardList },
  ];
  const cls = "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium";
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-dark-line bg-obsidian/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="flex h-16">
        {tabs.map((t) => {
          const a = isActive(pathname, t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={a ? "page" : undefined} className={cn(cls, a ? "text-gold" : "text-on-dark-muted")}>
              <t.icon aria-hidden className="size-5" />
              {t.label}
            </Link>
          );
        })}
        <button type="button" onClick={onSearch} className={cn(cls, "text-on-dark-muted")}>
          <Search aria-hidden className="size-5" />
          Search
        </button>
        <button type="button" onClick={onMenu} className={cn(cls, "text-on-dark-muted")}>
          <Menu aria-hidden className="size-5" />
          More
        </button>
      </div>
    </nav>
  );
}

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label="Navigation"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-dvh w-[288px] max-w-[85vw] bg-obsidian p-0 open:animate-fade-in backdrop:animate-fade-in"
    >
      <button type="button" onClick={onClose} aria-label="Close navigation" className="absolute top-3.5 right-3 z-10 rounded-md p-1.5 text-on-dark-muted hover:bg-white/8 hover:text-on-dark">
        <X className="size-5" />
      </button>
      {open ? <Sidebar collapsed={false} onNavigate={onClose} /> : null}
    </dialog>
  );
}
