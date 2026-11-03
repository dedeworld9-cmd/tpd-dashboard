"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

/** Underline tabs with roving arrow-key focus. Renders only the tab list; the caller renders the panel. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("scrollbar-thin flex gap-0.5 overflow-x-auto border-b border-line", className)}
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const i = items.findIndex((t) => t.value === value);
        const next = items[(i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
        onChange(next.value);
        requestAnimationFrame(() => (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus());
      }}
    >
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            data-value={t.value}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative -mb-px flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs transition-colors",
              active ? "font-semibold text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-gold" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span className={cn("rounded-full px-1.5 text-3xs font-semibold tabular", active ? "bg-ink text-on-primary dark:bg-gold dark:text-on-gold" : "bg-sunken text-muted")}>{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control for 2–4 mutually exclusive options (radio semantics). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  dark,
  size = "md",
  disabled,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  dark?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-md p-0.5", dark ? "bg-white/6 ring-1 ring-inset ring-white/10" : "bg-sunken ring-1 ring-inset ring-line")}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-[5px] font-medium transition-colors disabled:opacity-50",
              size === "sm" ? "h-7 px-2.5 text-2xs" : "h-8 px-3 text-xs",
              active
                ? dark
                  ? "bg-graphite text-on-dark shadow-sm ring-1 ring-inset ring-white/10"
                  : "bg-surface text-ink shadow-sm"
                : dark
                  ? "text-on-dark-muted hover:text-on-dark"
                  : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
