import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth";
import { menusByRole } from "@/lib/menus";
import { useCollection, addItem, nextId, resetStore } from "@/lib/store";
import { usePrefs } from "@/lib/prefs";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = usePrefs();
  const students = useCollection("students");
  const courses = useCollection("courses");
  const invoices = useCollection("invoices");

  const items = user ? menusByRole[user.role] : [];

  const close = () => onOpenChange(false);

  const go = (to: string) => {
    close();
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command, search students, courses, invoices…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {items.map((m) => {
            const Icon = (Icons as any)[m.icon] ?? Icons.Circle;
            return (
              <CommandItem
                key={m.to}
                value={`go ${m.label}`}
                onSelect={() => go(m.to)}
              >
                <Icon />
                <span>{m.label}</span>
                <CommandShortcut>{m.group ?? "Main"}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick actions">
          {user?.role !== "student" && user?.role !== "parent" && (
            <CommandItem
              value="new student create"
              onSelect={() => {
                addItem("students", {
                  id: nextId("S-", "students"),
                  name: "New Student",
                  grade: "Grade 12",
                  batch: "Unassigned",
                  attendance: 95,
                  gpa: 3.5,
                  status: "Active",
                  parent: "—",
                  risk: "low",
                });
                toast.success("Student stub created — edit on the Students page");
                go("/app/students");
              }}
            >
              <Icons.UserPlus />
              <span>New student (stub)</span>
              <CommandShortcut>Quick add</CommandShortcut>
            </CommandItem>
          )}
          <CommandItem
            value="pay next invoice"
            onSelect={() => {
              const due = invoices.find((i) => i.status === "Due");
              if (!due) {
                toast.info("No invoices currently due");
                return;
              }
              close();
              navigate({ to: "/app/finance" });
            }}
          >
            <Icons.CreditCard />
            <span>Pay next due invoice</span>
          </CommandItem>
          <CommandItem
            value="toggle theme dark light"
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              close();
            }}
          >
            {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
            <span>Toggle {theme === "dark" ? "light" : "dark"} mode</span>
          </CommandItem>
          <CommandItem
            value="reset demo data"
            onSelect={() => {
              resetStore();
              toast.success("Demo data reset");
              close();
            }}
          >
            <Icons.RotateCcw />
            <span>Reset demo data</span>
          </CommandItem>
          <CommandItem
            value="sign out logout"
            onSelect={() => {
              logout();
              close();
              navigate({ to: "/login" });
            }}
          >
            <Icons.LogOut />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>

        {students.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Students">
              {students.slice(0, 12).map((s) => (
                <CommandItem
                  key={s.id}
                  value={`student ${s.id} ${s.name} ${s.grade} ${s.parent}`}
                  onSelect={() => go("/app/students")}
                >
                  <Icons.User />
                  <span>{s.name}</span>
                  <CommandShortcut>
                    {s.id} · {s.grade}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {courses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Courses">
              {courses.slice(0, 12).map((c) => (
                <CommandItem
                  key={c.id}
                  value={`course ${c.code} ${c.title} ${c.teacher}`}
                  onSelect={() => go("/app/courses")}
                >
                  <Icons.BookOpen />
                  <span>{c.title}</span>
                  <CommandShortcut>{c.code}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** Hook that opens the palette when ⌘K / Ctrl+K is pressed anywhere. */
export function useCommandPaletteHotkey() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
