import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { useCollection, addItem, nextId } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isSwimUser, chatPair, demoUsers, type ChatMessage } from "@/lib/mockData";
import { roleLabel } from "@/lib/menus";
import { Avatar } from "@/components/Avatar";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/messages")({
  head: () => ({ meta: [{ title: "Messages — 1StudentID" }] }),
  component: MessagesPage,
});

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface Thread {
  counterpart: string;
  role: string;
  messages: ChatMessage[];
  last: ChatMessage;
  unread: boolean;
  swim: boolean;
}

function MessagesPage() {
  const { user } = useAuth();
  const chat = useCollection("chat");
  const me = user?.name ?? "";
  const swim = isSwimUser(user);

  const [draft, setDraft] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showThread, setShowThread] = useState(false); // mobile only

  // Resolve a display role for a participant by name (from any message they've
  // sent, else the demo directory).
  const roleOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of chat) if (!map.has(m.fromName)) map.set(m.fromName, m.fromRole);
    for (const u of demoUsers) if (!map.has(u.name)) map.set(u.name, roleLabel[u.role]);
    return (name: string) => map.get(name) ?? "Contact";
  }, [chat]);

  // Group every conversation I'm part of by counterpart. Swim accounts only see
  // their club threads; a self-thread can never appear (counterpart ≠ me).
  const threads = useMemo<Thread[]>(() => {
    const mine = chat.filter((m) => (m.a === me || m.b === me) && (!swim || m.context === "swim"));
    const byCounterpart = new Map<string, ChatMessage[]>();
    for (const m of mine) {
      const other = m.a === me ? m.b : m.a;
      if (other === me) continue;
      (byCounterpart.get(other) ?? byCounterpart.set(other, []).get(other)!).push(m);
    }
    const list: Thread[] = [];
    for (const [counterpart, msgs] of byCounterpart) {
      const sorted = msgs
        .slice()
        .sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());
      const last = sorted[sorted.length - 1];
      list.push({
        counterpart,
        role: roleOf(counterpart),
        messages: sorted,
        last,
        unread: last.fromName !== me,
        swim: sorted.some((m) => m.context === "swim"),
      });
    }
    return list.sort((x, y) => new Date(y.last.at).getTime() - new Date(x.last.at).getTime());
  }, [chat, me, swim, roleOf]);

  const active = threads.find((t) => t.counterpart === activeKey) ?? threads[0] ?? null;

  const send = () => {
    if (!draft.trim() || !active || !user) return;
    const [a, b] = chatPair(me, active.counterpart);
    const row: ChatMessage = {
      id: nextId("CH-", "chat"),
      a,
      b,
      fromName: me,
      fromRole: roleLabel[user.role],
      text: draft.trim(),
      at: new Date().toISOString(),
      ...(active.swim || swim ? { context: "swim" as const } : {}),
    };
    addItem("chat", row);
    toast.success(`Message sent to ${active.counterpart}`);
    setDraft("");
  };

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={
          swim
            ? "Two-way club conversations with families and coaches — delivered in-app, email, SMS & WhatsApp."
            : "In-app, email, SMS, WhatsApp and video meetings."
        }
      />
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 lg:h-[600px]">
        <Section
          title="Inbox"
          className={`lg:col-span-1 overflow-hidden ${showThread ? "hidden lg:block" : ""}`}
        >
          {threads.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-7 w-7 mx-auto mb-2 opacity-50" />
              No conversations yet.
            </div>
          ) : (
            <ul className="-mx-4 sm:-mx-5 -my-4 sm:-my-5 divide-y">
              {threads.map((t) => (
                <li key={t.counterpart}>
                  <button
                    onClick={() => {
                      setActiveKey(t.counterpart);
                      setShowThread(true);
                    }}
                    className={`w-full text-left px-4 sm:px-5 py-3 hover:bg-muted flex gap-3 items-start ${
                      active?.counterpart === t.counterpart ? "bg-muted/60" : ""
                    }`}
                  >
                    <Avatar name={t.counterpart} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{t.counterpart}</span>
                        {t.unread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.last.fromName === me ? "You: " : ""}
                        {t.last.text}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {timeAgo(t.last.at)} · {t.role}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {active && (
          <Section
            title={active.counterpart}
            description={active.role}
            className={`lg:col-span-2 flex flex-col ${showThread ? "" : "hidden lg:flex"}`}
          >
            <button
              onClick={() => setShowThread(false)}
              className="lg:hidden mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to inbox
            </button>
            <div className="flex-1 space-y-3 min-h-[300px] overflow-y-auto">
              {active.messages.map((m) => {
                const mine = m.fromName === me;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`p-3 rounded-lg max-w-md text-sm ${
                        mine ? "bg-primary text-primary-foreground" : "bg-muted/40"
                      }`}
                    >
                      {m.text}
                      <div
                        className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {timeAgo(m.at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={`Message ${active.counterpart}…`}
                className="flex-1 h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={send}
                disabled={!draft.trim()}
                className="h-10 px-3 sm:px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> Replies are shared with {active.counterpart} and
              persist across logins.
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
