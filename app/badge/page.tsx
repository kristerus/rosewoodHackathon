"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STAFF_ID = "staff-kristian-01";

type Status =
  | { kind: "idle" }
  | { kind: "listening" }
  | { kind: "routing" }
  | { kind: "routed"; department: string; guestLabel?: string }
  | { kind: "error" };

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export default function BadgePage() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [supported, setSupported] = useState<boolean | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef<string>("");
  const routedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event: unknown) => {
      const e = event as {
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      };
      // Some browsers (Android Chrome) emit CUMULATIVE final results:
      // each new result repeats everything said so far, e.g.
      //   results[0]="Mr"
      //   results[1]="Mr Chen"
      //   results[2]="Mr Chen needs"
      //   ...
      // Naively concatenating gives "Mr Mr Chen Mr Chen needs ...".
      //
      // Approach: walk all isFinal results, and only accept a new one
      // if its text doesn't already appear in our accumulated transcript.
      // If the new text is a SUPERSET of the accumulated, replace it.
      // If it's a totally new sentence, append.
      const normalize = (s: string) =>
        s.replace(/\s+/g, " ").trim().toLowerCase();
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) continue;
        const raw = (r[0].transcript ?? "").replace(/\s+/g, " ").trim();
        if (!raw) continue;
        const cur = normalize(final);
        const next = normalize(raw);
        if (!cur) {
          final = raw;
        } else if (next.startsWith(cur)) {
          // New result extends current → replace (cumulative case).
          final = raw;
        } else if (cur.startsWith(next) || cur.endsWith(next) || cur.includes(next)) {
          // New result already contained in current → skip (duplicate).
          continue;
        } else {
          // Genuinely new segment → append.
          final = final + " " + raw;
        }
      }
      finalRef.current = final.replace(/\s+/g, " ").trim();
    };
    rec.onerror = () => {
      setStatus({ kind: "error" });
    };
    rec.onend = () => {
      const text = finalRef.current.trim();
      finalRef.current = "";
      if (!text) {
        setStatus({ kind: "idle" });
        return;
      }
      void submitTranscript(text);
    };
    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {}
      recRef.current = null;
      if (routedTimerRef.current) clearTimeout(routedTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitTranscript = useCallback(async (text: string) => {
    setStatus({ kind: "routing" });
    try {
      const res = await fetch("/api/badge-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, staff_id: STAFF_ID }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        ticket?: {
          department?: string;
          guest_name?: string | null;
          room_number?: string | null;
        };
      };
      const dept = data.ticket?.department ?? "frontdesk";
      const guestLabel = data.ticket?.room_number
        ? `Room ${data.ticket.room_number}`
        : data.ticket?.guest_name ?? undefined;
      setStatus({ kind: "routed", department: dept, guestLabel });
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.([60, 40, 120]);
        } catch {}
      }
      if (routedTimerRef.current) clearTimeout(routedTimerRef.current);
      routedTimerRef.current = setTimeout(() => {
        setStatus({ kind: "idle" });
      }, 1500);
    } catch {
      setStatus({ kind: "error" });
      if (routedTimerRef.current) clearTimeout(routedTimerRef.current);
      routedTimerRef.current = setTimeout(() => {
        setStatus({ kind: "idle" });
      }, 2000);
    }
  }, []);

  const onToggle = useCallback(() => {
    if (supported === false) return;
    const rec = recRef.current;
    if (!rec) return;

    if (status.kind === "listening") {
      try {
        rec.stop();
      } catch {}
      return;
    }
    if (status.kind === "routing") return;

    finalRef.current = "";
    setStatus({ kind: "listening" });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(40);
      } catch {}
    }
    try {
      rec.start();
    } catch {
      setStatus({ kind: "error" });
    }
  }, [status.kind, supported]);

  const isListening = status.kind === "listening";
  const isRouting = status.kind === "routing";
  const isRouted = status.kind === "routed";
  const isError = status.kind === "error";

  const bgClass = isListening
    ? "bg-[#0c1c14]"
    : isRouted
      ? "bg-[#0e3a1f]"
      : isError
        ? "bg-[#2a0d0d]"
        : "bg-[#f7f3ec]";

  const ringClass = isListening
    ? "border-[#b8945f] bg-[#11261d]"
    : isRouted
      ? "border-[#b8945f] bg-[#0c2a17]"
      : isError
        ? "border-red-400 bg-[#2a0d0d]"
        : "border-[#d8cdb6] bg-white";

  const innerBg = isListening
    ? "bg-[#0c1c14]"
    : isRouted
      ? "bg-[#0e3a1f]"
      : isError
        ? "bg-[#2a0d0d]"
        : "bg-[#f7f3ec]";

  const rwColor = isListening
    ? "text-[#b8945f]"
    : isRouted
      ? "text-[#b8945f]"
      : isError
        ? "text-red-400"
        : "text-[#1a3a2e]";

  return (
    <main
      className={`min-h-[100dvh] w-full flex flex-col items-center justify-center gap-8 transition-colors duration-500 ease-out select-none touch-manipulation ${bgClass}`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={supported === false || isRouting}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop listening" : "Start listening"}
        className="relative focus:outline-none disabled:opacity-60 transition-transform duration-200 ease-out active:scale-[0.97]"
      >
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full border border-[#b8945f]/60 animate-ping" />
            <span
              className="absolute inset-0 rounded-full border border-[#b8945f]/40"
              style={{
                animation: "ping 2.4s cubic-bezier(0,0,0.2,1) infinite",
              }}
            />
          </>
        )}

        <span
          className={`relative flex h-[280px] w-[280px] items-center justify-center rounded-full border-2 transition-all duration-500 ease-out shadow-2xl ${ringClass}`}
          style={{
            boxShadow: isListening
              ? "0 0 0 16px rgba(184,148,95,0.08), 0 24px 80px -20px rgba(0,0,0,0.45)"
              : "0 24px 60px -20px rgba(0,0,0,0.25)",
          }}
        >
          <span
            className={`flex h-[212px] w-[212px] items-center justify-center rounded-full transition-colors duration-500 ${innerBg}`}
          >
            <span
              className={`tracking-[0.06em] text-[88px] leading-none transition-colors duration-500 ${rwColor}`}
              style={{
                fontFamily:
                  '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                fontWeight: 500,
              }}
            >
              {isRouted ? "✓" : isError ? "!" : "RW"}
            </span>
          </span>
        </span>
      </button>

      {/* Status caption — only on routed/routing/error to keep it minimal */}
      {isRouted && (
        <div className="text-center px-8 fade-in-up">
          <div
            className="text-[11px] uppercase tracking-[0.22em] text-[#b8945f]"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Routed
          </div>
          <div
            className="mt-1 text-[28px] font-medium leading-tight text-[#f7f3ec]"
            style={{
              fontFamily:
                '"Cormorant Garamond", "Playfair Display", Georgia, serif',
            }}
          >
            {DEPT_LABEL[status.department] ?? status.department}
          </div>
          {status.guestLabel && (
            <div
              className="mt-1 text-[12px] text-[#f7f3ec] opacity-70"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              {status.guestLabel}
            </div>
          )}
        </div>
      )}

      {isRouting && (
        <div
          className="text-[12px] uppercase tracking-[0.22em] text-[#1a3a2e] opacity-60"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          Routing…
        </div>
      )}

      {isError && (
        <div
          className="text-[12px] uppercase tracking-[0.22em] text-red-700 opacity-80"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          Failed — tap to retry
        </div>
      )}

      {supported === false && (
        <p
          className="fixed bottom-8 left-0 right-0 text-center text-[12px] text-[#1a3a2e] opacity-60 px-8"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          Open in Chrome on a device with a microphone.
        </p>
      )}
    </main>
  );
}

const DEPT_LABEL: Record<string, string> = {
  concierge: "Concierge",
  housekeeping: "Housekeeping",
  fnb: "Food & Beverage",
  maintenance: "Engineering",
  frontdesk: "Front Desk",
};
