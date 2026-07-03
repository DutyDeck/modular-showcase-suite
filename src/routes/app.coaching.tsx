import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Badge, Button, Select } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { OffboardDialog } from "@/components/OffboardDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  useCollection,
  addItem,
  updateItem,
  removeItem,
  nextId,
  type CoachAttendance,
} from "@/lib/store";
import {
  swimCourses,
  sessionsByCourse,
  sessionById,
  poolById,
  effectiveCoachNames,
  isSwimAdmin,
  isOffboarded,
  SWIM_COURSE_ID,
  type PoolSession,
  type Weekday,
} from "@/lib/mockData";
import {
  Waves,
  Users,
  UserMinus,
  UserPlus,
  RotateCcw,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/app/coaching")({
  head: () => ({ meta: [{ title: "Coaches & Sessions — Swim Club" }] }),
  component: CoachingPage,
});

const DAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LONG: Record<Weekday, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const REASONS = [
  "Sick leave",
  "Family emergency",
  "Injury",
  "Annual leave",
  "Coaching clinic (external)",
  "Officiating a gala",
  "Other",
];

/** ISO of the next occurrence of a weekday session at its start time. */
function nextOccurrenceISO(day: Weekday, start: string): string {
  const [h, m] = start.split(":").map(Number);
  const now = new Date();
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  const diff = (DAY_LONG[day] - base.getDay() + 7) % 7; // 0 = today
  base.setDate(base.getDate() + diff);
  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

function CoachingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const rosters = useCollection("sessionRosters");
  const offboardings = useCollection("offboardings");
  const club = swimCourses[0];
  const sessions = useMemo(() => sessionsByCourse(SWIM_COURSE_ID), []);
  const [manageId, setManageId] = useState<string | null>(null);
  const [offboardCoach, setOffboardCoach] = useState<string | null>(null);

  // Coaches still active at the club (off-boarded coaches can't be rostered).
  const activeCoaches = club.coachNames.filter((c) => !isOffboarded(c, offboardings));

  const reactivateCoach = (name: string) => {
    removeItem("offboardings", (o) => o.personId === name);
    toast.success(`${name} reactivated — available to coach again`);
  };

  if (!isSwimAdmin(user)) {
    return (
      <div className="text-center py-16 space-y-3">
        <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          Coach & session management is available to the swim-club admin.
        </div>
      </div>
    );
  }

  const rosterFor = (sid: string) => effectiveCoachNames(sid, rosters);
  const isOverridden = (sid: string) => rosters.some((r) => r.sessionId === sid);

  const byDay = DAYS.map((d) => ({
    day: d,
    items: sessions.filter((s) => s.day === d).sort((a, b) => a.start.localeCompare(b.start)),
  })).filter((g) => g.items.length > 0);

  const manageSession = manageId ? sessionById[manageId] : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coaches & Sessions"
        subtitle="Cover absences by swapping coaches on upcoming sessions. Changes update the timetable and the summary reports."
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/app/swim-reports" })}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </Button>
        }
      />

      {/* Coaching team */}
      <Section
        title="Coaching team"
        description="Coaches available to lead and cover sessions. Off-board a coach who leaves the club — their history is kept, but they can no longer be rostered and payroll / messaging stops."
      >
        <ul className="grid sm:grid-cols-2 gap-2">
          {club.coachNames.map((name) => {
            const off = isOffboarded(name, offboardings);
            return (
              <li
                key={name}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border p-2 pr-2.5",
                  off ? "bg-muted/40" : "bg-card",
                )}
              >
                <Avatar name={name} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{name}</div>
                  {off && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <UserMinus className="h-3 w-3" />
                      Off-boarded
                    </span>
                  )}
                </div>
                {off ? (
                  <Button size="sm" variant="outline" onClick={() => reactivateCoach(name)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Reactivate</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOffboardCoach(name)}
                    aria-label={`Off-board ${name}`}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Off-board</span>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      {byDay.map(({ day, items }) => (
        <Section key={day} title={dayLabel(day)} description={`${items.length} session(s)`}>
          <ul className="divide-y -mx-4 sm:-mx-5">
            {items.map((s) => {
              const roster = rosterFor(s.id);
              const pool = poolById[s.poolId];
              return (
                <li
                  key={s.id}
                  className="px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap"
                >
                  <div className="text-center shrink-0 w-16">
                    <div className="text-xs font-semibold">{s.start}</div>
                    <div className="text-[10px] text-muted-foreground">{s.end}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {pool?.name} · lanes {s.laneFrom}–{s.laneTo} · {s.swimmerIds.length} swimmers
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {roster.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 rounded-full border bg-card pl-0.5 pr-2 py-0.5"
                        >
                          <Avatar name={name} size={18} />
                          <span className="text-[11px]">{name.replace("Coach ", "")}</span>
                        </span>
                      ))}
                      {roster.length === 0 && <Badge tone="destructive">No coach assigned</Badge>}
                      {isOverridden(s.id) && <Badge tone="info">Updated</Badge>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setManageId(s.id)}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Manage
                  </Button>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}

      {manageSession && (
        <ManageCoachesDialog
          session={manageSession}
          clubCoaches={activeCoaches}
          roster={rosterFor(manageSession.id)}
          adminName={user!.name}
          onClose={() => setManageId(null)}
        />
      )}

      <OffboardDialog
        open={!!offboardCoach}
        onOpenChange={(v) => !v && setOffboardCoach(null)}
        person={offboardCoach ? { id: offboardCoach, name: offboardCoach, type: "coach" } : null}
        tenantId={user?.institutionId ?? SWIM_COURSE_ID}
        tenantName={user?.institutionName ?? "the club"}
        adminName={user?.name ?? "Admin"}
      />
    </div>
  );
}

function dayLabel(d: Weekday) {
  const map: Record<Weekday, string> = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  };
  return map[d];
}

export function ManageCoachesDialog({
  session,
  clubCoaches,
  roster,
  adminName,
  onClose,
}: {
  session: PoolSession;
  clubCoaches: string[];
  roster: string[];
  adminName: string;
  onClose: () => void;
}) {
  const rosters = useCollection("sessionRosters");
  const offboardings = useCollection("offboardings");
  const current = effectiveCoachNames(session.id, rosters);
  // Off-boarded coaches can never be added or picked as cover.
  const rosterableCoaches = clubCoaches.filter((c) => !isOffboarded(c, offboardings));
  const available = rosterableCoaches.filter((c) => !current.includes(c));

  const [addPick, setAddPick] = useState(available[0] ?? "");
  const [removing, setRemoving] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [replacement, setReplacement] = useState("");

  const setRoster = (coachNames: string[]) => {
    const exists = rosters.some((r) => r.sessionId === session.id);
    if (exists) {
      updateItem("sessionRosters", (r) => r.sessionId === session.id, {
        coachNames,
        updatedBy: adminName,
        updatedAt: new Date().toISOString(),
      });
    } else {
      addItem("sessionRosters", {
        sessionId: session.id,
        coachNames,
        updatedBy: adminName,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const logAbsence = (coachName: string, replacedByName?: string) => {
    const row: CoachAttendance = {
      id: nextId("CA-", "coachAttendance"),
      sessionId: session.id,
      date: nextOccurrenceISO(session.day, session.start),
      coachName,
      status: "Absent",
      reason,
      replacedByName,
      by: adminName,
      at: new Date().toISOString(),
    };
    addItem("coachAttendance", row);
  };

  const confirmSub = () => {
    if (!removing) return;
    const withoutCoach = current.filter((c) => c !== removing);
    const nextRoster =
      replacement && !withoutCoach.includes(replacement)
        ? [...withoutCoach, replacement]
        : withoutCoach;
    setRoster(nextRoster);
    logAbsence(removing, replacement || undefined);
    toast.success(
      replacement
        ? `${removing} marked absent — ${replacement} covering ${session.title}`
        : `${removing} removed from ${session.title}`,
    );
    setRemoving(null);
    setReplacement("");
  };

  const addCoach = () => {
    if (!addPick || current.includes(addPick)) return;
    setRoster([...current, addPick]);
    toast.success(`${addPick} added to ${session.title}`);
    setAddPick("");
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage coaches</DialogTitle>
          <DialogDescription>
            {session.title} · {session.day} {session.start}–{session.end}
          </DialogDescription>
        </DialogHeader>

        {/* Current roster */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            On this session
          </div>
          {current.length === 0 && (
            <div className="text-sm text-destructive">No coach assigned — add one below.</div>
          )}
          <ul className="space-y-1.5">
            {current.map((name) => (
              <li key={name} className="rounded-lg border bg-card">
                <div className="flex items-center gap-2.5 p-2.5">
                  <Avatar name={name} size={30} />
                  <span className="text-sm font-medium flex-1 truncate">{name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRemoving(removing === name ? null : name);
                      setReplacement(rosterableCoaches.find((c) => !current.includes(c)) ?? "");
                    }}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    {removing === name ? "Cancel" : "Mark absent"}
                  </Button>
                </div>
                {removing === name && (
                  <div className="border-t p-2.5 space-y-2 bg-muted/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Reason
                        </span>
                        <Select
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          options={REASONS.map((r) => ({ value: r, label: r }))}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Cover with
                        </span>
                        <Select
                          value={replacement}
                          onChange={(e) => setReplacement(e.target.value)}
                          options={[
                            { value: "", label: "No replacement" },
                            ...rosterableCoaches
                              .filter((c) => c !== name && !current.includes(c))
                              .map((c) => ({ value: c, label: c })),
                          ]}
                        />
                      </label>
                    </div>
                    <Button size="sm" onClick={confirmSub} className="w-full">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirm — {replacement ? `swap in ${replacement}` : "remove coach"}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Add a coach */}
        {available.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Add a coach
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={addPick}
                onChange={(e) => setAddPick(e.target.value)}
                options={available.map((c) => ({ value: c, label: c }))}
                className="flex-1"
              />
              <Button onClick={addCoach} disabled={!addPick}>
                <UserPlus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground mt-1">
          <Waves className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Marking a coach absent records it in the coach-attendance report and, if you pick a cover,
          swaps them into the session roster on the timetable.
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
