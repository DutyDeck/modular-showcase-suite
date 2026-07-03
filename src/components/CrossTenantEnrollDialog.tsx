import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Avatar } from "@/components/Avatar";
import { Badge, Button, Field, Select } from "@/components/ui-kit";
import { platformDirectory, type DirectoryStudent } from "@/lib/mockData";
import { addItem, nextId, useCollection, type Student, type SwimmerMove } from "@/lib/store";
import {
  Search,
  ShieldCheck,
  Lock,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  UserCheck,
  Building2,
  KeyRound,
  Sparkles,
} from "lucide-react";

type Step = "search" | "request" | "consent" | "done";

function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  if (!d) return "•••";
  const head = u.slice(0, 2);
  return `${head}${"•".repeat(Math.max(3, u.length - 2))}@${d}`;
}

function maskPhone(p: string): string {
  return `${p.slice(0, 3)} •• ••• ••${p.slice(-2)}`;
}

function randomOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function CrossTenantEnrollDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  swim = false,
  programmes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  tenantName: string;
  /** Swim-club tenant — enrol into a swim session/programme, not a college class. */
  swim?: boolean;
  /** Swim programme/session options (id = session id) when `swim`. */
  programmes?: { id: string; label: string }[];
}) {
  const existing = useCollection("enrollments");
  const roster = useCollection("students");
  const targetWord = swim ? "session" : "class";
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<DirectoryStudent | null>(null);
  const [classId, setClassId] = useState("");
  const [otp, setOtp] = useState("");
  const [code, setCode] = useState("");

  const reset = () => {
    setStep("search");
    setQuery("");
    setSearched(false);
    setSelected(null);
    setClassId("");
    setOtp("");
    setCode("");
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  // Only students NOT already enrolled at this tenant are eligible.
  const alreadyHere = useMemo(
    () => new Set(existing.filter((e) => e.institutionId === tenantId).map((e) => e.studentId)),
    [existing, tenantId],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return platformDirectory.filter((d) => {
      if (alreadyHere.has(d.oneEduId)) return false;
      return (
        d.email.toLowerCase() === q ||
        d.oneEduId.toLowerCase() === q ||
        d.email.toLowerCase().includes(q) ||
        d.oneEduId.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q)
      );
    });
  }, [query, alreadyHere]);

  const runSearch = () => {
    setSearched(true);
  };

  const pick = (d: DirectoryStudent) => {
    setSelected(d);
    setClassId(swim && programmes ? (programmes[0]?.id ?? "") : (d.availableClasses[0]?.id ?? ""));
    setStep("request");
  };

  // Enrolment target options + label — swim sessions for the club, else classes.
  const targetOptions =
    swim && programmes
      ? programmes.map((p) => ({ value: p.id, label: p.label }))
      : (selected?.availableClasses.map((c) => ({
          value: c.id,
          label: `${c.label} — $${c.fee}`,
        })) ?? []);
  const targetLabel =
    swim && programmes
      ? programmes.find((p) => p.id === classId)?.label
      : selected?.availableClasses.find((c) => c.id === classId)?.label;

  // Who must approve, and on which channels.
  const consent = selected
    ? selected.selfManaged
      ? {
          who: selected.name,
          role: "Student (18+, self-managed)",
          email: selected.email,
          phone: selected.phone,
          via: "Student OTP",
        }
      : {
          who: selected.guardianName ?? "Guardian",
          role: "Guardian / parent",
          email: selected.guardianEmail ?? "",
          phone: selected.guardianPhone ?? "",
          via: "Guardian OTP",
        }
    : null;

  const sendRequest = () => {
    if (!classId) {
      toast.error(`Select a ${targetWord} to enrol into`);
      return;
    }
    setCode(randomOtp());
    setOtp("");
    setStep("consent");
    toast.success("Consent request sent to the account holder / guardian via email + SMS");
  };

  const finalize = (via: string) => {
    if (!selected || !consent) return;
    const label = targetLabel ?? `New ${targetWord}`;
    // Bring the newly enrolled student onto this tenant's roster so they actually
    // appear under "view on roster" (they came from the platform directory, which
    // is separate from the local roster). For swim, batch = programme level.
    if (!roster.some((s) => s.id === selected.oneEduId)) {
      const newStudent: Student = {
        id: selected.oneEduId,
        name: selected.name,
        grade: swim ? "Aquatics" : selected.grade,
        batch: label,
        attendance: 100,
        gpa: 0,
        status: "Active",
        parent: selected.guardianName ?? "—",
        risk: "low",
      };
      addItem("students", newStudent);
    }
    // Swim tenant: also place the swimmer into the chosen session so they show in
    // the right programme (classId is a session id here).
    if (swim && classId) {
      const move: SwimmerMove = {
        id: nextId("MOV-", "swimmerMoves"),
        studentId: selected.oneEduId,
        studentName: selected.name,
        sessionId: classId,
        kind: "enroll",
        reason: `Cross-institute enrolment — ${label}`,
        by: "Club Manager",
        at: new Date().toISOString(),
      };
      addItem("swimmerMoves", move);
    }
    addItem("enrollments", {
      id: `XENR-${Date.now()}`,
      studentId: selected.oneEduId,
      studentName: selected.name,
      institutionId: tenantId,
      institutionName: tenantName,
      role: "Cross-tenant enrolment",
      classLabel: label,
      since: String(new Date().getFullYear()),
      at: new Date().toISOString(),
      consentBy: `${consent.who} (${consent.role})`,
      consentVia: via,
    });
    toast.success(`${selected.name} is now enrolled at ${tenantName}`);
    setStep("done");
  };

  const verifyOtp = () => {
    if (otp !== code) {
      toast.error("Incorrect OTP — check the code sent to the approver");
      return;
    }
    finalize(consent?.via ?? "OTP");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Enrol an existing 1StudentID student
          </DialogTitle>
          <DialogDescription>
            Find a student who is already on 1StudentID at another institute and request their
            enrolment at <span className="font-medium text-foreground">{tenantName}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <Stepper step={step} />

        {step === "search" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                You can only search by the student's <b>registered email</b> or{" "}
                <b>1StudentID reference number</b>. Results show availability only — contact details
                and records stay hidden until the student or guardian approves.
              </span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="email@example.com or S-2001"
                  autoFocus
                  className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button onClick={runSearch}>Search</Button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Try:</span>
              {["senuli.fernando@gmail.com", "S-2002"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    setSearched(true);
                  }}
                  className="rounded-md border bg-card px-2 py-0.5 font-mono hover:border-primary/50 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>

            {searched && (
              <div className="space-y-2">
                {results.length === 0 ? (
                  <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
                    No 1StudentID student matches that email or reference.
                  </div>
                ) : (
                  results.map((d) => (
                    <button
                      key={d.oneEduId}
                      onClick={() => pick(d)}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:border-primary/50 hover:shadow-soft transition-all flex items-center gap-3"
                    >
                      <Avatar name={d.name} seed={d.oneEduId} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{d.name}</span>
                          <Badge tone="success">Available</Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                          <span className="font-mono">{d.oneEduId}</span>
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> details hidden until approved
                          </span>
                        </div>
                      </div>
                      <Send className="h-4 w-4 text-primary shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {step === "request" && selected && consent && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <Avatar name={selected.name} seed={selected.oneEduId} size={40} />
              <div className="min-w-0">
                <div className="font-medium text-sm">{selected.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {selected.oneEduId}
                </div>
              </div>
              <Badge tone="success">Available</Badge>
            </div>

            <Field label={swim ? "Session to enrol into" : "Class to enrol into"}>
              <Select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                options={targetOptions}
              />
            </Field>

            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs space-y-2">
              <div className="flex items-center gap-2 font-medium text-warning-foreground">
                <ShieldCheck className="h-4 w-4" />
                Approval required before any personal details are shared
              </div>
              <p className="text-muted-foreground">
                Age, contact details and records stay hidden. A secure one-time approval request
                will be sent to the{" "}
                <b className="text-foreground">account holder or their guardian</b> — only after
                they approve do the details unlock for {tenantName}.
              </p>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Request will be sent to (masked)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  {maskEmail(consent.email)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  {maskPhone(consent.phone)}
                </span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep("search")}>
                Back
              </Button>
              <Button onClick={sendRequest}>
                <Send className="h-4 w-4" />
                Send consent request
              </Button>
            </div>
          </div>
        )}

        {step === "consent" && selected && consent && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Notification sent · awaiting approval
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Mail className="h-3.5 w-3.5 text-success" />
                Email to {maskEmail(consent.email)}
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <MessageSquare className="h-3.5 w-3.5 text-success" />
                SMS to {maskPhone(consent.phone)}
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              </div>
              <div className="rounded-md bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground italic">
                “{consent.who}, {tenantName} wants to enrol{" "}
                {selected.selfManaged ? "you" : selected.name} in {targetLabel}. Approve this
                enrolment?”
              </div>
            </div>

            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 text-center">
              <div className="text-[11px] text-muted-foreground">
                Demo OTP sent to {consent.role.toLowerCase()}
              </div>
              <div className="text-2xl font-bold tracking-[0.3em] text-primary mt-0.5">{code}</div>
            </div>

            <Field label={`Enter the OTP ${consent.who} received`}>
              <div className="flex justify-center py-1">
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-11 w-11 text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </Field>

            <Button className="w-full" onClick={verifyOtp} disabled={otp.length < 4}>
              <ShieldCheck className="h-4 w-4" />
              Verify & enrol
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="bg-card px-2">or</span>
              </div>
            </div>

            <button
              onClick={() => finalize("Magic link (one-click)")}
              className="w-full text-xs text-primary hover:underline inline-flex items-center justify-center gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Simulate one-click approval from the magic link
            </button>
          </div>
        )}

        {step === "done" && selected && consent && (
          <div className="space-y-4">
            <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
              <div className="font-semibold mt-1.5">Enrolment confirmed</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Approved by {consent.who} · {consent.via}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                Profile unlocked for {tenantName}
              </div>
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} seed={selected.oneEduId} size={44} />
                <div className="min-w-0">
                  <div className="font-medium text-sm">{selected.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {selected.oneEduId}
                  </div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-xs">
                <Detail icon={<Mail className="h-3 w-3" />} label="Email" value={selected.email} />
                <Detail
                  icon={<MessageSquare className="h-3 w-3" />}
                  label="Mobile"
                  value={selected.phone}
                />
                <Detail
                  icon={<Building2 className="h-3 w-3" />}
                  label="Home institute"
                  value={selected.homeInstitution}
                />
                <Detail
                  icon={<UserCheck className="h-3 w-3" />}
                  label={swim ? "Enrolled session" : "Enrolled class"}
                  value={targetLabel ?? "—"}
                />
              </dl>
            </div>

            <Button className="w-full" onClick={() => close(false)}>
              Done — view on roster
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "search", label: "Find" },
    { id: "request", label: "Request" },
    { id: "consent", label: "Approve" },
    { id: "done", label: "Enrolled" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div className="flex items-center gap-1.5 pb-1">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1.5 flex-1">
          <div
            className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
              i < idx
                ? "bg-success text-white"
                : i === idx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i < idx ? "✓" : i + 1}
          </div>
          <span
            className={`text-[11px] hidden sm:inline ${
              i === idx ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 ${i < idx ? "bg-success" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </dt>
      <dd className="font-medium truncate mt-0.5">{value}</dd>
    </div>
  );
}
