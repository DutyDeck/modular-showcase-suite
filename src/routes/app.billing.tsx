import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, StatCard, Badge, Button } from "@/components/ui-kit";
import { useCollection, addItem, nextId, type Invoice } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { InvoiceBreakdown } from "@/components/InvoiceBreakdown";
import { generateInvoice, monthRange, currentMonthISO, type DraftInvoice } from "@/lib/billing";
import { isSwimAdmin, INSTITUTE_BILLING_PROFILE, SWIM_BILLING_PROFILE } from "@/lib/mockData";
import {
  ReceiptText,
  ChevronDown,
  ChevronRight,
  Printer,
  Users,
  CalendarDays,
  Wallet,
  Percent,
  Landmark,
  Send,
  Info,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/app/billing")({
  head: () => ({ meta: [{ title: "Billing & Invoicing — 1StudentID" }] }),
  component: BillingPage,
});

function BillingPage() {
  const { user } = useAuth();
  const { formatMoney } = usePrefs();
  const swim = isSwimAdmin(user);
  const isAdmin = user?.role === "admin";

  const enrollments = useCollection("billingEnrollments");
  const bookings = useCollection("revisionBookings");
  const feePlans = useCollection("feePlans");
  const discounts = useCollection("discounts");
  const revSessions = useCollection("revisionSessions");
  const credits = useCollection("billingCredits");
  const closures = useCollection("billingClosures");
  const issuedInvoices = useCollection("invoices");

  const [month, setMonth] = useState(currentMonthISO());
  const [openId, setOpenId] = useState<string | null>(null);
  const { start, end } = monthRange(month);
  const profile = swim ? SWIM_BILLING_PROFILE : INSTITUTE_BILLING_PROFILE;

  const invoices = useMemo(() => {
    const scoped = enrollments.filter((e) =>
      swim ? e.courseId.startsWith("C-SWIM") : !e.courseId.startsWith("C-SWIM"),
    );
    const ids = Array.from(new Set(scoped.map((e) => e.studentId)));
    return ids
      .map((id) =>
        generateInvoice(id, start, end, {
          enrollments: scoped,
          revisionBookings: bookings,
          feePlans,
          discounts,
          revisionSessions: revSessions,
          credits,
          closures,
        }),
      )
      .filter((inv) => inv.lines.length > 0)
      .sort((a, b) => b.total - a.total);
  }, [
    enrollments,
    bookings,
    feePlans,
    discounts,
    revSessions,
    credits,
    closures,
    start,
    end,
    swim,
  ]);

  const sum = (fn: (i: DraftInvoice) => number) => invoices.reduce((a, i) => a + fn(i), 0);
  const totalDue = sum((i) => i.total);
  const totalGross = sum((i) => i.gross);
  const totalDiscount = sum((i) => i.discountTotal + i.creditTotal);
  const totalVat = sum((i) => i.vat);
  const totalSessions = sum((i) => i.sessionCount);

  const monthClosures = closures.filter((c) => (c.to ?? c.date) >= start && c.date <= end);
  const periodLabel = invoices[0]?.periodLabel ?? month;

  // An invoice already issued from THIS scope for THIS student+month (blocks double-billing).
  const scopeMatch = (i: Invoice) => (swim ? i.courseId === "C-SWIM" : i.courseId !== "C-SWIM");
  const existingFor = (studentId: string) =>
    issuedInvoices.find(
      (i) => i.periodMonth === month && i.studentId === studentId && scopeMatch(i),
    );

  const toInvoiceRow = (inv: DraftInvoice): Invoice => ({
    id: nextId("INV-2026-", "invoices"),
    date: end,
    desc: `${inv.periodLabel} fees — ${inv.studentName}`,
    amount: inv.total,
    status: "Due",
    method: "—",
    studentId: inv.studentId,
    institutionId: swim ? undefined : "T-006",
    institutionName: swim ? "Royal Vista Aquatics" : "Royal Vista College",
    courseId: swim ? "C-SWIM" : undefined,
    periodMonth: month,
  });

  const issueOne = (inv: DraftInvoice) => {
    if (existingFor(inv.studentId)) {
      toast.info(`${inv.studentName}'s ${periodLabel} invoice is already issued`);
      return;
    }
    addItem("invoices", toInvoiceRow(inv));
    toast.success(`Issued ${inv.studentName}'s ${periodLabel} invoice → Fees & Collections`);
  };

  const issueAll = () => {
    const pending = invoices.filter((inv) => !existingFor(inv.studentId));
    if (pending.length === 0) {
      toast.info(`Every ${periodLabel} invoice has already been issued`);
      return;
    }
    for (const inv of pending) addItem("invoices", toInvoiceRow(inv));
    const skipped = invoices.length - pending.length;
    toast.success(
      `Issued ${pending.length} invoice${pending.length === 1 ? "" : "s"} for ${periodLabel}` +
        (skipped ? ` · skipped ${skipped} already issued` : ""),
    );
  };

  const issuedCount = invoices.filter((i) => existingFor(i.studentId)).length;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing & Invoicing" />
        <Section title="Admins only">
          <p className="text-sm text-muted-foreground">
            The monthly billing run is available to institute administrators.
          </p>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Invoicing"
        subtitle={
          swim
            ? "Auto-generated swim-club invoices from each family's booked sessions."
            : "Auto-generated invoices built from each student's selected courses and booked sessions."
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              aria-label="Billing month"
            />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print run
            </Button>
            <Button onClick={issueAll}>
              <Send className="h-4 w-4" />
              Issue all
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Students billed"
          value={invoices.length}
          hint={issuedCount ? `${issuedCount} issued` : "draft"}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Sessions"
          value={totalSessions}
          hint={periodLabel}
          icon={<CalendarDays className="h-5 w-5" />}
          accent="info"
        />
        <StatCard label="Gross" value={formatMoney(totalGross)} accent="info" />
        <StatCard
          label="Discounts + credits"
          value={`−${formatMoney(totalDiscount)}`}
          icon={<Percent className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label={swim ? "VAT (exempt)" : "VAT @ 20%"}
          value={swim ? "—" : formatMoney(totalVat)}
          icon={<Landmark className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Total to collect"
          value={formatMoney(totalDue)}
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
      </div>

      {monthClosures.length > 0 && (
        <div className="rounded-xl border border-info/30 bg-info/5 px-4 py-3 flex items-start gap-3">
          <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-medium">Closures excluded from {periodLabel}:</span>{" "}
            {monthClosures
              .map((c) => {
                const d = (iso: string) =>
                  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  });
                const when = c.to ? `${d(c.date)}–${d(c.to)}` : d(c.date);
                return `${when} — ${c.reason}`;
              })
              .join(" · ")}
            . No class on these dates is billed.
          </div>
        </div>
      )}

      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <ReceiptText className="h-4 w-4" /> Draft invoices · {periodLabel}
          </span>
        }
        description={`${invoices.length} ${swim ? "families" : "students"} · issued by ${profile.legalName}${
          profile.vatRegistered && profile.vatNumber ? ` · VAT ${profile.vatNumber}` : ""
        }`}
      >
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No billable enrolments for this period. Students choose courses on the{" "}
            <Link to="/app/my-courses" className="text-primary underline">
              Course Selection
            </Link>{" "}
            page, and fees are defined under{" "}
            <Link to="/app/pricing" className="text-primary underline">
              Fees &amp; Pricing
            </Link>
            .
          </p>
        ) : (
          <div className="divide-y">
            {invoices.map((inv) => {
              const open = openId === inv.studentId;
              const existing = existingFor(inv.studentId);
              return (
                <div key={inv.studentId} className="py-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOpenId(open ? null : inv.studentId)}
                      className="flex-1 min-w-0 flex items-center gap-3 py-2.5 text-left hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      {open ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{inv.studentName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {inv.courseCount} course{inv.courseCount === 1 ? "" : "s"} ·{" "}
                          {inv.sessionCount} session{inv.sessionCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      {inv.discountTotal + inv.creditTotal > 0 && (
                        <Badge tone="success">
                          −{formatMoney(inv.discountTotal + inv.creditTotal)}
                        </Badge>
                      )}
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-sm tabular-nums">
                          {formatMoney(inv.total)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {swim ? "exempt" : `incl. ${formatMoney(inv.vat)} VAT`}
                        </div>
                      </div>
                    </button>
                    <div className="shrink-0">
                      {existing ? (
                        <Link
                          to="/app/invoice/$id"
                          params={{ id: existing.id }}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md text-success font-medium hover:bg-success/10"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Issued
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => issueOne(inv)}>
                          Issue
                        </Button>
                      )}
                    </div>
                  </div>
                  {open && (
                    <div className="px-2 sm:px-6 pb-4 pt-1">
                      <InvoiceBreakdown invoice={inv} profile={profile} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
