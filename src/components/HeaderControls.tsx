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
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { usePrefs, LOCALE_LABEL, CURRENCY_LABEL, type Locale, type Currency } from "@/lib/prefs";
import { resetStore } from "@/lib/store";
import { notifications } from "@/lib/mockData";
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
