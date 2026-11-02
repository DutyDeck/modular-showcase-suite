import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Landmark,
  Play,
  Send,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, Section, StatCard, Badge, Button } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PackContextBar, StatusPill, VerifyNote } from "@/components/packs/PackUI";
import { useCollection, addItem, updateItem, nextId } from "@/lib/store";
import { useTenantContext } from "@/lib/packs/registry";
import {
  REGIONS,
  appliesInSubRegion,
  ID_FIELDS,
  type InstitutionType,
  type RegulatorReturnDef,
} from "@/lib/packs/regions";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import { daysBetween, type ReturnSubmission } from "@/lib/packs/bizData";

export const Route = createFileRoute("/app/returns")({
  head: () => ({ meta: [{ title: "Regulator Returns — 1StudentID" }] }),
  component: RegulatorReturnsPage,
});

/* ── Validation model ────────────────────────────────────────────────────── */

const VISA_RETURNS = new Set(["ukvi", "prisms", "emgs"]);

function learnerKind(l: Learner): InstitutionType {
  if (l.programmeId) return "university";
  if (l.qualificationId) return "college";
  return "school";
}

function ageOn(dob: string, on = DEMO_TODAY) {
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = on.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

/** Is an official id actually required for THIS learner? */
function required(key: string, l: Learner): boolean {
  switch (key) {
    case "passport":
    case "cas":
    case "coe":
      return false; // checked by the visa rule below
    case "ucas":
      return !!l.programmeId && l.level.startsWith("Level");
    case "uln":
      return l.nationality === "British" && (!!l.programmeId || !!l.qualificationId);
    case "upn":
      return learnerKind(l) === "school";
    case "chessn":
      return !!l.programmeId && !l.visa;
    case "nic":
      return ageOn(l.dob) >= 16;
    case "birthCert":
      return ageOn(l.dob) < 16;
    case "examIndex":
      return false; // issued by the exams department after entry
    case "aadhaar":
      return false; // voluntary
    default:
      return true;
  }
}

interface Issue {
  learner: Learner;
  message: string;
  severity: "error" | "warning";
}

function validate(
  def: RegulatorReturnDef,
  population: Learner[],
  idKeys: string[],
  region: string,
): Issue[] {
  const out: Issue[] = [];
  for (const l of population) {
    for (const k of idKeys) {
      const f = ID_FIELDS[k];
      if (!f || (f.segments && !f.segments.includes(learnerKind(l)))) continue;
      if (required(k, l) && !l.officialIds[k]) {
        out.push({ learner: l, severity: "error", message: `Missing ${f.label}` });
      }
    }
    if (l.visa?.sponsored) {
      const key = region === "UK" ? "cas" : region === "AU" ? "coe" : "passport";
      if (!l.officialIds[key])
        out.push({
          learner: l,
          severity: "error",
          message: `Visa holder without ${ID_FIELDS[key].label}`,
        });
      if (!l.officialIds.passport)
        out.push({ learner: l, severity: "warning", message: "Passport number not recorded" });
      if (l.visa.expiry < "2027-05-01")
        out.push({ learner: l, severity: "warning", message: `Visa expires ${l.visa.expiry}` });
    }
    if (l.supportPlan && def.fields.some((f) => /SEN|Disability|SEND/i.test(f))) {
      out.push({
        learner: l,
        severity: "warning",
        message: "Support plan recorded — confirm provision code",
      });
    }
    // Start dates: every learner-level return in HE / FE / VET carries one.
    const needsStart = def.fields.some((f) => /startdate|activitystart|censusdate/i.test(f));
    if (needsStart && learnerKind(l) !== "school" && !l.startDate)
      out.push({ learner: l, severity: "error", message: "Missing start date (from intake)" });
    if (needsStart && l.startDate && l.startDate > DEMO_TODAY)
      out.push({
        learner: l,
        severity: "warning",
        message: `Not started yet (starts ${l.startDate}) — exclude until the start date`,
      });
    if (l.status === "Interrupted")
      out.push({
        learner: l,
        severity: "warning",
        message: "Interrupted — include with study-break dates",
      });
  }
  return out;
}

const AGGREGATE_FIELDS =
  /^(Male|Female|Enrolled|Graduated|Completed|Certified|Teachers|PassedOut|Faculty|Intake)$/;

/** Build a preview row for a learner from the return's field list. */
function cellFor(field: string, l: Learner, idx: number): string {
  const ids = l.officialIds;
  const [first, ...rest] = l.name.split(" ");
  const f = field.toLowerCase();
  if (f === "surname") return rest.join(" ");
  if (f === "forename") return first;
  if (f === "name") return l.name;
  if (f === "dob") return l.dob;
  if (/gender/.test(f)) return l.gender;
  if (/nationality/.test(f)) return l.nationality;
  if (/^upn$/.test(f)) return ids.upn ?? "—";
  if (/^uln$/.test(f)) return ids.uln ?? "—";
  if (/husid|^sid$/.test(f)) return ids.husid ?? "—";
  if (/ownstu|learnrefnumber|clientid|studentid/.test(f)) return l.id;
  if (/^usi$/.test(f)) return ids.usi ?? "—";
  if (/chessn/.test(f)) return ids.chessn ?? "—";
  if (/emiratesid/.test(f)) return ids.emiratesId ?? "—";
  if (/khdastudentno|esisno|moestudentno|regulatorno/.test(f)) return ids.regulatorNo ?? "—";
  if (/nic|birthcert/.test(f)) return ids.nic ?? ids.birthCert ?? "—";
  if (/indexno/.test(f)) return ids.examIndex ?? "pending";
  if (/^cas$/.test(f)) return ids.cas ?? "—";
  if (/^coe$/.test(f)) return ids.coe?.split(" · ")[0] ?? "—";
  if (/cricos/.test(f)) return ids.coe?.split("CRICOS ")[1] ?? "—";
  if (/passport/.test(f)) return ids.passport ?? "—";
  if (/qid|iqama|nationalid|noorid|apaar|fin|mykad/.test(f)) return ids[Object.keys(ids)[0]] ?? "—";
  if (/ncyear|grade|yearlevel|^class$/.test(f)) return l.level.replace(/^(Year|Grade) /, "");
  if (/courseid|coursecode|learnaimref|programme|subjectid|unitofstudy/.test(f))
    return l.programmeId ?? l.qualificationId ?? l.curriculumId ?? "—";
  if (/curriculum/.test(f)) return l.curriculumId ?? "—";
  if (/mode/.test(f)) return l.mode === "Part-time" ? "PT" : "FT";
  if (/stuload|eftsl|fte/.test(f)) return l.mode === "Part-time" ? "0.5" : "1.0";
  if (/startdate|engstartdate|activitystart|contractdate/.test(f) && l.startDate)
    return l.startDate;
  if (/censusdate/.test(f) && l.startDate) {
    // Demo: census ≈ 20% into the first teaching period after the start date.
    const d = new Date(l.startDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 37);
    return d.toISOString().slice(0, 10);
  }
  if (/startdate|engstartdate|activitystart|contractdate/.test(f))
    return l.intake
      ? `${l.intake.slice(-4)}-${l.intake.startsWith("Feb") ? "02" : l.intake.startsWith("Jul") ? "07" : "09"}-01`
      : "2026-09-01";
  if (/fundmodel|fundingsource|helploan/.test(f)) return l.funding ? l.funding.split(" ")[0] : "—";
  if (/sen|send|disability/.test(f)) return l.supportPlan ? "K" : "N";
  if (/eventtype/.test(f)) return idx % 2 ? "Non-engagement" : "Course change";
  if (/eventdate/.test(f)) return DEMO_TODAY;
  if (/attendance|sessions/.test(f)) return String(88 + ((idx * 7) % 12));
  if (/compstatus|outcome|result|qualawarded|classification/.test(f)) return "Continuing";
  if (/medium/.test(f)) return "English";
  if (/subjects/.test(f)) return "6";
  return "…";
}

function aggregateRows(def: RegulatorReturnDef, pop: Learner[]): string[][] {
  const groups = new Map<string, Learner[]>();
  for (const l of pop)
    groups.set(l.programmeId ?? l.qualificationId ?? l.level, [
      ...(groups.get(l.programmeId ?? l.qualificationId ?? l.level) ?? []),
      l,
    ]);
  return Array.from(groups, ([key, ls]) =>
    def.fields.map((f) => {
      if (f === "Male") return String(ls.filter((l) => l.gender === "M").length);
      if (f === "Female") return String(ls.filter((l) => l.gender === "F").length);
      if (/Enrolled|Intake/.test(f)) return String(ls.length);
      if (/Graduated|Completed|Certified|PassedOut/.test(f)) return "0";
      if (/Teachers|Faculty/.test(f)) return "—";
      if (/Grade|Programme|Course|NVQ/.test(f)) return key;
      if (/Medium/.test(f)) return "English";
      return "…";
    }),
  );
}

function buildRows(def: RegulatorReturnDef, pop: Learner[]): string[][] {
  if (def.fields.some((f) => AGGREGATE_FIELDS.test(f))) return aggregateRows(def, pop);
  return pop.map((l, i) => def.fields.map((f) => cellFor(f, l, i)));
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

function periodLabel(def: RegulatorReturnDef) {
  const d = new Date(def.nextDue + "T00:00:00Z").toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
  return VISA_RETURNS.has(def.key) ? `Event batch — ${d}` : `Collection due ${d}`;
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function RegulatorReturnsPage() {
  const ctx = useTenantContext();
  const learners = useCollection("learners");
  const submissions = useCollection("returnSubmissions");
  const [runKey, setRunKey] = useState<string | null>(null);

  // Segment types this tenant reports as: its own type + any implied by packs.
  const types = useMemo(() => {
    const t = new Set<InstitutionType>([ctx.type]);
    if (ctx.packs.has("higher-ed")) t.add("university");
    if (ctx.packs.has("college")) t.add("college");
    if (ctx.packs.has("intl-school")) t.add("school");
    return t;
  }, [ctx.type, ctx.packs]);

  const defs = useMemo(
    () =>
      REGIONS[ctx.profile?.region ?? "GLOBAL"].returns
        .filter(
          (r) =>
            r.segments.some((s) => types.has(s)) && appliesInSubRegion(r, ctx.profile?.subRegion),
        )
        .sort((a, b) => a.nextDue.localeCompare(b.nextDue)),
    [ctx.profile?.region, ctx.profile?.subRegion, types],
  );

  const tenantLearners = useMemo(
    () =>
      learners.filter(
        (l) => l.tenantId === ctx.tenantId && l.status !== "Withdrawn" && l.status !== "Applicant",
      ),
    [learners, ctx.tenantId],
  );
  const subs = submissions.filter((s) => s.tenantId === ctx.tenantId);
  const dueSoon = defs.filter((d) => daysBetween(DEMO_TODAY, d.nextDue) <= 30).length;
  const accepted = subs.filter((s) => s.status === "Accepted").length;
  const openErrors = subs.filter((s) => s.status === "Errors").reduce((n, s) => n + s.errors, 0);
  const run = defs.find((d) => d.key === runKey);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regulator Returns"
        subtitle={`Statutory data returns ${ctx.region.flag} ${ctx.region.name} expects from this ${[...types].join(" / ")} — validated against your student records before you submit.`}
      />
      <PackContextBar />

      {!ctx.isAdmin ? (
        <Section>
          <p className="text-sm text-muted-foreground">
            Regulator returns are prepared by the registry / compliance office.
          </p>
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Returns in scope"
              value={defs.length}
              hint={`${ctx.region.name} · ${[...types].join(", ")}`}
              icon={<Landmark className="h-4 w-4" />}
            />
            <StatCard
              label="Due in 30 days"
              value={dueSoon}
              accent={dueSoon ? "warning" : "success"}
              icon={<CalendarClock className="h-4 w-4" />}
            />
            <StatCard
              label="Accepted submissions"
              value={accepted}
              accent="success"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <StatCard
              label="Open validation errors"
              value={openErrors}
              accent={openErrors ? "destructive" : "success"}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>

          <div className="rounded-xl border bg-warning/10 border-warning/30 px-4 py-3 text-xs flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-warning-foreground shrink-0 mt-px" />
            <div>
              <span className="font-semibold">Demo-grade regulatory content.</span> Return names,
              regulators, frequencies and field lists come from the{" "}
              <span className="font-medium">{ctx.region.name} region profile</span>. In production
              each country's compliance pack confirms them against the regulator's published
              specification (and any vendor certification, e.g. ADEK eSIS) before go-live.
            </div>
          </div>

          {defs.length === 0 ? (
            <Section>
              <div className="text-center py-8">
                <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground" />
                <div className="font-semibold mt-2">No statutory returns configured</div>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  The {ctx.region.name} region profile has no returns for this institution type yet.
                  Add them in the country's compliance pack.
                </p>
              </div>
            </Section>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {defs.map((d) => {
                const days = daysBetween(DEMO_TODAY, d.nextDue);
                const history = subs
                  .filter((s) => s.returnKey === d.key)
                  .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
                const current = history.find((s) => s.period === periodLabel(d));
                return (
                  <Section
                    key={d.key}
                    title={
                      <span className="flex items-center gap-2">
                        {d.name}
                        {current && <StatusPill status={current.status} />}
                      </span>
                    }
                    description={`${d.regulator} · ${d.frequency}`}
                    actions={
                      <Button size="sm" onClick={() => setRunKey(d.key)}>
                        <Play className="h-3.5 w-3.5" /> {current ? "Open run" : "Prepare"}
                      </Button>
                    }
                  >
                    <p className="text-xs text-muted-foreground">{d.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                      <Badge tone={days < 0 ? "destructive" : days <= 14 ? "warning" : "muted"}>
                        {days < 0
                          ? `Overdue by ${-days} days`
                          : days === 0
                            ? "Due today"
                            : `Due in ${days} days`}
                      </Badge>
                      <span className="text-muted-foreground">Next due {fmt(d.nextDue)}</span>
                      <span className="text-muted-foreground">· {d.fields.length} fields</span>
                    </div>
                    <div className="mt-3 border-t pt-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        History
                      </div>
                      {history.length === 0 ? (
                        <div className="text-xs text-muted-foreground">No submissions yet.</div>
                      ) : (
                        <ul className="space-y-1">
                          {history.slice(0, 3).map((s) => (
                            <li key={s.id} className="flex flex-wrap items-center gap-2 text-xs">
                              <StatusPill status={s.status} />
                              <span className="truncate">{s.period}</span>
                              <span className="text-muted-foreground">
                                · {s.records.toLocaleString()} records
                                {s.warnings ? ` · ${s.warnings} warnings` : ""}
                                {s.submittedAt ? ` · ${fmt(s.submittedAt.slice(0, 10))}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Section>
                );
              })}
            </div>
          )}
          <VerifyNote />
        </>
      )}

      {run && (
        <ReturnRun
          def={run}
          learners={tenantLearners.filter((l) =>
            VISA_RETURNS.has(run.key) ? !!l.visa?.sponsored : run.segments.includes(learnerKind(l)),
          )}
          submission={subs.find((s) => s.returnKey === run.key && s.period === periodLabel(run))}
          onClose={() => setRunKey(null)}
        />
      )}
    </div>
  );
}

function ReturnRun({
  def,
  learners,
  submission,
  onClose,
}: {
  def: RegulatorReturnDef;
  learners: Learner[];
  submission?: ReturnSubmission;
  onClose: () => void;
}) {
  const ctx = useTenantContext();
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [preview, setPreview] = useState(false);
  const idKeys = ctx.profile?.idFields ?? ctx.region.idFields;
  const rows = useMemo(() => buildRows(def, learners), [def, learners]);
  const errors = issues?.filter((i) => i.severity === "error") ?? [];
  const warnings = issues?.filter((i) => i.severity === "warning") ?? [];
  const period = periodLabel(def);
  const status = submission?.status ?? "Not started";

  const upsert = (patch: Partial<ReturnSubmission>) => {
    if (submission) updateItem("returnSubmissions", (s) => s.id === submission.id, patch);
    else
      addItem("returnSubmissions", {
        id: nextId("RS-", "returnSubmissions"),
        tenantId: ctx.tenantId,
        returnKey: def.key,
        period,
        status: "Not started",
        errors: 0,
        warnings: 0,
        records: learners.length,
        ...patch,
      });
  };

  const runValidate = () => {
    const found = validate(def, learners, idKeys, ctx.profile?.region ?? "GLOBAL");
    setIssues(found);
    const e = found.filter((i) => i.severity === "error").length;
    upsert({
      status: e ? "Errors" : "Validated",
      errors: e,
      warnings: found.length - e,
      records: learners.length,
    });
    if (e) toast.error(`${e} error(s) must be fixed before submission`);
    else
      toast.success(`Validated ${learners.length} record(s)`, {
        description: `${found.length} warning(s) to review`,
      });
  };

  const submit = () => {
    upsert({ status: "Submitted", submittedAt: new Date().toISOString(), by: ctx.user?.name });
    toast.success(`${def.name} submitted to ${def.regulator}`, {
      description: "You'll be notified when the regulator accepts it.",
    });
  };

  const accept = () => {
    upsert({ status: "Accepted" });
    toast.success("Acceptance recorded", { description: "Receipt filed in Compliance & Audit." });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {def.name} <StatusPill status={status} />
          </DialogTitle>
          <DialogDescription>
            {def.regulator} · {period} · {learners.length} record(s) in scope
          </DialogDescription>
        </DialogHeader>

        <ol className="grid sm:grid-cols-4 gap-2 text-xs">
          {[
            { n: 1, label: "Validate", done: status !== "Not started" },
            {
              n: 2,
              label: "Generate & review",
              done: preview || ["Submitted", "Accepted"].includes(status),
            },
            { n: 3, label: "Submit", done: ["Submitted", "Accepted"].includes(status) },
            { n: 4, label: "Accepted", done: status === "Accepted" },
          ].map((s) => (
            <li
              key={s.n}
              className={`rounded-lg border px-3 py-2 ${s.done ? "bg-success/10 border-success/30" : "bg-muted/30"}`}
            >
              <span className="font-semibold">{s.n}.</span> {s.label}
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button onClick={runValidate}>
            <ShieldCheck className="h-4 w-4" /> Validate {learners.length} records
          </Button>
          <Button
            variant="outline"
            disabled={status === "Not started" || status === "Errors"}
            onClick={() => setPreview(true)}
          >
            <FileSpreadsheet className="h-4 w-4" /> Generate file
          </Button>
          <Button
            variant="outline"
            disabled={!preview && !["Submitted", "Accepted"].includes(status)}
            onClick={() =>
              downloadCsv(`${def.key}-${ctx.tenantId}-${DEMO_TODAY}.csv`, def.fields, rows)
            }
          >
            <Download className="h-4 w-4" /> Download CSV
          </Button>
          <Button variant="outline" disabled={status !== "Validated" || !preview} onClick={submit}>
            <Send className="h-4 w-4" /> Mark submitted
          </Button>
          {status === "Submitted" && (
            <Button variant="secondary" onClick={accept}>
              <CheckCircle2 className="h-4 w-4" /> Record acceptance
            </Button>
          )}
        </div>

        {issues && (
          <div className="rounded-lg border">
            <div className="px-4 py-2.5 border-b text-sm font-semibold flex items-center gap-2">
              Validation report
              <Badge tone={errors.length ? "destructive" : "success"}>{errors.length} errors</Badge>
              <Badge tone={warnings.length ? "warning" : "muted"}>{warnings.length} warnings</Badge>
            </div>
            {issues.length === 0 ? (
              <div className="px-4 py-3 text-sm text-success">
                All records pass. Ready to generate.
              </div>
            ) : (
              <ul className="divide-y max-h-56 overflow-y-auto">
                {issues.map((i, k) => (
                  <li key={k} className="px-4 py-2 text-xs flex items-center gap-2">
                    <Badge tone={i.severity === "error" ? "destructive" : "warning"}>
                      {i.severity}
                    </Badge>
                    <span className="font-medium">{i.learner.name}</span>
                    <span className="text-muted-foreground">{i.learner.id}</span>
                    <span>— {i.message}</span>
                  </li>
                ))}
              </ul>
            )}
            {errors.length > 0 && (
              <div className="px-4 py-2 border-t text-[11px] text-muted-foreground">
                Fix the official identifiers in{" "}
                <Link to="/app/learners" className="text-primary underline">
                  Student Records
                </Link>{" "}
                (fields are set by the tenant's region profile in Institution Profile), then
                validate again.
              </div>
            )}
          </div>
        )}

        {(preview || ["Submitted", "Accepted"].includes(status)) && (
          <div className="rounded-lg border">
            <div className="px-4 py-2.5 border-b text-sm font-semibold">
              File preview{" "}
              <span className="text-xs font-normal text-muted-foreground">
                · {rows.length} row(s) · regulator field names
              </span>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {def.fields.map((f) => (
                      <th
                        key={f}
                        className="px-3 py-1.5 text-left font-mono font-medium whitespace-nowrap"
                      >
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      {r.map((c, j) => (
                        <td key={j} className="px-3 py-1.5 font-mono whitespace-nowrap">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <VerifyNote>
          Field list and file format are illustrative. Production exports follow the regulator's
          published specification for the collection year (e.g. HESA Data Futures XML, ILR XML,
          AVETMISS NAT files).
        </VerifyNote>
      </DialogContent>
    </Dialog>
  );
}

function fmt(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
