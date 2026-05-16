import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getKnowledge } from '@/lib/guest-agent';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';

interface AskRequest {
  question: string;
  guest_name?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ guest_id: string }> },
) {
  const { guest_id } = await params;

  let body: AskRequest;
  try {
    body = (await req.json()) as AskRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { question, guest_name } = body;
  if (!question?.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  let supabase = null;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    // use in-memory
  }

  const facts = await getKnowledge(guest_id, supabase);

  if (!facts.length) {
    return NextResponse.json({
      answer:
        'No accumulated knowledge found for this guest yet. Facts build automatically as wearable badge transcripts are processed.',
      facts_count: 0,
    });
  }

  const knowledgeText = facts
    .map((f, i) => {
      const ts = new Date(f.created_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      return `${i + 1}. [${ts} · ${f.source}] ${f.fact}`;
    })
    .join('\n');

  const client = getAnthropic();
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content:
          `You are the dedicated AI agent for hotel guest "${guest_name ?? guest_id}" at Rosewood Hotels.\n\n` +
          `Your accumulated knowledge base for this guest:\n${knowledgeText}\n\n` +
          `Hotel staff question: ${question}\n\n` +
          `Answer concisely and factually, drawing only from the knowledge above. ` +
          `If you lack the specific information, say so briefly.`,
      },
    ],
  });

  const answer =
    response.content.find((c) => c.type === 'text')?.text ??
    'Unable to generate answer.';

  return NextResponse.json({ answer, facts_count: facts.length });
}
