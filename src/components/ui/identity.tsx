import Image from "next/image";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Rank } from "@/lib/authz";

/** The department badge. Source: department-supplied artwork, background removed, proportions unchanged. */
export function Badge({ size = 32, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  // Native asset is 207×265.
  const width = Math.round(size * (207 / 265));
  return (
    <Image
      src="/brand/tpd-badge.png"
      alt="Tampa Police Department badge"
      width={width}
      height={size}
      priority={priority}
      className={cn("shrink-0 select-none object-contain", className)}
      style={{ width, height: size }}
    />
  );
}

export function Avatar({ name, size = 32, className, dark }: { name: string; size?: number; className?: string; dark?: boolean }) {
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
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight",
        dark ? "bg-graphite text-gold ring-1 ring-inset ring-gold/30" : "bg-obsidian text-gold",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/**
 * Tier stars follow the roster's own section markers:
 * ★★★★ Office of the Chiefs · ★★★ Command · ★★ Field Supervisory · ★ Patrol Bureau.
 */
export function rankTier(rank: Rank): 1 | 2 | 3 | 4 {
  if (rank === "Chief of Police" || rank === "Deputy Chief" || rank === "Assistant Chief") return 4;
  if (rank === "Major" || rank === "Captain") return 3;
  if (rank === "Lieutenant" || rank === "Sergeant") return 2;
  return 1;
}

export function RankMark({ rank, className, dark }: { rank: Rank; className?: string; dark?: boolean }) {
  const tier = rankTier(rank);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden className="inline-flex gap-px">
        {Array.from({ length: tier }, (_, i) => (
          <Star key={i} className={cn("size-2.5 fill-current", dark ? "text-gold" : "text-gold-ink")} strokeWidth={0} />
        ))}
      </span>
      <span>{rank}</span>
    </span>
  );
}
