"use client";

import React, { useMemo, useState } from "react";
import type { Guest } from "@/lib/types";
import { useAppStore } from "@/lib/store";

interface ReservationsTabProps {
  onRowClick: (id: string) => void;
}

type SortDir = "asc" | "desc";
type Col =
  | "conf"
  | "name"
  | "room"
  | "status"
  | "ci"
  | "co"
  | "rate"
  | "market"
  | "tier"
  | "adults"
  | "children"
  | "stays";

type FilterKey = "all" | "arrivals" | "inhouse" | "departures" | "dayuse" | "vips";

const STATUS_BY_INDEX: ReadonlyArray<{
  key: string;
  chip: string;
  cancelled?: boolean;
}> = [
  { key: "DUE IN", chip: "ora-chip-blue" },
  { key: "ARRIVED", chip: "ora-chip-green" },
  { key: "IN-HOUSE", chip: "ora-chip-grey" },
  { key: "DEPARTING", chip: "ora-chip-amber" },
  { key: "CHECKED OUT", chip: "ora-chip-grey" },
  { key: "NO SHOW", chip: "ora-chip-red" },
  { key: "CXL", chip: "ora-chip-grey", cancelled: true },
];

const TIER_CHIP: Record<Guest["vip_tier"], string> = {
  standard: "ora-chip-grey",
  gold: "ora-chip-amber",
  platinum: "ora-chip-blue",
  legacy: "ora-chip-red",
};

const RATE_CODES = ["RW-CORP", "RW-LEISURE", "RW-CONS", "RW-AAA", "RW-SUITE"];
const MARKETS = ["LEISURE", "BUSINESS", "GROUP", "WHOLESALE", "GOV"];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 33 + id.charCodeAt(i)) >>> 0;
  return n;
}

function confirmationNumber(id: string): string {
  return `RES-${(hashId(id) % 1_000_000).toString().padStart(6, "0")}`;
}

function pickFromList<T>(id: string, list: readonly T[], offset = 0): T {
  return list[(hashId(id) + offset) % list.length];
}

function pickInt(id: string, offset: number, lo: number, hi: number): number {
  return lo + ((hashId(id) + offset * 17) % (hi - lo + 1));
}

function deriveStatus(g: Guest): (typeof STATUS_BY_INDEX)[number] {
  // Most are IN-HOUSE in demo seed; mix in a few statuses deterministically
  const h = hashId(g.id) % 100;
  if (h < 8) return STATUS_BY_INDEX[0]; // DUE IN
  if (h < 14) return STATUS_BY_INDEX[3]; // DEPARTING
  if (h < 17) return STATUS_BY_INDEX[1]; // ARRIVED
  if (h < 19) return STATUS_BY_INDEX[4]; // CHECKED OUT
  if (h === 19) return STATUS_BY_INDEX[6]; // CXL
  return STATUS_BY_INDEX[2]; // IN-HOUSE
}

function isVip(g: Guest): boolean {
  return g.vip_tier === "platinum" || g.vip_tier === "legacy";
}

function isWalkIn(g: Guest): boolean {
  return hashId(g.id) % 11 === 0;
}

function compareStr(a: string, b: string, dir: SortDir): number {
  const r = a.localeCompare(b);
  return dir === "asc" ? r : -r;
}
function compareNum(a: number, b: number, dir: SortDir): number {
  return dir === "asc" ? a - b : b - a;
}

export default function ReservationsTab({ onRowClick }: ReservationsTabProps) {
  const guests = useAppStore((s) => s.guests);
  const selectedProperty = useAppStore((s) => s.selectedProperty);

  const [col, setCol] = useState<Col>("name");
  const [dir, setDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const toggle = (c: Col) => {
    if (c === col) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setCol(c);
      setDir("asc");
    }
  };

  const enriched = useMemo(() => {
    return guests.map((g) => {
      const status = deriveStatus(g);
      return {
        guest: g,
        status,
        rate: pickFromList(g.id, RATE_CODES, 1),
        market: pickFromList(g.id, MARKETS, 2),
        adults: pickInt(g.id, 3, 1, 2),
        children: hashId(g.id) % 5 === 0 ? pickInt(g.id, 4, 1, 2) : 0,
        vip: isVip(g),
        walkin: isWalkIn(g),
      };
    });
  }, [guests]);

  const filtered = useMemo(() => {
    let arr = enriched;
    if (filter === "arrivals") arr = arr.filter((r) => r.status.key === "DUE IN" || r.status.key === "ARRIVED");
    else if (filter === "inhouse") arr = arr.filter((r) => r.status.key === "IN-HOUSE");
    else if (filter === "departures") arr = arr.filter((r) => r.status.key === "DEPARTING" || r.status.key === "CHECKED OUT");
    else if (filter === "dayuse") arr = arr.filter((r) => r.guest.booking_dates.check_in === r.guest.booking_dates.check_out);
    else if (filter === "vips") arr = arr.filter((r) => r.vip);

    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) => {
        return (
          r.guest.name.toLowerCase().includes(q) ||
          (r.guest.room ?? "").toLowerCase().includes(q) ||
          confirmationNumber(r.guest.id).toLowerCase().includes(q) ||
          r.market.toLowerCase().includes(q)
        );
      });
    }
    return arr;
  }, [enriched, filter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (col) {
        case "conf":
          return compareStr(confirmationNumber(a.guest.id), confirmationNumber(b.guest.id), dir);
        case "name":
          return compareStr(a.guest.name, b.guest.name, dir);
        case "room":
          return compareStr(a.guest.room ?? "", b.guest.room ?? "", dir);
        case "status":
          return compareStr(a.status.key, b.status.key, dir);
        case "ci":
          return compareStr(a.guest.booking_dates.check_in, b.guest.booking_dates.check_in, dir);
        case "co":
          return compareStr(a.guest.booking_dates.check_out, b.guest.booking_dates.check_out, dir);
        case "rate":
          return compareStr(a.rate, b.rate, dir);
        case "market":
          return compareStr(a.market, b.market, dir);
        case "tier":
          return compareStr(a.guest.vip_tier, b.guest.vip_tier, dir);
        case "adults":
          return compareNum(a.adults, b.adults, dir);
        case "children":
          return compareNum(a.children, b.children, dir);
        case "stays":
          return compareNum(a.guest.past_stays, b.guest.past_stays, dir);
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, col, dir]);

  const selectedCount = useMemo(
    () => sorted.filter((r) => selected[r.guest.id]).length,
    [sorted, selected],
  );

  const allChecked = sorted.length > 0 && selectedCount === sorted.length;
  const toggleAll = () => {
    if (allChecked) setSelected({});
    else {
      const next: Record<string, boolean> = {};
      for (const r of sorted) next[r.guest.id] = true;
      setSelected(next);
    }
  };

  const totalCount = enriched.length;

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="ora-page-head flex items-center justify-between">
        <div>
          <h2>Reservations</h2>
          <div className="sub">
            {selectedProperty.name} · {totalCount} reservation{totalCount === 1 ? "" : "s"} on record · Today
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="ora-mini-btn">Walk-In</button>
          <button type="button" className="ora-mini-btn">Group Block</button>
          <button type="button" className="ora-btn ora-btn-primary h-7 text-[11.5px]">+ New Reservation</button>
        </div>
      </div>

      {/* Toolbar: filters + search */}
      <div className="ora-toolbar">
        <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} count={enriched.length} />
        <FilterChip label="Arrivals" active={filter === "arrivals"} onClick={() => setFilter("arrivals")} />
        <FilterChip label="In-House" active={filter === "inhouse"} onClick={() => setFilter("inhouse")} />
        <FilterChip label="Departures" active={filter === "departures"} onClick={() => setFilter("departures")} />
        <FilterChip label="Day Use" active={filter === "dayuse"} onClick={() => setFilter("dayuse")} />
        <FilterChip label="VIPs" active={filter === "vips"} onClick={() => setFilter("vips")} />
        <span className="sep" />
        <div className="ora-search">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ora-muted-2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search confirmation, name, room, market..."
          />
        </div>
        <button type="button" className="ora-mini-btn ml-1">
          Date: Today
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" aria-hidden><path d="M5 7L1 3h8L5 7z" /></svg>
        </button>
        <span className="flex-1" />
        <span className="text-[11px] text-ora-muted tabular-nums">{sorted.length} results</span>
      </div>

      {/* Bulk-action toolbar */}
      {selectedCount > 0 && (
        <div className="ora-toolbar bg-ora-red-soft border-b border-ora-red/30">
          <span className="text-[11.5px] font-semibold text-ora-red-deep">
            {selectedCount} selected
          </span>
          <span className="sep" />
          <button type="button" className="ora-mini-btn">Check In</button>
          <button type="button" className="ora-mini-btn">Assign Room</button>
          <button type="button" className="ora-mini-btn">Add Note</button>
          <button type="button" className="ora-mini-btn">Block</button>
          <button type="button" className="ora-mini-btn">Export</button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setSelected({})}
            className="text-[11px] text-ora-red hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Data table */}
      <div className="flex-1 min-h-0 overflow-auto scroll-rw">
        <table className="ora-table">
          <thead>
            <tr>
              <th style={{ width: 28, paddingLeft: 12, paddingRight: 4 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="cursor-pointer"
                />
              </th>
              <SortTh label="Confirmation #" c="conf" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Guest" c="name" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Room" c="room" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Status" c="status" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Check-in" c="ci" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Check-out" c="co" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Rate Code" c="rate" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Market" c="market" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Tier" c="tier" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Ad" c="adults" col={col} dir={dir} onClick={toggle} className="right" />
              <SortTh label="Ch" c="children" col={col} dir={dir} onClick={toggle} className="right" />
              <SortTh label="Past Stays" c="stays" col={col} dir={dir} onClick={toggle} className="right" />
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const g = r.guest;
              const conf = confirmationNumber(g.id);
              const isChecked = !!selected[g.id];
              return (
                <tr
                  key={g.id}
                  className={
                    (r.status.cancelled ? "is-cancelled " : "") +
                    (isChecked ? "selected" : "")
                  }
                  onClick={() => onRowClick(g.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td
                    style={{ paddingLeft: 12, paddingRight: 4 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        setSelected((s) => ({ ...s, [g.id]: !s[g.id] }))
                      }
                      className="cursor-pointer"
                      aria-label={`Select ${g.name}`}
                    />
                  </td>
                  <td className="mono">{conf}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      {r.vip && <span title="VIP" style={{ color: "var(--ora-amber)" }}>★</span>}
                      {r.walkin && (
                        <span
                          className="ora-chip ora-chip-grey"
                          style={{ height: 14, padding: "0 4px", fontSize: 9 }}
                          title="Walk-In"
                        >
                          WI
                        </span>
                      )}
                      <span className="font-semibold">{g.name}</span>
                    </span>
                  </td>
                  <td className="mono">{g.room ?? "—"}</td>
                  <td>
                    <span className={`ora-chip ${r.status.chip}`}>{r.status.key}</span>
                  </td>
                  <td className="mono">{g.booking_dates.check_in}</td>
                  <td className="mono">{g.booking_dates.check_out}</td>
                  <td className="mono">{r.rate}</td>
                  <td className="mono">{r.market}</td>
                  <td>
                    <span className={`ora-chip ${TIER_CHIP[g.vip_tier]}`}>
                      {g.vip_tier.toUpperCase()}
                    </span>
                  </td>
                  <td className="right mono">{r.adults}</td>
                  <td className="right mono">{r.children > 0 ? r.children : "—"}</td>
                  <td className="right mono">{g.past_stays}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ora-row-actions"
                      aria-label="Row actions"
                      title="More actions"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                        <circle cx="3" cy="8" r="1.4" />
                        <circle cx="8" cy="8" r="1.4" />
                        <circle cx="13" cy="8" r="1.4" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={14}
                  style={{ textAlign: "center", padding: "32px 12px", color: "var(--ora-muted)" }}
                >
                  No reservations match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ora-detail-footer">
        <span>
          Showing <span className="font-mono text-ora-charcoal">{sorted.length}</span> of{" "}
          <span className="font-mono text-ora-charcoal">{totalCount}</span> reservations
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-ora-green" />
          <span className="uppercase tracking-wider">PMS Sync OK · {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
        </span>
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */
function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : "false"}
      className="ora-mini-btn"
    >
      {label}
      {typeof count === "number" && (
        <span
          className="ml-1 inline-flex items-center justify-center min-w-[16px] h-[14px] px-1 rounded-sm text-[9.5px] font-bold tabular-nums"
          style={{
            background: active ? "rgba(255,255,255,0.6)" : "var(--ora-bg)",
            color: "inherit",
            border: "1px solid var(--ora-hairline)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function SortTh({
  label,
  c,
  col,
  dir,
  onClick,
  className,
}: {
  label: string;
  c: Col;
  col: Col;
  dir: SortDir;
  onClick: (c: Col) => void;
  className?: string;
}) {
  const active = c === col;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onClick(c)}
        className={"ora-sort " + (active ? "active" : "")}
      >
        <span>{label}</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 10 10"
          fill="currentColor"
          aria-hidden
          className={"caret " + (active && dir === "desc" ? "rotate-180" : "")}
        >
          <path d="M5 2l3 5H2l3-5z" />
        </svg>
      </button>
    </th>
  );
}
