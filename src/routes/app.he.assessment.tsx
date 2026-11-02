import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Gavel,
  History,
  LifeBuoy,
  Megaphone,
  Paperclip,
  Scale,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  PageHeader,
  Section,
  DataTable,
  Badge,
  Button,
  FormDialog,
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Select,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { PackContextBar, PackEmpty, StatusPill, Tabs } from "@/components/packs/PackUI";
import { useHeData, provisionalGroups, fmtDate, type HeData } from "@/components/packs/HeDash";
import { addItem, nextId, updateItem } from "@/lib/store";
import { classify } from "@/lib/packs/regions";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import {
  moduleOutcome,
  pgtClassification,
  stageSummary,
  suggestOutcome,
  NEXT_BOARDS,
  type BoardOutcome,
  type EcClaim,
  type HeModule,
  type ModuleMark,
} from "@/lib/packs/heData";
import { notify, logChange } from "@/lib/packs/sis/activity";
import {
  APPEAL_GROUNDS,
  appealDeadline,
  batchCovers,
  sameScope,
  type AppealGround,
  type GradeAppeal,
  type MarkBatch,
} from "@/lib/packs/sis/results";
import {
  GpaPanel,
  GradeChip,
  moduleResults,
  releaseNote,
  useResults,
  visibleMarks,
} from "@/components/packs/ResultsUI";

export const Route = createFileRoute("/app/he/assessment")({
  head: () => ({ meta: [{ title: "Assessment & Boards — 1StudentID" }] }),
  component: AssessmentPage,
});

type Tab =
  | "marks"
  | "moderation"
  | "approval"
  | "release"
  | "ec"
  | "appeals"
  | "board"
  | "mine"
  | "myappeals";

const OPEN_APPEAL: GradeAppeal["status"][] = ["Submitted", "Under review"];

function AssessmentPage() {
  const d = useHeData();
  const r = useResults();
  const role = d.ctx.user?.role;
  const student = role === "student";
  const admin = d.ctx.isAdmin;
  const myIds = new Set(d.myModules.map((m) => m.id));
  const tabs: { id: Tab; label: string; count?: number }[] = student
    ? [
        { id: "ec", label: "Extenuating circumstances" },
        { id: "mine", label: "My results" },
        {
          id: "myappeals",
          label: "My appeals",
          count: r.appeals.filter((a) => a.studentId === d.me?.id).length,
        },
      ]
    : [
        { id: "marks", label: "Marks entry" },
        { id: "moderation", label: "Moderation", count: provisionalGroups(d).length },
        {
          id: "approval",
          label: admin ? "Mark approval" : "My mark batches",
          count: admin
            ? r.batches.filter((b) => b.status === "Submitted").length
            : r.batches.filter((b) => myIds.has(b.moduleId) && b.status === "Returned").length,
        },
        ...(admin
          ? [
              {
                id: "release" as Tab,
                label: "Results release",
                count: r.batches.filter((b) => b.status === "Approved").length,
              },
            ]
          : []),
        {
          id: "ec",
          label: "Extenuating circumstances",
          count: d.ecs.filter(
            (e) => e.status === "Submitted" || e.status === "More evidence needed",
          ).length,
        },
        ...(admin
          ? [
              {
                id: "appeals" as Tab,
                label: "Appeals",
                count: r.appeals.filter((a) => OPEN_APPEAL.includes(a.status)).length,
              },
              {
                id: "board" as Tab,
                label: "Exam board",
                count: d.decisions.filter((x) => !x.ratified).length,
              },
            ]
          : []),
      ];
  const [tab, setTab] = useState<Tab>(tabs[0].id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={student ? "Results, Appeals & Extenuating Circumstances" : "Assessment & Boards"}
        subtitle={
          student
            ? "See your released results and GPA, appeal a result, or tell us when something outside your control affects an assessment."
            : "Marks → moderation → approval → release to students → appeals, EC panel and the board of examiners."
        }
      />
      <PackContextBar pack="higher-ed" />
      {d.modules.length === 0 ? (
        <PackEmpty
          pack="higher-ed"
          title="No modules yet"
          body="Assessment opens once programmes and modules are set up."
        />
      ) : (
        <>
          <Tabs<Tab> tabs={tabs} value={tab} onChange={setTab} />
          {tab === "marks" && <MarksEntry />}
          {tab === "moderation" && <Moderation />}
          {tab === "approval" && <Approvals />}
          {tab === "release" && <Release />}
          {tab === "ec" && (student ? <StudentEc /> : <EcPanel />)}
          {tab === "appeals" && <AppealsQueue />}
          {tab === "board" && <ExamBoard />}
          {tab === "mine" && <MyResults onGoEc={() => setTab("ec")} />}
          {tab === "myappeals" && <MyAppeals onGoEc={() => setTab("ec")} />}
        </>
      )}
    </div>
  );
}

/* ── Marks entry ─────────────────────────────────────────────────────────── */

function MarksEntry() {
  const d = useHeData();
  const teacher = d.ctx.user?.role === "teacher";
  const pool = teacher
    ? d.myModules
    : d.modules.filter(
        (m) => d.regs.some((r) => r.moduleId === m.id) || d.marks.some((x) => x.moduleId === m.id),
      );
  const [moduleId, setModuleId] = useState(pool[0]?.id ?? "");
  const mod = d.moduleById(moduleId) ?? pool[0];
  const [componentId, setComponentId] = useState("c1");
  const [year, setYear] = useState(d.academicYear);
  const { batches } = useResults();
  const [submitting, setSubmitting] = useState(false);
  if (!mod) return <div className="text-sm text-muted-foreground">You don't lead any modules.</div>;
  const comp = mod.components.find((c) => c.id === componentId) ?? mod.components[0];
  /** Batch that locks this component's marks (submitted, approved or published). */
  const lockFor = (attempt: 1 | 2) =>
    batches.find(
      (b) =>
        (b.status === "Submitted" || b.status === "Approved" || b.status === "Published") &&
        b.moduleId === mod.id &&
        b.attempt === attempt &&
        (b.academicYear ?? "") === year &&
        (!b.componentIds?.length || b.componentIds.includes(comp.id)),
    );
  const moduleBatches = batches.filter(
    (b) => b.moduleId === mod.id && (b.academicYear ?? "") === year,
  );
  const programme = d.programmes.find((p) =>
    p.stages.some((s) => [...s.coreModuleIds, ...s.optionalModuleIds].includes(mod.id)),
  );
  const passMark = programme?.passMark ?? 40;
  const years = Array.from(
    new Set([
      d.academicYear,
      ...d.marks.filter((m) => m.moduleId === mod.id).map((m) => m.academicYear ?? ""),
    ]),
  ).filter(Boolean);

  // Students = registered this year ∪ anyone with a mark in this year.
  const ids = Array.from(
    new Set([
      ...d.regs
        .filter(
          (r) => r.moduleId === mod.id && r.academicYear === year && r.status === "Registered",
        )
        .map((r) => r.studentId),
      ...d.marks
        .filter((m) => m.moduleId === mod.id && m.academicYear === year)
        .map((m) => m.studentId),
    ]),
  );
  const rows = ids.flatMap((studentId) => {
    const attempts = d.marks.filter(
      (m) =>
        m.studentId === studentId &&
        m.moduleId === mod.id &&
        m.componentId === comp.id &&
        m.academicYear === year,
    );
    const hasResit = attempts.some((a) => a.attempt === 2);
    return hasResit
      ? [
          { studentId, attempt: 1 as const },
          { studentId, attempt: 2 as const },
        ]
      : [{ studentId, attempt: 1 as const }];
  });
  const find = (studentId: string, attempt: 1 | 2) =>
    d.marks.find(
      (m) =>
        m.studentId === studentId &&
        m.moduleId === mod.id &&
        m.componentId === comp.id &&
        m.attempt === attempt &&
        m.academicYear === year,
    );

  const save = (studentId: string, attempt: 1 | 2, patch: Partial<ModuleMark>) => {
    const existing = find(studentId, attempt);
    if (existing) {
      updateItem("moduleMarks", (x) => x.id === existing.id, { ...patch, status: "Provisional" });
    } else {
      addItem("moduleMarks", {
        id: nextId("MK-", "moduleMarks"),
        tenantId: d.tenantId,
        studentId,
        moduleId: mod.id,
        componentId: comp.id,
        attempt,
        status: "Provisional",
        academicYear: year,
        ...patch,
      });
    }
  };
  const entered = rows.filter((r) => find(r.studentId, r.attempt)?.mark !== undefined).length;

  return (
    <Section
      title={`${mod.code} ${mod.title}`}
      description={`${comp.name} · ${comp.type} · ${comp.weight}% of module · due ${fmtDate(comp.due)} · pass mark ${passMark}%`}
      actions={
        <>
          <Select
            className="h-8 w-56"
            value={mod.id}
            onChange={(e) => {
              setModuleId(e.target.value);
              setComponentId("c1");
            }}
            options={pool.map((m) => ({ value: m.id, label: `${m.code} — ${m.title}` }))}
          />
          <Select
            className="h-8 w-44"
            value={comp.id}
            onChange={(e) => setComponentId(e.target.value)}
            options={mod.components.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.weight}%)`,
            }))}
          />
          <Select
            className="h-8 w-28"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={years.map((y) => ({ value: y, label: y }))}
          />
        </>
      }
    >
      <DataTable
        columns={[
          { key: "student", label: "Student" },
          { key: "attempt", label: "Attempt" },
          { key: "mark", label: "Mark" },
          { key: "flag", label: "Flag" },
          { key: "status", label: "Status" },
          { key: "module", label: "Module result" },
        ]}
        rows={rows}
        emptyText="No students registered for this module in this year."
        renderCell={(r: { studentId: string; attempt: 1 | 2 }, key) => {
          const m = find(r.studentId, r.attempt);
          const lock = lockFor(r.attempt);
          const locked = m?.status === "Confirmed" || !!lock;
          switch (key) {
            case "student":
              return (
                <div className="flex items-center gap-2.5">
                  <Avatar name={d.name(r.studentId)} seed={r.studentId} size={28} />
                  <div>
                    <div className="font-medium">{d.name(r.studentId)}</div>
                    <div className="text-[11px] text-muted-foreground">{r.studentId}</div>
                  </div>
                </div>
              );
            case "attempt":
              return r.attempt === 2 ? (
                <Badge tone="warning">Resit</Badge>
              ) : (
                <Badge tone="muted">First</Badge>
              );
            case "mark":
              return (
                <NumberInput
                  key={`${m?.id}-${m?.mark}`}
                  className="h-8 w-20"
                  min={0}
                  max={100}
                  disabled={locked}
                  defaultValue={m?.mark ?? ""}
                  placeholder="—"
                  onBlur={(e) => {
                    const v =
                      e.target.value === ""
                        ? undefined
                        : Math.max(0, Math.min(100, Number(e.target.value)));
                    if (v === m?.mark) return;
                    save(r.studentId, r.attempt, { mark: v });
                  }}
                />
              );
            case "flag":
              return (
                <Select
                  className="h-8 w-40"
                  disabled={locked}
                  value={m?.flag ?? ""}
                  onChange={(e) =>
                    save(r.studentId, r.attempt, {
                      flag: (e.target.value || undefined) as ModuleMark["flag"],
                    })
                  }
                  options={[
                    { value: "", label: "—" },
                    { value: "EC", label: "EC" },
                    { value: "Late penalty", label: "Late penalty" },
                    { value: "Academic misconduct", label: "Academic misconduct" },
                  ]}
                />
              );
            case "status":
              return (
                <div className="flex items-center gap-1 flex-wrap">
                  {m ? (
                    <StatusPill status={m.status} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not entered</span>
                  )}
                  {lock && <Badge tone="muted">{lock.status}</Badge>}
                </div>
              );
            case "module": {
              const o = moduleOutcome(mod, d.marks, r.studentId, passMark);
              if (o.mark === undefined)
                return <span className="text-xs text-muted-foreground">—</span>;
              return (
                <span
                  className={`text-sm font-medium ${o.complete && !o.passed ? "text-destructive" : ""}`}
                >
                  {o.mark}%
                  {!o.complete && (
                    <span className="text-[10px] text-muted-foreground font-normal"> partial</span>
                  )}
                  {o.capped && (
                    <span className="text-[10px] text-warning-foreground font-normal"> capped</span>
                  )}
                </span>
              );
            }
          }
        }}
      />
      <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">
          {entered}/{rows.length} marks entered · marks lock once submitted for approval
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast.success(
                `${mod.code} ${comp.name}: ${entered} marks sent to the second marker for moderation`,
              )
            }
          >
            <Scale className="h-3.5 w-3.5" /> Submit for moderation
          </Button>
          <Button size="sm" onClick={() => setSubmitting(true)}>
            <Send className="h-3.5 w-3.5" /> Submit for approval
          </Button>
        </div>
      </div>
      {moduleBatches.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Mark batches · {year}
          </div>
          {moduleBatches.map((b) => (
            <BatchLine key={b.id} b={b} mod={mod} />
          ))}
        </div>
      )}
      {submitting && (
        <SubmitBatchDialog
          mod={mod}
          year={year}
          defaultComponent={comp.id}
          onClose={() => setSubmitting(false)}
        />
      )}
    </Section>
  );
}

/* ── Mark batches: checks, submit, approve / return ──────────────────────── */

function scopeLabel(mod: HeModule, b: Pick<MarkBatch, "componentIds" | "attempt">) {
  const comps = b.componentIds?.length
    ? mod.components
        .filter((c) => b.componentIds!.includes(c.id))
        .map((c) => c.name)
        .join(", ")
    : "All components";
  return `${comps}${b.attempt === 2 ? " · resit" : ""}`;
}

function BatchLine({ b, mod }: { b: MarkBatch; mod: HeModule }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs">
      <div className="min-w-0">
        <div className="font-medium">{scopeLabel(mod, b)}</div>
        {b.status === "Returned" && b.returnedNote && (
          <div className="text-destructive mt-0.5">Returned: {b.returnedNote}</div>
        )}
        {b.status === "Approved" && (
          <div className="text-muted-foreground mt-0.5">
            Approved by {b.approvedBy}
            {b.releaseDate ? ` · releases ${fmtDate(b.releaseDate)}` : " · release date not set"}
          </div>
        )}
        {b.status === "Published" && (
          <div className="text-muted-foreground mt-0.5">
            Released {fmtDate(b.publishedAt)} by {b.publishedBy}
          </div>
        )}
      </div>
      <StatusPill status={b.status} />
    </div>
  );
}

interface BatchCheck {
  ok: boolean;
  label: string;
  detail?: string;
}

/** Validate a batch: every student has every in-scope component (or an EC), marks in
 *  range, flags resolved — and, for approval, moderation complete. */
function batchChecks(
  d: HeData,
  mod: HeModule,
  year: string,
  attempt: number,
  componentIds?: string[],
) {
  const comps = componentIds?.length
    ? mod.components.filter((c) => componentIds.includes(c.id))
    : mod.components;
  const inScope = d.marks.filter(
    (m) =>
      m.moduleId === mod.id &&
      (m.academicYear ?? "") === year &&
      m.attempt === attempt &&
      comps.some((c) => c.id === m.componentId),
  );
  const students = Array.from(
    new Set([
      ...(attempt === 1
        ? d.regs
            .filter(
              (r) => r.moduleId === mod.id && r.academicYear === year && r.status === "Registered",
            )
            .map((r) => r.studentId)
        : []),
      ...inScope.map((m) => m.studentId),
    ]),
  );
  const missing: string[] = [];
  let deferred = 0;
  for (const s of students) {
    for (const c of comps) {
      const mk = inScope.find(
        (m) => m.studentId === s && m.componentId === c.id && m.mark !== undefined,
      );
      if (mk) continue;
      const ec = d.ecs.find(
        (e) =>
          e.studentId === s &&
          e.moduleId === mod.id &&
          (!e.componentId || e.componentId === c.id) &&
          e.status !== "Rejected",
      );
      if (ec) deferred++;
      else missing.push(`${d.name(s)} — ${c.name}`);
    }
  }
  const entered = inScope.filter((m) => m.mark !== undefined);
  const outOfRange = entered.filter((m) => m.mark! < 0 || m.mark! > 100);
  const misconduct = inScope.filter((m) => m.flag === "Academic misconduct");
  const provisional = entered.filter((m) => m.status === "Provisional");
  const submitChecks: BatchCheck[] = [
    {
      ok: students.length > 0 && missing.length === 0,
      label: `Every student has every component (${students.length} students × ${comps.length})`,
      detail: missing.length
        ? `Missing: ${missing.slice(0, 4).join("; ")}${missing.length > 4 ? ` +${missing.length - 4} more` : ""}`
        : deferred
          ? `${deferred} deferred by an EC claim`
          : undefined,
    },
    {
      ok: outOfRange.length === 0,
      label: "Marks within 0–100",
      detail: outOfRange.length ? `${outOfRange.length} out of range` : undefined,
    },
    {
      ok: misconduct.length === 0,
      label: "Flags resolved",
      detail: misconduct.length
        ? `${misconduct.length} academic misconduct flag(s) awaiting a panel outcome`
        : undefined,
    },
  ];
  const moderation: BatchCheck = {
    ok: provisional.length === 0,
    label: "Moderation complete",
    detail: provisional.length
      ? `${provisional.length} mark(s) still provisional — agree them in the Moderation tab first`
      : undefined,
  };
  const canSubmit = submitChecks.every((c) => c.ok);
  return {
    students,
    entered,
    submitChecks,
    moderation,
    canSubmit,
    canApprove: canSubmit && moderation.ok,
  };
}

function ChecksList({ checks }: { checks: BatchCheck[] }) {
  return (
    <ul className="space-y-1.5 text-xs">
      {checks.map((c) => (
        <li key={c.label} className="flex items-start gap-2">
          {c.ok ? (
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
          )}
          <span>
            <span className="font-medium">{c.label}</span>
            {c.detail && <span className="block text-muted-foreground">{c.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SubmitBatchDialog({
  mod,
  year,
  defaultComponent,
  onClose,
}: {
  mod: HeModule;
  year: string;
  defaultComponent: string;
  onClose: () => void;
}) {
  const d = useHeData();
  const { batches } = useResults();
  const hasResit = d.marks.some(
    (m) => m.moduleId === mod.id && (m.academicYear ?? "") === year && m.attempt === 2,
  );
  const allEntered = mod.components.every((c) =>
    d.marks.some(
      (m) =>
        m.moduleId === mod.id &&
        (m.academicYear ?? "") === year &&
        m.componentId === c.id &&
        m.mark !== undefined,
    ),
  );
  const [scope, setScope] = useState(allEntered ? "all" : defaultComponent);
  const [attempt, setAttempt] = useState(1);
  const componentIds = scope === "all" ? undefined : [scope];
  const checks = batchChecks(d, mod, year, attempt, componentIds);
  const shape = { moduleId: mod.id, attempt, academicYear: year, componentIds };
  const existing = batches.find((b) => sameScope(b, shape));
  const me = d.ctx.user?.name ?? "Module leader";

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Submit marks for approval"
      description={`${mod.code} ${mod.title} · ${year}. The Head of Academic Affairs approves, then results are released to students.`}
      submitLabel="Submit for approval"
      onSubmit={() => {
        if (existing && existing.status !== "Draft" && existing.status !== "Returned") {
          toast.error(`This batch is already ${existing.status.toLowerCase()}`);
          return;
        }
        if (!checks.canSubmit) {
          toast.error("Fix the failed checks first");
          return;
        }
        const at = new Date().toISOString();
        const id = existing?.id ?? nextId("MB-", "markBatches");
        if (existing) {
          updateItem("markBatches", (x) => x.id === existing.id, {
            status: "Submitted",
            submittedBy: me,
            submittedAt: at,
            returnedNote: undefined,
          });
        } else {
          addItem("markBatches", {
            id,
            tenantId: d.tenantId,
            ...shape,
            status: "Submitted",
            submittedBy: me,
            submittedAt: at,
          });
        }
        logChange({
          tenantId: d.tenantId,
          entity: "markBatch",
          entityId: id,
          field: "status",
          from: existing?.status ?? "Draft",
          to: "Submitted",
          by: me,
          reason: `${mod.code} · ${scopeLabel(mod, shape)} · ${checks.entered.length} marks`,
        });
        notify({
          tenantId: d.tenantId,
          channel: "App",
          to: "Head of Academic Affairs",
          subject: `${mod.code} marks submitted for approval`,
          body: `${me} submitted ${scopeLabel(mod, shape)} (${year}).`,
          source: "Results · approval",
          relatedId: id,
        });
        toast.success(`${mod.code} submitted — Head of Academic Affairs notified`);
        onClose();
      }}
    >
      <Field label="What to submit">
        <Select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          options={[
            { value: "all", label: "Whole module (all components)" },
            ...mod.components.map((c) => ({
              value: c.id,
              label: `${c.name} only (interim release)`,
            })),
          ]}
        />
      </Field>
      {hasResit ? (
        <Field label="Attempt">
          <Select
            value={String(attempt)}
            onChange={(e) => setAttempt(Number(e.target.value))}
            options={[
              { value: "1", label: "First attempt" },
              { value: "2", label: "Resit" },
            ]}
          />
        </Field>
      ) : (
        <div />
      )}
      <div className="sm:col-span-2 rounded-lg border p-3 space-y-2">
        <ChecksList checks={checks.submitChecks} />
        <div className="text-[11px] text-muted-foreground border-t pt-2">
          {checks.moderation.ok
            ? "Moderation is complete."
            : `Note: ${checks.moderation.detail}. Approval waits for moderation.`}
        </div>
      </div>
      {existing && (
        <div className="sm:col-span-2 text-xs text-muted-foreground">
          Current status: <StatusPill status={existing.status} />
          {existing.returnedNote && (
            <span className="block mt-1 text-destructive">{existing.returnedNote}</span>
          )}
        </div>
      )}
    </FormDialog>
  );
}

function Approvals() {
  const d = useHeData();
  const { batches } = useResults();
  const admin = d.ctx.isAdmin;
  const myIds = new Set(d.myModules.map((m) => m.id));
  const [reviewing, setReviewing] = useState<MarkBatch | null>(null);
  const order: Record<MarkBatch["status"], number> = {
    Submitted: 0,
    Returned: 1,
    Approved: 2,
    Draft: 3,
    Published: 4,
  };
  const rows = (
    admin
      ? batches.filter((b) => b.status !== "Published")
      : batches.filter((b) => myIds.has(b.moduleId))
  )
    .filter((b) => d.moduleById(b.moduleId))
    .sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""),
    );

  return (
    <>
      <Section
        title={admin ? "Mark approval queue" : "My mark batches"}
        description={
          admin
            ? "Approve moderated marks or return them to the module leader with a note. Approved batches move to Results release."
            : "Submit from Marks entry. Returned batches need fixing and resubmitting."
        }
      >
        <DataTable
          columns={[
            { key: "module", label: "Module" },
            { key: "scope", label: "Scope" },
            { key: "submitted", label: "Submitted" },
            { key: "checks", label: "Checks" },
            { key: "status", label: "Status" },
            ...(admin ? [{ key: "_actions", label: "", className: "text-right" }] : []),
          ]}
          rows={rows}
          emptyText={admin ? "Nothing waiting for approval." : "No batches submitted yet."}
          renderCell={(b: MarkBatch, key) => {
            const mod = d.moduleById(b.moduleId)!;
            switch (key) {
              case "module":
                return (
                  <div>
                    <span className="font-mono text-[11px] text-muted-foreground mr-1">
                      {mod.code}
                    </span>
                    {mod.title}
                    <div className="text-[11px] text-muted-foreground">
                      {b.academicYear} · {mod.leader}
                    </div>
                  </div>
                );
              case "scope":
                return <span className="text-xs">{scopeLabel(mod, b)}</span>;
              case "submitted":
                return (
                  <div className="text-xs">
                    {b.submittedBy ?? "—"}
                    <div className="text-muted-foreground">{fmtDate(b.submittedAt)}</div>
                  </div>
                );
              case "checks": {
                if (b.status === "Approved" || b.status === "Published")
                  return <span className="text-xs text-muted-foreground">Passed</span>;
                const c = batchChecks(d, mod, b.academicYear ?? "", b.attempt, b.componentIds);
                const failed = [...c.submitChecks, c.moderation].filter((x) => !x.ok);
                return failed.length ? (
                  <div className="space-y-0.5">
                    {failed.map((x) => (
                      <Badge key={x.label} tone="warning">
                        {x.label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Badge tone="success">All checks pass</Badge>
                );
              }
              case "status":
                return (
                  <div className="space-y-1 max-w-xs">
                    <StatusPill status={b.status} />
                    {b.status === "Returned" && b.returnedNote && (
                      <div className="text-[11px] text-destructive">{b.returnedNote}</div>
                    )}
                    {b.status === "Approved" && (
                      <div className="text-[11px] text-muted-foreground">
                        {b.releaseDate
                          ? `Releases ${fmtDate(b.releaseDate)}`
                          : "Awaiting release date"}
                      </div>
                    )}
                    {b.status === "Published" && (
                      <div className="text-[11px] text-muted-foreground">
                        Released {fmtDate(b.publishedAt)}
                      </div>
                    )}
                  </div>
                );
              case "_actions":
                return b.status === "Submitted" ? (
                  <Button size="sm" onClick={() => setReviewing(b)}>
                    <Gavel className="h-3.5 w-3.5" /> Review
                  </Button>
                ) : null;
            }
          }}
        />
      </Section>
      {reviewing && <ReviewBatch batch={reviewing} onClose={() => setReviewing(null)} />}
    </>
  );
}

function ReviewBatch({ batch, onClose }: { batch: MarkBatch; onClose: () => void }) {
  const d = useHeData();
  const mod = d.moduleById(batch.moduleId)!;
  const [decision, setDecision] = useState<"Approve" | "Return">("Approve");
  const [note, setNote] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const c = batchChecks(d, mod, batch.academicYear ?? "", batch.attempt, batch.componentIds);
  const me = d.ctx.user?.name ?? "Head of Academic Affairs";
  const tell = (subject: string, body: string) => {
    for (const channel of ["Email", "App"] as const) {
      notify({
        tenantId: d.tenantId,
        channel,
        to: batch.submittedBy ?? mod.leader,
        subject,
        body,
        source: "Results · approval",
        relatedId: batch.id,
      });
    }
  };
  // Grade distribution of the batch (module marks where complete in scope).
  const dist = useMemo(() => {
    const vals = c.entered.map((m) => m.mark!);
    if (!vals.length) return undefined;
    const mean = Math.round(vals.reduce((a, v) => a + v, 0) / vals.length);
    return { mean, min: Math.min(...vals), max: Math.max(...vals), n: vals.length };
  }, [c.entered]);

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Review mark batch"
      description={`${mod.code} ${mod.title} · ${scopeLabel(mod, batch)} · ${batch.academicYear} · submitted by ${batch.submittedBy}`}
      submitLabel={decision === "Approve" ? "Approve" : "Return to module leader"}
      submitVariant={decision === "Approve" ? "primary" : "outline"}
      onSubmit={() => {
        const at = new Date().toISOString();
        if (decision === "Approve") {
          if (!c.canApprove) {
            toast.error("Approval needs every check to pass, including moderation");
            return;
          }
          updateItem("markBatches", (x) => x.id === batch.id, {
            status: "Approved",
            approvedBy: me,
            approvedAt: at,
            releaseDate: releaseDate || undefined,
          });
          logChange({
            tenantId: d.tenantId,
            entity: "markBatch",
            entityId: batch.id,
            field: "status",
            from: "Submitted",
            to: "Approved",
            by: me,
            reason: releaseDate ? `Release scheduled ${releaseDate}` : undefined,
          });
          tell(
            `${mod.code} marks approved`,
            releaseDate
              ? `Results release to students on ${fmtDate(releaseDate)}.`
              : "Results will be released to students on results day.",
          );
          toast.success(`${mod.code} approved — ${batch.submittedBy} notified`);
        } else {
          if (note.trim().length < 5) {
            toast.error("Add a note so the module leader knows what to fix");
            return;
          }
          updateItem("markBatches", (x) => x.id === batch.id, {
            status: "Returned",
            returnedNote: note.trim(),
          });
          logChange({
            tenantId: d.tenantId,
            entity: "markBatch",
            entityId: batch.id,
            field: "status",
            from: "Submitted",
            to: "Returned",
            by: me,
            reason: note.trim(),
          });
          tell(`${mod.code} marks returned`, note.trim());
          toast(`${mod.code} returned to ${batch.submittedBy}`);
        }
        onClose();
      }}
    >
      <div className="sm:col-span-2 rounded-lg border p-3 space-y-2">
        <ChecksList checks={[...c.submitChecks, c.moderation]} />
        {dist && (
          <div className="text-[11px] text-muted-foreground border-t pt-2">
            {dist.n} marks · mean {dist.mean}% · range {dist.min}–{dist.max}
          </div>
        )}
      </div>
      <Field label="Decision">
        <Select
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
          options={[
            { value: "Approve", label: "Approve" },
            { value: "Return", label: "Return with a note" },
          ]}
        />
      </Field>
      {decision === "Approve" ? (
        <Field label="Release date (optional)" hint="Leave empty to set it in Results release">
          <TextInput
            type="date"
            min={DEMO_TODAY}
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
          />
        </Field>
      ) : (
        <Field label="Note to module leader" className="sm:col-span-2">
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What needs fixing before resubmission?"
          />
        </Field>
      )}
    </FormDialog>
  );
}

/* ── Results release ─────────────────────────────────────────────────────── */

function Release() {
  const d = useHeData();
  const { batches } = useResults();
  const me = d.ctx.user?.name ?? "Head of Academic Affairs";
  const approved = batches
    .filter((b) => b.status === "Approved" && d.moduleById(b.moduleId))
    .sort((a, b) => (a.releaseDate ?? "9").localeCompare(b.releaseDate ?? "9"));
  const due = approved.filter((b) => b.releaseDate && b.releaseDate <= DEMO_TODAY);
  const published = batches
    .filter((b) => b.status === "Published" && d.moduleById(b.moduleId))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 12);
  const studentsIn = (b: MarkBatch) =>
    Array.from(
      new Set(
        d.marks.filter((m) => m.mark !== undefined && batchCovers(b, m)).map((m) => m.studentId),
      ),
    );

  const publish = (b: MarkBatch) => {
    const mod = d.moduleById(b.moduleId)!;
    const at = new Date().toISOString();
    updateItem("markBatches", (x) => x.id === b.id, {
      status: "Published",
      publishedBy: me,
      publishedAt: at,
      releaseDate: b.releaseDate ?? DEMO_TODAY,
    });
    logChange({
      tenantId: d.tenantId,
      entity: "markBatch",
      entityId: b.id,
      field: "status",
      from: "Approved",
      to: "Published",
      by: me,
    });
    const deadline = appealDeadline(at);
    const ids = studentsIn(b);
    for (const s of ids) {
      const l = d.learners.find((x) => x.id === s);
      for (const channel of ["Email", "App"] as const) {
        notify({
          tenantId: d.tenantId,
          channel,
          to: channel === "Email" && l ? `${l.name} (${l.email})` : d.name(s),
          subject: `${mod.code} results released`,
          body: `Your ${mod.title} results (${scopeLabel(mod, b)}) are now available. Appeals close ${fmtDate(deadline)}.`,
          source: "Results · release",
          relatedId: b.id,
        });
      }
    }
    return ids.length;
  };

  const schedule = (b: MarkBatch, date: string) => {
    updateItem("markBatches", (x) => x.id === b.id, { releaseDate: date || undefined });
    logChange({
      tenantId: d.tenantId,
      entity: "markBatch",
      entityId: b.id,
      field: "releaseDate",
      from: b.releaseDate,
      to: date || undefined,
      by: me,
    });
    if (date) toast.success(`Release scheduled for ${fmtDate(date)}`);
  };

  return (
    <div className="space-y-4">
      <Section
        title="Approved — awaiting release"
        description="Publish now or set a results day. Students see marks only after release, and are emailed and notified in the app."
        actions={
          due.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                const n = due.reduce((a, b) => a + publish(b), 0);
                toast.success(`${due.length} batch(es) released — ${n} student notifications sent`);
              }}
            >
              <Megaphone className="h-3.5 w-3.5" /> Release due ({due.length})
            </Button>
          )
        }
      >
        <DataTable
          columns={[
            { key: "module", label: "Module" },
            { key: "approved", label: "Approved" },
            { key: "students", label: "Students" },
            { key: "date", label: "Results day" },
            { key: "_actions", label: "", className: "text-right" },
          ]}
          rows={approved}
          emptyText="No approved batches waiting."
          renderCell={(b: MarkBatch, key) => {
            const mod = d.moduleById(b.moduleId)!;
            switch (key) {
              case "module":
                return (
                  <div>
                    <span className="font-mono text-[11px] text-muted-foreground mr-1">
                      {mod.code}
                    </span>
                    {mod.title}
                    <div className="text-[11px] text-muted-foreground">
                      {scopeLabel(mod, b)} · {b.academicYear}
                    </div>
                  </div>
                );
              case "approved":
                return (
                  <div className="text-xs">
                    {b.approvedBy}
                    <div className="text-muted-foreground">{fmtDate(b.approvedAt)}</div>
                  </div>
                );
              case "students":
                return studentsIn(b).length;
              case "date":
                return (
                  <div className="flex items-center gap-1.5">
                    <TextInput
                      type="date"
                      className="h-8 w-40"
                      min={DEMO_TODAY}
                      value={b.releaseDate ?? ""}
                      onChange={(e) => schedule(b, e.target.value)}
                    />
                    {b.releaseDate && b.releaseDate <= DEMO_TODAY && (
                      <Badge tone="warning">Due</Badge>
                    )}
                  </div>
                );
              case "_actions":
                return (
                  <Button
                    size="sm"
                    onClick={() => {
                      const n = publish(b);
                      toast.success(
                        `${mod.code} released — ${n} students notified by email and app`,
                      );
                    }}
                  >
                    <Megaphone className="h-3.5 w-3.5" /> Publish now
                  </Button>
                );
            }
          }}
        />
      </Section>
      <Section title="Recently released">
        <div className="space-y-1.5">
          {published.map((b) => {
            const mod = d.moduleById(b.moduleId)!;
            const deadline = appealDeadline(b.publishedAt ?? DEMO_TODAY);
            return (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs"
              >
                <span className="min-w-0 truncate">
                  <span className="font-mono text-muted-foreground mr-1">{mod.code}</span>
                  {mod.title} · {scopeLabel(mod, b)} · {b.academicYear}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {fmtDate(b.publishedAt)} ·{" "}
                  {deadline >= DEMO_TODAY ? `appeals until ${fmtDate(deadline)}` : "appeals closed"}
                </span>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/* ── Academic appeals (admin) ────────────────────────────────────────────── */

function AppealsQueue() {
  const d = useHeData();
  const { appeals } = useResults();
  const me = d.ctx.user?.name ?? "Head of Academic Affairs";
  const [deciding, setDeciding] = useState<GradeAppeal | null>(null);
  const rows = [...appeals].sort(
    (a, b) =>
      Number(OPEN_APPEAL.includes(b.status)) - Number(OPEN_APPEAL.includes(a.status)) ||
      b.submittedAt.localeCompare(a.submittedAt),
  );
  const startReview = (a: GradeAppeal) => {
    const at = new Date().toISOString();
    updateItem("gradeAppeals", (x) => x.id === a.id, {
      status: "Under review",
      history: [...a.history, { at, by: me, action: "Under review" }],
    });
    logChange({
      tenantId: d.tenantId,
      entity: "gradeAppeal",
      entityId: a.id,
      studentId: a.studentId,
      field: "status",
      from: a.status,
      to: "Under review",
      by: me,
    });
    tellStudent(d, a, "Your appeal is under review", "We'll write to you with the outcome.");
    toast.success(`Appeal from ${d.name(a.studentId)} is under review — student notified`);
  };

  return (
    <>
      <Section
        title="Academic appeals"
        description="Appeals against a released result (within 10 working days of release). Separate from EC claims, which are made before or at the time of an assessment."
      >
        <div className="space-y-3">
          {rows.map((a) => (
            <AppealCard
              key={a.id}
              a={a}
              actions={
                <>
                  {a.status === "Submitted" && (
                    <Button size="sm" variant="outline" onClick={() => startReview(a)}>
                      Start review
                    </Button>
                  )}
                  {OPEN_APPEAL.includes(a.status) && (
                    <Button size="sm" onClick={() => setDeciding(a)}>
                      <Gavel className="h-3.5 w-3.5" /> Decide
                    </Button>
                  )}
                </>
              }
            />
          ))}
          {!rows.length && <div className="text-sm text-muted-foreground">No appeals.</div>}
        </div>
      </Section>
      {deciding && <DecideAppeal appeal={deciding} onClose={() => setDeciding(null)} />}
    </>
  );
}

function tellStudent(d: HeData, a: GradeAppeal, subject: string, body: string) {
  const l = d.learners.find((x) => x.id === a.studentId);
  const mod = d.moduleById(a.moduleId);
  for (const channel of ["Email", "App"] as const) {
    notify({
      tenantId: d.tenantId,
      channel,
      to: channel === "Email" && l ? `${l.name} (${l.email})` : d.name(a.studentId),
      subject: `${mod?.code ?? "Module"} appeal: ${subject}`,
      body,
      source: "Results · appeals",
      relatedId: a.id,
    });
  }
}

function AppealCard({ a, actions }: { a: GradeAppeal; actions?: React.ReactNode }) {
  const d = useHeData();
  const mod = d.moduleById(a.moduleId);
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={d.name(a.studentId)} seed={a.studentId} size={28} />
          <div className="min-w-0">
            <div className="text-sm font-medium">
              {d.name(a.studentId)}
              <span className="font-mono text-[11px] text-muted-foreground ml-1.5">
                {mod?.code}
              </span>{" "}
              <span className="font-normal">{mod?.title}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {a.id} · submitted {fmtDate(a.submittedAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusPill status={a.status} />
          {actions}
        </div>
      </div>
      <div className="mt-2 text-xs">
        <Badge tone="muted">{a.ground}</Badge>
        <p className="mt-1">{a.statement}</p>
        {a.outcome && (
          <p className="mt-1.5 rounded bg-muted/40 px-2 py-1">
            <span className="font-medium">Outcome:</span> {a.outcome}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 text-[11px] text-primary inline-flex items-center gap-1 hover:underline"
      >
        <History className="h-3 w-3" /> {open ? "Hide" : "Show"} history ({a.history.length})
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1 border-l pl-3 text-[11px]">
          {a.history.map((h, i) => (
            <li key={i}>
              <span className="text-muted-foreground">{fmtDate(h.at)}</span> · {h.action}{" "}
              <span className="text-muted-foreground">— {h.by}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DecideAppeal({ appeal, onClose }: { appeal: GradeAppeal; onClose: () => void }) {
  const d = useHeData();
  const mod = d.moduleById(appeal.moduleId)!;
  const me = d.ctx.user?.name ?? "Head of Academic Affairs";
  const [decision, setDecision] = useState<"Upheld" | "Not upheld">("Upheld");
  const [outcome, setOutcome] = useState("");
  const [componentId, setComponentId] = useState("");
  const [newMark, setNewMark] = useState("");
  const latest = (cid: string) =>
    d.marks
      .filter(
        (m) =>
          m.studentId === appeal.studentId &&
          m.moduleId === appeal.moduleId &&
          m.componentId === cid &&
          m.mark !== undefined,
      )
      .sort((a, b) => b.attempt - a.attempt)[0];
  const target = componentId ? latest(componentId) : undefined;

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Appeal decision"
      description={`${d.name(appeal.studentId)} · ${mod.code} ${mod.title} · ${appeal.ground}`}
      submitLabel="Record decision"
      onSubmit={() => {
        if (outcome.trim().length < 10) {
          toast.error("Write the outcome for the student");
          return;
        }
        const at = new Date().toISOString();
        let amended = "";
        if (decision === "Upheld" && target && newMark !== "") {
          const to = Math.max(0, Math.min(100, Math.round(Number(newMark))));
          const comp = mod.components.find((c) => c.id === componentId);
          updateItem("moduleMarks", (x) => x.id === target.id, { mark: to });
          logChange({
            tenantId: d.tenantId,
            entity: "moduleMark",
            entityId: target.id,
            studentId: appeal.studentId,
            field: `${mod.code} ${comp?.name ?? componentId} mark`,
            from: String(target.mark),
            to: String(to),
            by: me,
            reason: `Appeal ${appeal.id} upheld`,
          });
          amended = ` ${comp?.name} mark amended ${target.mark} → ${to}.`;
        }
        const text = outcome.trim() + amended;
        updateItem("gradeAppeals", (x) => x.id === appeal.id, {
          status: decision,
          outcome: text,
          decidedBy: me,
          decidedAt: at,
          history: [
            ...appeal.history,
            { at, by: me, action: `${decision}${amended ? ` —${amended}` : ""}` },
          ],
        });
        logChange({
          tenantId: d.tenantId,
          entity: "gradeAppeal",
          entityId: appeal.id,
          studentId: appeal.studentId,
          field: "status",
          from: appeal.status,
          to: decision,
          by: me,
          reason: text,
        });
        tellStudent(d, appeal, `outcome — ${decision.toLowerCase()}`, text);
        toast.success(`Appeal ${decision.toLowerCase()} — ${d.name(appeal.studentId)} notified`);
        onClose();
      }}
    >
      <div className="sm:col-span-2 rounded-lg bg-muted/40 p-3 text-sm">{appeal.statement}</div>
      <Field label="Decision">
        <Select
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
          options={[
            { value: "Upheld", label: "Upheld" },
            { value: "Not upheld", label: "Not upheld" },
          ]}
        />
      </Field>
      {decision === "Upheld" ? (
        <Field label="Amend a mark (optional)">
          <Select
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
            options={[
              { value: "", label: "No mark change" },
              ...mod.components.map((c) => ({
                value: c.id,
                label: `${c.name} (now ${latest(c.id)?.mark ?? "—"})`,
              })),
            ]}
          />
        </Field>
      ) : (
        <div />
      )}
      {decision === "Upheld" && target && (
        <Field label="New mark" hint={`Current ${target.mark} · logged with from/to`}>
          <NumberInput
            min={0}
            max={100}
            value={newMark}
            onChange={(e) => setNewMark(e.target.value)}
          />
        </Field>
      )}
      <Field label="Outcome for the student" className="sm:col-span-2">
        <TextArea
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="What was found and what happens next."
        />
      </Field>
    </FormDialog>
  );
}

/* ── Moderation ──────────────────────────────────────────────────────────── */

function Moderation() {
  const d = useHeData();
  const me = d.ctx.user?.name;
  const teacher = d.ctx.user?.role === "teacher";
  const groups = provisionalGroups(d);
  const [adjust, setAdjust] = useState<Record<string, string>>({});

  const marksIn = (g: (typeof groups)[number]) =>
    d.marks.filter(
      (m) =>
        m.moduleId === g.mod.id &&
        m.componentId === g.componentId &&
        (m.academicYear ?? "") === g.year &&
        m.status === "Provisional" &&
        m.mark !== undefined,
    );

  const finish = (g: (typeof groups)[number], delta: number) => {
    const ids = new Set(marksIn(g).map((m) => m.id));
    for (const m of marksIn(g)) {
      updateItem("moduleMarks", (x) => x.id === m.id, {
        status: "Moderated",
        mark: Math.max(0, Math.min(100, (m.mark ?? 0) + delta)),
      });
    }
    toast.success(
      delta
        ? `${g.mod.code}: ${ids.size} marks adjusted by ${delta > 0 ? "+" : ""}${delta} and moderated`
        : `${g.mod.code}: marks agreed — ${ids.size} moderated`,
    );
  };

  if (!groups.length)
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nothing awaiting moderation.
      </div>
    );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {groups.map((g) => {
        const key = `${g.mod.id}|${g.componentId}|${g.year}`;
        const rows = marksIn(g).sort((a, b) => (b.mark ?? 0) - (a.mark ?? 0));
        const vals = rows.map((r) => r.mark ?? 0);
        const mean = Math.round(vals.reduce((a, v) => a + v, 0) / vals.length);
        const n = Math.min(rows.length, Math.max(3, Math.ceil(Math.sqrt(rows.length))));
        // Sample spans the range: top, middle, bottom…
        const sample = Array.from(
          new Set([0, Math.floor(rows.length / 2), rows.length - 1, ...rows.map((_, i) => i)]),
        )
          .slice(0, n)
          .map((i) => rows[i]);
        const comp = g.mod.components.find((c) => c.id === g.componentId);
        const own = teacher && g.mod.leader === me;
        return (
          <Section
            key={key}
            title={`${g.mod.code} · ${comp?.name}`}
            description={`${g.mod.title} · leader ${g.mod.leader} · ${g.year}`}
            actions={<Badge tone="info">{rows.length} scripts</Badge>}
          >
            <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
              <div className="rounded-lg bg-muted/40 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">Mean</div>
                <div className="font-semibold">{mean}%</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">Range</div>
                <div className="font-semibold">
                  {Math.min(...vals)}–{Math.max(...vals)}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">Sample</div>
                <div className="font-semibold">{n} scripts</div>
              </div>
            </div>
            <div className="space-y-1.5 mb-3">
              {sample.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-sm rounded-md border px-2.5 py-1.5"
                >
                  <span className="truncate">{d.name(m.studentId)}</span>
                  <span className="font-mono">
                    {m.mark}%{m.flag && <Badge tone="warning">{m.flag}</Badge>}
                  </span>
                </div>
              ))}
            </div>
            {own ? (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> You are the module leader — a second marker
                must moderate this sample.
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={() => finish(g, 0)}>
                  Agree marks
                </Button>
                <NumberInput
                  className="h-8 w-20"
                  placeholder="±"
                  value={adjust[key] ?? ""}
                  onChange={(e) => setAdjust((a) => ({ ...a, [key]: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!Number(adjust[key])}
                  onClick={() => {
                    finish(g, Number(adjust[key]));
                    setAdjust((a) => ({ ...a, [key]: "" }));
                  }}
                >
                  Apply adjustment
                </Button>
              </div>
            )}
          </Section>
        );
      })}
    </div>
  );
}

/* ── Extenuating circumstances ───────────────────────────────────────────── */

const EC_OUTCOMES: NonNullable<EcClaim["outcome"]>[] = [
  "Extension (7 days)",
  "Deferral to resit period",
  "Uncapped resit",
  "Mark disregarded",
];

function EcPanel() {
  const d = useHeData();
  const admin = d.ctx.isAdmin;
  const myIds = new Set(d.myModules.map((m) => m.id));
  const rows = admin ? d.ecs : d.ecs.filter((e) => myIds.has(e.moduleId));
  const [deciding, setDeciding] = useState<EcClaim | null>(null);
  const sorted = [...rows].sort(
    (a, b) =>
      (a.status === "Submitted" ? -1 : 0) - (b.status === "Submitted" ? -1 : 0) ||
      b.submittedAt.localeCompare(a.submittedAt),
  );

  return (
    <>
      <Section
        title={admin ? "EC panel queue" : "EC claims on my modules"}
        description={
          admin
            ? "Decide claims; an approved deferral or uncapped resit creates the resit attempt automatically."
            : "Read-only — decisions are made by the EC panel."
        }
      >
        <DataTable
          columns={[
            { key: "student", label: "Student" },
            { key: "module", label: "Assessment" },
            { key: "claim", label: "Claim" },
            { key: "status", label: "Status" },
            ...(admin ? [{ key: "_actions", label: "", className: "text-right" }] : []),
          ]}
          rows={sorted}
          emptyText="No claims."
          renderCell={(e: EcClaim, key) => {
            const m = d.moduleById(e.moduleId);
            switch (key) {
              case "student":
                return (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={d.name(e.studentId)} seed={e.studentId} size={28} />
                    <div>
                      <div className="font-medium">{d.name(e.studentId)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Submitted {fmtDate(e.submittedAt)}
                      </div>
                    </div>
                  </div>
                );
              case "module":
                return (
                  <div>
                    <span className="font-mono text-[11px] text-muted-foreground mr-1">
                      {m?.code}
                    </span>
                    {m?.components.find((c) => c.id === e.componentId)?.name ?? "Whole module"}
                  </div>
                );
              case "claim":
                return (
                  <div className="max-w-sm">
                    <Badge tone="muted">{e.category}</Badge>
                    <div className="text-xs mt-1 line-clamp-2">{e.statement}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {e.evidence}
                    </div>
                  </div>
                );
              case "status":
                return (
                  <div className="space-y-1">
                    <StatusPill status={e.status} />
                    {e.outcome && (
                      <div className="text-[11px] text-muted-foreground">{e.outcome}</div>
                    )}
                  </div>
                );
              case "_actions":
                return e.status === "Submitted" || e.status === "More evidence needed" ? (
                  <Button size="sm" onClick={() => setDeciding(e)}>
                    <Gavel className="h-3.5 w-3.5" /> Decide
                  </Button>
                ) : null;
            }
          }}
        />
      </Section>
      {deciding && <DecideEc claim={deciding} onClose={() => setDeciding(null)} />}
    </>
  );
}

function DecideEc({ claim, onClose }: { claim: EcClaim; onClose: () => void }) {
  const d = useHeData();
  const [decision, setDecision] = useState<"Approved" | "Rejected" | "More evidence needed">(
    "Approved",
  );
  const [outcome, setOutcome] = useState<NonNullable<EcClaim["outcome"]>>(
    "Deferral to resit period",
  );
  const m = d.moduleById(claim.moduleId);
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="EC panel decision"
      description={`${d.name(claim.studentId)} · ${m?.code} · ${claim.category}`}
      submitLabel="Record decision"
      onSubmit={() => {
        updateItem("ecClaims", (x) => x.id === claim.id, {
          status: decision,
          outcome: decision === "Approved" ? outcome : undefined,
        });
        const componentId = claim.componentId ?? m?.components[0]?.id ?? "c1";
        if (
          decision === "Approved" &&
          (outcome === "Deferral to resit period" || outcome === "Uncapped resit")
        ) {
          addItem("moduleMarks", {
            id: nextId("MK-", "moduleMarks"),
            tenantId: d.tenantId,
            studentId: claim.studentId,
            moduleId: claim.moduleId,
            componentId,
            attempt: 2,
            status: "Provisional",
            flag: "EC",
            academicYear: d.academicYear,
          });
          toast.success("Approved — uncapped resit attempt created in the resit period");
        } else if (decision === "Approved" && outcome === "Mark disregarded") {
          updateItem(
            "moduleMarks",
            (x) =>
              x.studentId === claim.studentId &&
              x.moduleId === claim.moduleId &&
              x.componentId === componentId &&
              x.attempt === 1,
            { flag: "EC" },
          );
          toast.success("Approved — component flagged; board will disregard the mark");
        } else if (decision === "Approved") {
          toast.success("Approved — submission deadline extended by 7 days");
        } else {
          toast(
            decision === "Rejected"
              ? "Claim rejected — student notified"
              : "Further evidence requested from the student",
          );
        }
        onClose();
      }}
    >
      <div className="sm:col-span-2 rounded-lg bg-muted/40 p-3 text-sm">
        <div>{claim.statement}</div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Paperclip className="h-3 w-3" />
          {claim.evidence}
        </div>
      </div>
      <Field label="Decision">
        <Select
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
          options={["Approved", "Rejected", "More evidence needed"].map((v) => ({
            value: v,
            label: v,
          }))}
        />
      </Field>
      {decision === "Approved" && (
        <Field label="Outcome">
          <Select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as typeof outcome)}
            options={EC_OUTCOMES.map((v) => ({ value: v, label: v }))}
          />
        </Field>
      )}
    </FormDialog>
  );
}

function StudentEc() {
  const d = useHeData();
  const me = d.me;
  const mine = d.ecs.filter((e) => e.studentId === me?.id);
  const myModules = me
    ? d.regs
        .filter(
          (r) =>
            r.studentId === me.id && r.academicYear === d.academicYear && r.status === "Registered",
        )
        .map((r) => d.moduleById(r.moduleId))
        .filter((m): m is HeModule => !!m)
    : [];
  const [moduleId, setModuleId] = useState(myModules[0]?.id ?? "");
  const mod = d.moduleById(moduleId) ?? myModules[0];
  const [componentId, setComponentId] = useState("c1");
  const [category, setCategory] = useState<EcClaim["category"]>("Illness");
  const [statement, setStatement] = useState("");
  const [evidence, setEvidence] = useState("");
  if (!me) return <div className="text-sm text-muted-foreground">No student record linked.</div>;

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-4 lg:gap-6">
      <Section
        title="Submit a claim"
        description="Claims are confidential and seen only by the EC panel. Submit before the assessment deadline where possible."
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!mod || statement.trim().length < 15) {
              toast.error("Tell us what happened (at least a sentence)");
              return;
            }
            addItem("ecClaims", {
              id: nextId("EC-", "ecClaims"),
              tenantId: d.tenantId,
              studentId: me.id,
              moduleId: mod.id,
              componentId,
              category,
              statement: statement.trim(),
              evidence: evidence.trim() || "Evidence to follow",
              submittedAt: new Date().toISOString(),
              status: "Submitted",
            });
            toast.success("Claim submitted — you'll hear from the panel within 5 working days");
            setStatement("");
            setEvidence("");
          }}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Module">
              <Select
                value={mod?.id ?? ""}
                onChange={(e) => {
                  setModuleId(e.target.value);
                  setComponentId("c1");
                }}
                options={myModules.map((m) => ({ value: m.id, label: `${m.code} — ${m.title}` }))}
              />
            </Field>
            <Field label="Assessment">
              <Select
                value={componentId}
                onChange={(e) => setComponentId(e.target.value)}
                options={(mod?.components ?? []).map((c) => ({
                  value: c.id,
                  label: `${c.name} · due ${fmtDate(c.due)}`,
                }))}
              />
            </Field>
            <Field label="Category">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as EcClaim["category"])}
                options={["Illness", "Bereavement", "Personal / family", "Technical", "Other"].map(
                  (v) => ({ value: v, label: v }),
                )}
              />
            </Field>
            <Field label="Evidence" hint="Doctor's note, letter, certificate…">
              <TextInput
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="GP letter.pdf"
              />
            </Field>
          </div>
          <Field label="What happened?">
            <TextArea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Describe the circumstances and the dates affected."
            />
          </Field>
          <Button type="submit">
            <LifeBuoy className="h-4 w-4" /> Submit claim
          </Button>
        </form>
      </Section>
      <Section title="My claims">
        <div className="space-y-2.5">
          {mine.map((e) => {
            const m = d.moduleById(e.moduleId);
            return (
              <div key={e.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {m?.code} · {m?.components.find((c) => c.id === e.componentId)?.name}
                  </div>
                  <StatusPill status={e.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {e.category} · submitted {fmtDate(e.submittedAt)}
                </div>
                {e.outcome && (
                  <div className="text-xs mt-1">
                    Outcome: <span className="font-medium">{e.outcome}</span>
                  </div>
                )}
              </div>
            );
          })}
          {!mine.length && (
            <div className="text-xs text-muted-foreground">You haven't submitted any claims.</div>
          )}
        </div>
      </Section>
    </div>
  );
}

function MyResults({ onGoEc }: { onGoEc: () => void }) {
  const d = useHeData();
  const { batches, appeals, scheme } = useResults();
  const [appealing, setAppealing] = useState<{ mod: HeModule; batch?: MarkBatch } | null>(null);
  const me = d.me;
  if (!me) return null;
  const programme = d.programmeById(me.programmeId);
  const passMark = programme?.passMark ?? 40;
  const vis = visibleMarks(d, batches);
  const results = moduleResults(d, scheme, vis, me.id, passMark);
  const shownIds = new Set(results.map((x) => x.mod.id));
  const pending = Array.from(
    new Set(
      d.marks
        .filter((m) => m.studentId === me.id && m.mark !== undefined && !shownIds.has(m.moduleId))
        .map((m) => m.moduleId),
    ),
  )
    .map((id) => d.moduleById(id))
    .filter((m): m is HeModule => !!m);
  /** Latest published batch covering my marks in a module. */
  const releasedIn = (moduleId: string) =>
    batches
      .filter(
        (b) =>
          b.status === "Published" &&
          b.moduleId === moduleId &&
          vis.some((m) => m.studentId === me.id && batchCovers(b, m)),
      )
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0];

  return (
    <>
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 lg:gap-6">
        <Section
          title="My results"
          description="Only released results are shown. A result can be appealed within 10 working days of release."
        >
          <div className="space-y-3">
            {results.map(({ mod, outcome, grade, term }) => {
              const batch = releasedIn(mod.id);
              const deadline = batch?.publishedAt ? appealDeadline(batch.publishedAt) : undefined;
              const open = appeals.find(
                (a) =>
                  a.studentId === me.id && a.moduleId === mod.id && OPEN_APPEAL.includes(a.status),
              );
              const note = releaseNote(d, batches, me.id, mod.id);
              return (
                <div key={mod.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium min-w-0">
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">
                        {mod.code}
                      </span>
                      {mod.title}
                      <div className="text-[11px] text-muted-foreground font-normal">
                        {term} · {mod.credits} credits
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">
                        {outcome.mark ?? "—"}%
                        {!outcome.complete && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {" "}
                            partial
                          </span>
                        )}
                      </div>
                      <GradeChip scheme={scheme} band={grade} />
                    </div>
                  </div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
                    {mod.components.map((c) => {
                      const mk = vis
                        .filter(
                          (x) =>
                            x.studentId === me.id &&
                            x.moduleId === mod.id &&
                            x.componentId === c.id,
                        )
                        .sort((a, b) => b.attempt - a.attempt)[0];
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs rounded bg-muted/40 px-2 py-1"
                        >
                          <span>
                            {c.name} ({c.weight}%){mk?.attempt === 2 && " · resit"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {mk?.mark ?? "—"}
                            {mk && <StatusPill status={mk.status} />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {note && (
                        <>
                          <Clock className="h-3 w-3" /> {note} ·{" "}
                        </>
                      )}
                      {batch && `Released ${fmtDate(batch.publishedAt)}`}
                    </span>
                    {open ? (
                      <span>
                        Appeal <StatusPill status={open.status} />
                      </span>
                    ) : deadline && deadline >= DEMO_TODAY ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAppealing({ mod, batch })}
                      >
                        <Scale className="h-3.5 w-3.5" /> Appeal (until {fmtDate(deadline)})
                      </Button>
                    ) : deadline ? (
                      <span>Appeal window closed {fmtDate(deadline)}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {pending.map((mod) => (
              <div key={mod.id} className="rounded-lg border border-dashed p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    <span className="font-mono text-xs text-muted-foreground mr-1.5">
                      {mod.code}
                    </span>
                    {mod.title}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {releaseNote(d, batches, me.id, mod.id) ?? "Results not yet released"}
                  </span>
                </div>
              </div>
            ))}
            {!results.length && !pending.length && (
              <div className="text-sm text-muted-foreground">No results yet.</div>
            )}
          </div>
        </Section>
        <Section title={scheme.kind === "gpa" ? "GPA & standing" : "Average & standing"}>
          <GpaPanel scheme={scheme} rows={results} />
        </Section>
      </div>
      {appealing && (
        <AppealDialog
          mod={appealing.mod}
          batch={appealing.batch}
          onGoEc={onGoEc}
          onClose={() => setAppealing(null)}
        />
      )}
    </>
  );
}

function AppealDialog({
  mod,
  batch,
  onGoEc,
  onClose,
}: {
  mod: HeModule;
  batch?: MarkBatch;
  onGoEc: () => void;
  onClose: () => void;
}) {
  const d = useHeData();
  const me = d.me!;
  const [ground, setGround] = useState<AppealGround>("Administrative error");
  const [statement, setStatement] = useState("");
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Appeal a result"
      description={`${mod.code} ${mod.title}. Appeals are about how a result was reached — not disagreeing with academic judgement.`}
      submitLabel="Submit appeal"
      onSubmit={() => {
        if (statement.trim().length < 20) {
          toast.error("Explain what went wrong (a couple of sentences)");
          return;
        }
        const at = new Date().toISOString();
        const id = nextId("GA-", "gradeAppeals");
        addItem("gradeAppeals", {
          id,
          tenantId: d.tenantId,
          studentId: me.id,
          moduleId: mod.id,
          ground,
          statement: statement.trim(),
          submittedAt: at,
          status: "Submitted",
          batchId: batch?.id,
          history: [{ at, by: me.name, action: "Appeal submitted" }],
        });
        logChange({
          tenantId: d.tenantId,
          entity: "gradeAppeal",
          entityId: id,
          studentId: me.id,
          field: "status",
          to: "Submitted",
          by: me.name,
          reason: `${mod.code} · ${ground}`,
        });
        for (const channel of ["Email", "App"] as const) {
          notify({
            tenantId: d.tenantId,
            channel,
            to: channel === "Email" ? `${me.name} (${me.email})` : me.name,
            subject: `${mod.code} appeal received`,
            body: "We'll update you at each step. Most appeals are decided within 20 working days.",
            source: "Results · appeals",
            relatedId: id,
          });
        }
        notify({
          tenantId: d.tenantId,
          channel: "App",
          to: "Head of Academic Affairs",
          subject: `New appeal: ${me.name} · ${mod.code}`,
          source: "Results · appeals",
          relatedId: id,
        });
        toast.success("Appeal submitted — you'll be notified at each step");
        onClose();
      }}
    >
      <Field label="Ground" className="sm:col-span-2">
        <Select
          value={ground}
          onChange={(e) => setGround(e.target.value as AppealGround)}
          options={APPEAL_GROUNDS.map((g) => ({ value: g, label: g }))}
        />
      </Field>
      {ground === "Extenuating circumstances not previously considered" && (
        <div className="sm:col-span-2 rounded-lg bg-info/10 p-3 text-xs space-y-1.5">
          <p>
            Use this only if you had a good reason for not telling us at the time. Explain that
            reason below and attach evidence later.
          </p>
          <p>
            Circumstances affecting an upcoming or current assessment go through the{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => {
                onClose();
                onGoEc();
              }}
            >
              Extenuating circumstances
            </button>{" "}
            process instead.
          </p>
        </div>
      )}
      <Field label="What went wrong?" className="sm:col-span-2">
        <TextArea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Which assessment, what happened, and what you'd like reviewed."
        />
      </Field>
    </FormDialog>
  );
}

function MyAppeals({ onGoEc }: { onGoEc: () => void }) {
  const d = useHeData();
  const { appeals } = useResults();
  const me = d.me;
  if (!me) return null;
  const mine = appeals
    .filter((a) => a.studentId === me.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const withdraw = (a: GradeAppeal) => {
    const at = new Date().toISOString();
    updateItem("gradeAppeals", (x) => x.id === a.id, {
      status: "Withdrawn",
      history: [...a.history, { at, by: me.name, action: "Withdrawn by student" }],
    });
    logChange({
      tenantId: d.tenantId,
      entity: "gradeAppeal",
      entityId: a.id,
      studentId: me.id,
      field: "status",
      from: a.status,
      to: "Withdrawn",
      by: me.name,
    });
    toast("Appeal withdrawn");
  };
  return (
    <Section
      title="My appeals"
      description="Appeal from My results within 10 working days of a result's release."
      actions={
        <Button size="sm" variant="outline" onClick={onGoEc}>
          <LifeBuoy className="h-3.5 w-3.5" /> Extenuating circumstances
        </Button>
      }
    >
      <div className="space-y-3">
        {mine.map((a) => (
          <AppealCard
            key={a.id}
            a={a}
            actions={
              a.status === "Submitted" ? (
                <Button size="sm" variant="ghost" onClick={() => withdraw(a)}>
                  Withdraw
                </Button>
              ) : undefined
            }
          />
        ))}
        {!mine.length && (
          <div className="text-sm text-muted-foreground">You haven't made any appeals.</div>
        )}
      </div>
    </Section>
  );
}

/* ── Exam board ──────────────────────────────────────────────────────────── */

const OUTCOMES: BoardOutcome[] = [
  "Progress",
  "Progress — trailing credit",
  "Resit",
  "Repeat year",
  "Withdraw",
  "Award",
];

function ExamBoard() {
  const d = useHeData();
  const [programmeId, setProgrammeId] = useState(d.programmes[0]?.id ?? "");
  const p = d.programmeById(programmeId) ?? d.programmes[0];
  const [stageIdx, setStageIdx] = useState(0);
  const stage = p?.stages[stageIdx] ?? p?.stages[0];
  const board = NEXT_BOARDS[d.tenantId];
  const [recording, setRecording] = useState<{ studentId: string; suggested: BoardOutcome } | null>(
    null,
  );

  const rows = useMemo(() => {
    if (!p || !stage) return [];
    const finalStage = stageIdx === p.stages.length - 1;
    return d.learners
      .filter((l) => l.programmeId === p.id)
      .map((l) => {
        const sum = stageSummary(p, stage, d.modules, d.regs, d.marks, l.id);
        const decisions = d.decisions
          .filter((x) => x.studentId === l.id && x.programmeId === p.id && x.stage === stage.name)
          .sort((a, b) => b.boardDate.localeCompare(a.boardDate));
        return {
          l,
          sum,
          suggested: suggestOutcome(sum, finalStage),
          decision: decisions[0],
          finalStage,
        };
      })
      .filter((r) => r.sum.creditsAttempted > 0 || r.decision);
  }, [d, p, stage, stageIdx]);

  if (!p || !stage) return null;
  const classLabel = (avg: number) =>
    p.level === "PGT" ? pgtClassification(avg) : classify(d.ctx.region.code, avg);

  const ratify = (decisionId: string, studentId: string) => {
    updateItem("boardDecisions", (x) => x.id === decisionId, { ratified: true });
    // Ratification confirms the stage's marks.
    const modIds = new Set([...stage.coreModuleIds, ...stage.optionalModuleIds]);
    updateItem(
      "moduleMarks",
      (x) => x.studentId === studentId && modIds.has(x.moduleId) && x.mark !== undefined,
      { status: "Confirmed" },
    );
    toast.success(`Decision for ${d.name(studentId)} ratified — marks confirmed`);
  };
  const unratified = rows.filter((r) => r.decision && !r.decision.ratified);

  return (
    <>
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 lg:gap-6">
        <Section
          title="Board of examiners"
          description={board ? `Next: ${board.name}, ${fmtDate(board.date)}` : undefined}
          actions={
            <>
              <Select
                className="h-8 w-56"
                value={p.id}
                onChange={(e) => {
                  setProgrammeId(e.target.value);
                  setStageIdx(0);
                }}
                options={d.programmes.map((x) => ({ value: x.id, label: `${x.award} ${x.name}` }))}
              />
              <Select
                className="h-8 w-44"
                value={String(stageIdx)}
                onChange={(e) => setStageIdx(Number(e.target.value))}
                options={p.stages.map((s, i) => ({ value: String(i), label: s.name }))}
              />
              {unratified.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => unratified.forEach((r) => ratify(r.decision!.id, r.l.id))}
                >
                  Ratify all ({unratified.length})
                </Button>
              )}
            </>
          }
        >
          <DataTable
            columns={[
              { key: "student", label: "Student" },
              { key: "avg", label: "Stage average" },
              { key: "credits", label: "Credits passed" },
              { key: "failed", label: "Failed modules" },
              { key: "suggested", label: "Rule suggests" },
              { key: "decision", label: "Board decision" },
              { key: "_actions", label: "", className: "text-right" },
            ]}
            rows={rows}
            emptyText="No students have marks in this stage yet."
            renderCell={(r: (typeof rows)[number], key) => {
              switch (key) {
                case "student":
                  return (
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.l.name} seed={r.l.id} size={28} />
                      <div>
                        <div className="font-medium">{r.l.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.l.status === "Active" ? r.l.level : r.l.status}
                        </div>
                      </div>
                    </div>
                  );
                case "avg":
                  return (
                    <div>
                      <div className="font-semibold">{r.sum.average}%</div>
                      {r.finalStage && (
                        <div className="text-[11px] text-muted-foreground">
                          {classLabel(r.sum.average)}
                        </div>
                      )}
                      {!r.sum.complete && (
                        <div className="text-[10px] text-muted-foreground">in progress</div>
                      )}
                    </div>
                  );
                case "credits":
                  return `${r.sum.creditsPassed}/${r.sum.creditsAttempted}`;
                case "failed": {
                  const f = r.sum.modules.filter((x) => x.outcome.complete && !x.outcome.passed);
                  return f.length ? (
                    <div className="flex flex-wrap gap-1">
                      {f.map((x) => (
                        <Badge key={x.mod.id} tone="destructive">
                          {x.mod.code} {x.outcome.mark}%
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                  );
                }
                case "suggested":
                  return <Badge tone="info">{r.suggested}</Badge>;
                case "decision":
                  return r.decision ? (
                    <div>
                      <div className="text-sm font-medium">{r.decision.outcome}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {fmtDate(r.decision.boardDate)} ·{" "}
                        {r.decision.ratified ? "Ratified" : "Awaiting ratification"}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not yet considered</span>
                  );
                case "_actions":
                  return (
                    <div className="flex justify-end gap-1.5">
                      {r.decision && !r.decision.ratified && (
                        <Button size="sm" onClick={() => ratify(r.decision!.id, r.l.id)}>
                          Ratify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRecording({ studentId: r.l.id, suggested: r.suggested })}
                      >
                        Record
                      </Button>
                    </div>
                  );
              }
            }}
          />
        </Section>
        <Section title="Rules applied">
          <ul className="text-xs space-y-2 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Module pass mark:</span> {p.passMark}%.
              Components are weighted; a resit is capped at the pass mark unless an EC was approved.
            </li>
            <li>
              <span className="font-medium text-foreground">All credits passed:</span> Progress
              (final stage: Award).
            </li>
            <li>
              <span className="font-medium text-foreground">≤ 20 credits failed:</span> Progress
              with trailing credit.
            </li>
            <li>
              <span className="font-medium text-foreground">≤ 60 credits failed:</span> Resit in the
              resit period.
            </li>
            <li>
              <span className="font-medium text-foreground">More than 60 failed:</span> Repeat the
              year.
            </li>
          </ul>
          <div className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground">
            Classification · {d.ctx.region.flag} {d.ctx.region.name}
          </div>
          <ul className="mt-1.5 space-y-1 text-xs">
            {(p.level === "PGT"
              ? [
                  { min: 70, label: "Distinction" },
                  { min: 60, label: "Merit" },
                  { min: 50, label: "Pass" },
                ]
              : d.ctx.region.degreeBands.filter((b) => b.min > 0)
            ).map((b) => (
              <li key={b.label} className="flex justify-between gap-2">
                <span>{b.label}</span>
                <span className="font-mono">≥ {b.min}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-3">
            Rules and bands come from the tenant's region profile and programme — configurable per
            institution in production.
          </p>
        </Section>
      </div>
      {recording && (
        <RecordDecision
          studentId={recording.studentId}
          suggested={recording.suggested}
          programmeId={p.id}
          stageIdx={stageIdx}
          classLabel={classLabel}
          onClose={() => setRecording(null)}
          d={d}
        />
      )}
    </>
  );
}

function RecordDecision({
  studentId,
  suggested,
  programmeId,
  stageIdx,
  classLabel,
  onClose,
  d,
}: {
  studentId: string;
  suggested: BoardOutcome;
  programmeId: string;
  stageIdx: number;
  classLabel: (avg: number) => string;
  onClose: () => void;
  d: HeData;
}) {
  const p = d.programmeById(programmeId)!;
  const stage = p.stages[stageIdx];
  const sum = stageSummary(p, stage, d.modules, d.regs, d.marks, studentId);
  const [outcome, setOutcome] = useState<BoardOutcome>(suggested);
  const [date, setDate] = useState(NEXT_BOARDS[d.tenantId]?.date ?? DEMO_TODAY);
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Record board decision"
      description={`${d.name(studentId)} · ${stage.name} · average ${sum.average}% · ${sum.creditsPassed}/${sum.creditsAttempted} credits`}
      submitLabel="Record decision"
      onSubmit={() => {
        addItem("boardDecisions", {
          id: nextId("BD-", "boardDecisions"),
          tenantId: d.tenantId,
          studentId,
          programmeId,
          stage: stage.name,
          boardDate: date,
          average: sum.average,
          creditsPassed: sum.creditsPassed,
          creditsAttempted: sum.creditsAttempted,
          outcome,
          classification: outcome === "Award" ? classLabel(sum.average) : undefined,
          ratified: false,
        });
        toast.success(`${outcome} recorded for ${d.name(studentId)} — awaiting ratification`);
        onClose();
      }}
    >
      <Field label="Outcome" hint={`Rule suggests: ${suggested}`}>
        <Select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as BoardOutcome)}
          options={OUTCOMES.map((v) => ({ value: v, label: v }))}
        />
      </Field>
      <Field label="Board date">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      {outcome === "Award" && (
        <div className="sm:col-span-2 text-sm rounded-lg bg-success/10 p-3">
          Classification: <span className="font-semibold">{classLabel(sum.average)}</span>
        </div>
      )}
    </FormDialog>
  );
}
