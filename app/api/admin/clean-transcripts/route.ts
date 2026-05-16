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

  // Pass 1: collapse "Mr Mr Chen" → "Mr Chen" and "Mr Chen Mr Chen" → "Mr Chen"
  // Keep finding the longest immediate duplicate prefix in the remaining
  // string and drop one copy. Bounded loop to avoid infinite work.
  for (let iter = 0; iter < 50; iter++) {
    let changed = false;
    const words = s.split(" ");
    // Try the longest possible repeated block first.
    outer: for (let len = Math.floor(words.length / 2); len >= 1; len--) {
      for (let start = 0; start + 2 * len <= words.length; start++) {
        const a = words.slice(start, start + len).join(" ");
        const b = words.slice(start + len, start + 2 * len).join(" ");
        if (a === b) {
          // Remove the duplicate block.
          words.splice(start, len);
          s = words.join(" ");
          changed = true;
          break outer;
        }
      }
    }
    if (!changed) break;
  }

  // Pass 2: collapse cumulative growth like "A A B A B C" → "A B C"
  // by walking tokens and removing a token if the running accumulator
  // already ends with the same sequence ending at that position.
  const finalWords: string[] = [];
  const tokens = s.split(" ");
  for (const t of tokens) {
    const last = finalWords[finalWords.length - 1];
    if (last === t) continue; // drop adjacent dup
    finalWords.push(t);
  }
  s = finalWords.join(" ");

  return normalize(s);
}
