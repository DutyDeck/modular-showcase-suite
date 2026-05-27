import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatCard } from "@/components/ui-kit";
import { teacherClasses } from "@/lib/mockData";
import { Video, Users, Clock } from "lucide-react";

export const Route = createFileRoute("/app/teacher-classes")({
  head: () => ({ meta: [{ title: "My Classes — GlobalEdu" }] }),
  component: TeacherClassesPage,
});

function TeacherClassesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Classes" subtitle="Your live cohorts, schedules and rosters." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Classes" value={teacherClasses.length} accent="primary" />
        <StatCard label="Total Students" value={teacherClasses.reduce((a, c) => a + c.students, 0)} accent="info" />
        <StatCard label="Hours / Week" value="18" accent="success" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teacherClasses.map((c) => (
          <Section key={c.id}>
            <div className="text-xs font-mono text-muted-foreground">{c.id}</div>
            <h3 className="font-semibold mt-1">{c.name}</h3>
            <div className="text-xs text-muted-foreground">{c.batch}</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{c.students} students</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{c.nextSession}</div>
              <div className="flex items-center gap-2"><Video className="h-4 w-4 text-primary" />{c.room}</div>
            </div>
            <button className="w-full mt-4 h-9 rounded-md bg-primary text-primary-foreground text-sm flex items-center justify-center gap-2"><Video className="h-4 w-4" />Start Class</button>
          </Section>
        ))}
      </div>
    </div>
  );
}
