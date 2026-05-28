import { createFileRoute } from "@tanstack/react-router";
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
import { Wallet, TrendingUp, CreditCard, Receipt, Plus, Check } from "lucide-react";

export const Route = createFileRoute("/app/finance")({
  head: () => ({ meta: [{ title: "Finance — GlobalEdu" }] }),
  component: FinancePage,
});

const METHODS = ["Visa •••• 4242", "PayPal", "Stripe", "Razorpay", "PayHere", "Bank transfer"];

function FinancePage() {
  const invoices = useCollection("invoices");
  const add = useDisclosure();
  const pay = useDisclosure();
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);

  const paid = invoices
    .filter((i) => i.status === "Paid")
    .reduce((a, i) => a + i.amount, 0);
  const due = invoices
    .filter((i) => i.status === "Due")
    .reduce((a, i) => a + i.amount, 0);
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

  const [payMethod, setPayMethod] = useState(METHODS[0]);

  const submitPayment = () => {
    if (!payTarget) return;
    updateItem("invoices", (i) => i.id === payTarget.id, {
      status: "Paid",
      method: payMethod,
    });
    toast.success(`Paid $${payTarget.amount} for ${payTarget.id}`);
    setPayTarget(null);
    pay.onClose();
  };

  const openPay = (inv: Invoice) => {
    setPayTarget(inv);
    setPayMethod(METHODS[0]);
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
        title="Financial Management"
        subtitle="Invoices, installments, scholarships and payment gateways."
        actions={
          <>
            <Button variant="outline" onClick={add.onOpen}>
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
            <Button onClick={payNext}>
              <CreditCard className="h-4 w-4" />
              Pay Now
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Paid (YTD)"
          value={`$${paid}`}
          icon={<Receipt className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Due Now"
          value={`$${due}`}
          hint="Pay by Jun 1"
          icon={<Wallet className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Upcoming"
          value={`$${upcoming}`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="info"
        />
        <StatCard label="Scholarship" value="$120" hint="Merit award" accent="primary" />
      </div>
      <Section title="Invoices">
        <DataTable
          columns={[
            { key: "id", label: "Invoice" },
            { key: "date", label: "Date" },
            { key: "desc", label: "Description" },
            { key: "amount", label: "Amount" },
            { key: "method", label: "Method" },
            { key: "status", label: "Status" },
            { key: "_actions", label: "" },
          ]}
          rows={invoices}
          emptyText="No invoices"
          renderCell={(row, key) => {
            if (key === "amount")
              return <span className="font-semibold">${row.amount}</span>;
            if (key === "status") {
              const tone =
                row.status === "Paid"
                  ? "success"
                  : row.status === "Due"
                    ? "destructive"
                    : "info";
              return <Badge tone={tone}>{row.status}</Badge>;
            }
            if (key === "_actions") {
              if (row.status === "Paid")
                return (
                  <span className="text-xs text-success inline-flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Paid
                  </span>
                );
              return (
                <button
                  onClick={() => openPay(row)}
                  className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/15"
                >
                  Pay
                </button>
              );
            }
            return String(row[key] ?? "");
          }}
        />
      </Section>
      <Section title="Connected Gateways">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Stripe", "PayPal", "Razorpay", "PayHere"].map((p) => (
            <div
              key={p}
              className="p-4 rounded-lg border text-center text-sm font-medium"
            >
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
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            placeholder="e.g. June Tuition — All subjects"
            autoFocus
          />
        </Field>
        <Field label="Amount (USD)" required>
          <TextInput
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
        title={`Pay ${payTarget?.id ?? ""}`}
        description={payTarget ? `${payTarget.desc} · $${payTarget.amount}` : ""}
        onSubmit={submitPayment}
        submitLabel={`Pay $${payTarget?.amount ?? 0}`}
      >
        <Field label="Payment method" className="sm:col-span-2">
          <Select
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            options={METHODS.map((m) => ({ value: m, label: m }))}
          />
        </Field>
      </FormDialog>
    </div>
  );
}
