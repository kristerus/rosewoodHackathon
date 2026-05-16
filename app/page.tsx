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
import type { Department, Guest, Ticket, TicketStatus, Urgency } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase";
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
import ReservationsTab from "@/components/ReservationsTab";
import GuestProfilesTab from "@/components/GuestProfilesTab";
import ActivitiesTab from "@/components/ActivitiesTab";
import ReportsTab from "@/components/ReportsTab";
import AddGuestModal, { type NewGuestInput } from "@/components/AddGuestModal";
import ManualInputPanel, { type ManualGuestData } from "@/components/ManualInputPanel";
import { ToasterProvider, useToast } from "@/components/Toaster";
import BadgesPanel, { useBadgePingOnTicket } from "@/components/BadgesPanel";
import BadgesStatusPill from "@/components/BadgesStatusPill";
import SideDrawer from "@/components/SideDrawer";

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
  const enrichGuest = useAppStore((s) => s.enrichGuest);
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
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Flash the wearer's badge to LIVE when an SSE ticket arrives.
  useBadgePingOnTicket(tickets);

  const guestSidebarRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  // Bumping this state value re-runs the SSE effect (used by F5 Refresh).
  const [sseEpoch, setSseEpoch] = useState(0);

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

  /* ---------- Supabase Realtime wiring ---------- */
  useEffect(() => {
    // Shape the raw Supabase row (snake_case `created_at`) into our app's
    // Ticket type (which keeps the legacy `timestamp` field).
    type TicketRow = {
      id: string;
      created_at: string;
      guest_name: string | null;
      room_number: string | null;
      department: Department;
      urgency: Urgency;
      intent: string;
      action_required: string;
      guest_facing_message: string | null;
      internal_notes: string | null;
      raw_transcript: string;
      staff_id: string;
      status?: TicketStatus;
    };
    const rowToTicket = (row: TicketRow): Ticket => ({
      id: row.id,
      timestamp: row.created_at,
      guest_name: row.guest_name,
      room_number: row.room_number,
      department: row.department,
      urgency: row.urgency,
      intent: row.intent,
      action_required: row.action_required,
      guest_facing_message: row.guest_facing_message ?? "",
      internal_notes: row.internal_notes ?? "",
      raw_transcript: row.raw_transcript,
      staff_id: row.staff_id,
      status: row.status ?? "open",
    });

    // 1) Hydrate the dashboard with the most recent persisted tickets so the
    //    UI doesn't look empty on a fresh load. Uses server endpoint —
    //    works without any NEXT_PUBLIC_ env var.
    void (async () => {
      try {
        const res = await fetch("/api/tickets/recent?limit=50");
        if (!res.ok) return;
        const data = (await res.json()) as { tickets: Ticket[] };
        for (const t of data.tickets.slice().reverse()) addTicket(t);
      } catch {
        /* offline hydration is best-effort */
      }
    })();

    // 1b) Polling fallback — runs ALWAYS, regardless of Realtime status.
    //     Catches new tickets within 3 seconds. Critical when the Supabase
    //     Realtime websocket can't connect (e.g. NEXT_PUBLIC_SUPABASE_URL
    //     missing from the Vercel build).
    const pollInterval = window.setInterval(async () => {
      try {
        const res = await fetch("/api/tickets/recent?limit=50");
        if (!res.ok) return;
        const data = (await res.json()) as { tickets: Ticket[] };
        const knownIds = new Set(useAppStore.getState().tickets.map((t) => t.id));
        const fresh = data.tickets.filter((t) => !knownIds.has(t.id));
        if (fresh.length === 0) return;
        for (const t of fresh.slice().reverse()) {
          addTicket(t);
          const match = matchGuestForTicket(t, useAppStore.getState().guests);
          if (match) {
            focusGuest(match.id);
            setFocusedKey(match.id);
          }
        }
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try { navigator.vibrate?.(80); } catch {}
        }
      } catch {
        /* polling is best-effort */
      }
    }, 3000);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setSseConnected(false);
      // Polling is still running — return a cleanup that stops it.
      return () => window.clearInterval(pollInterval);
    }

    // 2) Subscribe to live INSERTs from Supabase. Replaces the old SSE stream.
    const channel = supabase
      .channel(`rosewood-tickets-${sseEpoch}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets" },
        (payload) => {
          const ticket = rowToTicket(payload.new as TicketRow);
          addTicket(ticket);
          const match = matchGuestForTicket(
            ticket,
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
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transcripts" },
        (payload) => {
          const t = payload.new as { transcript: string; staff_id: string };
          setTranscript(t.transcript);
          setListening(true);
        },
      )
      .subscribe((status) => {
        setSseConnected(status === "SUBSCRIBED");
      });

    return () => {
      window.clearInterval(pollInterval);
      void supabase.removeChannel(channel);
    };
    // sseEpoch bump forces a re-subscribe (F5 refresh).
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
    const guestId = focusedGuest.id;
    const guestsSnapshot = useAppStore.getState().guests;

    // Fire BOTH in parallel: the AI brief AND real social scraping.
    // Brief failure falls back to /api/guest-brief; scrape failure is non-fatal.
    const briefPromise = (async () => {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guestId, guests: guestsSnapshot }),
      });
      if (res.ok) return (await res.json()) as { brief: Parameters<typeof setGuestBrief>[1] };
      const fb = await fetch("/api/guest-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guestId, guests: guestsSnapshot }),
      });
      if (!fb.ok) {
        const err = await fb.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${fb.status}`);
      }
      return (await fb.json()) as { brief: Parameters<typeof setGuestBrief>[1] };
    })();

    const scrapePromise = (async () => {
      const res = await fetch("/api/social-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guestId, guests: guestsSnapshot }),
      });
      if (!res.ok) return null;
      return (await res.json()) as { enriched_guest: Parameters<typeof enrichGuest>[1]; source: string };
    })();

    try {
      const [briefResult, scrapeResult] = await Promise.allSettled([briefPromise, scrapePromise]);
      if (briefResult.status === "fulfilled") {
        setGuestBrief(guestId, briefResult.value.brief);
      } else {
        setError(briefResult.reason instanceof Error ? briefResult.reason.message : String(briefResult.reason));
      }
      if (scrapeResult.status === "fulfilled" && scrapeResult.value) {
        enrichGuest(guestId, scrapeResult.value.enriched_guest);
      }
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [focusedGuest, isGeneratingBrief, setGuestBrief, enrichGuest]);

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
        learnedPreferences: [],
        past_stays: data.past_stays,
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

  /* ---------- Render ---------- */

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-ora-bg text-ora-charcoal">
      {refreshing && <div className="ora-progress-bar" />}

      {/* Single thin OPERA Cloud topbar */}
      <div className="shrink-0 h-11 px-3 flex items-center justify-between bg-white border-b border-ora-hairline">
        {/* LEFT — hamburger + wordmark + property */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            aria-label="Open main menu"
            onClick={() => setDrawerOpen((v) => !v)}
            className="h-7 w-7 rounded-sm hover:bg-ora-row-hover flex items-center justify-center text-ora-charcoal"
            title="Main menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("service")}
            className="font-bold tracking-tight text-[14px] leading-none hover:opacity-80"
            style={{ color: "var(--ora-red)" }}
            title="OPERA Cloud — Home"
          >
            OPERA Cloud
          </button>
          <span className="text-ora-muted-2">·</span>
          <PropertyPicker />
        </div>

        {/* CENTER — breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-ora-muted min-w-0 px-3 flex-1 justify-center">
          <span className="truncate">
            <span>
              {NAV_TABS.find((t) => t.key === activeTab)?.label ?? "Service Requests"}
            </span>
            {activeTab === "service" && focusedGuest && (
              <>
                <span className="mx-1.5">›</span>
                <span className="text-ora-charcoal font-medium">
                  {focusedGuest.name}
                  {focusedGuest.room && (
                    <span className="ml-1 text-ora-muted font-normal">
                      · {focusedGuest.room}
                    </span>
                  )}
                </span>
              </>
            )}
          </span>
        </div>

        {/* RIGHT — badges + status + help + avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <BadgesStatusPill onOpenPanel={() => setBadgesOpen(true)} />
          <span className="h-4 w-px bg-ora-hairline" />
          <span className="inline-flex items-center gap-1.5 text-[11px]">
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
              {sseConnected ? "Live · Connected" : "Offline"}
            </span>
          </span>
          <span className="h-4 w-px bg-ora-hairline" />
          <button
            type="button"
            aria-label="Quick Find"
            onClick={() => setPaletteOpen(true)}
            className="h-7 w-7 rounded-sm hover:bg-ora-row-hover flex items-center justify-center text-ora-muted"
            title="Quick Find (F2)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Help"
            onClick={() => setHelpOpen(true)}
            className="h-7 w-7 rounded-sm hover:bg-ora-row-hover flex items-center justify-center text-ora-muted"
            title="Help (F1)"
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
            <div
              ref={guestSidebarRef}
              className="h-full min-h-0 overflow-hidden"
            >
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
          <ReservationsTab
            onRowClick={(id) => {
              handleFocusGuest(id);
              setActiveTab("service");
            }}
          />
        ) : activeTab === "guests" ? (
          <GuestProfilesTab
            onRowClick={(id) => {
              handleFocusGuest(id);
              setActiveTab("service");
            }}
          />
        ) : activeTab === "activities" ? (
          <ActivitiesTab />
        ) : activeTab === "folio" ? (
          <FolioTab
            guests={guests}
            focusedGuestId={focusedGuestId}
            onFocusGuest={(id) => {
              focusGuest(id);
              setActiveTab("folio");
            }}
          />
        ) : activeTab === "reports" ? (
          <ReportsTab />
        ) : (
          <SetupTab />
        )}
      </main>

      {/* Hamburger drawer — primary OPERA Cloud nav affordance */}
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} topOffset={44}>
        <div className="px-3 py-2.5 border-b border-ora-hairline bg-ora-bg flex items-center gap-2">
          <Logo size={18} variant="mark" tone="forest" />
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-ora-charcoal leading-tight">
              {selectedProperty.name}
            </div>
            <div className="text-[10px] text-ora-muted-2 uppercase tracking-wider">
              OPERA Cloud · v26.2
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scroll-rw py-1">
          <DrawerItem
            label="Home"
            icon="home"
            active={activeTab === "service"}
            onClick={() => {
              setActiveTab("service");
              setDrawerOpen(false);
            }}
          />
          {NAV_TABS.map((tab) => (
            <DrawerItem
              key={tab.key}
              label={tab.label}
              icon={tab.key}
              active={activeTab === tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setDrawerOpen(false);
              }}
            />
          ))}
          <div className="my-1.5 mx-3 h-px bg-ora-hairline" />
          <DrawerItem
            label="Configuration"
            icon="config"
            onClick={() => {
              setActiveTab("setup");
              setDrawerOpen(false);
            }}
          />
          <DrawerItem
            label="System"
            icon="system"
            onClick={() => {
              setDrawerOpen(false);
              setHelpOpen(true);
            }}
          />
          <div className="my-1.5 mx-3 h-px bg-ora-hairline" />
          <DrawerItem
            label="Connect Badge (QR)"
            icon="badge"
            onClick={() => {
              setShowBadgeQR(true);
              setDrawerOpen(false);
            }}
          />
          <DrawerItem
            label="Fleet · Badges Panel"
            icon="fleet"
            onClick={() => {
              setBadgesOpen(true);
              setDrawerOpen(false);
            }}
          />
        </nav>
        <div className="px-3 py-2 border-t border-ora-hairline text-[10px] text-ora-muted-2 uppercase tracking-wider flex items-center justify-between">
          <span>Property: {selectedProperty.id.toUpperCase()}</span>
          <span>kristian-01</span>
        </div>
      </SideDrawer>

      {/* Badges fleet panel */}
      <BadgesPanel open={badgesOpen} onClose={() => setBadgesOpen(false)} />

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

/* ---------------- Drawer Item ---------------- */

function DrawerItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full text-left flex items-center gap-2.5 px-3 py-2 text-[12.5px] border-l-[3px] transition-colors " +
        (active
          ? "bg-ora-bg border-l-ora-red text-ora-charcoal font-semibold"
          : "border-l-transparent text-ora-charcoal hover:bg-ora-row-hover")
      }
    >
      <span
        className="h-5 w-5 flex items-center justify-center text-ora-muted shrink-0"
        aria-hidden
      >
        <DrawerIcon name={icon} />
      </span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

function DrawerIcon({ name }: { name: string }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.7,
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "reservations":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="1.5" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      );
    case "guests":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
        </svg>
      );
    case "service":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
        </svg>
      );
    case "activities":
      return (
        <svg {...common}>
          <path d="M3 12h4l3-9 4 18 3-9h4" />
        </svg>
      );
    case "folio":
      return (
        <svg {...common}>
          <path d="M5 3h11l4 4v14H5z" />
          <path d="M14 3v6h6" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M3 21V8" />
          <path d="M9 21V4" />
          <path d="M15 21v-9" />
          <path d="M21 21V14" />
        </svg>
      );
    case "setup":
    case "config":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    case "system":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      );
    case "badge":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="1" />
          <path d="M4 9h16M9 4v16" />
        </svg>
      );
    case "fleet":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="18" cy="12" r="2.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
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
    // Prefer the production URL so phones can scan from any environment
    // (local dev included). Falls back to window.location.origin only if
    // the production domain isn't reachable.
    const url = "https://hotel.eliaspfeffer.de/badge";
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

