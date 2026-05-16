import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';

import { VoiceRecognizer } from './lib/voice';
import { ApiError, postTranscript, type Ticket } from './lib/api';

const COLORS = {
  cream: '#F7F3EC',
  forest: '#1A3A2E',
  forestSoft: '#23503F',
  brass: '#B8945F',
  brassDark: '#8E6F44',
  ink: '#13261E',
  mute: '#6C7A72',
  white: '#FFFFFF',
  danger: '#8B2E2E',
};

const BACKEND_URL_KEY = 'rosewood.backendUrl';
const STAFF_ID = 'staff-kristian-01';
const DEFAULT_BACKEND = 'http://192.168.1.50:3000';

type UiState =
  | { kind: 'idle' }
  | { kind: 'listening' }
  | { kind: 'routing' }
  | { kind: 'routed'; department: string }
  | { kind: 'error'; message: string };

export default function App() {
  const [backendUrl, setBackendUrl] = useState<string>(DEFAULT_BACKEND);
  const [backendUrlDraft, setBackendUrlDraft] = useState<string>(DEFAULT_BACKEND);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [ui, setUi] = useState<UiState>({ kind: 'idle' });

  const recognizerRef = useRef<VoiceRecognizer | null>(null);
  const routedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted backend URL once
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(BACKEND_URL_KEY);
        if (stored) {
          setBackendUrl(stored);
          setBackendUrlDraft(stored);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Build recognizer once
  useEffect(() => {
    const r = new VoiceRecognizer({
      onPartialResults: (text) => setTranscript(text),
      onResults: (text) => setTranscript(text),
      onError: (msg) => {
        setUi({ kind: 'error', message: msg });
      },
    });
    recognizerRef.current = r;
    return () => {
      r.destroy().catch(() => undefined);
    };
  }, []);

  const submitTranscript = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setUi({ kind: 'idle' });
        return;
      }
      setUi({ kind: 'routing' });
      try {
        const { ticket } = await postTranscript(backendUrl, trimmed, STAFF_ID);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
          () => undefined,
        );
        const dept = (ticket as Ticket).department ?? 'unknown';
        setUi({ kind: 'routed', department: dept });
        if (routedTimerRef.current) clearTimeout(routedTimerRef.current);
        routedTimerRef.current = setTimeout(() => {
          setUi({ kind: 'idle' });
          setTranscript('');
        }, 3000);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? `${err.message} (${err.status})`
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        setUi({ kind: 'error', message: msg });
      }
    },
    [backendUrl],
  );

  const handleBadgePress = useCallback(async () => {
    const r = recognizerRef.current;
    if (!r) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );

    if (ui.kind === 'listening') {
      // stop -> submit
      const finalText = await r.stop();
      const text = finalText || transcript;
      await submitTranscript(text);
      return;
    }

    // start
    setTranscript('');
    setUi({ kind: 'listening' });
    try {
      await r.start('en-US');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUi({ kind: 'error', message: msg });
    }
  }, [submitTranscript, transcript, ui.kind]);

  const onSaveSettings = useCallback(async () => {
    const cleaned = backendUrlDraft.trim().replace(/\/+$/, '');
    setBackendUrl(cleaned);
    try {
      await AsyncStorage.setItem(BACKEND_URL_KEY, cleaned);
    } catch {
      // ignore
    }
    setSettingsOpen(false);
  }, [backendUrlDraft]);

  const onSubmitTyped = useCallback(async () => {
    const text = typedText.trim();
    setTypeModalOpen(false);
    setTypedText('');
    if (!text) return;
    setTranscript(text);
    await submitTranscript(text);
  }, [submitTranscript, typedText]);

  const statusText = useMemo(() => {
    switch (ui.kind) {
      case 'idle':
        return 'Tap to speak';
      case 'listening':
        return 'Listening…';
      case 'routing':
        return 'Routing…';
      case 'routed':
        return `Routed: ${ui.department}`;
      case 'error':
        return `Error: ${ui.message}`;
    }
  }, [ui]);

  const isListening = ui.kind === 'listening';
  const isRouting = ui.kind === 'routing';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={isListening ? 'light' : 'dark'} />
      <View
        style={[
          styles.root,
          isListening ? { backgroundColor: COLORS.forest } : null,
        ]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text
            style={[
              styles.brand,
              isListening ? { color: COLORS.cream } : null,
            ]}
          >
            RoseWood
          </Text>
          <TouchableOpacity
            accessibilityLabel="Settings"
            onPress={() => {
              setBackendUrlDraft(backendUrl);
              setSettingsOpen(true);
            }}
            style={styles.gear}
            hitSlop={12}
          >
            <Text
              style={[
                styles.gearGlyph,
                isListening ? { color: COLORS.cream } : null,
              ]}
            >
              {'⚙'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center: badge button */}
        <View style={styles.center}>
          <Pressable
            onPress={handleBadgePress}
            disabled={isRouting}
            style={({ pressed }) => [
              styles.badge,
              isListening ? styles.badgeListening : styles.badgeIdle,
              pressed ? { transform: [{ scale: 0.97 }] } : null,
            ]}
            accessibilityLabel="Voice badge"
            accessibilityRole="button"
          >
            {isRouting ? (
              <ActivityIndicator size="large" color={COLORS.cream} />
            ) : (
              <Text
                style={[
                  styles.rw,
                  isListening ? { color: COLORS.cream } : null,
                ]}
              >
                RW
              </Text>
            )}
          </Pressable>

          <Text
            style={[
              styles.status,
              isListening ? { color: COLORS.cream } : null,
              ui.kind === 'error' ? { color: COLORS.danger } : null,
              ui.kind === 'routed' ? { color: COLORS.brass } : null,
            ]}
          >
            {statusText}
          </Text>

          {transcript.length > 0 ? (
            <View style={styles.transcriptWrap}>
              <Text
                style={[
                  styles.transcript,
                  isListening ? { color: COLORS.cream } : null,
                ]}
              >
                “{transcript}”
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => setTypeModalOpen(true)}
            style={styles.typeLink}
            hitSlop={8}
          >
            <Text
              style={[
                styles.typeLinkText,
                isListening ? { color: COLORS.brass } : null,
              ]}
            >
              Type instead
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              isListening ? { color: COLORS.cream, opacity: 0.7 } : null,
            ]}
          >
            {STAFF_ID}  ·  {backendUrl.replace(/^https?:\/\//, '')}
          </Text>
        </View>
      </View>

      {/* Settings modal */}
      <Modal
        animationType="slide"
        transparent
        visible={settingsOpen}
        onRequestClose={() => setSettingsOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Backend</Text>
            <Text style={styles.sheetLabel}>Server URL</Text>
            <TextInput
              value={backendUrlDraft}
              onChangeText={setBackendUrlDraft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://192.168.1.50:3000"
              placeholderTextColor={COLORS.mute}
              style={styles.input}
            />
            <Text style={styles.sheetHint}>
              Find your laptop's LAN IP with{' '}
              <Text style={styles.code}>ipconfig</Text> (Windows) or{' '}
              <Text style={styles.code}>ifconfig</Text> (macOS). Phone and
              laptop must be on the same Wi-Fi.
            </Text>

            <View style={styles.sheetRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={() => setSettingsOpen(false)}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={onSaveSettings}
              >
                <Text style={styles.btnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Type-instead modal */}
      <Modal
        animationType="slide"
        transparent
        visible={typeModalOpen}
        onRequestClose={() => setTypeModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Type request</Text>
            <Text style={styles.sheetHint}>
              Demo fallback when on-device speech misbehaves.
            </Text>
            <TextInput
              value={typedText}
              onChangeText={setTypedText}
              autoFocus
              multiline
              numberOfLines={3}
              placeholder="Guest in 412 needs extra towels"
              placeholderTextColor={COLORS.mute}
              style={[styles.input, styles.inputMulti]}
            />
            <View style={styles.sheetRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={() => {
                  setTypeModalOpen(false);
                  setTypedText('');
                }}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={onSubmitTyped}
              >
                <Text style={styles.btnPrimaryText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  root: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: COLORS.cream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 18,
    letterSpacing: 4,
    color: COLORS.forest,
    fontWeight: '500',
  },
  gear: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearGlyph: {
    fontSize: 22,
    color: COLORS.forest,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 2,
  },
  badgeIdle: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.brass,
  },
  badgeListening: {
    backgroundColor: COLORS.forestSoft,
    borderColor: COLORS.brass,
  },
  rw: {
    color: COLORS.cream,
    fontSize: 72,
    fontWeight: '300',
    letterSpacing: 2,
    // Cormorant-ish serif fallback chain
    fontFamily: Platform.select({
      ios: 'Cormorant Garamond',
      android: 'serif',
      default: 'serif',
    }),
  },
  status: {
    marginTop: 28,
    fontSize: 18,
    color: COLORS.forest,
    letterSpacing: 0.5,
  },
  transcriptWrap: {
    marginTop: 18,
    paddingHorizontal: 12,
    maxWidth: 320,
  },
  transcript: {
    fontSize: 15,
    color: COLORS.ink,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  typeLink: {
    marginTop: 28,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  typeLinkText: {
    color: COLORS.brassDark,
    fontSize: 13,
    textDecorationLine: 'underline',
    letterSpacing: 0.5,
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.mute,
    fontSize: 11,
    letterSpacing: 0.5,
  },

  // Modal / sheet
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(19, 38, 30, 0.45)',
  },
  sheet: {
    backgroundColor: COLORS.cream,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 3,
    borderTopColor: COLORS.brass,
  },
  sheetTitle: {
    fontSize: 20,
    color: COLORS.forest,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 14,
  },
  sheetLabel: {
    fontSize: 12,
    color: COLORS.mute,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sheetHint: {
    marginTop: 10,
    color: COLORS.mute,
    fontSize: 12,
    lineHeight: 18,
  },
  code: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    color: COLORS.forest,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.brass,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    color: COLORS.ink,
    backgroundColor: COLORS.white,
  },
  inputMulti: {
    minHeight: 90,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  btnPrimary: {
    backgroundColor: COLORS.forest,
  },
  btnPrimaryText: {
    color: COLORS.cream,
    fontWeight: '500',
    letterSpacing: 1,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.forest,
  },
  btnGhostText: {
    color: COLORS.forest,
    fontWeight: '500',
    letterSpacing: 1,
  },
});
