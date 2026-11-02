/**
 * Pack registry — the single source of truth for institution packs.
 *
 * Three independent dimensions decide what a tenant sees:
 *   1. MODULES  (src/lib/modules.ts) — purchasable features (Finance, Admissions…)
 *   2. PACKS    (this file)          — institution-type layers (Swim Club, School,
 *                                      Higher Education, College) that add
 *                                      vocabulary, menus, screens and seed data
 *   3. REGION   (./regions.ts)       — country defaults (calendar, codes, ids, tax,
 *                                      vetting checks, statutory returns)
 *
 * A pack never re-implements a module: it DEPENDS on modules (auto-enabled on
 * activation) and adds only what is specific to that kind of institution.
 */
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { homeTenantId, type DemoUser } from "@/lib/mockData";
import { addItem, updateItem, useCollection } from "@/lib/store";
import { toggleModule, type ModuleId } from "@/lib/modules";
import { REGIONS, type InstitutionType, type RegionProfile } from "./regions";
import type { PackId, TenantProfile, Learner, AccountMode, SignInProvider } from "./foundationData";
import { studentAccountFor } from "./foundationData";

export type { PackId } from "./foundationData";

export interface PackDef {
  id: PackId;
  name: string;
  short: string;
  icon: string; // lucide icon name
  tone: string; // tailwind gradient classes
  segment: InstitutionType;
  description: string;
  features: string[];
  /** Other packs this one layers on (auto-enabled). */
  requiresPacks?: PackId[];
  /** Modules this pack relies on (auto-enabled on activation). */
  requiresModules: ModuleId[];
  /** Routes owned by the pack — gated when the pack is off. */
  routePrefixes: string[];
  /** Reference tenant whose configuration is cloned by "Load starter template". */
  starterFrom?: string;
  /** Collections cloned by the starter template (configuration only). */
  starterCollections?: StarterKey[];
}

type StarterKey =
  | "curricula"
  | "tutorGroups"
  | "houses"
  | "ptmEvents"
  | "schoolServices"
  | "programmes"
  | "heModules"
  | "qualifications";

export const PACKS: PackDef[] = [
  {
    id: "swim",
    name: "Swim Club Pack",
    short: "Swim Club",
    icon: "Waves",
    tone: "from-sky-500 to-cyan-600",
    segment: "club",
    description:
      "Turns the platform into a single-purpose swim-club product: pool sessions, coaches, award levels, squad times and club reporting.",
    features: [
      "Pool sessions, lanes & capacity planning",
      "Coach rostering, cover & appraisal",
      "Award pathways & printable certificates",
      "Competitive squad PBs",
      "Club summary & HR reports",
    ],
    requiresModules: ["students", "courses", "attendance", "srb", "finance", "messages"],
    routePrefixes: [
      "/app/coaching",
      "/app/swim-reports",
      "/app/squad",
      "/app/awards",
      "/app/sessions",
      "/app/certificate",
      "/app/courses/C-SWIM",
    ],
  },
  {
    id: "intl-school",
    name: "International School Pack",
    short: "International School",
    icon: "School",
    tone: "from-emerald-500 to-teal-600",
    segment: "school",
    description:
      "Fee-paying international schools: several curricula on their own calendars, tutor groups & houses, external exam entries with predicted grades, parent–teacher meetings and school-life services.",
    features: [
      "Multiple curricula (British, IB, CBSE, national) each on its own calendar",
      "Tutor groups, houses & house points",
      "Exam entries (Cambridge, Pearson, IB, O/L–A/L) + predicted grades",
      "Parent–teacher meeting booking",
      "Boarding, transport, activities & trips with consent and payment",
    ],
    requiresModules: [
      "students",
      "attendance",
      "admissions",
      "timetable",
      "finance",
      "family",
      "messages",
    ],
    routePrefixes: ["/app/school"],
    starterFrom: "T-009",
    starterCollections: ["curricula", "tutorGroups", "houses", "ptmEvents", "schoolServices"],
  },
  {
    id: "higher-ed",
    name: "Higher Education Pack",
    short: "Higher Education",
    icon: "Landmark",
    tone: "from-indigo-500 to-violet-600",
    segment: "university",
    description:
      "Universities and degree-awarding colleges: programmes → stages → credit-bearing modules, module registration, weighted assessment with moderation, extenuating circumstances, exam boards, progression and transcripts.",
    features: [
      "Programmes, stages & credit-bearing modules with prerequisites",
      "Student module registration within credit rules",
      "Weighted assessment, moderation & resits",
      "Extenuating circumstances workflow",
      "Exam boards, progression & degree classification",
      "Transcripts",
    ],
    requiresModules: [
      "students",
      "attendance",
      "admissions",
      "timetable",
      "finance",
      "grades",
      "messages",
    ],
    routePrefixes: ["/app/he", "/app/alumni"],
    starterFrom: "T-010",
    starterCollections: ["programmes", "heModules"],
  },
  {
    id: "college",
    name: "College add-on",
    short: "College",
    icon: "Wrench",
    tone: "from-amber-500 to-orange-600",
    segment: "college",
    description:
      "Further-education & vocational colleges (FE, TAFE, RTO): qualifications and units from awarding bodies, competency outcomes, apprenticeships with employers and work placements. Layers on the Higher Education Pack.",
    features: [
      "Qualifications & units (BTEC, City & Guilds, AQF, NVQ)",
      "Competency / unit outcomes",
      "Apprenticeships — employer, off-the-job hours, end-point assessment",
      "Work placements — host, supervisor, hours",
    ],
    requiresPacks: ["higher-ed"],
    requiresModules: ["students", "attendance", "admissions", "timetable", "finance"],
    routePrefixes: ["/app/college"],
    starterFrom: "T-011",
    starterCollections: ["qualifications"],
  },
];

export const PACK_BY_ID: Record<PackId, PackDef> = Object.fromEntries(
  PACKS.map((p) => [p.id, p]),
) as Record<PackId, PackDef>;

/** The pack that owns a route (longest prefix), if any. */
export function packForPath(path: string): PackId | null {
  let best: { id: PackId; len: number } | null = null;
  for (const p of PACKS) {
    for (const prefix of p.routePrefixes) {
      if (
        (path === prefix || path.startsWith(prefix + "/")) &&
        (!best || prefix.length > best.len)
      ) {
        best = { id: p.id, len: prefix.length };
      }
    }
  }
  return best?.id ?? null;
}

/* ── Tenant context ──────────────────────────────────────────────────────── */

export interface TenantContext {
  user: DemoUser | null;
  tenantId: string;
  tenantName: string;
  profile: TenantProfile | undefined;
  region: RegionProfile;
  type: InstitutionType;
  packs: Set<PackId>;
  currency: string;
  isAdmin: boolean;
  isGlobalAdmin: boolean;
  /** Student sessions: the school account and how it is used (see policy). */
  account?: { provider: SignInProvider; login: string; mode: AccountMode; band?: string };
  /** A pupil account the family uses (primary years) — family features on,
   *  consents confirmed by the guardian's one-time code. */
  familyOperated: boolean;
  /** Registered guardian behind a family-operated account. */
  guardianName?: string;
  /** Name recorded on family actions (guardian for family-operated accounts). */
  actingAs: string;
  /** Student whose course has ended (Graduated) — alumni menu, not a learner's. */
  graduated: boolean;
}

/** Resolve the tenant a user works in. Global admin falls back to `fallback`. */
export function tenantIdForUser(user: DemoUser | null, fallback = "T-006"): string {
  return homeTenantId(user) ?? fallback;
}

export function useTenantContext(fallbackTenantId?: string): TenantContext {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  const tenants = useCollection("tenants");
  const learners = useCollection("learners");
  return useMemo(() => {
    const tenantId = tenantIdForUser(user, fallbackTenantId);
    const profile = profiles.find((p) => p.tenantId === tenantId);
    const region = REGIONS[profile?.region ?? "GLOBAL"];
    const me =
      user?.role === "student" && profile?.experience === "segment"
        ? learners.find((l) => l.id === user.oneEduId && l.tenantId === tenantId)
        : undefined;
    const account = me ? studentAccountFor(me, profile?.studentAccounts) : undefined;
    const familyOperated = account?.mode === "family";
    const guardianName = familyOperated ? me?.guardians?.[0] : undefined;
    return {
      account,
      graduated: me?.status === "Graduated",
      familyOperated,
      guardianName,
      actingAs: guardianName ?? user?.name ?? "",
      user,
      tenantId,
      tenantName: tenants.find((t) => t.id === tenantId)?.name ?? user?.institutionName ?? "",
      profile,
      region,
      type: profile?.type ?? "tuition",
      packs: new Set(profile?.packs ?? []),
      currency: region.currency,
      isAdmin: user?.role === "admin",
      isGlobalAdmin: user?.role === "admin" && user.adminScope === "global",
    };
  }, [user, profiles, tenants, learners, fallbackTenantId]);
}

/** Packs enabled for the signed-in user's tenant. */
export function usePackEnabled(id: PackId): boolean {
  return useTenantContext().packs.has(id);
}

/**
 * Learners visible to the signed-in user inside their tenant:
 * admin/teacher → whole tenant, parent → their children, student → self.
 */
export function useScopedLearners(): Learner[] {
  const { user, tenantId } = useTenantContext();
  const all = useCollection("learners");
  return useMemo(() => {
    const mine = all.filter((l) => l.tenantId === tenantId);
    if (!user) return [];
    if (user.role === "parent") return mine.filter((l) => l.guardians?.includes(user.name));
    if (user.role === "student") return mine.filter((l) => l.id === user.oneEduId);
    return mine;
  }, [all, tenantId, user]);
}

/* ── Activation ──────────────────────────────────────────────────────────── */

/**
 * Turn a pack on/off for a tenant. Turning on also enables the packs it layers
 * on and the modules it relies on; turning off also turns off packs that layer
 * on it (College add-on needs Higher Education).
 */
export function setPackEnabled(
  profiles: TenantProfile[],
  tenantId: string,
  tenantName: string,
  id: PackId,
  on: boolean,
) {
  const profile = profiles.find((p) => p.tenantId === tenantId);
  if (!profile) return;
  const next = new Set(profile.packs);
  if (on) {
    const stack: PackId[] = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (next.has(cur) && cur !== id) continue;
      next.add(cur);
      const def = PACK_BY_ID[cur];
      for (const m of def.requiresModules) toggleModule(tenantName, m, true);
      for (const dep of def.requiresPacks ?? []) if (!next.has(dep)) stack.push(dep);
    }
  } else {
    next.delete(id);
    for (const p of PACKS) if (p.requiresPacks?.includes(id)) next.delete(p.id);
  }
  updateItem("tenantProfiles", (p) => p.tenantId === tenantId, { packs: Array.from(next) });
}

/**
 * Clone a pack's reference configuration (curricula, programmes, modules,
 * qualifications…) into a tenant that has just enabled it. Student-level
 * records are never cloned.
 */
export function loadPackStarter(
  id: PackId,
  tenantId: string,
  // Current store rows, passed in so this stays a plain function.
  source: Partial<Record<StarterKey, { id: string; tenantId: string }[]>>,
  /** Tenant's default calendar — replaces calendar refs to the reference tenant. */
  defaultCalendarId: string,
): number {
  const def = PACK_BY_ID[id];
  if (!def.starterFrom || !def.starterCollections) return 0;
  const from = def.starterFrom;
  // Every id being cloned → its new id, so cross-references (programme →
  // module, tutor group → curriculum) point at the clones.
  const idMap = new Map<string, string>();
  for (const key of def.starterCollections) {
    for (const r of source[key] ?? []) {
      if (r.tenantId === from) idMap.set(r.id, `${r.id}-${tenantId}`);
    }
  }
  const remap = (v: unknown, k?: string): unknown => {
    if (typeof v === "string") {
      if (k === "calendarId" && !idMap.has(v)) return defaultCalendarId;
      return idMap.get(v) ?? v;
    }
    if (Array.isArray(v)) return v.map((x) => remap(x));
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, remap(vv, kk)]));
    }
    return v;
  };
  let n = 0;
  for (const key of def.starterCollections) {
    const all = source[key] ?? [];
    const existing = new Set(all.map((r) => r.id));
    for (const r of all.filter((x) => x.tenantId === from)) {
      const clone = { ...(remap(structuredClone(r)) as { id: string }), tenantId };
      if (existing.has(clone.id)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addItem(key, clone as any);
      n++;
    }
  }
  return n;
}
