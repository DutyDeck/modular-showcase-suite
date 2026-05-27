import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, DataTable, Badge } from "@/components/ui-kit";
import { assignments } from "@/lib/mockData";

export const Route = createFileRoute("/app/assignments")({
  head: () => ({ meta: [{ title: "Assignments — GlobalEdu" }] }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  return (
    <div>
      <PageHeader title="Assignments" subtitle="Track your submissions, deadlines and grades." />
      <Section>
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "title", label: "Title" },
            { key: "course", label: "Course" },
            { key: "due", label: "Due" },
            { key: "score", label: "Score" },
            { key: "status", label: "Status" },
          ]}
          rows={assignments}
          renderCell={(row, key) => {
            if (key === "status") {
              const tone = row.status === "Pending" ? "warning" : row.status === "Graded" ? "success" : "info";
              return <Badge tone={tone}>{row.status}</Badge>;
            }
            if (key === "score") return row.score === null ? "—" : `${row.score}/100`;
            return String(row[key]);
          }}
        />
      </Section>
    </div>
  );
}
