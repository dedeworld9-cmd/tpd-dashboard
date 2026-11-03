import Link from "next/link";
import { Bell } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { MobileNav } from "./sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/primitives";
import { ME, REQUESTS } from "@/lib/sample-data";
import { cn } from "@/lib/cn";

export function Topbar() {
  const pending = REQUESTS.filter((r) => r.member === ME.name && (r.state === "Submitted" || r.state === "Under review")).length;
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/75 sm:px-6">
      <MobileNav />
      <div className="flex min-w-0 flex-1">
        <CommandPalette />
      </div>
      <Link
        href="/hq/patrol"
        className={cn(
          "hidden h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold sm:flex",
          ME.onDuty ? "border-green/30 bg-green-soft text-green" : "border-line text-ink-2 hover:bg-sunken",
        )}
      >
        <span aria-hidden className={cn("size-2 rounded-full", ME.onDuty ? "bg-green" : "bg-muted")} />
        {ME.onDuty ? "On patrol" : "Off duty"}
      </Link>
      <ThemeToggle />
      <Link
        href="/hq/requests"
        className="relative rounded-md p-2 text-ink-2 hover:bg-sunken hover:text-ink"
        aria-label={`Notifications, ${pending} open`}
      >
        <Bell className="size-[18px]" />
        {pending > 0 ? <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red ring-2 ring-surface" /> : null}
      </Link>
      <Link href="/hq/settings" className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-sunken" aria-label={`Your profile, ${ME.name}`}>
        <Avatar name={ME.name} size={28} />
        <span className="hidden flex-col leading-tight md:flex">
          <span className="text-xs font-semibold text-ink">{ME.name}</span>
          <span className="text-2xs text-muted">
            {ME.callsign} · {ME.rank}
          </span>
        </span>
      </Link>
    </header>
  );
}
