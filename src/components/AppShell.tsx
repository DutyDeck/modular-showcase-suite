import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { useAuth } from "@/lib/auth";
import { menusByRole, roleLabel } from "@/lib/menus";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/globaledu-logo.png";

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as any)[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return null;

  const items = menusByRole[user.role];
  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    const g = item.group ?? "Main";
    (groups[g] ||= []).push(item);
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 sticky top-0 h-screen",
          open ? "w-64" : "w-16",
        )}
      >
        <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
          <img
            src={logoUrl}
            alt="GlobalEdu logo"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 drop-shadow"
          />
          {open && (
            <div className="leading-tight">
              <div className="font-semibold text-sm">GlobalEdu</div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">Super App</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {Object.entries(groups).map(([group, list]) => (
            <div key={group}>
              {open && (
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group}
                </div>
              )}
              <ul className="space-y-0.5">
                {list.map((item) => {
                  const active =
                    item.to === "/app" ? path === "/app" : path.startsWith(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                            : "hover:bg-sidebar-accent/60 text-sidebar-foreground/85",
                        )}
                      >
                        <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                        {open && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <Icons.PanelLeft className="h-4 w-4" />
            {open && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b flex items-center justify-between px-6 sticky top-0 z-10 backdrop-blur">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground">{user.institution}</div>
              <div className="font-semibold text-sm">{roleLabel[user.role]} Workspace</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm w-72">
              <Icons.Search className="h-4 w-4 text-muted-foreground" />
              <input
                className="bg-transparent outline-none flex-1 text-sm"
                placeholder="Search students, courses, invoices…"
              />
              <kbd className="text-[10px] text-muted-foreground border rounded px-1">⌘K</kbd>
            </div>
            <button className="relative h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center">
              <Icons.Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l">
              <img
                src={user.photo}
                alt={user.name}
                className="h-9 w-9 rounded-full ring-2 ring-primary/20 bg-muted object-cover"
              />
              <div className="leading-tight hidden sm:block">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-[11px] text-muted-foreground">{user.email}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate({ to: "/login" });
                }}
                className="ml-1 p-2 rounded-md hover:bg-muted"
                title="Sign out"
              >
                <Icons.LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
