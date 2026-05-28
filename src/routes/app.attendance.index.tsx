import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  MiniBars,
  Button,
  Field,
  Select,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import {
  useCollection,
  addItem,
  updateItem,
  type AttendanceRow,
  type Student,
} from "@/lib/store";
import { attendanceTrend, children as parentChildren } from "@/lib/mockData";
import { useAuth } from "@/lib/auth";
import {
  QrCode,
  MapPin,
  ScanFace,
  Radio,
  Plus,
  ListChecks,
  CalendarCheck,
  TrendingUp,
  CircleAlert,
} from "lucide-react";

export const Route = createFileRoute("/app/attendance/")({
  head: () => ({ meta: [{ title: "Attendance — One Edu" }] }),
  component: AttendanceRouter,
});

const METHODS = ["QR Scan", "Facial Recognition", "GPS", "RFID"];

function AttendanceRouter() {
  const { user } = useAuth();
  const role = user?.role;
  if (role === "student") return <StudentAttendance />;
  if (role === "parent") return <ParentAttendance />;
  return <StaffAttendance />;
}

// ───────────────────────── Student view ─────────────────────────

function StudentAttendance() {
  const { user } = useAuth();
  const students = useCollection("students");
  const attendance = useCollection("attendance");

  const me: Student | undefined = useMemo(() => {
    if (!user) return students[0];
    return (
      students.find((s) => s.name.toLowerCase() === user.name.toLowerCase()) ??
      students[0]
    );
  }, [students, user]);

  const rows = useMemo(
    () => (me ? attendance.filter((a) => a.id === me.id) : []),
    [attendance, me],
  );

  return (
    <HistoryView
      title="My Attendance"
      subtitle="Your daily check-in record."
      heroStudents={me ? [me] : []}
      rows={rows}
    />
  );
}

// ───────────────────────── Parent view ─────────────────────────

function ParentAttendance() {
  const students = useCollection("students");
  const attendance = useCollection("attendance");

  // Resolve every child individually: prefer the full student record when it
  // exists, otherwise synthesise a hero-card-shaped entry from parentChildren
  // so kids missing from the roster (e.g. Tashi) still appear.
  const kids: Student[] = useMemo(() => {
    return parentChildren.map((c) => {
      const full = students.find((s) => s.id === c.id);
      if (full) return full;
      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        batch: "—",
        attendance: c.attendance,
        gpa: c.gpa,
        status: "Active",
        parent: "",
        risk: "low",
      } as unknown as Student;
    });
  }, [students]);

  const childIds = useMemo(() => new Set(kids.map((k) => k.id)), [kids]);
  const rows = useMemo(
    () => attendance.filter((a) => childIds.has(a.id)),
    [attendance, childIds],
  );

  return (
    <HistoryView
      title="Children's Attendance"
      subtitle="Daily check-in records for your children."
      heroStudents={kids}
      rows={rows}
    />
  );
}

// ─────────────────── Shared read-only history view ───────────────────

function HistoryView({
  title,
  subtitle,
  heroStudents,
  rows,
}: {
  title: string;
  subtitle: string;
  heroStudents: Student[];
  rows: AttendanceRow[];
}) {
  const present = rows.filter((r) => r.status === "Present").length;
  const late = rows.filter((r) => r.status === "Late").length;
  const absent = rows.filter((r) => r.status === "Absent").length;
  const recorded = rows.length;
  const avgAttendance =
    heroStudents.length > 0
      ? Math.round(
          heroStudents.reduce((s, k) => s + (k.attendance ?? 0), 0) /
            heroStudents.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      {heroStudents.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {heroStudents.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border bg-card p-4 flex items-center gap-3"
            >
              <Avatar name={s.name} seed={s.id} size={48} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.id} · {s.grade}
                </div>
                <div className="mt-1 text-xs">
                  Term avg:{" "}
                  <span className="font-semibold text-foreground">
                    {s.attendance ?? "—"}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Today Present"
          value={present}
          icon={<ScanFace className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Today Late"
          value={late}
          icon={<MapPin className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Today Absent"
          value={absent}
          icon={<CircleAlert className="h-5 w-5" />}
          accent="destructive"
        />
        <StatCard
          label="Term Avg"
          value={`${avgAttendance}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="info"
        />
      </div>

      <Section
        title="Weekly Trend"
        description="Class attendance % over 8 weeks (informational)"
      >
        <MiniBars
          data={attendanceTrend.map((r) => ({ label: r.week, value: r.rate }))}
        />
      </Section>

      <Section title="Recent Check-ins">
        {rows.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <CalendarCheck className="h-8 w-8 mx-auto mb-2" />
            No attendance recorded yet.
          </div>
        ) : (
          <DataTable
            columns={[
              { key: "id", label: "Student ID" },
              { key: "name", label: "Name" },
              { key: "time", label: "Time" },
              { key: "method", label: "Method" },
              { key: "status", label: "Status" },
            ]}
            rows={rows}
            emptyText="No check-ins yet"
            renderCell={(row, key) => {
              if (key === "status") {
                const tone =
                  row.status === "Present"
                    ? "success"
                    : row.status === "Late"
                      ? "warning"
                      : "destructive";
                return <Badge tone={tone}>{row.status}</Badge>;
              }
              return String(row[key] ?? "");
            }}
          />
        )}
      </Section>
    </div>
  );
}

// ───────────────────────── Staff (teacher/admin) view ─────────────────────────

function StaffAttendance() {
  const attendance = useCollection("attendance");
  const students = useCollection("students");
  const mark = useDisclosure();

  const present = attendance.filter((a) => a.status === "Present").length;
  const late = attendance.filter((a) => a.status === "Late").length;
  const absent = attendance.filter((a) => a.status === "Absent").length;

  const [form, setForm] = useState({
    studentId: students[0]?.id ?? "",
    method: METHODS[0],
    status: "Present",
  });

  const submit = () => {
    const student = students.find((s) => s.id === form.studentId);
    if (!student) {
      toast.error("Pick a student");
      return;
    }
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const existing = attendance.find((a) => a.id === student.id);
    if (existing) {
      updateItem("attendance", (a) => a.id === student.id, {
        time: now,
        method: form.method,
        status: form.status,
      });
      toast.success(`Updated ${student.name}: ${form.status}`);
    } else {
      const row: AttendanceRow = {
        id: student.id,
        name: student.name,
        time: now,
        method: form.method,
        status: form.status,
      };
      addItem("attendance", row);
      toast.success(`Marked ${student.name}: ${form.status}`);
    }
    mark.onClose();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        subtitle="QR · GPS · Facial recognition · RFID/NFC unified."
        actions={
          <>
            <Link to="/app/attendance/take">
              <Button>
                <ListChecks className="h-4 w-4" />
                Take attendance
              </Button>
            </Link>
            <Button variant="outline" onClick={mark.onOpen}>
              <Plus className="h-4 w-4" />
              Single entry
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Present Today"
          value={present}
          icon={<ScanFace className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Late"
          value={late}
          icon={<MapPin className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Absent"
          value={absent}
          icon={<QrCode className="h-5 w-5" />}
          accent="destructive"
        />
        <StatCard
          label="Weekly Avg"
          value="91%"
          icon={<Radio className="h-5 w-5" />}
          accent="info"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section title="Capture Methods" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {[
              { i: QrCode, l: "QR Scan", d: "Tap to open" },
              { i: ScanFace, l: "Facial Recog.", d: "Camera capture" },
              { i: MapPin, l: "GPS Geofence", d: "Auto check-in" },
              { i: Radio, l: "RFID / NFC", d: "Reader linked" },
            ].map(({ i: I, l, d }) => (
              <button
                key={l}
                onClick={() => {
                  setForm((f) => ({ ...f, method: l.replace(".", "") }));
                  mark.onOpen();
                }}
                className="p-4 rounded-lg border hover:border-primary hover:shadow-soft transition-all text-left"
              >
                <I className="h-5 w-5 text-primary mb-2" />
                <div className="text-sm font-medium">{l}</div>
                <div className="text-[11px] text-muted-foreground">{d}</div>
              </button>
            ))}
          </div>
        </Section>
        <Section
          title="Weekly Trend"
          description="Attendance % over 8 weeks"
          className="lg:col-span-2"
        >
          <MiniBars
            data={attendanceTrend.map((r) => ({ label: r.week, value: r.rate }))}
          />
        </Section>
      </div>

      <Section title="Today's Check-ins">
        <DataTable
          columns={[
            { key: "id", label: "Student ID" },
            { key: "name", label: "Name" },
            { key: "time", label: "Time" },
            { key: "method", label: "Method" },
            { key: "status", label: "Status" },
          ]}
          rows={attendance}
          emptyText="No check-ins yet today"
          renderCell={(row, key) => {
            if (key === "status") {
              const tone =
                row.status === "Present"
                  ? "success"
                  : row.status === "Late"
                    ? "warning"
                    : "destructive";
              return <Badge tone={tone}>{row.status}</Badge>;
            }
            return String(row[key] ?? "");
          }}
        />
      </Section>

      <FormDialog
        open={mark.open}
        onOpenChange={mark.setOpen}
        title="Mark Attendance"
        description="Record a check-in for a student."
        onSubmit={submit}
        submitLabel="Record"
      >
        <Field label="Student" required className="sm:col-span-2">
          <Select
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            options={students.map((s) => ({
              value: s.id,
              label: `${s.name} · ${s.id}`,
            }))}
          />
        </Field>
        <Field label="Method">
          <Select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            options={METHODS.map((m) => ({ value: m, label: m }))}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: "Present", label: "Present" },
              { value: "Late", label: "Late" },
              { value: "Absent", label: "Absent" },
            ]}
          />
        </Field>
      </FormDialog>
    </div>
  );
}
