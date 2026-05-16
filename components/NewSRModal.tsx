"use client";

import React, { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import type { Department, Guest, Ticket, Urgency } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/Toaster";

interface NewSRModalProps {
  open: boolean;
  onClose: () => void;
  guest: Guest | null;
  staffId: string;
}

const DEPT_OPTIONS: { value: Department; label: string }[] = [
  { value: "concierge", label: "Concierge" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "fnb", label: "Food & Beverage" },
  { value: "maintenance", label: "Engineering" },
  { value: "frontdesk", label: "Front Desk" },
];

const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function NewSRModal({
  open,
  onClose,
  guest,
  staffId,
}: NewSRModalProps) {
  const addTicket = useAppStore((s) => s.addTicket);
  const { toast } = useToast();

  const [department, setDepartment] = useState<Department>("concierge");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [intent, setIntent] = useState("");
  const [actionRequired, setActionRequired] = useState("");
  const [guestMsg, setGuestMsg] = useState("");

  // Reset form whenever opened
  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setDepartment("concierge");
      setUrgency("normal");
      setIntent("");
      setActionRequired("");
      setGuestMsg("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open]);

  const canSubmit = intent.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sr-${Date.now()}`;
    const ticket: Ticket = {
      id,
      timestamp: new Date().toISOString(),
      guest_name: guest?.name ?? null,
      room_number: guest?.room ?? null,
      department,
      intent: intent.trim(),
      urgency,
      action_required: actionRequired.trim(),
      guest_facing_message: guestMsg.trim(),
      internal_notes: "Manually created in Opera",
      raw_transcript: "Manually created in Opera",
      staff_id: staffId,
      status: "open",
    };
    addTicket(ticket);
    toast("SR created", "success");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Service Request"
      width={520}
      footer={
        <>
          <button type="button" onClick={onClose} className="ora-btn">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="ora-btn ora-btn-primary"
          >
            Create SR
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-[11.5px] text-ora-muted">
          {guest
            ? `For ${guest.name}${guest.room ? ` · Room ${guest.room}` : ""}`
            : "Unallocated SR — guest will not be linked"}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              className="ora-input"
            >
              {DEPT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Urgency">
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as Urgency)}
              className="ora-input"
            >
              {URGENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Intent *">
          <input
            type="text"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Restaurant recommendation request"
            className="ora-input"
          />
        </Field>
        <Field label="Action required">
          <textarea
            value={actionRequired}
            onChange={(e) => setActionRequired(e.target.value)}
            placeholder="What the department needs to do"
            rows={3}
            className="ora-input"
          />
        </Field>
        <Field label="Guest-facing message (optional)">
          <textarea
            value={guestMsg}
            onChange={(e) => setGuestMsg(e.target.value)}
            placeholder="Friendly confirmation to send to the guest"
            rows={2}
            className="ora-input"
          />
        </Field>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="ora-label block mb-1">{label}</span>
      {children}
    </label>
  );
}
