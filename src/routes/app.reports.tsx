import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatCard, MiniBars } from "@/components/ui-kit";
import { revenueTrend, attendanceTrend } from "@/lib/mockData";
import { Download, FileBarChart, TrendingUp, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports & BI — GlobalEdu" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting & Business Intelligence"
        subtitle="Academic, financial and operational dashboards."
        actions={<button className="h-9 px-3 rounded-md border text-sm flex items-center gap-2 hover:bg-muted"><Download className="h-4 w-4" />Export PDF</button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue YTD" value="$486K" icon={<DollarSign className="h-5 w-5" />} accent="success" />
        <StatCard label="Active Users" value="14,238" icon={<Users className="h-5 w-5" />} accent="primary" />
        <StatCard label="Pass Rate" value="89%" icon={<TrendingUp className="h-5 w-5" />} accent="info" />
        <StatCard label="NPS Score" value="62" icon={<FileBarChart className="h-5 w-5" />} accent="warning" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Revenue (6 months)"><MiniBars data={revenueTrend.map(r => ({ label: r.m, value: r.v }))} /></Section>
        <Section title="Attendance Trend"><MiniBars data={attendanceTrend.map(r => ({ label: r.week, value: r.rate }))} /></Section>
      </div>
      <Section title="Pre-built Reports">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            "Academic Performance Report",
            "Tenant MRR Breakdown",
            "Attendance by Institution",
            "Marketing Funnel",
            "Compliance Audit Summary",
            "AI Risk Predictions",
          ].map((r) => (
            <button key={r} className="p-4 rounded-lg border bg-card text-left hover:border-primary hover:shadow-soft transition-all">
              <FileBarChart className="h-4 w-4 text-primary mb-2" />
              <div className="text-sm font-medium">{r}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Generate · Schedule · Share</div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
