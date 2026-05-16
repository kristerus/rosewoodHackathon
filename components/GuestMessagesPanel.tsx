"use client";

import React from "react";

export interface GuestMessage {
  guest_name: string;
  room: string;
  text: string;
  timestamp: string;
}

interface GuestMessagesPanelProps {
  messages: GuestMessage[];
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

export default function GuestMessagesPanel({
  messages,
}: GuestMessagesPanelProps) {
  // Latest first in the data; display oldest first so the conversation reads down,
  // newest bubble at the bottom (typical chat UX).
  const ordered = [...messages].reverse();

  // The "guest" addressed at top is whoever the most recent message is going to.
  const focused = messages[0];

  return (
    <section className="flex h-full flex-col rounded-3xl border border-rw-stone-line bg-rw-cream-soft shadow-sm overflow-hidden">
      <header className="flex items-baseline justify-between px-8 pt-7 pb-4">
        <div>
          <div className="eyebrow eyebrow-brass">
            GLOWING.IO · GUEST MESSAGING
          </div>
          <h2 className="mt-1.5 font-serif text-[26px] leading-tight text-rw-forest">
            {focused ? focused.guest_name : "Guest Conversation"}
          </h2>
          <p className="mt-1 text-[12px] text-rw-mute">
            {focused
              ? `Room ${focused.room} · SMS via Glowing.io`
              : "Outbound messages will appear here once routed."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-rw-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-rw-brass" />
          Connected
        </div>
      </header>
      <div className="hairline mx-8" />

      <div className="relative flex flex-1 flex-col min-h-0">
        {/* Phone-style transcript */}
        <div className="scroll-rw flex-1 overflow-y-auto px-8 py-6 space-y-5">
          {ordered.length === 0 ? (
            <EmptyState />
          ) : (
            ordered.map((m, i) => (
              <MessageBubble
                key={`${m.timestamp}-${i}`}
                msg={m}
                showHeader={
                  i === 0 ||
                  ordered[i - 1].guest_name !== m.guest_name ||
                  ordered[i - 1].room !== m.room
                }
              />
            ))
          )}
        </div>

        {/* Composer mock — purely decorative */}
        <div className="border-t border-rw-stone-line/80 px-6 py-4 bg-rw-cream-soft/80">
          <div className="flex items-center gap-3 rounded-full border border-rw-stone-line bg-white/80 px-5 py-2.5">
            <span className="text-[12px] text-rw-mute italic">
              Replies are handled inside Glowing.io · this is a read-only view
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function MessageBubble({
  msg,
  showHeader,
}: {
  msg: GuestMessage;
  showHeader: boolean;
}) {
  return (
    <div className="fade-up">
      {showHeader && (
        <div className="mb-2 flex items-center gap-2">
          <span className="eyebrow">
            From the Concierge · Room {msg.room}
          </span>
          <span className="text-[10px] text-rw-mute">
            {formatTime(msg.timestamp)}
          </span>
        </div>
      )}
      <div className="flex">
        <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-rw-forest/15 bg-white px-5 py-3.5 shadow-sm">
          <p className="text-[14px] leading-relaxed text-rw-ink">{msg.text}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-rw-brass">
              Delivered
            </span>
            <span className="h-px w-3 bg-rw-stone-line" />
            <span className="text-[10px] text-rw-mute">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center py-16">
      <div className="h-px w-12 bg-rw-brass mb-5" />
      <p className="font-serif text-[20px] text-rw-forest">
        No active conversations
      </p>
      <p className="mt-2 text-[12px] text-rw-mute max-w-[260px] leading-relaxed">
        When the badge routes a request, the guest-facing confirmation will
        appear here in real time.
      </p>
    </div>
  );
}
