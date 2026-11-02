import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Sprout } from "lucide-react";
import { PageHeader, Section, Badge, MiniBars, DataTable, Select } from "@/components/ui-kit";
import { grades } from "@/lib/mockData";
import { useCollection } from "@/lib/store";
import { useTenantContext } from "@/lib/packs/registry";
import type { Learner } from "@/lib/packs/foundationData";
import { moduleOutcome, qualProgress } from "@/lib/packs/heData";
import type { TeachingGroup } from "@/lib/packs/sis/learning";
import {
  REPORT_TERM,
  cbseGrade,
  earlyAreasFor,
  type ProgressReport,
} from "@/lib/packs/sis/coursework";
import { useHeData } from "@/components/packs/HeDash";
import {
  GpaPanel,
  GradeChip,
  moduleResults,
  releaseNote,
  useResults,
  visibleMarks,
} from "@/components/packs/ResultsUI";
import {
  KidPicker,
  bandOf,
  resultText,
  shortDate,
  useLearning,
  type LearningData,
} from "@/components/packs/CourseworkUI";

export const Route = createFileRoute("/app/grades")({
  head: () => ({ meta: [{ title: "Grades — 1StudentID" }] }),
  component: GradesRoute,
});

function GradesRoute() {
  const ctx = useTenantContext();
  if (ctx.profile?.experience === "segment") return <PackGrades />;
  return <GradesPage />;
}

function GradesPage() {
  const avg = (grades.reduce((a, g) => a + g.final, 0) / grades.length).toFixed(1);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Grades & Transcripts"
        subtitle="Semester performance across all subjects."
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Overall Average" className="lg:col-span-1">
          <div className="text-center py-4">
            <div className="text-6xl font-bold text-gradient">{avg}</div>
            <div className="text-xs text-muted-foreground mt-2">Final exam average</div>
            <Badge tone="success">A — Excellent</Badge>
          </div>
        </Section>
        <Section title="Final Scores" className="lg:col-span-2">
          <MiniBars data={grades.map((g) => ({ label: g.course.split(" ")[0], value: g.final }))} />
        </Section>
      </div>
      <Section title="Subject Breakdown">
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">Course</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Mid-Term</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Final</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.course} className="border-b last:border-0">
                  <td className="px-4 sm:px-5 py-3 font-medium">{g.course}</td>
                  <td className="px-4 sm:px-5 py-3">{g.mid}</td>
                  <td className="px-4 sm:px-5 py-3">{g.final}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <Badge tone={g.grade.includes("+") ? "success" : "default"}>{g.grade}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

/* ══ Pack tenants ═══════════════════════════════════════════════════════════ */

function PackGrades() {
  const d = useLearning();
  const role = d.ctx.user?.role;
  if (role === "student" || role === "parent") return <FamilyGrades d={d} />;
  return <StaffGrades d={d} />;
}

const DESCRIPTOR_TONE: Record<string, "success" | "info" | "warning"> = {
  "Greater depth": "success",
  Exceeding: "success",
  Expected: "info",
  "Working towards": "warning",
  Emerging: "warning",
};

/* ── Student / parent / family-used account ─────────────────────────────── */

function FamilyGrades({ d }: { d: LearningData }) {
  const [kidId, setKidId] = useState(d.kids[0]?.id ?? "");
  const kid = d.kids.find((k) => k.id === kidId) ?? d.kids[0];
  if (!kid)
    return (
      <div>
        <PageHeader title="Progress & grades" />
        <Section>
          <p className="text-sm text-muted-foreground">No learner is linked to this account.</p>
        </Section>
      </div>
    );
  const band = bandOf(kid);
  const title =
    band === "early"
      ? "Learning journal"
      : band === "higher-ed"
        ? "Module results"
        : band === "vocational"
          ? "Unit competency"
          : "Progress report";
  return (
    <div className="space-y-6">
      <div>
        <PageHeader title={title} subtitle={`${kid.name} · ${kid.level} · ${d.ctx.tenantName}`} />
        <KidPicker kids={d.kids} value={kid.id} onChange={setKidId} />
      </div>
      {band === "early" ? (
        <LearningJournal d={d} kid={kid} />
      ) : band === "higher-ed" ? (
        <HeResults kid={kid} />
      ) : band === "vocational" ? (
        <Competency d={d} kid={kid} />
      ) : (
        <SchoolReport d={d} kid={kid} />
      )}
    </div>
  );
}

function LearningJournal({ d, kid }: { d: LearningData; kid: Learner }) {
  const mine = d.reports.filter((r) => r.studentId === kid.id && r.term === REPORT_TERM && r.area);
  const areas = earlyAreasFor(kid.level);
  const rows = areas
    .map((a) => mine.find((r) => r.area === a))
    .filter((r): r is ProgressReport => !!r);
  return (
    <Section
      title={REPORT_TERM}
      description={`${mine[0]?.scale ?? "Early learning goals"} · Emerging / Expected / Exceeding`}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No observations shared yet this term.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
              <Sprout className="h-4 w-4 mt-0.5 text-success shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{r.area}</span>
                  <Badge tone={DESCRIPTOR_TONE[r.value] ?? "info"}>{r.value}</Badge>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Shared by {rows[0].teacher}.</p>
        </div>
      )}
    </Section>
  );
}

function ReportValue({ r }: { r: ProgressReport }) {
  if (r.scheme === "descriptor" || r.scheme === "competency")
    return <Badge tone={DESCRIPTOR_TONE[r.value] ?? "info"}>{r.value}</Badge>;
  if (r.scheme === "percent")
    return (
      <div>
        <span className="font-semibold">{r.value}</span>
        {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
      </div>
    );
  return <span className="font-semibold">{r.value}</span>;
}

function SchoolReport({ d, kid }: { d: LearningData; kid: Learner }) {
  const rows = d.reports
    .filter((r) => r.studentId === kid.id && r.term === REPORT_TERM && !r.area)
    .map((r) => ({ r, g: d.groupById(r.groupId) }))
    .sort((a, b) => (a.g?.title ?? "").localeCompare(b.g?.title ?? ""));
  const scales = Array.from(new Set(rows.map((x) => x.r.scale).filter(Boolean)));
  const graded = rows.some((x) => x.r.scheme === "grade");
  const recent = d.submissions
    .filter((s) => s.studentId === kid.id && s.status === "Marked")
    .map((s) => ({ s, cw: d.coursework.find((c) => c.id === s.courseworkId) }))
    .filter((x) => x.cw)
    .sort((a, b) => (b.s.markedAt ?? "").localeCompare(a.s.markedAt ?? ""))
    .slice(0, 6);

  return (
    <>
      <Section title={REPORT_TERM} description={scales.join(" · ")}>
        <DataTable
          columns={[
            { key: "subject", label: "Subject" },
            { key: "value", label: graded ? "Predicted" : "Progress" },
            ...(graded ? [{ key: "target", label: "Target" }] : []),
            { key: "effort", label: "Effort" },
            { key: "comment", label: "Comment" },
          ]}
          rows={rows}
          emptyText="This term's report isn't ready yet"
          renderCell={(x: (typeof rows)[number], key) => {
            if (key === "subject")
              return (
                <div>
                  <div className="font-medium">{x.g?.subject ?? x.r.groupId}</div>
                  <div className="text-xs text-muted-foreground">{x.r.teacher}</div>
                </div>
              );
            if (key === "value") return <ReportValue r={x.r} />;
            if (key === "target") return x.r.target ?? "—";
            if (key === "effort")
              return x.r.effort ? (
                <Badge
                  tone={
                    x.r.effort === "Excellent"
                      ? "success"
                      : x.r.effort === "Good"
                        ? "info"
                        : "warning"
                  }
                >
                  {x.r.effort}
                </Badge>
              ) : (
                "—"
              );
            if (key === "comment")
              return <span className="text-sm text-muted-foreground">{x.r.comment ?? "—"}</span>;
            return null;
          }}
        />
      </Section>
      {recent.length > 0 && (
        <Section
          title="Recently marked"
          actions={
            <Link to="/app/assignments" className="text-xs text-primary hover:underline">
              All coursework
            </Link>
          }
        >
          <ul className="divide-y text-sm">
            {recent.map(({ s, cw }) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{cw!.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.groupById(cw!.groupId)?.title} · {shortDate(s.markedAt)}
                  </div>
                </div>
                <Badge tone="success">{resultText(cw!, s)}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

/** University: released module results + GPA (reuses the results engine). */
function HeResults({ kid }: { kid: Learner }) {
  const hd = useHeData();
  const res = useResults();
  const marks = visibleMarks(hd, res.batches);
  const prog = hd.programmeById(kid.programmeId);
  const rows = moduleResults(hd, res.scheme, marks, kid.id, prog?.passMark ?? 40);
  const current = hd.regs
    .filter(
      (r) =>
        r.studentId === kid.id && r.status === "Registered" && r.academicYear === hd.academicYear,
    )
    .map((r) => hd.moduleById(r.moduleId))
    .filter((m) => !!m);
  const pending = current.filter((m) => !rows.some((r) => r.mod.id === m!.id));

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Section
        title="Released results"
        className="lg:col-span-2"
        actions={
          <Link
            to="/app/he/transcripts"
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
          >
            Transcript <ExternalLink className="h-3 w-3" />
          </Link>
        }
      >
        <DataTable
          columns={[
            { key: "module", label: "Module" },
            { key: "term", label: "Term" },
            { key: "credits", label: "Credits" },
            { key: "mark", label: "Mark" },
            { key: "grade", label: "Grade" },
          ]}
          rows={rows}
          emptyText="No released results yet"
          renderCell={(r: (typeof rows)[number], key) => {
            if (key === "module")
              return (
                <div>
                  <div className="font-medium">{r.mod.code}</div>
                  <div className="text-xs text-muted-foreground">{r.mod.title}</div>
                </div>
              );
            if (key === "term") return r.term;
            if (key === "credits") return r.mod.credits;
            if (key === "mark")
              return r.outcome.mark !== undefined ? (
                <span>
                  {r.outcome.mark}%
                  {!r.outcome.complete && (
                    <span className="text-xs text-muted-foreground"> · partial</span>
                  )}
                </span>
              ) : (
                "—"
              );
            if (key === "grade") return <GradeChip scheme={res.scheme} band={r.grade} />;
            return null;
          }}
        />
      </Section>
      <div className="space-y-6">
        <Section title="GPA">
          <GpaPanel scheme={res.scheme} rows={rows} />
        </Section>
        {pending.length > 0 && (
          <Section title="This year">
            <ul className="space-y-2 text-sm">
              {pending.map((m) => (
                <li key={m!.id}>
                  <div className="font-medium">
                    {m!.code} {m!.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {releaseNote(hd, res.batches, kid.id, m!.id) ??
                      `Next: ${m!.components.map((c) => `${c.name} ${shortDate(c.due)}`).join(" · ")}`}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

/** College: unit competency (read-only from the qualification records). */
function Competency({ d, kid }: { d: LearningData; kid: Learner }) {
  const units = useCollection("unitAchievements");
  const q = d.qualifications.find((x) => x.id === kid.qualificationId);
  if (!q)
    return (
      <Section>
        <p className="text-sm text-muted-foreground">No qualification on record.</p>
      </Section>
    );
  const p = qualProgress(q, units, kid.id);
  const mine = units.filter((u) => u.studentId === kid.id && u.qualificationId === q.id);
  const rows = q.units.map((u) => ({ u, a: mine.find((m) => m.unitCode === u.code) }));
  return (
    <Section
      title={`${q.code} ${q.title}`}
      description={`${q.awardingBody} · core ${p.coreDone}/${p.coreTotal} · electives ${p.electivesDone}/${p.electivesRequired} · ${p.pct}% complete${p.eligible ? " · eligible for certification" : ""}`}
    >
      <DataTable
        columns={[
          { key: "unit", label: "Unit" },
          { key: "type", label: "Type" },
          { key: "outcome", label: "Outcome" },
          { key: "assessor", label: "Assessor" },
        ]}
        rows={rows}
        renderCell={(r: (typeof rows)[number], key) => {
          if (key === "unit")
            return (
              <div>
                <div className="font-mono text-xs">{r.u.code}</div>
                <div className="text-sm">{r.u.title}</div>
              </div>
            );
          if (key === "type") return r.u.core ? "Core" : "Elective";
          if (key === "outcome")
            return r.a ? (
              <Badge
                tone={
                  r.a.outcome === "Not yet competent"
                    ? "destructive"
                    : r.a.outcome === "In progress"
                      ? "info"
                      : "success"
                }
              >
                {r.a.outcome}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Not started</span>
            );
          if (key === "assessor")
            return r.a ? `${r.a.assessor}${r.a.date ? ` · ${shortDate(r.a.date)}` : ""}` : "—";
          return null;
        }}
      />
    </Section>
  );
}

/* ── Teacher / admin ────────────────────────────────────────────────────── */

function StaffGrades({ d }: { d: LearningData }) {
  const isAdmin = d.ctx.user?.role === "admin";
  const base = isAdmin ? d.groups : d.myGroups;
  const school = base.filter((g) => g.kind === "class");
  const modules = base.filter((g) => g.kind === "module");
  const quals = isAdmin ? base.filter((g) => g.kind === "qualification") : [];
  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Grade distribution" : "My groups' progress"}
        subtitle={`${d.ctx.tenantName} · ${REPORT_TERM}`}
        actions={
          <Link to="/app/grading">
            <span className="text-sm text-primary hover:underline">Enter progress &amp; marks</span>
          </Link>
        }
      />
      {school.length > 0 && <Distribution d={d} groups={school} />}
      {modules.length > 0 && <ModuleOverview groups={modules} />}
      {quals.length > 0 && <QualOverview d={d} groups={quals} />}
      {!school.length && !modules.length && !quals.length && (
        <Section>
          <p className="text-sm text-muted-foreground">No teaching groups here.</p>
        </Section>
      )}
    </div>
  );
}

/** Ordered buckets for a group's reports (best first). */
function buckets(d: LearningData, g: TeachingGroup, reps: ProgressReport[]) {
  const scale = d.scaleFor(g);
  const val = (r: ProgressReport) =>
    r.scheme === "percent" ? cbseGrade(Number(r.value.replace("%", "")) || 0) : r.value;
  const order =
    scale.scheme === "percent"
      ? ["A1", "A2", "B1", "B2", "C1", "C2", "D", "E"]
      : scale.scheme === "descriptor"
        ? [...scale.options].reverse()
        : scale.options;
  const counts = order
    .map((o) => ({ o, n: reps.filter((r) => val(r) === o).length }))
    .filter((x) => x.n > 0);
  let onTarget: number | undefined;
  if (scale.hasTarget) {
    const withT = reps.filter((r) => r.target);
    const idx = (v: string) => scale.options.indexOf(v);
    onTarget = withT.length
      ? Math.round(
          (withT.filter((r) => idx(r.value) <= idx(r.target!)).length / withT.length) * 100,
        )
      : undefined;
  }
  return { scale, counts, onTarget };
}

function Distribution({ d, groups }: { d: LearningData; groups: TeachingGroup[] }) {
  const [level, setLevel] = useState("all");
  const levels = Array.from(new Set(groups.map((g) => g.level)));
  const rows = groups
    .filter((g) => level === "all" || g.level === level)
    .map((g) => {
      const reps = d.reports.filter((r) => r.groupId === g.id && r.term === REPORT_TERM);
      return { g, n: new Set(reps.map((r) => r.studentId)).size, ...buckets(d, g, reps) };
    })
    .sort((a, b) => a.g.level.localeCompare(b.g.level) || a.g.title.localeCompare(b.g.title));
  return (
    <Section
      title="By year group and subject"
      description="Predicted grades, descriptors or marks — in each group's own scheme."
      actions={
        levels.length > 1 ? (
          <Select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            options={[
              { value: "all", label: "All year groups" },
              ...levels.map((l) => ({ value: l, label: l })),
            ]}
          />
        ) : null
      }
    >
      <DataTable
        columns={[
          { key: "level", label: "Year group" },
          { key: "group", label: "Group" },
          { key: "n", label: "Learners" },
          { key: "dist", label: "Distribution" },
          { key: "target", label: "On target" },
        ]}
        rows={rows}
        emptyText="No reports yet"
        renderCell={(r: (typeof rows)[number], key) => {
          if (key === "level") return r.g.level;
          if (key === "group")
            return (
              <div>
                <div className="font-medium">{r.g.band === "early" ? r.g.title : r.g.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {r.g.band === "early" ? r.g.teacher : `${r.g.title} · ${r.g.teacher}`} ·{" "}
                  {r.scale.label}
                </div>
              </div>
            );
          if (key === "n") return r.n;
          if (key === "dist")
            return (
              <div className="flex flex-wrap gap-1">
                {r.counts.map((c) => (
                  <Badge key={c.o} tone={DESCRIPTOR_TONE[c.o] ?? "default"}>
                    {c.o} · {c.n}
                  </Badge>
                ))}
                {!r.counts.length && <span className="text-xs text-muted-foreground">—</span>}
              </div>
            );
          if (key === "target")
            return r.onTarget === undefined ? (
              "—"
            ) : (
              <Badge
                tone={r.onTarget >= 70 ? "success" : r.onTarget >= 50 ? "warning" : "destructive"}
              >
                {r.onTarget}%
              </Badge>
            );
          return null;
        }}
      />
    </Section>
  );
}

/** University modules: results so far (all marks — staff view). */
function ModuleOverview({ groups }: { groups: TeachingGroup[] }) {
  const hd = useHeData();
  const rows = groups
    .map((g) => hd.moduleById(g.id))
    .filter((m) => !!m)
    .map((m) => {
      const students = Array.from(
        new Set(hd.marks.filter((x) => x.moduleId === m!.id).map((x) => x.studentId)),
      );
      const outs = students
        .map((s) => moduleOutcome(m!, hd.marks, s, 40))
        .filter((o) => o.complete && o.mark !== undefined);
      const avg = outs.length
        ? Math.round(outs.reduce((a, o) => a + o.mark!, 0) / outs.length)
        : undefined;
      return {
        m: m!,
        registered: groups.find((g) => g.id === m!.id)?.studentIds.length ?? 0,
        complete: outs.length,
        avg,
        pass: outs.length
          ? Math.round((outs.filter((o) => o.passed).length / outs.length) * 100)
          : undefined,
      };
    });
  return (
    <Section
      title="Module results"
      description="All attempts on record. Marks reach students when the batch is released."
      actions={
        <Link
          to="/app/he/assessment"
          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
        >
          Assessment &amp; Boards <ExternalLink className="h-3 w-3" />
        </Link>
      }
    >
      <DataTable
        columns={[
          { key: "module", label: "Module" },
          { key: "registered", label: "Registered now" },
          { key: "complete", label: "Results" },
          { key: "avg", label: "Average" },
          { key: "pass", label: "Pass rate" },
        ]}
        rows={rows}
        renderCell={(r: (typeof rows)[number], key) => {
          if (key === "module")
            return (
              <div>
                <div className="font-medium">{r.m.code}</div>
                <div className="text-xs text-muted-foreground">{r.m.title}</div>
              </div>
            );
          if (key === "avg") return r.avg === undefined ? "—" : `${r.avg}%`;
          if (key === "pass") return r.pass === undefined ? "—" : `${r.pass}%`;
          return String(r[key as "registered" | "complete"] ?? "");
        }}
      />
    </Section>
  );
}

function QualOverview({ d, groups }: { d: LearningData; groups: TeachingGroup[] }) {
  const units = useCollection("unitAchievements");
  const rows = groups
    .map((g) => ({ g, q: d.qualifications.find((q) => q.id === g.id) }))
    .filter((x) => x.q && x.g.studentIds.length)
    .map(({ g, q }) => {
      const ps = g.studentIds.map((s) => qualProgress(q!, units, s));
      return {
        q: q!,
        n: ps.length,
        avg: Math.round(ps.reduce((a, p) => a + p.pct, 0) / ps.length),
        eligible: ps.filter((p) => p.eligible).length,
      };
    });
  return (
    <Section
      title="Unit competency"
      actions={
        <Link
          to="/app/college/qualifications"
          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
        >
          Qualifications <ExternalLink className="h-3 w-3" />
        </Link>
      }
    >
      <DataTable
        columns={[
          { key: "qual", label: "Qualification" },
          { key: "n", label: "Learners" },
          { key: "avg", label: "Average progress" },
          { key: "eligible", label: "Ready to certify" },
        ]}
        rows={rows}
        renderCell={(r: (typeof rows)[number], key) => {
          if (key === "qual")
            return (
              <div>
                <div className="font-medium">{r.q.title}</div>
                <div className="text-xs text-muted-foreground">
                  {r.q.code} · {r.q.level}
                </div>
              </div>
            );
          if (key === "avg") return `${r.avg}%`;
          if (key === "eligible") return r.eligible || "—";
          return String(r.n);
        }}
      />
    </Section>
  );
}
