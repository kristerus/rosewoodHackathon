/**
 * Tavily Search API helper — image search for guest research.
 *
 * Tavily endpoint: POST https://api.tavily.com/search
 * Auth: api_key in the JSON body (not a header).
 */

export interface TavilyImage {
  url: string;
  description: string | null;
  source_url: string | null;
}

interface TavilyRawImage {
  url?: string;
  description?: string | null;
}

interface TavilyRawResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

interface TavilyRawResponse {
  query?: string;
  answer?: string | null;
  images?: Array<string | TavilyRawImage>;
  results?: TavilyRawResult[];
}

export interface SearchImagesResult {
  images: TavilyImage[];
  query: string;
}

const IMAGE_EXT_RE = /\.(jpe?g|png|webp)(\?.*)?$/i;

function isAllowedImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("https://")) return false;
  return IMAGE_EXT_RE.test(url);
}

/**
 * Build the search query for a guest's image hunt.
 * If `roleHint` is provided, we bias the query toward professional headshots
 * tied to that role/company; otherwise just look for the name + "professional".
 */
export function buildImageQuery(name: string, roleHint?: string): string {
  const cleanName = name.trim();
  const hint = (roleHint ?? "").trim();
  if (hint.length > 0) {
    return `${cleanName} ${hint} professional photo OR portrait`;
  }
  return `${cleanName} professional`;
}

/**
 * Call Tavily and return a deduped, filtered list of image URLs along
 * with the query we ran.
 *
 * Throws on network / API errors — caller is responsible for try/catch.
 */
export async function searchImages(
  name: string,
  opts?: { roleHint?: string; maxImages?: number },
): Promise<SearchImagesResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY not set");
  }

  const query = buildImageQuery(name, opts?.roleHint);
  const maxResults = Math.max(1, Math.min(20, opts?.maxImages ?? 5));

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_images: true,
      include_image_descriptions: true,
      max_results: maxResults,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Tavily request failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const data = (await res.json()) as TavilyRawResponse;

  // Tavily image entries can be either bare strings or { url, description }.
  // We also try to attach a best-guess "source_url" from the regular results
  // by index — Tavily doesn't strictly correlate them, but the top result
  // is usually the source page for the top image.
  const rawImages = Array.isArray(data.images) ? data.images : [];
  const results = Array.isArray(data.results) ? data.results : [];

  const seen = new Set<string>();
  const images: TavilyImage[] = [];

  rawImages.forEach((entry, idx) => {
    let url: string;
    let description: string | null = null;
    if (typeof entry === "string") {
      url = entry;
    } else if (entry && typeof entry === "object" && typeof entry.url === "string") {
      url = entry.url;
      description = entry.description ?? null;
    } else {
      return;
    }

    if (!isAllowedImageUrl(url)) return;
    if (seen.has(url)) return;
    seen.add(url);

    const sourceUrl = results[idx]?.url ?? null;
    images.push({
      url,
      description,
      source_url: sourceUrl,
    });
  });

  return { images, query };
}
