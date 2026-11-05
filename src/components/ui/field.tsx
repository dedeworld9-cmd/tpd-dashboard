import { Search, ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-md border border-line-strong bg-surface text-sm text-ink placeholder:text-muted transition-[border-color,box-shadow] hover:border-ink/25 focus:border-gold-ink focus:outline-none focus:ring-3 focus:ring-gold/25 disabled:opacity-50 aria-invalid:border-red aria-invalid:ring-red/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-9 px-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 px-3 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select className={cn(control, "h-9 appearance-none pl-3 pr-8")} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </span>
  );
}

export function SearchField({ className, label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input type="search" className={cn(control, "h-9 pl-9 pr-3")} {...props} />
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-2xs font-medium text-red">
          {error}
        </p>
      ) : hint ? (
        <p className="text-2xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line-strong bg-surface-2 px-1 font-sans text-3xs font-semibold text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
