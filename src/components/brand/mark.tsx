import { cn } from "@/lib/cn";

/** Original TPD shield monogram. Not a reproduction of any real agency insignia. */
export function Mark({ className, title = "Tampa Police Department" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 40 44" role="img" aria-label={title} className={cn("shrink-0", className)}>
      <path
        d="M20 1.5 37 7v13.2c0 10.3-6.9 18.6-17 22.3C9.9 38.8 3 30.5 3 20.2V7L20 1.5Z"
        fill="var(--blue)"
      />
      <path
        d="M20 5.2 33.6 9.6v10.6c0 8.4-5.5 15.3-13.6 18.6C11.9 35.5 6.4 28.6 6.4 20.2V9.6L20 5.2Z"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.2"
      />
      <text
        x="20"
        y="25.5"
        textAnchor="middle"
        fontFamily="inherit"
        fontWeight="700"
        fontSize="11"
        letterSpacing="0.5"
        fill="var(--on-blue)"
      >
        TPD
      </text>
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Mark className="h-8 w-auto" />
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-bold tracking-tight text-ink">Tampa Police</span>
        {compact ? null : <span className="text-2xs text-muted">Florida State Roleplay</span>}
      </span>
    </span>
  );
}
