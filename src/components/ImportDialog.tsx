import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui-kit";
import { UploadCloud, FileText, Download, AlertCircle, CheckCircle2, X } from "lucide-react";

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  sample?: string;
}

interface Row {
  data: Record<string, string>;
  ok: boolean;
  errors: string[];
}

export interface ImportDialogProps<T> {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  entityLabel: string; // e.g. "students"
  fields: ImportField[];
  transform: (row: Record<string, string>) => T;
  onCommit: (items: T[]) => void;
  templateName?: string;
}

/* ---------- CSV parser (RFC 4180-ish, minimal but handles quotes) ---------- */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else {
        cell += c;
      }
      continue;
    }
    if (c === '"') {
      inQ = true;
      continue;
    }
    if (c === ",") {
      cur.push(cell);
      cell = "";
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      cur.push(cell);
      out.push(cur);
      cur = [];
      cell = "";
      continue;
    }
    cell += c;
  }
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell);
    out.push(cur);
  }
  return out.filter((r) => r.some((v) => v.trim() !== ""));
}

export function ImportDialog<T>({
  open,
  onOpenChange,
  title,
  entityLabel,
  fields,
  transform,
  onCommit,
  templateName,
}: ImportDialogProps<T>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const buildRows = (matrix: string[][]) => {
    if (matrix.length === 0) {
      toast.error("File appears empty");
      return;
    }
    const hdrs = matrix[0].map((h) => h.trim().toLowerCase());
    setHeaders(hdrs);
    const reqs = fields.filter((f) => f.required).map((f) => f.key.toLowerCase());
    const missingHdr = reqs.filter((k) => !hdrs.includes(k));
    if (missingHdr.length) {
      toast.error(`Missing required column(s): ${missingHdr.join(", ")}`);
    }
    const parsed: Row[] = matrix.slice(1).map((cells) => {
      const data: Record<string, string> = {};
      hdrs.forEach((h, i) => {
        data[h] = (cells[i] ?? "").trim();
      });
      const errs: string[] = [];
      for (const f of fields) {
        if (f.required && !data[f.key.toLowerCase()]) {
          errs.push(`${f.label} missing`);
        }
      }
      return { data, ok: errs.length === 0, errors: errs };
    });
    setRows(parsed);
  };

  const onPickFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      buildRows(parseCsv(text));
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPickFile(f);
  };

  const downloadTemplate = () => {
    const header = fields.map((f) => f.key).join(",");
    const sample = fields
      .map((f) => `"${(f.sample ?? "").replace(/"/g, '""')}"`)
      .join(",");
    const blob = new Blob([`${header}\n${sample}\n`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = templateName ?? `${entityLabel}-template.csv`;
    a.click();
    toast.success("Template downloaded");
  };

  const okCount = useMemo(() => rows.filter((r) => r.ok).length, [rows]);
  const errCount = rows.length - okCount;

  const submit = () => {
    const items = rows.filter((r) => r.ok).map((r) => transform(r.data));
    if (items.length === 0) {
      toast.error("Nothing to import");
      return;
    }
    onCommit(items);
    toast.success(`Imported ${items.length} ${entityLabel}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Migrate from your existing LMS. Upload a CSV with the columns shown below — most
            systems (Moodle, Canvas, Blackboard, Google Classroom) can export to CSV directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Required schema */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expected columns
              </div>
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
                Download template
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fields.map((f) => (
                <code
                  key={f.key}
                  className={`text-[11px] px-2 py-0.5 rounded-md ${
                    f.required
                      ? "bg-primary/10 text-primary"
                      : "bg-background border"
                  }`}
                  title={f.required ? "Required" : "Optional"}
                >
                  {f.key}
                  {f.required && <span className="opacity-70">*</span>}
                </code>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          {rows.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <div className="text-sm font-medium">
                Drop a CSV file here, or click to browse
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                UTF-8 encoded · first row treated as headers
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate font-medium">{fileName}</span>
                  <button
                    type="button"
                    onClick={reset}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                    title="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {okCount} ready
                  </span>
                  {errCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errCount} skipped
                    </span>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg border max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium w-10">#</th>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                      <th className="px-2 py-1.5 text-left font-medium w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                        {headers.map((h) => (
                          <td key={h} className="px-2 py-1.5 whitespace-nowrap">
                            {r.data[h] ?? ""}
                          </td>
                        ))}
                        <td className="px-2 py-1.5">
                          {r.ok ? (
                            <span className="text-success">OK</span>
                          ) : (
                            <span
                              className="text-destructive"
                              title={r.errors.join(", ")}
                            >
                              {r.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && (
                  <div className="px-2 py-1.5 text-[11px] text-muted-foreground bg-muted/30 border-t">
                    Showing first 50 of {rows.length} rows.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={okCount === 0}
          >
            Import {okCount > 0 ? okCount : ""} {entityLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
