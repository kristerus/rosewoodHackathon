import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { extractAndIngest } from '@/lib/guest-agent';

export const runtime = 'nodejs';

interface IngestRequest {
  guest_id: string;
  guest_name: string;
  text: string;
  source: string;
  source_ref?: string;
  property_id?: string;
}

export async function POST(req: Request) {
  let body: IngestRequest;
  try {
    body = (await req.json()) as IngestRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { guest_id, guest_name, text, source, source_ref, property_id } = body;
  if (!guest_id || !guest_name || !text) {
    return NextResponse.json(
      { error: 'guest_id, guest_name, and text are required' },
      { status: 400 },
    );
  }

  let supabase = null;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    // use in-memory
  }

  await extractAndIngest({ guest_id, guest_name, text, source, source_ref, property_id, supabase });

  return NextResponse.json({ ok: true });
}
