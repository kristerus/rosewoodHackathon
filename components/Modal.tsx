"use client";

import React, { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional footer rendered in a right-aligned strip. */
  footer?: React.ReactNode;
  /** Defaults to 420 px. Pass any number for px or string for css value. */
  width?: number | string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 420,
}: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus first focusable element when opened
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const focusable = el.querySelector<HTMLElement>(
      "input, textarea, select, button, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
  }, [open]);

  if (!open) return null;
  const widthStyle =
    typeof width === "number" ? `${width}px` : (width as string);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/30 backdrop-blur-[1px] fade-up"
      onMouseDown={(e) => {
        // close when clicking the backdrop, not the modal itself
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white border border-ora-hairline-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] rounded-sm flex flex-col max-h-[88vh]"
        style={{ width: widthStyle, maxWidth: "94vw" }}
      >
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-ora-hairline bg-ora-bg">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "var(--ora-red)" }}
            />
            <h2 className="text-[12px] font-semibold tracking-wider uppercase text-ora-charcoal">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-6 w-6 rounded-sm hover:bg-ora-row-hover flex items-center justify-center text-ora-muted"
          >
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </header>
        <div className="px-4 py-3 overflow-y-auto scroll-rw flex-1">
          {children}
        </div>
        {footer && (
          <footer className="px-4 py-2.5 border-t border-ora-hairline bg-ora-bg flex items-center justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
