import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  DataTable,
  Badge,
  Button,
  Field,
  TextInput,
  Select,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { useCollection, addItem, nextId, type Tenant } from "@/lib/store";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/app/tenants")({
  head: () => ({ meta: [{ title: "Tenants — GlobalEdu" }] }),
  component: TenantsPage,
});

const PLANS = ["Starter", "Growth", "Enterprise"];
const COUNTRIES = ["Sri Lanka", "India", "UAE", "USA", "UK", "France", "Australia", "Singapore"];

function TenantsPage() {
  const tenants = useCollection("tenants");
  const add = useDisclosure();

  const [form, setForm] = useState({
    name: "",
    country: COUNTRIES[0],
    students: 100,
    plan: "Growth",
    mrr: 500,
  });

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Tenant name is required");
      return;
    }
    const t: Tenant = {
      id: nextId("T-", "tenants"),
      name: form.name.trim(),
      country: form.country,
      students: Number(form.students) || 0,
      plan: form.plan,
      status: "Trial",
      mrr: Number(form.mrr) || 0,
    };
    addItem("tenants", t);
    toast.success(`Onboarded ${t.name}`);
    setForm({
      name: "",
      country: COUNTRIES[0],
      students: 100,
      plan: "Growth",
      mrr: 500,
    });
    add.onClose();
  };

  return (
    <div>
      <PageHeader
        title="Multi-Tenant Management"
        subtitle="Institutions, schools, tutors and learning providers using the platform."
        actions={
          <Button onClick={add.onOpen}>
            <Plus className="h-4 w-4" />
            Onboard Tenant
          </Button>
        }
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
          emptyText="No tenants onboarded"
          renderCell={(row, key) => {
            if (key === "mrr")
              return (
                <span className="font-semibold">
                  ${row.mrr.toLocaleString()}
                </span>
              );
            if (key === "plan") {
              const tones: Record<string, any> = {
                Enterprise: "default",
                Growth: "info",
                Starter: "muted",
              };
              return <Badge tone={tones[row.plan]}>{row.plan}</Badge>;
            }
            if (key === "status")
              return (
                <Badge tone={row.status === "Active" ? "success" : "warning"}>
                  {row.status}
                </Badge>
              );
            return String(row[key] ?? "");
          }}
        />
      </Section>

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="Onboard Tenant"
        description="Spin up a new institution on the platform."
        onSubmit={submit}
        submitLabel="Onboard"
      >
        <Field label="Tenant name" required className="sm:col-span-2">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Horizon Academy"
            autoFocus
          />
        </Field>
        <Field label="Country">
          <Select
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            options={COUNTRIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Plan">
          <Select
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            options={PLANS.map((p) => ({ value: p, label: p }))}
          />
        </Field>
        <Field label="Expected students">
          <TextInput
            type="number"
            min={0}
            value={form.students}
            onChange={(e) =>
              setForm({ ...form, students: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="Initial MRR (USD)">
          <TextInput
            type="number"
            min={0}
            value={form.mrr}
            onChange={(e) => setForm({ ...form, mrr: Number(e.target.value) })}
          />
        </Field>
      </FormDialog>
    </div>
  );
}
