import { NextResponse } from 'next/server';
import { getFolioForGuest } from '@/lib/folio';

export const runtime = 'nodejs';

export type { Folio, FolioLine } from '@/lib/folio';

interface FolioInput {
  guest_id: string;
  guest_name: string;
  room: string | null;
  booking_dates: { check_in: string; check_out: string };
  vip_tier?: string;
}

function buildFromQuery(url: URL): { ok: true; input: FolioInput } | { ok: false; error: string } {
  const guest_id = url.searchParams.get('guest_id');
  const guest_name = url.searchParams.get('guest_name');
  const room = url.searchParams.get('room');
  const check_in = url.searchParams.get('check_in');
  const check_out = url.searchParams.get('check_out');
  const vip_tier = url.searchParams.get('vip_tier') ?? undefined;

  if (!guest_id || !guest_name || !check_in || !check_out) {
    return {
      ok: false,
      error:
        'Missing required query params: guest_id, guest_name, check_in, check_out (room and vip_tier optional)',
    };
  }
  return {
    ok: true,
    input: {
      guest_id,
      guest_name,
      room: room && room.length > 0 ? room : null,
      booking_dates: { check_in, check_out },
      vip_tier,
    },
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = buildFromQuery(url);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const folio = getFolioForGuest({
      id: parsed.input.guest_id,
      name: parsed.input.guest_name,
      room: parsed.input.room,
      booking_dates: parsed.input.booking_dates,
      vip_tier: parsed.input.vip_tier,
    });
    return NextResponse.json({ folio });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Partial<FolioInput>;
  try {
    body = (await req.json()) as Partial<FolioInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { guest_id, guest_name, room, booking_dates, vip_tier } = body ?? {};
  if (
    !guest_id ||
    !guest_name ||
    !booking_dates ||
    !booking_dates.check_in ||
    !booking_dates.check_out
  ) {
    return NextResponse.json(
      {
        error:
          'Missing required fields: guest_id, guest_name, booking_dates.check_in, booking_dates.check_out',
      },
      { status: 400 },
    );
  }

  try {
    const folio = getFolioForGuest({
      id: guest_id,
      name: guest_name,
      room: room ?? null,
      booking_dates,
      vip_tier,
    });
    return NextResponse.json({ folio });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
