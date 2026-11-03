import { createFileRoute } from "@tanstack/react-router";
import { money } from "@/lib/packs/regions";
import { useMemo } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Button } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import { ModulesPanel } from "@/components/ModulesPanel";
import { PacksPanel } from "@/components/PacksPanel";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — 1StudentID" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const tenants = useCollection("tenants");

  const isInstituteScoped = user?.adminScope === "institute";
  // The tenant whose settings this page is editing. For institute admins it's
  // always their own; for global admins we fall back to the first demo tenant.
  const scopedTenant = useMemo(() => {
    if (isInstituteScoped) {
      return tenants.find((t) => t.id === user?.institutionId);
    }
    return tenants[0];
  }, [isInstituteScoped, tenants, user?.institutionId]);

  const scopedTenantName = scopedTenant?.name ?? user?.institutionName ?? "Your institute";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle={
          isInstituteScoped
            ? `Packs, modules and plan for ${scopedTenantName}.`
            : "Institution packs, modules and plans for each tenant."
        }
      />

      {user?.role === "admin" && <PacksPanel />}
      {user?.role === "admin" && <ModulesPanel />}

      <Section
        title={isInstituteScoped ? `Plan & limits · ${scopedTenantName}` : "Plan & limits"}
        description={
          scopedTenant
            ? `${scopedTenant.plan} plan · ${scopedTenant.country} · ${scopedTenant.students.toLocaleString()} students on roster.`
            : "Active subscription and usage caps."
        }
        actions={
          isInstituteScoped ? (
            <Button
              variant="outline"
              onClick={() =>
                toast.info("Contact the global admin to change plan", {
                  description: "Plan changes are billed centrally.",
                })
              }
            >
              Request upgrade
            </Button>
          ) : (
            <Button variant="outline">Upgrade plan</Button>
          )
        }
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PlanStat label="Plan" value={scopedTenant?.plan ?? "Enterprise"} tone="primary" />
          <PlanStat
            label="Seats"
            value={
              scopedTenant
                ? `${scopedTenant.students.toLocaleString()} / ${Math.max(
                    2000,
                    Math.ceil((scopedTenant.students * 1.25) / 100) * 100,
                  ).toLocaleString()}`
                : "500 / 2,000"
            }
          />
          <PlanStat label="Storage" value="48 GB / 1 TB" />
          {/* Subscription revenue is the platform owner's metric, not the institute's. */}
          {!isInstituteScoped && (
            <PlanStat label="MRR" value={scopedTenant ? money(scopedTenant.mrr, "USD") : "—"} />
          )}
        </div>
      </Section>
    </div>
  );
}

function PlanStat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "primary" | "muted";
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        tone === "primary" ? "bg-primary/5 border-primary/30" : "bg-card"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
