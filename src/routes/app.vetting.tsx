import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Download,
  LogOut,
  Pencil,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  Field,
  TextInput,
  Select,
  FormDialog,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { PackContextBar, StatusPill, VerifyNote } from "@/components/packs/PackUI";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { useTenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import { logChange } from "@/lib/packs/sis/activity";
import type { ChangeLogEntry } from "@/lib/packs/sis/shared";
import {
  TENANT_STAFF,
  addMonths,
  effectiveVettingStatus,
  type VettingCheck,
  type VettingRecord,
  type VettingStatus,
} from "@/lib/packs/opsData";
import type { VettingCheckDef } from "@/lib/packs/regions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/vetting")({
  head: () => ({ meta: [{ title: "Staff Vetting — 1StudentID" }] }),
  component: VettingPage,
});

const CELL_TONE: Record<VettingStatus, string> = {
  Verified: "bg-success/10 text-success border-success/30",
  Pending: "bg-warning/15 text-warning-foreground border-warning/40",
  Expired: "bg-destructive/10 text-destructive border-destructive/30",
  "Not required": "bg-muted text-muted-foreground border-border",
};

function daysUntil(iso: string) {
  return Math.round(
    (new Date(iso + "T00:00:00Z").getTime() - new Date(DEMO_TODAY + "T00:00:00Z").getTime()) /
      86_400_000,
  );
}

/** Field used in the change log to record a leaving date ("—" = reinstated). */
const LEFT_FIELD = "Leaving date";
const RETAIN_YEARS = 6;

/**
 * Leaving dates per vetting record. VettingRecord has no end-date field, so the
 * leaving date lives in the audit trail (latest "Leaving date" entry wins).
 */
function leftDates(log: ChangeLogEntry[], tenantId: string) {
  const m = new Map<string, string>();
  for (const e of [...log]
    .filter(
      (e) => e.tenantId === tenantId && e.entity === "vettingRecord" && e.field === LEFT_FIELD,
    )
    .sort((a, b) => a.at.localeCompare(b.at))) {
    if (e.to && e.to !== "—") m.set(e.entityId, e.to);
    else m.delete(e.entityId);
  }
  return m;
}

/** Checks completed within the retention window — the record must be kept. */
function recentChecks(r: VettingRecord) {
  const cutoff = addMonths(DEMO_TODAY, -12 * RETAIN_YEARS);
  return r.checks.filter(
    (c) => (c.status === "Verified" || c.status === "Expired") && (c.checkedOn ?? "") >= cutoff,
  );
}

function vLog(
  r: { id: string; tenantId: string },
  field: string,
  from: string | undefined,
  to: string | undefined,
  by: string,
  reason?: string,
) {
  logChange({
    tenantId: r.tenantId,
    entity: "vettingRecord",
    entityId: r.id,
    field,
    from,
    to,
    by,
    reason,
  });
}

type StaffAction = { kind: "edit" | "leave" | "reinstate" | "remove"; record: VettingRecord };

function VettingPage() {
  const ctx = useTenantContext();
  const all = useCollection("vettingRecords");
  const log = useCollection("changeLog");
  const left = useMemo(() => leftDates(log, ctx.tenantId), [log, ctx.tenantId]);
  const everyone = useMemo(
    () =>
      all
        .filter((r) => r.tenantId === ctx.tenantId)
        .sort((a, b) => Number(left.has(a.id)) - Number(left.has(b.id))),
    [all, ctx.tenantId, left],
  );
  // Leavers stay on the register but drop out of compliance and renewal tracking.
  const records = everyone.filter((r) => !left.has(r.id));
  const defs = ctx.region.vettingChecks;
  const isUK = ctx.region.code === "UK";
  const [edit, setEdit] = useState<{ recordId: string; key: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [action, setAction] = useState<StaffAction | null>(null);
  const by = ctx.user?.name ?? "HR";

  if (!ctx.isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Staff Vetting"
          subtitle="The vetting register is restricted to HR and safeguarding leads."
        />
      </div>
    );
  }

  const statusFor = (r: VettingRecord, key: string): VettingCheck | undefined =>
    r.checks.find((c) => c.key === key);
  const compliance = (r: VettingRecord) => {
    const ok = defs.filter((d) => {
      const c = statusFor(r, d.key);
      const s = c ? effectiveVettingStatus(c) : "Pending";
      return s === "Verified" || s === "Not required";
    }).length;
    return defs.length ? Math.round((ok / defs.length) * 100) : 100;
  };
  const compliant = records.filter((r) => compliance(r) === 100).length;
  const allChecks = records.flatMap((r) => defs.map((d) => ({ r, d, c: statusFor(r, d.key) })));
  const expired = allChecks.filter((x) => x.c && effectiveVettingStatus(x.c) === "Expired");
  const pending = allChecks.filter((x) => !x.c || x.c.status === "Pending");
  const renewals = allChecks
    .filter(
      (x) =>
        x.c?.expires && effectiveVettingStatus(x.c) === "Verified" && daysUntil(x.c.expires) <= 90,
    )
    .sort((a, b) => (a.c!.expires! < b.c!.expires! ? -1 : 1));

  const exportCsv = () => {
    const header = ["Staff", "Role", "Start date", "Left on", ...defs.map((d) => d.label)];
    const lines = everyone.map((r) => [
      r.staffName,
      r.role,
      r.startDate,
      left.get(r.id) ?? "",
      ...defs.map((d) => {
        const c = statusFor(r, d.key);
        if (!c) return "Pending";
        const s = effectiveVettingStatus(c);
        return [s, c.checkedOn, c.ref, c.verifiedBy].filter(Boolean).join(" / ");
      }),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isUK ? "single-central-record" : "staff-vetting-register"}-${ctx.tenantId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isUK ? "Single Central Record exported" : "Vetting register exported");
  };

  const editing = edit ? records.find((r) => r.id === edit.recordId) : undefined;
  const editDef = edit
    ? (defs.find((d) => d.key === edit.key) ?? { key: edit.key, label: edit.key })
    : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title={isUK ? "Single Central Record" : "Staff Vetting Register"}
        subtitle={`Checks required in ${ctx.region.name} come from the region profile — change the region and the columns change with it.`}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />{" "}
              {isUK ? "Export Single Central Record" : "Export register"}
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" /> Add staff
            </Button>
          </>
        }
      />
      <PackContextBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current staff"
          value={records.length}
          hint={
            left.size ? `${left.size} leaver${left.size > 1 ? "s" : ""} kept on record` : undefined
          }
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Fully compliant"
          value={`${compliant}/${records.length}`}
          accent="success"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Expired checks"
          value={expired.length}
          accent={expired.length ? "destructive" : "success"}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <StatCard
          label="Renewals due ≤ 90 days"
          value={renewals.length}
          accent="warning"
          icon={<CalendarClock className="h-4 w-4" />}
        />
      </div>

      <Section title="Register" description="Click any cell to record or update a check.">
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2 font-medium">Staff</th>
                {defs.map((d) => (
                  <th key={d.key} className="px-2 py-2 font-medium max-w-28">
                    <div className="leading-tight normal-case tracking-normal text-[11px]">
                      {d.label}
                    </div>
                    {d.renewMonths && (
                      <div className="text-[10px] normal-case tracking-normal">
                        renew {d.renewMonths}m
                      </div>
                    )}
                  </th>
                ))}
                <th className="px-2 py-2 font-medium">Other checks</th>
                <th className="px-4 py-2 font-medium">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {everyone.length === 0 && (
                <tr>
                  <td
                    colSpan={defs.length + 3}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    No staff on the register yet.
                  </td>
                </tr>
              )}
              {everyone.map((r) => {
                const others = r.checks.filter((c) => !defs.some((d) => d.key === c.key));
                const pct = compliance(r);
                const leftOn = left.get(r.id);
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b last:border-b-0 hover:bg-muted/30",
                      leftOn && "opacity-60",
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.staffName} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate flex items-center gap-1.5">
                            {r.staffName}
                            {leftOn && <Badge tone="muted">Left {leftOn}</Badge>}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {r.role} · since {r.startDate}
                          </div>
                        </div>
                        <div className="flex shrink-0">
                          <IconBtn
                            label="Edit details"
                            onClick={() => setAction({ kind: "edit", record: r })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </IconBtn>
                          {leftOn ? (
                            <IconBtn
                              label="Undo leaving"
                              onClick={() => setAction({ kind: "reinstate", record: r })}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </IconBtn>
                          ) : (
                            <IconBtn
                              label="Mark as left"
                              onClick={() => setAction({ kind: "leave", record: r })}
                            >
                              <LogOut className="h-3.5 w-3.5" />
                            </IconBtn>
                          )}
                          <IconBtn
                            label="Remove from register"
                            onClick={() => setAction({ kind: "remove", record: r })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </div>
                    </td>
                    {defs.map((d) => {
                      const c = statusFor(r, d.key);
                      const s: VettingStatus = c ? effectiveVettingStatus(c) : "Pending";
                      const soon = c?.expires && s === "Verified" && daysUntil(c.expires) <= 90;
                      return (
                        <td key={d.key} className="px-1.5 py-2">
                          <button
                            onClick={() => setEdit({ recordId: r.id, key: d.key })}
                            className={cn(
                              "w-full rounded-md border px-1.5 py-1 text-left text-[10px] leading-tight hover:ring-2 hover:ring-primary/30",
                              CELL_TONE[s],
                              soon && "ring-1 ring-warning",
                            )}
                          >
                            <div className="font-semibold">{s}</div>
                            {c?.checkedOn && <div className="opacity-80">{c.checkedOn}</div>}
                            {c?.expires && <div className="opacity-80">exp {c.expires}</div>}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-[11px] text-muted-foreground">
                      {others.length ? (
                        <span title={others.map((o) => `${o.key}: ${o.status}`).join(", ")}>
                          {others.length} from previous region
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              pct === 100
                                ? "bg-success"
                                : pct >= 70
                                  ? "bg-warning"
                                  : "bg-destructive",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <VerifyNote>
          Check types are demo-grade from the {ctx.region.name} region profile (e.g. KCSIE Single
          Central Record in England, Working With Children Checks in Australia, good conduct
          certificates in the UAE, police clearance in Sri Lanka) and are confirmed in each
          country's compliance pack.
        </VerifyNote>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Action needed" description="Expired or outstanding checks.">
          <ul className="space-y-1.5">
            {[...expired, ...pending].slice(0, 10).map(({ r, d, c }) => (
              <li
                key={`${r.id}-${d.key}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{r.staffName}</span> — {d.label}
                </span>
                <button onClick={() => setEdit({ recordId: r.id, key: d.key })}>
                  <StatusPill status={c ? effectiveVettingStatus(c) : "Pending"} />
                </button>
              </li>
            ))}
            {expired.length + pending.length === 0 && (
              <li className="text-sm text-muted-foreground">Nothing outstanding.</li>
            )}
          </ul>
        </Section>
        <Section
          title="Renewals coming up"
          description="Verified checks expiring in the next 90 days."
        >
          <ul className="space-y-1.5">
            {renewals.map(({ r, d, c }) => (
              <li
                key={`${r.id}-${d.key}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{r.staffName}</span> — {d.label}
                </span>
                <Badge tone="warning">in {daysUntil(c!.expires!)} days</Badge>
              </li>
            ))}
            {renewals.length === 0 && (
              <li className="text-sm text-muted-foreground">No renewals due.</li>
            )}
          </ul>
        </Section>
      </div>

      {editing && editDef && (
        <CheckDialog
          key={`${editing.id}-${editDef.key}`}
          record={editing}
          def={editDef}
          by={ctx.user?.name ?? "HR"}
          onClose={() => setEdit(null)}
        />
      )}

      <AddStaffDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tenantId={ctx.tenantId}
        defs={defs}
        existing={everyone.map((r) => r.staffName)}
        by={by}
      />
      {action && (
        <StaffActionDialog
          key={`${action.kind}-${action.record.id}`}
          action={action}
          by={by}
          isUK={isUK}
          onSwitch={(kind) => setAction({ kind, record: action.record })}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
    >
      {children}
    </button>
  );
}

function StaffActionDialog({
  action,
  by,
  isUK,
  onSwitch,
  onClose,
}: {
  action: StaffAction;
  by: string;
  isUK: boolean;
  onSwitch: (kind: StaffAction["kind"]) => void;
  onClose: () => void;
}) {
  const r = action.record;
  const [name, setName] = useState(r.staffName);
  const [role, setRole] = useState(r.role);
  const [start, setStart] = useState(r.startDate);
  const [leftOn, setLeftOn] = useState(DEMO_TODAY);
  const [reason, setReason] = useState("");
  const register = isUK ? "Single Central Record" : "register";
  const close = (v: boolean) => !v && onClose();

  if (action.kind === "edit")
    return (
      <FormDialog
        open
        onOpenChange={close}
        title="Edit staff details"
        description={r.staffName}
        submitLabel="Save"
        onSubmit={() => {
          if (!name.trim()) {
            toast.error("Name is required");
            return;
          }
          const pairs: [string, string, string][] = [
            ["Name", r.staffName, name.trim()],
            ["Role", r.role, role.trim() || "Staff"],
            ["Start date", r.startDate, start],
          ];
          const changed = pairs.filter(([, a, b]) => a !== b);
          if (changed.length) {
            updateItem("vettingRecords", (x) => x.id === r.id, {
              staffName: name.trim(),
              role: role.trim() || "Staff",
              startDate: start,
            });
            for (const [f, a, b] of changed) vLog(r, f, a, b, by, reason.trim() || undefined);
            toast.success(`${name.trim()} updated — logged to the audit trail`);
          }
          onClose();
        }}
      >
        <Field label="Name" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Role">
          <TextInput value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <Field label="Start date">
          <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Reason (optional)">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </FormDialog>
    );

  if (action.kind === "leave")
    return (
      <FormDialog
        open
        onOpenChange={close}
        title={`Mark ${r.staffName} as left`}
        description={`The record and its checks stay on the ${register}. Renewals stop.`}
        submitLabel="Mark as left"
        onSubmit={() => {
          if (!leftOn || leftOn < r.startDate) {
            toast.error("Leaving date must be on or after the start date");
            return;
          }
          vLog(r, LEFT_FIELD, "—", leftOn, by, reason.trim() || undefined);
          toast.success(`${r.staffName} marked as left on ${leftOn}`);
          onClose();
        }}
      >
        <Field label="Leaving date" required>
          <TextInput type="date" value={leftOn} onChange={(e) => setLeftOn(e.target.value)} />
        </Field>
        <Field label="Reason">
          <TextInput
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Resigned"
          />
        </Field>
      </FormDialog>
    );

  if (action.kind === "reinstate")
    return (
      <FormDialog
        open
        onOpenChange={close}
        title={`Undo leaving — ${r.staffName}`}
        description="Use this if the leaving date was entered by mistake or they have returned."
        submitLabel="Reinstate"
        onSubmit={() => {
          vLog(r, LEFT_FIELD, "set", "—", by, reason.trim() || "Reinstated");
          toast.success(`${r.staffName} is back on the current staff list`);
          onClose();
        }}
      >
        <Field label="Reason" className="sm:col-span-2">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </FormDialog>
    );

  // Remove: only mistaken entries — never anyone with checks inside the retention window.
  const recent = recentChecks(r);
  if (recent.length)
    return (
      <FormDialog
        open
        onOpenChange={close}
        title={`Can't remove ${r.staffName}`}
        submitLabel="Mark as left instead"
        cancelLabel="Close"
        onSubmit={() => onSwitch("leave")}
      >
        <p className="sm:col-span-2 text-sm">
          {r.staffName} has {recent.length} check{recent.length > 1 ? "s" : ""} completed in the
          last {RETAIN_YEARS} years. Vetting evidence must be kept on the {register}, so the record
          can't be deleted.
        </p>
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Mark them as left instead — the record and checks are kept, renewals stop.
        </p>
      </FormDialog>
    );
  const anyEvidence = r.checks.some((c) => c.checkedOn || c.ref);
  return (
    <FormDialog
      open
      onOpenChange={close}
      title={`Remove ${r.staffName}?`}
      submitLabel="Remove entry"
      submitVariant="destructive"
      onSubmit={() => {
        if (!reason.trim()) {
          toast.error("Give a reason");
          return;
        }
        removeItem("vettingRecords", (x) => x.id === r.id);
        vLog(r, "Removed from register", `${r.staffName} · ${r.role}`, "—", by, reason.trim());
        toast.success(`${r.staffName} removed from the ${register}`);
        onClose();
      }}
    >
      <p className="sm:col-span-2 text-sm">
        {anyEvidence
          ? `No checks inside the ${RETAIN_YEARS}-year retention window. The entry can be removed.`
          : "No checks have been completed, so this looks like a mistaken entry. It can be removed."}
      </p>
      <Field label="Reason" required className="sm:col-span-2">
        <TextInput
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Added twice by mistake"
        />
      </Field>
    </FormDialog>
  );
}

function CheckDialog({
  record,
  def,
  by,
  onClose,
}: {
  record: VettingRecord;
  def: VettingCheckDef;
  by: string;
  onClose: () => void;
}) {
  const cur = record.checks.find((c) => c.key === def.key);
  const [status, setStatus] = useState<VettingStatus>(cur?.status ?? "Pending");
  const [ref, setRef] = useState(cur?.ref ?? "");
  const [checkedOn, setCheckedOn] = useState(cur?.checkedOn ?? DEMO_TODAY);
  const [verifiedBy, setVerifiedBy] = useState(cur?.verifiedBy ?? by);
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`${def.label} — ${record.staffName}`}
      description={def.renewMonths ? `Renew every ${def.renewMonths} months.` : "One-off check."}
      submitLabel="Save check"
      onSubmit={() => {
        const next: VettingCheck = {
          key: def.key,
          status,
          ref: ref || undefined,
          checkedOn: status === "Pending" || status === "Not required" ? undefined : checkedOn,
          expires:
            status === "Verified" && def.renewMonths
              ? addMonths(checkedOn, def.renewMonths)
              : undefined,
          verifiedBy: status === "Verified" ? verifiedBy : undefined,
        };
        const checks = cur
          ? record.checks.map((c) => (c.key === def.key ? next : c))
          : [...record.checks, next];
        updateItem("vettingRecords", (r) => r.id === record.id, { checks });
        vLog(
          record,
          def.label,
          cur ? [cur.status, cur.checkedOn, cur.ref].filter(Boolean).join(" · ") : "—",
          [status, next.checkedOn, next.ref].filter(Boolean).join(" · "),
          by,
        );
        toast.success(`${def.label}: ${status}`, { description: record.staffName });
        onClose();
      }}
    >
      <Field label="Status">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as VettingStatus)}
          options={["Verified", "Pending", "Expired", "Not required"].map((s) => ({
            value: s,
            label: s,
          }))}
        />
      </Field>
      <Field label="Certificate / reference">
        <TextInput value={ref} onChange={(e) => setRef(e.target.value)} />
      </Field>
      <Field label="Checked on">
        <TextInput type="date" value={checkedOn} onChange={(e) => setCheckedOn(e.target.value)} />
      </Field>
      <Field label="Verified by">
        <TextInput value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

function AddStaffDialog({
  open,
  onOpenChange,
  tenantId,
  defs,
  existing,
  by,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  defs: VettingCheckDef[];
  existing: string[];
  by: string;
}) {
  const suggestions = (TENANT_STAFF[tenantId] ?? []).filter((s) => !existing.includes(s.name));
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [start, setStart] = useState(DEMO_TODAY);
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add staff member"
      description="Every check required in this region starts as Pending."
      submitLabel="Add to register"
      onSubmit={() => {
        if (!name.trim()) {
          toast.error("Name is required");
          return;
        }
        const id = nextId(`VET-${tenantId.slice(3)}`, "vettingRecords");
        vLog(
          { id, tenantId },
          "Added to register",
          undefined,
          `${name.trim()} · ${role || "Staff"}`,
          by,
        );
        addItem("vettingRecords", {
          id,
          tenantId,
          staffName: name.trim(),
          role: role || "Staff",
          startDate: start,
          checks: defs.map((d) => ({ key: d.key, status: "Pending" as const })),
        });
        toast.success(`${name} added — ${defs.length} checks to complete before starting`);
        setName("");
        setRole("");
        onOpenChange(false);
      }}
    >
      <Field label="Name" required>
        <TextInput list="vet-staff" value={name} onChange={(e) => setName(e.target.value)} />
        <datalist id="vet-staff">
          {suggestions.map((s) => (
            <option key={s.name} value={s.name} />
          ))}
        </datalist>
      </Field>
      <Field label="Role">
        <TextInput
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Teacher of Chemistry"
        />
      </Field>
      <Field label="Start date">
        <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
    </FormDialog>
  );
}
