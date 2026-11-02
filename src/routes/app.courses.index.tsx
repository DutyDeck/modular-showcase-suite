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
import { teacherByName, swimCourseById, isSwimUser } from "@/lib/mockData";
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
  MapPin,
  Heart,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import type { TeachingGroup } from "@/lib/packs/sis/learning";
import { groupSubtitle, bandLabel, whenLabel } from "@/lib/packs/sis/lmsContent";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import {
  usePackLearning,
  AddLearningDialog,
  type PackLearning,
} from "@/components/packs/LearningUI";

export const Route = createFileRoute("/app/courses/")({
  head: () => ({ meta: [{ title: "Courses — 1StudentID" }] }),
  component: CoursesPage,
});

function CoursesPage() {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  // Pack tenants see their own institution's teaching; classic + swim unchanged.
  if (!isSwimUser(user) && isPackTenantUser(user, profiles)) return <PackCoursesView />;
  return <ClassicCoursesPage />;
}

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
  { key: "teacher", label: "Teacher", sample: "Dr. Charlie Brown" },
  { key: "schedule", label: "Schedule", sample: "Mon/Wed 4-6 PM" },
  { key: "credits", label: "Credits", sample: "4" },
  { key: "price", label: "Price", sample: "120" },
];

function ClassicCoursesPage() {
  const { user } = useAuth();
  const swim = isSwimUser(user);
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
            // Swim accounts are a single-purpose club product — only ever the club.
            (swim ? !!swimCourseById[c.id] : true) &&
            (category ? c.category === category : true) &&
            (query
              ? `${c.title} ${c.code} ${c.teacher}`.toLowerCase().includes(query.toLowerCase())
              : true),
        )
        // Showcase the multi-coach swim club first.
        .sort((a, b) => (swimCourseById[b.id] ? 1 : 0) - (swimCourseById[a.id] ? 1 : 0)),
    [courses, query, category, swim],
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
        title={swim ? "Swim Programmes" : "Academic Management"}
        subtitle={
          swim
            ? "Your club's swim programmes, squads, timetables and coaches. Open a programme for its class page."
            : "Courses, classes, timetables, sessions and instructors. Open any course for its class page."
        }
        actions={
          swim ? undefined : (
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
          )
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              swim
                ? "Search programmes by name, code, coach…"
                : "Search courses by title, code, teacher…"
            }
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {!swim && (
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
        )}
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
            placeholder="e.g. Dr. Charlie Brown"
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

/* ───────────────────── Pack tenants: the institution's own teaching ───────────────────── */

const BAND_ORDER = [
  "early",
  "primary",
  "lower-secondary",
  "upper-secondary",
  "sixth-form",
  "higher-ed",
  "vocational",
];

const BAND_HEADER: Record<string, string> = {
  early: "bg-gradient-to-br from-pink-400 to-amber-400",
  primary: "bg-gradient-to-br from-emerald-500 to-teal-500",
  "lower-secondary": "bg-gradient-to-br from-sky-500 to-indigo-500",
  "upper-secondary": "bg-gradient-brand",
  "sixth-form": "bg-gradient-to-br from-violet-600 to-indigo-700",
  "higher-ed": "bg-gradient-to-br from-indigo-600 to-slate-700",
  vocational: "bg-gradient-to-br from-orange-500 to-amber-600",
};

const learnerNoun = (g: TeachingGroup) =>
  g.band === "early"
    ? "children"
    : g.band === "higher-ed"
      ? "students"
      : g.band === "vocational"
        ? "learners"
        : "pupils";

function sortGroups(a: TeachingGroup, b: TeachingGroup) {
  return (
    BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band) ||
    a.level.localeCompare(b.level, undefined, { numeric: true }) ||
    a.title.localeCompare(b.title)
  );
}

function PackCoursesView() {
  const L = usePackLearning();
  const { user, ctx } = L;
  const add = useDisclosure();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const role = user?.role;
  const uni = ctx.type === "university";
  const college = ctx.type === "college";
  const noun = uni ? "modules" : college ? "courses" : "classes";

  const programmes = useMemo(
    () => L.programmes.filter((p) => p.tenantId === ctx.tenantId),
    [L.programmes, ctx.tenantId],
  );

  const filterOptions = useMemo(() => {
    const opts = [{ value: "", label: uni ? "All programmes" : "All year groups and courses" }];
    const levels = Array.from(
      new Set(
        [...L.tenantGroups]
          .filter((g) => g.kind === "class")
          .sort(sortGroups)
          .map((g) => g.level),
      ),
    );
    levels.forEach((lv) => opts.push({ value: `lvl:${lv}`, label: lv }));
    programmes.forEach((p) =>
      opts.push({ value: `prg:${p.id}`, label: `${p.award} ${p.name} (${p.code})` }),
    );
    if (L.tenantGroups.some((g) => g.kind === "qualification"))
      opts.push({ value: "kind:qualification", label: "Vocational qualifications" });
    return opts;
  }, [L.tenantGroups, programmes, uni]);

  const matchesFilter = (g: TeachingGroup) => {
    if (!filter) return true;
    const [k, v] = [filter.slice(0, 4), filter.slice(4)];
    if (k === "lvl:") return g.kind === "class" && g.level === v;
    if (k === "prg:") {
      const p = programmes.find((x) => x.id === v);
      return (
        g.kind === "module" &&
        !!p?.stages.some((s) => [...s.coreModuleIds, ...s.optionalModuleIds].includes(g.id))
      );
    }
    if (filter === "kind:qualification") return g.kind === "qualification";
    return true;
  };
  const matchesQuery = (g: TeachingGroup) =>
    !query ||
    `${g.title} ${g.code} ${L.teacherFor(g)} ${g.level}`
      .toLowerCase()
      .includes(query.toLowerCase());

  const shown = [...L.visible].filter((g) => matchesFilter(g) && matchesQuery(g)).sort(sortGroups);
  const editable = L.visible.filter((g) => L.canEdit(g));

  const first = user?.name.split(" ")[0] ?? "";
  const title =
    role === "admin"
      ? uni
        ? "Modules"
        : college
          ? "Courses"
          : "Classes"
      : role === "teacher"
        ? uni
          ? "Modules I lead"
          : "Classes I teach"
        : role === "parent"
          ? "Your children's classes"
          : `My ${noun}`;
  const subtitle = ctx.familyOperated
    ? `${first}'s ${noun} this term. Shared with the family.`
    : role === "admin"
      ? `All ${noun} at ${ctx.tenantName}. Open one for lessons, resources and people.`
      : "Open one for lessons, live classes and resources.";

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          editable.length ? (
            <Button onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              Add lesson or resource
            </Button>
          ) : undefined
        }
      />

      {(role === "admin" || L.visible.length > 8) && (
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${noun} by name, code, teacher…`}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {role === "admin" && filterOptions.length > 1 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {filterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {ctx.graduated ? (
        <EmptyCourses
          title="Your course has ended"
          body="Congratulations! Your results and transcript stay in your record."
        />
      ) : role === "parent" ? (
        <div className="space-y-8">
          {L.family.map((child) => {
            const mine = shown.filter((g) => g.studentIds.includes(child.id));
            return (
              <section key={child.id}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={child.name} size={36} />
                  <div>
                    <div className="font-semibold">{child.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {child.level}
                      {child.group ? ` · ${child.group}` : ""}
                    </div>
                  </div>
                </div>
                {mine.length ? (
                  <CardGrid groups={mine} L={L} childId={child.id} />
                ) : (
                  <EmptyCourses
                    title="No classes yet"
                    body="Classes appear once timetables are set."
                  />
                )}
              </section>
            );
          })}
          {!L.family.length && (
            <EmptyCourses
              title="No children linked"
              body="Ask the school office to link your children."
            />
          )}
        </div>
      ) : shown.length ? (
        <CardGrid groups={shown} L={L} childId={role === "student" ? user?.oneEduId : undefined} />
      ) : (
        <EmptyCourses
          title={query || filter ? `No ${noun} match your filters` : `No ${noun} yet`}
          body={
            role === "teacher"
              ? "Classes you teach appear here once the timetable lists you."
              : "Try clearing the search."
          }
        />
      )}

      {editable.length > 0 && (
        <AddLearningDialog
          open={add.open}
          onOpenChange={add.setOpen}
          groups={editable.sort(sortGroups)}
          learners={L.learners}
        />
      )}
    </div>
  );
}

function EmptyCourses({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{body}</div>
    </div>
  );
}

function CardGrid({
  groups,
  L,
  childId,
}: {
  groups: TeachingGroup[];
  L: PackLearning;
  childId?: string;
}) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {groups.map((g) => (
        <GroupCard key={g.id} g={g} L={L} childId={childId} />
      ))}
    </div>
  );
}

function GroupCard({ g, L, childId }: { g: TeachingGroup; L: PackLearning; childId?: string }) {
  const items = L.itemsFor(g);
  const journal = g.band === "early";
  const next = items
    .filter(
      (i) =>
        (i.kind === "Lesson" || i.kind === "Live class" || (journal && i.kind === "Activity")) &&
        (i.date ?? "") >= DEMO_TODAY,
    )
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))[0];
  const observations = items.filter(
    (i) => i.kind === "Observation" && (!childId || i.studentId === childId),
  ).length;
  const teacher = L.teacherFor(g);
  const room = L.roomFor(g);
  const n = g.studentIds.length;
  const family = !L.isStaff;

  return (
    <Link
      to="/app/courses/$courseId"
      params={{ courseId: g.id }}
      className="group rounded-xl border bg-card overflow-hidden shadow-soft hover:shadow-elegant hover:border-primary/40 transition-all flex flex-col"
    >
      <div className={`h-20 relative ${BAND_HEADER[g.band] ?? "bg-gradient-brand"}`}>
        <div className="absolute top-3 right-3">
          <Badge tone="default">{bandLabel(g.band)}</Badge>
        </div>
        {journal && <Heart className="absolute bottom-2 right-3 h-6 w-6 text-white/85" />}
        <div className="absolute bottom-2 left-4 text-white/90 text-xs font-mono">{g.code}</div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold">{journal ? "Learning journal" : g.title}</h3>
        <div className="text-xs text-muted-foreground mt-0.5">{groupSubtitle(g)}</div>
        <div className="text-xs mt-2">
          <span className="text-muted-foreground">{journal ? "Key worker" : "Teacher"}:</span>{" "}
          {teacher}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {family ? `${n} in the ${journal ? "group" : "class"}` : `${n} ${learnerNoun(g)}`}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {L.schedule(g)}
          </span>
          {room && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {room}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t">
          <div className="text-xs min-w-0 truncate">
            {journal ? (
              <span>
                <span className="font-semibold">{observations}</span>{" "}
                <span className="text-muted-foreground">
                  observation{observations === 1 ? "" : "s"} shared
                </span>
              </span>
            ) : next ? (
              <span title={next.title}>
                <span className="text-muted-foreground">Next:</span> {whenLabel(next.date)}
                {next.start ? ` ${next.start}` : ""} · {next.title}
              </span>
            ) : (
              <span className="text-muted-foreground">{items.length} items</span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium group-hover:bg-primary/15 shrink-0">
            Open
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
