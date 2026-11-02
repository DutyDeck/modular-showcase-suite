import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, Sparkles, PackageX } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { moduleForPath, useEnabledModules, MODULE_BY_ID } from "@/lib/modules";
import { isSwimUser } from "@/lib/mockData";
import { packForPath, PACK_BY_ID, useTenantContext, type PackId } from "@/lib/packs/registry";

export function ModuleGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const enabled = useEnabledModules(user?.institution ?? "");
  const tenant = useTenantContext();

  // 1) Pack gate. A swim-club account's whole product IS the Swim Pack, so when
  //    the pack is off for its tenant everything but the profile is locked.
  //    Global admins can preview any pack page.
  const swimAccount = isSwimUser(user);
  const packId: PackId | null =
    swimAccount && !tenant.packs.has("swim") && !["/app/profile", "/app/settings"].includes(path)
      ? "swim"
      : packForPath(path);
  if (packId && !tenant.packs.has(packId) && !tenant.isGlobalAdmin) {
    return <PackLocked packId={packId} tenantName={tenant.tenantName} isAdmin={tenant.isAdmin} />;
  }

  // 2) Module gate.
  const moduleId = moduleForPath(path);
  if (!moduleId || enabled.has(moduleId)) return <>{children}</>;

  const def = MODULE_BY_ID[moduleId];

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl border bg-card p-8 text-center shadow-soft">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold">{def.name} is not enabled</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This module is not part of your current plan for{" "}
          <span className="font-medium text-foreground">{user?.institution}</span>. Contact your
          administrator to add it.
        </p>
        {def.plan && (
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-3 w-3" />
            Available on the {def.plan} plan
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link to="/app" className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted">
            Back to dashboard
          </Link>
          {user?.role === "admin" && (
            <Link
              to="/app/settings"
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Manage modules
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function PackLocked({
  packId,
  tenantName,
  isAdmin,
}: {
  packId: PackId;
  tenantName: string;
  isAdmin: boolean;
}) {
  const def = PACK_BY_ID[packId];
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl border bg-card p-8 text-center shadow-soft">
        <div
          className={`mx-auto h-12 w-12 rounded-full bg-gradient-to-br ${def.tone} text-white flex items-center justify-center mb-4`}
        >
          <PackageX className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">{def.name} is not enabled</h1>
        <p className="text-sm text-muted-foreground mt-2">
          <span className="font-medium text-foreground">{tenantName || "This institute"}</span>{" "}
          doesn't have the {def.name} switched on, so these screens are hidden. Packs are activated
          per tenant by the platform administrator.
        </p>
        <ul className="mt-4 text-left text-xs text-muted-foreground space-y-1">
          {def.features.slice(0, 4).map((f) => (
            <li key={f} className="flex gap-2">
              <Sparkles className="h-3 w-3 mt-0.5 text-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link to="/app/profile" className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted">
            My profile
          </Link>
          {isAdmin && (
            <Link
              to="/app/settings"
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              View packs
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
