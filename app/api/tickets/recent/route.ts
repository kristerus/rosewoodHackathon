import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Department, Ticket, TicketStatus, Urgency } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TicketRow {
  id: string;
  created_at: string;
  guest_name: string | null;
  room_number: string | null;
  department: Department;
  urgency: Urgency;
  intent: string;
  action_required: string;
  guest_facing_message: string | null;
  internal_notes: string | null;
  raw_transcript: string;
  staff_id: string;
  status: TicketStatus;
  property_id: string;
}

function rowToTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    timestamp: row.created_at,
    guest_name: row.guest_name,
    room_number: row.room_number,
    department: row.department,
    urgency: row.urgency,
    intent: row.intent,
    action_required: row.action_required,
    guest_facing_message: row.guest_facing_message ?? '',
    internal_notes: row.internal_notes ?? '',
    raw_transcript: row.raw_transcript,
    staff_id: row.staff_id,
    status: row.status,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const propertyId = url.searchParams.get('property_id') || 'rosewood-sf';
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 1), 200);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tickets = (data ?? []).map((r) => rowToTicket(r as TicketRow));
    return NextResponse.json({ tickets });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
