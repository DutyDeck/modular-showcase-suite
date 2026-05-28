import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Section, Badge, Select } from "@/components/ui-kit";
import { tenants as seedTenants } from "@/lib/mockData";
import {
  MODULES,
  useEnabledModules,
  toggleModule,
  setEnabledModules,
  resetTenant,
  type ModuleId,
} from "@/lib/modules";
import { Sparkles, Building2, PackageCheck, Package } from "lucide-react";

const PLAN_TONE: Record<string, "default" | "success" | "warning" | "info" | "muted"> = {
  Starter: "muted",
  Growth: "info",
  Enterprise: "default",
};

const PLAN_PRESETS: Record<string, ModuleId[]> = {
  Starter: [
    "core", "students", "courses", "attendance", "calendar",
    "teaching", "family", "messages", "users",
  ],
  Growth: [
    "core", "students", "courses", "attendance", "calendar", "lms",
    "assignments", "grades", "srb", "teaching", "family", "finance",
    "marketplace", "messages", "reports", "users",
  ],
  Enterprise: MODULES.map((m) => m.id),
};

export function ModulesPanel() {
  const [tenantName, setTenantName] = useState<string>(
    seedTenants[0]?.name ?? "Global Coaching Hub",
  );
  const enabled = useEnabledModules(tenantName);

  const tenantOptions = useMemo(
    () => seedTenants.map((t) => ({ value: t.name, label: `${t.name} · ${t.plan}` })),
    [],
  );

  const tenantInfo = seedTenants.find((t) => t.name === tenantName);

  const applyPreset = (plan: keyof typeof PLAN_PRESETS) => {
    setEnabledModules(tenantName, PLAN_PRESETS[plan]);
    toast.success(`Applied ${plan} preset to ${tenantName}`);
  };

  const counts = useMemo(() => {
    const total = MODULES.filter((m) => !m.core).length;
    const on = MODULES.filter((m) => !m.core && enabled.has(m.id)).length;
    return { total, on };
  }, [enabled]);

  return (
    <Section
      title="Modules & Entitlements"
      description="Toggle which modules are available to each tenant. Sidebar and routes update immediately for users in that tenant."
      actions={
        <>
          <Select
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            options={tenantOptions}
          />
          <button
            onClick={() => {
              resetTenant(tenantName);
              toast.success(`Reset ${tenantName} to all modules`);
            }}
            className="text-xs px-2.5 py-1.5 rounded-md border hover:bg-muted"
          >
            Reset
          </button>
        </>
      }
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{tenantName}</div>
            <div className="text-[11px] text-muted-foreground">
              {tenantInfo && (
                <>
                  {tenantInfo.country} · {tenantInfo.students.toLocaleString()} students ·{" "}
                </>
              )}
              <span className="font-medium text-foreground">{counts.on}</span> of{" "}
              {counts.total} optional modules on
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Apply preset:</span>
          {(Object.keys(PLAN_PRESETS) as Array<keyof typeof PLAN_PRESETS>).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className="text-xs px-2.5 py-1 rounded-md border hover:bg-muted"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {MODULES.map((m) => {
          const on = enabled.has(m.id);
          return (
            <div
              key={m.id}
              className={`rounded-lg border p-3 flex items-start gap-3 transition-colors ${
                on ? "bg-card" : "bg-muted/30 border-dashed"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
                  on
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {on ? (
                  <PackageCheck className="h-4 w-4" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  {m.core && <Badge tone="success">Core</Badge>}
                  {m.plan && !m.core && (
                    <Badge tone={PLAN_TONE[m.plan]}>{m.plan}</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {m.description}
                </p>
                {m.dependsOn && m.dependsOn.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Requires: {m.dependsOn.join(", ")}
                  </div>
                )}
              </div>
              <Switch
                checked={on}
                disabled={m.core}
                onCheckedChange={(v) => toggleModule(tenantName, m.id, v)}
                aria-label={`Toggle ${m.name}`}
              />
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4">
        Note: this is a presentation-layer gate suitable for the sales demo. A real
        deployment must return the entitlement set with the user session and enforce
        it server-side as well.
      </p>
    </Section>
  );
}
