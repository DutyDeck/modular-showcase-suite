/* ═══════════════════════════════════════════════════════════════════════════
 * Billing engine — turns a student's course selection into a monthly invoice.
 *
 * Pure functions (no store / no React) so both the parent's live "what will I
 * pay" preview and the admin's monthly billing run compute an identical result.
 *
 * The month is expanded into concrete dated sessions (so a 5-Monday month bills
 * 5 sessions and a 4-Monday month bills 4), closures are removed, revision
 * bookings are added, discounts are applied in a fixed order with a margin cap,
 * and VAT is charged per line by its UK treatment. See mockData.ts for the data
 * and the accompanying analysis for the real-world rationale.
 * ═══════════════════════════════════════════════════════════════════════════ */

import {
  feePlans as defaultFeePlans,
  discounts as defaultDiscounts,
  revisionSessions as defaultRevisionSessions,
  billingClosures as defaultClosures,
  billingCredits as defaultCredits,
  students,
  familyOf,
  VAT_RATE,
  type FeePlan,
  type Discount,
  type RevisionSession,
  type RevisionBooking,
  type BillingEnrollment,
  type BillingClosure,
  type BillingCredit,
  type VatTreatment,
  type Weekday,
} from "./mockData";

export interface DraftLine {
  id: string;
  kind: "tuition" | "revision" | "discount" | "credit";
  courseId?: string;
  desc: string;
  detail?: string;
  qty: number;
  unitPrice: number; // USD (negative for discounts)
  amount: number; // USD (negative for discounts)
  vatTreatment: VatTreatment;
  dates?: string[];
}

export interface DraftInvoice {
  studentId: string;
  studentName: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  lines: DraftLine[];
  courseCount: number;
  sessionCount: number;
  gross: number; // sum of tuition + revision (before discounts)
  discountTotal: number; // positive
  creditTotal: number; // positive — absence / goodwill credits
  netStandard: number; // standard-rated net after discounts & credits
  netExempt: number; // exempt / zero net after discounts & credits
  vat: number;
  total: number;
}

export interface BillingData {
  enrollments: BillingEnrollment[];
  revisionBookings: RevisionBooking[];
  feePlans?: FeePlan[];
  discounts?: Discount[];
  revisionSessions?: RevisionSession[];
  closures?: BillingClosure[];
  credits?: BillingCredit[];
}

/** Expand closures (single days and multi-day "week off" breaks) to a date set. */
export function expandClosures(closures: BillingClosure[]): Set<string> {
  const set = new Set<string>();
  for (const c of closures) {
    if (!c.to) {
      set.add(c.date);
      continue;
    }
    const end = toDate(c.to);
    for (let d = toDate(c.date); d <= end; d.setDate(d.getDate() + 1)) set.add(fmtISO(d));
  }
  return set;
}

/* ── date helpers ─────────────────────────────────────────────────────────── */

const WEEKDAY_BY_INDEX: Weekday[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG: Record<Weekday, string> = {
  Mon: "Mondays",
  Tue: "Tuesdays",
  Wed: "Wednesdays",
  Thu: "Thursdays",
  Fri: "Fridays",
  Sat: "Saturdays",
  Sun: "Sundays",
};

function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtISO(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekdayOf(dt: Date): Weekday {
  return WEEKDAY_BY_INDEX[dt.getDay()];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Calendar-month window from an `<input type="month">` value ("2026-07"). */
export function monthRange(monthISO: string): { start: string; end: string } {
  const [y, m] = monthISO.split("-").map(Number);
  return { start: fmtISO(new Date(y, m - 1, 1)), end: fmtISO(new Date(y, m, 0)) };
}

/** The current month as a "2026-07" string (for defaults). */
export function currentMonthISO(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabelOf(startISO: string): string {
  return toDate(startISO).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Concrete class dates in [startISO, endISO] on the given weekdays, minus closures. */
export function sessionDatesInWindow(
  weekdays: Weekday[],
  startISO: string,
  endISO: string,
  closures: Set<string>,
): string[] {
  const out: string[] = [];
  const set = new Set(weekdays);
  const end = toDate(endISO);
  for (let dt = toDate(startISO); dt <= end; dt.setDate(dt.getDate() + 1)) {
    if (!set.has(weekdayOf(dt))) continue;
    const iso = fmtISO(dt);
    if (!closures.has(iso)) out.push(iso);
  }
  return out;
}

function weekdayLabel(weekdays: Weekday[]): string {
  return weekdays.map((w) => WEEKDAY_LONG[w]).join(" & ");
}

const dayNums = (dates: string[]) => dates.map((d) => Number(d.slice(8, 10))).join(", ");

/* ── the engine ───────────────────────────────────────────────────────────── */

export function generateInvoice(
  studentId: string,
  periodStart: string,
  periodEnd: string,
  data: BillingData,
): DraftInvoice {
  const feePlans = data.feePlans ?? defaultFeePlans;
  const discounts = data.discounts ?? defaultDiscounts;
  const revSessions = data.revisionSessions ?? defaultRevisionSessions;
  const closures = expandClosures(data.closures ?? defaultClosures);
  const credits = data.credits ?? defaultCredits;
  const billingMonth = periodStart.slice(0, 7);
  const studentName = students.find((s) => s.id === studentId)?.name ?? studentId;

  // Enrolments active at any point in the billing window.
  const myEnrollments = data.enrollments.filter(
    (e) =>
      e.studentId === studentId && e.since <= periodEnd && (!e.endedOn || e.endedOn >= periodStart),
  );

  const lines: DraftLine[] = [];
  let sessionCount = 0;

  // 1 ─ Recurring tuition, one line per selected course
  for (const enr of myEnrollments) {
    const plan = feePlans.find((p) => p.courseId === enr.courseId);
    if (!plan) continue;
    // Respect mid-month joiners / leavers (pro-rata falls out of the date count).
    const winStart = enr.since > periodStart ? enr.since : periodStart;
    const winEnd = enr.endedOn && enr.endedOn < periodEnd ? enr.endedOn : periodEnd;

    if (plan.billingModel === "per-session") {
      const dates = sessionDatesInWindow(plan.weekdays, winStart, winEnd, closures);
      if (dates.length === 0) continue;
      sessionCount += dates.length;
      const rate = plan.sessionRate ?? 0;
      const joinedMid = enr.since > periodStart;
      const leftMid = !!enr.endedOn && enr.endedOn < periodEnd;
      const note = joinedMid
        ? " (pro-rata from join date)"
        : leftMid
          ? " (billed to leave date)"
          : "";
      lines.push({
        id: `L-${enr.courseId}`,
        kind: "tuition",
        courseId: enr.courseId,
        desc: plan.courseName,
        detail: `${weekdayLabel(plan.weekdays)} · ${dayNums(dates)}${note}`,
        qty: dates.length,
        unitPrice: rate,
        amount: round(dates.length * rate),
        vatTreatment: plan.vatTreatment,
        dates,
      });
    } else if (plan.billingModel === "monthly") {
      const amount = plan.monthlyRate ?? 0;
      lines.push({
        id: `L-${enr.courseId}`,
        kind: "tuition",
        courseId: enr.courseId,
        desc: plan.courseName,
        detail: `Monthly instalment · annualised (${weekdayLabel(plan.weekdays)})`,
        qty: 1,
        unitPrice: amount,
        amount,
        vatTreatment: plan.vatTreatment,
      });
    } else {
      // term-block → equal monthly instalment across the term
      const instalments = Math.max(1, Math.round((plan.termWeeks ?? 12) / 4));
      const amount = round((plan.termRate ?? 0) / instalments);
      lines.push({
        id: `L-${enr.courseId}`,
        kind: "tuition",
        courseId: enr.courseId,
        desc: plan.courseName,
        detail: `${plan.termWeeks ?? 12}-week term block · monthly instalment (of ${instalments})`,
        qty: 1,
        unitPrice: amount,
        amount,
        vatTreatment: plan.vatTreatment,
      });
    }
  }

  // 2 ─ Opt-in revision / booster sessions booked within the window
  const myBookings = data.revisionBookings.filter(
    (b) => b.studentId === studentId && b.status !== "cancelled",
  );
  for (const b of myBookings) {
    const s = revSessions.find((x) => x.id === b.sessionId);
    if (!s || s.date < periodStart || s.date > periodEnd) continue;
    const plan = feePlans.find((p) => p.courseId === s.courseId);
    sessionCount += 1;
    lines.push({
      id: `L-REV-${s.id}`,
      kind: "revision",
      courseId: s.courseId,
      desc: `Revision · ${s.title}`,
      detail: `${s.date} · ${s.start}–${s.end}`,
      qty: 1,
      unitPrice: s.rate,
      amount: s.rate,
      vatTreatment: plan?.vatTreatment ?? "standard",
      dates: [s.date],
    });
  }

  const positive = lines.filter((l) => l.kind !== "discount");
  const gross = round(positive.reduce((a, l) => a + l.amount, 0));
  const courseCount = new Set(myEnrollments.map((e) => e.courseId)).size;

  // Discounts reduce standard-rated tuition unless the whole basket is exempt.
  const discountTreatment: VatTreatment = positive.some((l) => l.vatTreatment === "standard")
    ? "standard"
    : "exempt";

  // 3 ─ Discounts, applied in a fixed order against a running tuition net
  let runningTuition = round(
    lines.filter((l) => l.kind === "tuition").reduce((a, l) => a + l.amount, 0),
  );
  const discountLines: DraftLine[] = [];
  const pushDiscount = (id: string, label: string, amt: number) => {
    const value = round(Math.min(amt, Math.max(0, runningTuition)));
    if (value <= 0) return;
    discountLines.push({
      id,
      kind: "discount",
      desc: label,
      qty: 1,
      unitPrice: -value,
      amount: -value,
      vatTreatment: discountTreatment,
    });
    runningTuition = round(runningTuition - value);
  };

  // a. course-specific promo (per matching tuition line, within its date window)
  for (const d of discounts.filter((x) => x.active && x.kind === "course-promo")) {
    if (d.validFrom && d.validFrom > periodEnd) continue;
    if (d.validTo && d.validTo < periodStart) continue;
    const line = lines.find((l) => l.kind === "tuition" && l.courseId === d.courseId);
    if (!line) continue;
    const amt = d.amountType === "percent" ? round((line.amount * d.value) / 100) : d.value;
    pushDiscount(
      `D-${d.id}`,
      `${d.label} (−${d.value}${d.amountType === "percent" ? "%" : ""})`,
      amt,
    );
  }

  // b. multi-course bundle
  for (const d of discounts.filter((x) => x.active && x.kind === "multi-course")) {
    if (courseCount < (d.minCourses ?? 2)) continue;
    const amt = d.amountType === "percent" ? round((runningTuition * d.value) / 100) : d.value;
    pushDiscount(`D-${d.id}`, `${d.label} · ${courseCount} courses (−${d.value}%)`, amt);
  }

  // c. sibling — the additional child (not the first-enrolled sibling by id)
  for (const d of discounts.filter((x) => x.active && x.kind === "sibling")) {
    const enrolledSiblings = familyOf(studentId).filter((id) =>
      data.enrollments.some((e) => e.studentId === id),
    );
    if (enrolledSiblings.length < 2) continue;
    const isFirst = enrolledSiblings.slice().sort()[0] === studentId;
    if (isFirst) continue;
    const amt = d.amountType === "percent" ? round((runningTuition * d.value) / 100) : d.value;
    pushDiscount(`D-${d.id}`, `${d.label} (−${d.value}%)`, amt);
  }

  // d. bursary — targeted, usually a fixed reduction
  for (const d of discounts.filter((x) => x.active && x.kind === "bursary")) {
    if (!d.studentIds?.includes(studentId)) continue;
    const amt = d.amountType === "fixed" ? d.value : round((runningTuition * d.value) / 100);
    pushDiscount(`D-${d.id}`, d.label, amt);
  }

  // Margin safeguard: total discount never exceeds 40% of gross.
  let discountTotal = round(discountLines.reduce((a, l) => a - l.amount, 0));
  const cap = round(gross * 0.4);
  if (discountTotal > cap && discountTotal > 0) {
    const factor = cap / discountTotal;
    for (const l of discountLines) {
      l.amount = round(l.amount * factor);
      l.unitPrice = l.amount;
    }
    discountTotal = cap;
  }

  // 4 ─ Absence / goodwill credits for this month (outside the discount cap)
  const creditLines: DraftLine[] = [];
  for (const c of credits.filter(
    (x) => x.studentId === studentId && x.appliesMonth === billingMonth,
  )) {
    creditLines.push({
      id: `L-CR-${c.id}`,
      kind: "credit",
      courseId: c.courseId,
      desc: c.label,
      detail: c.reason,
      qty: 1,
      unitPrice: -c.amount,
      amount: -c.amount,
      vatTreatment: c.vatTreatment ?? discountTreatment,
    });
  }
  const creditTotal = round(creditLines.reduce((a, l) => a - l.amount, 0));

  const allLines = [...lines, ...discountLines, ...creditLines];

  // 5 ─ VAT per treatment, on the net after discounts & credits
  const netOf = (t: VatTreatment) =>
    round(allLines.filter((l) => l.vatTreatment === t).reduce((a, l) => a + l.amount, 0));
  const netStandard = netOf("standard");
  const netExempt = round(netOf("exempt") + netOf("zero"));
  const vat = round(netStandard * VAT_RATE);
  const total = round(netStandard + netExempt + vat);

  return {
    studentId,
    studentName,
    periodLabel: periodLabelOf(periodStart),
    periodStart,
    periodEnd,
    lines: allLines,
    courseCount,
    sessionCount,
    gross,
    discountTotal,
    creditTotal,
    netStandard,
    netExempt,
    vat,
    total,
  };
}
