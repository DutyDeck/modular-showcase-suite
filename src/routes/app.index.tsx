import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatCard, Section, Badge } from "@/components/ui-kit";
import { AreaTrend, BarTrend } from "@/components/Charts";
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  GraduationCap,
  Wallet,
  CalendarCheck,
  Award,
  Sparkles,
  AlertTriangle,
  Building2,
  UserCheck,
  ShieldCheck,
  CreditCard,
  Star,
  ChevronRight,
  Waves,
  MapPin,
  Clock,
} from "lucide-react";
import {
  notifications,
  attendanceTrend,
  revenueTrend,
  grades,
  aiInsights,
  teacherClasses,
  children,
  getEnrollments,
  ageOn,
  teacherByName,
  isSwimCoach,
  isSwimAdmin,
  sessionsForCoach,
  sessionsByCourse,
  effectiveCoachNames,
  effectiveSwimmerIds,
  swimCourses,
  swimCourseById,
  effectiveCapacity,
  brandingKey,
  poolById,
  SWIM_COURSE_ID,
  awardById,
  type PoolSession,
} from "@/lib/mockData";
import { useCollection } from "@/lib/store";
import { useEnabledModules } from "@/lib/modules";
import { computeAppraisal } from "@/lib/appraisal";
import { Stars } from "@/components/StarRating";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — 1StudentID" }] }),
  component: Dashboard,
});

function firstName(fullName: string): string {
  const titles = new Set(["dr.", "dr", "mr.", "mr", "mrs.", "mrs", "ms.", "ms", "prof.", "prof"]);
  const parts = fullName.trim().split(/\s+/);
  const meaningful = parts.filter((p) => !titles.has(p.toLowerCase()));
  return meaningful[0] ?? parts[0] ?? "";
}

function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6" data-tour="dashboard">
      <div className="rounded-2xl bg-gradient-hero text-white p-6 md:p-8 shadow-elegant relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 80% 10%, white 0%, transparent 35%)",
          }}
        />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider opacity-80">{user.institution}</div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">
            Welcome back, {firstName(user.name)} 👋
          </h1>
          <p className="text-sm opacity-85 mt-1 max-w-xl">
            Here's what's happening across your{" "}
            {user.role === "admin"
              ? user.adminScope === "institute"
                ? "institute"
                : "platform"
              : "workspace"}{" "}
            today.
          </p>
        </div>
      </div>

      {isSwimAdmin(user) ? (
        <SwimAdminDash />
      ) : (
        <>
          {user.role === "student" && <StudentDash />}
          {user.role === "parent" && <ParentDash />}
          {user.role === "teacher" && <TeacherDash />}
          {user.role === "admin" && <AdminDash />}
        </>
      )}
    </div>
  );
}

function SwimAdminDash() {
  const attendance = useCollection("sessionAttendance");
  const incidents = useCollection("incidents");
  const rosters = useCollection("sessionRosters");
  const coachMoves = useCollection("coachMoves");
  const moves = useCollection("swimmerMoves");
  const coachAtt = useCollection("coachAttendance");
  const club = swimCourses[0];
  const sessions = sessionsByCourse(SWIM_COURSE_ID);
  const today = TEACHER_TODAY;
  const todayKey = new Date().toISOString().slice(0, 10);

  const todaySessions = sessions
    .filter((s) => s.day === today)
    .sort((a, b) => a.start.localeCompare(b.start));
  // Today's sessions, or the next training day if today has none.
  const nextPool = upcomingSessionDay(sessions);
  const todayIds = new Set(todaySessions.map((s) => s.id));
  const swimmerCount = new Set(sessions.flatMap((s) => s.swimmerIds)).size;
  const openIncidents = incidents.filter((i) => i.status === "Open");
  const presentToday = attendance.filter(
    (a) => a.status !== "Absent" && a.at.slice(0, 10) === todayKey && todayIds.has(a.sessionId),
  ).length;
  const recentCover = coachAtt
    .filter((c) => c.replacedByName)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 4);

  // ── Capacity planning ──────────────────────────────────────────────────────
  // Seat fill and staffing per session so the admin can spot under-filled (and
  // therefore loss-making) classes and consolidate swimmers.
  const capacity = sessions.map((s) => {
    const filled = effectiveSwimmerIds(s, moves).length;
    const coaches = effectiveCoachNames(s.id, rosters, coachMoves).length;
    const planned = s.coachNames.length || 1;
    const pct = s.capacity ? Math.round((filled / s.capacity) * 100) : 0;
    const status = pct >= 100 ? "full" : pct >= 75 ? "healthy" : pct >= 50 ? "low" : "under";
    return { s, filled, coaches, planned, pct, status, seatsLeft: s.capacity - filled };
  });
  const totalSeats = capacity.reduce((a, c) => a + c.s.capacity, 0);
  const totalFilled = capacity.reduce((a, c) => a + c.filled, 0);
  const overallPct = totalSeats ? Math.round((totalFilled / totalSeats) * 100) : 0;
  const underfilled = capacity
    .filter((c) => c.status === "under" || c.status === "low")
    .sort((a, b) => a.pct - b.pct);
  // Suggest a same-level session with spare seats to consolidate an under-filled
  // group into.
  const suggestFor = (c: (typeof capacity)[number]) => {
    const target = capacity
      .filter(
        (t) =>
          t.s.id !== c.s.id &&
          t.s.level === c.s.level &&
          t.seatsLeft >= c.filled &&
          t.filled >= c.filled,
      )
      .sort((a, b) => b.filled - a.filled)[0];
    return target?.s ?? null;
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Weekly sessions"
          value={sessions.length}
          hint={`${todaySessions.length} today · ${today}`}
          icon={<Waves className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Swimmers"
          value={swimmerCount}
          icon={<Users className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Coaches"
          value={club.coachNames.length}
          hint="on the roster"
          icon={<GraduationCap className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Open incidents"
          value={openIncidents.length}
          hint="need follow-up"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={openIncidents.length > 0 ? "destructive" : "warning"}
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Link to="/app/coaching">
          <QuickCard
            icon={<Users className="h-5 w-5" />}
            title="Coaches & Sessions"
            desc="Cover absences · swap coaches"
          />
        </Link>
        <Link to="/app/swim-reports">
          <QuickCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Summary Reports"
            desc="Daily · weekly · monthly · yearly"
          />
        </Link>
        <Link to="/app/srb">
          <QuickCard
            icon={<Star className="h-5 w-5" />}
            title="Record Books"
            desc="Swimmer notes & ratings"
          />
        </Link>
      </div>

      {/* Capacity planning */}
      <Section
        title="Capacity planning"
        description="Seat fill and staffing across the week. Consolidate under-filled sessions so classes run at a healthy, profitable size."
        actions={
          <span className="text-sm">
            <span className="font-bold">{overallPct}%</span>{" "}
            <span className="text-muted-foreground">
              overall · {totalFilled}/{totalSeats} seats
            </span>
          </span>
        }
      >
        {underfilled.length > 0 && (
          <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-foreground mt-0.5 shrink-0" />
            <span>
              <b>{underfilled.length}</b> session(s) are under-filled. Moving swimmers from a
              near-empty class into another keeps groups viable — open a session to move swimmers,
              or use Coaches &amp; Sessions to rebalance staffing.
            </span>
          </div>
        )}
        <ul className="divide-y -mx-4 sm:-mx-5" data-tour="capacity-planning">
          {capacity
            .slice()
            .sort((a, b) => a.pct - b.pct)
            .map(({ s, filled, coaches, planned, pct, status, seatsLeft }) => {
              const tone =
                status === "under"
                  ? "bg-destructive"
                  : status === "low"
                    ? "bg-warning"
                    : status === "full"
                      ? "bg-primary"
                      : "bg-success";
              const suggest =
                status === "under" || status === "low"
                  ? suggestFor({ s, filled, coaches, planned, pct, status, seatsLeft })
                  : null;
              return (
                <li key={s.id} className="px-4 sm:px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to="/app/sessions/$sessionId"
                          params={{ sessionId: s.id }}
                          className="text-sm font-medium hover:text-primary hover:underline truncate"
                        >
                          {s.title}
                        </Link>
                        <span className="text-[11px] text-muted-foreground">
                          {s.day} {s.start}
                        </span>
                        {status === "under" && <Badge tone="destructive">Under-filled</Badge>}
                        {status === "low" && <Badge tone="warning">Low</Badge>}
                        {status === "full" && <Badge tone="info">Full</Badge>}
                        {coaches < planned && <Badge tone="warning">Understaffed</Badge>}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="h-2 flex-1 max-w-[220px] rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${tone}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {filled}/{s.capacity} seats · {coaches}/{planned} coach
                          {planned > 1 ? "es" : ""}
                        </span>
                      </div>
                      {suggest && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Suggestion: move these {filled} swimmer{filled === 1 ? "" : "s"} into{" "}
                          <Link
                            to="/app/sessions/$sessionId"
                            params={{ sessionId: s.id }}
                            className="text-primary font-medium hover:underline"
                          >
                            {suggest.title}
                          </Link>{" "}
                          (has {suggest.capacity - effectiveSwimmerIds(suggest, moves).length} free
                          seats).
                        </div>
                      )}
                    </div>
                    <span className="text-lg font-bold tabular-nums shrink-0">{pct}%</span>
                  </div>
                </li>
              );
            })}
        </ul>
      </Section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Section
          title={
            nextPool.isToday ? `Today's pool · ${nextPool.day}` : `Next sessions · ${nextPool.day}`
          }
          description={
            nextPool.isToday
              ? "Sessions running today across the club. Tap to open a session."
              : "No sessions today — here is the club's next training day."
          }
          className="lg:col-span-2"
          actions={
            <Link
              to="/app/courses/$courseId"
              params={{ courseId: SWIM_COURSE_ID }}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/15"
            >
              <Waves className="h-3.5 w-3.5" />
              Open club
            </Link>
          }
        >
          {nextPool.sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No sessions in the timetable yet. Open the club to set one up.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {nextPool.sessions.map((s) => {
                const pool = poolById[s.poolId];
                const roster = effectiveCoachNames(s.id, rosters, coachMoves);
                const present = attendance.filter(
                  (a) =>
                    a.sessionId === s.id && a.status !== "Absent" && a.at.slice(0, 10) === todayKey,
                ).length;
                return (
                  <li key={s.id}>
                    <Link
                      to="/app/sessions/$sessionId"
                      params={{ sessionId: s.id }}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                    >
                      <div className="text-center shrink-0 w-14">
                        <div className="text-xs font-semibold">{s.start}</div>
                        <div className="text-[10px] text-muted-foreground">{s.end}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{s.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {pool?.name} · {roster.map((n) => n.replace("Coach ", "")).join(", ")}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 shrink-0">
                        <Users className="h-3 w-3" />
                        {nextPool.isToday
                          ? `${present}/${s.swimmerIds.length}`
                          : s.swimmerIds.length}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <div className="space-y-6">
          <Section title="Open incidents" description="Awaiting follow-up.">
            {openIncidents.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No open incidents — a clean record.
              </div>
            ) : (
              <ul className="space-y-2">
                {openIncidents.slice(0, 4).map((i) => (
                  <li key={i.id} className="p-2.5 rounded-lg border bg-card">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        tone={
                          i.severity === "High"
                            ? "destructive"
                            : i.severity === "Medium"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {i.severity}
                      </Badge>
                      <span className="text-xs font-medium">{i.title}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{i.coachName}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recent coach cover" description="Substitutions logged.">
            {recentCover.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No recent substitutions.
              </div>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentCover.map((c) => (
                  <li key={c.id} className="p-2.5 rounded-lg bg-muted/40">
                    <div className="font-medium">
                      {c.coachName.replace("Coach ", "")} →{" "}
                      {c.replacedByName?.replace("Coach ", "")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{c.reason}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground text-center">
        {presentToday} swimmers marked present today across {todaySessions.length} sessions.
      </div>
    </>
  );
}

function QuickCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 h-full hover:border-primary/50 hover:shadow-soft transition-all flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
    </div>
  );
}

function AutonomyBanner() {
  const { user } = useAuth();
  if (!user?.dob) return null;
  const age = ageOn(user.dob);
  const adult = !!user.selfManaged;

  if (adult) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-success/15 text-success flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">Self-managed account</span>
              <Badge tone="success">{age} yrs · 18+</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              You manage your own enrolment, payments and course selection — no guardian approval
              needed.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/app/courses">
            <QuickAction icon={<BookOpen className="h-3.5 w-3.5" />} label="Courses" />
          </Link>
          <Link to="/app/finance">
            <QuickAction icon={<Wallet className="h-3.5 w-3.5" />} label="Pay fees" />
          </Link>
          <Link to="/app/marketplace">
            <QuickAction icon={<CreditCard className="h-3.5 w-3.5" />} label="Enrol" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-warning/20 text-warning-foreground flex items-center justify-center shrink-0">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">Guardian-linked account</span>
          <Badge tone="warning">{age} yrs · minor</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Enrolment, payments and course-selection requests are approved by{" "}
          <b>{user.guardianName ?? "your guardian"}</b>. You turn 18 and become self-managed
          automatically.
        </p>
      </div>
    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md bg-card border px-2.5 py-1.5 hover:border-primary hover:text-primary transition-colors">
      {icon}
      {label}
    </span>
  );
}

/** Swim awards + certificates surfaced on the student / parent dashboard. Shows
 * certified awards (with a printable certificate link) and in-progress ones. */
function AwardsDashCard({ studentIds }: { studentIds: string[] }) {
  const progress = useCollection("awardProgress");
  const awards = useCollection("swimAwards");
  const ids = new Set(studentIds.filter(Boolean));
  const rows = progress
    .filter((p) => ids.has(p.studentId))
    .sort((a, b) => {
      // Certified first, then most-recently updated.
      if (!!a.certifiedAt !== !!b.certifiedAt) return a.certifiedAt ? -1 : 1;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
  if (rows.length === 0) return null;
  const multi = studentIds.length > 1;
  const awardFor = (id: string) => awardById[id] ?? awards.find((a) => a.id === id);

  return (
    <Section
      title="Swim awards & certificates"
      description="Awards earned and progress in the club's swim pathway."
    >
      <ul className="space-y-2.5" data-tour="awards-dash">
        {rows.map((r) => {
          const award = awardFor(r.awardId);
          if (!award) return null;
          const total = award.activities.length;
          const done = r.done.length;
          const pct = Math.round((done / total) * 100);
          const certified = !!r.certifiedAt;
          return (
            <li key={r.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      certified ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{award.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {multi ? `${r.studentName.split(" ")[0]} · ` : ""}
                      {award.strand}
                    </div>
                  </div>
                </div>
                {certified ? (
                  <Link
                    to="/app/certificate/$progressId"
                    params={{ progressId: r.id }}
                    className="text-xs font-medium text-emerald-600 inline-flex items-center gap-1 hover:underline shrink-0"
                  >
                    <Award className="h-3.5 w-3.5" />
                    Certificate
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {done}/{total}
                  </span>
                )}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${certified ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function StudentDash() {
  const { user } = useAuth();
  const assignments = useCollection("assignments");
  const invoices = useCollection("invoices");
  const pending = assignments.filter((a) => a.status === "Pending").length;
  const due = invoices.find((i) => i.status === "Due");
  return (
    <>
      {user?.dob && <AutonomyBanner />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current GPA"
          value="3.8"
          hint="Top 12% of cohort"
          icon={<Award className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Attendance"
          value="94%"
          hint="This semester"
          icon={<CalendarCheck className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Pending Tasks"
          value={pending}
          hint="3 due this week"
          icon={<BookOpen className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Outstanding"
          value={`$${due?.amount ?? 0}`}
          hint="Due Jun 1"
          icon={<Wallet className="h-5 w-5" />}
          accent="info"
        />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Upcoming Assignments" className="lg:col-span-2">
          <ul className="divide-y -my-2">
            {assignments.slice(0, 4).map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.course} · Due {a.due}
                  </div>
                </div>
                <Badge
                  tone={
                    a.status === "Pending" ? "warning" : a.status === "Graded" ? "success" : "info"
                  }
                >
                  {a.status}
                </Badge>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Notifications">
          <ul className="space-y-3">
            {notifications.map((n, i) => (
              <li key={i} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm">{n.text}</div>
                  <div className="text-[10px] text-muted-foreground">{n.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      {user?.oneEduId && <AwardsDashCard studentIds={[user.oneEduId]} />}

      <Section title="Grade Trend" description="Final scores per subject">
        <BarTrend
          data={grades.map((g) => ({ subject: g.course.split(" ")[0], score: g.final }))}
          xKey="subject"
          yKey="score"
        />
      </Section>
    </>
  );
}

function ParentDash() {
  const students = useCollection("students");
  const invoices = useCollection("invoices");
  // Headline: total institute relationships this parent manages through one login.
  const enrolmentsByChild = children.map((c) => {
    const s = students.find((x) => x.id === c.id);
    return { child: c, enrolments: s ? getEnrollments(s) : [] };
  });
  const totalInstitutes = enrolmentsByChild.reduce((n, x) => n + x.enrolments.length, 0);
  const childIds = new Set(children.map((c) => c.id));
  const totalDues = invoices
    .filter((i) => i.studentId && childIds.has(i.studentId))
    .filter((i) => i.status === "Due" || i.status === "Upcoming")
    .reduce((a, i) => a + i.amount, 0);
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Children Linked"
          value={children.length}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Institutes Unified"
          value={totalInstitutes}
          hint="One app · zero re-logins"
          icon={<Building2 className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Avg Attendance"
          value="95.5%"
          icon={<CalendarCheck className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Total Dues"
          value={`$${totalDues}`}
          hint="Across all institutes"
          icon={<Wallet className="h-5 w-5" />}
          accent="warning"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {enrolmentsByChild.map(({ child: c, enrolments }) => {
          const primary = enrolments.find((e) => e.primary) ?? enrolments[0];
          return (
            <Section
              key={c.id}
              title={c.name}
              description={primary ? `${c.grade} · ${primary.institution}` : c.grade}
            >
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{c.attendance}%</div>
                  <div className="text-[11px] text-muted-foreground">Attendance</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{c.gpa}</div>
                  <div className="text-[11px] text-muted-foreground">GPA</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">${c.duesUSD}</div>
                  <div className="text-[11px] text-muted-foreground">Dues</div>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Next class: <span className="text-foreground font-medium">{c.nextClass}</span>
              </div>
              {enrolments.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                    Enrolled at {enrolments.length} institute{enrolments.length === 1 ? "" : "s"}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {enrolments.map((e) => (
                      <span
                        key={`${e.institutionId}-${e.role}`}
                        className="inline-flex items-center gap-1 text-[11px] rounded-md border bg-muted/40 px-2 py-0.5"
                        title={`${e.role} · ${e.classLabel}${e.legacyId ? ` · Institute ID: ${e.legacyId}` : ""}`}
                      >
                        <Building2 className="h-2.5 w-2.5 text-muted-foreground" />
                        {e.institution}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          );
        })}
      </div>

      <AwardsDashCard studentIds={children.map((c) => c.id)} />
    </>
  );
}

const WEEK_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const TEACHER_TODAY = WEEK_ORDER[new Date().getDay()];

/**
 * Sessions for today — or, if today has none (the club runs Mon/Wed/Fri/Sat), the
 * next upcoming day that does. Keeps the dashboard useful every day of the week.
 */
function upcomingSessionDay(all: PoolSession[]): {
  day: string;
  sessions: PoolSession[];
  isToday: boolean;
} {
  const todayIdx = new Date().getDay();
  for (let i = 0; i < 7; i++) {
    const day = WEEK_ORDER[(todayIdx + i) % 7];
    const daySessions = all
      .filter((s) => s.day === day)
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start));
    if (daySessions.length) return { day, sessions: daySessions, isToday: i === 0 };
  }
  return { day: WEEK_ORDER[todayIdx], sessions: [], isToday: true };
}

function TeacherDash() {
  const { user } = useAuth();
  const enabled = useEnabledModules(user?.institution ?? "");
  const ratings = useCollection("teacherRatings");
  const me = user ? teacherByName[user.name] : undefined;
  const myAppraisal = me ? computeAppraisal(me, ratings) : null;
  const recentReviews = me
    ? ratings
        .filter((r) => r.teacherId === me.id)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 2)
    : [];

  // Swim coaches get an aquatics-specific dashboard — their classes are pool
  // sessions, not the generic physics roster.
  const swimCoach = user ? isSwimCoach(user.name) : false;
  const mySwimSessions = swimCoach && user ? sessionsForCoach(user.name) : [];
  const todaySwim = mySwimSessions.filter((s) => s.day === TEACHER_TODAY);
  // Today's sessions, or the coach's next training day if today has none.
  const nextSwimPool = upcomingSessionDay(mySwimSessions);
  const swimSwimmerCount = new Set(mySwimSessions.flatMap((s) => s.swimmerIds)).size;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {swimCoach ? (
          <>
            <StatCard
              label="My Sessions"
              value={mySwimSessions.length}
              hint="this week"
              icon={<Waves className="h-5 w-5" />}
              accent="primary"
            />
            <StatCard
              label="Swimmers"
              value={swimSwimmerCount}
              icon={<Users className="h-5 w-5" />}
              accent="info"
            />
            <StatCard
              label="Today"
              value={todaySwim.length}
              hint={`${TEACHER_TODAY} sessions`}
              icon={<Clock className="h-5 w-5" />}
              accent="warning"
            />
            <StatCard
              label="Pools"
              value={2}
              hint="Olympic + Training"
              icon={<MapPin className="h-5 w-5" />}
              accent="success"
            />
          </>
        ) : (
          <>
            <StatCard
              label="Classes"
              value={teacherClasses.length}
              icon={<GraduationCap className="h-5 w-5" />}
              accent="primary"
            />
            <StatCard
              label="Students"
              value={teacherClasses.reduce((a, c) => a + c.students, 0)}
              icon={<Users className="h-5 w-5" />}
              accent="info"
            />
            <StatCard
              label="To Grade"
              value="23"
              hint="Quizzes & essays"
              icon={<BookOpen className="h-5 w-5" />}
              accent="warning"
            />
            <StatCard
              label="At-Risk Students"
              value="4"
              hint="AI flagged"
              icon={<AlertTriangle className="h-5 w-5" />}
              accent="destructive"
            />
          </>
        )}
      </div>

      {enabled.has("appraisal") && me && myAppraisal && (
        <Section
          title="My Appraisal"
          description="How families and student outcomes rate your teaching."
        >
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex items-center gap-4 sm:border-r sm:pr-6">
              <div className="text-center">
                <div className="text-4xl font-bold leading-none">
                  {myAppraisal.blended.toFixed(1)}
                </div>
                <div className="mt-1.5">
                  <Stars value={myAppraisal.blended} size={15} />
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {myAppraisal.ratingCount} review{myAppraisal.ratingCount === 1 ? "" : "s"}
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {recentReviews.length > 0 ? (
                <ul className="space-y-2.5">
                  {recentReviews.map((r) => (
                    <li key={r.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Stars value={r.stars} size={12} />
                        <span className="text-xs font-medium">{r.authorName}</span>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          "{r.comment}"
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No written reviews yet.</p>
              )}
              <Link
                to="/app/appraisals/$teacherId"
                params={{ teacherId: me.id }}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Star className="h-3.5 w-3.5" />
                View full appraisal
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Section>
      )}
      {swimCoach ? (
        <Section
          title={
            nextSwimPool.isToday
              ? `Today · ${nextSwimPool.day}`
              : `Next sessions · ${nextSwimPool.day}`
          }
          description={
            nextSwimPool.isToday
              ? "Your pool sessions for today. Tap one to mark attendance and post notes."
              : "No sessions today — here are your next sessions. Tap one to open it."
          }
          actions={
            <Link
              to="/app/courses/$courseId"
              params={{ courseId: SWIM_COURSE_ID }}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/15"
            >
              <Waves className="h-3.5 w-3.5" />
              Open club
            </Link>
          }
        >
          {nextSwimPool.sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No sessions in your timetable yet. Open the club to see the full week.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {nextSwimPool.sessions.map((s) => {
                const pool = poolById[s.poolId];
                return (
                  <li key={s.id}>
                    <Link
                      to="/app/sessions/$sessionId"
                      params={{ sessionId: s.id }}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                    >
                      <div className="text-center shrink-0 w-14">
                        <div className="text-xs font-semibold">{s.start}</div>
                        <div className="text-[10px] text-muted-foreground">{s.end}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{s.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {pool?.name} · lanes {s.laneFrom}–{s.laneTo} · {s.swimmerIds.length}{" "}
                          swimmers
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <Section title="Today's Schedule" className="lg:col-span-2">
            <ul className="space-y-3">
              {teacherClasses.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                >
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.batch} · {c.students} students · {c.room}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium">{c.nextSession}</div>
                    <button className="mt-1 text-[11px] px-2 py-1 rounded-md bg-primary text-primary-foreground">
                      Start class
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="AI Suggestions">
            <ul className="space-y-3 text-sm">
              {aiInsights.slice(0, 3).map((a, i) => (
                <li key={i} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium text-xs">{a.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </>
  );
}

function AdminDash() {
  const { user } = useAuth();
  // Institute-scoped admins (e.g. a college principal) see a single-tenant
  // dashboard. The global super-admin (Isla) sees the platform-wide one.
  if (user?.adminScope === "institute") return <InstituteAdminDash />;
  return <GlobalAdminDash />;
}

function GlobalAdminDash() {
  const tenants = useCollection("tenants");
  const leads = useCollection("leads");
  const students = useCollection("students");
  const { formatMoney } = usePrefs();
  const totalStudents = tenants.reduce((a, t) => a + t.students, 0);
  const mrr = tenants.reduce((a, t) => a + t.mrr, 0);
  return (
    <>
      <div className="rounded-lg border bg-card px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>
          <span className="font-semibold text-foreground">Global admin view</span> · cross-tenant
          revenue, growth and risk signals across every institute on 1StudentID.
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Active Tenants"
          value={tenants.length}
          hint="+2 this month"
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Total Students"
          value={totalStudents.toLocaleString()}
          icon={<GraduationCap className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="MRR"
          value={formatMoney(mrr)}
          hint="+12% vs last month"
          icon={<DollarSign className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Open Leads"
          value={leads.length}
          hint="Across all tenants"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="warning"
        />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Section title="Revenue (last 6 months)" description="MRR in $K">
          <AreaTrend
            data={revenueTrend.map((r) => ({ m: r.m, v: r.v }))}
            xKey="m"
            yKey="v"
            yFormatter={(v) => `$${v}K`}
          />
        </Section>
        <Section title="Attendance Trend" description="Weekly average %">
          <AreaTrend
            data={attendanceTrend.map((r) => ({ w: r.week, rate: r.rate }))}
            xKey="w"
            yKey="rate"
            yFormatter={(v) => `${v}%`}
          />
        </Section>
      </div>
      <Section title="At-Risk Students (AI prediction)" description="Cross-tenant signals">
        <ul className="space-y-2">
          {students
            .filter((s) => s.risk !== "low")
            .map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
              >
                <div>
                  <div className="font-medium text-sm">
                    {s.name} <span className="text-muted-foreground text-xs">· {s.grade}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Attendance {s.attendance}% · GPA {s.gpa}
                  </div>
                </div>
                <Badge tone={s.risk === "high" ? "destructive" : "warning"}>
                  {s.risk.toUpperCase()} RISK
                </Badge>
              </li>
            ))}
        </ul>
      </Section>
    </>
  );
}

function InstituteAdminDash() {
  const { user } = useAuth();
  const students = useCollection("students");
  const invoices = useCollection("invoices");
  const tenants = useCollection("tenants");
  const srb = useCollection("srb");
  const courses = useCollection("courses");
  const capacityOverrides = useCollection("capacityOverrides");
  const brandings = useCollection("institutionBrandings");
  const { formatMoney } = usePrefs();

  const branding = brandings.find((b) => b.institution === brandingKey(user));

  const tenantId = user?.institutionId ?? "";
  const tenant = tenants.find((t) => t.id === tenantId);
  const instName = user?.institutionName ?? tenant?.name ?? "your institute";

  // ── Class capacity planning ────────────────────────────────────────────────
  // Seat fill per class (all the institute's academic courses — swim programmes
  // plan capacity per pool session in the club view) so the admin can spot
  // under-filled (loss-making) or over-subscribed classes at a glance.
  const capacity = courses
    .filter((c) => !swimCourseById[c.id])
    .map((c) => {
      const cap = effectiveCapacity(c.id, c.students, capacityOverrides);
      const filled = c.students;
      const pct = cap ? Math.round((filled / cap) * 100) : 0;
      const status =
        pct >= 100 ? "full" : pct >= 75 ? "healthy" : pct >= 50 ? "low" : ("under" as const);
      return { c, cap, filled, pct, status, seatsLeft: Math.max(cap - filled, 0) };
    })
    .sort((a, b) => a.pct - b.pct);
  const totalSeats = capacity.reduce((a, x) => a + x.cap, 0);
  const totalFilled = capacity.reduce((a, x) => a + x.filled, 0);
  const overallPct = totalSeats ? Math.round((totalFilled / totalSeats) * 100) : 0;
  const underfilled = capacity.filter((x) => x.status === "under" || x.status === "low");

  // Filter the global collections to JUST this institute. We treat the
  // "institutionId" tag on invoices/SRB as authoritative, and use enrollments
  // to identify which students are on the roster here.
  const studentsHere = students.filter((s) =>
    getEnrollments(s).some((e) => e.institutionId === tenantId),
  );
  const invoicesHere = invoices.filter((i) => i.institutionId === tenantId);
  const srbHere = srb.filter((e) => e.institutionId === tenantId);
  const dueHere = invoicesHere
    .filter((i) => i.status === "Due" || i.status === "Upcoming")
    .reduce((a, i) => a + i.amount, 0);
  const collectedHere = invoicesHere
    .filter((i) => i.status === "Paid")
    .reduce((a, i) => a + i.amount, 0);
  const atRiskHere = studentsHere.filter((s) => s.risk !== "low").length;
  const needsAckHere = srbHere.filter((e) => e.requiresAck && !e.ackAt).length;

  return (
    <>
      <div className="rounded-lg border bg-warning/10 border-warning/30 px-4 py-2.5 text-xs flex items-center gap-2">
        <Building2 className="h-3.5 w-3.5 text-warning-foreground" />
        <span>
          <span className="font-semibold">Institute admin view</span> · scoped to{" "}
          <span className="font-semibold">{instName}</span> only. Cross-tenant data, billing and
          platform-wide configuration are managed by the global admin.
        </span>
      </div>

      {branding && (branding.vision || branding.mission || branding.description) && (
        <Section
          title={`About ${branding.name}`}
          description={branding.tagline}
          actions={
            <Link
              to="/app/branding"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/15"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Edit branding
            </Link>
          }
        >
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Vision", text: branding.vision },
              { label: "Mission", text: branding.mission },
              { label: "About", text: branding.description },
            ]
              .filter((x) => x.text)
              .map((x) => (
                <div key={x.label} className="rounded-xl border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {x.label}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{x.text}</p>
                </div>
              ))}
          </div>
        </Section>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Students on roster"
          value={studentsHere.length}
          hint={`at ${instName}`}
          icon={<GraduationCap className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Outstanding fees"
          value={formatMoney(dueHere)}
          hint={`${invoicesHere.filter((i) => i.status !== "Paid").length} open invoices`}
          icon={<Wallet className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Collected this term"
          value={formatMoney(collectedHere)}
          icon={<DollarSign className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="At-risk students"
          value={atRiskHere}
          hint="AI flagged"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="destructive"
        />
      </div>

      {/* Class capacity planning — seat fill across all of the institute's classes */}
      {capacity.length > 0 && (
        <Section
          title="Class capacity planning"
          description="Seat fill across your classes. Spot under-filled classes to combine sections or boost enrolment, and over-subscribed ones to open another section."
          actions={
            <span className="text-sm">
              <span className="font-bold">{overallPct}%</span>{" "}
              <span className="text-muted-foreground">
                overall · {totalFilled}/{totalSeats} seats
              </span>
            </span>
          }
        >
          {underfilled.length > 0 && (
            <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning-foreground mt-0.5 shrink-0" />
              <span>
                <b>{underfilled.length}</b> class(es) are below target. Under-filled classes are
                costly to run — combine small sections, reschedule, or promote enrolment to keep
                them viable.
              </span>
            </div>
          )}
          <ul className="divide-y -mx-4 sm:-mx-5" data-tour="institute-capacity-planning">
            {capacity.map(({ c, cap, filled, pct, status, seatsLeft }) => {
              const tone =
                status === "under"
                  ? "bg-destructive"
                  : status === "low"
                    ? "bg-warning"
                    : status === "full"
                      ? "bg-primary"
                      : "bg-success";
              return (
                <li key={c.id} className="px-4 sm:px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to="/app/courses/$courseId"
                          params={{ courseId: c.id }}
                          className="text-sm font-medium hover:text-primary hover:underline truncate"
                        >
                          {c.title}
                        </Link>
                        <span className="text-[11px] text-muted-foreground">
                          {c.code} · {c.category}
                        </span>
                        {status === "under" && <Badge tone="destructive">Under-filled</Badge>}
                        {status === "low" && <Badge tone="warning">Low</Badge>}
                        {status === "full" && <Badge tone="info">Full</Badge>}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="h-2 flex-1 max-w-[220px] rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${tone}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {filled}/{cap} seats
                          {status !== "full" ? ` · ${seatsLeft} free` : " · full"}
                        </span>
                      </div>
                    </div>
                    <span className="text-lg font-bold tabular-nums shrink-0">{pct}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Section
          title="Recent record-book activity"
          description={`${needsAckHere} entr${needsAckHere === 1 ? "y" : "ies"} awaiting parent acknowledgement`}
        >
          <ul className="space-y-2">
            {srbHere
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((e) => (
                <li key={e.id} className="p-3 rounded-lg bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{e.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {e.studentName} · {e.authorName}
                      </div>
                    </div>
                    {e.requiresAck && !e.ackAt && <Badge tone="destructive">Needs ack</Badge>}
                  </div>
                </li>
              ))}
            {srbHere.length === 0 && (
              <li className="text-xs text-muted-foreground italic">No activity yet.</li>
            )}
          </ul>
        </Section>
        <Section title={`At-risk students at ${instName}`}>
          <ul className="space-y-2">
            {studentsHere
              .filter((s) => s.risk !== "low")
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {s.name} <span className="text-muted-foreground text-xs">· {s.grade}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Attendance {s.attendance}% · GPA {s.gpa}
                    </div>
                  </div>
                  <Badge tone={s.risk === "high" ? "destructive" : "warning"}>
                    {s.risk.toUpperCase()} RISK
                  </Badge>
                </li>
              ))}
            {atRiskHere === 0 && (
              <li className="text-xs text-muted-foreground italic">No flagged students.</li>
            )}
          </ul>
        </Section>
      </div>
    </>
  );
}
