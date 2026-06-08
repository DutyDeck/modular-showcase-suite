import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Badge,
  Button,
  Field,
  TextInput,
  Select,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { useCollection, addItem, nextId, type Course } from "@/lib/store";
import { ImportDialog, type ImportField } from "@/components/ImportDialog";
import { Stars } from "@/components/StarRating";
import { useAuth } from "@/lib/auth";
import { useEnabledModules } from "@/lib/modules";
import { teacherByName, swimCourseById } from "@/lib/mockData";
import { computeAppraisal } from "@/lib/appraisal";
import {
  Star,
  Users,
  Clock,
  Plus,
  Search,
  BookOpen,
  Upload,
  ChevronRight,
  Waves,
} from "lucide-react";

export const Route = createFileRoute("/app/courses/")({
  head: () => ({ meta: [{ title: "Courses — One Edu" }] }),
  component: CoursesPage,
});

const CATEGORIES = [
  "Science",
  "Mathematics",
  "Languages",
  "Technology",
  "Arts",
  "Commerce",
  "Sports",
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

function CoursesPage() {
  const { user } = useAuth();
  const enabledModules = useEnabledModules(user?.institution ?? "");
  const appraisalOn = enabledModules.has("appraisal");
  const ratings = useCollection("teacherRatings");
  const courses = useCollection("courses");
  const add = useDisclosure();
  const importer = useDisclosure();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const filtered = useMemo(
    () =>
      courses
        .filter(
          (c) =>
            (category ? c.category === category : true) &&
            (query
              ? `${c.title} ${c.code} ${c.teacher}`.toLowerCase().includes(query.toLowerCase())
              : true),
        )
        // Showcase the multi-coach swim club first.
        .sort((a, b) => (swimCourseById[b.id] ? 1 : 0) - (swimCourseById[a.id] ? 1 : 0)),
    [courses, query, category],
  );

  const [form, setForm] = useState({
    title: "",
    code: "",
    teacher: "",
    schedule: "",
    credits: 4,
    price: 100,
    category: "Science",
  });

  const submit = () => {
    if (!form.title.trim() || !form.code.trim()) {
      toast.error("Title and code are required");
      return;
    }
    const newCourse: Course = {
      id: nextId("C-", "courses"),
      title: form.title.trim(),
      code: form.code.trim().toUpperCase(),
      teacher: form.teacher.trim() || "Unassigned",
      students: 0,
      credits: Number(form.credits) || 0,
      schedule: form.schedule.trim() || "TBD",
      rating: 0,
      price: Number(form.price) || 0,
      category: form.category,
    };
    addItem("courses", newCourse);
    toast.success(`Created course ${newCourse.title}`);
    setForm({
      title: "",
      code: "",
      teacher: "",
      schedule: "",
      credits: 4,
      price: 100,
      category: "Science",
    });
    add.onClose();
  };

  return (
    <div>
      <PageHeader
        title="Academic Management"
        subtitle="Courses, classes, timetables, sessions and instructors. Open any course for its class page."
        actions={
          <>
            <Button variant="outline" onClick={importer.onOpen}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              New Course
            </Button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses by title, code, teacher…"
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="text-sm font-medium">No courses match your filters</div>
          <div className="text-xs text-muted-foreground mt-1">
            Try clearing search or adding a new course.
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((c) => {
            const isSwim = !!swimCourseById[c.id];
            const t = appraisalOn ? teacherByName[c.teacher] : undefined;
            const a = t ? computeAppraisal(t, ratings) : null;
            return (
              <Link
                key={c.id}
                to="/app/courses/$courseId"
                params={{ courseId: c.id }}
                className="group rounded-xl border bg-card overflow-hidden shadow-soft hover:shadow-elegant hover:border-primary/40 transition-all flex flex-col"
              >
                <div
                  className={`h-24 relative ${isSwim ? "bg-gradient-to-br from-sky-500 to-cyan-600" : "bg-gradient-brand"}`}
                >
                  <div className="absolute top-3 right-3">
                    <Badge tone="default">{c.category}</Badge>
                  </div>
                  {isSwim && <Waves className="absolute bottom-2 right-3 h-6 w-6 text-white/80" />}
                  <div className="absolute bottom-2 left-4 text-white/90 text-xs font-mono">
                    {c.code}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold">{c.title}</h3>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.teacher}</div>
                  {a && (
                    <span
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 self-start"
                      title={`Teacher appraisal · ${a.ratingCount} review${a.ratingCount === 1 ? "" : "s"}`}
                    >
                      <Stars value={a.blended} size={12} />
                      <span className="text-[11px] font-semibold">{a.blended.toFixed(1)}</span>
                      <span className="text-[10px] text-muted-foreground">teacher</span>
                    </span>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {c.students}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {c.schedule}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-warning" />
                      {c.rating || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="text-xs">
                      {isSwim ? (
                        <span className="text-primary font-medium">Multi-coach club</span>
                      ) : (
                        <>
                          <span className="text-muted-foreground">Credits</span>{" "}
                          <span className="font-semibold">{c.credits}</span>
                        </>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium group-hover:bg-primary/15">
                      Open class
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="New Course"
        description="Create a new course or subject in your catalog."
        onSubmit={submit}
        submitLabel="Create course"
      >
        <Field label="Title" required className="sm:col-span-2">
          <TextInput
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Advanced Physics"
            autoFocus
          />
        </Field>
        <Field label="Course code" required>
          <TextInput
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="e.g. PHY-12"
          />
        </Field>
        <Field label="Category">
          <Select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Lead teacher" className="sm:col-span-2">
          <TextInput
            value={form.teacher}
            onChange={(e) => setForm({ ...form, teacher: e.target.value })}
            placeholder="e.g. Dr. Saman Silva"
          />
        </Field>
        <Field label="Schedule">
          <TextInput
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            placeholder="Mon/Wed 4-6 PM"
          />
        </Field>
        <Field label="Credits">
          <TextInput
            type="number"
            min={0}
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
          />
        </Field>
        <Field label="Price (USD)" className="sm:col-span-2">
          <TextInput
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
        </Field>
      </FormDialog>

      <ImportDialog<Course>
        open={importer.open}
        onOpenChange={importer.setOpen}
        title="Import courses from CSV"
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
        onCommit={(items) => items.forEach((c) => addItem("courses", c))}
      />
    </div>
  );
}
