import { NextResponse } from 'next/server';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { setMetadata, type GuestMetadata } from '@/lib/guest-metadata-store';

export const runtime = 'nodejs';

interface ParseEmailRequest {
  email_text: string;
  guest_id?: string;
}

// Fields Claude extracts. Mirrors GuestMetadata minus updated_at (server stamps that).
type ParsedFields = Omit<GuestMetadata, 'updated_at'>;

const PARSE_TOOL = {
  name: 'parse_guest_email',
  description:
    'Extract structured pre-arrival fields from a guest email correspondence. Always call exactly once. Leave fields blank rather than guess.',
  input_schema: {
    type: 'object' as const,
    properties: {
      eta: {
        type: 'string',
        description: 'Estimated arrival time at the hotel. ISO timestamp or human-readable like "5:30 PM Thursday". Leave blank if unclear.',
      },
      departure_time: {
        type: 'string',
        description: 'Expected departure time / checkout time if mentioned.',
      },
      flight_arrival: {
        type: 'string',
        description: 'Inbound flight details, e.g. "AA 256 from JFK, lands 4:15 PM".',
      },
      flight_departure: {
        type: 'string',
        description: 'Outbound flight details if mentioned.',
      },
      party_size: {
        type: 'number',
        description: 'Total number of guests in the party including the primary guest.',
      },
      accompanying_guests: {
        type: 'array',
        items: { type: 'string' },
        description: 'Names of other people traveling with the guest.',
      },
      special_occasion: {
        type: 'string',
        description: 'e.g. "anniversary", "birthday", "business trip", "honeymoon".',
      },
      dietary_restrictions: {
        type: 'array',
        items: { type: 'string' },
        description: 'e.g. ["vegan", "gluten-free", "kosher"].',
      },
      allergies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Food or environmental allergies explicitly mentioned.',
      },
      room_preferences: {
        type: 'array',
        items: { type: 'string' },
        description: 'e.g. ["high floor", "quiet", "away from elevator", "king bed"].',
      },
      airport_transfer_needed: {
        type: 'boolean',
        description: 'Whether the guest has requested airport transportation.',
      },
      airport_transfer_details: {
        type: 'string',
        description: 'Details about the airport transfer if requested.',
      },
      welcome_amenities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific items the guest requested be in the room on arrival.',
      },
      pre_stocked_items: {
        type: 'array',
        items: { type: 'string' },
        description: 'Items the guest asked the hotel to pre-stock.',
      },
      free_form_notes: {
        type: 'string',
        description: 'Any other useful context from the email that doesn\'t fit elsewhere. Keep concise.',
      },
    },
    // No fields required — be conservative and leave blanks.
    required: [],
  },
};

const SYSTEM_PROMPT = `You are an AI assistant for luxury hotel staff. Extract structured pre-arrival information from a guest's email correspondence. Be conservative — leave fields blank rather than guess.

GUIDELINES:
- Only populate a field if the email contains explicit, unambiguous information for it.
- Do NOT fabricate flight numbers, times, or preferences.
- free_form_notes is for context that didn't fit other fields — keep it short and factual.
- Output via the parse_guest_email tool exactly once.`;

export async function POST(req: Request) {
  let body: ParseEmailRequest;
  try {
    body = (await req.json()) as ParseEmailRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email_text, guest_id } = body ?? ({} as ParseEmailRequest);
  if (!email_text || typeof email_text !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: email_text' },
      { status: 400 },
    );
  }

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [PARSE_TOOL],
      tool_choice: { type: 'tool', name: 'parse_guest_email' },
      messages: [
        {
          role: 'user',
          content: `GUEST EMAIL:
"""
${email_text}
"""

Extract structured pre-arrival fields. Leave any field blank that is not explicitly stated. Call parse_guest_email now.`,
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

    const fields = toolUse.input as ParsedFields;

    // Stamp updated_at locally so the returned shape is a complete GuestMetadata.
    const parsed: GuestMetadata = {
      ...fields,
      updated_at: new Date().toISOString(),
    };

    let saved = false;
    if (guest_id && typeof guest_id === 'string') {
      setMetadata(guest_id, fields);
      saved = true;
    }

    return NextResponse.json({ parsed, saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
