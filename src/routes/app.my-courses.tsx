import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Badge, Button } from "@/components/ui-kit";
import { useCollection, addItem, removeItem, nextId } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { InvoiceBreakdown } from "@/components/InvoiceBreakdown";
import { generateInvoice, monthRange, currentMonthISO } from "@/lib/billing";
import {
  children as parentChildren,
  courses,
  INSTITUTE_BILLING_PROFILE,
  SWIM_BILLING_PROFILE,
  type FeePlan,
  type RevisionSession,
} from "@/lib/mockData";
import { Check, Plus, CalendarClock, ReceiptText, GraduationCap, Waves } from "lucide-react";

export const Route = createFileRoute("/app/my-courses")({
  head: () => ({ meta: [{ title: "Course Selection & Fees — 1StudentID" }] }),
  component: MyCoursesPage,
});

const TODAY = new Date().toISOString().slice(0, 10);

function MyCoursesPage() {
  const { user } = useAuth();
  const { formatMoney } = usePrefs();
  const feePlans = useCollection("feePlans");
  const enrollments = useCollection("billingEnrollments");
  const bookings = useCollection("revisionBookings");
  const revSessions = useCollection("revisionSessions");
  const discounts = useCollection("discounts");
  const credits = useCollection("billingCredits");
  const closures = useCollection("billingClosures");

  const isParent = user?.role === "parent";
  const subjects = isParent
    ? parentChildren.map((c) => ({ id: c.id, name: c.name }))
    : user?.oneEduId
      ? [{ id: user.oneEduId, name: user.name }]
      : [];

  const [activeId, setActiveId] = useState(subjects[0]?.id ?? "");
  const [month, setMonth] = useState(currentMonthISO());
  const activeName = subjects.find((s) => s.id === activeId)?.name ?? "";

  const { start, end } = monthRange(month);
  const invoice = activeId
    ? generateInvoice(activeId, start, end, {
        enrollments,
        revisionBookings: bookings,
        feePlans,
        discounts,
        revisionSessions: revSessions,
        credits,
        closures,
      })
    : null;
  const profile =
    invoice && invoice.netStandard === 0 && invoice.netExempt > 0
      ? SWIM_BILLING_PROFILE
      : INSTITUTE_BILLING_PROFILE;

  const isEnrolled = (courseId: string) =>
    enrollments.some((e) => e.studentId === activeId && e.courseId === courseId);
  const isBooked = (sessionId: string) =>
    bookings.some(
      (b) => b.studentId === activeId && b.sessionId === sessionId && b.status !== "cancelled",
    );

  const toggleCourse = (plan: FeePlan) => {
    if (!activeId) return;
    if (isEnrolled(plan.courseId)) {
      removeItem(
        "billingEnrollments",
        (e) => e.studentId === activeId && e.courseId === plan.courseId,
      );
      toast(`Removed ${plan.courseName}`);
    } else {
      addItem("billingEnrollments", {
        id: nextId("BE-", "billingEnrollments"),
        studentId: activeId,
        courseId: plan.courseId,
        since: TODAY,
      });
      toast.success(`Added ${plan.courseName}`);
    }
  };

  const toggleBooking = (s: RevisionSession) => {
    if (!activeId) return;
    if (isBooked(s.id)) {
      removeItem("revisionBookings", (b) => b.studentId === activeId && b.sessionId === s.id);
      toast(`Cancelled ${s.title}`);
    } else {
      addItem("revisionBookings", {
        id: nextId("RB-", "revisionBookings"),
        studentId: activeId,
        sessionId: s.id,
        status: "booked",
        bookedAt: TODAY,
      });
      toast.success(`Booked ${s.title}`);
    }
  };

  const priceLabel = (plan: FeePlan) =>
    plan.billingModel === "per-session"
      ? `${formatMoney(plan.sessionRate ?? 0)} / session`
      : plan.billingModel === "monthly"
        ? `${formatMoney(plan.monthlyRate ?? 0)} / month`
        : `${formatMoney(plan.termRate ?? 0)} / ${plan.termWeeks}-wk term`;
  const modelLabel = (plan: FeePlan) =>
    plan.billingModel === "per-session"
      ? "Per session"
      : plan.billingModel === "monthly"
        ? "Monthly"
        : "Term block";

  const academic = feePlans.filter((p) => !p.courseId.startsWith("C-SWIM"));
  const swim = feePlans.filter((p) => p.courseId.startsWith("C-SWIM"));
  const upcoming = [...revSessions]
    .filter((s) => s.date >= TODAY)
    .sort((a, b) => a.date.localeCompare(b.date));

  const CourseCard = ({ plan }: { plan: FeePlan }) => {
    const meta = courses.find((c) => c.id === plan.courseId);
    const on = isEnrolled(plan.courseId);
    return (
      <div
        className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
          on ? "border-primary/40 bg-primary/5" : "bg-card"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm">{plan.courseName}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {meta?.teacher ?? plan.teacher ?? "—"} · {meta?.schedule ?? plan.weekdays.join(" · ")}
            </div>
          </div>
          {on && (
            <span className="shrink-0 text-success">
              <Check className="h-4 w-4" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <Badge tone="default">{modelLabel(plan)}</Badge>
          <Badge tone="muted">{plan.vatTreatment === "standard" ? "VAT 20%" : "VAT exempt"}</Badge>
        </div>
        <div className="flex items-end justify-between gap-2 mt-auto">
          <div className="text-sm font-semibold">{priceLabel(plan)}</div>
          <Button size="sm" variant={on ? "outline" : "primary"} onClick={() => toggleCourse(plan)}>
            {on ? (
              "Remove"
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Selection & Fees"
        subtitle={
          isParent
            ? "Choose classes for each child — the monthly invoice updates instantly."
            : "Choose your classes and book revision sessions — see your fees update live."
        }
      />

      {subjects.length === 0 ? (
        <Section title="No student linked">
          <p className="text-sm text-muted-foreground">
            This account has no student profile to enrol. Sign in as a student or parent to select
            courses.
          </p>
        </Section>
      ) : (
        <>
          {isParent && subjects.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Child:</span>
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    activeId === s.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Catalog */}
            <div className="lg:col-span-2 space-y-6">
              <Section
                title="Academic courses"
                description="Add or drop subjects — fees are billed per the model shown on each card."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {academic.map((p) => (
                    <CourseCard key={p.courseId} plan={p} />
                  ))}
                </div>
              </Section>

              {swim.length > 0 && (
                <Section
                  title={
                    <span className="inline-flex items-center gap-2">
                      <Waves className="h-4 w-4" /> Swim club
                    </span>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {swim.map((p) => (
                      <CourseCard key={p.courseId} plan={p} />
                    ))}
                  </div>
                </Section>
              )}

              <Section
                title={
                  <span className="inline-flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" /> Revision & booster sessions
                  </span>
                }
                description="Pick the dates you'll attend — each booked session is added to that month's invoice."
              >
                <div className="space-y-2">
                  {upcoming.length === 0 && (
                    <p className="text-sm text-muted-foreground">No upcoming revision sessions.</p>
                  )}
                  {upcoming.map((s) => {
                    const on = isBooked(s.id);
                    const meta = courses.find((c) => c.id === s.courseId);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                          on ? "border-info/40 bg-info/5" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{s.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {meta?.title ?? s.courseId} ·{" "}
                            {new Date(s.date + "T00:00:00").toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            · {s.start}–{s.end}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold">{formatMoney(s.rate)}</span>
                          <Button
                            size="sm"
                            variant={on ? "outline" : "primary"}
                            onClick={() => toggleBooking(s)}
                          >
                            {on ? "Cancel" : "Book"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>

            {/* Live invoice preview */}
            <div className="lg:sticky lg:top-4 space-y-3">
              <Section
                title={
                  <span className="inline-flex items-center gap-2">
                    <ReceiptText className="h-4 w-4" /> Estimated invoice
                  </span>
                }
                description={`${activeName} · ${invoice?.periodLabel ?? ""}`}
                actions={
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="h-9 rounded-md border bg-background px-2 text-xs"
                    aria-label="Preview month"
                  />
                }
              >
                {invoice && invoice.lines.length > 0 ? (
                  <InvoiceBreakdown invoice={invoice} profile={profile} />
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No courses selected yet. Add a course to see the fees.
                  </div>
                )}
              </Section>
              <p className="text-[11px] text-muted-foreground px-1">
                Sessions are counted from the live timetable for the month shown, so a 5-week month
                bills more than a 4-week one. Discounts and VAT apply automatically. This is an
                estimate — the institute issues the final invoice at month end.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
