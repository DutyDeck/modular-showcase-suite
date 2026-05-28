import { useMemo, useState } from "react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Badge, Button, Field, Select, TextArea, TextInput } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import {
  addItem,
  updateItem,
  removeItem,
  nextId,
  useCollection,
  type SrbEntry,
  type SrbReply,
  type SrbType,
} from "@/lib/store";

/* ---------- Type metadata ---------- */
export const SRB_TYPES: Array<{
  id: SrbType;
  label: string;
  icon: keyof typeof Icons;
  tone: "default" | "info" | "success" | "warning" | "destructive" | "muted";
}> = [
  { id: "homework", label: "Homework", icon: "BookOpen", tone: "info" },
  { id: "behavior", label: "Behaviour", icon: "Smile", tone: "warning" },
  { id: "achievement", label: "Achievement", icon: "Trophy", tone: "success" },
  { id: "health", label: "Health", icon: "HeartPulse", tone: "destructive" },
  { id: "permission", label: "Permission", icon: "FileCheck2", tone: "default" },
  { id: "communication", label: "Communication", icon: "MessageCircle", tone: "muted" },
  { id: "remark", label: "Remark", icon: "MessageSquareWarning", tone: "muted" },
];

const TYPE_BY_ID = Object.fromEntries(SRB_TYPES.map((t) => [t.id, t])) as Record<
  SrbType,
  (typeof SRB_TYPES)[number]
>;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
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

/* ---------- Filter chips ---------- */

export function SrbFilterChips({
  active,
  onChange,
  counts,
}: {
  active: SrbType | "all" | "needs-ack";
  onChange: (v: SrbType | "all" | "needs-ack") => void;
  counts: Record<string, number>;
}) {
  const chips: Array<{ id: SrbType | "all" | "needs-ack"; label: string }> = [
    { id: "all", label: "All" },
    { id: "needs-ack", label: "Needs ack" },
    ...SRB_TYPES.map((t) => ({ id: t.id, label: t.label })),
  ];
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
      {chips.map((c) => {
        const count = counts[c.id] ?? 0;
        const isActive = active === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted",
            )}
          >
            {c.label}
            {count > 0 && (
              <span
                className={cn(
                  "text-[10px] rounded-full px-1.5 py-0",
                  isActive
                    ? "bg-primary-foreground/20"
                    : c.id === "needs-ack" && count > 0
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-muted-foreground/15",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Entry card ---------- */

export function SrbEntryCard({ entry }: { entry: SrbEntry }) {
  const { user } = useAuth();
  const isParent = user?.role === "parent";
  const isStaff = user?.role === "teacher" || user?.role === "admin";
  const meta = TYPE_BY_ID[entry.type];
  const Icon = Icons[meta.icon] as React.ComponentType<{ className?: string }>;
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState("");

  const ack = () => {
    if (!user) return;
    updateItem("srb", (e) => e.id === entry.id, {
      ackBy: user.name,
      ackAt: new Date().toISOString(),
    });
    toast.success("Acknowledged");
  };

  const sendReply = () => {
    if (!draft.trim() || !user) return;
    const reply: SrbReply = {
      id: `r-${Date.now()}`,
      authorName: user.name,
      authorRole:
        user.role === "admin"
          ? "admin"
          : (user.role as "teacher" | "parent" | "student"),
      text: draft.trim(),
      at: new Date().toISOString(),
    };
    updateItem("srb", (e) => e.id === entry.id, {
      replies: [...(entry.replies ?? []), reply],
    });
    setDraft("");
    setReplying(false);
    toast.success("Reply sent");
  };

  const togglePin = () => {
    updateItem("srb", (e) => e.id === entry.id, { pinned: !entry.pinned });
  };

  const remove = () => {
    if (typeof window === "undefined" || window.confirm("Delete this entry?")) {
      removeItem("srb", (e) => e.id === entry.id);
      toast.success("Entry deleted");
    }
  };

  return (
    <article
      className={cn(
        "rounded-xl border bg-card shadow-soft overflow-hidden",
        entry.pinned && "ring-1 ring-primary/30",
        entry.requiresAck && !entry.ackAt && "ring-1 ring-destructive/30",
      )}
    >
      {entry.pinned && (
        <div className="px-4 py-1.5 bg-primary/5 text-primary text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5">
          <Icons.Pin className="h-3 w-3" />
          Pinned
        </div>
      )}

      <header className="px-4 sm:px-5 py-4 flex items-start gap-3">
        <Avatar name={entry.authorName} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{entry.authorName}</span>
            <span className="text-[11px] text-muted-foreground capitalize">
              · {entry.authorRole}
            </span>
            <span className="text-[11px] text-muted-foreground">
              · {timeAgo(entry.date)}
            </span>
            <Badge tone={meta.tone}>
              <Icon className="h-3 w-3 mr-1 inline" />
              {meta.label}
            </Badge>
            {entry.requiresAck && !entry.ackAt && (
              <Badge tone="destructive">Action required</Badge>
            )}
          </div>
        </div>
        {isStaff && entry.authorRole !== "parent" && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={togglePin}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              title={entry.pinned ? "Unpin" : "Pin"}
            >
              <Icons.Pin className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={remove}
              className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
              title="Delete"
            >
              <Icons.Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      <div className="px-4 sm:px-5 pb-4">
        <h3 className="text-sm font-semibold leading-tight">{entry.title}</h3>
        <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">
          {entry.body}
        </p>
      </div>

      {/* Ack row */}
      <div className="px-4 sm:px-5 py-2.5 border-t bg-muted/30 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          {entry.ackAt ? (
            <>
              <Icons.CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>
                Acknowledged by <span className="text-foreground font-medium">{entry.ackBy}</span> ·{" "}
                {timeAgo(entry.ackAt)}
              </span>
            </>
          ) : (
            <>
              <Icons.Circle className="h-3.5 w-3.5" />
              <span>Awaiting parent acknowledgement</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isParent && !entry.ackAt && (
            <Button size="sm" onClick={ack}>
              <Icons.Check className="h-3.5 w-3.5" />
              Acknowledge
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setReplying((r) => !r)}>
            <Icons.MessageSquare className="h-3.5 w-3.5" />
            Reply
          </Button>
        </div>
      </div>

      {/* Replies thread */}
      {(entry.replies?.length ?? 0) > 0 && (
        <ul className="border-t divide-y">
          {entry.replies!.map((r) => (
            <li key={r.id} className="px-4 sm:px-5 py-3 flex gap-2.5">
              <Avatar name={r.authorName} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-medium">{r.authorName}</span>
                  <span className="text-muted-foreground capitalize">· {r.authorRole}</span>
                  <span className="text-muted-foreground">· {timeAgo(r.at)}</span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{r.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {replying && (
        <div className="border-t px-4 sm:px-5 py-3 flex gap-2 items-start">
          <Avatar name={user?.name ?? "Me"} size={28} />
          <div className="flex-1 flex flex-col gap-2">
            <TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a reply…"
              className="min-h-[64px]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => {
                  setReplying(false);
                  setDraft("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" type="button" onClick={sendReply} disabled={!draft.trim()}>
                <Icons.Send className="h-3.5 w-3.5" />
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/* ---------- Composer ---------- */

const TEMPLATES: Record<SrbType, string[]> = {
  homework: [
    "Please complete pages X–Y of the workbook by [date].",
    "Reading assignment: chapters X–Y. Be ready to discuss in class.",
  ],
  behavior: [
    "Great participation today — kept the group focused.",
    "Was disruptive during quiet work. Please remind at home.",
  ],
  achievement: [
    "Outstanding score on this week's assessment 🎉",
    "Strong improvement compared to last month — keep it up!",
  ],
  health: [
    "Visited the school nurse with [issue]. No further action required.",
    "Please remind us of any medication updates.",
  ],
  permission: [
    "Field trip to [location] on [date]. Please acknowledge by [deadline].",
    "Permission needed for the upcoming sports event on [date].",
  ],
  communication: [
    "Quick update on this week's class plan.",
    "Could we schedule a brief parent-teacher chat this week?",
  ],
  remark: [
    "General observation — nothing urgent.",
    "Wanted to flag a small concern for your awareness.",
  ],
};

export function SrbComposer({
  open,
  onOpenChange,
  defaultStudentId,
  defaultStudentName,
  studentOptions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultStudentId?: string;
  defaultStudentName?: string;
  studentOptions?: Array<{ id: string; name: string }>;
}) {
  const { user } = useAuth();
  const [type, setType] = useState<SrbType>("homework");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [requiresAck, setRequiresAck] = useState(false);
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");

  const submit = () => {
    if (!user) return;
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    const sid = studentId || defaultStudentId;
    const sname =
      studentOptions?.find((s) => s.id === sid)?.name ?? defaultStudentName ?? "Student";
    if (!sid) {
      toast.error("Pick a student");
      return;
    }
    const entry: SrbEntry = {
      id: nextId("SRB-", "srb"),
      studentId: sid,
      studentName: sname,
      authorName: user.name,
      authorRole:
        user.role === "admin"
          ? "admin"
          : (user.role as "teacher" | "parent" | "student" | "counselor"),
      type,
      title: title.trim(),
      body: body.trim(),
      date: new Date().toISOString(),
      requiresAck,
      replies: [],
    };
    addItem("srb", entry);
    toast.success("Entry posted");
    setTitle("");
    setBody("");
    setRequiresAck(false);
    setType("homework");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New record book entry</DialogTitle>
          <DialogDescription>
            Posts to {defaultStudentName ? defaultStudentName : "the selected student"}'s
            record book and notifies parents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {studentOptions && studentOptions.length > 0 && (
            <Field label="Student">
              <Select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                options={[
                  { value: "", label: "— Pick a student —" },
                  ...studentOptions.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </Field>
          )}

          <div>
            <div className="text-xs font-medium mb-1.5">Type</div>
            <div className="flex flex-wrap gap-1.5">
              {SRB_TYPES.map((t) => {
                const I = Icons[t.icon] as React.ComponentType<{ className?: string }>;
                const active = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-muted",
                    )}
                  >
                    <I className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Title" required>
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Field trip to the planetarium"
            />
          </Field>

          <Field label="Note">
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your note for the parent…"
              className="min-h-[100px]"
            />
          </Field>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Quick templates
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES[type].map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setBody(tpl)}
                  className="text-[11px] px-2 py-1 rounded-md border bg-card hover:bg-muted text-left"
                >
                  {tpl.length > 60 ? tpl.slice(0, 60) + "…" : tpl}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresAck}
              onChange={(e) => setRequiresAck(e.target.checked)}
              className="rounded border-input"
            />
            Require parent acknowledgement
          </label>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit}>
            <Icons.Send className="h-4 w-4" />
            Post entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Timeline ---------- */

export function SrbTimeline({ studentId }: { studentId: string }) {
  const all = useCollection("srb");
  const [filter, setFilter] = useState<SrbType | "all" | "needs-ack">("all");
  const studentEntries = useMemo(
    () =>
      all
        .filter((e) => e.studentId === studentId)
        .sort((a, b) => {
          if ((a.pinned ?? false) !== (b.pinned ?? false))
            return a.pinned ? -1 : 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }),
    [all, studentId],
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: studentEntries.length };
    out["needs-ack"] = studentEntries.filter(
      (e) => e.requiresAck && !e.ackAt,
    ).length;
    SRB_TYPES.forEach((t) => {
      out[t.id] = studentEntries.filter((e) => e.type === t.id).length;
    });
    return out;
  }, [studentEntries]);

  const filtered = useMemo(() => {
    if (filter === "all") return studentEntries;
    if (filter === "needs-ack")
      return studentEntries.filter((e) => e.requiresAck && !e.ackAt);
    return studentEntries.filter((e) => e.type === filter);
  }, [filter, studentEntries]);

  return (
    <div className="space-y-4">
      <SrbFilterChips active={filter} onChange={setFilter} counts={counts} />
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <Icons.NotebookPen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="text-sm font-medium">No entries for this filter</div>
          <div className="text-xs text-muted-foreground mt-1">
            Try a different category or clear the filter.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <SrbEntryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
