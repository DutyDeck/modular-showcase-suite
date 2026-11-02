import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Section, Badge, Select } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import { PACKS, PACK_BY_ID, setPackEnabled } from "@/lib/packs/registry";
import { REGIONS, INSTITUTION_TYPE_LABEL } from "@/lib/packs/regions";
import { MODULE_BY_ID } from "@/lib/modules";
import { LucideIcon } from "@/components/packs/PackUI";
import { cn } from "@/lib/utils";
import { Boxes, Building2, Check, Lock, Sparkles } from "lucide-react";

/**
 * Institution packs per tenant. The global admin activates packs (they're
 * entitlements); an institute admin sees what's on and can request more.
 * Activating a pack also switches on the packs and modules it depends on.
 */
export function PacksPanel() {
  const { user } = useAuth();
  const tenants = useCollection("tenants");
  const profiles = useCollection("tenantProfiles");
  const isGlobal = user?.role === "admin" && user.adminScope === "global";
  const [picked, setPicked] = useState<string>("T-006");
  const tenantId = isGlobal ? picked : (user?.institutionId ?? "");
  const tenant = tenants.find((t) => t.id === tenantId);
  const profile = profiles.find((p) => p.tenantId === tenantId);
  const region = REGIONS[profile?.region ?? "GLOBAL"];

  const options = useMemo(
    () =>
      tenants.map((t) => {
        const p = profiles.find((x) => x.tenantId === t.id);
        const packs = p?.packs.length
          ? ` · ${p.packs.map((id) => PACK_BY_ID[id].short).join(", ")}`
          : "";
        return { value: t.id, label: `${t.name}${packs}` };
      }),
    [tenants, profiles],
  );

  if (!profile || !tenant) return null;

  const toggle = (id: (typeof PACKS)[number]["id"], on: boolean) => {
    const def = PACK_BY_ID[id];
    if (!on && id === "higher-ed" && profile.packs.includes("college")) {
      toast.message("College add-on layers on Higher Education — both switched off");
    }
    setPackEnabled(profiles, tenantId, tenant.name, id, on);
    if (on) {
      const extra = [
        ...(def.requiresPacks ?? []).map((p) => PACK_BY_ID[p].short),
        ...def.requiresModules.map((m) => MODULE_BY_ID[m]?.name).filter(Boolean),
      ];
      toast.success(`${def.name} activated for ${tenant.name}`, {
        description: extra.length ? `Also ensured: ${extra.join(", ")}` : undefined,
      });
    } else {
      toast.success(`${def.name} switched off for ${tenant.name}`);
    }
  };

  return (
    <Section
      title={
        <span className="inline-flex items-center gap-2">
          <Boxes className="h-4 w-4 text-primary" /> Institution packs
        </span>
      }
      description={
        isGlobal
          ? "Packs layer institution-specific screens, vocabulary and workflows on the core platform. Activate per tenant — menus and routes update immediately."
          : `Packs active for ${tenant.name}. Packs are entitlements managed by 1StudentID — request one to add it.`
      }
      actions={
        isGlobal ? (
          <Select value={picked} onChange={(e) => setPicked(e.target.value)} options={options} />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-muted/40 text-muted-foreground">
            <Lock className="h-3 w-3" />
            {tenant.name}
          </span>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          {INSTITUTION_TYPE_LABEL[profile.type]}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
          {region.flag} {region.name} · {region.currency}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
          {profile.experience === "segment"
            ? "Segment experience (lean core + packs)"
            : "Classic experience"}
        </span>
        {!isGlobal && (
          <Link to="/app/institution" className="text-primary hover:underline ml-auto">
            Institution profile →
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {PACKS.map((p) => {
          const on = profile.packs.includes(p.id);
          const blockedBy = p.requiresPacks?.filter((r) => !profile.packs.includes(r)) ?? [];
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                on ? "bg-card ring-1 ring-primary/20" : "bg-muted/20 border-dashed",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg bg-gradient-to-br text-white flex items-center justify-center shrink-0",
                    p.tone,
                    !on && "opacity-60",
                  )}
                >
                  <LucideIcon name={p.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-sm">{p.name}</div>
                    {on && <Badge tone="success">Active</Badge>}
                    {p.requiresPacks && (
                      <Badge tone="muted">
                        Needs {p.requiresPacks.map((r) => PACK_BY_ID[r].short).join(", ")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{p.description}</p>
                </div>
                {isGlobal ? (
                  <Switch
                    checked={on}
                    onCheckedChange={(v) => toggle(p.id, v)}
                    aria-label={`Toggle ${p.name}`}
                  />
                ) : on ? (
                  <Check className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <button
                    onClick={() =>
                      toast.success(`Request sent to 1StudentID for ${p.name}`, {
                        description: "Your account manager will confirm pricing and activation.",
                      })
                    }
                    className="text-xs px-2.5 py-1 rounded-md border hover:bg-muted shrink-0"
                  >
                    Request
                  </button>
                )}
              </div>
              <ul className="mt-3 grid gap-1 text-[11px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-1.5 text-muted-foreground">
                    <Sparkles className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-[10px] text-muted-foreground">
                Uses modules: {p.requiresModules.map((m) => MODULE_BY_ID[m]?.name ?? m).join(" · ")}
                {blockedBy.length > 0 && !on && (
                  <span className="block mt-0.5">
                    Activating also switches on{" "}
                    {blockedBy.map((b) => PACK_BY_ID[b].short).join(", ")}.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4">
        Three independent dimensions decide what a tenant sees: <b>modules</b> (purchasable
        features), <b>packs</b> (institution type) and <b>region</b> (country defaults). A pack
        never re-implements a module — it depends on it.
      </p>
    </Section>
  );
}
