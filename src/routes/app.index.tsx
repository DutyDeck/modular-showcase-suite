import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatCard, Section, Badge } from "@/components/ui-kit";
import { AreaTrend, BarTrend } from "@/components/Charts";
import {
  Users, BookOpen, DollarSign, TrendingUp, GraduationCap, Wallet,
  CalendarCheck, Award, Sparkles, AlertTriangle,
} from "lucide-react";
import {
  notifications, attendanceTrend, revenueTrend, grades,
  aiInsights, teacherClasses, children,
} from "@/lib/mockData";
import { useCollection } from "@/lib/store";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — One Edu" }] }),
  component: Dashboard,
});

function firstName(fullName: string): string {
  const titles = new Set([
    "dr.",
    "dr",
    "mr.",
    "mr",
    "mrs.",
    "mrs",
    "ms.",
    "ms",
    "prof.",
    "prof",
  ]);
  const parts = fullName.trim().split(/\s+/);
  const meaningful = parts.filter((p) => !titles.has(p.toLowerCase()));
  return meaningful[0] ?? parts[0] ?? "";
}

function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-hero text-white p-6 md:p-8 shadow-elegant relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
             style={{ backgroundImage: "radial-gradient(circle at 80% 10%, white 0%, transparent 35%)" }} />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider opacity-80">{user.institution}</div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">Welcome back, {firstName(user.name)} 👋</h1>
          <p className="text-sm opacity-85 mt-1 max-w-xl">
            Here's what's happening across your {user.role === "admin" ? "platform" : "workspace"} today.
          </p>
        </div>
      </div>

      {user.role === "student" && <StudentDash />}
      {user.role === "parent" && <ParentDash />}
      {user.role === "teacher" && <TeacherDash />}
      {user.role === "admin" && <AdminDash />}
    </div>
  );
}

function StudentDash() {
  const assignments = useCollection("assignments");
  const invoices = useCollection("invoices");
  const pending = assignments.filter(a => a.status === "Pending").length;
  const due = invoices.find(i => i.status === "Due");
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current GPA" value="3.8" hint="Top 12% of cohort" icon={<Award className="h-5 w-5" />} accent="success" />
        <StatCard label="Attendance" value="94%" hint="This semester" icon={<CalendarCheck className="h-5 w-5" />} accent="primary" />
        <StatCard label="Pending Tasks" value={pending} hint="3 due this week" icon={<BookOpen className="h-5 w-5" />} accent="warning" />
        <StatCard label="Outstanding" value={`$${due?.amount ?? 0}`} hint="Due Jun 1" icon={<Wallet className="h-5 w-5" />} accent="info" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Upcoming Assignments" className="lg:col-span-2">
          <ul className="divide-y -my-2">
            {assignments.slice(0, 4).map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.course} · Due {a.due}</div>
                </div>
                <Badge tone={a.status === "Pending" ? "warning" : a.status === "Graded" ? "success" : "info"}>{a.status}</Badge>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Notifications">
          <ul className="space-y-3">
            {notifications.map((n, i) => (
              <li key={i} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm">{n.text}</div>
                  <div className="text-[10px] text-muted-foreground">{n.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <Section title="Grade Trend" description="Final scores per subject">
        <BarTrend
          data={grades.map((g) => ({ subject: g.course.split(" ")[0], score: g.final }))}
          xKey="subject"
          yKey="score"
        />
      </Section>
    </>
  );
}

function ParentDash() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Children Linked" value={children.length} icon={<Users className="h-5 w-5" />} accent="primary" />
        <StatCard label="Avg Attendance" value="95.5%" icon={<CalendarCheck className="h-5 w-5" />} accent="success" />
        <StatCard label="Avg GPA" value="3.75" icon={<Award className="h-5 w-5" />} accent="info" />
        <StatCard label="Total Dues" value="$790" hint="Across all children" icon={<Wallet className="h-5 w-5" />} accent="warning" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {children.map((c) => (
          <Section key={c.id} title={c.name} description={c.grade}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold">{c.attendance}%</div><div className="text-[11px] text-muted-foreground">Attendance</div></div>
              <div><div className="text-2xl font-bold">{c.gpa}</div><div className="text-[11px] text-muted-foreground">GPA</div></div>
              <div><div className="text-2xl font-bold">${c.duesUSD}</div><div className="text-[11px] text-muted-foreground">Dues</div></div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Next class: <span className="text-foreground font-medium">{c.nextClass}</span></div>
          </Section>
        ))}
      </div>
    </>
  );
}

function TeacherDash() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Classes" value={teacherClasses.length} icon={<GraduationCap className="h-5 w-5" />} accent="primary" />
        <StatCard label="Students" value={teacherClasses.reduce((a, c) => a + c.students, 0)} icon={<Users className="h-5 w-5" />} accent="info" />
        <StatCard label="To Grade" value="23" hint="Quizzes & essays" icon={<BookOpen className="h-5 w-5" />} accent="warning" />
        <StatCard label="At-Risk Students" value="4" hint="AI flagged" icon={<AlertTriangle className="h-5 w-5" />} accent="destructive" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Today's Schedule" className="lg:col-span-2">
          <ul className="space-y-3">
            {teacherClasses.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.batch} · {c.students} students · {c.room}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium">{c.nextSession}</div>
                  <button className="mt-1 text-[11px] px-2 py-1 rounded-md bg-primary text-primary-foreground">Start class</button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="AI Suggestions">
          <ul className="space-y-3 text-sm">
            {aiInsights.slice(0, 3).map((a, i) => (
              <li key={i} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium text-xs">{a.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}

function AdminDash() {
  const tenants = useCollection("tenants");
  const leads = useCollection("leads");
  const students = useCollection("students");
  const { formatMoney } = usePrefs();
  const totalStudents = tenants.reduce((a, t) => a + t.students, 0);
  const mrr = tenants.reduce((a, t) => a + t.mrr, 0);
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Active Tenants" value={tenants.length} hint="+2 this month" icon={<Users className="h-5 w-5" />} accent="primary" />
        <StatCard label="Total Students" value={totalStudents.toLocaleString()} icon={<GraduationCap className="h-5 w-5" />} accent="info" />
        <StatCard label="MRR" value={formatMoney(mrr)} hint="+12% vs last month" icon={<DollarSign className="h-5 w-5" />} accent="success" />
        <StatCard label="Open Leads" value={leads.length} hint="Across all tenants" icon={<TrendingUp className="h-5 w-5" />} accent="warning" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Section title="Revenue (last 6 months)" description="MRR in $K">
          <AreaTrend
            data={revenueTrend.map((r) => ({ m: r.m, v: r.v }))}
            xKey="m"
            yKey="v"
            yFormatter={(v) => `$${v}K`}
          />
        </Section>
        <Section title="Attendance Trend" description="Weekly average %">
          <AreaTrend
            data={attendanceTrend.map((r) => ({ w: r.week, rate: r.rate }))}
            xKey="w"
            yKey="rate"
            yFormatter={(v) => `${v}%`}
          />
        </Section>
      </div>
      <Section title="At-Risk Students (AI prediction)" description="Cross-tenant signals">
        <ul className="space-y-2">
          {students.filter(s => s.risk !== "low").map((s) => (
            <li key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div>
                <div className="font-medium text-sm">{s.name} <span className="text-muted-foreground text-xs">· {s.grade}</span></div>
                <div className="text-xs text-muted-foreground">Attendance {s.attendance}% · GPA {s.gpa}</div>
              </div>
              <Badge tone={s.risk === "high" ? "destructive" : "warning"}>{s.risk.toUpperCase()} RISK</Badge>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
