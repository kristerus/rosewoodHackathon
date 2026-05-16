"use client";

import React, { useEffect, useState } from "react";

/* ---------------- Sections ---------------- */
type SectionKey =
  | "property"
  | "rates"
  | "markets"
  | "departments"
  | "ai"
  | "users"
  | "integrations";

interface SectionDef {
  key: SectionKey;
  label: string;
  caption: string;
}

const SECTIONS: SectionDef[] = [
  { key: "property", label: "Property", caption: "Active property setup" },
  { key: "rates", label: "Rate Codes", caption: "Pricing & tier matrix" },
  { key: "markets", label: "Market Segments", caption: "Revenue tagging" },
  { key: "departments", label: "Departments & Routing", caption: "Auto-dispatch rules" },
  { key: "ai", label: "AI Concierge", caption: "Model + thresholds" },
  { key: "users", label: "Users & Roles", caption: "Staff & permissions" },
  { key: "integrations", label: "Integration Status", caption: "External systems" },
];

/* ---------------- Component ---------------- */
export default function SetupTab() {
  const [active, setActive] = useState<SectionKey>("property");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const fire = (msg: string) => setToastMsg(msg);

  const section = SECTIONS.find((s) => s.key === active)!;

  return (
    <div className="flex h-full w-full overflow-hidden bg-ora-bg">
      {/* Left nav */}
      <div className="w-[230px] shrink-0 border-r border-ora-hairline bg-white flex flex-col">
        <div className="px-3 py-2.5 border-b border-ora-hairline">
          <div className="ora-label">Setup &amp; Configuration</div>
          <div className="text-[11px] text-ora-muted mt-0.5 font-medium">
            Rosewood San Francisco
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scroll-rw py-1">
          {SECTIONS.map((s) => {
            const isActive = s.key === active;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                className={
                  "block w-full text-left px-3 py-1.5 border-l-2 transition-colors " +
                  (isActive
                    ? "border-l-ora-red bg-ora-row-selected"
                    : "border-l-transparent hover:bg-ora-row-hover")
                }
              >
                <div
                  className={
                    "text-[12px] " +
                    (isActive ? "font-bold text-ora-charcoal" : "font-medium text-ora-charcoal")
                  }
                >
                  {s.label}
                </div>
                <div className="text-[10.5px] text-ora-muted mt-0.5">{s.caption}</div>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-ora-hairline px-3 py-2 text-[10.5px] text-ora-muted">
          v 26.5.16 · build 4882
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0 overflow-y-auto scroll-rw flex flex-col">
        <div className="ora-page-head flex items-center justify-between">
          <div>
            <h2>{section.label}</h2>
            <div className="sub">{section.caption}</div>
          </div>
          <div className="flex items-center gap-2">
            {toastMsg && (
              <span className="fade-up text-[11.5px] text-ora-charcoal px-2 py-1 bg-white border border-ora-hairline rounded-sm">
                {toastMsg}
              </span>
            )}
            <span className="ora-chip ora-chip-grey">
              <span className="font-mono">SETUP/{section.key.toUpperCase()}</span>
            </span>
          </div>
        </div>

        <div className="p-3 space-y-3">
          {active === "property" && <PropertySection fire={fire} />}
          {active === "rates" && <RatesSection fire={fire} />}
          {active === "markets" && <MarketsSection />}
          {active === "departments" && <DepartmentsSection />}
          {active === "ai" && <AISection fire={fire} />}
          {active === "users" && <UsersSection />}
          {active === "integrations" && <IntegrationsSection fire={fire} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- 1. Property ---------------- */
function PropertySection({ fire }: { fire: (m: string) => void }) {
  return (
    <div className="ora-section">
      <div className="ora-section-head">
        <span className="ora-label">Active Property — Required fields marked *</span>
        <div className="flex items-center gap-1">
          <button className="ora-mini-btn" type="button" onClick={() => fire("Reverted")}>
            Cancel
          </button>
          <button
            className="ora-btn ora-btn-primary h-7 text-[11.5px]"
            type="button"
            onClick={() => fire("Property saved")}
          >
            Save
          </button>
        </div>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 gap-x-10 gap-y-1">
        <FormRowH label="Property Code *" value="ROSE-SFO" mono />
        <FormRowH label="Chain Code" value="RW-CORP" mono />
        <FormRowH label="Property Name *" value="Rosewood San Francisco" />
        <FormRowH label="Brand" value="Rosewood Hotels &amp; Resorts" />
        <FormRowH label="Street Address" value="550 Geary Street" />
        <FormRowH label="City *" value="San Francisco" />
        <FormRowH label="State / Province" value="CA" />
        <FormRowH label="Postal Code" value="94102" mono />
        <FormRowH label="Country *" value="United States" />
        <FormRowH label="Time Zone *" value="America/Los_Angeles (Pacific)" mono />
        <FormRowH label="Currency *" value="USD ($)" mono />
        <FormRowH label="Language *" value="English (en-US)" />
        <FormRowH label="Tax Set" value="CA-SF-OCCUPANCY-14" mono />
        <FormRowH label="Star Rating" value="5 ★" />
        <FormRowH label="Open Date" value="2009-08-15" mono />
        <FormRowH label="General Manager" value="Patrick Schmid" />
        <FormRowH label="Total Rooms *" value="153" mono />
        <FormRowH label="Total Suites" value="42" mono />
        <FormRowH label="PMS Cluster" value="OHIP-WEST-A" mono />
        <FormRowH label="Property Status" value={<span className="ora-chip ora-chip-green">OPEN · LIVE</span>} />
      </div>
      <div className="ora-detail-footer">
        <span>Last modified: 2026-05-14 09:12 by Patrick Schmid</span>
        <span className="font-mono">RECORD: PROP-001 · REV 47</span>
      </div>
    </div>
  );
}

function FormRowH({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-3 py-1 border-b border-ora-hairline">
      <span className="text-[11px] text-ora-muted text-right">{label}</span>
      <span
        className={
          "text-[12px] text-ora-charcoal " + (mono ? "font-mono tabular-nums" : "font-medium")
        }
      >
        {typeof value === "string" ? value : value}
      </span>
    </div>
  );
}

/* ---------------- 2. Rate Codes ---------------- */
interface RateRow {
  code: string;
  description: string;
  begin: string;
  end: string;
  market: string;
  tier1: number;
  tier2: number;
  strategy: string;
  discount: number;
  status: "ACTIVE" | "INACTIVE";
}
const RATE_ROWS: RateRow[] = [
  {
    code: "RW-CORP",
    description: "Corporate Negotiated",
    begin: "2026-01-01",
    end: "2026-12-31",
    market: "BUSINESS",
    tier1: 850,
    tier2: 720,
    strategy: "Fixed",
    discount: 0,
    status: "ACTIVE",
  },
  {
    code: "RW-LEISURE",
    description: "Leisure Standard",
    begin: "2026-01-01",
    end: "2026-12-31",
    market: "LEISURE",
    tier1: 1250,
    tier2: 1050,
    strategy: "BAR",
    discount: 0,
    status: "ACTIVE",
  },
  {
    code: "RW-CONS",
    description: "Consortium",
    begin: "2026-01-01",
    end: "2026-12-31",
    market: "BUSINESS",
    tier1: 980,
    tier2: 880,
    strategy: "Tiered",
    discount: 8,
    status: "ACTIVE",
  },
  {
    code: "RW-AAA",
    description: "AAA Discount",
    begin: "2026-03-01",
    end: "2026-08-31",
    market: "LEISURE",
    tier1: 1150,
    tier2: 980,
    strategy: "Tiered",
    discount: 10,
    status: "INACTIVE",
  },
  {
    code: "RW-SUITE",
    description: "Suite Upgrade",
    begin: "2026-01-01",
    end: "2026-12-31",
    market: "LEISURE",
    tier1: 2100,
    tier2: 1850,
    strategy: "Fixed",
    discount: 0,
    status: "ACTIVE",
  },
  {
    code: "RW-LEGACY",
    description: "Legacy Patron",
    begin: "2026-01-01",
    end: "2026-12-31",
    market: "LEISURE",
    tier1: 2400,
    tier2: 2150,
    strategy: "Negotiated",
    discount: 15,
    status: "ACTIVE",
  },
];
function RatesSection({ fire }: { fire: (m: string) => void }) {
  return (
    <div className="ora-section overflow-hidden">
      <div className="ora-section-head">
        <span className="ora-label">Rate Codes ({RATE_ROWS.length})</span>
        <div className="flex items-center gap-1">
          <button className="ora-mini-btn" type="button" onClick={() => fire("New Rate")}>
            + New Rate
          </button>
          <button
            className="ora-btn ora-btn-primary h-7 text-[11.5px]"
            type="button"
            onClick={() => fire("Saved")}
          >
            Save
          </button>
        </div>
      </div>
      <table className="ora-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Begin Date</th>
            <th>End Date</th>
            <th>Market</th>
            <th className="right">Tier 1 Rate</th>
            <th className="right">Tier 2 Rate</th>
            <th>Strategy</th>
            <th className="right">Discount %</th>
            <th>Status</th>
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {RATE_ROWS.map((r) => (
            <tr key={r.code}>
              <td className="mono font-semibold">{r.code}</td>
              <td>{r.description}</td>
              <td className="mono">{r.begin}</td>
              <td className="mono">{r.end}</td>
              <td className="mono">{r.market}</td>
              <td className="right mono">${r.tier1.toLocaleString("en-US")}.00</td>
              <td className="right mono text-ora-muted">${r.tier2.toLocaleString("en-US")}.00</td>
              <td>{r.strategy}</td>
              <td className="right mono">{r.discount > 0 ? `${r.discount}%` : "—"}</td>
              <td>
                <StatusPill ok={r.status === "ACTIVE"} label={r.status} />
              </td>
              <td>
                <button type="button" className="ora-row-actions" aria-label="Row actions">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                    <circle cx="3" cy="8" r="1.4" />
                    <circle cx="8" cy="8" r="1.4" />
                    <circle cx="13" cy="8" r="1.4" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 3. Market Segments ---------------- */
const MARKET_ROWS = [
  {
    code: "LEISURE",
    description: "Leisure Travel",
    group: "Retail",
    stats: "STATS-LEI",
    ytdRev: 14200000,
    ytdNights: 8420,
    adr: 1685,
  },
  {
    code: "BUSINESS",
    description: "Business Transient",
    group: "Corporate",
    stats: "STATS-BIZ",
    ytdRev: 9800000,
    ytdNights: 6240,
    adr: 1570,
  },
  {
    code: "GROUP",
    description: "Group Bookings",
    group: "Group",
    stats: "STATS-GRP",
    ytdRev: 6100000,
    ytdNights: 4180,
    adr: 1459,
  },
  {
    code: "WHOLESALE",
    description: "Wholesale / Tour",
    group: "Wholesale",
    stats: "STATS-WHL",
    ytdRev: 3400000,
    ytdNights: 2940,
    adr: 1156,
  },
  {
    code: "GOV",
    description: "Government / Military",
    group: "Other",
    stats: "STATS-GOV",
    ytdRev: 900000,
    ytdNights: 810,
    adr: 1111,
  },
];
function MarketsSection() {
  return (
    <div className="ora-section overflow-hidden">
      <div className="ora-section-head">
        <span className="ora-label">Market Segments ({MARKET_ROWS.length})</span>
        <span className="font-mono text-[10.5px] text-ora-muted">
          FY 2026 · YTD through 2026-05-15
        </span>
      </div>
      <table className="ora-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Group</th>
            <th>Statistics Group</th>
            <th className="right">YTD Revenue</th>
            <th className="right">YTD Nights</th>
            <th className="right">ADR</th>
            <th>Status</th>
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {MARKET_ROWS.map((m) => (
            <tr key={m.code}>
              <td className="mono font-semibold">{m.code}</td>
              <td>{m.description}</td>
              <td>{m.group}</td>
              <td className="mono text-ora-muted">{m.stats}</td>
              <td className="right mono">${(m.ytdRev / 1_000_000).toFixed(1)}M</td>
              <td className="right mono">{m.ytdNights.toLocaleString("en-US")}</td>
              <td className="right mono">${m.adr.toLocaleString("en-US")}</td>
              <td>
                <StatusPill ok label="ACTIVE" />
              </td>
              <td>
                <button type="button" className="ora-row-actions" aria-label="Row actions">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                    <circle cx="3" cy="8" r="1.4" />
                    <circle cx="8" cy="8" r="1.4" />
                    <circle cx="13" cy="8" r="1.4" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 4. Departments & Routing ---------------- */
const DEPT_ROWS = [
  {
    code: "CON",
    dept: "Concierge",
    keywords: "reservation, restaurant, tour, activity, recommendation, table",
    sla: 15,
    assignee: "M. Ortega",
    escalation: 30,
    active: true,
  },
  {
    code: "HSK",
    dept: "Housekeeping",
    keywords: "towels, linens, turndown, clean, amenity replenish, pillow",
    sla: 20,
    assignee: "L. Garcia",
    escalation: 45,
    active: true,
  },
  {
    code: "F&B",
    dept: "Food & Beverage",
    keywords: "in-room dining, breakfast, allergy, dietary, beverage",
    sla: 10,
    assignee: "J. Lee",
    escalation: 25,
    active: true,
  },
  {
    code: "ENG",
    dept: "Engineering",
    keywords: "HVAC, leak, broken, tv, wifi, electrical, plumbing",
    sla: 30,
    assignee: "T. Williams",
    escalation: 60,
    active: true,
  },
  {
    code: "FOM",
    dept: "Front Desk",
    keywords: "check-in, check-out, key, room change, billing, transfer",
    sla: 5,
    assignee: "K. Petrushevski",
    escalation: 15,
    active: true,
  },
];
const ROUTING_RULES = [
  { ifText: "transcript contains 'restaurant', 'reservation'", thenDept: "Concierge", sla: 15 },
  { ifText: "transcript contains 'AC', 'heat', 'broken', 'leak'", thenDept: "Engineering", sla: 30 },
  { ifText: "transcript contains 'towel', 'turndown', 'pillow'", thenDept: "Housekeeping", sla: 20 },
  { ifText: "transcript contains 'breakfast', 'allergy', 'minibar'", thenDept: "Food & Beverage", sla: 10 },
  { ifText: "transcript contains 'check-in', 'late checkout', 'key'", thenDept: "Front Desk", sla: 5 },
];
function DepartmentsSection() {
  return (
    <div className="space-y-3">
      <div className="ora-section overflow-hidden">
        <div className="ora-section-head">
          <span className="ora-label">Departments ({DEPT_ROWS.length})</span>
          <span className="ora-chip ora-chip-green">5 ACTIVE</span>
        </div>
        <table className="ora-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Department</th>
              <th style={{ minWidth: 280 }}>Keyword Triggers</th>
              <th className="right">SLA (min)</th>
              <th>Default Assignee</th>
              <th className="right">Escalation (min)</th>
              <th className="center">Active</th>
            </tr>
          </thead>
          <tbody>
            {DEPT_ROWS.map((d) => (
              <tr key={d.code}>
                <td className="mono font-semibold">{d.code}</td>
                <td>{d.dept}</td>
                <td className="text-ora-muted wrap">{d.keywords}</td>
                <td className="right mono">{d.sla}</td>
                <td>{d.assignee}</td>
                <td className="right mono">{d.escalation}</td>
                <td style={{ textAlign: "center" }}>
                  <span className="ora-chip ora-chip-green">ON</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ora-section">
        <div className="ora-section-head">
          <span className="ora-label">Routing Rules — Executed by AI Concierge</span>
          <button type="button" className="ora-mini-btn">
            + Add Rule
          </button>
        </div>
        <ul className="px-3 py-2 space-y-1">
          {ROUTING_RULES.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-[11.5px] py-1.5 px-2 border border-ora-hairline rounded-sm bg-white"
            >
              <span
                className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                style={{ background: "var(--ora-blue-soft)", color: "var(--ora-blue)" }}
              >
                IF
              </span>
              <span className="text-ora-charcoal flex-1">{r.ifText}</span>
              <span
                className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                style={{ background: "var(--ora-red-soft)", color: "var(--ora-red-deep)" }}
              >
                THEN
              </span>
              <span className="text-ora-charcoal font-semibold">→ {r.thenDept}</span>
              <span className="text-ora-muted-2 font-mono tabular-nums">
                within {r.sla}m
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- 5. AI Concierge ---------------- */
const AI_LOG_ENTRIES = [
  { time: "11:42 AM", endpoint: "/api/research", status: 200, latency: "1.8s" },
  { time: "11:39 AM", endpoint: "/api/extract", status: 200, latency: "0.9s" },
  { time: "11:37 AM", endpoint: "/api/predictions", status: 200, latency: "2.4s" },
  { time: "11:32 AM", endpoint: "/api/extract", status: 200, latency: "1.1s" },
  { time: "11:28 AM", endpoint: "/api/research", status: 200, latency: "2.0s" },
  { time: "11:22 AM", endpoint: "/api/extract", status: 200, latency: "0.7s" },
  { time: "11:18 AM", endpoint: "/api/predictions", status: 200, latency: "1.9s" },
];
function AISection({ fire }: { fire: (m: string) => void }) {
  const [enabled, setEnabled] = useState(true);
  const [autoRoute, setAutoRoute] = useState(true);
  const [vibrateBadge, setVibrateBadge] = useState(true);
  const [maxSearches, setMaxSearches] = useState(5);
  const [confidence, setConfidence] = useState(0.6);

  return (
    <div className="space-y-3">
      <div className="ora-section">
        <div className="ora-section-head">
          <span className="ora-label">AI Concierge — Model &amp; Behavior</span>
          <span className="ora-chip ora-chip-blue">
            <span className="font-mono">CLAUDE-SONNET-4-6</span>
          </span>
        </div>
        <div className="px-4 py-2 divide-y divide-ora-hairline">
          <FormRowVert
            label="Enabled"
            hint="Master switch for the AI concierge subsystem."
          >
            <Toggle on={enabled} onChange={setEnabled} />
          </FormRowVert>
          <FormRowVert
            label="Model"
            hint="Anthropic model used for guest briefs and SR routing."
          >
            <span className="font-mono text-[12px] text-ora-charcoal">claude-sonnet-4-6</span>
          </FormRowVert>
          <FormRowVert
            label="API Endpoint"
            hint="Base URL for Anthropic API calls."
          >
            <span className="font-mono text-[12px] text-ora-charcoal">
              https://api.anthropic.com/v1
            </span>
          </FormRowVert>
          <FormRowVert
            label="Max web searches per brief"
            hint="Cap research depth per guest pre-arrival brief."
          >
            <input
              type="number"
              min={0}
              max={20}
              value={maxSearches}
              onChange={(e) => setMaxSearches(Number(e.target.value))}
              className="ora-input w-20 text-right font-mono"
            />
          </FormRowVert>
          <FormRowVert
            label="Prediction confidence threshold"
            hint="Minimum model confidence to surface a predicted next-step."
          >
            <input
              type="number"
              step={0.05}
              min={0}
              max={1}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="ora-input w-20 text-right font-mono"
            />
          </FormRowVert>
          <FormRowVert
            label="Auto-route urgent SRs"
            hint="Dispatch urgent service requests immediately."
          >
            <Toggle on={autoRoute} onChange={setAutoRoute} />
          </FormRowVert>
          <FormRowVert
            label="Vibrate badge on confirmation"
            hint="Send haptic ping to staff badge on SR ack."
          >
            <Toggle on={vibrateBadge} onChange={setVibrateBadge} />
          </FormRowVert>
        </div>
        <div className="px-4 py-2 border-t border-ora-hairline bg-ora-bg flex items-center justify-between">
          <button type="button" className="ora-mini-btn" onClick={() => fire("Connection OK · 89ms")}>
            Test Connection
          </button>
          <div className="flex items-center gap-1">
            <button type="button" className="ora-mini-btn" onClick={() => fire("Reverted")}>
              Cancel
            </button>
            <button
              type="button"
              className="ora-btn ora-btn-primary h-7 text-[11.5px]"
              onClick={() => fire("Saved")}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div className="ora-section">
        <div className="ora-section-head">
          <span className="ora-label">API Activity Log — Last Hour</span>
          <span className="font-mono text-[10.5px] text-ora-muted">
            window: rolling 60min
          </span>
        </div>
        <table className="ora-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Time</th>
              <th>Endpoint</th>
              <th className="right">Status</th>
              <th className="right">Latency</th>
            </tr>
          </thead>
          <tbody>
            {AI_LOG_ENTRIES.map((e, i) => (
              <tr key={i}>
                <td className="mono text-ora-muted">{e.time}</td>
                <td className="mono">{e.endpoint}</td>
                <td className="right">
                  <span
                    className={
                      "font-mono tabular-nums " +
                      (e.status === 200 ? "text-ora-green" : "text-ora-red")
                    }
                  >
                    {e.status}
                  </span>
                </td>
                <td className="right mono">{e.latency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Usage */}
      <div className="ora-section">
        <div className="ora-section-head">
          <span className="ora-label">Usage — Last 30 Days</span>
          <span className="font-mono text-[10.5px] text-ora-muted">
            2026-04-16 → 2026-05-16
          </span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-ora-hairline">
          <StatCell label="Briefs generated" value="412" />
          <StatCell label="SRs auto-routed" value="1,284" />
          <StatCell label="Avg. confidence" value="0.74" />
          <StatCell label="Tokens used" value="3.1M" />
        </div>
      </div>
    </div>
  );
}

function FormRowVert({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-6 py-2">
      <div>
        <div className="text-[12px] font-semibold text-ora-charcoal text-right">{label}</div>
        {hint && (
          <div className="text-[10.5px] text-ora-muted mt-0.5 text-right leading-snug">
            {hint}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors border " +
        (on ? "bg-ora-red border-ora-red" : "bg-white border-ora-hairline-2")
      }
    >
      <span
        className={
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-4" : "translate-x-1")
        }
        style={on ? undefined : { backgroundColor: "var(--ora-muted-2)" }}
      />
    </button>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <div className="ora-label">{label}</div>
      <div className="font-mono text-[18px] tabular-nums font-bold text-ora-charcoal mt-1">
        {value}
      </div>
    </div>
  );
}

/* ---------------- 6. Users & Roles ---------------- */
interface UserRow {
  uid: string;
  name: string;
  role: string;
  dept: string;
  email: string;
  phone: string;
  last: string;
  status: "ACTIVE" | "AWAY" | "OFFLINE";
}
const USER_ROWS: UserRow[] = [
  {
    uid: "U-001",
    name: "Patrick Schmid",
    role: "General Manager",
    dept: "Executive",
    email: "patrick.schmid@rosewoodsfo.com",
    phone: "+1 415-300-1100",
    last: "27 min ago",
    status: "ACTIVE",
  },
  {
    uid: "U-002",
    name: "Kristian Petrushevski",
    role: "Front Office Manager",
    dept: "Front Office",
    email: "kristian@open-analytica.com",
    phone: "+1 415-300-1101",
    last: "2 min ago",
    status: "ACTIVE",
  },
  {
    uid: "U-003",
    name: "Maria Ortega",
    role: "Head Concierge",
    dept: "Concierge",
    email: "maria.ortega@rosewoodsfo.com",
    phone: "+1 415-300-1102",
    last: "8 min ago",
    status: "ACTIVE",
  },
  {
    uid: "U-004",
    name: "Joon Lee",
    role: "F&B Manager",
    dept: "Food & Beverage",
    email: "joon.lee@rosewoodsfo.com",
    phone: "+1 415-300-1103",
    last: "1 hour ago",
    status: "AWAY",
  },
  {
    uid: "U-005",
    name: "Sarah Doyle",
    role: "Spa Director",
    dept: "Spa & Wellness",
    email: "sarah.doyle@rosewoodsfo.com",
    phone: "+1 415-300-1104",
    last: "Yesterday 18:42",
    status: "OFFLINE",
  },
  {
    uid: "U-006",
    name: "Luis Garcia",
    role: "Housekeeping Supervisor",
    dept: "Housekeeping",
    email: "luis.garcia@rosewoodsfo.com",
    phone: "+1 415-300-1105",
    last: "12 min ago",
    status: "ACTIVE",
  },
  {
    uid: "U-007",
    name: "Tomás Williams",
    role: "Chief Engineer",
    dept: "Engineering",
    email: "tomas.williams@rosewoodsfo.com",
    phone: "+1 415-300-1106",
    last: "44 min ago",
    status: "ACTIVE",
  },
  {
    uid: "U-008",
    name: "Aiko Nakamura",
    role: "Front Desk Agent",
    dept: "Front Office",
    email: "aiko.nakamura@rosewoodsfo.com",
    phone: "+1 415-300-1107",
    last: "5 min ago",
    status: "ACTIVE",
  },
  {
    uid: "U-009",
    name: "Diego Rivera",
    role: "Front Desk Agent",
    dept: "Front Office",
    email: "diego.rivera@rosewoodsfo.com",
    phone: "+1 415-300-1108",
    last: "3 hours ago",
    status: "OFFLINE",
  },
  {
    uid: "U-010",
    name: "Priya Iyer",
    role: "Revenue Manager",
    dept: "Revenue",
    email: "priya.iyer@rosewoodsfo.com",
    phone: "+1 415-300-1109",
    last: "32 min ago",
    status: "ACTIVE",
  },
];
function UsersSection() {
  return (
    <div className="ora-section overflow-hidden">
      <div className="ora-section-head">
        <span className="ora-label">Users &amp; Roles ({USER_ROWS.length})</span>
        <div className="flex items-center gap-1">
          <span className="ora-chip ora-chip-green">
            {USER_ROWS.filter((u) => u.status === "ACTIVE").length} ACTIVE
          </span>
          <button type="button" className="ora-mini-btn">
            + New User
          </button>
        </div>
      </div>
      <table className="ora-table">
        <thead>
          <tr>
            <th>User #</th>
            <th>Name</th>
            <th>Role</th>
            <th>Department</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Last Active</th>
            <th>Status</th>
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {USER_ROWS.map((u) => (
            <tr key={u.uid}>
              <td className="mono">{u.uid}</td>
              <td className="font-semibold">{u.name}</td>
              <td>{u.role}</td>
              <td>{u.dept}</td>
              <td className="text-ora-blue">{u.email}</td>
              <td className="mono text-ora-muted">{u.phone}</td>
              <td className="text-ora-muted">{u.last}</td>
              <td>
                <span
                  className={
                    "ora-chip " +
                    (u.status === "ACTIVE"
                      ? "ora-chip-green"
                      : u.status === "AWAY"
                        ? "ora-chip-amber"
                        : "ora-chip-grey")
                  }
                >
                  {u.status}
                </span>
              </td>
              <td>
                <button type="button" className="ora-row-actions" aria-label="Row actions">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                    <circle cx="3" cy="8" r="1.4" />
                    <circle cx="8" cy="8" r="1.4" />
                    <circle cx="13" cy="8" r="1.4" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 7. Integrations ---------------- */
interface IntegRow {
  name: string;
  status: "CONNECTED" | "DEGRADED" | "DOWN";
  lastSync: string;
  scope: string;
  icon: string;
}
const INTEG_ROWS: IntegRow[] = [
  {
    name: "Glowing.io",
    icon: "G",
    status: "CONNECTED",
    lastSync: "2 seconds ago",
    scope: "Guest messaging · SMS gateway",
  },
  {
    name: "Oracle Hospitality OHIP",
    icon: "O",
    status: "CONNECTED",
    lastSync: "11 seconds ago",
    scope: "PMS sync · folio postings",
  },
  {
    name: "BirchStreet Procurement",
    icon: "B",
    status: "CONNECTED",
    lastSync: "1 minute ago",
    scope: "Amenity restocking",
  },
  {
    name: "Anthropic API",
    icon: "A",
    status: "CONNECTED",
    lastSync: "Just now",
    scope: "AI concierge model",
  },
  {
    name: "Web Search",
    icon: "W",
    status: "CONNECTED",
    lastSync: "4 seconds ago",
    scope: "Live research for guest briefs",
  },
  {
    name: "Stripe Payments",
    icon: "S",
    status: "DEGRADED",
    lastSync: "12 minutes ago",
    scope: "Card capture · refunds",
  },
  {
    name: "Mailgun",
    icon: "M",
    status: "CONNECTED",
    lastSync: "30 seconds ago",
    scope: "Transactional email",
  },
];
function IntegrationsSection({ fire }: { fire: (m: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {INTEG_ROWS.map((i) => (
          <div key={i.name} className="ora-report-card">
            <div className="flex items-start gap-2.5">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-sm shrink-0 text-[14px] font-bold"
                style={{
                  background: "var(--ora-red-soft)",
                  color: "var(--ora-red-deep)",
                }}
              >
                {i.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-ora-charcoal truncate">
                  {i.name}
                </div>
                <div className="text-[10.5px] text-ora-muted leading-relaxed">
                  {i.scope}
                </div>
              </div>
              <span
                className={
                  "ora-chip shrink-0 " +
                  (i.status === "CONNECTED"
                    ? "ora-chip-green"
                    : i.status === "DEGRADED"
                      ? "ora-chip-amber"
                      : "ora-chip-red")
                }
              >
                {i.status}
              </span>
            </div>
            <div className="text-[10.5px] text-ora-muted-2 font-mono tabular-nums border-t border-ora-hairline pt-2 mt-1">
              Last sync: <span className="text-ora-charcoal">{i.lastSync}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="ora-mini-btn flex-1 justify-center"
                onClick={() => fire(`${i.name} — Manage opened`)}
              >
                Manage
              </button>
              <button
                type="button"
                className="ora-mini-btn"
                onClick={() => fire(`${i.name} — Logs opened`)}
              >
                Logs
              </button>
              <button
                type="button"
                className="ora-mini-btn"
                onClick={() => fire(`${i.name} — Disconnected`)}
              >
                Disconnect
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="ora-section">
        <div className="ora-section-head">
          <span className="ora-label">Health Check</span>
          <button
            type="button"
            className="ora-btn ora-btn-primary h-7 text-[11.5px]"
            onClick={() => fire("Health-check broadcast sent")}
          >
            Run Health-Check
          </button>
        </div>
        <div className="px-4 py-3 grid grid-cols-3 gap-3 text-[11.5px]">
          <div>
            <div className="ora-label">Connected</div>
            <div className="mt-1 text-[18px] font-bold font-mono tabular-nums text-ora-green">
              {INTEG_ROWS.filter((i) => i.status === "CONNECTED").length}/
              {INTEG_ROWS.length}
            </div>
          </div>
          <div>
            <div className="ora-label">Degraded</div>
            <div className="mt-1 text-[18px] font-bold font-mono tabular-nums text-ora-amber">
              {INTEG_ROWS.filter((i) => i.status === "DEGRADED").length}
            </div>
          </div>
          <div>
            <div className="ora-label">Last Health-Check</div>
            <div className="mt-1 text-[14px] font-semibold text-ora-charcoal">
              Today, 10:42 AM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Shared cells ---------------- */
function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={"ora-chip " + (ok ? "ora-chip-green" : "ora-chip-grey")}>{label}</span>
  );
}
