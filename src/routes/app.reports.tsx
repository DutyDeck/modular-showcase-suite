import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatCard, Button } from "@/components/ui-kit";
import { AreaTrend, BarTrend, Donut } from "@/components/Charts";
import { revenueTrend, attendanceTrend } from "@/lib/mockData";
import { useCollection } from "@/lib/store";
import { usePrefs } from "@/lib/prefs";
import { Download, FileBarChart, TrendingUp, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports & BI — 1StudentID" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { formatMoney } = usePrefs();
  const tenants = useCollection("tenants");
  const leads = useCollection("leads");
  const students = useCollection("students");

  const planMix = ["Enterprise", "Growth", "Starter", "Trial"].map((p) => ({
    name: p,
    value:
      p === "Trial"
        ? tenants.filter((t) => t.status === "Trial").length
        : tenants.filter((t) => t.plan === p && t.status !== "Trial").length,
  })).filter((d) => d.value > 0);

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
            yFormatter={(v) => `$${v}K`}
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
