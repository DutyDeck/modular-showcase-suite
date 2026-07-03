import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Badge,
  Button,
  Field,
  Select,
  TextInput,
  TextArea,
} from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { SrbComposer } from "@/components/Srb";
import { ManageCoachesDialog } from "./app.coaching";
import { useAuth } from "@/lib/auth";
import {
  useCollection,
  addItem,
  updateItem,
  nextId,
  type SessionAttendance,
  type Incident,
  type SwimmerMove,
  type WellbeingCheck,
  type WellbeingFlag,
  type ChatMessage,
} from "@/lib/store";
import {
  sessionById,
  poolById,
  sessionsByCourse,
  swimCourses,
  effectiveCoachNames,
  effectiveSwimmerIds,
  isMoveActive,
  TEMP_MOVE_HOURS,
  SWIM_COURSE_ID,
  children as parentChildren,
  awardById,
  isAwardComplete,
  guardiansForSwimmer,
  chatPair,
  type PoolSession,
  type SwimAward,
  type AwardProgress,
} from "@/lib/mockData";
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
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  ArrowLeftRight,
  Timer,
  Undo2,
  HeartPulse,
  Award,
  Sparkles,
  ChevronDown,
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
  const rosters = useCollection("sessionRosters");
  const moves = useCollection("swimmerMoves");

  const session = sessionById[sessionId] ?? null;
  const pool = session ? poolById[session.poolId] : null;
  const zone = useMemo(() => pool?.zones.find((z) => z.id === session?.zoneId), [pool, session]);
  const coachMoves = useCollection("coachMoves");
  const roster = useMemo(
    () => effectiveCoachNames(sessionId, rosters, coachMoves),
    [sessionId, rosters, coachMoves],
  );

  // The effective swimmer roster applies any enrol / temporary / permanent moves
  // on top of the seed timetable, so a swimmer moved here for the day shows up.
  const swimmerIds = useMemo(
    () => (session ? effectiveSwimmerIds(session, moves) : []),
    [session, moves],
  );
  const swimmers = useMemo(
    () =>
      swimmerIds.map((id) => ({
        id,
        name: students.find((s) => s.id === id)?.name ?? id,
      })),
    [swimmerIds, students],
  );

  // Swimmers who are in THIS session only temporarily (moved in for the day).
  const tempInById = useMemo(() => {
    const m: Record<string, SwimmerMove> = {};
    moves.forEach((mv) => {
      if (mv.kind === "temp" && mv.sessionId === sessionId && isMoveActive(mv))
        m[mv.studentId] = mv;
    });
    return m;
  }, [moves, sessionId]);

  // Role scoping. A coach is an instructor on this session if she is on the
  // *effective* roster (so an admin swap-in gains access, a swap-out loses it).
  const isInstructor = user?.role === "teacher" && !!session && roster.includes(user.name);
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
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [wellbeingOpen, setWellbeingOpen] = useState(false);
  const [manageCoachesOpen, setManageCoachesOpen] = useState(false);
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
      <Section
        title="Coaches on deck"
        actions={
          isAdmin && session.courseId === SWIM_COURSE_ID ? (
            <Button size="sm" variant="outline" onClick={() => setManageCoachesOpen(true)}>
              <Users className="h-3.5 w-3.5" />
              Manage coaches
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap gap-2">
          {roster.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-2 rounded-full border bg-card pl-1 pr-3 py-1"
            >
              <Avatar name={name} size={26} />
              <span className="text-xs font-medium">{name}</span>
            </span>
          ))}
          {roster.length === 0 && (
            <Badge tone="destructive">No coach assigned — use Manage coaches</Badge>
          )}
        </div>
      </Section>

      {isAdmin && session.courseId === SWIM_COURSE_ID && manageCoachesOpen && (
        <ManageCoachesDialog
          session={session}
          clubCoaches={swimCourses[0].coachNames}
          roster={roster}
          adminName={user!.name}
          onClose={() => setManageCoachesOpen(false)}
        />
      )}

      {isStaff ? (
        <>
          {/* Attendance marker */}
          <Section
            title="Attendance"
            description="Tap a status for each swimmer, then save. Defaults to existing marks."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMoveOpen(true)}
                  data-tour="move-btn"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Move swimmer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAll("Present")}
                  data-tour="attend-all-present"
                >
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
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        {s.name}
                        {tempInById[s.id] && (
                          <Badge tone="info">
                            <Timer className="h-3 w-3" />
                            Temp · {hoursLeft(tempInById[s.id].expiresAt)}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        {s.id}
                        {tempInById[s.id] && (
                          <button
                            onClick={() =>
                              updateItem("swimmerMoves", (mv) => mv.id === tempInById[s.id].id, {
                                reverted: true,
                              })
                            }
                            className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
                          >
                            <Undo2 className="h-3 w-3" />
                            Move back
                          </button>
                        )}
                      </div>
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

          {/* Award / course activity tracking */}
          <AwardTracker swimmers={swimmers} coachName={user!.name} />

          {/* Record book + tasks */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Section
              title="Record book, safety & wellbeing"
              description="Post a note or rating to a swimmer's family, log a poolside incident, or record a wellbeing check for pastoral follow-up."
            >
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setComposer(true)} data-tour="note-btn">
                  <NotebookPen className="h-4 w-4" />
                  New record-book note
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIncidentOpen(true)}
                  data-tour="incident-btn"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Log incident
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWellbeingOpen(true)}
                  data-tour="wellbeing-btn"
                >
                  <HeartPulse className="h-4 w-4" />
                  Wellbeing check
                </Button>
              </div>
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

          <SrbComposer
            open={composer}
            onOpenChange={setComposer}
            studentOptions={swimmers}
            courseId={session.courseId}
            sessionId={session.id}
            institutionId={pool.institutionId}
            institutionName={pool.institutionName}
            allowRating={isInstructor}
          />

          <IncidentComposer
            open={incidentOpen}
            onOpenChange={setIncidentOpen}
            session={session}
            swimmers={swimmers}
          />

          <MoveSwimmerDialog
            open={moveOpen}
            onOpenChange={setMoveOpen}
            session={session}
            swimmers={swimmers}
          />

          <WellbeingComposer
            open={wellbeingOpen}
            onOpenChange={setWellbeingOpen}
            swimmers={swimmers}
          />

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
              <Button
                onClick={save}
                disabled={Object.keys(draft).length === 0}
                data-tour="attend-save"
              >
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

const INCIDENT_TYPES: Incident["type"][] = ["Safety", "Behaviour", "Health", "Equipment"];
const INCIDENT_SEVERITIES: Incident["severity"][] = ["Low", "Medium", "High"];

function IncidentComposer({
  open,
  onOpenChange,
  session,
  swimmers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: PoolSession;
  swimmers: Array<{ id: string; name: string }>;
}) {
  const { user } = useAuth();
  const [type, setType] = useState<Incident["type"]>("Safety");
  const [severity, setSeverity] = useState<Incident["severity"]>("Low");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [studentId, setStudentId] = useState("");

  const submit = () => {
    if (!user) return;
    if (!title.trim() || !body.trim()) {
      toast.error("Title and description are required");
      return;
    }
    const student = swimmers.find((s) => s.id === studentId);
    const row: Incident = {
      id: nextId("INC-", "incidents"),
      courseId: session.courseId,
      sessionId: session.id,
      studentId: student?.id,
      studentName: student?.name,
      coachName: user.name,
      type,
      severity,
      title: title.trim(),
      body: body.trim(),
      status: "Open",
      at: new Date().toISOString(),
    };
    addItem("incidents", row);
    toast.success("Incident logged");
    setTitle("");
    setBody("");
    setStudentId("");
    setType("Safety");
    setSeverity("Low");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log an incident</DialogTitle>
          <DialogDescription>
            {session.title} · appears in the club summary reports for follow-up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as Incident["type"])}
                options={INCIDENT_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </Field>
            <Field label="Severity">
              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Incident["severity"])}
                options={INCIDENT_SEVERITIES.map((s) => ({ value: s, label: s }))}
              />
            </Field>
          </div>
          <Field label="Swimmer (optional)">
            <Select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              options={[
                { value: "", label: "— Not swimmer-specific —" },
                ...swimmers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>
          <Field label="Title" required>
            <TextInput
              data-tour="incident-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Swallowed water — coughing fit"
            />
          </Field>
          <Field label="What happened & action taken" required>
            <TextArea
              data-tour="incident-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the incident and the action you took…"
              className="min-h-[100px]"
            />
          </Field>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} data-tour="incident-submit">
            <AlertTriangle className="h-4 w-4" />
            Log incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const WELLBEING_FLAGS: WellbeingFlag[] = ["Green", "Amber", "Red"];

function WellbeingComposer({
  open,
  onOpenChange,
  swimmers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  swimmers: Array<{ id: string; name: string }>;
}) {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [flag, setFlag] = useState<WellbeingFlag>("Green");
  const [note, setNote] = useState("");

  const submit = () => {
    if (!user) return;
    const student = swimmers.find((s) => s.id === studentId);
    if (!student) {
      toast.error("Select a swimmer");
      return;
    }
    if (!note.trim()) {
      toast.error("Add a short note");
      return;
    }
    const row: WellbeingCheck = {
      id: nextId("WB-", "wellbeingChecks"),
      studentId: student.id,
      studentName: student.name,
      coachName: user.name,
      flag,
      note: note.trim(),
      at: new Date().toISOString(),
    };
    addItem("wellbeingChecks", row);
    toast.success(`Wellbeing check logged for ${student.name}`);
    setStudentId("");
    setFlag("Green");
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wellbeing check</DialogTitle>
          <DialogDescription>
            A quick pastoral note. Amber and red flags surface in the club report for follow-up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Swimmer" required>
            <Select
              data-tour="wb-swimmer"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              options={[
                { value: "", label: "— Select swimmer —" },
                ...swimmers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>
          <Field label="How are they doing?">
            <div className="grid grid-cols-3 gap-2">
              {WELLBEING_FLAGS.map((f) => {
                const active = flag === f;
                const tone =
                  f === "Green"
                    ? "bg-success text-white border-success"
                    : f === "Amber"
                      ? "bg-warning text-warning-foreground border-warning"
                      : "bg-destructive text-white border-destructive";
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlag(f)}
                    className={cn(
                      "rounded-lg border p-2.5 text-sm font-medium transition-colors",
                      active ? tone : "bg-card hover:bg-muted",
                    )}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Note" required>
            <TextArea
              data-tour="wb-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Tired after school; kept the set light and will check in with parents."
              className="min-h-[90px]"
            />
          </Field>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} data-tour="wellbeing-submit">
            <HeartPulse className="h-4 w-4" />
            Log wellbeing check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function hoursLeft(expiresAt?: string): string {
  if (!expiresAt) return "";
  const ms = Date.parse(expiresAt) - Date.now();
  if (ms <= 0) return "expired";
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function MoveSwimmerDialog({
  open,
  onOpenChange,
  session,
  swimmers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: PoolSession;
  swimmers: Array<{ id: string; name: string }>;
}) {
  const { user } = useAuth();
  const targets = useMemo(
    () => sessionsByCourse(session.courseId).filter((s) => s.id !== session.id),
    [session],
  );
  const [studentId, setStudentId] = useState("");
  const [targetSessionId, setTargetSessionId] = useState("");
  const [kind, setKind] = useState<"temp" | "permanent">("temp");
  const [reason, setReason] = useState("");

  const submit = () => {
    if (!user) return;
    if (!studentId || !targetSessionId) {
      toast.error("Pick a swimmer and a destination session");
      return;
    }
    const student = swimmers.find((s) => s.id === studentId);
    const target = targets.find((s) => s.id === targetSessionId);
    const now = new Date();
    const move: SwimmerMove = {
      id: nextId("MOV-", "swimmerMoves"),
      studentId,
      studentName: student?.name ?? studentId,
      sessionId: targetSessionId,
      fromSessionId: session.id,
      kind,
      reason: reason.trim() || undefined,
      by: user.name,
      at: now.toISOString(),
      ...(kind === "temp"
        ? { expiresAt: new Date(now.getTime() + TEMP_MOVE_HOURS * 3600 * 1000).toISOString() }
        : {}),
    };
    addItem("swimmerMoves", move);
    toast.success(
      kind === "temp"
        ? `${student?.name} moved to ${target?.title} for today — auto-reverts in ${TEMP_MOVE_HOURS}h`
        : `${student?.name} permanently moved to ${target?.title}`,
    );
    setStudentId("");
    setTargetSessionId("");
    setKind("temp");
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move a swimmer</DialogTitle>
          <DialogDescription>
            Move a swimmer from {session.title} to another session. A temporary move automatically
            reverts after {TEMP_MOVE_HOURS} hours.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Swimmer" required>
            <Select
              data-tour="move-swimmer"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              options={[
                { value: "", label: "— Select swimmer —" },
                ...swimmers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>
          <Field label="Move to session" required>
            <Select
              data-tour="move-target"
              value={targetSessionId}
              onChange={(e) => setTargetSessionId(e.target.value)}
              options={[
                { value: "", label: "— Select destination —" },
                ...targets.map((s) => ({
                  value: s.id,
                  label: `${s.title} · ${s.day} ${s.start}`,
                })),
              ]}
            />
          </Field>
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {(["temp", "permanent"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-lg border p-2.5 text-left text-sm transition-colors",
                    kind === k ? "border-primary bg-primary/5" : "hover:bg-muted",
                  )}
                >
                  <div className="font-medium">
                    {k === "temp" ? "Temporary (today)" : "Permanent"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {k === "temp"
                      ? `Auto-reverts in ${TEMP_MOVE_HOURS}h`
                      : "Updates the swimmer's home session"}
                  </div>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Reason (optional)">
            <TextInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Coach cover · trialling a faster lane"
            />
          </Field>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} data-tour="move-submit">
            <ArrowLeftRight className="h-4 w-4" />
            Move swimmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

/* ── In-session award / course activity tracking ────────────────────────────
 * Coaches assign a swimmer to a course (award) and tick each activity off as
 * it's mastered. Completing the final activity issues the certificate and
 * notifies the swimmer's guardians. */
function AwardTracker({
  swimmers,
  coachName,
}: {
  swimmers: { id: string; name: string }[];
  coachName: string;
}) {
  const awards = useCollection("swimAwards");
  const progress = useCollection("awardProgress");
  const [expanded, setExpanded] = useState<string | null>(null);

  const activeFor = (sid: string) => progress.find((p) => p.studentId === sid && !p.certifiedAt);
  const certifiedFor = (sid: string) =>
    progress.filter((p) => p.studentId === sid && p.certifiedAt);
  const awardFor = (awardId: string) => awardById[awardId] ?? awards.find((a) => a.id === awardId);

  const assign = (sid: string, sname: string, awardId: string) => {
    if (!awardId) return;
    const now = new Date().toISOString();
    addItem("awardProgress", {
      id: nextId("AP-", "awardProgress"),
      studentId: sid,
      studentName: sname,
      awardId,
      done: [],
      startedAt: now,
      updatedAt: now,
      updatedBy: coachName,
    } as AwardProgress);
    toast.success(`Started ${awardFor(awardId)?.name ?? "award"} for ${sname.split(" ")[0]}`);
    setExpanded(sid);
  };

  const toggle = (p: AwardProgress, award: SwimAward, index: number) => {
    const has = p.done.includes(index);
    const done = has ? p.done.filter((i) => i !== index) : [...p.done, index].sort((a, b) => a - b);
    const complete = award.activities.every((_, i) => done.includes(i));
    const now = new Date().toISOString();
    if (complete && !p.certifiedAt) {
      updateItem("awardProgress", (r) => r.id === p.id, {
        done,
        updatedAt: now,
        updatedBy: coachName,
        certifiedAt: now,
        certifiedBy: coachName,
        notified: true,
      });
      const guardians = guardiansForSwimmer(p.studentId);
      const first = p.studentName.split(" ")[0];
      const text = `🏅 Great news! ${first} has completed ${award.name} and earned their certificate.${
        award.awardedText ? ` ${award.awardedText}` : ""
      } You can view the certificate in the app.`;
      for (const g of guardians) {
        const [a, b] = chatPair(coachName, g);
        addItem("chat", {
          id: nextId("CH-", "chat"),
          a,
          b,
          fromName: coachName,
          fromRole: "Coach",
          text,
          at: now,
          context: "swim",
        } as ChatMessage);
      }
      toast.success(
        `${first} earned ${award.name}!${guardians.length ? " Parents notified." : ""}`,
      );
    } else {
      updateItem("awardProgress", (r) => r.id === p.id, {
        done,
        updatedAt: now,
        updatedBy: coachName,
      });
    }
  };

  return (
    <Section
      title="Courses & awards"
      description="Assign each swimmer to a course and tick off activities as they master them. Completing every activity issues the certificate and notifies parents."
    >
      <ul className="divide-y -mx-4 sm:-mx-5" data-tour="award-tracker">
        {swimmers.map((s) => {
          const active = activeFor(s.id);
          const award = active ? awardFor(active.awardId) : undefined;
          const certified = certifiedFor(s.id);
          const isOpen = expanded === s.id;
          const assignable = awards.filter(
            (a) => a.id !== active?.awardId && !certified.some((c) => c.awardId === a.id),
          );
          return (
            <li key={s.id} className="px-4 sm:px-5 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={s.name} seed={s.id} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                    {award && active ? (
                      <span>
                        {award.name} · {active.done.length}/{award.activities.length} activities
                      </span>
                    ) : (
                      <span>No course in progress</span>
                    )}
                    {certified.map((c) => (
                      <Link
                        key={c.id}
                        to="/app/certificate/$progressId"
                        params={{ progressId: c.id }}
                        className="inline-flex items-center gap-1 text-emerald-600 font-medium hover:underline"
                      >
                        <Award className="h-3 w-3" />
                        {awardFor(c.awardId)?.name}
                      </Link>
                    ))}
                  </div>
                </div>
                {active && award ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    data-tour="award-activities-btn"
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Activities</span>
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                    />
                  </Button>
                ) : (
                  assignable.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) assign(s.id, s.name, e.target.value);
                      }}
                      className="h-8 rounded-md border bg-background px-2 text-xs max-w-[9rem]"
                    >
                      <option value="" disabled>
                        Start a course…
                      </option>
                      {assignable.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  )
                )}
              </div>

              {isOpen && active && award && (
                <div className="mt-3 ml-11 rounded-lg border bg-muted/20 p-3">
                  <ul className="space-y-1.5">
                    {award.activities.map((act, i) => {
                      const done = active.done.includes(i);
                      return (
                        <li key={i}>
                          <button
                            onClick={() => toggle(active, award, i)}
                            className="w-full flex items-start gap-2.5 text-left text-sm group"
                            data-tour={`award-act-${i}`}
                          >
                            <span
                              className={cn(
                                "shrink-0 mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                                done
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-input group-hover:border-primary",
                              )}
                            >
                              {done && <Check className="h-3.5 w-3.5" />}
                            </span>
                            <span className={cn(done && "text-muted-foreground line-through")}>
                              {act}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {isAwardComplete(award, active) && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      All activities complete — certificate issued.
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
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
