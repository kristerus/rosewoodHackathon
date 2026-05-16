import { NextResponse } from 'next/server';
import {
  clearMetadata,
  getMetadata,
  setMetadata,
  type GuestMetadata,
} from '@/lib/guest-metadata-store';

export const runtime = 'nodejs';

export type { GuestMetadata } from '@/lib/guest-metadata-store';

interface PostBody {
  guest_id: string;
  patch: Partial<GuestMetadata>;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const guest_id = url.searchParams.get('guest_id');
  if (!guest_id) {
    return NextResponse.json(
      { error: 'Missing required query param: guest_id' },
      { status: 400 },
    );
  }
  const metadata = getMetadata(guest_id);
  return NextResponse.json({ metadata });
}

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { guest_id, patch } = body ?? ({} as PostBody);
  if (!guest_id || typeof guest_id !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: guest_id' },
      { status: 400 },
    );
  }
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return NextResponse.json(
      { error: 'Missing or invalid field: patch (must be an object)' },
      { status: 400 },
    );
  }

  try {
    const metadata = setMetadata(guest_id, patch);
    // Note: metadata is returned directly to the caller (the dashboard
    // updates its Zustand store locally). No pub/sub fanout needed.
    return NextResponse.json({ metadata });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const guest_id = url.searchParams.get('guest_id');
  if (!guest_id) {
    return NextResponse.json(
      { error: 'Missing required query param: guest_id' },
      { status: 400 },
    );
  }
  clearMetadata(guest_id);
  return NextResponse.json({ ok: true });
}
