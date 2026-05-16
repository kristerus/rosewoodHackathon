import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * One-shot admin endpoint: re-deduplicates the raw_transcript on every
 * existing ticket. Runs the same dedup logic used by the badge page on
 * new recordings, but applied to existing rows.
 *
 * Trigger with:  curl -X POST https://hotel.eliaspfeffer.de/api/admin/clean-transcripts
 */
export async function POST() {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase admin not configured" },
      { status: 500 },
    );
  }

  const { data: rows, error } = await sb
    .from("tickets")
    .select("id, raw_transcript");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  let unchanged = 0;
  const sample: { id: string; before: string; after: string }[] = [];

  for (const row of rows ?? []) {
    const before: string = row.raw_transcript ?? "";
    const after = dedupeTranscript(before);
    if (after && after !== before) {
      const { error: upErr } = await sb
        .from("tickets")
        .update({ raw_transcript: after })
        .eq("id", row.id);
      if (upErr) continue;
      updated++;
      if (sample.length < 5) sample.push({ id: row.id, before, after });
    } else {
      unchanged++;
    }
  }

  return NextResponse.json({
    scanned: rows?.length ?? 0,
    updated,
    unchanged,
    sample,
  });
}

/**
 * Walks a transcript token-stream from left to right and collapses
 * cumulative-prefix repetition while preserving genuinely new tail words.
 *
 * Handles patterns like:
 *   "Mr Mr Chen Mr Chen Mr Chen needs Mr Chen needs towels in his room tonight"
 * → "Mr Chen needs towels in his room tonight"
 *
 * Strategy: split on whitespace; for each new word, if appending it to the
 * accumulated tokens would produce a string that already appears as a prefix
 * of the original (suggesting cumulative-rebuild noise), skip / replace.
 *
 * In practice the cleanest heuristic that handles the observed Android-Chrome
 * pattern is: detect repeated phrase prefixes by sliding the longest-common
 * prefix. We use a simpler greedy approach: repeatedly find the longest
 * left-prefix that is repeated immediately after itself, drop the first
 * occurrence, until stable.
 */
export function dedupeTranscript(input: string): string {
  if (!input) return input;
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  let s = normalize(input);
  if (!s) return s;

  // Pattern observed: Web Speech on Android emits cumulative-growing final
  // results, so the transcript looks like:
  //   "Mr Mr Chen Mr Chen Mr Chen needs Mr Chen needs towels ... Mr Chen needs towels in its room tonight"
  // The TRUE sentence is the FINAL cumulative growth — i.e. everything from
  // the LAST occurrence of the very first words onward.
  //
  // Algorithm: for prefix lengths 3 → 1, find the LAST occurrence of that
  // opening phrase. If it appears later than at index 0, take the substring
  // from that point. The longest prefix that repeats wins.
  const words = s.split(" ");
  if (words.length >= 4) {
    const sLower = s.toLowerCase();
    for (let plen = Math.min(3, words.length - 1); plen >= 1; plen--) {
      const phrase = words.slice(0, plen).join(" ").toLowerCase();
      let lastIdx = 0;
      let from = 1;
      while (true) {
        const idx = sLower.indexOf(phrase, from);
        if (idx === -1) break;
        // Must be at a word boundary.
        if (idx === 0 || sLower[idx - 1] === " ") {
          // And the match must end at a word boundary too.
          const endChar = sLower[idx + phrase.length];
          if (endChar === undefined || endChar === " ") {
            lastIdx = idx;
          }
        }
        from = idx + 1;
      }
      if (lastIdx > 0) {
        s = s.slice(lastIdx);
        break;
      }
    }
  }

  // Polish pass: remove any remaining adjacent duplicate word.
  const finalWords: string[] = [];
  for (const w of s.split(" ")) {
    const last = finalWords[finalWords.length - 1];
    if (last && last.toLowerCase() === w.toLowerCase()) continue;
    finalWords.push(w);
  }

  return normalize(finalWords.join(" "));
}
