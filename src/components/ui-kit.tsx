import { useState, type ReactNode, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "success" | "warning" | "info" | "destructive";
}) {
  const accents: Record<string, string> = {
    primary: "from-primary/10 to-primary/0 text-primary",
    success: "from-success/15 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-warning-foreground",
    info: "from-info/15 to-info/0 text-info",
    destructive: "from-destructive/15 to-destructive/0 text-destructive",
  };
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-soft relative overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none",
          accents[accent],
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {label}
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1">{value}</div>
          {hint && <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        {icon && (
          <div className={cn("p-2 rounded-lg bg-background/70 shrink-0", accents[accent])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-soft", className)}>
      {(title || actions) && (
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b">
          <div className="min-w-0">
            {title && <h3 className="font-semibold text-sm">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "destructive" | "info" | "muted";
}) {
  const tones: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  renderCell,
  emptyText = "No records",
  anchor,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: T[];
  renderCell?: (row: any, key: string) => ReactNode;
  emptyText?: string;
  /** Optional data-tour anchor for the guided demo. */
  anchor?: string;
}) {
  const render = (row: any, key: string) =>
    renderCell ? renderCell(row, key) : String(row[key] ?? "");

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="md:hidden -mx-4 sm:-mx-5 divide-y">
        {rows.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">{emptyText}</div>
        )}
        {rows.map((row, i) => {
          const primary = columns.find((c) => !c.key.startsWith("_")) ?? columns[0];
          const rest = columns.filter((c) => c.key !== primary.key && c.key !== "_actions");
          const actions = columns.find((c) => c.key === "_actions");
          return (
            <div key={i} className="px-4 sm:px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium min-w-0">{render(row, primary.key)}</div>
                {actions && <div className="shrink-0">{render(row, "_actions")}</div>}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                {rest.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {c.label}
                    </dt>
                    <dd className="truncate">{render(row, c.key)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>

      {/* Desktop: traditional table */}
      <div className="hidden md:block overflow-x-auto -mx-4 sm:-mx-5" data-tour={anchor}>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 sm:px-5 py-2 font-medium", c.className)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyText}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 sm:px-5 py-3 align-middle", c.className)}>
                    {render(row, c.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function MiniBars({
  data,
  max = 100,
}: {
  data: { label: string; value: number }[];
  max?: number;
}) {
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full bg-muted rounded-md relative h-full flex items-end">
            <div
              className="w-full rounded-md bg-gradient-brand transition-all"
              style={{ height: `${(d.value / max) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Buttons & form controls ---------- */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md";

const buttonStyles: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border bg-background hover:bg-muted",
  ghost: "hover:bg-muted text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};
const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        buttonStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <div className="text-xs font-medium text-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </div>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </label>
  );
}

const inputClass =
  "w-full h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" {...props} className={cn(inputClass, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={cn(inputClass, "h-auto py-2 min-h-[80px]", props.className)} />
  );
}

export function Select({
  options,
  ...rest
}: {
  options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(inputClass, "pr-8", rest.className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ---------- FormDialog ---------- */

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  submitVariant = "primary",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitVariant?: Variant;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(e);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant={submitVariant}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- useDisclosure helper ---------- */

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    setOpen,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
  };
}
