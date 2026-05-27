import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatCard, DataTable, Badge } from "@/components/ui-kit";
import { leads } from "@/lib/mockData";
import { TrendingUp, Users, Target, Megaphone } from "lucide-react";

export const Route = createFileRoute("/app/marketing")({
  head: () => ({ meta: [{ title: "Marketing & CRM — GlobalEdu" }] }),
  component: MarketingPage,
});

function MarketingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Marketing & CRM" subtitle="Campaigns, lead pipeline, course marketing and onboarding." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Leads" value={leads.length} icon={<Users className="h-5 w-5" />} accent="primary" />
        <StatCard label="Conversion Rate" value="24%" hint="+3% MoM" icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        <StatCard label="Live Campaigns" value="6" icon={<Megaphone className="h-5 w-5" />} accent="info" />
        <StatCard label="Pipeline Value" value={`$${leads.reduce((a, l) => a + l.value, 0)}`} icon={<Target className="h-5 w-5" />} accent="warning" />
      </div>
      <Section title="Lead Pipeline">
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "source", label: "Source" },
            { key: "interest", label: "Interest" },
            { key: "stage", label: "Stage" },
            { key: "owner", label: "Owner" },
            { key: "value", label: "Est. Value" },
          ]}
          rows={leads}
          renderCell={(row, key) => {
            if (key === "value") return <span className="font-semibold">${row.value}</span>;
            if (key === "stage") {
              const tones: Record<string, any> = { New: "info", Contacted: "muted", Qualified: "warning", "Demo Booked": "default", "Closed Won": "success" };
              return <Badge tone={tones[row.stage] ?? "muted"}>{row.stage}</Badge>;
            }
            return String(row[key]);
          }}
        />
      </Section>
    </div>
  );
}
