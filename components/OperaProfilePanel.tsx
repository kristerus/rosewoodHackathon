"use client";

import React from "react";
import type { Guest, Ticket } from "@/lib/types";

interface OperaProfilePanelProps {
  guest: Guest | null;
  onGenerateBrief: () => void;
  isGeneratingBrief?: boolean;
  onScrapeFromSocial?: () => void;
  isScrapingSocial?: boolean;
  lastScrapeSource?: 'apify' | 'demo' | null;
}

const TIER_META: Record<
  Guest["vip_tier"],
  { label: string; className: string }
> = {
  standard: {
    label: "Standard",
    className: "border-rw-stone-line text-rw-mute bg-white",
  },
  gold: {
    label: "Gold",
    className: "border-rw-brass/40 text-rw-brass bg-rw-brass/5",
  },
  platinum: {
    label: "Platinum",
    className: "border-rw-forest/30 text-rw-forest bg-rw-forest/5",
  },
  legacy: {
    label: "Legacy Patron",
    className:
      "border-rw-brass text-rw-cream-soft bg-gradient-to-br from-rw-brass to-[#8a6b3a]",
  },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function OperaProfilePanel({
  guest,
  onGenerateBrief,
  isGeneratingBrief,
  onScrapeFromSocial,
  isScrapingSocial,
  lastScrapeSource,
}: OperaProfilePanelProps) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-rw-stone-line bg-rw-cream-soft shadow-sm overflow-hidden">
      <header className="flex items-baseline justify-between px-8 pt-7 pb-4">
        <div>
          <div className="eyebrow eyebrow-brass">
            OPERA PMS · GOLDEN PROFILE
          </div>
          <h2 className="mt-1.5 font-serif text-[26px] leading-tight text-rw-forest">
            Guest Dossier
          </h2>
          <p className="mt-1 text-[12px] text-rw-mute">
            Synced from Oracle Opera · enriched by RoseWood AI
          </p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-rw-brass" />
      </header>
      <div className="hairline mx-8" />

      <div className="scroll-rw flex-1 overflow-y-auto px-8 py-6">
        {!guest ? (
          <EmptyState />
        ) : (
          <GuestBody
            guest={guest}
            onGenerateBrief={onGenerateBrief}
            isGeneratingBrief={isGeneratingBrief}
            onScrapeFromSocial={onScrapeFromSocial}
            isScrapingSocial={isScrapingSocial}
            lastScrapeSource={lastScrapeSource}
          />
        )}
      </div>
    </section>
  );
}

function GuestBody({
  guest,
  onGenerateBrief,
  isGeneratingBrief,
  onScrapeFromSocial,
  isScrapingSocial,
  lastScrapeSource,
}: {
  guest: Guest;
  onGenerateBrief: () => void;
  isGeneratingBrief?: boolean;
  onScrapeFromSocial?: () => void;
  isScrapingSocial?: boolean;
  lastScrapeSource?: 'apify' | 'demo' | null;
}) {
  const tier = TIER_META[guest.vip_tier];
  const initials = guest.name
    .replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, "")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-7">
      {/* Identity */}
      <div className="flex items-start gap-5">
        <div className="relative h-16 w-16 shrink-0 rounded-full bg-rw-forest text-rw-cream-soft flex items-center justify-center font-serif text-[22px] tracking-wide">
          {initials}
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-rw-brass border-2 border-rw-cream-soft" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[24px] leading-tight text-rw-forest">
            {guest.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-rw-mute">
            <span>{guest.room ? `Room ${guest.room}` : "Awaiting check-in"}</span>
            <span className="text-rw-stone-line">·</span>
            <span>
              {formatDate(guest.booking_dates.check_in)}—
              {formatDate(guest.booking_dates.check_out)}
            </span>
            <span className="text-rw-stone-line">·</span>
            <span className="tabular-nums">{guest.past_stays} past stays</span>
            {guest.lifetimeValue && (
              <>
                <span className="text-rw-stone-line">·</span>
                <span>LTV {guest.lifetimeValue}</span>
              </>
            )}
          </div>
          {guest.preferredLanguage && (
            <p className="mt-1 text-[11px] text-rw-mute/70 italic">
              Preferred language: {guest.preferredLanguage}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.16em] ${tier.className}`}
        >
          {guest.vip_tier === "legacy" && (
            <span className="text-[10px]" aria-hidden>
              ✦
            </span>
          )}
          {tier.label}
        </span>
      </div>

      {/* Internal note */}
      {guest.notes && (
        <div className="rounded-2xl border border-rw-brass/30 bg-rw-brass/5 px-5 py-4">
          <div className="eyebrow eyebrow-brass mb-1">Standing Note</div>
          <p className="text-[13px] leading-relaxed text-rw-ink italic">
            {guest.notes}
          </p>
        </div>
      )}

      {/* Dietary restrictions */}
      {guest.dietaryRestrictions && guest.dietaryRestrictions.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="eyebrow mb-1 text-red-700">Dietary & Allergy Flags</div>
          <ul className="flex flex-wrap gap-2 mt-2">
            {guest.dietaryRestrictions.map((r) => (
              <li
                key={r}
                className="rounded-full border border-red-200 bg-white px-3 py-1 text-[11.5px] text-red-800 font-medium"
              >
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preferences */}
      <Section title="Recorded Preferences">
        {guest.preferences.length === 0 ? (
          <p className="text-[12px] text-rw-mute">No recorded preferences.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {guest.preferences.map((p) => (
              <li
                key={p}
                className="rounded-full border border-rw-stone-line bg-white px-3 py-1.5 text-[12px] text-rw-ink"
              >
                {p}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Learned preferences (from badge interactions) */}
      {guest.learnedPreferences.length > 0 && (
        <Section
          title="Learned Preferences"
          accessory={
            <span className="text-[10px] uppercase tracking-[0.2em] text-rw-brass">
              From badge interactions
            </span>
          }
        >
          <ul className="flex flex-wrap gap-2">
            {guest.learnedPreferences.map((p) => (
              <li
                key={p}
                className="rounded-full border border-rw-brass/40 bg-rw-brass/5 px-3 py-1.5 text-[12px] text-rw-brass"
              >
                ✦ {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Social Intelligence */}
      <Section
        title="Social Intelligence"
        accessory={
          <div className="flex items-center gap-2">
            {lastScrapeSource && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">
                ✓ {lastScrapeSource === 'apify' ? 'Live scrape' : 'Demo data'}
              </span>
            )}
            {onScrapeFromSocial && (
              <button
                type="button"
                onClick={onScrapeFromSocial}
                disabled={isScrapingSocial}
                className="rounded-full border border-rw-brass/40 bg-rw-brass/10 text-rw-brass px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] hover:bg-rw-brass hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScrapingSocial ? 'Scanning…' : '✦ Scan Social'}
              </button>
            )}
          </div>
        }
      >
        {isScrapingSocial ? (
          <div className="rounded-2xl border border-dashed border-rw-brass/40 bg-rw-brass/5 px-5 py-5 text-center">
            <div className="inline-block h-4 w-4 rounded-full border-2 border-rw-brass border-t-transparent animate-spin mb-2" />
            <p className="text-[12px] text-rw-mute">Scanning social profiles…</p>
          </div>
        ) : guest.interests && guest.interests.length > 0 ? (
          <div className="space-y-3">
            <ul className="flex flex-wrap gap-2">
              {guest.interests.map((interest) => (
                <li
                  key={interest}
                  className="rounded-full border border-rw-forest/20 bg-rw-forest/5 px-3 py-1.5 text-[12px] text-rw-forest"
                >
                  {interest}
                </li>
              ))}
            </ul>
            {guest.recentNews && guest.recentNews.length > 0 && (
              <div className="mt-3">
                <div className="eyebrow mb-1.5">Recent Activity</div>
                <ul className="space-y-1.5">
                  {guest.recentNews.slice(0, 4).map((item, i) => (
                    <li key={i} className="text-[12px] text-rw-ink leading-relaxed flex gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-rw-brass shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-rw-stone-line px-5 py-4">
            <p className="text-[12px] text-rw-mute leading-relaxed">
              No social data yet. Click <span className="text-rw-brass">✦ Scan Social</span> to enrich this profile from the guest&apos;s social media — interests, recent activity, and lifestyle signals will populate here and feed into the AI brief.
            </p>
          </div>
        )}
      </Section>

      {/* Guest Brief */}
      <Section
        title="Guest Intelligence Brief"
        accessory={
          !guest.research_brief ? (
            <button
              type="button"
              onClick={onGenerateBrief}
              disabled={isGeneratingBrief}
              className="rounded-full border border-rw-forest/30 bg-rw-forest text-rw-cream-soft px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] hover:bg-rw-forest-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingBrief ? "Generating…" : "Generate Brief"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onGenerateBrief}
              disabled={isGeneratingBrief}
              className="rounded-full border border-rw-stone-line bg-white text-rw-mute px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:border-rw-brass hover:text-rw-forest transition-colors disabled:opacity-40"
            >
              {isGeneratingBrief ? "Updating…" : "Refresh"}
            </button>
          )
        }
      >
        {isGeneratingBrief && !guest.research_brief ? (
          <div className="rounded-2xl border border-dashed border-rw-brass/40 bg-rw-brass/5 px-5 py-6 text-center">
            <div className="inline-block h-4 w-4 rounded-full border-2 border-rw-brass border-t-transparent animate-spin mb-2" />
            <p className="text-[12px] text-rw-mute">Generating AI brief…</p>
          </div>
        ) : guest.research_brief ? (
          <BriefBlock brief={guest.research_brief} />
        ) : (
          <div className="rounded-2xl border border-dashed border-rw-stone-line px-5 py-4">
            <p className="text-[12px] text-rw-mute leading-relaxed">
              No brief generated yet. The AI will surface a 360° view from
              public sources — role, recent news, personalized experiences, and
              arrival preparation actions.
            </p>
          </div>
        )}
      </Section>

      {/* Interaction log */}
      <Section
        title="Interaction Log"
        accessory={
          <span className="text-[10px] uppercase tracking-[0.2em] text-rw-mute">
            {guest.interaction_log.length} recent
          </span>
        }
      >
        {guest.interaction_log.length === 0 ? (
          <p className="text-[12px] text-rw-mute">
            No interactions recorded for this stay yet.
          </p>
        ) : (
          <ol className="relative space-y-4 pl-5">
            <span className="absolute left-[5px] top-1 bottom-1 w-px bg-rw-stone-line" />
            {guest.interaction_log.map((t) => (
              <InteractionItem key={t.id} ticket={t} />
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function BriefBlock({ brief }: { brief: NonNullable<Guest["research_brief"]> }) {
  return (
    <div className="rounded-2xl border border-rw-stone-line bg-white px-5 py-4 space-y-5">
      <p className="text-[13px] leading-relaxed text-rw-ink">{brief.summary}</p>
      {brief.professional && (
        <p className="text-[12px] text-rw-mute italic">{brief.professional}</p>
      )}
      {brief.recent_news?.length > 0 && (
        <BriefList title="Recent News" items={brief.recent_news} />
      )}

      {/* Personalization section */}
      {brief.personalizedExperiences?.length > 0 && (
        <BriefList title="Personalized Experiences" items={brief.personalizedExperiences} />
      )}

      {/* Welcome actions */}
      {brief.welcomeActions && (
        <div className="rounded-xl border border-rw-forest/20 bg-rw-forest/5 px-4 py-4 space-y-3">
          <div className="eyebrow eyebrow-brass">Room & Arrival Setup</div>
          <WelcomeRow label="Room Setup" value={brief.welcomeActions.roomSetup} />
          <WelcomeRow label="Welcome Drink" value={brief.welcomeActions.preArrivalDrink} />
          <WelcomeRow label="Concierge Alert" value={brief.welcomeActions.conciergeAlert} />
          {brief.welcomeActions.welcomeNote && (
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-rw-mute mb-1">
                Welcome Note
              </div>
              <p className="text-[12px] text-rw-ink italic leading-relaxed border-l-2 border-rw-brass pl-3">
                &ldquo;{brief.welcomeActions.welcomeNote}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {brief.conversation_starters?.length > 0 && (
        <BriefList title="Conversation Starters" items={brief.conversation_starters} />
      )}
      {brief.preferences_inferred?.length > 0 && (
        <BriefList title="Inferred Preferences" items={brief.preferences_inferred} />
      )}

      {/* Risk flags */}
      {brief.riskFlags?.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="eyebrow mb-2 text-red-700">⚠ Do Not</div>
          <ul className="space-y-1">
            {brief.riskFlags.map((flag, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-red-800 leading-relaxed">
                <span className="shrink-0 mt-0.5">•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function WelcomeRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-rw-mute font-medium">
        {label}
      </div>
      <p className="text-[12px] text-rw-ink leading-relaxed mt-0.5">{value}</p>
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li
            key={`${title}-${i}`}
            className="text-[12.5px] text-rw-ink leading-relaxed flex gap-2"
          >
            <span className="mt-1.5 h-1 w-1 rounded-full bg-rw-brass shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InteractionItem({ ticket }: { ticket: Ticket }) {
  return (
    <li className="relative">
      <span className="absolute -left-[18px] top-1.5 h-2 w-2 rounded-full bg-rw-brass ring-4 ring-rw-cream-soft" />
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{ticket.department}</span>
        <span className="text-[10px] text-rw-mute">
          {formatTime(ticket.timestamp)}
        </span>
      </div>
      <p className="mt-0.5 font-serif text-[15px] leading-snug text-rw-forest">
        {ticket.intent}
      </p>
      {ticket.action_required && (
        <p className="mt-0.5 text-[12px] text-rw-mute leading-relaxed">
          {ticket.action_required}
        </p>
      )}
    </li>
  );
}

function Section({
  title,
  accessory,
  children,
}: {
  title: string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="eyebrow">{title}</h4>
        {accessory}
      </div>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center py-16">
      <div className="h-px w-12 bg-rw-brass mb-5" />
      <p className="font-serif text-[20px] text-rw-forest">No guest in focus</p>
      <p className="mt-2 text-[12px] text-rw-mute max-w-[280px] leading-relaxed">
        Select a guest from the demo controls to load their Opera profile and
        interaction history.
      </p>
    </div>
  );
}
