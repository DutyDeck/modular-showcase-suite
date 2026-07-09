import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Button, Field, TextInput, Badge } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useCollection, addItem, updateItem, removeItem } from "@/lib/store";
import { brandingKey, PLATFORM_LANDING_KEY, type InstituteBranding } from "@/lib/mockData";
import {
  brandVars,
  readableOn,
  themeGradients,
  BRAND_THEMES,
  type BrandTheme,
} from "@/lib/branding";
import { Palette, Upload, RotateCcw, Save, Sparkles, Lock, ImageOff, Globe2 } from "lucide-react";

export const Route = createFileRoute("/app/branding")({
  head: () => ({ meta: [{ title: "Branding — 1StudentID" }] }),
  component: BrandingPage,
});

const taClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y min-h-[72px]";

function BrandingPage() {
  const { user } = useAuth();
  const brandings = useCollection("institutionBrandings");
  const isAdmin = user?.role === "admin";
  // The global admin edits the shared landing / login page; institute admins
  // edit their own tenant's in-app branding.
  const isLanding = user?.adminScope === "global";
  const key = isLanding ? PLATFORM_LANDING_KEY : brandingKey(user);
  const existing = brandings.find((b) => b.institution === key);

  const [form, setForm] = useState({
    name:
      existing?.name ??
      (isLanding ? "1StudentID" : (user?.institutionName ?? user?.institution ?? "")),
    tagline: existing?.tagline ?? "",
    brandColor: existing?.brandColor ?? "#4f46e5",
    theme: (existing?.brandTheme ?? "solid") as BrandTheme,
    logoDataUrl: existing?.logoDataUrl ?? "",
    vision: existing?.vision ?? "",
    mission: existing?.mission ?? "",
    description: existing?.description ?? "",
    showHeadline: existing?.showHeadline ?? false,
    showCustomHeadline: existing?.showCustomHeadline ?? false,
    headline: existing?.headline ?? "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Branding" subtitle="White-label your institute's workspace." />
        <div className="rounded-xl border bg-card p-8 text-center max-w-md mx-auto shadow-soft">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="font-semibold">Admins only</div>
          <p className="text-sm text-muted-foreground mt-1">
            Branding is configured by your institute's administrator.
          </p>
        </div>
      </div>
    );
  }

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (PNG or SVG works best).");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Logo must be under 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set({ logoDataUrl: String(reader.result) });
    reader.onerror = () => toast.error("Could not read that image.");
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const rec: InstituteBranding = {
      institution: key,
      name: form.name.trim(),
      tagline: form.tagline.trim() || undefined,
      brandColor: form.brandColor || undefined,
      brandTheme: form.theme,
      logoDataUrl: form.logoDataUrl || undefined,
      vision: form.vision.trim() || undefined,
      mission: form.mission.trim() || undefined,
      description: form.description.trim() || undefined,
      showHeadline: isLanding ? form.showHeadline : undefined,
      showCustomHeadline: isLanding ? form.showCustomHeadline : undefined,
      headline: isLanding ? form.headline.trim() || undefined : undefined,
      updatedBy: user?.name ?? "Admin",
      updatedAt: new Date().toISOString(),
    };
    if (existing) updateItem("institutionBrandings", (b) => b.institution === key, rec);
    else addItem("institutionBrandings", rec);
    toast.success(
      isLanding
        ? "Landing page updated — your changes are live on the sign-in screen."
        : "Branding saved — your whole workspace is now on-brand.",
    );
  };

  const reset = () => {
    if (existing) removeItem("institutionBrandings", (b) => b.institution === key);
    set({
      tagline: "",
      brandColor: "#4f46e5",
      theme: "solid",
      logoDataUrl: "",
      vision: "",
      mission: "",
      description: "",
      showHeadline: false,
      showCustomHeadline: false,
      headline: "",
    });
    toast.success("Reverted to the default 1StudentID look.");
  };

  const vars = brandVars(form.brandColor, form.theme) as React.CSSProperties;
  const onColor = readableOn(form.brandColor);

  return (
    <div>
      <PageHeader
        title={isLanding ? "Landing & platform branding" : "Branding & white-label"}
        subtitle={
          isLanding
            ? "Control the public sign-in / landing page — logo, headline, colours and your platform story."
            : "Make 1StudentID feel like your own product — your logo, colours, and story across the whole app."
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset to default</span>
            </Button>
            <Button onClick={save}>
              <Save className="h-4 w-4" />
              {isLanding ? "Publish" : "Save branding"}
            </Button>
          </div>
        }
      />

      <div className="mb-5 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">
        {isLanding ? <Globe2 className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
        {isLanding
          ? "Global admin · public landing page"
          : "Enterprise · White-label Branding license"}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* ── Editor ── */}
        <div className="lg:col-span-3 space-y-5">
          <Section title="Identity" description="Your logo, display name and tagline.">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="h-20 w-20 rounded-xl border bg-muted/40 overflow-hidden flex items-center justify-center">
                  {form.logoDataUrl ? (
                    <img
                      src={form.logoDataUrl}
                      alt="Logo preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageOff className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <label className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary cursor-pointer hover:underline">
                  <Upload className="h-3.5 w-3.5" />
                  Upload logo
                  <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
                </label>
                {form.logoDataUrl && (
                  <button
                    onClick={() => set({ logoDataUrl: "" })}
                    className="mt-1 block text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex-1 grid gap-3">
                <Field label={isLanding ? "Product / platform name" : "Institute name"} required>
                  <TextInput
                    value={form.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder={isLanding ? "e.g. 1StudentID" : "e.g. Royal Vista College"}
                  />
                </Field>
                <Field label="Tagline" hint="A short line shown under your name.">
                  <TextInput
                    value={form.tagline}
                    onChange={(e) => set({ tagline: e.target.value })}
                    placeholder="e.g. Excellence · Integrity · Community"
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section
            title="Brand colour & theme"
            description="One colour, five on-brand gradient treatments — used for buttons, highlights and hero backgrounds."
          >
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="color"
                value={form.brandColor}
                onChange={(e) => set({ brandColor: e.target.value })}
                aria-label="Brand colour"
                className="h-11 w-14 rounded-md border bg-background p-1 cursor-pointer"
              />
              <TextInput
                value={form.brandColor}
                onChange={(e) => set({ brandColor: e.target.value })}
                className="w-36 font-mono"
              />
              <div className="flex items-center gap-1.5">
                {["#047857", "#1d4ed8", "#7c3aed", "#be123c", "#b45309", "#0f766e"].map((c) => (
                  <button
                    key={c}
                    onClick={() => set({ brandColor: c })}
                    aria-label={`Use ${c}`}
                    className="h-7 w-7 rounded-full ring-1 ring-black/10"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {BRAND_THEMES.map((th) => {
                const on = form.theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => set({ theme: th.id })}
                    className={`rounded-lg border overflow-hidden text-left transition-all ${
                      on ? "ring-2 ring-primary border-primary" : "hover:border-primary/40"
                    }`}
                  >
                    <span
                      className="block h-12 w-full"
                      style={{ backgroundImage: themeGradients(form.brandColor, th.id).hero }}
                    />
                    <span className="block px-2 py-1.5">
                      <span className="block text-xs font-semibold">{th.name}</span>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {th.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          {isLanding && (
            <Section
              title="Landing page headline"
              description="Choose which hero headline visitors see on the public sign-in screen."
            >
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.showHeadline}
                    onChange={(e) => set({ showHeadline: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Show the 1StudentID headline</span>
                    <span className="block text-xs text-muted-foreground">
                      The default “One identity. Every classroom.” statement. Turn off for early
                      prototype demos until the product messaging is final.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.showCustomHeadline}
                    onChange={(e) => set({ showCustomHeadline: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Show a custom headline</span>
                    <span className="block text-xs text-muted-foreground">
                      Your own institutional headline instead — so the hero never looks empty.
                    </span>
                  </span>
                </label>

                {form.showCustomHeadline && (
                  <Field
                    label="Custom headline"
                    hint="Each line break becomes a new line in the hero."
                  >
                    <textarea
                      value={form.headline}
                      onChange={(e) => set({ headline: e.target.value })}
                      className={taClass}
                      placeholder={"e.g. Royal Vista College\nLearning without limits."}
                    />
                  </Field>
                )}
              </div>
            </Section>
          )}

          <Section
            title="Vision, mission & about"
            description={
              isLanding
                ? "Your platform story, shown on the landing page."
                : "Your institute's story, shown to your community."
            }
          >
            <div className="space-y-3">
              <Field label="Vision">
                <textarea
                  value={form.vision}
                  onChange={(e) => set({ vision: e.target.value })}
                  className={taClass}
                  placeholder="Where you're headed…"
                />
              </Field>
              <Field label="Mission">
                <textarea
                  value={form.mission}
                  onChange={(e) => set({ mission: e.target.value })}
                  className={taClass}
                  placeholder="How you get there…"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  className={taClass}
                  placeholder="A short paragraph…"
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* ── Live preview ── */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-20 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Palette className="h-3.5 w-3.5" />
              Live preview
            </div>
            <div className="rounded-2xl border bg-card overflow-hidden shadow-soft" style={vars}>
              {/* mini hero */}
              <div className="p-4 text-white" style={{ backgroundImage: "var(--gradient-hero)" }}>
                <div className="flex items-center gap-2.5">
                  <span className="h-10 w-10 rounded-lg bg-white/90 overflow-hidden flex items-center justify-center shrink-0">
                    {form.logoDataUrl ? (
                      <img src={form.logoDataUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-sm font-bold" style={{ color: form.brandColor }}>
                        {form.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase())
                          .join("")}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{form.name || "Your institute"}</div>
                    {form.tagline && (
                      <div className="text-[11px] opacity-90 truncate">{form.tagline}</div>
                    )}
                  </div>
                </div>
                {isLanding && form.showHeadline && (
                  <div className="mt-3 text-lg font-bold leading-tight">
                    One identity.
                    <br />
                    Every classroom.
                  </div>
                )}
                {isLanding && form.showCustomHeadline && form.headline && (
                  <div className="mt-3 text-lg font-bold leading-tight whitespace-pre-line">
                    {form.headline}
                  </div>
                )}
              </div>
              {/* mini body */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded-md text-sm font-medium"
                    style={{ background: form.brandColor, color: onColor }}
                  >
                    Primary action
                  </button>
                  <Badge tone="default">Accent</Badge>
                </div>
                <div className="h-2 rounded-full" style={{ background: "var(--gradient-brand)" }} />
                {form.vision && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Vision
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{form.vision}</p>
                  </div>
                )}
                {form.mission && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Mission
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{form.mission}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground pt-1">
                  Powered by <span className="font-semibold">1StudentID</span>
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isLanding
                ? "Publishing applies these to the public sign-in page for everyone."
                : "Saving applies these across the sidebar, buttons and highlights for everyone at your institute. Other tenants keep the default look."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
