import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Button,
  Field,
  Select,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useCollection, addItem, updateItem, type AttendanceRow } from "@/lib/store";
import {
  ArrowLeft,
  Check,
  Clock,
  X,
  Search,
  Save,
  RotateCcw,
  ScanFace,
  QrCode,
  MapPin,
  Radio,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/attendance/take")({
  head: () => ({ meta: [{ title: "Take attendance — 1StudentID" }] }),
  component: TakeAttendancePage,
});

type Status = "Present" | "Late" | "Absent" | null;

const METHODS = [
  { id: "Facial Recognition", icon: ScanFace, label: "Facial" },
  { id: "QR Scan", icon: QrCode, label: "QR" },
  { id: "GPS", icon: MapPin, label: "GPS" },
  { id: "RFID", icon: Radio, label: "RFID" },
  { id: "Manual", icon: Check, label: "Manual" },
];

function TakeAttendancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const students = useCollection("students");
  const existingAttendance = useCollection("attendance");

  // Only teachers and admins can take attendance. Students/parents get bounced
  // back to their read-only history view.
  useEffect(() => {
    if (user && user.role !== "teacher" && user.role !== "admin") {
      toast.info("Attendance marking is for teachers and admins.");
      navigate({ to: "/app/attendance", replace: true });
    }
  }, [user, navigate]);
  if (user && user.role !== "teacher" && user.role !== "admin") return null;

  // Unique batches from the roster
  const batches = useMemo(
    () => Array.from(new Set(students.map((s) => s.batch))).sort(),
    [students],
  );
  const [batch, setBatch] = useState<string>(batches[0] ?? "");
  useEffect(() => {
    if (!batch && batches[0]) setBatch(batches[0]);
  }, [batches, batch]);

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<string>("Manual");
  const [query, setQuery] = useState("");

  // Roster filtered by batch
  const roster = useMemo(
    () => students.filter((s) => s.batch === batch),
    [students, batch],
  );

  // Local per-student status — default everyone Present
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset state when batch changes
  useEffect(() => {
    const init: Record<string, Status> = {};
    roster.forEach((s) => {
      init[s.id] = "Present";
    });
    setStatus(init);
    setNote({});
    setSelected(new Set());
  }, [batch, roster.length]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.parent.toLowerCase().includes(q),
    );
  }, [roster, query]);

  const counters = useMemo(() => {
    const c = { Present: 0, Late: 0, Absent: 0, Unmarked: 0 };
    roster.forEach((s) => {
      const v = status[s.id];
      if (v === "Present") c.Present++;
      else if (v === "Late") c.Late++;
      else if (v === "Absent") c.Absent++;
      else c.Unmarked++;
    });
    return c;
  }, [status, roster]);

  const setAll = (v: Status) => {
    const next: Record<string, Status> = {};
    roster.forEach((s) => (next[s.id] = v));
    setStatus(next);
  };

  const setOne = (id: string, v: Status) => {
    setStatus((s) => ({ ...s, [id]: v }));
  };

  const toggleSelect = (id: string) => {
    setSelected((sel) => {
      const next = new Set(sel);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setSelectedAs = (v: Status) => {
    if (selected.size === 0) {
      toast.info("Select rows first to bulk-mark them.");
      return;
    }
    setStatus((s) => {
      const next = { ...s };
      selected.forEach((id) => (next[id] = v));
      return next;
    });
    toast.success(`Marked ${selected.size} as ${v ?? "—"}`);
  };

  const publish = () => {
    if (roster.length === 0) {
      toast.error("No students in this batch.");
      return;
    }
    let written = 0;
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    roster.forEach((s) => {
      const v = status[s.id];
      if (!v) return;
      const existing = existingAttendance.find((a) => a.id === s.id);
      const row: AttendanceRow = {
        id: s.id,
        name: s.name,
        time: v === "Absent" ? "—" : now,
        method: v === "Absent" ? "—" : method,
        status: v,
      };
      if (existing) {
        updateItem("attendance", (a) => a.id === s.id, row);
      } else {
        addItem("attendance", row);
      }
      written++;
    });
    toast.success(
      `Saved attendance for ${batch} on ${date} — ${written} students`,
    );
    navigate({ to: "/app/attendance" });
  };

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title="Take attendance"
        subtitle="Mark a whole class in seconds — defaults to everyone present, tap exceptions."
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/app/attendance" })}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Class / date / method picker */}
      <Section>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Batch / Class">
            <Select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              options={batches.map((b) => ({ value: b, label: b }))}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="Method" className="sm:col-span-2 lg:col-span-2">
            <div className="flex gap-1.5 flex-wrap">
              {METHODS.map((m) => {
                const I = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "h-10 px-3 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-muted",
                    )}
                  >
                    <I className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </Section>

      {/* Counters + quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Counter label="Present" value={counters.Present} tone="success" />
        <Counter label="Late" value={counters.Late} tone="warning" />
        <Counter label="Absent" value={counters.Absent} tone="destructive" />
        <Counter label="Unmarked" value={counters.Unmarked} tone="muted" />
      </div>

      <Section
        title={`${batch || "—"} · ${roster.length} students`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setAll("Present")}>
              <Check className="h-3.5 w-3.5" />
              All present
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAll("Absent")}>
              <X className="h-3.5 w-3.5" />
              All absent
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAll("Present")}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        }
      >
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this class…"
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Bulk-select bar */}
        {selected.size > 0 && (
          <div className="rounded-lg border bg-primary/5 px-3 py-2 mb-3 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div>
              <span className="font-medium">{selected.size} selected</span> · bulk-mark as:
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelectedAs("Present")}
                className="px-2.5 py-1 rounded-md bg-success/15 text-success font-medium hover:bg-success/20"
              >
                Present
              </button>
              <button
                onClick={() => setSelectedAs("Late")}
                className="px-2.5 py-1 rounded-md bg-warning/20 text-warning-foreground font-medium hover:bg-warning/30"
              >
                Late
              </button>
              <button
                onClick={() => setSelectedAs("Absent")}
                className="px-2.5 py-1 rounded-md bg-destructive/15 text-destructive font-medium hover:bg-destructive/20"
              >
                Absent
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="px-2.5 py-1 rounded-md hover:bg-muted text-muted-foreground"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Roster */}
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            No students match your filters.
          </div>
        ) : (
          <ul className="divide-y -mx-4 sm:-mx-5">
            {filtered.map((s) => {
              const v = status[s.id];
              const isSel = selected.has(s.id);
              return (
                <li
                  key={s.id}
                  className={cn(
                    "px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap transition-colors",
                    isSel && "bg-primary/5",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleSelect(s.id)}
                    className="h-4 w-4 rounded border-input shrink-0"
                    aria-label={`Select ${s.name}`}
                  />
                  <Avatar name={s.name} seed={s.id} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.id} · {s.grade}
                    </div>
                  </div>

                  {/* Status segmented */}
                  <div className="inline-flex rounded-md border overflow-hidden shrink-0">
                    {(["Present", "Late", "Absent"] as const).map((opt) => {
                      const active = v === opt;
                      const cls =
                        opt === "Present"
                          ? active
                            ? "bg-success text-white"
                            : "text-success"
                          : opt === "Late"
                            ? active
                              ? "bg-warning text-warning-foreground"
                              : "text-warning-foreground"
                            : active
                              ? "bg-destructive text-white"
                              : "text-destructive";
                      return (
                        <button
                          key={opt}
                          onClick={() => setOne(s.id, opt)}
                          className={cn(
                            "h-9 w-9 sm:w-12 text-xs font-bold border-l first:border-l-0 transition-colors",
                            !active && "hover:bg-muted",
                            cls,
                          )}
                          title={opt}
                          aria-pressed={active}
                          aria-label={`${s.name} ${opt}`}
                        >
                          {opt[0]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline reason (only for non-present) */}
                  {(v === "Late" || v === "Absent") && (
                    <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs">
                      <input
                        value={note[s.id] ?? ""}
                        onChange={(e) =>
                          setNote((n) => ({ ...n, [s.id]: e.target.value }))
                        }
                        placeholder={v === "Late" ? "Late reason…" : "Absence reason…"}
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Sticky publish bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:left-64 bg-card border-t shadow-elegant">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3 flex items-center justify-between gap-3">
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">{batch || "—"}</span>
            <span className="text-muted-foreground">
              {" · "}
              {date} · {roster.length} students
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] text-success">
                <Check className="h-3 w-3" /> {counters.Present}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-warning-foreground">
                <Clock className="h-3 w-3" /> {counters.Late}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                <X className="h-3 w-3" /> {counters.Absent}
              </span>
            </div>
          </div>
          <Button onClick={publish} disabled={roster.length === 0}>
            <Save className="h-4 w-4" />
            Publish attendance
          </Button>
        </div>
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "destructive" | "muted";
}) {
  const tones: Record<string, string> = {
    success: "from-success/15 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-warning-foreground",
    destructive: "from-destructive/15 to-destructive/0 text-destructive",
    muted: "from-muted to-transparent text-muted-foreground",
  };
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 relative overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-70 pointer-events-none",
          tones[tone],
        )}
      />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </div>
        <div className="text-2xl font-bold mt-0.5">{value}</div>
      </div>
    </div>
  );
}
