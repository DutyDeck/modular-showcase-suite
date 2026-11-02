---
title: PRD amendment input — Institution Packs & multi-region expansion
status: draft change signal (for bmad-correct-course → bmad-prd update)
date: 2026-11-02
source: prototype build in modular-showcase-suite (branch main; pre-change backup at tag pre-packs-demo-2026-11-02)
audience: product owner, PM (bmad-prd / bmad-correct-course), architect
---

# PRD amendment input — Institution Packs & multi-region expansion

This is a **change signal**, not a PRD edit. It records what the prototype now demonstrates so the production PRD can be amended through `bmad-correct-course` (per AGENTS.md: scope, phasing and tenancy are product-owner decisions). Requirement ids below are **provisional** (`PK-nn`); final FR numbers are assigned when the PRD is updated. Section references (§) point to the PRD structure in `prds/prd-modular-showcase-suite-2026-08-25/prd.md`; map them to the production PRD's numbering.

## 1. Scope change to record (PRD §2, §2.2)

- **New segments:** international schools, colleges (FE / vocational / TAFE / RTO) and universities, in **any planned region** — UK, Sri Lanka, Australia, UAE and wider GCC (KSA, Qatar), India, Singapore, Malaysia. No region goes first; whichever segment signs first is served.
- **Still out of scope:** sole tutors. Every tenant has at least two staff, so the safeguarding lead + deputy rule stays unchanged.
- **Resolves:** the open question "is a university a tenant with nothing university-specific?" (production OQ-12) → **no**: universities get a Higher Education Pack.

## 2. The governing model (new §4 preamble / glossary)

Three **independent** dimensions decide what a tenant sees. The prototype implements all three; the PRD should state them as a rule:

| Dimension | Decides | Where in prototype |
|---|---|---|
| **Module** | purchasable features | `src/lib/modules.ts` (6 new shared modules) |
| **Pack** | institution type: menus, vocabulary, screens, seed config | `src/lib/packs/registry.ts` |
| **Region profile** | country defaults: currency, tax, calendar templates, attendance codes, ID fields, vetting checks, statutory returns, grading bands, visa monitoring | `src/lib/packs/regions.ts` |

Rules:
- **R1.** A pack never re-implements a module; it declares `requiresModules` and they are auto-enabled on activation.
- **R2.** Packs can layer (College add-on requires Higher Education); switching off a base pack switches off its layers.
- **R3.** Nothing is fixed in code per country. Anything that varies by country is a region default the tenant can override.
- **R4.** Every tenant has a **Tenant Profile**: institution type, experience (classic / segment), region, packs, attendance code set, ID fields, optional second pricing currency, visa-sponsor licence flag, optional group.
- **R5.** The Swim Club is a pack like the others. With it off, swim-only accounts see a "pack not enabled" screen.

Glossary additions: Pack, Region profile, Tenant profile, Experience (classic / segment), Academic calendar, Attendance code set, Contact point, Tenant group, Starter template.

## 3. Foundations — change existing requirements (do first; later features depend on them)

| Id | Requirement | Changes / extends | Prototype |
|---|---|---|---|
| PK-01 | **Academic calendars per tenant.** One or more calendars per tenant (terms / semesters / blocks; teaching, exam, break, resit and induction periods). Each learner, curriculum or programme is bound to a calendar. A "current term" is derived from the calendar. New calendars start from a region template. The academic year is **never** derived from the country. | Replaces the production rule "academic year comes from the country" (TenantDefaults.cs) and closes D-98 (no term calendar). Extends §4.11. | Institution Profile → Academic calendars |
| PK-02 | **Attendance code sets per tenant.** Registers record a code from the tenant's set; each code maps to a statistical meaning (present / late / approved activity / authorised / unauthorised / not counted / admin). Shipped sets: Simple (P/L/A/E — the current behaviour), England DfE national codes, International school, HE engagement points, VET contact hours. | Generalises FR-27 / FR-28 (P/L/A becomes the "Simple" set). | Institution Profile → code set; `/app/registers` |
| PK-03 | **Official identifiers follow the region.** A configurable set of official-ID fields per tenant, defaulted by region and segment (UPN, ULN, UCAS ID, HUSID, CAS, NIC, birth certificate, exam index, USI, CHESSN, CoE / CRICOS, Emirates ID, KHDA / ADEK / MoE number, Iqama, Noor, QID, APAAR, Aadhaar, NRIC / FIN, MyKad, passport). Sensitive IDs are masked; each reveal is audited. Missing IDs are flagged. | Extends FR-6, FR-22, FR-24. | `/app/learners`, Institution Profile |
| PK-04 | **Region profile.** Each region supplies: currency, tax, data-protection law, payment gateways, calendar templates, default code set per segment, ID fields, staff-vetting checks, statutory returns, exam boards, credit scheme, degree classification bands and visa-monitoring rule. Changing a tenant's region re-applies the defaults. Existing ledgers keep their currency. | Extends FR-20, FR-47, FR-64. | `regions.ts`; Institution Profile |
| PK-01b | **Intakes & start dates.** Each tenant defines intakes from region templates and overrides them freely. An intake has a kind (fixed / rolling), a scope (the programmes, curricula or qualifications it admits to), a calendar, an application window and deadline, a start date (rolling: earliest–latest, starting on Mondays), a census date (AU) and a capacity. The learner stores `intakeId`, `startDate` and `expectedEnd`. Consequences:<br>• fees bill from the start date, pro-rated for the period they join in, with the calendar rolled forward for future intakes<br>• registers expect attendance only from the start date<br>• module runs map a module's teaching period onto each intake's calendar (with per-run census in AU)<br>• deferral moves an application to the next intake, keeping the offer and deposit<br>• returns flag a missing start date<br>Full analysis: `intakes-start-dates-analysis.md`. | New. Touches FR-22, FR-27, FR-47..49 and the Admissions module. | Institution Profile → Intakes; Admissions → Intakes tab / Defer; Programmes → Delivery |
| PK-01c | **Year-group placement by age.** Schools get a suggested year group from date of birth and the curriculum's age cut-off (British 31 Aug, CBSE 31 Mar, LK national 31 Jan, NSW 31 Jul …). Staff can override it. Deferral re-places by age. | New (school segment). | Admissions → new application / detail |
| PK-04b | **Sub-jurisdictions.** A tenant profile carries a sub-region (emirate, state, UK nation) when regulators differ inside a country. Returns are filtered by it: Dubai → KHDA, Abu Dhabi → ADEK eSIS, Sharjah → SPEA, Northern Emirates → MoE; England / Wales / NI for HESA. With no sub-region set, sub-regional returns are hidden so they can't be filed wrongly. | Extends PK-04. Research finding: Sharjah's SPEA was missing from the original UAE assumption. | Institution Profile → Sub-jurisdiction |
| PK-04c | **Effective-dated visa-monitoring rule engine.** Presets per region, picked **per learner type** (degree / below-degree / school). <br>• UKVI: degree level uses the academic engagement policy (intervene within 60 days, withdraw if not re-engaged); below degree, FE and schools use 10 consecutive missed contact points (Doc 2, Oct 2026).<br>• AU ESOS: VET, ELICOS and schools ≥80% per study period; **HE award courses are monitored on course progress only**.<br>• SG ICA: <90% in a month or 7+ consecutive days absent.<br>• MY EMGS: ≥80% plus CGPA 2.0. | Replaces the single per-country threshold. | Attendance → Visa-sponsor monitoring |
| PK-05b | **Student accounts & sign-in (per tenant, per stage).** A tenant sets the pupils' identity provider (Microsoft 365 / Entra ID, Google Workspace for Education, or native 1StudentID sign-in), the school-issued student email domain and roster sync (accounts created from Student Records, disabled on withdrawal). Per stage of the school (year-group bands) it sets **who uses the account**:<br>• **Pupil signs in** — secondary, university, college.<br>• **Family uses pupil account** — the practice in many LK and Gulf international schools for the primary years: the school's Microsoft 365 account is used by the parent. The session shows the pupil's pages **plus** the family pages (trips & consent, parent meetings, fees). Legally significant actions (consent) still require the **registered guardian's one-time code**; the record says "<guardian> (guardian code · family account)". A shared pupil login is never treated as the guardian's identity.<br>• **Parent account only** — early years; no pupil login.<br>Sign-in routing: typing a school student email recognises the domain and continues with that school's provider. Parents may always also hold their own 1StudentID parent login (one login, every child, every institution). | New. Extends FR-1..5 (auth), the guardian-consent model (minors) and PK-14 SSO. Age of digital consent differs by region (UK GDPR 13; LK PDPA treats under-18s as children) — **to confirm** per compliance pack. | Institution Profile → Student accounts & sign-in; Student Records → Sign-in; login hint; persona `sasindu.p@meridian.lk` |
| PK-05 | **Learner record extensions.** Nationality, visa (type, expiry, reference, sponsored), EAL, learning-support plan, funding source, intake and mode of study (FT / PT / apprenticeship). | Extends FR-22. | `/app/learners` |

## 4. Pack framework changes (PRD §G, FR-66..68)

- PK-06 **Pack registry & activation.** Packs are activated per tenant by the Platform Admin. Institute admins see the active packs and can request more. Activation enables the modules and packs the pack depends on.
- PK-07 **Packs add to the core — they never replace it.** Every tenant keeps the core modules (Record Book, Grades, Calendar, Courses / LMS, Assignments, Appraisals, Messages, Finance, Reports …). Segment tenants (school / university / college) swap four core destinations for their richer equivalent so nothing appears twice: Students → Student Records, My Children → learner-based My Children, Attendance → code-set registers, and family Fees / Course Selection → per-learner fee accounts (plus Admissions / Module Registration). Classic tenants keep today's menus; packs append a menu group. *(Revised 2026-11-02: the first cut gave segment tenants a lean core that hid the core modules — a parent could not reach the Record Book.)*
- PK-07a **One student, core modules resolve it.** Core person views (Record Book list / timeline, parent child picker, enrolment card) resolve a pack tenant's learners through one bridge (`coreBridge.ts`): parent → own children, student → self, staff → own institution, with entries tagged to the learner's institution. Direct links to another family's learner are refused. In production this is ONE student entity (the 1StudentID) with the Learner fields as its institution-scoped SIS profile — see open question 5.
- PK-08 **Pack route gating.** A route owned by a pack is gated when the pack is off: it shows a "pack not enabled" screen listing the pack's features (enforced server-side in production, as in FR-15).
- PK-09 **Starter templates.** When a pack is activated, an admin can load its reference *configuration* (curricula, houses, tutor groups, programmes, modules, qualifications, services) into the tenant. Cross-references are remapped. Student-level data is never cloned.
- This resolves OQ-8: the second, third and fourth packs exist. FR-68 is proven reusable.

## 5. New shared modules (PRD §A.4 catalogue)

| Id | Module | Key behaviour | Prototype |
|---|---|---|---|
| PK-10 | **Admissions** | Pipeline: enquiry → applied → assessment / interview → offer (conditional or unconditional) → accepted → deposit paid → enrolled, plus waitlist, declined and withdrawn. Document checklist. Visa flag (CAS / CoE). Enrolling creates the permanent 1StudentID learner. The form adapts to segment (year group + curriculum, or programme / qualification + intake). **Boundary:** Marketing & CRM owns leads; an enquiry with source "CRM lead" is the hand-off, so there is no second pipeline. | `/app/admissions` |
| PK-11 | **Timetable & Rooms** | Weekly grid by group, teacher or room. Clash detection (teacher, room or group). Room utilisation. Cover for absent staff, picking from free teachers. Import from aSc, Untis, Celcat or Scientia, or CSV. **Boundary:** the Swim Pack keeps its own coach-cover flow for pool sessions. | `/app/timetable` |
| PK-12 | **Staff Vetting Register** | Columns come from the region's checks (UK Single Central Record, AU Working With Children Check + police check, UAE good conduct + regulator approval, LK police report …). Expiry and renewal tracking. Compliance %. Export. | `/app/vetting` |
| PK-13 | **Regulator Returns** | Returns for the tenant's region × segment (+ pack-implied segments). Flow: validate (missing IDs, visa refs) → generate (preview in the regulator's columns) → CSV download → submitted → accepted, with history. | `/app/returns` |
| PK-14 | **Integrations** | Catalogue filtered by segment and region. SSO (Entra ID, Google, SAML / Shibboleth — UK Access Federation, AAF — and OIDC). LTI 1.3 (Moodle, Canvas, Blackboard, D2L). SIS (SITS, Banner, PeopleSoft). School MIS (iSAMS, SIMS, Arbor). ManageBac. Timetabling. Payments. Regulator connectors (ADEK eSIS, LRS, USI). Connect, sync and error states. | `/app/integrations` |
| PK-15 | **Groups & Campuses** | A group is a set of tenants plus group admins. The group view consolidates KPIs across campuses (each campus keeps its own data, region, currency and calendar) and reports in a group currency. **This is a tenancy decision — product owner to confirm.** | `/app/group` |
| PK-16 | **Fee additions** (extends Finance, FR-47..52) | Registration fee, deposit (linked to Admissions), instalment plans (termly / per semester / monthly). **Third-party payers** split by %: parent, self, employer, sponsor, scholarship, student loan, government funding. Families see only their own share. Bank-transfer slip upload → finance verification. **Second pricing currency** shown alongside; the ledger stays in tenant currency. *Money-rule change — product owner to confirm.* | `/app/fee-accounts` |
| PK-17 | **Visa-sponsor attendance monitoring** (extends PK-02) | For tenants with a sponsor licence: UK — consecutive missed contact points against the tenant threshold, then "report to UKVI". AU / SG / MY — % against the threshold (80 / 90 / 80), then report via PRISMS / CPE / EMGS. | `/app/registers` |

## 6. New packs

### International School Pack (PK-20..24)
- PK-20 Multiple curricula (British, IB, CBSE, national), each bound to its own calendar, with year groups, exam boards and grade scale.
  - Each curriculum also has **named stages**: EYFS / Key Stages; Cambridge Primary, Lower Secondary, IGCSE and Advanced; Pearson iLowerSecondary, International GCSE and International A Level; CBSE Pre-primary to Senior Secondary.
  - Samples: **Cambridge International** and **Pearson Edexcel International** run side by side in one school (Colombo); British EYFS–A Level and CBSE in Dubai.
- PK-20a **Early years.** Stages before Year / Grade 1 are part of the curriculum, named per school:
  - Sri Lankan international schools: Lower Nursery, Upper Nursery, Pre-Grade
  - British: FS1 / FS2 (Nursery / Reception)
  - CBSE: Nursery, LKG, UKG
  - IB PYP: Early Years 1–2
  - Australia: Preschool / Kindergarten

  Age placement counts back from Year 1 onto the curriculum's own stage names, and flags children who are too young. Early-years pupils default to **parent account only** (no pupil login). They have their own forms with smaller capacities, lower fee bands and vetted early-years staff.
  - To confirm: staff:child ratios and session-based (half-day) attendance per region.
- PK-20b **Classes & enrolment** (school):
  - **Form classes:** one per pupil (= Learner.group, so registers and the timetable follow).
  - **Subject classes / sets:** many per pupil; one set per subject and year.
  - Admins can create, edit and delete both, enrol a single pupil or a whole form, move pupils, and auto-place unplaced pupils (balancing size against capacity). Deletes are guarded.
  - Every change is logged, and the guardian and tutor are notified.
  - Teachers get a "My forms & sets" view; parents see a read-only view.
- PK-21 Tutor groups, houses and house points.
- PK-22 External exam entries (Cambridge, Pearson Edexcel, IB, Sri Lankan O/L–A/L): candidate numbers, fees, deadlines, series. Predicted grades by teachers. Parents can view.
- PK-23 Parent–teacher meeting booking: slots generated from a time window, no double-booking, in person or online.
- PK-24 School-life services: boarding, transport, activities and trips. Consent and payment by the parent. Capacity. Optional second-currency pricing.

### Higher Education Pack (PK-30..35)
- PK-30 Programme → stages → credit-bearing modules (core / optional, prerequisites, capacity, weighted assessment components). Intakes are bound to calendars.
- PK-31 Student module registration within credit rules (prerequisites passed, capacity, credit limit), with admin approval.
- PK-32 Marks entry per component, attempt numbers (resit), flags (EC, late, misconduct). Moderation (sample, agree / adjust).
- PK-33 Extenuating circumstances: student claim → panel outcome (extension, deferral, uncapped resit, mark disregarded).
- PK-34 Exam board: stage average, credits passed, suggested outcome (progress / trailing credit / resit / repeat / award), ratification.
- PK-35 Transcripts with classification by region bands (UK honours, AU GPA, LK / GCC GPA, India CGPA). Printable.

### College add-on (requires HE) (PK-40..42)
- PK-40 Qualifications and units from awarding bodies (BTEC, City & Guilds, AQF / RTO, NVQ). Funding stream.
- PK-41 Unit / competency outcomes and certification eligibility.
- PK-42 Apprenticeships (employer, standard, off-the-job hours, progress reviews, gateway / EPA) and work placements (host, supervisor, hours, risk assessment).

## 6b. SIS completion — competitor parity (PK-50..PK-58)

Source: `competitor-gap-unicloud360.md` (UniCloud360, private HE in Sri Lanka). Each row extends a module that already exists; nothing creates a parallel pipeline.

| Id | Requirement | Extends | Prototype |
|---|---|---|---|
| PK-50 | **Shared activity records.** Every automated notification goes to one outbox (email / SMS / WhatsApp / in-app, with source and status). Every record change goes to a field-level change log (who, when, from → to, reason; sensitive values masked). | New platform service. Feeds the audit trail (compliance) and support. | `sis/shared.ts`, `sis/activity.ts`; IT Administration → Outbox; Student Records → History |
| PK-51 | **Student record completion.** Documents vault (kinds, versions, verification, expiry, visibility per role); entry qualifications with framework level (SLQF / RQF / AQF); employment history; audit-ready export; admin search by official ID (masked in results). | FR-22, PK-05 | Student Records |
| PK-52 | **Admissions CRM.** Quick multi-channel enquiry capture; on-duty counsellor auto-assignment; follow-up queue with reminders; targets per intake × programme × counsellor; conversion funnel. **Duplicate detection** within the tenant and across the platform. A match with an existing 1StudentID keeps the student's lifelong ID (never two records for one person). | PK-10; Marketing & CRM boundary unchanged | Admissions |
| PK-53 | **Fees completion.** Bank-statement import with auto / review / unmatched reconciliation; counter receipts; reminder rules by channel; cash-flow dashboard and funding-body reconciliation. Approved requests suspend or cancel future instalments. | PK-16, FR-47..52 | Fees & Sponsors |
| PK-54 | **Exam timetabling & invigilation.** Exam series and sittings. Checks: room capacity, room double-booking, student clashes, invigilator availability and duty caps. Auto-assign; publish with notifications; special arrangements; candidate and invigilator views. | PK-32 | Exam Timetable (HE pack) |
| PK-55 | **Results governance.** Mark batches: lecturer submits → head of academic affairs approves or returns → registrar publishes now or on results day. Students see only published results. Academic appeals within a window, separate from extenuating circumstances. **Grading schemes per tenant** (classification or GPA: 4.0 South Asia, AU 7-point, India 10-point) with GPA / CGPA and standing. Certificate batch issue with serials and public verification codes. | PK-32..35 | Assessment & Boards; Transcripts & Awards; Institution Profile → Grading scheme |
| PK-56 | **Requests & approvals.** Progression, programme transfer, interruption, withdrawal, deferral, change of mode, project proposal, and school leave of absence. Each request kind has an approval chain; approval applies the change to the learner record and fee schedule automatically. Visa-sponsored learners trigger the reporting duty (UKVI / PRISMS). Family requests need the guardian code. | New shared module `requests` | Requests & Approvals |
| PK-57 | **Lecturer tools.** QR check-in with a rotating code, plus import of fingerprint-terminal logs; one-off class changes (cancel / move / room) with clash checks and notifications to the people affected; teaching load against contract, with suggested assignment for unstaffed modules. | PK-02, PK-11 | Attendance; Timetable; Programmes → Staffing |
| PK-59 | **Full CRUD with guards everywhere.** Every structure can be created, edited and deleted:
- programmes, stages, modules (weights must total 100%)
- module registrations (admin registers on a student's behalf with a reason-logged override, moves students, registers a whole cohort)
- qualifications, units and learner enrolment
- apprenticeships and placements
- intakes (edit, close, delete), calendars and periods
- staff-vetting records (mark as left, keeping the record)
- rooms (delete moves bookings first)
- student details

A delete is **blocked while anything references the record**, with counts and a safe alternative (close, archive, withdraw). A learner (1StudentID) is never deleted. | All modules | Every admin screen |
| PK-58 | **IT administration & alumni.** Account lifecycle: provision at enrolment for the tenant's sign-in provider; one-click revoke for leavers, with audit. Person lookup; IT support desk with SLA tracking. Alumni directory with verified credential sharing (graduates keep their 1StudentID). | PK-05b, FR-1..5 | IT Administration / IT Help; Alumni |

Type fields production should add (the prototype works around them): `Intake.closed`, `Programme.closedToEntrants`, `VettingRecord.endDate`, a "Withdrawn" status for apprenticeships and placements, `Room` features, `Learner.phone` / `address`, and a person-level id that replaces `Learner.linkedStudentId`.

Sri Lanka HE items to confirm before they become requirements: SLQF levels, UGC / Ministry recognition of non-state degree awards, the Interest-Free Student Loan Scheme as a payer type, and TVEC registration.

## 7. Non-functional and business items (PRD §5, §6)

- **Scale:** set a large-tenant target, e.g. a 20k-student results-release day; the current figure is 500 concurrent per tenant. Load-test before the first university.
- **Certifications:** ISO 27001 / SOC 2 date. Lead time is 6–12 months; start early if universities or school groups are prospects.
- **Accessibility conformance report** for tenders.
- **Languages:** Arabic RTL, Sinhala and Tamil are **deferred**, by product-owner decision on 2026-11-02.
- **Regulatory detail:** rows in `regions.ts` are demo-grade. Each country's compliance pack must confirm them against cited sources before they become requirements. The domain research pass in `planning-artifacts/research/` feeds this.

## 7b. Research basis and corrections already applied

Domain research (deep recon, 2026-11-02; 56 verified claims, 160 sources) is in `planning-artifacts/research/domain-international-schools-universities-colle-2026-11-02/`. Use `seed-digest.md` for cited facts. The prototype now applies these corrections:

- DfE codes are mandatory for all schools in England, independent ones included, but fully-boarding schools are exempt. Daily attendance data goes to DfE from state-funded schools only. Independent schools file the **SLASC** census (third Thursday of January) and LA new-pupil / deletion notices.
- **HESA SID (17 characters)** replaces HUSID. Data Futures stays **annual** until Winter 2028.
- Apprenticeships and adult skills moved from DfE to **DWP / Skills England** (Sep 2025). ILR R01 is 4 Sep 2026 and R14 is 21 Oct 2027.
- **UAE:** four regulators (KHDA, ADEK, **SPEA**, MoE). Unified school calendar **31 Aug 2026 – 2 Jul 2027**. ADEK eSIS takes daily attendance against 13 authorised-absence reasons, with no codes. KHDA requires an Appointment Notice per teacher per school.
- **Sri Lanka:** international schools run **late August – early July**. MoE has no authority over them and they file no government return; students sit O/L and A/L as private candidates. No mandated police clearance for private-school teachers. PDPA Parts I & III take effect 1 Jan 2027.
- **Australia:** ESOS attendance duty excludes HE award courses. PRISMS non-commencement must be reported within 14 days (under 18) or 31 days (18+). CHESSN is legacy and read-only. No AQF certificate is issued without a verified USI.
- **India:** UDISE+ reference date is **31 March**. APAAR status can be ID / REFUSED / NOGEN, and CBSE schools abroad are exempt.
- **Seed integrity:** student dates of birth were corrected so every year group matches the age cut-off rule (the earlier seed had most pupils one year off).

Not yet modelled, and recommended for the PRD:
- school **sector** (state vs independent), which decides School Census vs SLASC
- per-rule `effective_from` on code sets and returns, as well as visa rules
- APAAR consent-status validation
- refund rules relative to start or census date
- non-arrival visa reporting

## 8. Open questions for the product owner

1. Groups & campuses: confirm a cross-tenant group view is in scope (tenancy change).
2. Second pricing currency: confirm the money rule (ledger in tenant currency, second currency for display and pricing only).
3. Order of segments: first sign-up decides, but which pack is hardened first?
4. Which regulator integrations are must-have at signing (ADEK eSIS vendor onboarding and HESA access take months)?
5. Unify the classic P/L/A attendance and the classic student roster with the code-set registers and the Learner record in production. The prototype shows them as two views, and the target is one model.

## 9. Prototype → production mapping

| Prototype file | Production concept |
|---|---|
| `src/lib/packs/regions.ts` | Region profile reference data (per-country compliance pack) |
| `src/lib/packs/foundationData.ts` | TenantProfile, AcademicCalendar, Learner extensions, TenantGroup |
| `src/lib/packs/registry.ts` | Pack registry, activation, entitlement checks, starter templates |
| `src/lib/packs/{schoolData,heData,opsData,bizData}.ts` | Domain entities plus seed data per pack / module |
| `src/lib/menus.ts` (`menuForUser`) | Menu composition = experience + modules + packs |
| `src/components/ModuleGate.tsx` | Pack + module route gating (server-side in production) |
