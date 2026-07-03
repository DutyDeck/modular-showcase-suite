import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import * as Icons from "lucide-react";
import { useAuth } from "@/lib/auth";
import { menuForUser, roleLabel } from "@/lib/menus";
import { useEnabledModules } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import {
  NotificationBell,
  ThemeToggle,
  LanguageSwitcher,
  CurrencySwitcher,
  ResetDemoButton,
  TenantProfileSwitcher,
} from "@/components/HeaderControls";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/CommandPalette";
import { CopilotDrawer, CopilotLauncher } from "@/components/CopilotDrawer";
import { ModuleGate } from "@/components/ModuleGate";
import { usePrefs } from "@/lib/prefs";
import { BrandLogo } from "@/components/BrandLogo";

function Icon({ name, className }: { name: string; className?: string }) {
  const icons = Icons as unknown as Record<string, ComponentType<{ className?: string }>>;
  const Cmp = icons[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = usePrefs();
  const palette = useCommandPaletteHotkey();
  const [copilotOpen, setCopilotOpen] = useState(false);
  // Desktop sidebar collapsed/expanded state
  const [collapsed, setCollapsed] = useState(false);
  // Mobile drawer open/closed
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  // close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  // lock body scroll when mobile drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const enabled = useEnabledModules(user?.institution ?? "");

  if (!user) return null;

  const items = menuForUser(user).filter((item) => !item.moduleId || enabled.has(item.moduleId));
  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    const g = item.group ?? "Main";
    (groups[g] ||= []).push(item);
  }

  const sidebar = (mode: "desktop" | "mobile") => {
    const open = mode === "mobile" ? true : !collapsed;
    return (
      <>
        <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
          <BrandLogo size={36} className="h-9 w-9 drop-shadow" />
          {open && (
            <div className="leading-tight flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                <span className="text-sky-500">1</span>StudentID
              </div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">Super App</div>
            </div>
          )}
          {mode === "mobile" && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md hover:bg-sidebar-accent/60"
              aria-label="Close menu"
            >
              <Icons.X className="h-4 w-4" />
            </button>
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
                  const active = item.to === "/app" ? path === "/app" : path.startsWith(item.to);
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
                        {open && <span className="truncate">{t(item.label, item.label)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {mode === "desktop" && (
          <div className="border-t border-sidebar-border p-3">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="w-full flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <Icons.PanelLeft className="h-4 w-4" />
              {open && <span>Collapse</span>}
            </button>
          </div>
        )}

        {mode === "mobile" && (
          <div className="border-t border-sidebar-border p-3">
            <button
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
              className="w-full flex items-center gap-2 text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground"
            >
              <Icons.LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex bg-sidebar text-sidebar-foreground flex-col transition-all duration-300 sticky top-0 h-screen",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {sidebar("desktop")}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground flex flex-col shadow-2xl transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebar("mobile")}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 sm:h-16 bg-card border-b flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 backdrop-blur">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-md hover:bg-muted"
              aria-label="Open menu"
            >
              <Icons.Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {user.institution}
              </div>
              <div className="font-semibold text-xs sm:text-sm truncate">
                {roleLabel[user.role]} Workspace
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => palette.setOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm w-72 hover:bg-muted/80 transition-colors"
              aria-label="Open command palette"
            >
              <Icons.Search className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left text-muted-foreground text-xs">
                Search or jump to…
              </span>
              <kbd className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 font-mono">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => palette.setOpen(true)}
              className="lg:hidden h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center"
              aria-label="Open search"
            >
              <Icons.Search className="h-4 w-4" />
            </button>
            <TenantProfileSwitcher />
            <LanguageSwitcher />
            <CurrencySwitcher />
            <ThemeToggle />
            <NotificationBell />
            <ResetDemoButton />
            <div className="flex items-center gap-2 sm:pl-2 sm:ml-1 sm:border-l">
              <Avatar
                name={user.name}
                src={user.photo}
                size={36}
                tone="brand"
                className="ring-2 ring-primary/20"
              />
              <div className="leading-tight hidden xl:block">
                <div className="text-sm font-medium truncate max-w-[140px]">{user.name}</div>
                <div className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                  {user.email}
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate({ to: "/login" });
                }}
                className="hidden sm:flex ml-1 p-2 rounded-md hover:bg-muted"
                title="Sign out"
                aria-label="Sign out"
              >
                <Icons.LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-5 md:p-8 max-w-[1600px] w-full mx-auto">
          <ModuleGate>
            <Outlet />
          </ModuleGate>
        </main>
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
      <CopilotLauncher onClick={() => setCopilotOpen(true)} />
      <CopilotDrawer open={copilotOpen} onOpenChange={setCopilotOpen} />
    </div>
  );
}
