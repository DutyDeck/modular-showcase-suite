# Legacy Documentation Extract — Consolidated

Extracted 2026-08-25 from git history (`git show HEAD:<path>`) for the PRD workflow. All source files are deleted in the working tree but intact at HEAD.

**Sources recovered (7/7):**

| Source | Version / Date | Nature |
|---|---|---|
| `docs/SRS-OneEdu.md` ("baseline SRS") | v1.0.1, 2026-06-06 | Pre-development SRS, ISO 29148-styled, requirements baseline |
| `docs/SRS-OneEdu-Production.md` ("production SRS") | v1.0.0, 2026-06-04 | Production-readiness SRS: multi-tenancy, geo-separation, compliance |
| `docs/Hosting-Architecture-OneEdu.md` | v1.1, June 2026 | Board briefing: Azure hosting design (single + multi-region) |
| `docs/CostEstimation-OneEdu.md` | v1.0.0, 2026-06-04 | 18-month dev + Azure hosting cost model (Scenarios A/B) |
| `docs/CostEstimation-AIAugmented.md` | v1.0.0, 2026-06-04 | Replaces cost scenarios A/B with lean AI-augmented plan |
| `1StudentID-Product-Strategy.docx` | July 2026 | Product strategy: MVP definition & phased roadmap |
| `1StudentID-Board-Deck.docx` | July 2026 | Board deck: MVP, segment comparison, timeline, pod-month costs |

**Naming note:** the June 2026 documents call the product **One Edu** ("Education Super App"); the July 2026 strategy/board documents call it **1StudentID**. Same product/prototype (this repo, `modular-showcase-suite`); the July documents are the most recent statement of strategy.

---

## 1. Product Vision & Strategy

*(Sources: 1StudentID-Product-Strategy.docx, 1StudentID-Board-Deck.docx, SRS-OneEdu §2.1/§4)*

### Vision (SRS-OneEdu §2.1)
> "One platform that any educational institution can adopt to run its entire operation — teaching, attendance, records, finance, and family engagement — while guaranteeing that each institution's data is its own, kept in its own jurisdiction, and handled in line with the law that applies to it."

Two founding, non-negotiable principles: (1) **data security through isolation** — tenant isolation is a first-class functional requirement; (2) **compliance by design** — children's data means GDPR-class protection from day one.

### Positioning & what exists (Strategy doc, Board deck)
- Modular, **multi-tenant** education platform, single shared codebase, **24 entitlement-gated modules**, nearly all functionally built (prototype UI, not mocked). Entitlement tiering (Starter / Growth / Enterprise) already in place.
- **Three proven verticals on one platform:** traditional schools, tuition/coaching institutes, sports & swim clubs (multi-discipline).
- **Four roles:** student, parent (incl. co-parent), teacher/coach, admin (global + institute-scoped).
- **Claimed real differentiators** (vs generic SIS): Student Record Book (daily parent engagement), parent-rated Teacher Appraisal, Marketplace, per-institute white-label branding. Plus a guided self-running product demo for sales.
- Current state: prototype UI is built; the work ahead is a production backend, multi-tenant data model, and hardening — not rebuilding screens.

### Strategy: "Run My Institute Daily" MVP (Strategy doc; confirmed in Board deck)
- **Do not launch all 24 modules.** Breadth is a sales asset and a deployment liability. Ship a narrow, sticky daily-operations loop, get one institute genuinely dependent on it, then let customer pull dictate module order.
- **MVP shared core:** Core (dashboard/profile/settings/onboarding) · Student Information · Courses & Curriculum · Attendance · Calendar & Scheduling · Teacher Workspace · Family/Parent Portal · Messaging · Users & Roles (RBAC) · light white-label branding.
- **Two deliberate MVP additions:** Student Record Book (stickiness engine — makes parents open the app daily) and multi-tenant data isolation plumbing (tenant-scoped data now; franchise console later — skipping it forces a rewrite).
- **Explicitly excluded from MVP:** Finance, LMS, Assignments, Grades, AI, Appraisal, Marketplace, CRM, Compliance, Migration.
- **Phase 2 — Monetization & academic depth** (~5–7 weeks; sequenced by revenue impact): Finance & Fees **first** (fee collection is the real purchase reason for coaching/tuition buyers), then Grades + Assignments, LMS, Reports & BI, Teacher Training/CPD + Marketplace.
- **Phase 3 — Differentiation & scale** (~7–9 weeks): franchise/multi-tenant management console, Teacher Appraisal (parent ratings — novel but socially sensitive, ship after trust/data), AI Insights (needs real history), Marketing & CRM, Compliance & Audit + Migration (enterprise unlockers; pull Migration forward if deals are lost to data-migration fear), full white-label branding (colours, vision/mission, custom domains).

### Business model / commercial packaging
- Subscription tiers per tenant (both SRS docs): **Starter** (Core, Students, Courses, Attendance, Calendar; ≤500 users; business-hours support) · **Growth** (+ LMS, Grades, SRB, Finance, Messages, Reports; ≤5,000 users) · **Enterprise** (all modules + AI Insights, Marketplace, Migration, custom integrations; unlimited; 24×7).
- Indicative price points (CostEstimation-AIAugmented revenue section): Starter ~£299/mo, Growth ~£799/mo per tenant.

### The board decision: lead segment (Board deck)
| | Coaching / Tuition | Sports & Swim Clubs | Traditional Schools |
|---|---|---|---|
| Daily loop | Class + fee driven | Session + squad driven | Class + academic driven |
| Extra MVP modules | (lean core) | Sessions, Squad, Awards/Certs, Swim Reports | Grades, Assignments (expected day 1) |
| MVP effort | ~16–24 person-weeks | ~24–32 person-weeks | ~32–40 person-weeks |
| MVP timeline | 4–6 weeks | 6–8 weeks | 8–10 weeks |
| Time to first revenue | Fastest | Medium | Slowest |
| Deal size | Small–medium | Small | Largest |
| Competition | High | **Low (open field)** | High |

- **Recommendation:** lead with **Coaching/Tuition** for speed-to-revenue; keep the **Clubs demo warm** as differentiated second market (both reuse the same core). Finance confirmed as Phase-2 fast-follow built first.
- Open decision framed for the board: primary launch segment; whether Finance is MVP or fast-follow (moves into MVP if buyers won't sign without fee collection).

---

## 2. Requirements Inventory (Functional, by module)

Two SRS documents exist for the same product, both dated June 2026:
- **Baseline SRS** (`SRS-OneEdu.md` v1.0.1) — the stakeholder requirements baseline ("what"), implementation-agnostic, native-mobile-first.
- **Production SRS** (`SRS-OneEdu-Production.md` v1.0.0) — production-hardening spec ("how to make the prototype real"), Azure-specific, PWA-only.

They overlap heavily; below each module lists the shared substance with per-SRS notes. ID prefixes match both docs unless noted.

### 2.1 Authentication & Identity (AUTH-*)
*Both SRS.*
- Email/password with hardened hashing (Production: **Argon2id** per OWASP; Baseline: "salted, computationally-hard hashes").
- Federated SSO: OAuth 2.0 / OIDC / SAML 2.0. **Baseline v1.0.1 expands AUTH-002 to social providers: Google, Apple (App Store requirement wherever iOS offers 3rd-party login), Microsoft/Outlook, Facebook — brokered through Microsoft Entra External ID.** Production SRS lists Google Workspace, Microsoft Entra ID, custom SAML (no Apple/Facebook — superseded by baseline v1.0.1 and Hosting v1.1).
- **MFA mandatory for admin roles** (Baseline adds Compliance Officer); TOTP + WebAuthn/FIDO2; SMS OTP fallback only.
- Sessions: Production specifies 15-min JWTs + server-side refresh-token rotation, device/geo binding, account lockout (5 fails/10 min, exponential backoff), single sign-out. Baseline states these implementation-neutrally (limited lifetime, self-view/revoke sessions, lockout + notify, secure reset invalidating sessions, SLO).
- Password policy (Production): min 12 chars, HaveIBeenPwned breach check, configurable expiry, no reuse of last 12.
- **Server-side enforcement of every authorisation decision** (Baseline AUTH-010) — UI hiding is never the sole control.

### 2.2 One Edu ID & Student Identity
*Both SRS.*
- Globally unique, **immutable platform-wide student ID** assigned at first enrolment, persisting across institution transfers. (Production: format `OE-XXXXXXXXXX` per AUTH-010, though its own glossary says `S-XXXX` — internal inconsistency.)
- ID namespace managed by global control plane; identity record stored in the student's home geo-region; cross-region lookup returns stub only (Production AUTH-012).
- Guardian–student relationships verified (institution confirmation or document upload) before portal access.

### 2.3 Multi-Tenancy & Data Isolation (MT-*)
*Both SRS; Production is the implementation-specific superset.*
- Each institution = isolated tenant; every datum attributable to exactly one tenant; **no cross-tenant access ever** via tenant-facing paths (CON-002). Cross-tenant access only for Platform Admin via audited operations.
- Production model: shared application / isolated schema on PostgreSQL with **Row-Level Security**; `tenant_id` on every scoped table; ORM raises on unscoped queries; per-tenant blob containers with short-lived SAS (≤1 h).
- Tenant config server-side and authoritative; signed client entitlement caches (Production MT-005).
- Per-tenant configuration: name, logo, brand colour, timezone, locale, currency, academic calendar; unique subdomain (`<slug>.oneedu.io` in Production) + optional custom domain with auto TLS.
- Automated onboarding: verify → assign geo-region → provision isolated space → seed → invite admin (Production target < 5 min).
- Offboarding: retention window (Production: 30 days) → irreversible deletion cascade → **signed deletion certificate**.

### 2.4 Module Entitlement (MOD-*)
*Both SRS.*
- Functionality organised into independently enableable modules per tenant/plan. **Production MOD-001 enumerates 21 modules:** core, students, courses, attendance, calendar, lms, assignments, grades, srb, teaching, family, finance, marketing, marketplace, messages, ai, reports, tenants, users, migration, compliance. (Strategy docs say **24 modules** — see conflicts.)
- Server-side enforcement on every protected operation (Production: API-gateway signed entitlement token, HTTP 402 for disabled modules); frontend `ModuleGate` is UX-only, never sole enforcement.
- Platform Admin controls entitlements; Institute Admin may toggle within plan limits. Plan changes take effect in active sessions promptly (Production: ≤60 s via SSE). Module usage telemetered per tenant for billing/capacity, processed in-region.

### 2.5 Students Module (STU-*)
*Both SRS.*
- Profile: legal + preferred name, DOB, inclusive gender, nationality, consent-gated photo, contacts, guardian relationships, medical notes (special-category/encrypted), SEN flags, dietary requirements.
- Photo capture/display requires recorded guardian consent (timestamp + consenting user).
- **Cross-tenant enrolment**: student enrolled at multiple institutions simultaneously (Production: up to 10); each institution sees only its own relationship data; only the One Edu ID is shared.
- Bulk import with field mapping, duplicate detection, validation report, dry-run preview.
- Full field-level audit trail on student records.
- **Baseline-only — adult vs minor lifecycle (STU-008…011):** age-of-majority classification per jurisdiction (default 18, configurable); adult students fully self-managed (no mandatory guardian; own consents, payments, acknowledgements); minors require verified guardian; **automatic transition to self-managed at majority** with guardian access reduced/removed unless the adult student explicitly consents.

### 2.6 Cross-Tenant Enrolment / Consent-Gated Discovery (ENR-001…008)
*Baseline SRS only (§5.5.1) — not in Production SRS.*
- Admin lookup of an existing platform student **only** by exact identifier they already hold (registered email or One Edu ID); no fuzzy/browse discovery.
- Lookup returns **availability only** — no profile, contacts, institutions, or records.
- Enrolment request → approver (adult student or minor's verified guardian) notified via **email + SMS** → explicit confirmation via secure one-click link and/or OTP → request expires (default 72 h).
- Access to relationship data granted **only after** confirmation; decline/expiry grants nothing; all steps audit-logged on both sides.

### 2.7 Courses & LMS (CRS-*)
*Both SRS.*
- Course CRUD: title, description, subject, year group, teacher(s), capacity, enrolment period, status (draft/active/archived); enrolment management with waitlists (Baseline CRS-005).
- Standard e-learning content packages — Production specifies **SCORM 1.2 / SCORM 2004 / xAPI** in tenant blob storage, per-tenant **Learning Record Store** for xAPI statements. Baseline leaves standard choice as open issue OI-4 (SCORM/xAPI/LTI).
- Content version control with lossless rollback; learner progress tracking (completion %, time-on-content, scores).

### 2.8 Attendance (ATT-*)
*Both SRS.*
- Multi-modal capture: manual, QR code, RFID/card tap, GPS geofence, facial recognition.
- **Biometric methods disabled by default; enabling blocked without a completed, approved DPIA per tenant** + explicit recorded consent with non-disadvantaging opt-out.
- Biometric processing stays in the tenant's geo-region; templates never leave the boundary. GPS records geofence used; disabled where minor-location-tracking needs extra consent (Production ATT-004).
- Confirmed records **immutable**; corrections create linked correcting records with reason + authoriser.
- Configurable absence alerts to guardians (in-app/email/SMS; Production default threshold: 1 unexcused absence). Registers/summaries per class, student, period (Baseline ATT-007).

### 2.9 Grades & Assignments (GRD-*)
*Both SRS.*
- Configurable grading schemes per course: percentage, letter, GPA, custom rubric.
- Submissions: file upload (Production: max 100 MB configurable; external tool integration Google Drive/OneDrive), text entry, link; timestamps + late flags (Baseline GRD-003); teacher grading/annotation/feedback with student notification (Baseline GRD-004).
- Gradebook exports: CSV, PDF, Excel/spreadsheet.
- Plagiarism detection (Turnitin, LTI 1.3) as optional Enterprise add-on.

### 2.10 Student Record Book (SRB-*)
*Both SRS. The strategy docs identify SRB as the product's stickiness differentiator.*
- Entry types: academic note, behaviour (positive/concern), health & wellbeing, homework log, **safeguarding flag**, permission slip, general communication.
- Safeguarding entries: immediate DSL notification; hidden from student/parent without DSL approval; excluded from any export/DSAR without DSL review.
- Acknowledgement tracking (who, when; Production adds IP address) with escalation if unacknowledged; **Baseline SRB-006:** adult self-managed students acknowledge for themselves.
- Retention at statutory minimum per jurisdiction (e.g. **25 years UK safeguarding**), configurable per entry type but never below the floor.

### 2.11 Finance (FIN-*)
*Both SRS.*
- Multi-currency fee management/invoicing (Production: daily FX feed, e.g. Open Exchange Rates).
- PCI-DSS-certified regional gateways; **never store raw card data** (CON-003). Production names Stripe (primary) + PayHere (Sri Lanka), Razorpay (India), Telr (UAE).
- Fee schedule templates, discount codes, sibling discounts, scholarships/waivers.
- Jurisdiction-compliant invoices/receipts (GST India, VAT UAE/UK); invoice status lifecycle (issued/paid/overdue/refunded) + reconciliation and financial reports (Baseline FIN-005).
- Payers: guardians for minors; adult students for themselves (Baseline FIN-006).

### 2.12 Communications / Messages (MSG-*)
*Both SRS.*
- In-app messaging strictly tenant-scoped; cross-tenant messaging impossible. Real-time (Production: WebSocket/SSE).
- Notification channels: in-app, email, SMS, push (FCM/APNS), per user preference; Production names Azure Communication Services (SMS primary, Twilio fallback).
- Targeted announcements (class/year/school-wide) rate-limited against flooding.
- Message content stored in-region; metadata retained per tenant retention policy.

### 2.13 AI Insights (AI-*)
*Both SRS.*
- Operates only on the tenant's own data (Production: anonymised/pseudonymised aggregates); never trains shared models across tenants.
- Inference **within the tenant's geo-region** (Production: Azure OpenAI Service regional deployments).
- **Human-in-the-loop:** individual-student insights (e.g. at-risk flags) require staff confirmation before surfacing/acting; fully automated decisions about students prohibited.
- Explainability: every insight ships a plain-language factor explanation.
- AI transparency notice to guardians in family portal (ICO Children's Code principle 14).

### 2.14 Family Portal (FAM-*)
*Baseline SRS (Production covers it within product functions).*
- Verified guardians view per linked child: timetable, attendance, grades, homework, guardian-intended SRB items, invoices.
- One account across multiple children/institutions with switching; data per institution shown separately.
- Guardians acknowledge SRB, message staff, pay invoices; **read-only** on academic records.
- Applies to minors; adult students self-manage (guardian access only with the adult's explicit consent).

### 2.15 Marketplace (MKT-*)
*Both SRS.*
- Opt-in publishing of courses discoverable across the tenant network; only the published catalogue is shared.
- All transactional/enrolment data stays in each tenant's boundary; inter-tenant interaction only via authenticated, encrypted platform services (Production: mTLS inter-region calls).

### 2.16 Reporting & Analytics (RPT-*)
*Both SRS.*
- Role-appropriate dashboards (attendance trends, grade distributions, fee collection, enrolment); configurable exports.
- Large exports (>10,000 rows in Production) async with secure expiring download links.
- Platform-level aggregates via scheduled analytics replica — never direct cross-tenant queries on live transactional data.

### 2.17 Platform Administration (ADM-*)
*Both SRS.*
- Dedicated Platform Admin console: separate URL and auth flow, not reachable from tenant app.
- Tenant CRUD/suspend, plans/entitlements, cross-tenant usage metrics, compliance oversight, geo-migration triggers.
- Every admin action in a global audit log.
- **Break-glass access:** multi-approver, tenant notified automatically, time-limited (Production: max 2 h), fully audited.
- Per-region health dashboards (DB utilisation, p95 latency, error rates, storage, tenant count, queue depths).

### 2.18 Data Migration & Legacy LMS Integration (MIG-*)
*Both SRS; the Baseline is significantly richer.*
- Bulk import of students, guardians, staff, courses, enrolments, historical grades/attendance from CSV/JSON (Baseline adds Excel).
- **Baseline MIG-002/003: dedicated LMS/SIS connectors — Moodle at minimum** (via Moodle Web Services API and/or backup exports; users, courses/categories, enrolments, content, assignments, gradebook, activity completion), extensible to Google Classroom, Canvas, Blackboard. Production only mentions generic legacy mapping (`legacyId`/`legacySystem`).
- Field/entity mapping interface; source-ID mapping retained for reconciliation and rollback.
- Pre-commit validation report + dry-run; **idempotent imports** (re-run without duplicates); large jobs async with real-time progress, pause/resume, post-migration reconciliation report.
- Migrated data written directly into the tenant's boundary and geo-region — never staged outside it (Baseline MIG-009).

### 2.19 Compliance & Governance module (CMP-*)
*Both SRS.*
- Compliance capability available to **every** tenant (in Core): admin dashboard + compliance-officer management UI.
- **Immutable, tamper-evident, hash-chained, append-only audit log** of security-significant events (auth, permission/config changes, exports, DSAR actions).
- **Full DSAR lifecycle:** intake → identity verification → automated cross-module data assembly → review (DSL review for safeguarding items) → delivery → closure; jurisdiction-configurable SLA timers (30 d GDPR, 45 d CCPA noted in Production).
- Consent management: lawful basis per processing activity, withdrawal tracking, erasure workflow triggers.
- **RoPA** report per tenant, machine-readable (GDPR Article 30).
- **Automated retention enforcement** (scheduled purge + deletion report).
- **DPIA tracking** for high-risk processing; system blocks enabling biometrics/AI profiling without approved DPIA.
- Breach-response workflow: anomaly detection → containment → impact assessment → templated jurisdiction-aware notification (72 h GDPR), pre-populated from audit log.

### 2.20 Native Mobile Apps (MOB-001…012)
*Baseline SRS only (§5.19) — a major scope divergence; see conflicts.*
- **Native iOS + Android apps are the primary channel** (App Store + Google Play), feature parity for common end-user tasks (attendance, grades, SRB, messaging, family portal, fee payment, course access).
- Mobile-first, role-aware home screens; platform HIG/Material conventions; light/dark, dynamic type, WCAG 2.1 AA.
- Push notifications with preference management; biometric/device unlock as convenience layer.
- **Offline-tolerant:** recently viewed data readable offline; offline actions (e.g. attendance marking) queue and sync with conflict handling.
- Tenant branding/locale; connects only to the tenant's geo-region; in-app gateway-hosted fee payment (no raw card data in the app); QR/RFID/camera capture subject to same DPIA/consent controls; minimum-OS policy and forced-update prompts; no unencrypted personal data at rest on device; cache cleared on sign-out/remote revocation.

### 2.21 Use cases & acceptance (Baseline SRS §10–§11, selected)
- UC-1 onboard institution; UC-2 teacher takes attendance (<30 s target per class); UC-3 guardian views child + pays fees; UC-4 DSAR fulfilment within SLA; UC-5 biometric enablement blocked without DPIA; UC-6 dual-institution student; UC-7 consent-gated cross-tenant enrolment; UC-8 adult self-management.
- Release acceptance ACC-001…010 incl.: pen test proves no cross-tenant access; residency provable + attestation; DSAR end-to-end within SLA; biometrics blocked without DPIA; tamper-evident audit completeness; server-side authz; WCAG 2.1 AA on web **and** native apps; perf targets under load; native apps published with offline attendance + in-app payment; **Moodle migration end-to-end with reconciliation and no duplicates**.
- Business metrics: zero cross-tenant incidents; onboarding in minutes; 100% DSARs in SLA; ≥99.9% availability.

### Conflicts between the two SRS documents
1. **Mobile:** Baseline SRS mandates native iOS/Android as the *primary* channel (CON-004, §5.19, ACC-009). Production SRS declares native mobile **out of scope** ("covered separately"; frontend remains React/TanStack web); the cost model likewise excludes it (+$300–600K estimated separately). Unresolved contradiction.
2. **Module count:** Production SRS fixes **21** modules (MOD-001); the July strategy/board docs say **24** modules. (Baseline SRS does not fix a number.)
3. **Student ID format:** Production SRS glossary says `S-XXXX`, its AUTH-010 says `OE-XXXXXXXXXX` — internal inconsistency.
4. **Prescriptiveness:** Production SRS bakes in stack decisions (PostgreSQL RLS, Azure Container Apps, Stripe, Azure OpenAI); Baseline deliberately withholds them and logs open issues (OI-2 launch regions, OI-3 gateways, OI-4 content standards, OI-5 connector priority, OI-6 mobile build approach).
5. **Social IdPs:** only Baseline v1.0.1 (and Hosting v1.1) include Apple/Facebook sign-in; Production SRS predates that revision.
6. **Baseline-only requirement families** with no Production counterpart: adult/minor lifecycle (STU-008…011), consent-gated cross-tenant enrolment (ENR-*), Moodle-specific migration (MIG-002/003), native mobile (MOB-*), waitlists (CRS-005).

---

## 3. Non-Functional Requirements

*(Sources: both SRS; Hosting-Architecture for DR/HA numbers)*

### Performance & capacity
- API reads ≤ **200 ms p95** under normal load; page TTI ≤ **3 s on 4G**; DB indexed lookups ≤ 50 ms p99 with slow-query alerting (Production PERF-005).
- ≥ **500 concurrent users per mid-sized tenant** without degradation; architecture scales to **10,000 tenants / 5 million users** (Production SCL-003; Baseline: "thousands of tenants, millions of users") without redesign.
- Bulk exports >10,000 rows async via download link.
- Load-test gate: k6 p95 < 500 ms at 200 concurrent users (Production CI/CD table).

### Availability & reliability
- **99.9% monthly uptime** per geo-region for Growth/Enterprise (≤43 min/mo).
- Automated failover: **RTO ≤ 15 min, RPO ≤ 5 min** (both SRS + Hosting doc). Full DR ladder (Production §10.4): container <1 min; AZ outage <5 min; region outage <15 min/<5 min; mass deletion PITR <4 h/<6 h; ransomware <24 h via immutable backup.
- Backups every 6 h, PITR 35 days, in-jurisdiction only; planned maintenance outside school hours with 72 h notice; graceful degradation of core reads.

### Security
- Zero OWASP Top 10 Critical/High per major release; server-side validation (Zod named in Production); CSP with no inline scripts; parameterised queries; CSRF (SameSite=Strict + tokens); HSTS 2 y + preload and standard headers.
- Accredited third-party **pen test (CHECK/CREST) pre-launch and annually**; bug bounty within 6 months of launch.
- Anomaly detection: impossible travel, bulk downloads, after-hours admin access.
- Infrastructure: everything in VNet; public exposure only via Front Door (WAF Prevention mode) + API gateway; DDoS Protection Standard; DB private-endpoint only; Defender for Cloud plans; image CVE scanning (no Critical CVEs deployed); **PIM just-in-time privileged access** (max 8 h, approved, audited).
- Encryption: TLS 1.3 (1.2 legacy-whitelist only); AES-256 at rest; **special-category fields app-layer encrypted with per-tenant keys in Key Vault** (annual rotation, dual-key); secrets only in Key Vault — never in code/logs/committed env files.

### Compliance & data protection (also a market claim)
- Regulatory set: **EU GDPR; UK GDPR + DPA 2018; FERPA & COPPA (USA); PIPEDA (Canada); DPDP Act (India); PDPA (Sri Lanka/Singapore/Thailand); UAE PDPL**; plus KCSIE and ICO Children's Code (UK). Target certifications: **ISO 27001, SOC 2 Type II** everywhere; **Cyber Essentials Plus** (UK).
- Children's data: guardian consent below digital-consent age; age-appropriate design (max-privacy defaults, no behavioural ads, no harmful profiling); photos/location/biometrics = special category with explicit purpose-limited consent; register of children's-data processing.
- DSAR SLAs per jurisdiction (GDPR/UK/DPDP 30 d; FERPA 45 school days); erasure with lawful retention overrides recorded; portability in machine-readable form.
- Breach: detection → 72 h regulator notification (GDPR) via templated per-jurisdiction workflow.
- Data classification 4 tiers (Public / Internal / Confidential-PII / Restricted-Special-Category with field-level AES-256-GCM + per-tenant keys).
- Retention defaults: academic records enrolment+7 y (max 25 y); safeguarding 25 y UK / 10 y others; audit logs 7 y (floor 2 y); failed logins 90 d; deleted data 30-d recovery then purge; DSAR records 3 y; financial 7 y (HMRC) / per jurisdiction.

### Data residency (also functional GEO-*)
- Tenant assigned to a geo-region at onboarding by declared jurisdiction; **all PII stored and processed only in-region**; backups in-jurisdiction; AI inference in-region; CDN caches non-PII only (`Cache-Control: private, no-store` for PII responses).
- **Data Residency Attestation API** — signed residency certificate on demand.
- Global control plane holds **non-PII metadata only** (tenant ID, slug, region, plan, dates, status) + One Edu ID namespace + billing; no student PII/records globally; inter-region calls mTLS.
- Tenant-initiated geo-migration as formal procedure (export → DPA review → import → dual-run → deletion certificate; Production: 72 h window, zero data loss).
- Production SRS geo-region map: GEO-EU (West/North Europe), GEO-UK (UK South/West), GEO-APAC-SA (Central/South India — India + Sri Lanka), GEO-APAC-SEA (Singapore/Hong Kong), GEO-ME (UAE North/Central), GEO-NA (East US/West US 2); DR pair always within the same legal jurisdiction.

### Accessibility, usability, localisation
- **WCAG 2.1 AA** across web and mobile (constraint CON-005; CI accessibility audit gate); keyboard + screen-reader support.
- Common tasks completable in minimal steps without training (teacher attendance < 30 s/class target).
- Full localisation: multi-language, multi-currency, multi-timezone, per-tenant locale/calendar.

### Observability & maintainability
- Structured JSON logs with correlation IDs frontend→API→DB (Azure Monitor Log Analytics); OpenTelemetry tracing to App Insights; business metrics to Grafana; alerting on error rate >1%, p99 >2 s, login-failure spikes >50/min/tenant, disk >80%, cert expiry <30 d.

---

## 4. Hosting / Architecture Decisions (PRD addendum material — distilled)

*(Sources: Hosting-Architecture-OneEdu.md v1.1 — the later, board-approved design; SRS-OneEdu-Production §10 — the earlier engineering spec. They disagree on the core stack; see conflicts.)*

### Board-approved design (Hosting-Architecture v1.1, June 2026)
- **Cloud:** Microsoft Azure exclusively. **Launch region: UK South** (DR: UK West). Deliberately phased to control cost/risk.
- **Principles:** managed-first (PaaS); secure/compliant by design; phased investment (pay as modules go live); expansion-ready (one regional blueprint stamped per country); HA with no SPOF; one core technology set (**App Service + Azure SQL**).
- **Phase 1 (launch, single region, first institution ~5,000 students):**
  - Azure Front Door + WAF (edge, TLS, OWASP) → **Azure App Service Premium v3** (zone-redundant, auto-scale) → **Azure SQL Database** (Row-Level Security tenant isolation, built-in HA 99.99%, PITR ≤35 d).
  - Microsoft Entra External ID (social logins Google/Apple/Microsoft/Facebook + enterprise SSO; MFA for staff/admins; PIM/break-glass).
  - Blob Storage (files + **write-once immutable audit-log container**), Key Vault (per-tenant keys), Azure Communication Services (email/SMS/OTP), App Insights + Log Analytics, Defender for Cloud.
- **Phase 2 (activated per module):** SignalR/Web PubSub (real-time), Redis cache, Service Bus (async jobs incl. Moodle migration), Notification Hubs (push), **Azure OpenAI + AI Search** (in-region AI insights + tutor/RAG over institution content), API Management (public API/webhooks), Private Endpoints + NAT (private-only data tier).
- **External (non-Azure):** payment gateway (Stripe/PayHere — PCI scope stays with gateway), Moodle as migration source, Apple/Google app stores.
- **Phase 3 — Multi-region expansion model:** global Front Door routes each tenant to its **home region**; small **global control plane on Azure SQL** (non-PII registry: tenant→region map, One Edu ID, billing; global Entra External ID; JIT platform-admin); self-contained regional stacks (UK/EU/APAC) each holding all personal data; in-region tenant isolation via RLS + per-tenant keys; DR pair within same jurisdiction. Cosmos DB explicitly rejected unless very high multi-region write throughput emerges.
- **Environments:** DEV / UAT / PROD (lowest viable SKUs; DEV mirrors UAT app+DB tiers).

### Earlier engineering spec (Production SRS §10) — where it differs
- Compute: **Azure Container Apps** (not App Service); DB: **Azure Database for PostgreSQL Flexible Server** with per-tenant schemas + RLS (not Azure SQL); Redis + Service Bus in the core tier; four environments **DEV/QA/UAT/Prod** with defined scale ratios (25%/50%) and refresh cadences; full CI/CD gate ladder (unit → SAST/Snyk → DEV integration/Playwright → QA full regression + WCAG audit → UAT k6 perf gate → manual change-managed prod deploy); global control plane in Azure East US replicated to West Europe; six launch geo-regions.
- The Hosting doc (v1.1, later, "for board review") supersedes on stack choice for Phase 1; the Production SRS remains the source for the six-region target map, CI/CD gates, and DR table.

---

## 5. Cost Model Highlights

*(Sources: CostEstimation-OneEdu.md, CostEstimation-AIAugmented.md, Hosting-Architecture §9, Board deck §8–9. Three generations of estimate — each superseding the last.)*

### Generation 1 — full-build scenarios (CostEstimation-OneEdu, June 2026; ±20% Class 4)
- Scope: full 21-module production build per Production SRS; 18 months; 11.5 FTE peak; **3,014 person-days** across 11 phases (largest: Core Modules 555 PD, Extended Modules 545 PD).
- **Scenario A Onshore: ~$3.31M** project (Year-1 TCO ~$3.48M incl. one production region).
- **Scenario B Hybrid offshore: ~$1.77M** project (Year-1 TCO ~$1.94M).
- Azure non-prod envs 18 months: **~$34K** with shutdown savings (DEV ~$294/mo, QA ~$840/mo, UAT ~$2,775/mo).
- Production reference: **~$13.8K–$17.4K/mo per region** (~50 tenants, ~25K users, 2M API calls/day); exec summary elsewhere quotes ~$5.8K/mo/region (internal inconsistency). Reserved instances etc. can save ~$107K/yr/region (20–38% on compute).
- Third-party/compliance: ~$110K Year 1 (pen test $22K, ISO 27001 $28K, legal/GDPR $15K, bug bounty $18K, Turnitin $8K/yr, …); ~$48.5K/yr recurring.
- Schedule confidence: 75% within 18 mo, 90% within 22 mo. Native mobile excluded (+$300–600K if added). Ops support excluded (15–20% of build/yr).

### Generation 2 — AI-augmented plan (CostEstimation-AIAugmented; explicitly replaces Gen 1 scenarios)
- Blended ~42% AI productivity (Claude Code, Copilot, Lovable — the prototype was built with Lovable, Cursor); **8 FTE, 14 months, 1,817 PD (−40%)**.
- **Total: ~$1.38M** (labour $1.07M + AI tools $22K + 15% contingency; Azure envs $27.5K; licences/compliance $100K). Saves ~$382K and 4 months vs Gen 1 Scenario B.
- AI does not replace: architecture judgment, security decisions, compliance interpretation/legal sign-off, human pen testing, UAT.
- Recommended path: hybrid team; soft launch **GEO-UK month 12** with 3–5 pilot Starter tenants; expand GEO-APAC-SA months 13–16; full launch month 17.

### Generation 3 — lean MVP pod model (Hosting-Architecture v1.1 + Board deck, June–July 2026; current strategy)
- Hosting for launch: **DEV ~$103/mo, UAT ~$169/mo, PROD (HA) ~$672/mo, tools/SaaS ~$150/mo → ≈$1,094/mo all-in** (excl. staff, gateway fees); Phase-2 service add-ons **+~$565/mo**. (Detail in the deleted `CostEstimate-OneEdu-Board.xlsx`, not recovered.)
- Development expressed **rate-agnostically in pod-months** (1 pod = 3 engineers + 1 product/design; planning-grade ±30%; productionising the existing prototype, screens largely exist):
  - Coaching/Tuition: MVP ~1–1.5 pod-months → full platform ~4.5.
  - Sports & Swim Clubs: MVP ~1.5–2 → full ~5.
  - Traditional Schools: MVP ~2–2.5 → full ~5.5–6.
- One-time foundation inside MVP: auth, tenant-scoped data model, RBAC, CI/CD, infra. Second pod compresses calendar ~30–40% but not total cost.

**Headline conflict across generations:** hosting run-rate quoted anywhere from **~$672/mo (lean single-institution PROD)** to **~$13.8–17.4K/mo (per full-scale region)** depending on architecture generation and scale assumptions — the PRD should treat these as different operating points, not contradictory facts. Development cost similarly spans **~$100–250K-order (pod model, MVP-first)** to **$1.38M–$3.3M (full 18-month build)** depending on scope strategy.

---

## 6. Swimming Club / Discipline Customization

*(Sources: Board deck, Product Strategy doc — the SRS/hosting/cost docs do not mention swimming.)*

- **Sports & Swim Clubs is one of the three proven verticals** on the shared platform ("multi-discipline sports clubs" in the strategy doc), with the teacher role doubling as **coach**.
- Segment character: daily loop is **session + squad driven** (vs class+fee for coaching, class+academic for schools).
- **Segment-specific MVP modules:** **Sessions, Squad, Awards/Certs, Swim Reports** — added on top of the shared core for a clubs-led MVP (~24–32 person-weeks, 6–8 week MVP, ~1.5–2 pod-months).
- Strategic assessment: **lowest market competition ("open field"), best differentiation**, small deal sizes, medium time-to-revenue. Board recommendation keeps the **Clubs demo warm as the differentiated second market** while leading with Coaching/Tuition.
- Strategy doc board question notes segment weighting: "clubs weight Sessions + Finance; schools weight Grades + SRB."
- No requirement-level (SRS) treatment of discipline customization exists — the SRS docs model schools/tuition generically. Any PRD work on swim/discipline scoping must derive from the prototype itself plus these strategy-level statements.

---

*End of extract. Source files recoverable via `git show HEAD:docs/<name>` and `git show HEAD:1StudentID-*.docx` in this repo.*
