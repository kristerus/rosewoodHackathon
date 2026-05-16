"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useBadgesStore,
  type Badge,
  type BadgeDepartment,
} from "@/lib/badges-store";
import type { Ticket } from "@/lib/types";

/* ============================================================================
 * Helpers
 * ========================================================================== */

function relativeTime(iso: string, nowMs: number): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, nowMs - then);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function deptLabel(d: BadgeDepartment): string {
  switch (d) {
    case "concierge":
      return "Concierge";
    case "housekeeping":
      return "Housekeeping";
    case "fnb":
      return "F&B";
    case "maintenance":
      return "Engineering";
    case "frontdesk":
      return "Front Desk";
    case "unassigned":
      return "Spare";
    default:
      return d;
  }
}

function batteryColor(pct: number): string {
  if (pct < 20) return "#dc2626"; // red
  if (pct < 50) return "var(--ora-amber)";
  return "var(--ora-green)";
}

/* ============================================================================
 * Hook — ping the badge whose staff_id matches the latest ticket
 * ========================================================================== */

const LIVE_WINDOW_MS = 30_000;

export function useBadgePingOnTicket(tickets: Ticket[]): void {
  const pingBadgeByStaffId = useBadgesStore((s) => s.pingBadgeByStaffId);
  const lastSeenTicketId = useRef<string | null>(null);

  useEffect(() => {
    if (!tickets || tickets.length === 0) return;
    // The store puts newest first (see addTicket); guard both orderings by
    // picking the latest by timestamp.
    const latest = tickets.reduce<Ticket | null>((acc, t) => {
      if (!acc) return t;
      return new Date(t.timestamp).getTime() > new Date(acc.timestamp).getTime()
        ? t
        : acc;
    }, null);
    if (!latest) return;
    if (latest.id === lastSeenTicketId.current) return;
    lastSeenTicketId.current = latest.id;
    if (latest.staff_id) {
      pingBadgeByStaffId(latest.staff_id);
    }
  }, [tickets, pingBadgeByStaffId]);
}

/* ============================================================================
 * Sub-components
 * ========================================================================== */

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center justify-center font-semibold"
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "var(--ora-blue-soft)",
        color: "var(--ora-blue)",
        fontSize: 9,
        letterSpacing: "0.04em",
        border: "1px solid #c7dcf2",
      }}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}

function BatteryBar({ pct, charging }: { pct: number; charging: boolean }) {
  const color = batteryColor(pct);
  return (
    <span className="inline-flex items-center gap-1.5" style={{ whiteSpace: "nowrap" }}>
      <span
        style={{
          width: 50,
          height: 12,
          border: "1px solid var(--ora-hairline-2)",
          borderRadius: 1,
          position: "relative",
          background: "#fff",
          display: "inline-block",
        }}
        aria-label={`Battery ${pct}%`}
      >
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${pct}%`,
            background: color,
            transition: "width 240ms ease",
          }}
        />
      </span>
      <span
        className="mono"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          color: "var(--ora-charcoal)",
          fontVariantNumeric: "tabular-nums",
          minWidth: 32,
        }}
      >
        {pct}%
        {charging ? (
          <span title="Charging" style={{ marginLeft: 2 }}>
            ⚡
          </span>
        ) : null}
      </span>
    </span>
  );
}

interface StatusCellProps {
  online: boolean;
  isLive: boolean;
}
function StatusCell({ online, isLive }: StatusCellProps) {
  if (isLive) {
    return (
      <span
        className="ora-chip"
        style={{
          background: "var(--ora-red-soft)",
          color: "var(--ora-red-deep)",
          borderColor: "#f6cdc7",
        }}
      >
        <span
          className="pulse-dot"
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--ora-red)",
          }}
        />
        LIVE
      </span>
    );
  }
  if (online) {
    return <span className="ora-chip ora-chip-green">ONLINE</span>;
  }
  return (
    <span
      className="ora-chip"
      style={{
        background: "#fef2f2",
        color: "#991b1b",
        borderColor: "#fecaca",
      }}
    >
      OFFLINE
    </span>
  );
}

/* ============================================================================
 * Main panel
 * ========================================================================== */

type Filter = "all" | "online" | "offline" | "low" | "unassigned";

interface BadgesPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function BadgesPanel({ open, onClose }: BadgesPanelProps) {
  const badges = useBadgesStore((s) => s.badges);
  // Pick stats as primitives so Zustand can shallow-compare numbers
  // (returning a fresh object from a selector triggers an infinite loop).
  const total = useBadgesStore((s) => s.badges.length);
  const online = useBadgesStore((s) => s.badges.filter((b) => b.online).length);
  const lowBattery = useBadgesStore(
    (s) => s.badges.filter((b) => b.battery_pct < 20).length,
  );
  const avgBattery = useBadgesStore((s) =>
    s.badges.length === 0
      ? 0
      : Math.round(
          s.badges.reduce((sum, b) => sum + b.battery_pct, 0) / s.badges.length,
        ),
  );
  const stats = { total, online, offline: total - online, lowBattery, avgBattery };
  const [filter, setFilter] = useState<Filter>("all");

  // Force re-render every 5s so relative timestamps stay fresh.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(id);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const nowMs = Date.now();
  // Use tick to force-memo-bust the relative time strings
  void tick;

  const filtered = useMemo<Badge[]>(() => {
    switch (filter) {
      case "online":
        return badges.filter((b) => b.online);
      case "offline":
        return badges.filter((b) => !b.online);
      case "low":
        return badges.filter((b) => b.battery_pct < 25);
      case "unassigned":
        return badges.filter((b) => b.department === "unassigned");
      case "all":
      default:
        return badges;
    }
  }, [badges, filter]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(31, 29, 27, 0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 48,
        paddingBottom: 48,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ora-card slide-in"
        style={{
          width: "min(960px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 96px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          className="ora-page-head"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h2>Connected Badges · Fleet</h2>
            <div className="sub">
              {stats.total} devices · {stats.online} online · avg battery {stats.avgBattery}%
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ora-mini-btn"
            aria-label="Close"
            title="Close (Esc)"
          >
            ✕ Close
          </button>
        </div>

        {/* Toolbar */}
        <div className="ora-toolbar" style={{ flexWrap: "wrap" }}>
          <FilterChip current={filter} value="all" onSelect={setFilter}>
            All ({stats.total})
          </FilterChip>
          <FilterChip current={filter} value="online" onSelect={setFilter}>
            Online ({stats.online})
          </FilterChip>
          <FilterChip current={filter} value="offline" onSelect={setFilter}>
            Offline ({stats.offline})
          </FilterChip>
          <FilterChip current={filter} value="low" onSelect={setFilter}>
            Low Battery &lt;25% ({badges.filter((b) => b.battery_pct < 25).length})
          </FilterChip>
          <FilterChip current={filter} value="unassigned" onSelect={setFilter}>
            Unassigned ({badges.filter((b) => b.department === "unassigned").length})
          </FilterChip>
          <span className="sep" />
          <button type="button" className="ora-mini-btn" disabled title="Mock — not wired">
            + Provision New Badge
          </button>
        </div>

        {/* Table */}
        <div
          className="scroll-rw"
          style={{ overflow: "auto", flex: 1, minHeight: 0, background: "#fff" }}
        >
          <table className="ora-table">
            <thead>
              <tr>
                <th>Badge ID</th>
                <th>Serial #</th>
                <th>Assigned To</th>
                <th>Department</th>
                <th>Status</th>
                <th>Battery</th>
                <th>Last Seen</th>
                <th>Firmware</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const lastMs = new Date(b.last_seen).getTime();
                const isLive = b.online && nowMs - lastMs < LIVE_WINDOW_MS;
                return (
                  <tr key={b.id} style={isLive ? { background: "var(--ora-red-soft)" } : undefined}>
                    <td className="mono">{b.id}</td>
                    <td className="mono" style={{ color: "var(--ora-muted)" }}>
                      {b.serial}
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Avatar name={b.assigned_to} />
                        {b.assigned_to}
                      </span>
                    </td>
                    <td style={{ color: "var(--ora-muted)" }}>{deptLabel(b.department)}</td>
                    <td>
                      <StatusCell online={b.online} isLive={isLive} />
                    </td>
                    <td>
                      <BatteryBar pct={b.battery_pct} charging={b.is_charging} />
                    </td>
                    <td style={{ color: "var(--ora-muted)" }}>
                      {relativeTime(b.last_seen, nowMs)}
                    </td>
                    <td className="mono" style={{ color: "var(--ora-muted)" }}>
                      {b.firmware}
                    </td>
                    <td className="right">
                      <button
                        type="button"
                        className="ora-row-actions"
                        title="Locate · Restart · Reassign · Deprovision"
                        style={{ visibility: "visible" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⋯
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="wrap"
                    style={{
                      textAlign: "center",
                      color: "var(--ora-muted)",
                      padding: "18px 12px",
                      fontStyle: "italic",
                    }}
                  >
                    No badges match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Low battery alert */}
        {stats.lowBattery > 0 ? (
          <div
            style={{
              padding: "6px 12px",
              fontSize: 11,
              color: "var(--ora-amber)",
              background: "var(--ora-amber-soft)",
              borderTop: "1px solid #fde68a",
            }}
          >
            ⚠ {stats.lowBattery} badge{stats.lowBattery === 1 ? "" : "s"} below 20% — schedule charge swap
          </div>
        ) : null}

        <div className="ora-detail-footer">
          <span>RW Badge Fleet · synced via SSE</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  current,
  value,
  onSelect,
  children,
}: {
  current: Filter;
  value: Filter;
  onSelect: (v: Filter) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      className="ora-mini-btn"
      data-active={active}
      onClick={() => onSelect(value)}
    >
      {children}
    </button>
  );
}
