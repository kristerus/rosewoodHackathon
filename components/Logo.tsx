import React from "react";

interface LogoProps {
  size?: number;
  variant?: "mark" | "wordmark";
  tone?: "forest" | "brass" | "cream" | "ink";
  className?: string;
}

const TONE_HEX: Record<NonNullable<LogoProps["tone"]>, string> = {
  forest: "#1a3a2e",
  brass: "#b8945f",
  cream: "#f7f3ec",
  ink: "#1c1c1c",
};

/**
 * Editorial "RW" monogram used both inside the badge button
 * and as the small wordmark at the top of the demo page.
 *
 * The mark composes an R and a W with a hairline serif
 * crossbar and a small fleuron — meant to read as a luxury
 * hotel cartouche, not a tech logo.
 */
export default function Logo({
  size = 56,
  variant = "mark",
  tone = "forest",
  className,
}: LogoProps) {
  const color = TONE_HEX[tone];

  if (variant === "wordmark") {
    return (
      <div className={`inline-flex items-center gap-3 ${className ?? ""}`}>
        <Logo size={size} variant="mark" tone={tone} />
        <div className="flex flex-col leading-none">
          <span
            className="font-serif text-[18px] tracking-[0.18em] uppercase"
            style={{ color }}
          >
            RoseWood
          </span>
          <span
            className="eyebrow mt-1"
            style={{ color: "var(--rw-mute)" }}
          >
            Concierge AI
          </span>
        </div>
      </div>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="RoseWood mark"
      className={className}
    >
      {/* Outer cartouche */}
      <circle
        cx="32"
        cy="32"
        r="30"
        fill="none"
        stroke={color}
        strokeWidth="0.6"
        opacity="0.45"
      />
      <circle
        cx="32"
        cy="32"
        r="27"
        fill="none"
        stroke={color}
        strokeWidth="0.4"
        opacity="0.3"
      />
      {/* Top fleuron */}
      <path
        d="M32 8.5 L33.4 11 L32 13.5 L30.6 11 Z"
        fill={color}
        opacity="0.7"
      />
      {/* R W monogram */}
      <g
        fill={color}
        fontFamily="'Cormorant Garamond', 'Playfair Display', Georgia, serif"
        fontWeight={500}
      >
        <text x="13" y="42" fontSize="26" letterSpacing="-0.5">
          R
        </text>
        <text x="33" y="42" fontSize="26" letterSpacing="-0.5">
          W
        </text>
      </g>
      {/* Crossbar */}
      <line
        x1="14"
        y1="50"
        x2="50"
        y2="50"
        stroke={color}
        strokeWidth="0.6"
        opacity="0.5"
      />
      <circle cx="32" cy="50" r="1" fill={color} opacity="0.8" />
    </svg>
  );
}
