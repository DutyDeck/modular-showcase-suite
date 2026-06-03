import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Badge, Button } from "@/components/ui-kit";
import { auditLog } from "@/lib/mockData";
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
} from "lucide-react";

export const Route = createFileRoute("/app/compliance")({
  head: () => ({ meta: [{ title: "Compliance — One Edu" }] }),
  component: CompliancePage,
});

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
  type: "Access (Art. 15)" | "Erasure (Art. 17)" | "Portability (Art. 20)" | "Rectification (Art. 16)";
  raised: string;
  dueBy: string;
  status: "Open" | "Verified" | "Fulfilled" | "Overdue";
  origin: string;
}

const INITIAL_DSARS: DsarRow[] = [
  { id: "DSAR-2026-0118", subject: "Nimal Perera (parent · S-1001 + S-1009)", type: "Access (Art. 15)", raised: "2026-05-29", dueBy: "2026-06-28", status: "Verified", origin: "In-app request" },
  { id: "DSAR-2026-0117", subject: "Former student · GCH-22-PHY-091", type: "Erasure (Art. 17)", raised: "2026-05-22", dueBy: "2026-06-21", status: "Open", origin: "Email · dpo@oneedu.uk" },
  { id: "DSAR-2026-0116", subject: "Sara Wijesinghe (parent on behalf)", type: "Portability (Art. 20)", raised: "2026-05-18", dueBy: "2026-06-17", status: "Fulfilled", origin: "In-app request" },
  { id: "DSAR-2026-0115", subject: "Lawful basis correction · staff record", type: "Rectification (Art. 16)", raised: "2026-05-14", dueBy: "2026-06-13", status: "Fulfilled", origin: "DPO ticket" },
];

const RETENTION = [
  { category: "Student academic records", basis: "Public task (DfE retention guidance)", period: "25 years after leaving", action: "Anonymise then archive" },
  { category: "Safeguarding & SRB entries", basis: "Vital interests / legal obligation", period: "Until 25th birthday", action: "Sealed archive, restricted access" },
  { category: "Financial invoices & receipts", basis: "Legal obligation (Companies Act, HMRC)", period: "7 years", action: "Then purge" },
  { category: "Marketing / lead enquiries", basis: "Consent", period: "12 months (renewable)", action: "Auto-purge if not renewed" },
  { category: "Attendance & timetable data", basis: "Legitimate interests", period: "7 years", action: "Aggregate then anonymise" },
  { category: "MFA / session logs", basis: "Legitimate interests · security", period: "13 months", action: "Auto-purge" },
];

function CompliancePage() {
  const [dsars, setDsars] = useState<DsarRow[]>(INITIAL_DSARS);

  const markFulfilled = (id: string) => {
    setDsars((rows) =>
      rows.map((r) => (r.id === id ? { ...r, status: "Fulfilled" } : r)),
    );
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
              Personal data is processed under a documented lawful basis, stored in the
              UK/EEA, encrypted in transit and at rest, and surfaces every data subject
              right (access, rectification, erasure, portability, restriction, objection)
              from one console.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <PostureChip icon={<Lock className="h-3.5 w-3.5" />} label="Data residency" value="UK · London" />
            <PostureChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="ICO registration" value="ZB 845 211" />
            <PostureChip icon={<Mail className="h-3.5 w-3.5" />} label="DPO contact" value="dpo@oneedu.uk" />
            <PostureChip icon={<Clock className="h-3.5 w-3.5" />} label="DSAR clock" value="30 calendar days" />
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
        description="Most data subjects on One Edu are under 18. The ICO's Age Appropriate Design Code drives the defaults below."
      >
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            { icon: Users, t: "Parental consent under 13", d: "Verified parental consent flow before any account can be created for a child under 13." },
            { icon: ShieldCheck, t: "Privacy by default", d: "Profiles default to private; sharing only enabled per explicit institute policy." },
            { icon: Cookie, t: "No behavioural advertising", d: "No ad networks, no behavioural profiling, no third-party trackers — ever." },
            { icon: Lock, t: "Geolocation off by default", d: "GPS attendance is opt-in per institute and requires DPIA on activation." },
            { icon: AlertTriangle, t: "Detrimental use blocked", d: "Engagement nudges, streaks and dark patterns are switched off for under-18 accounts." },
            { icon: BookOpen, t: "Age-appropriate transparency", d: "Just-in-time privacy notices written for the reading age of the user." },
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
      <Section title="Recent audit trail" description="Every privacy-relevant action is immutably logged.">
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
