import { NextResponse } from 'next/server';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { publish } from '@/lib/event-bus';
import type { Guest, GuestBrief } from '@/lib/types';

export const runtime = 'nodejs';

interface ResearchRequest {
  guest_id: string;
  guests: Guest[];
}

type BriefFields = Omit<GuestBrief, 'generated_at'>;

const BRIEF_TOOL = {
  name: 'create_guest_brief',
  description:
    'Produce a concise pre-arrival intelligence brief for hotel staff about a specific guest. Always call exactly once AFTER you have gathered information via web_search.',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: '2-3 sentence overview of who the guest is and why they matter.',
      },
      professional: {
        type: 'string',
        description: 'Role, company, and industry context (from search results).',
      },
      recent_news: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 3,
        description: 'Recent news items / activities sourced from the web.',
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
        description: 'Preferences inferred beyond what is in the profile.',
      },
    },
    required: ['summary', 'professional', 'recent_news', 'conversation_starters', 'preferences_inferred'],
  },
};

const SYSTEM_PROMPT = `You are an AI concierge intelligence service for Rosewood Hotels.

You have two tools:
1. web_search — use this FIRST to gather real, current public information about the guest (LinkedIn-style bios, news mentions, conference speaker pages, professional profiles).
2. create_guest_brief — call this EXACTLY ONCE at the end, synthesizing what you found.

GUIDELINES:
- Run 1–3 targeted searches before drafting the brief.
- Ground every claim in something you actually found. If searches return nothing useful, fall back to plausible inference from the name and notes — but prefer real findings.
- NEVER fabricate sensitive personal information (health, family, finances beyond public roles).
- Tone: discreet, professional, useful — like a Forbes-style executive briefing card.`;

// Synthesize a plausible brief without calling the LLM — for the fallback path.
function synthesizeFallbackBrief(guest: Guest): GuestBrief {
  const tier = guest.vip_tier;
  const tierLabel = tier === 'legacy' ? 'a longstanding legacy patron' : tier === 'platinum' ? 'a platinum-tier executive guest' : tier === 'gold' ? 'a frequent gold-tier traveler' : 'a returning guest';
  return {
    summary: `${guest.name} is ${tierLabel} with ${guest.past_stays} prior stays. Profile notes: ${guest.notes}`,
    professional: guest.notes,
    recent_news: [
      'Recent professional activity inferred from profile notes.',
      'Continued engagement in their stated industry per past-stay history.',
    ],
    conversation_starters: [
      `Welcome them back warmly; reference their ${guest.past_stays > 0 ? 'history with the property' : 'first visit'}.`,
      'Ask if their preferred amenities are already in place.',
    ],
    preferences_inferred: guest.preferences.length > 0
      ? guest.preferences.slice(0, 3).map((p) => `Continue honoring: ${p}`)
      : ['Discretion and efficiency on arrival.', 'Minimal interruption during the stay.'],
    generated_at: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  let body: ResearchRequest;
  try {
    body = (await req.json()) as ResearchRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { guest_id, guests } = body ?? ({} as ResearchRequest);
  if (!guest_id || !Array.isArray(guests)) {
    return NextResponse.json({ error: 'Missing required fields: guest_id, guests' }, { status: 400 });
  }

  const guest = guests.find((g) => g.id === guest_id);
  if (!guest) {
    return NextResponse.json({ error: `Guest not found: ${guest_id}` }, { status: 404 });
  }

  const userPrompt = `Research the following hotel guest using public sources (LinkedIn, news, conference speakers, professional bios).

Guest profile (internal — already known to us):
${JSON.stringify(
  {
    name: guest.name,
    room: guest.room,
    vip_tier: guest.vip_tier,
    past_stays: guest.past_stays,
    notes: guest.notes,
    booking_dates: guest.booking_dates,
  },
  null,
  2,
)}

Steps:
1. Use web_search to find current public information about ${guest.name} (1–3 searches).
2. Then call create_guest_brief with a structured brief synthesizing what you learned.`;

  try {
    const client = getAnthropic();

    // Anthropic's hosted web_search server tool. The SDK exposes this as a typed tool.
    const webSearchTool = {
      type: 'web_search_20250305' as const,
      name: 'web_search' as const,
      max_uses: 5,
    };

    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [webSearchTool, BRIEF_TOOL],
      // We force create_guest_brief as the FINAL tool call. Claude can still call
      // web_search beforehand because forced-tool only applies to the user-defined
      // tool — server tools (web_search) execute server-side and don't block the
      // model from invoking them in earlier turns.
      tool_choice: { type: 'tool', name: 'create_guest_brief' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Walk all content blocks (web_search emits multiple blocks: server_tool_use,
    // web_search_tool_result, text, then finally tool_use for create_guest_brief).
    const briefToolUse = response.content.find(
      (c) => c.type === 'tool_use' && c.name === 'create_guest_brief',
    );

    if (!briefToolUse || briefToolUse.type !== 'tool_use') {
      // Web search may have failed (feature flag, region, etc.) — fall back.
      // eslint-disable-next-line no-console
      console.warn('[research] Claude did not return create_guest_brief; falling back to synthesized brief.');
      const fallback = synthesizeFallbackBrief(guest);
      publish({ type: 'brief', guest_id, brief: fallback });
      return NextResponse.json({ brief: fallback, fallback: true });
    }

    const fields = briefToolUse.input as BriefFields;
    const brief: GuestBrief = {
      ...fields,
      generated_at: new Date().toISOString(),
    };

    publish({ type: 'brief', guest_id, brief });
    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Hard failure (network, auth, web_search disabled at the account level) — fall back so the UI still gets something.
    // eslint-disable-next-line no-console
    console.warn('[research] Claude call failed, using fallback brief:', message);
    const fallback = synthesizeFallbackBrief(guest);
    publish({ type: 'brief', guest_id, brief: fallback });
    return NextResponse.json({ brief: fallback, fallback: true, error: message });
  }
}
