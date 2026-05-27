import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Badge } from "@/components/ui-kit";
import { marketplaceCourses } from "@/lib/mockData";
import { Star, Users, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — GlobalEdu" }] }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const [q, setQ] = useState("");
  const list = marketplaceCourses.filter(c => c.title.toLowerCase().includes(q.toLowerCase()) || c.category.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-6">
      <PageHeader title="Global Learning Marketplace" subtitle="Discover courses from institutions worldwide. Rate. Subscribe. Learn." />
      <div className="rounded-2xl bg-gradient-hero text-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white, transparent 40%)" }} />
        <div className="relative max-w-2xl">
          <h2 className="text-2xl font-bold">Find your next course</h2>
          <p className="opacity-85 text-sm mt-1">12,400+ courses · 1,800+ verified institutions · 95 countries.</p>
          <div className="mt-4 flex items-center gap-2 bg-white text-foreground rounded-lg p-1">
            <Search className="h-4 w-4 ml-3 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, providers, categories…" className="flex-1 h-10 bg-transparent outline-none text-sm" />
            <button className="bg-primary text-primary-foreground h-9 px-4 rounded-md text-sm font-medium">Search</button>
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((c) => (
          <article key={c.id} className="rounded-xl border bg-card overflow-hidden shadow-soft hover:shadow-elegant hover:-translate-y-0.5 transition-all">
            <div className="h-32 bg-gradient-brand relative">
              {c.tag && <div className="absolute top-3 left-3"><Badge tone="warning">{c.tag}</Badge></div>}
              <div className="absolute bottom-3 left-4 text-white text-xs opacity-90">{c.category}</div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold">{c.title}</h3>
              <div className="text-xs text-muted-foreground mt-0.5">{c.provider}</div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1 text-warning"><Star className="h-3 w-3 fill-current" />{c.rating}</span>
                <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" />{c.students.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div className="text-lg font-bold">${c.price}</div>
                <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium">Enroll</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
