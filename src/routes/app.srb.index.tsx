import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Section, Button, Badge } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import { children as parentChildren, getEnrollments } from "@/lib/mockData";
import { Search, Bell, ChevronRight, NotebookPen, Building2 } from "lucide-react";

export const Route = createFileRoute("/app/srb/")({
  head: () => ({ meta: [{ title: "Record Books — One Edu" }] }),
  component: SrbIndexPage,
});

function SrbIndexPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const students = useCollection("students");
  const srb = useCollection("srb");
  const [query, setQuery] = useState("");

  // Parents land directly on their first child's timeline
  if (user?.role === "parent") {
    if (parentChildren.length === 1) {
      navigate({
        to: "/app/srb/$studentId",
        params: { studentId: parentChildren[0].id },
        replace: true,
      });
      return null;
    }
    return <ParentChildPicker />;
  }

  // Students land on their own timeline (in demo, user id is fake — use first student)
  if (user?.role === "student") {
    const me = students[0]?.id;
    if (me) {
      navigate({ to: "/app/srb/$studentId", params: { studentId: me }, replace: true });
      return null;
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return students.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q),
    );
  }, [students, query]);

  return (
    <div>
      <PageHeader
        title="Student Record Books"
        subtitle="Per-student timeline of homework, behaviour, achievements and parent communication."
      />

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, ID or grade…"
          className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((s) => {
          const studentEntries = srb.filter((e) => e.studentId === s.id);
          const last = studentEntries.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )[0];
          const needsAck = studentEntries.filter((e) => e.requiresAck && !e.ackAt).length;
          return (
            <Link
              key={s.id}
              to="/app/srb/$studentId"
              params={{ studentId: s.id }}
              className="rounded-xl border bg-card p-4 hover:border-primary hover:shadow-soft transition-all flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <Avatar name={s.name} seed={s.id} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.grade} · {s.batch}
                  </div>
                </div>
                {needsAck > 0 && (
                  <Badge tone="destructive">
                    <Bell className="h-3 w-3 mr-1 inline" />
                    {needsAck}
                  </Badge>
                )}
              </div>

              <div className="border-t pt-3 min-h-[60px]">
                {last ? (
                  <>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Last entry · {timeAgo(last.date)}
                    </div>
                    <div className="text-xs font-medium mt-0.5 line-clamp-2">
                      {last.title}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground italic">No entries yet</div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {studentEntries.length} {studentEntries.length === 1 ? "entry" : "entries"}
                </span>
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  Open
                  <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center mt-4">
          <NotebookPen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="text-sm font-medium">No students match "{query}"</div>
        </div>
      )}
    </div>
  );
}

function ParentChildPicker() {
  const students = useCollection("students");
  return (
    <div>
      <PageHeader
        title="My Children · Record Books"
        subtitle="Tap a child to open their record book — across every institute they attend."
      />
      <div className="grid sm:grid-cols-2 gap-4">
        {parentChildren.map((c) => {
          const studentRow = students.find((x) => x.id === c.id);
          const enrolments = studentRow ? getEnrollments(studentRow) : [];
          return (
            <Link
              key={c.id}
              to="/app/srb/$studentId"
              params={{ studentId: c.id }}
              className="rounded-xl border bg-card p-5 hover:border-primary hover:shadow-soft transition-all flex items-start gap-4"
            >
              <Avatar name={c.name} seed={c.id} size={56} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.grade}</div>
                <div className="text-xs text-muted-foreground mt-1">Next: {c.nextClass}</div>
                {enrolments.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-primary font-medium">
                    <Building2 className="h-3 w-3" />
                    {enrolments.length} institute{enrolments.length === 1 ? "" : "s"} linked
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm">
                Open
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          );
        })}
      </div>
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
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
