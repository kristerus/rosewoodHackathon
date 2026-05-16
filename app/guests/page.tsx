"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import type { Guest } from "@/lib/types";
import Logo from "@/components/Logo";

const TIER_META: Record<Guest["vip_tier"], { label: string; className: string; dot: string }> = {
  standard: { label: "Standard", className: "border-rw-stone-line text-rw-mute bg-white", dot: "bg-rw-mute/40" },
  gold: { label: "Gold", className: "border-rw-brass/40 text-rw-brass bg-rw-brass/5", dot: "bg-rw-brass" },
  platinum: { label: "Platinum", className: "border-rw-forest/30 text-rw-forest bg-rw-forest/5", dot: "bg-rw-forest" },
  legacy: { label: "Legacy Patron", className: "border-rw-brass text-rw-cream-soft bg-gradient-to-br from-rw-brass to-[#8a6b3a]", dot: "bg-rw-brass" },
};

function getInitials(name: string) {
  return name
    .replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, "")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ guest, size }: { guest: Guest; size: number }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = getInitials(guest.name);
  const fontSize = Math.round(size * 0.36);

  if (guest.profilePhoto && !imgErr) {
    return (
      <div
        className="rounded-full overflow-hidden ring-2 ring-rw-cream-soft shadow-sm shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src={guest.profilePhoto}
          alt={guest.name}
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-full bg-rw-forest text-rw-cream-soft flex items-center justify-center font-serif ring-2 ring-rw-cream-soft shadow-sm shrink-0"
      style={{ width: size, height: size, fontSize }}
    >
      {initials}
    </div>
  );
}

export default function GuestsPage() {
  const guests = useAppStore((s) => s.guests);
  const addGuest = useAppStore((s) => s.addGuest);
  const enrichGuest = useAppStore((s) => s.enrichGuest);

  const [selectedId, setSelectedId] = useState<string | null>(guests[0]?.id ?? null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [scrapeStates, setScrapeState] = useState<Record<string, boolean>>({});
  const [scrapeSource, setScrapeSource] = useState<Record<string, string>>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const selected = guests.find((g) => g.id === selectedId) ?? null;

  const handleDiscover = useCallback(async () => {
    const name = nameInput.trim();
    if (!name || isDiscovering) return;

    const existing = guests.find((g) => g.name.toLowerCase().includes(name.toLowerCase()));
    if (existing) {
      setSelectedId(existing.id);
      setNameInput("");
      setEmailInput("");
      return;
    }

    setIsDiscovering(true);
    setDiscoverError(null);
    try {
      const body: { name: string; email?: string } = { name };
      if (emailInput.trim()) body.email = emailInput.trim();
      const res = await fetch("/api/guest-discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { guest: Guest };
      addGuest(data.guest);
      setSelectedId(data.guest.id);
      setNameInput("");
      setEmailInput("");
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsDiscovering(false);
    }
  }, [nameInput, emailInput, guests, addGuest, isDiscovering]);

  const handleScrape = useCallback(
    async (guestId: string) => {
      if (scrapeStates[guestId]) return;
      setScrapeState((s) => ({ ...s, [guestId]: true }));
      try {
        const res = await fetch("/api/social-scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guest_id: guestId, guests }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { enriched_guest: Partial<Guest>; source: string };
        enrichGuest(guestId, data.enriched_guest);
        setScrapeSource((s) => ({ ...s, [guestId]: data.source }));
      } catch (e) {
        console.error("Scrape failed:", e);
      } finally {
        setScrapeState((s) => ({ ...s, [guestId]: false }));
      }
    },
    [guests, enrichGuest, scrapeStates],
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--rw-cream-soft)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-10 pt-8 pb-6">
        <Logo variant="wordmark" size={42} tone="forest" />
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.18em] text-rw-mute hover:text-rw-forest transition-colors"
          >
            ← Staff Console
          </Link>
          <div className="text-right">
            <div
              className="text-[10px] font-sans uppercase tracking-[0.22em]"
              style={{ color: "var(--rw-brass)" }}
            >
              Guest Intelligence
            </div>
            <div className="font-serif text-[15px] leading-tight" style={{ color: "var(--rw-forest)" }}>
              Profile Dashboard
            </div>
          </div>
        </div>
      </header>

      <div style={{ height: 1, background: "var(--rw-stone-line)", margin: "0 40px" }} />

      <main className="flex-1 flex gap-7 px-10 py-8 min-h-0">
        {/* Left sidebar — search + guest list */}
        <div className="w-[300px] shrink-0 flex flex-col gap-4">
          {/* Search / Add */}
          <div
            className="rounded-2xl p-5"
            style={{ border: "1px solid var(--rw-stone-line)", background: "white" }}
          >
            <div
              className="text-[10px] font-sans uppercase tracking-[0.22em] mb-3"
              style={{ color: "var(--rw-brass)" }}
            >
              Find or Add Guest
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleDiscover()}
                placeholder="Guest name…"
                disabled={isDiscovering}
                className="flex-1 rounded-full border px-3.5 py-2 text-[13px] focus:outline-none"
                style={{
                  borderColor: "var(--rw-stone-line)",
                  background: "var(--rw-cream)",
                  color: "var(--rw-ink)",
                }}
              />
              <button
                type="button"
                onClick={() => void handleDiscover()}
                disabled={!nameInput.trim() || isDiscovering}
                className="rounded-full px-4 py-2 text-[11.5px] uppercase tracking-[0.16em] transition-colors disabled:opacity-40"
                style={{ background: "var(--rw-forest)", color: "var(--rw-cream-soft)" }}
              >
                {isDiscovering ? (
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  "Find"
                )}
              </button>
            </div>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleDiscover()}
              placeholder="Email (optional — helps find the right profile)"
              disabled={isDiscovering}
              className="mt-2 w-full rounded-full border px-3.5 py-2 text-[12px] focus:outline-none"
              style={{
                borderColor: "var(--rw-stone-line)",
                background: "var(--rw-cream)",
                color: "var(--rw-ink)",
              }}
            />
            {discoverError && (
              <p className="mt-2 text-[11px]" style={{ color: "#dc2626" }}>
                {discoverError}
              </p>
            )}
            <p className="mt-2 text-[10.5px] leading-relaxed" style={{ color: "var(--rw-mute)" }}>
              Enter a name to search existing guests or discover their social profile. Add an email to disambiguate common names.
            </p>
          </div>

          {/* Guest list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: "thin" }}>
            {guests.map((g) => {
              const tier = TIER_META[g.vip_tier];
              const isSelected = g.id === selectedId;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  className="w-full rounded-2xl p-4 flex items-center gap-3 text-left transition-all"
                  style={{
                    border: isSelected ? "1px solid var(--rw-brass)" : "1px solid var(--rw-stone-line)",
                    background: isSelected ? "rgba(184, 148, 95, 0.06)" : "white",
                  }}
                >
                  <Avatar guest={g} size={44} />
                  <div className="min-w-0 flex-1">
                    <div
                      className="font-serif text-[15px] leading-tight truncate"
                      style={{ color: "var(--rw-forest)" }}
                    >
                      {g.name}
                    </div>
                    <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--rw-mute)" }}>
                      {g.room ? `Room ${g.room}` : "Awaiting check-in"}
                      {g.past_stays > 0 ? ` · ${g.past_stays} stays` : " · New guest"}
                    </div>
                    {(g.interests?.length ?? 0) > 0 && (
                      <div className="text-[10.5px] mt-0.5 truncate" style={{ color: "var(--rw-brass)" }}>
                        {g.interests!.slice(0, 2).join(" · ")}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${tier.className}`}
                  >
                    {tier.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — profile detail */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <ProfileDetail
              guest={selected}
              onScrape={() => void handleScrape(selected.id)}
              isScraping={!!scrapeStates[selected.id]}
              scrapeSource={scrapeSource[selected.id]}
            />
          ) : (
            <EmptyDetail />
          )}
        </div>
      </main>
    </div>
  );
}

function ProfileDetail({
  guest,
  onScrape,
  isScraping,
  scrapeSource,
}: {
  guest: Guest;
  onScrape: () => void;
  isScraping: boolean;
  scrapeSource?: string;
}) {
  const tier = TIER_META[guest.vip_tier];
  const hasInterests = (guest.interests?.length ?? 0) > 0;
  const hasActivity = (guest.recentNews?.length ?? 0) > 0;
  const hasSocial = hasInterests || hasActivity || guest.linkedInSummary;

  return (
    <div
      className="rounded-3xl overflow-hidden flex flex-col h-full"
      style={{ border: "1px solid var(--rw-stone-line)", background: "var(--rw-cream-soft)" }}
    >
      {/* Hero header */}
      <div className="px-8 pt-8 pb-6 flex items-start gap-6">
        <div className="relative">
          <Avatar guest={guest} size={88} />
          <span
            className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2"
            style={{ background: "var(--rw-brass)", borderColor: "var(--rw-cream-soft)" }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-[30px] leading-tight" style={{ color: "var(--rw-forest)" }}>
            {guest.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[12px]" style={{ color: "var(--rw-mute)" }}>
            {guest.room && <span>Room {guest.room}</span>}
            {guest.room && <span style={{ color: "var(--rw-stone-line)" }}>·</span>}
            <span>{guest.past_stays} past stays</span>
            {guest.lifetimeValue && (
              <>
                <span style={{ color: "var(--rw-stone-line)" }}>·</span>
                <span>LTV {guest.lifetimeValue}</span>
              </>
            )}
            {guest.preferredLanguage && (
              <>
                <span style={{ color: "var(--rw-stone-line)" }}>·</span>
                <span>{guest.preferredLanguage}</span>
              </>
            )}
          </div>
          {guest.linkedInSummary && (
            <p className="mt-2 text-[12.5px] leading-relaxed italic" style={{ color: "var(--rw-mute)" }}>
              {guest.linkedInSummary}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onScrape}
              disabled={isScraping}
              className="rounded-full px-5 py-2 text-[11.5px] uppercase tracking-[0.16em] transition-colors disabled:opacity-50"
              style={{
                border: "1px solid rgba(184, 148, 95, 0.4)",
                background: "rgba(184, 148, 95, 0.1)",
                color: "var(--rw-brass)",
              }}
            >
              {isScraping ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Scanning social media…
                </span>
              ) : (
                "✦ Scan Social Media"
              )}
            </button>
            {scrapeSource && (
              <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "#059669" }}>
                ✓ {scrapeSource === "apify" ? "Live scrape" : "Profile generated"}
              </span>
            )}
          </div>
        </div>

        <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.16em] ${tier.className}`}>
          {guest.vip_tier === "legacy" && <span className="text-[10px]">✦</span>}
          {tier.label}
        </span>
      </div>

      <div style={{ height: 1, background: "var(--rw-stone-line)", margin: "0 32px" }} />

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto px-8 py-6"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="grid grid-cols-2 gap-6">
          {/* Social Intelligence — full width */}
          <section className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-[10px] font-sans uppercase tracking-[0.22em]"
                style={{ color: "var(--rw-mute)" }}
              >
                Social Intelligence
              </h3>
              {hasSocial && !isScraping && (
                <button
                  type="button"
                  onClick={onScrape}
                  className="text-[10.5px] uppercase tracking-[0.16em] transition-colors"
                  style={{ color: "var(--rw-brass)" }}
                >
                  Refresh
                </button>
              )}
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ border: "1px solid var(--rw-stone-line)", background: "white" }}
            >
              {isScraping ? (
                <div className="text-center py-10">
                  <div
                    className="inline-block h-6 w-6 rounded-full border-2 border-t-transparent animate-spin mb-3"
                    style={{ borderColor: "var(--rw-brass)" }}
                  />
                  <p className="text-[12px]" style={{ color: "var(--rw-mute)" }}>
                    Scanning LinkedIn, Twitter, Instagram…
                  </p>
                </div>
              ) : hasSocial ? (
                <div className="space-y-5">
                  {/* Profile photo from social if available */}
                  {guest.profilePhoto && (
                    <div className="flex items-center gap-4">
                      <img
                        src={guest.profilePhoto}
                        alt={`${guest.name} social profile`}
                        className="h-20 w-20 rounded-full object-cover"
                        style={{ outline: "2px solid var(--rw-stone-line)" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div>
                        <div
                          className="text-[10px] uppercase tracking-[0.2em] mb-1"
                          style={{ color: "var(--rw-brass)" }}
                        >
                          Social Profile Photo
                        </div>
                        <p className="text-[12px]" style={{ color: "var(--rw-mute)" }}>
                          Pulled from social media
                        </p>
                      </div>
                    </div>
                  )}

                  {hasInterests && (
                    <div>
                      <div
                        className="text-[10px] font-sans uppercase tracking-[0.22em] mb-2"
                        style={{ color: "var(--rw-mute)" }}
                      >
                        Interests & Passions
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {guest.interests!.map((interest) => (
                          <span
                            key={interest}
                            className="rounded-full px-3 py-1.5 text-[12px]"
                            style={{
                              border: "1px solid rgba(26, 58, 46, 0.2)",
                              background: "rgba(26, 58, 46, 0.05)",
                              color: "var(--rw-forest)",
                            }}
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasActivity && (
                    <div>
                      <div
                        className="text-[10px] font-sans uppercase tracking-[0.22em] mb-2"
                        style={{ color: "var(--rw-mute)" }}
                      >
                        Recent Activity
                      </div>
                      <ul className="space-y-2">
                        {guest.recentNews!.slice(0, 5).map((item, i) => (
                          <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed" style={{ color: "var(--rw-ink)" }}>
                            <span
                              className="mt-1.5 h-1 w-1 rounded-full shrink-0"
                              style={{ background: "var(--rw-brass)" }}
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {guest.linkedInSummary && !hasInterests && !hasActivity && (
                    <p className="text-[12.5px] italic leading-relaxed" style={{ color: "var(--rw-mute)" }}>
                      {guest.linkedInSummary}
                    </p>
                  )}
                </div>
              ) : (
                <div
                  className="rounded-xl px-5 py-8 text-center"
                  style={{ border: "1px dashed var(--rw-stone-line)" }}
                >
                  <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--rw-mute)" }}>
                    No social intelligence yet. Click below to scan this guest&apos;s social media — interests, recent activity, and profile photo will appear here.
                  </p>
                  <button
                    type="button"
                    onClick={onScrape}
                    className="rounded-full px-5 py-2 text-[11.5px] uppercase tracking-[0.16em] transition-colors"
                    style={{ background: "var(--rw-brass)", color: "white" }}
                  >
                    ✦ Scan Social Media Now
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Recorded Preferences */}
          <section>
            <SectionHead title="Recorded Preferences" />
            {guest.preferences.length > 0 ? (
              <TagCloud items={guest.preferences} variant="stone" />
            ) : (
              <p className="text-[12px]" style={{ color: "var(--rw-mute)" }}>None recorded.</p>
            )}
          </section>

          {/* Learned Preferences */}
          <section>
            <SectionHead title="Learned Preferences" badge="From badge interactions" />
            {(guest.learnedPreferences?.length ?? 0) > 0 ? (
              <TagCloud items={(guest.learnedPreferences ?? []).map((p) => `✦ ${p}`)} variant="brass" />
            ) : (
              <p className="text-[12px]" style={{ color: "var(--rw-mute)" }}>None yet.</p>
            )}
          </section>

          {/* Dietary */}
          {guest.dietaryRestrictions && guest.dietaryRestrictions.length > 0 && (
            <section className="col-span-2">
              <SectionHead title="Dietary & Allergy Flags" />
              <div className="rounded-2xl p-4" style={{ border: "1px solid #fecaca", background: "#fef2f2" }}>
                <TagCloud items={guest.dietaryRestrictions} variant="red" />
              </div>
            </section>
          )}

          {/* Standing note */}
          {guest.notes && (
            <section className="col-span-2">
              <SectionHead title="Standing Note" />
              <div
                className="rounded-2xl px-5 py-4"
                style={{ border: "1px solid rgba(184, 148, 95, 0.3)", background: "rgba(184, 148, 95, 0.05)" }}
              >
                <p className="text-[13px] leading-relaxed italic" style={{ color: "var(--rw-ink)" }}>
                  {guest.notes}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h4 className="text-[10px] font-sans uppercase tracking-[0.22em]" style={{ color: "var(--rw-mute)" }}>
        {title}
      </h4>
      {badge && (
        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--rw-brass)" }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function TagCloud({ items, variant }: { items: string[]; variant: "stone" | "brass" | "red" }) {
  const styles: Record<string, React.CSSProperties> = {
    stone: { border: "1px solid var(--rw-stone-line)", background: "white", color: "var(--rw-ink)" },
    brass: { border: "1px solid rgba(184, 148, 95, 0.4)", background: "rgba(184, 148, 95, 0.05)", color: "var(--rw-brass)" },
    red: { border: "1px solid #fecaca", background: "white", color: "#991b1b", fontWeight: 500 },
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className="rounded-full px-3 py-1.5 text-[12px]" style={styles[variant]}>
          {item}
        </span>
      ))}
    </div>
  );
}

function EmptyDetail() {
  return (
    <div
      className="rounded-3xl flex h-full items-center justify-center text-center"
      style={{ border: "1px solid var(--rw-stone-line)" }}
    >
      <div>
        <div className="h-px w-12 mx-auto mb-5" style={{ background: "var(--rw-brass)" }} />
        <p className="font-serif text-[20px]" style={{ color: "var(--rw-forest)" }}>
          No guest selected
        </p>
        <p className="mt-2 text-[12px]" style={{ color: "var(--rw-mute)" }}>
          Select a guest from the list or enter a name to discover their profile
        </p>
      </div>
    </div>
  );
}
