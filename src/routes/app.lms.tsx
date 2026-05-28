import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { useCollection } from "@/lib/store";
import { toast } from "sonner";
import { PlayCircle, FileText, MessageCircle, Video, BookOpen } from "lucide-react";

export const Route = createFileRoute("/app/lms")({
  head: () => ({ meta: [{ title: "Learning Management — GlobalEdu" }] }),
  component: LmsPage,
});

function LmsPage() {
  const courses = useCollection("courses");
  const assignments = useCollection("assignments");
  return (
    <div className="space-y-6">
      <PageHeader title="Learning Management System" subtitle="Live classes, recordings, SCORM/xAPI content, forums and exams." />

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section title="Live Now" className="lg:col-span-2">
          <div className="rounded-xl bg-gradient-hero text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <Badge tone="destructive">● LIVE</Badge>
              <h3 className="text-lg sm:text-xl font-bold mt-2">Advanced Physics — Quantum Mechanics</h3>
              <p className="text-sm opacity-85 mt-1">Dr. Saman Silva · 38 attending · started 12 min ago</p>
            </div>
            <button onClick={() => toast.success("Joining live class…")} className="bg-white text-primary font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-white/90 self-start sm:self-auto"><Video className="h-4 w-4" />Join</button>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {courses.slice(0, 4).map((c) => (
              <div key={c.id} className="p-3 rounded-lg border flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><PlayCircle className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground">Next: {c.schedule}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Modules">
          <ul className="space-y-2 text-sm">
            {[
              { i: Video, t: "Recorded Lectures", n: 142 },
              { i: BookOpen, t: "SCORM / xAPI Content", n: 28 },
              { i: FileText, t: "Online Exams", n: 7 },
              { i: MessageCircle, t: "Discussion Forums", n: 23 },
            ].map(({ i: I, t, n }) => (
              <li key={t} className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted">
                <span className="flex items-center gap-2"><I className="h-4 w-4 text-primary" />{t}</span>
                <span className="text-xs text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Assignments">
        <ul className="divide-y -my-3">
          {assignments.map((a) => (
            <li key={a.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground truncate">{a.course} · Due {a.due}</div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {a.score !== null && <span className="text-sm font-semibold">{a.score}/100</span>}
                <Badge tone={a.status === "Pending" ? "warning" : a.status === "Graded" ? "success" : "info"}>{a.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
