"use client";

import React, { useMemo, useState } from "react";
import type { Department, Guest, Ticket } from "@/lib/types";
import { useAppStore } from "@/lib/store";

type ActivityType =
  | "SR"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "NOTE"
  | "CHARGE"
  | "ADJUSTMENT"
  | "FOLIO_PRINT";

const TYPE_META: Record<ActivityType, { label: string; color: string; chip: string }> = {
  SR: { label: "Service Request", color: "var(--ora-red)", chip: "ora-chip-red" },
  CHECK_IN: { label: "Check-In", color: "var(--ora-green)", chip: "ora-chip-green" },
  CHECK_OUT: { label: "Check-Out", color: "#374151", chip: "ora-chip-grey" },
  NOTE: { label: "Note", color: "var(--ora-blue)", chip: "ora-chip-blue" },
  CHARGE: { label: "Charge", color: "var(--ora-amber)", chip: "ora-chip-amber" },
  ADJUSTMENT: { label: "Adjustment", color: "#9333EA", chip: "ora-chip-grey" },
  FOLIO_PRINT: { label: "Folio Print", color: "#374151", chip: "ora-chip-grey" },
};

const DEPT_LABEL: Record<Department, string> = {
  concierge: "Concierge",
  housekeeping: "Housekeeping",
  fnb: "Food & Beverage",
  maintenance: "Engineering",
  frontdesk: "Front Desk",
};

const ALL_DEPTS: Department[] = ["concierge", "housekeeping", "fnb", "maintenance", "frontdesk"];
const ALL_TYPES: ActivityType[] = ["SR", "CHECK_IN", "CHECK_OUT", "NOTE", "CHARGE", "ADJUSTMENT", "FOLIO_PRINT"];

const PERFORMED_BY = ["K. Petrushevski", "M. Ortega", "J. Lee", "S. Doyle", "P. Schmid", "AUTO·PMS", "AUTO·OHIP"];

function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 33 + id.charCodeAt(i)) >>> 0;
  return n;
}

interface Activity {
  id: string;
  timestamp: string;
  type: ActivityType;
  guestName: string | null;
  room: string | null;
  department: Department;
  status: string;
  statusChip: string;
  subject: string;
  performedBy: string;
}

function activitiesFromTickets(tickets: Ticket[]): Activity[] {
  return tickets.map((t) => {
    const status = t.status ?? "open";
    const chip =
      status === "resolved"
        ? "ora-chip-green"
        : status === "escalated"
          ? "ora-chip-red"
          : status === "in-progress"
            ? "ora-chip-blue"
            : "ora-chip-amber";
    return {
      id: t.id,
      timestamp: t.timestamp,
      type: "SR" as ActivityType,
      guestName: t.guest_name,
      room: t.room_number,
      department: t.department,
      status: status.toUpperCase().replace("-", " "),
      statusChip: chip,
      subject: t.intent,
      performedBy: t.staff_id,
    };
  });
}

function syntheticActivitiesFromGuests(guests: Guest[]): Activity[] {
  // Generate a handful of deterministic activities per guest to fill the timeline
  const out: Activity[] = [];
  for (const g of guests) {
    const h = hashId(g.id);
    const baseDate = new Date(g.booking_dates.check_in);

    // Check-In
    out.push({
      id: `${g.id}-CI`,
      timestamp: new Date(baseDate.getTime() + (h % 12) * 60 * 60 * 1000).toISOString(),
      type: "CHECK_IN",
      guestName: g.name,
      room: g.room,
      department: "frontdesk",
      status: "COMPLETED",
      statusChip: "ora-chip-green",
      subject: `Checked in to room ${g.room ?? "—"}`,
      performedBy: PERFORMED_BY[h % PERFORMED_BY.length],
    });

    // Folio Print (sometimes)
    if (h % 3 === 0) {
      out.push({
        id: `${g.id}-FP`,
        timestamp: new Date(baseDate.getTime() + 26 * 60 * 60 * 1000).toISOString(),
        type: "FOLIO_PRINT",
        guestName: g.name,
        room: g.room,
        department: "frontdesk",
        status: "POSTED",
        statusChip: "ora-chip-grey",
        subject: "Interim folio printed at concierge desk",
        performedBy: PERFORMED_BY[(h + 1) % PERFORMED_BY.length],
      });
    }

    // Charge (always)
    out.push({
      id: `${g.id}-CHG`,
      timestamp: new Date(baseDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
      type: "CHARGE",
      guestName: g.name,
      room: g.room,
      department: "fnb",
      status: "POSTED",
      statusChip: "ora-chip-amber",
      subject: "Room charge — F&B Outlet Lobby Bar",
      performedBy: PERFORMED_BY[(h + 2) % PERFORMED_BY.length],
    });

    // Note (sometimes)
    if (h % 4 === 0) {
      out.push({
        id: `${g.id}-NT`,
        timestamp: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        type: "NOTE",
        guestName: g.name,
        room: g.room,
        department: "concierge",
        status: "ACTIVE",
        statusChip: "ora-chip-blue",
        subject: "Profile note added — preferred quiet floor",
        performedBy: PERFORMED_BY[(h + 3) % PERFORMED_BY.length],
      });
    }
  }
  return out;
}

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ActivitiesTab() {
  const tickets = useAppStore((s) => s.tickets);
  const guests = useAppStore((s) => s.guests);

  const [enabledTypes, setEnabledTypes] = useState<Record<ActivityType, boolean>>({
    SR: true,
    CHECK_IN: true,
    CHECK_OUT: true,
    NOTE: true,
    CHARGE: true,
    ADJUSTMENT: true,
    FOLIO_PRINT: true,
  });
  const [enabledDepts, setEnabledDepts] = useState<Record<Department, boolean>>({
    concierge: true,
    housekeeping: true,
    fnb: true,
    maintenance: true,
    frontdesk: true,
  });
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "all">("all");

  const activities = useMemo<Activity[]>(() => {
    const fromTickets = activitiesFromTickets(tickets);
    const synth = syntheticActivitiesFromGuests(guests);
    return [...fromTickets, ...synth];
  }, [tickets, guests]);

  const filtered = useMemo(() => {
    return activities
      .filter((a) => enabledTypes[a.type])
      .filter((a) => enabledDepts[a.department])
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [activities, enabledTypes, enabledDepts]);

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="ora-page-head flex items-center justify-between">
        <div>
          <h2>Activities</h2>
          <div className="sub">
            All property activity · {activities.length} event{activities.length === 1 ? "" : "s"} logged today
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="ora-mini-btn">Export CSV</button>
          <button type="button" className="ora-mini-btn">Audit Trail</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left filter rail */}
        <aside className="w-[220px] shrink-0 border-r border-ora-hairline bg-ora-bg overflow-y-auto scroll-rw">
          <FilterGroup title="Date Range">
            <div className="space-y-1">
              {(
                [
                  ["today", "Today"],
                  ["7d", "Last 7 days"],
                  ["30d", "Last 30 days"],
                  ["all", "All time"],
                ] as const
              ).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer text-[11.5px] text-ora-charcoal">
                  <input
                    type="radio"
                    checked={dateRange === k}
                    onChange={() => setDateRange(k)}
                    className="cursor-pointer"
                  />
                  {lbl}
                </label>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Activity Types">
            <div className="space-y-1">
              {ALL_TYPES.map((t) => {
                const meta = TYPE_META[t];
                return (
                  <label
                    key={t}
                    className="flex items-center gap-2 cursor-pointer text-[11.5px] text-ora-charcoal"
                  >
                    <input
                      type="checkbox"
                      checked={enabledTypes[t]}
                      onChange={() =>
                        setEnabledTypes((s) => ({ ...s, [t]: !s[t] }))
                      }
                      className="cursor-pointer"
                    />
                    <span className="ora-sev-dot" style={{ background: meta.color }} />
                    <span>{meta.label}</span>
                  </label>
                );
              })}
            </div>
          </FilterGroup>

          <FilterGroup title="Department">
            <div className="space-y-1">
              {ALL_DEPTS.map((d) => (
                <label
                  key={d}
                  className="flex items-center gap-2 cursor-pointer text-[11.5px] text-ora-charcoal"
                >
                  <input
                    type="checkbox"
                    checked={enabledDepts[d]}
                    onChange={() => setEnabledDepts((s) => ({ ...s, [d]: !s[d] }))}
                    className="cursor-pointer"
                  />
                  {DEPT_LABEL[d]}
                </label>
              ))}
            </div>
          </FilterGroup>

          <div className="px-3 py-3 border-t border-ora-hairline">
            <button
              type="button"
              onClick={() => {
                const all = ALL_TYPES.reduce((a, t) => ({ ...a, [t]: true }), {} as Record<ActivityType, boolean>);
                const allD = ALL_DEPTS.reduce((a, d) => ({ ...a, [d]: true }), {} as Record<Department, boolean>);
                setEnabledTypes(all);
                setEnabledDepts(allD);
              }}
              className="text-[10.5px] uppercase tracking-wider text-ora-red hover:text-ora-red-deep font-semibold"
            >
              Reset filters
            </button>
          </div>
        </aside>

        {/* Activity table */}
        <div className="flex-1 min-w-0 overflow-auto scroll-rw bg-white">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-[12.5px] text-ora-muted">
              No activities match the current filters.
            </div>
          ) : (
            <table className="ora-table">
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Time</th>
                  <th style={{ width: 140 }}>Activity Type</th>
                  <th>Subject</th>
                  <th style={{ width: 150 }}>Guest</th>
                  <th style={{ width: 70 }}>Room</th>
                  <th style={{ width: 130 }}>Department</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 140 }}>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const meta = TYPE_META[a.type];
                  return (
                    <tr key={a.id}>
                      <td className="mono text-ora-muted">{formatTs(a.timestamp)}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="ora-sev-dot" style={{ background: meta.color }} />
                          <span className="text-[11.5px]">{meta.label}</span>
                        </span>
                      </td>
                      <td className="wrap">{a.subject}</td>
                      <td>{a.guestName ?? <span className="text-ora-muted-2">—</span>}</td>
                      <td className="mono">{a.room ?? "—"}</td>
                      <td>{DEPT_LABEL[a.department]}</td>
                      <td>
                        <span className={`ora-chip ${a.statusChip}`}>{a.status}</span>
                      </td>
                      <td className="mono text-ora-muted">{a.performedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="ora-detail-footer">
        <span>
          <span className="font-mono text-ora-charcoal">{filtered.length}</span> activities visible ·{" "}
          <span className="font-mono text-ora-charcoal">{activities.length}</span> total
        </span>
        <span className="uppercase tracking-wider">
          Activity feed · Live · Source: OHIP Audit Log
        </span>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-3 border-b border-ora-hairline">
      <div className="ora-label mb-2">{title}</div>
      {children}
    </div>
  );
}
