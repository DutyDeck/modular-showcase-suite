import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, Section, Badge, Button } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import {
  children,
  getEnrollments,
  sessionsForSwimmer,
  poolById,
  type StudentEnrollment,
} from "@/lib/mockData";
import { useCollection } from "@/lib/store";
import {
  NotebookPen,
  Bell,
  Building2,
  KeyRound,
  Sparkles,
  Clock,
  Wallet,
  User2,
  MessageSquare,
  Waves,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/app/children")({
  head: () => ({ meta: [{ title: "My Children — One Edu" }] }),
  component: ChildrenPage,
});

function ChildrenPage() {
  const srb = useCollection("srb");
  const students = useCollection("students");
  const invoices = useCollection("invoices");

  const childRows = useMemo(
    () =>
      children.map((c) => {
        const student = students.find((x) => x.id === c.id);
        const enrolments = student ? getEnrollments(student) : [];
        return { child: c, enrolments };
      }),
    [students],
  );

  const totalEnrolments = childRows.reduce((n, r) => n + r.enrolments.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Children"
        subtitle="Every institute, every child — one login, one place."
      />

      <div className="rounded-2xl bg-gradient-hero text-white p-5 sm:p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 85% 20%, white, transparent 40%)" }}
        />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="h-10 w-10 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider opacity-80">One login replaces…</div>
            <div className="text-lg sm:text-xl font-bold mt-0.5 leading-tight">
              {totalEnrolments} institute apps · {children.length} children
            </div>
            <p className="text-xs sm:text-sm opacity-85 mt-1.5 max-w-xl">
              Each institute below keeps its own timetable, fees, record-book entries and teacher
              contacts — but you never log in twice.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {childRows.map(({ child: c, enrolments }) => (
          <ChildBlock key={c.id} child={c} enrolments={enrolments} srb={srb} invoices={invoices} />
        ))}
      </div>
    </div>
  );
}

type ChildSummary = (typeof children)[number];

function ChildBlock({
  child,
  enrolments,
  srb,
  invoices,
}: {
  child: ChildSummary;
  enrolments: StudentEnrollment[];
  srb: ReturnType<typeof useCollection<"srb">>;
  invoices: ReturnType<typeof useCollection<"invoices">>;
}) {
  const childSrb = srb.filter((e) => e.studentId === child.id);
  const childInvoices = invoices.filter((i) => i.studentId === child.id);
  const swimSessions = sessionsForSwimmer(child.id);
  const needsAck = childSrb.filter((e) => e.requiresAck && !e.ackAt).length;
  const totalDue = childInvoices
    .filter((i) => i.status === "Due" || i.status === "Upcoming")
    .reduce((a, i) => a + i.amount, 0);

  return (
    <Section className="!p-0 overflow-hidden">
      {/* Child header */}
      <div className="p-4 sm:p-5 border-b bg-muted/30">
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar name={child.name} seed={child.id} size={56} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-base sm:text-lg truncate">{child.name}</h3>
              <Badge tone="info">
                {enrolments.length} institute{enrolments.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {child.grade} · One Edu ID {child.id}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
              <MiniStat label="Attendance" value={`${child.attendance}%`} />
              <MiniStat label="GPA" value={String(child.gpa)} />
              <MiniStat
                label="Outstanding"
                value={`$${totalDue}`}
                tone={totalDue > 0 ? "warn" : undefined}
              />
              <MiniStat
                label="Needs ack"
                value={String(needsAck)}
                tone={needsAck > 0 ? "alert" : undefined}
                className="hidden sm:block"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Per-institute sub-cards */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {enrolments.map((e) => (
            <InstituteCard
              key={`${child.id}-${e.institutionId}-${e.role}`}
              child={child}
              enrolment={e}
              srb={childSrb}
              invoices={childInvoices}
            />
          ))}
        </div>

        {swimSessions.length > 0 && (
          <div className="rounded-xl border bg-sky-500/5 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b bg-sky-500/10">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-semibold">Swim Academy</span>
                <Badge tone="info">
                  {swimSessions.length} session{swimSessions.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <Link
                to="/app/courses/$courseId"
                params={{ courseId: swimSessions[0].courseId }}
                className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                Open club
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="divide-y">
              {swimSessions.map((s) => {
                const pool = poolById[s.poolId];
                return (
                  <li key={s.id}>
                    <Link
                      to="/app/sessions/$sessionId"
                      params={{ sessionId: s.id }}
                      className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="text-center shrink-0 w-12">
                        <div className="text-[11px] font-semibold">{s.day}</div>
                        <div className="text-[10px] text-muted-foreground">{s.start}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{s.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {pool?.name} · lanes {s.laneFrom}–{s.laneTo} · {s.coachNames.join(", ")}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

function InstituteCard({
  child,
  enrolment,
  srb,
  invoices,
}: {
  child: ChildSummary;
  enrolment: StudentEnrollment;
  srb: ReturnType<typeof useCollection<"srb">>;
  invoices: ReturnType<typeof useCollection<"invoices">>;
}) {
  const here = (i: { institutionId?: string }) => i.institutionId === enrolment.institutionId;
  const instSrb = srb.filter(here);
  const instInvoices = invoices.filter(here);
  const due = instInvoices
    .filter((i) => i.status === "Due" || i.status === "Upcoming")
    .reduce((a, i) => a + i.amount, 0);
  const paid = instInvoices.filter((i) => i.status === "Paid").length;
  const needsAck = instSrb.filter((e) => e.requiresAck && !e.ackAt).length;
  const latest = [...instSrb].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];

  return (
    <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
      {/* Institute strip — colour-coded accent helps the parent spot them at a glance. */}
      <div
        className={`h-1.5 ${
          enrolment.primary
            ? "bg-gradient-to-r from-primary to-fuchsia-500"
            : "bg-gradient-to-r from-sky-400 to-emerald-400"
        }`}
      />
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold truncate">{enrolment.institution}</span>
              {enrolment.primary && <Badge tone="info">Main</Badge>}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {enrolment.role} · {enrolment.classLabel}
            </div>
          </div>
        </div>

        {/* Per-institute facts: next session, dues, contact teacher. */}
        <ul className="space-y-1.5 text-xs">
          <li className="flex items-start gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <span>
              <span className="text-muted-foreground">Next session:</span>{" "}
              <span className="font-medium">{enrolment.nextSession ?? "TBA"}</span>
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <Wallet className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <span>
              <span className="text-muted-foreground">Dues here:</span>{" "}
              <span className={`font-medium ${due > 0 ? "text-warning-foreground" : ""}`}>
                ${due}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {paid} paid invoice{paid === 1 ? "" : "s"}
              </span>
            </span>
          </li>
          {enrolment.contactTeacher && (
            <li className="flex items-start gap-1.5">
              <User2 className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <span>
                <span className="text-muted-foreground">Contact:</span>{" "}
                <span className="font-medium">{enrolment.contactTeacher}</span>
              </span>
            </li>
          )}
          {enrolment.legacyId && (
            <li
              className="flex items-start gap-1.5 text-muted-foreground"
              title={enrolment.legacySystem ?? "Migrated from previous system"}
            >
              <KeyRound className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                Institute ID:{" "}
                <span className="font-mono text-foreground">{enrolment.legacyId}</span>
              </span>
            </li>
          )}
        </ul>

        {/* Latest record-book entry from this institute (if any). */}
        <div className="rounded-md border bg-muted/30 px-2.5 py-2 text-xs min-h-[52px]">
          {latest ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Latest note · {timeAgo(latest.date)}
                </div>
                {needsAck > 0 && (
                  <Badge tone="destructive">
                    <Bell className="h-2.5 w-2.5 mr-1 inline" />
                    {needsAck} need{needsAck === 1 ? "s" : ""} ack
                  </Badge>
                )}
              </div>
              <div className="font-medium line-clamp-2 mt-0.5">{latest.title}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                from {latest.authorName}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground italic">
              No record-book entries yet from this institute.
            </div>
          )}
        </div>

        {/* Actions scoped to this institute. */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-[11px] text-muted-foreground">
            {instSrb.length} record entr{instSrb.length === 1 ? "y" : "ies"} · {instInvoices.length}{" "}
            invoice{instInvoices.length === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-1.5">
            <Link to="/app/messages" className="inline-flex">
              <Button variant="outline" size="sm" title="Message this institute">
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link
              to="/app/srb/$studentId"
              params={{ studentId: child.id }}
              hash={`inst-${enrolment.institutionId}`}
            >
              <Button size="sm">
                <NotebookPen className="h-3.5 w-3.5" />
                Open
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone?: "warn" | "alert";
  className?: string;
}) {
  const valueClass =
    tone === "alert" ? "text-destructive" : tone === "warn" ? "text-warning-foreground" : "";
  return (
    <div className={className}>
      <div className={`text-base sm:text-lg font-bold ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
