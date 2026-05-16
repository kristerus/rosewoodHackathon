import { NextResponse } from 'next/server';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import type { Guest } from '@/lib/types';

export const runtime = 'nodejs';

interface DiscoverRequest {
  name: string;
  email?: string;
}

const DISCOVER_TOOL = {
  name: 'create_guest_profile',
  description: 'Create a structured guest profile for a hotel guest based on their name and any discovered social media data. Call exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      linkedInSummary: {
        type: 'string',
        description: 'Professional summary — role, company, career highlights. Be specific and realistic.',
      },
      interests: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific interests — be concrete (e.g. "Road cycling", "Opera", "Cold brew coffee", not just "sports").',
      },
      recentNews: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 4,
        description: 'Recent activity or news about this person based on their public profile.',
      },
      inferred_preferences: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lifestyle preferences inferred from their profile (e.g. "Early riser", "Espresso before noon").',
      },
      dietary_signals: {
        type: 'array',
        items: { type: 'string' },
        description: 'Any dietary preferences or restrictions if evident (empty if unknown).',
      },
      vip_tier: {
        type: 'string',
        enum: ['standard', 'gold', 'platinum', 'legacy'],
        description: 'Estimated VIP tier based on apparent seniority/prominence.',
      },
      notes: {
        type: 'string',
        description: 'One-line standing note for hotel staff (key fact worth knowing).',
      },
    },
    required: ['linkedInSummary', 'interests', 'recentNews', 'inferred_preferences', 'dietary_signals', 'vip_tier', 'notes'],
  },
};

async function apifyGoogleSearch(query: string, apiKey: string): Promise<Array<{ url: string; title: string; description: string }>> {
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apiKey}&timeout=30&memory=512`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: query, resultsPerPage: 5, maxPagesPerQuery: 1 }),
        signal: AbortSignal.timeout(40_000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json() as Array<{ organicResults?: Array<{ url: string; title: string; description: string }> }>;
    return data.flatMap((d) => d.organicResults ?? []);
  } catch {
    return [];
  }
}

async function apifyLinkedInScrape(url: string, apiKey: string): Promise<{ text: string; photo?: string } | null> {
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail-scraper/run-sync-get-dataset-items?token=${apiKey}&timeout=40&memory=512`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrls: [{ url }], maxItems: 1 }),
        signal: AbortSignal.timeout(50_000),
      },
    );
    if (!res.ok) return null;
    const items = await res.json() as Array<Record<string, unknown>>;
    const item = items[0];
    if (!item) return null;
    const headline = ((item.headline ?? item.summary ?? item.occupation ?? '') as string).slice(0, 400);
    const photo = (item.profilePicture ?? item.picture ?? item.image ?? '') as string;
    return { text: headline, photo: photo || undefined };
  } catch {
    return null;
  }
}

async function fetchPersonalWebsite(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip tags and return first 1000 chars of text
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

  // Derive a candidate personal website from the email username (e.g. john.doe@gmail.com → johndoe.de / johndoe.com)
  const emailUsername = email ? email.split('@')[0].replace(/[^a-z0-9]/gi, '') : null;

  // Run all discovery searches in parallel
  const [
    linkedinResults,
    broadResults,
    instagramResults,
    emailResults,
    websiteText,
  ] = await Promise.all([
    apifyGoogleSearch(`"${name}" site:linkedin.com/in`, apiKey),
    apifyGoogleSearch(`"${name}"${email ? ` "${email}"` : ''}`, apiKey),
    apifyGoogleSearch(`"${name}" site:instagram.com`, apiKey),
    email ? apifyGoogleSearch(`"${name}" "${email}"`, apiKey) : Promise.resolve([] as Array<{ url: string; title: string; description: string }>),
    emailUsername ? fetchPersonalWebsite(`https://${emailUsername}.de`) : Promise.resolve(null as string | null),
  ]);

  // Pick the best LinkedIn URL — prefer one that matches the email username if available
  let linkedinUrl: string | undefined;
  const allLinkedinUrls = [
    ...linkedinResults,
    ...broadResults,
    ...emailResults,
  ]
    .filter((r) => r.url.includes('linkedin.com/in/'))
    .map((r) => r.url);

  if (emailUsername && allLinkedinUrls.length > 1) {
    // Prefer the URL whose slug most closely matches the email username
    linkedinUrl = allLinkedinUrls.find((u) =>
      u.toLowerCase().includes(emailUsername.toLowerCase()),
    ) ?? allLinkedinUrls[0];
  } else {
    linkedinUrl = allLinkedinUrls[0];
  }

  // Scrape the selected LinkedIn profile
  if (linkedinUrl) {
    const profile = await apifyLinkedInScrape(linkedinUrl, apiKey);
    if (profile?.text) posts.push(`LinkedIn profile: ${profile.text}`);
    if (profile?.photo) profilePhoto = profile.photo;
  }

  // Add personal website content
  if (websiteText) {
    posts.push(`Personal website (${emailUsername}.de): ${websiteText}`);
  }

  // Add Instagram snippets
  for (const r of instagramResults.slice(0, 2)) {
    if (r.description) posts.push(`Instagram search result: ${r.description.slice(0, 200)}`);
  }

  // Add top broad search description snippets, filtered by relevance
  const broadSnippets = broadResults
    .filter((r) => !r.url.includes('linkedin.com'))
    .slice(0, 3);
  for (const r of broadSnippets) {
    if (r.description) posts.push(`Web: ${r.description.slice(0, 200)}`);
  }

  return { posts, profilePhoto };
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

  let discoveredPosts: string[] = [];
  let profilePhoto: string | undefined;

  const apifyKey = process.env.APIFY_API_KEY;
  if (apifyKey) {
    try {
      const result = await discoverWithApify(trimmedName, trimmedEmail, apifyKey);
      discoveredPosts = result.posts;
      profilePhoto = result.profilePhoto;
    } catch {
      // fall through to Claude-only path
    }
  }

  const client = getAnthropic();

  const disambiguationNote = trimmedEmail
    ? `\n\nIMPORTANT: The guest's email is "${trimmedEmail}". If multiple people share this name, use the email (and any personal website derived from it) to identify the correct individual. Prioritize profile data that matches or is consistent with this email address.`
    : '';

  const contextSection = discoveredPosts.length > 0
    ? `\n\nDISCOVERED ONLINE CONTENT:\n${discoveredPosts.join('\n')}`
    : '\n\nNo online content was found. Generate a plausible profile based on the name for demo purposes.';

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    tools: [DISCOVER_TOOL],
    tool_choice: { type: 'tool', name: 'create_guest_profile' },
    messages: [
      {
        role: 'user',
        content: `You are building an internal guest profile for a luxury hotel's CRM system. Create a structured profile for a guest named "${trimmedName}".${disambiguationNote}${contextSection}

Generate a realistic, specific profile appropriate for someone who would stay at a 5-star luxury hotel. Call create_guest_profile now.`,
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json({ error: 'Profile generation failed' }, { status: 500 });
  }

  const extracted = toolUse.input as {
    linkedInSummary: string;
    interests: string[];
    recentNews: string[];
    inferred_preferences: string[];
    dietary_signals: string[];
    vip_tier: Guest['vip_tier'];
    notes: string;
  };

  const id = `guest-${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
  const today = new Date().toISOString().slice(0, 10);
  const checkOut = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);

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
    linkedInSummary: extracted.linkedInSummary,
    recentNews: extracted.recentNews,
    interests: extracted.interests,
    dietaryRestrictions: extracted.dietary_signals.length > 0 ? extracted.dietary_signals : undefined,
    interaction_log: [],
    ...(profilePhoto && { profilePhoto }),
  };

  return NextResponse.json({ guest, source: apifyKey ? 'apify' : 'claude_demo' });
}
