"use client";

import React, { useCallback, useState } from "react";
import { useAppStore, selectFocusedGuest } from "@/lib/store";
import { useWebSpeech } from "@/hooks/useWebSpeech";
import BadgePanel from "@/components/BadgePanel";
import GuestMessagesPanel, {
  type GuestMessage,
} from "@/components/GuestMessagesPanel";
import StaffTasksPanel from "@/components/StaffTasksPanel";
import OperaProfilePanel from "@/components/OperaProfilePanel";
import Logo from "@/components/Logo";

const STAFF_ID = "staff-kristian-01";

const SAMPLE_TRANSCRIPTS: { label: string; text: string }[] = [
  {
    label: "Restaurant rec",
    text: "Mr. Chen in 412 is asking for a quiet sushi spot tonight, around 8pm, walking distance preferred — please book if possible.",
  },
  {
    label: "Housekeeping",
    text: "Ms. Marchetti in 808 needs fresh peonies replaced and an extra duvet brought up before turndown.",
  },
  {
    label: "Engineering",
    text: "Dr. Patel in 215 says the AC in his room is rattling and won't go below 72 — can engineering take a look this morning?",
  },
];

async function typeOut(
  text: string,
  setTranscript: (v: string) => void,
  charsPerStep = 3,
  stepMs = 22,
) {
  for (let i = 1; i <= text.length; i += charsPerStep) {
    setTranscript(text.slice(0, i));
    await new Promise((r) => setTimeout(r, stepMs));
  }
  setTranscript(text);
}

export default function Home() {
  const guests = useAppStore((s) => s.guests);
  const tickets = useAppStore((s) => s.tickets);
  const isListening = useAppStore((s) => s.isListening);
  const transcript = useAppStore((s) => s.currentTranscript);
  const focusedGuestId = useAppStore((s) => s.focusedGuestId);
  const focusedGuest = useAppStore(selectFocusedGuest);

  const setListening = useAppStore((s) => s.setListening);
  const setTranscript = useAppStore((s) => s.setTranscript);
  const addTicket = useAppStore((s) => s.addTicket);
  const setGuestBrief = useAppStore((s) => s.setGuestBrief);
  const focusGuest = useAppStore((s) => s.focusGuest);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitTranscript = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setListening(false);
        return;
      }
      setIsProcessing(true);
      setListening(false);
      setTranscript(trimmed);
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: trimmed,
            staff_id: STAFF_ID,
            known_guests: useAppStore.getState().guests,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { ticket: Parameters<typeof addTicket>[0] };
        addTicket(data.ticket);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(180);
          } catch {}
        }
        // If the ticket names a guest we know, focus them so Opera profile updates
        if (data.ticket.room_number) {
          const match = useAppStore
            .getState()
            .guests.find((g) => g.room === data.ticket.room_number);
          if (match) focusGuest(match.id);
        }
        // Clear transcript shortly after so the badge shows the ticket card
        setTimeout(() => setTranscript(""), 400);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsProcessing(false);
      }
    },
    [addTicket, focusGuest, setListening, setTranscript],
  );

  const { isSupported, start, stop } = useWebSpeech({
    onInterimTranscript: (t) => setTranscript(t),
    onFinalTranscript: (t) => {
      void submitTranscript(t);
    },
    onError: (e) => {
      setError(`Mic: ${e}`);
      setListening(false);
    },
  });

  const onToggle = () => {
    if (isProcessing) return;
    setError(null);
    if (isListening) {
      stop();
      return;
    }
    if (isSupported === false) {
      setError("Web Speech API not supported — use Chrome or Edge. Use the Demo Controls below.");
      return;
    }
    setTranscript("");
    setListening(true);
    start();
  };

  const onGenerateBrief = async () => {
    if (!focusedGuestId || isGeneratingBrief) return;
    setIsGeneratingBrief(true);
    setError(null);
    try {
      const res = await fetch("/api/guest-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_id: focusedGuestId,
          guests: useAppStore.getState().guests,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { brief: Parameters<typeof setGuestBrief>[1] };
      setGuestBrief(focusedGuestId, data.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const onSampleTranscript = async (text: string) => {
    if (isProcessing || isListening) return;
    setError(null);
    setListening(true);
    setTranscript("");
    await typeOut(text, setTranscript);
    await new Promise((r) => setTimeout(r, 350));
    await submitTranscript(text);
  };

  const latestTicket = tickets[0] ?? null;

  const guestMessages: GuestMessage[] = tickets
    .filter((t) => t.guest_facing_message && t.guest_facing_message.trim() !== "")
    .map((t) => ({
      guest_name: t.guest_name ?? "Guest",
      room: t.room_number ?? "—",
      text: t.guest_facing_message,
      timestamp: t.timestamp,
    }));

  return (
    <div className="min-h-screen flex flex-col paper">
      {/* Top bar */}
      <header className="flex items-center justify-between px-10 pt-8 pb-6">
        <Logo variant="wordmark" size={42} tone="forest" />
        <div className="hidden md:flex items-center gap-6">
          <Pill label="Glowing.io" status="online" />
          <Pill label="Opera PMS" status="online" />
          <Pill label="Anthropic" status="online" />
        </div>
        <div className="text-right">
          <div className="eyebrow eyebrow-brass">Staff Console</div>
          <div className="font-serif text-[15px] text-rw-forest leading-tight">
            Front-of-House · Floor 1
          </div>
        </div>
      </header>

      <div className="hairline mx-10" />

      {/* Error banner (slides in below header) */}
      {error && (
        <div className="mx-10 mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] text-red-800 flex items-start justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-900 text-[11px] uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4-panel grid */}
      <main className="flex-1 px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 h-[calc(100vh-220px)] min-h-[820px]">
          <BadgePanel
            isListening={isListening || isProcessing}
            transcript={isProcessing ? `${transcript} · routing…` : transcript}
            latestTicket={latestTicket}
            onToggle={onToggle}
          />
          <GuestMessagesPanel messages={guestMessages} />
          <StaffTasksPanel tickets={tickets} />
          <OperaProfilePanel
            guest={
              focusedGuest && isGeneratingBrief
                ? { ...focusedGuest, research_brief: undefined }
                : focusedGuest
            }
            onGenerateBrief={onGenerateBrief}
          />
        </div>
      </main>

      {/* Demo controls */}
      <footer className="border-t border-rw-stone-line bg-rw-cream/50">
        <div className="px-10 py-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <div className="eyebrow eyebrow-brass">Demo Controls</div>
            <div className="text-[11px] text-rw-mute mt-0.5">
              Fallbacks for when the mic doesn&apos;t cooperate.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {SAMPLE_TRANSCRIPTS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onSampleTranscript(s.text)}
                disabled={isProcessing || isListening}
                className="rounded-full border border-rw-stone-line bg-white px-3.5 py-1.5 text-[11.5px] text-rw-ink hover:border-rw-brass hover:text-rw-forest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {s.label}
              </button>
            ))}
            {isGeneratingBrief && (
              <span className="text-[11px] text-rw-brass italic">
                Generating brief…
              </span>
            )}
          </div>

          <label className="flex items-center gap-3 ml-auto">
            <span className="eyebrow">Focused guest</span>
            <select
              value={focusedGuestId ?? ""}
              onChange={(e) => focusGuest(e.target.value || null)}
              className="rounded-full border border-rw-stone-line bg-white px-3.5 py-1.5 text-[12px] text-rw-ink focus:outline-none focus:border-rw-brass"
            >
              <option value="">— None —</option>
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.room ? ` · Room ${g.room}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </footer>
    </div>
  );
}

function Pill({
  label,
  status,
}: {
  label: string;
  status: "online" | "offline";
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-rw-mute">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "online" ? "bg-emerald-500" : "bg-rw-mute/40"
        }`}
      />
      {label}
    </span>
  );
}
