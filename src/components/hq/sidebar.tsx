"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { HQ_FOOTER_NAV, HQ_NAV, type NavItem } from "@/lib/nav";
import { Wordmark, Mark } from "@/components/brand/mark";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string) {
  if (href === "/hq") return pathname === "/hq";
  const root = href.split("/").slice(0, 3).join("/");
  return pathname === href || pathname.startsWith(root + "/") || pathname === root;
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
        active ? "bg-blue-soft font-semibold text-blue" : "text-ink-2 hover:bg-sunken hover:text-ink",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function NavBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Headquarters" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {HQ_NAV.map((group) => (
        <div key={group.label}>
          {collapsed ? (
            <div aria-hidden className="mx-2 mb-2 h-px bg-line" />
          ) : (
            <p className="mb-1.5 px-2.5 text-2xs font-medium text-muted">{group.label}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <ul className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
        {HQ_FOOTER_NAV.map((item) => (
          <li key={item.href}>
            <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("tpd-sidebar") === "collapsed");
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("tpd-sidebar", next ? "collapsed" : "open");
      } catch {}
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-line", collapsed ? "justify-center" : "justify-between px-4")}>
        <Link href="/hq" aria-label="TPD Headquarters home">
          {collapsed ? <Mark className="h-7 w-auto" /> : <Wordmark compact />}
        </Link>
        {collapsed ? null : (
          <button
            type="button"
            onClick={toggle}
            className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-ink"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>
      <NavBody collapsed={collapsed} />
      {collapsed ? (
        <button
          type="button"
          onClick={toggle}
          className="mx-auto mb-3 rounded-md p-2 text-muted hover:bg-sunken hover:text-ink"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      ) : null}
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-1.5 rounded-md p-1.5 text-ink-2 hover:bg-sunken lg:hidden"
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-md">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <Wordmark compact />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted hover:bg-sunken"
                aria-label="Close navigation"
                autoFocus
              >
                <X className="size-4" />
              </button>
            </div>
            <NavBody collapsed={false} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
