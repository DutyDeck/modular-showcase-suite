import { useSyncExternalStore } from "react";
import { tenants as seedTenants } from "./mockData";
import { tenantProfiles as seedProfiles } from "./packs/foundationData";

/**
 * Module catalog — the single source of truth for which "purchasable" capabilities
 * exist in the product. Sidebar entries and route guards reference modules by id.
 *
 * NOTE: This is a presentation-layer gate suitable for the sales demo only.
 * A real deployment must return the entitlement set from the server with the
 * user session and enforce it server-side as well.
 */

export type ModuleId =
  | "core"
  | "students"
  | "courses"
  | "attendance"
  | "calendar"
  | "lms"
  | "assignments"
  | "grades"
  | "srb"
  | "teaching"
  | "training"
  | "appraisal"
  | "family"
  | "finance"
  | "marketing"
  | "marketplace"
  | "messages"
  | "ai"
  | "reports"
  | "tenants"
  | "users"
  | "migration"
  | "compliance"
  | "branding"
  // Shared modules introduced with the institution packs
  | "admissions"
  | "timetable"
  | "vetting"
  | "returns"
  | "integrations"
  | "groups"
  | "requests"
  | "itadmin";

export interface ModuleDef {
  id: ModuleId;
  name: string;
  description: string;
  /** Route prefixes that should be gated by this module. */
  routePrefixes: string[];
  /** Whether this module is always on (cannot be toggled off). */
  core?: boolean;
  /** Other modules this one depends on; turning this on auto-enables them. */
  dependsOn?: ModuleId[];
  /** Suggested plan tier for demo storytelling. */
  plan?: "Starter" | "Growth" | "Enterprise";
  /** Off by default for "classic" (tuition / club) tenants; on for segment tenants. */
  segmentDefault?: boolean;
}

export const MODULES: ModuleDef[] = [
  {
    id: "core",
    name: "Core",
    description: "Dashboard, profile, settings — always included.",
    routePrefixes: ["/app", "/app/profile", "/app/settings", "/app/onboarding"],
    core: true,
    plan: "Starter",
  },
  {
    id: "students",
    name: "Student Information",
    description: "Student roster, profiles, and admissions data.",
    routePrefixes: ["/app/students", "/app/learners"],
    plan: "Starter",
  },
  {
    id: "courses",
    name: "Courses & Curriculum",
    description: "Course catalog, syllabi, classes, sessions and offerings.",
    routePrefixes: ["/app/courses", "/app/sessions"],
    plan: "Starter",
  },
  {
    id: "attendance",
    name: "Attendance",
    description: "Daily attendance capture, reports, and trends.",
    routePrefixes: ["/app/attendance", "/app/registers"],
    plan: "Starter",
  },
  {
    id: "calendar",
    name: "Calendar & Scheduling",
    description: "Academic calendar, timetables, and events.",
    routePrefixes: ["/app/calendar"],
    plan: "Starter",
  },
  {
    id: "lms",
    name: "Learning Management (LMS)",
    description: "Lessons, content delivery, and progress tracking.",
    routePrefixes: ["/app/lms"],
    plan: "Growth",
  },
  {
    id: "assignments",
    name: "Assignments",
    description: "Homework, submissions, and rubric-based grading.",
    routePrefixes: ["/app/assignments"],
    plan: "Growth",
  },
  {
    id: "grades",
    name: "Grades & Gradebook",
    description: "Marks, GPA, and report cards.",
    routePrefixes: ["/app/grades", "/app/grading"],
    plan: "Growth",
  },
  {
    id: "srb",
    name: "Student Record Book",
    description: "Digital diary, daily notes, and parent-teacher comms.",
    routePrefixes: ["/app/srb"],
    plan: "Growth",
  },
  {
    id: "teaching",
    name: "Teacher Workspace",
    description: "My Classes, lesson plans, and teaching tools.",
    routePrefixes: ["/app/teacher-classes"],
    plan: "Starter",
  },
  {
    id: "training",
    name: "Teacher Training (CPD)",
    description: "Professional development — teachers enrol and learn as students.",
    routePrefixes: ["/app/training"],
    plan: "Growth",
  },
  {
    id: "appraisal",
    name: "Teacher Appraisal",
    description: "Parent & performance-based teacher ratings to guide selection (add-on).",
    routePrefixes: ["/app/appraisals"],
    plan: "Enterprise",
  },
  {
    id: "family",
    name: "Family / Parent Portal",
    description: "Children view and guardian-facing features.",
    routePrefixes: ["/app/children"],
    plan: "Starter",
  },
  {
    id: "finance",
    name: "Finance & Fees",
    description: "Invoices, fee collection, and financial management.",
    routePrefixes: [
      "/app/finance",
      "/app/invoice",
      "/app/billing",
      "/app/my-courses",
      "/app/pricing",
      "/app/fee-accounts",
    ],
    plan: "Growth",
  },
  {
    id: "marketing",
    name: "Marketing & CRM",
    description: "Leads, campaigns, and enrollment funnel.",
    routePrefixes: ["/app/marketing"],
    plan: "Enterprise",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    description: "Public course catalog and external offerings.",
    routePrefixes: ["/app/marketplace"],
    plan: "Growth",
  },
  {
    id: "messages",
    name: "Messaging",
    description: "Internal chat, announcements, and notifications.",
    routePrefixes: ["/app/messages"],
    plan: "Starter",
  },
  {
    id: "ai",
    name: "AI Insights",
    description: "AI copilot, risk prediction, and smart recommendations.",
    routePrefixes: ["/app/ai-insights"],
    plan: "Enterprise",
  },
  {
    id: "reports",
    name: "Reports & BI",
    description: "Operational dashboards and business intelligence.",
    routePrefixes: ["/app/reports"],
    plan: "Growth",
  },
  {
    id: "tenants",
    name: "Multi-Tenant Mgmt",
    description: "Manage tenants, branches, and franchise accounts.",
    routePrefixes: ["/app/tenants"],
    plan: "Enterprise",
  },
  {
    id: "users",
    name: "Users & Roles",
    description: "User management, RBAC, and provisioning.",
    routePrefixes: ["/app/users"],
    plan: "Starter",
  },
  {
    id: "migration",
    name: "Migration & Imports",
    description: "Bulk import tools and data migration assistants.",
    routePrefixes: ["/app/migration"],
    plan: "Enterprise",
  },
  {
    id: "compliance",
    name: "Compliance & Audit",
    description: "Audit logs, data retention, and regulatory exports.",
    routePrefixes: ["/app/compliance"],
    plan: "Enterprise",
  },
  {
    id: "branding",
    name: "White-label Branding",
    description:
      "Your logo, colours, vision & mission across the whole app — make 1StudentID feel like your own institute's product.",
    routePrefixes: ["/app/branding"],
    plan: "Enterprise",
  },
  {
    id: "admissions",
    name: "Admissions",
    description:
      "Enquiry → application → assessment / interview → offer → deposit → enrolled, with waitlists. Enrolment creates the permanent 1StudentID.",
    routePrefixes: ["/app/admissions"],
    plan: "Growth",
    segmentDefault: true,
  },
  {
    id: "timetable",
    name: "Timetable & Rooms",
    description:
      "Period / lecture timetable, rooms, clash checks and cover for absent staff. Import from existing timetabling tools.",
    routePrefixes: ["/app/timetable"],
    plan: "Growth",
    segmentDefault: true,
  },
  {
    id: "vetting",
    name: "Staff Vetting Register",
    description:
      "Statutory staff checks per region — UK Single Central Record, AU Working With Children Checks, UAE good conduct, LK police reports.",
    routePrefixes: ["/app/vetting"],
    plan: "Growth",
    segmentDefault: true,
  },
  {
    id: "returns",
    name: "Regulator Returns",
    description:
      "Validate, generate and track statutory data returns for the tenant's country and institution type.",
    routePrefixes: ["/app/returns"],
    plan: "Enterprise",
    segmentDefault: true,
  },
  {
    id: "integrations",
    name: "Integrations",
    description:
      "SAML / Shibboleth SSO, LTI 1.3 (Moodle, Canvas, Blackboard), student-record and school MIS connectors.",
    routePrefixes: ["/app/integrations"],
    plan: "Enterprise",
    segmentDefault: true,
  },
  {
    id: "groups",
    name: "Groups & Campuses",
    description:
      "Cross-campus view for school groups and multi-campus universities: consolidated KPIs across tenants.",
    routePrefixes: ["/app/group"],
    plan: "Enterprise",
    segmentDefault: true,
  },
  {
    id: "requests",
    name: "Requests & Approvals",
    description:
      "Students (and parents) submit progression, transfer, interruption, withdrawal, deferral, project and leave requests; multi-step approval updates the record and fee schedule automatically.",
    routePrefixes: ["/app/requests"],
    plan: "Growth",
    segmentDefault: true,
  },
  {
    id: "itadmin",
    name: "IT Administration",
    description:
      "Account lifecycle (provision on enrolment, one-click revoke for leavers), IT support desk, system health and the notifications outbox.",
    routePrefixes: ["/app/it"],
    plan: "Growth",
    segmentDefault: true,
  },
];

export const MODULE_BY_ID: Record<string, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
);

const STORAGE_KEY = "oneedu.tenant.modules.v1";

/** Classic tenants: everything except the segment-only modules. */
const DEFAULT_ENABLED: ModuleId[] = MODULES.filter((m) => !m.segmentDefault).map((m) => m.id);
/** Segment tenants (school / university / college experience): everything. */
const SEGMENT_DEFAULT: ModuleId[] = MODULES.map((m) => m.id);

/** Tenant names whose experience is "segment" — keyed like entitlements. */
const SEGMENT_TENANT_NAMES = new Set(
  seedTenants
    .filter((t) => seedProfiles.find((p) => p.tenantId === t.id)?.experience === "segment")
    .map((t) => t.name),
);

function defaultFor(key: string): ModuleId[] {
  return SEGMENT_TENANT_NAMES.has(key) ? SEGMENT_DEFAULT : DEFAULT_ENABLED;
}

type Entitlements = Record<string, ModuleId[]>;

function readStored(): Entitlements {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Entitlements) : {};
  } catch {
    return {};
  }
}

let state: Entitlements = readStored();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot() {
  return state;
}

function tenantKey(institution: string) {
  return institution || "_default";
}

export function getEnabledModules(institution: string): Set<ModuleId> {
  const key = tenantKey(institution);
  const list = state[key] ?? defaultFor(key);
  return new Set(list);
}

export function setEnabledModules(institution: string, ids: ModuleId[]) {
  const key = tenantKey(institution);
  const core = MODULES.filter((m) => m.core).map((m) => m.id);
  const merged = Array.from(new Set([...core, ...ids]));
  state = { ...state, [key]: merged };
  persist();
}

export function toggleModule(institution: string, id: ModuleId, on: boolean) {
  const def = MODULE_BY_ID[id];
  if (!def || def.core) return;
  const current = new Set(getEnabledModules(institution));
  if (on) {
    current.add(id);
    for (const dep of def.dependsOn ?? []) current.add(dep);
  } else {
    current.delete(id);
  }
  setEnabledModules(institution, Array.from(current) as ModuleId[]);
}

export function resetTenant(institution: string) {
  const key = tenantKey(institution);
  const { [key]: _, ...rest } = state;
  state = rest;
  persist();
}

export function useEnabledModules(institution: string): Set<ModuleId> {
  const all = useSyncExternalStore(subscribe, snapshot, snapshot);
  const key = tenantKey(institution);
  const list = all[key] ?? defaultFor(key);
  return new Set(list);
}

/** Resolve the module id that owns a given route path. */
export function moduleForPath(path: string): ModuleId | null {
  // Longest-prefix match so "/app/srb" beats "/app".
  let best: { id: ModuleId; len: number } | null = null;
  for (const m of MODULES) {
    for (const prefix of m.routePrefixes) {
      const matches = path === prefix || path.startsWith(prefix + "/");
      if (matches && (!best || prefix.length > best.len)) {
        best = { id: m.id, len: prefix.length };
      }
    }
  }
  return best?.id ?? null;
}
