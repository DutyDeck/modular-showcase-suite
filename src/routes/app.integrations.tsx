import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  CreditCard,
  Database,
  KeyRound,
  Landmark,
  Layers,
  Plug,
  RefreshCw,
  School,
  Unplug,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  Field,
  TextInput,
  FormDialog,
} from "@/components/ui-kit";
import { PackContextBar, StatusPill } from "@/components/packs/PackUI";
import { useCollection, addItem, updateItem, removeItem, nextId } from "@/lib/store";
import { useTenantContext } from "@/lib/packs/registry";
import {
  INTEGRATIONS,
  type IntegrationCategory,
  type IntegrationConnection,
  type IntegrationDef,
} from "@/lib/packs/bizData";

export const Route = createFileRoute("/app/integrations")({
  head: () => ({ meta: [{ title: "Integrations — 1StudentID" }] }),
  component: IntegrationsPage,
});

const CATEGORY_ICON: Record<IntegrationCategory, React.ComponentType<{ className?: string }>> = {
  "Single sign-on": KeyRound,
  "LMS (LTI 1.3)": BookOpen,
  "Student records": Database,
  "School MIS": School,
  Curriculum: Layers,
  Timetabling: CalendarRange,
  Payments: CreditCard,
  Regulator: Landmark,
};

const CATEGORY_ORDER: IntegrationCategory[] = [
  "Single sign-on",
  "LMS (LTI 1.3)",
  "Student records",
  "School MIS",
  "Curriculum",
  "Timetabling",
  "Payments",
  "Regulator",
];

/** Settings captured when connecting, per category. */
function fieldsFor(
  def: IntegrationDef,
): { label: string; placeholder: string; secret?: boolean }[] {
  switch (def.category) {
    case "Single sign-on":
      return def.key === "entra" || def.key === "google" || def.key === "oidc"
        ? [
            {
              label: "Issuer / tenant domain",
              placeholder: "login.microsoftonline.com/your-tenant",
            },
            { label: "Client ID", placeholder: "00000000-0000-0000-0000-000000000000" },
            { label: "Client secret", placeholder: "••••••••", secret: true },
          ]
        : [
            { label: "Entity ID", placeholder: "https://idp.example.ac.uk/shibboleth" },
            { label: "Metadata URL", placeholder: "https://idp.example.ac.uk/metadata.xml" },
            { label: "Attribute for 1StudentID match", placeholder: "eduPersonPrincipalName" },
          ];
    case "LMS (LTI 1.3)":
      return [
        { label: "Platform issuer", placeholder: "https://moodle.example.ac.uk" },
        { label: "Client ID", placeholder: "lti-client-id" },
        { label: "Deployment ID", placeholder: "1" },
        { label: "JWKS URL", placeholder: "https://moodle.example.ac.uk/mod/lti/certs.php" },
      ];
    case "Payments":
      return [
        { label: "Merchant / account ID", placeholder: "acct_…" },
        { label: "API key", placeholder: "••••••••", secret: true },
      ];
    default:
      return [
        { label: "API base URL", placeholder: "https://api.vendor.example/v1" },
        { label: "API key / token", placeholder: "••••••••", secret: true },
        { label: "School / institution code", placeholder: "e.g. 10001234" },
      ];
  }
}

function IntegrationsPage() {
  const ctx = useTenantContext();
  const all = useCollection("integrationConnections");
  const [showAll, setShowAll] = useState(false);
  const [connecting, setConnecting] = useState<IntegrationDef | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const connections = all.filter((c) => c.tenantId === ctx.tenantId);
  const byKey = new Map(connections.map((c) => [c.key, c]));

  const segments = useMemo(() => {
    const s = new Set<string>();
    if (ctx.type === "school" || ctx.packs.has("intl-school")) s.add("school");
    if (ctx.type === "university" || ctx.packs.has("higher-ed")) s.add("university");
    if (ctx.type === "college" || ctx.packs.has("college")) s.add("college");
    if (s.size === 0) s.add("school"); // tuition / club: school-flavoured catalogue
    return s;
  }, [ctx.type, ctx.packs]);
  const region = ctx.profile?.region ?? "GLOBAL";

  const relevant = (d: IntegrationDef) =>
    (d.segments.length === 0 || d.segments.some((s) => segments.has(s))) &&
    (!d.regions || d.regions.includes(region));
  const catalogue = INTEGRATIONS.filter((d) => showAll || relevant(d) || byKey.has(d.key));

  const connect = () => {
    if (!connecting) return;
    const fields = fieldsFor(connecting);
    const missing = fields.filter((f) => !values[f.label]?.trim());
    if (missing.length) {
      toast.error(`Fill in ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    const config = Object.fromEntries(
      fields.map((f) => [f.label, f.secret ? "••••" + values[f.label].slice(-4) : values[f.label]]),
    );
    addItem("integrationConnections", {
      id: nextId("IC-", "integrationConnections"),
      tenantId: ctx.tenantId,
      key: connecting.key,
      status: "Connected",
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      detail: `Connected by ${ctx.user?.name ?? "admin"} · first sync complete`,
      config,
    });
    toast.success(`${connecting.name} connected`, {
      description: "Test handshake passed — first sync complete.",
    });
    setConnecting(null);
    setValues({});
  };

  const sync = (c: IntegrationConnection, def: IntegrationDef) => {
    updateItem("integrationConnections", (x) => x.id === c.id, { status: "Syncing" });
    setTimeout(() => {
      // A broken mapping stays broken until it's fixed.
      const fixed = c.status !== "Error";
      updateItem("integrationConnections", (x) => x.id === c.id, {
        status: fixed ? "Connected" : "Error",
        lastSync: new Date().toISOString(),
      });
      if (fixed) toast.success(`${def.name} synced`);
      else toast.error(`${def.name} sync failed`, { description: c.detail });
    }, 1400);
  };

  const fixMapping = (c: IntegrationConnection, def: IntegrationDef) => {
    updateItem("integrationConnections", (x) => x.id === c.id, {
      status: "Connected",
      detail: "Mapping fixed: MODULE_OCCURRENCE → module + semester · 0 errors",
      lastSync: new Date().toISOString(),
    });
    toast.success(`${def.name} mapping fixed`, {
      description: "Re-synced module occurrences successfully.",
    });
  };

  const disconnect = (c: IntegrationConnection, def: IntegrationDef) => {
    removeItem("integrationConnections", (x) => x.id === c.id);
    toast.message(`${def.name} disconnected`);
  };

  const connected = connections.filter((c) => c.status !== "Error").length;
  const errored = connections.filter((c) => c.status === "Error").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Connect the systems this institution already runs — sign-in, LMS, student records, MIS, timetabling, payments and regulators."
        actions={
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show all connectors
          </label>
        }
      />
      <PackContextBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Connected"
          value={connected}
          accent="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Need attention"
          value={errored}
          accent={errored ? "destructive" : "success"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Available for you"
          value={INTEGRATIONS.filter(relevant).length}
          hint={`${[...segments].join(" / ")} · ${ctx.region.name}`}
          icon={<Plug className="h-4 w-4" />}
        />
        <StatCard
          label="Standards"
          value="LTI 1.3 · SAML · OIDC"
          hint="Open standards first, vendor APIs second"
          accent="info"
        />
      </div>

      {!ctx.isAdmin && (
        <Section>
          <p className="text-sm text-muted-foreground">
            Only administrators can change integrations.
          </p>
        </Section>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const items = catalogue.filter((d) => d.category === cat);
        if (items.length === 0) return null;
        const Icon = CATEGORY_ICON[cat];
        return (
          <Section
            key={cat}
            title={
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" /> {cat}
              </span>
            }
          >
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((d) => {
                const c = byKey.get(d.key);
                return (
                  <div
                    key={d.key}
                    className={`rounded-lg border p-3 flex flex-col gap-2 ${c ? "bg-card" : "bg-muted/20"} ${c?.status === "Error" ? "border-destructive/40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{d.name}</div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{d.description}</p>
                      </div>
                      {c ? (
                        <StatusPill status={c.status} />
                      ) : (
                        !relevant(d) && <Badge tone="muted">Other region</Badge>
                      )}
                    </div>
                    {c && (
                      <div className="text-[11px] text-muted-foreground space-y-0.5">
                        {c.detail && (
                          <div
                            className={
                              c.status === "Error" ? "text-destructive font-medium" : undefined
                            }
                          >
                            {c.detail}
                          </div>
                        )}
                        {c.lastSync && (
                          <div>
                            Last sync{" "}
                            {new Date(c.lastSync).toLocaleString("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {ctx.isAdmin && (
                      <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                        {!c && (
                          <Button size="sm" onClick={() => setConnecting(d)}>
                            <Plug className="h-3.5 w-3.5" /> Connect
                          </Button>
                        )}
                        {c && c.status === "Error" && (
                          <Button size="sm" onClick={() => fixMapping(c, d)}>
                            Fix mapping
                          </Button>
                        )}
                        {c && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={c.status === "Syncing"}
                            onClick={() => sync(c, d)}
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${c.status === "Syncing" ? "animate-spin" : ""}`}
                            />{" "}
                            Sync now
                          </Button>
                        )}
                        {c && (
                          <Button size="sm" variant="ghost" onClick={() => disconnect(c, d)}>
                            <Unplug className="h-3.5 w-3.5" /> Disconnect
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })}

      <FormDialog
        open={!!connecting}
        onOpenChange={(v) => {
          if (!v) {
            setConnecting(null);
            setValues({});
          }
        }}
        title={connecting ? `Connect ${connecting.name}` : ""}
        description={connecting ? `${connecting.category} · tenant ${ctx.tenantName}` : ""}
        submitLabel="Test & connect"
        onSubmit={connect}
      >
        {connecting &&
          fieldsFor(connecting).map((f) => (
            <Field key={f.label} label={f.label} required className="sm:col-span-2">
              <TextInput
                type={f.secret ? "password" : "text"}
                placeholder={f.placeholder}
                value={values[f.label] ?? ""}
                onChange={(e) => setValues({ ...values, [f.label]: e.target.value })}
              />
            </Field>
          ))}
        {connecting?.category === "LMS (LTI 1.3)" && (
          <p className="text-[11px] text-muted-foreground sm:col-span-2">
            1StudentID tool URLs to paste into the LMS: launch{" "}
            <code className="bg-muted px-1 rounded">https://app.1studentid.com/lti/launch</code>,
            JWKS{" "}
            <code className="bg-muted px-1 rounded">
              https://app.1studentid.com/.well-known/jwks.json
            </code>
            . Roster (NRPS) and grade passback (AGS) are enabled.
          </p>
        )}
      </FormDialog>
    </div>
  );
}
