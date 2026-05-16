"use client";

import { useCallback, useState } from "react";
import type { TavilyImage } from "@/lib/tavily";

export type { TavilyImage };

interface ResearchImagesGridProps {
  images: TavilyImage[];
}

/**
 * Horizontal scrollable strip of ~80×80 thumbnails, Opera flat-corner style.
 * Each thumbnail opens its source_url (or the image itself) in a new tab.
 */
function ResearchImagesGrid({ images }: ResearchImagesGridProps) {
  if (!images || images.length === 0) {
    return (
      <div
        className="text-[11px] text-[var(--ora-muted)] italic px-2 py-3"
        style={{
          border: "1px dashed var(--ora-hairline-2)",
          borderRadius: 2,
          background: "#fff",
        }}
      >
        No public photos found
      </div>
    );
  }

  return (
    <div className="scroll-rw flex gap-2 overflow-x-auto pb-1">
      {images.map((img) => {
        const href = img.source_url ?? img.url;
        return (
          <a
            key={img.url}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={img.description ?? "Source"}
            className="block flex-shrink-0"
            style={{
              width: 80,
              height: 80,
              border: "1px solid var(--ora-hairline-2)",
              borderRadius: 0,
              overflow: "hidden",
              background: "#fafafa",
            }}
          >
            {/* Plain <img> — we don't run these through next/image because
                they are arbitrary remote hosts and we'd need to whitelist
                each domain in next.config. Tradeoff: no optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.description ?? "Guest photo"}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              onError={(e) => {
                // Hide broken images
                (e.currentTarget.parentElement as HTMLElement | null)?.style.setProperty(
                  "display",
                  "none",
                );
              }}
            />
          </a>
        );
      })}
    </div>
  );
}

/* ---------- module-scope cache & hook ---------- */

const imageCache = new Map<string, TavilyImage[]>();

interface UseResearchImagesResult {
  images: TavilyImage[];
  loading: boolean;
  error: string | null;
  fetch: (opts?: { roleHint?: string; maxImages?: number }) => Promise<void>;
}

/**
 * Hook: useResearchImages(guestName?)
 * Returns `{ images, loading, error, fetch }`. Calls `/api/research-images`
 * when `fetch()` is invoked. Caches by guest name in module-scope Map.
 */
function useResearchImages(guestName?: string): UseResearchImagesResult {
  const cached = guestName ? imageCache.get(guestName) ?? [] : [];
  const [images, setImages] = useState<TavilyImage[]>(cached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(
    async (opts?: { roleHint?: string; maxImages?: number }) => {
      if (!guestName || !guestName.trim()) {
        setError("Missing guest name");
        return;
      }

      // Return cached on second call
      const existing = imageCache.get(guestName);
      if (existing && existing.length > 0) {
        setImages(existing);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/research-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: guestName,
            role_hint: opts?.roleHint,
            max_images: opts?.maxImages,
          }),
        });
        const data = (await res.json()) as {
          images?: TavilyImage[];
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          setError(data.error ?? `Request failed (${res.status})`);
          return;
        }
        const next = data.images ?? [];
        imageCache.set(guestName, next);
        setImages(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [guestName],
  );

  return { images, loading, error, fetch: fetchImages };
}

export default ResearchImagesGrid;
export { useResearchImages };
