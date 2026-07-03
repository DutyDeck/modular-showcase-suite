import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Section, Badge, Button } from "@/components/ui-kit";
import { useCollection } from "@/lib/store";
import { ChevronLeft, ChevronRight, Video, Clock, BookOpen, Calendar as CalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const TYPE_TONE: Record<CalEvent["type"], any> = {
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
    setCursor((d) => (view === "week" ? addDays(d, -7) : new Date(d.getFullYear(), d.getMonth() - 1, 1)));
  const goNext = () =>
    setCursor((d) => (view === "week" ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1)));
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
                  view === "week"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
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
                  view === "month"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
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
                      e.type === "meeting" &&
                        "bg-info/10 text-info border-l-2 border-info",
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
            className={cn(
              "bg-card min-h-[88px] p-1.5 text-xs space-y-1",
              !inMonth && "opacity-50",
            )}
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
