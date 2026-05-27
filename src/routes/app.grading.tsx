import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Badge, DataTable } from "@/components/ui-kit";
import { students } from "@/lib/mockData";
import { useState } from "react";

export const Route = createFileRoute("/app/grading")({
  head: () => ({ meta: [{ title: "Grading — GlobalEdu" }] }),
  component: GradingPage,
});

function GradingPage() {
  const [scores, setScores] = useState<Record<string, string>>({});
  return (
    <div>
      <PageHeader title="Grading Workbench" subtitle="Score quizzes, essays and assignments — auto-publishes to students & parents." />
      <Section title="Physics Mid-Term · PHY-12 · 42 submissions">
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Student" },
            { key: "grade", label: "Grade" },
            { key: "score" as any, label: "Score" },
            { key: "action" as any, label: "" },
          ]}
          rows={students.map(s => ({ ...s, score: "", action: "" }))}
          renderCell={(row, key) => {
            if (key === "score") return (
              <input
                value={scores[row.id] ?? ""}
                onChange={(e) => setScores({ ...scores, [row.id]: e.target.value })}
                placeholder="—/100"
                className="h-8 w-20 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            );
            if (key === "action") return (
              <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground">Publish</button>
            );
            if (key === "name") return <span className="font-medium">{row.name}</span>;
            return String(row[key]);
          }}
        />
      </Section>
    </div>
  );
}
