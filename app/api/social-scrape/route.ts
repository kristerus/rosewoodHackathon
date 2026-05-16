import { NextResponse } from 'next/server';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import type { Guest } from '@/lib/types';

export const runtime = 'nodejs';

interface ScrapeRequest {
  guest_id: string;
  guests: Guest[];
  social_handles?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

interface ScrapeResult {
  enriched_guest: Partial<Guest>;
  source: 'apify' | 'demo';
}

// Demo social media posts per guest — simulates what scraping would find
const DEMO_SOCIAL_DATA: Record<string, { posts: string[]; linkedInHeadline?: string }> = {
  'guest-chen-david': {
    linkedInHeadline: 'VP of Product at Horizon Labs | ex-Stripe, ex-Google | Angel Investor | Stanford CS',
    posts: [
      'Twitter/X (@davidchen_tech): "Finally rode the full Marin Headlands loop in under 2:15. Worth every cold brew. ☕🚴"',
      'Twitter/X: "Fascinating thread on transformer architecture efficiency — the gap between compute and insight is narrowing fast. cc @sama"',
      'Twitter/X: "TechCrunch keynote prep done. Excited to talk about responsible AI deployment in enterprise contexts."',
      'Twitter/X: "The Sphere in Vegas last night — Coldplay. Speechless. Best concert of my life, full stop."',
      'Instagram (@d.chen_rides): Morning cold brew before the Headlands loop. 6am sun over the bay.',
      'Instagram: Post of Coldplay at The Sphere — "The Sphere in Vegas. Speechless. Best night of the year."',
      'Instagram: Jazz club in SF — "Miles Davis tribute night at SFJAZZ. This is why I still live here."',
      'LinkedIn: Published article "What we got wrong about AI safety theater" — 4.2k reactions',
      'LinkedIn: Announced Horizon Labs $80M Series C — "grateful to the team"',
    ],
  },
  'guest-marchetti-sofia': {
    linkedInHeadline: 'Senior Buying Director, Rinascente Group | Adjunct Lecturer @Istituto Marangoni | Sustainable Luxury Advocate',
    posts: [
      'Instagram (@sofia.marchetti.style): La Fenice opera house — "Verdi never gets old. La Traviata stasera. 🎭"',
      'Instagram: Palermo food tour — "Wild-caught swordfish, aged ricotta, Tyrrhenian view. Si torna sempre."',
      'Instagram: Vintage Hermès Kelly — "This piece has more history than most museums."',
      'Instagram: Natural wine fair Milan — "Six producers worth tracking. The orange wine renaissance is real."',
      'Instagram: Morning espresso ritual — "Three minutes, moka, balcony. Non si cambia."',
      'LinkedIn: Article "The Future of Luxury Retail Is Circular" — featured in Vogue Italia',
      'LinkedIn: Attending Natural Wine Fair Milano — recap of 6 producers worth watching',
    ],
  },
  'guest-patel-raj': {
    linkedInHeadline: 'Interventional Cardiologist & Associate Professor @JHU | 80+ peer-reviewed publications | Science Communicator',
    posts: [
      'Twitter/X (@dr_raj_patel): "New NEJM paper is live. Years of work distilled into 12 pages. Thank you to the team." [2.1k RTs]',
      'Twitter/X: "Morning meditation before rounds. Non-negotiable. The mind needs stillness before the work begins."',
      'Twitter/X: "Pakistan vs India last night — cricket at its finest. The tension was unbearable in the best way. 🏏"',
      'Twitter/X: "Classical tabla session this evening. Teentaal at 120bpm. The rhythm is medicine."',
      'Instagram (@drrajpatel_runs): Half-marathon finish — "6:45 pace. Not bad for a cardiologist who stands too long."',
      'LinkedIn: TED-Med talk on AI-assisted cardiac diagnostics — 2.1M views',
      'LinkedIn: "Appointed to AHA Scientific Advisory Board — humbled and motivated."',
    ],
  },
  'guest-whitfield-eleanor': {
    linkedInHeadline: 'Retired Chair, Whitfield Foundation | Philanthropist | Honorary Fellow, Royal Academy of Arts',
    posts: [
      'Instagram (@eleanor_whitfield_foundation): Chelsea Flower Show — "The double-height hedges in the Hillier stand are extraordinary. The orchid display alone is worth the trip."',
      'Instagram: Watercolour painting — "An afternoon in the garden, a glass of Earl Grey, a brushful of Prussian blue. 🎨"',
      'Instagram: Choral Evensong at Wells Cathedral — "Tallis in stone and candlelight. Nothing compares."',
      'Instagram: Kitchen garden photo — "The sweet peas are in. All is well."',
      'LinkedIn: Foundation announcement — £5M grant to restore Elizabethan theatre in Bath',
      'BBC Radio 4: Featured in "Postwar British Philanthropy: The Hidden Architects" documentary',
    ],
  },
};

const EXTRACTION_TOOL = {
  name: 'extract_guest_preferences',
  description: 'Extract structured preference data from social media content for a luxury hotel guest. Call exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      interests: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific interests: music genres, named artists/bands, movies/shows, books, sports, hobbies. Be specific ("Coldplay" not "music", "road cycling" not "sports").',
      },
      recentActivity: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 5,
        description: 'Notable recent social activities, each summarized in one line. Start with the platform (e.g. "Instagram: ...").',
      },
      inferred_preferences: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lifestyle preferences inferred from patterns (e.g. "Early riser — active before 7am", "Cold brew coffee before workouts").',
      },
      dietary_signals: {
        type: 'array',
        items: { type: 'string' },
        description: 'Any dietary mentions or food preferences found (leave empty array if none).',
      },
      linkedInSummary: {
        type: 'string',
        description: 'Professional summary from LinkedIn content if available.',
      },
    },
    required: ['interests', 'recentActivity', 'inferred_preferences', 'dietary_signals'],
  },
};

async function apifyRun(
  actorId: string,
  input: object,
  apiKey: string,
  timeoutSecs = 50,
): Promise<unknown[]> {
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

async function scrapeWithApify(
  handles: NonNullable<ScrapeRequest['social_handles']>,
  apiKey: string,
): Promise<{ posts: string[]; profilePhoto?: string }> {
  const posts: string[] = [];
  let profilePhoto: string | undefined;

  await Promise.allSettled([
    handles.twitter
      ? apifyRun(
          'apify/twitter-scraper',
          { startUrls: [{ url: `https://twitter.com/${handles.twitter}` }], maxItems: 15, addUserInfo: true },
          apiKey,
        ).then((items) => {
          for (const item of (items as Array<Record<string, unknown>>).slice(0, 15)) {
            const text = ((item.full_text ?? item.text ?? '') as string).trim();
            if (text) posts.push(`Twitter: ${text.slice(0, 280)}`);
            const author = item.author as Record<string, unknown> | undefined;
            if (!profilePhoto) {
              const pic = (author?.profilePicture ?? item.profileImageUrl ?? item.user_profile_image_url ?? '') as string;
              if (pic) profilePhoto = pic.replace('_normal', '_400x400');
            }
          }
        })
      : Promise.resolve(),

    handles.instagram
      ? apifyRun(
          'apify/instagram-scraper',
          { directUrls: [`https://www.instagram.com/${handles.instagram}/`], resultsType: 'posts', resultsLimit: 15 },
          apiKey,
        ).then((items) => {
          for (const item of (items as Array<Record<string, unknown>>).slice(0, 15)) {
            const caption = ((item.caption ?? '') as string).trim();
            if (caption) posts.push(`Instagram: ${caption.slice(0, 200)}`);
            if (!profilePhoto) {
              const pic = (item.profilePicUrlHD ?? item.profilePicUrl ?? '') as string;
              if (pic) profilePhoto = pic;
            }
          }
        })
      : Promise.resolve(),

    handles.linkedin
      ? apifyRun(
          'apify/linkedin-profile-scraper',
          { startUrls: [{ url: `https://www.linkedin.com/in/${handles.linkedin}/` }], maxItems: 5 },
          apiKey,
        ).then((items) => {
          for (const item of (items as Array<Record<string, unknown>>).slice(0, 5)) {
            const text = ((item.summary ?? item.headline ?? '') as string).trim();
            if (text) posts.push(`LinkedIn: ${text.slice(0, 400)}`);
            if (!profilePhoto) {
              const pic = (item.picture ?? item.profilePicture ?? item.image ?? '') as string;
              if (pic) profilePhoto = pic;
            }
          }
        })
      : Promise.resolve(),
  ]);

  return { posts, profilePhoto };
}

async function extractWithClaude(
  guest: Guest,
  posts: string[],
  linkedInHeadline?: string,
): Promise<Partial<Guest>> {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: 'tool', name: 'extract_guest_preferences' },
    messages: [
      {
        role: 'user',
        content: `Extract structured preference data for luxury hotel guest ${guest.name} from their social media content.

Existing profile interests: ${(guest.interests ?? []).join(', ') || 'none recorded'}

SCRAPED SOCIAL CONTENT:
${posts.join('\n')}${linkedInHeadline ? `\nLinkedIn headline: ${linkedInHeadline}` : ''}

Call extract_guest_preferences now.`,
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool_use block returned');

  const extracted = toolUse.input as {
    interests: string[];
    recentActivity: string[];
    inferred_preferences: string[];
    dietary_signals: string[];
    linkedInSummary?: string;
  };

  return {
    interests: Array.from(new Set([...(guest.interests ?? []), ...extracted.interests])),
    recentNews: extracted.recentActivity,
    linkedInSummary: extracted.linkedInSummary ?? linkedInHeadline ?? guest.linkedInSummary,
    learnedPreferences: Array.from(
      new Set([...(guest.learnedPreferences ?? []), ...extracted.inferred_preferences]),
    ),
    ...(extracted.dietary_signals.length > 0 && {
      dietaryRestrictions: Array.from(
        new Set([...(guest.dietaryRestrictions ?? []), ...extracted.dietary_signals]),
      ),
    }),
  };
}

function demoEnrichWithoutClaude(guest: Guest, fixture: { posts: string[]; linkedInHeadline?: string }): Partial<Guest> {
  // Extract keywords from posts for interests
  const keywordPatterns = [
    /\b(Coldplay|Jazz|Cold brew|cycling|road cycling|triathlon)\b/gi,
    /\b(espresso|opera|cricket|tabla|watercolour|orchid)\b/gi,
    /\b(Hermès|sustainable fashion|natural wine|vintage)\b/gi,
    /\b(meditation|running|half-marathon|marathon)\b/gi,
    /\b(AI ethics|science communication|philosophy)\b/gi,
  ];
  const foundKeywords: string[] = [];
  for (const post of fixture.posts) {
    for (const re of keywordPatterns) {
      const matches = post.match(re);
      if (matches) foundKeywords.push(...matches.map((m) => m.trim()));
    }
  }

  const inferred: string[] = [];
  if (fixture.posts.some((p) => /morning|6am|early|before rounds/i.test(p))) inferred.push('Early riser — active before 7am');
  if (fixture.posts.some((p) => /cold brew|coffee|espresso/i.test(p))) inferred.push('Daily coffee ritual');
  if (fixture.posts.some((p) => /cycling|rides|loop/i.test(p))) inferred.push('Regular cyclist — morning rides');
  if (fixture.posts.some((p) => /meditation|mindful/i.test(p))) inferred.push('Daily meditation practice');
  if (fixture.posts.some((p) => /opera|Verdi|Traviata/i.test(p))) inferred.push('Opera enthusiast');
  if (fixture.posts.some((p) => /natural wine|wine/i.test(p))) inferred.push('Natural wine enthusiast');

  return {
    interests: Array.from(new Set([...(guest.interests ?? []), ...foundKeywords])),
    recentNews: fixture.posts.slice(0, 4).map((p) => p.replace(/^[A-Za-z/X]+\s*\(@[^)]+\):\s*/, '').replace(/^[A-Za-z]+:\s*/, '')),
    linkedInSummary: fixture.linkedInHeadline ?? guest.linkedInSummary,
    learnedPreferences: Array.from(new Set([...(guest.learnedPreferences ?? []), ...inferred])),
  };
}

export async function POST(req: Request) {
  let body: ScrapeRequest;
  try {
    body = (await req.json()) as ScrapeRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { guest_id, guests, social_handles } = body ?? ({} as ScrapeRequest);
  if (!guest_id || !Array.isArray(guests)) {
    return NextResponse.json({ error: 'Missing required fields: guest_id, guests' }, { status: 400 });
  }

  const guest = guests.find((g) => g.id === guest_id);
  if (!guest) {
    return NextResponse.json({ error: `Guest not found: ${guest_id}` }, { status: 404 });
  }

  const apifyKey = process.env.APIFY_API_KEY;
  const hasRealHandles = social_handles && Object.values(social_handles).some(Boolean);

  // Real Apify path
  if (apifyKey && hasRealHandles) {
    try {
      const { posts: rawPosts, profilePhoto } = await scrapeWithApify(social_handles!, apifyKey);
      if (rawPosts.length === 0) {
        return NextResponse.json(
          { error: 'Scraping returned no results — check handles and Apify actor availability' },
          { status: 422 },
        );
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json<ScrapeResult>({
          enriched_guest: { interests: guest.interests ?? [], recentNews: rawPosts.slice(0, 5), learnedPreferences: guest.learnedPreferences, ...(profilePhoto && { profilePhoto }) },
          source: 'apify',
        });
      }

      const enriched = await extractWithClaude(guest, rawPosts);
      return NextResponse.json<ScrapeResult>({ enriched_guest: { ...enriched, ...(profilePhoto && { profilePhoto }) }, source: 'apify' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Demo mode: use fixture data
  const fixture = DEMO_SOCIAL_DATA[guest_id];
  if (!fixture) {
    return NextResponse.json<ScrapeResult>({
      enriched_guest: { interests: guest.interests ?? [], recentNews: guest.recentNews ?? [], learnedPreferences: guest.learnedPreferences },
      source: 'demo',
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json<ScrapeResult>({
      enriched_guest: demoEnrichWithoutClaude(guest, fixture),
      source: 'demo',
    });
  }

  try {
    const enriched = await extractWithClaude(guest, fixture.posts, fixture.linkedInHeadline);
    return NextResponse.json<ScrapeResult>({ enriched_guest: enriched, source: 'demo' });
  } catch {
    return NextResponse.json<ScrapeResult>({
      enriched_guest: demoEnrichWithoutClaude(guest, fixture),
      source: 'demo',
    });
  }
}
