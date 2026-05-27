import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { messages } from "@/lib/mockData";
import { Send, MessageSquare } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/messages")({
  head: () => ({ meta: [{ title: "Messages — GlobalEdu" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState("");
  const m = messages[active];
  return (
    <div>
      <PageHeader title="Communication" subtitle="In-app, email, SMS, WhatsApp and video meetings." />
      <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
        <Section title="Inbox" className="lg:col-span-1 overflow-hidden">
          <ul className="-mx-5 -my-5 divide-y">
            {messages.map((msg, i) => (
              <li key={i}>
                <button onClick={() => setActive(i)} className={`w-full text-left px-5 py-3 hover:bg-muted ${i === active ? "bg-muted/60" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{msg.from}</span>
                    {msg.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{msg.preview}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{msg.time} · {msg.role}</div>
                </button>
              </li>
            ))}
          </ul>
        </Section>
        <Section title={m.from} description={m.role} className="lg:col-span-2 flex flex-col">
          <div className="flex-1 space-y-3 min-h-[300px]">
            <div className="p-3 rounded-lg bg-muted/40 max-w-md text-sm">{m.preview}</div>
            <div className="p-3 rounded-lg bg-primary text-primary-foreground max-w-md text-sm ml-auto">Thank you, I'll be there!</div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" className="flex-1 h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2"><Send className="h-4 w-4" />Send</button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
            <MessageSquare className="h-3 w-3" /> Also delivers via Email · SMS · WhatsApp based on recipient preferences
          </div>
        </Section>
      </div>
    </div>
  );
}
