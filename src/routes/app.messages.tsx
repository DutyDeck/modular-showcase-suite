import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { useCollection } from "@/lib/store";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/messages")({
  head: () => ({ meta: [{ title: "Messages — One Edu" }] }),
  component: MessagesPage,
});

interface Thread {
  text: string;
  mine: boolean;
}

function MessagesPage() {
  const messages = useCollection("messages");
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState("");
  const [showThread, setShowThread] = useState(false); // mobile only
  const m = messages[active];
  const [threadByIdx, setThreadByIdx] = useState<Record<number, Thread[]>>({});

  const conversation = m ? threadByIdx[active] ?? [
    { text: m.preview, mine: false },
    { text: "Thank you, I'll be there!", mine: true },
  ] : [];

  const send = () => {
    if (!draft.trim() || !m) return;
    setThreadByIdx((t) => ({
      ...t,
      [active]: [...conversation, { text: draft.trim(), mine: true }],
    }));
    toast.success(`Message sent to ${m.from}`);
    setDraft("");
  };

  return (
    <div>
      <PageHeader
        title="Communication"
        subtitle="In-app, email, SMS, WhatsApp and video meetings."
      />
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 lg:h-[600px]">
        <Section
          title="Inbox"
          className={`lg:col-span-1 overflow-hidden ${showThread ? "hidden lg:block" : ""}`}
        >
          <ul className="-mx-4 sm:-mx-5 -my-4 sm:-my-5 divide-y">
            {messages.map((msg, i) => (
              <li key={i}>
                <button
                  onClick={() => {
                    setActive(i);
                    setShowThread(true);
                  }}
                  className={`w-full text-left px-4 sm:px-5 py-3 hover:bg-muted ${
                    i === active ? "bg-muted/60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{msg.from}</span>
                    {msg.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {msg.preview}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {msg.time} Â· {msg.role}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Section>
        {m && (
          <Section
            title={m.from}
            description={m.role}
            className={`lg:col-span-2 flex flex-col ${showThread ? "" : "hidden lg:flex"}`}
          >
            <button
              onClick={() => setShowThread(false)}
              className="lg:hidden mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to inbox
            </button>
            <div className="flex-1 space-y-3 min-h-[300px]">
              {conversation.map((t, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg max-w-md text-sm ${
                    t.mine
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted/40"
                  }`}
                >
                  {t.text}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a messageâ€¦"
                className="flex-1 h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={send}
                className="h-10 px-3 sm:px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> Also delivers via Email Â· SMS Â· WhatsApp based on recipient preferences
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
