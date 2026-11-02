import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCheck,
  Fingerprint,
  Plane,
  QrCode,
  Save,
  ScanLine,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  DataTable,
  Field,
  TextInput,
  Select,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { PackContextBar, Tabs, VerifyNote } from "@/components/packs/PackUI";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import {
  codeSetById,
  type AttendanceCode,
  type AttendanceCodeSet,
  type AttendanceMeaning,
  type RegionProfile,
  visaRuleFor,
  type VisaScope,
} from "@/lib/packs/regions";
import {
  QR_ROTATE_SECONDS,
  QR_SESSION_MINUTES,
  hashString,
  qrCodeAt,
  qrCodeFor,
  qrIsLive,
  qrWindow,
  type QrSession,
} from "@/lib/packs/sis/teaching";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import {
  consecutiveMissed,
  summarise,
  weekdayOf,
  type RegisterMark,
  type TimetableSlot,
} from "@/lib/packs/opsData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/registers")({
  head: () => ({ meta: [{ title: "Attendance — 1StudentID" }] }),
  component: RegistersPage,
});

const MEANING_LABEL: Record<AttendanceMeaning, string> = {
  present: "Present",
  late: "Late (counts as present)",
  aea: "Approved activity (counts as present)",
  authorised: "Authorised absence",
  unauthorised: "Unauthorised absence",
  "not-required": "Not required / unable to attend",
  admin: "Administrative",
};

const MEANING_TONE: Record<AttendanceMeaning, string> = {
  present: "bg-success/15 text-success border-success/30",
  late: "bg-warning/20 text-warning-foreground border-warning/40",
  aea: "bg-info/15 text-info border-info/30",
  authorised: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  unauthorised: "bg-destructive/15 text-destructive border-destructive/30",
  "not-required": "bg-muted text-muted-foreground border-border",
  admin: "bg-muted text-muted-foreground border-border",
};

function CodeChip({ set, code }: { set: AttendanceCodeSet; code: string }) {
  const c = set.codes.find((x) => x.code === code);
  return (
    <span
      title={c ? `${c.label} — ${MEANING_LABEL[c.meaning]}` : code}
      className={cn(
        "inline-flex items-center justify-center min-w-7 px-1.5 h-6 rounded border text-[11px] font-mono font-semibold",
        c ? MEANING_TONE[c.meaning] : "bg-muted",
      )}
    >
      {code}
    </span>
  );
}

function RegistersPage() {
  const ctx = useTenantContext();
  const role = ctx.user?.role;
  if (role === "parent" || role === "student") return <LearnerAttendance />;
  return <StaffRegisters />;
}

function useRegisterData() {
  const ctx = useTenantContext();
  const set = codeSetById(ctx.profile?.codeSetId ?? "simple");
  const allMarks = useCollection("registerMarks");
  const marks = useMemo(
    () => allMarks.filter((m) => m.tenantId === ctx.tenantId),
    [allMarks, ctx.tenantId],
  );
  return { ctx, set, marks };
}

/* ── Staff (admin / teacher) ─────────────────────────────────────────────── */

function StaffRegisters() {
  const { ctx, set, marks } = useRegisterData();
  const learners = useScopedLearners().filter((l) => l.status === "Active");
  const sponsoredCount = learners.filter((l) => l.visa?.sponsored).length;
  const showVisa = !!ctx.profile?.visaSponsor && sponsoredCount > 0;
  const [tab, setTab] = useState<"take" | "reports" | "codes" | "visa">("take");

  const overall = summarise(marks, set);
  const todays = marks.filter((m) => m.date === DEMO_TODAY);
  const isSchool = ctx.type === "school";
  const persistent = learners.filter(
    (l) =>
      summarise(
        marks.filter((m) => m.studentId === l.id),
        set,
      ).pct < 90,
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        subtitle={`Registers use this institution's code set: ${set.name}.`}
      />
      <PackContextBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Attendance (period)"
          value={`${overall.pct}%`}
          accent={overall.pct >= 95 ? "success" : "warning"}
          icon={<CalendarCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Marks today"
          value={todays.length}
          hint={DEMO_TODAY}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard label="Unauthorised absences" value={overall.unauthorised} accent="destructive" />
        <StatCard
          label={isSchool ? "Persistent absence (<90%)" : "Below 90%"}
          value={persistent}
          accent={persistent ? "warning" : "success"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <Tabs
        tabs={[
          { id: "take", label: "Take register" },
          { id: "reports", label: "Reports" },
          { id: "codes", label: "Code set", count: set.codes.length },
          ...(showVisa
            ? [{ id: "visa" as const, label: "Visa-sponsor monitoring", count: sponsoredCount }]
            : []),
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "take" && (
        <>
          <TakeRegister set={set} marks={marks} learners={learners} />
          <QrHistory set={set} />
        </>
      )}
      {tab === "reports" && <Reports set={set} marks={marks} learners={learners} />}
      {tab === "codes" && <CodeLegend set={set} />}
      {tab === "visa" && showVisa && <VisaMonitoring set={set} marks={marks} learners={learners} />}
    </div>
  );
}

function TakeRegister({
  set,
  marks,
  learners,
}: {
  set: AttendanceCodeSet;
  marks: RegisterMark[];
  learners: Learner[];
}) {
  const ctx = useTenantContext();
  const me = ctx.user?.name ?? "";
  const allSlots = useCollection("timetableSlots");
  const slots = allSlots.filter((s) => s.tenantId === ctx.tenantId);
  const tutorGroups = useCollection("tutorGroups").filter((t) => t.tenantId === ctx.tenantId);
  const isSchool = ctx.type === "school";
  const [date, setDate] = useState(DEMO_TODAY);

  // School: tutor-group AM/PM registers. HE / college: timetabled contact points.
  const groups = [...new Set(learners.map((l) => l.group).filter(Boolean) as string[])].sort();
  const myTutorGroup = tutorGroups.find((t) => t.tutor === me)?.name;
  const [group, setGroup] = useState(myTutorGroup ?? groups[0] ?? "");
  const [session, setSession] = useState<"AM" | "PM">("AM");

  const daySlots = slots
    .filter(
      (s) => s.day === weekdayOf(date) && (ctx.user?.role !== "teacher" || s.teacherName === me),
    )
    .sort((a, b) => a.start.localeCompare(b.start));
  const [slotId, setSlotId] = useState("");
  const slot: TimetableSlot | undefined = daySlots.find((s) => s.id === slotId) ?? daySlots[0];

  // Attendance is only expected from a learner's start date — new entrants on a
  // later intake (or a rolling start next Monday) are not on earlier registers.
  const inGroup = isSchool
    ? learners.filter((l) => l.group === group)
    : slot
      ? learners.filter((l) => slot.cohorts?.includes(l.group ?? ""))
      : [];
  const roster = inGroup.filter((l) => !l.startDate || l.startDate <= date);
  const notStarted = inGroup.filter((l) => l.startDate && l.startDate > date);
  const regGroup = isSchool ? group : (slot?.groupLabel ?? "");
  const regSession = isSchool ? session : slot ? `${slot.day} ${slot.start}` : "";
  const key = `${date}|${regSession}|${regGroup}`;

  const existing = useMemo(() => {
    const m: Record<string, string> = {};
    for (const x of marks)
      if (x.date === date && x.session === regSession && x.groupLabel === regGroup)
        m[x.studentId] = x.code;
    return m;
  }, [marks, date, regSession, regGroup]);

  const [draft, setDraft] = useState<{ key: string; codes: Record<string, string> }>({
    key: "",
    codes: {},
  });
  const codes = draft.key === key ? draft.codes : existing;
  const setCode = (id: string, code: string) => setDraft({ key, codes: { ...codes, [id]: code } });

  const presentCode = set.codes.find((c) => c.meaning === "present")?.code ?? set.codes[0].code;
  const quick = (["present", "late", "authorised", "unauthorised"] as AttendanceMeaning[])
    .map((m) => set.codes.find((c) => c.meaning === m))
    .filter(Boolean) as AttendanceCode[];
  const saved = Object.keys(existing).length > 0;

  const save = () => {
    const missing = roster.filter((l) => !codes[l.id]);
    if (missing.length) {
      toast.error(`${missing.length} learner(s) still need a code`);
      return;
    }
    removeItem(
      "registerMarks",
      (m) =>
        m.tenantId === ctx.tenantId &&
        m.date === date &&
        m.session === regSession &&
        m.groupLabel === regGroup,
    );
    roster.forEach((l, i) =>
      addItem("registerMarks", {
        id: `RM-${Date.now().toString(36)}-${i}`,
        tenantId: ctx.tenantId,
        date,
        session: regSession,
        groupLabel: regGroup,
        studentId: l.id,
        code: codes[l.id],
        by: me,
      }),
    );
    const s = summarise(
      roster.map((l) => ({ code: codes[l.id] }) as RegisterMark),
      set,
    );
    toast.success(`Register saved — ${regGroup} ${regSession}`, {
      description: `${s.present}/${s.total} present · ${s.unauthorised} unauthorised`,
    });
  };

  /* QR check-in for this register (one open session per register). */
  const qrAll = useCollection("qrSessions");
  const [panelId, setPanelId] = useState<string | null>(null);
  const openQr = qrAll.find(
    (q) =>
      q.tenantId === ctx.tenantId &&
      !q.closed &&
      q.date === date &&
      q.session === regSession &&
      q.groupLabel === regGroup,
  );
  const canQr = !!regGroup && !!regSession && inGroup.length > 0;

  const newSession = (opener: string): QrSession => {
    const now = Date.now();
    const id = nextId("QR-", "qrSessions");
    return {
      id,
      tenantId: ctx.tenantId,
      groupLabel: regGroup,
      date,
      session: regSession,
      code: qrCodeFor({ id }, 0),
      openedBy: opener,
      openedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + QR_SESSION_MINUTES * 60_000).toISOString(),
      scans: [],
      slotId: isSchool ? undefined : slot?.id,
      cohorts: isSchool ? [group] : slot?.cohorts,
    };
  };

  const startQr = () => {
    if (openQr) {
      setPanelId(openQr.id);
      return;
    }
    const s = newSession(me);
    addItem("qrSessions", s);
    setPanelId(s.id);
  };

  // Biometric terminal: the terminal's export is posted as scans against this register.
  const importTerminalLog = () => {
    const base = openQr ?? newSession(me);
    if (!openQr) addItem("qrSessions", base);
    const already = new Set(base.scans.map((x) => x.studentId));
    const t0 = new Date(base.openedAt).getTime();
    const fresh = roster
      .filter((l) => !already.has(l.id) && hashString(`${l.id}|${date}|${regSession}`) % 5 !== 0)
      .map((l, i) => ({
        studentId: l.id,
        at: new Date(t0 - 6 * 60_000 + i * 37_000).toISOString(),
        via: "Biometric" as const,
      }));
    updateItem("qrSessions", (q) => q.id === base.id, { scans: [...base.scans, ...fresh] });
    toast.success(`Terminal log imported — ${fresh.length} scan(s)`, {
      description: "Close & save to write them to the register.",
    });
    setPanelId(base.id);
  };

  return (
    <Section
      title="Take register"
      description={
        isSchool
          ? "Morning and afternoon registration by tutor group."
          : "One register per timetabled contact point — these feed engagement and visa monitoring."
      }
      actions={
        <>
          {canQr && (
            <Button size="sm" variant="outline" onClick={startQr}>
              <QrCode className="h-3.5 w-3.5" />
              {openQr ? "Resume QR check-in" : "Start QR check-in"}
            </Button>
          )}
          {canQr && ctx.isAdmin && (
            <Button size="sm" variant="outline" onClick={importTerminalLog}>
              <Fingerprint className="h-3.5 w-3.5" /> Import terminal log
            </Button>
          )}
          {saved ? (
            <Badge tone="success">Saved — editing</Badge>
          ) : (
            <Badge tone="warning">Not yet taken</Badge>
          )}
        </>
      }
    >
      {openQr && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5">
            <ScanLine className="h-3.5 w-3.5 text-info" />
            QR check-in is open for this register — {openQr.scans.length} scanned.
          </span>
          <Button size="sm" variant="outline" onClick={() => setPanelId(openQr.id)}>
            Open panel
          </Button>
        </div>
      )}
      {panelId && <QrPanel id={panelId} set={set} onClose={() => setPanelId(null)} />}
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {isSchool ? (
          <>
            <Field label="Tutor group">
              <Select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                options={groups.map((g) => ({ value: g, label: g }))}
              />
            </Field>
            <Field label="Session">
              <Select
                value={session}
                onChange={(e) => setSession(e.target.value as "AM" | "PM")}
                options={[
                  { value: "AM", label: "AM registration" },
                  { value: "PM", label: "PM registration" },
                ]}
              />
            </Field>
          </>
        ) : (
          <Field label="Contact point" className="sm:col-span-2">
            <Select
              value={slot?.id ?? ""}
              onChange={(e) => setSlotId(e.target.value)}
              options={
                daySlots.length
                  ? daySlots.map((s) => ({
                      value: s.id,
                      label: `${s.start}–${s.end} · ${s.groupLabel} · ${s.subject}`,
                    }))
                  : [{ value: "", label: `Nothing timetabled on ${weekdayOf(date)}` }]
              }
            />
          </Field>
        )}
      </div>

      {roster.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No learners for this register.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground">
              {roster.length} learners
              {notStarted.length > 0 &&
                ` · ${notStarted.length} not started yet (${notStarted.map((l) => l.name).join(", ")})`}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft({
                  key,
                  codes: Object.fromEntries(roster.map((l) => [l.id, codes[l.id] ?? presentCode])),
                })
              }
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark rest {presentCode}
            </Button>
          </div>
          <ul className="divide-y rounded-lg border">
            {roster.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <Avatar name={l.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{l.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {l.id} · {l.level}
                    {l.visa?.sponsored && " · visa-sponsored"}
                    {l.supportPlan && " · support plan"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {quick.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCode(l.id, c.code)}
                      title={c.label}
                      className={cn(
                        "h-8 min-w-9 px-2 rounded-md border text-xs font-mono font-semibold transition-all",
                        codes[l.id] === c.code
                          ? MEANING_TONE[c.meaning] + " ring-2 ring-primary/40"
                          : "bg-background hover:bg-muted",
                      )}
                    >
                      {c.code}
                    </button>
                  ))}
                  <select
                    value={quick.some((q) => q.code === codes[l.id]) ? "" : (codes[l.id] ?? "")}
                    onChange={(e) => e.target.value && setCode(l.id, e.target.value)}
                    className="h-8 rounded-md border bg-background px-2 text-xs max-w-44"
                    aria-label="All codes"
                  >
                    <option value="">More codes…</option>
                    {set.codes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-end mt-3">
            <Button onClick={save}>
              <Save className="h-4 w-4" /> Save register
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}

function Reports({
  set,
  marks,
  learners,
}: {
  set: AttendanceCodeSet;
  marks: RegisterMark[];
  learners: Learner[];
}) {
  const ctx = useTenantContext();
  const groups = [...new Set(learners.map((l) => l.group).filter(Boolean) as string[])].sort();
  const [group, setGroup] = useState("");
  const shown = learners.filter((l) => !group || l.group === group);
  const threshold = attendanceThreshold(ctx.type, ctx.region).pct;
  const rows = shown
    .map((l) => ({
      l,
      s: summarise(
        marks.filter((m) => m.studentId === l.id),
        set,
      ),
    }))
    .sort((a, b) => a.s.pct - b.s.pct);
  const usage = set.codes
    .map((c) => ({
      c,
      n: marks.filter((m) => m.code === c.code && shown.some((l) => l.id === m.studentId)).length,
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...usage.map((u) => u.n));

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Section
        title="Attendance by learner"
        description={`Lowest first. Flag below ${threshold}%${ctx.type === "school" ? " (persistent absence)" : ""}.`}
        className="lg:col-span-2"
        actions={
          <Select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            options={[
              { value: "", label: "All groups" },
              ...groups.map((g) => ({ value: g, label: g })),
            ]}
            className="h-8 w-48"
          />
        }
      >
        <DataTable
          columns={[
            { key: "name", label: "Learner" },
            { key: "group", label: "Group" },
            { key: "sessions", label: "Possible" },
            { key: "pct", label: "Attendance" },
            { key: "auth", label: "Auth." },
            { key: "unauth", label: "Unauth." },
            { key: "flag", label: "" },
          ]}
          rows={rows}
          renderCell={({ l, s }: (typeof rows)[number], key) => {
            if (key === "name")
              return (
                <div className="flex items-center gap-2">
                  <Avatar name={l.name} size={26} />
                  <span className="font-medium">{l.name}</span>
                </div>
              );
            if (key === "group") return l.group ?? "—";
            if (key === "sessions") return s.total;
            if (key === "pct")
              return (
                <span className={cn("font-semibold", s.pct < threshold ? "text-destructive" : "")}>
                  {s.pct}%
                </span>
              );
            if (key === "auth") return s.authorised;
            if (key === "unauth") return s.unauthorised;
            if (key === "flag")
              return s.pct < threshold ? (
                <Badge tone="destructive">
                  {ctx.type === "school" ? "Persistent absence" : "Low engagement"}
                </Badge>
              ) : null;
            return null;
          }}
        />
      </Section>
      <Section title="Codes used" description="Across the selected learners.">
        <ul className="space-y-2">
          {usage.map(({ c, n }) => (
            <li key={c.code} className="flex items-center gap-2 text-xs">
              <CodeChip set={set} code={c.code} />
              <div className="flex-1 min-w-0">
                <div className="truncate">{c.label}</div>
                <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(n / max) * 100}%` }}
                  />
                </div>
              </div>
              <span className="w-8 text-right tabular-nums">{n}</span>
            </li>
          ))}
          {usage.length === 0 && <li className="text-sm text-muted-foreground">No marks yet.</li>}
        </ul>
      </Section>
    </div>
  );
}

function CodeLegend({ set }: { set: AttendanceCodeSet }) {
  const order: AttendanceMeaning[] = [
    "present",
    "late",
    "aea",
    "authorised",
    "unauthorised",
    "not-required",
    "admin",
  ];
  return (
    <Section title={set.name} description={set.description}>
      <div className="grid md:grid-cols-2 gap-4">
        {order
          .filter((m) => set.codes.some((c) => c.meaning === m))
          .map((m) => (
            <div key={m}>
              <div className="text-xs font-semibold mb-1.5">{MEANING_LABEL[m]}</div>
              <ul className="space-y-1">
                {set.codes
                  .filter((c) => c.meaning === m)
                  .map((c) => (
                    <li key={c.code} className="flex items-center gap-2 text-xs">
                      <CodeChip set={set} code={c.code} /> {c.label}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
      </div>
      <VerifyNote>
        The code set is chosen per institution in Institution Profile (defaulted from the region). A
        tuition centre keeps the simple P / L / E / A set; an English school uses the DfE national
        codes.
      </VerifyNote>
    </Section>
  );
}

function reportAction(region: string) {
  switch (region) {
    case "UK":
      return "Report to UKVI (SMS)";
    case "AU":
      return "Report via PRISMS";
    case "SG":
      return "Notify ICA / CPE";
    case "MY":
      return "Report to EMGS";
    default:
      return "Report to authority";
  }
}

/**
 * Visa-sponsor monitoring. The rule is chosen PER LEARNER from the region's
 * presets by who they are: a degree-level university student (UKVI engagement
 * policy; ESOS course progress only), a below-degree / VET learner (contact
 * points; ESOS 80%) or a school pupil.
 */
function visaScopeOf(l: Learner, tenantType: string): VisaScope {
  if (l.programmeId) return "he-degree";
  if (l.qualificationId) return "below-degree";
  if (tenantType === "school") return "school";
  return tenantType === "university" ? "he-degree" : "below-degree";
}

const daysBetweenIso = (a: string, b: string) =>
  Math.round(
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000,
  );

type VisaStatus = "OK" | "At risk" | "Report due" | "Progress only" | "No rule";

function VisaMonitoring({
  set,
  marks,
  learners,
}: {
  set: AttendanceCodeSet;
  marks: RegisterMark[];
  learners: Learner[];
}) {
  const ctx = useTenantContext();
  const vm = ctx.region.visaMonitoring;
  const [reported, setReported] = useState<Record<string, string>>({});
  const sponsored = learners.filter((l) => l.visa?.sponsored);
  const isPresent = (code: string) => {
    const meaning = set.codes.find((c) => c.code === code)?.meaning;
    return meaning === "present" || meaning === "late" || meaning === "aea";
  };

  const rows = sponsored
    .map((l) => {
      const scope = visaScopeOf(l, ctx.type);
      const rule = visaRuleFor(ctx.region, scope);
      const mine = marks.filter((m) => m.studentId === l.id);
      const s = summarise(mine, set);
      const missed = consecutiveMissed(mine, set);
      const lastAttended = mine
        .filter((m) => isPresent(m.code))
        .map((m) => m.date)
        .sort()
        .pop();
      // Days without engagement since the last attended point (or the start).
      const since = lastAttended ?? l.startDate ?? DEMO_TODAY;
      const daysDisengaged = Math.max(0, daysBetweenIso(since, DEMO_TODAY));
      // Calendar month to date (monthly rules).
      const monthStart = DEMO_TODAY.slice(0, 8) + "01";
      const prevMonthStart = (() => {
        const d = new Date(monthStart + "T00:00:00Z");
        d.setUTCMonth(d.getUTCMonth() - 1);
        return d.toISOString().slice(0, 10);
      })();
      const lastFullMonth = summarise(
        mine.filter((m) => m.date >= prevMonthStart && m.date < monthStart),
        set,
      );
      // Consecutive whole days absent (SG: 7+).
      const dates = [...new Set(mine.map((m) => m.date))].sort().reverse();
      let daysAbsent = 0;
      for (const d of dates) {
        if (mine.filter((m) => m.date === d).some((m) => isPresent(m.code))) break;
        daysAbsent++;
      }

      let status: VisaStatus = "OK";
      let measure = "—";
      if (!rule) status = "No rule";
      else if (rule.kind === "progress-only") {
        status = "Progress only";
        measure = "Course progress (assessment results)";
      } else if (rule.kind === "engagement-days") {
        measure = `${daysDisengaged} day(s) since last engagement`;
        if (daysDisengaged >= (rule.withdrawDays ?? 60)) status = "Report due";
        else if (daysDisengaged >= (rule.interveneDays ?? 14) || missed >= 4) status = "At risk";
      } else if (rule.kind === "consecutive-missed") {
        measure = `${missed} consecutive missed`;
        if (missed >= (rule.missedPoints ?? 10)) status = "Report due";
        else if (missed >= Math.ceil((rule.missedPoints ?? 10) / 2)) status = "At risk";
      } else if (rule.kind === "monthly-pct") {
        measure = `${lastFullMonth.total ? lastFullMonth.pct : s.pct}% last month · ${daysAbsent} day(s) absent in a row`;
        const pct = lastFullMonth.total ? lastFullMonth.pct : s.pct;
        if (pct < (rule.thresholdPct ?? 90) || daysAbsent >= (rule.consecutiveDays ?? 99))
          status = "Report due";
        else if (pct < (rule.thresholdPct ?? 90) + 3) status = "At risk";
      } else if (rule.kind === "period-pct") {
        measure = `${s.pct}% this study period`;
        if (s.pct < (rule.thresholdPct ?? 80)) status = "Report due";
        else if (s.pct < (rule.thresholdPct ?? 80) + 5) status = "At risk";
      }
      return { l, scope, rule, s, missed, lastAttended, status, measure };
    })
    .sort((a, b) => order(a.status) - order(b.status) || a.s.pct - b.s.pct);

  const rulesInUse = [
    ...new Map(rows.filter((r) => r.rule).map((r) => [r.rule!.id, r.rule!])).values(),
  ];

  return (
    <Section
      title={`Visa-sponsor monitoring — ${vm?.body ?? ctx.region.name}`}
      description={vm?.rule ?? "This region has no statutory visa attendance rule configured."}
    >
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Sponsored learners
          </div>
          <div className="text-xl font-bold">{sponsored.length}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Rules applied (by learner type)
          </div>
          {rulesInUse.length === 0 ? (
            <div className="text-sm">—</div>
          ) : (
            <ul className="text-xs space-y-0.5 mt-1">
              {rulesInUse.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">{r.label}</span>{" "}
                  <span className="text-muted-foreground">· report via {r.reportVia}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border p-3 border-destructive/30 bg-destructive/5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Reports due
          </div>
          <div className="text-xl font-bold text-destructive">
            {rows.filter((r) => r.status === "Report due" && !reported[r.l.id]).length}
          </div>
        </div>
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Learner" },
          { key: "visa", label: "Visa" },
          { key: "rule", label: "Rule (learner type)" },
          { key: "measure", label: "Measure" },
          { key: "last", label: "Last attended" },
          { key: "status", label: "Status" },
          { key: "_actions", label: "" },
        ]}
        rows={rows}
        renderCell={(r: (typeof rows)[number], key) => {
          if (key === "name")
            return (
              <div className="flex items-center gap-2">
                <Avatar name={r.l.name} size={26} />
                <div>
                  <div className="font-medium">{r.l.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.l.nationality} · {r.l.group}
                  </div>
                </div>
              </div>
            );
          if (key === "visa")
            return (
              <div className="text-xs">
                <div className="flex items-center gap-1">
                  <Plane className="h-3 w-3 text-info" /> {r.l.visa?.type}
                </div>
                <div className="text-muted-foreground">
                  {r.l.visa?.ref} · expires {r.l.visa?.expiry}
                </div>
              </div>
            );
          if (key === "rule")
            return (
              <div className="text-xs">
                {r.rule?.label ?? "No rule for this learner type"}
                <div className="text-[11px] text-muted-foreground">
                  {r.scope === "he-degree"
                    ? "Degree level"
                    : r.scope === "below-degree"
                      ? "Below degree / VET"
                      : "School"}
                </div>
              </div>
            );
          if (key === "measure")
            return (
              <span
                className={cn(
                  "text-xs",
                  r.status === "Report due" && "text-destructive font-semibold",
                )}
              >
                {r.measure}
              </span>
            );
          if (key === "last") return r.lastAttended ?? "—";
          if (key === "status")
            return reported[r.l.id] ? (
              <Badge tone="info">Reported {reported[r.l.id]}</Badge>
            ) : (
              <Badge
                tone={
                  r.status === "Report due"
                    ? "destructive"
                    : r.status === "At risk"
                      ? "warning"
                      : r.status === "OK"
                        ? "success"
                        : "muted"
                }
              >
                {r.status}
              </Badge>
            );
          if (key === "_actions")
            return (r.status === "Report due" || r.status === "At risk") && !reported[r.l.id] ? (
              <Button
                size="sm"
                variant={r.status === "Report due" ? "destructive" : "outline"}
                onClick={() => {
                  setReported({ ...reported, [r.l.id]: DEMO_TODAY });
                  toast.success(
                    r.status === "Report due"
                      ? `${reportAction(ctx.region.code)} — ${r.l.name}`
                      : `Intervention logged — ${r.l.name}`,
                    {
                      description:
                        r.status === "Report due"
                          ? `Via ${r.rule?.reportVia} within ${r.rule?.reportWithin}. ${r.l.visa?.ref ?? ""} · last engagement ${r.lastAttended ?? "unknown"}. Logged to the compliance audit trail.`
                          : "Student contacted under the engagement policy; the clock to the statutory limit keeps running until they re-engage.",
                    },
                  );
                }}
              >
                <ShieldAlert className="h-3.5 w-3.5" />{" "}
                {r.status === "Report due" ? reportAction(ctx.region.code) : "Contact student"}
              </Button>
            ) : null;
          return null;
        }}
      />
      <VerifyNote>
        Rules come from the region's visa presets (effective-dated) and are chosen per learner type
        — e.g. UKVI Student Sponsor Guidance Doc 2 (Oct 2026), ESOS National Code Standard 8, ICA
        Student's Pass. Confirm with each country's compliance pack before production.
      </VerifyNote>
    </Section>
  );
}

function order(s: VisaStatus) {
  return { "Report due": 0, "At risk": 1, OK: 2, "Progress only": 3, "No rule": 4 }[s];
}

/**
 * The attendance line a learner is expected to stay above: 90% for schools
 * (persistent absence), 85% otherwise — raised to the visa rule's percentage
 * when a sponsored learner falls under a percentage-based rule (ESOS, ICA…).
 */
function attendanceThreshold(
  tenantType: string,
  region: RegionProfile,
  learner?: Learner,
): { pct: number; visaRule?: string } {
  const base = tenantType === "school" ? 90 : 85;
  if (learner?.visa?.sponsored) {
    const rule = visaRuleFor(region, visaScopeOf(learner, tenantType));
    if (rule && (rule.kind === "monthly-pct" || rule.kind === "period-pct") && rule.thresholdPct)
      return { pct: Math.max(base, rule.thresholdPct), visaRule: rule.label };
    if (rule) return { pct: base, visaRule: rule.label };
  }
  return { pct: base };
}

/* ── QR check-in ─────────────────────────────────────────────────────────── */

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const QR_N = 25;

/** A QR-like glyph drawn from the code: finder squares, timing lines, data modules.
 *  Demo only — it is not a scannable QR symbol. */
function QrGlyph({ code, size = 260 }: { code: string; size?: number }) {
  const cells = useMemo(() => {
    const on: [number, number][] = [];
    let h = hashString(code) || 1;
    const rnd = () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return (h >>> 0) / 4294967296;
    };
    const inFinder = (r: number, c: number) =>
      (r < 8 && c < 8) || (r < 8 && c >= QR_N - 8) || (r >= QR_N - 8 && c < 8);
    const finderDark = (r: number, c: number) =>
      r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
    const ax = QR_N - 9; // alignment pattern centre
    for (let r = 0; r < QR_N; r++) {
      for (let c = 0; c < QR_N; c++) {
        let dark: boolean;
        if (inFinder(r, c)) {
          const fr = r >= QR_N - 8 ? r - (QR_N - 7) : r;
          const fc = c >= QR_N - 8 ? c - (QR_N - 7) : c;
          dark = fr >= 0 && fr < 7 && fc >= 0 && fc < 7 && finderDark(fr, fc);
        } else if (Math.abs(r - ax) <= 2 && Math.abs(c - ax) <= 2) {
          const d = Math.max(Math.abs(r - ax), Math.abs(c - ax));
          dark = d !== 1;
        } else if (r === 6 || c === 6) {
          dark = (r + c) % 2 === 0;
        } else {
          dark = rnd() < 0.5;
        }
        if (dark) on.push([r, c]);
      }
    }
    return on;
  }, [code]);
  return (
    <svg
      viewBox={`-2 -2 ${QR_N + 4} ${QR_N + 4}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Check-in code ${code} (demo code)`}
      className="rounded-lg bg-white"
    >
      <rect x={-2} y={-2} width={QR_N + 4} height={QR_N + 4} fill="#fff" />
      {cells.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#111" />
      ))}
    </svg>
  );
}

/** Roster for a QR session: learners in its groups who had started by that date. */
function useSessionRoster(s: QrSession | undefined) {
  const learners = useScopedLearners();
  return useMemo(() => {
    if (!s) return [];
    const groups = s.cohorts ?? [s.groupLabel];
    return learners.filter(
      (l) =>
        l.status === "Active" &&
        groups.includes(l.group ?? "") &&
        (!l.startDate || l.startDate <= s.date),
    );
  }, [learners, s]);
}

function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function QrPanel({
  id,
  set,
  onClose,
}: {
  id: string;
  set: AttendanceCodeSet;
  onClose: () => void;
}) {
  const ctx = useTenantContext();
  const me = ctx.user?.name ?? "";
  const s = useCollection("qrSessions").find((q) => q.id === id);
  const roster = useSessionRoster(s);
  const now = useNow(1000);
  const [confirmAbsent, setConfirmAbsent] = useState(false);

  const live = !!s && qrIsLive(s, now);
  const code = s ? qrCodeAt(s, now) : "";
  // Keep the stored "code on screen" in step with the rotation.
  useEffect(() => {
    if (s && live && s.code !== code) updateItem("qrSessions", (q) => q.id === s.id, { code });
  }, [s, live, code]);

  if (!s) return null;
  const opened = new Date(s.openedAt).getTime();
  const secsLeft = QR_ROTATE_SECONDS - (Math.floor((now - opened) / 1000) % QR_ROTATE_SECONDS);
  const minsLeft = Math.max(0, Math.ceil((new Date(s.expiresAt).getTime() - now) / 60_000));
  const scanned = new Set(s.scans.map((x) => x.studentId));
  const waiting = roster.filter((l) => !scanned.has(l.id));
  const nameOf = (sid: string) => roster.find((l) => l.id === sid)?.name ?? sid;
  const presentCode = set.codes.find((c) => c.meaning === "present")?.code ?? set.codes[0].code;
  const absentCode = set.codes.find((c) => c.meaning === "unauthorised")?.code ?? "";

  const simulateScan = () => {
    const next = waiting[Math.floor(Math.random() * waiting.length)];
    if (!next) return;
    updateItem("qrSessions", (q) => q.id === s.id, {
      scans: [...s.scans, { studentId: next.id, at: new Date().toISOString(), via: "QR" }],
    });
  };

  const closeAndSave = (markRestAbsent: boolean) => {
    const targets = roster.filter((l) => scanned.has(l.id) || (markRestAbsent && absentCode));
    const ids = new Set(targets.map((l) => l.id));
    removeItem(
      "registerMarks",
      (m) =>
        m.tenantId === s.tenantId &&
        m.date === s.date &&
        m.session === s.session &&
        m.groupLabel === s.groupLabel &&
        ids.has(m.studentId),
    );
    targets.forEach((l, i) =>
      addItem("registerMarks", {
        id: `RM-${Date.now().toString(36)}-q${i}`,
        tenantId: s.tenantId,
        date: s.date,
        session: s.session,
        groupLabel: s.groupLabel,
        studentId: l.id,
        code: scanned.has(l.id) ? presentCode : absentCode,
        by: me,
      }),
    );
    updateItem("qrSessions", (q) => q.id === s.id, { closed: true, savedMarks: targets.length });
    toast.success(`Check-in closed — ${scanned.size} marked ${presentCode}`, {
      description: markRestAbsent
        ? `${waiting.length} marked ${absentCode} (absent).`
        : waiting.length
          ? `${waiting.length} not scanned — mark them in the register.`
          : "Everyone checked in.",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              QR check-in · {s.date} · {s.session}
            </div>
            <h2 className="text-2xl font-bold">{s.groupLabel}</h2>
            <div className="text-sm text-muted-foreground">
              Opened {hhmm(s.openedAt)} by {s.openedBy}
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Hide panel">
            <X className="h-4 w-4" /> Hide
          </Button>
        </div>

        <div className="grid lg:grid-cols-[auto_1fr] gap-8">
          <div className="flex flex-col items-center gap-3">
            <div className={cn("rounded-xl border p-3 bg-white", !live && "opacity-40")}>
              <QrGlyph code={code} size={280} />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              demo code
            </div>
            <div className="font-mono text-4xl font-bold tracking-[0.3em]">
              {live ? code : "CLOSED"}
            </div>
            {live ? (
              <>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${(secsLeft / QR_ROTATE_SECONDS) * 100}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  New code in {secsLeft}s · closes in {minsLeft} min
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                {s.closed ? "This check-in is closed." : "Time is up — students can't scan now."}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Scanned"
                value={`${scanned.size} / ${roster.length}`}
                accent="success"
                icon={<ScanLine className="h-4 w-4" />}
              />
              <StatCard
                label="Not yet"
                value={waiting.length}
                accent={waiting.length ? "warning" : "success"}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold">Live scans</div>
                {live && waiting.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={simulateScan}>
                    Simulate a scan (demo)
                  </Button>
                )}
              </div>
              <ul className="divide-y rounded-lg border max-h-64 overflow-y-auto">
                {[...s.scans].reverse().map((x) => (
                  <li key={x.studentId} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <Avatar name={nameOf(x.studentId)} size={26} />
                    <span className="flex-1 font-medium">{nameOf(x.studentId)}</span>
                    <Badge tone={x.via === "QR" ? "info" : "muted"}>
                      {x.via === "QR" ? "QR" : "Biometric"}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">{hhmm(x.at)}</span>
                  </li>
                ))}
                {s.scans.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Waiting for the first scan…
                  </li>
                )}
              </ul>
            </div>

            {waiting.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Not scanned: {waiting.map((l) => l.name).join(", ")}
              </div>
            )}

            {!s.closed && (
              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
                {waiting.length > 0 && absentCode && (
                  <Button
                    variant={confirmAbsent ? "destructive" : "outline"}
                    onClick={() => (confirmAbsent ? closeAndSave(true) : setConfirmAbsent(true))}
                  >
                    {confirmAbsent
                      ? `Confirm: mark ${waiting.length} absent (${absentCode})`
                      : "Close & mark the rest absent"}
                  </Button>
                )}
                <Button onClick={() => closeAndSave(false)}>
                  <Save className="h-4 w-4" /> Close & save
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Recent QR / terminal sessions for staff — teachers see their own. */
function QrHistory({ set }: { set: AttendanceCodeSet }) {
  const ctx = useTenantContext();
  const me = ctx.user?.name ?? "";
  const all = useCollection("qrSessions");
  const [panelId, setPanelId] = useState<string | null>(null);
  const rows = all
    .filter(
      (q) => q.tenantId === ctx.tenantId && (ctx.user?.role !== "teacher" || q.openedBy === me),
    )
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    .slice(0, 8);
  if (!rows.length) return null;
  return (
    <Section
      title="QR check-in history"
      description="Scans by QR code or biometric terminal. Close a session to write its marks."
    >
      <DataTable
        columns={[
          { key: "when", label: "Date" },
          { key: "group", label: "Register" },
          { key: "scans", label: "Scans" },
          { key: "via", label: "Source" },
          { key: "status", label: "Status" },
          { key: "_a", label: "" },
        ]}
        rows={rows}
        renderCell={(q: QrSession, key) => {
          if (key === "when") return `${q.date} · ${q.session}`;
          if (key === "group") return q.groupLabel;
          if (key === "scans") return q.scans.length;
          if (key === "via") {
            const bio = q.scans.filter((x) => x.via === "Biometric").length;
            return (
              <span className="text-xs">
                {q.scans.length - bio} QR · {bio} biometric
              </span>
            );
          }
          if (key === "status")
            return q.closed ? (
              <Badge tone="success">Saved · {q.savedMarks ?? q.scans.length} marks</Badge>
            ) : (
              <Badge tone="warning">Open</Badge>
            );
          if (key === "_a")
            return !q.closed ? (
              <Button size="sm" variant="outline" onClick={() => setPanelId(q.id)}>
                Open
              </Button>
            ) : null;
          return null;
        }}
      />
      {panelId && <QrPanel id={panelId} set={set} onClose={() => setPanelId(null)} />}
    </Section>
  );
}

/** Student "Check in": enter the code on the lecturer's screen. */
function CheckInCard({ learner }: { learner: Learner }) {
  const ctx = useTenantContext();
  const all = useCollection("qrSessions");
  const sessions = useMemo(
    () => all.filter((q) => q.tenantId === ctx.tenantId),
    [all, ctx.tenantId],
  );
  const now = useNow(1000);
  const [code, setCode] = useState("");
  const onRoster = (q: QrSession) =>
    (q.cohorts ?? [q.groupLabel]).includes(learner.group ?? "") &&
    (!learner.startDate || learner.startDate <= q.date);
  const openForMe = sessions.filter((q) => qrIsLive(q, now) && onRoster(q));
  const pending = sessions.filter(
    (q) => !q.closed && q.scans.some((x) => x.studentId === learner.id),
  );

  const submit = () => {
    const c = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!c) {
      toast.error("Enter the code on the screen");
      return;
    }
    for (const q of sessions) {
      const w = qrWindow(q, now);
      const current = qrCodeFor(q, w) === c;
      const earlier =
        !current &&
        (q.code === c ||
          Array.from({ length: Math.min(w, 60) }, (_, k) => w - 1 - k).some(
            (k) => qrCodeFor(q, k) === c,
          ));
      if (!current && !earlier) continue;
      if (!qrIsLive(q, now)) {
        toast.error("This check-in has closed. Speak to your lecturer.");
        return;
      }
      if (earlier) {
        toast.error("That code has expired. Enter the code on the screen now.");
        return;
      }
      if (!onRoster(q)) {
        toast.error("This code is for another class.");
        return;
      }
      if (q.scans.some((x) => x.studentId === learner.id)) {
        toast.info("You're already checked in.");
        return;
      }
      updateItem("qrSessions", (x) => x.id === q.id, {
        scans: [...q.scans, { studentId: learner.id, at: new Date().toISOString(), via: "QR" }],
      });
      toast.success(`Checked in — ${q.groupLabel}`, {
        description: "Your mark is saved when the session closes.",
      });
      setCode("");
      return;
    }
    toast.error("Code not recognised. Check it and try again.");
  };

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <QrCode className="h-4 w-4" /> Check in
        </span>
      }
      description="Scan the QR code on the screen, or type the code under it."
    >
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Code" className="w-44">
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. K7P2QX"
            className="font-mono uppercase tracking-widest"
            maxLength={8}
          />
        </Field>
        <Button type="submit">
          <ScanLine className="h-4 w-4" /> Check in
        </Button>
        {openForMe.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCode(qrCodeAt(openForMe[0], now))}
          >
            Use the code on screen (demo)
          </Button>
        )}
      </form>
      <div className="mt-3 text-xs text-muted-foreground">
        {openForMe.length
          ? `Open now: ${openForMe.map((q) => q.groupLabel).join(", ")}`
          : "No check-in is open for your classes right now."}
      </div>
      {pending.length > 0 && (
        <ul className="mt-2 space-y-1">
          {pending.map((q) => (
            <li key={q.id} className="text-xs flex items-center gap-2">
              <Badge tone="success">Checked in</Badge>
              {q.groupLabel} · {q.date} — waiting for the register to be saved
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Attendance per module (HE / college) or per register group (school). */
function moduleKey(groupLabel: string) {
  return groupLabel.split(" · ")[0];
}

/* ── Parent / student ────────────────────────────────────────────────────── */

function LearnerAttendance() {
  const { ctx, set, marks } = useRegisterData();
  const learners = useScopedLearners();
  return (
    <div className="space-y-5">
      <PageHeader
        title={ctx.user?.role === "parent" ? "Attendance" : "My Attendance"}
        subtitle="Every code explained in plain words. Contact the school office if something looks wrong."
      />
      <PackContextBar />
      {learners.length === 0 && (
        <Section>
          <p className="text-sm text-muted-foreground">
            No attendance is linked to your account yet.
          </p>
        </Section>
      )}
      {ctx.user?.role === "student" && learners[0] && <CheckInCard learner={learners[0]} />}
      {learners.map((l) => {
        const mine = marks
          .filter((m) => m.studentId === l.id)
          .sort((a, b) => b.date.localeCompare(a.date) || b.session.localeCompare(a.session));
        const s = summarise(mine, set);
        const th = attendanceThreshold(ctx.type, ctx.region, l);
        const byModule = [...new Set(mine.map((m) => moduleKey(m.groupLabel)))]
          .map((k) => ({
            k,
            s: summarise(
              mine.filter((m) => moduleKey(m.groupLabel) === k),
              set,
            ),
          }))
          .sort((a, b) => a.k.localeCompare(b.k));
        const below = byModule.filter((x) => x.s.total > 0 && x.s.pct < th.pct);
        const overallBelow = s.total > 0 && s.pct < th.pct;
        const you = ctx.user?.role === "student";
        return (
          <Section
            key={l.id}
            title={
              <span className="flex items-center gap-2">
                <Avatar name={l.name} size={28} /> {l.name}
                <span className="text-xs font-normal text-muted-foreground">
                  {l.level}
                  {l.group ? ` · ${l.group}` : ""}
                </span>
              </span>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard
                label="Attendance"
                value={`${s.pct}%`}
                accent={s.pct >= 95 ? "success" : s.pct >= 90 ? "warning" : "destructive"}
              />
              <StatCard label="Late" value={s.late} accent="warning" />
              <StatCard label="Authorised absences" value={s.authorised} accent="info" />
              <StatCard label="Unauthorised" value={s.unauthorised} accent="destructive" />
            </div>
            {(overallBelow || below.length > 0) && (
              <div className="mb-4 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-destructive">
                    {overallBelow
                      ? `${you ? "Your" : `${l.name}'s`} attendance is ${s.pct}% — below the ${th.pct}% expected.`
                      : `Below ${th.pct}% in ${below.map((b) => `${b.k} (${b.s.pct}%)`).join(", ")}.`}
                  </div>
                  <div className="text-xs mt-0.5">
                    {you
                      ? "Talk to your personal tutor if something is getting in the way."
                      : "Please contact the school office if there is a reason we should know about."}
                    {th.visaRule &&
                      ` As a sponsored student, attendance is monitored under: ${th.visaRule}.`}
                  </div>
                </div>
              </div>
            )}
            {byModule.length > 1 && (
              <>
                <div className="text-xs font-semibold mb-2">
                  {ctx.type === "school" ? "By register" : "By module"}
                </div>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-4">
                  {byModule.map(({ k, s: ms }) => {
                    const low = ms.total > 0 && ms.pct < th.pct;
                    return (
                      <li key={k} className="flex items-center gap-2 text-xs">
                        <span className="w-16 font-mono font-semibold">{k}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              low ? "bg-destructive" : "bg-success",
                            )}
                            style={{ width: `${ms.pct}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "w-12 text-right tabular-nums",
                            low && "text-destructive font-semibold",
                          )}
                        >
                          {ms.pct}%
                        </span>
                        <span className="w-14 text-muted-foreground">{ms.total} sess.</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <div className="text-xs font-semibold mb-2">Recent registers</div>
            <ul className="divide-y rounded-lg border">
              {mine.slice(0, 12).map((m) => {
                const c = set.codes.find((x) => x.code === m.code);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <CodeChip set={set} code={m.code} />
                    <div className="flex-1 min-w-0">
                      <div>{c?.label ?? m.code}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {m.date} · {m.session} · {m.groupLabel}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground hidden sm:block">
                      {c ? MEANING_LABEL[c.meaning] : ""}
                    </span>
                  </li>
                );
              })}
              {mine.length === 0 && (
                <li className="px-3 py-6 text-sm text-muted-foreground text-center">
                  No registers yet.
                </li>
              )}
            </ul>
          </Section>
        );
      })}
    </div>
  );
}
