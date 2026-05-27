import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, DataTable, Badge } from "@/components/ui-kit";
import { students } from "@/lib/mockData";
import { Plus, Download, Filter } from "lucide-react";

export const Route = createFileRoute("/app/students")({
  head: () => ({ meta: [{ title: "Students — GlobalEdu" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  return (
    <div>
      <PageHeader
        title="Student Information System"
        subtitle="Unified student profiles, academic history, and wellness tracking."
        actions={
          <>
            <button className="h-9 px-3 rounded-md border text-sm flex items-center gap-2 hover:bg-muted"><Filter className="h-4 w-4" />Filter</button>
            <button className="h-9 px-3 rounded-md border text-sm flex items-center gap-2 hover:bg-muted"><Download className="h-4 w-4" />Export</button>
            <button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2"><Plus className="h-4 w-4" />New Student</button>
          </>
        }
      />
      <Section>
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "grade", label: "Grade" },
            { key: "batch", label: "Batch" },
            { key: "attendance", label: "Attendance" },
            { key: "gpa", label: "GPA" },
            { key: "parent", label: "Parent" },
            { key: "status", label: "Status" },
          ]}
          rows={students}
          renderCell={(row, key) => {
            if (key === "name") return (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-brand text-white flex items-center justify-center text-[10px] font-semibold">
                  {row.name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                </div>
                <span className="font-medium">{row.name}</span>
              </div>
            );
            if (key === "attendance") return <span className={row.attendance < 75 ? "text-destructive font-medium" : ""}>{row.attendance}%</span>;
            if (key === "status") return <Badge tone={row.status === "Active" ? "success" : "destructive"}>{row.status}</Badge>;
            return String(row[key]);
          }}
        />
      </Section>
    </div>
  );
}
