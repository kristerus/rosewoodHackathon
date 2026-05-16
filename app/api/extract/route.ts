import { NextResponse } from 'next/server';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import type { Department, Guest, Ticket, Urgency } from '@/lib/types';

// Offline mock responses for the 5 demo scenarios (used when ANTHROPIC_API_KEY is absent).
type MockScenario = { keywords: RegExp[]; ticket: Omit<Ticket, 'id' | 'timestamp' | 'raw_transcript' | 'staff_id'> };
const MOCK_SCENARIOS: MockScenario[] = [
  {
    keywords: [/grinding noise/i, /AC.*412|412.*AC/i, /won't go below/i],
    ticket: { guest_name: 'Mr. David Chen', room_number: '412', department: 'maintenance', intent: 'HVAC failure — occupied room', urgency: 'critical', action_required: 'Dispatch on-call HVAC engineer to room 412 immediately. If unresolved by 21:30, trigger room move to suite-tier inventory. Notify night manager.', guest_facing_message: 'Mr. Chen, our engineering team is on the way to room 412 right now. We apologize for the disruption — if it is not resolved within 15 minutes, we will move you to an upgraded suite with our compliments.', internal_notes: 'Platinum tier, 8th stay. Profile flag: prefers cool room temperature. This is a comfort-critical failure for this specific guest. Early flight on file — do not schedule follow-up before 06:00.' },
  },
  {
    keywords: [/gardenias/i, /Whitfield/i, /1102/i],
    ticket: { guest_name: 'Mrs. Eleanor Whitfield', room_number: '1102', department: 'concierge', intent: 'Repeat preference fulfillment — gardenia arrangement', urgency: 'high', action_required: 'Place gardenia arrangement (matching previous stay record) in room 1102 before 16:00. Confirm afternoon tea service set for 16:00 in the Drawing Room per standing preference.', guest_facing_message: '', internal_notes: 'Legacy tier, 41st stay. Past-stay log shows gardenia arrangement on stays #38 and #40. Afternoon tea at 4pm is a standing preference, not a one-off request.' },
  },
  {
    keywords: [/nut|almond/i, /Chen|412/i, /welcome amenity|cheese board/i],
    ticket: { guest_name: 'Mr. David Chen', room_number: '412', department: 'fnb', intent: 'Allergy alert — remove nuts from welcome amenity', urgency: 'urgent', action_required: 'Replace welcome amenity in room 412 immediately. Remove all nut-containing items including almonds. Update F&B allergy flag for this stay. Confirm kitchen and room service are notified.', guest_facing_message: 'Mr. Chen, we have updated your welcome amenity and ensured everything in room 412 is completely nut-free. Our F&B team has been briefed for the duration of your stay.', internal_notes: 'Platinum tier. Severe anaphylactic nut allergy — confirmed on every visit. Guest flagged an incident with almonds on the cheese board. Treat as priority safety item.' },
  },
  {
    keywords: [/Patel|kosher|cardiology/i, /table 14|breakfast and dinner/i],
    ticket: { guest_name: 'Dr. Raj Patel', room_number: '215', department: 'fnb', intent: 'Dietary requirement — kosher meals for full stay', urgency: 'normal', action_required: 'Coordinate certified kosher meals for Dr. Patel (room 215) for breakfast and dinner every day. Ensure room service carries the same dietary note. Liaise with kitchen now.', guest_facing_message: 'Dr. Patel, we have arranged certified kosher meals for breakfast and dinner throughout your stay. Room service is fully briefed — please do not hesitate to call if you need anything adjusted.', internal_notes: 'Gold tier, first stay. Attending International Cardiology Conference, speaking on day 2. Strictly kosher and vegetarian. Quiet room preference — no elevators.' },
  },
  {
    keywords: [/Sofia|808/i, /lilies|peonies|wilting/i],
    ticket: { guest_name: 'Ms. Sofia Marchetti', room_number: '808', department: 'housekeeping', intent: 'Floral refresh before turndown', urgency: 'high', action_required: 'Replace wilting lilies in room 808 with fresh white peonies before turndown (guest returns ~19:00). Source from florist if stock is low.', guest_facing_message: 'Ms. Marchetti, fresh white peonies have been arranged in your suite ahead of turndown. We hope the suite feels just right when you return this evening.', internal_notes: 'Legacy tier, 22nd stay. Standing preference: fresh flowers replaced daily, peonies or white roses preferred. Italian luxury buyer, knows GM personally.' },
  },
];

function getMockTicket(transcript: string): Omit<Ticket, 'id' | 'timestamp' | 'raw_transcript' | 'staff_id'> | null {
  for (const scenario of MOCK_SCENARIOS) {
    if (scenario.keywords.some((re) => re.test(transcript))) return scenario.ticket;
  }
  return null;
}

export const runtime = 'nodejs';

interface ExtractRequest {
  transcript: string;
  staff_id: string;
  known_guests: Guest[];
}

// Fields Claude fills in. Server attaches id / timestamp / raw_transcript / staff_id.
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
          'The guest\'s name if explicitly mentioned in the transcript or unambiguously identifiable from known_guests. Otherwise null.',
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
        enum: ['low', 'normal', 'high', 'urgent', 'critical'],
        description: 'Use "critical" for safety/medical/major outage (safety risk, non-functional occupied room); "urgent" for severe time-pressure; "high" for time-sensitive (next 30 min); "normal" default; "low" for whenever-convenient.',
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
- urgency: "critical" for safety risk or a non-functional occupied room (e.g. broken AC, no heat/water); "urgent" for severe time-pressure; "high" for time-sensitive (next 30 min); "normal" default; "low" for whenever-convenient.
- Be concise. No fluff.

You MUST call the create_ticket tool exactly once with your structured output.`;

export async function POST(req: Request) {
  let body: ExtractRequest;
  try {
    body = (await req.json()) as ExtractRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { transcript, staff_id, known_guests } = body ?? ({} as ExtractRequest);
  if (!transcript || typeof transcript !== 'string' || !staff_id) {
    return NextResponse.json(
      { error: 'Missing required fields: transcript, staff_id' },
      { status: 400 },
    );
  }

  const knownGuestsSummary = (known_guests ?? []).map((g) => ({
    name: g.name,
    room: g.room,
    vip_tier: g.vip_tier,
    preferences: g.preferences,
    notes: g.notes,
  }));

  // Offline demo mode: use hardcoded responses when no API key is configured.
  if (!process.env.ANTHROPIC_API_KEY) {
    const mock = getMockTicket(transcript);
    const ticket: Ticket = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      raw_transcript: transcript,
      staff_id,
      ...(mock ?? {
        guest_name: null,
        room_number: null,
        department: 'concierge' as Department,
        intent: transcript.slice(0, 60),
        urgency: 'normal' as Urgency,
        action_required: 'Follow up with guest as described.',
        guest_facing_message: 'Thank you — our team will be right with you.',
        internal_notes: '[Demo mode — no API key configured]',
      }),
    };
    return NextResponse.json({ ticket });
  }

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [TICKET_TOOL],
      // Force the model to emit a create_ticket tool call — guarantees structured output.
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
        { status: 500 },
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

    return NextResponse.json({ ticket });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
