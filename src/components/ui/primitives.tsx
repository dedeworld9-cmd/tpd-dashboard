import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "blue" | "gold" | "green" | "amber" | "red";

const toneClass: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2",
  blue: "bg-blue-soft text-blue",
  gold: "bg-gold-soft text-gold",
  green: "bg-green-soft text-green",
  amber: "bg-amber-soft text-amber",
  red: "bg-red-soft text-red",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold leading-5",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}

/** A status dot with an accessible label. */
export function StatusDot({ tone, label }: { tone: Tone; label: string }) {
  const dot: Record<Tone, string> = {
    neutral: "bg-muted",
    blue: "bg-blue",
    gold: "bg-gold",
    green: "bg-green",
    amber: "bg-amber",
    red: "bg-red",
  };
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-2">
      <span aria-hidden className={cn("size-2 rounded-full", dot[tone])} />
      {label}
    </span>
  );
}

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-lg border border-line bg-surface shadow-sm", className)}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  description,
  action,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .replace(/[^A-Za-z. ]/g, "")
    .split(/[ .]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-blue-soft font-semibold text-blue"
    >
      {initials}
    </span>
  );
}

export function Meter({ value, max, label, tone = "blue" }: { value: number; max: number; label: string; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill: Record<Tone, string> = {
    neutral: "bg-muted",
    blue: "bg-blue",
    gold: "bg-gold",
    green: "bg-green",
    amber: "bg-amber",
    red: "bg-red",
  };
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div className={cn("h-full rounded-full", fill[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
