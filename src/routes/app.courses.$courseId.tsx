import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, Section, Badge, Button, StatCard } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/StarRating";
import { PoolMap } from "@/components/PoolMap";
import { useAuth } from "@/lib/auth";
import { useEnabledModules } from "@/lib/modules";
import { useCollection } from "@/lib/store";
import {
  swimCourseById,
  sessionsByCourse,
  poolById,
  teacherByName,
  effectiveCoachNames,
  effectiveSwimmerIds,
  children as parentChildren,
  type PoolSession,
  type Weekday,
} from "@/lib/mockData";
import { computeAppraisal } from "@/lib/appraisal";
import {
  ArrowLeft,
  Waves,
  Users,
  Clock,
  Building2,
  GraduationCap,
  MapPin,
  CalendarDays,
  ChevronRight,
  BookOpen,
  Star,
  DollarSign,
} from "lucide-react";

export const Route = createFileRoute("/app/courses/$courseId")({
  head: ({ params }) => ({ meta: [{ title: `Class — ${params.courseId}` }] }),
  component: CourseDetailPage,
});

const TODAY_WEEKDAY = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as Weekday[])[
  new Date().getDay()
];

function CourseDetailPage() {
  const { courseId } = useParams({ from: "/app/courses/$courseId" });
  if (swimCourseById[courseId]) return <SwimCourseView courseId={courseId} />;
  return <GenericCourseView courseId={courseId} />;
}

/* ─────────────────────────── Swimming Academy ─────────────────────────── */

function SwimCourseView({ courseId }: { courseId: string }) {
  const club = swimCourseById[courseId]!;
  const { user } = useAuth();
  const navigate = useNavigate();
  const enabled = useEnabledModules(user?.institution ?? "");
  const appraisalOn = enabled.has("appraisal");
  const students = useCollection("students");
  const ratings = useCollection("teacherRatings");
  const rosters = useCollection("sessionRosters");
  const coachMoves = useCollection("coachMoves");
  const moves = useCollection("swimmerMoves");

  const allSessions = useMemo(() => sessionsByCourse(courseId), [courseId]);
  const rosterNames = (s: PoolSession) => effectiveCoachNames(s.id, rosters, coachMoves);
  const rosterSwimmerIds = (s: PoolSession) => effectiveSwimmerIds(s, moves);

  // Role scoping. A coach only ever sees her own sessions & swimmers (real-world
  // least privilege); the club admin sees the whole club.
  const isInstructor =
    user?.role === "teacher" && allSessions.some((s) => rosterNames(s).includes(user.name));
  const isAdmin =
    user?.role === "admin" &&
    (user.adminScope !== "institute" || user.institutionId === club.institutionId);
  const isStaff = isInstructor || isAdmin;

  // The coach's view is narrowed to the sessions she coaches.
  const sessions = useMemo(
    () =>
      isInstructor && user
        ? allSessions.filter((s) =>
            effectiveCoachNames(s.id, rosters, coachMoves).includes(user.name),
          )
        : allSessions,
    [allSessions, isInstructor, user, rosters, coachMoves],
  );

  // Coaching team shown: the whole club (admin) or just the coaches sharing the
  // coach's own sessions.
  const teamCoaches = useMemo(
    () =>
      isAdmin ? club.coachNames : Array.from(new Set(sessions.flatMap((s) => rosterNames(s)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, sessions, rosters, club.coachNames],
  );

  const myStudentIds = useMemo(() => {
    if (user?.role === "student") return new Set([user.oneEduId ?? ""]);
    if (user?.role === "parent") return new Set(parentChildren.map((c) => c.id));
    return new Set<string>();
  }, [user]);

  const mySessions = useMemo(
    () => sessions.filter((s) => s.swimmerIds.some((id) => myStudentIds.has(id))),
    [sessions, myStudentIds],
  );

  // Swimmers currently enrolled in a session (its effective roster, applying any
  // moves) — used for the "enrolled / capacity" occupancy shown on the pool map
  // and timetable. (An earlier version showed the all-time present count here,
  // which read as nonsense like "76/7".)
  const occupancyFor = (s: PoolSession) => rosterSwimmerIds(s).length;

  const allSwimmerIds = useMemo(
    () => Array.from(new Set(sessions.flatMap((s) => rosterSwimmerIds(s)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, moves],
  );
  const nameFor = (id: string) => students.find((s) => s.id === id)?.name ?? id;

  const openSession = (id: string) =>
    navigate({ to: "/app/sessions/$sessionId", params: { sessionId: id } });

  return (
    <div className="space-y-5">
      <PageHeader
        title={club.name}
        subtitle={
          isStaff
            ? "Live pool view, timetable, coaches and swimmers."
            : "Your swim sessions and details."
        }
        actions={
          <>
            {isAdmin && (
              <Button onClick={() => navigate({ to: "/app/coaching" })}>
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Manage coaches</span>
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate({ to: "/app/courses" })}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">All courses</span>
            </Button>
          </>
        }
      />

      {/* Hero */}
      <Section className="!p-0 overflow-hidden">
        <div
          data-tour="club-hero"
          className="bg-gradient-to-br from-sky-500 to-cyan-600 text-white p-5 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center shrink-0">
              <Waves className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold">{club.name}</h2>
              {club.institutionName !== club.name && (
                <div className="text-xs opacity-90 mt-1 inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {club.institutionName}
                </div>
              )}
              <p className="text-sm opacity-90 mt-2 max-w-2xl">{club.blurb}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {club.levels.map((l) => (
                  <span
                    key={l}
                    className="text-[11px] rounded-full bg-white/15 ring-1 ring-white/25 px-2.5 py-0.5"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HeroStat
              icon={<Users className="h-4 w-4" />}
              label="Swimmers"
              value={String(allSwimmerIds.length)}
            />
            <HeroStat
              icon={<GraduationCap className="h-4 w-4" />}
              label="Coaches"
              value={String(club.coachNames.length)}
            />
            <HeroStat
              icon={<CalendarDays className="h-4 w-4" />}
              label="Weekly sessions"
              value={String(sessions.length)}
            />
            <HeroStat
              icon={<MapPin className="h-4 w-4" />}
              label="Pools"
              value={String(club.poolIds.length)}
            />
          </div>
        </div>
      </Section>

      {isStaff ? (
        <>
          {/* Holistic pool view */}
          <Section
            title="Today's pool"
            description="Live layout of concurrent sessions across the pool. Pick a day or time slot; tap a lane block to open the session."
          >
            <PoolMap
              sessions={sessions}
              initialDay={TODAY_WEEKDAY}
              occupancyFor={occupancyFor}
              onOpenSession={openSession}
            />
          </Section>

          {/* Timetable */}
          <Section
            title="Weekly timetable"
            description={isAdmin ? "All sessions grouped by day." : "Your sessions grouped by day."}
          >
            <div data-tour="club-timetable">
              <Timetable
                sessions={sessions}
                onOpen={openSession}
                occupancyFor={occupancyFor}
                rosterNames={rosterNames}
              />
            </div>
          </Section>

          {/* Coaches */}
          <Section
            title="Coaching team"
            description={
              isAdmin
                ? "This club is led by several coaches across the week."
                : "Coaches you share sessions with."
            }
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {teamCoaches.map((name) => {
                const t = teacherByName[name];
                const a = t ? computeAppraisal(t, ratings) : null;
                const card = (
                  <div className="rounded-xl border bg-card p-3 flex items-center gap-3 h-full hover:border-primary/40 transition-colors">
                    <Avatar name={name} src={t?.photo} size={44} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {t?.subject ?? "Coach"}
                      </div>
                      {appraisalOn && a && (
                        <div className="mt-1 flex items-center gap-1">
                          <Stars value={a.blended} size={11} />
                          <span className="text-[10px] font-semibold">{a.blended.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
                return appraisalOn && t ? (
                  <Link key={name} to="/app/appraisals/$teacherId" params={{ teacherId: t.id }}>
                    {card}
                  </Link>
                ) : (
                  <div key={name}>{card}</div>
                );
              })}
            </div>
          </Section>

          {/* Swimmers */}
          <Section
            title={`Swimmers (${allSwimmerIds.length})`}
            description="Everyone enrolled across the club's sessions."
          >
            <div className="flex flex-wrap gap-2">
              {allSwimmerIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 rounded-full border bg-card pl-1 pr-3 py-1"
                >
                  <Avatar name={nameFor(id)} seed={id} size={24} />
                  <span className="text-xs font-medium">{nameFor(id)}</span>
                </span>
              ))}
            </div>
          </Section>

          {/* Facilities */}
          <Section title="Facilities" description="Pools and zones available to this club.">
            <div className="grid sm:grid-cols-2 gap-3">
              {club.poolIds.map((pid) => {
                const p = poolById[pid];
                if (!p) return null;
                return (
                  <div key={pid} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <Waves className="h-4 w-4 text-sky-600" />
                      <span className="font-semibold text-sm">{p.name}</span>
                      <Badge tone="info">
                        {p.lengthM} m · {p.lanes} lanes
                      </Badge>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {p.zones.map((z) => (
                        <li key={z.id} className="text-xs flex items-center justify-between gap-2">
                          <span className="font-medium">{z.label}</span>
                          <span className="text-muted-foreground">
                            lanes {z.laneFrom}–{z.laneTo} · {z.depth}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      ) : (
        /* Student / parent — only their sessions */
        <Section
          title="My swim sessions"
          description={
            user?.role === "parent"
              ? "Sessions your children are enrolled in."
              : "Your enrolled sessions and details."
          }
        >
          {mySessions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Waves className="h-7 w-7 mx-auto mb-2" />
              No swim sessions linked to your account.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {mySessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onOpen={openSession}
                  swimmerNames={s.swimmerIds.filter((id) => myStudentIds.has(id)).map(nameFor)}
                />
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Timetable({
  sessions,
  onOpen,
  occupancyFor,
  rosterNames,
}: {
  sessions: PoolSession[];
  onOpen: (id: string) => void;
  occupancyFor: (s: PoolSession) => number;
  rosterNames: (s: PoolSession) => string[];
}) {
  const days: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const byDay = days
    .map((d) => ({ day: d, items: sessions.filter((s) => s.day === d) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {byDay.map(({ day, items }) => (
        <div key={day}>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
            {day}
          </div>
          <ul className="space-y-2">
            {items
              .slice()
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((s) => {
                const pool = poolById[s.poolId];
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => onOpen(s.id)}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:border-primary/40 hover:shadow-soft transition-all flex items-center gap-3"
                    >
                      <div className="text-center shrink-0 w-16">
                        <div className="text-xs font-semibold">{s.start}</div>
                        <div className="text-[10px] text-muted-foreground">{s.end}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{s.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {pool?.name} · lanes {s.laneFrom}–{s.laneTo} · {rosterNames(s).join(", ")}
                        </div>
                      </div>
                      <span
                        className="text-[11px] text-muted-foreground inline-flex items-center gap-1 shrink-0"
                        title={`${occupancyFor(s)} enrolled of ${s.capacity} places`}
                      >
                        <Users className="h-3 w-3" />
                        {occupancyFor(s)}/{s.capacity}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SessionCard({
  session: s,
  onOpen,
  swimmerNames,
}: {
  session: PoolSession;
  onOpen: (id: string) => void;
  swimmerNames: string[];
}) {
  const pool = poolById[s.poolId];
  return (
    <button
      onClick={() => onOpen(s.id)}
      className="text-left rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-soft transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge tone="info">{s.level}</Badge>
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {s.day} {s.start}–{s.end}
        </span>
      </div>
      <div className="text-sm font-semibold mt-2">{s.title}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">
        {pool?.name} · lanes {s.laneFrom}–{s.laneTo} · {s.focus}
      </div>
      <div className="text-[11px] text-muted-foreground mt-2">
        Coaches: <span className="text-foreground">{s.coachNames.join(", ")}</span>
      </div>
      {swimmerNames.length > 0 && (
        <div className="text-[11px] text-primary font-medium mt-1">
          You: {swimmerNames.join(", ")}
        </div>
      )}
    </button>
  );
}

/* ───────────────────────────── Generic course ──────────────────────────── */

function GenericCourseView({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const enabled = useEnabledModules(user?.institution ?? "");
  const appraisalOn = enabled.has("appraisal");
  const courses = useCollection("courses");
  const ratings = useCollection("teacherRatings");

  const course = courses.find((c) => c.id === courseId);
  if (!course) {
    return (
      <div className="text-center py-16">
        <div className="text-lg font-semibold">Course not found</div>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/app/courses" })}>
          <ArrowLeft className="h-4 w-4" />
          Back to courses
        </Button>
      </div>
    );
  }

  // A course is led by one or more instructors. Most courses carry a single
  // lead teacher; the list rendering supports the multi-instructor model.
  const instructorNames = course.teacher
    .split(/\s*[,&]\s*|\s+\+\s*/)
    .map((s) => s.trim())
    .filter((s) => s && !/^\d+$/.test(s));

  return (
    <div className="space-y-5">
      <PageHeader
        title={course.title}
        subtitle={`${course.code} · ${course.category}`}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/app/courses" })}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">All courses</span>
          </Button>
        }
      />

      <Section className="!p-0 overflow-hidden">
        <div className="bg-gradient-hero text-white p-5 sm:p-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone="muted">{course.code}</Badge>
            <Badge tone="muted">{course.category}</Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-2">{course.title}</h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HeroStat
              icon={<Users className="h-4 w-4" />}
              label="Enrolled"
              value={String(course.students)}
            />
            <HeroStat
              icon={<Clock className="h-4 w-4" />}
              label="Schedule"
              value={course.schedule}
            />
            <HeroStat
              icon={<Star className="h-4 w-4" />}
              label="Rating"
              value={course.rating ? String(course.rating) : "—"}
            />
            <HeroStat
              icon={<DollarSign className="h-4 w-4" />}
              label="Fee"
              value={course.price ? `$${course.price}` : "—"}
            />
          </div>
        </div>
      </Section>

      <div className="grid lg:grid-cols-3 gap-5">
        <Section
          title={instructorNames.length > 1 ? "Instructors" : "Instructor"}
          description="Led by one or more teachers depending on class size and nature."
          className="lg:col-span-2"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {instructorNames.map((name) => {
              const t = appraisalOn ? teacherByName[name] : undefined;
              const a = t ? computeAppraisal(t, ratings) : null;
              const inner = (
                <div className="rounded-xl border bg-card p-3 flex items-center gap-3 h-full hover:border-primary/40 transition-colors">
                  <Avatar name={name} src={t?.photo} size={44} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t?.subject ?? "Lead teacher"}
                    </div>
                    {a && (
                      <div className="mt-1 flex items-center gap-1">
                        <Stars value={a.blended} size={11} />
                        <span className="text-[10px] font-semibold">{a.blended.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
              return t ? (
                <Link key={name} to="/app/appraisals/$teacherId" params={{ teacherId: t.id }}>
                  {inner}
                </Link>
              ) : (
                <div key={name}>{inner}</div>
              );
            })}
          </div>
        </Section>

        <div className="space-y-4">
          <StatCard
            label="Credits"
            value={course.credits}
            icon={<BookOpen className="h-5 w-5" />}
            accent="primary"
          />
          <StatCard label="Category" value={course.category} accent="info" />
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-85">
        {icon}
        {label}
      </div>
      <div className="text-base font-bold mt-0.5 text-white truncate">{value}</div>
    </div>
  );
}
