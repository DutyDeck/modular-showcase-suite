# Competitor gap analysis: UniCloud360 (private higher education, Sri Lanka)

**Date:** 2026-11-02
**Sources:** unicloud360.com module pages:
- Student Information System
- Admissions CRM
- Fee Management
- Exam Management
- Lecturer Portal
- IT Administration
- the home page

The pages are marketing copy dated June–October 2026, so every claim below is unverified. Pricing was excluded at the product owner's request.

## Who they are
UniCloud360 is a cloud SIS for **private higher-education institutions**. It has six "role-specific portals" on one database.

They name 8+ Sri Lankan institutions as customers: CINEC (7,000+ students), APIIT (4,000+), IIHS, SLTC, NEXT, AIBS, AMRAK and IJSE. They say they are expanding to Singapore, the UAE and the US. Their marketing is built around Sri Lanka:
- LKR currency
- +94 phone numbers
- duplicate checks on NIC
- Mahapola bursaries
- hosting in Sri Lanka

**Implication:** they are the direct competitor for Sri Lankan private universities and campuses.

## Where 1StudentID is already ahead
- **One student ID across institutions:** a school leaver keeps their ID into university.
- **Every type of institution:** schools, colleges and swim clubs, not only higher education.
- **Parent and family access:** parent portal, family-used pupil accounts, guardian consent codes.
- **Multi-region compliance:**
  - regulator returns (HESA, KHDA/ADEK/SPEA, AVETMISS/TCSI, UDISE+ …)
  - visa-sponsor monitoring (UKVI, ESOS, ICA, EMGS)
  - intakes with census dates
  - official IDs per region
  - staff vetting
- **Teaching tools:** LMS, Student Record Book, appraisals, marketplace, AI insights.
- **Sign-in:** school-issued Microsoft 365 / Google accounts, with a rule per year group for who uses the account.

## Gaps closed in the prototype (this pass)

| # | Their feature | Our implementation | Where |
|---|---|---|---|
| 1 | Unified profile with documents (version history, role-gated), qualifications and employment history | Documents vault with versions, verification, expiry alerts and per-role visibility; entry qualifications (framework level) and employment history | Student Records |
| 2 | Full change log; audit-ready export | Field-level history (masked IDs); CSV export and printable record | Student Records → History |
| 3 | Duplicate detection (name, NIC, contact) | Checks within the tenant **and across the platform**. A match with an existing 1StudentID keeps the student's lifelong ID (e.g. a Colombo school leaver applying to university) | Admissions |
| 4 | Multi-channel enquiries, auto-assignment, follow-ups, targets and funnel | Quick capture (walk-in, phone, web, exhibition…), on-duty counsellor rota, follow-up queue with reminders, targets per intake/programme/counsellor, conversion funnel | Admissions |
| 5 | Bank-statement import and auto-match | Statement import with auto / review / unmatched matching, manual match, receipts, reconciliation export | Fees → Reconciliation |
| 6 | Payment collection hub | Counter receipts (cash, card, transfer, cheque, online) | Fees |
| 7 | Scheduled due reminders (email / SMS) | Reminder rules (before / on / after the due date, by channel); runs reach every payer with a share | Fees → Reminders |
| 8 | Cash-flow dashboard; government-loan / sponsor reconciliation | Collected, outstanding, overdue 30+ days and a 3-month projection, split by programme, intake and payer type; reconciliation for each funding body | Fees → Cash flow |
| 9 | Conflict-free exam timetabling and invigilator assignment | Exam series with checks on room capacity, room double-booking and student clashes; invigilator availability and workload; auto-assign; publish with notifications; special arrangements | Exam Timetable |
| 10 | Mark-batch approval by the head of academics | A lecturer submits; the head of academic affairs approves or returns the batch, with an audit trail | Assessment |
| 11 | One-click results publication | Publish now or schedule a results day; students see only published results; notifications | Assessment |
| 12 | Grade appeals | Appeals within 10 working days, separate from extenuating circumstances, with history; an upheld appeal can amend the mark | Assessment |
| 13 | CGPA and grading engine | Grading scheme per tenant: UK classification, 4.0 GPA (South Asia), AU 7-point or India 10-point. GPA, CGPA and academic standing appear on results and the transcript | Institution Profile; Transcripts |
| 14 | Certificate batch issue | Graduates move Awaiting results → Ready to issue → Issued; serial numbers and public verification codes; verification lookup | Transcripts & Awards |
| 15 | Progression workflow (apply → approval → status and fees update) | Requests with multi-step approval: progression, transfer, interruption, withdrawal, deferral, change of mode, project proposal, school leave. Approval applies the change to the record and fee schedule, plus the visa report duty | Requests & Approvals |
| 16 | Project and request management | Project proposals: supervisor → module leader | Requests & Approvals |
| 17 | QR / fingerprint attendance | A rotating QR code per session; students check in; terminal log import for fingerprint devices | Attendance |
| 18 | Class management (start, shift, cancel, room change) | Cancel, move or change room for one class, with clash checks; everyone affected is notified | Timetable |
| 19 | Lecturer assignment by availability, expertise and workload | Staffing view: load against contract, unstaffed modules, suggested lecturer, assignment notifications | Programmes → Staffing; Timetable → Staffing (schools) |
| 20 | Alumni | Alumni directory, event invites, graduates' own record, verified credential sharing | Alumni |
| 21 | IT administration: provisioning, one-click revoke, lookup by NIC/passport, IT support desk | Account lifecycle across connected systems with an audit trail; person lookup; support desk with SLA tracking; notification outbox | IT Administration / IT Help |
| 22 | Automated notifications everywhere | One outbox records every automated email, SMS, WhatsApp and in-app message | IT Administration → Outbox |

## Deliberately not copied
- **"No integrations required"**: we keep standards-based integrations (SSO, LTI 1.3, payments, regulator connectors), which matter for universities and tenders.
- **Offline-capable enquiry capture**: noted for the production mobile app. It isn't something a demo can show.
- **Fingerprint hardware**: we model the terminal log import only. Vendor integration is a production decision.

## Follow-ups for the product owner
1. **Sri Lankan HE specifics to confirm** (not modelled yet):
   - SLQF levels on programmes and awards
   - UGC / Ministry recognition for non-state degree-awarding institutions
   - the Interest-Free Student Loan Scheme for private-HEI students as a payer type
   - TVEC registration for vocational programmes
2. **Positioning:** lead in Sri Lanka with "one ID from school to university" and parent access. UniCloud360 has neither.
