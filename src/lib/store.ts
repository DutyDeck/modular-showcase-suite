import { useSyncExternalStore } from "react";
import {
  students as initialStudents,
  courses as initialCourses,
  assignments as initialAssignments,
  invoices as initialInvoices,
  leads as initialLeads,
  tenants as initialTenants,
  platformUsers as initialPlatformUsers,
  attendanceToday as initialAttendance,
  marketplaceCourses as initialMarketplace,
  messages as initialMessages,
  srbEntries as initialSrb,
} from "./mockData";

export type {
  SrbEntry,
  SrbReply,
  SrbType,
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

import type { SrbEntry } from "./mockData";

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
}

const STORAGE_KEY = "oneedu.store.v2";

function makeInitialState(): State {
  return {
    students: [...initialStudents],
    courses: [...initialCourses],
    assignments: [...initialAssignments],
    invoices: [...initialInvoices],
    leads: [...initialLeads],
    tenants: [...initialTenants],
    platformUsers: [...initialPlatformUsers],
    attendance: [...initialAttendance],
    marketplace: [...initialMarketplace],
    messages: [...initialMessages],
    srb: [...initialSrb],
  };
}

function loadFromStorage(): State {
  if (typeof window === "undefined") return makeInitialState();
  try {
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
    [key]: state[key].map((row) =>
      predicate(row) ? { ...row, ...patch } : row,
    ) as State[K],
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
  const list = state[key] as Array<Record<string, any>>;
  const nums = list
    .map((r) => String(r[field] ?? ""))
    .filter((s) => s.startsWith(prefix))
    .map((s) => parseInt(s.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `${prefix}${next}`;
}
