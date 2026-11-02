import { createFileRoute, Link } from "@tanstack/react-router";
import { getDisplayCurrency } from "@/lib/displayCurrency";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
  Building2,
  CalendarClock,
  CreditCard,
  Download,
  EyeOff,
  FileUp,
  HandCoins,
  Info,
  Landmark,
  Link2,
  Play,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Undo2,
  Upload,
  Wallet,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  Button,
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Select,
  FormDialog,
  MiniBars,
} from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PackContextBar, Tabs, StatusPill } from "@/components/packs/PackUI";
import { useCollection, addItem, updateItem, removeItem, nextId } from "@/lib/store";
import { useTenantContext, useScopedLearners } from "@/lib/packs/registry";
import { money } from "@/lib/packs/regions";
import { DEMO_TODAY, type AcademicCalendar, type Learner } from "@/lib/packs/foundationData";
import {
  accountTotals,
  accountBase,
  buildInstalments,
  addDays,
  daysBetween,
  FAMILY_PAYERS,
  PAYER_TYPES,
  type FeeAccount,
  type FeePayer,
  type FeePlan,
  type Instalment,
  type Period,
  type PayerType,
} from "@/lib/packs/bizData";
import {
  bankStatementSamples,
  CLOSED_STATUSES,
  matchStatementLine,
  nameHit,
  openItems,
  refHit,
  remindersDue,
  ruleWhen,
  type BankStatementLine,
  type OpenItem,
  type ReminderRule,
} from "@/lib/packs/sis/finance";
import type { Channel } from "@/lib/packs/sis/shared";
import { logChange, notify } from "@/lib/packs/sis/activity";

export const Route = createFileRoute("/app/fee-accounts")({
  head: () => ({ meta: [{ title: "Fees & Sponsors — 1StudentID" }] }),
  component: FeesSponsorsPage,
});

/* ── helpers ─────────────────────────────────────────────────────────────── */

const PLANS: FeePlan[] = ["Annual", "Termly", "Per semester", "Monthly instalments"];
const CHANNELS: Channel[] = ["Email", "SMS", "WhatsApp", "App"];
const COUNTER_METHODS = ["Cash", "Card", "Bank transfer", "Cheque", "Online"];

/**
 * Instalment periods from the learner's academic calendar — never hard-coded —
 * starting at the learner's start date: periods already over when they joined
 * are not billed, and the period they join in falls due on their first day.
 */
function periodsFor(
  plan: FeePlan,
  cal: AcademicCalendar | undefined,
  fallback: Period[],
  startDate?: string,
): Period[] {
  if (!cal) return fallback;
  const from = startDate && startDate > cal.start ? startDate : cal.start;
  const teaching = cal.terms.filter((t) => t.kind === "teaching" && t.end >= from);
  if (plan === "Annual") return [{ label: `Annual fee ${cal.academicYear}`, due: from }];
  if (plan === "Termly" || plan === "Per semester") {
    return teaching.map((t) => ({
      label: t.name,
      due: t.start < from ? from : addDays(t.start, -7),
    }));
  }
  const start = new Date(from + "T00:00:00Z");
  return Array.from({ length: 10 }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 25));
    return { label: `Instalment ${i + 1} of 10`, due: d.toISOString().slice(0, 10) };
  });
}

function existingPeriods(a: FeeAccount): Period[] {
  const seen = new Map<string, string>();
  for (const i of a.instalments) if (!seen.has(i.label)) seen.set(i.label, i.due);
  return Array.from(seen, ([label, due]) => ({ label, due }));
}

/** Amount in the app's single display currency (ledger stays in a.currency). */
function Amount({ value, a, strong }: { value: number; a: FeeAccount; strong?: boolean }) {
  return <span className={strong ? "font-semibold" : undefined}>{money(value, a.currency)}</span>;
}

function isFamily(a: FeeAccount, payerName: string) {
  const p = a.payers.find((x) => x.name === payerName);
  return !p || FAMILY_PAYERS.includes(p.type);
}

const isOpen = (i: Instalment) => !CLOSED_STATUSES.includes(i.status);
/** Open and chaseable: not closed and no bank slip waiting for finance. */
const isPayable = (i: Instalment) => isOpen(i) && i.status !== "Pending verification";

/**
 * accountTotals() plus approved student requests: cancelled instalments
 * (withdrawal) leave the bill; suspended ones (interruption) stay owed but on hold.
 */
function totals(a: FeeAccount) {
  const t = accountTotals(a);
  let cancelled = 0;
  let suspended = 0;
  const byPayer = Object.fromEntries(Object.entries(t.byPayer).map(([k, v]) => [k, { ...v }]));
  for (const i of a.instalments) {
    if (i.status === "Cancelled") {
      cancelled += i.amount;
      if (byPayer[i.payer]) byPayer[i.payer].billed -= i.amount;
    }
    if (i.status === "Suspended") suspended += i.amount;
  }
  return {
    ...t,
    byPayer,
    billed: t.billed - cancelled,
    outstanding: Math.max(0, t.outstanding - cancelled),
    cancelled,
    suspended,
  };
}

const EXTRA_TONE: Record<string, "success" | "warning" | "destructive" | "muted" | "info"> = {
  Suspended: "warning",
  Cancelled: "muted",
  Closed: "muted",
  Matched: "success",
  Review: "warning",
  Unmatched: "destructive",
  Ignored: "muted",
};

/** StatusPill plus the fee-only statuses it doesn't colour. */
function Pill({ status }: { status: string }) {
  const tone = EXTRA_TONE[status];
  return tone ? <Badge tone={tone}>{status}</Badge> : <StatusPill status={status} />;
}

const receiptOf = (method?: string) => method?.match(/RCT-\d+/)?.[0];
const methodOf = (method?: string) => (method ?? "").split(" · ")[0];

function downloadCsv(filename: string, rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let k = 0; k < line.length; k++) {
    const ch = line[k];
    if (quoted) {
      if (ch === '"' && line[k + 1] === '"') {
        cur += '"';
        k++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Parse "date,reference,payer,amount" rows (header optional). */
function parseStatementCsv(text: string): {
  rows: { date: string; reference: string; payer: string; amount: number }[];
  error?: string;
} {
  const rows: { date: string; reference: string; payer: string; amount: number }[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (const [n, line] of lines.entries()) {
    const [date, reference, payer, amountRaw] = splitCsvLine(line);
    const amount = Number(String(amountRaw ?? "").replace(/[^\d.-]/g, ""));
    if (n === 0 && !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue; // header
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !amountRaw || Number.isNaN(amount)) {
      return { rows, error: `Line ${n + 1}: expected date (YYYY-MM-DD), reference, payer, amount` };
    }
    rows.push({ date, reference: reference ?? "", payer: payer ?? "", amount });
  }
  return { rows };
}

interface Posting {
  accountId: string;
  instalmentId: string;
  slipId?: string;
  method: string;
  paidAt: string;
  /** Extra audit text, e.g. "Bank statement BL-1003 · ref". */
  reason?: string;
  source: string;
}

interface PostResult {
  receipt: string;
  accountId: string;
  instalmentId: string;
  amount: number;
  currency: string;
  payer: string;
}

/**
 * The one way a payment hits the ledger: instalment → Paid with a receipt
 * number, pending slip → Verified, change logged, receipt sent to the payer.
 * Postings to the same account are applied together so none is lost.
 */
function postPayments(
  tenantId: string,
  by: string,
  accounts: FeeAccount[],
  learnerName: (id: string) => string,
  posts: Posting[],
): PostResult[] {
  const next = new Map<string, Instalment[]>();
  const out: PostResult[] = [];
  for (const p of posts) {
    const a = accounts.find((x) => x.id === p.accountId);
    if (!a) continue;
    const list = next.get(a.id) ?? a.instalments;
    const inst = list.find((i) => i.id === p.instalmentId);
    if (!inst || inst.status === "Paid") continue;
    const receipt = nextId("RCT-", "outbox", "relatedId");
    next.set(
      a.id,
      list.map((i) =>
        i.id === inst.id
          ? { ...i, status: "Paid" as const, paidAt: p.paidAt, method: `${p.method} · ${receipt}` }
          : i,
      ),
    );
    if (p.slipId) {
      updateItem("bankSlips", (s) => s.id === p.slipId, { status: "Verified", verifiedBy: by });
    }
    const amount = money(inst.amount, a.currency);
    logChange({
      tenantId,
      entity: "feeAccount",
      entityId: a.id,
      studentId: a.studentId,
      field: `${inst.label} · ${inst.payer}`,
      from: inst.status,
      to: "Paid",
      by,
      reason: [receipt, p.method, amount, p.reason].filter(Boolean).join(" · "),
    });
    notify({
      tenantId,
      channel: "Email",
      to: inst.payer,
      subject: `Receipt ${receipt} — ${amount} received`,
      body: `${inst.label} for ${learnerName(a.studentId)} (${a.studentId}), paid by ${p.method} on ${fmtDate(p.paidAt)}. Fee account ${a.id}.`,
      source: p.source,
      relatedId: receipt,
    });
    out.push({
      receipt,
      accountId: a.id,
      instalmentId: inst.id,
      amount: inst.amount,
      currency: a.currency,
      payer: inst.payer,
    });
  }
  for (const [id, instalments] of next)
    updateItem("feeAccounts", (x) => x.id === id, { instalments });
  return out;
}

/** Send one reminder for one instalment on the given channels. */
function sendReminder(
  tenantId: string,
  a: FeeAccount,
  inst: Instalment,
  ruleId: string,
  channels: Channel[],
  studentName: string,
) {
  const p = a.payers.find((x) => x.name === inst.payer);
  const d = daysBetween(inst.due, DEMO_TODAY);
  const when = d < 0 ? `due on ${fmtDate(inst.due)}` : d === 0 ? "due today" : `${d} days overdue`;
  const share =
    p && !FAMILY_PAYERS.includes(p.type)
      ? ` This is your ${p.sharePct}% share${p.reference ? ` (ref ${p.reference})` : ""}.`
      : "";
  for (const channel of channels) {
    addItem("paymentReminders", {
      id: nextId("PR-", "paymentReminders"),
      tenantId,
      feeAccountId: a.id,
      instalmentId: inst.id,
      studentId: a.studentId,
      ruleId,
      channel,
      to: inst.payer,
      sentAt: new Date().toISOString(),
      amount: inst.amount,
    });
    notify({
      tenantId,
      channel,
      to: inst.payer,
      subject: `${d > 0 ? "Overdue" : "Upcoming"} fee: ${money(inst.amount, a.currency)} for ${studentName}`,
      body: `${inst.label} — ${money(inst.amount, a.currency)} ${when}. Quote ${inst.id} when paying.${share} Pay online, by bank transfer (upload the slip) or at the finance office.`,
      source: "Fees · reminders",
      relatedId: inst.id,
    });
  }
}

/** Per-account "Send reminder": everything due or overdue, else the next item. */
function remindAccount(tenantId: string, a: FeeAccount, studentName: string) {
  const open = a.instalments.filter(isPayable).sort((x, y) => x.due.localeCompare(y.due));
  const due = open.filter((i) => i.status === "Due" || i.status === "Overdue");
  const targets = due.length ? due : open.slice(0, 1);
  if (!targets.length) {
    toast.message("Nothing to chase on this account", {
      description: "Every instalment is paid, on hold, cancelled or with finance.",
    });
    return;
  }
  for (const i of targets) sendReminder(tenantId, a, i, "manual", ["Email"], studentName);
  toast.success(`Reminder sent for ${studentName}`, {
    description: `${targets.length} item(s) · ${Array.from(new Set(targets.map((t) => t.payer))).join(", ")}`,
  });
}

/* ── page ────────────────────────────────────────────────────────────────── */

function FeesSponsorsPage() {
  const ctx = useTenantContext();
  const role = ctx.user?.role;
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          role === "admin"
            ? "Fees & Sponsors"
            : role === "student"
              ? "Fees & Funding"
              : "Fees & Payments"
        }
        subtitle={
          role === "admin"
            ? "Tuition accounts with deposits, instalment plans and third-party payers — employers, sponsors, scholarships, student loans and government funding."
            : "Your fee account, what's due and who pays which part."
        }
        actions={
          role === "admin" ? (
            <Link
              to="/app/finance"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border hover:bg-muted"
            >
              <Receipt className="h-3.5 w-3.5" /> Invoices & billing engine{" "}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : undefined
        }
      />
      <PackContextBar />
      {role === "admin" ? (
        <AdminView />
      ) : role === "teacher" ? (
        <Section>
          <p className="text-sm text-muted-foreground">
            Fee accounts are visible to the finance office, families and adult students only.
          </p>
        </Section>
      ) : (
        <FamilyView />
      )}
    </div>
  );
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

type AdminTab =
  | "accounts"
  | "payers"
  | "slips"
  | "reconcile"
  | "counter"
  | "reminders"
  | "cashflow"
  | "deposits";

function AdminView() {
  const ctx = useTenantContext();
  const all = useCollection("feeAccounts");
  const slips = useCollection("bankSlips");
  const learners = useCollection("learners");
  const applications = useCollection("applications");
  const lines = useCollection("bankStatementLines");
  const rules = useCollection("reminderRules");
  const sent = useCollection("paymentReminders");
  const [tab, setTab] = useState<AdminTab>("accounts");
  const [openId, setOpenId] = useState<string | null>(null);

  const accounts = useMemo(
    () => all.filter((a) => a.tenantId === ctx.tenantId),
    [all, ctx.tenantId],
  );
  const tenantSlips = slips.filter((s) => s.tenantId === ctx.tenantId);
  const pendingSlips = tenantSlips.filter((s) => s.status === "Pending");
  const learnerById = useMemo(() => new Map(learners.map((l) => [l.id, l])), [learners]);
  const deposits = applications.filter((a) => a.tenantId === ctx.tenantId && a.deposit);
  const toWork = lines.filter(
    (l) => l.tenantId === ctx.tenantId && (l.status === "Review" || l.status === "Unmatched"),
  ).length;
  const remindersReady = useMemo(
    () =>
      remindersDue(
        rules.filter((r) => r.tenantId === ctx.tenantId),
        accounts,
        sent.filter((s) => s.tenantId === ctx.tenantId),
        DEMO_TODAY,
      ).length,
    [rules, accounts, sent, ctx.tenantId],
  );

  const sums = useMemo(() => {
    let billed = 0,
      paid = 0,
      overdue = 0,
      thirdParty = 0;
    for (const a of accounts) {
      const t = totals(a);
      billed += t.billed;
      paid += t.paid;
      overdue += t.overdue;
      for (const [name, b] of Object.entries(t.byPayer)) {
        if (!isFamily(a, name)) thirdParty += b.billed;
      }
    }
    return { billed, paid, overdue, thirdParty, outstanding: billed - paid };
  }, [accounts]);

  const cur = ctx.currency;
  const second = ctx.profile?.secondCurrency;
  const open = accounts.find((a) => a.id === openId);

  if (accounts.length === 0 && deposits.length === 0) {
    return (
      <Section>
        <div className="text-center py-8">
          <Wallet className="h-8 w-8 mx-auto text-muted-foreground" />
          <div className="font-semibold mt-2">No fee accounts yet</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Fee accounts are opened when Admissions enrols a student (deposit and registration fee
            carry over) or when students are imported. Invoices and the classic billing engine stay
            in{" "}
            <Link to="/app/finance" className="text-primary underline">
              Finance
            </Link>
            .
          </p>
        </div>
      </Section>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Billed this year"
          value={money(sums.billed, cur)}
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          label="Collected"
          value={money(sums.paid, cur)}
          hint={`${sums.billed ? Math.round((sums.paid / sums.billed) * 100) : 0}% of billed`}
          accent="success"
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Outstanding"
          value={money(sums.outstanding, cur)}
          accent="warning"
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Overdue"
          value={money(sums.overdue, cur)}
          accent="destructive"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Paid by third parties"
          value={`${sums.billed ? Math.round((sums.thirdParty / sums.billed) * 100) : 0}%`}
          hint={money(sums.thirdParty, cur)}
          accent="info"
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      {second && (
        <div className="rounded-lg border bg-info/5 border-info/30 px-4 py-2.5 text-xs flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 text-info shrink-0" />
          <span>
            <span className="font-medium">Second pricing currency: {second}.</span> Prices can be
            quoted in {second} for international families, but the ledger, invoices and receipts
            always stay in <span className="font-medium">{cur}</span> — one tenant, one ledger
            currency (locked after the first invoice).
          </span>
        </div>
      )}

      <Section>
        <Tabs<AdminTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "accounts", label: "Fee accounts", count: accounts.length },
            { id: "payers", label: "Third-party payers" },
            { id: "slips", label: "Bank slips", count: pendingSlips.length },
            { id: "reconcile", label: "Bank reconciliation", count: toWork },
            { id: "counter", label: "Collection counter" },
            { id: "reminders", label: "Reminders", count: remindersReady },
            { id: "cashflow", label: "Cash flow" },
            { id: "deposits", label: "Admissions deposits", count: deposits.length },
          ]}
        />
        {tab === "accounts" && (
          <DataTable
            columns={[
              { key: "student", label: "Student" },
              { key: "plan", label: "Plan" },
              { key: "payers", label: "Payers" },
              { key: "billed", label: "Billed", className: "text-right" },
              { key: "paid", label: "Paid", className: "text-right" },
              { key: "outstanding", label: "Outstanding", className: "text-right" },
              { key: "status", label: "Status" },
              { key: "_actions", label: "" },
            ]}
            rows={accounts}
            renderCell={(a: FeeAccount, key) => {
              const t = totals(a);
              const l = learnerById.get(a.studentId);
              switch (key) {
                case "student":
                  return (
                    <div>
                      <div className="font-medium">{l?.name ?? a.studentId}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {a.studentId} · {l?.level}
                      </div>
                    </div>
                  );
                case "plan":
                  return <span className="text-xs">{a.plan}</span>;
                case "payers":
                  return (
                    <div className="flex flex-wrap gap-1">
                      {a.payers.map((p) => (
                        <Badge
                          key={p.name}
                          tone={FAMILY_PAYERS.includes(p.type) ? "muted" : "info"}
                        >
                          {p.type === "Parent / guardian" || p.type === "Self"
                            ? p.type
                            : p.name.split(" (")[0]}{" "}
                          · {p.sharePct}%
                        </Badge>
                      ))}
                    </div>
                  );
                case "billed":
                  return <Amount value={t.billed} a={a} />;
                case "paid":
                  return <Amount value={t.paid} a={a} />;
                case "outstanding":
                  return <Amount value={t.outstanding} a={a} strong />;
                case "status":
                  return t.overdue > 0 ? (
                    <Pill status="Overdue" />
                  ) : t.suspended > 0 ? (
                    <Pill status="Suspended" />
                  ) : t.pendingVerification > 0 ? (
                    <Pill status="Pending verification" />
                  ) : t.outstanding === 0 && t.cancelled > 0 ? (
                    <Pill status="Closed" />
                  ) : t.outstanding === 0 ? (
                    <Pill status="Paid" />
                  ) : (
                    <Badge tone="muted">On plan</Badge>
                  );
                case "_actions":
                  return (
                    <div className="flex gap-1.5 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Send reminder"
                        aria-label="Send reminder"
                        onClick={() => remindAccount(ctx.tenantId, a, l?.name ?? a.studentId)}
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setOpenId(a.id)}>
                        Open
                      </Button>
                    </div>
                  );
                default:
                  return null;
              }
            }}
          />
        )}
        {tab === "payers" && <ThirdPartyPayers accounts={accounts} learnerById={learnerById} />}
        {tab === "slips" && <SlipQueue accounts={accounts} learnerById={learnerById} />}
        {tab === "reconcile" && <Reconciliation accounts={accounts} learnerById={learnerById} />}
        {tab === "counter" && <CollectionCounter accounts={accounts} learnerById={learnerById} />}
        {tab === "reminders" && <Reminders accounts={accounts} learnerById={learnerById} />}
        {tab === "cashflow" && <CashFlow accounts={accounts} learnerById={learnerById} />}
        {tab === "deposits" && (
          <DataTable
            columns={[
              { key: "id", label: "Application" },
              { key: "applicantName", label: "Applicant" },
              { key: "target", label: "Applying for" },
              { key: "deposit", label: "Deposit", className: "text-right" },
              { key: "state", label: "Status" },
              { key: "fee", label: "Fee account" },
            ]}
            rows={deposits}
            emptyText="No deposits recorded by Admissions yet."
            renderCell={(app, key) => {
              if (key === "deposit") return money(app.deposit?.amount ?? 0, ctx.currency);
              if (key === "state")
                return <StatusPill status={app.deposit?.paid ? "Paid" : "Due"} />;
              if (key === "fee") {
                const acct = app.studentId
                  ? accounts.find((a) => a.studentId === app.studentId)
                  : undefined;
                return acct ? (
                  <button
                    className="text-xs text-primary underline"
                    onClick={() => setOpenId(acct.id)}
                  >
                    {acct.id}
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Opens on enrolment</span>
                );
              }
              return String(app[key as keyof typeof app] ?? "");
            }}
          />
        )}
        {tab === "deposits" && (
          <p className="text-[11px] text-muted-foreground mt-3">
            Deposits are taken by the Admissions module at offer acceptance and credited to the fee
            account when the applicant is enrolled — no separate invoice.
          </p>
        )}
      </Section>

      {open && (
        <AccountDialog
          account={open}
          learner={learnerById.get(open.studentId)}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

type TabProps = { accounts: FeeAccount[]; learnerById: Map<string, Learner> };

function ThirdPartyPayers({ accounts, learnerById }: TabProps) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        type: PayerType;
        students: string[];
        billed: number;
        paid: number;
        refs: string[];
        currency: string;
      }
    >();
    for (const a of accounts) {
      const t = totals(a);
      for (const p of a.payers) {
        if (FAMILY_PAYERS.includes(p.type)) continue;
        const r = map.get(p.name) ?? {
          name: p.name,
          type: p.type,
          students: [],
          billed: 0,
          paid: 0,
          refs: [],
          currency: a.currency,
        };
        r.students.push(learnerById.get(a.studentId)?.name ?? a.studentId);
        r.billed += t.byPayer[p.name]?.billed ?? 0;
        r.paid += t.byPayer[p.name]?.paid ?? 0;
        if (p.reference) r.refs.push(p.reference);
        map.set(p.name, r);
      }
    }
    return Array.from(map.values());
  }, [accounts, learnerById]);
  return (
    <>
      <DataTable
        columns={[
          { key: "name", label: "Payer" },
          { key: "type", label: "Type" },
          { key: "students", label: "Students" },
          { key: "billed", label: "Billed", className: "text-right" },
          { key: "outstanding", label: "Outstanding", className: "text-right" },
          { key: "_actions", label: "" },
        ]}
        rows={rows}
        emptyText="No third-party payers on this tenant."
        renderCell={(r, key) => {
          if (key === "name")
            return (
              <div>
                <div className="font-medium">{r.name}</div>
                {r.refs.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    {r.refs.slice(0, 2).join(" · ")}
                  </div>
                )}
              </div>
            );
          if (key === "type") return <Badge tone="info">{r.type}</Badge>;
          if (key === "students") return <span className="text-xs">{r.students.join(", ")}</span>;
          if (key === "billed") return money(r.billed, r.currency);
          if (key === "outstanding")
            return <span className="font-semibold">{money(r.billed - r.paid, r.currency)}</span>;
          if (key === "_actions")
            return (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast.success(`Sponsor invoice raised for ${r.name}`, {
                    description: `${money(r.billed - r.paid, r.currency)} — issued from Finance with ${r.students.length} student line(s).`,
                  })
                }
              >
                <HandCoins className="h-3.5 w-3.5" /> Invoice payer
              </Button>
            );
          return null;
        }}
      />
      <p className="text-[11px] text-muted-foreground mt-3">
        Third-party payers are invoiced directly (sponsor letters, employer POs, student-loan and
        government funding claims). Families only ever see — and pay — their own share.
      </p>
    </>
  );
}

function SlipQueue({ accounts, learnerById }: TabProps) {
  const ctx = useTenantContext();
  const slips = useCollection("bankSlips").filter((s) => s.tenantId === ctx.tenantId);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const by = ctx.user?.name ?? "Finance Office";

  const verify = (id: string) => {
    const s = slips.find((x) => x.id === id)!;
    if (!s.instalmentId) {
      updateItem("bankSlips", (x) => x.id === id, { status: "Verified", verifiedBy: by });
      toast.success("Slip verified");
      return;
    }
    const [r] = postPayments(
      ctx.tenantId,
      by,
      accounts,
      (sid) => learnerById.get(sid)?.name ?? sid,
      [
        {
          accountId: s.accountId,
          instalmentId: s.instalmentId,
          slipId: s.id,
          method: `Bank transfer (${s.bank})`,
          paidAt: DEMO_TODAY,
          reason: `Slip ${s.id} · ${s.reference}`,
          source: "Fees · bank slips",
        },
      ],
    );
    toast.success("Slip verified — instalment marked paid", {
      description: `${s.reference} · receipt ${r?.receipt ?? ""} sent to ${s.uploadedBy}`,
    });
  };

  const reject = () => {
    const s = slips.find((x) => x.id === rejectId)!;
    updateItem("bankSlips", (x) => x.id === rejectId, {
      status: "Rejected",
      verifiedBy: by,
      note,
    });
    const a = accounts.find((x) => x.id === s.accountId);
    if (a && s.instalmentId) {
      const inst = a.instalments.find((i) => i.id === s.instalmentId);
      const back = inst && inst.due < DEMO_TODAY ? "Overdue" : "Due";
      updateItem("feeAccounts", (x) => x.id === a.id, {
        instalments: a.instalments.map((i) =>
          i.id === s.instalmentId ? { ...i, status: back } : i,
        ),
      });
      logChange({
        tenantId: ctx.tenantId,
        entity: "feeAccount",
        entityId: a.id,
        studentId: a.studentId,
        field: `${inst?.label ?? s.instalmentId} · ${inst?.payer ?? ""}`,
        from: "Pending verification",
        to: back,
        by,
        reason: `Slip ${s.id} rejected: ${note || "no reason given"}`,
      });
    }
    notify({
      tenantId: ctx.tenantId,
      channel: "Email",
      to: s.uploadedBy,
      subject: `Bank slip not accepted — ${money(s.amount, s.currency)}`,
      body: `${s.reference}: ${note || "please contact the finance office"}. The instalment is open again.`,
      source: "Fees · bank slips",
      relatedId: s.id,
    });
    toast.message("Slip rejected", {
      description: `${s.uploadedBy} has been notified: ${note || "no reason given"}`,
    });
    setRejectId(null);
    setNote("");
  };

  const sorted = [...slips].sort(
    (a, b) =>
      (a.status === "Pending" ? -1 : 1) - (b.status === "Pending" ? -1 : 1) ||
      b.uploadedAt.localeCompare(a.uploadedAt),
  );

  return (
    <>
      <DataTable
        columns={[
          { key: "who", label: "Uploaded by" },
          { key: "student", label: "Student" },
          { key: "bank", label: "Bank & reference" },
          { key: "amount", label: "Amount", className: "text-right" },
          { key: "file", label: "Proof" },
          { key: "status", label: "Status" },
          { key: "_actions", label: "" },
        ]}
        rows={sorted}
        emptyText="No bank-transfer slips uploaded."
        renderCell={(s, key) => {
          const a = accounts.find((x) => x.id === s.accountId);
          switch (key) {
            case "who":
              return (
                <div>
                  <div className="font-medium">{s.uploadedBy}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(s.uploadedAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              );
            case "student":
              return (
                <div className="text-xs">
                  {learnerById.get(a?.studentId ?? "")?.name ?? "—"}
                  <div className="text-[11px] text-muted-foreground">
                    {a?.instalments.find((i) => i.id === s.instalmentId)?.label}
                  </div>
                </div>
              );
            case "bank":
              return (
                <div className="text-xs">
                  {s.bank}
                  <div className="font-mono text-[11px] text-muted-foreground">{s.reference}</div>
                </div>
              );
            case "amount":
              return money(s.amount, s.currency);
            case "file":
              return (
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <FileUp className="h-3.5 w-3.5" /> {s.fileName}
                </span>
              );
            case "status":
              return (
                <div>
                  <StatusPill status={s.status} />
                  {s.note && (
                    <div className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
                      {s.note}
                    </div>
                  )}
                </div>
              );
            case "_actions":
              return s.status === "Pending" ? (
                <div className="flex gap-1.5 justify-end">
                  <Button size="sm" onClick={() => verify(s.id)}>
                    Verify
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejectId(s.id)}>
                    Reject
                  </Button>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">{s.verifiedBy}</span>
              );
            default:
              return null;
          }
        }}
      />
      <p className="text-[11px] text-muted-foreground mt-3">
        Bank transfers are common in Sri Lanka, the Gulf and for international students. Families
        upload the slip; finance verifies it here or lets the statement import match it
        automatically (Bank reconciliation tab).
      </p>
      <FormDialog
        open={!!rejectId}
        onOpenChange={(v) => !v && setRejectId(null)}
        title="Reject bank slip"
        description="The uploader is told why and the instalment goes back to Due."
        submitLabel="Reject slip"
        submitVariant="destructive"
        onSubmit={reject}
      >
        <Field label="Reason" className="sm:col-span-2">
          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Amount does not match the instalment"
          />
        </Field>
      </FormDialog>
    </>
  );
}

/* ── Bank reconciliation ─────────────────────────────────────────────────── */

const SAMPLE_CSV = `date,reference,payer,amount
2026-11-02,FEES FA-3005 INST 4,TOM MORGAN,7340
2026-11-02,TRF 556120,K RAHMAN,9787
2026-11-02,ATM DEPOSIT,UNKNOWN,1500`;

function Reconciliation({ accounts, learnerById }: TabProps) {
  const ctx = useTenantContext();
  const allLines = useCollection("bankStatementLines");
  const allSlips = useCollection("bankSlips");
  const [batch, setBatch] = useState("all");
  const [status, setStatus] = useState("open");
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState<"sample" | "csv">("sample");
  const [sample, setSample] = useState("");
  const [csv, setCsv] = useState("");
  const [pickId, setPickId] = useState<string | null>(null);
  const [ignoreId, setIgnoreId] = useState<string | null>(null);
  const [ignoreNote, setIgnoreNote] = useState("");

  const by = ctx.user?.name ?? "Finance Office";
  const nameOf = (id: string) => learnerById.get(id)?.name ?? id;
  const lines = allLines.filter((l) => l.tenantId === ctx.tenantId);
  const slips = allSlips.filter((s) => s.tenantId === ctx.tenantId);
  const batches = Array.from(new Set(lines.map((l) => l.importBatch)));
  const samples = Array.from(
    new Set(
      bankStatementSamples.filter((l) => l.tenantId === ctx.tenantId).map((l) => l.importBatch),
    ),
  );
  const imported = new Set(batches);
  const pickLine = lines.find((l) => l.id === pickId);

  const shown = lines
    .filter((l) => batch === "all" || l.importBatch === batch)
    .filter((l) =>
      status === "all"
        ? true
        : status === "open"
          ? l.status === "Review" || l.status === "Unmatched"
          : l.status === status,
    )
    .sort(
      (a, b) =>
        Number(b.status === "Review") - Number(a.status === "Review") ||
        b.date.localeCompare(a.date) ||
        a.id.localeCompare(b.id),
    );

  const sum = (st: BankStatementLine["status"]) => {
    const ls = lines.filter((l) => l.status === st);
    return { n: ls.length, v: ls.reduce((s, l) => s + l.amount, 0) };
  };
  const matched = sum("Matched");
  const review = sum("Review");
  const unmatched = sum("Unmatched");
  const ignored = sum("Ignored");

  const runImport = () => {
    let incoming: Omit<BankStatementLine, "id" | "status">[] = [];
    let batchName = "";
    if (mode === "sample") {
      if (!sample) return toast.error("Choose a statement");
      if (imported.has(sample)) return toast.error("That statement is already imported");
      batchName = sample;
      incoming = bankStatementSamples
        .filter((l) => l.importBatch === sample && l.tenantId === ctx.tenantId)
        .map(({ id: _id, status: _s, ...rest }) => rest);
    } else {
      const parsed = parseStatementCsv(csv);
      if (parsed.error) return toast.error(parsed.error);
      if (!parsed.rows.length) return toast.error("Paste at least one statement line");
      batchName = `Pasted CSV · ${fmtDate(DEMO_TODAY)} · ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
      incoming = parsed.rows.map((r) => ({
        ...r,
        tenantId: ctx.tenantId,
        importBatch: batchName,
        currency: ctx.currency,
      }));
    }
    const base = parseInt(nextId("BL-", "bankStatementLines").slice(3), 10);
    let pool = openItems(accounts, slips);
    const posts: { lineId: string; post: Posting }[] = [];
    const built: BankStatementLine[] = incoming.map((l, k) => {
      const id = `BL-${base + k}`;
      const r = matchStatementLine(l, pool);
      if (r.status !== "Matched") return { ...l, id, status: r.status, note: r.note };
      const used = new Set(r.allocations.map((a) => a.instalmentId));
      pool = pool.filter((p) => !used.has(p.instalmentId));
      for (const a of r.allocations) {
        const slip = a.kind === "slip" ? slips.find((s) => s.id === a.id) : undefined;
        posts.push({
          lineId: id,
          post: {
            accountId: a.accountId,
            instalmentId: a.instalmentId,
            slipId: slip?.id,
            method: slip ? `Bank transfer (${slip.bank})` : "Bank transfer",
            paidAt: l.date,
            reason: `Bank statement ${id} · ${l.reference}`,
            source: "Fees · reconciliation",
          },
        });
      }
      return {
        ...l,
        id,
        status: "Matched",
        note: r.note,
        matched: {
          kind: r.allocations[0].kind,
          id: r.allocations[0].id,
          by: "auto",
          at: new Date().toISOString(),
        },
        allocations: r.allocations.map(({ kind, id: aid, accountId, instalmentId, amount }) => ({
          kind,
          id: aid,
          accountId,
          instalmentId,
          amount,
        })),
      };
    });
    const results = postPayments(
      ctx.tenantId,
      "Auto-match",
      accounts,
      nameOf,
      posts.map((p) => p.post),
    );
    for (const line of [...built].reverse()) {
      const mine = new Set(
        posts.filter((p) => p.lineId === line.id).map((p) => p.post.instalmentId),
      );
      const receipts = results.filter((r) => mine.has(r.instalmentId)).map((r) => r.receipt);
      addItem("bankStatementLines", {
        ...line,
        note: receipts.length
          ? [line.note, receipts.join(", ")].filter(Boolean).join(" · ")
          : line.note,
      });
    }
    const c = (st: string) => built.filter((b) => b.status === st).length;
    toast.success(`Imported ${built.length} lines from ${batchName}`, {
      description: `${c("Matched")} matched automatically · ${c("Review")} to review · ${c("Unmatched")} unmatched. Receipts sent for every match.`,
    });
    setImportOpen(false);
    setSample("");
    setCsv("");
    setBatch(batchName);
    setStatus("all");
  };

  const ignore = () => {
    const l = lines.find((x) => x.id === ignoreId);
    if (!l) return;
    updateItem("bankStatementLines", (x) => x.id === l.id, {
      status: "Ignored",
      note: ignoreNote || "Not a fee payment",
    });
    logChange({
      tenantId: ctx.tenantId,
      entity: "bankStatementLine",
      entityId: l.id,
      field: "status",
      from: l.status,
      to: "Ignored",
      by,
      reason: ignoreNote || "Not a fee payment",
    });
    setIgnoreId(null);
    setIgnoreNote("");
  };

  const restore = (l: BankStatementLine) => {
    updateItem("bankStatementLines", (x) => x.id === l.id, { status: "Unmatched", note: "" });
    logChange({
      tenantId: ctx.tenantId,
      entity: "bankStatementLine",
      entityId: l.id,
      field: "status",
      from: "Ignored",
      to: "Unmatched",
      by,
    });
  };

  const exportCsv = () => {
    const rows: (string | number | undefined)[][] = [
      [
        "Line",
        "Batch",
        "Date",
        "Reference",
        "Bank payer",
        "Amount",
        "Currency",
        "Status",
        "Matched to",
        "Students",
        "Matched by",
        "Note",
      ],
    ];
    for (const l of [...lines].sort((a, b) => a.date.localeCompare(b.date))) {
      const allocs = l.allocations ?? [];
      rows.push([
        l.id,
        l.importBatch,
        l.date,
        l.reference,
        l.payer,
        l.amount,
        l.currency,
        l.status,
        allocs.map((a) => (a.kind === "slip" ? `${a.id}/${a.instalmentId}` : a.id)).join(" "),
        allocs
          .map((a) => {
            const acc = accounts.find((x) => x.id === a.accountId);
            return acc ? `${nameOf(acc.studentId)} (${acc.studentId})` : a.accountId;
          })
          .join("; "),
        l.matched?.by,
        l.note,
      ]);
    }
    downloadCsv(`reconciliation-${ctx.tenantId}-${DEMO_TODAY}.csv`, rows);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Matched"
          value={money(matched.v, ctx.currency)}
          hint={`${matched.n} line(s) posted`}
          accent="success"
          icon={<Link2 className="h-4 w-4" />}
        />
        <StatCard
          label="To review"
          value={review.n}
          hint={money(review.v, ctx.currency)}
          accent="warning"
          icon={<Search className="h-4 w-4" />}
        />
        <StatCard
          label="Unmatched"
          value={unmatched.n}
          hint={money(unmatched.v, ctx.currency)}
          accent="destructive"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Ignored"
          value={ignored.n}
          hint="Charges, refunds, non-fee items"
          icon={<EyeOff className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-3.5 w-3.5" /> Import statement
        </Button>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" /> Export reconciliation
        </Button>
        <div className="flex-1" />
        <Select
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          className="h-8 text-xs w-auto max-w-[280px]"
          options={[
            { value: "all", label: "All statements" },
            ...batches.map((b) => ({ value: b, label: b })),
          ]}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 text-xs w-36"
          options={[
            { value: "open", label: "Needs action" },
            { value: "all", label: "All lines" },
            { value: "Matched", label: "Matched" },
            { value: "Review", label: "Review" },
            { value: "Unmatched", label: "Unmatched" },
            { value: "Ignored", label: "Ignored" },
          ]}
        />
      </div>

      <DataTable
        columns={[
          { key: "date", label: "Date" },
          { key: "line", label: "Bank line" },
          { key: "amount", label: "Amount", className: "text-right" },
          { key: "status", label: "Status" },
          { key: "to", label: "Matched to" },
          { key: "_actions", label: "" },
        ]}
        rows={shown}
        emptyText={
          status === "open"
            ? "Nothing to work — every imported line is matched or ignored."
            : "No statement lines."
        }
        renderCell={(l: BankStatementLine, key) => {
          switch (key) {
            case "date":
              return <span className="text-xs whitespace-nowrap">{fmtDate(l.date)}</span>;
            case "line":
              return (
                <div className="min-w-[200px]">
                  <div className="font-mono text-[11px]">{l.reference}</div>
                  <div className="text-xs">{l.payer}</div>
                  <div className="text-[10px] text-muted-foreground">{l.importBatch}</div>
                </div>
              );
            case "amount":
              return <span className="font-medium">{money(l.amount, l.currency)}</span>;
            case "status":
              return (
                <div>
                  <Pill status={l.status} />
                  {l.matched && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {l.matched.by === "auto" ? "Auto-matched" : `By ${l.matched.by}`}
                    </div>
                  )}
                  {l.note && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[220px]">
                      {l.note}
                    </div>
                  )}
                </div>
              );
            case "to":
              return (
                <div className="text-xs space-y-0.5">
                  {(l.allocations ?? []).map((a) => {
                    const acc = accounts.find((x) => x.id === a.accountId);
                    const inst = acc?.instalments.find((i) => i.id === a.instalmentId);
                    return (
                      <div key={a.instalmentId}>
                        {acc ? nameOf(acc.studentId) : a.accountId} ·{" "}
                        <span className="text-muted-foreground">
                          {inst?.label ?? a.instalmentId}
                          {a.kind === "slip" ? ` · slip ${a.id}` : ""}
                        </span>
                      </div>
                    );
                  })}
                  {!l.allocations?.length && <span className="text-muted-foreground">—</span>}
                </div>
              );
            case "_actions":
              if (l.status === "Review" || l.status === "Unmatched")
                return (
                  <div className="flex gap-1.5 justify-end">
                    <Button size="sm" onClick={() => setPickId(l.id)}>
                      Match…
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIgnoreId(l.id)}>
                      Ignore
                    </Button>
                  </div>
                );
              if (l.status === "Ignored")
                return (
                  <Button size="sm" variant="ghost" onClick={() => restore(l)}>
                    <Undo2 className="h-3.5 w-3.5" /> Restore
                  </Button>
                );
              return null;
            default:
              return null;
          }
        }}
      />
      <p className="text-[11px] text-muted-foreground">
        Auto-match needs the reference to name the fee account, instalment, 1StudentID, slip
        reference or the sponsor's PO / award number <em>and</em> the amount to equal what's due.
        Amount-only fits go to Review. A matched line marks the instalment paid, verifies any
        pending slip, logs the change and emails a receipt to the payer.
      </p>

      <FormDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import bank statement"
        description="Lines are matched against open instalments and pending bank slips as they import."
        submitLabel="Import & auto-match"
        onSubmit={runImport}
      >
        <div className="sm:col-span-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "sample" ? "primary" : "outline"}
            onClick={() => setMode("sample")}
          >
            Sample statement
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "csv" ? "primary" : "outline"}
            onClick={() => setMode("csv")}
          >
            Paste CSV
          </Button>
        </div>
        {mode === "sample" ? (
          <Field
            label="Statement file"
            className="sm:col-span-2"
            hint="Demo files from the tenant's bank. In production this is an upload or a bank feed."
          >
            <Select
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              options={[
                { value: "", label: samples.length ? "Choose a statement…" : "No sample files" },
                ...samples.map((s) => ({
                  value: s,
                  label: `${s}${imported.has(s) ? " — imported" : ""}`,
                })),
              ]}
            />
          </Field>
        ) : (
          <Field
            label="Statement lines"
            className="sm:col-span-2"
            hint={`Columns: date, reference, payer, amount. Amounts in ${ctx.currency}.`}
          >
            <TextArea
              rows={6}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={SAMPLE_CSV}
              className="font-mono text-xs"
            />
            <button
              type="button"
              className="text-[11px] text-primary underline"
              onClick={() => setCsv(SAMPLE_CSV)}
            >
              Use example
            </button>
          </Field>
        )}
      </FormDialog>

      <FormDialog
        open={!!ignoreId}
        onOpenChange={(v) => !v && setIgnoreId(null)}
        title="Ignore statement line"
        description="Ignored lines stay on the export but leave the work queue."
        submitLabel="Ignore line"
        onSubmit={ignore}
      >
        <Field label="Reason" className="sm:col-span-2">
          <TextInput
            value={ignoreNote}
            onChange={(e) => setIgnoreNote(e.target.value)}
            placeholder="e.g. Bank charge, refund, not a fee payment"
          />
        </Field>
      </FormDialog>

      {pickLine && (
        <MatchDialog
          line={pickLine}
          accounts={accounts}
          learnerById={learnerById}
          pool={openItems(accounts, slips)}
          onClose={() => setPickId(null)}
        />
      )}
    </div>
  );
}

function MatchDialog({
  line,
  accounts,
  learnerById,
  pool,
  onClose,
}: TabProps & { line: BankStatementLine; pool: OpenItem[]; onClose: () => void }) {
  const ctx = useTenantContext();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const nameOf = (id: string) => learnerById.get(id)?.name ?? id;
  const text = `${line.reference} ${line.payer}`;

  const ranked = useMemo(() => {
    const items = pool.filter((i) => i.currency === line.currency);
    return items
      .map((it) => {
        const r = refHit(text, it);
        const amt = Math.abs(it.amount - line.amount) < 0.01;
        const nm = nameHit(line, it) || nameHit(line, { ...it, payer: nameOf(it.studentId) });
        return {
          it,
          score: (r.hit && amt ? 8 : 0) + (amt ? 4 : 0) + (r.hit ? 2 : 0) + (nm ? 1 : 0),
        };
      })
      .sort((a, b) => b.score - a.score || a.it.due.localeCompare(b.it.due));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, line]);

  const needle = q.trim().toLowerCase();
  const list = ranked.filter(
    ({ it }) =>
      !needle ||
      `${nameOf(it.studentId)} ${it.studentId} ${it.accountId} ${it.payer} ${it.label}`
        .toLowerCase()
        .includes(needle),
  );
  const chosen = ranked.filter((r) => picked.includes(r.it.instalmentId)).map((r) => r.it);
  const total = chosen.reduce((s, c) => s + c.amount, 0);
  const diff = line.amount - total;
  const ok = chosen.length > 0 && Math.abs(diff) < 0.01;

  const confirm = () => {
    if (!ok) return;
    const by = ctx.user?.name ?? "Finance Office";
    const slips = chosen.filter((c) => c.kind === "slip");
    const results = postPayments(
      ctx.tenantId,
      by,
      accounts,
      nameOf,
      chosen.map((c) => ({
        accountId: c.accountId,
        instalmentId: c.instalmentId,
        slipId: c.kind === "slip" ? c.id : undefined,
        method: c.kind === "slip" ? "Bank transfer (slip verified)" : "Bank transfer",
        paidAt: line.date,
        reason: `Bank statement ${line.id} · ${line.reference} · matched manually`,
        source: "Fees · reconciliation",
      })),
    );
    updateItem("bankStatementLines", (x) => x.id === line.id, {
      status: "Matched",
      matched: { kind: chosen[0].kind, id: chosen[0].id, by, at: new Date().toISOString() },
      allocations: chosen.map(({ kind, id, accountId, instalmentId, amount }) => ({
        kind,
        id,
        accountId,
        instalmentId,
        amount,
      })),
      note: results.map((r) => r.receipt).join(", "),
    });
    toast.success(`Matched ${money(line.amount, line.currency)} to ${chosen.length} item(s)`, {
      description: `${slips.length ? `${slips.length} slip(s) verified · ` : ""}Receipts ${results.map((r) => r.receipt).join(", ")} sent.`,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match bank line</DialogTitle>
          <DialogDescription>
            {fmtDate(line.date)} · {line.reference} · {line.payer} ·{" "}
            <span className="font-semibold">{money(line.amount, line.currency)}</span>
          </DialogDescription>
        </DialogHeader>
        {line.note && (
          <div className="text-xs rounded-md bg-warning/10 border border-warning/30 px-3 py-2">
            {line.note}
          </div>
        )}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            className="pl-8 h-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student, account, payer…"
          />
        </div>
        <div className="rounded-lg border divide-y max-h-[45vh] overflow-y-auto">
          {list.length === 0 && (
            <div className="px-3 py-6 text-sm text-center text-muted-foreground">
              No open items in {line.currency}.
            </div>
          )}
          {list.map(({ it, score }) => {
            const on = picked.includes(it.instalmentId);
            return (
              <label
                key={it.instalmentId}
                className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 ${on ? "bg-primary/5" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setPicked(
                      on
                        ? picked.filter((p) => p !== it.instalmentId)
                        : [...picked, it.instalmentId],
                    )
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {nameOf(it.studentId)}{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {it.accountId} · {it.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {it.payer} · due {fmtDate(it.due)}
                    {it.kind === "slip" ? ` · slip ${it.slipRef}` : ""}
                  </div>
                </div>
                {score >= 8 ? (
                  <Badge tone="success">Best fit</Badge>
                ) : score >= 4 ? (
                  <Badge tone="info">Amount fits</Badge>
                ) : score >= 2 ? (
                  <Badge tone="muted">Reference</Badge>
                ) : null}
                <Pill status={it.status} />
                <span className="w-28 text-right font-medium">
                  {money(it.amount, line.currency)}
                </span>
              </label>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            Selected {chosen.length} · {money(total, line.currency)}{" "}
            {chosen.length > 0 && !ok && (
              <span className="text-destructive">
                · {diff > 0 ? "short of the line by" : "over the line by"}{" "}
                {money(Math.abs(diff), line.currency)} — part-payments can't be posted yet
              </span>
            )}
            {ok && <span className="text-success">· amounts agree</span>}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled={!ok} onClick={confirm}>
              <Link2 className="h-3.5 w-3.5" /> Match & post
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tick several items for a bulk remittance (e.g. one government or sponsor payment covering
          several students).
        </p>
      </DialogContent>
    </Dialog>
  );
}

/* ── Collection counter ──────────────────────────────────────────────────── */

function CollectionCounter({ accounts, learnerById }: TabProps) {
  const ctx = useTenantContext();
  const nameOf = (id: string) => learnerById.get(id)?.name ?? id;
  const [accountId, setAccountId] = useState("");
  const [instalmentId, setInstalmentId] = useState("");
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [from, setFrom] = useState("");
  const [last, setLast] = useState<(PostResult & { method: string; from: string }) | null>(null);

  const withOpen = accounts
    .filter((a) => a.instalments.some(isPayable))
    .sort((a, b) => nameOf(a.studentId).localeCompare(nameOf(b.studentId)));
  const account = accounts.find((a) => a.id === accountId);
  const options = (account?.instalments ?? [])
    .filter(isPayable)
    .sort((a, b) => a.due.localeCompare(b.due));
  const inst = options.find((i) => i.id === instalmentId) ?? options[0];
  const slipWaiting = account?.instalments.filter((i) => i.status === "Pending verification") ?? [];

  const take = () => {
    if (!account || !inst) return toast.error("Choose a student and the item being paid");
    if ((method === "Cheque" || method === "Bank transfer") && !reference.trim())
      return toast.error(`Add the ${method === "Cheque" ? "cheque number" : "transfer reference"}`);
    const label = `${method}${reference.trim() ? ` (${reference.trim()})` : ""}`;
    const payer = from.trim() || inst.payer;
    const [r] = postPayments(ctx.tenantId, ctx.user?.name ?? "Finance Office", accounts, nameOf, [
      {
        accountId: account.id,
        instalmentId: inst.id,
        method: label,
        paidAt: DEMO_TODAY,
        reason: `Collection counter · received from ${payer}`,
        source: "Fees · collection counter",
      },
    ]);
    if (!r) return;
    setLast({ ...r, method: label, from: payer });
    toast.success(`Receipt ${r.receipt} issued`, {
      description: `${money(r.amount, r.currency)} · ${label} · emailed to ${r.payer}`,
    });
    setInstalmentId("");
    setReference("");
    setFrom("");
    if (options.length <= 1) setAccountId("");
  };

  const receipts = accounts
    .flatMap((a) =>
      a.instalments
        .filter((i) => i.status === "Paid" && receiptOf(i.method))
        .map((i) => ({ a, i, receipt: receiptOf(i.method)! })),
    )
    .sort((x, y) => parseInt(y.receipt.slice(4), 10) - parseInt(x.receipt.slice(4), 10));
  const today = receipts.filter((r) => r.i.paidAt === DEMO_TODAY);
  const byMethod = new Map<string, number>();
  for (const r of today) {
    const m = methodOf(r.i.method).split(" (")[0];
    byMethod.set(m, (byMethod.get(m) ?? 0) + r.i.amount);
  }

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 rounded-lg border p-4 space-y-3">
        <div>
          <div className="text-sm font-semibold">Take a payment</div>
          <div className="text-[11px] text-muted-foreground">
            For payments made in person at the finance office. Posts to the account and issues a
            numbered receipt.
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Student / fee account" required className="sm:col-span-2">
            <Select
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setInstalmentId("");
              }}
              options={[
                { value: "", label: "Choose a student…" },
                ...withOpen.map((a) => ({
                  value: a.id,
                  label: `${nameOf(a.studentId)} · ${a.studentId} · ${a.id}`,
                })),
              ]}
            />
          </Field>
          <Field label="Paying for" required className="sm:col-span-2">
            <Select
              value={inst?.id ?? ""}
              disabled={!account}
              onChange={(e) => setInstalmentId(e.target.value)}
              options={
                options.length
                  ? options.map((i) => ({
                      value: i.id,
                      label: `${i.label} · ${i.payer} · ${money(i.amount, account!.currency)} · ${i.status}`,
                    }))
                  : [{ value: "", label: account ? "Nothing open" : "—" }]
              }
            />
          </Field>
          <Field label="Method">
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={COUNTER_METHODS.map((m) => ({ value: m, label: m }))}
            />
          </Field>
          <Field label="Amount" hint="Full instalment — part-payments aren't supported yet.">
            <TextInput
              readOnly
              value={inst && account ? money(inst.amount, account.currency) : ""}
              className="bg-muted/40"
            />
          </Field>
          <Field
            label={
              method === "Cheque"
                ? "Cheque number"
                : method === "Card"
                  ? "Card auth code"
                  : "Reference"
            }
            required={method === "Cheque" || method === "Bank transfer"}
          >
            <TextInput
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={method === "Cash" ? "Optional" : "e.g. 220145"}
            />
          </Field>
          <Field label="Received from">
            <TextInput
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder={inst?.payer ?? "Payer"}
            />
          </Field>
        </div>
        {slipWaiting.length > 0 && (
          <div className="text-[11px] rounded-md bg-warning/10 border border-warning/30 px-3 py-2">
            {slipWaiting.length} item(s) on this account have a bank slip waiting — verify those in
            Bank slips instead of taking the money twice.
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={take} disabled={!inst}>
            <Receipt className="h-4 w-4" /> Take payment & issue receipt
          </Button>
        </div>
        {last && (
          <div className="rounded-lg border border-success/40 bg-success/5 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">Receipt {last.receipt}</div>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {money(last.amount, last.currency)} · {last.method} · received from {last.from} ·{" "}
              {fmtDate(DEMO_TODAY)} · emailed to {last.payer}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="rounded-lg border p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Today · {fmtDate(DEMO_TODAY)}
          </div>
          {today.length === 0 ? (
            <p className="text-sm text-muted-foreground">No receipts issued today yet.</p>
          ) : (
            <dl className="text-sm space-y-1">
              {Array.from(byMethod).map(([m, v]) => (
                <div key={m} className="flex justify-between">
                  <dt className="text-muted-foreground">{m}</dt>
                  <dd>{money(v, ctx.currency)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 font-semibold">
                <dt>Total · {today.length} receipt(s)</dt>
                <dd>
                  {money(
                    today.reduce((s, r) => s + r.i.amount, 0),
                    ctx.currency,
                  )}
                </dd>
              </div>
            </dl>
          )}
        </div>
        <div className="rounded-lg border">
          <div className="px-4 py-2.5 border-b text-sm font-semibold">Receipts issued</div>
          <div className="divide-y max-h-[340px] overflow-y-auto">
            {receipts.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                Receipts appear here as payments are posted — counter, bank statement, slips or
                online.
              </div>
            )}
            {receipts.slice(0, 30).map(({ a, i, receipt }) => (
              <div key={i.id} className="px-4 py-2 text-xs flex items-center gap-2">
                <span className="font-mono w-[72px] shrink-0">{receipt}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    {nameOf(a.studentId)} · {i.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {methodOf(i.method)} · {i.paidAt && fmtDate(i.paidAt)}
                  </div>
                </div>
                <span className="font-medium">{money(i.amount, a.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Reminders ───────────────────────────────────────────────────────────── */

function Reminders({ accounts, learnerById }: TabProps) {
  const ctx = useTenantContext();
  const allRules = useCollection("reminderRules");
  const allSent = useCollection("paymentReminders");
  const [addOpen, setAddOpen] = useState(false);
  const [days, setDays] = useState(14);
  const [dir, setDir] = useState<"before" | "after">("after");
  const [chans, setChans] = useState<Channel[]>(["Email"]);
  const nameOf = (id: string) => learnerById.get(id)?.name ?? id;

  const rules = allRules
    .filter((r) => r.tenantId === ctx.tenantId)
    .sort((a, b) => a.offsetDays - b.offsetDays);
  const sent = allSent
    .filter((s) => s.tenantId === ctx.tenantId)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const due = useMemo(
    () => remindersDue(rules, accounts, sent, DEMO_TODAY),
    [rules, accounts, sent],
  );
  const ruleLabel = (id: string) =>
    id === "manual" ? "Sent by hand" : (allRules.find((r) => r.id === id)?.label ?? id);
  const instOf = (accountId: string, instalmentId: string) =>
    accounts.find((a) => a.id === accountId)?.instalments.find((i) => i.id === instalmentId);

  const run = () => {
    if (!due.length) return toast.message("Nothing to send — everyone is up to date");
    let messages = 0;
    for (const h of due) {
      const inst = h.account.instalments.find((i) => i.id === h.instalmentId);
      if (!inst) continue;
      sendReminder(
        ctx.tenantId,
        h.account,
        inst,
        h.rule.id,
        h.rule.channels,
        nameOf(h.account.studentId),
      );
      messages += h.rule.channels.length;
    }
    const payers = new Set(
      due.map((h) => h.account.instalments.find((i) => i.id === h.instalmentId)?.payer ?? ""),
    );
    toast.success(`${messages} reminder(s) sent to ${payers.size} payer(s)`, {
      description: "Queued in the outbox (IT Administration → Outbox).",
    });
  };

  const toggleChannel = (r: ReminderRule, c: Channel) => {
    const next = r.channels.includes(c) ? r.channels.filter((x) => x !== c) : [...r.channels, c];
    if (!next.length) return toast.error("A rule needs at least one channel");
    updateItem("reminderRules", (x) => x.id === r.id, { channels: next });
  };

  const addRule = () => {
    const offset = days === 0 ? 0 : dir === "before" ? -Math.abs(days) : Math.abs(days);
    if (rules.some((r) => r.offsetDays === offset))
      return toast.error(`There's already a rule for ${ruleWhen(offset).toLowerCase()}`);
    if (!chans.length) return toast.error("Pick at least one channel");
    addItem("reminderRules", {
      id: nextId("RR-", "reminderRules"),
      tenantId: ctx.tenantId,
      label: ruleWhen(offset),
      offsetDays: offset,
      channels: chans,
      active: true,
    });
    setAddOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Reminder rules</div>
            <div className="text-[11px] text-muted-foreground">
              Each unpaid instalment gets one reminder per stage, to whoever pays that share. Paid,
              suspended, cancelled and slip-pending items are skipped.
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add rule
          </Button>
        </div>
        <div className="divide-y">
          {rules.map((r) => (
            <div key={r.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium min-w-[160px]">{r.label}</span>
              <div className="flex gap-1">
                {CHANNELS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleChannel(r, c)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border ${r.channels.includes(c) ? "bg-primary/10 border-primary/40 text-primary" : "text-muted-foreground"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button
                onClick={() =>
                  updateItem("reminderRules", (x) => x.id === r.id, { active: !r.active })
                }
                className={`text-[11px] px-2 py-0.5 rounded-full ${r.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
              >
                {r.active ? "Active" : "Off"}
              </button>
              <button
                aria-label="Delete rule"
                className="p-1 rounded hover:bg-muted"
                onClick={() => removeItem("reminderRules", (x) => x.id === r.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              No rules — add one to start automatic reminders.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Ready to send · {fmtDate(DEMO_TODAY)}</div>
            <div className="text-[11px] text-muted-foreground">
              Runs daily in production. Run it now to send today's batch.
            </div>
          </div>
          <Button size="sm" onClick={run} disabled={!due.length}>
            <Play className="h-3.5 w-3.5" /> Run reminders now
          </Button>
        </div>
        <DataTable
          columns={[
            { key: "student", label: "Student" },
            { key: "item", label: "Instalment" },
            { key: "payer", label: "To" },
            { key: "amount", label: "Amount", className: "text-right" },
            { key: "rule", label: "Rule" },
          ]}
          rows={due}
          emptyText="Nothing due for a reminder today."
          renderCell={(h: (typeof due)[number], key) => {
            const inst = h.account.instalments.find((i) => i.id === h.instalmentId)!;
            const p = h.account.payers.find((x) => x.name === inst.payer);
            if (key === "student")
              return (
                <div>
                  <div className="font-medium">{nameOf(h.account.studentId)}</div>
                  <div className="text-[11px] text-muted-foreground">{h.account.id}</div>
                </div>
              );
            if (key === "item")
              return (
                <div className="text-xs">
                  {inst.label}
                  <div className="text-[11px] text-muted-foreground">
                    due {fmtDate(inst.due)} ·{" "}
                    {h.offset > 0
                      ? `${h.offset} days overdue`
                      : h.offset === 0
                        ? "today"
                        : `in ${-h.offset} days`}
                  </div>
                </div>
              );
            if (key === "payer")
              return (
                <div className="text-xs">
                  {inst.payer}
                  <div className="text-[11px] text-muted-foreground">
                    {p?.type ?? "Payer"}
                    {p && p.sharePct < 100 ? ` · ${p.sharePct}% share` : ""}
                  </div>
                </div>
              );
            if (key === "amount") return money(inst.amount, h.account.currency);
            if (key === "rule")
              return (
                <div className="text-xs">
                  {h.rule.label}
                  <div className="text-[11px] text-muted-foreground">
                    {h.rule.channels.join(", ")}
                  </div>
                </div>
              );
            return null;
          }}
        />
      </div>

      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b text-sm font-semibold">
          History <span className="font-normal text-muted-foreground">· {sent.length} sent</span>
        </div>
        <DataTable
          columns={[
            { key: "sentAt", label: "Sent" },
            { key: "student", label: "Student" },
            { key: "item", label: "Instalment" },
            { key: "to", label: "To" },
            { key: "channel", label: "Channel" },
            { key: "rule", label: "Rule" },
          ]}
          rows={sent.slice(0, 40)}
          emptyText="No reminders sent yet."
          renderCell={(s: (typeof sent)[number], key) => {
            const inst = instOf(s.feeAccountId, s.instalmentId);
            if (key === "sentAt")
              return (
                <span className="text-xs whitespace-nowrap">
                  {new Date(s.sentAt).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              );
            if (key === "student") return <span className="text-xs">{nameOf(s.studentId)}</span>;
            if (key === "item")
              return (
                <div className="text-xs">
                  {inst?.label ?? s.instalmentId}
                  {inst && (
                    <div className="text-[11px] text-muted-foreground">
                      now <span className="font-medium">{inst.status}</span>
                    </div>
                  )}
                </div>
              );
            if (key === "to") return <span className="text-xs">{s.to}</span>;
            if (key === "channel") return <Badge tone="muted">{s.channel}</Badge>;
            if (key === "rule") return <span className="text-xs">{ruleLabel(s.ruleId)}</span>;
            return null;
          }}
        />
      </div>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add reminder rule"
        description="When to remind, relative to the instalment's due date."
        submitLabel="Add rule"
        onSubmit={addRule}
      >
        <Field label="Days">
          <NumberInput
            min={0}
            max={180}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </Field>
        <Field label="Relative to due date">
          <Select
            value={dir}
            onChange={(e) => setDir(e.target.value as "before" | "after")}
            options={[
              { value: "before", label: "Before due" },
              { value: "after", label: "After due (overdue)" },
            ]}
          />
        </Field>
        <Field label="Channels" className="sm:col-span-2">
          <div className="flex gap-2">
            {CHANNELS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() =>
                  setChans(chans.includes(c) ? chans.filter((x) => x !== c) : [...chans, c])
                }
                className={`text-xs px-2.5 py-1 rounded-md border ${chans.includes(c) ? "bg-primary/10 border-primary/40 text-primary" : "text-muted-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <p className="text-[11px] text-muted-foreground sm:col-span-2">
          Rule: {ruleWhen(days === 0 ? 0 : dir === "before" ? -days : days)}.
        </p>
      </FormDialog>
    </div>
  );
}

/* ── Cash flow ───────────────────────────────────────────────────────────── */

type GroupBy = "programme" | "intake" | "payer";

function termWindow(cal?: AcademicCalendar): { label: string; from: string } {
  const fallback = { label: "Last 90 days", from: addDays(DEMO_TODAY, -90) };
  if (!cal) return fallback;
  const teaching = cal.terms
    .filter((t) => t.kind === "teaching")
    .sort((a, b) => a.start.localeCompare(b.start));
  const cur =
    teaching.find((t) => t.start <= DEMO_TODAY && DEMO_TODAY <= t.end) ??
    [...teaching].reverse().find((t) => t.start <= DEMO_TODAY);
  if (!cur) return fallback;
  const idx = teaching.indexOf(cur);
  // Fees for a term are collected in the run-up to it, so the window opens
  // after the previous term ends (or a month before the first term).
  const from = idx === 0 ? addDays(cur.start, -30) : addDays(teaching[idx - 1].end, 1);
  return { label: cur.name, from };
}

function CashFlow({ accounts, learnerById }: TabProps) {
  const ctx = useTenantContext();
  const calendars = useCollection("academicCalendars");
  const curricula = useCollection("curricula");
  const programmes = useCollection("programmes");
  const quals = useCollection("qualifications");
  const [groupBy, setGroupBy] = useState<GroupBy>("programme");
  const cur = ctx.currency;
  const nameOf = (id: string) => learnerById.get(id)?.name ?? id;

  const cal =
    calendars.find((c) => c.tenantId === ctx.tenantId && c.isDefault) ??
    calendars.find((c) => c.tenantId === ctx.tenantId);
  const term = termWindow(cal);
  const month = DEMO_TODAY.slice(0, 7);
  const tenantCurricula = curricula.filter((c) => c.tenantId === ctx.tenantId);

  const programmeOf = (l?: Learner) => {
    if (!l) return "Unknown";
    if (l.programmeId) return programmes.find((p) => p.id === l.programmeId)?.name ?? l.programmeId;
    if (l.qualificationId)
      return quals.find((q) => q.id === l.qualificationId)?.title ?? l.qualificationId;
    if (l.curriculumId)
      return curricula.find((c) => c.id === l.curriculumId)?.name ?? l.curriculumId;
    if (tenantCurricula.length === 1) return tenantCurricula[0].name;
    return l.level;
  };

  const rows = useMemo(
    () =>
      accounts.flatMap((a) =>
        a.instalments
          .filter((i) => i.status !== "Cancelled")
          .map((i) => ({
            a,
            i,
            l: learnerById.get(a.studentId),
            type: (a.payers.find((p) => p.name === i.payer)?.type ?? "Self") as PayerType,
          })),
      ),
    [accounts, learnerById],
  );

  const sumOf = (xs: typeof rows) => xs.reduce((s, r) => s + r.i.amount, 0);
  const paid = rows.filter((r) => r.i.status === "Paid");
  const open = rows.filter((r) => isOpen(r.i));
  const collectedMonth = sumOf(paid.filter((r) => r.i.paidAt?.startsWith(month)));
  const collectedTerm = sumOf(
    paid.filter((r) => r.i.paidAt && r.i.paidAt >= term.from && r.i.paidAt <= DEMO_TODAY),
  );
  const outstanding = sumOf(open);
  const onHold = sumOf(open.filter((r) => r.i.status === "Suspended"));
  const overdue30 = open.filter(
    (r) =>
      r.i.status !== "Pending verification" &&
      r.i.status !== "Suspended" &&
      r.i.due < addDays(DEMO_TODAY, -30),
  );
  const arrears = open.filter(
    (r) =>
      r.i.status !== "Suspended" && r.i.status !== "Pending verification" && r.i.due < DEMO_TODAY,
  );

  const months = [0, 1, 2].map((k) => {
    const d = new Date(Date.UTC(+DEMO_TODAY.slice(0, 4), +DEMO_TODAY.slice(5, 7) - 1 + k, 1));
    const key = d.toISOString().slice(0, 7);
    const due = open.filter(
      (r) => r.i.status !== "Suspended" && r.i.due.startsWith(key) && r.i.due >= DEMO_TODAY,
    );
    return {
      key,
      label: d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }),
      value: sumOf(due),
      third: sumOf(due.filter((r) => !FAMILY_PAYERS.includes(r.type))),
      count: due.length,
    };
  });
  const maxMonth = Math.max(1, ...months.map((m) => m.value));

  const groups = useMemo(() => {
    const keyOf = (r: (typeof rows)[number]) =>
      groupBy === "payer"
        ? r.type
        : groupBy === "intake"
          ? (r.l?.intake ?? `Academic year ${r.a.academicYear}`)
          : programmeOf(r.l);
    const map = new Map<
      string,
      {
        key: string;
        students: Set<string>;
        billed: number;
        paid: number;
        open: number;
        late: number;
      }
    >();
    for (const r of rows) {
      const k = keyOf(r);
      const g = map.get(k) ?? { key: k, students: new Set(), billed: 0, paid: 0, open: 0, late: 0 };
      g.students.add(r.a.studentId);
      g.billed += r.i.amount;
      if (r.i.status === "Paid") g.paid += r.i.amount;
      if (isOpen(r.i)) g.open += r.i.amount;
      if (overdue30.includes(r)) g.late += r.i.amount;
      map.set(k, g);
    }
    return Array.from(map.values()).sort((a, b) => b.billed - a.billed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, groupBy, curricula, programmes, quals]);

  const awards = accounts.flatMap((a) =>
    a.discounts.filter((d) => /scholar|bursar|award|grant/i.test(d.label)).map((d) => ({ a, d })),
  );

  const funders = useMemo(() => {
    const map = new Map<
      string,
      {
        payer: string;
        type: PayerType;
        refs: Set<string>;
        students: Set<string>;
        expected: number;
        received: number;
        advance: number;
        future: number;
      }
    >();
    for (const r of rows) {
      if (FAMILY_PAYERS.includes(r.type)) continue;
      const p = r.a.payers.find((x) => x.name === r.i.payer);
      const f = map.get(r.i.payer) ?? {
        payer: r.i.payer,
        type: r.type,
        refs: new Set<string>(),
        students: new Set<string>(),
        expected: 0,
        received: 0,
        advance: 0,
        future: 0,
      };
      if (p?.reference) f.refs.add(p.reference);
      f.students.add(r.a.studentId);
      const isPaid = r.i.status === "Paid";
      if (r.i.due <= DEMO_TODAY) {
        f.expected += r.i.amount;
        if (isPaid) f.received += r.i.amount;
      } else if (isPaid) f.advance += r.i.amount;
      else f.future += r.i.amount;
      map.set(r.i.payer, f);
    }
    return Array.from(map.values()).sort((a, b) => b.expected - a.expected);
  }, [rows]);

  const exportFunders = () => {
    const out: (string | number)[][] = [
      [
        "Payer",
        "Type",
        "Scheme / references",
        "Students",
        "Expected to date",
        "Received",
        "Outstanding",
        "Received in advance",
        "Still to fall due",
        "Currency",
      ],
    ];
    for (const f of funders) {
      out.push([
        f.payer,
        f.type,
        Array.from(f.refs).join("; "),
        Array.from(f.students)
          .map((s) => `${nameOf(s)} (${s})`)
          .join("; "),
        f.expected,
        f.received,
        f.expected - f.received,
        f.advance,
        f.future,
        cur,
      ]);
    }
    downloadCsv(`funding-body-reconciliation-${ctx.tenantId}-${DEMO_TODAY}.csv`, out);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Collected this month"
          value={money(collectedMonth, cur)}
          hint={new Date(DEMO_TODAY).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}
          accent="success"
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Collected this term"
          value={money(collectedTerm, cur)}
          hint={`${term.label} · since ${fmtDate(term.from)}`}
          accent="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Outstanding"
          value={money(outstanding, cur)}
          hint={
            onHold
              ? `incl. ${money(onHold, cur)} on hold (suspended)`
              : `${open.length} open item(s)`
          }
          accent="warning"
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Overdue 30+ days"
          value={money(sumOf(overdue30), cur)}
          hint={`${overdue30.length} item(s)`}
          accent="destructive"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 rounded-lg border p-4">
          <div className="text-sm font-semibold">Next 3 months</div>
          <div className="text-[11px] text-muted-foreground mb-3">
            Scheduled instalments still to fall due. Arrears are not included.
          </div>
          <MiniBars
            data={months.map((m) => ({ label: m.label.split(" ")[0], value: m.value }))}
            max={maxMonth}
          />
          <dl className="mt-3 text-xs space-y-1">
            {months.map((m) => (
              <div key={m.key} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {m.label} · {m.count} item(s)
                </dt>
                <dd>
                  <span className="font-medium">{money(m.value, cur)}</span>
                  {m.third > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {money(m.third, cur)} third-party
                    </span>
                  )}
                </dd>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1">
              <dt className="text-muted-foreground">Arrears to chase now</dt>
              <dd className="font-medium text-destructive">{money(sumOf(arrears), cur)}</dd>
            </div>
          </dl>
        </div>
        <div className="lg:col-span-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <div className="text-sm font-semibold">Breakdown</div>
              <div className="text-[11px] text-muted-foreground">
                Instalment ledger for the year. Deposits and registration fees are collected upfront
                and not included.
              </div>
            </div>
            <Select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="h-8 text-xs w-48"
              options={[
                {
                  value: "programme",
                  label: ctx.type === "university" ? "By programme" : "By programme / curriculum",
                },
                { value: "intake", label: "By intake" },
                { value: "payer", label: "By payer type" },
              ]}
            />
          </div>
          <DataTable
            columns={[
              {
                key: "key",
                label:
                  groupBy === "payer"
                    ? "Payer type"
                    : groupBy === "intake"
                      ? "Intake"
                      : "Programme",
              },
              { key: "students", label: "Students", className: "text-right" },
              { key: "billed", label: "Billed", className: "text-right" },
              { key: "paid", label: "Collected", className: "text-right" },
              { key: "open", label: "Outstanding", className: "text-right" },
              { key: "late", label: "30+ overdue", className: "text-right" },
            ]}
            rows={groups}
            renderCell={(g: (typeof groups)[number], key) => {
              if (key === "key") return <span className="text-xs font-medium">{g.key}</span>;
              if (key === "students") return g.students.size;
              if (key === "billed") return money(g.billed, cur);
              if (key === "paid")
                return (
                  <span>
                    {money(g.paid, cur)}{" "}
                    <span className="text-[10px] text-muted-foreground">
                      {g.billed ? Math.round((g.paid / g.billed) * 100) : 0}%
                    </span>
                  </span>
                );
              if (key === "open") return money(g.open, cur);
              if (key === "late")
                return g.late ? (
                  <span className="text-destructive">{money(g.late, cur)}</span>
                ) : (
                  "—"
                );
              return null;
            }}
          />
          {awards.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Plus{" "}
              {money(
                awards.reduce((s, x) => s + x.d.amount, 0),
                cur,
              )}{" "}
              awarded as scholarship / bursary discounts on {awards.length} account(s) — never
              billed, so not in the figures above.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold flex items-center gap-1.5">
              <Landmark className="h-4 w-4" /> Funding-body reconciliation
            </div>
            <div className="text-[11px] text-muted-foreground">
              Sponsors, employers, scholarships, student loans and government funding: what was due
              to date, what arrived and what to claim.
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={exportFunders} disabled={!funders.length}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
        <DataTable
          columns={[
            { key: "payer", label: "Payer / scheme" },
            { key: "students", label: "Students", className: "text-right" },
            { key: "expected", label: "Expected to date", className: "text-right" },
            { key: "received", label: "Received", className: "text-right" },
            { key: "gap", label: "Outstanding", className: "text-right" },
            { key: "advance", label: "In advance", className: "text-right" },
            { key: "future", label: "Still to come", className: "text-right" },
            { key: "state", label: "" },
          ]}
          rows={funders}
          emptyText="No third-party payers on this tenant."
          renderCell={(f: (typeof funders)[number], key) => {
            const gap = f.expected - f.received;
            if (key === "payer")
              return (
                <div>
                  <div className="font-medium text-xs">{f.payer}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {f.type}
                    {f.refs.size ? ` · ${Array.from(f.refs).slice(0, 2).join(" · ")}` : ""}
                    {f.refs.size > 2 ? ` +${f.refs.size - 2}` : ""}
                  </div>
                </div>
              );
            if (key === "students") return f.students.size;
            if (key === "expected") return money(f.expected, cur);
            if (key === "received") return money(f.received, cur);
            if (key === "gap")
              return (
                <span className={gap > 0 ? "text-destructive font-medium" : undefined}>
                  {money(gap, cur)}
                </span>
              );
            if (key === "advance") return f.advance ? money(f.advance, cur) : "—";
            if (key === "future") return money(f.future, cur);
            if (key === "state")
              return gap > 0 ? (
                <Badge tone="warning">Claim outstanding</Badge>
              ) : (
                <Badge tone="success">Reconciled</Badge>
              );
            return null;
          }}
        />
      </div>
    </div>
  );
}

/* ── Account detail ──────────────────────────────────────────────────────── */

function AccountDialog({
  account: a,
  learner,
  onClose,
}: {
  account: FeeAccount;
  learner?: Learner;
  onClose: () => void;
}) {
  const ctx = useTenantContext();
  const calendars = useCollection("academicCalendars");
  const cal = calendars.find((c) => c.id === learner?.calendarId);
  const t = totals(a);
  const [payers, setPayers] = useState<FeePayer[]>(a.payers);
  const [plan, setPlan] = useState<FeePlan>(a.plan);
  const [payFor, setPayFor] = useState<Instalment | null>(null);
  const [method, setMethod] = useState("Card");
  const sum = payers.reduce((s, p) => s + (Number(p.sharePct) || 0), 0);
  const dirty = JSON.stringify(payers) !== JSON.stringify(a.payers) || plan !== a.plan;
  const studentName = learner?.name ?? a.studentId;

  const save = () => {
    if (sum !== 100) {
      toast.error(`Payer shares must add up to 100% (currently ${sum}%)`);
      return;
    }
    if (payers.some((p) => !p.name.trim())) {
      toast.error("Every payer needs a name");
      return;
    }
    const periods =
      plan === a.plan
        ? existingPeriods(a)
        : periodsFor(plan, cal, existingPeriods(a), learner?.startDate);
    const instalments = buildInstalments({ ...a, payers }, periods, DEMO_TODAY, a.instalments);
    updateItem("feeAccounts", (x) => x.id === a.id, { payers, plan, instalments });
    logChange({
      tenantId: a.tenantId,
      entity: "feeAccount",
      entityId: a.id,
      studentId: a.studentId,
      field: "payment plan",
      from: `${a.plan} · ${a.payers.map((p) => `${p.name} ${p.sharePct}%`).join(", ")}`,
      to: `${plan} · ${payers.map((p) => `${p.name} ${p.sharePct}%`).join(", ")}`,
      by: ctx.user?.name ?? "Finance Office",
    });
    toast.success("Payment plan updated", {
      description: `${periods.length} period(s) × ${payers.length} payer(s) — schedule regenerated from ${cal ? cal.name : "the existing dates"}.`,
    });
  };

  const recordPayment = () => {
    if (!payFor) return;
    const [r] = postPayments(
      a.tenantId,
      ctx.user?.name ?? "Finance Office",
      [a],
      () => studentName,
      [
        {
          accountId: a.id,
          instalmentId: payFor.id,
          method,
          paidAt: DEMO_TODAY,
          reason: "Recorded on the fee account",
          source: "Fees · payments",
        },
      ],
    );
    toast.success(`Payment recorded — ${money(payFor.amount, a.currency)}`, {
      description: `${payFor.label} · ${payFor.payer} · ${method}${r ? ` · receipt ${r.receipt}` : ""}`,
    });
    setPayFor(null);
  };

  const byLabel = existingPeriods(a);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <span>
              {studentName} — fee account {a.academicYear}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => remindAccount(a.tenantId, a, studentName)}
            >
              <Bell className="h-3.5 w-3.5" /> Send reminder
            </Button>
          </DialogTitle>
          <DialogDescription>
            {a.id} · {learner?.level} · ledger in {a.currency}
            {a.displayCurrency ? ` · priced also in ${a.displayCurrency} @ ${a.fxRate}` : ""}
            {learner?.funding ? ` · funding: ${learner.funding}` : ""}
          </DialogDescription>
        </DialogHeader>

        {(t.suspended > 0 || t.cancelled > 0) && (
          <div className="rounded-lg border bg-warning/5 border-warning/30 px-3 py-2 text-xs">
            {t.suspended > 0 && (
              <div>
                {money(t.suspended, a.currency)} on hold — interruption approved. Not chased until
                the student returns.
              </div>
            )}
            {t.cancelled > 0 && (
              <div>
                {money(t.cancelled, a.currency)} cancelled — withdrawal approved. Removed from the
                bill.
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Charges
            </div>
            <dl className="text-sm space-y-1.5">
              <Row label="Registration fee" a={a} value={a.registrationFee} />
              <Row
                label={`Deposit${a.deposit.paid ? " (paid, credited)" : " (unpaid)"}`}
                a={a}
                value={a.deposit.amount}
                sub={a.deposit.source}
              />
              <Row label="Tuition" a={a} value={a.tuition} />
              {a.extras.map((x) => (
                <Row key={x.label} label={x.label} a={a} value={x.amount} />
              ))}
              {a.discounts.map((x) => (
                <Row key={x.label} label={x.label} a={a} value={-x.amount} tone="success" />
              ))}
              <div className="border-t pt-1.5">
                <Row
                  label="Total for the year"
                  a={a}
                  value={a.registrationFee + accountBase(a)}
                  strong
                />
              </div>
            </dl>
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Position
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="Billed" value={money(t.billed, a.currency)} />
              <Mini label="Paid" value={money(t.paid, a.currency)} tone="text-success" />
              <Mini
                label="Outstanding"
                value={money(t.outstanding, a.currency)}
                tone={t.overdue ? "text-destructive" : undefined}
              />
            </div>
            <div className="space-y-1.5">
              {Object.entries(t.byPayer).map(([name, b]) => (
                <div key={name}>
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{name}</span>
                    <span className="text-muted-foreground">
                      {money(b.paid, a.currency)} / {money(b.billed, a.currency)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${b.billed ? Math.min(100, (b.paid / b.billed) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-sm font-semibold">Who pays</div>
              <div className="text-[11px] text-muted-foreground">
                Split the bill between the family and third parties. Shares must total 100%.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={plan}
                onChange={(e) => setPlan(e.target.value as FeePlan)}
                options={PLANS.map((p) => ({ value: p, label: p }))}
                className="h-8 text-xs w-44"
              />
              <Badge tone={sum === 100 ? "success" : "destructive"}>{sum}%</Badge>
            </div>
          </div>
          <div className="space-y-2">
            {payers.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <TextInput
                  className="col-span-12 sm:col-span-4 h-9"
                  value={p.name}
                  placeholder="Payer name"
                  onChange={(e) =>
                    setPayers(payers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                <Select
                  className="col-span-6 sm:col-span-3 h-9"
                  value={p.type}
                  onChange={(e) =>
                    setPayers(
                      payers.map((x, j) =>
                        j === i ? { ...x, type: e.target.value as PayerType } : x,
                      ),
                    )
                  }
                  options={PAYER_TYPES.map((x) => ({ value: x, label: x }))}
                />
                <TextInput
                  className="col-span-4 sm:col-span-3 h-9"
                  value={p.reference ?? ""}
                  placeholder="PO / letter ref"
                  onChange={(e) =>
                    setPayers(
                      payers.map((x, j) => (j === i ? { ...x, reference: e.target.value } : x)),
                    )
                  }
                />
                <NumberInput
                  className="col-span-1 h-9 px-2"
                  value={p.sharePct}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    setPayers(
                      payers.map((x, j) =>
                        j === i ? { ...x, sharePct: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
                <button
                  className="col-span-1 h-9 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-30"
                  disabled={payers.length === 1}
                  aria-label="Remove payer"
                  onClick={() => setPayers(payers.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPayers([...payers, { name: "", type: "Sponsor", sharePct: 0 }])}
            >
              <Plus className="h-3.5 w-3.5" /> Add payer
            </Button>
            <Button size="sm" disabled={!dirty} onClick={save}>
              Save & regenerate schedule
            </Button>
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
            Instalment schedule · {a.plan}
            <span className="text-[11px] font-normal text-muted-foreground">
              Dates from {cal?.name ?? "the account"}
            </span>
          </div>
          <div className="divide-y">
            {byLabel.map((p) => (
              <div key={p.label} className="px-4 py-2.5">
                <div className="text-xs font-medium flex items-center gap-2">
                  {p.label}
                  <span className="text-muted-foreground font-normal">due {fmtDate(p.due)}</span>
                </div>
                {a.instalments
                  .filter((i) => i.label === p.label)
                  .map((i) => (
                    <div
                      key={i.id}
                      className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-sm"
                    >
                      <span className="text-xs text-muted-foreground min-w-[180px]">{i.payer}</span>
                      <Amount value={i.amount} a={a} />
                      <Pill status={i.status} />
                      {i.status === "Paid" ? (
                        <span className="text-[11px] text-muted-foreground w-40 text-right">
                          {i.method}
                        </span>
                      ) : i.status === "Suspended" || i.status === "Cancelled" ? (
                        <span className="text-[11px] text-muted-foreground w-40 text-right">
                          {i.status === "Suspended" ? "On hold" : "Not billed"}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-40"
                          onClick={() => setPayFor(i)}
                        >
                          Record payment
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        <FormDialog
          open={!!payFor}
          onOpenChange={(v) => !v && setPayFor(null)}
          title="Record payment"
          description={
            payFor ? `${payFor.label} · ${payFor.payer} · ${money(payFor.amount, a.currency)}` : ""
          }
          submitLabel="Record payment"
          onSubmit={recordPayment}
        >
          <Field label="Method" className="sm:col-span-2">
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={[
                "Card",
                "Bank transfer",
                "Direct Debit",
                "Cash",
                "Cheque",
                "Sponsor remittance",
                "Loan disbursement",
                "Government claim",
              ].map((m) => ({ value: m, label: m }))}
            />
          </Field>
          <p className="text-[11px] text-muted-foreground sm:col-span-2">
            A numbered receipt is issued in {a.currency}
            {ctx.profile?.secondCurrency
              ? ` (the ${ctx.profile.secondCurrency} figure is informational only)`
              : ""}{" "}
            and emailed to the payer.
          </p>
        </FormDialog>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  a,
  sub,
  strong,
  tone,
}: {
  label: string;
  value: number;
  a: FeeAccount;
  sub?: string;
  strong?: boolean;
  tone?: "success";
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? "font-semibold" : "text-muted-foreground"}>
        {label}
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </dt>
      <dd className={tone === "success" ? "text-success text-right" : "text-right"}>
        <Amount value={value} a={a} strong={strong} />
      </dd>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── Family / student ────────────────────────────────────────────────────── */

function FamilyView() {
  const ctx = useTenantContext();
  const learners = useScopedLearners();
  const accounts = useCollection("feeAccounts");
  const slips = useCollection("bankSlips");
  const [slipFor, setSlipFor] = useState<{ a: FeeAccount; i: Instalment } | null>(null);
  const [payFor, setPayFor] = useState<{ a: FeeAccount; i: Instalment } | null>(null);
  const [bank, setBank] = useState("");
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const mine = learners
    .map((l) => ({
      l,
      a: accounts.find((a) => a.studentId === l.id && a.tenantId === ctx.tenantId),
    }))
    .filter((x): x is { l: Learner; a: FeeAccount } => !!x.a);

  if (mine.length === 0) {
    return (
      <Section>
        <p className="text-sm text-muted-foreground">No fee account is linked to your login yet.</p>
      </Section>
    );
  }

  const setStatus = (a: FeeAccount, id: string, patch: Partial<Instalment>) =>
    updateItem("feeAccounts", (x) => x.id === a.id, {
      instalments: a.instalments.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });

  const pay = () => {
    if (!payFor) return;
    const learner = mine.find((m) => m.a.id === payFor.a.id)?.l;
    const [r] = postPayments(
      ctx.tenantId,
      ctx.actingAs || ctx.user?.name || "Payer",
      [payFor.a],
      () => learner?.name ?? payFor.a.studentId,
      [
        {
          accountId: payFor.a.id,
          instalmentId: payFor.i.id,
          method: "Card",
          paidAt: DEMO_TODAY,
          reason: `Online payment · ${ctx.region.paymentGateways[0]}`,
          source: "Fees · online payment",
        },
      ],
    );
    toast.success(`Paid ${money(payFor.i.amount, payFor.a.currency)} by card`, {
      description: `Receipt ${r?.receipt ?? ""} has been emailed to you.`,
    });
    setPayFor(null);
  };

  const upload = () => {
    if (!slipFor) return;
    if (!file || !bank.trim() || !ref.trim()) {
      toast.error("Add the bank, the transfer reference and the slip file");
      return;
    }
    addItem("bankSlips", {
      id: nextId("BS-", "bankSlips"),
      tenantId: ctx.tenantId,
      accountId: slipFor.a.id,
      instalmentId: slipFor.i.id,
      amount: slipFor.i.amount,
      currency: slipFor.a.currency,
      bank,
      reference: ref,
      uploadedBy: ctx.user?.name ?? "",
      uploadedAt: new Date().toISOString(),
      fileName: file.name,
      status: "Pending",
    });
    setStatus(slipFor.a, slipFor.i.id, { status: "Pending verification" });
    toast.success("Slip uploaded", {
      description:
        "Finance will verify it against the bank statement — usually within 2 working days.",
    });
    setSlipFor(null);
    setBank("");
    setRef("");
    setFile(null);
  };

  return (
    <div className="space-y-4">
      {mine.map(({ l, a }) => {
        const t = totals(a);
        const family = a.payers.filter((p) => FAMILY_PAYERS.includes(p.type)).map((p) => p.name);
        const myShare = family.reduce((s, n) => s + (t.byPayer[n]?.billed ?? 0), 0);
        const myPaid = family.reduce((s, n) => s + (t.byPayer[n]?.paid ?? 0), 0);
        const thirdParty = a.payers.filter((p) => !FAMILY_PAYERS.includes(p.type));
        const mySlips = slips.filter((s) => s.accountId === a.id);
        return (
          <Section
            key={a.id}
            title={`${l.name} · ${l.level}`}
            description={`${a.academicYear} · ${a.plan} · ${a.id}`}
          >
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <Mini label="Your share" value={money(myShare, a.currency)} />
              <Mini label="You've paid" value={money(myPaid, a.currency)} tone="text-success" />
              <Mini
                label="Still to pay"
                value={money(Math.max(0, myShare - myPaid), a.currency)}
                tone={t.overdue ? "text-destructive" : undefined}
              />
            </div>
            {a.currency !== getDisplayCurrency() && (
              <p className="text-[11px] text-muted-foreground mb-3">
                Amounts are shown in {getDisplayCurrency()}; the school bills in {a.currency}.
              </p>
            )}
            {thirdParty.length > 0 && (
              <div className="rounded-lg border bg-info/5 border-info/30 px-3 py-2 text-xs mb-3 flex flex-wrap gap-x-4 gap-y-1">
                {thirdParty.map((p) => (
                  <span key={p.name}>
                    <span className="font-medium">{p.sharePct}%</span> paid directly by {p.name} (
                    {p.type.toLowerCase()}) — {money(t.byPayer[p.name]?.paid ?? 0, a.currency)} of{" "}
                    {money(t.byPayer[p.name]?.billed ?? 0, a.currency)} received
                  </span>
                ))}
              </div>
            )}
            <div className="divide-y rounded-lg border">
              {a.instalments
                .filter((i) => family.includes(i.payer))
                .map((i) => (
                  <div
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-[160px]">
                      <div className="font-medium">{i.label}</div>
                      <div className="text-[11px] text-muted-foreground">Due {fmtDate(i.due)}</div>
                    </div>
                    <Amount value={i.amount} a={a} />
                    <Pill status={i.status} />
                    {i.status === "Paid" ||
                    i.status === "Pending verification" ||
                    i.status === "Suspended" ||
                    i.status === "Cancelled" ? (
                      <span className="text-[11px] text-muted-foreground w-[220px] text-right">
                        {i.status === "Paid"
                          ? `Paid · ${i.method}`
                          : i.status === "Pending verification"
                            ? "Slip with finance"
                            : i.status === "Suspended"
                              ? "On hold while studies are paused"
                              : "Cancelled — nothing to pay"}
                      </span>
                    ) : (
                      <div className="flex gap-1.5 w-[220px] justify-end">
                        <Button size="sm" onClick={() => setPayFor({ a, i })}>
                          <CreditCard className="h-3.5 w-3.5" /> Pay now
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSlipFor({ a, i })}>
                          <FileUp className="h-3.5 w-3.5" /> Bank slip
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              {a.instalments.filter((i) => family.includes(i.payer)).length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  Nothing for you to pay — this account is fully funded by third parties.
                </div>
              )}
            </div>
            {mySlips.length > 0 && (
              <div className="mt-3 text-xs space-y-1">
                <div className="font-medium text-muted-foreground">Uploaded slips</div>
                {mySlips.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-2">
                    <StatusPill status={s.status} />
                    <span>
                      {s.fileName} · {money(s.amount, s.currency)} · {s.reference}
                    </span>
                    {s.note && <span className="text-destructive">— {s.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </Section>
        );
      })}

      <FormDialog
        open={!!payFor}
        onOpenChange={(v) => !v && setPayFor(null)}
        title="Pay by card"
        description={
          payFor ? `${payFor.i.label} · ${money(payFor.i.amount, payFor.a.currency)}` : ""
        }
        submitLabel="Pay now"
        onSubmit={pay}
      >
        <Field label="Card number" className="sm:col-span-2">
          <TextInput defaultValue="4242 4242 4242 4242" />
        </Field>
        <Field label="Expiry">
          <TextInput defaultValue="12 / 28" />
        </Field>
        <Field label="CVC">
          <TextInput defaultValue="123" />
        </Field>
        <p className="text-[11px] text-muted-foreground sm:col-span-2">
          Demo gateway: {ctx.region.paymentGateways[0]}. No real payment is taken.
        </p>
      </FormDialog>

      <FormDialog
        open={!!slipFor}
        onOpenChange={(v) => !v && setSlipFor(null)}
        title="Upload bank-transfer slip"
        description={
          slipFor ? `${slipFor.i.label} · ${money(slipFor.i.amount, slipFor.a.currency)}` : ""
        }
        submitLabel="Upload slip"
        onSubmit={upload}
      >
        <Field label="Bank" required>
          <TextInput
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="e.g. Emirates NBD"
          />
        </Field>
        <Field label="Transfer reference" required>
          <TextInput
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. TRF-123456"
          />
        </Field>
        <Field label="Slip (PDF or photo)" required className="sm:col-span-2">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-xs"
          />
        </Field>
      </FormDialog>
    </div>
  );
}
