import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader, Section, StatCard, Badge, Button } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import {
  teacherClasses,
  isSwimCoach,
  sessionsForCoach,
  poolById,
  SWIM_COURSE_ID,
  type Weekday,
} from "@/lib/mockData";
import { Video, Users, Clock, Waves, MapPin, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/teacher-classes")({
  head: () => ({ meta: [{ title: "My Classes — One Edu" }] }),
  component: TeacherClassesPage,
});

const DAY_ORDER: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function TeacherClassesPage() {
  const { user } = useAuth();
  if (user && isSwimCoach(user.name)) return <SwimCoachClasses name={user.name} />;
  return <GenericTeacherClasses />;
}

function SwimCoachClasses({ name }: { name: string }) {
  const navigate = useNavigate();
  const sessions = sessionsForCoach(name);
  const swimmers = new Set(sessions.flatMap((s) => s.swimmerIds)).size;
  const byDay = DAY_ORDER.map((d) => ({
    day: d,
    items: sessions.filter((s) => s.day === d).sort((a, b) => a.start.localeCompare(b.start)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Sessions"
        subtitle="Your swim coaching sessions across the week."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              navigate({ to: "/app/courses/$courseId", params: { courseId: SWIM_COURSE_ID } })
            }
          >
            <Waves className="h-4 w-4" />
            Swim Academy
          </Button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Sessions / week"
          value={sessions.length}
          accent="primary"
          icon={<Waves className="h-5 w-5" />}
        />
        <StatCard
          label="Swimmers"
          value={swimmers}
          accent="info"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Days on deck"
          value={byDay.length}
          accent="success"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <div className="space-y-5">
        {byDay.map(({ day, items }) => (
          <Section key={day} title={day}>
            <div className="grid md:grid-cols-2 gap-3">
              {items.map((s) => {
                const pool = poolById[s.poolId];
                return (
                  <Link
                    key={s.id}
                    to="/app/sessions/$sessionId"
                    params={{ sessionId: s.id }}
                    className="rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-soft transition-all flex items-center gap-3"
                  >
                    <div className="text-center shrink-0 w-14">
                      <div className="text-sm font-semibold">{s.start}</div>
                      <div className="text-[10px] text-muted-foreground">{s.end}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{s.title}</span>
                        <Badge tone="info">{s.level}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {pool?.name} · lanes {s.laneFrom}–{s.laneTo} · {s.swimmerIds.length}{" "}
                        swimmers
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}

function GenericTeacherClasses() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Classes" subtitle="Your live cohorts, schedules and rosters." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Classes" value={teacherClasses.length} accent="primary" />
        <StatCard
          label="Total Students"
          value={teacherClasses.reduce((a, c) => a + c.students, 0)}
          accent="info"
        />
        <StatCard label="Hours / Week" value="18" accent="success" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teacherClasses.map((c) => (
          <Section key={c.id}>
            <div className="text-xs font-mono text-muted-foreground">{c.id}</div>
            <h3 className="font-semibold mt-1">{c.name}</h3>
            <div className="text-xs text-muted-foreground">{c.batch}</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {c.students} students
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {c.nextSession}
              </div>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                {c.room}
              </div>
            </div>
            <button
              onClick={() => toast.success(`Launching ${c.name}…`)}
              className="w-full mt-4 h-9 rounded-md bg-primary text-primary-foreground text-sm flex items-center justify-center gap-2"
            >
              <Video className="h-4 w-4" />
              Start Class
            </button>
          </Section>
        ))}
      </div>
    </div>
  );
}
