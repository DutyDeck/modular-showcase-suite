import { createFileRoute } from "@tanstack/react-router";
import { displaySymbol, toLedger } from "@/lib/displayCurrency";
import { useState } from "react";
import { toast } from "sonner";
import {
  BedDouble,
  Bus,
  Sparkles,
  Map as MapIcon,
  Plus,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Star,
} from "lucide-react";
import {
  PageHeader,
  Section,
  DataTable,
  Button,
  Badge,
  FormDialog,
  Field,
  TextInput,
  NumberInput,
  Select,
  TextArea,
  StatCard,
} from "@/components/ui-kit";
import { PackContextBar, PackEmpty, StatusPill, Tabs } from "@/components/packs/PackUI";
import { useGuardianVerification } from "@/components/packs/FamilyAccount";
import { Avatar } from "@/components/Avatar";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import { addItem, nextId, updateItem, useCollection } from "@/lib/store";
import { money } from "@/lib/packs/regions";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import {
  type SchoolService,
  type ServiceEnrolment,
  type ServiceKind,
} from "@/lib/packs/schoolData";
import { AwardPointsDialog } from "./app.school.curricula";

export const Route = createFileRoute("/app/school/life")({
  head: () => ({ meta: [{ title: "School Life — 1StudentID" }] }),
  component: SchoolLifePage,
});

const KINDS: { id: ServiceKind; label: string; icon: React.ReactNode }[] = [
  { id: "Trip", label: "Trips", icon: <MapIcon className="h-4 w-4" /> },
  { id: "Activity", label: "Activities", icon: <Sparkles className="h-4 w-4" /> },
  { id: "Transport", label: "Transport", icon: <Bus className="h-4 w-4" /> },
  { id: "Boarding", label: "Boarding", icon: <BedDouble className="h-4 w-4" /> },
];

/** Price in the service's own currency, with the tenant-currency equivalent when they differ. */
function PriceTag({ svc, tenantCurrency }: { svc: SchoolService; tenantCurrency: string }) {
  if (svc.fee === 0) return <span className="text-success font-medium">Free</span>;
  const cur = svc.currency ?? tenantCurrency;
  // Shown in the app's display currency; note when it's priced in another.
  if (cur === tenantCurrency) return <span>{money(svc.fee, cur)}</span>;
  return (
    <span>
      {money(svc.fee, cur)}
      <span className="block text-[10px] text-muted-foreground">priced in {cur}</span>
    </span>
  );
}

function fmt(iso?: string) {
  return iso
    ? new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "—";
}

function SchoolLifePage() {
  const ctx = useTenantContext();
  const services = useCollection("schoolServices").filter((s) => s.tenantId === ctx.tenantId);
  const [kind, setKind] = useState<ServiceKind>("Trip");
  const role = ctx.user?.role;
  const familyOperated = ctx.familyOperated;

  if (services.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="School Life" subtitle="Boarding, transport, activities and trips" />
        <PackContextBar pack="intl-school" />
        <PackEmpty
          pack="intl-school"
          title="No school-life services yet"
          body="Set up boarding houses, bus routes, after-school activities and trips with consent and payment."
        />
      </div>
    );
  }

  const tabs = KINDS.map((k) => ({
    id: k.id,
    label: k.label,
    count: services.filter((s) => s.kind === k.id).length,
  }));

  return (
    <div className="space-y-6">
      {role === "parent" || familyOperated ? (
        <ParentView services={services} />
      ) : (
        <>
          <PageHeader
            title={role === "teacher" ? "Houses & School Life" : "School Life"}
            subtitle="Boarding, transport, extra-curricular activities and trips — with parental consent and payment."
          />
          <PackContextBar pack="intl-school" />
          <Tabs tabs={tabs} value={kind} onChange={setKind} />
          <StaffView services={services.filter((s) => s.kind === kind)} kind={kind} />
        </>
      )}
    </div>
  );
}

/* ── Admin / teacher ─────────────────────────────────────────────────────── */

function StaffView({ services, kind }: { services: SchoolService[]; kind: ServiceKind }) {
  const { tenantId, currency, isAdmin, user } = useTenantContext();
  const enrolments = useCollection("serviceEnrolments").filter((e) => e.tenantId === tenantId);
  const learners = useCollection("learners").filter((l) => l.tenantId === tenantId);
  const houses = useCollection("houses").filter((h) => h.tenantId === tenantId);
  const me = user?.name ?? "";
  const visible = isAdmin
    ? services
    : services.filter((s) => s.leader === me).concat(services.filter((s) => s.leader !== me));
  const [openId, setOpenId] = useState<string | null>(visible[0]?.id ?? null);
  const [addOpen, setAddOpen] = useState(false);
  const [awardFor, setAwardFor] = useState<string | null>(null);

  const kindEnrol = enrolments.filter((e) => services.some((s) => s.id === e.serviceId));
  const outstanding = kindEnrol.filter((e) => {
    const s = services.find((x) => x.id === e.serviceId);
    return s?.requiresConsent && !e.consentAt && e.status !== "Declined";
  });
  const unpaid = kindEnrol.filter(
    (e) =>
      !e.paid &&
      e.status === "Confirmed" &&
      (services.find((s) => s.id === e.serviceId)?.fee ?? 0) > 0,
  );
  const open = services.find((s) => s.id === openId);
  const roster = enrolments.filter((e) => e.serviceId === openId);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={KINDS.find((k) => k.id === kind)?.label ?? kind}
          value={services.length}
          icon={KINDS.find((k) => k.id === kind)?.icon}
        />
        <StatCard
          label="Students signed up"
          value={kindEnrol.filter((e) => e.status !== "Declined").length}
          accent="success"
        />
        <StatCard
          label="Consents outstanding"
          value={outstanding.length}
          accent={outstanding.length ? "warning" : "success"}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Unpaid"
          value={unpaid.length}
          accent={unpaid.length ? "destructive" : "success"}
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Section
          title={KINDS.find((k) => k.id === kind)?.label}
          className="lg:col-span-2"
          actions={
            isAdmin && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            )
          }
        >
          <ul className="space-y-2">
            {visible.map((s) => {
              const n = enrolments.filter(
                (e) => e.serviceId === s.id && e.status !== "Declined",
              ).length;
              const pend = enrolments.filter(
                (e) =>
                  e.serviceId === s.id &&
                  s.requiresConsent &&
                  !e.consentAt &&
                  e.status !== "Declined",
              ).length;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setOpenId(s.id)}
                    className={`w-full text-left rounded-lg border p-3 hover:border-primary/50 transition-colors ${openId === s.id ? "ring-2 ring-primary border-primary" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {s.date ? fmt(s.date) : s.schedule} · {s.leader}
                          {s.leader === me ? " (you)" : ""}
                        </div>
                      </div>
                      <div className="text-xs text-right shrink-0">
                        <PriceTag svc={s} tenantCurrency={currency} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, (n / s.capacity) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {n}/{s.capacity}
                      </span>
                      {pend > 0 && <Badge tone="warning">{pend} consent</Badge>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section
          title={open ? `Roster — ${open.name}` : "Roster"}
          description={open?.detail}
          className="lg:col-span-3"
          actions={
            open?.requiresConsent && roster.some((e) => !e.consentAt) ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast.success(
                    `Reminder sent to ${roster.filter((e) => !e.consentAt).length} families`,
                  )
                }
              >
                Remind families
              </Button>
            ) : undefined
          }
        >
          {open && (
            <>
              <div className="flex flex-wrap gap-2 text-[11px] mb-3">
                <Badge tone="muted">{open.date ? `On ${fmt(open.date)}` : open.schedule}</Badge>
                {open.consentDeadline && (
                  <Badge tone={open.consentDeadline < DEMO_TODAY ? "destructive" : "warning"}>
                    Consent by {fmt(open.consentDeadline)}
                  </Badge>
                )}
                {open.currency && open.currency !== currency && (
                  <Badge tone="info">Second pricing currency: {open.currency}</Badge>
                )}
              </div>
              <DataTable
                columns={[
                  { key: "student", label: "Student" },
                  { key: "status", label: "Place" },
                  { key: "consent", label: "Consent" },
                  { key: "paid", label: "Payment" },
                  { key: "_actions", label: "" },
                ]}
                rows={roster}
                emptyText="No sign-ups yet"
                renderCell={(e: ServiceEnrolment, k) => {
                  const s = learners.find((l) => l.id === e.studentId);
                  if (k === "student")
                    return (
                      <div className="flex items-center gap-2">
                        <Avatar name={s?.name ?? ""} size={26} />
                        <div>
                          <div className="font-medium">{s?.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {s?.level} · {s?.house}
                            {s?.supportPlan ? " · support plan" : ""}
                          </div>
                        </div>
                      </div>
                    );
                  if (k === "status") return <StatusPill status={e.status} />;
                  if (k === "consent")
                    return !open.requiresConsent ? (
                      <span className="text-[11px] text-muted-foreground">Not required</span>
                    ) : e.consentAt ? (
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {e.consentBy}
                      </span>
                    ) : (
                      <Badge tone="warning">Awaiting</Badge>
                    );
                  if (k === "paid")
                    return open.fee === 0 ? (
                      "—"
                    ) : e.paid ? (
                      <Badge tone="success">Paid</Badge>
                    ) : (
                      <Badge tone="destructive">Unpaid</Badge>
                    );
                  return (
                    <div className="flex gap-1">
                      {isAdmin && e.status === "Waitlist" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateItem("serviceEnrolments", (x) => x.id === e.id, {
                              status: "Confirmed",
                            });
                            toast.success(`${s?.name} offered a place`);
                          }}
                        >
                          Offer place
                        </Button>
                      )}
                      {!isAdmin && houses.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Award house points"
                          onClick={() => setAwardFor(e.studentId)}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                }}
              />
            </>
          )}
        </Section>
      </div>

      <AddServiceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        kind={kind}
        tenantId={tenantId}
        currency={currency}
      />
      {awardFor && (
        <AwardPointsDialog
          open
          onOpenChange={(v) => !v && setAwardFor(null)}
          tenantId={tenantId}
          houses={houses}
          learners={learners}
          by={me}
          defaultStudentId={awardFor}
        />
      )}
    </>
  );
}

function AddServiceDialog({
  open,
  onOpenChange,
  kind,
  tenantId,
  currency,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: ServiceKind;
  tenantId: string;
  currency: string;
}) {
  const { profile } = useTenantContext();
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [fee, setFee] = useState("0");
  const [cur, setCur] = useState(currency);
  const [capacity, setCapacity] = useState("30");
  const [when, setWhen] = useState("");
  const [leader, setLeader] = useState("");
  const [deadline, setDeadline] = useState("");
  const isTrip = kind === "Trip";
  const currencies = [currency, ...(profile?.secondCurrency ? [profile.secondCurrency] : [])];
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Add ${kind.toLowerCase()}`}
      submitLabel="Add"
      onSubmit={() => {
        if (!name.trim() || !leader.trim()) {
          toast.error("Name and leader are required");
          return;
        }
        addItem("schoolServices", {
          id: nextId("SVC-", "schoolServices"),
          tenantId,
          kind,
          name: name.trim(),
          detail: detail.trim(),
          fee: toLedger(Number(fee) || 0, cur),
          currency: cur !== currency ? cur : undefined,
          capacity: Number(capacity) || 0,
          schedule: isTrip ? undefined : when || "Per term",
          date: isTrip ? when : undefined,
          requiresConsent: isTrip || kind === "Boarding",
          consentDeadline: isTrip ? deadline || undefined : undefined,
          leader: leader.trim(),
        });
        toast.success(`${name} added — families can now sign up`);
        setName("");
        onOpenChange(false);
      }}
    >
      <Field label="Name" required className="sm:col-span-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isTrip ? "Year 11 Geography field trip" : "Chess club"}
        />
      </Field>
      <Field label="Details" className="sm:col-span-2">
        <TextArea value={detail} onChange={(e) => setDetail(e.target.value)} />
      </Field>
      <Field label={`Fee (${displaySymbol()})`}>
        <NumberInput value={fee} onChange={(e) => setFee(e.target.value)} />
      </Field>
      <Field
        label="Priced in"
        hint={currencies.length > 1 ? "Second pricing currency available" : undefined}
      >
        <Select
          value={cur}
          onChange={(e) => setCur(e.target.value)}
          options={currencies.map((c) => ({ value: c, label: c }))}
        />
      </Field>
      <Field label={isTrip ? "Date" : "Schedule"}>
        <TextInput
          type={isTrip ? "date" : "text"}
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          placeholder="Tuesdays 15:30–16:30"
        />
      </Field>
      <Field label="Capacity">
        <NumberInput value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </Field>
      <Field label="Leader" required>
        <TextInput
          value={leader}
          onChange={(e) => setLeader(e.target.value)}
          placeholder="Mr. James Carter"
        />
      </Field>
      {isTrip && (
        <Field label="Consent deadline">
          <TextInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
      )}
    </FormDialog>
  );
}

/* ── Parent ──────────────────────────────────────────────────────────────── */

function ParentView({ services }: { services: SchoolService[] }) {
  const { tenantId, currency, actingAs } = useTenantContext();
  const kids = useScopedLearners();
  const enrolments = useCollection("serviceEnrolments").filter((e) => e.tenantId === tenantId);
  const [consentFor, setConsentFor] = useState<ServiceEnrolment | null>(null);
  const me = actingAs;

  const mine = enrolments.filter(
    (e) => kids.some((k) => k.id === e.studentId) && e.status !== "Declined",
  );
  const todo = mine.filter((e) => {
    const s = services.find((x) => x.id === e.serviceId);
    return (
      (s?.requiresConsent && !e.consentAt) ||
      (!e.paid && (s?.fee ?? 0) > 0 && e.status !== "Waitlist")
    );
  });

  const signUp = (svc: SchoolService, studentId: string) => {
    const taken = enrolments.filter(
      (e) => e.serviceId === svc.id && e.status !== "Declined",
    ).length;
    addItem("serviceEnrolments", {
      id: nextId("SE-", "serviceEnrolments"),
      tenantId,
      serviceId: svc.id,
      studentId,
      status: taken >= svc.capacity ? "Waitlist" : "Requested",
      paid: false,
    });
    toast.success(
      taken >= svc.capacity
        ? "Added to the waiting list"
        : `Signed up — ${svc.requiresConsent ? "please give consent" : "awaiting confirmation"}`,
    );
  };

  const pay = (e: ServiceEnrolment) => {
    const s = services.find((x) => x.id === e.serviceId);
    updateItem("serviceEnrolments", (x) => x.id === e.id, {
      paid: true,
      status:
        e.status === "Requested" && (!s?.requiresConsent || e.consentAt) ? "Confirmed" : e.status,
    });
    toast.success(`Paid ${s ? money(s.fee, s.currency ?? currency) : ""} — receipt emailed`);
  };

  return (
    <>
      <PageHeader
        title="Trips & Activities"
        subtitle="Give consent, pay and sign your children up — all in one place."
      />
      <PackContextBar pack="intl-school" />

      <Section
        title="Needs your attention"
        description={
          todo.length
            ? `${todo.length} item${todo.length === 1 ? "" : "s"}`
            : "You're all up to date."
        }
      >
        {todo.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" /> Nothing outstanding.
          </p>
        ) : (
          <ul className="divide-y">
            {todo.map((e) => {
              const s = services.find((x) => x.id === e.serviceId)!;
              const k = kids.find((x) => x.id === e.studentId);
              const needConsent = s.requiresConsent && !e.consentAt;
              return (
                <li
                  key={e.id}
                  className="py-3 flex flex-wrap items-center gap-3"
                  data-tour="school-consent"
                >
                  <Avatar name={k?.name ?? ""} size={32} />
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {k?.name} · {s.date ? fmt(s.date) : s.schedule}
                      {s.consentDeadline ? ` · consent by ${fmt(s.consentDeadline)}` : ""}
                    </div>
                  </div>
                  <div className="text-xs">
                    <PriceTag svc={s} tenantCurrency={currency} />
                  </div>
                  {needConsent ? (
                    <Button size="sm" onClick={() => setConsentFor(e)}>
                      <ShieldCheck className="h-3.5 w-3.5" /> Give consent
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => pay(e)}>
                      <CreditCard className="h-3.5 w-3.5" /> Pay now
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {kids.map((k) => (
        <Section
          key={k.id}
          title={`${k.name} · ${k.level}`}
          description={`House ${k.house ?? "—"} · tutor group ${k.group ?? "—"}`}
        >
          <div className="grid md:grid-cols-2 gap-3">
            {services.map((s) => {
              const e = enrolments.find((x) => x.serviceId === s.id && x.studentId === k.id);
              const icon = KINDS.find((x) => x.id === s.kind)?.icon;
              return (
                <div key={s.id} className="rounded-lg border p-3 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.kind} · {s.date ? fmt(s.date) : s.schedule}
                    </div>
                    <div className="text-xs mt-1">
                      <PriceTag svc={s} tenantCurrency={currency} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    {e ? (
                      <>
                        <StatusPill status={e.status} />
                        {e.paid && <div className="text-[10px] text-success">Paid</div>}
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => signUp(s, k.id)}>
                        Sign up
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ))}

      {consentFor && (
        <ConsentDialog
          enrolment={consentFor}
          service={services.find((s) => s.id === consentFor.serviceId)!}
          childName={kids.find((k) => k.id === consentFor.studentId)?.name ?? ""}
          parentName={me}
          currency={currency}
          onClose={() => setConsentFor(null)}
        />
      )}
    </>
  );
}

function ConsentDialog({
  enrolment,
  service,
  childName,
  parentName,
  currency,
  onClose,
}: {
  enrolment: ServiceEnrolment;
  service: SchoolService;
  childName: string;
  parentName: string;
  currency: string;
  onClose: () => void;
}) {
  const [medical, setMedical] = useState("");
  const [payNow, setPayNow] = useState(service.fee > 0);
  const [agree, setAgree] = useState(false);
  const guardian = useGuardianVerification(`consent:${enrolment.id}`);
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Consent — ${service.name}`}
      description={`${childName} · ${service.date ? fmt(service.date) : service.schedule} · led by ${service.leader}`}
      submitLabel={payNow ? "Give consent & pay" : "Give consent"}
      onSubmit={() => {
        if (!agree) {
          toast.error("Please confirm the consent statement");
          return;
        }
        if (!guardian.verified) {
          toast.error("Enter the code sent to the guardian's mobile");
          return;
        }
        updateItem("serviceEnrolments", (x) => x.id === enrolment.id, {
          consentBy: guardian.recordedBy,
          consentAt: new Date().toISOString(),
          paid: payNow || enrolment.paid,
          status: "Confirmed",
        });
        toast.success(`Consent recorded for ${childName}${payNow ? " and payment taken" : ""}`);
        onClose();
      }}
    >
      <div className="sm:col-span-2 rounded-lg bg-muted/40 p-3 text-xs">{service.detail}</div>
      <Field label="Medical / dietary notes for the trip leader" className="sm:col-span-2">
        <TextArea
          value={medical}
          onChange={(e) => setMedical(e.target.value)}
          placeholder="e.g. carries an inhaler; no nuts"
        />
      </Field>
      {service.fee > 0 && (
        <label className="sm:col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} />
          Pay now: <PriceTag svc={service} tenantCurrency={currency} />
        </label>
      )}
      <label className="sm:col-span-2 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span>
          I, {parentName}, give consent for {childName} to take part and confirm emergency contact
          details on file are correct.
        </span>
      </label>
      {guardian.field}
    </FormDialog>
  );
}
