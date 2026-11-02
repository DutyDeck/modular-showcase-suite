import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Section, Badge, Button } from "@/components/ui-kit";
import { useCollection } from "@/lib/store";
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Clock,
  BookOpen,
  Calendar as CalIcon,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { Weekday } from "@/lib/mockData";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY, type AcademicCalendar, type Learner } from "@/lib/packs/foundationData";
import { weekdayOf, type TimetableSlot } from "@/lib/packs/opsData";
import {
  ageBandFor,
  buildTeachingGroups,
  groupsForUser,
  type AgeBand,
} from "@/lib/packs/sis/learning";
import { addDaysISO, derivedSlots, mondayOfISO, occurrences } from "@/lib/packs/sis/community";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — 1StudentID" }] }),
  component: CalendarPage,
});

interface CalEvent {
  id: string;
  title: string;
  type: "class" | "exam" | "deadline" | "meeting";
  date: Date;
  time: string;
  detail: string;
}

const TYPE_TONE: Record<CalEvent["type"], "default" | "destructive" | "warning" | "info"> = {
  class: "default",
  exam: "destructive",
  deadline: "warning",
  meeting: "info",
};

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // Sunday = 0
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

function fmtMonth(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function CalendarPage() {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  if (isPackTenantUser(user, profiles)) return <PackCalendar />;
  return <ClassicCalendar />;
}

function ClassicCalendar() {
  const courses = useCollection("courses");
  const assignments = useCollection("assignments");
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState<Date>(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<CalEvent | null>(null);

  /* Build a synthetic timetable from courses + assignment due dates */
  const events: CalEvent[] = useMemo(() => {
    const week = startOfWeek(new Date());
    const out: CalEvent[] = [];
    // Live classes: spread courses across weekdays 8 AM – 6 PM
    courses.forEach((c, i) => {
      const day = (i % 5) + 1; // Mon-Fri
      const hour = 8 + (i % 6) * 2;
      const d = addDays(week, day);
      d.setHours(hour, 0, 0, 0);
      out.push({
        id: `class-${c.id}`,
        title: c.title,
        type: "class",
        date: d,
        time: `${hour}:00 – ${hour + 2}:00`,
        detail: `${c.code} · ${c.teacher} · ${c.students} students`,
      });
    });
    // Assignment deadlines
    assignments.forEach((a) => {
      if (!a.due || a.due === "TBD") return;
      const d = new Date(a.due);
      if (Number.isNaN(d.getTime())) return;
      d.setHours(23, 59, 0, 0);
      out.push({
        id: `due-${a.id}`,
        title: a.title,
        type: "deadline",
        date: d,
        time: "Due 23:59",
        detail: `${a.course} · ${a.status}`,
      });
    });
    return out;
  }, [courses, assignments]);

  const goPrev = () =>
    setCursor((d) =>
      view === "week" ? addDays(d, -7) : new Date(d.getFullYear(), d.getMonth() - 1, 1),
    );
  const goNext = () =>
    setCursor((d) =>
      view === "week" ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1),
    );
  const goToday = () => setCursor(view === "week" ? startOfWeek(new Date()) : new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle="Timetable, live classes, exams and deadlines."
        actions={
          <>
            <div className="inline-flex rounded-md border bg-card overflow-hidden">
              <button
                onClick={() => {
                  setView("week");
                  setCursor(startOfWeek(new Date()));
                }}
                className={cn(
                  "px-3 h-9 text-xs font-medium",
                  view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                Week
              </button>
              <button
                onClick={() => {
                  setView("month");
                  setCursor(new Date());
                }}
                className={cn(
                  "px-3 h-9 text-xs font-medium border-l",
                  view === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                Month
              </button>
            </div>
            <Button variant="outline" onClick={goToday}>
              <CalIcon className="h-4 w-4" />
              Today
            </Button>
          </>
        }
      />

      <Section
        title={
          view === "week"
            ? `Week of ${cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
            : fmtMonth(cursor)
        }
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goNext}
              className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      >
        {view === "week" ? (
          <WeekGrid cursor={cursor} events={events} onSelect={setSelected} />
        ) : (
          <MonthGrid cursor={cursor} events={events} onSelect={setSelected} />
        )}
      </Section>

      {selected && (
        <Section title={selected.title} description={selected.detail}>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <Badge tone={TYPE_TONE[selected.type]}>{selected.type.toUpperCase()}</Badge>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {selected.date.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}{" "}
              · {selected.time}
            </span>
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            {selected.type === "class" && (
              <Button onClick={() => toast.success("Joining live class…")}>
                <Video className="h-4 w-4" />
                Join class
              </Button>
            )}
            {selected.type === "deadline" && (
              <Button onClick={() => toast.info("Opening assignment…")}>
                <BookOpen className="h-4 w-4" />
                Open assignment
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </Section>
      )}
    </div>
  );
}

function WeekGrid({
  cursor,
  events,
  onSelect,
}: {
  cursor: Date;
  events: CalEvent[];
  onSelect: (e: CalEvent) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
  const today = new Date();
  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-5">
      <div className="grid grid-cols-7 gap-px bg-border min-w-[840px]">
        {days.map((d) => (
          <div key={d.toISOString()} className="bg-card">
            <div
              className={cn(
                "px-3 py-2 text-xs uppercase tracking-wider border-b",
                sameDay(d, today)
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground",
              )}
            >
              {fmtDay(d)}
            </div>
            <div className="p-2 min-h-[180px] space-y-1.5">
              {events
                .filter((e) => sameDay(e.date, d))
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e)}
                    className={cn(
                      "w-full text-left p-2 rounded-md text-xs hover:opacity-90 transition-opacity",
                      e.type === "class" && "bg-primary/10 text-primary border-l-2 border-primary",
                      e.type === "deadline" &&
                        "bg-warning/15 text-warning-foreground border-l-2 border-warning",
                      e.type === "exam" &&
                        "bg-destructive/10 text-destructive border-l-2 border-destructive",
                      e.type === "meeting" && "bg-info/10 text-info border-l-2 border-info",
                    )}
                  >
                    <div className="font-medium truncate">{e.title}</div>
                    <div className="opacity-70">{e.time}</div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  cursor,
  events,
  onSelect,
}: {
  cursor: Date;
  events: CalEvent[];
  onSelect: (e: CalEvent) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = new Date();
  return (
    <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div
          key={d}
          className="bg-muted/40 px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold"
        >
          {d}
        </div>
      ))}
      {cells.map((d) => {
        const inMonth = d.getMonth() === cursor.getMonth();
        const dayEvents = events.filter((e) => sameDay(e.date, d));
        return (
          <div
            key={d.toISOString()}
            className={cn("bg-card min-h-[88px] p-1.5 text-xs space-y-1", !inMonth && "opacity-50")}
          >
            <div
              className={cn(
                "text-[11px] font-semibold",
                sameDay(d, today) &&
                  "inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground",
              )}
            >
              {d.getDate()}
            </div>
            {dayEvents.slice(0, 2).map((e) => (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className={cn(
                  "w-full text-left truncate px-1.5 py-0.5 rounded text-[10px]",
                  e.type === "class" && "bg-primary/10 text-primary",
                  e.type === "deadline" && "bg-warning/20 text-warning-foreground",
                  e.type === "exam" && "bg-destructive/10 text-destructive",
                  e.type === "meeting" && "bg-info/10 text-info",
                )}
              >
                {e.title}
              </button>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-[10px] text-muted-foreground px-1.5">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Pack tenants: the user's own institution, at the right age ───────────── */

type EvKind =
  | "class"
  | "exam"
  | "due"
  | "meeting"
  | "trip"
  | "activity"
  | "holiday"
  | "term"
  | "admin";

type EvLink =
  | "/app/timetable"
  | "/app/he/exams"
  | "/app/assignments"
  | "/app/school/meetings"
  | "/app/school/life"
  | "/app/school/exams"
  | "/app/admissions";

interface PEv {
  id: string;
  date: string; // ISO day
  endDate?: string; // all-day spans (holidays, exam windows)
  start?: string;
  end?: string;
  kind: EvKind;
  title: string;
  detail?: string;
  note?: string;
  /** Person index (child) — colours the event for parents. */
  who?: number;
  status?: string;
  link?: EvLink;
}

const KIND: Record<EvKind, { chip: string; label: string }> = {
  class: { chip: "bg-primary/10 text-primary border-primary", label: "Lesson" },
  exam: { chip: "bg-destructive/10 text-destructive border-destructive", label: "Exam" },
  due: { chip: "bg-warning/15 text-warning-foreground border-warning", label: "Due" },
  meeting: { chip: "bg-info/10 text-info border-info", label: "Meeting" },
  trip: { chip: "bg-success/10 text-success border-success", label: "Trip" },
  activity: { chip: "bg-success/10 text-success border-success", label: "Activity" },
  holiday: { chip: "bg-muted text-muted-foreground border-muted-foreground/40", label: "Holiday" },
  term: { chip: "bg-muted text-foreground border-foreground/30", label: "Term" },
  admin: {
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500",
    label: "Admissions",
  },
};

const LINK_LABEL: Record<EvLink, string> = {
  "/app/timetable": "Open timetable",
  "/app/he/exams": "Open exams",
  "/app/assignments": "Open coursework",
  "/app/school/meetings": "Parent meetings",
  "/app/school/life": "Trips & activities",
  "/app/school/exams": "Exam entries",
  "/app/admissions": "Admissions",
};

/** One colour per child on a parent's calendar. */
const PERSON_DOT = ["bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500"];

/** Half-terms and public holidays the seed calendars don't carry. */
const CALENDAR_EXTRAS: Record<string, { name: string; start: string; end?: string }[]> = {
  "CAL-0901": [
    { name: "October half-term", start: "2026-10-26", end: "2026-10-30" },
    { name: "Commemoration Day & National Day", start: "2026-12-01", end: "2026-12-03" },
    { name: "February half-term", start: "2027-02-15", end: "2027-02-19" },
    { name: "May half-term", start: "2027-05-31", end: "2027-06-04" },
  ],
  "CAL-0902": [
    { name: "Diwali holiday", start: "2026-11-09" },
    { name: "Commemoration Day & National Day", start: "2026-12-01", end: "2026-12-03" },
    { name: "Winter break", start: "2026-12-12", end: "2027-01-03" },
  ],
  "CAL-1201": [
    { name: "Mid-term break", start: "2026-10-26", end: "2026-10-30" },
    { name: "Il Full Moon Poya Day", start: "2026-11-24" },
    { name: "Independence Day", start: "2027-02-04" },
    { name: "Mid-term break", start: "2027-02-15", end: "2027-02-19" },
  ],
  "CAL-1001": [
    { name: "Reading week", start: "2026-10-26", end: "2026-10-30" },
    { name: "Winter vacation", start: "2026-12-19", end: "2027-01-03" },
  ],
};

const DAY_NAMES: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function fmtLong(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function monthLabel(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const firstOfMonth = (iso: string) => iso.slice(0, 8) + "01";

function addMonthsISO(iso: string, n: number) {
  const d = new Date(firstOfMonth(iso) + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

const covers = (e: PEv, day: string) =>
  e.endDate ? day >= e.date && day <= e.endDate : day === e.date;

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function addMinutes(t: string, mins: number) {
  const n = toMinutes(t) + mins;
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

function bandOf(l: Learner): AgeBand {
  if (l.programmeId) return "higher-ed";
  if (l.qualificationId) return "vocational";
  return ageBandFor(l.level);
}

const isYoung = (b: AgeBand) => b === "early" || b === "primary";

/** Name a gap between teaching terms. */
function gapName(start: string) {
  const m = Number(start.slice(5, 7));
  if (m === 12 || m === 1) return "Winter break";
  if (m >= 3 && m <= 4) return "Spring break";
  if (m >= 6 && m <= 8) return "Summer holiday";
  return "Term break";
}

/** Holidays of a calendar: breaks, gaps between teaching terms, extras. */
function holidaysOf(cal: AcademicCalendar) {
  const out: { name: string; start: string; end: string }[] = [];
  for (const t of cal.terms) if (t.kind === "break") out.push(t);
  const teaching = cal.terms
    .filter((t) => t.kind === "teaching")
    .sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < teaching.length; i++) {
    const s = addDaysISO(teaching[i - 1].end, 1);
    const e = addDaysISO(teaching[i].start, -1);
    if (s > e) continue;
    if (out.some((h) => h.start <= e && h.end >= s)) continue;
    out.push({ name: gapName(s), start: s, end: e });
  }
  for (const x of CALENDAR_EXTRAS[cal.id] ?? []) {
    if (out.some((h) => h.start <= x.start && h.end >= (x.end ?? x.start))) continue;
    out.push({ name: x.name, start: x.start, end: x.end ?? x.start });
  }
  return out;
}

/** Parse "Tuesdays 15:30–16:45" / "Mon & Thu 06:30–07:30". */
function parseSchedule(s?: string): { days: Weekday[]; start: string; end: string } | null {
  if (!s) return null;
  const t = /(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/.exec(s);
  const days = DAY_NAMES.filter((d) => s.includes(d));
  if (!t || days.length === 0) return null;
  return { days, start: t[1], end: t[2] };
}

function PackCalendar() {
  const ctx = useTenantContext();
  const user = ctx.user;
  const role = user?.role;
  const scoped = useScopedLearners();
  const calendars = useCollection("academicCalendars");
  const subjectClasses = useCollection("subjectClasses");
  const heModules = useCollection("heModules");
  const moduleRegistrations = useCollection("moduleRegistrations");
  const qualifications = useCollection("qualifications");
  const learners = useCollection("learners");
  const tutorGroups = useCollection("tutorGroups");
  const allSlots = useCollection("timetableSlots");
  const allChanges = useCollection("classChanges");
  const rooms = useCollection("rooms");
  const examSittings = useCollection("examSittings");
  const examEntries = useCollection("examEntries");
  const coursework = useCollection("coursework");
  const ptmEvents = useCollection("ptmEvents");
  const ptmBookings = useCollection("ptmBookings");
  const services = useCollection("schoolServices");
  const serviceEnrolments = useCollection("serviceEnrolments");
  const intakes = useCollection("intakes");

  const [view, setView] = useState<"week" | "month" | "agenda">("week");
  const [cursor, setCursor] = useState(() => mondayOfISO(DEMO_TODAY));
  const [selected, setSelected] = useState<PEv | null>(null);

  const tenantId = ctx.tenantId;
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  const persons = useMemo(
    () => (role === "student" || role === "parent" ? scoped : []),
    [role, scoped],
  );
  const multi = persons.length > 1;

  /* Visible range (recurring lessons / activities are generated only here). */
  const range = useMemo(() => {
    if (view === "week") return { from: cursor, to: addDaysISO(cursor, 6) };
    if (view === "agenda") return { from: cursor, to: addDaysISO(cursor, 27) };
    const start = mondayOfISO(firstOfMonth(cursor));
    return { from: start, to: addDaysISO(start, 41) };
  }, [view, cursor]);

  const model = useMemo(() => {
    const groups = buildTeachingGroups({
      subjectClasses,
      heModules,
      moduleRegistrations,
      qualifications,
      learners,
    });
    const slots = allSlots.filter((s) => s.tenantId === tenantId);
    const changes = allChanges.filter((c) => c.tenantId === tenantId);
    const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;
    const tenantCals = calendars.filter((c) => c.tenantId === tenantId);
    const codesFor = (id: string) =>
      moduleRegistrations
        .filter((r) => r.studentId === id && r.status === "Registered")
        .map((r) => heModules.find((m) => m.id === r.moduleId)?.code)
        .filter((c): c is string => !!c);
    const me = user?.name ?? "";
    const myGroups = isTeacher ? groupsForUser(user, groups, learners) : [];
    const myForms = isTeacher
      ? tutorGroups.filter((t) => t.tenantId === tenantId && t.tutor === me)
      : [];

    /* Which calendars apply */
    let calIds: string[];
    if (persons.length) calIds = [...new Set(persons.map((p) => p.calendarId))];
    else if (isTeacher) {
      const ids = new Set<string>();
      for (const l of learners) {
        if (l.tenantId !== tenantId) continue;
        const taught =
          myGroups.some((g) => g.studentIds.includes(l.id)) ||
          myForms.some((f) => f.name === l.group);
        if (taught) ids.add(l.calendarId);
      }
      calIds = [...ids];
      if (!calIds.length) calIds = tenantCals.filter((c) => c.isDefault).map((c) => c.id);
    } else calIds = tenantCals.map((c) => c.id);
    const cals = tenantCals.filter((c) => calIds.includes(c.id));
    const calWho = (id: string) => {
      const idx = persons.map((p, i) => (p.calendarId === id ? i : -1)).filter((i) => i >= 0);
      return multi && idx.length === 1 ? idx[0] : undefined;
    };
    const calTag = (c: AcademicCalendar) =>
      cals.length > 1 && !multi ? ` · ${c.name.replace(/\s*\d{4}.*$/, "")}` : "";

    const holidays = new Map(cals.map((c) => [c.id, holidaysOf(c)]));
    const isOff = (calId: string | undefined, day: string) => {
      const cal = cals.find((c) => c.id === calId) ?? cals[0];
      if (!cal) return false;
      if ((holidays.get(cal.id) ?? []).some((h) => day >= h.start && day <= h.end)) return true;
      return !cal.terms.some((t) => t.kind !== "break" && day >= t.start && day <= t.end);
    };

    const personYoung = (i: number) => isYoung(bandOf(persons[i]));
    const allYoung = persons.length > 0 && persons.every((p) => isYoung(bandOf(p)));
    const evs: PEv[] = [];

    /* 1 · Academic calendars */
    for (const c of cals) {
      const who = calWho(c.id);
      const tag = calTag(c);
      const kidsOnCal = persons.filter((p) => p.calendarId === c.id).map((p) => p.name);
      const detail = `${c.name}${kidsOnCal.length && multi ? ` · ${kidsOnCal.join(", ")}` : ""}`;
      for (const t of c.terms) {
        if (t.kind === "teaching") {
          evs.push({
            id: `${c.id}-${t.id}-s`,
            date: t.start,
            kind: "term",
            title: `${t.name} begins${tag}`,
            detail,
            who,
          });
          evs.push({
            id: `${c.id}-${t.id}-e`,
            date: t.end,
            kind: "term",
            title: `${t.name} ends${tag}`,
            detail,
            who,
          });
        } else if (t.kind === "exams") {
          if (allYoung) continue;
          evs.push({
            id: `${c.id}-${t.id}`,
            date: t.start,
            endDate: t.end,
            kind: "exam",
            title: `${t.name}${tag}`,
            detail,
            who,
          });
        } else if (t.kind !== "break") {
          evs.push({
            id: `${c.id}-${t.id}`,
            date: t.start,
            endDate: t.end,
            kind: "term",
            title: `${t.name}${tag}`,
            detail,
            who,
          });
        }
      }
      for (const [i, h] of (holidays.get(c.id) ?? []).entries()) {
        evs.push({
          id: `${c.id}-hol-${i}`,
          date: h.start,
          endDate: h.end === h.start ? undefined : h.end,
          kind: "holiday",
          title: `${h.name}${tag}`,
          detail: `${detail} · no lessons`,
          who,
        });
      }
    }

    /* 2 · Lessons (with one-off changes) */
    const lessonEv = (o: ReturnType<typeof occurrences>[number], who?: number): PEv => {
      const c = o.change;
      const status = c
        ? c.kind === "Moved"
          ? `Moved from ${fmtShort(c.date)}`
          : c.kind
        : undefined;
      return {
        id: `cls-${o.slot.id}-${o.date}-${who ?? "t"}`,
        date: o.date,
        start: o.start,
        end: o.end,
        kind: "class",
        title: isTeacher ? `${o.slot.subject} · ${o.slot.groupLabel}` : o.slot.subject,
        detail: [o.slot.groupLabel, isTeacher ? "" : o.slot.teacherName, roomName(o.roomId)]
          .filter(Boolean)
          .join(" · "),
        note: c?.reason,
        who: multi ? who : undefined,
        status,
        link: "/app/timetable",
      };
    };
    persons.forEach((p, i) => {
      if (p.status === "Graduated") return;
      const codes = codesFor(p.id);
      const own = slots.filter(
        (s) =>
          s.cohorts?.includes(p.group ?? "") ||
          s.groupLabel === p.group ||
          codes.some((c) => s.groupLabel.startsWith(c)),
      );
      const pGroups = groups.filter((g) => g.tenantId === tenantId && g.studentIds.includes(p.id));
      const derived = derivedSlots(pGroups, slots, learners);
      for (const o of occurrences([...own, ...derived], changes, range.from, range.to)) {
        if (!isOff(p.calendarId, o.date)) evs.push(lessonEv(o, i));
      }
    });
    if (isTeacher) {
      const mine: TimetableSlot[] = [
        ...slots.filter((s) => s.teacherName === me),
        ...derivedSlots(myGroups, slots, learners),
      ];
      for (const o of occurrences(mine, changes, range.from, range.to)) {
        if (!isOff(o.slot.calendarId ?? cals[0]?.id, o.date)) evs.push(lessonEv(o));
      }
    }
    if (isAdmin) {
      // Admins see the one-off changes, not every lesson in the school.
      for (const c of changes) {
        const s = slots.find((x) => x.id === c.slotId);
        if (!s) continue;
        const day = c.kind === "Moved" && c.newDate ? c.newDate : c.date;
        evs.push({
          id: `chg-${c.id}`,
          date: day,
          start: c.newStart ?? s.start,
          end: c.newEnd ?? s.end,
          kind: "class",
          title: `${c.kind}: ${s.subject}`,
          detail: `${s.groupLabel} · ${s.teacherName}`,
          note: c.reason,
          status: c.kind,
          link: "/app/timetable",
        });
      }
    }

    /* 3 · Exams (published to learners; staff also see drafts) */
    const tenantSittings = examSittings.filter((x) => x.tenantId === tenantId);
    const sittingEv = (x: (typeof tenantSittings)[number], who?: number): PEv => ({
      id: `exm-${x.id}-${who ?? "s"}`,
      date: x.date,
      start: x.start,
      end: addMinutes(x.start, x.durationMins),
      kind: "exam",
      title: x.title,
      detail: `${x.series} · ${x.durationMins} min · ${x.roomIds.map(roomName).join(", ")}`,
      who: multi ? who : undefined,
      status: x.status === "Draft" ? "Draft" : undefined,
      link: "/app/he/exams",
    });
    let unpublished = 0;
    persons.forEach((p, i) => {
      if (personYoung(i)) return;
      const modIds = moduleRegistrations
        .filter((r) => r.studentId === p.id && r.status === "Registered")
        .map((r) => r.moduleId);
      for (const x of tenantSittings) {
        const mineX = modIds.includes(x.moduleId) || x.resitCandidates?.includes(p.id);
        if (!mineX) continue;
        if (x.status === "Published") evs.push(sittingEv(x, i));
        else unpublished++;
      }
    });
    if (isTeacher) {
      for (const x of tenantSittings) {
        const lead = heModules.find((m) => m.id === x.moduleId)?.leader === me;
        if (lead || x.invigilators.includes(me)) evs.push(sittingEv(x));
      }
    }
    if (isAdmin) for (const x of tenantSittings) evs.push(sittingEv(x));

    /* 4 · External exam entries (school) */
    const entries = examEntries.filter((e) => e.tenantId === tenantId && e.status !== "Withdrawn");
    persons.forEach((p, i) => {
      if (personYoung(i)) return;
      for (const e of entries.filter((x) => x.studentId === p.id)) {
        evs.push({
          id: `ent-${e.id}`,
          date: e.deadline,
          kind: "due",
          title: `Exam entry deadline: ${e.qualification} ${e.subject}`,
          detail: `${e.board} · ${e.series} · ${p.name}`,
          who: multi ? i : undefined,
          status: e.status === "Draft" ? "Not entered yet" : undefined,
          link: "/app/school/exams",
        });
      }
    });
    if (isAdmin || isTeacher) {
      const taughtIds = new Set(myGroups.flatMap((g) => g.studentIds));
      const pool = isAdmin ? entries : entries.filter((e) => taughtIds.has(e.studentId));
      const byKey = new Map<string, typeof pool>();
      for (const e of pool) {
        const k = `${e.deadline}|${e.qualification}|${e.series}`;
        byKey.set(k, [...(byKey.get(k) ?? []), e]);
      }
      for (const [k, list] of byKey) {
        const [deadline, qual, series] = k.split("|");
        const n = new Set(list.map((e) => e.studentId)).size;
        evs.push({
          id: `ent-${k}`,
          date: deadline,
          kind: "due",
          title: `${qual} entries close`,
          detail: `${series} · ${n} candidate${n === 1 ? "" : "s"}${isTeacher ? " you teach" : ""}`,
          link: "/app/school/exams",
        });
      }
    }

    /* 5 · Coursework due */
    const groupWho = new Map<string, number | undefined>();
    if (isTeacher) for (const g of myGroups) groupWho.set(g.id, undefined);
    persons.forEach((p, i) => {
      if (bandOf(p) === "early") return;
      for (const g of groups) if (g.studentIds.includes(p.id)) groupWho.set(g.id, i);
    });
    for (const cw of coursework) {
      if (cw.tenantId !== tenantId || !groupWho.has(cw.groupId)) continue;
      const g = groups.find((x) => x.id === cw.groupId);
      const who = groupWho.get(cw.groupId);
      evs.push({
        id: `cw-${cw.id}`,
        date: cw.due,
        kind: "due",
        title: cw.title,
        detail: `${cw.kind} · ${g?.title ?? ""} · set by ${cw.setBy}`,
        who: multi ? who : undefined,
        link: "/app/assignments",
      });
    }

    /* 6 · Parent meetings */
    for (const m of ptmEvents.filter((x) => x.tenantId === tenantId)) {
      const base = {
        date: m.date,
        start: m.start,
        end: m.end,
        kind: "meeting" as const,
        title: m.name,
        link: "/app/school/meetings" as const,
      };
      if (isAdmin)
        evs.push({ ...base, id: `ptm-${m.id}`, detail: `${m.mode} · ${m.yearGroups.join(", ")}` });
      else if (isTeacher) {
        if (!m.teachers.includes(me)) continue;
        const n = ptmBookings.filter((b) => b.eventId === m.id && b.teacherName === me).length;
        evs.push({
          ...base,
          id: `ptm-${m.id}`,
          detail: `${m.mode} · ${n} booking${n === 1 ? "" : "s"} with you`,
        });
      } else {
        persons.forEach((p, i) => {
          if (!m.yearGroups.includes(p.level)) return;
          const booked = ptmBookings.filter((b) => b.eventId === m.id && b.studentId === p.id);
          evs.push({
            ...base,
            id: `ptm-${m.id}-${p.id}`,
            detail: booked.length
              ? `Booked: ${booked.map((b) => `${b.time} with ${b.teacherName}`).join(", ")}`
              : `${m.mode} · ${m.bookingOpen ? "booking open" : "booking not open yet"}`,
            who: multi ? i : undefined,
            status: booked.length ? "Booked" : undefined,
          });
        });
      }
    }

    /* 7 · Trips and activities */
    const tenantServices = services.filter((s) => s.tenantId === tenantId);
    const addService = (
      s: (typeof tenantServices)[number],
      who: number | undefined,
      status: string | undefined,
      calId: string | undefined,
    ) => {
      if (s.kind === "Trip" && s.date) {
        evs.push({
          id: `svc-${s.id}-${who ?? "x"}`,
          date: s.date,
          kind: "trip",
          title: s.name,
          detail: `${s.detail} · led by ${s.leader}`,
          who: multi ? who : undefined,
          status,
          link: "/app/school/life",
        });
      }
      const sched = s.kind === "Activity" ? parseSchedule(s.schedule) : null;
      if (!sched) return;
      for (let d = range.from; d <= range.to; d = addDaysISO(d, 1)) {
        if (!sched.days.includes(weekdayOf(d)) || isOff(calId, d)) continue;
        evs.push({
          id: `act-${s.id}-${d}-${who ?? "x"}`,
          date: d,
          start: sched.start,
          end: sched.end,
          kind: "activity",
          title: s.name,
          detail: `Led by ${s.leader}`,
          who: multi ? who : undefined,
          link: "/app/school/life",
        });
      }
    };
    persons.forEach((p, i) => {
      for (const e of serviceEnrolments) {
        if (e.studentId !== p.id || e.status === "Declined") continue;
        const s = tenantServices.find((x) => x.id === e.serviceId);
        if (!s) continue;
        const status =
          s.requiresConsent && !e.consentBy
            ? "Consent needed"
            : e.status === "Waitlist"
              ? "Waitlist"
              : undefined;
        addService(s, i, status, p.calendarId);
      }
    });
    if (isTeacher) {
      for (const s of tenantServices)
        if (s.leader === me) addService(s, undefined, "You lead", cals[0]?.id);
    }
    if (isAdmin) {
      for (const s of tenantServices)
        if (s.kind === "Trip") addService(s, undefined, undefined, undefined);
    }

    /* 8 · Admissions dates (admins) */
    if (isAdmin) {
      for (const n of intakes.filter((x) => x.tenantId === tenantId)) {
        const add = (date: string | undefined, label: string) => {
          if (!date) return;
          evs.push({
            id: `int-${n.id}-${label}`,
            date,
            kind: "admin",
            title: `${n.name}: ${label}`,
            detail: n.scopeLabel,
            link: "/app/admissions",
          });
        };
        add(n.opens, "applications open");
        add(n.deadline, "application deadline");
        add(n.start, "intake starts");
        add(n.lastStart, "last start date");
        add(n.census, "census date");
      }
    }

    const current = cals[0]?.terms.find(
      (t) => t.kind === "teaching" && DEMO_TODAY >= t.start && DEMO_TODAY <= t.end,
    );
    return { evs, cals, calWho, unpublished, current, allYoung };
  }, [
    subjectClasses,
    heModules,
    moduleRegistrations,
    qualifications,
    learners,
    tutorGroups,
    allSlots,
    allChanges,
    rooms,
    calendars,
    examSittings,
    examEntries,
    coursework,
    ptmEvents,
    ptmBookings,
    services,
    serviceEnrolments,
    intakes,
    tenantId,
    user,
    isTeacher,
    isAdmin,
    persons,
    multi,
    range,
  ]);

  const step = (dir: 1 | -1) =>
    setCursor((c) =>
      view === "week"
        ? addDaysISO(c, 7 * dir)
        : view === "agenda"
          ? addDaysISO(c, 28 * dir)
          : addMonthsISO(c, dir),
    );
  const switchView = (v: typeof view) => {
    setView(v);
    setCursor(
      v === "week"
        ? mondayOfISO(DEMO_TODAY)
        : v === "month"
          ? firstOfMonth(DEMO_TODAY)
          : DEMO_TODAY,
    );
    setSelected(null);
  };

  const heading =
    view === "week"
      ? `Week of ${fmtShort(cursor)}`
      : view === "month"
        ? monthLabel(cursor)
        : `${fmtShort(range.from)} – ${fmtShort(range.to)}`;

  const subtitle = model.current
    ? `${ctx.tenantName} · ${model.current.name} ends ${fmtShort(model.current.end)}`
    : ctx.tenantName;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle={subtitle}
        actions={
          <>
            <div className="inline-flex rounded-md border bg-card overflow-hidden">
              {(["week", "month", "agenda"] as const).map((v, i) => (
                <button
                  key={v}
                  onClick={() => switchView(v)}
                  className={cn(
                    "px-3 h-9 text-xs font-medium capitalize",
                    i > 0 && "border-l",
                    view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={() => switchView(view)}>
              <CalIcon className="h-4 w-4" />
              Today
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {multi
          ? persons.map((p, i) => (
              <span key={p.id} className="inline-flex items-center gap-1.5">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", PERSON_DOT[i % PERSON_DOT.length])}
                />
                <span className="font-medium text-foreground">{p.name.split(" ")[0]}</span>
                {p.level} · {model.cals.find((c) => c.id === p.calendarId)?.name}
              </span>
            ))
          : model.cals.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5">
                <CalIcon className="h-3.5 w-3.5" />
                {c.name}
              </span>
            ))}
        {model.unpublished > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Your exam timetable appears here once it is published.
          </span>
        )}
      </div>

      <Section
        title={heading}
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={() => step(-1)}
              aria-label="Previous"
              className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => step(1)}
              aria-label="Next"
              className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      >
        {view === "week" && <PackWeek from={cursor} evs={model.evs} onSelect={setSelected} />}
        {view === "month" && <PackMonth month={cursor} evs={model.evs} onSelect={setSelected} />}
        {view === "agenda" && (
          <PackAgenda from={range.from} to={range.to} evs={model.evs} onSelect={setSelected} />
        )}
      </Section>

      {selected && (
        <Section title={selected.title} description={selected.detail}>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <Badge tone="muted">{KIND[selected.kind].label}</Badge>
            {selected.status && <Badge tone="warning">{selected.status}</Badge>}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {fmtLong(selected.date)}
              {selected.endDate && ` – ${fmtLong(selected.endDate)}`}
              {selected.start && ` · ${selected.start}${selected.end ? `–${selected.end}` : ""}`}
            </span>
          </div>
          {selected.note && <p className="text-sm text-muted-foreground mt-3">{selected.note}</p>}
          <div className="mt-4 flex gap-2 flex-wrap">
            {selected.link && (
              <Link
                to={selected.link}
                className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2"
              >
                {LINK_LABEL[selected.link]}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </Section>
      )}
    </div>
  );
}

function EvChip({
  e,
  onSelect,
  compact,
}: {
  e: PEv;
  onSelect: (e: PEv) => void;
  compact?: boolean;
}) {
  const cancelled = e.status === "Cancelled";
  return (
    <button
      onClick={() => onSelect(e)}
      className={cn(
        "w-full text-left rounded-md border-l-2 hover:opacity-90 transition-opacity",
        compact ? "px-1.5 py-0.5 text-[10px] truncate" : "p-2 text-xs",
        KIND[e.kind].chip,
      )}
    >
      <div className={cn("flex items-center gap-1.5 min-w-0", !compact && "font-medium")}>
        {e.who !== undefined && (
          <span
            className={cn("h-2 w-2 rounded-full shrink-0", PERSON_DOT[e.who % PERSON_DOT.length])}
          />
        )}
        <span className={cn("truncate", cancelled && "line-through")}>{e.title}</span>
      </div>
      {!compact && (e.start || e.status) && (
        <div className="opacity-75 truncate">
          {e.start && `${e.start}${e.end ? `–${e.end}` : ""}`}
          {e.status && `${e.start ? " · " : ""}${e.status}`}
        </div>
      )}
    </button>
  );
}

const sortEvs = (a: PEv, b: PEv) =>
  Number(!!a.start) - Number(!!b.start) || (a.start ?? "").localeCompare(b.start ?? "");

function PackWeek({
  from,
  evs,
  onSelect,
}: {
  from: string;
  evs: PEv[];
  onSelect: (e: PEv) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(from, i));
  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-5">
      <div className="grid grid-cols-7 gap-px bg-border min-w-[840px]">
        {days.map((d) => {
          const list = evs.filter((e) => covers(e, d)).sort(sortEvs);
          const off = list.some((e) => e.kind === "holiday");
          return (
            <div key={d} className={cn("bg-card", off && "bg-muted/50")}>
              <div
                className={cn(
                  "px-3 py-2 text-xs uppercase tracking-wider border-b",
                  d === DEMO_TODAY
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {fmtShort(d).replace(/ \w+$/, "")}
              </div>
              <div className="p-2 min-h-[180px] space-y-1.5">
                {list.map((e) => (
                  <EvChip key={e.id} e={e} onSelect={onSelect} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PackMonth({
  month,
  evs,
  onSelect,
}: {
  month: string;
  evs: PEv[];
  onSelect: (e: PEv) => void;
}) {
  const start = mondayOfISO(firstOfMonth(month));
  const cells = Array.from({ length: 42 }, (_, i) => addDaysISO(start, i));
  return (
    <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
      {DAY_NAMES.map((d) => (
        <div
          key={d}
          className="bg-muted/40 px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold"
        >
          {d}
        </div>
      ))}
      {cells.map((d) => {
        const all = evs.filter((e) => covers(e, d));
        const lessons = all.filter((e) => e.kind === "class" && !e.status).length;
        const shown = all
          .filter((e) => !(e.kind === "class" && !e.status) && e.kind !== "activity")
          .sort(sortEvs);
        const off = all.some((e) => e.kind === "holiday");
        return (
          <div
            key={d}
            className={cn(
              "bg-card min-h-[96px] p-1.5 text-xs space-y-1",
              off && "bg-muted/50",
              d.slice(0, 7) !== month.slice(0, 7) && "opacity-50",
            )}
          >
            <div
              className={cn(
                "text-[11px] font-semibold",
                d === DEMO_TODAY &&
                  "inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground",
              )}
            >
              {Number(d.slice(8))}
            </div>
            {shown.slice(0, 3).map((e) => (
              <EvChip key={e.id} e={e} onSelect={onSelect} compact />
            ))}
            {shown.length > 3 && (
              <div className="text-[10px] text-muted-foreground px-1.5">
                +{shown.length - 3} more
              </div>
            )}
            {lessons > 0 && (
              <div className="text-[10px] text-muted-foreground px-1.5">
                {lessons} lesson{lessons === 1 ? "" : "s"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PackAgenda({
  from,
  to,
  evs,
  onSelect,
}: {
  from: string;
  to: string;
  evs: PEv[];
  onSelect: (e: PEv) => void;
}) {
  // Plain lessons are on the week view; the agenda keeps changes and events.
  const items = evs.filter(
    (e) =>
      !(e.kind === "class" && !e.status) &&
      e.kind !== "activity" &&
      e.date <= to &&
      (e.endDate ?? e.date) >= from,
  );
  const days: string[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) days.push(d);
  const rows = days
    .map((d) => ({
      d,
      list: items
        .filter((e) => e.date === d || (d === from && e.date < from && covers(e, d)))
        .sort(sortEvs),
    }))
    .filter((r) => r.list.length);
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nothing coming up.</p>;
  return (
    <ul className="divide-y -my-2">
      {rows.map(({ d, list }) => (
        <li key={d} className="py-3 flex gap-4">
          <div
            className={cn("w-24 shrink-0 text-xs font-medium", d === DEMO_TODAY && "text-primary")}
          >
            {fmtShort(d)}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            {list.map((e) => (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className="w-full text-left flex items-start gap-2 text-sm hover:bg-muted/50 rounded-md px-2 py-1"
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 rounded-full shrink-0",
                    e.who !== undefined
                      ? PERSON_DOT[e.who % PERSON_DOT.length]
                      : "bg-muted-foreground/50",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("font-medium", e.status === "Cancelled" && "line-through")}>
                    {e.title}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {e.start && `${e.start}${e.end ? `–${e.end}` : ""} · `}
                    {e.endDate && `until ${fmtShort(e.endDate)} · `}
                    {e.detail}
                  </span>
                </span>
                <Badge tone={e.status ? "warning" : "muted"}>
                  {e.status ?? KIND[e.kind].label}
                </Badge>
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
