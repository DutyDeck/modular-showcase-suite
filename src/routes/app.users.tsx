import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, DataTable, Badge } from "@/components/ui-kit";
import { platformUsers } from "@/lib/mockData";
import { ShieldCheck, Plus } from "lucide-react";

export const Route = createFileRoute("/app/users")({
  head: () => ({ meta: [{ title: "Users & Roles — GlobalEdu" }] }),
  component: UsersPage,
});

function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity & Access Management"
        subtitle="RBAC + ABAC · SSO · Microsoft Entra ID · MFA across the platform."
        actions={<button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Invite User</button>}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {["Google SSO", "Microsoft Entra ID", "Apple Sign-in", "SAML / OIDC"].map(p => (
          <div key={p} className="p-4 rounded-lg border bg-card flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success" />
            <div>
              <div className="text-sm font-medium">{p}</div>
              <div className="text-[10px] text-success">● Enabled</div>
            </div>
          </div>
        ))}
      </div>
      <Section title="Platform Users">
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            { key: "lastLogin", label: "Last Login" },
            { key: "mfa", label: "MFA" },
          ]}
          rows={platformUsers}
          renderCell={(row, key) => {
            if (key === "mfa") return <Badge tone={row.mfa ? "success" : "warning"}>{row.mfa ? "Enabled" : "Off"}</Badge>;
            if (key === "role") return <Badge tone="default">{row.role}</Badge>;
            return String(row[key]);
          }}
        />
      </Section>
    </div>
  );
}
