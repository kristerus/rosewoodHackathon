# What Got Done

Hackathon build log — RoseWood Concierge AI, RoseWood × hackathon, 2026-05-16.

## The Pitch
Voice-activated staff badge that turns "Mr. Chen in 412 wants a sushi reco for 8pm" into a routed ticket, an auto-reply to the guest, an internal task for the right department, and a logged interaction on the guest's profile — in one breath.

## What's Working
- **Voice capture** — Web Speech API in browser, tap-to-toggle on a RW-logo badge button, live interim transcript.
- **Intent extraction** — Claude Sonnet 4.6 via forced tool-use returns a structured `Ticket` (department, urgency, guest_facing_message, internal_notes, action_required).
- **4-panel control room** — Badge / Glowing.io Guest Messages / Glowing.io Staff Tasks / Opera Golden Profile, all on one screen, all updating live from a Zustand store.
- **Guest brief on demand** — second Claude call generates LinkedIn-style guest research (professional bio, recent news, conversation starters, inferred preferences).
- **Auto-focus** — when a ticket mentions a room number, the Opera panel automatically swings to that guest's dossier.
- **Demo fallback** — 3 pre-scripted sample transcripts with typewriter animation in case the mic flakes in the noisy hackathon room.
- **Vibration confirm** — `navigator.vibrate(180)` when a ticket lands (works on phones).

## Architecture (single Next.js app)
```
┌────────────────────────────────────────────────────────┐
│  Browser (Chrome — laptop or phone via LAN)            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  RoseWood Concierge AI — control room            │  │
│  │  ┌──────────┬──────────┐                         │  │
│  │  │ Badge    │ Glowing  │ ← Web Speech API        │  │
│  │  │ (mic)    │ guest    │   transcript            │  │
│  │  ├──────────┼──────────┤                         │  │
│  │  │ Glowing  │ Opera    │ ← Zustand store         │  │
│  │  │ tasks    │ profile  │   fans out tickets      │  │
│  │  └──────────┴──────────┘                         │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────┬─────────────────────────────────────┘
                   │ POST /api/extract { transcript, guests }
                   │ POST /api/guest-brief { guest_id, guests }
                   ▼
┌────────────────────────────────────────────────────────┐
│  Next.js Route Handlers (Node runtime)                 │
│  → Anthropic SDK · claude-sonnet-4-6                   │
│  → tool_choice: forced structured output               │
└────────────────────────────────────────────────────────┘
```

## Tech Choices
- **Next.js 16 + App Router + TypeScript + Tailwind v4** — fastest path to a polished single-page app.
- **Zustand** — minimal state, no Redux ceremony.
- **Web Speech API** (browser-native) — zero auth, zero latency, free. Demo runs on Chrome.
- **Anthropic SDK + forced tool-use** — most reliable way to get structured JSON out of an LLM. Schema is enforced, no parse failures.
- **Mocked Glowing.io & Opera PMS** — by design. Real API credentials weren't going to happen in 24h; the UI mocks every integration surface so judges see the full picture. Architecture is real; integrations are stubs that swap to real APIs without changing the data model.

## Repo Layout
```
app/
  api/
    extract/route.ts        # voice → Ticket via Claude
    guest-brief/route.ts    # guest → GuestBrief via Claude
  page.tsx                  # 4-panel control room
  layout.tsx                # fonts + branding
  globals.css               # RoseWood palette
components/
  BadgePanel.tsx            # phone-shaped UI w/ RW toggle
  GuestMessagesPanel.tsx    # Glowing guest chat mock
  StaffTasksPanel.tsx       # Glowing internal tasks mock
  OperaProfilePanel.tsx     # Opera profile + interaction log
  Logo.tsx                  # SVG RW monogram
hooks/
  useWebSpeech.ts           # SpeechRecognition wrapper
lib/
  types.ts                  # shared Ticket / Guest / GuestBrief
  seed.ts                   # 4 demo guests (Chen, Marchetti, Patel, Whitfield)
  anthropic.ts              # SDK singleton
  store.ts                  # Zustand state
```

## Demo Docs
- `DEMO.md` — minute-by-minute 5-min stage script
- `PITCH.md` — judge-facing pitch & RoseWood-specific ask
- `SCENARIOS.md` — 5 fallback voice scenarios with expected ticket output

## What's Mocked (and what'd swap in for real)
| Mock | Real swap |
|---|---|
| In-memory Zustand store | Postgres + Drizzle, or just stick with the existing PMS as source of truth |
| Glowing.io guest pane | Glowing.io REST API — `POST /v1/messages` |
| Glowing.io staff pane | Glowing.io task/conversation threads |
| Opera profile pane | OHIP (Oracle Hospitality Integration Platform) — guest profile + interaction endpoints |
| Made-up guest brief details | Exa.ai / Perplexity API for public-data research |
| Phone PWA = laptop UI | Same PWA, installed on staff phones; eventual ESP32 badge hardware |

## Team
- **Kristian** (kristian@open-analytica.com) — software, AI, integrations
- **Vlad** — hardware concept, badge design, guest intelligence layer

## How to Run It
1. Rotate the Anthropic API key (one leaked during build — already burned).
2. `cp .env.local.example .env.local` and paste a fresh key.
3. `npm install && npm run dev`
4. Open `http://localhost:3000` in Chrome, grant mic permission.
5. Tap the RW badge → speak → tap again → watch the 4 panels light up.
6. If the mic dies in the noisy room, use the 3 fallback buttons in the footer.

## Honest Limits
- Web Speech API needs Chrome/Edge — no Safari.
- No real PMS write-back yet. The interaction log is in-memory; refresh wipes it.
- Guest brief content is plausibly fabricated from the guest name + VIP tier, not from real LinkedIn/news scraping. Acknowledged in the demo script.
- Two-screen demo (phone-as-badge + laptop-as-control-room) would need SSE or WebSockets to sync state; currently it's one-screen.
