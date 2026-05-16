"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  matchGuestForTicket,
  selectFocusedGuest,
  useAppStore,
  type ActiveTab,
  type Prediction,
} from "@/lib/store";
import type { Guest, Ticket } from "@/lib/types";
import InboxSidebar from "@/components/InboxSidebar";
import ConversationThread from "@/components/ConversationThread";
import GuestSidebar from "@/components/GuestSidebar";
import Logo from "@/components/Logo";
import Modal from "@/components/Modal";
import CommandPalette from "@/components/CommandPalette";
import NewSRModal from "@/components/NewSRModal";
import PropertyPicker from "@/components/PropertyPicker";
import FolioTab from "@/components/FolioTab";
import SetupTab from "@/components/SetupTab";
import AddGuestModal, { type NewGuestInput } from "@/components/AddGuestModal";
import ManualInputPanel, { type ManualGuestData } from "@/components/ManualInputPanel";
import { ToasterProvider, useToast } from "@/components/Toaster";

const STAFF_ID = "staff-kristian-01";
const UNASSIGNED_KEY = "__unassigned__";

const NAV_TABS: { key: ActiveTab; label: string }[] = [
  { key: "reservations", label: "Reservations" },
  { key: "guests", label: "Guest Profiles" },
  { key: "service", label: "Service Requests" },
  { key: "activities", label: "Activities" },
  { key: "folio", label: "Folio" },
  { key: "reports", label: "Reports" },
  { key: "setup", label: "Setup" },
];

const FN_KEYS: { key: string; label: string }[] = [
  { key: "F1", label: "Help" },
  { key: "F2", label: "Quick Find" },
  { key: "F3", label: "New Reservation" },
  { key: "F4", label: "Pre-Arrival" },
  { key: "F5", label: "Refresh" },
  { key: "F8", label: "Profile" },
  { key: "F12", label: "Service Request" },
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

export default function Page() {
  // Wrap everything in the Toaster provider so any descendant can call useToast()
  return (
    <ToasterProvider>
      <Home />
    </ToasterProvider>
  );
}

function Home() {
  const guests = useAppStore((s) => s.guests);
  const tickets = useAppStore((s) => s.tickets);
  const predictionsMap = useAppStore((s) => s.predictions);
  const focusedGuestId = useAppStore((s) => s.focusedGuestId);
  const focusedGuest = useAppStore(selectFocusedGuest);
  const liveTranscript = useAppStore((s) => s.currentTranscript);
  const isListeningStore = useAppStore((s) => s.isListening);

  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const selectedProperty = useAppStore((s) => s.selectedProperty);
  const resetDemoState = useAppStore((s) => s.resetDemoState);

  const setTranscript = useAppStore((s) => s.setTranscript);
  const setListening = useAppStore((s) => s.setListening);
  const addTicket = useAppStore((s) => s.addTicket);
  const setGuestBrief = useAppStore((s) => s.setGuestBrief);
  const setPredictions = useAppStore((s) => s.setPredictions);
  const focusGuest = useAppStore((s) => s.focusGuest);
  const addGuest = useAppStore((s) => s.addGuest);
  const setGuestMetadata = useAppStore((s) => s.setGuestMetadata);

  const { toast } = useToast();

  const [focusedKey, setFocusedKey] = useState<string | null>(
    focusedGuestId ?? null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [today, setToday] = useState<string>("");
  const [showBadgeQR, setShowBadgeQR] = useState(true);

  // Modal/popover state
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newSROpen, setNewSROpen] = useState(false);
  const [newReservationOpen, setNewReservationOpen] = useState(false);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const guestSidebarRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  // Bumping this state value re-runs the SSE effect (used by F5 Refresh).
  const [sseEpoch, setSseEpoch] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(
      new Date().toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);

  // Close user popover on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  // Sync focusedKey with store focusedGuestId when the store changes from elsewhere.
  useEffect(() => {
    if (focusedGuestId && focusedKey !== UNASSIGNED_KEY) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusedKey(focusedGuestId);
    }
  }, [focusedGuestId, focusedKey]);

  /* ---------- SSE wiring ---------- */
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events");
      es.onopen = () => setSseConnected(true);
      es.onerror = () => setSseConnected(false);
      es.onmessage = (ev: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(ev.data) as
            | { type: "ticket"; ticket: Ticket }
            | { type: "transcript"; transcript: string; staff_id: string };
          if (payload.type === "ticket") {
            addTicket(payload.ticket);
            const match = matchGuestForTicket(
              payload.ticket,
              useAppStore.getState().guests,
            );
            if (match) {
              focusGuest(match.id);
              setFocusedKey(match.id);
            } else {
              setFocusedKey(UNASSIGNED_KEY);
            }
            setTranscript("");
            setListening(false);
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              try {
                navigator.vibrate?.(120);
              } catch {
                /* noop */
              }
            }
          } else if (payload.type === "transcript") {
            setTranscript(payload.transcript);
            setListening(true);
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSseConnected(false);
    }
    return () => {
      es?.close();
    };
    // sseEpoch bump forces a reconnect (F5 refresh).
  }, [addTicket, focusGuest, setListening, setTranscript, sseEpoch]);

  /* ---------- Derived ---------- */

  const isUnassignedFocused = focusedKey === UNASSIGNED_KEY;

  const unassignedTickets: Ticket[] = useMemo(
    () => tickets.filter((t) => !matchGuestForTicket(t, guests)),
    [tickets, guests],
  );

  const threadTickets: Ticket[] = useMemo(() => {
    if (isUnassignedFocused) return unassignedTickets;
    if (!focusedGuest) return [];
    return tickets.filter((t) => {
      const byRoom = t.room_number && focusedGuest.room === t.room_number;
      const byName =
        t.guest_name &&
        focusedGuest.name
          .toLowerCase()
          .includes(t.guest_name.toLowerCase());
      return Boolean(byRoom || byName);
    });
  }, [tickets, focusedGuest, isUnassignedFocused, unassignedTickets]);

  const predictionsForFocused: Prediction[] = focusedGuest
    ? predictionsMap[focusedGuest.id] ?? []
    : [];

  /* ---------- Handlers ---------- */

  const handleFocusGuest = useCallback(
    (id: string | null) => {
      setFocusedKey(id);
      focusGuest(id);
    },
    [focusGuest],
  );

  const handleFocusUnassigned = useCallback(() => {
    setFocusedKey(UNASSIGNED_KEY);
    focusGuest(null);
  }, [focusGuest]);

  const submitTranscript = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setIsProcessing(true);
      setError(null);
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
        const data = (await res.json()) as { ticket: Ticket };
        addTicket(data.ticket);
        const match = matchGuestForTicket(
          data.ticket,
          useAppStore.getState().guests,
        );
        if (match) {
          focusGuest(match.id);
          setFocusedKey(match.id);
        } else {
          setFocusedKey(UNASSIGNED_KEY);
        }
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate?.(120);
          } catch {
            /* noop */
          }
        }
        setTimeout(() => setTranscript(""), 400);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsProcessing(false);
        setListening(false);
      }
    },
    [addTicket, focusGuest, setListening, setTranscript],
  );

  const onSampleTranscript = useCallback(
    async (text: string) => {
      if (isProcessing) return;
      setError(null);
      setListening(true);
      setTranscript("");
      await typeOut(text, setTranscript);
      await new Promise((r) => setTimeout(r, 350));
      await submitTranscript(text);
    },
    [isProcessing, setListening, setTranscript, submitTranscript],
  );

  const onTriggerBadge = useCallback(
    async (text: string) => {
      if (isProcessing) return;
      setError(null);
      setListening(true);
      setTranscript("");
      await typeOut(text, setTranscript);
      try {
        const res = await fetch("/api/badge-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text, staff_id: STAFF_ID }),
        });
        if (!res.ok) {
          await submitTranscript(text);
          return;
        }
        const prevCount = useAppStore.getState().tickets.length;
        setTimeout(() => {
          if (useAppStore.getState().tickets.length === prevCount) {
            void submitTranscript(text);
          } else {
            setListening(false);
            setTranscript("");
          }
        }, 2500);
      } catch {
        await submitTranscript(text);
      }
    },
    [isProcessing, setListening, setTranscript, submitTranscript],
  );

  const onGenerateBrief = useCallback(async () => {
    if (!focusedGuest || isGeneratingBrief) return;
    setIsGeneratingBrief(true);
    setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_id: focusedGuest.id,
          guests: useAppStore.getState().guests,
        }),
      });
      if (!res.ok) {
        const fb = await fetch("/api/guest-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guest_id: focusedGuest.id,
            guests: useAppStore.getState().guests,
          }),
        });
        if (!fb.ok) {
          const err = await fb.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${fb.status}`);
        }
        const data = (await fb.json()) as {
          brief: Parameters<typeof setGuestBrief>[1];
        };
        setGuestBrief(focusedGuest.id, data.brief);
        return;
      }
      const data = (await res.json()) as {
        brief: Parameters<typeof setGuestBrief>[1];
      };
      setGuestBrief(focusedGuest.id, data.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [focusedGuest, isGeneratingBrief, setGuestBrief]);

  const onGeneratePredictions = useCallback(async () => {
    if (!focusedGuest || isGeneratingPredictions) return;
    setIsGeneratingPredictions(true);
    setError(null);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_id: focusedGuest.id,
          guests: useAppStore.getState().guests,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { predictions: Prediction[] };
      setPredictions(focusedGuest.id, data.predictions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGeneratingPredictions(false);
    }
  }, [focusedGuest, isGeneratingPredictions, setPredictions]);

  /* ---------- F-key actions ---------- */

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // re-trigger SSE reconnect
    setSseEpoch((n) => n + 1);
    setTimeout(() => setRefreshing(false), 600);
    toast("Refreshed", "info");
  }, [toast]);

  const handleProfileFocus = useCallback(() => {
    const el = guestSidebarRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el.classList.remove("ora-highlight");
    // re-trigger animation
    void el.offsetWidth;
    el.classList.add("ora-highlight");
  }, []);

  const handleResetDemo = useCallback(() => {
    resetDemoState();
    setFocusedKey(focusedGuestId ?? null);
    toast("Demo data reset", "success");
  }, [resetDemoState, focusedGuestId, toast]);

  const handleOpenPreArrival = useCallback(() => {
    if (!focusedGuest) {
      toast("Select a guest first", "info");
      return;
    }
    setManualInputOpen(true);
  }, [focusedGuest, toast]);

  const handleCreateGuest = useCallback(
    (data: NewGuestInput) => {
      const id =
        "guest-" +
        Date.now().toString(36) +
        "-" +
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).slice(2, 10));
      const guest: Guest = {
        id,
        name: data.name,
        room: data.room || null,
        booking_dates: {
          check_in: data.check_in,
          check_out: data.check_out,
        },
        vip_tier: data.vip_tier,
        preferences: [],
        past_stays: 0,
        notes: data.notes ?? "",
        interaction_log: [],
      };
      addGuest(guest);
      setFocusedKey(id);
      setActiveTab("service");
      setAddGuestOpen(false);
      toast(
        "Profile created — scroll right to generate AI Research with real web data",
        "success",
      );
    },
    [addGuest, setActiveTab, toast],
  );

  const handleSaveManualInput = useCallback(
    async (data: ManualGuestData) => {
      if (!focusedGuest) return;
      // Update local store immediately for responsive UI
      setGuestMetadata(focusedGuest.id, data);
      // Persist server-side (best-effort)
      try {
        await fetch("/api/guest-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guest_id: focusedGuest.id,
            patch: data,
          }),
        });
        toast("Pre-arrival info saved", "success");
      } catch {
        toast("Saved locally — server unavailable", "info");
      }
    },
    [focusedGuest, setGuestMetadata, toast],
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore when typing in inputs (except Escape, which Modal/Palette handle themselves)
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      switch (e.key) {
        case "F1":
          e.preventDefault();
          setHelpOpen(true);
          break;
        case "F2":
          // Allow F2 even in inputs (it's the quick find)
          e.preventDefault();
          setPaletteOpen(true);
          break;
        case "F3":
          if (isEditable) return;
          e.preventDefault();
          setNewReservationOpen(true);
          break;
        case "F4":
          if (isEditable) return;
          e.preventDefault();
          handleOpenPreArrival();
          break;
        case "F5":
          e.preventDefault();
          handleRefresh();
          break;
        case "F8":
          if (isEditable) return;
          e.preventDefault();
          handleProfileFocus();
          break;
        case "F12":
          e.preventDefault();
          setNewSROpen(true);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRefresh, handleProfileFocus, handleOpenPreArrival]);

  const handleFnKeyClick = useCallback(
    (key: string) => {
      switch (key) {
        case "F1":
          setHelpOpen(true);
          break;
        case "F2":
          setPaletteOpen(true);
          break;
        case "F3":
          setNewReservationOpen(true);
          break;
        case "F4":
          handleOpenPreArrival();
          break;
        case "F5":
          handleRefresh();
          break;
        case "F8":
          handleProfileFocus();
          break;
        case "F12":
          setNewSROpen(true);
          break;
      }
    },
    [handleRefresh, handleProfileFocus, handleOpenPreArrival],
  );

  /* ---------- Render ---------- */

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-ora-bg text-ora-charcoal">
      {refreshing && <div className="ora-progress-bar" />}

      {/* Row 1 — Oracle thin brand strip */}
      <div className="shrink-0 h-9 px-4 flex items-center justify-between bg-white border-b border-ora-hairline">
        <div className="flex items-center gap-3">
          <span
            className="font-bold tracking-tight text-[15px]"
            style={{ color: "var(--ora-red)" }}
          >
            ORACLE
          </span>
          <span className="text-ora-muted text-[12px]">·</span>
          <span className="text-[12px] text-ora-charcoal font-medium">
            Hospitality
          </span>
          <span className="ml-1 inline-flex items-center rounded-sm border border-ora-hairline-2 bg-ora-bg px-1.5 py-0.5 text-[10px] font-semibold text-ora-charcoal tracking-wide">
            OPERA Cloud
          </span>
          <span className="ml-2 inline-flex items-center rounded-sm border border-ora-hairline bg-white px-1.5 py-0.5 text-[10px] text-ora-muted tracking-wider uppercase">
            Concierge AI · Extension
          </span>
        </div>

        <div className="flex items-center gap-3">
          <PropertyPicker />
          <div className="h-4 w-px bg-ora-hairline" />
          <button
            type="button"
            onClick={() => setShowBadgeQR((v) => !v)}
            className="ora-btn h-7"
            title="Show Connect Badge QR"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm9 0h2v2h-2v-2zm0 3h2v2h-2v-2zm3-3h2v5h-2v-5zm0-3h5v2h-5v-2z" />
            </svg>
            Connect Badge
          </button>
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setHelpOpen(true)}
            className="h-7 w-7 rounded-sm hover:bg-ora-row-hover flex items-center justify-center text-ora-muted"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Help"
            onClick={() => setHelpOpen(true)}
            className="h-7 w-7 rounded-sm hover:bg-ora-row-hover flex items-center justify-center text-ora-muted"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
              <path d="M12 17h.01" />
            </svg>
          </button>
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="h-7 w-7 rounded-full bg-ora-red text-white flex items-center justify-center text-[11px] font-semibold cursor-pointer"
              aria-label="Kristian"
            >
              K
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[220px] bg-white border border-ora-hairline-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] rounded-sm fade-up">
                <div className="px-3 py-2.5 border-b border-ora-hairline bg-ora-bg">
                  <div className="text-[12.5px] font-semibold text-ora-charcoal">
                    Kristian
                  </div>
                  <div className="text-[10.5px] text-ora-muted">
                    Front-of-house staff · staff-kristian-01
                  </div>
                </div>
                <ul className="py-1">
                  {[
                    { label: "View profile", kind: "info" as const },
                    { label: "Preferences", kind: "info" as const },
                    {
                      label: "Sign out",
                      kind: "info" as const,
                      msg: "Sign out (mock)",
                    },
                  ].map((it) => (
                    <li key={it.label}>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          if (it.msg) toast(it.msg, it.kind);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-ora-charcoal hover:bg-ora-row-hover"
                      >
                        {it.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 — Tab navigation */}
      <nav className="shrink-0 h-9 px-4 flex items-center bg-white border-b border-ora-hairline overflow-x-auto">
        <div className="flex items-center">
          <div className="pr-3 mr-2 border-r border-ora-hairline">
            <Logo size={18} variant="mark" tone="forest" />
          </div>
          {NAV_TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                data-active={active ? "true" : "false"}
                onClick={() => setActiveTab(tab.key)}
                className="ora-tab"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 pl-4">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setPaletteOpen(true)}
            className="h-7 w-7 rounded-sm hover:bg-ora-row-hover flex items-center justify-center text-ora-muted"
            title="Quick Find (F2)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Row 3 — breadcrumb + status strip */}
      <div className="shrink-0 h-7 px-4 flex items-center justify-between bg-ora-bg border-b border-ora-hairline text-[11px]">
        <div className="flex items-center gap-1.5 text-ora-muted">
          <span className="hover:text-ora-charcoal cursor-default">Front Office</span>
          <span>›</span>
          <span className="hover:text-ora-charcoal cursor-default">
            {NAV_TABS.find((t) => t.key === activeTab)?.label ?? "Service Requests"}
          </span>
          <span>›</span>
          <span className="text-ora-charcoal font-medium">
            {activeTab === "service" ? "Concierge AI Queue" : selectedProperty.name}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-ora-muted tabular-nums">{today}</span>
          <span className="h-3 w-px bg-ora-hairline" />
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              {sseConnected && (
                <span className="absolute inset-0 rounded-full bg-ora-green opacity-60 pulse-ring" />
              )}
              <span
                className={`relative h-1.5 w-1.5 rounded-full ${
                  sseConnected ? "bg-ora-green" : "bg-ora-muted-2"
                }`}
              />
            </span>
            <span className="text-ora-charcoal">
              {sseConnected
                ? "Live · Connected to AI Concierge"
                : "Offline · AI Concierge unavailable"}
            </span>
          </span>
          <span className="h-3 w-px bg-ora-hairline" />
          <button
            type="button"
            onClick={handleRefresh}
            className="h-5 w-5 rounded-sm hover:bg-white flex items-center justify-center text-ora-muted hover:text-ora-charcoal"
            aria-label="Refresh"
            title="Refresh (F5)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
          <span className="h-3 w-px bg-ora-hairline" />
          <span className="text-ora-muted">
            User: <span className="text-ora-charcoal font-medium">staff-kristian-01</span>
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 px-4 py-1.5 bg-ora-red-soft border-b border-ora-red/30 text-[12px] text-ora-red-deep flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2L1 21h22L12 2zm0 6l7.5 13h-15L12 8zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z" />
            </svg>
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-ora-red-deep hover:text-ora-red text-[11px] uppercase tracking-wider font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main content area — switches by activeTab */}
      <main className="flex-1 min-h-0 relative">
        {activeTab === "service" ? (
          <div className="h-full grid grid-cols-[300px_minmax(0,1fr)_380px]">
            <InboxSidebar
              guests={guests}
              tickets={tickets}
              focusedGuestId={focusedGuestId}
              focusedKey={focusedKey}
              onFocusGuest={handleFocusGuest}
              onFocusUnassigned={handleFocusUnassigned}
              onAddGuest={() => setAddGuestOpen(true)}
            />
            <ConversationThread
              guest={focusedGuest}
              unassigned={isUnassignedFocused}
              tickets={threadTickets}
              isListening={isListeningStore}
              liveTranscript={liveTranscript}
              onSampleTranscript={onSampleTranscript}
              onTriggerBadge={onTriggerBadge}
              isProcessing={isProcessing}
              onOpenNewSR={() => setNewSROpen(true)}
            />
            <div ref={guestSidebarRef} className="h-full">
              <GuestSidebar
                guest={focusedGuest}
                tickets={threadTickets}
                predictions={predictionsForFocused}
                isGeneratingBrief={isGeneratingBrief}
                isGeneratingPredictions={isGeneratingPredictions}
                onGenerateBrief={onGenerateBrief}
                onGeneratePredictions={onGeneratePredictions}
                onEditPreArrival={handleOpenPreArrival}
              />
            </div>

            {showBadgeQR && <BadgeQRCard onClose={() => setShowBadgeQR(false)} />}
          </div>
        ) : activeTab === "reservations" ? (
          <ReservationsTable
            onRowClick={(id) => {
              handleFocusGuest(id);
              setActiveTab("service");
            }}
          />
        ) : activeTab === "guests" ? (
          <GuestProfilesTable
            onRowClick={(id) => {
              handleFocusGuest(id);
              setActiveTab("service");
            }}
          />
        ) : activeTab === "activities" ? (
          <ActivitiesTable />
        ) : activeTab === "folio" ? (
          <div className="h-full overflow-y-auto scroll-rw p-6 bg-white">
            <FolioTab
              guests={guests}
              focusedGuestId={focusedGuestId}
              onFocusGuest={(id) => {
                focusGuest(id);
                setActiveTab("folio");
              }}
            />
          </div>
        ) : activeTab === "reports" ? (
          <ReportsTab />
        ) : (
          <div className="h-full overflow-y-auto scroll-rw p-6 bg-white">
            <SetupTab />
          </div>
        )}
      </main>

      {/* Bottom function-key bar (Opera trademark) */}
      <footer className="shrink-0 h-7 px-3 flex items-center bg-white border-t border-ora-hairline overflow-x-auto">
        {FN_KEYS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => handleFnKeyClick(f.key)}
            className="ora-fnkey hover:bg-ora-row-hover cursor-pointer"
          >
            <kbd>{f.key}</kbd>
            <span className="text-ora-muted">{f.label}</span>
          </button>
        ))}
        <span className="ml-auto text-[10.5px] text-ora-muted-2 tracking-wide uppercase pl-3">
          Oracle Hospitality OPERA Cloud · v24.4 · Property: {selectedProperty.id.toUpperCase()} · Session: kristian-01
        </span>
      </footer>

      {/* Modals & overlays */}
      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onResetDemo={handleResetDemo}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectGuest={(id) => {
          handleFocusGuest(id);
          setActiveTab("service");
        }}
      />
      <NewSRModal
        open={newSROpen}
        onClose={() => setNewSROpen(false)}
        guest={focusedGuest}
        staffId={STAFF_ID}
      />
      <AddGuestModal
        open={addGuestOpen}
        onClose={() => setAddGuestOpen(false)}
        onCreate={handleCreateGuest}
      />
      {focusedGuest && (
        <ManualInputPanel
          guest={focusedGuest}
          open={manualInputOpen}
          onClose={() => setManualInputOpen(false)}
          onSave={handleSaveManualInput}
        />
      )}
      <Modal
        open={newReservationOpen}
        onClose={() => setNewReservationOpen(false)}
        title="New Reservation"
        width={460}
        footer={
          <button
            type="button"
            onClick={() => setNewReservationOpen(false)}
            className="ora-btn ora-btn-primary"
          >
            Close
          </button>
        }
      >
        <p className="text-[12.5px] text-ora-charcoal leading-relaxed">
          New Reservation flow is not implemented in this demo.
        </p>
        <p className="mt-2 text-[11.5px] text-ora-muted leading-relaxed">
          This would integrate with Opera Cloud&rsquo;s Reservations module to
          create a booking against the active property and link it to the guest
          profile.
        </p>
      </Modal>
    </div>
  );
}

/* ---------------- Help Modal ---------------- */

function HelpModal({
  open,
  onClose,
  onResetDemo,
}: {
  open: boolean;
  onClose: () => void;
  onResetDemo: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Help · Shortcuts" width={460}>
      <div>
        <h3 className="ora-label mb-2">Function keys</h3>
        <ul className="space-y-1.5 mb-4">
          {FN_KEYS.map((f) => (
            <li
              key={f.key}
              className="flex items-center justify-between text-[12.5px] text-ora-charcoal"
            >
              <span>{f.label}</span>
              <kbd className="text-[10.5px] border border-ora-hairline-2 bg-white rounded-sm px-1.5 py-0.5 font-mono">
                {f.key}
              </kbd>
            </li>
          ))}
          <li className="flex items-center justify-between text-[12.5px] text-ora-charcoal">
            <span>Close modals / palette</span>
            <kbd className="text-[10.5px] border border-ora-hairline-2 bg-white rounded-sm px-1.5 py-0.5 font-mono">
              Esc
            </kbd>
          </li>
        </ul>

        <h3 className="ora-label mb-2">Build</h3>
        <p className="text-[12px] text-ora-charcoal">
          v0.1.0 · Concierge AI · Build hackathon-2026
        </p>

        <h3 className="ora-label mt-4 mb-2">Demo data</h3>
        <button
          type="button"
          onClick={() => {
            onResetDemo();
            onClose();
          }}
          className="ora-btn"
        >
          Reset demo data
        </button>
        <p className="mt-1.5 text-[10.5px] text-ora-muted">
          Clears tickets, predictions, and notes. Seed guests are preserved.
        </p>
      </div>
    </Modal>
  );
}

/* -------- Connect Badge QR widget -------- */

function BadgeQRCard({ onClose }: { onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/badge`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargetUrl(url);
    QRCode.toDataURL(url, {
      margin: 1,
      width: 220,
      color: { dark: "#1F1D1B", light: "#FFFFFF" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, []);

  return (
    <div
      className="absolute bottom-3 right-3 z-30 w-[260px] bg-white border border-ora-hairline-2 shadow-[0_4px_14px_rgba(0,0,0,0.08)] rounded-sm fade-up"
      role="dialog"
      aria-label="Connect Badge"
    >
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ora-hairline bg-ora-bg">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--ora-red)" }}
          />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-ora-charcoal">
            Connect Badge
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand" : "Collapse"}
            className="h-5 w-5 rounded-sm hover:bg-ora-row-hover flex items-center justify-center text-ora-muted"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
              {collapsed ? (
                <path d="M5 3L1 7h8L5 3z" />
              ) : (
                <path d="M5 7L1 3h8L5 7z" />
              )}
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-5 w-5 rounded-sm hover:bg-ora-row-hover flex items-center justify-center text-ora-muted"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="px-3 py-3">
          <div className="bg-white border border-ora-hairline rounded-sm p-2 flex items-center justify-center">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt="Badge QR code"
                width={208}
                height={208}
                className="block"
              />
            ) : (
              <div className="h-[208px] w-[208px] bg-ora-bg flex items-center justify-center text-[11px] text-ora-muted">
                Generating QR…
              </div>
            )}
          </div>
          <p className="mt-2.5 text-[11.5px] text-ora-charcoal leading-snug">
            Scan with phone Chrome to open the AI Badge.
          </p>
          <p className="mt-1 text-[10.5px] text-ora-muted-2 break-all font-mono">
            {targetUrl || "—"}
          </p>
          <p className="mt-2 text-[10px] text-ora-muted-2 leading-snug">
            * ngrok or LAN-reachable host required for external phones to connect.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Reservations table tab ---------------- */

type SortDir = "asc" | "desc";

function useSort<T extends string>(
  initial: T,
  initialDir: SortDir = "asc",
) {
  const [col, setCol] = useState<T>(initial);
  const [dir, setDir] = useState<SortDir>(initialDir);
  const toggle = (next: T) => {
    if (next === col) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setCol(next);
      setDir("asc");
    }
  };
  return { col, dir, toggle };
}

function SortHeader<T extends string>({
  label,
  col,
  activeCol,
  dir,
  onClick,
}: {
  label: string;
  col: T;
  activeCol: T;
  dir: SortDir;
  onClick: (c: T) => void;
}) {
  const active = activeCol === col;
  return (
    <button
      type="button"
      onClick={() => onClick(col)}
      className={`flex items-center gap-1 ora-label hover:text-ora-charcoal ${
        active ? "text-ora-charcoal" : ""
      }`}
    >
      <span>{label}</span>
      {active && (
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="currentColor"
          aria-hidden
          className={dir === "desc" ? "rotate-180" : ""}
        >
          <path d="M5 2l3 5H2l3-5z" />
        </svg>
      )}
    </button>
  );
}

function compareStr(a: string, b: string, dir: SortDir): number {
  const r = a.localeCompare(b);
  return dir === "asc" ? r : -r;
}
function compareNum(a: number, b: number, dir: SortDir): number {
  return dir === "asc" ? a - b : b - a;
}

function confirmationNumber(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 33 + id.charCodeAt(i)) >>> 0;
  return `RES-${(n % 1_000_000).toString().padStart(6, "0")}`;
}
function profileId(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return `P-${(n % 1_000_000).toString().padStart(6, "0")}`;
}
function shortSr(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 33 + id.charCodeAt(i)) >>> 0;
  return `SR-${(n % 100000).toString().padStart(5, "0")}`;
}

function ReservationsTable({ onRowClick }: { onRowClick: (id: string) => void }) {
  const guests = useAppStore((s) => s.guests);
  type Col =
    | "conf"
    | "name"
    | "room"
    | "status"
    | "ci"
    | "co"
    | "tier"
    | "stays";
  const { col, dir, toggle } = useSort<Col>("name");

  const sorted = useMemo(() => {
    const arr = [...guests];
    arr.sort((a, b) => {
      switch (col) {
        case "conf":
          return compareStr(confirmationNumber(a.id), confirmationNumber(b.id), dir);
        case "name":
          return compareStr(a.name, b.name, dir);
        case "room":
          return compareStr(a.room ?? "", b.room ?? "", dir);
        case "status":
          return compareStr("IN-HOUSE", "IN-HOUSE", dir);
        case "ci":
          return compareStr(a.booking_dates.check_in, b.booking_dates.check_in, dir);
        case "co":
          return compareStr(a.booking_dates.check_out, b.booking_dates.check_out, dir);
        case "tier":
          return compareStr(a.vip_tier, b.vip_tier, dir);
        case "stays":
          return compareNum(a.past_stays, b.past_stays, dir);
        default:
          return 0;
      }
    });
    return arr;
  }, [guests, col, dir]);

  return (
    <div className="h-full bg-white overflow-y-auto scroll-rw">
      <TableHeader title="Reservations" subtitle={`${guests.length} in-house guests`} />
      <table className="w-full text-[12px]">
        <thead className="bg-ora-bg sticky top-[44px] z-10">
          <tr className="border-b border-ora-hairline">
            <Th><SortHeader label="Confirmation #" col="conf" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Guest" col="name" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Room" col="room" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Status" col="status" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Check-in" col="ci" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Check-out" col="co" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Tier" col="tier" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Past Stays" col="stays" activeCol={col} dir={dir} onClick={toggle} /></Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((g) => (
            <tr
              key={g.id}
              onClick={() => onRowClick(g.id)}
              className="border-b border-ora-hairline hover:bg-ora-row-hover cursor-pointer"
            >
              <Td mono>{confirmationNumber(g.id)}</Td>
              <Td bold>{g.name}</Td>
              <Td>{g.room ?? "—"}</Td>
              <Td>
                <span className="ora-chip ora-chip-green">IN-HOUSE</span>
              </Td>
              <Td>{g.booking_dates.check_in}</Td>
              <Td>{g.booking_dates.check_out}</Td>
              <Td>
                <span className="ora-chip ora-chip-grey">{g.vip_tier.toUpperCase()}</span>
              </Td>
              <Td num>{g.past_stays}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuestProfilesTable({ onRowClick }: { onRowClick: (id: string) => void }) {
  const guests = useAppStore((s) => s.guests);
  type Col = "pid" | "name" | "tier" | "stays" | "last" | "brief";
  const { col, dir, toggle } = useSort<Col>("name");
  const sorted = useMemo(() => {
    const arr = [...guests];
    arr.sort((a, b) => {
      switch (col) {
        case "pid":
          return compareStr(profileId(a.id), profileId(b.id), dir);
        case "name":
          return compareStr(a.name, b.name, dir);
        case "tier":
          return compareStr(a.vip_tier, b.vip_tier, dir);
        case "stays":
          return compareNum(a.past_stays, b.past_stays, dir);
        case "last":
          return compareStr(a.booking_dates.check_in, b.booking_dates.check_in, dir);
        case "brief":
          return compareNum(a.research_brief ? 1 : 0, b.research_brief ? 1 : 0, dir);
        default:
          return 0;
      }
    });
    return arr;
  }, [guests, col, dir]);

  return (
    <div className="h-full bg-white overflow-y-auto scroll-rw">
      <TableHeader title="Guest Profiles" subtitle={`${guests.length} profiles · Click a row to focus`} />
      <table className="w-full text-[12px]">
        <thead className="bg-ora-bg sticky top-[44px] z-10">
          <tr className="border-b border-ora-hairline">
            <Th><SortHeader label="Profile #" col="pid" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Name" col="name" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Tier" col="tier" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Past Stays" col="stays" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="Last Stay" col="last" activeCol={col} dir={dir} onClick={toggle} /></Th>
            <Th><SortHeader label="AI Brief" col="brief" activeCol={col} dir={dir} onClick={toggle} /></Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((g) => (
            <tr
              key={g.id}
              onClick={() => onRowClick(g.id)}
              className="border-b border-ora-hairline hover:bg-ora-row-hover cursor-pointer"
            >
              <Td mono>{profileId(g.id)}</Td>
              <Td bold>{g.name}</Td>
              <Td>
                <span className="ora-chip ora-chip-grey">{g.vip_tier.toUpperCase()}</span>
              </Td>
              <Td num>{g.past_stays}</Td>
              <Td>{g.booking_dates.check_in}</Td>
              <Td>
                {g.research_brief ? (
                  <span className="ora-chip ora-chip-green">YES</span>
                ) : (
                  <span className="ora-chip ora-chip-grey">—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivitiesTable() {
  const tickets = useAppStore((s) => s.tickets);
  type Col = "time" | "sr" | "dept" | "subject" | "guest" | "status";
  const { col, dir, toggle } = useSort<Col>("time", "desc");
  const sorted = useMemo(() => {
    const arr = [...tickets];
    arr.sort((a, b) => {
      switch (col) {
        case "time":
          return compareStr(a.timestamp, b.timestamp, dir);
        case "sr":
          return compareStr(shortSr(a.id), shortSr(b.id), dir);
        case "dept":
          return compareStr(a.department, b.department, dir);
        case "subject":
          return compareStr(a.intent, b.intent, dir);
        case "guest":
          return compareStr(a.guest_name ?? "", b.guest_name ?? "", dir);
        case "status":
          return compareStr(a.status ?? "open", b.status ?? "open", dir);
        default:
          return 0;
      }
    });
    return arr;
  }, [tickets, col, dir]);

  return (
    <div className="h-full bg-white overflow-y-auto scroll-rw">
      <TableHeader title="Activity Log" subtitle={`${tickets.length} service request${tickets.length === 1 ? "" : "s"} on record`} />
      {tickets.length === 0 ? (
        <div className="px-6 py-16 text-center text-[12.5px] text-ora-muted">
          No activity yet. Trigger a sample SR or use the Connect Badge.
        </div>
      ) : (
        <table className="w-full text-[12px]">
          <thead className="bg-ora-bg sticky top-[44px] z-10">
            <tr className="border-b border-ora-hairline">
              <Th><SortHeader label="Time" col="time" activeCol={col} dir={dir} onClick={toggle} /></Th>
              <Th><SortHeader label="SR #" col="sr" activeCol={col} dir={dir} onClick={toggle} /></Th>
              <Th><SortHeader label="Department" col="dept" activeCol={col} dir={dir} onClick={toggle} /></Th>
              <Th><SortHeader label="Subject" col="subject" activeCol={col} dir={dir} onClick={toggle} /></Th>
              <Th><SortHeader label="Guest" col="guest" activeCol={col} dir={dir} onClick={toggle} /></Th>
              <Th><SortHeader label="Status" col="status" activeCol={col} dir={dir} onClick={toggle} /></Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const status = t.status ?? "open";
              const chip =
                status === "resolved"
                  ? "ora-chip-green"
                  : status === "escalated"
                    ? "ora-chip-red"
                    : status === "in-progress"
                      ? "ora-chip-blue"
                      : "ora-chip-amber";
              return (
                <tr key={t.id} className="border-b border-ora-hairline hover:bg-ora-row-hover">
                  <Td num>{new Date(t.timestamp).toLocaleString()}</Td>
                  <Td mono>{shortSr(t.id)}</Td>
                  <Td>{t.department}</Td>
                  <Td bold>{t.intent}</Td>
                  <Td>{t.guest_name ?? "—"}</Td>
                  <Td><span className={`ora-chip ${chip}`}>{status.toUpperCase()}</span></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReportsTab() {
  const tickets = useAppStore((s) => s.tickets);
  const total = tickets.length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="h-full bg-white overflow-y-auto scroll-rw">
      <TableHeader title="Reports" subtitle="Live mock KPIs · refreshes when SRs change" />
      <div className="p-5 grid grid-cols-3 gap-4 max-w-[900px]">
        <KpiTile label="SRs Today" value={String(total)} />
        <KpiTile label="Resolved Rate" value={`${rate}%`} />
        <KpiTile label="Avg Routing Time" value="1.4s" suffix="via Anthropic" />
      </div>
      <div className="px-5 pb-5">
        <div className="ora-card p-4 max-w-[900px]">
          <div className="ora-label mb-2">Hourly SR volume (mock)</div>
          <svg viewBox="0 0 320 60" width="100%" height="60" className="text-ora-red">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              points="0,40 30,32 60,38 90,18 120,28 150,12 180,22 210,30 240,16 270,24 300,8 320,18"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="ora-card px-4 py-3">
      <div className="ora-label">{label}</div>
      <div className="mt-1 text-[22px] font-semibold text-ora-charcoal tabular-nums leading-none">
        {value}
      </div>
      {suffix && (
        <div className="mt-1 text-[11px] text-ora-muted">{suffix}</div>
      )}
    </div>
  );
}

function TableHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-5 py-3 border-b border-ora-hairline bg-white sticky top-0 z-10">
      <h2 className="text-[14px] font-semibold text-ora-charcoal">{title}</h2>
      <p className="mt-0.5 text-[11.5px] text-ora-muted">{subtitle}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left font-normal px-3 py-1.5 align-middle">{children}</th>
  );
}

function Td({
  children,
  mono,
  bold,
  num,
}: {
  children: React.ReactNode;
  mono?: boolean;
  bold?: boolean;
  num?: boolean;
}) {
  return (
    <td
      className={`px-3 py-1.5 align-middle text-ora-charcoal ${
        mono ? "font-mono tabular-nums" : ""
      } ${bold ? "font-semibold" : ""} ${num ? "tabular-nums" : ""}`}
    >
      {children}
    </td>
  );
}
