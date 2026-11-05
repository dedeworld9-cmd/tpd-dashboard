import type { Metadata } from "next";
import { HqShell } from "@/components/shell/hq-shell";

export const metadata: Metadata = {
  title: { default: "Headquarters", template: "%s · TPD Headquarters" },
  robots: { index: false, follow: false },
};

/*
 * Design preview. There is no authentication yet: the shell renders fictional
 * sample personas from the browser-local preview store. Milestone 2 adds the
 * server-side session check here and in every server action.
 */
export default function HqLayout({ children }: { children: React.ReactNode }) {
  return <HqShell>{children}</HqShell>;
}
