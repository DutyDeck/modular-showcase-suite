import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Badge,
  Button,
  Field,
  TextInput,
  Select,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import {
  useCollection,
  addItem,
  updateItem,
  removeItem,
  nextId,
  type FeePlan,
  type Discount,
  type BillingCredit,
  type BillingClosure,
} from "@/lib/store";
import { students, type Weekday, type BillingModel, type VatTreatment } from "@/lib/mockData";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import { Plus, Pencil, Trash2, Percent, CalendarOff, HandCoins, BookMarked } from "lucide-react";

export const Route = createFileRoute("/app/pricing")({
  head: () => ({ meta: [{ title: "Fees & Pricing — 1StudentID" }] }),
  component: PricingPage,
});

const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MODEL_OPTS = [
  { value: "per-session", label: "Per session" },
  { value: "monthly", label: "Monthly (annualised)" },
  { value: "term-block", label: "Term block" },
];
const VAT_OPTS = [
  { value: "standard", label: "Standard (20%)" },
  { value: "exempt", label: "Exempt" },
  { value: "zero", label: "Zero-rated" },
];
const KIND_OPTS = [
  { value: "multi-course", label: "Multi-course bundle" },
  { value: "sibling", label: "Sibling discount" },
  { value: "course-promo", label: "Course promotion (time-boxed)" },
  { value: "bursary", label: "Bursary (targeted)" },
];
const round2 = (n: number) => Math.round(n * 100) / 100;

function PricingPage() {
  const { user } = useAuth();
  const { formatMoney, moneyRate, currency } = usePrefs();
  const isAdmin = user?.role === "admin";

  const feePlans = useCollection("feePlans");
  const discounts = useCollection("discounts");
  const credits = useCollection("billingCredits");
  const closures = useCollection("billingClosures");
  const enrollments = useCollection("billingEnrollments");

  const billedStudents = students.filter((s) => enrollments.some((e) => e.studentId === s.id));

  /* ── fee-plan dialog ─────────────────────────────────────────────────────── */
  const planDlg = useDisclosure();
  const [editingPlan, setEditingPlan] = useState(false);
  const emptyPlan = {
    courseId: "",
    courseName: "",
    teacher: "",
    billingModel: "per-session" as BillingModel,
    weekdays: ["Mon", "Wed"] as Weekday[],
    sessionRate: 15,
    monthlyRate: 120,
    termRate: 300,
    termWeeks: 12,
    vatTreatment: "standard" as VatTreatment,
  };
  const [planForm, setPlanForm] = useState(emptyPlan);

  const openNewPlan = () => {
    setEditingPlan(false);
    setPlanForm(emptyPlan);
    planDlg.onOpen();
  };
  const openEditPlan = (p: FeePlan) => {
    setEditingPlan(true);
    setPlanForm({
      courseId: p.courseId,
      courseName: p.courseName,
      teacher: p.teacher ?? "",
      billingModel: p.billingModel,
      weekdays: [...p.weekdays],
      sessionRate: round2((p.sessionRate ?? 0) * moneyRate),
      monthlyRate: round2((p.monthlyRate ?? 0) * moneyRate),
      termRate: round2((p.termRate ?? 0) * moneyRate),
      termWeeks: p.termWeeks ?? 12,
      vatTreatment: p.vatTreatment,
    });
    planDlg.onOpen();
  };
  const toggleDay = (d: Weekday) =>
    setPlanForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d],
    }));

  const savePlan = () => {
    if (!planForm.courseName.trim()) {
      toast.error("Course name is required");
      return;
    }
    const toBase = (v: number) => round2(Number(v) / moneyRate);
    const courseId =
      planForm.courseId ||
      `C-USR-${feePlans.filter((p) => p.courseId.startsWith("C-USR-")).length + 1}`;
    const plan: FeePlan = {
      courseId,
      courseName: planForm.courseName.trim(),
      teacher: planForm.teacher.trim() || undefined,
      billingModel: planForm.billingModel,
      weekdays: planForm.weekdays,
      vatTreatment: planForm.vatTreatment,
      sessionRate:
        planForm.billingModel === "per-session" ? toBase(planForm.sessionRate) : undefined,
      monthlyRate: planForm.billingModel === "monthly" ? toBase(planForm.monthlyRate) : undefined,
      termRate: planForm.billingModel === "term-block" ? toBase(planForm.termRate) : undefined,
      termWeeks:
        planForm.billingModel === "term-block" ? Number(planForm.termWeeks) || 12 : undefined,
    };
    if (editingPlan) updateItem("feePlans", (p) => p.courseId === courseId, plan);
    else addItem("feePlans", plan);
    toast.success(`${editingPlan ? "Updated" : "Created"} ${plan.courseName}`);
    planDlg.onClose();
  };

  const rateText = (p: FeePlan) =>
    p.billingModel === "per-session"
      ? `${formatMoney(p.sessionRate ?? 0)} / session`
      : p.billingModel === "monthly"
        ? `${formatMoney(p.monthlyRate ?? 0)} / month`
        : `${formatMoney(p.termRate ?? 0)} / ${p.termWeeks}-wk term`;

  /* ── discount dialog ─────────────────────────────────────────────────────── */
  const discDlg = useDisclosure();
  const emptyDisc = {
    id: "",
    label: "",
    kind: "multi-course" as Discount["kind"],
    amountType: "percent" as "percent" | "fixed",
    value: 10,
    courseId: feePlans[0]?.courseId ?? "",
    minCourses: 2,
    studentId: billedStudents[0]?.id ?? "",
    validFrom: "",
    validTo: "",
    active: true,
  };
  const [discForm, setDiscForm] = useState(emptyDisc);
  const [editingDisc, setEditingDisc] = useState(false);

  const openNewDisc = () => {
    setEditingDisc(false);
    setDiscForm(emptyDisc);
    discDlg.onOpen();
  };
  const openEditDisc = (d: Discount) => {
    setEditingDisc(true);
    setDiscForm({
      id: d.id,
      label: d.label,
      kind: d.kind,
      amountType: d.amountType,
      value: d.value,
      courseId: d.courseId ?? feePlans[0]?.courseId ?? "",
      minCourses: d.minCourses ?? 2,
      studentId: d.studentIds?.[0] ?? billedStudents[0]?.id ?? "",
      validFrom: d.validFrom ?? "",
      validTo: d.validTo ?? "",
      active: d.active,
    });
    discDlg.onOpen();
  };
  const saveDisc = () => {
    if (!discForm.label.trim()) {
      toast.error("Discount name is required");
      return;
    }
    const d: Discount = {
      id: editingDisc ? discForm.id : nextId("DISC-", "discounts"),
      label: discForm.label.trim(),
      kind: discForm.kind,
      amountType: discForm.kind === "bursary" ? discForm.amountType : "percent",
      value: Number(discForm.value) || 0,
      courseId: discForm.kind === "course-promo" ? discForm.courseId : undefined,
      minCourses: discForm.kind === "multi-course" ? Number(discForm.minCourses) || 2 : undefined,
      studentIds: discForm.kind === "bursary" ? [discForm.studentId] : undefined,
      validFrom: discForm.kind === "course-promo" ? discForm.validFrom || undefined : undefined,
      validTo: discForm.kind === "course-promo" ? discForm.validTo || undefined : undefined,
      active: discForm.active,
    };
    if (editingDisc) updateItem("discounts", (x) => x.id === d.id, d);
    else addItem("discounts", d);
    toast.success(`${editingDisc ? "Updated" : "Created"} ${d.label}`);
    discDlg.onClose();
  };
  const discScope = (d: Discount) =>
    d.kind === "course-promo"
      ? (feePlans.find((p) => p.courseId === d.courseId)?.courseName ?? d.courseId)
      : d.kind === "multi-course"
        ? `${d.minCourses ?? 2}+ courses`
        : d.kind === "sibling"
          ? "Additional child"
          : (students.find((s) => s.id === d.studentIds?.[0])?.name ?? "Targeted");

  /* ── credit dialog ───────────────────────────────────────────────────────── */
  const creditDlg = useDisclosure();
  const [creditForm, setCreditForm] = useState({
    studentId: billedStudents[0]?.id ?? "",
    courseId: "",
    label: "Missed session — credit",
    amount: 15,
    reason: "",
    appliesMonth: new Date().toISOString().slice(0, 7),
  });
  const openCredit = () => {
    setCreditForm({
      studentId: billedStudents[0]?.id ?? "",
      courseId: "",
      label: "Missed session — credit",
      amount: 15,
      reason: "",
      appliesMonth: new Date().toISOString().slice(0, 7),
    });
    creditDlg.onOpen();
  };
  const saveCredit = () => {
    if (!creditForm.studentId) {
      toast.error("Choose a student");
      return;
    }
    const c: BillingCredit = {
      id: nextId("CR-", "billingCredits"),
      studentId: creditForm.studentId,
      courseId: creditForm.courseId || undefined,
      label: creditForm.label.trim() || "Credit",
      amount: round2(Number(creditForm.amount) / moneyRate),
      reason: creditForm.reason.trim() || undefined,
      appliesMonth: creditForm.appliesMonth,
      createdBy: user?.name ?? "Admin",
      at: new Date().toISOString().slice(0, 10),
    };
    addItem("billingCredits", c);
    toast.success("Credit logged — it will reduce that month's invoice");
    creditDlg.onClose();
  };

  /* ── closure dialog ──────────────────────────────────────────────────────── */
  const closureDlg = useDisclosure();
  const [closureForm, setClosureForm] = useState({ date: "", to: "", reason: "" });
  const openClosure = () => {
    setClosureForm({ date: "", to: "", reason: "" });
    closureDlg.onOpen();
  };
  const saveClosure = () => {
    if (!closureForm.date || !closureForm.reason.trim()) {
      toast.error("Date and reason are required");
      return;
    }
    const c: BillingClosure = {
      id: nextId("CL-", "billingClosures"),
      date: closureForm.date,
      to: closureForm.to || undefined,
      reason: closureForm.reason.trim(),
    };
    addItem("billingClosures", c);
    toast.success("Closure added — those dates won't be billed");
    closureDlg.onClose();
  };
  const dfmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fees & Pricing" />
        <Section title="Admins only">
          <p className="text-sm text-muted-foreground">
            Only institute administrators can define course fees and discounts.
          </p>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees & Pricing"
        subtitle="Define what each course costs, add discounts and credits — these flow straight to families' Course Selection and the monthly billing run."
      />

      {/* Course fees */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <BookMarked className="h-4 w-4" /> Course fees
          </span>
        }
        description={`Prices shown in ${currency}. Model decides how the month is billed.`}
        actions={
          <Button size="sm" onClick={openNewPlan}>
            <Plus className="h-4 w-4" />
            New course fee
          </Button>
        }
      >
        <div className="divide-y">
          {feePlans.map((p) => (
            <div key={p.courseId} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{p.courseName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {p.weekdays.join(" · ")}
                  {p.teacher ? ` · ${p.teacher}` : ""}
                </div>
              </div>
              <Badge tone="default">
                {p.billingModel === "per-session"
                  ? "Per session"
                  : p.billingModel === "monthly"
                    ? "Monthly"
                    : "Term block"}
              </Badge>
              <Badge tone="muted">{p.vatTreatment === "standard" ? "VAT 20%" : "VAT exempt"}</Badge>
              <div className="text-sm font-semibold tabular-nums w-32 text-right shrink-0">
                {rateText(p)}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditPlan(p)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    removeItem("feePlans", (x) => x.courseId === p.courseId);
                    toast(`Removed ${p.courseName}`);
                  }}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Discounts */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <Percent className="h-4 w-4" /> Discounts &amp; offers
          </span>
        }
        actions={
          <Button size="sm" variant="outline" onClick={openNewDisc}>
            <Plus className="h-4 w-4" />
            New discount
          </Button>
        }
      >
        <div className="divide-y">
          {discounts.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{d.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {discScope(d)}
                  {d.validFrom ? ` · ${d.validFrom} → ${d.validTo}` : ""}
                </div>
              </div>
              <div className="text-sm font-semibold shrink-0">
                {d.amountType === "percent" ? `−${d.value}%` : `−${formatMoney(d.value)}`}
              </div>
              <button
                onClick={() => updateItem("discounts", (x) => x.id === d.id, { active: !d.active })}
                className={`text-[11px] px-2 py-1 rounded-md font-medium shrink-0 ${
                  d.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {d.active ? "Active" : "Off"}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditDisc(d)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    removeItem("discounts", (x) => x.id === d.id);
                    toast(`Removed ${d.label}`);
                  }}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Credits */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <HandCoins className="h-4 w-4" /> Absence credits &amp; make-ups
          </span>
        }
        description="Log a credit for a missed session or a class cancelled without cover — it reduces that month's invoice."
        actions={
          <Button size="sm" variant="outline" onClick={openCredit}>
            <Plus className="h-4 w-4" />
            Log credit
          </Button>
        }
      >
        <div className="divide-y">
          {credits.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">No credits logged.</p>
          )}
          {credits.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">
                  {students.find((s) => s.id === c.studentId)?.name ?? c.studentId} — {c.label}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {c.appliesMonth}
                  {c.reason ? ` · ${c.reason}` : ""}
                </div>
              </div>
              <div className="text-sm font-semibold text-success shrink-0">
                −{formatMoney(c.amount)}
              </div>
              <button
                onClick={() => {
                  removeItem("billingCredits", (x) => x.id === c.id);
                  toast("Credit removed");
                }}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Closures */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <CalendarOff className="h-4 w-4" /> Term breaks &amp; closures
          </span>
        }
        description="Weeks off and closure days are removed from the session count, so no class on these dates is billed."
        actions={
          <Button size="sm" variant="outline" onClick={openClosure}>
            <Plus className="h-4 w-4" />
            Add closure
          </Button>
        }
      >
        <div className="divide-y">
          {closures.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">
                  {c.to ? `${dfmt(c.date)} → ${dfmt(c.to)}` : dfmt(c.date)}
                </div>
                <div className="text-[11px] text-muted-foreground">{c.reason}</div>
              </div>
              {c.to && <Badge tone="info">week off</Badge>}
              <button
                onClick={() => {
                  removeItem("billingClosures", (x) => x.id === c.id);
                  toast("Closure removed");
                }}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Fee-plan dialog ─────────────────────────────────────────────────── */}
      <FormDialog
        open={planDlg.open}
        onOpenChange={planDlg.setOpen}
        title={editingPlan ? "Edit course fee" : "New course fee"}
        description="How much this course costs and how the month is billed."
        onSubmit={savePlan}
        submitLabel={editingPlan ? "Save" : "Create"}
      >
        <Field label="Course name" required className="sm:col-span-2">
          <TextInput
            value={planForm.courseName}
            onChange={(e) => setPlanForm({ ...planForm, courseName: e.target.value })}
            placeholder="e.g. A/L Accounting"
            autoFocus
          />
        </Field>
        <Field label="Tutor">
          <TextInput
            value={planForm.teacher}
            onChange={(e) => setPlanForm({ ...planForm, teacher: e.target.value })}
            placeholder="e.g. Ms. Perera"
          />
        </Field>
        <Field label="Billing model">
          <Select
            value={planForm.billingModel}
            onChange={(e) =>
              setPlanForm({ ...planForm, billingModel: e.target.value as BillingModel })
            }
            options={MODEL_OPTS}
          />
        </Field>
        <Field label={`Class days`} className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                  planForm.weekdays.includes(d)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
        {planForm.billingModel === "per-session" && (
          <Field label={`Rate per session (${currency})`}>
            <TextInput
              type="number"
              min={0}
              value={planForm.sessionRate}
              onChange={(e) => setPlanForm({ ...planForm, sessionRate: Number(e.target.value) })}
            />
          </Field>
        )}
        {planForm.billingModel === "monthly" && (
          <Field label={`Monthly fee (${currency})`}>
            <TextInput
              type="number"
              min={0}
              value={planForm.monthlyRate}
              onChange={(e) => setPlanForm({ ...planForm, monthlyRate: Number(e.target.value) })}
            />
          </Field>
        )}
        {planForm.billingModel === "term-block" && (
          <>
            <Field label={`Term fee (${currency})`}>
              <TextInput
                type="number"
                min={0}
                value={planForm.termRate}
                onChange={(e) => setPlanForm({ ...planForm, termRate: Number(e.target.value) })}
              />
            </Field>
            <Field label="Term length (weeks)">
              <TextInput
                type="number"
                min={1}
                value={planForm.termWeeks}
                onChange={(e) => setPlanForm({ ...planForm, termWeeks: Number(e.target.value) })}
              />
            </Field>
          </>
        )}
        <Field label="VAT treatment">
          <Select
            value={planForm.vatTreatment}
            onChange={(e) =>
              setPlanForm({ ...planForm, vatTreatment: e.target.value as VatTreatment })
            }
            options={VAT_OPTS}
          />
        </Field>
      </FormDialog>

      {/* ── Discount dialog ─────────────────────────────────────────────────── */}
      <FormDialog
        open={discDlg.open}
        onOpenChange={discDlg.setOpen}
        title={editingDisc ? "Edit discount" : "New discount"}
        onSubmit={saveDisc}
        submitLabel={editingDisc ? "Save" : "Create"}
      >
        <Field label="Name" required className="sm:col-span-2">
          <TextInput
            value={discForm.label}
            onChange={(e) => setDiscForm({ ...discForm, label: e.target.value })}
            placeholder="e.g. Multi-subject discount"
            autoFocus
          />
        </Field>
        <Field label="Type">
          <Select
            value={discForm.kind}
            onChange={(e) => setDiscForm({ ...discForm, kind: e.target.value as Discount["kind"] })}
            options={KIND_OPTS}
          />
        </Field>
        {discForm.kind === "bursary" ? (
          <Field label="Amount type">
            <Select
              value={discForm.amountType}
              onChange={(e) =>
                setDiscForm({ ...discForm, amountType: e.target.value as "percent" | "fixed" })
              }
              options={[
                { value: "fixed", label: `Fixed (${currency})` },
                { value: "percent", label: "Percent (%)" },
              ]}
            />
          </Field>
        ) : (
          <Field label="Percent off">
            <TextInput
              type="number"
              min={0}
              value={discForm.value}
              onChange={(e) => setDiscForm({ ...discForm, value: Number(e.target.value) })}
            />
          </Field>
        )}
        {discForm.kind === "bursary" && (
          <Field label={discForm.amountType === "fixed" ? `Amount (${currency})` : "Percent off"}>
            <TextInput
              type="number"
              min={0}
              value={discForm.value}
              onChange={(e) => setDiscForm({ ...discForm, value: Number(e.target.value) })}
            />
          </Field>
        )}
        {discForm.kind === "multi-course" && (
          <Field label="Minimum courses">
            <TextInput
              type="number"
              min={2}
              value={discForm.minCourses}
              onChange={(e) => setDiscForm({ ...discForm, minCourses: Number(e.target.value) })}
            />
          </Field>
        )}
        {discForm.kind === "course-promo" && (
          <>
            <Field label="Course" className="sm:col-span-2">
              <Select
                value={discForm.courseId}
                onChange={(e) => setDiscForm({ ...discForm, courseId: e.target.value })}
                options={feePlans.map((p) => ({ value: p.courseId, label: p.courseName }))}
              />
            </Field>
            <Field label="Valid from">
              <TextInput
                type="date"
                value={discForm.validFrom}
                onChange={(e) => setDiscForm({ ...discForm, validFrom: e.target.value })}
              />
            </Field>
            <Field label="Valid to">
              <TextInput
                type="date"
                value={discForm.validTo}
                onChange={(e) => setDiscForm({ ...discForm, validTo: e.target.value })}
              />
            </Field>
          </>
        )}
        {discForm.kind === "bursary" && (
          <Field label="Student" className="sm:col-span-2">
            <Select
              value={discForm.studentId}
              onChange={(e) => setDiscForm({ ...discForm, studentId: e.target.value })}
              options={billedStudents.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
        )}
      </FormDialog>

      {/* ── Credit dialog ───────────────────────────────────────────────────── */}
      <FormDialog
        open={creditDlg.open}
        onOpenChange={creditDlg.setOpen}
        title="Log a credit"
        description="A refund for a missed or cancelled session — applied to the chosen month's invoice."
        onSubmit={saveCredit}
        submitLabel="Log credit"
      >
        <Field label="Student" required className="sm:col-span-2">
          <Select
            value={creditForm.studentId}
            onChange={(e) => setCreditForm({ ...creditForm, studentId: e.target.value })}
            options={billedStudents.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>
        <Field label="Reason / label" className="sm:col-span-2">
          <TextInput
            value={creditForm.label}
            onChange={(e) => setCreditForm({ ...creditForm, label: e.target.value })}
          />
        </Field>
        <Field label={`Amount (${currency})`} required>
          <TextInput
            type="number"
            min={0}
            value={creditForm.amount}
            onChange={(e) => setCreditForm({ ...creditForm, amount: Number(e.target.value) })}
          />
        </Field>
        <Field label="Applies to month">
          <TextInput
            type="month"
            value={creditForm.appliesMonth}
            onChange={(e) => setCreditForm({ ...creditForm, appliesMonth: e.target.value })}
          />
        </Field>
        <Field label="Note" className="sm:col-span-2">
          <TextInput
            value={creditForm.reason}
            onChange={(e) => setCreditForm({ ...creditForm, reason: e.target.value })}
            placeholder="e.g. Absent 8 Jul (illness)"
          />
        </Field>
      </FormDialog>

      {/* ── Closure dialog ──────────────────────────────────────────────────── */}
      <FormDialog
        open={closureDlg.open}
        onOpenChange={closureDlg.setOpen}
        title="Add closure / term break"
        description="Leave the end date empty for a single day, or set it to mark a whole week off."
        onSubmit={saveClosure}
        submitLabel="Add"
      >
        <Field label="From" required>
          <TextInput
            type="date"
            value={closureForm.date}
            onChange={(e) => setClosureForm({ ...closureForm, date: e.target.value })}
          />
        </Field>
        <Field label="To (optional)">
          <TextInput
            type="date"
            value={closureForm.to}
            onChange={(e) => setClosureForm({ ...closureForm, to: e.target.value })}
          />
        </Field>
        <Field label="Reason" required className="sm:col-span-2">
          <TextInput
            value={closureForm.reason}
            onChange={(e) => setClosureForm({ ...closureForm, reason: e.target.value })}
            placeholder="e.g. Mid-term break — no classes"
          />
        </Field>
      </FormDialog>
    </div>
  );
}
