---
title: "PRD — 1StudentID"
status: draft
created: 2026-08-25
updated: 2026-08-25
---

# PRD: 1StudentID — Modular Multi-Tenant Education Platform

*Production build derived from the working prototype (`modular-showcase-suite`). Product name per July 2026 board decision: **1StudentID** (formerly OneEdu).*

## 0. Document Purpose

This PRD is the contract for taking the fully-built UI prototype to a production system. It is written for the product owner, the architecture workflow (`bmad-architecture`), the epics/stories breakdown, and the comprehensive SRS that will follow it. It covers the **entire 24-module platform as committed scope** with **phased delivery** (§6): Phase 1 is the lean "Run My Institute Daily" MVP per the July 2026 board strategy, launched **dual-segment** (Coaching/Tuition + Swim/Activity Clubs in parallel). The **Swim Club is specified as a customized Discipline Pack layered on the core platform** (§4 groups G), never as core scope.

Inputs consolidated here: the prototype codebase (see `extract-prototype.md`), the recovered legacy documents — both SRS versions, product strategy, board deck, hosting architecture, cost models (`extract-legacy-docs.md`) — and 2026 market research (`extract-market-research.md`). Technical/hosting decisions, cost operating points, and document-conflict resolutions live in `addendum.md`, not here. Assumptions are tagged inline `[ASSUMPTION]` and indexed in §9.

**Standing scope decisions (user-confirmed):** initial compliance scope is **Cyber Essentials Plus + UK GDPR (incl. DPA 2018 / ICO Children's Code)** only — all other regimes deferred; form factor is **responsive web + native mobile apps**; success is anchored on a **paid UK pilot of 1–3 tenants**.

## 1. Vision

Every educational institution — a tuition centre, a school, a swim club — runs the same daily loop: who turned up, what was taught, what parents need to know, and who has paid. Today that loop is scattered across school-grade suites that ignore activity clubs, club-management tools that can't handle academics, spreadsheets, and WhatsApp. 1StudentID is one platform that runs that entire daily operation for any institution, on one shared codebase, where **each institution's data is unambiguously its own**.

Three ideas make it different. First, the **1StudentID identity**: a student has one platform-wide identity for life, carried across every institution they ever attend — with each institution seeing only its own relationship, and new relationships formed only by explicit, OTP-verified consent. Second, the **Student Record Book**: a daily, two-way, acknowledgement-tracked channel between staff and families that makes parents open the app every day — the stickiness engine no incumbent SIS has. Third, **Discipline Packs**: the platform's vocabulary, screens, and workflows re-skin per vertical — the first pack turns the same core into a single-purpose swim-club product (sessions instead of classes, award levels instead of grades, coaches instead of teachers) with nothing school-like leaking in. Market research confirms no incumbent spans both the school SIS+LMS world and the club-management world; that seam is the wedge.

The prototype already proves the breadth: 24 entitlement-gated modules, 43 screens, 9 role personas, white-label branding, and a self-driving guided demo. The production work is not building screens — it is building the real multi-tenant backend, identity, payments, and compliance underneath them, and shipping them in revenue-ordered phases.

## 2. Target User

### 2.1 Jobs To Be Done

- **Institute Admin (tuition centre / club owner):** "Run my institute daily without spreadsheets — roster, registers, fees, parent comms in one place; know today's numbers at a glance; get paid on time without chasing."
- **Teacher / Coach:** "Take my register in seconds, record what matters about each student where parents will actually see it, and run my class/session from one screen."
- **Guardian (UI: Parent):** "One login for all my children across every institute; know what happened today; acknowledge what the school needs; pay what's due — from my phone."
- **Student (adult, self-managed):** "Own my education admin myself: enrol, pay, acknowledge, and speak for myself — without a guardian in the loop."
- **Swim Club Manager:** "Run poolside operations — sessions, coach cover, incidents, awards — and prove club performance monthly, in club language, not school language."
- **Platform Admin (1StudentID HQ):** "Onboard tenants in minutes, control what each plan unlocks, and see portfolio health — without ever touching a tenant's data unaudited."

### 2.2 Non-Users (v1)

- Universities and multi-campus trusts (platform tagline says "universities tomorrow" — explicitly not in launch scope).
- Institutions outside the UK (single-region UK launch; multi-jurisdiction deferred).
- US school districts (FERPA/COPPA compliance deferred with them).
- Individual self-serve learners (the Marketplace is a later-phase, tenant-published catalogue, not a consumer MOOC store).

### 2.3 Key User Journeys

- **UJ-1. Priya onboards her tuition centre in an afternoon.** Priya owns a 240-student tuition centre. From a sales call she receives an invite; the onboarding wizard walks her through institute details, branding (logo, colour), migration source, and first cohort import. She invites two staff. By evening her branded workspace is live, her roster is in, and her Starter-plan modules appear in the sidebar — nothing else. **Edge case:** her CSV has 14 duplicate rows — the dry-run report flags them before anything is committed.
- **UJ-2. Mr. Brown takes the register in under 30 seconds.** Teacher, first period. He opens Take Attendance on his phone; the class roster is pre-marked Present. He taps two absences, one Late with a reason, hits Publish. Guardians of the unexcused absentee are alerted automatically. Realizes the "<30 s per class" acceptance target.
- **UJ-3. A record-book note reaches home the same evening.** Mr. Brown logs a behaviour-concern entry on Oliver's Record Book, flags it "requires acknowledgement". Oliver's guardian Jack gets a push notification, reads it at 18:40, acknowledges, and replies with context. The thread is on Oliver's permanent record; the school sees exactly who acknowledged and when. **Edge case:** unacknowledged after 48 h → escalation reminder to both guardians.
- **UJ-4. Jack sees both children across six institutes in one login.** Jack (guardian) opens the app: per-child cards — attendance, GPA, dues, next class — across every institute each child attends, each institute's data shown separately. He taps the outstanding invoice for Olivia's maths class and pays by card. The invoice records that Jack (not co-guardian Amelia) paid it.
- **UJ-5. Month-end billing runs itself.** Priya opens Billing, picks September: the engine drafts per-child itemised invoices from course selections, fee plans, weekday schedules, sibling discounts, credits, and term closures, VAT treated per plan. She reviews the totals row, taps Issue All. Meanwhile Jack previews "what will I pay in October" for a course change before committing to it. **Edge case:** re-issuing the same student+month is blocked.
- **UJ-6. Emily manages herself.** Emily is 19, self-managed. She enrols in a revision session, acknowledges her own record-book entries, pays her own invoice, and rates her teacher — anonymously, if she chooses. No guardian is involved anywhere. When a minor student turns 18, the platform transitions them to this state automatically.
- **UJ-7. An existing platform student joins a second institute — by consent.** Priya's front desk has Emily's email from an enquiry. Lookup returns only "a student with this identifier exists"; no profile. Priya sends an enrolment request; Emily gets email + SMS with a secure link and OTP; on her confirmation, and only then, the new institute sees its own relationship with her. Declined or expired (72 h) requests reveal nothing. Every step is audit-logged on both sides.
- **UJ-8. Coach Ava runs poolside from one screen.** Swim coach, Tuesday 17:00 session. Her phone shows her session: roster, attendance P/L/A, the awards tracker. She ticks Duckling 2 activities as swimmers demonstrate them; the final tick auto-certifies the award — a printable certificate is generated and each guardian is notified in-app immediately. She logs one Amber wellbeing check and completes the pool safety checklist. Nothing school-like appears anywhere in her app.
- **UJ-9. Jessica covers a sick coach and closes the month.** Club manager Jessica marks Coach Sam absent (sick leave) for tonight's session and picks Ava as substitute — a temporary cover that auto-reverts in 12 hours, with a countdown badge. At month end she opens the Monthly summary report: sessions conducted, attendance, incidents, wellbeing follow-ups, and the HR evaluation — per-coach reliability %, cover carried, per-swimmer attendance with sub-75% flags — and exports it for the committee meeting.
- **UJ-10. A swimmer joins; a leaver is off-boarded clean.** Jessica registers a new 7-year-old: guardian holds the login (age-based), a second co-guardian gets their own login, a Direct Debit mandate is set up, and the swimmer is assigned to a session. The same week she off-boards a leaving swimmer: recurring billing stops, automated messaging stops, history stays intact — GDPR-safe leaver, never a deletion.
- **UJ-11. A PB lands on the family's phones.** At a gala, Ava logs Oliver's 50m Free time; the platform detects a personal best. Jack and Amelia see the 🏅 flag and Oliver's award progress from the native mobile app, push notification included.
- **UJ-12. HQ sees the portfolio, never the pupils.** The 1StudentID Platform Admin reviews tenant health — plans, MRR, activation — and flips a Growth-plan tenant's LMS module on. Entitlements propagate to live sessions promptly. No tenant PII is visible in any of it.

## 3. Glossary

*Downstream artifacts must use these terms exactly.*

- **Platform** — the 1StudentID SaaS as a whole, operated by the Platform Admin organisation.
- **Tenant** — one customer institution's isolated space on the Platform. Every datum belongs to exactly one Tenant (except the Student Identity record and platform-level registry data). UI word: "Institute".
- **Plan** — commercial tier of a Tenant: Starter, Growth, or Enterprise. Determines default Module entitlements and limits.
- **Module** — an independently enableable functional area (24 in the catalog). Entitlements are per-Tenant, enforced server-side; **Module Gate** is the UX-level hiding of disabled Modules.
- **1StudentID (identifier)** — the globally unique, immutable, platform-wide student identifier assigned at first enrolment and kept for life, across all Tenants. `[ASSUMPTION: format remains "S-XXXX" as in the prototype; the production SRS's "OE-XXXXXXXXXX" variant is dropped.]`
- **Student** — a person receiving education. **Minor Student**: under the age of majority, guardian-linked. **Adult Student**: at/over majority, self-managed (owns consents, payments, acknowledgements). Transition is automatic at majority.
- **Guardian** — an adult with verified responsibility for a Minor Student (UI word: "Parent"). **Co-Guardian**: a second guardian with their own separate login and independent payment ability.
- **Enrolment Record** — one Student↔Tenant relationship: role, class/session labels, since-date, and preserved **Legacy ID** / **Legacy System** from the Tenant's prior software.
- **Consent Flow** — the OTP/secure-link confirmation by which an Adult Student or a Minor's Guardian approves a cross-Tenant enrolment request.
- **Teacher** — Tenant staff delivering teaching. **Coach** — the Teacher role under a sports Discipline Pack.
- **Institute Admin** — Tenant-scoped administrator. **Platform Admin** — 1StudentID HQ administrator with cross-Tenant, audited, non-PII-by-default access. **Club Manager** — the Institute Admin role under the Swim Pack.
- **SRB (Student Record Book)** — per-Student chronological book of typed **Entries** (academic, behaviour, health, homework, safeguarding, permission, communication, remark) forming two-way **Threads** with replies and tracked **Acknowledgements**.
- **Safeguarding Entry** — an SRB Entry type visible only per DSL (Designated Safeguarding Lead) rules, excluded from exports/DSAR without DSL review, retained 25 years (UK).
- **Fee Plan** — per-course billing configuration: model (per-session / monthly / term-block), weekday schedule, rates, VAT treatment.
- **Billing Run** — the monthly engine pass that drafts per-child itemised invoices from enrolments, Fee Plans, Discounts, Credits, and Closures, and materialises them on Issue.
- **Mandate** — a family's standing payment authorisation (e.g. Direct Debit) with status Active/Pending/Failed/Stopped.
- **Discipline Pack** — a productised customization layer that re-skins the core Platform for a vertical: curated menus, vocabulary, screens, seed data, and scoping rules. Activated per account/Tenant. First pack: **Swim Pack**.
- **Session** — under the Swim Pack, one scheduled pool session (pool, zone, lanes, coach roster, swimmer roster, capacity). The Swim analogue of a class meeting.
- **Swimmer** — a Student under the Swim Pack.
- **Award** — an authored achievement definition in a strand (e.g. Duckling 1–4, Learn-to-Swim stages) with an activities checklist; **Award Progress** tracks a Swimmer's ticked activities; completing all activities **Certifies** the Award and generates a printable **Certificate**.
- **Level** — a Swimmer's position on the club progression ladder, advanced by **Level Assessment** (criteria ticks → Qualified) and **Promotion** into a next-level Session.
- **Cover** — a substitution on a Session's coach roster. **Temporary Cover / Temporary Move** auto-revert after 12 hours with a visible countdown.
- **Off-boarding** — the GDPR-safe leaver flow (swimmer or coach): stop billing and/or automated messaging from an effective date, status Inactive, history intact, reversible by **Reactivation**.
- **DSAR** — Data Subject Access Request; the compliance module's tracked lifecycle for it.
- **Audit Trail** — append-only log of security- and privacy-significant events.
- **Guided Demo** — the scripted, self-driving product tour used as a sales asset.

## 4. Features

*FRs are numbered globally and stably. Grouped: **A** Platform Foundation · **B** Academic Core · **C** Family Engagement · **D** Finance & Commerce · **E** Growth & Intelligence · **F** Operations, Compliance & Platform Admin · **G** Discipline Customization (Swim Pack) · **H** Native Mobile Apps. Phase tags refer to §6.*

---

### A. Platform Foundation

#### 4.1 Identity, Authentication & Accounts *(Phase 1)*

**Description:** Every persona signs in to one app with role-appropriate entry. Production replaces the prototype's demo accounts with hardened credential auth plus social/federated sign-in brokered through a single identity provider. Authorisation is always server-enforced; UI hiding is never the only control.

- **FR-1: Credential authentication.** A user can sign in with email + password; passwords are stored with a modern memory-hard hash (Argon2id), min 12 chars, breach-checked.
  - Lockout after 5 failed attempts / 10 min with exponential backoff and user notification; secure reset invalidates all sessions.
- **FR-2: Social & federated sign-in.** A user can sign in via Google, Apple, and Microsoft, brokered through the platform IdP; enterprise SSO (SAML/OIDC) for staff is Enterprise-plan scope. Realizes UJ-10 (age-based sign-in method choice at registration).
  - Apple sign-in is present wherever the iOS app offers third-party login (App Store rule).
- **FR-3: MFA.** MFA (TOTP + WebAuthn; SMS fallback only) is mandatory for all admin roles and optional for others.
- **FR-4: Session management.** Sessions use short-lived tokens with server-side refresh rotation; a user can view and revoke their active sessions; single sign-out revokes everywhere.
- **FR-5: Server-side authorisation.** Every protected operation re-checks role, Tenant scope, and Module entitlement server-side.
  - A request for another Tenant's data returns not-found/forbidden regardless of UI state; verified by pen test (§5 NFR gate).

#### 4.2 Student Identity & Guardianship *(Phase 1)*

**Description:** The platform's namesake capability. One immutable identity per student for life; institution relationships attach to it; families and adulthood are modelled explicitly. Realizes UJ-4, UJ-6, UJ-7.

- **FR-6: Immutable platform identity.** The Platform assigns each Student a globally unique, immutable 1StudentID (identifier) at first enrolment; it never changes across Tenant transfers. `[ASSUMPTION: S-XXXX format]`
- **FR-7: Multi-Tenant enrolment records with legacy identity.** A Student can hold Enrolment Records at multiple Tenants simultaneously (cap 10); each record preserves the Tenant's Legacy ID and Legacy System; each Tenant sees only its own record. Searching a roster by Legacy ID works.
- **FR-8: Minor/adult lifecycle.** Students are classified minor/adult by DOB against a configurable age of majority (default 18). Minors are guardian-linked: guardians approve enrolments and payments, acknowledge SRB, and rate staff on their behalf; minors cannot rate staff. Adults are self-managed. Transition to self-managed occurs automatically at majority, reducing guardian access unless the Adult Student explicitly re-consents.
- **FR-9: Co-guardianship.** A Minor Student can have two Guardians with separate logins; both see the same children; either can pay any invoice, and payments record who paid (`paidBy`). Realizes UJ-4, UJ-11.

#### 4.3 Multi-Tenancy & Isolation *(Phase 1 — the "plumbing that cannot be retrofitted")*

**Description:** Tenant isolation is a first-class functional requirement, not an infrastructure detail. The prototype demonstrates the scoping rules on every page; production enforces them in the data layer. Realizes UJ-1, UJ-7, UJ-12.

- **FR-10: Hard tenant isolation.** Every Tenant-scoped datum is attributable to exactly one Tenant; no tenant-facing path can ever read another Tenant's data. A shared Student's other institutes are invisible to each Tenant (only the student's own family sees the unified view).
  - Release acceptance: an accredited pen test attempting cross-tenant access finds zero paths.
- **FR-11: Tenant provisioning & onboarding wizard.** A Platform Admin (or invited customer) can onboard a Tenant through the 4-step wizard (details → branding → migration source → first cohort) ending in a live, seeded, branded workspace. Target: provisioned in minutes.
- **FR-12: Tenant offboarding.** *(Phase 3)* Offboarding enters a 30-day retention window, then an irreversible deletion cascade producing a signed deletion certificate.
- **FR-13: Cross-tenant enrolment by consent.** Staff can look up an existing platform Student **only** by an exact identifier they already hold (registered email or 1StudentID); the lookup returns availability only (masked, no profile). An enrolment request notifies the approver (Adult Student or Guardian) via email + SMS; access to relationship data is granted only after OTP or secure-link confirmation; requests expire (default 72 h); both sides' Audit Trails record every step. Realizes UJ-7.

#### 4.4 Module Entitlements & Plans *(Phase 1)*

**Description:** The 24-Module catalog with per-Tenant entitlements is the commercial backbone (Starter/Growth/Enterprise presets) and the deployment-risk control (ship broad, enable narrow). The prototype's client-side Module Gate becomes UX-only sugar over server enforcement.

- **FR-14: Module catalog & entitlements.** Modules are independently enableable per Tenant; Platform Admin controls all entitlements; Institute Admin can toggle within plan limits; sidebar and routes reflect entitlements immediately.
- **FR-15: Server-side entitlement enforcement.** Every protected operation checks entitlement server-side (disabled Module → explicit "not entitled" response); plan changes propagate to active sessions within 60 s.

#### 4.5 Users, Roles & Access *(Phase 1)*

- **FR-16: Role model.** The Platform supports Student (minor/adult), Guardian/Co-Guardian, Teacher/Coach, Institute Admin, Platform Admin, plus auxiliary staff roles (counselor, marketing officer, finance officer) with role-derived navigation and page capabilities as inventoried in the prototype.
- **FR-17: User administration.** Admins can invite users, bulk-import via CSV, and see role/last-login/MFA status. Institute Admin invitees are pinned to their Tenant; scoping rules follow §4.3.

#### 4.6 White-Label Branding *(light in Phase 1; full in Phase 3)*

**Description:** "Branded-per-tenant, centrally governed" is a selling point in this market, not a cosmetic. Realizes UJ-1.

- **FR-18: Tenant branding.** An Institute Admin can set name, tagline, brand colour + gradient theme, logo, vision/mission/description; the whole tenant workspace re-themes live, with a "Powered by 1StudentID" footer. *(Phase 3 adds: custom domains with auto-TLS, per-tenant subdomain.)*
- **FR-19: Platform landing branding.** The Platform Admin can brand the public landing/login surface (logo, headline controls, story).

#### 4.7 Workspace & Preferences *(Phase 1)*

- **FR-20: Localisation & currency.** Per-user language (launch set: English, Sinhala, Tamil, French), display currency (GBP default; USD/LKR/INR/EUR), light/dark theme; amounts stored in a base currency and converted for display. `[ASSUMPTION: launch language/currency set carried over from prototype; UK launch may trim this — confirm.]`
- **FR-21: Navigation aids & notifications.** Global command palette (navigate, quick actions, entity search) and a notification centre with unread counts and per-type deep links (grade → grades, billing → finance, incident → swim reports).

---

### B. Academic Core

#### 4.8 Student Information (SIS) *(Phase 1)*

**Description:** The roster is the system of record. Realizes UJ-1.

- **FR-22: Roster & profiles.** Staff can create, search (name / 1StudentID / guardian / Legacy ID), filter, and manage Students with status, grade/batch, attendance %, GPA, risk flag, guardian links, and multi-institute chips; Institute Admin sees only own-roster students. Profile holds legal+preferred name, DOB, contacts, guardian relationships, and consent-gated photo; medical/SEN data is special-category (encrypted, access-restricted).
- **FR-23: Bulk import/export.** CSV import with field mapping, template download, duplicate detection, validation report, and dry-run preview; idempotent commit; CSV export. Realizes UJ-1 edge case.
- **FR-24: Student record audit.** Field-level audit trail on student records (who changed what, when).

#### 4.9 Courses & Capacity *(Phase 1)*

- **FR-25: Course management.** Staff can create and manage courses (title, code, category, teacher(s), credits, schedule, price, status draft/active/archived) with search/filter and CSV import; enrolment counts tracked.
- **FR-26: Capacity & enrolment planning.** Course and dashboard views show seat fill %, health status (under-filled/low/healthy/full) with advice, staff-only revenue-impact framing (earning now vs at-capacity), and per-course seat overrides with reset. `[ASSUMPTION: waitlists (baseline SRS CRS-005) included at Phase 2.]`

#### 4.10 Attendance *(Phase 1)*

**Description:** The single most-used daily action; speed is the requirement. Realizes UJ-2.

- **FR-27: Bulk register capture.** A Teacher/Coach can capture a class register in under 30 seconds: roster defaults Present; per-row P/L/A with inline reasons; multi-select bulk marking; all-present/all-absent/reset; live counters; single Publish commits the register.
- **FR-28: Role-scoped attendance views.** Students see their own history and trend; Guardians see per-child history; staff see management views (counters, trends, today's check-ins) plus single-entry marking.
- **FR-29: Integrity & alerts.** Confirmed attendance records are immutable — corrections create linked correcting records with reason and authoriser. Configurable unexcused-absence alerts notify Guardians (in-app/email/SMS; default threshold 1).
- **FR-30: Advanced capture methods.** *(deferred)* QR self-check-in at Phase 2 `[ASSUMPTION]`; RFID, GPS geofence, and facial recognition remain designed-for but **disabled by default and blocked behind an approved DPIA per Tenant** with explicit consent — not in initial compliance scope (§5).

#### 4.11 Calendar & Scheduling *(Phase 1)*

- **FR-31: Unified calendar.** Week/month calendar combining class meetings (from course schedules), assignment deadlines, and exams/meetings, with event detail and join-class links.

#### 4.12 LMS Content *(Phase 2)*

- **FR-32: LMS hub.** Per-course learning hub: live-class join, content modules (recorded lectures, documents), discussion forums, and learner progress (completion %, time, scores).
- **FR-33: Standards-based content.** SCORM 1.2/2004 and xAPI packages in tenant storage with a per-tenant learning record store; content versioning with rollback. *(Phase 2, later slice.)*

#### 4.13 Assignments & Grades *(Phase 2)*

- **FR-34: Assignment lifecycle.** Staff publish assignments (title, course, due); Students submit (file ≤100 MB configurable / text / link) with timestamps and late flags; statuses Pending → Submitted → Graded with notification on grading.
- **FR-35: Gradebook & report cards.** Configurable grading schemes per course (percentage, letter, GPA, custom rubric); student/guardian report-card views; exports (CSV/PDF/spreadsheet).
- **FR-36: Grading workbench.** Per-class score entry with per-row Publish and Publish All; published rows lock; corrections follow the same correcting-record pattern as attendance.

#### 4.14 Teacher Workspace & Development *(FR-37 Phase 1; FR-38–39 Phase 2/3)*

- **FR-37: My Classes.** A Teacher sees their classes (batch, roster size, room, next session) with Start Class; the Coach variant shows per-day Sessions. Realizes UJ-2, UJ-8.
- **FR-38: Training & CPD.** *(Phase 2)* A CPD catalog with enrolment, lesson-level progress, and an issued, printable certificate at 100% completion; discipline-filtered catalogs (aquatics CPD for swim staff).
- **FR-39: Appraisals.** *(Phase 3 — socially sensitive; ship after trust is established)* Blended teacher score (60% family star ratings / 40% student performance) with star histograms; Guardians and Adult Students rate (with an anonymous option — author hidden from the rated Teacher, visible to admins); Minors blocked from rating; scoping per role; each Teacher sees their own appraisal.

---

### C. Family Engagement

#### 4.15 Student Record Book *(Phase 1 — deliberate MVP addition; the stickiness engine)*

**Description:** The SRB is why families open the app daily and the product's #1 claimed differentiator. Realizes UJ-3.

- **FR-40: Entries & types.** Staff post typed Entries (academic note, behaviour +/−, health & wellbeing, homework, permission slip, communication, remark, **Safeguarding**) with canned templates, pinning, and per-entry require-acknowledgement. Safeguarding Entries notify the DSL immediately, are hidden from student/family unless DSL-approved, and are excluded from exports/DSAR without DSL review.
- **FR-41: Two-way threads & acknowledgement.** Guardians (or Adult Students for themselves) acknowledge tracked Entries (who + when recorded); any thread participant can reply; unacknowledged required Entries escalate (48 h reminder). Guardians can initiate "note for teacher" entries.
- **FR-42: Portfolio & retention.** The per-student book is printable as a portfolio; hero shows attendance/GPA/needs-ack/dues (discipline-variant aware); retention respects statutory floors per entry type (UK safeguarding: 25 years) and never deletes below them.

#### 4.16 Family Portal *(Phase 1)*

- **FR-43: Unified family dashboard.** One Guardian login covers all linked children across all Tenants: per-child attendance, GPA, dues, next class, institute chips; award/certificate cards where a Discipline Pack provides them. Data per institution is shown separately. Realizes UJ-4.
- **FR-44: Course selection & fee preview.** *(Phase 2, with Finance)* A family (or Adult Student) can toggle course enrolments and book revision sessions, with a live "what will I pay" monthly preview computed by the same billing engine that issues real invoices. Realizes UJ-5.

#### 4.17 Messaging *(Phase 1)*

- **FR-45: Tenant-scoped messaging.** 1-to-1 DMs and group chats with search, unread markers, read receipts, emoji, and attachments (≤2 MB, image preview); strictly Tenant-scoped — cross-tenant messaging is impossible; discipline-scoped contexts under a Pack (club threads only).
- **FR-46: Broadcast groups & channels.** Admins create session/class-scoped broadcast groups whose membership auto-resolves (staff + each enrolled student's guardians / adult students; any member posts). System messages (e.g. certificate notifications) land as real messages. Delivery channels: in-app at Phase 1; email, SMS, and push notifications per user preference as channels come online (§4.36 for push). Realizes UJ-8.

---

### D. Finance & Commerce *(Phase 2 — first fast-follow, built first; fee collection is the purchase reason for the coaching segment and mandates are club lifeblood)*

#### 4.18 Fee Configuration

- **FR-47: Fee plans.** Admins define per-course Fee Plans: billing model (per-session with weekday schedule / monthly-annualised / term-block), rates, and VAT treatment (standard 20% / exempt / zero-rated).
- **FR-48: Discounts, credits, closures.** Admins define discounts (multi-course bundle, sibling — derived from shared-guardian families, time-boxed promos, targeted bursaries), per-student absence/goodwill credits by month, and closure dates/ranges the billing engine skips.

#### 4.19 Billing & Invoicing

- **FR-49: Monthly billing run.** For a chosen month the engine drafts per-child itemised invoices (per-session dates, discounts, credits, VAT) with a totals row; admin issues per-invoice or Issue All; duplicate issue per student+month+scope is blocked; issued invoices carry the period linkage to rebuild the itemised breakdown. Realizes UJ-5.
- **FR-50: Invoice lifecycle.** Role-scoped invoice views (family sees own children; Institute Admin own Tenant; Club Manager club scope; Platform Admin all); statuses issued/paid/overdue/refunded; printable/PDF UK-VAT-compliant invoice detail; reconciliation and collection reporting.

#### 4.20 Payments

- **FR-51: Online payments.** Families and Adult Students pay invoices in-app via PCI-DSS-certified gateways; the Platform never stores raw card data. `[ASSUMPTION: UK launch gateways = Stripe (cards/wallets) + GoCardless (Direct Debit); the prototype's regional gateways (PayHere, Razorpay, Telr) deferred with their jurisdictions.]` Payments record `paidBy` for co-guardian attribution. Realizes UJ-4.
- **FR-52: Mandates & collections.** Per-family payment method and Mandate status (Active/Pending/Failed); Off-boarded students show Stopped; failed mandates surface for follow-up.

#### 4.21 Marketplace *(Phase 3)*

- **FR-53: Cross-tenant course catalogue.** Tenants opt-in publish courses to a platform-wide discoverable catalogue; only the published catalogue is shared — all transactional data stays in each Tenant's boundary.

---

### E. Growth & Intelligence

#### 4.22 Marketing & CRM *(Phase 3)*

- **FR-54: Lead pipeline.** Lead table (source, programme interest, stage New→Contacted→Qualified→Demo Booked→Closed Won/Lost, owner, value) with click-to-call/email, outreach logging (call/email/WhatsApp/SMS/meeting + note, optional stage auto-advance), and an activity feed; discipline-scoped lead views under a Pack.

#### 4.23 AI & Analytics *(FR-57 core reports Phase 2; AI Phase 3 — needs real history)*

- **FR-55: AI insights.** Tenant-scoped, in-region AI over the Tenant's own data (never trained across tenants): at-risk flags, pass/fail and dropout prediction, recommendations — every insight with a plain-language factor explanation, and **individual-student insights require staff confirmation before surfacing or acting** (no fully automated decisions about students). AI transparency notice shown to families.
- **FR-56: AI copilot.** Role-aware assistant drawer (draft messages, summarise, answer analytics questions) with a distinct persona per Discipline Pack (aquatics copilot for swim accounts).
- **FR-57: Reports & BI.** Role-appropriate dashboards (revenue, attendance, funnel, plan mix, risk distribution) and pre-built reports with exports; exports >10,000 rows run async with secure expiring links.

#### 4.24 Sales Demo Tooling *(carried asset — maintained through all phases)*

- **FR-58: Guided demo & presentation controls.** The scripted self-driving Guided Demo (persona auto-login, spotlight, live UI actions, hybrid pacing, resumable) and presenter controls (hide demo accounts/nav items, reset demo data) remain a maintained internal sales asset against demo tenants — never available inside a real Tenant. `[NOTE FOR PM: decide whether the tour engine later productises into customer onboarding tours.]`

---

### F. Operations, Compliance & Platform Administration

#### 4.25 Migration & Imports *(importers Phase 1 via FR-23; connectors Phase 3 — pull forward if deals are lost to migration fear)*

- **FR-59: Bulk importers & run history.** CSV importers for students, courses, invoices, and users with mapping, templates, validation, dry-run, idempotent re-run, and an auto-logged migration-run history; large jobs async with progress and post-run reconciliation report; migrated data lands only inside the Tenant boundary.
- **FR-60: Legacy LMS connectors.** Dedicated Moodle connector at minimum (users, courses, enrolments, content, gradebook, completion via Web Services API/backup import), extensible to Google Classroom/Canvas/Blackboard; source-ID mapping retained for reconciliation and rollback.

#### 4.26 Compliance Operations *(baseline manual ops Phase 1; full module Phase 3)*

**Description:** Initial scope is **UK GDPR (incl. DPA 2018, ICO Children's Code) + Cyber Essentials Plus** — the module ships UK-first, with the wider framework registry (EU GDPR, FERPA/COPPA, ISO 27001, SOC 2) deferred (§5, addendum).

- **FR-61: DSAR lifecycle.** Intake → identity verification → cross-module data assembly → review (DSL review for safeguarding items) → delivery → closure, with a due-date queue and UK GDPR 30-day SLA timers. *(Pilot scale may run assembly semi-manually; the queue and audit are Phase 1.)*
- **FR-62: Retention & consent.** Per-category retention schedule (lawful basis, period, action) with automated enforcement and deletion reporting; consent records for photos and other consent-gated processing with withdrawal tracking.
- **FR-63: Audit trail.** Append-only, tamper-evident audit log of security-significant events (auth, permission/config changes, exports, DSAR actions, break-glass); admin-visible feed; hash-chaining at Phase 3.

#### 4.27 Platform Administration *(minimal console Phase 1; franchise console Phase 3)*

- **FR-64: Tenant portfolio console.** Platform Admin manages Tenants (CRUD/suspend, country, plan, status, MRR), entitlements, and portfolio dashboards; Institute Admins see only their own Tenant row. Cross-tenant aggregates come from an analytics path, never live cross-tenant queries. Realizes UJ-12.
- **FR-65: Privileged access.** *(Phase 3)* Break-glass access to Tenant data is multi-approver, time-limited, tenant-notified, and fully audited; platform-admin console lives on a separate surface from the tenant app.

---

### G. Discipline Customization — Framework & Swim Pack

*The layering directive: everything in this group is built **on top of** the core platform. G.1 is the reusable mechanism; G.2+ is the first pack (Swim). A second pack must be buildable without touching core modules.*

#### 4.28 Discipline Pack Framework *(Phase 1, proven by shipping the Swim Pack on it)*

**Description:** What the prototype does with a `discipline: "Swimming"` flag becomes a first-class extension mechanism: a Pack bundles curated navigation, vocabulary, screens, seed/reference data, and scoping rules so a discipline account experiences a single-purpose product. Market research: this semantic swap — not module toggles — is the defensible differentiator.

- **FR-66: Pack activation & single-purpose experience.** A Tenant (or account within it) activated for a Pack gets the Pack's curated menus and landing (e.g. coach → straight to club home), sees only Pack-scoped data everywhere (roster, record books, finance, CRM, training, users, messages), and sees nothing of the school-flavoured UI. Realizes UJ-8.
- **FR-67: Semantic remapping.** The Pack remaps core semantics: classes→Sessions, teachers→Coaches, grades→Levels/Awards, timetable→session schedule with cover, term billing→family/seasonal billing — while reusing the core data model and modules underneath.
- **FR-68: Pack packaging.** A Pack is a productised unit (config + menus + screens + seed catalog + copilot persona) installable per Tenant without code changes to core; the Swim Pack is the reference implementation. `[NOTE FOR PM: second pack candidate (e.g. football/gymnastics/music) is an open question — OQ-8.]`

#### 4.29 Swim Pack: Club Home & Facilities *(Phase 1 — swim segment MVP)*

- **FR-69: Club home & pool map.** Club landing with swimmers/coaches/sessions/pools stats, level chips, a visual lane-by-lane **pool map** of concurrent Sessions per day/slot (level colour-coding, occupancy), weekly timetable by day, coaching-team cards, and facilities panel; families see only their own Sessions.

#### 4.30 Swim Pack: Sessions & Poolside Operations *(Phase 1)*

- **FR-70: Session operations.** Effective-roster staff run a Session from one screen: brief (pool, zone·lanes, capacity, present count), coaches-on-deck, per-swimmer P/L/A attendance with sticky save, and a record-book note composer (with 1–5 performance rating). Realizes UJ-8.
- **FR-71: Swimmer moves.** Staff move a swimmer to another Session temporarily (today, auto-revert 12 h, countdown badge, manual move-back) or permanently (home-session change), with reason; effective rosters update everywhere (attendance, capacity, access control).
- **FR-72: Incidents, wellbeing & safety.** Staff log incidents (type Safety/Behaviour/Health/Equipment, severity, swimmer, action taken) feeding reports; per-swimmer wellbeing checks (Green/Amber/Red + note); per-session pool safety checklist (lifeguard on deck, lane ropes, headcounts, rescue equipment).

#### 4.31 Swim Pack: Awards, Levels & Certificates *(Phase 1)*

- **FR-73: Award pathway authoring.** Club Managers author Awards in strands (e.g. Duckling 1–4, Learn-to-Swim stages) with activity checklists, badge tones, and "leads to" progression; catalog views show per-award rosters and progress stats.
- **FR-74: Activity tracking & auto-certification.** Coaches assign awards and tick activities live in a Session; the final tick auto-certifies: Certificate generated, guardians notified via messaging immediately. Realizes UJ-8.
- **FR-75: Printable certificates.** Print-ready certificates (award styling, swimmer name, date, next-step text, criteria on the back) linked from sessions, record books, dashboards, and family views.
- **FR-76: Level assessment & promotion.** Staff record Level Assessments (criteria ticks → Qualified/Not yet) against the club ladder and promote qualified swimmers into next-level Sessions; the SRB shows a level & progression card.

#### 4.32 Swim Pack: Competitive Squad *(Phase 1)*

- **FR-77: Race times & PBs.** Staff log race times (event, time, meet, date) with instant PB detection (🏅 flags); swimmer × event PB board; coach sees own squad, manager the whole squad. Realizes UJ-11.

#### 4.33 Swim Pack: Coach Operations *(Phase 1)*

- **FR-78: Absence & cover.** The Club Manager marks a coach absent (typed reasons) with optional substitute, or arranges **Temporary Cover that auto-reverts in 12 h** (countdown, end-now); permanent roster add/remove per Session; off-boarded coaches cannot be rostered. Cover changes grant/revoke session access accordingly. Realizes UJ-9.
- **FR-79: Coach lifecycle & development.** Off-board/reactivate coaches (GDPR-safe leaver); assign CPD with due dates and track completion; set Club Grades (Bronze/Silver/Gold/Platinum + private note) with a club-wide visibility toggle.

#### 4.34 Swim Pack: Swimmer Lifecycle *(Phase 1)*

- **FR-80: Register & manage swimmers.** Register a new swimmer (name, DOB, starting level, session assignment) with the **age-reactive login model** (minor → guardian holds login; 18+ → own login; sign-in method choice) and optional Co-Guardian with own login; manage per-swimmer programme (sessions add/remove); CSV export. Realizes UJ-10.
- **FR-81: Enrol existing & off-board.** Enrol an existing platform swimmer via the Consent Flow (FR-13) into a chosen Session; off-board a swimmer (reason, effective date, stop-recurring-billing and stop-automated-messaging switches → status Inactive, mandate Stopped) and reactivate with history intact. Realizes UJ-10.

#### 4.35 Swim Pack: Summary Reports *(Phase 1)*

- **FR-82: Period reports.** Daily/Weekly/Monthly/Yearly reports with period stepping: sessions conducted, attendance rate, ratings, incidents (open/closed), swimmer attendance breakdown, capacity utilisation, coach attendance & cover, record-book activity, wellbeing counts with follow-ups; print/export; coach-scoped variant. Realizes UJ-9.
- **FR-83: Monthly HR evaluation.** Manager-only monthly roll-up: per-coach sessions led, absences, cover carried, **reliability %**, ratings, incidents; per-swimmer attendance worst-first with sub-75% flags.

---

### H. Native Mobile Apps *(Phase 2 start — family-facing first `[ASSUMPTION]`)*

#### 4.36 iOS & Android Apps

**Description:** Per user decision, native mobile is committed scope (resolving the SRS conflict in favour of the baseline SRS). Families are the primary mobile audience; staff daily-ops (attendance, poolside) are the second wave. Realizes UJ-11.

- **FR-84: Family-facing apps.** Native iOS + Android apps (App Store / Google Play) with parity for family tasks: dashboards, attendance, grades, SRB (acknowledge/reply), messaging with push notifications, award/certificate views, and in-app gateway-hosted fee payment (no raw card data in the app). Tenant branding and locale apply.
- **FR-85: Staff mobile daily-ops.** Attendance capture and swim Session operations (register, activity ticking) optimised for phone use — the web app is responsive from Phase 1; native staff flows follow family apps.
- **FR-86: Mobile platform requirements.** Push via platform services; biometric/device unlock as convenience; offline-tolerant reads and queued offline actions (attendance) with conflict handling; no unencrypted personal data at rest; cache cleared on sign-out/remote revocation; minimum-OS policy with forced-update prompts; WCAG 2.1 AA.

## 5. Cross-Cutting Non-Functional Requirements

**Performance.** API reads ≤200 ms p95 under normal load; page TTI ≤3 s on 4G; ≥500 concurrent users per mid-sized Tenant without degradation; bulk exports >10k rows async. Design headroom (not launch capacity): 10,000 Tenants / 5M users without redesign.

**Availability & recovery.** 99.9% monthly uptime target; automated failover RTO ≤15 min / RPO ≤5 min; backups ≥ every 6 h with 35-day PITR, stored in-jurisdiction (UK); planned maintenance outside school hours with 72 h notice.

**Security (Cyber Essentials Plus posture + secure SDLC).** Zero OWASP Top-10 Critical/High at major release; server-side validation everywhere; TLS 1.3 (1.2 legacy-whitelist only); AES-256 at rest; special-category fields app-layer encrypted with per-tenant keys (managed KMS, rotated); secrets never in code/logs; boundary firewalls/WAF, patched and malware-protected estate, least-privilege access control and MFA per CE+ control themes; accredited (CHECK/CREST) pen test pre-launch and annually — cross-tenant isolation is an explicit pen-test objective (FR-10).

**Privacy & compliance (initial scope).** UK GDPR + DPA 2018 as the legal baseline, with ICO Children's Code age-appropriate design (max-privacy defaults for minors, no behavioural ads, no harmful profiling) and safeguarding-aware features (SRB safeguarding handling, 25-year UK retention floor) `[ASSUMPTION: safeguarding features retained in scope since UK schools/clubs require them, even though KCSIE certification per se is not claimed]`. DSAR within 30 days. **Deferred (tracked in addendum):** EU GDPR ops, FERPA/COPPA, PIPEDA/DPDP/PDPA/PDPL, ISO 27001, SOC 2, multi-region data residency, biometric capture DPIAs.

**Data residency.** Single UK region at launch (UK South, DR UK West per board-approved design); all tenant PII stored and processed in-region; the future multi-region model (regional stamps + non-PII global control plane) is an architecture constraint to not preclude, not a launch deliverable.

**Accessibility & usability.** WCAG 2.1 AA on web and native apps with CI accessibility gates; common tasks completable without training (attendance <30 s/class is the canonical target).

**Observability.** Structured logs with correlation IDs end-to-end; distributed tracing; alerting on error rate, latency, login-failure spikes, capacity, cert expiry.

## 6. Delivery Phasing & MVP Scope

*Full 24-module catalog is committed scope; phases order it. Dual-segment GTM means Phase 1 ships the shared core **plus** the Swim Pack.*

### 6.1 Phase 1 — "Run My Institute Daily" MVP (pilot launch)

**Shared core:** Identity/auth (FR-1..5), Student identity & guardianship (FR-6..9), Tenancy & onboarding (FR-10, 11, 13), Entitlements (FR-14..15), Users/RBAC (FR-16..17), light Branding (FR-18..19), Preferences/nav (FR-20..21), SIS (FR-22..24), Courses & capacity (FR-25..26), Attendance (FR-27..29), Calendar (FR-31), Teacher workspace (FR-37), **SRB (FR-40..42)**, Family portal (FR-43), Messaging (FR-45..46 in-app), baseline compliance ops (FR-61..63 at pilot depth), minimal platform console (FR-64), CSV importers (FR-59).
**Swim segment pack:** Framework (FR-66..68) + Club home (FR-69), Sessions & poolside (FR-70..72), Awards/levels/certificates (FR-73..76), Squad (FR-77), Coach ops (FR-78..79), Swimmer lifecycle (FR-80..81), Swim reports (FR-82..83).
**Explicitly not in Phase 1:** Finance, LMS, Assignments/Grades, AI, Appraisals, Marketplace, CRM, full Compliance module, connectors, native apps.

### 6.2 Phase 2 — Monetization & academic depth (sequenced by revenue impact)

1. **Finance first** (FR-47..52) — fee collection is the purchase reason for coaching buyers and mandate collection is club lifeblood. Moves *into* Phase 1 if pilot prospects won't sign without it. `[NOTE FOR PM: standing board trigger.]`
2. Grades + Assignments (FR-34..36), then LMS (FR-32..33).
3. Reports & BI core (FR-57), Course selection & fee preview (FR-44), waitlists (FR-26 note), QR check-in (FR-30).
4. Training/CPD (FR-38). **Native mobile apps begin (FR-84..86), family-facing first.**

### 6.3 Phase 3 — Differentiation & scale

Franchise/multi-tenant console depth + privileged access (FR-64 depth, FR-65, FR-12), Appraisals (FR-39), AI insights + copilot (FR-55..56), Marketing CRM (FR-54), full Compliance module incl. hash-chained audit (FR-61..63 full), Migration connectors (FR-60 — pull forward on demand), Marketplace (FR-53), full white-label incl. custom domains (FR-18 full), staff mobile wave (FR-85), demo tooling decisions (FR-58 note).

## 7. Success Metrics

*Anchor: a paid UK pilot of 1–3 tenants (at least one tuition/coaching institute and one swim club) live on production.*

**Primary**
- **SM-1 Pilot conversion:** ≥2 paying Tenants (≥1 per segment) live on production and past their first renewal decision. Validates the whole Phase-1 loop (FR-10..46, FR-66..83).
- **SM-2 Daily-ops activation:** each pilot Tenant captures attendance/session registers on ≥80% of its operating days over a rolling 4-week window. Validates FR-27, FR-70.
- **SM-3 Family stickiness:** ≥60% of Guardians active weekly; ≥90% of require-acknowledgement SRB Entries acknowledged within 48 h. Validates FR-40..43.

**Secondary**
- **SM-4 Register speed:** p75 class register capture <30 s (FR-27).
- **SM-5 Onboarding time:** tenant live (branded, roster imported) within one working day of contract (FR-11, FR-23).
- **SM-6 Billing accuracy (Phase 2):** ≥95% of billing-run invoices issued without manual correction; measurable fall in fee-chasing time reported by pilot admins (FR-49..52).
- **SM-7 Swim ops adoption:** 100% of club Sessions run through the platform in week 4+; certificates issued digitally within 24 h of award completion (FR-70, FR-74).

**Counter-metrics (do not optimize)**
- **SM-C1 Modules enabled per Tenant** — breadth is a sales asset and a deployment liability; activation depth (SM-2/3) beats module count. Counterbalances SM-1.
- **SM-C2 Notification volume per Guardian** — stickiness must not be spam; guardian notification opt-out rate stays <5%. Counterbalances SM-3.
- **SM-C3 Support tickets per Tenant per week** — onboarding speed (SM-5) must not ship confusion downstream.

## 8. Open Questions

1. **OQ-1:** Final 1StudentID identifier format — prototype `S-XXXX` vs production-SRS `OE-XXXXXXXXXX` (assumed S-XXXX).
2. **OQ-2:** Public domain & per-tenant subdomain scheme post-rename (docs still say `oneedu.io`).
3. **OQ-3:** Confirm UK launch payment gateways (assumed Stripe + GoCardless) and platform fee handling.
4. **OQ-4:** Confirm pricing points (legacy anchor: Starter ~£299/mo, Growth ~£799/mo) against 2026 market anchors in the research extract.
5. **OQ-5:** Native app entry timing — assumed Phase 2 family-first; confirm against pilot feedback and budget.
6. **OQ-6:** Moodle connector priority — Phase 3 by default, standing trigger to pull forward if deals are lost to migration fear.
7. **OQ-7:** Appraisal rollout policy (opt-in per tenant? minimum review counts before display?) — socially sensitive.
8. **OQ-8:** Second Discipline Pack candidate and timing (validates FR-68 genuinely reusable).
9. **OQ-9:** DSL (safeguarding lead) staffing/verification model for clubs vs schools.
10. **OQ-10:** Launch language set — trim prototype's Sinhala/Tamil/French for UK pilot or keep?
11. **OQ-11:** Does the guided demo engine productise into customer onboarding tours (FR-58 note)?

## 9. Assumptions Index

- §3/FR-6 — 1StudentID identifier stays `S-XXXX` (OQ-1).
- §4.7/FR-20 — prototype language/currency set carried to launch (OQ-10).
- §4.9/FR-26 — waitlists included at Phase 2.
- §4.10/FR-30 — QR self-check-in at Phase 2; biometric methods deferred beyond initial compliance scope.
- §4.20/FR-51 — Stripe + GoCardless as UK launch gateways (OQ-3).
- §4.36/H — native apps begin Phase 2, family-facing parity first (OQ-5).
- §5 — safeguarding features (SRB safeguarding type, 25-y retention) retained despite narrowed compliance scope.
- §6.1 — Swim Pack ships in Phase 1 because GTM is dual-segment (user decision) even though the board deck's lean-most MVP was coaching-only.
- §7 — pilot includes at least one tenant per segment.

---

*Companions: `addendum.md` (hosting/stack decisions, cost operating points, conflict resolutions, deferred-compliance register), `extract-prototype.md`, `extract-legacy-docs.md`, `extract-market-research.md`, `.memlog.md` (decision log).*
