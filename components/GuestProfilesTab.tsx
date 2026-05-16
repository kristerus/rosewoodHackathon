"use client";

import React, { useMemo, useState } from "react";
import type { Guest } from "@/lib/types";
import { useAppStore } from "@/lib/store";

interface GuestProfilesTabProps {
  onRowClick: (id: string) => void;
}

type SortDir = "asc" | "desc";
type Col =
  | "pid"
  | "last"
  | "first"
  | "tier"
  | "loyalty"
  | "email"
  | "phone"
  | "vip"
  | "stays"
  | "ltv"
  | "lastStay";

type FilterKey = "all" | "vip" | "repeat" | "local" | "intl" | "group";

const TIER_CHIP: Record<Guest["vip_tier"], string> = {
  standard: "ora-chip-grey",
  gold: "ora-chip-amber",
  platinum: "ora-chip-blue",
  legacy: "ora-chip-red",
};

const TIER_RANK: Record<Guest["vip_tier"], number> = {
  standard: 0,
  gold: 1,
  platinum: 2,
  legacy: 3,
};

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}

function profileNumber(id: string): string {
  return `P-${(hashId(id) % 1_000_000).toString().padStart(6, "0")}`;
}

function loyaltyNumber(id: string): string {
  const n = hashId(id + "loyalty");
  return `RW${(n % 90000000 + 10000000).toString()}`;
}

function splitName(full: string): { first: string; last: string } {
  const cleaned = full.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, "");
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return {
    first: parts.slice(0, -1).join(" "),
    last: parts[parts.length - 1],
  };
}

function emailFor(full: string, id: string): string {
  const { first, last } = splitName(full);
  const base = `${first[0] ?? "x"}.${last || "guest"}`.toLowerCase().replace(/[^a-z0-9.]/g, "");
  const domains = ["acme-corp.com", "kestrelgroup.io", "gmail.com", "stanfordalumni.org", "lvmh.com"];
  const d = domains[hashId(id) % domains.length];
  return `${base}@${d}`;
}

function phoneFor(id: string): string {
  const n = hashId(id);
  const area = 200 + (n % 800);
  const mid = 200 + ((n >> 4) % 800);
  const last = (n % 9000 + 1000).toString().padStart(4, "0");
  return `+1 ${area}-${mid}-${last}`;
}

function lifetimeSpend(g: Guest): number {
  const base = g.past_stays * (g.vip_tier === "legacy" ? 12000 : g.vip_tier === "platinum" ? 8500 : g.vip_tier === "gold" ? 5200 : 2400);
  return base + (hashId(g.id) % 4000);
}

function lastStayDate(g: Guest): string {
  // Subtract a deterministic 30-300 days from check-in
  const d = new Date(g.booking_dates.check_in);
  d.setUTCDate(d.getUTCDate() - (30 + (hashId(g.id) % 270)));
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function compareStr(a: string, b: string, dir: SortDir): number {
  const r = a.localeCompare(b);
  return dir === "asc" ? r : -r;
}
function compareNum(a: number, b: number, dir: SortDir): number {
  return dir === "asc" ? a - b : b - a;
}

export default function GuestProfilesTab({ onRowClick }: GuestProfilesTabProps) {
  const guests = useAppStore((s) => s.guests);

  const [col, setCol] = useState<Col>("last");
  const [dir, setDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const toggle = (c: Col) => {
    if (c === col) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setCol(c);
      setDir("asc");
    }
  };

  const enriched = useMemo(() => {
    return guests.map((g) => {
      const names = splitName(g.name);
      return {
        guest: g,
        first: names.first,
        last: names.last || names.first,
        email: emailFor(g.name, g.id),
        phone: phoneFor(g.id),
        loyalty: loyaltyNumber(g.id),
        ltv: lifetimeSpend(g),
        last: lastStayDate(g),
        vip: g.vip_tier === "platinum" || g.vip_tier === "legacy",
        repeat: g.past_stays >= 3,
        intl: hashId(g.id) % 4 === 0,
        group: hashId(g.id) % 7 === 0,
      };
    });
  }, [guests]);

  const filtered = useMemo(() => {
    let arr = enriched;
    if (filter === "vip") arr = arr.filter((r) => r.vip);
    else if (filter === "repeat") arr = arr.filter((r) => r.repeat);
    else if (filter === "local") arr = arr.filter((r) => !r.intl);
    else if (filter === "intl") arr = arr.filter((r) => r.intl);
    else if (filter === "group") arr = arr.filter((r) => r.group);

    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (r) =>
          r.guest.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.guest.room ?? "").toLowerCase().includes(q) ||
          profileNumber(r.guest.id).toLowerCase().includes(q),
      );
    }
    return arr;
  }, [enriched, filter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (col) {
        case "pid":
          return compareStr(profileNumber(a.guest.id), profileNumber(b.guest.id), dir);
        case "last":
          return compareStr(a.last, b.last, dir);
        case "first":
          return compareStr(a.first, b.first, dir);
        case "tier":
          return compareNum(TIER_RANK[a.guest.vip_tier], TIER_RANK[b.guest.vip_tier], dir);
        case "loyalty":
          return compareStr(a.loyalty, b.loyalty, dir);
        case "email":
          return compareStr(a.email, b.email, dir);
        case "phone":
          return compareStr(a.phone, b.phone, dir);
        case "vip":
          return compareNum(a.vip ? 1 : 0, b.vip ? 1 : 0, dir);
        case "stays":
          return compareNum(a.guest.past_stays, b.guest.past_stays, dir);
        case "ltv":
          return compareNum(a.ltv, b.ltv, dir);
        case "lastStay":
          return compareStr(a.last, b.last, dir);
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, col, dir]);

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="ora-page-head flex items-center justify-between">
        <div>
          <h2>Guest Profiles</h2>
          <div className="sub">
            {enriched.length} profile{enriched.length === 1 ? "" : "s"} · Click a row to focus and jump to Service Requests
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="ora-mini-btn">Export</button>
          <button type="button" className="ora-mini-btn">Import</button>
          <button type="button" className="ora-mini-btn">Merge Duplicates</button>
          <button type="button" className="ora-btn ora-btn-primary h-7 text-[11.5px]">+ New Profile</button>
        </div>
      </div>

      <div className="ora-toolbar">
        <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} count={enriched.length} />
        <FilterChip label="VIP" active={filter === "vip"} onClick={() => setFilter("vip")} />
        <FilterChip label="Repeat" active={filter === "repeat"} onClick={() => setFilter("repeat")} />
        <FilterChip label="Local" active={filter === "local"} onClick={() => setFilter("local")} />
        <FilterChip label="International" active={filter === "intl"} onClick={() => setFilter("intl")} />
        <FilterChip label="Group" active={filter === "group"} onClick={() => setFilter("group")} />
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
            placeholder="Search by name, email, profile #, room..."
          />
        </div>
        <span className="flex-1" />
        <span className="text-[11px] text-ora-muted tabular-nums">{sorted.length} results</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scroll-rw">
        <table className="ora-table">
          <thead>
            <tr>
              <SortTh label="Profile #" c="pid" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Last Name" c="last" col={col} dir={dir} onClick={toggle} />
              <SortTh label="First Name" c="first" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Tier" c="tier" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Loyalty #" c="loyalty" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Email" c="email" col={col} dir={dir} onClick={toggle} />
              <SortTh label="Phone" c="phone" col={col} dir={dir} onClick={toggle} />
              <SortTh label="VIP" c="vip" col={col} dir={dir} onClick={toggle} className="center" />
              <SortTh label="Past Stays" c="stays" col={col} dir={dir} onClick={toggle} className="right" />
              <SortTh label="Lifetime Spend" c="ltv" col={col} dir={dir} onClick={toggle} className="right" />
              <SortTh label="Last Stay" c="lastStay" col={col} dir={dir} onClick={toggle} />
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const g = r.guest;
              return (
                <tr key={g.id} onClick={() => onRowClick(g.id)} style={{ cursor: "pointer" }}>
                  <td className="mono">{profileNumber(g.id)}</td>
                  <td className="font-semibold">{r.last}</td>
                  <td>{r.first}</td>
                  <td>
                    <span className={`ora-chip ${TIER_CHIP[g.vip_tier]}`}>
                      {g.vip_tier.toUpperCase()}
                    </span>
                  </td>
                  <td className="mono text-ora-muted">{r.loyalty}</td>
                  <td className="text-ora-blue truncate" style={{ maxWidth: 240 }}>
                    {r.email}
                  </td>
                  <td className="mono text-ora-muted">{r.phone}</td>
                  <td style={{ textAlign: "center" }}>
                    {r.vip ? (
                      <span style={{ color: "var(--ora-amber)", fontSize: 13 }}>★</span>
                    ) : (
                      <span className="text-ora-muted-2">—</span>
                    )}
                  </td>
                  <td className="right mono">{g.past_stays}</td>
                  <td className="right mono">{fmtMoney(r.ltv)}</td>
                  <td className="mono">{r.last}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ora-row-actions"
                      aria-label="Row actions"
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
                  colSpan={12}
                  style={{ textAlign: "center", padding: "32px 12px", color: "var(--ora-muted)" }}
                >
                  No profiles match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ora-detail-footer">
        <span>
          Showing <span className="font-mono text-ora-charcoal">{sorted.length}</span> of{" "}
          <span className="font-mono text-ora-charcoal">{enriched.length}</span> profiles
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-ora-green" />
          <span className="uppercase tracking-wider">Profile DB · Synced</span>
        </span>
      </div>
    </div>
  );
}

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
