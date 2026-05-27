import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { courses } from "@/lib/mockData";
import { Star, Users, Clock, Plus } from "lucide-react";

export const Route = createFileRoute("/app/courses")({
  head: () => ({ meta: [{ title: "Courses — GlobalEdu" }] }),
  component: CoursesPage,
});

function CoursesPage() {
  return (
    <div>
      <PageHeader
        title="Academic Management"
        subtitle="Courses, subjects, timetables, batches and credits."
        actions={<button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2"><Plus className="h-4 w-4" />New Course</button>}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((c) => (
          <article key={c.id} className="rounded-xl border bg-card overflow-hidden shadow-soft hover:shadow-elegant transition-shadow">
            <div className="h-24 bg-gradient-brand relative">
              <div className="absolute top-3 right-3"><Badge tone="default">{c.category}</Badge></div>
              <div className="absolute bottom-2 left-4 text-white/90 text-xs font-mono">{c.code}</div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold">{c.title}</h3>
              <div className="text-xs text-muted-foreground mt-0.5">{c.teacher}</div>
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.students}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.schedule}</span>
                <span className="flex items-center gap-1"><Star className="h-3 w-3 text-warning" />{c.rating}</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div className="text-xs"><span className="text-muted-foreground">Credits</span> <span className="font-semibold">{c.credits}</span></div>
                <button className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/15">Manage</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
