import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { auditLog } from "@/lib/mockData";
import { ShieldCheck, FileLock2 } from "lucide-react";

export const Route = createFileRoute("/app/compliance")({
  head: () => ({ meta: [{ title: "Compliance — One Edu" }] }),
  component: CompliancePage,
});

const frameworks = ["GDPR", "FERPA", "COPPA", "ISO 27001", "SOC 2", "PDPA (LK)", "UK GDPR", "HIPAA (limited)"];

function CompliancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Governance & Compliance" subtitle="Audit trails, consent, data retention, legal hold, exports & deletion." />
      <Section title="Active Compliance Frameworks">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {frameworks.map(f => (
            <div key={f} className="p-4 rounded-lg border bg-card flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-success" />
              <div>
                <div className="text-sm font-medium">{f}</div>
                <div className="text-[10px] text-success">● Compliant</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Data Subject Tools" className="lg:col-span-1">
          <ul className="space-y-2 text-sm">
            {["Export data (GDPR Art. 20)", "Right to erasure", "Consent management", "Legal hold flags", "Retention schedules"].map(x => (
              <li key={x} className="p-2.5 rounded-md hover:bg-muted flex items-center gap-2"><FileLock2 className="h-4 w-4 text-primary" />{x}</li>
            ))}
          </ul>
        </Section>
        <Section title="Recent Audit Log" className="lg:col-span-2">
          <ul className="divide-y -my-3">
            {auditLog.map((a, i) => (
              <li key={i} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm"><span className="font-medium">{a.actor}</span> · {a.action} <span className="text-muted-foreground">→ {a.target}</span></div>
                  <div className="text-[10px] text-muted-foreground">{a.time}</div>
                </div>
                <Badge tone={a.severity === "warning" ? "warning" : a.severity === "success" ? "success" : "muted"}>{a.severity}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
