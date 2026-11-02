/* Shared pieces for the pack-tenant Courses and LMS views: which teaching
 * groups the signed-in user sees, how a learning item is shown, and the
 * "add to a group" dialog for teachers and admins. */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  ClipboardCheck,
  Eye,
  FileText,
  Heart,
  ListChecks,
  PlayCircle,
  Shapes,
  Video,
} from "lucide-react";
import { Badge, Field, FormDialog, Select, TextArea, TextInput } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { addItem, nextId, useCollection } from "@/lib/store";
import { isPackTenantUser } from "@/lib/packs/coreBridge";
import { useTenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import { logChange, notify } from "@/lib/packs/sis/activity";
import { buildTeachingGroups, groupsForUser, type TeachingGroup } from "@/lib/packs/sis/learning";
import {
  journalGroups,
  endTime,
  fmtDay,
  kindLabel,
  moduleTerm,
  scheduleLabel,
  slotsForGroup,
  whenLabel,
  type LearningItem,
  type LearningKind,
} from "@/lib/packs/sis/lmsContent";
import type { TimetableSlot } from "@/lib/packs/opsData";

/** Everything the pack learning views need, scoped to the signed-in user. */
export function usePackLearning() {
  const { user } = useAuth();
  const ctx = useTenantContext();
  const profiles = useCollection("tenantProfiles");
  const subjectClasses = useCollection("subjectClasses");
  const heModules = useCollection("heModules");
  const moduleRegistrations = useCollection("moduleRegistrations");
  const qualifications = useCollection("qualifications");
  const learners = useCollection("learners");
  const tutorGroups = useCollection("tutorGroups");
  const slots = useCollection("timetableSlots");
  const rooms = useCollection("rooms");
  const items = useCollection("learningItems");
  const programmes = useCollection("programmes");

  const pack = isPackTenantUser(user, profiles);

  const all = useMemo(
    () => [
      ...buildTeachingGroups({
        subjectClasses,
        heModules,
        moduleRegistrations,
        qualifications,
        learners,
      }),
      ...journalGroups(learners, tutorGroups),
    ],
    [subjectClasses, heModules, moduleRegistrations, qualifications, learners, tutorGroups],
  );

  const tenantGroups = useMemo(
    () => all.filter((g) => g.tenantId === ctx.tenantId),
    [all, ctx.tenantId],
  );

  const visible = useMemo(
    () => (user ? groupsForUser(user, all, learners) : []),
    [user, all, learners],
  );

  /** Learners the viewer acts for: parent → children, student → self. */
  const family = useMemo(() => {
    if (!user) return [] as Learner[];
    const mine = learners.filter((l) => l.tenantId === ctx.tenantId);
    if (user.role === "parent") return mine.filter((l) => l.guardians?.includes(user.name));
    if (user.role === "student") return mine.filter((l) => l.id === user.oneEduId);
    return [];
  }, [user, learners, ctx.tenantId]);

  const isStaff = user?.role === "teacher" || user?.role === "admin";

  const slotsFor = (g: TeachingGroup): TimetableSlot[] => slotsForGroup(g, slots, learners);
  const roomFor = (g: TeachingGroup): string | undefined => {
    const s = slotsFor(g).find((x) => x.roomId);
    return rooms.find((r) => r.id === s?.roomId)?.name ?? g.room;
  };
  const teacherFor = (g: TeachingGroup): string =>
    g.teacher || slotsFor(g)[0]?.teacherName || "Trainer team";
  const canEdit = (g: TeachingGroup) =>
    !!user &&
    g.tenantId === user.institutionId &&
    (user.role === "admin" || (user.role === "teacher" && teacherFor(g) === user.name));

  /** Items in a group the viewer may see (EY observations: own child only). */
  const itemsFor = (g: TeachingGroup): LearningItem[] => {
    const familyIds = new Set(family.map((f) => f.id));
    return items.filter(
      (it) =>
        it.groupId === g.id &&
        (!it.studentId || isStaff || familyIds.has(it.studentId)) &&
        (g.band !== "early" || isStaff || it.sharedWithFamily !== false),
    );
  };

  return {
    user,
    ctx,
    pack,
    all,
    tenantGroups,
    visible,
    family,
    learners,
    items,
    programmes,
    heModules,
    isStaff,
    slotsFor,
    roomFor,
    teacherFor,
    canEdit,
    itemsFor,
    schedule: (g: TeachingGroup) =>
      scheduleLabel(
        g,
        slotsFor(g),
        g.kind === "module"
          ? moduleTerm(g.tenantId, heModules.find((m) => m.id === g.id)?.semester)
          : "now",
      ),
  };
}

export type PackLearning = ReturnType<typeof usePackLearning>;

const ICON: Record<LearningKind, typeof BookOpen> = {
  Lesson: BookOpen,
  Resource: FileText,
  "Live class": Video,
  Recording: PlayCircle,
  Quiz: ListChecks,
  Activity: ClipboardCheck,
  Observation: Eye,
};

export function ItemIcon({ kind, band }: { kind: LearningKind; band?: string }) {
  const I = band === "early" && kind === "Activity" ? Shapes : ICON[kind];
  const tone =
    kind === "Live class"
      ? "bg-destructive/10 text-destructive"
      : kind === "Observation"
        ? "bg-pink-500/10 text-pink-600"
        : kind === "Quiz" || kind === "Activity"
          ? "bg-warning/15 text-warning-foreground"
          : "bg-primary/10 text-primary";
  return (
    <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${tone}`}>
      <I className="h-4 w-4" />
    </div>
  );
}

/** One learning item as a row. */
export function ItemRow({
  item,
  group,
  showGroup,
  childName,
}: {
  item: LearningItem;
  group?: TeachingGroup;
  showGroup?: boolean;
  childName?: string;
}) {
  const band = group?.band ?? "upper-secondary";
  const time = item.start ? ` · ${item.start}–${endTime(item.start, item.durationMins ?? 60)}` : "";
  return (
    <div className="flex items-start gap-3 py-2.5">
      <ItemIcon kind={item.kind} band={band} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{item.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {kindLabel(item.kind, band)}
          {showGroup && group ? ` · ${group.title}` : ""}
          {item.date ? ` · ${whenLabel(item.date)}${time}` : ""}
          {item.location ? ` · ${item.location}` : ""}
          {childName ? ` · ${childName}` : ""}
        </div>
        {item.detail && <div className="text-xs mt-1 text-foreground/80">{item.detail}</div>}
        {(item.due || item.sharedWithFamily || item.area) && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {item.due && (
              <Badge tone={item.due < DEMO_TODAY ? "muted" : "warning"}>
                Due {whenLabel(item.due)}
              </Badge>
            )}
            {item.area && band === "early" && <Badge tone="info">{item.area}</Badge>}
            {item.sharedWithFamily && (
              <Badge tone="success">
                <Heart className="h-3 w-3 mr-1" />
                Shared with family
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Add a lesson / resource / live class to a group ── */

const KINDS: LearningKind[] = ["Lesson", "Live class", "Resource", "Recording", "Quiz", "Activity"];

function ageOn(dob: string, on = DEMO_TODAY): number {
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = on.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

export function AddLearningDialog({
  open,
  onOpenChange,
  groups,
  defaultGroupId,
  learners,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: TeachingGroup[];
  defaultGroupId?: string;
  learners: Learner[];
}) {
  const { user } = useAuth();
  const blank = {
    groupId: "",
    kind: "Lesson" as LearningKind,
    title: "",
    topic: "",
    date: DEMO_TODAY,
    start: "",
    durationMins: 60,
    detail: "",
    studentId: "",
  };
  const [f, setF] = useState(blank);
  const groupId =
    (groups.some((x) => x.id === f.groupId) && f.groupId) || defaultGroupId || groups[0]?.id || "";
  const g = groups.find((x) => x.id === groupId);
  const early = g?.band === "early";
  const kinds: LearningKind[] = early ? ["Activity", "Observation", "Resource"] : KINDS;
  const kind = kinds.includes(f.kind) ? f.kind : kinds[0];
  const kids = learners.filter((l) => g?.studentIds.includes(l.id));

  const submit = () => {
    if (!g || !user) return;
    if (!f.title.trim()) {
      toast.error("Add a title");
      return;
    }
    if (kind === "Observation" && !f.studentId) {
      toast.error("Choose the child");
      return;
    }
    const id = nextId("LI-", "learningItems");
    const timed = kind === "Lesson" || kind === "Live class" || (early && kind === "Activity");
    const item: LearningItem = {
      id,
      tenantId: g.tenantId,
      groupId: g.id,
      kind,
      title: f.title.trim(),
      topic: f.topic.trim() || undefined,
      detail: f.detail.trim() || undefined,
      date: f.date || DEMO_TODAY,
      start: timed && f.start ? f.start : undefined,
      durationMins: timed && f.start ? Number(f.durationMins) || 60 : undefined,
      location: kind === "Live class" ? "Online (Teams)" : undefined,
      due: kind === "Quiz" || (kind === "Activity" && !early) ? f.date : undefined,
      studentId: kind === "Observation" ? f.studentId : undefined,
      sharedWithFamily: early ? true : undefined,
      area: early ? f.topic.trim() || undefined : undefined,
      author: user.name,
    };
    addItem("learningItems", item);
    logChange({
      tenantId: g.tenantId,
      entity: "learningItem",
      entityId: id,
      field: "created",
      to: `${kind}: ${item.title}`,
      by: user.name,
      reason: g.title,
    });
    // Tell the learners (adults / teens) and the families of under-18s.
    const audience = kind === "Observation" ? kids.filter((k) => k.id === f.studentId) : kids;
    const recipients = new Set<string>();
    for (const l of audience) {
      const minor = l.dob ? ageOn(l.dob) < 18 : false;
      if (!(early || g.band === "primary")) recipients.add(l.name);
      if (minor) l.guardians?.forEach((p) => recipients.add(p));
    }
    const label = kindLabel(kind, g.band);
    recipients.forEach((to) =>
      notify({
        tenantId: g.tenantId,
        channel: "App",
        to,
        subject: `${g.title}: new ${label.toLowerCase()} — ${item.title}`,
        body: item.date
          ? `${fmtDay(item.date)}${item.start ? ` at ${item.start}` : ""}`
          : undefined,
        source: "LMS · new content",
        relatedId: id,
      }),
    );
    toast.success(`Added to ${g.title}${recipients.size ? ` · ${recipients.size} notified` : ""}`);
    setF(blank);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={early ? "Add to the learning journal" : "Add to a class"}
      description={
        early
          ? "Activities and observations are shared with the family."
          : "Learners and families are notified."
      }
      onSubmit={submit}
      submitLabel="Add"
    >
      {groups.length > 1 && (
        <Field label="Class / group" className="sm:col-span-2">
          <Select
            value={groupId}
            onChange={(e) => setF({ ...f, groupId: e.target.value })}
            options={groups.map((x) => ({ value: x.id, label: `${x.title} (${x.code})` }))}
          />
        </Field>
      )}
      <Field label="Type">
        <Select
          value={kind}
          onChange={(e) => setF({ ...f, kind: e.target.value as LearningKind })}
          options={kinds.map((k) => ({ value: k, label: g ? kindLabel(k, g.band) : k }))}
        />
      </Field>
      <Field label={kind === "Quiz" || kind === "Activity" ? "Date / due" : "Date"}>
        <TextInput
          type="date"
          value={f.date}
          onChange={(e) => setF({ ...f, date: e.target.value })}
        />
      </Field>
      {kind === "Observation" && (
        <Field label="Child" className="sm:col-span-2">
          <Select
            value={f.studentId}
            onChange={(e) => setF({ ...f, studentId: e.target.value })}
            options={[
              { value: "", label: "Choose…" },
              ...kids.map((k) => ({ value: k.id, label: k.name })),
            ]}
          />
        </Field>
      )}
      <Field label="Title" required className="sm:col-span-2">
        <TextInput
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          placeholder={
            early
              ? "e.g. Counting song: Five Little Ducks"
              : g?.band === "primary"
                ? "e.g. Spelling: words with i-e"
                : "e.g. Revision: motion graphs"
          }
          autoFocus
        />
      </Field>
      {(kind === "Lesson" || kind === "Live class" || (early && kind === "Activity")) && (
        <>
          <Field label="Start">
            <TextInput
              type="time"
              value={f.start}
              onChange={(e) => setF({ ...f, start: e.target.value })}
            />
          </Field>
          <Field label="Minutes">
            <TextInput
              type="number"
              min={10}
              value={f.durationMins}
              onChange={(e) => setF({ ...f, durationMins: Number(e.target.value) })}
            />
          </Field>
        </>
      )}
      <Field label={early ? "Area of learning" : "Topic"} className="sm:col-span-2">
        <TextInput
          value={f.topic}
          onChange={(e) => setF({ ...f, topic: e.target.value })}
          placeholder={early ? "e.g. Numeracy" : "e.g. Forces and motion"}
        />
      </Field>
      <Field label="Details" className="sm:col-span-2">
        <TextArea value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} />
      </Field>
    </FormDialog>
  );
}
