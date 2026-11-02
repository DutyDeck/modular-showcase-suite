/**
 * Fees additions, regulator returns and integrations — data model + seed.
 *   • FeeAccount: per-learner tuition account with instalment plan, deposits,
 *     registration fee and THIRD-PARTY payers (sponsor, employer, scholarship,
 *     student loan) splitting the bill; optional second pricing currency.
 *   • BankSlip: uploaded bank-transfer proof awaiting finance verification.
 *   • ReturnSubmission: a statutory return run (validate → generate → submit).
 *   • IntegrationConnection: tenant connection to an external system.
 *
 * Money rule: the ledger is ALWAYS in the tenant's currency. A second pricing
 * currency (displayCurrency + fxRate) is for display / price lists only.
 */
import type { RegionCode } from "./regions";

export type PayerType =
  | "Parent / guardian"
  | "Self"
  | "Employer"
  | "Sponsor"
  | "Scholarship"
  | "Student loan"
  | "Government funding";

export const PAYER_TYPES: PayerType[] = [
  "Parent / guardian",
  "Self",
  "Employer",
  "Sponsor",
  "Scholarship",
  "Student loan",
  "Government funding",
];

/** Payer types the family / student pays themselves (vs third parties). */
export const FAMILY_PAYERS: PayerType[] = ["Parent / guardian", "Self"];

export interface FeePayer {
  name: string;
  type: PayerType;
  /** Share of the total, percent. Payers on one account sum to 100. */
  sharePct: number;
  reference?: string; // PO / sponsor letter / SLC ref
}

export type InstalmentStatus =
  | "Paid"
  | "Due"
  | "Overdue"
  | "Pending verification"
  | "Scheduled"
  // Set by approved requests: interruption suspends, withdrawal cancels.
  | "Suspended"
  | "Cancelled";

export interface Instalment {
  id: string;
  label: string; // "Term 1", "Instalment 2 of 6", "Semester 1"
  due: string;
  amount: number;
  payer: string; // FeePayer.name
  status: InstalmentStatus;
  paidAt?: string;
  method?: string;
}

export type FeePlan = "Annual" | "Termly" | "Per semester" | "Monthly instalments";

export interface FeeAccount {
  id: string;
  tenantId: string;
  studentId: string;
  academicYear: string;
  currency: string; // tenant pricing currency
  /** Second pricing currency (e.g. USD price shown alongside AED). */
  displayCurrency?: string;
  fxRate?: number; // 1 unit of currency → displayCurrency
  registrationFee: number;
  deposit: { amount: number; paid: boolean; source?: string };
  tuition: number;
  extras: { label: string; amount: number }[];
  discounts: { label: string; amount: number }[];
  plan: FeePlan;
  payers: FeePayer[];
  instalments: Instalment[];
}

export interface BankSlip {
  id: string;
  tenantId: string;
  accountId: string;
  instalmentId?: string;
  amount: number;
  currency: string;
  bank: string;
  reference: string;
  uploadedBy: string;
  uploadedAt: string;
  fileName: string;
  status: "Pending" | "Verified" | "Rejected";
  verifiedBy?: string;
  note?: string;
}

export type ReturnStatus = "Not started" | "Validated" | "Errors" | "Submitted" | "Accepted";

export interface ReturnSubmission {
  id: string;
  tenantId: string;
  returnKey: string; // RegulatorReturnDef.key
  period: string;
  status: ReturnStatus;
  errors: number;
  warnings: number;
  records: number;
  submittedAt?: string;
  by?: string;
}

export type IntegrationCategory =
  | "Single sign-on"
  | "LMS (LTI 1.3)"
  | "Student records"
  | "School MIS"
  | "Curriculum"
  | "Timetabling"
  | "Payments"
  | "Regulator";

export interface IntegrationDef {
  key: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  /** Packs / segments it's relevant to (empty = all). */
  segments: ("school" | "university" | "college")[];
  /** Regions it's relevant to (absent = all). */
  regions?: RegionCode[];
}

export interface IntegrationConnection {
  id: string;
  tenantId: string;
  key: string; // IntegrationDef.key
  status: "Connected" | "Error" | "Syncing";
  connectedAt: string;
  lastSync?: string;
  detail?: string;
  /** Connection settings captured in the connect dialog (secrets masked). */
  config?: Record<string, string>;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

export function accountBase(a: FeeAccount): number {
  const extras = a.extras.reduce((s, x) => s + x.amount, 0);
  const disc = a.discounts.reduce((s, x) => s + x.amount, 0);
  return a.tuition + extras - disc;
}

/** Amount spread across instalments: base minus the deposit (credited). */
export function instalmentBase(a: FeeAccount): number {
  return Math.max(0, accountBase(a) - a.deposit.amount);
}

export interface AccountTotals {
  billed: number;
  paid: number;
  outstanding: number;
  overdue: number;
  pendingVerification: number;
  byPayer: Record<string, { billed: number; paid: number; type: PayerType }>;
}

export function accountTotals(a: FeeAccount): AccountTotals {
  // Registration fee is collected with the deposit.
  const upfront = a.registrationFee + a.deposit.amount;
  const upfrontPaid = a.deposit.paid ? upfront : 0;
  // Instalments cancelled by an approved withdrawal are no longer billed.
  const cancelled = a.instalments
    .filter((i) => i.status === "Cancelled")
    .reduce((sum, i) => sum + i.amount, 0);
  const billed = a.registrationFee + accountBase(a) - cancelled;
  let paid = upfrontPaid;
  let overdue = 0;
  let pendingVerification = 0;
  const byPayer: AccountTotals["byPayer"] = {};
  for (const p of a.payers) byPayer[p.name] = { billed: 0, paid: 0, type: p.type };
  for (const i of a.instalments) {
    const b = (byPayer[i.payer] ??= { billed: 0, paid: 0, type: "Self" });
    if (i.status === "Cancelled") continue;
    b.billed += i.amount;
    if (i.status === "Paid") {
      paid += i.amount;
      b.paid += i.amount;
    }
    if (i.status === "Overdue") overdue += i.amount;
    if (i.status === "Pending verification") pendingVerification += i.amount;
  }
  // Upfront charges belong to the family payer (first family payer, else first).
  const fam = a.payers.find((p) => FAMILY_PAYERS.includes(p.type)) ?? a.payers[0];
  if (fam && byPayer[fam.name]) {
    byPayer[fam.name].billed += upfront;
    byPayer[fam.name].paid += upfrontPaid;
  }
  return {
    billed,
    paid,
    outstanding: Math.max(0, billed - paid),
    overdue,
    pendingVerification,
    byPayer,
  };
}

export interface Period {
  label: string;
  due: string;
}

/**
 * Build the instalment schedule: every period × every payer, each payer
 * carrying its percentage share. Statuses of matching (payer, period) rows in
 * `previous` are preserved so a re-split never "un-pays" an instalment.
 */
export function buildInstalments(
  a: Pick<FeeAccount, "id" | "payers" | "tuition" | "extras" | "discounts" | "deposit">,
  periods: Period[],
  today: string,
  previous: Instalment[] = [],
): Instalment[] {
  const base = instalmentBase(a as FeeAccount);
  const out: Instalment[] = [];
  periods.forEach((p, pi) => {
    a.payers.forEach((payer, yi) => {
      const prev = previous.find((x) => x.payer === payer.name && x.label === p.label);
      const amount = Math.round((base * payer.sharePct) / 100 / periods.length);
      out.push({
        id: `${a.id}-${pi + 1}-${yi + 1}`,
        label: p.label,
        due: p.due,
        amount,
        payer: payer.name,
        status:
          prev?.status ??
          (p.due < today ? "Overdue" : p.due <= addDays(today, 45) ? "Due" : "Scheduled"),
        paidAt: prev?.paidAt,
        method: prev?.method,
      });
    });
  });
  return out;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(toIso + "T00:00:00Z").getTime() - new Date(fromIso + "T00:00:00Z").getTime()) /
      86_400_000,
  );
}

/** Fixed demo FX table → USD (group reporting currency). */
export const USD_PER: Record<string, number> = {
  USD: 1,
  AED: 0.2723,
  LKR: 0.00333,
  GBP: 1.27,
  AUD: 0.66,
  INR: 0.012,
  SGD: 0.74,
  MYR: 0.22,
  SAR: 0.2667,
  QAR: 0.2747,
};

/* ── Seed: fee accounts ──────────────────────────────────────────────────── */

const TODAY = "2026-11-02";

interface Spec {
  id: string;
  tenantId: string;
  studentId: string;
  year: string;
  currency: string;
  display?: { currency: string; fx: number };
  reg: number;
  deposit: FeeAccount["deposit"];
  tuition: number;
  extras?: FeeAccount["extras"];
  discounts?: FeeAccount["discounts"];
  plan: FeePlan;
  payers: FeePayer[];
  periods: Period[];
  /** Status per period index (applies to every payer) unless overridden. */
  statuses: InstalmentStatus[];
  /** "payerIdx-periodIdx" → status. */
  overrides?: Record<string, InstalmentStatus>;
}

function make(s: Spec): FeeAccount {
  const a: FeeAccount = {
    id: s.id,
    tenantId: s.tenantId,
    studentId: s.studentId,
    academicYear: s.year,
    currency: s.currency,
    displayCurrency: s.display?.currency,
    fxRate: s.display?.fx,
    registrationFee: s.reg,
    deposit: s.deposit,
    tuition: s.tuition,
    extras: s.extras ?? [],
    discounts: s.discounts ?? [],
    plan: s.plan,
    payers: s.payers,
    instalments: [],
  };
  a.instalments = buildInstalments(a, s.periods, TODAY).map((i) => {
    const [, pi, yi] = i.id.slice(a.id.length).split("-").map(Number);
    const st = s.overrides?.[`${yi - 1}-${pi - 1}`] ?? s.statuses[pi - 1] ?? i.status;
    return {
      ...i,
      status: st,
      paidAt: st === "Paid" ? addDays(i.due, -3) : undefined,
      method:
        st === "Paid"
          ? FAMILY_PAYERS.includes(s.payers[yi - 1].type)
            ? "Card"
            : "Bank transfer"
          : undefined,
    };
  });
  return a;
}

const AED_USD = { currency: "USD", fx: 0.2723 };
const MERIDIAN_TERMS: Period[] = [
  { label: "Term 1", due: "2026-08-15" },
  { label: "Term 2", due: "2026-12-10" },
  { label: "Term 3", due: "2027-03-31" },
];
const CBSE_TERMS: Period[] = [
  { label: "Term 1", due: "2026-04-01" },
  { label: "Term 2", due: "2026-10-01" },
];
const MONTHLY_MERIDIAN: Period[] = [
  "2026-08-25",
  "2026-09-25",
  "2026-10-25",
  "2026-11-25",
  "2026-12-25",
  "2027-01-25",
  "2027-02-25",
  "2027-03-25",
  "2027-04-25",
  "2027-05-25",
].map((due, i) => ({ label: `Instalment ${i + 1} of 10`, due }));
const parent = (name: string): FeePayer => ({ name, type: "Parent / guardian", sharePct: 100 });
const meridianDeposit = { amount: 5000, paid: true, source: "Admissions — seat deposit" };

const t009: FeeAccount[] = [
  make({
    // Early years (FS2) — lower tuition band.
    id: "FA-3011",
    tenantId: "T-009",
    studentId: "S-3011",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 52600,
    plan: "Termly",
    payers: [parent("Rana Haddad")],
    periods: MERIDIAN_TERMS,
    statuses: ["Paid", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3001",
    tenantId: "T-009",
    studentId: "S-3001",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 78400,
    extras: [{ label: "School bus — Zone B", amount: 7200 }],
    plan: "Termly",
    payers: [parent("Sarah Khan")],
    periods: MERIDIAN_TERMS,
    statuses: ["Paid", "Pending verification", "Scheduled"],
  }),
  make({
    id: "FA-3002",
    tenantId: "T-009",
    studentId: "S-3002",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 42600,
    extras: [{ label: "School bus — Zone B", amount: 7200 }],
    discounts: [{ label: "Sibling discount (10%)", amount: 4260 }],
    plan: "Termly",
    payers: [parent("Sarah Khan")],
    periods: CBSE_TERMS,
    statuses: ["Paid", "Overdue"],
  }),
  make({
    id: "FA-3003",
    tenantId: "T-009",
    studentId: "S-3003",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 78400,
    plan: "Termly",
    payers: [parent("Rana Haddad")],
    periods: MERIDIAN_TERMS,
    statuses: ["Overdue", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3004",
    tenantId: "T-009",
    studentId: "S-3004",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 96500,
    extras: [{ label: "IB DP registration & exam fees", amount: 4300 }],
    discounts: [{ label: "Sibling discount (5%)", amount: 4825 }],
    plan: "Termly",
    payers: [parent("Rana Haddad")],
    periods: MERIDIAN_TERMS,
    statuses: ["Paid", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3005",
    tenantId: "T-009",
    studentId: "S-3005",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 78400,
    plan: "Monthly instalments",
    payers: [parent("Tom Morgan")],
    periods: MONTHLY_MERIDIAN,
    statuses: [
      "Paid",
      "Paid",
      "Paid",
      "Due",
      "Scheduled",
      "Scheduled",
      "Scheduled",
      "Scheduled",
      "Scheduled",
      "Scheduled",
    ],
  }),
  make({
    id: "FA-3006",
    tenantId: "T-009",
    studentId: "S-3006",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 89200,
    extras: [{ label: "Science lab & practicals", amount: 1500 }],
    plan: "Termly",
    payers: [parent("Meera Iyer")],
    periods: MERIDIAN_TERMS,
    statuses: ["Pending verification", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3007",
    tenantId: "T-009",
    studentId: "S-3007",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 78400,
    plan: "Termly",
    payers: [
      { name: "Khalid Rahman", type: "Parent / guardian", sharePct: 40 },
      {
        name: "Emirates Aviation Group — education allowance",
        type: "Employer",
        sharePct: 60,
        reference: "EDU-ALW-2026-4471",
      },
    ],
    periods: MERIDIAN_TERMS,
    statuses: ["Paid", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3008",
    tenantId: "T-009",
    studentId: "S-3008",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 78400,
    extras: [{ label: "Learning support (IEP) — 2 sessions / week", amount: 9800 }],
    discounts: [{ label: "Meridian bursary (25% tuition)", amount: 19600 }],
    plan: "Termly",
    payers: [parent("Grace Okafor")],
    periods: MERIDIAN_TERMS,
    statuses: ["Paid", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3009",
    tenantId: "T-009",
    studentId: "S-3009",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: meridianDeposit,
    tuition: 96500,
    extras: [{ label: "IB DP registration & exam fees", amount: 4300 }],
    plan: "Termly",
    payers: [
      { name: "Sumikawa Trading FZE", type: "Employer", sharePct: 100, reference: "PO-SUM-88120" },
    ],
    periods: MERIDIAN_TERMS,
    statuses: ["Paid", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3010",
    tenantId: "T-009",
    studentId: "S-3010",
    year: "2026–27",
    currency: "AED",
    display: AED_USD,
    reg: 1050,
    deposit: { amount: 5000, paid: false, source: "Admissions — seat deposit" },
    tuition: 42600,
    plan: "Termly",
    payers: [parent("Neha Shah")],
    periods: CBSE_TERMS,
    statuses: ["Paid", "Due"],
  }),
];

const COLOMBO_TERMS: Period[] = [
  { label: "Term 1", due: "2026-08-25" },
  { label: "Term 2", due: "2026-12-20" },
  { label: "Term 3", due: "2027-04-10" },
];
const t012: FeeAccount[] = [
  make({
    id: "FA-3101",
    tenantId: "T-012",
    studentId: "S-3101",
    year: "2026–27",
    currency: "LKR",
    reg: 75000,
    deposit: { amount: 150000, paid: true, source: "Admissions — refundable deposit" },
    tuition: 1450000,
    plan: "Termly",
    payers: [parent("Dilani Perera")],
    periods: COLOMBO_TERMS,
    statuses: ["Paid", "Pending verification", "Scheduled"],
  }),
  make({
    id: "FA-3102",
    tenantId: "T-012",
    studentId: "S-3102",
    year: "2026–27",
    currency: "LKR",
    reg: 75000,
    deposit: { amount: 150000, paid: true },
    tuition: 1680000,
    extras: [{ label: "Cambridge A Level exam entries", amount: 210000 }],
    plan: "Termly",
    payers: [parent("Ruwan Fernando")],
    periods: COLOMBO_TERMS,
    statuses: ["Paid", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3103",
    tenantId: "T-012",
    studentId: "S-3103",
    year: "2026–27",
    currency: "LKR",
    reg: 75000,
    deposit: { amount: 150000, paid: true },
    tuition: 1450000,
    discounts: [{ label: "Academic scholarship (30%)", amount: 435000 }],
    plan: "Termly",
    payers: [parent("Chamari Silva")],
    periods: COLOMBO_TERMS,
    statuses: ["Overdue", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3104",
    tenantId: "T-012",
    studentId: "S-3104",
    year: "2026–27",
    currency: "LKR",
    reg: 75000,
    deposit: { amount: 150000, paid: true },
    tuition: 1680000,
    plan: "Termly",
    payers: [parent("Nimali Jayasuriya")],
    periods: COLOMBO_TERMS,
    statuses: ["Paid", "Due", "Scheduled"],
  }),
  make({
    // Early years (Upper Nursery) — half-day sessions, lower band.
    id: "FA-3106",
    tenantId: "T-012",
    studentId: "S-3106",
    year: "2026–27",
    currency: "LKR",
    reg: 40000,
    deposit: { amount: 80000, paid: true },
    tuition: 620000,
    plan: "Termly",
    payers: [parent("Dilani Perera")],
    periods: COLOMBO_TERMS,
    statuses: ["Paid", "Due", "Scheduled"],
  }),
  make({
    id: "FA-3105",
    tenantId: "T-012",
    studentId: "S-3105",
    year: "2026–27",
    currency: "LKR",
    reg: 60000,
    deposit: { amount: 120000, paid: true },
    tuition: 980000,
    plan: "Termly",
    payers: [parent("Dilani Perera")],
    periods: COLOMBO_TERMS,
    statuses: ["Paid", "Due", "Scheduled"],
  }),
];

const NB_SEM: Period[] = [
  { label: "Semester 1", due: "2026-09-21" },
  { label: "Semester 2", due: "2027-01-25" },
];
const SLC = (ref: string): FeePayer => ({
  name: "Student Finance England",
  type: "Student loan",
  sharePct: 100,
  reference: ref,
});
const t010: FeeAccount[] = [
  make({
    id: "FA-4001",
    tenantId: "T-010",
    studentId: "S-4001",
    year: "2026/27",
    currency: "GBP",
    reg: 0,
    deposit: { amount: 6000, paid: true, source: "Admissions — CAS deposit (APP-1004)" },
    tuition: 24500,
    plan: "Per semester",
    payers: [{ name: "Arjun Mehta", type: "Self", sharePct: 100 }],
    periods: NB_SEM,
    statuses: ["Paid", "Scheduled"],
  }),
  make({
    id: "FA-4002",
    tenantId: "T-010",
    studentId: "S-4002",
    year: "2026/27",
    currency: "GBP",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 9535,
    plan: "Per semester",
    payers: [SLC("SLC CRN 11829473")],
    periods: NB_SEM,
    statuses: ["Paid", "Scheduled"],
  }),
  make({
    id: "FA-4003",
    tenantId: "T-010",
    studentId: "S-4003",
    year: "2026/27",
    currency: "GBP",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 9535,
    plan: "Per semester",
    payers: [SLC("SLC CRN 11904221")],
    periods: NB_SEM,
    statuses: ["Paid", "Scheduled"],
  }),
  make({
    id: "FA-4004",
    tenantId: "T-010",
    studentId: "S-4004",
    year: "2026/27",
    currency: "GBP",
    reg: 0,
    deposit: { amount: 6000, paid: true, source: "Admissions — CAS deposit" },
    tuition: 24500,
    plan: "Per semester",
    payers: [{ name: "Chen Wei", type: "Self", sharePct: 100 }],
    periods: NB_SEM,
    statuses: ["Overdue", "Scheduled"],
  }),
  make({
    id: "FA-4005",
    tenantId: "T-010",
    studentId: "S-4005",
    year: "2026/27",
    currency: "GBP",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 9535,
    plan: "Per semester",
    payers: [SLC("SLC CRN 12001877")],
    periods: NB_SEM,
    statuses: ["Paid", "Scheduled"],
  }),
  make({
    id: "FA-4006",
    tenantId: "T-010",
    studentId: "S-4006",
    year: "2026/27",
    currency: "GBP",
    reg: 0,
    deposit: { amount: 4000, paid: true, source: "Admissions — CAS deposit (APP-1009)" },
    tuition: 27000,
    plan: "Per semester",
    payers: [
      {
        name: "Commonwealth Shared Scholarship",
        type: "Scholarship",
        sharePct: 50,
        reference: "CSS award PKCS-2026-118",
      },
      { name: "Fatima Noor", type: "Self", sharePct: 50 },
    ],
    periods: NB_SEM,
    statuses: ["Paid", "Scheduled"],
    overrides: { "1-0": "Pending verification" },
  }),
  make({
    id: "FA-4007",
    tenantId: "T-010",
    studentId: "S-4007",
    year: "2026/27",
    currency: "GBP",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 9535,
    plan: "Per semester",
    payers: [SLC("SLC CRN 13020045")],
    periods: NB_SEM,
    statuses: ["Due", "Scheduled"],
  }),
  make({
    id: "FA-4009",
    tenantId: "T-010",
    studentId: "S-4009",
    year: "2026/27",
    currency: "GBP",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 12500,
    plan: "Per semester",
    payers: [
      {
        name: "Northwind Analytics Ltd",
        type: "Employer",
        sharePct: 100,
        reference: "PO-NW-22841",
      },
    ],
    periods: NB_SEM,
    statuses: ["Paid", "Scheduled"],
  }),
  make({
    id: "FA-4010",
    tenantId: "T-010",
    studentId: "S-4010",
    year: "2026/27",
    currency: "GBP",
    reg: 0,
    deposit: { amount: 6000, paid: true, source: "Admissions — CAS deposit" },
    tuition: 24500,
    plan: "Monthly instalments",
    payers: [{ name: "Ananya Rao", type: "Self", sharePct: 100 }],
    periods: [
      "2026-09-21",
      "2026-10-21",
      "2026-11-21",
      "2026-12-21",
      "2027-01-21",
      "2027-02-21",
    ].map((due, i) => ({ label: `Instalment ${i + 1} of 6`, due })),
    statuses: ["Paid", "Paid", "Due", "Scheduled", "Scheduled", "Scheduled"],
  }),
];

const VET_TERMS: Period[] = [
  { label: "Term 1", due: "2026-01-20" },
  { label: "Term 2", due: "2026-04-20" },
  { label: "Term 3", due: "2026-07-13" },
  { label: "Term 4", due: "2026-10-05" },
];
const HE_SEM_AU: Period[] = [
  { label: "Semester 1 (census 31 Mar)", due: "2026-03-31" },
  { label: "Semester 2 (census 31 Aug)", due: "2026-08-31" },
];
const SNS: FeePayer = {
  name: "Smart and Skilled (NSW Government)",
  type: "Government funding",
  sharePct: 100,
  reference: "SNS contract 2026-HC-0412",
};
const t011: FeeAccount[] = [
  make({
    id: "FA-5001",
    tenantId: "T-011",
    studentId: "S-5001",
    year: "2026",
    currency: "AUD",
    reg: 250,
    deposit: { amount: 2000, paid: true, source: "Admissions — CoE prepaid fees" },
    tuition: 16800,
    extras: [
      { label: "Overseas Student Health Cover (OSHC)", amount: 650 },
      { label: "Materials & resources", amount: 400 },
    ],
    plan: "Termly",
    payers: [{ name: "Sakura Tanaka", type: "Self", sharePct: 100 }],
    periods: VET_TERMS,
    statuses: ["Paid", "Paid", "Paid", "Overdue"],
  }),
  make({
    id: "FA-5002",
    tenantId: "T-011",
    studentId: "S-5002",
    year: "2026",
    currency: "AUD",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 7400,
    plan: "Termly",
    payers: [
      { ...SNS, sharePct: 85 },
      {
        name: "Coastline Electrical Pty Ltd",
        type: "Employer",
        sharePct: 15,
        reference: "Training contract NSW-TC-77120",
      },
    ],
    periods: VET_TERMS,
    statuses: ["Paid", "Paid", "Paid", "Due"],
  }),
  make({
    id: "FA-5003",
    tenantId: "T-011",
    studentId: "S-5003",
    year: "2026",
    currency: "AUD",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 5900,
    plan: "Termly",
    payers: [{ ...SNS, name: "Fee-Free TAFE (NSW Government)", reference: "FFT-2026-3391" }],
    periods: VET_TERMS,
    statuses: ["Paid", "Paid", "Paid", "Paid"],
  }),
  make({
    id: "FA-5004",
    tenantId: "T-011",
    studentId: "S-5004",
    year: "2026",
    currency: "AUD",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 9537,
    plan: "Per semester",
    payers: [
      {
        name: "HECS-HELP (Australian Government)",
        type: "Student loan",
        sharePct: 100,
        reference: "eCAF 2026-HC-5512",
      },
    ],
    periods: HE_SEM_AU,
    statuses: ["Paid", "Paid"],
  }),
  make({
    id: "FA-5005",
    tenantId: "T-011",
    studentId: "S-5005",
    year: "2026",
    currency: "AUD",
    reg: 250,
    deposit: { amount: 3000, paid: true, source: "Admissions — CoE prepaid fees" },
    tuition: 35000,
    extras: [{ label: "Overseas Student Health Cover (OSHC)", amount: 650 }],
    plan: "Per semester",
    payers: [{ name: "Ishaan Kapoor", type: "Self", sharePct: 100 }],
    periods: HE_SEM_AU,
    statuses: ["Paid", "Overdue"],
  }),
  make({
    id: "FA-5006",
    tenantId: "T-011",
    studentId: "S-5006",
    year: "2026",
    currency: "AUD",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 19800,
    plan: "Termly",
    payers: [
      {
        name: "VET Student Loans (Australian Government)",
        type: "Student loan",
        sharePct: 100,
        reference: "VSL eCAF 2026-0098",
      },
    ],
    periods: VET_TERMS,
    statuses: ["Paid", "Paid", "Paid", "Due"],
  }),
  make({
    id: "FA-5007",
    tenantId: "T-011",
    studentId: "S-5007",
    year: "2026",
    currency: "AUD",
    reg: 0,
    deposit: { amount: 0, paid: true },
    tuition: 6900,
    plan: "Termly",
    payers: [
      { ...SNS, sharePct: 85 },
      {
        name: "Harbour Build Co",
        type: "Employer",
        sharePct: 15,
        reference: "Training contract NSW-TC-80455",
      },
    ],
    periods: VET_TERMS,
    statuses: ["Paid", "Paid", "Due", "Due"],
  }),
  make({
    id: "FA-5008",
    tenantId: "T-011",
    studentId: "S-5008",
    year: "2026",
    currency: "AUD",
    reg: 250,
    deposit: { amount: 0, paid: true },
    tuition: 9800,
    plan: "Monthly instalments",
    payers: [{ name: "Ella Brooks", type: "Self", sharePct: 100 }],
    periods: [
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
    ].map((due, i) => ({ label: `Instalment ${i + 1} of 10`, due })),
    statuses: [
      "Paid",
      "Paid",
      "Paid",
      "Paid",
      "Paid",
      "Paid",
      "Paid",
      "Paid",
      "Pending verification",
      "Scheduled",
    ],
  }),
];

export const feeAccounts: FeeAccount[] = [...t009, ...t012, ...t010, ...t011];

const inst = (acct: string, label: string, payerIdx = 0): string => {
  const a = feeAccounts.find((x) => x.id === acct)!;
  const payer = a.payers[payerIdx].name;
  return a.instalments.find((i) => i.label === label && i.payer === payer)!.id;
};
const amt = (id: string) =>
  feeAccounts.flatMap((a) => a.instalments).find((i) => i.id === id)!.amount;

export const bankSlips: BankSlip[] = [
  {
    id: "BS-0901",
    tenantId: "T-009",
    accountId: "FA-3001",
    instalmentId: inst("FA-3001", "Term 2"),
    amount: amt(inst("FA-3001", "Term 2")),
    currency: "AED",
    bank: "Emirates NBD",
    reference: "ENBD-TRF-88172034",
    uploadedBy: "Sarah Khan",
    uploadedAt: "2026-10-30T09:14:00Z",
    fileName: "ENBD_transfer_Zara_T2.pdf",
    status: "Pending",
  },
  {
    id: "BS-0902",
    tenantId: "T-009",
    accountId: "FA-3006",
    instalmentId: inst("FA-3006", "Term 1"),
    amount: amt(inst("FA-3006", "Term 1")),
    currency: "AED",
    bank: "Mashreq",
    reference: "MSHQ-552019873",
    uploadedBy: "Meera Iyer",
    uploadedAt: "2026-10-28T16:40:00Z",
    fileName: "mashreq_slip_rohan.jpg",
    status: "Pending",
  },
  {
    id: "BS-0903",
    tenantId: "T-009",
    accountId: "FA-3004",
    instalmentId: inst("FA-3004", "Term 1"),
    amount: amt(inst("FA-3004", "Term 1")),
    currency: "AED",
    bank: "ADCB",
    reference: "ADCB-77100345",
    uploadedBy: "Rana Haddad",
    uploadedAt: "2026-08-12T10:05:00Z",
    fileName: "adcb_layla_term1.pdf",
    status: "Verified",
    verifiedBy: "Finance Office",
  },
  {
    id: "BS-1201",
    tenantId: "T-012",
    accountId: "FA-3101",
    instalmentId: inst("FA-3101", "Term 2"),
    amount: amt(inst("FA-3101", "Term 2")),
    currency: "LKR",
    bank: "Commercial Bank of Ceylon",
    reference: "CEFT 0041188920",
    uploadedBy: "Dilani Perera",
    uploadedAt: "2026-11-01T07:22:00Z",
    fileName: "combank_ceft_nethmi.png",
    status: "Pending",
  },
  {
    id: "BS-1001",
    tenantId: "T-010",
    accountId: "FA-4006",
    instalmentId: inst("FA-4006", "Semester 1", 1),
    amount: amt(inst("FA-4006", "Semester 1", 1)),
    currency: "GBP",
    bank: "Habib Bank (international transfer)",
    reference: "SWIFT HABBPKKA 20261027-114",
    uploadedBy: "Fatima Noor",
    uploadedAt: "2026-10-27T12:10:00Z",
    fileName: "hbl_swift_confirmation.pdf",
    status: "Pending",
  },
  {
    id: "BS-1101",
    tenantId: "T-011",
    accountId: "FA-5008",
    instalmentId: inst("FA-5008", "Instalment 9 of 10"),
    amount: amt(inst("FA-5008", "Instalment 9 of 10")),
    currency: "AUD",
    bank: "Commonwealth Bank",
    reference: "CBA-NETBANK-4410928",
    uploadedBy: "Ella Brooks",
    uploadedAt: "2026-11-01T21:03:00Z",
    fileName: "cba_receipt_nov.pdf",
    status: "Pending",
  },
  {
    id: "BS-1102",
    tenantId: "T-011",
    accountId: "FA-5001",
    instalmentId: inst("FA-5001", "Term 4"),
    amount: 3200,
    currency: "AUD",
    bank: "MUFG (international transfer)",
    reference: "MUFG-TT-20261012",
    uploadedBy: "Sakura Tanaka",
    uploadedAt: "2026-10-12T03:30:00Z",
    fileName: "mufg_tt_term4.pdf",
    status: "Rejected",
    verifiedBy: "Finance Office",
    note: "Amount received does not match the instalment — part-payment, please transfer the balance.",
  },
];

/* ── Seed: regulator return submissions ──────────────────────────────────── */

export const returnSubmissions: ReturnSubmission[] = [
  {
    id: "RS-1001",
    tenantId: "T-010",
    returnKey: "hesa-df",
    period: "2025/26 — reference period 3",
    status: "Accepted",
    errors: 0,
    warnings: 4,
    records: 17820,
    submittedAt: "2026-07-14T10:00:00Z",
    by: "Dr. Eleanor Hughes",
  },
  {
    id: "RS-1002",
    tenantId: "T-010",
    returnKey: "ukvi",
    period: "Event — non-enrolment (Sep 2026 intake)",
    status: "Submitted",
    errors: 0,
    warnings: 0,
    records: 3,
    submittedAt: "2026-10-09T15:20:00Z",
    by: "Compliance Office",
  },
  {
    id: "RS-1003",
    tenantId: "T-010",
    returnKey: "ukvi",
    period: "Event — withdrawal (Aug 2026)",
    status: "Accepted",
    errors: 0,
    warnings: 0,
    records: 1,
    submittedAt: "2026-08-21T11:00:00Z",
    by: "Compliance Office",
  },
  {
    id: "RS-1101",
    tenantId: "T-011",
    returnKey: "avetmiss",
    period: "2025 full-year (NCVER)",
    status: "Accepted",
    errors: 0,
    warnings: 12,
    records: 4120,
    submittedAt: "2026-02-20T09:00:00Z",
    by: "Liam O'Connor",
  },
  {
    id: "RS-1102",
    tenantId: "T-011",
    returnKey: "tcsi",
    period: "2026 Semester 2 census",
    status: "Submitted",
    errors: 0,
    warnings: 2,
    records: 612,
    submittedAt: "2026-09-12T04:30:00Z",
    by: "Liam O'Connor",
  },
  {
    id: "RS-1103",
    tenantId: "T-011",
    returnKey: "prisms",
    period: "Event — unsatisfactory attendance warning",
    status: "Accepted",
    errors: 0,
    warnings: 0,
    records: 1,
    submittedAt: "2026-09-30T02:00:00Z",
    by: "International Office",
  },
  {
    id: "RS-0901",
    tenantId: "T-009",
    returnKey: "khda",
    period: "Term 1 2026–27 enrolment",
    status: "Accepted",
    errors: 0,
    warnings: 3,
    records: 1460,
    submittedAt: "2026-09-28T08:00:00Z",
    by: "Hannah Clarke",
  },
  {
    id: "RS-1201",
    tenantId: "T-012",
    returnKey: "moe-census",
    period: "2026 Annual School Census",
    status: "Accepted",
    errors: 0,
    warnings: 1,
    records: 820,
    submittedAt: "2026-03-25T06:00:00Z",
    by: "Registrar's Office",
  },
];

/* ── Integrations catalogue ──────────────────────────────────────────────── */

export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: "entra",
    name: "Microsoft Entra ID",
    category: "Single sign-on",
    description: "SSO for staff and students with Microsoft 365 accounts (OIDC / SAML).",
    segments: [],
  },
  {
    key: "google",
    name: "Google Workspace for Education",
    category: "Single sign-on",
    description: "Sign in with school Google accounts; roster sync to Classroom.",
    segments: [],
  },
  {
    key: "shibboleth-ukaf",
    name: "Shibboleth — UK Access Federation",
    category: "Single sign-on",
    description: "SAML 2.0 federated sign-in for UK universities and colleges.",
    segments: ["university", "college"],
    regions: ["UK"],
  },
  {
    key: "shibboleth-aaf",
    name: "Shibboleth — Australian Access Federation (AAF)",
    category: "Single sign-on",
    description: "SAML 2.0 federated sign-in for Australian higher education.",
    segments: ["university", "college"],
    regions: ["AU"],
  },
  {
    key: "saml",
    name: "Generic SAML 2.0 IdP",
    category: "Single sign-on",
    description: "Any SAML 2.0 identity provider (ADFS, Okta, Ping).",
    segments: [],
  },
  {
    key: "oidc",
    name: "OpenID Connect",
    category: "Single sign-on",
    description: "Any standards-based OIDC provider.",
    segments: [],
  },
  {
    key: "moodle",
    name: "Moodle (LTI 1.3 Advantage)",
    category: "LMS (LTI 1.3)",
    description: "Launch Moodle courses, sync rosters (NRPS) and return grades (AGS).",
    segments: [],
  },
  {
    key: "canvas",
    name: "Canvas (LTI 1.3 Advantage)",
    category: "LMS (LTI 1.3)",
    description: "Deep linking, roster and grade passback with Instructure Canvas.",
    segments: [],
  },
  {
    key: "blackboard",
    name: "Blackboard Learn (LTI 1.3)",
    category: "LMS (LTI 1.3)",
    description: "Course launch and grade passback with Anthology Blackboard.",
    segments: ["university", "college"],
  },
  {
    key: "d2l",
    name: "D2L Brightspace (LTI 1.3)",
    category: "LMS (LTI 1.3)",
    description: "Course launch and grade passback with Brightspace.",
    segments: ["university", "college", "school"],
  },
  {
    key: "sits",
    name: "Tribal SITS:Vision",
    category: "Student records",
    description: "Two-way sync of students, module occurrences, marks and awards.",
    segments: ["university"],
    regions: ["UK", "AU", "AE", "SG", "MY"],
  },
  {
    key: "banner",
    name: "Ellucian Banner",
    category: "Student records",
    description: "Students, sections, registrations and grades via Ethos APIs.",
    segments: ["university", "college"],
  },
  {
    key: "peoplesoft",
    name: "Oracle PeopleSoft Campus Solutions",
    category: "Student records",
    description: "Students, class enrolment and grades.",
    segments: ["university"],
  },
  {
    key: "isams",
    name: "iSAMS",
    category: "School MIS",
    description: "Pupils, families, sets and reports for independent & international schools.",
    segments: ["school"],
  },
  {
    key: "sims",
    name: "SIMS",
    category: "School MIS",
    description: "Pupil and attendance data for schools in England.",
    segments: ["school"],
    regions: ["UK"],
  },
  {
    key: "arbor",
    name: "Arbor",
    category: "School MIS",
    description: "Cloud MIS for UK schools — pupils, attendance, behaviour.",
    segments: ["school"],
    regions: ["UK"],
  },
  {
    key: "engage",
    name: "Engage (Groupcall / iSAMS)",
    category: "School MIS",
    description: "MIS widely used by international schools in the Gulf and Asia.",
    segments: ["school"],
  },
  {
    key: "managebac",
    name: "IB ManageBac",
    category: "Curriculum",
    description: "IB planners, CAS, Extended Essay and IB entries.",
    segments: ["school"],
  },
  {
    key: "toddle",
    name: "Toddle",
    category: "Curriculum",
    description: "IB & international curriculum planning and portfolios.",
    segments: ["school"],
  },
  {
    key: "asc",
    name: "aSc Timetables",
    category: "Timetabling",
    description: "Import period timetables, rooms and staff.",
    segments: ["school"],
  },
  {
    key: "untis",
    name: "Untis",
    category: "Timetabling",
    description: "Import timetables and daily substitution (cover) plans.",
    segments: ["school", "college"],
  },
  {
    key: "celcat",
    name: "Celcat",
    category: "Timetabling",
    description: "University timetabling and attendance events.",
    segments: ["university", "college"],
  },
  {
    key: "scientia",
    name: "Scientia Syllabus Plus",
    category: "Timetabling",
    description: "Enterprise HE timetabling and room booking.",
    segments: ["university"],
  },
  {
    key: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Card and wallet payments with automated reconciliation.",
    segments: [],
  },
  {
    key: "gocardless",
    name: "GoCardless",
    category: "Payments",
    description: "Direct Debit instalments.",
    segments: [],
    regions: ["UK", "AU"],
  },
  {
    key: "flywire",
    name: "Flywire",
    category: "Payments",
    description: "International student payments in home currency.",
    segments: ["university", "college", "school"],
  },
  {
    key: "payhere",
    name: "PayHere",
    category: "Payments",
    description: "Sri Lankan cards, eZ Cash and bank payments.",
    segments: [],
    regions: ["LK"],
  },
  {
    key: "network",
    name: "Network International",
    category: "Payments",
    description: "UAE card acquiring and payment links.",
    segments: [],
    regions: ["AE"],
  },
  {
    key: "razorpay",
    name: "Razorpay",
    category: "Payments",
    description: "UPI, cards and netbanking in India.",
    segments: [],
    regions: ["IN"],
  },
  {
    key: "esis",
    name: "ADEK eSIS connector",
    category: "Regulator",
    description: "Certified daily sync of students, attendance and assessment to ADEK (Abu Dhabi).",
    segments: ["school"],
    regions: ["AE"],
  },
  {
    key: "lrs",
    name: "Learning Records Service (ULN lookup)",
    category: "Regulator",
    description: "Find / verify ULNs and personal learning records.",
    segments: ["college", "university", "school"],
    regions: ["UK"],
  },
  {
    key: "usi",
    name: "USI Registry",
    category: "Regulator",
    description: "Verify Unique Student Identifiers and access transcripts.",
    segments: ["college", "university"],
    regions: ["AU"],
  },
];

export const integrationConnections: IntegrationConnection[] = [
  {
    id: "IC-1001",
    tenantId: "T-010",
    key: "shibboleth-ukaf",
    status: "Connected",
    connectedAt: "2026-06-02T09:00:00Z",
    lastSync: "2026-11-02T06:00:00Z",
    detail: "Entity ID https://idp.northbridge.ac.uk/shibboleth",
    config: { "Entity ID": "https://idp.northbridge.ac.uk/shibboleth" },
  },
  {
    id: "IC-1002",
    tenantId: "T-010",
    key: "moodle",
    status: "Connected",
    connectedAt: "2026-06-10T09:00:00Z",
    lastSync: "2026-11-02T05:30:00Z",
    detail: "142 module occurrences linked · grade passback on",
    config: { "Client ID": "nb-moodle-7781" },
  },
  {
    id: "IC-1003",
    tenantId: "T-010",
    key: "sits",
    status: "Error",
    connectedAt: "2026-07-01T09:00:00Z",
    lastSync: "2026-11-01T22:00:00Z",
    detail: "Field mapping: MODULE_OCCURRENCE missing",
    config: { "API base URL": "https://sits.northbridge.ac.uk/api" },
  },
  {
    id: "IC-0901",
    tenantId: "T-009",
    key: "entra",
    status: "Connected",
    connectedAt: "2026-05-20T09:00:00Z",
    lastSync: "2026-11-02T04:00:00Z",
    detail: "Tenant meridian.ae · 1,612 accounts",
  },
  {
    id: "IC-0902",
    tenantId: "T-009",
    key: "managebac",
    status: "Connected",
    connectedAt: "2026-08-18T09:00:00Z",
    lastSync: "2026-11-01T20:00:00Z",
    detail: "DP & MYP classes, CAS records",
  },
  {
    id: "IC-0903",
    tenantId: "T-009",
    key: "network",
    status: "Connected",
    connectedAt: "2026-06-01T09:00:00Z",
    lastSync: "2026-11-02T07:10:00Z",
    detail: "Outlet MERIDIAN-DXB-01 · AED settlement",
  },
  {
    id: "IC-1101",
    tenantId: "T-011",
    key: "canvas",
    status: "Connected",
    connectedAt: "2026-01-15T09:00:00Z",
    lastSync: "2026-11-02T03:00:00Z",
    detail: "Deployment harbourside-prod · 96 courses",
  },
  {
    id: "IC-1102",
    tenantId: "T-011",
    key: "usi",
    status: "Connected",
    connectedAt: "2026-01-10T09:00:00Z",
    lastSync: "2026-11-01T23:00:00Z",
    detail: "Verified 3,880 / 3,900 USIs",
  },
];
