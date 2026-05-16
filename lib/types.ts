export type Department = 'concierge' | 'housekeeping' | 'fnb' | 'maintenance' | 'frontdesk';
export type Urgency = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'escalated';

export interface Ticket {
  id: string;
  timestamp: string; // ISO
  guest_name: string | null;
  room_number: string | null;
  department: Department;
  intent: string; // short summary like "Restaurant recommendation request"
  urgency: Urgency;
  action_required: string; // what the department needs to do
  guest_facing_message: string; // friendly message Glowing sends to guest
  internal_notes: string; // context for the staff member handling it
  raw_transcript: string;
  staff_id: string;
  /** Optional lifecycle status. Defaults to 'open' at render time. */
  status?: TicketStatus;
}

export interface GuestBrief {
  summary: string; // 2-3 sentence overview
  professional: string; // role/company
  recent_news: string[]; // 2-3 bullet points
  conversation_starters: string[]; // 2-3 suggestions for staff
  preferences_inferred: string[]; // e.g. "likely prefers quiet rooms"
  generated_at: string;
}

export interface Guest {
  id: string;
  name: string;
  room: string | null;
  booking_dates: { check_in: string; check_out: string };
  vip_tier: 'standard' | 'gold' | 'platinum' | 'legacy';
  preferences: string[];
  past_stays: number;
  notes: string;
  research_brief?: GuestBrief;
  interaction_log: Ticket[];
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
