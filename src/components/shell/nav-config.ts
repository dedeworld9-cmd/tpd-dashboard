import {
  Activity,
  BookOpen,
  Building2,
  ClipboardList,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Radio,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Capability } from "@/lib/authz";
import { DIVISIONS } from "@/lib/sample-data";

export interface NavLeaf {
  href: string;
  label: string;
  icon?: LucideIcon;
  capability?: Capability;
  shortcut?: string;
  children?: NavLeaf[];
}

export interface NavGroup {
  label: string;
  items: NavLeaf[];
}

export const NAV: NavGroup[] = [
  {
    label: "Personal",
    items: [
      { href: "/hq", label: "Overview", icon: LayoutDashboard, shortcut: "G O" },
      { href: "/hq/patrol", label: "Patrol", icon: Radio, shortcut: "G P" },
      { href: "/hq/activity", label: "Activity", icon: Activity, shortcut: "G A" },
      { href: "/hq/training", label: "Training", icon: GraduationCap, shortcut: "G T" },
    ],
  },
  {
    label: "Department",
    items: [
      { href: "/hq/roster", label: "Personnel", icon: Users, capability: "roster.view", shortcut: "G M" },
      {
        href: "/hq/divisions",
        label: "Divisions",
        icon: Building2,
        children: DIVISIONS.map((d) => ({ href: `/hq/divisions/${d.slug}`, label: d.name })),
      },
      { href: "/hq/requests", label: "Requests", icon: ClipboardList, shortcut: "G R" },
      { href: "/hq/resources", label: "Resources", icon: BookOpen },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/hq/supervisor", label: "Supervisor", icon: ShieldCheck, capability: "supervisor.view" },
      { href: "/hq/command", label: "Command Center", icon: Gauge, capability: "command.view", shortcut: "G C" },
    ],
  },
];

export const FOOTER_NAV: NavLeaf[] = [{ href: "/hq/settings", label: "Settings", icon: Settings }];

/** Flattened page index for breadcrumbs and the command palette. */
export const PAGES: { href: string; label: string; parent?: string; capability?: Capability }[] = [
  ...NAV.flatMap((g) =>
    g.items.flatMap((i) => [
      { href: i.href, label: i.label, capability: i.capability },
      ...(i.children ?? []).map((c) => ({ href: c.href, label: c.label, parent: i.href })),
    ]),
  ),
  ...FOOTER_NAV.map((i) => ({ href: i.href, label: i.label })),
];

export const GO_TO: Record<string, string> = { o: "/hq", p: "/hq/patrol", a: "/hq/activity", t: "/hq/training", m: "/hq/roster", r: "/hq/requests", c: "/hq/command" };

/** AnchorCAD is the department's official reporting system (HB §10). No API integration exists. */
export const ANCHORCAD_URL = process.env.NEXT_PUBLIC_ANCHORCAD_URL ?? "";
