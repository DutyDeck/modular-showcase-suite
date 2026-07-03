import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  Button,
  Field,
  TextInput,
  Select,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { useCollection, addItem, nextId, type RaceTime } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  isSwimUser,
  isSwimAdmin,
  sessionsByCourse,
  sessionsForCoach,
  effectiveSwimmerIds,
  personalBests,
  formatSwimTime,
  SWIM_EVENTS,
  SWIM_COURSE_ID,
  type SwimEvent,
} from "@/lib/mockData";
import { Timer, Trophy, Gauge, TrendingDown, Plus, Waves } from "lucide-react";

export const Route = createFileRoute("/app/squad")({
  head: () => ({ meta: [{ title: "Competitive Squad — 1StudentID" }] }),
  component: SquadPage,
});

/** Board columns — the headline events shown as a swimmer × event matrix. */
const BOARD_EVENTS: SwimEvent[] = ["50m Freestyle", "100m Freestyle", "50m Butterfly", "100m IM"];

/** Parse "31.42", "1:04.40" or "1:04" into seconds. */
function parseSwimTime(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  if (s.includes(":")) {
    const [m, sec] = s.split(":");
    const mm = Number(m);
    const ss = Number(sec);
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm * 60 + ss;
  }
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function SquadPage() {
  const { user } = useAuth();
  const moves = useCollection("swimmerMoves");
  const students = useCollection("students");
  const times = useCollection("raceTimes");
  const add = useDisclosure();

  const swim = isSwimUser(user);
  const canLog = user?.role === "teacher" || user?.role === "admin";

  // Competitive-squad swimmers — admin sees the whole squad, a coach only the
  // squad swimmers in her own sessions.
  const squadSessions = useMemo(() => {
    const base =
      user && !isSwimAdmin(user) ? sessionsForCoach(user.name) : sessionsByCourse(SWIM_COURSE_ID);
    return base.filter((s) => s.level === "Competitive Squad");
  }, [user]);

  const squadIds = useMemo(() => {
    const ids = new Set<string>();
    squadSessions.forEach((s) => effectiveSwimmerIds(s, moves).forEach((id) => ids.add(id)));
    return ids;
  }, [squadSessions, moves]);

  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? id;

  const squadTimes = useMemo(
    () => times.filter((t) => squadIds.has(t.studentId)),
    [times, squadIds],
  );
  const pbs = useMemo(() => personalBests(squadTimes), [squadTimes]);

  // Recent times (latest first), tagging those that are the swimmer's PB.
  const recent = useMemo(
    () =>
      squadTimes
        .slice()
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .map((t) => ({
          ...t,
          isPB: pbs.get(`${t.studentId}|${t.event}`)?.id === t.id,
        })),
    [squadTimes, pbs],
  );

  // "PBs this month" and best recent improvement, for the stat cards.
  const monthAgo = Date.now() - 30 * 86400 * 1000;
  const pbsThisMonth = Array.from(pbs.values()).filter(
    (t) => Date.parse(t.date) >= monthAgo,
  ).length;

  const swimmerIds = useMemo(() => Array.from(squadIds), [squadIds]);

  const [form, setForm] = useState({
    studentId: "",
    event: BOARD_EVENTS[0] as SwimEvent,
    time: "",
    meet: "Club Time-Trial",
    date: new Date().toISOString().slice(0, 10),
  });

  const submit = () => {
    if (!user) return;
    if (!form.studentId) return toast.error("Pick a swimmer");
    const seconds = parseSwimTime(form.time);
    if (seconds === null || seconds <= 0)
      return toast.error("Enter a valid time, e.g. 31.42 or 1:04.40");
    const prev = pbs.get(`${form.studentId}|${form.event}`);
    const row: RaceTime = {
      id: nextId("RT-", "raceTimes"),
      studentId: form.studentId,
      studentName: nameOf(form.studentId),
      event: form.event,
      seconds,
      date: new Date(form.date).toISOString(),
      meet: form.meet.trim() || "Time-Trial",
      coachName: user.name,
    };
    addItem("raceTimes", row);
    const isPB = !prev || seconds < prev.seconds;
    toast.success(
      isPB
        ? `🏅 New PB for ${row.studentName} — ${form.event} ${formatSwimTime(seconds)}`
        : `Time logged for ${row.studentName}`,
    );
    setForm({ ...form, studentId: "", time: "" });
    add.onClose();
  };

  if (!swim) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Waves className="h-8 w-8 mx-auto mb-2" />
        Competitive squad management is available to swim-club staff.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitive Squad"
        subtitle="Race times, personal bests and meet performance for the club's competitive swimmers."
        actions={
          canLog ? (
            <Button onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Log a time</span>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Squad swimmers"
          value={squadIds.size}
          icon={<Waves className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Times logged"
          value={squadTimes.length}
          icon={<Timer className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="PBs this month"
          value={pbsThisMonth}
          icon={<Trophy className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Events tracked"
          value={SWIM_EVENTS.length}
          icon={<Gauge className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      {/* Personal-best board */}
      <Section
        title="Personal-best board"
        description="Each swimmer's fastest time per event. Tap a swimmer to open their record book."
      >
        <DataTable
          columns={[
            { key: "name", label: "Swimmer" },
            ...BOARD_EVENTS.map((e) => ({ key: e, label: e.replace("Freestyle", "Free") })),
          ]}
          rows={swimmerIds.map((id) => ({ id, name: nameOf(id) }))}
          emptyText="No squad swimmers"
          renderCell={(row, key) => {
            if (key === "name")
              return (
                <Link
                  to="/app/srb/$studentId"
                  params={{ studentId: row.id }}
                  className="flex items-center gap-2 hover:underline"
                >
                  <Avatar name={row.name} seed={row.id} size={26} />
                  <span className="font-medium">{row.name}</span>
                </Link>
              );
            const pb = pbs.get(`${row.id}|${key}`);
            if (!pb) return <span className="text-muted-foreground">—</span>;
            return <span className="font-mono font-semibold">{formatSwimTime(pb.seconds)}</span>;
          }}
        />
      </Section>

      {/* Recent times */}
      <Section title="Recent times" description="Latest timed swims across the squad.">
        <DataTable
          columns={[
            { key: "date", label: "Date" },
            { key: "studentName", label: "Swimmer" },
            { key: "event", label: "Event" },
            { key: "seconds", label: "Time" },
            { key: "meet", label: "Meet" },
            { key: "_pb", label: "" },
          ]}
          rows={recent}
          emptyText="No times logged yet"
          renderCell={(row, key) => {
            if (key === "date") return new Date(row.date).toLocaleDateString();
            if (key === "seconds")
              return <span className="font-mono font-semibold">{formatSwimTime(row.seconds)}</span>;
            if (key === "_pb")
              return row.isPB ? (
                <Badge tone="success">
                  <Trophy className="h-3 w-3" />
                  PB
                </Badge>
              ) : null;
            return String(row[key as keyof typeof row] ?? "");
          }}
        />
      </Section>

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="Log a race time"
        description="Record a timed swim. A new personal best is flagged automatically."
        onSubmit={submit}
        submitLabel="Log time"
      >
        <Field label="Swimmer" required className="sm:col-span-2">
          <Select
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            options={[
              { value: "", label: "— Select swimmer —" },
              ...swimmerIds.map((id) => ({ value: id, label: nameOf(id) })),
            ]}
          />
        </Field>
        <Field label="Event">
          <Select
            value={form.event}
            onChange={(e) => setForm({ ...form, event: e.target.value as SwimEvent })}
            options={SWIM_EVENTS.map((ev) => ({ value: ev, label: ev }))}
          />
        </Field>
        <Field label="Time" required>
          <TextInput
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            placeholder="e.g. 31.42 or 1:04.40"
          />
        </Field>
        <Field label="Meet / event">
          <TextInput
            value={form.meet}
            onChange={(e) => setForm({ ...form, meet: e.target.value })}
            placeholder="e.g. Club Gala Time-Trial"
          />
        </Field>
        <Field label="Date">
          <TextInput
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
      </FormDialog>

      <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
        <TrendingDown className="h-3.5 w-3.5 shrink-0" />
        Lower is faster — the board shows each swimmer's quickest recorded time per event.
      </div>
    </div>
  );
}
