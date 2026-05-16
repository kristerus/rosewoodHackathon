"use client";

import React from "react";
import type { Department, Ticket, Urgency } from "@/lib/types";

interface StaffTasksPanelProps {
  tickets: Ticket[];
}

const DEPT_META: Record<
  Department,
  { label: string; tint: string; text: string; ring: string }
> = {
  concierge: {
    label: "Concierge",
    tint: "bg-[#f0e9da]",
    text: "text-[#7a5a1f]",
    ring: "ring-[#d9c79a]",
  },
  housekeeping: {
    label: "Housekeeping",
    tint: "bg-[#e3ebe5]",
    text: "text-[#2e5240]",
    ring: "ring-[#bfd1c4]",
  },
  fnb: {
    label: "Food & Beverage",
    tint: "bg-[#f1e2dc]",
    text: "text-[#7a3e2c]",
    ring: "ring-[#d8b9aa]",
  },
  maintenance: {
    label: "Engineering",
    tint: "bg-[#e6e6df]",
    text: "text-[#4a4a40]",
    ring: "ring-[#c7c7bb]",
  },
  frontdesk: {
    label: "Front Desk",
    tint: "bg-[#e4e8ef]",
    text: "text-[#2f3f5c]",
    ring: "ring-[#bcc6d6]",
  },
};

const URGENCY_DOT: Record<Urgency, string> = {
  low: "bg-emerald-500",
  normal: "bg-emerald-500",
  high: "bg-amber-500",
  urgent: "bg-red-500",
  critical: "bg-red-600",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Low priority",
  normal: "Routine",
  high: "Elevated",
  urgent: "Urgent",
  critical: "CRITICAL",
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const delta = Math.round((now - d.getTime()) / 1000);
    if (delta < 60) return "just now";
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function StaffTasksPanel({ tickets }: StaffTasksPanelProps) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-rw-stone-line bg-rw-cream-soft shadow-sm overflow-hidden">
      <header className="flex items-baseline justify-between px-8 pt-7 pb-4">
        <div>
          <div className="eyebrow eyebrow-brass">
            GLOWING.IO · INTERNAL TASK QUEUE
          </div>
          <h2 className="mt-1.5 font-serif text-[26px] leading-tight text-rw-forest">
            Staff Tasks
          </h2>
          <p className="mt-1 text-[12px] text-rw-mute">
            Live feed routed by department · newest first
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-rw-mute">
          <span className="tabular-nums text-rw-forest font-medium">
            {tickets.length.toString().padStart(2, "0")}
          </span>
          open
        </div>
      </header>
      <div className="hairline mx-8" />

      <div className="scroll-rw flex-1 overflow-y-auto px-6 py-5">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="h-px w-12 bg-rw-brass mb-5" />
            <p className="font-serif text-[20px] text-rw-forest">
              The queue is clear
            </p>
            <p className="mt-2 text-[12px] text-rw-mute max-w-[280px] leading-relaxed">
              New requests will arrive here the moment a badge routes them.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <TaskCard key={t.id} ticket={t} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TaskCard({ ticket }: { ticket: Ticket }) {
  const meta = DEPT_META[ticket.department];
  const isCritical = ticket.urgency === "critical";
  return (
    <li className="slide-in">
      <article className={`rounded-2xl border px-5 py-4 shadow-sm transition-colors ${isCritical ? "border-red-400 bg-red-50 hover:border-red-500" : "border-rw-stone-line bg-white hover:border-rw-brass/50"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium tracking-wide ring-1 ${meta.tint} ${meta.text} ${meta.ring}`}
            >
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-rw-mute">
              <span
                className={`h-1.5 w-1.5 rounded-full ${URGENCY_DOT[ticket.urgency]}`}
                aria-hidden
              />
              {URGENCY_LABEL[ticket.urgency]}
            </span>
          </div>
          <span className="text-[10px] text-rw-mute whitespace-nowrap">
            {formatTime(ticket.timestamp)}
          </span>
        </div>

        <h3 className="mt-3 font-serif text-[18px] leading-snug text-rw-forest">
          {ticket.intent}
        </h3>

        {(ticket.guest_name || ticket.room_number) && (
          <p className="mt-1 text-[12px] text-rw-mute">
            {ticket.guest_name ?? "Guest"}
            {ticket.room_number ? ` · Room ${ticket.room_number}` : ""}
          </p>
        )}

        <div className="mt-3 rounded-xl bg-rw-cream/60 border border-rw-stone-line/60 px-4 py-2.5">
          <div className="eyebrow mb-1">Action required</div>
          <p className="text-[13px] leading-relaxed text-rw-ink">
            {ticket.action_required}
          </p>
        </div>

        {ticket.internal_notes && (
          <p className="mt-2.5 text-[11.5px] italic text-rw-mute leading-relaxed">
            {ticket.internal_notes}
          </p>
        )}
      </article>
    </li>
  );
}
