import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  DataTable,
  Badge,
  Button,
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Select,
  StatCard,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCollection, addItem, updateItem, nextId, type Assignment } from "@/lib/store";
import {
  Plus,
  Upload,
  CheckCircle2,
  BookOpen,
  Clock,
  AlertTriangle,
  Inbox,
  ClipboardCheck,
  Sprout,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import { notify } from "@/lib/packs/sis/activity";
import type { TeachingGroup } from "@/lib/packs/sis/learning";
import { courseworkState, type Coursework, type Submission } from "@/lib/packs/sis/coursework";
import {
  KidPicker,
  StateBadge,
  bandOf,
  resultText,
  shortDate,
  useLearning,
  type LearningData,
} from "@/components/packs/CourseworkUI";

export const Route = createFileRoute("/app/assignments")({
  head: () => ({ meta: [{ title: "Assignments — 1StudentID" }] }),
  component: AssignmentsRoute,
});

function AssignmentsRoute() {
  const ctx = useTenantContext();
  if (ctx.profile?.experience === "segment") return <PackAssignments />;
  return <AssignmentsPage />;
}

function AssignmentsPage() {
  const { user } = useAuth();
  const assignments = useCollection("assignments");
  const courses = useCollection("courses");
  const add = useDisclosure();
  const isStaff = user?.role === "teacher" || user?.role === "admin";

  const [form, setForm] = useState({
    title: "",
    course: courses[0]?.title ?? "",
    due: "",
    status: "Pending",
  });

  const submit = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const newAssignment: Assignment = {
      id: nextId("A-", "assignments"),
      title: form.title.trim(),
      course: form.course,
      due: form.due || "TBD",
      status: form.status,
      score: null,
    };
    addItem("assignments", newAssignment);
    toast.success(`Published "${newAssignment.title}"`);
    setForm({
      title: "",
      course: courses[0]?.title ?? "",
      due: "",
      status: "Pending",
    });
    add.onClose();
  };

  const markSubmitted = (id: string) => {
    updateItem("assignments", (a) => a.id === id, { status: "Submitted" });
    toast.success("Submission recorded");
  };

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Track submissions, deadlines and grades."
        actions={
          isStaff ? (
            <Button onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              New Assignment
            </Button>
          ) : null
        }
      />
      <Section>
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "title", label: "Title" },
            { key: "course", label: "Course" },
            { key: "due", label: "Due" },
            { key: "score", label: "Score" },
            { key: "status", label: "Status" },
            { key: "_actions", label: "" },
          ]}
          rows={assignments}
          emptyText="No assignments yet"
          renderCell={(row, key) => {
            if (key === "status") {
              const tone =
                row.status === "Pending" ? "warning" : row.status === "Graded" ? "success" : "info";
              return <Badge tone={tone}>{row.status}</Badge>;
            }
            if (key === "score") return row.score === null ? "—" : `${row.score}/100`;
            if (key === "_actions") {
              if (row.status === "Pending") {
                return (
                  <button
                    onClick={() => markSubmitted(row.id)}
                    className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/15 inline-flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    Submit
                  </button>
                );
              }
              return (
                <span className="text-xs text-success inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Done
                </span>
              );
            }
            return String(row[key] ?? "");
          }}
        />
      </Section>

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="New Assignment"
        description="Publish a new assignment to a course."
        onSubmit={submit}
        submitLabel="Publish"
      >
        <Field label="Title" required className="sm:col-span-2">
          <TextInput
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Quantum Mechanics Problem Set"
            autoFocus
          />
        </Field>
        <Field label="Course">
          <Select
            value={form.course}
            onChange={(e) => setForm({ ...form, course: e.target.value })}
            options={courses.map((c) => ({ value: c.title, label: c.title }))}
          />
        </Field>
        <Field label="Due date">
          <TextInput
            type="date"
            value={form.due}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
        </Field>
      </FormDialog>
    </div>
  );
}

/* ══ Pack tenants ═══════════════════════════════════════════════════════════ */

function PackAssignments() {
  const d = useLearning();
  const role = d.ctx.user?.role;
  if (role === "student" || role === "parent") return <FamilyCoursework d={d} />;
  return <StaffCoursework d={d} />;
}

/* ── Student / parent / family-used account ─────────────────────────────── */

function FamilyCoursework({ d }: { d: LearningData }) {
  const role = d.ctx.user?.role;
  const [kidId, setKidId] = useState(d.kids[0]?.id ?? "");
  const kid = d.kids.find((k) => k.id === kidId) ?? d.kids[0];
  const [submitting, setSubmitting] = useState<Coursework | null>(null);
  const [viewing, setViewing] = useState<Coursework | null>(null);

  if (!kid)
    return (
      <div>
        <PageHeader title="Homework & coursework" />
        <Section>
          <p className="text-sm text-muted-foreground">No learner is linked to this account.</p>
        </Section>
      </div>
    );

  const band = bandOf(kid);
  const isParent = role === "parent";
  const title = isParent ? "Homework & coursework" : "My coursework";
  const header = (
    <>
      <PageHeader title={title} subtitle={`${kid.name} · ${kid.level} · ${d.ctx.tenantName}`} />
      <KidPicker kids={d.kids} value={kid.id} onChange={setKidId} />
    </>
  );

  if (band === "early")
    return (
      <div>
        {header}
        <Section>
          <div className="flex flex-col items-center text-center py-8 gap-3">
            <Sprout className="h-8 w-8 text-success" />
            <div className="font-semibold">
              No homework in the early years — see the learning journal
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              {kid.name.split(" ")[0]} learns through play. Progress is shared against the early
              learning goals each term.
            </p>
            <Link to="/app/grades">
              <Button variant="outline">Open the learning journal</Button>
            </Link>
          </div>
        </Section>
      </div>
    );

  const groups = d.groups.filter((g) => g.studentIds.includes(kid.id) && g.band !== "early");
  const items = d.coursework
    .filter((c) => groups.some((g) => g.id === c.groupId))
    .sort((a, b) => b.due.localeCompare(a.due));
  const rows = items.map((c) => {
    const sub = d.subFor(c.id, kid.id);
    return { cw: c, sub, state: courseworkState(c, sub), group: d.groupById(c.groupId) };
  });
  const count = (s: string) => rows.filter((r) => r.state === s).length;
  const weekEnd = addDays(DEMO_TODAY, 7);
  const dueSoon = rows.filter((r) => r.state === "Due" && r.cw.due <= weekEnd).length;

  // Who may hand work in: the learner, a family-used pupil account, or a parent for a primary child.
  const canSubmit = role === "student" || (isParent && band === "primary");

  return (
    <div className="space-y-6">
      <div>{header}</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Due this week" value={dueSoon} icon={<Clock className="h-4 w-4" />} />
        <StatCard
          label="Overdue"
          value={count("Overdue")}
          accent={count("Overdue") ? "destructive" : "success"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Awaiting marking"
          value={count("Submitted") + count("Late")}
          accent="info"
          icon={<Inbox className="h-4 w-4" />}
        />
        <StatCard
          label="Marked"
          value={count("Marked")}
          accent="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {d.ctx.familyOperated && (
        <p className="text-xs text-muted-foreground">
          Family-used account — work handed in here is recorded as submitted by {d.ctx.guardianName}{" "}
          on {kid.name.split(" ")[0]}&apos;s behalf.
        </p>
      )}

      <Section
        title={
          band === "higher-ed"
            ? "Lab sheets & problem sets"
            : band === "vocational"
              ? "Workplace tasks"
              : "Homework & coursework"
        }
        description={
          band === "primary"
            ? "Teachers reply with a comment, not a score."
            : band === "higher-ed"
              ? "Practice work — doesn't count towards your module mark."
              : undefined
        }
      >
        <DataTable
          columns={[
            { key: "title", label: "Task" },
            {
              key: "group",
              label: band === "higher-ed" ? "Module" : band === "vocational" ? "Unit" : "Subject",
            },
            { key: "due", label: "Due" },
            { key: "state", label: "Status" },
            { key: "result", label: "Result" },
            { key: "_actions", label: "" },
          ]}
          rows={rows}
          emptyText="Nothing set yet"
          renderCell={(r: (typeof rows)[number], key) => {
            if (key === "title")
              return (
                <div>
                  <div className="font-medium">{r.cw.title}</div>
                  <div className="text-xs text-muted-foreground">{r.cw.kind}</div>
                </div>
              );
            if (key === "group")
              return r.cw.unitCode ? (
                <span className="font-mono text-xs">{r.cw.unitCode}</span>
              ) : (
                (r.group?.title ?? "—")
              );
            if (key === "due") return shortDate(r.cw.due);
            if (key === "state") return <StateBadge state={r.state} />;
            if (key === "result") return resultText(r.cw, r.sub);
            if (key === "_actions") {
              if (r.state === "Marked")
                return (
                  <Button size="sm" variant="outline" onClick={() => setViewing(r.cw)}>
                    Feedback
                  </Button>
                );
              if (r.cw.kind === "Quiz")
                return <span className="text-xs text-muted-foreground">In class</span>;
              if (!canSubmit) return null;
              return (
                <Button
                  size="sm"
                  variant={r.state === "Overdue" || r.state === "Due" ? "primary" : "outline"}
                  onClick={() => setSubmitting(r.cw)}
                >
                  <Upload className="h-3 w-3" />
                  {r.state === "Submitted" || r.state === "Late"
                    ? "Replace"
                    : isParent || d.ctx.familyOperated
                      ? "Submit on behalf"
                      : "Submit"}
                </Button>
              );
            }
            return null;
          }}
        />
      </Section>

      {band === "higher-ed" && <AssessedComponents d={d} studentId={kid.id} />}
      {band === "vocational" && (
        <p className="text-xs text-muted-foreground">
          Unit sign-off is recorded by your assessor —{" "}
          <Link to="/app/grades" className="text-primary hover:underline">
            see unit competency
          </Link>
          .
        </p>
      )}

      {submitting && (
        <SubmitDialog d={d} kid={kid} cw={submitting} onClose={() => setSubmitting(null)} />
      )}
      {viewing && (
        <FeedbackDialog
          cw={viewing}
          sub={d.subFor(viewing.id, kid.id)}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

const addDays = (iso: string, n: number) => {
  const x = new Date(`${iso}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

function SubmitDialog({
  d,
  kid,
  cw,
  onClose,
}: {
  d: LearningData;
  kid: Learner;
  cw: Coursework;
  onClose: () => void;
}) {
  const existing = d.subFor(cw.id, kid.id);
  const [file, setFile] = useState(existing?.fileName ?? "");
  const user = d.ctx.user;
  const onBehalf =
    user?.role === "parent" ? user.name : d.ctx.familyOperated ? d.ctx.guardianName : undefined;

  const save = () => {
    if (!file.trim()) {
      toast.error("Attach a file name");
      return;
    }
    const late = cw.due < DEMO_TODAY;
    const patch: Partial<Submission> = {
      status: late ? "Late" : "Submitted",
      submittedAt: DEMO_TODAY,
      fileName: file.trim(),
      submittedBy: onBehalf,
      late: late || undefined,
    };
    if (existing) updateItem("submissions", (s) => s.id === existing.id, patch);
    else
      addItem("submissions", {
        id: nextId("SUB-", "submissions"),
        tenantId: cw.tenantId,
        courseworkId: cw.id,
        studentId: kid.id,
        status: "Submitted",
        ...patch,
      });
    notify({
      tenantId: cw.tenantId,
      channel: "App",
      to: cw.setBy,
      subject: `${kid.name} handed in "${cw.title}"${late ? " (late)" : ""}`,
      body: onBehalf ? `Submitted by ${onBehalf} on the learner's behalf.` : undefined,
      source: "Coursework · submissions",
      relatedId: cw.id,
    });
    toast.success(late ? "Handed in (late)" : "Handed in");
    onClose();
  };

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={cw.title}
      description={`Due ${shortDate(cw.due)}${cw.instructions ? ` · ${cw.instructions}` : ""}`}
      onSubmit={save}
      submitLabel={onBehalf ? "Submit on behalf" : "Submit"}
    >
      <Field label="File" required className="sm:col-span-2" hint="Photo, document or PDF">
        <TextInput
          value={file}
          onChange={(e) => setFile(e.target.value)}
          placeholder="e.g. spellings-week6.jpg"
          autoFocus
        />
      </Field>
      {onBehalf && (
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Recorded as handed in by {onBehalf} for {kid.name}.
        </p>
      )}
    </FormDialog>
  );
}

function FeedbackDialog({
  cw,
  sub,
  onClose,
}: {
  cw: Coursework;
  sub?: Submission;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cw.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Result</span>
            <Badge tone="success">{resultText(cw, sub)}</Badge>
            {sub?.late && <Badge tone="warning">Handed in late</Badge>}
          </div>
          <div className="rounded-lg bg-muted/40 p-3">{sub?.feedback ?? "No comment."}</div>
          <div className="text-xs text-muted-foreground">
            {sub?.markedBy ?? cw.setBy}
            {sub?.markedAt ? ` · ${shortDate(sub.markedAt)}` : ""}
            {sub?.fileName ? ` · ${sub.fileName}` : ""}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** University: the assessed components of my modules (marks via results release). */
function AssessedComponents({ d, studentId }: { d: LearningData; studentId: string }) {
  const mods = d.heModules.filter((m) =>
    d.moduleRegistrations.some(
      (r) => r.moduleId === m.id && r.studentId === studentId && r.status === "Registered",
    ),
  );
  const rows = mods
    .flatMap((m) =>
      m.components
        .filter((c) => c.type !== "Exam")
        .map((c) => ({ id: `${m.id}${c.id}`, mod: m, c })),
    )
    .sort((a, b) => a.c.due.localeCompare(b.c.due));
  return (
    <Section
      title="Assessed coursework"
      description="Counts towards your module marks. Results appear once released."
      actions={
        <Link
          to="/app/he/assessment"
          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
        >
          Assessment <ExternalLink className="h-3 w-3" />
        </Link>
      }
    >
      <DataTable
        columns={[
          { key: "name", label: "Component" },
          { key: "module", label: "Module" },
          { key: "weight", label: "Weight" },
          { key: "due", label: "Due" },
        ]}
        rows={rows}
        emptyText="No assessed coursework"
        renderCell={(r: (typeof rows)[number], key) => {
          if (key === "name") return <span className="font-medium">{r.c.name}</span>;
          if (key === "module") return `${r.mod.code} ${r.mod.title}`;
          if (key === "weight") return `${r.c.weight}%`;
          if (key === "due")
            return (
              <span className={r.c.due < DEMO_TODAY ? "text-muted-foreground" : ""}>
                {shortDate(r.c.due)}
              </span>
            );
          return null;
        }}
      />
    </Section>
  );
}

/* ── Teacher / admin ────────────────────────────────────────────────────── */

function StaffCoursework({ d }: { d: LearningData }) {
  const isAdmin = d.ctx.user?.role === "admin";
  const base = (isAdmin ? d.groups : d.myGroups).filter((g) => g.band !== "early");
  const [level, setLevel] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const add = useDisclosure();
  const levels = Array.from(new Set(base.map((g) => g.level)));
  const groups = base.filter((g) => level === "all" || g.level === level);
  const shown = groups.filter((g) => groupId === "all" || g.id === groupId);

  const rows = d.coursework
    .filter((c) => shown.some((g) => g.id === c.groupId))
    .sort((a, b) => b.due.localeCompare(a.due))
    .map((c) => {
      const g = d.groupById(c.groupId)!;
      const subs = g.studentIds.map((sid) => d.subFor(c.id, sid));
      const handedIn = subs.filter((s) => s && s.status !== "Not submitted").length;
      const toMark = subs.filter((s) => s?.status === "Submitted" || s?.status === "Late").length;
      const marked = subs.filter((s) => s?.status === "Marked").length;
      const missing = c.due < DEMO_TODAY ? g.studentIds.length - handedIn : 0;
      return { cw: c, g, handedIn, toMark, marked, missing, n: g.studentIds.length };
    });
  const total = (k: "toMark" | "missing" | "marked") => rows.reduce((a, r) => a + r[k], 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Coursework overview" : "Coursework"}
        subtitle={
          isAdmin
            ? `${d.ctx.tenantName} · homework, coursework and tasks across all groups`
            : `Work set for your ${base.length} group${base.length === 1 ? "" : "s"}`
        }
        actions={
          base.length ? (
            <Button onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              Set work
            </Button>
          ) : null
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Items set" value={rows.length} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard
          label="To mark"
          value={total("toMark")}
          accent="info"
          icon={<Inbox className="h-4 w-4" />}
        />
        <StatCard
          label="Missing"
          value={total("missing")}
          accent={total("missing") ? "destructive" : "success"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Marked"
          value={total("marked")}
          accent="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {isAdmin && <AdminByYear d={d} groups={base} />}

      <Section
        title="Work set"
        actions={
          <div className="flex gap-2">
            {levels.length > 1 && (
              <Select
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  setGroupId("all");
                }}
                options={[
                  { value: "all", label: "All year groups" },
                  ...levels.map((l) => ({ value: l, label: l })),
                ]}
              />
            )}
            <Select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              options={[
                { value: "all", label: isAdmin ? "All groups" : "All my groups" },
                ...groups.map((g) => ({ value: g.id, label: g.title })),
              ]}
            />
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "title", label: "Task" },
            { key: "group", label: "Group" },
            { key: "due", label: "Due" },
            { key: "handedIn", label: "Handed in" },
            { key: "toMark", label: "To mark" },
            { key: "missing", label: "Missing" },
            { key: "_actions", label: "" },
          ]}
          rows={rows}
          emptyText={
            base.length ? "Nothing set yet" : "You have no teaching groups in this institution"
          }
          renderCell={(r: (typeof rows)[number], key) => {
            if (key === "title")
              return (
                <div>
                  <div className="font-medium">{r.cw.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.cw.kind}
                    {r.cw.formative ? " · formative" : ""}
                    {r.cw.unitCode ? ` · ${r.cw.unitCode}` : ""}
                    {r.cw.maxScore ? ` · out of ${r.cw.maxScore}` : ""}
                  </div>
                </div>
              );
            if (key === "group") return r.g.title;
            if (key === "due") return shortDate(r.cw.due);
            if (key === "handedIn") return `${r.handedIn}/${r.n}`;
            if (key === "toMark") return r.toMark ? <Badge tone="info">{r.toMark}</Badge> : "—";
            if (key === "missing")
              return r.missing ? <Badge tone="destructive">{r.missing}</Badge> : "—";
            if (key === "_actions")
              return (
                <Link to="/app/grading" search={{ group: r.g.id, cw: r.cw.id }}>
                  <Button size="sm" variant="outline">
                    <ClipboardCheck className="h-3 w-3" />
                    Mark
                  </Button>
                </Link>
              );
            return null;
          }}
        />
      </Section>

      {base.some((g) => g.kind === "module") && (
        <p className="text-xs text-muted-foreground">
          Assessed module components are marked in{" "}
          <Link to="/app/he/assessment" className="text-primary hover:underline">
            Assessment &amp; Boards
          </Link>
          .
        </p>
      )}

      {add.open && <SetWorkDialog d={d} groups={groups} onClose={add.onClose} />}
    </div>
  );
}

function AdminByYear({ d, groups }: { d: LearningData; groups: TeachingGroup[] }) {
  const rows = Array.from(new Set(groups.map((g) => g.level))).map((level) => {
    const gs = groups.filter((g) => g.level === level);
    const items = d.coursework.filter((c) => gs.some((g) => g.id === c.groupId));
    const past = items.filter((c) => c.due < DEMO_TODAY);
    let expected = 0;
    let handed = 0;
    for (const c of past) {
      const g = gs.find((x) => x.id === c.groupId)!;
      expected += g.studentIds.length;
      handed += g.studentIds.filter((sid) => {
        const s = d.subFor(c.id, sid);
        return s && s.status !== "Not submitted";
      }).length;
    }
    return {
      level,
      groups: gs.length,
      items: items.length,
      rate: expected ? Math.round((handed / expected) * 100) : undefined,
      missing: expected - handed,
    };
  });
  return (
    <Section
      title="By year group"
      description="Hand-in rate counts work already past its due date."
    >
      <DataTable
        columns={[
          { key: "level", label: "Year group / level" },
          { key: "groups", label: "Groups" },
          { key: "items", label: "Items set" },
          { key: "rate", label: "Hand-in rate" },
          { key: "missing", label: "Missing" },
        ]}
        rows={rows}
        renderCell={(r: (typeof rows)[number], key) => {
          if (key === "rate")
            return r.rate === undefined ? (
              "—"
            ) : (
              <Badge tone={r.rate >= 90 ? "success" : r.rate >= 75 ? "warning" : "destructive"}>
                {r.rate}%
              </Badge>
            );
          if (key === "missing") return r.missing || "—";
          return String(r[key as keyof typeof r] ?? "");
        }}
      />
    </Section>
  );
}

const KINDS: Coursework["kind"][] = [
  "Homework",
  "Reading",
  "Project",
  "Coursework",
  "Quiz",
  "Practical",
  "Portfolio",
];

function SetWorkDialog({
  d,
  groups,
  onClose,
}: {
  d: LearningData;
  groups: TeachingGroup[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    groupId: groups[0]?.id ?? "",
    title: "",
    kind: "Homework" as Coursework["kind"],
    due: addDays(DEMO_TODAY, 7),
    max: "",
    instructions: "",
  });
  const g = d.groupById(form.groupId);
  const scored = g && g.band !== "primary" && g.band !== "vocational";

  const save = () => {
    if (!g || !form.title.trim()) {
      toast.error("Pick a group and add a title");
      return;
    }
    const max = Number(form.max);
    const cw: Coursework = {
      id: nextId("CW-", "coursework"),
      tenantId: g.tenantId,
      groupId: g.id,
      title: form.title.trim(),
      kind: form.kind,
      set: DEMO_TODAY,
      due: form.due || addDays(DEMO_TODAY, 7),
      maxScore: scored && max > 0 ? max : undefined,
      instructions: form.instructions.trim() || undefined,
      setBy: d.ctx.user?.name ?? "",
      formative: g.kind === "module" || undefined,
    };
    addItem("coursework", cw);
    notify({
      tenantId: g.tenantId,
      channel: "App",
      to: `${g.title} — learners${g.band === "higher-ed" || g.band === "vocational" ? "" : " and families"}`,
      subject: `New: ${cw.title} (due ${shortDate(cw.due)})`,
      source: "Coursework · set",
      relatedId: cw.id,
    });
    toast.success(`Set "${cw.title}" for ${g.title}`);
    onClose();
  };

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Set work"
      description="Learners and families are notified."
      onSubmit={save}
      submitLabel="Set work"
    >
      <Field label="Group" required>
        <Select
          value={form.groupId}
          onChange={(e) => setForm({ ...form, groupId: e.target.value })}
          options={groups.map((x) => ({ value: x.id, label: `${x.title} · ${x.level}` }))}
        />
      </Field>
      <Field label="Type">
        <Select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value as Coursework["kind"] })}
          options={KINDS.map((k) => ({ value: k, label: k }))}
        />
      </Field>
      <Field label="Title" required className="sm:col-span-2">
        <TextInput
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder={
            g?.band === "primary"
              ? "e.g. Spellings — words ending -ly"
              : "e.g. Electricity problem set"
          }
          autoFocus
        />
      </Field>
      <Field label="Due">
        <TextInput
          type="date"
          value={form.due}
          onChange={(e) => setForm({ ...form, due: e.target.value })}
        />
      </Field>
      {scored ? (
        <Field label="Marked out of" hint="Leave blank for feedback only">
          <NumberInput
            value={form.max}
            onChange={(e) => setForm({ ...form, max: e.target.value })}
          />
        </Field>
      ) : (
        <div className="text-xs text-muted-foreground self-end pb-2">
          {g?.band === "vocational"
            ? "Marked Satisfactory / Not yet satisfactory."
            : "Marked with a descriptor and comment."}
        </div>
      )}
      <Field label="Instructions" className="sm:col-span-2">
        <TextArea
          rows={3}
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
        />
      </Field>
    </FormDialog>
  );
}
