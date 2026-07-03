import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Select, TextArea, TextInput, Button } from "@/components/ui-kit";
import { useCollection, addItem, updateItem, nextId } from "@/lib/store";
import { OFFBOARD_REASONS, type OffboardPersonType, type Offboarding } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { UserMinus, ShieldCheck, Repeat, BellOff, Archive } from "lucide-react";

/**
 * Off-board a swimmer or a coach from a tenant. This is a GDPR-friendly *leaver*
 * flow: nothing is deleted — the person's attendance, record books, invoices and
 * messages are retained — but the relationship with the institute is marked
 * ended so recurring billing and automated / recurring messaging stop. For a
 * swimmer we also flip their roster status to "Inactive".
 */
export function OffboardDialog({
  open,
  onOpenChange,
  person,
  tenantId,
  tenantName,
  adminName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  person: { id: string; name: string; type: OffboardPersonType } | null;
  tenantId: string;
  tenantName: string;
  adminName: string;
}) {
  const [reason, setReason] = useState<string>(OFFBOARD_REASONS[0]);
  const [note, setNote] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(new Date().toISOString().slice(0, 10));
  const [stopPayments, setStopPayments] = useState(true);
  const [stopMessaging, setStopMessaging] = useState(true);

  if (!person) return null;
  const isSwimmer = person.type === "swimmer";
  const noun = isSwimmer ? "swimmer" : "coach";

  const reset = () => {
    setReason(OFFBOARD_REASONS[0]);
    setNote("");
    setEffectiveAt(new Date().toISOString().slice(0, 10));
    setStopPayments(true);
    setStopMessaging(true);
  };

  const submit = () => {
    const record: Offboarding = {
      id: nextId("OFF-", "offboardings"),
      personId: person.id,
      personName: person.name,
      personType: person.type,
      tenantId,
      tenantName,
      reason,
      note: note.trim() || undefined,
      stopPayments,
      stopMessaging,
      effectiveAt: new Date(effectiveAt).toISOString(),
      by: adminName,
      at: new Date().toISOString(),
    };
    addItem("offboardings", record);

    // A swimmer's roster status reflects that they no longer attend the club.
    if (isSwimmer) {
      updateItem("students", (s) => s.id === person.id, { status: "Inactive" });
    }

    toast.success(
      `${person.name} off-boarded from ${tenantName}. History retained${
        stopPayments ? " · recurring billing cancelled" : ""
      }${stopMessaging ? " · automated messaging stopped" : ""}.`,
    );
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Off-board {person.name}</DialogTitle>
          <DialogDescription>
            End this {noun}'s relationship with {tenantName}. Their records are kept — nothing is
            deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Reason" required>
              <Select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                options={OFFBOARD_REASONS.map((r) => ({ value: r, label: r }))}
              />
            </Field>
            <Field label="Effective from" required>
              <TextInput
                type="date"
                value={effectiveAt}
                onChange={(e) => setEffectiveAt(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Note (optional)">
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Family relocating overseas; thanked them and confirmed final invoice settled."
              className="min-h-[72px]"
            />
          </Field>

          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              What happens on off-board
            </div>
            <ToggleRow
              icon={<Repeat className="h-4 w-4" />}
              title={isSwimmer ? "Stop recurring billing" : "Stop payroll / recurring pay run"}
              hint={
                isSwimmer
                  ? "Cancel Direct Debit / card mandates — no further fees are collected."
                  : "Remove from the recurring pay run for this club."
              }
              checked={stopPayments}
              onChange={setStopPayments}
            />
            <ToggleRow
              icon={<BellOff className="h-4 w-4" />}
              title="Stop automated & recurring messaging"
              hint="Fee reminders, session nudges and newsletters stop. Manual one-off messages still possible."
              checked={stopMessaging}
              onChange={setStopMessaging}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <span>
              <b className="text-foreground">GDPR-safe:</b> attendance, record books, invoices and
              messages are retained for your legal record-keeping period. The person's 1StudentID
              account and any records at other institutes are untouched. You can reactivate them
              later.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} data-tour="offboard-submit">
            <UserMinus className="h-4 w-4" />
            Off-board {noun}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
        checked ? "border-primary bg-primary/5" : "hover:bg-muted",
      )}
    >
      <span className={cn("mt-0.5 shrink-0", checked ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <span
        className={cn(
          "mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0",
          checked ? "bg-primary border-primary text-white" : "bg-card",
        )}
      >
        {checked && <Archive className="h-3 w-3" />}
      </span>
    </button>
  );
}
