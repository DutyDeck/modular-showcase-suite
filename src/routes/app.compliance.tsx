import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Badge,
  Button,
  StatCard,
  Field,
  Select,
  TextInput,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { auditLog } from "@/lib/mockData";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import { useTenantContext } from "@/lib/packs/registry";
import {
  ACCOUNT_MODE_LABEL,
  DEMO_TODAY,
  PROVIDER_LABEL,
  studentAccountFor,
  type AccountMode,
} from "@/lib/packs/foundationData";
import { TENANT_STAFF } from "@/lib/packs/opsData";
import { PackContextBar, VerifyNote } from "@/components/packs/PackUI";
import { logChange, notify } from "@/lib/packs/sis/activity";
import type { ChangeLogEntry } from "@/lib/packs/sis/shared";
import {
  DSAR_SEEDS,
  PRIVACY,
  RETENTION as PACK_RETENTION,
  addDaysIso,
  ageAt,
  type DsarSeed,
} from "@/lib/packs/sis/governance";
import {
  ShieldCheck,
  FileLock2,
  Globe2,
  Lock,
  Download,
  Trash2,
  Clock,
  BookOpen,
  AlertTriangle,
  Mail,
  Cookie,
  Users,
  Baby,
  KeyRound,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

export const Route = createFileRoute("/app/compliance")({
  head: () => ({ meta: [{ title: "Compliance — 1StudentID" }] }),
  component: CompliancePage,
});

/** Pack (segment) tenants see their own law, people and audit trail;
 *  classic tenants and the global admin keep the original page. */
function CompliancePage() {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  return isPackTenantUser(user, profiles) ? <PackCompliance /> : <ClassicCompliancePage />;
}

/* Default UK demo posture. The platform is multi-tenant so other regulations
 * still apply where relevant (FERPA for US tenants, PDPA for SE Asia, etc.),
 * but UK GDPR + DPA 2018 are the primary regime for this deployment. */
const PRIMARY_FRAMEWORKS = [
  { name: "UK GDPR", note: "UK General Data Protection Regulation", region: "UK" },
  { name: "DPA 2018", note: "Data Protection Act 2018", region: "UK" },
  { name: "Keeping Children Safe in Education", note: "DfE statutory guidance", region: "UK" },
  { name: "ICO Children's Code", note: "Age Appropriate Design", region: "UK" },
];

const SECONDARY_FRAMEWORKS = [
  { name: "EU GDPR", note: "EEA tenants", region: "EU" },
  { name: "FERPA", note: "US tenants", region: "US" },
  { name: "COPPA", note: "Under-13 online services", region: "US" },
  { name: "ISO 27001:2022", note: "Information Security", region: "Intl" },
  { name: "SOC 2 Type II", note: "Trust services criteria", region: "Intl" },
  { name: "Cyber Essentials Plus", note: "NCSC scheme", region: "UK" },
];

interface DsarRow {
  id: string;
  subject: string;
  type:
    | "Access (Art. 15)"
    | "Erasure (Art. 17)"
    | "Portability (Art. 20)"
    | "Rectification (Art. 16)";
  raised: string;
  dueBy: string;
  status: "Open" | "Verified" | "Fulfilled" | "Overdue";
  origin: string;
}

const INITIAL_DSARS: DsarRow[] = [
  {
    id: "DSAR-2026-0118",
    subject: "Jack Smith (parent · S-1001 + S-1009)",
    type: "Access (Art. 15)",
    raised: "2026-05-29",
    dueBy: "2026-06-28",
    status: "Verified",
    origin: "In-app request",
  },
  {
    id: "DSAR-2026-0117",
    subject: "Former student · GCH-22-PHY-091",
    type: "Erasure (Art. 17)",
    raised: "2026-05-22",
    dueBy: "2026-06-21",
    status: "Open",
    origin: "Email · dpo@oneedu.uk",
  },
  {
    id: "DSAR-2026-0116",
    subject: "Isabella Evans (parent on behalf)",
    type: "Portability (Art. 20)",
    raised: "2026-05-18",
    dueBy: "2026-06-17",
    status: "Fulfilled",
    origin: "In-app request",
  },
  {
    id: "DSAR-2026-0115",
    subject: "Lawful basis correction · staff record",
    type: "Rectification (Art. 16)",
    raised: "2026-05-14",
    dueBy: "2026-06-13",
    status: "Fulfilled",
    origin: "DPO ticket",
  },
];

const RETENTION = [
  {
    category: "Student academic records",
    basis: "Public task (DfE retention guidance)",
    period: "25 years after leaving",
    action: "Anonymise then archive",
  },
  {
    category: "Safeguarding & SRB entries",
    basis: "Vital interests / legal obligation",
    period: "Until 25th birthday",
    action: "Sealed archive, restricted access",
  },
  {
    category: "Financial invoices & receipts",
    basis: "Legal obligation (Companies Act, HMRC)",
    period: "7 years",
    action: "Then purge",
  },
  {
    category: "Marketing / lead enquiries",
    basis: "Consent",
    period: "12 months (renewable)",
    action: "Auto-purge if not renewed",
  },
  {
    category: "Attendance & timetable data",
    basis: "Legitimate interests",
    period: "7 years",
    action: "Aggregate then anonymise",
  },
  {
    category: "MFA / session logs",
    basis: "Legitimate interests · security",
    period: "13 months",
    action: "Auto-purge",
  },
];

function ClassicCompliancePage() {
  const [dsars, setDsars] = useState<DsarRow[]>(INITIAL_DSARS);

  const markFulfilled = (id: string) => {
    setDsars((rows) => rows.map((r) => (r.id === id ? { ...r, status: "Fulfilled" } : r)));
    toast.success(`${id} marked fulfilled`, {
      description: "Audit log entry recorded against DPO.",
    });
  };

  const openDsars = dsars.filter((r) => r.status === "Open" || r.status === "Verified").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governance & Compliance"
        subtitle="UK GDPR · DPA 2018 · Children's Code · ICO-aligned data governance."
      />

      {/* UK-anchored posture banner */}
      <div className="rounded-2xl bg-gradient-hero text-white p-5 sm:p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 85% 20%, white, transparent 40%)" }}
        />
        <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-5 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-[11px] font-medium">
              <Globe2 className="h-3 w-3" />
              Primary jurisdiction · United Kingdom
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-3 leading-tight">
              UK GDPR · Data Protection Act 2018
            </h2>
            <p className="opacity-85 text-sm mt-2 max-w-xl">
              Personal data is processed under a documented lawful basis, stored in the UK/EEA,
              encrypted in transit and at rest, and surfaces every data subject right (access,
              rectification, erasure, portability, restriction, objection) from one console.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <PostureChip
              icon={<Lock className="h-3.5 w-3.5" />}
              label="Data residency"
              value="UK · London"
            />
            <PostureChip
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="ICO registration"
              value="ZB 845 211"
            />
            <PostureChip
              icon={<Mail className="h-3.5 w-3.5" />}
              label="DPO contact"
              value="dpo@oneedu.uk"
            />
            <PostureChip
              icon={<Clock className="h-3.5 w-3.5" />}
              label="DSAR clock"
              value="30 calendar days"
            />
          </div>
        </div>
      </div>

      {/* Active frameworks — UK first, then "also covered" */}
      <Section
        title="Active compliance frameworks"
        description="The UK regime is the primary posture for this tenant. Equivalent frameworks for other regions are honoured where a tenant operates internationally."
      >
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Primary · UK
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRIMARY_FRAMEWORKS.map((f) => (
            <FrameworkCard key={f.name} {...f} primary />
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-5 mb-2">
          Also covered
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {SECONDARY_FRAMEWORKS.map((f) => (
            <FrameworkCard key={f.name} {...f} />
          ))}
        </div>
      </Section>

      {/* Data subject rights — actionable tooling, not just bullet points */}
      <Section
        title="Data subject rights · self-service"
        description="Every right that UK GDPR Articles 15–22 grant is wired up here. Honoured within the statutory 30 calendar days; complex requests can extend by a further 60 days with notice."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <RightTile
            icon={<Download className="h-4 w-4" />}
            title="Right of access"
            article="Article 15"
            desc="Full export of every field held on a data subject, with provenance."
            cta="Run access export"
          />
          <RightTile
            icon={<FileLock2 className="h-4 w-4" />}
            title="Right to rectification"
            article="Article 16"
            desc="Correct inaccuracies; downstream caches re-key automatically."
            cta="Open rectification queue"
          />
          <RightTile
            icon={<Trash2 className="h-4 w-4" />}
            title="Right to erasure"
            article="Article 17"
            desc="Right-to-be-forgotten with legal-hold checks before purge."
            cta="Start erasure flow"
          />
          <RightTile
            icon={<BookOpen className="h-4 w-4" />}
            title="Right to portability"
            article="Article 20"
            desc="Machine-readable JSON + CSV bundle, signed for integrity."
            cta="Generate portability bundle"
          />
        </div>
      </Section>

      {/* DSAR queue */}
      <Section
        title="DSAR queue"
        description={`${openDsars} request${openDsars === 1 ? "" : "s"} open or verified — countdown against the 30-day UK GDPR clock.`}
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">Ref</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Subject</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Right invoked</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Raised</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Due by</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Status</th>
                <th className="px-4 sm:px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {dsars.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 sm:px-5 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <div className="font-medium">{r.subject}</div>
                    <div className="text-[10px] text-muted-foreground">via {r.origin}</div>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-xs">{r.type}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-muted-foreground">{r.raised}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs">{r.dueBy}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <Badge
                      tone={
                        r.status === "Fulfilled"
                          ? "success"
                          : r.status === "Overdue"
                            ? "destructive"
                            : r.status === "Verified"
                              ? "info"
                              : "warning"
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right">
                    {r.status !== "Fulfilled" && (
                      <Button size="sm" variant="outline" onClick={() => markFulfilled(r.id)}>
                        Mark fulfilled
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Retention schedule */}
      <Section
        title="Retention schedule"
        description="Each category records the lawful basis, the period after which we automatically anonymise or purge, and the disposition action."
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">Data category</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Lawful basis</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Retention</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {RETENTION.map((r) => (
                <tr key={r.category} className="border-b last:border-0">
                  <td className="px-4 sm:px-5 py-3 font-medium">{r.category}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-muted-foreground">{r.basis}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs">{r.period}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Children-specific safeguards */}
      <Section
        title="Children's data safeguards"
        description="Most data subjects on 1StudentID are under 18. The ICO's Age Appropriate Design Code drives the defaults below."
      >
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            {
              icon: Users,
              t: "Parental consent under 13",
              d: "Verified parental consent flow before any account can be created for a child under 13.",
            },
            {
              icon: ShieldCheck,
              t: "Privacy by default",
              d: "Profiles default to private; sharing only enabled per explicit institute policy.",
            },
            {
              icon: Cookie,
              t: "No behavioural advertising",
              d: "No ad networks, no behavioural profiling, no third-party trackers — ever.",
            },
            {
              icon: Lock,
              t: "Geolocation off by default",
              d: "GPS attendance is opt-in per institute and requires DPIA on activation.",
            },
            {
              icon: AlertTriangle,
              t: "Detrimental use blocked",
              d: "Engagement nudges, streaks and dark patterns are switched off for under-18 accounts.",
            },
            {
              icon: BookOpen,
              t: "Age-appropriate transparency",
              d: "Just-in-time privacy notices written for the reading age of the user.",
            },
          ].map(({ icon: I, t, d }) => (
            <li key={t} className="p-3 rounded-lg border bg-card flex gap-3">
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <I className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{d}</div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* Audit log */}
      <Section
        title="Recent audit trail"
        description="Every privacy-relevant action is immutably logged."
      >
        <ul className="divide-y -my-3">
          {auditLog.map((a, i) => (
            <li key={i} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{a.actor}</span> · {a.action}{" "}
                  <span className="text-muted-foreground">→ {a.target}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{a.time}</div>
              </div>
              <Badge
                tone={
                  a.severity === "warning"
                    ? "warning"
                    : a.severity === "success"
                      ? "success"
                      : "muted"
                }
              >
                {a.severity}
              </Badge>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function PostureChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-85">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function FrameworkCard({
  name,
  note,
  region,
  primary,
}: {
  name: string;
  note: string;
  region: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg border bg-card flex items-start gap-2.5 ${
        primary ? "border-primary/30 ring-1 ring-primary/15" : ""
      }`}
    >
      <ShieldCheck className={`h-5 w-5 shrink-0 ${primary ? "text-primary" : "text-success"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="text-sm font-semibold">{name}</div>
          <Badge tone={primary ? "info" : "muted"}>{region}</Badge>
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{note}</div>
        <div className="text-[10px] text-success mt-0.5">● Compliant</div>
      </div>
    </div>
  );
}

function RightTile({
  icon,
  title,
  article,
  desc,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  article: string;
  desc: string;
  cta: string;
}) {
  return (
    <div className="p-3.5 rounded-lg border bg-card flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[10px] text-muted-foreground">{article}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{desc}</div>
      <Button
        size="sm"
        variant="outline"
        className="mt-1 self-start"
        onClick={() => toast.info(cta, { description: "Stub — wires to the DPO workflow." })}
      >
        {cta}
      </Button>
    </div>
  );
}

/* ══ Pack-tenant view ═══════════════════════════════════════════════════════
 * Everything below reads the signed-in tenant's own region profile, learners,
 * guardians and changeLog. Rights-request status changes and new requests are
 * written to the changeLog (entity "rightsRequest") and read back from it. */

type RrStatus = "Open" | "Verified" | "Fulfilled";

interface RightsRequest extends DsarSeed {
  due: string;
  overdue: boolean;
}

const RR_ENTITY = "rightsRequest";

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

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function PackCompliance() {
  const ctx = useTenantContext();
  const posture = PRIVACY[ctx.region.code] ?? PRIVACY.UK!;
  const allLearners = useCollection("learners");
  const allApplications = useCollection("applications");
  const changeLog = useCollection("changeLog");
  const policy = ctx.profile?.studentAccounts;
  const regulator =
    ctx.region.subRegions?.find((s) => s.code === ctx.profile?.subRegion)?.regulator ??
    posture.regulatorContact;

  const learners = useMemo(
    () =>
      allLearners.filter(
        (l) => l.tenantId === ctx.tenantId && l.status !== "Graduated" && l.status !== "Withdrawn",
      ),
    [allLearners, ctx.tenantId],
  );
  const tenantLog = useMemo(
    () =>
      changeLog.filter((c) => c.tenantId === ctx.tenantId).sort((a, b) => b.at.localeCompare(a.at)),
    [changeLog, ctx.tenantId],
  );

  /* Children's data */
  const kids = useMemo(() => {
    const minors = learners.filter((l) => ageAt(l.dob, DEMO_TODAY) < 18);
    const underConsent = learners.filter((l) => ageAt(l.dob, DEMO_TODAY) < posture.consentAge);
    const byMode: Record<AccountMode, { n: number; bands: Set<string> }> = {
      own: { n: 0, bands: new Set() },
      family: { n: 0, bands: new Set() },
      guardian: { n: 0, bands: new Set() },
    };
    for (const l of minors) {
      const a = studentAccountFor(l, policy);
      byMode[a.mode].n++;
      if (a.band) byMode[a.mode].bands.add(a.band);
    }
    const guardians = new Set(minors.flatMap((l) => l.guardians ?? []));
    const noGuardian = minors.filter((l) => !l.guardians?.length);
    const applicants = allApplications.filter(
      (a) => a.tenantId === ctx.tenantId && a.dob && ageAt(a.dob, DEMO_TODAY) < 18,
    ).length;
    return { minors, underConsent, byMode, guardians, noGuardian, applicants };
  }, [learners, allApplications, ctx.tenantId, policy, posture.consentAge]);

  /* Rights requests — seeds + changeLog */
  const requests: RightsRequest[] = useMemo(() => {
    const rrLog = tenantLog.filter((c) => c.entity === RR_ENTITY);
    const logged: DsarSeed[] = rrLog
      .filter((c) => c.field === "Request logged")
      .map((c) => {
        const m = /^Subject: (.*) · Requester: (.*) · Via: (.*)$/.exec(c.reason ?? "");
        return {
          id: c.entityId,
          tenantId: c.tenantId,
          subject: m?.[1] ?? c.entityId,
          requester: m?.[2] ?? c.by,
          origin: m?.[3] ?? "—",
          studentId: c.studentId,
          right: c.to ?? "Access",
          raised: c.at.slice(0, 10),
          status: "Open",
        };
      });
    const all = [...logged, ...DSAR_SEEDS.filter((d) => d.tenantId === ctx.tenantId)];
    return all
      .map((d) => {
        // rrLog is newest first → the first status entry wins.
        const st = rrLog.find((c) => c.entityId === d.id && c.field === "Status")?.to as
          | RrStatus
          | undefined;
        const status = st ?? d.status;
        const due = addDaysIso(d.raised, posture.dsarDays);
        return { ...d, status, due, overdue: status !== "Fulfilled" && due < DEMO_TODAY };
      })
      .sort((a, b) => b.raised.localeCompare(a.raised));
  }, [tenantLog, ctx.tenantId, posture.dsarDays]);

  const setStatus = (r: RightsRequest, to: RrStatus) => {
    const by = ctx.user?.name ?? "DPO";
    logChange({
      tenantId: ctx.tenantId,
      entity: RR_ENTITY,
      entityId: r.id,
      studentId: r.studentId,
      field: "Status",
      from: r.status,
      to,
      by,
      reason: `${r.right} · ${r.subject}`,
    });
    notify({
      tenantId: ctx.tenantId,
      channel: "Email",
      to: r.requester,
      subject:
        to === "Verified"
          ? `${ctx.tenantName}: identity confirmed for request ${r.id}`
          : `${ctx.tenantName}: your request ${r.id} is complete`,
      body:
        to === "Verified"
          ? `We have confirmed your identity. We will respond by ${r.due}.`
          : `Your ${r.right.toLowerCase()} request about ${r.subject} has been completed.`,
      source: "Compliance · rights request",
      relatedId: r.id,
    });
    toast.success(`${r.id} → ${to}`, { description: `Requester notified · logged by ${by}` });
  };

  const openCount = requests.filter((r) => r.status !== "Fulfilled").length;
  const overdueCount = requests.filter((r) => r.overdue).length;
  const retention = PACK_RETENTION[ctx.type] ?? PACK_RETENTION.school ?? [];
  const logDialog = useDisclosure();
  const providerLabel = PROVIDER_LABEL[policy?.provider ?? "native"];
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

  const safeguards: { icon: typeof Users; t: string; d: string; tone?: "warning" }[] = [];
  if (kids.minors.length) {
    safeguards.push({
      icon: Users,
      t: "Guardian consent",
      d: `${plural(kids.minors.length, "learner")} under 18, linked to ${plural(kids.guardians.size, "guardian")}. ${posture.consentNote}`,
    });
  } else {
    safeguards.push({
      icon: Users,
      t: "No under-18 learners enrolled",
      d: `${plural(kids.applicants, "under-18 applicant")} in admissions. Children's defaults apply to them until they turn 18.`,
    });
  }
  if (kids.byMode.family.n)
    safeguards.push({
      icon: KeyRound,
      t: "Family-used pupil accounts",
      d: `${plural(kids.byMode.family.n, "pupil")} (${[...kids.byMode.family.bands].join(", ")}). The family uses the pupil login; consent needs the guardian's one-time code.`,
    });
  if (kids.byMode.guardian.n)
    safeguards.push({
      icon: Baby,
      t: "Parent account only",
      d: `${plural(kids.byMode.guardian.n, "child", "children")} (${[...kids.byMode.guardian.bands].join(", ")}) have no pupil login. Parents act for them.`,
    });
  if (kids.byMode.own.n)
    safeguards.push({
      icon: ShieldCheck,
      t: "Own pupil sign-in",
      d: `${plural(kids.byMode.own.n, "under-18 pupil")} sign in with ${providerLabel}. Private by default; no public profile.`,
    });
  if (kids.noGuardian.length)
    safeguards.push({
      icon: AlertTriangle,
      tone: "warning",
      t: "Minors without a guardian on record",
      d: kids.noGuardian.map((l) => `${l.name} (${l.id})`).join(", "),
    });
  safeguards.push(
    {
      icon: Cookie,
      t: "No behavioural advertising",
      d: "No ad networks or tracking on learner, parent or applicant pages.",
    },
    {
      icon: Lock,
      t: "Official IDs masked",
      d: "Passport and national IDs show the last 4 characters only, in screens and exports.",
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & Audit"
        subtitle={`${posture.headline} · ${ctx.tenantName}`}
        actions={
          <Button onClick={logDialog.onOpen}>
            <Plus className="h-4 w-4" /> Log rights request
          </Button>
        }
      />
      <PackContextBar />

      {/* Posture banner */}
      <div className="rounded-2xl bg-gradient-hero text-white p-5 sm:p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 85% 20%, white, transparent 40%)" }}
        />
        <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-5 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-[11px] font-medium">
              <Globe2 className="h-3 w-3" />
              {ctx.region.flag} {ctx.region.name}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-3 leading-tight">{posture.headline}</h2>
            <p className="opacity-85 text-sm mt-2 max-w-xl">{ctx.region.dataProtection}</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <PostureChip
              icon={<Lock className="h-3.5 w-3.5" />}
              label="Data residency"
              value={posture.residency}
            />
            <PostureChip
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="Regulator"
              value={regulator}
            />
            <PostureChip
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Rights clock"
              value={`${posture.dsarDays} days`}
            />
            <PostureChip
              icon={<Baby className="h-3.5 w-3.5" />}
              label="Guardian consent under"
              value={`${posture.consentAge} years`}
            />
          </div>
        </div>
      </div>

      <Section
        title="Frameworks that apply"
        description={`From ${ctx.tenantName}'s region profile (${ctx.region.name}).`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {posture.frameworks.map((f) => (
            <FrameworkCard key={f.name} name={f.name} note={f.note} region={f.scope} primary />
          ))}
        </div>
        <VerifyNote />
      </Section>

      {/* Children's data */}
      <Section
        title="Children's data"
        description={`Ages on ${DEMO_TODAY}, from each learner's date of birth. Sign-in: ${providerLabel}${policy?.domain ? ` · @${policy.domain}` : ""}.`}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Learners" value={learners.length} icon={<Users className="h-5 w-5" />} />
          <StatCard
            label="Under 18"
            value={kids.minors.length}
            hint={
              learners.length
                ? `${Math.round((kids.minors.length / learners.length) * 100)}% of learners`
                : undefined
            }
            icon={<Baby className="h-5 w-5" />}
            accent="warning"
          />
          <StatCard
            label={`Under ${posture.consentAge}`}
            value={kids.underConsent.length}
            hint="Guardian consents"
            icon={<ShieldCheck className="h-5 w-5" />}
            accent="info"
          />
          <StatCard
            label="Under-18 applicants"
            value={kids.applicants}
            icon={<UserRound className="h-5 w-5" />}
            accent="success"
          />
        </div>
        {kids.minors.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            {(["own", "family", "guardian"] as AccountMode[])
              .filter((m) => kids.byMode[m].n)
              .map((m) => (
                <span key={m} className="rounded-full border px-2.5 py-1 bg-card">
                  {ACCOUNT_MODE_LABEL[m]}: <span className="font-semibold">{kids.byMode[m].n}</span>
                </span>
              ))}
          </div>
        )}
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {safeguards.map(({ icon: I, t, d, tone }) => (
            <li
              key={t}
              className={`p-3 rounded-lg border bg-card flex gap-3 ${tone === "warning" ? "border-warning/40 bg-warning/5" : ""}`}
            >
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <I className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{d}</div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* Rights requests */}
      <Section
        title="Rights requests"
        description={`${openCount} open${overdueCount ? ` · ${overdueCount} overdue` : ""}. ${posture.dsarNote}`}
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">Ref</th>
                <th className="px-4 sm:px-5 py-2 font-medium">About</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Right</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Raised</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Due</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Status</th>
                <th className="px-4 sm:px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="px-4 sm:px-5 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <div className="font-medium">{r.subject}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.requester} · via {r.origin}
                    </div>
                    {r.note && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{r.note}</div>
                    )}
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-xs">{r.right}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-muted-foreground">{r.raised}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs">{r.due}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <Badge
                      tone={
                        r.status === "Fulfilled"
                          ? "success"
                          : r.overdue
                            ? "destructive"
                            : r.status === "Verified"
                              ? "info"
                              : "warning"
                      }
                    >
                      {r.overdue ? "Overdue" : r.status}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right whitespace-nowrap">
                    {r.status === "Open" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r, "Verified")}>
                        Verify identity
                      </Button>
                    )}
                    {r.status === "Verified" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r, "Fulfilled")}>
                        Mark fulfilled
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Retention */}
      <Section
        title="Retention schedule"
        description={`Typical periods for a ${ctx.type === "university" ? "university" : ctx.type === "college" ? "VET college" : "school"} in ${ctx.region.name}. Demo-grade — confirm with your DPO.`}
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">Data</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Basis</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Keep for</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Then</th>
              </tr>
            </thead>
            <tbody>
              {retention.map((r) => (
                <tr key={r.category} className="border-b last:border-0">
                  <td className="px-4 sm:px-5 py-3 font-medium">{r.category}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-muted-foreground">{r.basis}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs">{r.period}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <AuditTrail entries={tenantLog} tenantName={ctx.tenantName} tenantId={ctx.tenantId} />

      <LogRequestDialog
        open={logDialog.open}
        onOpenChange={logDialog.setOpen}
        rights={posture.rights}
        dsarDays={posture.dsarDays}
      />
    </div>
  );
}

/* ── Audit trail (this tenant's changeLog) ───────────────────────────────── */

function AuditTrail({
  entries,
  tenantName,
  tenantId,
}: {
  entries: ChangeLogEntry[];
  tenantName: string;
  tenantId: string;
}) {
  const ctx = useTenantContext();
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [actor, setActor] = useState("all");
  const [from, setFrom] = useState("");
  const [showAll, setShowAll] = useState(false);

  const entities = useMemo(() => [...new Set(entries.map((e) => e.entity))].sort(), [entries]);
  const actors = useMemo(() => [...new Set(entries.map((e) => e.by))].sort(), [entries]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (entity === "all" || e.entity === entity) &&
        (actor === "all" || e.by === actor) &&
        (!from || e.at.slice(0, 10) >= from) &&
        (!needle ||
          [e.entityId, e.studentId, e.field, e.from, e.to, e.by, e.reason]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(needle))),
    );
  }, [entries, q, entity, actor, from]);
  const shown = showAll ? rows : rows.slice(0, 25);

  const exportCsv = () => {
    downloadCsv(
      `audit-trail-${tenantId}-${DEMO_TODAY}.csv`,
      ["When (UTC)", "Record", "Record id", "Student", "Field", "From", "To", "By", "Reason"],
      rows.map((e) => [
        e.at,
        e.entity,
        e.entityId,
        e.studentId ?? "",
        e.field,
        e.from ?? "",
        e.to ?? "",
        e.by,
        e.reason ?? "",
      ]),
    );
    logChange({
      tenantId,
      entity: "auditTrail",
      entityId: tenantId,
      field: "Exported",
      to: `${rows.length} rows (CSV)`,
      by: ctx.user?.name ?? "Admin",
      reason: "Compliance → audit trail export",
    });
    toast.success(`Exported ${rows.length} audit rows`);
  };

  return (
    <Section
      title="Recent audit trail"
      description={`Field-level changes at ${tenantName}, newest first. Sensitive values appear masked, as stored.`}
      actions={
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search id, field, value…"
            className="pl-8"
          />
        </div>
        <Select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          options={[
            { value: "all", label: "All record types" },
            ...entities.map((x) => ({ value: x, label: x })),
          ]}
        />
        <Select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          options={[
            { value: "all", label: "Anyone" },
            ...actors.map((x) => ({ value: x, label: x })),
          ]}
        />
        <TextInput
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="From date"
        />
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          No changes match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">When</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Record</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Field</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Change</th>
                <th className="px-4 sm:px-5 py-2 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-b last:border-0 align-top">
                  <td className="px-4 sm:px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtWhen(e.at)}
                  </td>
                  <td className="px-4 sm:px-5 py-2.5 text-xs">
                    <Badge tone="muted">{e.entity}</Badge>
                    <div className="font-mono text-[10px] text-muted-foreground mt-1">
                      {e.entityId}
                      {e.studentId && e.studentId !== e.entityId ? ` · ${e.studentId}` : ""}
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 py-2.5 text-xs font-medium">{e.field}</td>
                  <td className="px-4 sm:px-5 py-2.5 text-xs max-w-[340px]">
                    {e.from && <span className="text-muted-foreground line-through">{e.from}</span>}
                    {e.from && e.to && <span className="text-muted-foreground"> → </span>}
                    {e.to && <span>{e.to}</span>}
                    {e.reason && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{e.reason}</div>
                    )}
                  </td>
                  <td className="px-4 sm:px-5 py-2.5 text-xs">{e.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {shown.length} of {rows.length} shown · {entries.length} entries in total
        </span>
        {rows.length > 25 && (
          <button className="text-primary font-medium" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : "Show all"}
          </button>
        )}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Account changes are made in{" "}
        <Link to="/app/it" className="text-primary hover:underline">
          IT Administration
        </Link>
        ; record changes in Student Records. Both write here.
      </div>
    </Section>
  );
}

/* ── Log a rights request ────────────────────────────────────────────────── */

function LogRequestDialog({
  open,
  onOpenChange,
  rights,
  dsarDays,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rights: string[];
  dsarDays: number;
}) {
  const ctx = useTenantContext();
  const allLearners = useCollection("learners");
  const changeLog = useCollection("changeLog");
  const people = useMemo(() => {
    const learners = allLearners.filter((l) => l.tenantId === ctx.tenantId);
    const out: { key: string; label: string; subject: string; requester: string; sid?: string }[] =
      [];
    for (const l of learners) {
      const minor = ageAt(l.dob, DEMO_TODAY) < 18;
      const g = l.guardians?.[0];
      out.push({
        key: l.id,
        label: `${l.name} · ${l.id}${minor && g ? ` (via ${g})` : ""}`,
        subject: l.name,
        requester: minor && g ? `${g} (guardian)` : l.name,
        sid: l.id,
      });
    }
    for (const s of TENANT_STAFF[ctx.tenantId] ?? [])
      out.push({
        key: `staff:${s.name}`,
        label: `${s.name} · staff`,
        subject: `${s.name} (staff)`,
        requester: s.name,
      });
    return out;
  }, [allLearners, ctx.tenantId]);

  const [who, setWho] = useState("");
  const [right, setRight] = useState(rights[0] ?? "Access");
  const [origin, setOrigin] = useState("Email to DPO");
  const submit = () => {
    const p = people.find((x) => x.key === who);
    if (!p) {
      toast.error("Choose who the request is about");
      return;
    }
    const prior = changeLog.filter(
      (c) => c.entity === RR_ENTITY && c.field === "Request logged" && c.tenantId === ctx.tenantId,
    ).length;
    const id = `RR-${ctx.tenantId.slice(2)}-${String(prior + 1).padStart(3, "0")}`;
    const by = ctx.user?.name ?? "DPO";
    const due = addDaysIso(DEMO_TODAY, dsarDays);
    logChange({
      tenantId: ctx.tenantId,
      entity: RR_ENTITY,
      entityId: id,
      studentId: p.sid,
      field: "Request logged",
      to: right,
      by,
      reason: `Subject: ${p.subject} · Requester: ${p.requester} · Via: ${origin}`,
    });
    notify({
      tenantId: ctx.tenantId,
      channel: "Email",
      to: p.requester,
      subject: `${ctx.tenantName}: we received your request ${id}`,
      body: `We will respond by ${due}. We may ask you to confirm your identity first.`,
      source: "Compliance · rights request",
      relatedId: id,
    });
    toast.success(`${id} logged`, { description: `Due ${due}` });
    setWho("");
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Log a rights request"
      description={`The clock is ${dsarDays} days. For a child, the guardian makes the request.`}
      onSubmit={submit}
      submitLabel="Log request"
    >
      <Field label="About" required>
        <Select
          value={who}
          onChange={(e) => setWho(e.target.value)}
          options={[
            { value: "", label: "Choose a person…" },
            ...people.map((p) => ({ value: p.key, label: p.label })),
          ]}
        />
      </Field>
      <Field label="Right">
        <Select
          value={right}
          onChange={(e) => setRight(e.target.value)}
          options={rights.map((r) => ({ value: r, label: r }))}
        />
      </Field>
      <Field label="Received via">
        <Select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          options={["Email to DPO", "Parent app", "Student portal", "Front office", "Letter"].map(
            (o) => ({ value: o, label: o }),
          )}
        />
      </Field>
    </FormDialog>
  );
}
