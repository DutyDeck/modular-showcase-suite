import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  Layers,
  Library,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
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
  NumberInput,
  Select,
  useDisclosure,
} from "@/components/ui-kit";
import { PackContextBar, PackEmpty, Tabs } from "@/components/packs/PackUI";
import { useHeData, fmtDate } from "@/components/packs/HeDash";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { moduleRuns, stageIndexFor } from "@/lib/packs/heData";
import { CENSUS_DATE_REGIONS } from "@/lib/packs/regions";
import { useTenantContext } from "@/lib/packs/registry";
import type { AssessmentComponent, HeModule, Programme } from "@/lib/packs/heData";
import { TENANT_STAFF, type TimetableSlot } from "@/lib/packs/opsData";
import {
  availableDays,
  teachingTermFor,
  type StaffTeachingProfile,
  type TeachingAssignment,
} from "@/lib/packs/sis/teaching";
import { logChange, notify } from "@/lib/packs/sis/activity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/he/programmes")({
  head: () => ({ meta: [{ title: "Programmes & Modules — 1StudentID" }] }),
  component: ProgrammesPage,
});

type Tab = "programmes" | "modules" | "staffing";

function ProgrammesPage() {
  const d = useHeData();
  const admin = d.ctx.isAdmin;
  const [tab, setTab] = useState<Tab>("programmes");
  const [selected, setSelected] = useState<string | undefined>();
  const newProg = useDisclosure();
  const newMod = useDisclosure();
  const programme = d.programmes.find((p) => p.id === selected) ?? d.programmes[0];

  const regCount = (moduleId: string) =>
    d.regs.filter(
      (r) =>
        r.moduleId === moduleId && r.status === "Registered" && r.academicYear === d.academicYear,
    ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programmes & Modules"
        subtitle="Programme → stages → credit-bearing modules with prerequisites and weighted assessment."
        actions={
          admin && (
            <>
              <Button variant="outline" onClick={newMod.onOpen}>
                <Plus className="h-4 w-4" /> New module
              </Button>
              <Button onClick={newProg.onOpen}>
                <Plus className="h-4 w-4" /> New programme
              </Button>
            </>
          )
        }
      />
      <PackContextBar
        pack="higher-ed"
        extra={<Badge tone="muted">{d.ctx.region.creditScheme}</Badge>}
      />

      {d.programmes.length === 0 ? (
        <PackEmpty
          pack="higher-ed"
          title="No programmes yet"
          body="Create your first programme, or load the Higher Education starter template (a BSc, an MSc and their module catalogue) and adapt it."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Programmes"
              value={d.programmes.length}
              icon={<Library className="h-4 w-4" />}
            />
            <StatCard
              label="Modules"
              value={d.modules.length}
              icon={<BookOpen className="h-4 w-4" />}
              accent="info"
            />
            <StatCard
              label="Students on programmes"
              value={d.learners.filter((l) => l.programmeId).length}
              icon={<Users className="h-4 w-4" />}
              accent="success"
            />
            <StatCard
              label="Registrations"
              value={
                d.regs.filter((r) => r.status === "Registered" && r.academicYear === d.academicYear)
                  .length
              }
              hint={d.academicYear}
              icon={<Layers className="h-4 w-4" />}
              accent="primary"
            />
          </div>

          <Tabs<Tab>
            tabs={[
              { id: "programmes", label: "Programmes", count: d.programmes.length },
              { id: "modules", label: "Module catalogue", count: d.modules.length },
              ...(admin || d.ctx.user?.role === "teacher"
                ? [{ id: "staffing" as const, label: "Staffing" }]
                : []),
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === "programmes" && programme && (
            <div className="grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
              <div className="space-y-2">
                {d.programmes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${
                      p.id === programme.id
                        ? "border-primary bg-primary/5"
                        : "bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="text-[11px] text-muted-foreground font-mono">{p.code}</div>
                    <div className="text-sm font-medium">
                      {p.award} {p.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {p.level} · {p.durationYears} yr · {p.totalCredits} credits ·{" "}
                      {d.learners.filter((l) => l.programmeId === p.id).length} students
                    </div>
                  </button>
                ))}
              </div>
              <ProgrammeDetail
                key={programme.id}
                programme={programme}
                admin={admin}
                regCount={regCount}
                onDeleted={() => setSelected(undefined)}
              />
            </div>
          )}

          {tab === "modules" && <ModuleCatalogue regCount={regCount} />}
          {tab === "staffing" && <StaffingPanel />}
        </>
      )}

      <NewProgrammeDialog
        open={newProg.open}
        onOpenChange={newProg.setOpen}
        onCreated={setSelected}
      />
      <NewModuleDialog open={newMod.open} onOpenChange={newMod.setOpen} />
    </div>
  );
}

function ProgrammeDetail({
  programme: p,
  admin,
  regCount,
  onDeleted,
}: {
  programme: Programme;
  admin: boolean;
  regCount: (id: string) => number;
  onDeleted: () => void;
}) {
  const d = useHeData();
  const [attachStage, setAttachStage] = useState<number | null>(null);
  const [act, setAct] = useState<ProgAction | null>(null);
  const cal = d.calendars.find((c) => c.id === p.calendarId);

  /** Live registrations this year on a module by students of this programme at a stage. */
  const liveOnStage = (stageName: string, moduleId: string) =>
    d.regs.filter((r) => {
      if (r.moduleId !== moduleId || r.academicYear !== d.academicYear) return false;
      if (r.status !== "Registered" && r.status !== "Pending approval") return false;
      const l = d.learners.find((x) => x.id === r.studentId);
      return l?.programmeId === p.id && p.stages[stageIndexFor(p, l.level)]?.name === stageName;
    }).length;

  const detach = (stageIdx: number, moduleId: string) => {
    const s = p.stages[stageIdx];
    const m = d.moduleById(moduleId);
    const n = liveOnStage(s.name, moduleId);
    if (n) {
      toast.error(
        `${n} student${n > 1 ? "s are" : " is"} registered on ${m?.code} — withdraw them first`,
        {
          description: "Module Registration → Registrations → Withdraw",
        },
      );
      return;
    }
    const stages = p.stages.map((x, i) =>
      i === stageIdx
        ? {
            ...x,
            coreModuleIds: x.coreModuleIds.filter((y) => y !== moduleId),
            optionalModuleIds: x.optionalModuleIds.filter((y) => y !== moduleId),
          }
        : x,
    );
    updateItem("programmes", (x) => x.id === p.id, { stages });
    progLog(d, p.id, `${s.name} · module removed`, m?.code, "—");
    toast.success(`${m?.code} removed from ${s.name}`);
  };

  const toggleKind = (stageIdx: number, moduleId: string) => {
    const s = p.stages[stageIdx];
    const wasCore = s.coreModuleIds.includes(moduleId);
    const stages = p.stages.map((x, i) =>
      i === stageIdx
        ? wasCore
          ? {
              ...x,
              coreModuleIds: x.coreModuleIds.filter((y) => y !== moduleId),
              optionalModuleIds: [...x.optionalModuleIds, moduleId],
            }
          : {
              ...x,
              optionalModuleIds: x.optionalModuleIds.filter((y) => y !== moduleId),
              coreModuleIds: [...x.coreModuleIds, moduleId],
            }
        : x,
    );
    updateItem("programmes", (x) => x.id === p.id, { stages });
    const code = d.moduleById(moduleId)?.code;
    progLog(
      d,
      p.id,
      `${s.name} · ${code}`,
      wasCore ? "Core" : "Optional",
      wasCore ? "Optional" : "Core",
    );
    toast.success(`${code} is now ${wasCore ? "optional" : "core"} on ${s.name}`, {
      description:
        "Existing registrations are unchanged — use Register cohort for new core modules.",
    });
  };

  return (
    <div className="space-y-4">
      <Section
        title={`${p.award} ${p.name}`}
        description={`${p.department} · ${p.code}`}
        actions={
          admin && (
            <>
              <Button size="sm" variant="outline" onClick={() => setAct({ kind: "addStage" })}>
                <Plus className="h-3.5 w-3.5" /> Stage
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAct({ kind: "edit" })}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAct({ kind: "delete" })}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )
        }
      >
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Info label="Level" value={p.level} />
          <Info
            label="Duration"
            value={`${p.durationYears} year${p.durationYears > 1 ? "s" : ""}`}
          />
          <Info label="Total credits" value={p.totalCredits} />
          <Info label="Pass mark" value={`${p.passMark}%`} />
          <Info label="Intakes" value={p.intakes.join(", ")} />
          <Info label="Mode" value={p.mode} />
          <Info label="Calendar" value={cal?.name ?? "—"} />
          <Info label="Students" value={d.learners.filter((l) => l.programmeId === p.id).length} />
        </dl>
      </Section>

      {p.stages.map((s, i) => {
        const core = s.coreModuleIds.map(d.moduleById).filter((m): m is HeModule => !!m);
        const opts = s.optionalModuleIds.map(d.moduleById).filter((m): m is HeModule => !!m);
        const coreCredits = core.reduce((a, m) => a + m.credits, 0);
        const optCredits = opts.reduce((a, m) => a + m.credits, 0);
        const balanced = coreCredits + s.optionalCreditsRequired === s.credits;
        return (
          <Section
            key={s.name}
            title={s.name}
            description={`${s.credits} credits · core ${coreCredits} + choose ${s.optionalCreditsRequired} from ${optCredits} optional`}
            actions={
              <>
                {balanced ? (
                  <Badge tone="success">Credits balance</Badge>
                ) : (
                  <Badge tone="warning">
                    {coreCredits + s.optionalCreditsRequired}/{s.credits} credits
                  </Badge>
                )}
                {admin && (
                  <Button size="sm" variant="outline" onClick={() => setAttachStage(i)}>
                    <Plus className="h-3.5 w-3.5" /> Attach module
                  </Button>
                )}
                {admin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => setAct({ kind: "editStage", idx: i })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {admin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => setAct({ kind: "deleteStage", idx: i })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            }
          >
            <div className="grid md:grid-cols-2 gap-4">
              <ModuleList
                title="Core"
                mods={core}
                admin={admin}
                onRemove={(id) => detach(i, id)}
                onToggle={(id) => toggleKind(i, id)}
                toggleLabel="Make optional"
                regCount={regCount}
              />
              <ModuleList
                title="Optional"
                mods={opts}
                admin={admin}
                onRemove={(id) => detach(i, id)}
                onToggle={(id) => toggleKind(i, id)}
                toggleLabel="Make core"
                regCount={regCount}
              />
            </div>
          </Section>
        );
      })}
      {!p.stages.length && (
        <div className="text-sm text-muted-foreground">No stages yet — add one with “+ Stage”.</div>
      )}

      {attachStage !== null && (
        <AttachDialog programme={p} stageIdx={attachStage} onClose={() => setAttachStage(null)} />
      )}
      {act?.kind === "edit" && (
        <NewProgrammeDialog
          open
          programme={p}
          onOpenChange={(v) => !v && setAct(null)}
          onCreated={() => undefined}
        />
      )}
      {act?.kind === "delete" && (
        <DeleteProgrammeDialog p={p} onClose={() => setAct(null)} onDeleted={onDeleted} />
      )}
      {(act?.kind === "addStage" || act?.kind === "editStage") && (
        <StageDialog
          p={p}
          idx={act.kind === "editStage" ? act.idx : undefined}
          onClose={() => setAct(null)}
        />
      )}
      {act?.kind === "deleteStage" && (
        <DeleteStageDialog p={p} idx={act.idx} onClose={() => setAct(null)} />
      )}
    </div>
  );
}

/* ── Programme / stage / module CRUD ─────────────────────────────────────── */

type ProgAction =
  | { kind: "edit" | "delete" | "addStage" }
  | { kind: "editStage" | "deleteStage"; idx: number };

type HeD = ReturnType<typeof useHeData>;

function progLog(d: HeD, id: string, field: string, from?: string, to?: string, reason?: string) {
  logChange({
    tenantId: d.tenantId,
    entity: "programme",
    entityId: id,
    field,
    from,
    to,
    by: d.ctx.actingAs || "Admin",
    reason,
  });
}

function modLog(d: HeD, id: string, field: string, from?: string, to?: string, reason?: string) {
  logChange({
    tenantId: d.tenantId,
    entity: "module",
    entityId: id,
    field,
    from,
    to,
    by: d.ctx.actingAs || "Admin",
    reason,
  });
}

const n_ = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Blocked / confirm dialog: lists blockers, or asks to confirm. */
function GuardDialog({
  title,
  blockers,
  hint,
  confirmBody,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  blockers: string[];
  hint?: string;
  confirmBody: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const blocked = blockers.length > 0;
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={blocked ? `Can't ${title.toLowerCase()}` : `${title}?`}
      submitLabel={blocked ? "OK" : confirmLabel}
      submitVariant={blocked ? "primary" : "destructive"}
      cancelLabel={blocked ? "Close" : "Cancel"}
      onSubmit={() => {
        if (!blocked) onConfirm();
        onClose();
      }}
    >
      {blocked ? (
        <>
          <ul className="sm:col-span-2 text-sm list-disc pl-5 space-y-1">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {hint && <p className="sm:col-span-2 text-xs text-muted-foreground">{hint}</p>}
        </>
      ) : (
        <div className="sm:col-span-2 text-sm">{confirmBody}</div>
      )}
    </FormDialog>
  );
}

function DeleteProgrammeDialog({
  p,
  onClose,
  onDeleted,
}: {
  p: Programme;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const d = useHeData();
  const intakes = useCollection("intakes").filter(
    (i) => i.tenantId === d.tenantId && i.scope.includes(p.id),
  );
  const apps = useCollection("applications").filter(
    (a) => a.tenantId === d.tenantId && a.programmeId === p.id,
  );
  const learners = d.learners.filter((l) => l.programmeId === p.id);
  const boards = d.decisions.filter((b) => b.programmeId === p.id);
  const blockers = [
    learners.length &&
      `${n_(learners.length, "student is", "students are")} on this programme — move them first (Student Records → Edit details)`,
    intakes.length &&
      `${n_(intakes.length, "intake admits", "intakes admit")} to it (${intakes.map((i) => i.name).join(", ")})`,
    apps.length && `${n_(apps.length, "application")} for it`,
    boards.length && `${n_(boards.length, "exam board decision")} recorded on it`,
  ].filter((x): x is string => !!x);
  return (
    <GuardDialog
      title={`Delete ${p.code}`}
      blockers={blockers}
      hint="Programmes with students or history can't be deleted. Remove the references first."
      confirmBody={`${p.award} ${p.name} and its ${n_(p.stages.length, "stage")} will be removed. Modules stay in the catalogue.`}
      confirmLabel="Delete programme"
      onClose={onClose}
      onConfirm={() => {
        removeItem("programmes", (x) => x.id === p.id);
        progLog(d, p.id, "Programme deleted", `${p.code} ${p.award} ${p.name}`, "—");
        toast.success(`${p.code} deleted`);
        onDeleted();
      }}
    />
  );
}

function StageDialog({ p, idx, onClose }: { p: Programme; idx?: number; onClose: () => void }) {
  const d = useHeData();
  const s = idx !== undefined ? p.stages[idx] : undefined;
  const uk = d.ctx.region.code === "UK";
  const [name, setName] = useState(
    s?.name ??
      (uk
        ? `Level ${4 + p.stages.length} (Year ${p.stages.length + 1})`
        : `Year ${p.stages.length + 1}`),
  );
  const [credits, setCredits] = useState<number | string>(
    s?.credits ?? p.stages[0]?.credits ?? 120,
  );
  const [optReq, setOptReq] = useState<number | string>(s?.optionalCreditsRequired ?? 0);
  const onStage = s ? d.learners.filter((l) => l.programmeId === p.id && l.level === s.name) : [];
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={s ? `Edit ${s.name}` : "Add stage"}
      description={`${p.award} ${p.name}`}
      submitLabel={s ? "Save stage" : "Add stage"}
      onSubmit={() => {
        const nm = name.trim();
        if (!nm || !(Number(credits) > 0)) {
          toast.error("Give the stage a name and its credits");
          return;
        }
        if (p.stages.some((x, i) => x.name === nm && i !== idx)) {
          toast.error(`${nm} already exists on this programme`);
          return;
        }
        if (Number(optReq) < 0 || Number(optReq) > Number(credits)) {
          toast.error("Optional credits must be between 0 and the stage credits");
          return;
        }
        const next = {
          name: nm,
          credits: Number(credits),
          optionalCreditsRequired: Number(optReq),
        };
        const stages = s
          ? p.stages.map((x, i) => (i === idx ? { ...x, ...next } : x))
          : [...p.stages, { ...next, coreModuleIds: [], optionalModuleIds: [] }];
        updateItem("programmes", (x) => x.id === p.id, {
          stages,
          totalCredits: stages.reduce((a, x) => a + x.credits, 0),
        });
        if (s) {
          if (s.name !== nm) {
            // Students' level is the stage name — keep them on their stage.
            updateItem(
              "learners",
              (l) => l.tenantId === d.tenantId && l.programmeId === p.id && l.level === s.name,
              { level: nm },
            );
            for (const l of onStage)
              logChange({
                tenantId: d.tenantId,
                entity: "learner",
                entityId: l.id,
                studentId: l.id,
                field: "Year / level",
                from: s.name,
                to: nm,
                by: d.ctx.actingAs || "Admin",
                reason: `Stage renamed on ${p.code}`,
              });
            progLog(d, p.id, "Stage name", s.name, nm);
          }
          if (s.credits !== next.credits)
            progLog(d, p.id, `${nm} · credits`, String(s.credits), String(next.credits));
          if (s.optionalCreditsRequired !== next.optionalCreditsRequired)
            progLog(
              d,
              p.id,
              `${nm} · optional credits`,
              String(s.optionalCreditsRequired),
              String(next.optionalCreditsRequired),
            );
          toast.success(`${nm} saved`);
        } else {
          progLog(d, p.id, "Stage added", undefined, `${nm} · ${next.credits} credits`);
          toast.success(`${nm} added — attach its modules next`);
        }
        onClose();
      }}
    >
      <Field
        label="Stage name"
        required
        className="sm:col-span-2"
        hint={
          s && onStage.length
            ? `${n_(onStage.length, "student")} on this stage — their level follows a rename.`
            : "Students' year / level matches this name."
        }
      >
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Credits" required>
        <NumberInput min={1} value={credits} onChange={(e) => setCredits(e.target.value)} />
      </Field>
      <Field label="Optional credits to choose">
        <NumberInput min={0} value={optReq} onChange={(e) => setOptReq(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

function DeleteStageDialog({
  p,
  idx,
  onClose,
}: {
  p: Programme;
  idx: number;
  onClose: () => void;
}) {
  const d = useHeData();
  const s = p.stages[idx];
  const onStage = d.learners.filter((l) => l.programmeId === p.id && l.level === s.name);
  const boards = d.decisions.filter((b) => b.programmeId === p.id && b.stage === s.name);
  const mods = s.coreModuleIds.length + s.optionalModuleIds.length;
  const blockers = [
    onStage.length && `${n_(onStage.length, "student is", "students are")} on ${s.name}`,
    boards.length && `${n_(boards.length, "exam board decision")} recorded for it`,
    p.stages.length === 1 && "It is the programme's only stage",
  ].filter((x): x is string => !!x);
  return (
    <GuardDialog
      title={`Remove ${s.name}`}
      blockers={blockers}
      hint="Move students to another stage first (Student Records → Edit details)."
      confirmBody={
        mods
          ? `${s.name} and its ${n_(mods, "module link")} will be removed. The modules stay in the catalogue.`
          : `${s.name} will be removed.`
      }
      confirmLabel="Remove stage"
      onClose={onClose}
      onConfirm={() => {
        const stages = p.stages.filter((_, i) => i !== idx);
        updateItem("programmes", (x) => x.id === p.id, {
          stages,
          totalCredits: stages.reduce((a, x) => a + x.credits, 0),
        });
        progLog(d, p.id, "Stage removed", `${s.name} · ${s.credits} credits`, "—");
        toast.success(`${s.name} removed`);
      }}
    />
  );
}

function DeleteModuleDialog({ m, onClose }: { m: HeModule; onClose: () => void }) {
  const d = useHeData();
  const sittings = useCollection("examSittings").filter((x) => x.moduleId === m.id);
  const teaching = useCollection("teachingAssignments").filter((x) => x.moduleId === m.id);
  const batches = useCollection("markBatches").filter((x) => x.moduleId === m.id);
  const appeals = useCollection("gradeAppeals").filter((x) => x.moduleId === m.id);
  const regs = d.regs.filter((r) => r.moduleId === m.id);
  const live = regs.filter(
    (r) =>
      r.academicYear === d.academicYear &&
      (r.status === "Registered" || r.status === "Pending approval"),
  ).length;
  const marks = d.marks.filter((x) => x.moduleId === m.id);
  const ecs = d.ecs.filter((x) => x.moduleId === m.id);
  const prereqOf = d.modules.filter((x) => x.prerequisites.includes(m.code));
  const inStages = d.programmes.filter((p) =>
    p.stages.some((s) => s.coreModuleIds.includes(m.id) || s.optionalModuleIds.includes(m.id)),
  );
  const blockers = [
    regs.length &&
      (live
        ? `${n_(live, "student is", "students are")} registered on it this year — withdraw them first`
        : `${n_(regs.length, "past registration")} on record`),
    marks.length && `${n_(marks.length, "mark")} recorded`,
    sittings.length && `${n_(sittings.length, "exam sitting")} scheduled`,
    teaching.length && `${n_(teaching.length, "teaching assignment")} (Staffing tab)`,
    batches.length && `${n_(batches.length, "mark batch", "mark batches")}`,
    appeals.length && `${n_(appeals.length, "grade appeal")}`,
    ecs.length && `${n_(ecs.length, "extenuating circumstances claim")}`,
    prereqOf.length && `Prerequisite of ${prereqOf.map((x) => x.code).join(", ")}`,
  ].filter((x): x is string => !!x);
  return (
    <GuardDialog
      title={`Delete ${m.code}`}
      blockers={blockers}
      hint="A module with students, marks or timetabled teaching keeps its history. Remove those references first."
      confirmBody={
        inStages.length
          ? `${m.code} ${m.title} will be deleted and removed from ${inStages.map((p) => p.code).join(", ")}.`
          : `${m.code} ${m.title} will be deleted from the catalogue.`
      }
      confirmLabel="Delete module"
      onClose={onClose}
      onConfirm={() => {
        for (const p of inStages) {
          updateItem("programmes", (x) => x.id === p.id, {
            stages: p.stages.map((s) => ({
              ...s,
              coreModuleIds: s.coreModuleIds.filter((y) => y !== m.id),
              optionalModuleIds: s.optionalModuleIds.filter((y) => y !== m.id),
            })),
          });
          progLog(d, p.id, "Module removed", m.code, "—", "Module deleted");
        }
        removeItem("heModules", (x) => x.id === m.id);
        modLog(d, m.id, "Module deleted", `${m.code} ${m.title}`, "—");
        toast.success(`${m.code} deleted`);
      }}
    />
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium truncate">{value}</dd>
    </div>
  );
}

function ModuleList({
  title,
  mods,
  admin,
  onRemove,
  onToggle,
  toggleLabel,
  regCount,
}: {
  title: string;
  mods: HeModule[];
  admin: boolean;
  onRemove: (id: string) => void;
  onToggle?: (id: string) => void;
  toggleLabel?: string;
  regCount: (id: string) => number;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="space-y-1.5">
        {mods.map((m) => (
          <div key={m.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm">
            <span className="font-mono text-[11px] text-muted-foreground w-12 shrink-0">
              {m.code}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate">{m.title}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {m.credits} cr · {m.semester} · {m.leader}
                {m.prerequisites.length > 0 && ` · needs ${m.prerequisites.join(", ")}`}
              </div>
            </div>
            <Badge tone="muted">
              {regCount(m.id)}/{m.capacity}
            </Badge>
            {admin && onToggle && (
              <button
                onClick={() => onToggle(m.id)}
                className="text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap"
                title={toggleLabel}
              >
                {toggleLabel}
              </button>
            )}
            {admin && (
              <button
                onClick={() => onRemove(m.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${m.code}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {!mods.length && <div className="text-xs text-muted-foreground">None</div>}
      </div>
    </div>
  );
}

function AttachDialog({
  programme: p,
  stageIdx,
  onClose,
}: {
  programme: Programme;
  stageIdx: number;
  onClose: () => void;
}) {
  const d = useHeData();
  const stage = p.stages[stageIdx];
  const inStage = new Set([...stage.coreModuleIds, ...stage.optionalModuleIds]);
  const candidates = d.modules.filter((m) => !inStage.has(m.id));
  const [moduleId, setModuleId] = useState(candidates[0]?.id ?? "");
  const [kind, setKind] = useState<"Core" | "Optional">("Optional");
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Attach module to ${stage.name}`}
      description={`${p.award} ${p.name}`}
      submitLabel="Attach"
      onSubmit={() => {
        if (!moduleId) return;
        const stages = p.stages.map((s, i) =>
          i === stageIdx
            ? kind === "Core"
              ? { ...s, coreModuleIds: [...s.coreModuleIds, moduleId] }
              : { ...s, optionalModuleIds: [...s.optionalModuleIds, moduleId] }
            : s,
        );
        updateItem("programmes", (x) => x.id === p.id, { stages });
        progLog(
          d,
          p.id,
          `${stage.name} · module attached`,
          undefined,
          `${d.moduleById(moduleId)?.code} (${kind})`,
        );
        toast.success(`${d.moduleById(moduleId)?.code} attached as ${kind.toLowerCase()}`);
        onClose();
      }}
    >
      <Field label="Module" className="sm:col-span-2">
        <Select
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          options={candidates.map((m) => ({
            value: m.id,
            label: `${m.code} — ${m.title} (${m.credits} cr, ${m.level})`,
          }))}
        />
      </Field>
      <Field label="Type">
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as "Core" | "Optional")}
          options={[
            { value: "Core", label: "Core (compulsory)" },
            { value: "Optional", label: "Optional" },
          ]}
        />
      </Field>
    </FormDialog>
  );
}

function ModuleCatalogue({ regCount }: { regCount: (id: string) => number }) {
  const d = useHeData();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [modAct, setModAct] = useState<{ kind: "edit" | "delete"; m: HeModule } | null>(null);
  const admin = d.ctx.isAdmin;
  const levels = useMemo(() => Array.from(new Set(d.modules.map((m) => m.level))), [d.modules]);
  // Delivery is relative to each intake's calendar — show the dated runs.
  const ctx = useTenantContext();
  const intakes = useCollection("intakes");
  const calendars = useCollection("academicCalendars");
  const programmes = useCollection("programmes");
  const census = CENSUS_DATE_REGIONS.includes(ctx.region.code);
  const rows = d.modules.filter(
    (m) =>
      (level === "all" || m.level === level) &&
      (!q || `${m.code} ${m.title} ${m.leader}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <Section
      title="Module catalogue"
      description="Credits, prerequisites, capacity and weighted assessment components"
      actions={
        <>
          <TextInput
            placeholder="Search code, title, leader…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56 h-8"
          />
          <Select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-36 h-8"
            options={[
              { value: "all", label: "All levels" },
              ...levels.map((l) => ({ value: l, label: l })),
            ]}
          />
        </>
      }
    >
      <DataTable
        columns={[
          { key: "module", label: "Module" },
          { key: "credits", label: "Credits" },
          { key: "sem", label: "Delivery" },
          { key: "leader", label: "Leader" },
          { key: "prereq", label: "Prerequisites" },
          { key: "fill", label: "Registered" },
          { key: "assess", label: "Assessment" },
          ...(admin ? [{ key: "_actions", label: "", className: "text-right" }] : []),
        ]}
        rows={rows}
        renderCell={(m: HeModule, key) => {
          switch (key) {
            case "_actions":
              return (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${m.code}`}
                    onClick={() => setModAct({ kind: "edit", m })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${m.code}`}
                    onClick={() => setModAct({ kind: "delete", m })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            case "module":
              return (
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-muted-foreground">{m.code}</div>
                  <div className="font-medium">{m.title}</div>
                </div>
              );
            case "credits":
              return m.credits;
            case "sem": {
              const runs = moduleRuns(m, programmes, intakes, calendars, census);
              return (
                <div className="text-xs">
                  {m.level} · {m.semester}
                  {runs.map((r) => (
                    <div
                      key={r.intakeName}
                      className="text-[11px] text-muted-foreground whitespace-nowrap"
                    >
                      {r.intakeName}: {fmtDate(r.start)} – {fmtDate(r.end)}
                      {r.census && ` · census ${fmtDate(r.census)}`}
                    </div>
                  ))}
                </div>
              );
            }
            case "leader":
              return m.leader;
            case "prereq":
              return m.prerequisites.length ? (
                m.prerequisites.join(", ")
              ) : (
                <span className="text-muted-foreground">—</span>
              );
            case "fill": {
              const n = regCount(m.id);
              return (
                <Badge tone={n >= m.capacity ? "destructive" : "muted"}>
                  {n}/{m.capacity}
                </Badge>
              );
            }
            case "assess":
              return (
                <div className="flex flex-wrap gap-1">
                  {m.components.map((c) => (
                    <span
                      key={c.id}
                      title={`Due ${fmtDate(c.due)}`}
                      className="text-[11px] rounded bg-muted px-1.5 py-0.5 whitespace-nowrap"
                    >
                      {c.name} {c.weight}%
                    </span>
                  ))}
                </div>
              );
          }
        }}
      />
      {modAct?.kind === "edit" && (
        <NewModuleDialog
          key={modAct.m.id}
          open
          module={modAct.m}
          onOpenChange={(v) => !v && setModAct(null)}
        />
      )}
      {modAct?.kind === "delete" && (
        <DeleteModuleDialog m={modAct.m} onClose={() => setModAct(null)} />
      )}
    </Section>
  );
}

/* ── Staffing: teaching load and lecturer assignment ─────────────────────── */

type Role = TeachingAssignment["role"];
const ROLES: Role[] = ["Module leader", "Lecturer", "Tutor", "Second marker", "Supervisor"];
const TEACHING_ROLES: Role[] = ["Module leader", "Lecturer"];
const ROLE_SHORT: Record<Role, string> = {
  "Module leader": "Lead",
  Lecturer: "Teach",
  Tutor: "Tutor",
  "Second marker": "2nd mark",
  Supervisor: "Supervise",
};

function defaultHours(role: Role, credits: number) {
  if (role === "Second marker") return 8;
  if (role === "Supervisor") return 15;
  if (role === "Tutor") return Math.round(credits * 0.6);
  return Math.round(credits * 1.1);
}

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "advanced",
  "foundations",
  "fundamentals",
  "principles",
  "introduction",
]);
const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

interface Suggestion {
  p: StaffTeachingProfile;
  score: number;
  matched: string[];
  offDays: string[];
  pct: number;
  projected: number;
}

/** Rank lecturers for a module: expertise match on the title, availability on
 *  the module's timetabled days, then lowest load (and never over contract). */
function suggestFor(
  m: HeModule,
  hours: number,
  profiles: StaffTeachingProfile[],
  loadOf: (name: string) => number,
  slots: TimetableSlot[],
): Suggestion[] {
  const titleWords = words(m.title);
  const days = [...new Set(slots.filter((s) => s.groupLabel.startsWith(m.code)).map((s) => s.day))];
  return profiles
    .filter((p) => p.basis !== "week" && p.contractHours > 0)
    .map((p) => {
      const matched = p.expertise.filter((e) =>
        words(e).some((x) =>
          titleWords.some((w) => w.startsWith(x.slice(0, 4)) || x.startsWith(w.slice(0, 4))),
        ),
      );
      const avail = availableDays(p.availability);
      const offDays = days.filter((d) => !avail.includes(d));
      const load = loadOf(p.staffName);
      const pct = Math.round((load / p.contractHours) * 100);
      const projected = Math.round(((load + hours) / p.contractHours) * 100);
      const score =
        matched.length * 40 + (offDays.length ? -30 : 10) - pct * 0.5 - (projected > 100 ? 50 : 0);
      return { p, score, matched, offDays, pct, projected };
    })
    .sort((a, b) => b.score - a.score);
}

function LoadBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 min-w-36">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            pct > 100 ? "bg-destructive" : pct >= 90 ? "bg-warning" : "bg-success",
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs w-10 text-right tabular-nums",
          pct > 100 && "text-destructive font-semibold",
        )}
      >
        {pct}%
      </span>
    </div>
  );
}

function StaffingPanel() {
  const d = useHeData();
  const admin = d.ctx.isAdmin;
  const me = d.ctx.user?.name ?? "";
  const { term, semesters } = teachingTermFor(d.tenantId);
  const allProfiles = useCollection("staffTeachingProfiles");
  const allAssignments = useCollection("teachingAssignments");
  const allSlots = useCollection("timetableSlots");
  const profiles = useMemo(
    () => allProfiles.filter((p) => p.tenantId === d.tenantId),
    [allProfiles, d.tenantId],
  );
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.tenantId === d.tenantId && a.term === term),
    [allAssignments, d.tenantId, term],
  );
  const slots = useMemo(
    () => allSlots.filter((s) => s.tenantId === d.tenantId),
    [allSlots, d.tenantId],
  );
  const [assignFor, setAssignFor] = useState<{ m: HeModule; suggest: boolean } | null>(null);

  const running = d.modules.filter((m) => semesters.includes(m.semester));
  const loadOf = (name: string) =>
    assignments.filter((a) => a.staffName === name).reduce((h, a) => h + a.hours, 0);
  const roleOf = (n: string) => TENANT_STAFF[d.tenantId]?.find((x) => x.name === n)?.role;
  const staff = [
    ...new Set([
      ...profiles.filter((p) => p.basis !== "week").map((p) => p.staffName),
      ...assignments.map((a) => a.staffName),
    ]),
  ];
  const loadRows = staff
    .map((name) => {
      const prof = profiles.find((p) => p.staffName === name);
      const hours = loadOf(name);
      const contract = prof?.contractHours ?? 0;
      return {
        name,
        prof,
        hours,
        contract,
        pct: contract ? Math.round((hours / contract) * 100) : 0,
        mine: assignments.filter((a) => a.staffName === name),
      };
    })
    .sort((a, b) => b.pct - a.pct);
  const staffOf = (m: HeModule) => assignments.filter((a) => a.moduleId === m.id);
  const isUnstaffed = (m: HeModule) => !staffOf(m).some((a) => TEACHING_ROLES.includes(a.role));
  const moduleRows = [...running].sort(
    (a, b) => Number(isUnstaffed(b)) - Number(isUnstaffed(a)) || a.code.localeCompare(b.code),
  );
  const unstaffed = running.filter(isUnstaffed);
  const over = loadRows.filter((r) => r.pct > 100);
  const label = (a: TeachingAssignment) =>
    a.moduleId ? (d.moduleById(a.moduleId)?.code ?? a.moduleId) : (a.groupLabel ?? "—");

  const unassign = (a: TeachingAssignment) => {
    removeItem("teachingAssignments", (x) => x.id === a.id);
    notify({
      tenantId: d.tenantId,
      channel: "Email",
      to: a.staffName,
      subject: `Teaching change: you are no longer ${a.role.toLowerCase()} on ${label(a)} (${term})`,
      source: "Programmes · staffing",
      relatedId: a.moduleId ?? a.id,
    });
    logChange({
      tenantId: d.tenantId,
      entity: "heModule",
      entityId: a.moduleId ?? a.groupLabel ?? a.id,
      field: `Staffing ${term}`,
      from: `${a.staffName} — ${a.role} (${a.hours} h)`,
      to: "Removed",
      by: me,
    });
    toast.success(`${a.staffName} removed from ${label(a)}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Teaching staff" value={loadRows.length} hint={term} />
        <StatCard
          label="Over contract"
          value={over.length}
          accent={over.length ? "destructive" : "success"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Unstaffed modules"
          value={unstaffed.length}
          accent={unstaffed.length ? "warning" : "success"}
          hint={`${running.length} running this term`}
        />
        {d.ctx.user?.role === "teacher" ? (
          <StatCard
            label="My load"
            value={`${loadRows.find((r) => r.name === me)?.pct ?? 0}%`}
            hint={`${loadOf(me)} h of ${profiles.find((p) => p.staffName === me)?.contractHours ?? "—"} h`}
            accent="info"
          />
        ) : (
          <StatCard
            label="Hours assigned"
            value={assignments.reduce((h, a) => h + a.hours, 0)}
            accent="info"
          />
        )}
      </div>

      <Section
        title={`Teaching load — ${term}`}
        description="Contact hours assigned this term against each contract."
      >
        <DataTable
          columns={[
            { key: "name", label: "Lecturer" },
            { key: "hours", label: "Hours" },
            { key: "load", label: "Load" },
            { key: "teaches", label: "Teaches" },
            { key: "expertise", label: "Expertise · availability" },
          ]}
          rows={loadRows}
          renderCell={(r: (typeof loadRows)[number], key) => {
            if (key === "name")
              return (
                <div>
                  <div className="font-medium">
                    {r.name} {r.name === me && <Badge tone="info">You</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{roleOf(r.name) ?? "—"}</div>
                </div>
              );
            if (key === "hours")
              return (
                <span className="tabular-nums">
                  {r.hours} / {r.contract || "—"}
                </span>
              );
            if (key === "load")
              return (
                <div className="flex items-center gap-2">
                  <LoadBar pct={r.pct} />
                  {r.pct > 100 && <Badge tone="destructive">Over-loaded</Badge>}
                  {r.pct >= 90 && r.pct <= 100 && <Badge tone="warning">Near limit</Badge>}
                </div>
              );
            if (key === "teaches")
              return (
                <div className="flex flex-wrap gap-1">
                  {r.mine.map((a) => (
                    <span
                      key={a.id}
                      title={`${a.role} · ${a.hours} h`}
                      className="text-[11px] rounded bg-muted px-1.5 py-0.5 whitespace-nowrap"
                    >
                      {label(a)} · {ROLE_SHORT[a.role]}
                    </span>
                  ))}
                  {r.mine.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              );
            if (key === "expertise")
              return (
                <div className="text-xs">
                  {r.prof?.expertise.join(", ") ?? "—"}
                  <div className="text-[11px] text-muted-foreground">
                    {r.prof?.availability ?? ""}
                  </div>
                </div>
              );
            return null;
          }}
        />
      </Section>

      <Section
        title="Module staffing"
        description="Who leads, teaches and second-marks each module running this term."
        actions={
          unstaffed.length > 0 ? (
            <Badge tone="warning">{unstaffed.length} unstaffed</Badge>
          ) : (
            <Badge tone="success">All staffed</Badge>
          )
        }
      >
        <DataTable
          columns={[
            { key: "module", label: "Module" },
            { key: "lead", label: "Leads" },
            { key: "teach", label: "Teaches" },
            { key: "other", label: "Marking / supervision" },
            { key: "_a", label: "" },
          ]}
          rows={moduleRows}
          renderCell={(m: HeModule, key) => {
            const mine = staffOf(m);
            const people = (roles: Role[]) => {
              const xs = mine.filter((a) => roles.includes(a.role));
              if (!xs.length) return <span className="text-xs text-muted-foreground">—</span>;
              return (
                <div className="space-y-0.5">
                  {xs.map((a) => (
                    <div key={a.id} className="flex items-center gap-1 text-xs">
                      <span className={cn(a.staffName === me && "font-semibold")}>
                        {a.staffName}
                      </span>
                      <span className="text-muted-foreground">
                        {roles.length > 1 ? `${ROLE_SHORT[a.role]} · ` : ""}
                        {a.hours} h
                      </span>
                      {admin && (
                        <button
                          onClick={() => unassign(a)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${a.staffName}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            };
            if (key === "module")
              return (
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {m.code} · {m.semester} · {m.credits} cr
                  </div>
                  <div className="font-medium">{m.title}</div>
                  {isUnstaffed(m) && (
                    <div className="mt-0.5">
                      <Badge tone="warning">Unstaffed</Badge>{" "}
                      <span className="text-[11px] text-muted-foreground">
                        catalogue lists {m.leader}
                      </span>
                    </div>
                  )}
                </div>
              );
            if (key === "lead") return people(["Module leader"]);
            if (key === "teach") return people(["Lecturer", "Tutor"]);
            if (key === "other") return people(["Second marker", "Supervisor"]);
            if (key === "_a")
              return admin ? (
                <div className="flex gap-1.5 justify-end">
                  {isUnstaffed(m) && (
                    <Button size="sm" onClick={() => setAssignFor({ m, suggest: true })}>
                      <Sparkles className="h-3.5 w-3.5" /> Suggest
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAssignFor({ m, suggest: false })}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Assign
                  </Button>
                </div>
              ) : null;
            return null;
          }}
        />
      </Section>

      {assignFor && (
        <AssignDialog
          key={assignFor.m.id}
          module={assignFor.m}
          suggestFirst={assignFor.suggest}
          term={term}
          profiles={profiles}
          loadOf={loadOf}
          slots={slots}
          leaderTaken={staffOf(assignFor.m).some((a) => a.role === "Module leader")}
          onClose={() => setAssignFor(null)}
        />
      )}
    </div>
  );
}

function AssignDialog({
  module: m,
  suggestFirst,
  term,
  profiles,
  loadOf,
  slots,
  leaderTaken,
  onClose,
}: {
  module: HeModule;
  suggestFirst: boolean;
  term: string;
  profiles: StaffTeachingProfile[];
  loadOf: (name: string) => number;
  slots: TimetableSlot[];
  leaderTaken: boolean;
  onClose: () => void;
}) {
  const d = useHeData();
  const me = d.ctx.user?.name ?? "";
  const [role, setRole] = useState<Role>(leaderTaken ? "Lecturer" : "Module leader");
  const [hours, setHours] = useState<number | string>(defaultHours(role, m.credits));
  const h = Number(hours) || 0;
  const ranked = suggestFor(m, h, profiles, loadOf, slots);
  const pool = profiles.filter((p) => p.basis !== "week").map((p) => p.staffName);
  const [staff, setStaff] = useState(
    suggestFirst ? (ranked[0]?.p.staffName ?? pool[0] ?? "") : (pool[0] ?? ""),
  );
  const prof = profiles.find((p) => p.staffName === staff);
  const projected = prof ? Math.round(((loadOf(staff) + h) / prof.contractHours) * 100) : 0;

  const submit = () => {
    if (!staff || h <= 0) {
      toast.error("Choose a lecturer and the hours");
      return;
    }
    const id = nextId("TA-", "teachingAssignments");
    addItem("teachingAssignments", {
      id,
      tenantId: d.tenantId,
      staffName: staff,
      moduleId: m.id,
      role,
      hours: h,
      term,
    });
    if (role === "Module leader" && m.leader !== staff) {
      updateItem("heModules", (x) => x.id === m.id, { leader: staff });
      logChange({
        tenantId: d.tenantId,
        entity: "heModule",
        entityId: m.id,
        field: "Module leader",
        from: m.leader,
        to: staff,
        by: me,
      });
    }
    logChange({
      tenantId: d.tenantId,
      entity: "heModule",
      entityId: m.id,
      field: `Staffing ${term}`,
      to: `${staff} — ${role} (${h} h)`,
      by: me,
    });
    notify({
      tenantId: d.tenantId,
      channel: "Email",
      to: staff,
      subject: `You've been assigned ${m.code} ${m.title} — ${role}, ${h} h (${term})`,
      body: `Your load this term is now ${projected}% of contract.`,
      source: "Programmes · staffing",
      relatedId: m.id,
    });
    toast.success(`${staff} assigned to ${m.code} as ${role.toLowerCase()}`, {
      description: `Notified by email · load now ${projected}%${projected > 100 ? " (over contract)" : ""}.`,
    });
    onClose();
  };

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Staff ${m.code} ${m.title}`}
      description={`${m.credits} credits · ${m.semester} · ${term}`}
      submitLabel="Assign"
      onSubmit={submit}
    >
      <div className="sm:col-span-2 space-y-1.5">
        <div className="text-xs font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Suggested
        </div>
        {ranked.slice(0, 3).map((r, i) => (
          <button
            key={r.p.id}
            type="button"
            onClick={() => setStaff(r.p.staffName)}
            className={cn(
              "w-full text-left rounded-md border px-3 py-2 text-xs transition-colors",
              staff === r.p.staffName ? "border-primary bg-primary/5" : "hover:bg-muted/50",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">
                {r.p.staffName} {i === 0 && <Badge tone="success">Best match</Badge>}
              </span>
              <span className={cn(r.projected > 100 && "text-destructive font-semibold")}>
                {r.pct}% → {r.projected}%
              </span>
            </div>
            <div className="text-muted-foreground mt-0.5">
              {r.matched.length ? `Expertise: ${r.matched.join(", ")}` : "No expertise match"} ·{" "}
              {r.offDays.length
                ? `not available ${r.offDays.join(", ")}`
                : `available (${r.p.availability})`}
            </div>
          </button>
        ))}
      </div>
      <Field label="Lecturer">
        <Select
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          options={pool.map((p) => ({ value: p, label: p }))}
        />
      </Field>
      <Field label="Role">
        <Select
          value={role}
          onChange={(e) => {
            const r = e.target.value as Role;
            setRole(r);
            setHours(defaultHours(r, m.credits));
          }}
          options={ROLES.map((r) => ({ value: r, label: r }))}
        />
      </Field>
      <Field label="Contact hours this term">
        <NumberInput min={1} value={hours} onChange={(e) => setHours(e.target.value)} />
      </Field>
      <div className="flex items-end">
        {prof && (
          <div className="w-full">
            <div className="text-[11px] text-muted-foreground mb-1">Load after assigning</div>
            <LoadBar pct={projected} />
          </div>
        )}
      </div>
      {projected > 100 && (
        <div className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs flex gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
          {staff} would be at {projected}% of contract. You can still assign, but agree it with them
          first.
        </div>
      )}
      {role === "Module leader" && leaderTaken && (
        <div className="sm:col-span-2 text-xs text-warning-foreground">
          This module already has a leader for {term}.
        </div>
      )}
    </FormDialog>
  );
}

/* ── Dialogs ─────────────────────────────────────────────────────────────── */

function NewProgrammeDialog({
  open,
  onOpenChange,
  onCreated,
  programme,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
  /** Edit mode: the programme being changed (stages are edited separately). */
  programme?: Programme;
}) {
  const d = useHeData();
  const uk = d.ctx.region.code === "UK";
  const p = programme;
  const [f, setF] = useState({
    code: p?.code ?? "",
    name: p?.name ?? "",
    award: p?.award ?? "BSc (Hons)",
    level: (p?.level ?? "UG") as Programme["level"],
    department: p?.department ?? "",
    durationYears: p?.durationYears ?? 3,
    stageCredits: p?.stages[0]?.credits ?? (uk ? 120 : 80),
    intakes: p?.intakes.join(", ") ?? "Sep",
    mode: (p?.mode ?? "Full-time") as Programme["mode"],
    passMark: p?.passMark ?? (uk ? 40 : 50),
    calendarId: p?.calendarId ?? d.defaultCal?.id ?? "",
  });
  const set = (k: keyof typeof f, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  const awards = [
    "BSc (Hons)",
    "BA (Hons)",
    "BEng (Hons)",
    "MSc",
    "MA",
    "MBA",
    "Bachelor of",
    "Diploma",
    "HND",
  ];
  const intakeList = f.intakes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const saveEdit = (p: Programme) => {
    const next = {
      code: f.code.trim(),
      name: f.name.trim(),
      award: f.award,
      level: f.level,
      department: f.department.trim() || "—",
      durationYears: Number(f.durationYears),
      intakes: intakeList,
      mode: f.mode,
      passMark: Number(f.passMark),
      calendarId: f.calendarId,
    };
    const labels: Record<keyof typeof next, string> = {
      code: "Code",
      name: "Name",
      award: "Award",
      level: "Level",
      department: "Department",
      durationYears: "Duration (years)",
      intakes: "Intakes",
      mode: "Mode",
      passMark: "Pass mark",
      calendarId: "Calendar",
    };
    const show = (k: keyof typeof next, v: unknown) =>
      k === "calendarId"
        ? (d.calendars.find((c) => c.id === v)?.name ?? String(v || "—"))
        : Array.isArray(v)
          ? v.join(", ")
          : String(v ?? "—");
    const changed = (Object.keys(next) as (keyof typeof next)[]).filter(
      (k) => show(k, p[k]) !== show(k, next[k]),
    );
    if (!changed.length) {
      onOpenChange(false);
      return;
    }
    updateItem("programmes", (x) => x.id === p.id, next);
    for (const k of changed) progLog(d, p.id, labels[k], show(k, p[k]), show(k, next[k]));
    const students = d.learners.filter((l) => l.programmeId === p.id).length;
    toast.success(`${next.code} updated — ${n_(changed.length, "change")} logged`, {
      description:
        changed.includes("passMark") && students
          ? `New pass mark applies to ${n_(students, "student")}' module outcomes.`
          : undefined,
    });
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={p ? `Edit ${p.code}` : "New programme"}
      description={
        p
          ? "Stages, credits and modules are edited on the stage cards."
          : "Stages are created from the duration — attach modules afterwards."
      }
      submitLabel={p ? "Save changes" : "Create programme"}
      onSubmit={() => {
        if (!f.name.trim() || !f.code.trim()) {
          toast.error("Code and name are required");
          return;
        }
        if (
          d.programmes.some(
            (x) => x.code.toLowerCase() === f.code.trim().toLowerCase() && x.id !== p?.id,
          )
        ) {
          toast.error(`Programme code ${f.code.trim()} already exists`);
          return;
        }
        if (p) {
          saveEdit(p);
          return;
        }
        const id = `PRG-${Date.now().toString().slice(-6)}`;
        const pgt = f.level === "PGT";
        const stages = pgt
          ? [
              {
                name: "PGT (MSc)",
                credits: Number(f.stageCredits) * 1.5,
                coreModuleIds: [],
                optionalModuleIds: [],
                optionalCreditsRequired: 0,
              },
            ]
          : Array.from({ length: Number(f.durationYears) }, (_, i) => ({
              name: uk ? `Level ${4 + i} (Year ${i + 1})` : `Year ${i + 1}`,
              credits: Number(f.stageCredits),
              coreModuleIds: [],
              optionalModuleIds: [],
              optionalCreditsRequired: 0,
            }));
        addItem("programmes", {
          id,
          tenantId: d.tenantId,
          code: f.code.trim(),
          name: f.name.trim(),
          award: f.award,
          level: f.level,
          department: f.department || "—",
          durationYears: Number(f.durationYears),
          totalCredits: stages.reduce((a, s) => a + s.credits, 0),
          intakes: intakeList,
          mode: f.mode,
          calendarId: f.calendarId,
          stages,
          passMark: Number(f.passMark),
        });
        progLog(
          d,
          id,
          "Programme created",
          undefined,
          `${f.code.trim()} ${f.award} ${f.name.trim()}`,
        );
        toast.success(`${f.award} ${f.name} created`);
        onCreated(id);
        onOpenChange(false);
      }}
    >
      <Field label="Programme code" required>
        <TextInput
          value={f.code}
          onChange={(e) => set("code", e.target.value)}
          placeholder="G401"
        />
      </Field>
      <Field label="Award">
        <Select
          value={f.award}
          onChange={(e) => set("award", e.target.value)}
          options={(awards.includes(f.award) ? awards : [f.award, ...awards]).map((v) => ({
            value: v,
            label: v,
          }))}
        />
      </Field>
      <Field label="Name" required className="sm:col-span-2">
        <TextInput
          value={f.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Cyber Security"
        />
      </Field>
      <Field label="Level">
        <Select
          value={f.level}
          onChange={(e) => set("level", e.target.value)}
          options={["UG", "PGT", "PGR", "Sub-degree"].map((v) => ({ value: v, label: v }))}
        />
      </Field>
      <Field label="Department">
        <TextInput
          value={f.department}
          onChange={(e) => set("department", e.target.value)}
          placeholder="School of Computing"
        />
      </Field>
      <Field label="Duration (years)">
        <NumberInput
          min={1}
          max={6}
          value={f.durationYears}
          onChange={(e) => set("durationYears", e.target.value)}
        />
      </Field>
      {p ? (
        <Field label="Total credits" hint="Sum of the stage credits">
          <TextInput value={String(p.stages.reduce((a, s) => a + s.credits, 0))} disabled />
        </Field>
      ) : (
        <Field label="Credits per stage" hint={d.ctx.region.creditScheme}>
          <NumberInput
            min={10}
            value={f.stageCredits}
            onChange={(e) => set("stageCredits", e.target.value)}
          />
        </Field>
      )}
      <Field label="Intakes" hint="Comma-separated, e.g. Sep, Jan">
        <TextInput value={f.intakes} onChange={(e) => set("intakes", e.target.value)} />
      </Field>
      <Field label="Mode">
        <Select
          value={f.mode}
          onChange={(e) => set("mode", e.target.value)}
          options={["Full-time", "Part-time", "Full-time / Part-time"].map((v) => ({
            value: v,
            label: v,
          }))}
        />
      </Field>
      <Field label="Module pass mark (%)">
        <NumberInput
          min={30}
          max={70}
          value={f.passMark}
          onChange={(e) => set("passMark", e.target.value)}
        />
      </Field>
      <Field label="Academic calendar" className="sm:col-span-2">
        <Select
          value={f.calendarId}
          onChange={(e) => set("calendarId", e.target.value)}
          options={d.calendars.map((c) => ({ value: c.id, label: `${c.name} — ${c.appliesTo}` }))}
        />
      </Field>
    </FormDialog>
  );
}

type DraftComponent = Omit<AssessmentComponent, "weight"> & { weight: number | string };

function NewModuleDialog({
  open,
  onOpenChange,
  module: mod,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Edit mode: the module being changed. */
  module?: HeModule;
}) {
  const d = useHeData();
  const batches = useCollection("markBatches");
  const blank = {
    code: mod?.code ?? "",
    title: mod?.title ?? "",
    credits: mod?.credits ?? 20,
    level: mod?.level ?? "Level 5",
    semester: (mod?.semester ?? "S1") as HeModule["semester"],
    leader: mod?.leader ?? "",
    capacity: mod?.capacity ?? 60,
    prerequisites: mod?.prerequisites.join(", ") ?? "",
  };
  const [f, setF] = useState(blank);
  const [comps, setComps] = useState<DraftComponent[]>(
    mod?.components.map((c) => ({ ...c })) ?? [
      { id: "c1", name: "Coursework", type: "Coursework", weight: 40, due: "2027-03-19" },
      { id: "c2", name: "Examination", type: "Exam", weight: 60, due: "2027-05-24" },
    ],
  );
  const total = comps.reduce((a, c) => a + (Number(c.weight) || 0), 0);
  const set = (k: keyof typeof f, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  const setComp = (i: number, patch: Partial<DraftComponent>) =>
    setComps((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const leaders = Array.from(
    new Set([...d.modules.map((m) => m.leader), ...(mod ? [mod.leader] : [])]),
  );
  /** Components with marks (or in a mark batch) can't be removed. */
  const marked = (componentId: string) =>
    !!mod &&
    (d.marks.some((x) => x.moduleId === mod.id && x.componentId === componentId) ||
      batches.some((b) => b.moduleId === mod.id && b.componentIds?.includes(componentId)));
  const regs = mod
    ? d.regs.filter(
        (r) =>
          r.moduleId === mod.id && r.academicYear === d.academicYear && r.status === "Registered",
      ).length
    : 0;

  const prereqList = () =>
    f.prerequisites
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

  const saveEdit = (m: HeModule) => {
    const code = f.code.trim().toUpperCase();
    let nextNum = Math.max(0, ...m.components.map((c) => Number(c.id.replace(/\D/g, "")) || 0));
    const components = comps.map((c) => ({
      ...c,
      // Keep ids of existing components — marks point at them.
      id: m.components.some((x) => x.id === c.id) ? c.id : `c${++nextNum}`,
      weight: Number(c.weight),
    }));
    const next = {
      code,
      title: f.title.trim(),
      credits: Number(f.credits),
      level: f.level.trim(),
      semester: f.semester,
      leader: f.leader || m.leader,
      capacity: Number(f.capacity),
      prerequisites: prereqList(),
      components,
    };
    const fmtComps = (cs: AssessmentComponent[]) =>
      cs.map((c) => `${c.name} ${c.weight}% (${c.type}, due ${c.due})`).join("; ");
    const pairs: [string, string, string][] = [
      ["Code", m.code, next.code],
      ["Title", m.title, next.title],
      ["Credits", String(m.credits), String(next.credits)],
      ["Level", m.level, next.level],
      ["Delivery", m.semester, next.semester],
      ["Leader", m.leader, next.leader],
      ["Capacity", String(m.capacity), String(next.capacity)],
      ["Prerequisites", m.prerequisites.join(", ") || "—", next.prerequisites.join(", ") || "—"],
      ["Assessment", fmtComps(m.components), fmtComps(next.components)],
    ];
    const changed = pairs.filter(([, a, b]) => a !== b);
    if (!changed.length) {
      onOpenChange(false);
      return;
    }
    updateItem("heModules", (x) => x.id === m.id, next);
    for (const [field, a, b] of changed) modLog(d, m.id, field, a, b);
    // Other modules list prerequisites by code — keep them pointing here.
    if (code !== m.code) {
      for (const o of d.modules.filter((x) => x.prerequisites.includes(m.code))) {
        updateItem("heModules", (x) => x.id === o.id, {
          prerequisites: o.prerequisites.map((c) => (c === m.code ? code : c)),
        });
        modLog(d, o.id, "Prerequisites", m.code, code, `${m.code} renamed`);
      }
    }
    if (next.leader !== m.leader)
      notify({
        tenantId: d.tenantId,
        channel: "Email",
        to: next.leader,
        subject: `You're now module leader for ${code} ${next.title}`,
        source: "Programmes & modules",
        relatedId: m.id,
      });
    toast.success(`${code} updated — ${n_(changed.length, "change")} logged`);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mod ? `Edit ${mod.code}` : "New module"}
      description={
        mod && regs
          ? `${n_(regs, "student is", "students are")} registered this year. Assessment weights must add up to 100%.`
          : "Assessment component weights must add up to 100%."
      }
      submitLabel={mod ? "Save changes" : "Create module"}
      onSubmit={() => {
        if (!f.code.trim() || !f.title.trim()) {
          toast.error("Code and title are required");
          return;
        }
        if (
          d.modules.some(
            (m) => m.code.toLowerCase() === f.code.trim().toLowerCase() && m.id !== mod?.id,
          )
        ) {
          toast.error(`Module code ${f.code} already exists`);
          return;
        }
        if (!comps.length) {
          toast.error("Add at least one assessment component");
          return;
        }
        if (total !== 100) {
          toast.error(`Component weights add up to ${total}% — they must total 100%`);
          return;
        }
        if (!(Number(f.credits) > 0) || !(Number(f.capacity) > 0)) {
          toast.error("Credits and capacity must be above zero");
          return;
        }
        const self = f.code.trim().toUpperCase();
        const prereqs = prereqList();
        if (prereqs.includes(self)) {
          toast.error("A module can't be its own prerequisite");
          return;
        }
        const unknown = prereqs.filter(
          (c) => !d.modules.some((m) => m.code === c) && !mod?.prerequisites.includes(c),
        );
        if (unknown.length) {
          toast.error(`Unknown prerequisite ${unknown.join(", ")}`);
          return;
        }
        if (mod) {
          const removed = mod.components.filter(
            (c) => !comps.some((x) => x.id === c.id) && marked(c.id),
          );
          if (removed.length) {
            toast.error(
              `${removed.map((c) => c.name).join(", ")} has marks recorded — it can't be removed`,
            );
            return;
          }
          if (Number(f.capacity) < regs)
            toast.warning(`Capacity is below the ${regs} students already registered`);
          saveEdit(mod);
          return;
        }
        const id = `MOD-${Date.now().toString().slice(-6)}`;
        addItem("heModules", {
          id,
          tenantId: d.tenantId,
          code: self,
          title: f.title.trim(),
          credits: Number(f.credits),
          level: f.level,
          semester: f.semester,
          leader: f.leader || leaders[0] || "TBC",
          capacity: Number(f.capacity),
          prerequisites: prereqs,
          components: comps.map((c, i) => ({ ...c, id: `c${i + 1}`, weight: Number(c.weight) })),
        });
        modLog(d, id, "Module created", undefined, `${self} ${f.title.trim()}`);
        toast.success(`${self} ${f.title} added to the catalogue`);
        setF(blank);
        onOpenChange(false);
      }}
    >
      <Field label="Code" required>
        <TextInput
          value={f.code}
          onChange={(e) => set("code", e.target.value)}
          placeholder="CS209"
        />
      </Field>
      <Field label="Credits">
        <NumberInput min={5} value={f.credits} onChange={(e) => set("credits", e.target.value)} />
      </Field>
      <Field label="Title" required className="sm:col-span-2">
        <TextInput
          value={f.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Quantum Computing Basics"
        />
      </Field>
      <Field label="Level">
        <TextInput value={f.level} onChange={(e) => set("level", e.target.value)} />
      </Field>
      <Field label="Delivery">
        <Select
          value={f.semester}
          onChange={(e) => set("semester", e.target.value)}
          options={[
            { value: "S1", label: "Semester 1" },
            { value: "S2", label: "Semester 2" },
            { value: "Year", label: "Year-long" },
          ]}
        />
      </Field>
      <Field label="Module leader">
        <Select
          value={f.leader || leaders[0] || ""}
          onChange={(e) => set("leader", e.target.value)}
          options={leaders.map((l) => ({ value: l, label: l }))}
        />
      </Field>
      <Field label="Capacity">
        <NumberInput min={1} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
      </Field>
      <Field label="Prerequisites" hint="Module codes, comma-separated" className="sm:col-span-2">
        <TextInput
          value={f.prerequisites}
          onChange={(e) => set("prerequisites", e.target.value)}
          placeholder="CS101, CS103"
        />
      </Field>
      <div className="sm:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium">Assessment components</div>
          <Badge tone={total === 100 ? "success" : "destructive"}>Total {total}%</Badge>
        </div>
        {comps.map((c, i) => {
          const locked = marked(c.id);
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_110px_70px_120px_28px] gap-1.5 items-center"
            >
              <TextInput
                className="h-8"
                value={c.name}
                onChange={(e) => setComp(i, { name: e.target.value })}
              />
              <Select
                className="h-8"
                value={c.type}
                onChange={(e) =>
                  setComp(i, { type: e.target.value as AssessmentComponent["type"] })
                }
                options={["Coursework", "Exam", "Practical", "Presentation", "Dissertation"].map(
                  (v) => ({ value: v, label: v }),
                )}
              />
              <NumberInput
                className="h-8"
                min={0}
                max={100}
                value={c.weight}
                onChange={(e) => setComp(i, { weight: e.target.value })}
              />
              <TextInput
                className="h-8"
                type="date"
                value={c.due}
                onChange={(e) => setComp(i, { due: e.target.value })}
              />
              <button
                type="button"
                disabled={locked}
                onClick={() => setComps((cs) => cs.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Remove component"
                title={locked ? "Marks are recorded on this component" : "Remove component"}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            setComps((cs) => [
              ...cs,
              {
                id: `new-${Date.now()}`,
                name: "Component",
                type: "Coursework",
                weight: 0,
                due: "2027-04-30",
              },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" /> Add component
        </Button>
      </div>
    </FormDialog>
  );
}
