"use client";

import { create } from "zustand";
import type { Guest, GuestBrief, Ticket } from "@/lib/types";
import { SEED_GUESTS } from "@/lib/seed";

export interface AppState {
  guests: Guest[];
  tickets: Ticket[];
  focusedGuestId: string | null;
  isListening: boolean;
  currentTranscript: string;

  setListening: (v: boolean) => void;
  setTranscript: (v: string) => void;
  addTicket: (t: Ticket) => void;
  setGuestBrief: (guestId: string, brief: GuestBrief) => void;
  focusGuest: (id: string | null) => void;
  addLearnedPreference: (guestId: string, preference: string) => void;
  enrichGuest: (guestId: string, partial: Partial<Guest>) => void;
  addGuest: (guest: Guest) => void;
}

const initialGuests: Guest[] = (SEED_GUESTS ?? []).map((g) => ({
  ...g,
  learnedPreferences: [...(g.learnedPreferences ?? [])],
  interaction_log: [...(g.interaction_log ?? [])],
}));

export const useAppStore = create<AppState>((set) => ({
  guests: initialGuests,
  tickets: [],
  focusedGuestId: initialGuests[0]?.id ?? null,
  isListening: false,
  currentTranscript: "",

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
        g.id === guestId ? { ...g, research_brief: brief } : g
      ),
    })),

  focusGuest: (id) => set({ focusedGuestId: id }),

  addLearnedPreference: (guestId, preference) =>
    set((state) => ({
      guests: state.guests.map((g) => {
        if (g.id !== guestId) return g;
        if (g.learnedPreferences.includes(preference)) return g;
        return { ...g, learnedPreferences: [...g.learnedPreferences, preference] };
      }),
    })),

  enrichGuest: (guestId, partial) =>
    set((state) => ({
      guests: state.guests.map((g) => {
        if (g.id !== guestId) return g;
        const merged = { ...g, ...partial };
        if (partial.learnedPreferences) {
          merged.learnedPreferences = Array.from(
            new Set([...g.learnedPreferences, ...partial.learnedPreferences]),
          );
        }
        return merged;
      }),
    })),

  addGuest: (guest) =>
    set((state) => ({
      guests: [...state.guests, { ...guest, learnedPreferences: guest.learnedPreferences ?? [], interaction_log: guest.interaction_log ?? [] }],
    })),
}));

/** Selector helper — returns the currently focused guest (or null). */
export function selectFocusedGuest(state: AppState): Guest | null {
  if (!state.focusedGuestId) return null;
  return state.guests.find((g) => g.id === state.focusedGuestId) ?? null;
}
