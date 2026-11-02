import { createFileRoute, Link } from "@tanstack/react-router";
import { displaySymbol, fromLedger, toLedger } from "@/lib/displayCurrency";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardList,
  Copy,
  DoorOpen,
  FileWarning,
  Fingerprint,
  Hourglass,
  Link2,
  Megaphone,
  Pencil,
  PhoneCall,
  Plane,
  Plus,
  Target,
  Trash2,
  UserPlus,
  Wallet,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  DataTable,
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Select,
  FormDialog,
} from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PackContextBar, StatusPill, Tabs } from "@/components/packs/PackUI";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { useTenantContext } from "@/lib/packs/registry";
import { buildInstalments, type FeeAccount } from "@/lib/packs/bizData";
import {
  ID_FIELDS,
  idFieldsFor,
  money,
  suggestYearGroup,
  type InstitutionType,
  type RegionCode,
} from "@/lib/packs/regions";
import {
  DEMO_TODAY,
  addMonthsIso,
  billablePeriods,
  intakeStatus,
  intakesFor,
  startDateFor,
  type Intake,
  type Learner,
} from "@/lib/packs/foundationData";
import {
  ADMISSION_PIPELINE,
  visaDocLabel,
  type AdmissionStage,
  type Application,
} from "@/lib/packs/opsData";
import {
  CHANNEL_SOURCE,
  CRM_BRANCHES,
  DIAL_CODES,
  ENQUIRY_CHANNELS,
  findDuplicates,
  maskEmail,
  maskId,
  type CounsellorRota,
  type CounsellorTarget,
  type DuplicateMatch,
  type DuplicateProbe,
  type EnquiryChannel,
} from "@/lib/packs/sis/crm";
import { logChange, notify } from "@/lib/packs/sis/activity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admissions")({
  head: () => ({ meta: [{ title: "Admissions — 1StudentID" }] }),
  component: AdmissionsPage,
});

const SOURCES: Application["source"][] = [
  "Website",
  "Open day",
  "Agent",
  "UCAS",
  "Referral",
  "CRM lead",
  "Direct",
];

const fmtDate = (iso: string) =>
  iso
    ? new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const SIDE_LANES: AdmissionStage[] = ["Waitlist", "Declined", "Withdrawn"];
const CLOSED: AdmissionStage[] = ["Enrolled", "Declined", "Withdrawn"];

/** Display name for a programme, avoiding "BSc (Hons) BSc (Hons) …". */
function programmeLabel(p: { award?: string; name: string }) {
  if (!p.award || p.name.startsWith(p.award)) return p.name;
  return `${p.award} ${p.name}`;
}

/* ── Offerings: what an enquirer can be interested in ───────────────────── */

interface Offering {
  key: string; // C:<curId>:<yearGroup> | P:<id> | Q:<id>
  label: string;
  /** Label used by counsellor targets (year group, programme or qualification). */
  targetLabel: string;
  scopeId: string;
  curriculumId?: string;
  yearGroup?: string;
  programmeId?: string;
  qualificationId?: string;
  curriculumName?: string;
}

function useOfferings(tenantId: string, isSchool: boolean): Offering[] {
  const curricula = useCollection("curricula");
  const programmes = useCollection("programmes");
  const qualifications = useCollection("qualifications");
  return useMemo(() => {
    if (isSchool)
      return curricula
        .filter((c) => c.tenantId === tenantId)
        .flatMap((c) =>
          c.yearGroups.map((yg) => ({
            key: `C:${c.id}:${yg}`,
            label: `${yg} · ${c.name}`,
            targetLabel: yg,
            scopeId: c.id,
            curriculumId: c.id,
            yearGroup: yg,
            curriculumName: c.name,
          })),
        );
    return [
      ...programmes
        .filter((p) => p.tenantId === tenantId)
        .map((p) => ({
          key: `P:${p.id}`,
          label: programmeLabel(p),
          targetLabel: programmeLabel(p),
          scopeId: p.id,
          programmeId: p.id,
        })),
      ...qualifications
        .filter((q) => q.tenantId === tenantId)
        .map((q) => ({
          key: `Q:${q.id}`,
          label: `${q.code} ${q.title}`,
          targetLabel: `${q.code} ${q.title}`,
          scopeId: q.id,
          qualificationId: q.id,
        })),
    ];
  }, [curricula, programmes, qualifications, tenantId, isSchool]);
}

/** The target label an application counts towards. */
function interestOf(a: Application, offerings: Offering[], isSchool: boolean) {
  if (isSchool) return a.yearGroup ?? a.target;
  const o = offerings.find(
    (x) =>
      (a.programmeId && x.programmeId === a.programmeId) ||
      (a.qualificationId && x.qualificationId === a.qualificationId),
  );
  return o?.targetLabel ?? a.target;
}

/* ── Official ids offered at capture ─────────────────────────────────────── */

const FOREIGN_IDS = ["passport", "nic", "emiratesId", "nric", "mykad", "aadhaar", "iqama", "qid"];
const ID_COUNTRY: Record<string, string> = {
  nic: "Sri Lanka",
  emiratesId: "UAE",
  nric: "Singapore",
  mykad: "Malaysia",
  aadhaar: "India",
  iqama: "Saudi Arabia",
  qid: "Qatar",
};

function idTypeOptions(region: RegionCode, type: InstitutionType) {
  const local = idFieldsFor(region, type)
    .filter((f) => f.sensitive || ["ucas", "uln", "usi"].includes(f.key))
    .map((f) => f.key);
  const keys = [...new Set([...local, ...FOREIGN_IDS])];
  const def = local.find((k) => ID_FIELDS[k]?.sensitive) ?? "passport";
  return {
    def,
    options: keys
      .filter((k) => ID_FIELDS[k])
      .map((k) => ({
        value: k,
        label:
          ID_FIELDS[k].label + (ID_COUNTRY[k] && !local.includes(k) ? ` (${ID_COUNTRY[k]})` : ""),
      })),
  };
}

const idLabel = (k: string) => ID_FIELDS[k]?.label ?? k;

/** Full phone number with the region's calling code unless one was typed. */
function withDialCode(local: string, dial: string) {
  const v = local.trim();
  if (!v) return undefined;
  if (v.startsWith("+") || v.startsWith("00") || dial === "+") return v;
  return `${dial} ${v.replace(/^0/, "")}`;
}

const probeOf = (a: Application): DuplicateProbe => ({
  name: a.applicantName,
  dob: a.dob,
  email: a.email,
  phone: a.phone,
  officialIds: a.officialIds,
});

/* ── Stage / counsellor helpers ──────────────────────────────────────────── */

/** Stage changes always go through here so they reach the change log. */
function patchApp(a: Application, p: Partial<Application>, by: string, reason?: string) {
  if (p.stage && p.stage !== a.stage)
    logChange({
      tenantId: a.tenantId,
      entity: "application",
      entityId: a.id,
      studentId: a.studentId ?? a.matchedStudentId,
      field: "stage",
      from: a.stage,
      to: p.stage,
      by,
      reason,
    });
  if (p.owner && p.owner !== a.owner)
    logChange({
      tenantId: a.tenantId,
      entity: "application",
      entityId: a.id,
      field: "owner",
      from: a.owner,
      to: p.owner,
      by,
      reason,
    });
  updateItem("applications", (x) => x.id === a.id, p);
}

const isOpenEnquiry = (a: Application) => a.stage === "Enquiry" && !a.duplicateOf;

/** On-duty counsellor, else whoever has the fewest open enquiries. */
function autoAssign(counsellors: string[], onDuty: string | undefined, apps: Application[]) {
  if (onDuty && counsellors.includes(onDuty)) return { name: onDuty, why: "on duty" };
  const load = (c: string) => apps.filter((a) => a.owner === c && isOpenEnquiry(a)).length;
  const pick = [...counsellors].sort((x, y) => load(x) - load(y))[0];
  return { name: pick ?? "Admissions", why: "fewest open enquiries" };
}

function nextFollowUpId(a: Application) {
  const nums = (a.followUps ?? []).map((f) => parseInt(f.id.split("-F").pop() ?? "0", 10) || 0);
  return `${a.id}-F${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

/** Mark `dup` as a duplicate of `primary`: closed as Withdrawn, both notes updated. */
function markDuplicate(dup: Application, primary: Application, by: string) {
  const note = `Duplicate of ${primary.id} — closed on ${fmtDate(DEMO_TODAY)}.`;
  patchApp(
    dup,
    {
      duplicateOf: primary.id,
      stage: "Withdrawn",
      notes: dup.notes ? `${dup.notes}\n${note}` : note,
    },
    by,
    `Duplicate of ${primary.id}`,
  );
  logChange({
    tenantId: dup.tenantId,
    entity: "application",
    entityId: dup.id,
    field: "duplicateOf",
    to: primary.id,
    by,
  });
  // Open follow-ups move to the record we keep.
  const moving = (dup.followUps ?? []).filter((f) => !f.done);
  const pNote = `${dup.id} (${dup.channel ?? dup.source}, ${fmtDate(dup.createdAt)}) merged in as a duplicate.`;
  updateItem("applications", (x) => x.id === primary.id, {
    notes: primary.notes ? `${primary.notes}\n${pNote}` : pNote,
    followUps: [
      ...(primary.followUps ?? []),
      ...moving.map((f, i) => ({
        ...f,
        id: `${primary.id}-F${(primary.followUps?.length ?? 0) + i + 1}`,
        note: `${f.note} (from ${dup.id})`,
      })),
    ],
  });
  if (moving.length)
    updateItem("applications", (x) => x.id === dup.id, {
      followUps: (dup.followUps ?? []).map((f) => (f.done ? f : { ...f, done: DEMO_TODAY })),
    });
}

function linkStudent(a: Application, l: Learner, institution: string, by: string) {
  updateItem("applications", (x) => x.id === a.id, { matchedStudentId: l.id });
  logChange({
    tenantId: a.tenantId,
    entity: "application",
    entityId: a.id,
    studentId: l.id,
    field: "matchedStudentId",
    from: a.matchedStudentId,
    to: l.id,
    by,
    reason: `Matched existing 1StudentID at ${institution}`,
  });
  toast.success(`Linked to 1StudentID ${l.id}`, {
    description: "They keep the same 1StudentID when they enrol.",
  });
}

/* ════════════════════════════════════════════════════════════════════════ */

type TabId = "board" | "table" | "followups" | "duplicates" | "targets" | "waitlist" | "intakes";

function AdmissionsPage() {
  const ctx = useTenantContext();
  const all = useCollection("applications");
  const curricula = useCollection("curricula");
  const programmes = useCollection("programmes");
  const qualifications = useCollection("qualifications");
  const calendars = useCollection("academicCalendars");
  const allIntakes = useCollection("intakes");
  const feeAccounts = useCollection("feeAccounts");
  const learners = useCollection("learners");
  const tenants = useCollection("tenants");
  const rotas = useCollection("counsellorRotas");
  const [tab, setTab] = useState<TabId>("board");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const by = ctx.user?.name ?? "Admissions";
  const apps = useMemo(
    () =>
      all
        .filter((a) => a.tenantId === ctx.tenantId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, ctx.tenantId],
  );
  const isSchool = ctx.type === "school";
  const offerings = useOfferings(ctx.tenantId, isSchool);
  const myCurricula = curricula.filter((c) => c.tenantId === ctx.tenantId);
  const myProgrammes = programmes.filter((p) => p.tenantId === ctx.tenantId);
  const myQuals = qualifications.filter((q) => q.tenantId === ctx.tenantId);
  const myIntakes = allIntakes.filter((i) => i.tenantId === ctx.tenantId);
  const defaultCal =
    calendars.find((c) => c.tenantId === ctx.tenantId && c.isDefault) ??
    calendars.find((c) => c.tenantId === ctx.tenantId);
  const tenantNames = useMemo(
    () => Object.fromEntries(tenants.map((t) => [t.id, t.name])) as Record<string, string>,
    [tenants],
  );

  const rota = rotas.find((r) => r.tenantId === ctx.tenantId);
  const counsellors = useMemo(() => {
    if (rota?.counsellors.length) return rota.counsellors;
    const owners = [...new Set(apps.map((a) => a.owner))];
    return owners.length ? owners : [by];
  }, [rota, apps, by]);
  const branches = CRM_BRANCHES[ctx.tenantId] ?? [];

  const live = apps.filter((a) => !a.duplicateOf);
  const active = live.filter((a) => !CLOSED.includes(a.stage));
  const offers = live.filter((a) => a.stage === "Offer" || a.stage === "Accepted");
  const deposits = live.filter((a) => a.deposit?.paid);
  const depositTotal = deposits.reduce((s, a) => s + (a.deposit?.amount ?? 0), 0);
  const waitlist = live.filter((a) => a.stage === "Waitlist");
  const decided = live.filter((a) =>
    ["Enrolled", "Declined", "Withdrawn", "Deposit paid"].includes(a.stage),
  );
  const conversion = decided.length
    ? Math.round(
        (live.filter((a) => a.stage === "Enrolled" || a.stage === "Deposit paid").length /
          decided.length) *
          100,
      )
    : 0;
  const dueFollowUps = apps.flatMap((a) =>
    (a.followUps ?? []).filter((f) => !f.done && f.due <= DEMO_TODAY),
  );
  const dupCount = useMemo(() => possibleDuplicates(apps, learners).total, [apps, learners]);

  const openApp = apps.find((a) => a.id === openId) ?? null;

  if (!ctx.isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Admissions" subtitle="Admissions is managed by the admissions office." />
        <Section>
          <p className="text-sm text-muted-foreground">
            Only admissions staff can view applications. Contact the registrar if you need access.
          </p>
        </Section>
      </div>
    );
  }

  const enrol = (a: Application) => {
    // 1StudentID rule: never two learner rows with the same id. A matched
    // applicant keeps their 1StudentID; if that row already exists (at another
    // institution) we create a local row with a new id and record the link.
    const linked = a.matchedStudentId;
    const linkedRow = linked ? learners.find((l) => l.id === linked) : undefined;
    const id = linked && !linkedRow ? linked : nextId("S-", "learners");
    const cur = myCurricula.find((c) => c.id === a.curriculumId);
    const prog = myProgrammes.find((p) => p.id === a.programmeId);
    const qual = myQuals.find((q) => q.id === a.qualificationId);
    // The intake decides the start date and the calendar the learner follows.
    const intake = myIntakes.find((i) => i.name === a.intake);
    const startDate = startDateFor(intake);
    const calendarId =
      intake?.calendarId ?? cur?.calendarId ?? prog?.calendarId ?? defaultCal?.id ?? "";
    const durationMonths = prog ? prog.durationYears * 12 : qual ? 12 : undefined;
    const partTime = /part-time/i.test(a.target);
    const level = isSchool
      ? (a.yearGroup ?? a.target)
      : prog
        ? prog.level === "UG"
          ? "Level 4 (Year 1)"
          : prog.level === "PGT"
            ? "PGT (MSc)"
            : prog.level
        : qual
          ? qual.level
          : "New entrant";
    const learner: Learner = {
      id,
      tenantId: ctx.tenantId,
      name: a.applicantName,
      gender: a.gender,
      dob: a.dob,
      email: a.email,
      status: "Active",
      level,
      curriculumId: a.curriculumId,
      programmeId: a.programmeId,
      qualificationId: a.qualificationId,
      calendarId,
      guardians: a.guardianName ? [a.guardianName] : undefined,
      nationality: a.nationality,
      officialIds: { ...(a.officialIds ?? {}) },
      intake: a.intake,
      intakeId: intake?.id,
      startDate,
      expectedEnd: durationMonths
        ? addMonthsIso(startDate, partTime ? durationMonths * 2 : durationMonths)
        : undefined,
      mode: /apprentice/i.test(a.target) ? "Apprenticeship" : partTime ? "Part-time" : "Full-time",
      ...(linkedRow ? { linkedStudentId: linked } : {}),
    };
    addItem("learners", learner);
    // Hand-off to Finance: open the fee account with the admissions deposit
    // credited. Billing starts at the start date — periods already over are not
    // billed and the period they join in is pro-rated.
    const cal = calendars.find((c) => c.id === calendarId);
    const fullPeriods = cal?.terms.filter((t) => t.kind === "teaching").length || 1;
    const billable = billablePeriods(cal, startDate);
    const periods = billable.length ? billable : [{ label: "Annual", due: startDate, factor: 1 }];
    const sumFactors = periods.reduce((s, p) => s + p.factor, 0);
    const deposit = a.deposit?.amount ?? 0;
    // Annual tuition: what peers on the same offering pay, else a deposit multiple.
    const offeringId = a.programmeId ?? a.qualificationId ?? a.curriculumId;
    const peer = feeAccounts.find(
      (f) =>
        f.tenantId === ctx.tenantId &&
        f.tuition > 0 &&
        learners.some(
          (l) =>
            l.id === f.studentId &&
            (l.programmeId ?? l.qualificationId ?? l.curriculumId) === offeringId,
        ),
    );
    const annualTuition = peer?.tuition ?? deposit * 8;
    const acct: FeeAccount = {
      id: nextId("FA-", "feeAccounts"),
      tenantId: ctx.tenantId,
      studentId: id,
      academicYear: cal?.academicYear ?? "",
      currency: ctx.currency,
      displayCurrency: ctx.profile?.secondCurrency,
      registrationFee: 0,
      deposit: { amount: deposit, paid: !!a.deposit?.paid, source: `Admissions ${a.id}` },
      // Pro-rata: the share of the year's teaching periods they're here for.
      tuition: Math.round((annualTuition * Math.min(sumFactors, fullPeriods)) / fullPeriods),
      extras: [],
      discounts: [],
      plan: isSchool ? "Termly" : "Per semester",
      payers: [
        {
          name: a.guardianName ?? a.applicantName,
          type: a.guardianName ? "Parent / guardian" : "Self",
          sharePct: 100,
        },
      ],
      instalments: [],
    };
    // Even split per period, then weight each period by its pro-rata factor.
    const base = buildInstalments(acct, periods, DEMO_TODAY);
    acct.instalments = base.map((inst) => {
      const per = periods.find((p) => p.label === inst.label);
      const weighted = (inst.amount * periods.length * (per?.factor ?? 1)) / sumFactors;
      return { ...inst, amount: Math.round(weighted) };
    });
    addItem("feeAccounts", acct);

    const linkInstitution = linkedRow
      ? linkedRow.tenantId === ctx.tenantId
        ? "this institution"
        : (tenantNames[linkedRow.tenantId] ?? linkedRow.tenantId)
      : "";
    const linkNote = linkedRow
      ? `Enrolled ${fmtDate(DEMO_TODAY)} as local record ${id}, linked to existing 1StudentID ${linked} (${linkInstitution}).`
      : undefined;
    patchApp(
      a,
      {
        stage: "Enrolled",
        studentId: id,
        ...(linkNote ? { notes: a.notes ? `${a.notes}\n${linkNote}` : linkNote } : {}),
      },
      by,
      linked ? `Keeps 1StudentID ${linked}` : undefined,
    );
    if (linkedRow)
      logChange({
        tenantId: ctx.tenantId,
        entity: "learner",
        entityId: id,
        studentId: id,
        field: "linkedStudentId",
        to: linked,
        by,
        reason: `Same person as 1StudentID ${linked} at ${linkInstitution} (admissions ${a.id})`,
      });
    const proRata = periods.find((p) => p.factor < 1);
    toast.success(
      linked
        ? `${a.applicantName} enrolled — keeps 1StudentID ${linked}`
        : `1StudentID ${id} created for ${a.applicantName}`,
      {
        description: `${
          linkedRow ? `Local record ${id} linked to ${linked} (${linkInstitution}). ` : ""
        }Starts ${fmtDate(startDate)}${intake ? ` (${intake.name}, ${intake.kind.toLowerCase()})` : ""}. Fee account opened with the deposit credited${
          proRata ? ` — ${proRata.label} billed at ${Math.round(proRata.factor * 100)}%` : ""
        }.`,
      },
    );
  };

  /** Shared create path for quick enquiries and full applications. */
  const createApp = (
    draft: Omit<Application, "id" | "tenantId" | "createdAt">,
    opts: { dupOf?: Application; ack?: boolean },
  ) => {
    // Seeded ids are APP-<tenant 2 digits><nn>, e.g. APP-0901.
    const id = nextId(`APP-${ctx.tenantId.slice(3)}`, "applications");
    const app: Application = {
      ...draft,
      id,
      tenantId: ctx.tenantId,
      createdAt: DEMO_TODAY,
      followUps: draft.followUps?.map((f, i) => ({ ...f, id: f.id || `${id}-F${i + 1}` })),
    };
    if (opts.dupOf) {
      const note = `Duplicate of ${opts.dupOf.id} — logged on capture.`;
      app.duplicateOf = opts.dupOf.id;
      app.stage = "Withdrawn";
      app.notes = app.notes ? `${app.notes}\n${note}` : note;
      app.followUps = [];
    }
    addItem("applications", app);
    logChange({
      tenantId: ctx.tenantId,
      entity: "application",
      entityId: id,
      studentId: app.matchedStudentId,
      field: "stage",
      to: app.stage,
      by,
      reason: opts.dupOf
        ? `Duplicate of ${opts.dupOf.id}`
        : `New ${app.stage === "Enquiry" ? "enquiry" : "application"} via ${app.channel ?? app.source}`,
    });
    if (app.matchedStudentId)
      logChange({
        tenantId: ctx.tenantId,
        entity: "application",
        entityId: id,
        studentId: app.matchedStudentId,
        field: "matchedStudentId",
        to: app.matchedStudentId,
        by,
        reason: "Matched an existing 1StudentID on capture",
      });

    if (opts.dupOf) {
      // Re-enquiry: the counsellor on the original record calls back.
      const p = opts.dupOf;
      updateItem("applications", (x) => x.id === p.id, {
        followUps: [
          ...(p.followUps ?? []),
          {
            id: nextFollowUpId(p),
            due: DEMO_TODAY,
            note: `Enquired again via ${app.channel ?? app.source} — call back`,
            by: p.owner,
          },
        ],
      });
      notify({
        tenantId: ctx.tenantId,
        channel: "App",
        to: p.owner,
        subject: `${app.applicantName} enquired again (${app.channel ?? app.source})`,
        body: `Logged as a duplicate of ${p.id}. A call-back is due today.`,
        source: "Admissions · enquiry",
        relatedId: p.id,
      });
      toast.success(`Logged as a duplicate of ${p.id}`, {
        description: `${p.owner} has a call-back due today.`,
      });
      return;
    }

    notify({
      tenantId: ctx.tenantId,
      channel: "App",
      to: app.owner,
      subject: `New ${app.stage === "Enquiry" ? "enquiry" : "application"}: ${app.applicantName} — ${app.target}`,
      body: `${app.channel ?? app.source}${app.branch ? ` · ${app.branch}` : ""} · intake ${app.intake}${
        app.phone ? ` · ${app.phone}` : ""
      }`,
      source: "Admissions · enquiry",
      relatedId: id,
    });
    if (opts.ack) {
      const subject = `Thanks for your enquiry — ${ctx.tenantName}`;
      const body = `Hi ${app.applicantName.split(" ")[0]}, thanks for your interest in ${app.target} (${app.intake}). ${app.owner} will contact you within one working day.`;
      if (app.email)
        notify({
          tenantId: ctx.tenantId,
          channel: "Email",
          to: `${app.applicantName} (${app.email})`,
          subject,
          body,
          source: "Admissions · enquiry",
          relatedId: id,
        });
      if (app.phone)
        notify({
          tenantId: ctx.tenantId,
          channel: "SMS",
          to: `${app.applicantName} (${app.phone})`,
          subject,
          body,
          source: "Admissions · enquiry",
          relatedId: id,
        });
    }
    toast.success(`${id} created for ${app.applicantName}`, {
      description: `Assigned to ${app.owner}${
        opts.ack ? " — acknowledgement sent to the enquirer" : ""
      }.`,
    });
  };

  const assigned = autoAssign(counsellors, rota?.onDuty, apps);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admissions"
        subtitle={
          isSchool
            ? "Enquiry → application → entrance test / interview → offer → deposit → enrolled, with waitlists for oversubscribed year groups."
            : "Enquiry → application → assessment → offer (conditional / unconditional) → deposit → enrolled, including visa-sponsored applicants."
        }
        actions={
          <>
            <Button onClick={() => setQuickOpen(true)}>
              <PhoneCall className="h-4 w-4" /> Quick enquiry
            </Button>
            <Button variant="outline" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> New application
            </Button>
          </>
        }
      />
      <PackContextBar />

      <div className="rounded-lg border bg-muted/30 px-4 py-2.5 text-xs flex flex-wrap items-center gap-2">
        <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>
          Leads and campaigns live in <span className="font-medium">Marketing &amp; CRM</span>. An
          enquiry with source <Badge tone="info">CRM lead</Badge> is the hand-off — the admissions
          pipeline starts here, so there's no second lead pipeline.
        </span>
        <Link
          to="/app/marketing"
          className="ml-auto text-primary hover:underline inline-flex items-center gap-1"
        >
          Open CRM <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard
          label="Open applications"
          value={active.length}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Follow-ups due"
          value={dueFollowUps.length}
          hint="overdue or today"
          accent={dueFollowUps.length ? "destructive" : "success"}
          icon={<BellRing className="h-4 w-4" />}
        />
        <StatCard
          label="Offers outstanding"
          value={offers.length}
          accent="info"
          icon={<DoorOpen className="h-4 w-4" />}
        />
        <StatCard
          label="Deposits received"
          value={money(depositTotal, ctx.currency)}
          hint={`${deposits.length} applicants`}
          accent="success"
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Waitlist"
          value={waitlist.length}
          accent="warning"
          icon={<Hourglass className="h-4 w-4" />}
        />
        <StatCard
          label="Conversion"
          value={`${conversion}%`}
          hint="of decided applications"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <Tabs
        tabs={[
          { id: "board", label: "Pipeline" },
          { id: "table", label: "All applications", count: apps.length },
          { id: "followups", label: "My follow-ups", count: dueFollowUps.length },
          { id: "duplicates", label: "Possible duplicates", count: dupCount },
          { id: "targets", label: "Targets & funnel" },
          { id: "waitlist", label: "Waitlist", count: waitlist.length },
          { id: "intakes", label: "Intakes", count: myIntakes.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "board" && (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
          {[...ADMISSION_PIPELINE, ...SIDE_LANES].map((stage) => {
            const list = apps.filter((a) => a.stage === stage);
            const side = SIDE_LANES.includes(stage);
            return (
              <div
                key={stage}
                className={cn(
                  "w-60 shrink-0 rounded-xl border p-2.5 space-y-2",
                  side ? "bg-muted/20 border-dashed" : "bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stage}
                  </div>
                  <span className="text-[11px] rounded-full bg-background border px-1.5">
                    {list.length}
                  </span>
                </div>
                {list.length === 0 && (
                  <div className="text-[11px] text-muted-foreground text-center py-4">—</div>
                )}
                {list.map((a) => (
                  <AppCard key={a.id} a={a} onOpen={() => setOpenId(a.id)} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === "table" && (
        <Section>
          <DataTable
            columns={[
              { key: "applicantName", label: "Applicant" },
              { key: "target", label: isSchool ? "Year group · curriculum" : "Programme" },
              { key: "intake", label: "Intake" },
              { key: "channel", label: "Channel" },
              { key: "owner", label: "Counsellor" },
              { key: "stage", label: "Stage" },
              { key: "docs", label: "Documents" },
              { key: "_actions", label: "" },
            ]}
            rows={apps}
            renderCell={(a: Application, key) => {
              if (key === "applicantName")
                return (
                  <div>
                    <div className="font-medium">{a.applicantName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {a.nationality} {a.visaRequired && "· visa required"}
                      {a.matchedStudentId && ` · 1StudentID ${a.matchedStudentId}`}
                      {a.duplicateOf && ` · duplicate of ${a.duplicateOf}`}
                    </div>
                  </div>
                );
              if (key === "channel")
                return (
                  <div className="text-xs">
                    <Badge tone={a.source === "CRM lead" ? "info" : "muted"}>
                      {a.channel ?? a.source}
                    </Badge>
                    {a.branch && (
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        {a.branch}
                      </span>
                    )}
                  </div>
                );
              if (key === "stage") return <StatusPill status={a.stage} />;
              if (key === "docs") return <DocsCount a={a} />;
              if (key === "intake") {
                const i = myIntakes.find((x) => x.name === a.intake);
                return (
                  <span className="text-xs">
                    {a.intake}
                    {i && (
                      <span className="block text-[11px] text-muted-foreground">
                        {intakeStatus(i)} · starts {fmtDate(startDateFor(i))}
                      </span>
                    )}
                  </span>
                );
              }
              if (key === "_actions")
                return (
                  <Button size="sm" variant="outline" onClick={() => setOpenId(a.id)}>
                    Open
                  </Button>
                );
              return String((a as unknown as Record<string, unknown>)[key] ?? "");
            }}
          />
        </Section>
      )}

      {tab === "followups" && (
        <FollowUpsTab
          apps={apps}
          counsellors={counsellors}
          me={by}
          onOpen={setOpenId}
          tenantId={ctx.tenantId}
        />
      )}

      {tab === "duplicates" && (
        <DuplicatesTab
          apps={apps}
          learners={learners}
          tenantNames={tenantNames}
          tenantId={ctx.tenantId}
          by={by}
          onOpen={setOpenId}
        />
      )}

      {tab === "targets" && (
        <TargetsTab
          apps={apps}
          intakes={myIntakes}
          offerings={offerings}
          isSchool={isSchool}
          counsellors={counsellors}
          rota={rota}
          branches={branches}
          tenantId={ctx.tenantId}
          by={by}
        />
      )}

      {tab === "intakes" && <IntakesBoard intakes={myIntakes} apps={live} />}

      {tab === "waitlist" && (
        <Section
          title="Waitlist"
          description={
            isSchool
              ? "Oversubscribed year groups — ranked by entrance-test score, then application date. Offer a place when one frees up."
              : "Applicants held for a place on a full programme or intake."
          }
        >
          <DataTable
            columns={[
              { key: "rank", label: "#" },
              { key: "applicantName", label: "Applicant" },
              { key: "target", label: "Applying for" },
              { key: "score", label: "Assessment" },
              { key: "createdAt", label: "Applied" },
              { key: "_actions", label: "" },
            ]}
            rows={[...waitlist]
              .sort(
                (a, b) =>
                  (b.assessment?.score ?? 0) - (a.assessment?.score ?? 0) ||
                  a.createdAt.localeCompare(b.createdAt),
              )
              .map((a, i) => ({ ...a, rank: i + 1 }))}
            renderCell={(a: Application & { rank: number }, key) => {
              if (key === "score")
                return a.assessment?.score !== undefined
                  ? `${a.assessment.score}% (${a.assessment.outcome ?? "—"})`
                  : "—";
              if (key === "_actions")
                return (
                  <Button
                    size="sm"
                    onClick={() => {
                      patchApp(
                        a,
                        {
                          stage: "Offer",
                          offer: { type: "Unconditional", issuedAt: DEMO_TODAY },
                          deposit: a.deposit ?? { amount: defaultDeposit(ctx.type), paid: false },
                        },
                        by,
                        "Place freed up on the waitlist",
                      );
                      toast.success(`Place offered to ${a.applicantName}`);
                    }}
                  >
                    Offer place
                  </Button>
                );
              return String((a as unknown as Record<string, unknown>)[key] ?? "");
            }}
            emptyText="Nobody on the waitlist"
          />
        </Section>
      )}

      {openApp && (
        <ApplicationDialog
          key={openApp.id}
          a={openApp}
          onClose={() => setOpenId(null)}
          onEnrol={() => enrol(openApp)}
          onOpen={setOpenId}
          currency={ctx.currency}
          region={ctx.region.code}
          isSchool={isSchool}
          tenantApps={apps}
          learners={learners}
          tenantNames={tenantNames}
          counsellors={counsellors}
          branches={branches}
          by={by}
        />
      )}

      <QuickEnquiryDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        isSchool={isSchool}
        offerings={offerings}
        region={ctx.region.code}
        type={ctx.type}
        counsellors={counsellors}
        assigned={assigned}
        branches={branches}
        tenantApps={apps}
        learners={learners}
        tenantNames={tenantNames}
        tenantId={ctx.tenantId}
        onOpenExisting={(id) => {
          setQuickOpen(false);
          setOpenId(id);
        }}
        onCreate={(d, dupOf) => createApp(d, { dupOf, ack: true })}
      />

      <NewApplicationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        isSchool={isSchool}
        curricula={myCurricula}
        programmes={myProgrammes.map((p) => ({ id: p.id, label: programmeLabel(p) }))}
        qualifications={myQuals.map((q) => ({ id: q.id, label: `${q.code} ${q.title}` }))}
        region={ctx.region.code}
        type={ctx.type}
        tenantApps={apps}
        learners={learners}
        tenantNames={tenantNames}
        onOpenExisting={(id) => {
          setNewOpen(false);
          setOpenId(id);
        }}
        onCreate={(d, dupOf) => createApp({ ...d, owner: assigned.name }, { dupOf })}
      />
    </div>
  );
}

function defaultDeposit(type: string) {
  return type === "school" ? 5000 : type === "university" ? 4000 : 1500;
}

function DocsCount({ a }: { a: Application }) {
  const missing = a.documents.filter((d) => d.status === "Missing").length;
  const verified = a.documents.filter((d) => d.status === "Verified").length;
  if (missing)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <FileWarning className="h-3.5 w-3.5" /> {missing} missing
      </span>
    );
  return (
    <span className="text-xs text-muted-foreground">
      {verified}/{a.documents.length} verified
    </span>
  );
}

function AppCard({ a, onOpen }: { a: Application; onOpen: () => void }) {
  const overdue = (a.followUps ?? []).some((f) => !f.done && f.due < DEMO_TODAY);
  return (
    <button
      onClick={onOpen}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-2.5 hover:border-primary/50 hover:shadow-soft transition-all",
        a.duplicateOf && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-tight">{a.applicantName}</div>
        <span className="flex items-center gap-1 shrink-0">
          {a.matchedStudentId && (
            <Fingerprint
              className="h-3.5 w-3.5 text-primary"
              aria-label={`1StudentID ${a.matchedStudentId}`}
            />
          )}
          {a.visaRequired && <Plane className="h-3.5 w-3.5 text-info" aria-label="Visa required" />}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.target}</div>
      <div className="flex flex-wrap items-center gap-1 mt-2">
        <Badge tone={a.source === "CRM lead" ? "info" : "muted"}>{a.channel ?? a.source}</Badge>
        <span className="text-[10px] text-muted-foreground">{a.intake}</span>
        {a.duplicateOf && <Badge tone="warning">Duplicate</Badge>}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <DocsCount a={a} />
        {a.offer && <Badge tone="default">{a.offer.type}</Badge>}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="truncate">{a.owner}</span>
        {overdue && <span className="text-destructive font-medium">Follow-up overdue</span>}
      </div>
    </button>
  );
}

/* ── Duplicate panel (capture, new application, application record) ────── */

function DuplicatePanel({
  matches,
  tenantId,
  tenantNames,
  linkedId,
  onOpen,
  onMarkDuplicate,
  markLabel = "Mark as duplicate",
  onLink,
}: {
  matches: DuplicateMatch[];
  tenantId: string;
  tenantNames: Record<string, string>;
  linkedId?: string;
  onOpen?: (appId: string) => void;
  onMarkDuplicate?: (a: Application) => void;
  markLabel?: string;
  onLink?: (l: Learner) => void;
}) {
  if (!matches.length) return null;
  return (
    <div className="sm:col-span-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs space-y-2">
      <div className="flex items-center gap-1.5 font-semibold">
        <AlertTriangle className="h-3.5 w-3.5 text-warning-foreground" />
        Possible duplicate{matches.length > 1 ? "s" : ""}
      </div>
      {matches.map((m) =>
        m.kind === "application" ? (
          <div
            key={m.app.id}
            className="flex flex-wrap items-center gap-2 rounded-md bg-background/80 border px-2.5 py-2"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {m.app.applicantName} · {m.app.id}
              </div>
              <div className="text-muted-foreground">
                {m.app.stage} · {m.app.target} · {m.app.channel ?? m.app.source}{" "}
                {fmtDate(m.app.createdAt)} · {m.app.owner}
                {m.app.duplicateOf && ` · already a duplicate of ${m.app.duplicateOf}`}
              </div>
              <ReasonBadges reasons={m.reasons} />
            </div>
            <div className="flex gap-1.5">
              {onOpen && (
                <Button type="button" size="sm" variant="outline" onClick={() => onOpen(m.app.id)}>
                  Open
                </Button>
              )}
              {onMarkDuplicate && !m.app.duplicateOf && (
                <Button type="button" size="sm" onClick={() => onMarkDuplicate(m.app)}>
                  {markLabel}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div
            key={m.learner.id}
            className="flex flex-wrap items-center gap-2 rounded-md bg-background/80 border px-2.5 py-2"
          >
            <Fingerprint className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                Existing 1StudentID {m.learner.id} at{" "}
                {m.learner.tenantId === tenantId
                  ? "this institution"
                  : (tenantNames[m.learner.tenantId] ?? m.learner.tenantId)}
              </div>
              <div className="text-muted-foreground">
                {m.learner.name} · born {m.learner.dob.slice(0, 4)} · {maskEmail(m.learner.email)}
                {Object.entries(m.learner.officialIds)
                  .slice(0, 2)
                  .map(([k, v]) => ` · ${idLabel(k)} ${maskId(v)}`)
                  .join("")}
              </div>
              <ReasonBadges reasons={m.reasons} />
            </div>
            {onLink &&
              (linkedId === m.learner.id ? (
                <Badge tone="success">Linked — keeps {m.learner.id}</Badge>
              ) : (
                <Button type="button" size="sm" onClick={() => onLink(m.learner)}>
                  <Link2 className="h-3.5 w-3.5" /> Link
                </Button>
              ))}
          </div>
        ),
      )}
    </div>
  );
}

function ReasonBadges({ reasons }: { reasons: string[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reasons.map((r) => (
        <Badge key={r} tone="warning">
          {r}
        </Badge>
      ))}
    </div>
  );
}

/* ── Quick enquiry (phone-friendly) ──────────────────────────────────────── */

function QuickEnquiryDialog({
  open,
  onOpenChange,
  isSchool,
  offerings,
  region,
  type,
  counsellors,
  assigned,
  branches,
  tenantApps,
  learners,
  tenantNames,
  tenantId,
  onOpenExisting,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isSchool: boolean;
  offerings: Offering[];
  region: RegionCode;
  type: InstitutionType;
  counsellors: string[];
  assigned: { name: string; why: string };
  branches: string[];
  tenantApps: Application[];
  learners: Learner[];
  tenantNames: Record<string, string>;
  tenantId: string;
  onOpenExisting: (id: string) => void;
  onCreate: (d: Omit<Application, "id" | "tenantId" | "createdAt">, dupOf?: Application) => void;
}) {
  const dial = DIAL_CODES[region] ?? "+";
  const ids = idTypeOptions(region, type);
  const allIntakes = useCollection("intakes");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"F" | "M">("F");
  const [guardian, setGuardian] = useState("");
  const [idType, setIdType] = useState(ids.def);
  const [idValue, setIdValue] = useState("");
  const [offeringKey, setOfferingKey] = useState("");
  const [intake, setIntake] = useState("");
  const [channel, setChannel] = useState<EnquiryChannel>("Walk-in");
  const [branch, setBranch] = useState(branches[0] ?? "");
  const [owner, setOwner] = useState("");
  const [note, setNote] = useState("");
  const [linked, setLinked] = useState<string | undefined>();

  const offering = offerings.find((o) => o.key === offeringKey) ?? offerings[0];
  const intakeOptions = intakesFor(allIntakes, tenantId, offering?.scopeId)
    .filter((i) => intakeStatus(i) !== "Started")
    .sort((x, y) => x.start.localeCompare(y.start));
  const chosen =
    intakeOptions.find((i) => i.name === intake) ??
    intakeOptions.find((i) => intakeStatus(i) === "Open") ??
    intakeOptions[0];

  const fullPhone = withDialCode(phone, dial);
  const officialIds = idValue.trim() ? { [idType]: idValue.trim() } : undefined;
  const matches = useMemo(
    () =>
      name.trim().length < 3 && !email && !phone && !idValue
        ? []
        : findDuplicates({ name, dob, email, phone: fullPhone, officialIds }, tenantApps, learners),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, dob, email, fullPhone, idType, idValue, tenantApps, learners],
  );

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setDob("");
    setGuardian("");
    setIdValue("");
    setNote("");
    setOwner("");
    setLinked(undefined);
  };

  const submit = (dupOf?: Application) => {
    if (!name.trim()) return toast.error("Name is required");
    if (!phone.trim() && !email.trim()) return toast.error("Add a phone number or an email");
    if (!offering) return toast.error("No programmes or year groups set up yet");
    if (!chosen)
      return toast.error("No open intake for this choice — add one in Institution Profile");
    const target = isSchool ? `${offering.yearGroup} · ${offering.curriculumName}` : offering.label;
    onCreate(
      {
        applicantName: name.trim(),
        gender,
        dob,
        email: email.trim(),
        phone: fullPhone,
        guardianName: guardian.trim() || undefined,
        nationality: "—",
        source: CHANNEL_SOURCE[channel],
        channel,
        branch: branch || undefined,
        target,
        curriculumId: offering.curriculumId,
        yearGroup: offering.yearGroup,
        programmeId: offering.programmeId,
        qualificationId: offering.qualificationId,
        intake: chosen.name,
        stage: "Enquiry",
        visaRequired: false,
        documents: (isSchool
          ? ["Birth certificate", "Passport & residence visa", "Previous school reports"]
          : ["Passport", "Academic transcripts", "Personal statement"]
        ).map((n) => ({ name: n, status: "Missing" as const })),
        owner: owner || assigned.name,
        notes: note.trim() || undefined,
        officialIds,
        matchedStudentId: linked,
        followUps: [
          {
            id: "",
            due: DEMO_TODAY,
            note: "First contact — call back within one working day",
            by: owner || assigned.name,
          },
        ],
      },
      dupOf,
    );
    reset();
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
      title="Quick enquiry"
      description="Takes a minute at the front desk or on the phone. We check for duplicates as you type."
      onSubmit={() => submit()}
      submitLabel="Save enquiry"
    >
      <Field label="Name" required className="sm:col-span-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isSchool ? "Child's full name" : "Full name"}
          autoComplete="off"
        />
      </Field>
      <Field label="Mobile" hint={dial !== "+" ? `${dial} added automatically` : undefined}>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-2.5 text-sm text-muted-foreground">
            {dial}
          </span>
          <TextInput
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-l-none"
          />
        </div>
      </Field>
      <Field label="Email">
        <TextInput
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="ID type">
        <Select value={idType} onChange={(e) => setIdType(e.target.value)} options={ids.options} />
      </Field>
      <Field label="ID number" hint={ID_FIELDS[idType]?.hint}>
        <TextInput value={idValue} onChange={(e) => setIdValue(e.target.value)} />
      </Field>
      <Field label="Date of birth" hint="Optional — helps the duplicate check">
        <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
      </Field>
      <Field label="Gender">
        <Select
          value={gender}
          onChange={(e) => setGender(e.target.value as "F" | "M")}
          options={[
            { value: "F", label: "Female" },
            { value: "M", label: "Male" },
          ]}
        />
      </Field>
      {isSchool && (
        <Field label="Parent / guardian" className="sm:col-span-2">
          <TextInput value={guardian} onChange={(e) => setGuardian(e.target.value)} />
        </Field>
      )}

      <DuplicatePanel
        matches={matches}
        tenantId={tenantId}
        tenantNames={tenantNames}
        linkedId={linked}
        onOpen={onOpenExisting}
        onMarkDuplicate={(a) => submit(a)}
        markLabel="Log as duplicate"
        onLink={(l) => {
          setLinked(l.id);
          toast.success(`Will keep 1StudentID ${l.id}`);
        }}
      />

      <Field
        label={isSchool ? "Year group" : "Interested in"}
        className="sm:col-span-2"
        hint={offerings.length ? undefined : "Set up programmes or curricula first"}
      >
        <Select
          value={offering?.key ?? ""}
          onChange={(e) => {
            setOfferingKey(e.target.value);
            setIntake("");
          }}
          options={
            offerings.length
              ? offerings.map((o) => ({ value: o.key, label: o.label }))
              : [{ value: "", label: "Nothing set up yet" }]
          }
        />
      </Field>
      <Field label="Intake">
        <Select
          value={chosen?.name ?? ""}
          onChange={(e) => setIntake(e.target.value)}
          options={
            intakeOptions.length
              ? intakeOptions.map((i) => ({ value: i.name, label: i.name }))
              : [{ value: "", label: "No open intake" }]
          }
        />
      </Field>
      <Field label="Channel">
        <Select
          value={channel}
          onChange={(e) => setChannel(e.target.value as EnquiryChannel)}
          options={ENQUIRY_CHANNELS.map((c) => ({ value: c, label: c }))}
        />
      </Field>
      {branches.length > 0 && (
        <Field label="Branch">
          <Select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            options={branches.map((b) => ({ value: b, label: b }))}
          />
        </Field>
      )}
      <Field label="Counsellor" hint={owner ? "Assigned by you" : `Auto: ${assigned.why}`}>
        <Select
          value={owner || assigned.name}
          onChange={(e) => setOwner(e.target.value)}
          options={counsellors.map((c) => ({ value: c, label: c }))}
        />
      </Field>
      <Field label="Note" className="sm:col-span-2">
        <TextArea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[60px]"
          placeholder="What did they ask about?"
        />
      </Field>
    </FormDialog>
  );
}

/* ── Application record ──────────────────────────────────────────────────── */

const NEXT: Partial<Record<AdmissionStage, AdmissionStage>> = {
  Enquiry: "Applied",
  Applied: "Assessment",
  Assessment: "Offer",
  Offer: "Accepted",
  Accepted: "Deposit paid",
};

function ApplicationDialog({
  a,
  onClose,
  onEnrol,
  onOpen,
  currency,
  region,
  isSchool,
  tenantApps,
  learners,
  tenantNames,
  counsellors,
  branches,
  by,
}: {
  a: Application;
  onClose: () => void;
  onEnrol: () => void;
  onOpen: (id: string) => void;
  currency: string;
  region: string;
  isSchool: boolean;
  tenantApps: Application[];
  learners: Learner[];
  tenantNames: Record<string, string>;
  counsellors: string[];
  branches: string[];
  by: string;
}) {
  const patch = (p: Partial<Application>, reason?: string) => patchApp(a, p, by, reason);
  const [kind, setKind] = useState<NonNullable<Application["assessment"]>["kind"]>(
    a.assessment?.kind ?? (isSchool ? "Entrance test" : "Interview"),
  );
  const [date, setDate] = useState(a.assessment?.date ?? DEMO_TODAY);
  const [score, setScore] = useState(a.assessment?.score?.toString() ?? "");
  const [outcome, setOutcome] = useState<string>(a.assessment?.outcome ?? "");
  const [offerType, setOfferType] = useState<"Conditional" | "Unconditional">(
    a.offer?.type ?? "Conditional",
  );
  const [conditions, setConditions] = useState(a.offer?.conditions ?? "");
  const [depositAmt, setDepositAmt] = useState(
    String(
      a.deposit
        ? fromLedger(a.deposit.amount, currency)
        : defaultDeposit(isSchool ? "school" : "university"),
    ),
  );

  const matches = useMemo(
    () => (a.duplicateOf ? [] : findDuplicates(probeOf(a), tenantApps, learners, a)),
    [a, tenantApps, learners],
  );
  const linkedLearner = a.matchedStudentId
    ? learners.find((l) => l.id === a.matchedStudentId)
    : undefined;
  const institutionOf = (l: Learner) =>
    l.tenantId === a.tenantId ? "this institution" : (tenantNames[l.tenantId] ?? l.tenantId);

  const next = NEXT[a.stage];
  const docCycle: Record<string, Application["documents"][number]["status"]> = {
    Missing: "Uploaded",
    Uploaded: "Verified",
    Verified: "Missing",
  };
  const enrolable =
    !a.duplicateOf &&
    (a.stage === "Deposit paid" || (a.stage === "Accepted" && a.deposit?.amount === 0));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {a.applicantName} <StatusPill status={a.stage} />
            {a.matchedStudentId && <Badge tone="default">1StudentID {a.matchedStudentId}</Badge>}
            {a.duplicateOf && <Badge tone="warning">Duplicate of {a.duplicateOf}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {a.id} · {a.target} · intake {a.intake} · via {a.channel ?? a.source}
            {a.branch && ` · ${a.branch}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <Info k="Date of birth" v={a.dob ? fmtDate(a.dob) : "—"} />
          <Info k="Nationality" v={a.nationality} />
          <Info k="Email" v={a.email || "—"} />
          <Info k="Phone" v={a.phone ?? "—"} />
          {a.guardianName && <Info k="Parent / guardian" v={a.guardianName} />}
          {Object.entries(a.officialIds ?? {}).map(([k, v]) => (
            <Info key={k} k={idLabel(k)} v={v} />
          ))}
          <Info k="Created" v={fmtDate(a.createdAt)} />
          <div className="flex justify-between items-center gap-3 border-b border-dashed py-0.5">
            <span className="text-muted-foreground">Counsellor</span>
            <select
              className="text-xs font-medium bg-transparent text-right outline-none"
              value={a.owner}
              onChange={(e) => {
                patch({ owner: e.target.value }, "Reassigned");
                notify({
                  tenantId: a.tenantId,
                  channel: "App",
                  to: e.target.value,
                  subject: `${a.applicantName} assigned to you`,
                  body: `${a.id} · ${a.target} · ${a.stage}`,
                  source: "Admissions · enquiry",
                  relatedId: a.id,
                });
                toast.success(`Assigned to ${e.target.value}`);
              }}
            >
              {[...new Set([a.owner, ...counsellors])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {branches.length > 0 && (
            <div className="flex justify-between items-center gap-3 border-b border-dashed py-0.5">
              <span className="text-muted-foreground">Branch</span>
              <select
                className="text-xs font-medium bg-transparent text-right outline-none"
                value={a.branch ?? ""}
                onChange={(e) => patch({ branch: e.target.value || undefined })}
              >
                <option value="">—</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {a.notes && (
          <p className="text-xs rounded-md bg-muted/40 px-3 py-2 whitespace-pre-line">{a.notes}</p>
        )}

        {a.duplicateOf ? (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs flex items-center gap-2">
            <Copy className="h-3.5 w-3.5" />
            Closed as a duplicate of {a.duplicateOf}.
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => onOpen(a.duplicateOf!)}
            >
              Open {a.duplicateOf}
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2">
            <DuplicatePanel
              matches={matches}
              tenantId={a.tenantId}
              tenantNames={tenantNames}
              linkedId={a.matchedStudentId}
              onOpen={onOpen}
              onMarkDuplicate={
                a.studentId
                  ? undefined
                  : (other) => {
                      markDuplicate(a, other, by);
                      toast.success(`${a.id} closed as a duplicate of ${other.id}`, {
                        description: "Open follow-ups moved to the record we keep.",
                      });
                    }
              }
              markLabel="Close this as duplicate"
              onLink={a.studentId ? undefined : (l) => linkStudent(a, l, institutionOf(l), by)}
            />
          </div>
        )}

        <FollowUpsPanel a={a} by={by} />

        <IntakePanel a={a} isSchool={isSchool} />

        {a.visaRequired && (
          <div className="rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs flex gap-2">
            <Plane className="h-3.5 w-3.5 text-info mt-0.5 shrink-0" />
            <span>
              <span className="font-medium">Visa required.</span> {visaDocLabel(region)}.
            </span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold mb-2">Documents</div>
            <ul className="space-y-1.5">
              {a.documents.map((d, i) => (
                <li key={d.name} className="flex items-center justify-between gap-2 text-xs">
                  <span>{d.name}</span>
                  <button
                    title="Click to change status"
                    onClick={() =>
                      patch({
                        documents: a.documents.map((x, j) =>
                          j === i ? { ...x, status: docCycle[x.status] } : x,
                        ),
                      })
                    }
                  >
                    <Badge
                      tone={
                        d.status === "Verified"
                          ? "success"
                          : d.status === "Uploaded"
                            ? "info"
                            : "destructive"
                      }
                    >
                      {d.status}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold">Assessment</div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
                options={["Entrance test", "Interview", "Portfolio", "Placement test"].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <NumberInput
                placeholder="Score %"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
              <Select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                options={[
                  { value: "", label: "Outcome…" },
                  ...["Pass", "Borderline", "Fail"].map((v) => ({ value: v, label: v })),
                ]}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                patch(
                  {
                    assessment: {
                      kind,
                      date,
                      score: score ? Number(score) : undefined,
                      outcome: (outcome || undefined) as NonNullable<
                        Application["assessment"]
                      >["outcome"],
                    },
                    stage: ["Enquiry", "Applied"].includes(a.stage) ? "Assessment" : a.stage,
                  },
                  "Assessment saved",
                );
                toast.success("Assessment saved");
              }}
            >
              Save assessment
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold">Offer</div>
            {a.offer ? (
              <div className="text-xs rounded-md border px-3 py-2">
                <Badge>{a.offer.type}</Badge> issued {a.offer.issuedAt}
                {a.offer.conditions && (
                  <div className="mt-1 text-muted-foreground">{a.offer.conditions}</div>
                )}
              </div>
            ) : (
              <>
                <Select
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value as typeof offerType)}
                  options={[
                    { value: "Conditional", label: "Conditional" },
                    { value: "Unconditional", label: "Unconditional" },
                  ]}
                />
                {offerType === "Conditional" && (
                  <TextArea
                    placeholder={
                      isSchool
                        ? "e.g. Satisfactory reference from current school"
                        : "e.g. AAB at A Level incl. Mathematics; IELTS 6.5"
                    }
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    className="min-h-[60px]"
                  />
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    patch(
                      {
                        offer: {
                          type: offerType,
                          conditions: offerType === "Conditional" ? conditions : undefined,
                          issuedAt: DEMO_TODAY,
                        },
                        stage: "Offer",
                        deposit: a.deposit ?? {
                          amount: toLedger(Number(depositAmt) || 0, currency),
                          paid: false,
                        },
                      },
                      `${offerType} offer`,
                    );
                    toast.success(`${offerType} offer issued to ${a.applicantName}`);
                  }}
                >
                  Issue offer
                </Button>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold">Deposit ({displaySymbol()})</div>
            {a.deposit?.paid ? (
              <div className="text-xs rounded-md border border-success/30 bg-success/10 px-3 py-2">
                {money(a.deposit.amount, currency)} received {a.deposit.paidAt}
              </div>
            ) : (
              <div className="flex gap-2">
                <NumberInput value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    const amount = toLedger(Number(depositAmt) || 0, currency);
                    patch(
                      {
                        deposit: { amount, paid: true, paidAt: DEMO_TODAY },
                        stage: "Deposit paid",
                      },
                      "Deposit received",
                    );
                    toast.success(`Deposit of ${money(amount, currency)} recorded`, {
                      description:
                        "It becomes a credit on the student's fee account once enrolled.",
                    });
                  }}
                >
                  Mark paid
                </Button>
              </div>
            )}
          </div>
        </div>

        {a.matchedStudentId && !a.studentId && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs flex gap-2">
            <Fingerprint className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span>
              <span className="font-medium">Keeps 1StudentID {a.matchedStudentId}</span>
              {linkedLearner
                ? ` — already a learner at ${institutionOf(linkedLearner)}. Enrolling adds a local record here linked to ${a.matchedStudentId}; no second ${a.matchedStudentId} is created.`
                : " — enrolling creates the learner record with this id."}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          {next && !a.duplicateOf && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                patch({ stage: next });
                toast.success(`Moved to ${next}`);
              }}
            >
              Advance to {next} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {!["Waitlist", ...CLOSED].includes(a.stage) && (
            <Button size="sm" variant="ghost" onClick={() => patch({ stage: "Waitlist" })}>
              <Hourglass className="h-3.5 w-3.5" /> Waitlist
            </Button>
          )}
          {!CLOSED.includes(a.stage) && (
            <>
              <Button size="sm" variant="ghost" onClick={() => patch({ stage: "Declined" })}>
                Decline
              </Button>
              <Button size="sm" variant="ghost" onClick={() => patch({ stage: "Withdrawn" })}>
                Withdrawn
              </Button>
            </>
          )}
          <div className="ml-auto">
            {a.studentId ? (
              <Badge tone="success">
                Enrolled as {a.studentId}
                {a.matchedStudentId && a.matchedStudentId !== a.studentId
                  ? ` · linked to ${a.matchedStudentId}`
                  : ""}
              </Badge>
            ) : (
              <Button
                size="sm"
                disabled={!enrolable}
                onClick={onEnrol}
                title={enrolable ? "" : "Needs the deposit first"}
              >
                <UserPlus className="h-4 w-4" />{" "}
                {a.matchedStudentId
                  ? `Enrol — keeps ${a.matchedStudentId}`
                  : "Enrol & create 1StudentID"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FollowUpsPanel({ a, by }: { a: Application; by: string }) {
  const [due, setDue] = useState(addDays(DEMO_TODAY, 2));
  const [note, setNote] = useState("");
  const list = [...(a.followUps ?? [])].sort(
    (x, y) => Number(!!x.done) - Number(!!y.done) || x.due.localeCompare(y.due),
  );
  const toggle = (id: string) =>
    updateItem("applications", (x) => x.id === a.id, {
      followUps: (a.followUps ?? []).map((f) =>
        f.id === id ? { ...f, done: f.done ? undefined : DEMO_TODAY } : f,
      ),
    });
  const add = () => {
    if (!note.trim()) return toast.error("Add a note for the follow-up");
    updateItem("applications", (x) => x.id === a.id, {
      followUps: [
        ...(a.followUps ?? []),
        { id: nextFollowUpId(a), due, note: note.trim(), by: a.owner },
      ],
    });
    logChange({
      tenantId: a.tenantId,
      entity: "application",
      entityId: a.id,
      field: "followUp",
      to: `${due}: ${note.trim()}`,
      by,
    });
    setNote("");
    toast.success(`Follow-up set for ${fmtDate(due)}`);
  };
  return (
    <div className="rounded-lg border p-3 text-xs space-y-2">
      <div className="font-semibold flex items-center gap-1.5">
        <BellRing className="h-3.5 w-3.5" /> Follow-ups
      </div>
      {list.length === 0 && <div className="text-muted-foreground">No follow-ups yet.</div>}
      <ul className="space-y-1">
        {list.map((f) => {
          const tone = f.done
            ? "muted"
            : f.due < DEMO_TODAY
              ? "destructive"
              : f.due === DEMO_TODAY
                ? "warning"
                : "info";
          return (
            <li key={f.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!f.done}
                onChange={() => toggle(f.id)}
                aria-label="Done"
              />
              <Badge tone={tone}>{fmtDate(f.due)}</Badge>
              <span className={cn("flex-1", f.done && "line-through text-muted-foreground")}>
                {f.note}
              </span>
              <span className="text-muted-foreground hidden sm:inline">{f.by}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col sm:flex-row gap-2">
        <TextInput
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="sm:w-40"
        />
        <TextInput
          placeholder="e.g. Call back about scholarship"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button size="sm" variant="outline" className="h-10" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right truncate">{v}</span>
    </div>
  );
}

/* ── New (full) application ─────────────────────────────────────────────── */

type Draft = Omit<Application, "id" | "tenantId" | "owner" | "createdAt">;

function NewApplicationDialog({
  open,
  onOpenChange,
  isSchool,
  curricula,
  programmes,
  qualifications,
  region,
  type,
  tenantApps,
  learners,
  tenantNames,
  onOpenExisting,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isSchool: boolean;
  curricula: { id: string; name: string; yearGroups: string[] }[];
  programmes: { id: string; label: string }[];
  qualifications: { id: string; label: string }[];
  region: RegionCode;
  type: InstitutionType;
  tenantApps: Application[];
  learners: Learner[];
  tenantNames: Record<string, string>;
  onOpenExisting: (id: string) => void;
  onCreate: (d: Draft, dupOf?: Application) => void;
}) {
  const dial = DIAL_CODES[region] ?? "+";
  const ids = idTypeOptions(region, type);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"F" | "M">("F");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idType, setIdType] = useState(ids.def);
  const [idValue, setIdValue] = useState("");
  const [linked, setLinked] = useState<string | undefined>();
  const [guardian, setGuardian] = useState("");
  const [nationality, setNationality] = useState("");
  const [source, setSource] = useState<Application["source"]>(isSchool ? "Website" : "UCAS");
  const [curriculumId, setCurriculumId] = useState(curricula[0]?.id ?? "");
  const cur = curricula.find((c) => c.id === curriculumId);
  const [yearGroup, setYearGroup] = useState("");
  const offerings = [
    ...programmes.map((p) => ({ value: `P:${p.id}`, label: p.label })),
    ...qualifications.map((q) => ({ value: `Q:${q.id}`, label: q.label })),
  ];
  const [offering, setOffering] = useState(offerings[0]?.value ?? "");
  const [intake, setIntake] = useState("");
  const [visa, setVisa] = useState(false);
  // Only intakes that admit to the chosen curriculum / programme / qualification.
  const tenantId = useTenantContext().tenantId;
  const allIntakes = useCollection("intakes");
  const allCurricula = useCollection("curricula");
  const scopeId = isSchool ? curriculumId : offering.slice(2);
  const intakeOptions = intakesFor(allIntakes, tenantId, scopeId)
    .filter((i) => intakeStatus(i) !== "Started")
    .sort((x, y) => x.start.localeCompare(y.start));
  const chosen =
    intakeOptions.find((i) => i.name === intake) ??
    intakeOptions.find((i) => intakeStatus(i) === "Open") ??
    intakeOptions[0];
  const chosenCur = allCurricula.find((c) => c.id === curriculumId);
  const framework = chosenCur?.framework;
  const placement =
    isSchool && framework && dob && chosen
      ? suggestYearGroup(framework, dob, startDateFor(chosen), chosenCur?.yearGroups)
      : null;
  const suggested =
    placement && cur?.yearGroups.includes(placement.label) ? placement.label : undefined;

  const fullPhone = withDialCode(phone, dial);
  const officialIds = idValue.trim() ? { [idType]: idValue.trim() } : undefined;
  const matches = useMemo(
    () =>
      name.trim().length < 3 && !email && !phone && !idValue
        ? []
        : findDuplicates({ name, dob, email, phone: fullPhone, officialIds }, tenantApps, learners),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, dob, email, fullPhone, idType, idValue, tenantApps, learners],
  );

  const submit = (dupOf?: Application) => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!chosen) {
      toast.error("No open intake admits to this offering — add one in Institution Profile");
      return;
    }
    const yg = yearGroup || suggested || cur?.yearGroups[0] || "";
    const off = offerings.find((o) => o.value === offering);
    const draft: Draft = {
      applicantName: name.trim(),
      gender,
      dob,
      email: email.trim(),
      phone: fullPhone,
      officialIds,
      matchedStudentId: linked,
      guardianName: guardian || undefined,
      nationality: nationality || "—",
      source,
      target: isSchool ? `${yg} · ${cur?.name ?? "—"}` : (off?.label ?? "—"),
      yearGroup: isSchool ? yg : undefined,
      curriculumId: isSchool ? curriculumId || undefined : undefined,
      programmeId: !isSchool && offering.startsWith("P:") ? offering.slice(2) : undefined,
      qualificationId: !isSchool && offering.startsWith("Q:") ? offering.slice(2) : undefined,
      intake: chosen.name,
      stage: "Applied",
      visaRequired: visa,
      documents: (isSchool
        ? [
            "Birth certificate",
            "Passport & residence visa",
            "Previous school reports",
            "Transfer certificate",
          ]
        : ["Passport", "Academic transcripts", "Personal statement", "Reference"]
      ).map((n) => ({ name: n, status: "Missing" as const })),
    };
    onCreate(draft, dupOf);
    onOpenChange(false);
    setName("");
    setEmail("");
    setPhone("");
    setIdValue("");
    setDob("");
    setLinked(undefined);
    setGuardian("");
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New application"
      description={
        isSchool
          ? "Year group and curriculum come from this school's curricula."
          : "Programmes and qualifications come from this institution's catalogue."
      }
      onSubmit={() => submit()}
      submitLabel="Create application"
    >
      <Field label="Applicant name" required>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Gender">
        <Select
          value={gender}
          onChange={(e) => setGender(e.target.value as "F" | "M")}
          options={[
            { value: "F", label: "Female" },
            { value: "M", label: "Male" },
          ]}
        />
      </Field>
      <Field label="Date of birth">
        <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
      </Field>
      <Field label="Email" required>
        <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Mobile" hint={dial !== "+" ? `${dial} added automatically` : undefined}>
        <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Official ID">
        <div className="flex gap-1.5">
          <Select
            value={idType}
            onChange={(e) => setIdType(e.target.value)}
            options={ids.options}
            className="w-28 shrink-0"
          />
          <TextInput value={idValue} onChange={(e) => setIdValue(e.target.value)} />
        </div>
      </Field>
      <DuplicatePanel
        matches={matches}
        tenantId={tenantId}
        tenantNames={tenantNames}
        linkedId={linked}
        onOpen={onOpenExisting}
        onMarkDuplicate={(a) => submit(a)}
        markLabel="Log as duplicate"
        onLink={(l) => {
          setLinked(l.id);
          toast.success(`Will keep 1StudentID ${l.id}`);
        }}
      />
      {isSchool && (
        <Field label="Parent / guardian">
          <TextInput value={guardian} onChange={(e) => setGuardian(e.target.value)} />
        </Field>
      )}
      <Field label="Nationality">
        <TextInput value={nationality} onChange={(e) => setNationality(e.target.value)} />
      </Field>
      <Field label="Source">
        <Select
          value={source}
          onChange={(e) => setSource(e.target.value as Application["source"])}
          options={SOURCES.map((s) => ({ value: s, label: s }))}
        />
      </Field>
      {isSchool ? (
        <>
          <Field label="Curriculum">
            <Select
              value={curriculumId}
              onChange={(e) => {
                setCurriculumId(e.target.value);
                setYearGroup("");
              }}
              options={
                curricula.length
                  ? curricula.map((c) => ({ value: c.id, label: c.name }))
                  : [{ value: "", label: "No curricula yet" }]
              }
            />
          </Field>
          <Field
            label="Year group"
            hint={
              placement
                ? `Suggested by age: ${placement.label} (cut-off ${fmtDate(placement.cutoffDate)})`
                : "Enter date of birth for an age-based suggestion"
            }
          >
            <Select
              value={yearGroup || suggested || cur?.yearGroups[0] || ""}
              onChange={(e) => setYearGroup(e.target.value)}
              options={(cur?.yearGroups ?? ["Year 7"]).map((y) => ({ value: y, label: y }))}
            />
          </Field>
        </>
      ) : (
        <Field label="Programme / qualification" className="sm:col-span-2">
          <Select
            value={offering}
            onChange={(e) => setOffering(e.target.value)}
            options={offerings.length ? offerings : [{ value: "", label: "No programmes yet" }]}
          />
        </Field>
      )}
      <Field
        label="Intake"
        className="sm:col-span-2"
        hint={
          chosen
            ? `${chosen.kind === "Rolling" ? "Next start" : "Starts"} ${fmtDate(startDateFor(chosen))} · deadline ${fmtDate(chosen.deadline)}${chosen.census ? ` · census ${fmtDate(chosen.census)}` : ""}`
            : "No intake admits to this offering yet"
        }
      >
        <Select
          value={chosen?.name ?? ""}
          onChange={(e) => setIntake(e.target.value)}
          options={
            intakeOptions.length
              ? intakeOptions.map((i) => ({
                  value: i.name,
                  label: `${i.name} — ${intakeStatus(i)}${i.kind === "Rolling" ? " · rolling" : ""}`,
                }))
              : [{ value: "", label: "No intake available" }]
          }
        />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={visa} onChange={(e) => setVisa(e.target.checked)} />
        Student visa / sponsorship required
      </label>
    </FormDialog>
  );
}

/* ── My follow-ups ───────────────────────────────────────────────────────── */

interface FollowUpRow {
  app: Application;
  f: NonNullable<Application["followUps"]>[number];
}

function FollowUpsTab({
  apps,
  counsellors,
  me,
  onOpen,
  tenantId,
}: {
  apps: Application[];
  counsellors: string[];
  me: string;
  onOpen: (id: string) => void;
  tenantId: string;
}) {
  // Head of admissions sees everyone; filter to one counsellor (or "me").
  const [who, setWho] = useState("All");
  const rows: FollowUpRow[] = apps
    .flatMap((app) => (app.followUps ?? []).map((f) => ({ app, f })))
    .filter((r) => !r.f.done && (who === "All" || r.f.by === who))
    .sort((x, y) => x.f.due.localeCompare(y.f.due));
  const overdue = rows.filter((r) => r.f.due < DEMO_TODAY);
  const today = rows.filter((r) => r.f.due === DEMO_TODAY);
  const upcoming = rows.filter((r) => r.f.due > DEMO_TODAY);
  const doneCount = apps
    .flatMap((a) => a.followUps ?? [])
    .filter((f) => f.done && (who === "All" || f.by === who)).length;

  const markDone = (r: FollowUpRow) => {
    updateItem("applications", (x) => x.id === r.app.id, {
      followUps: (r.app.followUps ?? []).map((f) =>
        f.id === r.f.id ? { ...f, done: DEMO_TODAY } : f,
      ),
    });
    toast.success("Follow-up done", { description: `${r.app.applicantName} · ${r.f.note}` });
  };

  const sendReminders = () => {
    const due = [...overdue, ...today];
    if (!due.length) return toast.info("Nothing due today or overdue");
    const byCounsellor = new Map<string, FollowUpRow[]>();
    due.forEach((r) => byCounsellor.set(r.f.by, [...(byCounsellor.get(r.f.by) ?? []), r]));
    byCounsellor.forEach((list, counsellor) => {
      const late = list.filter((r) => r.f.due < DEMO_TODAY).length;
      notify({
        tenantId,
        channel: "App",
        to: counsellor,
        subject: `${list.length} admissions follow-up${list.length > 1 ? "s" : ""} due${
          late ? ` (${late} overdue)` : ""
        }`,
        body: list
          .map((r) => `${fmtDate(r.f.due)} · ${r.app.applicantName} — ${r.f.note}`)
          .join("\n"),
        source: "Admissions · follow-ups",
      });
    });
    toast.success(
      `Reminders queued for ${byCounsellor.size} counsellor${byCounsellor.size > 1 ? "s" : ""}`,
      { description: "See IT Administration → Outbox." },
    );
  };

  const group = (title: string, list: FollowUpRow[], tone: "destructive" | "warning" | "info") => (
    <Section
      title={
        <span className="flex items-center gap-2">
          {title} <Badge tone={tone}>{list.length}</Badge>
        </span>
      }
    >
      <DataTable
        columns={[
          { key: "applicant", label: "Applicant" },
          { key: "due", label: "Due" },
          { key: "note", label: "Follow-up" },
          { key: "by", label: "Counsellor" },
          { key: "stage", label: "Stage" },
          { key: "_actions", label: "" },
        ]}
        rows={list}
        emptyText="Nothing here"
        renderCell={(r: FollowUpRow, key) => {
          if (key === "applicant")
            return (
              <button className="text-left hover:underline" onClick={() => onOpen(r.app.id)}>
                <div className="font-medium">{r.app.applicantName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.app.target} · {r.app.phone ?? r.app.email}
                </div>
              </button>
            );
          if (key === "due") return <Badge tone={tone}>{fmtDate(r.f.due)}</Badge>;
          if (key === "note") return <span className="text-xs">{r.f.note}</span>;
          if (key === "by") return <span className="text-xs">{r.f.by}</span>;
          if (key === "stage") return <StatusPill status={r.app.stage} />;
          if (key === "_actions")
            return (
              <Button size="sm" variant="outline" onClick={() => markDone(r)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Done
              </Button>
            );
          return null;
        }}
      />
    </Section>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-56">
          <Select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            options={[
              { value: "All", label: "All counsellors" },
              ...counsellors.map((c) => ({ value: c, label: c === me ? `${c} (me)` : c })),
            ]}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {overdue.length} overdue · {today.length} today · {upcoming.length} upcoming · {doneCount}{" "}
          done
        </span>
        <Button className="ml-auto" onClick={sendReminders}>
          <BellRing className="h-4 w-4" /> Send reminders
        </Button>
      </div>
      {group("Overdue", overdue, "destructive")}
      {group("Today", today, "warning")}
      {group("Upcoming", upcoming, "info")}
    </div>
  );
}

/* ── Possible duplicates (admin) ─────────────────────────────────────────── */

function possibleDuplicates(apps: Application[], learners: Learner[]) {
  const live = apps.filter((a) => !a.duplicateOf);
  const pairs: { a: Application; b: Application; reasons: string[] }[] = [];
  live.forEach((a, i) => {
    findDuplicates(probeOf(a), live.slice(i + 1), []).forEach((m) => {
      if (m.kind === "application") pairs.push({ a, b: m.app, reasons: m.reasons });
    });
  });
  const platform: { a: Application; l: Learner; reasons: string[] }[] = [];
  live
    .filter((a) => !a.matchedStudentId && !a.studentId)
    .forEach((a) =>
      findDuplicates(probeOf(a), [], learners, a).forEach((m) => {
        if (m.kind === "learner") platform.push({ a, l: m.learner, reasons: m.reasons });
      }),
    );
  return { pairs, platform, total: pairs.length + platform.length };
}

function DuplicatesTab({
  apps,
  learners,
  tenantNames,
  tenantId,
  by,
  onOpen,
}: {
  apps: Application[];
  learners: Learner[];
  tenantNames: Record<string, string>;
  tenantId: string;
  by: string;
  onOpen: (id: string) => void;
}) {
  const { pairs, platform } = useMemo(() => possibleDuplicates(apps, learners), [apps, learners]);
  const resolved = apps.filter((a) => a.duplicateOf || a.matchedStudentId);
  const inst = (l: Learner) =>
    l.tenantId === tenantId ? "this institution" : (tenantNames[l.tenantId] ?? l.tenantId);
  const appLine = (a: Application) => (
    <button className="text-left hover:underline" onClick={() => onOpen(a.id)}>
      <div className="font-medium text-xs">
        {a.id} · {a.applicantName}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {a.channel ?? a.source} · {fmtDate(a.createdAt)} · {a.owner} · {a.stage}
      </div>
    </button>
  );

  return (
    <div className="space-y-4">
      <Section
        title="Same person, two records"
        description="Applications here that match on official ID, email, phone, or name + date of birth. Merging closes the newer record and moves its open follow-ups."
      >
        <DataTable
          columns={[
            { key: "keep", label: "Keep" },
            { key: "dup", label: "Duplicate" },
            { key: "why", label: "Matched on" },
            { key: "_actions", label: "" },
          ]}
          rows={pairs.map((p) => {
            const [keep, dup] = p.a.createdAt <= p.b.createdAt ? [p.a, p.b] : [p.b, p.a];
            return { keep, dup, reasons: p.reasons };
          })}
          emptyText="No duplicate applications"
          renderCell={(r: { keep: Application; dup: Application; reasons: string[] }, key) => {
            if (key === "keep") return appLine(r.keep);
            if (key === "dup") return appLine(r.dup);
            if (key === "why") return <ReasonBadges reasons={r.reasons} />;
            if (key === "_actions")
              return (
                <Button
                  size="sm"
                  onClick={() => {
                    markDuplicate(r.dup, r.keep, by);
                    toast.success(`${r.dup.id} merged into ${r.keep.id}`);
                  }}
                >
                  Merge newer into older
                </Button>
              );
            return null;
          }}
        />
      </Section>

      <Section
        title="Already has a 1StudentID"
        description="Applicants who match a learner anywhere on the platform. Link them so they keep the same 1StudentID."
      >
        <DataTable
          columns={[
            { key: "app", label: "Application" },
            { key: "match", label: "Existing 1StudentID" },
            { key: "why", label: "Matched on" },
            { key: "_actions", label: "" },
          ]}
          rows={platform}
          emptyText="No matches with existing learners"
          renderCell={(r: { a: Application; l: Learner; reasons: string[] }, key) => {
            if (key === "app") return appLine(r.a);
            if (key === "match")
              return (
                <div className="text-xs">
                  <div className="font-medium">
                    {r.l.id} at {inst(r.l)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    born {r.l.dob.slice(0, 4)} · {maskEmail(r.l.email)}
                  </div>
                </div>
              );
            if (key === "why") return <ReasonBadges reasons={r.reasons} />;
            if (key === "_actions")
              return (
                <Button size="sm" onClick={() => linkStudent(r.a, r.l, inst(r.l), by)}>
                  <Link2 className="h-3.5 w-3.5" /> Link
                </Button>
              );
            return null;
          }}
        />
      </Section>

      <Section title="Resolved">
        <DataTable
          columns={[
            { key: "app", label: "Application" },
            { key: "outcome", label: "Outcome" },
          ]}
          rows={resolved}
          emptyText="Nothing resolved yet"
          renderCell={(a: Application, key) => {
            if (key === "app") return appLine(a);
            if (key === "outcome")
              return a.duplicateOf ? (
                <Badge tone="warning">Duplicate of {a.duplicateOf}</Badge>
              ) : (
                <Badge tone="success">
                  Keeps 1StudentID {a.matchedStudentId}
                  {a.studentId && a.studentId !== a.matchedStudentId
                    ? ` · local record ${a.studentId}`
                    : ""}
                </Badge>
              );
            return null;
          }}
        />
      </Section>
    </div>
  );
}

/* ── Targets & funnel ────────────────────────────────────────────────────── */

const FUNNEL = ["Enquiry", "Applied", "Offer", "Accepted", "Enrolled"] as const;

/** Furthest funnel step an application reached (0 = Enquiry … 4 = Enrolled). */
function reached(a: Application): number {
  switch (a.stage) {
    case "Enquiry":
      return 0;
    case "Applied":
    case "Assessment":
    case "Waitlist":
      return 1;
    case "Offer":
      return 2;
    case "Accepted":
    case "Deposit paid":
      return 3;
    case "Enrolled":
      return 4;
    case "Declined":
      return a.offer ? 2 : 1;
    case "Withdrawn":
      return a.deposit?.paid ? 3 : a.offer ? 2 : a.assessment ? 1 : 0;
  }
}

/** Registered = deposit paid or enrolled. */
const isRegistered = (a: Application) => a.stage === "Deposit paid" || a.stage === "Enrolled";

function TargetsTab({
  apps,
  intakes,
  offerings,
  isSchool,
  counsellors,
  rota,
  branches,
  tenantId,
  by,
}: {
  apps: Application[];
  intakes: Intake[];
  offerings: Offering[];
  isSchool: boolean;
  counsellors: string[];
  rota?: CounsellorRota;
  branches: string[];
  tenantId: string;
  by: string;
}) {
  const allTargets = useCollection("counsellorTargets");
  const targets = allTargets.filter((t) => t.tenantId === tenantId);
  const intakeNames = [
    ...new Set([...intakes.map((i) => i.name), ...targets.map((t) => t.intake)]),
  ];
  const [intakeF, setIntakeF] = useState("All");
  const [branchF, setBranchF] = useState("All");
  const [editing, setEditing] = useState<CounsellorTarget | "new" | null>(null);

  const scoped = apps.filter(
    (a) =>
      !a.duplicateOf &&
      (intakeF === "All" || a.intake === intakeF) &&
      (branchF === "All" || a.branch === branchF),
  );
  const shownTargets = targets.filter(
    (t) =>
      (intakeF === "All" || t.intake === intakeF) &&
      (branchF === "All" || !t.branch || t.branch === branchF),
  );
  const interest = (a: Application) => interestOf(a, offerings, isSchool);
  const matchesTarget = (a: Application, t: CounsellorTarget) =>
    a.owner === t.counsellor &&
    a.intake === t.intake &&
    (t.target === "All" || interest(a) === t.target || a.target === t.target) &&
    (!t.branch || a.branch === t.branch);
  const regFor = (ts: CounsellorTarget[]) =>
    scoped.filter((a) => isRegistered(a) && ts.some((t) => matchesTarget(a, t))).length;
  const pipeFor = (ts: CounsellorTarget[]) =>
    scoped.filter(
      (a) => !isRegistered(a) && !CLOSED.includes(a.stage) && ts.some((t) => matchesTarget(a, t)),
    ).length;

  const funnel = FUNNEL.map((step, i) => ({
    step,
    n: scoped.filter((a) => reached(a) >= i).length,
  }));
  const top = Math.max(1, funnel[0].n);

  const byChannel = ENQUIRY_CHANNELS.map((c) => {
    const list = scoped.filter((a) => a.channel === c);
    return { c, n: list.length, reg: list.filter(isRegistered).length };
  }).filter((r) => r.n > 0);

  const rollup = (key: (t: CounsellorTarget) => string) => {
    const groups = new Map<string, CounsellorTarget[]>();
    shownTargets.forEach((t) => groups.set(key(t), [...(groups.get(key(t)) ?? []), t]));
    return [...groups.entries()].map(([label, ts]) => {
      const goal = ts.reduce((s, t) => s + t.goal, 0);
      const reg = regFor(ts);
      return { label, goal, reg, pipe: pipeFor(ts), remaining: Math.max(0, goal - reg) };
    });
  };
  const perCounsellor = rollup((t) => t.counsellor);
  const perProgramme = rollup((t) => (t.target === "All" ? "All programmes" : t.target));

  const targetOptions = [
    "All",
    ...new Set(offerings.map((o) => o.targetLabel)),
    ...targets.map((t) => t.target),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-48">
          <Select
            value={intakeF}
            onChange={(e) => setIntakeF(e.target.value)}
            options={[
              { value: "All", label: "All intakes" },
              ...intakeNames.map((n) => ({ value: n, label: n })),
            ]}
          />
        </div>
        {branches.length > 0 && (
          <div className="w-52">
            <Select
              value={branchF}
              onChange={(e) => setBranchF(e.target.value)}
              options={[
                { value: "All", label: "All branches" },
                ...branches.map((b) => ({ value: b, label: b })),
              ]}
            />
          </div>
        )}
        <span className="text-xs text-muted-foreground">
          Registered = deposit paid or enrolled. Duplicates are excluded.
        </span>
        <Button className="ml-auto" onClick={() => setEditing("new")}>
          <Target className="h-4 w-4" /> Add target
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Section title="Funnel" className="lg:col-span-2">
          <div className="space-y-2">
            {funnel.map((f, i) => {
              const prev = i ? funnel[i - 1].n : 0;
              const conv = i && prev ? Math.round((f.n / prev) * 100) : null;
              return (
                <div key={f.step} className="flex items-center gap-3 text-xs">
                  <div className="w-20 shrink-0 font-medium">{f.step}</div>
                  <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-brand rounded-md flex items-center px-2 text-[11px] text-primary-foreground font-semibold"
                      style={{ width: `${Math.max(4, (f.n / top) * 100)}%` }}
                    >
                      {f.n}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-right text-muted-foreground">
                    {conv === null ? "—" : `${conv}% of ${FUNNEL[i - 1].toLowerCase()}`}
                  </div>
                </div>
              );
            })}
            <div className="text-[11px] text-muted-foreground pt-1">
              Overall: {top ? Math.round((funnel[4].n / top) * 100) : 0}% of enquiries enrolled ·{" "}
              {Math.round((funnel[3].n / top) * 100)}% accepted.
            </div>
          </div>
        </Section>
        <Section title="By channel">
          {byChannel.length === 0 ? (
            <p className="text-xs text-muted-foreground">No channel data yet.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {byChannel.map((r) => (
                <li key={r.c} className="flex items-center justify-between gap-2">
                  <span>{r.c}</span>
                  <span className="text-muted-foreground">
                    <b className="text-foreground">{r.n}</b> enquiries · {r.reg} registered
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Targets" description="Registrations against goal, per intake and programme.">
        <DataTable
          columns={[
            { key: "counsellor", label: "Counsellor" },
            { key: "target", label: isSchool ? "Year group" : "Programme" },
            { key: "intake", label: "Intake" },
            { key: "progress", label: "Registered / goal" },
            { key: "remaining", label: "Remaining" },
            { key: "pipe", label: "In pipeline" },
            { key: "_actions", label: "" },
          ]}
          rows={shownTargets}
          emptyText="No targets for this filter — add one"
          renderCell={(t: CounsellorTarget, key) => {
            const reg = regFor([t]);
            if (key === "counsellor") return <span className="font-medium">{t.counsellor}</span>;
            if (key === "target")
              return (
                <span className="text-xs">
                  {t.target === "All" ? "All programmes" : t.target}
                  {t.branch && (
                    <span className="block text-[11px] text-muted-foreground">{t.branch}</span>
                  )}
                </span>
              );
            if (key === "progress") return <Progress reg={reg} goal={t.goal} />;
            if (key === "remaining") return Math.max(0, t.goal - reg);
            if (key === "pipe") return pipeFor([t]);
            if (key === "_actions")
              return (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Remove"
                    onClick={() => {
                      removeItem("counsellorTargets", (x) => x.id === t.id);
                      toast.success("Target removed");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            return String((t as unknown as Record<string, unknown>)[key] ?? "");
          }}
        />
      </Section>

      <div className="grid lg:grid-cols-2 gap-4">
        <RollupTable title="Per counsellor" rows={perCounsellor} />
        <RollupTable title={isSchool ? "Per year group" : "Per programme"} rows={perProgramme} />
      </div>

      <RotaCard apps={apps} counsellors={counsellors} rota={rota} tenantId={tenantId} by={by} />

      {editing && (
        <TargetDialog
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          tenantId={tenantId}
          intakes={intakeNames}
          targetOptions={[...new Set(targetOptions)]}
          counsellors={counsellors}
          branches={branches}
          existing={allTargets}
        />
      )}
    </div>
  );
}

function Progress({ reg, goal }: { reg: number; goal: number }) {
  const pct = goal ? Math.round((reg / goal) * 100) : 0;
  return (
    <div className="min-w-[120px]">
      <div className="text-xs">
        <b>{reg}</b> / {goal} <span className="text-muted-foreground">· {pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
        <div
          className={cn(
            "h-full",
            pct >= 100 ? "bg-success" : pct >= 50 ? "bg-primary" : "bg-warning",
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function RollupTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; goal: number; reg: number; pipe: number; remaining: number }[];
}) {
  return (
    <Section title={title}>
      <DataTable
        columns={[
          { key: "label", label: "" },
          { key: "progress", label: "Registered / goal" },
          { key: "remaining", label: "Remaining" },
          { key: "pipe", label: "In pipeline" },
        ]}
        rows={rows}
        emptyText="No targets"
        renderCell={(r: (typeof rows)[number], key) => {
          if (key === "label") return <span className="font-medium text-xs">{r.label}</span>;
          if (key === "progress") return <Progress reg={r.reg} goal={r.goal} />;
          return String((r as unknown as Record<string, unknown>)[key] ?? "");
        }}
      />
    </Section>
  );
}

function RotaCard({
  apps,
  counsellors,
  rota,
  tenantId,
  by,
}: {
  apps: Application[];
  counsellors: string[];
  rota?: CounsellorRota;
  tenantId: string;
  by: string;
}) {
  const [newName, setNewName] = useState("");
  const save = (p: Partial<CounsellorRota>) => {
    if (rota) updateItem("counsellorRotas", (r) => r.id === rota.id, p);
    else
      addItem("counsellorRotas", {
        id: tenantId,
        tenantId,
        counsellors,
        onDuty: counsellors[0] ?? "",
        ...p,
      });
  };
  return (
    <Section
      title="Counsellors & on-duty rota"
      description="New walk-ins and quick enquiries go to the counsellor on duty; with nobody on duty, to whoever has the fewest open enquiries."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {counsellors.map((c) => {
          const open = apps.filter((a) => a.owner === c && isOpenEnquiry(a)).length;
          const due = apps
            .flatMap((a) => a.followUps ?? [])
            .filter((f) => f.by === c && !f.done && f.due <= DEMO_TODAY).length;
          const onDuty = rota?.onDuty === c;
          return (
            <div
              key={c}
              className={cn(
                "rounded-lg border p-3 text-xs",
                onDuty && "border-primary bg-primary/5",
              )}
            >
              <div className="font-medium flex items-center justify-between gap-2">
                {c}
                {onDuty && <Badge tone="success">On duty</Badge>}
              </div>
              <div className="text-muted-foreground mt-1">
                {open} open enquiries · {due} follow-ups due
              </div>
              {!onDuty && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    save({ onDuty: c });
                    logChange({
                      tenantId,
                      entity: "counsellorRota",
                      entityId: tenantId,
                      field: "onDuty",
                      from: rota?.onDuty,
                      to: c,
                      by,
                    });
                    toast.success(`${c} is now on duty`);
                  }}
                >
                  Put on duty
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-3 max-w-md">
        <TextInput
          placeholder="Add a counsellor"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button
          variant="outline"
          className="h-10"
          onClick={() => {
            const n = newName.trim();
            if (!n || counsellors.includes(n)) return;
            save({ counsellors: [...counsellors, n] });
            setNewName("");
            toast.success(`${n} added to the rota`);
          }}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </Section>
  );
}

function TargetDialog({
  initial,
  onClose,
  tenantId,
  intakes,
  targetOptions,
  counsellors,
  branches,
  existing,
}: {
  initial?: CounsellorTarget;
  onClose: () => void;
  tenantId: string;
  intakes: string[];
  targetOptions: string[];
  counsellors: string[];
  branches: string[];
  existing: CounsellorTarget[];
}) {
  const [intake, setIntake] = useState(initial?.intake ?? intakes[0] ?? "");
  const [target, setTarget] = useState(initial?.target ?? "All");
  const [counsellor, setCounsellor] = useState(initial?.counsellor ?? counsellors[0] ?? "");
  const [branch, setBranch] = useState(initial?.branch ?? "");
  const [goal, setGoal] = useState(String(initial?.goal ?? 10));
  const submit = () => {
    const g = Number(goal);
    if (!intake || !counsellor || !(g > 0))
      return toast.error("Intake, counsellor and goal needed");
    const row = { intake, target, counsellor, goal: g, branch: branch || undefined };
    if (initial) {
      updateItem("counsellorTargets", (t) => t.id === initial.id, row);
      toast.success("Target updated");
    } else {
      const n = Math.max(0, ...existing.map((t) => parseInt(t.id.replace(/\D/g, ""), 10) || 0));
      addItem("counsellorTargets", {
        id: `CT-${String(n + 1).padStart(3, "0")}`,
        tenantId,
        ...row,
      });
      toast.success("Target added");
    }
    onClose();
  };
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={initial ? "Edit target" : "Add target"}
      onSubmit={submit}
      submitLabel={initial ? "Save" : "Add target"}
    >
      <Field label="Intake">
        <Select
          value={intake}
          onChange={(e) => setIntake(e.target.value)}
          options={intakes.map((i) => ({ value: i, label: i }))}
        />
      </Field>
      <Field label="Counsellor">
        <Select
          value={counsellor}
          onChange={(e) => setCounsellor(e.target.value)}
          options={counsellors.map((c) => ({ value: c, label: c }))}
        />
      </Field>
      <Field label="Programme / year group" className="sm:col-span-2">
        <Select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          options={targetOptions.map((t) => ({
            value: t,
            label: t === "All" ? "All programmes" : t,
          }))}
        />
      </Field>
      {branches.length > 0 && (
        <Field label="Branch">
          <Select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            options={[
              { value: "", label: "Any branch" },
              ...branches.map((b) => ({ value: b, label: b })),
            ]}
          />
        </Field>
      )}
      <Field label="Goal (registrations)">
        <NumberInput min={1} value={goal} onChange={(e) => setGoal(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

/* ── Intakes ─────────────────────────────────────────────────────────────── */

/** Places per intake — capacity is per intake, not per tenant. */
function IntakesBoard({ intakes, apps }: { intakes: Intake[]; apps: Application[] }) {
  const sorted = [...intakes].sort((a, b) => a.start.localeCompare(b.start));
  if (sorted.length === 0)
    return (
      <Section>
        <p className="text-sm text-muted-foreground">
          No intakes defined — add them in{" "}
          <Link to="/app/institution" className="text-primary hover:underline">
            Institution Profile
          </Link>
          .
        </p>
      </Section>
    );
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
      {sorted.map((i) => {
        const mine = apps.filter((a) => a.intake === i.name);
        const committed = mine.filter((a) =>
          ["Accepted", "Deposit paid", "Enrolled"].includes(a.stage),
        ).length;
        const offers = mine.filter((a) => a.stage === "Offer").length;
        const st = intakeStatus(i);
        const pct = Math.min(100, Math.round((committed / Math.max(1, i.capacity)) * 100));
        const daysToDeadline = Math.round(
          (new Date(i.deadline).getTime() - new Date(DEMO_TODAY).getTime()) / 86400000,
        );
        return (
          <div key={i.id} className="rounded-xl border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{i.name}</div>
                <div className="text-[11px] text-muted-foreground">{i.scopeLabel}</div>
              </div>
              <Badge
                tone={
                  st === "Open"
                    ? "success"
                    : st === "Closed"
                      ? "warning"
                      : st === "Started"
                        ? "info"
                        : "muted"
                }
              >
                {st}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div>
                <div className="text-muted-foreground">Deadline</div>
                <div
                  className={cn(
                    st === "Open" && daysToDeadline <= 30 && "text-warning-foreground font-medium",
                  )}
                >
                  {fmtDate(i.deadline)}
                  {st === "Open" && (
                    <span className="text-muted-foreground"> · {daysToDeadline}d</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">
                  {i.kind === "Rolling" ? "Next start" : "Starts"}
                </div>
                <div>{fmtDate(startDateFor(i))}</div>
              </div>
              {i.census && (
                <div>
                  <div className="text-muted-foreground">Census</div>
                  <div>{fmtDate(i.census)}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground">Kind</div>
                <div>{i.kind === "Rolling" ? "Rolling — any Monday" : "Fixed start"}</div>
              </div>
            </div>
            <div className="mt-3 text-xs flex justify-between">
              <span>
                <b>{committed}</b> committed of {i.capacity} places
              </span>
              <span className="text-muted-foreground">
                {offers} offers · {mine.length} apps
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted mt-1 overflow-hidden">
              <div
                className={cn(
                  "h-full",
                  pct >= 95 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Intake & start for one application: status of the chosen intake, the start
 * date they'd get, suggested year group from date of birth (schools), and
 * deferral to the next intake for the same offering (offer + deposit move).
 */
function IntakePanel({ a, isSchool }: { a: Application; isSchool: boolean }) {
  const allIntakes = useCollection("intakes");
  const curricula = useCollection("curricula");
  const intake = allIntakes.find((i) => i.tenantId === a.tenantId && i.name === a.intake);
  const scopeId = a.programmeId ?? a.qualificationId ?? a.curriculumId;
  const options = intakesFor(allIntakes, a.tenantId, scopeId).sort((x, y) =>
    x.start.localeCompare(y.start),
  );
  const next = options.find((i) => i.start > (intake?.start ?? DEMO_TODAY) && i.id !== intake?.id);
  const curriculum = curricula.find((c) => c.id === a.curriculumId);
  const start = startDateFor(intake);
  // Quick enquiries may not have a date of birth yet.
  const placement =
    isSchool && curriculum && a.dob
      ? suggestYearGroup(curriculum.framework, a.dob, start, curriculum.yearGroups)
      : null;
  const applied = a.yearGroup;
  const mismatch = placement && applied && placement.label !== applied;
  const done = CLOSED.includes(a.stage);

  const defer = () => {
    if (!next) return;
    const note = `Deferred from ${a.intake} to ${next.name} on ${fmtDate(DEMO_TODAY)} — offer and deposit carried forward.`;
    const nextStart = startDateFor(next);
    const newPlacement =
      isSchool && curriculum && a.dob
        ? suggestYearGroup(curriculum.framework, a.dob, nextStart, curriculum.yearGroups)
        : null;
    updateItem("applications", (x) => x.id === a.id, {
      intake: next.name,
      notes: a.notes ? `${a.notes}\n${note}` : note,
      ...(newPlacement ? { yearGroup: newPlacement.label } : {}),
    });
    toast.success(`Deferred to ${next.name}`, {
      description: newPlacement
        ? `Year group re-placed by age for the new start: ${newPlacement.label}.`
        : "Offer and deposit carried forward.",
    });
  };

  return (
    <div className="rounded-lg border p-3 text-xs space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Intake & start</span>
        {intake ? (
          <>
            <Badge tone="info">{intake.name}</Badge>
            <Badge tone="muted">{intakeStatus(intake)}</Badge>
            <span className="text-muted-foreground">
              {intake.kind === "Rolling" ? "Next start" : "Starts"} <b>{fmtDate(start)}</b>
              {intake.census && ` · census ${fmtDate(intake.census)}`}
              {` · deadline ${fmtDate(intake.deadline)}`}
            </span>
          </>
        ) : (
          <span className="text-warning-foreground">
            “{a.intake}” isn't a defined intake for this offering — set one up in Institution
            Profile.
          </span>
        )}
        {!done && next && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={defer}>
            Defer to {next.name}
          </Button>
        )}
      </div>
      {placement && (
        <div className={cn("rounded-md px-2.5 py-1.5", mismatch ? "bg-warning/15" : "bg-muted/40")}>
          Suggested year group by age: <b>{placement.label}</b>{" "}
          <span className="text-muted-foreground">
            ({curriculum?.framework} cut-off {fmtDate(placement.cutoffDate)})
          </span>
          {mismatch && (
            <>
              {" "}
              — applied for <b>{applied}</b>.{" "}
              {!done && (
                <button
                  className="text-primary hover:underline"
                  onClick={() => {
                    updateItem("applications", (x) => x.id === a.id, {
                      yearGroup: placement.label,
                    });
                    toast.success(`Placed in ${placement.label}`);
                  }}
                >
                  Use suggestion
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
