import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, DataTable, Button } from "@/components/ui-kit";
import { useCollection } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const Route = createFileRoute("/app/grading")({
  head: () => ({ meta: [{ title: "Grading — One Edu" }] }),
  component: GradingPage,
});

function GradingPage() {
  const students = useCollection("students");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [published, setPublished] = useState<Record<string, boolean>>({});

  const publish = (id: string, name: string) => {
    if (!scores[id]) {
      toast.error(`Enter a score for ${name}`);
      return;
    }
    setPublished({ ...published, [id]: true });
    toast.success(`Published ${scores[id]}/100 for ${name}`);
  };

  const publishAll = () => {
    const ready = students.filter((s) => scores[s.id] && !published[s.id]);
    if (ready.length === 0) {
      toast.info("No new scores to publish");
      return;
    }
    const map = { ...published };
    ready.forEach((s) => (map[s.id] = true));
    setPublished(map);
    toast.success(`Published ${ready.length} grades`);
  };

  return (
    <div>
      <PageHeader
        title="Grading Workbench"
        subtitle="Score quizzes, essays and assignments — auto-publishes to students & parents."
        actions={
          <Button onClick={publishAll}>
            <Send className="h-4 w-4" />
            Publish All
          </Button>
        }
      />
      <Section title="Physics Mid-Term Â· PHY-12 Â· 42 submissions">
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Student" },
            { key: "grade", label: "Grade" },
            { key: "score" as any, label: "Score" },
            { key: "action" as any, label: "" },
          ]}
          rows={students.map((s) => ({ ...s, score: "", action: "" }))}
          renderCell={(row, key) => {
            if (key === "score")
              return (
                <input
                  value={scores[row.id] ?? ""}
                  onChange={(e) =>
                    setScores({ ...scores, [row.id]: e.target.value })
                  }
                  placeholder="—/100"
                  className="h-8 w-20 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  disabled={published[row.id]}
                />
              );
            if (key === "action")
              return published[row.id] ? (
                <span className="text-xs text-success font-medium">â— Published</span>
              ) : (
                <button
                  onClick={() => publish(row.id, row.name)}
                  className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
                >
                  Publish
                </button>
              );
            if (key === "name") return <span className="font-medium">{row.name}</span>;
            return String(row[key]);
          }}
        />
      </Section>
    </div>
  );
}
