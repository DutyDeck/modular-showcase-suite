import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatCard, DataTable, Badge } from "@/components/ui-kit";
import { invoices } from "@/lib/mockData";
import { Wallet, TrendingUp, CreditCard, Receipt } from "lucide-react";

export const Route = createFileRoute("/app/finance")({
  head: () => ({ meta: [{ title: "Finance — GlobalEdu" }] }),
  component: FinancePage,
});

function FinancePage() {
  const paid = invoices.filter(i => i.status === "Paid").reduce((a, i) => a + i.amount, 0);
  const due = invoices.filter(i => i.status === "Due").reduce((a, i) => a + i.amount, 0);
  const upcoming = invoices.filter(i => i.status === "Upcoming").reduce((a, i) => a + i.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Management"
        subtitle="Invoices, installments, scholarships and payment gateways."
        actions={<button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" />Pay Now</button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Paid (YTD)" value={`$${paid}`} icon={<Receipt className="h-5 w-5" />} accent="success" />
        <StatCard label="Due Now" value={`$${due}`} hint="Pay by Jun 1" icon={<Wallet className="h-5 w-5" />} accent="warning" />
        <StatCard label="Upcoming" value={`$${upcoming}`} icon={<TrendingUp className="h-5 w-5" />} accent="info" />
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
          ]}
          rows={invoices}
          renderCell={(row, key) => {
            if (key === "amount") return <span className="font-semibold">${row.amount}</span>;
            if (key === "status") {
              const tone = row.status === "Paid" ? "success" : row.status === "Due" ? "destructive" : "info";
              return <Badge tone={tone}>{row.status}</Badge>;
            }
            return String(row[key]);
          }}
        />
      </Section>
      <Section title="Connected Gateways">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Stripe", "PayPal", "Razorpay", "PayHere"].map(p => (
            <div key={p} className="p-4 rounded-lg border text-center text-sm font-medium">{p}<div className="text-[10px] text-success mt-1">● Connected</div></div>
          ))}
        </div>
      </Section>
    </div>
  );
}
