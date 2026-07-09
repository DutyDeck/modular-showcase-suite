import { useSyncExternalStore } from "react";
import {
  students as initialStudents,
  courses as initialCourses,
  assignments as initialAssignments,
  invoices as initialInvoices,
  swimInvoices as initialSwimInvoices,
  leads as initialLeads,
  swimLeads as initialSwimLeads,
  tenants as initialTenants,
  platformUsers as initialPlatformUsers,
  swimStaff as initialSwimStaff,
  attendanceToday as initialAttendance,
  marketplaceCourses as initialMarketplace,
  messages as initialMessages,
  srbEntries as initialSrb,
  swimSrbEntries as initialSwimSrb,
  teacherRatings as initialTeacherRatings,
  trainingEnrollments as initialTrainingEnrollments,
  sessionAttendanceHistory as initialSessionAttendance,
  incidents as initialIncidents,
  coachAttendance as initialCoachAttendance,
  sessionRosters as initialSessionRosters,
  chatSeed as initialChat,
  chatGroups as initialChatGroups,
  swimmerMoves as initialSwimmerMoves,
  levelAssessments as initialLevelAssessments,
  raceTimes as initialRaceTimes,
  paymentMandates as initialPaymentMandates,
  cpdAssignments as initialCpdAssignments,
  leadContacts as initialLeadContacts,
  wellbeingChecks as initialWellbeingChecks,
  offboardings as initialOffboardings,
  swimAwards as initialSwimAwards,
  awardProgress as initialAwardProgress,
  coachMoves as initialCoachMoves,
  coachGrades as initialCoachGrades,
  clubSettings as initialClubSettings,
  capacityOverrides as initialCapacityOverrides,
  institutionBrandings as initialInstitutionBrandings,
  demoSettings as initialDemoSettings,
} from "./mockData";

export type {
  SrbEntry,
  SrbReply,
  SrbType,
  TeacherRating,
  TrainingEnrollment,
  SessionAttendance,
  Incident,
  IncidentType,
  IncidentSeverity,
  CoachAttendance,
  SessionRoster,
  ChatMessage,
  ChatAttachment,
  ChatGroup,
  SwimmerMove,
  SwimmerMoveKind,
  LevelAssessment,
  LevelOutcome,
  RaceTime,
  SwimEvent,
  PaymentMandate,
  SwimPaymentMethod,
  CpdAssignment,
  LeadContact,
  OutreachChannel,
  WellbeingCheck,
  WellbeingFlag,
  Offboarding,
  OffboardPersonType,
  SwimAward,
  AwardStrand,
  AwardTone,
  AwardProgress,
  CoachMove,
  CoachMoveKind,
  CoachGrade,
  CoachGradeLevel,
  ClubSettings,
  CapacityOverride,
  InstituteBranding,
  DemoSettings,
} from "./mockData";

export type Student = (typeof initialStudents)[number];
export type Course = (typeof initialCourses)[number];
export type Assignment = (typeof initialAssignments)[number];
export type Invoice = (typeof initialInvoices)[number];
export type Lead = (typeof initialLeads)[number];
export type Tenant = (typeof initialTenants)[number];
export type PlatformUser = (typeof initialPlatformUsers)[number];
export type AttendanceRow = (typeof initialAttendance)[number];
export type MarketplaceCourse = (typeof initialMarketplace)[number];
export type Message = (typeof initialMessages)[number];

import type {
  SrbEntry,
  TeacherRating,
  TrainingEnrollment,
  SessionAttendance,
  Incident,
  CoachAttendance,
  SessionRoster,
  ChatMessage,
  ChatGroup,
  SwimmerMove,
  LevelAssessment,
  RaceTime,
  PaymentMandate,
  CpdAssignment,
  LeadContact,
  WellbeingCheck,
  Offboarding,
  SwimAward,
  AwardProgress,
  CoachMove,
  CoachGrade,
  ClubSettings,
  CapacityOverride,
  InstituteBranding,
  DemoSettings,
} from "./mockData";

/* A cross-tenant enrolment created at runtime — i.e. a tenant admin enrolled an
 * existing 1StudentID student (from another tenant) after the student/guardian
 * approved the request. These augment the static enrolment map in mockData so
 * the newly enrolled student shows up on the enrolling tenant's roster. */
export interface CrossEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  institutionId: string;
  institutionName: string;
  role: string;
  classLabel: string;
  since: string;
  at: string; // ISO timestamp the enrolment was confirmed
  consentBy: string; // who approved (student or guardian name)
  consentVia: string; // "Student OTP" | "Guardian OTP" | "Magic link" …
}

interface State {
  students: Student[];
  courses: Course[];
  assignments: Assignment[];
  invoices: Invoice[];
  leads: Lead[];
  tenants: Tenant[];
  platformUsers: PlatformUser[];
  attendance: AttendanceRow[];
  marketplace: MarketplaceCourse[];
  messages: Message[];
  srb: SrbEntry[];
  enrollments: CrossEnrollment[];
  teacherRatings: TeacherRating[];
  trainingEnrollments: TrainingEnrollment[];
  sessionAttendance: SessionAttendance[];
  incidents: Incident[];
  coachAttendance: CoachAttendance[];
  sessionRosters: SessionRoster[];
  chat: ChatMessage[];
  chatGroups: ChatGroup[];
  swimmerMoves: SwimmerMove[];
  levelAssessments: LevelAssessment[];
  raceTimes: RaceTime[];
  paymentMandates: PaymentMandate[];
  cpdAssignments: CpdAssignment[];
  leadContacts: LeadContact[];
  wellbeingChecks: WellbeingCheck[];
  offboardings: Offboarding[];
  swimAwards: SwimAward[];
  awardProgress: AwardProgress[];
  coachMoves: CoachMove[];
  coachGrades: CoachGrade[];
  clubSettings: ClubSettings[];
  capacityOverrides: CapacityOverride[];
  institutionBrandings: InstituteBranding[];
  demoSettings: DemoSettings[];
}

const STORAGE_KEY = "oneedu.store.v3";
// Bump SEED_VERSION whenever seed data changes (new demo data, renamed people,
// new collections). On the next load, any browser whose cached copy predates the
// bump is auto-reseeded — testers no longer have to click "Reset demo" after a
// deploy to clear stale names/threads. It does NOT rename STORAGE_KEY (which
// would wipe data unconditionally); it only resets when the seed actually moves.
const SEED_VERSION_KEY = "oneedu.store.seedver";
const SEED_VERSION = "2026-07-branding-multi";

function makeInitialState(): State {
  return {
    students: [...initialStudents],
    courses: [...initialCourses],
    assignments: [...initialAssignments],
    invoices: [...initialInvoices, ...initialSwimInvoices],
    leads: [...initialLeads, ...initialSwimLeads],
    tenants: [...initialTenants],
    platformUsers: [...initialPlatformUsers, ...initialSwimStaff],
    attendance: [...initialAttendance],
    marketplace: [...initialMarketplace],
    messages: [...initialMessages],
    srb: [...initialSrb, ...initialSwimSrb],
    enrollments: [],
    teacherRatings: [...initialTeacherRatings],
    trainingEnrollments: [...initialTrainingEnrollments],
    sessionAttendance: [...initialSessionAttendance],
    incidents: [...initialIncidents],
    coachAttendance: [...initialCoachAttendance],
    sessionRosters: [...initialSessionRosters],
    chat: [...initialChat],
    chatGroups: [...initialChatGroups],
    swimmerMoves: [...initialSwimmerMoves],
    levelAssessments: [...initialLevelAssessments],
    raceTimes: [...initialRaceTimes],
    paymentMandates: [...initialPaymentMandates],
    cpdAssignments: [...initialCpdAssignments],
    leadContacts: [...initialLeadContacts],
    wellbeingChecks: [...initialWellbeingChecks],
    offboardings: [...initialOffboardings],
    swimAwards: [...initialSwimAwards],
    awardProgress: [...initialAwardProgress],
    coachMoves: [...initialCoachMoves],
    coachGrades: [...initialCoachGrades],
    clubSettings: [...initialClubSettings],
    capacityOverrides: [...initialCapacityOverrides],
    institutionBrandings: [...initialInstitutionBrandings],
    demoSettings: [...initialDemoSettings],
  };
}

function loadFromStorage(): State {
  if (typeof window === "undefined") return makeInitialState();
  try {
    // Seed data moved since this browser last cached? Start clean (auto Reset).
    if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      return makeInitialState();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeInitialState();
    const parsed = JSON.parse(raw) as Partial<State>;
    const fresh = makeInitialState();
    // Merge per-key so future code additions don't blow up old saves.
    return {
      ...fresh,
      ...parsed,
    } as State;
  } catch {
    return makeInitialState();
  }
}

let state: State = loadFromStorage();

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / privacy mode — silently ignore */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export function useCollection<K extends keyof State>(key: K): State[K] {
  return useSyncExternalStore(
    subscribe,
    () => state[key],
    () => state[key],
  );
}

export function addItem<K extends keyof State>(key: K, item: State[K][number]) {
  state = { ...state, [key]: [item, ...state[key]] as State[K] };
  emit();
}

export function updateItem<K extends keyof State>(
  key: K,
  predicate: (row: State[K][number]) => boolean,
  patch: Partial<State[K][number]>,
) {
  state = {
    ...state,
    [key]: state[key].map((row) => (predicate(row) ? { ...row, ...patch } : row)) as State[K],
  };
  emit();
}

export function removeItem<K extends keyof State>(
  key: K,
  predicate: (row: State[K][number]) => boolean,
) {
  state = {
    ...state,
    [key]: state[key].filter((row) => !predicate(row)) as State[K],
  };
  emit();
}

export function resetStore() {
  state = makeInitialState();
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

export function nextId(prefix: string, key: keyof State, field = "id"): string {
  const list = state[key] as Array<Record<string, unknown>>;
  const nums = list
    .map((r) => String(r[field] ?? ""))
    .filter((s) => s.startsWith(prefix))
    .map((s) => parseInt(s.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `${prefix}${next}`;
}
