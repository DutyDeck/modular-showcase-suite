import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, DataTable, Badge } from "@/components/ui-kit";
import { tenants } from "@/lib/mockData";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/app/tenants")({
  head: () => ({ meta: [{ title: "Tenants — GlobalEdu" }] }),
  component: TenantsPage,
});

function TenantsPage() {
  return (
    <div>
      <PageHeader
        title="Multi-Tenant Management"
        subtitle="Institutions, schools, tutors and learning providers using the platform."
        actions={<button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Onboard Tenant</button>}
      />
      <Section>
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Tenant" },
            { key: "country", label: "Country" },
            { key: "students", label: "Students" },
            { key: "plan", label: "Plan" },
            { key: "mrr", label: "MRR" },
            { key: "status", label: "Status" },
          ]}
          rows={tenants}
          renderCell={(row, key) => {
            if (key === "mrr") return <span className="font-semibold">${row.mrr.toLocaleString()}</span>;
            if (key === "plan") {
              const tones: Record<string, any> = { Enterprise: "default", Growth: "info", Starter: "muted" };
              return <Badge tone={tones[row.plan]}>{row.plan}</Badge>;
            }
            if (key === "status") return <Badge tone={row.status === "Active" ? "success" : "warning"}>{row.status}</Badge>;
            return String(row[key]);
          }}
        />
      </Section>
    </div>
  );
}
