import { createFileRoute } from "@tanstack/react-router";
import { money } from "@/lib/packs/regions";
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  CornerUpLeft,
  Inbox,
  Plus,
  ShieldAlert,
  Sparkles,
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
  TextInput,
  TextArea,
  Select,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { LucideIcon, PackContextBar, StatusPill, Tabs, useTab } from "@/components/packs/PackUI";
import { useGuardianVerification } from "@/components/packs/FamilyAccount";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { addItem, nextId, updateItem, useCollection } from "@/lib/store";
import { useScopedLearners, useTenantContext, type TenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import type { FeeAccount, InstalmentStatus } from "@/lib/packs/bizData";
import type { Programme } from "@/lib/packs/heData";
import { logChange, notify } from "@/lib/packs/sis/activity";
import {
  KIND_INFO,
  buildChain,
  currentStep,
  detailSummary,
  displayStatus,
  isReturned,
  kindsFor,
  roleHolder,
  supervisorsFor,
  visaReportLine,
  type RequestKind,
  type RequestStep,
  type StudentRequest,
} from "@/lib/packs/sis/requests";

export const Route = createFileRoute("/app/requests")({
  head: () => ({ meta: [{ title: "Requests & Approvals — 1StudentID" }] }),
  component: RequestsPage,
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const SOURCE = "Requests & approvals";

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysOpen(iso: string) {
  const ms = Date.parse(`${DEMO_TODAY}T12:00:00Z`) - Date.parse(iso);
  return Math.max(0, Math.round(ms / 86400000));
}

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const DETAIL_LABEL: Record<string, string> = {
  from: "From",
  to: "To",
  returnDate: "Planned return",
  lastDay: "Last day",
  deferTo: "Defer to",
  toProgramme: "New programme",
  toLevel: "Stage",
  newMode: "New mode",
  topic: "Project topic",
  supervisor: "Proposed supervisor",
  method: "Approach",
};

/** Programme stages, in order (empty for qualification-only learners). */
function nextStage(l: Learner, programmes: Programme[]): string | undefined {
  const p = programmes.find((x) => x.id === l.programmeId);
  if (!p) return undefined;
  const i = p.stages.findIndex((s) => s.name === l.level);
  return i >= 0 ? p.stages[i + 1]?.name : p.stages[0]?.name;
}

/** Who hears about a request's progress: guardians for pupils, else the learner. */
function requesters(r: StudentRequest, l: Learner | undefined, type: TenantContext["type"]) {
  if (!l) return [r.submittedBy];
  if (type === "school" && l.guardians?.length) return l.guardians;
  return [l.name];
}

/** What final approval will do — shown to approvers before they decide. */
function previewEffects(
  r: StudentRequest,
  l: Learner | undefined,
  region: string | undefined,
  progName: (id: string) => string,
): string[] {
  if (!l) return [];
  const out: string[] = [];
  switch (r.kind) {
    case "Interruption of study":
      out.push(`Status → Interrupted`, "Future instalments suspended");
      break;
    case "Withdrawal":
      out.push(`Status → Withdrawn`, "Future instalments cancelled");
      break;
    case "Deferral":
      out.push(`Status → Deferred (${r.details.deferTo ?? "later intake"})`);
      break;
    case "Programme transfer":
      out.push(
        `Programme → ${progName(r.details.toProgramme)}`,
        ...(r.details.toLevel ? [`Stage → ${r.details.toLevel}`] : []),
      );
      break;
    case "Progression":
      out.push(`Stage → ${r.details.toLevel ?? "next stage"}`);
      break;
    case "Change of study mode":
      out.push(`Mode → ${r.details.newMode}`);
      break;
    case "Project proposal":
      out.push(`Project registered with ${r.details.supervisor ?? "supervisor"}`);
      break;
    case "Leave of absence":
      out.push(`Authorised absence ${r.details.from} – ${r.details.to}`);
      break;
  }
  if (l.visa?.sponsored && visaReportable(r)) out.push(visaReportLine(region));
  return out;
}

function visaReportable(r: StudentRequest) {
  return (
    r.kind === "Interruption of study" ||
    r.kind === "Withdrawal" ||
    (r.kind === "Change of study mode" && r.details.newMode === "Part-time")
  );
}

/* ── Effects engine — runs on FINAL approval ─────────────────────────────── */

function applyEffects(
  r: StudentRequest,
  l: Learner,
  feeAccounts: FeeAccount[],
  programmes: Programme[],
  ctx: TenantContext,
  by: string,
): string[] {
  const fx: string[] = [];
  const reason = `${r.kind} ${r.id} approved`;
  const setLearner = <K extends keyof Learner>(field: K, to: Learner[K], label: string) => {
    const from = l[field];
    if (from === to) return;
    updateItem("learners", (x) => x.id === l.id, { [field]: to } as Partial<Learner>);
    logChange({
      tenantId: l.tenantId,
      entity: "learner",
      entityId: l.id,
      studentId: l.id,
      field: String(field),
      from: from === undefined ? undefined : String(from),
      to: String(to),
      by,
      reason,
    });
    fx.push(`${label}: ${from ?? "—"} → ${to}`);
  };
  const changeInstalments = (to: Extract<InstalmentStatus, "Suspended" | "Cancelled">) => {
    // Instalments due on/after the effective date (never earlier than today).
    const start = r.details.from ?? r.details.lastDay ?? DEMO_TODAY;
    const effective = start < DEMO_TODAY ? DEMO_TODAY : start;
    let n = 0;
    let total = 0;
    let currency = "";
    for (const a of feeAccounts.filter((x) => x.studentId === l.id)) {
      const touched = a.instalments.filter(
        (i) => i.due >= effective && (i.status === "Scheduled" || i.status === "Due"),
      );
      if (!touched.length) continue;
      currency = a.currency;
      updateItem("feeAccounts", (x) => x.id === a.id, {
        instalments: a.instalments.map((i) => (touched.includes(i) ? { ...i, status: to } : i)),
      });
      for (const i of touched) {
        n++;
        total += i.amount;
        logChange({
          tenantId: l.tenantId,
          entity: "feeAccount",
          entityId: a.id,
          studentId: l.id,
          field: `${i.label} (due ${i.due})`,
          from: i.status,
          to,
          by,
          reason,
        });
      }
    }
    fx.push(
      n
        ? `${n} future instalment${n > 1 ? "s" : ""} ${to.toLowerCase()} (${money(total, currency)})`
        : `Fee schedule: no future instalments to ${to === "Suspended" ? "suspend" : "cancel"}`,
    );
    if (n)
      notify({
        tenantId: l.tenantId,
        channel: "Email",
        to: roleHolder(l.tenantId, "Finance"),
        subject: `${n} instalment${n > 1 ? "s" : ""} ${to.toLowerCase()} — ${l.name}`,
        body: `${r.kind} ${r.id} approved. Fee schedule updated automatically.`,
        source: SOURCE,
        relatedId: r.id,
      });
  };

  switch (r.kind) {
    case "Interruption of study":
      setLearner("status", "Interrupted", "Learner status");
      changeInstalments("Suspended");
      if (r.details.returnDate) fx.push(`Return date recorded: ${r.details.returnDate}`);
      break;
    case "Withdrawal":
      setLearner("status", "Withdrawn", "Learner status");
      changeInstalments("Cancelled");
      break;
    case "Deferral":
      setLearner("status", "Deferred", "Learner status");
      if (r.details.deferTo) fx.push(`Deferred to ${r.details.deferTo}`);
      break;
    case "Programme transfer": {
      const p = programmes.find((x) => x.id === r.details.toProgramme);
      const from = programmes.find((x) => x.id === l.programmeId);
      if (p) {
        updateItem("learners", (x) => x.id === l.id, {
          programmeId: p.id,
          ...(r.details.toLevel ? { level: r.details.toLevel } : {}),
        });
        logChange({
          tenantId: l.tenantId,
          entity: "learner",
          entityId: l.id,
          studentId: l.id,
          field: "programmeId",
          from: l.programmeId,
          to: p.id,
          by,
          reason,
        });
        fx.push(`Programme: ${from ? `${from.award} ${from.name}` : "—"} → ${p.award} ${p.name}`);
        if (r.details.toLevel && r.details.toLevel !== l.level) {
          logChange({
            tenantId: l.tenantId,
            entity: "learner",
            entityId: l.id,
            studentId: l.id,
            field: "level",
            from: l.level,
            to: r.details.toLevel,
            by,
            reason,
          });
          fx.push(`Stage: ${l.level} → ${r.details.toLevel}`);
        }
      }
      break;
    }
    case "Progression": {
      const to = r.details.toLevel || nextStage(l, programmes);
      if (to) setLearner("level", to, "Stage");
      break;
    }
    case "Change of study mode":
      if (r.details.newMode) setLearner("mode", r.details.newMode as Learner["mode"], "Study mode");
      break;
    case "Project proposal":
      fx.push(`Project registered: "${r.details.topic}" — supervisor ${r.details.supervisor}`);
      break;
    case "Leave of absence":
      fx.push(`Authorised absence ${r.details.from} – ${r.details.to}`);
      notify({
        tenantId: l.tenantId,
        channel: "App",
        to: `Attendance office (${l.group ?? l.level})`,
        subject: `Authorised absence: ${l.name}, ${r.details.from} – ${r.details.to}`,
        source: SOURCE,
        relatedId: r.id,
      });
      break;
  }

  if (l.visa?.sponsored && visaReportable(r)) {
    const line = visaReportLine(ctx.profile?.region);
    fx.push(line);
    notify({
      tenantId: l.tenantId,
      channel: "Email",
      to: roleHolder(l.tenantId, "Visa compliance"),
      subject: `${line}: ${l.name} (${l.visa.ref ?? l.visa.type})`,
      body: `${r.kind} approved (${r.id}). Sponsor duty: report the change.`,
      source: "Requests · visa compliance",
      relatedId: r.id,
    });
  }
  return fx;
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function RequestsPage() {
  const ctx = useTenantContext();
  const role = ctx.user?.role;
  const staff = role === "admin" || role === "teacher";
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          role === "student"
            ? "My Requests"
            : role === "parent"
              ? "Requests"
              : role === "teacher"
                ? "Approvals"
                : "Requests & Approvals"
        }
        subtitle={
          staff
            ? "Student requests move through an approval chain. Final approval updates the record and fees automatically."
            : "Ask for a change to your studies and follow each approval step."
        }
      />
      <PackContextBar />
      {staff ? <StaffView /> : <RequesterView />}
    </div>
  );
}

/* ── Student / parent ────────────────────────────────────────────────────── */

function RequesterView() {
  const ctx = useTenantContext();
  const mine = useScopedLearners();
  const all = useCollection("studentRequests");
  const [newKind, setNewKind] = useState<RequestKind | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const kinds = kindsFor(ctx.type);
  const isPupil = ctx.user?.role === "student" && ctx.type === "school";
  const canSubmit = kinds.length > 0 && mine.length > 0 && (!isPupil || ctx.familyOperated);
  const ids = new Set(mine.map((l) => l.id));
  const rows = all
    .filter((r) => r.tenantId === ctx.tenantId && ids.has(r.studentId))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const nameOf = (id: string) => mine.find((l) => l.id === id)?.name ?? id;
  const open = rows.filter((r) => r.status === "Submitted" || r.status === "In review");

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Open"
          value={open.length}
          icon={<Clock className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Needs your reply"
          value={rows.filter(isReturned).length}
          icon={<CornerUpLeft className="h-4 w-4" />}
          accent="warning"
        />
        <StatCard
          label="Approved"
          value={rows.filter((r) => r.status === "Approved").length}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Not approved"
          value={rows.filter((r) => r.status === "Rejected").length}
          icon={<XCircle className="h-4 w-4" />}
          accent="destructive"
        />
      </div>

      {canSubmit ? (
        <Section
          title="Make a request"
          description="Pick what you need. We route it to the right people."
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {kinds.map((k) => (
              <button
                key={k}
                onClick={() => setNewKind(k)}
                className="text-left rounded-xl border bg-card p-3 hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <LucideIcon name={KIND_INFO[k].icon} className="h-4 w-4 text-primary" />
                  {k}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{KIND_INFO[k].blurb}</div>
              </button>
            ))}
          </div>
        </Section>
      ) : isPupil ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          Leave and withdrawal requests for pupils are made by a parent or guardian.
        </div>
      ) : null}

      <Section title="Request history" description="Tap a request to see each step.">
        <DataTable
          columns={[
            { key: "kind", label: "Request" },
            ...(mine.length > 1 ? [{ key: "child", label: "Child" }] : []),
            { key: "details", label: "Details" },
            { key: "waiting", label: "Waiting on" },
            { key: "status", label: "Status" },
            { key: "_a", label: "", className: "text-right" },
          ]}
          rows={rows}
          emptyText="No requests yet."
          renderCell={(r: StudentRequest, key) => {
            const step = currentStep(r);
            if (key === "kind")
              return (
                <div>
                  <div className="font-medium">{r.kind}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.id} · {fmt(r.submittedAt)}
                  </div>
                </div>
              );
            if (key === "child") return nameOf(r.studentId);
            if (key === "details") return <span className="text-xs">{detailSummary(r)}</span>;
            if (key === "waiting")
              return isReturned(r) ? (
                <span className="text-xs text-warning-foreground">You — please reply</span>
              ) : step ? (
                <span className="text-xs">
                  {step.role}
                  <span className="text-muted-foreground"> · {step.assignee}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              );
            if (key === "status") return <StatusPill status={displayStatus(r)} />;
            if (key === "_a")
              return (
                <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                  View
                </Button>
              );
          }}
        />
      </Section>

      {newKind && (
        <NewRequestDialog kind={newKind} learners={mine} onClose={() => setNewKind(null)} />
      )}
      <RequestSheet id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function NewRequestDialog({
  kind: initialKind,
  learners,
  onClose,
}: {
  kind: RequestKind;
  learners: Learner[];
  onClose: () => void;
}) {
  const ctx = useTenantContext();
  const programmes = useCollection("programmes");
  const all = useCollection("studentRequests");
  const guardian = useGuardianVerification("school request");
  const kinds = kindsFor(ctx.type);
  const [kind, setKind] = useState<RequestKind>(initialKind);
  const [studentId, setStudentId] = useState(learners[0]?.id ?? "");
  const l = learners.find((x) => x.id === studentId);
  const [reason, setReason] = useState("");
  const tenantProgrammes = programmes.filter((p) => p.tenantId === ctx.tenantId);
  const otherProgrammes = tenantProgrammes.filter((p) => p.id !== l?.programmeId);
  const supervisors = supervisorsFor(ctx.tenantId);
  const [d, setD] = useState<Record<string, string>>(() => ({
    from: addDays(DEMO_TODAY, 14),
    to: addDays(DEMO_TODAY, 16),
    returnDate: addDays(DEMO_TODAY, 300),
    lastDay: addDays(DEMO_TODAY, 7),
    deferTo: "Next intake",
    toProgramme: otherProgrammes[0]?.id ?? "",
    newMode: l?.mode === "Part-time" ? "Full-time" : "Part-time",
    supervisor: supervisors[0] ?? "",
    topic: "",
    method: "",
  }));
  const set = (k: string, v: string) => setD((x) => ({ ...x, [k]: v }));
  const target = programmes.find((p) => p.id === d.toProgramme);
  const toLevel =
    d.toLevel && target?.stages.some((s) => s.name === d.toLevel)
      ? d.toLevel
      : (target?.stages.find((s) => s.name === l?.level)?.name ?? target?.stages[0]?.name ?? "");
  const progressTo = l ? nextStage(l, programmes) : undefined;

  const submit = () => {
    if (!l) return;
    if (!reason.trim()) return toast.error("Add a short reason.");
    if (!guardian.verified) return toast.error("Enter the guardian code to confirm.");
    if (
      all.some(
        (r) =>
          r.studentId === l.id &&
          r.kind === kind &&
          (r.status === "Submitted" || r.status === "In review"),
      )
    )
      return toast.error(`There is already an open ${kind.toLowerCase()} request.`);
    const pick = (keys: string[]) =>
      Object.fromEntries(keys.filter((k) => d[k]).map((k) => [k, d[k]]));
    let details: Record<string, string> = {};
    switch (kind) {
      case "Interruption of study":
        details = pick(["from", "returnDate"]);
        break;
      case "Leave of absence":
        if (d.to < d.from) return toast.error("The end date is before the start date.");
        details = pick(["from", "to"]);
        break;
      case "Withdrawal":
        details = pick(["lastDay"]);
        break;
      case "Deferral":
        details = pick(["deferTo"]);
        break;
      case "Programme transfer":
        if (!d.toProgramme) return toast.error("Choose a programme.");
        details = { ...pick(["toProgramme", "from"]), toLevel };
        break;
      case "Progression":
        if (!progressTo) return toast.error("You are already on the final stage.");
        details = { toLevel: progressTo };
        break;
      case "Change of study mode":
        details = pick(["newMode", "from"]);
        break;
      case "Project proposal":
        if (!d.topic.trim()) return toast.error("Add a project topic.");
        details = pick(["topic", "supervisor", "method"]);
        break;
    }
    const steps = buildChain(kind, l, ctx.type, details);
    const by = ctx.type === "school" ? guardian.recordedBy : ctx.actingAs;
    const now = new Date().toISOString();
    const id = nextId("REQ-", "studentRequests");
    addItem("studentRequests", {
      id,
      tenantId: ctx.tenantId,
      studentId: l.id,
      kind,
      submittedBy: by,
      submittedAt: now,
      reason: reason.trim(),
      details,
      steps,
      status: "Submitted",
      history: [{ at: now, by, action: "Submitted" }],
    });
    logChange({
      tenantId: ctx.tenantId,
      entity: "request",
      entityId: id,
      studentId: l.id,
      field: "status",
      to: "Submitted",
      by,
      reason: kind,
    });
    notify({
      tenantId: ctx.tenantId,
      channel: "Email",
      to: steps[0].assignee,
      subject: `Approval needed (${steps[0].role}): ${kind} — ${l.name}`,
      body: reason.trim(),
      source: SOURCE,
      relatedId: id,
    });
    for (const who of requesters({ submittedBy: by } as StudentRequest, l, ctx.type))
      notify({
        tenantId: ctx.tenantId,
        channel: "App",
        to: who,
        subject: `Request received: ${kind} (${id})`,
        body: `Next: ${steps[0].role} — ${steps[0].assignee}.`,
        source: SOURCE,
        relatedId: id,
      });
    toast.success(`${kind} submitted — sent to ${steps[0].assignee}`);
    onClose();
  };

  const chain = l ? buildChain(kind, l, ctx.type, { ...d, toLevel }) : [];

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`New request · ${kind}`}
      description={KIND_INFO[kind].blurb}
      submitLabel="Submit request"
      onSubmit={submit}
    >
      <Field label="Request type">
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as RequestKind)}
          options={kinds.map((k) => ({ value: k, label: k }))}
        />
      </Field>
      {learners.length > 1 ? (
        <Field label="Child">
          <Select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            options={learners.map((x) => ({ value: x.id, label: `${x.name} · ${x.level}` }))}
          />
        </Field>
      ) : (
        <Field label="Student">
          <TextInput value={l ? `${l.name} · ${l.id}` : ""} readOnly />
        </Field>
      )}

      {kind === "Interruption of study" && (
        <>
          <Field label="Pause from" required>
            <TextInput type="date" value={d.from} onChange={(e) => set("from", e.target.value)} />
          </Field>
          <Field label="Planned return" required>
            <TextInput
              type="date"
              value={d.returnDate}
              onChange={(e) => set("returnDate", e.target.value)}
            />
          </Field>
        </>
      )}
      {kind === "Leave of absence" && (
        <>
          <Field label="First day away" required>
            <TextInput type="date" value={d.from} onChange={(e) => set("from", e.target.value)} />
          </Field>
          <Field label="Last day away" required>
            <TextInput type="date" value={d.to} onChange={(e) => set("to", e.target.value)} />
          </Field>
        </>
      )}
      {kind === "Withdrawal" && (
        <Field label="Last day" required>
          <TextInput
            type="date"
            value={d.lastDay}
            onChange={(e) => set("lastDay", e.target.value)}
          />
        </Field>
      )}
      {kind === "Deferral" && (
        <Field label="Defer to" required hint="e.g. September 2027 intake">
          <TextInput value={d.deferTo} onChange={(e) => set("deferTo", e.target.value)} />
        </Field>
      )}
      {kind === "Programme transfer" && (
        <>
          <Field label="New programme" required>
            <Select
              value={d.toProgramme}
              onChange={(e) => set("toProgramme", e.target.value)}
              options={otherProgrammes.map((p) => ({ value: p.id, label: `${p.award} ${p.name}` }))}
            />
          </Field>
          <Field label="Entry stage">
            <Select
              value={toLevel}
              onChange={(e) => set("toLevel", e.target.value)}
              options={(target?.stages ?? []).map((s) => ({ value: s.name, label: s.name }))}
            />
          </Field>
          <Field label="Start on new programme">
            <TextInput type="date" value={d.from} onChange={(e) => set("from", e.target.value)} />
          </Field>
        </>
      )}
      {kind === "Progression" && (
        <Field label="Move to" hint={`Now: ${l?.level ?? "—"}`}>
          <TextInput value={progressTo ?? "Final stage — nothing to progress to"} readOnly />
        </Field>
      )}
      {kind === "Change of study mode" && (
        <>
          <Field label="New mode" hint={`Now: ${l?.mode ?? "—"}`}>
            <Select
              value={d.newMode}
              onChange={(e) => set("newMode", e.target.value)}
              options={["Full-time", "Part-time"].map((m) => ({ value: m, label: m }))}
            />
          </Field>
          <Field label="From">
            <TextInput type="date" value={d.from} onChange={(e) => set("from", e.target.value)} />
          </Field>
        </>
      )}
      {kind === "Project proposal" && (
        <>
          <Field label="Project topic" required className="sm:col-span-2">
            <TextInput
              value={d.topic}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="Working title"
            />
          </Field>
          <Field label="Proposed supervisor">
            <Select
              value={d.supervisor}
              onChange={(e) => set("supervisor", e.target.value)}
              options={supervisors.map((s) => ({ value: s, label: s }))}
            />
          </Field>
          <Field label="Approach">
            <TextInput
              value={d.method}
              onChange={(e) => set("method", e.target.value)}
              placeholder="Method, data, deliverable"
            />
          </Field>
        </>
      )}

      <Field label="Reason" required className="sm:col-span-2">
        <TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </Field>

      {l?.visa?.sponsored && visaReportable({ kind, details: d } as StudentRequest) && (
        <div className="sm:col-span-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs flex gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-warning-foreground" />
          You study on a sponsored visa. If approved, the university must report this change to the
          immigration authority. Talk to the international office first.
        </div>
      )}

      <div className="sm:col-span-2 text-xs">
        <div className="text-muted-foreground mb-1">Approval route</div>
        <div className="flex flex-wrap items-center gap-1">
          {chain.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">→</span>}
              <Badge tone="muted">
                {s.role} · {s.assignee}
              </Badge>
            </span>
          ))}
        </div>
      </div>

      {ctx.type === "school" && guardian.field}
    </FormDialog>
  );
}

/* ── Staff ───────────────────────────────────────────────────────────────── */

type StaffTab = "mine" | "all" | "decided" | "effects";

function StaffView() {
  const ctx = useTenantContext();
  const me = ctx.user?.name ?? "";
  const admin = ctx.isAdmin;
  const all = useCollection("studentRequests");
  const learners = useCollection("learners");
  const [tab, setTab] = useTab<StaffTab>("mine");
  const [roleFilter, setRoleFilter] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const tenant = all
    .filter((r) => r.tenantId === ctx.tenantId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const involved = admin ? tenant : tenant.filter((r) => r.steps.some((s) => s.assignee === me));
  const waiting = involved.filter((r) => {
    const s = currentStep(r);
    if (!s || s.decision === "Returned") return false;
    if (!admin) return s.assignee === me;
    return roleFilter === "All" || s.role === roleFilter;
  });
  const decided = tenant.filter((r) => r.steps.some((s) => s.decision && s.by?.startsWith(me)));
  const withEffects = tenant.filter((r) => r.effects?.length);
  const roles = Array.from(
    new Set(tenant.flatMap((r) => (currentStep(r) ? [currentStep(r)!.role] : []))),
  ).sort();
  const learner = (id: string) => learners.find((l) => l.id === id);

  const rows =
    tab === "mine"
      ? waiting
      : tab === "decided"
        ? decided
        : tab === "effects"
          ? withEffects
          : involved;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={admin ? "Waiting for a decision" : "Waiting for me"}
          value={waiting.length}
          icon={<Inbox className="h-4 w-4" />}
          accent="warning"
        />
        <StatCard
          label="Open requests"
          value={
            involved.filter((r) => r.status === "Submitted" || r.status === "In review").length
          }
          hint={`${involved.filter(isReturned).length} returned to student`}
          icon={<Clock className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Approved"
          value={involved.filter((r) => r.status === "Approved").length}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Effects applied"
          value={withEffects.reduce((a, r) => a + (r.effects?.length ?? 0), 0)}
          hint="Record, fee and visa updates"
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <Section
        title="Approvals"
        actions={
          admin && tab === "mine" ? (
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: "All", label: "All steps" },
                ...roles.map((r) => ({ value: r, label: r })),
              ]}
              className="h-8 text-xs w-48"
            />
          ) : undefined
        }
      >
        <Tabs<StaffTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "mine", label: admin ? "Waiting" : "Waiting for me", count: waiting.length },
            {
              id: "all",
              label: admin ? "All requests" : "My students' requests",
              count: involved.length,
            },
            { id: "decided", label: "Decided by me", count: decided.length },
            ...(admin
              ? [{ id: "effects" as StaffTab, label: "Applied effects", count: withEffects.length }]
              : []),
          ]}
        />
        {tab === "effects" ? (
          <div className="space-y-3">
            {withEffects.map((r) => (
              <button
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className="w-full text-left rounded-lg border p-3 hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {r.kind} · {learner(r.studentId)?.name ?? r.studentId}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{r.id}</span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {r.effects!.map((e, i) => (
                    <li key={i} className="text-xs flex gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-px" />
                      {e}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
            {!withEffects.length && (
              <div className="text-sm text-muted-foreground">No approved requests yet.</div>
            )}
          </div>
        ) : (
          <DataTable
            columns={[
              { key: "student", label: "Student" },
              { key: "kind", label: "Request" },
              { key: "step", label: "Current step" },
              { key: "age", label: "Open" },
              { key: "status", label: "Status" },
              { key: "_a", label: "", className: "text-right" },
            ]}
            rows={rows}
            emptyText={tab === "mine" ? "Nothing waiting — you're up to date." : "No requests."}
            renderCell={(r: StudentRequest, key) => {
              const l = learner(r.studentId);
              const s = currentStep(r);
              if (key === "student")
                return (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={l?.name ?? r.studentId} seed={r.studentId} size={30} />
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5">
                        {l?.name ?? r.studentId}
                        {l?.visa?.sponsored && <Badge tone="info">Visa</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.studentId} · {l?.level}
                      </div>
                    </div>
                  </div>
                );
              if (key === "kind")
                return (
                  <div>
                    <div className="font-medium">{r.kind}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.id} · {detailSummary(r)}
                    </div>
                  </div>
                );
              if (key === "step")
                return s ? (
                  <div className="text-xs">
                    <div>{s.role}</div>
                    <div className="text-muted-foreground">{s.assignee}</div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Closed</span>
                );
              if (key === "age")
                return s ? (
                  <span className="text-xs">{daysOpen(r.submittedAt)} d</span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                );
              if (key === "status") return <StatusPill status={displayStatus(r)} />;
              if (key === "_a")
                return (
                  <Button
                    size="sm"
                    variant={tab === "mine" ? "primary" : "outline"}
                    onClick={() => setOpenId(r.id)}
                  >
                    {tab === "mine" ? "Review" : "View"}
                  </Button>
                );
            }}
          />
        )}
      </Section>

      <RequestSheet id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

/* ── Request detail (shared) ─────────────────────────────────────────────── */

function RequestSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const all = useCollection("studentRequests");
  const r = all.find((x) => x.id === id);
  return (
    <Sheet open={!!r} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {r && <RequestDetail r={r} />}
      </SheetContent>
    </Sheet>
  );
}

function RequestDetail({ r }: { r: StudentRequest }) {
  const ctx = useTenantContext();
  const learners = useCollection("learners");
  const programmes = useCollection("programmes");
  const feeAccounts = useCollection("feeAccounts");
  const mine = useScopedLearners();
  const [note, setNote] = useState("");
  const l = learners.find((x) => x.id === r.studentId);
  const step = currentStep(r);
  const role = ctx.user?.role;
  const me = ctx.user?.name ?? "";
  const canDecide =
    !!step &&
    step.decision !== "Returned" &&
    (ctx.isAdmin || (role === "teacher" && step.assignee === me));
  const isRequester =
    (role === "student" || role === "parent") && mine.some((x) => x.id === r.studentId);
  const open = r.status === "Submitted" || r.status === "In review";
  const progName = (pid: string) => {
    const p = programmes.find((x) => x.id === pid);
    return p ? `${p.award} ${p.name}` : pid;
  };
  const preview = previewEffects(r, l, ctx.profile?.region, progName);
  const isLastStep = step ? r.steps.indexOf(step) === r.steps.length - 1 : false;

  const decide = (decision: NonNullable<RequestStep["decision"]>) => {
    if (!step || !l) return;
    if (decision !== "Approved" && !note.trim())
      return toast.error("Add a note so the student knows why.");
    const now = new Date().toISOString();
    const by = step.assignee === me ? me : `${me} (for ${step.role})`;
    const idx = r.steps.indexOf(step);
    const steps = r.steps.map((s, i) =>
      i === idx ? { ...s, decision, by, at: now, note: note.trim() || undefined } : s,
    );
    const history = [
      ...(r.history ?? []),
      { at: now, by, action: decision, role: step.role, note: note.trim() || undefined },
    ];
    const next = steps.find((s, i) => i > idx && s.decision !== "Approved");
    let status: StudentRequest["status"] = "In review";
    let effects: string[] | undefined;
    if (decision === "Rejected") status = "Rejected";
    if (decision === "Approved" && !next) {
      status = "Approved";
      effects = applyEffects(r, l, feeAccounts, programmes, ctx, by);
    }
    updateItem("studentRequests", (x) => x.id === r.id, {
      steps,
      history,
      status,
      ...(effects ? { effects } : {}),
    });
    const shown = decision === "Returned" ? "Returned" : status;
    logChange({
      tenantId: r.tenantId,
      entity: "request",
      entityId: r.id,
      studentId: r.studentId,
      field: `${step.role} decision`,
      from: displayStatus(r),
      to: shown,
      by,
      reason: note.trim() || undefined,
    });
    const who = requesters(r, l, ctx.type);
    const subject =
      decision === "Approved"
        ? next
          ? `${r.kind} (${r.id}): ${step.role} approved — now with ${next.role}`
          : `${r.kind} (${r.id}) approved`
        : decision === "Rejected"
          ? `${r.kind} (${r.id}) not approved`
          : `${r.kind} (${r.id}) returned — please reply`;
    for (const t of who)
      notify({
        tenantId: r.tenantId,
        channel: ctx.type === "school" ? "App" : "Email",
        to: t,
        subject,
        body: effects?.length ? effects.join(" · ") : note.trim() || undefined,
        source: SOURCE,
        relatedId: r.id,
      });
    if (decision === "Approved" && next)
      notify({
        tenantId: r.tenantId,
        channel: "Email",
        to: next.assignee,
        subject: `Approval needed (${next.role}): ${r.kind} — ${l.name}`,
        source: SOURCE,
        relatedId: r.id,
      });
    setNote("");
    if (effects)
      toast.success(`Approved — ${effects.length} change${effects.length > 1 ? "s" : ""} applied`);
    else if (decision === "Approved") toast.success(`Approved — sent to ${next?.assignee}`);
    else
      toast(
        `${decision === "Rejected" ? "Rejected" : "Returned to student"} — they've been notified`,
      );
  };

  const withdraw = () => {
    const now = new Date().toISOString();
    updateItem("studentRequests", (x) => x.id === r.id, {
      status: "Withdrawn",
      history: [...(r.history ?? []), { at: now, by: ctx.actingAs, action: "Withdrawn" }],
    });
    logChange({
      tenantId: r.tenantId,
      entity: "request",
      entityId: r.id,
      studentId: r.studentId,
      field: "status",
      from: displayStatus(r),
      to: "Withdrawn",
      by: ctx.actingAs,
    });
    if (step)
      notify({
        tenantId: r.tenantId,
        channel: "Email",
        to: step.assignee,
        subject: `${r.kind} (${r.id}) withdrawn by the requester`,
        source: SOURCE,
        relatedId: r.id,
      });
    toast("Request withdrawn");
  };

  const resubmit = () => {
    if (!step) return;
    if (!note.trim()) return toast.error("Add your reply.");
    const now = new Date().toISOString();
    const idx = r.steps.indexOf(step);
    updateItem("studentRequests", (x) => x.id === r.id, {
      steps: r.steps.map((s, i) => (i === idx ? { role: s.role, assignee: s.assignee } : s)),
      history: [
        ...(r.history ?? []),
        { at: now, by: ctx.actingAs, action: "Resubmitted", note: note.trim() },
      ],
    });
    logChange({
      tenantId: r.tenantId,
      entity: "request",
      entityId: r.id,
      studentId: r.studentId,
      field: "status",
      from: "Returned",
      to: r.status,
      by: ctx.actingAs,
      reason: note.trim(),
    });
    notify({
      tenantId: r.tenantId,
      channel: "Email",
      to: step.assignee,
      subject: `${r.kind} (${r.id}) resubmitted — ready for ${step.role}`,
      body: note.trim(),
      source: SOURCE,
      relatedId: r.id,
    });
    setNote("");
    toast.success(`Sent back to ${step.assignee}`);
  };

  return (
    <div className="space-y-5">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 pr-6">
          <LucideIcon name={KIND_INFO[r.kind].icon} className="h-5 w-5 text-primary" />
          {r.kind}
          <StatusPill status={displayStatus(r)} />
        </SheetTitle>
        <SheetDescription>
          {r.id} · submitted {fmt(r.submittedAt)} by {r.submittedBy}
        </SheetDescription>
      </SheetHeader>

      {l && (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Avatar name={l.name} seed={l.id} size={40} />
          <div className="min-w-0 text-sm">
            <div className="font-medium flex items-center gap-1.5 flex-wrap">
              {l.name}
              <StatusPill status={l.status} />
              {l.visa?.sponsored && <Badge tone="info">Sponsored visa</Badge>}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {l.id} · {l.level}
              {l.programmeId ? ` · ${progName(l.programmeId)}` : ""}
              {l.mode ? ` · ${l.mode}` : ""}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {Object.entries(r.details).map(([k, v]) => (
          <div key={k}>
            <div className="text-[11px] text-muted-foreground">{DETAIL_LABEL[k] ?? k}</div>
            <div>
              {k === "toProgramme" ? progName(v) : /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmt(v) : v}
            </div>
          </div>
        ))}
        <div className="col-span-2">
          <div className="text-[11px] text-muted-foreground">Reason</div>
          <div className="whitespace-pre-line">{r.reason}</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium mb-2">Approval route</div>
        <ol className="space-y-2">
          {r.steps.map((s, i) => {
            const isCurrent = s === step;
            const icon =
              s.decision === "Approved" ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : s.decision === "Rejected" ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : s.decision === "Returned" ? (
                <CornerUpLeft className="h-4 w-4 text-warning-foreground" />
              ) : (
                <Clock
                  className={`h-4 w-4 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
                />
              );
            return (
              <li
                key={i}
                className={`flex gap-2.5 rounded-lg border p-2.5 text-sm ${isCurrent ? "border-primary/50 bg-primary/5" : ""}`}
              >
                <span className="mt-0.5">{icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.role}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {s.decision ? `${s.decision} ${fmt(s.at)}` : isCurrent ? "Waiting" : "Next"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.by && s.by !== s.assignee ? s.by : s.assignee}
                  </div>
                  {s.note && <div className="text-xs mt-1 italic">“{s.note}”</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {r.effects?.length ? (
        <div className="rounded-lg border border-success/40 bg-success/5 p-3">
          <div className="text-xs font-medium mb-1.5">Applied on approval</div>
          <ul className="space-y-1">
            {r.effects.map((e, i) => (
              <li key={i} className="text-xs flex gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-px" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      ) : open && preview.length ? (
        <div className="rounded-lg border border-dashed p-3">
          <div className="text-xs font-medium mb-1.5">On final approval</div>
          <ul className="space-y-0.5 text-xs text-muted-foreground list-disc pl-4">
            {preview.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {canDecide && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="text-xs font-medium">
            Your decision · {step!.role}
            {step!.assignee !== me && (
              <span className="text-muted-foreground font-normal">
                {" "}
                (acting for {step!.assignee})
              </span>
            )}
          </div>
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Note (needed to reject or return)"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => decide("Approved")}>
              <CheckCircle2 className="h-4 w-4" /> {isLastStep ? "Approve & apply" : "Approve"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide("Returned")}>
              <CornerUpLeft className="h-4 w-4" /> Return
            </Button>
            <Button size="sm" variant="destructive" onClick={() => decide("Rejected")}>
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      )}

      {isRequester && open && (
        <div className="rounded-lg border p-3 space-y-2">
          {isReturned(r) && (
            <>
              <div className="text-xs font-medium">Reply to {step?.assignee}</div>
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {isReturned(r) && (
              <Button size="sm" onClick={resubmit}>
                Resubmit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={withdraw}>
              Withdraw request
            </Button>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-medium mb-2">History</div>
        <ol className="border-l pl-4 space-y-2.5">
          {(r.history ?? []).map((h, i) => (
            <li key={i} className="text-xs relative">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
              <div>
                <span className="font-medium">{h.action}</span>
                {h.role ? ` · ${h.role}` : ""} — {h.by}
              </div>
              <div className="text-muted-foreground">
                {new Date(h.at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {h.note ? ` · “${h.note}”` : ""}
              </div>
            </li>
          ))}
          {r.status === "Approved" && r.effects?.length ? (
            <li className="text-xs relative">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-success" />
              <span className="font-medium">Effects applied</span> — {r.effects.length} change
              {r.effects.length > 1 ? "s" : ""}
            </li>
          ) : null}
        </ol>
      </div>
    </div>
  );
}
