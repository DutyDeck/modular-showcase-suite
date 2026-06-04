import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
import { useCollection, addItem, removeItem, nextId, type Student } from "@/lib/store";
import { getEnrollments, type StudentEnrollment } from "@/lib/mockData";
import { ImportDialog, type ImportField } from "@/components/ImportDialog";
import { CrossTenantEnrollDialog } from "@/components/CrossTenantEnrollDialog";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import {
  Plus,
  Download,
  Filter,
  Search,
  Trash2,
  Upload,
  NotebookPen,
  Building2,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/app/students")({
  head: () => ({ meta: [{ title: "Students — One Edu" }] }),
  component: StudentsPage,
});

const GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const BATCHES = ["Science-A", "Science-B", "Commerce-A", "Commerce-B", "Arts-A"];
const STATUS = ["Active", "At Risk", "Inactive"];

const STUDENT_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, sample: "Aarav Perera" },
  { key: "grade", label: "Grade", required: true, sample: "Grade 12" },
  { key: "batch", label: "Batch", sample: "Science-A" },
  { key: "parent", label: "Parent", sample: "Nimal Perera" },
  { key: "attendance", label: "Attendance", sample: "94" },
  { key: "gpa", label: "GPA", sample: "3.8" },
  { key: "status", label: "Status", sample: "Active" },
];

function StudentsPage() {
  const { user } = useAuth();
  const allStudents = useCollection("students");
  const crossEnrollments = useCollection("enrollments");
  const add = useDisclosure();
  const importer = useDisclosure();
  const crossEnroll = useDisclosure();
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("");

  // Institute admins only ever see students enrolled at their own institute,
  // even though the underlying collection holds the platform-wide roster.
  const isInstituteScoped = user?.adminScope === "institute";

  // Students this institute enrolled from another tenant (via the consent flow)
  // now belong on its roster too — track their One Edu IDs for filtering/badges.
  const crossIdsHere = useMemo(
    () =>
      new Set(
        crossEnrollments
          .filter((e) => e.institutionId === user?.institutionId)
          .map((e) => e.studentId),
      ),
    [crossEnrollments, user?.institutionId],
  );

  // Display helper: a student's static enrolments PLUS any runtime cross-tenant
  // enrolments, so a newly enrolled student shows the new institute too.
  const mergedEnrollments = (s: Student): StudentEnrollment[] => {
    const base = getEnrollments(s);
    const extra = crossEnrollments
      .filter((e) => e.studentId === s.id)
      .map((e) => ({
        institutionId: e.institutionId,
        institution: e.institutionName,
        role: e.role,
        classLabel: e.classLabel,
        since: e.since,
      }));
    return [...base, ...extra];
  };

  const students = useMemo(() => {
    if (!isInstituteScoped) return allStudents;
    return allStudents.filter(
      (s) =>
        getEnrollments(s).some((e) => e.institutionId === user?.institutionId) ||
        crossIdsHere.has(s.id),
    );
  }, [allStudents, isInstituteScoped, user?.institutionId, crossIdsHere]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return students.filter((s) => {
      if (gradeFilter && s.grade !== gradeFilter) return false;
      if (!q) return true;
      // Match against name, One Edu ID, parent, and any legacy institute ID
      // so admins can paste a known external ID and still find the student.
      const legacyIds = getEnrollments(s)
        .map((e) => e.legacyId)
        .filter(Boolean)
        .join(" ");
      return `${s.name} ${s.id} ${s.parent} ${legacyIds}`.toLowerCase().includes(q);
    });
  }, [students, query, gradeFilter]);

  const [form, setForm] = useState({
    name: "",
    grade: "Grade 12",
    batch: "Science-A",
    parent: "",
    attendance: 95,
    gpa: 3.5,
    status: "Active",
  });

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const newStudent: Student = {
      id: nextId("S-", "students"),
      name: form.name.trim(),
      grade: form.grade,
      batch: form.batch,
      attendance: Number(form.attendance) || 0,
      gpa: Number(form.gpa) || 0,
      status: form.status,
      parent: form.parent.trim() || "—",
      risk:
        Number(form.attendance) < 70 || Number(form.gpa) < 2.5
          ? "high"
          : Number(form.attendance) < 85
            ? "medium"
            : "low",
    };
    addItem("students", newStudent);
    toast.success(`Added ${newStudent.name}`);
    setForm({
      name: "",
      grade: "Grade 12",
      batch: "Science-A",
      parent: "",
      attendance: 95,
      gpa: 3.5,
      status: "Active",
    });
    add.onClose();
  };

  const exportCsv = () => {
    const rows = [
      "id,name,grade,batch,attendance,gpa,parent,status",
      ...filtered.map(
        (s) =>
          `${s.id},${s.name},${s.grade},${s.batch},${s.attendance},${s.gpa},${s.parent},${s.status}`,
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "students.csv";
    a.click();
    toast.success(`Exported ${filtered.length} students`);
  };

  const removeStudent = (id: string) => {
    removeItem("students", (s) => s.id === id);
    toast.success(`Removed ${id}`);
  };

  return (
    <div>
      <PageHeader
        title="Student Information System"
        subtitle={
          isInstituteScoped
            ? `Roster for ${user?.institutionName ?? "your institute"} — other institutes' students are hidden. Use “Enrol existing” to add an existing One Edu student with their consent.`
            : "Unified student profiles, academic history, and wellness tracking."
        }
        actions={
          <>
            <Button variant="outline">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="outline" onClick={importer.onOpen}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            {isInstituteScoped && (
              <Button variant="outline" onClick={crossEnroll.onOpen}>
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Enrol existing</span>
              </Button>
            )}
            <Button onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              New Student
            </Button>
          </>
        }
      />

      <Section
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, ID, parent…"
                className="h-9 w-full sm:w-72 rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All grades</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </>
        }
      >
        <DataTable
          columns={[
            { key: "id", label: "One Edu ID" },
            { key: "name", label: "Name" },
            { key: "grade", label: "Grade" },
            { key: "batch", label: "Batch" },
            { key: "_institutes", label: "Institutes" },
            { key: "attendance", label: "Attendance" },
            { key: "gpa", label: "GPA" },
            { key: "parent", label: "Parent" },
            { key: "status", label: "Status" },
            { key: "_actions", label: "" },
          ]}
          rows={filtered}
          emptyText="No matching students"
          renderCell={(row, key) => {
            if (key === "id") {
              const enrolments = mergedEnrollments(row);
              const primary = enrolments.find((e) => e.primary) ?? enrolments[0];
              return (
                <div className="leading-tight">
                  <div className="font-medium">{row.id}</div>
                  {primary?.legacyId && (
                    <div
                      className="text-[10px] text-muted-foreground font-mono"
                      title={`Legacy ID at ${primary.institution}${
                        primary.legacySystem ? ` (${primary.legacySystem})` : ""
                      }`}
                    >
                      {primary.legacyId}
                    </div>
                  )}
                </div>
              );
            }
            if (key === "_institutes") {
              const enrolments = mergedEnrollments(row);
              const primary = enrolments.find((e) => e.primary) ?? enrolments[0];
              const extras = enrolments.length - 1;
              return (
                <div
                  className="leading-tight"
                  title={enrolments.map((e) => `• ${e.institution} — ${e.role}`).join("\n")}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[180px]">{primary?.institution ?? "—"}</span>
                  </div>
                  {extras > 0 && (
                    <div className="text-[10px] text-primary font-medium mt-0.5">
                      +{extras} more institute{extras === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              );
            }
            if (key === "name")
              return (
                <div className="flex items-center gap-2">
                  <Avatar name={row.name} seed={row.id} size={28} />
                  <span className="font-medium">{row.name}</span>
                  {crossIdsHere.has(row.id) && (
                    <Badge tone="info">Enrolled via consent</Badge>
                  )}
                </div>
              );
            if (key === "attendance")
              return (
                <span
                  className={row.attendance < 75 ? "text-destructive font-medium" : ""}
                >
                  {row.attendance}%
                </span>
              );
            if (key === "status")
              return (
                <Badge
                  tone={
                    row.status === "Active"
                      ? "success"
                      : row.status === "At Risk"
                        ? "destructive"
                        : "muted"
                  }
                >
                  {row.status}
                </Badge>
              );
            if (key === "_actions")
              return (
                <div className="flex items-center gap-1 justify-end">
                  <Link
                    to="/app/srb/$studentId"
                    params={{ studentId: row.id }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                    aria-label={`Open record book for ${row.name}`}
                    title="Record Book"
                  >
                    <NotebookPen className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => removeStudent(row.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Remove ${row.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            return String(row[key]);
          }}
        />
      </Section>

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="New Student"
        description="Create a new student profile. They will be visible to teachers and finance immediately."
        onSubmit={submit}
        submitLabel="Add student"
      >
        <Field label="Full name" required className="sm:col-span-2">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Aarav Perera"
            autoFocus
          />
        </Field>
        <Field label="Grade">
          <Select
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
            options={GRADES.map((g) => ({ value: g, label: g }))}
          />
        </Field>
        <Field label="Batch">
          <Select
            value={form.batch}
            onChange={(e) => setForm({ ...form, batch: e.target.value })}
            options={BATCHES.map((b) => ({ value: b, label: b }))}
          />
        </Field>
        <Field label="Parent / Guardian" className="sm:col-span-2">
          <TextInput
            value={form.parent}
            onChange={(e) => setForm({ ...form, parent: e.target.value })}
            placeholder="e.g. Nimal Perera"
          />
        </Field>
        <Field label="Attendance %">
          <TextInput
            type="number"
            min={0}
            max={100}
            value={form.attendance}
            onChange={(e) =>
              setForm({ ...form, attendance: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="GPA">
          <TextInput
            type="number"
            step={0.1}
            min={0}
            max={4}
            value={form.gpa}
            onChange={(e) => setForm({ ...form, gpa: Number(e.target.value) })}
          />
        </Field>
        <Field label="Status" className="sm:col-span-2">
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={STATUS.map((s) => ({ value: s, label: s }))}
          />
        </Field>
      </FormDialog>

      <ImportDialog<Student>
        open={importer.open}
        onOpenChange={importer.setOpen}
        title="Import students from CSV"
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
        onCommit={(items) => items.forEach((s) => addItem("students", s))}
      />

      {isInstituteScoped && (
        <CrossTenantEnrollDialog
          open={crossEnroll.open}
          onOpenChange={crossEnroll.setOpen}
          tenantId={user?.institutionId ?? ""}
          tenantName={user?.institutionName ?? "your institute"}
        />
      )}
    </div>
  );
}
