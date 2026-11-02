/* ── Exam timetabling & invigilation (HE / college). ────────────────────────
 * A sitting is one exam paper for one module run, in one or more rooms.
 * Checks before publishing: room capacity vs registered candidates, room
 * double-booking, student clashes (two sittings at once), invigilator
 * availability and workload. Published sittings appear on student and
 * staff timetables; invigilators are notified via the outbox. */

export interface SpecialArrangement {
  studentId: string;
  note: string; // "25% extra time", "Separate room", "Reader"
  extraMins?: number;
  roomId?: string;
}

export interface ExamSitting {
  id: string;
  tenantId: string;
  series: string; // "January 2027 exams"
  moduleId: string;
  title: string; // "DS701 — Final examination"
  date: string;
  start: string; // "09:30"
  durationMins: number;
  roomIds: string[];
  invigilators: string[];
  status: "Draft" | "Published";
  specialArrangements?: SpecialArrangement[];
  /** Students entered without a registration this year (resit / deferred). */
  resitCandidates?: string[];
  /** Head-count of entries with no student record here (visiting, external). */
  otherCandidates?: number;
  otherCandidatesNote?: string;
  publishedAt?: string;
}

/** Staff who invigilate: dates they can't, and a duty cap per series. */
export interface InvigilatorProfile {
  id: string;
  tenantId: string;
  staffName: string;
  unavailable: string[]; // ISO dates
  maxDuties: number;
}

/** Exam period per series: the window free slots are searched in, and the
 *  date students are told the timetable will be published. */
export interface ExamSeriesInfo {
  tenantId: string;
  name: string;
  start: string;
  end: string;
  publishOn: string;
}

export const EXAM_SERIES: ExamSeriesInfo[] = [
  {
    tenantId: "T-010",
    name: "January 2027 exams",
    start: "2027-01-11",
    end: "2027-01-22",
    publishOn: "2026-11-20",
  },
  {
    tenantId: "T-011",
    name: "Semester 2 2026 exams",
    start: "2026-11-02",
    end: "2026-11-13",
    publishOn: "2026-10-12",
  },
];

/** Seats in exam layout (spaced desks), set by Estates. Rooms not listed seat
 *  half their teaching capacity. */
export const EXAM_SEATS: Record<string, number> = {
  "ROOM-1001": 100, // Turing LT1
  "ROOM-1002": 30, // Lovelace Lab 2.14
  "ROOM-1003": 16, // Babbage SR 3.02
  "ROOM-1004": 70, // Hopper LT2
  "ROOM-1005": 18, // Data Lab 4.01
  "ROOM-1101": 12, // ICT Lab B2
  "ROOM-1104": 14, // Seminar Room S3
};

/** Start times offered when looking for a free slot. */
export const EXAM_START_TIMES = ["09:30", "14:00"];
export const CANDIDATES_PER_INVIGILATOR = 30;

/* ── Seed ─────────────────────────────────────────────────────────────────── */

const JAN = "January 2027 exams";
const NOAH_ARR = (extraMins: number): SpecialArrangement => ({
  studentId: "S-4003",
  note: "DSA: 25% extra time incl. rest breaks, assistive software, separate room",
  extraMins,
  roomId: "ROOM-1005",
});

export const examSittings: ExamSitting[] = [
  // ── Northbridge — January 2027 (Draft: checks show a clash and a short room) ──
  {
    id: "EX-1001",
    tenantId: "T-010",
    series: JAN,
    moduleId: "MOD-1001",
    title: "CS101 — Examination",
    date: "2027-01-11",
    start: "09:30",
    durationMins: 120,
    roomIds: ["ROOM-1002"],
    invigilators: ["Dr. Tom Hartley"],
    status: "Draft",
  },
  {
    id: "EX-1002",
    tenantId: "T-010",
    series: JAN,
    moduleId: "MOD-1003",
    title: "CS201 — Examination",
    date: "2027-01-12",
    start: "09:30",
    durationMins: 120,
    // Babbage seats 16 in exam layout: 5 + 12 resit/deferred = 17 → short by 1.
    roomIds: ["ROOM-1003"],
    // Prof. Moore is away on 12 Jan, and 2 rooms need 2 invigilators.
    invigilators: ["Prof. Helen Moore"],
    status: "Draft",
    specialArrangements: [NOAH_ARR(30)],
    otherCandidates: 12,
    otherCandidatesNote: "Referred & deferred candidates from 2025/26",
  },
  {
    id: "EX-1003",
    tenantId: "T-010",
    series: JAN,
    moduleId: "MOD-1002",
    title: "CS102 — Examination",
    date: "2027-01-13",
    start: "09:30",
    durationMins: 120,
    roomIds: ["ROOM-1004"],
    invigilators: ["Dr. Aisha Bello"],
    status: "Draft",
  },
  {
    // Overlaps CS102 for Leo Ward (Level 4) — the deliberate student clash.
    id: "EX-1004",
    tenantId: "T-010",
    series: JAN,
    moduleId: "MOD-1013",
    title: "CS103 — Examination",
    date: "2027-01-13",
    start: "10:00",
    durationMins: 120,
    roomIds: ["ROOM-1001"],
    invigilators: ["Mr. Gareth Evans"],
    status: "Draft",
    // Ananya Rao is trailing CS103 from Year 1.
    resitCandidates: ["S-4010"],
  },
  {
    id: "EX-1005",
    tenantId: "T-010",
    series: JAN,
    moduleId: "MOD-1010",
    title: "DS701 — Final examination",
    date: "2027-01-14",
    start: "09:30",
    durationMins: 180,
    roomIds: ["ROOM-1005"],
    invigilators: ["Dr. Samuel Reid"],
    status: "Draft",
  },
  {
    id: "EX-1006",
    tenantId: "T-010",
    series: JAN,
    moduleId: "MOD-1019",
    title: "CS302 — Examination",
    date: "2027-01-15",
    start: "14:00",
    durationMins: 120,
    roomIds: ["ROOM-1001"],
    invigilators: [],
    status: "Draft",
  },
  {
    id: "EX-1007",
    tenantId: "T-010",
    series: JAN,
    moduleId: "MOD-1004",
    title: "CS202 — Examination",
    date: "2027-01-18",
    start: "09:30",
    durationMins: 120,
    roomIds: ["ROOM-1004"],
    invigilators: ["Dr. Samuel Reid", "Dr. Tom Hartley"],
    status: "Draft",
    specialArrangements: [NOAH_ARR(30)],
  },
  {
    id: "EX-1008",
    tenantId: "T-010",
    series: JAN,
    moduleId: "MOD-1020",
    title: "CS303 — Examination",
    date: "2027-01-19",
    start: "09:30",
    durationMins: 120,
    roomIds: ["ROOM-1004"],
    invigilators: ["Mr. Gareth Evans"],
    status: "Draft",
  },
  // ── Harbourside — Semester 2 2026 (published, exams this week) ──
  {
    id: "EX-1101",
    tenantId: "T-011",
    series: "Semester 2 2026 exams",
    moduleId: "MOD-1107",
    title: "BIT203 — Examination",
    date: "2026-11-06",
    start: "09:30",
    durationMins: 120,
    roomIds: ["ROOM-1101"],
    invigilators: ["Dr. Nina Patel"],
    status: "Published",
    publishedAt: "2026-10-12T09:00:00Z",
  },
  {
    id: "EX-1102",
    tenantId: "T-011",
    series: "Semester 2 2026 exams",
    moduleId: "MOD-1108",
    title: "BIT204 — Examination",
    date: "2026-11-09",
    start: "13:30",
    durationMins: 120,
    roomIds: ["ROOM-1104"],
    invigilators: ["Mr. Darren Walsh"],
    status: "Published",
    publishedAt: "2026-10-12T09:00:00Z",
  },
];

export const invigilatorProfiles: InvigilatorProfile[] = [
  // Northbridge (TENANT_STAFF T-010)
  {
    id: "INV-1001",
    tenantId: "T-010",
    staffName: "Dr. Eleanor Hughes",
    unavailable: ["2027-01-20", "2027-01-21", "2027-01-22"],
    maxDuties: 1,
  },
  {
    id: "INV-1002",
    tenantId: "T-010",
    staffName: "Dr. Samuel Reid",
    unavailable: ["2027-01-15"],
    maxDuties: 4,
  },
  {
    id: "INV-1003",
    tenantId: "T-010",
    staffName: "Prof. Helen Moore",
    unavailable: ["2027-01-11", "2027-01-12"],
    maxDuties: 2,
  },
  {
    id: "INV-1004",
    tenantId: "T-010",
    staffName: "Dr. Aisha Bello",
    unavailable: [],
    maxDuties: 4,
  },
  {
    id: "INV-1005",
    tenantId: "T-010",
    staffName: "Dr. Tom Hartley",
    unavailable: ["2027-01-19"],
    maxDuties: 3,
  },
  {
    id: "INV-1006",
    tenantId: "T-010",
    staffName: "Mr. Gareth Evans",
    unavailable: [],
    maxDuties: 4,
  },
  // Harbourside (TENANT_STAFF T-011)
  {
    id: "INV-1101",
    tenantId: "T-011",
    staffName: "Liam O'Connor",
    unavailable: [],
    maxDuties: 1,
  },
  {
    id: "INV-1102",
    tenantId: "T-011",
    staffName: "Ms. Kate Sullivan",
    unavailable: ["2026-11-12"],
    maxDuties: 3,
  },
  {
    id: "INV-1103",
    tenantId: "T-011",
    staffName: "Mr. Darren Walsh",
    unavailable: ["2026-11-06"],
    maxDuties: 2,
  },
  {
    id: "INV-1104",
    tenantId: "T-011",
    staffName: "Ms. Jess Kowalski",
    unavailable: ["2026-11-09", "2026-11-10"],
    maxDuties: 2,
  },
  {
    id: "INV-1105",
    tenantId: "T-011",
    staffName: "Mr. Ben Archer",
    unavailable: [],
    maxDuties: 2,
  },
  {
    id: "INV-1106",
    tenantId: "T-011",
    staffName: "Dr. Nina Patel",
    unavailable: [],
    maxDuties: 3,
  },
];

/* ── Rules (pure — production can lift these as-is) ──────────────────────── */

export interface ExamIssue {
  level: "error" | "warning";
  kind: "capacity" | "room" | "student" | "invigilator" | "arrangement" | "candidates";
  sittingId: string;
  text: string;
  /** Student clash: the students affected. */
  students?: string[];
}

export interface ExamRoomLike {
  id: string;
  name: string;
  capacity: number;
}

export interface ExamCheckContext {
  /** Every sitting in the tenant (all series) — rooms and people are shared. */
  sittings: ExamSitting[];
  /** Student ids entered for the sitting (registrations + resit entries). */
  candidatesOf: (s: ExamSitting) => string[];
  rooms: ExamRoomLike[];
  profiles: InvigilatorProfile[];
  leaderOf: (moduleId: string) => string | undefined;
  nameOf: (studentId: string) => string;
  supportPlanOf: (studentId: string) => string | undefined;
  codeOf: (moduleId: string) => string;
}

export function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMins(n: number): string {
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

export function examSeats(room: ExamRoomLike): number {
  return EXAM_SEATS[room.id] ?? Math.floor(room.capacity / 2);
}

/** Extra minutes a student gets in this sitting. */
export function extraFor(s: ExamSitting, studentId: string): number {
  return s.specialArrangements?.find((a) => a.studentId === studentId)?.extraMins ?? 0;
}

/** End time for a student (includes their extra time). */
export function endFor(s: ExamSitting, studentId?: string): string {
  return fromMins(toMins(s.start) + s.durationMins + (studentId ? extraFor(s, studentId) : 0));
}

/** Rooms set aside for one student (separate-room arrangements). */
export function separateRoomIds(s: ExamSitting): string[] {
  return Array.from(
    new Set((s.specialArrangements ?? []).map((a) => a.roomId).filter((r): r is string => !!r)),
  );
}

/** Main rooms for the cohort (excludes separate rooms). */
export function mainRoomIds(s: ExamSitting): string[] {
  const sep = separateRoomIds(s);
  return s.roomIds.filter((r) => !sep.includes(r));
}

export function allRoomIds(s: ExamSitting): string[] {
  return Array.from(new Set([...s.roomIds, ...separateRoomIds(s)]));
}

/** Room / invigilator occupancy: start to the latest finish incl. extra time. */
function occupancy(s: ExamSitting): [number, number] {
  const extra = Math.max(0, ...(s.specialArrangements ?? []).map((a) => a.extraMins ?? 0));
  const a = toMins(s.start);
  return [a, a + s.durationMins + extra];
}

function windowsOverlap(a: [number, number], b: [number, number]) {
  return a[0] < b[1] && b[0] < a[1];
}

function sittingsOverlap(a: ExamSitting, b: ExamSitting) {
  return a.date === b.date && windowsOverlap(occupancy(a), occupancy(b));
}

function studentWindow(s: ExamSitting, studentId: string): [number, number] {
  const a = toMins(s.start);
  return [a, a + s.durationMins + extraFor(s, studentId)];
}

export function candidateCount(s: ExamSitting, ctx: ExamCheckContext): number {
  return ctx.candidatesOf(s).length + (s.otherCandidates ?? 0);
}

/** 1 per 30 candidates, at least 1 per room (separate rooms included). */
export function requiredInvigilators(s: ExamSitting, ctx: ExamCheckContext): number {
  const sepStudents = (s.specialArrangements ?? []).filter((a) => a.roomId).length;
  const main = candidateCount(s, ctx) - sepStudents;
  return (
    Math.max(Math.ceil(Math.max(0, main) / CANDIDATES_PER_INVIGILATOR), mainRoomIds(s).length) +
    separateRoomIds(s).length
  );
}

export function seatsFor(s: ExamSitting, ctx: ExamCheckContext): number {
  return mainRoomIds(s).reduce((a, id) => {
    const r = ctx.rooms.find((x) => x.id === id);
    return a + (r ? examSeats(r) : 0);
  }, 0);
}

const SEP_RE = /separate room/i;

export function fmtExamDay(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Student clashes for `s`: other sittings the same students sit at the same time. */
function studentClashes(s: ExamSitting, ctx: ExamCheckContext) {
  const mine = ctx.candidatesOf(s);
  const out: { other: ExamSitting; students: string[] }[] = [];
  for (const o of ctx.sittings) {
    if (o.id === s.id || o.date !== s.date) continue;
    const theirs = ctx.candidatesOf(o);
    const both = mine.filter(
      (st) => theirs.includes(st) && windowsOverlap(studentWindow(s, st), studentWindow(o, st)),
    );
    if (both.length) out.push({ other: o, students: both });
  }
  return out;
}

function roomClashes(s: ExamSitting, ctx: ExamCheckContext) {
  const mine = allRoomIds(s);
  const out: { other: ExamSitting; roomId: string }[] = [];
  for (const o of ctx.sittings) {
    if (o.id === s.id || !sittingsOverlap(s, o)) continue;
    for (const r of allRoomIds(o)) if (mine.includes(r)) out.push({ other: o, roomId: r });
  }
  return out;
}

export function checkSitting(s: ExamSitting, ctx: ExamCheckContext): ExamIssue[] {
  const out: ExamIssue[] = [];
  const add = (
    level: ExamIssue["level"],
    kind: ExamIssue["kind"],
    text: string,
    students?: string[],
  ) => out.push({ level, kind, sittingId: s.id, text, students });
  const roomName = (id: string) => ctx.rooms.find((r) => r.id === id)?.name ?? id;
  const cands = ctx.candidatesOf(s);
  const arr = s.specialArrangements ?? [];

  // Capacity
  const total = candidateCount(s, ctx);
  if (total === 0) add("warning", "candidates", "No candidates entered yet");
  if (mainRoomIds(s).length === 0) {
    add("error", "capacity", "No exam room chosen");
  } else {
    const sepStudents = arr.filter((a) => a.roomId).length;
    const seated = total - sepStudents;
    const seats = seatsFor(s, ctx);
    if (seated > seats)
      add("error", "capacity", `${seated} candidates, ${seats} seats — short by ${seated - seats}`);
  }
  for (const a of arr) {
    const who = ctx.nameOf(a.studentId);
    if (SEP_RE.test(a.note) && !a.roomId) add("error", "capacity", `${who} needs a separate room`);
    if (a.roomId && s.roomIds.includes(a.roomId) && mainRoomIds(s).length === 0)
      add("error", "capacity", `${roomName(a.roomId)} is ${who}'s separate room`);
    if (!cands.includes(a.studentId))
      add("warning", "arrangement", `${who} has an arrangement but isn't entered`);
  }
  for (const st of cands) {
    const plan = ctx.supportPlanOf(st);
    if (plan && !arr.some((a) => a.studentId === st))
      add(
        "warning",
        "arrangement",
        `${ctx.nameOf(st)} has a support plan (${plan}) — no arrangement`,
      );
  }

  // Rooms
  for (const c of roomClashes(s, ctx))
    add(
      "error",
      "room",
      `${roomName(c.roomId)} is also booked for ${ctx.codeOf(c.other.moduleId)} at ${c.other.start}`,
    );

  // Students
  for (const c of studentClashes(s, ctx))
    add(
      "error",
      "student",
      `Clash with ${ctx.codeOf(c.other.moduleId)} (${fmtExamDay(c.other.date)} ${c.other.start}) for ${c.students.map(ctx.nameOf).join(", ")}`,
      c.students,
    );

  // Invigilators
  const need = requiredInvigilators(s, ctx);
  if (s.invigilators.length < need)
    add(
      "warning",
      "invigilator",
      `Needs ${need} invigilator${need > 1 ? "s" : ""}, has ${s.invigilators.length}`,
    );
  for (const name of s.invigilators) {
    const p = ctx.profiles.find((x) => x.staffName === name);
    if (p?.unavailable.includes(s.date))
      add("warning", "invigilator", `${name} is unavailable that day`);
    const busy = ctx.sittings.find(
      (o) => o.id !== s.id && o.invigilators.includes(name) && sittingsOverlap(s, o),
    );
    if (busy)
      add("warning", "invigilator", `${name} is also invigilating ${ctx.codeOf(busy.moduleId)}`);
  }
  return out;
}

/** Series-level: invigilators over their duty cap. */
export function dutyLoad(series: ExamSitting[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of series) for (const n of s.invigilators) m.set(n, (m.get(n) ?? 0) + 1);
  return m;
}

export function checkSeries(series: ExamSitting[], ctx: ExamCheckContext): ExamIssue[] {
  const out = series.flatMap((s) => checkSitting(s, ctx));
  const load = dutyLoad(series);
  for (const p of ctx.profiles) {
    const n = load.get(p.staffName) ?? 0;
    if (n > p.maxDuties)
      out.push({
        level: "warning",
        kind: "invigilator",
        sittingId: "",
        text: `${p.staffName} has ${n} duties (max ${p.maxDuties})`,
      });
  }
  return out;
}

function weekdaysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  while (d <= last && out.length < 60) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Smallest free room (not booked at that time) that covers the seat shortfall. */
export function suggestRoom(s: ExamSitting, ctx: ExamCheckContext): ExamRoomLike | null {
  const sep = (s.specialArrangements ?? []).filter((a) => a.roomId).length;
  const short = candidateCount(s, ctx) - sep - seatsFor(s, ctx);
  if (short <= 0) return null;
  const used = allRoomIds(s);
  return (
    ctx.rooms
      .filter((r) => !used.includes(r.id) && examSeats(r) >= short)
      .filter((r) => {
        const probe = {
          ...s,
          roomIds: [r.id],
          specialArrangements: (s.specialArrangements ?? []).map((a) => ({
            ...a,
            roomId: undefined,
          })),
        };
        return !roomClashes(probe, ctx).length;
      })
      .sort((a, b) => examSeats(a) - examSeats(b))[0] ?? null
  );
}

/** First slot in the series window with no student or room clash — preferring
 *  days on which none of the candidates already has an exam. */
export function suggestSlot(
  s: ExamSitting,
  ctx: ExamCheckContext,
  window: { start: string; end: string },
): { date: string; start: string } | null {
  const mine = ctx.candidatesOf(s);
  const busyDay = (date: string) =>
    ctx.sittings.some(
      (o) => o.id !== s.id && o.date === date && ctx.candidatesOf(o).some((x) => mine.includes(x)),
    );
  const days = weekdaysBetween(window.start, window.end);
  for (const strict of [true, false]) {
    for (const date of days) {
      if (strict && busyDay(date)) continue;
      for (const start of EXAM_START_TIMES) {
        if (date === s.date && start === s.start) continue;
        const moved = { ...s, date, start };
        if (studentClashes(moved, ctx).length || roomClashes(moved, ctx).length) continue;
        return { date, start };
      }
    }
  }
  return null;
}

/**
 * Fill each Draft sitting up to the required number: keeps current invigilators
 * who are available, free and under their cap; then adds available staff with
 * the lowest load, avoiding the module's own leader where possible.
 */
export function autoAssignInvigilators(
  series: ExamSitting[],
  ctx: ExamCheckContext,
): Map<string, string[]> {
  const ordered = [...series].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const assigned = new Map<string, string[]>(series.map((s) => [s.id, [...s.invigilators]]));
  const others = ctx.sittings.filter((o) => !series.some((s) => s.id === o.id));
  const profile = (n: string) => ctx.profiles.find((p) => p.staffName === n);
  const busy = (name: string, s: ExamSitting) =>
    others.some((o) => o.invigilators.includes(name) && sittingsOverlap(s, o)) ||
    ordered.some(
      (o) => o.id !== s.id && assigned.get(o.id)!.includes(name) && sittingsOverlap(s, o),
    );
  const load = new Map<string, number>();
  const bump = (n: string) => load.set(n, (load.get(n) ?? 0) + 1);

  // Pass 1 — keep valid current assignments (published sittings are left alone).
  for (const s of ordered) {
    if (s.status === "Published") {
      s.invigilators.forEach(bump);
      continue;
    }
    const keep: string[] = [];
    assigned.set(s.id, keep);
    for (const n of s.invigilators) {
      const p = profile(n);
      const ok =
        !p?.unavailable.includes(s.date) &&
        (load.get(n) ?? 0) < (p?.maxDuties ?? 99) &&
        !busy(n, s);
      if (ok) {
        keep.push(n);
        bump(n);
      }
    }
  }
  // Pass 2 — top up.
  for (const s of ordered) {
    if (s.status === "Published") continue;
    const list = assigned.get(s.id)!;
    const leader = ctx.leaderOf(s.moduleId);
    while (list.length < requiredInvigilators(s, ctx)) {
      const pick = ctx.profiles
        .filter(
          (p) =>
            !list.includes(p.staffName) &&
            !p.unavailable.includes(s.date) &&
            (load.get(p.staffName) ?? 0) < p.maxDuties &&
            !busy(p.staffName, s),
        )
        .sort(
          (a, b) =>
            Number(a.staffName === leader) - Number(b.staffName === leader) ||
            (load.get(a.staffName) ?? 0) - (load.get(b.staffName) ?? 0) ||
            a.staffName.localeCompare(b.staffName),
        )[0];
      if (!pick) break;
      list.push(pick.staffName);
      bump(pick.staffName);
    }
  }
  return assigned;
}
