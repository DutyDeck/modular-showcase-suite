import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Badge, Button, Field, TextArea, Select } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { Stars, StarInput } from "@/components/StarRating";
import { useAuth } from "@/lib/auth";
import {
  addItem,
  updateItem,
  nextId,
  useCollection,
  type TeacherRating,
  type CoachGrade,
  type CoachGradeLevel,
} from "@/lib/store";
import {
  teachers as allTeachers,
  children as myChildren,
  isSwimCoach,
  coachGradeFor,
  COACH_GRADE_LEVELS,
} from "@/lib/mockData";
import { computeAppraisal, appraisalLabel } from "@/lib/appraisal";
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  CalendarCheck,
  Award,
  Star,
  CheckCircle2,
  Medal,
  Eye,
  EyeOff,
  Lock,
  UserX,
} from "lucide-react";

export const Route = createFileRoute("/app/appraisals/$teacherId")({
  head: ({ params }) => ({ meta: [{ title: `Appraisal — ${params.teacherId}` }] }),
  component: TeacherAppraisalPage,
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.round(diff / 86400000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TeacherAppraisalPage() {
  const { teacherId } = useParams({ from: "/app/appraisals/$teacherId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const ratings = useCollection("teacherRatings");
  const grades = useCollection("coachGrades");
  const settings = useCollection("clubSettings");

  const teacher = allTeachers.find((t) => t.id === teacherId) ?? null;
  const appraisal = useMemo(
    () => (teacher ? computeAppraisal(teacher, ratings) : null),
    [teacher, ratings],
  );
  const reviews = useMemo(
    () =>
      ratings
        .filter((r) => r.teacherId === teacherId)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [ratings, teacherId],
  );

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [childName, setChildName] = useState("");
  const [anon, setAnon] = useState(false);
  const [gradeLevel, setGradeLevel] = useState<CoachGradeLevel>("Silver");
  const [gradeComment, setGradeComment] = useState("");

  if (!teacher || !appraisal) {
    return (
      <div className="text-center py-16">
        <div className="text-lg font-semibold">Teacher not found</div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: "/app/appraisals" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appraisals
        </Button>
      </div>
    );
  }

  const isParent = user?.role === "parent";
  const isAdultStudent = user?.role === "student" && !!user?.selfManaged;
  const isMinorStudent = user?.role === "student" && !user?.selfManaged;
  const canRate = isParent || isAdultStudent;
  const isSelf = user?.role === "teacher" && user?.name === teacher.name;
  const isAdmin = user?.role === "admin";

  // Minor students can't appraise teachers — their parent does it for them.
  if (isMinorStudent) {
    return (
      <div className="text-center py-16 space-y-2">
        <Star className="h-8 w-8 mx-auto text-muted-foreground" />
        <div className="text-sm font-medium">
          Teacher appraisals aren't available on your account
        </div>
        <div className="text-xs text-muted-foreground max-w-sm mx-auto">
          Rating teachers is done by an adult — your parent or guardian can leave appraisals for
          you.
        </div>
      </div>
    );
  }

  // Club coach grading (medal + comment). Only the admin can set it; visibility
  // to everyone else is admin-controlled. It's a coach — not a school teacher.
  const isCoach = isSwimCoach(teacher.name);
  const grade = coachGradeFor(teacher.id, grades);
  const gradingVisible = settings[0]?.coachGradingVisible ?? false;
  // Who may see the grade: the admin, the coach about themselves, or anyone when
  // the admin has switched grading public.
  const canSeeGrade = !!grade && (isAdmin || isSelf || gradingVisible);

  const maxDist = Math.max(1, ...appraisal.distribution.slice(1));

  const saveGrade = () => {
    if (!user) return;
    addItem("coachGrades", {
      id: nextId("CG-", "coachGrades"),
      teacherId: teacher.id,
      coachName: teacher.name,
      level: gradeLevel,
      comment: gradeComment.trim(),
      by: user.name,
      at: new Date().toISOString(),
    } as CoachGrade);
    toast.success(`Saved ${gradeLevel} grade for ${teacher.name}`);
    setGradeComment("");
  };

  const toggleGradeVisibility = () => {
    updateItem("clubSettings", (s) => s.id === "settings", {
      coachGradingVisible: !gradingVisible,
    });
    toast.success(
      !gradingVisible
        ? "Coach grades are now visible to parents & coaches"
        : "Coach grades are now private (admin & coach only)",
    );
  };

  const submit = () => {
    if (!user) return;
    if (!stars) {
      toast.error("Please pick a star rating");
      return;
    }
    const rating: TeacherRating = {
      id: nextId("TR-", "teacherRatings"),
      teacherId: teacher.id,
      teacherName: teacher.name,
      authorName: user.name,
      authorRole: isParent ? "parent" : "student",
      stars,
      comment: comment.trim(),
      at: new Date().toISOString(),
      childName: isParent && !anon ? childName || undefined : undefined,
      anonymous: anon || undefined,
    };
    addItem("teacherRatings", rating);
    toast.success(
      anon
        ? "Thanks — your anonymous appraisal was submitted"
        : "Thanks — your appraisal was submitted",
    );
    setStars(0);
    setComment("");
    setChildName("");
    setAnon(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teacher Appraisal"
        subtitle={
          isSelf
            ? "How families and student outcomes rate your teaching."
            : `Appraisal profile for ${teacher.name}.`
        }
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/app/appraisals" })}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">All teachers</span>
          </Button>
        }
      />

      {/* Hero */}
      <Section className="!p-0 overflow-hidden">
        <div className="bg-gradient-hero text-white p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <Avatar
              name={teacher.name}
              src={teacher.photo}
              size={64}
              className="ring-2 ring-white/40"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold truncate">{teacher.name}</h2>
                {isSelf && <Badge tone="muted">You</Badge>}
                {canSeeGrade && grade && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 ring-1 ring-white/25 px-2 py-0.5 text-xs font-semibold">
                    <Medal className="h-3.5 w-3.5" />
                    {grade.level}
                  </span>
                )}
              </div>
              <div className="text-sm opacity-90 mt-0.5">
                {teacher.subject} · {teacher.experienceYears} yrs experience
              </div>
              <div className="text-xs opacity-85 mt-1 inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {teacher.institutionName}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-bold leading-none">{appraisal.blended.toFixed(1)}</div>
              <div className="text-[11px] opacity-85 mt-0.5">
                {appraisalLabel(appraisal.blended)}
              </div>
              <div className="mt-1.5">
                <Stars value={appraisal.blended} size={16} />
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HeroStat
              icon={<Star className="h-4 w-4" />}
              label="Family rating"
              value={appraisal.ratingCount ? appraisal.ratingAvg.toFixed(1) : "—"}
            />
            <HeroStat
              icon={<GraduationCap className="h-4 w-4" />}
              label="Student GPA"
              value={teacher.avgStudentGpa.toFixed(1)}
            />
            <HeroStat
              icon={<Award className="h-4 w-4" />}
              label="Pass rate"
              value={`${teacher.passRate}%`}
            />
            <HeroStat
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Attendance"
              value={`${teacher.attendanceRate}%`}
            />
          </div>
        </div>
      </Section>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Score breakdown */}
        <Section
          title="How the score is built"
          description="60% family ratings · 40% student performance"
          className="lg:col-span-1"
        >
          <div className="space-y-4 text-sm">
            <Breakdown
              label="Family star ratings"
              value={appraisal.ratingCount ? appraisal.ratingAvg : 0}
              note={`${appraisal.ratingCount} review${appraisal.ratingCount === 1 ? "" : "s"}`}
            />
            <Breakdown
              label="Student performance"
              value={appraisal.performanceStars}
              note="GPA · pass rate · attendance"
            />
            <div className="pt-3 border-t flex items-center justify-between">
              <span className="font-medium">Blended appraisal</span>
              <span className="text-lg font-bold">{appraisal.blended.toFixed(1)}</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Rating distribution
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-muted-foreground">{star}</span>
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-warning rounded-full"
                      style={{ width: `${(appraisal.distribution[star] / maxDist) * 100}%` }}
                    />
                  </div>
                  <span className="w-4 text-right text-muted-foreground">
                    {appraisal.distribution[star]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Reviews + rating form */}
        <div className="lg:col-span-2 space-y-5">
          {canRate && (
            <Section
              title="Rate this teacher"
              description="Your star rating and comment are shared to help others choose."
            >
              <div className="space-y-3" data-tour="rate-form">
                <div className="flex items-center gap-3 flex-wrap">
                  <StarInput value={stars} onChange={setStars} />
                  {stars > 0 && <span className="text-sm text-muted-foreground">{stars} / 5</span>}
                </div>
                {isParent && myChildren.length > 0 && (
                  <Field label="Which child's class? (optional)">
                    <Select
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      options={[
                        { value: "", label: "— Not specified —" },
                        ...myChildren.map((c) => ({ value: c.name, label: c.name })),
                      ]}
                    />
                  </Field>
                )}
                <Field label="Comment">
                  <TextArea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What stood out about this teacher's coaching?"
                    className="min-h-[80px]"
                    data-tour="rate-comment"
                  />
                </Field>
                <label className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anon}
                    onChange={(e) => setAnon(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                    data-tour="rate-anon"
                  />
                  <span className="text-xs">
                    <span className="font-medium">Submit anonymously</span>
                    <span className="block text-muted-foreground mt-0.5">
                      The coach won't see your name{isParent ? " or which child" : ""}. The club
                      admin can still see it for accountability.
                    </span>
                  </span>
                </label>
                <div className="flex justify-end">
                  <Button onClick={submit} disabled={!stars} data-tour="rate-submit">
                    <Star className="h-4 w-4" />
                    Submit appraisal
                  </Button>
                </div>
              </div>
            </Section>
          )}

          {isSelf && (
            <div className="rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              This is your appraisal profile. Family ratings and your students' outcomes are blended
              into the score above — use it to reflect and to discuss professional development.
            </div>
          )}

          {/* Club coach grade — management appraisal (medal + private comment) */}
          {isCoach && (isAdmin || (grade && (isSelf || gradingVisible))) && (
            <Section
              title="Club grade"
              description={
                isAdmin
                  ? "Management's own view of this coach — a medal level, separate from parent ratings."
                  : isSelf
                    ? "How the club rates your coaching. Private to you and management unless made public."
                    : "The club's grade for this coach."
              }
            >
              {grade ? (
                <div className="flex items-start gap-3" data-tour="club-grade">
                  <MedalBadge level={grade.level} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{grade.level}</span>
                      {!gradingVisible && (isAdmin || isSelf) && (
                        <Badge tone="muted">
                          <Lock className="h-3 w-3" />
                          Private
                        </Badge>
                      )}
                    </div>
                    {grade.comment && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {grade.comment}
                      </p>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-1">
                      by {grade.by} · {timeAgo(grade.at)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not graded yet.</p>
              )}

              {isAdmin && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="grid sm:grid-cols-[160px_1fr] gap-3 items-start">
                    <Field label="Grade level">
                      <Select
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value as CoachGradeLevel)}
                        options={COACH_GRADE_LEVELS.map((l) => ({ value: l, label: l }))}
                        data-tour="grade-level"
                      />
                    </Field>
                    <Field label="Private management note">
                      <TextArea
                        value={gradeComment}
                        onChange={(e) => setGradeComment(e.target.value)}
                        placeholder="What's strong; what would move them up a level…"
                        className="min-h-[64px]"
                        data-tour="grade-comment"
                      />
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={toggleGradeVisibility}
                      className="inline-flex items-center gap-1.5 text-xs rounded-md border px-2.5 py-1.5 hover:bg-muted"
                    >
                      {gradingVisible ? (
                        <Eye className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {gradingVisible
                        ? "Visible to parents & coaches"
                        : "Private (admin & coach only)"}
                    </button>
                    <Button onClick={saveGrade} data-tour="grade-save">
                      <Medal className="h-4 w-4" />
                      Save grade
                    </Button>
                  </div>
                </div>
              )}
            </Section>
          )}

          <Section title={`Reviews (${reviews.length})`}>
            {reviews.length === 0 ? (
              <div className="text-sm text-muted-foreground italic py-4 text-center">
                No written reviews yet.
              </div>
            ) : (
              <ul className="divide-y -my-2">
                {reviews.map((r) => {
                  // Anonymous reviews hide the author from everyone except the club
                  // admin (who keeps accountability). The coach sees "Anonymous".
                  const hideIdentity = r.anonymous && !isAdmin;
                  const shownName = hideIdentity ? "Anonymous parent" : r.authorName;
                  return (
                    <li key={r.id} className="py-4 flex gap-3">
                      {hideIdentity ? (
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <UserX className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <Avatar name={r.authorName} size={36} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold truncate">{shownName}</span>
                          <Badge tone={r.authorRole === "parent" ? "info" : "muted"}>
                            {r.authorRole === "parent" ? "Parent" : "Student"}
                          </Badge>
                          {r.anonymous && (
                            <Badge tone="muted">
                              <UserX className="h-3 w-3" />
                              Anonymous
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            · {timeAgo(r.at)}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Stars value={r.stars} size={13} />
                        </div>
                        {r.comment && (
                          <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">
                            {r.comment}
                          </p>
                        )}
                        {r.childName && !hideIdentity && (
                          <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-success" />
                            Verified family · {r.childName}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

const MEDAL_TONE: Record<CoachGradeLevel, string> = {
  Bronze: "bg-gradient-to-br from-amber-600 to-amber-800",
  Silver: "bg-gradient-to-br from-slate-300 to-slate-500",
  Gold: "bg-gradient-to-br from-yellow-400 to-amber-500",
  Platinum: "bg-gradient-to-br from-cyan-300 to-violet-400",
};

function MedalBadge({ level, size = 44 }: { level: CoachGradeLevel; size?: number }) {
  return (
    <div
      className={`shrink-0 rounded-xl flex items-center justify-center text-white shadow ${MEDAL_TONE[level]}`}
      style={{ width: size, height: size }}
      title={`${level} coach grade`}
    >
      <Medal style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-85">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold mt-0.5 text-white">{value}</div>
    </div>
  );
}

function Breakdown({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value ? value.toFixed(1) : "—"}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Stars value={value} size={14} />
        <span className="text-[11px] text-muted-foreground">{note}</span>
      </div>
    </div>
  );
}
