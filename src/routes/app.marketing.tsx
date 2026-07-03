import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Badge,
  Button,
  Field,
  TextInput,
  Select,
  FormDialog,
  useDisclosure,
} from "@/components/ui-kit";
import {
  useCollection,
  addItem,
  updateItem,
  nextId,
  type Lead,
  type LeadContact,
  type OutreachChannel,
} from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isSwimAdmin } from "@/lib/mockData";
import {
  TrendingUp,
  Users,
  Target,
  Megaphone,
  Plus,
  Phone,
  Mail,
  MessageCircle,
  MessagesSquare,
  Handshake,
} from "lucide-react";

export const Route = createFileRoute("/app/marketing")({
  head: () => ({ meta: [{ title: "Marketing & CRM — 1StudentID" }] }),
  component: MarketingPage,
});

const SOURCES = ["Facebook Ad", "Google Search", "Instagram", "Referral", "Web Form", "Walk-in"];
const STAGES = ["New", "Contacted", "Qualified", "Demo Booked", "Closed Won", "Closed Lost"];

// Swim-club enquiry types & lead owners, so the pipeline stays on-brand for the
// aquatics demo instead of showing college course names.
const SWIM_INTERESTS = [
  "Learn-to-Swim (child)",
  "Stroke Development",
  "Competitive Squad tryout",
  "Adult beginner classes",
  "Parent & child water class",
  "Diving programme",
  "Stroke-correction clinic",
  "Holiday intensive course",
];
const SWIM_OWNERS = [
  "Unassigned",
  "Aquatics — Nadeesha",
  "Aquatics — Coach Mariana",
  "Aquatics — Coach Aisha",
  "Aquatics — Coach Dilan",
];

function ChannelIcon({ channel }: { channel: OutreachChannel }) {
  const cls = "h-4 w-4";
  if (channel === "Call") return <Phone className={cls} />;
  if (channel === "Email") return <Mail className={cls} />;
  if (channel === "WhatsApp") return <MessageCircle className={cls} />;
  if (channel === "SMS") return <MessagesSquare className={cls} />;
  return <Handshake className={cls} />;
}

function MarketingPage() {
  const { user } = useAuth();
  const allLeads = useCollection("leads");
  // The swim-club admin's CRM shows only swim-programme enquiries.
  const swim = isSwimAdmin(user);
  const leads = swim ? allLeads.filter((l) => l.program === "Swim") : allLeads;
  const contacts = useCollection("leadContacts");
  const add = useDisclosure();
  const contact = useDisclosure();
  const [contactTarget, setContactTarget] = useState<Lead | null>(null);
  const [contactForm, setContactForm] = useState<{
    channel: OutreachChannel;
    note: string;
    markContacted: boolean;
  }>({ channel: "Call", note: "", markContacted: true });

  const openContact = (lead: Lead) => {
    setContactTarget(lead);
    setContactForm({ channel: "Call", note: "", markContacted: lead.stage === "New" });
    contact.onOpen();
  };

  const submitContact = () => {
    if (!contactTarget) return;
    if (!contactForm.note.trim()) {
      toast.error("Add a note about the outreach");
      return;
    }
    const row: LeadContact = {
      id: nextId("LC-", "leadContacts"),
      leadName: contactTarget.name,
      channel: contactForm.channel,
      note: contactForm.note.trim(),
      by: user?.name ?? "Marketing",
      at: new Date().toISOString(),
    };
    addItem("leadContacts", row);
    if (contactForm.markContacted && contactTarget.stage === "New") {
      updateItem("leads", (l) => l.name === contactTarget.name, { stage: "Contacted" });
    }
    toast.success(`Logged ${contactForm.channel.toLowerCase()} with ${contactTarget.name}`);
    contact.onClose();
    setContactTarget(null);
  };

  const recentContacts = useMemo(
    () => contacts.slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    [contacts],
  );

  const [form, setForm] = useState({
    name: "",
    source: SOURCES[0],
    interest: "",
    stage: "New",
    owner: "Unassigned",
    value: 500,
    phone: "",
    email: "",
  });

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      toast.error("Add a phone or email so the lead can be followed up");
      return;
    }
    const lead: Lead = {
      name: form.name.trim(),
      source: form.source,
      interest: form.interest.trim() || (swim ? SWIM_INTERESTS[0] : "General"),
      stage: form.stage,
      owner: form.owner.trim() || "Unassigned",
      value: Number(form.value) || 0,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      ...(swim ? { program: "Swim" as const } : {}),
    };
    addItem("leads", lead);
    toast.success(`Lead "${lead.name}" added`);
    setForm({
      name: "",
      source: SOURCES[0],
      interest: "",
      stage: "New",
      owner: "Unassigned",
      value: 500,
      phone: "",
      email: "",
    });
    add.onClose();
  };

  const advance = (name: string, stage: string) => {
    const order = STAGES;
    const next = order[Math.min(order.indexOf(stage) + 1, order.length - 1)];
    updateItem("leads", (l) => l.name === name, { stage: next });
    toast.success(`${name} → ${next}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing & CRM"
        subtitle={
          swim
            ? "Swim-club enrolment pipeline — learn-to-swim, squad tryouts and clinics."
            : "Campaigns, lead pipeline, course marketing and onboarding."
        }
        actions={
          <Button onClick={add.onOpen} data-tour="new-lead-btn">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Active Leads"
          value={leads.length}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label="Conversion Rate"
          value="24%"
          hint="+3% MoM"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Live Campaigns"
          value="6"
          icon={<Megaphone className="h-5 w-5" />}
          accent="info"
        />
        <StatCard
          label="Pipeline Value"
          value={`$${leads.reduce((a, l) => a + l.value, 0)}`}
          icon={<Target className="h-5 w-5" />}
          accent="warning"
        />
      </div>
      <Section title="Lead Pipeline">
        <DataTable
          anchor="lead-pipeline"
          columns={[
            { key: "name", label: "Name" },
            { key: "_contact", label: "Contact" },
            { key: "source", label: "Source" },
            { key: "interest", label: swim ? "Programme" : "Interest" },
            { key: "stage", label: "Stage" },
            { key: "owner", label: "Owner" },
            { key: "value", label: "Est. Value" },
            { key: "_actions", label: "" },
          ]}
          rows={leads}
          emptyText="No leads yet"
          renderCell={(row, key) => {
            if (key === "value") return <span className="font-semibold">${row.value}</span>;
            if (key === "_contact") {
              if (!row.phone && !row.email)
                return <span className="text-xs text-muted-foreground">—</span>;
              return (
                <div className="leading-tight text-xs">
                  {row.phone && (
                    <a
                      href={`tel:${row.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-1 text-foreground hover:text-primary"
                    >
                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                      {row.phone}
                    </a>
                  )}
                  {row.email && (
                    <a
                      href={`mailto:${row.email}`}
                      className="flex items-center gap-1 text-muted-foreground hover:text-primary"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[160px]">{row.email}</span>
                    </a>
                  )}
                </div>
              );
            }
            if (key === "stage") {
              const tones: Record<
                string,
                "info" | "muted" | "warning" | "default" | "success" | "destructive"
              > = {
                New: "info",
                Contacted: "muted",
                Qualified: "warning",
                "Demo Booked": "default",
                "Closed Won": "success",
                "Closed Lost": "destructive",
              };
              return <Badge tone={tones[row.stage] ?? "muted"}>{row.stage}</Badge>;
            }
            if (key === "_actions") {
              return (
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    onClick={() => openContact(row)}
                    data-tour="lead-contact-btn"
                    className="text-xs px-2.5 py-1 rounded-md border font-medium text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    Contact
                  </button>
                  {row.stage !== "Closed Won" && row.stage !== "Closed Lost" && (
                    <button
                      onClick={() => advance(row.name, row.stage)}
                      className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/15"
                    >
                      Advance
                    </button>
                  )}
                </div>
              );
            }
            return String(row[key] ?? "");
          }}
        />
      </Section>

      {recentContacts.length > 0 && (
        <Section
          title="Recent outreach"
          description="Calls, emails and messages logged against your prospects."
        >
          <ul className="divide-y -my-2">
            {recentContacts.slice(0, 8).map((c) => (
              <li key={c.id} className="py-2.5 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ChannelIcon channel={c.channel} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{c.leadName}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {c.channel} · {new Date(c.at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{c.note}</div>
                  <div className="text-[11px] text-muted-foreground/80 mt-0.5">by {c.by}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <FormDialog
        open={contact.open}
        onOpenChange={(v) => {
          contact.setOpen(v);
          if (!v) setContactTarget(null);
        }}
        title={`Log outreach — ${contactTarget?.name ?? ""}`}
        description="Record a call, email or message with this prospect."
        onSubmit={submitContact}
        submitLabel="Log outreach"
      >
        {(contactTarget?.phone || contactTarget?.email) && (
          <div className="sm:col-span-2 flex flex-wrap gap-3 rounded-lg border bg-muted/40 p-2.5 text-xs">
            {contactTarget?.phone && (
              <a
                href={`tel:${contactTarget.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 font-medium hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {contactTarget.phone}
              </a>
            )}
            {contactTarget?.email && (
              <a
                href={`mailto:${contactTarget.email}`}
                className="inline-flex items-center gap-1.5 font-medium hover:text-primary"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {contactTarget.email}
              </a>
            )}
          </div>
        )}
        <Field label="Channel">
          <Select
            value={contactForm.channel}
            onChange={(e) =>
              setContactForm({ ...contactForm, channel: e.target.value as OutreachChannel })
            }
            options={(["Call", "Email", "WhatsApp", "SMS", "Meeting"] as OutreachChannel[]).map(
              (c) => ({ value: c, label: c }),
            )}
          />
        </Field>
        <Field label="Mark as contacted">
          <Select
            value={contactForm.markContacted ? "yes" : "no"}
            onChange={(e) =>
              setContactForm({ ...contactForm, markContacted: e.target.value === "yes" })
            }
            options={[
              { value: "yes", label: "Yes — advance New → Contacted" },
              { value: "no", label: "No — keep current stage" },
            ]}
          />
        </Field>
        <Field label="Notes" required className="sm:col-span-2">
          <TextInput
            data-tour="lead-note"
            value={contactForm.note}
            onChange={(e) => setContactForm({ ...contactForm, note: e.target.value })}
            placeholder="e.g. Spoke to mum — booked a Saturday tryout"
            autoFocus
          />
        </Field>
      </FormDialog>

      <FormDialog
        open={add.open}
        onOpenChange={add.setOpen}
        title="New Lead"
        description="Add a prospect to your sales pipeline."
        onSubmit={submit}
        submitLabel="Add lead"
      >
        <Field label="Full name" required className="sm:col-span-2">
          <TextInput
            data-tour="lead-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Ishara Madushani"
            autoFocus
          />
        </Field>
        <Field label="Phone">
          <TextInput
            data-tour="lead-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="e.g. +94 77 123 4567"
          />
        </Field>
        <Field label="Email">
          <TextInput
            data-tour="lead-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. parent@example.com"
          />
        </Field>
        <Field label="Source">
          <Select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={SOURCES.map((s) => ({ value: s, label: s }))}
          />
        </Field>
        <Field label="Stage">
          <Select
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
            options={STAGES.map((s) => ({ value: s, label: s }))}
          />
        </Field>
        <Field label={swim ? "Programme of interest" : "Interest"} className="sm:col-span-2">
          {swim ? (
            <Select
              value={form.interest || SWIM_INTERESTS[0]}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
              options={SWIM_INTERESTS.map((i) => ({ value: i, label: i }))}
            />
          ) : (
            <TextInput
              value={form.interest}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
              placeholder="e.g. A/L Science"
            />
          )}
        </Field>
        <Field label="Owner">
          {swim ? (
            <Select
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              options={SWIM_OWNERS.map((o) => ({ value: o, label: o }))}
            />
          ) : (
            <TextInput
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              placeholder="e.g. Marketing — Rajiv"
            />
          )}
        </Field>
        <Field label="Est. value (USD)">
          <TextInput
            type="number"
            min={0}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
          />
        </Field>
      </FormDialog>
    </div>
  );
}
