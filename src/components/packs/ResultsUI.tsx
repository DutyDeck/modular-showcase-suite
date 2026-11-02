/**
 * Results (GPA / CGPA, release, appeals, certificates) — shared hooks and UI
 * used by Assessment & Boards, Transcripts & Awards and the Institution
 * Profile "Grading scheme" section.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import {
  Section,
  Badge,
  Button,
  Field,
  NumberInput,
  Select,
  TextInput,
  TextArea,
} from "@/components/ui-kit";
import { addItem, updateItem, useCollection } from "@/lib/store";
import { useTenantContext } from "@/lib/packs/registry";
import {
  moduleOutcome,
  type ModuleMark,
  type ModuleOutcome,
  type HeModule,
} from "@/lib/packs/heData";
import { logChange } from "@/lib/packs/sis/activity";
import {
  GRADING_PRESETS,
  SEMESTER_LABEL,
  batchCovers,
  fmtGpa,
  gpaSummary,
  gradeFor,
  isReleased,
  presetById,
  schemeFor,
  schemeFromPreset,
  type GpaInput,
  type GradeBand,
  type GradingScheme,
  type MarkBatch,
} from "@/lib/packs/sis/results";
import type { HeData } from "@/components/packs/HeDash";
import { fmtDate } from "@/components/packs/HeDash";

/* ── Data hook ───────────────────────────────────────────────────────────── */

export function useResults() {
  const ctx = useTenantContext();
  const t = ctx.tenantId;
  const schemesAll = useCollection("gradingSchemes");
  const batchesAll = useCollection("markBatches");
  const appealsAll = useCollection("gradeAppeals");
  const certsAll = useCollection("certificateIssues");
  return useMemo(
    () => ({
      scheme: schemeFor(schemesAll, t, ctx.profile?.region),
      batches: batchesAll.filter((x) => x.tenantId === t),
      appeals: appealsAll.filter((x) => x.tenantId === t),
      certs: certsAll.filter((x) => x.tenantId === t),
      certsAll,
    }),
    [schemesAll, batchesAll, appealsAll, certsAll, t, ctx.profile?.region],
  );
}

export type ResultsData = ReturnType<typeof useResults>;

/** Marks a viewer may see: students only see marks in a published batch. */
export function visibleMarks(d: HeData, batches: MarkBatch[]): ModuleMark[] {
  return d.ctx.user?.role === "student" ? d.marks.filter((m) => isReleased(batches, m)) : d.marks;
}

/** "Results release on 27 Nov 2026" for a student's unreleased marks in a module. */
export function releaseNote(
  d: HeData,
  batches: MarkBatch[],
  studentId: string,
  moduleId: string,
): string | undefined {
  const hidden = d.marks.filter(
    (m) =>
      m.studentId === studentId &&
      m.moduleId === moduleId &&
      m.mark !== undefined &&
      !isReleased(batches, m),
  );
  if (!hidden.length) return undefined;
  const dates = hidden
    .map(
      (m) =>
        batches.find((x) => x.status === "Approved" && x.releaseDate && batchCovers(x, m))
          ?.releaseDate,
    )
    .filter((x): x is string => !!x)
    .sort();
  return dates.length
    ? `Results release on ${fmtDate(dates[dates.length - 1])}`
    : "Results not yet released";
}

/* ── Per-module results → GPA rows ───────────────────────────────────────── */

export interface ModuleResult {
  mod: HeModule;
  outcome: ModuleOutcome;
  year: string;
  term: string;
  termKey: string;
  grade?: GradeBand;
}

const SEM_ORDER: Record<string, string> = { S1: "1", S2: "2", Year: "3" };

/** Module results for a student from a set of marks (complete modules get a grade). */
export function moduleResults(
  d: HeData,
  scheme: GradingScheme,
  marks: ModuleMark[],
  studentId: string,
  passMark: number,
): ModuleResult[] {
  const mine = marks.filter((m) => m.studentId === studentId && m.mark !== undefined);
  const ids = Array.from(new Set(mine.map((m) => m.moduleId)));
  return ids
    .map((id) => d.moduleById(id))
    .filter((m): m is HeModule => !!m)
    .map((mod) => {
      const outcome = moduleOutcome(mod, marks, studentId, passMark);
      const year =
        mine
          .filter((m) => m.moduleId === mod.id)
          .map((m) => m.academicYear ?? "")
          .sort()
          .pop() ?? "";
      return {
        mod,
        outcome,
        year,
        term: `${year} · ${SEMESTER_LABEL[mod.semester] ?? mod.semester}`,
        termKey: `${year}|${SEM_ORDER[mod.semester] ?? "9"}`,
        grade:
          outcome.complete && outcome.mark !== undefined
            ? gradeFor(scheme, outcome.mark)
            : undefined,
      };
    })
    .sort((a, b) => a.termKey.localeCompare(b.termKey) || a.mod.code.localeCompare(b.mod.code));
}

export function gpaInputs(rows: ModuleResult[]): GpaInput[] {
  return rows
    .filter((r) => r.outcome.complete && r.outcome.mark !== undefined)
    .map((r) => ({
      credits: r.mod.credits,
      mark: r.outcome.mark!,
      term: r.term,
      termKey: r.termKey,
    }));
}

/** Semester GPA + CGPA + standing. */
export function GpaPanel({
  scheme,
  rows,
  compact,
}: {
  scheme: GradingScheme;
  rows: ModuleResult[];
  compact?: boolean;
}) {
  const sum = gpaSummary(scheme, gpaInputs(rows));
  const gpa = scheme.kind === "gpa";
  const preset = presetById(scheme.presetId);
  return (
    <div className="space-y-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {gpa ? "CGPA" : "Credit-weighted average"}
          </div>
          <div className="text-xl font-bold">
            {sum.credits ? fmtGpa(scheme, sum.cumulative) : "—"}
          </div>
        </div>
        {sum.credits > 0 && (
          <Badge tone={sum.goodStanding ? "success" : "destructive"}>
            {sum.goodStanding ? "Good standing" : "Academic probation"}
          </Badge>
        )}
      </div>
      {!compact && (
        <ul className="space-y-1 text-xs">
          {sum.terms.map((t) => (
            <li
              key={t.termKey}
              className="flex justify-between gap-2 rounded bg-muted/40 px-2 py-1"
            >
              <span>{t.term}</span>
              <span className="font-mono">
                {gpa ? "GPA " : "avg "}
                {fmtGpa(scheme, t.value)} · {t.credits} cr
              </span>
            </li>
          ))}
          {!sum.terms.length && (
            <li className="text-muted-foreground">No released module results yet.</li>
          )}
        </ul>
      )}
      <div className="text-[11px] text-muted-foreground">
        {preset?.label ?? (gpa ? `${scheme.scale}-point GPA` : "Classification")} · good standing{" "}
        {gpa ? `CGPA ≥ ${scheme.goodStanding ?? 0}` : `average ≥ ${scheme.goodStanding ?? 40}%`}
      </div>
    </div>
  );
}

/** Grade + points chip for a module mark. */
export function GradeChip({ scheme, band }: { scheme: GradingScheme; band?: GradeBand }) {
  if (!band) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="font-semibold">{band.grade}</span>
      {scheme.kind === "gpa" && (
        <span className="text-muted-foreground font-mono">{band.points.toFixed(1)}</span>
      )}
    </span>
  );
}

/* ── Institution Profile → Grading scheme ────────────────────────────────── */

export function GradingSchemeSection({ canEdit }: { canEdit: boolean }) {
  const ctx = useTenantContext();
  const schemes = useCollection("gradingSchemes");
  const saved = schemes.find((s) => s.tenantId === ctx.tenantId);
  const current = schemeFor(schemes, ctx.tenantId, ctx.profile?.region);
  const [draft, setDraft] = useState<GradingScheme>(current);
  const [sample, setSample] = useState("68");
  const dirty = JSON.stringify(draft) !== JSON.stringify(current);
  if (!ctx.packs.has("higher-ed") && !ctx.packs.has("college")) return null;

  const gpa = draft.kind === "gpa";
  const setBand = (i: number, p: Partial<GradeBand>) =>
    setDraft((s) => ({ ...s, bands: s.bands.map((x, j) => (j === i ? { ...x, ...p } : x)) }));
  const applyPreset = (id: string) => {
    const p = presetById(id);
    if (p) setDraft(schemeFromPreset(ctx.tenantId, p));
  };
  const save = () => {
    const next = { ...draft, bands: [...draft.bands].sort((a, b) => b.min - a.min) };
    if (saved) updateItem("gradingSchemes", (x) => x.tenantId === ctx.tenantId, next);
    else addItem("gradingSchemes", next);
    logChange({
      tenantId: ctx.tenantId,
      entity: "gradingScheme",
      entityId: ctx.tenantId,
      field: "scheme",
      from: presetById(current.presetId)?.label ?? current.kind,
      to: `${presetById(next.presetId)?.label ?? next.kind} · ${next.bands.length} bands · good standing ${next.goodStanding}`,
      by: ctx.user?.name ?? "Admin",
    });
    setDraft(next);
    toast.success("Grading scheme saved — results and transcripts use it now");
  };
  const s = Number(sample);
  const band = Number.isFinite(s) ? gradeFor(draft, s) : undefined;

  return (
    <Section
      title={
        <span className="inline-flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" /> Grading scheme
        </span>
      }
      description="How module marks become grades, GPA / CGPA and standing. Shown on student results and transcripts."
      actions={
        canEdit && (
          <>
            <Select
              className="h-8 w-56"
              value={draft.presetId ?? ""}
              onChange={(e) => applyPreset(e.target.value)}
              options={[
                ...(draft.presetId ? [] : [{ value: "", label: "Custom" }]),
                ...GRADING_PRESETS.map((p) => ({ value: p.id, label: p.label })),
              ]}
            />
            <Button size="sm" disabled={!dirty} onClick={save}>
              Save
            </Button>
          </>
        )
      }
    >
      <div className="grid md:grid-cols-[1fr_260px] gap-5">
        <div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-1.5 pr-2 font-medium">From mark %</th>
                <th className="py-1.5 pr-2 font-medium">Grade</th>
                {gpa && <th className="py-1.5 pr-2 font-medium">Grade points</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {draft.bands.map((x, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1 pr-2">
                    <NumberInput
                      className="h-8 w-20"
                      min={0}
                      max={100}
                      disabled={!canEdit}
                      value={x.min}
                      onChange={(e) => setBand(i, { min: Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <TextInput
                      className="h-8 w-24"
                      disabled={!canEdit}
                      value={x.grade}
                      onChange={(e) => setBand(i, { grade: e.target.value })}
                    />
                  </td>
                  {gpa && (
                    <td className="py-1 pr-2">
                      <NumberInput
                        className="h-8 w-20"
                        step={0.1}
                        min={0}
                        max={draft.scale}
                        disabled={!canEdit}
                        value={x.points}
                        onChange={(e) => setBand(i, { points: Number(e.target.value) })}
                      />
                    </td>
                  )}
                  <td className="py-1 text-right">
                    {canEdit && draft.bands.length > 2 && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Remove band"
                        onClick={() =>
                          setDraft((d) => ({ ...d, bands: d.bands.filter((_, j) => j !== i) }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  presetId: undefined,
                  bands: [...d.bands, { min: 0, grade: "New", points: 0 }],
                }))
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add band
            </Button>
          )}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type">
              <TextInput value={gpa ? `GPA · ${draft.scale}-point` : "Classification"} disabled />
            </Field>
            <Field label={gpa ? "Good standing (CGPA ≥)" : "Good standing (avg ≥)"}>
              <NumberInput
                step={gpa ? 0.1 : 1}
                disabled={!canEdit}
                value={draft.goodStanding ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, goodStanding: Number(e.target.value) }))}
              />
            </Field>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="font-medium">Try a mark</div>
            <div className="flex items-center gap-2">
              <NumberInput
                className="h-8 w-20"
                value={sample}
                onChange={(e) => setSample(e.target.value)}
              />
              <span>
                → <span className="font-semibold">{band?.grade ?? "—"}</span>
                {gpa && band && (
                  <span className="text-muted-foreground"> · {band.points} points</span>
                )}
              </span>
            </div>
          </div>
          <Field label="Note">
            <TextArea
              className="min-h-[60px] text-xs"
              disabled={!canEdit}
              value={draft.note ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </Field>
        </div>
      </div>
    </Section>
  );
}
