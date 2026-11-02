import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Plus, Video, MapPin, Lock, Unlock, X, Users } from "lucide-react";
import {
  PageHeader,
  Section,
  Button,
  Badge,
  FormDialog,
  Field,
  TextInput,
  NumberInput,
  Select,
  StatCard,
} from "@/components/ui-kit";
import { PackContextBar, PackEmpty } from "@/components/packs/PackUI";
import { Avatar } from "@/components/Avatar";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import { ptmSlots, ptmToMin, type PtmBooking, type PtmEvent } from "@/lib/packs/schoolData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/school/meetings")({
  head: () => ({ meta: [{ title: "Parent Meetings — 1StudentID" }] }),
  component: ParentMeetingsPage,
});

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ParentMeetingsPage() {
  const ctx = useTenantContext();
  const events = useCollection("ptmEvents")
    .filter((e) => e.tenantId === ctx.tenantId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const role = ctx.user?.role;

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Parent Meetings" subtitle="Parent–teacher meeting booking" />
        <PackContextBar pack="intl-school" />
        <PackEmpty
          pack="intl-school"
          title="No parent–teacher meetings yet"
          body="Create an evening, choose the teachers and slot length — parents then book their own slots online."
        />
      </div>
    );
  }
  if (role === "parent" || ctx.familyOperated) return <ParentView events={events} />;
  if (role === "teacher") return <TeacherView events={events} />;
  return <AdminView events={events} />;
}

/* ── Admin: events + booking grid ────────────────────────────────────────── */

function AdminView({ events }: { events: PtmEvent[] }) {
  const { tenantId } = useTenantContext();
  const bookings = useCollection("ptmBookings").filter((b) => b.tenantId === tenantId);
  const learners = useCollection("learners").filter((l) => l.tenantId === tenantId);
  const [activeId, setActiveId] = useState(events.find((e) => e.bookingOpen)?.id ?? events[0].id);
  const [createOpen, setCreateOpen] = useState(false);
  const ev = events.find((e) => e.id === activeId) ?? events[0];
  const evBookings = bookings.filter((b) => b.eventId === ev.id);
  const slots = ptmSlots(ev);
  const capacity = slots.length * ev.teachers.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parent Meetings"
        subtitle="Create parent–teacher evenings; parents book their own slots."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New event
          </Button>
        }
      />
      <PackContextBar pack="intl-school" />

      <div className="grid md:grid-cols-3 gap-3">
        {events.map((e) => {
          const n = bookings.filter((b) => b.eventId === e.id).length;
          const cap = ptmSlots(e).length * e.teachers.length;
          return (
            <button
              key={e.id}
              onClick={() => setActiveId(e.id)}
              className={cn(
                "text-left rounded-xl border p-4 bg-card hover:border-primary/50 transition-colors",
                e.id === ev.id && "ring-2 ring-primary border-primary",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone={e.bookingOpen ? "success" : "muted"}>
                  {e.bookingOpen ? "Booking open" : "Closed"}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{e.mode}</span>
              </div>
              <div className="font-medium mt-2">{e.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {fmtDay(e.date)} · {e.start}–{e.end} · {e.slotMinutes}-min slots
              </div>
              <div className="h-1.5 rounded-full bg-muted mt-3 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(n / Math.max(cap, 1)) * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {n} of {cap} slots booked · {e.yearGroups.join(", ")}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Teachers"
          value={ev.teachers.length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Bookings"
          value={evBookings.length}
          accent="success"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Online"
          value={evBookings.filter((b) => b.mode === "Online").length}
          accent="info"
          icon={<Video className="h-4 w-4" />}
        />
        <StatCard label="Free slots" value={capacity - evBookings.length} accent="warning" />
      </div>

      <Section
        title={`Booking grid — ${ev.name}`}
        description={`${fmtDay(ev.date)} · year groups ${ev.yearGroups.join(", ")}`}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              updateItem("ptmEvents", (x) => x.id === ev.id, { bookingOpen: !ev.bookingOpen });
              toast.success(ev.bookingOpen ? "Booking closed" : "Booking opened to parents");
            }}
          >
            {ev.bookingOpen ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {ev.bookingOpen ? "Close booking" : "Open booking"}
          </Button>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium w-16">Time</th>
                {ev.teachers.map((t) => (
                  <th key={t} className="px-2 py-2 text-left font-medium">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={t} size={22} />
                      {t}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr key={s} className="border-b last:border-0">
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{s}</td>
                  {ev.teachers.map((t) => {
                    const b = evBookings.find((x) => x.teacherName === t && x.time === s);
                    const st = b && learners.find((l) => l.id === b.studentId);
                    return (
                      <td key={t} className="px-2 py-1">
                        {b ? (
                          <div className="rounded-md bg-primary/10 text-primary px-2 py-1 flex items-center justify-between gap-1">
                            <span className="truncate">
                              {b.parentName}{" "}
                              <span className="opacity-70">re {st?.name.split(" ")[0]}</span>
                            </span>
                            {b.mode === "Online" ? (
                              <Video className="h-3 w-3 shrink-0" />
                            ) : (
                              <MapPin className="h-3 w-3 shrink-0" />
                            )}
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed px-2 py-1 text-muted-foreground/60">
                            free
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} tenantId={tenantId} />
    </div>
  );
}

function CreateEventDialog({
  open,
  onOpenChange,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
}) {
  const groups = useCollection("tutorGroups").filter((g) => g.tenantId === tenantId);
  const staff = Array.from(new Set(groups.map((g) => g.tutor)));
  const yearOptions = Array.from(new Set(groups.map((g) => g.yearGroup)));
  const [name, setName] = useState("");
  const [date, setDate] = useState("2026-12-02");
  const [start, setStart] = useState("15:30");
  const [end, setEnd] = useState("18:00");
  const [slot, setSlot] = useState("10");
  const [mode, setMode] = useState<PtmEvent["mode"]>("Both");
  const [teachers, setTeachers] = useState<string[]>(staff.slice(0, 3));
  const [years, setYears] = useState<string[]>(yearOptions.slice(0, 1));
  const toggle = (list: string[], v: string, set: (x: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const preview = Math.max(0, Math.floor((ptmToMin(end) - ptmToMin(start)) / (Number(slot) || 10)));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New parent–teacher event"
      description="Slots are generated from the time window and slot length for every teacher selected."
      submitLabel="Create & open booking"
      onSubmit={() => {
        if (!name.trim() || teachers.length === 0 || preview === 0) {
          toast.error("Give it a name, at least one teacher and a valid time window");
          return;
        }
        addItem("ptmEvents", {
          id: nextId("PTM-", "ptmEvents"),
          tenantId,
          name: name.trim(),
          date,
          start,
          end,
          slotMinutes: Number(slot) || 10,
          teachers,
          yearGroups: years,
          mode,
          bookingOpen: true,
        });
        toast.success(`${name} created — ${preview * teachers.length} slots open to parents`);
        setName("");
        onOpenChange(false);
      }}
    >
      <Field label="Event name" required className="sm:col-span-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Year 12 Options Evening"
        />
      </Field>
      <Field label="Date">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Mode">
        <Select
          value={mode}
          onChange={(e) => setMode(e.target.value as PtmEvent["mode"])}
          options={["Both", "In person", "Online"].map((m) => ({ value: m, label: m }))}
        />
      </Field>
      <Field label="From">
        <TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      <Field label="To">
        <TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </Field>
      <Field label="Slot length (minutes)" hint={`${preview} slots per teacher`}>
        <NumberInput min={5} max={30} value={slot} onChange={(e) => setSlot(e.target.value)} />
      </Field>
      <div />
      <Field label="Teachers" className="sm:col-span-2">
        <div className="flex flex-wrap gap-1.5">
          {[...staff, "Mr. Yusuf Ali"]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => toggle(teachers, t, setTeachers)}
                className={cn(
                  "text-xs rounded-full border px-2.5 py-1",
                  teachers.includes(t)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted",
                )}
              >
                {t}
              </button>
            ))}
        </div>
      </Field>
      <Field label="Year groups" className="sm:col-span-2">
        <div className="flex flex-wrap gap-1.5">
          {yearOptions.map((y) => (
            <button
              type="button"
              key={y}
              onClick={() => toggle(years, y, setYears)}
              className={cn(
                "text-xs rounded-full border px-2.5 py-1",
                years.includes(y)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </Field>
    </FormDialog>
  );
}

/* ── Teacher: my schedule ────────────────────────────────────────────────── */

function TeacherView({ events }: { events: PtmEvent[] }) {
  const { tenantId, user } = useTenantContext();
  const me = user?.name ?? "";
  const bookings = useCollection("ptmBookings").filter(
    (b) => b.tenantId === tenantId && b.teacherName === me,
  );
  const learners = useCollection("learners").filter((l) => l.tenantId === tenantId);
  const mine = events.filter((e) => e.teachers.includes(me));
  return (
    <div className="space-y-6">
      <PageHeader title="Parent Meetings" subtitle="Your parent–teacher appointments." />
      <PackContextBar pack="intl-school" />
      {mine.map((ev) => {
        const list = bookings
          .filter((b) => b.eventId === ev.id)
          .sort((a, b) => a.time.localeCompare(b.time));
        const past = ev.date < DEMO_TODAY;
        return (
          <Section
            key={ev.id}
            title={ev.name}
            description={`${fmtDay(ev.date)} · ${ev.start}–${ev.end} · ${list.length} of ${ptmSlots(ev).length} slots booked`}
            actions={<Badge tone={past ? "muted" : "success"}>{past ? "Held" : "Upcoming"}</Badge>}
          >
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <ul className="divide-y">
                {list.map((b) => {
                  const s = learners.find((l) => l.id === b.studentId);
                  return (
                    <li key={b.id} className="py-2.5 flex items-center gap-3">
                      <span className="font-mono text-sm w-12">{b.time}</span>
                      <Avatar name={b.parentName} size={30} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{b.parentName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          re {s?.name} · {s?.level} · {s?.group}
                          {s?.supportPlan ? ` · ${s.supportPlan}` : ""}
                        </div>
                      </div>
                      <Badge tone={b.mode === "Online" ? "info" : "default"}>
                        {b.mode === "Online" ? "Online — link sent" : "In person"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        );
      })}
    </div>
  );
}

/* ── Parent: book slots ──────────────────────────────────────────────────── */

function ParentView({ events }: { events: PtmEvent[] }) {
  // A family-operated pupil account books in the guardian's name.
  const { tenantId, actingAs } = useTenantContext();
  const me = actingAs;
  const kids = useScopedLearners();
  const allBookings = useCollection("ptmBookings").filter((b) => b.tenantId === tenantId);
  const tutorGroups = useCollection("tutorGroups").filter((g) => g.tenantId === tenantId);
  const relevant = events.filter((e) => kids.some((k) => e.yearGroups.includes(k.level)));
  const [eventId, setEventId] = useState(
    relevant.find((e) => e.bookingOpen)?.id ?? relevant[0]?.id ?? "",
  );
  const ev = relevant.find((e) => e.id === eventId);
  const eligibleKids = ev ? kids.filter((k) => ev.yearGroups.includes(k.level)) : [];
  const [childId, setChildId] = useState(eligibleKids[0]?.id ?? "");
  const child = eligibleKids.find((k) => k.id === childId) ?? eligibleKids[0];
  const [mode, setMode] = useState<PtmBooking["mode"]>("In person");

  const myBookings = allBookings.filter((b) => b.parentName === me);
  const evBookings = allBookings.filter((b) => b.eventId === ev?.id);
  const tutorOf = (k?: { group?: string }) => tutorGroups.find((g) => g.name === k?.group)?.tutor;
  const slots = useMemo(() => (ev ? ptmSlots(ev) : []), [ev]);

  const book = (teacher: string, time: string) => {
    if (!ev || !child) return;
    if (evBookings.some((b) => b.teacherName === teacher && b.time === time)) {
      toast.error("That slot has just been taken");
      return;
    }
    if (evBookings.some((b) => b.parentName === me && b.time === time)) {
      toast.error("You already have a meeting at that time");
      return;
    }
    if (
      evBookings.some(
        (b) => b.parentName === me && b.teacherName === teacher && b.studentId === child.id,
      )
    ) {
      toast.error(`You already have a slot with ${teacher} for ${child.name.split(" ")[0]}`);
      return;
    }
    addItem("ptmBookings", {
      id: nextId("PB-", "ptmBookings"),
      tenantId,
      eventId: ev.id,
      teacherName: teacher,
      time,
      parentName: me,
      studentId: child.id,
      mode,
    });
    toast.success(
      `Booked ${teacher} at ${time}${mode === "Online" ? " — video link emailed" : ""}`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Parent Meetings" subtitle="Book time with your children's teachers." />
      <PackContextBar pack="intl-school" />

      {myBookings.length > 0 && (
        <Section title="My appointments">
          <ul className="divide-y">
            {myBookings
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((b) => {
                const e = events.find((x) => x.id === b.eventId);
                const k = kids.find((x) => x.id === b.studentId);
                const past = !!e && e.date < DEMO_TODAY;
                return (
                  <li key={b.id} className="py-2.5 flex items-center gap-3">
                    <Avatar name={b.teacherName} size={30} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {b.teacherName} · {b.time}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {e?.name} · {e && fmtDay(e.date)} · about {k?.name}
                      </div>
                    </div>
                    <Badge tone={b.mode === "Online" ? "info" : "default"}>{b.mode}</Badge>
                    {past ? (
                      <Badge tone="muted">Held</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Cancel booking"
                        onClick={() => {
                          removeItem("ptmBookings", (x) => x.id === b.id);
                          toast.success("Booking cancelled");
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                );
              })}
          </ul>
        </Section>
      )}

      {relevant.length === 0 || !ev ? (
        <Section title="Book a meeting">
          <p className="text-sm text-muted-foreground">
            No meetings for your children's year groups right now.
          </p>
        </Section>
      ) : (
        <Section
          title="Book a meeting"
          description={
            ev.bookingOpen
              ? `${fmtDay(ev.date)} · ${ev.start}–${ev.end}`
              : "Booking for this event is closed"
          }
          actions={
            <Select
              value={ev.id}
              onChange={(e) => {
                setEventId(e.target.value);
                setChildId("");
              }}
              options={relevant.map((e) => ({ value: e.id, label: e.name }))}
              className="h-8 text-xs w-auto"
            />
          }
        >
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <Field label="Meeting about">
              <Select
                value={child?.id ?? ""}
                onChange={(e) => setChildId(e.target.value)}
                options={eligibleKids.map((k) => ({
                  value: k.id,
                  label: `${k.name} · ${k.level}`,
                }))}
                className="w-56"
              />
            </Field>
            {ev.mode !== "In person" && (
              <Field label="Format">
                <Select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as PtmBooking["mode"])}
                  options={(ev.mode === "Both" ? ["In person", "Online"] : ["Online"]).map((m) => ({
                    value: m,
                    label: m,
                  }))}
                  className="w-36"
                />
              </Field>
            )}
            {child && (
              <p className="text-[11px] text-muted-foreground pb-2">
                Tutor: {tutorOf(child) ?? "—"} — tutors are highlighted
              </p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {ev.teachers.map((t) => {
              const taken = evBookings.filter((b) => b.teacherName === t);
              const mineHere = taken.find((b) => b.parentName === me && b.studentId === child?.id);
              return (
                <div
                  key={t}
                  className={cn(
                    "rounded-lg border p-3",
                    tutorOf(child) === t && "border-primary/60 bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={t} size={28} />
                    <div className="text-sm font-medium truncate">{t}</div>
                  </div>
                  {mineHere ? (
                    <div className="text-xs rounded-md bg-success/15 text-success px-2 py-1.5">
                      Booked {mineHere.time} · {mineHere.mode}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {slots.map((s) => {
                        const busy = taken.some((b) => b.time === s);
                        const clash = evBookings.some((b) => b.parentName === me && b.time === s);
                        return (
                          <button
                            key={s}
                            disabled={!ev.bookingOpen || busy || clash}
                            onClick={() => book(t, s)}
                            title={
                              busy ? "Taken" : clash ? "You have another meeting then" : "Book"
                            }
                            className={cn(
                              "text-[11px] font-mono rounded px-1.5 py-0.5 border",
                              busy || clash
                                ? "bg-muted text-muted-foreground/50 line-through cursor-not-allowed"
                                : "hover:bg-primary hover:text-primary-foreground hover:border-primary",
                            )}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
