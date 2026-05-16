"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Guest } from "@/lib/types";

interface ArrivalCountdownPanelProps {
  guests: Guest[];
  onClose: () => void;
  onGenerateBrief: (guestId: string) => Promise<void>;
}

type Phase = "idle" | "countdown" | "brief" | "arrived";

const TIER_META: Record<
  Guest["vip_tier"],
  { label: string; dot: string; badge: string }
> = {
  standard: {
    label: "Standard",
    dot: "bg-rw-stone-line",
    badge: "border-rw-stone-line text-rw-mute bg-white",
  },
  gold: {
    label: "Gold",
    dot: "bg-rw-brass",
    badge: "border-rw-brass/40 text-rw-brass bg-rw-brass/5",
  },
  platinum: {
    label: "Platinum",
    dot: "bg-rw-forest",
    badge: "border-rw-forest/30 text-rw-forest bg-rw-forest/5",
  },
  legacy: {
    label: "Legacy Patron",
    dot: "bg-rw-brass",
    badge: "border-rw-brass text-rw-cream-soft bg-gradient-to-br from-rw-brass to-[#8a6b3a]",
  },
};

const SIMULATION_DURATION_S = 30;

export default function ArrivalCountdownPanel({
  guests,
  onClose,
  onGenerateBrief,
}: ArrivalCountdownPanelProps) {
  const [selectedGuestId, setSelectedGuestId] = useState<string>(
    guests[0]?.id ?? ""
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(SIMULATION_DURATION_S);
  const [isFetchingBrief, setIsFetchingBrief] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedGuest = guests.find((g) => g.id === selectedGuestId) ?? null;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setSecondsLeft(SIMULATION_DURATION_S);
    setIsFetchingBrief(false);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startCountdown = useCallback(async () => {
    if (!selectedGuest) return;
    reset();

    // Fetch brief if not already generated
    if (!selectedGuest.research_brief) {
      setIsFetchingBrief(true);
      try {
        await onGenerateBrief(selectedGuestId);
      } finally {
        setIsFetchingBrief(false);
      }
    }

    setPhase("countdown");
    setSecondsLeft(SIMULATION_DURATION_S);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearTimer();
          setPhase("arrived");
          return 0;
        }
        // At halfway (T-5 equivalent): show brief card
        if (next === Math.floor(SIMULATION_DURATION_S / 2)) {
          setPhase("brief");
        }
        return next;
      });
    }, 1000);
  }, [selectedGuest, selectedGuestId, reset, clearTimer, onGenerateBrief]);

  const progressPct =
    phase === "arrived"
      ? 100
      : ((SIMULATION_DURATION_S - secondsLeft) / SIMULATION_DURATION_S) * 100;

  const minsLeft = Math.ceil(secondsLeft / (SIMULATION_DURATION_S / 5));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rw-ink/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-rw-stone-line bg-rw-cream-soft shadow-2xl"
        style={{ animation: "fade-up 0.25s ease-out both" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-4">
          <div>
            <div className="eyebrow eyebrow-brass">ARRIVAL SIMULATION</div>
            <h2 className="mt-1.5 font-serif text-[26px] leading-tight text-rw-forest">
              Pre-Arrival Intelligence
            </h2>
            <p className="mt-1 text-[12px] text-rw-mute">
              Simulates the 5-minute arrival alert flow for front desk staff.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 h-8 w-8 rounded-full border border-rw-stone-line bg-white text-rw-mute hover:text-rw-forest hover:border-rw-brass transition-colors flex items-center justify-center text-[16px]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="hairline mx-8" />

        <div className="px-8 py-6 space-y-6">
          {/* Guest selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="eyebrow shrink-0">Select Guest</label>
            <select
              value={selectedGuestId}
              onChange={(e) => {
                setSelectedGuestId(e.target.value);
                reset();
              }}
              disabled={phase !== "idle"}
              className="flex-1 min-w-[200px] rounded-full border border-rw-stone-line bg-white px-4 py-2 text-[13px] text-rw-ink focus:outline-none focus:border-rw-brass disabled:opacity-50"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.room ? ` · Room ${g.room}` : ""}
                </option>
              ))}
            </select>

            {phase === "idle" ? (
              <button
                type="button"
                onClick={startCountdown}
                disabled={!selectedGuest || isFetchingBrief}
                className="rounded-full bg-rw-forest text-rw-cream-soft px-5 py-2 text-[12px] uppercase tracking-[0.18em] hover:bg-rw-forest-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isFetchingBrief ? "Preparing…" : "Simulate Arrival in 5 min"}
              </button>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-rw-stone-line bg-white text-rw-mute px-4 py-2 text-[12px] uppercase tracking-[0.18em] hover:border-rw-brass hover:text-rw-forest transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {/* Progress bar + countdown */}
          {phase !== "idle" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-rw-mute">
                <span className="uppercase tracking-[0.16em]">
                  {phase === "arrived"
                    ? "Guest arrived"
                    : `T−${minsLeft} min${minsLeft !== 1 ? "s" : ""}`}
                </span>
                <span className="tabular-nums">
                  {phase === "arrived" ? "0:00" : `0:${String(secondsLeft).padStart(2, "0")}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-rw-stone-line overflow-hidden">
                <div
                  className="h-full rounded-full bg-rw-brass transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* T-5 brief card */}
          {(phase === "brief" || phase === "arrived") && selectedGuest && (
            <GuestBriefCard guest={selectedGuest} isArrived={phase === "arrived"} />
          )}

          {/* Loading state while fetching brief and countdown hasn't started */}
          {isFetchingBrief && phase === "idle" && (
            <div className="rounded-2xl border border-dashed border-rw-brass/40 bg-rw-brass/5 px-6 py-5 text-center">
              <div className="inline-block h-4 w-4 rounded-full border-2 border-rw-brass border-t-transparent animate-spin mb-2" />
              <p className="text-[12px] text-rw-mute">Generating guest intelligence brief…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GuestBriefCard({
  guest,
  isArrived,
}: {
  guest: Guest;
  isArrived: boolean;
}) {
  const tier = TIER_META[guest.vip_tier];
  const brief = guest.research_brief;

  return (
    <div
      className="rounded-2xl border border-rw-brass/30 bg-white overflow-hidden"
      style={{ animation: "fade-up 0.3s ease-out both" }}
    >
      {/* Alert banner */}
      {isArrived ? (
        <div className="px-6 py-3 bg-rw-forest text-rw-cream-soft flex items-center justify-between">
          <span className="font-serif text-[16px]">Guest arriving now</span>
          <div className="flex items-center gap-3">
            {guest.room && (
              <span className="text-[12px] uppercase tracking-[0.18em] opacity-80">
                Room {guest.room}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${tier.badge}`}
            >
              {guest.vip_tier === "legacy" && <span aria-hidden>✦</span>}
              {tier.label}
            </span>
          </div>
        </div>
      ) : (
        <div className="px-6 py-3 bg-rw-brass/10 border-b border-rw-brass/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rw-brass animate-pulse" />
            <span className="text-[12px] uppercase tracking-[0.18em] text-rw-brass font-medium">
              Arriving in 5 minutes — Front Desk Alert
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${tier.badge}`}
          >
            {guest.vip_tier === "legacy" && <span aria-hidden>✦</span>}
            {tier.label}
          </span>
        </div>
      )}

      <div className="px-6 py-5 space-y-5">
        {/* Guest identity */}
        <div className="flex items-center gap-4">
          <GuestAvatar name={guest.name} />
          <div>
            <h3 className="font-serif text-[22px] leading-tight text-rw-forest">
              {guest.name}
            </h3>
            {brief?.professional && (
              <p className="text-[12px] text-rw-mute mt-0.5">{brief.professional}</p>
            )}
            <div className="flex items-center gap-2 mt-1 text-[11px] text-rw-mute">
              {guest.room && <span>Room {guest.room}</span>}
              <span className="text-rw-stone-line">·</span>
              <span>{guest.past_stays} past stays</span>
              {guest.lifetimeValue && (
                <>
                  <span className="text-rw-stone-line">·</span>
                  <span>LTV {guest.lifetimeValue}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {brief ? (
          <>
            {/* Summary */}
            <p className="text-[13px] leading-relaxed text-rw-ink border-l-2 border-rw-brass pl-4">
              {brief.summary}
            </p>

            {/* Welcome actions */}
            {brief.welcomeActions && (
              <div className="rounded-xl border border-rw-forest/20 bg-rw-forest/5 px-5 py-4 space-y-3">
                <div className="eyebrow eyebrow-brass">Pre-Arrival Actions</div>
                <WelcomeActionRow icon="🛏" label="Room Setup" value={brief.welcomeActions.roomSetup} />
                <WelcomeActionRow icon="🥂" label="Welcome Drink" value={brief.welcomeActions.preArrivalDrink} />
                <WelcomeActionRow icon="📋" label="Concierge Alert" value={brief.welcomeActions.conciergeAlert} />
              </div>
            )}

            {/* Welcome note */}
            {brief.welcomeActions?.welcomeNote && (
              <div className="rounded-xl border border-rw-brass/20 bg-rw-brass/5 px-5 py-4">
                <div className="eyebrow eyebrow-brass mb-2">Welcome Note (for room)</div>
                <p className="text-[13px] leading-relaxed text-rw-ink italic">
                  &ldquo;{brief.welcomeActions.welcomeNote}&rdquo;
                </p>
              </div>
            )}

            {/* Conversation starters */}
            {brief.conversation_starters?.length > 0 && (
              <BriefList
                title="Conversation Starters"
                items={brief.conversation_starters}
                color="text-rw-forest"
              />
            )}

            {/* Personalized experiences */}
            {brief.personalizedExperiences?.length > 0 && (
              <BriefList
                title="Personalized Experience Ideas"
                items={brief.personalizedExperiences}
                color="text-rw-forest"
              />
            )}

            {/* Risk flags */}
            {brief.riskFlags?.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                <div className="eyebrow mb-2 text-red-700">⚠ Risk Flags — Do Not</div>
                <ul className="space-y-1.5">
                  {brief.riskFlags.map((flag, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] text-red-800 leading-relaxed">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-[12px] text-rw-mute italic">
            Brief not yet generated — click "Generate Brief" in the guest profile first.
          </p>
        )}
      </div>
    </div>
  );
}

function WelcomeActionRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 text-[15px]">{icon}</span>
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-rw-mute font-medium">
          {label}
        </div>
        <p className="text-[12.5px] text-rw-ink leading-relaxed mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function BriefList({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color?: string;
}) {
  return (
    <div>
      <div className="eyebrow mb-2">{title}</div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className={`flex gap-2 text-[12.5px] leading-relaxed ${color ?? "text-rw-ink"}`}
          >
            <span className="mt-1.5 h-1 w-1 rounded-full bg-rw-brass shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuestAvatar({ name }: { name: string }) {
  const initials = name
    .replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, "")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative h-14 w-14 shrink-0 rounded-full bg-rw-forest text-rw-cream-soft flex items-center justify-center font-serif text-[20px] tracking-wide">
      {initials}
      <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-rw-brass border-2 border-white" />
    </div>
  );
}
