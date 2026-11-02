import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { money } from "@/lib/packs/regions";
import { useMemo, useState } from "react";
import {
  PageHeader,
  Section,
  Badge,
  Button,
  StatCard,
  FormDialog,
  Field,
  TextInput,
  useDisclosure,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/StarRating";
import { PoolMap } from "@/components/PoolMap";
import { useAuth } from "@/lib/auth";
import { useEnabledModules } from "@/lib/modules";
import { useCollection, addItem, updateItem, removeItem } from "@/lib/store";
import { toast } from "sonner";
import {
  swimCourseById,
  sessionsByCourse,
  poolById,
  teacherByName,
  effectiveCoachNames,
  effectiveSwimmerIds,
  courseCapacity,
  effectiveCapacity,
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
  TrendingUp,
  AlertTriangle,
  Wallet,
  ClipboardList,
  SlidersHorizontal,
  Plus,
  Heart,
  Lock,
} from "lucide-react";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import type { TeachingGroup } from "@/lib/packs/sis/learning";
import { bandLabel, groupSubtitle, type LearningItem } from "@/lib/packs/sis/lmsContent";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import { Tabs } from "@/components/packs/PackUI";
import {
  usePackLearning,
  AddLearningDialog,
  ItemRow,
  type PackLearning,
} from "@/components/packs/LearningUI";

export const Route = createFileRoute("/app/courses/$courseId")({
  head: ({ params }) => ({ meta: [{ title: `Class — ${params.courseId}` }] }),
  component: CourseDetailPage,
});

const TODAY_WEEKDAY = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as Weekday[])[
  new Date().getDay()
];

function CourseDetailPage() {
  const { courseId } = useParams({ from: "/app/courses/$courseId" });
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  if (swimCourseById[courseId]) return <SwimCourseView courseId={courseId} />;
  // Pack tenants: a "course" is a teaching group (class / module / qualification).
  if (isPackTenantUser(user, profiles)) return <PackCourseView courseId={courseId} />;
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
  const assignments = useCollection("assignments");
  const capacityOverrides = useCollection("capacityOverrides");
  const capDialog = useDisclosure();
  const [seatsInput, setSeatsInput] = useState("");

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

  // ── Capacity & enrolment ──────────────────────────────────────────────────
  const overrideRow = capacityOverrides.find((o) => o.courseId === course.id);
  const defaultCap = courseCapacity(course.id, course.students);
  const cap = effectiveCapacity(course.id, course.students, capacityOverrides);
  const isCustomCap = !!overrideRow;
  const filled = course.students;
  const seatsLeft = Math.max(cap - filled, 0);
  const waitlist = Math.max(filled - cap, 0);
  const pct = cap ? Math.round((filled / cap) * 100) : 0;
  const status: CapacityStatus =
    pct >= 100 ? "full" : pct >= 75 ? "healthy" : pct >= 50 ? "low" : "under";
  const meta = CAPACITY_META(status, waitlist);
  const isStaff = user?.role === "admin" || user?.role === "teacher";

  const openAdjust = () => {
    setSeatsInput(String(cap));
    capDialog.onOpen();
  };
  const saveSeats = () => {
    const n = Math.round(Number(seatsInput));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a seat count above zero");
      return;
    }
    const patch = { seats: n, by: user?.name ?? "Admin", at: new Date().toISOString() };
    if (overrideRow) updateItem("capacityOverrides", (o) => o.courseId === course.id, patch);
    else addItem("capacityOverrides", { courseId: course.id, ...patch });
    toast.success(`Capacity set to ${n} seats for ${course.title}`);
    capDialog.onClose();
  };
  const resetSeats = () => {
    removeItem("capacityOverrides", (o) => o.courseId === course.id);
    toast.success(`Capacity reset to the planned default (${defaultCap} seats)`);
    capDialog.onClose();
  };

  // Fee × seats — makes the "empty seats are lost income" point concrete for staff.
  const fee = course.price || 0;
  const currentRevenue = filled * fee;
  const potentialRevenue = cap * fee;
  const revenueGap = seatsLeft * fee;

  // Assignments set for this class (matched by course title; hidden when none).
  const courseAssignments = assignments.filter((a) => {
    const c = a.course.toLowerCase();
    const t = course.title.toLowerCase();
    return c === t || t.includes(c) || c.includes(t);
  });

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
              label="Enrolled / seats"
              value={`${filled}/${cap}`}
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
              value={course.price ? money(course.price, "USD") : "—"}
            />
          </div>
        </div>
      </Section>

      {/* Capacity & enrolment planning */}
      <Section
        title="Capacity & enrolment planning"
        description="How full this class is running, and what it means for viability and revenue."
        actions={
          <div className="inline-flex items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="text-sm font-bold tabular-nums">{pct}%</span>
            {isStaff && (
              <Button variant="outline" size="sm" onClick={openAdjust}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Adjust seats</span>
              </Button>
            )}
          </div>
        }
      >
        <div className="grid sm:grid-cols-4 gap-3">
          <CapTile
            label="Capacity"
            value={String(cap)}
            sub={isCustomCap ? "custom · seats" : "planned seats"}
          />
          <CapTile label="Enrolled" value={String(filled)} sub="students" />
          <CapTile
            label={waitlist > 0 ? "Waitlist" : "Seats available"}
            value={String(waitlist > 0 ? waitlist : seatsLeft)}
            sub={waitlist > 0 ? "over capacity" : "still open"}
            tone={waitlist > 0 ? "warning" : seatsLeft === 0 ? "success" : "default"}
          />
          <CapTile label="Fill rate" value={`${pct}%`} sub="of capacity" />
        </div>

        <div className="mt-4">
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${meta.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5">
            {status === "healthy" || status === "full" ? (
              <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning-foreground" />
            )}
            <span>{meta.advice}</span>
          </p>
        </div>

        {/* Revenue impact — staff only. Empty seats are unearned term fees. */}
        {isStaff && fee > 0 && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              Revenue impact · this term
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-sm font-bold tabular-nums">{usd(currentRevenue)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Earning now
                </div>
              </div>
              <div>
                <div className="text-sm font-bold tabular-nums">{usd(potentialRevenue)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  At full capacity
                </div>
              </div>
              <div>
                <div
                  className={`text-sm font-bold tabular-nums ${revenueGap > 0 ? "text-warning-foreground" : "text-success"}`}
                >
                  {usd(revenueGap)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {revenueGap > 0 ? "Unearned (empty seats)" : "Fully utilised"}
                </div>
              </div>
            </div>
            {revenueGap > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {seatsLeft} empty seat{seatsLeft === 1 ? "" : "s"} × {usd(fee)} fee ={" "}
                <span className="font-semibold text-foreground">{usd(revenueGap)}</span> of term
                fees left on the table. Filling this class — or combining it with another — recovers
                that.
              </p>
            )}
          </div>
        )}
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

      {/* Coursework — this class's assignments (hidden when none are on file) */}
      {courseAssignments.length > 0 && (
        <Section
          title="Coursework"
          description="Assignments set for this class."
          actions={
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              {courseAssignments.length} item{courseAssignments.length === 1 ? "" : "s"}
            </span>
          }
        >
          <ul className="divide-y -mx-4 sm:-mx-5">
            {courseAssignments.map((a) => (
              <li key={a.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground">Due {a.due}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.score != null && (
                    <span className="text-xs font-semibold tabular-nums">{a.score}%</span>
                  )}
                  <Badge
                    tone={
                      a.status === "Graded"
                        ? "success"
                        : a.status === "Submitted"
                          ? "info"
                          : "warning"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Adjust seats — admins/teachers set this class's planned capacity */}
      <FormDialog
        open={capDialog.open}
        onOpenChange={capDialog.setOpen}
        title="Adjust class capacity"
        description={`Set the planned number of seats for ${course.title}. This drives the fill rate and the under-filled / full flags here and on the dashboard.`}
        onSubmit={saveSeats}
        submitLabel="Save capacity"
      >
        <Field label="Seats (capacity)" required className="sm:col-span-2">
          <TextInput
            type="number"
            min={1}
            value={seatsInput}
            onChange={(e) => setSeatsInput(e.target.value)}
            autoFocus
          />
        </Field>
        <div className="sm:col-span-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {filled} enrolled · planned default {defaultCap} seats
          </span>
          {isCustomCap && (
            <button
              type="button"
              onClick={resetSeats}
              className="font-medium text-primary hover:underline"
            >
              Reset to default ({defaultCap})
            </button>
          )}
        </div>
      </FormDialog>
    </div>
  );
}

/* ── Capacity helpers (academic course view) ─────────────────────────────── */

type CapacityStatus = "under" | "low" | "healthy" | "full";

function CAPACITY_META(
  status: CapacityStatus,
  waitlist: number,
): {
  tone: "destructive" | "warning" | "success" | "info";
  label: string;
  bar: string;
  advice: string;
} {
  switch (status) {
    case "under":
      return {
        tone: "destructive",
        label: "Under-filled",
        bar: "bg-destructive",
        advice:
          "Well below a viable size. Combine it with another section, move it to a higher-demand slot, or run an enrolment push before the term locks in.",
      };
    case "low":
      return {
        tone: "warning",
        label: "Low",
        bar: "bg-warning",
        advice:
          "Below a healthy size. A short promotion or a schedule tweak could lift it to target and protect the margin.",
      };
    case "healthy":
      return {
        tone: "success",
        label: "Healthy",
        bar: "bg-success",
        advice: "A healthy, profitable class size — no action needed.",
      };
    case "full":
      return {
        tone: "info",
        label: waitlist > 0 ? "Waitlisted" : "Full",
        bar: "bg-primary",
        advice:
          waitlist > 0
            ? `At capacity with ${waitlist} on the waitlist — strong demand. Consider opening another section.`
            : "At capacity. If demand continues, opening another section captures it.",
      };
  }
}

function CapTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "success" | "warning";
}) {
  const valueTone =
    tone === "warning" ? "text-warning-foreground" : tone === "success" ? "text-success" : "";
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold tabular-nums mt-0.5 ${valueTone}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

const usd = (n: number) => money(n, "USD");

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

/* ───────────────────── Pack tenants: one teaching group ───────────────────── */

const byWhen = (a: LearningItem, b: LearningItem) =>
  `${a.date ?? ""}${a.start ?? ""}`.localeCompare(`${b.date ?? ""}${b.start ?? ""}`);

function groupByTopic(items: LearningItem[]): [string, LearningItem[]][] {
  const m = new Map<string, LearningItem[]>();
  for (const it of items) {
    const k = it.topic || "General";
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  return Array.from(m.entries());
}

type PackTab = "overview" | "resources" | "people";

function PackCourseView({ courseId }: { courseId: string }) {
  const L = usePackLearning();
  const { user } = L;
  const add = useDisclosure();
  const [tab, setTab] = useState<PackTab>("overview");
  const g = L.all.find((x) => x.id === courseId);
  if (!g) return <GenericCourseView courseId={courseId} />;

  const allowed = L.isStaff
    ? g.tenantId === user?.institutionId
    : L.visible.some((v) => v.id === g.id);
  if (!allowed) {
    return (
      <div className="text-center py-16">
        <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <div className="text-lg font-semibold">You don't have access to this class</div>
        <Link to="/app/courses" className="inline-flex mt-4 text-sm text-primary hover:underline">
          Back to classes
        </Link>
      </div>
    );
  }

  const items = L.itemsFor(g);
  const journal = g.band === "early";
  const teacher = L.teacherFor(g);
  const room = L.roomFor(g);
  const editable = L.canEdit(g);
  const kidsHere = L.family.filter((f) => g.studentIds.includes(f.id));
  const people = L.learners.filter((l) => g.studentIds.includes(l.id));
  const backLabel =
    L.ctx.type === "university" ? "modules" : L.ctx.type === "college" ? "courses" : "classes";

  const title = journal
    ? kidsHere.length === 1
      ? `${kidsHere[0].name.split(" ")[0]}'s learning journal`
      : `Learning journal — ${g.code}`
    : g.title;

  return (
    <div className="space-y-5">
      <Link
        to="/app/courses"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All {backLabel}
      </Link>
      <PageHeader
        title={title}
        subtitle={`${g.code} · ${groupSubtitle(g)}`}
        actions={
          <>
            <Link
              to="/app/lms"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-medium hover:bg-muted"
            >
              <BookOpen className="h-4 w-4" />
              Learning
            </Link>
            {editable && (
              <Button onClick={add.onOpen}>
                <Plus className="h-4 w-4" />
                {journal ? "Add to journal" : "Add lesson or resource"}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <Avatar name={teacher} size={40} />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {journal ? "Key worker" : g.band === "vocational" ? "Trainer" : "Teacher"}
            </div>
            <div className="text-sm font-medium truncate">{teacher}</div>
          </div>
        </div>
        <InfoTile icon={<Clock className="h-4 w-4" />} label="When" value={L.schedule(g)} />
        <InfoTile icon={<MapPin className="h-4 w-4" />} label="Where" value={room ?? "—"} />
        <InfoTile
          icon={<Users className="h-4 w-4" />}
          label={L.isStaff ? "Learners" : journal ? "In the group" : "In the class"}
          value={String(g.studentIds.length)}
        />
      </div>

      <Tabs<PackTab>
        tabs={[
          { id: "overview", label: journal ? "Journal" : "Overview" },
          {
            id: "resources",
            label: journal ? "For home" : "Resources",
            count: items.filter((i) => i.kind === "Resource" || i.kind === "Recording").length,
          },
          { id: "people", label: "People" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "overview" &&
        (journal ? (
          <JournalOverview g={g} items={items} L={L} />
        ) : (
          <GroupOverview g={g} items={items} />
        ))}

      {tab === "resources" && (
        <Section
          title={journal ? "To try at home" : "Resources by topic"}
          description={
            journal ? "Songs, sounds and ideas from this week." : "Notes, sheets and recordings."
          }
        >
          {groupByTopic(
            items.filter((i) => i.kind === "Resource" || i.kind === "Recording").sort(byWhen),
          ).map(([topic, list]) => (
            <div key={topic} className="mb-4 last:mb-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {topic}
              </div>
              <div className="divide-y">
                {list.map((it) => (
                  <ItemRow key={it.id} item={it} group={g} />
                ))}
              </div>
            </div>
          ))}
          {!items.some((i) => i.kind === "Resource" || i.kind === "Recording") && (
            <div className="text-sm text-muted-foreground">Nothing shared yet.</div>
          )}
        </Section>
      )}

      {tab === "people" && (
        <Section title="People">
          <div className="flex items-center gap-3 pb-3 border-b">
            <Avatar name={teacher} size={36} />
            <div>
              <div className="text-sm font-medium">{teacher}</div>
              <div className="text-xs text-muted-foreground">
                {journal ? "Key worker" : g.kind === "module" ? "Module leader" : "Teacher"}
              </div>
            </div>
          </div>
          {L.isStaff ? (
            <ul className="divide-y">
              {people.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center gap-3">
                  <Avatar name={p.name} size={32} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.id} · {p.level}
                      {p.group ? ` · ${p.group}` : ""}
                    </div>
                  </div>
                </li>
              ))}
              {!people.length && (
                <li className="py-3 text-sm text-muted-foreground">No learners yet.</li>
              )}
            </ul>
          ) : (
            <div className="pt-3 space-y-3">
              {kidsHere.map((k) => (
                <div key={k.id} className="flex items-center gap-3">
                  <Avatar name={k.name} size={32} />
                  <div className="text-sm font-medium">{k.name}</div>
                </div>
              ))}
              <div className="text-sm text-muted-foreground">
                {Math.max(g.studentIds.length - kidsHere.length, 0)} classmate
                {g.studentIds.length - kidsHere.length === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </Section>
      )}

      {editable && (
        <AddLearningDialog
          open={add.open}
          onOpenChange={add.setOpen}
          groups={[g]}
          defaultGroupId={g.id}
          learners={L.learners}
        />
      )}
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-3 min-w-0">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate" title={value}>
          {value}
        </div>
      </div>
    </div>
  );
}

function GroupOverview({ g, items }: { g: TeachingGroup; items: LearningItem[] }) {
  const timed = items.filter((i) => i.kind === "Lesson" || i.kind === "Live class");
  const upcoming = timed.filter((i) => (i.date ?? "") >= DEMO_TODAY).sort(byWhen);
  const recent = items
    .filter((i) => (i.kind === "Lesson" || i.kind === "Recording") && (i.date ?? "") < DEMO_TODAY)
    .sort(byWhen)
    .reverse()
    .slice(0, 4);
  const todo = items
    .filter((i) => i.kind === "Quiz" || i.kind === "Activity")
    .sort((a, b) => (a.due ?? a.date ?? "").localeCompare(b.due ?? b.date ?? ""));
  const unit = upcoming.find((i) => i.kind === "Lesson")?.topic ?? items[0]?.topic;
  const young = g.band === "primary";

  return (
    <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="lg:col-span-2 space-y-4">
        {unit && (
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {young ? "This week we are learning" : "Current topic"}
            </div>
            <div className="text-lg font-semibold mt-0.5">{unit}</div>
            <div className="text-xs text-muted-foreground mt-1">{bandLabel(g.band)}</div>
          </div>
        )}
        <Section title={young ? "Coming up in class" : "Upcoming lessons and live classes"}>
          <div className="divide-y -my-2">
            {upcoming.map((it) => (
              <ItemRow key={it.id} item={it} group={g} />
            ))}
            {!upcoming.length && (
              <div className="py-2 text-sm text-muted-foreground">Nothing scheduled yet.</div>
            )}
          </div>
        </Section>
        {recent.length > 0 && (
          <Section title={young ? "Last few lessons" : "Recent lessons and recordings"}>
            <div className="divide-y -my-2">
              {recent.map((it) => (
                <ItemRow key={it.id} item={it} group={g} />
              ))}
            </div>
          </Section>
        )}
      </div>
      <Section
        title={
          young
            ? "Home learning and practice"
            : g.band === "higher-ed"
              ? "Coursework and quizzes"
              : g.band === "vocational"
                ? "Tasks and knowledge checks"
                : "Homework and quizzes"
        }
      >
        <div className="divide-y -my-2">
          {todo.map((it) => (
            <ItemRow key={it.id} item={it} group={g} />
          ))}
          {!todo.length && <div className="py-2 text-sm text-muted-foreground">All done.</div>}
        </div>
      </Section>
    </div>
  );
}

function JournalOverview({
  g,
  items,
  L,
}: {
  g: TeachingGroup;
  items: LearningItem[];
  L: PackLearning;
}) {
  const nameOf = (id?: string) => L.learners.find((l) => l.id === id)?.name ?? "";
  const observations = items
    .filter((i) => i.kind === "Observation")
    .sort(byWhen)
    .reverse();
  const activities = items
    .filter((i) => i.kind === "Activity")
    .sort(byWhen)
    .reverse();
  const multi = new Set(observations.map((o) => o.studentId)).size > 1;

  return (
    <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
      <Section
        className="lg:col-span-2"
        title={
          <span className="inline-flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-pink-500" />
            Observations
          </span>
        }
        description="Moments your key worker noticed, shared with the family."
      >
        <div className="divide-y -my-2">
          {observations.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              group={g}
              childName={multi ? nameOf(it.studentId) : undefined}
            />
          ))}
          {!observations.length && (
            <div className="py-2 text-sm text-muted-foreground">No observations yet.</div>
          )}
        </div>
      </Section>
      <Section title="What we did this week" description="Play-based activities for the group.">
        <div className="divide-y -my-2">
          {activities.map((it) => (
            <ItemRow key={it.id} item={it} group={g} />
          ))}
        </div>
      </Section>
    </div>
  );
}
