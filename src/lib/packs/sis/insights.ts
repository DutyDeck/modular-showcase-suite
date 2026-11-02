/* ── Demo insights & KPI reports for pack tenants ────────────────────────────
 * Pure functions over live pack collections. "AI Insights" for a pack tenant
 * are simple, explainable rules (labelled "Demo insight" in the UI) — not a
 * trained model: attendance below the line, visa engagement, overdue fees,
 * missing coursework, below-target grades, progression risk, certification
 * readiness, staff vetting and admissions conversion. Reports reuse the same
 * per-learner facts so the two pages always agree.
 *
 * Scope is decided by the caller (see `scopeFor`): student / family → self,
 * parent → children, teacher → their groups (+ form), admin → institution. */
import type { Learner, TenantProfile } from "../foundationData";
import { DEMO_TODAY } from "../foundationData";
import type { Application, RegisterMark, VettingRecord } from "../opsData";
import { ADMISSION_PIPELINE, effectiveVettingStatus, summarise } from "../opsData";
import type { FeeAccount } from "../bizData";
import { accountTotals } from "../bizData";
import type { ExamEntry } from "../schoolData";
import type {
  HeModule,
  ModuleMark,
  ModuleRegistration,
  Programme,
  Qualification,
  UnitAchievement,
} from "../heData";
import { moduleOutcome, qualProgress } from "../heData";
import type { InstitutionType, RegionProfile, VisaScope } from "../regions";
import { codeSetById, money, visaRuleFor } from "../regions";
import type { Coursework, ProgressReport, Submission } from "./coursework";
import { ageBandFor, buildTeachingGroups, type TeachingGroup } from "./learning";
import { formOf } from "./conversations";
import { useMemo } from "react";
import { useCollection } from "../../store";
import { useTenantContext } from "../registry";

export interface PackData {
  tenantId: string;
  tenantType: InstitutionType;
  profile?: TenantProfile;
  region: RegionProfile;
  learners: Learner[];
  groups: TeachingGroup[];
  registerMarks: RegisterMark[];
  feeAccounts: FeeAccount[];
  applications: Application[];
  examEntries: ExamEntry[];
  heModules: HeModule[];
  moduleMarks: ModuleMark[];
  moduleRegistrations: ModuleRegistration[];
  programmes: Programme[];
  qualifications: Qualification[];
  unitAchievements: UnitAchievement[];
  vettingRecords: VettingRecord[];
  coursework: Coursework[];
  submissions: Submission[];
  progressReports: ProgressReport[];
}

export type ScopeKind = "self" | "family" | "teacher" | "institution";

export interface Scope {
  kind: ScopeKind;
  /** Name of the viewer (teacher name for "teacher"). */
  viewer: string;
  learners: Learner[];
  groups: TeachingGroup[];
}

const ON_ROLL = ["Active", "Interrupted"];

/** Who the signed-in user may see. Family-used primary accounts act for the
 *  pupil and any early-years siblings (who have no login of their own). */
export function scopeFor(
  user: { role: string; name: string; oneEduId?: string } | null,
  d: Pick<PackData, "tenantId" | "learners" | "groups">,
  opts: { family?: boolean; guardianName?: string } = {},
): Scope {
  const mine = d.learners.filter((l) => l.tenantId === d.tenantId);
  const groups = d.groups.filter((g) => g.tenantId === d.tenantId);
  if (!user) return { kind: "self", viewer: "", learners: [], groups: [] };
  if (user.role === "admin")
    return {
      kind: "institution",
      viewer: user.name,
      learners: mine.filter((l) => ON_ROLL.includes(l.status)),
      groups,
    };
  if (user.role === "teacher") {
    const taught = groups.filter((g) => g.teacher === user.name);
    const ids = new Set(taught.flatMap((g) => g.studentIds));
    const form = formOf(d.tenantId, user.name);
    return {
      kind: "teacher",
      viewer: user.name,
      learners: mine.filter((l) => ids.has(l.id) || (!!form && l.group === form)),
      groups: taught,
    };
  }
  let kids: Learner[];
  if (user.role === "parent") kids = mine.filter((l) => l.guardians?.includes(user.name));
  else if (opts.family && opts.guardianName)
    kids = mine.filter(
      (l) =>
        l.id === user.oneEduId ||
        (l.guardians?.includes(opts.guardianName!) && ageBandFor(l.level) === "early"),
    );
  else kids = mine.filter((l) => l.id === user.oneEduId);
  const ids = new Set(kids.map((k) => k.id));
  return {
    kind: user.role === "parent" || opts.family ? "family" : "self",
    viewer: opts.guardianName ?? user.name,
    learners: kids,
    groups: groups.filter((g) => g.studentIds.some((id) => ids.has(id))),
  };
}

/* ── Per-learner facts ──────────────────────────────────────────────────── */

const first = (name: string) => name.split(" ")[0];

const bandOf = (l: Learner) =>
  ageBandFor(l.level, l.programmeId ? "he" : l.qualificationId ? "vet" : undefined);

function visaScopeOf(l: Learner, type: InstitutionType): VisaScope {
  if (l.programmeId) return "he-degree";
  if (l.qualificationId) return "below-degree";
  if (type === "school") return "school";
  return type === "university" ? "he-degree" : "below-degree";
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

export function codeSet(d: PackData) {
  return codeSetById(d.profile?.codeSetId ?? "");
}

/** Attendance % for a set of marks (undefined when there are none). */
export function pctOf(marks: RegisterMark[], d: PackData): number | undefined {
  if (!marks.length) return undefined;
  return summarise(marks, codeSet(d)).pct;
}

export function learnerAttendance(l: Learner, d: PackData): number | undefined {
  return pctOf(
    d.registerMarks.filter((m) => m.studentId === l.id),
    d,
  );
}

/** Line a learner should stay above: 90% school, 85% otherwise, raised by a
 *  percentage-based visa rule for sponsored learners. */
export function attendanceLine(l: Learner, d: PackData): number {
  const base = d.tenantType === "school" ? 90 : 85;
  if (l.visa?.sponsored) {
    const r = visaRuleFor(d.region, visaScopeOf(l, d.tenantType));
    if (r && (r.kind === "monthly-pct" || r.kind === "period-pct") && r.thresholdPct)
      return Math.max(base, r.thresholdPct);
  }
  return base;
}

export function groupAttendance(g: TeachingGroup, d: PackData): number | undefined {
  const ids = new Set(g.studentIds);
  const byLabel =
    g.kind === "module"
      ? d.registerMarks.filter((m) => ids.has(m.studentId) && m.groupLabel.startsWith(g.code))
      : [];
  return pctOf(byLabel.length ? byLabel : d.registerMarks.filter((m) => ids.has(m.studentId)), d);
}

export function learnerFees(l: Learner, d: PackData) {
  const accts = d.feeAccounts.filter((a) => a.studentId === l.id);
  const t = accts.map(accountTotals);
  return {
    currency: accts[0]?.currency ?? d.region.currency,
    billed: t.reduce((s, x) => s + x.billed, 0),
    paid: t.reduce((s, x) => s + x.paid, 0),
    outstanding: t.reduce((s, x) => s + x.outstanding, 0),
    overdue: t.reduce((s, x) => s + x.overdue, 0),
    overdueLabels: accts.flatMap((a) =>
      a.instalments.filter((i) => i.status === "Overdue").map((i) => i.label),
    ),
  };
}

/** Coursework set for the learner that is past due, and what they submitted. */
export function learnerCoursework(l: Learner, d: PackData) {
  const groupIds = new Set(d.groups.filter((g) => g.studentIds.includes(l.id)).map((g) => g.id));
  const set = d.coursework.filter(
    (c) => c.tenantId === l.tenantId && groupIds.has(c.groupId) && c.due < DEMO_TODAY,
  );
  const subs = d.submissions.filter((s) => s.studentId === l.id);
  const missing = set.filter((c) => {
    const s = subs.find((x) => x.courseworkId === c.id);
    return !s || s.status === "Not submitted";
  });
  return { set, missing };
}

/* Grade ranking so predicted / current values compare with targets. */
const LETTERS = ["U", "G", "F", "E", "D", "C", "B", "A", "A*"];
export function gradeRank(v?: string): number | undefined {
  if (!v) return undefined;
  const s = v.trim();
  const num = s.match(/^(\d+(?:\.\d+)?)%?$/);
  if (num) return Number(num[1]);
  const li = LETTERS.indexOf(s.toUpperCase());
  if (li >= 0) return li;
  if (/working towards|emerging|beginning|not yet/i.test(s)) return 1;
  if (/developing/i.test(s)) return 1.5;
  if (/expected|secure|meeting|competent/i.test(s)) return 2;
  if (/greater depth|exceeding|mastery/i.test(s)) return 3;
  return undefined;
}

/** Below-target progress-report lines for a learner. */
export function belowTarget(l: Learner, d: PackData) {
  return d.progressReports.filter((r) => {
    if (r.studentId !== l.id || !r.target) return false;
    const v = gradeRank(r.value);
    const t = gradeRank(r.target);
    if (v === undefined || t === undefined) return false;
    return r.scheme === "percent" ? t - v >= 5 : t > v;
  });
}

const passMarkFor = (l: Learner, d: PackData) =>
  d.programmes.find((p) => p.id === l.programmeId)?.passMark ?? 40;

/** Module results for an HE learner (with marks), newest year first. */
export function moduleResults(l: Learner, d: PackData) {
  const mine = d.moduleMarks.filter((m) => m.studentId === l.id);
  const modIds = [...new Set(mine.map((m) => m.moduleId))];
  const pass = passMarkFor(l, d);
  return modIds
    .map((id) => {
      const mod = d.heModules.find((m) => m.id === id);
      if (!mod) return null;
      const o = moduleOutcome(mod, mine, l.id, pass);
      if (o.mark === undefined) return null;
      const marks = mine.filter((m) => m.moduleId === id);
      const year =
        marks
          .map((m) => m.academicYear ?? "")
          .sort()
          .pop() ?? "";
      const provisional = marks.some((m) => m.status !== "Confirmed");
      return {
        mod,
        mark: o.mark,
        complete: o.complete,
        passed: o.mark >= pass,
        year,
        provisional,
        pass,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.year.localeCompare(a.year) || a.mod.code.localeCompare(b.mod.code));
}

/** Learners who are still failing a module (no passing resit yet). */
export function progressionRisks(l: Learner, d: PackData) {
  return moduleResults(l, d).filter((r) => !r.passed);
}

/** Visa engagement status for a sponsored learner. */
export function visaStatus(l: Learner, d: PackData) {
  if (!l.visa?.sponsored) return null;
  const rule = visaRuleFor(d.region, visaScopeOf(l, d.tenantType));
  if (!rule) return null;
  const set = codeSet(d);
  const marks = d.registerMarks.filter((m) => m.studentId === l.id);
  const s = summarise(marks, set);
  const present = (code: string) => {
    const m = set.codes.find((c) => c.code === code)?.meaning;
    return m === "present" || m === "late" || m === "aea";
  };
  const last = marks
    .filter((m) => present(m.code))
    .map((m) => m.date)
    .sort()
    .pop();
  const days = Math.max(0, daysBetween(last ?? l.startDate ?? DEMO_TODAY, DEMO_TODAY));
  let risk: "ok" | "watch" | "report" = "ok";
  let measure = `${s.pct}% attendance`;
  if (rule.kind === "progress-only") {
    risk = progressionRisks(l, d).length ? "watch" : "ok";
    measure = "course progress";
  } else if (rule.kind === "engagement-days") {
    measure = `${days} day(s) since last engagement · ${s.pct}% attendance`;
    if (days >= (rule.withdrawDays ?? 60)) risk = "report";
    else if (days >= (rule.interveneDays ?? 14) || s.pct < 75) risk = "watch";
  } else {
    const line = rule.thresholdPct ?? 80;
    if (marks.length && s.pct < line) risk = "report";
    else if (marks.length && s.pct < line + 5) risk = "watch";
  }
  return { rule, risk, measure, pct: s.pct, days };
}

/* ── Insights ───────────────────────────────────────────────────────────── */

export type InsightCategory =
  | "Attendance"
  | "Visa"
  | "Fees"
  | "Coursework"
  | "Targets"
  | "Progression"
  | "Certification"
  | "Staff vetting"
  | "Admissions";

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: "high" | "medium" | "info";
  title: string;
  desc: string;
  action: string;
  to: string;
}

const sev = { high: 0, medium: 1, info: 2 };

export function buildInsights(d: PackData, s: Scope): Insight[] {
  const out: Insight[] = [];
  const personal = s.kind === "self" || s.kind === "family";
  const who = (l: Learner) => (s.kind === "self" ? "Your" : `${first(l.name)}'s`);
  const learners = s.learners;

  /* Attendance */
  const lowAtt = learners
    .map((l) => ({ l, pct: learnerAttendance(l, d), line: attendanceLine(l, d) }))
    .filter((x) => x.pct !== undefined && x.pct < x.line)
    .sort((a, b) => a.pct! - b.pct!);
  for (const x of lowAtt.slice(0, personal ? 10 : 6)) {
    out.push({
      id: `att-${x.l.id}`,
      category: "Attendance",
      severity: x.pct! < x.line - 10 ? "high" : "medium",
      title: personal
        ? `${who(x.l)} attendance is ${x.pct}%`
        : `${x.l.name} — attendance ${x.pct}%`,
      desc: `Below the ${x.line}% line${x.l.group ? ` · ${x.l.group}` : ""}.`,
      action: personal
        ? "See attendance"
        : d.tenantType === "school"
          ? "Contact the family"
          : "Book a check-in",
      to: "/app/registers",
    });
  }
  if (!personal) {
    // Groups below the line (school forms; HE / VET teaching groups).
    const line = d.tenantType === "school" ? 90 : 85;
    const rows: { label: string; pct: number }[] = [];
    if (d.tenantType === "school") {
      const forms = [...new Set(learners.map((l) => l.group).filter(Boolean))] as string[];
      for (const f of forms) {
        const ids = new Set(learners.filter((l) => l.group === f).map((l) => l.id));
        const pct = pctOf(
          d.registerMarks.filter((m) => ids.has(m.studentId)),
          d,
        );
        if (pct !== undefined) rows.push({ label: f, pct });
      }
    } else {
      for (const g of s.groups) {
        const pct = groupAttendance(g, d);
        if (pct !== undefined) rows.push({ label: `${g.code} ${g.title}`, pct });
      }
    }
    for (const r of rows.filter((r) => r.pct < line).slice(0, 3))
      out.push({
        id: `att-g-${r.label}`,
        category: "Attendance",
        severity: "medium",
        title: `${r.label} — group attendance ${r.pct}%`,
        desc: `Below the ${line}% line for the group.`,
        action: "Review the register",
        to: "/app/registers",
      });
  } else {
    for (const l of learners) {
      const pct = learnerAttendance(l, d);
      const line = attendanceLine(l, d);
      if (pct !== undefined && pct >= line)
        out.push({
          id: `att-ok-${l.id}`,
          category: "Attendance",
          severity: "info",
          title: `${who(l)} attendance is ${pct}%`,
          desc: `On track — above the ${line}% line.`,
          action: "See attendance",
          to: "/app/registers",
        });
    }
  }

  /* Visa engagement (sponsored learners) */
  for (const l of learners) {
    const v = visaStatus(l, d);
    if (!v || v.risk === "ok") continue;
    out.push({
      id: `visa-${l.id}`,
      category: "Visa",
      severity: v.risk === "report" ? "high" : "medium",
      title: personal ? `Visa attendance check: ${v.measure}` : `${l.name} — visa engagement risk`,
      desc: `${v.rule.label}. ${personal ? "" : `${v.measure}. `}${
        personal
          ? "Your sponsor must report low attendance — talk to your tutor early."
          : v.risk === "report"
            ? `Reporting: ${v.rule.reportVia} (${v.rule.reportWithin}).`
            : "Contact now to stay ahead of the rule."
      }`,
      action: personal
        ? "Talk to your tutor"
        : v.risk === "report"
          ? "Review and report"
          : "Contact the student",
      to: personal ? "/app/messages" : "/app/registers",
    });
  }

  /* Fees (not for teachers) */
  if (s.kind !== "teacher") {
    const overdue = learners
      .map((l) => ({ l, f: learnerFees(l, d) }))
      .filter((x) => x.f.overdue > 0)
      .sort((a, b) => b.f.overdue - a.f.overdue);
    if (personal) {
      for (const x of overdue)
        out.push({
          id: `fee-${x.l.id}`,
          category: "Fees",
          severity: "high",
          title: `${who(x.l)} fees: ${money(x.f.overdue, x.f.currency)} overdue`,
          desc: x.f.overdueLabels.length
            ? `${x.f.overdueLabels.join(", ")} past due.`
            : "An instalment is past due.",
          action: "Pay or set up a plan",
          to: "/app/fee-accounts",
        });
    } else if (overdue.length) {
      const cur = overdue[0].f.currency;
      const total = overdue.reduce((sum, x) => sum + x.f.overdue, 0);
      out.push({
        id: "fee-all",
        category: "Fees",
        severity: overdue.length > 2 ? "high" : "medium",
        title: `${overdue.length} account(s) overdue — ${money(total, cur)}`,
        desc: `Largest: ${overdue
          .slice(0, 3)
          .map((x) => `${x.l.name} ${money(x.f.overdue, x.f.currency)}`)
          .join(", ")}.`,
        action: "Send reminders",
        to: "/app/fee-accounts",
      });
    }
  }

  /* Coursework not submitted (not for early years) */
  if (personal) {
    for (const l of learners.filter((x) => bandOf(x) !== "early")) {
      const c = learnerCoursework(l, d);
      if (c.missing.length)
        out.push({
          id: `cw-${l.id}`,
          category: "Coursework",
          severity: c.missing.length > 1 ? "high" : "medium",
          title: `${c.missing.length} piece(s) of ${bandOf(l) === "primary" ? "homework" : "work"} not handed in`,
          desc: `${s.kind === "self" ? "" : `${first(l.name)}: `}${c.missing
            .slice(0, 3)
            .map((m) => m.title)
            .join(", ")}.`,
          action: "Open assignments",
          to: "/app/assignments",
        });
    }
  } else {
    const cwIds = new Set(s.groups.map((g) => g.id));
    const items = d.coursework.filter(
      (c) => c.tenantId === d.tenantId && cwIds.has(c.groupId) && c.due < DEMO_TODAY,
    );
    const rows = items
      .map((c) => {
        const g = s.groups.find((x) => x.id === c.groupId)!;
        const missing = g.studentIds.filter((id) => {
          const sub = d.submissions.find((x) => x.courseworkId === c.id && x.studentId === id);
          return !sub || sub.status === "Not submitted";
        });
        return { c, g, missing };
      })
      .filter((r) => r.missing.length)
      .sort((a, b) => b.missing.length - a.missing.length);
    if (s.kind === "teacher") {
      for (const r of rows.slice(0, 4))
        out.push({
          id: `cw-${r.c.id}`,
          category: "Coursework",
          severity: r.missing.length / Math.max(1, r.g.studentIds.length) > 0.3 ? "high" : "medium",
          title: `${r.missing.length} of ${r.g.studentIds.length} not submitted — ${r.c.title}`,
          desc: `${r.g.title} · due ${r.c.due}.`,
          action: "Chase submissions",
          to: "/app/assignments",
        });
    } else if (rows.length) {
      const missing = rows.reduce((sum, r) => sum + r.missing.length, 0);
      const groupCount = new Set(rows.map((r) => r.g.id)).size;
      out.push({
        id: "cw-all",
        category: "Coursework",
        severity: missing > 5 ? "high" : "medium",
        title: `${missing} overdue submission(s) across ${groupCount} group(s)`,
        desc: `Most missing: ${rows
          .slice(0, 3)
          .map((r) => `${r.c.title} (${r.g.title}, ${r.missing.length})`)
          .join("; ")}.`,
        action: "Review with teachers",
        to: "/app/assignments",
      });
    }
  }

  /* Predicted / current vs target (school). Teachers: their own groups only. */
  const ownGroups = new Set(s.groups.map((g) => g.id));
  const targetRows = learners.flatMap((l) =>
    belowTarget(l, d)
      .filter((r) => s.kind !== "teacher" || ownGroups.has(r.groupId))
      .map((r) => ({ l, r, g: d.groups.find((g) => g.id === r.groupId) })),
  );
  if (personal) {
    for (const x of targetRows.slice(0, 6))
      out.push({
        id: `tgt-${x.r.id}`,
        category: "Targets",
        severity: "medium",
        title: `${x.g?.subject ?? "Subject"}: ${x.r.value} against a target of ${x.r.target}`,
        desc: `${s.kind === "self" ? "" : `${first(x.l.name)} · `}${x.r.comment ?? "Below target this term."}`,
        action: "See grades",
        to: "/app/grades",
      });
  } else if (targetRows.length) {
    const learnersBelow = new Set(targetRows.map((x) => x.l.id)).size;
    out.push({
      id: "tgt-all",
      category: "Targets",
      severity: learnersBelow > 3 ? "high" : "medium",
      title: `${learnersBelow} learner(s) below target · ${targetRows.length} subject grade(s)`,
      desc: targetRows
        .slice(0, 3)
        .map((x) => `${x.l.name} — ${x.g?.title ?? "subject"} ${x.r.value} vs ${x.r.target}`)
        .join("; "),
      action: "Plan interventions",
      to: "/app/grades",
    });
  }

  /* Progression risk (HE module marks) */
  for (const l of learners.filter((x) => x.programmeId)) {
    const risks = progressionRisks(l, d);
    if (!risks.length) continue;
    out.push({
      id: `prog-${l.id}`,
      category: "Progression",
      severity: risks.some((r) => r.complete) ? "high" : "medium",
      title: personal
        ? `${risks.length} module(s) below the pass mark`
        : `${l.name} — ${risks.length} module(s) below the pass mark`,
      desc:
        risks
          .map((r) => `${r.mod.code} ${r.mark}% (${r.year}${r.provisional ? ", provisional" : ""})`)
          .join(", ") + `. Pass mark ${risks[0].pass}%.`,
      action: personal ? "Check resit dates" : "Plan the resit",
      to: "/app/he/assessment",
    });
  }
  if (personal) {
    for (const l of learners.filter((x) => x.programmeId)) {
      const res = moduleResults(l, d).filter((r) => r.passed && r.provisional);
      if (res.length)
        out.push({
          id: `prog-ok-${l.id}`,
          category: "Progression",
          severity: "info",
          title: `On track in ${res.map((r) => r.mod.code).join(", ")}`,
          desc: res.map((r) => `${r.mod.code} ${r.mark}% so far (provisional)`).join(", ") + ".",
          action: "See results",
          to: "/app/he/transcripts",
        });
    }
  }

  /* Certification ready (VET) */
  const vet = learners
    .filter((l) => l.qualificationId)
    .map((l) => {
      const q = d.qualifications.find((x) => x.id === l.qualificationId);
      return q ? { l, q, p: qualProgress(q, d.unitAchievements, l.id) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  for (const x of vet.filter((v) => v.p.eligible))
    out.push({
      id: `cert-${x.l.id}`,
      category: "Certification",
      severity: "info",
      title: personal ? "All units achieved — ready to certify" : `${x.l.name} — ready to certify`,
      desc: `${x.q.code} ${x.q.title}: core and electives complete.`,
      action: personal ? "See my qualification" : "Issue the certificate",
      to: "/app/college/qualifications",
    });
  if (personal)
    for (const x of vet.filter((v) => !v.p.eligible))
      out.push({
        id: `cert-p-${x.l.id}`,
        category: "Certification",
        severity: "info",
        title: `${x.p.pct}% of units achieved`,
        desc: `${x.q.title}: ${x.p.coreDone}/${x.p.coreTotal} core, ${x.p.electivesDone}/${x.p.electivesRequired} electives.`,
        action: "See my qualification",
        to: "/app/college/qualifications",
      });

  /* Institution-only */
  if (s.kind === "institution") {
    out.push(...vettingInsights(d));
    const a = admissionsInsight(d);
    if (a) out.push(a);
  }

  return out.sort((a, b) => sev[a.severity] - sev[b.severity]);
}

/* Staff vetting */
export function staffCompliance(d: PackData) {
  const soon = new Date(Date.parse(DEMO_TODAY + "T00:00:00Z") + 60 * 86400000)
    .toISOString()
    .slice(0, 10);
  const label = (k: string) => d.region.vettingChecks.find((c) => c.key === k)?.label ?? k;
  return d.vettingRecords
    .filter((v) => v.tenantId === d.tenantId)
    .map((v) => {
      const expired = v.checks.filter((c) => effectiveVettingStatus(c) === "Expired");
      const pending = v.checks.filter((c) => effectiveVettingStatus(c) === "Pending");
      const expiring = v.checks.filter(
        (c) => effectiveVettingStatus(c) === "Verified" && c.expires && c.expires <= soon,
      );
      const status = expired.length
        ? "Expired"
        : pending.length
          ? "Pending"
          : expiring.length
            ? "Expiring"
            : "Compliant";
      const note = [
        ...expired.map((c) => `${label(c.key)} expired ${c.expires ?? ""}`.trim()),
        ...pending.map((c) => `${label(c.key)} pending`),
        ...expiring.map((c) => `${label(c.key)} expires ${c.expires}`),
      ].join("; ");
      return { name: v.staffName, role: v.role, status, note };
    });
}

function vettingInsights(d: PackData): Insight[] {
  return staffCompliance(d)
    .filter((r) => r.status !== "Compliant")
    .map((r) => ({
      id: `vet-${r.name}`,
      category: "Staff vetting" as const,
      severity: r.status === "Expired" ? ("high" as const) : ("medium" as const),
      title: `${r.name} — check ${r.status.toLowerCase()}`,
      desc: `${r.note}.`,
      action: r.status === "Expired" ? "Remove from unsupervised duty" : "Chase the renewal",
      to: "/app/vetting",
    }));
}

/* Admissions */
const CONVERTED = ["Accepted", "Deposit paid", "Enrolled"];
export function admissionsFunnel(d: PackData) {
  const apps = d.applications.filter((a) => a.tenantId === d.tenantId);
  const stages = ADMISSION_PIPELINE.map((stage) => ({
    stage,
    count: apps.filter((a) => a.stage === stage).length,
  }));
  const applied = apps.filter((a) => a.stage !== "Enquiry").length;
  const converted = apps.filter((a) => CONVERTED.includes(a.stage)).length;
  return {
    total: apps.length,
    stages,
    applied,
    converted,
    offers: apps.filter((a) => a.stage === "Offer").length,
    enquiries: apps.filter((a) => a.stage === "Enquiry").length,
    waitlist: apps.filter((a) => a.stage === "Waitlist").length,
    lost: apps.filter((a) => a.stage === "Declined" || a.stage === "Withdrawn").length,
    conversionPct: applied ? Math.round((converted / applied) * 100) : 0,
  };
}

function admissionsInsight(d: PackData): Insight | null {
  const f = admissionsFunnel(d);
  if (!f.total) return null;
  return {
    id: "adm",
    category: "Admissions",
    severity: f.offers > 0 || f.conversionPct < 40 ? "medium" : "info",
    title: `${f.conversionPct}% of applicants accepted · ${f.offers} offer(s) awaiting reply`,
    desc: `${f.total} in the pipeline: ${f.enquiries} enquiries, ${f.converted} accepted or enrolled, ${f.lost} declined or withdrawn.`,
    action: f.offers ? "Chase open offers" : "Follow up enquiries",
    to: "/app/admissions",
  };
}

/* ── Report helpers ─────────────────────────────────────────────────────── */

/** "Year 10", "BSc Computer Science", "Diploma of IT" — what a learner is on. */
export function courseLabel(l: Learner, d: PackData): string {
  if (l.programmeId) return d.programmes.find((p) => p.id === l.programmeId)?.name ?? l.level;
  if (l.qualificationId)
    return d.qualifications.find((q) => q.id === l.qualificationId)?.title ?? l.level;
  return l.level;
}

/** One short result line per learner (age-appropriate). */
export function resultSummary(l: Learner, d: PackData): string {
  const band = bandOf(l);
  if (l.status === "Graduated") return l.level;
  if (band === "early") return "Learning journal";
  if (l.qualificationId) {
    const q = d.qualifications.find((x) => x.id === l.qualificationId);
    return q ? `${qualProgress(q, d.unitAchievements, l.id).pct}% of units` : "—";
  }
  if (l.programmeId) {
    const r = moduleResults(l, d);
    if (!r.length) return "No marks yet";
    const avg = Math.round(r.reduce((s, x) => s + x.mark, 0) / r.length);
    return `Avg ${avg}% over ${r.length} module(s)`;
  }
  const pr = d.progressReports.filter((r) => r.studentId === l.id);
  if (pr.length) {
    const below = belowTarget(l, d).length;
    return below ? `${below} of ${pr.length} below target` : `${pr.length} subject(s) on target`;
  }
  const ex = d.examEntries.filter((e) => e.studentId === l.id && e.predictedGrade);
  if (ex.length) return `Predicted ${ex.map((e) => e.predictedGrade).join(", ")}`;
  return "—";
}

/** Results distribution charts for the institution (one per assessment model). */
export function resultsDistribution(learners: Learner[], d: PackData) {
  const charts: { title: string; data: { name: string; value: number }[] }[] = [];
  const he = learners.filter((l) => l.programmeId).flatMap((l) => moduleResults(l, d));
  if (he.length) {
    const bands = [
      { name: "70+", min: 70 },
      { name: "60–69", min: 60 },
      { name: "50–59", min: 50 },
      { name: "40–49", min: 40 },
      { name: "<40", min: -1 },
    ];
    charts.push({
      title: "Module marks",
      data: bands.map((b, i) => ({
        name: b.name,
        value: he.filter((r) => r.mark >= b.min && (i === 0 || r.mark < bands[i - 1].min)).length,
      })),
    });
  }
  const ids = new Set(learners.map((l) => l.id));
  const pr = d.progressReports.filter((r) => ids.has(r.studentId));
  if (pr.length) {
    const cmp = (r: ProgressReport) => {
      const v = gradeRank(r.value);
      const t = gradeRank(r.target);
      if (v === undefined || t === undefined) return "No target";
      return v > t ? "Above target" : v === t ? "On target" : "Below target";
    };
    charts.push({
      title: "Progress against target",
      data: ["Above target", "On target", "Below target", "No target"].map((name) => ({
        name,
        value: pr.filter((r) => cmp(r) === name).length,
      })),
    });
  } else {
    const ex = d.examEntries.filter((e) => ids.has(e.studentId) && e.predictedGrade);
    if (ex.length) {
      const grades = [...new Set(ex.map((e) => e.predictedGrade!))].sort(
        (a, b) => (gradeRank(b) ?? 0) - (gradeRank(a) ?? 0),
      );
      charts.push({
        title: "Predicted grades (exam entries)",
        data: grades.map((g) => ({
          name: g,
          value: ex.filter((e) => e.predictedGrade === g).length,
        })),
      });
    }
  }
  const ua = d.unitAchievements.filter((u) => ids.has(u.studentId));
  if (ua.length) {
    const outcomes = [...new Set(ua.map((u) => u.outcome))];
    charts.push({
      title: "Unit outcomes",
      data: outcomes.map((o) => ({ name: o, value: ua.filter((u) => u.outcome === o).length })),
    });
  }
  return charts;
}

/* ── Hook: live pack data + the viewer's scope ──────────────────────────── */

export function usePackInsightsData() {
  const ctx = useTenantContext();
  const learners = useCollection("learners");
  const subjectClasses = useCollection("subjectClasses");
  const heModules = useCollection("heModules");
  const moduleRegistrations = useCollection("moduleRegistrations");
  const qualifications = useCollection("qualifications");
  const registerMarks = useCollection("registerMarks");
  const feeAccounts = useCollection("feeAccounts");
  const applications = useCollection("applications");
  const examEntries = useCollection("examEntries");
  const moduleMarks = useCollection("moduleMarks");
  const programmes = useCollection("programmes");
  const unitAchievements = useCollection("unitAchievements");
  const vettingRecords = useCollection("vettingRecords");
  const coursework = useCollection("coursework");
  const submissions = useCollection("submissions");
  const progressReports = useCollection("progressReports");
  return useMemo(() => {
    const groups = buildTeachingGroups({
      subjectClasses,
      heModules,
      moduleRegistrations,
      qualifications,
      learners,
    });
    const data: PackData = {
      tenantId: ctx.tenantId,
      tenantType: ctx.type,
      profile: ctx.profile,
      region: ctx.region,
      learners,
      groups,
      registerMarks,
      feeAccounts,
      applications,
      examEntries,
      heModules,
      moduleMarks,
      moduleRegistrations,
      programmes,
      qualifications,
      unitAchievements,
      vettingRecords,
      coursework: coursework ?? [],
      submissions: submissions ?? [],
      progressReports: progressReports ?? [],
    };
    const scope = scopeFor(ctx.user, data, {
      family: ctx.familyOperated,
      guardianName: ctx.guardianName,
    });
    return { ctx, data, scope };
  }, [
    ctx,
    learners,
    subjectClasses,
    heModules,
    moduleRegistrations,
    qualifications,
    registerMarks,
    feeAccounts,
    applications,
    examEntries,
    moduleMarks,
    programmes,
    unitAchievements,
    vettingRecords,
    coursework,
    submissions,
    progressReports,
  ]);
}

/** CSV text from rows (first row = header). */
export function toCsv(rows: (string | number | undefined)[][]): string {
  const esc = (v: string | number | undefined) => {
    const s = v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}
