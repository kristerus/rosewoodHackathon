"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectGuest: (guestId: string) => void;
}

type Result =
  | { kind: "guest"; id: string; label: string; sub: string }
  | { kind: "ticket"; id: string; guestId: string | null; label: string; sub: string };

export default function CommandPalette({ open, onClose, onSelectGuest }: Props) {
  const guests = useAppStore((s) => s.guests);
  const tickets = useAppStore((s) => s.tickets);
  const selectTicket = useAppStore((s) => s.selectTicket);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // reset and focus on open
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setActive(0);
      // microtask so input mounts first
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results: Result[] = useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    const out: Result[] = [];

    // Always include guests, ranking exact-prefix matches first
    for (const g of guests) {
      const hay = `${g.name} ${g.room ?? ""}`.toLowerCase();
      if (!q || hay.includes(q)) {
        out.push({
          kind: "guest",
          id: g.id,
          label: g.name,
          sub: `Room ${g.room ?? "—"} · ${g.vip_tier.toUpperCase()}`,
        });
      }
    }
    for (const t of tickets) {
      const hay = `${t.intent} ${t.guest_name ?? ""} ${t.room_number ?? ""}`.toLowerCase();
      if (!q || hay.includes(q)) {
        const guestMatch = guests.find(
          (g) =>
            (t.room_number && g.room === t.room_number) ||
            (t.guest_name && g.name.toLowerCase().includes(t.guest_name.toLowerCase())),
        );
        out.push({
          kind: "ticket",
          id: t.id,
          guestId: guestMatch?.id ?? null,
          label: t.intent,
          sub: `${t.department.toUpperCase()} · ${t.guest_name ?? "—"}${t.room_number ? ` · Rm ${t.room_number}` : ""}`,
        });
      }
    }
    return out.slice(0, 20);
  }, [open, query, guests, tickets]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active >= results.length) setActive(0);
  }, [results.length, active]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(results.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const sel = results[active];
        if (!sel) return;
        if (sel.kind === "guest") {
          onSelectGuest(sel.id);
        } else if (sel.kind === "ticket") {
          selectTicket(sel.id);
          if (sel.guestId) onSelectGuest(sel.guestId);
          setActiveTab("service");
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, onClose, onSelectGuest, selectTicket, setActiveTab]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[58] flex items-start justify-center pt-[12vh] bg-black/30 backdrop-blur-[1px] fade-up"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[560px] max-w-[94vw] bg-white border border-ora-hairline-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] rounded-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-ora-hairline">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="text-ora-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Quick find — guest name, room, or SR intent…"
            className="flex-1 bg-transparent text-[13px] text-ora-charcoal placeholder:text-ora-muted-2 outline-none"
          />
          <kbd className="text-[10px] text-ora-muted-2 border border-ora-hairline rounded-sm px-1.5 py-0.5">
            Esc
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto scroll-rw">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[12px] text-ora-muted">
              No matches.
            </li>
          ) : (
            results.map((r, idx) => (
              <li
                key={`${r.kind}-${r.id}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => {
                  if (r.kind === "guest") onSelectGuest(r.id);
                  else {
                    selectTicket(r.id);
                    if (r.guestId) onSelectGuest(r.guestId);
                    setActiveTab("service");
                  }
                  onClose();
                }}
                className={`px-3 py-2 flex items-center gap-3 cursor-pointer text-[12.5px] ${
                  idx === active
                    ? "bg-ora-row-selected text-ora-charcoal"
                    : "hover:bg-ora-row-hover text-ora-charcoal"
                }`}
              >
                <span
                  className={`ora-chip ${
                    r.kind === "guest" ? "ora-chip-blue" : "ora-chip-amber"
                  }`}
                >
                  {r.kind === "guest" ? "GUEST" : "SR"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold">{r.label}</div>
                  <div className="truncate text-[10.5px] text-ora-muted">
                    {r.sub}
                  </div>
                </div>
                {idx === active && (
                  <kbd className="text-[10px] text-ora-muted-2 border border-ora-hairline rounded-sm px-1.5 py-0.5">
                    Enter
                  </kbd>
                )}
              </li>
            ))
          )}
        </ul>
        <div className="px-3 py-2 border-t border-ora-hairline bg-ora-bg text-[10.5px] text-ora-muted-2 flex items-center justify-between">
          <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
          <span className="flex items-center gap-2">
            <kbd className="border border-ora-hairline bg-white rounded-sm px-1">↑↓</kbd>
            Navigate
            <kbd className="border border-ora-hairline bg-white rounded-sm px-1 ml-1">Enter</kbd>
            Select
          </span>
        </div>
      </div>
    </div>
  );
}
