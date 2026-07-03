import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Section, Badge, Button, Field, TextArea } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCollection,
  addItem,
  nextId,
  type LevelAssessment,
  type SwimmerMove,
} from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  swimmerCurrentLevel,
  nextSwimLevel,
  LEVEL_CRITERIA,
  sessionsByCourse,
  effectiveSwimmerIds,
  SWIM_COURSE_ID,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { TrendingUp, CheckCircle2, Circle, GraduationCap, ArrowUpRight } from "lucide-react";

/**
 * A swimmer's level progression: current level, the criteria to progress, the
 * latest coach assessment and a "qualify for next level" decision. Coaches/admins
 * can record an assessment (tick criteria) and, when qualified, promote the
 * swimmer into a next-level session.
 */
export function LevelProgression({
  studentId,
  studentName,
  canAssess,
}: {
  studentId: string;
  studentName: string;
  canAssess: boolean;
}) {
  const { user } = useAuth();
  const allAssessments = useCollection("levelAssessments");
  const moves = useCollection("swimmerMoves");
  const [open, setOpen] = useState(false);

  const current = swimmerCurrentLevel(studentId);
  const next = nextSwimLevel(current);
  const criteria = LEVEL_CRITERIA[current] ?? [];

  const assessments = useMemo(
    () =>
      allAssessments
        .filter((a) => a.studentId === studentId)
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    [allAssessments, studentId],
  );
  const latest = assessments[0];
  const qualified = latest?.outcome === "Qualified" && latest?.fromLevel === current;

  const promote = () => {
    if (!next) return;
    const target = sessionsByCourse(SWIM_COURSE_ID).find(
      (s) => s.level === next && !effectiveSwimmerIds(s, moves).includes(studentId),
    );
    if (!target) {
      toast.error(`No ${next} session available to move into`);
      return;
    }
    const move: SwimmerMove = {
      id: nextId("MOV-", "swimmerMoves"),
      studentId,
      studentName,
      sessionId: target.id,
      kind: "permanent",
      reason: `Promoted to ${next}`,
      by: user?.name ?? "Coach",
      at: new Date().toISOString(),
    };
    addItem("swimmerMoves", move);
    toast.success(`${studentName} promoted to ${next} — added to ${target.title}`);
  };

  return (
    <Section
      title="Level & progression"
      description="Where this swimmer is on the pathway and what it takes to move up."
      actions={
        canAssess && criteria.length > 0 ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <GraduationCap className="h-3.5 w-3.5" />
            Record assessment
          </Button>
        ) : undefined
      }
    >
      {/* Pathway */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone="info">{current}</Badge>
        {next ? (
          <>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <Badge tone={qualified ? "success" : "muted"}>{next}</Badge>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {current === "Diving" ? "Specialist strand" : "Top of the club pathway"}
          </span>
        )}
      </div>

      {/* Qualified banner */}
      {qualified && next && (
        <div className="mt-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Ready to move up to {next}</div>
            <div className="text-xs text-muted-foreground">
              Assessed by {latest.coachName} · {new Date(latest.at).toLocaleDateString()}
            </div>
          </div>
          {canAssess && (
            <Button size="sm" onClick={promote}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              Promote
            </Button>
          )}
        </div>
      )}

      {/* Criteria checklist from the latest assessment */}
      {criteria.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Criteria to progress from {current}
            {latest && latest.fromLevel === current && (
              <span className="ml-2 normal-case font-normal">
                · last assessed {new Date(latest.at).toLocaleDateString()}
              </span>
            )}
          </div>
          <ul className="space-y-1.5">
            {criteria.map((c) => {
              const met = latest?.fromLevel === current && latest.metCriteria.includes(c);
              return (
                <li key={c} className="flex items-start gap-2 text-sm">
                  {met ? (
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                  )}
                  <span className={cn(!met && "text-muted-foreground")}>{c}</span>
                </li>
              );
            })}
          </ul>
          {latest?.note && latest.fromLevel === current && (
            <p className="mt-3 text-xs text-muted-foreground italic border-l-2 border-muted pl-3">
              "{latest.note}" — {latest.coachName}
            </p>
          )}
        </div>
      )}

      {!next && current !== "Diving" && (
        <p className="mt-3 text-xs text-muted-foreground">
          This swimmer is at the top of the club pathway — competitive squad focus is on race times
          and meet performance.
        </p>
      )}

      {canAssess && (
        <AssessDialog
          open={open}
          onOpenChange={setOpen}
          studentId={studentId}
          studentName={studentName}
          fromLevel={current}
          toLevel={next}
          criteria={criteria}
        />
      )}
    </Section>
  );
}

function AssessDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  fromLevel,
  toLevel,
  criteria,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentId: string;
  studentName: string;
  fromLevel: string;
  toLevel: string | null;
  criteria: string[];
}) {
  const { user } = useAuth();
  const [met, setMet] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  const allMet = criteria.length > 0 && met.size === criteria.length;

  const submit = () => {
    if (!user) return;
    const assessment: LevelAssessment = {
      id: nextId("LA-", "levelAssessments"),
      studentId,
      studentName,
      coachName: user.name,
      fromLevel,
      toLevel: toLevel ?? fromLevel,
      metCriteria: criteria.filter((c) => met.has(c)),
      outcome: allMet ? "Qualified" : "Not yet",
      note: note.trim() || undefined,
      at: new Date().toISOString(),
    };
    addItem("levelAssessments", assessment);
    toast.success(
      allMet
        ? `${studentName} qualified to move up to ${toLevel}`
        : `Assessment saved — ${studentName} not yet ready`,
    );
    setMet(new Set());
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assess {studentName}</DialogTitle>
          <DialogDescription>
            Tick the criteria met to progress from {fromLevel}
            {toLevel ? ` to ${toLevel}` : ""}. Meeting all of them qualifies the swimmer to move up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ul className="space-y-1.5">
            {criteria.map((c) => {
              const on = met.has(c);
              return (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() =>
                      setMet((s) => {
                        const n = new Set(s);
                        if (n.has(c)) n.delete(c);
                        else n.add(c);
                        return n;
                      })
                    }
                    className="w-full text-left flex items-start gap-2.5 py-1.5 text-sm"
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5",
                        on ? "bg-success border-success text-white" : "bg-card",
                      )}
                    >
                      {on && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn(!on && "text-muted-foreground")}>{c}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-medium",
              allMet ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {allMet
              ? `All criteria met — ${studentName} qualifies for ${toLevel}.`
              : `${met.size}/${criteria.length} met — outcome will be "Not yet".`}
          </div>
          <Field label="Coach note (optional)">
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Strengths, what to work on before the next assessment…"
              className="min-h-[80px]"
            />
          </Field>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit}>
            <GraduationCap className="h-4 w-4" />
            Save assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
