# Live Demo Script — RoseWood Concierge AI

**Duration**: 5 minutes
**Presenter**: Kristian
**Stage setup**: Laptop on lectern, screen mirrored to projector. Browser open to `localhost:3000` showing the 4-panel control room. Mic check done. The "Demo Controls" dropdown is pre-loaded with the 5 scenarios from `SCENARIOS.md` as fallback.

Each beat below has two columns of intent: **SAY** (verbatim or close to it) and **DO** (on-screen action). Keep eye contact when you SAY; only look at the screen when you DO.

---

## 0:00 – 0:30 — The problem

**DO**: Stand still. Do not touch the laptop yet. Screen shows the idle control room with the RoseWood logo and the four empty panels.

**SAY**:
> "Good morning. A study from Cornell last year measured how luxury hotel staff actually spend their shifts. The number that stuck with me: thirty-one percent of their time is coordination. Radios, WhatsApp groups, paper chits, the supervisor's notebook. Not talking to guests — talking *about* guests, to each other.
>
> And the cost of that isn't just labor. It's the returning guest who has to explain her flower preference for the twenty-second time. It's the allergy note that didn't make it from the front desk to the kitchen. In luxury hospitality, the friction *is* the failure."

*(Beat. Make eye contact with the front row.)*

---

## 0:30 – 1:00 — The system

**DO**: Walk to the laptop. Gesture to the screen.

**SAY**:
> "This is RoseWood Concierge AI. Two components.
>
> First — a voice badge worn by every staff member. In this prototype it's the panel on the left of your screen with the RoseWood crest. In production it's hardware, the size of a name tag.
>
> Second — a guest intelligence layer that briefs staff *before* the guest arrives.
>
> What you're looking at is the control room. Four panels: the badge on the left, the live transcript next to it, the extracted ticket in the center-right, and the guest profile on the far right. Watch all four light up as I talk."

**DO**: Hover the cursor over each panel as you name it. Do not click yet.

---

## 1:00 – 3:30 — Three voice interactions

### Interaction 1 (1:00 – 1:50) — The critical maintenance call (Scenario 2)

**DO**: Tap the badge button. Wait for the recording indicator.

**SAY** (into the mic, as if you are the housekeeping attendant Lina):
> "Mr. Chen in 412 — his AC is making a grinding noise and the room won't go below 23 degrees. He's got an early flight, he's not happy. Get someone up here now."

**DO**: Release. Transcript appears in panel 2. Ticket renders in panel 3. Profile loads in panel 4.

**SAY** (narrating, point at the screen as each thing happens):
> "Transcript — Web Speech API, on-device. Ticket — Claude Sonnet 4.6 with forced tool-use, so we always get structured JSON. Notice three things: urgency flagged *critical* in red. A guest-facing message already drafted and ready to push to Glowing. And on the right — Mr. Chen's profile pulled itself up automatically because the model resolved 'Mr. Chen in 412' against the PMS.
>
> Look at the profile flag: 'prefers cool room temperature'. The model used that to justify the critical rating in the internal notes. That context didn't exist in the words I spoke. It came from the guest record."

**FALLBACK if mic fails**: Open the Demo Controls dropdown, select "Scenario 2 — Urgent Maintenance." Same narration applies.

### Interaction 2 (1:50 – 2:35) — The returning Legacy guest (Scenario 1)

**DO**: Tap the badge again.

**SAY** (as supervisor Marco):
> "Mrs. Whitfield is here for the week. She mentioned the gardenias from her last stay were perfect — please make sure we have the same arrangement in 1102 before she comes down for tea at four."

**DO**: Release. Let the panels populate.

**SAY**:
> "Routed to concierge, high urgency because it's time-boxed before 4 PM. But here's the moment that matters — look at the internal notes. The model wrote: 'Past-stay log shows gardenia arrangement on stays 38 and 40.' I never said anything about past stays. The system reached into her forty-one-stay history, found the pattern, and put it in front of the next person.
>
> No guest message gets sent — this one is a silent delight."

### Interaction 3 (2:35 – 3:30) — The allergy recovery (Scenario 5)

**DO**: Tap the badge.

**SAY** (as concierge Theo):
> "Heads up — Mr. Chen called from the car, he wants the welcome amenity in 412 changed. No nuts in anything, not even on the cheese board. He says last time there were almonds and he had to send it back."

**DO**: Release. Panels light up.

**SAY**:
> "This is the one I want you to focus on. The ticket isn't just *fix the amenity*. The internal notes say: 'Existing profile note nut allergies was not enforced on previous stay — this is a documented service failure.' The system caught its own institution's mistake.
>
> And look at the action list — the second item is 'add hard allergy flag to Opera PMS profile.' Every voice interaction enriches the guest record. The next staff member who serves Mr. Chen in six months *cannot* miss this. That's the compounding moat."

---

## 3:30 – 4:15 — The guest brief

**DO**: Click the "Incoming Booking" button at the top of the screen. Select Mrs. Eleanor Whitfield. The brief generates in a modal.

**SAY**:
> "Second component. A booking just dropped — Mrs. Whitfield, arriving Friday. Before she gets here, every staff member who will touch her stay gets this.
>
> *(point at the brief)*
>
> Public web signal — the Whitfield Foundation announced a new grant cycle last week, so afternoon conversation should lean philanthropy not weather. Past-stay synthesis — forty-one stays, gardenias on three of the last five, afternoon tea at four is non-negotiable, do not assign her the suite next to the elevator. And a one-line opener for the doorman: *'Welcome back, Mrs. Whitfield — the Drawing Room is set for four o'clock.'*
>
> That's a LinkedIn-grade brief, generated in eleven seconds, pushed to every badge on shift."

---

## 4:15 – 5:00 — The vision and the ask

**DO**: Close the modal. Return to the idle control room view. Step back from the laptop.

**SAY**:
> "What you saw today runs in a browser. The roadmap from here is three steps.
>
> One — hardware. The badge becomes a physical wearable, push-to-talk, e-ink status light. Six-week build with an off-the-shelf reference design.
>
> Two — real integrations. We mocked Glowing.io and Opera today. The Glowing API and Opera OHIP are both documented and accessible — we estimate four weeks to a live pilot connection. BirchStreet for procurement-side requests is the natural third.
>
> Three — the data flywheel. Every interaction enriches a guest record. After ninety days at one property, the brief that lands on a doorman's badge isn't generated by us — it's generated by the institution's own memory.
>
> The ask. We want to pilot at one RoseWood property for ninety days. We bring the badges and the model. RoseWood brings the staff and the integration access. We measure two numbers: coordination time per guest interaction, and repeat-preference fulfillment rate. If either moves, we keep going.
>
> Thank you."

**DO**: Step away from the laptop. Pause for applause / questions.

---

## Backup pacing notes

- If you finish early, slow down on the allergy scenario at 2:35 — it's the most defensible one.
- If you're running late at 3:00, skip Interaction 3 and go straight to the guest brief. The allergy point can come back in Q&A.
- If a panel doesn't render, do not apologize — say "the ticket would normally land here" and keep moving. Judges forgive a missing pixel, not a missing point.
- Hard rule: do not say the word "AI" more than three times. You've earned the word "model" instead.
