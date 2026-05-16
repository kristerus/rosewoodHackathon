import { subscribe, type AppEvent } from '@/lib/event-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream already torn down — flip the flag so we stop trying.
          closed = true;
        }
      };

      // Initial comment to flush headers + tell proxies the stream is alive.
      safeEnqueue(`: connected ${new Date().toISOString()}\n\n`);

      const unsubscribe = subscribe((event: AppEvent) => {
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
      });

      // 25s heartbeat keeps intermediaries from idling the connection out.
      const heartbeat = setInterval(() => {
        safeEnqueue(`:\n\n`);
      }, 25_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed — fine.
        }
      };

      // Client disconnect (browser closed, navigated away, etc.)
      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      // ReadableStream.cancel — best-effort cleanup if we get here without abort.
      // The closure inside start() owns the actual handles; nothing to do here
      // because abort handles the disconnect path.
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
