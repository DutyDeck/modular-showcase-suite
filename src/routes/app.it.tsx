import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Download,
  HardDrive,
  KeyRound,
  LifeBuoy,
  Lock,
  Mail,
  MessageSquare,
  MonitorCog,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  StickyNote,
  Timer,
  Undo2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  DataTable,
  Field,
  MiniBars,
  Select,
  TextArea,
  TextInput,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { PackContextBar, StatusPill, Tabs, useTab } from "@/components/packs/PackUI";
import { useCollection, addItem, updateItem, nextId } from "@/lib/store";
import { useTenantContext, type TenantContext } from "@/lib/packs/registry";
import {
  DEMO_TODAY,
  ACCOUNT_MODE_LABEL,
  PROVIDER_LABEL,
  learners as seedLearners,
  studentAccountFor,
  type Learner,
  type SignInProvider,
} from "@/lib/packs/foundationData";
import { TENANT_STAFF } from "@/lib/packs/opsData";
import { ID_FIELDS } from "@/lib/packs/regions";
import { INTEGRATIONS } from "@/lib/packs/bizData";
import { demoUsers } from "@/lib/mockData";
import { notify, logChange } from "@/lib/packs/sis/activity";
import type { Channel, OutboxMessage } from "@/lib/packs/sis/shared";
import {
  ACCOUNTS_GO_LIVE,
  DEMO_NOW,
  DIRECTORY_CONTACTS,
  IT_TEAM,
  PROVIDER_RESET,
  SLA_HOURS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  staffMovements,
  systemsForProvider,
  type AccountAction,
  type StaffMovement,
  type SupportTicket,
} from "@/lib/packs/sis/itadmin";

export const Route = createFileRoute("/app/it")({
  head: () => ({ meta: [{ title: "IT Administration — 1StudentID" }] }),
  component: ItPage,
});

/* ── Small helpers ───────────────────────────────────────────────────────── */

const HOUR = 3_600_000;
const SEED_LEARNER_IDS = new Set(seedLearners.map((l) => l.id));
const CHANNELS: Channel[] = ["Email", "SMS", "WhatsApp", "App"];
const SEGMENT_TENANTS = ["T-009", "T-010", "T-011", "T-012"];

const nowIso = () => new Date().toISOString();

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Never show a full official id — last 4 characters only. */
function mask(v: string) {
  const c = v.replace(/[^A-Za-z0-9]/g, "");
  return `•••• ${c.slice(-4)}`;
}

const alnum = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const digits = (s: string) => s.replace(/\D/g, "");

function duration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(mins / 60);
  if (h >= 48) return `${Math.floor(h / 24)}d`;
  if (h >= 1) return `${h}h ${mins % 60}m`;
  return `${mins}m`;
}

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Tone = "default" | "success" | "warning" | "destructive" | "info" | "muted";

/** SLA state. Seeded tickets are measured against the demo clock so they stay stable. */
function slaInfo(t: SupportTicket): { label: string; tone: Tone; breached: boolean } {
  if (t.status === "Resolved") return { label: "Closed", tone: "muted", breached: false };
  if (t.status === "Waiting on user")
    return { label: "Paused · waiting on user", tone: "info", breached: false };
  const created = Date.parse(t.createdAt);
  const demoNow = Date.parse(DEMO_NOW);
  const now = created <= demoNow ? demoNow : Date.now();
  const left = created + t.slaHours * HOUR - now;
  if (left < 0)
    return { label: `Breached ${duration(-left)}`, tone: "destructive", breached: true };
  return {
    label: `Due in ${duration(left)}`,
    tone: left < t.slaHours * HOUR * 0.25 ? "warning" : "muted",
    breached: false,
  };
}

const PRIORITY_TONE: Record<SupportTicket["priority"], Tone> = {
  Low: "muted",
  Normal: "default",
  High: "warning",
  Urgent: "destructive",
};

const OUTBOX_TONE: Record<OutboxMessage["status"], Tone> = {
  Sent: "success",
  Queued: "info",
  Failed: "destructive",
};

/* ── People model ────────────────────────────────────────────────────────── */

type PersonType = "Student" | "Staff" | "Parent";

interface Person {
  key: string;
  name: string;
  type: PersonType;
  /** 1StudentID for learners. */
  id?: string;
  detail: string;
  email?: string;
  phone?: string;
  learner?: Learner;
  move?: StaffMovement;
  children?: Learner[];
}

const TITLE_RE = /^(mr|mrs|ms|dr|prof)\.?\s+/i;

function staffEmail(name: string, domain?: string) {
  const local = name
    .replace(TITLE_RE, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(" ");
  return `${local.join(".")}@${(domain ?? "school.edu").replace(/^students?\./, "")}`;
}

interface ItData {
  people: Person[];
  learners: Learner[];
  actions: AccountAction[];
  tickets: SupportTicket[];
  outbox: OutboxMessage[];
  provider: SignInProvider;
  systems: string[];
  goLive: string;
  lifecycle: (p: Person) => AccountAction | undefined;
  isRevoked: (p: Person) => boolean;
  isProvisioned: (p: Person) => boolean;
  actionsFor: (p: Person) => AccountAction[];
}

function useItData(ctx: TenantContext): ItData {
  const tenantId = ctx.tenantId;
  const allLearners = useCollection("learners");
  const allActions = useCollection("accountActions");
  const allTickets = useCollection("supportTickets");
  const allOutbox = useCollection("outbox");

  return useMemo(() => {
    const learners = allLearners.filter((l) => l.tenantId === tenantId);
    const actions = allActions
      .filter((a) => a.tenantId === tenantId)
      .sort((a, b) => b.at.localeCompare(a.at));
    const tickets = allTickets
      .filter((t) => t.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const outbox = allOutbox
      .filter((m) => m.tenantId === tenantId)
      .sort((a, b) => b.at.localeCompare(a.at));
    const policy = ctx.profile?.studentAccounts;
    const provider: SignInProvider = policy?.provider ?? "native";
    const domain = policy?.domain;

    const people: Person[] = [];
    for (const l of learners) {
      people.push({
        key: l.id,
        name: l.name,
        type: "Student",
        id: l.id,
        detail: [l.level, l.group].filter(Boolean).join(" · "),
        email: l.email,
        phone: DIRECTORY_CONTACTS[l.name]?.phone,
        learner: l,
      });
    }
    const moves = staffMovements.filter((m) => m.tenantId === tenantId);
    const staffNames = new Set<string>();
    for (const s of TENANT_STAFF[tenantId] ?? []) {
      staffNames.add(s.name);
      people.push({
        key: `staff:${s.name}`,
        name: s.name,
        type: "Staff",
        detail: s.role,
        email: staffEmail(s.name, domain),
        move: moves.find((m) => m.name === s.name),
      });
    }
    for (const m of moves) {
      if (staffNames.has(m.name)) continue;
      people.push({
        key: `staff:${m.name}`,
        name: m.name,
        type: "Staff",
        detail: m.role,
        email: staffEmail(m.name, domain),
        move: m,
      });
    }
    const parents = new Map<string, Learner[]>();
    for (const l of learners)
      for (const g of l.guardians ?? []) parents.set(g, [...(parents.get(g) ?? []), l]);
    for (const [name, kids] of parents) {
      people.push({
        key: `parent:${name}`,
        name,
        type: "Parent",
        detail: `Parent of ${kids.map((k) => k.name.split(" ")[0]).join(", ")}`,
        email: DIRECTORY_CONTACTS[name]?.email,
        phone: DIRECTORY_CONTACTS[name]?.phone,
        children: kids,
      });
    }

    const actionsFor = (p: Person) =>
      actions.filter((a) => (p.id ? a.subjectId === p.id : a.subject === p.name && !a.subjectId));
    const lifecycle = (p: Person) =>
      actionsFor(p).find(
        (a) => a.kind === "Provisioned" || a.kind === "Revoked" || a.kind === "Restored",
      );
    const isRevoked = (p: Person) =>
      p.learner ? !!p.learner.accessRevoked : lifecycle(p)?.kind === "Revoked";
    const goLive = ACCOUNTS_GO_LIVE[tenantId] ?? "2026-01-01";
    const isProvisioned = (p: Person) => {
      if (actionsFor(p).some((a) => a.kind === "Provisioned")) return true;
      if (p.type === "Parent") return true; // parents register their own 1StudentID
      if (p.type === "Staff") return p.move?.kind !== "Joiner";
      const l = p.learner!;
      return SEED_LEARNER_IDS.has(l.id) && (!l.startDate || l.startDate < goLive);
    };

    return {
      people,
      learners,
      actions,
      tickets,
      outbox,
      provider,
      systems: systemsForProvider(provider),
      goLive,
      lifecycle,
      isRevoked,
      isProvisioned,
      actionsFor,
    };
  }, [allLearners, allActions, allTickets, allOutbox, tenantId, ctx.profile]);
}

/** Who receives account emails: the guardian for family / guardian-mode pupils. */
function recipientFor(p: Person, ctx: TenantContext): string {
  if (p.learner) {
    const mode = studentAccountFor(p.learner, ctx.profile?.studentAccounts).mode;
    const g = p.learner.guardians?.[0];
    if (g && (mode !== "own" || ctx.type === "school")) {
      const e = DIRECTORY_CONTACTS[g]?.email;
      return e ? `${g} (${e})` : g;
    }
  }
  return p.email ? `${p.name} (${p.email})` : p.name;
}

/** Contact line for a ticket requester (guardian for family-operated accounts). */
function requesterContact(t: SupportTicket, learners: Learner[]): string {
  const name = t.actingAs ?? t.raisedBy;
  const email =
    DIRECTORY_CONTACTS[name]?.email ??
    learners.find((l) => l.name === name)?.email ??
    demoUsers.find((u) => u.name === name)?.email;
  return email ? `${name} (${email})` : name;
}

/* ── Lifecycle actions ───────────────────────────────────────────────────── */

function provision(p: Person, ctx: TenantContext, data: ItData) {
  const by = ctx.user?.name ?? "IT admin";
  const reason =
    p.type === "Staff"
      ? "New starter — staff"
      : `New starter${p.learner?.intake ? ` — ${p.learner.intake} intake` : ""}`;
  addItem("accountActions", {
    id: nextId("AA-", "accountActions"),
    tenantId: ctx.tenantId,
    subject: p.name,
    subjectId: p.id,
    subjectType: p.type,
    kind: "Provisioned",
    reason,
    systems: data.systems,
    by,
    at: nowIso(),
  });
  logChange({
    tenantId: ctx.tenantId,
    entity: "account",
    entityId: p.id ?? p.name,
    studentId: p.id,
    field: "Accounts",
    from: "None",
    to: data.systems.join(", "),
    by,
    reason,
  });
  notify({
    tenantId: ctx.tenantId,
    channel: "Email",
    to: recipientFor(p, ctx),
    subject: `Your ${ctx.tenantName} accounts are ready`,
    body: `Sign in as ${p.email ?? p.name} with ${PROVIDER_LABEL[data.provider]}. Set up: ${data.systems.join(", ")}.`,
    source: "IT · account",
    relatedId: p.id,
  });
  toast.success(`Accounts created for ${p.name}`, { description: data.systems.join(" · ") });
}

function revokeSystems(p: Person, data: ItData) {
  // A learner's 1StudentID is theirs for life — only this institution's systems close.
  return p.type === "Student" ? data.systems.filter((s) => s !== "1StudentID") : data.systems;
}

function revoke(p: Person, ctx: TenantContext, data: ItData, reason: string) {
  const by = ctx.user?.name ?? "IT admin";
  const systems = revokeSystems(p, data);
  if (p.learner)
    updateItem("learners", (l) => l.id === p.learner!.id, {
      accessRevoked: true,
    } as Partial<Learner>);
  addItem("accountActions", {
    id: nextId("AA-", "accountActions"),
    tenantId: ctx.tenantId,
    subject: p.name,
    subjectId: p.id,
    subjectType: p.type,
    kind: "Revoked",
    reason,
    systems,
    by,
    at: nowIso(),
  });
  logChange({
    tenantId: ctx.tenantId,
    entity: p.learner ? "learner" : "account",
    entityId: p.id ?? p.name,
    studentId: p.id,
    field: "Platform access",
    from: "Active",
    to: "Revoked",
    by,
    reason,
  });
  notify({
    tenantId: ctx.tenantId,
    channel: "Email",
    to: recipientFor(p, ctx),
    subject: `Access to ${ctx.tenantName} systems has been closed`,
    body:
      p.type === "Student"
        ? `Closed: ${systems.join(", ")}. The 1StudentID stays with ${p.name.split(" ")[0]} for life — records and certificates remain available.`
        : `Closed: ${systems.join(", ")}.`,
    source: "IT · account",
    relatedId: p.id,
  });
  toast.success(`Access revoked for ${p.name}`, { description: systems.join(" · ") });
}

function restore(p: Person, ctx: TenantContext, data: ItData) {
  const by = ctx.user?.name ?? "IT admin";
  const systems = revokeSystems(p, data);
  if (p.learner)
    updateItem("learners", (l) => l.id === p.learner!.id, {
      accessRevoked: false,
    } as Partial<Learner>);
  addItem("accountActions", {
    id: nextId("AA-", "accountActions"),
    tenantId: ctx.tenantId,
    subject: p.name,
    subjectId: p.id,
    subjectType: p.type,
    kind: "Restored",
    reason: "Restored by IT",
    systems,
    by,
    at: nowIso(),
  });
  logChange({
    tenantId: ctx.tenantId,
    entity: p.learner ? "learner" : "account",
    entityId: p.id ?? p.name,
    studentId: p.id,
    field: "Platform access",
    from: "Revoked",
    to: "Active",
    by,
  });
  notify({
    tenantId: ctx.tenantId,
    channel: "Email",
    to: recipientFor(p, ctx),
    subject: `Your ${ctx.tenantName} access is back on`,
    source: "IT · account",
    relatedId: p.id,
  });
  toast.success(`Access restored for ${p.name}`);
}

function resetPassword(p: Person, ctx: TenantContext, by: string) {
  addItem("accountActions", {
    id: nextId("AA-", "accountActions"),
    tenantId: ctx.tenantId,
    subject: p.name,
    subjectId: p.id,
    subjectType: p.type,
    kind: "Password reset",
    reason: by === p.name ? "Self-service reset" : "Reset by IT",
    systems: ["1StudentID"],
    by,
    at: nowIso(),
  });
  notify({
    tenantId: ctx.tenantId,
    channel: "Email",
    to: p.email ? `${p.name} (${p.email})` : p.name,
    subject: "Reset your 1StudentID password",
    body: "Use the link in this email within 24 hours to choose a new password.",
    source: "IT · account",
    relatedId: p.id,
  });
  toast.success("Reset link sent", { description: p.email ?? p.name });
}

/** Sign-in provider a person uses (parents always have their own 1StudentID login). */
function providerFor(p: Person, data: ItData): SignInProvider {
  return p.type === "Parent" ? "native" : data.provider;
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function ItPage() {
  const [picked, setPicked] = useState("T-010");
  const ctx = useTenantContext(picked);
  const tenants = useCollection("tenants");

  if (!ctx.user) return null;
  if (!ctx.isAdmin) return <HelpView ctx={ctx} />;

  return (
    <div>
      <PageHeader
        title="IT Administration"
        subtitle="Accounts, support desk and every automated message — in one place."
        actions={
          <>
            <Link to="/app/users">
              <Button variant="outline" size="sm">
                <ShieldCheck className="h-4 w-4" /> Users & Roles
              </Button>
            </Link>
            <Link to="/app/integrations">
              <Button variant="outline" size="sm">
                <Plug className="h-4 w-4" /> Integrations
              </Button>
            </Link>
          </>
        }
      />
      {ctx.isGlobalAdmin ? (
        <div className="flex flex-wrap items-center gap-2 text-xs mb-4 -mt-2">
          <span className="text-muted-foreground">Viewing tenant</span>
          <Select
            className="h-8 w-auto text-xs"
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            options={SEGMENT_TENANTS.map((id) => ({
              value: id,
              label: tenants.find((t) => t.id === id)?.name ?? id,
            }))}
          />
        </div>
      ) : (
        <PackContextBar />
      )}
      <AdminView ctx={ctx} key={ctx.tenantId} />
    </div>
  );
}

type AdminTab = "overview" | "accounts" | "lookup" | "desk" | "outbox";

function AdminView({ ctx }: { ctx: TenantContext }) {
  const data = useItData(ctx);
  const [tab, setTab] = useTab<AdminTab>("overview");
  const queues = useQueues(data);
  const openTickets = data.tickets.filter((t) => t.status !== "Resolved");
  const failed = data.outbox.filter((m) => m.status === "Failed").length;

  return (
    <>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          {
            id: "accounts",
            label: "Accounts",
            count: queues.starters.length + queues.leavers.length,
          },
          { id: "lookup", label: "Lookup" },
          { id: "desk", label: "Support desk", count: openTickets.length },
          { id: "outbox", label: "Outbox", count: failed || undefined },
        ]}
      />
      {tab === "overview" && <Overview ctx={ctx} data={data} queues={queues} go={setTab} />}
      {tab === "accounts" && <Accounts ctx={ctx} data={data} queues={queues} />}
      {tab === "lookup" && <Lookup ctx={ctx} data={data} />}
      {tab === "desk" && <SupportDesk ctx={ctx} data={data} />}
      {tab === "outbox" && <Outbox data={data} />}
    </>
  );
}

/* ── Queues ──────────────────────────────────────────────────────────────── */

interface Queues {
  starters: Person[];
  leavers: Person[];
  revoked: Person[];
}

function useQueues(data: ItData): Queues {
  return useMemo(() => {
    const soon = addDays(DEMO_TODAY, 14);
    const starters: Person[] = [];
    const leavers: Person[] = [];
    const revoked: Person[] = [];
    for (const p of data.people) {
      if (p.type === "Parent") continue;
      const isRevoked = data.isRevoked(p);
      if (isRevoked) {
        revoked.push(p);
        continue;
      }
      if (p.learner) {
        const l = p.learner;
        if (l.status === "Withdrawn" || l.status === "Graduated") {
          leavers.push(p);
          continue;
        }
        const startsSoon = !!l.startDate && l.startDate <= soon;
        if (
          !data.isProvisioned(p) &&
          (l.status === "Active" || (l.status === "Applicant" && startsSoon))
        )
          starters.push(p);
      } else if (p.move?.kind === "Leaver" && p.move.date <= soon) {
        leavers.push(p);
      } else if (!data.isProvisioned(p)) {
        starters.push(p);
      }
    }
    return { starters, leavers, revoked };
  }, [data]);
}

function startLabel(p: Person) {
  if (p.move) return fmtDate(p.move.date);
  if (p.learner?.startDate) return fmtDate(p.learner.startDate);
  return "—";
}

/* ── Overview ────────────────────────────────────────────────────────────── */

function Overview({
  ctx,
  data,
  queues,
  go,
}: {
  ctx: TenantContext;
  data: ItData;
  queues: Queues;
  go: (t: AdminTab) => void;
}) {
  const connections = useCollection("integrationConnections").filter(
    (c) => c.tenantId === ctx.tenantId,
  );
  const students = data.people.filter((p) => p.type === "Student");
  const staff = data.people.filter((p) => p.type === "Staff" && !data.isRevoked(p));
  const parents = data.people.filter((p) => p.type === "Parent");
  const accountHolders = data.people.filter((p) => p.type !== "Parent");
  const provisioned = accountHolders.filter(
    (p) => data.isProvisioned(p) && !data.isRevoked(p),
  ).length;
  const open = data.tickets.filter((t) => t.status !== "Resolved");
  const breached = open.filter((t) => slaInfo(t).breached).length;

  // 24 h window ending at the newest message (or the demo clock).
  const end = Math.max(Date.parse(DEMO_NOW), ...data.outbox.map((m) => Date.parse(m.at)));
  const recent = data.outbox.filter((m) => Date.parse(m.at) > end - 24 * HOUR);
  const byChannel = CHANNELS.map((c) => ({
    label: c,
    value: recent.filter((m) => m.channel === c).length,
  }));
  const recentFailed = recent.filter((m) => m.status === "Failed").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Learners"
          value={students.filter((p) => p.learner?.status === "Active").length}
          hint={`${students.length} on roll incl. interrupted / leavers`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Staff"
          value={staff.length}
          hint="From the HR feed"
          icon={<UserCheck className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Parents"
          value={parents.length}
          hint="Own 1StudentID sign-in"
          icon={<Users className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Open tickets"
          value={open.length}
          hint={breached ? `${breached} past SLA` : "All within SLA"}
          icon={<LifeBuoy className="h-4 w-4" />}
          accent={breached ? "destructive" : "success"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section
          title="Accounts"
          description={`Signed in with ${PROVIDER_LABEL[data.provider]}${ctx.profile?.studentAccounts?.domain ? ` · @${ctx.profile.studentAccounts.domain}` : ""}`}
          actions={
            <Button size="sm" variant="outline" onClick={() => go("accounts")}>
              Open queues
            </Button>
          }
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <Tile label="Provisioned" value={provisioned} tone="success" />
            <Tile
              label="Pending"
              value={queues.starters.length + queues.leavers.length}
              tone="warning"
              hint={`${queues.starters.length} new · ${queues.leavers.length} leaving`}
            />
            <Tile label="Revoked" value={queues.revoked.length} tone="muted" />
          </div>
        </Section>

        <Section
          title="Notifications · last 24 h"
          description={`${recent.length} sent by automations${recentFailed ? ` · ${recentFailed} failed` : ""}`}
          actions={
            <Button size="sm" variant="outline" onClick={() => go("outbox")}>
              Outbox
            </Button>
          }
        >
          <MiniBars data={byChannel} max={Math.max(1, ...byChannel.map((b) => b.value))} />
          <div className="grid grid-cols-4 text-center text-xs mt-1">
            {byChannel.map((b) => (
              <div key={b.label} className="font-semibold">
                {b.value}
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section
          title="Integrations health"
          actions={
            <Link to="/app/integrations">
              <Button size="sm" variant="outline">
                Manage
              </Button>
            </Link>
          }
        >
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No systems connected yet.</p>
          ) : (
            <ul className="divide-y -my-2">
              {connections.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {INTEGRATIONS.find((d) => d.key === c.key)?.name ?? c.key}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.lastSync ? `Last sync ${fmt(c.lastSync)}` : "Not synced yet"}
                      {c.detail ? ` · ${c.detail}` : ""}
                    </div>
                  </div>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="System health"
          description="Demo values — production reads these from monitoring."
        >
          <div className="grid grid-cols-2 gap-3">
            <HealthTile
              icon={<Activity className="h-4 w-4" />}
              label="Uptime (30 days)"
              value="99.98%"
            />
            <HealthTile
              icon={<Timer className="h-4 w-4" />}
              label="Page load (p95)"
              value="0.8 s"
            />
            <HealthTile
              icon={<KeyRound className="h-4 w-4" />}
              label="Sign-ins today"
              value="1,284"
            />
            <HealthTile
              icon={<HardDrive className="h-4 w-4" />}
              label="Last backup"
              value="02:00 · OK"
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: Tone;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1">
        <Badge tone={tone}>{label}</Badge>
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function HealthTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-3 flex items-center gap-3">
      <div className="p-2 rounded-md bg-success/15 text-success">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}

/* ── Accounts ────────────────────────────────────────────────────────────── */

const ACTION_TONE: Record<AccountAction["kind"], Tone> = {
  Provisioned: "success",
  Revoked: "destructive",
  Restored: "info",
  "Role changed": "default",
  "Password reset": "muted",
};

function Accounts({ ctx, data, queues }: { ctx: TenantContext; data: ItData; queues: Queues }) {
  const [kind, setKind] = useState("all");
  const audit = data.actions.filter((a) => kind === "all" || a.kind === kind);

  const exportAudit = () =>
    downloadCsv(
      `account-actions-${ctx.tenantId}.csv`,
      ["Id", "When", "Person", "1StudentID", "Type", "Action", "Systems", "Reason", "By"],
      audit.map((a) => [
        a.id,
        a.at,
        a.subject,
        a.subjectId ?? "",
        a.subjectType,
        a.kind,
        a.systems.join("; "),
        a.reason,
        a.by,
      ]),
    );

  return (
    <div className="space-y-4">
      <Section
        title={
          <span className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> New starters
          </span>
        }
        description={`Create accounts in: ${data.systems.join(", ")}. Learners starting within 14 days are included.`}
        actions={
          queues.starters.length > 1 && (
            <Button
              size="sm"
              onClick={() => queues.starters.forEach((p) => provision(p, ctx, data))}
            >
              Provision all ({queues.starters.length})
            </Button>
          )
        }
      >
        <DataTable
          rows={queues.starters}
          emptyText="Everyone who has started has an account."
          columns={[
            { key: "name", label: "Person" },
            { key: "type", label: "Type" },
            { key: "start", label: "Starts" },
            { key: "login", label: "Sign-in" },
            { key: "_actions", label: "", className: "text-right" },
          ]}
          renderCell={(p: Person, k) => {
            if (k === "name")
              return (
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.id ? `${p.id} · ` : ""}
                    {p.detail}
                  </div>
                </div>
              );
            if (k === "type") return <Badge tone="muted">{p.type}</Badge>;
            if (k === "start") return startLabel(p);
            if (k === "login") return <span className="text-xs">{p.email}</span>;
            return (
              <Button size="sm" onClick={() => provision(p, ctx, data)}>
                <UserPlus className="h-3.5 w-3.5" /> Provision
              </Button>
            );
          }}
        />
      </Section>

      <Section
        title={
          <span className="flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-destructive" /> Leavers
          </span>
        }
        description="Withdrawn or graduated learners and staff who have left. Revoking closes institution systems; a learner's 1StudentID stays theirs for life."
      >
        <DataTable
          rows={queues.leavers}
          emptyText="No leavers waiting. Withdrawals approved in Requests will appear here."
          columns={[
            { key: "name", label: "Person" },
            { key: "type", label: "Type" },
            { key: "why", label: "Reason" },
            { key: "_actions", label: "", className: "text-right" },
          ]}
          renderCell={(p: Person, k) => {
            if (k === "name")
              return (
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.id ? `${p.id} · ` : ""}
                    {p.detail}
                  </div>
                </div>
              );
            if (k === "type") return <Badge tone="muted">{p.type}</Badge>;
            if (k === "why")
              return p.learner ? (
                <StatusPill status={p.learner.status} />
              ) : (
                <span className="text-xs">
                  {p.move && p.move.date > DEMO_TODAY ? "Leaving" : "Left"}{" "}
                  {p.move ? fmtDate(p.move.date) : ""}
                </span>
              );
            return (
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  revoke(p, ctx, data, p.learner ? p.learner.status : "Left employment")
                }
              >
                <Lock className="h-3.5 w-3.5" /> Revoke access
              </Button>
            );
          }}
        />
      </Section>

      {queues.revoked.length > 0 && (
        <Section
          title="Revoked"
          description="Restore if someone returns or was revoked by mistake."
        >
          <div className="flex flex-wrap gap-2">
            {queues.revoked.map((p) => (
              <div key={p.key} className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
                <span className="text-sm">{p.name}</span>
                <Badge tone="muted">{p.type}</Badge>
                <Button size="sm" variant="ghost" onClick={() => restore(p, ctx, data)}>
                  <Undo2 className="h-3.5 w-3.5" /> Restore
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Audit log"
        description={`Every account action with who, what and when. Password resets: ${data.provider === "native" ? "from Lookup." : `students and staff reset at ${PROVIDER_LABEL[data.provider]}; parents from Lookup.`}`}
        actions={
          <>
            <Select
              className="h-8 w-auto text-xs"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              options={[
                { value: "all", label: "All actions" },
                ...Object.keys(ACTION_TONE).map((k) => ({ value: k, label: k })),
              ]}
            />
            <Button size="sm" variant="outline" onClick={exportAudit}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </>
        }
      >
        <DataTable
          rows={audit}
          columns={[
            { key: "at", label: "When" },
            { key: "subject", label: "Person" },
            { key: "kind", label: "Action" },
            { key: "systems", label: "Systems" },
            { key: "reason", label: "Reason" },
            { key: "by", label: "By" },
          ]}
          renderCell={(a: AccountAction, k) => {
            if (k === "at") return <span className="text-xs">{fmt(a.at)}</span>;
            if (k === "subject")
              return (
                <div>
                  <div className="font-medium">{a.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.subjectType}
                    {a.subjectId ? ` · ${a.subjectId}` : ""}
                  </div>
                </div>
              );
            if (k === "kind") return <Badge tone={ACTION_TONE[a.kind]}>{a.kind}</Badge>;
            if (k === "systems") return <span className="text-xs">{a.systems.join(", ")}</span>;
            if (k === "reason") return <span className="text-xs">{a.reason}</span>;
            return <span className="text-xs">{a.by}</span>;
          }}
        />
      </Section>
    </div>
  );
}

/* ── Lookup ──────────────────────────────────────────────────────────────── */

interface Hit {
  person: Person;
  matchedOn: string;
}

function search(people: Person[], q: string): Hit[] {
  const query = q.trim();
  if (query.length < 2) return [];
  const qa = alnum(query);
  const qd = digits(query);
  const hits: Hit[] = [];
  for (const p of people) {
    if (p.name.toLowerCase().includes(query.toLowerCase()))
      hits.push({ person: p, matchedOn: "Name" });
    else if (p.id && alnum(p.id).includes(qa)) hits.push({ person: p, matchedOn: "1StudentID" });
    else if (p.email && p.email.toLowerCase().includes(query.toLowerCase()))
      hits.push({ person: p, matchedOn: "Email" });
    else if (qd.length >= 4 && p.phone && digits(p.phone).includes(qd))
      hits.push({ person: p, matchedOn: "Phone" });
    else if (qa.length >= 4 && p.learner) {
      const hit = Object.entries(p.learner.officialIds ?? {}).find(([, v]) =>
        alnum(v).includes(qa),
      );
      if (hit)
        hits.push({
          person: p,
          matchedOn: `${ID_FIELDS[hit[0]]?.label ?? hit[0]} ${mask(hit[1])}`,
        });
    }
  }
  return hits.slice(0, 20);
}

function Lookup({ ctx, data }: { ctx: TenantContext; data: ItData }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const hits = useMemo(() => search(data.people, q), [data.people, q]);
  const person = data.people.find((p) => p.key === selected);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
      <Section title="Find a person" description="Name, 1StudentID, email, phone or official ID.">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <TextInput
            className="pl-9"
            placeholder="e.g. Arjun, S-4001, +44 7700, passport or Emirates ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>
        <ul className="mt-3 divide-y">
          {q.trim().length >= 2 && hits.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No one matches.</li>
          )}
          {hits.map((h) => (
            <li key={h.person.key}>
              <button
                onClick={() => setSelected(h.person.key)}
                className={`w-full text-left py-2 px-2 rounded-md hover:bg-muted/50 ${selected === h.person.key ? "bg-muted" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{h.person.name}</span>
                  <Badge tone="muted">{h.person.type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {h.person.id ? `${h.person.id} · ` : ""}
                  Matched on {h.matchedOn}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Section>
      {person ? (
        <PersonCard person={person} ctx={ctx} data={data} />
      ) : (
        <Section>
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
            Search and pick a person to see their account.
          </div>
        </Section>
      )}
    </div>
  );
}

function PersonCard({
  person: p,
  ctx,
  data,
}: {
  person: Person;
  ctx: TenantContext;
  data: ItData;
}) {
  const actions = data.actionsFor(p);
  const tickets = data.tickets.filter(
    (t) => t.status !== "Resolved" && (t.raisedBy === p.name || t.actingAs === p.name),
  );
  const revoked = data.isRevoked(p);
  const provisioned = data.isProvisioned(p);
  const provider = providerFor(p, data);
  const acct = p.learner ? studentAccountFor(p.learner, ctx.profile?.studentAccounts) : undefined;
  const state = revoked ? "Revoked" : provisioned ? "Active" : "Pending";
  const by = ctx.user?.name ?? "IT admin";

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          {p.name} <Badge tone="muted">{p.type}</Badge>
        </span>
      }
      description={[p.id, p.detail].filter(Boolean).join(" · ")}
      actions={
        <>
          {!provisioned && !revoked && (
            <Button size="sm" onClick={() => provision(p, ctx, data)}>
              <UserPlus className="h-3.5 w-3.5" /> Provision
            </Button>
          )}
          {p.type !== "Parent" && provisioned && !revoked && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                revoke(
                  p,
                  ctx,
                  data,
                  p.learner &&
                    (p.learner.status === "Withdrawn" || p.learner.status === "Graduated")
                    ? p.learner.status
                    : p.type === "Staff" && p.move?.kind === "Leaver"
                      ? "Left employment"
                      : "Suspended by IT",
                )
              }
            >
              <Lock className="h-3.5 w-3.5" /> Revoke access
            </Button>
          )}
          {revoked && (
            <Button size="sm" variant="outline" onClick={() => restore(p, ctx, data)}>
              <Undo2 className="h-3.5 w-3.5" /> Restore
            </Button>
          )}
        </>
      }
    >
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Item label="Account">
          <StatusPill status={state} />
        </Item>
        {p.learner && (
          <Item label="Record status">
            <StatusPill status={p.learner.status} />
          </Item>
        )}
        <Item label="Sign-in">
          <div>{PROVIDER_LABEL[provider]}</div>
          <div className="text-xs text-muted-foreground">{p.email ?? "No email on file"}</div>
        </Item>
        {acct && (
          <Item label="Who uses it">
            {ACCOUNT_MODE_LABEL[acct.mode]}
            {acct.band ? (
              <span className="text-xs text-muted-foreground"> · {acct.band}</span>
            ) : null}
          </Item>
        )}
        {p.phone && <Item label="Phone">{p.phone}</Item>}
        {p.learner?.guardians?.length ? (
          <Item label="Guardians">{p.learner.guardians.join(", ")}</Item>
        ) : null}
        {p.children && <Item label="Children">{p.children.map((c) => c.name).join(", ")}</Item>}
        {p.learner && Object.keys(p.learner.officialIds ?? {}).length > 0 && (
          <Item label="Official IDs">
            <div className="space-y-0.5">
              {Object.entries(p.learner.officialIds).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <span className="text-muted-foreground">{ID_FIELDS[k]?.label ?? k}</span>{" "}
                  <span className="font-mono">{mask(v)}</span>
                </div>
              ))}
            </div>
          </Item>
        )}
      </dl>

      <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          {provider === "native"
            ? "1StudentID sign-in — you can send a reset link."
            : `Password is held by ${PROVIDER_LABEL[provider]}. Reset it there (${PROVIDER_RESET[provider]}).`}
        </span>
        {provider === "native" && !revoked && (
          <Button size="sm" variant="outline" onClick={() => resetPassword(p, ctx, by)}>
            <Mail className="h-3.5 w-3.5" /> Send reset link
          </Button>
        )}
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Account actions
          </div>
          {actions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              None recorded{provisioned ? " — imported at go-live." : "."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {actions.map((a) => (
                <li key={a.id} className="text-xs">
                  <Badge tone={ACTION_TONE[a.kind]}>{a.kind}</Badge>{" "}
                  <span className="text-muted-foreground">
                    {fmt(a.at)} · {a.by}
                  </span>
                  <div className="text-muted-foreground">{a.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Open tickets
          </div>
          {tickets.length === 0 ? (
            <p className="text-xs text-muted-foreground">None.</p>
          ) : (
            <ul className="space-y-1.5">
              {tickets.map((t) => {
                const s = slaInfo(t);
                return (
                  <li key={t.id} className="text-xs">
                    <span className="font-medium">{t.id}</span> {t.subject}{" "}
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/* ── Support desk ────────────────────────────────────────────────────────── */

function SupportDesk({ ctx, data }: { ctx: TenantContext; data: ItData }) {
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const team = IT_TEAM[ctx.tenantId] ?? [];

  const rows = data.tickets.filter(
    (t) =>
      (status === "all" || (status === "active" ? t.status !== "Resolved" : t.status === status)) &&
      (priority === "all" || t.priority === priority) &&
      (category === "all" || t.category === category) &&
      (assignee === "all" || (assignee === "none" ? !t.assignee : t.assignee === assignee)),
  );
  const ticket = data.tickets.find((t) => t.id === selected);
  const open = data.tickets.filter((t) => t.status !== "Resolved");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Open" value={open.length} icon={<LifeBuoy className="h-4 w-4" />} />
        <StatCard
          label="Past SLA"
          value={open.filter((t) => slaInfo(t).breached).length}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent="destructive"
        />
        <StatCard
          label="Waiting on user"
          value={open.filter((t) => t.status === "Waiting on user").length}
          icon={<Timer className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Unassigned"
          value={open.filter((t) => !t.assignee).length}
          icon={<Users className="h-4 w-4" />}
          accent="warning"
        />
      </div>

      <Section
        title="Tickets"
        actions={
          <>
            <Select
              className="h-8 w-auto text-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "active", label: "Not resolved" },
                { value: "all", label: "All statuses" },
                ...TICKET_STATUSES.map((s) => ({ value: s, label: s })),
              ]}
            />
            <Select
              className="h-8 w-auto text-xs"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: "all", label: "All priorities" },
                ...TICKET_PRIORITIES.map((s) => ({ value: s, label: s })),
              ]}
            />
            <Select
              className="h-8 w-auto text-xs"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: "all", label: "All categories" },
                ...TICKET_CATEGORIES.map((s) => ({ value: s, label: s })),
              ]}
            />
            <Select
              className="h-8 w-auto text-xs"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              options={[
                { value: "all", label: "Anyone" },
                { value: "none", label: "Unassigned" },
                ...team.map((s) => ({ value: s, label: s })),
              ]}
            />
          </>
        }
      >
        <DataTable
          rows={rows}
          emptyText="No tickets match."
          columns={[
            { key: "subject", label: "Ticket" },
            { key: "priority", label: "Priority" },
            { key: "status", label: "Status" },
            { key: "assignee", label: "Assignee" },
            { key: "sla", label: "SLA" },
            { key: "_actions", label: "", className: "text-right" },
          ]}
          renderCell={(t: SupportTicket, k) => {
            if (k === "subject")
              return (
                <div className="min-w-0">
                  <div className="font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.id} · {t.actingAs ? `${t.actingAs} (for ${t.raisedBy})` : t.raisedBy} ·{" "}
                    {t.raisedByRole} · {t.category}
                  </div>
                </div>
              );
            if (k === "priority")
              return <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>;
            if (k === "status") return <StatusPill status={t.status} />;
            if (k === "assignee")
              return <span className="text-xs">{t.assignee ?? "Unassigned"}</span>;
            if (k === "sla") {
              const s = slaInfo(t);
              return <Badge tone={s.tone}>{s.label}</Badge>;
            }
            return (
              <Button
                size="sm"
                variant={selected === t.id ? "primary" : "outline"}
                onClick={() => setSelected(selected === t.id ? null : t.id)}
              >
                {selected === t.id ? "Close" : "Open"}
              </Button>
            );
          }}
        />
      </Section>

      {ticket && <TicketDetail ticket={ticket} ctx={ctx} data={data} staffView />}
    </div>
  );
}

function TicketDetail({
  ticket: t,
  ctx,
  data,
  staffView,
}: {
  ticket: SupportTicket;
  ctx: TenantContext;
  data: ItData;
  staffView?: boolean;
}) {
  const [text, setText] = useState("");
  const team = IT_TEAM[ctx.tenantId] ?? [];
  const me = staffView ? (ctx.user?.name ?? "IT") : ctx.actingAs;
  const s = slaInfo(t);

  const update = (patch: Partial<SupportTicket>, field: string, from?: string, to?: string) => {
    updateItem("supportTickets", (x) => x.id === t.id, { ...patch, updatedAt: nowIso() });
    logChange({
      tenantId: t.tenantId,
      entity: "ticket",
      entityId: t.id,
      field,
      from,
      to,
      by: me,
    });
  };

  const post = (internal: boolean) => {
    const body = text.trim();
    if (!body) return;
    const nextStatus: SupportTicket["status"] = internal
      ? t.status
      : staffView
        ? t.status === "Open"
          ? "In progress"
          : t.status
        : t.status === "Waiting on user" || t.status === "Resolved"
          ? "Open"
          : t.status;
    updateItem("supportTickets", (x) => x.id === t.id, {
      thread: [...t.thread, { by: me, at: nowIso(), text: body, internal: internal || undefined }],
      status: nextStatus,
      updatedAt: nowIso(),
    });
    if (staffView && !internal) {
      notify({
        tenantId: t.tenantId,
        channel: "Email",
        to: requesterContact(t, data.learners),
        subject: `Re: [${t.id}] ${t.subject}`,
        body,
        source: "IT · support desk",
        relatedId: t.id,
      });
    } else if (!staffView) {
      notify({
        tenantId: t.tenantId,
        channel: "App",
        to: t.assignee ?? "IT service desk",
        subject: `New reply on ${t.id}: ${t.subject}`,
        body,
        source: "IT · support desk",
        relatedId: t.id,
      });
    }
    setText("");
    toast.success(internal ? "Note added" : staffView ? "Reply sent to requester" : "Reply sent");
  };

  const thread = staffView ? t.thread : t.thread.filter((p) => !p.internal);

  return (
    <Section
      title={
        <span className="flex items-center gap-2 flex-wrap">
          {t.id} · {t.subject}
          <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
          <Badge tone={s.tone}>{s.label}</Badge>
        </span>
      }
      description={`${t.actingAs ? `${t.actingAs} (using ${t.raisedBy}'s account)` : t.raisedBy} · ${t.category} · raised ${fmt(t.createdAt)} · SLA ${t.slaHours} h`}
    >
      {staffView && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <Field label="Assignee">
            <Select
              value={t.assignee ?? ""}
              onChange={(e) => {
                const v = e.target.value || undefined;
                update({ assignee: v }, "assignee", t.assignee, v);
                if (v)
                  notify({
                    tenantId: t.tenantId,
                    channel: "App",
                    to: v,
                    subject: `Assigned to you: ${t.id} ${t.subject}`,
                    source: "IT · support desk",
                    relatedId: t.id,
                  });
                toast.success(v ? `Assigned to ${v}` : "Unassigned");
              }}
              options={[
                { value: "", label: "Unassigned" },
                ...[...team, ...(ctx.user ? [ctx.user.name] : [])].map((n) => ({
                  value: n,
                  label: n,
                })),
              ]}
            />
          </Field>
          <Field label="Status">
            <Select
              value={t.status}
              onChange={(e) => {
                const v = e.target.value as SupportTicket["status"];
                update({ status: v }, "status", t.status, v);
                if (v === "Resolved" || v === "Waiting on user")
                  notify({
                    tenantId: t.tenantId,
                    channel: "Email",
                    to: requesterContact(t, data.learners),
                    subject:
                      v === "Resolved"
                        ? `Resolved: [${t.id}] ${t.subject}`
                        : `We need your reply: [${t.id}] ${t.subject}`,
                    source: "IT · support desk",
                    relatedId: t.id,
                  });
                toast.success(`Status: ${v}`);
              }}
              options={TICKET_STATUSES.map((v) => ({ value: v, label: v }))}
            />
          </Field>
        </div>
      )}

      <ol className="space-y-2">
        {thread.map((p, i) => (
          <li
            key={i}
            className={`rounded-lg border p-3 text-sm ${p.internal ? "bg-warning/10 border-warning/40" : p.by === t.raisedBy || p.by === t.actingAs ? "bg-muted/40" : "bg-card"}`}
          >
            <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground">{p.by}</span>
              {fmt(p.at)}
              {p.internal && <Badge tone="warning">Internal note</Badge>}
            </div>
            {p.text}
          </li>
        ))}
      </ol>

      <div className="mt-3 space-y-2">
        <TextArea
          placeholder={
            staffView ? "Reply to the requester, or add an internal note" : "Add a reply"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 justify-end">
          {staffView && (
            <Button variant="outline" size="sm" onClick={() => post(true)} disabled={!text.trim()}>
              <StickyNote className="h-3.5 w-3.5" /> Internal note
            </Button>
          )}
          <Button size="sm" onClick={() => post(false)} disabled={!text.trim()}>
            <Send className="h-3.5 w-3.5" /> {staffView ? "Reply & email" : "Send reply"}
          </Button>
        </div>
      </div>
    </Section>
  );
}

/* ── Outbox ──────────────────────────────────────────────────────────────── */

function Outbox({ data }: { data: ItData }) {
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [q, setQ] = useState("");
  const sources = Array.from(new Set(data.outbox.map((m) => m.source))).sort();
  const rows = data.outbox.filter(
    (m) =>
      (channel === "all" || m.channel === channel) &&
      (status === "all" || m.status === status) &&
      (source === "all" || m.source === source) &&
      (!q.trim() || `${m.to} ${m.subject}`.toLowerCase().includes(q.trim().toLowerCase())),
  );

  const resend = (m: OutboxMessage) => {
    updateItem("outbox", (x) => x.id === m.id, {
      status: "Sent",
      at: nowIso(),
      body: `${m.body ? m.body + " · " : ""}Resent after failure.`,
    });
    toast.success(`Resent ${m.channel} to ${m.to.split(" (")[0]}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CHANNELS.map((c) => (
          <StatCard
            key={c}
            label={c}
            value={data.outbox.filter((m) => m.channel === c).length}
            hint={`${data.outbox.filter((m) => m.channel === c && m.status === "Failed").length} failed`}
            icon={<MessageSquare className="h-4 w-4" />}
            accent={
              c === "Email"
                ? "primary"
                : c === "SMS"
                  ? "warning"
                  : c === "WhatsApp"
                    ? "success"
                    : "info"
            }
          />
        ))}
      </div>
      <Section
        title="Outbox"
        description="Every automated email, SMS, WhatsApp and app message this institution sends."
        actions={
          <>
            <TextInput
              className="h-8 w-40 text-xs"
              placeholder="Search to / subject"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              className="h-8 w-auto text-xs"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              options={[
                { value: "all", label: "All channels" },
                ...CHANNELS.map((c) => ({ value: c, label: c })),
              ]}
            />
            <Select
              className="h-8 w-auto text-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "Sent", label: "Sent" },
                { value: "Queued", label: "Queued" },
                { value: "Failed", label: "Failed" },
              ]}
            />
            <Select
              className="h-8 w-auto text-xs"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              options={[
                { value: "all", label: "All sources" },
                ...sources.map((s) => ({ value: s, label: s })),
              ]}
            />
          </>
        }
      >
        <DataTable
          rows={rows}
          emptyText="No messages match."
          columns={[
            { key: "at", label: "Time" },
            { key: "channel", label: "Channel" },
            { key: "to", label: "To" },
            { key: "subject", label: "Subject" },
            { key: "source", label: "Source" },
            { key: "status", label: "Status" },
            { key: "_actions", label: "", className: "text-right" },
          ]}
          renderCell={(m: OutboxMessage, k) => {
            if (k === "at") return <span className="text-xs whitespace-nowrap">{fmt(m.at)}</span>;
            if (k === "channel") return <Badge tone="muted">{m.channel}</Badge>;
            if (k === "to") return <span className="text-xs">{m.to}</span>;
            if (k === "subject")
              return (
                <div className="text-xs">
                  <div className="font-medium text-sm">{m.subject}</div>
                  {m.body && <div className="text-muted-foreground line-clamp-1">{m.body}</div>}
                </div>
              );
            if (k === "source") return <span className="text-xs">{m.source}</span>;
            if (k === "status") return <Badge tone={OUTBOX_TONE[m.status]}>{m.status}</Badge>;
            return m.status === "Failed" ? (
              <Button size="sm" variant="outline" onClick={() => resend(m)}>
                <RefreshCw className="h-3.5 w-3.5" /> Resend
              </Button>
            ) : null;
          }}
        />
      </Section>
    </div>
  );
}

/* ── IT Help (teachers, students, parents) ───────────────────────────────── */

function HelpView({ ctx }: { ctx: TenantContext }) {
  const data = useItData(ctx);
  const raise = useDisclosure();
  const [form, setForm] = useState({
    category: "Account & password" as SupportTicket["category"],
    subject: "",
    detail: "",
    priority: "Normal" as SupportTicket["priority"],
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const user = ctx.user!;
  const mine = data.tickets.filter((t) => t.raisedBy === user.name);
  const provider: SignInProvider =
    user.role === "parent" ? "native" : (ctx.account?.provider ?? data.provider);
  const login =
    ctx.account?.login ??
    (user.role === "teacher"
      ? staffEmail(user.name, ctx.profile?.studentAccounts?.domain)
      : (DIRECTORY_CONTACTS[user.name]?.email ?? user.email));

  const openRaise = (preset?: Partial<typeof form>) => {
    setForm({
      category: "Account & password",
      subject: "",
      detail: "",
      priority: "Normal",
      ...preset,
    });
    raise.onOpen();
  };

  const submit = () => {
    if (!form.subject.trim() || !form.detail.trim()) {
      toast.error("Add a subject and some detail");
      return;
    }
    const id = nextId("TKT-", "supportTickets");
    const at = nowIso();
    const ticket: SupportTicket = {
      id,
      tenantId: ctx.tenantId,
      raisedBy: user.name,
      raisedByRole: user.role,
      actingAs: ctx.familyOperated ? ctx.guardianName : undefined,
      category: form.category,
      subject: form.subject.trim(),
      detail: form.detail.trim(),
      priority: form.priority,
      status: "Open",
      createdAt: at,
      updatedAt: at,
      slaHours: SLA_HOURS[form.priority],
      thread: [{ by: ctx.actingAs, at, text: form.detail.trim() }],
    };
    addItem("supportTickets", ticket);
    notify({
      tenantId: ctx.tenantId,
      channel: "Email",
      to: requesterContact(ticket, data.learners),
      subject: `We've received your request [${id}] ${ticket.subject}`,
      body: `We aim to respond within ${ticket.slaHours} hours.`,
      source: "IT · support desk",
      relatedId: id,
    });
    notify({
      tenantId: ctx.tenantId,
      channel: "App",
      to: "IT service desk",
      subject: `New ${ticket.priority.toLowerCase()} ticket ${id}: ${ticket.subject}`,
      source: "IT · support desk",
      relatedId: id,
    });
    raise.onClose();
    setOpenId(id);
    toast.success(`Ticket ${id} raised`, { description: "We've emailed you a confirmation." });
  };

  const meAsPerson: Person = {
    key: `self:${user.name}`,
    name: user.name,
    type: user.role === "parent" ? "Parent" : user.role === "student" ? "Student" : "Staff",
    id: user.role === "student" ? user.oneEduId : undefined,
    detail: "",
    email: login,
  };

  return (
    <div>
      <PageHeader
        title="IT Help"
        subtitle="Get help with your account, devices and software."
        actions={
          <Button onClick={() => openRaise()}>
            <Plus className="h-4 w-4" /> Raise a ticket
          </Button>
        }
      />
      <PackContextBar />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4">
        <Section
          title={
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Reset my password
            </span>
          }
        >
          <div className="text-sm space-y-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">You sign in with</div>
              <div className="font-medium">{PROVIDER_LABEL[provider]}</div>
              <div className="text-xs text-muted-foreground">{login}</div>
            </div>
            {ctx.familyOperated ? (
              <>
                <p>
                  This is {user.name.split(" ")[0]}'s school {PROVIDER_LABEL[provider]} account,
                  used by the family. The school's IT team resets it and sends the new password to{" "}
                  {ctx.guardianName}.
                </p>
                <Button
                  variant="outline"
                  onClick={() =>
                    openRaise({
                      subject: `Password reset for ${user.name}`,
                      detail: `Please reset ${user.name}'s school account password and send it to ${ctx.guardianName}.`,
                    })
                  }
                >
                  <LifeBuoy className="h-4 w-4" /> Ask IT to reset
                </Button>
              </>
            ) : provider === "native" ? (
              <>
                <p>We'll email you a link to choose a new password.</p>
                <Button onClick={() => resetPassword(meAsPerson, ctx, user.name)}>
                  <Mail className="h-4 w-4" /> Email me a reset link
                </Button>
              </>
            ) : (
              <>
                <p>
                  Your password is managed by {PROVIDER_LABEL[provider]} — 1StudentID never stores
                  it. Reset it with {PROVIDER_RESET[provider]}.
                </p>
                <Button
                  variant="outline"
                  onClick={() =>
                    openRaise({
                      subject: "Can't reset my password",
                      detail: "I tried the self-service reset but it didn't work.",
                    })
                  }
                >
                  <LifeBuoy className="h-4 w-4" /> Still stuck? Ask IT
                </Button>
              </>
            )}
          </div>
        </Section>

        <Section title="My tickets" description="Replies from IT are also emailed to you.">
          {mine.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <MonitorCog className="h-6 w-6 mx-auto mb-2 opacity-50" />
              No tickets yet.
            </div>
          ) : (
            <ul className="divide-y -my-2">
              {mine.map((t) => (
                <li key={t.id} className="py-2">
                  <button
                    className="w-full text-left flex items-center justify-between gap-3"
                    onClick={() => setOpenId(openId === t.id ? null : t.id)}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{t.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.id} · {t.category} · {fmt(t.createdAt)}
                        {t.assignee ? ` · ${t.assignee}` : ""}
                      </div>
                    </div>
                    <StatusPill status={t.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {(() => {
        const t = mine.find((x) => x.id === openId);
        return t ? (
          <div className="mt-4">
            <TicketDetail ticket={t} ctx={ctx} data={data} />
          </div>
        ) : null;
      })()}

      <FormDialog
        open={raise.open}
        onOpenChange={raise.setOpen}
        title="Raise a ticket"
        description={
          ctx.familyOperated
            ? `Raised as ${ctx.guardianName} using ${user.name}'s account.`
            : "IT will reply here and by email."
        }
        submitLabel="Raise ticket"
        onSubmit={submit}
      >
        <Field label="Category" required>
          <Select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as SupportTicket["category"] })
            }
            options={TICKET_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Priority" hint={`Response within ${SLA_HOURS[form.priority]} h`}>
          <Select
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value as SupportTicket["priority"] })
            }
            options={TICKET_PRIORITIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Subject" required className="sm:col-span-2">
          <TextInput
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="e.g. Can't open Teams on my laptop"
          />
        </Field>
        <Field label="Detail" required className="sm:col-span-2">
          <TextArea
            value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })}
            placeholder="What happened, and what have you tried?"
          />
        </Field>
      </FormDialog>
    </div>
  );
}
