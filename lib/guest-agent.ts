// Per-guest AI agent knowledge store.
//
// Architecture: each guest has a dedicated "agent" that accumulates facts
// learned from wearable badge transcripts, emails, and manual input.
// Persistence: Supabase (when configured) or in-process memory (demo fallback).
// The in-memory store is pre-seeded with demo facts for the 4 seed guests.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';

export interface KnowledgeFact {
  id: string;
  created_at: string;
  guest_id: string;
  guest_name: string;
  fact: string;
  source: string;        // 'transcript' | 'email' | 'manual' | 'checkin'
  source_ref: string | null;
  property_id: string;
}

// ---------------------------------------------------------------------------
// In-memory fallback store (persists across HMR via globalThis)
// ---------------------------------------------------------------------------

interface MemStore {
  facts: KnowledgeFact[];
  seeded: boolean;
}

const GLOBAL_KEY = '__rwGuestAgentKnowledge__' as const;
const g = globalThis as unknown as Record<string, MemStore | undefined>;

function getMemStore(): MemStore {
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { facts: [], seeded: false };
  }
  const store = g[GLOBAL_KEY]!;
  if (!store.seeded) {
    store.facts = buildDemoSeed();
    store.seeded = true;
  }
  return store;
}

function buildDemoSeed(): KnowledgeFact[] {
  const now = Date.now();
  const ago = (minutes: number) =>
    new Date(now - minutes * 60_000).toISOString();

  return [
    // ── Mr. David Chen (platinum, room 412) ──────────────────────────────
    {
      id: 'seed-1', created_at: ago(480),
      guest_id: 'guest-chen-david', guest_name: 'Mr. David Chen',
      fact: 'Severe nut allergy — confirmed again on arrival. Alert F&B on every visit.',
      source: 'checkin', source_ref: null, property_id: 'rosewood-sf',
    },
    {
      id: 'seed-2', created_at: ago(240),
      guest_id: 'guest-chen-david', guest_name: 'Mr. David Chen',
      fact: 'Room temperature set to 67°F — this is the 3rd consecutive stay with this preference.',
      source: 'transcript', source_ref: null, property_id: 'rosewood-sf',
    },
    {
      id: 'seed-3', created_at: ago(120),
      guest_id: 'guest-chen-david', guest_name: 'Mr. David Chen',
      fact: 'Takes early-morning video calls before 7am. Requested corridor quiet during that window.',
      source: 'transcript', source_ref: null, property_id: 'rosewood-sf',
    },
    {
      id: 'seed-4', created_at: ago(45),
      guest_id: 'guest-chen-david', guest_name: 'Mr. David Chen',
      fact: 'Sparkling water and 4 extra pillows requested on arrival — both fulfilled.',
      source: 'transcript', source_ref: null, property_id: 'rosewood-sf',
    },

    // ── Ms. Sofia Marchetti (legacy, room 808) ───────────────────────────
    {
      id: 'seed-5', created_at: ago(600),
      guest_id: 'guest-marchetti-sofia', guest_name: 'Ms. Sofia Marchetti',
      fact: 'Prefers peonies or white roses — fresh flowers replaced daily per standing instruction.',
      source: 'checkin', source_ref: null, property_id: 'rosewood-sf',
    },
    {
      id: 'seed-6', created_at: ago(300),
      guest_id: 'guest-marchetti-sofia', guest_name: 'Ms. Sofia Marchetti',
      fact: 'Italian-language newspapers each morning — consistent across all 28 stays.',
      source: 'transcript', source_ref: null, property_id: 'rosewood-sf',
    },
    {
      id: 'seed-7', created_at: ago(90),
      guest_id: 'guest-marchetti-sofia', guest_name: 'Ms. Sofia Marchetti',
      fact: 'Espresso service requested before 7am. Knows GM personally — GM notified of arrival.',
      source: 'transcript', source_ref: null, property_id: 'rosewood-sf',
    },

    // ── Dr. Raj Patel (gold, room 215) ───────────────────────────────────
    {
      id: 'seed-8', created_at: ago(360),
      guest_id: 'guest-patel-raj', guest_name: 'Dr. Raj Patel',
      fact: 'Requires certified Kosher meals — coordinate with F&B kitchen for every meal.',
      source: 'checkin', source_ref: null, property_id: 'rosewood-sf',
    },
    {
      id: 'seed-9', created_at: ago(180),
      guest_id: 'guest-patel-raj', guest_name: 'Dr. Raj Patel',
      fact: 'Requested quiet room away from elevators. First stay — note this for future bookings.',
      source: 'transcript', source_ref: null, property_id: 'rosewood-sf',
    },

    // ── Mrs. Eleanor Whitfield (legacy, room 1102) ───────────────────────
    {
      id: 'seed-10', created_at: ago(720),
      guest_id: 'guest-whitfield-eleanor', guest_name: 'Mrs. Eleanor Whitfield',
      fact: 'Afternoon tea at 4:00pm sharp — Earl Grey, milk on side, two scones with clotted cream.',
      source: 'checkin', source_ref: null, property_id: 'rosewood-sf',
    },
    {
      id: 'seed-11', created_at: ago(500),
      guest_id: 'guest-whitfield-eleanor', guest_name: 'Mrs. Eleanor Whitfield',
      fact: 'Housekeeping only between 10am–noon. 43rd stay — strict scheduling preferences.',
      source: 'transcript', source_ref: null, property_id: 'rosewood-sf',
    },
    {
      id: 'seed-12', created_at: ago(60),
      guest_id: 'guest-whitfield-eleanor', guest_name: 'Mrs. Eleanor Whitfield',
      fact: 'Always addressed formally as Mrs. Whitfield. Mobility-aware staff escort from lobby appreciated.',
      source: 'transcript', source_ref: null, property_id: 'rosewood-sf',
    },
  ];
}

// ---------------------------------------------------------------------------
// Public read/write helpers
// ---------------------------------------------------------------------------

function memGet(guest_id: string): KnowledgeFact[] {
  return getMemStore()
    .facts.filter((f) => f.guest_id === guest_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function memAdd(rows: Omit<KnowledgeFact, 'id' | 'created_at'>[]): void {
  const store = getMemStore();
  const now = new Date().toISOString();
  for (const row of rows) {
    store.facts.push({
      ...row,
      id: `mem-${Math.random().toString(36).slice(2)}`,
      created_at: now,
    });
  }
}

/** Retrieve all accumulated knowledge for a guest. */
export async function getKnowledge(
  guest_id: string,
  supabase: SupabaseClient | null,
): Promise<KnowledgeFact[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('guest_knowledge')
        .select('*')
        .eq('guest_id', guest_id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error && data) return data as KnowledgeFact[];
    } catch {
      // fall through to in-memory
    }
  }
  return memGet(guest_id);
}

// ---------------------------------------------------------------------------
// Fact extraction + ingestion (uses Claude to extract atomic facts)
// ---------------------------------------------------------------------------

const EXTRACT_TOOL = {
  name: 'extract_guest_facts',
  description:
    'Extract atomic, concrete facts about a specific hotel guest from the given text. Each fact must be a complete standalone sentence.',
  input_schema: {
    type: 'object' as const,
    properties: {
      facts: {
        type: 'array',
        items: { type: 'string' },
        description:
          'List of learned facts about this guest. E.g. "Prefers sparkling water over still", ' +
          '"Requested extra pillows for the 2nd time this stay", "Mentioned attending a cardiology conference". ' +
          'Return an empty array if nothing guest-specific is in the text.',
      },
    },
    required: ['facts'],
  },
};

/**
 * Extract facts from `text` about `guest_name` using Claude, then persist
 * them to Supabase (or in-memory fallback).
 *
 * Designed to be fire-and-forget — callers should not await this in the
 * critical response path. It will never throw; all errors are logged.
 */
export async function extractAndIngest(params: {
  guest_id: string;
  guest_name: string;
  text: string;
  source: string;
  source_ref?: string;
  property_id?: string;
  supabase: SupabaseClient | null;
}): Promise<void> {
  const { guest_id, guest_name, text, source, source_ref, property_id, supabase } = params;
  try {
    const client = getAnthropic();
    const resp = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_guest_facts' },
      messages: [
        {
          role: 'user',
          content:
            `Extract concrete facts about hotel guest "${guest_name}" from this ${source}:\n\n` +
            `"""\n${text}\n"""\n\n` +
            `Only include facts directly about this specific guest. Call extract_guest_facts now.`,
        },
      ],
    });

    const toolUse = resp.content.find((c) => c.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') return;

    const { facts } = toolUse.input as { facts: string[] };
    if (!facts?.length) return;

    const rows = facts.map((fact) => ({
      guest_id,
      guest_name,
      fact,
      source,
      source_ref: source_ref ?? null,
      property_id: property_id ?? 'rosewood-sf',
    }));

    if (supabase) {
      try {
        await supabase.from('guest_knowledge').insert(rows);
        return;
      } catch {
        // fall through to in-memory
      }
    }
    memAdd(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[guest-agent] extractAndIngest failed:', err);
  }
}
