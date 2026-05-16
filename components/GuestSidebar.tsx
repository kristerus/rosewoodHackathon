"use client";

import React, { useEffect, useRef, useState } from "react";
import type {
  Department,
  Guest,
  GuestBrief,
  GuestMetadata,
  Ticket,
  TicketStatus,
} from "@/lib/types";
import { useAppStore, type Prediction } from "@/lib/store";
import { useToast } from "@/components/Toaster";
import IWantToButton from "@/components/IWantToButton";

interface GuestSidebarProps {
  guest: Guest | null;
  tickets: Ticket[];
  predictions: Prediction[];
  isGeneratingBrief: boolean;
  isGeneratingPredictions: boolean;
  onGenerateBrief: () => void;
  onGeneratePredictions: () => void;
  onEditPreArrival?: () => void;
}

const TIER_META: Record<
  Guest["vip_tier"],
  { label: string; chip: string }
> = {
  standard: { label: "Standard", chip: "ora-chip-grey" },
  gold: { label: "Gold", chip: "ora-chip-amber" },
  platinum: { label: "Platinum", chip: "ora-chip-blue" },
  legacy: { label: "Legacy Patron", chip: "ora-chip-red" },
};

const DEPT_LABEL: Record<Department, string> = {
  concierge: "Concierge",
  housekeeping: "Housekeeping",
  fnb: "F&B",
  maintenance: "Engineering",
  frontdesk: "Front Desk",
};

const DEPT_CODE: Record<Department, string> = {
  concierge: "CON",
  housekeeping: "HSK",
  fnb: "F&B",
  maintenance: "ENG",
  frontdesk: "FOM",
};

const CONFIDENCE_META: Record<
  Prediction["confidence"],
  { label: string; chip: string }
> = {
  low: { label: "Low", chip: "ora-chip-grey" },
  medium: { label: "Medium", chip: "ora-chip-blue" },
  high: { label: "High", chip: "ora-chip-green" },
};

const STATUS_CHIP: Record<TicketStatus, string> = {
  open: "ora-chip-amber",
  "in-progress": "ora-chip-blue",
  resolved: "ora-chip-green",
  escalated: "ora-chip-red",
};

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

function profileId(guestId: string): string {
  let n = 0;
  for (let i = 0; i < guestId.length; i++) n = (n * 31 + guestId.charCodeAt(i)) >>> 0;
  return `${(n % 1_000_000).toString().padStart(6, "0")}`;
}

function srShort(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 33 + id.charCodeAt(i)) >>> 0;
  return `${(n % 100000).toString().padStart(5, "0")}`;
}

function diffDays(a: string, b: string): number {
  try {
    const A = new Date(a).getTime();
    const B = new Date(b).getTime();
    return Math.max(1, Math.round((B - A) / (24 * 3600 * 1000)));
  } catch {
    return 1;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function GuestSidebar({
  guest,
  tickets,
  predictions,
  isGeneratingBrief,
  isGeneratingPredictions,
  onGenerateBrief,
  onGeneratePredictions,
  onEditPreArrival,
}: GuestSidebarProps) {
  const profileLocked = useAppStore((s) => s.profileLocked);
  const toggleProfileLock = useAppStore((s) => s.toggleProfileLock);
  const selectTicket = useAppStore((s) => s.selectTicket);
  const guestMetadata = useAppStore((s) => s.guestMetadata);
  const setGuestMetadata = useAppStore((s) => s.setGuestMetadata);
  const { toast } = useToast();

  // On guest focus change, hydrate metadata from the server.
  useEffect(() => {
    if (!guest?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/guest-metadata?guest_id=${encodeURIComponent(guest.id)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { metadata: GuestMetadata | null };
        if (cancelled || !data.metadata) return;
        setGuestMetadata(guest.id, data.metadata);
      } catch {
        // ignore — UI still works without persisted metadata
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guest?.id, setGuestMetadata]);

  if (!guest) {
    return (
      <aside className="flex h-full w-full flex-col bg-white border-l border-ora-hairline">
        <div className="px-4 py-2.5 border-b border-ora-hairline bg-ora-bg">
          <h3 className="ora-label">Guest Profile</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <p className="text-[12.5px] font-semibold text-ora-charcoal">
              No profile selected
            </p>
            <p className="mt-1 text-[11px] text-ora-muted max-w-[240px] leading-relaxed">
              The golden profile, AI research and anticipated needs appear here
              when a reservation is in focus.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const tier = TIER_META[guest.vip_tier];
  const stayLen = diffDays(
    guest.booking_dates.check_in,
    guest.booking_dates.check_out,
  );
  const locked = !!profileLocked[guest.id];

  return (
    <aside className="flex h-full w-full flex-col bg-white border-l border-ora-hairline relative">
      {/* Section header */}
      <div className="px-4 py-2 border-b border-ora-hairline bg-ora-bg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="ora-label text-ora-charcoal">Guest Profile</h3>
          <span className="font-mono text-[10.5px] text-ora-muted-2 tabular-nums">
            #{profileId(guest.id)}
          </span>
        </div>
        <IWantToButton
          size="sm"
          align="right"
          items={[
            {
              label: "Generate Research",
              onClick: () => onGenerateBrief(),
            },
            {
              label: "Edit Pre-Arrival",
              onClick: () => {
                if (onEditPreArrival) onEditPreArrival();
                else toast("Pre-arrival editor unavailable", "info");
              },
            },
            { label: "Send Message", onClick: () => toast("Message dialog (mock)", "info") },
            { label: "Add Note", onClick: () => toast("Open Notes tab to add a note", "info") },
            { divider: true, label: "" },
            { label: "Print Profile", onClick: () => toast("Print profile (mock)", "info") },
            {
              label: "Merge Duplicates",
              onClick: () => toast("Merge profiles (mock)", "info"),
              danger: true,
            },
          ]}
        />
      </div>

      <div className="scroll-rw flex-1 min-h-0 overflow-y-auto">
        {/* Profile header card */}
        <div className="px-4 pt-4 pb-3 border-b border-ora-hairline">
          <div className="flex items-start gap-3">
            <div
              className="h-12 w-12 shrink-0 rounded-sm border border-ora-hairline bg-ora-bg flex items-center justify-center text-[14px] font-bold text-ora-charcoal"
              aria-hidden
            >
              {initials(guest.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[14.5px] font-semibold text-ora-charcoal leading-tight truncate">
                  {guest.name}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    toggleProfileLock(guest.id);
                    toast(
                      locked ? "Profile unlocked" : "Profile locked",
                      "info",
                    );
                  }}
                  aria-label={locked ? "Unlock profile" : "Lock profile"}
                  title={
                    locked
                      ? "Profile locked — click to unlock"
                      : "Profile open — click to lock"
                  }
                  className={`h-5 w-5 rounded-sm flex items-center justify-center hover:bg-ora-row-hover ${
                    locked ? "text-ora-red" : "text-ora-muted-2"
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="4" y="11" width="16" height="10" rx="1" />
                    {locked ? (
                      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
                    ) : (
                      <path d="M8 11V7a4 4 0 1 1 8 0" />
                    )}
                  </svg>
                </button>
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className={`ora-chip ${tier.chip}`}>
                  {guest.vip_tier === "legacy" && (
                    <span aria-hidden>★</span>
                  )}
                  {tier.label.toUpperCase()}
                </span>
                {guest.room && (
                  <span className="ora-chip ora-chip-blue">
                    ROOM {guest.room}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats tiles — tighter */}
          <div className="mt-2.5 grid grid-cols-4 gap-0 border border-ora-hairline rounded-sm overflow-hidden">
            <StatTile label="Nights" value={`${stayLen}`} />
            <StatTile label="Stays" value={String(guest.past_stays)} divider />
            <StatTile
              label="LTV"
              value={`$${(guest.past_stays * 8.5).toFixed(1)}k`}
              divider
            />
            <StatTile label="ADR" value="$1.85k" divider />
          </div>

          {guest.notes && (
            <div className="mt-3 rounded-sm border border-ora-amber/40 bg-ora-amber-soft px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ color: "var(--ora-amber)" }}>
                  <path d="M12 2L1 21h22L12 2zm0 6l7.5 13h-15L12 8zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z" />
                </svg>
                <span className="ora-label" style={{ color: "var(--ora-amber)" }}>
                  Profile Alert · Standing Note
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-[#7B4A07]">
                {guest.notes}
              </p>
            </div>
          )}
        </div>

        {/* Pre-Arrival Information */}
        <Section
          title="Pre-Arrival Information"
          accent={
            onEditPreArrival && (
              <button
                type="button"
                onClick={onEditPreArrival}
                className="text-[10.5px] font-semibold tracking-wider uppercase text-ora-red hover:text-ora-red-deep transition-colors"
              >
                {guestMetadata[guest.id] ? "Edit" : "+ Add"}
              </button>
            )
          }
        >
          {guestMetadata[guest.id] ? (
            <PreArrivalBlock metadata={guestMetadata[guest.id]} />
          ) : (
            <div className="rounded-sm border border-dashed border-ora-hairline-2 px-3 py-3">
              <p className="text-[11.5px] text-ora-muted leading-relaxed">
                Capture ETA, flight, dietary needs, room prefs and welcome
                setup from a guest email or by hand.
              </p>
              {onEditPreArrival && (
                <button
                  type="button"
                  onClick={onEditPreArrival}
                  className="ora-btn mt-2.5"
                >
                  Add Pre-Arrival Info
                </button>
              )}
            </div>
          )}
        </Section>

        <div className="hairline mx-4" />

        {/* Documents */}
        <Section
          title="Documents"
          accent={
            <span className="text-[10px] text-ora-muted-2 tabular-nums">3 on file</span>
          }
        >
          <div className="space-y-1.5">
            <DocRow
              icon="passport"
              label="Passport"
              meta="USA · ••••5847 · Exp 03/2031"
              verified
            />
            <DocRow
              icon="id"
              label="Driver License"
              meta="CA · ••••2104 · Exp 11/2028"
              verified
            />
            <DocRow
              icon="cc"
              label="Credit Card"
              meta="AMEX Centurion ending 4202"
              verified
            />
          </div>
        </Section>

        <div className="hairline mx-4" />

        {/* Communication Preferences */}
        <Section
          title="Communication Preferences"
          accent={
            <span className="text-[10px] text-ora-muted-2 uppercase tracking-wider">
              GDPR · opt-in
            </span>
          }
        >
          <div className="ora-card px-3 py-2">
            <CommRow label="Email" on />
            <CommRow label="SMS" on />
            <CommRow label="Phone Call" />
            <CommRow label="Postal Mail" />
            <CommRow label="WhatsApp" on />
          </div>
        </Section>

        <div className="hairline mx-4" />

        {/* Research */}
        <Section
          title="Research"
          accent={
            <span className="text-[9.5px] text-ora-muted-2 tracking-wider uppercase font-semibold">
              Source: Public Web
            </span>
          }
        >
          {guest.research_brief ? (
            <BriefBlock brief={guest.research_brief} />
          ) : (
            <div className="rounded-sm border border-dashed border-ora-hairline-2 px-3 py-3">
              <p className="text-[11.5px] text-ora-muted leading-relaxed">
                Pull a 360° view from public sources — role, recent news,
                conversation starters and inferred preferences.
              </p>
              <button
                type="button"
                onClick={onGenerateBrief}
                disabled={isGeneratingBrief}
                className="ora-btn ora-btn-primary mt-2.5"
              >
                {isGeneratingBrief ? (
                  <>
                    <Spinner />
                    Researching the web…
                  </>
                ) : (
                  <>Research</>
                )}
              </button>
            </div>
          )}
        </Section>

        <div className="hairline mx-4" />

        {/* Anticipated Needs */}
        <Section
          title="Anticipated Needs"
          accent={
            <span className="ora-chip ora-chip-blue">AI · Predictive</span>
          }
        >
          {predictions.length > 0 ? (
            <ul className="space-y-2">
              {predictions.map((p) => {
                const conf = CONFIDENCE_META[p.confidence];
                return (
                  <li
                    key={p.id}
                    className="ora-card px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[12.5px] font-semibold text-ora-charcoal leading-snug">
                        {p.title}
                      </h4>
                      <span className={`ora-chip ${conf.chip} shrink-0`}>
                        {conf.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-ora-muted leading-relaxed">
                      {p.rationale}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="ora-chip ora-chip-grey font-mono">
                        {DEPT_CODE[p.suggested_department]}
                      </span>
                      <span className="text-[10.5px] text-ora-muted-2">
                        {DEPT_LABEL[p.suggested_department]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-sm border border-dashed border-ora-hairline-2 px-3 py-3">
              <p className="text-[11.5px] text-ora-muted leading-relaxed">
                Surface the next 2–3 things this guest is likely to need before
                they ask.
              </p>
              <button
                type="button"
                onClick={onGeneratePredictions}
                disabled={isGeneratingPredictions}
                className="ora-btn ora-btn-primary mt-2.5"
              >
                {isGeneratingPredictions ? (
                  <>
                    <Spinner />
                    Computing…
                  </>
                ) : (
                  <>Generate Anticipated Needs</>
                )}
              </button>
            </div>
          )}
        </Section>

        <div className="hairline mx-4" />

        {/* Stay History */}
        <Section
          title="Stay History"
          accent={
            <span className="text-[10px] text-ora-muted-2 tabular-nums">
              {tickets.length} SR{tickets.length === 1 ? "" : "s"}
            </span>
          }
        >
          {tickets.length === 0 ? (
            <p className="text-[11.5px] text-ora-muted">
              No interactions recorded yet.
            </p>
          ) : (
            <div className="ora-card overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[44px_60px_44px_minmax(0,1fr)_60px] gap-2 px-2.5 py-1.5 border-b border-ora-hairline bg-ora-bg">
                <span className="ora-label">Time</span>
                <span className="ora-label">SR#</span>
                <span className="ora-label">Dept</span>
                <span className="ora-label">Subject</span>
                <span className="ora-label text-right">Status</span>
              </div>
              <ul>
                {tickets.slice(0, 8).map((t) => {
                  const status: TicketStatus = t.status ?? "open";
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => selectTicket(t.id)}
                        className="w-full text-left grid grid-cols-[44px_60px_44px_minmax(0,1fr)_60px] gap-2 px-2.5 py-1.5 border-b border-ora-hairline last:border-b-0 text-[11px] hover:bg-ora-row-hover"
                      >
                        <span className="text-ora-muted-2 tabular-nums">
                          {formatTime(t.timestamp)}
                        </span>
                        <span className="text-ora-charcoal font-mono tabular-nums">
                          {srShort(t.id)}
                        </span>
                        <span className="text-ora-muted font-mono">
                          {DEPT_CODE[t.department]}
                        </span>
                        <span className="text-ora-charcoal truncate" title={t.intent}>
                          {t.intent}
                        </span>
                        <span className="text-right">
                          <span className={`ora-chip ${STATUS_CHIP[status]}`}>
                            {status === "in-progress" ? "WIP" : status.slice(0, 4).toUpperCase()}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {tickets.length > 8 && (
                <div className="px-2.5 py-1.5 border-t border-ora-hairline bg-ora-bg text-center">
                  <span className="text-[11px] text-ora-muted">
                    {tickets.length - 8} more not shown
                  </span>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Locked overlay */}
      {locked && (
        <div className="absolute inset-0 z-20 bg-white/55 backdrop-blur-[0.5px] flex items-center justify-center px-6 text-center pointer-events-none">
          <div className="pointer-events-auto bg-white border border-ora-hairline-2 rounded-sm shadow-[0_4px_14px_rgba(0,0,0,0.08)] px-4 py-3 max-w-[260px]">
            <div className="flex items-center justify-center mb-1.5 text-ora-red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="4" y="11" width="16" height="10" rx="1" />
                <path d="M8 11V7a4 4 0 1 1 8 0v4" />
              </svg>
            </div>
            <p className="text-[12px] font-semibold text-ora-charcoal">
              Profile locked
            </p>
            <p className="mt-1 text-[11px] text-ora-muted leading-relaxed">
              Contact data steward to unlock. Click the lock icon above to
              toggle in this demo.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ---------- Sub-components ---------- */

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="ora-label">{title}</h4>
        {accent}
      </div>
      {children}
    </section>
  );
}

function StatTile({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      className={`px-1.5 py-1.5 bg-white ${divider ? "border-l border-ora-hairline" : ""}`}
    >
      <div className="text-[9px] uppercase tracking-wider text-ora-muted font-semibold">{label}</div>
      <div className="mt-0.5 font-semibold text-ora-charcoal tabular-nums text-[12.5px]">
        {value}
      </div>
    </div>
  );
}

function BriefBlock({ brief }: { brief: GuestBrief }) {
  return (
    <div className="space-y-3 ora-card px-3 py-3">
      <p className="text-[12px] leading-relaxed text-ora-charcoal">
        {brief.summary}
      </p>
      {brief.professional && (
        <p className="text-[11px] text-ora-muted italic leading-relaxed">
          {brief.professional}
        </p>
      )}
      {brief.recent_news?.length > 0 && (
        <BriefList title="Recent" items={brief.recent_news} />
      )}
      {brief.conversation_starters?.length > 0 && (
        <BriefList title="Conversation Starters" items={brief.conversation_starters} />
      )}
      {brief.preferences_inferred?.length > 0 && (
        <BriefList title="Inferred Preferences" items={brief.preferences_inferred} />
      )}
      <div className="pt-2 border-t border-ora-hairline text-[10px] text-ora-muted-2 leading-relaxed">
        <span className="font-semibold uppercase tracking-wider">Sources:</span>{" "}
        synthesized from public web search via Anthropic Claude
      </div>
    </div>
  );
}

/* ---------- Pre-Arrival display ---------- */
function PreArrivalBlock({ metadata }: { metadata: GuestMetadata }) {
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (metadata.eta) rows.push({ label: "ETA", value: metadata.eta });
  if (metadata.departure_time)
    rows.push({ label: "Departure", value: metadata.departure_time });
  if (metadata.flight_arrival)
    rows.push({ label: "Inbound Flight", value: metadata.flight_arrival });
  if (metadata.flight_departure)
    rows.push({ label: "Outbound Flight", value: metadata.flight_departure });
  if (typeof metadata.party_size === "number")
    rows.push({ label: "Party Size", value: String(metadata.party_size) });
  if (metadata.accompanying_guests?.length)
    rows.push({
      label: "Accompanying",
      value: metadata.accompanying_guests.join(", "),
    });
  if (metadata.special_occasion)
    rows.push({ label: "Occasion", value: metadata.special_occasion });
  if (metadata.dietary_restrictions?.length)
    rows.push({
      label: "Dietary",
      value: <ChipRow items={metadata.dietary_restrictions} />,
    });
  if (metadata.allergies?.length)
    rows.push({
      label: "Allergies",
      value: <ChipRow items={metadata.allergies} danger />,
    });
  if (metadata.room_preferences?.length)
    rows.push({
      label: "Room Prefs",
      value: <ChipRow items={metadata.room_preferences} />,
    });
  if (metadata.airport_transfer_needed)
    rows.push({
      label: "Transfer",
      value: metadata.airport_transfer_details || "Required",
    });
  if (metadata.welcome_amenities?.length)
    rows.push({
      label: "Amenities",
      value: <ChipRow items={metadata.welcome_amenities} />,
    });
  if (metadata.pre_stocked_items?.length)
    rows.push({
      label: "Pre-Stock",
      value: <ChipRow items={metadata.pre_stocked_items} />,
    });
  if (metadata.free_form_notes)
    rows.push({ label: "Notes", value: metadata.free_form_notes });

  if (rows.length === 0) {
    return (
      <p className="text-[11.5px] text-ora-muted">
        No fields captured yet — click Edit to add.
      </p>
    );
  }

  return (
    <div className="ora-card px-3 py-2.5">
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 items-start"
          >
            <dt className="ora-label">{r.label}</dt>
            <dd className="text-[11.5px] text-ora-charcoal leading-relaxed">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      {metadata.updated_at && (
        <div className="mt-2 pt-2 border-t border-ora-hairline text-[10px] text-ora-muted-2">
          Updated {new Date(metadata.updated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function ChipRow({ items, danger }: { items: string[]; danger?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it, i) => (
        <span
          key={`${it}-${i}`}
          className={
            "inline-flex items-center px-1.5 h-5 text-[10.5px] rounded-sm border " +
            (danger
              ? "bg-ora-red-soft border-[#f6cdc7] text-ora-red-deep"
              : "bg-ora-row-hover border-ora-hairline text-ora-charcoal")
          }
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="ora-label mb-1">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li
            key={`${title}-${i}`}
            className="flex gap-2 text-[11.5px] text-ora-charcoal leading-relaxed"
          >
            <span
              className="mt-[6px] h-1 w-1 rounded-full shrink-0"
              style={{ backgroundColor: "var(--ora-red)" }}
            />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DocRow({
  icon,
  label,
  meta,
  verified,
}: {
  icon: "passport" | "id" | "cc";
  label: string;
  meta: string;
  verified?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border border-ora-hairline rounded-sm bg-white hover:bg-ora-row-hover">
      <span
        className="h-7 w-7 shrink-0 rounded-sm flex items-center justify-center"
        style={{ background: "var(--ora-bg)", color: "var(--ora-muted)" }}
        aria-hidden
      >
        {icon === "passport" && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
            <circle cx="12" cy="11" r="3" />
            <path d="M9 17h6" />
          </svg>
        )}
        {icon === "id" && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <circle cx="8" cy="12" r="2.5" />
            <path d="M14 10h6M14 14h4" />
          </svg>
        )}
        {icon === "cc" && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-semibold text-ora-charcoal leading-tight truncate">
          {label}
        </div>
        <div className="text-[10px] text-ora-muted font-mono tabular-nums truncate">
          {meta}
        </div>
      </div>
      {verified && (
        <span className="ora-chip ora-chip-green shrink-0">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          OK
        </span>
      )}
    </div>
  );
}

function CommRow({ label, on }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-ora-hairline last:border-b-0">
      <span className="text-[11.5px] text-ora-charcoal">{label}</span>
      <span
        className={
          "inline-flex items-center gap-1 text-[10.5px] font-semibold " +
          (on ? "text-ora-green" : "text-ora-muted-2")
        }
      >
        {on ? (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            Opted in
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Opted out
          </>
        )}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
