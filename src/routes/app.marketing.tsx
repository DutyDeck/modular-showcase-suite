import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  Button,
  Field,
  TextInput,
  Select,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { useCollection, addItem, updateItem, type Lead } from "@/lib/store";
import { TrendingUp, Users, Target, Megaphone, Plus } from "lucide-react";

export const Route = createFileRoute("/app/marketing")({
  head: () => ({ meta: [{ title: "Marketing & CRM — One Edu" }] }),
  component: MarketingPage,
});

const SOURCES = ["Facebook Ad", "Google Search", "Instagram", "Referral", "Web Form", "Walk-in"];
const STAGES = ["New", "Contacted", "Qualified", "Demo Booked", "Closed Won", "Closed Lost"];

function MarketingPage() {
  const leads = useCollection("leads");
  const add = useDisclosure();

  const [form, setForm] = useState({
    name: "",
    source: SOURCES[0],
    interest: "",
    stage: "New",
    owner: "Unassigned",
    value: 500,
  });

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const lead: Lead = {
      name: form.name.trim(),
      source: form.source,
      interest: form.interest.trim() || "General",
      stage: form.stage,
      owner: form.owner.trim() || "Unassigned",
      value: Number(form.value) || 0,
    };
    addItem("leads", lead);
    toast.success(`Lead "${lead.name}" added`);
    setForm({
      name: "",
      source: SOURCES[0],
      interest: "",
      stage: "New",
      owner: "Unassigned",
      value: 500,
    });
    add.onClose();
  };

  const advance = (name: string, stage: string) => {
    const order = STAGES;
    const next = order[Math.min(order.indexOf(stage) + 1, order.length - 1)];
    updateItem("leads", (l) => l.name === name, { stage: next });
    toast.success(`${name} â†’ ${next}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing & CRM"
        subtitle="Campaigns, lead pipeline, course marketing and onboarding."
        actions={
          <Button onClick={add.onOpen}>
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Active Leads"
          value={leads.length}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Conversion Rate"
          value="24%"
          hint="+3% MoM"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Live Campaigns"
          value="6"
          icon={<Megaphone className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Pipeline Value"
          value={`$${leads.reduce((a, l) => a + l.value, 0)}`}
          icon={<Target className="h-5 w-5" />}
          accent="warning"
        />
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
            { key: "_actions", label: "" },
          ]}
          rows={leads}
          emptyText="No leads yet"
          renderCell={(row, key) => {
            if (key === "value")
              return <span className="font-semibold">${row.value}</span>;
            if (key === "stage") {
              const tones: Record<string, any> = {
                New: "info",
                Contacted: "muted",
                Qualified: "warning",
                "Demo Booked": "default",
                "Closed Won": "success",
                "Closed Lost": "destructive",
              };
              return <Badge tone={tones[row.stage] ?? "muted"}>{row.stage}</Badge>;
            }
            if (key === "_actions") {
              if (row.stage === "Closed Won" || row.stage === "Closed Lost") return null;
              return (
                <button
                  onClick={() => advance(row.name, row.stage)}
                  className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/15"
                >
                  Advance
                </button>
              );
            }
            return String(row[key] ?? "");
          }}
        />
      </Section>

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="New Lead"
        description="Add a prospect to your sales pipeline."
        onSubmit={submit}
        submitLabel="Add lead"
      >
        <Field label="Full name" required className="sm:col-span-2">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Ishara Madushani"
            autoFocus
          />
        </Field>
        <Field label="Source">
          <Select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={SOURCES.map((s) => ({ value: s, label: s }))}
          />
        </Field>
        <Field label="Stage">
          <Select
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
            options={STAGES.map((s) => ({ value: s, label: s }))}
          />
        </Field>
        <Field label="Interest" className="sm:col-span-2">
          <TextInput
            value={form.interest}
            onChange={(e) => setForm({ ...form, interest: e.target.value })}
            placeholder="e.g. A/L Science"
          />
        </Field>
        <Field label="Owner">
          <TextInput
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
            placeholder="e.g. Marketing — Rajiv"
          />
        </Field>
        <Field label="Est. value (USD)">
          <TextInput
            type="number"
            min={0}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
          />
        </Field>
      </FormDialog>
    </div>
  );
}
