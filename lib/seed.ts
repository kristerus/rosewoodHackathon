import type { Guest } from './types';

export const TIER_RULES: Record<Guest['vip_tier'], { minStays: number; label: string; description: string }> = {
  standard: { minStays: 0, label: 'Standard', description: 'Regular guest' },
  gold: { minStays: 3, label: 'Gold', description: '3+ past stays — preferred guest' },
  platinum: { minStays: 10, label: 'Platinum', description: '10+ past stays — VIP' },
  legacy: { minStays: 25, label: 'Legacy', description: '25+ past stays — heritage guest' },
};

export function validateGuestTier(tier: Guest['vip_tier'], pastStays: number): { ok: true } | { ok: false; reason: string; suggestedTier?: Guest['vip_tier']; suggestedMinStays?: number } {
  const floor = TIER_RULES[tier].minStays;
  if (pastStays >= floor) return { ok: true };
  // Suggest the highest tier the past_stays qualifies for
  const tiers: Guest['vip_tier'][] = ['legacy', 'platinum', 'gold', 'standard'];
  const suggestedTier = tiers.find((t) => pastStays >= TIER_RULES[t].minStays) ?? 'standard';
  return {
    ok: false,
    reason: `${TIER_RULES[tier].label} tier requires at least ${floor} past stays (this guest has ${pastStays})`,
    suggestedTier,
    suggestedMinStays: floor,
  };
}

export const SEED_GUESTS: Guest[] = [
  {
    id: 'guest-chen-david',
    name: 'Mr. David Chen',
    room: '412',
    booking_dates: { check_in: '2026-05-14', check_out: '2026-05-18' },
    vip_tier: 'platinum',
    preferences: [
      'Room temperature set cool (~67°F)',
      'Extra pillows',
      'Sparkling water on arrival',
    ],
    past_stays: 12,
    notes: 'Severe nut allergy — confirmed by F&B on every visit. Tech executive, often takes early-morning calls.',
    interaction_log: [],
  },
  {
    id: 'guest-marchetti-sofia',
    name: 'Ms. Sofia Marchetti',
    room: '808',
    booking_dates: { check_in: '2026-05-12', check_out: '2026-05-20' },
    vip_tier: 'legacy',
    preferences: [
      'Fresh flowers replaced daily (prefers peonies or white roses)',
      'Italian-language newspapers each morning',
      'Espresso service before 7am',
    ],
    past_stays: 28,
    notes: 'Italian luxury fashion buyer, Milan-based. Travels seasonally for fashion weeks. Knows GM personally.',
    interaction_log: [],
  },
  {
    id: 'guest-patel-raj',
    name: 'Dr. Raj Patel',
    room: '215',
    booking_dates: { check_in: '2026-05-15', check_out: '2026-05-17' },
    vip_tier: 'gold',
    preferences: [
      'Kosher meals (certified)',
      'Quiet room away from elevators',
      'Late checkout when possible',
    ],
    past_stays: 4,
    notes: 'First stay. In town for the International Cardiology Conference. Speaking on day 2.',
    interaction_log: [],
  },
  {
    id: 'guest-whitfield-eleanor',
    name: 'Mrs. Eleanor Whitfield',
    room: '1102',
    booking_dates: { check_in: '2026-05-10', check_out: '2026-05-24' },
    vip_tier: 'legacy',
    preferences: [
      'Afternoon tea served in suite at 4:00pm sharp',
      'Earl Grey, milk on the side, two scones with clotted cream',
      'Housekeeping only between 10am–noon',
    ],
    past_stays: 43,
    notes: 'Retired philanthropist, long-time patron. Prefers to be addressed formally. Mobility-aware staff escort appreciated.',
    interaction_log: [],
  },
];
