import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, StatCard, Badge, Button, useDisclosure } from "@/components/ui-kit";
import { ImportDialog, type ImportField } from "@/components/ImportDialog";
import {
  addItem,
  nextId,
  useCollection,
  type Student,
  type Course,
  type Invoice,
} from "@/lib/store";
import {
  DatabaseZap,
  ArrowRight,
  CheckCircle2,
  Plug,
  ShieldCheck,
  Upload,
  GraduationCap,
  BookOpen,
  Receipt,
  ClipboardList,
  HeartHandshake,
  FileText,
  ListChecks,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PackContextBar, VerifyNote } from "@/components/packs/PackUI";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import { useTenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY, learners as seedLearners, type Learner } from "@/lib/packs/foundationData";
import { learnerDocuments as seedDocuments } from "@/lib/packs/sis/records";
import { logChange } from "@/lib/packs/sis/activity";
import {
  MIGRATION_RUNS,
  PRIVACY,
  ageAt,
  sourcesFor,
  type MigrationRunSeed,
} from "@/lib/packs/sis/governance";

export const Route = createFileRoute("/app/migration")({
  head: () => ({ meta: [{ title: "Migration & Imports — 1StudentID" }] }),
  component: MigrationRoute,
});

/** Pack (segment) tenants migrate from their own source systems into their
 *  own records; classic tenants and the global admin keep the original page. */
function MigrationRoute() {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  return isPackTenantUser(user, profiles) ? <PackMigration /> : <MigrationPage />;
}

interface SourceSystem {
  name: string;
  exportNote: string;
  status: "Native" | "CSV" | "API";
  color: string;
}

const SOURCES: SourceSystem[] = [
  {
    name: "Moodle",
    exportNote: "Site admin → Reports → Export to CSV",
    status: "Native",
    color: "from-orange-500 to-amber-500",
  },
  {
    name: "Canvas LMS",
    exportNote: "Course → Settings → Course Export Package",
    status: "Native",
    color: "from-rose-500 to-pink-500",
  },
  {
    name: "Blackboard Learn",
    exportNote: "Grade Center → Work Offline → Download",
    status: "CSV",
    color: "from-sky-500 to-cyan-500",
  },
  {
    name: "Google Classroom",
    exportNote: "Gradebook → Download grades as CSV",
    status: "API",
    color: "from-emerald-500 to-teal-500",
  },
  {
    name: "Schoology",
    exportNote: "Tools → Roster Export",
    status: "CSV",
    color: "from-indigo-500 to-violet-500",
  },
  {
    name: "Edmodo / Microsoft Teams Edu",
    exportNote: "Class CSV roster export",
    status: "CSV",
    color: "from-fuchsia-500 to-purple-500",
  },
  {
    name: "Custom / In-house SIS",
    exportNote: "Map any CSV columns to 1StudentID schema",
    status: "CSV",
    color: "from-slate-500 to-zinc-500",
  },
  {
    name: "Excel / Google Sheets",
    exportNote: "Save as .csv (UTF-8)",
    status: "CSV",
    color: "from-lime-500 to-green-500",
  },
];

const STUDENT_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, sample: "Oliver Smith" },
  { key: "grade", label: "Grade", required: true, sample: "Grade 12" },
  { key: "batch", label: "Batch", sample: "Science-A" },
  { key: "parent", label: "Parent", sample: "Jack Smith" },
  { key: "attendance", label: "Attendance", sample: "94" },
  { key: "gpa", label: "GPA", sample: "3.8" },
  { key: "status", label: "Status", sample: "Active" },
];

const COURSE_IMPORT_FIELDS: ImportField[] = [
  { key: "title", label: "Title", required: true, sample: "Advanced Physics" },
  { key: "code", label: "Code", required: true, sample: "PHY-12" },
  { key: "category", label: "Category", sample: "Science" },
  { key: "teacher", label: "Teacher", sample: "Dr. Charlie Brown" },
  { key: "schedule", label: "Schedule", sample: "Mon/Wed 4-6 PM" },
  { key: "credits", label: "Credits", sample: "4" },
  { key: "price", label: "Price", sample: "120" },
];

const INVOICE_IMPORT_FIELDS: ImportField[] = [
  { key: "date", label: "Date", required: true, sample: "2026-05-01" },
  { key: "desc", label: "Description", required: true, sample: "May Tuition" },
  { key: "amount", label: "Amount", required: true, sample: "270" },
  { key: "status", label: "Status", sample: "Due" },
  { key: "method", label: "Method", sample: "Stripe" },
];

interface RunRow {
  id: string;
  entity: string;
  count: number;
  source: string;
  when: string;
  status: "Completed" | "Partial";
}

function MigrationPage() {
  const students = useCollection("students");
  const courses = useCollection("courses");
  const invoices = useCollection("invoices");

  const studentsImport = useDisclosure();
  const coursesImport = useDisclosure();
  const invoicesImport = useDisclosure();

  const [history, setHistory] = useState<RunRow[]>([
    {
      id: "MIG-1042",
      entity: "Students",
      count: 248,
      source: "Moodle CSV",
      when: "10 min ago",
      status: "Completed",
    },
    {
      id: "MIG-1041",
      entity: "Courses",
      count: 36,
      source: "Canvas Export",
      when: "1 hr ago",
      status: "Completed",
    },
    {
      id: "MIG-1040",
      entity: "Users",
      count: 14,
      source: "Google Workspace",
      when: "Yesterday",
      status: "Partial",
    },
  ]);

  const logRun = (entity: string, count: number, source = "CSV upload") => {
    setHistory((h) => [
      {
        id: `MIG-${1042 + h.length + 1}`,
        entity,
        count,
        source,
        when: "just now",
        status: "Completed",
      },
      ...h,
    ]);
  };

  const startApi = (name: string) => {
    toast.success(`Connecting to ${name}…`, {
      description: "OAuth flow opens in a real environment.",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Migration & Bulk Imports"
        subtitle="Bring your existing LMS, SIS or spreadsheet data into 1StudentID in minutes."
      />

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-hero text-white p-5 sm:p-8 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 85% 20%, white, transparent 40%)",
          }}
        />
        <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-[11px] font-medium">
              <DatabaseZap className="h-3 w-3" />
              Migration toolkit
            </div>
            <h2 className="text-xl sm:text-3xl font-bold mt-3 leading-tight">
              Already running another LMS? <br className="hidden sm:block" />
              Move your records in three steps.
            </h2>
            <p className="opacity-85 text-sm mt-2 max-w-xl">
              Export from Moodle, Canvas, Blackboard or Google Classroom → optionally map columns →
              import. We validate every row before it touches your tenant.
            </p>
          </div>
          <ol className="space-y-2 text-sm">
            {[
              "Export CSV from your current system",
              "Match columns to 1StudentID's schema",
              "Preview, fix errors, then commit",
            ].map((s, i) => (
              <li
                key={s}
                className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-lg px-3 py-2 ring-1 ring-white/15"
              >
                <span className="h-6 w-6 rounded-full bg-white text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Students migrated"
          value={students.length}
          icon={<GraduationCap className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Courses imported"
          value={courses.length}
          icon={<BookOpen className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Invoices loaded"
          value={invoices.length}
          icon={<Receipt className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Migration runs"
          value={history.length}
          hint="last 30 days"
          icon={<ClipboardList className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      {/* Quick imports */}
      <Section title="Quick CSV imports" description="One-click bulk upload per entity.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              t: "Students roster",
              d: "Names, grades, batches, parents",
              icon: GraduationCap,
              action: studentsImport.onOpen,
            },
            {
              t: "Course catalog",
              d: "Codes, schedules, credits, pricing",
              icon: BookOpen,
              action: coursesImport.onOpen,
            },
            {
              t: "Open invoices",
              d: "Outstanding fees, dates, methods",
              icon: Receipt,
              action: invoicesImport.onOpen,
            },
          ].map(({ t, d, icon: I, action }) => (
            <button
              key={t}
              onClick={action}
              className="text-left p-4 rounded-xl border bg-card hover:border-primary hover:shadow-soft transition-all"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <I className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold">{t}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{d}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium">
                <Upload className="h-3 w-3" />
                Upload CSV
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Source systems */}
      <Section
        title="Supported source systems"
        description="Pre-mapped column templates ship for the systems below. Anything else: use the generic CSV importer."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SOURCES.map((s) => (
            <div key={s.name} className="rounded-xl border bg-card overflow-hidden flex flex-col">
              <div className={`h-2 bg-gradient-to-r ${s.color}`} />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <Badge
                    tone={s.status === "Native" ? "success" : s.status === "API" ? "info" : "muted"}
                  >
                    {s.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 flex-1">{s.exportNote}</div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={studentsImport.onOpen}
                    className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline"
                  >
                    Import roster
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  {s.status === "API" && (
                    <button
                      onClick={() => startApi(s.name)}
                      className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      <Plug className="h-3 w-3" />
                      Connect API
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Guarantees */}
      <Section
        title="Migration guarantees"
        description="What our toolkit does for you automatically."
      >
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            "Schema validation per row before commit",
            "De-duplicate by ID, email or code",
            "Preserve external IDs for round-trip sync",
            "Roll back any migration run within 24 h",
            "Field-level encryption for PII at rest",
            "Compliance: GDPR · FERPA · PDPA · COPPA",
          ].map((g) => (
            <li key={g} className="flex items-start gap-2 p-3 rounded-lg border bg-card">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* History */}
      <Section
        title="Recent migration runs"
        actions={
          <Link
            to="/app/students"
            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            View students
            <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">Run ID</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Entity</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Rows</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Source</th>
                <th className="px-4 sm:px-5 py-2 font-medium">When</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b last:border-0">
                  <td className="px-4 sm:px-5 py-3 font-mono text-xs">{h.id}</td>
                  <td className="px-4 sm:px-5 py-3">{h.entity}</td>
                  <td className="px-4 sm:px-5 py-3 font-semibold">{h.count}</td>
                  <td className="px-4 sm:px-5 py-3 text-muted-foreground">{h.source}</td>
                  <td className="px-4 sm:px-5 py-3 text-muted-foreground">{h.when}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <Badge tone={h.status === "Completed" ? "success" : "warning"}>
                      {h.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-[11px] text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-3 w-3 text-success" />
          Every run is logged in the compliance audit trail.
        </div>
      </Section>

      <ImportDialog<Student>
        open={studentsImport.open}
        onOpenChange={studentsImport.setOpen}
        title="Migrate student roster"
        entityLabel="students"
        fields={STUDENT_IMPORT_FIELDS}
        templateName="students-template.csv"
        transform={(row) => {
          const attendance = Number(row.attendance) || 0;
          const gpa = Number(row.gpa) || 0;
          return {
            id: nextId("S-", "students"),
            name: row.name,
            grade: row.grade,
            batch: row.batch || "Unassigned",
            attendance,
            gpa,
            status: row.status || "Active",
            parent: row.parent || "—",
            risk: attendance < 70 || gpa < 2.5 ? "high" : attendance < 85 ? "medium" : "low",
          };
        }}
        onCommit={(items) => {
          items.forEach((s) => addItem("students", s));
          logRun("Students", items.length);
        }}
      />

      <ImportDialog<Course>
        open={coursesImport.open}
        onOpenChange={coursesImport.setOpen}
        title="Migrate course catalog"
        entityLabel="courses"
        fields={COURSE_IMPORT_FIELDS}
        templateName="courses-template.csv"
        transform={(row) => ({
          id: nextId("C-", "courses"),
          title: row.title,
          code: (row.code || "").toUpperCase(),
          teacher: row.teacher || "Unassigned",
          students: 0,
          credits: Number(row.credits) || 0,
          schedule: row.schedule || "TBD",
          rating: 0,
          price: Number(row.price) || 0,
          category: row.category || "General",
        })}
        onCommit={(items) => {
          items.forEach((c) => addItem("courses", c));
          logRun("Courses", items.length);
        }}
      />

      <ImportDialog<Invoice>
        open={invoicesImport.open}
        onOpenChange={invoicesImport.setOpen}
        title="Migrate invoices"
        entityLabel="invoices"
        fields={INVOICE_IMPORT_FIELDS}
        templateName="invoices-template.csv"
        transform={(row) => ({
          id: nextId("INV-2026-", "invoices"),
          date: row.date,
          desc: row.desc,
          amount: Number(row.amount) || 0,
          status: row.status || "Due",
          method: row.method || "—",
        })}
        onCommit={(items) => {
          items.forEach((i) => addItem("invoices", i));
          logRun("Invoices", items.length);
        }}
      />
    </div>
  );
}

/* ══ Pack-tenant view ═══════════════════════════════════════════════════════
 * Source systems for the tenant's segment and region, seeded runs whose row
 * counts come from the tenant's own learners, and CSV imports. Learner imports
 * create real records; marks and fee balances are validated and staged.
 * Runs started here are written to the changeLog (entity "migrationRun"). */

type RunStatus = "Completed" | "Partial" | "Staged";

interface PackRun {
  id: string;
  entity: string;
  count: number;
  source: string;
  date: string;
  status: RunStatus;
  note?: string;
}

const RUN_ENTITY = "migrationRun";

const LEARNER_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, sample: "Maya Fernando" },
  { key: "dob", label: "Date of birth", required: true, sample: "2013-04-09" },
  { key: "gender", label: "Gender (F/M)", required: true, sample: "F" },
  { key: "level", label: "Year / level", required: true, sample: "Year 8" },
  { key: "group", label: "Group / form", sample: "8B" },
  { key: "guardian", label: "Guardian", sample: "Anil Fernando" },
  { key: "email", label: "Email", sample: "" },
  { key: "nationality", label: "Nationality", sample: "" },
];

const RESULT_FIELDS: ImportField[] = [
  { key: "studentid", label: "1StudentID", required: true, sample: "S-3001" },
  { key: "subject", label: "Subject / module", required: true, sample: "Mathematics" },
  { key: "result", label: "Result", required: true, sample: "7" },
  { key: "session", label: "Session", sample: "Summer 2026" },
];

const BALANCE_FIELDS: ImportField[] = [
  { key: "studentid", label: "1StudentID", required: true, sample: "S-3001" },
  { key: "amount", label: "Opening balance", required: true, sample: "4500" },
  { key: "currency", label: "Currency", sample: "" },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function PackMigration() {
  const ctx = useTenantContext();
  const { tenantId } = ctx;
  const allLearners = useCollection("learners");
  const allDocs = useCollection("learnerDocuments");
  const connections = useCollection("integrationConnections");
  const calendars = useCollection("academicCalendars");
  const changeLog = useCollection("changeLog");
  const posture = PRIVACY[ctx.region.code];
  const sources = sourcesFor(ctx.region.code, ctx.type);
  const [source, setSource] = useState(sources[0]?.name ?? "CSV upload");

  const learnersImport = useDisclosure();
  const resultsImport = useDisclosure();
  const balancesImport = useDisclosure();

  const learners = useMemo(
    () => allLearners.filter((l) => l.tenantId === tenantId),
    [allLearners, tenantId],
  );
  const guardians = useMemo(
    () => new Set(learners.flatMap((l) => l.guardians ?? [])).size,
    [learners],
  );
  const docs = allDocs.filter((d) => d.tenantId === tenantId).length;
  const connected = new Set(
    connections.filter((c) => c.tenantId === tenantId && c.status !== "Error").map((c) => c.key),
  );

  const runs: PackRun[] = useMemo(() => {
    const seedL = seedLearners.filter((l) => l.tenantId === tenantId);
    const current = seedL.filter((l) => l.status !== "Graduated" && l.status !== "Withdrawn");
    const countFor = (r: MigrationRunSeed) => {
      if (r.entity === "Learners") return seedL.length;
      if (r.entity === "Guardians") return new Set(seedL.flatMap((l) => l.guardians ?? [])).size;
      if (r.entity === "Documents")
        return seedDocuments.filter((d) => d.tenantId === tenantId).length;
      return (r.perLearner ?? 1) * current.length;
    };
    const seeded: PackRun[] = MIGRATION_RUNS.filter((r) => r.tenantId === tenantId).map((r) => ({
      id: r.id,
      entity: r.entity,
      count: countFor(r),
      source: r.source,
      date: r.date,
      status: r.status,
      note: r.note,
    }));
    const logged: PackRun[] = changeLog
      .filter((c) => c.tenantId === tenantId && c.entity === RUN_ENTITY)
      .map((c) => {
        const m = /^(\d+) (.+)$/.exec(c.to ?? "");
        const [src, status, ...note] = (c.reason ?? "").split(" · ");
        return {
          id: c.entityId,
          entity: m?.[2] ?? c.field,
          count: Number(m?.[1] ?? 0),
          source: src || "CSV upload",
          date: c.at.slice(0, 10),
          status: (status as RunStatus) || "Completed",
          note: note.join(" · ") || undefined,
        };
      });
    return [...logged, ...seeded].sort((a, b) => b.date.localeCompare(a.date));
  }, [changeLog, tenantId]);

  const by = ctx.user?.name ?? "Institute admin";

  const logRun = (entity: string, count: number, status: RunStatus, note?: string) => {
    const id = nextId("MIG-R", "changeLog", "entityId");
    logChange({
      tenantId,
      entity: RUN_ENTITY,
      entityId: id,
      field: "Import run",
      to: `${count} ${entity}`,
      by,
      reason: [source, status, note].filter(Boolean).join(" · "),
    });
    return id;
  };

  const commitLearners = (rows: Record<string, string>[]) => {
    const cal =
      calendars.find((c) => c.tenantId === tenantId && c.isDefault)?.id ??
      calendars.find((c) => c.tenantId === tenantId)?.id ??
      "";
    const seen = new Set(learners.map((l) => `${l.name.toLowerCase()}|${l.dob}`));
    const domain = ctx.profile?.studentAccounts?.domain ?? "student.demo";
    let created = 0;
    let badDate = 0;
    let dupes = 0;
    let noGuardian = 0;
    const ids: string[] = [];
    for (const r of rows) {
      const name = r.name.trim();
      const dob = (r.dob ?? "").trim();
      if (!ISO_DATE.test(dob)) {
        badDate++;
        continue;
      }
      const k = `${name.toLowerCase()}|${dob}`;
      if (seen.has(k)) {
        dupes++;
        continue;
      }
      seen.add(k);
      const minor = ageAt(dob, DEMO_TODAY) < 18;
      const guardian = r.guardian?.trim();
      if (minor && !guardian) noGuardian++;
      const id = nextId("S-", "learners");
      const learner: Learner = {
        id,
        tenantId,
        name,
        gender: /^m/i.test(r.gender ?? "") ? "M" : "F",
        dob,
        email:
          r.email?.trim() ||
          `${name
            .toLowerCase()
            .replace(/[^a-z ]/g, "")
            .split(" ")
            .filter(Boolean)
            .join(".")}@${domain}`,
        status: "Active",
        level: r.level.trim(),
        group: r.group?.trim() || undefined,
        guardians: guardian ? [guardian] : undefined,
        calendarId: cal,
        nationality: r.nationality?.trim() || ctx.region.name,
        officialIds: {},
        startDate: DEMO_TODAY,
      };
      addItem("learners", learner);
      logChange({
        tenantId,
        entity: "learner",
        entityId: id,
        studentId: id,
        field: "Record created",
        to: `${name} · ${learner.level}`,
        by,
        reason: `Migration import · ${source}`,
      });
      ids.push(id);
      created++;
    }
    const held = [
      badDate && `${badDate} bad date of birth`,
      dupes && `${dupes} already on record`,
    ].filter(Boolean);
    const runId = logRun(
      "Learners",
      created,
      held.length ? "Partial" : "Completed",
      [held.join(", "), noGuardian && `${noGuardian} under-18 without a guardian`]
        .filter(Boolean)
        .join("; ") || undefined,
    );
    toast.success(`${runId}: ${created} learner record${created === 1 ? "" : "s"} created`, {
      description: [
        ids.length ? `${ids[0]}${ids.length > 1 ? ` … ${ids[ids.length - 1]}` : ""}` : "",
        held.length ? `Held: ${held.join(", ")}` : "",
        noGuardian ? `${noGuardian} under-18 without a guardian — add one in Student Records` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
  };

  const tenantIds = new Set(learners.map((l) => l.id));
  const commitStaged = (entity: "Results" | "Fee balances", rows: Record<string, string>[]) => {
    const matched = rows.filter((r) => tenantIds.has(r.studentid.trim()));
    const unknown = rows.length - matched.length;
    let note = unknown ? `${unknown} unknown 1StudentID${unknown === 1 ? "" : "s"} held` : "";
    if (entity === "Fee balances") {
      const badAmount = matched.filter((r) => Number.isNaN(Number(r.amount))).length;
      const otherCur = matched.filter(
        (r) => r.currency && r.currency.toUpperCase() !== ctx.currency,
      ).length;
      note = [
        note,
        badAmount && `${badAmount} bad amounts`,
        otherCur && `${otherCur} not in ${ctx.currency}`,
      ]
        .filter(Boolean)
        .join("; ");
    }
    const runId = logRun(entity, matched.length, "Staged", note || undefined);
    toast.success(`${runId}: ${matched.length} of ${rows.length} rows validated`, {
      description: `Staged for ${entity === "Results" ? "the exams team" : "finance"} to confirm. Nothing was overwritten.${note ? ` ${note}.` : ""}`,
    });
  };

  const imports = [
    {
      t: "Learners",
      d: "Creates student records with a 1StudentID",
      icon: GraduationCap,
      tag: "Creates records",
      action: learnersImport.onOpen,
    },
    {
      t: ctx.type === "school" ? "Prior results" : "Module / unit results",
      d: "Matched on 1StudentID, staged for review",
      icon: ListChecks,
      tag: "Validated preview",
      action: resultsImport.onOpen,
    },
    {
      t: "Fee opening balances",
      d: `Balances in ${ctx.currency}, staged for finance`,
      icon: Wallet,
      tag: "Validated preview",
      action: balancesImport.onOpen,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Migration & Imports"
        subtitle={`Bring ${ctx.tenantName}'s records over from its previous systems.`}
      />
      <PackContextBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Learners on record"
          value={learners.length}
          icon={<GraduationCap className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Guardians linked"
          value={guardians}
          icon={<HeartHandshake className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Documents on file"
          value={docs}
          icon={<FileText className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Migration runs"
          value={runs.length}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      <Section
        title="Quick CSV imports"
        description="Rows are checked before anything is saved."
        actions={
          <label className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Importing from</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              {sources.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {imports.map(({ t, d, icon: I, tag, action }) => (
            <button
              key={t}
              onClick={action}
              className="text-left p-4 rounded-xl border bg-card hover:border-primary hover:shadow-soft transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <I className="h-4 w-4" />
                </div>
                <Badge tone={tag === "Creates records" ? "success" : "info"}>{tag}</Badge>
              </div>
              <div className="text-sm font-semibold">{t}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{d}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium">
                <Upload className="h-3 w-3" />
                Upload CSV
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Source systems"
        description={`Common for a ${ctx.type === "university" ? "university" : ctx.type === "college" ? "VET college" : "school"} in ${ctx.region.name}. Anything else: use the CSV importer.`}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sources.map((s) => {
            const live = !!s.integrationKey && connected.has(s.integrationKey);
            return (
              <div key={s.name} className="rounded-xl border bg-card p-4 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <Badge tone={live ? "success" : s.method === "API" ? "info" : "muted"}>
                    {live ? "Connected" : s.method}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 flex-1">{s.exportNote}</div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setSource(s.name);
                      learnersImport.onOpen();
                    }}
                    className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline"
                  >
                    Import learners
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  {s.method === "API" && !live && (
                    <Link
                      to="/app/integrations"
                      className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      <Plug className="h-3 w-3" />
                      Connect
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Recent migration runs"
        actions={
          <Link
            to="/app/compliance"
            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            Audit trail
            <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">Run</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Data</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Rows</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Source</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Date</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((h) => (
                <tr key={h.id} className="border-b last:border-0 align-top">
                  <td className="px-4 sm:px-5 py-3 font-mono text-xs">{h.id}</td>
                  <td className="px-4 sm:px-5 py-3">
                    {h.entity}
                    {h.note && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{h.note}</div>
                    )}
                  </td>
                  <td className="px-4 sm:px-5 py-3 font-semibold">{h.count}</td>
                  <td className="px-4 sm:px-5 py-3 text-muted-foreground">{h.source}</td>
                  <td className="px-4 sm:px-5 py-3 text-muted-foreground">{h.date}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <Badge
                      tone={
                        h.status === "Completed"
                          ? "success"
                          : h.status === "Staged"
                            ? "info"
                            : "warning"
                      }
                    >
                      {h.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What every import does">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            posture ? `Data stays in ${posture.residency}` : "Data stays in the tenant's region",
            "Checks every row; duplicates matched on name + date of birth",
            "Flags under-18s imported without a guardian",
            "Official IDs are masked in previews and the audit trail",
            "Every run and every new record is written to the audit trail",
            "Marks and balances are staged for review, never overwritten",
          ].map((g) => (
            <li key={g} className="flex items-start gap-2 p-3 rounded-lg border bg-card">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>{g}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-3 w-3 text-success" />
          {posture?.headline ?? ctx.region.dataProtection} applies to imported data.
        </div>
        <VerifyNote />
      </Section>

      <ImportDialog<Record<string, string>>
        open={learnersImport.open}
        onOpenChange={learnersImport.setOpen}
        title={`Import learners from ${source}`}
        entityLabel="learners"
        fields={LEARNER_FIELDS}
        templateName="learners-template.csv"
        transform={(row) => row}
        onCommit={commitLearners}
      />
      <ImportDialog<Record<string, string>>
        open={resultsImport.open}
        onOpenChange={resultsImport.setOpen}
        title={`Validate results from ${source}`}
        entityLabel="result rows"
        fields={RESULT_FIELDS}
        templateName="results-template.csv"
        transform={(row) => row}
        onCommit={(rows) => commitStaged("Results", rows)}
      />
      <ImportDialog<Record<string, string>>
        open={balancesImport.open}
        onOpenChange={balancesImport.setOpen}
        title={`Validate fee balances from ${source}`}
        entityLabel="balances"
        fields={BALANCE_FIELDS}
        templateName="fee-balances-template.csv"
        transform={(row) => row}
        onCommit={(rows) => commitStaged("Fee balances", rows)}
      />
    </div>
  );
}
