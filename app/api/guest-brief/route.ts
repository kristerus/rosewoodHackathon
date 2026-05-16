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
    'Produce a comprehensive pre-arrival intelligence brief for hotel staff about a specific guest. Always call exactly once.',
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
        minItems: 3,
        maxItems: 3,
        description: 'Natural, warm conversation openers for front desk staff. Should feel personal, not scripted.',
      },
      preferences_inferred: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 4,
        description: 'Preferences inferred beyond what is in the profile (e.g. "likely prefers quiet rooms").',
      },
      personalizedExperiences: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 5,
        description: 'Specific personalized experience ideas. Format: "<interest/signal> → <concrete hotel action>". E.g. "Coldplay fan → show local Coldplay event on welcome screen", "Prefers sparkling water → pre-stock minibar", "Allergic to shellfish → alert F&B chef".',
      },
      welcomeActions: {
        type: 'object',
        description: 'Concrete pre-arrival setup actions.',
        properties: {
          roomSetup: {
            type: 'string',
            description: 'Specific room configuration checklist. E.g. "Set AC to 67°F, extra pillows (2 firm), sparkling water chilled, blackout blinds tested."',
          },
          preArrivalDrink: {
            type: 'string',
            description: 'Welcome drink recommendation with brief rationale. E.g. "Chilled sparkling water + cold brew coffee — aligns with known preferences."',
          },
          welcomeNote: {
            type: 'string',
            description: 'A warm, personalised welcome note written in first person from the hotel. 2-3 sentences, using guest-specific details.',
          },
          conciergeAlert: {
            type: 'string',
            description: 'Key briefing note for the concierge team — what to anticipate, what to avoid, and any special arrangements to have ready.',
          },
        },
        required: ['roomSetup', 'preArrivalDrink', 'welcomeNote', 'conciergeAlert'],
      },
      riskFlags: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 4,
        description: 'Things staff must NOT do or say. E.g. "Never offer nut-containing items — anaphylactic allergy", "Do not discuss competing luxury brands", "Avoid mentioning the recent press controversy around their company".',
      },
    },
    required: [
      'summary', 'professional', 'recent_news', 'conversation_starters',
      'preferences_inferred', 'personalizedExperiences', 'welcomeActions', 'riskFlags',
    ],
  },
};

const SYSTEM_PROMPT = `You are an AI concierge intelligence service for Rosewood Hotels — the world's most discreet, personalised luxury hotel group.

You synthesize a comprehensive pre-arrival briefing for staff from the guest's profile, LinkedIn background, public news, and past-stay history.

GUIDELINES:
- Make every detail plausible and guest-specific, grounded in their name, tier, profession, interests, and notes.
- The welcomeNote must feel genuinely personal — reference something specific about their work or interests.
- personalizedExperiences should be creative and actionable, not generic. Use the guest's actual interests.
- riskFlags are critical — be specific and direct about what NEVER to do (dietary, sensitive topics, preferences).
- NEVER fabricate sensitive personal information (health beyond what's noted, family, exact finances).
- Tone: discreet, warm, professional — like a Forbes-style briefing card meets a butler's mental notes.
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
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [BRIEF_TOOL],
      tool_choice: { type: 'tool', name: 'create_guest_brief' },
      messages: [
        {
          role: 'user',
          content: `Generate a full pre-arrival intelligence brief for this guest arriving at Rosewood:

${JSON.stringify(
  {
    name: guest.name,
    room: guest.room,
    vip_tier: guest.vip_tier,
    past_stays: guest.past_stays,
    preferences: guest.preferences,
    learnedPreferences: guest.learnedPreferences,
    notes: guest.notes,
    booking_dates: guest.booking_dates,
    linkedInSummary: guest.linkedInSummary,
    recentNews: guest.recentNews,
    interests: guest.interests,
    dietaryRestrictions: guest.dietaryRestrictions,
    preferredLanguage: guest.preferredLanguage,
    lifetimeValue: guest.lifetimeValue,
  },
  null,
  2,
)}

Use ALL available profile signals. Make the personalizedExperiences creative and specific to this guest's known interests. The welcomeNote should read like it was written by a thoughtful GM who knows the guest personally. Call create_guest_brief now.`,
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
