"use client";

import React, { useEffect, useRef, useState } from "react";
import { PROPERTIES, useAppStore } from "@/lib/store";
import { useToast } from "@/components/Toaster";

export default function PropertyPicker() {
  const selected = useAppStore((s) => s.selectedProperty);
  const setSelected = useAppStore((s) => s.setSelectedProperty);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] text-ora-charcoal hover:text-ora-red px-2 py-1 rounded-sm hover:bg-ora-row-hover"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M3 21V10l9-7 9 7v11h-6v-7h-6v7H3z" />
        </svg>
        {selected.name}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
          <path d="M1 3l4 4 4-4H1z" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-[240px] bg-white border border-ora-hairline-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] rounded-sm fade-up">
          <div className="px-3 py-2 border-b border-ora-hairline bg-ora-bg">
            <span className="ora-label">Switch property</span>
          </div>
          <ul>
            {PROPERTIES.map((p) => {
              const active = p.id === selected.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!active) {
                        setSelected(p);
                        toast(
                          `Switched property · all data refreshed (mock)`,
                          "info",
                        );
                      }
                      setOpen(false);
                    }}
                    className={`w-full text-left text-[12px] px-3 py-2 flex items-center justify-between hover:bg-ora-row-hover ${
                      active
                        ? "bg-ora-row-selected text-ora-red font-semibold"
                        : "text-ora-charcoal"
                    }`}
                  >
                    <span>{p.name}</span>
                    {active && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        aria-hidden
                      >
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
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
