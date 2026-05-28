import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { useCollection, addItem, updateItem, type AttendanceRow } from "@/lib/store";
import { attendanceTrend } from "@/lib/mockData";
import { QrCode, MapPin, ScanFace, Radio, Plus } from "lucide-react";

export const Route = createFileRoute("/app/attendance")({
  head: () => ({ meta: [{ title: "Attendance — One Edu" }] }),
  component: AttendancePage,
});

const METHODS = ["QR Scan", "Facial Recognition", "GPS", "RFID"];

function AttendancePage() {
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
        subtitle="QR Â· GPS Â· Facial recognition Â· RFID/NFC unified."
        actions={
          <Button onClick={mark.onOpen}>
            <Plus className="h-4 w-4" />
            Mark Attendance
          </Button>
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
              label: `${s.name} Â· ${s.id}`,
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
