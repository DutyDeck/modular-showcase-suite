# Royal Vista Aquatics — 1StudentID Demo Script

A guided walk-through for demonstrating **1StudentID** to a swim club. The whole app
is scoped to a single-purpose swim-club product for the swim accounts, so nothing
"school-like" leaks into the demo.

---

## Before you start (2 minutes)

1. Open the app and click **"Reset demo"** (top-right of the header). This reloads
   the seeded demo data — race times, payment mandates, CPD, wellbeing, leads —
   so every screen is populated. **Do this once before the demo.**
2. Have these four logins ready (password is `demo` for all):

| Persona | Login | Who they are |
|---|---|---|
| **Club Manager** | `clubadmin@demo.com` | Nadeesha Fonseka — runs the whole club |
| **Swim Coach** | `coach@demo.com` | Coach Mariana Cruz — Head Coach, sees only her own swimmers |
| **Parent** | `parent@demo.com` | Nimal Perera — dad of Aarav (squad) & Tashi (learn-to-swim) |
| **Swimmer** | `student@demo.com` | Aarav Perera — competitive squad |

> **One-line pitch:** "Royal Vista Aquatics runs its whole club — registration,
> attendance, coaching, competition, safeguarding, fees and family communication —
> from one app, with one login per family. Let me show you a day in the life."

**Golden rule of the demo:** the coach only ever sees *her own* swimmers; the
manager sees the *whole club*; the parent sees *only their own children*. Call
this out — it's the real-world least-privilege story clubs care about.

---

## Act 1 — The Club Manager (`clubadmin@demo.com`)

### 1. Register a swimmer & assign to a class *(add-new vs add-existing)*
- **Go to:** Swimmers.
- **Point out** the two highlighted buttons top-right: **Register new swimmer**
  and **Enrol existing swimmer**.
- **Do (new):** Click **Register new swimmer** → name, **date of birth**, starting
  **level**, and **assign to a session**. Watch the **1StudentID login** panel react
  to the age:
  - Under 18 → **the parent/guardian holds the login** (asks for guardian name +
    email).
  - 18 or over → **the swimmer manages their own login** (their email).
  - Pick a **sign-in method** — Google, Apple ID, Microsoft Entra ID, or a
    1StudentID email login → *Register & create login*.
- **Say:** "Registering a swimmer also onboards them onto 1StudentID. If they're a
  child, the login goes to the parent; if they're an adult, to the swimmer. And they
  sign in with what they already use — Google, Apple, Microsoft/Entra, or our own
  login."
- **Do (existing):** Click **Enrol existing swimmer** → the **cross-institute
  consent flow**: **Find** (search by email or 1StudentID ref — try
  `senuli.fernando@gmail.com` or `S-2002`) → pick a **swim session** to enrol into
  → **Request** → **Approve** (OTP or one-click magic link) → **Enrolled**. The
  swimmer appears on the roster with an *"Enrolled via consent"* badge.
- **Say:** "If a swimmer already exists on 1StudentID at another institute, we never
  re-key or duplicate them. Notice we can only search by email or reference, and
  **age, contact details and records stay hidden until the student or guardian
  approves** — that's GDPR-safe by design. Once approved, their details unlock and
  they're enrolled straight into a Royal Vista Aquatics session."
- **Modify a swimmer's programme:** on any swimmer row click the **sliders icon
  (Manage programme)** → add them to a session or remove them from one. Their
  **programme** (the levels they train in) updates live.
- **Say:** "The manager has full control of each swimmer's programme right here —
  move them between Learn-to-Swim, Stroke Development or Squad without touching a
  coach."
- **Off-board a swimmer who leaves:** on a swimmer row click the **Off-board
  (person-minus) icon** → pick a **reason** and **effective date**, and confirm
  the two switches: **stop recurring billing** and **stop automated messaging** →
  *Off-board swimmer*. The swimmer's status flips to **Off-boarded** and the row's
  Manage-programme action disappears. To bring them back, click **Reactivate
  (rotate icon)**.
- **Say:** "When a swimmer leaves we don't delete them — that would breach our
  record-keeping duty. We **off-board** them: all their attendance, record books
  and invoices are retained, but recurring Direct Debits and automated reminders
  stop immediately, so no family is billed or messaged after they've left. If they
  come back, one click reactivates everything."

### 2. Coaches & sessions — cover an absent coach & off-board a leaver
- **Go to:** Coaches & Sessions.
- **Do (cover):** On an upcoming session, **remove** a coach (mark absent) and
  **add** a substitute.
- **Say:** "Coach off sick? The manager covers the session in seconds — the swap
  flows straight into the timetable and the coach-attendance report."
- **Do (off-board a coach):** In the **Coaching team** card, click **Off-board** on
  a coach who's left the club → same GDPR-safe leaver flow (history kept, payroll
  and messaging stop). Off-boarded coaches show an **Off-boarded** tag and can no
  longer be rostered or picked as cover; **Reactivate** brings them back.
- **Shortcut — manage coaches from the session itself:** open any session (e.g.
  Swim Club → a session, or `/app/sessions/PS-01`). As the manager you now get a
  **Manage coaches** button on *"Coaches on deck"* right beside the swimmer tools —
  so you can change **both the coach and the swimmers in one place** without
  leaving the session.
- **Say:** "The manager can fix a whole session from one screen — swap the coach,
  move a swimmer, take the register — no jumping between pages."

### 3. Finance — preferred payment method (Direct Debit / Card / Cash)
- **Go to:** Fees & Finance.
- **Point out** the framing: the manager runs **collections** — *Collected*,
  *Outstanding*, *Collection rate* — not "pay now".
- **Scroll to** **Payment methods & mandates**: each family's preferred method
  (Direct Debit / Card / Cash) with mandate status. **Flag** the amber/red ones —
  a **Pending** mandate awaiting signature and a **Failed** direct debit.
- **Say:** "Most families are on Direct Debit; some pay by card or cash at the
  desk. Failed mandates surface immediately so nothing slips through."
- **Tie-back:** if you off-boarded a swimmer in step 1, point to their mandate now
  reading **Stopped · off-boarded** and the *Stopped (off-boarded)* chip — proof
  the billing genuinely halts the moment a family leaves.
- **Do:** On a due invoice click **Record payment** → choose *Direct Debit / Card
  / Cash* → record.

### 4. Marketing & CRM — contacting potential swimmers
- **Go to:** Marketing & CRM.
- **Say:** "These leads came from our Facebook and Instagram campaigns and walk-ins."
- **Do:** On a lead click **Contact** → log a **Call / WhatsApp / Email** with a
  note, and tick *mark as contacted* → the lead advances **New → Contacted**.
- **Add a lead:** click **New Lead** — capture **phone and/or email** (required, so
  the lead can actually be followed up), and note the form is swim-specific:
  **Programme of interest** is a picklist (Learn-to-Swim, Squad tryout, Adult
  beginner, Diving, Parent & child…) and **Owner** lists the aquatics team — no
  college course names.
- **Point out** the **Contact** column — phone and email are click-to-call /
  click-to-email, and appear at the top of the **Contact** dialog so whoever picks
  up the lead can reach out in one tap.
- **Show** the **Recent outreach** list building underneath.
- **Say:** "Every touchpoint is logged, so whoever picks the lead up next sees the
  full history."

### 5. Coach education & CPD — assign development to a coach
- **Go to:** Coach Training.
- **Show** the **Coach CPD assignments** board across the team.
- **Do:** Click **Assign CPD** → pick a coach + an aquatics course (e.g.
  *Safeguarding in Aquatics*) + due date → assign.
- **Say:** "The manager recommends CPD to each coach and tracks completion —
  safeguarding, lifeguarding, squad coaching. We'll see the coach's side shortly."

### 6. Coach appraisals — the centre manager's view
- **Go to:** Coach Appraisals.
- **Say:** "Each coach's rating blends *family feedback* with *squad performance*.
  As Club Manager I can open any coach's appraisal to review and add my own notes."

### 7. Summary reports — what's available
- **Go to:** Summary Reports.
- **Do:** Toggle **Daily / Weekly / Monthly / Yearly**. Note the period label — the
  **Monthly** view is a **true calendar month** (e.g. *July 2026*, 1st→31st), and the
  ‹ › arrows step whole months/years back.
- **Walk through:** sessions conducted, swimmer attendance, coach attendance &
  cover, swimmers rated, record-book activity, **incidents**, and
  **wellbeing check-ins** (amber/red flagged for follow-up).
- **Monthly evaluation (HR view):** on **Monthly**, the manager gets an extra
  **Monthly evaluation** block:
  - A **Coach summary (HR)** table — per coach: sessions led, absences, sessions
    they covered for others, **reliability %**, notes posted, swimmers rated + avg
    rating, incidents and wellbeing check-ins logged. "This is my month-end staff
    review in one table — who's reliable, who's carrying cover, who's engaging with
    safeguarding."
  - A **Swimmer attendance** table — every swimmer's present/late/absent and
    attendance %, worst-first, with sub-75% flagged red. "One glance at who's
    slipping so we can call the family before they drop out."
- **Do:** Click **Print / export** to show a board-ready report.
- **Say:** "Everything the committee and HR ask for — attendance, safeguarding,
  coaching cover, staff reliability, competition — one screen, any period, printable."

---

## Act 2 — The Swim Coach (`coach@demo.com`)

> Log out and back in as the coach. **Note:** her menu and data are the club, and
> only *her* sessions and swimmers — nothing else.

### 8. Attendance record
- **Go to:** Swim Club → open today's session (or Dashboard → today's pool).
- **Do:** Mark swimmers **Present / Late / Absent** and **Save**.
- **Say:** "Register taken poolside on a phone or tablet in seconds."

### 9. Temporary class move *(same day, auto-reverts after 12h)*
- **In the session,** click **Move swimmer** → pick a swimmer → choose another
  session → **Temporary (today)** → move.
- **Open the destination session:** the swimmer is there with a **"Temp · Xh left"**
  badge and a **Move back** button.
- **Say:** "Lane too crowded, or trialling a faster group for the night? Move a
  swimmer for the day. It **auto-reverts after 12 hours** — or I move them back
  with one tap. Their home group is never lost."

### 10. Safety & wellbeing
- **In the session,** under *Record book, safety & wellbeing*:
  - **Do:** **Log incident** (e.g. a minor slip) — Type, Severity, action taken.
  - **Do:** **Wellbeing check** — pick a swimmer, set **Green / Amber / Red**, add
    a pastoral note.
- **Say:** "Safeguarding is first-class here. Incidents and wellbeing flags both
  roll straight into the club report for follow-up."

### 11. Learning plan & progress + qualify for the next level
- **Go to:** Record Books → open a swimmer (e.g. **Tashi**).
- **Show** the **Level & progression** card: current level, the criteria to move
  up, and the latest coach assessment.
- **Do:** Click **Record assessment** → tick the criteria met → save. If all are
  met, the swimmer is **Qualified** to move up; if not, it reads **"Not yet"**.
- **Say:** "This is how a swimmer *qualifies for the next level* — assessed against
  clear criteria. Tashi has met all four, so she's ready to move up to Stroke
  Development."
- **Do:** With a qualified swimmer, click **Promote** → they're moved into a
  next-level session.
- **Also show:** the **record-book timeline** — the two-way log of notes,
  achievements and star ratings shared with the family.
- **Learning content:** the club's **Swim Learning Hub** (Manager menu →
  *Learning (LMS)*) holds the technique videos, dryland programmes, drill library
  and water-safety e-learning that back up each swimmer's learning plan. Mention
  it here; show it in Act 1 if you prefer to keep it on the Manager login.

### 12. Competitive club management — race times & PBs
- **Go to:** Competitive Squad.
- **Show** the **Personal-best board** — every squad swimmer × event (50m/100m
  Free, Fly, IM) with their fastest time.
- **Do:** Click **Log a time** → pick a swimmer + event + time (e.g. `30.20`) → log.
  If it beats their best, a **🏅 New PB** is flagged instantly.
- **Say:** "This is the competitive engine — 50m and 100m times, personal bests,
  meet-by-meet improvement. Aarav has taken 1.6 seconds off his 50 free this term."

### 13. Coach education (the coach's side of CPD)
- **Go to:** Coach Education.
- **Show** **Recommended for you** — the CPD the manager assigned in Act 1, with
  status and due dates — plus the aquatics catalogue (lifeguarding, stroke
  correction, squad coaching, safeguarding).
- **Say:** "Coaches see exactly what's been recommended for them and can start it
  in-app."

### 14. Messaging with parents
- **Go to:** Messages.
- **Do:** Open the thread with **Nimal Perera** (Aarav's dad) and send a message.
- **Say:** "Two-way, logged messaging — no personal phone numbers, no lost WhatsApp
  threads. Watch it appear on the parent's side in a moment."

---

## Act 3 — The Parent (`parent@demo.com`) — *what the family sees*

> Log in as the parent. **Emphasise:** one login for the *whole family*, and they
> see **only their own children**.

- **Dashboard / My Children:** Aarav and Tashi, both under **Royal Vista Aquatics**.
- **Record Book (Tashi):** the coach's notes, achievements, star ratings, and the
  **Level & progression** card — the parent can see Tashi is **ready to move up**.
- **Record Book (Aarav):** competitive squad — his **personal bests** and progress.
- **Messages:** the reply from Coach Mariana that you just sent is right there.
- **Teacher Appraisals → Coach Mariana:** the parent leaves a **star rating and
  comment** for the coach.
  - **Say:** "Family feedback feeds directly into the coach's appraisal the manager
    reviewed earlier — the loop is closed."
- **Fees:** the family's invoices and their Direct Debit — clear and self-service.

> **Say:** "Everything the coach and manager did is visible to the family in real
> time, and nothing about other people's children ever is."

---

## Act 4 — Wrap-up talking points

Use these to answer the "how much does this cost us to run?" questions.

### IT reliance & management overhead
- **Fully hosted SaaS** — no servers, no installs, works on any phone, tablet or
  laptop through a browser.
- **One identity per family** across the club (and across any other 1StudentID
  institute they belong to) — no duplicate accounts, no re-keying.
- **Self-service** registration, fees and messaging pushes day-to-day admin *out*
  of the office and onto the people doing the task — coaches mark registers
  poolside, parents update their own details.
- **Reset/rollback & data export** built in; CSV import/migration for onboarding
  from spreadsheets or a legacy system (**Migration & Imports**).

### Support structure
- In-app help and guided onboarding; email/ticket support with defined response
  times; a named account manager for the club.
- Role-based access (RBAC) and audit trail (**Compliance & Audit**) so you always
  know who did what — important for safeguarding.

### Feature requests & development time
- The platform is **modular** — modules can be switched on/off per club, so you
  only see what you use.
- Club-specific requests go onto a shared roadmap; small configuration changes
  (branding, levels, fee structures) are self-serve or quick-turnaround, larger
  features are scoped and scheduled transparently.
- **Say:** "You've just seen features built specifically for a swim club —
  temporary lane moves, level qualification, PB tracking, direct-debit mandates.
  That's how we respond to what a club actually needs."

---

## Quick reference — feature → where to find it

| Demo point | Persona | Screen |
|---|---|---|
| Register (new / existing) + assign | Manager | Swimmers |
| Modify a swimmer's programme | Manager | Swimmers → Manage programme (sliders icon) |
| Temporary class move (12h revert) | Coach | Session → Move swimmer |
| Attendance | Coach | Session |
| Learning plan & progress | Coach/Parent | Record Book · Learning (LMS) |
| Qualify for next level | Coach | Record Book → Level & progression |
| Payment method (DD/Card/Cash) | Manager | Fees & Finance |
| Coach training | Coach | Coach Education |
| Assign/recommend CPD | Manager | Coach Training → Assign CPD |
| Ratings & parent feedback | Parent | Teacher Appraisals |
| Centre manager appraisal | Manager | Coach Appraisals |
| Competitive times / PBs | Coach | Competitive Squad |
| Safety & wellbeing | Coach | Session → Log incident / Wellbeing check |
| Reports (any period) | Manager | Summary Reports |
| **Monthly evaluation (HR: staff + swimmer roll-up)** | Manager | Summary Reports → **Monthly** |
| Messaging | Coach ↔ Parent | Messages |
| Add lead (with phone/email) + outreach | Manager | Marketing & CRM → New Lead / Contact |
| Coach cover / substitution | Manager | Coaches & Sessions |
| **Manage coach + swimmers on one screen** | Manager | Session → **Manage coaches** (on "Coaches on deck") |
| **Off-board a swimmer** (GDPR leaver, stops billing/messaging) | Manager | Swimmers → **Off-board** (person-minus icon) |
| **Off-board a coach** (GDPR leaver) | Manager | Coaches & Sessions → Coaching team → **Off-board** |
| **Reactivate an off-boarded person** | Manager | Swimmers / Coaching team → **Reactivate** |

*Tip: if anything looks empty during the demo, you skipped **Reset demo** — click
it and refresh.*
