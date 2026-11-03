import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "gold" | "secondary" | "ghost" | "danger" | "dark" | "dark-ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-busy:cursor-progress";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-sm",
  gold: "bg-gold text-on-gold hover:bg-gold-hover shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_1px_2px_rgb(0_0_0/0.25)]",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink/30 hover:bg-surface-2 shadow-sm",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "bg-red text-on-red hover:brightness-110 shadow-sm",
  dark: "bg-graphite text-on-dark border border-dark-line hover:bg-[#2f343d]",
  "dark-ghost": "text-on-dark-muted hover:bg-white/8 hover:text-on-dark",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-2xs rounded-sm",
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-9 px-3.5 text-sm rounded-md",
  lg: "h-11 px-5 text-sm rounded-md",
  xl: "h-14 px-7 text-base rounded-lg",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("size-4 animate-spin", className)}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { label: string; variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        base,
        variants[variant],
        size === "sm" ? "size-8 rounded-md" : "size-9 rounded-md",
        "[&_svg]:size-[18px]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
