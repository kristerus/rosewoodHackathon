// HMR-safe in-memory store of manually entered / email-parsed guest metadata.
// Pinned to globalThis so Next.js hot module reloads in dev don't wipe state.
//
// NOTE: this is in-memory and does NOT survive across Vercel serverless
// invocations. For the hackathon scope it's fine because metadata is always
// fetched alongside guest_id from the same client session. If we ever need
// cross-container persistence, move this into the Supabase `guest_metadata`
// table (same pattern as tickets/transcripts in lib/supabase.ts).

export interface GuestMetadata {
  eta?: string;                     // ISO timestamp or human "5:30 PM"
  departure_time?: string;
  flight_arrival?: string;          // e.g. "AA 256 from JFK, lands 4:15 PM"
  flight_departure?: string;
  party_size?: number;
  accompanying_guests?: string[];   // names
  special_occasion?: string;        // "anniversary", "birthday", "business", etc.
  dietary_restrictions?: string[];  // ["vegan", "gluten-free", ...]
  allergies?: string[];
  room_preferences?: string[];      // ["high floor", "quiet", "away from elevator"]
  airport_transfer_needed?: boolean;
  airport_transfer_details?: string;
  welcome_amenities?: string[];     // ["sparkling water — San Pellegrino", "fresh fruit"]
  pre_stocked_items?: string[];
  free_form_notes?: string;         // "Notes from email correspondence"
  updated_at: string;               // ISO
}

interface GuestMetadataStoreSingleton {
  map: Map<string, GuestMetadata>;
}

const globalKey = '__rwGuestMetadata__' as const;
const globalAny = globalThis as unknown as Record<string, GuestMetadataStoreSingleton | undefined>;

function getStore(): GuestMetadataStoreSingleton {
  let store = globalAny[globalKey];
  if (!store) {
    store = { map: new Map<string, GuestMetadata>() };
    globalAny[globalKey] = store;
  }
  return store;
}

export function getMetadata(guest_id: string): GuestMetadata | null {
  const store = getStore();
  return store.map.get(guest_id) ?? null;
}

export function setMetadata(
  guest_id: string,
  patch: Partial<GuestMetadata>,
): GuestMetadata {
  const store = getStore();
  const existing = store.map.get(guest_id);
  // Strip updated_at from patch — we always stamp it ourselves.
  const { updated_at: _ignore, ...patchClean } = patch as GuestMetadata;
  void _ignore;
  const merged: GuestMetadata = {
    ...(existing ?? {}),
    ...patchClean,
    updated_at: new Date().toISOString(),
  };
  store.map.set(guest_id, merged);
  return merged;
}

export function clearMetadata(guest_id: string): void {
  const store = getStore();
  store.map.delete(guest_id);
}

export function listAll(): Record<string, GuestMetadata> {
  const store = getStore();
  const out: Record<string, GuestMetadata> = {};
  for (const [k, v] of store.map.entries()) {
    out[k] = v;
  }
  return out;
}
