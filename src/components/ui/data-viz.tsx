import { cn } from "@/lib/cn";
import { formatMinutes, REQUIRED_MINUTES } from "@/lib/domain/activity";

/**
 * The weekly activity meter: the 3-hour requirement (HB §3.2) drawn as three
 * hour blocks of four 15-minute cells, so progress reads in real units.
 */
export function HourMeter({
  minutes,
  required = REQUIRED_MINUTES,
  exempt = false,
  size = "md",
  dark = false,
  live = false,
}: {
  minutes: number;
  required?: number;
  exempt?: boolean;
  size?: "sm" | "md" | "lg";
  dark?: boolean;
  live?: boolean;
}) {
  const hours = Math.round(required / 60);
  const filled = Math.floor(minutes / 15);
  const label = exempt ? "Exempt from the weekly activity requirement" : `${formatMinutes(minutes)} of ${hours} hours logged this week`;
  const h = { sm: "h-1.5", md: "h-2", lg: "h-2.5" }[size];
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={required} aria-valuenow={Math.min(minutes, required)} className="flex w-full gap-1.5">
      {Array.from({ length: hours }, (_, hr) => (
        <div key={hr} className="flex flex-1 gap-[2px]">
          {Array.from({ length: 4 }, (_, q) => {
            const i = hr * 4 + q;
            const on = !exempt && i < filled;
            const isLiveCell = live && i === filled;
            return (
              <span
                key={q}
                className={cn(
                  "flex-1 rounded-[2px] transition-colors duration-500",
                  h,
                  exempt ? (dark ? "bg-gold/25" : "bg-gold-soft") : on ? "bg-gold" : dark ? "bg-white/10" : "bg-sunken ring-1 ring-inset ring-line",
                  isLiveCell && "animate-pulse bg-gold/50 motion-reduce:animate-none",
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Vertical bars with a target line. Values are minutes. */
export function BarChart({
  values,
  labels,
  target,
  highlight,
  height = 96,
  label,
}: {
  values: number[];
  labels: string[];
  target?: number;
  highlight?: number;
  height?: number;
  label: string;
}) {
  const max = Math.max(target ?? 0, ...values, 1);
  return (
    <figure aria-label={label} className="w-full">
      <div className="relative flex items-end gap-1.5" style={{ height }}>
        {target ? (
          <div aria-hidden className="absolute inset-x-0 border-t border-dashed border-gold-ink/50" style={{ bottom: `${(target / max) * 100}%` }}>
            <span className="absolute -top-4 right-0 text-3xs font-medium text-gold-ink">{formatMinutes(target)}</span>
          </div>
        ) : null}
        {values.map((v, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end">
            <div
              className={cn(
                "w-full rounded-t-[3px] transition-[height] duration-500",
                v === 0 ? "h-[2px] bg-line" : i === highlight ? "bg-gold" : "bg-ink/80 dark:bg-ink/70",
              )}
              style={v ? { height: `${Math.max(4, (v / max) * 100)}%` } : undefined}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-obsidian px-1.5 py-0.5 text-3xs text-on-dark opacity-0 transition-opacity group-hover:opacity-100">
              {formatMinutes(v)}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-1.5 flex gap-1.5">
        {labels.map((l, i) => (
          <span key={i} className={cn("flex-1 text-center text-3xs", i === highlight ? "font-semibold text-ink" : "text-muted")}>
            {l}
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {values.map((v, i) => (
            <tr key={i}>
              <th scope="row">{labels[i]}</th>
              <td>{formatMinutes(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal capacity bar: filled vs total, with vacancies shown. */
export function CapacityBar({ filled, total, label, tone = "ink" }: { filled: number; total: number; label: string; tone?: "ink" | "gold" }) {
  const pct = total ? Math.min(100, (filled / total) * 100) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled} className="h-1.5 w-full overflow-hidden rounded-full bg-sunken ring-1 ring-inset ring-line">
      <div className={cn("h-full rounded-full transition-[width] duration-500", tone === "gold" ? "bg-gold" : "bg-ink/80")} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Segmented distribution bar (e.g. compliance bands). */
export function StackBar({ segments, label }: { segments: { value: number; className: string; label: string }[]; label: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div role="img" aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`} className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
      {segments.map((s) =>
        s.value ? <div key={s.label} className={cn("h-full first:rounded-l-full last:rounded-r-full", s.className)} style={{ width: `${(s.value / total) * 100}%` }} /> : null,
      )}
    </div>
  );
}

/** Progress ring. */
export function Ring({ value, max, size = 40, label, children }: { value: number; max: number; size?: number; label: string; children?: React.ReactNode }) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={label} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      {children ? <span className="absolute inset-0 flex items-center justify-center text-3xs font-semibold tabular">{children}</span> : null}
    </div>
  );
}

/** Chart legend swatch. */
export function Legend({ c, l }: { c: string; l: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2 rounded-[2px]", c)} />
      {l}
    </span>
  );
}
