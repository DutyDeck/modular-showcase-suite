import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  moduleForPath,
  useEnabledModules,
  MODULE_BY_ID,
} from "@/lib/modules";

export function ModuleGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const enabled = useEnabledModules(user?.institution ?? "");

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
          <span className="font-medium text-foreground">{user?.institution}</span>.
          Contact your administrator to add it.
        </p>
        {def.plan && (
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-3 w-3" />
            Available on the {def.plan} plan
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            to="/app"
            className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted"
          >
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
