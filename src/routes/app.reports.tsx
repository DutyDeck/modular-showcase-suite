import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatCard, Button } from "@/components/ui-kit";
import { AreaTrend, BarTrend, Donut } from "@/components/Charts";
import { revenueTrend, attendanceTrend } from "@/lib/mockData";
import { useCollection } from "@/lib/store";
import { usePrefs } from "@/lib/prefs";
import { Download, FileBarChart, TrendingUp, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import { money } from "@/lib/packs/regions";
import {
  admissionsFunnel,
  courseLabel,
  groupAttendance,
  learnerAttendance,
  learnerCoursework,
  learnerFees,
  moduleResults,
  pctOf,
  resultSummary,
  resultsDistribution,
  staffCompliance,
  toCsv,
  usePackInsightsData,
  type PackData,
} from "@/lib/packs/sis/insights";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import { Badge } from "@/components/ui-kit";
import { useMemo } from "react";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports & BI — 1StudentID" }] }),
  component: ReportsRoute,
});

/** Pack tenants get a report of their own institution; classic stays as-is. */
function ReportsRoute() {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  return isPackTenantUser(user, profiles) ? <PackReports /> : <ReportsPage />;
}

function ReportsPage() {
  const { formatMoney } = usePrefs();
  const tenants = useCollection("tenants");
  const leads = useCollection("leads");
  const students = useCollection("students");

  const planMix = ["Enterprise", "Growth", "Starter", "Trial"]
    .map((p) => ({
      name: p,
      value:
        p === "Trial"
          ? tenants.filter((t) => t.status === "Trial").length
          : tenants.filter((t) => t.plan === p && t.status !== "Trial").length,
    }))
    .filter((d) => d.value > 0);

  const funnel = ["New", "Contacted", "Qualified", "Demo Booked", "Closed Won"].map((s) => ({
    stage: s,
    leads: leads.filter((l) => l.stage === s).length,
  }));

  const riskMix = (["low", "medium", "high"] as const).map((r) => ({
    name: r === "low" ? "On track" : r === "medium" ? "Watch" : "At risk",
    value: students.filter((s) => s.risk === r).length,
    color:
      r === "low" ? "var(--success)" : r === "medium" ? "var(--warning)" : "var(--destructive)",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting & Business Intelligence"
        subtitle="Academic, financial and operational dashboards."
        actions={
          <Button variant="outline" onClick={() => toast.success("Generating PDF export…")}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Revenue YTD"
          value={formatMoney(486000)}
          icon={<DollarSign className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Active Users"
          value="14,238"
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Pass Rate"
          value="89%"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="NPS Score"
          value="62"
          icon={<FileBarChart className="h-5 w-5" />}
          accent="warning"
        />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Section title="Revenue (6 months)" description="MRR in $K, USD basis">
          <AreaTrend
            data={revenueTrend.map((r) => ({ m: r.m, v: r.v }))}
            xKey="m"
            yKey="v"
            yFormatter={(v) => `${money(v, "USD")}K`}
          />
        </Section>
        <Section title="Attendance trend" description="Institution-wide weekly average %">
          <AreaTrend
            data={attendanceTrend.map((r) => ({ w: r.week, rate: r.rate }))}
            xKey="w"
            yKey="rate"
            yFormatter={(v) => `${v}%`}
          />
        </Section>
      </div>
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section title="Lead funnel" description="Across all tenants">
          <BarTrend data={funnel} xKey="stage" yKey="leads" />
        </Section>
        <Section title="Tenant plan mix">
          <Donut data={planMix} centerLabel="Tenants" centerValue={String(tenants.length)} />
        </Section>
        <Section title="Student risk distribution">
          <Donut data={riskMix} centerLabel="Students" centerValue={String(students.length)} />
        </Section>
      </div>
      <Section title="Pre-built reports">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            "Academic Performance Report",
            "Tenant MRR Breakdown",
            "Attendance by Institution",
            "Marketing Funnel",
            "Compliance Audit Summary",
            "AI Risk Predictions",
          ].map((r) => (
            <button
              key={r}
              onClick={() => toast.info(`Building "${r}"…`)}
              className="p-4 rounded-lg border bg-card text-left hover:border-primary hover:shadow-soft transition-all"
            >
              <FileBarChart className="h-4 w-4 text-primary mb-2" />
              <div className="text-sm font-medium">{r}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Generate · Schedule · Share
              </div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ── Pack tenants: the institution's own KPI report ──────────────────────── */

const DEMO_DAY = DEMO_TODAY;

function downloadCsv(filename: string, rows: (string | number | undefined)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}`);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

interface LearnerRow {
  l: Learner;
  course: string;
  attendance?: number;
  fees: ReturnType<typeof learnerFees>;
  cwSet: number;
  cwMissing: number;
  result: string;
}

function learnerRows(learners: Learner[], d: PackData): LearnerRow[] {
  return learners.map((l) => {
    const cw = learnerCoursework(l, d);
    return {
      l,
      course: courseLabel(l, d),
      attendance: learnerAttendance(l, d),
      fees: learnerFees(l, d),
      cwSet: cw.set.length,
      cwMissing: cw.missing.length,
      result: resultSummary(l, d),
    };
  });
}

const LEARNER_HEADER = [
  "1StudentID",
  "Name",
  "Course / year",
  "Group",
  "Attendance %",
  "Currency",
  "Billed",
  "Paid",
  "Overdue",
  "Coursework set",
  "Not submitted",
  "Results",
];

const learnerCsv = (rows: LearnerRow[], withFees = true) =>
  rows.map((r) => [
    r.l.id,
    r.l.name,
    r.course,
    r.l.group ?? "",
    r.attendance ?? "",
    withFees ? r.fees.currency : "",
    withFees ? r.fees.billed : "",
    withFees ? r.fees.paid : "",
    withFees ? r.fees.overdue : "",
    r.cwSet,
    r.cwMissing,
    r.result,
  ]);

const pctText = (v?: number) => (v === undefined ? "—" : `${v}%`);

type ReportProps = ReturnType<typeof usePackInsightsData>;

function PackReports() {
  const p = usePackInsightsData();
  if (p.scope.kind === "institution") return <InstitutionReport {...p} />;
  if (p.scope.kind === "teacher") return <TeacherReport {...p} />;
  return <PersonalReport {...p} />;
}

function InstitutionReport({ ctx, data, scope }: ReportProps) {
  const rows = useMemo(() => learnerRows(scope.learners, data), [scope, data]);

  const byCourse = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.course, (m.get(r.course) ?? 0) + 1);
    return [...m]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [rows]);

  const attendance = useMemo(() => {
    const ids = new Set(scope.learners.map((l) => l.id));
    const marks = data.registerMarks.filter((m) => ids.has(m.studentId));
    const forms = [...new Set(scope.learners.map((l) => l.group).filter(Boolean))] as string[];
    const byGroup = forms
      .map((g) => {
        const gIds = new Set(scope.learners.filter((l) => l.group === g).map((l) => l.id));
        const gm = marks.filter((m) => gIds.has(m.studentId));
        return { group: g, learners: gIds.size, pct: pctOf(gm, data) };
      })
      .sort((a, b) => a.group.localeCompare(b.group, undefined, { numeric: true }));
    return { overall: pctOf(marks, data), byGroup };
  }, [scope, data]);

  const currency = rows.find((r) => r.fees.billed)?.fees.currency ?? ctx.currency;
  const fees = rows.reduce(
    (s, r) => ({
      billed: s.billed + r.fees.billed,
      paid: s.paid + r.fees.paid,
      outstanding: s.outstanding + r.fees.outstanding,
      overdue: s.overdue + r.fees.overdue,
    }),
    { billed: 0, paid: 0, outstanding: 0, overdue: 0 },
  );
  const collection = fees.billed ? Math.round((fees.paid / fees.billed) * 100) : 0;
  const funnel = admissionsFunnel(data);
  const staff = staffCompliance(data);
  const compliant = staff.filter((s) => s.status === "Compliant").length;
  const results = resultsDistribution(scope.learners, data);

  const exportKpis = () =>
    downloadCsv(`${slug(ctx.tenantName)}-kpis-${DEMO_DAY}.csv`, [
      ["Section", "Metric", "Value"],
      ["Learners", "On roll", scope.learners.length],
      ...byCourse.map((c) => ["Learners", c.name, c.value]),
      ["Attendance", "Overall %", attendance.overall ?? ""],
      ...attendance.byGroup.map((g) => ["Attendance", g.group, g.pct ?? ""]),
      ["Fees", `Billed (${currency})`, fees.billed],
      ["Fees", `Paid (${currency})`, fees.paid],
      ["Fees", `Outstanding (${currency})`, fees.outstanding],
      ["Fees", `Overdue (${currency})`, fees.overdue],
      ["Fees", "Collection %", collection],
      ...funnel.stages.map((s) => ["Admissions", s.stage, s.count]),
      ["Admissions", "Conversion %", funnel.conversionPct],
      ...results.flatMap((c) => c.data.map((x) => [`Results — ${c.title}`, x.name, x.value])),
      ["Staff", "Compliant", `${compliant} of ${staff.length}`],
      ...staff.map((s) => ["Staff", s.name, `${s.status}${s.note ? ` — ${s.note}` : ""}`]),
    ]);
  const exportLearners = () =>
    downloadCsv(`${slug(ctx.tenantName)}-learners-${DEMO_DAY}.csv`, [
      LEARNER_HEADER,
      ...learnerCsv(rows),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={`${ctx.tenantName} · term to date, from live records.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportKpis}>
              <Download className="h-4 w-4" />
              KPIs CSV
            </Button>
            <Button variant="outline" onClick={exportLearners}>
              <Download className="h-4 w-4" />
              Learners CSV
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Learners on roll"
          value={scope.learners.length}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Attendance"
          value={pctText(attendance.overall)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Fees collected"
          value={`${collection}%`}
          hint={`${money(fees.paid, currency)} of ${money(fees.billed, currency)}`}
          icon={<DollarSign className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Admissions conversion"
          value={funnel.total ? `${funnel.conversionPct}%` : "—"}
          hint={`${funnel.converted} of ${funnel.applied} applicants`}
          icon={<FileBarChart className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Staff compliant"
          value={staff.length ? `${compliant}/${staff.length}` : "—"}
          hint="Vetting checks in date"
          icon={<FileBarChart className="h-5 w-5" />}
          accent={compliant === staff.length ? "success" : "destructive"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Section title={ctx.type === "school" ? "Learners by year group" : "Learners by programme"}>
          <BarTrend data={byCourse} xKey="name" yKey="value" />
        </Section>
        <Section
          title="Attendance by group"
          description="Present or late, out of possible sessions"
        >
          <div className="divide-y text-sm">
            {attendance.byGroup.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">No registers yet.</div>
            )}
            {attendance.byGroup.map((g) => (
              <div key={g.group} className="py-2 flex items-center gap-3">
                <span className="w-40 truncate">{g.group}</span>
                <span className="text-xs text-muted-foreground w-16">{g.learners} learner(s)</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${
                      (g.pct ?? 0) < (ctx.type === "school" ? 90 : 85) ? "bg-warning" : "bg-success"
                    }`}
                    style={{ width: `${g.pct ?? 0}%` }}
                  />
                </div>
                <span className="w-14 text-right font-medium">{pctText(g.pct)}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section title="Fee collection" description={`In ${currency}`}>
          <Donut
            data={[
              { name: "Paid", value: fees.paid, color: "var(--success)" },
              {
                name: "Due, not overdue",
                value: Math.max(0, fees.outstanding - fees.overdue),
                color: "var(--info)",
              },
              { name: "Overdue", value: fees.overdue, color: "var(--destructive)" },
            ]}
            centerLabel="Collected"
            centerValue={`${collection}%`}
          />
          <div className="text-xs text-muted-foreground text-center">
            Overdue {money(fees.overdue, currency)}
          </div>
        </Section>
        <Section
          title="Admissions funnel"
          description={`${funnel.waitlist} waitlisted · ${funnel.lost} declined or withdrawn`}
        >
          {funnel.total ? (
            <BarTrend
              data={funnel.stages.map((s) => ({ stage: s.stage, count: s.count }))}
              xKey="stage"
              yKey="count"
            />
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No applications yet.
            </div>
          )}
        </Section>
        {results.length ? (
          <Section title={`Results — ${results[0].title}`}>
            <Donut
              data={results[0].data}
              centerLabel="Results"
              centerValue={String(results[0].data.reduce((s, x) => s + x.value, 0))}
            />
          </Section>
        ) : (
          <Section title="Results">
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results recorded yet.
            </div>
          </Section>
        )}
      </div>
      {results.length > 1 && (
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
          {results.slice(1).map((c) => (
            <Section key={c.title} title={`Results — ${c.title}`}>
              <Donut
                data={c.data}
                centerLabel="Results"
                centerValue={String(c.data.reduce((s, x) => s + x.value, 0))}
              />
            </Section>
          ))}
        </div>
      )}

      <Section
        title="Staff compliance"
        description="Vetting checks — expired, pending or due in 60 days"
      >
        <div className="divide-y text-sm">
          {staff.length === 0 && (
            <div className="py-6 text-center text-muted-foreground">No vetting records.</div>
          )}
          {staff.map((s) => (
            <div key={s.name} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium w-56 truncate">{s.name}</span>
              <span className="text-xs text-muted-foreground flex-1 min-w-40 truncate">
                {s.note || s.role}
              </span>
              <Badge
                tone={
                  s.status === "Compliant"
                    ? "success"
                    : s.status === "Expired"
                      ? "destructive"
                      : "warning"
                }
              >
                {s.status}
              </Badge>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function TeacherReport({ ctx, data, scope }: ReportProps) {
  const rows = useMemo(() => learnerRows(scope.learners, data), [scope, data]);
  const groups = useMemo(
    () =>
      scope.groups.map((g) => {
        const members = rows.filter((r) => g.studentIds.includes(r.l.id));
        const set = data.coursework.filter((c) => c.groupId === g.id && c.due < DEMO_DAY);
        const expected = set.length * g.studentIds.length;
        const handedIn = set.reduce(
          (s, c) =>
            s +
            data.submissions.filter(
              (x) =>
                x.courseworkId === c.id &&
                g.studentIds.includes(x.studentId) &&
                x.status !== "Not submitted",
            ).length,
          0,
        );
        const marks =
          g.kind === "module"
            ? members.flatMap((m) => moduleResults(m.l, data).filter((r) => r.mod.id === g.id))
            : [];
        return {
          g,
          learners: g.studentIds.length,
          attendance: groupAttendance(g, data),
          submitted: expected ? Math.round((handedIn / expected) * 100) : undefined,
          avg: marks.length
            ? Math.round(marks.reduce((s, r) => s + r.mark, 0) / marks.length)
            : undefined,
        };
      }),
    [scope, rows, data],
  );

  const exportCsv = () =>
    downloadCsv(`${slug(scope.viewer)}-groups-${DEMO_DAY}.csv`, [
      ["Group", "Level", "Learners", "Attendance %", "Coursework submitted %", "Average mark %"],
      ...groups.map((x) => [
        x.g.kind === "class" ? x.g.title : `${x.g.code} ${x.g.title}`,
        x.g.level,
        x.learners,
        x.attendance ?? "",
        x.submitted ?? "",
        x.avg ?? "",
      ]),
      [],
      LEARNER_HEADER,
      ...learnerCsv(rows, false),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={`${ctx.tenantName} · your classes and modules.`}
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Groups"
          value={groups.length}
          icon={<FileBarChart className="h-5 w-5" />}
        />
        <StatCard
          label="Learners"
          value={rows.length}
          icon={<Users className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Below attendance line"
          value={
            rows.filter(
              (r) => r.attendance !== undefined && r.attendance < (ctx.type === "school" ? 90 : 85),
            ).length
          }
          icon={<TrendingUp className="h-5 w-5" />}
          accent="warning"
        />
      </div>
      <Section title="By group">
        <GroupTable rows={groups} />
      </Section>
      <Section title="Learners">
        <LearnerTable rows={rows} showFees={false} />
      </Section>
    </div>
  );
}

function GroupTable({
  rows,
}: {
  rows: {
    g: { id: string; kind: string; code: string; title: string; level: string };
    learners: number;
    attendance?: number;
    submitted?: number;
    avg?: number;
  }[];
}) {
  if (!rows.length)
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No classes or modules assigned to you.
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground text-left">
          <tr className="border-b">
            <th className="py-2 pr-3 font-medium">Group</th>
            <th className="py-2 pr-3 font-medium">Level</th>
            <th className="py-2 pr-3 font-medium text-right">Learners</th>
            <th className="py-2 pr-3 font-medium text-right">Attendance</th>
            <th className="py-2 pr-3 font-medium text-right">Work handed in</th>
            <th className="py-2 font-medium text-right">Avg mark</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((x) => (
            <tr key={x.g.id}>
              <td className="py-2 pr-3 font-medium">
                {x.g.kind === "class" ? x.g.title : `${x.g.code} ${x.g.title}`}
              </td>
              <td className="py-2 pr-3 text-muted-foreground">{x.g.level}</td>
              <td className="py-2 pr-3 text-right">{x.learners}</td>
              <td className="py-2 pr-3 text-right">{pctText(x.attendance)}</td>
              <td className="py-2 pr-3 text-right">{pctText(x.submitted)}</td>
              <td className="py-2 text-right">{pctText(x.avg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LearnerTable({ rows, showFees }: { rows: LearnerRow[]; showFees: boolean }) {
  if (!rows.length)
    return <div className="py-6 text-center text-sm text-muted-foreground">No learners.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground text-left">
          <tr className="border-b">
            <th className="py-2 pr-3 font-medium">Learner</th>
            <th className="py-2 pr-3 font-medium">Course / year</th>
            <th className="py-2 pr-3 font-medium text-right">Attendance</th>
            <th className="py-2 pr-3 font-medium text-right">Not handed in</th>
            {showFees && <th className="py-2 pr-3 font-medium text-right">Overdue</th>}
            <th className="py-2 font-medium">Results</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.l.id}>
              <td className="py-2 pr-3">
                <div className="font-medium">{r.l.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.l.id}
                  {r.l.group ? ` · ${r.l.group}` : ""}
                </div>
              </td>
              <td className="py-2 pr-3 text-muted-foreground">{r.course}</td>
              <td className="py-2 pr-3 text-right">{pctText(r.attendance)}</td>
              <td className="py-2 pr-3 text-right">{r.cwSet ? r.cwMissing : "—"}</td>
              {showFees && (
                <td className="py-2 pr-3 text-right">
                  {r.fees.overdue ? money(r.fees.overdue, r.fees.currency) : "—"}
                </td>
              )}
              <td className="py-2 text-muted-foreground">{r.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PersonalReport({ ctx, data, scope }: ReportProps) {
  const rows = useMemo(() => learnerRows(scope.learners, data), [scope, data]);
  const exportCsv = () =>
    downloadCsv(`my-summary-${DEMO_DAY}.csv`, [LEARNER_HEADER, ...learnerCsv(rows)]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={`${ctx.tenantName} · ${scope.kind === "self" ? "your summary" : "your family's summary"}.`}
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />
      {rows.length === 0 && (
        <Section>
          <div className="py-8 text-center text-sm text-muted-foreground">
            No learner record linked to this account.
          </div>
        </Section>
      )}
      {rows.map((r) => {
        const mods = r.l.programmeId ? moduleResults(r.l, data) : [];
        return (
          <Section
            key={r.l.id}
            title={r.l.name}
            description={`${r.course}${r.l.group ? ` · ${r.l.group}` : ""}`}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Attendance"
                value={pctText(r.attendance)}
                icon={<TrendingUp className="h-5 w-5" />}
                accent="info"
              />
              <StatCard
                label="Fees paid"
                value={money(r.fees.paid, r.fees.currency)}
                hint={`of ${money(r.fees.billed, r.fees.currency)} billed`}
                icon={<DollarSign className="h-5 w-5" />}
                accent="success"
              />
              <StatCard
                label="Overdue"
                value={r.fees.overdue ? money(r.fees.overdue, r.fees.currency) : "None"}
                icon={<DollarSign className="h-5 w-5" />}
                accent={r.fees.overdue ? "destructive" : "success"}
              />
              <StatCard
                label="Results"
                value={r.result}
                hint={
                  r.cwSet
                    ? `${r.cwSet - r.cwMissing} of ${r.cwSet} pieces of work handed in`
                    : undefined
                }
                icon={<FileBarChart className="h-5 w-5" />}
                accent="primary"
              />
            </div>
            {mods.length > 0 && (
              <div className="mt-4 divide-y text-sm">
                {mods.map((m) => (
                  <div key={m.mod.id} className="py-2 flex items-center gap-3">
                    <span className="w-16 font-medium">{m.mod.code}</span>
                    <span className="flex-1 truncate text-muted-foreground">{m.mod.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.year}
                      {m.provisional ? " · provisional" : ""}
                    </span>
                    <Badge tone={m.passed ? "success" : "destructive"}>{m.mark}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
        );
      })}
    </div>
  );
}
