// Deterministic folio generator. Given a guest_id (used as seed) + booking
// dates, produces a plausible folio. Same input -> same output every time.

export interface FolioLine {
  id: string;
  date: string;       // ISO date (YYYY-MM-DD)
  code: string;       // "RM" room, "FB" food&bev, "RF" resort fee, "TX" tax, "MISC"
  description: string;
  amount: number;     // dollars, positive = charge, negative = payment
  posted_by: string;  // staff name like "M. Chen" or "AUTO"
}

export interface Folio {
  guest_id: string;
  guest_name: string;
  room: string;
  confirmation_number: string;
  rate_code: string;       // e.g. "RW-CORP"
  market_segment: string;  // e.g. "LEISURE"
  arrival: string;
  departure: string;
  lines: FolioLine[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  balance: number;
}

// FNV-1a 32-bit hash. Stable across runs and platforms.
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

// Tiny seeded PRNG (mulberry32). Reproducible across runs.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDate(s: string): Date {
  // Accept ISO date or datetime; normalize to UTC midnight.
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    return new Date();
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  const nights = Math.round(ms / (1000 * 60 * 60 * 24));
  return Math.max(1, nights);
}

const FB_VENDORS = [
  { code: 'FB', description: 'In-Room Dining — Dinner', minAmt: 64, maxAmt: 180 },
  { code: 'FB', description: 'Lobby Bar — Cocktails', minAmt: 28, maxAmt: 96 },
  { code: 'FB', description: 'Manor Restaurant — Breakfast', minAmt: 38, maxAmt: 88 },
  { code: 'FB', description: 'In-Room Dining — Breakfast', minAmt: 42, maxAmt: 78 },
  { code: 'FB', description: 'Pool Cafe — Lunch', minAmt: 34, maxAmt: 92 },
  { code: 'FB', description: 'Minibar Replenishment', minAmt: 22, maxAmt: 64 },
] as const;

const STAFF = ['M. Chen', 'A. Rivera', 'J. Patel', 'D. Okafor', 'S. Laurent', 'K. Tanaka'] as const;

export function getFolioForGuest(guest: {
  id: string;
  name: string;
  room: string | null;
  booking_dates: { check_in: string; check_out: string };
  vip_tier?: string;
}): Folio {
  const seed = hash32(guest.id || guest.name || 'unknown');
  const rng = mulberry32(seed);

  const checkIn = parseDate(guest.booking_dates.check_in);
  const checkOut = parseDate(guest.booking_dates.check_out);
  const nights = nightsBetween(checkIn, checkOut);

  const tier = (guest.vip_tier ?? 'standard').toLowerCase();
  const premiumTier = tier === 'platinum' || tier === 'legacy';
  const nightlyRate = premiumTier ? 1450 : 850;

  const room = guest.room ?? `${300 + (seed % 200)}`;
  const confirmation = `RW-${(seed % 900000 + 100000).toString()}`;
  const rateCode = premiumTier ? 'RW-PLAT' : (seed % 3 === 0 ? 'RW-CORP' : 'RW-BAR');
  const marketSegment = rateCode === 'RW-CORP' ? 'CORPORATE' : (premiumTier ? 'VIP' : 'LEISURE');

  const lines: FolioLine[] = [];

  // Room charges, one per night.
  for (let i = 0; i < nights; i++) {
    const date = new Date(checkIn);
    date.setUTCDate(date.getUTCDate() + i);
    lines.push({
      id: `rm-${i}-${seed.toString(36)}`,
      date: isoDate(date),
      code: 'RM',
      description: `Room — ${room}`,
      amount: nightlyRate,
      posted_by: 'AUTO',
    });
  }

  // 2-3 F&B charges spread across the stay.
  const fbCount = 2 + Math.floor(rng() * 2); // 2 or 3
  const usedVendors = new Set<string>();
  for (let i = 0; i < fbCount; i++) {
    let vendor = pick(rng, FB_VENDORS);
    let attempts = 0;
    while (usedVendors.has(vendor.description) && attempts < 4) {
      vendor = pick(rng, FB_VENDORS);
      attempts++;
    }
    usedVendors.add(vendor.description);

    const dayOffset = Math.min(nights - 1, Math.floor(rng() * nights));
    const date = new Date(checkIn);
    date.setUTCDate(date.getUTCDate() + dayOffset);

    const amt = round2(vendor.minAmt + rng() * (vendor.maxAmt - vendor.minAmt));
    lines.push({
      id: `fb-${i}-${seed.toString(36)}`,
      date: isoDate(date),
      code: vendor.code,
      description: vendor.description,
      amount: amt,
      posted_by: pick(rng, STAFF),
    });
  }

  // One resort fee per stay (posted on check-in day).
  lines.push({
    id: `rf-${seed.toString(36)}`,
    date: isoDate(checkIn),
    code: 'RF',
    description: `Resort Fee (${nights} night${nights === 1 ? '' : 's'})`,
    amount: 45 * nights,
    posted_by: 'AUTO',
  });

  // Sort chronologically, then by code priority (RM before FB before RF).
  const codeOrder: Record<string, number> = { RM: 0, FB: 1, RF: 2, MISC: 3, TX: 4 };
  lines.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (codeOrder[a.code] ?? 99) - (codeOrder[b.code] ?? 99);
  });

  const subtotal = round2(lines.reduce((acc, l) => acc + l.amount, 0));
  const tax = round2(subtotal * 0.14);

  // Append tax as a synthetic line at the bottom.
  lines.push({
    id: `tx-${seed.toString(36)}`,
    date: isoDate(checkOut),
    code: 'TX',
    description: 'Occupancy Tax (14%)',
    amount: tax,
    posted_by: 'AUTO',
  });

  const total = round2(subtotal + tax);

  const now = new Date();
  const departed = checkOut.getTime() <= Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const balance = departed ? 0 : total;

  return {
    guest_id: guest.id,
    guest_name: guest.name,
    room,
    confirmation_number: confirmation,
    rate_code: rateCode,
    market_segment: marketSegment,
    arrival: isoDate(checkIn),
    departure: isoDate(checkOut),
    lines,
    subtotal,
    tax,
    total,
    payment_method: 'AMEX Centurion ending 4202',
    balance,
  };
}
