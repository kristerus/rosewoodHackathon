import { NextResponse } from 'next/server';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import type { Guest } from '@/lib/types';

export const runtime = 'nodejs';

// Apify actor IDs (board-specified)
const ACTOR_INSTAGRAM = 'shu8hvrXbJbY3Eb9W';   // apify/instagram-scraper
const ACTOR_LINKEDIN_HARVEST = 'LpVuK3Zozwuipa5bp';  // harvestapi/linkedin-profile-scraper
const ACTOR_GOOGLE_SEARCH = 'apify~google-search-scraper';

interface DiscoverRequest {
  name: string;
  email?: string;
}

const EXTRACT_TOOL = {
  name: 'extract_guest_profile',
  description: 'Extract a structured guest profile from REAL scraped data only. Do NOT invent or infer anything not present in the source material. Call exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      linkedInSummary: {
        type: 'string',
        description: 'Professional summary based only on LinkedIn data found. Empty string if not found.',
      },
      interests: {
        type: 'array',
        items: { type: 'string' },
        description: 'Concrete interests extracted directly from bio, posts, or profile text. Empty array if nothing found.',
      },
      recentNews: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 4,
        description: 'Specific recent activity from the scraped content. Empty array if none found.',
      },
      inferred_preferences: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lifestyle preferences with clear basis in the data (e.g. "Instagram bio mentions trail running"). Empty array if speculative.',
      },
      dietary_signals: {
        type: 'array',
        items: { type: 'string' },
        description: 'Dietary mentions only if explicitly stated in the data. Empty array otherwise.',
      },
      vip_tier: {
        type: 'string',
        enum: ['standard', 'gold', 'platinum', 'legacy'],
        description: 'VIP tier estimate based on seniority/prominence in the scraped data. Default standard if unclear.',
      },
      notes: {
        type: 'string',
        description: 'One-line key fact for hotel staff, grounded in the real data found.',
      },
    },
    required: ['linkedInSummary', 'interests', 'recentNews', 'inferred_preferences', 'dietary_signals', 'vip_tier', 'notes'],
  },
};

async function apifyRun(actorId: string, input: object, apiKey: string, timeoutSecs = 45): Promise<unknown[]> {
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${apiKey}&timeout=${timeoutSecs}&memory=512`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout((timeoutSecs + 10) * 1000),
      },
    );
    if (!res.ok) return [];
    return (await res.json()) as unknown[];
  } catch {
    return [];
  }
}

async function googleSearch(query: string, apiKey: string): Promise<Array<{ url: string; title: string; description: string }>> {
  const items = await apifyRun(ACTOR_GOOGLE_SEARCH, { queries: query, resultsPerPage: 5, maxPagesPerQuery: 1 }, apiKey, 30);
  return (items as Array<{ organicResults?: Array<{ url: string; title: string; description: string }> }>)
    .flatMap((d) => d.organicResults ?? []);
}

async function scrapeLinkedIn(profileUrl: string, apiKey: string): Promise<{ text: string; photo?: string } | null> {
  const items = await apifyRun(ACTOR_LINKEDIN_HARVEST, { profileUrls: [profileUrl] }, apiKey, 45);
  const item = (items as Array<Record<string, unknown>>)[0];
  if (!item) return null;

  const headline = ((item.headline ?? item.about ?? item.occupation ?? '') as string).slice(0, 500);
  const about = headline ? '' : ((item.about ?? '') as string).slice(0, 500);
  const text = [headline, about].filter(Boolean).join(' — ');
  const photo = (item.profilePicture ?? item.profilePhoto ?? item.picture ?? item.image ?? '') as string;

  return { text: text || undefined as unknown as string, photo: photo || undefined };
}

async function scrapeInstagram(input: { directUrls?: string[]; search?: string; searchType?: string }, apiKey: string): Promise<{ bio?: string; photo?: string; username?: string } | null> {
  const actorInput = input.directUrls
    ? { directUrls: input.directUrls, resultsType: 'details', resultsLimit: 1 }
    : { search: input.search, searchType: input.searchType ?? 'user', searchLimit: 5, resultsType: 'details', resultsLimit: 5 };

  const items = await apifyRun(ACTOR_INSTAGRAM, actorInput, apiKey, 45);
  if (items.length === 0) return null;

  // When searching by name, pick the best match
  const candidates = items as Array<Record<string, unknown>>;
  const searchName = (input.search ?? '').toLowerCase();

  const best = candidates.find((c) => {
    const fullName = ((c.fullName ?? c.username ?? '') as string).toLowerCase();
    return searchName && fullName.includes(searchName.split(' ')[0]);
  }) ?? candidates[0];

  if (!best) return null;

  const bio = ((best.biography ?? best.bio ?? '') as string).slice(0, 300);
  const username = (best.username ?? '') as string;
  const photo = (best.profilePicUrlHD ?? best.profilePicUrl ?? '') as string;

  return { bio: bio || undefined, photo: photo || undefined, username: username || undefined };
}

async function fetchPersonalWebsite(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000);
  } catch {
    return null;
  }
}

async function discoverWithApify(
  name: string,
  email: string | undefined,
  apiKey: string,
): Promise<{ posts: string[]; profilePhoto?: string }> {
  const posts: string[] = [];
  let profilePhoto: string | undefined;

  const emailUsername = email ? email.split('@')[0].replace(/[^a-z0-9]/gi, '') : null;

  // Phase 1: parallel searches to find profile URLs
  const [linkedinResults, instagramResults, websiteText] = await Promise.all([
    googleSearch(`"${name}" site:linkedin.com/in`, apiKey),
    googleSearch(`"${name}" site:instagram.com`, apiKey),
    emailUsername ? fetchPersonalWebsite(`https://${emailUsername}.de`) : Promise.resolve(null as string | null),
  ]);

  // Email-based disambiguation for LinkedIn: prefer slug matching email username
  const allLinkedinUrls = linkedinResults.filter((r) => r.url.includes('linkedin.com/in/')).map((r) => r.url);
  let linkedinUrl: string | undefined;
  if (emailUsername && allLinkedinUrls.length > 1) {
    linkedinUrl = allLinkedinUrls.find((u) => u.toLowerCase().includes(emailUsername.toLowerCase())) ?? allLinkedinUrls[0];
  } else {
    linkedinUrl = allLinkedinUrls[0];
  }

  // Find Instagram URL from search results
  const instagramUrl = instagramResults.find((r) => r.url.includes('instagram.com/'))?.url;

  // Phase 2: parallel scraping of found URLs + personal website + Instagram name-search
  const [linkedinProfile, instagramFromUrl, instagramFromSearch] = await Promise.all([
    linkedinUrl ? scrapeLinkedIn(linkedinUrl, apiKey) : Promise.resolve(null),
    instagramUrl ? scrapeInstagram({ directUrls: [instagramUrl] }, apiKey) : Promise.resolve(null),
    // Also search Instagram by name to catch handles not indexed by Google
    scrapeInstagram({ search: name, searchType: 'user' }, apiKey),
  ]);

  // Prefer direct URL scrape over name search for Instagram
  const instagram = instagramFromUrl ?? instagramFromSearch;

  if (linkedinProfile?.text) posts.push(`LinkedIn: ${linkedinProfile.text}`);
  if (!profilePhoto && linkedinProfile?.photo) profilePhoto = linkedinProfile.photo;

  if (instagram?.bio) posts.push(`Instagram (@${instagram.username ?? 'unknown'}): ${instagram.bio}`);
  if (!profilePhoto && instagram?.photo) profilePhoto = instagram.photo;

  if (websiteText) posts.push(`Personal website (${emailUsername}.de): ${websiteText}`);

  // Add snippet context from Google results for Claude's disambiguation
  for (const r of linkedinResults.slice(0, 2)) {
    if (r.description) posts.push(`LinkedIn search snippet: ${r.description.slice(0, 200)}`);
  }

  return { posts, profilePhoto };
}

function buildMinimalGuest(name: string, id: string, today: string, checkOut: string): Guest {
  return {
    id,
    name,
    room: null,
    booking_dates: { check_in: today, check_out: checkOut },
    vip_tier: 'standard',
    preferences: [],
    learnedPreferences: [],
    past_stays: 0,
    notes: 'No public profile found — manual data entry needed.',
    linkedInSummary: undefined,
    recentNews: [],
    interests: [],
    interaction_log: [],
  };
}

export async function POST(req: Request) {
  let body: DiscoverRequest;
  try {
    body = (await req.json()) as DiscoverRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, email } = body ?? {};
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const trimmedName = name.trim();
  const trimmedEmail = email?.trim() || undefined;
  const id = `guest-${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
  const today = new Date().toISOString().slice(0, 10);
  const checkOut = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);

  // Without Apify: return empty shell — no fabricated data
  const apifyKey = process.env.APIFY_API_KEY;
  if (!apifyKey) {
    return NextResponse.json({
      guest: buildMinimalGuest(trimmedName, id, today, checkOut),
      source: 'empty',
    });
  }

  let discoveredPosts: string[] = [];
  let profilePhoto: string | undefined;

  try {
    const result = await discoverWithApify(trimmedName, trimmedEmail, apifyKey);
    discoveredPosts = result.posts;
    profilePhoto = result.profilePhoto;
  } catch {
    // scraping failed entirely
  }

  // No real data found — return minimal shell, don't fabricate
  if (discoveredPosts.length === 0) {
    return NextResponse.json({
      guest: { ...buildMinimalGuest(trimmedName, id, today, checkOut), ...(profilePhoto && { profilePhoto }) },
      source: 'apify_empty',
    });
  }

  // Real data found — use Claude to structure it (extraction only, no invention)
  if (!process.env.ANTHROPIC_API_KEY) {
    // No Claude: return raw posts as recentNews without structuring
    return NextResponse.json({
      guest: {
        ...buildMinimalGuest(trimmedName, id, today, checkOut),
        notes: 'Profile data found — AI structuring unavailable.',
        recentNews: discoveredPosts.slice(0, 4),
        ...(profilePhoto && { profilePhoto }),
      },
      source: 'apify_raw',
    });
  }

  const client = getAnthropic();
  const disambiguationNote = trimmedEmail
    ? `\n\nThe guest's email is "${trimmedEmail}". Use this to confirm you have the right person when multiple people share this name.`
    : '';

  try {
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_guest_profile' },
      messages: [
        {
          role: 'user',
          content: `Extract a structured guest profile for "${trimmedName}" from the REAL scraped data below. Only include information that is directly stated in the source material — do not invent, infer, or add anything not present.${disambiguationNote}

SCRAPED DATA:
${discoveredPosts.join('\n')}

Call extract_guest_profile now.`,
        },
      ],
    });

    const toolUse = response.content.find((c) => c.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') throw new Error('no tool_use');

    const extracted = toolUse.input as {
      linkedInSummary: string;
      interests: string[];
      recentNews: string[];
      inferred_preferences: string[];
      dietary_signals: string[];
      vip_tier: Guest['vip_tier'];
      notes: string;
    };

    const guest: Guest = {
      id,
      name: trimmedName,
      room: null,
      booking_dates: { check_in: today, check_out: checkOut },
      vip_tier: extracted.vip_tier,
      preferences: [],
      learnedPreferences: extracted.inferred_preferences,
      past_stays: 0,
      notes: extracted.notes,
      linkedInSummary: extracted.linkedInSummary || undefined,
      recentNews: extracted.recentNews,
      interests: extracted.interests,
      dietaryRestrictions: extracted.dietary_signals.length > 0 ? extracted.dietary_signals : undefined,
      interaction_log: [],
      ...(profilePhoto && { profilePhoto }),
    };

    return NextResponse.json({ guest, source: 'apify' });
  } catch {
    // Claude failed — return raw scraped data without structuring
    return NextResponse.json({
      guest: {
        ...buildMinimalGuest(trimmedName, id, today, checkOut),
        notes: 'Profile found via social scraping.',
        recentNews: discoveredPosts.slice(0, 4),
        ...(profilePhoto && { profilePhoto }),
      },
      source: 'apify_raw',
    });
  }
}
