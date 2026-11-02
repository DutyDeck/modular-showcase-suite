# Institution Packs — demo script

All demo accounts use password `demo`. On the login page, pick a tab: **Core platform · Swim Club · Intl School · University & College**. Seeded data assumes the demo date is **2 Nov 2026**. Click **Reset demo** for a clean run.

## The model in one sentence
Three independent dimensions decide what a tenant sees:
- **Modules**: purchasable features.
- **Packs**: institution type (Swim Club, International School, Higher Education, College add-on).
- **Region**: country defaults, such as calendar templates, attendance codes, official IDs, vetting checks, statutory returns, grading bands and visa rules.

A pack never re-implements a module. It depends on the modules it needs and switches them on. Packs **add** to the core platform: every school, university and college user still has Record Book, Grades, Calendar, Courses / LMS, Appraisals and Messages. Only four core screens are swapped for the pack version (Students → Student Records, My Children, Attendance registers, family Fees).

## Act 0 — Packs are switchable (admin@demo.com, global admin)
1. Go to **Settings → Institution packs** and pick **Royal Vista College**. The Swim Club Pack is on.
2. Switch **Swim Club** off, then sign in as `clubadmin@demo.com`. They see "Swim Club Pack is not enabled". Switch it back on.
3. Switch on **International School** for Royal Vista. Sign in as `principal@royalvista.com`: a **School** menu group appears. Open Curricula & Houses → **Load starter template** to see the configuration cloned and remapped.
4. Switching on **College add-on** also switches on Higher Education. Switching Higher Education off removes College too.
5. **Tenants** shows each tenant's region, institution type and packs.

## Act 1 — International school, Dubai (school@demo.com, Hannah Clarke)
- **Dashboard:** roll for each curriculum. The British calendar (31 Aug – 2 Jul, the UAE unified calendar) sits next to the CBSE calendar (April – March).
- **Institution Profile:**
  - Region is UAE and sub-jurisdiction is **Dubai → KHDA**.
  - Two calendars, plus **Intakes**: Aug 2027 (British/IB), Apr 2027 (CBSE), and rolling in-year entry.
  - Age-placement rules for each curriculum.
- **Admissions:**
  - Open the **Intakes** tab to see places against capacity.
  - Open an application to see the suggested year group by age (British cut-off 31 Aug, CBSE 31 Mar), then **Defer to next intake**.
  - **Enrol** creates a 1StudentID and opens a fee account with the deposit credited.
- **Curricula & Houses:** award house points. **Exam Entries:** select drafts → **Enter selected** to issue candidate numbers.
- **Parent Meetings:** the booking grid. **School Life:** boarding priced in USD at an AED school (second pricing currency).
- **Fees & Sponsors:** edit a payer split (it must total 100%) and verify a bank slip.
- **Staff Vetting:** KHDA/UAE checks, with one good-conduct certificate expired.
- **Regulator Returns:** KHDA → Validate → Generate → Download CSV → Submit.
- **Group & Campuses:** Dubai and Colombo side by side. Colombo shows "overrides LK default" because it starts in late August, not January.
- **Integrations:** Entra ID, ManageBac and Network International.

**Teacher (schoolteacher@demo.com):** tutor group 10C, then **Attendance** (take the 10C AM register with the international code set), then enter predicted grades, then My Timetable.
**Parent (schoolparent@demo.com):** two children on two calendars (Zara is in British Term 1, Adam is in CBSE Term 2). Give trip consent and pay, book a parent–teacher slot (double booking is blocked), and pay a fee or upload a bank slip. Open **Record Book**: pick Zara or Adam, then acknowledge the Hatta fieldwork note. (Typing another family's child into the URL shows "Student not found".)

## Act 1b — Student sign-in: the family uses the pupil's Microsoft 365 account (Colombo)
Many international schools issue every pupil a Microsoft 365 account. In the primary years, the parent uses it.
1. Sign in as `school@demo.com`, open **Institution Profile → Student accounts & sign-in**. Dubai uses Microsoft 365 with the domain meridian.ae: Foundation Stage = parent account only, Primary = **family uses pupil account**, everyone else = pupil signs in. (Colombo is set up the same way on meridian.lk.)
2. On the login page, type `sasindu.p@meridian.lk`. A hint appears: *Meridian International School Colombo signs students in with Microsoft 365*. Sign in (password `demo`).
3. Sasindu is in Year 3, so the banner says **Family-used school account**. The menu has his own pages **and** the family pages: Trips & Activities, Parent Meetings, Fees.
4. **Trips & Activities → Year 3 Dehiwala Zoo → Give consent.** You need the **guardian code** sent to Dilani Perera (shown on screen in the demo). The consent is recorded as "Dilani Perera (guardian code · family account)": a shared pupil login is never treated as the parent's identity.
5. **Parent Meetings → Primary Parent Consultations:** the booking is made in Dilani's name.
6. Compare: Nethmi Perera (Year 10, same family) is "Pupil signs in". Her Student Record shows **Sign-in: Microsoft 365 (Entra ID) · Pupil signs in**.

## Act 2 — University, UK (registrar@demo.com, Dr Eleanor Hughes)
- **Institution Profile:**
  - Region is UK, sub-jurisdiction England.
  - Intakes: **Sep 2027** for all programmes, and **Jan 2027** for the MSc and Business only.
- **Programmes & Modules:** the module catalogue's **Delivery** column shows dated runs per intake. DS701 runs Jan–May for the January cohort and Sep–Jan for the September cohort.
- **Module Registration:** approve and reject requests; prerequisites and capacity are checked.
- **Assessment & Boards:** decide an EC claim, moderate DS701, and ratify the exam board (UK honours bands).
- **Transcripts:** choose Isabelle Fox; the region comparison panel shows how her classification reads in other countries.
- **Attendance → Visa-sponsor monitoring:** degree students are on the **UKVI 60-day engagement policy**. Chen Wei (11 days disengaged, 12 missed points) is **At risk** → **Contact student**. That's an intervention; it doesn't become a report until 60 days.
- **Returns:** HESA Data Futures (missing-ID errors expected) and UKVI.
- **Integrations:** SITS shows an error → **Fix mapping**.

**Lecturer (lecturer@demo.com):** mark CS201 coursework with an EC flag; the moderation rule says a second marker is needed.
**Student (unistudent@demo.com, Arjun):** My Modules shows each module's run dates on his calendar. Request an optional module, submit an EC claim, view the transcript, and check Fees & Funding.

## Act 3 — College, Sydney (college@demo.com, Liam O'Connor)
- **Institution Profile:** Region AU, sub-jurisdiction NSW. Intakes: Feb/Jul (with **census dates**) and **Rolling (VET)**, where students start any Monday.
- **Admissions:**
  - **Sam Fletcher** (carpentry apprenticeship, rolling intake) → **Enrol**. He starts on the next rolling Monday, which is the demo date itself (Mon 2 Nov), and his fee account bills **Term 4 at 65% pro-rata**.
  - The Registers screen excludes learners who haven't started yet.
- **Qualifications & Units:** mark a unit Competent. Ruby is eligible for certification.
- **Apprenticeships & Placements:** log off-the-job hours, and record a risk assessment before a placement can start.
- **Attendance → Visa monitoring:** Sakura (VET) falls under **ESOS 80%** → Report via PRISMS. Ishaan (degree) is **course progress only**, with no attendance duty.
- **Returns:** AVETMISS, TCSI (census dates) and PRISMS.

## Where things live (for production hand-over)
| Concern | Prototype |
|---|---|
| Region defaults & rules | `src/lib/packs/regions.ts` |
| Tenant profile, calendars, intakes, learners, groups | `src/lib/packs/foundationData.ts` |
| Pack registry, activation, starter templates, tenant context | `src/lib/packs/registry.ts` |
| Domain data per pack / module | `src/lib/packs/{schoolData,heData,opsData,bizData}.ts` |
| Menu composition | `src/lib/menus.ts` (`menuForUser`) |
| Pack + module route gating | `src/components/ModuleGate.tsx` |
| PRD change signal | `_bmad-output/planning-artifacts/packs-expansion/prd-amendment-input.md` |
| Intake analysis | `_bmad-output/planning-artifacts/packs-expansion/intakes-start-dates-analysis.md` |
| Domain research (cited) | `_bmad-output/planning-artifacts/research/domain-international-schools-universities-colle-2026-11-02/` |

Regulatory content is grounded in the cited research but remains demo-grade. Each country's compliance pack must confirm it before production.

## Act 4 — SIS completion (parity with private-HE SIS vendors, plus our differentiators)
Every automated email, SMS or WhatsApp message lands in **IT Administration → Outbox**. Every record change lands in **Student Records → History**.

**Admissions CRM (registrar@demo.com → Admissions)**
- **Possible duplicates:** merge Ella Whitaker's two enquiries (walk-in and web form). Link Ashan Jayasuriya to his existing 1StudentID **S-3104**: he's a Meridian Colombo school leaver, so he keeps one ID from school to university.
- **Quick enquiry:** type NIC `200915102233` and the duplicate panel fires live. The enquiry is auto-assigned to the counsellor on duty.
- **My follow-ups:** click Send reminders, then check the Outbox.
- **Targets & funnel:** pick Jan 2027 for the conversion funnel and each counsellor's progress against target.

**Student Records (registrar@demo.com)**
- The banner shows Arjun's passport expiring in 48 days. Click Remind, then upload a new passport version and Verify it.
- On Arjun's record: History shows every change; then Export record.
- Search by passport `Z8812047`. The match appears with the number masked.

**Fees (school@demo.com → Fees & Sponsors)**
- **Bank reconciliation:** import the Emirates NBD sample statement. Lines come out auto-matched, sent for review or unmatched; match the review line by hand.
- **Collection counter:** take a cash payment for Freya Morgan and print the receipt.
- **Reminders:** Run reminders now.
- **Cash flow:** view the 3-month projection, then the funding-body reconciliation.
- **college@demo.com:** one NSW Smart and Skilled bank payment matches 3 instalments at once.

**Exams (registrar@demo.com → Exam Timetable)**
1. The January series has 3 errors. Publish is blocked.
2. Move the clashing CS103 exam, add a room to CS201, then Auto-assign invigilators.
3. Publish. Invigilators and candidates are notified.
4. **unistudent@demo.com → My Exams** shows the timetable, with extra time where it applies.

**Results (registrar@demo.com)**
- **Institution Profile → Grading scheme:** try "4.0 GPA (South Asia)".
- **Assessment & Boards:**
  1. Mark approval: approving CS201 is blocked until moderation is done. Agree the marks, then Approve.
  2. Results release: Publish now.
  3. Appeals: decide Chen Wei's appeal.
- **Transcripts & Awards → Certificates:** Issue batch, then Verify a certificate with code `C4M9Y475`.

**Requests & Approvals**
1. **lecturer@demo.com:** approve Chen Wei's interruption.
2. **registrar@demo.com:** finish the remaining steps. The record becomes Interrupted, the next instalment is Suspended, and the screen says "Report to UKVI within 10 working days".
3. **schoolparent@demo.com:** submit a leave-of-absence request for Adam.

**Lecturer tools**
1. **lecturer@demo.com:**
   - Attendance → Start QR check-in.
   - Then, as **unistudent@demo.com**, Attendance → Check in.
   - Back as **lecturer@demo.com**, Close & save.
2. **Timetable:** move or cancel a class. Everyone affected is notified.
3. **Programmes → Staffing:** CS306 has no lecturer → Suggest → Assign.
4. **Timetable → Rooms:** add, edit or delete a room. Deleting a room in use first asks you to move its classes.

**Alumni**
- **unistudent@demo.com → Alumni:** browse alumni and request a mentor.
- **alumni@demo.com** (Priya Shah, a 2025 graduate) has a slim menu: her record, transcript, fees and Alumni. On Alumni she updates her employer and shares a verified credential.

**IT Administration (registrar@demo.com)**
- **Accounts:** provision new starters and revoke access for leavers, with an audit trail.
- **Lookup:** find a person by 1StudentID, phone or passport.
- **Support desk:** the SLA-breached ticket from Arjun.
- **Outbox:** every notification the demo has sent.

**Classes & Enrolment (school@demo.com → School → Classes & Enrolment)**
- Create a form class or subject set.
- Enrol pupils one at a time or a whole form.
- Move pupils between classes.
- Place pupils who have no class.

Children's avatars show initials, not photos, for every pupil under 18.

## Act 5: every screen shows your own institution, at the right age
The core modules (Courses, Learning, Assignments, Grades, Calendar, My Classes, Appraisals, Messages, AI Insights, Reports, Marketplace) show each institution's own teaching. What they show depends on the learner's age:

| Account | What they see |
|---|---|
| **Year 3: sasindu.p@meridian.lk** | Phonics (split digraphs), "The Owl Who Was Afraid of the Dark", spellings and times tables. Reports use Working towards / Expected / Greater depth. The calendar shows 3B lessons, the zoo trip and the parent consultations. The marketplace shows only ages 6–10 courses. |
| **Parent: schoolparent@demo.com** | Separate views for each child. Zara (IGCSE) has 9–1 predicted and target grades. Adam (CBSE) has PT1 marks out of 20 and half-yearly marks out of 80. The two children's school calendars are colour-coded. |
| **Early years** (Senuli, Upper Nursery; Yousef, FS2) | No homework. A learning journal of observations shared with the family, using EYFS (Dubai) or Sri Lankan pre-school development areas (Colombo). |
| **University: unistudent@demo.com** | CS201 Algorithms lectures, labs and recordings; released module results and GPA. |
| **College: college@demo.com** | Units of competency and workplace tasks marked Satisfactory / Not yet satisfactory. |

School, university and college admins no longer see the older tuition-centre finance, pricing, billing and marketing screens. Fees & Sponsors and the Admissions CRM replace them.
