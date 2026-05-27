import type { Role } from "./mockData";

export interface MenuItem {
  label: string;
  to: string;
  icon: string; // lucide icon name
  group?: string;
}

const ALL: Record<string, MenuItem> = {
  dashboard: { label: "Dashboard", to: "/app", icon: "LayoutDashboard" },
  students: { label: "Students", to: "/app/students", icon: "Users", group: "Academics" },
  courses: { label: "Courses", to: "/app/courses", icon: "BookOpen", group: "Academics" },
  attendance: { label: "Attendance", to: "/app/attendance", icon: "CalendarCheck", group: "Academics" },
  lms: { label: "Learning (LMS)", to: "/app/lms", icon: "GraduationCap", group: "Academics" },
  assignments: { label: "Assignments", to: "/app/assignments", icon: "FileText", group: "Academics" },
  grades: { label: "Grades", to: "/app/grades", icon: "Award", group: "Academics" },
  myClasses: { label: "My Classes", to: "/app/teacher-classes", icon: "School", group: "Teaching" },
  grading: { label: "Grading", to: "/app/grading", icon: "ClipboardCheck", group: "Teaching" },
  children: { label: "My Children", to: "/app/children", icon: "Baby", group: "Family" },
  fees: { label: "Fees & Invoices", to: "/app/finance", icon: "Wallet", group: "Finance" },
  finance: { label: "Financial Mgmt", to: "/app/finance", icon: "DollarSign", group: "Operations" },
  marketing: { label: "Marketing & CRM", to: "/app/marketing", icon: "Megaphone", group: "Operations" },
  marketplace: { label: "Marketplace", to: "/app/marketplace", icon: "Store", group: "Discover" },
  messages: { label: "Messages", to: "/app/messages", icon: "MessageSquare", group: "Communication" },
  ai: { label: "AI Insights", to: "/app/ai-insights", icon: "Sparkles", group: "Intelligence" },
  reports: { label: "Reports & BI", to: "/app/reports", icon: "BarChart3", group: "Intelligence" },
  tenants: { label: "Tenants", to: "/app/tenants", icon: "Building2", group: "Platform" },
  users: { label: "Users & Roles", to: "/app/users", icon: "ShieldCheck", group: "Platform" },
  compliance: { label: "Compliance & Audit", to: "/app/compliance", icon: "FileLock2", group: "Platform" },
  profile: { label: "My Profile", to: "/app/profile", icon: "User", group: "Account" },
};

export const menusByRole: Record<Role, MenuItem[]> = {
  student: [
    ALL.dashboard, ALL.courses, ALL.attendance, ALL.lms, ALL.assignments, ALL.grades,
    ALL.fees, ALL.messages, ALL.marketplace, ALL.profile,
  ],
  parent: [
    ALL.dashboard, ALL.children, ALL.attendance, ALL.grades, ALL.fees, ALL.messages, ALL.profile,
  ],
  teacher: [
    ALL.dashboard, ALL.myClasses, ALL.attendance, ALL.lms, ALL.grading, ALL.students,
    ALL.messages, ALL.ai, ALL.profile,
  ],
  admin: [
    ALL.dashboard, ALL.students, ALL.courses, ALL.attendance, ALL.lms, ALL.finance,
    ALL.marketing, ALL.marketplace, ALL.ai, ALL.reports, ALL.tenants, ALL.users,
    ALL.compliance, ALL.messages, ALL.profile,
  ],
};

export const roleLabel: Record<Role, string> = {
  student: "Student",
  parent: "Parent / Guardian",
  teacher: "Teacher",
  admin: "Platform Administrator",
};
