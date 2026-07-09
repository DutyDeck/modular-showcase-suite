/**
 * White-label brand colour helpers. A licensed institute picks a single brand
 * colour and a gradient theme; from those we derive the handful of theme CSS
 * variables the app themes off (`--primary` and friends, plus the brand
 * gradients) and apply them at the document root — so the whole UI recolours to
 * the client's identity while the neutral 1StudentID theme stays the default.
 */

/** The CSS variables a brand colour overrides. Cleared to fall back to default. */
const BRAND_VARS = [
  "--primary",
  "--primary-foreground",
  "--primary-glow",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
  "--gradient-brand",
  "--gradient-hero",
] as const;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function hexToRgb(hex: string): Rgb | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const toHex = ({ r, g, b }: Rgb) =>
  "#" + [r, g, b].map((x) => clampByte(x).toString(16).padStart(2, "0")).join("");

/** Blend `hex` toward `target` by `amt` (0–1). */
function mix(hex: string, target: Rgb, amt: number): string {
  const c = hexToRgb(hex);
  if (!c) return hex;
  return toHex({
    r: c.r + (target.r - c.r) * amt,
    g: c.g + (target.g - c.g) * amt,
    b: c.b + (target.b - c.b) * amt,
  });
}

export const lighten = (hex: string, amt: number) => mix(hex, { r: 255, g: 255, b: 255 }, amt);
export const darken = (hex: string, amt: number) => mix(hex, { r: 0, g: 0, b: 0 }, amt);

/* ── HSL for hue-relative theme companions ─────────────────────────────────── */

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return toHex({ r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 });
}

/** Rotate the hue of `hex` by `deg`, keeping saturation/lightness. */
function rotate(hex: string, deg: number): string {
  const c = hexToRgb(hex);
  if (!c) return hex;
  const hsl = rgbToHsl(c);
  return hslToHex({ ...hsl, h: hsl.h + deg });
}

/** Relative luminance (0 dark – 1 light), for picking a readable foreground. */
export function luminance(hex: string): number {
  const c = hexToRgb(hex);
  if (!c) return 0;
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/** A readable text colour to sit on top of `hex`. */
export const readableOn = (hex: string) => (luminance(hex) > 0.5 ? "#0b1220" : "#ffffff");

/* ── Gradient themes ───────────────────────────────────────────────────────
 * Each theme is a *recipe* applied to the chosen brand colour — it stays in the
 * institute's colour family (hue-relative companions) so any brand colour gets a
 * tasteful, on-brand treatment. */
export type BrandTheme = "solid" | "aura" | "nebula" | "aurora" | "dusk";

export const BRAND_THEMES: { id: BrandTheme; name: string; hint: string }[] = [
  { id: "solid", name: "Solid", hint: "Clean, single-hue" },
  { id: "aura", name: "Aura", hint: "Soft same-hue glow" },
  { id: "nebula", name: "Nebula", hint: "Cosmic multi-hue" },
  { id: "aurora", name: "Aurora", hint: "Shimmering sweep" },
  { id: "dusk", name: "Dusk", hint: "Deep & moody" },
];

interface Gradients {
  brand: string;
  hero: string;
  glow: string;
}

export function themeGradients(hex: string, theme: BrandTheme): Gradients {
  switch (theme) {
    case "aura": {
      const glow = lighten(hex, 0.3);
      return {
        brand: `linear-gradient(135deg, ${darken(hex, 0.05)}, ${lighten(hex, 0.28)})`,
        hero: `radial-gradient(130% 130% at 15% 15%, ${lighten(hex, 0.28)} 0%, ${hex} 45%, ${darken(hex, 0.2)} 100%)`,
        glow,
      };
    }
    case "nebula": {
      const c1 = darken(rotate(hex, -45), 0.1);
      const c3 = lighten(rotate(hex, 55), 0.12);
      return {
        brand: `linear-gradient(135deg, ${hex}, ${c3})`,
        hero: `linear-gradient(135deg, ${c1} 0%, ${hex} 50%, ${c3} 100%)`,
        glow: c3,
      };
    }
    case "aurora": {
      const c1 = darken(rotate(hex, 28), 0.05);
      const c3 = lighten(rotate(hex, 72), 0.1);
      return {
        brand: `linear-gradient(120deg, ${hex}, ${c3})`,
        hero: `linear-gradient(120deg, ${c1} 0%, ${hex} 45%, ${c3} 100%)`,
        glow: lighten(c3, 0.1),
      };
    }
    case "dusk": {
      const c3 = darken(rotate(hex, -28), 0.12);
      return {
        brand: `linear-gradient(160deg, ${darken(hex, 0.15)}, ${hex})`,
        hero: `linear-gradient(160deg, ${darken(hex, 0.3)} 0%, ${hex} 55%, ${c3} 100%)`,
        glow: lighten(hex, 0.12),
      };
    }
    case "solid":
    default:
      return {
        brand: `linear-gradient(135deg, ${hex}, ${lighten(hex, 0.18)})`,
        hero: `linear-gradient(135deg, ${darken(hex, 0.08)} 0%, ${hex} 50%, ${lighten(hex, 0.2)} 100%)`,
        glow: lighten(hex, 0.18),
      };
  }
}

/** The theme variable overrides derived from a brand colour + gradient theme. */
export function brandVars(hex: string, theme: BrandTheme = "solid"): Record<string, string> {
  const fg = readableOn(hex);
  const g = themeGradients(hex, theme);
  return {
    "--primary": hex,
    "--primary-foreground": fg,
    "--primary-glow": g.glow,
    "--ring": hex,
    "--sidebar-primary": hex,
    "--sidebar-primary-foreground": fg,
    "--sidebar-ring": hex,
    "--gradient-brand": g.brand,
    "--gradient-hero": g.hero,
  };
}

export function applyBrandColor(el: HTMLElement, hex: string, theme: BrandTheme = "solid"): void {
  if (!hexToRgb(hex)) return;
  const vars = brandVars(hex, theme);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}

export function clearBrandColor(el: HTMLElement): void {
  for (const v of BRAND_VARS) el.style.removeProperty(v);
}
