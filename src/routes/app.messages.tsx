import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCollection, addItem, nextId } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  isSwimUser,
  isSwimAdmin,
  chatPair,
  demoUsers,
  poolSessions,
  membersForSession,
  swimContactDirectory,
  type ChatMessage,
  type ChatGroup,
  type ChatAttachment,
  type ChatContact,
} from "@/lib/mockData";
import { roleLabel } from "@/lib/menus";
import { Avatar } from "@/components/Avatar";
import {
  Send,
  MessageSquare,
  ArrowLeft,
  Search,
  Smile,
  Paperclip,
  Users,
  UsersRound,
  Plus,
  X,
  FileText,
  CheckCheck,
  Download,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/messages")({
  head: () => ({ meta: [{ title: "Messages — 1StudentID" }] }),
  component: MessagesPage,
});

/* ── small helpers ──────────────────────────────────────────────────────── */

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function clockOf(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const byTime = (x: ChatMessage, y: ChatMessage) =>
  new Date(x.at).getTime() - new Date(y.at).getTime();

/* A curated, dependency-free emoji palette for the composer. */
const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😅",
  "😂",
  "🤣",
  "🙂",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤩",
  "🥳",
  "🤗",
  "🤔",
  "😉",
  "😌",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🙏",
  "💪",
  "🔥",
  "✅",
  "❌",
  "❤️",
  "💙",
  "💚",
  "⭐",
  "🎉",
  "🎯",
  "🏆",
  "🥇",
  "🥈",
  "🥉",
  "🏊",
  "🌊",
  "💧",
  "⏰",
  "📣",
  "📸",
  "📎",
  "💯",
  "👋",
  "😮",
  "😢",
  "🎽",
  "🏅",
];

/* Deterministic accent per sender name so group messages are easy to scan. */
const NAME_COLORS = [
  "text-rose-600",
  "text-amber-600",
  "text-emerald-600",
  "text-sky-600",
  "text-violet-600",
  "text-fuchsia-600",
  "text-teal-600",
  "text-indigo-600",
];
function nameColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % NAME_COLORS.length;
  return NAME_COLORS[h];
}

/* ── thread model (a conversation in the inbox — DM or group) ────────────── */

type Target = { kind: "dm"; name: string } | { kind: "group"; id: string };

interface ThreadRow {
  key: string;
  kind: "dm" | "group";
  targetName: string; // DM counterpart name, or group id
  title: string;
  subtitle: string;
  messages: ChatMessage[];
  last?: ChatMessage;
  unread: boolean;
  group?: ChatGroup;
}

function MessagesPage() {
  const { user } = useAuth();
  const chat = useCollection("chat");
  const groups = useCollection("chatGroups");
  const me = user?.name ?? "";
  const swim = isSwimUser(user);
  const admin = isSwimAdmin(user);

  const [draft, setDraft] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [showThread, setShowThread] = useState(false); // mobile: which pane
  const [search, setSearch] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Resolve a display role for a participant by name.
  const roleOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of chat) if (!m.groupId && !map.has(m.fromName)) map.set(m.fromName, m.fromRole);
    for (const u of demoUsers) if (!map.has(u.name)) map.set(u.name, roleLabel[u.role]);
    return (name: string) => map.get(name) ?? "Contact";
  }, [chat]);

  // 1-to-1 threads (swim accounts only see club threads).
  const dmThreads = useMemo<ThreadRow[]>(() => {
    const mine = chat.filter(
      (m) => !m.groupId && (m.a === me || m.b === me) && (!swim || m.context === "swim"),
    );
    const byCounterpart = new Map<string, ChatMessage[]>();
    for (const m of mine) {
      const other = m.a === me ? m.b : m.a;
      if (other === me) continue;
      (byCounterpart.get(other) ?? byCounterpart.set(other, []).get(other)!).push(m);
    }
    const list: ThreadRow[] = [];
    for (const [counterpart, msgs] of byCounterpart) {
      const sorted = msgs.slice().sort(byTime);
      const last = sorted[sorted.length - 1];
      list.push({
        key: `dm:${counterpart}`,
        kind: "dm",
        targetName: counterpart,
        title: counterpart,
        subtitle: roleOf(counterpart),
        messages: sorted,
        last,
        unread: last.fromName !== me,
      });
    }
    return list;
  }, [chat, me, swim, roleOf]);

  // Group threads I'm a member of (or created).
  const groupThreads = useMemo<ThreadRow[]>(() => {
    return groups
      .filter((g) => g.members.includes(me) || g.createdBy === me)
      .map((g) => {
        const msgs = chat
          .filter((m) => m.groupId === g.id)
          .slice()
          .sort(byTime);
        const last = msgs[msgs.length - 1];
        return {
          key: `grp:${g.id}`,
          kind: "group" as const,
          targetName: g.id,
          title: g.name,
          subtitle: `${g.members.length} members`,
          messages: msgs,
          last,
          unread: !!last && last.fromName !== me,
          group: g,
        };
      });
  }, [groups, chat, me]);

  const sortedThreads = useMemo<ThreadRow[]>(() => {
    const stamp = (t: ThreadRow) =>
      t.last ? new Date(t.last.at).getTime() : t.group ? new Date(t.group.createdAt).getTime() : 0;
    return [...dmThreads, ...groupThreads].sort((x, y) => stamp(y) - stamp(x));
  }, [dmThreads, groupThreads]);

  const visibleThreads = useMemo<ThreadRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedThreads;
    return sortedThreads.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.last?.text ?? "").toLowerCase().includes(q),
    );
  }, [sortedThreads, search]);

  // The open conversation — resolved from the selected target, falling back to
  // the most-recent thread. A freshly-started DM has no messages yet.
  const active = useMemo<ThreadRow | null>(() => {
    if (!target) return sortedThreads[0] ?? null;
    if (target.kind === "group")
      return groupThreads.find((t) => t.targetName === target.id) ?? null;
    return (
      dmThreads.find((t) => t.targetName === target.name) ?? {
        key: `dm:${target.name}`,
        kind: "dm",
        targetName: target.name,
        title: target.name,
        subtitle: roleOf(target.name),
        messages: [],
        unread: false,
      }
    );
  }, [target, sortedThreads, groupThreads, dmThreads, roleOf]);

  /* ── sending ──────────────────────────────────────────────────────────── */

  const send = (opts?: { text?: string; attachment?: ChatAttachment }) => {
    if (!active || !user) return;
    const text = (opts?.text ?? draft).trim();
    const attachment = opts?.attachment;
    if (!text && !attachment) return;

    const base = {
      id: nextId("CH-", "chat"),
      fromName: me,
      fromRole: roleLabel[user.role],
      text,
      at: new Date().toISOString(),
      ...(attachment ? { attachment } : {}),
    };

    let row: ChatMessage;
    if (active.kind === "group" && active.group) {
      const gid = active.group.id;
      row = { ...base, a: gid, b: gid, groupId: gid, context: "swim" };
    } else {
      const [a, b] = chatPair(me, active.targetName);
      row = { ...base, a, b, ...(swim ? { context: "swim" as const } : {}) };
    }
    addItem("chat", row);
    if (!attachment) setDraft("");
    setEmojiOpen(false);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    const MAX = 2 * 1024 * 1024;
    if (file.size > MAX) {
      toast.error("Please choose a file under 2 MB for the demo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      send({
        attachment: {
          kind: file.type.startsWith("image/") ? "image" : "file",
          name: file.name,
          dataUrl: String(reader.result),
          size: file.size,
          mime: file.type,
        },
      });
    };
    reader.onerror = () => toast.error("Could not read that file.");
    reader.readAsDataURL(file);
  };

  const openThread = (t: Target) => {
    setTarget(t);
    setShowThread(true);
    setSearch("");
  };

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={
          swim
            ? "WhatsApp-style club chat — message any coach or family, start session groups, share photos & documents."
            : "In-app, email, SMS, WhatsApp and video meetings."
        }
      />

      <div className="rounded-2xl border bg-card overflow-hidden shadow-soft grid lg:grid-cols-3 lg:h-[640px]">
        {/* ── Inbox ─────────────────────────────────────────────────────── */}
        <aside
          className={`lg:col-span-1 border-r flex flex-col min-h-0 ${showThread ? "hidden lg:flex" : "flex"}`}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Chats</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNewChatOpen(true)}
                title="New chat"
                className="h-8 w-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
              {admin && (
                <button
                  onClick={() => setNewGroupOpen(true)}
                  title="New group"
                  data-tour="new-group-btn"
                  className="h-8 w-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <UsersRound className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="px-3 py-2 border-b">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats"
                className="w-full h-9 pl-8 pr-3 rounded-full border bg-muted/40 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {visibleThreads.length === 0 ? (
              <div className="py-10 px-4 text-center text-sm text-muted-foreground">
                <MessageSquare className="h-7 w-7 mx-auto mb-2 opacity-50" />
                {search ? "No chats match your search." : "No conversations yet."}
                <div className="mt-3">
                  <button
                    onClick={() => setNewChatOpen(true)}
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    Start a new chat
                  </button>
                </div>
              </div>
            ) : (
              <ul className="divide-y">
                {visibleThreads.map((t) => {
                  const isActive = active?.key === t.key;
                  return (
                    <li key={t.key}>
                      <button
                        onClick={() =>
                          openThread(
                            t.kind === "group"
                              ? { kind: "group", id: t.targetName }
                              : { kind: "dm", name: t.targetName },
                          )
                        }
                        className={`w-full text-left px-3 py-2.5 hover:bg-muted flex gap-3 items-center ${
                          isActive ? "bg-muted/70" : ""
                        }`}
                      >
                        {t.kind === "group" ? (
                          <span className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                            <Users className="h-5 w-5" />
                          </span>
                        ) : (
                          <Avatar name={t.title} size={40} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">{t.title}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {t.last ? timeAgo(t.last.at) : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground truncate">
                              {t.last ? (
                                <>
                                  {t.kind === "group" && t.last.fromName !== me
                                    ? `${t.last.fromName.replace(/^Coach /, "")}: `
                                    : t.last.fromName === me
                                      ? "You: "
                                      : ""}
                                  {t.last.attachment && !t.last.text
                                    ? t.last.attachment.kind === "image"
                                      ? "📷 Photo"
                                      : "📎 " + t.last.attachment.name
                                    : t.last.text}
                                </>
                              ) : t.kind === "group" ? (
                                "Group created — say hello 👋"
                              ) : (
                                "No messages yet"
                              )}
                            </span>
                            {t.unread && (
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Conversation ──────────────────────────────────────────────── */}
        <section
          className={`lg:col-span-2 flex flex-col min-h-0 ${showThread ? "flex" : "hidden lg:flex"}`}
        >
          {!active ? (
            <div className="flex-1 grid place-items-center text-center text-sm text-muted-foreground p-8">
              <div>
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                Select a chat, or start a new one.
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="px-4 py-3 border-b flex items-center gap-3">
                <button
                  onClick={() => setShowThread(false)}
                  className="lg:hidden -ml-1 h-8 w-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
                  title="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {active.kind === "group" ? (
                  <span className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Users className="h-5 w-5" />
                  </span>
                ) : (
                  <Avatar name={active.title} size={40} />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{active.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {active.kind === "group" && active.group
                      ? active.group.members
                          .map((n) => n.replace(/^Coach /, ""))
                          .slice(0, 4)
                          .join(", ") +
                        (active.group.members.length > 4
                          ? ` +${active.group.members.length - 4}`
                          : "")
                      : active.subtitle}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                data-tour="messages-thread"
                className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-1.5 bg-muted/20"
                style={{
                  backgroundImage: "radial-gradient(rgba(100,116,139,0.12) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              >
                {active.messages.length === 0 ? (
                  <div className="h-full grid place-items-center text-center text-xs text-muted-foreground">
                    <div className="max-w-xs rounded-xl bg-card/80 border px-4 py-3">
                      {active.kind === "group"
                        ? "This group is ready. Post an update — everyone connected to the session will see it."
                        : `Say hello to ${active.title}. Messages are shared with them and persist across logins.`}
                    </div>
                  </div>
                ) : (
                  active.messages.map((m, i) => {
                    const mine = m.fromName === me;
                    const isGroup = active.kind === "group";
                    const prev = active.messages[i - 1];
                    const showSender = isGroup && !mine && prev?.fromName !== m.fromName;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                      >
                        {isGroup && !mine ? (
                          <div className="w-7 shrink-0">
                            {showSender && <Avatar name={m.fromName} size={28} />}
                          </div>
                        ) : null}
                        <div
                          className={`max-w-[78%] sm:max-w-md rounded-2xl px-3 py-2 text-sm shadow-soft ${
                            mine
                              ? "bg-emerald-600 text-white rounded-br-md"
                              : "bg-card border rounded-bl-md"
                          }`}
                        >
                          {showSender && (
                            <div
                              className={`text-[11px] font-semibold mb-0.5 ${nameColor(m.fromName)}`}
                            >
                              {m.fromName}
                            </div>
                          )}
                          {m.attachment && <Attachment att={m.attachment} mine={mine} />}
                          {m.text && (
                            <div className="whitespace-pre-wrap break-words">{m.text}</div>
                          )}
                          <div
                            className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${
                              mine ? "text-white/70" : "text-muted-foreground"
                            }`}
                          >
                            {clockOf(m.at)}
                            {mine && <CheckCheck className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Composer */}
              <div className="relative border-t px-3 py-2.5">
                {emojiOpen && (
                  <>
                    <button
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setEmojiOpen(false)}
                      tabIndex={-1}
                      aria-label="Close emoji picker"
                    />
                    <div className="absolute z-20 bottom-16 left-3 w-64 max-h-52 overflow-y-auto rounded-xl border bg-card shadow-lg p-2 grid grid-cols-8 gap-0.5">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => setDraft((d) => d + e)}
                          className="h-7 w-7 grid place-items-center rounded hover:bg-muted text-lg leading-none"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEmojiOpen((v) => !v)}
                    title="Emoji"
                    className={`h-9 w-9 shrink-0 grid place-items-center rounded-full hover:bg-muted ${
                      emojiOpen ? "text-emerald-600" : "text-muted-foreground"
                    }`}
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    title="Attach image or document"
                    className="h-9 w-9 shrink-0 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    className="hidden"
                    onChange={onPickFile}
                  />
                  <input
                    data-tour="msg-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={`Message ${active.title}…`}
                    className="flex-1 h-10 px-4 rounded-full border bg-muted/40 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => send()}
                    disabled={!draft.trim()}
                    data-tour="msg-send"
                    title="Send"
                    className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        me={me}
        swim={swim}
        dmThreads={dmThreads}
        onPick={(name) => {
          setNewChatOpen(false);
          openThread({ kind: "dm", name });
        }}
      />
      <NewGroupDialog
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
        me={me}
        onCreate={(id) => {
          setNewGroupOpen(false);
          openThread({ kind: "group", id });
        }}
      />
    </div>
  );
}

/* ── attachment bubble ──────────────────────────────────────────────────── */

function Attachment({ att, mine }: { att: ChatAttachment; mine: boolean }) {
  if (att.kind === "image") {
    return (
      <a href={att.dataUrl} target="_blank" rel="noreferrer" className="block mb-1">
        <img
          src={att.dataUrl}
          alt={att.name}
          className="rounded-lg max-w-[240px] max-h-[240px] w-auto object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={att.dataUrl}
      download={att.name}
      className={`mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 max-w-[240px] ${
        mine ? "bg-white/15" : "bg-muted/60"
      }`}
    >
      <span
        className={`h-9 w-9 shrink-0 grid place-items-center rounded ${
          mine ? "bg-white/20" : "bg-background"
        }`}
      >
        <FileText className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium truncate">{att.name}</span>
        <span className={`block text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>
          {fmtBytes(att.size)}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
}

/* ── New chat: search & pick a contact ──────────────────────────────────── */

function NewChatDialog({
  open,
  onOpenChange,
  me,
  swim,
  dmThreads,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  me: string;
  swim: boolean;
  dmThreads: ThreadRow[];
  onPick: (name: string) => void;
}) {
  const [q, setQ] = useState("");

  const directory = useMemo<ChatContact[]>(() => {
    const map = new Map<string, string>();
    if (swim) {
      for (const c of swimContactDirectory()) map.set(c.name, c.role);
    } else {
      for (const u of demoUsers) map.set(u.name, roleLabel[u.role]);
    }
    for (const t of dmThreads) if (!map.has(t.title)) map.set(t.title, t.subtitle);
    map.delete(me);
    return Array.from(map, ([name, role]) => ({ name, role })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [swim, dmThreads, me]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return directory;
    return directory.filter(
      (c) => c.name.toLowerCase().includes(s) || c.role.toLowerCase().includes(s),
    );
  }, [directory, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
          <DialogDescription>Search for a person to start a conversation.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            data-tour="new-chat-search"
            className="w-full h-10 pl-8 pr-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <ul className="mt-2 max-h-72 overflow-y-auto divide-y -mx-1">
          {filtered.length === 0 ? (
            <li className="py-8 text-center text-sm text-muted-foreground">No people found.</li>
          ) : (
            filtered.map((c) => (
              <li key={c.name}>
                <button
                  onClick={() => {
                    onPick(c.name);
                    setQ("");
                  }}
                  className="w-full text-left px-2 py-2.5 hover:bg-muted rounded-md flex items-center gap-3"
                >
                  <Avatar name={c.name} size={36} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.role}</div>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/* ── New group (admin): pick a session, auto-add coaches + families ─────── */

function NewGroupDialog({
  open,
  onOpenChange,
  me,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  me: string;
  onCreate: (id: string) => void;
}) {
  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");

  const members = useMemo(
    () => (sessionId ? Array.from(new Set([...membersForSession(sessionId), me])) : []),
    [sessionId, me],
  );

  const pickSession = (id: string) => {
    const s = poolSessions.find((p) => p.id === id);
    setSessionId(id);
    if (s) setName(`${s.title} · ${s.day}`);
  };

  const create = () => {
    const s = poolSessions.find((p) => p.id === sessionId);
    if (!s) {
      toast.error("Pick a session first.");
      return;
    }
    const finalMembers = Array.from(new Set([...membersForSession(s.id), me]));
    const group: ChatGroup = {
      id: nextId("GRP-", "chatGroups"),
      name: name.trim() || s.title,
      sessionId: s.id,
      courseId: s.courseId,
      members: finalMembers,
      createdBy: me,
      createdAt: new Date().toISOString(),
      context: "swim",
    };
    addItem("chatGroups", group);
    toast.success(`Group "${group.name}" created · ${finalMembers.length} members`);
    setSessionId("");
    setName("");
    onCreate(group.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New session group</DialogTitle>
          <DialogDescription>
            Pick a session — its coaches and every enrolled swimmer's family are added automatically
            so you can reach the whole group at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Session
            </label>
            <div
              className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border divide-y"
              data-tour="group-session-list"
            >
              {poolSessions.map((s) => {
                const on = s.id === sessionId;
                return (
                  <button
                    key={s.id}
                    onClick={() => pickSession(s.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted ${
                      on ? "bg-emerald-500/10" : ""
                    }`}
                  >
                    <span
                      className={`h-9 w-9 shrink-0 grid place-items-center rounded-full ${
                        on ? "bg-emerald-600 text-white" : "bg-emerald-500/15 text-emerald-600"
                      }`}
                    >
                      <Users className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{s.title}</span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {s.day} {s.start}–{s.end} ·{" "}
                        {s.coachNames.map((c) => c.replace(/^Coach /, "")).join(", ")}
                      </span>
                    </span>
                    {on && <CheckCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {sessionId && (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Group name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-tour="group-name"
                  className="mt-1.5 w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Members · {members.length}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 pl-1 pr-2.5 py-0.5 text-xs"
                    >
                      <Avatar name={m} size={20} />
                      {m.replace(/^Coach /, "")}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-md border text-sm hover:bg-muted inline-flex items-center gap-1.5"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          <button
            onClick={create}
            disabled={!sessionId}
            data-tour="group-create"
            className="h-9 px-4 rounded-md bg-emerald-600 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-50 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Create group
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
