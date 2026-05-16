"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

/* ---------------- Local types ---------------- */
interface GuestLite {
  id: string;
  name: string;
  room: string | null;
  booking_dates: { check_in: string; check_out: string };
  vip_tier: "standard" | "gold" | "platinum" | "legacy";
  past_stays: number;
  notes?: string;
  preferences?: string[];
}

export interface ManualGuestData {
  eta?: string;
  departure_time?: string;
  flight_arrival?: string;
  flight_departure?: string;
  party_size?: number;
  accompanying_guests?: string[];
  special_occasion?: string;
  dietary_restrictions?: string[];
  allergies?: string[];
  room_preferences?: string[];
  airport_transfer_needed?: boolean;
  airport_transfer_details?: string;
  welcome_amenities?: string[];
  pre_stocked_items?: string[];
  free_form_notes?: string;
}

interface ManualInputPanelProps {
  guest: GuestLite;
  open: boolean;
  onClose: () => void;
  onSave: (data: ManualGuestData) => void | Promise<void>;
}

/* ---------------- Constants ---------------- */
const SAMPLE_EMAIL = `Dear RoseWood San Francisco team,

I'm writing ahead of my upcoming stay (May 16-18) to share a few details.
I'll be arriving Saturday around 5:30 PM on Delta DL 405 from JFK. My wife
Sarah will be joining me — it's our 10-year anniversary, so anything special
you can arrange would be deeply appreciated.

A few notes:
- Severe shellfish allergy (Sarah is fine on this)
- Both vegetarian
- I prefer a high floor, away from elevators if possible
- Would love to have your San Pellegrino sparkling water stocked, and some
  fresh fruit on arrival
- We need an airport pickup at SFO; can you arrange a car?
- Departing Monday at 11 AM, so probably need a late check-out

Looking forward to it.

Warmly,
David Chen`;

type TabKey = "form" | "email";

const EMPTY: ManualGuestData = {
  eta: "",
  departure_time: "",
  flight_arrival: "",
  flight_departure: "",
  party_size: undefined,
  accompanying_guests: [],
  special_occasion: "",
  dietary_restrictions: [],
  allergies: [],
  room_preferences: [],
  airport_transfer_needed: false,
  airport_transfer_details: "",
  welcome_amenities: [],
  pre_stocked_items: [],
  free_form_notes: "",
};

/* ---------------- Component ---------------- */
export default function ManualInputPanel({
  guest,
  open,
  onClose,
  onSave,
}: ManualInputPanelProps) {
  const [tab, setTab] = useState<TabKey>("form");
  const [formData, setFormData] = useState<ManualGuestData>(EMPTY);
  const [emailText, setEmailText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [bottomToast, setBottomToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset whenever opened
  useEffect(() => {
    if (open) {
      setTab("form");
      setFormData(EMPTY);
      setEmailText("");
      setParsing(false);
      setParseError(null);
      setBottomToast(null);
      setSaving(false);
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Auto-clear bottom toast
  useEffect(() => {
    if (!bottomToast) return;
    const t = setTimeout(() => setBottomToast(null), 3200);
    return () => clearTimeout(t);
  }, [bottomToast]);

  const update = useCallback(
    <K extends keyof ManualGuestData>(key: K, value: ManualGuestData[K]) => {
      setFormData((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const handleParse = async () => {
    if (!emailText.trim()) {
      setParseError("Paste an email first.");
      return;
    }
    setParseError(null);
    setParsing(true);
    try {
      const res = await fetch("/api/parse-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_text: emailText, guest_id: guest.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Parse failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as {
        parsed: ManualGuestData & { updated_at?: string };
      };
      const parsed = json.parsed ?? {};
      // Strip updated_at if present and merge into formData (only non-empty fields)
      const merged: ManualGuestData = { ...formData };
      let count = 0;
      (Object.keys(parsed) as (keyof ManualGuestData)[]).forEach((k) => {
        if (k === ("updated_at" as keyof ManualGuestData)) return;
        const v = parsed[k];
        if (v === undefined || v === null) return;
        if (typeof v === "string" && v.trim() === "") return;
        if (Array.isArray(v) && v.length === 0) return;
        // @ts-expect-error — runtime-safe assignment across union
        merged[k] = v;
        count += 1;
      });
      setFormData(merged);
      setTab("form");
      setBottomToast(`Parsed ${count} field${count === 1 ? "" : "s"} from email — review and save`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown parse error";
      setParseError(msg);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const filledCount = useMemo(() => countFilled(formData), [formData]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 fade-up"
      onMouseDown={(e) => {
        // Click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[720px] max-h-[85vh] bg-white border border-ora-hairline rounded-sm shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-ora-hairline bg-[#FAFAFA] shrink-0">
          <div className="min-w-0">
            <div className="ora-label">Pre-Arrival Information</div>
            <div className="mt-0.5 flex items-center gap-2 min-w-0">
              <h2 className="text-[14.5px] font-semibold text-ora-charcoal truncate">
                {guest.name}
              </h2>
              <span className="font-mono text-[11px] text-ora-muted">
                {guest.room ? `RM ${guest.room}` : "Unassigned"}
              </span>
              <span className="font-mono text-[11px] text-ora-muted">
                {guest.booking_dates.check_in} → {guest.booking_dates.check_out}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-7 w-7 inline-flex items-center justify-center text-ora-muted hover:text-ora-charcoal hover:bg-ora-row-hover rounded-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-ora-hairline px-3 shrink-0 bg-white">
          <TabBtn active={tab === "form"} onClick={() => setTab("form")}>
            Manual Form
            {filledCount > 0 && (
              <span className="ml-1.5 ora-chip ora-chip-grey">
                {filledCount}
              </span>
            )}
          </TabBtn>
          <TabBtn active={tab === "email"} onClick={() => setTab("email")}>
            Paste Email
          </TabBtn>
          <div className="flex-1" />
          <span className="font-mono text-[10.5px] text-ora-muted pr-2">
            GUEST-ID {guest.id.slice(0, 8)}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scroll-rw">
          {tab === "form" ? (
            <FormTab data={formData} update={update} />
          ) : (
            <EmailTab
              emailText={emailText}
              setEmailText={setEmailText}
              onParse={handleParse}
              parsing={parsing}
              parseError={parseError}
              loadSample={() => setEmailText(SAMPLE_EMAIL)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-ora-hairline bg-[#FAFAFA] px-5 py-3 flex items-center justify-between shrink-0">
          <div className="text-[11.5px] text-ora-muted min-h-[18px]">
            {bottomToast ? (
              <span className="fade-up px-2 py-0.5 bg-ora-green-soft text-ora-green border border-[#bbf7d0] rounded-sm">
                {bottomToast}
              </span>
            ) : tab === "form" ? (
              <>
                {filledCount} field{filledCount === 1 ? "" : "s"} captured
              </>
            ) : (
              <>Powered by Claude · pre-arrival extractor</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="ora-btn">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="ora-btn ora-btn-primary"
            >
              {saving ? "Saving…" : "Save Pre-Arrival Info"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tab button ---------------- */
function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative px-4 h-9 inline-flex items-center text-[12.5px] font-medium transition-colors " +
        (active
          ? "text-ora-charcoal font-bold"
          : "text-ora-muted hover:text-ora-charcoal")
      }
    >
      {children}
      {active && (
        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-ora-red" />
      )}
    </button>
  );
}

/* ---------------- Form tab ---------------- */
function FormTab({
  data,
  update,
}: {
  data: ManualGuestData;
  update: <K extends keyof ManualGuestData>(k: K, v: ManualGuestData[K]) => void;
}) {
  return (
    <div className="p-5 space-y-5">
      {/* Arrival */}
      <Section title="Arrival">
        <div className="grid grid-cols-2 gap-4">
          <Field label="ETA">
            <input
              type="time"
              value={data.eta ?? ""}
              onChange={(e) => update("eta", e.target.value)}
              className="ora-input font-mono"
            />
          </Field>
          <Field label="Departure Time">
            <input
              type="time"
              value={data.departure_time ?? ""}
              onChange={(e) => update("departure_time", e.target.value)}
              className="ora-input font-mono"
            />
          </Field>
          <Field label="Inbound Flight">
            <input
              type="text"
              placeholder="e.g. DL 405 from JFK, lands 4:15 PM"
              value={data.flight_arrival ?? ""}
              onChange={(e) => update("flight_arrival", e.target.value)}
              className="ora-input"
            />
          </Field>
          <Field label="Outbound Flight">
            <input
              type="text"
              placeholder="e.g. UA 88 to LHR, 9:50 PM"
              value={data.flight_departure ?? ""}
              onChange={(e) => update("flight_departure", e.target.value)}
              className="ora-input"
            />
          </Field>
          <Field label="Party Size">
            <input
              type="number"
              min={1}
              max={20}
              value={data.party_size ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                update("party_size", v === "" ? undefined : Number(v));
              }}
              className="ora-input font-mono"
            />
          </Field>
          <Field label="Special Occasion">
            <input
              type="text"
              placeholder="Anniversary, birthday, honeymoon…"
              value={data.special_occasion ?? ""}
              onChange={(e) => update("special_occasion", e.target.value)}
              className="ora-input"
            />
          </Field>
        </div>
        <Field label="Accompanying Guests">
          <ChipsInput
            values={data.accompanying_guests ?? []}
            onChange={(v) => update("accompanying_guests", v)}
            placeholder="Type a name and press Enter"
          />
        </Field>
      </Section>

      {/* Dietary */}
      <Section title="Dietary">
        <Field label="Dietary Restrictions">
          <ChipsInput
            values={data.dietary_restrictions ?? []}
            onChange={(v) => update("dietary_restrictions", v)}
            placeholder="vegetarian, gluten-free, kosher…"
          />
        </Field>
        <Field label="Allergies">
          <ChipsInput
            values={data.allergies ?? []}
            onChange={(v) => update("allergies", v)}
            placeholder="shellfish, peanuts, latex…"
            danger
          />
        </Field>
      </Section>

      {/* Room */}
      <Section title="Room">
        <Field label="Room Preferences">
          <ChipsInput
            values={data.room_preferences ?? []}
            onChange={(v) => update("room_preferences", v)}
            placeholder="high floor, away from elevator, king bed…"
          />
        </Field>
      </Section>

      {/* Transfer */}
      <Section title="Airport Transfer">
        <div className="flex items-center justify-between rounded-sm border border-ora-hairline px-3 py-2">
          <div>
            <div className="text-[12.5px] font-semibold text-ora-charcoal">
              Transfer Required
            </div>
            <div className="text-[11px] text-ora-muted mt-0.5">
              Toggle to flag dispatch for airport pickup/drop-off.
            </div>
          </div>
          <BigToggle
            on={!!data.airport_transfer_needed}
            onChange={(v) => update("airport_transfer_needed", v)}
          />
        </div>
        {data.airport_transfer_needed && (
          <Field label="Transfer Details">
            <textarea
              rows={2}
              placeholder="Pickup at SFO Terminal 2 — Delta DL 405 lands 4:15 PM"
              value={data.airport_transfer_details ?? ""}
              onChange={(e) => update("airport_transfer_details", e.target.value)}
              className="ora-input"
            />
          </Field>
        )}
      </Section>

      {/* Welcome */}
      <Section title="Welcome Setup">
        <Field label="Welcome Amenities">
          <ChipsInput
            values={data.welcome_amenities ?? []}
            onChange={(v) => update("welcome_amenities", v)}
            placeholder="fresh fruit, champagne on ice, flowers…"
          />
        </Field>
        <Field label="Pre-Stocked Items">
          <ChipsInput
            values={data.pre_stocked_items ?? []}
            onChange={(v) => update("pre_stocked_items", v)}
            placeholder="San Pellegrino, almond milk, Diet Coke…"
          />
        </Field>
      </Section>

      {/* Notes */}
      <Section title="Additional Notes">
        <Field label="Free-Form Notes">
          <textarea
            rows={4}
            placeholder="Any other context that doesn't fit the structured fields…"
            value={data.free_form_notes ?? ""}
            onChange={(e) => update("free_form_notes", e.target.value)}
            className="ora-input"
          />
        </Field>
      </Section>
    </div>
  );
}

/* ---------------- Email tab ---------------- */
function EmailTab({
  emailText,
  setEmailText,
  onParse,
  parsing,
  parseError,
  loadSample,
}: {
  emailText: string;
  setEmailText: (v: string) => void;
  onParse: () => void;
  parsing: boolean;
  parseError: string | null;
  loadSample: () => void;
}) {
  return (
    <div className="p-5 space-y-3">
      <div>
        <div className="ora-label mb-1">Guest Email Correspondence</div>
        <textarea
          rows={14}
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          placeholder="Paste the guest's pre-arrival email here. Claude will extract structured fields and pre-fill the manual form…"
          className="ora-input font-mono text-[11.5px] leading-relaxed"
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-ora-muted">
          <button
            type="button"
            onClick={loadSample}
            className="underline-offset-2 hover:underline text-ora-blue"
          >
            Load sample email
          </button>
          <span className="font-mono">
            {emailText.length.toLocaleString("en-US")} chars
          </span>
        </div>
      </div>

      {parseError && (
        <div className="px-3 py-2 border border-[#f6cdc7] bg-ora-red-soft text-ora-red-deep text-[12px] rounded-sm">
          <span className="font-semibold">Parse error: </span>
          {parseError}
        </div>
      )}

      {parsing && (
        <div className="px-3 py-2 border border-ora-hairline bg-ora-blue-soft text-ora-blue text-[12px] rounded-sm flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-ora-blue pulse-dot" />
          Parsing… analyzing email content with claude-sonnet-4-6
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onParse}
          disabled={parsing || !emailText.trim()}
          className="ora-btn ora-btn-primary"
        >
          {parsing ? "Parsing…" : "Parse with AI"}
        </button>
      </div>

      <div className="border-t border-ora-hairline pt-3 text-[11px] text-ora-muted leading-relaxed">
        Claude extracts ETA, flight info, party size, dietary restrictions,
        allergies, room preferences, airport transfer, welcome amenities, and
        pre-stocked items. Fields left blank by the model can be added manually
        on the form tab.
      </div>
    </div>
  );
}

/* ---------------- Section helper ---------------- */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="ora-label mb-2 pb-1 border-b border-ora-hairline">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
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

/* ---------------- Chips input ---------------- */
function ChipsInput({
  values,
  onChange,
  placeholder,
  danger,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  danger?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };

  const remove = (idx: number) => {
    const next = values.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div>
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          // Auto-add on comma
          if (v.includes(",")) {
            const parts = v.split(",");
            const last = parts.pop() ?? "";
            parts.forEach((p) => add(p));
            setDraft(last);
            return;
          }
          setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
            remove(values.length - 1);
          }
        }}
        placeholder={placeholder}
        className="ora-input"
      />
      {values.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {values.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className={
                "inline-flex items-center gap-1 px-2 h-6 text-[11px] rounded-sm border " +
                (danger
                  ? "bg-ora-red-soft border-[#f6cdc7] text-ora-red-deep"
                  : "bg-ora-row-hover border-ora-hairline text-ora-charcoal")
              }
            >
              <span>{v}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${v}`}
                className="inline-flex items-center justify-center h-3.5 w-3.5 text-ora-muted hover:text-ora-charcoal"
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path
                    d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Big toggle ---------------- */
function BigToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors border " +
        (on
          ? "bg-ora-red border-ora-red"
          : "bg-white border-ora-hairline-2")
      }
    >
      <span
        className={
          "inline-block h-4 w-4 rounded-full shadow transition-transform " +
          (on ? "translate-x-6 bg-white" : "translate-x-1")
        }
        style={on ? undefined : { backgroundColor: "var(--ora-muted-2)" }}
      />
    </button>
  );
}

/* ---------------- Utilities ---------------- */
function countFilled(d: ManualGuestData): number {
  let c = 0;
  (Object.keys(d) as (keyof ManualGuestData)[]).forEach((k) => {
    const v = d[k];
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    if (typeof v === "boolean" && v === false) return;
    if (Array.isArray(v) && v.length === 0) return;
    c += 1;
  });
  return c;
}
