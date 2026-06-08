import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Badge, Button } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { addItem, updateItem, nextId, useCollection, type TrainingEnrollment } from "@/lib/store";
import { trainingCourseById } from "@/lib/mockData";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Circle,
  Award,
  Printer,
  GraduationCap,
  PlayCircle,
} from "lucide-react";

export const Route = createFileRoute("/app/training/$courseId")({
  head: ({ params }) => ({ meta: [{ title: `Training — ${params.courseId}` }] }),
  component: TrainingCoursePage,
});

function progressOf(completed: string[], total: number): number {
  if (!total) return 0;
  return Math.round((completed.length / total) * 100);
}

function TrainingCoursePage() {
  const { courseId } = useParams({ from: "/app/training/$courseId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const enrollments = useCollection("trainingEnrollments");

  const course = trainingCourseById[courseId] ?? null;
  const enrolment = useMemo(
    () => enrollments.find((e) => e.courseId === courseId && e.teacherName === user?.name) ?? null,
    [enrollments, courseId, user?.name],
  );

  if (!course) {
    return (
      <div className="text-center py-16">
        <div className="text-lg font-semibold">Course not found</div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: "/app/training" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to training
        </Button>
      </div>
    );
  }

  const total = course.lessons.length;
  const done = enrolment?.completedLessonIds ?? [];
  const pct = progressOf(done, total);
  const isComplete = enrolment?.status === "completed";

  const enrol = () => {
    if (!user) return;
    const e: TrainingEnrollment = {
      id: nextId("TRE-", "trainingEnrollments"),
      courseId,
      teacherName: user.name,
      enrolledAt: new Date().toISOString(),
      completedLessonIds: [],
      status: "enrolled",
    };
    addItem("trainingEnrollments", e);
    toast.success("Enrolled — start your first lesson");
  };

  const toggleLesson = (lessonId: string) => {
    if (!enrolment) return;
    const has = enrolment.completedLessonIds.includes(lessonId);
    const next = has
      ? enrolment.completedLessonIds.filter((id) => id !== lessonId)
      : [...enrolment.completedLessonIds, lessonId];
    const nowComplete = next.length === total;
    updateItem("trainingEnrollments", (e) => e.id === enrolment.id, {
      completedLessonIds: next,
      status: nowComplete ? "completed" : next.length > 0 ? "in-progress" : "enrolled",
      certificateIssuedAt:
        nowComplete && !enrolment.certificateIssuedAt
          ? new Date().toISOString()
          : nowComplete
            ? enrolment.certificateIssuedAt
            : undefined,
    });
    if (nowComplete && !has) {
      toast.success("🎉 Course complete — certificate issued!");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={course.title}
        subtitle={`${course.provider} · ${course.level} · ${course.hours}h`}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/app/training" })}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">All training</span>
          </Button>
        }
      />

      {/* Hero / progress */}
      <Section className="!p-0 overflow-hidden">
        <div className="bg-gradient-hero text-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <Badge tone="muted">{course.category}</Badge>
              <p className="text-sm opacity-90 mt-2 max-w-xl">{course.blurb}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-bold leading-none">{pct}%</div>
              <div className="text-[11px] opacity-85 mt-0.5">
                {done.length}/{total} lessons
              </div>
            </div>
          </div>
          <div className="mt-4 h-2.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Section>

      {!enrolment ? (
        <Section>
          <div className="text-center py-8">
            <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">You're not enrolled in this course</div>
            <div className="text-xs text-muted-foreground mt-1 mb-4">
              Enrol to participate as a learner and track your progress.
            </div>
            <Button onClick={enrol}>
              <GraduationCap className="h-4 w-4" />
              Enrol now
            </Button>
          </div>
        </Section>
      ) : (
        <>
          {isComplete && (
            <Certificate
              courseTitle={course.title}
              learner={user?.name ?? ""}
              issuedAt={enrolment.certificateIssuedAt}
            />
          )}

          <Section
            title="Lessons"
            description="Mark each lesson complete as you work through the course."
          >
            <ul className="divide-y -my-2">
              {course.lessons.map((l, i) => {
                const complete = done.includes(l.id);
                return (
                  <li key={l.id} className="py-3 flex items-center gap-3">
                    <button
                      onClick={() => toggleLesson(l.id)}
                      className="shrink-0"
                      aria-label={complete ? "Mark incomplete" : "Mark complete"}
                    >
                      {complete ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-medium truncate ${complete ? "text-muted-foreground line-through" : ""}`}
                      >
                        {i + 1}. {l.title}
                      </div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {l.minutes} min
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={complete ? "outline" : "primary"}
                      onClick={() => toggleLesson(l.id)}
                    >
                      {complete ? (
                        "Completed"
                      ) : (
                        <>
                          <PlayCircle className="h-3.5 w-3.5" />
                          Mark done
                        </>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}

function Certificate({
  courseTitle,
  learner,
  issuedAt,
}: {
  courseTitle: string;
  learner: string;
  issuedAt?: string;
}) {
  const date = issuedAt
    ? new Date(issuedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  return (
    <Section className="!p-0 overflow-hidden">
      <div className="border-2 border-primary/30 m-4 rounded-xl p-6 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <Award className="h-10 w-10 text-primary mx-auto" />
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-3">
          Certificate of Completion
        </div>
        <div className="text-lg font-bold mt-2">{learner}</div>
        <div className="text-xs text-muted-foreground mt-1">has successfully completed</div>
        <div className="text-base font-semibold mt-1">{courseTitle}</div>
        {date && (
          <div className="text-xs text-muted-foreground mt-3">Issued {date} · One Edu Academy</div>
        )}
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / save PDF
          </Button>
        </div>
      </div>
    </Section>
  );
}
