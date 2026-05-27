import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatCard, DataTable, Badge, MiniBars } from "@/components/ui-kit";
import { attendanceToday, attendanceTrend } from "@/lib/mockData";
import { QrCode, MapPin, ScanFace, Radio } from "lucide-react";

export const Route = createFileRoute("/app/attendance")({
  head: () => ({ meta: [{ title: "Attendance — GlobalEdu" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const present = attendanceToday.filter(a => a.status === "Present").length;
  const late = attendanceToday.filter(a => a.status === "Late").length;
  const absent = attendanceToday.filter(a => a.status === "Absent").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        subtitle="QR · GPS · Facial recognition · RFID/NFC unified."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Present Today" value={present} icon={<ScanFace className="h-5 w-5" />} accent="success" />
        <StatCard label="Late" value={late} icon={<MapPin className="h-5 w-5" />} accent="warning" />
        <StatCard label="Absent" value={absent} icon={<QrCode className="h-5 w-5" />} accent="destructive" />
        <StatCard label="Weekly Avg" value="91%" icon={<Radio className="h-5 w-5" />} accent="info" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Capture Methods" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {[
              { i: QrCode, l: "QR Scan", d: "Tap to open" },
              { i: ScanFace, l: "Facial Recog.", d: "Camera capture" },
              { i: MapPin, l: "GPS Geofence", d: "Auto check-in" },
              { i: Radio, l: "RFID / NFC", d: "Reader linked" },
            ].map(({ i: I, l, d }) => (
              <button key={l} className="p-4 rounded-lg border hover:border-primary hover:shadow-soft transition-all text-left">
                <I className="h-5 w-5 text-primary mb-2" />
                <div className="text-sm font-medium">{l}</div>
                <div className="text-[11px] text-muted-foreground">{d}</div>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Weekly Trend" description="Attendance % over 8 weeks" className="lg:col-span-2">
          <MiniBars data={attendanceTrend.map(r => ({ label: r.week, value: r.rate }))} />
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
          rows={attendanceToday}
          renderCell={(row, key) => {
            if (key === "status") {
              const tone = row.status === "Present" ? "success" : row.status === "Late" ? "warning" : "destructive";
              return <Badge tone={tone}>{row.status}</Badge>;
            }
            return String(row[key]);
          }}
        />
      </Section>
    </div>
  );
}
