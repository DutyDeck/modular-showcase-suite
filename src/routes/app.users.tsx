import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  nextId,
  type PlatformUser,
  type DemoSettings,
} from "@/lib/store";
import { ImportDialog, type ImportField } from "@/components/ImportDialog";
import { useAuth } from "@/lib/auth";
import { isSwimAdmin, demoUsers } from "@/lib/mockData";
import { NAV_CATALOG, type MenuItem } from "@/lib/menus";
import {
  ShieldCheck,
  Plus,
  Upload,
  Building2,
  ShieldAlert,
  MonitorPlay,
  Search,
  Users,
  GraduationCap,
  HeartHandshake,
  UserCog,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { StatCard } from "@/components/ui-kit";
import { PackContextBar } from "@/components/packs/PackUI";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import { useTenantContext } from "@/lib/packs/registry";
import {
  ACCOUNT_MODE_LABEL,
  DEMO_TODAY,
  PROVIDER_LABEL,
  studentAccountFor,
} from "@/lib/packs/foundationData";
import { TENANT_STAFF } from "@/lib/packs/opsData";
import { staffMovements } from "@/lib/packs/sis/itadmin";
import { logChange, notify } from "@/lib/packs/sis/activity";
import { STAFF_ROLES, ageAt, defaultStaffRole } from "@/lib/packs/sis/governance";

export const Route = createFileRoute("/app/users")({
  head: () => ({ meta: [{ title: "Users & Roles — 1StudentID" }] }),
  component: UsersRoute,
});

/** Pack-tenant institute admins see their institution's people and roles;
 *  the global admin and classic tenants keep the original page. */
function UsersRoute() {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  return isPackTenantUser(user, profiles) ? <PackUsers /> : <UsersPage />;
}

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

/* ══ Pack-tenant view ═══════════════════════════════════════════════════════
 * The institution's own people: staff (TENANT_STAFF + HR movements), learners
 * (account mode from the sign-in policy), guardians and the tenant's demo
 * personas. Role changes are written to the changeLog + accountActions;
 * provisioning and revocation stay in IT Administration. */

type PersonType = "Staff" | "Student" | "Parent";
type Tone = "default" | "success" | "warning" | "destructive" | "info" | "muted";

interface PersonRow {
  key: string;
  name: string;
  type: PersonType;
  detail: string;
  role: string;
  account: string;
  signIn: string;
  status: string;
  tone: Tone;
  persona?: string;
  /** Staff only: the job title the default role is derived from. */
  title?: string;
  minor?: boolean;
}

const TITLE_RE = /^(mr|mrs|ms|dr|prof)\.?\s+/i;

function staffEmail(name: string, domain?: string) {
  const local = name
    .replace(TITLE_RE, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .join(".");
  return `${local}@${domain ?? "school.edu"}`;
}

const ROLE_FIELD = "Platform role";

function PackUsers() {
  const ctx = useTenantContext();
  const allLearners = useCollection("learners");
  const allActions = useCollection("accountActions");
  const changeLog = useCollection("changeLog");
  const policy = ctx.profile?.studentAccounts;
  const provider = policy?.provider ?? "native";
  const segment: "school" | "university" | "college" =
    ctx.type === "university" ? "university" : ctx.type === "college" ? "college" : "school";
  const roles = STAFF_ROLES[segment];

  const rows = useMemo(() => {
    const tid = ctx.tenantId;
    const personas = new Map(
      demoUsers.filter((u) => u.institutionId === tid).map((u) => [u.name, u.email]),
    );
    const actions = allActions
      .filter((a) => a.tenantId === tid)
      .sort((a, b) => b.at.localeCompare(a.at));
    const roleLog = changeLog
      .filter((c) => c.tenantId === tid && c.entity === "account" && c.field === ROLE_FIELD)
      .sort((a, b) => b.at.localeCompare(a.at));
    const out: PersonRow[] = [];

    // Staff — current staff plus HR joiners / leavers.
    const moves = staffMovements.filter((m) => m.tenantId === tid);
    const staff = [...(TENANT_STAFF[tid] ?? [])];
    for (const m of moves)
      if (!staff.some((s) => s.name === m.name)) staff.push({ name: m.name, role: m.role });
    for (const s of staff) {
      const move = moves.find((m) => m.name === s.name);
      const life = actions.find(
        (a) =>
          a.subject === s.name &&
          !a.subjectId &&
          (a.kind === "Provisioned" || a.kind === "Revoked" || a.kind === "Restored"),
      );
      let status = "Active";
      let tone: Tone = "success";
      if (life?.kind === "Revoked") {
        status = "Revoked";
        tone = "destructive";
      } else if (move?.kind === "Joiner" && !life) {
        status = move.date > DEMO_TODAY ? `Starts ${move.date}` : "Not provisioned";
        tone = move.date > DEMO_TODAY ? "info" : "warning";
      } else if (move?.kind === "Leaver" && move.date <= DEMO_TODAY) {
        status = "Left — revoke in IT";
        tone = "warning";
      }
      const role =
        roleLog.find((c) => c.entityId === `staff:${s.name}`)?.to ??
        defaultStaffRole(s.role, segment);
      out.push({
        key: `staff:${s.name}`,
        name: s.name,
        type: "Staff",
        detail: s.role,
        title: s.role,
        role,
        account: staffEmail(s.name, policy?.domain),
        signIn: PROVIDER_LABEL[provider],
        status,
        tone,
        persona: personas.get(s.name),
      });
    }

    // Learners — account mode from the tenant's sign-in policy.
    const learners = allLearners.filter((l) => l.tenantId === tid);
    for (const l of learners) {
      const acc = studentAccountFor(l, policy);
      const age = ageAt(l.dob, DEMO_TODAY);
      const alumni = l.status === "Graduated";
      let status = "Active";
      let tone: Tone = "success";
      if (l.accessRevoked) {
        status = alumni ? "Alumni · access closed" : "Revoked";
        tone = alumni ? "muted" : "destructive";
      } else if (alumni) {
        status = "Alumni";
        tone = "muted";
      } else if (l.status !== "Active") {
        status = l.status;
        tone = "warning";
      }
      out.push({
        key: l.id,
        name: l.name,
        type: "Student",
        detail: `${l.id} · ${[l.level, l.group].filter(Boolean).join(" · ")}${age < 18 ? ` · age ${age}` : ""}`,
        role: alumni ? "Alumni" : "Student",
        account: ACCOUNT_MODE_LABEL[acc.mode],
        signIn: acc.mode === "guardian" ? "Via parent's 1StudentID" : PROVIDER_LABEL[acc.provider],
        status,
        tone,
        persona: personas.get(l.name),
        minor: age < 18 && !alumni,
      });
    }

    // Guardians — parent role, own 1StudentID.
    const parents = new Map<string, typeof learners>();
    for (const l of learners)
      for (const g of l.guardians ?? []) parents.set(g, [...(parents.get(g) ?? []), l]);
    for (const [name, kids] of parents) {
      const familyKids = kids.filter((k) => studentAccountFor(k, policy).mode === "family");
      out.push({
        key: `parent:${name}`,
        name,
        type: "Parent",
        detail: `Parent of ${kids.map((k) => k.name.split(" ")[0]).join(", ")}`,
        role: "Parent",
        account: familyKids.length
          ? `Own account · also uses ${familyKids.map((k) => k.name.split(" ")[0]).join(", ")}'s`
          : "Own account",
        signIn: PROVIDER_LABEL.native,
        status: "Active",
        tone: "success",
        persona: personas.get(name),
      });
    }
    return out;
  }, [ctx.tenantId, allLearners, allActions, changeLog, policy, provider, segment]);

  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | PersonType>("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "attention">("all");
  const roleOptions = useMemo(() => [...new Set(rows.map((r) => r.role))].sort(), [rows]);

  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    return (
      (type === "all" || r.type === type) &&
      (role === "all" || r.role === role) &&
      (status === "all" || (status === "active" ? r.tone === "success" : r.tone !== "success")) &&
      (!needle ||
        [r.name, r.detail, r.role, r.account, r.persona]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)))
    );
  });

  const changeRole = (r: PersonRow, to: string) => {
    if (to === r.role) return;
    const by = ctx.user?.name ?? "Institute admin";
    logChange({
      tenantId: ctx.tenantId,
      entity: "account",
      entityId: r.key,
      field: ROLE_FIELD,
      from: r.role,
      to,
      by,
      reason: "Changed in Users & Roles",
    });
    addItem("accountActions", {
      id: nextId("AA-", "accountActions"),
      tenantId: ctx.tenantId,
      subject: r.name,
      subjectType: "Staff",
      kind: "Role changed",
      reason: `${r.role} → ${to}`,
      systems: ["1StudentID"],
      by,
      at: new Date().toISOString(),
    });
    notify({
      tenantId: ctx.tenantId,
      channel: "Email",
      to: `${r.name} (${r.account})`,
      subject: `Your ${ctx.tenantName} role is now ${to}`,
      body: `${by} changed your 1StudentID role from ${r.role} to ${to}. Menus update at your next sign-in.`,
      source: "Users · roles",
    });
    toast.success(`${r.name} is now ${to}`, { description: "Logged in the audit trail" });
  };

  const count = (t: PersonType) => rows.filter((r) => r.type === t).length;
  const attention = rows.filter((r) => r.tone === "warning" || r.tone === "destructive").length;
  const personaCount = rows.filter((r) => r.persona).length;
  const minors = rows.filter((r) => r.minor).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        subtitle={`People and roles at ${ctx.tenantName}.`}
        actions={
          <Link
            to="/app/it"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border bg-background text-sm font-medium hover:bg-muted"
          >
            <UserCog className="h-4 w-4" /> Provision or revoke in IT
          </Link>
        }
      />
      <PackContextBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Staff"
          value={count("Staff")}
          hint={attention ? `${attention} need attention` : "All accounts in order"}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Students"
          value={count("Student")}
          hint={minors ? `${minors} under 18` : "All adults"}
          icon={<GraduationCap className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Parents"
          value={count("Parent")}
          icon={<HeartHandshake className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Demo logins"
          value={personaCount}
          hint="Password: demo"
          icon={<MonitorPlay className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      {/* Sign-in policy */}
      <Section
        title="Sign-in policy"
        description="Set in Institution settings. Roster sync creates and closes student accounts."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <PolicyTile
            label="Staff and students"
            value={PROVIDER_LABEL[provider]}
            hint={policy?.domain ? `@${policy.domain}` : undefined}
          />
          <PolicyTile
            label="Parents"
            value={PROVIDER_LABEL.native}
            hint="One login for every child"
          />
          {(policy?.bands ?? []).map((b) => (
            <PolicyTile key={b.label} label={b.label} value={ACCOUNT_MODE_LABEL[b.mode]} />
          ))}
          <PolicyTile
            label={policy?.bands.length ? "Everyone else" : "All students"}
            value={ACCOUNT_MODE_LABEL[policy?.defaultMode ?? "own"]}
            hint={policy?.rosterSync ? "Roster sync on" : "Manual accounts"}
          />
        </div>
      </Section>

      <Section
        title={`People at ${ctx.tenantName}`}
        description={`${filtered.length} of ${rows.length} shown. Staff roles change here; accounts are created and closed in IT Administration.`}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, id, email…"
              className="pl-8"
            />
          </div>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            options={[
              { value: "all", label: "Everyone" },
              { value: "Staff", label: "Staff" },
              { value: "Student", label: "Students" },
              { value: "Parent", label: "Parents" },
            ]}
          />
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: "all", label: "Any role" },
              ...roleOptions.map((r) => ({ value: r, label: r })),
            ]}
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            options={[
              { value: "all", label: "Any status" },
              { value: "active", label: "Active" },
              { value: "attention", label: "Needs attention / closed" },
            ]}
          />
        </div>
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">Person</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Role</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Account</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Sign-in</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Status</th>
                <th className="px-4 sm:px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const self = r.name === ctx.user?.name;
                return (
                  <tr key={r.key} className="border-b last:border-0 align-top">
                    <td className="px-4 sm:px-5 py-3">
                      <div className="font-medium flex items-center gap-1.5 flex-wrap">
                        {r.name}
                        <Badge tone="muted">{r.type}</Badge>
                        {self && <Badge tone="info">You</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{r.detail}</div>
                      {r.persona && (
                        <div className="text-[10px] text-primary mt-0.5 inline-flex items-center gap-1">
                          <KeyRound className="h-3 w-3" /> Demo login: {r.persona}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      {r.type === "Staff" && r.tone !== "destructive" ? (
                        <select
                          value={r.role}
                          disabled={self}
                          title={self ? "You can't change your own role" : "Change role"}
                          onChange={(e) => changeRole(r, e.target.value)}
                          className="h-8 rounded-md border bg-background px-2 text-xs disabled:opacity-60"
                        >
                          {[...new Set([r.role, ...roles])].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone="default">{r.role}</Badge>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-xs">{r.account}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-muted-foreground">{r.signIn}</td>
                    <td className="px-4 sm:px-5 py-3">
                      <Badge tone={r.tone}>{r.status}</Badge>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-right">
                      {r.type !== "Parent" && (
                        <Link
                          to="/app/it"
                          className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline whitespace-nowrap"
                        >
                          Accounts <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-sm text-muted-foreground">
                    No people match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-success" />
          Role changes are logged in Compliance → audit trail and the IT account log.
        </div>
      </Section>
    </div>
  );
}

function PolicyTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
