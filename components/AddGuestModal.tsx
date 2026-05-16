"use client";

import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";

export interface NewGuestInput {
  name: string;
  room: string;
  check_in: string;
  check_out: string;
  vip_tier: "standard" | "gold" | "platinum" | "legacy";
  notes?: string;
}

interface AddGuestModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (guest: NewGuestInput) => void;
}

function isoToday(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const TIER_OPTIONS: {
  value: NewGuestInput["vip_tier"];
  label: string;
}[] = [
  { value: "standard", label: "Standard" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "legacy", label: "Legacy Patron" },
];

export default function AddGuestModal({
  open,
  onClose,
  onCreate,
}: AddGuestModalProps) {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [checkIn, setCheckIn] = useState(isoToday(0));
  const [checkOut, setCheckOut] = useState(isoToday(3));
  const [tier, setTier] = useState<NewGuestInput["vip_tier"]>("standard");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset each time it opens
  useEffect(() => {
    if (open) {
      setName("");
      setRoom("");
      setCheckIn(isoToday(0));
      setCheckOut(isoToday(3));
      setTier("standard");
      setNotes("");
      setError(null);
    }
  }, [open]);

  const valid = useMemo(() => name.trim().length > 0, [name]);

  const submit = () => {
    if (!valid) {
      setError("Guest name is required.");
      return;
    }
    if (new Date(checkOut).getTime() < new Date(checkIn).getTime()) {
      setError("Check-out must be on or after check-in.");
      return;
    }
    onCreate({
      name: name.trim(),
      room: room.trim(),
      check_in: checkIn,
      check_out: checkOut,
      vip_tier: tier,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Guest Profile"
      width={480}
      footer={
        <>
          <button type="button" onClick={onClose} className="ora-btn">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className="ora-btn ora-btn-primary"
          >
            Create Profile
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[11.5px] text-ora-muted leading-relaxed -mt-1">
          Create a guest profile from scratch. After creating, click{" "}
          <span className="font-semibold text-ora-charcoal">
            Generate AI Research
          </span>{" "}
          in the Guest Profile to pull public data from the web (LinkedIn,
          news, etc.).
        </p>

        <label className="block">
          <span className="ora-label block mb-1">Guest Name *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. David Chen"
            className="ora-input"
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="ora-label block mb-1">Room Number</span>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="412"
              className="ora-input font-mono"
            />
          </label>
          <label className="block">
            <span className="ora-label block mb-1">VIP Tier</span>
            <select
              value={tier}
              onChange={(e) =>
                setTier(e.target.value as NewGuestInput["vip_tier"])
              }
              className="ora-input"
            >
              {TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="ora-label block mb-1">Check-In</span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="ora-input font-mono"
            />
          </label>
          <label className="block">
            <span className="ora-label block mb-1">Check-Out</span>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="ora-input font-mono"
            />
          </label>
        </div>

        <label className="block">
          <span className="ora-label block mb-1">Standing Note (optional)</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VIP arriving for anniversary, allergic to shellfish…"
            className="ora-input"
          />
        </label>

        {error && (
          <div className="px-2.5 py-1.5 border border-[#f6cdc7] bg-ora-red-soft text-ora-red-deep text-[11.5px] rounded-sm">
            {error}
          </div>
        )}

        <p className="text-[10.5px] text-ora-muted-2 leading-relaxed pt-1">
          Tip — for a guest who is a real public figure (e.g. CEO, author),
          enter their full real name. The AI Research action will then pull
          public profile data from the web.
        </p>
      </div>
    </Modal>
  );
}
