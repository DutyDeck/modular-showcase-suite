import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge, Button, Field, Select } from "@/components/ui-kit";
import { useCollection, addItem, nextId, type Student, type SwimmerMove } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { sessionsByCourse, effectiveSwimmerIds, poolById, SWIM_COURSE_ID } from "@/lib/mockData";
import { Waves, Plus, X } from "lucide-react";

/**
 * Manage a swimmer's programme from the Swimmers module. A swimmer's programme is
 * the set of sessions (and therefore levels) they train in — the admin adds them
 * to a session or removes them from one. Changes are written as `swimmerMoves`
 * (enrol / unenrol) so the seed timetable is never mutated.
 */
export function SwimProgrammeDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: Student | null;
}) {
  const { user } = useAuth();
  const moves = useCollection("swimmerMoves");
  const [addSessionId, setAddSessionId] = useState("");

  const allSessions = useMemo(() => sessionsByCourse(SWIM_COURSE_ID), []);
  const current = useMemo(
    () =>
      student ? allSessions.filter((s) => effectiveSwimmerIds(s, moves).includes(student.id)) : [],
    [allSessions, moves, student],
  );
  const currentIds = new Set(current.map((s) => s.id));
  const available = allSessions.filter((s) => !currentIds.has(s.id));
  const levels = Array.from(new Set(current.map((s) => s.level)));

  const addToSession = () => {
    if (!student || !addSessionId) {
      toast.error("Pick a session to add the swimmer to");
      return;
    }
    const target = allSessions.find((s) => s.id === addSessionId);
    const move: SwimmerMove = {
      id: nextId("MOV-", "swimmerMoves"),
      studentId: student.id,
      studentName: student.name,
      sessionId: addSessionId,
      kind: "enroll",
      reason: `Programme change — added to ${target?.title ?? "session"}`,
      by: user?.name ?? "Club Manager",
      at: new Date().toISOString(),
    };
    addItem("swimmerMoves", move);
    toast.success(`${student.name} added to ${target?.title}`);
    setAddSessionId("");
  };

  const removeFromSession = (sessionId: string, title: string) => {
    if (!student) return;
    const move: SwimmerMove = {
      id: nextId("MOV-", "swimmerMoves"),
      studentId: student.id,
      studentName: student.name,
      sessionId: "",
      fromSessionId: sessionId,
      kind: "unenroll",
      reason: `Programme change — removed from ${title}`,
      by: user?.name ?? "Club Manager",
      at: new Date().toISOString(),
    };
    addItem("swimmerMoves", move);
    toast.success(`${student.name} removed from ${title}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage programme — {student?.name}</DialogTitle>
          <DialogDescription>
            Add or remove the swimmer from sessions. Their programme reflects the levels of the
            sessions they train in.
          </DialogDescription>
        </DialogHeader>

        {student && (
          <div className="space-y-4">
            {/* Current programme */}
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                Current programme
              </div>
              {levels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {levels.map((l) => (
                    <Badge key={l} tone="info">
                      {l}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Not in any session yet — add one below.
                </div>
              )}
            </div>

            {/* Current sessions with remove */}
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                Sessions ({current.length})
              </div>
              {current.length === 0 ? (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground text-center">
                  No sessions assigned.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {current.map((s) => {
                    const pool = poolById[s.poolId];
                    return (
                      <li
                        key={s.id}
                        className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
                      >
                        <Waves className="h-4 w-4 text-sky-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{s.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {s.level} · {s.day} {s.start} · {pool?.name}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromSession(s.id, s.title)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          aria-label={`Remove from ${s.title}`}
                          title="Remove from session"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Add to a session */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <Field label="Add to a session">
                <div className="flex gap-2">
                  <Select
                    value={addSessionId}
                    onChange={(e) => setAddSessionId(e.target.value)}
                    options={[
                      { value: "", label: "— Select a session —" },
                      ...available.map((s) => ({
                        value: s.id,
                        label: `${s.title} · ${s.level} · ${s.day} ${s.start}`,
                      })),
                    ]}
                    className="flex-1"
                  />
                  <Button onClick={addToSession} disabled={!addSessionId}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </Field>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
