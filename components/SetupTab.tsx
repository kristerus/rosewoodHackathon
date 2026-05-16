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
  { key: "property", label: "Property", caption: "Active property" },
  { key: "rates", label: "Rate Codes", caption: "Pricing matrix" },
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

  return (
    <div className="flex h-full w-full overflow-hidden bg-ora-bg">
      {/* Left nav */}
      <div className="w-[220px] shrink-0 border-r border-ora-hairline bg-white flex flex-col">
        <div className="px-3 py-2 border-b border-ora-hairline">
          <div className="ora-label">Setup &amp; Configuration</div>
          <div className="text-[11px] text-ora-muted mt-0.5">
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
                  "block w-full text-left px-3 py-2 border-l-2 transition-colors " +
                  (isActive
                    ? "border-l-ora-red bg-ora-row-selected"
                    : "border-l-transparent hover:bg-ora-row-hover")
                }
              >
                <div
                  className={
                    "text-[12.5px] " +
                    (isActive
                      ? "font-bold text-ora-charcoal"
                      : "font-medium text-ora-charcoal")
                  }
                >
                  {s.label}
                </div>
                <div className="text-[10.5px] text-ora-muted mt-0.5">
                  {s.caption}
                </div>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-ora-hairline px-3 py-2 text-[10.5px] text-ora-muted">
          v 26.5.16 · build 4882
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0 overflow-y-auto scroll-rw">
        <div className="p-4 space-y-3">
          {/* Header for section */}
          <SectionHeader active={active} toastMsg={toastMsg} />

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

/* ---------------- Section header ---------------- */
function SectionHeader({
  active,
  toastMsg,
}: {
  active: SectionKey;
  toastMsg: string | null;
}) {
  const section = SECTIONS.find((s) => s.key === active)!;
  return (
    <div className="ora-card px-4 py-3 flex items-center justify-between">
      <div>
        <div className="ora-label">Configure</div>
        <h2 className="text-[15px] font-semibold text-ora-charcoal mt-0.5">
          {section.label}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        {toastMsg && (
          <span className="fade-up text-[11.5px] text-ora-muted px-2 py-1 bg-ora-row-selected border border-ora-hairline rounded-sm">
            {toastMsg}
          </span>
        )}
        <span className="ora-chip ora-chip-grey">
          <span className="font-mono">SETUP/{section.key.toUpperCase()}</span>
        </span>
      </div>
    </div>
  );
}

/* ---------------- 1. Property ---------------- */
function PropertySection({ fire }: { fire: (m: string) => void }) {
  return (
    <div className="ora-card">
      <div className="px-4 py-2 border-b border-ora-hairline flex items-center justify-between">
        <span className="ora-label">Active Property</span>
        <button
          className="ora-btn"
          type="button"
          onClick={() => fire("Edit (mock) — opening property editor")}
        >
          Edit (mock)
        </button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-x-8 gap-y-3">
        <Kv label="Property Code" mono value="ROSE-SFO" />
        <Kv label="Name" value="Rosewood San Francisco" />
        <Kv label="Address" value="550 Geary St, San Francisco, CA 94102" />
        <Kv label="Time Zone" mono value="America/Los_Angeles (Pacific Time)" />
        <Kv label="Currency" mono value="USD ($)" />
        <Kv label="Total Rooms" mono value="153" />
        <Kv label="Opened" mono value="2009" />
        <Kv label="General Manager" value="Patrick Schmid" />
        <Kv label="Brand Code" mono value="RW-CORP" />
        <Kv label="PMS Cluster" mono value="OHIP-WEST-A" />
      </div>
      <div className="px-4 py-2 border-t border-ora-hairline bg-[#FAFAFA] text-[11px] text-ora-muted flex items-center justify-between">
        <span>Last modified: 2026-05-14 09:12 by Patrick Schmid</span>
        <span className="font-mono">PROP-RECORD-001</span>
      </div>
    </div>
  );
}

/* ---------------- 2. Rate Codes ---------------- */
interface RateRow {
  code: string;
  description: string;
  type: string;
  rate: number;
  status: "ACTIVE" | "INACTIVE";
}
const RATE_ROWS: RateRow[] = [
  { code: "RW-CORP", description: "Corporate", type: "Negotiated", rate: 850, status: "ACTIVE" },
  { code: "RW-LEISURE", description: "Leisure Standard", type: "Public", rate: 1250, status: "ACTIVE" },
  { code: "RW-CONS", description: "Consortium", type: "Negotiated", rate: 980, status: "ACTIVE" },
  { code: "RW-AAA", description: "AAA Discount", type: "Public", rate: 1150, status: "INACTIVE" },
  { code: "RW-SUITE", description: "Suite Upgrade", type: "Negotiated", rate: 2100, status: "ACTIVE" },
];
function RatesSection({ fire }: { fire: (m: string) => void }) {
  return (
    <div className="ora-card overflow-hidden">
      <div className="px-3 py-2 border-b border-ora-hairline flex items-center justify-between">
        <span className="ora-label">Rate Codes ({RATE_ROWS.length})</span>
        <div className="flex items-center gap-1">
          <button className="ora-btn" type="button" onClick={() => fire("New Rate (mock)")}>
            New Rate
          </button>
          <button
            className="ora-btn ora-btn-primary"
            type="button"
            onClick={() => fire("Saved (mock)")}
          >
            Save
          </button>
        </div>
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-[#FAFAFA] border-b border-ora-hairline">
            <Th>Code</Th>
            <Th className="w-full">Description</Th>
            <Th>Type</Th>
            <Th right>Default Rate</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {RATE_ROWS.map((r) => (
            <tr
              key={r.code}
              className="border-b border-ora-hairline hover:bg-ora-row-hover"
            >
              <Td mono className="font-semibold">{r.code}</Td>
              <Td>{r.description}</Td>
              <Td>{r.type}</Td>
              <Td right mono>${r.rate.toLocaleString("en-US")}.00</Td>
              <Td>
                <StatusPill ok={r.status === "ACTIVE"} label={r.status} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 3. Market Segments ---------------- */
const MARKET_ROWS = [
  { code: "LEISURE", description: "Leisure Travel", group: "Retail", ytd: "$14.2M" },
  { code: "BUSINESS", description: "Business Transient", group: "Corporate", ytd: "$9.8M" },
  { code: "GROUP", description: "Group Bookings", group: "Group", ytd: "$6.1M" },
  { code: "WHOLESALE", description: "Wholesale", group: "Wholesale", ytd: "$3.4M" },
  { code: "GOV", description: "Government / Military", group: "Other", ytd: "$0.9M" },
];
function MarketsSection() {
  return (
    <div className="ora-card overflow-hidden">
      <div className="px-3 py-2 border-b border-ora-hairline flex items-center justify-between">
        <span className="ora-label">Market Segments ({MARKET_ROWS.length})</span>
        <span className="font-mono text-[11px] text-ora-muted">
          FY 2026 · YTD through 2026-05-15
        </span>
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-[#FAFAFA] border-b border-ora-hairline">
            <Th>Code</Th>
            <Th className="w-full">Description</Th>
            <Th>Group</Th>
            <Th right>YTD Revenue</Th>
          </tr>
        </thead>
        <tbody>
          {MARKET_ROWS.map((m) => (
            <tr
              key={m.code}
              className="border-b border-ora-hairline hover:bg-ora-row-hover"
            >
              <Td mono className="font-semibold">{m.code}</Td>
              <Td>{m.description}</Td>
              <Td>{m.group}</Td>
              <Td right mono>{m.ytd}</Td>
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
    dept: "Concierge",
    code: "concierge",
    keywords: "reservation, restaurant, tour, activity, recommendation, table",
    sla: "15 min",
    pool: "5 agents · Day shift",
  },
  {
    dept: "Housekeeping",
    code: "housekeeping",
    keywords: "towels, linens, turndown, clean, amenity replenish, pillow",
    sla: "20 min",
    pool: "12 agents · 24h coverage",
  },
  {
    dept: "Food & Beverage",
    code: "fnb",
    keywords: "in-room dining, breakfast, allergy, dietary, beverage",
    sla: "10 min",
    pool: "7 agents · Day + evening",
  },
  {
    dept: "Engineering",
    code: "maintenance",
    keywords: "HVAC, leak, broken, tv, wifi, electrical, plumbing",
    sla: "30 min",
    pool: "4 agents · On-call rotation",
  },
  {
    dept: "Front Desk",
    code: "frontdesk",
    keywords: "check-in, check-out, key, room change, billing, transfer",
    sla: "5 min",
    pool: "6 agents · 24h coverage",
  },
];
function DepartmentsSection() {
  return (
    <div className="ora-card overflow-hidden">
      <div className="px-3 py-2 border-b border-ora-hairline flex items-center justify-between">
        <span className="ora-label">Departments &amp; Auto-Routing Rules</span>
        <span className="ora-chip ora-chip-green">5 ACTIVE</span>
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-[#FAFAFA] border-b border-ora-hairline">
            <Th>Department</Th>
            <Th>Code</Th>
            <Th className="w-full">Keywords</Th>
            <Th>SLA</Th>
            <Th>Assignee Pool</Th>
          </tr>
        </thead>
        <tbody>
          {DEPT_ROWS.map((d) => (
            <tr
              key={d.code}
              className="border-b border-ora-hairline hover:bg-ora-row-hover align-top"
            >
              <Td className="font-semibold">{d.dept}</Td>
              <Td mono>{d.code}</Td>
              <Td className="text-ora-muted">{d.keywords}</Td>
              <Td mono>{d.sla}</Td>
              <Td>{d.pool}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 5. AI Concierge ---------------- */
function AISection({ fire }: { fire: (m: string) => void }) {
  const [enabled, setEnabled] = useState(true);
  const [autoRoute, setAutoRoute] = useState(true);
  const [vibrateBadge, setVibrateBadge] = useState(true);
  const [maxSearches, setMaxSearches] = useState(5);
  const [confidence, setConfidence] = useState(0.6);

  return (
    <div className="space-y-3">
      <div className="ora-card">
        <div className="px-4 py-2 border-b border-ora-hairline flex items-center justify-between">
          <span className="ora-label">AI Concierge — Model &amp; Behavior</span>
          <span className="ora-chip ora-chip-blue">
            <span className="font-mono">CLAUDE-SONNET-4-6</span>
          </span>
        </div>
        <div className="px-4 py-2 divide-y divide-ora-hairline">
          <FormRow label="Enabled" hint="Master switch for the AI concierge subsystem.">
            <Toggle on={enabled} onChange={setEnabled} />
          </FormRow>
          <FormRow label="Model" hint="Anthropic model used for guest briefs and SR routing.">
            <span className="font-mono text-[12.5px]">claude-sonnet-4-6</span>
          </FormRow>
          <FormRow
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
          </FormRow>
          <FormRow
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
          </FormRow>
          <FormRow label="Auto-route urgent SRs" hint="Dispatch urgent service requests immediately.">
            <Toggle on={autoRoute} onChange={setAutoRoute} />
          </FormRow>
          <FormRow label="Vibrate badge on confirmation" hint="Send haptic ping to staff badge on SR ack.">
            <Toggle on={vibrateBadge} onChange={setVibrateBadge} />
          </FormRow>
          <FormRow label="Default staff ID format" hint="Template applied when generating new staff IDs.">
            <span className="font-mono text-[12.5px]">staff-&#123;slug&#125;-&#123;n&#125;</span>
          </FormRow>
        </div>
        <div className="border-t border-ora-hairline px-4 py-2 flex items-center justify-end gap-1 bg-[#FAFAFA]">
          <button
            type="button"
            className="ora-btn"
            onClick={() => fire("Reverted to last saved (mock)")}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ora-btn ora-btn-primary"
            onClick={() => fire("Saved (mock)")}
          >
            Save
          </button>
        </div>
      </div>

      <div className="ora-card">
        <div className="px-4 py-2 border-b border-ora-hairline flex items-center justify-between">
          <span className="ora-label">Usage — Last 30 Days</span>
          <span className="font-mono text-[11px] text-ora-muted">window: 2026-04-16 → 2026-05-16</span>
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

function FormRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold text-ora-charcoal">{label}</div>
        {hint && <div className="text-[11px] text-ora-muted mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors border " +
        (on
          ? "bg-ora-red border-ora-red"
          : "bg-white border-ora-hairline-2")
      }
    >
      <span
        className={
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-4" : "translate-x-1")
        }
        style={
          on
            ? undefined
            : { backgroundColor: "var(--ora-muted-2)" }
        }
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
  name: string;
  role: string;
  email: string;
  last: string;
}
const USER_ROWS: UserRow[] = [
  {
    name: "Kristian Petrushevski",
    role: "Front Office Manager",
    email: "kristian@open-analytica.com",
    last: "2 minutes ago",
  },
  {
    name: "Patrick Schmid",
    role: "General Manager",
    email: "patrick.schmid@rosewoodsfo.com",
    last: "27 minutes ago",
  },
  {
    name: "Maria Ortega",
    role: "Head Concierge",
    email: "maria.ortega@rosewoodsfo.com",
    last: "8 minutes ago",
  },
  {
    name: "Joon Lee",
    role: "F&B Supervisor",
    email: "joon.lee@rosewoodsfo.com",
    last: "1 hour ago",
  },
  {
    name: "Sarah Doyle",
    role: "Spa Director",
    email: "sarah.doyle@rosewoodsfo.com",
    last: "Yesterday, 18:42",
  },
];
function UsersSection() {
  return (
    <div className="ora-card overflow-hidden">
      <div className="px-3 py-2 border-b border-ora-hairline flex items-center justify-between">
        <span className="ora-label">Users &amp; Roles ({USER_ROWS.length})</span>
        <span className="ora-chip ora-chip-grey">5 ACTIVE</span>
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-[#FAFAFA] border-b border-ora-hairline">
            <Th className="w-1/4">Name</Th>
            <Th>Role</Th>
            <Th>Email</Th>
            <Th right>Last Active</Th>
          </tr>
        </thead>
        <tbody>
          {USER_ROWS.map((u) => (
            <tr
              key={u.email}
              className="border-b border-ora-hairline hover:bg-ora-row-hover"
            >
              <Td className="font-semibold">{u.name}</Td>
              <Td>{u.role}</Td>
              <Td mono className="text-ora-muted">{u.email}</Td>
              <Td right mono>{u.last}</Td>
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
}
const INTEG_ROWS: IntegRow[] = [
  { name: "Glowing.io", status: "CONNECTED", lastSync: "2 seconds ago", scope: "Guest messaging · SMS gateway" },
  { name: "Oracle Hospitality OHIP", status: "CONNECTED", lastSync: "11 seconds ago", scope: "PMS sync · folio postings" },
  { name: "BirchStreet Procurement", status: "CONNECTED", lastSync: "1 minute ago", scope: "Amenity restocking · purchase orders" },
  { name: "Anthropic API", status: "CONNECTED", lastSync: "Just now", scope: "AI concierge model" },
  { name: "Web Search", status: "CONNECTED", lastSync: "4 seconds ago", scope: "Live research for guest briefs" },
];
function IntegrationsSection({ fire }: { fire: (m: string) => void }) {
  return (
    <div className="ora-card overflow-hidden">
      <div className="px-3 py-2 border-b border-ora-hairline flex items-center justify-between">
        <span className="ora-label">Integration Status</span>
        <button
          type="button"
          className="ora-btn"
          onClick={() => fire("Health-check broadcast sent (mock)")}
        >
          Run Health-Check
        </button>
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-[#FAFAFA] border-b border-ora-hairline">
            <Th>System</Th>
            <Th>Status</Th>
            <Th className="w-full">Scope</Th>
            <Th right>Last Sync</Th>
          </tr>
        </thead>
        <tbody>
          {INTEG_ROWS.map((i) => (
            <tr key={i.name} className="border-b border-ora-hairline hover:bg-ora-row-hover">
              <Td className="font-semibold">{i.name}</Td>
              <Td>
                <StatusPill
                  ok={i.status === "CONNECTED"}
                  label={i.status}
                />
              </Td>
              <Td className="text-ora-muted">{i.scope}</Td>
              <Td right mono>{i.lastSync}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Shared table cells ---------------- */
function Th({
  children,
  right,
  className,
}: {
  children?: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <th
      className={
        "px-3 py-2 ora-label " +
        (right ? "text-right " : "text-left ") +
        (className ?? "")
      }
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  mono,
  className,
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={
        "px-3 py-1.5 align-top " +
        (right ? "text-right " : "text-left ") +
        (mono ? "font-mono tabular-nums " : "") +
        (className ?? "")
      }
    >
      {children}
    </td>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={"ora-chip " + (ok ? "ora-chip-green" : "ora-chip-grey")}>
      {label}
    </span>
  );
}

function Kv({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="ora-label">{label}</span>
      <span
        className={
          "text-[12.5px] text-ora-charcoal truncate " +
          (mono ? "font-mono tabular-nums" : "font-semibold")
        }
      >
        {value}
      </span>
    </div>
  );
}
