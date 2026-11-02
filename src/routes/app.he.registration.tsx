import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ListChecks,
  Lock,
  Search,
  UserPlus,
  Users,
  UsersRound,
  XCircle,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  Button,
  FormDialog,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { PackContextBar, PackEmpty, StatusPill } from "@/components/packs/PackUI";
import { useHeData, passedCode, fmtDate, type HeData } from "@/components/packs/HeDash";
import { addItem, nextId, removeItem, updateItem } from "@/lib/store";
import {
  stageIndexFor,
  type HeModule,
  type ModuleRegistration,
  type ProgrammeStage,
} from "@/lib/packs/heData";
import type { Learner } from "@/lib/packs/foundationData";
import { periodOnCalendar, type HeModule as RunModule } from "@/lib/packs/heData";
import { useCollection as useRunCollection } from "@/lib/store";
import { logChange, notify } from "@/lib/packs/sis/activity";

export const Route = createFileRoute("/app/he/registration")({
  head: () => ({ meta: [{ title: "Module Registration — 1StudentID" }] }),
  component: RegistrationPage,
});

function RegistrationPage() {
  const d = useHeData();
  const role = d.ctx.user?.role;
  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "student" ? "My Modules" : "Module Registration"}
        subtitle={
          role === "student"
            ? `Choose your optional modules for ${d.academicYear}. Core modules are registered for you.`
            : `Optional-module choices for ${d.academicYear} — prerequisites, credit rules and capacity are checked automatically.`
        }
      />
      <PackContextBar pack="higher-ed" />
      {d.programmes.length === 0 ? (
        <PackEmpty
          pack="higher-ed"
          title="No programmes configured"
          body="Set up programmes and modules first — registration opens per stage once modules are attached."
        />
      ) : role === "student" ? (
        d.me ? (
          <StudentChooser me={d.me} />
        ) : (
          <div className="text-sm text-muted-foreground">
            No student record is linked to this account.
          </div>
        )
      ) : (
        <AdminRegistration />
      )}
    </div>
  );
}

/* ── Rules ───────────────────────────────────────────────────────────────── */

interface Eligibility {
  ok: boolean;
  reason?: string;
  prereqs: { code: string; passed: boolean }[];
}

function registeredCount(d: HeData, moduleId: string) {
  return d.regs.filter(
    (r) =>
      r.moduleId === moduleId && r.status === "Registered" && r.academicYear === d.academicYear,
  ).length;
}

function eligibility(d: HeData, me: Learner, m: HeModule, creditsLeft: number): Eligibility {
  const programme = d.programmeById(me.programmeId);
  const prereqs = m.prerequisites.map((code) => ({
    code,
    passed: passedCode(d, me.id, code, programme),
  }));
  const missing = prereqs.filter((p) => !p.passed);
  if (missing.length)
    return {
      ok: false,
      reason: `Prerequisite ${missing.map((p) => p.code).join(", ")} not passed`,
      prereqs,
    };
  if (registeredCount(d, m.id) >= m.capacity) return { ok: false, reason: "Module full", prereqs };
  if (m.credits > creditsLeft)
    return { ok: false, reason: `Exceeds your remaining ${creditsLeft} optional credits`, prereqs };
  return { ok: true, prereqs };
}

/* ── Admin rules (register on behalf, move, cohort) ──────────────────────── */

const isLive = (r: ModuleRegistration) =>
  r.status === "Registered" || r.status === "Pending approval";

function stageOf(d: HeData, l: Learner) {
  const p = d.programmeById(l.programmeId);
  if (!p) return { p: undefined, stage: undefined as ProgrammeStage | undefined };
  return { p, stage: p.stages[stageIndexFor(p, l.level)] };
}

/** Optional credits the student can still take on their current stage. */
function optionalCreditsLeft(d: HeData, l: Learner, stage: ProgrammeStage, ignoreRegId?: string) {
  const used = d.regs
    .filter(
      (r) =>
        r.studentId === l.id &&
        r.academicYear === d.academicYear &&
        r.id !== ignoreRegId &&
        isLive(r) &&
        stage.optionalModuleIds.includes(r.moduleId),
    )
    .reduce((a, r) => a + (d.moduleById(r.moduleId)?.credits ?? 0), 0);
  return Math.max(0, stage.optionalCreditsRequired - used);
}

interface Check {
  label: string;
  ok: boolean;
  /** Can't be overridden (e.g. a duplicate registration). */
  hard?: boolean;
}

/** Checks for an admin registering `l` on `m` — same rules students face, plus stage fit. */
function adminChecks(d: HeData, l: Learner, m: HeModule, ignoreRegId?: string): Check[] {
  const { p, stage } = stageOf(d, l);
  const dup = d.regs.some(
    (r) =>
      r.studentId === l.id &&
      r.moduleId === m.id &&
      r.academicYear === d.academicYear &&
      r.id !== ignoreRegId &&
      isLive(r),
  );
  const checks: Check[] = [
    { label: dup ? "Already registered" : "Not yet registered", ok: !dup, hard: true },
  ];
  const inStage =
    !!stage && (stage.coreModuleIds.includes(m.id) || stage.optionalModuleIds.includes(m.id));
  checks.push({
    label: inStage ? `Part of ${stage!.name}` : "Not in the student's current stage",
    ok: inStage,
  });
  const missing = m.prerequisites.filter((c) => !passedCode(d, l.id, c, p));
  checks.push({
    label: missing.length ? `Prerequisite ${missing.join(", ")} not passed` : "Prerequisites met",
    ok: !missing.length,
  });
  const n = registeredCount(d, m.id);
  checks.push({
    label: n >= m.capacity ? `Module full (${n}/${m.capacity})` : `${n}/${m.capacity} places`,
    ok: n < m.capacity,
  });
  if (stage?.optionalModuleIds.includes(m.id)) {
    const left = optionalCreditsLeft(d, l, stage, ignoreRegId);
    checks.push({
      label:
        m.credits > left
          ? `Over the optional credit limit (${left} left, module is ${m.credits})`
          : `Within optional credits (${left} left)`,
      ok: m.credits <= left,
    });
  }
  return checks;
}

function ChecksList({ checks }: { checks: Check[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {checks.map((c) => (
        <Badge key={c.label} tone={c.ok ? "success" : c.hard ? "destructive" : "warning"}>
          {c.ok ? "✓" : "✗"} {c.label}
        </Badge>
      ))}
    </div>
  );
}

function regLog(
  d: HeData,
  r: { id: string; studentId: string },
  field: string,
  from: string | undefined,
  to: string | undefined,
  reason?: string,
) {
  logChange({
    tenantId: d.tenantId,
    entity: "moduleRegistration",
    entityId: r.id,
    studentId: r.studentId,
    field,
    from,
    to,
    by: d.ctx.actingAs || "Registry",
    reason,
  });
}

function tellStudent(d: HeData, studentId: string, subject: string, body?: string) {
  const l = d.learners.find((x) => x.id === studentId);
  notify({
    tenantId: d.tenantId,
    channel: "Email",
    to: l ? `${l.name} (${l.email})` : studentId,
    subject,
    body,
    source: "Module registration",
    relatedId: studentId,
  });
}

/* ── Student ─────────────────────────────────────────────────────────────── */

function StudentChooser({ me }: { me: Learner }) {
  const d = useHeData();
  const programme = d.programmeById(me.programmeId);
  if (!programme)
    return (
      <div className="text-sm text-muted-foreground">
        You aren't on a programme with module choices.
      </div>
    );
  const stage = programme.stages[stageIndexFor(programme, me.level)];
  const mine = d.regs.filter((r) => r.studentId === me.id && r.academicYear === d.academicYear);
  const regFor = (id: string) => mine.find((r) => r.moduleId === id && r.status !== "Withdrawn");
  const core = stage.coreModuleIds.map(d.moduleById).filter((m): m is HeModule => !!m);
  const opts = stage.optionalModuleIds.map(d.moduleById).filter((m): m is HeModule => !!m);
  const credit = (status: ModuleRegistration["status"]) =>
    opts.filter((m) => regFor(m.id)?.status === status).reduce((a, m) => a + m.credits, 0);
  const optRegistered = credit("Registered");
  const optPending = credit("Pending approval");
  const creditsLeft = Math.max(0, stage.optionalCreditsRequired - optRegistered - optPending);
  const coreCredits = core.reduce((a, m) => a + m.credits, 0);

  const request = (m: HeModule) => {
    const id = nextId("REG-", "moduleRegistrations");
    regLog(d, { id, studentId: me.id }, "Module registration", undefined, `Requested ${m.code}`);
    addItem("moduleRegistrations", {
      id,
      tenantId: d.tenantId,
      studentId: me.id,
      moduleId: m.id,
      academicYear: d.academicYear,
      kind: "Optional",
      status: "Pending approval",
      at: new Date().toISOString(),
    });
    toast.success(`${m.code} requested — your programme team will approve it`);
  };
  const withdraw = (r: ModuleRegistration) => {
    updateItem("moduleRegistrations", (x) => x.id === r.id, { status: "Withdrawn" });
    regLog(d, r, "Module registration", "Pending approval", "Request withdrawn by student");
    toast(`Request for ${d.moduleById(r.moduleId)?.code} withdrawn`);
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Stage"
          value={stage.name}
          hint={`${programme.award} ${programme.name}`}
          icon={<ListChecks className="h-4 w-4" />}
        />
        <StatCard
          label="Core credits"
          value={coreCredits}
          hint="Registered automatically"
          icon={<Lock className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Optional credits"
          value={`${optRegistered + optPending}/${stage.optionalCreditsRequired}`}
          hint={optPending ? `${optPending} awaiting approval` : "Approved"}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Still to choose"
          value={creditsLeft}
          hint="Optional credits"
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={creditsLeft ? "warning" : "success"}
        />
      </div>

      <Section title="Core modules" description="Compulsory for your stage">
        <div className="grid sm:grid-cols-3 gap-2">
          {core.map((m) => (
            <div key={m.id} className="rounded-lg border p-3 text-sm">
              <div className="font-mono text-[11px] text-muted-foreground">{m.code}</div>
              <div className="font-medium">{m.title}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {m.credits} credits · {m.leader}
                <RunLine m={m} calendarId={me.calendarId} />
              </div>
              <div className="mt-2">
                <StatusPill status={regFor(m.id)?.status ?? "Registered"} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Optional modules"
        description={`Choose ${stage.optionalCreditsRequired} credits. Requests go to your programme team for approval.`}
      >
        <div className="grid md:grid-cols-2 gap-3">
          {opts.map((m) => {
            const r = regFor(m.id);
            const e = eligibility(d, me, m, creditsLeft);
            const filled = registeredCount(d, m.id);
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-4 ${r?.status === "Registered" ? "border-success/40 bg-success/5" : "bg-card"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-muted-foreground">{m.code}</div>
                    <div className="font-medium">{m.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {m.credits} credits · {m.leader}
                      <RunLine m={m} calendarId={me.calendarId} />
                    </div>
                  </div>
                  {r && <StatusPill status={r.status} />}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  {e.prereqs.map((p) => (
                    <span
                      key={p.code}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${p.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
                    >
                      {p.passed ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {p.code}
                    </span>
                  ))}
                  <span
                    className={`rounded px-1.5 py-0.5 ${filled >= m.capacity ? "bg-destructive/15 text-destructive" : "bg-muted"}`}
                  >
                    {filled}/{m.capacity} places
                  </span>
                  {m.components.map((c) => (
                    <span key={c.id} className="rounded bg-muted px-1.5 py-0.5">
                      {c.name} {c.weight}%
                    </span>
                  ))}
                </div>
                {r?.status === "Rejected" && r.note && (
                  <div className="text-xs text-destructive mt-2">{r.note}</div>
                )}
                <div className="mt-3">
                  {!r || r.status === "Rejected" ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" disabled={!e.ok} onClick={() => request(m)}>
                        Request module
                      </Button>
                      {!e.ok && (
                        <span className="text-[11px] text-muted-foreground">{e.reason}</span>
                      )}
                    </div>
                  ) : r.status === "Pending approval" ? (
                    <Button size="sm" variant="outline" onClick={() => withdraw(r)}>
                      Withdraw request
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

/* ── Admin / staff ───────────────────────────────────────────────────────── */

function AdminRegistration() {
  const d = useHeData();
  const admin = d.ctx.isAdmin;
  const [rejecting, setRejecting] = useState<ModuleRegistration | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cohortOpen, setCohortOpen] = useState(false);
  const year = d.regs.filter((r) => r.academicYear === d.academicYear);
  const pending = year.filter((r) => r.status === "Pending approval");
  const yearModules = d.modules.filter((m) => year.some((r) => r.moduleId === m.id));
  const full = yearModules.filter((m) => registeredCount(d, m.id) >= m.capacity);

  // Students whose optional credits (registered + pending) fall short of the stage rule.
  const under = d.learners
    .filter((l) => l.status === "Active" && l.programmeId)
    .map((l) => {
      const p = d.programmeById(l.programmeId)!;
      if (!p) return null;
      const st = p.stages[stageIndexFor(p, l.level)];
      if (!st || !st.optionalCreditsRequired) return null;
      const chosen = year
        .filter(
          (r) =>
            r.studentId === l.id &&
            st.optionalModuleIds.includes(r.moduleId) &&
            (r.status === "Registered" || r.status === "Pending approval"),
        )
        .reduce((a, r) => a + (d.moduleById(r.moduleId)?.credits ?? 0), 0);
      return chosen < st.optionalCreditsRequired
        ? { l, chosen, need: st.optionalCreditsRequired }
        : null;
    })
    .filter((x): x is { l: Learner; chosen: number; need: number } => !!x);

  const approve = (r: ModuleRegistration) => {
    const m = d.moduleById(r.moduleId);
    if (m && registeredCount(d, m.id) >= m.capacity) {
      toast.warning(`${m.code} is at capacity — approved as an over-allocation`);
    } else {
      toast.success(`${d.name(r.studentId)} registered on ${m?.code}`);
    }
    updateItem("moduleRegistrations", (x) => x.id === r.id, { status: "Registered" });
    regLog(d, r, "Module registration", "Pending approval", `Registered on ${m?.code}`);
    tellStudent(d, r.studentId, `You've been registered on ${m?.code} ${m?.title ?? ""}`.trim());
  };

  const me = (id: string) => d.learners.find((l) => l.id === id);

  return (
    <>
      {admin && (
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={() => setCohortOpen(true)}>
            <UsersRound className="h-4 w-4" /> Register cohort
          </Button>
          <Button onClick={() => setRegisterOpen(true)}>
            <UserPlus className="h-4 w-4" /> Register a student
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Awaiting approval"
          value={pending.length}
          icon={<ListChecks className="h-4 w-4" />}
          accent="warning"
        />
        <StatCard
          label="Registered"
          value={year.filter((r) => r.status === "Registered").length}
          hint={d.academicYear}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Modules at capacity"
          value={full.length}
          icon={<Lock className="h-4 w-4" />}
          accent={full.length ? "destructive" : "success"}
        />
        <StatCard
          label="Under-registered students"
          value={under.length}
          hint="Short of optional credits"
          icon={<Users className="h-4 w-4" />}
          accent="info"
        />
      </div>

      {admin && (
        <Section
          title="Approval queue"
          description="Prerequisites and capacity re-checked at approval time"
        >
          <DataTable
            columns={[
              { key: "student", label: "Student" },
              { key: "module", label: "Module" },
              { key: "checks", label: "Checks" },
              { key: "at", label: "Requested" },
              { key: "_actions", label: "", className: "text-right" },
            ]}
            rows={pending}
            emptyText="No pending requests — every choice is decided."
            renderCell={(r: ModuleRegistration, key) => {
              const m = d.moduleById(r.moduleId);
              const l = me(r.studentId);
              if (key === "student")
                return (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={d.name(r.studentId)} seed={r.studentId} size={30} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name(r.studentId)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.studentId} · {l?.level}
                      </div>
                    </div>
                  </div>
                );
              if (key === "module")
                return (
                  <div>
                    <span className="font-mono text-[11px] text-muted-foreground mr-1">
                      {m?.code}
                    </span>
                    {m?.title}
                    <div className="text-[11px] text-muted-foreground">{m?.credits} credits</div>
                  </div>
                );
              if (key === "checks") {
                if (!m || !l) return null;
                const p = d.programmeById(l.programmeId);
                const prereqOk = m.prerequisites.every((c) => passedCode(d, l.id, c, p));
                const n = registeredCount(d, m.id);
                return (
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={prereqOk ? "success" : "destructive"}>
                      {prereqOk ? "Prerequisites met" : "Prerequisite missing"}
                    </Badge>
                    <Badge tone={n >= m.capacity ? "destructive" : "muted"}>
                      {n}/{m.capacity}
                    </Badge>
                  </div>
                );
              }
              if (key === "at") return fmtDate(r.at);
              if (key === "_actions")
                return (
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" onClick={() => approve(r)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>
                      Reject
                    </Button>
                  </div>
                );
            }}
          />
        </Section>
      )}

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Section title="Module fill" description={`Registered vs capacity · ${d.academicYear}`}>
          <div className="space-y-2.5">
            {yearModules.map((m) => {
              const n = registeredCount(d, m.id);
              const p = year.filter(
                (r) => r.moduleId === m.id && r.status === "Pending approval",
              ).length;
              const pct = Math.min(100, Math.round((n / m.capacity) * 100));
              return (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">
                        {m.code}
                      </span>
                      {m.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {n}/{m.capacity}
                      {p ? ` · +${p} pending` : ""}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                    <div
                      className={`h-full ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
        <Section
          title="Credit compliance"
          description="Students who still need to choose optional credits"
        >
          <div className="space-y-2">
            {under.map(({ l, chosen, need }) => (
              <div key={l.id} className="flex items-center gap-2.5 text-sm">
                <Avatar name={l.name} seed={l.id} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{l.name}</div>
                  <div className="text-[11px] text-muted-foreground">{l.level}</div>
                </div>
                <Badge tone="warning">
                  {chosen}/{need} credits
                </Badge>
              </div>
            ))}
            {!under.length && (
              <div className="text-xs text-muted-foreground">
                Everyone has a full set of choices.
              </div>
            )}
          </div>
        </Section>
      </div>

      {admin && <RegistrationsTable />}

      {rejecting && (
        <RejectDialog
          reg={rejecting}
          label={`${d.name(rejecting.studentId)} — ${d.moduleById(rejecting.moduleId)?.code}`}
          onClose={() => setRejecting(null)}
        />
      )}
      {registerOpen && <RegisterDialog onClose={() => setRegisterOpen(false)} />}
      {cohortOpen && <CohortDialog onClose={() => setCohortOpen(false)} />}
    </>
  );
}

/* ── Admin: every registration this year ─────────────────────────────────── */

function RegistrationsTable() {
  const d = useHeData();
  const [moduleId, setModuleId] = useState("");
  const [status, setStatus] = useState("live");
  const [q, setQ] = useState("");
  const [withdrawing, setWithdrawing] = useState<ModuleRegistration | null>(null);
  const [moving, setMoving] = useState<ModuleRegistration | null>(null);
  const LIMIT = 40;

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return d.regs
      .filter((r) => r.academicYear === d.academicYear)
      .filter((r) => !moduleId || r.moduleId === moduleId)
      .filter((r) => (status === "live" ? isLive(r) : status === "all" || r.status === status))
      .filter(
        (r) =>
          !ql ||
          d.name(r.studentId).toLowerCase().includes(ql) ||
          r.studentId.toLowerCase().includes(ql),
      )
      .sort((a, b) => d.name(a.studentId).localeCompare(d.name(b.studentId)));
  }, [d, moduleId, status, q]);

  const canMove = (r: ModuleRegistration) => {
    if (r.kind !== "Optional" || !isLive(r)) return false;
    const l = d.learners.find((x) => x.id === r.studentId);
    return !!l && !!stageOf(d, l).stage?.optionalModuleIds.includes(r.moduleId);
  };

  return (
    <Section
      title="Registrations"
      description={`Every module registration for ${d.academicYear}. Withdraw, or move a student between optional modules.`}
      actions={
        <>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Student or ID"
              className="h-8 w-40 pl-8"
            />
          </div>
          <Select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            className="h-8 w-48"
            options={[
              { value: "", label: "All modules" },
              ...d.modules.map((m) => ({ value: m.id, label: `${m.code} ${m.title}` })),
            ]}
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 w-40"
            options={[
              { value: "live", label: "Registered + pending" },
              { value: "Registered", label: "Registered" },
              { value: "Pending approval", label: "Pending approval" },
              { value: "Withdrawn", label: "Withdrawn" },
              { value: "Rejected", label: "Rejected" },
              { value: "all", label: "All statuses" },
            ]}
          />
        </>
      }
    >
      <DataTable
        columns={[
          { key: "student", label: "Student" },
          { key: "module", label: "Module" },
          { key: "kind", label: "Type" },
          { key: "status", label: "Status" },
          { key: "_actions", label: "", className: "text-right" },
        ]}
        rows={rows.slice(0, LIMIT)}
        emptyText="No registrations match."
        renderCell={(r: ModuleRegistration, key) => {
          const m = d.moduleById(r.moduleId);
          if (key === "student")
            return (
              <div className="min-w-0">
                <div className="font-medium truncate">{d.name(r.studentId)}</div>
                <div className="text-[11px] text-muted-foreground">{r.studentId}</div>
              </div>
            );
          if (key === "module")
            return (
              <span>
                <span className="font-mono text-[11px] text-muted-foreground mr-1">{m?.code}</span>
                {m?.title}
              </span>
            );
          if (key === "kind") return <Badge tone="muted">{r.kind}</Badge>;
          if (key === "status")
            return (
              <div>
                <StatusPill status={r.status} />
                {r.note && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 max-w-48 truncate">
                    {r.note}
                  </div>
                )}
              </div>
            );
          if (key === "_actions")
            return isLive(r) ? (
              <div className="flex justify-end gap-1.5">
                {canMove(r) && (
                  <Button size="sm" variant="ghost" onClick={() => setMoving(r)}>
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Move
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setWithdrawing(r)}>
                  Withdraw
                </Button>
              </div>
            ) : null;
          return null;
        }}
      />
      {rows.length > LIMIT && (
        <div className="text-[11px] text-muted-foreground mt-2">
          Showing {LIMIT} of {rows.length} — filter by module or search to narrow down.
        </div>
      )}
      {withdrawing && <WithdrawDialog reg={withdrawing} onClose={() => setWithdrawing(null)} />}
      {moving && <MoveDialog reg={moving} onClose={() => setMoving(null)} />}
    </Section>
  );
}

function OverrideFields({
  needed,
  override,
  setOverride,
  reason,
  setReason,
}: {
  needed: boolean;
  override: boolean;
  setOverride: (v: boolean) => void;
  reason: string;
  setReason: (v: string) => void;
}) {
  if (!needed) return null;
  return (
    <div className="sm:col-span-2 rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
        Override the failed checks
      </label>
      {override && (
        <TextInput
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (kept in the student's History)"
          className="h-8"
        />
      )}
    </div>
  );
}

/** Register one student on a module on their behalf. */
function RegisterDialog({ onClose }: { onClose: () => void }) {
  const d = useHeData();
  const [moduleId, setModuleId] = useState(d.modules[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const m = d.moduleById(moduleId);

  // Students on a programme that includes the module; current-stage fits first.
  const pool = useMemo(() => {
    if (!m) return [];
    return d.learners
      .filter((l) => l.status === "Active" && l.programmeId)
      .map((l) => {
        const { p, stage } = stageOf(d, l);
        const onProg = p?.stages.some(
          (s) => s.coreModuleIds.includes(m.id) || s.optionalModuleIds.includes(m.id),
        );
        const fits =
          !!stage && (stage.coreModuleIds.includes(m.id) || stage.optionalModuleIds.includes(m.id));
        return { l, p, onProg, fits };
      })
      .filter((x) => x.onProg)
      .sort((a, b) => Number(b.fits) - Number(a.fits) || a.l.name.localeCompare(b.l.name));
  }, [d, m]);

  const l = pool.find((x) => x.l.id === studentId)?.l;
  const checks = l && m ? adminChecks(d, l, m) : [];
  const hardFail = checks.some((c) => !c.ok && c.hard);
  const softFail = checks.some((c) => !c.ok && !c.hard);

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Register a student"
      description="Registers the student straight away (no approval step). Failed checks need an override and a reason."
      submitLabel="Register"
      onSubmit={() => {
        if (!l || !m) {
          toast.error("Choose a module and a student");
          return;
        }
        if (hardFail) {
          toast.error(`${l.name} is already registered on ${m.code}`);
          return;
        }
        if (softFail && (!override || !reason.trim())) {
          toast.error("Some checks failed — tick override and give a reason");
          return;
        }
        const stage = stageOf(d, l).stage;
        const id = nextId("REG-", "moduleRegistrations");
        addItem("moduleRegistrations", {
          id,
          tenantId: d.tenantId,
          studentId: l.id,
          moduleId: m.id,
          academicYear: d.academicYear,
          kind: stage?.coreModuleIds.includes(m.id) ? "Core" : "Optional",
          status: "Registered",
          at: new Date().toISOString(),
          note: softFail ? `Registered by registry (override): ${reason.trim()}` : undefined,
        });
        regLog(
          d,
          { id, studentId: l.id },
          "Module registration",
          undefined,
          `Registered on ${m.code}`,
          softFail
            ? `Override — ${checks
                .filter((c) => !c.ok)
                .map((c) => c.label)
                .join("; ")}. ${reason.trim()}`
            : "Registered by registry",
        );
        tellStudent(
          d,
          l.id,
          `You've been registered on ${m.code} ${m.title}`,
          `Your registry has registered you on ${m.code} for ${d.academicYear}.`,
        );
        toast.success(`${l.name} registered on ${m.code}`, {
          description: softFail ? "Override recorded in History" : "Student notified",
        });
        onClose();
      }}
    >
      <Field label="Module" required className="sm:col-span-2">
        <Select
          value={moduleId}
          onChange={(e) => {
            setModuleId(e.target.value);
            setStudentId("");
            setOverride(false);
          }}
          options={d.modules.map((x) => ({
            value: x.id,
            label: `${x.code} ${x.title} · ${registeredCount(d, x.id)}/${x.capacity}`,
          }))}
        />
      </Field>
      <Field
        label="Student"
        required
        className="sm:col-span-2"
        hint={
          pool.length
            ? "Students whose programme includes this module — current-stage students first."
            : "No active students are on a programme that includes this module."
        }
      >
        <Select
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setOverride(false);
          }}
          options={[
            { value: "", label: "Choose a student…" },
            ...pool.map((x) => ({
              value: x.l.id,
              label: `${x.l.name} · ${x.l.id} · ${x.p?.code ?? ""} ${x.l.level}${x.fits ? "" : " (other stage)"}`,
            })),
          ]}
        />
      </Field>
      {l && m && (
        <div className="sm:col-span-2">
          <ChecksList checks={checks} />
        </div>
      )}
      <OverrideFields
        needed={!!l && !hardFail && softFail}
        override={override}
        setOverride={setOverride}
        reason={reason}
        setReason={setReason}
      />
    </FormDialog>
  );
}

/** Withdraw a registration (kept with its marks) — or delete one entered in error. */
function WithdrawDialog({ reg, onClose }: { reg: ModuleRegistration; onClose: () => void }) {
  const d = useHeData();
  const m = d.moduleById(reg.moduleId);
  const marks = d.marks.filter(
    (x) =>
      x.studentId === reg.studentId &&
      x.moduleId === reg.moduleId &&
      (!x.academicYear || x.academicYear === reg.academicYear),
  );
  const [reason, setReason] = useState("");
  const [inError, setInError] = useState(false);
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={inError ? "Delete registration" : "Withdraw from module"}
      description={`${d.name(reg.studentId)} — ${m?.code} ${m?.title}`}
      submitLabel={inError ? "Delete entry" : "Withdraw"}
      submitVariant="destructive"
      onSubmit={() => {
        if (!reason.trim()) {
          toast.error("Give a reason");
          return;
        }
        if (inError) {
          removeItem("moduleRegistrations", (x) => x.id === reg.id);
          regLog(d, reg, "Module registration deleted", `${reg.status} on ${m?.code}`, "—", reason);
          toast.success(`Registration deleted — ${m?.code}`);
        } else {
          updateItem("moduleRegistrations", (x) => x.id === reg.id, {
            status: "Withdrawn",
            note: reason.trim(),
          });
          regLog(
            d,
            reg,
            "Module registration",
            `${reg.status} on ${m?.code}`,
            "Withdrawn",
            reason.trim(),
          );
          tellStudent(
            d,
            reg.studentId,
            `You've been withdrawn from ${m?.code}`,
            `Reason: ${reason.trim()}`,
          );
          toast.success(`${d.name(reg.studentId)} withdrawn from ${m?.code}`, {
            description: "Student notified",
          });
        }
        onClose();
      }}
    >
      {marks.length > 0 ? (
        <p className="sm:col-span-2 text-xs rounded-lg border border-warning/40 bg-warning/10 p-3">
          {marks.length} mark{marks.length > 1 ? "s are" : " is"} recorded on this module. The
          registration is withdrawn, not deleted, and the marks stay on the record.
        </p>
      ) : (
        <label className="sm:col-span-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={inError} onChange={(e) => setInError(e.target.checked)} />
          Entered in error — delete it instead (no marks recorded)
        </label>
      )}
      <Field label="Reason" required className="sm:col-span-2">
        <TextArea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={inError ? "e.g. Registered on the wrong module" : "e.g. Changed programme"}
        />
      </Field>
    </FormDialog>
  );
}

/** Move a student from one optional module to another on the same stage. */
function MoveDialog({ reg, onClose }: { reg: ModuleRegistration; onClose: () => void }) {
  const d = useHeData();
  const l = d.learners.find((x) => x.id === reg.studentId)!;
  const from = d.moduleById(reg.moduleId);
  const stage = stageOf(d, l).stage;
  const targets = (stage?.optionalModuleIds ?? [])
    .filter((id) => id !== reg.moduleId)
    .map(d.moduleById)
    .filter((m): m is HeModule => !!m);
  const [toId, setToId] = useState(targets[0]?.id ?? "");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const to = d.moduleById(toId);
  const checks = to ? adminChecks(d, l, to, reg.id) : [];
  const hardFail = checks.some((c) => !c.ok && c.hard);
  const softFail = checks.some((c) => !c.ok && !c.hard);
  const marks = d.marks.filter(
    (x) => x.studentId === reg.studentId && x.moduleId === reg.moduleId && x.mark !== undefined,
  ).length;

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Move to another optional module"
      description={`${l.name} — currently ${from?.code} ${from?.title}`}
      submitLabel="Move"
      onSubmit={() => {
        if (!to) {
          toast.error("Choose a module to move to");
          return;
        }
        if (hardFail) {
          toast.error(`${l.name} is already on ${to.code}`);
          return;
        }
        if (softFail && (!override || !reason.trim())) {
          toast.error("Some checks failed — tick override and give a reason");
          return;
        }
        const note = `Moved to ${to.code}`;
        updateItem("moduleRegistrations", (x) => x.id === reg.id, { status: "Withdrawn", note });
        const id = nextId("REG-", "moduleRegistrations");
        addItem("moduleRegistrations", {
          id,
          tenantId: d.tenantId,
          studentId: l.id,
          moduleId: to.id,
          academicYear: d.academicYear,
          kind: "Optional",
          status: "Registered",
          at: new Date().toISOString(),
          note: `Moved from ${from?.code}`,
        });
        regLog(
          d,
          { id, studentId: l.id },
          "Optional module",
          from?.code,
          to.code,
          softFail ? `Override: ${reason.trim()}` : reason.trim() || undefined,
        );
        tellStudent(
          d,
          l.id,
          `Your optional module has changed: ${from?.code} → ${to.code}`,
          `You're now registered on ${to.code} ${to.title} for ${d.academicYear}.`,
        );
        toast.success(`${l.name} moved ${from?.code} → ${to.code}`);
        onClose();
      }}
    >
      <Field label="Move to" required className="sm:col-span-2">
        <Select
          value={toId}
          onChange={(e) => {
            setToId(e.target.value);
            setOverride(false);
          }}
          options={targets.map((m) => ({
            value: m.id,
            label: `${m.code} ${m.title} · ${m.credits} cr · ${registeredCount(d, m.id)}/${m.capacity}`,
          }))}
        />
      </Field>
      {to && (
        <div className="sm:col-span-2">
          <ChecksList checks={checks} />
        </div>
      )}
      {marks > 0 && (
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          {marks} mark{marks > 1 ? "s" : ""} on {from?.code} stay on the record.
        </p>
      )}
      <OverrideFields
        needed={!!to && !hardFail && softFail}
        override={override}
        setOverride={setOverride}
        reason={reason}
        setReason={setReason}
      />
      {!softFail && (
        <Field label="Reason (optional)" className="sm:col-span-2">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      )}
    </FormDialog>
  );
}

/** Register every active student on a programme stage onto its core modules. */
function CohortDialog({ onClose }: { onClose: () => void }) {
  const d = useHeData();
  const [progId, setProgId] = useState(d.programmes[0]?.id ?? "");
  const p = d.programmeById(progId);
  const [stageIdx, setStageIdx] = useState(0);
  const stage = p?.stages[stageIdx];

  const plan = useMemo(() => {
    if (!p || !stage) return { students: [] as Learner[], todo: [], skipped: 0, over: [] };
    const students = d.learners.filter(
      (l) =>
        l.status === "Active" && l.programmeId === p.id && stageIndexFor(p, l.level) === stageIdx,
    );
    const core = stage.coreModuleIds.map(d.moduleById).filter((m): m is HeModule => !!m);
    const todo: { l: Learner; m: HeModule }[] = [];
    let skipped = 0;
    for (const l of students)
      for (const m of core) {
        const has = d.regs.some(
          (r) =>
            r.studentId === l.id &&
            r.moduleId === m.id &&
            r.academicYear === d.academicYear &&
            isLive(r),
        );
        if (has) skipped++;
        else todo.push({ l, m });
      }
    const over = core.filter(
      (m) => registeredCount(d, m.id) + todo.filter((t) => t.m.id === m.id).length > m.capacity,
    );
    return { students, todo, skipped, over };
  }, [d, p, stage, stageIdx]);

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Register cohort on core modules"
      description={`All active students on the stage are registered on its core modules for ${d.academicYear}. Existing registrations are skipped.`}
      submitLabel={`Create ${plan.todo.length} registration${plan.todo.length === 1 ? "" : "s"}`}
      onSubmit={() => {
        if (!plan.todo.length) {
          toast.message("Nothing to do — everyone is already registered");
          onClose();
          return;
        }
        const byStudent = new Map<string, string[]>();
        for (const { l, m } of plan.todo) {
          const id = nextId("REG-", "moduleRegistrations");
          addItem("moduleRegistrations", {
            id,
            tenantId: d.tenantId,
            studentId: l.id,
            moduleId: m.id,
            academicYear: d.academicYear,
            kind: "Core",
            status: "Registered",
            at: new Date().toISOString(),
          });
          regLog(
            d,
            { id, studentId: l.id },
            "Module registration",
            undefined,
            `Registered on ${m.code}`,
            `Cohort registration — ${p?.code} ${stage?.name}`,
          );
          byStudent.set(l.id, [...(byStudent.get(l.id) ?? []), m.code]);
        }
        for (const [sid, codes] of byStudent)
          tellStudent(
            d,
            sid,
            `You've been registered on your core modules for ${d.academicYear}`,
            codes.join(", "),
          );
        toast.success(`${plan.todo.length} registrations created for ${byStudent.size} students`, {
          description: plan.skipped ? `${plan.skipped} already in place — skipped` : undefined,
        });
        onClose();
      }}
    >
      <Field label="Programme" className="sm:col-span-2">
        <Select
          value={progId}
          onChange={(e) => {
            setProgId(e.target.value);
            setStageIdx(0);
          }}
          options={d.programmes.map((x) => ({
            value: x.id,
            label: `${x.code} ${x.award} ${x.name}`,
          }))}
        />
      </Field>
      <Field label="Stage" className="sm:col-span-2">
        <Select
          value={String(stageIdx)}
          onChange={(e) => setStageIdx(Number(e.target.value))}
          options={(p?.stages ?? []).map((s, i) => ({
            value: String(i),
            label: `${s.name} · ${s.coreModuleIds.length} core modules`,
          }))}
        />
      </Field>
      <div className="sm:col-span-2 rounded-lg border p-3 text-xs space-y-1">
        <div>
          <b>{plan.students.length}</b> active students on this stage
        </div>
        <div>
          <b>{plan.todo.length}</b> registrations to create · {plan.skipped} already registered
          (skipped)
        </div>
        {plan.over.length > 0 && (
          <div className="text-warning-foreground flex items-start gap-1">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Over capacity after this: {plan.over.map((m) => m.code).join(", ")}. Core places are
            guaranteed, so they're registered anyway — raise the capacity in Programmes & Modules.
          </div>
        )}
      </div>
    </FormDialog>
  );
}

function RejectDialog({
  reg,
  label,
  onClose,
}: {
  reg: ModuleRegistration;
  label: string;
  onClose: () => void;
}) {
  const d = useHeData();
  const [note, setNote] = useState("Module full — please choose an alternative.");
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Reject module request"
      description={label}
      submitLabel="Reject request"
      submitVariant="destructive"
      onSubmit={() => {
        updateItem("moduleRegistrations", (x) => x.id === reg.id, { status: "Rejected", note });
        regLog(d, reg, "Module registration", "Pending approval", "Rejected", note);
        tellStudent(d, reg.studentId, `Module request not approved — ${label}`, note);
        toast("Request rejected — the student has been notified");
        onClose();
      }}
    >
      <Field label="Reason shown to the student" className="sm:col-span-2">
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

/** When this module runs for the student — on their own intake calendar. */
function RunLine({ m, calendarId }: { m: RunModule; calendarId: string }) {
  const calendars = useRunCollection("academicCalendars");
  const run = periodOnCalendar(
    m.semester,
    calendars.find((c) => c.id === calendarId),
  );
  if (!run) return null;
  const f = (iso: string) =>
    new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <span className="block">
      {run.period}: {f(run.start)} – {f(run.end)}
    </span>
  );
}
