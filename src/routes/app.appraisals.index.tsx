import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Section, Badge, StatCard } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/StarRating";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import { teachers as allTeachers, teacherByName, isSwimAdmin, isSwimCoach } from "@/lib/mockData";
import { computeAppraisal, appraisalLabel } from "@/lib/appraisal";
import { Search, ChevronRight, Star, Building2, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/app/appraisals/")({
  head: () => ({ meta: [{ title: "Teacher Appraisals — 1StudentID" }] }),
  component: AppraisalsIndex,
});

function AppraisalsIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ratings = useCollection("teacherRatings");
  const [query, setQuery] = useState("");

  const swimAdmin = isSwimAdmin(user);

  // Institute admins only appraise their own institute's staff (tenant
  // isolation, mirroring the SRB index). The swim-club admin narrows further to
  // the swim coaches only. Everyone else sees every teacher.
  const isInstituteScoped = user?.adminScope === "institute";
  const scoped = useMemo(() => {
    if (swimAdmin) return allTeachers.filter((t) => isSwimCoach(t.name));
    if (!isInstituteScoped) return allTeachers;
    return allTeachers.filter((t) => t.institutionId === user?.institutionId);
  }, [swimAdmin, isInstituteScoped, user?.institutionId]);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return scoped
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.institutionName.toLowerCase().includes(q),
      )
      .map((t) => ({ t, a: computeAppraisal(t, ratings) }))
      .sort((x, y) => y.a.blended - x.a.blended);
  }, [scoped, query, ratings]);

  const totalReviews = ratings.length;
  const avgScore = rows.length > 0 ? rows.reduce((s, r) => s + r.a.blended, 0) / rows.length : 0;

  const isRater = user?.role === "parent" || (user?.role === "student" && !!user?.selfManaged);

  // Appraising teachers is an adult responsibility — a minor student can't; their
  // parent appraises on their behalf.
  if (user?.role === "student" && !user.selfManaged) {
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

  // A teacher's "My Appraisal" opens their OWN appraisal, not the roster of all
  // teachers. (Fix for a coach seeing other teachers.) Placed after all hooks.
  if (user?.role === "teacher") {
    const me = teacherByName[user.name];
    if (me) {
      navigate({ to: "/app/appraisals/$teacherId", params: { teacherId: me.id }, replace: true });
      return null;
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={swimAdmin ? "Coach Appraisals" : "Teacher Appraisals"}
        subtitle={
          swimAdmin
            ? "How families rate the club's coaches, blended with squad performance."
            : "Blended score from family star-ratings and student performance — to guide teacher and course selection."
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={swimAdmin ? "Coaches rated" : "Teachers rated"}
          value={rows.length}
          icon={<Star className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Reviews collected"
          value={totalReviews}
          icon={<MessageSquare className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Avg appraisal"
          value={avgScore.toFixed(1)}
          hint="out of 5.0"
          accent="success"
        />
        <StatCard
          label="Top rated"
          value={rows[0]?.a.blended.toFixed(1) ?? "—"}
          hint={rows[0]?.t.name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s/, "") ?? ""}
          accent="warning"
        />
      </div>

      {isRater && (
        <div className="rounded-xl border bg-primary/5 px-4 py-3 text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          <Star className="h-4 w-4 text-primary shrink-0" />
          Open a teacher to leave a star rating and comment — your feedback helps other families
          choose teachers and courses.
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, subject or institute…"
          className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {rows.map(({ t, a }) => (
          <Link
            key={t.id}
            to="/app/appraisals/$teacherId"
            params={{ teacherId: t.id }}
            className="rounded-xl border bg-card p-4 hover:border-primary hover:shadow-soft transition-all flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <Avatar name={t.name} src={t.photo} size={44} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground truncate">{t.subject}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold leading-none">{a.blended.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground">/ 5.0</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Stars value={a.blended} size={15} />
              <Badge tone={a.blended >= 4 ? "success" : a.blended >= 3 ? "info" : "warning"}>
                {appraisalLabel(a.blended)}
              </Badge>
            </div>

            <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{t.institutionName}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-primary font-medium shrink-0">
                {a.ratingCount} review{a.ratingCount === 1 ? "" : "s"}
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {rows.length === 0 && (
        <Section>
          <div className="text-center py-8">
            <Star className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">No teachers match "{query}"</div>
          </div>
        </Section>
      )}
    </div>
  );
}
