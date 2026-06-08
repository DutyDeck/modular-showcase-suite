import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Badge, Button } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { SrbComposer } from "@/components/Srb";
import { useAuth } from "@/lib/auth";
import { useCollection, addItem, updateItem, nextId, type SessionAttendance } from "@/lib/store";
import { sessionById, poolById, children as parentChildren } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Waves,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  Save,
  NotebookPen,
  CalendarCheck,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/app/sessions/$sessionId")({
  head: ({ params }) => ({ meta: [{ title: `Session — ${params.sessionId}` }] }),
  component: SessionDetailPage,
});

type Status = "Present" | "Late" | "Absent";

const SAFETY_TASKS = [
  "Lifeguard on deck & whistle ready",
  "Lane ropes set for assigned zone",
  "Headcount before entry",
  "Rescue equipment within reach",
  "Headcount after exit",
];

function SessionDetailPage() {
  const { sessionId } = useParams({ from: "/app/sessions/$sessionId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const students = useCollection("students");
  const attendance = useCollection("sessionAttendance");

  const session = sessionById[sessionId] ?? null;
  const pool = session ? poolById[session.poolId] : null;
  const zone = useMemo(() => pool?.zones.find((z) => z.id === session?.zoneId), [pool, session]);

  const swimmers = useMemo(
    () =>
      (session?.swimmerIds ?? []).map((id) => ({
        id,
        name: students.find((s) => s.id === id)?.name ?? id,
      })),
    [session, students],
  );

  // Role scoping.
  const isInstructor =
    user?.role === "teacher" && !!session && session.coachNames.includes(user.name);
  const isAdmin =
    user?.role === "admin" &&
    (user.adminScope !== "institute" || user.institutionId === pool?.institutionId);
  const isStaff = isInstructor || isAdmin;

  const myStudentIds = useMemo(() => {
    if (user?.role === "student") return new Set([user.oneEduId ?? ""]);
    if (user?.role === "parent") return new Set(parentChildren.map((c) => c.id));
    return new Set<string>();
  }, [user]);

  // Saved attendance for this session, as a quick lookup.
  const savedStatus = useMemo(() => {
    const m: Record<string, Status> = {};
    attendance.filter((a) => a.sessionId === sessionId).forEach((a) => (m[a.studentId] = a.status));
    return m;
  }, [attendance, sessionId]);

  // Local working copy for the marker (staff only).
  const [draft, setDraft] = useState<Record<string, Status>>({});
  const [composer, setComposer] = useState(false);
  const [checks, setChecks] = useState<Set<string>>(new Set());

  if (!session || !pool) {
    return (
      <div className="text-center py-16">
        <div className="text-lg font-semibold">Session not found</div>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/app/courses" })}>
          <ArrowLeft className="h-4 w-4" />
          Back to courses
        </Button>
      </div>
    );
  }

  const statusOf = (id: string): Status | undefined => draft[id] ?? savedStatus[id];
  const setOne = (id: string, v: Status) => setDraft((d) => ({ ...d, [id]: v }));
  const setAll = (v: Status) => {
    const next: Record<string, Status> = {};
    swimmers.forEach((s) => (next[s.id] = v));
    setDraft(next);
  };

  const counts = swimmers.reduce(
    (acc, s) => {
      const v = statusOf(s.id);
      if (v === "Present") acc.Present++;
      else if (v === "Late") acc.Late++;
      else if (v === "Absent") acc.Absent++;
      else acc.Unmarked++;
      return acc;
    },
    { Present: 0, Late: 0, Absent: 0, Unmarked: 0 },
  );

  const save = () => {
    if (!user) return;
    const now = new Date().toISOString();
    let n = 0;
    swimmers.forEach((s) => {
      const v = draft[s.id];
      if (!v) return; // only persist what was touched this session
      const existing = attendance.find((a) => a.sessionId === sessionId && a.studentId === s.id);
      if (existing) {
        updateItem("sessionAttendance", (a) => a.id === existing.id, {
          status: v,
          at: now,
          by: user.name,
        });
      } else {
        const row: SessionAttendance = {
          id: nextId("SA-", "sessionAttendance"),
          sessionId,
          studentId: s.id,
          studentName: s.name,
          status: v,
          at: now,
          by: user.name,
        };
        addItem("sessionAttendance", row);
      }
      n++;
    });
    if (n === 0) {
      toast.info("No changes to save");
      return;
    }
    setDraft({});
    toast.success(`Attendance saved for ${n} swimmer${n === 1 ? "" : "s"}`);
  };

  const mySwimmers = swimmers.filter((s) => myStudentIds.has(s.id));

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title={session.title}
        subtitle={`${session.level} · ${session.focus}`}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              navigate({ to: "/app/courses/$courseId", params: { courseId: session.courseId } })
            }
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to club</span>
          </Button>
        }
      />

      {/* Session brief */}
      <Section className="!p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-sky-500 to-cyan-600 text-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted">{session.level}</Badge>
            <span className="inline-flex items-center gap-1 text-xs opacity-90">
              <Clock className="h-3.5 w-3.5" />
              {session.day} · {session.start}–{session.end}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Brief icon={<Waves className="h-4 w-4" />} label="Pool" value={pool.name} />
            <Brief
              icon={<MapPin className="h-4 w-4" />}
              label="Zone · lanes"
              value={`${zone?.label ?? "—"} · ${session.laneFrom}–${session.laneTo}`}
            />
            <Brief
              icon={<Users className="h-4 w-4" />}
              label="Swimmers"
              value={`${swimmers.length} / cap ${session.capacity}`}
            />
            <Brief
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Present"
              value={String(counts.Present)}
            />
          </div>
        </div>
      </Section>

      {/* Coaches */}
      <Section title="Coaches on deck">
        <div className="flex flex-wrap gap-2">
          {session.coachNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-2 rounded-full border bg-card pl-1 pr-3 py-1"
            >
              <Avatar name={name} size={26} />
              <span className="text-xs font-medium">{name}</span>
            </span>
          ))}
        </div>
      </Section>

      {isStaff ? (
        <>
          {/* Attendance marker */}
          <Section
            title="Attendance"
            description="Tap a status for each swimmer, then save. Defaults to existing marks."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setAll("Present")}>
                  <Check className="h-3.5 w-3.5" />
                  All present
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAll("Absent")}>
                  <X className="h-3.5 w-3.5" />
                  All absent
                </Button>
              </div>
            }
          >
            <div className="flex flex-wrap gap-2 mb-3 text-xs">
              <Pill tone="success" label="Present" value={counts.Present} />
              <Pill tone="warning" label="Late" value={counts.Late} />
              <Pill tone="destructive" label="Absent" value={counts.Absent} />
              <Pill tone="muted" label="Unmarked" value={counts.Unmarked} />
            </div>
            <ul className="divide-y -mx-4 sm:-mx-5">
              {swimmers.map((s) => {
                const v = statusOf(s.id);
                return (
                  <li key={s.id} className="px-4 sm:px-5 py-2.5 flex items-center gap-3">
                    <Avatar name={s.name} seed={s.id} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.id}</div>
                    </div>
                    <div className="inline-flex rounded-md border overflow-hidden shrink-0">
                      {(["Present", "Late", "Absent"] as const).map((opt) => {
                        const active = v === opt;
                        const cls =
                          opt === "Present"
                            ? active
                              ? "bg-success text-white"
                              : "text-success"
                            : opt === "Late"
                              ? active
                                ? "bg-warning text-warning-foreground"
                                : "text-warning-foreground"
                              : active
                                ? "bg-destructive text-white"
                                : "text-destructive";
                        return (
                          <button
                            key={opt}
                            onClick={() => setOne(s.id, opt)}
                            className={cn(
                              "h-9 w-9 sm:w-12 text-xs font-bold border-l first:border-l-0 transition-colors",
                              !active && "hover:bg-muted",
                              cls,
                            )}
                            title={opt}
                            aria-pressed={active}
                          >
                            {opt[0]}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* Record book + tasks */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Section
              title="Record book"
              description="Log an achievement, note or message to a swimmer's family. Posts to their record book and persists across logins."
            >
              <Button onClick={() => setComposer(true)}>
                <NotebookPen className="h-4 w-4" />
                New record-book note
              </Button>
            </Section>

            <Section title="Session checklist" description="Pool safety & readiness.">
              <ul className="space-y-1.5">
                {SAFETY_TASKS.map((task) => {
                  const done = checks.has(task);
                  return (
                    <li key={task}>
                      <button
                        onClick={() =>
                          setChecks((c) => {
                            const n = new Set(c);
                            if (n.has(task)) n.delete(task);
                            else n.add(task);
                            return n;
                          })
                        }
                        className="w-full text-left flex items-center gap-2.5 py-1.5 text-sm"
                      >
                        <span
                          className={cn(
                            "h-5 w-5 rounded-md border flex items-center justify-center shrink-0",
                            done ? "bg-success border-success text-white" : "bg-card",
                          )}
                        >
                          {done && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className={cn(done && "text-muted-foreground line-through")}>
                          {task}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                {checks.size}/{SAFETY_TASKS.length} complete
              </div>
            </Section>
          </div>

          <SrbComposer open={composer} onOpenChange={setComposer} studentOptions={swimmers} />

          {/* Sticky save bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 md:left-64 bg-card border-t shadow-elegant">
            <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3 flex items-center justify-between gap-3">
              <div className="text-xs sm:text-sm min-w-0">
                <span className="font-semibold truncate">{session.title}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {counts.Present} present · {counts.Late} late · {counts.Absent} absent
                </span>
              </div>
              <Button onClick={save} disabled={Object.keys(draft).length === 0}>
                <Save className="h-4 w-4" />
                Save attendance
              </Button>
            </div>
          </div>
        </>
      ) : (
        /* Student / parent — own details only */
        <Section
          title="Your details"
          description={
            user?.role === "parent"
              ? "Your children in this session."
              : "Your place in this session."
          }
        >
          {mySwimmers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              You're not on this session's roster.
            </div>
          ) : (
            <ul className="space-y-2">
              {mySwimmers.map((s) => {
                const st = savedStatus[s.id];
                return (
                  <li
                    key={s.id}
                    className="rounded-lg border bg-card p-3 flex items-center gap-3 flex-wrap"
                  >
                    <Avatar name={s.name} seed={s.id} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Lanes {session.laneFrom}–{session.laneTo} · {session.focus}
                      </div>
                    </div>
                    <Badge
                      tone={
                        st === "Present"
                          ? "success"
                          : st === "Late"
                            ? "warning"
                            : st === "Absent"
                              ? "destructive"
                              : "muted"
                      }
                    >
                      {st ?? "Not marked"}
                    </Badge>
                    <Link
                      to="/app/srb/$studentId"
                      params={{ studentId: s.id }}
                      className="text-xs inline-flex items-center gap-1 text-primary font-medium hover:underline"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Record book
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <ListChecks className="h-4 w-4 mt-0.5 shrink-0" />
            Coaches mark attendance and post record-book notes here. You only see your own details.
          </div>
        </Section>
      )}
    </div>
  );
}

function Brief({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-85">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold mt-0.5 text-white truncate">{value}</div>
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
  value: number;
}) {
  const tones: Record<string, string> = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium",
        tones[tone],
      )}
    >
      {label} <span className="font-bold">{value}</span>
    </span>
  );
}
