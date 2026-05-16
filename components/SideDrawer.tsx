"use client";

import React, { useEffect } from "react";

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Width in px; default 280 */
  width?: number;
  /** Top offset (px) so drawer slides in below the topbar */
  topOffset?: number;
  ariaLabel?: string;
}

/**
 * Left-slide drawer with click-out backdrop and Esc-to-close.
 * Drawer sits BELOW the topbar (topOffset) so the topbar's hamburger stays visible.
 */
export default function SideDrawer({
  open,
  onClose,
  children,
  width = 280,
  topOffset = 44,
  ariaLabel = "Main menu",
}: SideDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — only covers the area below the topbar so the user can
          still see the hamburger they just clicked. */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: topOffset,
          bottom: 0,
          background: "rgba(31, 29, 27, 0.28)",
          zIndex: 60,
        }}
      />
      <aside
        role="dialog"
        aria-label={ariaLabel}
        className="slide-in"
        style={{
          position: "fixed",
          left: 0,
          top: topOffset,
          bottom: 0,
          width,
          background: "#fff",
          borderRight: "1px solid var(--ora-hairline)",
          boxShadow: "2px 0 14px rgba(0,0,0,0.10)",
          zIndex: 61,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </aside>
    </>
  );
}
