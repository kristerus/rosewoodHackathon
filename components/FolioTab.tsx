"use client";

import React, { useEffect, useMemo, useState } from "react";
import IWantToButton from "@/components/IWantToButton";

/* ---------------- Local types ---------------- */
interface GuestLite {
  id: string;
  name: string;
  room: string | null;
  booking_dates: { check_in: string; check_out: string };
  vip_tier: "standard" | "gold" | "platinum" | "legacy";
  past_stays: number;
  notes?: string;
  preferences?: string[];
}

interface FolioTabProps {
  guests: GuestLite[];
  focusedGuestId: string | null;
  onFocusGuest: (id: string) => void;
}

/* ---------------- Folio data shape ---------------- */
interface FolioLine {
  date: string;
  code: string;
  description: string;
  reference: string;
  posted_by: string;
  charges: number;
  credits: number;
}

/* ---------------- Deterministic helpers ---------------- */
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shortConf(guestId: string): string {
  const n = (hashStr(guestId) % 900000) + 100000;
  return `RES-${n}`;
}

function profileNumber(guestId: string): string {
  const n = hashStr(guestId + "profile") % 1_000_000;
  return `P-${n.toString().padStart(6, "0")}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function rateForTier(tier: GuestLite["vip_tier"]): number {
  switch (tier) {
    case "legacy":
      return 2400;
    case "platinum":
      return 1850;
    case "gold":
      return 1200;
    default:
      return 850;
  }
}

function fmtMoney(n: number, opts?: { plain?: boolean }): string {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (opts?.plain) return abs;
  return (n < 0 ? "-$" : "$") + abs;
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${String(d.getUTCDate()).padStart(2, "0")}-${months[d.getUTCMonth()]}`;
}

function fmtDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

const FB_OUTLETS: { code: string; desc: string; min: number; max: number }[] = [
  { code: "FB-LBR", desc: "Lobby Bar — Cocktails", min: 68, max: 184 },
  { code: "FB-IRD", desc: "In-Room Dining", min: 92, max: 246 },
  { code: "FB-BFAST", desc: "Breakfast — Restaurant", min: 54, max: 128 },
];

function buildFolio(guest: GuestLite): {
  lines: FolioLine[];
  subtotal: number;
  tax: number;
  total: number;
  payments: number;
  balance: number;
  nights: number;
  rate: number;
  discount: number;
} {
  const seed = hashStr(guest.id);
  const rng = (i: number) => {
    const v = (seed * 9301 + (i + 1) * 49297) % 233280;
    return v / 233280;
  };

  const nights = nightsBetween(guest.booking_dates.check_in, guest.booking_dates.check_out);
  const rate = rateForTier(guest.vip_tier);

  const lines: FolioLine[] = [];

  for (let i = 0; i < nights; i++) {
    const d = addDays(guest.booking_dates.check_in, i);
    lines.push({
      date: d,
      code: "RM-CHG",
      description: "Room Charge — RW-CORP",
      reference: `N${i + 1}/${nights}`,
      posted_by: "AUTO",
      charges: rate,
      credits: 0,
    });
  }

  const fbCount = 2 + Math.floor(rng(1) * 2);
  for (let i = 0; i < fbCount; i++) {
    const outlet = FB_OUTLETS[i % FB_OUTLETS.length];
    const offset = Math.min(nights - 1, Math.floor(rng(2 + i) * nights));
    const d = addDays(guest.booking_dates.check_in, offset);
    const amount =
      Math.round((outlet.min + rng(10 + i) * (outlet.max - outlet.min)) * 100) / 100;
    lines.push({
      date: d,
      code: outlet.code,
      description: outlet.desc,
      reference: `CHK-${(hashStr(guest.id + outlet.code) % 90000 + 10000).toString()}`,
      posted_by: i === 0 ? "J. LEE" : i === 1 ? "M. ORTEGA" : "K. NAKAMURA",
      charges: amount,
      credits: 0,
    });
  }

  lines.push({
    date: guest.booking_dates.check_in,
    code: "RES-FEE",
    description: `Resort Fee — ${nights} night${nights > 1 ? "s" : ""} @ $45.00`,
    reference: "AUTO-POST",
    posted_by: "AUTO",
    charges: 45 * nights,
    credits: 0,
  });

  if (guest.past_stays > 5) {
    const offset = Math.min(nights - 1, Math.max(0, nights - 2));
    lines.push({
      date: addDays(guest.booking_dates.check_in, offset),
      code: "SPA-TRT",
      description: "Sense Spa — 80min Signature Treatment",
      reference: `SPA-${(hashStr(guest.id + "spa") % 90000 + 10000).toString()}`,
      posted_by: "S. DOYLE",
      charges: 350,
      credits: 0,
    });
  }

  lines.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.code.localeCompare(b.code);
  });

  // Loyalty discount for legacy/platinum on Sense Spa
  let discount = 0;
  if (guest.vip_tier === "legacy" || guest.vip_tier === "platinum") {
    discount = Math.round(rate * 0.1 * nights * 100) / 100;
    lines.push({
      date: guest.booking_dates.check_in,
      code: "LOY-DSC",
      description: "Legacy Patron 10% Room Discount",
      reference: "AUTO-POST",
      posted_by: "AUTO",
      charges: 0,
      credits: discount,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.charges - l.credits, 0);
  const tax = Math.round(subtotal * 0.14 * 100) / 100;

  lines.push({
    date: guest.booking_dates.check_out,
    code: "TAX-OCC",
    description: "Occupancy Tax @ 14%",
    reference: "AUTO-POST",
    posted_by: "AUTO",
    charges: tax,
    credits: 0,
  });

  const total = subtotal + tax;

  const isPaidInFull = guest.past_stays >= 3;
  const payments = isPaidInFull ? total : Math.round(total * 0.5 * 100) / 100;
  if (payments > 0) {
    lines.push({
      date: guest.booking_dates.check_in,
      code: "PMT-CC",
      description: "Payment — AMEX Centurion ending 4202",
      reference: "AUTH-AX-9847",
      posted_by: "FRONTDESK",
      charges: 0,
      credits: payments,
    });
  }

  const balance = Math.round((total - payments) * 100) / 100;

  return { lines, subtotal, tax, total, payments, balance, nights, rate, discount };
}

/* ---------------- VIP chip ---------------- */
function VipChip({ tier }: { tier: GuestLite["vip_tier"] }) {
  const map: Record<GuestLite["vip_tier"], { label: string; cls: string }> = {
    standard: { label: "Standard", cls: "ora-chip ora-chip-grey" },
    gold: { label: "Gold", cls: "ora-chip ora-chip-amber" },
    platinum: { label: "Platinum", cls: "ora-chip ora-chip-blue" },
    legacy: { label: "Legacy Patron", cls: "ora-chip ora-chip-red" },
  };
  const m = map[tier];
  return <span className={m.cls}>{m.label.toUpperCase()}</span>;
}

type FolioSubTab = "detail" | "summary" | "routing" | "comp" | "adj" | "receipts" | "stats";

/* ---------------- Component ---------------- */
export default function FolioTab({ guests, focusedGuestId, onFocusGuest }: FolioTabProps) {
  const focused = useMemo(
    () => guests.find((g) => g.id === focusedGuestId) ?? null,
    [guests, focusedGuestId],
  );

  const folio = useMemo(() => (focused ? buildFolio(focused) : null), [focused]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<FolioSubTab>("detail");
  const [activeWindow, setActiveWindow] = useState<number>(1);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const fireAction = (action: string) => {
    setToastMsg(`${action} — action queued (mock)`);
  };

  // Build a running balance series for the table
  const linesWithBalance = useMemo(() => {
    if (!folio) return [];
    let running = 0;
    return folio.lines.map((l) => {
      running += l.charges - l.credits;
      return { ...l, balance: running };
    });
  }, [folio]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-ora-bg">
      {/* Left: guest selector list */}
      <div className="w-[280px] shrink-0 border-r border-ora-hairline bg-white flex flex-col">
        <div className="px-3 py-2 border-b border-ora-hairline flex items-center justify-between">
          <span className="ora-label">In-House Guests</span>
          <span className="ora-chip ora-chip-grey">{guests.length}</span>
        </div>
        <div className="px-3 py-2 border-b border-ora-hairline bg-ora-bg">
          <div className="ora-search">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ora-muted-2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Filter guests..." />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-rw">
          {guests.length === 0 && (
            <div className="px-3 py-6 text-[11.5px] text-ora-muted">No guests in-house.</div>
          )}
          {guests.map((g) => {
            const selected = g.id === focusedGuestId;
            const bal = buildFolio(g).balance;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onFocusGuest(g.id)}
                className={
                  "block w-full text-left px-3 py-2 border-b border-ora-hairline transition-colors " +
                  (selected
                    ? "bg-ora-row-selected border-l-2 border-l-ora-red"
                    : "hover:bg-ora-row-hover border-l-2 border-l-transparent")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-ora-charcoal truncate">
                    {g.name}
                  </span>
                  <span className="font-mono text-[10.5px] text-ora-muted tabular-nums">
                    {g.room ? `RM ${g.room}` : "—"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-ora-muted-2 tabular-nums">
                    {shortConf(g.id)}
                  </span>
                  <span
                    className={
                      "font-mono text-[11px] tabular-nums font-semibold " +
                      (bal > 0 ? "text-ora-red" : "text-ora-green")
                    }
                  >
                    {fmtMoney(bal)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="ora-detail-footer">
          <span>{guests.length} accounts</span>
          <span className="uppercase tracking-wider">Window 1 of 8</span>
        </div>
      </div>

      {/* Right: folio detail */}
      <div className="flex-1 min-w-0 overflow-y-auto scroll-rw">
        {!focused || !folio ? (
          <div className="h-full flex items-center justify-center px-6">
            <div className="text-center">
              <div className="ora-label mb-2">Guest Folio</div>
              <div className="text-[13.5px] text-ora-muted">
                Select a guest to view their folio.
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white">
            {/* ROW 1 — Big identity strip */}
            <div className="px-4 py-3 border-b border-ora-hairline bg-white flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[18px] font-semibold text-ora-charcoal leading-tight">
                    {focused.name}
                  </h2>
                  <VipChip tier={focused.vip_tier} />
                  <span className="font-mono text-[11px] text-ora-muted tabular-nums">
                    {profileNumber(focused.id)}
                  </span>
                </div>
                {/* ROW 2 — Confirmation/stay strip */}
                <div className="mt-1 flex items-center gap-4 text-[11.5px] text-ora-muted">
                  <KV label="Conf" value={shortConf(focused.id)} mono />
                  <KV
                    label="Stay"
                    value={`${fmtDateLong(focused.booking_dates.check_in)} → ${fmtDateLong(focused.booking_dates.check_out)}`}
                  />
                  <KV label="Room" value={focused.room ?? "—"} mono />
                  <KV label="Rate" value="RW-CORP" mono />
                  <KV label="Market" value="LEISURE" mono />
                  <KV label="Nights" value={String(folio.nights)} mono />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="ora-label">Outstanding Balance</div>
                <div
                  className={
                    "font-mono text-[24px] tabular-nums font-bold leading-none " +
                    (folio.balance > 0 ? "text-ora-red" : "text-ora-green")
                  }
                >
                  {folio.balance > 0 ? "$" : ""}
                  {fmtMoney(folio.balance, { plain: true })}
                </div>
                <div className="mt-1 text-[10px] text-ora-muted-2 uppercase tracking-wider">
                  {folio.balance > 0 ? "Due at check-out" : "Settled"}
                </div>
              </div>
            </div>

            {/* ROW 3 — Toolbar (Post Charge + "I Want To…") */}
            <div className="ora-toolbar">
              <button
                type="button"
                onClick={() => fireAction("Post Charge")}
                className="ora-btn ora-btn-primary h-7 text-[11.5px]"
              >
                + Post Charge
              </button>
              <IWantToButton
                size="sm"
                align="left"
                items={[
                  { label: "Post Payment", onClick: () => fireAction("Post Payment") },
                  { label: "Adjust", onClick: () => fireAction("Adjust") },
                  { label: "Transfer", onClick: () => fireAction("Transfer") },
                  { divider: true, label: "" },
                  { label: "Print Folio", onClick: () => fireAction("Print Folio") },
                  { label: "Email Folio", onClick: () => fireAction("Email Folio") },
                  { divider: true, label: "" },
                  { label: "Reverse", onClick: () => fireAction("Reverse"), danger: true },
                  { label: "Refund", onClick: () => fireAction("Refund"), danger: true },
                ]}
              />
              <span className="flex-1" />
              {toastMsg && (
                <span className="fade-up text-[11px] text-ora-charcoal px-2 py-1 bg-white border border-ora-hairline rounded-sm">
                  {toastMsg}
                </span>
              )}
            </div>

            {/* Billing windows — 8 sub-accounts (OPERA Cloud trademark) */}
            <div className="ora-mini-tabs" role="tablist" aria-label="Billing windows">
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  role="tab"
                  type="button"
                  data-active={activeWindow === n ? "true" : "false"}
                  onClick={() => setActiveWindow(n)}
                  title={`Billing window ${n}`}
                >
                  Win {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => fireAction("Add Window")}
                title="Add a billing window (mock)"
                style={{ color: "var(--ora-muted)" }}
              >
                + Add Window
              </button>
            </div>

            {/* ROW 4 — Sub-tab nav */}
            <div className="ora-mini-tabs">
              <button data-active={subTab === "detail" ? "true" : "false"} onClick={() => setSubTab("detail")}>
                Detail
              </button>
              <button data-active={subTab === "summary" ? "true" : "false"} onClick={() => setSubTab("summary")}>
                Summary
              </button>
              <button data-active={subTab === "routing" ? "true" : "false"} onClick={() => setSubTab("routing")}>
                Routing
              </button>
              <button data-active={subTab === "comp" ? "true" : "false"} onClick={() => setSubTab("comp")}>
                Comp Routing
              </button>
              <button data-active={subTab === "adj" ? "true" : "false"} onClick={() => setSubTab("adj")}>
                Adjustments
              </button>
              <button data-active={subTab === "receipts" ? "true" : "false"} onClick={() => setSubTab("receipts")}>
                Receipts
              </button>
              <button data-active={subTab === "stats" ? "true" : "false"} onClick={() => setSubTab("stats")}>
                Statistics
              </button>
            </div>

            {/* Content area */}
            <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-3 px-3 py-3">
              {/* Folio table */}
              <div className="ora-section overflow-hidden">
                <div className="ora-section-head">
                  <span className="ora-label">Folio — Window {activeWindow} of 8</span>
                  <span className="font-mono text-[10.5px] text-ora-muted">
                    {activeWindow === 1 ? `${linesWithBalance.length} postings` : "0 postings"}
                  </span>
                </div>
                {activeWindow !== 1 ? (
                  <div className="px-4 py-10 text-center text-[12px] text-ora-muted">
                    <div className="ora-label mb-2">Window {activeWindow}</div>
                    <p className="mb-2">No transactions routed to this window.</p>
                    <button
                      type="button"
                      onClick={() => fireAction(`Configure routing — Window ${activeWindow}`)}
                      className="text-ora-blue hover:underline text-[11.5px]"
                    >
                      Configure routing →
                    </button>
                  </div>
                ) : subTab === "detail" ? (
                  <table className="ora-table">
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Date</th>
                        <th style={{ width: 80 }}>Code</th>
                        <th>Description</th>
                        <th style={{ width: 110 }}>Reference</th>
                        <th style={{ width: 90 }}>Posted By</th>
                        <th className="right" style={{ width: 90 }}>Charges</th>
                        <th className="right" style={{ width: 90 }}>Credits</th>
                        <th className="right" style={{ width: 90 }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linesWithBalance.map((l, i) => (
                        <tr key={i}>
                          <td className="mono">{fmtDateShort(l.date)}</td>
                          <td className="mono font-semibold">{l.code}</td>
                          <td className="wrap">{l.description}</td>
                          <td className="mono text-ora-muted">{l.reference}</td>
                          <td className="mono text-ora-muted">{l.posted_by}</td>
                          <td className="right mono">
                            {l.charges > 0 ? fmtMoney(l.charges) : ""}
                          </td>
                          <td className="right mono text-ora-green">
                            {l.credits > 0 ? `(${fmtMoney(l.credits)})` : ""}
                          </td>
                          <td className="right mono font-semibold">
                            {fmtMoney(l.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#fafafa" }}>
                        <td colSpan={5} className="right font-semibold">
                          Subtotal
                        </td>
                        <td className="right mono font-semibold">
                          {fmtMoney(folio.subtotal)}
                        </td>
                        <td />
                        <td />
                      </tr>
                      <tr style={{ background: "#fafafa" }}>
                        <td colSpan={5} className="right font-semibold">
                          Tax (14%)
                        </td>
                        <td className="right mono font-semibold">{fmtMoney(folio.tax)}</td>
                        <td />
                        <td />
                      </tr>
                      <tr style={{ background: "#fafafa" }}>
                        <td colSpan={5} className="right font-semibold">
                          Total Charges
                        </td>
                        <td className="right mono font-semibold">{fmtMoney(folio.total)}</td>
                        <td />
                        <td />
                      </tr>
                      <tr style={{ background: "#fafafa" }}>
                        <td colSpan={5} className="right text-ora-muted">
                          Payments Received
                        </td>
                        <td />
                        <td className="right mono text-ora-green font-semibold">
                          ({fmtMoney(folio.payments)})
                        </td>
                        <td className="right mono font-bold text-ora-charcoal">
                          {fmtMoney(folio.balance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div className="px-4 py-8 text-center text-[12px] text-ora-muted">
                    <div className="ora-label mb-2">
                      {subTab === "summary" && "Summary View"}
                      {subTab === "routing" && "Charge Routing Rules"}
                      {subTab === "comp" && "Comp Routing"}
                      {subTab === "adj" && "Adjustments History"}
                      {subTab === "receipts" && "Receipts & Payments"}
                      {subTab === "stats" && "Account Statistics"}
                    </div>
                    No data to display in this view yet — use Detail tab for the full posting ledger.
                  </div>
                )}
              </div>

              {/* Right-side summary card */}
              <aside className="space-y-3">
                <div className="ora-section">
                  <div className="ora-section-head">
                    <span className="ora-label">Account Summary</span>
                  </div>
                  <dl className="px-3 py-2.5 text-[11.5px] space-y-1.5">
                    <SummaryRow label="Subtotal" value={fmtMoney(folio.subtotal)} />
                    {folio.discount > 0 && (
                      <SummaryRow label="Discount" value={`(${fmtMoney(folio.discount)})`} green />
                    )}
                    <SummaryRow label="Tax" value={fmtMoney(folio.tax)} />
                    <div className="border-t border-ora-hairline my-1.5" />
                    <SummaryRow label="Total Charges" value={fmtMoney(folio.total)} bold />
                    <SummaryRow
                      label="Total Payments"
                      value={`(${fmtMoney(folio.payments)})`}
                      green
                    />
                    <div className="border-t border-ora-hairline my-1.5" />
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-ora-charcoal">
                        Outstanding Balance
                      </span>
                      <span
                        className={
                          "font-mono text-[15px] tabular-nums font-bold " +
                          (folio.balance > 0 ? "text-ora-red" : "text-ora-green")
                        }
                      >
                        {fmtMoney(folio.balance)}
                      </span>
                    </div>
                  </dl>
                  <div className="px-3 py-2 border-t border-ora-hairline bg-ora-bg flex items-center justify-between text-[10.5px] text-ora-muted">
                    <span>Credit Limit</span>
                    <span className="font-mono tabular-nums text-ora-charcoal">$10,000.00</span>
                  </div>
                </div>

                <div className="ora-section">
                  <div className="ora-section-head">
                    <span className="ora-label">Payment Method</span>
                  </div>
                  <div className="px-3 py-3">
                    <div
                      className="rounded-md p-3 text-white relative overflow-hidden"
                      style={{
                        background:
                          "linear-gradient(135deg, #1F2937 0%, #374151 50%, #1F2937 100%)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] uppercase tracking-[0.18em] text-white/70">
                          American Express
                        </span>
                        <span className="text-[9.5px] uppercase tracking-wider text-white/70">
                          CENTURION
                        </span>
                      </div>
                      <div className="mt-3 font-mono text-[13px] tracking-[0.16em] tabular-nums">
                        •••• •••• •••• 4202
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-wider text-white/70">
                        <span>
                          Cardholder
                          <span className="block text-white text-[10px] tracking-normal">
                            {focused.name.toUpperCase()}
                          </span>
                        </span>
                        <span>
                          Exp
                          <span className="block text-white text-[10px] tracking-normal font-mono">
                            12/27
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-[10.5px] text-ora-muted-2 leading-relaxed">
                      Auth ID:{" "}
                      <span className="font-mono text-ora-charcoal">AUTH-AX-9847</span>{" "}
                      · Verified 14-MAY 09:12
                    </div>
                  </div>
                </div>

                <div className="ora-section">
                  <div className="ora-section-head">
                    <span className="ora-label">Routing Instructions</span>
                  </div>
                  <ul className="px-3 py-2 text-[11px] text-ora-charcoal space-y-1">
                    <li className="flex items-center justify-between">
                      <span>Window 1 — All charges</span>
                      <span className="ora-chip ora-chip-blue">DEFAULT</span>
                    </li>
                    <li className="flex items-center justify-between text-ora-muted">
                      <span>Window 2 — Co-pay (Corporate)</span>
                      <span>—</span>
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="ora-label" style={{ fontSize: 9.5 }}>
        {label}
      </span>
      <span
        className={
          "text-ora-charcoal text-[11.5px] " + (mono ? "font-mono tabular-nums" : "font-semibold")
        }
      >
        {value}
      </span>
    </span>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  green,
}: {
  label: string;
  value: string;
  bold?: boolean;
  green?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={"text-ora-muted " + (bold ? "font-semibold text-ora-charcoal" : "")}>
        {label}
      </span>
      <span
        className={
          "font-mono tabular-nums " +
          (bold ? "font-semibold text-ora-charcoal " : "") +
          (green ? "text-ora-green" : "text-ora-charcoal")
        }
      >
        {value}
      </span>
    </div>
  );
}
