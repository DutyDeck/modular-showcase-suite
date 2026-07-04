import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, TextInput, Select, FormDialog } from "@/components/ui-kit";
import { useCollection, addItem, nextId, type Student, type SwimmerMove } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  sessionsByCourse,
  sessionsForCoach,
  isSwimAdmin,
  ageOn,
  swimmerGuardians,
  SWIM_COURSE_ID,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { ShieldCheck, UserCog, Users } from "lucide-react";

/**
 * Register a brand-new swimmer — which also onboards them onto the 1StudentID
 * platform. Based on the swimmer's age, the login is created for the right
 * person (a minor's parent/guardian, or the swimmer themselves if 18+), and the
 * family chooses how they'll sign in (Google, Apple, Microsoft Entra ID, or a
 * 1StudentID email login). The swimmer is created and assigned to a session.
 */
const AUTH_METHODS = [
  { id: "google", label: "Google", hint: "Gmail" },
  { id: "apple", label: "Apple ID", hint: "Sign in with Apple" },
  { id: "microsoft", label: "Microsoft", hint: "Entra ID / Outlook" },
  { id: "oneid", label: "1StudentID", hint: "Email + password" },
] as const;

export function SwimRegisterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();

  const sessions = useMemo(
    () =>
      user && !isSwimAdmin(user) ? sessionsForCoach(user.name) : sessionsByCourse(SWIM_COURSE_ID),
    [user],
  );

  const [form, setForm] = useState({
    name: "",
    dob: "",
    level: "Learn-to-Swim",
    sessionId: "",
    guardianName: "",
    email: "",
    auth: "google" as (typeof AUTH_METHODS)[number]["id"],
    addCoParent: false,
    coName: "",
    coEmail: "",
  });

  const age = form.dob ? ageOn(form.dob) : null;
  const isMinor = age !== null && age < 18;
  const isAdult = age !== null && age >= 18;
  const authLabel = AUTH_METHODS.find((a) => a.id === form.auth)?.label ?? "1StudentID";

  const reset = () =>
    setForm({
      name: "",
      dob: "",
      level: "Learn-to-Swim",
      sessionId: "",
      guardianName: "",
      email: "",
      auth: "google",
      addCoParent: false,
      coName: "",
      coEmail: "",
    });

  const withCoParent = isMinor && form.addCoParent;

  const submit = () => {
    if (!form.name.trim()) return toast.error("Swimmer name is required");
    if (!form.dob) return toast.error("Date of birth is required to set up the login");
    if (!form.sessionId) return toast.error("Assign the swimmer to a session");
    if (isMinor && !form.guardianName.trim())
      return toast.error("A parent/guardian name is required for a minor");
    if (!form.email.trim()) return toast.error("An email is required to create the login");
    if (withCoParent && !form.coName.trim())
      return toast.error("Enter the co-parent's name, or turn off the second guardian");
    if (withCoParent && !form.coEmail.trim())
      return toast.error("A co-parent email is required to send their login");

    const primary = isMinor ? form.guardianName.trim() : form.name.trim();
    const coName = form.coName.trim();
    const student: Student = {
      id: nextId("S-", "students"),
      name: form.name.trim(),
      grade: "Aquatics",
      batch: form.level,
      attendance: 100,
      gpa: 0,
      status: "Active",
      parent: isMinor ? form.guardianName.trim() + (withCoParent ? " +1" : "") : "Self-managed",
      risk: "low",
    };
    addItem("students", student);

    // Link both guardians into the co-parent model so each can view the child
    // and pay for their own classes (the finance & notification flows read this).
    if (withCoParent) swimmerGuardians[student.id] = [primary, coName];

    const target = sessions.find((s) => s.id === form.sessionId);
    const move: SwimmerMove = {
      id: nextId("MOV-", "swimmerMoves"),
      studentId: student.id,
      studentName: student.name,
      sessionId: form.sessionId,
      kind: "enroll",
      reason: `Registered — ${target?.title ?? "swim session"}`,
      by: user?.name ?? "Front desk",
      at: new Date().toISOString(),
    };
    addItem("swimmerMoves", move);

    toast.success(
      withCoParent
        ? `Registered ${student.name}. Separate 1StudentID login invites sent to ${primary} (${form.email.trim()}) and co-parent ${coName} (${form.coEmail.trim()}) — both can view ${student.name} and pay for classes independently.`
        : `Registered ${student.name}. A 1StudentID login invite was sent to ${primary} (${form.email.trim()}) to sign in with ${authLabel}.`,
    );
    reset();
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title="Register new swimmer"
      description="Create a new swimmer, set up their 1StudentID login and place them into their first session."
      onSubmit={submit}
      submitLabel="Register & create login"
    >
      <Field label="Swimmer name" required className="sm:col-span-2">
        <TextInput
          data-tour="reg-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Sophie Turner"
          autoFocus
        />
      </Field>
      <Field label="Date of birth" required>
        <TextInput
          data-tour="reg-dob"
          type="date"
          value={form.dob}
          onChange={(e) => setForm({ ...form, dob: e.target.value })}
        />
      </Field>
      <Field label="Starting level">
        <Select
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
          options={["Learn-to-Swim", "Stroke Development", "Competitive Squad", "Diving"].map(
            (l) => ({ value: l, label: l }),
          )}
        />
      </Field>
      <Field label="Assign to session" required className="sm:col-span-2">
        <Select
          data-tour="reg-session"
          value={form.sessionId}
          onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
          options={[
            { value: "", label: "— Select session —" },
            ...sessions.map((s) => ({
              value: s.id,
              label: `${s.title} · ${s.level} · ${s.day} ${s.start}`,
            })),
          ]}
        />
      </Field>

      {/* Platform login — who holds it depends on the swimmer's age */}
      <div
        data-tour="reg-login"
        className="sm:col-span-2 rounded-lg border bg-muted/30 p-3 space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <UserCog className="h-4 w-4 text-primary" />
          1StudentID login
        </div>

        {age === null ? (
          <p className="text-xs text-muted-foreground">
            Enter a date of birth — we'll set up the login for the swimmer or their guardian
            accordingly.
          </p>
        ) : (
          <div className="flex items-start gap-2 rounded-md bg-background/60 px-2.5 py-2 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              {isMinor ? (
                <>
                  {form.name || "This swimmer"} is a minor ({age}). The account is{" "}
                  <b className="text-foreground">managed by a parent / guardian</b>, who receives
                  the login.
                </>
              ) : (
                <>
                  {form.name || "This swimmer"} is {age} —{" "}
                  <b className="text-foreground">18 or over</b>, so they manage their own login.
                </>
              )}
            </span>
          </div>
        )}

        {isMinor && (
          <Field label="Parent / guardian name" required>
            <TextInput
              value={form.guardianName}
              onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
              placeholder="e.g. Jack Smith"
            />
          </Field>
        )}
        <Field label={isAdult ? "Swimmer's email" : "Parent / guardian email"} required>
          <TextInput
            data-tour="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@example.com"
          />
        </Field>

        {/* Co-parent (second guardian) — separated/shared-custody families where
            both parents keep their own login and pay for their own classes. */}
        {isMinor && (
          <div className="rounded-md border bg-background/60 p-2.5 space-y-2.5">
            <label
              className="flex items-start gap-2 cursor-pointer select-none"
              data-tour="reg-coparent-toggle"
            >
              <input
                type="checkbox"
                checked={form.addCoParent}
                onChange={(e) => setForm({ ...form, addCoParent: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Add a second parent / guardian (co-parent)
                </span>
                <span className="block text-muted-foreground">
                  For separated or shared-custody families — both parents get their own login and
                  can pay for classes independently.
                </span>
              </span>
            </label>

            {form.addCoParent && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                <Field label="Co-parent name" required>
                  <TextInput
                    data-tour="reg-coparent-name"
                    value={form.coName}
                    onChange={(e) => setForm({ ...form, coName: e.target.value })}
                    placeholder="e.g. Amelia Smith"
                  />
                </Field>
                <Field label="Co-parent email" required>
                  <TextInput
                    data-tour="reg-coparent-email"
                    type="email"
                    value={form.coEmail}
                    onChange={(e) => setForm({ ...form, coEmail: e.target.value })}
                    placeholder="name@example.com"
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
            Sign-in method
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AUTH_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setForm({ ...form, auth: m.id })}
                className={cn(
                  "rounded-lg border p-2.5 text-left text-sm transition-colors",
                  form.auth === m.id ? "border-primary bg-primary/5" : "hover:bg-muted",
                )}
              >
                <div className="font-medium">{m.label}</div>
                <div className="text-[11px] text-muted-foreground">{m.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
