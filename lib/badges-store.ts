"use client";

import { create } from "zustand";

export type BadgeDepartment =
  | "concierge"
  | "housekeeping"
  | "fnb"
  | "maintenance"
  | "frontdesk"
  | "unassigned";

export interface Badge {
  id: string;          // "RW-BADGE-01"
  serial: string;      // "SN-A2K4-7821"
  assigned_to: string; // "Maria Reyes"
  department: BadgeDepartment;
  staff_id: string;    // "staff-maria-reyes" — matches ticket.staff_id
  battery_pct: number; // 0-100
  is_charging: boolean;
  online: boolean;
  last_seen: string;   // ISO
  firmware: string;    // "v1.4.2"
}

interface BadgesState {
  badges: Badge[];
  pingBadgeByStaffId: (staff_id: string) => void;
  setBatteryPct: (id: string, pct: number) => void;
  toggleCharging: (id: string) => void;
}

/**
 * Build an ISO timestamp offset by `secondsAgo` from the moment the module loads.
 * Relative-time rendering at runtime gives "30 seconds ago", "3 minutes ago", etc.
 */
const now = Date.now();
const ago = (secondsAgo: number): string =>
  new Date(now - secondsAgo * 1000).toISOString();

const INITIAL_BADGES: Badge[] = [
  {
    id: "RW-BADGE-01",
    serial: "SN-A2K4-7821",
    assigned_to: "Kristian Petrushevski",
    department: "frontdesk",
    staff_id: "staff-kristian-01",
    battery_pct: 92,
    is_charging: false,
    online: true,
    last_seen: ago(30), // 30s ago
    firmware: "v1.4.2",
  },
  {
    id: "RW-BADGE-02",
    serial: "SN-B7C1-3309",
    assigned_to: "Maria Reyes",
    department: "concierge",
    staff_id: "staff-maria-reyes",
    battery_pct: 78,
    is_charging: false,
    online: true,
    last_seen: ago(75), // ~1m ago
    firmware: "v1.4.2",
  },
  {
    id: "RW-BADGE-03",
    serial: "SN-C9D2-5544",
    assigned_to: "James Park",
    department: "concierge",
    staff_id: "staff-james-park",
    battery_pct: 45,
    is_charging: false,
    online: true,
    last_seen: ago(180), // 3m ago
    firmware: "v1.4.1",
  },
  {
    id: "RW-BADGE-04",
    serial: "SN-D3E5-9012",
    assigned_to: "Aiko Tanaka",
    department: "housekeeping",
    staff_id: "staff-aiko-tanaka",
    battery_pct: 12, // low!
    is_charging: false,
    online: true,
    last_seen: ago(420), // 7m ago
    firmware: "v1.4.2",
  },
  {
    id: "RW-BADGE-05",
    serial: "SN-E6F8-1278",
    assigned_to: "Marcus Chen",
    department: "fnb",
    staff_id: "staff-marcus-chen",
    battery_pct: 88,
    is_charging: false,
    online: true,
    last_seen: ago(95),
    firmware: "v1.4.2",
  },
  {
    id: "RW-BADGE-06",
    serial: "SN-F2G3-4456",
    assigned_to: "Sofia Whitaker",
    department: "frontdesk",
    staff_id: "staff-sofia-whitaker",
    battery_pct: 67,
    is_charging: false,
    online: true,
    last_seen: ago(240), // 4m ago
    firmware: "v1.4.2",
  },
  {
    id: "RW-BADGE-07",
    serial: "SN-G4H6-7723",
    assigned_to: "Daniel O'Neill",
    department: "maintenance",
    staff_id: "staff-daniel-oneill",
    battery_pct: 30,
    is_charging: false,
    online: false, // offline
    last_seen: ago(60 * 47), // 47m ago
    firmware: "v1.3.9",
  },
  {
    id: "RW-BADGE-08",
    serial: "SN-H8J1-2235",
    assigned_to: "Priya Iyer",
    department: "unassigned",
    staff_id: "staff-priya-iyer",
    battery_pct: 100,
    is_charging: true, // charging spare
    online: false,
    last_seen: ago(60 * 60 * 2), // 2h ago
    firmware: "v1.4.2",
  },
];

export const useBadgesStore = create<BadgesState>((set) => ({
  badges: INITIAL_BADGES,

  pingBadgeByStaffId: (staff_id: string) =>
    set((state) => {
      const ts = new Date().toISOString();
      let touched = false;
      const badges = state.badges.map((b) => {
        if (b.staff_id === staff_id) {
          touched = true;
          return { ...b, online: true, last_seen: ts };
        }
        return b;
      });
      return touched ? { badges } : {};
    }),

  setBatteryPct: (id, pct) =>
    set((state) => ({
      badges: state.badges.map((b) =>
        b.id === id ? { ...b, battery_pct: Math.max(0, Math.min(100, pct)) } : b,
      ),
    })),

  toggleCharging: (id) =>
    set((state) => ({
      badges: state.badges.map((b) =>
        b.id === id ? { ...b, is_charging: !b.is_charging } : b,
      ),
    })),
}));

/* ----- Selectors ----- */

export function selectBadgeStats(state: BadgesState): {
  total: number;
  online: number;
  offline: number;
  lowBattery: number;
  avgBattery: number;
} {
  const total = state.badges.length;
  const online = state.badges.filter((b) => b.online).length;
  const lowBattery = state.badges.filter((b) => b.battery_pct < 20).length;
  const avgBattery =
    total === 0
      ? 0
      : Math.round(
          state.badges.reduce((sum, b) => sum + b.battery_pct, 0) / total,
        );
  return {
    total,
    online,
    offline: total - online,
    lowBattery,
    avgBattery,
  };
}
