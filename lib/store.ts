"use client";

import { create } from "zustand";
import type { Department, Guest, GuestBrief, GuestMetadata, Ticket } from "@/lib/types";
import { SEED_GUESTS } from "@/lib/seed";

/**
 * A predicted/anticipatory action the AI thinks staff should consider
 * for a given guest. Stored keyed by guest_id.
 */
export interface Prediction {
  id: string;
  title: string;
  rationale: string;
  suggested_department: Department;
  confidence: "low" | "medium" | "high";
}

export type ActiveTab =
  | "reservations"
  | "guests"
  | "service"
  | "activities"
  | "folio"
  | "reports"
  | "setup";

export interface Property {
  id: string;
  name: string;
}

export const PROPERTIES: Property[] = [
  { id: "rsf", name: "Rosewood San Francisco" },
  { id: "rhk", name: "Rosewood Hong Kong" },
  { id: "rln", name: "Rosewood London" },
  { id: "rmk", name: "Rosewood Mayakoba" },
  { id: "rsp", name: "Rosewood Sao Paulo" },
];

export interface AppState {
  guests: Guest[];
  tickets: Ticket[];
  predictions: Record<string, Prediction[]>;
  focusedGuestId: string | null;
  isListening: boolean;
  currentTranscript: string;

  /* ----- new state ----- */
  activeTab: ActiveTab;
  selectedProperty: Property;
  profileLocked: Record<string, boolean>;
  guestNotes: Record<string, string[]>;
  selectedTicketId: string | null;
  /** Manually-entered or email-parsed pre-arrival metadata, keyed by guest id. */
  guestMetadata: Record<string, GuestMetadata>;
  /** When true, date-derived status math is overridden so all seed guests
   *  read as "in-house" today for demo purposes. */
  mockDemoMode: boolean;

  setListening: (v: boolean) => void;
  setTranscript: (v: string) => void;
  addTicket: (t: Ticket) => void;
  setGuestBrief: (guestId: string, brief: GuestBrief) => void;
  setPredictions: (guestId: string, preds: Prediction[]) => void;
  focusGuest: (id: string | null) => void;

  /* ----- new actions ----- */
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedProperty: (p: Property) => void;
  toggleProfileLock: (guestId: string) => void;
  addGuestNote: (guestId: string, note: string) => void;
  addPreference: (guestId: string, pref: string) => void;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  selectTicket: (id: string | null) => void;
  resetDemoState: () => void;
  /* ----- guest management & metadata ----- */
  addGuest: (guest: Guest) => void;
  removeGuest: (guestId: string) => void;
  setGuestMetadata: (guestId: string, data: Partial<GuestMetadata>) => void;
}

const initialGuests: Guest[] = (SEED_GUESTS ?? []).map((g) => ({
  ...g,
  interaction_log: [...(g.interaction_log ?? [])],
}));

export const useAppStore = create<AppState>((set) => ({
  guests: initialGuests,
  tickets: [],
  predictions: {},
  focusedGuestId: initialGuests[0]?.id ?? null,
  isListening: false,
  currentTranscript: "",

  activeTab: "service",
  selectedProperty: PROPERTIES[0],
  profileLocked: {},
  guestNotes: {},
  selectedTicketId: null,
  guestMetadata: {},
  mockDemoMode: true,

  setListening: (v) => set({ isListening: v }),
  setTranscript: (v) => set({ currentTranscript: v }),

  addTicket: (ticket) =>
    set((state) => {
      const tickets = [ticket, ...state.tickets];
      const guests = state.guests.map((g) => {
        const matchesByRoom =
          ticket.room_number && g.room === ticket.room_number;
        const matchesByName =
          ticket.guest_name &&
          g.name.toLowerCase().includes(ticket.guest_name.toLowerCase());
        if (matchesByRoom || matchesByName) {
          return {
            ...g,
            interaction_log: [ticket, ...g.interaction_log],
          };
        }
        return g;
      });
      return { tickets, guests };
    }),

  setGuestBrief: (guestId, brief) =>
    set((state) => ({
      guests: state.guests.map((g) =>
        g.id === guestId ? { ...g, research_brief: brief } : g,
      ),
    })),

  setPredictions: (guestId, preds) =>
    set((state) => ({
      predictions: { ...state.predictions, [guestId]: preds },
    })),

  focusGuest: (id) => set({ focusedGuestId: id }),

  /* ----- new actions ----- */
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedProperty: (p) => set({ selectedProperty: p }),
  toggleProfileLock: (guestId) =>
    set((state) => ({
      profileLocked: {
        ...state.profileLocked,
        [guestId]: !state.profileLocked[guestId],
      },
    })),
  addGuestNote: (guestId, note) =>
    set((state) => {
      const existing = state.guestNotes[guestId] ?? [];
      return {
        guestNotes: { ...state.guestNotes, [guestId]: [note, ...existing] },
      };
    }),
  addPreference: (guestId, pref) =>
    set((state) => ({
      guests: state.guests.map((g) =>
        g.id === guestId
          ? { ...g, preferences: [...g.preferences, pref] }
          : g,
      ),
    })),
  updateTicket: (id, patch) =>
    set((state) => {
      const apply = (t: Ticket): Ticket => (t.id === id ? { ...t, ...patch } : t);
      return {
        tickets: state.tickets.map(apply),
        guests: state.guests.map((g) => ({
          ...g,
          interaction_log: g.interaction_log.map(apply),
        })),
      };
    }),
  selectTicket: (id) => set({ selectedTicketId: id }),
  resetDemoState: () =>
    set({
      tickets: [],
      predictions: {},
      selectedTicketId: null,
      guestNotes: {},
      guestMetadata: {},
      guests: initialGuests.map((g) => ({
        ...g,
        interaction_log: [],
      })),
    }),
  addGuest: (guest) =>
    set((state) => ({
      guests: [guest, ...state.guests],
      focusedGuestId: guest.id,
    })),
  removeGuest: (guestId) =>
    set((state) => {
      const nextMeta = { ...state.guestMetadata };
      delete nextMeta[guestId];
      const nextLocked = { ...state.profileLocked };
      delete nextLocked[guestId];
      const nextPreds = { ...state.predictions };
      delete nextPreds[guestId];
      const nextNotes = { ...state.guestNotes };
      delete nextNotes[guestId];
      return {
        guests: state.guests.filter((g) => g.id !== guestId),
        focusedGuestId:
          state.focusedGuestId === guestId ? null : state.focusedGuestId,
        guestMetadata: nextMeta,
        profileLocked: nextLocked,
        predictions: nextPreds,
        guestNotes: nextNotes,
      };
    }),
  setGuestMetadata: (guestId, data) =>
    set((state) => {
      const existing = state.guestMetadata[guestId];
      // Strip caller-provided updated_at — we stamp our own
      const { updated_at: _ignore, ...patch } = data as GuestMetadata;
      void _ignore;
      const merged: GuestMetadata = {
        ...(existing ?? {}),
        ...patch,
        updated_at: new Date().toISOString(),
      };
      return {
        guestMetadata: { ...state.guestMetadata, [guestId]: merged },
      };
    }),
}));

/** Selector helper — returns the currently focused guest (or null). */
export function selectFocusedGuest(state: AppState): Guest | null {
  if (!state.focusedGuestId) return null;
  return state.guests.find((g) => g.id === state.focusedGuestId) ?? null;
}

/**
 * Match a ticket to a guest using the same rules as `addTicket`.
 * Returns the matching Guest, or null if unassigned.
 */
export function matchGuestForTicket(
  ticket: Ticket,
  guests: Guest[],
): Guest | null {
  for (const g of guests) {
    const matchesByRoom =
      ticket.room_number && g.room === ticket.room_number;
    const matchesByName =
      ticket.guest_name &&
      g.name.toLowerCase().includes(ticket.guest_name.toLowerCase());
    if (matchesByRoom || matchesByName) return g;
  }
  return null;
}

/** Tickets that belong to a specific guest (by room or name match). */
export function selectTicketsForGuest(guestId: string | null) {
  return (state: AppState): Ticket[] => {
    if (!guestId) return [];
    const guest = state.guests.find((g) => g.id === guestId);
    if (!guest) return [];
    return state.tickets.filter((t) => {
      const byRoom = t.room_number && guest.room === t.room_number;
      const byName =
        t.guest_name &&
        guest.name.toLowerCase().includes(t.guest_name.toLowerCase());
      return Boolean(byRoom || byName);
    });
  };
}

/** Tickets that don't match any known guest. */
export function selectUnassignedTickets(state: AppState): Ticket[] {
  return state.tickets.filter((t) => !matchGuestForTicket(t, state.guests));
}
