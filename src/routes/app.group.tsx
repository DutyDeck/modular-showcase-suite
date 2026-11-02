import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  DoorOpen,
  Globe2,
  Network,
  PiggyBank,
  Users,
} from "lucide-react";
import { PageHeader, Section, StatCard, DataTable, Badge, Button } from "@/components/ui-kit";
import { PackContextBar, StatusPill } from "@/components/packs/PackUI";
import { useCollection } from "@/lib/store";
import { PACK_BY_ID, useTenantContext } from "@/lib/packs/registry";
import { REGIONS, codeSetById, money } from "@/lib/packs/regions";
import { currentTerm } from "@/lib/packs/foundationData";
import { summarise } from "@/lib/packs/opsData";
import { accountTotals, USD_PER } from "@/lib/packs/bizData";

export const Route = createFileRoute("/app/group")({
  head: () => ({ meta: [{ title: "Group & Campuses — 1StudentID" }] }),
  component: GroupCampusesPage,
});

const REPORTING = "USD";

function GroupCampusesPage() {
  const ctx = useTenantContext();
  const groups = useCollection("tenantGroups");
  const tenants = useCollection("tenants");
  const profiles = useCollection("tenantProfiles");
  const learners = useCollection("learners");
  const feeAccounts = useCollection("feeAccounts");
  const marks = useCollection("registerMarks");
  const applications = useCollection("applications");
  const calendars = useCollection("academicCalendars");

  const group = groups.find((g) => g.id === ctx.profile?.groupId);
  const isGroupAdmin =
    !!group && (ctx.isGlobalAdmin || group.groupAdmins.includes(ctx.user?.name ?? ""));

  const campuses = useMemo(() => {
    if (!group) return [];
    return group.tenantIds.map((id) => {
      const tenant = tenants.find((t) => t.id === id);
      const profile = profiles.find((p) => p.tenantId === id);
      const region = REGIONS[profile?.region ?? "GLOBAL"];
      const cur = region.currency;
      const fx = USD_PER[cur] ?? 1;
      const ls = learners.filter((l) => l.tenantId === id && l.status === "Active");
      let billed = 0,
        paid = 0;
      for (const a of feeAccounts.filter((x) => x.tenantId === id)) {
        const t = accountTotals(a);
        billed += t.billed;
        paid += t.paid;
      }
      const set = codeSetById(profile?.codeSetId ?? "simple");
      const tMarks = marks.filter((m) => m.tenantId === id);
      const att = tMarks.length ? summarise(tMarks, set).pct : null;
      const apps = applications.filter((a) => a.tenantId === id);
      const open = apps.filter(
        (a) => !["Enrolled", "Declined", "Withdrawn"].includes(a.stage),
      ).length;
      const offers = apps.filter((a) =>
        ["Offer", "Accepted", "Deposit paid"].includes(a.stage),
      ).length;
      const cal =
        calendars.find((c) => c.tenantId === id && c.isDefault) ??
        calendars.find((c) => c.tenantId === id);
      return {
        id,
        name: tenant?.name ?? id,
        roll: tenant?.students ?? ls.length,
        sampleLearners: ls.length,
        profile,
        region,
        cur,
        billed,
        paid,
        billedUsd: billed * fx,
        paidUsd: paid * fx,
        att,
        open,
        offers,
        cal,
        term: cal ? currentTerm(cal) : undefined,
      };
    });
  }, [group, tenants, profiles, learners, feeAccounts, marks, applications, calendars]);

  if (!group) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Group & Campuses"
          subtitle="Cross-campus view for school groups and multi-campus universities."
        />
        <PackContextBar />
        <Section>
          <div className="text-center py-8 max-w-xl mx-auto">
            <Network className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="font-semibold mt-2">
              {ctx.tenantName || "This institute"} isn't part of a group
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Groups are a <span className="font-medium text-foreground">tenancy decision</span> for
              the product owner. The prototype models a group as a set of tenants plus named group
              admins: each campus keeps its own data, region, currency, calendar and packs, and the
              group view only rolls up figures — it never merges student records.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              See it live: sign in as <span className="font-medium">Hannah Clarke</span> (Meridian
              Education Group — Dubai + Colombo).
            </p>
          </div>
        </Section>
      </div>
    );
  }

  const visible = isGroupAdmin ? campuses : campuses.filter((c) => c.id === ctx.tenantId);
  const tot = visible.reduce(
    (s, c) => ({
      roll: s.roll + c.roll,
      billed: s.billed + c.billedUsd,
      paid: s.paid + c.paidUsd,
      open: s.open + c.open,
      offers: s.offers + c.offers,
    }),
    { roll: 0, billed: 0, paid: 0, open: 0, offers: 0 },
  );
  const attValues = visible.map((c) => c.att).filter((v): v is number => v !== null);
  const avgAtt = attValues.length ? attValues.reduce((a, b) => a + b, 0) / attValues.length : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={group.name}
        subtitle={`Group view · HQ ${group.hq} · ${group.tenantIds.length} campuses · reporting currency ${REPORTING}`}
      />
      <PackContextBar
        extra={
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 bg-card">
            <Network className="h-3.5 w-3.5 text-muted-foreground" />
            {isGroupAdmin ? "Group admin" : "Campus admin — own campus only"}
          </span>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Students across campuses"
          value={tot.roll.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label={`Fees billed (${REPORTING})`}
          value={money(tot.billed, REPORTING)}
          hint="Demo accounts, converted at fixed FX"
          icon={<PiggyBank className="h-4 w-4" />}
        />
        <StatCard
          label="Collected"
          value={`${tot.billed ? Math.round((tot.paid / tot.billed) * 100) : 0}%`}
          hint={money(tot.paid, REPORTING)}
          accent="success"
        />
        <StatCard
          label="Attendance (avg)"
          value={avgAtt === null ? "—" : `${avgAtt.toFixed(1)}%`}
          hint="Each campus on its own code set"
          accent="info"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatCard
          label="Admissions pipeline"
          value={tot.open}
          hint={`${tot.offers} at offer or later`}
          icon={<DoorOpen className="h-4 w-4" />}
        />
      </div>

      <Section
        title="Campus comparison"
        description="Same group, different countries — each campus runs on its own region profile, currency and academic calendar."
      >
        <DataTable
          columns={[
            { key: "campus", label: "Campus" },
            { key: "region", label: "Region" },
            { key: "calendar", label: "Academic calendar" },
            { key: "packs", label: "Packs" },
            { key: "roll", label: "Roll", className: "text-right" },
            { key: "fees", label: "Billed / collected", className: "text-right" },
            { key: "att", label: "Attendance", className: "text-right" },
            { key: "adm", label: "Admissions" },
            { key: "_actions", label: "" },
          ]}
          rows={visible}
          renderCell={(c: (typeof campuses)[number], key) => {
            switch (key) {
              case "campus":
                return (
                  <div>
                    <div className="font-medium flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {c.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.id} · {c.profile?.city}
                    </div>
                  </div>
                );
              case "region":
                return (
                  <div className="text-xs">
                    {c.region.flag} {c.region.name}
                    <div className="text-[11px] text-muted-foreground">
                      {c.cur} · {c.region.tax.name} {Math.round(c.region.tax.rate * 100)}%
                    </div>
                  </div>
                );
              case "calendar": {
                const tpl = c.region.calendarTemplate.school;
                const overrides =
                  c.cal &&
                  tpl &&
                  new Date(c.cal.start + "T00:00:00Z").getUTCMonth() + 1 !== tpl.startMonth;
                return c.cal ? (
                  <div className="text-xs">
                    <div>{c.cal.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {monthYear(c.cal.start)} – {monthYear(c.cal.end)}
                      {c.term ? ` · now: ${c.term.name}` : ""}
                    </div>
                    {overrides && <Badge tone="warning">Overrides {c.region.name} default</Badge>}
                  </div>
                ) : (
                  "—"
                );
              }
              case "packs":
                return (
                  <div className="flex flex-wrap gap-1">
                    {(c.profile?.packs ?? []).map((p) => (
                      <Badge key={p} tone="info">
                        {PACK_BY_ID[p].short}
                      </Badge>
                    ))}
                  </div>
                );
              case "roll":
                return c.roll.toLocaleString();
              case "fees":
                return (
                  <div className="text-xs">
                    {money(c.billed, c.cur)} / {money(c.paid, c.cur)}
                    <div className="text-[10px] text-muted-foreground">
                      ≈ {money(c.billedUsd, REPORTING)} billed
                    </div>
                  </div>
                );
              case "att":
                return c.att === null ? "—" : `${c.att.toFixed(1)}%`;
              case "adm":
                return (
                  <span className="text-xs">
                    {c.open} open · {c.offers} offers
                  </span>
                );
              case "_actions":
                return c.id === ctx.tenantId ? (
                  <StatusPill status="Active" />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast.message(`Open ${c.name}`, {
                        description:
                          "In production this switches your tenant context (audited). Each campus's records stay in its own tenant.",
                      })
                    }
                  >
                    Open campus <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                );
              default:
                return null;
            }
          }}
        />
        <p className="text-[11px] text-muted-foreground mt-3">
          Fee figures are the demo fee accounts for each campus; roll uses the tenant record. Group
          totals convert each campus currency to {REPORTING} at fixed demo rates — campus ledgers
          stay in their own currency.
        </p>
      </Section>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="How a group works" description="Tenancy model used by this prototype">
          <ul className="text-sm space-y-2">
            {[
              "A group is a set of tenants plus named group admins — not a bigger tenant.",
              "Each campus keeps its own students, region profile, currency, tax and calendar.",
              "Group admins get read-only roll-ups and can open a campus (audited context switch).",
              "Student records are never merged across campuses; a transfer uses the same permanent 1StudentID with consent.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Globe2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Group admins" description="Who sees the cross-campus view">
          <ul className="space-y-1.5 text-sm">
            {group.groupAdmins.map((n) => (
              <li key={n} className="flex items-center justify-between">
                {n}
                <Badge tone="success">Group admin</Badge>
              </li>
            ))}
          </ul>
          {!isGroupAdmin && (
            <p className="text-xs text-muted-foreground mt-3">
              You see your own campus only. Ask a group admin for cross-campus access.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function monthYear(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}
