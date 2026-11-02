/** International School Pack dashboards (admin, teacher, parent). */
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Users,
  CalendarCheck,
  DoorOpen,
  ClipboardList,
  ShieldCheck,
  CalendarDays,
  Trophy,
  Handshake,
  Bus,
  Layers,
  Target,
  Map as MapIcon,
  ArrowRight,
} from "lucide-react";
import { StatCard, Section, Badge } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { StatusPill } from "@/components/packs/PackUI";
import { useCollection } from "@/lib/store";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import { codeSetById, countsAsPresent } from "@/lib/packs/regions";
import { currentTerm, DEMO_TODAY, type AcademicCalendar } from "@/lib/packs/foundationData";
import { houseTotals } from "@/lib/packs/schoolData";
import type { RegisterMark } from "@/lib/packs/opsData";

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** Present-equivalent attendance % over a set of marks under the tenant's code set. */
function attendancePct(marks: RegisterMark[], codeSetId: string): number | null {
  const set = codeSetById(codeSetId);
  let possible = 0;
  let present = 0;
  for (const m of marks) {
    const meaning = set.codes.find((c) => c.code === m.code)?.meaning ?? "unauthorised";
    if (meaning === "not-required" || meaning === "admin") continue;
    possible++;
    if (countsAsPresent(meaning)) present++;
  }
  return possible ? Math.round((present / possible) * 1000) / 10 : null;
}

function useSchoolData() {
  const ctx = useTenantContext();
  const t = ctx.tenantId;
  const by = <T extends { tenantId: string }>(rows: T[]) => rows.filter((r) => r.tenantId === t);
  return {
    ctx,
    learners: by(useCollection("learners")),
    curricula: by(useCollection("curricula")),
    calendars: by(useCollection("academicCalendars")),
    tutorGroups: by(useCollection("tutorGroups")),
    houses: by(useCollection("houses")),
    points: by(useCollection("housePoints")),
    entries: by(useCollection("examEntries")),
    events: by(useCollection("ptmEvents")),
    bookings: by(useCollection("ptmBookings")),
    services: by(useCollection("schoolServices")),
    enrolments: by(useCollection("serviceEnrolments")),
    applications: by(useCollection("applications")),
    marks: by(useCollection("registerMarks")),
  };
}

function CalendarStrip({ cal, label }: { cal: AcademicCalendar; label?: string }) {
  const term = currentTerm(cal);
  const teaching = cal.terms.filter((x) => x.kind === "teaching");
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          {label ?? cal.name}
        </div>
        <Badge tone={term ? "success" : "muted"}>{term?.name ?? "Between terms"}</Badge>
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">
        {cal.academicYear} · {fmtDay(cal.start)} → {fmtDay(cal.end)}
      </div>
      <div className="mt-2 flex gap-1 h-1.5">
        {teaching.map((x) => (
          <div
            key={x.id}
            title={x.name}
            className={`flex-1 rounded-full ${term?.id === x.id ? "bg-primary" : "bg-primary/20"}`}
          />
        ))}
      </div>
      {term && <div className="text-[11px] mt-1.5">Term ends {fmtDay(term.end)}</div>}
    </div>
  );
}

function HouseBoard({
  houses,
  points,
}: {
  houses: { id: string; name: string; colour: string }[];
  points: { houseId: string; points: number }[];
}) {
  const totals = houseTotals(points as never);
  const ranked = [...houses].sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0));
  const top = Math.max(1, ...ranked.map((h) => totals.get(h.id) ?? 0));
  return (
    <ul className="space-y-2.5">
      {ranked.map((h, i) => (
        <li key={h.id}>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: h.colour }} />
              {h.name}
              {i === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
            </span>
            <span className="font-semibold tabular-nums">{totals.get(h.id) ?? 0}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
            <div
              className="h-full"
              style={{ width: `${((totals.get(h.id) ?? 0) / top) * 100}%`, background: h.colour }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted hover:border-primary/40 transition-colors"
    >
      <span className="text-primary">{icon}</span>
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

export function SchoolAdminDash() {
  const d = useSchoolData();
  const active = d.learners.filter((l) => l.status === "Active");
  const pct = attendancePct(d.marks, d.ctx.profile?.codeSetId ?? "simple");
  const pipeline = d.applications.filter(
    (a) => !["Enrolled", "Declined", "Withdrawn"].includes(a.stage),
  );
  const offers = d.applications.filter((a) => a.stage === "Offer" || a.stage === "Accepted").length;
  const drafts = d.entries.filter((e) => e.status === "Draft");
  const outstanding = d.enrolments.filter((e) => {
    const s = d.services.find((x) => x.id === e.serviceId);
    return s?.requiresConsent && !e.consentAt && e.status !== "Declined";
  });
  const nextPtm = d.events
    .filter((e) => e.date >= DEMO_TODAY)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const usedCalendars = d.calendars.filter((c) => d.curricula.some((cu) => cu.calendarId === c.id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Students on roll"
          value={active.length}
          hint={`${d.curricula.length} curricula · ${d.tutorGroups.length} tutor groups`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Attendance"
          value={pct === null ? "—" : `${pct}%`}
          hint={`${codeSetById(d.ctx.profile?.codeSetId ?? "simple").name.split(" (")[0]} codes`}
          icon={<CalendarCheck className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Admissions pipeline"
          value={pipeline.length}
          hint={pipeline.length ? `${offers} at offer / accepted` : "No open applications"}
          icon={<DoorOpen className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Exam entries to submit"
          value={drafts.length}
          hint={`${outstanding.length} trip / boarding consents outstanding`}
          icon={<ClipboardList className="h-4 w-4" />}
          accent="warning"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Section
          title="Roll by curriculum"
          description="Each curriculum runs on its own calendar"
          className="lg:col-span-2"
        >
          <div className="grid sm:grid-cols-3 gap-3">
            {d.curricula.map((c) => {
              const n = active.filter((l) => l.curriculumId === c.id).length;
              const cal = d.calendars.find((x) => x.id === c.calendarId);
              const term = cal && currentTerm(cal);
              return (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {c.framework}
                  </div>
                  <div className="text-2xl font-bold">{n}</div>
                  <div className="text-xs truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {cal?.academicYear} · {term?.name ?? "Between terms"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {usedCalendars.map((c) => (
              <CalendarStrip key={c.id} cal={c} />
            ))}
          </div>
        </Section>

        <Section title="House leaderboard">
          <HouseBoard houses={d.houses} points={d.points} />
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Section
          title="Admissions pipeline"
          description="From the Admissions module"
          className="lg:col-span-2"
        >
          {pipeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open applications yet.</p>
          ) : (
            <ul className="divide-y">
              {pipeline.slice(0, 5).map((a) => (
                <li key={a.id} className="py-2 flex items-center gap-3">
                  <Avatar name={a.applicantName} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.applicantName}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {a.target} · {a.intake}
                    </div>
                  </div>
                  <StatusPill status={a.stage} />
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Quick links">
          <div className="space-y-2">
            {nextPtm && (
              <QuickLink
                to="/app/school/meetings"
                icon={<Handshake className="h-4 w-4" />}
                label={`${nextPtm.name.split(" ").slice(0, 3).join(" ")}… · ${fmtDay(nextPtm.date)}`}
              />
            )}
            <QuickLink
              to="/app/school/exams"
              icon={<ClipboardList className="h-4 w-4" />}
              label={`Exam entries (${drafts.length} drafts)`}
            />
            <QuickLink
              to="/app/school/life"
              icon={<ShieldCheck className="h-4 w-4" />}
              label={`Consents outstanding (${outstanding.length})`}
            />
            <QuickLink
              to="/app/school/curricula"
              icon={<Layers className="h-4 w-4" />}
              label="Curricula, tutor groups & houses"
            />
            <QuickLink
              to="/app/admissions"
              icon={<DoorOpen className="h-4 w-4" />}
              label="Admissions"
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ── Teacher ─────────────────────────────────────────────────────────────── */

export function SchoolTeacherDash() {
  const d = useSchoolData();
  const me = d.ctx.user?.name ?? "";
  const subject = d.ctx.user?.meta?.subject ?? "";
  const myGroup = d.tutorGroups.find((g) => g.tutor === me);
  const tutees = d.learners.filter((l) => l.group === myGroup?.name);
  const mySubject = d.entries.filter(
    (e) =>
      e.status !== "Withdrawn" &&
      subject &&
      e.subject.toLowerCase().includes(subject.toLowerCase()),
  );
  const toPredict = mySubject.filter((e) => !e.predictedGrade);
  const myBookings = d.bookings
    .filter((b) => b.teacherName === me)
    .filter((b) => (d.events.find((e) => e.id === b.eventId)?.date ?? "") >= DEMO_TODAY)
    .sort((a, b) => a.time.localeCompare(b.time));
  const myTrips = d.services.filter((s) => s.leader === me);
  const pct = attendancePct(
    d.marks.filter((m) => m.groupLabel === myGroup?.name),
    d.ctx.profile?.codeSetId ?? "simple",
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={`Tutor group ${myGroup?.name ?? ""}`}
          value={tutees.length}
          hint={myGroup?.yearGroup}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Tutor-group attendance"
          value={pct === null ? "—" : `${pct}%`}
          icon={<CalendarCheck className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Predictions to enter"
          value={toPredict.length}
          hint={`${mySubject.length} ${subject} candidates`}
          icon={<Target className="h-4 w-4" />}
          accent={toPredict.length ? "warning" : "success"}
        />
        <StatCard
          label="Parent meetings booked"
          value={myBookings.length}
          icon={<Handshake className="h-4 w-4" />}
          accent="info"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Section
          title={`My tutor group — ${myGroup?.name ?? "—"}`}
          description={myGroup ? `${myGroup.yearGroup} · room ${myGroup.room ?? "—"}` : undefined}
          className="lg:col-span-2"
        >
          <ul className="grid sm:grid-cols-2 gap-2">
            {tutees.map((l) => (
              <li key={l.id} className="flex items-center gap-2 rounded-lg border p-2">
                <Avatar name={l.name} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{l.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    House {l.house}
                    {l.eal ? " · EAL" : ""}
                    {l.supportPlan ? " · support plan" : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="House points">
          <HouseBoard houses={d.houses} points={d.points} />
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Section
          title="Predictions needed"
          description={`${subject} · used for entry tiers and university references`}
        >
          {toPredict.length === 0 ? (
            <p className="text-sm text-muted-foreground">All predictions entered.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {toPredict.map((e) => (
                <li key={e.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {d.learners.find((l) => l.id === e.studentId)?.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{e.qualification}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <QuickLink
              to="/app/school/exams"
              icon={<Target className="h-4 w-4" />}
              label="Enter predicted grades"
            />
          </div>
        </Section>
        <Section title="Upcoming parent meetings">
          {myBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {myBookings.slice(0, 6).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{b.time}</span>
                  <span className="flex-1 truncate">{b.parentName}</span>
                  <Badge tone={b.mode === "Online" ? "info" : "default"}>{b.mode}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Trips & activities I lead">
          <ul className="space-y-2 text-sm">
            {myTrips.map((s) => {
              const roster = d.enrolments.filter(
                (e) => e.serviceId === s.id && e.status !== "Declined",
              );
              const waiting = roster.filter((e) => s.requiresConsent && !e.consentAt).length;
              return (
                <li key={s.id} className="flex items-start gap-2">
                  {s.kind === "Trip" ? (
                    <MapIcon className="h-4 w-4 text-primary mt-0.5" />
                  ) : (
                    <Bus className="h-4 w-4 text-primary mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {roster.length} signed up{waiting ? ` · ${waiting} consent awaited` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </div>
  );
}

/* ── Parent ──────────────────────────────────────────────────────────────── */

export function SchoolParentDash() {
  const d = useSchoolData();
  const kids = useScopedLearners();
  const me = d.ctx.user?.name ?? "";
  const myBookings = d.bookings.filter(
    (b) =>
      b.parentName === me && (d.events.find((e) => e.id === b.eventId)?.date ?? "") >= DEMO_TODAY,
  );
  const openEvents = d.events.filter((e) => e.bookingOpen && e.date >= DEMO_TODAY);
  const consents = useMemo(
    () =>
      d.enrolments.filter((e) => {
        const s = d.services.find((x) => x.id === e.serviceId);
        return (
          kids.some((k) => k.id === e.studentId) &&
          s?.requiresConsent &&
          !e.consentAt &&
          e.status !== "Declined"
        );
      }),
    [d.enrolments, d.services, kids],
  );

  return (
    <div className="space-y-6">
      {consents.length > 0 && (
        <Link
          to="/app/school/life"
          className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm hover:bg-warning/15"
        >
          <ShieldCheck className="h-5 w-5 text-warning-foreground" />
          <span className="flex-1">
            <span className="font-medium">
              {consents.length} trip consent{consents.length === 1 ? "" : "s"} needed
            </span>{" "}
            — {consents.map((e) => d.services.find((s) => s.id === e.serviceId)?.name).join(", ")}
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {kids.map((k) => {
          const cur = d.curricula.find((c) => c.id === k.curriculumId);
          const cal = d.calendars.find((c) => c.id === k.calendarId);
          const house = d.houses.find((h) => h.name === k.house);
          const tutor = d.tutorGroups.find((g) => g.name === k.group)?.tutor;
          const entries = d.entries.filter((e) => e.studentId === k.id && e.status !== "Withdrawn");
          const meeting = myBookings.find((b) => b.studentId === k.id);
          const meetingEvent = meeting && d.events.find((e) => e.id === meeting.eventId);
          const childConsents = consents.filter((e) => e.studentId === k.id);
          const pct = attendancePct(
            d.marks.filter((m) => m.studentId === k.id),
            d.ctx.profile?.codeSetId ?? "simple",
          );
          return (
            <div key={k.id} className="rounded-xl border bg-card shadow-soft overflow-hidden">
              <div
                className="p-4 flex items-center gap-3 border-b"
                style={{ borderTop: `3px solid ${house?.colour ?? "transparent"}` }}
              >
                <Avatar name={k.name} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{k.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {k.level} · {k.group} · tutor {tutor ?? "—"}
                  </div>
                </div>
                {house && (
                  <span
                    className="text-[11px] rounded-full px-2 py-0.5 text-white"
                    style={{ background: house.colour }}
                  >
                    {house.name}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-medium">{cur?.name ?? "—"}</span>
                </div>
                {cal && <CalendarStrip cal={cal} label={`${cal.name}`} />}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <div className="text-lg font-bold">{pct === null ? "—" : `${pct}%`}</div>
                    <div className="text-[10px] text-muted-foreground">Attendance</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <div className="text-lg font-bold">{entries.length}</div>
                    <div className="text-[10px] text-muted-foreground">Exam entries</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <div className="text-lg font-bold">{childConsents.length}</div>
                    <div className="text-[10px] text-muted-foreground">Consents due</div>
                  </div>
                </div>
                {entries.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entries.map((e) => (
                      <span key={e.id} className="text-[11px] rounded border px-1.5 py-0.5">
                        {e.qualification} {e.subject}
                        {e.predictedGrade ? ` · predicted ${e.predictedGrade}` : ""}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-xs flex items-center gap-2">
                  <Handshake className="h-3.5 w-3.5 text-primary" />
                  {meeting && meetingEvent ? (
                    <span>
                      Meeting with {meeting.teacherName} · {fmtDay(meetingEvent.date)}{" "}
                      {meeting.time} ({meeting.mode})
                    </span>
                  ) : openEvents.some((e) => e.yearGroups.includes(k.level)) ? (
                    <Link to="/app/school/meetings" className="text-primary hover:underline">
                      Parent meetings open — book a slot
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No meetings scheduled</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {kids.length > 1 && new Set(kids.map((k) => k.calendarId)).size > 1 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          Your children follow different academic calendars — terms, reports and fees for each are
          scheduled on their own calendar.
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <QuickLink
          to="/app/school/meetings"
          icon={<Handshake className="h-4 w-4" />}
          label="Parent meetings"
        />
        <QuickLink
          to="/app/school/life"
          icon={<MapIcon className="h-4 w-4" />}
          label="Trips & activities"
        />
        <QuickLink
          to="/app/school/exams"
          icon={<ClipboardList className="h-4 w-4" />}
          label="Exam entries"
        />
      </div>
    </div>
  );
}
