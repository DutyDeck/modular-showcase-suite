import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { aiInsights } from "@/lib/mockData";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import { buildInsights, usePackInsightsData, type Insight } from "@/lib/packs/sis/insights";
import { Sparkles, Bot, BrainCircuit, TrendingUp, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai-insights")({
  head: () => ({ meta: [{ title: "AI Insights — 1StudentID" }] }),
  component: AiRoute,
});

function AiRoute() {
  const { user } = useAuth();
  const profiles = useCollection("tenantProfiles");
  return isPackTenantUser(user, profiles) ? <PackAiPage /> : <AiPage />;
}

/* ── Pack tenants: rule-based insights from the institution's live data ── */

const SCOPE_TEXT = {
  self: "About you",
  family: "About your children",
  teacher: "Your classes and modules",
  institution: "Whole institution",
};

function PackAiPage() {
  const { ctx, data, scope } = usePackInsightsData();
  const insights = useMemo(() => buildInsights(data, scope), [data, scope]);
  const [cat, setCat] = useState<string>("All");
  const cats = ["All", ...new Set(insights.map((i) => i.category))];
  const shown = cat === "All" ? insights : insights.filter((i) => i.category === cat);
  const urgent = insights.filter((i) => i.severity !== "info").length;
  const scopeText =
    scope.kind === "family" && ctx.familyOperated
      ? `About ${scope.learners.map((l) => l.name.split(" ")[0]).join(" & ")}`
      : SCOPE_TEXT[scope.kind];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        subtitle={`${ctx.tenantName} · ${scopeText}. Built from live records.`}
      />
      <div className="rounded-2xl bg-gradient-hero text-white p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 90% 30%, white, transparent 40%)",
          }}
        />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">
              {urgent
                ? `${urgent} thing(s) need attention`
                : insights.length
                  ? "All on track"
                  : "Nothing to flag yet"}
            </h3>
            <p className="text-sm opacity-90 mt-1">
              Checked attendance, fees, coursework, grades and compliance for{" "}
              {scope.kind === "institution"
                ? `${scope.learners.length} learners`
                : scope.kind === "teacher"
                  ? `${scope.groups.length} group(s) · ${scope.learners.length} learners`
                  : scope.learners.map((l) => l.name).join(", ") || "your record"}
              .
            </p>
          </div>
        </div>
      </div>

      {cats.length > 2 && (
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`h-8 px-3 rounded-full border text-xs font-medium ${
                cat === c ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
              }`}
            >
              {c}
              {c !== "All" && ` · ${insights.filter((i) => i.category === c).length}`}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <Section>
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No insights right now. They appear as registers, marks and fees come in.
          </div>
        </Section>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {shown.map((a) => (
            <InsightCard key={a.id} a={a} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Demo insights are simple rules on live data (attendance lines, due dates, pass marks,
        targets, expiry dates) — not a trained model. Always check the record before acting.
      </p>
    </div>
  );
}

function InsightCard({ a }: { a: Insight }) {
  return (
    <Section>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm">{a.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
          </div>
        </div>
        <Badge
          tone={
            a.severity === "high" ? "destructive" : a.severity === "medium" ? "warning" : "info"
          }
        >
          {a.severity === "high" ? "Act now" : a.severity === "medium" ? "Watch" : "FYI"}
        </Badge>
      </div>
      <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Demo insight · {a.category}
        </span>
        <Link
          to={a.to}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium inline-flex items-center gap-1"
        >
          {a.action}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Section>
  );
}

/* ── Classic demo (unchanged) ─────────────────────────────────────────── */

function AiPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI & Analytics"
        subtitle="Pass/fail prediction, dropout risk, recommendations and assistants."
      />
      <div className="rounded-2xl bg-gradient-hero text-white p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 90% 30%, white, transparent 40%)",
          }}
        />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Edu-AI Copilot</h3>
            <p className="text-sm opacity-90 mt-1">
              "Hi! I've analyzed your cohort. 12 students need intervention this week — want me to
              draft personalized messages and propose intervention plans?"
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                onClick={() => toast.success("Drafting 12 personalized messages…")}
                className="bg-white text-primary px-4 py-2 rounded-md text-xs font-semibold"
              >
                Draft messages
              </button>
              <button
                onClick={() => toast.info("Intervention plan generated")}
                className="bg-white/15 text-white px-4 py-2 rounded-md text-xs font-medium"
              >
                Show plan
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {aiInsights.map((a, i) => (
          <Section key={i}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{a.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
                </div>
              </div>
              <Badge tone={a.severity === "high" ? "destructive" : "info"}>
                {Math.round(a.confidence * 100)}%
              </Badge>
            </div>
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Model: edu-predict-v3
              </span>
              <button
                onClick={() => toast.success(`${a.action}`)}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
              >
                {a.action}
              </button>
            </div>
          </Section>
        ))}
      </div>
      <Section title="AI Modules">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {["Pass/Fail Predictor", "Dropout Risk", "Course Recommender", "Smart Tutor Bot"].map(
            (m) => (
              <div key={m} className="p-4 rounded-lg border text-center">
                <Bot className="h-5 w-5 mx-auto text-primary mb-2" />
                <div className="text-sm font-medium">{m}</div>
                <div className="text-[10px] text-success mt-1">● Active</div>
              </div>
            ),
          )}
        </div>
      </Section>
    </div>
  );
}
