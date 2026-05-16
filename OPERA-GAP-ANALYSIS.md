# Opera Cloud Mock — Gap Analysis vs Real Product
_Generated 2026-05-16. Based on publicly available Oracle Hospitality documentation (docs.oracle.com), Oracle marketing materials, Hotelier Magazine articles, and Capterra customer reviews._

## Disclaimer
This analysis was produced without access to a live OPERA Cloud instance. Findings are synthesized from Oracle's public documentation (docs.oracle.com versions 23.x → 26.2), Oracle marketing tour pages (which returned 403 to automated fetch and were inferred from Oracle's own documentation describing the same UI), Hotelier Magazine press coverage of OPERA Cloud Central, and Capterra customer reviews. The actual customer-facing UI varies by module licensing, "OPERA Controls" toggles, brand/property customization, and the user's role-based task grants. Many fine-grained UI details (exact pixel sizes, font choice, drop-shadow style, animation timings) cannot be verified from these public sources and are marked **unverified** where claimed. Marketing screenshots and product tour videos on oracle.com were not directly fetchable (403); descriptions of those pages here are inferred from corresponding documentation.

## Sources Consulted

- https://docs.oracle.com/en/industries/hospitality/opera-cloud/26.2/ocsuh/index.html — Release 26.2 user guide front matter; confirms current version + release naming (G50862-02, May 2026).
- https://docs.oracle.com/en/industries/hospitality/opera-cloud/25.5/ocsuh/c_home_dashboard.htm — Home Dashboard: tile-based, up to 24 pages, adaptive to resolution, navigate Home via "OPERA Cloud" wordmark in nav bar.
- https://docs.oracle.com/en/industries/hospitality/opera-cloud/24.4/ocsuh/t_managing_dashboard_tiles.htm — 40+ tile types, drag-drop, gear-icon configure, X to delete, Page Composer for chain-level.
- https://docs.oracle.com/en/industries/hospitality/opera-cloud/25.2/ocsuh/cc_add_dashboard_tiles.htm — Video transcript: "Add Page", "Add New Tiles", drag-drop tiles, gear config.
- https://docs.oracle.com/en/industries/hospitality/opera-cloud/24.2/ocsuh/ch_reservations.htm — Reservations: Basic vs Advanced search, pre-defined search types (Arrivals, Departures, In House, Queue, etc.), Sort By dropdown, **Table / List / Card / Console view modes**, "I Want To…" per-row.
- https://docs.oracle.com/en/industries/hospitality/opera-cloud/25.2/ocsuh/t_managing_reservations_using_the_central_reservation_sales_screen.htm — Reservation Sales: Sell Message panel (expand/collapse), Smart Search Bar with filter chips, Quick Access Icons (Caller Info, Quick Notes, Trip Composer), Five Most Recent.
- https://docs.oracle.com/en/industries/hospitality/opera-cloud/25.4/ocsuh/t_create_manage_viewing_and_editing_a_profile.htm — Profile Presentation: Overview panel + Detail Links sidebar grouped (Profile, Billing, Communications, Financials, Membership & Loyalty, Stays, Notifications, Sales, Activities), "I Want To…" + View + "Customise View" buttons.
- https://docs.oracle.com/en/industries/hospitality/opera-cloud/25.4/ocsuh/c_manage_billing_manage_billing.htm — Billing: 8 sub-account "windows" (#1–#8, plus #101–#108 for gaming), single-panel / two-panel / drawer view modes, Notification Panel auto-opens, expandable Guest Business Card.
- https://docs.oracle.com/en/industries/hospitality/opera-cloud/25.3/ocsuh/t_checking_out_reservations.htm — Checkout: Departures Search → Post Charge / Settle and Send Folio / Checkout Now buttons, "I Want To…" workflow alternative.
- https://docs.oracle.com/en/industries/hospitality/opera-cloud-distribution/23.1/ohdug/ch_getting_started.htm — Main menu via **three-line hamburger top-left next to "OPERA Cloud"**; user initials chip top-right; 15-min auto-logout; cluster vs property menu structure.
- https://docs.oracle.com/en/industries/hospitality/opera-cloud/25.5/ — Get Started landing for 25.5 (confirms version cadence).
- https://www.hoteliermagazine.com/oracle-introduces-oracle-opera-cloud-central/ — OPERA Cloud Central unifies Contact Centre + Central Sales + Distribution + Loyalty + Property under "a common user interface."
- https://www.capterra.com/p/266207/OPERA-Cloud-Property-Management/reviews/ — User sentiment: "very slow," "5000 clicks more than V5," "click in 5 different windows" to check in, 3–5 min logins.
- Marketing URLs attempted but blocked (HTTP 403): `oracle.com/hospitality/hotel-property-management/hotel-pms-software/`, `oracle.com/industries/hospitality/`, `hoteltechreport.com/property-management-systems/oracle-opera`, `oracle.com/hospitality/hotel-property-management/hotel-pms-software/tour/`.

## What the Real Opera Cloud Looks Like (Summary)

1. **Top of screen: hamburger (☰) at top-left next to the wordmark "OPERA Cloud."** Click hamburger → slide-out main menu. Click "OPERA Cloud" wordmark → return to Home Dashboard. (docs 23.1 distribution guide; 25.5 home dashboard)
2. **No persistent tab bar.** Navigation is hierarchical menu → screen, not a row of always-visible tabs. Top-level menu items at a property are roughly: Home, Bookings/Reservations, Front Desk, Cashiering, Inventory, Client Relations, Channels, Miscellaneous, Reports, Role Manager, Toolbox (varies by license and role).
3. **Top-right chrome:** current property name, user initials avatar that opens a popover (View properties, Sign-Out), small notification / tracing icons. Sessions auto-expire after 15 min of inactivity. (docs 23.1 dist.)
4. **Home Dashboard is a tile grid.** Up to 24 pages, ~40+ tile types (Arrivals, Departures, In House, Room Status, Room Summary, Daily Projections, Reservation Activity, Reservation Statistics, VIP Guests, Block Overview, Task Sheets, Custom Content, Image Gallery, External Content, etc.). Tiles hoverable to reveal a gear (configure) and X (delete); drag-and-drop to rearrange. (docs 24.4, 25.5)
5. **Multi-view search results.** Reservations and most list screens offer **Table / List / Card / Console** views via a "Views" icon, plus a Sort By dropdown. (docs 24.2 ch_reservations)
6. **"I Want To…" is everywhere.** Almost every record (reservation, profile, block, event, folio) shows an "I Want To…" button/dropdown that lists every contextual action — it is OPERA Cloud's signature pattern, replacing right-click context menus. (docs 25.4 profile, 24.2 reservations, 25.4 billing)
7. **Presentation pages (profile, reservation) are vertically scrollable single pages with stacked panels** — Overview, Profile Details, Communications, Membership, Stays, Notes, Attachments, Service Requests, Scheduled Activities — each with its own Edit button. A right-rail "View" button switches presentation styles; "Customise View" toggles which panels are visible. (docs 25.4)
8. **Folio / Billing screen has 8 numbered "windows" (sub-accounts #1–#8).** Layout dynamically switches between single-panel / two-panel side-by-side / drawer based on how many windows have postings. A Notification Panel auto-opens on the side; a Guest Business Card expands to show profile. (docs 25.4 billing)
9. **No F-key bar at the bottom of OPERA Cloud.** Function keys (F1–F12) are a hallmark of legacy OPERA 5 / Forms — not OPERA Cloud. OPERA Cloud relies on hamburger menu + "I Want To…" + tile clicks. ("F-keys = Opera 5" is widely documented; OPERA Cloud documentation never references a persistent function-key bar.) **This is the single biggest factual mismatch our mock could make.**
10. **Search:** Smart Search Bar with filter chips (display set, destination, amenities, property type, packages, coupon code, nights/dates) on the Reservation Sales screen. Quick-access icons: Caller Information, Quick Notes, Trip Composer. (docs 25.2)
11. **Color palette:** Oracle red (#C74634-ish) used very sparingly — primarily as a brand mark and on the active-state indicator. Bulk of the chrome is white surfaces with grey hairlines, blue links/info, black/dark grey text. Status pills use green/amber/blue/grey/red. (inferred from documentation screenshots and standard Oracle Redwood guidelines — **partially unverified**)
12. **Typography:** Oracle Sans / Redwood; dense table rows; small caps ALL-CAPS labels for section headers; tabular-aligned numerics. (**unverified specifics**; consistent with Redwood theme observable in public Oracle Cloud apps)
13. **Performance perception is poor in production.** Capterra reviewers consistently report slowness, 3–5 minute logins, multi-window/multi-click flows ("5000 clicks more than V5"), and frustration that information now lives on multiple stacked panels rather than a single legacy screen.
14. **OPERA Cloud Central** is the unification layer: one login, one nav across Contact Centre, Central Sales, Distribution, Loyalty, and Property OPERA Cloud — but at the property level, the surface area is still the property OPERA Cloud described above. (Hotelier Magazine)
15. **Mobile/tablet:** Same UI scales to tablet for check-in anywhere on property (Oracle marketing copy / docs). No hint of a different mobile-first navigation pattern.

## Per-Screen Gap Analysis

### Topbar

- **Real OPERA Cloud:** Single thin top bar. Left side: hamburger (☰) icon, then "OPERA Cloud" wordmark (clicking the wordmark navigates home), then the current property name. Right side: small icons (notifications, tracing/help), user initials avatar opening a popover (View properties, Sign-Out). Auto-logout 15 min. No persistent horizontal tabs. (docs 23.1 dist., 25.5 dashboard)
- **Our mock:** Three stacked rows: (1) "ORACLE · Hospitality · [OPERA Cloud] badge" + Property picker + "Connect Badge" button + Settings + Help + user avatar; (2) a row of always-visible **tabs** [Reservations · Guest Profiles · Service Requests · Activities · Folio · Reports · Setup] anchored by a Rosewood mark; (3) breadcrumb + live SSE status + Refresh + user display strip. (`app/page.tsx` lines 597–789)
- **Gaps:**
  - No hamburger menu. The defining OPERA Cloud nav affordance is missing.
  - Always-visible tab row is **not how OPERA Cloud navigates.** OPERA Cloud uses a slide-out main menu hierarchy.
  - "ORACLE · Hospitality" two-word wordmark with a small "OPERA Cloud" badge is **invented** — Oracle's actual treatment is just "OPERA Cloud" beside the hamburger.
  - Three rows of top chrome is heavier than OPERA Cloud's single thin bar.
  - "Connect Badge" button in chrome is a mock-only feature.
- **Priority fixes:**
  1. Replace the wordmark cluster with `[☰] OPERA Cloud   |   [Property name]` left-aligned.
  2. Either remove the tab row entirely (replacing with hamburger menu) or keep tabs but explicitly label this as a "Quick-Launch" deviation in the demo narrative.
  3. Collapse rows 1+3 into a single 36–40px top bar.

### Reservations list

- **Real OPERA Cloud:** Basic vs Advanced search toggle, pre-defined search "types" (Arrivals, Departures, In House, Mass Cancellation, Queue, Quick Check Out, Scheduled Check Out, etc.), Sort By dropdown, **Views icon switching Table / List / Card / Console**, per-row "I Want To…" dropdown, hyperlinked confirmation #, VIP-Level + First/Repeat indicators. (docs 24.2)
- **Our mock:** Single table view only. Filter chips (All / Arrivals / In-House / Departures / Day Use / VIPs). Free-text search input. 13 columns including Confirmation #, Guest, Room, Status, Check-in, Check-out, Rate Code, Market, Tier, Adults, Children, Past Stays, row actions (3-dot). Bulk-select checkbox + bulk action toolbar (Check In / Assign Room / Add Note / Block / Export). Sortable column headers with caret. (`components/ReservationsTab.tsx`)
- **Gaps:**
  - No view-switcher (Table / List / Card / Console).
  - No per-row "I Want To…" — we use a generic 3-dot menu instead.
  - No Basic ↔ Advanced search toggle.
  - "Day Use" filter chip is a nice touch and consistent with OPERA's preset search types.
  - Bulk-select checkboxes / "X selected" red-soft action bar is **invented** — OPERA Cloud's Reservations does not document bulk multi-row checkbox actions in this pattern (operations like Mass Cancellation are their own search type, not a row-multiselect). (**partially unverified**)
- **Priority fixes:**
  1. Rename the row-end 3-dot menu to a labeled "I Want To…" button with a dropdown listing typical Reservations actions (Check In, Cancel, Modify, View Folio, Send Confirmation).
  2. Add a Views switcher icon (Table / Card) even if only Table is functional.
  3. Hyperlink the Confirmation # cell as text-blue (Oracle blue link style).

### Guest Profile

- **Real OPERA Cloud:** **Profile Presentation page** — a vertically scrolling page of stacked editable panels: Overview, Profile Details (Fiscal Guest Type, etc.), Communications, Membership & Loyalty (Membership, Owner Records, Subscriptions), Stays (Future/Past Stays, Future/Past Blocks), Notifications (Notes, Emails, Attachments), Sales (Sales Info), Activities (Service Requests, Scheduled Activities), Billing (AR, Negotiated Rates, Correspondence). Each panel has its own Edit. Right side has "I Want To…", "View" (presentation style), "Customise View" buttons. (docs 25.4 profile)
- **Our mock:** Right-side sidebar (380px) titled "Guest Profile" with sections: profile header card (avatar + name + tier/room chips + lock icon), 3-tile stat strip (Stay Length / Past Stays / Loyalty), Profile Alert standing note, **Pre-Arrival Information** (custom), **Research** (AI golden-profile brief), **Anticipated Needs** (AI predictive), **Stay History** mini-table. (`components/GuestSidebar.tsx`)
- **Gaps:**
  - We render a *sidebar* alongside an SR thread; OPERA Cloud renders a *full page* you navigate to.
  - We're missing canonical panels: Communications (phones/emails/addresses), Membership & Loyalty, AR, Negotiated Rates, Attachments, Future/Past Blocks.
  - "Research" and "Anticipated Needs" panels are **invented for our hackathon** — not in OPERA Cloud.
  - No "I Want To…" button on the profile.
  - No "Customise View" affordance to toggle panel visibility.
- **Priority fixes:**
  1. Add a dedicated full-page Profile route (not just a sidebar) accessible by clicking a guest. Sidebar can remain as a quick-peek for the Service Requests workspace.
  2. Add OPERA's panel structure (Overview, Communications, Stays, Membership, Notes, Attachments) even if many panels are empty stubs.
  3. Add an "I Want To…" button with at least: Anonymize Profile, Merge Profiles, View Stay Statistics, View Change Log, Manage Profile Image, Open Reservation.
  4. Frame the AI sections explicitly as "AI Concierge add-on" so reviewers see them as a deliberate extension, not a misrepresentation of OPERA.

### Service Requests

- **Real OPERA Cloud:** "Service Requests" is a relatively lightweight module (active when `GENERAL > SERVICE REQUEST` control is on). It is **not** a full conversation/activity timeline; it's closer to a tagged ticket attached to a reservation/profile with status, assigned department, and follow-up. There is no documented voice-transcript ingestion. The broader user-activity record is the **Changes Log** (Miscellaneous → Changes Log) which captures all writes. (search results; docs 25.4 profile mentions Service Requests under Activities)
- **Our mock:** This is the **flagship demo screen**. 3-column layout: InboxSidebar (300px) of reservations + filters → ConversationThread (center) with a guest header strip, sub-tabs (Activity Log / Reservation / Folio / Notes / Preferences / Routing), a live transcript banner, and "ServiceRequestCard" stack with Oracle-Hospitality-styled cards (dept code chip, SR#, urgency chip, status chip, raw transcript, action required, internal notes, guest SMS, source/staff footer, Assign + View Full SR links) → GuestSidebar (380px). Header actions: New SR / Reassign / Mark Resolved / Escalate. (`app/page.tsx` lines 812–848, `components/ConversationThread.tsx`)
- **Gaps:**
  - The depth and chattiness of our SR cards (raw transcripts, guest-facing SMS quoted blocks, AI routing rules tab) is far richer than canonical OPERA Cloud Service Requests.
  - "AI Concierge listening" banner, "Trigger Badge" demo button, "Demo Console" footer — all **invented**.
  - Our "Routing" sub-tab listing AI keyword rules per department is invented.
  - The 6-sub-tab strip inside the workspace is heavier than OPERA's per-page tab usage.
- **Priority fixes:**
  1. Keep the rich AI layer but **clearly badge it** as "AI Concierge — extends OPERA Cloud Service Requests" so a hospitality reviewer doesn't think we're misrepresenting OEM behavior.
  2. Add a small "I Want To…" button on each SR card with: Mark Resolved, Reassign, Escalate, View Reservation, View Profile.
  3. Consider renaming the sub-tab strip to match OPERA terminology: "Activity Log" → leave; "Routing" → "Auto-Routing Rules"; "Folio" → consider hiding here since OPERA's Folio is its own top-level screen.

### Folio

- **Real OPERA Cloud:** "Manage Billing" screen. 8 sub-account "windows" (#1–#8, plus #101–#108 if gaming). Layout dynamically: single-panel when one window has postings, side-by-side two-panel when two, drawer indicator when three or more. Post Charges / Accept Payments / Adjust / Split / Generate Folio (print/email/preview) per window. Notification Panel auto-opens. Expandable Guest Business Card. "I Want To…" actions: Edit Postings, Transfer Folios, Move Postings between Windows, Search Transactions, View POS Check Images, Manage Package Allowances, Reverse Advance Bills, Void Folios. (docs 25.4 billing)
- **Our mock:** Two-column layout: left = "In-House Guests" picker list (260px), right = single combined folio detail with: 12-col summary header (Confirmation, Guest, Room, Arrival, Departure, Nights / Rate Code, Market, Daily Rate, Past Stays, VIP), a single Toolbar (Post Charge / Post Payment / Adjust / Print / Email / Reverse), one Folio table (Date / Code / Description / Posted By / Charges / Credits) with totals, balance card. (`components/FolioTab.tsx`)
- **Gaps:**
  - **No concept of multiple billing windows (#1–#8).** This is the defining feature of OPERA Cloud Billing and we render only "Window 1" implicitly.
  - No two-panel / drawer view switching.
  - No Notification Panel.
  - No expandable Guest Business Card.
  - "Reverse" toolbar button conflates Adjust + Reverse Payment + Void Folio.
  - "Email" as a top-level button is correct; OPERA also documents Print and Preview.
  - No "I Want To…" or per-line item actions.
- **Priority fixes:**
  1. Add a row of `[ Win 1 ][ Win 2 ][ Win 3 ][ + Add Window ]` tabs at the top of the folio detail, even if 2-8 are empty stubs.
  2. Add a small collapsible right-side Notification Panel under the toolbar.
  3. Add an "I Want To…" button that lists Transfer Postings, Move Postings, Split Charge, Generate Pro Forma, View Folio History.
  4. Rename "Adjust" → "Adjust / Rebate" to match Allow Negative Postings semantics.

### Setup / Configuration

- **Real OPERA Cloud:** Configuration is reached via the hamburger menu under "Configuration" with sub-items: Property, Guest Rooms, Taxes, Reservations Setup, Policies, Inventory Management, Alternate Properties. Pricing config (Rates / Products / Promotions / Yield Attributes) lives under "Pricing." Role Manager (Role Permission) is its own top-level node. Channels config under "Channels." Each config page typically shows a list/table with New/Edit/Save and an "I Want To…" entry. (docs 23.1 distribution main menu listing)
- **Our mock:** Two-column screen: left rail with 7 sections (Property / Rate Codes / Market Segments / Departments & Routing / AI Concierge / Users & Roles / Integration Status), right side renders the chosen section with header card + table or form. (`components/SetupTab.tsx`)
- **Gaps:**
  - We collapse Property, Pricing, Channels, Role Manager, and Toolbox config under one "Setup" tab; OPERA Cloud spreads these across at least 4 top-level menu sections.
  - "AI Concierge" and "Integration Status" sections are **invented** for the demo.
  - "Departments & Routing" with regex-like keywords is invented — OPERA's housekeeping / front-desk routing config is structured differently (departments, codes, SLAs, but not natural-language keyword triggers).
  - "v 26.5.16 · build 4882" in the footer doesn't match Oracle's versioning (Oracle uses 25.5, 26.2, etc. — never `26.5.16`).
- **Priority fixes:**
  1. Either rename "Setup" → "Configuration" to match OPERA wording, or accept the collapsed naming as a demo simplification and document it.
  2. Fix the footer version string to `OPERA Cloud · v26.2 · …`.
  3. Add a "Pricing" subsection grouping (Rates already exists; add Promotions and Yield Attributes stubs) to nod to OPERA's structure.

### Function Key Bar (Opera trademark)

- **Real OPERA Cloud:** **There is no F-key bar in OPERA Cloud.** F-keys (F1 Help, F3 Reservation, F5 Refresh, F12 SR, etc.) are an Opera **5** (legacy Forms / Fidelio) hallmark and persist in some Suite8 contexts. OPERA Cloud is a browser-based SPA and uses Hamburger + "I Want To…" + tile clicks. No Oracle docs URL I reviewed describes a persistent function-key bar in the Cloud product. (**high-confidence verification by absence:** searched docs.oracle.com OPERA Cloud guides — no F-key footer documented).
- **Our mock:** Bottom 28px fixed footer with chips: `F1 Help · F2 Quick Find · F3 New Reservation · F4 Pre-Arrival · F5 Refresh · F8 Profile · F12 Service Request` + a right-aligned `Oracle Hospitality OPERA Cloud · v24.4 · Property: … · Session: …` strip. Real keyboard handlers wired for each key. (`app/page.tsx` lines 882–897, FN_KEYS at 44–52, keydown handler 510–560)
- **Gaps:**
  - **The F-key bar is the most prominently incorrect thing in the mock for an OPERA Cloud demo.** It signals "Opera 5" to anyone in the hospitality industry, not "OPERA Cloud."
  - Footer version string `v24.4` is also stale relative to current 25.5 / 26.2.
- **Priority fixes:**
  1. **Either** remove the F-key bar entirely (most authentic), **or** keep it as a deliberate hackathon-flavor "power user shortcut bar" but label it accordingly (e.g., "Shortcuts" not "Function Keys") and explain in `DEMO.md` that this is a usability enhancement we're proposing on top of OPERA Cloud.
  2. Update version string to `v26.2`.

## Things Real OPERA Cloud Has That We Lack

- **Hamburger main menu** with full module navigation.
- **Customizable Home Dashboard with tiles** (drag/drop, gear configure, X delete, Page Composer at chain level, up to 24 pages, 40+ tile types).
- **"I Want To…" contextual action button** on every record — *the* OPERA Cloud signature affordance.
- **8 billing windows (sub-accounts #1–#8)** with dynamic single-panel / two-panel / drawer layout.
- **Multi-view results** (Table / List / Card / Console) on Reservations and similar search screens.
- **Basic ↔ Advanced search toggle.**
- **Pre-defined search types** (Arrivals, Departures, In House, Queue, Quick Check Out, Scheduled Check Out, Mass Cancellation, etc.) as a typed dropdown rather than free filter chips alone.
- **Sell Message panel** on Reservation Sales screen (collapsible, displays global/hub/property sell messages).
- **Smart Search Bar with filter chips** (display set, destination, amenities, packages, coupon code, nights/dates).
- **Profile Presentation page** as a full vertically-scrolling page (Overview, Communications, Membership, Stays, Notes, Attachments, Sales, Activities, Billing).
- **"Customise View" / "View" buttons** on presentation pages to choose presentation styles and toggle panels.
- **Notification Panel** auto-opening on Billing with read/unread indicators and "Mark All as Read."
- **Expandable Guest Business Card** floating widget.
- **Changes Log** (Miscellaneous → Changes Log) as the audit trail for all writes.
- **Caller Information, Quick Notes, Trip Composer** quick-access icons on Reservation Sales.
- **Role Manager (Role Permission)** as its own top-level configuration node.
- **Channels, Pricing (Rates / Products / Promotions / Yield Attributes), Inventory, Availability (Hurdle Rates, Restrictions)** as distinct top-level menu sections.
- **Property picker** that is part of the user popover (View properties) rather than its own button.
- **15-minute auto-logout** with warning.
- **Tablet-equivalent UI** for mobile check-in.

## Things Our Mock Has That Real OPERA Cloud Doesn't

- **Persistent horizontal tab bar** (Reservations / Guest Profiles / Service Requests / Activities / Folio / Reports / Setup). OPERA Cloud uses a hamburger menu, not always-visible tabs.
- **Function-key bar** along the bottom (F1/F2/F3/F4/F5/F8/F12). This is an Opera 5 / Fidelio motif, not OPERA Cloud.
- **Three-row top chrome** (brand strip + tab nav + breadcrumb/status strip). OPERA Cloud is a single thin top bar.
- **"ORACLE · Hospitality · [OPERA Cloud]" tri-part wordmark.** Oracle just writes "OPERA Cloud."
- **"Connect Badge" QR-code corner widget.** Hackathon-specific.
- **"AI Concierge listening" red pulsing banner with live transcript stream.** Hackathon-specific.
- **AI Research / Anticipated Needs panels** on the guest sidebar pulling from public web search. Hackathon-specific.
- **"Pre-Arrival Information" structured panel** capturing ETA, flight, dietary, allergies, room prefs, welcome amenities. OPERA Cloud has Notes / Preferences / Membership-level prefs but not this exact structured form.
- **"Trigger Badge / Sample SR" demo console** in the SR thread footer.
- **Bulk-select checkboxes + multi-row action toolbar** ("Check In / Assign Room / Add Note / Block / Export") on Reservations.
- **AI Concierge configuration page** (model, max searches, confidence threshold, vibrate-on-confirmation, usage stats). Hackathon-specific.
- **AI-routing-rules tab** ("Routing" sub-tab) with natural-language keyword triggers per department.
- **"Profile locked" overlay** with lock-icon toggle on the guest sidebar.
- **Inline SSE "Live · Connected to AI Concierge" status pip** in the breadcrumb strip.
- **`v 26.5.16 · build 4882`** style fake version string that doesn't match Oracle's `25.5` / `26.2` naming.

## Recommended Targeted Fixes (Prioritized)

1. **[P0] Remove or rebrand the bottom F-key bar.** This is the loudest "wrong product" signal. Either delete the row entirely (replace with a `Shortcuts: F2 = Find` hint in the breadcrumb), or relabel as "Shortcuts" and own it as a power-user feature. (`app/page.tsx` lines 882–897, `FN_KEYS` const lines 44–52)
2. **[P0] Add a hamburger (☰) icon at the top-left of row 1 that opens a slide-out main menu** with OPERA Cloud's canonical sections (Home, Bookings, Front Desk, Cashiering, Inventory, Client Relations, Channels, Configuration, Reports, Role Manager). Keep the tab row but visually demote it (smaller, thinner, "Quick Launch") so reviewers see the hamburger as the primary nav.
3. **[P0] Collapse the three top rows into one thin bar.** `[☰] OPERA Cloud   |   Rosewood San Francisco · 153 rooms   ·····   [search] [notifications] [help] [K user-avatar]`. Move breadcrumb + SSE pill into the body, not the chrome.
4. **[P1] Add an "I Want To…" button** on the Reservations row, the Guest Profile header, the Folio header, and each Service Request card. This single pattern, if added consistently, transforms the mock from "ours" to "OPERA-flavored." Even if the dropdown is mock-only, the affordance must exist.
5. **[P1] Add a Views switcher** (Table / Card icons) on the Reservations toolbar — even if only Table is wired.
6. **[P1] Add billing-window tabs (`Win 1 · Win 2 · + Add Window`)** to the top of the Folio detail, with the existing table belonging to Win 1.
7. **[P1] Replace the Home / landing experience with a tile-grid Dashboard** (use existing data: arrivals count, in-house, departures, VIP arrivals, SR queue, integration health) when `activeTab === "service"` is not the default. Tiles should be hoverable to reveal a gear + X icon.
8. **[P1] Fix the version footer** to `OPERA Cloud · v26.2 · Property: ROSE-SFO · Session: …` and remove the `v 26.5.16 · build 4882` string in `SetupTab`.
9. **[P2] Rename top-bar wordmark** to just `OPERA Cloud` (drop the `ORACLE · Hospitality · [OPERA Cloud]` triplet).
10. **[P2] Extend the Guest Profile sidebar into a full Profile Presentation page route** with stacked panels (Overview, Communications, Stays, Membership, Notes, Attachments). Sidebar can remain as a peek view in the SR workspace. Add a "Customise View" button that toggles panel visibility.

## Honest Verdict

Our mock is **already very Oracle-coded** at the surface level: the red brand color, dense tables, ALL-CAPS small labels, chip statuses, hairline grey borders, mono numerics, and the bottom session strip all read "enterprise PMS" correctly. But two structural choices — the **persistent horizontal tab bar** instead of a hamburger menu, and the **F-key bar at the bottom** — are immediately recognizable as **OPERA 5 (the legacy Forms product), not OPERA Cloud**, to anyone who has used the real product. Fixing those two things (P0 items 1–3 above) plus adding a visible "I Want To…" button anywhere (P1 item 4) would move the mock from "looks like generic Oracle enterprise" to "actually plausible OPERA Cloud." For a hackathon demo aimed at impressing AI-and-design reviewers (not OPERA Cloud admins), the current state is already convincing enough; for a demo to Oracle Hospitality or to a hotel ops audience, the F-key bar and tab-row would be challenged within thirty seconds. Estimated effort to reach ~95% authenticity: ~4–6 focused hours on the top-bar refactor + tile dashboard + "I Want To" buttons; everything else can be left as-is.
