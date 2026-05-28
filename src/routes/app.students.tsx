import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, Download, Filter, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/students")({
  head: () => ({ meta: [{ title: "Students — GlobalEdu" }] }),
  component: StudentsPage,
});

const GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const BATCHES = ["Science-A", "Science-B", "Commerce-A", "Commerce-B", "Arts-A"];
const STATUS = ["Active", "At Risk", "Inactive"];

function StudentsPage() {
  const students = useCollection("students");
  const add = useDisclosure();
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("");

  const filtered = useMemo(() => {
    return students.filter(
      (s) =>
        (gradeFilter ? s.grade === gradeFilter : true) &&
        (query
          ? `${s.name} ${s.id} ${s.parent}`
              .toLowerCase()
              .includes(query.toLowerCase())
          : true),
    );
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
        subtitle="Unified student profiles, academic history, and wellness tracking."
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
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "grade", label: "Grade" },
            { key: "batch", label: "Batch" },
            { key: "attendance", label: "Attendance" },
            { key: "gpa", label: "GPA" },
            { key: "parent", label: "Parent" },
            { key: "status", label: "Status" },
            { key: "_actions", label: "" },
          ]}
          rows={filtered}
          emptyText="No matching students"
          renderCell={(row, key) => {
            if (key === "name")
              return (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-brand text-white flex items-center justify-center text-[10px] font-semibold">
                    {row.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <span className="font-medium">{row.name}</span>
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
                <button
                  onClick={() => removeStudent(row.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={`Remove ${row.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
    </div>
  );
}
