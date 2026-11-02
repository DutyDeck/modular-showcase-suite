import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section, Badge, Button, useDisclosure } from "@/components/ui-kit";
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
  Plus,
  Heart,
  CalendarClock,
} from "lucide-react";
import { useMemo, useState } from "react";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import type { TeachingGroup } from "@/lib/packs/sis/learning";
import { endTime, whenLabel, type LearningItem } from "@/lib/packs/sis/lmsContent";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import { usePackLearning, AddLearningDialog, ItemRow } from "@/components/packs/LearningUI";

export const Route = createFileRoute("/app/lms")({
  head: () => ({ meta: [{ title: "Learning Management — 1StudentID" }] }),
  component: LmsPage,
});

function LmsPage() {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  if (isSwimUser(user)) return <SwimLmsView />;
  // Pack tenants: the institution's own groups, worded for the learner's age.
  if (isPackTenantUser(user, profiles)) return <PackLmsView />;
  return <GenericLmsView />;
}

/* ───────────────────────── Pack tenants ───────────────────────── */

type Row = { it: LearningItem; g: TeachingGroup };

const byWhen = (a: Row, b: Row) =>
  `${a.it.date ?? ""}${a.it.start ?? ""}`.localeCompare(`${b.it.date ?? ""}${b.it.start ?? ""}`);
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

function PackLmsView() {
  const L = usePackLearning();
  const { user, ctx } = L;
  const add = useDisclosure();
  const [childId, setChildId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [more, setMore] = useState<Record<string, boolean>>({});
  // Wall-clock minutes decide what is live; the date is the fixed demo day.
  const [nowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  const role = user?.role;
  const parent = role === "parent";

  const groups = useMemo(
    () =>
      L.visible
        .filter((g) => !parent || !childId || g.studentIds.includes(childId))
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true })),
    [L.visible, parent, childId],
  );
  const scope = groupId ? groups.filter((g) => g.id === groupId) : groups;
  const rows: Row[] = scope.flatMap((g) => L.itemsFor(g).map((it) => ({ it, g })));
  const multi = scope.length > 1;
  const young = scope.length > 0 && scope.every((g) => g.band === "early" || g.band === "primary");
  const earlyGroups = scope.filter((g) => g.band === "early");
  const editable = scope.filter((g) => L.canEdit(g));

  const timed = (r: Row) =>
    !!r.it.start &&
    (r.it.kind === "Lesson" ||
      r.it.kind === "Live class" ||
      (r.g.band === "early" && r.it.kind === "Activity"));
  const today = rows.filter((r) => r.it.date === DEMO_TODAY && timed(r)).sort(byWhen);
  const running = (r: Row) => {
    const s = toMin(r.it.start!);
    return nowMin >= s && nowMin < s + (r.it.durationMins ?? 60);
  };
  const liveNow =
    today.find((r) => r.it.kind === "Live class" && running(r)) ?? today.find(running);
  const nextUp = today.find((r) => toMin(r.it.start!) > nowMin);
  // Nothing left today → the next timed lesson or live class.
  const later = rows.filter((r) => (r.it.date ?? "") > DEMO_TODAY && timed(r)).sort(byWhen)[0];
  const hero = liveNow ?? nextUp ?? later;

  const upcomingLive = rows
    .filter((r) => r.it.kind === "Live class" && (r.it.date ?? "") > DEMO_TODAY)
    .sort(byWhen);
  const recordings = rows
    .filter((r) => r.it.kind === "Recording")
    .sort(byWhen)
    .reverse();
  const todo = rows
    .filter((r) => r.it.kind === "Quiz" || (r.it.kind === "Activity" && r.g.band !== "early"))
    .filter((r) => (r.it.due ?? r.it.date ?? "") >= DEMO_TODAY)
    .sort((a, b) => (a.it.due ?? a.it.date ?? "").localeCompare(b.it.due ?? b.it.date ?? ""));
  const resources = rows.filter((r) => r.it.kind === "Resource" && r.g.band !== "early");
  const topics = new Map<string, Row[]>();
  for (const r of resources.sort(byWhen).reverse()) {
    const k = multi ? `${r.g.title} · ${r.it.topic ?? "General"}` : (r.it.topic ?? "General");
    topics.set(k, [...(topics.get(k) ?? []), r]);
  }
  const journalRows = rows
    .filter((r) => r.g.band === "early" && r.it.kind !== "Lesson")
    .sort(byWhen)
    .reverse();

  const first = user?.name.split(" ")[0] ?? "";
  const subtitle = ctx.familyOperated
    ? `What ${first} is learning this week. Shared with the family.`
    : parent
      ? "What your children are learning this week."
      : role === "teacher"
        ? "Your classes today, live classes, resources and quizzes."
        : role === "admin"
          ? `Learning across ${ctx.tenantName}.`
          : "Today, live classes, recordings and resources for your courses.";

  const limit = <T,>(key: string, list: T[], n = 6) => (more[key] ? list : list.slice(0, n));
  const moreBtn = (k: string, total: number, n = 6) =>
    total > n ? (
      <button
        onClick={() => setMore({ ...more, [k]: !more[k] })}
        className="mt-2 text-xs text-primary hover:underline"
      >
        {more[k] ? "Show less" : `Show all ${total}`}
      </button>
    ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning"
        subtitle={subtitle}
        actions={
          editable.length ? (
            <Button onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              Add lesson, resource or live class
            </Button>
          ) : undefined
        }
      />

      {parent && L.family.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {[{ id: "", name: "All children" }, ...L.family].map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setChildId(c.id);
                setGroupId("");
              }}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                childId === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {c.id ? c.name.split(" ")[0] : c.name}
            </button>
          ))}
        </div>
      )}
      {groups.length > 1 && (
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="h-10 w-full sm:w-80 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">
            All {groups.length}{" "}
            {ctx.type === "university" ? "modules" : ctx.type === "college" ? "courses" : "classes"}
          </option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title} ({g.code})
            </option>
          ))}
        </select>
      )}

      {ctx.graduated || !groups.length ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="text-sm font-medium">
            {ctx.graduated ? "Your course has ended" : "Nothing to show yet"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {ctx.graduated
              ? "Learning materials close when a course ends."
              : "Classes appear here once they are set up."}
          </div>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
            <Section title={young ? "Today" : "Live now / Today"} className="lg:col-span-2">
              {hero ? (
                <div className="rounded-xl bg-gradient-hero text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    {hero === liveNow ? (
                      <Badge tone="destructive">
                        {hero.it.kind === "Live class" ? "● LIVE" : "● IN CLASS NOW"}
                      </Badge>
                    ) : (
                      <Badge tone="muted">
                        Next up · {hero === later ? `${whenLabel(hero.it.date)} ` : ""}
                        {hero.it.start}
                      </Badge>
                    )}
                    <h3 className="text-lg sm:text-xl font-bold mt-2">{hero.it.title}</h3>
                    <p className="text-sm opacity-85 mt-1">
                      {hero.g.title} · {L.teacherFor(hero.g)} · {hero.it.start}–
                      {endTime(hero.it.start!, hero.it.durationMins)}
                      {hero.it.location ? ` · ${hero.it.location}` : ""}
                    </p>
                  </div>
                  {hero.it.kind === "Live class" ? (
                    <button
                      onClick={() => toast.success("Joining live class…")}
                      className="bg-white text-primary font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-white/90 self-start sm:self-auto shrink-0"
                    >
                      <Video className="h-4 w-4" />
                      Join
                    </button>
                  ) : (
                    <Link
                      to="/app/courses/$courseId"
                      params={{ courseId: hero.g.id }}
                      className="bg-white text-primary font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-white/90 self-start sm:self-auto shrink-0"
                    >
                      <BookOpen className="h-4 w-4" />
                      Open
                    </Link>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  {today.length ? "That's everything for today." : "Nothing scheduled today."}
                </div>
              )}
              {today.length > 0 && (
                <div className="mt-3 divide-y">
                  {limit("today", today, 8).map((r) => (
                    <ItemRow key={r.it.id} item={r.it} group={r.g} showGroup={multi} />
                  ))}
                  {moreBtn("today", today.length, 8)}
                </div>
              )}
            </Section>

            <Section
              title={
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {young ? "Online sessions" : "Upcoming live classes"}
                </span>
              }
            >
              <div className="divide-y -my-2">
                {limit("live", upcomingLive).map((r) => (
                  <ItemRow key={r.it.id} item={r.it} group={r.g} showGroup={multi} />
                ))}
                {!upcomingLive.length && (
                  <div className="py-2 text-sm text-muted-foreground">None this week.</div>
                )}
              </div>
              {moreBtn("live", upcomingLive.length)}
            </Section>
          </div>

          {earlyGroups.length > 0 && (
            <Section
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Learning journal
                </span>
              }
              description="Play-based activities and observations, shared with the family."
              actions={
                earlyGroups.length === 1 ? (
                  <Link
                    to="/app/courses/$courseId"
                    params={{ courseId: earlyGroups[0].id }}
                    className="text-xs text-primary hover:underline"
                  >
                    Open journal
                  </Link>
                ) : undefined
              }
            >
              <div className="grid md:grid-cols-2 gap-x-6 divide-y md:divide-y-0">
                {limit("journal", journalRows, 8).map((r) => (
                  <ItemRow
                    key={r.it.id}
                    item={r.it}
                    group={r.g}
                    childName={
                      r.it.studentId && (L.isStaff || L.family.length > 1)
                        ? L.learners.find((l) => l.id === r.it.studentId)?.name
                        : undefined
                    }
                  />
                ))}
              </div>
              {moreBtn("journal", journalRows.length, 8)}
            </Section>
          )}

          {(todo.length > 0 || recordings.length > 0) && (
            <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
              <Section
                title={
                  young
                    ? "Home learning and practice"
                    : scope.every((g) => g.band === "higher-ed")
                      ? "Coursework and quizzes"
                      : scope.every((g) => g.band === "vocational")
                        ? "Tasks and knowledge checks"
                        : "Quizzes and activities"
                }
              >
                <div className="divide-y -my-2">
                  {limit("todo", todo).map((r) => (
                    <ItemRow key={r.it.id} item={r.it} group={r.g} showGroup={multi} />
                  ))}
                  {!todo.length && (
                    <div className="py-2 text-sm text-muted-foreground">All done.</div>
                  )}
                </div>
                {moreBtn("todo", todo.length)}
              </Section>
              <Section title={young ? "Videos to watch together" : "Recordings"}>
                <div className="divide-y -my-2">
                  {limit("rec", recordings).map((r) => (
                    <ItemRow key={r.it.id} item={r.it} group={r.g} showGroup={multi} />
                  ))}
                  {!recordings.length && (
                    <div className="py-2 text-sm text-muted-foreground">No recordings yet.</div>
                  )}
                </div>
                {moreBtn("rec", recordings.length)}
              </Section>
            </div>
          )}

          {topics.size > 0 && (
            <Section title="Resources by topic">
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                {limit("topics", Array.from(topics.entries()), 8).map(([topic, list]) => (
                  <div key={topic}>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {topic}
                    </div>
                    <div className="divide-y">
                      {list.map((r) => (
                        <ItemRow key={r.it.id} item={r.it} group={r.g} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {moreBtn("topics", topics.size, 8)}
            </Section>
          )}
        </>
      )}

      {editable.length > 0 && (
        <AddLearningDialog
          open={add.open}
          onOpenChange={add.setOpen}
          groups={editable}
          defaultGroupId={groupId || undefined}
          learners={L.learners}
        />
      )}
    </div>
  );
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
                Coach Ava Johnson · 6 lessons · underwater video breakdowns
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
                Dr. Charlie Brown · 38 attending · started 12 min ago
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
