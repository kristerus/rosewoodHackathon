"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ---------------- Local types (do NOT import from lib/types) ---------------- */
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
  date: string; // YYYY-MM-DD
  code: string;
  description: string;
  posted_by: string;
  charges: number; // positive for charges
  credits: number; // positive for credits
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
  const n = hashStr(guestId) % 900000 + 100000;
  return `RES-${n}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  const n = Math.max(1, Math.round(ms / 86400000));
  return n;
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

function fmtMoney(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (n < 0 ? "-$" : "$") + abs;
}

function fmtDateShort(iso: string): string {
  // YYYY-MM-DD -> "16-MAY"
  const d = new Date(iso);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
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
} {
  const seed = hashStr(guest.id);
  const rng = (i: number) => {
    const v = (seed * 9301 + (i + 1) * 49297) % 233280;
    return v / 233280;
  };

  const nights = nightsBetween(
    guest.booking_dates.check_in,
    guest.booking_dates.check_out,
  );
  const rate = rateForTier(guest.vip_tier);

  const lines: FolioLine[] = [];

  // Room & Tax line per night
  for (let i = 0; i < nights; i++) {
    const d = addDays(guest.booking_dates.check_in, i);
    lines.push({
      date: d,
      code: "RM-CHG",
      description: `Room Charge — RW-CORP`,
      posted_by: "AUTO",
      charges: rate,
      credits: 0,
    });
  }

  // 2-3 F&B charges
  const fbCount = 2 + Math.floor(rng(1) * 2); // 2 or 3
  for (let i = 0; i < fbCount; i++) {
    const outlet = FB_OUTLETS[i % FB_OUTLETS.length];
    const offset = Math.min(nights - 1, Math.floor(rng(2 + i) * nights));
    const d = addDays(guest.booking_dates.check_in, offset);
    const amount =
      Math.round((outlet.min + rng(10 + i) * (outlet.max - outlet.min)) * 100) /
      100;
    lines.push({
      date: d,
      code: outlet.code,
      description: outlet.desc,
      posted_by: i === 0 ? "J. LEE" : i === 1 ? "M. ORTEGA" : "K. NAKAMURA",
      charges: amount,
      credits: 0,
    });
  }

  // Resort fee (single posted line, $45/night)
  lines.push({
    date: guest.booking_dates.check_in,
    code: "RES-FEE",
    description: `Resort Fee — ${nights} night${nights > 1 ? "s" : ""} @ $45.00`,
    posted_by: "AUTO",
    charges: 45 * nights,
    credits: 0,
  });

  // Spa or Activities if past_stays > 5
  if (guest.past_stays > 5) {
    const offset = Math.min(nights - 1, Math.max(0, nights - 2));
    lines.push({
      date: addDays(guest.booking_dates.check_in, offset),
      code: "SPA-TRT",
      description: "Sense Spa — 80min Signature Treatment",
      posted_by: "S. DOYLE",
      charges: 350,
      credits: 0,
    });
  }

  // Sort by date then code
  lines.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.code.localeCompare(b.code);
  });

  // Compute subtotal of charges
  const subtotal = lines.reduce((s, l) => s + l.charges - l.credits, 0);
  const tax = Math.round(subtotal * 0.14 * 100) / 100;

  // Tax row at the end
  lines.push({
    date: guest.booking_dates.check_out,
    code: "TAX-OCC",
    description: "Occupancy Tax @ 14%",
    posted_by: "AUTO",
    charges: tax,
    credits: 0,
  });

  const total = subtotal + tax;

  // Mock payment — small balance if past_stays low, paid in full if high
  const isPaidInFull = guest.past_stays >= 3;
  const payments = isPaidInFull ? total : Math.round(total * 0.5 * 100) / 100;
  if (payments > 0) {
    lines.push({
      date: guest.booking_dates.check_in,
      code: "PMT-CC",
      description: "Payment — AMEX Centurion ending 4202",
      posted_by: "FRONTDESK",
      charges: 0,
      credits: payments,
    });
  }

  const balance = Math.round((total - payments) * 100) / 100;

  return { lines, subtotal, tax, total, payments, balance, nights, rate };
}

/* ---------------- VIP chip ---------------- */
function VipChip({ tier }: { tier: GuestLite["vip_tier"] }) {
  const map: Record<GuestLite["vip_tier"], { label: string; cls: string }> = {
    standard: { label: "Standard", cls: "ora-chip ora-chip-grey" },
    gold: { label: "Gold", cls: "ora-chip ora-chip-amber" },
    platinum: { label: "Platinum", cls: "ora-chip ora-chip-blue" },
    legacy: { label: "Legacy", cls: "ora-chip ora-chip-red" },
  };
  const m = map[tier];
  return <span className={m.cls}>{m.label}</span>;
}

/* ---------------- Component ---------------- */
export default function FolioTab({
  guests,
  focusedGuestId,
  onFocusGuest,
}: FolioTabProps) {
  const focused = useMemo(
    () => guests.find((g) => g.id === focusedGuestId) ?? null,
    [guests, focusedGuestId],
  );

  const folio = useMemo(
    () => (focused ? buildFolio(focused) : null),
    [focused],
  );

  // Inline toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const fireAction = (action: string) => {
    setToastMsg(`Action: ${action} (mock)`);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-ora-bg">
      {/* Left: guest selector list */}
      <div className="w-[260px] shrink-0 border-r border-ora-hairline bg-white flex flex-col">
        <div className="px-3 py-2 border-b border-ora-hairline flex items-center justify-between">
          <span className="ora-label">In-House Guests</span>
          <span className="ora-chip ora-chip-grey">{guests.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto scroll-rw">
          {guests.length === 0 && (
            <div className="px-3 py-6 text-[11.5px] text-ora-muted">
              No guests in-house.
            </div>
          )}
          {guests.map((g) => {
            const selected = g.id === focusedGuestId;
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
                  <span className="text-[12.5px] font-semibold text-ora-charcoal truncate">
                    {g.name}
                  </span>
                  <span className="font-mono text-[10.5px] text-ora-muted tabular-nums">
                    {g.room ? `RM ${g.room}` : "—"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-ora-muted tabular-nums">
                    {shortConf(g.id)}
                  </span>
                  <VipChip tier={g.vip_tier} />
                </div>
              </button>
            );
          })}
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
          <div className="p-4 space-y-3">
            {/* Summary header strip */}
            <div className="ora-card">
              <div className="grid grid-cols-12 gap-0 divide-x divide-ora-hairline">
                <SummaryCell
                  className="col-span-3"
                  label="Confirmation"
                  mono
                  value={shortConf(focused.id)}
                />
                <SummaryCell
                  className="col-span-3"
                  label="Guest"
                  value={focused.name}
                />
                <SummaryCell
                  className="col-span-1"
                  label="Room"
                  mono
                  value={focused.room ?? "—"}
                />
                <SummaryCell
                  className="col-span-2"
                  label="Arrival"
                  mono
                  value={fmtDateLong(focused.booking_dates.check_in)}
                />
                <SummaryCell
                  className="col-span-2"
                  label="Departure"
                  mono
                  value={fmtDateLong(focused.booking_dates.check_out)}
                />
                <SummaryCell
                  className="col-span-1"
                  label="Nights"
                  mono
                  value={String(folio.nights)}
                />
              </div>
              <div className="border-t border-ora-hairline grid grid-cols-12 gap-0 divide-x divide-ora-hairline">
                <SummaryCell
                  className="col-span-3"
                  label="Rate Code"
                  mono
                  value="RW-CORP"
                />
                <SummaryCell
                  className="col-span-3"
                  label="Market Segment"
                  mono
                  value="LEISURE"
                />
                <SummaryCell
                  className="col-span-2"
                  label="Daily Rate"
                  mono
                  value={fmtMoney(folio.rate)}
                />
                <SummaryCell
                  className="col-span-2"
                  label="Past Stays"
                  mono
                  value={String(focused.past_stays)}
                />
                <div className="col-span-2 px-3 py-2 flex items-center justify-between">
                  <span className="ora-label">VIP Tier</span>
                  <VipChip tier={focused.vip_tier} />
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="ora-card flex items-center gap-1 px-2 py-1.5">
              <ToolbarBtn label="Post Charge" onClick={() => fireAction("Post Charge")} primary />
              <ToolbarBtn label="Post Payment" onClick={() => fireAction("Post Payment")} />
              <ToolbarBtn label="Adjust" onClick={() => fireAction("Adjust")} />
              <span className="mx-1 h-5 w-px bg-ora-hairline" />
              <ToolbarBtn label="Print" onClick={() => fireAction("Print")} />
              <ToolbarBtn label="Email" onClick={() => fireAction("Email")} />
              <ToolbarBtn label="Reverse" onClick={() => fireAction("Reverse")} />
              <div className="flex-1" />
              {toastMsg && (
                <span className="fade-up text-[11.5px] text-ora-muted px-2 py-1 bg-ora-row-selected border border-ora-hairline rounded-sm">
                  {toastMsg}
                </span>
              )}
            </div>

            {/* Folio table */}
            <div className="ora-card overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-ora-hairline">
                    <Th>Date</Th>
                    <Th>Code</Th>
                    <Th className="w-full">Description</Th>
                    <Th>Posted By</Th>
                    <Th right>Charges</Th>
                    <Th right>Credits</Th>
                  </tr>
                </thead>
                <tbody>
                  {folio.lines.map((l, i) => (
                    <tr
                      key={i}
                      className="border-b border-ora-hairline hover:bg-ora-row-hover transition-colors"
                    >
                      <Td mono>{fmtDateShort(l.date)}</Td>
                      <Td mono>{l.code}</Td>
                      <Td>{l.description}</Td>
                      <Td mono className="text-ora-muted">
                        {l.posted_by}
                      </Td>
                      <Td right mono>
                        {l.charges > 0 ? fmtMoney(l.charges) : ""}
                      </Td>
                      <Td right mono className="text-ora-green">
                        {l.credits > 0 ? `(${fmtMoney(l.credits)})` : ""}
                      </Td>
                    </tr>
                  ))}

                  {/* Totals */}
                  <tr className="bg-[#FAFAFA]">
                    <Td colSpan={4} right mono className="font-semibold">
                      Subtotal
                    </Td>
                    <Td right mono className="font-semibold">
                      {fmtMoney(folio.subtotal)}
                    </Td>
                    <Td />
                  </tr>
                  <tr className="bg-[#FAFAFA] border-b border-ora-hairline">
                    <Td colSpan={4} right mono className="font-semibold">
                      Tax (14%)
                    </Td>
                    <Td right mono className="font-semibold">
                      {fmtMoney(folio.tax)}
                    </Td>
                    <Td />
                  </tr>
                  <tr className="bg-[#FAFAFA] border-b border-ora-hairline">
                    <Td colSpan={4} right mono className="font-semibold">
                      Total
                    </Td>
                    <Td right mono className="font-semibold">
                      {fmtMoney(folio.total)}
                    </Td>
                    <Td />
                  </tr>
                  <tr className="bg-[#FAFAFA]">
                    <Td colSpan={4} right mono className="text-ora-muted">
                      Payments
                    </Td>
                    <Td />
                    <Td right mono className="text-ora-green font-semibold">
                      ({fmtMoney(folio.payments)})
                    </Td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Balance + payment method */}
            <div className="ora-card flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="ora-label">Payment Method on File</span>
                <span className="font-mono text-[12.5px] text-ora-charcoal">
                  AMEX Centurion ending 4202
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="ora-label">Balance</span>
                <span
                  className={
                    "font-mono text-[18px] tabular-nums font-bold " +
                    (folio.balance > 0
                      ? "text-ora-red"
                      : "text-ora-green")
                  }
                >
                  {fmtMoney(folio.balance)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Internal layout helpers ---------------- */
function SummaryCell({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={"px-3 py-2 " + (className ?? "")}>
      <div className="ora-label mb-0.5">{label}</div>
      <div
        className={
          "text-[12.5px] text-ora-charcoal truncate " +
          (mono ? "font-mono tabular-nums" : "font-semibold")
        }
      >
        {value}
      </div>
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"ora-btn" + (primary ? " ora-btn-primary" : "")}
    >
      {label}
    </button>
  );
}

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
  colSpan,
  className,
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  colSpan?: number;
  className?: string;
}) {
  return (
    <td
      colSpan={colSpan}
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
