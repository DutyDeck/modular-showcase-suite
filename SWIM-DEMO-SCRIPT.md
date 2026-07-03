# Royal Vista Aquatics — 1StudentID Demo Script

A guided walk-through for demonstrating **1StudentID** to a swim club. The whole app
is scoped to a single-purpose swim-club product for the swim accounts, so nothing
"school-like" leaks into the demo.

---

## Before you start (2 minutes)

1. The app **auto-refreshes its demo data** whenever a new version is deployed, so
   every screen is populated on first load. If anything ever looks empty mid-demo,
   click **"Reset demo"** (top-right of the header) and refresh.
2. *Optional:* on the login page, **Start guided demo** runs a self-driving tour of
   this whole script — it logs in as each persona, opens and submits real forms,
   and explains each step in a tooltip. Great as a rehearsal or a kiosk loop; the
   script below is the presenter-driven version.
3. Have these logins ready (password is `demo` for all):

| Persona | Login | Who they are |
|---|---|---|
| **Club Manager** | `clubadmin@demo.com` | Jessica Davies — runs the whole club |
| **Swim Coach** | `coach@demo.com` | Coach Ava Johnson — Head Coach, sees only her own swimmers |
| **Parent** | `parent@demo.com` | Jack Smith — dad of Oliver (squad) & Olivia (learn-to-swim) |
| **Co-parent** | `coparent@demo.com` | Amelia Smith — Oliver & Olivia's mum, separate login |
| **Swimmer** | `student@demo.com` | Oliver Smith — competitive squad |

> **One-line pitch:** "Royal Vista Aquatics runs its whole club — registration,
> attendance, coaching, awards, competition, safeguarding, fees and family
> communication — from one app, with one login per family member. Let me show you
> a day in the life."

**Golden rule of the demo:** the coach only ever sees *her own* swimmers; the
manager sees the *whole club*; each parent sees *only their own children*. Call
this out — it's the real-world least-privilege story clubs care about.

---

## Act 1 — The Club Manager (`clubadmin@demo.com`)

### 1. Capacity planning — the dashboard opener
- **You land on the Dashboard.** Scroll to **Capacity planning**.
- **Point out:** every session's **seat fill** (e.g. 6/12) and **coach staffing**,
  the overall utilisation %, and the **Under-filled / Low** flags on weak sessions.
- **Show** the consolidation suggestion under an under-filled session — *"move
  these 2 swimmers into [a fuller same-level session] (has N free seats)"* — and
  that it links straight to the session where the move happens.
- **Say:** "A ten-seat session with two swimmers loses the club money. The manager
  sees fill rates at a glance and consolidates groups in two clicks — that's
  revenue protection, not just admin."

### 2. Register a swimmer & assign to a class *(add-new vs add-existing)*
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
  `emily.taylor01@gmail.com` or `S-2002`) → pick a **swim session** to enrol into
  → **Request** → **Approve** (OTP or one-click magic link) → **Enrolled**. The
  swimmer appears on the roster with an *"Enrolled via consent"* badge.
- **Say:** "If a swimmer already exists on 1StudentID at another institute, we never
  re-key or duplicate them. Notice we can only search by email or reference, and
  **age, contact details and records stay hidden until the student or guardian
  approves** — that's GDPR-safe by design."
- **Modify a swimmer's programme:** on any swimmer row click the **sliders icon
  (Manage programme)** → add them to a session or remove them from one.
- **Off-board a swimmer who leaves:** on a swimmer row click the **Off-board
  (person-minus) icon** → pick a **reason** and **effective date**, and confirm
  the two switches: **stop recurring billing** and **stop automated messaging** →
  *Off-board swimmer*. To bring them back, click **Reactivate (rotate icon)**.
- **Say:** "When a swimmer leaves we don't delete them — that would breach our
  record-keeping duty. We **off-board** them: history retained, but Direct Debits
  and automated reminders stop immediately. If they come back, one click
  reactivates everything."

### 3. Courses & Awards — the club's own curriculum *(admin adds courses)*
- **Go to:** Courses & Awards.
- **Show** the award pathway — **Duckling 1–4** and **Learn to Swim Stage 1–2** —
  modelled exactly on the Swim England scheme. Click **Duckling 4**: the **8
  activities** a swimmer must demonstrate (jump in unaided, mushroom float, 360°
  rotation, push-and-glide, submerge, 10 m travel…) and every swimmer's progress
  against them.
- **Do:** Click **New course** → name it (e.g. *Learn to Swim Stage 3*), pick the
  strand and badge colour, and type the **activities checklist** (one per line) →
  *Add course*.
- **Say:** "The club defines its own award courses — each one is a checklist of
  activities. Coaches tick them off in the session, and when the last one's done
  the certificate is issued automatically. We'll watch that happen in Act 2."

### 4. Coaches & sessions — cover an absent coach & off-board a leaver
- **Go to:** Coaches & Sessions.
- **Do (cover):** On an upcoming session click **Manage** → mark a coach **absent**
  (reason + optional substitute). The swap flows into the timetable and the
  coach-attendance report.
- **Do (temporary cover, 12h):** in the same dialog use **Temporary cover ·
  auto-reverts in 12h** → pick a coach → **Cover 12h**. Back on the list the coach
  shows a **timer badge** with hours remaining and an **End now** link.
- **Say:** "Coach stuck in traffic or off sick for one evening? Drop a temporary
  cover in — it *automatically reverts after 12 hours*, so the timetable never
  drifts out of date. Permanent changes stay permanent; one-off cover cleans
  itself up."
- **Do (off-board a coach):** In the **Coaching team** card, click **Off-board** on
  a coach who's left → same GDPR-safe leaver flow (history kept, payroll and
  messaging stop). Off-boarded coaches can no longer be rostered or picked as
  cover; **Reactivate** brings them back.
- **Shortcut — manage coaches from the session itself:** open any session (e.g.
  Swim Club → a session). As the manager you get a **Manage coaches** button on
  *"Coaches on deck"* — change **both the coach and the swimmers in one place**.

### 5. Finance — mandates, co-parents & who paid what
- **Go to:** Fees & Finance.
- **Point out** the framing: the manager runs **collections** — *Collected*,
  *Outstanding*, *Collection rate* — not "pay now".
- **Scroll to** **Payment methods & mandates**: each family's preferred method
  (Direct Debit / Card / Cash) with mandate status. **Flag** the amber/red ones —
  a **Pending** mandate awaiting signature and a **Failed** direct debit.
- **Point out** on paid invoices the small **"by Jack" / "by Amelia"** under the
  Paid badge — *who* in the family settled each fee.
- **Say:** "Separated parents are normal life for a club. Both of Oliver's parents
  have their own logins, both see the children, and each can pay for different
  classes — dad covers the squad fees, mum covered the award assessment. Every
  payment records who made it. We'll see the parents' side in Act 3."
- **Tie-back:** if you off-boarded a swimmer in step 2, point to their mandate now
  reading **Stopped · off-boarded** — proof billing genuinely halts.
- **Do:** On a due invoice click **Record payment** → choose *Direct Debit / Card
  / Cash* → record.

### 6. Marketing & CRM — contacting potential swimmers
- **Go to:** Marketing & CRM.
- **Say:** "These leads came from our Facebook and Instagram campaigns and walk-ins."
- **Do:** On a lead click **Contact** → log a **Call / WhatsApp / Email** with a
  note, and tick *mark as contacted* → the lead advances **New → Contacted**.
- **Add a lead:** click **New Lead** — capture **phone and/or email** (required),
  with a swim-specific **Programme of interest** picklist and the aquatics team as
  **Owner**.
- **Point out** the **Contact** column — click-to-call / click-to-email.

### 7. Coach education & CPD — assign development to a coach
- **Go to:** Coach Training.
- **Do:** Click **Assign CPD** → pick a coach + an aquatics course (e.g.
  *Safeguarding in Aquatics*) + due date → assign.
- **Say:** "The manager recommends CPD to each coach and tracks completion. We'll
  see the coach's side shortly."

### 8. Coach appraisals — family stars *and* the club's own grade
- **Go to:** Coach Appraisals → open **Coach Ava Johnson**.
- **Show** the blended score (family ratings × squad performance) and the reviews.
- **Point out** any review marked **Anonymous** — the coach sees "Anonymous
  parent", but **as the manager you still see exactly who wrote it** (accountability
  without exposure).
- **Club grade (management appraisal):** scroll to **Club grade**. Ava holds
  **Gold** with a private management note.
  - **Do:** set a level — **Bronze / Silver / Gold / Platinum** — with a comment →
    *Save grade*.
  - **Show** the visibility toggle: **Private (admin & coach only)** by default;
    one click makes the medal visible to parents and other coaches.
- **Say:** "Parents rate what they see; the club grades what it knows — how well a
  coach actually develops swimmers. A coach can be parent-popular but
  under-training the kids, and this is where we track that. It's private between
  management and the coach unless the club chooses to publish it."

### 9. Summary reports — daily to yearly, plus month-end HR
- **Go to:** Summary Reports.
- **Do:** Toggle **Daily / Weekly / Monthly / Yearly**. The **Monthly** view is a
  **true calendar month** (1st→31st); ‹ › steps whole months.
- **Walk through:** sessions conducted, swimmer attendance, coach attendance &
  cover, swimmers rated, record-book activity, **incidents**, and **wellbeing
  check-ins**.
- **Monthly evaluation (HR view):** on **Monthly**, the manager gets an extra
  block — a **Coach summary (HR)** table (sessions led, absences, cover carried,
  **reliability %**, notes, ratings, incidents, wellbeing) and a **Swimmer
  attendance** table (worst-first, sub-75 % flagged red).
- **Do:** Click **Print / export** for a board-ready report.

---

## Act 2 — The Swim Coach (`coach@demo.com`)

> Log out and back in as the coach. **Note:** her menu and data are the club, and
> only *her* sessions and swimmers — nothing else.

### 10. Attendance record
- **Go to:** Swim Club → open today's session (or Dashboard → today's pool).
- **Do:** Mark swimmers **Present / Late / Absent** and **Save**.
- **Say:** "Register taken poolside on a phone or tablet in seconds."

### 11. Courses & awards — tick activities, earn the certificate ⭐
- **In the session,** scroll to **Courses & awards** — every swimmer on the
  register with the award they're working on.
- **Do:** On a swimmer with a course in progress (e.g. **Olivia — Duckling 4,
  5/8**), click **Activities** and **tick the remaining items** as she
  demonstrates them. On the final tick:
  - the award **auto-certifies** ("Olivia earned Duckling 4! Parents notified"),
  - her **parents get a message** announcing the achievement,
  - a **Certificate** link appears — open it: a print-ready, Swim England-style
    certificate ("Well done! … You're now ready for Learn to Swim Stage 1"), with
    the completed criteria on the back. Click **Print / Save PDF**.
- **Do:** For a swimmer with no course, pick one from **Start a course…**.
- **Say:** "This is the swimmer journey in one flow: the coach ticks off skills
  poolside, the certificate issues itself, and mum and dad hear about it before
  pick-up. No paper cards, no lost badges."

### 12. Temporary class move *(swimmers, auto-reverts after 12h)*
- **In the session,** click **Move swimmer** → pick a swimmer → choose another
  session → **Temporary (today)** → move. The destination shows a **"Temp · Xh
  left"** badge and a **Move back** button.
- **Say:** "Lane too crowded, or trialling a faster group? Move a swimmer for the
  day — it auto-reverts after 12 hours. Same idea as the manager's temporary coach
  cover: one-off changes clean themselves up."

### 13. Safety & wellbeing
- **In the session,** under *Record book, safety & wellbeing*:
  - **Do:** **Log incident** (e.g. a minor slip) — Type, Severity, action taken.
  - **Do:** **Wellbeing check** — pick a swimmer, set **Green / Amber / Red**.
- **Say:** "Safeguarding is first-class. Incidents and wellbeing flags roll
  straight into the club report."

### 14. Learning plan & progress + qualify for the next level
- **Go to:** Record Books → open a swimmer (e.g. **Olivia**).
- **Show** the **Level & progression** card and the **Awards & certificates**
  panel (the Duckling 4 certificate you just issued is already there).
- **Do:** Click **Record assessment** → tick criteria met → save; a fully-met
  swimmer is **Qualified** and can be **Promoted** into a next-level session.
- **Also show:** the **record-book timeline** — the two-way log shared with the
  family.

### 15. Competitive club management — race times & PBs
- **Go to:** Competitive Squad.
- **Do:** Click **Log a time** → swimmer + event + time (e.g. `30.20`) → log. If it
  beats their best, a **🏅 New PB** flags instantly.
- **Say:** "Oliver has taken 1.6 seconds off his 50 free this term."

### 16. Coach education & my appraisal
- **Go to:** Coach Education — **Recommended for you** shows the CPD the manager
  assigned in Act 1.
- **Go to:** My Appraisal — the coach sees her blended score, her reviews
  (anonymous ones show as **"Anonymous parent"** — she can't see who), and her
  **Club grade (Gold)** with management's note. "Private feedback loop between the
  club and the coach."

### 17. Messaging with parents
- **Go to:** Messages.
- **Do:** Open the thread with **Jack Smith** (Oliver's dad) and send a message —
  notice the earlier **automatic certificate notification** in a parent thread.
- **Say:** "Two-way, logged messaging — no personal phone numbers, no lost
  WhatsApp threads."

### 18. My profile *(works for every account)*
- **Go to:** My Profile → **Edit profile** — upload a photo, change name/phone/
  tagline. **Email is locked** (it's the account key).
- **Say:** "Everyone maintains their own profile — coaches, parents, swimmers.
  The login email never changes, so identity stays stable."

---

## Act 3 — The Parents (`parent@demo.com`, then `coparent@demo.com`)

> Log in as **Jack** (dad). **Emphasise:** one login for the whole family, and
> each parent sees **only their own children**.

- **Dashboard:** Oliver and Olivia — and the **Swim awards & certificates** card:
  Olivia's freshly-earned **Duckling 4** (open → print the certificate) and
  Oliver's award progress.
- **Record Book (Olivia):** the coach's notes, the **Level & progression** card,
  and **Awards & certificates**.
- **Record Book (Oliver):** competitive squad — his **personal bests**.
- **Messages:** the coach's reply *and* the automatic **certificate
  notification** — "🏅 Great news! Olivia has completed Duckling 4…".
- **Fees:** the family's invoices; dad pays the squad fee — the invoice records
  **"by Jack"**.
- **Teacher Appraisals → Coach Ava:** leave a **star rating and comment** — and
  **tick "Submit anonymously"**.
  - **Say:** "Honest feedback without awkwardness at the poolside. The coach sees
    the stars but not the name; the club manager still can, so it can't be abused."

> **Now log in as Amelia (`coparent@demo.com`) — the co-parent.**

- **Point out** the banner on Fees: *"Shared with Jack — you both look after Oliver
  & Olivia. Each of you can pay for different classes independently."*
- **Show:** the **same two children**, the same record books and certificates —
  and a **Due** invoice for a *different class* (e.g. Oliver's Triathlon squad).
  **Pay it** — it records **"by Amelia"**.
- **Say:** "Separated parents both stay fully involved: both see everything about
  their child, and each pays for what they've agreed to — separate logins,
  separate payments, one child record. This is a real scenario clubs handle every
  week, and most systems can't."

---

## Act 4 — Wrap-up talking points

### IT reliance & management overhead
- **Fully hosted SaaS** — no servers, no installs, works on any phone, tablet or
  laptop through a browser.
- **One identity per person** across the club (and any other 1StudentID institute
  they belong to) — no duplicate accounts, no re-keying.
- **Self-service** registration, fees, profiles and messaging pushes day-to-day
  admin out of the office — coaches mark registers poolside, parents update their
  own details and pay their own way.
- Demo data **auto-refreshes on deploy**; CSV import/migration for onboarding from
  spreadsheets or a legacy system (**Migration & Imports**).

### Support structure
- In-app help and guided onboarding (including the **self-running guided demo**);
  email/ticket support with defined response times; a named account manager.
- Role-based access (RBAC) and audit trail (**Compliance & Audit**) — important
  for safeguarding.

### Feature requests & development time
- The platform is **modular** — modules switch on/off per club.
- **Say:** "You've just seen features built specifically for a swim club — award
  checklists with automatic certificates, capacity planning, 12-hour temporary
  moves for swimmers *and* coaches, co-parent payments, private coach grading.
  That's how we respond to what a club actually needs."

---

## Quick reference — feature → where to find it

| Demo point | Persona | Screen |
|---|---|---|
| **Capacity planning (seat fill, consolidation)** | Manager | Dashboard → Capacity planning |
| Register (new / existing) + assign | Manager | Swimmers |
| Modify a swimmer's programme | Manager | Swimmers → Manage programme (sliders icon) |
| **Add an award-course (activity checklist)** | Manager | Courses & Awards → New course |
| **Tick activities → auto-certificate + parent notify** | Coach | Session → Courses & awards |
| **Print a certificate** | Coach/Parent/Swimmer | Certificate link (session, record book, dashboard) |
| Temporary class move (12h revert) | Coach | Session → Move swimmer |
| **Temporary coach cover (12h revert)** | Manager | Coaches & Sessions → Manage → Cover 12h |
| Attendance | Coach | Session |
| Learning plan & progress | Coach/Parent | Record Book · Learning (LMS) |
| Qualify for next level | Coach | Record Book → Level & progression |
| Payment method (DD/Card/Cash) | Manager | Fees & Finance |
| **Co-parent access & separate payments ("by Jack/Amelia")** | Parents | Fees (both parent logins) |
| Coach training | Coach | Coach Education |
| Assign/recommend CPD | Manager | Coach Training → Assign CPD |
| Ratings & parent feedback (**incl. anonymous**) | Parent | Teacher Appraisals → Coach Ava |
| **Club grade (Bronze/Silver/Gold/Platinum + visibility toggle)** | Manager | Coach Appraisals → coach → Club grade |
| Competitive times / PBs | Coach | Competitive Squad |
| Safety & wellbeing | Coach | Session → Log incident / Wellbeing check |
| Reports (any period) | Manager | Summary Reports |
| Monthly evaluation (HR: staff + swimmer roll-up) | Manager | Summary Reports → **Monthly** |
| Messaging (incl. auto certificate notifications) | Coach ↔ Parents | Messages |
| Add lead (with phone/email) + outreach | Manager | Marketing & CRM → New Lead / Contact |
| Coach cover / substitution | Manager | Coaches & Sessions |
| Manage coach + swimmers on one screen | Manager | Session → **Manage coaches** |
| Off-board a swimmer / coach (GDPR leaver) | Manager | Swimmers / Coaching team → **Off-board** |
| Reactivate an off-boarded person | Manager | Swimmers / Coaching team → **Reactivate** |
| **Edit own profile (photo, details; email locked)** | Everyone | My Profile → Edit profile |
| **Self-running guided demo** | — | Login page → Start guided demo |

*Tip: demo data refreshes itself after each deploy. If anything looks empty
mid-demo, click **Reset demo** and refresh.*
