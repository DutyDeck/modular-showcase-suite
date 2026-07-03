import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Badge,
  Button,
  StatCard,
  DataTable,
  Field,
  Select,
  TextInput,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import {
  addItem,
  nextId,
  useCollection,
  type TrainingEnrollment,
  type CpdAssignment,
} from "@/lib/store";
import {
  trainingCourses,
  trainingCourseById,
  isSwimUser,
  isSwimAdmin,
  swimCourses,
} from "@/lib/mockData";
import {
  GraduationCap,
  Clock,
  Star,
  Award,
  PlayCircle,
  CheckCircle2,
  BookOpen,
  Search,
  UserPlus,
  CalendarClock,
} from "lucide-react";

export const Route = createFileRoute("/app/training/")({
  head: () => ({ meta: [{ title: "Teacher Training — 1StudentID" }] }),
  component: TrainingIndex,
});

function progressOf(completed: string[], total: number): number {
  if (!total) return 0;
  return Math.round((completed.length / total) * 100);
}

function TrainingIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const enrollments = useCollection("trainingEnrollments");
  const [query, setQuery] = useState("");

  const myEnrollments = useMemo(
    () => enrollments.filter((e) => e.teacherName === user?.name),
    [enrollments, user?.name],
  );
  const enrolledIds = new Set(myEnrollments.map((e) => e.courseId));

  const completedCount = myEnrollments.filter((e) => e.status === "completed").length;
  const inProgressCount = myEnrollments.filter((e) => e.status !== "completed").length;

  // Swim coaches see aquatics CPD ("Coach Education") rather than the generic
  // classroom-teaching catalogue.
  const swim = isSwimUser(user);
  const swimAdmin = isSwimAdmin(user);
  const cpd = useCollection("cpdAssignments");
  const myCpd = useMemo(() => cpd.filter((c) => c.coachName === user?.name), [cpd, user?.name]);
  const visibleCourses = useMemo(
    () => (swim ? trainingCourses.filter((c) => c.discipline === "Swimming") : trainingCourses),
    [swim],
  );

  const catalog = useMemo(() => {
    const q = query.toLowerCase();
    return visibleCourses.filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.provider.toLowerCase().includes(q),
    );
  }, [query, visibleCourses]);

  const enrol = (courseId: string) => {
    if (!user) return;
    const enrolment: TrainingEnrollment = {
      id: nextId("TRE-", "trainingEnrollments"),
      courseId,
      teacherName: user.name,
      enrolledAt: new Date().toISOString(),
      completedLessonIds: [],
      status: "enrolled",
    };
    addItem("trainingEnrollments", enrolment);
    toast.success("Enrolled — opening your course");
    navigate({ to: "/app/training/$courseId", params: { courseId } });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          swimAdmin ? "Coach Education & CPD" : swim ? "Coach Education" : "Teacher Training & CPD"
        }
        subtitle={
          swimAdmin
            ? "Assign and track continuing professional development across your coaching team."
            : swim
              ? "Aquatics CPD — water safety, stroke coaching, squad training and safeguarding."
              : "Grow as an educator — enrol in professional-development courses and learn as a student."
        }
      />

      {swimAdmin && (
        <div data-tour="assign-cpd">
          <CpdAdminBoard cpd={cpd} />
        </div>
      )}

      {swim && !swimAdmin && myCpd.length > 0 && (
        <div data-tour="cpd-recommended">
          <CpdRecommended items={myCpd} />
        </div>
      )}

      {!swimAdmin && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Enrolled"
              value={myEnrollments.length}
              icon={<BookOpen className="h-5 w-5" />}
              accent="primary"
            />
            <StatCard
              label="In progress"
              value={inProgressCount}
              icon={<PlayCircle className="h-5 w-5" />}
              accent="info"
            />
            <StatCard
              label="Certificates"
              value={completedCount}
              icon={<Award className="h-5 w-5" />}
              accent="success"
            />
            <StatCard
              label="Catalog"
              value={visibleCourses.length}
              icon={<GraduationCap className="h-5 w-5" />}
              accent="warning"
            />
          </div>

          {/* My Learning */}
          <Section
            title="My Learning"
            description="Courses you're enrolled in, with live progress."
          >
            {myEnrollments.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <div className="text-sm font-medium">You're not enrolled in any training yet</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Browse the catalog below and enrol to start learning.
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {myEnrollments.map((e) => {
                  const c = trainingCourseById[e.courseId];
                  if (!c) return null;
                  const pct = progressOf(e.completedLessonIds, c.lessons.length);
                  return (
                    <Link
                      key={e.id}
                      to="/app/training/$courseId"
                      params={{ courseId: c.id }}
                      className="rounded-xl border bg-card p-4 hover:border-primary hover:shadow-soft transition-all flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{c.provider}</div>
                        </div>
                        {e.status === "completed" ? (
                          <Badge tone="success">
                            <Award className="h-3 w-3 mr-1 inline" />
                            Certified
                          </Badge>
                        ) : (
                          <Badge tone="info">{pct}%</Badge>
                        )}
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {e.completedLessonIds.length}/{c.lessons.length} lessons
                        </span>
                        <span className="inline-flex items-center gap-1 text-primary font-medium">
                          {e.status === "completed" ? "Review" : "Continue"}
                          <PlayCircle className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>
        </>
      )}

      {/* Catalog */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="font-semibold text-sm">Course catalog</h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search training…"
              className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((c) => {
            const enrolled = enrolledIds.has(c.id);
            return (
              <article
                key={c.id}
                className="rounded-xl border bg-card overflow-hidden shadow-soft hover:shadow-elegant transition-shadow flex flex-col"
              >
                <div className="h-20 bg-gradient-brand relative">
                  <div className="absolute top-3 right-3">
                    <Badge tone="default">{c.category}</Badge>
                  </div>
                  <div className="absolute bottom-2 left-4 text-white/90 text-xs font-medium">
                    {c.level}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h4 className="font-semibold text-sm">{c.title}</h4>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.provider}</div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 flex-1">
                    {c.blurb}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {c.hours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {c.lessons.length} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-warning fill-warning" />
                      {c.rating}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t">
                    {enrolled ? (
                      <Link to="/app/training/$courseId" params={{ courseId: c.id }}>
                        <Button variant="outline" className="w-full">
                          <CheckCircle2 className="h-4 w-4" />
                          Enrolled · Continue
                        </Button>
                      </Link>
                    ) : (
                      <Button className="w-full" onClick={() => enrol(c.id)}>
                        <GraduationCap className="h-4 w-4" />
                        Enrol
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CPD_STATUS_TONE: Record<CpdAssignment["status"], "muted" | "info" | "success"> = {
  Assigned: "muted",
  "In Progress": "info",
  Completed: "success",
};

/** Coach-facing: CPD the club manager has recommended / assigned to this coach. */
function CpdRecommended({ items }: { items: CpdAssignment[] }) {
  return (
    <Section
      title="Recommended for you"
      description="Continuing professional development assigned by your club manager."
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((a) => (
          <Link
            key={a.id}
            to="/app/training/$courseId"
            params={{ courseId: a.courseId }}
            className="rounded-xl border bg-card p-4 hover:border-primary hover:shadow-soft transition-all flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{a.courseTitle}</div>
                <div className="text-xs text-muted-foreground">Assigned by {a.assignedBy}</div>
              </div>
              <Badge tone={CPD_STATUS_TONE[a.status]}>{a.status}</Badge>
            </div>
            {a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}
            <div className="flex items-center justify-between text-xs mt-1">
              {a.due ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Due {new Date(a.due).toLocaleDateString()}
                </span>
              ) : (
                <span />
              )}
              <span className="inline-flex items-center gap-1 text-primary font-medium">
                {a.status === "Completed" ? "Review" : "Start"}
                <PlayCircle className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/** Admin-facing: assign CPD to coaches and track the team's progress. */
function CpdAdminBoard({ cpd }: { cpd: CpdAssignment[] }) {
  const { user } = useAuth();
  const assign = useDisclosure();
  const coachNames = swimCourses[0]?.coachNames ?? [];
  const aquaticsCourses = trainingCourses.filter((c) => c.discipline === "Swimming");

  const [form, setForm] = useState({
    coachName: coachNames[0] ?? "",
    courseId: aquaticsCourses[0]?.id ?? "",
    due: "",
    note: "",
  });

  const submit = () => {
    if (!form.coachName || !form.courseId) return toast.error("Pick a coach and a course");
    const course = trainingCourseById[form.courseId];
    const row: CpdAssignment = {
      id: nextId("CPD-", "cpdAssignments"),
      courseId: form.courseId,
      courseTitle: course?.title ?? form.courseId,
      coachName: form.coachName,
      assignedBy: user?.name ?? "Club Manager",
      status: "Assigned",
      due: form.due ? new Date(form.due).toISOString() : undefined,
      note: form.note.trim() || undefined,
      at: new Date().toISOString(),
    };
    addItem("cpdAssignments", row);
    toast.success(`Assigned "${row.courseTitle}" to ${row.coachName}`);
    setForm({ ...form, note: "", due: "" });
    assign.onClose();
  };

  const counts = {
    assigned: cpd.filter((c) => c.status === "Assigned").length,
    inProgress: cpd.filter((c) => c.status === "In Progress").length,
    completed: cpd.filter((c) => c.status === "Completed").length,
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Coaches"
          value={coachNames.length}
          icon={<GraduationCap className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Assigned"
          value={counts.assigned}
          icon={<UserPlus className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="In progress"
          value={counts.inProgress}
          icon={<PlayCircle className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Completed"
          value={counts.completed}
          icon={<Award className="h-5 w-5" />}
          accent="success"
        />
      </div>

      <Section
        title="Coach CPD assignments"
        description="Recommend and track professional development across your coaching team."
        actions={
          <Button size="sm" onClick={assign.onOpen} data-tour="assign-cpd-btn">
            <UserPlus className="h-4 w-4" />
            Assign CPD
          </Button>
        }
      >
        <DataTable
          columns={[
            { key: "coachName", label: "Coach" },
            { key: "courseTitle", label: "Course" },
            { key: "status", label: "Status" },
            { key: "due", label: "Due" },
            { key: "assignedBy", label: "Assigned by" },
          ]}
          rows={cpd}
          emptyText="No CPD assigned yet"
          renderCell={(row, key) => {
            if (key === "coachName")
              return (
                <div className="flex items-center gap-2">
                  <Avatar name={row.coachName} size={26} />
                  <span className="font-medium">{row.coachName}</span>
                </div>
              );
            if (key === "status")
              return (
                <Badge tone={CPD_STATUS_TONE[row.status as CpdAssignment["status"]]}>
                  {row.status}
                </Badge>
              );
            if (key === "due")
              return row.due ? (
                new Date(row.due).toLocaleDateString()
              ) : (
                <span className="text-muted-foreground">—</span>
              );
            return String(row[key as keyof typeof row] ?? "");
          }}
        />
      </Section>

      <FormDialog
        open={assign.open}
        onOpenChange={assign.setOpen}
        title="Assign CPD to a coach"
        description="Recommend a professional-development course to a member of your team."
        onSubmit={submit}
        submitLabel="Assign"
      >
        <Field label="Coach" required>
          <Select
            data-tour="cpd-coach"
            value={form.coachName}
            onChange={(e) => setForm({ ...form, coachName: e.target.value })}
            options={coachNames.map((n) => ({ value: n, label: n }))}
          />
        </Field>
        <Field label="Course" required>
          <Select
            data-tour="cpd-course"
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            options={aquaticsCourses.map((c) => ({ value: c.id, label: c.title }))}
          />
        </Field>
        <Field label="Due date">
          <TextInput
            type="date"
            value={form.due}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
        </Field>
        <Field label="Note (optional)">
          <TextInput
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="e.g. Ahead of taking the squad next term"
          />
        </Field>
      </FormDialog>
    </>
  );
}
