import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Award,
  BadgeCheck,
  Clock,
  Eye,
  Printer,
  Search,
  Send,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  DataTable,
  Select,
  TextInput,
} from "@/components/ui-kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { PackContextBar, PackEmpty, StatusPill, Tabs } from "@/components/packs/PackUI";
import { useHeData, fmtDate, type HeData } from "@/components/packs/HeDash";
import {
  GpaPanel,
  GradeChip,
  gpaInputs,
  moduleResults,
  releaseNote,
  useResults,
  visibleMarks,
} from "@/components/packs/ResultsUI";
import { updateItem, useCollection } from "@/lib/store";
import { classify, ID_FIELDS, REGIONS, type RegionCode } from "@/lib/packs/regions";
import { pgtClassification, stageSummary, type StageSummary } from "@/lib/packs/heData";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import { notify, logChange } from "@/lib/packs/sis/activity";
import {
  CERT_PREFIX,
  GRADING_PRESETS,
  fmtGpa,
  gradeFor,
  gpaSummary,
  makeVerifyCode,
  nextSerials,
  schemeFromPreset,
  type CertificateIssue,
  type GradingScheme,
} from "@/lib/packs/sis/results";

export const Route = createFileRoute("/app/he/transcripts")({
  head: () => ({ meta: [{ title: "Transcripts & Awards — 1StudentID" }] }),
  component: TranscriptsPage,
});

const COMPARE: RegionCode[] = ["UK", "AU", "LK", "IN", "AE"];

type Tab = "transcript" | "certificates" | "verify";

function TranscriptsPage() {
  const d = useHeData();
  const { certs } = useResults();
  const student = d.ctx.user?.role === "student";
  const staff = !student;
  const candidates = d.learners.filter((l) => l.programmeId);
  const [pick, setPick] = useState(candidates.find((l) => l.status !== "Withdrawn")?.id ?? "");
  const [tab, setTab] = useState<Tab>("transcript");
  const learner = student ? d.me : (candidates.find((l) => l.id === pick) ?? candidates[0]);
  const ready = certs.filter((c) => certStatus(d, c) === "Ready to issue").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={student ? "Results & Transcript" : "Transcripts & Awards"}
        subtitle="Module results by stage, grades and GPA, board decisions, classification, and award certificates."
        actions={
          tab === "transcript" && (
            <>
              {staff && candidates.length > 0 && (
                <Select
                  className="h-9 w-64"
                  value={learner?.id ?? ""}
                  onChange={(e) => setPick(e.target.value)}
                  options={candidates.map((l) => ({
                    value: l.id,
                    label: `${l.name} · ${l.level}`,
                  }))}
                />
              )}
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              {staff && d.ctx.isAdmin && learner && (
                <Button
                  onClick={() => {
                    const code = makeVerifyCode(`${learner.id}-transcript-${Date.now()}`);
                    notify({
                      tenantId: d.tenantId,
                      channel: "Email",
                      to: `${learner.name} (${learner.email})`,
                      subject: "Your official transcript",
                      body: `Your official transcript is attached. Verification code ${code}.`,
                      source: "Results · transcripts",
                      relatedId: learner.id,
                    });
                    toast.success(
                      `Official transcript emailed to ${learner.email} · verification code ${code}`,
                    );
                  }}
                >
                  <Send className="h-4 w-4" /> Issue transcript
                </Button>
              )}
            </>
          )
        }
      />
      <PackContextBar pack="higher-ed" />
      {staff && (
        <Tabs<Tab>
          tabs={[
            { id: "transcript", label: "Transcript" },
            { id: "certificates", label: "Certificates", count: ready },
            { id: "verify", label: "Verify a certificate" },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}
      {tab === "certificates" ? (
        <Certificates />
      ) : tab === "verify" ? (
        <VerifyCertificate />
      ) : d.programmes.length === 0 ? (
        <PackEmpty
          pack="higher-ed"
          title="No programmes yet"
          body="Transcripts are generated from programme, module and board data."
        />
      ) : learner ? (
        <Transcript learner={learner} />
      ) : (
        <div className="text-sm text-muted-foreground">No student record to show.</div>
      )}
    </div>
  );
}

/* ── Transcript ──────────────────────────────────────────────────────────── */

function Transcript({ learner }: { learner: Learner }) {
  const d = useHeData();
  const { batches, scheme } = useResults();
  const student = d.ctx.user?.role === "student";
  const p = d.programmeById(learner.programmeId);
  if (!p) return <div className="text-sm text-muted-foreground">Not on a programme.</div>;
  // Students see released (published) marks only; staff see everything.
  const marks = visibleMarks(d, batches);
  const pgt = p.level === "PGT";
  const region = d.ctx.region;
  const stages = p.stages.map((s) => ({
    s,
    sum: stageSummary(p, s, d.modules, d.regs, marks, learner.id),
  }));
  const withMarks = stages.filter((x) => x.sum.creditsAttempted > 0);
  const creditsAchieved = stages.reduce((a, x) => a + x.sum.creditsPassed, 0);
  const results = moduleResults(d, scheme, marks, learner.id, p.passMark);

  // Classification basis: later stages count (UK UG usually excludes Level 4).
  const basis = !pgt && withMarks.length > 1 ? withMarks.slice(1) : withMarks;
  const weights = basis.map((_, i) =>
    basis.length === 2 ? (i === 0 ? 0.4 : 0.6) : 1 / basis.length,
  );
  const projected = basis.length
    ? Math.round(basis.reduce((a, x, i) => a + x.sum.average * weights[i], 0) * 10) / 10
    : 0;
  const label = (code: RegionCode, avg: number) =>
    pgt ? pgtClassification(avg) : classify(code, avg);
  const ids = Object.entries(learner.officialIds).filter(([k]) => k !== "passport");
  const final = d.decisions.find(
    (x) => x.studentId === learner.id && x.outcome === "Award" && x.ratified,
  );
  const note = (moduleId: string) => releaseNote(d, batches, learner.id, moduleId);

  return (
    <div className="grid xl:grid-cols-[1fr_300px] gap-4 lg:gap-6">
      <div className="rounded-xl border bg-card shadow-soft overflow-hidden print:shadow-none">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5">
          <div className="text-[11px] uppercase tracking-[0.2em] opacity-80">
            {d.ctx.tenantName}
          </div>
          <div className="text-xl font-bold mt-0.5">Academic Transcript</div>
          <div className="text-xs opacity-80">
            Issued {fmtDate(new Date().toISOString())} · unofficial copy unless issued
          </div>
        </div>
        <div className="p-5 grid sm:grid-cols-[auto_1fr] gap-4 border-b">
          <Avatar name={learner.name} seed={learner.id} size={56} />
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <Item label="Student" value={learner.name} />
            <Item label="1StudentID" value={<span className="font-mono">{learner.id}</span>} />
            <Item label="Date of birth" value={fmtDate(learner.dob)} />
            <Item label="Programme" value={`${p.award} ${p.name}`} />
            <Item
              label="Mode · intake"
              value={`${learner.mode ?? p.mode} · ${learner.intake ?? "—"}`}
            />
            <Item label="Status" value={learner.status} />
            {ids.map(([k, v]) => (
              <Item
                key={k}
                label={ID_FIELDS[k]?.label ?? k}
                value={<span className="font-mono text-xs">{v}</span>}
              />
            ))}
          </dl>
        </div>

        {stages.map(({ s, sum }) => {
          const dec = d.decisions
            .filter(
              (x) => x.studentId === learner.id && x.programmeId === p.id && x.stage === s.name,
            )
            .sort((a, b) => b.boardDate.localeCompare(a.boardDate))[0];
          return (
            <StageBlock
              key={s.name}
              name={s.name}
              credits={s.credits}
              sum={sum}
              decision={dec}
              passMark={p.passMark}
              scheme={scheme}
              note={note}
              student={student}
            />
          );
        })}

        <div className="p-5 border-t bg-muted/20 text-xs text-muted-foreground space-y-1">
          <div className="font-medium text-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> Verifiable record
          </div>
          <p>
            This transcript is bound to the learner's permanent 1StudentID ({learner.id}). Credit is
            expressed in {region.creditScheme}. A resit mark is capped at the pass mark (
            {p.passMark}%) unless extenuating circumstances were approved. Only results released
            after approval appear. Achievement-record style notes (HEAR) — societies, prizes,
            placements — appear below when recorded.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Section title="Summary">
          <div className="space-y-3 text-sm">
            <Row label="Credits achieved" value={`${creditsAchieved} / ${p.totalCredits}`} />
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, (creditsAchieved / p.totalCredits) * 100)}%` }}
              />
            </div>
            <Row
              label={final ? "Final average" : "Weighted average to date"}
              value={`${final?.average ?? projected}%`}
            />
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {final ? "Award" : "Projected classification"}
              </div>
              <div className="font-semibold mt-0.5">
                {final?.classification ?? label(region.code, projected)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {pgt
                  ? "UK PGT scheme (Distinction / Merit / Pass)"
                  : basis.length === 2
                    ? "Weighted 40 / 60 across the two later stages"
                    : withMarks.length > 1
                      ? "First stage excluded from classification"
                      : "Indicative — based on marks to date"}
              </div>
            </div>
          </div>
        </Section>
        <Section
          title={scheme.kind === "gpa" ? "GPA & standing" : "Average & standing"}
          description="Credit-weighted, from the institution's grading scheme"
        >
          <GpaPanel scheme={scheme} rows={results} />
        </Section>
        {!pgt && (
          <Section
            title="Same marks, other regions"
            description="Classification bands come from the tenant's region profile"
          >
            <ul className="space-y-1.5 text-xs">
              {COMPARE.map((code) => (
                <li
                  key={code}
                  className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${code === region.code ? "bg-primary/10 font-medium" : ""}`}
                >
                  <span>
                    {REGIONS[code].flag} {REGIONS[code].name}
                  </span>
                  <span className="text-right">{label(code, projected)}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
        <Section title="Same marks, other grading scales">
          <ul className="space-y-1.5 text-xs">
            {GRADING_PRESETS.map((preset) => {
              const s: GradingScheme = schemeFromPreset(d.tenantId, preset);
              const sum = gpaSummary(s, gpaInputs(results));
              return (
                <li
                  key={preset.id}
                  className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${preset.id === scheme.presetId ? "bg-primary/10 font-medium" : ""}`}
                >
                  <span>{preset.label}</span>
                  <span className="font-mono">{sum.credits ? fmtGpa(s, sum.cumulative) : "—"}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function StageBlock({
  name,
  credits,
  sum,
  decision,
  passMark,
  scheme,
  note,
  student,
}: {
  name: string;
  credits: number;
  sum: StageSummary;
  decision?: { outcome: string; boardDate: string; ratified: boolean };
  passMark: number;
  scheme: GradingScheme;
  note: (moduleId: string) => string | undefined;
  student: boolean;
}) {
  const gpa = scheme.kind === "gpa";
  return (
    <div className="p-5 border-b last:border-b-0">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="font-semibold text-sm">
          {name} <span className="text-muted-foreground font-normal">· {credits} credits</span>
        </div>
        <div className="flex items-center gap-1.5">
          {sum.creditsAttempted > 0 && <Badge tone="info">Average {sum.average}%</Badge>}
          {decision && (
            <Badge tone={decision.ratified ? "success" : "warning"}>
              {decision.outcome} · {fmtDate(decision.boardDate)}
              {!decision.ratified && " (unratified)"}
            </Badge>
          )}
        </div>
      </div>
      {sum.modules.length === 0 ? (
        <div className="text-xs text-muted-foreground">Not yet started.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
              <th className="py-1.5 pr-2 font-medium">Code</th>
              <th className="py-1.5 pr-2 font-medium">Module</th>
              <th className="py-1.5 pr-2 font-medium text-right">Credits</th>
              <th className="py-1.5 pr-2 font-medium text-right">Mark</th>
              <th className="py-1.5 pr-2 font-medium text-right">
                {gpa ? "Grade · pts" : "Grade"}
              </th>
              <th className="py-1.5 font-medium text-right">Result</th>
            </tr>
          </thead>
          <tbody>
            {sum.modules.map(({ mod, outcome, kind }) => {
              const pending = note(mod.id);
              const result = !outcome.complete
                ? outcome.mark === undefined
                  ? student && pending
                    ? pending
                    : "Registered"
                  : "In progress"
                : outcome.passed
                  ? outcome.attempt === 2
                    ? outcome.capped
                      ? `Pass (resit, capped ${passMark})`
                      : "Pass (resit)"
                    : "Pass"
                  : "Fail";
              return (
                <tr key={mod.id} className="border-b last:border-b-0">
                  <td className="py-1.5 pr-2 font-mono text-xs text-muted-foreground">
                    {mod.code}
                  </td>
                  <td className="py-1.5 pr-2">
                    {mod.title}
                    {kind === "Optional" && (
                      <span className="text-[10px] text-muted-foreground"> · optional</span>
                    )}
                    {!student && pending && (
                      <span className="ml-1.5">
                        <Badge tone="muted">Not released</Badge>
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right">{mod.credits}</td>
                  <td className="py-1.5 pr-2 text-right font-medium">
                    {outcome.complete ? (
                      outcome.mark
                    ) : outcome.mark !== undefined ? (
                      <span className="text-muted-foreground">{outcome.mark}*</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    <GradeChip
                      scheme={scheme}
                      band={
                        outcome.complete && outcome.mark !== undefined
                          ? gradeFor(scheme, outcome.mark)
                          : undefined
                      }
                    />
                  </td>
                  <td
                    className={`py-1.5 text-right text-xs ${result === "Fail" ? "text-destructive font-medium" : ""} ${pending && student && outcome.mark === undefined ? "text-muted-foreground" : ""}`}
                  >
                    {pending && student && outcome.mark === undefined && (
                      <Clock className="h-3 w-3 inline mr-1" />
                    )}
                    {result}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Certificates ────────────────────────────────────────────────────────── */

/** Awaiting results flips to Ready once a ratified Award decision exists. */
function certStatus(d: HeData, c: CertificateIssue): CertificateIssue["status"] {
  if (c.status !== "Awaiting results") return c.status;
  return d.decisions.some((x) => x.studentId === c.studentId && x.outcome === "Award" && x.ratified)
    ? "Ready to issue"
    : "Awaiting results";
}

function Certificates() {
  const d = useHeData();
  const { certs, certsAll } = useResults();
  const me = d.ctx.user?.name ?? "Registrar";
  const [filter, setFilter] = useState<"all" | CertificateIssue["status"]>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<CertificateIssue | null>(null);
  const holder = (c: CertificateIssue) => c.holderName ?? d.name(c.studentId);
  const rows = certs
    .map((c) => {
      const award = d.decisions.find(
        (x) => x.studentId === c.studentId && x.outcome === "Award" && x.ratified,
      );
      return {
        ...c,
        status: certStatus(d, c),
        classification: c.classification ?? award?.classification,
        awardDate: c.awardDate ?? award?.boardDate,
      };
    })
    .sort((a, b) => a.status.localeCompare(b.status) || holder(a).localeCompare(holder(b)));
  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const ready = rows.filter((r) => r.status === "Ready to issue");
  const toIssue = selected.size ? ready.filter((r) => selected.has(r.id)) : ready;
  const count = (s: CertificateIssue["status"]) => rows.filter((r) => r.status === s).length;

  const issueBatch = () => {
    if (!toIssue.length) return;
    const year = Number(DEMO_TODAY.slice(0, 4));
    const serials = nextSerials(certsAll, d.tenantId, year, toIssue.length);
    const batch = `${CERT_PREFIX[d.tenantId] ?? "CRT"}-B-${DEMO_TODAY.slice(0, 7)}`;
    const at = new Date().toISOString();
    toIssue.forEach((c, i) => {
      const verifyCode = makeVerifyCode();
      updateItem("certificateIssues", (x) => x.id === c.id, {
        status: "Issued",
        serial: serials[i],
        verifyCode,
        batch,
        issuedAt: at,
        issuedBy: me,
        classification: c.classification,
        awardDate: c.awardDate,
      });
      logChange({
        tenantId: d.tenantId,
        entity: "certificate",
        entityId: c.id,
        studentId: c.studentId,
        field: "status",
        from: "Ready to issue",
        to: `Issued ${serials[i]}`,
        by: me,
        reason: `Batch ${batch} · verify code ${verifyCode}`,
      });
      const l = d.learners.find((x) => x.id === c.studentId);
      notify({
        tenantId: d.tenantId,
        channel: "Email",
        to: l ? `${l.name} (${l.email})` : holder(c),
        subject: "Your award certificate has been issued",
        body: `Certificate ${serials[i]}. Anyone can check it with verification code ${verifyCode}.`,
        source: "Results · certificates",
        relatedId: c.id,
      });
    });
    setSelected(new Set());
    toast.success(
      `${toIssue.length} certificate(s) issued — serials ${serials[0]}${serials.length > 1 ? ` to ${serials[serials.length - 1]}` : ""}`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Awaiting results"
          value={count("Awaiting results")}
          hint="Final-year, no award yet"
          icon={<Clock className="h-4 w-4" />}
          accent="warning"
        />
        <StatCard
          label="Ready to issue"
          value={count("Ready to issue")}
          hint="Award ratified"
          icon={<Award className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Issued"
          value={count("Issued")}
          hint="Serial + verify code"
          icon={<BadgeCheck className="h-4 w-4" />}
          accent="success"
        />
      </div>
      <Section
        title="Graduates & certificates"
        description="Issue in batches: each certificate gets a serial number and a public verification code."
        actions={
          <>
            <Select
              className="h-8 w-44"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "Awaiting results", label: "Awaiting results" },
                { value: "Ready to issue", label: "Ready to issue" },
                { value: "Issued", label: "Issued" },
              ]}
            />
            <Button size="sm" disabled={!toIssue.length} onClick={issueBatch}>
              <Award className="h-3.5 w-3.5" /> Issue batch ({toIssue.length})
            </Button>
          </>
        }
      >
        <DataTable
          columns={[
            { key: "_sel", label: "" },
            { key: "holder", label: "Graduate" },
            { key: "award", label: "Award" },
            { key: "status", label: "Status" },
            { key: "serial", label: "Serial · verify code" },
            { key: "_actions", label: "", className: "text-right" },
          ]}
          rows={shown}
          emptyText="No graduates."
          renderCell={(c: (typeof rows)[number], key) => {
            switch (key) {
              case "_sel":
                return c.status === "Ready to issue" ? (
                  <input
                    type="checkbox"
                    aria-label={`Select ${holder(c)}`}
                    checked={selected.has(c.id)}
                    onChange={(e) =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (e.target.checked) n.add(c.id);
                        else n.delete(c.id);
                        return n;
                      })
                    }
                  />
                ) : null;
              case "holder":
                return (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={holder(c)} seed={c.studentId} size={28} />
                    <div>
                      <div className="font-medium">{holder(c)}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {c.studentId}
                      </div>
                    </div>
                  </div>
                );
              case "award":
                return (
                  <div className="text-sm">
                    {c.award}
                    <div className="text-[11px] text-muted-foreground">
                      {c.classification ?? "Classification pending"}
                    </div>
                  </div>
                );
              case "status":
                return (
                  <div className="space-y-0.5">
                    <StatusPill status={c.revoked ? "Revoked" : c.status} />
                    {c.issuedAt && (
                      <div className="text-[11px] text-muted-foreground">{fmtDate(c.issuedAt)}</div>
                    )}
                  </div>
                );
              case "serial":
                return c.serial ? (
                  <div className="font-mono text-xs">
                    {c.serial}
                    <div className="text-muted-foreground">{c.verifyCode}</div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                );
              case "_actions":
                return c.status !== "Awaiting results" ? (
                  <Button size="sm" variant="outline" onClick={() => setPreview(c)}>
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                ) : null;
            }
          }}
        />
      </Section>
      {preview && (
        <CertificatePreview
          c={preview}
          holder={holder(preview)}
          institution={d.ctx.tenantName}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );

function certificateHtml(c: CertificateIssue, holder: string, institution: string) {
  const specimen = c.status !== "Issued";
  return `<!doctype html><html><head><title>${esc(c.serial ?? "Certificate preview")}</title>
<style>
body{font-family:Georgia,serif;margin:0;padding:40px;color:#1e1b4b}
.c{border:10px double #4f46e5;padding:48px;text-align:center;position:relative;max-width:860px;margin:auto}
.i{letter-spacing:.3em;text-transform:uppercase;font-size:14px;color:#4338ca}
h1{font-size:40px;margin:16px 0 8px}.n{font-size:30px;font-style:italic;margin:18px 0}
.a{font-size:22px;font-weight:bold}.cl{font-size:18px;margin-top:6px}
.f{display:flex;justify-content:space-between;margin-top:56px;font-size:12px;font-family:Arial,sans-serif}
.s{border-top:1px solid #1e1b4b;padding-top:6px;width:200px}
.v{margin-top:28px;font-family:Arial,sans-serif;font-size:11px;color:#555}
.sp{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:96px;color:rgba(220,38,38,.12);transform:rotate(-20deg);font-family:Arial}
</style></head><body><div class="c">
${specimen ? '<div class="sp">SPECIMEN</div>' : ""}
<div class="i">${esc(institution)}</div>
<h1>Certificate of Award</h1>
<div>This is to certify that</div>
<div class="n">${esc(holder)}</div>
<div>having satisfied the requirements of the institution was awarded</div>
<div class="a" style="margin-top:12px">${esc(c.award)}</div>
${c.classification ? `<div class="cl">${esc(c.classification)}</div>` : ""}
<div style="margin-top:12px">on ${esc(fmtDate(c.awardDate ?? c.issuedAt))}</div>
<div class="f"><div class="s">Vice-Chancellor</div><div class="s">Registrar</div></div>
<div class="v">Serial ${esc(c.serial ?? "—")} · 1StudentID ${esc(c.studentId)} · Verify with code <b>${esc(c.verifyCode ?? "—")}</b> at the institution's verification page</div>
</div></body></html>`;
}

function CertificatePreview({
  c,
  holder,
  institution,
  onClose,
}: {
  c: CertificateIssue;
  holder: string;
  institution: string;
  onClose: () => void;
}) {
  const specimen = c.status !== "Issued";
  const print = () => {
    const w = window.open("", "_blank", "width=1000,height=760");
    if (!w) {
      toast.error("Allow pop-ups to print the certificate");
      return;
    }
    w.document.write(certificateHtml(c, holder, institution));
    w.document.close();
    w.focus();
    w.print();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Certificate preview</DialogTitle>
        </DialogHeader>
        <div className="relative rounded-lg border-4 border-double border-indigo-600 p-6 text-center font-serif text-indigo-950 bg-white overflow-hidden">
          {specimen && (
            <div className="absolute inset-0 flex items-center justify-center text-6xl font-sans font-bold text-red-600/10 -rotate-12 pointer-events-none">
              SPECIMEN
            </div>
          )}
          <div className="text-[11px] uppercase tracking-[0.3em] text-indigo-700">
            {institution}
          </div>
          <div className="text-2xl font-bold mt-2">Certificate of Award</div>
          <div className="text-sm mt-3">This is to certify that</div>
          <div className="text-xl italic mt-2">{holder}</div>
          <div className="text-sm mt-2">was awarded</div>
          <div className="text-lg font-bold mt-1">{c.award}</div>
          {c.classification && <div className="text-sm">{c.classification}</div>}
          <div className="text-sm mt-2">on {fmtDate(c.awardDate ?? c.issuedAt)}</div>
          <div className="mt-5 text-[10px] font-sans text-muted-foreground">
            Serial {c.serial ?? "assigned on issue"} · Verify code {c.verifyCode ?? "—"}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={print}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Public verification ─────────────────────────────────────────────────── */

function VerifyCertificate() {
  const { certsAll, certs } = useResults();
  const learners = useCollection("learners");
  const tenants = useCollection("tenants");
  const [code, setCode] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const sample = certs.find((c) => c.status === "Issued" && !c.revoked && c.verifyCode);
  const q = (query ?? "").trim().toUpperCase();
  const hit = q
    ? certsAll.find(
        (c) =>
          c.status === "Issued" &&
          (c.verifyCode?.toUpperCase() === q || c.serial?.toUpperCase() === q),
      )
    : undefined;
  const holder = (c: CertificateIssue) =>
    c.holderName ?? learners.find((l) => l.id === c.studentId)?.name ?? c.studentId;

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-4 lg:gap-6">
      <Section
        title="Verify a certificate"
        description="Employers, embassies and other universities enter the code printed on the certificate."
      >
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(code);
          }}
        >
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="8-character code or serial"
            className="font-mono uppercase"
          />
          <Button type="submit">
            <Search className="h-4 w-4" /> Verify
          </Button>
        </form>
        {sample && (
          <button
            type="button"
            className="mt-2 text-[11px] text-primary hover:underline"
            onClick={() => {
              setCode(sample.verifyCode!);
              setQuery(sample.verifyCode!);
            }}
          >
            Try {sample.verifyCode}
          </button>
        )}
      </Section>
      {query !== null && (
        <Section title="Result">
          {!hit ? (
            <div className="flex items-start gap-3 text-sm">
              <ShieldX className="h-6 w-6 text-destructive shrink-0" />
              <div>
                <div className="font-semibold">No certificate found</div>
                <div className="text-muted-foreground text-xs">
                  Check the code. Codes are 8 characters, letters and numbers.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {hit.revoked ? (
                  <ShieldX className="h-6 w-6 text-destructive" />
                ) : (
                  <ShieldCheck className="h-6 w-6 text-success" />
                )}
                <div>
                  <div
                    className={`font-semibold ${hit.revoked ? "text-destructive" : "text-success"}`}
                  >
                    {hit.revoked ? "Revoked" : "Valid certificate"}
                  </div>
                  {hit.revokedReason && (
                    <div className="text-xs text-muted-foreground">{hit.revokedReason}</div>
                  )}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Item label="Holder" value={holder(hit)} />
                <Item
                  label="Institution"
                  value={tenants.find((t) => t.id === hit.tenantId)?.name ?? hit.tenantId}
                />
                <Item label="Award" value={hit.award} />
                <Item label="Classification" value={hit.classification ?? "—"} />
                <Item label="Awarded" value={fmtDate(hit.awardDate ?? hit.issuedAt)} />
                <Item label="Issued" value={fmtDate(hit.issuedAt)} />
                <Item label="Serial" value={<span className="font-mono">{hit.serial}</span>} />
                <Item
                  label="1StudentID"
                  value={<span className="font-mono">{hit.studentId}</span>}
                />
              </dl>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
