import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  Trophy,
  Users,
  BookOpenCheck,
  Star,
  Pencil,
  Trash2,
  ArrowRight,
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
  StatCard,
} from "@/components/ui-kit";
import { PackContextBar, PackEmpty } from "@/components/packs/PackUI";
import { useTenantContext } from "@/lib/packs/registry";
import { addItem, nextId, removeItem, updateItem, useCollection } from "@/lib/store";
import { currentTerm, DEMO_TODAY } from "@/lib/packs/foundationData";
import { houseTotals, type Curriculum, type House, type TutorGroup } from "@/lib/packs/schoolData";
import { curriculumIdFor } from "@/lib/packs/sis/classes";
import { logChange } from "@/lib/packs/sis/activity";
import { TENANT_STAFF } from "@/lib/packs/opsData";
import { DeleteFormDialog, TutorGroupDialog } from "./app.school.classes";

export const Route = createFileRoute("/app/school/curricula")({
  head: () => ({ meta: [{ title: "Curricula & Houses — 1StudentID" }] }),
  component: CurriculaHousesPage,
});

const FRAMEWORKS: Curriculum["framework"][] = [
  "British",
  "IB",
  "CBSE",
  "Sri Lankan National",
  "Australian",
  "American",
];

const FRAMEWORK_TONE: Record<string, string> = {
  British: "from-indigo-500 to-blue-600",
  IB: "from-sky-500 to-cyan-600",
  CBSE: "from-orange-500 to-amber-600",
  "Sri Lankan National": "from-rose-500 to-pink-600",
  Australian: "from-emerald-500 to-green-600",
  American: "from-violet-500 to-purple-600",
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CurriculaHousesPage() {
  const ctx = useTenantContext();
  const { tenantId, isAdmin, user } = ctx;
  const curricula = useCollection("curricula").filter((c) => c.tenantId === tenantId);
  const calendars = useCollection("academicCalendars").filter((c) => c.tenantId === tenantId);
  const tutorGroups = useCollection("tutorGroups").filter((g) => g.tenantId === tenantId);
  const houses = useCollection("houses").filter((h) => h.tenantId === tenantId);
  const points = useCollection("housePoints").filter((p) => p.tenantId === tenantId);
  const learners = useCollection("learners").filter((l) => l.tenantId === tenantId);
  const sets = useCollection("subjectClasses").filter((s) => s.tenantId === tenantId);
  const by = ctx.actingAs || user?.name || "School admin";

  const [curDialog, setCurDialog] = useState<{ editing?: Curriculum } | null>(null);
  const [groupDialog, setGroupDialog] = useState<{ editing?: TutorGroup } | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<TutorGroup | null>(null);
  const [houseDialog, setHouseDialog] = useState<{ editing?: House } | null>(null);
  const [award, setAward] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{
    title: string;
    body: string;
    run: () => void;
  } | null>(null);

  /** Who uses a curriculum — delete is blocked while any of these exist. */
  const curriculumUse = (c: Curriculum) => {
    const pupils = learners.filter((l) => curriculumIdFor(l, curricula) === c.id).length;
    const forms = tutorGroups.filter((g) => g.curriculumId === c.id).length;
    const classes = sets.filter((s) => s.curriculumId === c.id).length;
    return { pupils, forms, classes, total: pupils + forms + classes };
  };
  const deleteCurriculum = (c: Curriculum) => {
    const u = curriculumUse(c);
    if (u.total) {
      toast.error(
        `Can't delete ${c.name}: ${u.pupils} pupils, ${u.forms} forms and ${u.classes} subject classes use it. Move them first.`,
        { duration: 6000 },
      );
      return;
    }
    setConfirmDel({
      title: `Delete ${c.name}?`,
      body: "Nothing uses it any more. This can't be undone.",
      run: () => {
        removeItem("curricula", (x) => x.id === c.id);
        logChange({
          tenantId,
          entity: "curriculum",
          entityId: c.id,
          field: "deleted",
          from: c.name,
          by,
        });
        toast.success(`${c.name} deleted`);
      },
    });
  };
  const deleteHouse = (h: House) => {
    const pupils = learners.filter((l) => l.house === h.name).length;
    const awards = points.filter((p) => p.houseId === h.id).length;
    if (pupils || awards) {
      toast.error(
        `Can't delete ${h.name}: ${pupils} pupils and ${awards} point awards belong to it.`,
        { duration: 6000 },
      );
      return;
    }
    setConfirmDel({
      title: `Delete house ${h.name}?`,
      body: "It has no pupils or points. This can't be undone.",
      run: () => {
        removeItem("houses", (x) => x.id === h.id);
        logChange({
          tenantId,
          entity: "house",
          entityId: h.id,
          field: "deleted",
          from: h.name,
          by,
        });
        toast.success(`House ${h.name} deleted`);
      },
    });
  };

  const totals = useMemo(() => houseTotals(points), [points]);
  const ranked = [...houses].sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0));
  const top = Math.max(1, ...ranked.map((h) => totals.get(h.id) ?? 0));

  if (curricula.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Curricula & Houses"
          subtitle="Programmes of study, tutor groups and houses"
        />
        <PackContextBar pack="intl-school" />
        <PackEmpty
          pack="intl-school"
          title="No curricula set up yet"
          body="Load the International School starter — British, IB and CBSE curricula, tutor groups, houses, a parent-evening template and school-life services — then edit to fit your school."
        />
      </div>
    );
  }

  const calName = (id: string) => calendars.find((c) => c.id === id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curricula & Houses"
        subtitle="Each curriculum runs on its own academic calendar — one school, several years."
        actions={
          isAdmin && (
            <>
              <Button variant="outline" onClick={() => setGroupDialog({})}>
                <Users className="h-4 w-4" /> Tutor group
              </Button>
              <Button variant="outline" onClick={() => setHouseDialog({})}>
                <Trophy className="h-4 w-4" /> House
              </Button>
              <Button onClick={() => setCurDialog({})}>
                <Plus className="h-4 w-4" /> Curriculum
              </Button>
            </>
          )
        }
      />
      <PackContextBar pack="intl-school" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Curricula"
          value={curricula.length}
          icon={<BookOpenCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Academic calendars"
          value={new Set(curricula.map((c) => c.calendarId)).size}
          hint="in use by curricula"
          icon={<CalendarDays className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Tutor groups"
          value={tutorGroups.length}
          icon={<Users className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Houses"
          value={houses.length}
          icon={<Trophy className="h-4 w-4" />}
          accent="warning"
        />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {curricula.map((c) => {
          const cal = calName(c.calendarId);
          const term = cal ? currentTerm(cal) : undefined;
          const roll = learners.filter((l) => curriculumIdFor(l, curricula) === c.id).length;
          return (
            <div key={c.id} className="rounded-xl border bg-card shadow-soft overflow-hidden">
              <div
                className={`relative bg-gradient-to-r ${FRAMEWORK_TONE[c.framework] ?? "from-slate-500 to-slate-600"} text-white p-4`}
              >
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      title="Edit curriculum"
                      onClick={() => setCurDialog({ editing: c })}
                      className="rounded p-1 hover:bg-white/20"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Delete curriculum"
                      onClick={() => deleteCurriculum(c)}
                      className="rounded p-1 hover:bg-white/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="text-[11px] uppercase tracking-wider opacity-80">{c.framework}</div>
                <div className="font-semibold mt-0.5">{c.name}</div>
                <div className="text-xs opacity-90 mt-1">{roll} students on roll</div>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {cal?.name ?? "No calendar bound"}
                  </div>
                  {cal && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {fmtDate(cal.start)} → {fmtDate(cal.end)} · {cal.periodType}
                    </div>
                  )}
                  {cal && (
                    <div className="mt-2 flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                      {cal.terms
                        .filter((t) => t.kind === "teaching")
                        .map((t) => (
                          <div
                            key={t.id}
                            title={`${t.name}: ${fmtDate(t.start)} – ${fmtDate(t.end)}`}
                            className={`flex-1 ${term?.id === t.id ? "bg-primary" : "bg-primary/25"}`}
                          />
                        ))}
                    </div>
                  )}
                  <div className="text-[11px] mt-1.5">
                    Today ({fmtDate(DEMO_TODAY)}):{" "}
                    <span className="font-medium text-foreground">
                      {term ? `${term.name} · ends ${fmtDate(term.end)}` : "Between terms"}
                    </span>
                  </div>
                </div>
                {c.stages?.length ? (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Stages
                    </div>
                    <div className="space-y-1">
                      {c.stages.map((st) => (
                        <div
                          key={st.name}
                          className="flex flex-wrap items-baseline gap-x-2 text-xs"
                        >
                          <span className="font-medium">{st.name}</span>
                          <span className="text-muted-foreground">
                            {st.yearGroups.length > 1
                              ? `${st.yearGroups[0]} – ${st.yearGroups[st.yearGroups.length - 1]}`
                              : st.yearGroups[0]}
                          </span>
                          {st.qualification && <Badge tone="muted">{st.qualification}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Year groups
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.yearGroups.map((y) => (
                        <span key={y} className="text-[11px] rounded border px-1.5 py-0.5">
                          {y}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Exam boards
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.examBoards.map((b) => (
                      <Badge key={b} tone="info">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Section
          title="Tutor groups"
          description="Form classes, each tied to a curriculum and year group"
          className="lg:col-span-3"
          actions={
            <Link to="/app/school/classes">
              <Button size="sm" variant="outline">
                Rosters & enrolment <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        >
          <DataTable
            columns={[
              { key: "name", label: "Group" },
              { key: "yearGroup", label: "Year" },
              { key: "curriculum", label: "Curriculum" },
              { key: "tutor", label: "Tutor" },
              { key: "room", label: "Room" },
              { key: "count", label: "Students", className: "text-right" },
              ...(isAdmin ? [{ key: "_actions", label: "", className: "text-right" }] : []),
            ]}
            rows={tutorGroups}
            renderCell={(g: TutorGroup, k) => {
              if (k === "name") return <span className="font-semibold">{g.name}</span>;
              if (k === "curriculum")
                return curricula.find((c) => c.id === g.curriculumId)?.framework ?? "—";
              if (k === "count") {
                const n = learners.filter((l) => l.group === g.name).length;
                return (
                  <span
                    className={
                      g.capacity && n > g.capacity ? "text-destructive font-medium" : undefined
                    }
                  >
                    {n}
                    {g.capacity ? `/${g.capacity}` : ""}
                  </span>
                );
              }
              if (k === "_actions")
                return (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Edit"
                      onClick={() => setGroupDialog({ editing: g })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Delete"
                      onClick={() => setDeletingGroup(g)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              return String(g[k as keyof TutorGroup] ?? "—");
            }}
          />
        </Section>

        <Section
          title="House leaderboard"
          description="Points this academic year"
          className="lg:col-span-2"
          actions={
            (isAdmin || user?.role === "teacher") && (
              <Button size="sm" onClick={() => setAward(true)}>
                <Star className="h-3.5 w-3.5" /> Award points
              </Button>
            )
          }
        >
          <ul className="space-y-3">
            {ranked.map((h, i) => {
              const t = totals.get(h.id) ?? 0;
              return (
                <li key={h.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-4 text-muted-foreground text-xs">{i + 1}</span>
                      <span className="h-3 w-3 rounded-full" style={{ background: h.colour }} />
                      {h.name}
                      {i === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                    </span>
                    <span className="font-semibold tabular-nums">{t}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(t / top) * 100}%`, background: h.colour }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span className="flex-1">
                      Head of house: {h.head} · {learners.filter((l) => l.house === h.name).length}{" "}
                      students
                    </span>
                    {isAdmin && (
                      <>
                        <button
                          title="Edit house"
                          className="hover:text-foreground"
                          onClick={() => setHouseDialog({ editing: h })}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          title="Delete house"
                          className="hover:text-destructive"
                          onClick={() => deleteHouse(h)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 border-t pt-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Recent awards
            </div>
            <ul className="space-y-1.5 text-xs">
              {[...points]
                .sort((a, b) => b.at.localeCompare(a.at))
                .slice(0, 5)
                .map((p) => {
                  const h = houses.find((x) => x.id === p.houseId);
                  const s = learners.find((l) => l.id === p.studentId);
                  return (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        <span className="font-medium" style={{ color: h?.colour }}>
                          {h?.name}
                        </span>{" "}
                        · {p.reason}
                        {s ? ` (${s.name})` : ""}
                      </span>
                      <span className="font-semibold shrink-0">+{p.points}</span>
                    </li>
                  );
                })}
            </ul>
          </div>
        </Section>
      </div>

      {curDialog && (
        <CurriculumDialog
          onClose={() => setCurDialog(null)}
          editing={curDialog.editing}
          tenantId={tenantId}
          calendars={calendars}
          by={by}
          inUse={(y) =>
            learners.some(
              (l) => curriculumIdFor(l, curricula) === curDialog.editing?.id && l.level === y,
            ) ||
            tutorGroups.some(
              (g) => g.curriculumId === curDialog.editing?.id && g.yearGroup === y,
            ) ||
            sets.some((s) => s.curriculumId === curDialog.editing?.id && s.yearGroup === y)
          }
        />
      )}
      {groupDialog && (
        <TutorGroupDialog
          open
          onOpenChange={(v) => !v && setGroupDialog(null)}
          editing={groupDialog.editing}
        />
      )}
      {deletingGroup && (
        <DeleteFormDialog form={deletingGroup} onClose={() => setDeletingGroup(null)} />
      )}
      {houseDialog && (
        <HouseDialog
          onClose={() => setHouseDialog(null)}
          editing={houseDialog.editing}
          tenantId={tenantId}
          houses={houses}
          by={by}
        />
      )}
      {confirmDel && (
        <FormDialog
          open
          onOpenChange={(v) => !v && setConfirmDel(null)}
          title={confirmDel.title}
          submitLabel="Delete"
          submitVariant="destructive"
          onSubmit={() => {
            confirmDel.run();
            setConfirmDel(null);
          }}
        >
          <p className="sm:col-span-2 text-sm text-muted-foreground">{confirmDel.body}</p>
        </FormDialog>
      )}
      <AwardPointsDialog
        open={award}
        onOpenChange={setAward}
        tenantId={tenantId}
        houses={houses}
        learners={learners}
        by={user?.name ?? ""}
      />
    </div>
  );
}

function CurriculumDialog({
  onClose,
  editing,
  tenantId,
  calendars,
  by,
  inUse,
}: {
  onClose: () => void;
  editing?: Curriculum;
  tenantId: string;
  calendars: { id: string; name: string }[];
  by: string;
  /** True when a year group still has pupils, forms or subject classes. */
  inUse: (yearGroup: string) => boolean;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [framework, setFramework] = useState<Curriculum["framework"]>(editing?.framework ?? "IB");
  const [calendarId, setCalendarId] = useState(editing?.calendarId ?? calendars[0]?.id ?? "");
  const [years, setYears] = useState(editing?.yearGroups.join(", ") ?? "");
  const [boards, setBoards] = useState(editing?.examBoards.join(", ") ?? "");
  const split = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={editing ? `Edit ${editing.name}` : "Add curriculum"}
      description="Bind it to the academic calendar it runs on — a CBSE stream can run April–March alongside a September–July British stream."
      submitLabel={editing ? "Save" : "Add curriculum"}
      onSubmit={() => {
        if (!name.trim() || !calendarId) {
          toast.error("Name and calendar are required");
          return;
        }
        const yearGroups = split(years);
        const examBoards = split(boards);
        if (!editing) {
          const id = nextId("CUR-", "curricula");
          addItem("curricula", {
            id,
            tenantId,
            name: name.trim(),
            framework,
            calendarId,
            yearGroups,
            examBoards,
            gradeScale: [],
          });
          logChange({
            tenantId,
            entity: "curriculum",
            entityId: id,
            field: "created",
            to: name.trim(),
            by,
          });
          toast.success(`${name} added`);
          onClose();
          return;
        }
        const dropped = editing.yearGroups.filter((y) => !yearGroups.includes(y) && inUse(y));
        if (dropped.length) {
          toast.error(
            `Can't remove ${dropped.join(", ")} — pupils or classes still use it. Move them first.`,
            { duration: 6000 },
          );
          return;
        }
        updateItem("curricula", (c) => c.id === editing.id, {
          name: name.trim(),
          framework,
          calendarId,
          yearGroups,
          examBoards,
        });
        const changes: [string, string, string][] = [
          ["name", editing.name, name.trim()],
          ["framework", editing.framework, framework],
          ["calendar", editing.calendarId, calendarId],
          ["year groups", editing.yearGroups.join(", "), yearGroups.join(", ")],
          ["exam boards", editing.examBoards.join(", "), examBoards.join(", ")],
        ];
        for (const [field, from, to] of changes)
          if (from !== to)
            logChange({
              tenantId,
              entity: "curriculum",
              entityId: editing.id,
              field,
              from,
              to,
              by,
            });
        toast.success(`${name} saved`);
        onClose();
      }}
    >
      <Field label="Name" required className="sm:col-span-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="American — AP"
        />
      </Field>
      <Field label="Framework">
        <Select
          value={framework}
          onChange={(e) => setFramework(e.target.value as Curriculum["framework"])}
          options={FRAMEWORKS.map((f) => ({ value: f, label: f }))}
        />
      </Field>
      <Field label="Academic calendar" required>
        <Select
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          options={calendars.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field label="Year groups" hint="Comma-separated" className="sm:col-span-2">
        <TextInput
          value={years}
          onChange={(e) => setYears(e.target.value)}
          placeholder="Grade 9, Grade 10, Grade 11, Grade 12"
        />
      </Field>
      <Field label="Exam boards" hint="Comma-separated" className="sm:col-span-2">
        <TextInput
          value={boards}
          onChange={(e) => setBoards(e.target.value)}
          placeholder="College Board"
        />
      </Field>
    </FormDialog>
  );
}

const HOUSE_COLOURS = ["#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#db2777", "#0891b2"];

function HouseDialog({
  onClose,
  editing,
  tenantId,
  houses,
  by,
}: {
  onClose: () => void;
  editing?: House;
  tenantId: string;
  houses: House[];
  by: string;
}) {
  const staff = (TENANT_STAFF[tenantId] ?? []).map((s) => s.name);
  const [name, setName] = useState(editing?.name ?? "");
  const [colour, setColour] = useState(
    editing?.colour ??
      HOUSE_COLOURS.find((c) => !houses.some((h) => h.colour === c)) ??
      HOUSE_COLOURS[0],
  );
  const [head, setHead] = useState(editing?.head ?? staff[0] ?? "");
  const headOptions = [...new Set([...staff, ...(editing?.head ? [editing.head] : [])])];
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={editing ? `Edit house ${editing.name}` : "Add house"}
      description={editing ? "Renaming updates every pupil in the house." : undefined}
      submitLabel={editing ? "Save" : "Add house"}
      onSubmit={() => {
        const n = name.trim();
        if (!n || !head) {
          toast.error("Name and head of house are required");
          return;
        }
        if (houses.some((h) => h.id !== editing?.id && h.name.toLowerCase() === n.toLowerCase())) {
          toast.error(`There is already a house called ${n}`);
          return;
        }
        if (!editing) {
          const id = nextId("HSE-", "houses");
          addItem("houses", { id, tenantId, name: n, colour, head });
          logChange({ tenantId, entity: "house", entityId: id, field: "created", to: n, by });
          toast.success(`House ${n} added`);
          onClose();
          return;
        }
        updateItem("houses", (h) => h.id === editing.id, { name: n, colour, head });
        if (n !== editing.name) {
          updateItem("learners", (l) => l.tenantId === tenantId && l.house === editing.name, {
            house: n,
          });
          logChange({
            tenantId,
            entity: "house",
            entityId: editing.id,
            field: "name",
            from: editing.name,
            to: n,
            by,
          });
        }
        if (head !== editing.head)
          logChange({
            tenantId,
            entity: "house",
            entityId: editing.id,
            field: "head",
            from: editing.head,
            to: head,
            by,
          });
        if (colour !== editing.colour)
          logChange({
            tenantId,
            entity: "house",
            entityId: editing.id,
            field: "colour",
            from: editing.colour,
            to: colour,
            by,
          });
        toast.success(`House ${n} saved`);
        onClose();
      }}
    >
      <Field label="Name" required>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Falcon" />
      </Field>
      <Field label="Head of house" required>
        <Select
          value={head}
          onChange={(e) => setHead(e.target.value)}
          options={headOptions.map((s) => ({ value: s, label: s }))}
        />
      </Field>
      <Field label="Colour" className="sm:col-span-2">
        <div className="flex items-center gap-2">
          {HOUSE_COLOURS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => setColour(c)}
              className={`h-7 w-7 rounded-full border-2 ${colour === c ? "border-foreground" : "border-transparent"}`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            className="h-8 w-10 rounded border bg-background"
          />
        </div>
      </Field>
    </FormDialog>
  );
}

export function AwardPointsDialog({
  open,
  onOpenChange,
  tenantId,
  houses,
  learners,
  by,
  defaultStudentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  houses: { id: string; name: string }[];
  learners: { id: string; name: string; house?: string }[];
  by: string;
  defaultStudentId?: string;
}) {
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [houseId, setHouseId] = useState(houses[0]?.id ?? "");
  const [pts, setPts] = useState("5");
  const [reason, setReason] = useState("");
  const student = learners.find((l) => l.id === studentId);
  const effectiveHouse = student
    ? (houses.find((h) => h.name === student.house)?.id ?? houseId)
    : houseId;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Award house points"
      description="Award to a student (credited to their house) or to a whole house."
      submitLabel="Award"
      onSubmit={() => {
        const n = Number(pts);
        if (!n || !reason.trim() || !effectiveHouse) {
          toast.error("Points and a reason are required");
          return;
        }
        addItem("housePoints", {
          id: nextId("HP-", "housePoints"),
          tenantId,
          houseId: effectiveHouse,
          studentId: studentId || undefined,
          points: n,
          reason: reason.trim(),
          by,
          at: new Date().toISOString(),
        });
        const hName = houses.find((h) => h.id === effectiveHouse)?.name;
        toast.success(`+${n} points to ${hName}${student ? ` for ${student.name}` : ""}`);
        setReason("");
        onOpenChange(false);
      }}
    >
      <Field label="Student" hint="Leave blank to award a whole house" className="sm:col-span-2">
        <Select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          options={[
            { value: "", label: "— Whole house —" },
            ...learners.map((l) => ({
              value: l.id,
              label: `${l.name}${l.house ? ` · ${l.house}` : ""}`,
            })),
          ]}
        />
      </Field>
      <Field label="House">
        <Select
          value={effectiveHouse}
          disabled={!!student}
          onChange={(e) => setHouseId(e.target.value)}
          options={houses.map((h) => ({ value: h.id, label: h.name }))}
        />
      </Field>
      <Field label="Points" required>
        <NumberInput min={1} max={200} value={pts} onChange={(e) => setPts(e.target.value)} />
      </Field>
      <Field label="Reason" required className="sm:col-span-2">
        <TextInput
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Excellent effort in the physics practical"
        />
      </Field>
    </FormDialog>
  );
}
