"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";
export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) {
    // graceful no-op fallback if hook used outside provider
    return { toast: () => undefined };
  }
  return v;
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id =
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)) ?? "x";
      setToasts((curr) => [...curr, { id, message, kind }]);
      setTimeout(() => {
        setToasts((curr) => curr.filter((t) => t.id !== id));
      }, 2500);
    },
    [],
  );

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <ToastStack toasts={toasts} />
    </Ctx.Provider>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}

function ToastItem({ t }: { t: Toast }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLeaving(true), 2100);
    return () => clearTimeout(id);
  }, []);

  const accent =
    t.kind === "success"
      ? { borderColor: "#bbf7d0", color: "#15803D", bg: "#F0FDF4" }
      : t.kind === "error"
        ? { borderColor: "#f6cdc7", color: "#9A2F22", bg: "#FBEDEB" }
        : { borderColor: "#D4D4D8", color: "#312D2A", bg: "#FFFFFF" };

  return (
    <div
      className={`pointer-events-auto rounded-sm border shadow-[0_4px_14px_rgba(0,0,0,0.10)] px-3.5 py-2 text-[12px] font-medium tracking-tight transition-all duration-200 ${
        leaving
          ? "opacity-0 translate-y-1"
          : "opacity-100 translate-y-0"
      }`}
      style={{
        backgroundColor: accent.bg,
        borderColor: accent.borderColor,
        color: accent.color,
        minWidth: 200,
      }}
      role="status"
    >
      {t.message}
    </div>
  );
}
