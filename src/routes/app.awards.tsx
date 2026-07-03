import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Badge,
  Button,
  Field,
  TextInput,
  TextArea,
  Select,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useCollection, addItem, nextId } from "@/lib/store";
import {
  isSwimUser,
  isSwimAdmin,
  awardById,
  isAwardComplete,
  type SwimAward,
  type AwardStrand,
  type AwardTone,
  type AwardProgress,
} from "@/lib/mockData";
import { Award, Plus, CheckCircle2, ListChecks, GraduationCap, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/awards")({
  head: () => ({ meta: [{ title: "Courses & Awards — 1StudentID" }] }),
  component: AwardsPage,
});

export const TONE: Record<AwardTone, { chip: string; grad: string; bar: string }> = {
  amber: {
    chip: "bg-amber-100 text-amber-800 border-amber-200",
    grad: "from-amber-400 to-orange-500",
    bar: "bg-amber-500",
  },
  sky: {
    chip: "bg-sky-100 text-sky-800 border-sky-200",
    grad: "from-sky-400 to-cyan-500",
    bar: "bg-sky-500",
  },
  violet: {
    chip: "bg-violet-100 text-violet-800 border-violet-200",
    grad: "from-violet-400 to-purple-500",
    bar: "bg-violet-500",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
    grad: "from-emerald-400 to-teal-500",
    bar: "bg-emerald-500",
  },
  rose: {
    chip: "bg-rose-100 text-rose-800 border-rose-200",
    grad: "from-rose-400 to-pink-500",
    bar: "bg-rose-500",
  },
};

const STRANDS: AwardStrand[] = ["Duckling", "Learn to Swim", "Award"];
const TONES: AwardTone[] = ["amber", "sky", "violet", "emerald", "rose"];

function AwardsPage() {
  const { user } = useAuth();
  const swim = isSwimUser(user);
  const admin = isSwimAdmin(user);
  const awards = useCollection("swimAwards");
  const progress = useCollection("awardProgress");
  const [selected, setSelected] = useState<string | null>(null);

  const byStrand = useMemo(() => {
    const map = new Map<string, SwimAward[]>();
    for (const a of [...awards].sort((x, y) => x.stage - y.stage)) {
      (map.get(a.strand) ?? map.set(a.strand, []).get(a.strand)!).push(a);
    }
    return map;
  }, [awards]);

  const statFor = (awardId: string) => {
    const rows = progress.filter((p) => p.awardId === awardId);
    const award = awardById[awardId] ?? awards.find((a) => a.id === awardId);
    const certified = rows.filter((r) => !!r.certifiedAt).length;
    const inProgress = rows.length - certified;
    return { certified, inProgress, total: award?.activities.length ?? 0 };
  };

  if (!swim) {
    return (
      <div>
        <PageHeader title="Courses & Awards" subtitle="Swim club curriculum." />
        <Section>
          <p className="text-sm text-muted-foreground">
            The award pathway is available to swim-club coaches and admins.
          </p>
        </Section>
      </div>
    );
  }

  const selectedAward = selected ? awards.find((a) => a.id === selected) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Courses & Awards"
        subtitle="The club's Swim England-style award pathway. Coaches tick each activity off in the session; a completed award earns the swimmer their certificate."
        actions={admin ? <AddCourseButton /> : undefined}
      />

      {STRANDS.filter((s) => byStrand.has(s)).map((strand) => (
        <Section key={strand} title={strand === "Award" ? "Other awards" : `${strand} pathway`}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="awards-catalog">
            {(byStrand.get(strand) ?? []).map((a) => {
              const s = statFor(a.id);
              const tone = TONE[a.tone] ?? TONE.sky;
              const active = selected === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected(active ? null : a.id)}
                  className={`text-left rounded-xl border bg-card overflow-hidden shadow-soft hover:shadow-elegant transition-all ${
                    active ? "ring-2 ring-primary border-primary/40" : ""
                  }`}
                >
                  <div className={`h-16 bg-gradient-to-br ${tone.grad} relative`}>
                    <Award className="absolute right-3 top-3 h-7 w-7 text-white/85" />
                    <div className="absolute bottom-2 left-4 text-white font-bold text-lg drop-shadow">
                      {a.name}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ListChecks className="h-3.5 w-3.5" />
                      {a.activities.length} activities
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {s.certified} certified
                      </span>
                      <span className="text-muted-foreground">{s.inProgress} in progress</span>
                    </div>
                    {a.readyFor && (
                      <div className="mt-3 pt-3 border-t text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        Leads to {a.readyFor}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
      ))}

      {selectedAward && (
        <AwardDetail award={selectedAward} progress={progress} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function AwardDetail({
  award,
  progress,
  onClose,
}: {
  award: SwimAward;
  progress: AwardProgress[];
  onClose: () => void;
}) {
  const tone = TONE[award.tone] ?? TONE.sky;
  const rows = progress
    .filter((p) => p.awardId === award.id)
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return (
    <Section
      title={`${award.name} · activities`}
      description={award.blurb ?? award.awardedText}
      actions={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <ol className="space-y-2">
          {award.activities.map((act, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span
                className={`shrink-0 h-6 w-6 rounded-full ${tone.bar} text-white text-xs font-bold flex items-center justify-center`}
              >
                {i + 1}
              </span>
              <span className="pt-0.5">{act}</span>
            </li>
          ))}
        </ol>

        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Swimmers on this award
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No swimmers assigned yet. Coaches assign and tick off activities from the session
              page.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => {
                const done = r.done.length;
                const total = award.activities.length;
                const pct = Math.round((done / total) * 100);
                const complete = isAwardComplete(award, r);
                return (
                  <li key={r.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{r.studentName}</span>
                      {r.certifiedAt ? (
                        <Link
                          to="/app/certificate/$progressId"
                          params={{ progressId: r.id }}
                          className="text-xs font-medium text-emerald-600 inline-flex items-center gap-1 hover:underline"
                        >
                          <Award className="h-3.5 w-3.5" />
                          Certificate
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {done}/{total}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${complete ? "bg-emerald-500" : tone.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

/** Club admin adds a new award-course with its activity checklist. */
function AddCourseButton() {
  const add = useDisclosure();
  const [name, setName] = useState("");
  const [strand, setStrand] = useState<AwardStrand>("Learn to Swim");
  const [tone, setTone] = useState<AwardTone>("sky");
  const [activities, setActivities] = useState("");
  const [readyFor, setReadyFor] = useState("");
  const [awardedText, setAwardedText] = useState("");

  const submit = () => {
    const acts = activities
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!name.trim()) {
      toast.error("Give the course a name");
      return;
    }
    if (acts.length < 1) {
      toast.error("Add at least one activity (one per line)");
      return;
    }
    const award: SwimAward = {
      id: nextId("AWD-", "swimAwards"),
      name: name.trim(),
      strand,
      tone,
      stage: 99,
      activities: acts,
      readyFor: readyFor.trim() || undefined,
      awardedText: awardedText.trim() || undefined,
    };
    addItem("swimAwards", award);
    toast.success(`Added course “${award.name}” with ${acts.length} activities`);
    setName("");
    setActivities("");
    setReadyFor("");
    setAwardedText("");
    add.onClose();
  };

  return (
    <>
      <Button onClick={add.onOpen} data-tour="new-course-btn">
        <Plus className="h-4 w-4" />
        New course
      </Button>
      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="New award-course"
        description="Define a graded award and the activities a swimmer must complete to earn its certificate."
        onSubmit={submit}
        submitLabel="Add course"
      >
        <Field label="Course / award name" required className="sm:col-span-2">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Learn to Swim Stage 3"
            autoFocus
            data-tour="course-name"
          />
        </Field>
        <Field label="Pathway / strand">
          <Select
            value={strand}
            onChange={(e) => setStrand(e.target.value as AwardStrand)}
            options={STRANDS.map((s) => ({ value: s, label: s }))}
          />
        </Field>
        <Field label="Badge colour">
          <Select
            value={tone}
            onChange={(e) => setTone(e.target.value as AwardTone)}
            options={TONES.map((t) => ({ value: t, label: t }))}
          />
        </Field>
        <Field
          label="Activities (one per line)"
          required
          className="sm:col-span-2"
          hint="Each line becomes a tick-box the coach marks off in the session."
        >
          <TextArea
            value={activities}
            onChange={(e) => setActivities(e.target.value)}
            rows={7}
            data-tour="course-acts"
            placeholder={
              "Push and glide on the front\nSwim 10 metres front crawl\nTread water for 30 seconds"
            }
          />
        </Field>
        <Field label="Ready for (next stage)" className="sm:col-span-2">
          <TextInput
            value={readyFor}
            onChange={(e) => setReadyFor(e.target.value)}
            placeholder="e.g. Learn to Swim Stage 4"
          />
        </Field>
        <Field label="Certificate message" className="sm:col-span-2">
          <TextInput
            value={awardedText}
            onChange={(e) => setAwardedText(e.target.value)}
            placeholder="e.g. You can swim 25 metres — brilliant!"
          />
        </Field>
        <div className="sm:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="h-4 w-4" />
          Coaches assign swimmers and tick these activities off during a session.
        </div>
      </FormDialog>
    </>
  );
}
