import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useCollection } from "@/lib/store";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui-kit";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/invoice/$id")({
  head: ({ params }) => ({ meta: [{ title: `Invoice ${params.id} — 1StudentID` }] }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = useParams({ from: "/app/invoice/$id" });
  const navigate = useNavigate();
  const invoices = useCollection("invoices");
  const { user } = useAuth();
  const { formatMoney } = usePrefs();
  const invoice = invoices.find((i) => i.id === id);

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <div className="text-lg font-semibold">Invoice not found</div>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/app/finance" })}>
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Button>
      </div>
    );
  }

  const subtotal = invoice.amount;
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = subtotal + tax;

  return (
    <div>
      {/* On-screen controls (hidden when printing) */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Button variant="outline" onClick={() => navigate({ to: "/app/finance" })}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toast.success("PDF download queued")}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <article className="printable mx-auto max-w-3xl bg-card rounded-xl border shadow-soft p-6 sm:p-10 print:border-0 print:shadow-none print:rounded-none">
        {/* Header */}
        <header className="flex items-start justify-between flex-wrap gap-4 pb-6 border-b">
          <div>
            <div className="text-2xl font-bold tracking-tight">1StudentID</div>
            <div className="text-xs text-muted-foreground mt-1">
              {user?.institution ?? "Global Coaching Hub"}
              <br />
              No. 24, Galle Road, Colombo 03, Sri Lanka
              <br />
              VAT: SL-LK-2026-0481
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Invoice
            </div>
            <div className="text-2xl font-bold mt-1">{invoice.id}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Issued {invoice.date}
            </div>
            <div
              className={`mt-3 inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${
                invoice.status === "Paid"
                  ? "bg-success/15 text-success"
                  : invoice.status === "Due"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-info/15 text-info"
              }`}
            >
              {invoice.status.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Billed to */}
        <section className="grid sm:grid-cols-2 gap-6 py-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Billed to
            </div>
            <div className="mt-2 text-sm">
              <div className="font-semibold">{user?.name ?? "Student"}</div>
              <div className="text-muted-foreground">{user?.email}</div>
              <div className="text-muted-foreground">Student ID: {user?.id}</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Payment method
            </div>
            <div className="mt-2 text-sm">
              <div>{invoice.method}</div>
              {invoice.status === "Paid" ? (
                <div className="text-muted-foreground">Paid on {invoice.date}</div>
              ) : (
                <div className="text-muted-foreground">Due on receipt</div>
              )}
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="border-t border-b py-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="py-3">{invoice.desc}</td>
                <td className="py-3 text-right font-medium">
                  {formatMoney(invoice.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <section className="flex justify-end pt-4">
          <dl className="w-full sm:w-72 space-y-1.5 text-sm">
            <Line label="Subtotal" value={formatMoney(subtotal)} />
            <Line label="Tax (8%)" value={formatMoney(tax)} />
            <Line label="Total" value={formatMoney(total)} bold />
          </dl>
        </section>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t text-xs text-muted-foreground">
          Thank you for studying with 1StudentID. Questions? Email{" "}
          <span className="text-foreground">finance@oneedu.app</span> or call
          +94 11 2 345 678.
          <div className="mt-2">
            This is an electronically generated invoice. No signature required.
          </div>
        </footer>
      </article>
    </div>
  );
}

function Line({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between border-t py-2">
      <dt className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</dt>
      <dd className={bold ? "font-bold text-base" : "font-medium"}>{value}</dd>
    </div>
  );
}
