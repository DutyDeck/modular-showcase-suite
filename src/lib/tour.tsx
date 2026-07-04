import { useSyncExternalStore } from "react";
import { SWIM_COURSE_ID } from "./mockData";
import { resetStore } from "./store";

/**
 * Guided-demo engine state. The tour walks through the demo script by logging in
 * as each persona, navigating to each feature, spotlighting it and explaining it
 * — auto-advancing (hybrid: the presenter can Pause / Next / Prev at any time).
 * It performs live actions: opening every "new / view" form, filling it with
 * sample data and submitting it, so each function is actually demonstrated. State
 * is persisted so a Pause survives a refresh and the persona swaps the tour
 * performs mid-run. See `TourLayer` for the runtime that drives it.
 */

export type PersonaKey = "manager" | "coach" | "parent" | "coparent" | "student";

export const PERSONAS: Record<PersonaKey, { email: string; password: string; label: string }> = {
  manager: { email: "clubadmin@demo.com", password: "demo", label: "Club Manager" },
  coach: { email: "coach@demo.com", password: "demo", label: "Swim Coach" },
  parent: { email: "parent@demo.com", password: "demo", label: "Parent" },
  coparent: { email: "coparent@demo.com", password: "demo", label: "Co-parent" },
  student: { email: "student@demo.com", password: "demo", label: "Swimmer" },
};

export interface RouteTarget {
  to: string;
  params?: Record<string, string>;
}

/** A live action performed on arrival at a step (hybrid demo actually drives UI). */
export type TourAction =
  | { kind: "click"; target: string }
  | { kind: "type"; target: string; text: string }
  | { kind: "select"; target: string; value: string }
  | { kind: "selectIndex"; target: string; index: number }
  | { kind: "escape" }
  | { kind: "wait"; ms: number }
  | { kind: "sequence"; steps: TourAction[] };

export interface TourStep {
  id: string;
  act: string;
  persona: PersonaKey;
  route?: RouteTarget;
  /** data-tour key, or a raw CSS selector if it starts with [ . or #. */
  target?: string;
  title: string;
  body: string;
  action?: TourAction;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Override the auto-advance dwell (ms) for this step. */
  autoMs?: number;
}

const CLUB = { to: "/app/courses/$courseId", params: { courseId: SWIM_COURSE_ID } };
const SESSION = { to: "/app/sessions/$sessionId", params: { sessionId: "PS-01" } };
const STUDENTS = { to: "/app/students" };
const DIALOG = '[role="dialog"]';
/** Generic FormDialog submit button. */
const SUBMIT = '[role="dialog"] button[type="submit"]';

// convenience builders
const click = (target: string): TourAction => ({ kind: "click", target });
const type = (target: string, text: string): TourAction => ({ kind: "type", target, text });
const pick = (target: string, index: number): TourAction => ({
  kind: "selectIndex",
  target,
  index,
});
const seq = (...steps: TourAction[]): TourAction => ({ kind: "sequence", steps });
const w = (ms: number): TourAction => ({ kind: "wait", ms });

/* ────────────────────────────────────────────────────────────────────────────
 * The script. Each entry is one beat of the live demo. Steps with a `target`
 * spotlight an element (via [data-tour="…"]); steps with an `action` also drive
 * the UI. Missing targets fall back to a centred card so the run never breaks.
 * ──────────────────────────────────────────────────────────────────────────── */
export const TOUR_STEPS: TourStep[] = [
  // ═══ Welcome ═══
  {
    id: "intro",
    act: "Welcome",
    persona: "manager",
    route: { to: "/app" },
    title: "Welcome to 1StudentID",
    body: "A guided tour of the whole platform for Royal Vista Aquatics — it drives itself, opening and submitting real forms as it goes. Pause, or Next / Prev, to take over anytime.",
    placement: "center",
    autoMs: 9000,
  },

  // ═══ Act 1 · Club Manager ═══
  {
    id: "mgr-dashboard",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app" },
    target: '[data-tour="dashboard"]',
    title: "The Club Manager's cockpit",
    body: "Jessica runs the whole club from here — today's sessions, coaches on deck, swimmers present and anything needing attention.",
    placement: "center",
  },
  {
    id: "mgr-capacity",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app" },
    target: "capacity-planning",
    title: "Capacity planning",
    body: "Every session's seat fill and coach staffing at a glance. Under-filled classes lose the club money — the suggestion line says exactly which fuller same-level session to consolidate them into.",
    autoMs: 10000,
  },
  {
    id: "mgr-register-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: STUDENTS,
    target: DIALOG,
    title: "Register a new swimmer",
    body: "Registering a swimmer also onboards them onto 1StudentID. Let's fill the real form live.",
    action: click("register-swimmer"),
    placement: "center",
    autoMs: 6000,
  },
  {
    id: "mgr-register-fill",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: STUDENTS,
    target: DIALOG,
    title: "Age-based login & sign-in method",
    body: "As we enter the date of birth the login adapts — this swimmer is 18+, so she manages her own login and signs in with Google, Apple, Microsoft Entra ID or a 1StudentID login.",
    placement: "left",
    action: seq(
      type("reg-name", "Sophie Turner"),
      type("reg-dob", "2005-05-14"),
      w(500),
      pick("reg-session", 1),
      type("reg-email", "nethmi.perera@gmail.com"),
    ),
    autoMs: 10000,
  },
  {
    id: "mgr-register-submit",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: STUDENTS,
    target: "swimmers-table",
    title: "Submitted — swimmer created",
    body: "On submit she's created, placed into her session and sent a 1StudentID login invite. There she is, top of the roster.",
    action: click(SUBMIT),
    autoMs: 8000,
  },
  {
    id: "mgr-programme-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: STUDENTS,
    target: DIALOG,
    title: "Manage a swimmer's programme",
    body: "The sliders icon opens a swimmer's programme — add or remove them from sessions to move them between Learn-to-Swim, Stroke Development, Squad or Diving.",
    action: click("programme-btn"),
    placement: "left",
    autoMs: 8000,
  },
  {
    id: "mgr-offboard-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: STUDENTS,
    target: DIALOG,
    title: "Off-board a leaver (GDPR-safe)",
    body: "When a swimmer leaves we don't delete them — we off-board them. History is kept, but recurring billing and automated messaging stop from the effective date.",
    action: seq({ kind: "escape" }, w(400), click("offboard-btn")),
    placement: "left",
    autoMs: 9000,
  },
  {
    id: "mgr-offboard-submit",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: STUDENTS,
    target: "swimmers-table",
    title: "Off-boarded — billing stopped",
    body: "The swimmer is marked Off-boarded; their Direct Debit / card mandate is cancelled and reminders stop. One click reactivates them if they return.",
    action: click("offboard-submit"),
    autoMs: 8000,
  },
  {
    id: "mgr-enrol-existing",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: STUDENTS,
    target: DIALOG,
    title: "Enrol an existing swimmer",
    body: "If a swimmer already exists at another institute, we never re-key them — a consent request goes to the student or guardian, and age & details stay hidden until they approve.",
    action: click("enrol-existing"),
    placement: "left",
    autoMs: 9000,
  },
  {
    id: "mgr-awards",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/awards" },
    target: "awards-catalog",
    title: "Courses & Awards — the club's curriculum",
    body: "A Swim England-style pathway: Duckling 1–4 into Learn to Swim. Each award is a checklist of activities; coaches tick them off in the session and the certificate issues itself.",
    autoMs: 9000,
  },
  {
    id: "mgr-award-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/awards" },
    target: DIALOG,
    title: "The admin adds a course",
    body: "A new award-course — name it and type the activities, one per line. Each line becomes a tick-box the coach marks off poolside.",
    action: seq(
      click("new-course-btn"),
      w(500),
      type("course-name", "Learn to Swim Stage 3"),
      type(
        "course-acts",
        "Jump in and fully submerge\nPush and glide, front and back\nSwim 25 metres front crawl\nTread water for 30 seconds",
      ),
    ),
    placement: "left",
    autoMs: 10000,
  },
  {
    id: "mgr-award-submit",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/awards" },
    target: "awards-catalog",
    title: "Course added to the pathway",
    body: "Stage 3 joins the catalog instantly — coaches can start assigning swimmers to it from their next session.",
    action: click(SUBMIT),
    autoMs: 7000,
  },
  {
    id: "mgr-coaching",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/coaching" },
    target: "coaching-team",
    title: "Coaches & cover",
    body: "The coaching team. Off-board a coach who leaves and they can no longer be rostered — same GDPR-safe leaver flow as swimmers.",
  },
  {
    id: "mgr-manage-coach",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/coaching" },
    target: DIALOG,
    title: "Cover an absent coach",
    body: "Mark a coach absent with a reason and swap in a substitute — the change flows straight into the timetable and the coach-attendance report.",
    action: click("manage-coach-btn"),
    placement: "left",
    autoMs: 9000,
  },
  {
    id: "mgr-temp-cover",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/coaching" },
    target: DIALOG,
    title: "Temporary cover — auto-reverts in 12h",
    body: "Coach stuck for one evening? Drop a cover coach in for 12 hours — it reverts automatically, so one-off changes never leave the timetable out of date. Same idea as the swimmer temp move.",
    action: seq(w(300), click("cover-12h-btn")),
    placement: "left",
    autoMs: 9500,
  },
  {
    id: "mgr-finance",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/finance" },
    target: "finance-mandates",
    title: "Fees, mandates & collections",
    body: "The manager runs collections, not payments. Each family's method — Direct Debit, Card or Cash — with mandate status; failed and off-boarded mandates surface here.",
  },
  {
    id: "mgr-invoice-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/finance" },
    target: DIALOG,
    title: "Raise an invoice",
    body: "Let's issue a fee. We fill the description and amount…",
    action: seq(
      click("new-invoice-btn"),
      w(500),
      type("inv-desc", "August squad fees"),
      type("inv-amount", "180"),
    ),
    placement: "left",
    autoMs: 8500,
  },
  {
    id: "mgr-invoice-submit",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/finance" },
    target: "finance-invoices",
    title: "Invoice created",
    body: "Submitted — the new invoice appears in the ledger, ready to collect.",
    action: click(SUBMIT),
    autoMs: 7500,
  },
  {
    id: "mgr-payment-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/finance" },
    target: DIALOG,
    title: "Record a payment",
    body: "Collecting a due fee — pick the method the family paid with (Direct Debit, Card or Cash).",
    action: click("record-payment-btn"),
    placement: "left",
    autoMs: 7500,
  },
  {
    id: "mgr-payment-submit",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/finance" },
    target: "finance-invoices",
    title: "Payment recorded",
    body: "The invoice flips to Paid and the collection rate updates. No 'Pay Now' — admins collect, families pay.",
    action: click(SUBMIT),
    autoMs: 7000,
  },
  {
    id: "mgr-marketing",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/marketing" },
    target: "lead-pipeline",
    title: "Marketing & CRM",
    body: "Enquiries from Facebook, Instagram and walk-ins — each with a phone and email to follow up.",
  },
  {
    id: "mgr-lead-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/marketing" },
    target: DIALOG,
    title: "Add a lead",
    body: "A new enquiry — we capture the name and contact details so it can actually be followed up.",
    action: seq(
      click("new-lead-btn"),
      w(500),
      type("lead-name", "Eleanor Newman"),
      type("lead-phone", "+44 7700 900 111"),
      type("lead-email", "ishara.m@gmail.com"),
    ),
    placement: "left",
    autoMs: 9000,
  },
  {
    id: "mgr-lead-submit",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/marketing" },
    target: "lead-pipeline",
    title: "Lead added",
    body: "It's in the pipeline. Now let's log an outreach against an existing lead.",
    action: click(SUBMIT),
    autoMs: 6500,
  },
  {
    id: "mgr-contact-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/marketing" },
    target: DIALOG,
    title: "Log an outreach",
    body: "Record a call, WhatsApp or email — phone and email are click-to-dial right here.",
    action: seq(
      click("lead-contact-btn"),
      w(500),
      type("lead-note", "Called mum — booked a Saturday tryout."),
    ),
    placement: "left",
    autoMs: 8500,
  },
  {
    id: "mgr-contact-submit",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/marketing" },
    target: "lead-pipeline",
    title: "Outreach logged",
    body: "The touchpoint is recorded and the lead advances New → Contacted, so whoever picks it up next sees the history.",
    action: click(SUBMIT),
    autoMs: 7000,
  },
  {
    id: "mgr-cpd-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/training" },
    target: DIALOG,
    title: "Assign coach CPD",
    body: "The manager recommends professional development — safeguarding, lifeguarding, squad coaching — to a named coach.",
    action: seq(click("assign-cpd-btn"), w(500), pick("cpd-coach", 0), pick("cpd-course", 0)),
    placement: "left",
    autoMs: 8500,
  },
  {
    id: "mgr-cpd-submit",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/training" },
    target: "assign-cpd",
    title: "CPD assigned & tracked",
    body: "It lands on the coach's development plan and the manager tracks completion from this board.",
    action: click(SUBMIT),
    autoMs: 7500,
  },
  {
    id: "mgr-grade",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/appraisals/$teacherId", params: { teacherId: "TCH-09" } },
    target: "club-grade",
    title: "Club grade — management's own appraisal",
    body: "Parents rate what they see; the club grades what it knows. Coach Ava holds Gold — a medal level (Bronze → Platinum) with a private management note, visible only to her and the club unless the admin makes it public.",
    action: seq(
      w(400),
      pick("grade-level", 2),
      type(
        "grade-comment",
        "Strong squad results again — keep the record-book notes flowing for Platinum.",
      ),
    ),
    placement: "left",
    autoMs: 11000,
  },
  {
    id: "mgr-grade-save",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/appraisals/$teacherId", params: { teacherId: "TCH-09" } },
    target: "club-grade",
    title: "Grade saved — coach-eyes only",
    body: "Ava will see this on her own appraisal page. Anonymous parent reviews work the other way: the coach sees the stars but not the name — only the manager keeps full visibility.",
    action: click("grade-save"),
    autoMs: 9000,
  },
  {
    id: "mgr-reports",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/swim-reports" },
    target: "report-periods",
    title: "Summary reports — any period",
    body: "Daily, weekly, monthly, yearly. Let's open the Monthly view — it carries an HR-grade evaluation.",
    action: click("report-month"),
    autoMs: 7500,
  },
  {
    id: "mgr-monthly",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/swim-reports" },
    target: "monthly-eval",
    title: "Monthly evaluation (HR)",
    body: "Every coach's sessions, reliability, notes, ratings and safeguarding contribution, plus every swimmer's attendance — with under-75% flagged for follow-up.",
    autoMs: 10000,
  },
  {
    id: "mgr-group-open",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/messages" },
    target: DIALOG,
    title: "Session group chats",
    body: "Messaging is WhatsApp-style — search anyone, add emojis, share photos and documents. As manager, Jessica can also spin up a broadcast group for a whole session.",
    action: click("new-group-btn"),
    autoMs: 7500,
  },
  {
    id: "mgr-group-pick",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/messages" },
    target: DIALOG,
    title: "Pick a session — members added for you",
    body: "Choose a session and its coaches plus every enrolled swimmer's family are added instantly. No manual roster building — the whole group is reachable at once.",
    action: click('[data-tour="group-session-list"] button:nth-of-type(2)'),
    autoMs: 9500,
  },
  {
    id: "mgr-group-create",
    act: "Act 1 · Club Manager",
    persona: "manager",
    route: { to: "/app/messages" },
    target: "messages-thread",
    title: "Group ready — one place for everyone",
    body: "Coaches and families now coordinate gala times, kit lists and closures together, instead of across a dozen one-to-one threads.",
    action: click("group-create"),
    autoMs: 8000,
  },

  // ═══ Act 2 · Swim Coach ═══
  {
    id: "coach-intro",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: CLUB,
    target: "club-hero",
    title: "Now — the coach's view",
    body: "Signed in as Coach Ava. Least-privilege: she only sees her own sessions and swimmers, nothing else in the club.",
    placement: "center",
  },
  {
    id: "coach-timetable",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: CLUB,
    target: "club-timetable",
    title: "Her weekly timetable",
    body: "Only Ava's sessions. Let's open one and run it poolside.",
  },
  {
    id: "coach-attend",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: "attend-all-present",
    title: "Take the register",
    body: "Attendance on a phone or tablet — mark everyone present in one tap, or set each swimmer individually.",
    action: click("attend-all-present"),
    autoMs: 6500,
  },
  {
    id: "coach-attend-save",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: "attend-save",
    title: "Save attendance",
    body: "Saved — it flows into the swimmer's record and every attendance report.",
    action: click("attend-save"),
    autoMs: 6500,
  },
  {
    id: "coach-award-open",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: "award-tracker",
    title: "Courses & awards, poolside",
    body: "Every swimmer with the award they're working on. Oliver is 3 activities away from Learn to Swim Stage 2 — let's open his checklist.",
    action: click("award-activities-btn"),
    autoMs: 8000,
  },
  {
    id: "coach-award-tick",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: '[data-tour="award-act-3"]',
    title: "Tick activities as he demonstrates them",
    body: "Tick… tick… and on the final activity the award completes: the certificate issues automatically and Oliver's parents are notified in Messages, before pick-up.",
    action: seq(click("award-act-3"), w(700), click("award-act-4"), w(700), click("award-act-5")),
    placement: "right",
    autoMs: 11000,
  },
  {
    id: "coach-certificate",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: { to: "/app/certificate/$progressId", params: { progressId: "AP-2002" } },
    target: "certificate",
    title: "The certificate — print-ready",
    body: "A Swim England-style certificate, generated the moment the last activity was ticked — with the completed criteria on the back. Print it or save as PDF for presentation night.",
    placement: "right",
    autoMs: 10000,
  },
  {
    id: "coach-incident-open",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: DIALOG,
    title: "Log a safety incident",
    body: "Safeguarding is first-class — a poolside incident with severity and the action taken.",
    action: seq(
      click("incident-btn"),
      w(500),
      type("incident-title", "Swallowed water — coughing fit"),
      type(
        "incident-body",
        "Stopped the set, moved swimmer to poolside, monitored breathing, informed parent at pickup.",
      ),
    ),
    placement: "left",
    autoMs: 9500,
  },
  {
    id: "coach-incident-submit",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: "incident-btn",
    title: "Incident logged",
    body: "It's recorded against the session and surfaces in the club's incident report for follow-up.",
    action: click("incident-submit"),
    autoMs: 6500,
  },
  {
    id: "coach-move-open",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: DIALOG,
    title: "Move a swimmer",
    body: "Trial a swimmer in a faster lane — a temporary move auto-reverts after 12 hours; a permanent one updates their home session.",
    action: seq(click("move-btn"), w(500), pick("move-swimmer", 1), pick("move-target", 1)),
    placement: "left",
    autoMs: 9000,
  },
  {
    id: "coach-move-submit",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: "move-btn",
    title: "Swimmer moved",
    body: "The roster updates instantly on both sessions — non-destructively, so nothing is lost.",
    action: click("move-submit"),
    autoMs: 6500,
  },
  {
    id: "coach-wellbeing-open",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: DIALOG,
    title: "Wellbeing check-in",
    body: "A quick pastoral note — Green / Amber / Red. Amber and red flags surface in the club report for follow-up.",
    action: seq(
      click("wellbeing-btn"),
      w(500),
      pick("wb-swimmer", 1),
      type(
        "wb-note",
        "A bit tired after school — kept the set light and will check in with parents.",
      ),
    ),
    placement: "left",
    autoMs: 9000,
  },
  {
    id: "coach-wellbeing-submit",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: "wellbeing-btn",
    title: "Wellbeing logged",
    body: "Recorded for pastoral follow-up — safeguarding and welfare in the same flow as coaching.",
    action: click("wellbeing-submit"),
    autoMs: 6500,
  },
  {
    id: "coach-note",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: SESSION,
    target: DIALOG,
    title: "Record-book note & rating",
    body: "Post an achievement, a technique note or a performance rating straight to the swimmer's family record book.",
    action: click("note-btn"),
    placement: "left",
    autoMs: 8000,
  },
  {
    id: "coach-squad-open",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: { to: "/app/squad" },
    target: DIALOG,
    title: "Log a competitive time",
    body: "Record a 50m/100m time — a new personal best is flagged automatically across events.",
    action: seq(
      click("log-time-btn"),
      w(500),
      pick("time-swimmer", 1),
      type("time-value", "29.84"),
    ),
    placement: "left",
    autoMs: 8500,
  },
  {
    id: "coach-squad-submit",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: { to: "/app/squad" },
    target: "squad-board",
    title: "Time logged — PBs update",
    body: "The personal-best board and squad stats update live — perfect for selection and gala entries.",
    action: click(SUBMIT),
    autoMs: 7500,
  },
  {
    id: "coach-cpd",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: { to: "/app/training" },
    target: "cpd-recommended",
    title: "Her CPD",
    body: "The coach's side of CPD — what the manager assigned her, and her progress toward each certificate.",
  },
  {
    id: "coach-reports",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: { to: "/app/swim-reports" },
    target: "report-periods",
    title: "Her own reports",
    body: "The same summary reports, automatically scoped to just her sessions and swimmers.",
  },
  {
    id: "coach-profile",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: { to: "/app/profile" },
    target: DIALOG,
    title: "Everyone manages their own profile",
    body: "Photo, name, phone, tagline — self-service for every account. The login email is locked; identity stays stable.",
    action: seq(click("edit-profile-btn"), w(500), type("profile-phone", "+44 7700 900333")),
    placement: "left",
    autoMs: 8500,
  },
  {
    id: "coach-profile-save",
    act: "Act 2 · Swim Coach",
    persona: "coach",
    route: { to: "/app/profile" },
    target: "edit-profile-btn",
    title: "Profile updated",
    body: "Saved — and because profiles are self-service, the office never has to chase contact details again.",
    action: click(SUBMIT),
    autoMs: 6500,
  },

  // ═══ Act 3 · Parent ═══
  {
    id: "parent-intro",
    act: "Act 3 · Parent",
    persona: "parent",
    route: { to: "/app" },
    target: '[data-tour="dashboard"]',
    title: "What the parent sees",
    body: "Signed in as Jack, dad of Oliver and Olivia. One login, only his own children — across every institute they attend.",
    placement: "center",
  },
  {
    id: "parent-awards",
    act: "Act 3 · Parent",
    persona: "parent",
    route: { to: "/app" },
    target: "awards-dash",
    title: "Awards & certificates, front and centre",
    body: "The Stage 2 certificate Coach Ava issued minutes ago is already on dad's dashboard — tap it to view and print. Olivia's Duckling 4 progress sits alongside.",
    autoMs: 9500,
  },
  {
    id: "parent-records",
    act: "Act 3 · Parent",
    persona: "parent",
    route: { to: "/app/srb/$studentId", params: { studentId: "S-1001" } },
    target: "srb-timeline",
    title: "The family record book",
    body: "Coach notes, achievements, level progress and wellbeing — a shared, two-way record between the club and home.",
  },
  {
    id: "parent-pay-open",
    act: "Act 3 · Parent",
    persona: "parent",
    route: { to: "/app/finance" },
    target: DIALOG,
    title: "Pay the fees",
    body: "The parent gets a pay-my-fees view — across every institute their children attend. Let's settle a due invoice.",
    action: click("record-payment-btn"),
    placement: "left",
    autoMs: 7500,
  },
  {
    id: "parent-pay-submit",
    act: "Act 3 · Parent",
    persona: "parent",
    route: { to: "/app/finance" },
    target: "finance-invoices",
    title: "Paid",
    body: "Settled instantly, with a receipt — and it reconciles on the club's collections view.",
    action: click(SUBMIT),
    autoMs: 7000,
  },
  {
    id: "parent-messages",
    act: "Act 3 · Parent",
    persona: "parent",
    route: { to: "/app/messages" },
    target: "messages-thread",
    title: "Message the coach",
    body: "Real, persisted two-way messaging — the automatic certificate notification is in the thread, and dad replies with an absence note.",
    action: seq(
      type(
        "msg-input",
        "Hi Coach — Oliver has a dentist appointment Saturday, he'll be 15 min late.",
      ),
      w(400),
      click("msg-send"),
    ),
    autoMs: 9000,
  },
  {
    id: "parent-rate-open",
    act: "Act 3 · Parent",
    persona: "parent",
    route: { to: "/app/appraisals/$teacherId", params: { teacherId: "TCH-09" } },
    target: "rate-form",
    title: "Rate the coach — anonymously if you like",
    body: "Five stars and a comment for Coach Ava — and dad ticks 'Submit anonymously'. The coach will see the feedback but not who wrote it; only the club manager keeps the name, so it can't be abused.",
    action: seq(
      w(400),
      click('[aria-label="5 stars"]'),
      type("rate-comment", "Oliver's water confidence has grown so much this term. Thank you!"),
      w(300),
      click("rate-anon"),
    ),
    placement: "left",
    autoMs: 11000,
  },
  {
    id: "parent-rate-submit",
    act: "Act 3 · Parent",
    persona: "parent",
    route: { to: "/app/appraisals/$teacherId", params: { teacherId: "TCH-09" } },
    target: "rate-submit",
    title: "Feedback in — identity protected",
    body: "The review lands as 'Anonymous parent' on the coach's side and feeds her blended appraisal score.",
    action: click("rate-submit"),
    autoMs: 7500,
  },

  // ═══ Act 4 · Co-parent ═══
  {
    id: "coparent-intro",
    act: "Act 4 · Co-parent",
    persona: "coparent",
    route: { to: "/app" },
    target: '[data-tour="dashboard"]',
    title: "The co-parent — same children, own login",
    body: "Now signed in as Amelia, Oliver and Olivia's mum. Separated parents both stay fully involved: her own login, the same two children, the same record books and certificates.",
    placement: "center",
    autoMs: 9500,
  },
  {
    id: "coparent-fees",
    act: "Act 4 · Co-parent",
    persona: "coparent",
    route: { to: "/app/finance" },
    target: "coparent-banner",
    title: "Shared family, separate payments",
    body: "The fees view says it plainly: shared with Jack, and each parent can pay for different classes independently. Dad covered the squad fees — mum takes a different class.",
    autoMs: 9500,
  },
  {
    id: "coparent-pay-open",
    act: "Act 4 · Co-parent",
    persona: "coparent",
    route: { to: "/app/finance" },
    target: DIALOG,
    title: "Amelia pays her share",
    body: "She settles a due fee for a different class — her card, her receipt.",
    action: click("record-payment-btn"),
    placement: "left",
    autoMs: 7500,
  },
  {
    id: "coparent-pay-submit",
    act: "Act 4 · Co-parent",
    persona: "coparent",
    route: { to: "/app/finance" },
    target: "finance-invoices",
    title: "Recorded — 'by Amelia'",
    body: "Every payment records who in the family settled it, so the club and both parents always agree on who paid what.",
    action: click(SUBMIT),
    autoMs: 8000,
  },

  // ═══ Wrap-up ═══
  {
    id: "wrap",
    act: "Wrap-up",
    persona: "manager",
    route: { to: "/app" },
    title: "One ID. Every journey.",
    body: "Registration, capacity planning, award certificates, coaching, competition, safeguarding, fees — with a login for every family member, even across households. That's 1StudentID. Thank you!",
    placement: "center",
    autoMs: 12000,
  },
];

/* ── store ─────────────────────────────────────────────────────────────────── */
interface TourState {
  active: boolean;
  playing: boolean;
  index: number;
}

const STORAGE_KEY = "oneedu.tour";
const DEFAULT: TourState = { active: false, playing: false, index: 0 };

function load(): TourState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<TourState>) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

let state: TourState = load();
const listeners = new Set<() => void>();

function set(patch: Partial<TourState>) {
  state = { ...state, ...patch };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

export const tourApi = {
  start() {
    // Every run begins from a clean, fully-seeded demo so screens are populated
    // and the live actions (registering, off-boarding, invoicing…) don't stack up.
    resetStore();
    set({ active: true, playing: true, index: 0 });
  },
  stop() {
    set({ active: false, playing: false, index: 0 });
  },
  play() {
    set({ playing: true });
  },
  pause() {
    set({ playing: false });
  },
  togglePlay() {
    set({ playing: !state.playing });
  },
  next() {
    if (state.index >= TOUR_STEPS.length - 1) {
      set({ active: false, playing: false, index: 0 });
    } else {
      set({ index: state.index + 1 });
    }
  },
  prev() {
    set({ index: Math.max(0, state.index - 1) });
  },
  goTo(i: number) {
    set({ index: Math.max(0, Math.min(TOUR_STEPS.length - 1, i)) });
  },
};

export function useTour(): TourState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
