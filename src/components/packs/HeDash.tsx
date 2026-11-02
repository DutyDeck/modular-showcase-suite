/**
 * Higher Education Pack (+ College add-on) dashboards, plus `useHeData` — the
 * tenant-scoped view of every HE / college collection the pack screens share.
 */
import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  HardHat,
  Inbox,
  LifeBuoy,
  ListChecks,
  Plane,
  Scale,
  ShieldAlert,
  Users,
  Award,
  Stethoscope,
} from "lucide-react";
import { Section, StatCard, Badge } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { StatusPill } from "@/components/packs/PackUI";
import { useCollection } from "@/lib/store";
import { useTenantContext } from "@/lib/packs/registry";
import { currentTerm, DEMO_TODAY } from "@/lib/packs/foundationData";
import { codeSetById } from "@/lib/packs/regions";
import {
  moduleOutcome,
  qualProgress,
  stageIndexFor,
  NEXT_BOARDS,
  type HeModule,
  type Programme,
} from "@/lib/packs/heData";

/* ── Shared data hook ────────────────────────────────────────────────────── */

export function useHeData() {
  const ctx = useTenantContext();
  const t = ctx.tenantId;
  const programmesAll = useCollection("programmes");
  const modulesAll = useCollection("heModules");
  const regsAll = useCollection("moduleRegistrations");
  const marksAll = useCollection("moduleMarks");
  const ecsAll = useCollection("ecClaims");
  const decisionsAll = useCollection("boardDecisions");
  const learnersAll = useCollection("learners");
  const calendarsAll = useCollection("academicCalendars");
  const qualsAll = useCollection("qualifications");
  const unitsAll = useCollection("unitAchievements");
  const apprAll = useCollection("apprenticeships");
  const plcAll = useCollection("placements");

  return useMemo(() => {
    const by = <T extends { tenantId: string }>(rows: T[]) => rows.filter((r) => r.tenantId === t);
    const programmes = by(programmesAll);
    const modules = by(modulesAll);
    const learners = by(learnersAll);
    const calendars = by(calendarsAll);
    const defaultCal = calendars.find((c) => c.isDefault) ?? calendars[0];
    const academicYear = defaultCal?.academicYear ?? "2026/27";
    const me =
      ctx.user?.role === "student" ? learners.find((l) => l.id === ctx.user?.oneEduId) : undefined;
    const name = (id: string) => learners.find((l) => l.id === id)?.name ?? id;
    const moduleById = (id: string) => modules.find((m) => m.id === id);
    const moduleByCode = (code: string) => modules.find((m) => m.code === code);
    const programmeById = (id?: string) => programmes.find((p) => p.id === id);
    const myModules: HeModule[] =
      ctx.user?.role === "teacher" ? modules.filter((m) => m.leader === ctx.user?.name) : [];
    return {
      ctx,
      tenantId: t,
      programmes,
      modules,
      regs: by(regsAll),
      marks: by(marksAll),
      ecs: by(ecsAll),
      decisions: by(decisionsAll),
      learners,
      calendars,
      defaultCal,
      academicYear,
      quals: by(qualsAll),
      units: by(unitsAll),
      apprenticeships: by(apprAll),
      placements: by(plcAll),
      me,
      myModules,
      name,
      moduleById,
      moduleByCode,
      programmeById,
    };
  }, [
    ctx,
    t,
    programmesAll,
    modulesAll,
    regsAll,
    marksAll,
    ecsAll,
    decisionsAll,
    learnersAll,
    calendarsAll,
    qualsAll,
    unitsAll,
    apprAll,
    plcAll,
  ]);
}

export type HeData = ReturnType<typeof useHeData>;

/** Has a learner passed the module with this code (any attempt)? */
export function passedCode(d: HeData, studentId: string, code: string, programme?: Programme) {
  const m = d.moduleByCode(code);
  if (!m) return false;
  return moduleOutcome(m, d.marks, studentId, programme?.passMark ?? 40).passed;
}

/** Component groups whose marks are still provisional (awaiting moderation). */
export function provisionalGroups(d: HeData) {
  const groups = new Map<
    string,
    { mod: HeModule; componentId: string; year: string; count: number }
  >();
  for (const m of d.marks) {
    if (m.status !== "Provisional" || m.mark === undefined) continue;
    const mod = d.moduleById(m.moduleId);
    if (!mod) continue;
    const key = `${m.moduleId}|${m.componentId}|${m.academicYear ?? ""}`;
    const g = groups.get(key) ?? {
      mod,
      componentId: m.componentId,
      year: m.academicYear ?? "",
      count: 0,
    };
    g.count++;
    groups.set(key, g);
  }
  return Array.from(groups.values());
}

export const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

/** A row with an icon + label + value, linking somewhere. */
function QueueRow({
  to,
  icon,
  label,
  value,
  tone = "default",
}: {
  to: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: "default" | "warning" | "destructive" | "success" | "info" | "muted";
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
    >
      <span className="flex items-center gap-2.5 text-sm min-w-0">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <Badge tone={tone}>{value}</Badge>
    </Link>
  );
}

function Bar({ value, max, tone = "bg-primary" }: { value: number; max: number; tone?: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Registrar (university + college) ────────────────────────────────────── */

export function RegistrarDash() {
  const d = useHeData();
  const college = d.ctx.packs.has("college");
  const active = d.learners.filter((l) => l.status === "Active");
  const pendingRegs = d.regs.filter((r) => r.status === "Pending approval");
  const provisional = provisionalGroups(d);
  const openEcs = d.ecs.filter(
    (e) => e.status === "Submitted" || e.status === "More evidence needed",
  );
  const sponsored = d.learners.filter((l) => l.visa?.sponsored);
  const unratified = d.decisions.filter((x) => !x.ratified);
  const board = NEXT_BOARDS[d.tenantId];

  const headcount = d.programmes.map((p) => {
    const rows = d.learners.filter((l) => l.programmeId === p.id);
    return {
      p,
      total: rows.length,
      active: rows.filter((l) => l.status === "Active").length,
      interrupted: rows.filter((l) => l.status === "Interrupted").length,
      byStage: p.stages.map((s) => rows.filter((l) => l.level === s.name).length),
    };
  });

  const qualRows = d.quals.map((q) => {
    const rows = d.learners.filter((l) => l.qualificationId === q.id);
    const eligible = rows.filter((l) => qualProgress(q, d.units, l.id).eligible).length;
    return { q, total: rows.length, eligible };
  });
  const unitsInProgress = d.units.filter((u) => u.outcome === "In progress").length;
  const nearGateway = d.apprenticeships.filter(
    (a) => a.status === "Gateway" || a.status === "EPA booked",
  );
  const plcActive = d.placements.filter((p) => p.status === "In progress");
  const eligibleTotal = qualRows.reduce((s, r) => s + r.eligible, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Active students"
          value={active.length}
          hint={`${d.learners.length} on record`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Registrations pending"
          value={pendingRegs.length}
          hint="Optional modules"
          icon={<ListChecks className="h-4 w-4" />}
          accent="warning"
        />
        <StatCard
          label="Awaiting moderation"
          value={provisional.length}
          hint="Assessment components"
          icon={<Scale className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Open EC claims"
          value={openEcs.length}
          hint="Panel decision needed"
          icon={<LifeBuoy className="h-4 w-4" />}
          accent={openEcs.length ? "destructive" : "success"}
        />
        <StatCard
          label="Visa-sponsored"
          value={sponsored.length}
          hint={d.ctx.region.visaMonitoring?.body ?? "Sponsor duties"}
          icon={<Plane className="h-4 w-4" />}
          accent="primary"
        />
      </div>

      {college && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Apprentices at gateway / EPA"
            value={nearGateway.length}
            hint={`${d.apprenticeships.length} apprenticeships`}
            icon={<HardHat className="h-4 w-4" />}
            accent="warning"
          />
          <StatCard
            label="Placements in progress"
            value={plcActive.length}
            hint={`${d.placements.length} arranged in total`}
            icon={<Stethoscope className="h-4 w-4" />}
            accent="info"
          />
          <StatCard
            label="Units awaiting assessment"
            value={unitsInProgress}
            hint="Outcome “In progress”"
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
          <StatCard
            label="Eligible for certification"
            value={eligibleTotal}
            hint="All core + electives"
            icon={<Award className="h-4 w-4" />}
            accent="success"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section
          title="Headcount by programme"
          description="Students on record by stage"
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            {headcount.map(({ p, total, active: act, interrupted, byStage }) => (
              <div key={p.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <Link to="/app/he/programmes" className="font-medium hover:underline truncate">
                    {p.award} {p.name}
                  </Link>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {act} active{interrupted ? ` · ${interrupted} interrupted` : ""}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.stages.map((s, i) => (
                    <span
                      key={s.name}
                      className="text-[11px] rounded-md border px-2 py-0.5 bg-muted/30"
                    >
                      {s.name}: <span className="font-semibold">{byStage[i]}</span>
                    </span>
                  ))}
                  <span className="text-[11px] text-muted-foreground px-1 py-0.5">
                    Total {total}
                  </span>
                </div>
              </div>
            ))}
            {college &&
              qualRows.map(({ q, total, eligible }) => (
                <div key={q.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link to="/app/college/qualifications" className="truncate hover:underline">
                    <span className="font-mono text-xs text-muted-foreground mr-1.5">{q.code}</span>
                    {q.title}
                  </Link>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {total} learners{eligible ? ` · ${eligible} eligible` : ""}
                  </span>
                </div>
              ))}
          </div>
        </Section>

        <div className="space-y-4">
          <Section title="Where we are">
            <div className="space-y-3">
              {d.calendars.map((c) => {
                const term = currentTerm(c);
                return (
                  <div key={c.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate">{c.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground ml-6">
                      {term ? `${term.name} · until ${fmtDate(term.end)}` : "Between periods"}
                    </div>
                  </div>
                );
              })}
              {board && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Next board
                  </div>
                  <div className="font-medium">{board.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(board.date)}</div>
                </div>
              )}
            </div>
          </Section>
          <Section title="Action queue">
            <div className="space-y-2">
              <QueueRow
                to="/app/he/registration"
                icon={<ListChecks className="h-4 w-4" />}
                label="Approve module choices"
                value={pendingRegs.length}
                tone={pendingRegs.length ? "warning" : "success"}
              />
              <QueueRow
                to="/app/he/assessment"
                icon={<LifeBuoy className="h-4 w-4" />}
                label="Decide EC claims"
                value={openEcs.length}
                tone={openEcs.length ? "destructive" : "success"}
              />
              <QueueRow
                to="/app/he/assessment"
                icon={<Scale className="h-4 w-4" />}
                label="Ratify board decisions"
                value={unratified.length}
                tone={unratified.length ? "warning" : "success"}
              />
              {college && (
                <QueueRow
                  to="/app/college/work-based"
                  icon={<HardHat className="h-4 w-4" />}
                  label="Placements without risk assessment"
                  value={d.placements.filter((p) => !p.riskAssessed).length}
                  tone="info"
                />
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ── Lecturer ────────────────────────────────────────────────────────────── */

export function LecturerDash() {
  const d = useHeData();
  const mine = d.myModules;
  const rows = mine.map((m) => {
    const enrolled = d.regs.filter(
      (r) => r.moduleId === m.id && r.status === "Registered" && r.academicYear === d.academicYear,
    );
    const dueComps = m.components.filter((c) => c.due <= DEMO_TODAY);
    let outstanding = 0;
    for (const c of dueComps) {
      for (const r of enrolled) {
        const has = d.marks.some(
          (x) =>
            x.studentId === r.studentId &&
            x.moduleId === m.id &&
            x.componentId === c.id &&
            x.mark !== undefined,
        );
        if (!has) outstanding++;
      }
    }
    return {
      m,
      enrolled: enrolled.length,
      outstanding,
      next: m.components.find((c) => c.due > DEMO_TODAY),
    };
  });
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const moderation = provisionalGroups(d).filter((g) => g.mod.leader !== d.ctx.user?.name);
  const myIds = new Set(mine.map((m) => m.id));
  const ecAffected = d.ecs.filter((e) => myIds.has(e.moduleId));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="My modules"
          value={mine.length}
          hint={`${d.academicYear}`}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          label="Marking outstanding"
          value={totalOutstanding}
          hint="Scripts past due date"
          icon={<ClipboardCheck className="h-4 w-4" />}
          accent={totalOutstanding ? "warning" : "success"}
        />
        <StatCard
          label="Moderation tasks"
          value={moderation.length}
          hint="As second marker"
          icon={<Scale className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="EC-affected students"
          value={ecAffected.length}
          hint="On my modules"
          icon={<LifeBuoy className="h-4 w-4" />}
          accent="destructive"
        />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section title="My modules" description="Module leader view" className="lg:col-span-2">
          <div className="space-y-3">
            {rows.map(({ m, enrolled, outstanding, next }) => (
              <div key={m.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">
                        {m.code}
                      </span>
                      {m.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.level} · {m.credits} credits · {m.semester} · {enrolled} registered
                    </div>
                  </div>
                  {outstanding > 0 ? (
                    <Badge tone="warning">{outstanding} to mark</Badge>
                  ) : (
                    <Badge tone="success">Up to date</Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.components.map((c) => (
                    <span key={c.id} className="text-[11px] rounded-md bg-muted px-2 py-0.5">
                      {c.name} {c.weight}% · {fmtDate(c.due)}
                    </span>
                  ))}
                </div>
                {next && (
                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    Next deadline: {next.name}, {fmtDate(next.due)}
                  </div>
                )}
              </div>
            ))}
            {!rows.length && (
              <div className="text-sm text-muted-foreground">
                You don't lead any modules this year.
              </div>
            )}
          </div>
        </Section>
        <div className="space-y-4">
          <Section title="Second-marking">
            <div className="space-y-2">
              {moderation.map((g) => (
                <QueueRow
                  key={`${g.mod.id}${g.componentId}`}
                  to="/app/he/assessment"
                  icon={<Scale className="h-4 w-4" />}
                  label={`${g.mod.code} · ${g.mod.components.find((c) => c.id === g.componentId)?.name ?? g.componentId}`}
                  value={`${g.count} scripts`}
                  tone="info"
                />
              ))}
              {!moderation.length && (
                <div className="text-xs text-muted-foreground">Nothing waiting.</div>
              )}
            </div>
          </Section>
          <Section title="Extenuating circumstances">
            <div className="space-y-2">
              {ecAffected.map((e) => (
                <div key={e.id} className="flex items-center gap-2.5 text-sm">
                  <Avatar name={d.name(e.studentId)} seed={e.studentId} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{d.name(e.studentId)}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {d.moduleById(e.moduleId)?.code} · {e.outcome ?? e.category}
                    </div>
                  </div>
                  <StatusPill status={e.status} />
                </div>
              ))}
              {!ecAffected.length && (
                <div className="text-xs text-muted-foreground">No claims on your modules.</div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ── Student ─────────────────────────────────────────────────────────────── */

export function HeStudentDash() {
  const d = useHeData();
  const me = d.me;
  const engagement = useCollection("registerMarks");
  if (!me) {
    return (
      <div className="text-sm text-muted-foreground">No student record linked to this account.</div>
    );
  }
  const programme = d.programmeById(me.programmeId);
  const stage = programme ? programme.stages[stageIndexFor(programme, me.level)] : undefined;
  const myRegs = d.regs.filter((r) => r.studentId === me.id && r.academicYear === d.academicYear);
  const registered = myRegs.filter((r) => r.status === "Registered");
  const pending = myRegs.filter((r) => r.status === "Pending approval");
  const credits = registered.reduce((s, r) => s + (d.moduleById(r.moduleId)?.credits ?? 0), 0);
  const cal = d.calendars.find((c) => c.id === me.calendarId) ?? d.defaultCal;
  const term = cal ? currentTerm(cal) : undefined;
  const results = d.modules
    .filter((m) =>
      d.marks.some((x) => x.studentId === me.id && x.moduleId === m.id && x.mark !== undefined),
    )
    .map((m) => ({ m, o: moduleOutcome(m, d.marks, me.id, programme?.passMark ?? 40) }));
  const myEcs = d.ecs.filter((e) => e.studentId === me.id);
  const myPoints = engagement.filter((r) => r.studentId === me.id);
  const codeSet = codeSetById(d.ctx.profile?.codeSetId ?? "he-engagement");
  const missed = myPoints.filter(
    (r) => codeSet.codes.find((c) => c.code === r.code)?.meaning === "unauthorised",
  ).length;
  const visa = d.ctx.region.visaMonitoring;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Programme"
          value={programme ? `${programme.award}` : "—"}
          hint={programme?.name}
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatCard
          label="Stage"
          value={me.level}
          hint={term ? `${term.name} now` : cal?.name}
          icon={<CalendarClock className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Credits registered"
          value={`${credits}/${stage?.credits ?? "—"}`}
          hint={pending.length ? `${pending.length} awaiting approval` : "All approved"}
          icon={<ListChecks className="h-4 w-4" />}
          accent={stage && credits < stage.credits ? "warning" : "success"}
        />
        <StatCard
          label="EC claims"
          value={myEcs.length}
          hint={
            myEcs.filter((e) => e.status === "Submitted").length ? "Decision pending" : "None open"
          }
          icon={<LifeBuoy className="h-4 w-4" />}
          accent="primary"
        />
      </div>

      {me.visa?.sponsored && visa && (
        <div className="rounded-xl border border-info/30 bg-info/5 p-4 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-info shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Your study is sponsored under the {visa.body}</div>
            <p className="text-muted-foreground text-xs mt-0.5">
              {visa.rule}. Attending your timetabled sessions keeps your record healthy — if
              something is stopping you, talk to Student Support early.
            </p>
            {myPoints.length > 0 && (
              <div className="text-xs mt-1.5">
                Engagement recorded this term:{" "}
                <span className="font-semibold">{myPoints.length - missed}</span> of{" "}
                {myPoints.length} points{missed ? ` · ${missed} missed` : ""}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section
          title="My modules this year"
          description={`${d.academicYear} · ${stage?.name ?? ""}`}
          className="lg:col-span-2"
          actions={
            <Link to="/app/he/registration" className="text-xs text-primary hover:underline">
              Choose options →
            </Link>
          }
        >
          <div className="space-y-2">
            {myRegs
              .filter((r) => r.status !== "Withdrawn")
              .map((r) => {
                const m = d.moduleById(r.moduleId);
                if (!m) return null;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm truncate">
                        <span className="font-mono text-xs text-muted-foreground mr-1.5">
                          {m.code}
                        </span>
                        {m.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.kind} · {m.credits} credits · {m.semester} · {m.leader}
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                );
              })}
          </div>
        </Section>
        <div className="space-y-4">
          <Section
            title="Results so far"
            actions={
              <Link to="/app/he/transcripts" className="text-xs text-primary hover:underline">
                Transcript →
              </Link>
            }
          >
            <div className="space-y-2.5">
              {results.slice(-6).map(({ m, o }) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      <span className="font-mono text-xs text-muted-foreground mr-1">{m.code}</span>
                      {m.title}
                    </span>
                    <span className="font-semibold shrink-0 ml-2">
                      {o.mark ?? "—"}
                      {!o.complete && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {" "}
                          (partial)
                        </span>
                      )}
                    </span>
                  </div>
                  <Bar
                    value={o.mark ?? 0}
                    max={100}
                    tone={o.passed || !o.complete ? "bg-primary" : "bg-destructive"}
                  />
                </div>
              ))}
              {!results.length && (
                <div className="text-xs text-muted-foreground">No marks released yet.</div>
              )}
            </div>
          </Section>
          <Section
            title="Extenuating circumstances"
            actions={
              <Link to="/app/he/assessment" className="text-xs text-primary hover:underline">
                Submit a claim →
              </Link>
            }
          >
            {myEcs.length ? (
              <div className="space-y-2">
                {myEcs.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate">
                      {d.moduleById(e.moduleId)?.code} · {e.category}
                    </span>
                    <StatusPill status={e.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Inbox className="h-4 w-4" /> No claims. If illness or a crisis affects an
                assessment, submit one before the deadline.
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
