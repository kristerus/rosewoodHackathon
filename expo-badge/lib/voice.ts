import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from '@react-native-voice/voice';

export type VoiceCallbacks = {
  onPartialResults?: (transcript: string) => void;
  onResults?: (transcript: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

/**
 * Wraps @react-native-voice/voice with the same surface shape the web's
 * useWebSpeech hook exposed: start(), stop(), and callbacks for partial /
 * final transcripts and errors.
 *
 * On iOS this uses SFSpeechRecognizer (on-device when available).
 * On Android this uses SpeechRecognizer (Google's on-device engine).
 */
export class VoiceRecognizer {
  private callbacks: VoiceCallbacks;
  private listening = false;
  private lastFinal = '';
  private lastPartial = '';

  constructor(callbacks: VoiceCallbacks = {}) {
    this.callbacks = callbacks;

    Voice.onSpeechStart = () => {
      this.listening = true;
      this.callbacks.onStart?.();
    };

    Voice.onSpeechEnd = () => {
      this.listening = false;
      this.callbacks.onEnd?.();
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      this.listening = false;
      const msg =
        e?.error?.message ?? e?.error?.code ?? 'Unknown speech error';
      this.callbacks.onError?.(String(msg));
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] ?? '';
      if (text) {
        this.lastPartial = text;
        this.callbacks.onPartialResults?.(text);
      }
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] ?? '';
      if (text) {
        this.lastFinal = text;
        this.callbacks.onResults?.(text);
      }
    };
  }

  setCallbacks(callbacks: VoiceCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async start(lang = 'en-US'): Promise<void> {
    this.lastFinal = '';
    this.lastPartial = '';
    try {
      await Voice.start(lang);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.callbacks.onError?.(msg);
      throw err;
    }
  }

  async stop(): Promise<string> {
    try {
      await Voice.stop();
    } catch (err) {
      // swallow — stop() is best-effort
    }
    this.listening = false;
    // Prefer the final result; fall back to the most recent partial.
    return this.lastFinal || this.lastPartial;
  }

  async cancel(): Promise<void> {
    try {
      await Voice.cancel();
    } catch {
      // ignore
    }
    this.listening = false;
  }

  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
    } catch {
      // ignore
    }
    Voice.removeAllListeners();
  }

  isListening(): boolean {
    return this.listening;
  }
}
