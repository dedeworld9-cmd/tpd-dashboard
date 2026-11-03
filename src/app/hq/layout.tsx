import type { Metadata } from "next";
import { Sidebar } from "@/components/hq/sidebar";
import { Topbar } from "@/components/hq/topbar";

export const metadata: Metadata = {
  title: { default: "Headquarters", template: "%s · TPD Headquarters" },
  robots: { index: false, follow: false },
};

/*
 * Milestone 1: design preview. There is no authentication yet, so this layout
 * renders fictional sample data only. Milestone 2 adds the server-side session
 * check here and in every server action.
 */
export default function HqLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <div className="border-b border-amber/20 bg-amber-soft px-4 py-1.5 text-center text-2xs font-medium text-amber sm:px-6">
          Design preview with fictional sample data. Nothing here is saved or reflects real members.
        </div>
        <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
