/**
 * Shared building blocks for institution-pack screens, so every pack page
 * looks and behaves the same: context strip (tenant · region · pack), empty
 * state with "Load starter template", tabs, and small status pills.
 */
import { useState, type ReactNode } from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Badge, Button } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { useCollection } from "@/lib/store";
import { PACK_BY_ID, loadPackStarter, useTenantContext, type PackId } from "@/lib/packs/registry";
import { INSTITUTION_TYPE_LABEL } from "@/lib/packs/regions";

export function LucideIcon({ name, className }: { name: string; className?: string }) {
  const icons = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Cmp = icons[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

/** Thin strip under the page header: which tenant, region and pack this is. */
export function PackContextBar({ pack, extra }: { pack?: PackId; extra?: ReactNode }) {
  const ctx = useTenantContext();
  const def = pack ? PACK_BY_ID[pack] : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs mb-4 -mt-2">
      {def && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-white font-medium bg-gradient-to-r",
            def.tone,
          )}
        >
          <LucideIcon name={def.icon} className="h-3.5 w-3.5" />
          {def.name}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 bg-card">
        <Icons.Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        {ctx.tenantName}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 bg-card">
        <span>{ctx.region.flag}</span>
        {ctx.region.name} · ledger in {ctx.currency}
      </span>
      <span className="inline-flex items-center rounded-full border px-2.5 py-1 bg-card text-muted-foreground">
        {INSTITUTION_TYPE_LABEL[ctx.type]}
      </span>
      {extra}
    </div>
  );
}

/**
 * Empty state for a pack screen in a tenant that has just enabled the pack.
 * Admins can clone the pack's reference configuration in one click.
 */
export function PackEmpty({ pack, title, body }: { pack: PackId; title: string; body: string }) {
  const ctx = useTenantContext();
  const def = PACK_BY_ID[pack];
  const curricula = useCollection("curricula");
  const tutorGroups = useCollection("tutorGroups");
  const houses = useCollection("houses");
  const ptmEvents = useCollection("ptmEvents");
  const schoolServices = useCollection("schoolServices");
  const programmes = useCollection("programmes");
  const heModules = useCollection("heModules");
  const qualifications = useCollection("qualifications");
  const calendars = useCollection("academicCalendars");
  const load = () => {
    const cal =
      calendars.find((c) => c.tenantId === ctx.tenantId && c.isDefault) ??
      calendars.find((c) => c.tenantId === ctx.tenantId);
    const n = loadPackStarter(
      pack,
      ctx.tenantId,
      {
        curricula,
        tutorGroups,
        houses,
        ptmEvents,
        schoolServices,
        programmes,
        heModules,
        qualifications,
      },
      cal?.id ?? "",
    );
    toast.success(`Loaded ${n} starter records from the ${def.name} template`);
  };
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
      <div
        className={cn(
          "mx-auto h-12 w-12 rounded-xl bg-gradient-to-br text-white flex items-center justify-center mb-3",
          def.tone,
        )}
      >
        <LucideIcon name={def.icon} className="h-6 w-6" />
      </div>
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{body}</p>
      {ctx.isAdmin && def.starterFrom && (
        <Button className="mt-4" onClick={load}>
          <Icons.Wand2 className="h-4 w-4" /> Load starter template
        </Button>
      )}
    </div>
  );
}

/** Simple underline tabs. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b mb-4 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors",
            value === t.id
              ? "border-primary text-primary font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 text-[10px] rounded-full bg-muted px-1.5 py-0.5">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function useTab<T extends string>(initial: T) {
  return useState<T>(initial);
}

const STATUS_TONE: Record<
  string,
  "default" | "success" | "warning" | "info" | "muted" | "destructive"
> = {
  Active: "success",
  Verified: "success",
  Paid: "success",
  Confirmed: "success",
  Registered: "success",
  Approved: "success",
  Connected: "success",
  Accepted: "success",
  Entered: "success",
  Enrolled: "success",
  Covered: "success",
  Completed: "success",
  Achieved: "success",
  Competent: "success",
  Progress: "success",
  Award: "success",
  // SIS completion statuses (results, requests, fees, accounts, records)
  Published: "success",
  Issued: "success",
  Matched: "success",
  Upheld: "success",
  Resolved: "success",
  Provisioned: "success",
  Restored: "success",
  Sent: "success",
  Graduated: "success",
  "Ready to issue": "info",
  "Under review": "info",
  "In review": "info",
  Review: "warning",
  Requested: "warning",
  Returned: "warning",
  Unmatched: "warning",
  "Awaiting results": "warning",
  "Waiting on user": "warning",
  Queued: "warning",
  Suspended: "warning",
  Deferred: "warning",
  Ignored: "muted",
  "Not upheld": "destructive",
  Cancelled: "destructive",
  Revoked: "destructive",
  Failed: "destructive",
  Submitted: "info",
  Moderated: "info",
  "In progress": "info",
  Scheduled: "info",
  Syncing: "info",
  Validated: "info",
  Offer: "info",
  Pending: "warning",
  "Pending approval": "warning",
  "Pending verification": "warning",
  Due: "warning",
  Provisional: "warning",
  Waitlist: "warning",
  Open: "warning",
  Draft: "muted",
  "Not started": "muted",
  Expired: "destructive",
  Overdue: "destructive",
  Rejected: "destructive",
  Errors: "destructive",
  Error: "destructive",
  Withdrawn: "muted",
  Declined: "muted",
  Interrupted: "warning",
};

/** Status badge with a consistent colour for the same word everywhere. */
export function StatusPill({ status }: { status: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Badge tone={(STATUS_TONE[status] ?? "default") as any}>{status}</Badge>;
}

/** "Demo-grade regulatory detail" disclaimer used on compliance screens. */
export function VerifyNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
      <Icons.Info className="h-3.5 w-3.5 mt-px shrink-0" />
      <span>
        {children ??
          "Regulatory detail is demo-grade and comes from the tenant's region profile. Each country's compliance pack confirms it against cited sources before production."}
      </span>
    </p>
  );
}
