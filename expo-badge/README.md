# RoseWood Badge — Expo (React Native)

Phone-side of the hackathon hotel-staff voice badge. Tap the RW circle,
speak a request, tap again. The phone transcribes on-device, POSTs the
transcript to the Next.js backend, and the web dashboard lights up via SSE.

This is a **standalone Expo project**. It lives in `expo-badge/` and does
not import anything from the parent Next.js app — they talk over HTTP only.

---

## Why this is not Expo Go

`@react-native-voice/voice` is a native module (it bridges to
`SFSpeechRecognizer` on iOS and Android's `SpeechRecognizer`). Expo Go
ships a fixed set of native modules and does not include Voice, so you
**must** run a Dev Client build. The README walks you through that.

---

## Prereqs

- **Node 20+** and **npm**
- One of:
  - **macOS + Xcode** (iOS simulator or a physical iPhone with cable)
  - **Android Studio** with an emulator, OR a physical Android phone
    plugged in via USB with USB debugging enabled
- The Next.js backend running on your laptop (`npm run dev` in the parent
  directory — it listens on port 3000 by default)
- Your phone and laptop on the **same Wi-Fi network**

> **Recommendation:** use a physical phone. The Android emulator's
> microphone is unreliable and iOS Simulator can't capture mic at all on
> some macOS versions.

---

## Five commands to get running

From the repo root (`rosewoodhackethon/`):

```bash
cd expo-badge
npm install
npx expo prebuild
npx expo run:ios        # or: npx expo run:android
npx expo start --dev-client
```

The fourth command compiles the native iOS/Android project and installs
the Dev Client on your device/simulator. The fifth starts the Metro
bundler — open the installed RoseWood Badge app and it'll connect.

---

## Finding your laptop's LAN IP

The phone needs to reach the backend over Wi-Fi, so `localhost` will not
work from the phone. Find your laptop's LAN IP:

**Windows (PowerShell or cmd):**

```powershell
ipconfig
```

Look for your wifi adapter (often "Wireless LAN adapter Wi-Fi") and grab
the **IPv4 Address**, e.g. `192.168.1.50`.

**macOS:**

```bash
ipconfig getifaddr en0
```

Then, in the app, tap the gear icon (top-right) and paste:

```
http://192.168.1.50:3000
```

(replace with your actual IP). Hit **Save**. The URL is persisted in
AsyncStorage so you only do this once per device.

---

## Test flow

1. Start the backend in the parent directory (`npm run dev`) and open
   `http://localhost:3000` in your laptop browser — that's the dispatch
   dashboard.
2. On the phone, tap the gear, paste `http://<laptop-ip>:3000`, Save.
3. Tap the big RW circle. Status changes to "Listening…" and the
   transcript appears below as you speak.
4. Say something like *"Guest in 412 needs extra towels."*
5. Tap the circle again. Status → "Routing…" → "Routed: housekeeping"
   (the status sticks for 3 seconds, then resets).
6. Watch the dashboard light up via SSE.

Haptics fire on start, stop, and successful routing.

---

## Fallback: "Type instead"

If on-device speech isn't cooperating (Android emulator mic issues,
denied permission, model not downloaded yet, etc.), tap **Type instead**
below the badge. A sheet opens with a multiline `TextInput`. Type the
request and hit Send — it goes through the same POST endpoint and the
demo flow continues normally. This is your demo-day safety net.

The Settings sheet also remembers the backend URL even if you have to
restart the app mid-demo.

---

## How the speech recognition works

| Platform | Engine                                          | Cost | Offline?           |
|----------|-------------------------------------------------|------|--------------------|
| iOS      | `SFSpeechRecognizer` via `@react-native-voice`  | Free | Yes (iOS 13+)\*    |
| Android  | `SpeechRecognizer` (Google on-device)           | Free | Mostly\*\*         |

\* iOS sets `requiresOnDeviceRecognition = true` where supported. First
launch may need to download a language model — keep the phone on Wi-Fi
for the first run.

\*\* Android's on-device recognition depends on the device's Google app
version. On older devices it falls back to streaming to Google's
servers, which still works on Wi-Fi but isn't strictly offline.

The Web Speech API (used by the web prototype) does **not** exist in
React Native, which is why we use `@react-native-voice/voice` here.

---

## Backend contract

```http
POST {backendUrl}/api/badge-transcript
Content-Type: application/json

{ "transcript": "guest in 412 needs extra towels",
  "staff_id": "staff-kristian-01" }
```

Response (200):

```json
{
  "ticket": {
    "id": "tk_abc123",
    "department": "housekeeping",
    "intent": "deliver_towels",
    "urgency": "normal",
    "guest_name": "...",
    "room_number": "412"
  }
}
```

Errors come back as `{ "error": "message" }` with a 4xx/5xx status.

---

## Known issues

- **Expo Go won't work.** Native module — needs Dev Client. If you see
  *"Cannot find native module 'Voice'"*, you launched in Expo Go.
- **Android emulator mic is flaky.** Use a physical phone or fall back
  to "Type instead".
- **iOS Simulator can't record on some Macs.** Same — use a real phone.
- **First-run permission prompts.** iOS asks for mic + speech
  recognition separately. Grant both.
- **Phone can't reach backend.** Phone and laptop on the same Wi-Fi?
  Windows Firewall not blocking Node? Try `curl http://<laptop-ip>:3000`
  from another laptop on the same network to sanity-check.
- **`npx expo prebuild` deletes the `ios/` and `android/` folders if
  they exist.** That's fine — they're in `.gitignore` and we always
  regenerate from `app.json`.
- **Changing `app.json` requires re-running `prebuild` + `run:ios` /
  `run:android`.** Metro reload alone won't pick up native config
  changes.

---

## File tree

```
expo-badge/
├── App.tsx                # Single screen, badge button, modals
├── README.md              # this file
├── app.json               # Expo config + iOS/Android permissions
├── babel.config.js
├── package.json
├── tsconfig.json          # strict mode
├── .gitignore
└── lib/
    ├── api.ts             # postTranscript() helper
    └── voice.ts           # VoiceRecognizer wrapper class
```

---

## Cloud builds (optional)

If you can't build locally:

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform ios       # or android
```

Install the resulting `.ipa` / `.apk` on your device, then
`npx expo start --dev-client`. (Requires an Expo account and, for iOS, an
Apple Developer account.)
