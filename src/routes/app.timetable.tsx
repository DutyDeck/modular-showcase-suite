import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BellRing,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  Download,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  Waves,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  DataTable,
  Field,
  TextInput,
  NumberInput,
  Select,
  FormDialog,
} from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PackContextBar, StatusPill, Tabs } from "@/components/packs/PackUI";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import {
  SCHOOL_PERIODS,
  TENANT_STAFF,
  WEEKDAYS,
  findClashes,
  freeTeachers,
  slotsOverlap,
  toMin,
  weekdayOf,
  type Room,
  type TimetableSlot,
} from "@/lib/packs/opsData";
import type { Weekday } from "@/lib/mockData";
import { availableDays, type ClassChange } from "@/lib/packs/sis/teaching";
import type { Channel } from "@/lib/packs/sis/shared";
import { logChange, notify } from "@/lib/packs/sis/activity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/timetable")({
  head: () => ({ meta: [{ title: "Timetable & Rooms — 1StudentID" }] }),
  component: TimetablePage,
});

type ViewBy = "group" | "teacher" | "room";

function TimetablePage() {
  const ctx = useTenantContext();
  const role = ctx.user?.role;
  if (role === "admin") return <AdminTimetable />;
  if (role === "teacher") return <TeacherTimetable />;
  return <LearnerTimetable />;
}

/* ── Shared ──────────────────────────────────────────────────────────────── */

function useTenantTimetable() {
  const ctx = useTenantContext();
  const allSlots = useCollection("timetableSlots");
  const allRooms = useCollection("rooms");
  const allChanges = useCollection("classChanges");
  const slots = useMemo(
    () => allSlots.filter((s) => s.tenantId === ctx.tenantId),
    [allSlots, ctx.tenantId],
  );
  const rooms = useMemo(
    () => allRooms.filter((r) => r.tenantId === ctx.tenantId),
    [allRooms, ctx.tenantId],
  );
  const changes = useMemo(
    () => allChanges.filter((c) => c.tenantId === ctx.tenantId),
    [allChanges, ctx.tenantId],
  );
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;
  return { ctx, slots, rooms, changes, roomName };
}

function staffPool(tenantId: string, slots: TimetableSlot[]): string[] {
  const names = new Set<string>([
    ...(TENANT_STAFF[tenantId] ?? []).map((s) => s.name),
    ...slots.map((s) => s.teacherName),
  ]);
  return [...names].sort();
}

/* Dates — the grid is a weekly pattern; class changes apply to one dated occurrence. */

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mondayOf(iso: string): string {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay(); // 0 Sun
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

function dateIn(weekStart: string, day: Weekday): string {
  return addDays(weekStart, WEEKDAYS.indexOf(day));
}

function fmtDay(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  return `${weekdayOf(iso)} ${d.getUTCDate()} ${d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}`;
}

const inWeek = (iso: string | undefined, weekStart: string) =>
  !!iso && iso >= weekStart && iso <= addDays(weekStart, 4);

function WeekNav({ weekStart, onChange }: { weekStart: string; onChange: (w: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onChange(addDays(weekStart, -7))}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs font-medium whitespace-nowrap">w/c {fmtDay(weekStart)}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onChange(addDays(weekStart, 7))}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** What actually runs on a date once cancellations, moves and room changes apply. */
function occupiedOn(
  date: string,
  slots: TimetableSlot[],
  changes: ClassChange[],
  excludeSlotId?: string,
) {
  const wd = weekdayOf(date);
  const out: { s: TimetableSlot; start: string; end: string; roomId: string }[] = [];
  for (const s of slots) {
    if (s.id === excludeSlotId || s.day !== wd) continue;
    const ch = changes.find((c) => c.slotId === s.id && c.date === date);
    if (ch && ch.kind !== "Room change") continue;
    out.push({ s, start: s.start, end: s.end, roomId: ch?.newRoomId ?? s.roomId });
  }
  for (const c of changes) {
    if (c.kind !== "Moved" || c.newDate !== date || c.slotId === excludeSlotId) continue;
    const s = slots.find((x) => x.id === c.slotId);
    if (s)
      out.push({
        s,
        start: c.newStart ?? s.start,
        end: c.newEnd ?? s.end,
        roomId: c.newRoomId ?? s.roomId,
      });
  }
  return out;
}

/** Clash reasons for one dated occurrence: same teacher, room, group or cohort. */
function occurrenceClashes(
  slot: TimetableSlot,
  date: string,
  start: string,
  end: string,
  roomId: string,
  slots: TimetableSlot[],
  changes: ClassChange[],
  roomName: (id: string) => string,
): string[] {
  const out: string[] = [];
  for (const o of occupiedOn(date, slots, changes, slot.id)) {
    if (!(toMin(start) < toMin(o.end) && toMin(o.start) < toMin(end))) continue;
    const when = `${fmtDay(date)} ${o.start}–${o.end}`;
    if (o.s.teacherName === slot.teacherName)
      out.push(`${slot.teacherName} teaches ${o.s.groupLabel} then (${when})`);
    if (o.roomId === roomId)
      out.push(`${roomName(roomId)} is booked by ${o.s.groupLabel} (${when})`);
    if (o.s.groupLabel === slot.groupLabel || o.s.cohorts?.some((c) => slot.cohorts?.includes(c)))
      out.push(`The class already has ${o.s.subject} (${when})`);
  }
  return [...new Set(out)];
}

/** Students in the class, plus guardians at schools and the teacher if someone else changed it. */
function affectedPeople(
  slot: TimetableSlot,
  learners: Learner[],
  isSchool: boolean,
  changedBy: string,
) {
  const students = learners.filter(
    (l) =>
      l.status === "Active" &&
      (slot.cohorts?.includes(l.group ?? "") || l.group === slot.groupLabel),
  );
  const people: { to: string; channel: Channel }[] = students.map((l) => ({
    to: l.name,
    channel: "App",
  }));
  if (isSchool) {
    const seen = new Set<string>();
    for (const l of students)
      for (const g of l.guardians ?? [])
        if (!seen.has(g)) {
          seen.add(g);
          people.push({ to: `${g} (parent of ${l.name})`, channel: "Email" });
        }
  }
  if (slot.teacherName !== changedBy) people.push({ to: slot.teacherName, channel: "App" });
  return { students, people };
}

/** Period grid for schools; day columns with stacked sessions otherwise.
 *  With a week, each card is a dated occurrence and shows its class change. */
function WeekGrid({
  slots,
  roomName,
  highlight,
  onDelete,
  onPick,
  weekStart,
  changes = [],
  emptyText = "Nothing timetabled",
}: {
  slots: TimetableSlot[];
  roomName: (id: string) => string;
  highlight?: (s: TimetableSlot, date?: string) => string | undefined;
  onDelete?: (s: TimetableSlot) => void;
  onPick?: (s: TimetableSlot, date: string) => void;
  weekStart?: string;
  changes?: ClassChange[];
  emptyText?: string;
}) {
  if (slots.length === 0)
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyText}</div>;
  const periodMode = slots.every((s) => s.period);
  const ids = new Set(slots.map((s) => s.id));
  const ghosts = weekStart
    ? changes.filter((c) => c.kind === "Moved" && ids.has(c.slotId) && inWeek(c.newDate, weekStart))
    : [];
  const ghostPeriod = (c: ClassChange) =>
    c.newPeriod ?? SCHOOL_PERIODS.find((p) => p.start === c.newStart)?.period;

  const Card = ({ s, date, ghost }: { s: TimetableSlot; date?: string; ghost?: ClassChange }) => {
    const ch =
      ghost || !date ? undefined : changes.find((c) => c.slotId === s.id && c.date === date);
    const note = highlight?.(s, date);
    const gone = ch && ch.kind !== "Room change";
    const newRoom = ghost
      ? ghost.newRoomId && ghost.newRoomId !== s.roomId
        ? ghost.newRoomId
        : undefined
      : ch?.kind === "Room change"
        ? ch.newRoomId
        : undefined;
    const pickDate = ghost ? ghost.date : date;
    return (
      <div
        onClick={onPick && pickDate ? () => onPick(s, pickDate) : undefined}
        title={onPick ? "Cancel, move or change room for this date" : undefined}
        className={cn(
          "group relative rounded-md border p-2 text-[11px] leading-tight bg-primary/5 border-primary/20",
          note && "bg-warning/15 border-warning/40",
          gone && "bg-muted/60 border-dashed border-muted-foreground/30",
          ghost && "bg-info/10 border-info/40 border-dashed",
          ch?.kind === "Room change" && "bg-info/10 border-info/40",
          onPick && "cursor-pointer hover:ring-2 hover:ring-primary/30",
        )}
      >
        <div
          className={cn(
            "font-semibold text-xs truncate",
            gone && "line-through text-muted-foreground",
          )}
        >
          {s.subject}
        </div>
        <div className={cn("text-muted-foreground truncate", gone && "line-through")}>
          {s.groupLabel} ·{" "}
          {newRoom ? (
            <>
              <span className="line-through">{roomName(s.roomId)}</span>{" "}
              <span className="text-info font-semibold">{roomName(newRoom)}</span>
            </>
          ) : (
            roomName(s.roomId)
          )}
        </div>
        <div className={cn("text-muted-foreground truncate", gone && "line-through")}>
          {s.teacherName}
        </div>
        {(!periodMode || ghost) && (
          <div className={cn("text-muted-foreground", gone && "line-through")}>
            {ghost ? `${ghost.newStart}–${ghost.newEnd}` : `${s.start}–${s.end}`}
          </div>
        )}
        {ch?.kind === "Cancelled" && (
          <div className="mt-1 font-semibold text-destructive">Cancelled</div>
        )}
        {ch?.kind === "Moved" && (
          <div className="mt-1 font-semibold text-warning-foreground">
            Moved → {fmtDay(ch.newDate)} {ch.newStart}
          </div>
        )}
        {ch?.kind === "Room change" && (
          <div className="mt-1 font-semibold text-info">Room change</div>
        )}
        {ghost && (
          <div className="mt-1 font-semibold text-info">Moved here from {fmtDay(ghost.date)}</div>
        )}
        {note && <div className="mt-1 text-warning-foreground font-medium">{note}</div>}
        {onDelete && !ghost && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(s);
            }}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            aria-label="Remove lesson"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  const slotById = (id: string) => slots.find((s) => s.id === id)!;

  if (periodMode) {
    return (
      <div className="overflow-x-auto -mx-4 sm:-mx-5">
        <table className="w-full min-w-[760px] text-sm border-separate border-spacing-1 px-3">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="w-20 text-left font-medium">Period</th>
              {WEEKDAYS.map((d) => (
                <th key={d} className="text-left font-medium">
                  {weekStart ? fmtDay(dateIn(weekStart, d)) : d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCHOOL_PERIODS.map((p) => (
              <tr key={p.period}>
                <td className="align-top text-[11px] text-muted-foreground pt-2">
                  <div className="font-semibold text-foreground">{p.period}</div>
                  {p.start}–{p.end}
                </td>
                {WEEKDAYS.map((d) => {
                  const date = weekStart ? dateIn(weekStart, d) : undefined;
                  const here = slots.filter((s) => s.day === d && s.period === p.period);
                  const moved = ghosts.filter(
                    (c) => c.newDate === date && ghostPeriod(c) === p.period,
                  );
                  return (
                    <td key={d} className="align-top h-16 rounded-md bg-muted/30">
                      <div className="space-y-1">
                        {here.map((s) => (
                          <Card key={s.id} s={s} date={date} />
                        ))}
                        {moved.map((c) => (
                          <Card key={c.id} s={slotById(c.slotId)} ghost={c} />
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {WEEKDAYS.map((d) => {
        const date = weekStart ? dateIn(weekStart, d) : undefined;
        const here = [
          ...slots.filter((s) => s.day === d).map((s) => ({ s, start: s.start, ghost: undefined })),
          ...ghosts
            .filter((c) => c.newDate === date)
            .map((c) => ({ s: slotById(c.slotId), start: c.newStart ?? "", ghost: c })),
        ].sort((a, b) => toMin(a.start) - toMin(b.start));
        return (
          <div key={d} className="rounded-lg bg-muted/30 p-2 space-y-1.5 min-h-24">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {date ? fmtDay(date) : d}
            </div>
            {here.length === 0 && <div className="text-[11px] text-muted-foreground">—</div>}
            {here.map(({ s, ghost }) => (
              <Card key={ghost?.id ?? s.id} s={s} date={date} ghost={ghost} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Class changes touching the visible week for the given slots. */
function ChangesThisWeek({
  slots,
  changes,
  weekStart,
  roomName,
  onPick,
}: {
  slots: TimetableSlot[];
  changes: ClassChange[];
  weekStart: string;
  roomName: (id: string) => string;
  onPick?: (s: TimetableSlot, date: string) => void;
}) {
  const ids = new Set(slots.map((s) => s.id));
  const rows = changes
    .filter((c) => ids.has(c.slotId) && (inWeek(c.date, weekStart) || inWeek(c.newDate, weekStart)))
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Section
      title="Changes this week"
      description="Cancellations, moves and room changes. Everyone affected is notified."
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changes this week.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => {
            const s = slots.find((x) => x.id === c.slotId)!;
            return (
              <li
                key={c.id}
                onClick={onPick ? () => onPick(s, c.date) : undefined}
                className={cn(
                  "flex flex-wrap items-start gap-3 rounded-md border p-2.5 text-sm",
                  onPick && "cursor-pointer hover:bg-muted/40",
                )}
              >
                <Badge
                  tone={
                    c.kind === "Cancelled" ? "destructive" : c.kind === "Moved" ? "warning" : "info"
                  }
                >
                  {c.kind}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {s.subject} · {s.groupLabel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDay(c.date)} {s.start}–{s.end} · {roomName(s.roomId)}
                    {c.kind === "Moved" &&
                      ` → ${fmtDay(c.newDate)} ${c.newStart}–${c.newEnd} · ${roomName(c.newRoomId ?? s.roomId)}`}
                    {c.kind === "Room change" && ` → ${roomName(c.newRoomId ?? "")}`}
                  </div>
                  <div className="text-xs mt-0.5">{c.reason}</div>
                </div>
                <div className="text-[11px] text-muted-foreground text-right">
                  {c.by}
                  <div className="flex items-center gap-1 justify-end">
                    <BellRing className="h-3 w-3" /> {c.notified} notified
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/** Cancel / move / change room for one dated occurrence, or undo an existing change. */
function ClassChangeDialog({
  pick,
  onClose,
  slots,
  rooms,
  changes,
  roomName,
}: {
  pick: { s: TimetableSlot; date: string };
  onClose: () => void;
  slots: TimetableSlot[];
  rooms: Room[];
  changes: ClassChange[];
  roomName: (id: string) => string;
}) {
  const ctx = useTenantContext();
  const me = ctx.user?.name ?? "";
  const learners = useScopedLearners();
  const { s, date } = pick;
  const periodMode = !!s.period;
  const existing = changes.find((c) => c.slotId === s.id && c.date === date);
  const [kind, setKind] = useState<ClassChange["kind"]>("Cancelled");
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState(date);
  const [newPeriod, setNewPeriod] = useState(s.period ?? "P1");
  const [newStart, setNewStart] = useState(s.start);
  const [newEnd, setNewEnd] = useState(s.end);
  const [newRoomId, setNewRoomId] = useState(s.roomId);
  const [problems, setProblems] = useState<string[]>([]);
  const { students, people } = affectedPeople(s, learners, ctx.type === "school", me);
  const classSize = students.length;

  const p = SCHOOL_PERIODS.find((x) => x.period === newPeriod);
  const target =
    kind === "Moved"
      ? {
          date: newDate,
          start: periodMode ? (p?.start ?? s.start) : newStart,
          end: periodMode ? (p?.end ?? s.end) : newEnd,
          roomId: newRoomId,
        }
      : { date, start: s.start, end: s.end, roomId: newRoomId };

  const roomState = (r: Room) => {
    const busy = occupiedOn(target.date, slots, changes, s.id).some(
      (o) =>
        o.roomId === r.id &&
        toMin(target.start) < toMin(o.end) &&
        toMin(o.start) < toMin(target.end),
    );
    if (busy) return "booked";
    if (r.capacity < classSize) return "too small";
    return "free";
  };

  const send = (subject: string, body: string, relatedId: string) =>
    people.forEach((x) =>
      notify({
        tenantId: ctx.tenantId,
        channel: x.channel,
        to: x.to,
        subject,
        body,
        source: "Timetable · class changes",
        relatedId,
      }),
    );

  const occurrenceLabel = `${fmtDay(date)} ${s.start}–${s.end} · ${roomName(s.roomId)}`;

  const undo = () => {
    if (!existing) return;
    removeItem("classChanges", (c) => c.id === existing.id);
    send(
      `Back on as normal: ${s.subject} (${s.groupLabel}) — ${fmtDay(date)} ${s.start}`,
      `The ${existing.kind.toLowerCase()} for this class has been withdrawn. It runs as timetabled: ${occurrenceLabel}.`,
      existing.id,
    );
    logChange({
      tenantId: ctx.tenantId,
      entity: "timetableSlot",
      entityId: s.id,
      field: `Occurrence ${date}`,
      from: existing.kind,
      to: "As timetabled",
      by: me,
    });
    toast.success(`Change withdrawn — ${people.length} people notified`);
    onClose();
  };

  const submit = () => {
    if (existing) return undo();
    if (!reason.trim()) {
      setProblems(["Add a short reason — it goes in the notification."]);
      return;
    }
    const found: string[] = [];
    if (kind === "Moved") {
      const wd = weekdayOf(target.date);
      if (!WEEKDAYS.includes(wd)) found.push("Pick a weekday.");
      if (toMin(target.end) <= toMin(target.start)) found.push("End time must be after start.");
      if (target.date === date && target.start === s.start && target.roomId === s.roomId)
        found.push("Nothing changes — pick a new date, time or room.");
    }
    if (kind === "Room change" && newRoomId === s.roomId) found.push("Pick a different room.");
    if (kind !== "Cancelled") {
      found.push(
        ...occurrenceClashes(
          s,
          target.date,
          target.start,
          target.end,
          target.roomId,
          slots,
          changes,
          roomName,
        ),
      );
      const room = rooms.find((r) => r.id === target.roomId);
      if (room && room.capacity < classSize)
        found.push(`${room.name} holds ${room.capacity}; the class has ${classSize}.`);
    }
    if (found.length) {
      setProblems(found);
      return;
    }
    const id = nextId("CC-", "classChanges");
    const change: ClassChange = {
      id,
      tenantId: ctx.tenantId,
      slotId: s.id,
      date,
      kind,
      ...(kind === "Moved"
        ? {
            newDate: target.date,
            newStart: target.start,
            newEnd: target.end,
            newRoomId: target.roomId,
            newPeriod: periodMode ? newPeriod : undefined,
          }
        : {}),
      ...(kind === "Room change" ? { newRoomId } : {}),
      reason: reason.trim(),
      by: me,
      at: new Date().toISOString(),
      notified: people.length,
    };
    addItem("classChanges", change);
    const what =
      kind === "Cancelled"
        ? "cancelled"
        : kind === "Moved"
          ? `moved to ${fmtDay(target.date)} ${target.start}–${target.end}, ${roomName(target.roomId)}`
          : `moving to ${roomName(newRoomId)}`;
    send(
      `${kind}: ${s.subject} (${s.groupLabel}) — ${fmtDay(date)} ${s.start}`,
      `${s.subject} on ${fmtDay(date)} at ${s.start} is ${what}. ${reason.trim()}`,
      id,
    );
    logChange({
      tenantId: ctx.tenantId,
      entity: "timetableSlot",
      entityId: s.id,
      field: `Occurrence ${date}`,
      from: occurrenceLabel,
      to:
        kind === "Cancelled"
          ? "Cancelled"
          : `${fmtDay(target.date)} ${target.start}–${target.end} · ${roomName(target.roomId)}`,
      by: me,
      reason: reason.trim(),
    });
    toast.success(`${s.subject} ${what}`, {
      description: `${people.length} people notified (${classSize} students${ctx.type === "school" ? " and their parents" : ""}).`,
    });
    onClose();
  };

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`${s.subject} · ${s.groupLabel}`}
      description={occurrenceLabel}
      onSubmit={submit}
      submitLabel={
        existing ? "Undo change" : kind === "Cancelled" ? "Cancel class" : "Check & save"
      }
      submitVariant={existing || kind === "Cancelled" ? "destructive" : "primary"}
      cancelLabel="Close"
    >
      {existing ? (
        <div className="sm:col-span-2 rounded-md border p-3 text-sm space-y-1">
          <div className="font-semibold">
            {existing.kind}
            {existing.kind === "Moved" &&
              ` → ${fmtDay(existing.newDate)} ${existing.newStart}–${existing.newEnd}, ${roomName(existing.newRoomId ?? s.roomId)}`}
            {existing.kind === "Room change" && ` → ${roomName(existing.newRoomId ?? "")}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {existing.reason} · by {existing.by} · {existing.notified} notified
          </div>
          <div className="text-xs">Undo puts the class back as timetabled and tells everyone.</div>
        </div>
      ) : (
        <>
          <Field label="Change" className="sm:col-span-2">
            <div className="flex gap-1.5">
              {(["Cancelled", "Moved", "Room change"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setKind(k);
                    setProblems([]);
                  }}
                  className={cn(
                    "flex-1 h-9 rounded-md border text-xs font-medium",
                    kind === k ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  {k === "Cancelled" ? "Cancel" : k === "Moved" ? "Move" : "Room change"}
                </button>
              ))}
            </div>
          </Field>
          {kind === "Moved" && (
            <>
              <Field label="New date">
                <TextInput
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </Field>
              {periodMode ? (
                <Field label="Period">
                  <Select
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(e.target.value)}
                    options={SCHOOL_PERIODS.map((x) => ({
                      value: x.period,
                      label: `${x.period} · ${x.start}–${x.end}`,
                    }))}
                  />
                </Field>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start">
                    <TextInput
                      type="time"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                    />
                  </Field>
                  <Field label="End">
                    <TextInput
                      type="time"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </>
          )}
          {kind !== "Cancelled" && (
            <Field
              label="Room"
              className="sm:col-span-2"
              hint={`Class size ${classSize}. Rooms booked at that time or too small are marked.`}
            >
              <Select
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                options={rooms.map((r) => {
                  const st = r.id === s.roomId && kind === "Room change" ? "current" : roomState(r);
                  return {
                    value: r.id,
                    label: `${r.name} (${r.capacity})${st === "free" ? "" : ` — ${st}`}`,
                  };
                })}
              />
            </Field>
          )}
          <Field label="Reason" className="sm:col-span-2" required>
            <TextInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Lecturer unwell — notes on the VLE"
            />
          </Field>
          <div className="sm:col-span-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <BellRing className="h-3.5 w-3.5" />
            Notifies {people.length}: {classSize} students
            {ctx.type === "school" ? ", their parents" : ""}
            {s.teacherName !== me ? ` and ${s.teacherName}` : ""}.
          </div>
        </>
      )}
      {problems.length > 0 && (
        <div className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs space-y-1">
          <div className="font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Can't save this change
          </div>
          {problems.map((c) => (
            <div key={c}>• {c}</div>
          ))}
        </div>
      )}
    </FormDialog>
  );
}

/** Per-teacher timetabled hours vs contract (school tenants). */
function SchoolStaffing({ slots }: { slots: TimetableSlot[] }) {
  const ctx = useTenantContext();
  const profiles = useCollection("staffTeachingProfiles").filter(
    (p) => p.tenantId === ctx.tenantId,
  );
  const covers = useCollection("coverRequests").filter(
    (c) => c.tenantId === ctx.tenantId && c.status === "Covered" && c.date >= DEMO_TODAY,
  );
  const roleOf = (n: string) => TENANT_STAFF[ctx.tenantId]?.find((x) => x.name === n)?.role;
  const rows = staffPool(ctx.tenantId, slots)
    .map((name) => {
      const mine = slots.filter((s) => s.teacherName === name);
      const hours = mine.reduce((h, s) => h + (toMin(s.end) - toMin(s.start)) / 60, 0);
      const prof = profiles.find((p) => p.staffName === name);
      const contract = prof?.contractHours ?? 0;
      const pct = contract ? Math.round((hours / contract) * 100) : undefined;
      const days = prof ? availableDays(prof.availability) : WEEKDAYS;
      const offDays = [...new Set(mine.map((s) => s.day))].filter((d) => !days.includes(d));
      return {
        name,
        role: roleOf(name),
        mine,
        hours,
        contract,
        pct,
        prof,
        offDays,
        cover: covers.filter((c) => c.coverTeacher === name).length,
      };
    })
    .filter((r) => r.mine.length || r.prof)
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  const over = rows.filter((r) => (r.pct ?? 0) > 100);

  return (
    <Section
      title="Staffing & teaching load"
      description="Timetabled hours a week against each teacher's contract."
      actions={
        over.length ? (
          <Badge tone="destructive">{over.length} over contract</Badge>
        ) : (
          <Badge tone="success">Everyone within contract</Badge>
        )
      }
    >
      <DataTable
        columns={[
          { key: "name", label: "Teacher" },
          { key: "hours", label: "Hours / wk" },
          { key: "load", label: "Load vs contract" },
          { key: "teaches", label: "Teaches" },
          { key: "avail", label: "Availability" },
          { key: "cover", label: "Cover" },
        ]}
        rows={rows}
        renderCell={(r: (typeof rows)[number], key) => {
          if (key === "name")
            return (
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">{r.role ?? "—"}</div>
              </div>
            );
          if (key === "hours")
            return (
              <span className="tabular-nums">
                {r.hours.toFixed(0)}
                {r.contract ? ` / ${r.contract}` : ""}
              </span>
            );
          if (key === "load")
            return r.pct === undefined ? (
              <span className="text-xs text-muted-foreground">No contract on file</span>
            ) : (
              <div className="flex items-center gap-2 min-w-36">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      r.pct > 100 ? "bg-destructive" : r.pct >= 90 ? "bg-warning" : "bg-success",
                    )}
                    style={{ width: `${Math.min(r.pct, 100)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs w-10 text-right",
                    r.pct > 100 && "text-destructive font-semibold",
                  )}
                >
                  {r.pct}%
                </span>
                {r.pct > 100 && <Badge tone="destructive">Over</Badge>}
              </div>
            );
          if (key === "teaches")
            return (
              <div className="text-xs">
                {[...new Set(r.mine.map((s) => s.subject))].join(", ") || "—"}
                <div className="text-[11px] text-muted-foreground">
                  {[...new Set(r.mine.map((s) => s.groupLabel))].join(", ")}
                </div>
              </div>
            );
          if (key === "avail")
            return (
              <div className="text-xs">
                {r.prof?.availability ?? "—"}
                {r.offDays.length > 0 && (
                  <div className="text-destructive text-[11px]">
                    Timetabled on {r.offDays.join(", ")}
                  </div>
                )}
              </div>
            );
          if (key === "cover") return r.cover ? `${r.cover} upcoming` : "—";
          return null;
        }}
      />
    </Section>
  );
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

function AdminTimetable() {
  const { ctx, slots, rooms, changes, roomName } = useTenantTimetable();
  const covers = useCollection("coverRequests").filter((c) => c.tenantId === ctx.tenantId);
  const [tab, setTab] = useState<"grid" | "rooms" | "cover" | "staffing">("grid");
  const [weekStart, setWeekStart] = useState(mondayOf(DEMO_TODAY));
  const [pick, setPick] = useState<{ s: TimetableSlot; date: string } | null>(null);
  const [viewBy, setViewBy] = useState<ViewBy>("group");
  const groups = [...new Set(slots.map((s) => s.groupLabel))].sort();
  const teachers = [...new Set(slots.map((s) => s.teacherName))].sort();
  const [filter, setFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [roomEdit, setRoomEdit] = useState<{ room?: Room } | null>(null);
  const [roomDelete, setRoomDelete] = useState<Room | null>(null);

  const options =
    viewBy === "group" ? groups : viewBy === "teacher" ? teachers : rooms.map((r) => r.id);
  const current = options.includes(filter) ? filter : (options[0] ?? "");
  const shown = slots.filter((s) =>
    viewBy === "group"
      ? s.groupLabel === current
      : viewBy === "teacher"
        ? s.teacherName === current
        : s.roomId === current,
  );
  const open = covers.filter((c) => c.status === "Open");
  const periodMode = ctx.type === "school";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timetable & Rooms"
        subtitle={
          periodMode
            ? "Period timetable for every tutor group, with room bookings, clash checks and cover for absent teachers."
            : "Lecture, lab and class timetable by cohort, with room bookings, clash checks and cover."
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Download className="h-4 w-4" /> Import
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add lesson
            </Button>
          </>
        }
      />
      <PackContextBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Timetabled sessions / week"
          value={slots.length}
          icon={<CalendarRange className="h-4 w-4" />}
        />
        <StatCard
          label={periodMode ? "Groups" : "Cohorts / groups"}
          value={groups.length}
          accent="info"
        />
        <StatCard
          label="Rooms"
          value={rooms.length}
          accent="success"
          icon={<DoorClosed className="h-4 w-4" />}
        />
        <StatCard
          label="Open cover requests"
          value={open.length}
          accent={open.length ? "warning" : "success"}
          icon={<UserX className="h-4 w-4" />}
        />
      </div>

      <Tabs
        tabs={[
          { id: "grid", label: "Timetable" },
          { id: "rooms", label: "Rooms", count: rooms.length },
          { id: "cover", label: "Cover", count: open.length },
          ...(periodMode ? [{ id: "staffing" as const, label: "Staffing" }] : []),
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "grid" && (
        <Section
          title="Weekly timetable"
          description="Click a class to cancel, move or change its room for that date."
          actions={
            <>
              <WeekNav weekStart={weekStart} onChange={setWeekStart} />
              <Select
                value={viewBy}
                onChange={(e) => {
                  setViewBy(e.target.value as ViewBy);
                  setFilter("");
                }}
                options={[
                  { value: "group", label: "By group" },
                  { value: "teacher", label: "By teacher" },
                  { value: "room", label: "By room" },
                ]}
                className="h-8 w-32"
              />
              <Select
                value={current}
                onChange={(e) => setFilter(e.target.value)}
                options={options.map((o) => ({
                  value: o,
                  label: viewBy === "room" ? roomName(o) : o,
                }))}
                className="h-8 w-56"
              />
            </>
          }
        >
          <WeekGrid
            slots={shown}
            roomName={roomName}
            weekStart={weekStart}
            changes={changes}
            onPick={(s, date) => setPick({ s, date })}
            onDelete={(s) => {
              removeItem("timetableSlots", (x) => x.id === s.id);
              toast.success(`Removed ${s.subject} (${s.groupLabel}, ${s.day} ${s.start})`);
            }}
            emptyText="No timetable yet — add lessons or import from your timetabling tool."
          />
        </Section>
      )}
      {tab === "grid" && (
        <ChangesThisWeek
          slots={slots}
          changes={changes}
          weekStart={weekStart}
          roomName={roomName}
          onPick={(s, date) => setPick({ s, date })}
        />
      )}
      {tab === "staffing" && periodMode && <SchoolStaffing slots={slots} />}
      {pick && (
        <ClassChangeDialog
          key={`${pick.s.id}|${pick.date}`}
          pick={pick}
          onClose={() => setPick(null)}
          slots={slots}
          rooms={rooms}
          changes={changes}
          roomName={roomName}
        />
      )}

      {tab === "rooms" && (
        <Section
          title="Rooms"
          description="Utilisation = booked hours ÷ teaching hours in the week."
          actions={
            <Button size="sm" variant="outline" onClick={() => setRoomEdit({})}>
              <Plus className="h-3.5 w-3.5" /> Add room
            </Button>
          }
        >
          <DataTable
            columns={[
              { key: "name", label: "Room" },
              { key: "building", label: "Building" },
              { key: "type", label: "Type" },
              { key: "capacity", label: "Capacity" },
              { key: "sessions", label: "Sessions / wk" },
              { key: "util", label: "Utilisation" },
              { key: "_actions", label: "" },
            ]}
            rows={rooms}
            emptyText="No rooms yet — add your first room."
            renderCell={(r: Room, key) => {
              if (key === "_actions")
                return (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRoomEdit({ room: r })}
                      aria-label={`Edit ${r.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRoomDelete(r)}
                      aria-label={`Delete ${r.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              const mine = slots.filter((s) => s.roomId === r.id);
              const hours = mine.reduce((h, s) => h + (toMin(s.end) - toMin(s.start)) / 60, 0);
              const week = periodMode ? 30 : 40;
              const pct = Math.round((hours / week) * 100);
              if (key === "sessions") return mine.length;
              if (key === "util")
                return (
                  <div className="flex items-center gap-2 min-w-32">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pct > 75 ? "bg-warning" : "bg-primary",
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs w-9 text-right">{pct}%</span>
                  </div>
                );
              return String((r as unknown as Record<string, unknown>)[key] ?? "");
            }}
          />
        </Section>
      )}

      {tab === "cover" && <CoverPanel slots={slots} roomName={roomName} />}

      <AddSlotDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        slots={slots}
        rooms={rooms}
        periodMode={periodMode}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        lessons={slots.length}
        type={ctx.type}
      />
      {roomEdit && (
        <RoomDialog
          key={roomEdit.room?.id ?? "new"}
          room={roomEdit.room}
          rooms={rooms}
          tenantId={ctx.tenantId}
          onClose={() => setRoomEdit(null)}
        />
      )}
      {roomDelete && (
        <DeleteRoomDialog
          key={roomDelete.id}
          room={roomDelete}
          rooms={rooms}
          slots={slots}
          roomName={roomName}
          onClose={() => setRoomDelete(null)}
        />
      )}
    </div>
  );
}

function AddSlotDialog({
  open,
  onOpenChange,
  slots,
  rooms,
  periodMode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slots: TimetableSlot[];
  rooms: Room[];
  periodMode: boolean;
}) {
  const ctx = useTenantContext();
  const pool = staffPool(ctx.tenantId, slots);
  const groups = [...new Set(slots.map((s) => s.groupLabel))].sort();
  const [day, setDay] = useState<Weekday>("Mon");
  const [period, setPeriod] = useState("P6");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [group, setGroup] = useState(groups[0] ?? "");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState(pool[0] ?? "");
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [clashes, setClashes] = useState<string[]>([]);

  const submit = () => {
    const p = SCHOOL_PERIODS.find((x) => x.period === period)!;
    const draft: TimetableSlot = {
      id: "new",
      tenantId: ctx.tenantId,
      day,
      start: periodMode ? p.start : start,
      end: periodMode ? p.end : end,
      period: periodMode ? period : undefined,
      groupLabel: group.trim(),
      subject: subject.trim() || "Lesson",
      teacherName: teacher,
      roomId,
      cohorts: periodMode ? [group.trim()] : slots.find((s) => s.groupLabel === group)?.cohorts,
    };
    if (!draft.groupLabel) {
      toast.error("Choose a group");
      return;
    }
    if (toMin(draft.end) <= toMin(draft.start)) {
      setClashes(["The end time must be after the start time."]);
      return;
    }
    const found = findClashes(draft, slots, (id) => rooms.find((r) => r.id === id)?.name ?? id);
    if (found.length) {
      setClashes(found);
      toast.error("Clash detected — lesson not added");
      return;
    }
    const id = nextId(`TT-${ctx.tenantId.slice(3)}-`, "timetableSlots");
    addItem("timetableSlots", { ...draft, id });
    toast.success(`Added ${draft.subject} for ${draft.groupLabel} — ${day} ${draft.start}`);
    setClashes([]);
    setSubject("");
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(v) => {
        setClashes([]);
        onOpenChange(v);
      }}
      title="Add lesson"
      description="Clash checks run against the same teacher, room and group."
      onSubmit={submit}
      submitLabel="Check & add"
    >
      <Field label="Day">
        <Select
          value={day}
          onChange={(e) => setDay(e.target.value as Weekday)}
          options={WEEKDAYS.map((d) => ({ value: d, label: d }))}
        />
      </Field>
      {periodMode ? (
        <Field label="Period">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={SCHOOL_PERIODS.map((p) => ({
              value: p.period,
              label: `${p.period} · ${p.start}–${p.end}`,
            }))}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start">
            <TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End">
            <TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      )}
      <Field label={periodMode ? "Group" : "Group / module session"}>
        <TextInput list="tt-groups" value={group} onChange={(e) => setGroup(e.target.value)} />
        <datalist id="tt-groups">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </Field>
      <Field label="Subject">
        <TextInput
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. IGCSE Chemistry"
        />
      </Field>
      <Field label="Teacher">
        <Select
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          options={pool.map((t) => ({ value: t, label: t }))}
        />
      </Field>
      <Field label="Room">
        <Select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          options={rooms.map((r) => ({ value: r.id, label: `${r.name} (${r.capacity})` }))}
        />
      </Field>
      {clashes.length > 0 && (
        <div className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs space-y-1">
          <div className="font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Can't add this lesson
          </div>
          {clashes.map((c) => (
            <div key={c}>• {c}</div>
          ))}
        </div>
      )}
    </FormDialog>
  );
}

const ROOM_TYPES: Room["type"][] = [
  "Classroom",
  "Lab",
  "Lecture theatre",
  "Seminar room",
  "Studio",
  "Workshop",
  "Sports",
];

/** Add a room, or edit one (all fields). */
function RoomDialog({
  room,
  rooms,
  tenantId,
  onClose,
}: {
  room?: Room;
  rooms: Room[];
  tenantId: string;
  onClose: () => void;
}) {
  const ctx = useTenantContext();
  const me = ctx.user?.name ?? "";
  const [name, setName] = useState(room?.name ?? "");
  const [building, setBuilding] = useState(room?.building ?? "");
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 30));
  const [type, setType] = useState<Room["type"]>(room?.type ?? "Classroom");

  const submit = () => {
    const n = name.trim();
    const cap = Number(capacity);
    if (!n) return toast.error("Room name is required");
    if (!Number.isFinite(cap) || cap < 1) return toast.error("Capacity must be at least 1");
    if (rooms.some((r) => r.id !== room?.id && r.name.toLowerCase() === n.toLowerCase()))
      return toast.error(`There is already a room called ${n}`);
    const next = { name: n, building: building.trim() || "Main", capacity: cap, type };
    if (room) {
      updateItem("rooms", (r) => r.id === room.id, next);
      (Object.keys(next) as (keyof typeof next)[])
        .filter((k) => String(room[k]) !== String(next[k]))
        .forEach((k) =>
          logChange({
            tenantId,
            entity: "room",
            entityId: room.id,
            field: k,
            from: String(room[k]),
            to: String(next[k]),
            by: me,
          }),
        );
      toast.success(`Room ${n} updated`);
    } else {
      const id = nextId(`ROOM-${tenantId.slice(2)}-`, "rooms");
      addItem("rooms", { id, tenantId, ...next });
      logChange({
        tenantId,
        entity: "room",
        entityId: id,
        field: "Room",
        to: `${n} · ${next.building} · ${type} · ${cap}`,
        by: me,
      });
      toast.success(`Room ${n} added`);
    }
    onClose();
  };

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={room ? `Edit ${room.name}` : "Add room"}
      onSubmit={submit}
      submitLabel={room ? "Save" : "Add room"}
    >
      <Field label="Name" required>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Building">
        <TextInput value={building} onChange={(e) => setBuilding(e.target.value)} />
      </Field>
      <Field label="Capacity" required>
        <NumberInput min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </Field>
      <Field label="Type">
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as Room["type"])}
          options={ROOM_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </Field>
    </FormDialog>
  );
}

/** Delete a room. Blocked while classes, cover or exams use it — unless they move first. */
function DeleteRoomDialog({
  room,
  rooms,
  slots,
  roomName,
  onClose,
}: {
  room: Room;
  rooms: Room[];
  slots: TimetableSlot[];
  roomName: (id: string) => string;
  onClose: () => void;
}) {
  const ctx = useTenantContext();
  const me = ctx.user?.name ?? "";
  const covers = useCollection("coverRequests").filter(
    (c) => c.tenantId === ctx.tenantId && c.status === "Open",
  );
  const sittings = useCollection("examSittings").filter(
    (x) => x.tenantId === ctx.tenantId && x.roomIds.includes(room.id),
  );
  const changes = useCollection("classChanges").filter(
    (c) => c.tenantId === ctx.tenantId && c.newRoomId === room.id,
  );
  const inRoom = slots.filter((s) => s.roomId === room.id);
  const openCover = covers.filter((c) => inRoom.some((s) => s.id === c.slotId));
  const others = rooms.filter((r) => r.id !== room.id);
  const [target, setTarget] = useState(
    others.find((r) => r.type === room.type && r.capacity >= room.capacity)?.id ??
      others[0]?.id ??
      "",
  );
  const [problems, setProblems] = useState<string[]>([]);
  const used = inRoom.length + sittings.length + changes.length;

  const remove = () => {
    removeItem("rooms", (r) => r.id === room.id);
    logChange({
      tenantId: ctx.tenantId,
      entity: "room",
      entityId: room.id,
      field: "Room",
      from: `${room.name} · ${room.building} · ${room.type} · ${room.capacity}`,
      to: "Deleted",
      by: me,
    });
  };

  const submit = () => {
    if (!used) {
      remove();
      toast.success(`Room ${room.name} deleted`);
      onClose();
      return;
    }
    const to = rooms.find((r) => r.id === target);
    if (!to) {
      setProblems(["Pick a room to move everything to."]);
      return;
    }
    // Every moved class must fit the new room without a clash.
    const moved = slots.map((s) => (s.roomId === room.id ? { ...s, roomId: to.id } : s));
    const found = inRoom.flatMap((s) =>
      findClashes({ ...s, roomId: to.id }, moved, roomName).filter((m) =>
        m.startsWith(roomName(to.id)),
      ),
    );
    if (found.length) {
      setProblems([...new Set(found)]);
      return;
    }
    inRoom.forEach((s) => updateItem("timetableSlots", (x) => x.id === s.id, { roomId: to.id }));
    sittings.forEach((x) =>
      updateItem("examSittings", (y) => y.id === x.id, {
        roomIds: [...new Set(x.roomIds.map((r) => (r === room.id ? to.id : r)))],
      }),
    );
    changes.forEach((c) => updateItem("classChanges", (y) => y.id === c.id, { newRoomId: to.id }));
    logChange({
      tenantId: ctx.tenantId,
      entity: "room",
      entityId: room.id,
      field: "Bookings",
      from: room.name,
      to: `${to.name} (${inRoom.length} classes, ${sittings.length} exams, ${changes.length} changes)`,
      by: me,
    });
    remove();
    toast.success(`Moved to ${to.name} and deleted ${room.name}`, {
      description: `${inRoom.length} class(es) and ${sittings.length} exam sitting(s) moved.`,
    });
    onClose();
  };

  const small = rooms.find((r) => r.id === target);
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Delete ${room.name}`}
      description={`${room.building} · ${room.type} · ${room.capacity} seats`}
      onSubmit={submit}
      submitLabel={used ? "Move & delete" : "Delete room"}
      submitVariant="destructive"
    >
      {used === 0 ? (
        <p className="sm:col-span-2 text-sm">Nothing is booked in this room. It can be deleted.</p>
      ) : (
        <>
          <div className="sm:col-span-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs space-y-1">
            <div className="font-semibold">This room is in use, so it can't just be deleted:</div>
            {inRoom.length > 0 && <div>• {inRoom.length} timetabled class(es) a week</div>}
            {openCover.length > 0 && (
              <div>• {openCover.length} open cover request(s) for those classes</div>
            )}
            {sittings.length > 0 && <div>• {sittings.length} exam sitting(s)</div>}
            {changes.length > 0 && <div>• {changes.length} class change(s) moving into it</div>}
          </div>
          <Field label="Move its classes to…" className="sm:col-span-2">
            <Select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setProblems([]);
              }}
              options={others.map((r) => ({
                value: r.id,
                label: `${r.name} (${r.type}, ${r.capacity})`,
              }))}
            />
          </Field>
          {small && small.capacity < room.capacity && (
            <div className="sm:col-span-2 text-xs text-warning-foreground">
              {small.name} has {room.capacity - small.capacity} fewer seats.
            </div>
          )}
        </>
      )}
      {problems.length > 0 && (
        <div className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs space-y-1">
          <div className="font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Can't move — the new room clashes
          </div>
          {problems.map((c) => (
            <div key={c}>• {c}</div>
          ))}
        </div>
      )}
    </FormDialog>
  );
}

const IMPORT_SOURCES = [
  { name: "aSc Timetables", note: "Schools — XML export", for: ["school"] },
  { name: "Untis", note: "Schools & colleges — GPU / XML", for: ["school", "college"] },
  { name: "Celcat", note: "Universities — Timetabler API", for: ["university", "college"] },
  {
    name: "Syllabus Plus (Scientia)",
    note: "Universities — Enterprise timetabling",
    for: ["university"],
  },
  {
    name: "CSV template",
    note: "Any institution",
    for: ["school", "university", "college", "tuition", "club"],
  },
];

function ImportDialog({
  open,
  onOpenChange,
  lessons,
  type,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lessons: number;
  type: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import timetable</DialogTitle>
          <DialogDescription>
            Keep using the timetabling tool you already have — 1StudentID imports the published
            timetable and runs the same clash checks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {IMPORT_SOURCES.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {s.name}
                  {s.for.includes(type) && <Badge tone="success">Recommended</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground">{s.note}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  toast.success(`${s.name}: ${lessons} lessons validated`, {
                    description:
                      "0 clashes · 0 unknown rooms · timetable already in sync (demo import).",
                  });
                }}
              >
                Import
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CoverPanel({
  slots,
  roomName,
}: {
  slots: TimetableSlot[];
  roomName: (id: string) => string;
}) {
  const ctx = useTenantContext();
  const all = useCollection("coverRequests");
  const covers = all
    .filter((c) => c.tenantId === ctx.tenantId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const pool = staffPool(ctx.tenantId, slots);
  const [absOpen, setAbsOpen] = useState(false);
  const [teacher, setTeacher] = useState(
    pool.find((p) => slots.some((s) => s.teacherName === p)) ?? "",
  );
  const [date, setDate] = useState("2026-11-04");
  const [reason, setReason] = useState("Illness");
  const [pickFor, setPickFor] = useState<Record<string, string>>({});

  const recordAbsence = () => {
    const wd = weekdayOf(date);
    const theirs = slots.filter((s) => s.teacherName === teacher && s.day === wd);
    if (!theirs.length) {
      toast.info(`${teacher} has nothing timetabled on ${wd} ${date} — no cover needed`);
      setAbsOpen(false);
      return;
    }
    theirs.forEach((s) => {
      if (all.some((c) => c.slotId === s.id && c.date === date && c.status !== "Cancelled")) return;
      addItem("coverRequests", {
        id: nextId(`CVR-${ctx.tenantId.slice(3)}`, "coverRequests"),
        tenantId: ctx.tenantId,
        slotId: s.id,
        date,
        absentTeacher: teacher,
        reason,
        status: "Open",
      });
    });
    toast.success(`${theirs.length} lesson(s) need cover on ${wd} ${date}`);
    setAbsOpen(false);
  };

  return (
    <>
      <Section
        title="Cover for absent staff"
        description="Record an absence and the system lists every affected lesson with the colleagues who are free at that time."
        actions={
          <Button size="sm" onClick={() => setAbsOpen(true)}>
            <UserX className="h-3.5 w-3.5" /> Record absence
          </Button>
        }
      >
        <div className="mb-3 rounded-md bg-sky-500/10 border border-sky-500/30 px-3 py-2 text-xs flex gap-2">
          <Waves className="h-3.5 w-3.5 text-sky-600 mt-0.5 shrink-0" />
          This is cover for timetabled classes. The Swim Club Pack keeps its own coach-cover flow
          for pool sessions (12-hour temporary moves) — the two never overlap.
        </div>
        <DataTable
          columns={[
            { key: "date", label: "Date" },
            { key: "lesson", label: "Lesson" },
            { key: "absentTeacher", label: "Absent" },
            { key: "reason", label: "Reason" },
            { key: "status", label: "Status" },
            { key: "_actions", label: "Cover" },
          ]}
          rows={covers}
          emptyText="No cover requests"
          renderCell={(c: (typeof covers)[number], key) => {
            const s = slots.find((x) => x.id === c.slotId);
            if (key === "lesson")
              return s ? (
                <div>
                  <div className="font-medium">
                    {s.subject} · {s.groupLabel}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.day} {s.start}–{s.end} · {roomName(s.roomId)}
                  </div>
                </div>
              ) : (
                "—"
              );
            if (key === "status") return <StatusPill status={c.status} />;
            if (key === "_actions") {
              if (c.status === "Covered")
                return (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <UserCheck className="h-3.5 w-3.5 text-success" /> {c.coverTeacher}
                  </span>
                );
              if (c.status !== "Open" || !s) return "—";
              // Colleagues already covering something at the same time that day.
              const busy = covers
                .filter(
                  (o) =>
                    o.id !== c.id && o.date === c.date && o.status === "Covered" && o.coverTeacher,
                )
                .filter((o) => {
                  const os = slots.find((x) => x.id === o.slotId);
                  return os && slotsOverlap(os, s);
                })
                .map((o) => o.coverTeacher!);
              const free = freeTeachers(s, slots, pool, [...busy, c.absentTeacher]);
              const chosen = pickFor[c.id] ?? free[0] ?? "";
              return (
                <div className="flex items-center gap-1.5">
                  <Select
                    value={chosen}
                    onChange={(e) => setPickFor({ ...pickFor, [c.id]: e.target.value })}
                    options={
                      free.length
                        ? free.map((f) => ({ value: f, label: f }))
                        : [{ value: "", label: "Nobody free" }]
                    }
                    className="h-8 w-44 text-xs"
                  />
                  <Button
                    size="sm"
                    disabled={!chosen}
                    onClick={() => {
                      updateItem("coverRequests", (x) => x.id === c.id, {
                        coverTeacher: chosen,
                        status: "Covered",
                      });
                      toast.success(`${chosen} covers ${s.subject} (${s.groupLabel})`);
                    }}
                  >
                    Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateItem("coverRequests", (x) => x.id === c.id, { status: "Cancelled" })
                    }
                  >
                    Cancel
                  </Button>
                </div>
              );
            }
            return String((c as unknown as Record<string, unknown>)[key] ?? "");
          }}
        />
      </Section>
      <FormDialog
        open={absOpen}
        onOpenChange={setAbsOpen}
        title="Record staff absence"
        onSubmit={recordAbsence}
        submitLabel="Find lessons to cover"
      >
        <Field label="Teacher">
          <Select
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            options={pool.map((t) => ({ value: t, label: t }))}
          />
        </Field>
        <Field label="Date" hint={`From ${DEMO_TODAY} onwards`}>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Reason" className="sm:col-span-2">
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={[
              "Illness",
              "Training / CPD",
              "Exam board moderation meeting (off-site)",
              "Trip leader",
              "Personal leave",
            ].map((r) => ({ value: r, label: r }))}
          />
        </Field>
      </FormDialog>
    </>
  );
}

/* ── Teacher ─────────────────────────────────────────────────────────────── */

function TeacherTimetable() {
  const { ctx, slots, rooms, changes, roomName } = useTenantTimetable();
  const me = ctx.user?.name ?? "";
  const covers = useCollection("coverRequests").filter((c) => c.tenantId === ctx.tenantId);
  const mine = slots.filter((s) => s.teacherName === me);
  const [weekStart, setWeekStart] = useState(mondayOf(DEMO_TODAY));
  const [pick, setPick] = useState<{ s: TimetableSlot; date: string } | null>(null);
  const duties = covers.filter(
    (c) => c.coverTeacher === me && c.status === "Covered" && c.date >= DEMO_TODAY,
  );
  const absences = covers.filter((c) => c.absentTeacher === me && c.date >= DEMO_TODAY);
  const hours = mine.reduce((h, s) => h + (toMin(s.end) - toMin(s.start)) / 60, 0);
  return (
    <div className="space-y-5">
      <PageHeader
        title="My Timetable"
        subtitle={`${mine.length} lessons · ${hours.toFixed(1)} teaching hours a week`}
      />
      <PackContextBar />
      <Section
        title="This week"
        description="Click a class to cancel it, move it or change its room for that date."
        actions={<WeekNav weekStart={weekStart} onChange={setWeekStart} />}
      >
        <WeekGrid
          slots={mine}
          roomName={roomName}
          weekStart={weekStart}
          changes={changes}
          onPick={(s, date) => setPick({ s, date })}
        />
      </Section>
      <ChangesThisWeek
        slots={mine}
        changes={changes}
        weekStart={weekStart}
        roomName={roomName}
        onPick={(s, date) => setPick({ s, date })}
      />
      {pick && (
        <ClassChangeDialog
          key={`${pick.s.id}|${pick.date}`}
          pick={pick}
          onClose={() => setPick(null)}
          slots={slots}
          rooms={rooms}
          changes={changes}
          roomName={roomName}
        />
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <Section title="My cover duties" description="Lessons you've been asked to cover.">
          {duties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cover duties coming up.</p>
          ) : (
            <ul className="space-y-2">
              {duties.map((c) => {
                const s = slots.find((x) => x.id === c.slotId);
                return (
                  <li key={c.id} className="rounded-md border p-2.5 text-sm">
                    <div className="font-medium">
                      {s?.subject} · {s?.groupLabel}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.date} {s?.start}–{s?.end} · {s && roomName(s.roomId)} · for{" "}
                      {c.absentTeacher}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
        <Section title="My recorded absences">
          {absences.length === 0 ? (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          ) : (
            <ul className="space-y-2">
              {absences.map((c) => {
                const s = slots.find((x) => x.id === c.slotId);
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {s?.subject} · {s?.groupLabel}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.date} · {c.reason}
                      </div>
                    </div>
                    {c.status === "Covered" ? (
                      <Badge tone="success">Covered by {c.coverTeacher}</Badge>
                    ) : (
                      <StatusPill status={c.status} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

/* ── Student / parent ────────────────────────────────────────────────────── */

function LearnerTimetable() {
  const { ctx, slots, changes, roomName } = useTenantTimetable();
  const learners = useScopedLearners();
  const regs = useCollection("moduleRegistrations");
  const modules = useCollection("heModules");
  const covers = useCollection("coverRequests").filter(
    (c) => c.tenantId === ctx.tenantId && c.status === "Covered",
  );
  const [childId, setChildId] = useState("");
  const learner: Learner | undefined = learners.find((l) => l.id === childId) ?? learners[0];

  const mine = useMemo(() => {
    if (!learner) return [];
    const codes = new Set(
      regs
        .filter((r) => r.studentId === learner.id && r.status === "Registered")
        .map((r) => modules.find((m) => m.id === r.moduleId)?.code)
        .filter(Boolean) as string[],
    );
    return slots.filter(
      (s) =>
        s.cohorts?.includes(learner.group ?? "") ||
        s.groupLabel === learner.group ||
        [...codes].some((c) => s.groupLabel.startsWith(c)),
    );
  }, [learner, slots, regs, modules]);

  const [weekStart, setWeekStart] = useState(mondayOf(DEMO_TODAY));
  const coverNote = (s: TimetableSlot, date?: string) => {
    const c = covers.find(
      (x) => x.slotId === s.id && (date ? x.date === date : x.date >= DEMO_TODAY),
    );
    return c ? `Cover: ${c.coverTeacher}` : undefined;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={ctx.user?.role === "parent" ? "Timetable" : "My Timetable"}
        subtitle={
          learner
            ? `${learner.name} · ${learner.level}${learner.group ? ` · ${learner.group}` : ""}`
            : undefined
        }
        actions={
          learners.length > 1 ? (
            <Select
              value={learner?.id ?? ""}
              onChange={(e) => setChildId(e.target.value)}
              options={learners.map((l) => ({
                value: l.id,
                label: `${l.name} (${l.group ?? l.level})`,
              }))}
              className="w-60"
            />
          ) : undefined
        }
      />
      <PackContextBar />
      {!learner ? (
        <Section>
          <p className="text-sm text-muted-foreground">
            No timetable is linked to your account yet.
          </p>
        </Section>
      ) : (
        <>
          <Section
            title="This week"
            description="Cancelled, moved and room-changed classes are marked. Cover is highlighted."
            actions={<WeekNav weekStart={weekStart} onChange={setWeekStart} />}
          >
            <WeekGrid
              slots={mine}
              roomName={roomName}
              highlight={coverNote}
              weekStart={weekStart}
              changes={changes}
              emptyText="No timetabled sessions for this group yet."
            />
          </Section>
          <ChangesThisWeek
            slots={mine}
            changes={changes}
            weekStart={weekStart}
            roomName={roomName}
          />
        </>
      )}
    </div>
  );
}
