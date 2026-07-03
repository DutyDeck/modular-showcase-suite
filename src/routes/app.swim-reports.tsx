import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Section, StatCard, Badge, Button } from "@/components/ui-kit";
import { BarTrend } from "@/components/Charts";
import { Stars } from "@/components/StarRating";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import {
  poolSessions,
  sessionById,
  sessionsForCoach,
  swimCourses,
  isSwimAdmin,
  isSwimUser,
  SWIM_COURSE_ID,
  type PoolSession,
} from "@/lib/mockData";
import {
  BarChart3,
  CalendarDays,
  Users,
  UserCheck,
  Waves,
  Star,
  AlertTriangle,
  NotebookPen,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/app/swim-reports")({
  head: () => ({ meta: [{ title: "Summary Reports — Swim Club" }] }),
  component: SwimReportsPage,
});

type Period = "day" | "week" | "month" | "year";

const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: "day", label: "Daily", days: 1 },
  { id: "week", label: "Weekly", days: 7 },
  { id: "month", label: "Monthly", days: 30 },
  { id: "year", label: "Yearly", days: 365 },
];

const dayKeyOf = (iso: string) => iso.slice(0, 10);
const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

function SwimReportsPage() {
  const { user } = useAuth();
  const attendance = useCollection("sessionAttendance");
  const coachAtt = useCollection("coachAttendance");
  const incidents = useCollection("incidents");
  const srb = useCollection("srb");
  const wellbeing = useCollection("wellbeingChecks");

  const [period, setPeriod] = useState<Period>("week");
  // How many periods back from the latest activity (0 = most recent).
  const [offset, setOffset] = useState(0);

  const admin = isSwimAdmin(user);
  const swim = isSwimUser(user);

  // Scope: admin → whole club; coach → only her own sessions & swimmers.
  const scopeSessions: PoolSession[] = useMemo(() => {
    if (admin) return poolSessions;
    if (user?.role === "teacher") return sessionsForCoach(user.name);
    return poolSessions;
  }, [admin, user]);

  const scopeSessionIds = useMemo(() => new Set(scopeSessions.map((s) => s.id)), [scopeSessions]);
  const scopeSwimmerIds = useMemo(
    () => new Set(scopeSessions.flatMap((s) => s.swimmerIds)),
    [scopeSessions],
  );

  // Anchor everything to the most recent in-scope activity so no period is empty.
  const anchor = useMemo(() => {
    const times = attendance
      .filter((a) => scopeSessionIds.has(a.sessionId))
      .map((a) => new Date(a.at).getTime());
    const latest = times.length ? Math.max(...times) : Date.now();
    return new Date(latest);
  }, [attendance, scopeSessionIds]);

  // Compute the [start, end] window for the selected period + offset. Month and
  // year snap to calendar boundaries (1st→last day of the month; Jan 1→Dec 31) so
  // a "Monthly" report is a true calendar month, not a rolling 30 days. Day and
  // week stay as rolling windows anchored to the latest activity.
  const range = useMemo(() => {
    const cfg = PERIODS.find((p) => p.id === period)!;
    if (period === "month") {
      const start = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1, 0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end, cfg };
    }
    if (period === "year") {
      const y = anchor.getFullYear() - offset;
      const start = new Date(y, 0, 1, 0, 0, 0, 0);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      return { start, end, cfg };
    }
    const end = new Date(anchor);
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - offset * cfg.days);
    const start = new Date(end);
    start.setDate(end.getDate() - (cfg.days - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end, cfg };
  }, [period, offset, anchor]);

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= range.start.getTime() && t <= range.end.getTime();
  };

  const rangeLabel =
    period === "day"
      ? fmtDate(range.start)
      : period === "month"
        ? range.start.toLocaleDateString(undefined, { month: "long", year: "numeric" })
        : period === "year"
          ? String(range.start.getFullYear())
          : `${fmtShort(range.start)} – ${fmtShort(range.end)}`;

  // ── Swimmer attendance ──────────────────────────────────────────────────
  const attRows = useMemo(
    () => attendance.filter((a) => scopeSessionIds.has(a.sessionId) && inRange(a.at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attendance, scopeSessionIds, range],
  );
  const attCounts = attRows.reduce(
    (acc, a) => {
      if (a.status === "Present") acc.present++;
      else if (a.status === "Late") acc.late++;
      else acc.absent++;
      return acc;
    },
    { present: 0, late: 0, absent: 0 },
  );
  const attTotal = attCounts.present + attCounts.late + attCounts.absent;
  const attendanceRate = attTotal
    ? Math.round(((attCounts.present + attCounts.late) / attTotal) * 100)
    : 0;

  // Session instances that actually ran (distinct session + day).
  const sessionInstances = useMemo(() => {
    const keys = new Set(attRows.map((a) => `${a.sessionId}|${dayKeyOf(a.at)}`));
    return keys;
  }, [attRows]);

  // Present-by-session for the chart.
  const bySession = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of attRows) {
      if (a.status === "Absent") continue;
      const title = sessionById[a.sessionId]?.title ?? a.sessionId;
      const short = title.replace(/ —.*/, "").slice(0, 16);
      map[short] = (map[short] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, present]) => ({ name, present }))
      .sort((a, b) => b.present - a.present)
      .slice(0, 8);
  }, [attRows]);

  // Capacity utilisation.
  const capacity = useMemo(() => {
    let cap = 0;
    for (const key of sessionInstances) {
      const sid = key.split("|")[0];
      cap += sessionById[sid]?.capacity ?? 0;
    }
    return cap ? Math.round(((attCounts.present + attCounts.late) / cap) * 100) : 0;
  }, [sessionInstances, attCounts.present, attCounts.late]);

  // ── Coach attendance ────────────────────────────────────────────────────
  const coachAbsRows = useMemo(
    () =>
      coachAtt.filter(
        (c) => scopeSessionIds.has(c.sessionId) && c.status === "Absent" && inRange(c.date),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coachAtt, scopeSessionIds, range],
  );
  const scheduledCoachSlots = useMemo(() => {
    let n = 0;
    for (const key of sessionInstances) {
      const sid = key.split("|")[0];
      n += sessionById[sid]?.coachNames.length ?? 0;
    }
    return n;
  }, [sessionInstances]);
  const coachAbsent = coachAbsRows.length;
  const coachSubs = coachAbsRows.filter((c) => c.replacedByName).length;
  const coachPresent = Math.max(scheduledCoachSlots - coachAbsent, 0);

  // ── Ratings (swimmers assessed) ─────────────────────────────────────────
  const ratedRows = useMemo(
    () =>
      srb.filter(
        (e) =>
          e.courseId === SWIM_COURSE_ID &&
          typeof e.rating === "number" &&
          scopeSwimmerIds.has(e.studentId) &&
          inRange(e.date),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [srb, scopeSwimmerIds, range],
  );
  const ratedSwimmers = new Set(ratedRows.map((e) => e.studentId)).size;
  const avgRating = ratedRows.length
    ? ratedRows.reduce((a, e) => a + (e.rating ?? 0), 0) / ratedRows.length
    : 0;

  // ── Record-book notes by type ───────────────────────────────────────────
  const noteRows = useMemo(
    () =>
      srb.filter(
        (e) => e.courseId === SWIM_COURSE_ID && scopeSwimmerIds.has(e.studentId) && inRange(e.date),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [srb, scopeSwimmerIds, range],
  );
  const notesByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of noteRows) map[e.type] = (map[e.type] ?? 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [noteRows]);

  // ── Incidents ───────────────────────────────────────────────────────────
  const incRows = useMemo(
    () =>
      incidents
        .filter(
          (i) =>
            (i.sessionId ? scopeSessionIds.has(i.sessionId) : true) &&
            i.courseId === SWIM_COURSE_ID &&
            inRange(i.at),
        )
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incidents, scopeSessionIds, range],
  );
  const incOpen = incRows.filter((i) => i.status === "Open").length;

  // ── Wellbeing check-ins ─────────────────────────────────────────────────
  const wbRows = useMemo(
    () =>
      wellbeing
        .filter((w) => scopeSwimmerIds.has(w.studentId) && inRange(w.at))
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wellbeing, scopeSwimmerIds, range],
  );
  const wbCounts = wbRows.reduce(
    (acc, w) => {
      if (w.flag === "Green") acc.green++;
      else if (w.flag === "Amber") acc.amber++;
      else acc.red++;
      return acc;
    },
    { green: 0, amber: 0, red: 0 },
  );
  const wbFollowUps = wbRows.filter((w) => w.flag !== "Green");

  // ── Monthly evaluation (admin + Monthly only) ───────────────────────────────
  // A detailed roll-up for month-end review & HR: every swimmer's attendance and
  // every coach's activity/reliability for the calendar month.
  const monthlyEval = useMemo(() => {
    if (!admin || period !== "month") return null;

    // Per-swimmer attendance across the month.
    const perSwimmer = new Map<
      string,
      { id: string; name: string; present: number; late: number; absent: number }
    >();
    for (const a of attRows) {
      const e = perSwimmer.get(a.studentId) ?? {
        id: a.studentId,
        name: a.studentName,
        present: 0,
        late: 0,
        absent: 0,
      };
      if (a.status === "Present") e.present++;
      else if (a.status === "Late") e.late++;
      else e.absent++;
      if (a.studentName) e.name = a.studentName;
      perSwimmer.set(a.studentId, e);
    }
    const swimmers = Array.from(perSwimmer.values())
      .map((e) => {
        const total = e.present + e.late + e.absent;
        return { ...e, total, rate: total ? Math.round(((e.present + e.late) / total) * 100) : 0 };
      })
      .sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name));

    // Per-coach activity & reliability for HR.
    const coaches = swimCourses[0].coachNames
      .map((coach) => {
        let scheduled = 0;
        for (const key of sessionInstances) {
          const sid = key.split("|")[0];
          if (sessionById[sid]?.coachNames.includes(coach)) scheduled++;
        }
        const absent = coachAbsRows.filter((c) => c.coachName === coach).length;
        const covered = coachAbsRows.filter((c) => c.replacedByName === coach).length;
        const led = Math.max(scheduled - absent, 0) + covered;
        const coachRated = ratedRows.filter((e) => e.authorName === coach);
        const avg = coachRated.length
          ? coachRated.reduce((a, e) => a + (e.rating ?? 0), 0) / coachRated.length
          : 0;
        return {
          coach,
          scheduled,
          absent,
          covered,
          led,
          notes: noteRows.filter((e) => e.authorName === coach).length,
          rated: coachRated.length,
          avg,
          incidents: incRows.filter((i) => i.coachName === coach).length,
          wellbeing: wbRows.filter((w) => w.coachName === coach).length,
          reliability: scheduled ? Math.round(((scheduled - absent) / scheduled) * 100) : 100,
        };
      })
      .sort((a, b) => b.led - a.led || a.coach.localeCompare(b.coach));

    const summary = {
      swimmerCount: swimmers.length,
      lowAttendance: swimmers.filter((s) => s.rate < 75).length,
      coachAbsences: coachAbsRows.length,
      coachSubs: coachAbsRows.filter((c) => c.replacedByName).length,
    };
    return { swimmers, coaches, summary };
  }, [
    admin,
    period,
    attRows,
    sessionInstances,
    coachAbsRows,
    noteRows,
    ratedRows,
    incRows,
    wbRows,
  ]);

  if (!swim) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground">
        Swim summary reports are available to swim coaches and club admins.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Summary Reports"
        subtitle={
          admin
            ? "Whole-club daily, weekly, monthly and yearly summaries."
            : "Your session summaries — attendance, ratings and incidents."
        }
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print / export</span>
          </Button>
        }
      />

      {/* Period toggle + range nav */}
      <Section className="!py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border overflow-hidden" data-tour="report-periods">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                data-tour={p.id === "month" ? "report-month" : undefined}
                onClick={() => {
                  setPeriod(p.id);
                  setOffset(0);
                }}
                className={
                  "px-3 sm:px-4 h-9 text-xs sm:text-sm font-medium border-l first:border-l-0 transition-colors " +
                  (period === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setOffset((o) => o + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs sm:text-sm font-medium min-w-[9rem] text-center inline-flex items-center gap-1.5 justify-center">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {rangeLabel}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              disabled={offset === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Section>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Sessions conducted"
          value={sessionInstances.size}
          hint={admin ? "across the club" : "your sessions"}
          icon={<Waves className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Attendance rate"
          value={`${attendanceRate}%`}
          hint={`${attCounts.present + attCounts.late} of ${attTotal} attended`}
          icon={<UserCheck className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Swimmers rated"
          value={ratedSwimmers}
          hint={avgRating ? `avg ${avgRating.toFixed(1)} ★` : "no ratings yet"}
          icon={<Star className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Incidents"
          value={incRows.length}
          hint={`${incOpen} open`}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={incOpen > 0 ? "destructive" : "warning"}
        />
      </div>

      {/* Monthly evaluation — detailed roll-up for month-end review & HR */}
      {monthlyEval && (
        <Section
          title={`Monthly evaluation — ${rangeLabel}`}
          description="A month-end roll-up for club review and HR: every swimmer's attendance and every coach's activity, reliability and safeguarding contribution."
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5" data-tour="monthly-eval">
            <MiniStat
              label="Swimmers active"
              value={monthlyEval.summary.swimmerCount}
              tone="info"
            />
            <MiniStat
              label="Below 75% attendance"
              value={monthlyEval.summary.lowAttendance}
              tone={monthlyEval.summary.lowAttendance > 0 ? "destructive" : "success"}
            />
            <MiniStat
              label="Coach absences"
              value={monthlyEval.summary.coachAbsences}
              tone={monthlyEval.summary.coachAbsences > 0 ? "destructive" : "success"}
            />
            <MiniStat label="Sessions covered" value={monthlyEval.summary.coachSubs} tone="info" />
          </div>

          {/* Per-coach HR table */}
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Coach summary (HR)
          </div>
          <div className="overflow-x-auto rounded-lg border mb-6">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th className="text-left">Coach</Th>
                  <Th>Sessions led</Th>
                  <Th>Absences</Th>
                  <Th>Covered for others</Th>
                  <Th>Reliability</Th>
                  <Th>Notes</Th>
                  <Th>Swimmers rated</Th>
                  <Th>Avg ★</Th>
                  <Th>Incidents</Th>
                  <Th>Wellbeing</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthlyEval.coaches.map((c) => (
                  <tr key={c.coach} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-left font-medium whitespace-nowrap">{c.coach}</td>
                    <Td>{c.led}</Td>
                    <Td className={c.absent > 0 ? "text-destructive font-medium" : ""}>
                      {c.absent}
                    </Td>
                    <Td>{c.covered}</Td>
                    <Td>
                      <span
                        className={
                          c.reliability < 90
                            ? "text-warning-foreground font-medium"
                            : "text-success"
                        }
                      >
                        {c.reliability}%
                      </span>
                    </Td>
                    <Td>{c.notes}</Td>
                    <Td>{c.rated}</Td>
                    <Td>{c.avg ? c.avg.toFixed(1) : "—"}</Td>
                    <Td className={c.incidents > 0 ? "text-warning-foreground" : ""}>
                      {c.incidents}
                    </Td>
                    <Td>{c.wellbeing}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-swimmer attendance table */}
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Swimmer attendance ({monthlyEval.swimmers.length})
          </div>
          {monthlyEval.swimmers.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <Th className="text-left">Swimmer</Th>
                    <Th>Present</Th>
                    <Th>Late</Th>
                    <Th>Absent</Th>
                    <Th>Sessions</Th>
                    <Th>Attendance</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {monthlyEval.swimmers.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-left whitespace-nowrap">
                        <Link
                          to="/app/srb/$studentId"
                          params={{ studentId: s.id }}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <Td>{s.present}</Td>
                      <Td>{s.late}</Td>
                      <Td className={s.absent > 0 ? "text-destructive" : ""}>{s.absent}</Td>
                      <Td>{s.total}</Td>
                      <Td>
                        <span
                          className={
                            s.rate < 75
                              ? "text-destructive font-semibold"
                              : s.rate < 90
                                ? "text-warning-foreground font-medium"
                                : "text-success font-medium"
                          }
                        >
                          {s.rate}%
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyHint text="No swimmer attendance recorded this month." />
          )}
        </Section>
      )}

      {/* Swimmer attendance */}
      <Section
        title="Swimmer attendance"
        description="Present, late and absent across the sessions that ran in this period."
      >
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          <Pill tone="success" label="Present" value={attCounts.present} />
          <Pill tone="warning" label="Late" value={attCounts.late} />
          <Pill tone="destructive" label="Absent" value={attCounts.absent} />
          <Pill tone="muted" label="Capacity used" value={`${capacity}%`} />
        </div>
        {bySession.length > 0 ? (
          <BarTrend data={bySession} xKey="name" yKey="present" height={220} />
        ) : (
          <EmptyHint text="No attendance recorded in this period." />
        )}
      </Section>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Coach attendance */}
        <Section
          title="Coach attendance"
          description="Scheduled coaches vs. absences and cover for this period."
        >
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MiniStat label="Present" value={coachPresent} tone="success" />
            <MiniStat label="Absent" value={coachAbsent} tone="destructive" />
            <MiniStat label="Substituted" value={coachSubs} tone="info" />
          </div>
          {coachAbsRows.length > 0 ? (
            <ul className="divide-y -mx-4 sm:-mx-5">
              {coachAbsRows.map((c) => (
                <li key={c.id} className="px-4 sm:px-5 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.coachName}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {fmtShort(new Date(c.date))}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {sessionById[c.sessionId]?.title ?? c.sessionId} · {c.reason ?? "Absent"}
                    {c.replacedByName && (
                      <>
                        {" · covered by "}
                        <span className="text-foreground font-medium">{c.replacedByName}</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="Full coach attendance — no absences this period." />
          )}
        </Section>

        {/* Record-book notes */}
        <Section
          title="Record-book activity"
          description="Coach notes, achievements and assessments logged this period."
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl font-bold">{noteRows.length}</div>
            <div className="text-xs text-muted-foreground">
              notes posted
              {ratedRows.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Stars value={avgRating} size={12} />
                  <span>avg swimmer rating</span>
                </div>
              )}
            </div>
          </div>
          {notesByType.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {notesByType.map(([type, n]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs capitalize"
                >
                  <NotebookPen className="h-3 w-3 text-muted-foreground" />
                  {type}
                  <span className="font-bold">{n}</span>
                </span>
              ))}
            </div>
          ) : (
            <EmptyHint text="No record-book notes in this period." />
          )}
        </Section>
      </div>

      {/* Incidents */}
      <Section
        title={`Incidents (${incRows.length})`}
        description="Safety, health, behaviour and equipment incidents logged poolside."
      >
        {incRows.length > 0 ? (
          <ul className="divide-y -mx-4 sm:-mx-5">
            {incRows.map((i) => (
              <li key={i.id} className="px-4 sm:px-5 py-3">
                <div className="flex items-center gap-2 flex-wrap">
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
                  <Badge tone="info">{i.type}</Badge>
                  <span className="text-sm font-medium">{i.title}</span>
                  <Badge tone={i.status === "Open" ? "destructive" : "success"}>{i.status}</Badge>
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {fmtShort(new Date(i.at))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{i.body}</p>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {sessionById[i.sessionId ?? ""]?.title ?? "Club"} · logged by {i.coachName}
                  {i.studentName ? ` · ${i.studentName}` : ""}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint text="No incidents logged in this period — a clean record." />
        )}
      </Section>

      {/* Safety & wellbeing */}
      <Section
        title="Wellbeing check-ins"
        description="Pastoral check-ins logged poolside. Amber and red flags need follow-up."
      >
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          <Pill tone="success" label="Green" value={wbCounts.green} />
          <Pill tone="warning" label="Amber" value={wbCounts.amber} />
          <Pill tone="destructive" label="Red" value={wbCounts.red} />
        </div>
        {wbFollowUps.length > 0 ? (
          <ul className="divide-y -mx-4 sm:-mx-5">
            {wbFollowUps.map((w) => (
              <li key={w.id} className="px-4 sm:px-5 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={w.flag === "Red" ? "destructive" : "warning"}>{w.flag}</Badge>
                  <span className="text-sm font-medium">{w.studentName}</span>
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {fmtShort(new Date(w.at))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{w.note}</p>
                <div className="text-[11px] text-muted-foreground mt-1">
                  logged by {w.coachName}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint
            text={
              wbCounts.green > 0
                ? "All check-ins green — no follow-ups needed this period."
                : "No wellbeing check-ins in this period."
            }
          />
        )}
      </Section>

      {admin && (
        <div className="text-center">
          <Link
            to="/app/coaching"
            className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline"
          >
            <Users className="h-4 w-4" />
            Manage coaches & sessions
          </Link>
        </div>
      )}
    </div>
  );
}

function Pill({
  tone,
  label,
  value,
}: {
  tone: "success" | "warning" | "destructive" | "muted";
  label: string;
  value: number | string;
}) {
  const tones: Record<string, string> = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={"inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium " + tones[tone]}
    >
      {label} <span className="font-bold">{value}</span>
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "destructive" | "info";
}) {
  const tones: Record<string, string> = {
    success: "text-success",
    destructive: "text-destructive",
    info: "text-info",
  };
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className={"text-2xl font-bold " + tones[tone]}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={"px-3 py-2 font-semibold text-center " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-3 py-2 text-center tabular-nums " + className}>{children}</td>;
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center gap-2">
      <BarChart3 className="h-6 w-6 opacity-50" />
      {text}
    </div>
  );
}
