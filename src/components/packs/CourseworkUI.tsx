/* Shared data hook + small pieces for the pack-tenant Assignments, Grading and
 * Grades views. Teaching groups come from learning.ts (live collections) plus
 * early-years forms as pseudo groups (learning journal, no subject classes). */
import { useMemo } from "react";
import { Badge } from "@/components/ui-kit";
import { useCollection } from "@/lib/store";
import { useTenantContext } from "@/lib/packs/registry";
import {
  ageBandFor,
  buildTeachingGroups,
  groupsForUser,
  type TeachingGroup,
} from "@/lib/packs/sis/learning";
import {
  courseworkState,
  earlyYearsGroups,
  reportScale,
  type Coursework,
  type CourseworkState,
  type ReportScale,
} from "@/lib/packs/sis/coursework";
import type { Learner } from "@/lib/packs/foundationData";

export function useLearning() {
  const ctx = useTenantContext();
  const t = ctx.tenantId;
  const subjectClasses = useCollection("subjectClasses");
  const heModules = useCollection("heModules");
  const moduleRegistrations = useCollection("moduleRegistrations");
  const qualifications = useCollection("qualifications");
  const learnersAll = useCollection("learners");
  const tutorGroups = useCollection("tutorGroups");
  const curricula = useCollection("curricula");
  const courseworkAll = useCollection("coursework");
  const submissionsAll = useCollection("submissions");
  const reportsAll = useCollection("progressReports");

  return useMemo(() => {
    const pack = ctx.profile?.experience === "segment";
    const learners = learnersAll.filter((l) => l.tenantId === t);
    const groups: TeachingGroup[] = [
      ...buildTeachingGroups({
        subjectClasses,
        heModules,
        moduleRegistrations,
        qualifications,
        learners: learnersAll,
      }),
      ...earlyYearsGroups(tutorGroups, learnersAll),
    ].filter((g) => g.tenantId === t);
    const user = ctx.user;
    /** The learners this person follows: student → self, parent → children. */
    const kids: Learner[] =
      user?.role === "student"
        ? learners.filter((l) => l.id === user.oneEduId)
        : user?.role === "parent"
          ? learners.filter((l) => l.guardians?.includes(user.name))
          : [];
    const myGroups = groupsForUser(
      user,
      groups,
      learners,
      user?.role === "student" || user?.role === "parent" ? kids.map((k) => k.id) : undefined,
    );
    const coursework = courseworkAll.filter((c) => c.tenantId === t);
    const submissions = submissionsAll.filter((s) => s.tenantId === t);
    const reports = reportsAll.filter((r) => r.tenantId === t);
    const groupById = (id: string) => groups.find((g) => g.id === id);
    const learnerName = (id: string) => learners.find((l) => l.id === id)?.name ?? id;
    const scaleFor = (g: TeachingGroup): ReportScale => {
      const cid = subjectClasses.find((s) => s.id === g.id)?.curriculumId;
      return reportScale(
        g,
        curricula.find((c) => c.id === cid),
      );
    };
    const subFor = (cwId: string, studentId: string) =>
      submissions.find((s) => s.courseworkId === cwId && s.studentId === studentId);
    return {
      ctx,
      pack,
      learners,
      groups,
      myGroups,
      kids,
      coursework,
      submissions,
      reports,
      groupById,
      learnerName,
      scaleFor,
      subFor,
      heModules: heModules.filter((m) => m.tenantId === t),
      moduleRegistrations: moduleRegistrations.filter((r) => r.tenantId === t),
      qualifications: qualifications.filter((q) => q.tenantId === t),
    };
  }, [
    ctx,
    t,
    subjectClasses,
    heModules,
    moduleRegistrations,
    qualifications,
    learnersAll,
    tutorGroups,
    curricula,
    courseworkAll,
    submissionsAll,
    reportsAll,
  ]);
}

export type LearningData = ReturnType<typeof useLearning>;

export const bandOf = (l: Pick<Learner, "level">) => ageBandFor(l.level);

const STATE_TONE: Record<
  CourseworkState,
  "success" | "warning" | "destructive" | "info" | "muted"
> = {
  Marked: "success",
  Submitted: "info",
  Late: "warning",
  Overdue: "destructive",
  Due: "muted",
};

export function StateBadge({ state }: { state: CourseworkState }) {
  return <Badge tone={STATE_TONE[state]}>{state}</Badge>;
}

export { courseworkState };

/** "Mon 2 Nov" style short date. */
export const shortDate = (iso?: string) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "—";

/** Score / descriptor / outcome as shown to families. */
export function resultText(
  cw: Pick<Coursework, "maxScore">,
  sub?: { score?: number; descriptor?: string; status: string },
) {
  if (!sub || sub.status !== "Marked") return "—";
  if (sub.descriptor) return sub.descriptor;
  if (sub.score !== undefined && cw.maxScore) return `${sub.score}/${cw.maxScore}`;
  return "Feedback given";
}

/** Small learner switcher (parent with several children). */
export function KidPicker({
  kids,
  value,
  onChange,
}: {
  kids: Learner[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (kids.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {kids.map((k) => (
        <button
          key={k.id}
          onClick={() => onChange(k.id)}
          className={
            "rounded-full border px-3 py-1 text-sm transition-colors " +
            (value === k.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted")
          }
        >
          {k.name.split(" ")[0]} <span className="opacity-70">· {k.level}</span>
        </button>
      ))}
    </div>
  );
}
