import type { GuestBrief, Prediction, Ticket } from './types';

export type AppEvent =
  | { type: 'ticket'; ticket: Ticket }
  | { type: 'transcript'; transcript: string; staff_id: string }
  | { type: 'prediction'; guest_id: string; predictions: Prediction[] }
  | { type: 'brief'; guest_id: string; brief: GuestBrief };

export type Listener = (e: AppEvent) => void;

interface EventBusSingleton {
  listeners: Set<Listener>;
}

// Survive Next.js HMR / multiple module instances in dev by pinning to globalThis.
const globalKey = '__rwEventBus__' as const;
const globalAny = globalThis as unknown as Record<string, EventBusSingleton | undefined>;

function getBus(): EventBusSingleton {
  let bus = globalAny[globalKey];
  if (!bus) {
    bus = { listeners: new Set<Listener>() };
    globalAny[globalKey] = bus;
  }
  return bus;
}

export function subscribe(listener: Listener): () => void {
  const bus = getBus();
  bus.listeners.add(listener);
  return () => {
    bus.listeners.delete(listener);
  };
}

export function publish(e: AppEvent): void {
  const bus = getBus();
  // Snapshot to be safe against mutation during iteration.
  const snapshot = Array.from(bus.listeners);
  for (const listener of snapshot) {
    try {
      listener(e);
    } catch (err) {
      // Never let a single bad subscriber kill the publish loop.
      // eslint-disable-next-line no-console
      console.error('[event-bus] listener threw', err);
    }
  }
}
