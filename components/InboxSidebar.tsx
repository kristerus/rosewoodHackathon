"use client";

import React, { useMemo, useState } from "react";
import type { Guest, Ticket } from "@/lib/types";
import { matchGuestForTicket, useAppStore } from "@/lib/store";

interface InboxSidebarProps {
  guests: Guest[];
  tickets: Ticket[];
  focusedGuestId: string | null;
  focusedKey: string | null; // either guest.id or "__unassigned__"
  onFocusGuest: (id: string | null) => void;
  onFocusUnassigned: () => void;
  onAddGuest?: () => void;
}

type Filter = "all" | "arrivals" | "inhouse" | "departures";

/* ---------- helpers ---------- */

function initials(name: string): string {
  return name
    .replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, "")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Deterministic short confirmation # from guest id. */
function confirmationNumber(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 33 + id.charCodeAt(i)) >>> 0;
  return `RES-${(n % 1_000_000).toString().padStart(6, "0")}`;
}

type StayStatus = "DUE IN" | "ARRIVED" | "DEPARTING" | "DEPARTED";

function stayStatus(g: Guest, mockDemoMode: boolean): StayStatus {
  if (mockDemoMode) return "ARRIVED";
  const now = Date.now();
  const ci = new Date(g.booking_dates.check_in).getTime();
  const co = new Date(g.booking_dates.check_out).getTime();
  if (Number.isFinite(ci) && now < ci) return "DUE IN";
  if (Number.isFinite(co) && now > co) return "DEPARTED";
  // crude "departing today" detection: within 18h of checkout
  if (Number.isFinite(co) && co - now < 18 * 3600 * 1000) return "DEPARTING";
  return "ARRIVED";
}

const TIER_SHORT: Record<Guest["vip_tier"], string> = {
  standard: "STD",
  gold: "GOLD",
  platinum: "PLAT",
  legacy: "LEGACY",
};

const TIER_CHIP_CLASS: Record<Guest["vip_tier"], string> = {
  standard: "ora-chip-grey",
  gold: "ora-chip-amber",
  platinum: "ora-chip-blue",
  legacy: "ora-chip-red",
};

const STATUS_CHIP_CLASS: Record<StayStatus, string> = {
  "DUE IN": "ora-chip-blue",
  ARRIVED: "ora-chip-green",
  DEPARTING: "ora-chip-amber",
  DEPARTED: "ora-chip-grey",
};

interface ReservationItem {
  key: string;
  guest: Guest | null;
  displayName: string;
  room: string | null;
  lastTicket: Ticket | null;
  lastTimestamp: number;
  count: number;
  status: StayStatus | null;
  confirmation: string | null;
}

export default function InboxSidebar({
  guests,
  tickets,
  focusedGuestId,
  focusedKey,
  onFocusGuest,
  onFocusUnassigned,
  onAddGuest,
}: InboxSidebarProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const mockDemoMode = useAppStore((s) => s.mockDemoMode);

  const items: ReservationItem[] = useMemo(() => {
    const guestItems: ReservationItem[] = guests.map((g) => {
      const gTickets = tickets.filter((t) => {
        const byRoom = t.room_number && g.room === t.room_number;
        const byName =
          t.guest_name &&
          g.name.toLowerCase().includes(t.guest_name.toLowerCase());
        return Boolean(byRoom || byName);
      });
      const last = gTickets[0] ?? null;
      return {
        key: g.id,
        guest: g,
        displayName: g.name,
        room: g.room,
        lastTicket: last,
        lastTimestamp: last ? new Date(last.timestamp).getTime() : 0,
        count: gTickets.length,
        status: stayStatus(g, mockDemoMode),
        confirmation: confirmationNumber(g.id),
      };
    });

    // Filter by status
    let filtered = guestItems;
    if (filter === "arrivals") {
      filtered = filtered.filter((it) => it.status === "DUE IN");
    } else if (filter === "inhouse") {
      filtered = filtered.filter(
        (it) => it.status === "ARRIVED" || it.status === "DEPARTING",
      );
    } else if (filter === "departures") {
      filtered = filtered.filter(
        (it) => it.status === "DEPARTING" || it.status === "DEPARTED",
      );
    }

    const unassigned = tickets.filter(
      (t) => !matchGuestForTicket(t, guests),
    );
    if (unassigned.length > 0 && filter === "all") {
      const last = unassigned[0];
      filtered = [
        ...filtered,
        {
          key: "__unassigned__",
          guest: null,
          displayName: "Unallocated SRs",
          room: null,
          lastTicket: last,
          lastTimestamp: new Date(last.timestamp).getTime(),
          count: unassigned.length,
          status: null,
          confirmation: null,
        },
      ];
    }

    // Sort by most recent activity then name.
    filtered.sort((a, b) => {
      if (b.lastTimestamp !== a.lastTimestamp)
        return b.lastTimestamp - a.lastTimestamp;
      return a.displayName.localeCompare(b.displayName);
    });

    return filtered;
  }, [guests, tickets, filter, mockDemoMode]);

  const totalSRs = items.reduce((acc, it) => acc + it.count, 0);

  return (
    <aside className="flex h-full w-full flex-col bg-white border-r border-ora-hairline">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-ora-hairline">
        <div className="flex items-center justify-between">
          <h2 className="ora-label text-ora-charcoal">
            Reservations · Arrivals Today
          </h2>
          <span className="inline-flex items-center justify-center min-w-[22px] h-[18px] px-1.5 rounded-sm border border-ora-hairline-2 bg-ora-bg text-[10.5px] font-bold tabular-nums text-ora-charcoal">
            {items.filter((it) => it.guest).length}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-ora-muted">
          Property: RSF · {totalSRs} open service request{totalSRs === 1 ? "" : "s"}
        </p>
      </div>

      {/* New Guest Profile button — Oracle-style "add new row" affordance */}
      {onAddGuest && (
        <div className="px-3 pt-2 pb-1 bg-white">
          <button
            type="button"
            onClick={onAddGuest}
            className="w-full text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1.5 border border-dashed border-ora-hairline-2 hover:border-ora-red hover:text-ora-red text-ora-muted bg-white rounded-sm transition-colors flex items-center justify-center gap-1.5"
            title="Create a new guest profile"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 1v10M1 6h10" strokeLinecap="round" />
            </svg>
            New Guest Profile
          </button>
        </div>
      )}

      {/* Filter chips */}
      <div className="px-3 py-2 flex items-center gap-1 border-b border-ora-hairline bg-ora-bg">
        {(
          [
            ["all", "All"],
            ["arrivals", "Arrivals"],
            ["inhouse", "In-House"],
            ["departures", "Departures"],
          ] as const
        ).map(([key, label]) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`text-[11px] px-2.5 py-[3px] rounded-sm border transition-colors font-medium ${
                active
                  ? "bg-white border-ora-red text-ora-red"
                  : "bg-white border-ora-hairline text-ora-muted hover:text-ora-charcoal hover:border-ora-hairline-2"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Column header */}
      <div className="px-4 py-1.5 flex items-center justify-between bg-white border-b border-ora-hairline">
        <span className="ora-label">Guest · Room</span>
        <span className="ora-label">Stay</span>
      </div>

      {/* Reservation list */}
      <div className="scroll-rw flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[12.5px] text-ora-muted">
              No reservations match filter.
            </p>
          </div>
        ) : (
          <ul>
            {items.map((it) => {
              const isFocused = focusedKey === it.key;
              const isUnassigned = it.guest === null;
              const hasOpenSR = it.count > 0;
              return (
                <li key={it.key}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isUnassigned) onFocusUnassigned();
                      else onFocusGuest(it.guest!.id);
                    }}
                    className={`w-full text-left flex items-start gap-3 px-4 py-2.5 border-l-[3px] border-b border-b-ora-hairline transition-colors ${
                      isFocused
                        ? "bg-ora-row-selected border-l-ora-red"
                        : "border-l-transparent hover:bg-ora-row-hover"
                    }`}
                  >
                    {/* Avatar / status indicator */}
                    <div
                      className="h-8 w-8 shrink-0 rounded-sm flex items-center justify-center text-[10.5px] font-bold border"
                      style={
                        isUnassigned
                          ? {
                              backgroundColor: "#F4F4F5",
                              color: "#6B7280",
                              borderColor: "#E5E7EB",
                            }
                          : {
                              backgroundColor: "#F4F4F5",
                              color: "#312D2A",
                              borderColor: "#E5E7EB",
                            }
                      }
                      aria-hidden
                    >
                      {isUnassigned ? "?" : initials(it.displayName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] font-semibold text-ora-charcoal">
                          {it.displayName}
                          {it.room && (
                            <span className="ml-1.5 text-[11px] text-ora-muted font-normal">
                              · Rm {it.room}
                            </span>
                          )}
                        </span>
                        {hasOpenSR && (
                          <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded-sm bg-ora-red text-white text-[9.5px] font-bold tabular-nums">
                            {it.count}
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-ora-muted-2 tabular-nums">
                        {it.confirmation ? (
                          <span className="font-mono">{it.confirmation}</span>
                        ) : (
                          <span>—</span>
                        )}
                        {it.guest && (
                          <span>
                            · {shortDate(it.guest.booking_dates.check_in)} → {shortDate(it.guest.booking_dates.check_out)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {it.status && (
                          <span className={`ora-chip ${STATUS_CHIP_CLASS[it.status]}`}>
                            {it.status}
                          </span>
                        )}
                        {it.guest && (
                          <span className={`ora-chip ${TIER_CHIP_CLASS[it.guest.vip_tier]}`}>
                            {TIER_SHORT[it.guest.vip_tier]}
                          </span>
                        )}
                        {isUnassigned && (
                          <span className="ora-chip ora-chip-red">UNALLOCATED</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-ora-hairline text-[10.5px] text-ora-muted flex items-center justify-between tabular-nums">
        <span>{guests.length} reservations</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-ora-green" />
          <span className="uppercase tracking-wider">PMS Sync OK</span>
        </span>
      </div>
      <span className="hidden" data-focused-guest-id={focusedGuestId ?? ""} />
    </aside>
  );
}
