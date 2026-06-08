import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Badge, Button, Field, TextArea, Select } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { Stars, StarInput } from "@/components/StarRating";
import { useAuth } from "@/lib/auth";
import { addItem, nextId, useCollection, type TeacherRating } from "@/lib/store";
import { teachers as allTeachers, children as myChildren } from "@/lib/mockData";
import { computeAppraisal, appraisalLabel } from "@/lib/appraisal";
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  CalendarCheck,
  Award,
  Star,
  CheckCircle2,
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
  const canRate = isParent || isAdultStudent;
  const isSelf = user?.role === "teacher" && user?.name === teacher.name;

  const maxDist = Math.max(1, ...appraisal.distribution.slice(1));

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
      childName: isParent ? childName || undefined : undefined,
    };
    addItem("teacherRatings", rating);
    toast.success("Thanks — your appraisal was submitted");
    setStars(0);
    setComment("");
    setChildName("");
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
              <div className="space-y-3">
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
                  />
                </Field>
                <div className="flex justify-end">
                  <Button onClick={submit} disabled={!stars}>
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

          <Section title={`Reviews (${reviews.length})`}>
            {reviews.length === 0 ? (
              <div className="text-sm text-muted-foreground italic py-4 text-center">
                No written reviews yet.
              </div>
            ) : (
              <ul className="divide-y -my-2">
                {reviews.map((r) => (
                  <li key={r.id} className="py-4 flex gap-3">
                    <Avatar name={r.authorName} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{r.authorName}</span>
                        <Badge tone={r.authorRole === "parent" ? "info" : "muted"}>
                          {r.authorRole === "parent" ? "Parent" : "Student"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">· {timeAgo(r.at)}</span>
                      </div>
                      <div className="mt-1">
                        <Stars value={r.stars} size={13} />
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">
                          {r.comment}
                        </p>
                      )}
                      {r.childName && (
                        <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-success" />
                          Verified family · {r.childName}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
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
