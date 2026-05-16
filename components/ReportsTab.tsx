"use client";

import React, { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";

type Category = "all" | "ops" | "fin" | "forecast" | "profile" | "custom";

interface ReportDef {
  name: string;
  code: string;
  category: Exclude<Category, "all">;
  description: string;
  lastRun: string;
  icon: "doc" | "money" | "chart" | "people" | "calendar" | "star";
  favorite?: boolean;
}

const REPORTS: ReportDef[] = [
  {
    name: "Arrivals / Departures",
    code: "RPT-1001",
    category: "ops",
    description: "Daily arrivals and departures with room assignments",
    lastRun: "Today, 08:12 AM",
    icon: "calendar",
    favorite: true,
  },
  {
    name: "Manager's Daily",
    code: "RPT-1002",
    category: "ops",
    description: "End-of-day operational summary for GM review",
    lastRun: "Yesterday, 11:55 PM",
    icon: "doc",
    favorite: true,
  },
  {
    name: "Trial Balance",
    code: "RPT-2001",
    category: "fin",
    description: "All folio postings against revenue & liability accounts",
    lastRun: "Today, 06:00 AM",
    icon: "money",
  },
  {
    name: "Source / Market Mix",
    code: "RPT-2002",
    category: "fin",
    description: "Revenue distribution by market segment and source",
    lastRun: "Yesterday, 11:55 PM",
    icon: "chart",
  },
  {
    name: "F&B Revenue",
    code: "RPT-2003",
    category: "fin",
    description: "Per-outlet revenue with covers and check averages",
    lastRun: "Today, 02:30 AM",
    icon: "money",
  },
  {
    name: "Forecast 30 Day",
    code: "RPT-3001",
    category: "forecast",
    description: "Occupancy and revenue forecast over rolling 30 days",
    lastRun: "Today, 04:00 AM",
    icon: "chart",
    favorite: true,
  },
  {
    name: "Pickup Report",
    code: "RPT-3002",
    category: "forecast",
    description: "Net change in reservations vs prior day",
    lastRun: "Today, 04:00 AM",
    icon: "chart",
  },
  {
    name: "Cancellation Report",
    code: "RPT-3003",
    category: "forecast",
    description: "All cancelled bookings with revenue impact",
    lastRun: "Yesterday, 11:55 PM",
    icon: "doc",
  },
  {
    name: "Guest Comments",
    code: "RPT-4001",
    category: "profile",
    description: "All guest-facing notes and comment-card entries",
    lastRun: "Today, 09:42 AM",
    icon: "people",
  },
  {
    name: "VIP In-House",
    code: "RPT-4002",
    category: "profile",
    description: "All VIP guests currently in-house with welcome status",
    lastRun: "Today, 07:00 AM",
    icon: "star",
    favorite: true,
  },
  {
    name: "Concierge AI Routing",
    code: "RPT-5001",
    category: "custom",
    description: "AI Concierge routing decisions, confidence, latency",
    lastRun: "Real-time",
    icon: "chart",
  },
  {
    name: "Pre-Arrival Brief Coverage",
    code: "RPT-5002",
    category: "custom",
    description: "% of arrivals with completed AI research brief",
    lastRun: "Today, 10:15 AM",
    icon: "doc",
  },
];

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ops", label: "Daily Operations" },
  { key: "fin", label: "Financial" },
  { key: "forecast", label: "Forecasting" },
  { key: "profile", label: "Guest Profile" },
  { key: "custom", label: "Custom" },
];

function ReportIcon({ kind }: { kind: ReportDef["icon"] }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.7,
    "aria-hidden": true,
  };
  switch (kind) {
    case "doc":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8M16 17H8M10 9H8" />
        </svg>
      );
    case "money":
      return (
        <svg {...common}>
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 4 5-5" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
        </svg>
      );
  }
}

export default function ReportsTab() {
  const tickets = useAppStore((s) => s.tickets);
  const total = tickets.length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const [category, setCategory] = useState<Category>("all");
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const r of REPORTS) if (r.favorite) m[r.code] = true;
    return m;
  });

  const filteredReports = useMemo(() => {
    if (category === "all") return REPORTS;
    return REPORTS.filter((r) => r.category === category);
  }, [category]);

  // Deterministic sparkline data
  const sparkData = useMemo(() => {
    const seed = total + 7;
    const out: number[] = [];
    for (let i = 0; i < 24; i++) {
      const v = Math.abs(Math.sin((i + seed) * 0.7) * 22) + 6 + ((i * 3 + seed) % 7);
      out.push(Math.round(v));
    }
    return out;
  }, [total]);

  return (
    <div className="h-full bg-white flex flex-col overflow-auto scroll-rw">
      <div className="ora-page-head">
        <h2>Reports</h2>
        <div className="sub">
          Property analytics, financial postings and AI Concierge performance
        </div>
      </div>

      {/* Category tabs */}
      <div className="ora-mini-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            data-active={category === c.key ? "true" : "false"}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" className="ora-mini-btn mr-2 my-1">
          + Schedule Report
        </button>
      </div>

      {/* KPI tiles */}
      <div className="px-4 pt-3">
        <div className="ora-label mb-1.5">AI Concierge — Today</div>
        <div className="grid grid-cols-4 gap-2">
          <KpiTile label="Service Requests" value={String(total)} delta={`+${Math.max(0, total - 2)}`} positive />
          <KpiTile label="Resolved Rate" value={`${rate}%`} delta={total > 0 ? "+4 pts" : "—"} positive />
          <KpiTile label="Avg Routing Time" value="1.4s" delta="-0.3s" positive note="via Anthropic" />
          <KpiTile label="Pre-Arrival Coverage" value="78%" delta="+12 pts" positive />
        </div>
      </div>

      {/* Sparkline card */}
      <div className="px-4 pt-3">
        <div className="ora-section">
          <div className="ora-section-head">
            <div className="flex items-center gap-2">
              <span className="ora-label">Hourly SR Volume — Last 24 Hours</span>
              <span className="ora-chip ora-chip-blue">LIVE</span>
            </div>
            <span className="font-mono text-[10.5px] text-ora-muted">Peak: 28 · {new Date().toLocaleDateString()}</span>
          </div>
          <div className="px-4 py-3">
            <Sparkline values={sparkData} />
            <div className="mt-1 flex items-center justify-between text-[10px] text-ora-muted-2 tabular-nums">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>Now</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report grid */}
      <div className="px-4 pt-3 pb-6">
        <div className="ora-label mb-2">Report Library ({filteredReports.length})</div>
        <div className="grid grid-cols-3 gap-2.5">
          {filteredReports.map((r) => {
            const fav = !!favorites[r.code];
            return (
              <div key={r.code} className="ora-report-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-sm shrink-0"
                      style={{
                        background: "var(--ora-red-soft)",
                        color: "var(--ora-red-deep)",
                      }}
                    >
                      <ReportIcon kind={r.icon} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-ora-charcoal truncate">
                        {r.name}
                      </div>
                      <div className="text-[10px] font-mono text-ora-muted-2 tabular-nums">
                        {r.code}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFavorites((s) => ({ ...s, [r.code]: !s[r.code] }))
                    }
                    className="shrink-0 h-6 w-6 flex items-center justify-center rounded-sm hover:bg-ora-row-hover"
                    aria-label="Favorite"
                    title="Favorite"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={fav ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ color: fav ? "var(--ora-amber)" : "var(--ora-muted-2)" }}
                      aria-hidden
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                    </svg>
                  </button>
                </div>
                <p className="text-[11px] text-ora-muted leading-relaxed">
                  {r.description}
                </p>
                <div className="flex items-center justify-between text-[10.5px] text-ora-muted-2 tabular-nums border-t border-ora-hairline pt-2 mt-1">
                  <span>Last run: <span className="text-ora-charcoal">{r.lastRun}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" className="ora-mini-btn flex-1 justify-center">
                    Run
                  </button>
                  <button type="button" className="ora-mini-btn">
                    Schedule
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  delta,
  positive,
  note,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  note?: string;
}) {
  return (
    <div className="ora-section px-3 py-2.5">
      <div className="ora-label">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-[20px] font-semibold tabular-nums text-ora-charcoal leading-none">
          {value}
        </span>
        {delta && (
          <span
            className="text-[10.5px] tabular-nums font-semibold"
            style={{
              color: positive ? "var(--ora-green)" : "var(--ora-red)",
            }}
          >
            {delta}
          </span>
        )}
      </div>
      {note && <div className="mt-1 text-[10px] text-ora-muted-2">{note}</div>}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 600;
  const h = 64;
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 6) - 3).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="block">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--ora-red)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--ora-red)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="url(#spark-fill)"
        stroke="none"
        points={`0,${h} ${pts} ${w},${h}`}
      />
      <polyline
        fill="none"
        stroke="var(--ora-red)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
      {values.map((v, i) => {
        if (i === values.length - 1) {
          const x = (i * step).toFixed(1);
          const y = (h - (v / max) * (h - 6) - 3).toFixed(1);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3}
              fill="var(--ora-red)"
              stroke="#fff"
              strokeWidth="1.5"
            />
          );
        }
        return null;
      })}
    </svg>
  );
}
