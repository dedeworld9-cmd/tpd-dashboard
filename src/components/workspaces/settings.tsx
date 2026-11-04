"use client";

import { Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/page";
import { useShell } from "@/components/shell/shell-context";
import { setTheme, useTheme } from "@/components/shell/theme";
import { Button } from "@/components/ui/button";
import { Skeleton, toast } from "@/components/ui/feedback";
import { Card, CardHeader } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { useMe } from "@/lib/preview/hooks";
import { resetPreview, ROLE_PERSONA, setRole, type PreviewRole } from "@/lib/preview/store";

export function SettingsWorkspace() {
  const me = useMe();
  const theme = useTheme();
  const { collapsed, toggleCollapsed, openShortcuts } = useShell();
  if (!me) {
    return (
      <Page>
        <Skeleton className="h-96 rounded-lg" />
      </Page>
    );
  }
  return (
    <Page>
      <PageHeader eyebrow="Personal" title="Settings" description="Appearance and preview controls. Account settings arrive with Discord sign-in." />
      <div className="flex max-w-3xl flex-col gap-5">
        <Card>
          <CardHeader title="Appearance" />
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2 border-t border-line p-4">
            {(
              [
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
                ["system", "Match system", Monitor],
              ] as const
            ).map(([v, l, I]) => (
              <button key={v} type="button" role="radio" aria-checked={theme === v} onClick={() => setTheme(v)} className={cn("flex flex-col items-center gap-2 rounded-lg p-4 text-xs font-medium ring-1 ring-inset", theme === v ? "bg-gold-soft ring-gold" : "ring-line hover:bg-surface-2")}>
                <I className="size-5" aria-hidden />
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs">
            <span>Sidebar {collapsed ? "collapsed" : "expanded"} on wide screens</span>
            <Button size="xs" variant="secondary" onClick={toggleCollapsed}>
              {collapsed ? "Expand" : "Collapse"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs">
            <span>Keyboard shortcuts</span>
            <Button size="xs" variant="secondary" onClick={openShortcuts}>
              View
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Design preview" description="These controls exist only while the portal runs on sample data" />
          <div className="grid grid-cols-1 gap-2 border-t border-line p-4 sm:grid-cols-2">
            {(Object.keys(ROLE_PERSONA) as PreviewRole[]).map((r) => (
              <button key={r} type="button" aria-pressed={me.role === r} onClick={() => setRole(r)} className={cn("rounded-lg p-3 text-left ring-1 ring-inset", me.role === r ? "bg-gold-soft ring-gold" : "ring-line hover:bg-surface-2")}>
                <span className="block text-xs font-semibold">Preview as {ROLE_PERSONA[r].label}</span>
                <span className="block text-3xs text-muted">{ROLE_PERSONA[r].description}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs">
            <span>Reset sample sessions, requests and personnel changes</span>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => {
                resetPreview();
                toast("info", "Preview data reset");
              }}
            >
              <RotateCcw className="size-3.5" aria-hidden /> Reset
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Account" description="Available after Discord sign-in (Milestone 2)" />
          <p className="border-t border-line px-4 py-3.5 text-2xs text-muted">Your name, rank and call sign will come from the official roster. Linked Discord account, sign-out and session management appear here.</p>
        </Card>
      </div>
    </Page>
  );
}
