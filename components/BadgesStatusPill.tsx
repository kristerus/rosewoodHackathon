"use client";

import { useBadgesStore } from "@/lib/badges-store";

interface BadgesStatusPillProps {
  onOpenPanel: () => void;
}

/**
 * Compact topbar pill: "● 6/8 BADGES" + optional low-battery count.
 * Dot color: green if all online & none low, amber if any low, red if any offline.
 *
 * Selects primitives individually so Zustand can shallow-compare numbers
 * instead of an object reference (which would re-render infinitely).
 */
export default function BadgesStatusPill({ onOpenPanel }: BadgesStatusPillProps) {
  const total = useBadgesStore((s) => s.badges.length);
  const online = useBadgesStore((s) => s.badges.filter((b) => b.online).length);
  const lowBattery = useBadgesStore(
    (s) => s.badges.filter((b) => b.battery_pct < 20).length,
  );
  const offline = total - online;
  const stats = { total, online, offline, lowBattery };

  const dotColor =
    stats.offline > 0
      ? "#dc2626"
      : stats.lowBattery > 0
        ? "var(--ora-amber)"
        : "var(--ora-green)";

  const title = `${stats.online}/${stats.total} badges online · ${stats.lowBattery} low battery · ${stats.offline} offline`;

  return (
    <button
      type="button"
      onClick={onOpenPanel}
      title={title}
      aria-label={title}
      className="ora-mini-btn"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 26,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: dotColor,
          boxShadow: stats.offline > 0 ? "0 0 0 2px rgba(220,38,38,0.15)" : undefined,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        {stats.online}/{stats.total} BADGES
      </span>
      {stats.lowBattery > 0 ? (
        <span
          aria-label={`${stats.lowBattery} low battery`}
          style={{
            position: "absolute",
            top: -5,
            right: -5,
            minWidth: 14,
            height: 14,
            padding: "0 3px",
            borderRadius: 7,
            background: "var(--ora-amber)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1.5px solid #fff",
            lineHeight: 1,
          }}
        >
          {stats.lowBattery}
        </span>
      ) : null}
    </button>
  );
}
