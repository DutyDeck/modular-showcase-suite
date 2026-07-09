import { isSwimUser, isSwimAdmin, type DemoUser, type Role } from "./mockData";
import type { ModuleId } from "./modules";

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
  finance: {
    label: "Financial Mgmt",
    to: "/app/finance",
    icon: "DollarSign",
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

/** Sidebar menu for a user — swim accounts get the curated club menu. */
export function menuForUser(user: DemoUser | null): MenuItem[] {
  if (isSwimAdmin(user)) return swimAdminMenu;
  if (isSwimUser(user)) return swimCoachMenu;
  const menu = menusByRole[user?.role ?? "student"];
  // Appraising teachers is an adult responsibility — hide it from minor students
  // (only 18+ self-managed students may rate; for a minor the parent does it).
  if (user?.role === "student" && !user.selfManaged) {
    return menu.filter((m) => m.to !== "/app/appraisals");
  }
  return menu;
}
