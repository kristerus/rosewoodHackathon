import { NextResponse } from 'next/server';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { publish } from '@/lib/event-bus';
import { SEED_GUESTS } from '@/lib/seed';
import type { Department, Guest, Ticket, Urgency } from '@/lib/types';

export const runtime = 'nodejs';

interface BadgeTranscriptRequest {
  transcript: string;
  staff_id: string;
  known_guests?: Guest[];
}

interface ExtractedTicketFields {
  guest_name: string | null;
  room_number: string | null;
  department: Department;
  intent: string;
  urgency: Urgency;
  action_required: string;
  guest_facing_message: string;
  internal_notes: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Duplicated from /api/extract (intentionally — we don't want to call our own route handler).
const TICKET_TOOL = {
  name: 'create_ticket',
  description:
    'Create a structured hotel service ticket from a staff member voice transcript. Always call this exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      guest_name: {
        type: ['string', 'null'],
        description:
          "The guest's name if explicitly mentioned in the transcript or unambiguously identifiable from known_guests. Otherwise null.",
      },
      room_number: {
        type: ['string', 'null'],
        description: 'Room number if mentioned or unambiguously known. Otherwise null.',
      },
      department: {
        type: 'string',
        enum: ['concierge', 'housekeeping', 'fnb', 'maintenance', 'frontdesk'],
        description: 'Which hotel department should handle this ticket.',
      },
      intent: {
        type: 'string',
        description: 'Short summary of what the guest wants, e.g. "Restaurant recommendation request".',
      },
      urgency: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'urgent'],
      },
      action_required: {
        type: 'string',
        description: 'Concrete next action the department must take.',
      },
      guest_facing_message: {
        type: 'string',
        description:
          'Warm, brand-appropriate confirmation that Glowing.io will send to the guest. Address them by name if known.',
      },
      internal_notes: {
        type: 'string',
        description: 'Context, preferences, allergies, or VIP cues the handling staff should be aware of.',
      },
    },
    required: [
      'guest_name',
      'room_number',
      'department',
      'intent',
      'urgency',
      'action_required',
      'guest_facing_message',
      'internal_notes',
    ],
  },
};

const SYSTEM_PROMPT = `You are the AI brain of a voice-activated staff badge at Rosewood Hotels.
A staff member speaks a short note about a guest interaction; you turn it into a structured service ticket.

DEPARTMENTS (pick exactly one):
- concierge: restaurant/activity recommendations, reservations, local info, transportation, tours
- housekeeping: cleaning, towels, linens, amenities, turndown, laundry, in-room supplies
- fnb: food and beverage — room service, dining reservations on-property, dietary requests, minibar
- maintenance: anything broken or malfunctioning — HVAC, plumbing, lighting, TV, safe, door locks
- frontdesk: check-in/out, billing, room keys, luggage, transportation arranged at desk

RULES:
- Set guest_name and room_number to null UNLESS the transcript explicitly mentions them OR a known guest is the unambiguous referent.
- guest_facing_message must be warm and on-brand. Example: "Mr. Chen, we'd love to help with restaurant recommendations — our concierge team will reach out shortly with options."
- If the guest is in known_guests, weave a relevant preference or note into internal_notes (e.g. nut allergy, prefers quiet room).
- urgency: "urgent" only for safety/medical/major outage; "high" for time-sensitive (next 30 min); "normal" default; "low" for whenever-convenient.
- Be concise. No fluff.

You MUST call the create_ticket tool exactly once with your structured output.`;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  let body: BadgeTranscriptRequest;
  try {
    body = (await req.json()) as BadgeTranscriptRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS_HEADERS });
  }

  const { transcript, staff_id, known_guests } = body ?? ({} as BadgeTranscriptRequest);
  if (!transcript || typeof transcript !== 'string' || !staff_id) {
    return NextResponse.json(
      { error: 'Missing required fields: transcript, staff_id' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Phone won't have the guest list; fall back to seed.
  const guestList: Guest[] = Array.isArray(known_guests) && known_guests.length > 0
    ? known_guests
    : SEED_GUESTS;

  // 1. Fire transcript event immediately so the web UI shows a "live transcript arriving" indicator.
  publish({ type: 'transcript', transcript, staff_id });

  const knownGuestsSummary = guestList.map((g) => ({
    name: g.name,
    room: g.room,
    vip_tier: g.vip_tier,
    preferences: g.preferences,
    notes: g.notes,
  }));

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [TICKET_TOOL],
      tool_choice: { type: 'tool', name: 'create_ticket' },
      messages: [
        {
          role: 'user',
          content: `STAFF TRANSCRIPT:
"""
${transcript}
"""

KNOWN GUESTS (for disambiguation only — do not invent matches):
${JSON.stringify(knownGuestsSummary, null, 2)}

Call create_ticket now.`,
        },
      ],
    });

    const toolUse = response.content.find((c) => c.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'Model did not return a tool_use block' },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const extracted = toolUse.input as ExtractedTicketFields;

    const ticket: Ticket = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      raw_transcript: transcript,
      staff_id,
      guest_name: extracted.guest_name,
      room_number: extracted.room_number,
      department: extracted.department,
      intent: extracted.intent,
      urgency: extracted.urgency,
      action_required: extracted.action_required,
      guest_facing_message: extracted.guest_facing_message,
      internal_notes: extracted.internal_notes,
    };

    // 2. Fan the finished ticket out to the dashboard via SSE.
    publish({ type: 'ticket', ticket });

    return NextResponse.json({ ticket }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
