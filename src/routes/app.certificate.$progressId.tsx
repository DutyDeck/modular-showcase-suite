import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui-kit";
import { useCollection } from "@/lib/store";
import { awardById, type SwimAward } from "@/lib/mockData";
import { TONE } from "./app.awards";
import { Award, Printer, ArrowLeft, Waves } from "lucide-react";

export const Route = createFileRoute("/app/certificate/$progressId")({
  head: () => ({ meta: [{ title: "Certificate — 1StudentID" }] }),
  component: CertificatePage,
});

function CertificatePage() {
  const { progressId } = useParams({ from: "/app/certificate/$progressId" });
  const navigate = useNavigate();
  const progressRows = useCollection("awardProgress");
  const awards = useCollection("swimAwards");

  const progress = progressRows.find((p) => p.id === progressId);
  const award: SwimAward | undefined = progress
    ? (awardById[progress.awardId] ?? awards.find((a) => a.id === progress.awardId))
    : undefined;

  if (!progress || !award) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-sm text-muted-foreground">Certificate not found.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate({ to: "/app/awards" })}>
          <ArrowLeft className="h-4 w-4" />
          Back to awards
        </Button>
      </div>
    );
  }

  const tone = TONE[award.tone] ?? TONE.sky;
  const earned = !!progress.certifiedAt;
  const dateLabel = progress.certifiedAt
    ? new Date(progress.certifiedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-4">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>

      <div className="no-print flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/app/awards" })}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </Button>
      </div>

      {!earned && (
        <div className="no-print rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-xs">
          This award isn’t complete yet — the certificate below is a preview.
        </div>
      )}

      {/* Certificate */}
      <div
        className="mx-auto max-w-3xl rounded-2xl border-2 border-border bg-card shadow-elegant overflow-hidden"
        data-tour="certificate"
      >
        <div className={`h-2 bg-gradient-to-r ${tone.grad}`} />
        <div className="p-8 sm:p-10 text-center relative">
          <div
            className={`mx-auto h-20 w-20 rounded-full bg-gradient-to-br ${tone.grad} flex items-center justify-center shadow-lg`}
          >
            <Award className="h-10 w-10 text-white" />
          </div>

          <div
            className={`mt-4 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${tone.chip}`}
          >
            {award.strand} · {award.name}
          </div>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-primary">Well done!</h1>
          <p className="mt-1 text-sm text-muted-foreground">This certificate is awarded to</p>

          <div className="mt-2 text-2xl font-bold border-b-2 border-dashed border-border inline-block px-6 pb-1">
            {progress.studentName}
          </div>

          {award.awardedText && (
            <div className="mt-6 mx-auto max-w-md rounded-xl bg-muted/50 px-4 py-3 text-sm">
              <span className="font-bold text-primary">WOW! </span>
              {award.awardedText}
            </div>
          )}

          {award.readyFor && (
            <p className="mt-4 text-sm">
              You’re now ready for <span className="font-semibold">{award.readyFor}</span>.
            </p>
          )}

          <div className="mt-8 flex items-end justify-between gap-6 text-left">
            <div>
              <div className="text-sm font-[cursive] italic text-foreground/80">
                {progress.certifiedBy ?? "—"}
              </div>
              <div className="border-t border-border mt-1 pt-1 text-[11px] text-muted-foreground">
                Examiner
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600">
              <Waves className="h-4 w-4" />
              Royal Vista Aquatics
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{dateLabel}</div>
              <div className="border-t border-border mt-1 pt-1 text-[11px] text-muted-foreground">
                Date
              </div>
            </div>
          </div>
        </div>

        {/* Back of certificate — the criteria that were completed */}
        <div className="border-t bg-muted/30 px-8 sm:px-10 py-6">
          <div className="text-sm font-semibold">
            By completing this award {progress.studentName.split(" ")[0]} can:
          </div>
          <ol className="mt-3 grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            {award.activities.map((act, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-primary">{i + 1}.</span>
                <span>{act}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
