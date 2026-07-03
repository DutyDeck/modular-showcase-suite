import { cn } from "@/lib/utils";
import logoUrl from "@/assets/istudentid.png";

/**
 * 1StudentID brand mark. The source artwork (`istudentid.png`) is the full
 * lock-up — the 1SD badge, the "1studentID" wordmark and the tagline. For small
 * UI spots (sidebar, header, mobile) we crop just the badge out of it with a
 * background window so the mark reads cleanly; for the login screen we show the
 * whole lock-up via `BrandLockup`.
 *
 * The crop constants below isolate the 1SD badge from the top of the artwork —
 * nudge them if the badge ever sits off-centre.
 */
const BADGE_BG_SIZE = "161% auto";
const BADGE_BG_POS = "50% 0%";

export function BrandLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="1StudentID logo"
      className={cn("inline-block shrink-0 rounded-lg bg-white ring-1 ring-black/5", className)}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${logoUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: BADGE_BG_POS,
        backgroundSize: BADGE_BG_SIZE,
      }}
    />
  );
}

/**
 * The full 1StudentID lock-up (badge + wordmark + tagline). The source PNG carries
 * a lot of empty white margin, which reads as an ugly floating rectangle — so we
 * render it as a cropped background window that trims the margin and lets the
 * artwork fill its box. Put it on a light/white surface (the artwork has a white
 * ground); pair with the rounded "card" wrappers below for a tidy logo tile.
 */
const LOCKUP_ASPECT = "1.19 / 1";
const LOCKUP_BG_SIZE = "114% auto";
const LOCKUP_BG_POS = "50% 46%";

export function BrandLockup({ className, alt }: { className?: string; alt?: string }) {
  return (
    <div
      role="img"
      aria-label={alt ?? "1StudentID — One ID. Every journey."}
      className={cn("w-full select-none", className)}
      style={{
        aspectRatio: LOCKUP_ASPECT,
        backgroundImage: `url(${logoUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: LOCKUP_BG_POS,
        backgroundSize: LOCKUP_BG_SIZE,
      }}
    />
  );
}

/**
 * The 1StudentID wordmark in text — the numeral "1" tinted to echo the mark.
 * Used beside the small badge where the artwork's own wordmark would be too fine.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-sky-500">1</span>StudentID
    </span>
  );
}
