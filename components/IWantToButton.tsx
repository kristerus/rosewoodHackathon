"use client";

import React, { useEffect, useRef, useState } from "react";

export interface IWantToItem {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

interface IWantToButtonProps {
  items: IWantToItem[];
  label?: string;
  size?: "sm" | "md";
  primary?: boolean;
  /** Anchor side for the popover ("right" aligns dropdown to the button's right edge). */
  align?: "left" | "right";
  /** stopPropagation on the wrapper - useful when nested inside row click handlers. */
  stopPropagation?: boolean;
  className?: string;
  title?: string;
}

/**
 * "I Want To…" contextual action button — OPERA Cloud trademark affordance.
 * Renders a button + dropdown menu of actions. Closes on outside-click or Esc.
 */
export default function IWantToButton({
  items,
  label = "I Want To…",
  size = "sm",
  primary = false,
  align = "right",
  stopPropagation = true,
  className,
  title,
}: IWantToButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const btnClass =
    (primary ? "ora-btn ora-btn-primary" : "ora-btn") +
    (size === "sm" ? " h-7 text-[11.5px]" : "");

  return (
    <div
      ref={wrapRef}
      className={"relative inline-block " + (className ?? "")}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
      }}
    >
      <button
        type="button"
        title={title ?? label}
        className={btnClass}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="currentColor"
          aria-hidden
          style={{ marginLeft: 4 }}
        >
          <path d="M1 3l4 4 4-4H1z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-1 min-w-[200px] bg-white border border-ora-hairline-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] rounded-sm fade-up"
          style={
            align === "right"
              ? { right: 0, top: "100%" }
              : { left: 0, top: "100%" }
          }
        >
          <ul className="py-1">
            {items.map((it, i) => {
              if (it.divider) {
                return (
                  <li
                    key={`div-${i}`}
                    aria-hidden
                    className="my-1 h-px bg-ora-hairline mx-2"
                  />
                );
              }
              return (
                <li key={`${it.label}-${i}`}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      it.onClick?.();
                    }}
                    className={
                      "w-full text-left px-3 py-1.5 text-[12px] hover:bg-ora-row-hover " +
                      (it.danger
                        ? "text-ora-red hover:text-ora-red-deep "
                        : "text-ora-charcoal ") +
                      (it.disabled ? "opacity-50 cursor-not-allowed" : "")
                    }
                  >
                    {it.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
