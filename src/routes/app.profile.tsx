import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/menus";

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
            <div className="text-sm text-muted-foreground">{roleLabel[user.role]} Â· {user.institution}</div>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-md bg-muted/40">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5 capitalize">{value}</div>
    </div>
  );
}
