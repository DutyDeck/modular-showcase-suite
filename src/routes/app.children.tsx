import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge } from "@/components/ui-kit";
import { children } from "@/lib/mockData";
import { Baby } from "lucide-react";

export const Route = createFileRoute("/app/children")({
  head: () => ({ meta: [{ title: "My Children — GlobalEdu" }] }),
  component: ChildrenPage,
});

function ChildrenPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Children" subtitle="Linked student accounts and academic progress." />
      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
        {children.map((c) => (
          <Section key={c.id}>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-brand text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  <Badge tone="success">Active</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{c.grade} · ID {c.id}</div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-4 pt-4 border-t text-center">
                  <div><div className="text-lg sm:text-xl font-bold">{c.attendance}%</div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendance</div></div>
                  <div><div className="text-lg sm:text-xl font-bold">{c.gpa}</div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">GPA</div></div>
                  <div><div className="text-lg sm:text-xl font-bold text-warning-foreground">${c.duesUSD}</div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Dues</div></div>
                </div>
                <div className="mt-3 text-xs flex items-start gap-2"><Baby className="h-3 w-3 text-primary mt-0.5 shrink-0" /><span>Next class: <span className="font-medium">{c.nextClass}</span></span></div>
              </div>
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}
