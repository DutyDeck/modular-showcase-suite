import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Moon,
  Sun,
  Languages,
  CircleDollarSign,
  RotateCcw,
  Sparkles,
  Check,
  CalendarCheck,
  Wallet,
  Award,
  GraduationCap,
  Building2,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { usePrefs, LOCALE_LABEL, CURRENCY_LABEL, type Locale, type Currency } from "@/lib/prefs";
import { resetStore } from "@/lib/store";
import { notifications } from "@/lib/mockData";
import { useAuth } from "@/lib/auth";
import { setEnabledModules, useEnabledModules, MODULES, type ModuleId } from "@/lib/modules";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ICON_FOR_TYPE: Record<string, any> = {
  grade: Award,
  attendance: CalendarCheck,
  billing: Wallet,
  class: GraduationCap,
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const visible = notifications.filter((_, i) => !dismissed.has(i));
  const unread = visible.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </div>
          </div>
          <button
            onClick={() => setDismissed(new Set(notifications.map((_, i) => i)))}
            className="text-xs text-primary font-medium hover:underline"
          >
            Mark all read
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto divide-y">
          {visible.length === 0 && (
            <li className="px-4 py-8 text-center text-xs text-muted-foreground">
              You're all caught up.
            </li>
          )}
          {visible.map((n, i) => {
            const I = ICON_FOR_TYPE[n.type] ?? Sparkles;
            return (
              <li key={`${n.type}-${i}`}>
                <button
                  onClick={() => {
                    setDismissed((s) => new Set([...s, notifications.indexOf(n)]));
                    if (n.type === "billing") navigate({ to: "/app/finance" });
                    else if (n.type === "attendance") navigate({ to: "/app/attendance" });
                    else if (n.type === "grade") navigate({ to: "/app/grades" });
                    else if (n.type === "class") navigate({ to: "/app/lms" });
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/60 flex gap-3 items-start"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <I className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{n.text}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {n.time}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = usePrefs();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center"
      aria-label="Toggle theme"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

export function LanguageSwitcher() {
  const { locale, setLocale } = usePrefs();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center"
          aria-label="Language"
          title="Language"
        >
          <Languages className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        {(Object.keys(LOCALE_LABEL) as Locale[]).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between hover:bg-muted",
              l === locale && "bg-muted/60",
            )}
          >
            {LOCALE_LABEL[l]}
            {l === locale && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function CurrencySwitcher() {
  const { currency, setCurrency } = usePrefs();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="h-9 px-2 rounded-md hover:bg-muted flex items-center gap-1 text-xs font-medium"
          aria-label="Currency"
        >
          <CircleDollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">{currency}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between hover:bg-muted",
              c === currency && "bg-muted/60",
            )}
          >
            {CURRENCY_LABEL[c]}
            {c === currency && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const ENTITLEMENT_PROFILES: Array<{
  id: string;
  label: string;
  plan: "Starter" | "Growth" | "Enterprise";
  hint: string;
  modules: ModuleId[];
}> = [
  {
    id: "starter",
    label: "Starter",
    plan: "Starter",
    hint: "Roster, attendance, comms only",
    modules: [
      "core", "students", "courses", "attendance", "calendar",
      "teaching", "family", "messages", "users",
    ],
  },
  {
    id: "growth",
    label: "Growth",
    plan: "Growth",
    hint: "Adds LMS, grades, finance",
    modules: [
      "core", "students", "courses", "attendance", "calendar", "lms",
      "assignments", "grades", "srb", "teaching", "family", "finance",
      "marketplace", "messages", "reports", "users",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    plan: "Enterprise",
    hint: "Everything · AI, multi-tenant, compliance",
    modules: MODULES.map((m) => m.id),
  },
];

const PLAN_DOT: Record<string, string> = {
  Starter: "bg-muted-foreground",
  Growth: "bg-info",
  Enterprise: "bg-primary",
};

export function TenantProfileSwitcher() {
  const { user } = useAuth();
  const enabled = useEnabledModules(user?.institution ?? "");
  if (!user) return null;

  // Match profile by exact module set, fall back to "Custom".
  const currentIds = Array.from(enabled).sort().join(",");
  const active = ENTITLEMENT_PROFILES.find(
    (p) => [...p.modules].sort().join(",") === currentIds,
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="h-9 px-2 sm:px-2.5 rounded-md hover:bg-muted flex items-center gap-1.5 text-xs font-medium"
          aria-label="Tenant entitlement profile"
          title="Demo: tenant entitlement profile"
        >
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">{active?.label ?? "Custom"}</span>
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              active ? PLAN_DOT[active.plan] : "bg-warning",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1">
        <div className="px-3 py-2 border-b mb-1">
          <div className="text-xs font-semibold">Demo: tenant profile</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Applies an entitlement preset to{" "}
            <span className="font-medium text-foreground">{user.institution}</span>.
            Sidebar updates instantly.
          </div>
        </div>
        {ENTITLEMENT_PROFILES.map((p) => {
          const isActive = active?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setEnabledModules(user.institution, p.modules);
                toast.success(`Applied ${p.label} profile`);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-start gap-2",
                isActive && "bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                  PLAN_DOT[p.plan],
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium flex items-center justify-between gap-2">
                  {p.label}
                  {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
                <div className="text-[10px] text-muted-foreground">{p.hint}</div>
              </div>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function ResetDemoButton() {
  return (
    <button
      onClick={() => {
        if (
          typeof window === "undefined" ||
          window.confirm("Reset all demo data? This wipes your in-app edits.")
        ) {
          resetStore();
          toast.success("Demo data reset");
        }
      }}
      className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center"
      aria-label="Reset demo data"
      title="Reset demo data"
    >
      <RotateCcw className="h-4 w-4" />
    </button>
  );
}
