/* Family-operated pupil accounts (primary years): the school issues the pupil
 * a Microsoft 365 / Google account and the FAMILY uses it. These pieces make
 * that explicit in the UI and keep consent with the registered guardian. */
import { useMemo, useState } from "react";
import { Users, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useTenantContext } from "@/lib/packs/registry";
import { PROVIDER_LABEL } from "@/lib/packs/foundationData";

/** Slim banner across the app for a family-operated pupil session. */
export function FamilyAccountBanner() {
  const { familyOperated, account, guardianName, user } = useTenantContext();
  if (!familyOperated || !account) return null;
  return (
    <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs flex flex-wrap items-center gap-x-2 gap-y-1">
      <Users className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="font-medium">Family-used school account</span>
      <span className="text-muted-foreground">
        {user?.name}
        {account.band ? ` · ${account.band}` : ""} · {PROVIDER_LABEL[account.provider]} ·{" "}
        {account.login}
      </span>
      <span className="text-muted-foreground">
        — consents are confirmed with a code sent to {guardianName ?? "the registered guardian"}.
      </span>
    </div>
  );
}

function demoCode(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String(1000 + (h % 9000));
}

/**
 * Guardian one-time-code check for family-operated accounts. Renders nothing
 * (and reports verified) for a normal parent session — the parent's own
 * login already identifies them.
 */
export function useGuardianVerification(purpose: string) {
  const { familyOperated, guardianName, actingAs } = useTenantContext();
  const code = useMemo(() => demoCode(`${guardianName}:${purpose}`), [guardianName, purpose]);
  const [otp, setOtp] = useState("");
  const verified = !familyOperated || otp === code;
  const field = familyOperated ? (
    <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-4 w-4 text-primary" />
        Guardian confirmation
      </div>
      <p className="text-xs text-muted-foreground">
        This is a pupil&apos;s school account, so consent must come from the registered guardian. A
        code was sent to {guardianName}&apos;s registered mobile.{" "}
        <span className="font-medium text-foreground">Demo code: {code}</span>
      </p>
      <InputOTP maxLength={4} value={otp} onChange={setOtp}>
        <InputOTPGroup>
          {[0, 1, 2, 3].map((i) => (
            <InputOTPSlot key={i} index={i} className="h-10 w-10" />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  ) : null;
  return {
    field,
    verified,
    /** Name + method recorded against the action (audit). */
    recordedBy: familyOperated ? `${actingAs} (guardian code · family account)` : actingAs,
  };
}
