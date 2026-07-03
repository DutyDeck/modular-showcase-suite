import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Button,
  Field,
  TextInput,
  Select,
  Badge,
} from "@/components/ui-kit";
import { addItem, nextId, type Tenant } from "@/lib/store";
import {
  Check,
  ChevronRight,
  Building2,
  Palette,
  DatabaseZap,
  Users,
  Rocket,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({ meta: [{ title: "Onboard a new tenant — 1StudentID" }] }),
  component: OnboardingPage,
});

const STEPS = [
  { id: 1, label: "Tenant details", icon: Building2 },
  { id: 2, label: "Branding", icon: Palette },
  { id: 3, label: "Migration source", icon: DatabaseZap },
  { id: 4, label: "First cohort", icon: Users },
  { id: 5, label: "Review", icon: Rocket },
];

interface State {
  name: string;
  country: string;
  plan: string;
  primaryColor: string;
  domain: string;
  source: string;
  studentsExpected: number;
  cohortName: string;
  cohortSize: number;
}

const DEFAULT: State = {
  name: "",
  country: "Sri Lanka",
  plan: "Growth",
  primaryColor: "#4f46e5",
  domain: "",
  source: "Moodle",
  studentsExpected: 250,
  cohortName: "A/L Science 2026",
  cohortSize: 42,
};

const COUNTRIES = ["Sri Lanka", "India", "UAE", "USA", "UK", "France", "Australia", "Singapore"];
const PLANS = ["Starter", "Growth", "Enterprise"];
const SOURCES = [
  "Moodle",
  "Canvas LMS",
  "Blackboard Learn",
  "Google Classroom",
  "Schoology",
  "Custom / In-house SIS",
  "Spreadsheet only",
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<State>(DEFAULT);

  const next = () => setStep((s) => Math.min(STEPS.length, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const finish = () => {
    if (!data.name.trim()) {
      toast.error("Tenant name is required");
      setStep(1);
      return;
    }
    const tenant: Tenant = {
      id: nextId("T-", "tenants"),
      name: data.name.trim(),
      country: data.country,
      students: Number(data.studentsExpected) || 0,
      plan: data.plan,
      status: "Trial",
      mrr: data.plan === "Enterprise" ? 4500 : data.plan === "Growth" ? 1200 : 320,
    };
    addItem("tenants", tenant);
    toast.success(`${tenant.name} onboarded — trial active for 30 days`);
    navigate({ to: "/app/tenants" });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Onboard a new tenant"
        subtitle="4-step guided setup to bring a new institution live."
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/app/tenants" })}>
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
        }
      />

      {/* Stepper */}
      <Section className="!p-3 sm:!p-4">
        <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            const Ico = s.icon;
            return (
              <li key={s.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                    active && "border-primary bg-primary text-primary-foreground",
                    done && "border-success bg-success text-white",
                    !active && !done && "border-border bg-card text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Ico className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={cn(
                    "text-xs hidden sm:block",
                    active ? "text-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </li>
            );
          })}
        </ol>
      </Section>

      {step === 1 && (
        <Section title="Tenant details" description="Basic information about the institution.">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Institution name" required className="sm:col-span-2">
              <TextInput
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                placeholder="e.g. Horizon Academy"
                autoFocus
              />
            </Field>
            <Field label="Country">
              <Select
                value={data.country}
                onChange={(e) => setData({ ...data, country: e.target.value })}
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <Field label="Plan">
              <Select
                value={data.plan}
                onChange={(e) => setData({ ...data, plan: e.target.value })}
                options={PLANS.map((p) => ({ value: p, label: p }))}
              />
            </Field>
            <Field label="Expected students" className="sm:col-span-2">
              <TextInput
                type="number"
                min={0}
                value={data.studentsExpected}
                onChange={(e) =>
                  setData({ ...data, studentsExpected: Number(e.target.value) })
                }
              />
            </Field>
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title="Branding" description="Make the platform feel like home.">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Custom subdomain" hint="Will be configured at provisioning time">
              <div className="flex items-center gap-2">
                <TextInput
                  value={data.domain}
                  onChange={(e) => setData({ ...data, domain: e.target.value })}
                  placeholder="horizon"
                />
                <span className="text-xs text-muted-foreground">.oneedu.app</span>
              </div>
            </Field>
            <Field label="Primary brand colour">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={data.primaryColor}
                  onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                  className="h-10 w-14 rounded-md border bg-background cursor-pointer"
                />
                <TextInput
                  value={data.primaryColor}
                  onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                />
              </div>
            </Field>
          </div>
          <div
            className="mt-4 rounded-xl p-5 text-white"
            style={{
              backgroundImage: `linear-gradient(135deg, ${data.primaryColor}, ${data.primaryColor}cc)`,
            }}
          >
            <div className="text-xs opacity-90 uppercase tracking-wider">Live preview</div>
            <div className="text-xl font-bold mt-1">
              Welcome to {data.name || "your institution"}
            </div>
            <div className="text-sm opacity-90 mt-1">
              Powered by 1StudentID · {data.domain ? `${data.domain}.oneedu.app` : "subdomain pending"}
            </div>
          </div>
        </Section>
      )}

      {step === 3 && (
        <Section title="Migration source" description="Where is the existing data coming from?">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SOURCES.map((s) => (
              <button
                key={s}
                onClick={() => setData({ ...data, source: s })}
                className={cn(
                  "p-3 rounded-lg border text-left text-sm transition-all",
                  data.source === s
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <div className="font-medium">{s}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {data.source === s ? "Selected" : "CSV import supported"}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            After setup completes you can run the bulk imports from{" "}
            <span className="text-foreground font-medium">Migration & Imports</span>.
          </div>
        </Section>
      )}

      {step === 4 && (
        <Section title="First cohort" description="We'll create a starter cohort to get you moving.">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Cohort name" className="sm:col-span-2">
              <TextInput
                value={data.cohortName}
                onChange={(e) => setData({ ...data, cohortName: e.target.value })}
                placeholder="e.g. A/L Science 2026"
              />
            </Field>
            <Field label="Estimated size">
              <TextInput
                type="number"
                min={0}
                value={data.cohortSize}
                onChange={(e) => setData({ ...data, cohortSize: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Section>
      )}

      {step === 5 && (
        <Section title="Ready to launch" description="Review your configuration.">
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Institution" value={data.name || "—"} />
            <Row label="Country" value={data.country} />
            <Row label="Plan" value={<Badge tone="default">{data.plan}</Badge>} />
            <Row label="Expected students" value={data.studentsExpected.toLocaleString()} />
            <Row label="Subdomain" value={data.domain ? `${data.domain}.oneedu.app` : "—"} />
            <Row
              label="Brand colour"
              value={
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full ring-1 ring-border"
                    style={{ background: data.primaryColor }}
                  />
                  <code className="text-xs">{data.primaryColor}</code>
                </span>
              }
            />
            <Row label="Migration source" value={data.source} />
            <Row label="First cohort" value={`${data.cohortName} · ${data.cohortSize} seats`} />
          </dl>
        </Section>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={back}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-xs text-muted-foreground">
          Step {step} of {STEPS.length}
        </div>
        {step < STEPS.length ? (
          <Button onClick={next}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish}>
            <Rocket className="h-4 w-4" />
            Launch tenant
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-2">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
