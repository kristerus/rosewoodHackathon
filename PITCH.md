# Pitch — RoseWood Concierge AI

## Elevator pitch

RoseWood Concierge AI is a voice-activated staff badge that turns spoken hallway requests into structured tickets, guest messages, and PMS updates in under three seconds. Staff stop typing, stop radioing, stop forgetting. A second layer briefs every staff member on every guest before arrival — past stays, preferences, public signal. The guest experience compounds with every interaction, because every interaction enriches the record.

---

## The problem

- **Coordination is the job, not hospitality.** Cornell's 2024 service-labor study put luxury front-of-house coordination overhead at 31% of paid hours. That is radios, WhatsApp, paper chits, and the supervisor's notebook — not guest contact.
- **Tickets get lost in the handoff.** A request spoken to a doorman survives to the kitchen roughly two times in three. The other third becomes a service recovery moment.
- **Returning guests are strangers to new staff.** A Legacy guest on her 22nd stay re-explains her flower preference because the staff member on shift this week wasn't on shift last time. The institution forgets faster than the guest does.

## The insight

A staff member balancing a tray, a suitcase, and a smile cannot pull out a phone. Voice is the only zero-friction interface for the people who actually carry the service. Everything else is overhead pretending to be productivity.

## The solution

Two components, built to be deployed together but independently useful.

- **The badge.** A wearable push-to-talk device. Staff speak naturally; Claude extracts structured intent (department, urgency, guest, action, guest-facing message) and dispatches to the right system within seconds.
- **The brief.** When a booking is made, an agent assembles a one-page intelligence brief — public web signal, past-stay synthesis, preference patterns, opening line — and pushes it to every badge on shift before the guest sets foot on property.

## Why now

Three things converged in the last 18 months. Claude Sonnet 4.6 made forced tool-use reliable enough that we trust structured ticket extraction without a human-in-the-loop checkpoint. Web Speech and on-device transcription are finally good enough on commodity hardware for noisy lobby environments. And the hotel platform stack — Glowing.io for guest messaging, Opera OHIP for profiles, BirchStreet for procurement — has matured into a real integration substrate. None of those three was true in 2023.

## Why RoseWood specifically

- **Willingness to pay lives at the top.** Luxury tier guests carry the highest revenue per room and the highest expectation of being remembered. The ROI of a recovered preference is asymmetric — a $2 gardenia stem protects a $40,000 annual relationship.
- **The integration substrate is already in place.** RoseWood's existing stack — Glowing.io for guest messaging, Opera for profiles, BirchStreet for procurement — is exactly the surface area this system was designed to sit on top of. We are not asking RoseWood to replace anything. We are asking to make what already exists addressable by voice.
- **Reputation is the moat.** A guest-experience moat compounds in a way that operational efficiency does not. RoseWood already trades on remembering its guests. We make that institutional, not personal.

## The ask

A 90-day pilot at one RoseWood property. We bring the badges, the model integration, and the engineering. RoseWood brings the staff, the API access (Glowing, Opera, BirchStreet sandbox), and a property executive sponsor.

We commit to measuring two numbers, agreed in advance:

1. **Coordination time per guest interaction.** Target: -40% versus baseline.
2. **Repeat-preference fulfillment rate** for Legacy and Platinum guests. Target: +25 percentage points versus current.

If either moves, we expand. If neither moves, you've lost ninety days and a hackathon team's time — and we'll have learned something worth knowing.
