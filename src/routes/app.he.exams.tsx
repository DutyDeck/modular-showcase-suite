import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  DoorOpen,
  Pencil,
  Plus,
  Printer,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  Wand2,
  XCircle,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  Button,
  FormDialog,
  Field,
  TextInput,
  NumberInput,
  Select,
} from "@/components/ui-kit";
import { PackContextBar, PackEmpty, StatusPill, Tabs, useTab } from "@/components/packs/PackUI";
import { useHeData, fmtDate } from "@/components/packs/HeDash";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import { TENANT_STAFF } from "@/lib/packs/opsData";
import { notify, logChange } from "@/lib/packs/sis/activity";
import {
  EXAM_SERIES,
  allRoomIds,
  autoAssignInvigilators,
  candidateCount,
  checkSeries,
  checkSitting,
  dutyLoad,
  endFor,
  examSeats,
  extraFor,
  fmtExamDay,
  mainRoomIds,
  requiredInvigilators,
  seatsFor,
  suggestRoom,
  suggestSlot,
  type ExamCheckContext,
  type ExamIssue,
  type ExamSitting,
  type InvigilatorProfile,
  type SpecialArrangement,
} from "@/lib/packs/sis/exams";

export const Route = createFileRoute("/app/he/exams")({
  head: () => ({ meta: [{ title: "Exams — 1StudentID" }] }),
  component: ExamsPage,
});

/* ── Data ────────────────────────────────────────────────────────────────── */

function useExamData() {
  const d = useHeData();
  const sittingsAll = useCollection("examSittings");
  const profilesAll = useCollection("invigilatorProfiles");
  const roomsAll = useCollection("rooms");
  return useMemo(() => {
    const t = d.tenantId;
    const sittings = sittingsAll.filter((s) => s.tenantId === t);
    const profiles = profilesAll.filter((p) => p.tenantId === t);
    const rooms = roomsAll.filter((r) => r.tenantId === t);
    const regIndex = new Map<string, string[]>();
    const pending = new Map<string, number>();
    for (const r of d.regs) {
      if (r.academicYear !== d.academicYear) continue;
      if (r.status === "Registered")
        regIndex.set(r.moduleId, [...(regIndex.get(r.moduleId) ?? []), r.studentId]);
      if (r.status === "Pending approval")
        pending.set(r.moduleId, (pending.get(r.moduleId) ?? 0) + 1);
    }
    const learnerById = new Map(d.learners.map((l) => [l.id, l]));
    const candidatesOf = (s: ExamSitting) =>
      Array.from(new Set([...(regIndex.get(s.moduleId) ?? []), ...(s.resitCandidates ?? [])]));
    const codeOf = (id: string) => d.moduleById(id)?.code ?? id;
    const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;
    const check: ExamCheckContext = {
      sittings,
      candidatesOf,
      rooms,
      profiles,
      leaderOf: (id) => d.moduleById(id)?.leader,
      nameOf: (id) => learnerById.get(id)?.name ?? id,
      supportPlanOf: (id) => learnerById.get(id)?.supportPlan,
      codeOf,
    };
    const seriesNames = Array.from(
      new Set([
        ...EXAM_SERIES.filter((s) => s.tenantId === t).map((s) => s.name),
        ...sittings.map((s) => s.series),
      ]),
    );
    const seriesInfo = (name: string) => {
      const known = EXAM_SERIES.find((s) => s.tenantId === t && s.name === name);
      if (known) return known;
      const dates = sittings
        .filter((s) => s.series === name)
        .map((s) => s.date)
        .sort();
      return {
        tenantId: t,
        name,
        start: dates[0] ?? DEMO_TODAY,
        end: dates[dates.length - 1] ?? DEMO_TODAY,
        publishOn: "",
      };
    };
    const inSeries = (name: string) =>
      sittings
        .filter((s) => s.series === name)
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    return {
      d,
      sittings,
      profiles,
      rooms,
      learnerById,
      candidatesOf,
      pending,
      codeOf,
      roomName,
      check,
      seriesNames,
      seriesInfo,
      inSeries,
    };
  }, [d, sittingsAll, profilesAll, roomsAll]);
}

type ExamData = ReturnType<typeof useExamData>;

const timeRange = (s: ExamSitting, studentId?: string) => `${s.start}–${endFor(s, studentId)}`;

function countdown(date: string): string {
  const n = Math.round(
    (new Date(date + "T00:00:00Z").getTime() - new Date(DEMO_TODAY + "T00:00:00Z").getTime()) /
      86400000,
  );
  if (n < 0) return "Sat";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
}

/** The room a student sits in (their separate room if they have one). */
function roomFor(x: ExamData, s: ExamSitting, studentId: string): string {
  const own = s.specialArrangements?.find((a) => a.studentId === studentId)?.roomId;
  if (own) return x.roomName(own);
  return mainRoomIds(s).map(x.roomName).join(" / ") || "TBC";
}

function sittingLine(x: ExamData, s: ExamSitting, studentId?: string) {
  const m = x.d.moduleById(s.moduleId);
  const room = studentId ? roomFor(x, s, studentId) : allRoomIds(s).map(x.roomName).join(", ");
  return `${fmtExamDay(s.date)} ${timeRange(s, studentId)} · ${m?.code ?? ""} ${m?.title ?? s.title} · ${room}`;
}

/* ── Saving (shared by edit, move and auto-assign) ───────────────────────── */

function saveSitting(x: ExamData, next: ExamSitting, prev?: ExamSitting) {
  const by = x.d.ctx.user?.name ?? "System";
  if (!prev) {
    addItem("examSittings", next);
    return;
  }
  updateItem("examSittings", (r) => r.id === next.id, next);
  if (prev.status !== "Published") return;
  // Published: log what changed and tell the people affected.
  const fields: [keyof ExamSitting, (s: ExamSitting) => string][] = [
    ["date", (s) => s.date],
    ["start", (s) => s.start],
    ["durationMins", (s) => String(s.durationMins)],
    ["roomIds", (s) => s.roomIds.map(x.roomName).join(", ")],
    ["invigilators", (s) => s.invigilators.join(", ")],
  ];
  const changed = fields.filter(([, f]) => f(prev) !== f(next));
  if (!changed.length) return;
  for (const [field, f] of changed)
    logChange({
      tenantId: next.tenantId,
      entity: "examSitting",
      entityId: next.id,
      field: String(field),
      from: f(prev),
      to: f(next),
      by,
    });
  const code = x.codeOf(next.moduleId);
  const timeMoved = changed.some(([f]) => f !== "invigilators");
  if (timeMoved)
    for (const st of x.candidatesOf(next)) {
      const l = x.learnerById.get(st);
      notify({
        tenantId: next.tenantId,
        channel: "App",
        to: l ? `${l.name} (${l.email})` : st,
        subject: `Exam changed: ${code}`,
        body: `Now ${sittingLine(x, next, st)}`,
        source: "Exams · timetable",
        relatedId: next.id,
      });
    }
  for (const name of new Set([...prev.invigilators, ...next.invigilators]))
    notify({
      tenantId: next.tenantId,
      channel: "Email",
      to: name,
      subject: next.invigilators.includes(name)
        ? `Invigilation updated: ${code}`
        : `Invigilation cancelled: ${code}`,
      body: sittingLine(x, next),
      source: "Exams · invigilation",
      relatedId: next.id,
    });
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function ExamsPage() {
  const x = useExamData();
  const role = x.d.ctx.user?.role;
  const [printFor, setPrintFor] = useState<{
    studentId: string;
    series: string;
    draft: boolean;
  } | null>(null);

  if (printFor) return <PrintTimetable x={x} {...printFor} onBack={() => setPrintFor(null)} />;

  const title =
    role === "student"
      ? "My Exams"
      : role === "teacher"
        ? "Exams & Invigilation"
        : "Exam Timetable";
  const subtitle =
    role === "student"
      ? "Your exam dates, rooms and any arrangements."
      : role === "teacher"
        ? "Your invigilation duties and the exams for your modules."
        : "Plan sittings, check clashes and capacity, assign invigilators, then publish.";
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <PackContextBar pack="higher-ed" />
      {x.d.modules.length === 0 ? (
        <PackEmpty
          pack="higher-ed"
          title="No modules yet"
          body="Exams are scheduled per module. Set up programmes and modules first."
        />
      ) : role === "admin" ? (
        <AdminExams
          x={x}
          onPrint={(studentId, series) => setPrintFor({ studentId, series, draft: true })}
        />
      ) : role === "teacher" ? (
        <TeacherExams x={x} />
      ) : role === "student" ? (
        <StudentExams
          x={x}
          onPrint={(studentId, series) => setPrintFor({ studentId, series, draft: false })}
        />
      ) : (
        <div className="text-sm text-muted-foreground">Exams are shown to students and staff.</div>
      )}
    </div>
  );
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

function IssueList({ issues, max }: { issues: ExamIssue[]; max?: number }) {
  if (!issues.length)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> OK
      </span>
    );
  const shown = max ? issues.slice(0, max) : issues;
  return (
    <ul className="space-y-1">
      {shown.map((i, n) => (
        <li
          key={n}
          className={`flex items-start gap-1.5 text-xs ${i.level === "error" ? "text-destructive" : "text-warning-foreground"}`}
        >
          {i.level === "error" ? (
            <XCircle className="h-3.5 w-3.5 mt-px shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
          )}
          <span>{i.text}</span>
        </li>
      ))}
      {max && issues.length > max && (
        <li className="text-[11px] text-muted-foreground">+{issues.length - max} more</li>
      )}
    </ul>
  );
}

type AdminTab = "sittings" | "checks" | "invigilators" | "students";

function AdminExams({
  x,
  onPrint,
}: {
  x: ExamData;
  onPrint: (studentId: string, series: string) => void;
}) {
  const [series, setSeries] = useState(
    () =>
      x.seriesNames.find((n) => x.inSeries(n).some((s) => s.status === "Draft")) ??
      x.seriesNames[0] ??
      "",
  );
  const [tab, setTab] = useTab<AdminTab>("sittings");
  const [editing, setEditing] = useState<ExamSitting | "new" | null>(null);
  const list = x.inSeries(series);
  const info = x.seriesInfo(series);
  const issues = checkSeries(list, x.check);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const drafts = list.filter((s) => s.status === "Draft");
  const entries = list.reduce((a, s) => a + candidateCount(s, x.check), 0);
  const by = x.d.ctx.user?.name ?? "Registrar";

  const autoAssign = () => {
    const res = autoAssignInvigilators(list, x.check);
    let changed = 0;
    for (const s of list) {
      const next = res.get(s.id) ?? s.invigilators;
      if (next.join("|") === s.invigilators.join("|")) continue;
      saveSitting(x, { ...s, invigilators: next }, s);
      changed++;
    }
    const short = list.filter(
      (s) => (res.get(s.id)?.length ?? 0) < requiredInvigilators(s, x.check),
    ).length;
    if (changed)
      toast.success(`Invigilators updated on ${changed} sitting${changed > 1 ? "s" : ""}`);
    else toast("No changes needed");
    if (short)
      toast.warning(`${short} sitting${short > 1 ? "s" : ""} still short — not enough free staff`);
  };

  const publish = () => {
    if (errors.length) {
      toast.error(`Fix ${errors.length} error${errors.length > 1 ? "s" : ""} before publishing`);
      setTab("checks");
      return;
    }
    if (!drafts.length) {
      toast("Everything in this series is already published");
      return;
    }
    const now = new Date().toISOString();
    for (const s of drafts) {
      updateItem("examSittings", (r) => r.id === s.id, { status: "Published", publishedAt: now });
      logChange({
        tenantId: s.tenantId,
        entity: "examSitting",
        entityId: s.id,
        field: "status",
        from: "Draft",
        to: "Published",
        by,
        reason: series,
      });
    }
    const byInv = new Map<string, ExamSitting[]>();
    const byStudent = new Map<string, ExamSitting[]>();
    for (const s of list) {
      for (const n of s.invigilators) byInv.set(n, [...(byInv.get(n) ?? []), s]);
      for (const st of x.candidatesOf(s)) byStudent.set(st, [...(byStudent.get(st) ?? []), s]);
    }
    for (const [name, duties] of byInv) {
      const lines = duties.map((s) => {
        const co = s.invigilators.filter((n) => n !== name);
        return `${sittingLine(x, s)}${co.length ? ` · with ${co.join(", ")}` : ""}`;
      });
      notify({
        tenantId: x.d.tenantId,
        channel: "Email",
        to: name,
        subject: `Your invigilation duties — ${series}`,
        body: lines.join("\n"),
        source: "Exams · invigilation",
        relatedId: duties[0].id,
      });
    }
    for (const [st, mine] of byStudent) {
      const l = x.learnerById.get(st);
      const body = mine
        .map((s) => {
          const a = s.specialArrangements?.find((r) => r.studentId === st);
          return `${sittingLine(x, s, st)}${a ? ` · ${a.note}` : ""}`;
        })
        .join("\n");
      for (const channel of ["App", "Email"] as const)
        notify({
          tenantId: x.d.tenantId,
          channel,
          to: l ? `${l.name} (${l.email})` : st,
          subject: `Your exam timetable — ${series}`,
          body,
          source: "Exams · timetable",
          relatedId: mine[0].id,
        });
    }
    toast.success(
      `${series} published — ${byInv.size} invigilators and ${byStudent.size} students notified`,
    );
  };

  const move = (s: ExamSitting, slot: { date: string; start: string }) => {
    saveSitting(x, { ...s, ...slot }, s);
    toast.success(`${x.codeOf(s.moduleId)} moved to ${fmtExamDay(slot.date)} ${slot.start}`);
  };

  const addRoom = (s: ExamSitting, roomId: string) => {
    saveSitting(x, { ...s, roomIds: [...s.roomIds, roomId] }, s);
    toast.success(`${x.roomName(roomId)} added to ${x.codeOf(s.moduleId)}`);
  };

  const remove = (s: ExamSitting) => {
    removeItem("examSittings", (r) => r.id === s.id);
    toast(`${s.title} removed`);
  };

  const students = Array.from(new Set(list.flatMap((s) => x.candidatesOf(s)))).sort((a, b) =>
    (x.learnerById.get(a)?.name ?? a).localeCompare(x.learnerById.get(b)?.name ?? b),
  );

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Exam series" className="w-64">
          <Select
            value={series}
            onChange={(e) => setSeries(e.target.value)}
            options={x.seriesNames.map((n) => ({ value: n, label: n }))}
          />
        </Field>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> New sitting
        </Button>
        <Button variant="outline" onClick={autoAssign} disabled={!drafts.length}>
          <Wand2 className="h-4 w-4" /> Auto-assign invigilators
        </Button>
        <Button onClick={publish} disabled={!drafts.length}>
          <Send className="h-4 w-4" /> Publish series
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Sittings"
          value={list.length}
          hint={
            drafts.length
              ? `${drafts.length} draft · ${fmtDate(info.start)} – ${fmtDate(info.end)}`
              : "All published"
          }
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Exam entries"
          value={entries}
          hint={`${students.length} students with a record`}
          icon={<Users className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Errors"
          value={errors.length}
          hint={errors.length ? "Block publishing" : "Ready to publish"}
          icon={<XCircle className="h-4 w-4" />}
          accent={errors.length ? "destructive" : "success"}
        />
        <StatCard
          label="Warnings"
          value={warnings.length}
          hint="Allowed — review before publishing"
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={warnings.length ? "warning" : "success"}
        />
      </div>

      {drafts.length > 0 && info.publishOn && (
        <p className="text-xs text-muted-foreground">
          Students are told this timetable is published on {fmtDate(info.publishOn)}.
        </p>
      )}

      <Tabs<AdminTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "sittings", label: "Sittings", count: list.length },
          { id: "checks", label: "Checks", count: issues.length },
          { id: "invigilators", label: "Invigilators", count: x.profiles.length },
          { id: "students", label: "Student timetables", count: students.length },
        ]}
      />

      {tab === "sittings" && (
        <Section title={series} description="Checks update as you edit.">
          <DataTable
            rows={list}
            emptyText="No sittings in this series yet"
            columns={[
              { key: "when", label: "When" },
              { key: "module", label: "Module" },
              { key: "rooms", label: "Rooms" },
              { key: "cands", label: "Candidates" },
              { key: "invig", label: "Invigilators" },
              { key: "checks", label: "Checks", className: "min-w-[220px]" },
              { key: "status", label: "Status" },
              { key: "_actions", label: "" },
            ]}
            renderCell={(s: ExamSitting, k) => {
              const m = x.d.moduleById(s.moduleId);
              const own = checkSitting(s, x.check);
              switch (k) {
                case "when":
                  return (
                    <div>
                      <div className="font-medium">{fmtExamDay(s.date)}</div>
                      <div className="text-xs text-muted-foreground">
                        {timeRange(s)} · {s.durationMins} min
                      </div>
                    </div>
                  );
                case "module":
                  return (
                    <div>
                      <div className="font-mono text-[11px] text-muted-foreground">{m?.code}</div>
                      <div className="font-medium">{m?.title ?? s.title}</div>
                      <div className="text-[11px] text-muted-foreground">Leader: {m?.leader}</div>
                    </div>
                  );
                case "rooms":
                  return (
                    <div className="text-xs space-y-0.5">
                      {mainRoomIds(s).map((r) => (
                        <div key={r}>{x.roomName(r)}</div>
                      ))}
                      {(s.specialArrangements ?? [])
                        .filter((a) => a.roomId)
                        .map((a) => (
                          <div key={a.studentId} className="text-muted-foreground">
                            {x.roomName(a.roomId!)} · {x.check.nameOf(a.studentId)}
                          </div>
                        ))}
                    </div>
                  );
                case "cands": {
                  const n = candidateCount(s, x.check);
                  const seats = seatsFor(s, x.check);
                  const p = x.pending.get(s.moduleId);
                  return (
                    <div className="text-xs">
                      <div className="font-medium text-sm">
                        {n}{" "}
                        <span className="text-muted-foreground font-normal">/ {seats} seats</span>
                      </div>
                      {!!s.otherCandidates && (
                        <div className="text-muted-foreground">incl. {s.otherCandidates} other</div>
                      )}
                      {!!s.resitCandidates?.length && (
                        <div className="text-muted-foreground">
                          incl. {s.resitCandidates.length} resit
                        </div>
                      )}
                      {!!p && <div className="text-warning-foreground">+{p} pending approval</div>}
                    </div>
                  );
                }
                case "invig": {
                  const need = requiredInvigilators(s, x.check);
                  return (
                    <div className="text-xs">
                      <div className="text-muted-foreground mb-0.5">
                        {s.invigilators.length}/{need}
                      </div>
                      {s.invigilators.map((n) => (
                        <div key={n}>{n}</div>
                      ))}
                    </div>
                  );
                }
                case "checks": {
                  const clash = own.some((i) => i.kind === "student");
                  const slot = clash ? suggestSlot(s, x.check, info) : null;
                  const room = suggestRoom(s, x.check);
                  return (
                    <div className="space-y-1.5">
                      <IssueList issues={own} max={4} />
                      {slot && (
                        <Button size="sm" variant="outline" onClick={() => move(s, slot)}>
                          Move to {fmtExamDay(slot.date)} {slot.start}
                        </Button>
                      )}
                      {room && (
                        <Button size="sm" variant="outline" onClick={() => addRoom(s, room.id)}>
                          Add {room.name} ({examSeats(room)} seats)
                        </Button>
                      )}
                    </div>
                  );
                }
                case "status":
                  return <StatusPill status={s.status} />;
                case "_actions":
                  return (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(s)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {s.status === "Draft" && (
                        <Button size="sm" variant="ghost" onClick={() => remove(s)} title="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
              }
              return null;
            }}
          />
        </Section>
      )}

      {tab === "checks" && (
        <ChecksPanel
          x={x}
          list={list}
          issues={issues}
          info={info}
          onMove={move}
          onAddRoom={addRoom}
        />
      )}

      {tab === "invigilators" && <InvigilatorsPanel x={x} list={list} />}

      {tab === "students" && (
        <Section title="Student timetables" description="One page per student, ready to print.">
          <DataTable
            rows={students.map((id) => ({ id }))}
            emptyText="No students entered"
            columns={[
              { key: "name", label: "Student" },
              { key: "exams", label: "Exams" },
              { key: "arr", label: "Arrangements" },
              { key: "flags", label: "Checks" },
              { key: "_actions", label: "" },
            ]}
            renderCell={(r: { id: string }, k) => {
              const l = x.learnerById.get(r.id);
              const mine = list.filter((s) => x.candidatesOf(s).includes(r.id));
              const clash = issues.some((i) => i.kind === "student" && i.students?.includes(r.id));
              const arr = mine
                .map((s) => s.specialArrangements?.find((a) => a.studentId === r.id))
                .find(Boolean);
              switch (k) {
                case "name":
                  return (
                    <div>
                      <div className="font-medium">{l?.name ?? r.id}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{r.id}</div>
                    </div>
                  );
                case "exams":
                  return mine.map((s) => x.codeOf(s.moduleId)).join(", ");
                case "arr":
                  return arr ? (
                    <span className="text-xs">{arr.note}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  );
                case "flags":
                  return clash ? (
                    <Badge tone="destructive">Clash</Badge>
                  ) : (
                    <Badge tone="success">OK</Badge>
                  );
                case "_actions":
                  return (
                    <Button size="sm" variant="outline" onClick={() => onPrint(r.id, series)}>
                      <Printer className="h-3.5 w-3.5" /> Timetable
                    </Button>
                  );
              }
              return null;
            }}
          />
        </Section>
      )}

      {editing && (
        <SittingDialog
          x={x}
          series={series}
          sitting={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ChecksPanel({
  x,
  list,
  issues,
  info,
  onMove,
  onAddRoom,
}: {
  x: ExamData;
  list: ExamSitting[];
  issues: ExamIssue[];
  info: { start: string; end: string };
  onMove: (s: ExamSitting, slot: { date: string; start: string }) => void;
  onAddRoom: (s: ExamSitting, roomId: string) => void;
}) {
  const groups: { kind: ExamIssue["kind"][]; title: string; icon: typeof Users }[] = [
    { kind: ["capacity", "candidates"], title: "Capacity", icon: Users },
    { kind: ["room"], title: "Room double-booking", icon: DoorOpen },
    { kind: ["student"], title: "Student clashes", icon: Clock },
    { kind: ["invigilator"], title: "Invigilators", icon: ShieldCheck },
    { kind: ["arrangement"], title: "Special arrangements", icon: CheckCircle2 },
  ];
  const label = (id: string) => {
    const s = list.find((r) => r.id === id);
    return s ? `${x.codeOf(s.moduleId)} · ${fmtExamDay(s.date)} ${s.start}` : "Series";
  };
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {groups.map((g) => {
        const rows = issues.filter((i) => g.kind.includes(i.kind));
        const errs = rows.filter((i) => i.level === "error").length;
        return (
          <Section
            key={g.title}
            title={
              <span className="flex items-center gap-2">
                <g.icon className="h-4 w-4" /> {g.title}
                {errs ? (
                  <Badge tone="destructive">
                    {errs} error{errs > 1 ? "s" : ""}
                  </Badge>
                ) : rows.length ? (
                  <Badge tone="warning">
                    {rows.length} warning{rows.length > 1 ? "s" : ""}
                  </Badge>
                ) : (
                  <Badge tone="success">Clear</Badge>
                )}
              </span>
            }
          >
            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nothing to fix.</div>
            ) : (
              <ul className="space-y-2">
                {rows.map((i, n) => {
                  const s = list.find((r) => r.id === i.sittingId);
                  const slot = s && i.kind === "student" ? suggestSlot(s, x.check, info) : null;
                  const room =
                    s && i.kind === "capacity" && i.text.includes("short by")
                      ? suggestRoom(s, x.check)
                      : null;
                  return (
                    <li key={n} className="rounded-md border p-2.5">
                      <div className="text-[11px] font-medium text-muted-foreground mb-1">
                        {label(i.sittingId)}
                      </div>
                      <IssueList issues={[i]} />
                      {s && slot && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            Free slot for all its candidates: {fmtExamDay(slot.date)} {slot.start}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => onMove(s, slot)}>
                            Move
                          </Button>
                        </div>
                      )}
                      {s && room && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            Free at that time: {room.name} ({examSeats(room)} seats)
                          </span>
                          <Button size="sm" variant="outline" onClick={() => onAddRoom(s, room.id)}>
                            Add room
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        );
      })}
    </div>
  );
}

function InvigilatorsPanel({ x, list }: { x: ExamData; list: ExamSitting[] }) {
  const [edit, setEdit] = useState<InvigilatorProfile | null>(null);
  const load = dutyLoad(list);
  const staff = TENANT_STAFF[x.d.tenantId] ?? [];
  const missing = staff.filter((s) => !x.profiles.some((p) => p.staffName === s.name));
  const add = (name: string) => {
    addItem("invigilatorProfiles", {
      id: nextId("INV-", "invigilatorProfiles"),
      tenantId: x.d.tenantId,
      staffName: name,
      unavailable: [],
      maxDuties: 3,
    });
    toast.success(`${name} added to the invigilator pool`);
  };
  return (
    <Section
      title="Invigilator pool"
      description="Duties are counted for the selected series."
      actions={missing.map((s) => (
        <Button key={s.name} size="sm" variant="outline" onClick={() => add(s.name)}>
          <Plus className="h-3.5 w-3.5" /> {s.name}
        </Button>
      ))}
    >
      <DataTable
        rows={x.profiles}
        emptyText="No invigilators yet"
        columns={[
          { key: "name", label: "Name" },
          { key: "duties", label: "Duties" },
          { key: "when", label: "Assigned" },
          { key: "away", label: "Unavailable" },
          { key: "_actions", label: "" },
        ]}
        renderCell={(p: InvigilatorProfile, k) => {
          const n = load.get(p.staffName) ?? 0;
          switch (k) {
            case "name":
              return (
                <div>
                  <div className="font-medium">{p.staffName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {staff.find((s) => s.name === p.staffName)?.role}
                  </div>
                </div>
              );
            case "duties":
              return (
                <Badge
                  tone={n > p.maxDuties ? "destructive" : n === p.maxDuties ? "warning" : "muted"}
                >
                  {n} / {p.maxDuties}
                </Badge>
              );
            case "when":
              return (
                <div className="text-xs">
                  {list
                    .filter((s) => s.invigilators.includes(p.staffName))
                    .map((s) => `${fmtExamDay(s.date)} ${x.codeOf(s.moduleId)}`)
                    .join(" · ") || "—"}
                </div>
              );
            case "away":
              return (
                <div className="flex flex-wrap gap-1">
                  {p.unavailable.length
                    ? p.unavailable.map((d) => (
                        <Badge key={d} tone="muted">
                          {fmtExamDay(d)}
                        </Badge>
                      ))
                    : "—"}
                </div>
              );
            case "_actions":
              return (
                <Button size="sm" variant="ghost" onClick={() => setEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              );
          }
          return null;
        }}
      />
      {edit && <ProfileDialog profile={edit} onClose={() => setEdit(null)} />}
    </Section>
  );
}

function ProfileDialog({ profile, onClose }: { profile: InvigilatorProfile; onClose: () => void }) {
  const [max, setMax] = useState(profile.maxDuties);
  const [away, setAway] = useState(profile.unavailable.join(", "));
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={profile.staffName}
      description="Availability and duty cap for exam series."
      onSubmit={() => {
        const unavailable = away
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
          .sort();
        updateItem("invigilatorProfiles", (p) => p.id === profile.id, {
          maxDuties: Math.max(0, max),
          unavailable,
        });
        toast.success("Saved");
        onClose();
      }}
    >
      <Field label="Max duties per series">
        <NumberInput min={0} value={max} onChange={(e) => setMax(Number(e.target.value))} />
      </Field>
      <Field label="Unavailable dates" hint="YYYY-MM-DD, comma separated">
        <TextInput value={away} onChange={(e) => setAway(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

/* ── Create / edit sitting ───────────────────────────────────────────────── */

function Chip({
  on,
  onClick,
  children,
  tone,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-xs text-left transition-colors ${
        on
          ? "border-primary bg-primary/10 text-primary"
          : tone === "warn"
            ? "border-dashed text-muted-foreground hover:bg-muted"
            : "hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function SittingDialog({
  x,
  series,
  sitting,
  onClose,
}: {
  x: ExamData;
  series: string;
  sitting?: ExamSitting;
  onClose: () => void;
}) {
  const info = x.seriesInfo(series);
  const examModules = x.d.modules.filter((m) => m.components.some((c) => c.type === "Exam"));
  const otherModules = x.d.modules.filter((m) => !examModules.includes(m));
  const [f, setF] = useState<ExamSitting>(
    () =>
      sitting ?? {
        id: "NEW",
        tenantId: x.d.tenantId,
        series,
        moduleId: examModules[0]?.id ?? x.d.modules[0]?.id ?? "",
        title: `${(examModules[0] ?? x.d.modules[0])?.code ?? ""} — Examination`,
        date: info.start,
        start: "09:30",
        durationMins: 120,
        roomIds: [],
        invigilators: [],
        status: "Draft",
        specialArrangements: [],
      },
  );
  const set = (p: Partial<ExamSitting>) => setF((c) => ({ ...c, ...p }));
  const arr = f.specialArrangements ?? [];
  const setArr = (next: SpecialArrangement[]) => set({ specialArrangements: next });
  const cands = x.candidatesOf(f);
  const live = checkSitting(f, x.check);
  const load = dutyLoad(x.inSeries(f.series).filter((s) => s.id !== f.id));
  const leader = x.d.moduleById(f.moduleId)?.leader;
  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((r) => r !== v) : [...list, v];
  const withPlan = cands.filter(
    (st) => x.learnerById.get(st)?.supportPlan && !arr.some((a) => a.studentId === st),
  );

  const submit = () => {
    if (!f.moduleId || !f.date || !f.start || f.durationMins <= 0) {
      toast.error("Module, date, start and duration are required");
      return;
    }
    if (sitting) {
      saveSitting(x, f, sitting);
      toast.success(
        sitting.status === "Published" ? "Saved — people affected have been notified" : "Saved",
      );
    } else {
      saveSitting(x, { ...f, id: nextId("EX-", "examSittings") });
      toast.success(`${f.title} added`);
    }
    onClose();
  };

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={sitting ? `Edit ${x.codeOf(sitting.moduleId)} sitting` : "New sitting"}
      description={
        sitting?.status === "Published"
          ? "Published — changes are logged and candidates/invigilators notified."
          : undefined
      }
      onSubmit={submit}
      submitLabel={sitting ? "Save" : "Add sitting"}
    >
      <Field label="Series" className="sm:col-span-2">
        <TextInput
          list="exam-series"
          value={f.series}
          onChange={(e) => set({ series: e.target.value })}
        />
        <datalist id="exam-series">
          {x.seriesNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </Field>
      <Field label="Module" required className="sm:col-span-2">
        <Select
          value={f.moduleId}
          onChange={(e) => {
            const m = x.d.moduleById(e.target.value);
            set({ moduleId: e.target.value, title: `${m?.code ?? ""} — Examination` });
          }}
          options={[...examModules, ...otherModules].map((m) => ({
            value: m.id,
            label: `${m.code} ${m.title}${examModules.includes(m) ? "" : " (no exam component)"}`,
          }))}
        />
      </Field>
      <Field label="Paper title" className="sm:col-span-2">
        <TextInput value={f.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Date" required>
        <TextInput type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
      </Field>
      <Field label="Start" required>
        <TextInput type="time" value={f.start} onChange={(e) => set({ start: e.target.value })} />
      </Field>
      <Field label="Duration (minutes)" required>
        <NumberInput
          min={15}
          step={15}
          value={f.durationMins}
          onChange={(e) => set({ durationMins: Number(e.target.value) })}
        />
      </Field>
      <Field label="Other candidates" hint="Entries with no student record here">
        <NumberInput
          min={0}
          value={f.otherCandidates ?? 0}
          onChange={(e) => set({ otherCandidates: Number(e.target.value) || undefined })}
        />
      </Field>

      <div className="sm:col-span-2 space-y-1.5">
        <div className="text-xs font-medium">
          Rooms{" "}
          <span className="text-muted-foreground font-normal">
            · {candidateCount(f, x.check)} candidates, {seatsFor(f, x.check)} exam seats chosen
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {x.rooms.map((r) => (
            <Chip
              key={r.id}
              on={f.roomIds.includes(r.id)}
              onClick={() => set({ roomIds: toggle(f.roomIds, r.id) })}
            >
              {r.name} · {examSeats(r)} seats
            </Chip>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 space-y-1.5">
        <div className="text-xs font-medium">
          Invigilators{" "}
          <span className="text-muted-foreground font-normal">
            · {requiredInvigilators(f, x.check)} needed
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {x.profiles.map((p) => {
            const away = p.unavailable.includes(f.date);
            const n = load.get(p.staffName) ?? 0;
            return (
              <Chip
                key={p.id}
                on={f.invigilators.includes(p.staffName)}
                tone={away || n >= p.maxDuties ? "warn" : undefined}
                onClick={() => set({ invigilators: toggle(f.invigilators, p.staffName) })}
              >
                {p.staffName}
                <span className="text-muted-foreground">
                  {" "}
                  · {n}/{p.maxDuties}
                  {away ? " · away" : ""}
                  {p.staffName === leader ? " · leader" : ""}
                </span>
              </Chip>
            );
          })}
        </div>
      </div>

      <div className="sm:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium">Special arrangements</div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!cands.length}
            onClick={() =>
              setArr([
                ...arr,
                {
                  studentId: withPlan[0] ?? cands[0],
                  note: "25% extra time",
                  extraMins: Math.round(f.durationMins / 4),
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        {withPlan.map((st) => (
          <div key={st} className="text-[11px] text-warning-foreground">
            {x.check.nameOf(st)} has a support plan: {x.learnerById.get(st)?.supportPlan}
          </div>
        ))}
        {arr.map((a, i) => {
          const patch = (p: Partial<SpecialArrangement>) =>
            setArr(arr.map((r, j) => (j === i ? { ...r, ...p } : r)));
          return (
            <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
              <Select
                className="col-span-4 h-8 text-xs"
                value={a.studentId}
                onChange={(e) => patch({ studentId: e.target.value })}
                options={Array.from(new Set([...cands, a.studentId])).map((st) => ({
                  value: st,
                  label: x.check.nameOf(st),
                }))}
              />
              <TextInput
                className="col-span-4 h-8 text-xs"
                value={a.note}
                onChange={(e) => patch({ note: e.target.value })}
              />
              <NumberInput
                className="col-span-1 h-8 text-xs px-1"
                title="Extra minutes"
                value={a.extraMins ?? 0}
                onChange={(e) => patch({ extraMins: Number(e.target.value) || undefined })}
              />
              <Select
                className="col-span-2 h-8 text-xs"
                value={a.roomId ?? ""}
                onChange={(e) => patch({ roomId: e.target.value || undefined })}
                options={[
                  { value: "", label: "Main room" },
                  ...x.rooms.map((r) => ({ value: r.id, label: r.name })),
                ]}
              />
              <button
                type="button"
                className="col-span-1 text-muted-foreground hover:text-destructive justify-self-center"
                onClick={() => setArr(arr.filter((_, j) => j !== i))}
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {arr.length > 0 && (
          <div className="text-[11px] text-muted-foreground">
            Student · arrangement · extra minutes · room (a separate room needs its own room)
          </div>
        )}
      </div>

      <div className="sm:col-span-2 rounded-md border bg-muted/30 p-2.5">
        <div className="text-xs font-medium mb-1.5">Live checks</div>
        <IssueList issues={live} />
      </div>
    </FormDialog>
  );
}

/* ── Teacher ─────────────────────────────────────────────────────────────── */

function TeacherExams({ x }: { x: ExamData }) {
  const me = x.d.ctx.user?.name ?? "";
  const duties = x.sittings
    .filter((s) => s.invigilators.includes(me))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const myModuleIds = x.d.myModules.map((m) => m.id);
  const mine = x.sittings
    .filter((s) => myModuleIds.includes(s.moduleId))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const next = duties.find((s) => s.date >= DEMO_TODAY);
  const profile = x.profiles.find((p) => p.staffName === me);
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Invigilation duties"
          value={duties.length}
          hint={profile ? `Cap ${profile.maxDuties} per series` : undefined}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Next duty"
          value={next ? fmtExamDay(next.date) : "—"}
          hint={next ? `${next.start} · ${x.codeOf(next.moduleId)}` : "None scheduled"}
          icon={<CalendarClock className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="My modules' exams"
          value={mine.length}
          hint={`${mine.filter((s) => s.status === "Published").length} published`}
          icon={<Users className="h-4 w-4" />}
          accent="success"
        />
      </div>

      <Section
        title="My invigilation duties"
        description="Draft duties may still change until the series is published."
      >
        <DataTable
          rows={duties}
          emptyText="No invigilation duties"
          columns={[
            { key: "when", label: "Date" },
            { key: "time", label: "Time" },
            { key: "room", label: "Room" },
            { key: "module", label: "Module" },
            { key: "co", label: "With" },
            { key: "status", label: "Status" },
          ]}
          renderCell={(s: ExamSitting, k) => {
            switch (k) {
              case "when":
                return <span className="font-medium">{fmtExamDay(s.date)}</span>;
              case "time":
                return timeRange(s);
              case "room":
                return allRoomIds(s).map(x.roomName).join(", ");
              case "module":
                return `${x.codeOf(s.moduleId)} ${x.d.moduleById(s.moduleId)?.title ?? ""}`;
              case "co":
                return s.invigilators.filter((n) => n !== me).join(", ") || "—";
              case "status":
                return <StatusPill status={s.status} />;
            }
            return null;
          }}
        />
      </Section>

      <Section title="Exams for my modules">
        <DataTable
          rows={mine}
          emptyText="None of your modules has an exam sitting"
          columns={[
            { key: "module", label: "Module" },
            { key: "when", label: "When" },
            { key: "room", label: "Rooms" },
            { key: "cands", label: "Candidates" },
            { key: "arr", label: "Arrangements" },
            { key: "status", label: "Status" },
          ]}
          renderCell={(s: ExamSitting, k) => {
            switch (k) {
              case "module":
                return (
                  <div>
                    <div className="font-medium">{x.codeOf(s.moduleId)}</div>
                    <div className="text-[11px] text-muted-foreground">{s.series}</div>
                  </div>
                );
              case "when":
                return `${fmtExamDay(s.date)} ${timeRange(s)}`;
              case "room":
                return allRoomIds(s).map(x.roomName).join(", ");
              case "cands":
                return candidateCount(s, x.check);
              case "arr":
                return (s.specialArrangements ?? []).length
                  ? (s.specialArrangements ?? [])
                      .map((a) => `${x.check.nameOf(a.studentId)}: +${a.extraMins ?? 0} min`)
                      .join("; ")
                  : "—";
              case "status":
                return <StatusPill status={s.status} />;
            }
            return null;
          }}
        />
      </Section>
    </>
  );
}

/* ── Student ─────────────────────────────────────────────────────────────── */

function StudentExams({
  x,
  onPrint,
}: {
  x: ExamData;
  onPrint: (studentId: string, series: string) => void;
}) {
  const me = x.d.me;
  if (!me)
    return (
      <div className="text-sm text-muted-foreground">
        No student record is linked to this account.
      </div>
    );
  const entered = x.sittings.filter((s) => x.candidatesOf(s).includes(me.id));
  const seriesList = Array.from(new Set(entered.map((s) => s.series)));
  if (!seriesList.length)
    return (
      <Section>
        <div className="text-sm text-muted-foreground">You have no exams scheduled.</div>
      </Section>
    );
  return (
    <>
      {seriesList.map((name) => {
        const info = x.seriesInfo(name);
        const published = entered
          .filter((s) => s.series === name && s.status === "Published")
          .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
        if (!published.length)
          return (
            <Section key={name} title={name}>
              <div className="flex items-center gap-3 text-sm">
                <CalendarClock className="h-5 w-5 text-muted-foreground shrink-0" />
                <span>
                  {info.publishOn && info.publishOn > DEMO_TODAY
                    ? `Your exam timetable is published on ${fmtDate(info.publishOn)}.`
                    : "Your exam timetable is being finalised and will be published soon."}
                </span>
              </div>
            </Section>
          );
        return (
          <Section
            key={name}
            title={name}
            description="Arrive 15 minutes early with your student ID card."
            actions={
              <Button size="sm" variant="outline" onClick={() => onPrint(me.id, name)}>
                <Printer className="h-3.5 w-3.5" /> Print timetable
              </Button>
            }
          >
            <div className="grid md:grid-cols-2 gap-3">
              {published.map((s) => {
                const m = x.d.moduleById(s.moduleId);
                const extra = extraFor(s, me.id);
                const a = s.specialArrangements?.find((r) => r.studentId === me.id);
                return (
                  <div key={s.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-[11px] text-muted-foreground">{m?.code}</div>
                        <div className="font-medium">{m?.title ?? s.title}</div>
                      </div>
                      <Badge tone={s.date === DEMO_TODAY ? "warning" : "info"}>
                        {countdown(s.date)}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div className="text-muted-foreground">Date</div>
                      <div>
                        {fmtExamDay(s.date)} {s.date.slice(0, 4)}
                      </div>
                      <div className="text-muted-foreground">Time</div>
                      <div>{timeRange(s, me.id)}</div>
                      <div className="text-muted-foreground">Duration</div>
                      <div>
                        {s.durationMins + extra} min
                        {extra ? ` (incl. ${extra} min extra)` : ""}
                      </div>
                      <div className="text-muted-foreground">Room</div>
                      <div>{roomFor(x, s, me.id)}</div>
                    </div>
                    {a && (
                      <div className="mt-2 text-xs rounded-md bg-info/10 text-info px-2 py-1">
                        {a.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })}
    </>
  );
}

/* ── Print view ──────────────────────────────────────────────────────────── */

function PrintTimetable({
  x,
  studentId,
  series,
  draft,
  onBack,
}: {
  x: ExamData;
  studentId: string;
  series: string;
  draft: boolean;
  onBack: () => void;
}) {
  const l = x.learnerById.get(studentId);
  const rows = x
    .inSeries(series)
    .filter((s) => x.candidatesOf(s).includes(studentId))
    .filter((s) => draft || s.status === "Published");
  const unpublished = rows.some((s) => s.status !== "Published");
  const programme = x.d.programmeById(l?.programmeId);
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>
      <div className="printable rounded-xl border bg-card p-6 sm:p-8 text-sm">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {x.d.ctx.tenantName}
            </div>
            <div className="text-xl font-bold mt-1">Exam timetable</div>
            <div className="text-muted-foreground">{series}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{l?.name ?? studentId}</div>
            <div className="font-mono text-xs">{studentId}</div>
            {programme && (
              <div className="text-xs text-muted-foreground">
                {programme.award} {programme.name}
              </div>
            )}
          </div>
        </div>
        {unpublished && (
          <div className="mt-3 rounded-md border border-warning bg-warning/10 px-3 py-1.5 text-xs font-medium">
            DRAFT — not yet published; times and rooms may change.
          </div>
        )}
        <table className="w-full mt-4 text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2">Time</th>
              <th className="py-2 pr-2">Module</th>
              <th className="py-2 pr-2">Room</th>
              <th className="py-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  No exams in this series.
                </td>
              </tr>
            )}
            {rows.map((s) => {
              const m = x.d.moduleById(s.moduleId);
              const extra = extraFor(s, studentId);
              const a = s.specialArrangements?.find((r) => r.studentId === studentId);
              return (
                <tr key={s.id} className="border-b align-top">
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {fmtExamDay(s.date)} {s.date.slice(0, 4)}
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">{timeRange(s, studentId)}</td>
                  <td className="py-2 pr-2">
                    <div className="font-medium">
                      {m?.code} {m?.title}
                    </div>
                    {a && <div className="text-xs text-muted-foreground">{a.note}</div>}
                  </td>
                  <td className="py-2 pr-2">{roomFor(x, s, studentId)}</td>
                  <td className="py-2 whitespace-nowrap">
                    {s.durationMins + extra} min{extra ? ` (+${extra})` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ul className="mt-5 text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
          <li>Arrive 15 minutes before the start. Bring your student ID card.</li>
          <li>Phones and smart watches go in your bag at the front of the room.</li>
          <li>
            If you are ill on the day, tell the Exams Office and apply for extenuating
            circumstances.
          </li>
        </ul>
        <div className="mt-4 text-[11px] text-muted-foreground">
          Printed {fmtDate(DEMO_TODAY)} · {x.d.ctx.tenantName}
        </div>
      </div>
    </div>
  );
}
