"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  Department,
  Guest,
  Ticket,
  TicketStatus,
  Urgency,
} from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/Toaster";
import IWantToButton from "@/components/IWantToButton";

interface ConversationThreadProps {
  guest: Guest | null;
  unassigned: boolean;
  tickets: Ticket[];
  isListening: boolean;
  liveTranscript: string;
  onSampleTranscript: (text: string) => void;
  onTriggerBadge: (text: string) => void;
  isProcessing: boolean;
  onOpenNewSR: () => void;
}

type SubTab =
  | "activity"
  | "reservation"
  | "folio"
  | "notes"
  | "preferences"
  | "routing";

const DEPT_META: Record<Department, { label: string; code: string; chip: string }> = {
  concierge: { label: "Concierge", code: "CON", chip: "ora-chip-amber" },
  housekeeping: { label: "Housekeeping", code: "HSK", chip: "ora-chip-green" },
  fnb: { label: "Food & Beverage", code: "F&B", chip: "ora-chip-red" },
  maintenance: { label: "Engineering", code: "ENG", chip: "ora-chip-grey" },
  frontdesk: { label: "Front Desk", code: "FOM", chip: "ora-chip-blue" },
};

const URGENCY_META: Record<Urgency, { label: string; chip: string }> = {
  low: { label: "LOW", chip: "ora-chip-grey" },
  normal: { label: "ROUTINE", chip: "ora-chip-grey" },
  high: { label: "ELEVATED", chip: "ora-chip-amber" },
  urgent: { label: "URGENT", chip: "ora-chip-red" },
};

const STATUS_META: Record<TicketStatus, { label: string; chip: string }> = {
  open: { label: "OPEN", chip: "ora-chip-amber" },
  "in-progress": { label: "IN PROGRESS", chip: "ora-chip-blue" },
  resolved: { label: "RESOLVED", chip: "ora-chip-green" },
  escalated: { label: "ESCALATED", chip: "ora-chip-red" },
};

const DEPT_OPTIONS: { value: Department; label: string }[] = [
  { value: "concierge", label: "Concierge" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "fnb", label: "Food & Beverage" },
  { value: "maintenance", label: "Engineering" },
  { value: "frontdesk", label: "Front Desk" },
];

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

function srNumber(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 33 + id.charCodeAt(i)) >>> 0;
  return `SR-${(n % 100000).toString().padStart(5, "0")}`;
}

function profileId(guestId: string): string {
  let n = 0;
  for (let i = 0; i < guestId.length; i++) n = (n * 31 + guestId.charCodeAt(i)) >>> 0;
  return `P-${(n % 1_000_000).toString().padStart(6, "0")}`;
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

function tierLabel(t: Guest["vip_tier"]): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function ConversationThread({
  guest,
  unassigned,
  tickets,
  isListening,
  liveTranscript,
  onSampleTranscript,
  onTriggerBadge,
  isProcessing,
  onOpenNewSR,
}: ConversationThreadProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevCount = useRef(tickets.length);
  const [briefListening, setBriefListening] = useState(false);

  const [subTab, setSubTab] = useState<SubTab>("activity");
  const [reassignOpenFor, setReassignOpenFor] = useState<string | null>(null);

  const selectedTicketId = useAppStore((s) => s.selectedTicketId);
  const selectTicket = useAppStore((s) => s.selectTicket);
  const updateTicket = useAppStore((s) => s.updateTicket);
  const resetDemoState = useAppStore((s) => s.resetDemoState);
  const { toast } = useToast();

  // Determine "active" ticket — selected one if it's in current thread, else most recent
  const activeTicket: Ticket | null = useMemo(() => {
    if (!tickets.length) return null;
    const sel = tickets.find((t) => t.id === selectedTicketId);
    return sel ?? tickets[0];
  }, [tickets, selectedTicketId]);

  useEffect(() => {
    if (tickets.length > prevCount.current) {
      setBriefListening(true);
      const t = setTimeout(() => setBriefListening(false), 1400);
      prevCount.current = tickets.length;
      return () => clearTimeout(t);
    }
    prevCount.current = tickets.length;
  }, [tickets.length]);

  useEffect(() => {
    if (subTab !== "activity") return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [tickets.length, liveTranscript, subTab]);

  // When selectedTicketId changes from outside (e.g. Stay History), scroll to that card
  useEffect(() => {
    if (subTab !== "activity") return;
    if (!selectedTicketId) return;
    const el = document.getElementById(`sr-card-${selectedTicketId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedTicketId, subTab]);

  const chronological = [...tickets].reverse();
  const showListeningBar = isListening || briefListening || isProcessing;

  const handleMarkResolved = () => {
    if (!activeTicket) return;
    updateTicket(activeTicket.id, { status: "resolved" });
    toast(`${srNumber(activeTicket.id)} resolved`, "success");
  };

  const handleEscalate = () => {
    if (!activeTicket) return;
    updateTicket(activeTicket.id, { urgency: "urgent", status: "escalated" });
    toast("Escalated to Director on Duty (mock)", "error");
  };

  const handleReassign = (dept: Department) => {
    if (!activeTicket) return;
    updateTicket(activeTicket.id, { department: dept });
    setReassignOpenFor(null);
    toast(`Reassigned to ${DEPT_META[dept].label}`, "info");
  };

  const handleClearDemoState = () => {
    resetDemoState();
    toast("Demo state cleared", "info");
  };

  const actionsDisabled = !activeTicket;
  const actionTooltip = actionsDisabled ? "No service request selected" : undefined;

  return (
    <section className="flex h-full min-h-0 flex-col bg-ora-bg border-r border-ora-hairline">
      {/* Header — guest summary strip */}
      <header className="bg-white border-b border-ora-hairline">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="min-w-0 flex-1">
            {guest ? (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-ora-charcoal truncate">
                    {guest.name}
                  </h2>
                  <span className="ora-chip ora-chip-blue">
                    ROOM {guest.room ?? "—"}
                  </span>
                  <span className="ora-chip ora-chip-green">IN-HOUSE</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-ora-muted tabular-nums">
                  <span>
                    Profile{" "}
                    <span className="font-mono text-ora-charcoal">
                      #{profileId(guest.id)}
                    </span>
                  </span>
                  <span>·</span>
                  <span>
                    Stay {guest.past_stays + 1} of {guest.past_stays + 1} past stays
                  </span>
                  <span>·</span>
                  <span>
                    Loyalty:{" "}
                    <span className="text-ora-charcoal font-semibold uppercase tracking-wider">
                      {tierLabel(guest.vip_tier)}
                    </span>
                  </span>
                </div>
              </>
            ) : unassigned ? (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-ora-charcoal">
                    Unallocated Service Requests
                  </h2>
                  <span className="ora-chip ora-chip-red">UNALLOCATED</span>
                </div>
                <p className="mt-1 text-[11px] text-ora-muted">
                  SRs without a matched guest profile · {tickets.length} pending
                </p>
              </>
            ) : (
              <>
                <h2 className="text-[15px] font-semibold text-ora-charcoal">
                  Select a reservation
                </h2>
                <p className="mt-1 text-[11px] text-ora-muted">
                  Choose a guest from the Reservations panel to view their service requests.
                </p>
              </>
            )}
          </div>
          {/* Action toolbar (Opera-style buttons) */}
          <div className="flex items-center gap-1.5 relative">
            <button
              type="button"
              onClick={onOpenNewSR}
              className="ora-btn ora-btn-primary"
              title="New service request (F12)"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
              </svg>
              New SR
            </button>
            <div className="relative">
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() =>
                  setReassignOpenFor((v) => (v ? null : activeTicket!.id))
                }
                className="ora-btn"
                title={actionTooltip}
              >
                Reassign
              </button>
              {reassignOpenFor && activeTicket && (
                <ReassignDropdown
                  current={activeTicket.department}
                  onClose={() => setReassignOpenFor(null)}
                  onPick={handleReassign}
                />
              )}
            </div>
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={handleMarkResolved}
              className="ora-btn"
              title={actionTooltip}
            >
              Mark Resolved
            </button>
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={handleEscalate}
              className="ora-btn"
              title={actionTooltip}
            >
              Escalate
            </button>
          </div>
        </div>

        {/* Tab strip inside the workspace */}
        <div className="px-5 flex items-center gap-0 border-t border-ora-hairline text-[11.5px]">
          <SubTabBtn
            label="Activity Log"
            count={tickets.length}
            active={subTab === "activity"}
            onClick={() => setSubTab("activity")}
          />
          <SubTabBtn
            label="Reservation"
            active={subTab === "reservation"}
            onClick={() => setSubTab("reservation")}
          />
          <SubTabBtn
            label="Folio"
            active={subTab === "folio"}
            onClick={() => setSubTab("folio")}
          />
          <SubTabBtn
            label="Notes"
            active={subTab === "notes"}
            onClick={() => setSubTab("notes")}
          />
          <SubTabBtn
            label="Preferences"
            active={subTab === "preferences"}
            onClick={() => setSubTab("preferences")}
          />
          <SubTabBtn
            label="Routing"
            active={subTab === "routing"}
            onClick={() => setSubTab("routing")}
          />
        </div>
      </header>

      {/* Listening status strip */}
      <div
        className={`px-5 py-1.5 border-b border-ora-hairline bg-white text-[11px] flex items-center gap-2 transition-opacity ${
          showListeningBar ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!showListeningBar}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inset-0 rounded-full opacity-70 pulse-ring"
            style={{ backgroundColor: "var(--ora-red)" }}
          />
          <span
            className="relative h-2 w-2 rounded-full pulse-dot"
            style={{ backgroundColor: "var(--ora-red)" }}
          />
        </span>
        <span className="text-ora-charcoal font-medium">
          AI Concierge listening
        </span>
        <span className="text-ora-muted">
          · Live transcript inbound from staff-kristian-01
        </span>
      </div>

      {/* Sub-tab content area */}
      <div ref={scrollRef} className="scroll-rw flex-1 overflow-y-auto px-5 py-4">
        {subTab === "activity" ? (
          !guest && !unassigned ? (
            <EmptyChooseGuest />
          ) : chronological.length === 0 && !liveTranscript ? (
            <EmptyConversation />
          ) : (
            <div className="space-y-3">
              {chronological.map((t) => (
                <ServiceRequestCard
                  key={t.id}
                  ticket={t}
                  selected={selectedTicketId === t.id}
                  onSelect={() => selectTicket(t.id)}
                  onAssign={() => {
                    selectTicket(t.id);
                    setReassignOpenFor(t.id);
                  }}
                />
              ))}
              {liveTranscript && <LiveTranscriptRow text={liveTranscript} />}
            </div>
          )
        ) : subTab === "reservation" ? (
          <ReservationPane guest={guest} />
        ) : subTab === "folio" ? (
          <FolioPane guest={guest} />
        ) : subTab === "notes" ? (
          <NotesPane guest={guest} />
        ) : subTab === "preferences" ? (
          <PreferencesPane guest={guest} />
        ) : (
          <RoutingPane />
        )}
      </div>

      {/* Footer — advanced demo controls */}
      <div className="border-t border-ora-hairline bg-white">
        <div className="px-5 py-2.5">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[10.5px] uppercase tracking-wider text-ora-muted hover:text-ora-charcoal flex items-center gap-1.5 font-semibold"
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              fill="currentColor"
              className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}
              aria-hidden
            >
              <path d="M3 1l4 4-4 4V1z" />
            </svg>
            Demo Console · Simulate Badge Transcript
          </button>
          {showAdvanced && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-4 border-l-2 border-ora-hairline">
              <span className="text-[10px] uppercase tracking-wider text-ora-muted-2 mr-1">
                Sample SRs:
              </span>
              {SAMPLE_TRANSCRIPTS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onSampleTranscript(s.text)}
                  className="ora-btn h-7 text-[11px]"
                >
                  {s.label}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-ora-hairline" />
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onTriggerBadge(SAMPLE_TRANSCRIPTS[0].text)}
                className="ora-btn ora-btn-primary h-7 text-[11px]"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
                </svg>
                Trigger Badge
              </button>
              <span className="mx-1 h-4 w-px bg-ora-hairline" />
              <button
                type="button"
                onClick={handleClearDemoState}
                className="ora-btn h-7 text-[11px]"
              >
                Clear demo state
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Sub-components ---------- */

function SubTabBtn({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : "false"}
      className="ora-tab !h-8 !text-[11.5px] !px-3"
    >
      {label}
      {typeof count === "number" && (
        <span
          className={`ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[15px] px-1 rounded-sm text-[9.5px] font-bold tabular-nums ${
            active
              ? "bg-ora-red text-white"
              : "bg-ora-bg text-ora-muted border border-ora-hairline"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ReassignDropdown({
  current,
  onClose,
  onPick,
}: {
  current: Department;
  onClose: () => void;
  onPick: (d: Department) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-40 w-[180px] bg-white border border-ora-hairline-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] rounded-sm fade-up"
    >
      <div className="px-3 py-2 border-b border-ora-hairline bg-ora-bg">
        <span className="ora-label">Reassign to</span>
      </div>
      <ul>
        {DEPT_OPTIONS.map((d) => (
          <li key={d.value}>
            <button
              type="button"
              onClick={() => onPick(d.value)}
              className={`w-full text-left text-[12px] px-3 py-1.5 flex items-center justify-between hover:bg-ora-row-hover ${
                d.value === current
                  ? "text-ora-red font-semibold"
                  : "text-ora-charcoal"
              }`}
            >
              <span>{d.label}</span>
              {d.value === current && (
                <span className="text-[9.5px] uppercase tracking-wider text-ora-muted">
                  current
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceRequestCard({
  ticket,
  selected,
  onSelect,
  onAssign,
}: {
  ticket: Ticket;
  selected: boolean;
  onSelect: () => void;
  onAssign: () => void;
}) {
  const dept = DEPT_META[ticket.department];
  const urg = URGENCY_META[ticket.urgency];
  const status = ticket.status ?? "open";
  const statusMeta = STATUS_META[status];
  const sr = srNumber(ticket.id);
  const [showRaw, setShowRaw] = useState(false);
  const updateTicket = useAppStore((s) => s.updateTicket);
  const { toast } = useToast();

  const cardClasses = [
    "ora-card slide-in cursor-pointer transition-all",
    selected ? "ring-2 ring-ora-red shadow-[0_2px_8px_rgba(199,70,52,0.18)]" : "",
    status === "resolved" ? "opacity-70 border-l-[3px] border-l-ora-green" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      id={`sr-card-${ticket.id}`}
      className={cardClasses}
      onClick={onSelect}
    >
      {status === "escalated" && (
        <div className="px-3.5 py-1.5 bg-ora-red text-white text-[10.5px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2L1 21h22L12 2zm-1 5v8h2V7h-2zm0 10v2h2v-2h-2z" />
          </svg>
          Escalated to Director on Duty
        </div>
      )}
      {/* Top strip */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-ora-hairline bg-ora-bg">
        <div className="flex items-center gap-2">
          <span className="ora-chip ora-chip-grey font-mono">{dept.code}</span>
          <span className="text-[11.5px] font-mono font-semibold text-ora-charcoal tabular-nums">
            {sr}
          </span>
          <span className={`ora-chip ${urg.chip}`}>{urg.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`ora-chip ${statusMeta.chip}`}>{statusMeta.label}</span>
          <span className="text-[10.5px] text-ora-muted-2 tabular-nums">
            Logged {formatTime(ticket.timestamp)}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="px-3.5 pt-2.5 pb-1.5">
        <h4 className="text-[13.5px] font-semibold text-ora-charcoal leading-snug">
          {ticket.intent}
        </h4>
        <p className="mt-0.5 text-[10.5px] uppercase tracking-wider text-ora-muted">
          {dept.label}
          {ticket.guest_name && <> · {ticket.guest_name}</>}
          {ticket.room_number && <> · Room {ticket.room_number}</>}
        </p>
      </div>

      {/* Key/value form body */}
      <dl className="px-3.5 py-2 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[12px] border-t border-ora-hairline">
        {ticket.raw_transcript && (
          <>
            <dt className="ora-label pt-0.5">Request</dt>
            <dd className="text-ora-charcoal leading-relaxed">
              <span className="italic text-ora-muted">&ldquo;</span>
              {ticket.raw_transcript}
              <span className="italic text-ora-muted">&rdquo;</span>
            </dd>
          </>
        )}
        {ticket.action_required && (
          <>
            <dt className="ora-label pt-0.5">Action</dt>
            <dd className="text-ora-charcoal leading-relaxed">
              {ticket.action_required}
            </dd>
          </>
        )}
        {ticket.internal_notes && (
          <>
            <dt className="ora-label pt-0.5">Notes</dt>
            <dd className="text-ora-muted leading-relaxed italic">
              {ticket.internal_notes}
            </dd>
          </>
        )}
        {showRaw && (
          <>
            <dt className="ora-label pt-0.5">Raw</dt>
            <dd className="text-ora-muted leading-relaxed font-mono text-[11px]">
              id: {ticket.id}
              <br />
              staff: {ticket.staff_id}
              <br />
              ts: {ticket.timestamp}
            </dd>
          </>
        )}
      </dl>

      {/* Guest communication sub-row */}
      {ticket.guest_facing_message && (
        <div className="px-3.5 py-2 border-t border-ora-hairline bg-[#FAFAFA]">
          <div className="flex items-center gap-2 mb-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="text-ora-blue">
              <path d="M22 16.92V21a1 1 0 0 1-1.1 1 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A1 1 0 0 1 4.21 3h4.09a1 1 0 0 1 1 .75 11.43 11.43 0 0 0 .62 2.5 1 1 0 0 1-.23 1L8 9a16 16 0 0 0 6 6l1.75-1.69a1 1 0 0 1 1-.23 11.43 11.43 0 0 0 2.5.62 1 1 0 0 1 .75 1z" />
            </svg>
            <span className="ora-label">Guest Communication</span>
            <span className="ml-auto text-[10px] text-ora-muted-2">
              SMS sent via Oracle Hospitality Integration
            </span>
          </div>
          <blockquote className="border-l-2 border-ora-blue/40 bg-white border border-ora-hairline pl-3 pr-3 py-2 text-[12px] text-ora-charcoal leading-relaxed">
            {ticket.guest_facing_message}
          </blockquote>
        </div>
      )}

      {/* Footer meta */}
      <div className="px-3.5 py-1.5 border-t border-ora-hairline flex items-center justify-between text-[10.5px] text-ora-muted-2 tabular-nums">
        <span>
          Source:{" "}
          <span className="text-ora-charcoal font-medium">AI Concierge Badge</span>
          {" · "}
          Staff{" "}
          <span className="text-ora-charcoal font-mono">{ticket.staff_id}</span>
        </span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAssign();
            }}
            className="text-ora-blue hover:underline"
          >
            Assign
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowRaw((v) => !v);
            }}
            className="text-ora-blue hover:underline"
          >
            {showRaw ? "Hide" : "View"} Full SR
          </button>
          <IWantToButton
            size="sm"
            align="right"
            items={[
              {
                label: "Mark Resolved",
                onClick: () => {
                  updateTicket(ticket.id, { status: "resolved" });
                  toast(`${sr} resolved`, "success");
                },
              },
              {
                label: "Reassign",
                onClick: () => onAssign(),
              },
              {
                label: "Escalate",
                onClick: () => {
                  updateTicket(ticket.id, { urgency: "urgent", status: "escalated" });
                  toast("Escalated to Director on Duty (mock)", "error");
                },
                danger: true,
              },
              { divider: true, label: "" },
              {
                label: "Add Note",
                onClick: () => toast("Add note to SR (mock)", "info"),
              },
              {
                label: "View Full Transcript",
                onClick: () => setShowRaw(true),
              },
              { divider: true, label: "" },
              {
                label: "Print",
                onClick: () => toast("Print SR (mock)", "info"),
              },
            ]}
          />
        </span>
      </div>
    </article>
  );
}

function LiveTranscriptRow({ text }: { text: string }) {
  return (
    <article className="ora-card border-dashed">
      <div className="px-3.5 py-2 border-b border-ora-hairline bg-ora-red-soft/60 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inset-0 rounded-full opacity-70 pulse-ring"
            style={{ backgroundColor: "var(--ora-red)" }}
          />
          <span
            className="relative h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--ora-red)" }}
          />
        </span>
        <span className="ora-label text-ora-red-deep">
          Live Transcript · Awaiting SR Extract
        </span>
        <span className="ml-auto text-[10.5px] text-ora-muted-2 font-mono">
          staff-kristian-01
        </span>
      </div>
      <div className="px-3.5 py-2.5 text-[12.5px] text-ora-charcoal italic leading-relaxed">
        &ldquo;{text || "…"}&rdquo;
      </div>
    </article>
  );
}

function EmptyConversation() {
  return (
    <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center">
      <div className="h-12 w-12 rounded-sm border border-ora-hairline-2 bg-white flex items-center justify-center text-ora-muted mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8M16 17H8M10 9H8" />
        </svg>
      </div>
      <p className="text-[13px] font-semibold text-ora-charcoal">
        No service requests on this reservation
      </p>
      <p className="mt-1 text-[11.5px] text-ora-muted max-w-[340px] leading-relaxed">
        New SRs will appear here automatically when the AI Concierge Badge
        dispatches them.
      </p>
    </div>
  );
}

function EmptyChooseGuest() {
  return (
    <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center">
      <p className="text-[13px] font-semibold text-ora-charcoal">
        Select a reservation
      </p>
      <p className="mt-1 text-[11.5px] text-ora-muted">
        Pick a guest from the Reservations panel on the left.
      </p>
    </div>
  );
}

/* ---------- Sub-tab panels ---------- */

function ReservationPane({ guest }: { guest: Guest | null }) {
  if (!guest) {
    return (
      <p className="text-[12px] text-ora-muted">
        Select a reservation to view details.
      </p>
    );
  }
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Confirmation #", value: confirmationNumber(guest.id) },
    { label: "Profile #", value: profileId(guest.id) },
    { label: "Room", value: guest.room ?? "—" },
    { label: "Check-in", value: guest.booking_dates.check_in },
    { label: "Check-out", value: guest.booking_dates.check_out },
    { label: "Rate code", value: "RW-CORP" },
    { label: "Market segment", value: "LEISURE" },
    { label: "Guarantee", value: "CC-AX (mock)" },
    { label: "Loyalty tier", value: guest.vip_tier.toUpperCase() },
    { label: "Notes", value: guest.notes || "—" },
  ];
  return (
    <div className="ora-card">
      <div className="px-3 py-2 border-b border-ora-hairline bg-ora-bg">
        <span className="ora-label">Reservation Detail</span>
      </div>
      <dl className="px-3 py-3 grid grid-cols-[160px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[12.5px]">
        {rows.map((r) => (
          <React.Fragment key={r.label}>
            <dt className="ora-label pt-0.5">{r.label}</dt>
            <dd className="text-ora-charcoal">{r.value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

function FolioPane({ guest }: { guest: Guest | null }) {
  if (!guest) {
    return (
      <p className="text-[12px] text-ora-muted">
        Select a reservation to view folio.
      </p>
    );
  }
  const items = [
    { code: "RM", label: "Room charge", amount: 749.0 },
    { code: "RESORT", label: "Resort fee", amount: 49.0 },
    { code: "TAX", label: "Occupancy tax", amount: 86.45 },
  ];
  const total = items.reduce((a, b) => a + b.amount, 0);
  return (
    <div className="ora-card">
      <div className="px-3 py-2 border-b border-ora-hairline bg-ora-bg flex items-center justify-between">
        <span className="ora-label">Folio · Window 1</span>
        <span className="text-[10.5px] text-ora-muted-2 font-mono">
          {confirmationNumber(guest.id)}
        </span>
      </div>
      <table className="w-full text-[12.5px]">
        <thead className="border-b border-ora-hairline bg-white">
          <tr>
            <th className="px-3 py-1.5 text-left ora-label">Code</th>
            <th className="px-3 py-1.5 text-left ora-label">Description</th>
            <th className="px-3 py-1.5 text-right ora-label">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.code} className="border-b border-ora-hairline">
              <td className="px-3 py-1.5 font-mono">{i.code}</td>
              <td className="px-3 py-1.5">{i.label}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                ${i.amount.toFixed(2)}
              </td>
            </tr>
          ))}
          <tr className="bg-ora-bg">
            <td className="px-3 py-2" />
            <td className="px-3 py-2 font-semibold">Balance due</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold text-ora-charcoal">
              ${total.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function NotesPane({ guest }: { guest: Guest | null }) {
  const guestNotes = useAppStore((s) => s.guestNotes);
  const addGuestNote = useAppStore((s) => s.addGuestNote);
  const { toast } = useToast();
  const [draft, setDraft] = useState("");

  if (!guest) {
    return (
      <p className="text-[12px] text-ora-muted">
        Select a reservation to view notes.
      </p>
    );
  }
  const extra = guestNotes[guest.id] ?? [];

  return (
    <div className="space-y-3">
      <div className="ora-card">
        <div className="px-3 py-2 border-b border-ora-hairline bg-ora-bg">
          <span className="ora-label">Standing Profile Note</span>
        </div>
        <p className="px-3 py-3 text-[12.5px] text-ora-charcoal leading-relaxed">
          {guest.notes || "No standing note on file."}
        </p>
      </div>

      <div className="ora-card">
        <div className="px-3 py-2 border-b border-ora-hairline bg-ora-bg flex items-center justify-between">
          <span className="ora-label">Staff Notes</span>
          <span className="text-[10.5px] text-ora-muted-2">{extra.length} note{extra.length === 1 ? "" : "s"}</span>
        </div>
        {extra.length === 0 ? (
          <p className="px-3 py-3 text-[12px] text-ora-muted">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-ora-hairline">
            {extra.map((n, i) => (
              <li
                key={`${guest.id}-note-${i}`}
                className="px-3 py-2 text-[12.5px] text-ora-charcoal leading-relaxed"
              >
                {n}
              </li>
            ))}
          </ul>
        )}
        <div className="px-3 py-2 border-t border-ora-hairline bg-white">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note about this guest…"
            rows={2}
            className="ora-input"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={draft.trim().length === 0}
              onClick={() => {
                addGuestNote(guest.id, draft.trim());
                setDraft("");
                toast("Note added", "success");
              }}
              className="ora-btn ora-btn-primary h-7 text-[11px]"
            >
              Save note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferencesPane({ guest }: { guest: Guest | null }) {
  const addPreference = useAppStore((s) => s.addPreference);
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  if (!guest) {
    return (
      <p className="text-[12px] text-ora-muted">
        Select a reservation to view preferences.
      </p>
    );
  }
  return (
    <div className="ora-card">
      <div className="px-3 py-2 border-b border-ora-hairline bg-ora-bg flex items-center justify-between">
        <span className="ora-label">Guest Preferences</span>
        <span className="text-[10.5px] text-ora-muted-2">
          {guest.preferences.length} on file
        </span>
      </div>
      <div className="p-3 flex flex-wrap gap-1.5">
        {guest.preferences.map((p, i) => (
          <span
            key={`${guest.id}-pref-${i}`}
            className="inline-flex items-center gap-1 rounded-sm border border-ora-hairline-2 bg-white px-2 py-1 text-[11.5px] text-ora-charcoal"
          >
            {p}
          </span>
        ))}
        {guest.preferences.length === 0 && (
          <span className="text-[12px] text-ora-muted">No preferences on file.</span>
        )}
      </div>
      <div className="px-3 py-2 border-t border-ora-hairline bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a preference (e.g. Late checkout)"
            className="ora-input flex-1"
          />
          <button
            type="button"
            disabled={draft.trim().length === 0}
            onClick={() => {
              addPreference(guest.id, draft.trim());
              toast("Preference added", "success");
              setDraft("");
            }}
            className="ora-btn ora-btn-primary h-8"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutingPane() {
  const rules: { dept: Department; triggers: string[] }[] = [
    {
      dept: "concierge",
      triggers: [
        "restaurant",
        "reservation booking",
        "tickets",
        "spa",
        "directions",
      ],
    },
    {
      dept: "housekeeping",
      triggers: [
        "towels / sheets / pillows",
        "turndown",
        "flowers",
        "cleaning",
      ],
    },
    {
      dept: "fnb",
      triggers: ["room service", "minibar", "dietary restrictions", "breakfast"],
    },
    {
      dept: "maintenance",
      triggers: ["AC / heat", "plumbing", "tech / wifi", "door / lock"],
    },
    {
      dept: "frontdesk",
      triggers: ["check-in / out", "late checkout", "billing", "key cards"],
    },
  ];
  return (
    <div className="ora-card">
      <div className="px-3 py-2 border-b border-ora-hairline bg-ora-bg">
        <span className="ora-label">AI Routing Rules</span>
      </div>
      <ul className="divide-y divide-ora-hairline">
        {rules.map((r) => (
          <li
            key={r.dept}
            className="px-3 py-2 flex items-start gap-3 text-[12.5px]"
          >
            <span className="ora-chip ora-chip-grey font-mono shrink-0 mt-0.5">
              {DEPT_META[r.dept].code}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ora-charcoal">
                {DEPT_META[r.dept].label}
              </div>
              <div className="mt-0.5 text-[11.5px] text-ora-muted leading-relaxed">
                {r.triggers.join(" · ")}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="px-3 py-2 border-t border-ora-hairline bg-ora-bg text-[10.5px] text-ora-muted-2">
        Routing performed by Anthropic Claude · 1.4s avg
      </div>
    </div>
  );
}

function confirmationNumber(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 33 + id.charCodeAt(i)) >>> 0;
  return `RES-${(n % 1_000_000).toString().padStart(6, "0")}`;
}
