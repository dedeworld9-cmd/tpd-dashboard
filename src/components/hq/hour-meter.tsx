import { cn } from "@/lib/cn";

/**
 * The weekly activity meter: the 3-hour requirement (HB §3.2) drawn as three
 * hour blocks of four 15-minute cells, so progress reads in real units.
 */
export function HourMeter({
  minutes,
  requiredMinutes = 180,
  exempt = false,
  size = "md",
}: {
  minutes: number;
  requiredMinutes?: number;
  exempt?: boolean;
  size?: "md" | "lg";
}) {
  const hours = requiredMinutes / 60;
  const cellsPerHour = 4;
  const filled = Math.floor(minutes / 15);
  const label = exempt
    ? "Exempt from the weekly activity requirement"
    : `${formatMinutes(minutes)} of ${hours} hours logged this week`;

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={requiredMinutes}
      aria-valuenow={Math.min(minutes, requiredMinutes)}
      className="flex w-full gap-2"
    >
      {Array.from({ length: hours }, (_, h) => (
        <div key={h} className="flex flex-1 gap-[3px]">
          {Array.from({ length: cellsPerHour }, (_, q) => {
            const index = h * cellsPerHour + q;
            const on = !exempt && index < filled;
            return (
              <span
                key={q}
                className={cn(
                  "flex-1 rounded-[3px]",
                  size === "lg" ? "h-3" : "h-2",
                  exempt ? "bg-gold-soft" : on ? "bg-blue" : "bg-sunken",
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
