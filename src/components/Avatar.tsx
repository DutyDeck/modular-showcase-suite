import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
  /** Explicit photo URL. If omitted, a deterministic professional portrait
   *  is chosen from a curated pool based on the seed (or name if no seed). */
  src?: string | null;
  /** Stable unique identifier (e.g. student id or email) used as the hash
   *  seed so the same person always shows the same face — even if multiple
   *  people share a first name. Falls back to `name` when omitted. */
  seed?: string;
  /** Optional override gradient for the initials-fallback layer. */
  tone?: "auto" | "brand";
  shape?: "circle" | "square";
}

const PALETTE: Array<{ from: string; to: string }> = [
  { from: "#4f46e5", to: "#7c3aed" },
  { from: "#0284c7", to: "#4f46e5" },
  { from: "#0891b2", to: "#0284c7" },
  { from: "#059669", to: "#0891b2" },
  { from: "#7c3aed", to: "#db2777" },
  { from: "#db2777", to: "#e11d48" },
  { from: "#d97706", to: "#dc2626" },
  { from: "#475569", to: "#1e293b" },
];

// Curated professional headshots from randomuser.me — stable URLs, no API key.
// Pool size kept generous (80) to keep birthday-paradox collisions rare for
// rosters in the low hundreds.
const PORTRAITS: string[] = (() => {
  const men = [
    3, 5, 8, 12, 15, 18, 21, 24, 27, 30, 32, 36, 39, 42, 45, 48, 51, 53, 56,
    59, 62, 65, 68, 71, 74, 76, 79, 82, 85, 89, 91, 94, 96, 99,
  ];
  const women = [
    1, 4, 7, 8, 11, 14, 15, 18, 21, 23, 25, 28, 33, 36, 39, 42, 44, 47, 50,
    52, 55, 58, 62, 65, 68, 71, 74, 77, 79, 82, 85, 88, 92, 95, 97,
  ];
  return [
    ...men.map((n) => `https://randomuser.me/api/portraits/men/${n}.jpg`),
    ...women.map((n) => `https://randomuser.me/api/portraits/women/${n}.jpg`),
  ];
})();

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const skip = new Set(["dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "prof", "prof."]);
  const meaningful = parts.filter((p) => !skip.has(p.toLowerCase()));
  const pool = meaningful.length ? meaningful : parts;
  if (pool.length === 1) return pool[0].slice(0, 2).toUpperCase();
  return (pool[0][0] + pool[pool.length - 1][0]).toUpperCase();
}

export function portraitFor(key: string): string {
  return PORTRAITS[hash(key) % PORTRAITS.length];
}

export function Avatar({
  name,
  size = 40,
  className,
  src,
  seed,
  tone = "auto",
  shape = "circle",
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const hashKey = seed ?? name;
  const photo = src === undefined ? portraitFor(hashKey) : src;
  const showPhoto = !!photo && !imgError;

  const c =
    tone === "brand"
      ? { from: "var(--primary)", to: "var(--primary-glow)" }
      : PALETTE[hash(hashKey) % PALETTE.length];

  return (
    <span
      aria-label={name}
      title={name}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden font-semibold text-white tracking-tight select-none shrink-0",
        shape === "circle" ? "rounded-full" : "rounded-2xl",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.4)),
        backgroundImage: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
    >
      {showPhoto && (
        <img
          src={photo}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* initials always rendered underneath as a graceful fallback */}
      {!showPhoto && <span className="relative">{initials(name)}</span>}
    </span>
  );
}
