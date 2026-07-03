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
 * The full 1StudentID lock-up (badge + wordmark + tagline) — use where there's
 * room to breathe, e.g. the login hero. Sits on its own transparent-fitting box;
 * put it on a light/white surface since the artwork has a white ground.
 */
export function BrandLockup({ className, alt }: { className?: string; alt?: string }) {
  return (
    <img
      src={logoUrl}
      alt={alt ?? "1StudentID — One ID. Every journey."}
      className={cn("block h-auto w-full select-none", className)}
      draggable={false}
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
