import type { Role } from "./mockData";
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
  students: { label: "Students", to: "/app/students", icon: "Users", group: "Academics", moduleId: "students" },
  courses: { label: "Courses", to: "/app/courses", icon: "BookOpen", group: "Academics", moduleId: "courses" },
  attendance: { label: "Attendance", to: "/app/attendance", icon: "CalendarCheck", group: "Academics", moduleId: "attendance" },
  calendar: { label: "Calendar", to: "/app/calendar", icon: "Calendar", group: "Academics", moduleId: "calendar" },
  lms: { label: "Learning (LMS)", to: "/app/lms", icon: "GraduationCap", group: "Academics", moduleId: "lms" },
  assignments: { label: "Assignments", to: "/app/assignments", icon: "FileText", group: "Academics", moduleId: "assignments" },
  grades: { label: "Grades", to: "/app/grades", icon: "Award", group: "Academics", moduleId: "grades" },
  myClasses: { label: "My Classes", to: "/app/teacher-classes", icon: "School", group: "Teaching", moduleId: "teaching" },
  grading: { label: "Grading", to: "/app/grading", icon: "ClipboardCheck", group: "Teaching", moduleId: "grades" },
  children: { label: "My Children", to: "/app/children", icon: "Baby", group: "Family", moduleId: "family" },
  srb: { label: "Record Book", to: "/app/srb", icon: "NotebookPen", group: "Family", moduleId: "srb" },
  srbTeacher: { label: "Record Books", to: "/app/srb", icon: "NotebookPen", group: "Teaching", moduleId: "srb" },
  srbStudent: { label: "My Record Book", to: "/app/srb", icon: "NotebookPen", group: "Academics", moduleId: "srb" },
  srbAdmin: { label: "Record Books", to: "/app/srb", icon: "NotebookPen", group: "Academics", moduleId: "srb" },
  fees: { label: "Fees & Invoices", to: "/app/finance", icon: "Wallet", group: "Finance", moduleId: "finance" },
  finance: { label: "Financial Mgmt", to: "/app/finance", icon: "DollarSign", group: "Operations", moduleId: "finance" },
  marketing: { label: "Marketing & CRM", to: "/app/marketing", icon: "Megaphone", group: "Operations", moduleId: "marketing" },
  marketplace: { label: "Marketplace", to: "/app/marketplace", icon: "Store", group: "Discover", moduleId: "marketplace" },
  messages: { label: "Messages", to: "/app/messages", icon: "MessageSquare", group: "Communication", moduleId: "messages" },
  ai: { label: "AI Insights", to: "/app/ai-insights", icon: "Sparkles", group: "Intelligence", moduleId: "ai" },
  reports: { label: "Reports & BI", to: "/app/reports", icon: "BarChart3", group: "Intelligence", moduleId: "reports" },
  tenants: { label: "Tenants", to: "/app/tenants", icon: "Building2", group: "Platform", moduleId: "tenants" },
  users: { label: "Users & Roles", to: "/app/users", icon: "ShieldCheck", group: "Platform", moduleId: "users" },
  migration: { label: "Migration & Imports", to: "/app/migration", icon: "DatabaseZap", group: "Platform", moduleId: "migration" },
  compliance: { label: "Compliance & Audit", to: "/app/compliance", icon: "FileLock2", group: "Platform", moduleId: "compliance" },
  settings: { label: "Settings", to: "/app/settings", icon: "Settings", group: "Platform", moduleId: "core" },
  profile: { label: "My Profile", to: "/app/profile", icon: "User", group: "Account", moduleId: "core" },
};

export const menusByRole: Record<Role, MenuItem[]> = {
  student: [
    ALL.dashboard, ALL.courses, ALL.attendance, ALL.calendar, ALL.lms, ALL.assignments, ALL.grades,
    ALL.srbStudent, ALL.fees, ALL.messages, ALL.marketplace, ALL.profile,
  ],
  parent: [
    ALL.dashboard, ALL.children, ALL.srb, ALL.attendance, ALL.calendar, ALL.grades, ALL.fees, ALL.messages, ALL.profile,
  ],
  teacher: [
    ALL.dashboard, ALL.myClasses, ALL.attendance, ALL.calendar, ALL.lms, ALL.grading, ALL.students,
    ALL.srbTeacher, ALL.messages, ALL.ai, ALL.profile,
  ],
  admin: [
    ALL.dashboard, ALL.students, ALL.srbAdmin, ALL.courses, ALL.attendance, ALL.calendar, ALL.lms, ALL.finance,
    ALL.marketing, ALL.marketplace, ALL.ai, ALL.reports, ALL.tenants, ALL.users,
    ALL.migration, ALL.compliance, ALL.settings, ALL.messages, ALL.profile,
  ],
};

export const roleLabel: Record<Role, string> = {
  student: "Student",
  parent: "Parent / Guardian",
  teacher: "Teacher",
  admin: "Platform Administrator",
};
