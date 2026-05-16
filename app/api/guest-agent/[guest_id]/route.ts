import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getKnowledge } from '@/lib/guest-agent';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ guest_id: string }> },
) {
  const { guest_id } = await params;

  let supabase = null;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    // no supabase — use in-memory fallback
  }

  const knowledge = await getKnowledge(guest_id, supabase);
  return NextResponse.json({ knowledge, guest_id });
}
