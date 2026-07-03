import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { useCollection, addItem, updateItem, nextId, type Assignment } from "@/lib/store";
import { Plus, Upload, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/assignments")({
  head: () => ({ meta: [{ title: "Assignments — 1StudentID" }] }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { user } = useAuth();
  const assignments = useCollection("assignments");
  const courses = useCollection("courses");
  const add = useDisclosure();
  const isStaff = user?.role === "teacher" || user?.role === "admin";

  const [form, setForm] = useState({
    title: "",
    course: courses[0]?.title ?? "",
    due: "",
    status: "Pending",
  });

  const submit = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const newAssignment: Assignment = {
      id: nextId("A-", "assignments"),
      title: form.title.trim(),
      course: form.course,
      due: form.due || "TBD",
      status: form.status,
      score: null,
    };
    addItem("assignments", newAssignment);
    toast.success(`Published "${newAssignment.title}"`);
    setForm({
      title: "",
      course: courses[0]?.title ?? "",
      due: "",
      status: "Pending",
    });
    add.onClose();
  };

  const markSubmitted = (id: string) => {
    updateItem("assignments", (a) => a.id === id, { status: "Submitted" });
    toast.success("Submission recorded");
  };

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Track submissions, deadlines and grades."
        actions={
          isStaff ? (
            <Button onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              New Assignment
            </Button>
          ) : null
        }
      />
      <Section>
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "title", label: "Title" },
            { key: "course", label: "Course" },
            { key: "due", label: "Due" },
            { key: "score", label: "Score" },
            { key: "status", label: "Status" },
            { key: "_actions", label: "" },
          ]}
          rows={assignments}
          emptyText="No assignments yet"
          renderCell={(row, key) => {
            if (key === "status") {
              const tone =
                row.status === "Pending"
                  ? "warning"
                  : row.status === "Graded"
                    ? "success"
                    : "info";
              return <Badge tone={tone}>{row.status}</Badge>;
            }
            if (key === "score")
              return row.score === null ? "—" : `${row.score}/100`;
            if (key === "_actions") {
              if (row.status === "Pending") {
                return (
                  <button
                    onClick={() => markSubmitted(row.id)}
                    className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/15 inline-flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    Submit
                  </button>
                );
              }
              return (
                <span className="text-xs text-success inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Done
                </span>
              );
            }
            return String(row[key] ?? "");
          }}
        />
      </Section>

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="New Assignment"
        description="Publish a new assignment to a course."
        onSubmit={submit}
        submitLabel="Publish"
      >
        <Field label="Title" required className="sm:col-span-2">
          <TextInput
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Quantum Mechanics Problem Set"
            autoFocus
          />
        </Field>
        <Field label="Course">
          <Select
            value={form.course}
            onChange={(e) => setForm({ ...form, course: e.target.value })}
            options={courses.map((c) => ({ value: c.title, label: c.title }))}
          />
        </Field>
        <Field label="Due date">
          <TextInput
            type="date"
            value={form.due}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
        </Field>
      </FormDialog>
    </div>
  );
}
