# Demo Scenarios — RoseWood Concierge AI

Five pre-scripted transcripts that exercise the full department/urgency matrix. Use these as the "Demo Controls" dropdown in the UI, and as a fallback if the mic refuses to cooperate on stage.

Each scenario is calibrated so Claude Sonnet 4.6 returns a clean, structured ticket via forced tool-use.

---

## Scenario 1 — The Returning Legacy Guest (Concierge, delight moment)

**Setting**: Lobby, 3:42 PM. Front-desk supervisor Marco taps his badge after a brief chat with Mrs. Eleanor Whitfield, who has just checked into room 1102 for her 41st stay.

**Transcript** (what Marco says into the badge):
> "Mrs. Whitfield is here for the week. She mentioned the gardenias from her last stay were perfect — please make sure we have the same arrangement in 1102 before she comes down for tea at four."

**Expected ticket**:
- **department**: `concierge`
- **urgency**: `high` (time-boxed before 4:00 PM)
- **intent**: `repeat_preference_fulfillment`
- **guest_id**: `whitfield_eleanor` / room 1102
- **guest_facing_message**: *(none — silent delight)* `null`
- **action_required**: "Place gardenia arrangement (matching previous stay record) in room 1102 before 16:00. Confirm afternoon tea service set for 16:00 in the Drawing Room per standing preference."
- **internal_notes**: "Legacy tier, 41st stay. Past-stay log shows gardenia arrangement on stays #38 and #40. Afternoon tea at 4pm is a standing preference, not a one-off request."

**Why this is impressive**: The system silently chains *three* pieces of intelligence — the just-spoken request, the past-stay flower log, and the standing 4pm tea preference — into one ticket with no follow-up question. Judges see the guest profile light up in the right-hand panel and the past-stay history surface automatically.

---

## Scenario 2 — Urgent Maintenance (Maintenance, critical)

**Setting**: Hallway outside room 412, 9:15 PM. Housekeeping attendant Lina has just stepped out of Mr. Chen's room.

**Transcript**:
> "Mr. Chen in 412 — his AC is making a grinding noise and the room won't go below 23 degrees. He's got an early flight, he's not happy. Get someone up here now."

**Expected ticket**:
- **department**: `maintenance`
- **urgency**: `critical`
- **intent**: `hvac_failure_occupied_room`
- **guest_id**: `chen_david` / room 412
- **guest_facing_message**: "Mr. Chen, our engineering team is on the way to room 412 right now. We apologize for the disruption — if it is not resolved within 15 minutes, we will move you to an upgraded suite with our compliments."
- **action_required**: "Dispatch on-call HVAC engineer to room 412 immediately. If unresolved by 21:30, trigger room move to suite-tier inventory. Notify night manager."
- **internal_notes**: "Platinum tier, 8th stay. Profile flag: 'prefers cool room temperature'. This is a comfort-critical failure for this specific guest. Early flight on file — do not schedule follow-up before 06:00."

**Why this is impressive**: Critical urgency triggers the red banner. The guest-facing message via mocked Glowing.io appears in under two seconds. The system surfaces the "prefers cool room" preference automatically, which is what makes this a *severity-2* incident rather than a normal work order.

---

## Scenario 3 — Dietary Restriction with PMS Lookup (F&B, medium)

**Setting**: Restaurant pass, 7:02 PM. Maître d' Hannah taps her badge after seating Dr. Patel for dinner.

**Transcript**:
> "Dr. Patel at table 14 is here for the cardiology conference all week. He needs kosher meals for breakfast and dinner every day — please coordinate with the kitchen and make sure room service has the same note."

**Expected ticket**:
- **department**: `fnb`
- **urgency**: `medium`
- **intent**: `dietary_requirement_multi_day`
- **guest_id**: `patel_raj` / room 215
- **guest_facing_message**: "Dr. Patel, your kosher meal preference has been confirmed across all restaurants and in-room dining for the duration of your stay. The kitchen team has been briefed."
- **action_required**: "Push kosher dietary tag to Opera PMS guest profile for stay duration. Notify exec chef, breakfast supervisor, and IRD overnight team. Pre-print on table 14 reservation card for all remaining nights."
- **internal_notes**: "Gold tier, first stay. Conference checkout 19 May. Existing kosher meal note found on profile — confirms request rather than introduces it. Conference rate code: CARDIO26."

**Why this is impressive**: One sentence from the maître d' produces a *seven-touch* downstream action across F&B, IRD, and the PMS profile. Demonstrates that the system is not just routing — it is recognizing that "every day" means multi-shift propagation.

---

## Scenario 4 — Housekeeping Standing Preference (Housekeeping, low)

**Setting**: Service corridor, 11:18 AM. Floor supervisor Idris passes Ms. Marchetti in the hallway as she leaves for showroom appointments.

**Transcript**:
> "Sofia in 808 says the lilies are wilting — swap them for fresh stems, white peonies if we have them, before turndown. She's back around seven."

**Expected ticket**:
- **department**: `housekeeping`
- **urgency**: `low`
- **intent**: `floral_refresh_preference_match`
- **guest_id**: `marchetti_sofia` / room 808
- **guest_facing_message**: *(none — silent)* `null`
- **action_required**: "Refresh floral arrangement in room 808 before 19:00. Preference: white peonies if available, otherwise seasonal white. Complete during turndown service."
- **internal_notes**: "Legacy tier, 22nd stay. Standing preference: 'fresh flowers daily'. Past-stay log shows peonies were arrangement of choice on stays #19 and #21. Italian fashion week ongoing — guest is on a tight schedule, do not enter room before 19:00."

**Why this is impressive**: Low-urgency, high-taste interaction. Shows the system handling the *texture* of luxury — peonies vs. lilies, timing around the guest's calendar, the standing-preference reinforcement. This is the kind of ticket that normally lives in a supervisor's head and gets lost on a busy day.

---

## Scenario 5 — Front Desk Allergy Alert (Front Desk, high)

**Setting**: Lobby concierge desk, 4:55 PM. Concierge Theo has just finished a phone call with Mr. Chen, who is in transit to the hotel.

**Transcript**:
> "Heads up — Mr. Chen called from the car, he wants the welcome amenity in 412 changed. No nuts in anything, not even on the cheese board. He says last time there were almonds and he had to send it back."

**Expected ticket**:
- **department**: `frontdesk`
- **urgency**: `high`
- **intent**: `allergy_incident_recovery`
- **guest_id**: `chen_david` / room 412
- **guest_facing_message**: "Mr. Chen, thank you for the call — we have removed all nut-containing items from your welcome amenity and flagged your profile so this does not recur. A revised plate is being prepared now."
- **action_required**: "Pull and remake welcome amenity for room 412 — strict no-nut, no-trace. Add hard allergy flag to Opera PMS profile (severity: high). Notify F&B and IRD allergy registries. Log incident against last stay for service recovery review."
- **internal_notes**: "Platinum tier, 8th stay. Existing profile note 'nut allergies' was not enforced on previous stay — this is a documented service failure. Escalate to GM for written follow-up post-checkout."

**Why this is impressive**: This is the scenario that sells the *enrichment* story. The system doesn't just fix the amenity — it (a) hardens the allergy flag on the PMS profile so the next staff member who serves Mr. Chen *cannot* miss it, and (b) auto-files a service-recovery incident. One voice line, three institutional memories created.

---

## Coverage matrix

| # | Department    | Urgency  | Returning guest? | Past-stay data used? |
|---|---------------|----------|------------------|-----------------------|
| 1 | concierge     | high     | Yes (41st)       | Yes (flowers, tea)    |
| 2 | maintenance   | critical | Yes (8th)        | Yes (temp preference) |
| 3 | fnb           | medium   | No (1st)         | Profile flag only     |
| 4 | housekeeping  | low      | Yes (22nd)       | Yes (peonies history) |
| 5 | frontdesk     | high     | Yes (8th)        | Yes (allergy, prior failure) |
