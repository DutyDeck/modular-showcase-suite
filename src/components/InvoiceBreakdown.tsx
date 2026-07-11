import { usePrefs } from "@/lib/prefs";
import { Badge } from "@/components/ui-kit";
import type { DraftInvoice } from "@/lib/billing";
import type { BillingProfile } from "@/lib/mockData";

/* The itemised auto-generated invoice — shared by the parent's live preview and
 * the admin's monthly billing run so both show an identical breakdown. Every
 * number is traceable to a dated session or a named discount rule. */
export function InvoiceBreakdown({
  invoice,
  profile,
}: {
  invoice: DraftInvoice;
  profile?: BillingProfile;
}) {
  const { formatMoney } = usePrefs();
  const positives = invoice.lines.filter((l) => l.kind === "tuition" || l.kind === "revision");
  const reductions = invoice.lines.filter((l) => l.kind === "discount" || l.kind === "credit");
  const net = invoice.netStandard + invoice.netExempt;
  const vatExempt = invoice.netStandard === 0 && invoice.netExempt > 0;

  return (
    <div className="text-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium text-center w-16">Qty</th>
              <th className="py-2 font-medium text-right w-24">Unit</th>
              <th className="py-2 font-medium text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {positives.map((l) => (
              <tr key={l.id} className="border-b last:border-0 align-top">
                <td className="py-2.5 pr-3">
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    {l.desc}
                    {l.kind === "revision" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/15 text-info font-medium">
                        booster
                      </span>
                    )}
                    {l.vatTreatment !== "standard" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        VAT exempt
                      </span>
                    )}
                  </div>
                  {l.detail && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{l.detail}</div>
                  )}
                </td>
                <td className="py-2.5 text-center tabular-nums text-muted-foreground">{l.qty}</td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                  {formatMoney(l.unitPrice)}
                </td>
                <td className="py-2.5 text-right tabular-nums font-medium">
                  {formatMoney(l.amount)}
                </td>
              </tr>
            ))}
            {reductions.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="py-2 pr-3 text-success" colSpan={3}>
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 font-medium">
                      {l.kind === "credit" ? "credit" : "discount"}
                    </span>
                    {l.desc}
                    {l.detail && (
                      <span className="text-[11px] text-muted-foreground">· {l.detail}</span>
                    )}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums font-medium text-success">
                  {formatMoney(l.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-end">
        <dl className="w-full sm:w-72 space-y-1.5">
          <Row label="Gross" value={formatMoney(invoice.gross)} />
          {invoice.discountTotal > 0 && (
            <Row
              label="Less discounts"
              value={`−${formatMoney(invoice.discountTotal)}`}
              tone="success"
            />
          )}
          {invoice.creditTotal > 0 && (
            <Row
              label="Less credits"
              value={`−${formatMoney(invoice.creditTotal)}`}
              tone="success"
            />
          )}
          <Row label="Net (ex. VAT)" value={formatMoney(net)} />
          <Row
            label={vatExempt ? "VAT" : "VAT @ 20%"}
            value={vatExempt ? "Exempt" : formatMoney(invoice.vat)}
          />
          <div className="flex justify-between border-t pt-2 mt-1">
            <dt className="font-semibold">Total due</dt>
            <dd className="font-bold text-base tabular-nums">{formatMoney(invoice.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge tone="muted">
          {invoice.sessionCount} session{invoice.sessionCount === 1 ? "" : "s"}
        </Badge>
        <Badge tone="muted">
          {invoice.courseCount} course{invoice.courseCount === 1 ? "" : "s"}
        </Badge>
        {profile && (
          <span>
            Issued by <span className="text-foreground font-medium">{profile.legalName}</span>
            {profile.vatRegistered && profile.vatNumber
              ? ` · VAT ${profile.vatNumber}`
              : " · not VAT-registered"}
          </span>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums font-medium ${tone === "success" ? "text-success" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
