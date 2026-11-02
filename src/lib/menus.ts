import { isSwimUser, isSwimAdmin, type DemoUser, type Role } from "./mockData";
import type { ModuleId } from "./modules";
import type { Experience, PackId } from "./packs/foundationData";

export interface MenuItem {
  label: string;
  to: string;
  icon: string; // lucide icon name
  group?: string;
  /** Module this item belongs to. Items with no moduleId (or "core") are always visible. */
  moduleId?: ModuleId;
}

const ALL: Record<string, MenuItem> = {
  dashboard: { label: "Dashboard", to: "/app", icon: "LayoutDashboard", moduleId: "core" },
  students: {
    label: "Students",
    to: "/app/students",
    icon: "Users",
    group: "Academics",
    moduleId: "students",
  },
  courses: {
    label: "Courses",
    to: "/app/courses",
    icon: "BookOpen",
    group: "Academics",
    moduleId: "courses",
  },
  attendance: {
    label: "Attendance",
    to: "/app/attendance",
    icon: "CalendarCheck",
    group: "Academics",
    moduleId: "attendance",
  },
  calendar: {
    label: "Calendar",
    to: "/app/calendar",
    icon: "Calendar",
    group: "Academics",
    moduleId: "calendar",
  },
  lms: {
    label: "Learning (LMS)",
    to: "/app/lms",
    icon: "GraduationCap",
    group: "Academics",
    moduleId: "lms",
  },
  assignments: {
    label: "Assignments",
    to: "/app/assignments",
    icon: "FileText",
    group: "Academics",
    moduleId: "assignments",
  },
  grades: {
    label: "Grades",
    to: "/app/grades",
    icon: "Award",
    group: "Academics",
    moduleId: "grades",
  },
  myClasses: {
    label: "My Classes",
    to: "/app/teacher-classes",
    icon: "School",
    group: "Teaching",
    moduleId: "teaching",
  },
  grading: {
    label: "Grading",
    to: "/app/grading",
    icon: "ClipboardCheck",
    group: "Teaching",
    moduleId: "grades",
  },
  training: {
    label: "Teacher Training",
    to: "/app/training",
    icon: "GraduationCap",
    group: "Professional Development",
    moduleId: "training",
  },
  appraisalTeacher: {
    label: "My Appraisal",
    to: "/app/appraisals",
    icon: "Star",
    group: "Professional Development",
    moduleId: "appraisal",
  },
  appraisalAdmin: {
    label: "Teacher Appraisals",
    to: "/app/appraisals",
    icon: "Star",
    group: "Academics",
    moduleId: "appraisal",
  },
  appraisalParent: {
    label: "Teacher Appraisals",
    to: "/app/appraisals",
    icon: "Star",
    group: "Family",
    moduleId: "appraisal",
  },
  appraisalStudent: {
    label: "Teacher Appraisals",
    to: "/app/appraisals",
    icon: "Star",
    group: "Academics",
    moduleId: "appraisal",
  },
  children: {
    label: "My Children",
    to: "/app/children",
    icon: "Baby",
    group: "Family",
    moduleId: "family",
  },
  srb: {
    label: "Record Book",
    to: "/app/srb",
    icon: "NotebookPen",
    group: "Family",
    moduleId: "srb",
  },
  srbTeacher: {
    label: "Record Books",
    to: "/app/srb",
    icon: "NotebookPen",
    group: "Teaching",
    moduleId: "srb",
  },
  srbStudent: {
    label: "My Record Book",
    to: "/app/srb",
    icon: "NotebookPen",
    group: "Academics",
    moduleId: "srb",
  },
  srbAdmin: {
    label: "Record Books",
    to: "/app/srb",
    icon: "NotebookPen",
    group: "Academics",
    moduleId: "srb",
  },
  fees: {
    label: "Fees & Invoices",
    to: "/app/finance",
    icon: "Wallet",
    group: "Finance",
    moduleId: "finance",
  },
  myCourses: {
    label: "Course Selection",
    to: "/app/my-courses",
    icon: "BookMarked",
    group: "Finance",
    moduleId: "finance",
  },
  finance: {
    label: "Financial Mgmt",
    to: "/app/finance",
    icon: "DollarSign",
    group: "Operations",
    moduleId: "finance",
  },
  pricing: {
    label: "Fees & Pricing",
    to: "/app/pricing",
    icon: "Tags",
    group: "Operations",
    moduleId: "finance",
  },
  billing: {
    label: "Billing & Invoicing",
    to: "/app/billing",
    icon: "ReceiptText",
    group: "Operations",
    moduleId: "finance",
  },
  marketing: {
    label: "Marketing & CRM",
    to: "/app/marketing",
    icon: "Megaphone",
    group: "Operations",
    moduleId: "marketing",
  },
  marketplace: {
    label: "Marketplace",
    to: "/app/marketplace",
    icon: "Store",
    group: "Discover",
    moduleId: "marketplace",
  },
  messages: {
    label: "Messages",
    to: "/app/messages",
    icon: "MessageSquare",
    group: "Communication",
    moduleId: "messages",
  },
  ai: {
    label: "AI Insights",
    to: "/app/ai-insights",
    icon: "Sparkles",
    group: "Intelligence",
    moduleId: "ai",
  },
  reports: {
    label: "Reports & BI",
    to: "/app/reports",
    icon: "BarChart3",
    group: "Intelligence",
    moduleId: "reports",
  },
  tenants: {
    label: "Tenants",
    to: "/app/tenants",
    icon: "Building2",
    group: "Platform",
    moduleId: "tenants",
  },
  users: {
    label: "Users & Roles",
    to: "/app/users",
    icon: "ShieldCheck",
    group: "Platform",
    moduleId: "users",
  },
  migration: {
    label: "Migration & Imports",
    to: "/app/migration",
    icon: "DatabaseZap",
    group: "Platform",
    moduleId: "migration",
  },
  compliance: {
    label: "Compliance & Audit",
    to: "/app/compliance",
    icon: "FileLock2",
    group: "Platform",
    moduleId: "compliance",
  },
  branding: {
    label: "Branding",
    to: "/app/branding",
    icon: "Palette",
    group: "Platform",
    moduleId: "branding",
  },
  settings: {
    label: "Settings",
    to: "/app/settings",
    icon: "Settings",
    group: "Platform",
    moduleId: "core",
  },
  profile: {
    label: "My Profile",
    to: "/app/profile",
    icon: "User",
    group: "Account",
    moduleId: "core",
  },
};

export const menusByRole: Record<Role, MenuItem[]> = {
  student: [
    ALL.dashboard,
    ALL.courses,
    ALL.attendance,
    ALL.calendar,
    ALL.lms,
    ALL.assignments,
    ALL.grades,
    ALL.srbStudent,
    ALL.appraisalStudent,
    ALL.myCourses,
    ALL.fees,
    ALL.messages,
    ALL.marketplace,
    ALL.profile,
  ],
  parent: [
    ALL.dashboard,
    ALL.children,
    ALL.courses,
    ALL.srb,
    ALL.attendance,
    ALL.calendar,
    ALL.grades,
    ALL.appraisalParent,
    ALL.myCourses,
    ALL.fees,
    ALL.messages,
    ALL.profile,
  ],
  teacher: [
    ALL.dashboard,
    ALL.myClasses,
    ALL.attendance,
    ALL.calendar,
    ALL.lms,
    ALL.grading,
    ALL.students,
    ALL.srbTeacher,
    ALL.training,
    ALL.appraisalTeacher,
    ALL.messages,
    ALL.ai,
    ALL.profile,
  ],
  admin: [
    ALL.dashboard,
    ALL.students,
    ALL.srbAdmin,
    ALL.appraisalAdmin,
    ALL.courses,
    ALL.attendance,
    ALL.calendar,
    ALL.lms,
    ALL.training,
    ALL.finance,
    ALL.pricing,
    ALL.billing,
    ALL.marketing,
    ALL.marketplace,
    ALL.ai,
    ALL.reports,
    ALL.tenants,
    ALL.users,
    ALL.migration,
    ALL.compliance,
    ALL.branding,
    ALL.settings,
    ALL.messages,
    ALL.profile,
  ],
};

export const roleLabel: Record<Role, string> = {
  student: "Student",
  parent: "Parent / Guardian",
  teacher: "Teacher",
  admin: "Administrator",
};

/* ────────────────────────────────────────────────────────────────────────────
 * Swim-club menus
 *
 * The swim coach and swim-club admin get a curated, single-purpose menu — the
 * whole app is their swim club, so the generic LMS destinations (LMS, generic
 * attendance/grades, marketing, AI, tenants…) are hidden entirely. Items use
 * moduleId "core" so they are always visible regardless of tenant entitlements.
 * See `menuForUser`. `SWIM_CLUB` links straight to the club course page. */
const swimClubItem: MenuItem = {
  label: "Swim Club",
  to: "/app/courses/C-SWIM",
  icon: "Waves",
  group: "Club",
  moduleId: "core",
};

export const swimCoachMenu: MenuItem[] = [
  { label: "Dashboard", to: "/app", icon: "LayoutDashboard", group: "Club", moduleId: "core" },
  swimClubItem,
  {
    label: "Courses & Awards",
    to: "/app/awards",
    icon: "Award",
    group: "Coaching",
    moduleId: "core",
  },
  {
    label: "Record Books",
    to: "/app/srb",
    icon: "NotebookPen",
    group: "Coaching",
    moduleId: "core",
  },
  {
    label: "Competitive Squad",
    to: "/app/squad",
    icon: "Trophy",
    group: "Coaching",
    moduleId: "core",
  },
  {
    label: "Summary Reports",
    to: "/app/swim-reports",
    icon: "BarChart3",
    group: "Coaching",
    moduleId: "core",
  },
  {
    label: "Coach Education",
    to: "/app/training",
    icon: "GraduationCap",
    group: "Professional Development",
    moduleId: "core",
  },
  {
    label: "My Appraisal",
    to: "/app/appraisals",
    icon: "Star",
    group: "Professional Development",
    moduleId: "core",
  },
  {
    label: "Messages",
    to: "/app/messages",
    icon: "MessageSquare",
    group: "Communication",
    moduleId: "core",
  },
  { label: "My Profile", to: "/app/profile", icon: "User", group: "Account", moduleId: "core" },
];

export const swimAdminMenu: MenuItem[] = [
  { label: "Dashboard", to: "/app", icon: "LayoutDashboard", group: "Club", moduleId: "core" },
  swimClubItem,
  {
    label: "Coaches & Sessions",
    to: "/app/coaching",
    icon: "CalendarCog",
    group: "Club",
    moduleId: "core",
  },
  {
    label: "Swimmers",
    to: "/app/students",
    icon: "Users",
    group: "Club",
    moduleId: "core",
  },
  {
    label: "Courses & Awards",
    to: "/app/awards",
    icon: "Award",
    group: "Club",
    moduleId: "core",
  },
  {
    label: "Competitive Squad",
    to: "/app/squad",
    icon: "Trophy",
    group: "Club",
    moduleId: "core",
  },
  {
    label: "Record Books",
    to: "/app/srb",
    icon: "NotebookPen",
    group: "Club",
    moduleId: "core",
  },
  {
    label: "Summary Reports",
    to: "/app/swim-reports",
    icon: "BarChart3",
    group: "Club",
    moduleId: "core",
  },
  {
    label: "Learning (LMS)",
    to: "/app/lms",
    icon: "GraduationCap",
    group: "Academics",
    moduleId: "core",
  },
  {
    label: "Coach Training",
    to: "/app/training",
    icon: "GraduationCap",
    group: "Academics",
    moduleId: "core",
  },
  {
    label: "Coach Appraisals",
    to: "/app/appraisals",
    icon: "Star",
    group: "Management",
    moduleId: "core",
  },
  {
    label: "Fees & Finance",
    to: "/app/finance",
    icon: "Wallet",
    group: "Management",
    moduleId: "core",
  },
  {
    label: "Fees & Pricing",
    to: "/app/pricing",
    icon: "Tags",
    group: "Management",
    moduleId: "core",
  },
  {
    label: "Billing & Invoicing",
    to: "/app/billing",
    icon: "ReceiptText",
    group: "Management",
    moduleId: "core",
  },
  {
    label: "Marketing & CRM",
    to: "/app/marketing",
    icon: "Megaphone",
    group: "Management",
    moduleId: "core",
  },
  {
    label: "Users & Roles",
    to: "/app/users",
    icon: "ShieldCheck",
    group: "Platform",
    moduleId: "core",
  },
  {
    label: "Migration & Imports",
    to: "/app/migration",
    icon: "DatabaseZap",
    group: "Platform",
    moduleId: "core",
  },
  {
    label: "Compliance & Audit",
    to: "/app/compliance",
    icon: "FileLock2",
    group: "Platform",
    moduleId: "core",
  },
  {
    label: "Branding",
    to: "/app/branding",
    icon: "Palette",
    group: "Platform",
    moduleId: "branding",
  },
  {
    label: "Settings",
    to: "/app/settings",
    icon: "Settings",
    group: "Platform",
    moduleId: "core",
  },
  {
    label: "Messages",
    to: "/app/messages",
    icon: "MessageSquare",
    group: "Communication",
    moduleId: "core",
  },
  { label: "My Profile", to: "/app/profile", icon: "User", group: "Account", moduleId: "core" },
];

/* The distinct, toggleable sidebar destinations across every menu — used by the
 * global admin's "Demo presentation" nav toggles. Essentials (dashboard, profile,
 * settings, users) are always shown, so they're excluded here. Deduped by route. */
const NAV_ALWAYS_ON = new Set(["/app", "/app/profile", "/app/settings", "/app/users"]);

export const NAV_CATALOG: MenuItem[] = (() => {
  const seen = new Set<string>();
  const out: MenuItem[] = [];
  const add = (items: MenuItem[]) => {
    for (const it of items) {
      if (NAV_ALWAYS_ON.has(it.to) || seen.has(it.to)) continue;
      seen.add(it.to);
      out.push(it);
    }
  };
  for (const m of Object.values(menusByRole)) add(m);
  add(swimCoachMenu);
  add(swimAdminMenu);
  return out;
})();

/* ────────────────────────────────────────────────────────────────────────────
 * Institution packs — menu composition
 *
 * menu = core(role) + shared modules(role) + every enabled pack's items(role)
 *        + foundation(role)
 * …then AppShell filters by module entitlements. Packs ADD to the core
 * platform — every tenant keeps the core modules (Record Book, Grades,
 * Calendar, LMS, Appraisals…). "segment" tenants (school / university /
 * college) swap a few core destinations for their richer pack-era equivalent
 * (SEGMENT_SWAPS) so nothing appears twice. Pack items use moduleId "core"
 * because the PACK is their entitlement (gated by ModuleGate via packForPath). */
const item = (
  label: string,
  to: string,
  icon: string,
  group: string,
  moduleId: ModuleId = "core",
): MenuItem => ({ label, to, icon, group, moduleId });

const SEG = {
  dashboard: item("Dashboard", "/app", "LayoutDashboard", "Home"),
  learners: item("Student Records", "/app/learners", "Contact", "Academics", "students"),
  myRecord: item("My Record", "/app/learners", "Contact", "Academics", "students"),
  children: item("My Children", "/app/learners", "Baby", "Family", "students"),
  registers: item("Attendance", "/app/registers", "CalendarCheck", "Academics", "attendance"),
  messages: item("Messages", "/app/messages", "MessageSquare", "Communication", "messages"),
  profile: item("My Profile", "/app/profile", "User", "Account"),
  settings: item("Settings", "/app/settings", "Settings", "Platform"),
};

/** Core destinations a segment tenant reaches through the pack-era equivalent
 *  (same module, richer model). null = covered by a shared-module item:
 *  per-learner fee accounts replace the classic fee views for families, and
 *  admissions / module registration replace classic course selection. */
const SEGMENT_SWAPS: Record<Role, Record<string, MenuItem | null>> = {
  admin: {
    "/app/students": SEG.learners,
    "/app/attendance": SEG.registers,
    // Fees & Sponsors (per-learner accounts, payers, reconciliation, cash
    // flow) and the Admissions CRM replace the classic tuition-centre billing
    // and lead pipeline for school / university / college tenants.
    "/app/finance": null,
    "/app/pricing": null,
    "/app/billing": null,
    "/app/marketing": null,
  },
  teacher: { "/app/students": SEG.learners, "/app/attendance": SEG.registers },
  parent: {
    "/app/children": SEG.children,
    "/app/attendance": SEG.registers,
    "/app/finance": null,
    "/app/my-courses": null,
  },
  student: {
    "/app/attendance": SEG.registers,
    "/app/finance": null,
    "/app/my-courses": null,
  },
};

/** The core role menu with segment swaps applied. */
function segmentCore(role: Role, core: MenuItem[]): MenuItem[] {
  const swaps = SEGMENT_SWAPS[role];
  const out = core.flatMap((m) => {
    if (!(m.to in swaps)) return [m];
    const next = swaps[m.to];
    return next ? [next] : [];
  });
  // Students see their own SIS record right after the dashboard.
  if (role === "student") out.splice(1, 0, SEG.myRecord);
  return out;
}

/** Foundations — every institute admin configures region, calendars, codes, ids. */
const foundationItems: MenuItem[] = [
  item("Institution Profile", "/app/institution", "Building", "Platform"),
];

/** Shared modules introduced with the packs (each gated by its own module). */
const sharedModuleItems: Record<Role, MenuItem[]> = {
  admin: [
    item("Admissions", "/app/admissions", "DoorOpen", "Admissions", "admissions"),
    item("Timetable & Rooms", "/app/timetable", "CalendarRange", "Academics", "timetable"),
    item("Fees & Sponsors", "/app/fee-accounts", "Wallet", "Finance", "finance"),
    item("Staff Vetting", "/app/vetting", "ShieldCheck", "Compliance", "vetting"),
    item("Regulator Returns", "/app/returns", "FileSpreadsheet", "Compliance", "returns"),
    item("Integrations", "/app/integrations", "Plug", "Platform", "integrations"),
    item("Group & Campuses", "/app/group", "Network", "Platform", "groups"),
    item("Requests & Approvals", "/app/requests", "Inbox", "Academics", "requests"),
    item("IT Administration", "/app/it", "MonitorCog", "Platform", "itadmin"),
  ],
  teacher: [
    item("My Timetable", "/app/timetable", "CalendarRange", "Academics", "timetable"),
    item("Approvals", "/app/requests", "Inbox", "Academics", "requests"),
    item("IT Help", "/app/it", "LifeBuoy", "Account", "itadmin"),
  ],
  parent: [
    item("Timetable", "/app/timetable", "CalendarRange", "Family", "timetable"),
    item("Fees & Payments", "/app/fee-accounts", "Wallet", "Family", "finance"),
    item("Requests", "/app/requests", "Inbox", "Family", "requests"),
    item("IT Help", "/app/it", "LifeBuoy", "Account", "itadmin"),
  ],
  student: [
    item("My Timetable", "/app/timetable", "CalendarRange", "Academics", "timetable"),
    item("Fees & Funding", "/app/fee-accounts", "Wallet", "Finance", "finance"),
    item("My Requests", "/app/requests", "Inbox", "Academics", "requests"),
    item("IT Help", "/app/it", "LifeBuoy", "Account", "itadmin"),
  ],
};

/** Pack-specific items by role. The swim pack keeps its curated menus. */
export const PACK_MENUS: Record<PackId, Partial<Record<Role, MenuItem[]>>> = {
  swim: {
    admin: [item("Swim Club", "/app/courses/C-SWIM", "Waves", "Swim Club")],
  },
  "intl-school": {
    admin: [
      item("Classes & Enrolment", "/app/school/classes", "Users", "School"),
      item("Curricula & Houses", "/app/school/curricula", "Layers", "School"),
      item("Exam Entries", "/app/school/exams", "ClipboardList", "School"),
      item("Parent Meetings", "/app/school/meetings", "Handshake", "School"),
      item("School Life", "/app/school/life", "Bus", "School"),
    ],
    teacher: [
      item("My Forms & Sets", "/app/school/classes", "Users", "School"),
      item("Exam Entries & Predictions", "/app/school/exams", "ClipboardList", "School"),
      item("Parent Meetings", "/app/school/meetings", "Handshake", "School"),
      item("Houses & School Life", "/app/school/life", "Bus", "School"),
    ],
    parent: [
      item("Parent Meetings", "/app/school/meetings", "Handshake", "School"),
      item("Trips & Activities", "/app/school/life", "Bus", "School"),
      item("Exam Entries", "/app/school/exams", "ClipboardList", "School"),
    ],
  },
  "higher-ed": {
    admin: [
      item("Programmes & Modules", "/app/he/programmes", "Library", "Higher Education"),
      item("Module Registration", "/app/he/registration", "ListChecks", "Higher Education"),
      item("Assessment & Boards", "/app/he/assessment", "Scale", "Higher Education"),
      item("Transcripts & Awards", "/app/he/transcripts", "ScrollText", "Higher Education"),
      item("Exam Timetable", "/app/he/exams", "CalendarClock", "Higher Education"),
      item("Alumni", "/app/alumni", "GraduationCap", "Higher Education"),
    ],
    teacher: [
      item("My Modules & Marking", "/app/he/assessment", "Scale", "Higher Education"),
      item("Programmes & Modules", "/app/he/programmes", "Library", "Higher Education"),
      item("Exams & Invigilation", "/app/he/exams", "CalendarClock", "Higher Education"),
    ],
    student: [
      item("My Modules", "/app/he/registration", "ListChecks", "Higher Education"),
      item("Results & Transcript", "/app/he/transcripts", "ScrollText", "Higher Education"),
      item("Extenuating Circumstances", "/app/he/assessment", "LifeBuoy", "Higher Education"),
      item("My Exams", "/app/he/exams", "CalendarClock", "Higher Education"),
      item("Alumni", "/app/alumni", "GraduationCap", "Higher Education"),
    ],
  },
  college: {
    admin: [
      item("Qualifications & Units", "/app/college/qualifications", "Award", "College"),
      item("Apprenticeships & Placements", "/app/college/work-based", "HardHat", "College"),
    ],
    teacher: [item("Units & Assessment", "/app/college/qualifications", "Award", "College")],
    student: [item("My Qualification", "/app/college/qualifications", "Award", "College")],
  },
};

export interface MenuContext {
  experience: Experience;
  packs: Set<PackId>;
  /** Pupil account used by the family (primary years) — adds family items. */
  familyOperated?: boolean;
  /** Graduated student — keeps an alumni menu (record, transcript, alumni). */
  graduated?: boolean;
}

function dedupe(items: MenuItem[]): MenuItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.to)) return false;
    seen.add(i.to);
    return true;
  });
}

const PACK_ORDER: PackId[] = ["intl-school", "higher-ed", "college", "swim"];

/** Sidebar menu for a user — composed from experience, packs and modules. */
export function menuForUser(user: DemoUser | null, ctx?: MenuContext): MenuItem[] {
  // A swim-club account's product IS the Swim Pack — with the pack off, only
  // the account pages remain (ModuleGate shows the "pack not enabled" screen).
  if (isSwimUser(user) && ctx && !ctx.packs.has("swim")) {
    return isSwimAdmin(user) ? [SEG.settings, SEG.profile] : [SEG.profile];
  }
  if (isSwimAdmin(user)) return swimAdminMenu;
  if (isSwimUser(user)) return swimCoachMenu;
  const role = user?.role ?? "student";
  const packs = ctx?.packs ?? new Set<PackId>();
  const packItems = PACK_ORDER.filter((p) => packs.has(p)).flatMap(
    (p) => PACK_MENUS[p][role] ?? [],
  );
  const instituteAdmin = role === "admin" && user?.adminScope === "institute";
  const shared = sharedModuleItems[role];
  const foundation = instituteAdmin ? foundationItems : [];

  let menu = menusByRole[role];
  // Appraising teachers is an adult responsibility — hide it from minor students
  // (only 18+ self-managed students may rate; for a minor the parent does it).
  if (role === "student" && !user?.selfManaged) {
    menu = menu.filter((m) => m.to !== "/app/appraisals");
  }

  if (ctx?.experience === "segment" && role === "student" && ctx.graduated) {
    // Graduates keep their 1StudentID: record, transcript, fees and the alumni
    // network — not the teaching pages of a course they've finished.
    const keep = new Set([
      "/app",
      "/app/learners",
      "/app/srb",
      "/app/he/transcripts",
      "/app/alumni",
      "/app/fee-accounts",
      "/app/requests",
      "/app/messages",
      "/app/it",
      "/app/profile",
    ]);
    return dedupe([...segmentCore(role, menu), ...shared, ...packItems]).filter((m) =>
      keep.has(m.to),
    );
  }

  if (ctx?.experience === "segment") {
    // A family-operated pupil account is used by the parent: it keeps the
    // pupil's own pages and adds the family pages (trips, meetings, fees).
    const family =
      role === "student" && ctx.familyOperated
        ? [
            ...sharedModuleItems.parent,
            ...PACK_ORDER.filter((p) => packs.has(p)).flatMap((p) => PACK_MENUS[p].parent ?? []),
          ]
        : [];
    return dedupe([...segmentCore(role, menu), ...shared, ...packItems, ...family, ...foundation]);
  }
  // The global admin manages packs from Settings, not from tenant menus.
  if (role === "admin" && !instituteAdmin) return menu;
  // Classic tenants: pack items and the new shared modules append. Shared
  // modules are off by default for classic tenants (ModulesPanel turns them on).
  return dedupe([...menu, ...(role === "admin" ? shared : []), ...packItems, ...foundation]);
}
