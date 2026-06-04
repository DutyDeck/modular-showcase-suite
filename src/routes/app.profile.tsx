import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/menus";
import { ageOn } from "@/lib/mockData";
import {
  ShieldCheck,
  UserCheck,
  CreditCard,
  BookOpen,
  Wallet,
  Users2,
} from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "My Profile — One Edu" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="Manage your global student identity and preferences." />

      {user.role === "student" && user.dob && <GuardianshipCard />}

      <Section>
        <div className="flex items-start gap-5">
          <Avatar
            name={user.name}
            src={user.photo}
            size={80}
            tone="brand"
            shape="square"
            className="ring-2 ring-primary/20 shadow-elegant"
          />

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <Badge tone="success">Verified</Badge>
            </div>
            <div className="text-sm text-muted-foreground">{roleLabel[user.role]} · {user.institution}</div>
            <div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
              <Field label="Email" value={user.email} />
              <Field label="Global Student ID" value={`GSID-${user.id.toUpperCase()}-2026`} />
              {Object.entries(user.meta ?? {}).map(([k, v]) => (
                <Field key={k} label={k} value={v} />
              ))}
              <Field label="Region" value="Asia-Pacific" />
              <Field label="Language" value="English (en-LK)" />
              <Field label="Currency" value="USD" />
            </div>
          </div>
        </div>
      </Section>
      <div className="grid md:grid-cols-3 gap-4">
        {["Wellness profile", "Emergency contacts", "Linked devices", "Consent & privacy", "Security & MFA", "Data export"].map(x => (
          <button key={x} className="p-4 rounded-lg border bg-card text-left hover:border-primary hover:shadow-soft transition-all">
            <div className="font-medium text-sm">{x}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Manage</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GuardianshipCard() {
  const { user } = useAuth();
  if (!user || !user.dob) return null;
  const age = ageOn(user.dob);
  const adult = !!user.selfManaged;
  const dobLabel = new Date(user.dob).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Section
      title="Account & guardianship"
      description="Who can authorise enrolments, payments and course selection on this account."
    >
      <div className="grid md:grid-cols-[1.1fr_1fr] gap-5">
        {/* Status banner */}
        <div
          className={`rounded-xl border p-4 ${
            adult
              ? "border-success/30 bg-success/10"
              : "border-warning/30 bg-warning/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {adult ? (
              <UserCheck className="h-5 w-5 text-success" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-warning-foreground" />
            )}
            <div className="font-semibold text-sm">
              {adult ? "Self-managed account" : "Guardian-linked account"}
            </div>
            <Badge tone={adult ? "success" : "warning"}>
              {age} yrs{adult ? " · 18+" : " · minor"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {adult ? (
              <>
                You are <b>{age}</b> and manage your own One Edu account. You can
                handle <b>enrolment, fee payments and course selection</b>{" "}
                yourself — no guardian approval is required.
              </>
            ) : (
              <>
                You are <b>{age}</b>, so your account is linked to a guardian.
                Enrolment, payments and course-selection requests are sent to{" "}
                <b>{user.guardianName ?? "your guardian"}</b> to approve.
              </>
            )}
          </p>

          {adult ? (
            <div className="flex flex-wrap gap-2 mt-3">
              <Link to="/app/courses">
                <Action icon={<BookOpen className="h-3.5 w-3.5" />} label="Select courses" />
              </Link>
              <Link to="/app/finance">
                <Action icon={<Wallet className="h-3.5 w-3.5" />} label="Pay fees" />
              </Link>
              <Link to="/app/marketplace">
                <Action icon={<CreditCard className="h-3.5 w-3.5" />} label="Enrol in marketplace" />
              </Link>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-xs rounded-md bg-card border px-2.5 py-2">
              <Users2 className="h-4 w-4 text-muted-foreground" />
              <span>
                Guardian: <b>{user.guardianName ?? "—"}</b> · approves on your
                behalf
              </span>
            </div>
          )}
        </div>

        {/* Facts */}
        <div className="grid grid-cols-2 gap-3 text-sm self-start">
          <Field label="Date of birth" value={dobLabel} />
          <Field label="Age" value={`${age} years`} />
          <Field
            label="Account type"
            value={adult ? "Self-managed (adult)" : "Guardian-linked (minor)"}
          />
          <Field
            label="Consent holder"
            value={adult ? "Self" : user.guardianName ?? "Guardian"}
          />
        </div>
      </div>
    </Section>
  );
}

function Action({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md bg-card border px-2.5 py-1.5 hover:border-primary hover:text-primary transition-colors">
      {icon}
      {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-md bg-muted/40">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5 capitalize">{value}</div>
    </div>
  );
}
