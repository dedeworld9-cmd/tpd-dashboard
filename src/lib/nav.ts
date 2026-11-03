import {
  Activity,
  BookOpen,
  Building2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Radio,
  Settings,
  ShieldCheck,
  Users,
  Gauge,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Capability required to see the link. Hiding a link is never the authorization check. */
  capability?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const HQ_NAV: NavGroup[] = [
  {
    label: "Personal",
    items: [
      { href: "/hq", label: "Overview", icon: LayoutDashboard },
      { href: "/hq/patrol", label: "Patrol", icon: Radio },
      { href: "/hq/activity", label: "Activity", icon: Activity },
      { href: "/hq/training", label: "Training", icon: GraduationCap },
    ],
  },
  {
    label: "Department",
    items: [
      { href: "/hq/roster", label: "Personnel", icon: Users },
      { href: "/hq/divisions/waterfront", label: "Divisions", icon: Building2 },
      { href: "/hq/resources", label: "Resources", icon: BookOpen },
      { href: "/hq/requests", label: "Requests", icon: ClipboardList },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/hq/supervisor", label: "Supervisor workspace", icon: ShieldCheck, capability: "supervisor.view" },
      { href: "/hq/command", label: "Command Center", icon: Gauge, capability: "command.view" },
    ],
  },
];

export const HQ_FOOTER_NAV: NavItem[] = [{ href: "/hq/settings", label: "Settings", icon: Settings }];

/** AnchorCAD is the department's official reporting system (HB §10). No API integration exists. */
export const ANCHORCAD_URL = process.env.NEXT_PUBLIC_ANCHORCAD_URL ?? "";
