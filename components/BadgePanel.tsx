"use client";

import React from "react";
import type { Ticket } from "@/lib/types";
import Logo from "./Logo";

interface BadgePanelProps {
  isListening: boolean;
  transcript: string;
  latestTicket: Ticket | null;
  onToggle: () => void;
}

const DEPT_LABEL: Record<string, string> = {
  concierge: "Concierge",
  housekeeping: "Housekeeping",
  fnb: "Food & Beverage",
  maintenance: "Engineering",
  frontdesk: "Front Desk",
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function BadgePanel({
  isListening,
  transcript,
  latestTicket,
  onToggle,
}: BadgePanelProps) {
  return (
    <Panel
      systemLabel="ROSEWOOD STAFF BADGE"
      title="Concierge Companion"
      subtitle="Voice-activated service routing"
    >
      <div className="flex flex-1 items-center justify-center px-6 pt-2 pb-8">
        {/* Phone-shaped frame */}
        <div className="relative w-full max-w-[300px] aspect-[9/19] rounded-[42px] border border-rw-stone-line bg-rw-cream shadow-sm overflow-hidden flex flex-col">
          {/* Bezel notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-20 rounded-full bg-rw-stone-line/70" />

          {/* Status header */}
          <div className="pt-9 px-6 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-rw-mute">
            <span>Badge · 04</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isListening ? "bg-rw-brass" : "bg-rw-forest/40"
                }`}
              />
              {isListening ? "Live" : "Ready"}
            </span>
          </div>

          {/* Main badge area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
            <button
              type="button"
              onClick={onToggle}
              aria-pressed={isListening}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              className="relative group focus:outline-none"
            >
              {/* Pulse rings */}
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full border border-rw-brass/50 pulse-ring" />
                  <span className="absolute inset-0 rounded-full border border-rw-brass/40 pulse-ring-delayed" />
                </>
              )}

              {/* Outer ring */}
              <span
                className={`relative flex h-[148px] w-[148px] items-center justify-center rounded-full border transition-all duration-500 ${
                  isListening
                    ? "border-rw-brass bg-rw-forest shadow-[0_0_0_8px_rgba(184,148,95,0.08)]"
                    : "border-rw-stone-line bg-rw-cream-soft group-hover:border-rw-brass/60 group-active:scale-[0.98]"
                }`}
              >
                {/* Inner medallion */}
                <span
                  className={`flex h-[112px] w-[112px] items-center justify-center rounded-full transition-colors duration-500 ${
                    isListening ? "bg-rw-forest-deep" : "bg-rw-cream"
                  }`}
                >
                  <Logo
                    size={68}
                    tone={isListening ? "brass" : "forest"}
                  />
                </span>
              </span>
            </button>

            {/* Status text */}
            <div className="mt-7 text-center min-h-[56px]">
              {isListening ? (
                <>
                  <div className="font-serif text-[20px] text-rw-forest leading-tight">
                    Listening
                    <span className="shimmer ml-0.5">…</span>
                  </div>
                  <p className="mt-2 text-[12px] text-rw-mute italic max-w-[240px] mx-auto leading-snug min-h-[2em]">
                    {transcript || "Speak naturally — full sentences are fine."}
                  </p>
                </>
              ) : (
                <>
                  <div className="font-serif text-[20px] text-rw-forest leading-tight">
                    Tap to speak
                  </div>
                  <p className="mt-2 text-[12px] text-rw-mute leading-snug max-w-[230px] mx-auto">
                    Press the badge, describe the guest's request — we'll route it.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Latest ticket confirmation slot */}
          <div className="px-4 pb-5">
            {latestTicket ? (
              <div
                key={latestTicket.id}
                className="slide-in rounded-2xl border border-rw-forest/15 bg-white/80 backdrop-blur-sm px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="eyebrow eyebrow-brass">
                    Routed · {DEPT_LABEL[latestTicket.department] ?? latestTicket.department}
                  </span>
                  <span className="text-[10px] text-rw-mute">
                    {formatTime(latestTicket.timestamp)}
                  </span>
                </div>
                <p className="mt-1.5 font-serif text-[15px] text-rw-forest leading-snug line-clamp-2">
                  {latestTicket.intent}
                </p>
                {latestTicket.room_number && (
                  <p className="mt-1 text-[11px] text-rw-mute">
                    Room {latestTicket.room_number}
                    {latestTicket.guest_name ? ` · ${latestTicket.guest_name}` : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-rw-stone-line/80 px-4 py-3 text-center">
                <span className="eyebrow">Awaiting first request</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- shared Panel chrome ---------- */

function Panel({
  systemLabel,
  title,
  subtitle,
  children,
}: {
  systemLabel: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-rw-stone-line bg-rw-cream-soft shadow-sm overflow-hidden">
      <header className="flex items-baseline justify-between px-8 pt-7 pb-4">
        <div>
          <div className="eyebrow eyebrow-brass">{systemLabel}</div>
          <h2 className="mt-1.5 font-serif text-[26px] leading-tight text-rw-forest">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[12px] text-rw-mute">{subtitle}</p>
          ) : null}
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-rw-brass" />
      </header>
      <div className="hairline mx-8" />
      <div className="flex flex-1 flex-col min-h-0">{children}</div>
    </section>
  );
}
