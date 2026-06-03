import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Button,
  Field,
  TextInput,
  Select,
} from "@/components/ui-kit";
import { usePrefs, LOCALE_LABEL, CURRENCY_LABEL, type Locale, type Currency } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import { ModulesPanel } from "@/components/ModulesPanel";
import {
  Building2,
  Palette,
  Globe,
  Shield,
  Plug,
  Bell,
  Check,
  X,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — One Edu" }] }),
  component: SettingsPage,
});

interface BrandingPrefs {
  tenantName: string;
  primaryColor: string;
  domain: string;
}

const STORAGE_KEY_PREFIX = "oneedu.tenant-settings.v1";

/** Each tenant has its own branding bucket in localStorage so an institute
 *  admin editing Royal Vista's branding can't clobber the platform defaults. */
function storageKeyFor(tenantId: string | undefined) {
  return tenantId ? `${STORAGE_KEY_PREFIX}:${tenantId}` : STORAGE_KEY_PREFIX;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "tenant";
}

function defaultsFor(name: string): BrandingPrefs {
  return {
    tenantName: name,
    primaryColor: "#4f46e5",
    domain: `${slugify(name)}.oneedu.app`,
  };
}

function loadBranding(tenantId: string | undefined, name: string): BrandingPrefs {
  const fallback = defaultsFor(name);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(storageKeyFor(tenantId));
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function SettingsPage() {
  const { locale, setLocale, currency, setCurrency, theme, setTheme } = usePrefs();
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

  const scopedTenantName =
    scopedTenant?.name ?? user?.institutionName ?? "Your institute";

  const [branding, setBranding] = useState<BrandingPrefs>(() =>
    loadBranding(scopedTenant?.id, scopedTenantName),
  );

  const saveBranding = () => {
    try {
      localStorage.setItem(storageKeyFor(scopedTenant?.id), JSON.stringify(branding));
    } catch {
      /* ignore */
    }
    toast.success(`Branding saved for ${scopedTenantName}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle={
          isInstituteScoped
            ? `Configuration for ${scopedTenantName}. Cross-tenant settings stay with the global admin.`
            : "Tenant configuration, branding, locale and integrations."
        }
      />

      {isInstituteScoped && (
        <div className="rounded-lg border bg-warning/10 border-warning/30 px-4 py-2.5 text-xs flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-warning-foreground shrink-0" />
          <span>
            You can only edit settings for{" "}
            <span className="font-semibold">{scopedTenantName}</span>. The tenant picker
            and platform-wide configuration are reserved for the global admin.
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section
          title="Branding"
          description="How your institution appears across the platform."
          className="lg:col-span-2"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Institution name" className="sm:col-span-2">
              <TextInput
                value={branding.tenantName}
                onChange={(e) =>
                  setBranding({ ...branding, tenantName: e.target.value })
                }
              />
            </Field>
            <Field label="Custom domain" hint="Subdomain or CNAME you control">
              <TextInput
                value={branding.domain}
                onChange={(e) => setBranding({ ...branding, domain: e.target.value })}
              />
            </Field>
            <Field label="Primary brand colour">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) =>
                    setBranding({ ...branding, primaryColor: e.target.value })
                  }
                  className="h-10 w-14 rounded-md border bg-background cursor-pointer"
                />
                <TextInput
                  value={branding.primaryColor}
                  onChange={(e) =>
                    setBranding({ ...branding, primaryColor: e.target.value })
                  }
                />
              </div>
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setBranding(defaultsFor(scopedTenantName))}
            >
              Reset
            </Button>
            <Button onClick={saveBranding}>
              <Palette className="h-4 w-4" />
              Save branding
            </Button>
          </div>
        </Section>

        <Section title="Workspace" description="Your personal preferences.">
          <div className="space-y-3">
            <Field label="Language">
              <Select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                options={(Object.keys(LOCALE_LABEL) as Locale[]).map((l) => ({
                  value: l,
                  label: LOCALE_LABEL[l],
                }))}
              />
            </Field>
            <Field label="Currency">
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                options={(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => ({
                  value: c,
                  label: CURRENCY_LABEL[c],
                }))}
              />
            </Field>
            <Field label="Theme">
              <Select
                value={theme}
                onChange={(e) => setTheme(e.target.value as "light" | "dark")}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </Field>
          </div>
        </Section>
      </div>

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
            <Button variant="outline" onClick={() => toast.info("Contact the global admin to change plan", { description: "Plan changes are billed centrally." })}>
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
                ? `${scopedTenant.students.toLocaleString()} / ${(
                    Math.max(2000, Math.ceil(scopedTenant.students * 1.25 / 100) * 100)
                  ).toLocaleString()}`
                : "500 / 2,000"
            }
          />
          <PlanStat label="Storage" value="48 GB / 1 TB" />
          <PlanStat
            label="MRR"
            value={scopedTenant ? `$${scopedTenant.mrr.toLocaleString()}` : "—"}
          />
        </div>
      </Section>

      <Section title="Integrations" description="Pre-built connectors to your stack.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { n: "Zoom", connected: true, icon: Globe },
            { n: "Microsoft Teams", connected: true, icon: Globe },
            { n: "Google Workspace", connected: true, icon: Globe },
            { n: "Stripe", connected: true, icon: Building2 },
            { n: "PayPal", connected: true, icon: Building2 },
            { n: "Twilio (SMS / WhatsApp)", connected: false, icon: Bell },
            { n: "Moodle bridge", connected: false, icon: Plug },
            { n: "Power BI export", connected: true, icon: Shield },
            { n: "Slack notifications", connected: false, icon: Bell },
          ].map((i) => (
            <div
              key={i.n}
              className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <i.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{i.n}</div>
                  <div
                    className={`text-[10px] flex items-center gap-1 ${
                      i.connected ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {i.connected ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {i.connected ? "Connected" : "Not connected"}
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  toast.success(
                    i.connected ? `${i.n} disconnected` : `${i.n} connected`,
                  )
                }
                className="text-xs px-2.5 py-1 rounded-md border hover:bg-muted shrink-0"
              >
                {i.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          ))}
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
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
