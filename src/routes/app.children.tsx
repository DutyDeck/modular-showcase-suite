import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section, Badge, Button } from "@/components/ui-kit";
import { Avatar } from "@/components/Avatar";
import { children } from "@/lib/mockData";
import { useCollection } from "@/lib/store";
import { Baby, NotebookPen, Bell } from "lucide-react";

export const Route = createFileRoute("/app/children")({
  head: () => ({ meta: [{ title: "My Children — One Edu" }] }),
  component: ChildrenPage,
});

function ChildrenPage() {
  const srb = useCollection("srb");
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Children"
        subtitle="Linked student accounts and academic progress."
      />
      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
        {children.map((c) => {
          const childSrb = srb.filter((e) => e.studentId === c.id);
          const needsAck = childSrb.filter((e) => e.requiresAck && !e.ackAt).length;
          return (
            <Section key={c.id}>
              <div className="flex items-start gap-3 sm:gap-4">
                <Avatar name={c.name} seed={c.id} size={56} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <Badge tone="success">Active</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.grade} · ID {c.id}
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-4 pt-4 border-t text-center">
                    <div>
                      <div className="text-lg sm:text-xl font-bold">{c.attendance}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Attendance
                      </div>
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-bold">{c.gpa}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        GPA
                      </div>
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-bold text-warning-foreground">
                        ${c.duesUSD}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Dues
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs flex items-start gap-2">
                    <Baby className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                    <span>
                      Next class: <span className="font-medium">{c.nextClass}</span>
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {childSrb.length} record book{" "}
                      {childSrb.length === 1 ? "entry" : "entries"}
                      {needsAck > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-destructive font-medium">
                          <Bell className="h-3 w-3" />
                          {needsAck} need{needsAck === 1 ? "s" : ""} ack
                        </span>
                      )}
                    </div>
                    <Link
                      to="/app/srb/$studentId"
                      params={{ studentId: c.id }}
                    >
                      <Button size="sm">
                        <NotebookPen className="h-3.5 w-3.5" />
                        Record Book
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Section>
          );
        })}
      </div>
    </div>
  );
}
