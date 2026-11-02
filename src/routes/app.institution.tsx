import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  DoorOpen,
  Check,
  Globe2,
  IdCard,
  ListChecks,
  Lock,
  Pencil,
  Plus,
  ShieldAlert,
  Star,
  Trash2,
  Wallet,
  KeyRound,
} from "lucide-react";
import {
  PageHeader,
  Section,
  Badge,
  Button,
  Field,
  Select,
  TextInput,
  FormDialog,
  DataTable,
} from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { PackContextBar, LucideIcon } from "@/components/packs/PackUI";
import { addItem, removeItem, updateItem, useCollection } from "@/lib/store";
import { logChange } from "@/lib/packs/sis/activity";
import { PACK_BY_ID, useTenantContext } from "@/lib/packs/registry";
import {
  ATTENDANCE_CODE_SETS,
  ID_FIELDS,
  REGION_LIST,
  REGIONS,
  codeSetById,
  returnsFor,
  CENSUS_DATE_REGIONS,
  INTAKE_TEMPLATES,
  PLACEMENT_RULES,
  type AttendanceMeaning,
  type RegionCode,
} from "@/lib/packs/regions";
import {
  ACCOUNT_MODE_LABEL,
  PROVIDER_LABEL,
  type AccountMode,
  type SignInProvider,
  type StudentAccountPolicy,
} from "@/lib/packs/foundationData";
import {
  currentTerm,
  DEMO_TODAY,
  intakeStatus,
  type AcademicCalendar,
  type AcademicTerm,
  type Intake,
  type IntakeStatus,
  type TermKind,
} from "@/lib/packs/foundationData";
import { cn } from "@/lib/utils";
import { GradingSchemeSection } from "@/components/packs/ResultsUI";

export const Route = createFileRoute("/app/institution")({
  head: () => ({ meta: [{ title: "Institution Profile — 1StudentID" }] }),
  component: InstitutionProfilePage,
});

const MEANING_TONE: Record<
  AttendanceMeaning,
  "success" | "info" | "warning" | "destructive" | "muted"
> = {
  present: "success",
  late: "warning",
  aea: "info",
  authorised: "info",
  unauthorised: "destructive",
  "not-required": "muted",
  admin: "muted",
};
const MEANING_LABEL: Record<AttendanceMeaning, string> = {
  present: "Present",
  late: "Late",
  aea: "Approved activity",
  authorised: "Authorised",
  unauthorised: "Unauthorised",
  "not-required": "Not counted",
  admin: "Admin",
};

const KIND_COLOUR: Record<TermKind, string> = {
  teaching: "bg-primary/70",
  exams: "bg-amber-500/80",
  break: "bg-muted-foreground/25",
  resit: "bg-rose-500/70",
  induction: "bg-emerald-500/70",
};

const SECOND_CURRENCIES = ["", "USD", "GBP", "EUR", "AED", "AUD", "INR", "LKR", "SGD"];

function InstitutionProfilePage() {
  const ctx = useTenantContext();
  const calendars = useCollection("academicCalendars");
  const profiles = useCollection("tenantProfiles");
  const profile = ctx.profile;
  const mine = useMemo(
    () => calendars.filter((c) => c.tenantId === ctx.tenantId),
    [calendars, ctx.tenantId],
  );
  const [regionDraft, setRegionDraft] = useState<RegionCode | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [termFor, setTermFor] = useState<AcademicCalendar | null>(null);
  const [calAction, setCalAction] = useState<CalAction | null>(null);

  if (!profile) {
    return (
      <div>
        <PageHeader title="Institution Profile" />
        <p className="text-sm text-muted-foreground">No tenant profile for this account.</p>
      </div>
    );
  }

  const canEdit = ctx.isAdmin;
  const patch = (p: Partial<typeof profile>) =>
    updateItem("tenantProfiles", (x) => x.tenantId === ctx.tenantId, p);

  const applyRegion = (code: RegionCode) => {
    const r = REGIONS[code];
    patch({
      region: code,
      subRegion: undefined,
      codeSetId: r.codeSet[profile.type] ?? "simple",
      idFields: r.idFields.filter((k) => {
        const f = ID_FIELDS[k];
        return f && (!f.segments || f.segments.includes(profile.type));
      }),
    });
    toast.success(`Region set to ${r.name}`, {
      description: `Currency ${r.currency}, ${r.tax.name}, attendance codes, ID fields, vetting checks and statutory returns now follow ${r.name} defaults. Calendars are kept.`,
    });
    setRegionDraft(null);
  };

  const region = ctx.region;
  const codeSet = codeSetById(profile.codeSetId);
  const returns = returnsFor(profile.region, profile.type, profile.subRegion);
  const otherProfilesInRegion = profiles.filter(
    (p) => p.region === profile.region && p.tenantId !== profile.tenantId,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution Profile"
        subtitle="Foundations every pack builds on — region defaults, academic calendars, attendance codes and official identifiers. Set per tenant; nothing is fixed per country in code."
        actions={
          <Link to="/app/settings">
            <Button variant="outline">Packs & modules</Button>
          </Link>
        }
      />
      <PackContextBar />

      {/* ── Region ─────────────────────────────────────────────── */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" /> Region & country defaults
          </span>
        }
        description="The region supplies defaults; this tenant can override calendars, code set and identifiers below."
        actions={
          canEdit && (
            <Select
              value={regionDraft ?? profile.region}
              onChange={(e) => setRegionDraft(e.target.value as RegionCode)}
              options={REGION_LIST.map((r) => ({ value: r.code, label: `${r.flag} ${r.name}` }))}
            />
          )
        }
      >
        {regionDraft && regionDraft !== profile.region && (
          <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs flex flex-wrap items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-warning-foreground" />
            <span className="flex-1 min-w-[220px]">
              Switch to <b>{REGIONS[regionDraft].name}</b>? Attendance code set and ID fields reset
              to that country's defaults. Currency changes for new pricing only — existing ledgers
              stay in their original currency.
            </span>
            <Button size="sm" variant="outline" onClick={() => setRegionDraft(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => applyRegion(regionDraft)}>
              Apply {REGIONS[regionDraft].name} defaults
            </Button>
          </div>
        )}
        {region.subRegions && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs rounded-lg border bg-muted/30 px-3 py-2">
            <span className="font-medium">Sub-jurisdiction</span>
            <Select
              className="h-8 w-56"
              value={profile.subRegion ?? ""}
              disabled={!canEdit}
              onChange={(e) => {
                patch({ subRegion: e.target.value || undefined });
                const sr = region.subRegions?.find((x) => x.code === e.target.value);
                if (sr)
                  toast.success(`Regulator set to ${sr.regulator} (${sr.name})`, {
                    description: "Statutory returns now follow this sub-jurisdiction.",
                  });
              }}
              options={[
                { value: "", label: "Not set — sub-regional returns hidden" },
                ...region.subRegions.map((s) => ({
                  value: s.code,
                  label: `${s.name} — ${s.regulator}`,
                })),
              ]}
            />
            <span className="text-muted-foreground">
              Regulators differ within {region.name} (e.g. emirate or state), so returns are
              filtered by it.
            </span>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Fact
            label="Currency & tax"
            value={`${region.currency} · ${region.tax.name} ${Math.round(region.tax.rate * 100)}%`}
            hint={region.tax.note}
          />
          <Fact label="Data protection" value={region.dataProtection} />
          <Fact label="Payment gateways" value={region.paymentGateways.join(", ")} />
          <Fact
            label="Credit scheme"
            value={region.creditScheme}
            hint={`Exam boards: ${region.examBoards.slice(0, 3).join(", ")}…`}
          />
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <div className="rounded-lg border p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Statutory returns ({returns.length})
            </div>
            {returns.length === 0 ? (
              <div className="text-xs text-muted-foreground">None configured for this segment.</div>
            ) : (
              <ul className="space-y-1 text-xs">
                {returns.map((r) => (
                  <li key={r.key}>
                    <span className="font-medium">{r.name}</span>{" "}
                    <span className="text-muted-foreground">· {r.regulator}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Staff vetting checks ({region.vettingChecks.length})
            </div>
            <ul className="space-y-1 text-xs">
              {region.vettingChecks.map((v) => (
                <li key={v.key}>
                  {v.label}
                  {v.renewMonths && (
                    <span className="text-muted-foreground"> · renew {v.renewMonths}m</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Visa / sponsor monitoring
            </div>
            {region.visaMonitoring ? (
              <div className="text-xs space-y-1">
                <div className="font-medium">{region.visaMonitoring.body}</div>
                <div className="text-muted-foreground">{region.visaMonitoring.rule}</div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No statutory attendance monitoring rule.
              </div>
            )}
            <label className="mt-3 flex items-center justify-between gap-2 text-xs">
              <span>This institution holds a sponsor licence</span>
              <Switch
                checked={!!profile.visaSponsor}
                disabled={!canEdit}
                onCheckedChange={(v) => patch({ visaSponsor: v })}
              />
            </label>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          {otherProfilesInRegion} other tenant(s) on this platform use the {region.name} profile.
          Regulatory detail is demo-grade — each country's compliance pack confirms it before
          production.
        </p>
      </Section>

      {/* ── Calendars ──────────────────────────────────────────── */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Academic calendars
          </span>
        }
        description="One or more calendars per tenant — e.g. a British and a CBSE stream in one school, or September and January university intakes. Reports, 'this term' figures and fees follow the learner's calendar."
        actions={
          canEdit && (
            <Button size="sm" onClick={() => setCalOpen(true)}>
              <Plus className="h-4 w-4" /> Add calendar
            </Button>
          )
        }
      >
        {mine.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No calendar yet — add one from the {region.name} template.
          </div>
        ) : (
          <div className="space-y-4">
            {mine.map((c) => (
              <CalendarCard
                key={c.id}
                cal={c}
                canEdit={canEdit}
                onAddTerm={() => setTermFor(c)}
                onAction={setCalAction}
                onMakeDefault={() => {
                  for (const x of mine) {
                    updateItem("academicCalendars", (r) => r.id === x.id, {
                      isDefault: x.id === c.id,
                    });
                  }
                  auditLog(
                    ctx.tenantId,
                    "calendar",
                    c.id,
                    "Default calendar",
                    undefined,
                    c.name,
                    ctx.actingAs,
                  );
                  toast.success(`${c.name} is now the default calendar`);
                }}
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-muted-foreground">
          {(Object.keys(KIND_COLOUR) as TermKind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-4 rounded-sm", KIND_COLOUR[k])} />
              {k}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-destructive" /> today ({DEMO_TODAY})
          </span>
        </div>
      </Section>

      <IntakesSection canEdit={canEdit} />

      <GradingSchemeSection canEdit={canEdit} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Attendance codes ─────────────────────────────────── */}
        <Section
          title={
            <span className="inline-flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" /> Attendance code set
            </span>
          }
          description={codeSet.description}
          actions={
            canEdit && (
              <Select
                value={profile.codeSetId}
                onChange={(e) => {
                  patch({ codeSetId: e.target.value });
                  toast.success(
                    `Attendance registers now use "${codeSetById(e.target.value).name}"`,
                  );
                }}
                options={ATTENDANCE_CODE_SETS.map((s) => ({ value: s.id, label: s.name }))}
              />
            )
          }
        >
          <div className="max-h-[340px] overflow-y-auto -mx-1 px-1">
            <table className="w-full text-xs">
              <tbody>
                {codeSet.codes.map((c) => (
                  <tr key={c.code} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-mono font-semibold w-12">{c.code}</td>
                    <td className="py-1.5 pr-3">{c.label}</td>
                    <td className="py-1.5 text-right">
                      <Badge tone={MEANING_TONE[c.meaning]}>{MEANING_LABEL[c.meaning]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Identifiers & pricing ───────────────────────────── */}
        <div className="space-y-6">
          <Section
            title={
              <span className="inline-flex items-center gap-2">
                <IdCard className="h-4 w-4 text-primary" /> Official identifiers
              </span>
            }
            description="Fields captured on every student record. Region defaults are starred; sensitive ids are stored masked."
          >
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.values(ID_FIELDS)
                .filter((f) => !f.segments || f.segments.includes(profile.type))
                .sort(
                  (a, b) =>
                    Number(region.idFields.includes(b.key)) -
                    Number(region.idFields.includes(a.key)),
                )
                .map((f) => {
                  const on = profile.idFields.includes(f.key);
                  return (
                    <label
                      key={f.key}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border p-2 text-xs cursor-pointer",
                        on ? "bg-card" : "bg-muted/20 border-dashed",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={on}
                        disabled={!canEdit}
                        onChange={(e) =>
                          patch({
                            idFields: e.target.checked
                              ? [...profile.idFields, f.key]
                              : profile.idFields.filter((k) => k !== f.key),
                          })
                        }
                      />
                      <span className="min-w-0">
                        <span className="font-medium inline-flex items-center gap-1">
                          {f.label}
                          {region.idFields.includes(f.key) && (
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          )}
                          {f.sensitive && <Badge tone="muted">masked</Badge>}
                        </span>
                        <span className="block text-muted-foreground">{f.hint}</span>
                      </span>
                    </label>
                  );
                })}
            </div>
          </Section>

          <Section
            title={
              <span className="inline-flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Pricing currency
              </span>
            }
            description="Ledgers stay in the tenant currency. A second pricing currency shows prices alongside (e.g. USD-priced boarding at an AED school)."
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Tenant currency" hint="From the region; locked after the first invoice">
                <TextInput value={region.currency} disabled />
              </Field>
              <Field label="Second pricing currency">
                <Select
                  value={profile.secondCurrency ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => patch({ secondCurrency: e.target.value || undefined })}
                  options={SECOND_CURRENCIES.filter((c) => c !== region.currency).map((c) => ({
                    value: c,
                    label: c || "None",
                  }))}
                />
              </Field>
            </div>
          </Section>

          <StudentAccountsSection
            policy={profile.studentAccounts}
            canEdit={canEdit}
            onChange={(studentAccounts) => patch({ studentAccounts })}
          />

          <Section title="Active packs">
            {profile.packs.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No institution pack — this tenant runs the core platform.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.packs.map((p) => (
                  <span
                    key={p}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-white bg-gradient-to-r",
                      PACK_BY_ID[p].tone,
                    )}
                  >
                    <LucideIcon name={PACK_BY_ID[p].icon} className="h-3.5 w-3.5" />
                    {PACK_BY_ID[p].name}
                  </span>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <NewCalendarDialog
        open={calOpen}
        onOpenChange={setCalOpen}
        tenantId={ctx.tenantId}
        hasDefault={mine.some((c) => c.isDefault)}
      />
      <NewTermDialog cal={termFor} onClose={() => setTermFor(null)} />
      {calAction && (
        <CalendarActionDialog
          key={`${calAction.kind}-${calAction.cal.id}-${calAction.kind === "editTerm" || calAction.kind === "deleteTerm" ? calAction.term.id : ""}`}
          action={calAction}
          onClose={() => setCalAction(null)}
        />
      )}
    </div>
  );
}

const DEFAULT_POLICY: StudentAccountPolicy = {
  provider: "native",
  bands: [],
  defaultMode: "own",
  rosterSync: false,
};

/** Student accounts & sign-in — provider, domain and who uses the account per stage. */
function StudentAccountsSection({
  policy,
  canEdit,
  onChange,
}: {
  policy: StudentAccountPolicy | undefined;
  canEdit: boolean;
  onChange: (p: StudentAccountPolicy) => void;
}) {
  const p = policy ?? DEFAULT_POLICY;
  const learners = useCollection("learners");
  const { tenantId } = useTenantContext();
  const mine = learners.filter((l) => l.tenantId === tenantId);
  const modeOptions = (Object.keys(ACCOUNT_MODE_LABEL) as AccountMode[]).map((m) => ({
    value: m,
    label: ACCOUNT_MODE_LABEL[m],
  }));
  const countFor = (levels: string[]) => mine.filter((l) => levels.includes(l.level)).length;
  const listed = new Set(p.bands.flatMap((b) => b.levels));
  return (
    <Section
      title={
        <span className="inline-flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Student accounts & sign-in
        </span>
      }
      description="Pupils sign in with the school-issued account (single sign-on). Choose per stage who uses it — younger pupils' accounts are often used by the family; consents then need the guardian's one-time code."
    >
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Identity provider">
          <Select
            value={p.provider}
            disabled={!canEdit}
            onChange={(e) => onChange({ ...p, provider: e.target.value as SignInProvider })}
            options={(Object.keys(PROVIDER_LABEL) as SignInProvider[]).map((v) => ({
              value: v,
              label: PROVIDER_LABEL[v],
            }))}
          />
        </Field>
        <Field label="Student email domain" hint="Sign-in routes this domain to the provider">
          <TextInput
            value={p.domain ?? ""}
            disabled={!canEdit || p.provider === "native"}
            placeholder="students.school.edu"
            onChange={(e) => onChange({ ...p, domain: e.target.value.trim() || undefined })}
          />
        </Field>
        <Field label="Roster sync" hint="Create / disable accounts from Student Records">
          <label className="h-10 flex items-center gap-2 text-sm">
            <Switch
              checked={p.rosterSync}
              disabled={!canEdit || p.provider === "native"}
              onCheckedChange={(v) => onChange({ ...p, rosterSync: v })}
            />
            {p.rosterSync ? "On — leavers disabled on withdrawal" : "Off"}
          </label>
        </Field>
      </div>
      <div className="mt-4 rounded-lg border divide-y">
        {p.bands.map((b, i) => (
          <div key={b.label} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
            <div className="flex-1 min-w-[180px]">
              <div className="font-medium">{b.label}</div>
              <div className="text-[11px] text-muted-foreground">
                {b.levels.join(", ")} · {countFor(b.levels)} students
              </div>
            </div>
            <div className="w-56">
              <Select
                value={b.mode}
                disabled={!canEdit}
                onChange={(e) =>
                  onChange({
                    ...p,
                    bands: p.bands.map((x, j) =>
                      j === i ? { ...x, mode: e.target.value as AccountMode } : x,
                    ),
                  })
                }
                options={modeOptions}
              />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
          <div className="flex-1 min-w-[180px]">
            <div className="font-medium">All other year groups</div>
            <div className="text-[11px] text-muted-foreground">
              {mine.filter((l) => !listed.has(l.level)).length} students
            </div>
          </div>
          <div className="w-56">
            <Select
              value={p.defaultMode}
              disabled={!canEdit}
              onChange={(e) => onChange({ ...p, defaultMode: e.target.value as AccountMode })}
              options={modeOptions}
            />
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Parents can always also have their own 1StudentID parent login (one login for every child,
        at every institution).
      </p>
    </Section>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

const day = (iso: string) => new Date(iso + "T00:00:00Z").getTime();
const fmt = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function CalendarCard({
  cal,
  canEdit,
  onAddTerm,
  onMakeDefault,
  onAction,
}: {
  cal: AcademicCalendar;
  canEdit: boolean;
  onAddTerm: () => void;
  onMakeDefault: () => void;
  onAction: (a: CalAction) => void;
}) {
  const start = day(cal.start);
  const span = Math.max(1, day(cal.end) - start);
  const pct = (iso: string) => Math.min(100, Math.max(0, ((day(iso) - start) / span) * 100));
  const now = currentTerm(cal);
  const todayPct = DEMO_TODAY >= cal.start && DEMO_TODAY <= cal.end ? pct(DEMO_TODAY) : null;
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
            {cal.name}
            {cal.isDefault && <Badge tone="success">Default</Badge>}
            <Badge tone="muted">{cal.periodType}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {cal.appliesTo} · {fmt(cal.start)} – {fmt(cal.end)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {now ? (
            <Badge tone="info">Now: {now.name}</Badge>
          ) : (
            <Badge tone="muted">{DEMO_TODAY < cal.start ? "Not started" : "Ended"}</Badge>
          )}
          {canEdit && !cal.isDefault && (
            <Button size="sm" variant="ghost" onClick={onMakeDefault}>
              <Check className="h-3.5 w-3.5" /> Make default
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={onAddTerm}>
              <Plus className="h-3.5 w-3.5" /> Term
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Edit ${cal.name}`}
              onClick={() => onAction({ kind: "edit", cal })}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Delete ${cal.name}`}
              onClick={() => onAction({ kind: "delete", cal })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="relative h-7 mt-3 rounded-md bg-muted/40 overflow-hidden">
        {cal.terms.map((t) => (
          <div
            key={t.id}
            title={`${t.name}: ${fmt(t.start)} – ${fmt(t.end)}`}
            className={cn(
              "absolute top-1 bottom-1 rounded-sm",
              KIND_COLOUR[t.kind],
              t.kind !== "teaching" && "top-3 bottom-0.5",
            )}
            style={{
              left: `${pct(t.start)}%`,
              width: `${Math.max(0.8, pct(t.end) - pct(t.start))}%`,
            }}
          />
        ))}
        {todayPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-destructive"
            style={{ left: `${todayPct}%` }}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
        {cal.terms.map((t) => (
          <span
            key={t.id}
            className={cn(
              "inline-flex items-center gap-1",
              now?.id === t.id && "text-foreground font-medium",
            )}
          >
            {canEdit ? (
              <button
                className="hover:underline hover:text-foreground"
                title="Edit period"
                onClick={() => onAction({ kind: "editTerm", cal, term: t })}
              >
                {t.name}: {fmt(t.start)} – {fmt(t.end)}
              </button>
            ) : (
              <>
                {t.name}: {fmt(t.start)} – {fmt(t.end)}
              </>
            )}
            {canEdit && (
              <button
                className="hover:text-destructive"
                aria-label={`Delete ${t.name}`}
                title="Delete period"
                onClick={() => onAction({ kind: "deleteTerm", cal, term: t })}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Calendar edit / delete ──────────────────────────────────────────────── */

type CalAction =
  | { kind: "edit" | "delete"; cal: AcademicCalendar }
  | { kind: "editTerm" | "deleteTerm"; cal: AcademicCalendar; term: AcademicTerm };

function auditLog(
  tenantId: string,
  entity: string,
  entityId: string,
  field: string,
  from: string | undefined,
  to: string | undefined,
  by: string,
  reason?: string,
) {
  logChange({ tenantId, entity, entityId, field, from, to, by: by || "Admin", reason });
}

const PERIOD_TYPES: AcademicCalendar["periodType"][] = [
  "Terms",
  "Semesters",
  "Trimesters",
  "Blocks",
];
const TERM_KINDS: TermKind[] = ["teaching", "exams", "break", "resit", "induction"];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Everything that points at a calendar, by label → count. */
function useCalendarUsage(cal: AcademicCalendar) {
  const learners = useCollection("learners");
  const curricula = useCollection("curricula");
  const programmes = useCollection("programmes");
  const intakes = useCollection("intakes");
  const slots = useCollection("timetableSlots");
  const t = cal.tenantId;
  const n = <T extends { tenantId: string; calendarId?: string }>(rows: T[]) =>
    rows.filter((r) => r.tenantId === t && r.calendarId === cal.id).length;
  return [
    ["learner", n(learners)],
    ["curriculum", n(curricula)],
    ["programme", n(programmes)],
    ["intake", n(intakes)],
    ["timetable slot", n(slots)],
  ].filter(([, c]) => (c as number) > 0) as [string, number][];
}

const many = (n: number, one: string) =>
  `${n} ${n === 1 ? one : one === "curriculum" ? "curricula" : `${one}s`}`;

function CalendarActionDialog({ action, onClose }: { action: CalAction; onClose: () => void }) {
  const ctx = useTenantContext();
  const all = useCollection("academicCalendars");
  const cal = action.cal;
  const usage = useCalendarUsage(cal);
  const close = (v: boolean) => !v && onClose();
  const by = ctx.actingAs;
  const term = action.kind === "editTerm" || action.kind === "deleteTerm" ? action.term : undefined;
  const [f, setF] = useState({
    name: cal.name,
    appliesTo: cal.appliesTo,
    academicYear: cal.academicYear,
    start: cal.start,
    end: cal.end,
    periodType: cal.periodType as string,
  });
  const [t, setT] = useState({
    name: term?.name ?? "",
    start: term?.start ?? "",
    end: term?.end ?? "",
    kind: (term?.kind ?? "teaching") as string,
  });

  if (action.kind === "edit")
    return (
      <FormDialog
        open
        onOpenChange={close}
        title={`Edit ${cal.name}`}
        submitLabel="Save calendar"
        onSubmit={() => {
          if (!f.name.trim() || !f.start || !f.end || f.end <= f.start) {
            toast.error("Give a name and a valid start/end");
            return;
          }
          const first = cal.terms.reduce((a, x) => (x.start < a ? x.start : a), f.start);
          const last = cal.terms.reduce((a, x) => (x.end > a ? x.end : a), f.end);
          if (first < f.start || last > f.end) {
            toast.error(`Periods run ${first} – ${last}; the calendar must cover them`);
            return;
          }
          const next = {
            name: f.name.trim(),
            appliesTo: f.appliesTo.trim() || "—",
            academicYear: f.academicYear.trim() || cal.academicYear,
            start: f.start,
            end: f.end,
            periodType: f.periodType as AcademicCalendar["periodType"],
          };
          const labels: Record<keyof typeof next, string> = {
            name: "Name",
            appliesTo: "Applies to",
            academicYear: "Academic year",
            start: "Start",
            end: "End",
            periodType: "Period type",
          };
          const changed = (Object.keys(next) as (keyof typeof next)[]).filter(
            (k) => cal[k] !== next[k],
          );
          if (changed.length) {
            updateItem("academicCalendars", (c) => c.id === cal.id, next);
            for (const k of changed)
              auditLog(cal.tenantId, "calendar", cal.id, labels[k], cal[k], next[k], by);
            toast.success(`${next.name} updated`);
          }
          onClose();
        }}
      >
        <Field label="Name" required className="sm:col-span-2">
          <TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Applies to" className="sm:col-span-2">
          <TextInput
            value={f.appliesTo}
            onChange={(e) => setF({ ...f, appliesTo: e.target.value })}
          />
        </Field>
        <Field label="Academic year">
          <TextInput
            value={f.academicYear}
            onChange={(e) => setF({ ...f, academicYear: e.target.value })}
          />
        </Field>
        <Field label="Period type">
          <Select
            value={f.periodType}
            onChange={(e) => setF({ ...f, periodType: e.target.value })}
            options={PERIOD_TYPES.map((p) => ({ value: p, label: p }))}
          />
        </Field>
        <Field label="Start">
          <TextInput
            type="date"
            value={f.start}
            onChange={(e) => setF({ ...f, start: e.target.value })}
          />
        </Field>
        <Field label="End">
          <TextInput
            type="date"
            value={f.end}
            onChange={(e) => setF({ ...f, end: e.target.value })}
          />
        </Field>
      </FormDialog>
    );

  if (action.kind === "delete") {
    const others = all.filter((c) => c.tenantId === cal.tenantId && c.id !== cal.id);
    const reasons = [
      ...(cal.isDefault
        ? [
            others.length
              ? "It is the default calendar — make another one the default first"
              : "It is the only calendar for this institution",
          ]
        : []),
      ...usage.map(([what, c]) => `${many(c, what)} use${c === 1 ? "s" : ""} it`),
    ];
    if (reasons.length)
      return (
        <FormDialog
          open
          onOpenChange={close}
          title={`Can't delete ${cal.name}`}
          submitLabel="OK"
          cancelLabel="Close"
          onSubmit={onClose}
        >
          <ul className="sm:col-span-2 text-sm list-disc pl-5 space-y-1">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Move them to another calendar first (Student Records, curricula, programmes, intakes),
            then delete.
          </p>
        </FormDialog>
      );
    return (
      <FormDialog
        open
        onOpenChange={close}
        title={`Delete ${cal.name}?`}
        submitLabel="Delete calendar"
        submitVariant="destructive"
        onSubmit={() => {
          removeItem("academicCalendars", (c) => c.id === cal.id);
          auditLog(cal.tenantId, "calendar", cal.id, "Calendar deleted", cal.name, "—", by);
          toast.success(`${cal.name} deleted`);
          onClose();
        }}
      >
        <p className="sm:col-span-2 text-sm">
          Nothing uses this calendar. It and its {cal.terms.length} periods will be removed.
        </p>
      </FormDialog>
    );
  }

  if (action.kind === "editTerm" && term)
    return (
      <FormDialog
        open
        onOpenChange={close}
        title={`Edit ${term.name}`}
        description={cal.name}
        submitLabel="Save period"
        onSubmit={() => {
          if (!t.name.trim() || !t.start || !t.end || t.end < t.start) {
            toast.error("Give the period a name and a valid start/end");
            return;
          }
          const next: AcademicTerm = {
            id: term.id,
            name: t.name.trim(),
            start: t.start,
            end: t.end,
            kind: t.kind as TermKind,
          };
          const terms = cal.terms
            .map((x) => (x.id === term.id ? next : x))
            .sort((a, b) => a.start.localeCompare(b.start));
          updateItem("academicCalendars", (c) => c.id === cal.id, {
            terms,
            start: next.start < cal.start ? next.start : cal.start,
            end: next.end > cal.end ? next.end : cal.end,
          });
          auditLog(
            cal.tenantId,
            "calendar",
            cal.id,
            `Period ${term.name}`,
            `${term.name} · ${term.start} – ${term.end} · ${term.kind}`,
            `${next.name} · ${next.start} – ${next.end} · ${next.kind}`,
            by,
          );
          toast.success(`${next.name} updated`);
          onClose();
        }}
      >
        <Field label="Name" className="sm:col-span-2">
          <TextInput value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
        </Field>
        <Field label="Start">
          <TextInput
            type="date"
            value={t.start}
            onChange={(e) => setT({ ...t, start: e.target.value })}
          />
        </Field>
        <Field label="End">
          <TextInput
            type="date"
            value={t.end}
            onChange={(e) => setT({ ...t, end: e.target.value })}
          />
        </Field>
        <Field label="Kind" className="sm:col-span-2">
          <Select
            value={t.kind}
            onChange={(e) => setT({ ...t, kind: e.target.value })}
            options={TERM_KINDS.map((k) => ({ value: k, label: cap(k) }))}
          />
        </Field>
      </FormDialog>
    );

  // Delete a period.
  if (!term) return null;
  const teaching = cal.terms.filter((x) => x.kind === "teaching");
  const current = term.start <= DEMO_TODAY && DEMO_TODAY <= term.end;
  const lastTeaching = term.kind === "teaching" && teaching.length <= 1;
  if (current || lastTeaching)
    return (
      <FormDialog
        open
        onOpenChange={close}
        title={`Can't delete ${term.name}`}
        submitLabel="OK"
        cancelLabel="Close"
        onSubmit={onClose}
      >
        <p className="sm:col-span-2 text-sm">
          {current
            ? "It is running now — attendance, 'this term' figures and fees depend on it. Edit its dates instead."
            : "It is the only teaching period. Module runs and fees need at least one."}
        </p>
      </FormDialog>
    );
  return (
    <FormDialog
      open
      onOpenChange={close}
      title={`Delete ${term.name}?`}
      description={cal.name}
      submitLabel="Delete period"
      submitVariant="destructive"
      onSubmit={() => {
        updateItem("academicCalendars", (c) => c.id === cal.id, {
          terms: cal.terms.filter((x) => x.id !== term.id),
        });
        auditLog(
          cal.tenantId,
          "calendar",
          cal.id,
          "Period deleted",
          `${term.name} · ${term.start} – ${term.end}`,
          "—",
          by,
        );
        toast.success(`${term.name} removed from ${cal.name}`);
        onClose();
      }}
    >
      <p className="sm:col-span-2 text-sm">
        {term.end < DEMO_TODAY
          ? "This period has already ended. Past reports that grouped by it will show the remaining periods only."
          : `${fmt(term.start)} – ${fmt(term.end)} (${term.kind}) will be removed.`}
      </p>
    </FormDialog>
  );
}

function NewCalendarDialog({
  open,
  onOpenChange,
  tenantId,
  hasDefault,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  hasDefault: boolean;
}) {
  const ctx = useTenantContext();
  const tpl = ctx.region.calendarTemplate[ctx.type] ?? ctx.region.calendarTemplate.school;
  const [name, setName] = useState("");
  const [appliesTo, setAppliesTo] = useState("");
  const [startMonth, setStartMonth] = useState(String(tpl?.startMonth ?? 9));
  const [year, setYear] = useState("2027");
  const submit = () => {
    const sm = Number(startMonth);
    const y = Number(year);
    const startD = new Date(Date.UTC(y, sm - 1, 1));
    const endD = new Date(Date.UTC(y + 1, sm - 1, 0));
    const periods = tpl?.periods ?? ["Term 1", "Term 2", "Term 3"];
    const total = endD.getTime() - startD.getTime();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const terms = periods.map((p, i) => {
      const s = new Date(startD.getTime() + (total * i) / periods.length);
      const e = new Date(startD.getTime() + (total * (i + 1)) / periods.length - 7 * 86400000);
      return { id: `p${i + 1}`, name: p, start: iso(s), end: iso(e), kind: "teaching" as const };
    });
    const id = `CAL-${tenantId.replace("T-", "")}${String(Date.now()).slice(-3)}`;
    addItem("academicCalendars", {
      id,
      tenantId,
      name: name || `${ctx.region.name} template ${y}–${String(y + 1).slice(-2)}`,
      appliesTo: appliesTo || "New stream / intake",
      academicYear: sm === 1 ? String(y) : `${y}–${String(y + 1).slice(-2)}`,
      start: iso(startD),
      end: iso(endD),
      periodType: periods.some((p) => /semester/i.test(p)) ? "Semesters" : "Terms",
      terms,
      isDefault: !hasDefault,
    });
    auditLog(tenantId, "calendar", id, "Calendar created", undefined, name || `${y}`, ctx.actingAs);
    toast.success("Calendar created from the region template", {
      description: "Adjust term dates with “+ Term” — nothing is fixed by country.",
    });
    onOpenChange(false);
  };
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add academic calendar"
      description={`Starts from the ${ctx.region.name} template: ${tpl?.note || "configurable periods"}.`}
      onSubmit={submit}
      submitLabel="Create calendar"
    >
      <Field label="Name" className="sm:col-span-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. IB Diploma 2027–28"
        />
      </Field>
      <Field label="Applies to" className="sm:col-span-2">
        <TextInput
          value={appliesTo}
          onChange={(e) => setAppliesTo(e.target.value)}
          placeholder="e.g. January intake — MSc programmes"
        />
      </Field>
      <Field label="Start month">
        <Select
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
          options={months.map((m, i) => ({ value: String(i + 1), label: m }))}
        />
      </Field>
      <Field label="Start year">
        <TextInput value={year} onChange={(e) => setYear(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

function NewTermDialog({ cal, onClose }: { cal: AcademicCalendar | null; onClose: () => void }) {
  const ctx = useTenantContext();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [kind, setKind] = useState<TermKind>("teaching");
  if (!cal) return null;
  const submit = () => {
    if (!name || !start || !end || end < start) {
      toast.error("Give the term a name and a valid start/end");
      return;
    }
    const terms = [...cal.terms, { id: `x${Date.now()}`, name, start, end, kind }].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    updateItem("academicCalendars", (c) => c.id === cal.id, {
      terms,
      start: start < cal.start ? start : cal.start,
      end: end > cal.end ? end : cal.end,
    });
    auditLog(
      cal.tenantId,
      "calendar",
      cal.id,
      "Period added",
      undefined,
      `${name} · ${start} – ${end} · ${kind}`,
      ctx.actingAs,
    );
    toast.success(`${name} added to ${cal.name}`);
    setName("");
    setStart("");
    setEnd("");
    onClose();
  };
  return (
    <FormDialog
      open={!!cal}
      onOpenChange={(v) => !v && onClose()}
      title={`Add period to ${cal.name}`}
      onSubmit={submit}
      submitLabel="Add"
    >
      <Field label="Name" className="sm:col-span-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mock exams"
        />
      </Field>
      <Field label="Start">
        <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      <Field label="End">
        <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </Field>
      <Field label="Kind" className="sm:col-span-2">
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as TermKind)}
          options={(["teaching", "exams", "break", "resit", "induction"] as TermKind[]).map(
            (k) => ({
              value: k,
              label: k[0].toUpperCase() + k.slice(1),
            }),
          )}
        />
      </Field>
    </FormDialog>
  );
}

/* ── Intakes ─────────────────────────────────────────────────────────────── */

const INTAKE_TONE: Record<IntakeStatus, "info" | "success" | "muted" | "warning"> = {
  Upcoming: "muted",
  Open: "success",
  Closed: "warning",
  Started: "info",
};

/** Offerings an intake can be scoped to: curricula, programmes, qualifications. */
function useOfferings(tenantId: string) {
  const curricula = useCollection("curricula");
  const programmes = useCollection("programmes");
  const quals = useCollection("qualifications");
  return useMemo(
    () => [
      ...curricula.filter((c) => c.tenantId === tenantId).map((c) => ({ id: c.id, label: c.name })),
      ...programmes
        .filter((p) => p.tenantId === tenantId)
        .map((p) => ({ id: p.id, label: `${p.award} ${p.name}` })),
      ...quals
        .filter((q) => q.tenantId === tenantId)
        .map((q) => ({ id: q.id, label: `${q.code} ${q.title}` })),
    ],
    [curricula, programmes, quals, tenantId],
  );
}

function IntakesSection({ canEdit }: { canEdit: boolean }) {
  const ctx = useTenantContext();
  const allIntakes = useCollection("intakes");
  const allApps = useCollection("applications");
  const calendars = useCollection("academicCalendars");
  const offerings = useOfferings(ctx.tenantId);
  const allLearners = useCollection("learners");
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState<{ kind: "edit" | "delete" | "close"; intake: Intake } | null>(
    null,
  );
  const intakes = allIntakes.filter((i) => i.tenantId === ctx.tenantId);
  const learnersOn = (i: Intake) =>
    allLearners.filter(
      (l) => l.tenantId === ctx.tenantId && (l.intakeId === i.id || l.intake === i.name),
    );
  const apps = allApps.filter((a) => a.tenantId === ctx.tenantId);
  const census = CENSUS_DATE_REGIONS.includes(ctx.region.code);
  const templates = INTAKE_TEMPLATES[ctx.region.code]?.[ctx.type] ?? [];
  const sorted = [...intakes].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <Section
      title={
        <span className="inline-flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-primary" /> Intakes & start dates
        </span>
      }
      description="Dated entry points, each scoped to the programmes / curricula it admits to and bound to a calendar. Intakes differ by region, institution and programme — start from the region templates, then override."
      actions={
        canEdit && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add intake
          </Button>
        )
      }
    >
      {templates.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {ctx.region.flag} {ctx.region.name} typical entry points:
          {templates.map((t) => (
            <Badge key={t.name} tone="muted">
              {t.name}
              {t.kind === "Rolling" && " · rolling"}
            </Badge>
          ))}
        </div>
      )}
      <DataTable
        columns={[
          { key: "name", label: "Intake" },
          { key: "scope", label: "Admits to" },
          { key: "window", label: "Applications" },
          { key: "start", label: census ? "Start · census" : "Start" },
          { key: "fill", label: "Places" },
          { key: "status", label: "Status" },
          ...(canEdit ? [{ key: "_actions", label: "", className: "text-right" }] : []),
        ]}
        rows={sorted}
        emptyText="No intakes yet — add one from a region template."
        renderCell={(i: Intake, key) => {
          if (key === "name")
            return (
              <span>
                <span className="font-medium">{i.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {i.kind} · {calendars.find((c) => c.id === i.calendarId)?.name ?? "—"}
                </span>
              </span>
            );
          if (key === "scope")
            return (
              <span className="text-xs">
                {i.scopeLabel}
                {i.scope.length > 0 && (
                  <span className="block text-[11px] text-muted-foreground">
                    {i.scope.map((s) => offerings.find((o) => o.id === s)?.label ?? s).join(" · ")}
                  </span>
                )}
              </span>
            );
          if (key === "window")
            return (
              <span className="text-xs">
                {fmt(i.opens)} → <b>{fmt(i.deadline)}</b>
              </span>
            );
          if (key === "start")
            return (
              <span className="text-xs">
                {i.kind === "Rolling"
                  ? `Any Monday ${fmt(i.start)} – ${fmt(i.lastStart ?? i.deadline)}`
                  : fmt(i.start)}
                {i.census && (
                  <span className="block text-[11px] text-muted-foreground">
                    Census {fmt(i.census)}
                  </span>
                )}
              </span>
            );
          if (key === "fill") {
            const mine = apps.filter((a) => a.intake === i.name);
            const committed = mine.filter((a) =>
              ["Accepted", "Deposit paid", "Enrolled"].includes(a.stage),
            ).length;
            const pct = Math.min(100, Math.round((committed / Math.max(1, i.capacity)) * 100));
            return (
              <div className="w-32">
                <div className="text-xs">
                  {committed} / {i.capacity}{" "}
                  <span className="text-muted-foreground">· {mine.length} apps</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          }
          if (key === "status") {
            const st = intakeStatus(i);
            return <Badge tone={INTAKE_TONE[st]}>{st}</Badge>;
          }
          if (key === "_actions") {
            const st = intakeStatus(i);
            return (
              <div className="flex justify-end gap-0.5">
                {(st === "Open" || st === "Upcoming") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Close to applications"
                    onClick={() => setAct({ kind: "close", intake: i })}
                  >
                    <Lock className="h-3.5 w-3.5" /> Close
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${i.name}`}
                  onClick={() => setAct({ kind: "edit", intake: i })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${i.name}`}
                  onClick={() => setAct({ kind: "delete", intake: i })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          }
          return null;
        }}
      />
      {ctx.type === "school" && (
        <div className="mt-4 rounded-lg border p-3 text-xs">
          <div className="font-medium mb-1">Year-group placement by age (per curriculum)</div>
          <div className="grid sm:grid-cols-2 gap-1 text-muted-foreground">
            {Object.entries(PLACEMENT_RULES).map(([fw, r]) => (
              <div key={fw}>
                <span className="text-foreground">{fw}:</span> cut-off{" "}
                {r.cutoff.split("-").reverse().join("/")} — {r.note}
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Admissions suggests the year group from date of birth; staff can override.
          </div>
        </div>
      )}
      {open && <NewIntakeDialog open onOpenChange={setOpen} offerings={offerings} />}
      {act?.kind === "edit" && (
        <NewIntakeDialog
          key={act.intake.id}
          open
          onOpenChange={(v) => !v && setAct(null)}
          offerings={offerings}
          intake={act.intake}
          usage={{
            apps: apps.filter((a) => a.intake === act.intake.name).length,
            learners: learnersOn(act.intake).length,
          }}
        />
      )}
      {act?.kind === "close" && (
        <FormDialog
          open
          onOpenChange={(v) => !v && setAct(null)}
          title={`Close ${act.intake.name}?`}
          submitLabel="Close intake"
          onSubmit={() => {
            const i = act.intake;
            const y = new Date(DEMO_TODAY + "T00:00:00Z");
            y.setUTCDate(y.getUTCDate() - 1);
            const yesterday = y.toISOString().slice(0, 10);
            updateItem("intakes", (x) => x.id === i.id, {
              deadline: yesterday,
              opens: i.opens > yesterday ? yesterday : i.opens,
              lastStart: i.kind === "Rolling" ? (i.lastStart ?? i.deadline) : i.lastStart,
            });
            auditLog(
              ctx.tenantId,
              "intake",
              i.id,
              "Application deadline",
              i.deadline,
              `${yesterday} (closed early)`,
              ctx.actingAs,
            );
            toast.success(`${i.name} closed to new applications`, {
              description: "Existing applications and learners are unchanged.",
            });
            setAct(null);
          }}
        >
          <p className="sm:col-span-2 text-sm">
            No new applications will be accepted. Existing applications, offers and enrolled
            learners keep it. Reopen by editing the deadline.
          </p>
        </FormDialog>
      )}
      {act?.kind === "delete" &&
        (() => {
          const i = act.intake;
          const nApps = apps.filter((a) => a.intake === i.name).length;
          const nLearners = learnersOn(i).length;
          const st = intakeStatus(i);
          const blocked = nApps + nLearners > 0;
          return (
            <FormDialog
              open
              onOpenChange={(v) => !v && setAct(null)}
              title={blocked ? `Can't delete ${i.name}` : `Delete ${i.name}?`}
              submitLabel={
                blocked
                  ? st === "Open" || st === "Upcoming"
                    ? "Close intake instead"
                    : "OK"
                  : "Delete intake"
              }
              submitVariant={blocked ? "primary" : "destructive"}
              cancelLabel={blocked ? "Close" : "Cancel"}
              onSubmit={() => {
                if (blocked) {
                  setAct(st === "Open" || st === "Upcoming" ? { kind: "close", intake: i } : null);
                  return;
                }
                removeItem("intakes", (x) => x.id === i.id);
                auditLog(ctx.tenantId, "intake", i.id, "Intake deleted", i.name, "—", ctx.actingAs);
                toast.success(`${i.name} deleted`);
                setAct(null);
              }}
            >
              {blocked ? (
                <ul className="sm:col-span-2 text-sm list-disc pl-5 space-y-1">
                  {nApps > 0 && (
                    <li>
                      {nApps} application{nApps > 1 ? "s" : ""} use this intake
                    </li>
                  )}
                  {nLearners > 0 && (
                    <li>
                      {nLearners} learner{nLearners > 1 ? "s" : ""} use this intake
                    </li>
                  )}
                </ul>
              ) : (
                <p className="sm:col-span-2 text-sm">
                  No applications or learners use it. It will be removed.
                </p>
              )}
            </FormDialog>
          );
        })()}
    </Section>
  );
}

function NewIntakeDialog({
  open,
  onOpenChange,
  offerings,
  intake,
  usage,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  offerings: { id: string; label: string }[];
  /** Edit mode: the intake being changed. */
  intake?: Intake;
  /** Edit mode: how many applications / learners carry the intake's name. */
  usage?: { apps: number; learners: number };
}) {
  const ctx = useTenantContext();
  const allCalendars = useCollection("academicCalendars");
  const allIntakes = useCollection("intakes");
  const calendars = allCalendars.filter((c) => c.tenantId === ctx.tenantId);
  const templates = INTAKE_TEMPLATES[ctx.region.code]?.[ctx.type] ?? [];
  const census = CENSUS_DATE_REGIONS.includes(ctx.region.code);
  const [tpl, setTpl] = useState("");
  const [name, setName] = useState(intake?.name ?? "");
  const [kind, setKind] = useState<"Fixed" | "Rolling">(intake?.kind ?? "Fixed");
  const [scope, setScope] = useState<string[]>(intake?.scope ?? []);
  const [calendarId, setCalendarId] = useState(intake?.calendarId ?? "");
  const [opens, setOpens] = useState(intake?.opens ?? "2027-01-04");
  const [deadline, setDeadline] = useState(intake?.deadline ?? "2027-06-30");
  const [start, setStart] = useState(intake?.start ?? "2027-09-13");
  const [lastStart, setLastStart] = useState(intake?.lastStart ?? "");
  const [censusDate, setCensusDate] = useState(intake?.census ?? "");
  const [capacity, setCapacity] = useState(String(intake?.capacity ?? 60));

  const applyTemplate = (n: string) => {
    setTpl(n);
    const t = templates.find((x) => x.name === n);
    if (!t) return;
    // Next occurrence of the template month after the demo date.
    const y = t.month >= 9 ? 2027 : 2028;
    const mm = String(t.month).padStart(2, "0");
    setName(`${t.name.split(" (")[0]} ${y}`);
    setKind(t.kind);
    setStart(`${y}-${mm}-${t.kind === "Rolling" ? "01" : "14"}`);
    const dl = new Date(Date.UTC(y, t.month - 4, 28));
    setDeadline(dl.toISOString().slice(0, 10));
    if (t.kind === "Rolling") {
      const ls = new Date(Date.UTC(y, t.month + 8, 28));
      setLastStart(ls.toISOString().slice(0, 10));
    }
  };

  const submit = () => {
    if (!name.trim() || !start || !deadline) {
      toast.error("Name, deadline and start date are required");
      return;
    }
    if (deadline > start && kind === "Fixed") {
      toast.error("The application deadline must be on or before the start date");
      return;
    }
    if (opens > deadline) {
      toast.error("Applications must open on or before the deadline");
      return;
    }
    if (
      allIntakes.some(
        (x) => x.tenantId === ctx.tenantId && x.name === name.trim() && x.id !== intake?.id,
      )
    ) {
      toast.error(`An intake called “${name.trim()}” already exists`);
      return;
    }
    const cal = calendarId || calendars.find((c) => c.isDefault)?.id || calendars[0]?.id || "";
    const fields = {
      name: name.trim(),
      kind,
      scope,
      scopeLabel: scope.length
        ? scope.map((s) => offerings.find((o) => o.id === s)?.label ?? s).join(", ")
        : "All offerings",
      calendarId: cal,
      opens,
      deadline,
      start,
      lastStart: kind === "Rolling" ? lastStart || deadline : undefined,
      census: census ? censusDate || undefined : undefined,
      capacity: Number(capacity) || 0,
    };
    if (intake) {
      const labels: Partial<Record<keyof typeof fields, string>> = {
        name: "Name",
        kind: "Kind",
        scopeLabel: "Admits to",
        calendarId: "Calendar",
        opens: "Applications open",
        deadline: "Application deadline",
        start: "Start",
        lastStart: "Latest start",
        census: "Census date",
        capacity: "Places",
      };
      const changed = (Object.keys(labels) as (keyof typeof fields)[]).filter(
        (k) => String(intake[k] ?? "") !== String(fields[k] ?? ""),
      );
      if (!changed.length) {
        onOpenChange(false);
        return;
      }
      updateItem("intakes", (x) => x.id === intake.id, fields);
      for (const k of changed)
        auditLog(
          ctx.tenantId,
          "intake",
          intake.id,
          labels[k]!,
          String(intake[k] ?? "—"),
          String(fields[k] ?? "—"),
          ctx.actingAs,
        );
      // Applications and learners carry the intake by name — keep them attached.
      if (fields.name !== intake.name) {
        updateItem("applications", (a) => a.tenantId === ctx.tenantId && a.intake === intake.name, {
          intake: fields.name,
        });
        updateItem(
          "learners",
          (l) =>
            l.tenantId === ctx.tenantId && (l.intakeId === intake.id || l.intake === intake.name),
          { intake: fields.name },
        );
      }
      toast.success(`${fields.name} updated`, {
        description:
          fields.name !== intake.name && usage && usage.apps + usage.learners
            ? `${usage.apps} applications and ${usage.learners} learners now show the new name.`
            : undefined,
      });
      onOpenChange(false);
      return;
    }
    const id = `INT-${ctx.tenantId.replace("T-", "")}${String(Date.now()).slice(-4)}`;
    addItem("intakes", { id, tenantId: ctx.tenantId, ...fields });
    auditLog(ctx.tenantId, "intake", id, "Intake created", undefined, fields.name, ctx.actingAs);
    toast.success(`Intake “${name}” created`, {
      description:
        "Admissions can now take applications for it; enrolled learners inherit its calendar and start date.",
    });
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={intake ? `Edit ${intake.name}` : "Add intake"}
      description={
        intake
          ? usage && usage.apps + usage.learners
            ? `${usage.apps} applications and ${usage.learners} learners use this intake — a new name carries over to them.`
            : undefined
          : `Start from a ${ctx.region.name} template or define your own.`
      }
      onSubmit={submit}
      submitLabel={intake ? "Save intake" : "Create intake"}
    >
      {!intake && (
        <Field label="Region template" className="sm:col-span-2">
          <Select
            value={tpl}
            onChange={(e) => applyTemplate(e.target.value)}
            options={[
              { value: "", label: "Custom" },
              ...templates.map((t) => ({
                value: t.name,
                label: `${t.name}${t.note ? ` — ${t.note}` : ""}`,
              })),
            ]}
          />
        </Field>
      )}
      <Field label="Name" required>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Sep 2027" />
      </Field>
      <Field label="Kind">
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as "Fixed" | "Rolling")}
          options={[
            { value: "Fixed", label: "Fixed start date" },
            { value: "Rolling", label: "Rolling (start any Monday)" },
          ]}
        />
      </Field>
      <Field label="Applications open">
        <TextInput type="date" value={opens} onChange={(e) => setOpens(e.target.value)} />
      </Field>
      <Field label="Application deadline" required>
        <TextInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <Field label={kind === "Rolling" ? "Earliest start" : "Start date"} required>
        <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      {kind === "Rolling" && (
        <Field label="Latest start">
          <TextInput type="date" value={lastStart} onChange={(e) => setLastStart(e.target.value)} />
        </Field>
      )}
      <Field label="Places">
        <TextInput value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </Field>
      {census && (
        <Field label="Census date" hint="Funding / HELP liability fixed on this date">
          <TextInput
            type="date"
            value={censusDate}
            onChange={(e) => setCensusDate(e.target.value)}
          />
        </Field>
      )}
      <Field label="Calendar" className="sm:col-span-2">
        <Select
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          options={[
            { value: "", label: "Tenant default" },
            ...calendars.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </Field>
      <div className="sm:col-span-2">
        <div className="text-xs font-medium mb-1.5">Admits to (none ticked = all offerings)</div>
        <div className="grid sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
          {offerings.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={scope.includes(o.id)}
                onChange={(e) =>
                  setScope((s) => (e.target.checked ? [...s, o.id] : s.filter((x) => x !== o.id)))
                }
              />
              {o.label}
            </label>
          ))}
          {offerings.length === 0 && (
            <span className="text-xs text-muted-foreground">No curricula / programmes yet.</span>
          )}
        </div>
      </div>
    </FormDialog>
  );
}
