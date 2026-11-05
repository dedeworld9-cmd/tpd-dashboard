"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Popover anchored to a trigger. Closes on Escape, outside click and
 * selection; returns focus to the trigger. Used by menus and the
 * notification center.
 */
export function Popover({
  trigger,
  children,
  align = "end",
  side = "bottom",
  className,
  rootClassName,
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
  rootClassName?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback(() => {
    setOpen(false);
    (root.current?.querySelector("[data-popover-trigger]") as HTMLElement | null)?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => (root.current?.querySelector("[data-popover-panel] [role=menuitem], [data-popover-panel] button, [data-popover-panel] a") as HTMLElement | null)?.focus());
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div ref={root} className={cn("relative", rootClassName)}>
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      {open ? (
        <div
          id={id}
          data-popover-panel
          role="dialog"
          aria-label={label}
          className={cn(
            "absolute z-50 min-w-56 animate-pop-in rounded-lg border border-line bg-surface p-1 text-ink shadow-lg",
            align === "end" ? "right-0" : "left-0",
            side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
            className,
          )}
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])"));
            if (!items.length) return;
            e.preventDefault();
            const i = items.indexOf(document.activeElement as HTMLElement);
            const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
            items[next].focus();
          }}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  hint,
  onSelect,
  disabled,
  tone,
}: {
  icon?: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onSelect()}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs outline-none transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
        disabled ? "cursor-not-allowed text-muted" : tone === "danger" ? "text-red hover:bg-red-soft focus:bg-red-soft" : "text-ink hover:bg-sunken focus:bg-sunken",
      )}
    >
      {icon ? <span className="text-muted">{icon}</span> : null}
      <span className="flex-1">{children}</span>
      {hint ? <span className="text-3xs text-muted">{hint}</span> : null}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-2.5 pb-1 pt-2 text-3xs font-semibold text-muted">{children}</p>;
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-line" />;
}

/** Tooltip shown on hover and keyboard focus. Content must be supplementary, never the only label. */
export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "right" | "bottom" }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-60 rounded-md bg-obsidian px-2 py-1 text-3xs font-medium text-on-dark opacity-0 shadow-md transition-opacity delay-150 group-focus-within/tt:opacity-100 group-hover/tt:opacity-100",
          side === "top" && "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
          side === "bottom" && "top-full left-1/2 mt-1.5 -translate-x-1/2",
          side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
        )}
      >
        {content}
      </span>
    </span>
  );
}
