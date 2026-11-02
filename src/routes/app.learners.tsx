import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Download,
  Eye,
  EyeOff,
  FileText,
  Globe,
  GraduationCap,
  HeartHandshake,
  History,
  IdCard,
  Languages,
  Pencil,
  Plane,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  Button,
  Field,
  Select,
  TextInput,
  FormDialog,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackContextBar, StatusPill, Tabs } from "@/components/packs/PackUI";
import { addItem, nextId, updateItem, useCollection } from "@/lib/store";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import { idFieldsFor, ID_FIELDS } from "@/lib/packs/regions";
import {
  ACCOUNT_MODE_LABEL,
  currentTerm,
  DEMO_TODAY,
  PROVIDER_LABEL,
  studentAccountFor,
  type Learner,
} from "@/lib/packs/foundationData";
import { TENANT_STAFF } from "@/lib/packs/opsData";
import { logChange, notify } from "@/lib/packs/sis/activity";
import type { ChangeLogEntry } from "@/lib/packs/sis/shared";
import {
  learnerContacts,
  type DocAudience,
  type DocKind,
  type EmploymentRecord,
  type LearnerDocument,
  type PriorQualification,
} from "@/lib/packs/sis/records";

export const Route = createFileRoute("/app/learners")({
  head: () => ({ meta: [{ title: "Student Records — 1StudentID" }] }),
  component: LearnersPage,
});

type TenantCtx = ReturnType<typeof useTenantContext>;
type RecordTab = "overview" | "documents" | "quals" | "history";

const STATUSES: Learner["status"][] = [
  "Active",
  "Applicant",
  "Interrupted",
  "Deferred",
  "Withdrawn",
  "Graduated",
];

const DOC_KINDS: DocKind[] = [
  "Passport / visa",
  "Identity document",
  "Transcript",
  "Certificate",
  "Offer / contract",
  "Consent form",
  "Medical",
  "Other",
];
/** Document kinds that carry an expiry date and get the 60-day warning. */
const EXPIRING_KINDS: DocKind[] = ["Passport / visa", "Identity document"];
const AUDIENCES: DocAudience[] = ["admin", "teacher", "student", "parent"];

const daysUntil = (iso: string) =>
  Math.round((new Date(iso).getTime() - new Date(DEMO_TODAY).getTime()) / 86400000);

const fmtDay = (iso: string) =>
  new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function mask(v: string) {
  if (v.length <= 4) return "••••";
  return "•".repeat(Math.max(4, v.length - 4)) + v.slice(-4);
}

/** Short mask used in search hits, history and exports: "••••4112". */
const maskTail = (v: string) => `••••${v.slice(-4)}`;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const digitsOf = (s: string) => s.replace(/\D/g, "").replace(/^0+/, "");

/** Official id as it may appear in history / exports — sensitive ids masked. */
const shownId = (key: string, v?: string) =>
  !v ? "—" : ID_FIELDS[key]?.sensitive ? maskTail(v) : v;

const contactFor = (id: string) => learnerContacts.find((c) => c.studentId === id);

/** Document audiences the signed-in user belongs to ("all" for admins). */
function viewerAudiences(ctx: TenantCtx): DocAudience[] | "all" {
  const role = ctx.user?.role;
  if (role === "admin") return "all";
  if (role === "teacher") return ["teacher"];
  if (role === "parent") return ["parent"];
  // Family-operated pupil accounts are used by the parent.
  return ctx.familyOperated ? ["parent", "student"] : ["student"];
}

const canSeeDoc = (d: LearnerDocument, aud: DocAudience[] | "all") =>
  aud === "all" || d.visibleTo.some((a) => aud.includes(a));

const expiringSoon = (d: LearnerDocument) =>
  !!d.expires && EXPIRING_KINDS.includes(d.kind) && daysUntil(d.expires) <= 60;

/** Who gets messages about a learner: guardian for school-age pupils, else the learner. */
const contactName = (l: Learner) => (l.guardians?.length ? l.guardians[0] : l.name);

function registryName(tenantId: string) {
  return TENANT_STAFF[tenantId]?.[0]?.name ?? "Registry";
}

/** Match a learner against the list search. Admins also match phone and official ids. */
function searchHit(l: Learner, q: string, admin: boolean): { hit: boolean; via?: string } {
  const ql = q.trim().toLowerCase();
  if (!ql) return { hit: true };
  const text =
    `${l.name} ${l.id} ${l.group ?? ""} ${l.level} ${l.email} ${(l.guardians ?? []).join(" ")}`.toLowerCase();
  if (text.includes(ql)) return { hit: true };
  if (!admin) return { hit: false };
  const c = contactFor(l.id);
  const dq = digitsOf(q);
  if (dq.length >= 4) {
    for (const p of [c?.phone, c?.guardianPhone]) {
      if (p && digitsOf(p).includes(dq)) return { hit: true, via: `Phone ${maskTail(p)}` };
    }
  }
  const nq = norm(q);
  if (nq.length >= 3) {
    for (const [k, v] of Object.entries(l.officialIds)) {
      if (v && norm(v).includes(nq))
        return { hit: true, via: `${ID_FIELDS[k]?.label ?? k} ${maskTail(v)}` };
    }
  }
  return { hit: false };
}

/** Resolve the learner's course of study across packs (curriculum / programme / qualification). */
function useStudyLabel() {
  const curricula = useCollection("curricula");
  const programmes = useCollection("programmes");
  const quals = useCollection("qualifications");
  return (l: Learner) => {
    if (l.programmeId) return programmes.find((p) => p.id === l.programmeId)?.name ?? l.programmeId;
    if (l.qualificationId) {
      const q = quals.find((x) => x.id === l.qualificationId);
      return q ? `${q.code} ${q.title}` : l.qualificationId;
    }
    if (l.curriculumId)
      return curricula.find((c) => c.id === l.curriculumId)?.name ?? l.curriculumId;
    return "—";
  };
}

function remindExpiry(d: LearnerDocument, l: Learner) {
  notify({
    tenantId: l.tenantId,
    channel: "Email",
    to: `${contactName(l)} (${l.email})`,
    subject: `${d.title} for ${l.name} expires ${fmtDay(d.expires!)}`,
    body: "Please upload the renewed document to the student record so it can be verified.",
    source: "Student Records · document expiry",
    relatedId: d.id,
  });
  toast.success(`Reminder sent to ${contactName(l)}`);
}

function LearnersPage() {
  const ctx = useTenantContext();
  const learners = useScopedLearners();
  const calendars = useCollection("academicCalendars");
  const allDocs = useCollection("learnerDocuments");
  const study = useStudyLabel();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<{ id: string; tab: RecordTab } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const role = ctx.user?.role;
  const staff = role === "admin" || role === "teacher";
  const idDefs = idFieldsFor(ctx.profile?.region ?? "GLOBAL", ctx.type, ctx.profile?.idFields);
  const aud = viewerAudiences(ctx);

  const { rows, via } = useMemo(() => {
    const via = new Map<string, string>();
    const rows = learners.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      const m = searchHit(l, q, ctx.isAdmin);
      if (m.via) via.set(l.id, m.via);
      return m.hit;
    });
    return { rows, via };
  }, [learners, q, status, ctx.isAdmin]);

  const missingIds = learners.filter((l) =>
    idDefs.some(
      (f) => f.key !== "passport" && f.key !== "cas" && f.key !== "coe" && !l.officialIds[f.key],
    ),
  );
  const visaSoon = learners.filter((l) => l.visa && daysUntil(l.visa.expiry) < 180);
  const support = learners.filter((l) => l.supportPlan || l.eal);
  const sponsored = learners.filter((l) => l.visa?.sponsored);

  // Passport / visa / id documents expiring within 60 days, for learners this user can see.
  const expiring = allDocs
    .filter((d) => learners.some((l) => l.id === d.studentId) && canSeeDoc(d, aud))
    .filter(expiringSoon)
    .sort((a, b) => a.expires!.localeCompare(b.expires!));
  const docAlert = new Set(expiring.map((d) => d.studentId));

  const title =
    role === "parent" ? "My Children" : role === "student" ? "My Record" : "Student Records";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={
          staff
            ? "One permanent 1StudentID per learner for life. Official identifiers follow this tenant's region; sensitive ids are masked and every reveal is audited."
            : "Your record held by the institution — identifiers, programme, documents and support details."
        }
        actions={
          role === "admin" && (
            <>
              <Link to="/app/admissions">
                <Button variant="outline">From admissions</Button>
              </Link>
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" /> Add student
              </Button>
            </>
          )
        }
      />
      <PackContextBar />

      {staff && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="On roll"
            value={learners.filter((l) => l.status === "Active").length}
            hint={`${learners.length} records`}
            icon={<IdCard className="h-4 w-4" />}
          />
          <StatCard
            label="Missing official ids"
            value={missingIds.length}
            hint={idDefs
              .map((d) => d.label)
              .slice(0, 3)
              .join(" · ")}
            accent={missingIds.length ? "warning" : "success"}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <StatCard
            label="Visa-sponsored"
            value={sponsored.length}
            hint={`${visaSoon.length} expiring < 6 months`}
            accent="info"
            icon={<Plane className="h-4 w-4" />}
          />
          <StatCard
            label="Support / EAL"
            value={support.length}
            hint="Learning-support plans & English as an additional language"
            accent="primary"
            icon={<HeartHandshake className="h-4 w-4" />}
          />
        </div>
      )}

      {expiring.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
          <div className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            {expiring.length} document{expiring.length > 1 ? "s" : ""} expiring within 60 days
          </div>
          <div className="space-y-1.5">
            {expiring.map((d) => {
              const l = learners.find((x) => x.id === d.studentId)!;
              const days = daysUntil(d.expires!);
              return (
                <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{l.name}</span>
                  <span className="text-muted-foreground">· {d.title}</span>
                  <Badge tone={days < 0 ? "destructive" : "warning"}>
                    {days < 0 ? "Expired" : `${days} days`} · {fmtDay(d.expires!)}
                  </Badge>
                  <span className="ml-auto flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpen({ id: l.id, tab: "documents" })}
                    >
                      Open documents
                    </Button>
                    {ctx.isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => remindExpiry(d, l)}>
                        <Send className="h-3.5 w-3.5" /> Remind
                      </Button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {staff ? (
        <Section
          title="Learners"
          actions={
            <>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <TextInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    ctx.isAdmin
                      ? "Name, 1StudentID, email, phone, NIC / passport…"
                      : "Search name, id, group"
                  }
                  className={`pl-8 ${ctx.isAdmin ? "w-72" : "w-56"}`}
                />
              </div>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={["all", ...STATUSES].map((s) => ({
                  value: s,
                  label: s === "all" ? "All statuses" : s,
                }))}
                className="w-40"
              />
            </>
          }
        >
          <DataTable
            columns={[
              { key: "name", label: "Student" },
              { key: "level", label: "Year / level" },
              { key: "study", label: "Curriculum / programme" },
              { key: "calendar", label: "Calendar" },
              { key: "flags", label: "Flags" },
              { key: "status", label: "Status" },
              { key: "_actions", label: "" },
            ]}
            rows={rows}
            renderCell={(l: Learner, key) => {
              if (key === "name")
                return (
                  <button
                    className="flex items-center gap-2.5 text-left"
                    onClick={() => setOpen({ id: l.id, tab: "overview" })}
                  >
                    <Avatar name={l.name} size={32} />
                    <span>
                      <span className="font-medium block hover:underline">{l.name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{l.id}</span>
                      {via.get(l.id) && (
                        <span className="block text-[11px] text-primary">
                          Matched {via.get(l.id)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              if (key === "level")
                return (
                  <span>
                    {l.level}
                    {l.group && (
                      <span className="block text-[11px] text-muted-foreground">{l.group}</span>
                    )}
                  </span>
                );
              if (key === "study") return <span className="text-xs">{study(l)}</span>;
              if (key === "calendar") {
                const cal = calendars.find((c) => c.id === l.calendarId);
                const t = cal && currentTerm(cal);
                return (
                  <span className="text-xs">
                    {cal?.name ?? "—"}
                    {t && (
                      <span className="block text-[11px] text-muted-foreground">Now: {t.name}</span>
                    )}
                  </span>
                );
              }
              if (key === "flags") return <Flags l={l} docAlert={docAlert.has(l.id)} />;
              if (key === "status") return <StatusPill status={l.status} />;
              if (key === "_actions")
                return (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpen({ id: l.id, tab: "overview" })}
                  >
                    Open
                  </Button>
                );
              return null;
            }}
            emptyText={
              q
                ? "No learner matches that search."
                : "No learners for this tenant yet — enrol from Admissions."
            }
          />
        </Section>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {learners.map((l) => (
            <LearnerCard
              key={l.id}
              l={l}
              onOpen={() => setOpen({ id: l.id, tab: "overview" })}
              study={study(l)}
              docAlert={docAlert.has(l.id)}
            />
          ))}
          {learners.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No linked student records at this institution.
            </p>
          )}
        </div>
      )}

      <LearnerDialog
        learnerId={open?.id ?? null}
        initialTab={open?.tab ?? "overview"}
        onClose={() => setOpen(null)}
      />
      <AddLearnerDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function Flags({ l, docAlert }: { l: Learner; docAlert?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {l.visa?.sponsored && (
        <Badge tone={daysUntil(l.visa.expiry) < 180 ? "warning" : "info"}>
          <Plane className="h-3 w-3 mr-1" /> Visa
        </Badge>
      )}
      {docAlert && (
        <Badge tone="warning">
          <FileText className="h-3 w-3 mr-1" /> Doc expiring
        </Badge>
      )}
      {l.eal && (
        <Badge tone="muted">
          <Languages className="h-3 w-3 mr-1" /> EAL
        </Badge>
      )}
      {l.supportPlan && (
        <Badge tone="default">
          <HeartHandshake className="h-3 w-3 mr-1" /> Support
        </Badge>
      )}
      {l.mode === "Apprenticeship" && <Badge tone="warning">Apprentice</Badge>}
      {l.startDate && l.startDate > DEMO_TODAY && (
        <Badge tone="info">Starts {fmtDay(l.startDate)}</Badge>
      )}
    </div>
  );
}

function LearnerCard({
  l,
  onOpen,
  study,
  docAlert,
}: {
  l: Learner;
  onOpen: () => void;
  study: string;
  docAlert?: boolean;
}) {
  const calendars = useCollection("academicCalendars");
  const cal = calendars.find((c) => c.id === l.calendarId);
  const t = cal && currentTerm(cal);
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-xl border bg-card p-4 shadow-soft hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Avatar name={l.name} size={44} />
        <div className="min-w-0">
          <div className="font-semibold">{l.name}</div>
          <div className="text-xs text-muted-foreground">
            {l.level} {l.group && `· ${l.group}`} · <span className="font-mono">{l.id}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs space-y-1">
        <div>{study}</div>
        <div className="text-muted-foreground">
          {cal?.name}
          {t && ` · now ${t.name}`}
        </div>
      </div>
      <div className="mt-2">
        <Flags l={l} docAlert={docAlert} />
      </div>
    </button>
  );
}

/* ── Record dialog ───────────────────────────────────────────────────────── */

function LearnerDialog({
  learnerId,
  initialTab,
  onClose,
}: {
  learnerId: string | null;
  initialTab: RecordTab;
  onClose: () => void;
}) {
  const all = useCollection("learners");
  const l = learnerId ? all.find((x) => x.id === learnerId) : undefined;
  return (
    <Dialog open={!!l} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        {l && <RecordBody key={`${l.id}-${initialTab}`} l={l} initialTab={initialTab} />}
      </DialogContent>
    </Dialog>
  );
}

function RecordBody({ l, initialTab }: { l: Learner; initialTab: RecordTab }) {
  const ctx = useTenantContext();
  const study = useStudyLabel();
  const [tab, setTab] = useState<RecordTab>(initialTab);
  const aud = viewerAudiences(ctx);
  const docs = useCollection("learnerDocuments").filter(
    (d) => d.studentId === l.id && canSeeDoc(d, aud),
  );
  const quals = useCollection("priorQualifications").filter((x) => x.studentId === l.id);
  const emps = useCollection("employmentRecords").filter((x) => x.studentId === l.id);
  const changeLog = useCollection("changeLog");
  const log = changeLog
    .filter((e) => e.studentId === l.id || (e.entity === "learner" && e.entityId === l.id))
    .sort((a, b) => b.at.localeCompare(a.at));

  const tabs: { id: RecordTab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "documents", label: "Documents", count: docs.length },
    { id: "quals", label: "Qualifications & employment", count: quals.length + emps.length },
    ...(ctx.isAdmin ? [{ id: "history" as const, label: "History", count: log.length }] : []),
  ];

  const exportRows = () =>
    recordRows(l, ctx, study(l), docs, quals, emps, log).map((r) => r.map((c) => c ?? ""));
  const audit = (to: string) =>
    logChange({
      tenantId: l.tenantId,
      entity: "learner",
      entityId: l.id,
      studentId: l.id,
      field: "Record exported",
      to,
      by: ctx.actingAs,
    });
  const downloadCsv = () => {
    const csv = exportRows()
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${l.id}-student-record-${DEMO_TODAY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    audit("CSV download");
    toast.success("Record exported", { description: "Sensitive identifiers are masked." });
  };
  const printView = () => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Allow pop-ups to open the print view");
      return;
    }
    w.document.write(printHtml(l, ctx.tenantName, exportRows()));
    w.document.close();
    w.focus();
    w.print();
    audit("Print view");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 pr-6">
          <Avatar name={l.name} size={40} />
          <span className="min-w-0 flex-1">
            {l.name}
            <span className="block text-xs font-normal text-muted-foreground">
              1StudentID <span className="font-mono">{l.id}</span> · {l.level}
              {l.group && ` · ${l.group}`}
            </span>
          </span>
          {ctx.isAdmin && (
            <span className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={downloadCsv}>
                <Download className="h-3.5 w-3.5" /> Export record
              </Button>
              <Button size="sm" variant="ghost" onClick={printView} aria-label="Print record">
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </span>
          )}
        </DialogTitle>
      </DialogHeader>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "overview" && <OverviewTab l={l} study={study(l)} />}
      {tab === "documents" && <DocumentsTab l={l} docs={docs} />}
      {tab === "quals" && <QualificationsTab l={l} quals={quals} emps={emps} />}
      {tab === "history" && ctx.isAdmin && <HistoryTab log={log} />}
    </>
  );
}

/* ── Overview ────────────────────────────────────────────────────────────── */

function OverviewTab({ l, study }: { l: Learner; study: string }) {
  const ctx = useTenantContext();
  const calendars = useCollection("academicCalendars");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [idReason, setIdReason] = useState("");
  const [newStatus, setNewStatus] = useState<Learner["status"]>(l.status);
  const [statusReason, setStatusReason] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState(false);
  const idDefs = idFieldsFor(ctx.profile?.region ?? "GLOBAL", ctx.type, ctx.profile?.idFields);
  // Ids held on the record but not configured for this tenant/region — kept, shown separately.
  const otherIds = Object.keys(l.officialIds).filter((k) => !idDefs.some((d) => d.key === k));
  const cal = calendars.find((c) => c.id === l.calendarId);
  const isAdmin = ctx.isAdmin;
  const canSeeSensitive =
    isAdmin || ctx.user?.oneEduId === l.id || l.guardians?.includes(ctx.user?.name ?? "");
  const contact = contactFor(l.id);

  const reveal = (k: string) => {
    setRevealed((s) => new Set(s).add(k));
    if (isAdmin) toast.message(`Access to ${ID_FIELDS[k]?.label ?? k} logged to the audit trail`);
  };
  const save = () => {
    const changed = Object.entries(draft)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([k, v]) => (l.officialIds[k] ?? "") !== v);
    if (changed.length) {
      const next = { ...l.officialIds };
      for (const [k, v] of changed) {
        if (v) next[k] = v;
        else delete next[k];
      }
      updateItem("learners", (x) => x.id === l.id, { officialIds: next });
      for (const [k, v] of changed)
        logChange({
          tenantId: l.tenantId,
          entity: "learner",
          entityId: l.id,
          studentId: l.id,
          field: ID_FIELDS[k]?.label ?? k,
          from: shownId(k, l.officialIds[k]),
          to: shownId(k, v),
          by: ctx.actingAs,
          reason: idReason.trim() || undefined,
        });
      toast.success(
        `${changed.length} identifier${changed.length > 1 ? "s" : ""} updated — logged to History`,
      );
    }
    setEditing(false);
    setDraft({});
    setIdReason("");
  };
  const saveStatus = () => {
    if (newStatus === l.status) return;
    if (!statusReason.trim()) {
      toast.error("Give a reason for the status change");
      return;
    }
    updateItem("learners", (x) => x.id === l.id, { status: newStatus });
    logChange({
      tenantId: l.tenantId,
      entity: "learner",
      entityId: l.id,
      studentId: l.id,
      field: "Status",
      from: l.status,
      to: newStatus,
      by: ctx.actingAs,
      reason: statusReason.trim(),
    });
    notify({
      tenantId: l.tenantId,
      channel: "Email",
      to: `${contactName(l)} (${l.email})`,
      subject: `Student record status changed to ${newStatus}`,
      body: `${l.name} (${l.id}): ${l.status} → ${newStatus}. Reason: ${statusReason.trim()}`,
      source: "Student Records · status",
      relatedId: l.id,
    });
    toast.success(`Status set to ${newStatus}`, {
      description: `${contactName(l)} notified by email.`,
    });
    setStatusReason("");
  };

  return (
    <div>
      {isAdmin && (
        <div className="flex justify-end gap-1.5 mb-2">
          <Button size="sm" variant="outline" onClick={() => setDetailsOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit details
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleteInfo(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}
      {detailsOpen && <EditDetailsDialog l={l} onClose={() => setDetailsOpen(false)} />}
      {deleteInfo && (
        <FormDialog
          open
          onOpenChange={(v) => !v && setDeleteInfo(false)}
          title="Student records can't be deleted"
          submitLabel="OK"
          cancelLabel="Close"
          onSubmit={() => setDeleteInfo(false)}
        >
          <div className="sm:col-span-2 space-y-2 text-sm">
            <p>
              A 1StudentID is permanent — it follows {l.name} across every institution and holds
              their results and history.
            </p>
            <p>
              If they are leaving, raise a withdrawal in{" "}
              <Link to="/app/requests" className="text-primary underline">
                Requests
              </Link>
              , or use Change status below. A record created by mistake can be set to Withdrawn with
              the reason.
            </p>
          </div>
        </FormDialog>
      )}
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <Info label="Course of study" value={study} />
        <Info
          label="Calendar"
          value={`${cal?.name ?? "—"}${cal && currentTerm(cal) ? ` · now ${currentTerm(cal)!.name}` : ""}`}
        />
        <Info label="Date of birth" value={fmtDay(l.dob)} />
        <Info label="Nationality" value={l.nationality} />
        {l.intake && (
          <Info label="Intake / mode" value={`${l.intake} · ${l.mode ?? "Full-time"}`} />
        )}
        {l.startDate && (
          <Info
            label="Start → expected end"
            value={`${fmtDay(l.startDate)} → ${l.expectedEnd ? fmtDay(l.expectedEnd) : "—"}${
              l.startDate > DEMO_TODAY ? " · not started yet" : ""
            }`}
          />
        )}
        {l.funding && <Info label="Funding" value={l.funding} />}
        {l.guardians && <Info label="Guardians" value={l.guardians.join(", ")} />}
        {l.house && <Info label="House" value={l.house} />}
        <Info label="Email" value={l.email} />
        {canSeeSensitive && contact?.phone && <Info label="Phone" value={contact.phone} />}
        {canSeeSensitive && contact?.guardianPhone && (
          <Info label="Guardian phone" value={contact.guardianPhone} />
        )}
        {canSeeSensitive && contact?.address && <Info label="Address" value={contact.address} />}
        <Info label="Status" value={l.status} />
        {(() => {
          const acct = studentAccountFor(l, ctx.profile?.studentAccounts);
          return (
            <Info
              label="Sign-in"
              value={`${PROVIDER_LABEL[acct.provider]} · ${ACCOUNT_MODE_LABEL[acct.mode]}`}
            />
          );
        })()}
      </div>

      {isAdmin && (
        <div className="mt-4 rounded-lg border p-3">
          <div className="text-xs font-semibold mb-2">Change status</div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as Learner["status"])}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
              className="w-36 h-8"
            />
            <TextInput
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Reason (kept in History)"
              className="h-8 flex-1 min-w-48"
            />
            <Button size="sm" disabled={newStatus === l.status} onClick={saveStatus}>
              Update status
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold flex items-center gap-1.5">
            <IdCard className="h-3.5 w-3.5 text-primary" /> Official identifiers · {ctx.region.flag}{" "}
            {ctx.region.name}
          </div>
          {isAdmin && !editing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft({});
                setEditing(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {idDefs.map((f) => {
            const v = l.officialIds[f.key];
            return (
              <div key={f.key} className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </div>
                {editing ? (
                  <TextInput
                    className="h-8 mt-1"
                    defaultValue={v ?? ""}
                    placeholder={f.hint}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                ) : v ? (
                  <div className="flex items-center justify-between gap-2 font-mono text-xs mt-0.5">
                    {f.sensitive && !revealed.has(f.key) ? mask(v) : v}
                    {f.sensitive && canSeeSensitive && (
                      <button
                        onClick={() =>
                          revealed.has(f.key)
                            ? setRevealed((s) => {
                                const n = new Set(s);
                                n.delete(f.key);
                                return n;
                              })
                            : reveal(f.key)
                        }
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Toggle reveal"
                      >
                        {revealed.has(f.key) ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-warning-foreground mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Missing
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {otherIds.length > 0 && (
          <div className="text-[11px] text-muted-foreground mt-2">
            Also held (not in this tenant's id set):{" "}
            {otherIds.map((k) => ID_FIELDS[k]?.label ?? k).join(", ")}
          </div>
        )}
        {editing && (
          <div className="flex flex-wrap justify-end gap-2 mt-3">
            <TextInput
              value={idReason}
              onChange={(e) => setIdReason(e.target.value)}
              placeholder="Reason for change (optional)"
              className="h-8 flex-1 min-w-48"
            />
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save identifiers
            </Button>
          </div>
        )}
      </div>

      {(l.visa || l.supportPlan || l.eal) && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          {l.visa && (
            <div className="rounded-lg border p-3 text-xs">
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                <Plane className="h-3.5 w-3.5 text-primary" /> Visa / immigration
              </div>
              <div>
                {l.visa.type}
                {l.visa.sponsored && " · sponsored by this institution"}
              </div>
              <div className="text-muted-foreground">Ref {l.visa.ref ?? "—"}</div>
              <div
                className={
                  daysUntil(l.visa.expiry) < 180
                    ? "text-warning-foreground font-medium mt-1"
                    : "mt-1"
                }
              >
                Expires {new Date(l.visa.expiry).toLocaleDateString("en-GB")} (
                {daysUntil(l.visa.expiry)} days)
              </div>
              {ctx.region.visaMonitoring && (
                <div className="text-muted-foreground mt-1 flex gap-1">
                  <Globe className="h-3 w-3 mt-0.5 shrink-0" /> {ctx.region.visaMonitoring.rule}
                </div>
              )}
            </div>
          )}
          {(l.supportPlan || l.eal) && (
            <div className="rounded-lg border p-3 text-xs">
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                <HeartHandshake className="h-3.5 w-3.5 text-primary" /> Support
              </div>
              {l.supportPlan && <div>{l.supportPlan}</div>}
              {l.eal && (
                <div className="text-muted-foreground mt-1">English as an additional language</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

/* ── Documents ───────────────────────────────────────────────────────────── */

const fileInputClass =
  "block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium";

function AudiencePicker({
  value,
  onChange,
}: {
  value: DocAudience[];
  onChange: (v: DocAudience[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {AUDIENCES.map((a) => (
        <label key={a} className="flex items-center gap-1.5 capitalize">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={value.includes(a)}
            disabled={a === "admin"}
            onChange={(e) =>
              onChange(e.target.checked ? [...value, a] : value.filter((x) => x !== a))
            }
          />
          {a}
        </label>
      ))}
    </div>
  );
}

function DocumentsTab({ l, docs }: { l: Learner; docs: LearnerDocument[] }) {
  const ctx = useTenantContext();
  const role = ctx.user?.role;
  const isAdmin = ctx.isAdmin;
  // Admins upload for anyone; students and parents for their own record (already scoped).
  const canUpload = isAdmin || role === "student" || role === "parent";
  const ownAudience: DocAudience[] =
    role === "parent" || ctx.familyOperated ? ["admin", "parent"] : ["admin", "student"];
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [kind, setKind] = useState<DocKind>("Passport / visa");
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  // School pupils' documents go to guardians by default; adult learners see their own.
  const [visibleTo, setVisibleTo] = useState<DocAudience[]>(
    l.guardians?.length ? ["admin", "parent"] : ["admin", "student"],
  );

  const upload = () => {
    if (!title.trim() || !fileName) {
      toast.error("Add a title and choose a file");
      return;
    }
    const id = nextId("DOC-", "learnerDocuments");
    const at = new Date().toISOString();
    addItem("learnerDocuments", {
      id,
      tenantId: l.tenantId,
      studentId: l.id,
      kind,
      title: title.trim(),
      versions: [{ v: 1, fileName, uploadedBy: ctx.actingAs, at, note: note.trim() || undefined }],
      visibleTo: isAdmin ? visibleTo : ownAudience,
      expires: EXPIRING_KINDS.includes(kind) && expires ? expires : undefined,
    });
    logChange({
      tenantId: l.tenantId,
      entity: "learnerDocument",
      entityId: id,
      studentId: l.id,
      field: "Document uploaded",
      to: `${title.trim()} v1 (${fileName})`,
      by: ctx.actingAs,
      reason: note.trim() || undefined,
    });
    if (!isAdmin)
      notify({
        tenantId: l.tenantId,
        channel: "App",
        to: registryName(l.tenantId),
        subject: `New document to verify: ${title.trim()} — ${l.name}`,
        source: "Student Records · documents",
        relatedId: id,
      });
    toast.success(
      `${title.trim()} uploaded`,
      isAdmin ? undefined : { description: "Sent to the registry for verification." },
    );
    setAdding(false);
    setTitle("");
    setFileName("");
    setExpires("");
    setNote("");
  };

  const byKind = DOC_KINDS.map((k) => ({ kind: k, rows: docs.filter((d) => d.kind === k) })).filter(
    (g) => g.rows.length,
  );
  const unverified = docs.filter((d) => !d.verified).length;
  const soon = docs.filter(expiringSoon);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted-foreground flex-1">
          {docs.length} document{docs.length === 1 ? "" : "s"}
          {unverified > 0 && ` · ${unverified} awaiting verification`}
          {!isAdmin && " · showing documents shared with you"}
        </div>
        {canUpload && !adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Upload className="h-3.5 w-3.5" /> Upload document
          </Button>
        )}
      </div>

      {soon.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs space-y-1">
          {soon.map((d) => {
            const days = daysUntil(d.expires!);
            return (
              <div key={d.id} className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warning-foreground shrink-0" />
                <span>
                  <span className="font-medium">{d.title}</span> {days < 0 ? "expired" : "expires"}{" "}
                  {fmtDay(d.expires!)}
                  {days >= 0 && ` (${days} days)`} — upload the renewed document as a new version.
                </span>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => remindExpiry(d, l)}
                  >
                    <Send className="h-3.5 w-3.5" /> Remind
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <div className="rounded-lg border p-3 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Kind">
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value as DocKind)}
                options={DOC_KINDS.map((k) => ({ value: k, label: k }))}
              />
            </Field>
            <Field label="Title" required>
              <TextInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Passport (India), Trip consent…"
              />
            </Field>
            <Field label="File" required>
              <input
                type="file"
                className={fileInputClass}
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </Field>
            {EXPIRING_KINDS.includes(kind) && (
              <Field label="Expiry date">
                <TextInput
                  type="date"
                  value={expires}
                  onChange={(e) => setExpires(e.target.value)}
                />
              </Field>
            )}
            <Field label="Note" className="sm:col-span-2">
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {isAdmin && (
              <Field label="Visible to" className="sm:col-span-2">
                <AudiencePicker value={visibleTo} onChange={setVisibleTo} />
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={upload}>
              Upload
            </Button>
          </div>
        </div>
      )}

      {byKind.map((g) => (
        <div key={g.kind}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            {g.kind}
          </div>
          <div className="space-y-2">
            {g.rows.map((d) => (
              <DocumentRow
                key={d.id}
                d={d}
                l={l}
                open={expanded === d.id}
                onToggle={() => setExpanded(expanded === d.id ? null : d.id)}
                canUpload={canUpload}
              />
            ))}
          </div>
        </div>
      ))}
      {docs.length === 0 && (
        <div className="text-sm text-muted-foreground">No documents on this record yet.</div>
      )}
    </div>
  );
}

function DocumentRow({
  d,
  l,
  open,
  onToggle,
  canUpload,
}: {
  d: LearnerDocument;
  l: Learner;
  open: boolean;
  onToggle: () => void;
  canUpload: boolean;
}) {
  const ctx = useTenantContext();
  const isAdmin = ctx.isAdmin;
  const latest = d.versions[d.versions.length - 1];
  const [fileName, setFileName] = useState("");
  const [note, setNote] = useState("");
  const [expires, setExpires] = useState("");
  const [vis, setVis] = useState<DocAudience[]>(d.visibleTo);
  const days = d.expires ? daysUntil(d.expires) : null;

  const verify = () => {
    const at = new Date().toISOString();
    updateItem("learnerDocuments", (x) => x.id === d.id, { verified: { by: ctx.actingAs, at } });
    logChange({
      tenantId: d.tenantId,
      entity: "learnerDocument",
      entityId: d.id,
      studentId: d.studentId,
      field: "Document verified",
      to: `${d.title} v${latest.v}`,
      by: ctx.actingAs,
    });
    toast.success(`${d.title} verified`);
  };
  const addVersion = () => {
    if (!fileName) {
      toast.error("Choose a file");
      return;
    }
    const v = latest.v + 1;
    const newExpiry = expires && expires !== d.expires ? expires : undefined;
    updateItem("learnerDocuments", (x) => x.id === d.id, {
      versions: [
        ...d.versions,
        {
          v,
          fileName,
          uploadedBy: ctx.actingAs,
          at: new Date().toISOString(),
          note: note.trim() || undefined,
        },
      ],
      // A new file needs checking again.
      verified: undefined,
      ...(newExpiry ? { expires: newExpiry } : {}),
    });
    logChange({
      tenantId: d.tenantId,
      entity: "learnerDocument",
      entityId: d.id,
      studentId: d.studentId,
      field: "Document version",
      from: `v${latest.v} (${latest.fileName})`,
      to: `v${v} (${fileName})`,
      by: ctx.actingAs,
      reason: note.trim() || undefined,
    });
    if (newExpiry)
      logChange({
        tenantId: d.tenantId,
        entity: "learnerDocument",
        entityId: d.id,
        studentId: d.studentId,
        field: `${d.title} · expiry`,
        from: d.expires ?? "—",
        to: newExpiry,
        by: ctx.actingAs,
      });
    if (!isAdmin)
      notify({
        tenantId: d.tenantId,
        channel: "App",
        to: registryName(d.tenantId),
        subject: `New version to verify: ${d.title} — ${l.name}`,
        source: "Student Records · documents",
        relatedId: d.id,
      });
    toast.success(`${d.title} v${v} uploaded`, { description: "Awaiting verification." });
    setFileName("");
    setNote("");
    setExpires("");
  };
  const saveVisibility = () => {
    const next = AUDIENCES.filter((a) => a === "admin" || vis.includes(a));
    updateItem("learnerDocuments", (x) => x.id === d.id, { visibleTo: next });
    logChange({
      tenantId: d.tenantId,
      entity: "learnerDocument",
      entityId: d.id,
      studentId: d.studentId,
      field: `${d.title} · visibility`,
      from: d.visibleTo.join(", "),
      to: next.join(", "),
      by: ctx.actingAs,
    });
    toast.success("Visibility updated");
  };
  const visChanged =
    AUDIENCES.filter((a) => vis.includes(a)).join() !==
    AUDIENCES.filter((a) => d.visibleTo.includes(a)).join();

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-start gap-3 p-3">
        <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{d.title}</div>
          <div className="text-[11px] text-muted-foreground">
            v{latest.v} · {latest.fileName} · {latest.uploadedBy}, {fmtDay(latest.at)}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {d.verified ? (
              <Badge tone="success">
                <BadgeCheck className="h-3 w-3 mr-1" /> Verified
              </Badge>
            ) : (
              <Badge tone="warning">Awaiting verification</Badge>
            )}
            {d.expires && days !== null && (
              <Badge tone={days < 0 ? "destructive" : days <= 60 ? "warning" : "muted"}>
                {days < 0 ? "Expired" : "Expires"} {fmtDay(d.expires)}
              </Badge>
            )}
            {isAdmin && (
              <Badge tone="muted">
                Visible: {d.visibleTo.filter((a) => a !== "admin").join(", ") || "admin only"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          {isAdmin && !d.verified && (
            <Button size="sm" onClick={verify}>
              Verify
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onToggle}>
            {open ? "Close" : `Versions (${d.versions.length})`}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-muted/20 p-3 space-y-3">
          <div className="space-y-1">
            {[...d.versions].reverse().map((v) => (
              <div key={v.v} className="flex flex-wrap gap-x-2 text-xs">
                <span className="font-mono font-medium w-6">v{v.v}</span>
                <span>{v.fileName}</span>
                <span className="text-muted-foreground">
                  · {v.uploadedBy} · {fmtWhen(v.at)}
                </span>
                {v.note && <span className="text-muted-foreground w-full pl-8">{v.note}</span>}
              </div>
            ))}
            {d.verified && (
              <div className="text-[11px] text-muted-foreground pl-8">
                Verified by {d.verified.by}, {fmtWhen(d.verified.at)}
              </div>
            )}
          </div>

          {canUpload && (
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <Field label={`Upload v${latest.v + 1}`}>
                <input
                  key={latest.v}
                  type="file"
                  className={fileInputClass}
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                />
              </Field>
              <Field label="Note">
                <TextInput
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What changed"
                  className="h-8"
                />
              </Field>
              <Button size="sm" onClick={addVersion}>
                <Upload className="h-3.5 w-3.5" /> Add version
              </Button>
              {EXPIRING_KINDS.includes(d.kind) && (
                <Field label="New expiry date (if renewed)">
                  <TextInput
                    type="date"
                    value={expires}
                    onChange={(e) => setExpires(e.target.value)}
                    className="h-8"
                  />
                </Field>
              )}
            </div>
          )}

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium">Visible to</span>
              <AudiencePicker value={vis} onChange={setVis} />
              <Button
                size="sm"
                variant="outline"
                disabled={!visChanged}
                onClick={saveVisibility}
                className="ml-auto"
              >
                Save visibility
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Qualifications & employment ─────────────────────────────────────────── */

type QualDraft = Omit<PriorQualification, "id" | "tenantId" | "studentId" | "verified">;
type EmpDraft = Omit<EmploymentRecord, "id" | "tenantId" | "studentId" | "verified">;

const QUAL_FIELDS: { key: keyof QualDraft; label: string; placeholder?: string }[] = [
  { key: "title", label: "Qualification", placeholder: "GCE A/L, A Levels, Cert III…" },
  { key: "institution", label: "Institution" },
  { key: "country", label: "Country" },
  { key: "year", label: "Year" },
  { key: "result", label: "Result", placeholder: "Grades, %, ATAR, classification" },
  { key: "level", label: "Framework level", placeholder: "e.g. SLQF 4, RQF 3, AQF 5" },
];
const EMPTY_QUAL: QualDraft = {
  title: "",
  institution: "",
  country: "",
  year: "",
  result: "",
  level: "",
};
const EMPTY_EMP: EmpDraft = { employer: "", role: "", from: "", to: "", relevant: true };

/** Log each changed field of an edited row. */
function logFieldChanges<T extends object>(
  before: T,
  after: T,
  labels: Partial<Record<keyof T, string>>,
  base: Omit<ChangeLogEntry, "id" | "at" | "field" | "from" | "to">,
  prefix: string,
) {
  let n = 0;
  for (const k of Object.keys(labels) as (keyof T)[]) {
    const a = String(before[k] ?? "");
    const b = String(after[k] ?? "");
    if (a !== b) {
      logChange({ ...base, field: `${prefix} · ${labels[k]}`, from: a || "—", to: b || "—" });
      n++;
    }
  }
  return n;
}

function QualificationsTab({
  l,
  quals,
  emps,
}: {
  l: Learner;
  quals: PriorQualification[];
  emps: EmploymentRecord[];
}) {
  const ctx = useTenantContext();
  const isAdmin = ctx.isAdmin;
  const [qEdit, setQEdit] = useState<{ id: string | null; draft: QualDraft } | null>(null);
  const [eEdit, setEEdit] = useState<{ id: string | null; draft: EmpDraft } | null>(null);
  const base = (entity: string, entityId: string) => ({
    tenantId: l.tenantId,
    entity,
    entityId,
    studentId: l.id,
    by: ctx.actingAs,
  });

  const saveQual = () => {
    if (!qEdit) return;
    const dr = { ...qEdit.draft, level: qEdit.draft.level?.trim() || undefined };
    if (!dr.title.trim() || !dr.institution.trim()) {
      toast.error("Qualification and institution are required");
      return;
    }
    if (qEdit.id) {
      const prev = quals.find((x) => x.id === qEdit.id)!;
      updateItem("priorQualifications", (x) => x.id === qEdit.id, dr);
      const labels = Object.fromEntries(QUAL_FIELDS.map((f) => [f.key, f.label]));
      logFieldChanges(
        prev,
        { ...prev, ...dr },
        labels,
        base("priorQualification", prev.id),
        prev.title,
      );
      toast.success("Qualification updated");
    } else {
      const id = nextId("QUAL-", "priorQualifications");
      addItem("priorQualifications", {
        id,
        tenantId: l.tenantId,
        studentId: l.id,
        ...dr,
        verified: false,
      });
      logChange({
        ...base("priorQualification", id),
        field: "Qualification added",
        to: `${dr.title} — ${dr.result}`,
      });
      toast.success("Qualification added");
    }
    setQEdit(null);
  };
  const verifyQual = (x: PriorQualification) => {
    updateItem("priorQualifications", (r) => r.id === x.id, { verified: true });
    logChange({
      ...base("priorQualification", x.id),
      field: "Qualification verified",
      to: x.title,
    });
    toast.success(`${x.title} verified`);
  };

  const saveEmp = () => {
    if (!eEdit) return;
    const dr = { ...eEdit.draft, to: eEdit.draft.to || undefined };
    if (!dr.employer.trim() || !dr.role.trim() || !dr.from) {
      toast.error("Employer, role and start date are required");
      return;
    }
    if (eEdit.id) {
      const prev = emps.find((x) => x.id === eEdit.id)!;
      updateItem("employmentRecords", (x) => x.id === eEdit.id, dr);
      logFieldChanges(
        prev,
        { ...prev, ...dr },
        { employer: "Employer", role: "Role", from: "From", to: "To", relevant: "Relevant" },
        base("employmentRecord", prev.id),
        prev.employer,
      );
      toast.success("Employment updated");
    } else {
      const id = nextId("EMP-", "employmentRecords");
      addItem("employmentRecords", {
        id,
        tenantId: l.tenantId,
        studentId: l.id,
        ...dr,
        verified: false,
      });
      logChange({
        ...base("employmentRecord", id),
        field: "Employment added",
        to: `${dr.role}, ${dr.employer}`,
      });
      toast.success("Employment added");
    }
    setEEdit(null);
  };
  const verifyEmp = (x: EmploymentRecord) => {
    updateItem("employmentRecords", (r) => r.id === x.id, { verified: true });
    logChange({
      ...base("employmentRecord", x.id),
      field: "Employment verified",
      to: `${x.role}, ${x.employer}`,
    });
    toast.success("Employment verified");
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-primary" /> Entry qualifications
          </div>
          {isAdmin && !qEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setQEdit({ id: null, draft: EMPTY_QUAL })}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
        {qEdit && (
          <div className="rounded-lg border p-3 mb-2">
            <div className="grid sm:grid-cols-2 gap-3">
              {QUAL_FIELDS.map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  required={f.key === "title" || f.key === "institution"}
                >
                  <TextInput
                    value={qEdit.draft[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setQEdit({ ...qEdit, draft: { ...qEdit.draft, [f.key]: e.target.value } })
                    }
                  />
                </Field>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => setQEdit(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveQual}>
                {qEdit.id ? "Save changes" : "Add qualification"}
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {quals.map((x) => (
            <div key={x.id} className="rounded-lg border p-3 flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{x.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {x.institution} · {x.country} · {x.year}
                </div>
                <div className="text-xs mt-1">{x.result}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {x.level && <Badge tone="info">{x.level}</Badge>}
                  <Badge tone={x.verified ? "success" : "warning"}>
                    {x.verified ? "Verified" : "Not verified"}
                  </Badge>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1.5">
                  {!x.verified && (
                    <Button size="sm" onClick={() => verifyQual(x)}>
                      Verify
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Edit qualification"
                    onClick={() =>
                      setQEdit({
                        id: x.id,
                        draft: {
                          title: x.title,
                          institution: x.institution,
                          country: x.country,
                          year: x.year,
                          result: x.result,
                          level: x.level ?? "",
                        },
                      })
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {quals.length === 0 && (
            <div className="text-xs text-muted-foreground">No entry qualifications recorded.</div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-primary" /> Employment history
          </div>
          {isAdmin && !eEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEEdit({ id: null, draft: EMPTY_EMP })}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
        {eEdit && (
          <div className="rounded-lg border p-3 mb-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Employer" required>
                <TextInput
                  value={eEdit.draft.employer}
                  onChange={(e) =>
                    setEEdit({ ...eEdit, draft: { ...eEdit.draft, employer: e.target.value } })
                  }
                />
              </Field>
              <Field label="Role" required>
                <TextInput
                  value={eEdit.draft.role}
                  onChange={(e) =>
                    setEEdit({ ...eEdit, draft: { ...eEdit.draft, role: e.target.value } })
                  }
                />
              </Field>
              <Field label="From" required>
                <TextInput
                  type="date"
                  value={eEdit.draft.from}
                  onChange={(e) =>
                    setEEdit({ ...eEdit, draft: { ...eEdit.draft, from: e.target.value } })
                  }
                />
              </Field>
              <Field label="To" hint="Leave blank if current">
                <TextInput
                  type="date"
                  value={eEdit.draft.to ?? ""}
                  onChange={(e) =>
                    setEEdit({ ...eEdit, draft: { ...eEdit.draft, to: e.target.value } })
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={eEdit.draft.relevant}
                  onChange={(e) =>
                    setEEdit({ ...eEdit, draft: { ...eEdit.draft, relevant: e.target.checked } })
                  }
                />
                Relevant to entry / recognition of prior learning
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => setEEdit(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEmp}>
                {eEdit.id ? "Save changes" : "Add employment"}
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {emps.map((x) => (
            <div key={x.id} className="rounded-lg border p-3 flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{x.role}</div>
                <div className="text-[11px] text-muted-foreground">
                  {x.employer} · {fmtDay(x.from)} – {x.to ? fmtDay(x.to) : "present"}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {x.relevant && <Badge tone="info">Relevant to entry / RPL</Badge>}
                  <Badge tone={x.verified ? "success" : "warning"}>
                    {x.verified ? "Reference checked" : "Not verified"}
                  </Badge>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1.5">
                  {!x.verified && (
                    <Button size="sm" onClick={() => verifyEmp(x)}>
                      Verify
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Edit employment"
                    onClick={() =>
                      setEEdit({
                        id: x.id,
                        draft: {
                          employer: x.employer,
                          role: x.role,
                          from: x.from,
                          to: x.to ?? "",
                          relevant: x.relevant,
                        },
                      })
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {emps.length === 0 && (
            <div className="text-xs text-muted-foreground">No employment recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── History ─────────────────────────────────────────────────────────────── */

const ENTITY_LABEL: Record<string, string> = {
  learner: "Record",
  learnerDocument: "Document",
  priorQualification: "Qualification",
  employmentRecord: "Employment",
};

function HistoryTab({ log }: { log: ChangeLogEntry[] }) {
  if (!log.length)
    return <div className="text-sm text-muted-foreground">No changes recorded yet.</div>;
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" /> Every change to this record, newest first. Sensitive
        identifiers show the last four characters only.
      </div>
      {log.map((e) => (
        <div key={e.id} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted">{ENTITY_LABEL[e.entity] ?? e.entity}</Badge>
            <span className="font-medium">{e.field}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{fmtWhen(e.at)}</span>
          </div>
          {(e.from || e.to) && (
            <div className="text-xs mt-1">
              {e.from && <span className="text-muted-foreground line-through">{e.from}</span>}
              {e.from && e.to && <span className="text-muted-foreground"> → </span>}
              {e.to && <span>{e.to}</span>}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground mt-1">
            By {e.by}
            {e.reason && ` · ${e.reason}`}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Export ──────────────────────────────────────────────────────────────── */

const EXPORT_HEADER = ["Section", "Item", "Detail", "Value", "By", "When"];

/** Audit-ready rows for the CSV and print view. Sensitive ids are masked. */
function recordRows(
  l: Learner,
  ctx: TenantCtx,
  study: string,
  docs: LearnerDocument[],
  quals: PriorQualification[],
  emps: EmploymentRecord[],
  log: ChangeLogEntry[],
): (string | undefined)[][] {
  const c = contactFor(l.id);
  const rows: (string | undefined)[][] = [EXPORT_HEADER];
  const p = (item: string, value?: string) => {
    if (value) rows.push(["Profile", item, "", value, "", ""]);
  };
  p("1StudentID", l.id);
  p("Name", l.name);
  p("Institution", ctx.tenantName);
  p("Date of birth", l.dob);
  p("Nationality", l.nationality);
  p("Status", l.status);
  p("Year / level", l.level);
  p("Course of study", study);
  p("Intake / mode", l.intake && `${l.intake} · ${l.mode ?? "Full-time"}`);
  p("Funding", l.funding);
  p("Email", l.email);
  p("Phone", c?.phone);
  p("Guardian phone", c?.guardianPhone);
  p("Address", c?.address);
  p("Guardians", l.guardians?.join("; "));
  p("Visa", l.visa && `${l.visa.type} · expires ${l.visa.expiry} · ref ${l.visa.ref ?? "—"}`);
  for (const [k, v] of Object.entries(l.officialIds))
    rows.push(["Identifier", ID_FIELDS[k]?.label ?? k, "", shownId(k, v), "", ""]);
  for (const d of docs) {
    rows.push([
      "Document",
      d.title,
      `${d.kind}${d.expires ? ` · expires ${d.expires}` : ""} · visible to ${d.visibleTo.join("/")}`,
      d.verified ? "Verified" : "Awaiting verification",
      d.verified?.by,
      d.verified?.at,
    ]);
    for (const v of d.versions)
      rows.push([
        "Document version",
        d.title,
        `v${v.v}${v.note ? ` · ${v.note}` : ""}`,
        v.fileName,
        v.uploadedBy,
        v.at,
      ]);
  }
  for (const q of quals)
    rows.push([
      "Qualification",
      q.title,
      `${q.institution} · ${q.country} · ${q.year}${q.level ? ` · ${q.level}` : ""}`,
      q.result,
      q.verified ? "Verified" : "Not verified",
      "",
    ]);
  for (const e of emps)
    rows.push([
      "Employment",
      `${e.role}, ${e.employer}`,
      `${e.from} – ${e.to ?? "present"}${e.relevant ? " · relevant to entry / RPL" : ""}`,
      e.verified ? "Verified" : "Not verified",
      "",
      "",
    ]);
  for (const e of log)
    rows.push([
      "Change log",
      `${ENTITY_LABEL[e.entity] ?? e.entity} · ${e.field}`,
      e.reason,
      `${e.from ?? ""}${e.from && e.to ? " → " : ""}${e.to ?? ""}`,
      e.by,
      e.at,
    ]);
  return rows;
}

function printHtml(l: Learner, tenantName: string, rows: string[][]) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const [head, ...body] = rows;
  const sections = Array.from(new Set(body.map((r) => r[0])));
  const tables = sections
    .map(
      (s) =>
        `<h2>${esc(s)}</h2><table><thead><tr>${head
          .slice(1)
          .map((h) => `<th>${esc(h)}</th>`)
          .join("")}</tr></thead><tbody>${body
          .filter((r) => r[0] === s)
          .map(
            (r) =>
              `<tr>${r
                .slice(1)
                .map((c) => `<td>${esc(c)}</td>`)
                .join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(l.id)} — student record</title>
<style>body{font:12px system-ui,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin:0}
.sub{color:#555;margin:4px 0 16px}h2{font-size:13px;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}
table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top}
th{font-size:10px;text-transform:uppercase;color:#666}</style></head><body>
<h1>${esc(l.name)} · ${esc(l.id)}</h1><div class="sub">${esc(tenantName)} · student record exported ${esc(DEMO_TODAY)} · sensitive identifiers masked</div>
${tables}</body></html>`;
}

/* ── Add student ─────────────────────────────────────────────────────────── */

function AddLearnerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const ctx = useTenantContext();
  const calendars = useCollection("academicCalendars").filter((c) => c.tenantId === ctx.tenantId);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("2011-01-01");
  const [gender, setGender] = useState<"F" | "M">("F");
  const [level, setLevel] = useState("");
  const [nationality, setNationality] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const submit = () => {
    if (!name.trim() || !level.trim()) {
      toast.error("Name and year / level are required");
      return;
    }
    const id = nextId("S-", "learners");
    const cal = calendarId || calendars.find((c) => c.isDefault)?.id || calendars[0]?.id || "";
    addItem("learners", {
      id,
      tenantId: ctx.tenantId,
      name: name.trim(),
      gender,
      dob,
      email: `${name.trim().toLowerCase().replace(/\s+/g, ".")}@student.demo`,
      status: "Active",
      level: level.trim(),
      calendarId: cal,
      nationality: nationality || ctx.region.name,
      officialIds: {},
    });
    logChange({
      tenantId: ctx.tenantId,
      entity: "learner",
      entityId: id,
      studentId: id,
      field: "Record created",
      to: `${name.trim()} · ${level.trim()}`,
      by: ctx.actingAs,
      reason: "Direct add",
    });
    toast.success(`${name} added — 1StudentID ${id}`, {
      description: "Official identifiers are flagged as missing until captured.",
    });
    setName("");
    setLevel("");
    onOpenChange(false);
  };
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add student record"
      description="Most learners arrive through Admissions; direct add is for transfers and migrations."
      onSubmit={submit}
      submitLabel="Create record"
    >
      <Field label="Full name" required className="sm:col-span-2">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Date of birth">
        <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
      </Field>
      <Field label="Gender">
        <Select
          value={gender}
          onChange={(e) => setGender(e.target.value as "F" | "M")}
          options={[
            { value: "F", label: "Female" },
            { value: "M", label: "Male" },
          ]}
        />
      </Field>
      <Field label="Year / level" required>
        <TextInput
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          placeholder="Year 9 · Level 4 · Cert III"
        />
      </Field>
      <Field label="Nationality">
        <TextInput value={nationality} onChange={(e) => setNationality(e.target.value)} />
      </Field>
      <Field label="Academic calendar" className="sm:col-span-2">
        <Select
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          options={[
            { value: "", label: "Tenant default" },
            ...calendars.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </Field>
    </FormDialog>
  );
}

/* ── Edit details (admin) ────────────────────────────────────────────────── */

type DetailKey =
  | "name"
  | "dob"
  | "gender"
  | "email"
  | "nationality"
  | "level"
  | "group"
  | "curriculumId"
  | "programmeId"
  | "qualificationId"
  | "intakeId"
  | "startDate"
  | "expectedEnd"
  | "mode"
  | "guardians";

const DETAIL_LABEL: Record<DetailKey, string> = {
  name: "Name",
  dob: "Date of birth",
  gender: "Gender",
  email: "Email",
  nationality: "Nationality",
  level: "Year / level",
  group: "Group",
  curriculumId: "Curriculum",
  programmeId: "Programme",
  qualificationId: "Qualification",
  intakeId: "Intake",
  startDate: "Start date",
  expectedEnd: "Expected end",
  mode: "Mode",
  guardians: "Guardians",
};

/** Edit a learner's core details — every changed field is logged to History. */
function EditDetailsDialog({ l, onClose }: { l: Learner; onClose: () => void }) {
  const ctx = useTenantContext();
  const t = ctx.tenantId;
  const curricula = useCollection("curricula").filter((c) => c.tenantId === t);
  const programmes = useCollection("programmes").filter((p) => p.tenantId === t);
  const quals = useCollection("qualifications").filter((q) => q.tenantId === t);
  const intakes = useCollection("intakes").filter((i) => i.tenantId === t);
  const regs = useCollection("moduleRegistrations");
  const units = useCollection("unitAchievements");
  const learners = useCollection("learners");
  const currentIntakeId =
    l.intakeId ?? intakes.find((i) => i.name === l.intake)?.id ?? (l.intake ? "_legacy" : "");
  const initial: Record<DetailKey, string> = {
    name: l.name,
    dob: l.dob,
    gender: l.gender,
    email: l.email,
    nationality: l.nationality,
    level: l.level,
    group: l.group ?? "",
    curriculumId: l.curriculumId ?? "",
    programmeId: l.programmeId ?? "",
    qualificationId: l.qualificationId ?? "",
    intakeId: currentIntakeId,
    startDate: l.startDate ?? "",
    expectedEnd: l.expectedEnd ?? "",
    mode: l.mode ?? "",
    guardians: (l.guardians ?? []).join(", "),
  };
  const [f, setF] = useState(initial);
  const [reason, setReason] = useState("");
  const set = (k: DetailKey, v: string) => setF((x) => ({ ...x, [k]: v }));

  const nameOf = (k: DetailKey, v: string): string => {
    if (!v) return "—";
    if (k === "curriculumId") return curricula.find((c) => c.id === v)?.name ?? v;
    if (k === "programmeId") {
      const p = programmes.find((x) => x.id === v);
      return p ? `${p.code} ${p.name}` : v;
    }
    if (k === "qualificationId") {
      const q = quals.find((x) => x.id === v);
      return q ? `${q.code} ${q.title}` : v;
    }
    if (k === "intakeId")
      return v === "_legacy" ? (l.intake ?? "—") : (intakes.find((i) => i.id === v)?.name ?? v);
    return v;
  };

  // Moving off a programme / qualification keeps history, but say so.
  const liveRegs = regs.filter(
    (r) => r.studentId === l.id && (r.status === "Registered" || r.status === "Pending approval"),
  ).length;
  const unitRows = units.filter(
    (u) => u.studentId === l.id && u.qualificationId === l.qualificationId,
  ).length;
  const progChanged = (l.programmeId ?? "") !== f.programmeId;
  const qualChanged = (l.qualificationId ?? "") !== f.qualificationId;

  const submit = () => {
    if (!f.name.trim() || !f.level.trim()) {
      toast.error("Name and year / level are required");
      return;
    }
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) {
      toast.error("That email doesn't look right");
      return;
    }
    const email = f.email.trim().toLowerCase();
    if (
      email &&
      learners.some((x) => x.id !== l.id && x.tenantId === t && x.email.toLowerCase() === email)
    ) {
      toast.error("Another student record already uses that email");
      return;
    }
    if (f.startDate && f.expectedEnd && f.expectedEnd < f.startDate) {
      toast.error("Expected end must be after the start date");
      return;
    }
    const changed = (Object.keys(DETAIL_LABEL) as DetailKey[]).filter(
      (k) => initial[k].trim() !== f[k].trim(),
    );
    if (!changed.length) {
      onClose();
      return;
    }
    if ((progChanged || qualChanged) && !reason.trim()) {
      toast.error("Give a reason for changing the course of study");
      return;
    }
    const intake = intakes.find((i) => i.id === f.intakeId);
    const guardians = f.guardians
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    updateItem("learners", (x) => x.id === l.id, {
      name: f.name.trim(),
      dob: f.dob,
      gender: f.gender as Learner["gender"],
      email: email || l.email,
      nationality: f.nationality.trim(),
      level: f.level.trim(),
      group: f.group.trim() || undefined,
      curriculumId: f.curriculumId || undefined,
      programmeId: f.programmeId || undefined,
      qualificationId: f.qualificationId || undefined,
      ...(f.intakeId === "_legacy" ? {} : { intakeId: intake?.id, intake: intake?.name }),
      startDate: f.startDate || undefined,
      expectedEnd: f.expectedEnd || undefined,
      mode: (f.mode || undefined) as Learner["mode"],
      guardians: guardians.length ? guardians : undefined,
    });
    for (const k of changed)
      logChange({
        tenantId: l.tenantId,
        entity: "learner",
        entityId: l.id,
        studentId: l.id,
        field: DETAIL_LABEL[k],
        from: nameOf(k, initial[k]),
        to: nameOf(k, f[k].trim()),
        by: ctx.actingAs,
        reason: reason.trim() || undefined,
      });
    notify({
      tenantId: l.tenantId,
      channel: "Email",
      to: `${contactName({ ...l, guardians })} (${email || l.email})`,
      subject: `Your student record was updated`,
      body: `Changed: ${changed.map((k) => DETAIL_LABEL[k]).join(", ")}. Contact the registry if anything is wrong.`,
      source: "Student Records · details",
      relatedId: l.id,
    });
    toast.success(
      `${changed.length} field${changed.length > 1 ? "s" : ""} updated — logged to History`,
    );
    onClose();
  };

  const opt = <T extends { id: string }>(rows: T[], label: (r: T) => string) => [
    { value: "", label: "—" },
    ...rows.map((r) => ({ value: r.id, label: label(r) })),
  ];

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Edit details"
      description={`${l.name} · 1StudentID ${l.id} (the ID itself never changes)`}
      submitLabel="Save changes"
      onSubmit={submit}
    >
      <Field label="Full name" required className="sm:col-span-2">
        <TextInput value={f.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Date of birth">
        <TextInput type="date" value={f.dob} onChange={(e) => set("dob", e.target.value)} />
      </Field>
      <Field label="Gender">
        <Select
          value={f.gender}
          onChange={(e) => set("gender", e.target.value)}
          options={[
            { value: "F", label: "Female" },
            { value: "M", label: "Male" },
          ]}
        />
      </Field>
      <Field label="Email">
        <TextInput type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="Nationality">
        <TextInput value={f.nationality} onChange={(e) => set("nationality", e.target.value)} />
      </Field>
      <Field label="Year / level" required>
        <TextInput value={f.level} onChange={(e) => set("level", e.target.value)} />
      </Field>
      <Field label="Group / cohort">
        <TextInput value={f.group} onChange={(e) => set("group", e.target.value)} />
      </Field>
      {(curricula.length > 0 || l.curriculumId) && (
        <Field label="Curriculum">
          <Select
            value={f.curriculumId}
            onChange={(e) => set("curriculumId", e.target.value)}
            options={opt(curricula, (c) => c.name)}
          />
        </Field>
      )}
      {(programmes.length > 0 || l.programmeId) && (
        <Field label="Programme">
          <Select
            value={f.programmeId}
            onChange={(e) => set("programmeId", e.target.value)}
            options={opt(programmes, (p) => `${p.code} ${p.award} ${p.name}`)}
          />
        </Field>
      )}
      {(quals.length > 0 || l.qualificationId) && (
        <Field label="Qualification">
          <Select
            value={f.qualificationId}
            onChange={(e) => set("qualificationId", e.target.value)}
            options={opt(quals, (q) => `${q.code} ${q.title}`)}
          />
        </Field>
      )}
      <Field label="Intake">
        <Select
          value={f.intakeId}
          onChange={(e) => set("intakeId", e.target.value)}
          options={[
            ...opt(intakes, (i) => i.name),
            ...(currentIntakeId === "_legacy" ? [{ value: "_legacy", label: l.intake ?? "" }] : []),
          ]}
        />
      </Field>
      <Field label="Mode">
        <Select
          value={f.mode}
          onChange={(e) => set("mode", e.target.value)}
          options={[
            { value: "", label: "—" },
            { value: "Full-time", label: "Full-time" },
            { value: "Part-time", label: "Part-time" },
            { value: "Apprenticeship", label: "Apprenticeship" },
          ]}
        />
      </Field>
      <Field label="Start date">
        <TextInput
          type="date"
          value={f.startDate}
          onChange={(e) => set("startDate", e.target.value)}
        />
      </Field>
      <Field label="Expected end">
        <TextInput
          type="date"
          value={f.expectedEnd}
          onChange={(e) => set("expectedEnd", e.target.value)}
        />
      </Field>
      <Field label="Guardians" hint="Comma-separated" className="sm:col-span-2">
        <TextInput value={f.guardians} onChange={(e) => set("guardians", e.target.value)} />
      </Field>
      {(progChanged && liveRegs > 0) || (qualChanged && unitRows > 0) ? (
        <p className="sm:col-span-2 text-xs rounded-lg border border-warning/40 bg-warning/10 p-3">
          {progChanged && liveRegs > 0
            ? `${liveRegs} module registration${liveRegs > 1 ? "s stay" : " stays"} on the old programme — withdraw them in Module Registration if needed. `
            : ""}
          {qualChanged && unitRows > 0
            ? `${unitRows} unit outcome${unitRows > 1 ? "s are" : " is"} kept as history on the old qualification.`
            : ""}
        </p>
      ) : null}
      <Field
        label={progChanged || qualChanged ? "Reason (required)" : "Reason (optional)"}
        className="sm:col-span-2"
      >
        <TextInput
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Kept in History"
        />
      </Field>
    </FormDialog>
  );
}
