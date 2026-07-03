import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import {
  children as parentChildren,
  getEnrollments,
  isSwimUser,
  sessionsForSwimmer,
  SWIM_COURSE_ID,
} from "@/lib/mockData";
import { Avatar } from "@/components/Avatar";
import { Badge, Button, PageHeader, Section, useDisclosure } from "@/components/ui-kit";
import { SrbTimeline, SrbComposer } from "@/components/Srb";
import { LevelProgression } from "@/components/LevelProgression";
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  Award,
  Wallet,
  Plus,
  Printer,
  MessageSquare,
  Building2,
  KeyRound,
  Waves,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/srb/$studentId")({
  head: ({ params }) => ({
    meta: [{ title: `Record Book — ${params.studentId}` }],
  }),
  component: SrbStudentPage,
});

function SrbStudentPage() {
  const { studentId } = useParams({ from: "/app/srb/$studentId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const students = useCollection("students");
  const srb = useCollection("srb");
  const sessionAtt = useCollection("sessionAttendance");
  const composer = useDisclosure();

  const student = useMemo(() => {
    const s = students.find((x) => x.id === studentId);
    if (s) {
      const c = parentChildren.find((c) => c.id === studentId);
      return {
        ...s,
        attendance: s.attendance,
        gpa: s.gpa,
        duesUSD: c?.duesUSD,
        nextClass: c?.nextClass,
      };
    }
    const c = parentChildren.find((x) => x.id === studentId);
    if (c)
      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        batch: "",
        attendance: c.attendance,
        gpa: c.gpa,
        status: "Active",
        parent: "—",
        risk: "low" as const,
        duesUSD: c.duesUSD,
        nextClass: c.nextClass,
      };
    return null;
  }, [students, studentId]);

  // An institute admin only sees record-book entries from their own institute.
  const scopeInst = user?.adminScope === "institute" ? user.institutionId : undefined;
  // Swim accounts only see swim-club records for the swimmer, never other subjects.
  const swim = isSwimUser(user);
  const scopeCourse = swim ? SWIM_COURSE_ID : undefined;
  const studentSrb = useMemo(
    () =>
      srb.filter(
        (e) =>
          e.studentId === studentId &&
          (!scopeInst || e.institutionId === scopeInst) &&
          (!scopeCourse || e.courseId === scopeCourse),
      ),
    [srb, studentId, scopeInst, scopeCourse],
  );
  const needsAck = studentSrb.filter((e) => e.requiresAck && !e.ackAt).length;

  // Swim-relevant stats for the hero (replaces school GPA/attendance/fees).
  const swimStats = useMemo(() => {
    const mySess = sessionsForSwimmer(studentId);
    const rows = sessionAtt.filter((a) => a.studentId === studentId);
    const present = rows.filter((a) => a.status !== "Absent").length;
    const rate = rows.length ? Math.round((present / rows.length) * 100) : 0;
    const levels = Array.from(new Set(mySess.map((s) => s.level)));
    return { sessions: mySess.length, rate, level: levels[0] ?? "Swimmer" };
  }, [sessionAtt, studentId]);

  const enrolments = useMemo(() => {
    if (!student) return [];
    const all = getEnrollments({
      id: student.id,
      grade: student.grade,
      batch: student.batch,
    });
    // An institute admin must only see their own institute's relationship with
    // the student, not the other institutions the student attends.
    if (user?.adminScope === "institute") {
      return all.filter((e) => e.institutionId === user.institutionId);
    }
    return all;
  }, [student, user?.adminScope, user?.institutionId]);

  if (!student) {
    return (
      <div className="text-center py-16">
        <div className="text-lg font-semibold">Student not found</div>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/app/srb" })}>
          <ArrowLeft className="h-4 w-4" />
          Back to record books
        </Button>
      </div>
    );
  }

  const isParent = user?.role === "parent";
  const isStaff = user?.role === "teacher" || user?.role === "admin";
  const isStudent = user?.role === "student";

  const recentAttn = studentSrb
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Record Book"
        subtitle={
          swim
            ? `Coach ⇄ family log for ${student.name} — swim sessions, achievements and ratings.`
            : `Two-way log between teachers and parents for ${student.name}.`
        }
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print portfolio</span>
            </Button>
            {(isStaff || isParent) && (
              <Button onClick={composer.onOpen}>
                <Plus className="h-4 w-4" />
                {isParent ? "Note for teacher" : "New entry"}
              </Button>
            )}
          </>
        }
      />

      {/* Student hero */}
      <Section className="!p-0 overflow-hidden">
        <div className="bg-gradient-hero text-white p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <Avatar
              name={student.name}
              seed={student.id}
              size={64}
              className="ring-2 ring-white/40"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold truncate">{student.name}</h2>
                <Badge tone="muted">{student.id}</Badge>
              </div>
              <div className="text-sm opacity-90 mt-0.5">
                {swim
                  ? swimStats.level
                  : `${student.grade}${student.batch ? ` · ${student.batch}` : ""}`}
              </div>
              {student.nextClass && (
                <div className="text-xs opacity-85 mt-1">
                  Next class: <span className="font-medium">{student.nextClass}</span>
                </div>
              )}
            </div>
            {isParent && (
              <Link
                to="/app/messages"
                className="hidden sm:inline-flex items-center gap-1 text-xs bg-white/15 backdrop-blur ring-1 ring-white/25 px-3 py-1.5 rounded-md hover:bg-white/25"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Message teacher
              </Link>
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {swim ? (
              <>
                <HeroStat
                  icon={<Waves className="h-4 w-4" />}
                  label="Weekly sessions"
                  value={String(swimStats.sessions)}
                />
                <HeroStat
                  icon={<CalendarCheck className="h-4 w-4" />}
                  label="Attendance"
                  value={`${swimStats.rate}%`}
                />
                <HeroStat
                  icon={<Bell className="h-4 w-4" />}
                  label="Needs ack"
                  value={String(needsAck)}
                  tone={needsAck > 0 ? "alert" : "ok"}
                />
                <HeroStat
                  icon={<Award className="h-4 w-4" />}
                  label="Programme"
                  value={swimStats.level}
                />
              </>
            ) : (
              <>
                <HeroStat
                  icon={<CalendarCheck className="h-4 w-4" />}
                  label="Attendance"
                  value={`${student.attendance}%`}
                />
                <HeroStat
                  icon={<Award className="h-4 w-4" />}
                  label="GPA"
                  value={String(student.gpa)}
                />
                <HeroStat
                  icon={<Bell className="h-4 w-4" />}
                  label="Needs ack"
                  value={String(needsAck)}
                  tone={needsAck > 0 ? "alert" : "ok"}
                />
                <HeroStat
                  icon={<Wallet className="h-4 w-4" />}
                  label="Outstanding"
                  value={student.duesUSD ? `$${student.duesUSD}` : "—"}
                />
              </>
            )}
          </div>
        </div>
      </Section>

      {!swim && enrolments.length > 0 && (
        <Section
          title="Enrolled at"
          description={
            enrolments.length > 1
              ? `${enrolments.length} institutes — all managed from this single 1StudentID account.`
              : "Single-institute enrolment."
          }
        >
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {enrolments.map((e) => (
              <li
                key={`${e.institutionId}-${e.role}`}
                className="rounded-lg border bg-card p-3 flex gap-3"
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{e.institution}</span>
                    {e.primary && <Badge tone="info">Main</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {e.role} · {e.classLabel}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Since {e.since}</span>
                    {e.legacyId && (
                      <span
                        className="inline-flex items-center gap-1"
                        title={e.legacySystem ?? "Migrated from previous system"}
                      >
                        <KeyRound className="h-2.5 w-2.5" />
                        Institute ID:
                        <span className="font-mono text-foreground">{e.legacyId}</span>
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Needs-ack banner */}
      {isParent && needsAck > 0 && recentAttn?.requiresAck && !recentAttn?.ackAt && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              {needsAck} {needsAck === 1 ? "entry needs" : "entries need"} your acknowledgement
            </div>
            <div className="text-xs text-muted-foreground">
              Scroll down to the highlighted items and tap "Acknowledge".
            </div>
          </div>
        </div>
      )}

      {isStudent && (
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          {user?.selfManaged
            ? "You manage your own record book — teachers post here and you acknowledge entries yourself. No guardian is linked to this account."
            : "You can read entries about you. Parents and teachers post and reply here."}
        </div>
      )}

      {/* Level progression / qualify for next level (swim only) */}
      {swim && (
        <LevelProgression studentId={student.id} studentName={student.name} canAssess={isStaff} />
      )}

      {/* Timeline */}
      <div data-tour="srb-timeline">
        <SrbTimeline studentId={student.id} institutionId={scopeInst} courseId={scopeCourse} />
      </div>

      <SrbComposer
        open={composer.open}
        onOpenChange={composer.setOpen}
        defaultStudentId={student.id}
        defaultStudentName={student.name}
        courseId={scopeCourse}
        institutionId={swim ? user?.institutionId : undefined}
        institutionName={swim ? user?.institutionName : undefined}
        allowRating={swim && isStaff}
      />

      {/* Floating composer button on mobile */}
      {(isStaff || isParent) && (
        <button
          onClick={() => {
            composer.onOpen();
            toast.info(isParent ? "Writing a note for the teacher" : "Writing a new entry", {
              duration: 1200,
            });
          }}
          className="sm:hidden fixed bottom-20 right-5 z-30 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-elegant flex items-center justify-center"
          aria-label="New entry"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "ok" | "alert";
}) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-85">
        {icon}
        {label}
      </div>
      <div
        className={`text-lg font-bold mt-0.5 ${tone === "alert" ? "text-rose-200" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}
