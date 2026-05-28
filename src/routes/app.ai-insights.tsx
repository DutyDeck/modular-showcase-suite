import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { aiInsights } from "@/lib/mockData";
import { Sparkles, Bot, BrainCircuit, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai-insights")({
  head: () => ({ meta: [{ title: "AI Insights — One Edu" }] }),
  component: AiPage,
});

function AiPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI & Analytics" subtitle="Pass/fail prediction, dropout risk, recommendations and assistants." />
      <div className="rounded-2xl bg-gradient-hero text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 90% 30%, white, transparent 40%)" }} />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center"><BrainCircuit className="h-6 w-6" /></div>
          <div>
            <h3 className="text-xl font-bold">Edu-AI Copilot</h3>
            <p className="text-sm opacity-90 mt-1">"Hi! I've analyzed your cohort. 12 students need intervention this week — want me to draft personalized messages and propose intervention plans?"</p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button onClick={() => toast.success("Drafting 12 personalized messages…")} className="bg-white text-primary px-4 py-2 rounded-md text-xs font-semibold">Draft messages</button>
              <button onClick={() => toast.info("Intervention plan generated")} className="bg-white/15 text-white px-4 py-2 rounded-md text-xs font-medium">Show plan</button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {aiInsights.map((a, i) => (
          <Section key={i}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Sparkles className="h-4 w-4" /></div>
                <div>
                  <h4 className="font-semibold text-sm">{a.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
                </div>
              </div>
              <Badge tone={a.severity === "high" ? "destructive" : "info"}>{Math.round(a.confidence * 100)}%</Badge>
            </div>
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Model: edu-predict-v3</span>
              <button onClick={() => toast.success(`${a.action}`)} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium">{a.action}</button>
            </div>
          </Section>
        ))}
      </div>
      <Section title="AI Modules">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {["Pass/Fail Predictor", "Dropout Risk", "Course Recommender", "Smart Tutor Bot"].map(m => (
            <div key={m} className="p-4 rounded-lg border text-center">
              <Bot className="h-5 w-5 mx-auto text-primary mb-2" />
              <div className="text-sm font-medium">{m}</div>
              <div className="text-[10px] text-success mt-1">● Active</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
