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
import {
  useCollection,
  addItem,
  updateItem,
  type PlatformUser,
  type DemoSettings,
} from "@/lib/store";
import { ImportDialog, type ImportField } from "@/components/ImportDialog";
import { useAuth } from "@/lib/auth";
import { isSwimAdmin, demoUsers } from "@/lib/mockData";
import { NAV_CATALOG, type MenuItem } from "@/lib/menus";
import { ShieldCheck, Plus, Upload, Building2, ShieldAlert, MonitorPlay } from "lucide-react";

export const Route = createFileRoute("/app/users")({
  head: () => ({ meta: [{ title: "Users & Roles — 1StudentID" }] }),
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

/** A short persona label for a demo account (mirrors the sign-in screen). */
function accountLabel(u: (typeof demoUsers)[number]): string {
  if (u.role === "admin")
    return u.meta?.discipline === "Swimming"
      ? "Swim admin"
      : u.adminScope === "institute"
        ? "Institute admin"
        : "Global admin";
  if (u.role === "student") return u.selfManaged ? "Adult student" : "Student";
  if (u.role === "teacher") return u.meta?.discipline === "Swimming" ? "Swim coach" : "Teacher";
  if (u.role === "parent") return u.meta?.role === "Co-parent" ? "Co-parent" : "Parent";
  return u.role;
}

/** Toggleable sidebar features grouped by their category. */
const NAV_GROUPS: [string, MenuItem[]][] = (() => {
  const m = new Map<string, MenuItem[]>();
  for (const it of NAV_CATALOG) {
    const g = it.group ?? "General";
    (m.get(g) ?? m.set(g, []).get(g)!).push(it);
  }
  return Array.from(m.entries());
})();

const USER_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, sample: "Charlie Brown" },
  { key: "email", label: "Email", required: true, sample: "saman@gch.lk" },
  { key: "role", label: "Role", sample: "Teacher" },
  { key: "mfa", label: "MFA (true/false)", sample: "true" },
];

function UsersPage() {
  const { user } = useAuth();
  const allUsers = useCollection("platformUsers");
  const add = useDisclosure();
  const importer = useDisclosure();

  const isInstituteScoped = user?.adminScope === "institute";
  // The swim-club admin manages only the club's staff (coaches, lifeguard,
  // reception). Institute admins see users tagged to their institute; the
  // global super-admin (no institutionId) is intentionally hidden — they are
  // not the institute admin's user to manage.
  const swim = isSwimAdmin(user);
  const users = swim
    ? allUsers.filter((u) => u.program === "Swim")
    : isInstituteScoped
      ? allUsers.filter((u) => u.institutionId === user?.institutionId)
      : allUsers;

  // Demo presentation — global-admin-only controls (sign-in accounts + sidebar).
  const isGlobal = user?.adminScope === "global";
  const demo = useCollection("demoSettings").find((s) => s.id === "demo");
  const patchDemo = (patch: Partial<DemoSettings>) => {
    if (demo) updateItem("demoSettings", (s) => s.id === "demo", patch);
    else
      addItem("demoSettings", {
        id: "demo",
        showDemoAccounts: true,
        hiddenDemoAccounts: [],
        hiddenNav: [],
        ...patch,
      });
  };
  const toggleAccount = (email: string, show: boolean) => {
    const hidden = demo?.hiddenDemoAccounts ?? [];
    patchDemo({
      hiddenDemoAccounts: show ? hidden.filter((e) => e !== email) : [...hidden, email],
    });
  };
  const toggleNav = (to: string, show: boolean) => {
    const hidden = demo?.hiddenNav ?? [];
    patchDemo({ hiddenNav: show ? hidden.filter((x) => x !== to) : [...hidden, to] });
  };

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
      // Newly invited users from an institute admin are pinned to that
      // institute by construction — they can't grant cross-tenant access.
      ...(isInstituteScoped
        ? {
            institutionId: user?.institutionId,
            institutionName: user?.institutionName,
          }
        : {}),
    };
    addItem("platformUsers", u);
    toast.success(`Invited ${u.name}`);
    setForm({ name: "", email: "", role: "Teacher", mfa: true });
    add.onClose();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isInstituteScoped ? "Users at my institute" : "Identity & Access Management"}
        subtitle={
          isInstituteScoped
            ? `Staff, students and parents associated with ${user?.institutionName ?? "your institute"}.`
            : "RBAC + ABAC · SSO · Microsoft Entra ID · MFA across the platform."
        }
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
      {isInstituteScoped && (
        <div className="rounded-lg border bg-warning/10 border-warning/30 px-4 py-2.5 text-xs flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-warning-foreground shrink-0" />
          <span>
            You can only invite or manage accounts belonging to{" "}
            <span className="font-semibold">{user?.institutionName ?? "your institute"}</span>.
            Cross-tenant identity, the global super-admin role and platform SSO are reserved for the
            global admin.
          </span>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {["Google SSO", "Microsoft Entra ID", "Apple Sign-in", "SAML / OIDC"].map((p) => (
          <div key={p} className="p-4 rounded-lg border bg-card flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success" />
            <div>
              <div className="text-sm font-medium">{p}</div>
              <div className="text-[10px] text-success">● Enabled</div>
            </div>
          </div>
        ))}
      </div>
      {isGlobal && (
        <Section
          title="Demo presentation"
          description="Tailor what a client sees in a demo — which sign-in accounts appear, and which sidebar features are shown. A category with nothing left simply doesn't show."
        >
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Sign-in demo accounts */}
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <MonitorPlay className="h-4 w-4 text-primary" />
                Sign-in demo accounts
              </div>
              <label className="mt-2 flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={demo?.showDemoAccounts ?? true}
                  onChange={(e) => patchDemo({ showDemoAccounts: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm">
                  <span className="font-medium">Show demo login accounts</span>
                  <span className="block text-xs text-muted-foreground">
                    The quick-login persona cards on the sign-in page.
                  </span>
                </span>
              </label>
              {(demo?.showDemoAccounts ?? true) && (
                <div className="mt-3 grid sm:grid-cols-2 gap-1.5">
                  {demoUsers.map((u) => {
                    const on = !(demo?.hiddenDemoAccounts ?? []).includes(u.email);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => toggleAccount(u.email, e.target.checked)}
                          className="h-4 w-4 accent-primary shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-medium truncate">
                            {accountLabel(u)}
                          </span>
                          <span className="block text-[10px] text-muted-foreground truncate">
                            {u.name}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar features */}
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Sidebar features
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Hide features a client doesn't need. Applies to every persona's sidebar.
              </p>
              <div className="mt-3 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {NAV_GROUPS.map(([group, items]) => (
                  <div key={group}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      {group}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {items.map((it) => {
                        const on = !(demo?.hiddenNav ?? []).includes(it.to);
                        return (
                          <label
                            key={it.to}
                            className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={(e) => toggleNav(it.to, e.target.checked)}
                              className="h-4 w-4 accent-primary shrink-0"
                            />
                            <span className="text-xs font-medium truncate">{it.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section
        title={
          isInstituteScoped
            ? `Users at ${user?.institutionName ?? "your institute"}`
            : "Platform Users"
        }
      >
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            ...(isInstituteScoped ? [] : [{ key: "_institute", label: "Institute" }]),
            { key: "lastLogin", label: "Last Login" },
            { key: "mfa", label: "MFA" },
          ]}
          rows={users}
          emptyText="No users"
          renderCell={(row, key) => {
            if (key === "_institute")
              return row.institutionName ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[170px]">{row.institutionName}</span>
                </div>
              ) : (
                <Badge tone="muted">Platform</Badge>
              );
            if (key === "mfa")
              return (
                <Badge tone={row.mfa ? "success" : "warning"}>{row.mfa ? "Enabled" : "Off"}</Badge>
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
            placeholder="e.g. Charlie Brown"
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
