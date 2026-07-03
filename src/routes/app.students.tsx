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
import { useCollection, addItem, removeItem, updateItem, nextId, type Student } from "@/lib/store";
import {
  getEnrollments,
  isSwimUser,
  isSwimAdmin,
  sessionsForCoach,
  sessionsByCourse,
  effectiveSwimmerIds,
  isOffboarded,
  SWIM_COURSE_ID,
  type StudentEnrollment,
  type PoolSession,
} from "@/lib/mockData";
import { ImportDialog, type ImportField } from "@/components/ImportDialog";
import { CrossTenantEnrollDialog } from "@/components/CrossTenantEnrollDialog";
import { SwimRegisterDialog } from "@/components/SwimRegisterDialog";
import { SwimProgrammeDialog } from "@/components/SwimProgrammeDialog";
import { OffboardDialog } from "@/components/OffboardDialog";
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
  UserMinus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/app/students")({
  head: () => ({ meta: [{ title: "Students — 1StudentID" }] }),
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
  const sessionAtt = useCollection("sessionAttendance");
  const moves = useCollection("swimmerMoves");
  const offboardings = useCollection("offboardings");
  const add = useDisclosure();
  const importer = useDisclosure();
  const crossEnroll = useDisclosure();
  const registerNew = useDisclosure();
  const programmeMgr = useDisclosure();
  const offboard = useDisclosure();
  const [programmeStudent, setProgrammeStudent] = useState<Student | null>(null);
  const [offboardStudent, setOffboardStudent] = useState<Student | null>(null);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("");

  // Institute admins only ever see students enrolled at their own institute,
  // even though the underlying collection holds the platform-wide roster.
  const isInstituteScoped = user?.adminScope === "institute";

  // Swim accounts see only their swimmers (coach → own sessions, admin → whole
  // club) with a swim-relevant view (programme instead of grade/GPA).
  const swim = isSwimUser(user);
  const clubSessions = useMemo(
    () =>
      swim && user && !isSwimAdmin(user)
        ? sessionsForCoach(user.name)
        : sessionsByCourse(SWIM_COURSE_ID),
    [swim, user],
  );
  // Each swimmer → the sessions they are (effectively) in, applying enrol/moves.
  const sessionsBySwimmer = useMemo(() => {
    const m = new Map<string, PoolSession[]>();
    sessionsByCourse(SWIM_COURSE_ID).forEach((s) => {
      effectiveSwimmerIds(s, moves).forEach((id) => {
        const arr = m.get(id) ?? [];
        arr.push(s);
        m.set(id, arr);
      });
    });
    return m;
  }, [moves]);
  const swimSwimmerIds = useMemo(() => {
    if (!swim || !user) return null;
    const ids = new Set<string>();
    clubSessions.forEach((s) => effectiveSwimmerIds(s, moves).forEach((id) => ids.add(id)));
    return ids;
  }, [swim, user, clubSessions, moves]);
  const swimAtt = useMemo(() => {
    const m = new Map<string, { total: number; present: number }>();
    for (const a of sessionAtt) {
      const e = m.get(a.studentId) ?? { total: 0, present: 0 };
      e.total++;
      if (a.status !== "Absent") e.present++;
      m.set(a.studentId, e);
    }
    return m;
  }, [sessionAtt]);
  const swimProgramme = (id: string) =>
    Array.from(new Set((sessionsBySwimmer.get(id) ?? []).map((s) => s.level))).join(" · ") ||
    "Swimmer";
  const swimRate = (id: string) => {
    const e = swimAtt.get(id);
    return e && e.total ? Math.round((e.present / e.total) * 100) : 0;
  };

  // Students this institute enrolled from another tenant (via the consent flow)
  // now belong on its roster too — track their 1StudentIDs for filtering/badges.
  const crossIdsHere = useMemo(
    () =>
      new Set(
        crossEnrollments
          .filter((e) => e.institutionId === user?.institutionId)
          .map((e) => e.studentId),
      ),
    [crossEnrollments, user?.institutionId],
  );

  // A student's static enrolments PLUS any runtime cross-tenant enrolments, so a
  // newly enrolled student shows the new institute too.
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

  // What an admin is ALLOWED to see. An institute admin must only ever see their
  // own institute's relationship with a student — never the other institutions
  // that student also attends (tenant isolation). The global admin sees all.
  const displayEnrollments = (s: Student): StudentEnrollment[] => {
    const all = mergedEnrollments(s);
    if (isInstituteScoped) {
      return all.filter((e) => e.institutionId === user?.institutionId);
    }
    return all;
  };

  const students = useMemo(() => {
    // Swim roster = swimmers in the club's sessions PLUS anyone enrolled into the
    // club via the cross-tenant consent flow (so a just-enrolled swimmer appears).
    if (swimSwimmerIds)
      return allStudents.filter((s) => swimSwimmerIds.has(s.id) || crossIdsHere.has(s.id));
    if (!isInstituteScoped) return allStudents;
    return allStudents.filter(
      (s) =>
        getEnrollments(s).some((e) => e.institutionId === user?.institutionId) ||
        crossIdsHere.has(s.id),
    );
  }, [allStudents, isInstituteScoped, user?.institutionId, crossIdsHere, swimSwimmerIds]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return students.filter((s) => {
      if (gradeFilter && s.grade !== gradeFilter) return false;
      if (!q) return true;
      // Match against name, 1StudentID, parent, and any legacy institute ID
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

  // Reactivate an off-boarded swimmer: drop the leaver record and restore their
  // active status. Nothing was ever deleted, so their history reappears intact.
  const reactivate = (s: Student) => {
    removeItem("offboardings", (o) => o.personId === s.id);
    updateItem("students", (r) => r.id === s.id, { status: "Active" });
    toast.success(`${s.name} reactivated — billing and messaging resume`);
  };

  return (
    <div>
      <PageHeader
        title={swim ? "Swimmers" : "Student Information System"}
        subtitle={
          swim
            ? "Swimmers enrolled across the club's sessions — programme, attendance and family record books."
            : isInstituteScoped
              ? `Roster for ${user?.institutionName ?? "your institute"} — other institutes' students are hidden. Use “Enrol existing” to add an existing 1StudentID student with their consent.`
              : "Unified student profiles, academic history, and wellness tracking."
        }
        actions={
          swim ? (
            <>
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button variant="outline" onClick={crossEnroll.onOpen} data-tour="enrol-existing">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Enrol existing swimmer</span>
                <span className="sm:hidden">Existing</span>
              </Button>
              <Button onClick={registerNew.onOpen} data-tour="register-swimmer">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Register new swimmer</span>
                <span className="sm:hidden">New</span>
              </Button>
            </>
          ) : (
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
          )
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
            {!swim && (
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
            )}
          </>
        }
      >
        <DataTable
          anchor="swimmers-table"
          columns={
            swim
              ? [
                  { key: "id", label: "1StudentID" },
                  { key: "name", label: "Swimmer" },
                  { key: "_programme", label: "Programme" },
                  { key: "_swimAttendance", label: "Attendance" },
                  { key: "parent", label: "Parent" },
                  { key: "status", label: "Status" },
                  { key: "_actions", label: "" },
                ]
              : [
                  { key: "id", label: "1StudentID" },
                  { key: "name", label: "Name" },
                  { key: "grade", label: "Grade" },
                  { key: "batch", label: "Batch" },
                  { key: "_institutes", label: "Institutes" },
                  { key: "attendance", label: "Attendance" },
                  { key: "gpa", label: "GPA" },
                  { key: "parent", label: "Parent" },
                  { key: "status", label: "Status" },
                  { key: "_actions", label: "" },
                ]
          }
          rows={filtered}
          emptyText={swim ? "No matching swimmers" : "No matching students"}
          renderCell={(row, key) => {
            if (key === "_programme")
              return <span className="text-xs">{swimProgramme(row.id)}</span>;
            if (key === "_swimAttendance") {
              const r = swimRate(row.id);
              return <span className={r < 75 ? "text-destructive font-medium" : ""}>{r}%</span>;
            }
            if (key === "id") {
              const enrolments = displayEnrollments(row);
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
              const enrolments = displayEnrollments(row);
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
                  {crossIdsHere.has(row.id) && <Badge tone="info">Enrolled via consent</Badge>}
                </div>
              );
            if (key === "attendance")
              return (
                <span className={row.attendance < 75 ? "text-destructive font-medium" : ""}>
                  {row.attendance}%
                </span>
              );
            if (key === "status") {
              if (swim && isOffboarded(row.id, offboardings))
                return (
                  <Badge tone="muted">
                    <UserMinus className="h-3 w-3" />
                    Off-boarded
                  </Badge>
                );
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
            }
            if (key === "_actions") {
              const off = swim && isOffboarded(row.id, offboardings);
              return (
                <div className="flex items-center gap-1 justify-end">
                  {swim && !off && (
                    <button
                      onClick={() => {
                        setProgrammeStudent(row);
                        programmeMgr.onOpen();
                      }}
                      data-tour="programme-btn"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                      aria-label={`Manage programme for ${row.name}`}
                      title="Manage programme"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  )}
                  <Link
                    to="/app/srb/$studentId"
                    params={{ studentId: row.id }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                    aria-label={`Open record book for ${row.name}`}
                    title="Record Book"
                  >
                    <NotebookPen className="h-4 w-4" />
                  </Link>
                  {swim ? (
                    off ? (
                      <button
                        onClick={() => reactivate(row)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-success hover:bg-success/10"
                        aria-label={`Reactivate ${row.name}`}
                        title="Reactivate"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setOffboardStudent(row);
                          offboard.onOpen();
                        }}
                        data-tour="offboard-btn"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Off-board ${row.name}`}
                        title="Off-board swimmer"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => removeStudent(row.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Remove ${row.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            }
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
            onChange={(e) => setForm({ ...form, attendance: Number(e.target.value) })}
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

      {/* "Enrol existing" uses the cross-tenant consent flow (Find → Request →
          Approve → Enrolled) for both college and swim-club admins. */}
      {isInstituteScoped && (
        <CrossTenantEnrollDialog
          open={crossEnroll.open}
          onOpenChange={crossEnroll.setOpen}
          tenantId={user?.institutionId ?? ""}
          tenantName={user?.institutionName ?? "your institute"}
          swim={swim}
          programmes={
            swim
              ? sessionsByCourse(SWIM_COURSE_ID).map((s) => ({
                  id: s.id,
                  label: `${s.title} · ${s.level} · ${s.day} ${s.start}`,
                }))
              : undefined
          }
        />
      )}

      {swim && (
        <>
          <SwimRegisterDialog open={registerNew.open} onOpenChange={registerNew.setOpen} />
          <SwimProgrammeDialog
            open={programmeMgr.open}
            onOpenChange={(v) => {
              programmeMgr.setOpen(v);
              if (!v) setProgrammeStudent(null);
            }}
            student={programmeStudent}
          />
          <OffboardDialog
            open={offboard.open}
            onOpenChange={(v) => {
              offboard.setOpen(v);
              if (!v) setOffboardStudent(null);
            }}
            person={
              offboardStudent
                ? { id: offboardStudent.id, name: offboardStudent.name, type: "swimmer" }
                : null
            }
            tenantId={user?.institutionId ?? SWIM_COURSE_ID}
            tenantName={user?.institutionName ?? "the club"}
            adminName={user?.name ?? "Admin"}
          />
        </>
      )}
    </div>
  );
}
