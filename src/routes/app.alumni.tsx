import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Award,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Copy,
  GraduationCap,
  Handshake,
  Mail,
  MapPin,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  Button,
  FormDialog,
  Field,
  TextInput,
  TextArea,
  Select,
} from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { PackContextBar, StatusPill, Tabs, useTab } from "@/components/packs/PackUI";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { addItem, nextId, updateItem, useCollection } from "@/lib/store";
import { useScopedLearners, useTenantContext } from "@/lib/packs/registry";
import { DEMO_TODAY, type Learner } from "@/lib/packs/foundationData";
import type { Programme } from "@/lib/packs/heData";
import { logChange, notify } from "@/lib/packs/sis/activity";
import { alumniEvents, type AlumniRecord, type AlumniEvent } from "@/lib/packs/sis/alumni";

export const Route = createFileRoute("/app/alumni")({
  head: () => ({ meta: [{ title: "Alumni — 1StudentID" }] }),
  component: AlumniPage,
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const SOURCE = "Alumni";

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const year = (iso?: string) => (iso ? iso.slice(0, 4) : "—");

function maskEmail(email?: string) {
  if (!email) return "Contact via Alumni Relations";
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}•••@${domain}`;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function credentialCode(tenantId: string) {
  const prefix = tenantId === "T-010" ? "NBU" : tenantId === "T-011" ? "HSC" : "1SI";
  const block = () =>
    Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(
      "",
    );
  return `${prefix}-${block()}-${block()}`;
}
const verifyLink = (code: string) => `https://verify.1studentid.com/c/${code}`;

function awardFor(l: Learner, programmes: Programme[]) {
  const p = programmes.find((x) => x.id === l.programmeId);
  return p ? `${p.award} ${p.name}` : l.level;
}

/** One alumni directory row: an AlumniRecord, or a Graduated learner not yet moved. */
interface AlumRow {
  key: string;
  record?: AlumniRecord;
  learner?: Learner;
  studentId: string;
  name: string;
  email?: string;
  award: string;
  year: string;
  classification?: string;
  employer?: string;
  role?: string;
  country?: string;
  consent: boolean;
  mentor: boolean;
}

function useAlumniRows(): { rows: AlumRow[]; pending: Learner[] } {
  const ctx = useTenantContext();
  const records = useCollection("alumniRecords");
  const learners = useCollection("learners");
  const programmes = useCollection("programmes");
  const tenantLearners = learners.filter((l) => l.tenantId === ctx.tenantId);
  const mine = records.filter((r) => r.tenantId === ctx.tenantId);
  const moved = new Set(mine.map((r) => r.studentId));
  const pending = tenantLearners.filter((l) => l.status === "Graduated" && !moved.has(l.id));
  const rows: AlumRow[] = mine
    .map((r) => {
      const l = tenantLearners.find((x) => x.id === r.studentId);
      return {
        key: r.id,
        record: r,
        learner: l,
        studentId: r.studentId,
        name: r.name ?? l?.name ?? r.studentId,
        email: r.email ?? l?.email,
        award: r.award,
        year: year(r.graduatedOn),
        classification: r.classification,
        employer: r.currentEmployer,
        role: r.currentRole,
        country: r.country ?? l?.nationality,
        consent: r.contactConsent,
        mentor: !!r.mentor,
      };
    })
    .sort((a, b) => b.year.localeCompare(a.year) || a.name.localeCompare(b.name));
  return {
    rows: [
      ...pending.map((l) => ({
        key: l.id,
        learner: l,
        studentId: l.id,
        name: l.name,
        email: l.email,
        award: awardFor(l, programmes),
        year: year(l.expectedEnd),
        country: l.nationality,
        consent: false,
        mentor: false,
      })),
      ...rows,
    ],
    pending,
  };
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function AlumniPage() {
  const ctx = useTenantContext();
  const role = ctx.user?.role;
  const me = useScopedLearners()[0];
  const graduate = role === "student" && me?.status === "Graduated";
  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "student" ? (graduate ? "My Alumni Record" : "Alumni Network") : "Alumni"}
        subtitle={
          role === "student"
            ? graduate
              ? "Your 1StudentID stays yours for life. Keep your details current and share verified credentials."
              : "Meet graduates, find a mentor and join alumni events."
            : "Graduates keep their 1StudentID for life. Stay in touch, run events and track credential checks."
        }
      />
      <PackContextBar pack="higher-ed" />
      {role === "student" ? (
        !me ? (
          <div className="text-sm text-muted-foreground">
            No student record is linked to this account.
          </div>
        ) : graduate ? (
          <GraduateView studentId={me.id} />
        ) : (
          <StudentNetwork me={me} />
        )
      ) : (
        <AdminAlumni />
      )}
    </div>
  );
}

/* ── Admin / staff ───────────────────────────────────────────────────────── */

type AdminTab = "directory" | "shares" | "events";

function AdminAlumni() {
  const ctx = useTenantContext();
  const admin = ctx.isAdmin;
  const { rows, pending } = useAlumniRows();
  const [tab, setTab] = useTab<AdminTab>("directory");
  const [f, setF] = useState({
    q: "",
    year: "All",
    award: "All",
    country: "All",
    consent: "All",
    mentor: "All",
  });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const records = rows.filter((r) => r.record);
  const opts = (vals: string[]) => [
    { value: "All", label: "All" },
    ...Array.from(new Set(vals.filter(Boolean)))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];
  const filtered = rows.filter(
    (r) =>
      (!f.q ||
        `${r.name} ${r.employer ?? ""} ${r.studentId}`.toLowerCase().includes(f.q.toLowerCase())) &&
      (f.year === "All" || r.year === f.year) &&
      (f.award === "All" || r.award === f.award) &&
      (f.country === "All" || r.country === f.country) &&
      (f.consent === "All" || (f.consent === "Yes") === r.consent) &&
      (f.mentor === "All" || (f.mentor === "Yes") === r.mentor),
  );
  const shares = records
    .flatMap((r) =>
      r.record!.credentialShares.map((s) => ({ ...s, name: r.name, studentId: r.studentId })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  const yearAgo = `${Number(DEMO_TODAY.slice(0, 4)) - 1}${DEMO_TODAY.slice(4)}`;
  const consenting = records.filter((r) => r.consent);
  const events = alumniEvents.filter((e) => e.tenantId === ctx.tenantId);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Alumni"
          value={records.length}
          hint={
            pending.length
              ? `${pending.length} graduate${pending.length > 1 ? "s" : ""} to move`
              : "All graduates moved"
          }
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatCard
          label="Happy to be contacted"
          value={`${records.length ? Math.round((consenting.length / records.length) * 100) : 0}%`}
          hint={`${consenting.length} with contact consent`}
          icon={<Mail className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Mentors"
          value={records.filter((r) => r.mentor).length}
          hint="Offer time to students"
          icon={<Handshake className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Credential checks"
          value={shares.filter((s) => s.at >= yearAgo).length}
          hint="Verified shares, last 12 months"
          icon={<ShieldCheck className="h-4 w-4" />}
          accent="warning"
        />
      </div>

      {admin && pending.length > 0 && (
        <Section
          title="Ready to move to alumni"
          description="Award conferred — move them so they keep access for life."
        >
          <div className="space-y-2">
            {pending.map((l) => (
              <MoveRow key={l.id} l={l} />
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Alumni"
        actions={
          admin && tab === "directory" ? (
            <Button size="sm" onClick={() => setInviting(true)}>
              <CalendarDays className="h-4 w-4" /> Invite to event
            </Button>
          ) : undefined
        }
      >
        <Tabs<AdminTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "directory", label: "Directory", count: rows.length },
            { id: "shares", label: "Credential shares", count: shares.length },
            { id: "events", label: "Events", count: events.length },
          ]}
        />
        {tab === "directory" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
              <TextInput
                placeholder="Search name, employer, ID"
                value={f.q}
                onChange={(e) => set("q", e.target.value)}
                className="col-span-2 md:col-span-1"
              />
              <Select
                value={f.year}
                onChange={(e) => set("year", e.target.value)}
                options={opts(rows.map((r) => r.year)).map((o) =>
                  o.value === "All" ? { ...o, label: "Any year" } : o,
                )}
              />
              <Select
                value={f.award}
                onChange={(e) => set("award", e.target.value)}
                options={opts(rows.map((r) => r.award)).map((o) =>
                  o.value === "All" ? { ...o, label: "Any award" } : o,
                )}
              />
              <Select
                value={f.country}
                onChange={(e) => set("country", e.target.value)}
                options={opts(rows.map((r) => r.country ?? "")).map((o) =>
                  o.value === "All" ? { ...o, label: "Any country" } : o,
                )}
              />
              <Select
                value={f.consent}
                onChange={(e) => set("consent", e.target.value)}
                options={[
                  { value: "All", label: "Any consent" },
                  { value: "Yes", label: "Can contact" },
                  { value: "No", label: "No contact" },
                ]}
              />
              <Select
                value={f.mentor}
                onChange={(e) => set("mentor", e.target.value)}
                options={[
                  { value: "All", label: "Mentor: any" },
                  { value: "Yes", label: "Mentors only" },
                  { value: "No", label: "Not mentors" },
                ]}
              />
            </div>
            <DataTable
              columns={[
                { key: "name", label: "Graduate" },
                { key: "award", label: "Award" },
                { key: "work", label: "Now" },
                { key: "flags", label: "Contact" },
                { key: "_a", label: "", className: "text-right" },
              ]}
              rows={filtered}
              emptyText="No alumni match these filters."
              renderCell={(r: AlumRow, key) => {
                if (key === "name")
                  return (
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.name} seed={r.studentId} size={30} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.studentId} · {r.country ?? "—"}
                        </div>
                      </div>
                    </div>
                  );
                if (key === "award")
                  return (
                    <div>
                      <div className="text-sm">{r.award}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.year}
                        {r.classification ? ` · ${r.classification}` : ""}
                      </div>
                    </div>
                  );
                if (key === "work")
                  return r.employer ? (
                    <div className="text-xs">
                      <div>{r.role}</div>
                      <div className="text-muted-foreground">{r.employer}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  );
                if (key === "flags")
                  return !r.record ? (
                    <Badge tone="warning">Not moved yet</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={r.consent ? "success" : "muted"}>
                        {r.consent ? "Can contact" : "No contact"}
                      </Badge>
                      {r.mentor && <Badge tone="info">Mentor</Badge>}
                    </div>
                  );
                if (key === "_a")
                  return (
                    <Button size="sm" variant="outline" onClick={() => setOpenKey(r.key)}>
                      View
                    </Button>
                  );
              }}
            />
          </>
        )}
        {tab === "shares" && (
          <DataTable
            columns={[
              { key: "at", label: "Shared" },
              { key: "name", label: "Graduate" },
              { key: "to", label: "Shared with" },
              { key: "code", label: "Verification code" },
            ]}
            rows={shares}
            emptyText="No credentials shared yet."
            renderCell={(s: (typeof shares)[number], key) => {
              if (key === "at") return fmt(s.at);
              if (key === "name")
                return (
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{s.studentId}</div>
                  </div>
                );
              if (key === "to")
                return (
                  <div>
                    <div>{s.to}</div>
                    {s.purpose && (
                      <div className="text-[11px] text-muted-foreground">{s.purpose}</div>
                    )}
                  </div>
                );
              if (key === "code") return <span className="font-mono text-xs">{s.code}</span>;
            }}
          />
        )}
        {tab === "events" && <EventList events={events} records={records.map((r) => r.record!)} />}
      </Section>

      <AlumniSheet row={rows.find((r) => r.key === openKey)} onClose={() => setOpenKey(null)} />
      {inviting && (
        <InviteDialog
          recipients={filtered.filter((r) => r.record && r.consent).map((r) => r.record!)}
          skipped={filtered.filter((r) => r.record && !r.consent).length}
          events={events}
          onClose={() => setInviting(false)}
        />
      )}
    </>
  );
}

function MoveRow({ l }: { l: Learner }) {
  const ctx = useTenantContext();
  const programmes = useCollection("programmes");
  const move = () => {
    const id = nextId("ALU-", "alumniRecords");
    addItem("alumniRecords", {
      id,
      tenantId: l.tenantId,
      studentId: l.id,
      graduatedOn: l.expectedEnd && l.expectedEnd <= DEMO_TODAY ? l.expectedEnd : DEMO_TODAY,
      award: awardFor(l, programmes),
      contactConsent: false,
      mentor: false,
      country: l.nationality,
      source: "Moved",
      credentialShares: [],
    });
    logChange({
      tenantId: l.tenantId,
      entity: "alumni",
      entityId: id,
      studentId: l.id,
      field: "alumni record",
      to: "Created",
      by: ctx.user?.name ?? "",
      reason: "Moved to alumni after award",
    });
    notify({
      tenantId: l.tenantId,
      channel: "Email",
      to: `${l.name} (${l.email})`,
      subject: "Welcome to the alumni network",
      body: "Your 1StudentID stays yours for life. Sign in to update your details and share verified credentials.",
      source: SOURCE,
      relatedId: id,
    });
    toast.success(`${l.name} moved to alumni — welcome email sent`);
  };
  return (
    <div className="flex items-center gap-2.5 rounded-lg border p-2.5 text-sm">
      <Avatar name={l.name} seed={l.id} size={30} />
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{l.name}</div>
        <div className="text-[11px] text-muted-foreground">
          {l.id} · {awardFor(l, programmes)}
        </div>
      </div>
      <Button size="sm" onClick={move}>
        <GraduationCap className="h-4 w-4" /> Move to alumni
      </Button>
    </div>
  );
}

function AlumniSheet({ row, onClose }: { row?: AlumRow; onClose: () => void }) {
  const [preview, setPreview] = useState(false);
  const r = row?.record;
  return (
    <Sheet
      open={!!row}
      onOpenChange={(v) => {
        if (!v) {
          setPreview(false);
          onClose();
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {row && (
          <div className="space-y-5">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3 pr-6">
                <Avatar name={row.name} seed={row.studentId} size={44} />
                <div>
                  <div>{row.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {row.studentId} · 1StudentID for life
                  </div>
                </div>
              </SheetTitle>
              <SheetDescription>
                {row.award} · {row.year}
                {row.classification ? ` · ${row.classification}` : ""}
              </SheetDescription>
            </SheetHeader>
            {!r ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Graduated, but not yet moved to the alumni network.
                </p>
                {row.learner && <MoveRow l={row.learner} />}
              </div>
            ) : preview ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setPreview(false)}>
                  Back to profile
                </Button>
                <GraduateView studentId={r.studentId} />
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info icon={<Briefcase className="h-3.5 w-3.5" />} label="Role">
                    {r.currentRole ? `${r.currentRole}, ${r.currentEmployer}` : "—"}
                  </Info>
                  <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Country">
                    {r.country ?? "—"}
                  </Info>
                  <Info icon={<Mail className="h-3.5 w-3.5" />} label="Email">
                    {r.contactConsent ? (row.email ?? "—") : "Hidden — no contact consent"}
                  </Info>
                  <Info icon={<Award className="h-3.5 w-3.5" />} label="Graduated">
                    {fmt(r.graduatedOn)}
                  </Info>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={r.contactConsent ? "success" : "muted"}>
                    {r.contactConsent ? "Contact consent given" : "No contact consent"}
                  </Badge>
                  {r.mentor && <Badge tone="info">Mentor</Badge>}
                  <Badge tone="muted">
                    {r.source === "Moved" ? "Moved from student record" : "Migrated record"}
                  </Badge>
                </div>
                <ShareList shares={r.credentialShares} />
                {!!r.mentoringRequests?.length && <MentoringList record={r} readOnly />}
                {!!r.invites?.length && (
                  <div>
                    <div className="text-xs font-medium mb-1.5">Event invitations</div>
                    <ul className="text-xs space-y-1">
                      {r.invites.map((i, k) => (
                        <li key={k}>
                          {i.event} · {fmt(i.date)}{" "}
                          <span className="text-muted-foreground">(sent {fmt(i.at)})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => setPreview(true)}>
                  <GraduationCap className="h-4 w-4" /> See what the graduate sees
                </Button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function InviteDialog({
  recipients,
  skipped,
  events,
  onClose,
}: {
  recipients: AlumniRecord[];
  skipped: number;
  events: AlumniEvent[];
  onClose: () => void;
}) {
  const ctx = useTenantContext();
  const upcoming = events.filter((e) => e.date >= DEMO_TODAY);
  const [eventId, setEventId] = useState(upcoming[0]?.id ?? "custom");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(DEMO_TODAY);
  const chosen = upcoming.find((e) => e.id === eventId);
  const send = () => {
    const name = chosen?.title ?? title.trim();
    const when = chosen?.date ?? date;
    if (!name) return toast.error("Name the event.");
    if (!recipients.length) return toast.error("No one in this list has given contact consent.");
    const now = new Date().toISOString();
    for (const r of recipients) {
      updateItem("alumniRecords", (x) => x.id === r.id, {
        invites: [...(r.invites ?? []), { event: name, date: when, at: now }],
      });
      notify({
        tenantId: ctx.tenantId,
        channel: "Email",
        to: `${r.name ?? r.studentId}${r.email ? ` (${r.email})` : ""}`,
        subject: `You're invited: ${name} — ${fmt(when)}`,
        body: chosen?.blurb,
        source: `${SOURCE} · events`,
        relatedId: r.id,
      });
    }
    toast.success(
      `Invitation sent to ${recipients.length} alumni${skipped ? ` · ${skipped} skipped (no consent)` : ""}`,
    );
    onClose();
  };
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Invite to event"
      description={`Goes to ${recipients.length} alumni in the current list who agreed to be contacted.${skipped ? ` ${skipped} without consent are left out.` : ""}`}
      submitLabel={`Send ${recipients.length} invitation${recipients.length === 1 ? "" : "s"}`}
      onSubmit={send}
    >
      <Field label="Event" className="sm:col-span-2">
        <Select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          options={[
            ...upcoming.map((e) => ({ value: e.id, label: `${e.title} · ${fmt(e.date)}` })),
            { value: "custom", label: "Another event…" },
          ]}
        />
      </Field>
      {!chosen && (
        <>
          <Field label="Event name">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

function EventList({ events, records }: { events: AlumniEvent[]; records?: AlumniRecord[] }) {
  const ctx = useTenantContext();
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const student = ctx.user?.role === "student";
  const upcoming = events
    .filter((e) => e.date >= DEMO_TODAY)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!upcoming.length)
    return <div className="text-sm text-muted-foreground">No upcoming events.</div>;
  return (
    <div className="grid md:grid-cols-3 gap-3">
      {upcoming.map((e) => {
        const invited = records?.filter((r) => r.invites?.some((i) => i.event === e.title)).length;
        return (
          <div key={e.id} className="rounded-xl border bg-card p-3 flex flex-col">
            <div className="text-[11px] text-primary font-medium">
              {fmt(e.date)} · {e.format}
            </div>
            <div className="font-medium mt-0.5">{e.title}</div>
            <div className="text-xs text-muted-foreground mt-1 flex-1">{e.blurb}</div>
            <div className="text-[11px] text-muted-foreground mt-2">Host: {e.host}</div>
            {records && <div className="text-[11px] mt-1">{invited} invited</div>}
            {student && (
              <Button
                size="sm"
                variant={interested.has(e.id) ? "outline" : "primary"}
                className="mt-2 self-start"
                disabled={interested.has(e.id)}
                onClick={() => {
                  setInterested(new Set(interested).add(e.id));
                  notify({
                    tenantId: ctx.tenantId,
                    channel: "App",
                    to: "Alumni Relations",
                    subject: `Place booked: ${ctx.user?.name} — ${e.title}`,
                    source: `${SOURCE} · events`,
                    relatedId: e.id,
                  });
                  toast.success("You're booked — details by email");
                }}
              >
                {interested.has(e.id) ? "Booked" : "Book a place"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Current student: alumni network ────────────────────────────────────── */

type NetTab = "network" | "mentors" | "events";

function StudentNetwork({ me }: { me: Learner }) {
  const ctx = useTenantContext();
  const { rows } = useAlumniRows();
  const [tab, setTab] = useTab<NetTab>("network");
  const [f, setF] = useState({ award: "All", employer: "", country: "All" });
  const [asking, setAsking] = useState<AlumniRecord | null>(null);
  const open = rows.filter((r) => r.record && r.consent);
  const mentors = open.filter((r) => r.mentor);
  const events = alumniEvents.filter((e) => e.tenantId === ctx.tenantId);
  const opts = (vals: string[], any: string) => [
    { value: "All", label: any },
    ...Array.from(new Set(vals.filter(Boolean)))
      .sort()
      .map((v) => ({ value: v, label: v })),
  ];
  const list = (tab === "mentors" ? mentors : open).filter(
    (r) =>
      (f.award === "All" || r.award === f.award) &&
      (f.country === "All" || r.country === f.country) &&
      (!f.employer ||
        `${r.employer ?? ""} ${r.role ?? ""}`.toLowerCase().includes(f.employer.toLowerCase())),
  );
  return (
    <>
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm flex gap-2.5">
        <GraduationCap className="h-5 w-5 text-primary shrink-0" />
        <span>
          You join the alumni network automatically when your award is conferred — your 1StudentID (
          {me.id}) stays yours for life.
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Alumni you can reach"
          value={open.length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Mentors"
          value={mentors.length}
          icon={<Handshake className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Upcoming events"
          value={events.filter((e) => e.date >= DEMO_TODAY).length}
          icon={<CalendarDays className="h-4 w-4" />}
          accent="success"
        />
      </div>
      <Section title="Your alumni network">
        <Tabs<NetTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "network", label: "Browse alumni", count: open.length },
            { id: "mentors", label: "Find a mentor", count: mentors.length },
            {
              id: "events",
              label: "Events & talks",
              count: events.filter((e) => e.date >= DEMO_TODAY).length,
            },
          ]}
        />
        {tab === "events" ? (
          <EventList events={events} />
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-2 mb-3">
              <Select
                value={f.award}
                onChange={(e) => setF({ ...f, award: e.target.value })}
                options={opts(
                  open.map((r) => r.award),
                  "Any programme",
                )}
              />
              <TextInput
                placeholder="Employer or role"
                value={f.employer}
                onChange={(e) => setF({ ...f, employer: e.target.value })}
              />
              <Select
                value={f.country}
                onChange={(e) => setF({ ...f, country: e.target.value })}
                options={opts(
                  open.map((r) => r.country ?? ""),
                  "Any country",
                )}
              />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((r) => {
                const mine = r.record!.mentoringRequests?.find((m) => m.studentId === me.id);
                return (
                  <div key={r.key} className="rounded-xl border bg-card p-3 flex flex-col">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.name} seed={r.studentId} size={36} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {r.award} · {r.year}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs mt-2 space-y-0.5 flex-1">
                      {r.employer && (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.role}, {r.employer}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.country ?? "—"}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {maskEmail(r.email)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {r.mentor ? <Badge tone="info">Mentor</Badge> : <span />}
                      {r.mentor &&
                        (mine ? (
                          <StatusPill status={mine.status} />
                        ) : (
                          <Button size="sm" onClick={() => setAsking(r.record!)}>
                            Request mentoring
                          </Button>
                        ))}
                    </div>
                  </div>
                );
              })}
              {!list.length && (
                <div className="text-sm text-muted-foreground">No alumni match these filters.</div>
              )}
            </div>
          </>
        )}
      </Section>
      {asking && <MentoringDialog record={asking} me={me} onClose={() => setAsking(null)} />}
    </>
  );
}

function MentoringDialog({
  record,
  me,
  onClose,
}: {
  record: AlumniRecord;
  me: Learner;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState("");
  const name = record.name ?? record.studentId;
  const submit = () => {
    if (!topic.trim()) return toast.error("Say what you'd like help with.");
    const now = new Date().toISOString();
    const id = `MR-${Date.now().toString().slice(-6)}`;
    updateItem("alumniRecords", (x) => x.id === record.id, {
      mentoringRequests: [
        ...(record.mentoringRequests ?? []),
        {
          id,
          studentId: me.id,
          studentName: me.name,
          at: now,
          topic: topic.trim(),
          status: "Requested",
        },
      ],
    });
    logChange({
      tenantId: record.tenantId,
      entity: "alumni",
      entityId: record.id,
      studentId: me.id,
      field: "mentoring request",
      to: `Requested by ${me.name}`,
      by: me.name,
      reason: topic.trim(),
    });
    notify({
      tenantId: record.tenantId,
      channel: "Email",
      to: `${name} (via Alumni Relations)`,
      subject: `Mentoring request from ${me.name} (${me.level})`,
      body: topic.trim(),
      source: `${SOURCE} · mentoring`,
      relatedId: record.id,
    });
    toast.success(`Request sent to ${name} — we'll share your details only if they accept`);
    onClose();
  };
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Request mentoring · ${name}`}
      description={`${record.currentRole ?? "Graduate"}${record.currentEmployer ? `, ${record.currentEmployer}` : ""}. Their contact details stay private until they accept.`}
      submitLabel="Send request"
      onSubmit={submit}
    >
      <Field label="What would you like help with?" required className="sm:col-span-2">
        <TextArea
          rows={3}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Applying for software engineering placements"
        />
      </Field>
    </FormDialog>
  );
}

/* ── Graduate: own alumni record ─────────────────────────────────────────── */

function GraduateView({ studentId }: { studentId: string }) {
  const ctx = useTenantContext();
  const records = useCollection("alumniRecords");
  const learners = useCollection("learners");
  const programmes = useCollection("programmes");
  const r = records.find((x) => x.studentId === studentId && x.tenantId === ctx.tenantId);
  const l = learners.find((x) => x.id === studentId);
  const [sharing, setSharing] = useState(false);
  const [lastShare, setLastShare] = useState<string | null>(null);
  const by = ctx.user?.name ?? "";

  if (!r) {
    const join = () => {
      if (!l) return;
      const id = nextId("ALU-", "alumniRecords");
      addItem("alumniRecords", {
        id,
        tenantId: l.tenantId,
        studentId: l.id,
        graduatedOn: DEMO_TODAY,
        award: awardFor(l, programmes),
        contactConsent: false,
        mentor: false,
        country: l.nationality,
        source: "Moved",
        credentialShares: [],
      });
      logChange({
        tenantId: l.tenantId,
        entity: "alumni",
        entityId: id,
        studentId: l.id,
        field: "alumni record",
        to: "Created",
        by,
      });
      toast.success("Welcome to the alumni network");
    };
    return (
      <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
        <GraduationCap className="h-8 w-8 mx-auto text-primary" />
        <div className="font-medium">Your award is confirmed</div>
        <p className="text-sm text-muted-foreground">
          Set up your alumni record to keep your details and credentials.
        </p>
        <Button onClick={join}>Join the alumni network</Button>
      </div>
    );
  }

  const name = r.name ?? l?.name ?? r.studentId;
  return (
    <>
      <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-transparent p-4 flex items-center gap-4">
        <Avatar name={name} seed={r.studentId} size={56} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-lg">{name}</div>
          <div className="text-sm">{r.award}</div>
          <div className="text-xs text-muted-foreground">
            {r.classification ? `${r.classification} · ` : ""}Graduated {fmt(r.graduatedOn)} ·
            1StudentID {r.studentId}
          </div>
        </div>
        <Button onClick={() => setSharing(true)}>
          <Share2 className="h-4 w-4" /> Share verified credential
        </Button>
      </div>

      {lastShare && (
        <div className="rounded-lg border border-success/40 bg-success/5 p-3 text-sm space-y-1">
          <div className="font-medium flex items-center gap-1.5">
            <BadgeCheck className="h-4 w-4 text-success" /> Credential link ready
          </div>
          <div className="text-xs">
            Code <span className="font-mono font-medium">{lastShare}</span> ·{" "}
            {verifyLink(lastShare)}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `Verify my award from ${ctx.tenantName}: ${verifyLink(lastShare)} (code ${lastShare})`,
              );
              toast.success("Link text copied");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy link text
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Section title="My details" description="What other alumni and the university see.">
          <DetailsForm key={r.id + (r.currentEmployer ?? "")} r={r} by={by} />
        </Section>
        <div className="space-y-4">
          <Section title="Credential shares" description="Who you've sent a verified link to.">
            <ShareList shares={r.credentialShares} bare />
          </Section>
          {r.mentor && (
            <Section title="Mentoring requests">
              <MentoringList record={r} />
            </Section>
          )}
        </div>
      </div>

      <Section title="Alumni events">
        <EventList events={alumniEvents.filter((e) => e.tenantId === ctx.tenantId)} />
      </Section>

      {sharing && (
        <ShareDialog
          r={r}
          by={by}
          onClose={() => setSharing(false)}
          onShared={(code) => setLastShare(code)}
        />
      )}
    </>
  );
}

function DetailsForm({ r, by }: { r: AlumniRecord; by: string }) {
  const [v, setV] = useState({
    currentEmployer: r.currentEmployer ?? "",
    currentRole: r.currentRole ?? "",
    country: r.country ?? "",
    contactConsent: r.contactConsent,
    mentor: !!r.mentor,
  });
  const save = () => {
    const patch: Partial<AlumniRecord> = {};
    for (const k of Object.keys(v) as (keyof typeof v)[]) {
      const before = r[k] ?? (typeof v[k] === "boolean" ? false : "");
      if (before === v[k]) continue;
      (patch as Record<string, unknown>)[k] = v[k];
      logChange({
        tenantId: r.tenantId,
        entity: "alumni",
        entityId: r.id,
        studentId: r.studentId,
        field: k,
        from: String(before),
        to: String(v[k]),
        by,
      });
    }
    if (!Object.keys(patch).length) return toast("Nothing changed");
    updateItem("alumniRecords", (x) => x.id === r.id, patch);
    toast.success("Details saved");
  };
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Employer">
        <TextInput
          value={v.currentEmployer}
          onChange={(e) => setV({ ...v, currentEmployer: e.target.value })}
        />
      </Field>
      <Field label="Role">
        <TextInput
          value={v.currentRole}
          onChange={(e) => setV({ ...v, currentRole: e.target.value })}
        />
      </Field>
      <Field label="Country">
        <TextInput value={v.country} onChange={(e) => setV({ ...v, country: e.target.value })} />
      </Field>
      <div className="space-y-2 text-sm pt-5">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.contactConsent}
            onChange={(e) => setV({ ...v, contactConsent: e.target.checked })}
          />
          Happy to be contacted
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.mentor}
            onChange={(e) => setV({ ...v, mentor: e.target.checked })}
          />
          Mentor current students
        </label>
      </div>
      <div className="sm:col-span-2">
        <Button size="sm" onClick={save}>
          Save details
        </Button>
      </div>
    </div>
  );
}

function ShareDialog({
  r,
  by,
  onClose,
  onShared,
}: {
  r: AlumniRecord;
  by: string;
  onClose: () => void;
  onShared: (code: string) => void;
}) {
  const [to, setTo] = useState("");
  const [purpose, setPurpose] = useState("Employment");
  const submit = () => {
    if (!to.trim()) return toast.error("Who is it for?");
    const code = credentialCode(r.tenantId);
    const id = `CS-${Date.now().toString().slice(-6)}`;
    updateItem("alumniRecords", (x) => x.id === r.id, {
      credentialShares: [
        ...r.credentialShares,
        { id, to: to.trim(), at: new Date().toISOString(), code, purpose },
      ],
    });
    logChange({
      tenantId: r.tenantId,
      entity: "alumni",
      entityId: r.id,
      studentId: r.studentId,
      field: "credential share",
      to: `${to.trim()} · ${code}`,
      by,
      reason: purpose,
    });
    notify({
      tenantId: r.tenantId,
      channel: "Email",
      to: to.trim(),
      subject: `Verified award for ${r.name ?? r.studentId}`,
      body: `${verifyLink(code)} — code ${code}`,
      source: `${SOURCE} · credentials`,
      relatedId: r.id,
    });
    onShared(code);
    toast.success("Verified link created and logged");
    onClose();
  };
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Share verified credential"
      description={`${r.award}. The recipient sees your award, date and classification — nothing else.`}
      submitLabel="Create link"
      onSubmit={submit}
    >
      <Field label="Shared with" required className="sm:col-span-2">
        <TextInput
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="e.g. Acme Ltd HR"
        />
      </Field>
      <Field label="Purpose">
        <Select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          options={[
            "Employment",
            "Visa",
            "Further study",
            "Degree recognition",
            "Registration",
          ].map((p) => ({
            value: p,
            label: p,
          }))}
        />
      </Field>
    </FormDialog>
  );
}

function ShareList({ shares, bare }: { shares: AlumniRecord["credentialShares"]; bare?: boolean }) {
  return (
    <div>
      {!bare && <div className="text-xs font-medium mb-1.5">Credential shares</div>}
      {shares.length ? (
        <ul className="space-y-1.5">
          {[...shares]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((s) => (
              <li key={s.id} className="text-xs flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0 mt-px" />
                <span>
                  {s.to}
                  {s.purpose ? ` · ${s.purpose}` : ""} · <span className="font-mono">{s.code}</span>{" "}
                  <span className="text-muted-foreground">({fmt(s.at)})</span>
                </span>
              </li>
            ))}
        </ul>
      ) : (
        <div className="text-xs text-muted-foreground">No credentials shared yet.</div>
      )}
    </div>
  );
}

function MentoringList({ record, readOnly }: { record: AlumniRecord; readOnly?: boolean }) {
  const reqs = record.mentoringRequests ?? [];
  const decide = (id: string, status: "Accepted" | "Declined") => {
    const m = reqs.find((x) => x.id === id);
    updateItem("alumniRecords", (x) => x.id === record.id, {
      mentoringRequests: reqs.map((x) => (x.id === id ? { ...x, status } : x)),
    });
    if (m)
      notify({
        tenantId: record.tenantId,
        channel: "App",
        to: m.studentName,
        subject: `Mentoring request ${status.toLowerCase()} by ${record.name ?? "your alumni mentor"}`,
        source: `${SOURCE} · mentoring`,
        relatedId: record.id,
      });
    toast.success(`Request ${status.toLowerCase()}`);
  };
  return (
    <div>
      {readOnly && <div className="text-xs font-medium mb-1.5">Mentoring</div>}
      {reqs.length ? (
        <ul className="space-y-2">
          {reqs.map((m) => (
            <li key={m.id} className="text-xs rounded-lg border p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{m.studentName}</span>
                <StatusPill status={m.status} />
              </div>
              <div className="text-muted-foreground mt-0.5">
                {m.topic} · {fmt(m.at)}
              </div>
              {!readOnly && m.status === "Requested" && (
                <div className="flex gap-1.5 mt-1.5">
                  <Button size="sm" onClick={() => decide(m.id, "Accepted")}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(m.id, "Declined")}>
                    Decline
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-muted-foreground">No requests yet.</div>
      )}
    </div>
  );
}
