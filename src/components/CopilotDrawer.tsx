import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Sparkles, Send, BrainCircuit, Bot } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import { isSwimUser, isSwimAdmin } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface ChatMsg {
  id: number;
  from: "user" | "ai";
  text: string;
}

const SEED_BY_ROLE: Record<string, string[]> = {
  student: [
    "Summarise my pending assignments",
    "Suggest a study plan for tomorrow",
    "What did I miss in last week's physics class?",
  ],
  parent: [
    "How are my children performing this week?",
    "Which fees are due in the next 30 days?",
    "Are any of my kids at risk academically?",
  ],
  teacher: [
    "Who in my Physics-12 cohort is at risk?",
    "Draft a parent email about poor attendance",
    "Generate quiz questions on Quantum Mechanics",
  ],
  admin: [
    "Forecast next quarter's MRR",
    "Which tenants are most at risk of churn?",
    "Summarise this week's compliance alerts",
  ],
};

// Swim‑club accounts (coach / club admin / swim parent / swimmer) get a
// single‑purpose aquatics assistant instead of the generic LMS prompts.
const SWIM_SEEDS_BY_ROLE: Record<string, string[]> = {
  student: [
    "What did I work on in my last session?",
    "When is my next squad session?",
    "How's my attendance this term?",
  ],
  parent: [
    "How is my swimmer progressing this month?",
    "When is the next club fee due?",
    "Any notes from the coach this week?",
  ],
  teacher: [
    "Which swimmers in my squads are behind on attendance?",
    "Draft a note to a parent about a missed session",
    "Summarise this week's squad progress",
  ],
  admin: [
    "How is club attendance trending this month?",
    "Which coaches were absent or covered this week?",
    "Any open safety incidents to review?",
  ],
};

function generateReply(
  prompt: string,
  ctx: { students: number; courses: number; invoices: number },
): string {
  const p = prompt.toLowerCase();
  if (/risk|at\s*risk|dropout/.test(p)) {
    return `Based on attendance < 70% and GPA < 2.7, I've flagged a handful of students across your ${ctx.students} learners. I'd recommend scheduling counsellor sessions this week. Open the AI Insights page for the full list.`;
  }
  if (/invoice|fee|payment|mrr|revenue/.test(p)) {
    return `You have ${ctx.invoices} invoices in the system. Next month's projected revenue is up ~12% MoM driven by the new Cambridge Physics cohort. Want me to draft reminder emails for the unpaid ones?`;
  }
  if (/attendance/.test(p)) {
    return `Weekly attendance is sitting at 91% average across the institution. Two batches are trending downward (Commerce-B at 72%). I can draft an intervention plan if you'd like.`;
  }
  if (/email|message|draft/.test(p)) {
    return `Here's a draft:\n\n"Dear parent, we noticed [Student]'s attendance has dropped to 72% this term. We'd love to schedule a quick chat to discuss study habits and any support we can offer. Reply or call us at +44 20 7946 0018."`;
  }
  if (/quiz|question|test/.test(p)) {
    return `Sure — 3 sample MCQs on Quantum Mechanics:\n1. Which equation describes the time-evolution of a quantum state? (a) Maxwell (b) Schrödinger ✓ (c) Newton (d) Bernoulli\n2. The Heisenberg uncertainty principle relates position and …? momentum ✓\n3. The square of the wavefunction represents …? probability density ✓`;
  }
  if (/summar|recap/.test(p)) {
    return `You're managing ${ctx.students} students, ${ctx.courses} courses and ${ctx.invoices} invoices. Top items today: 3 unpaid invoices, 1 live class starting in 15 min, and 4 students flagged at risk.`;
  }
  return `I'm Edu-AI Copilot. I can help you with student risk analysis, grading drafts, parent communications, financial forecasts, and policy summaries. Try one of the suggestions above.`;
}

function generateSwimReply(prompt: string, ctx: { swimmers: number }, admin: boolean): string {
  const p = prompt.toLowerCase();
  if (/incident|safety|health|injur/.test(p)) {
    return admin
      ? `There are 2 open incidents on the club log — one Low (goggles/equipment) and one Medium (a poolside slip, under review). Everything else this month is resolved. Open Summary Reports for the full incident breakdown by severity.`
      : `No open safety incidents involving your swimmers this week. If you need to log one, use "Log incident" on the session page and I'll route it to the club admin.`;
  }
  if (/absent|cover|substitut|coach.*(absent|off|away)/.test(p)) {
    return `This week Coach Ava covered one of Coach Thomas's Tuesday squads; all other sessions ran with their assigned coach. Coach attendance is 96% for the month. The Summary Report's coach‑attendance section lists every absence and substitution.`;
  }
  if (/fee|invoice|payment|due|mandate/.test(p)) {
    return `The next club fees are due at month‑end. A few families have a payment coming up in the next 30 days; off‑boarded swimmers have their mandates stopped automatically, so they're excluded. Open Finance to send reminders.`;
  }
  if (/attendance/.test(p)) {
    return admin
      ? `Club attendance is trending at ~89% this month across all squads, up 3 points on last month. Learn‑to‑Swim is strongest; the senior competitive squad dipped slightly around the meet. Summary Reports → Monthly evaluation has the per‑swimmer detail.`
      : `Your squads are averaging ~90% attendance this week. Two swimmers are below 75% and worth a quick check‑in — they're flagged in your Summary Report.`;
  }
  if (/note|message|email|draft|parent/.test(p)) {
    return `Here's a draft:\n\n"Hi — we missed [swimmer] at Tuesday's squad session. No problem at all; just let us know if everything's okay and whether they'll make Thursday's session. They've been making lovely progress on their backstroke turns and we'd hate for them to lose momentum. — Coach"`;
  }
  if (/progress|improv|technique|stroke|time|pb|personal best/.test(p)) {
    return `Progress is looking good — recent record‑book notes highlight improving stroke technique and a couple of new personal‑best times logged in the squad board. Average coach rating this month is 4.3/5. Open the Record Book for the full history.`;
  }
  if (/session|next|timetable|schedule/.test(p)) {
    return `The next sessions are on the club timetable — Learn‑to‑Swim and squad sessions run through the week at the Royal Vista pools. Open the Swim Programme page for the full weekly timetable and pool map.`;
  }
  if (/summar|recap|progress this|week|month/.test(p)) {
    return admin
      ? `This month across the club: ~89% swimmer attendance, 96% coach attendance, ${ctx.swimmers} swimmers on the books, average session rating 4.3/5, and 2 open incidents. Full detail is in Summary Reports → Monthly evaluation.`
      : `This week your squads trained on schedule with ~90% attendance, a handful of new personal bests logged, and no open incidents. Two swimmers need an attendance nudge — see your Summary Report.`;
  }
  return `I'm your club's aquatics assistant. I can help with swimmer attendance and progress, coach cover, session notes to parents, club fees, and safety incidents. Try one of the suggestions above.`;
}

export function CopilotDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const students = useCollection("students");
  const courses = useCollection("courses");
  const invoices = useCollection("invoices");
  const swim = isSwimUser(user);
  const swimAdmin = isSwimAdmin(user);

  const firstName = (() => {
    if (!user) return "there";
    const titles = new Set(["dr.", "dr", "mr.", "mr", "mrs.", "mrs", "ms.", "ms", "prof.", "prof"]);
    const parts = user.name.trim().split(/\s+/);
    return parts.filter((p) => !titles.has(p.toLowerCase()))[0] ?? parts[0] ?? "there";
  })();

  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: 0,
      from: "ai",
      text: swim
        ? `Hi ${firstName} 👋 I'm your Royal Vista aquatics assistant. I've reviewed the club's data — pick a suggestion below or ask me anything.`
        : `Hi ${firstName} 👋 I'm Edu-AI. I've analysed your workspace — pick a suggestion below or ask me anything.`,
    },
  ]);
  const [draft, setDraft] = useState("");

  const seeds = useMemo(
    () => (swim ? SWIM_SEEDS_BY_ROLE : SEED_BY_ROLE)[user?.role ?? "student"] ?? [],
    [user?.role, swim],
  );

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMsg = { id: Date.now(), from: "user", text: trimmed };
    const reply: ChatMsg = {
      id: Date.now() + 1,
      from: "ai",
      text: swim
        ? generateSwimReply(trimmed, { swimmers: students.length }, swimAdmin)
        : generateReply(trimmed, {
            students: students.length,
            courses: courses.length,
            invoices: invoices.length,
          }),
    };
    setMessages((m) => [...m, userMsg, reply]);
    setDraft("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white flex items-center justify-center">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-base">
                {swim ? "Aquatics Copilot" : "Edu-AI Copilot"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {swim
                  ? "Context-aware assistant for your swim club."
                  : `Context-aware assistant for ${user?.role ?? "you"}.`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex gap-2", m.from === "user" ? "justify-end" : "justify-start")}
            >
              {m.from === "ai" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  m.from === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {seeds.length > 0 && (
          <div className="px-4 pb-2 border-t pt-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Suggested prompts
            </div>
            <div className="flex flex-wrap gap-1.5">
              {seeds.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border bg-card hover:bg-muted transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="border-t p-3 flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Edu-AI anything…"
            className="flex-1 h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="h-10 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-1"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function CopilotLauncher({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open Edu-AI copilot"
      className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-gradient-brand text-white shadow-elegant flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
    >
      <Bot className="h-5 w-5" />
      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
    </button>
  );
}
