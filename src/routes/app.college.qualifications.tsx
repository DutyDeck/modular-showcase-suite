import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Award, BadgeCheck, Pencil, Plus, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
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
  Select,
  useDisclosure,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { PackContextBar, PackEmpty, VerifyNote } from "@/components/packs/PackUI";
import { useHeData, type HeData } from "@/components/packs/HeDash";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import {
  isUnitDone,
  qualProgress,
  type QualUnit,
  type Qualification,
  type UnitOutcome,
} from "@/lib/packs/heData";
import { logChange, notify } from "@/lib/packs/sis/activity";

export const Route = createFileRoute("/app/college/qualifications")({
  head: () => ({ meta: [{ title: "Qualifications & Units — 1StudentID" }] }),
  component: QualificationsPage,
});

const OUTCOMES: UnitOutcome[] = [
  "In progress",
  "Competent",
  "Not yet competent",
  "Credit transfer",
  "Pass",
  "Merit",
  "Distinction",
];

const TONE: Record<string, string> = {
  Competent: "bg-success/15 text-success",
  Pass: "bg-success/15 text-success",
  Merit: "bg-success/15 text-success",
  Distinction: "bg-success/15 text-success",
  "Credit transfer": "bg-info/15 text-info",
  "In progress": "bg-warning/20 text-warning-foreground",
  "Not yet competent": "bg-destructive/15 text-destructive",
};

function QualificationsPage() {
  const d = useHeData();
  const student = d.ctx.user?.role === "student";
  const [sel, setSel] = useState<string | undefined>();
  const q = d.quals.find((x) => x.id === sel) ?? d.quals[0];
  const addUnit = useDisclosure();
  const newQual = useDisclosure();

  return (
    <div className="space-y-6">
      <PageHeader
        title={student ? "My Qualification" : "Qualifications & Units"}
        subtitle="Nationally recognised qualifications, their units and each learner's competency outcomes."
        actions={
          d.ctx.isAdmin && (
            <>
              {q && (
                <Button variant="outline" onClick={addUnit.onOpen}>
                  <Plus className="h-4 w-4" /> Add unit
                </Button>
              )}
              <Button onClick={newQual.onOpen}>
                <Plus className="h-4 w-4" /> New qualification
              </Button>
            </>
          )
        }
      />
      <PackContextBar pack="college" />
      {d.quals.length === 0 ? (
        <PackEmpty
          pack="college"
          title="No qualifications yet"
          body="Load the College starter template (five AQF qualifications with units) or add your own scope of registration."
        />
      ) : student ? (
        <StudentView />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Qualifications"
              value={d.quals.length}
              icon={<Award className="h-4 w-4" />}
            />
            <StatCard
              label="Learners"
              value={d.learners.filter((l) => l.qualificationId).length}
              icon={<Users className="h-4 w-4" />}
              accent="info"
            />
            <StatCard
              label="Units in progress"
              value={d.units.filter((u) => u.outcome === "In progress").length}
              icon={<Award className="h-4 w-4" />}
              accent="warning"
            />
            <StatCard
              label="Eligible for certification"
              value={
                d.learners.filter((l) => {
                  const qq = d.quals.find((x) => x.id === l.qualificationId);
                  return qq && qualProgress(qq, d.units, l.id).eligible;
                }).length
              }
              icon={<BadgeCheck className="h-4 w-4" />}
              accent="success"
            />
          </div>
          <div className="grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
            <div className="space-y-2">
              {d.quals.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setSel(x.id)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${x.id === q?.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/40"}`}
                >
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {x.code} · {x.level}
                  </div>
                  <div className="text-sm font-medium">{x.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {x.units.length} units ·{" "}
                    {d.learners.filter((l) => l.qualificationId === x.id).length} learners
                  </div>
                </button>
              ))}
            </div>
            {q && <QualDetail key={q.id} q={q} onDeleted={() => setSel(undefined)} />}
          </div>
          <VerifyNote>
            Unit codes and titles are illustrative. In production they are synced from the national
            training register (training.gov.au in Australia; Ofqual / awarding-body specifications
            in the UK) for the tenant's scope of registration.
          </VerifyNote>
        </>
      )}
      {q && addUnit.open && <UnitDialog q={q} onClose={addUnit.onClose} />}
      {newQual.open && (
        <QualDialog
          onClose={newQual.onClose}
          onCreated={(id) => {
            setSel(id);
            newQual.onClose();
          }}
        />
      )}
    </div>
  );
}

/* ── Shared bits ─────────────────────────────────────────────────────────── */

function qLog(
  d: HeData,
  entity: string,
  entityId: string,
  field: string,
  from?: string,
  to?: string,
  extra?: { studentId?: string; reason?: string },
) {
  logChange({
    tenantId: d.tenantId,
    entity,
    entityId,
    field,
    from,
    to,
    by: d.ctx.actingAs || "Admin",
    ...extra,
  });
}

/** Simple confirm built on FormDialog. */
function ConfirmDialog({
  title,
  body,
  confirmLabel,
  destructive = true,
  onConfirm,
  onClose,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={title}
      submitLabel={confirmLabel}
      submitVariant={destructive ? "destructive" : "primary"}
      onSubmit={() => {
        onConfirm();
        onClose();
      }}
    >
      <div className="sm:col-span-2 text-sm">{body}</div>
    </FormDialog>
  );
}

/** A blocked action — explains why, no way to proceed. */
function BlockedDialog({
  title,
  reasons,
  hint,
  onClose,
}: {
  title: string;
  reasons: string[];
  hint?: string;
  onClose: () => void;
}) {
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={title}
      submitLabel="OK"
      cancelLabel="Close"
      onSubmit={onClose}
    >
      <ul className="sm:col-span-2 text-sm list-disc pl-5 space-y-1">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {hint && <p className="sm:col-span-2 text-xs text-muted-foreground">{hint}</p>}
    </FormDialog>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Pending =
  | { kind: "editQual" }
  | { kind: "deleteQual" }
  | { kind: "enrol" }
  | { kind: "editUnit"; unit: QualUnit }
  | { kind: "deleteUnit"; unit: QualUnit }
  | { kind: "unenrol"; learner: Learner };

function QualDetail({ q, onDeleted }: { q: Qualification; onDeleted: () => void }) {
  const d = useHeData();
  const canEdit = d.ctx.isAdmin || d.ctx.user?.role === "teacher";
  const admin = d.ctx.isAdmin;
  const [pending, setPending] = useState<Pending | null>(null);
  const intakes = useCollection("intakes").filter(
    (i) => i.tenantId === d.tenantId && i.scope.includes(q.id),
  );
  const apps = useCollection("applications").filter(
    (a) => a.tenantId === d.tenantId && a.qualificationId === q.id,
  );
  const learners = d.learners.filter((l) => l.qualificationId === q.id);
  const achievementsFor = (code?: string, studentId?: string) =>
    d.units.filter(
      (u) =>
        u.qualificationId === q.id &&
        (!code || u.unitCode === code) &&
        (!studentId || u.studentId === studentId),
    );
  const outcomeOf = (studentId: string, code: string) =>
    d.units.find(
      (u) => u.studentId === studentId && u.qualificationId === q.id && u.unitCode === code,
    );

  const setOutcome = (studentId: string, code: string, value: string) => {
    const existing = outcomeOf(studentId, code);
    const outcome = value as UnitOutcome;
    if (existing && !value) {
      removeItem("unitAchievements", (x) => x.id === existing.id);
    } else if (existing) {
      updateItem("unitAchievements", (x) => x.id === existing.id, {
        outcome,
        assessor: d.ctx.user?.name ?? existing.assessor,
        date: DEMO_TODAY,
      });
    } else if (value) {
      addItem("unitAchievements", {
        id: nextId("UA-", "unitAchievements"),
        tenantId: d.tenantId,
        studentId,
        qualificationId: q.id,
        unitCode: code,
        outcome,
        assessor: d.ctx.user?.name ?? "Assessor",
        date: DEMO_TODAY,
      });
    }
    qLog(
      d,
      "unitAchievement",
      existing?.id ?? `${studentId}-${code}`,
      `Unit ${code}`,
      existing?.outcome ?? "—",
      value || "—",
      {
        studentId,
      },
    );
    if (isUnitDone(outcome))
      toast.success(`${code} recorded as ${outcome} for ${d.name(studentId)}`);
  };

  return (
    <div className="space-y-4">
      <Section
        title={`${q.code} ${q.title}`}
        description={`${q.awardingBody} · ${q.level} · ${q.fundingStream}`}
        actions={
          admin && (
            <>
              <Button size="sm" variant="outline" onClick={() => setPending({ kind: "editQual" })}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPending({ kind: "deleteQual" })}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )
        }
      >
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Badge tone="info">{q.units.filter((u) => u.core).length} core</Badge>
          <Badge tone="muted">
            {q.units.filter((u) => !u.core).length} electives · {q.electivesRequired ?? 0} required
          </Badge>
          <Badge tone="muted">{q.units.reduce((a, u) => a + u.hours, 0)} nominal hours</Badge>
        </div>
        {admin && (
          <div className="mt-3 divide-y rounded-lg border">
            {q.units.map((u) => {
              const n = achievementsFor(u.code).length;
              return (
                <div key={u.code} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  <span className="font-mono text-muted-foreground w-24 shrink-0">{u.code}</span>
                  <span className="flex-1 min-w-0 truncate">{u.title}</span>
                  <span className="text-muted-foreground shrink-0">
                    {u.core ? "Core" : "Elective"} · {u.hours} h{n ? ` · ${n} outcomes` : ""}
                  </span>
                  <button
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label={`Edit ${u.code}`}
                    onClick={() => setPending({ kind: "editUnit", unit: u })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label={`Delete ${u.code}`}
                    onClick={() => setPending({ kind: "deleteUnit", unit: u })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {!q.units.length && (
              <div className="px-3 py-3 text-xs text-muted-foreground">
                No units yet — use “Add unit”.
              </div>
            )}
          </div>
        )}
      </Section>
      <Section
        title="Learner outcomes"
        description={
          canEdit
            ? "Record each unit's competency outcome — certification unlocks automatically."
            : undefined
        }
        actions={
          admin && (
            <Button size="sm" onClick={() => setPending({ kind: "enrol" })}>
              <UserPlus className="h-3.5 w-3.5" /> Enrol learner
            </Button>
          )
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="text-xs min-w-full">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left font-medium px-4 py-2 sticky left-0 bg-card min-w-[180px]">
                  Learner
                </th>
                {q.units.map((u) => (
                  <th
                    key={u.code}
                    className="px-1.5 py-2 font-medium text-center whitespace-nowrap"
                    title={`${u.title} (${u.hours} h)`}
                  >
                    <div className="font-mono">{u.code}</div>
                    <div
                      className={`text-[9px] ${u.core ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {u.core ? "core" : "elective"}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 font-medium text-left">Progress</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l) => {
                const pr = qualProgress(q, d.units, l.id);
                return (
                  <tr key={l.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 sticky left-0 bg-card">
                      <div className="flex items-center gap-2">
                        <Avatar name={l.name} seed={l.id} size={26} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{l.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {l.mode} · {l.group}
                          </div>
                        </div>
                        {admin && (
                          <button
                            className="text-muted-foreground hover:text-destructive p-1"
                            title="Unenrol from this qualification"
                            aria-label={`Unenrol ${l.name}`}
                            onClick={() => setPending({ kind: "unenrol", learner: l })}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    {q.units.map((u) => {
                      const o = outcomeOf(l.id, u.code)?.outcome;
                      return (
                        <td key={u.code} className="px-1 py-1.5 text-center">
                          {canEdit ? (
                            <select
                              value={o ?? ""}
                              onChange={(e) => setOutcome(l.id, u.code, e.target.value)}
                              className={`h-7 w-[92px] rounded border text-[10px] px-1 ${o ? TONE[o] : "bg-background text-muted-foreground"}`}
                              aria-label={`${u.code} outcome for ${l.name}`}
                            >
                              <option value="">—</option>
                              {OUTCOMES.map((x) => (
                                <option key={x} value={x}>
                                  {x}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 ${o ? TONE[o] : "text-muted-foreground"}`}
                            >
                              {o ?? "—"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 min-w-[170px]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${pr.eligible ? "bg-success" : "bg-primary"}`}
                            style={{ width: `${pr.pct}%` }}
                          />
                        </div>
                        <span className="font-medium">{pr.pct}%</span>
                      </div>
                      {pr.eligible ? (
                        <button
                          className="mt-1 text-[11px] text-success font-medium hover:underline flex items-center gap-1"
                          onClick={() =>
                            toast.success(
                              `Testamur and record of results issued to ${l.name} — USI transcript updated`,
                            )
                          }
                        >
                          <BadgeCheck className="h-3 w-3" /> Eligible · issue certificate
                        </button>
                      ) : (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Core {pr.coreDone}/{pr.coreTotal} · electives {pr.electivesDone}/
                          {pr.electivesRequired}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!learners.length && (
                <tr>
                  <td
                    colSpan={q.units.length + 2}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No learners enrolled on this qualification.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
      {pending?.kind === "editQual" && <QualDialog q={q} onClose={() => setPending(null)} />}
      {pending?.kind === "enrol" && <EnrolDialog q={q} onClose={() => setPending(null)} />}
      {pending?.kind === "editUnit" && (
        <UnitDialog
          q={q}
          unit={pending.unit}
          locked={achievementsFor(pending.unit.code).length > 0}
          onClose={() => setPending(null)}
        />
      )}
      {pending?.kind === "deleteQual" &&
        (() => {
          const reasons = [
            learners.length &&
              `${plural(learners.length, "learner is", "learners are")} enrolled — unenrol them first`,
            achievementsFor().length &&
              `${plural(achievementsFor().length, "unit outcome")} recorded against it`,
            intakes.length &&
              `${plural(intakes.length, "intake")} admit to it (${intakes.map((i) => i.name).join(", ")})`,
            apps.length && `${plural(apps.length, "application")} reference it`,
          ].filter((x): x is string => !!x);
          return reasons.length ? (
            <BlockedDialog
              title={`Can't delete ${q.code}`}
              reasons={reasons}
              hint="Qualifications with learners or history stay on the scope of registration. Remove the references first."
              onClose={() => setPending(null)}
            />
          ) : (
            <ConfirmDialog
              title={`Delete ${q.code}?`}
              body={`${q.code} ${q.title} and its ${plural(q.units.length, "unit")} will be removed. This can't be undone.`}
              confirmLabel="Delete qualification"
              onClose={() => setPending(null)}
              onConfirm={() => {
                removeItem("qualifications", (x) => x.id === q.id);
                qLog(d, "qualification", q.id, "Qualification deleted", `${q.code} ${q.title}`);
                toast.success(`${q.code} deleted`);
                onDeleted();
              }}
            />
          );
        })()}
      {pending?.kind === "deleteUnit" &&
        (() => {
          const u = pending.unit;
          const n = achievementsFor(u.code).length;
          return n ? (
            <BlockedDialog
              title={`Can't delete ${u.code}`}
              reasons={[`${plural(n, "learner has", "learners have")} an outcome recorded on it`]}
              hint="Unit outcomes are part of the learners' record of results. Clear them first if they were entered in error."
              onClose={() => setPending(null)}
            />
          ) : (
            <ConfirmDialog
              title={`Remove ${u.code}?`}
              body={`${u.code} ${u.title} will be removed from ${q.code}.`}
              confirmLabel="Remove unit"
              onClose={() => setPending(null)}
              onConfirm={() => {
                updateItem("qualifications", (x) => x.id === q.id, {
                  units: q.units.filter((x) => x.code !== u.code),
                });
                qLog(d, "qualification", q.id, "Unit removed", `${u.code} ${u.title}`, "—");
                toast.success(`${u.code} removed from ${q.code}`);
              }}
            />
          );
        })()}
      {pending?.kind === "unenrol" &&
        (() => {
          const l = pending.learner;
          const n = achievementsFor(undefined, l.id).length;
          return (
            <ConfirmDialog
              title={n ? "Withdraw from qualification" : `Unenrol ${l.name}?`}
              body={
                n
                  ? `${l.name} has ${plural(n, "unit outcome")} on ${q.code}. Withdrawing removes them from this qualification but keeps those outcomes as history (record of results).`
                  : `${l.name} will be removed from ${q.code}. No unit outcomes are recorded.`
              }
              confirmLabel={n ? "Withdraw from qualification" : "Unenrol"}
              onClose={() => setPending(null)}
              onConfirm={() => {
                updateItem("learners", (x) => x.id === l.id, { qualificationId: undefined });
                qLog(d, "learner", l.id, "Qualification", `${q.code} ${q.title}`, "—", {
                  studentId: l.id,
                  reason: n ? `Withdrawn — ${n} unit outcomes kept as history` : "Unenrolled",
                });
                notify({
                  tenantId: d.tenantId,
                  channel: "Email",
                  to: `${l.name} (${l.email})`,
                  subject: `You've been withdrawn from ${q.code} ${q.title}`,
                  source: "Qualifications · enrolment",
                  relatedId: l.id,
                });
                toast.success(`${l.name} ${n ? "withdrawn from" : "unenrolled from"} ${q.code}`);
              }}
            />
          );
        })()}
    </div>
  );
}

/** Create or edit a qualification's details (units are managed separately). */
function QualDialog({
  q,
  onClose,
  onCreated,
}: {
  q?: Qualification;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const d = useHeData();
  const [f, setF] = useState({
    code: q?.code ?? "",
    title: q?.title ?? "",
    awardingBody: q?.awardingBody ?? "",
    level: q?.level ?? "",
    fundingStream: q?.fundingStream ?? "",
    electivesRequired: String(q?.electivesRequired ?? 0),
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const LABELS: Record<keyof typeof f, string> = {
    code: "Code",
    title: "Title",
    awardingBody: "Awarding body",
    level: "Level",
    fundingStream: "Funding stream",
    electivesRequired: "Electives required",
  };
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={q ? `Edit ${q.code}` : "New qualification"}
      description={q ? undefined : "Add the units after creating it."}
      submitLabel={q ? "Save changes" : "Create qualification"}
      onSubmit={() => {
        const code = f.code.trim().toUpperCase();
        if (!code || !f.title.trim()) {
          toast.error("Code and title are required");
          return;
        }
        if (d.quals.some((x) => x.code === code && x.id !== q?.id)) {
          toast.error(`${code} already exists`);
          return;
        }
        const next = {
          code,
          title: f.title.trim(),
          awardingBody: f.awardingBody.trim() || "—",
          level: f.level.trim() || "—",
          fundingStream: f.fundingStream.trim() || "—",
          electivesRequired: Math.max(0, Number(f.electivesRequired) || 0),
        };
        if (q) {
          const changed = (Object.keys(next) as (keyof typeof next)[]).filter(
            (k) => String(q[k] ?? "") !== String(next[k]),
          );
          if (!changed.length) {
            onClose();
            return;
          }
          updateItem("qualifications", (x) => x.id === q.id, next);
          for (const k of changed)
            qLog(d, "qualification", q.id, LABELS[k], String(q[k] ?? "—"), String(next[k]));
          toast.success(`${code} updated`);
          onClose();
        } else {
          const id = nextId("QUA-", "qualifications");
          addItem("qualifications", { id, tenantId: d.tenantId, units: [], ...next });
          qLog(d, "qualification", id, "Qualification created", undefined, `${code} ${next.title}`);
          toast.success(`${code} created — now add its units`);
          onCreated?.(id);
        }
      }}
    >
      <Field label="Code" required>
        <TextInput
          value={f.code}
          onChange={(e) => set("code", e.target.value)}
          placeholder="ICT40120"
        />
      </Field>
      <Field label="Level">
        <TextInput
          value={f.level}
          onChange={(e) => set("level", e.target.value)}
          placeholder="AQF 4 · Level 3"
        />
      </Field>
      <Field label="Title" required className="sm:col-span-2">
        <TextInput value={f.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label="Awarding body">
        <TextInput
          value={f.awardingBody}
          onChange={(e) => set("awardingBody", e.target.value)}
          placeholder="Nationally recognised (AQF)"
        />
      </Field>
      <Field label="Funding stream">
        <TextInput value={f.fundingStream} onChange={(e) => set("fundingStream", e.target.value)} />
      </Field>
      <Field label="Electives required">
        <NumberInput
          min={0}
          value={f.electivesRequired}
          onChange={(e) => set("electivesRequired", e.target.value)}
        />
      </Field>
    </FormDialog>
  );
}

/** Enrol a tenant learner onto this qualification. */
function EnrolDialog({ q, onClose }: { q: Qualification; onClose: () => void }) {
  const d = useHeData();
  const pool = d.learners
    .filter(
      (l) => l.qualificationId !== q.id && (l.status === "Active" || l.status === "Applicant"),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const [studentId, setStudentId] = useState("");
  const [reason, setReason] = useState("");
  const l = pool.find((x) => x.id === studentId);
  const current = d.quals.find((x) => x.id === l?.qualificationId);
  const keptOutcomes = current
    ? d.units.filter((u) => u.studentId === l?.id && u.qualificationId === current.id).length
    : 0;
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Enrol on ${q.code}`}
      description={q.title}
      submitLabel="Enrol"
      onSubmit={() => {
        if (!l) {
          toast.error("Choose a learner");
          return;
        }
        if (current && !reason.trim()) {
          toast.error(`${l.name} is on ${current.code} — give a reason for the move`);
          return;
        }
        updateItem("learners", (x) => x.id === l.id, { qualificationId: q.id });
        qLog(
          d,
          "learner",
          l.id,
          "Qualification",
          current ? `${current.code} ${current.title}` : "—",
          `${q.code} ${q.title}`,
          { studentId: l.id, reason: reason.trim() || "Enrolled by admin" },
        );
        notify({
          tenantId: d.tenantId,
          channel: "Email",
          to: `${l.name} (${l.email})`,
          subject: `You've been enrolled on ${q.code} ${q.title}`,
          source: "Qualifications · enrolment",
          relatedId: l.id,
        });
        toast.success(`${l.name} enrolled on ${q.code}`, { description: "Learner notified" });
        onClose();
      }}
    >
      <Field label="Learner" required className="sm:col-span-2">
        <Select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          options={[
            { value: "", label: pool.length ? "Choose a learner…" : "No learners available" },
            ...pool.map((x) => {
              const cur = d.quals.find((qq) => qq.id === x.qualificationId);
              return {
                value: x.id,
                label: `${x.name} · ${x.id} · ${x.level}${cur ? ` · on ${cur.code}` : x.programmeId ? " · degree student" : ""}`,
              };
            }),
          ]}
        />
      </Field>
      {current && (
        <>
          <p className="sm:col-span-2 text-xs rounded-lg border border-warning/40 bg-warning/10 p-3">
            {l?.name} is enrolled on {current.code}. Enrolling moves them to {q.code}
            {keptOutcomes
              ? ` — their ${plural(keptOutcomes, "unit outcome")} on ${current.code} stay as history.`
              : "."}
          </p>
          <Field label="Reason for the move" required className="sm:col-span-2">
            <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

function StudentView() {
  const d = useHeData();
  const me = d.me;
  const q = d.quals.find((x) => x.id === me?.qualificationId);
  if (!me || !q)
    return (
      <div className="text-sm text-muted-foreground">You aren't enrolled on a qualification.</div>
    );
  const pr = qualProgress(q, d.units, me.id);
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Qualification"
          value={q.code}
          hint={q.title}
          icon={<Award className="h-4 w-4" />}
        />
        <StatCard
          label="Progress"
          value={`${pr.pct}%`}
          hint={`Core ${pr.coreDone}/${pr.coreTotal}`}
          icon={<BadgeCheck className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Certification"
          value={pr.eligible ? "Eligible" : "Not yet"}
          hint={`${pr.electivesDone}/${pr.electivesRequired} electives`}
          icon={<BadgeCheck className="h-4 w-4" />}
          accent={pr.eligible ? "success" : "warning"}
        />
      </div>
      <Section title="My units">
        <div className="space-y-1.5">
          {q.units.map((u) => {
            const o = d.units.find(
              (x) => x.studentId === me.id && x.qualificationId === q.id && x.unitCode === u.code,
            );
            return (
              <div
                key={u.code}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-mono text-xs text-muted-foreground mr-1.5">{u.code}</span>
                  {u.title}
                  <div className="text-[11px] text-muted-foreground">
                    {u.core ? "Core" : "Elective"} · {u.hours} h
                    {o?.assessor ? ` · ${o.assessor}` : ""}
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] shrink-0 ${o ? TONE[o.outcome] : "bg-muted text-muted-foreground"}`}
                >
                  {o?.outcome ?? "Not started"}
                </span>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

/** Add a unit, or edit one. The code is locked once outcomes are recorded against it. */
function UnitDialog({
  q,
  unit,
  locked = false,
  onClose,
}: {
  q: Qualification;
  unit?: QualUnit;
  locked?: boolean;
  onClose: () => void;
}) {
  const d = useHeData();
  const [code, setCode] = useState(unit?.code ?? "");
  const [title, setTitle] = useState(unit?.title ?? "");
  const [hours, setHours] = useState<number | string>(unit?.hours ?? 40);
  const [core, setCore] = useState(String(unit?.core ?? false));
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={unit ? `Edit ${unit.code}` : "Add unit"}
      description={`${q.code} ${q.title}`}
      submitLabel={unit ? "Save unit" : "Add unit"}
      onSubmit={() => {
        const c = code.trim().toUpperCase();
        if (!c || !title.trim()) {
          toast.error("Unit code and title are required");
          return;
        }
        if (q.units.some((u) => u.code === c && u.code !== unit?.code)) {
          toast.error("That unit is already in the qualification");
          return;
        }
        const next: QualUnit = {
          code: c,
          title: title.trim(),
          hours: Math.max(1, Number(hours) || 1),
          core: core === "true",
        };
        if (unit) {
          updateItem("qualifications", (x) => x.id === q.id, {
            units: q.units.map((u) => (u.code === unit.code ? next : u)),
          });
          const fields: [string, string, string][] = [
            ["Code", unit.code, next.code],
            ["Title", unit.title, next.title],
            ["Hours", String(unit.hours), String(next.hours)],
            ["Type", unit.core ? "Core" : "Elective", next.core ? "Core" : "Elective"],
          ];
          for (const [f, a, b] of fields)
            if (a !== b) qLog(d, "qualification", q.id, `Unit ${unit.code} · ${f}`, a, b);
          toast.success(`${c} updated`);
        } else {
          updateItem("qualifications", (x) => x.id === q.id, { units: [...q.units, next] });
          qLog(d, "qualification", q.id, "Unit added", undefined, `${c} ${next.title}`);
          toast.success(`${c} added to ${q.code}`);
        }
        onClose();
      }}
    >
      <Field
        label="Unit code"
        required
        hint={locked ? "Locked — outcomes are recorded against this code" : undefined}
      >
        <TextInput
          value={code}
          disabled={locked}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ICTSAS526"
        />
      </Field>
      <Field label="Nominal hours">
        <NumberInput min={1} value={hours} onChange={(e) => setHours(e.target.value)} />
      </Field>
      <Field label="Title" required className="sm:col-span-2">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Type">
        <Select
          value={core}
          onChange={(e) => setCore(e.target.value)}
          options={[
            { value: "true", label: "Core" },
            { value: "false", label: "Elective" },
          ]}
        />
      </Field>
    </FormDialog>
  );
}
