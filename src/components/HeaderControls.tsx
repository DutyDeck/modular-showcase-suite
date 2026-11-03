import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Moon,
  Languages,
  CircleDollarSign,
  RotateCcw,
  Sparkles,
  CalendarCheck,
  Wallet,
  Award,
  GraduationCap,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/Avatar";
import { roleLabel } from "@/lib/menus";
import { usePrefs, LOCALE_LABEL, CURRENCY_LABEL, type Locale, type Currency } from "@/lib/prefs";
import { resetStore } from "@/lib/store";
import { notifications, swimNotifications, isSwimUser } from "@/lib/mockData";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const ICON_FOR_TYPE: Record<string, any> = {
  grade: Award,
  attendance: CalendarCheck,
  billing: Wallet,
  class: GraduationCap,
  incident: Bell,
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Swim accounts get a club-relevant feed (sessions, attendance, incidents,
  // cover) instead of the generic school notifications (exam grades, …).
  const feed = isSwimUser(user) ? swimNotifications : notifications;
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const visible = feed.filter((_, i) => !dismissed.has(i));
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
            onClick={() => setDismissed(new Set(feed.map((_, i) => i)))}
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
                    setDismissed((s) => new Set([...s, feed.indexOf(n)]));
                    const swim = isSwimUser(user);
                    if (n.type === "billing") navigate({ to: "/app/finance" });
                    else if (n.type === "incident") navigate({ to: "/app/swim-reports" });
                    else if (n.type === "attendance")
                      navigate({ to: swim ? "/app/swim-reports" : "/app/attendance" });
                    else if (n.type === "grade") navigate({ to: "/app/grades" });
                    else if (n.type === "class") {
                      if (swim)
                        navigate({
                          to: "/app/courses/$courseId",
                          params: { courseId: "C-SWIM" },
                        });
                      else navigate({ to: "/app/lms" });
                    }
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/60 flex gap-3 items-start"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <I className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{n.text}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{n.time}</div>
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

/**
 * The account menu (avatar) — the ONE place for personal things: profile,
 * display preferences (language, currency, appearance), demo reset, sign out.
 * Keeps the header to search · notifications · you.
 */
export function AccountMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { locale, setLocale, currency, setCurrency, theme, setTheme } = usePrefs();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-md sm:pl-2 sm:ml-1 sm:border-l hover:bg-muted/60 p-1"
          aria-label="Account menu"
        >
          <Avatar
            name={user.name}
            src={user.photo}
            size={34}
            tone="brand"
            className="ring-2 ring-primary/20"
          />
          <div className="leading-tight hidden xl:block text-left">
            <div className="text-sm font-medium truncate max-w-[140px]">{user.name}</div>
            <div className="text-[11px] text-muted-foreground truncate max-w-[140px]">
              {roleLabel[user.role]}
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/app/profile" })}>
          <User /> My profile
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem onSelect={() => navigate({ to: "/app/settings" })}>
            <Settings /> Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages /> Language
            <span className="ml-auto text-[11px] text-muted-foreground">
              {LOCALE_LABEL[locale]}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              {(Object.keys(LOCALE_LABEL) as Locale[]).map((l) => (
                <DropdownMenuRadioItem key={l} value={l}>
                  {LOCALE_LABEL[l]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CircleDollarSign /> Currency
            <span className="ml-auto text-[11px] text-muted-foreground">{currency}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={currency}
              onValueChange={(v) => setCurrency(v as Currency)}
            >
              {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>
                  {CURRENCY_LABEL[c]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault(); // keep the menu open while toggling
            setTheme(theme === "dark" ? "light" : "dark");
          }}
        >
          <Moon /> Dark mode
          <span className="ml-auto text-[11px] text-muted-foreground">
            {theme === "dark" ? "On" : "Off"}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            if (window.confirm("Reset all demo data? This wipes your in-app edits.")) {
              resetStore();
              toast.success("Demo data reset");
            }
          }}
        >
          <RotateCcw /> Reset demo data
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            logout();
            navigate({ to: "/login" });
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
