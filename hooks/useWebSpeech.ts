"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSpeechOptions {
  onFinalTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onError?: (err: string) => void;
  lang?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function useWebSpeech({
  onFinalTranscript,
  onInterimTranscript,
  onError,
  lang = "en-US",
}: UseWebSpeechOptions = {}) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef<string>("");
  const cbs = useRef({ onFinalTranscript, onInterimTranscript, onError });
  cbs.current = { onFinalTranscript, onInterimTranscript, onError };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event: unknown) => {
      const e = event as {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      };
      let interim = "";
      let final = finalRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) final += text;
        else interim += text;
      }
      finalRef.current = final;
      cbs.current.onInterimTranscript?.((final + interim).trim());
    };

    rec.onerror = (event: unknown) => {
      const err = (event as { error?: string }).error ?? "unknown";
      cbs.current.onError?.(err);
    };

    rec.onend = () => {
      const text = finalRef.current.trim();
      finalRef.current = "";
      if (text) cbs.current.onFinalTranscript?.(text);
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {}
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    finalRef.current = "";
    try {
      rec.start();
    } catch (e) {
      cbs.current.onError?.(String(e));
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
  }, []);

  return { isSupported, start, stop };
}
