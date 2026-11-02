import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Clock,
  HardHat,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  Badge,
  Button,
  FormDialog,
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Select,
  useDisclosure,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { PackContextBar, PackEmpty, StatusPill, Tabs } from "@/components/packs/PackUI";
import { useHeData, fmtDate, type HeData } from "@/components/packs/HeDash";
import { addItem, nextId, removeItem, updateItem } from "@/lib/store";
import { DEMO_TODAY } from "@/lib/packs/foundationData";
import type { Apprenticeship, Placement } from "@/lib/packs/heData";
import { logChange, notify } from "@/lib/packs/sis/activity";

/** Audit a change to an apprenticeship / placement. */
function wLog(
  d: HeData,
  entity: "apprenticeship" | "placement",
  row: { id: string; studentId: string },
  field: string,
  from?: string,
  to?: string,
  reason?: string,
) {
  logChange({
    tenantId: d.tenantId,
    entity,
    entityId: row.id,
    studentId: row.studentId,
    field,
    from,
    to,
    by: d.ctx.actingAs || "Staff",
    reason,
  });
}

function tell(d: HeData, studentId: string, subject: string, body?: string) {
  const l = d.learners.find((x) => x.id === studentId);
  notify({
    tenantId: d.tenantId,
    channel: "Email",
    to: l ? `${l.name} (${l.email})` : studentId,
    subject,
    body,
    source: "Apprenticeships & placements",
    relatedId: studentId,
  });
}

const PLC_STATUSES: Placement["status"][] = ["Arranged", "In progress", "Completed"];

export const Route = createFileRoute("/app/college/work-based")({
  head: () => ({ meta: [{ title: "Apprenticeships & Placements — 1StudentID" }] }),
  component: WorkBasedPage,
});

type Tab = "apprenticeships" | "placements";
const APP_STATUSES: Apprenticeship["status"][] = [
  "On programme",
  "Break in learning",
  "Gateway",
  "EPA booked",
  "Achieved",
];

const days = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;

/** Off-the-job hours expected by today, pro-rata to elapsed time. */
function expectedHours(a: Apprenticeship) {
  const total = days(a.startDate, a.plannedEnd);
  const done = Math.max(0, Math.min(total, days(a.startDate, DEMO_TODAY)));
  return Math.round((a.offJobHoursPlanned * done) / total);
}

function WorkBasedPage() {
  const d = useHeData();
  const [tab, setTab] = useState<Tab>("apprenticeships");
  const newApp = useDisclosure();
  const newPlc = useDisclosure();
  const uk = d.ctx.region.code === "UK";
  const empty = d.apprenticeships.length === 0 && d.placements.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apprenticeships & Placements"
        subtitle={
          uk
            ? "Employer-based learning: off-the-job training hours, progress reviews, gateway and end-point assessment; work placements."
            : "Training contracts with employers: off-the-job training hours, workplace reviews and completion; vocational placements."
        }
        actions={
          d.ctx.isAdmin && (
            <>
              <Button variant="outline" onClick={newPlc.onOpen}>
                <Plus className="h-4 w-4" /> New placement
              </Button>
              <Button onClick={newApp.onOpen}>
                <Plus className="h-4 w-4" /> New apprenticeship
              </Button>
            </>
          )
        }
      />
      <PackContextBar pack="college" />
      {empty ? (
        <PackEmpty
          pack="college"
          title="No apprenticeships or placements yet"
          body="Add an apprentice with their employer, or arrange a vocational placement with a host organisation."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Apprentices"
              value={d.apprenticeships.length}
              icon={<HardHat className="h-4 w-4" />}
            />
            <StatCard
              label="Behind on training hours"
              value={
                d.apprenticeships.filter((a) => a.offJobHoursLogged < expectedHours(a) * 0.9).length
              }
              icon={<Clock className="h-4 w-4" />}
              accent="warning"
            />
            <StatCard
              label="Placements in progress"
              value={d.placements.filter((p) => p.status === "In progress").length}
              icon={<Stethoscope className="h-4 w-4" />}
              accent="info"
            />
            <StatCard
              label="Missing risk assessment"
              value={d.placements.filter((p) => !p.riskAssessed).length}
              icon={<ShieldAlert className="h-4 w-4" />}
              accent="destructive"
            />
          </div>
          <Tabs<Tab>
            tabs={[
              { id: "apprenticeships", label: "Apprenticeships", count: d.apprenticeships.length },
              { id: "placements", label: "Placements", count: d.placements.length },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === "apprenticeships" ? (
            <div className="grid xl:grid-cols-2 gap-4">
              {d.apprenticeships.map((a) => (
                <ApprenticeshipCard key={a.id} a={a} />
              ))}
            </div>
          ) : (
            <div className="grid xl:grid-cols-2 gap-4">
              {d.placements.map((p) => (
                <PlacementCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </>
      )}
      {newApp.open && <NewApprenticeship onClose={newApp.onClose} />}
      {newPlc.open && <NewPlacement onClose={newPlc.onClose} />}
    </div>
  );
}

function Progress({ value, max, marker }: { value: number; max: number; marker?: number }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  const m = marker !== undefined && max ? Math.min(100, (marker / max) * 100) : undefined;
  return (
    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      {m !== undefined && (
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/60"
          style={{ left: `${m}%` }}
          title="Expected by today"
        />
      )}
    </div>
  );
}

function ApprenticeshipCard({ a }: { a: Apprenticeship }) {
  const d = useHeData();
  const staff = d.ctx.isAdmin || d.ctx.user?.role === "teacher";
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const exp = expectedHours(a);
  const onTrack = a.offJobHoursLogged >= exp * 0.9;

  return (
    <Section
      title={
        <span className="flex items-center gap-2.5">
          <Avatar name={d.name(a.studentId)} seed={a.studentId} size={30} />
          {d.name(a.studentId)}
        </span>
      }
      description={`${a.standard}`}
      actions={
        <>
          <StatusPill status={a.status} />
          {d.ctx.isAdmin && (
            <RowActions
              label="apprenticeship"
              onEdit={() => setEditing(true)}
              onDelete={() => setDeleting(true)}
            />
          )}
        </>
      }
    >
      {editing && <EditApprenticeship a={a} onClose={() => setEditing(false)} />}
      {deleting && <DeleteApprenticeship a={a} onClose={() => setDeleting(false)} />}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="text-foreground">{a.employer}</span>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {fmtDate(a.startDate)} → {fmtDate(a.plannedEnd)}
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span>Off-the-job training hours</span>
          <span>
            <span className="font-semibold">{a.offJobHoursLogged}</span> / {a.offJobHoursPlanned} ·
            expected {exp}{" "}
            <Badge tone={onTrack ? "success" : "warning"}>{onTrack ? "On track" : "Behind"}</Badge>
          </span>
        </div>
        <Progress value={a.offJobHoursLogged} max={a.offJobHoursPlanned} marker={exp} />
      </div>
      {staff && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <NumberInput
            className="h-8 w-24"
            min={1}
            placeholder="Hours"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!Number(hours)}
            onClick={() => {
              updateItem("apprenticeships", (x) => x.id === a.id, {
                offJobHoursLogged: a.offJobHoursLogged + Number(hours),
              });
              wLog(
                d,
                "apprenticeship",
                a,
                "Off-the-job hours",
                String(a.offJobHoursLogged),
                String(a.offJobHoursLogged + Number(hours)),
              );
              toast.success(`${hours} off-the-job hours logged for ${d.name(a.studentId)}`);
              setHours("");
            }}
          >
            <Clock className="h-3.5 w-3.5" /> Log hours
          </Button>
          <Select
            className="h-8 w-40"
            value={a.status}
            onChange={(e) => {
              updateItem("apprenticeships", (x) => x.id === a.id, {
                status: e.target.value as Apprenticeship["status"],
              });
              wLog(d, "apprenticeship", a, "Status", a.status, e.target.value);
              toast.success(`Status changed to ${e.target.value}`);
            }}
            options={APP_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <Button size="sm" variant="ghost" onClick={() => setReviewing((v) => !v)}>
            Log review
          </Button>
        </div>
      )}
      {reviewing && (
        <div className="mt-3 space-y-2">
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Progress review with apprentice and employer…"
          />
          <Button
            size="sm"
            disabled={note.trim().length < 5}
            onClick={() => {
              updateItem("apprenticeships", (x) => x.id === a.id, {
                reviews: [
                  ...a.reviews,
                  { date: DEMO_TODAY, by: d.ctx.user?.name ?? "Staff", note: note.trim() },
                ],
              });
              wLog(d, "apprenticeship", a, "Progress review added", undefined, note.trim());
              toast.success("Progress review recorded and shared with the employer");
              setNote("");
              setReviewing(false);
            }}
          >
            Save review
          </Button>
        </div>
      )}
      <div className="mt-4 border-t pt-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Progress reviews
        </div>
        <ol className="space-y-2">
          {[...a.reviews].reverse().map((r, i) => (
            <li key={i} className="text-xs">
              <span className="font-medium">{fmtDate(r.date)}</span> · {r.by}
              <div className="text-muted-foreground">{r.note}</div>
            </li>
          ))}
          {!a.reviews.length && <li className="text-xs text-muted-foreground">No reviews yet.</li>}
        </ol>
      </div>
    </Section>
  );
}

function PlacementCard({ p }: { p: Placement }) {
  const d = useHeData();
  const staff = d.ctx.isAdmin || d.ctx.user?.role === "teacher";
  const [hours, setHours] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <Section
      title={
        <span className="flex items-center gap-2.5">
          <Avatar name={d.name(p.studentId)} seed={p.studentId} size={30} />
          {d.name(p.studentId)}
        </span>
      }
      description={`${p.host} · supervisor ${p.supervisor}`}
      actions={
        <>
          <StatusPill status={p.status} />
          {d.ctx.isAdmin && (
            <RowActions
              label="placement"
              onEdit={() => setEditing(true)}
              onDelete={() => setDeleting(true)}
            />
          )}
        </>
      }
    >
      {editing && <EditPlacement p={p} onClose={() => setEditing(false)} />}
      {deleting && <DeletePlacement p={p} onClose={() => setDeleting(false)} />}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
        </span>
        {p.riskAssessed ? (
          <span className="flex items-center gap-1 text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> Risk assessed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-destructive">
            <ShieldAlert className="h-3.5 w-3.5" /> Risk assessment outstanding
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span>Placement hours</span>
          <span>
            <span className="font-semibold">{p.hoursLogged}</span> / {p.hoursRequired}
          </span>
        </div>
        <Progress value={p.hoursLogged} max={p.hoursRequired} />
      </div>
      {staff && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {!p.riskAssessed && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                updateItem("placements", (x) => x.id === p.id, { riskAssessed: true });
                wLog(d, "placement", p, "Risk assessment", "Outstanding", "Recorded");
                toast.success(`Risk assessment for ${p.host} recorded`);
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Record risk assessment
            </Button>
          )}
          {p.status === "Arranged" && (
            <Button
              size="sm"
              disabled={!p.riskAssessed}
              title={p.riskAssessed ? undefined : "Complete the risk assessment first"}
              onClick={() => {
                updateItem("placements", (x) => x.id === p.id, { status: "In progress" });
                wLog(d, "placement", p, "Status", p.status, "In progress");
                toast.success("Placement started");
              }}
            >
              Start placement
            </Button>
          )}
          {p.status === "In progress" && (
            <>
              <NumberInput
                className="h-8 w-24"
                min={1}
                placeholder="Hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!Number(hours)}
                onClick={() => {
                  const logged = p.hoursLogged + Number(hours);
                  const done = logged >= p.hoursRequired;
                  updateItem("placements", (x) => x.id === p.id, {
                    hoursLogged: logged,
                    status: done ? "Completed" : p.status,
                  });
                  wLog(d, "placement", p, "Hours logged", String(p.hoursLogged), String(logged));
                  toast.success(
                    done
                      ? `Placement complete — ${logged} hours signed off`
                      : `${hours} hours logged`,
                  );
                  setHours("");
                }}
              >
                <Clock className="h-3.5 w-3.5" /> Log hours
              </Button>
            </>
          )}
        </div>
      )}
      {p.status === "Arranged" && !p.riskAssessed && (
        <p className="text-[11px] text-muted-foreground mt-2">
          A placement can't start until the host's risk assessment is on file.
        </p>
      )}
    </Section>
  );
}

function NewApprenticeship({ onClose }: { onClose: () => void }) {
  const d = useHeData();
  const pool = d.learners.filter(
    (l) => l.qualificationId && !d.apprenticeships.some((a) => a.studentId === l.id),
  );
  const [f, setF] = useState({
    studentId: pool[0]?.id ?? "",
    employer: "",
    startDate: DEMO_TODAY,
    plannedEnd: "2029-11-30",
    hours: 900,
  });
  const set = (k: keyof typeof f, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  const l = d.learners.find((x) => x.id === f.studentId);
  const q = d.quals.find((x) => x.id === l?.qualificationId);
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="New apprenticeship"
      description="Links the learner, their employer and the qualification they're training towards."
      submitLabel="Create"
      onSubmit={() => {
        if (!f.studentId || !f.employer.trim()) {
          toast.error("Learner and employer are required");
          return;
        }
        const id = nextId("APP-", "apprenticeships");
        wLog(
          d,
          "apprenticeship",
          { id, studentId: f.studentId },
          "Apprenticeship created",
          undefined,
          `${f.employer.trim()} · ${q?.code ?? "—"}`,
        );
        tell(d, f.studentId, `Your apprenticeship with ${f.employer.trim()} has been set up`);
        addItem("apprenticeships", {
          id,
          tenantId: d.tenantId,
          studentId: f.studentId,
          employer: f.employer.trim(),
          standard: q ? `${q.code} ${q.title}` : "—",
          startDate: f.startDate,
          plannedEnd: f.plannedEnd,
          offJobHoursPlanned: Number(f.hours),
          offJobHoursLogged: 0,
          status: "On programme",
          reviews: [],
        });
        toast.success(`Apprenticeship created for ${l?.name}`);
        onClose();
      }}
    >
      <Field label="Learner" className="sm:col-span-2">
        <Select
          value={f.studentId}
          onChange={(e) => set("studentId", e.target.value)}
          options={pool.map((x) => ({ value: x.id, label: `${x.name} · ${x.level}` }))}
        />
      </Field>
      <Field label="Employer" required className="sm:col-span-2">
        <TextInput
          value={f.employer}
          onChange={(e) => set("employer", e.target.value)}
          placeholder="Coastline Electrical Pty Ltd"
        />
      </Field>
      <Field label="Start">
        <TextInput
          type="date"
          value={f.startDate}
          onChange={(e) => set("startDate", e.target.value)}
        />
      </Field>
      <Field label="Planned end">
        <TextInput
          type="date"
          value={f.plannedEnd}
          onChange={(e) => set("plannedEnd", e.target.value)}
        />
      </Field>
      <Field label="Off-the-job hours planned">
        <NumberInput min={1} value={f.hours} onChange={(e) => set("hours", e.target.value)} />
      </Field>
      <Field label="Qualification">
        <TextInput value={q ? `${q.code} ${q.title}` : "—"} disabled />
      </Field>
    </FormDialog>
  );
}

function NewPlacement({ onClose }: { onClose: () => void }) {
  const d = useHeData();
  const [f, setF] = useState({
    studentId: d.learners[0]?.id ?? "",
    host: "",
    supervisor: "",
    startDate: "2027-01-18",
    endDate: "2027-03-12",
    hours: 120,
  });
  const set = (k: keyof typeof f, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="New placement"
      description="The placement can start once the host's risk assessment is recorded."
      submitLabel="Arrange placement"
      onSubmit={() => {
        if (!f.host.trim()) {
          toast.error("Host organisation is required");
          return;
        }
        const id = nextId("PLC-", "placements");
        wLog(
          d,
          "placement",
          { id, studentId: f.studentId },
          "Placement arranged",
          undefined,
          f.host.trim(),
        );
        tell(
          d,
          f.studentId,
          `Placement arranged at ${f.host.trim()}`,
          `${f.startDate} → ${f.endDate}`,
        );
        addItem("placements", {
          id,
          tenantId: d.tenantId,
          studentId: f.studentId,
          host: f.host.trim(),
          supervisor: f.supervisor.trim() || "TBC",
          startDate: f.startDate,
          endDate: f.endDate,
          hoursRequired: Number(f.hours),
          hoursLogged: 0,
          status: "Arranged",
          riskAssessed: false,
        });
        toast.success(`Placement arranged at ${f.host}`);
        onClose();
      }}
    >
      <Field label="Learner" className="sm:col-span-2">
        <Select
          value={f.studentId}
          onChange={(e) => set("studentId", e.target.value)}
          options={d.learners.map((x) => ({ value: x.id, label: `${x.name} · ${x.level}` }))}
        />
      </Field>
      <Field label="Host organisation" required>
        <TextInput value={f.host} onChange={(e) => set("host", e.target.value)} />
      </Field>
      <Field label="Workplace supervisor">
        <TextInput value={f.supervisor} onChange={(e) => set("supervisor", e.target.value)} />
      </Field>
      <Field label="Start">
        <TextInput
          type="date"
          value={f.startDate}
          onChange={(e) => set("startDate", e.target.value)}
        />
      </Field>
      <Field label="End">
        <TextInput type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} />
      </Field>
      <Field label="Hours required">
        <NumberInput min={1} value={f.hours} onChange={(e) => set("hours", e.target.value)} />
      </Field>
    </FormDialog>
  );
}

/* ── Edit / delete ───────────────────────────────────────────────────────── */

function RowActions({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="flex items-center">
      <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${label}`}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete} aria-label={`Delete ${label}`}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </span>
  );
}

/** Log each changed field (label → [before, after]). */
function logDiff(
  d: HeData,
  entity: "apprenticeship" | "placement",
  row: { id: string; studentId: string },
  pairs: Record<string, [unknown, unknown]>,
) {
  let n = 0;
  for (const [label, [a, b]] of Object.entries(pairs))
    if (String(a ?? "") !== String(b ?? "")) {
      wLog(d, entity, row, label, String(a ?? "—"), String(b ?? "—"));
      n++;
    }
  return n;
}

function EditApprenticeship({ a, onClose }: { a: Apprenticeship; onClose: () => void }) {
  const d = useHeData();
  const [f, setF] = useState({
    employer: a.employer,
    standard: a.standard,
    startDate: a.startDate,
    plannedEnd: a.plannedEnd,
    planned: String(a.offJobHoursPlanned),
    status: a.status,
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Edit apprenticeship"
      description={d.name(a.studentId)}
      submitLabel="Save changes"
      onSubmit={() => {
        if (!f.employer.trim()) {
          toast.error("Employer is required");
          return;
        }
        if (f.plannedEnd < f.startDate) {
          toast.error("Planned end must be after the start");
          return;
        }
        const next = {
          employer: f.employer.trim(),
          standard: f.standard.trim() || "—",
          startDate: f.startDate,
          plannedEnd: f.plannedEnd,
          offJobHoursPlanned: Math.max(1, Number(f.planned) || 1),
          status: f.status,
        };
        const n = logDiff(d, "apprenticeship", a, {
          Employer: [a.employer, next.employer],
          Standard: [a.standard, next.standard],
          Start: [a.startDate, next.startDate],
          "Planned end": [a.plannedEnd, next.plannedEnd],
          "Off-the-job hours planned": [a.offJobHoursPlanned, next.offJobHoursPlanned],
          Status: [a.status, next.status],
        });
        if (n) {
          updateItem("apprenticeships", (x) => x.id === a.id, next);
          toast.success(`Apprenticeship updated — ${n} change${n > 1 ? "s" : ""} logged`);
        }
        onClose();
      }}
    >
      <Field label="Employer" required className="sm:col-span-2">
        <TextInput value={f.employer} onChange={(e) => set("employer", e.target.value)} />
      </Field>
      <Field label="Standard / qualification" className="sm:col-span-2">
        <TextInput value={f.standard} onChange={(e) => set("standard", e.target.value)} />
      </Field>
      <Field label="Start">
        <TextInput
          type="date"
          value={f.startDate}
          onChange={(e) => set("startDate", e.target.value)}
        />
      </Field>
      <Field label="Planned end">
        <TextInput
          type="date"
          value={f.plannedEnd}
          onChange={(e) => set("plannedEnd", e.target.value)}
        />
      </Field>
      <Field label="Off-the-job hours planned">
        <NumberInput min={1} value={f.planned} onChange={(e) => set("planned", e.target.value)} />
      </Field>
      <Field label="Status">
        <Select
          value={f.status}
          onChange={(e) => set("status", e.target.value)}
          options={APP_STATUSES.map((s) => ({ value: s, label: s }))}
        />
      </Field>
    </FormDialog>
  );
}

function DeleteApprenticeship({ a, onClose }: { a: Apprenticeship; onClose: () => void }) {
  const d = useHeData();
  const name = d.name(a.studentId);
  const used = a.offJobHoursLogged > 0 || a.reviews.length > 0;
  if (used) {
    const why = [
      a.offJobHoursLogged > 0 && `${a.offJobHoursLogged} off-the-job hours logged`,
      a.reviews.length > 0 &&
        `${a.reviews.length} progress review${a.reviews.length > 1 ? "s" : ""}`,
    ]
      .filter(Boolean)
      .join(" and ");
    const paused = a.status === "Break in learning";
    return (
      <FormDialog
        open
        onOpenChange={(v) => !v && onClose()}
        title="Can't delete this apprenticeship"
        submitLabel={paused ? "OK" : "Record a break in learning"}
        cancelLabel="Close"
        onSubmit={() => {
          if (!paused) {
            updateItem("apprenticeships", (x) => x.id === a.id, { status: "Break in learning" });
            wLog(
              d,
              "apprenticeship",
              a,
              "Status",
              a.status,
              "Break in learning",
              "Instead of deleting",
            );
            tell(d, a.studentId, "Your apprenticeship is on a break in learning");
            toast.success(`${name}: break in learning recorded`);
          }
          onClose();
        }}
      >
        <p className="sm:col-span-2 text-sm">
          {name} has {why}. That is funding evidence, so the record is kept.
        </p>
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          {paused
            ? "It is already on a break in learning. To withdraw the apprentice, raise a withdrawal in Requests."
            : "Pause it with a break in learning instead. To withdraw the apprentice, raise a withdrawal in Requests."}
        </p>
      </FormDialog>
    );
  }
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Delete apprenticeship?"
      submitLabel="Delete"
      submitVariant="destructive"
      onSubmit={() => {
        removeItem("apprenticeships", (x) => x.id === a.id);
        wLog(
          d,
          "apprenticeship",
          a,
          "Apprenticeship deleted",
          `${a.employer} · ${a.standard}`,
          "—",
        );
        toast.success(`Apprenticeship for ${name} deleted`);
        onClose();
      }}
    >
      <p className="sm:col-span-2 text-sm">
        {name} with {a.employer}. No hours or reviews are logged, so it can be removed.
      </p>
    </FormDialog>
  );
}

function EditPlacement({ p, onClose }: { p: Placement; onClose: () => void }) {
  const d = useHeData();
  const [f, setF] = useState({
    host: p.host,
    supervisor: p.supervisor,
    startDate: p.startDate,
    endDate: p.endDate,
    hours: String(p.hoursRequired),
    status: p.status,
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Edit placement"
      description={d.name(p.studentId)}
      submitLabel="Save changes"
      onSubmit={() => {
        if (!f.host.trim()) {
          toast.error("Host organisation is required");
          return;
        }
        if (f.endDate < f.startDate) {
          toast.error("End must be after the start");
          return;
        }
        if (f.status === "In progress" && !p.riskAssessed) {
          toast.error("Record the risk assessment before starting the placement");
          return;
        }
        const next = {
          host: f.host.trim(),
          supervisor: f.supervisor.trim() || "TBC",
          startDate: f.startDate,
          endDate: f.endDate,
          hoursRequired: Math.max(1, Number(f.hours) || 1),
          status: f.status,
        };
        const n = logDiff(d, "placement", p, {
          Host: [p.host, next.host],
          Supervisor: [p.supervisor, next.supervisor],
          Start: [p.startDate, next.startDate],
          End: [p.endDate, next.endDate],
          "Hours required": [p.hoursRequired, next.hoursRequired],
          Status: [p.status, next.status],
        });
        if (n) {
          updateItem("placements", (x) => x.id === p.id, next);
          toast.success(`Placement updated — ${n} change${n > 1 ? "s" : ""} logged`);
        }
        onClose();
      }}
    >
      <Field label="Host organisation" required>
        <TextInput value={f.host} onChange={(e) => set("host", e.target.value)} />
      </Field>
      <Field label="Workplace supervisor">
        <TextInput value={f.supervisor} onChange={(e) => set("supervisor", e.target.value)} />
      </Field>
      <Field label="Start">
        <TextInput
          type="date"
          value={f.startDate}
          onChange={(e) => set("startDate", e.target.value)}
        />
      </Field>
      <Field label="End">
        <TextInput type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} />
      </Field>
      <Field label="Hours required">
        <NumberInput min={1} value={f.hours} onChange={(e) => set("hours", e.target.value)} />
      </Field>
      <Field label="Status">
        <Select
          value={f.status}
          onChange={(e) => set("status", e.target.value)}
          options={PLC_STATUSES.map((s) => ({ value: s, label: s }))}
        />
      </Field>
    </FormDialog>
  );
}

function DeletePlacement({ p, onClose }: { p: Placement; onClose: () => void }) {
  const d = useHeData();
  const name = d.name(p.studentId);
  const [reason, setReason] = useState("");
  if (p.hoursLogged > 0) {
    const ended = p.status === "Completed";
    return (
      <FormDialog
        open
        onOpenChange={(v) => !v && onClose()}
        title="Can't delete this placement"
        submitLabel={ended ? "OK" : "End placement early"}
        submitVariant={ended ? "primary" : "destructive"}
        cancelLabel="Close"
        onSubmit={() => {
          if (!ended) {
            if (!reason.trim()) {
              toast.error("Give a reason for ending early");
              return;
            }
            const end = DEMO_TODAY < p.endDate ? DEMO_TODAY : p.endDate;
            updateItem("placements", (x) => x.id === p.id, { status: "Completed", endDate: end });
            wLog(
              d,
              "placement",
              p,
              "Ended early",
              `${p.status} · ends ${p.endDate}`,
              `Completed · ended ${end}`,
              `${reason.trim()} (${p.hoursLogged}/${p.hoursRequired} h)`,
            );
            tell(d, p.studentId, `Your placement at ${p.host} has ended early`, reason.trim());
            toast.success(`Placement at ${p.host} ended early — ${p.hoursLogged} hours kept`);
          }
          onClose();
        }}
      >
        <p className="sm:col-span-2 text-sm">
          {name} has {p.hoursLogged} placement hours logged at {p.host}. The record is kept.
        </p>
        {!ended && (
          <Field label="Reason for ending early" required className="sm:col-span-2">
            <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        )}
      </FormDialog>
    );
  }
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Delete placement?"
      submitLabel="Delete"
      submitVariant="destructive"
      onSubmit={() => {
        removeItem("placements", (x) => x.id === p.id);
        wLog(d, "placement", p, "Placement deleted", `${p.host} · ${p.startDate}`, "—");
        tell(d, p.studentId, `Your placement at ${p.host} has been cancelled`);
        toast.success(`Placement at ${p.host} deleted`);
        onClose();
      }}
    >
      <p className="sm:col-span-2 text-sm">
        {name} at {p.host}. No hours are logged, so it can be removed. {name} will be told.
      </p>
    </FormDialog>
  );
}
