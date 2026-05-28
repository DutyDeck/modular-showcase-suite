import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
  /** Explicit photo URL. If omitted, a deterministic professional portrait
   *  is chosen from a curated pool based on the name. */
  src?: string | null;
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
const PORTRAITS = [
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/45.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/65.jpg",
  "https://randomuser.me/api/portraits/women/25.jpg",
  "https://randomuser.me/api/portraits/men/12.jpg",
  "https://randomuser.me/api/portraits/women/8.jpg",
  "https://randomuser.me/api/portraits/men/27.jpg",
  "https://randomuser.me/api/portraits/women/15.jpg",
  "https://randomuser.me/api/portraits/men/53.jpg",
  "https://randomuser.me/api/portraits/women/33.jpg",
  "https://randomuser.me/api/portraits/men/76.jpg",
  "https://randomuser.me/api/portraits/women/52.jpg",
  "https://randomuser.me/api/portraits/men/89.jpg",
  "https://randomuser.me/api/portraits/women/79.jpg",
];

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

export function portraitFor(name: string): string {
  return PORTRAITS[hash(name) % PORTRAITS.length];
}

export function Avatar({
  name,
  size = 40,
  className,
  src,
  tone = "auto",
  shape = "circle",
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const photo = src === undefined ? portraitFor(name) : src;
  const showPhoto = !!photo && !imgError;

  const c =
    tone === "brand"
      ? { from: "var(--primary)", to: "var(--primary-glow)" }
      : PALETTE[hash(name) % PALETTE.length];

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
