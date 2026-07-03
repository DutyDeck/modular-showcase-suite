import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  useDisclosure,
} from "@/components/ui-kit";
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
} from "lucide-react";

export const Route = createFileRoute("/app/migration")({
  head: () => ({ meta: [{ title: "Migration & Imports — 1StudentID" }] }),
  component: MigrationPage,
});

interface SourceSystem {
  name: string;
  exportNote: string;
  status: "Native" | "CSV" | "API";
  color: string;
}

const SOURCES: SourceSystem[] = [
  { name: "Moodle", exportNote: "Site admin → Reports → Export to CSV", status: "Native", color: "from-orange-500 to-amber-500" },
  { name: "Canvas LMS", exportNote: "Course → Settings → Course Export Package", status: "Native", color: "from-rose-500 to-pink-500" },
  { name: "Blackboard Learn", exportNote: "Grade Center → Work Offline → Download", status: "CSV", color: "from-sky-500 to-cyan-500" },
  { name: "Google Classroom", exportNote: "Gradebook → Download grades as CSV", status: "API", color: "from-emerald-500 to-teal-500" },
  { name: "Schoology", exportNote: "Tools → Roster Export", status: "CSV", color: "from-indigo-500 to-violet-500" },
  { name: "Edmodo / Microsoft Teams Edu", exportNote: "Class CSV roster export", status: "CSV", color: "from-fuchsia-500 to-purple-500" },
  { name: "Custom / In-house SIS", exportNote: "Map any CSV columns to 1StudentID schema", status: "CSV", color: "from-slate-500 to-zinc-500" },
  { name: "Excel / Google Sheets", exportNote: "Save as .csv (UTF-8)", status: "CSV", color: "from-lime-500 to-green-500" },
];

const STUDENT_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, sample: "Aarav Perera" },
  { key: "grade", label: "Grade", required: true, sample: "Grade 12" },
  { key: "batch", label: "Batch", sample: "Science-A" },
  { key: "parent", label: "Parent", sample: "Nimal Perera" },
  { key: "attendance", label: "Attendance", sample: "94" },
  { key: "gpa", label: "GPA", sample: "3.8" },
  { key: "status", label: "Status", sample: "Active" },
];

const COURSE_IMPORT_FIELDS: ImportField[] = [
  { key: "title", label: "Title", required: true, sample: "Advanced Physics" },
  { key: "code", label: "Code", required: true, sample: "PHY-12" },
  { key: "category", label: "Category", sample: "Science" },
  { key: "teacher", label: "Teacher", sample: "Dr. Saman Silva" },
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
    { id: "MIG-1042", entity: "Students", count: 248, source: "Moodle CSV", when: "10 min ago", status: "Completed" },
    { id: "MIG-1041", entity: "Courses", count: 36, source: "Canvas Export", when: "1 hr ago", status: "Completed" },
    { id: "MIG-1040", entity: "Users", count: 14, source: "Google Workspace", when: "Yesterday", status: "Partial" },
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
            backgroundImage:
              "radial-gradient(circle at 85% 20%, white, transparent 40%)",
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
              Export from Moodle, Canvas, Blackboard or Google Classroom →
              optionally map columns → import. We validate every row before it
              touches your tenant.
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
            <div
              key={s.name}
              className="rounded-xl border bg-card overflow-hidden flex flex-col"
            >
              <div className={`h-2 bg-gradient-to-r ${s.color}`} />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <Badge
                    tone={
                      s.status === "Native"
                        ? "success"
                        : s.status === "API"
                          ? "info"
                          : "muted"
                    }
                  >
                    {s.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 flex-1">
                  {s.exportNote}
                </div>
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
      <Section title="Migration guarantees" description="What our toolkit does for you automatically.">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            "Schema validation per row before commit",
            "De-duplicate by ID, email or code",
            "Preserve external IDs for round-trip sync",
            "Roll back any migration run within 24 h",
            "Field-level encryption for PII at rest",
            "Compliance: GDPR · FERPA · PDPA · COPPA",
          ].map((g) => (
            <li
              key={g}
              className="flex items-start gap-2 p-3 rounded-lg border bg-card"
            >
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
            risk:
              attendance < 70 || gpa < 2.5
                ? "high"
                : attendance < 85
                  ? "medium"
                  : "low",
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
