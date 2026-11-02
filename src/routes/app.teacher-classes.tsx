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
import {
  Video,
  Users,
  Clock,
  Waves,
  MapPin,
  ChevronRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  NotebookPen,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { useCollection } from "@/lib/store";
import { cn } from "@/lib/utils";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import { useTenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import {
  ageBandFor,
  buildTeachingGroups,
  groupsForUser,
  type AgeBand,
} from "@/lib/packs/sis/learning";
import { addDaysISO, derivedSlots, occurrences, slotsForGroup } from "@/lib/packs/sis/community";

export const Route = createFileRoute("/app/teacher-classes")({
  head: () => ({ meta: [{ title: "My Classes — 1StudentID" }] }),
  component: TeacherClassesPage,
});

const DAY_ORDER: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function TeacherClassesPage() {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  if (user && isSwimCoach(user.name)) return <SwimCoachClasses name={user.name} />;
  if (isPackTenantUser(user, profiles)) return <PackTeacherClasses />;
  return <GenericTeacherClasses />;
}

/* ── Pack tenants: this teacher's forms, classes, modules and units ─────── */

const BAND_LABEL: Record<AgeBand, string> = {
  early: "Early years",
  primary: "Primary",
  "lower-secondary": "Lower secondary",
  "upper-secondary": "Board years",
  "sixth-form": "Sixth form",
  "higher-ed": "Module",
  vocational: "Qualification",
};

function fmtDay(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function PackTeacherClasses() {
  const ctx = useTenantContext();
  const user = ctx.user;
  const subjectClasses = useCollection("subjectClasses");
  const heModules = useCollection("heModules");
  const moduleRegistrations = useCollection("moduleRegistrations");
  const qualifications = useCollection("qualifications");
  const learners = useCollection("learners");
  const tutorGroups = useCollection("tutorGroups");
  const allSlots = useCollection("timetableSlots");
  const allChanges = useCollection("classChanges");
  const rooms = useCollection("rooms");

  const data = useMemo(() => {
    const all = buildTeachingGroups({
      subjectClasses,
      heModules,
      moduleRegistrations,
      qualifications,
      learners,
    });
    const slots = allSlots.filter((s) => s.tenantId === ctx.tenantId);
    const changes = allChanges.filter((c) => c.tenantId === ctx.tenantId);
    const me = user?.name ?? "";
    const taughtSlots = slots.filter((s) => s.teacherName === me);
    // Qualifications have no named teacher — a trainer teaches the ones on their timetable.
    const groups = [
      ...groupsForUser(user, all, learners),
      ...all.filter(
        (g) =>
          user?.role === "teacher" &&
          g.tenantId === ctx.tenantId &&
          g.kind === "qualification" &&
          slotsForGroup(g, taughtSlots, learners).length > 0,
      ),
    ];
    const derived = derivedSlots(groups, slots, learners);
    const groupSlots = (id: string) => {
      const g = groups.find((x) => x.id === id);
      if (!g) return [];
      const own = g.kind === "qualification" ? taughtSlots : slots;
      const real = slotsForGroup(g, own, learners);
      return real.length ? real : derived.filter((s) => s.id.startsWith(`DER-${g.id}-`));
    };
    const forms = tutorGroups
      .filter((t) => t.tenantId === ctx.tenantId && t.tutor === me)
      .map((t) => ({
        t,
        members: learners.filter(
          (l) => l.tenantId === ctx.tenantId && l.group === t.name && l.status !== "Withdrawn",
        ),
      }));
    const end = addDaysISO(DEMO_TODAY, 13);
    const rows = groups.map((g) => {
      const gs = groupSlots(g.id);
      const next = occurrences(gs, changes, DEMO_TODAY, end).find(
        (o) => o.change?.kind !== "Cancelled",
      );
      return { g, perWeek: gs.length, next };
    });
    const mine = [...taughtSlots, ...derived];
    const today = occurrences(mine, changes, DEMO_TODAY, DEMO_TODAY);
    const learnerIds = new Set([
      ...groups.flatMap((g) => g.studentIds),
      ...forms.flatMap((f) => f.members.map((m) => m.id)),
    ]);
    return { rows, forms, today, perWeek: mine.length, learnerCount: learnerIds.size };
  }, [
    subjectClasses,
    heModules,
    moduleRegistrations,
    qualifications,
    learners,
    tutorGroups,
    allSlots,
    allChanges,
    ctx.tenantId,
    user,
  ]);

  const roomName = (id: string, fallback?: string) =>
    rooms.find((r) => r.id === id)?.name ?? (id || fallback || "—");
  const he = data.rows.some((r) => r.g.kind !== "class");
  const noun = he ? "Modules & units" : "Classes";

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Classes"
        subtitle={`${ctx.tenantName} · ${noun.toLowerCase()} you teach${data.forms.length ? " and your form" : ""}.`}
        actions={
          <Link
            to="/app/timetable"
            className="h-9 px-3 rounded-md border bg-background text-sm font-medium inline-flex items-center gap-2 hover:bg-muted"
          >
            <CalendarDays className="h-4 w-4" />
            Timetable
          </Link>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={noun}
          value={data.rows.length}
          accent="primary"
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Learners"
          value={data.learnerCount}
          accent="info"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Lessons / week"
          value={data.perWeek}
          accent="success"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Form groups"
          value={data.forms.length}
          accent="warning"
          icon={<GraduationCap className="h-5 w-5" />}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <QuickLink to="/app/registers" icon={<ClipboardCheck className="h-4 w-4" />}>
          Attendance
        </QuickLink>
        <QuickLink to="/app/grading" icon={<PenLine className="h-4 w-4" />}>
          Grading
        </QuickLink>
        <QuickLink to="/app/srb" icon={<NotebookPen className="h-4 w-4" />}>
          Record Books
        </QuickLink>
        {he ? (
          <QuickLink to="/app/he/programmes" icon={<GraduationCap className="h-4 w-4" />}>
            Programmes
          </QuickLink>
        ) : (
          <QuickLink to="/app/school/classes" icon={<Users className="h-4 w-4" />}>
            Classes & Enrolment
          </QuickLink>
        )}
      </div>

      <Section title={`Today · ${fmtDay(DEMO_TODAY)}`}>
        {data.today.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lessons today.</p>
        ) : (
          <ul className="divide-y -my-2">
            {data.today.map((o) => (
              <li key={o.slot.id + o.date} className="py-2.5 flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 font-medium tabular-nums">
                  {o.start}–{o.end}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    o.change?.kind === "Cancelled" && "line-through text-muted-foreground",
                  )}
                >
                  {o.slot.subject} · {o.slot.groupLabel}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{roomName(o.roomId)}</span>
                {o.change && <Badge tone="warning">{o.change.kind}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {data.forms.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.forms.map(({ t, members }) => {
            const early = members.some((m) => ageBandFor(m.level) === "early");
            return (
              <Section key={t.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-muted-foreground">Form</span>
                  <Badge tone="info">{early ? "Learning journal" : "Registration"}</Badge>
                </div>
                <h3 className="font-semibold mt-1">{t.name}</h3>
                <div className="text-xs text-muted-foreground">{t.yearGroup} · form tutor</div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {members.length} on roll
                    {t.capacity ? ` · capacity ${t.capacity}` : ""}
                  </div>
                  {t.room && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {t.room}
                    </div>
                  )}
                </div>
                <Link
                  to="/app/registers"
                  className="w-full mt-4 h-9 rounded-md bg-primary text-primary-foreground text-sm flex items-center justify-center gap-2"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Take register
                </Link>
              </Section>
            );
          })}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.rows.map(({ g, perWeek, next }) => (
          <Section key={g.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-muted-foreground truncate">{g.code}</span>
              <Badge tone="muted">{BAND_LABEL[g.band]}</Badge>
            </div>
            <h3 className="font-semibold mt-1 truncate">{g.title}</h3>
            <div className="text-xs text-muted-foreground truncate">
              {g.subject !== g.title ? `${g.subject} · ` : ""}
              {g.level}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {g.studentIds.length} learner{g.studentIds.length === 1 ? "" : "s"}
                {perWeek > 0 && ` · ${perWeek} lesson${perWeek === 1 ? "" : "s"}/week`}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {next ? `Next: ${fmtDay(next.date)} · ${next.start}` : "Not timetabled"}
                {next?.change && <Badge tone="warning">{next.change.kind}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {next ? roomName(next.roomId, g.room) : (g.room ?? "—")}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                to="/app/registers"
                className="h-9 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-muted"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Attendance
              </Link>
              <Link
                to="/app/grading"
                className="h-9 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <PenLine className="h-3.5 w-3.5" />
                {g.band === "early" || g.band === "primary" ? "Feedback" : "Grading"}
              </Link>
            </div>
          </Section>
        ))}
      </div>

      {data.rows.length === 0 && data.forms.length === 0 && (
        <Section>
          <div className="text-center py-8 text-sm text-muted-foreground">
            No classes are assigned to you yet.
          </div>
        </Section>
      )}
    </div>
  );
}

function QuickLink({
  to,
  icon,
  children,
}: {
  to: "/app/registers" | "/app/grading" | "/app/srb" | "/app/he/programmes" | "/app/school/classes";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="h-9 px-3 rounded-md border bg-card text-sm font-medium inline-flex items-center gap-2 hover:border-primary/40 hover:bg-muted"
    >
      {icon}
      {children}
    </Link>
  );
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
            Open club
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
