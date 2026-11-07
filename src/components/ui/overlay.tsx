"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";

/**
 * Modal dialog on the native <dialog> element: focus trap, Escape to close,
 * inert background and focus restore come from the platform.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // React propagates a nested dialog's close event to its ancestors; only react to our own.
      onClose={(e) => e.target === ref.current && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-xl border border-line bg-surface p-0 text-ink shadow-lg open:animate-pop-in backdrop:animate-fade-in",
        { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" }[size],
      )}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          {description ? <div className="mt-1 text-xs text-muted">{description}</div> : null}
        </div>
        <IconButton label="Close" size="sm" onClick={onClose} className="-mr-2 -mt-1">
          <X />
        </IconButton>
      </div>
      {children ? <div className="px-5 pt-4">{children}</div> : null}
      {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3.5">{footer}</div> : <div className="h-5" />}
    </dialog>
  );
}

/** Right-hand side sheet (full screen on phones) for inspecting a record without leaving the list. */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // React propagates a nested dialog's close event to its ancestors; only react to our own.
      onClose={(e) => e.target === ref.current && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-full border-l border-line bg-surface p-0 text-ink shadow-lg open:flex open:flex-col open:animate-sheet-in backdrop:animate-fade-in sm:max-w-[480px]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate text-base font-semibold text-ink">
            {title}
          </h2>
          {subtitle ? <div className="mt-0.5 text-2xs text-muted">{subtitle}</div> : null}
        </div>
        <IconButton label="Close panel" size="sm" onClick={onClose} className="-mr-2">
          <X />
        </IconButton>
      </header>
      <div className="scrollbar-thin flex-1 overflow-y-auto">{children}</div>
      {footer ? <footer className="border-t border-line bg-surface-2 px-5 py-3.5">{footer}</footer> : null}
    </dialog>
  );
}
