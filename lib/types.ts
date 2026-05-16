export type Department = 'concierge' | 'housekeeping' | 'fnb' | 'maintenance' | 'frontdesk';
export type Urgency = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'escalated';

export interface Ticket {
  id: string;
  timestamp: string; // ISO
  guest_name: string | null;
  room_number: string | null;
  department: Department;
  intent: string;
  urgency: Urgency;
  action_required: string;
  guest_facing_message: string;
  internal_notes: string;
  raw_transcript: string;
  staff_id: string;
  /** Optional lifecycle status. Defaults to 'open' at render time. */
  status?: TicketStatus;
}

export interface WelcomeActions {
  roomSetup: string;
  preArrivalDrink: string;
  welcomeNote: string;
  conciergeAlert: string;
}

export interface GuestBrief {
  summary: string;
  professional: string;
  recent_news: string[];
  conversation_starters: string[];
  preferences_inferred: string[];
  personalizedExperiences: string[];
  welcomeActions: WelcomeActions;
  riskFlags: string[];
  generated_at: string;
}

export interface Guest {
  id: string;
  name: string;
  room: string | null;
  booking_dates: { check_in: string; check_out: string };
  vip_tier: 'standard' | 'gold' | 'platinum' | 'legacy';
  preferences: string[];
  learnedPreferences: string[];
  past_stays: number;
  notes: string;
  linkedInSummary?: string;
  recentNews?: string[];
  interests?: string[];
  dietaryRestrictions?: string[];
  preferredLanguage?: string;
  lifetimeValue?: string;
  research_brief?: GuestBrief;
  interaction_log: Ticket[];
  profilePhoto?: string;
}

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface Prediction {
  id: string;
  title: string;
  rationale: string;
  suggested_department: Department;
  confidence: ConfidenceLevel;
}

export interface GuestMetadata {
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
  updated_at: string;
}
