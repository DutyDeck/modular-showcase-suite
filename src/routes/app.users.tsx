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
import { useCollection, addItem, type PlatformUser } from "@/lib/store";
import { ImportDialog, type ImportField } from "@/components/ImportDialog";
import { ShieldCheck, Plus, Upload } from "lucide-react";

export const Route = createFileRoute("/app/users")({
  head: () => ({ meta: [{ title: "Users & Roles — One Edu" }] }),
  component: UsersPage,
});

const ROLES = [
  "Super Admin",
  "Admin",
  "Teacher",
  "Parent",
  "Student",
  "Counselor",
  "Marketing Officer",
  "Finance Officer",
];

const USER_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, sample: "Saman Silva" },
  { key: "email", label: "Email", required: true, sample: "saman@gch.lk" },
  { key: "role", label: "Role", sample: "Teacher" },
  { key: "mfa", label: "MFA (true/false)", sample: "true" },
];

function UsersPage() {
  const users = useCollection("platformUsers");
  const add = useDisclosure();
  const importer = useDisclosure();

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Teacher",
    mfa: true,
  });

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    const u: PlatformUser = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      lastLogin: "just now",
      mfa: form.mfa,
    };
    addItem("platformUsers", u);
    toast.success(`Invited ${u.name}`);
    setForm({ name: "", email: "", role: "Teacher", mfa: true });
    add.onClose();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity & Access Management"
        subtitle="RBAC + ABAC · SSO · Microsoft Entra ID · MFA across the platform."
        actions={
          <>
            <Button variant="outline" onClick={importer.onOpen}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              Invite User
            </Button>
          </>
        }
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {["Google SSO", "Microsoft Entra ID", "Apple Sign-in", "SAML / OIDC"].map(
          (p) => (
            <div
              key={p}
              className="p-4 rounded-lg border bg-card flex items-center gap-3"
            >
              <ShieldCheck className="h-5 w-5 text-success" />
              <div>
                <div className="text-sm font-medium">{p}</div>
                <div className="text-[10px] text-success">● Enabled</div>
              </div>
            </div>
          ),
        )}
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
          rows={users}
          emptyText="No users"
          renderCell={(row, key) => {
            if (key === "mfa")
              return (
                <Badge tone={row.mfa ? "success" : "warning"}>
                  {row.mfa ? "Enabled" : "Off"}
                </Badge>
              );
            if (key === "role") return <Badge tone="default">{row.role}</Badge>;
            return String(row[key] ?? "");
          }}
        />
      </Section>

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="Invite User"
        description="Send an invitation to a new platform user."
        onSubmit={submit}
        submitLabel="Send invite"
      >
        <Field label="Full name" required>
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Saman Silva"
            autoFocus
          />
        </Field>
        <Field label="Email" required>
          <TextInput
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="saman@gch.lk"
          />
        </Field>
        <Field label="Role">
          <Select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
        </Field>
        <Field label="Require MFA">
          <Select
            value={form.mfa ? "yes" : "no"}
            onChange={(e) => setForm({ ...form, mfa: e.target.value === "yes" })}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </Field>
      </FormDialog>

      <ImportDialog<PlatformUser>
        open={importer.open}
        onOpenChange={importer.setOpen}
        title="Import users from CSV"
        entityLabel="users"
        fields={USER_IMPORT_FIELDS}
        templateName="users-template.csv"
        transform={(row) => ({
          name: row.name,
          email: row.email,
          role: row.role || "Student",
          lastLogin: "never",
          mfa: /^(1|true|yes)$/i.test(row.mfa ?? ""),
        })}
        onCommit={(items) => items.forEach((u) => addItem("platformUsers", u))}
      />
    </div>
  );
}
