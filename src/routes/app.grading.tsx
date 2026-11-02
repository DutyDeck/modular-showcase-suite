import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section, DataTable, Button, Badge, Select } from "@/components/ui-kit";
import { useCollection, addItem, updateItem, nextId } from "@/lib/store";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Send, Save, ExternalLink } from "lucide-react";
import { useTenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import { logChange, notify } from "@/lib/packs/sis/activity";
import type { TeachingGroup } from "@/lib/packs/sis/learning";
import {
  REPORT_TERM,
  EFFORTS,
  PRIMARY_DESCRIPTORS,
  TASK_OUTCOMES,
  courseworkState,
  earlyAreasFor,
  markingKind,
  type Coursework,
  type ProgressReport,
  type ReportScale,
  type Submission,
} from "@/lib/packs/sis/coursework";
import { Tabs } from "@/components/packs/PackUI";
import {
  StateBadge,
  resultText,
  shortDate,
  useLearning,
  type LearningData,
} from "@/components/packs/CourseworkUI";

interface GradingSearch {
  group?: string;
  cw?: string;
}

export const Route = createFileRoute("/app/grading")({
  head: () => ({ meta: [{ title: "Grading — 1StudentID" }] }),
  validateSearch: (s: Record<string, unknown>): GradingSearch => ({
    group: typeof s.group === "string" ? s.group : undefined,
    cw: typeof s.cw === "string" ? s.cw : undefined,
  }),
  component: GradingRoute,
});

function GradingRoute() {
  const ctx = useTenantContext();
  if (ctx.profile?.experience === "segment") return <PackGrading />;
  return <GradingPage />;
}

function GradingPage() {
  const students = useCollection("students");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [published, setPublished] = useState<Record<string, boolean>>({});

  const publish = (id: string, name: string) => {
    if (!scores[id]) {
      toast.error(`Enter a score for ${name}`);
      return;
    }
    setPublished({ ...published, [id]: true });
    toast.success(`Published ${scores[id]}/100 for ${name}`);
  };

  const publishAll = () => {
    const ready = students.filter((s) => scores[s.id] && !published[s.id]);
    if (ready.length === 0) {
      toast.info("No new scores to publish");
      return;
    }
    const map = { ...published };
    ready.forEach((s) => (map[s.id] = true));
    setPublished(map);
    toast.success(`Published ${ready.length} grades`);
  };

  return (
    <div>
      <PageHeader
        title="Grading Workbench"
        subtitle="Score quizzes, essays and assignments — auto-publishes to students & parents."
        actions={
          <Button onClick={publishAll}>
            <Send className="h-4 w-4" />
            Publish All
          </Button>
        }
      />
      <Section title="Physics Mid-Term · PHY-12 · 42 submissions">
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Student" },
            { key: "grade", label: "Grade" },
            { key: "score", label: "Score" },
            { key: "action", label: "" },
          ]}
          rows={students.map((s) => ({ ...s, score: "", action: "" }))}
          renderCell={(row, key) => {
            if (key === "score")
              return (
                <input
                  value={scores[row.id] ?? ""}
                  onChange={(e) => setScores({ ...scores, [row.id]: e.target.value })}
                  placeholder="—/100"
                  className="h-8 w-20 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  disabled={published[row.id]}
                />
              );
            if (key === "action")
              return published[row.id] ? (
                <span className="text-xs text-success font-medium">● Published</span>
              ) : (
                <button
                  onClick={() => publish(row.id, row.name)}
                  className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
                >
                  Publish
                </button>
              );
            if (key === "name") return <span className="font-medium">{row.name}</span>;
            return String(row[key]);
          }}
        />
      </Section>
    </div>
  );
}

/* ══ Pack tenants ═══════════════════════════════════════════════════════════ */

const inputCls =
  "h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function PackGrading() {
  const d = useLearning();
  const search = Route.useSearch();
  const role = d.ctx.user?.role;
  const isAdmin = role === "admin";
  const groups = isAdmin ? d.groups : d.myGroups;
  const [groupId, setGroupId] = useState(
    groups.find((g) => g.id === search.group)?.id ?? groups[0]?.id ?? "",
  );
  const g = groups.find((x) => x.id === groupId);
  const early = g?.band === "early";
  const canReport = g?.kind === "class";
  const [tab, setTab] = useState<"mark" | "progress">(search.cw || !early ? "mark" : "progress");
  const activeTab = early ? "progress" : canReport ? tab : "mark";

  if (role !== "teacher" && role !== "admin")
    return (
      <div>
        <PageHeader title="Marking" />
        <Section>
          <p className="text-sm text-muted-foreground">
            Marking is for staff. See{" "}
            <Link to="/app/assignments" className="text-primary hover:underline">
              Assignments
            </Link>{" "}
            and{" "}
            <Link to="/app/grades" className="text-primary hover:underline">
              Grades
            </Link>
            .
          </p>
        </Section>
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marking & progress"
        subtitle={
          isAdmin
            ? `${d.ctx.tenantName} · any group`
            : `Your ${groups.length} group${groups.length === 1 ? "" : "s"} · ${REPORT_TERM}`
        }
        actions={
          groups.length ? (
            <Select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              options={groups.map((x) => ({ value: x.id, label: `${x.title} · ${x.level}` }))}
            />
          ) : null
        }
      />
      {!g ? (
        <Section>
          <p className="text-sm text-muted-foreground">You have no teaching groups here.</p>
        </Section>
      ) : (
        <>
          {!early && canReport && (
            <Tabs
              tabs={[
                { id: "mark", label: "Mark work" },
                { id: "progress", label: `Progress reports · ${REPORT_TERM}` },
              ]}
              value={activeTab}
              onChange={setTab}
            />
          )}
          {activeTab === "mark" ? (
            <MarkWork
              key={g.id}
              d={d}
              g={g}
              initialCw={search.group === g.id ? search.cw : undefined}
            />
          ) : (
            <ProgressEntry key={g.id} d={d} g={g} />
          )}
        </>
      )}
    </div>
  );
}

/* ── Marking ─────────────────────────────────────────────────────────────── */

function MarkWork({ d, g, initialCw }: { d: LearningData; g: TeachingGroup; initialCw?: string }) {
  const items = d.coursework
    .filter((c) => c.groupId === g.id)
    .sort((a, b) => b.due.localeCompare(a.due));
  const firstToMark = items.find((c) =>
    g.studentIds.some((sid) => {
      const s = d.subFor(c.id, sid);
      return s?.status === "Submitted" || s?.status === "Late";
    }),
  );
  const [cwId, setCwId] = useState(
    items.find((c) => c.id === initialCw)?.id ?? firstToMark?.id ?? items[0]?.id ?? "",
  );
  const cw = items.find((c) => c.id === cwId);
  const kind = cw ? markingKind(g.band, cw) : "score";
  const students = g.studentIds
    .map((id) => d.learners.find((l) => l.id === id))
    .filter((l): l is Learner => !!l)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      {g.kind === "module" && (
        <Note>
          Practice work only. Assessed components are marked in{" "}
          <Link to="/app/he/assessment" className="text-primary hover:underline">
            Assessment &amp; Boards
          </Link>
          .
        </Note>
      )}
      {g.kind === "qualification" && (
        <Note>
          Workplace tasks are evidence. Sign units off in{" "}
          <Link to="/app/college/qualifications" className="text-primary hover:underline">
            Qualifications
          </Link>
          .
        </Note>
      )}
      <Section
        title={cw ? cw.title : "No work set"}
        description={
          cw
            ? `${cw.kind} · due ${shortDate(cw.due)}${cw.maxScore ? ` · out of ${cw.maxScore}` : ""}${
                kind === "descriptor" ? " · descriptor + comment" : ""
              }`
            : `Set work for ${g.title} from Assignments.`
        }
        actions={
          items.length ? (
            <Select
              value={cwId}
              onChange={(e) => setCwId(e.target.value)}
              options={items.map((c) => ({
                value: c.id,
                label: `${c.title} · ${shortDate(c.due)}`,
              }))}
            />
          ) : (
            <Link to="/app/assignments">
              <Button size="sm" variant="outline">
                Set work <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          )
        }
      >
        {cw && (
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="px-4 py-2 font-medium">Learner</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Handed in</th>
                  <th className="px-4 py-2 font-medium w-40">
                    {kind === "score" ? "Score" : kind === "feedback" ? "Result" : "Outcome"}
                  </th>
                  <th className="px-4 py-2 font-medium">Feedback</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {students.map((l) => (
                  <MarkRow
                    key={`${cw.id}${l.id}`}
                    d={d}
                    g={g}
                    cw={cw}
                    learner={l}
                    sub={d.subFor(cw.id, l.id)}
                    kind={kind}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function MarkRow({
  d,
  g,
  cw,
  learner,
  sub,
  kind,
}: {
  d: LearningData;
  g: TeachingGroup;
  cw: Coursework;
  learner: Learner;
  sub?: Submission;
  kind: ReturnType<typeof markingKind>;
}) {
  const [score, setScore] = useState(sub?.score !== undefined ? String(sub.score) : "");
  const [descriptor, setDescriptor] = useState(sub?.descriptor ?? "");
  const [feedback, setFeedback] = useState(sub?.feedback ?? "");
  const state = courseworkState(cw, sub);
  const options = kind === "outcome" ? TASK_OUTCOMES : PRIMARY_DESCRIPTORS;
  const by = d.ctx.user?.name ?? "";

  const save = () => {
    const patch: Partial<Submission> = {
      status: "Marked",
      feedback: feedback.trim() || undefined,
      markedBy: by,
      markedAt: DEMO_TODAY,
    };
    if (kind === "score") {
      const n = Number(score);
      if (score.trim() === "" || Number.isNaN(n) || n < 0 || n > (cw.maxScore ?? 0)) {
        toast.error(`Enter a score from 0 to ${cw.maxScore}`);
        return;
      }
      patch.score = n;
    } else if (kind === "descriptor" || kind === "outcome") {
      if (!descriptor) {
        toast.error("Choose an outcome");
        return;
      }
      patch.descriptor = descriptor;
    } else if (!patch.feedback) {
      toast.error("Add feedback");
      return;
    }
    const before = resultText(cw, sub);
    let id = sub?.id;
    if (sub) updateItem("submissions", (s) => s.id === sub.id, patch);
    else {
      id = nextId("SUB-", "submissions");
      addItem("submissions", {
        id,
        tenantId: cw.tenantId,
        courseworkId: cw.id,
        studentId: learner.id,
        ...patch,
        status: "Marked",
      });
    }
    const after = resultText(cw, { ...patch, status: "Marked" });
    logChange({
      tenantId: cw.tenantId,
      entity: "submission",
      entityId: id!,
      studentId: learner.id,
      field: `Mark · ${cw.title}`,
      from: before === "—" ? undefined : before,
      to: after,
      by,
    });
    const adult = g.band === "higher-ed" || g.band === "vocational";
    const to = adult ? learner.name : [learner.name, ...(learner.guardians ?? [])].join(", ");
    notify({
      tenantId: cw.tenantId,
      channel: "App",
      to,
      subject: `Marked: ${cw.title}`,
      body: `${after}${patch.feedback ? ` — ${patch.feedback}` : ""}`,
      source: "Coursework · marking",
      relatedId: cw.id,
    });
    toast.success(`${learner.name.split(" ")[0]}: ${after}`);
  };

  return (
    <tr className="border-b last:border-0 align-top">
      <td className="px-4 py-2.5">
        <div className="font-medium">{learner.name}</div>
        <div className="text-xs text-muted-foreground">{learner.id}</div>
      </td>
      <td className="px-4 py-2.5">
        <StateBadge state={state} />
      </td>
      <td className="px-4 py-2.5 text-xs">
        {sub?.submittedAt ? (
          <>
            {shortDate(sub.submittedAt)}
            {sub.late && (
              <span className="ml-1">
                <Badge tone="warning">late</Badge>
              </span>
            )}
            {sub.fileName && (
              <div className="text-muted-foreground truncate max-w-[160px]">{sub.fileName}</div>
            )}
            {sub.submittedBy && <div className="text-muted-foreground">by {sub.submittedBy}</div>}
          </>
        ) : (
          <span className="text-muted-foreground">{cw.kind === "Quiz" ? "In class" : "—"}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {kind === "score" ? (
          <div className="flex items-center gap-1">
            <input
              className={inputCls + " w-16"}
              value={score}
              inputMode="numeric"
              onChange={(e) => setScore(e.target.value)}
              placeholder="—"
            />
            <span className="text-xs text-muted-foreground">/{cw.maxScore}</span>
          </div>
        ) : kind === "feedback" ? (
          <span className="text-xs text-muted-foreground">Feedback only</span>
        ) : (
          <select
            className={inputCls}
            value={descriptor}
            onChange={(e) => setDescriptor(e.target.value)}
          >
            <option value="">Choose…</option>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-2.5">
        <input
          className={inputCls}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={g.band === "primary" ? "A short, encouraging comment" : "Feedback"}
        />
      </td>
      <td className="px-4 py-2.5 text-right">
        <Button size="sm" variant={state === "Marked" ? "outline" : "primary"} onClick={save}>
          <Save className="h-3 w-3" />
          {state === "Marked" ? "Update" : "Mark"}
        </Button>
      </td>
    </tr>
  );
}

/* ── Termly progress reports ─────────────────────────────────────────────── */

function ProgressEntry({ d, g }: { d: LearningData; g: TeachingGroup }) {
  const scale = d.scaleFor(g);
  const students = g.studentIds
    .map((id) => d.learners.find((l) => l.id === id))
    .filter((l): l is Learner => !!l)
    .sort((a, b) => a.name.localeCompare(b.name));
  const early = g.band === "early";
  const [childId, setChildId] = useState(students[0]?.id ?? "");
  const child = students.find((s) => s.id === childId);
  const rows: { key: string; learner: Learner; area?: string }[] = early
    ? child
      ? earlyAreasFor(g.level).map((area) => ({ key: `${child.id}${area}`, learner: child, area }))
      : []
    : students.map((l) => ({ key: l.id, learner: l }));

  return (
    <Section
      title={`${g.title} · ${REPORT_TERM}`}
      description={`${scale.label}${early ? " — per learning area, no grades" : ""}`}
      actions={
        early && students.length ? (
          <Select
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
          />
        ) : null
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No learners in this group.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2 font-medium">{early ? "Learning area" : "Learner"}</th>
                <th className="px-4 py-2 font-medium w-40">
                  {scale.scheme === "grade"
                    ? "Predicted"
                    : scale.scheme === "percent"
                      ? "Mark"
                      : "Progress"}
                </th>
                {scale.hasTarget && <th className="px-4 py-2 font-medium w-28">Target</th>}
                {!early && <th className="px-4 py-2 font-medium w-40">Effort</th>}
                <th className="px-4 py-2 font-medium">Comment</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <ReportRow
                  key={r.key}
                  d={d}
                  g={g}
                  scale={scale}
                  learner={r.learner}
                  area={r.area}
                  report={d.reports.find(
                    (x) =>
                      x.studentId === r.learner.id &&
                      x.groupId === g.id &&
                      x.term === REPORT_TERM &&
                      (r.area ? x.area === r.area : true),
                  )}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function ReportRow({
  d,
  g,
  scale,
  learner,
  area,
  report,
}: {
  d: LearningData;
  g: TeachingGroup;
  scale: ReportScale;
  learner: Learner;
  area?: string;
  report?: ProgressReport;
}) {
  const [value, setValue] = useState(report?.value ?? "");
  const [target, setTarget] = useState(report?.target ?? "");
  const [effort, setEffort] = useState<string>(report?.effort ?? "");
  const [comment, setComment] = useState(report?.comment ?? "");
  const by = d.ctx.user?.name ?? "";
  const dirty =
    value !== (report?.value ?? "") ||
    target !== (report?.target ?? "") ||
    effort !== (report?.effort ?? "") ||
    comment !== (report?.comment ?? "");

  const save = () => {
    let v = value.trim();
    if (scale.scheme === "percent") {
      const n = Number(v.replace("%", ""));
      if (!v || Number.isNaN(n) || n < 0 || n > 100) {
        toast.error("Enter a mark from 0 to 100");
        return;
      }
      v = `${Math.round(n)}%`;
    } else if (!v) {
      toast.error("Choose a value");
      return;
    }
    const patch: Partial<ProgressReport> = {
      value: v,
      target: scale.hasTarget ? target || undefined : undefined,
      effort: (effort || undefined) as ProgressReport["effort"],
      comment: comment.trim() || undefined,
      teacher: by,
      scale: scale.label,
    };
    let id = report?.id;
    if (report) updateItem("progressReports", (x) => x.id === report.id, patch);
    else {
      id = nextId("PR-", "progressReports");
      addItem("progressReports", {
        id,
        tenantId: g.tenantId,
        studentId: learner.id,
        groupId: g.id,
        term: REPORT_TERM,
        scheme: scale.scheme,
        area,
        value: v,
        teacher: by,
        ...patch,
      });
    }
    logChange({
      tenantId: g.tenantId,
      entity: "progressReport",
      entityId: id!,
      studentId: learner.id,
      field: `${REPORT_TERM} · ${area ?? g.title}`,
      from: report?.value,
      to: `${v}${patch.target ? ` (target ${patch.target})` : ""}`,
      by,
    });
    toast.success(`Saved ${learner.name.split(" ")[0]} · ${area ?? g.title}`);
  };

  return (
    <tr className="border-b last:border-0 align-top">
      <td className="px-4 py-2.5">
        <div className="font-medium">{area ?? learner.name}</div>
        {!area && report?.detail && (
          <div className="text-xs text-muted-foreground">{report.detail}</div>
        )}
      </td>
      <td className="px-4 py-2.5">
        {scale.options.length ? (
          <select className={inputCls} value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Choose…</option>
            {scale.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input
            className={inputCls}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 84%"
          />
        )}
      </td>
      {scale.hasTarget && (
        <td className="px-4 py-2.5">
          <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">—</option>
            {scale.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </td>
      )}
      {!area && (
        <td className="px-4 py-2.5">
          <select className={inputCls} value={effort} onChange={(e) => setEffort(e.target.value)}>
            <option value="">—</option>
            {EFFORTS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </td>
      )}
      <td className="px-4 py-2.5">
        <input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} />
      </td>
      <td className="px-4 py-2.5 text-right">
        <Button size="sm" variant={dirty ? "primary" : "outline"} onClick={save} disabled={!dirty}>
          <Save className="h-3 w-3" />
          Save
        </Button>
      </td>
    </tr>
  );
}
