import { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star display supporting half-stars (e.g. 4.3 → 4 full + 1 half). */
export function Stars({
  value,
  size = 16,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25 && value - full < 0.75;
  const roundedUp = value - full >= 0.75 ? 1 : 0;
  const fullCount = full + roundedUp;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        if (idx <= fullCount) {
          return (
            <Star
              key={i}
              style={{ width: size, height: size }}
              className="fill-warning text-warning"
            />
          );
        }
        if (idx === fullCount + 1 && hasHalf) {
          return (
            <span key={i} className="relative inline-flex" style={{ width: size, height: size }}>
              <Star
                style={{ width: size, height: size }}
                className="absolute inset-0 text-muted-foreground/30"
              />
              <StarHalf
                style={{ width: size, height: size }}
                className="absolute inset-0 fill-warning text-warning"
              />
            </span>
          );
        }
        return (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className="text-muted-foreground/30"
          />
        );
      })}
    </div>
  );
}

/** Interactive 1–5 star picker. */
export function StarInput({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((idx) => (
        <button
          key={idx}
          type="button"
          role="radio"
          aria-checked={value === idx}
          aria-label={`${idx} star${idx > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(idx)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(idx)}
          className="p-0.5 rounded transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(idx <= shown ? "fill-warning text-warning" : "text-muted-foreground/40")}
          />
        </button>
      ))}
    </div>
  );
}
