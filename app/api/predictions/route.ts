import { NextResponse } from 'next/server';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { publish } from '@/lib/event-bus';
import type { ConfidenceLevel, Department, Guest, Prediction } from '@/lib/types';

export const runtime = 'nodejs';

interface PredictionsRequest {
  guest_id: string;
  guests: Guest[];
}

interface PredictionFields {
  title: string;
  rationale: string;
  suggested_department: Department;
  confidence: ConfidenceLevel;
}

interface PredictionsToolInput {
  predictions: PredictionFields[];
}

const PREDICTIONS_TOOL = {
  name: 'create_predictions',
  description:
    'Produce 3-5 specific, actionable anticipatory predictions of what this guest may need next during their stay. Always call exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      predictions: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description:
                'Concrete predicted need, written as the action staff would take. E.g. "Pre-book 7:30 PM reservation at Sushi Note".',
            },
            rationale: {
              type: 'string',
              description: 'Brief reasoning grounded in the guest profile, interaction log, or research brief.',
            },
            suggested_department: {
              type: 'string',
              enum: ['concierge', 'housekeeping', 'fnb', 'maintenance', 'frontdesk'],
              description: 'Which department would execute this.',
            },
            confidence: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'How confident you are this prediction will materialize.',
            },
          },
          required: ['title', 'rationale', 'suggested_department', 'confidence'],
        },
      },
    },
    required: ['predictions'],
  },
};

const SYSTEM_PROMPT = `You are a luxury hotel concierge anticipating a guest's needs.

Given the guest's profile, past interactions, and (if present) research brief, produce 3-5 SPECIFIC, ACTIONABLE predictions of what they might need next during this stay.

RULES:
- Be concrete. "Pre-book a 7:30 PM table at the rooftop sushi bar" — NOT "guest may want food".
- Ground each prediction in something observable (preferences, profession, recent ticket, time of day, etc.).
- Spread predictions across departments where appropriate.
- Set confidence honestly. Reserve "high" for things strongly implied by the data.
- Call create_predictions EXACTLY ONCE.`;

export async function POST(req: Request) {
  let body: PredictionsRequest;
  try {
    body = (await req.json()) as PredictionsRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { guest_id, guests } = body ?? ({} as PredictionsRequest);
  if (!guest_id || !Array.isArray(guests)) {
    return NextResponse.json({ error: 'Missing required fields: guest_id, guests' }, { status: 400 });
  }

  const guest = guests.find((g) => g.id === guest_id);
  if (!guest) {
    return NextResponse.json({ error: `Guest not found: ${guest_id}` }, { status: 404 });
  }

  const guestContext = {
    name: guest.name,
    room: guest.room,
    vip_tier: guest.vip_tier,
    past_stays: guest.past_stays,
    preferences: guest.preferences,
    notes: guest.notes,
    booking_dates: guest.booking_dates,
    research_brief: guest.research_brief ?? null,
    recent_interactions: guest.interaction_log.slice(-10).map((t) => ({
      timestamp: t.timestamp,
      department: t.department,
      intent: t.intent,
      urgency: t.urgency,
    })),
  };

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [PREDICTIONS_TOOL],
      tool_choice: { type: 'tool', name: 'create_predictions' },
      messages: [
        {
          role: 'user',
          content: `Anticipate what this guest will need next.

GUEST CONTEXT:
${JSON.stringify(guestContext, null, 2)}

Local context: today is ${new Date().toISOString().slice(0, 10)}.

Call create_predictions now.`,
        },
      ],
    });

    const toolUse = response.content.find((c) => c.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ error: 'Model did not return a tool_use block' }, { status: 500 });
    }

    const input = toolUse.input as PredictionsToolInput;
    if (!input || !Array.isArray(input.predictions)) {
      return NextResponse.json({ error: 'Tool input missing predictions array' }, { status: 500 });
    }

    const predictions: Prediction[] = input.predictions.map((p) => ({
      id: crypto.randomUUID(),
      title: p.title,
      rationale: p.rationale,
      suggested_department: p.suggested_department,
      confidence: p.confidence,
    }));

    publish({ type: 'prediction', guest_id, predictions });

    return NextResponse.json({ predictions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
