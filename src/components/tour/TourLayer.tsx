import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTour, tourApi, TOUR_STEPS, PERSONAS, type TourAction, type TourStep } from "@/lib/tour";
import { cn } from "@/lib/utils";
import { Play, Pause, ChevronLeft, ChevronRight, X, GraduationCap } from "lucide-react";

/* ── small async helpers ─────────────────────────────────────────────────── */
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** A data-tour key, or a raw CSS selector when it starts with [ . or #. */
function resolveSel(t: string) {
  return /^[[.#]/.test(t) ? t : `[data-tour="${t}"]`;
}

async function waitForEl(
  sel: string,
  timeout: number,
  cancelled: () => boolean,
): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (cancelled()) return null;
    const el = document.querySelector(sel);
    if (el) return el;
    await wait(120);
  }
  return document.querySelector(sel);
}

/** Set a controlled input/textarea/select value so React's onChange fires. */
function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function runAction(a: TourAction, cancelled: () => boolean): Promise<void> {
  if (cancelled()) return;
  switch (a.kind) {
    case "click": {
      const el = (await waitForEl(resolveSel(a.target), 3000, cancelled)) as HTMLElement | null;
      el?.click();
      break;
    }
    case "type": {
      const el = (await waitForEl(resolveSel(a.target), 3000, cancelled)) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (el) {
        el.focus();
        setNativeValue(el, a.text);
      }
      break;
    }
    case "select": {
      const el = (await waitForEl(
        resolveSel(a.target),
        3000,
        cancelled,
      )) as HTMLSelectElement | null;
      if (el) setNativeValue(el, a.value);
      break;
    }
    case "selectIndex": {
      const el = (await waitForEl(
        resolveSel(a.target),
        3000,
        cancelled,
      )) as HTMLSelectElement | null;
      const opt = el?.options[a.index];
      if (el && opt) setNativeValue(el, opt.value);
      break;
    }
    case "escape": {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      break;
    }
    case "wait":
      await wait(a.ms);
      break;
    case "sequence":
      for (const s of a.steps) {
        if (cancelled()) return;
        await runAction(s, cancelled);
        await wait(300);
      }
      break;
  }
}

/* ── the overlay ─────────────────────────────────────────────────────────── */
const PAD = 8;

export function TourLayer() {
  const { active, playing, index } = useTour();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const token = useRef(0);

  useEffect(() => setMounted(true), []);

  const step: TourStep | null = active ? (TOUR_STEPS[index] ?? null) : null;

  // Drive the current step: persona → navigate → wait for target → action → measure.
  useEffect(() => {
    if (!active || !step) return;
    const myToken = ++token.current;
    let cancelled = false;
    const isDead = () => cancelled || myToken !== token.current;
    setReady(false);
    setRect(null);

    (async () => {
      const persona = PERSONAS[step.persona];
      if ((user?.email ?? "").toLowerCase() !== persona.email) {
        login(persona.email, persona.password);
      }
      if (step.route) {
        try {
          await navigate(step.route as never);
        } catch {
          /* ignore navigation races */
        }
      }
      await raf();
      await wait(120);
      if (isDead()) return;

      let el: Element | null = null;
      if (step.target) el = await waitForEl(resolveSel(step.target), 4000, isDead);
      if (isDead()) return;

      if (step.action) {
        await runAction(step.action, isDead);
        await wait(400);
        if (isDead()) return;
        if (step.target) el = document.querySelector(resolveSel(step.target));
      }

      if (el) {
        el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
        await wait(320);
        if (isDead()) return;
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  // Keep the spotlight glued to its target on scroll / resize.
  useEffect(() => {
    if (!active || !step?.target) return;
    const remeasure = () => {
      const el = document.querySelector(resolveSel(step.target!));
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure);
    return () => {
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  // Hybrid auto-advance: runs while playing, cancelled by any manual control.
  useEffect(() => {
    if (!active || !playing || !ready) return;
    const ms = step?.autoMs ?? 7000;
    const t = setTimeout(() => tourApi.next(), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, playing, ready, index]);

  if (!mounted || !active || !step) return null;

  const total = TOUR_STEPS.length;
  const centered = !rect || step.placement === "center";
  const tip = tooltipStyle(rect, step.placement, centered);

  return (
    <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: "none" }}>
      {/* Dim + spotlight — a light scrim so the demonstrated view stays legible */}
      {centered ? (
        <div className="absolute inset-0 bg-slate-950/35 transition-opacity" />
      ) : (
        <div
          className="absolute rounded-xl transition-all duration-300"
          style={{
            left: rect!.left - PAD,
            top: rect!.top - PAD,
            width: rect!.width + PAD * 2,
            height: rect!.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(15,23,42,0.38)",
            outline: "2.5px solid rgba(99,102,241,0.85)",
            outlineOffset: "2px",
            borderRadius: "12px",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute w-[340px] max-w-[calc(100vw-24px)] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        style={{ ...tip, pointerEvents: "auto" }}
      >
        <div className="h-1.5 rounded-t-2xl bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500" />
        <div className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
            <GraduationCap className="h-3.5 w-3.5" />
            {step.act}
          </div>
          <h3 className="mt-1.5 text-[15px] font-bold leading-snug text-slate-900">{step.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{step.body}</p>
        </div>
      </div>

      {/* Control bar */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-slate-900/95 px-2 py-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur"
        style={{ pointerEvents: "auto" }}
      >
        <Ctrl onClick={() => tourApi.prev()} disabled={index === 0} label="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Ctrl>
        <button
          onClick={() => tourApi.togglePlay()}
          className="flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </button>
        <Ctrl onClick={() => tourApi.next()} label="Next">
          <ChevronRight className="h-4 w-4" />
        </Ctrl>
        <div className="mx-1.5 min-w-[92px] text-center text-[11px] font-medium leading-tight text-slate-300">
          <div className="tabular-nums">
            {index + 1} / {total}
          </div>
          <div className="truncate text-[10px] text-slate-400">{step.act}</div>
        </div>
        <Ctrl onClick={() => tourApi.stop()} label="Exit demo">
          <X className="h-4 w-4" />
        </Ctrl>
      </div>
    </div>
  );
}

function Ctrl({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-slate-200 hover:bg-white/10",
        disabled && "opacity-30",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Position the tooltip so it never covers the highlighted element: try the
 * requested side first, then the side with the most room, falling back to a
 * corner. Centres the card when there's no target.
 */
function tooltipStyle(
  rect: DOMRect | null,
  placement: TourStep["placement"],
  centered: boolean,
): React.CSSProperties {
  const W = 340;
  const H = 176;
  const M = 14;
  const GAP = 16;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  if (centered || !rect) {
    return {
      left: clamp(vw / 2 - W / 2, M, vw - W - M),
      top: clamp(vh / 2 - H / 2, M, vh - H - M),
    };
  }

  const order: NonNullable<TourStep["placement"]>[] = [];
  if (placement && placement !== "center") order.push(placement);
  order.push("right", "left", "bottom", "top");

  for (const p of order) {
    let left: number;
    let top: number;
    if (p === "right") {
      left = rect.right + GAP;
      top = clamp(rect.top, M, vh - H - M);
    } else if (p === "left") {
      left = rect.left - W - GAP;
      top = clamp(rect.top, M, vh - H - M);
    } else if (p === "bottom") {
      left = clamp(rect.left, M, vw - W - M);
      top = rect.bottom + GAP;
    } else {
      left = clamp(rect.left, M, vw - W - M);
      top = rect.top - H - GAP;
    }
    if (left >= M && left + W <= vw - M && top >= M && top + H <= vh - M) {
      return { left, top };
    }
  }
  // Nothing fit cleanly — tuck it into the bottom-left, clear of the control bar.
  return { left: M, top: clamp(vh - H - 76, M, vh - H - M) };
}
