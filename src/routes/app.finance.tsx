import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  Button,
  Field,
  TextInput,
  Select,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { useCollection, addItem, updateItem, nextId, type Invoice } from "@/lib/store";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import {
  children as parentChildren,
  isSwimAdmin,
  isOffboarded,
  SWIM_COURSE_ID,
  SWIM_PAYMENT_METHODS,
} from "@/lib/mockData";
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Receipt,
  Plus,
  Check,
  Building2,
  Landmark,
  Banknote,
  Repeat,
} from "lucide-react";

export const Route = createFileRoute("/app/finance")({
  head: () => ({ meta: [{ title: "Finance — 1StudentID" }] }),
  component: FinancePage,
});

const METHODS = ["Visa •••• 4242", "PayPal", "Stripe", "Razorpay", "PayHere", "Bank transfer"];

function FinancePage() {
  const { user } = useAuth();
  const allInvoices = useCollection("invoices");
  const mandates = useCollection("paymentMandates");
  const offboardings = useCollection("offboardings");
  const { formatMoney } = usePrefs();
  const add = useDisclosure();
  const pay = useDisclosure();
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const swimAdmin = isSwimAdmin(user);
  // Swim families pay by Direct Debit / Card / Cash; the generic gateway list is
  // used for the multi-institute college demo.
  const methodOptions = swimAdmin ? [...SWIM_PAYMENT_METHODS] : METHODS;

  // Scope: the swim-club admin sees only swim-club fees; institute admins see
  // only their institute's invoices; parents see only invoices for their own
  // children; everyone else sees everything.
  const isInstituteScoped = user?.adminScope === "institute";
  const isParent = user?.role === "parent";
  // An admin runs *collections* (records payments received, chases dues) — they
  // are not the one paying. Parents/students see a "pay my fees" view instead.
  const isAdmin = user?.role === "admin";
  const invoices = (() => {
    if (isSwimAdmin(user)) {
      return allInvoices.filter((i) => i.courseId === SWIM_COURSE_ID);
    }
    if (isInstituteScoped) {
      return allInvoices.filter((i) => i.institutionId === user?.institutionId);
    }
    if (isParent) {
      const ids = new Set(parentChildren.map((c) => c.id));
      return allInvoices.filter((i) => i.studentId && ids.has(i.studentId));
    }
    return allInvoices;
  })();

  const paid = invoices.filter((i) => i.status === "Paid").reduce((a, i) => a + i.amount, 0);
  const due = invoices.filter((i) => i.status === "Due").reduce((a, i) => a + i.amount, 0);
  const upcoming = invoices
    .filter((i) => i.status === "Upcoming")
    .reduce((a, i) => a + i.amount, 0);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    desc: "",
    amount: 100,
    status: "Due",
  });

  const submitInvoice = () => {
    if (!form.desc.trim()) {
      toast.error("Description is required");
      return;
    }
    const inv: Invoice = {
      id: nextId("INV-2026-", "invoices"),
      date: form.date,
      desc: form.desc.trim(),
      amount: Number(form.amount) || 0,
      status: form.status,
      method: "—",
    };
    addItem("invoices", inv);
    toast.success("Invoice created");
    setForm({
      date: new Date().toISOString().slice(0, 10),
      desc: "",
      amount: 100,
      status: "Due",
    });
    add.onClose();
  };

  const [payMethod, setPayMethod] = useState(methodOptions[0]);

  const submitPayment = () => {
    if (!payTarget) return;
    updateItem("invoices", (i) => i.id === payTarget.id, {
      status: "Paid",
      method: payMethod,
    });
    toast.success(`Paid ${formatMoney(payTarget.amount)} for ${payTarget.id}`);
    setPayTarget(null);
    pay.onClose();
  };

  const openPay = (inv: Invoice) => {
    setPayTarget(inv);
    setPayMethod(methodOptions[0]);
    pay.onOpen();
  };

  const payNext = () => {
    const next = invoices.find((i) => i.status === "Due");
    if (!next) {
      toast.info("No invoices currently due");
      return;
    }
    openPay(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Fees & Collections" : "Financial Management"}
        subtitle={
          isSwimAdmin(user)
            ? "Swim-club fees — collections, outstanding dues and payment records."
            : isInstituteScoped
              ? `Fee collection for ${user?.institutionName ?? "your institute"} only.`
              : isParent
                ? "Fees and invoices across every institute your children attend."
                : "Invoices, installments, scholarships and payment gateways."
        }
        actions={
          <>
            <Button variant="outline" onClick={add.onOpen} data-tour="new-invoice-btn">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
            <Button onClick={payNext} data-tour="record-payment-btn">
              <CreditCard className="h-4 w-4" />
              {isAdmin ? "Record payment" : "Pay Now"}
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={isAdmin ? "Collected (YTD)" : "Paid (YTD)"}
          value={formatMoney(paid)}
          icon={<Receipt className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label={isAdmin ? "Outstanding" : "Due Now"}
          value={formatMoney(due)}
          hint={isAdmin ? "awaiting collection" : "Pay by Jun 1"}
          icon={<Wallet className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Upcoming"
          value={formatMoney(upcoming)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="info"
        />
        {isAdmin ? (
          <StatCard
            label="Collection rate"
            value={`${paid + due > 0 ? Math.round((paid / (paid + due)) * 100) : 100}%`}
            hint="paid vs. billed"
            accent="primary"
          />
        ) : (
          <StatCard
            label="Scholarship"
            value={formatMoney(120)}
            hint="Merit award"
            accent="primary"
          />
        )}
      </div>
      <Section title="Invoices">
        <DataTable
          anchor="finance-invoices"
          columns={[
            { key: "id", label: "Invoice" },
            { key: "date", label: "Date" },
            { key: "_institute", label: "Institute" },
            { key: "desc", label: "Description" },
            { key: "amount", label: "Amount" },
            { key: "method", label: "Method" },
            { key: "status", label: "Status" },
            { key: "_actions", label: "" },
          ]}
          rows={invoices}
          emptyText="No invoices"
          renderCell={(row, key) => {
            if (key === "_institute")
              return row.institutionName ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[170px]">{row.institutionName}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              );
            if (key === "amount")
              return <span className="font-semibold">{formatMoney(row.amount)}</span>;
            if (key === "status") {
              const tone =
                row.status === "Paid" ? "success" : row.status === "Due" ? "destructive" : "info";
              return <Badge tone={tone}>{row.status}</Badge>;
            }
            if (key === "_actions") {
              return (
                <div className="flex items-center gap-2 justify-end">
                  <Link
                    to="/app/invoice/$id"
                    params={{ id: row.id }}
                    className="text-xs px-2.5 py-1 rounded-md border hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    View
                  </Link>
                  {row.status === "Paid" ? (
                    <span className="text-xs text-success inline-flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Paid
                    </span>
                  ) : (
                    <button
                      onClick={() => openPay(row)}
                      className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/15"
                    >
                      {isAdmin ? "Record payment" : "Pay"}
                    </button>
                  )}
                </div>
              );
            }
            return String(row[key] ?? "");
          }}
        />
      </Section>
      {swimAdmin && (
        <Section
          title="Payment methods & mandates"
          description="Each family's preferred way to pay — Direct Debit, Card or Cash — with mandate status."
        >
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            {(["Direct Debit", "Card", "Cash", "Bank Transfer"] as const).map((m) => {
              const count = mandates.filter(
                (x) => x.method === m && !isOffboarded(x.studentId, offboardings),
              ).length;
              if (!count) return null;
              return (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-medium"
                >
                  {m === "Direct Debit" ? (
                    <Repeat className="h-3.5 w-3.5" />
                  ) : m === "Card" ? (
                    <CreditCard className="h-3.5 w-3.5" />
                  ) : m === "Cash" ? (
                    <Banknote className="h-3.5 w-3.5" />
                  ) : (
                    <Landmark className="h-3.5 w-3.5" />
                  )}
                  {m}
                  <span className="font-bold">{count}</span>
                </span>
              );
            })}
            {mandates.some(
              (m) => m.status !== "Active" && !isOffboarded(m.studentId, offboardings),
            ) && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 text-destructive px-2.5 py-1 font-medium">
                Needs attention{" "}
                {
                  mandates.filter(
                    (m) => m.status !== "Active" && !isOffboarded(m.studentId, offboardings),
                  ).length
                }
              </span>
            )}
            {mandates.some((m) => isOffboarded(m.studentId, offboardings)) && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                Stopped (off-boarded){" "}
                {mandates.filter((m) => isOffboarded(m.studentId, offboardings)).length}
              </span>
            )}
          </div>
          <DataTable
            anchor="finance-mandates"
            columns={[
              { key: "studentName", label: "Swimmer" },
              { key: "payerName", label: "Payer" },
              { key: "method", label: "Method" },
              { key: "reference", label: "Reference" },
              { key: "status", label: "Status" },
            ]}
            rows={mandates}
            emptyText="No payment mandates"
            renderCell={(row, key) => {
              const stopped = isOffboarded(row.studentId, offboardings);
              if (key === "method")
                return <Badge tone={stopped ? "muted" : "info"}>{row.method}</Badge>;
              if (key === "status") {
                if (stopped) return <Badge tone="muted">Stopped · off-boarded</Badge>;
                const tone =
                  row.status === "Active"
                    ? "success"
                    : row.status === "Pending"
                      ? "warning"
                      : "destructive";
                return <Badge tone={tone}>{row.status}</Badge>;
              }
              return String(row[key as keyof typeof row] ?? "");
            }}
          />
        </Section>
      )}

      <Section title={swimAdmin ? "Payment options" : "Connected Gateways"}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(swimAdmin
            ? ["Direct Debit (GoCardless)", "Card (Stripe)", "Cash — front desk", "Bank transfer"]
            : ["Stripe", "PayPal", "Razorpay", "PayHere"]
          ).map((p) => (
            <div key={p} className="p-4 rounded-lg border text-center text-sm font-medium">
              {p}
              <div className="text-[10px] text-success mt-1">● Connected</div>
            </div>
          ))}
        </div>
      </Section>

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="New Invoice"
        description="Issue a new invoice to a student or institution."
        onSubmit={submitInvoice}
        submitLabel="Create"
      >
        <Field label="Description" required className="sm:col-span-2">
          <TextInput
            data-tour="inv-desc"
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            placeholder="e.g. June Tuition — All subjects"
            autoFocus
          />
        </Field>
        <Field label="Amount (USD)" required>
          <TextInput
            data-tour="inv-amount"
            type="number"
            min={0}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
          />
        </Field>
        <Field label="Date">
          <TextInput
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <Field label="Status" className="sm:col-span-2">
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: "Due", label: "Due" },
              { value: "Upcoming", label: "Upcoming" },
              { value: "Paid", label: "Paid" },
            ]}
          />
        </Field>
      </FormDialog>

      <FormDialog
        open={pay.open}
        onOpenChange={(v) => {
          pay.setOpen(v);
          if (!v) setPayTarget(null);
        }}
        title={`${isAdmin ? "Record payment" : "Pay"} ${payTarget?.id ?? ""}`}
        description={payTarget ? `${payTarget.desc} · ${formatMoney(payTarget.amount)}` : ""}
        onSubmit={submitPayment}
        submitLabel={`${isAdmin ? "Record" : "Pay"} ${formatMoney(payTarget?.amount ?? 0)}`}
      >
        <Field label="Payment method" className="sm:col-span-2">
          <Select
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            options={methodOptions.map((m) => ({ value: m, label: m }))}
          />
        </Field>
      </FormDialog>
    </div>
  );
}
