import { createFileRoute } from "@tanstack/react-router";
import { displaySymbol, toLedger } from "@/lib/displayCurrency";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Send, Plus, AlarmClock, Wallet, Target } from "lucide-react";
import {
  PageHeader,
  Section,
  DataTable,
  Button,
  Badge,
  FormDialog,
  Field,
  TextInput,
  NumberInput,
  Select,
  StatCard,
} from "@/components/ui-kit";
import { PackContextBar, StatusPill, VerifyNote } from "@/components/packs/PackUI";
import { Avatar } from "@/components/Avatar";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import { addItem, nextId, updateItem, useCollection } from "@/lib/store";
import { money } from "@/lib/packs/regions";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import { gradeOptionsFor, type ExamEntry } from "@/lib/packs/schoolData";

export const Route = createFileRoute("/app/school/exams")({
  head: () => ({ meta: [{ title: "Exam Entries — 1StudentID" }] }),
  component: ExamEntriesPage,
});

function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - new Date(DEMO_TODAY).getTime()) / 86400000);
}

function ExamEntriesPage() {
  const ctx = useTenantContext();
  const role = ctx.user?.role;
  if (role === "parent" || role === "student") return <FamilyView />;
  if (role === "teacher") return <TeacherView />;
  return <AdminView />;
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

function AdminView() {
  const { tenantId, currency, region } = useTenantContext();
  const entries = useCollection("examEntries").filter((e) => e.tenantId === tenantId);
  const learners = useCollection("learners").filter((l) => l.tenantId === tenantId);
  const [board, setBoard] = useState("all");
  const [series, setSeries] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);

  const boards = Array.from(new Set(entries.map((e) => e.board)));
  const seriesList = Array.from(new Set(entries.map((e) => e.series)));
  const rows = entries
    .filter((e) => board === "all" || e.board === board)
    .filter((e) => series === "all" || e.series === series)
    .filter((e) => status === "all" || e.status === status)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const drafts = entries.filter((e) => e.status === "Draft");
  const entered = entries.filter((e) => e.status === "Entered" || e.status === "Amended");
  const nextDeadline = drafts.map((e) => e.deadline).sort()[0];
  const feesTotal = entered.reduce((s, e) => s + e.fee, 0);
  const student = (id: string) => learners.find((l) => l.id === id);

  const enterSelected = () => {
    const ids = [...selected].filter((id) => entries.find((e) => e.id === id)?.status === "Draft");
    if (!ids.length) {
      toast.error("Select one or more draft entries");
      return;
    }
    // Candidate numbers are per student per centre — reuse if the student already has one.
    const byStudent = new Map<string, string>();
    for (const e of entries) if (e.candidateNumber) byStudent.set(e.studentId, e.candidateNumber);
    let seq = 430 + entries.filter((e) => e.candidateNumber).length;
    for (const id of ids) {
      const e = entries.find((x) => x.id === id)!;
      let cand = byStudent.get(e.studentId);
      if (!cand) {
        cand = String(seq++).padStart(4, "0");
        byStudent.set(e.studentId, cand);
      }
      updateItem("examEntries", (x) => x.id === id, { status: "Entered", candidateNumber: cand });
    }
    setSelected(new Set());
    toast.success(`${ids.length} entr${ids.length === 1 ? "y" : "ies"} submitted to the board`);
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Entries"
        subtitle="External exam entries across boards and series, with predicted grades from teachers."
        actions={
          <>
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> New entry
            </Button>
            <Button onClick={enterSelected} disabled={selected.size === 0}>
              <Send className="h-4 w-4" /> Enter selected ({selected.size})
            </Button>
          </>
        }
      />
      <PackContextBar pack="intl-school" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Entries"
          value={entries.length}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Drafts to submit"
          value={drafts.length}
          hint={nextDeadline ? `Next deadline in ${daysUntil(nextDeadline)} days` : "None"}
          icon={<AlarmClock className="h-4 w-4" />}
          accent="warning"
        />
        <StatCard
          label="Predictions"
          value={`${entries.filter((e) => e.predictedGrade).length}/${entries.length}`}
          hint="entered by teachers"
          icon={<Target className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Board fees committed"
          value={money(feesTotal, currency)}
          hint="Entered + amended"
          icon={<Wallet className="h-4 w-4" />}
          accent="success"
        />
      </div>

      <Section
        title="All entries"
        description="Select drafts and submit them to the awarding body. Candidate numbers are issued on entry."
        actions={
          <>
            <Select
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              options={[
                { value: "all", label: "All boards" },
                ...boards.map((b) => ({ value: b, label: b })),
              ]}
              className="h-8 text-xs w-auto"
            />
            <Select
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              options={[
                { value: "all", label: "All series" },
                ...seriesList.map((b) => ({ value: b, label: b })),
              ]}
              className="h-8 text-xs w-auto"
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={["all", "Draft", "Entered", "Amended", "Withdrawn"].map((s) => ({
                value: s,
                label: s === "all" ? "All statuses" : s,
              }))}
              className="h-8 text-xs w-auto"
            />
          </>
        }
      >
        <DataTable
          columns={[
            { key: "_sel", label: "" },
            { key: "student", label: "Candidate" },
            { key: "subject", label: "Subject" },
            { key: "board", label: "Board · qualification" },
            { key: "series", label: "Series" },
            { key: "predicted", label: "Predicted" },
            { key: "fee", label: "Fee", className: "text-right" },
            { key: "deadline", label: "Deadline" },
            { key: "status", label: "Status" },
            { key: "_actions", label: "" },
          ]}
          rows={rows}
          renderCell={(e: ExamEntry, k) => {
            const s = student(e.studentId);
            switch (k) {
              case "_sel":
                return (
                  <input
                    type="checkbox"
                    aria-label={`Select ${e.id}`}
                    disabled={e.status !== "Draft"}
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                );
              case "student":
                return (
                  <div className="flex items-center gap-2">
                    <Avatar name={s?.name ?? e.studentId} size={28} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s?.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {s?.level} · {s?.group}
                        {e.candidateNumber ? ` · cand. ${e.candidateNumber}` : ""}
                      </div>
                    </div>
                  </div>
                );
              case "subject":
                return (
                  <div>
                    {e.subject}
                    <div className="text-[11px] text-muted-foreground">{e.syllabusCode}</div>
                  </div>
                );
              case "board":
                return (
                  <div className="text-xs">
                    {e.board}
                    <div className="text-muted-foreground">{e.qualification}</div>
                  </div>
                );
              case "predicted":
                return e.predictedGrade ? (
                  <Badge tone="info">{e.predictedGrade}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                );
              case "fee":
                return money(e.fee, currency);
              case "deadline": {
                const d = daysUntil(e.deadline);
                return (
                  <span
                    className={`text-xs ${e.status === "Draft" && d < 21 ? "text-destructive font-medium" : ""}`}
                  >
                    {new Date(e.deadline).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {e.status === "Draft" && (
                      <div className="text-[10px] text-muted-foreground">
                        {d < 0 ? "late entry" : `${d} days`}
                      </div>
                    )}
                  </span>
                );
              }
              case "status":
                return <StatusPill status={e.status} />;
              case "_actions":
                return e.status === "Entered" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      updateItem("examEntries", (x) => x.id === e.id, { status: "Withdrawn" });
                      toast.success(`Withdrawn ${s?.name} — ${e.subject}`);
                    }}
                  >
                    Withdraw
                  </Button>
                ) : null;
              default:
                return null;
            }
          }}
        />
        <VerifyNote>
          Boards available in {region.name}: {region.examBoards.join(", ")}. Entry deadlines and
          fees are illustrative — the live integration takes them from each board's entry window.
        </VerifyNote>
      </Section>

      <NewEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tenantId={tenantId}
        learners={learners}
        boards={region.examBoards}
      />
    </div>
  );
}

function NewEntryDialog({
  open,
  onOpenChange,
  tenantId,
  learners,
  boards,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  learners: { id: string; name: string; level: string }[];
  boards: string[];
}) {
  const { currency } = useTenantContext();
  const [studentId, setStudentId] = useState(learners[0]?.id ?? "");
  const [board, setBoard] = useState(boards[0] ?? "Cambridge International");
  const [qualification, setQualification] = useState("IGCSE");
  const [subject, setSubject] = useState("");
  const [code, setCode] = useState("");
  const [series, setSeries] = useState("May/June 2027");
  const [fee, setFee] = useState("620");
  const [deadline, setDeadline] = useState("2027-02-21");
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New exam entry"
      description="Created as a draft — submit it to the board from the entries table."
      submitLabel="Create draft"
      onSubmit={() => {
        if (!studentId || !subject.trim()) {
          toast.error("Student and subject are required");
          return;
        }
        addItem("examEntries", {
          id: nextId("EX-", "examEntries"),
          tenantId,
          studentId,
          board,
          qualification,
          subject: subject.trim(),
          syllabusCode: code.trim() || "—",
          series,
          status: "Draft",
          fee: toLedger(Number(fee) || 0, currency),
          deadline,
        });
        toast.success("Draft entry created");
        setSubject("");
        setCode("");
        onOpenChange(false);
      }}
    >
      <Field label="Student" required className="sm:col-span-2">
        <Select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          options={learners.map((l) => ({ value: l.id, label: `${l.name} · ${l.level}` }))}
        />
      </Field>
      <Field label="Board">
        <Select
          value={board}
          onChange={(e) => setBoard(e.target.value)}
          options={boards.map((b) => ({ value: b, label: b }))}
        />
      </Field>
      <Field label="Qualification">
        <Select
          value={qualification}
          onChange={(e) => setQualification(e.target.value)}
          options={[
            "IGCSE",
            "International AS Level",
            "International A Level",
            "IB DP",
            "G.C.E. O/L",
            "G.C.E. A/L",
            "CBSE Class X",
          ].map((q) => ({ value: q, label: q }))}
        />
      </Field>
      <Field label="Subject" required>
        <TextInput
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Chemistry"
        />
      </Field>
      <Field label="Syllabus code">
        <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="0620" />
      </Field>
      <Field label="Series">
        <TextInput value={series} onChange={(e) => setSeries(e.target.value)} />
      </Field>
      <Field label={`Fee (${displaySymbol()})`}>
        <NumberInput value={fee} onChange={(e) => setFee(e.target.value)} />
      </Field>
      <Field label="Entry deadline">
        <TextInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

/* ── Teacher: predicted grades for my subject ────────────────────────────── */

function TeacherView() {
  const { tenantId, user } = useTenantContext();
  const subject = user?.meta?.subject ?? "";
  const entries = useCollection("examEntries").filter(
    (e) =>
      e.tenantId === tenantId &&
      e.status !== "Withdrawn" &&
      e.subject.toLowerCase().includes(subject.toLowerCase()),
  );
  const learners = useCollection("learners").filter((l) => l.tenantId === tenantId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const missing = entries.filter((e) => !e.predictedGrade).length;

  const save = (e: ExamEntry) => {
    const g = drafts[e.id];
    if (!g) return;
    updateItem("examEntries", (x) => x.id === e.id, { predictedGrade: g, predictedBy: user?.name });
    toast.success(`Predicted ${g} saved for ${learners.find((l) => l.id === e.studentId)?.name}`);
    setDrafts((d) => {
      const n = { ...d };
      delete n[e.id];
      return n;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Entries & Predictions"
        subtitle={`Predicted grades for ${subject || "your subject"} candidates — used for university applications and entry tiers.`}
      />
      <PackContextBar pack="intl-school" />
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="My candidates"
          value={entries.length}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Predictions to enter"
          value={missing}
          accent={missing ? "warning" : "success"}
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          label="Boards"
          value={new Set(entries.map((e) => e.board)).size}
          hint={Array.from(new Set(entries.map((e) => e.qualification))).join(" · ")}
          accent="info"
        />
      </div>
      <Section
        title={`${subject} candidates`}
        description="Grades follow each qualification's own scale (IGCSE 9–1, A Level A*–E, IB 7–1)."
      >
        <DataTable
          columns={[
            { key: "student", label: "Student" },
            { key: "qual", label: "Qualification" },
            { key: "series", label: "Series" },
            { key: "status", label: "Entry" },
            { key: "pred", label: "Predicted grade" },
          ]}
          rows={entries}
          renderCell={(e: ExamEntry, k) => {
            const s = learners.find((l) => l.id === e.studentId);
            if (k === "student")
              return (
                <div className="flex items-center gap-2">
                  <Avatar name={s?.name ?? ""} size={28} />
                  <div>
                    <div className="font-medium">{s?.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {s?.level} · {s?.group}
                      {s?.supportPlan ? " · access arrangements" : ""}
                    </div>
                  </div>
                </div>
              );
            if (k === "qual")
              return (
                <div className="text-xs">
                  {e.qualification} {e.subject}
                  <div className="text-muted-foreground">
                    {e.board} · {e.syllabusCode}
                  </div>
                </div>
              );
            if (k === "series") return e.series;
            if (k === "status") return <StatusPill status={e.status} />;
            const opts = gradeOptionsFor(e.qualification);
            return (
              <div className="flex items-center gap-2">
                <Select
                  value={drafts[e.id] ?? e.predictedGrade ?? ""}
                  onChange={(ev) => setDrafts((d) => ({ ...d, [e.id]: ev.target.value }))}
                  options={[
                    { value: "", label: "—" },
                    ...opts.map((o) => ({ value: o, label: o })),
                  ]}
                  className="h-8 w-20 text-xs"
                />
                {drafts[e.id] && drafts[e.id] !== e.predictedGrade ? (
                  <Button size="sm" onClick={() => save(e)}>
                    Save
                  </Button>
                ) : e.predictedGrade ? (
                  <span className="text-[11px] text-muted-foreground">
                    by {e.predictedBy === user?.name ? "you" : e.predictedBy}
                  </span>
                ) : (
                  <Badge tone="warning">Needed</Badge>
                )}
              </div>
            );
          }}
        />
      </Section>
    </div>
  );
}

/* ── Parent / student: read-only ─────────────────────────────────────────── */

function FamilyView() {
  const { tenantId, currency } = useTenantContext();
  const kids = useScopedLearners();
  const all = useCollection("examEntries");
  const entries = useMemo(
    () => all.filter((e) => e.tenantId === tenantId && kids.some((k) => k.id === e.studentId)),
    [all, tenantId, kids],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Entries"
        subtitle="External exams your children are entered for, with teachers' predicted grades."
      />
      <PackContextBar pack="intl-school" />
      {kids.map((k) => {
        const mine = entries.filter((e) => e.studentId === k.id);
        return (
          <Section
            key={k.id}
            title={`${k.name} · ${k.level}`}
            description={mine.length ? undefined : "No external exam entries this year."}
          >
            {mine.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {k.level.startsWith("Grade")
                  ? "CBSE board exams are taken in Grade 10 and 12 — nothing to enter yet."
                  : "Entries will appear here once the school drafts them."}
              </p>
            ) : (
              <DataTable
                columns={[
                  { key: "subject", label: "Subject" },
                  { key: "board", label: "Board" },
                  { key: "series", label: "Series" },
                  { key: "predicted", label: "Predicted" },
                  { key: "fee", label: "Fee" },
                  { key: "status", label: "Status" },
                ]}
                rows={mine}
                renderCell={(e: ExamEntry, key) => {
                  if (key === "subject")
                    return (
                      <div>
                        {e.qualification} {e.subject}
                        <div className="text-[11px] text-muted-foreground">{e.syllabusCode}</div>
                      </div>
                    );
                  if (key === "predicted")
                    return e.predictedGrade ? <Badge tone="info">{e.predictedGrade}</Badge> : "—";
                  if (key === "fee") return money(e.fee, currency);
                  if (key === "status")
                    return (
                      <div className="flex items-center gap-1.5">
                        <StatusPill status={e.status} />
                        {e.candidateNumber && (
                          <span className="text-[11px] text-muted-foreground">
                            cand. {e.candidateNumber}
                          </span>
                        )}
                      </div>
                    );
                  return (e as unknown as Record<string, string>)[key];
                }}
              />
            )}
          </Section>
        );
      })}
    </div>
  );
}
