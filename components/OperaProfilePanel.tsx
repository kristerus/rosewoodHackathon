"use client";

import React from "react";
import type { Guest, Ticket } from "@/lib/types";

interface OperaProfilePanelProps {
  guest: Guest | null;
  onGenerateBrief: () => void;
}

const TIER_META: Record<
  Guest["vip_tier"],
  { label: string; className: string }
> = {
  standard: {
    label: "Standard",
    className: "border-rw-stone-line text-rw-mute bg-white",
  },
  gold: {
    label: "Gold",
    className: "border-rw-brass/40 text-rw-brass bg-rw-brass/5",
  },
  platinum: {
    label: "Platinum",
    className: "border-rw-forest/30 text-rw-forest bg-rw-forest/5",
  },
  legacy: {
    label: "Legacy Patron",
    className:
      "border-rw-brass text-rw-cream-soft bg-gradient-to-br from-rw-brass to-[#8a6b3a]",
  },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function OperaProfilePanel({
  guest,
  onGenerateBrief,
}: OperaProfilePanelProps) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-rw-stone-line bg-rw-cream-soft shadow-sm overflow-hidden">
      <header className="flex items-baseline justify-between px-8 pt-7 pb-4">
        <div>
          <div className="eyebrow eyebrow-brass">
            OPERA PMS · GOLDEN PROFILE
          </div>
          <h2 className="mt-1.5 font-serif text-[26px] leading-tight text-rw-forest">
            Guest Dossier
          </h2>
          <p className="mt-1 text-[12px] text-rw-mute">
            Synced from Oracle Opera · enriched by RoseWood AI
          </p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-rw-brass" />
      </header>
      <div className="hairline mx-8" />

      <div className="scroll-rw flex-1 overflow-y-auto px-8 py-6">
        {!guest ? <EmptyState /> : <GuestBody guest={guest} onGenerateBrief={onGenerateBrief} />}
      </div>
    </section>
  );
}

function GuestBody({
  guest,
  onGenerateBrief,
}: {
  guest: Guest;
  onGenerateBrief: () => void;
}) {
  const tier = TIER_META[guest.vip_tier];
  const initials = guest.name
    .replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, "")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-7">
      {/* Identity */}
      <div className="flex items-start gap-5">
        <div className="relative h-16 w-16 shrink-0 rounded-full bg-rw-forest text-rw-cream-soft flex items-center justify-center font-serif text-[22px] tracking-wide">
          {initials}
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-rw-brass border-2 border-rw-cream-soft" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[24px] leading-tight text-rw-forest">
            {guest.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-rw-mute">
            <span>{guest.room ? `Room ${guest.room}` : "Awaiting check-in"}</span>
            <span className="text-rw-stone-line">·</span>
            <span>
              {formatDate(guest.booking_dates.check_in)}—
              {formatDate(guest.booking_dates.check_out)}
            </span>
            <span className="text-rw-stone-line">·</span>
            <span className="tabular-nums">{guest.past_stays} past stays</span>
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.16em] ${tier.className}`}
        >
          {guest.vip_tier === "legacy" && (
            <span className="text-[10px]" aria-hidden>
              ✦
            </span>
          )}
          {tier.label}
        </span>
      </div>

      {/* Internal note */}
      {guest.notes && (
        <div className="rounded-2xl border border-rw-brass/30 bg-rw-brass/5 px-5 py-4">
          <div className="eyebrow eyebrow-brass mb-1">Standing Note</div>
          <p className="text-[13px] leading-relaxed text-rw-ink italic">
            {guest.notes}
          </p>
        </div>
      )}

      {/* Preferences */}
      <Section title="Preferences">
        {guest.preferences.length === 0 ? (
          <p className="text-[12px] text-rw-mute">No recorded preferences.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {guest.preferences.map((p) => (
              <li
                key={p}
                className="rounded-full border border-rw-stone-line bg-white px-3 py-1.5 text-[12px] text-rw-ink"
              >
                {p}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Guest Brief */}
      <Section
        title="Guest Brief"
        accessory={
          !guest.research_brief && (
            <button
              type="button"
              onClick={onGenerateBrief}
              className="rounded-full border border-rw-forest/30 bg-rw-forest text-rw-cream-soft px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] hover:bg-rw-forest-deep transition-colors"
            >
              Generate Brief
            </button>
          )
        }
      >
        {guest.research_brief ? (
          <BriefBlock brief={guest.research_brief} />
        ) : (
          <div className="rounded-2xl border border-dashed border-rw-stone-line px-5 py-4">
            <p className="text-[12px] text-rw-mute leading-relaxed">
              No brief generated yet. The AI will surface a 360° view from
              public sources — role, recent news, conversation starters and
              inferred preferences.
            </p>
          </div>
        )}
      </Section>

      {/* Interaction log */}
      <Section
        title="Interaction Log"
        accessory={
          <span className="text-[10px] uppercase tracking-[0.2em] text-rw-mute">
            {guest.interaction_log.length} recent
          </span>
        }
      >
        {guest.interaction_log.length === 0 ? (
          <p className="text-[12px] text-rw-mute">
            No interactions recorded for this stay yet.
          </p>
        ) : (
          <ol className="relative space-y-4 pl-5">
            <span className="absolute left-[5px] top-1 bottom-1 w-px bg-rw-stone-line" />
            {guest.interaction_log.map((t) => (
              <InteractionItem key={t.id} ticket={t} />
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function BriefBlock({ brief }: { brief: NonNullable<Guest["research_brief"]> }) {
  return (
    <div className="rounded-2xl border border-rw-stone-line bg-white px-5 py-4 space-y-4">
      <p className="text-[13px] leading-relaxed text-rw-ink">{brief.summary}</p>
      {brief.professional && (
        <p className="text-[12px] text-rw-mute italic">{brief.professional}</p>
      )}
      {brief.recent_news?.length > 0 && (
        <BriefList title="Recent" items={brief.recent_news} />
      )}
      {brief.conversation_starters?.length > 0 && (
        <BriefList title="Conversation" items={brief.conversation_starters} />
      )}
      {brief.preferences_inferred?.length > 0 && (
        <BriefList title="Inferred preferences" items={brief.preferences_inferred} />
      )}
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li
            key={`${title}-${i}`}
            className="text-[12.5px] text-rw-ink leading-relaxed flex gap-2"
          >
            <span className="mt-1.5 h-1 w-1 rounded-full bg-rw-brass shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InteractionItem({ ticket }: { ticket: Ticket }) {
  return (
    <li className="relative">
      <span className="absolute -left-[18px] top-1.5 h-2 w-2 rounded-full bg-rw-brass ring-4 ring-rw-cream-soft" />
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{ticket.department}</span>
        <span className="text-[10px] text-rw-mute">
          {formatTime(ticket.timestamp)}
        </span>
      </div>
      <p className="mt-0.5 font-serif text-[15px] leading-snug text-rw-forest">
        {ticket.intent}
      </p>
      {ticket.action_required && (
        <p className="mt-0.5 text-[12px] text-rw-mute leading-relaxed">
          {ticket.action_required}
        </p>
      )}
    </li>
  );
}

function Section({
  title,
  accessory,
  children,
}: {
  title: string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="eyebrow">{title}</h4>
        {accessory}
      </div>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center py-16">
      <div className="h-px w-12 bg-rw-brass mb-5" />
      <p className="font-serif text-[20px] text-rw-forest">No guest in focus</p>
      <p className="mt-2 text-[12px] text-rw-mute max-w-[280px] leading-relaxed">
        Select a guest from the demo controls to load their Opera profile and
        interaction history.
      </p>
    </div>
  );
}
