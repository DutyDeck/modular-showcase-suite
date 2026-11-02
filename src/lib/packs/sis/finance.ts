/* ── Fees completion: bank-statement reconciliation, payment reminders. ────
 * Contract + seed + the pure rules production must reproduce:
 *   • matchStatementLine() — auto-match a bank line to open fee items.
 *   • remindersDue()       — which instalments each reminder rule hits today.
 * Posting (marking instalments paid, receipts, notifications) lives in the
 * Fees page and goes through notify() / logChange() in ./activity.ts. */
import type { Channel } from "./shared";
import {
  daysBetween,
  feeAccounts,
  FAMILY_PAYERS,
  type BankSlip,
  type FeeAccount,
  type InstalmentStatus,
  type PayerType,
} from "../bizData";

/** One fee item a bank line was allocated to (several for bulk remittances). */
export interface StatementAllocation {
  kind: "slip" | "instalment";
  id: string; // slip id or instalment id
  accountId: string;
  instalmentId: string;
  amount: number;
}

export interface BankStatementLine {
  id: string;
  tenantId: string;
  importBatch: string; // e.g. "BS-2026-11-02 (Commercial Bank CSV)"
  date: string;
  reference: string; // narrative / reference on the bank line
  payer: string;
  amount: number;
  currency: string;
  status: "Unmatched" | "Matched" | "Review" | "Ignored";
  /** What the line was matched to: a bank slip or an instalment. */
  matched?: { kind: "slip" | "instalment"; id: string; by: string; at: string };
  /** Every item the line paid — one, or several for a bulk remittance. */
  allocations?: StatementAllocation[];
  note?: string;
}

/** Reminder rules per tenant, and the reminders they produced. */
export interface ReminderRule {
  id: string;
  tenantId: string;
  label: string; // "7 days before due", "On due date", "7 days overdue"
  offsetDays: number; // negative = before due date
  channels: Channel[];
  active: boolean;
}

export interface PaymentReminder {
  id: string;
  tenantId: string;
  feeAccountId: string;
  instalmentId: string;
  studentId: string;
  ruleId: string; // ReminderRule.id, or "manual" for a one-off send
  channel: Channel;
  to: string;
  sentAt: string;
  amount?: number;
}

/* ── Pure rules ──────────────────────────────────────────────────────────── */

/** Instalment statuses nobody should be chased or matched for. */
export const CLOSED_STATUSES: InstalmentStatus[] = ["Paid", "Suspended", "Cancelled"];

/** An open fee item a payment can settle (a pending slip wins over its instalment). */
export interface OpenItem extends StatementAllocation {
  studentId: string;
  payer: string;
  payerType: PayerType;
  payerRef?: string;
  label: string;
  due: string;
  status: InstalmentStatus;
  currency: string;
  slipRef?: string;
}

export function openItems(accounts: FeeAccount[], slips: BankSlip[]): OpenItem[] {
  const out: OpenItem[] = [];
  for (const a of accounts) {
    for (const i of a.instalments) {
      if (CLOSED_STATUSES.includes(i.status)) continue;
      const p = a.payers.find((x) => x.name === i.payer);
      const slip = slips.find(
        (s) => s.status === "Pending" && s.accountId === a.id && s.instalmentId === i.id,
      );
      out.push({
        kind: slip ? "slip" : "instalment",
        id: slip ? slip.id : i.id,
        accountId: a.id,
        instalmentId: i.id,
        amount: slip ? slip.amount : i.amount,
        studentId: a.studentId,
        payer: i.payer,
        payerType: p?.type ?? "Self",
        payerRef: p?.reference,
        label: i.label,
        due: i.due,
        status: i.status,
        currency: a.currency,
        slipRef: slip?.reference,
      });
    }
  }
  return out;
}

const squash = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Distinctive tokens of a payer reference ("SLC CRN 13020045" → "13020045"). */
function refTokens(ref?: string): string[] {
  if (!ref) return [];
  return ref
    .split(/\s+/)
    .filter((t) => /\d/.test(t) && t.replace(/[^A-Za-z0-9]/g, "").length >= 5)
    .map(squash);
}

/** How a bank line's text relates to one open item. */
export function refHit(text: string, it: OpenItem): { exact: boolean; hit: boolean } {
  const up = text.toUpperCase();
  const flat = squash(text);
  const accounts = new Set<string>();
  const instalments = new Set<string>();
  for (const m of up.matchAll(/\bFA-?(\d{4})(?:-(\d{1,2})-(\d{1,2}))?/g)) {
    accounts.add(`FA-${m[1]}`);
    if (m[2]) instalments.add(`FA-${m[1]}-${m[2]}-${m[3]}`);
  }
  const students = new Set(Array.from(up.matchAll(/\bS-?(\d{4})\b/g), (m) => `S-${m[1]}`));
  const exact =
    instalments.has(it.instalmentId) || (!!it.slipRef && flat.includes(squash(it.slipRef)));
  const hit =
    exact ||
    accounts.has(it.accountId) ||
    students.has(it.studentId) ||
    (!FAMILY_PAYERS.includes(it.payerType) && refTokens(it.payerRef).some((t) => flat.includes(t)));
  return { exact, hit };
}

/** Words of the bank payer name found in the item's payer (ordering hint only). */
export function nameHit(line: Pick<BankStatementLine, "payer">, it: OpenItem): boolean {
  const words = line.payer
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((w) => w.length >= 3);
  const target = it.payer.toUpperCase();
  return words.some((w) => target.includes(w));
}

export interface MatchResult {
  status: "Matched" | "Review" | "Unmatched";
  allocations: OpenItem[];
  suggestions: OpenItem[];
  note: string;
}

const same = (a: number, b: number) => Math.abs(a - b) < 0.01;
const byDue = (a: OpenItem, b: OpenItem) => a.due.localeCompare(b.due);

/**
 * Auto-match rules:
 *  1. Reference names the item (instalment id, fee-account id, 1StudentID,
 *     slip reference or the sponsor's PO / award number) AND the amount equals
 *     it → Matched. Several fits on the same account + payer → oldest first;
 *     fits across accounts → Review.
 *  2. Reference names a payer's items and the amount equals the sum of what is
 *     due from that payer → Matched as a bulk remittance (funding bodies).
 *  3. Reference found but the amount is off, or the amount fits but the
 *     reference doesn't → Review with suggestions.
 *  4. Nothing → Unmatched.
 */
export function matchStatementLine(
  line: Pick<BankStatementLine, "reference" | "payer" | "amount" | "currency" | "date">,
  pool: OpenItem[],
): MatchResult {
  const items = pool.filter((i) => i.currency === line.currency);
  const text = `${line.reference} ${line.payer}`;
  const scored = items.map((it) => ({
    it,
    ...refHit(text, it),
    amt: same(it.amount, line.amount),
  }));
  const strong = scored.filter((s) => s.hit && s.amt);
  if (strong.length) {
    const ex = strong.filter((s) => s.exact);
    if (ex.length === 1)
      return { status: "Matched", allocations: [ex[0].it], suggestions: [], note: "" };
    const fits = (ex.length ? ex : strong).map((s) => s.it).sort(byDue);
    if (new Set(fits.map((f) => `${f.accountId}|${f.payer}`)).size === 1) {
      return {
        status: "Matched",
        allocations: [fits[0]],
        suggestions: [],
        note: fits.length > 1 ? "Oldest open instalment settled first" : "",
      };
    }
    return {
      status: "Review",
      allocations: [],
      suggestions: fits,
      note: `Reference and amount fit ${fits.length} items — pick one`,
    };
  }
  const hits = scored.filter((s) => s.hit).map((s) => s.it);
  // Bulk remittance: one payer, everything due by the statement date.
  const byPayer = new Map<string, OpenItem[]>();
  for (const h of hits) {
    if (h.due > line.date) continue;
    byPayer.set(h.payer, [...(byPayer.get(h.payer) ?? []), h]);
  }
  for (const group of byPayer.values()) {
    const sum = group.reduce((s, g) => s + g.amount, 0);
    if (group.length > 1 && same(sum, line.amount)) {
      return {
        status: "Matched",
        allocations: group.sort(byDue),
        suggestions: [],
        note: `Bulk remittance — ${group.length} items`,
      };
    }
  }
  if (hits.length) {
    return {
      status: "Review",
      allocations: [],
      suggestions: hits.sort(byDue),
      note: "Reference found, but the amount doesn't equal what's due",
    };
  }
  const amt = scored.filter((s) => s.amt).map((s) => s.it);
  if (amt.length) {
    const nameFirst = amt.sort(
      (a, b) => Number(nameHit(line, b)) - Number(nameHit(line, a)) || byDue(a, b),
    );
    return {
      status: "Review",
      allocations: [],
      suggestions: nameFirst,
      note:
        amt.length === 1
          ? "Amount matches one open item — reference not recognised"
          : `Amount matches ${amt.length} open items — reference not recognised`,
    };
  }
  return {
    status: "Unmatched",
    allocations: [],
    suggestions: [],
    note: "No reference or amount match",
  };
}

/** Days relative to the due date: negative = before due, positive = overdue. */
export const dueOffset = (due: string, today: string) => daysBetween(due, today);

export function ruleWhen(offset: number): string {
  if (offset === 0) return "On the due date";
  const n = Math.abs(offset);
  return offset < 0
    ? `${n} day${n === 1 ? "" : "s"} before due`
    : `${n} day${n === 1 ? "" : "s"} overdue`;
}

export interface ReminderHit {
  rule: ReminderRule;
  account: FeeAccount;
  instalmentId: string;
  offset: number;
}

/**
 * Each open instalment sits in exactly one rule window: from a rule's offset up
 * to the next active rule's offset. A rule fires once per instalment.
 * Paid, suspended, cancelled and slip-pending instalments are skipped.
 */
export function remindersDue(
  rules: ReminderRule[],
  accounts: FeeAccount[],
  sent: PaymentReminder[],
  today: string,
): ReminderHit[] {
  const active = rules.filter((r) => r.active).sort((a, b) => a.offsetDays - b.offsetDays);
  if (!active.length) return [];
  const done = new Set(sent.map((s) => `${s.instalmentId}|${s.ruleId}`));
  const out: ReminderHit[] = [];
  for (const a of accounts) {
    for (const i of a.instalments) {
      if (CLOSED_STATUSES.includes(i.status) || i.status === "Pending verification") continue;
      const d = dueOffset(i.due, today);
      const idx = active.findIndex(
        (r, k) => d >= r.offsetDays && (k === active.length - 1 || d < active[k + 1].offsetDays),
      );
      if (idx < 0) continue;
      const rule = active[idx];
      if (done.has(`${i.id}|${rule.id}`)) continue;
      out.push({ rule, account: a, instalmentId: i.id, offset: d });
    }
  }
  return out.sort((x, y) => y.offset - x.offset);
}

/* ── Seed ────────────────────────────────────────────────────────────────── */

const amt = (instalmentId: string) =>
  feeAccounts.flatMap((a) => a.instalments).find((i) => i.id === instalmentId)?.amount ?? 0;
const acct = (instalmentId: string) => instalmentId.split("-").slice(0, 2).join("-");
const alloc = (instalmentId: string): StatementAllocation => ({
  kind: "instalment",
  id: instalmentId,
  accountId: acct(instalmentId),
  instalmentId,
  amount: amt(instalmentId),
});

type Raw = [date: string, reference: string, payer: string, amount: number];
function batch(
  tenantId: string,
  currency: string,
  importBatch: string,
  idBase: number,
  rows: Raw[],
): BankStatementLine[] {
  return rows.map(([date, reference, payer, amount], k) => ({
    id: `BL-${idBase + k}`,
    tenantId,
    importBatch,
    date,
    reference,
    payer,
    amount,
    currency,
    status: "Unmatched",
  }));
}

/** Lines already imported and worked (the reconciliation history). */
export const bankStatementLines: BankStatementLine[] = [
  // Meridian Dubai — last week's Emirates NBD file.
  {
    id: "BL-0901",
    tenantId: "T-009",
    importBatch: "Emirates NBD · 20–26 Oct 2026 (CSV)",
    date: "2026-10-22",
    reference: "SO FA-3005 MONTHLY FEES FREYA",
    payer: "TOM MORGAN",
    amount: amt("FA-3005-3-1"),
    currency: "AED",
    status: "Matched",
    matched: { kind: "instalment", id: "FA-3005-3-1", by: "auto", at: "2026-10-27T06:00:00Z" },
    allocations: [alloc("FA-3005-3-1")],
  },
  {
    id: "BL-0902",
    tenantId: "T-009",
    importBatch: "Emirates NBD · 20–26 Oct 2026 (CSV)",
    date: "2026-10-23",
    reference: "IPP TRF 7781200",
    payer: "N SHAH",
    amount: amt("FA-3010-2-1"),
    currency: "AED",
    status: "Review",
    note: "Amount matches one open item — reference not recognised",
  },
  {
    id: "BL-0903",
    tenantId: "T-009",
    importBatch: "Emirates NBD · 20–26 Oct 2026 (CSV)",
    date: "2026-10-24",
    reference: "POS REFUND 4471",
    payer: "NOON PAYMENTS",
    amount: 312,
    currency: "AED",
    status: "Unmatched",
    note: "No reference or amount match",
  },
  {
    id: "BL-0904",
    tenantId: "T-009",
    importBatch: "Emirates NBD · 20–26 Oct 2026 (CSV)",
    date: "2026-10-25",
    reference: "BANK CHARGES OCT",
    payer: "EMIRATES NBD",
    amount: 52.5,
    currency: "AED",
    status: "Ignored",
    note: "Bank charge — not a fee payment",
  },
  // Northbridge (UK) — Barclays.
  {
    id: "BL-1001",
    tenantId: "T-010",
    importBatch: "Barclays · 19–25 Oct 2026 (CSV)",
    date: "2026-10-19",
    reference: "FPS ANANYA RAO S-4010 INST2",
    payer: "A RAO",
    amount: amt("FA-4010-2-1"),
    currency: "GBP",
    status: "Matched",
    matched: { kind: "instalment", id: "FA-4010-2-1", by: "auto", at: "2026-10-26T06:00:00Z" },
    allocations: [alloc("FA-4010-2-1")],
  },
  {
    id: "BL-1002",
    tenantId: "T-010",
    importBatch: "Barclays · 19–25 Oct 2026 (CSV)",
    date: "2026-10-22",
    reference: "FPS 88213 FEES",
    payer: "CHEN WEI",
    amount: amt("FA-4004-1-1"),
    currency: "GBP",
    status: "Review",
    note: "Amount matches 3 open items — reference not recognised",
  },
  {
    id: "BL-1003",
    tenantId: "T-010",
    importBatch: "Barclays · 19–25 Oct 2026 (CSV)",
    date: "2026-10-23",
    reference: "INTL TRANSFER",
    payer: "A MEHTA",
    amount: 1200,
    currency: "GBP",
    status: "Unmatched",
    note: "No reference or amount match",
  },
  // Harbourside Sydney — CBA.
  {
    id: "BL-1101",
    tenantId: "T-011",
    importBatch: "CBA · 28 Sep – 12 Oct 2026 (CSV)",
    date: "2026-10-02",
    reference: "NSW EDU FFT-2026-3391 TERM 4",
    payer: "NSW DEPT OF EDUCATION",
    amount: amt("FA-5003-4-1"),
    currency: "AUD",
    status: "Matched",
    matched: { kind: "instalment", id: "FA-5003-4-1", by: "auto", at: "2026-10-05T06:00:00Z" },
    allocations: [alloc("FA-5003-4-1")],
  },
  {
    id: "BL-1102",
    tenantId: "T-011",
    importBatch: "CBA · 28 Sep – 12 Oct 2026 (CSV)",
    date: "2026-10-08",
    reference: "OSKO PAYMENT ISHAAN K",
    payer: "I KAPOOR",
    amount: amt("FA-5005-2-1"),
    currency: "AUD",
    status: "Review",
    note: "Amount matches one open item — reference not recognised",
  },
  {
    id: "BL-1103",
    tenantId: "T-011",
    importBatch: "CBA · 28 Sep – 12 Oct 2026 (CSV)",
    date: "2026-10-12",
    reference: "TT MUFG 20261012 TANAKA",
    payer: "SAKURA TANAKA",
    amount: 3200,
    currency: "AUD",
    status: "Unmatched",
    note: "No reference or amount match",
  },
  {
    id: "BL-1104",
    tenantId: "T-011",
    importBatch: "CBA · 28 Sep – 12 Oct 2026 (CSV)",
    date: "2026-10-12",
    reference: "MERCHANT FEES SEP",
    payer: "COMMONWEALTH BANK",
    amount: 38.4,
    currency: "AUD",
    status: "Ignored",
    note: "Card merchant fees",
  },
  // Colombo — Commercial Bank.
  {
    id: "BL-1201",
    tenantId: "T-012",
    importBatch: "Commercial Bank · Aug 2026 (CSV)",
    date: "2026-08-22",
    reference: "CEFT FA-3102 KAVIN TERM 1",
    payer: "R FERNANDO",
    amount: amt("FA-3102-1-1"),
    currency: "LKR",
    status: "Matched",
    matched: { kind: "instalment", id: "FA-3102-1-1", by: "auto", at: "2026-08-24T06:00:00Z" },
    allocations: [alloc("FA-3102-1-1")],
  },
  {
    id: "BL-1202",
    tenantId: "T-012",
    importBatch: "Commercial Bank · Aug 2026 (CSV)",
    date: "2026-08-26",
    reference: "CEFT 0039912",
    payer: "C SILVA",
    amount: amt("FA-3103-1-1"),
    currency: "LKR",
    status: "Review",
    note: "Amount matches 3 open items — reference not recognised",
  },
  {
    id: "BL-1203",
    tenantId: "T-012",
    importBatch: "Commercial Bank · Aug 2026 (CSV)",
    date: "2026-08-28",
    reference: "CHQ DEP 445120",
    payer: "CASH/CHQ COUNTER",
    amount: 125000,
    currency: "LKR",
    status: "Unmatched",
    note: "No reference or amount match",
  },
];

/**
 * Sample bank files finance can import (Reconciliation → Import statement).
 * Matching runs live against the current ledger at import time.
 */
export const bankStatementSamples: BankStatementLine[] = [
  ...batch("T-009", "AED", "Emirates NBD · 27 Oct – 2 Nov 2026 (CSV)", 2901, [
    ["2026-11-01", "TRF ENBD-TRF-88172034 ZARA KHAN", "SARAH KHAN", amt("FA-3001-2-1")],
    ["2026-11-01", "MSHQ-552019873 FEES ROHAN", "MEERA IYER", amt("FA-3006-1-1")],
    ["2026-11-02", "SCHOOL FEES S-3002 TERM 2", "SARAH KHAN", amt("FA-3002-2-1")],
    ["2026-11-02", "IBFT 66120934 FEES", "R HADDAD", amt("FA-3003-1-1")],
    ["2026-11-02", "CASH DEP BR 114", "UNKNOWN", 5000],
    ["2026-11-02", "INTL TRF CHARGES", "EMIRATES NBD", 45],
  ]),
  ...batch("T-009", "AED", "Emirates NBD · employer remittances Nov 2026", 2911, [
    ["2026-11-02", "PO-SUM-88120 MEI TANAKA TERM 2", "SUMIKAWA TRADING FZE", amt("FA-3009-2-1")],
    ["2026-11-02", "EDU-ALW-2026-4471 TERM 2", "EMIRATES AVIATION GROUP", amt("FA-3007-2-2")],
    ["2026-11-02", "FEES AISHA RAHMAN", "KHALID RAHMAN", amt("FA-3007-2-1")],
    ["2026-11-02", "FA-3008 DANIEL OKAFOR", "GRACE OKAFOR", amt("FA-3008-2-1")],
  ]),
  ...batch("T-010", "GBP", "Barclays · 26 Oct – 1 Nov 2026 (CSV)", 3001, [
    ["2026-10-28", "SWIFT HABBPKKA 20261027-114 FATIMA NOOR", "FATIMA NOOR", amt("FA-4006-1-2")],
    ["2026-10-29", "SLC CRN 13020045 LEO WARD T1", "STUDENT LOANS COMPANY", amt("FA-4007-1-1")],
    ["2026-10-30", "FPS S-4010 INST 3", "ANANYA RAO", amt("FA-4010-3-1")],
    ["2026-10-31", "REFUND ACCOMMODATION DEP", "UNITE STUDENTS", 450],
  ]),
  ...batch("T-010", "GBP", "Barclays · sponsor remittances Nov 2026", 3011, [
    ["2026-11-02", "PO-NW-22841 DANIEL PRICE SEM2", "NORTHWIND ANALYTICS LTD", amt("FA-4009-2-1")],
    [
      "2026-11-02",
      "CSS PKCS-2026-118 SEM 2",
      "COMMONWEALTH SCHOLARSHIP COMMISSION",
      amt("FA-4006-2-1"),
    ],
    [
      "2026-11-02",
      "SLC TUITION FEE BATCH 0411",
      "STUDENT LOANS COMPANY",
      amt("FA-4002-2-1") + amt("FA-4003-2-1"),
    ],
  ]),
  ...batch("T-011", "AUD", "CBA · 26 Oct – 1 Nov 2026 (CSV)", 3101, [
    ["2026-11-01", "CBA-NETBANK-4410928 ELLA BROOKS", "ELLA BROOKS", amt("FA-5008-9-1")],
    [
      "2026-11-01",
      "NSW GOVT SMART AND SKILLED 2026-HC-0412 CLAIM",
      "NSW DEPT OF EDUCATION",
      amt("FA-5002-4-1") + amt("FA-5007-3-1") + amt("FA-5007-4-1"),
    ],
    ["2026-11-01", "VSL 2026-0098 T4", "AUSTRALIAN GOVERNMENT VSL", amt("FA-5006-4-1")],
    [
      "2026-11-01",
      "HARBOUR BUILD CO FEES",
      "HARBOUR BUILD CO",
      amt("FA-5007-3-2") + amt("FA-5007-4-2"),
    ],
  ]),
  ...batch("T-011", "AUD", "CBA · 2 Nov 2026 (CSV)", 3111, [
    ["2026-11-02", "S-5001 TERM 4 FULL", "SAKURA TANAKA", amt("FA-5001-4-1")],
    ["2026-11-02", "COASTLINE ELECTRICAL NSW-TC-77120", "COASTLINE ELECTRICAL", amt("FA-5002-4-2")],
    ["2026-11-02", "DIRECT CREDIT 99120", "J SMITH", 1250],
  ]),
  ...batch("T-012", "LKR", "Commercial Bank · 27 Oct – 2 Nov 2026 (CSV)", 3201, [
    ["2026-11-01", "CEFT 0041188920 NETHMI", "DILANI PERERA", amt("FA-3101-2-1")],
    ["2026-11-01", "S-3104 TERM 2", "N JAYASURIYA", amt("FA-3104-2-1")],
    ["2026-11-02", "SLIPS TRF 7712", "R FERNANDO", amt("FA-3102-2-1")],
  ]),
  ...batch("T-012", "LKR", "Commercial Bank · cheque deposits Nov 2026", 3211, [
    ["2026-11-02", "CHQ 220145 FA-3105", "DILANI PERERA", amt("FA-3105-2-1")],
    ["2026-11-02", "CASH DEP KOLLUPITIYA", "UNKNOWN", 50000],
  ]),
];

type RuleSeed = [offsetDays: number, channels: Channel[], active?: boolean];
function rules(tenantId: string, base: number, rows: RuleSeed[]): ReminderRule[] {
  return rows.map(([offsetDays, channels, active = true], k) => ({
    id: `RR-${base + k}`,
    tenantId,
    label: ruleWhen(offsetDays),
    offsetDays,
    channels,
    active,
  }));
}

export const reminderRules: ReminderRule[] = [
  ...rules("T-009", 901, [
    [-30, ["Email"]],
    [-7, ["Email", "WhatsApp"]],
    [0, ["Email", "WhatsApp", "App"]],
    [7, ["Email", "SMS", "WhatsApp"]],
    [30, ["Email", "SMS"]],
  ]),
  ...rules("T-010", 1001, [
    [-21, ["Email"]],
    [0, ["Email", "App"]],
    [7, ["Email", "SMS"]],
    [30, ["Email", "SMS"]],
    [60, ["Email"], false],
  ]),
  ...rules("T-011", 1101, [
    [-7, ["Email", "SMS"]],
    [0, ["Email", "SMS"]],
    [7, ["SMS"]],
    [30, ["Email"]],
  ]),
  ...rules("T-012", 1201, [
    [-7, ["SMS", "WhatsApp"]],
    [0, ["SMS"]],
    [7, ["SMS", "WhatsApp"]],
    [30, ["SMS", "Email"]],
  ]),
];

type RemSeed = [
  ruleId: string,
  instalmentId: string,
  studentId: string,
  to: string,
  at: string,
  ch: Channel[],
];
function sentRem(tenantId: string, base: number, rows: RemSeed[]): PaymentReminder[] {
  let n = base;
  return rows.flatMap(([ruleId, instalmentId, studentId, to, at, chans]) =>
    chans.map((channel) => ({
      id: `PR-${n++}`,
      tenantId,
      feeAccountId: acct(instalmentId),
      instalmentId,
      studentId,
      ruleId,
      channel,
      to,
      sentAt: at,
      amount: amt(instalmentId),
    })),
  );
}

export const paymentReminders: PaymentReminder[] = [
  ...sentRem("T-009", 901, [
    ["RR-904", "FA-3003-1-1", "S-3003", "Rana Haddad", "2026-08-22T05:00:00Z", ["Email", "SMS"]],
    ["RR-905", "FA-3003-1-1", "S-3003", "Rana Haddad", "2026-09-14T05:00:00Z", ["Email", "SMS"]],
    ["RR-903", "FA-3002-2-1", "S-3002", "Sarah Khan", "2026-10-01T05:00:00Z", ["Email"]],
    ["RR-904", "FA-3002-2-1", "S-3002", "Sarah Khan", "2026-10-08T05:00:00Z", ["Email", "SMS"]],
  ]),
  ...sentRem("T-010", 1001, [
    ["RR-1003", "FA-4004-1-1", "S-4004", "Chen Wei", "2026-09-28T07:00:00Z", ["Email"]],
    ["RR-1004", "FA-4004-1-1", "S-4004", "Chen Wei", "2026-10-21T07:00:00Z", ["Email", "SMS"]],
  ]),
  ...sentRem("T-011", 1101, [
    ["RR-1104", "FA-5005-2-1", "S-5005", "Ishaan Kapoor", "2026-09-30T22:00:00Z", ["Email"]],
    ["RR-1103", "FA-5001-4-1", "S-5001", "Sakura Tanaka", "2026-10-12T22:00:00Z", ["SMS"]],
  ]),
  ...sentRem("T-012", 1201, [
    ["RR-1204", "FA-3103-1-1", "S-3103", "Chamari Silva", "2026-09-24T03:30:00Z", ["SMS", "Email"]],
  ]),
];
