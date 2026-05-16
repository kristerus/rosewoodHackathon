import { NextResponse } from 'next/server';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import type { Guest, GuestBrief } from '@/lib/types';

export const runtime = 'nodejs';

interface BriefRequest {
  guest_id: string;
  guests: Guest[];
}

type BriefFields = Omit<GuestBrief, 'generated_at'>;

const BRIEF_TOOL = {
  name: 'create_guest_brief',
  description:
    'Produce a concise pre-arrival intelligence brief for hotel staff about a specific guest. Always call exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: '2-3 sentence overview of who the guest is and why they matter.',
      },
      professional: {
        type: 'string',
        description: 'Role, company, and industry context.',
      },
      recent_news: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 3,
        description: 'Plausible recent news items / activities (synthesized from public sources).',
      },
      conversation_starters: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 3,
        description: 'Tasteful talking points the staff can use to make the guest feel known.',
      },
      preferences_inferred: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 4,
        description: 'Preferences inferred beyond what is in the profile (e.g. "likely prefers quiet rooms").',
      },
    },
    required: ['summary', 'professional', 'recent_news', 'conversation_starters', 'preferences_inferred'],
  },
};

const SYSTEM_PROMPT = `You are an AI concierge intelligence service for Rosewood Hotels.
You synthesize a short briefing for staff from (pretend) LinkedIn, public news, and past-stay history.

GUIDELINES:
- Make the details plausible and tasteful, grounded in the guest's name, VIP tier, profession context, and notes.
- NEVER fabricate sensitive personal information (health, family, finances beyond public roles).
- Tone: discreet, professional, useful — like a Forbes-style executive briefing card.
- Output via the create_guest_brief tool exactly once.`;

export async function POST(req: Request) {
  let body: BriefRequest;
  try {
    body = (await req.json()) as BriefRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { guest_id, guests } = body ?? ({} as BriefRequest);
  if (!guest_id || !Array.isArray(guests)) {
    return NextResponse.json(
      { error: 'Missing required fields: guest_id, guests' },
      { status: 400 },
    );
  }

  const guest = guests.find((g) => g.id === guest_id);
  if (!guest) {
    return NextResponse.json({ error: `Guest not found: ${guest_id}` }, { status: 404 });
  }

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [BRIEF_TOOL],
      tool_choice: { type: 'tool', name: 'create_guest_brief' },
      messages: [
        {
          role: 'user',
          content: `Generate a pre-arrival brief for this guest:

${JSON.stringify(
  {
    name: guest.name,
    room: guest.room,
    vip_tier: guest.vip_tier,
    past_stays: guest.past_stays,
    preferences: guest.preferences,
    notes: guest.notes,
    booking_dates: guest.booking_dates,
  },
  null,
  2,
)}

Synthesize plausible LinkedIn / news context consistent with the name, tier, and notes. Call create_guest_brief now.`,
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

    const fields = toolUse.input as BriefFields;
    const brief: GuestBrief = {
      ...fields,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
