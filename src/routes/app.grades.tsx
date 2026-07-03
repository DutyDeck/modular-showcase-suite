import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge, MiniBars } from "@/components/ui-kit";
import { grades } from "@/lib/mockData";

export const Route = createFileRoute("/app/grades")({
  head: () => ({ meta: [{ title: "Grades — 1StudentID" }] }),
  component: GradesPage,
});

function GradesPage() {
  const avg = (grades.reduce((a, g) => a + g.final, 0) / grades.length).toFixed(1);
  return (
    <div className="space-y-6">
      <PageHeader title="Grades & Transcripts" subtitle="Semester performance across all subjects." />
      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Overall Average" className="lg:col-span-1">
          <div className="text-center py-4">
            <div className="text-6xl font-bold text-gradient">{avg}</div>
            <div className="text-xs text-muted-foreground mt-2">Final exam average</div>
            <Badge tone="success">A — Excellent</Badge>
          </div>
        </Section>
        <Section title="Final Scores" className="lg:col-span-2">
          <MiniBars data={grades.map(g => ({ label: g.course.split(" ")[0], value: g.final }))} />
        </Section>
      </div>
      <Section title="Subject Breakdown">
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 sm:px-5 py-2 font-medium">Course</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Mid-Term</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Final</th>
                <th className="px-4 sm:px-5 py-2 font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.course} className="border-b last:border-0">
                  <td className="px-4 sm:px-5 py-3 font-medium">{g.course}</td>
                  <td className="px-4 sm:px-5 py-3">{g.mid}</td>
                  <td className="px-4 sm:px-5 py-3">{g.final}</td>
                  <td className="px-4 sm:px-5 py-3"><Badge tone={g.grade.includes("+") ? "success" : "default"}>{g.grade}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
