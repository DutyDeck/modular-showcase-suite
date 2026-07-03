import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { useCollection } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isSwimUser } from "@/lib/mockData";
import { toast } from "sonner";
import {
  PlayCircle,
  FileText,
  MessageCircle,
  Video,
  BookOpen,
  Waves,
  Dumbbell,
  ShieldCheck,
  Timer,
  Apple,
  ListChecks,
} from "lucide-react";

export const Route = createFileRoute("/app/lms")({
  head: () => ({ meta: [{ title: "Learning Management — 1StudentID" }] }),
  component: LmsPage,
});

function LmsPage() {
  const { user } = useAuth();
  if (isSwimUser(user)) return <SwimLmsView />;
  return <GenericLmsView />;
}

/* ───────────────────────── Swim learning hub ───────────────────────── */

const SWIM_TRACKS = [
  { i: Video, t: "Stroke Technique Videos", n: 24 },
  { i: Dumbbell, t: "Dryland & Conditioning", n: 12 },
  { i: ShieldCheck, t: "Water Safety & Rescue", n: 8 },
  { i: ListChecks, t: "Drill Library", n: 36 },
  { i: Timer, t: "Race Skills — Starts & Turns", n: 10 },
  { i: Apple, t: "Nutrition & Recovery", n: 6 },
];

const SWIM_LESSONS: Array<{ title: string; level: string; mins: number }> = [
  { title: "Freestyle: high-elbow catch & rotation", level: "Stroke Development", mins: 14 },
  { title: "Tumble turns — approach, flip & push-off", level: "Competitive Squad", mins: 11 },
  { title: "Learn-to-Swim: bubbles, floats & confidence", level: "Learn-to-Swim", mins: 9 },
  { title: "Butterfly timing & undulation drills", level: "Stroke Development", mins: 16 },
  { title: "Backstroke start & backstroke kick", level: "Competitive Squad", mins: 12 },
  { title: "Dryland: core & shoulder stability", level: "All levels", mins: 18 },
];

function SwimLmsView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Swim Learning Hub"
        subtitle="Technique videos, dryland programmes, water-safety e-learning and the club drill library."
      />

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section title="Featured masterclass" className="lg:col-span-2">
          <div className="rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <Badge tone="muted">● NEW</Badge>
              <h3 className="text-lg sm:text-xl font-bold mt-2">Freestyle Technique Masterclass</h3>
              <p className="text-sm opacity-90 mt-1">
                Coach Mariana Cruz · 6 lessons · underwater video breakdowns
              </p>
            </div>
            <button
              onClick={() => toast.success("Opening masterclass…")}
              className="bg-white text-sky-700 font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-white/90 self-start sm:self-auto shrink-0"
            >
              <PlayCircle className="h-4 w-4" />
              Watch
            </button>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {SWIM_LESSONS.map((l) => (
              <button
                key={l.title}
                onClick={() => toast.success(`Playing: ${l.title}`)}
                className="text-left p-3 rounded-lg border flex items-center gap-3 hover:border-primary/40 hover:shadow-soft transition-all"
              >
                <div className="h-10 w-10 rounded-md bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.level} · {l.mins} min
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Learning tracks">
          <ul className="space-y-2 text-sm">
            {SWIM_TRACKS.map(({ i: I, t, n }) => (
              <li
                key={t}
                className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <I className="h-4 w-4 text-sky-600" />
                  {t}
                </span>
                <span className="text-xs text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            <Waves className="h-3.5 w-3.5 shrink-0" />
            Assign any lesson to a swimmer's record book so families can follow along at home.
          </div>
        </Section>
      </div>

      <Section
        title="Water-safety e-learning"
        description="Mandatory modules for coaches and squad swimmers."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { t: "Pool rules & lane etiquette", tone: "info" as const },
            { t: "Recognising a distressed swimmer", tone: "warning" as const },
            { t: "Reach & throw rescue basics", tone: "success" as const },
          ].map((m) => (
            <div key={m.t} className="p-4 rounded-xl border flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-sky-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium">{m.t}</div>
                <Badge tone={m.tone}>e-learning</Badge>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ───────────────────────── Generic LMS ───────────────────────── */

function GenericLmsView() {
  const courses = useCollection("courses");
  const assignments = useCollection("assignments");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Management System"
        subtitle="Live classes, recordings, SCORM/xAPI content, forums and exams."
      />

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <Section title="Live Now" className="lg:col-span-2">
          <div className="rounded-xl bg-gradient-hero text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <Badge tone="destructive">● LIVE</Badge>
              <h3 className="text-lg sm:text-xl font-bold mt-2">
                Advanced Physics — Quantum Mechanics
              </h3>
              <p className="text-sm opacity-85 mt-1">
                Dr. Saman Silva · 38 attending · started 12 min ago
              </p>
            </div>
            <button
              onClick={() => toast.success("Joining live class…")}
              className="bg-white text-primary font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-white/90 self-start sm:self-auto"
            >
              <Video className="h-4 w-4" />
              Join
            </button>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {courses.slice(0, 4).map((c) => (
              <div key={c.id} className="p-3 rounded-lg border flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <PlayCircle className="h-5 w-5" />
                </div>
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
              <li
                key={t}
                className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <I className="h-4 w-4 text-primary" />
                  {t}
                </span>
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
                <div className="text-xs text-muted-foreground truncate">
                  {a.course} · Due {a.due}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {a.score !== null && <span className="text-sm font-semibold">{a.score}/100</span>}
                <Badge
                  tone={
                    a.status === "Pending" ? "warning" : a.status === "Graded" ? "success" : "info"
                  }
                >
                  {a.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
