# One Edu — Full Demo Walkthrough

A follow-along script that sweeps **every major screen**, organised by who logs in.
**All passwords: `demo`.** Click **↺ Reset demo** (top bar) before starting for a clean slate.

| # | Account | Login | Who |
|---|---|---|---|
| 1 | Student | `student@demo.com` | Aarav Perera |
| 2 | Adult student | `adult@demo.com` | Senuli Fernando (18+, self-managed) |
| 3 | Parent | `parent@demo.com` | Nimal Perera (2 children, 6 institutes) |
| 4 | Teacher | `teacher@demo.com` | Dr. Saman Silva |
| 5 | Swim coach | `coach@demo.com` | Coach Mariana Cruz |
| 6 | Institute admin | `principal@royalvista.com` | Ananda — Royal Vista only |
| 7 | Global admin | `admin@demo.com` | Priya — all tenants |

> **Top-bar tools (work in every account):** `⌘K`/`Ctrl+K` command palette · **AI Copilot** (bottom-right bubble) · theme / language / currency switchers · **tenant profile** switcher (Starter/Growth/Enterprise) · notifications bell · **↺ Reset demo**.

---

## 1. Student — `student@demo.com` (Aarav)
- **Dashboard**: GPA, attendance, pending tasks, fees at a glance.
- **Courses** → open any course → class page (overview, instructor + appraisal score).
- **Learning (LMS)**: live class, recordings, SCORM, forums, exams.
- **Assignments**: submissions and grades.
- **Attendance** & **Calendar**: personal history and timetable.
- **Grades**: report card.
- **My Record Book**: notes from teachers; he can read/reply.
- **Teacher Appraisals**: browse teacher scores → open one.
- **Fees & Invoices** → open an invoice for the detail view.
- **Messages**, **Marketplace**, **My Profile**.

## 2. Adult student — `adult@demo.com` (Senuli)
- **Say:** "18+, self-managed — no guardian; she approves her own enrolments and fees."
- **Dashboard**: note the green **self-managed** banner + quick actions.
- **My Record Book**: she **acknowledges entries herself** and posts her own messages.
- **Teacher Appraisals**: she can submit a star rating + comment (like a parent).
- Same Courses / LMS / Fees / Marketplace as a student.

## 3. Parent — `parent@demo.com` (Nimal)
- **Say:** "One login replaces six institute apps across two children."
- **Dashboard**: per-child cards + institutes unified + total dues.
- **My Children**: each child's institutes, fees, latest record-book note, and a **Swim Academy** panel → open a session.
- **Record Book**: pick a child → read, **Acknowledge**, **Reply**, or post a note.
- **Teacher Appraisals**: rate a teacher (star + comment).
- **Courses**: open the Swim Academy → sees only their children's sessions.
- **Attendance**, **Calendar**, **Grades**, **Fees & Invoices**, **Messages**, **Profile**.

## 4. Teacher — `teacher@demo.com` (Dr. Saman Silva)
- **Dashboard**: classes, students, AI suggestions, **My Appraisal** card.
- **My Classes**: cohorts and rosters.
- **Take Attendance** (Attendance → *Take attendance*): default-present, tap exceptions, bulk-mark, **Publish**.
- **Grading**: mark submissions.
- **Record Books**: open a student → post a note (tick *Require acknowledgement*) or reply.
- **Teacher Training**: enrol in a CPD course → tick lessons → **certificate** at 100%.
- **My Appraisal**: open full appraisal — family ratings + student performance blend.
- **Learning (LMS)**, **Students**, **Messages**, **AI Insights**.

## 5. Swim coach — `coach@demo.com` (Mariana)
- **Say:** "A class can have many coaches — a pool runs several sessions at once."
- Lands directly on the **Swim Academy** (her world).
- **Today's pool**: the lane-by-lane layout of concurrent sessions; switch **day / time-slot** chips; see coaches + swimmer counts.
- Click a session block → **session page**:
  - Mark swimmers **Present / Late / Absent** → **Save attendance**.
  - **New record-book note** → pick a swimmer → post.
  - Tick the pool **safety checklist**.
- **My Sessions** (sidebar) and dashboard show only her swim sessions.

## 6. Institute admin — `principal@royalvista.com` (Ananda)
- **Say:** "Scoped to one institute — sees only Royal Vista data."
- **Dashboard**: roster size, fees due/collected, at-risk, recent record-book activity.
- **Students**: roster → **Enrol existing** (cross-tenant): search `senuli.fernando@gmail.com` → request → consent (OTP/magic-link) flow. Also **Import CSV** and **Add student**.
- **Record Books**: only this institute's entries.
- **Settings → Modules**: toggle a module on/off — sidebar updates instantly.
- **Finance** (open an invoice), **Courses** (incl. Swim Academy pool view), **Teacher Appraisals**, **Calendar**, **LMS**, **Users**.

## 7. Global admin — `admin@demo.com` (Priya)
- **Say:** "Platform owner — every tenant, every signal."
- **Dashboard**: cross-tenant MRR, students, leads, at-risk; revenue & attendance trends.
- **Tenants**: all institutions, plans, MRR.
- **Users & Roles**: RBAC and provisioning.
- **Reports & BI**, **Marketing & CRM**, **AI Insights**.
- **Migration & Imports**, **Compliance & Audit** (audit log).
- **Settings → Modules**: pick any tenant and set its plan/entitlements.
- **Marketplace**, **Finance**, **Courses / Swim Academy**, **Teacher Appraisals**, **Teacher Training**.

---

## Optional extras (not in the sidebar)
- **Onboard a new tenant** — a 4-step guided setup wizard. Reach it via the address bar at **`/app/onboarding`** (or the `⌘K` command palette) while logged in as **admin@demo.com**. Good for the "stand up a new institution in minutes" story.
- **My Profile** (every role) and the **invoice detail** page (open any invoice from Fees/Finance) round out the deep-dive screens.

---

## Cross-account proof (do last) · ~2 min
1. As **teacher@demo.com** → **Record Books → Aarav** → post a note + reply.
2. As **parent@demo.com** → **Record Book** → it's there → **Acknowledge** + **Reply**.
3. Back as **teacher@demo.com** → the parent's reply is visible.
   - **Say:** "Two-way thread, persists across logins — until you Reset demo." (Same for `teacher@demo.com` ↔ `adult@demo.com` on Senuli's book.)

**Close:** "One login, one platform — modular per tenant, role-aware for every user, from a physics class to a swimming squad."
