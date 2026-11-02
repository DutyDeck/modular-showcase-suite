import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  Layers,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Wand2,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  DataTable,
  Field,
  TextInput,
  NumberInput,
  Select,
  FormDialog,
} from "@/components/ui-kit";
import { PackContextBar, PackEmpty, Tabs, useTab } from "@/components/packs/PackUI";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import { TENANT_STAFF } from "@/lib/packs/opsData";
import type { Learner } from "@/lib/packs/foundationData";
import type { Curriculum, TutorGroup } from "@/lib/packs/schoolData";
import {
  ON_ROLL_STATUSES,
  autoPlace,
  curriculumIdFor,
  setClash,
  suggestSetName,
  type SubjectClass,
} from "@/lib/packs/sis/classes";
import { logChange, notify } from "@/lib/packs/sis/activity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/school/classes")({
  head: () => ({ meta: [{ title: "Classes & Enrolment — 1StudentID" }] }),
  component: ClassesPage,
});

/* ── Data ─────────────────────────────────────────────────────────────────── */

interface Ops {
  tenantId: string;
  by: string;
  forms: TutorGroup[];
  sets: SubjectClass[];
}

interface ClassData extends Ops {
  curricula: Curriculum[];
  /** On-roll pupils with a curriculum. */
  pupils: Learner[];
  curOf: Map<string, string>;
  staff: string[];
  roomNames: string[];
}

function useClassData(): ClassData {
  const ctx = useTenantContext();
  const { tenantId } = ctx;
  const by = ctx.actingAs || ctx.user?.name || "School admin";
  const allCur = useCollection("curricula");
  const allForms = useCollection("tutorGroups");
  const allSets = useCollection("subjectClasses");
  const allLearners = useCollection("learners");
  const allRooms = useCollection("rooms");
  return useMemo(() => {
    const curricula = allCur.filter((c) => c.tenantId === tenantId);
    const forms = allForms.filter((f) => f.tenantId === tenantId);
    const sets = allSets.filter((s) => s.tenantId === tenantId);
    const curOf = new Map<string, string>();
    const pupils: Learner[] = [];
    for (const l of allLearners) {
      if (l.tenantId !== tenantId || !ON_ROLL_STATUSES.includes(l.status)) continue;
      const c = curriculumIdFor(l, curricula);
      if (!c) continue;
      curOf.set(l.id, c);
      pupils.push(l);
    }
    pupils.sort((a, b) => a.name.localeCompare(b.name));
    const uniq = (xs: (string | undefined)[]) =>
      [...new Set(xs.filter((x): x is string => !!x && !!x.trim()))].sort();
    const staff = uniq([
      ...(TENANT_STAFF[tenantId] ?? []).map((s) => s.name),
      ...forms.map((f) => f.tutor),
      ...sets.map((s) => s.teacher),
    ]);
    const roomNames = uniq([
      ...allRooms.filter((r) => r.tenantId === tenantId).map((r) => r.name),
      ...forms.map((f) => f.room),
      ...sets.map((s) => s.room),
    ]);
    return { tenantId, by, curricula, forms, sets, pupils, curOf, staff, roomNames };
  }, [allCur, allForms, allSets, allLearners, allRooms, tenantId, by]);
}

/* ── Mutations (all logged) ───────────────────────────────────────────────── */

const SRC_FORM = "Classes · form change";

/** Put a pupil in a form (or none). Logs, emails guardians and tells the tutor. */
function placeInForm(o: Ops, pupil: Learner, to: TutorGroup | undefined, reason?: string): boolean {
  const from = pupil.group || undefined;
  if ((from ?? "") === (to?.name ?? "")) return false;
  updateItem("learners", (l) => l.id === pupil.id && l.tenantId === o.tenantId, {
    group: to?.name,
  });
  logChange({
    tenantId: o.tenantId,
    entity: "learner",
    entityId: pupil.id,
    studentId: pupil.id,
    field: "form class",
    from: from ?? "Unplaced",
    to: to?.name ?? "Unplaced",
    by: o.by,
    reason,
  });
  if (to) {
    for (const g of pupil.guardians ?? []) {
      notify({
        tenantId: o.tenantId,
        channel: "Email",
        to: g,
        subject: `${pupil.name} is now in form ${to.name}`,
        body: `Form tutor: ${to.tutor}${to.room ? ` · Room ${to.room}` : ""}. Registers and the timetable now follow ${to.name}.`,
        source: SRC_FORM,
        relatedId: pupil.id,
      });
    }
    notify({
      tenantId: o.tenantId,
      channel: "App",
      to: to.tutor,
      subject: `${pupil.name} has joined ${to.name}`,
      body: from ? `Moved from ${from}.` : "Newly placed in your form.",
      source: SRC_FORM,
      relatedId: pupil.id,
    });
  } else {
    const old = o.forms.find((f) => f.name === from);
    if (old)
      notify({
        tenantId: o.tenantId,
        channel: "App",
        to: old.tutor,
        subject: `${pupil.name} has left ${old.name}`,
        body: "The pupil is now unplaced.",
        source: SRC_FORM,
        relatedId: pupil.id,
      });
  }
  return true;
}

/** Enrol pupils in a set. Blocks a second set of the same subject; warns over capacity. */
function enrolInSet(o: Ops, set: SubjectClass, ids: string[], names: Map<string, string>) {
  const added: string[] = [];
  const blocked: string[] = [];
  for (const id of ids) {
    if (set.studentIds.includes(id) || added.includes(id)) continue;
    const clash = setClash(o.sets, id, set);
    if (clash) blocked.push(`${names.get(id) ?? id} is already in ${clash.name}`);
    else added.push(id);
  }
  if (added.length) {
    const next = [...set.studentIds, ...added];
    updateItem("subjectClasses", (s) => s.id === set.id, { studentIds: next });
    for (const id of added)
      logChange({
        tenantId: o.tenantId,
        entity: "subjectClass",
        entityId: set.id,
        studentId: id,
        field: "subject class",
        to: set.name,
        by: o.by,
        reason: "Enrolled",
      });
    toast.success(`${added.length} enrolled in ${set.name}`);
    if (next.length > set.capacity)
      toast.warning(`${set.name} is now ${next.length}/${set.capacity} — over capacity`);
  }
  if (blocked.length)
    toast.error(`Not enrolled: ${blocked.join("; ")}. Use Move to change set.`, {
      duration: 6000,
    });
  if (!added.length && !blocked.length) toast.info("Nobody new to enrol");
}

function removeFromSet(o: Ops, set: SubjectClass, id: string, name: string) {
  updateItem("subjectClasses", (s) => s.id === set.id, {
    studentIds: set.studentIds.filter((x) => x !== id),
  });
  logChange({
    tenantId: o.tenantId,
    entity: "subjectClass",
    entityId: set.id,
    studentId: id,
    field: "subject class",
    from: set.name,
    by: o.by,
    reason: "Removed",
  });
  toast.success(`${name} removed from ${set.name}`);
}

function moveBetweenSets(o: Ops, from: SubjectClass, to: SubjectClass, id: string, name: string) {
  const other = setClash(o.sets, id, to);
  if (other && other.id !== from.id) {
    toast.error(`${name} is already in ${other.name}`);
    return;
  }
  updateItem("subjectClasses", (s) => s.id === from.id, {
    studentIds: from.studentIds.filter((x) => x !== id),
  });
  const next = to.studentIds.includes(id) ? to.studentIds : [...to.studentIds, id];
  updateItem("subjectClasses", (s) => s.id === to.id, { studentIds: next });
  logChange({
    tenantId: o.tenantId,
    entity: "subjectClass",
    entityId: to.id,
    studentId: id,
    field: "subject class",
    from: from.name,
    to: to.name,
    by: o.by,
    reason: "Moved",
  });
  toast.success(`${name} moved to ${to.name}`);
  if (next.length > to.capacity)
    toast.warning(`${to.name} is now ${next.length}/${to.capacity} — over capacity`);
}

/** Auto-place the unplaced pupils of one year group into its forms. */
function autoPlaceYear(d: ClassData, curriculumId: string, yearGroup: string) {
  const forms = d.forms.filter((f) => f.curriculumId === curriculumId && f.yearGroup === yearGroup);
  const inYear = d.pupils.filter(
    (p) => d.curOf.get(p.id) === curriculumId && p.level === yearGroup,
  );
  const formNames = new Set(forms.map((f) => f.name));
  const unplaced = inYear.filter((p) => !p.group || !formNames.has(p.group));
  if (!unplaced.length) return toast.info("Everyone in this year group has a form");
  if (!forms.length) return toast.error(`Create a form for ${yearGroup} first`);
  const plan = autoPlace(
    unplaced,
    forms.map((f) => ({
      name: f.name,
      capacity: f.capacity,
      members: inYear.filter((p) => p.group === f.name),
    })),
  );
  for (const step of plan) {
    const p = unplaced.find((x) => x.id === step.studentId)!;
    placeInForm(
      d,
      p,
      forms.find((f) => f.name === step.form),
      "Auto-placed",
    );
  }
  toast.success(
    `Placed ${plan.length}: ${plan.map((s) => `${unplaced.find((p) => p.id === s.studentId)?.name} → ${s.form}`).join(", ")}`,
  );
}

/* ── Small UI bits ────────────────────────────────────────────────────────── */

function Fill({ n, cap }: { n: number; cap?: number }) {
  const over = !!cap && n > cap;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        over && "text-destructive font-medium",
      )}
      title={over ? `Over capacity by ${n - cap!}` : undefined}
    >
      {n}/{cap ?? "—"}
      {over && <AlertTriangle className="h-3.5 w-3.5" />}
    </span>
  );
}

function ActionSelect({
  placeholder,
  options,
  onPick,
}: {
  placeholder: string;
  options: { value: string; label: string }[];
  onPick: (v: string) => void;
}) {
  return (
    <select
      value=""
      disabled={options.length === 0}
      onChange={(e) => e.target.value && onPick(e.target.value)}
      className="h-8 max-w-[11rem] rounded-md border bg-background px-2 text-xs disabled:opacity-50"
    >
      <option value="">{options.length ? placeholder : "No other option"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function PupilCell({ p, onOpen }: { p: Learner; onOpen?: (id: string) => void }) {
  return (
    <div className="min-w-0">
      {onOpen ? (
        <button className="font-medium hover:underline text-left" onClick={() => onOpen(p.id)}>
          {p.name}
        </button>
      ) : (
        <span className="font-medium">{p.name}</span>
      )}
      <div className="text-[11px] text-muted-foreground">
        {p.id} · {p.level}
      </div>
    </div>
  );
}

/** Checkbox picker for enrolling pupils. Blocked rows are shown but can't be ticked. */
function PickPupilsDialog({
  title,
  description,
  candidates,
  submitLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  description?: string;
  candidates: { id: string; name: string; note: string; blocked?: string }[];
  submitLabel: string;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const shown = candidates.filter(
    (c) => !q || `${c.name} ${c.id}`.toLowerCase().includes(q.toLowerCase()),
  );
  const toggle = (id: string) =>
    setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={title}
      description={description}
      submitLabel={picked.length ? `${submitLabel} (${picked.length})` : submitLabel}
      onSubmit={() => {
        if (!picked.length) return toast.error("Tick at least one pupil");
        onConfirm(picked);
        onClose();
      }}
    >
      <div className="sm:col-span-2 space-y-2">
        <TextInput placeholder="Search pupils" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="max-h-72 overflow-y-auto divide-y rounded-md border">
          {shown.length === 0 && (
            <li className="p-4 text-center text-sm text-muted-foreground">No pupils to add</li>
          )}
          {shown.map((c) => (
            <li key={c.id}>
              <label
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm",
                  c.blocked ? "opacity-60" : "cursor-pointer hover:bg-muted/40",
                )}
              >
                <input
                  type="checkbox"
                  disabled={!!c.blocked}
                  checked={picked.includes(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{c.name}</span>{" "}
                  <span className="text-[11px] text-muted-foreground">{c.id}</span>
                  {c.blocked && <div className="text-[11px] text-destructive">{c.blocked}</div>}
                </span>
                <Badge tone={c.note === "Unplaced" ? "warning" : "muted"}>{c.note}</Badge>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </FormDialog>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

function ClassesPage() {
  const ctx = useTenantContext();
  if (ctx.isAdmin) return <AdminClasses />;
  if (ctx.user?.role === "teacher") return <TeacherClasses />;
  return <FamilyClasses />;
}

type TabId = "years" | "forms" | "sets" | "pupil";

function AdminClasses() {
  const d = useClassData();
  const [tab, setTab] = useTab<TabId>("years");
  const [formId, setFormId] = useState<string | null>(null);
  const [setId, setSetId] = useState<string | null>(null);
  const [pupilId, setPupilId] = useState<string | null>(null);
  const openForm = (id: string) => {
    setFormId(id);
    setTab("forms");
  };
  const openSet = (id: string) => {
    setSetId(id);
    setTab("sets");
  };
  const openPupil = (id: string) => {
    setPupilId(id);
    setTab("pupil");
  };

  if (d.curricula.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Classes & Enrolment" subtitle="Form classes and subject classes" />
        <PackContextBar pack="intl-school" />
        <PackEmpty
          pack="intl-school"
          title="No curricula set up yet"
          body="Load the International School starter to get curricula and year groups, then create form classes and subject classes here."
        />
      </div>
    );
  }

  const unplaced = d.pupils.filter((p) => {
    const f = d.forms.find((x) => x.name === p.group);
    return !f || f.yearGroup !== p.level || f.curriculumId !== d.curOf.get(p.id);
  }).length;
  const overFull =
    d.forms.filter(
      (f) => f.capacity && d.pupils.filter((p) => p.group === f.name).length > f.capacity,
    ).length + d.sets.filter((s) => s.studentIds.length > s.capacity).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Enrolment"
        subtitle="Form classes (registration) and subject classes (teaching sets)."
      />
      <PackContextBar pack="intl-school" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Pupils on roll"
          value={d.pupils.length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Form classes"
          value={d.forms.length}
          icon={<ClipboardCheck className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Subject classes"
          value={d.sets.length}
          icon={<BookOpen className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Without a form"
          value={unplaced}
          hint={overFull ? `${overFull} class(es) over capacity` : "all classes within capacity"}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent="warning"
        />
      </div>

      <Tabs
        tabs={[
          { id: "years", label: "Year groups" },
          { id: "forms", label: "Form classes", count: d.forms.length },
          { id: "sets", label: "Subject classes", count: d.sets.length },
          { id: "pupil", label: "Find a pupil" },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          if (t === "forms") setFormId(null);
          if (t === "sets") setSetId(null);
        }}
      />

      {tab === "years" && (
        <YearGroupsTab d={d} openForm={openForm} openSet={openSet} openPupil={openPupil} />
      )}
      {tab === "forms" && (
        <FormsTab d={d} formId={formId} setFormId={setFormId} openPupil={openPupil} />
      )}
      {tab === "sets" && <SetsTab d={d} setId={setId} setSetId={setSetId} openPupil={openPupil} />}
      {tab === "pupil" && (
        <PupilTab
          d={d}
          pupilId={pupilId}
          setPupilId={setPupilId}
          openForm={openForm}
          openSet={openSet}
        />
      )}
    </div>
  );
}

/* ── Year groups ──────────────────────────────────────────────────────────── */

function YearGroupsTab({
  d,
  openForm,
  openSet,
  openPupil,
}: {
  d: ClassData;
  openForm: (id: string) => void;
  openSet: (id: string) => void;
  openPupil: (id: string) => void;
}) {
  const [newForm, setNewForm] = useState<{ curriculumId: string; yearGroup: string } | null>(null);
  const [newSet, setNewSet] = useState<{ curriculumId: string; yearGroup: string } | null>(null);
  const names = new Map(d.pupils.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-4">
      {d.curricula.map((c) => {
        const active = c.yearGroups.filter(
          (y) =>
            d.pupils.some((p) => d.curOf.get(p.id) === c.id && p.level === y) ||
            d.forms.some((f) => f.curriculumId === c.id && f.yearGroup === y) ||
            d.sets.some((s) => s.curriculumId === c.id && s.yearGroup === y),
        );
        const roll = d.pupils.filter((p) => d.curOf.get(p.id) === c.id).length;
        return (
          <Section
            key={c.id}
            title={c.name}
            description={`${c.framework} · ${roll} pupils · ${active.length} of ${c.yearGroups.length} year groups in use`}
          >
            {active.length === 0 && (
              <p className="text-sm text-muted-foreground">No pupils or classes yet.</p>
            )}
            <div className="space-y-3">
              {active.map((y) => {
                const pupils = d.pupils.filter((p) => d.curOf.get(p.id) === c.id && p.level === y);
                const forms = d.forms.filter((f) => f.curriculumId === c.id && f.yearGroup === y);
                const sets = d.sets.filter((s) => s.curriculumId === c.id && s.yearGroup === y);
                const formNames = new Set(forms.map((f) => f.name));
                const noForm = pupils.filter((p) => !p.group || !formNames.has(p.group));
                const subjects = [...new Set(sets.map((s) => s.subject))].sort();
                const gaps = subjects.flatMap((subj) => {
                  const ss = sets.filter((s) => s.subject === subj);
                  return pupils
                    .filter((p) => !ss.some((s) => s.studentIds.includes(p.id)))
                    .map((p) => ({ p, subj, ss }));
                });
                return (
                  <div key={y} className="rounded-lg border p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{y}</div>
                      <Badge tone="muted">{pupils.length} pupils</Badge>
                      <Badge tone="info">{forms.length} forms</Badge>
                      <Badge tone="success">{sets.length} subject classes</Badge>
                      {noForm.length > 0 && (
                        <Badge tone="warning">{noForm.length} without a form</Badge>
                      )}
                      {gaps.length > 0 && <Badge tone="warning">{gaps.length} missing a set</Badge>}
                      <div className="ml-auto flex flex-wrap gap-2">
                        {noForm.length > 0 && forms.length > 0 && (
                          <Button size="sm" onClick={() => autoPlaceYear(d, c.id, y)}>
                            <Wand2 className="h-3.5 w-3.5" /> Auto-place {noForm.length}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNewForm({ curriculumId: c.id, yearGroup: y })}
                        >
                          <Plus className="h-3.5 w-3.5" /> Form
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNewSet({ curriculumId: c.id, yearGroup: y })}
                        >
                          <Plus className="h-3.5 w-3.5" /> Subject class
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center w-16">
                        Forms
                      </span>
                      {forms.length === 0 && (
                        <span className="text-xs text-muted-foreground">None yet</span>
                      )}
                      {forms.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => openForm(f.id)}
                          className="text-xs rounded-md border px-2 py-1 hover:bg-muted"
                        >
                          <span className="font-semibold">{f.name}</span> ·{" "}
                          <Fill
                            n={pupils.filter((p) => p.group === f.name).length}
                            cap={f.capacity}
                          />
                        </button>
                      ))}
                    </div>
                    {sets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center w-16">
                          Subjects
                        </span>
                        {sets.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => openSet(s.id)}
                            className="text-xs rounded-md border px-2 py-1 hover:bg-muted"
                          >
                            {s.name} · <Fill n={s.studentIds.length} cap={s.capacity} />
                          </button>
                        ))}
                      </div>
                    )}

                    {noForm.length > 0 && (
                      <div className="rounded-md bg-warning/10 p-2 space-y-1.5">
                        <div className="text-xs font-medium">Without a form</div>
                        {noForm.map((p) => (
                          <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                            <button
                              className="font-medium hover:underline"
                              onClick={() => openPupil(p.id)}
                            >
                              {p.name}
                            </button>
                            <span className="text-[11px] text-muted-foreground">
                              {p.group ? `in ${p.group} (not a ${y} form)` : "no form"}
                            </span>
                            <span className="ml-auto">
                              <ActionSelect
                                placeholder="Place in…"
                                options={forms.map((f) => ({ value: f.id, label: f.name }))}
                                onPick={(id) => {
                                  const f = forms.find((x) => x.id === id);
                                  if (placeInForm(d, p, f)) toast.success(`${p.name} → ${f?.name}`);
                                }}
                              />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {gaps.length > 0 && (
                      <div className="rounded-md bg-muted/40 p-2 space-y-1.5">
                        <div className="text-xs font-medium">Not in a subject class</div>
                        {gaps.map(({ p, subj, ss }) => (
                          <div
                            key={p.id + subj}
                            className="flex flex-wrap items-center gap-2 text-sm"
                          >
                            <button
                              className="font-medium hover:underline"
                              onClick={() => openPupil(p.id)}
                            >
                              {p.name}
                            </button>
                            <span className="text-[11px] text-muted-foreground">{subj}</span>
                            <span className="ml-auto">
                              <ActionSelect
                                placeholder="Enrol in…"
                                options={ss.map((s) => ({
                                  value: s.id,
                                  label: `${s.name} (${s.studentIds.length}/${s.capacity})`,
                                }))}
                                onPick={(id) => {
                                  const s = ss.find((x) => x.id === id);
                                  if (s) enrolInSet(d, s, [p.id], names);
                                }}
                              />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })}

      {newForm && (
        <TutorGroupDialog
          open
          onOpenChange={(v) => !v && setNewForm(null)}
          defaults={newForm}
          onSaved={(id) => openForm(id)}
        />
      )}
      {newSet && (
        <SetDialog d={d} defaults={newSet} onClose={() => setNewSet(null)} onSaved={openSet} />
      )}
    </div>
  );
}

/* ── Form classes ─────────────────────────────────────────────────────────── */

function FormsTab({
  d,
  formId,
  setFormId,
  openPupil,
}: {
  d: ClassData;
  formId: string | null;
  setFormId: (id: string | null) => void;
  openPupil: (id: string) => void;
}) {
  const [cur, setCur] = useState("");
  const [dialog, setDialog] = useState<{ editing?: TutorGroup } | null>(null);
  const [deleting, setDeleting] = useState<TutorGroup | null>(null);
  const form = formId ? d.forms.find((f) => f.id === formId) : undefined;

  if (form) {
    return <FormRoster d={d} form={form} onBack={() => setFormId(null)} openPupil={openPupil} />;
  }

  const rows = d.forms
    .filter((f) => !cur || f.curriculumId === cur)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return (
    <Section
      title="Form classes"
      description="Each pupil is in one form. Registers and the timetable follow it."
      actions={
        <>
          <Select
            className="h-8 text-xs w-48"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            options={[
              { value: "", label: "All curricula" },
              ...d.curricula.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Button size="sm" onClick={() => setDialog({})}>
            <Plus className="h-3.5 w-3.5" /> New form
          </Button>
        </>
      }
    >
      <DataTable
        columns={[
          { key: "name", label: "Form" },
          { key: "yearGroup", label: "Year group" },
          { key: "curriculum", label: "Curriculum" },
          { key: "tutor", label: "Tutor" },
          { key: "room", label: "Room" },
          { key: "count", label: "Pupils" },
          { key: "_actions", label: "", className: "text-right" },
        ]}
        rows={rows}
        emptyText="No form classes yet"
        renderCell={(f: TutorGroup, k) => {
          if (k === "name")
            return (
              <button className="font-semibold hover:underline" onClick={() => setFormId(f.id)}>
                {f.name}
              </button>
            );
          if (k === "curriculum")
            return d.curricula.find((c) => c.id === f.curriculumId)?.framework ?? "—";
          if (k === "count")
            return <Fill n={d.pupils.filter((p) => p.group === f.name).length} cap={f.capacity} />;
          if (k === "room") return f.room || "—";
          if (k === "_actions")
            return (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => setFormId(f.id)}>
                  <Users className="h-3.5 w-3.5" /> Roster
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Edit"
                  onClick={() => setDialog({ editing: f })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" title="Delete" onClick={() => setDeleting(f)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          return String(f[k as keyof TutorGroup] ?? "—");
        }}
      />
      {dialog && (
        <TutorGroupDialog
          open
          onOpenChange={(v) => !v && setDialog(null)}
          editing={dialog.editing}
          onSaved={(id) => !dialog.editing && setFormId(id)}
        />
      )}
      {deleting && <DeleteFormDialog form={deleting} onClose={() => setDeleting(null)} />}
    </Section>
  );
}

function FormRoster({
  d,
  form,
  onBack,
  openPupil,
}: {
  d: ClassData;
  form: TutorGroup;
  onBack: () => void;
  openPupil: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const members = d.pupils.filter((p) => p.group === form.name);
  const sameYear = d.pupils.filter(
    (p) => d.curOf.get(p.id) === form.curriculumId && p.level === form.yearGroup,
  );
  const siblingForms = d.forms.filter(
    (f) =>
      f.id !== form.id && f.curriculumId === form.curriculumId && f.yearGroup === form.yearGroup,
  );
  const yearFormNames = new Set([form.name, ...siblingForms.map((f) => f.name)]);
  const unplacedInYear = sameYear.filter((p) => !p.group || !yearFormNames.has(p.group));
  const cur = d.curricula.find((c) => c.id === form.curriculumId);

  return (
    <Section
      title={`Form ${form.name}`}
      description={`${form.yearGroup} · ${cur?.name ?? "—"} · Tutor ${form.tutor}${form.room ? ` · Room ${form.room}` : ""}`}
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" /> All forms
          </Button>
          {unplacedInYear.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => autoPlaceYear(d, form.curriculumId, form.yearGroup)}
            >
              <Wand2 className="h-3.5 w-3.5" /> Auto-place unplaced ({unplacedInYear.length})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDeleting(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Add pupils
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center gap-3 text-sm">
        <span>
          Pupils: <Fill n={members.length} cap={form.capacity} />
        </span>
        {form.capacity && members.length > form.capacity && (
          <Badge tone="destructive">Over capacity by {members.length - form.capacity}</Badge>
        )}
      </div>
      <DataTable
        columns={[
          { key: "pupil", label: "Pupil" },
          { key: "house", label: "House" },
          { key: "sets", label: "Subject classes" },
          { key: "_actions", label: "", className: "text-right" },
        ]}
        rows={members}
        emptyText="No pupils yet — use Add pupils"
        renderCell={(p: Learner, k) => {
          if (k === "pupil") return <PupilCell p={p} onOpen={openPupil} />;
          if (k === "house") return p.house ?? "—";
          if (k === "sets") return d.sets.filter((s) => s.studentIds.includes(p.id)).length;
          if (k === "_actions")
            return (
              <div className="flex justify-end items-center gap-1">
                <ActionSelect
                  placeholder="Move to…"
                  options={siblingForms.map((f) => ({
                    value: f.id,
                    label: `${f.name} (${d.pupils.filter((x) => x.group === f.name).length}/${f.capacity ?? "—"})`,
                  }))}
                  onPick={(id) => {
                    const f = siblingForms.find((x) => x.id === id);
                    if (placeInForm(d, p, f, "Moved"))
                      toast.success(`${p.name} moved to ${f?.name}`);
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  title="Remove from form"
                  onClick={() => {
                    placeInForm(d, p, undefined, "Removed from form");
                    toast.success(`${p.name} removed — now unplaced`);
                  }}
                >
                  <UserMinus className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          return null;
        }}
      />
      {adding && (
        <PickPupilsDialog
          title={`Add pupils to ${form.name}`}
          description={`${form.yearGroup} pupils not already in ${form.name}. Pupils in another form will move.`}
          submitLabel="Add"
          candidates={sameYear
            .filter((p) => p.group !== form.name)
            .sort(
              (a, b) =>
                Number(yearFormNames.has(a.group ?? "")) - Number(yearFormNames.has(b.group ?? "")),
            )
            .map((p) => ({
              id: p.id,
              name: p.name,
              note: p.group && yearFormNames.has(p.group) ? `In ${p.group}` : "Unplaced",
            }))}
          onClose={() => setAdding(false)}
          onConfirm={(ids) => {
            for (const id of ids) {
              const p = d.pupils.find((x) => x.id === id);
              if (p) placeInForm(d, p, form, p.group ? "Moved" : "Placed");
            }
            const n = members.length + ids.length;
            toast.success(`${ids.length} added to ${form.name}`);
            if (form.capacity && n > form.capacity)
              toast.warning(`${form.name} is now ${n}/${form.capacity} — over capacity`);
          }}
        />
      )}
      {editing && (
        <TutorGroupDialog open onOpenChange={(v) => !v && setEditing(false)} editing={form} />
      )}
      {deleting && (
        <DeleteFormDialog form={form} onClose={() => setDeleting(false)} onDeleted={onBack} />
      )}
    </Section>
  );
}

/** Create or edit a form class (tutor group). Shared with Curricula & Houses. */
export function TutorGroupDialog({
  open,
  onOpenChange,
  editing,
  defaults,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: TutorGroup;
  defaults?: { curriculumId?: string; yearGroup?: string };
  onSaved?: (id: string) => void;
}) {
  const ctx = useTenantContext();
  const { tenantId } = ctx;
  const by = ctx.actingAs || ctx.user?.name || "School admin";
  const curricula = useCollection("curricula").filter((c) => c.tenantId === tenantId);
  const forms = useCollection("tutorGroups").filter((f) => f.tenantId === tenantId);
  const learners = useCollection("learners").filter((l) => l.tenantId === tenantId);
  const rooms = useCollection("rooms").filter((r) => r.tenantId === tenantId);
  const staff = [
    ...new Set([
      ...(TENANT_STAFF[tenantId] ?? []).map((s) => s.name),
      ...forms.map((f) => f.tutor),
    ]),
  ];

  const [name, setName] = useState(editing?.name ?? "");
  const [curriculumId, setCurriculumId] = useState(
    editing?.curriculumId ?? defaults?.curriculumId ?? curricula[0]?.id ?? "",
  );
  const cur = curricula.find((c) => c.id === curriculumId);
  const [yearGroup, setYearGroup] = useState(
    editing?.yearGroup ?? defaults?.yearGroup ?? cur?.yearGroups[0] ?? "",
  );
  const [tutor, setTutor] = useState(editing?.tutor ?? staff[0] ?? "");
  const [room, setRoom] = useState(editing?.room ?? "");
  const [capacity, setCapacity] = useState(String(editing?.capacity ?? 24));
  const members = editing ? learners.filter((l) => l.group === editing.name) : [];

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Edit form ${editing.name}` : "New form class"}
      description={
        editing && members.length
          ? `${members.length} pupils. Renaming updates their records, registers and timetable.`
          : "A registration group with one tutor."
      }
      submitLabel={editing ? "Save" : "Create form"}
      onSubmit={() => {
        const n = name.trim();
        if (!n || !tutor.trim() || !yearGroup)
          return toast.error("Name, year group and tutor are required");
        if (forms.some((f) => f.id !== editing?.id && f.name.toLowerCase() === n.toLowerCase()))
          return toast.error(`There is already a form called ${n}`);
        const cap = Number(capacity) || undefined;
        if (!editing) {
          const id = nextId("TG-", "tutorGroups");
          addItem("tutorGroups", {
            id,
            tenantId,
            name: n,
            yearGroup,
            curriculumId,
            tutor: tutor.trim(),
            room: room.trim() || undefined,
            capacity: cap,
          });
          logChange({ tenantId, entity: "tutorGroup", entityId: id, field: "created", to: n, by });
          notify({
            tenantId,
            channel: "App",
            to: tutor.trim(),
            subject: `You are the tutor of new form ${n}`,
            source: SRC_FORM,
            relatedId: id,
          });
          toast.success(`Form ${n} created`);
          onOpenChange(false);
          onSaved?.(id);
          return;
        }
        if (
          members.length &&
          (yearGroup !== editing.yearGroup || curriculumId !== editing.curriculumId)
        )
          return toast.error("Move the pupils out before changing the year group or curriculum");
        updateItem("tutorGroups", (f) => f.id === editing.id, {
          name: n,
          yearGroup,
          curriculumId,
          tutor: tutor.trim(),
          room: room.trim() || undefined,
          capacity: cap,
        });
        if (n !== editing.name) {
          logChange({
            tenantId,
            entity: "tutorGroup",
            entityId: editing.id,
            field: "name",
            from: editing.name,
            to: n,
            by,
          });
          for (const l of members) {
            updateItem("learners", (x) => x.id === l.id && x.tenantId === tenantId, { group: n });
            logChange({
              tenantId,
              entity: "learner",
              entityId: l.id,
              studentId: l.id,
              field: "form class",
              from: editing.name,
              to: n,
              by,
              reason: "Form renamed",
            });
          }
          updateItem(
            "timetableSlots",
            (s) => s.tenantId === tenantId && s.groupLabel === editing.name,
            { groupLabel: n, cohorts: [n] },
          );
        }
        if (tutor.trim() !== editing.tutor) {
          logChange({
            tenantId,
            entity: "tutorGroup",
            entityId: editing.id,
            field: "tutor",
            from: editing.tutor,
            to: tutor.trim(),
            by,
          });
          notify({
            tenantId,
            channel: "App",
            to: tutor.trim(),
            subject: `You are now the tutor of ${n} (${members.length} pupils)`,
            source: SRC_FORM,
            relatedId: editing.id,
          });
        }
        if ((cap ?? 0) !== (editing.capacity ?? 0) || (room.trim() || undefined) !== editing.room)
          logChange({
            tenantId,
            entity: "tutorGroup",
            entityId: editing.id,
            field: "room / capacity",
            to: `${room.trim() || "—"} · ${cap ?? "—"}`,
            by,
          });
        toast.success(`Form ${n} saved`);
        onOpenChange(false);
        onSaved?.(editing.id);
      }}
    >
      <Field label="Form name" required>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="10D" />
      </Field>
      <Field label="Curriculum">
        <Select
          value={curriculumId}
          onChange={(e) => {
            setCurriculumId(e.target.value);
            setYearGroup(curricula.find((c) => c.id === e.target.value)?.yearGroups[0] ?? "");
          }}
          options={curricula.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field label="Year group" required>
        <Select
          value={yearGroup}
          onChange={(e) => setYearGroup(e.target.value)}
          options={(cur?.yearGroups ?? []).map((y) => ({ value: y, label: y }))}
        />
      </Field>
      <Field label="Tutor" required>
        <Select
          value={tutor}
          onChange={(e) => setTutor(e.target.value)}
          options={staff.map((s) => ({ value: s, label: s }))}
        />
      </Field>
      <Field label="Room">
        <TextInput
          value={room}
          list="tg-rooms"
          onChange={(e) => setRoom(e.target.value)}
          placeholder="S-210"
        />
        <datalist id="tg-rooms">
          {rooms.map((r) => (
            <option key={r.id} value={r.name} />
          ))}
        </datalist>
      </Field>
      <Field label="Capacity" hint="Soft limit — you'll get a warning above it">
        <NumberInput
          min={1}
          max={60}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </Field>
    </FormDialog>
  );
}

/** Delete a form — only when empty; otherwise move its pupils first. Shared with Curricula & Houses. */
export function DeleteFormDialog({
  form,
  onClose,
  onDeleted,
}: {
  form: TutorGroup;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const ctx = useTenantContext();
  const { tenantId } = ctx;
  const by = ctx.actingAs || ctx.user?.name || "School admin";
  const forms = useCollection("tutorGroups").filter((f) => f.tenantId === tenantId);
  const sets = useCollection("subjectClasses").filter((s) => s.tenantId === tenantId);
  const members = useCollection("learners").filter(
    (l) => l.tenantId === tenantId && l.group === form.name,
  );
  const targets = forms
    .filter((f) => f.id !== form.id)
    .sort(
      (a, b) =>
        Number(b.yearGroup === form.yearGroup && b.curriculumId === form.curriculumId) -
        Number(a.yearGroup === form.yearGroup && a.curriculumId === form.curriculumId),
    );
  const [target, setTarget] = useState(targets[0]?.id ?? "");
  const doDelete = () => {
    removeItem("tutorGroups", (f) => f.id === form.id);
    logChange({
      tenantId,
      entity: "tutorGroup",
      entityId: form.id,
      field: "deleted",
      from: form.name,
      by,
    });
    toast.success(`Form ${form.name} deleted`);
    onClose();
    onDeleted?.();
  };

  if (!members.length) {
    return (
      <FormDialog
        open
        onOpenChange={(v) => !v && onClose()}
        title={`Delete form ${form.name}?`}
        description="The form is empty. This can't be undone."
        submitLabel="Delete form"
        submitVariant="destructive"
        onSubmit={doDelete}
      >
        <div className="sm:col-span-2 text-sm text-muted-foreground">
          {form.yearGroup} · Tutor {form.tutor}
        </div>
      </FormDialog>
    );
  }
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`${form.name} still has ${members.length} pupils`}
      description="A form can only be deleted when it's empty. Move the pupils first."
      submitLabel={`Move ${members.length} and delete`}
      submitVariant="destructive"
      onSubmit={() => {
        const to = forms.find((f) => f.id === target);
        if (!to) return toast.error("Pick a form to move the pupils to");
        const o: Ops = { tenantId, by, forms, sets };
        for (const p of members) placeInForm(o, p, to, `Form ${form.name} closed`);
        doDelete();
      }}
    >
      <Field label="Move pupils to" className="sm:col-span-2">
        {targets.length ? (
          <Select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            options={targets.map((f) => ({
              value: f.id,
              label: `${f.name} · ${f.yearGroup}${f.yearGroup === form.yearGroup ? "" : " (different year)"}`,
            }))}
          />
        ) : (
          <div className="text-sm text-destructive">No other form — create one first.</div>
        )}
      </Field>
      <ul className="sm:col-span-2 text-xs text-muted-foreground list-disc pl-4">
        {members.map((m) => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
    </FormDialog>
  );
}

/* ── Subject classes ──────────────────────────────────────────────────────── */

function SetsTab({
  d,
  setId,
  setSetId,
  openPupil,
}: {
  d: ClassData;
  setId: string | null;
  setSetId: (id: string | null) => void;
  openPupil: (id: string) => void;
}) {
  const [cur, setCur] = useState("");
  const [year, setYear] = useState("");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [dialog, setDialog] = useState<{ editing?: SubjectClass } | null>(null);
  const [deleting, setDeleting] = useState<SubjectClass | null>(null);
  const set = setId ? d.sets.find((s) => s.id === setId) : undefined;
  if (set) return <SetRoster d={d} set={set} onBack={() => setSetId(null)} openPupil={openPupil} />;

  const inCur = d.sets.filter((s) => !cur || s.curriculumId === cur);
  const years = [...new Set(inCur.map((s) => s.yearGroup))];
  const subjects = [...new Set(inCur.map((s) => s.subject))].sort();
  const teachers = [...new Set(d.sets.map((s) => s.teacher))].sort();
  const rows = inCur
    .filter(
      (s) =>
        (!year || s.yearGroup === year) &&
        (!subject || s.subject === subject) &&
        (!teacher || s.teacher === teacher),
    )
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const opt = (all: string, xs: string[]) => [
    { value: "", label: all },
    ...xs.map((x) => ({ value: x, label: x })),
  ];

  return (
    <Section
      title="Subject classes"
      description="Teaching sets. A pupil can be in many, but only one per subject and year group."
      actions={
        <Button size="sm" onClick={() => setDialog({})}>
          <Plus className="h-3.5 w-3.5" /> New subject class
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        <Select
          value={cur}
          onChange={(e) => {
            setCur(e.target.value);
            setYear("");
            setSubject("");
          }}
          options={[
            { value: "", label: "All curricula" },
            ...d.curricula.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={opt("All year groups", years)}
        />
        <Select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          options={opt("All subjects", subjects)}
        />
        <Select
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          options={opt("All teachers", teachers)}
        />
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Class" },
          { key: "subject", label: "Subject" },
          { key: "yearGroup", label: "Year group" },
          { key: "teacher", label: "Teacher" },
          { key: "room", label: "Room" },
          { key: "count", label: "Pupils" },
          { key: "_actions", label: "", className: "text-right" },
        ]}
        rows={rows}
        emptyText="No subject classes match"
        renderCell={(s: SubjectClass, k) => {
          if (k === "name")
            return (
              <button
                className="font-semibold hover:underline text-left"
                onClick={() => setSetId(s.id)}
              >
                {s.name}
                {s.set ? (
                  <span className="ml-1.5 text-[10px] text-muted-foreground">Set {s.set}</span>
                ) : null}
              </button>
            );
          if (k === "count") return <Fill n={s.studentIds.length} cap={s.capacity} />;
          if (k === "room") return s.room || "—";
          if (k === "_actions")
            return (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => setSetId(s.id)}>
                  <Users className="h-3.5 w-3.5" /> Roster
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Edit"
                  onClick={() => setDialog({ editing: s })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" title="Delete" onClick={() => setDeleting(s)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          return String(s[k as keyof SubjectClass] ?? "—");
        }}
      />
      {dialog && (
        <SetDialog
          d={d}
          editing={dialog.editing}
          defaults={{ curriculumId: cur || undefined, yearGroup: year || undefined }}
          onClose={() => setDialog(null)}
          onSaved={(id) => !dialog.editing && setSetId(id)}
        />
      )}
      {deleting && <DeleteSetDialog d={d} set={deleting} onClose={() => setDeleting(null)} />}
    </Section>
  );
}

function SetRoster({
  d,
  set,
  onBack,
  openPupil,
}: {
  d: ClassData;
  set: SubjectClass;
  onBack: () => void;
  openPupil: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const names = new Map(d.pupils.map((p) => [p.id, p.name]));
  const members = set.studentIds
    .map((id) => d.pupils.find((p) => p.id === id))
    .filter((p): p is Learner => !!p)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sameYear = d.pupils.filter(
    (p) => d.curOf.get(p.id) === set.curriculumId && p.level === set.yearGroup,
  );
  const otherSets = d.sets.filter(
    (s) =>
      s.id !== set.id &&
      s.curriculumId === set.curriculumId &&
      s.yearGroup === set.yearGroup &&
      s.subject.toLowerCase() === set.subject.toLowerCase(),
  );
  const yearForms = d.forms.filter(
    (f) => f.curriculumId === set.curriculumId && f.yearGroup === set.yearGroup,
  );
  const over = set.studentIds.length - set.capacity;

  return (
    <Section
      title={set.name}
      description={`${set.subject} · ${set.yearGroup} · ${set.teacher}${set.room ? ` · ${set.room}` : ""}`}
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" /> All subject classes
          </Button>
          <ActionSelect
            placeholder="Enrol whole form…"
            options={yearForms.map((f) => ({ value: f.id, label: f.name }))}
            onPick={(id) => {
              const f = yearForms.find((x) => x.id === id);
              const ids = sameYear.filter((p) => p.group === f?.name).map((p) => p.id);
              if (!ids.length) return toast.info(`${f?.name} has no pupils`);
              enrolInSet(d, set, ids, names);
            }}
          />
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDeleting(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Enrol pupils
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span>
          Pupils: <Fill n={set.studentIds.length} cap={set.capacity} />
        </span>
        {set.set && <Badge tone="info">Set {set.set}</Badge>}
        {over > 0 && <Badge tone="destructive">Over capacity by {over}</Badge>}
        <span className="text-xs text-muted-foreground">
          {
            sameYear.filter((p) => !set.studentIds.includes(p.id) && !setClash(d.sets, p.id, set))
              .length
          }{" "}
          {set.yearGroup} pupils not yet in a {set.subject} class
        </span>
      </div>
      <DataTable
        columns={[
          { key: "pupil", label: "Pupil" },
          { key: "form", label: "Form" },
          { key: "_actions", label: "", className: "text-right" },
        ]}
        rows={members}
        emptyText="Nobody enrolled yet"
        renderCell={(p: Learner, k) => {
          if (k === "pupil") return <PupilCell p={p} onOpen={openPupil} />;
          if (k === "form") return p.group ?? <Badge tone="warning">Unplaced</Badge>;
          if (k === "_actions")
            return (
              <div className="flex justify-end items-center gap-1">
                <ActionSelect
                  placeholder="Move to…"
                  options={otherSets.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.studentIds.length}/${s.capacity})`,
                  }))}
                  onPick={(id) => {
                    const to = otherSets.find((s) => s.id === id);
                    if (to) moveBetweenSets(d, set, to, p.id, p.name);
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  title="Remove"
                  onClick={() => removeFromSet(d, set, p.id, p.name)}
                >
                  <UserMinus className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          return null;
        }}
      />
      {adding && (
        <PickPupilsDialog
          title={`Enrol in ${set.name}`}
          description={`${set.yearGroup} pupils. One ${set.subject} class per pupil.`}
          submitLabel="Enrol"
          candidates={sameYear
            .filter((p) => !set.studentIds.includes(p.id))
            .map((p) => {
              const clash = setClash(d.sets, p.id, set);
              return {
                id: p.id,
                name: p.name,
                note: p.group ?? "Unplaced",
                blocked: clash ? `Already in ${clash.name} — use Move` : undefined,
              };
            })}
          onClose={() => setAdding(false)}
          onConfirm={(ids) => enrolInSet(d, set, ids, names)}
        />
      )}
      {editing && <SetDialog d={d} editing={set} onClose={() => setEditing(false)} />}
      {deleting && (
        <DeleteSetDialog d={d} set={set} onClose={() => setDeleting(false)} onDeleted={onBack} />
      )}
    </Section>
  );
}

function SetDialog({
  d,
  editing,
  defaults,
  onClose,
  onSaved,
}: {
  d: ClassData;
  editing?: SubjectClass;
  defaults?: { curriculumId?: string; yearGroup?: string };
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const [curriculumId, setCurriculumId] = useState(
    editing?.curriculumId ?? defaults?.curriculumId ?? d.curricula[0]?.id ?? "",
  );
  const cur = d.curricula.find((c) => c.id === curriculumId);
  const [yearGroup, setYearGroup] = useState(
    editing?.yearGroup ?? defaults?.yearGroup ?? cur?.yearGroups[0] ?? "",
  );
  const [subject, setSubject] = useState(editing?.subject ?? "");
  const [setNo, setSetNo] = useState(editing?.set ? String(editing.set) : "");
  const [name, setName] = useState(editing?.name ?? "");
  const [teacher, setTeacher] = useState(editing?.teacher ?? d.staff[0] ?? "");
  const [room, setRoom] = useState(editing?.room ?? "");
  const [capacity, setCapacity] = useState(String(editing?.capacity ?? 24));
  const suggested = subject.trim()
    ? suggestSetName(yearGroup, subject, Number(setNo) || undefined)
    : "";
  const subjects = [...new Set(d.sets.map((s) => s.subject))].sort();

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={editing ? `Edit ${editing.name}` : "New subject class"}
      description="A teaching set for one subject in one year group."
      submitLabel={editing ? "Save" : "Create class"}
      onSubmit={() => {
        const finalName = (name.trim() || suggested).trim();
        if (!subject.trim() || !yearGroup || !teacher || !finalName)
          return toast.error("Subject, year group and teacher are required");
        if (
          d.sets.some(
            (s) => s.id !== editing?.id && s.name.toLowerCase() === finalName.toLowerCase(),
          )
        )
          return toast.error(`There is already a class called ${finalName}`);
        const patch = {
          curriculumId,
          yearGroup,
          subject: subject.trim(),
          name: finalName,
          teacher,
          room: room.trim() || undefined,
          capacity: Number(capacity) || 24,
          set: Number(setNo) || undefined,
        };
        if (editing) {
          if (
            editing.studentIds.length &&
            (yearGroup !== editing.yearGroup || curriculumId !== editing.curriculumId)
          )
            return toast.error("Remove the pupils before changing the year group or curriculum");
          updateItem("subjectClasses", (s) => s.id === editing.id, patch);
          const changed = (
            ["name", "subject", "teacher", "room", "capacity", "set"] as const
          ).filter((k) => String(editing[k] ?? "") !== String(patch[k] ?? ""));
          for (const k of changed)
            logChange({
              tenantId: d.tenantId,
              entity: "subjectClass",
              entityId: editing.id,
              field: k,
              from: String(editing[k] ?? ""),
              to: String(patch[k] ?? ""),
              by: d.by,
            });
          if (patch.teacher !== editing.teacher)
            notify({
              tenantId: d.tenantId,
              channel: "App",
              to: patch.teacher,
              subject: `You now teach ${finalName} (${editing.studentIds.length} pupils)`,
              source: "Classes · subject class",
              relatedId: editing.id,
            });
          toast.success(`${finalName} saved`);
          onClose();
          onSaved?.(editing.id);
          return;
        }
        const id = nextId("SC-", "subjectClasses");
        addItem("subjectClasses", { id, tenantId: d.tenantId, studentIds: [], ...patch });
        logChange({
          tenantId: d.tenantId,
          entity: "subjectClass",
          entityId: id,
          field: "created",
          to: finalName,
          by: d.by,
        });
        toast.success(`${finalName} created — now enrol pupils`);
        onClose();
        onSaved?.(id);
      }}
    >
      <Field label="Curriculum">
        <Select
          value={curriculumId}
          onChange={(e) => {
            setCurriculumId(e.target.value);
            setYearGroup(d.curricula.find((c) => c.id === e.target.value)?.yearGroups[0] ?? "");
          }}
          options={d.curricula.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field label="Year group" required>
        <Select
          value={yearGroup}
          onChange={(e) => setYearGroup(e.target.value)}
          options={(cur?.yearGroups ?? []).map((y) => ({ value: y, label: y }))}
        />
      </Field>
      <Field label="Subject" required>
        <TextInput
          value={subject}
          list="sc-subjects"
          onChange={(e) => setSubject(e.target.value)}
          placeholder="IGCSE Chemistry"
        />
        <datalist id="sc-subjects">
          {subjects.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>
      <Field label="Set number" hint="Optional — 1 = top set">
        <NumberInput min={1} max={9} value={setNo} onChange={(e) => setSetNo(e.target.value)} />
      </Field>
      <Field
        label="Class name"
        hint={suggested && !name ? `Will be "${suggested}"` : undefined}
        className="sm:col-span-2"
      >
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={suggested || "10 Chemistry Set 1"}
        />
      </Field>
      <Field label="Teacher" required>
        <Select
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          options={d.staff.map((s) => ({ value: s, label: s }))}
        />
      </Field>
      <Field label="Room">
        <TextInput value={room} list="sc-rooms" onChange={(e) => setRoom(e.target.value)} />
        <datalist id="sc-rooms">
          {d.roomNames.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </Field>
      <Field label="Capacity" hint="Soft limit">
        <NumberInput
          min={1}
          max={60}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </Field>
    </FormDialog>
  );
}

function DeleteSetDialog({
  d,
  set,
  onClose,
  onDeleted,
}: {
  d: ClassData;
  set: SubjectClass;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const n = set.studentIds.length;
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Delete ${set.name}?`}
      description={
        n
          ? `${n} pupils will be unenrolled and show as missing a ${set.subject} class.`
          : "The class is empty. This can't be undone."
      }
      submitLabel="Delete class"
      submitVariant="destructive"
      onSubmit={() => {
        for (const id of set.studentIds)
          logChange({
            tenantId: d.tenantId,
            entity: "subjectClass",
            entityId: set.id,
            studentId: id,
            field: "subject class",
            from: set.name,
            by: d.by,
            reason: "Class deleted",
          });
        removeItem("subjectClasses", (s) => s.id === set.id);
        logChange({
          tenantId: d.tenantId,
          entity: "subjectClass",
          entityId: set.id,
          field: "deleted",
          from: set.name,
          by: d.by,
        });
        toast.success(`${set.name} deleted`);
        onClose();
        onDeleted?.();
      }}
    >
      <div className="sm:col-span-2 text-sm text-muted-foreground">
        {set.subject} · {set.yearGroup} · {set.teacher}
      </div>
    </FormDialog>
  );
}

/* ── Find a pupil ─────────────────────────────────────────────────────────── */

function PupilTab({
  d,
  pupilId,
  setPupilId,
  openForm,
  openSet,
}: {
  d: ClassData;
  pupilId: string | null;
  setPupilId: (id: string | null) => void;
  openForm: (id: string) => void;
  openSet: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const names = new Map(d.pupils.map((p) => [p.id, p.name]));
  const matches = q
    ? d.pupils.filter((p) =>
        `${p.name} ${p.id} ${p.group ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      )
    : d.pupils;
  const p = pupilId ? d.pupils.find((x) => x.id === pupilId) : undefined;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Section title="Pupils" description={`${d.pupils.length} on roll`}>
        <div className="relative mb-3">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <TextInput
            className="pl-9"
            placeholder="Name, ID or form"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="max-h-[28rem] overflow-y-auto divide-y -mx-1">
          {matches.map((x) => (
            <li key={x.id}>
              <button
                onClick={() => setPupilId(x.id)}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-muted/50",
                  x.id === pupilId && "bg-primary/10",
                )}
              >
                <div className="font-medium">{x.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {x.id} · {x.level} · {x.group ?? "no form"}
                </div>
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="p-4 text-center text-sm text-muted-foreground">No pupils found</li>
          )}
        </ul>
      </Section>

      <div className="lg:col-span-2">
        {!p ? (
          <Section title="Pupil classes">
            <p className="text-sm text-muted-foreground">
              Pick a pupil to see their form and subject classes.
            </p>
          </Section>
        ) : (
          <PupilClasses d={d} p={p} names={names} openForm={openForm} openSet={openSet} />
        )}
      </div>
    </div>
  );
}

function PupilClasses({
  d,
  p,
  names,
  openForm,
  openSet,
}: {
  d: ClassData;
  p: Learner;
  names: Map<string, string>;
  openForm: (id: string) => void;
  openSet: (id: string) => void;
}) {
  const curId = d.curOf.get(p.id);
  const cur = d.curricula.find((c) => c.id === curId);
  const yearForms = d.forms.filter((f) => f.curriculumId === curId && f.yearGroup === p.level);
  const form = d.forms.find((f) => f.name === p.group);
  const formOk = !!form && yearForms.includes(form);
  const mine = d.sets.filter((s) => s.studentIds.includes(p.id));
  const yearSets = d.sets.filter((s) => s.curriculumId === curId && s.yearGroup === p.level);
  const taken = new Set(mine.map((s) => s.subject.toLowerCase()));
  const missing = [...new Set(yearSets.map((s) => s.subject))].filter(
    (s) => !taken.has(s.toLowerCase()),
  );
  const canJoin = yearSets.filter((s) => !taken.has(s.subject.toLowerCase()));

  return (
    <div className="space-y-4">
      <Section
        title={p.name}
        description={`${p.id} · ${p.level} · ${cur?.name ?? "—"}${p.house ? ` · ${p.house}` : ""}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground w-20">
            Form
          </div>
          {formOk ? (
            <button className="font-semibold hover:underline" onClick={() => openForm(form!.id)}>
              {form!.name}
            </button>
          ) : (
            <Badge tone="warning">
              {p.group ? `${p.group} (not a ${p.level} form)` : "Unplaced"}
            </Badge>
          )}
          {formOk && <span className="text-xs text-muted-foreground">Tutor {form!.tutor}</span>}
          <span className="ml-auto flex gap-1">
            <ActionSelect
              placeholder={formOk ? "Move to…" : "Place in…"}
              options={yearForms
                .filter((f) => f.name !== p.group)
                .map((f) => ({
                  value: f.id,
                  label: `${f.name} (${d.pupils.filter((x) => x.group === f.name).length}/${f.capacity ?? "—"})`,
                }))}
              onPick={(id) => {
                const f = yearForms.find((x) => x.id === id);
                if (placeInForm(d, p, f, formOk ? "Moved" : "Placed"))
                  toast.success(`${p.name} → ${f?.name}`);
              }}
            />
            {p.group && (
              <Button
                size="sm"
                variant="ghost"
                title="Remove from form"
                onClick={() => {
                  placeInForm(d, p, undefined, "Removed from form");
                  toast.success(`${p.name} is now unplaced`);
                }}
              >
                <UserMinus className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </span>
        </div>
      </Section>

      <Section
        title="Subject classes"
        description={`${mine.length} classes${missing.length ? ` · missing: ${missing.join(", ")}` : ""}`}
        actions={
          <ActionSelect
            placeholder="Enrol in…"
            options={canJoin.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.studentIds.length}/${s.capacity})`,
            }))}
            onPick={(id) => {
              const s = canJoin.find((x) => x.id === id);
              if (s) enrolInSet(d, s, [p.id], names);
            }}
          />
        }
      >
        <DataTable
          columns={[
            { key: "name", label: "Class" },
            { key: "subject", label: "Subject" },
            { key: "teacher", label: "Teacher" },
            { key: "_actions", label: "", className: "text-right" },
          ]}
          rows={mine}
          emptyText="Not in any subject class"
          renderCell={(s: SubjectClass, k) => {
            if (k === "name")
              return (
                <button className="font-medium hover:underline" onClick={() => openSet(s.id)}>
                  {s.name}
                </button>
              );
            if (k === "_actions") {
              const alts = yearSets.filter(
                (x) => x.id !== s.id && x.subject.toLowerCase() === s.subject.toLowerCase(),
              );
              return (
                <div className="flex justify-end items-center gap-1">
                  <ActionSelect
                    placeholder="Move to…"
                    options={alts.map((x) => ({
                      value: x.id,
                      label: `${x.name} (${x.studentIds.length}/${x.capacity})`,
                    }))}
                    onPick={(id) => {
                      const to = alts.find((x) => x.id === id);
                      if (to) moveBetweenSets(d, s, to, p.id, p.name);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Remove"
                    onClick={() => removeFromSet(d, s, p.id, p.name)}
                  >
                    <UserMinus className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              );
            }
            return String(s[k as keyof SubjectClass] ?? "—");
          }}
        />
      </Section>
    </div>
  );
}

/* ── Teacher: My Forms & Sets ─────────────────────────────────────────────── */

function TeacherClasses() {
  const d = useClassData();
  const ctx = useTenantContext();
  const me = ctx.user?.name ?? "";
  const myForms = d.forms.filter((f) => f.tutor === me);
  const mySets = d.sets.filter((s) => s.teacher === me);
  const byId = new Map(d.pupils.map((p) => [p.id, p]));
  const pupilCount = new Set([
    ...d.pupils.filter((p) => myForms.some((f) => f.name === p.group)).map((p) => p.id),
    ...mySets.flatMap((s) => s.studentIds),
  ]).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Forms & Sets"
        subtitle="The forms you tutor and the classes you teach."
        actions={
          <>
            <Link to="/app/registers">
              <Button variant="outline">
                <ClipboardCheck className="h-4 w-4" /> Take a register
              </Button>
            </Link>
            <Link to="/app/srb">
              <Button variant="outline">
                <NotebookPen className="h-4 w-4" /> Record books
              </Button>
            </Link>
          </>
        }
      />
      <PackContextBar pack="intl-school" />
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Forms I tutor"
          value={myForms.length}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Classes I teach"
          value={mySets.length}
          icon={<Layers className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Pupils"
          value={pupilCount}
          icon={<Users className="h-4 w-4" />}
          accent="success"
        />
      </div>

      {myForms.map((f) => (
        <RosterCard
          key={f.id}
          title={`Form ${f.name}`}
          sub={`${f.yearGroup}${f.room ? ` · Room ${f.room}` : ""}`}
          cap={f.capacity}
          pupils={d.pupils.filter((p) => p.group === f.name)}
          extra={(p) => p.house ?? ""}
        />
      ))}
      {mySets.map((s) => (
        <RosterCard
          key={s.id}
          title={s.name}
          sub={`${s.subject} · ${s.yearGroup}${s.room ? ` · ${s.room}` : ""}`}
          cap={s.capacity}
          pupils={s.studentIds.map((id) => byId.get(id)).filter((p): p is Learner => !!p)}
          extra={(p) => p.group ?? "Unplaced"}
        />
      ))}
      {myForms.length + mySets.length === 0 && (
        <Section title="Nothing assigned yet">
          <p className="text-sm text-muted-foreground">
            You don't tutor a form or teach a class yet. Ask the school office to add you.
          </p>
        </Section>
      )}
    </div>
  );
}

function RosterCard({
  title,
  sub,
  cap,
  pupils,
  extra,
}: {
  title: string;
  sub: string;
  cap?: number;
  pupils: Learner[];
  extra: (p: Learner) => string;
}) {
  return (
    <Section
      title={title}
      description={sub}
      actions={
        <span className="text-sm">
          <Fill n={pupils.length} cap={cap} /> pupils
        </span>
      }
    >
      {pupils.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pupils yet.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[...pupils]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <li
                key={p.id}
                className="rounded-md border px-3 py-2 text-sm flex items-center justify-between gap-2"
              >
                <span className="min-w-0">
                  <Link
                    to="/app/srb/$studentId"
                    params={{ studentId: p.id }}
                    className="font-medium hover:underline"
                  >
                    {p.name}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">{p.id}</div>
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">{extra(p)}</span>
              </li>
            ))}
        </ul>
      )}
    </Section>
  );
}

/* ── Parent / student: read-only ──────────────────────────────────────────── */

function FamilyClasses() {
  const kids = useScopedLearners();
  const ctx = useTenantContext();
  const forms = useCollection("tutorGroups").filter((f) => f.tenantId === ctx.tenantId);
  const sets = useCollection("subjectClasses").filter((s) => s.tenantId === ctx.tenantId);
  const isParent = ctx.user?.role === "parent";
  return (
    <div className="space-y-6">
      <PageHeader
        title={isParent ? "Your child's classes" : "My classes"}
        subtitle="Form class and subject classes. Ask the school office about changes."
      />
      {kids.length === 0 && (
        <Section title="No classes to show">
          <p className="text-sm text-muted-foreground">
            No pupil records are linked to this account.
          </p>
        </Section>
      )}
      {kids.map((k) => {
        const form = forms.find((f) => f.name === k.group);
        const mine = sets.filter((s) => s.studentIds.includes(k.id));
        return (
          <Section
            key={k.id}
            title={k.name}
            description={`${k.level} · Form ${k.group ?? "not yet assigned"}${form ? ` · Tutor ${form.tutor}` : ""}`}
          >
            <DataTable
              columns={[
                { key: "name", label: "Class" },
                { key: "subject", label: "Subject" },
                { key: "teacher", label: "Teacher" },
                { key: "room", label: "Room" },
              ]}
              rows={mine}
              emptyText="No subject classes yet"
              renderCell={(s: SubjectClass, key) => String(s[key as keyof SubjectClass] ?? "—")}
            />
          </Section>
        );
      })}
    </div>
  );
}
