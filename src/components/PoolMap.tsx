import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { poolById, type PoolSession, type Weekday } from "@/lib/mockData";
import { Clock, Users, Waves } from "lucide-react";

/* Visual style per swim level — each concurrent session gets a distinct, watery
 * accent so the pool layout reads at a glance. */
const LEVEL_STYLE: Record<string, { block: string; dot: string; label: string }> = {
  "Competitive Squad": {
    block: "bg-indigo-500/85 hover:bg-indigo-500 border-indigo-300/60 text-white",
    dot: "bg-indigo-400",
    label: "Squad",
  },
  "Stroke Development": {
    block: "bg-cyan-500/85 hover:bg-cyan-500 border-cyan-200/60 text-white",
    dot: "bg-cyan-400",
    label: "Stroke",
  },
  "Learn-to-Swim": {
    block: "bg-emerald-500/85 hover:bg-emerald-500 border-emerald-200/60 text-white",
    dot: "bg-emerald-400",
    label: "Learn",
  },
  Diving: {
    block: "bg-fuchsia-500/85 hover:bg-fuchsia-500 border-fuchsia-200/60 text-white",
    dot: "bg-fuchsia-400",
    label: "Diving",
  },
};

const DEFAULT_STYLE = {
  block: "bg-sky-500/85 hover:bg-sky-500 border-sky-200/60 text-white",
  dot: "bg-sky-400",
  label: "Session",
};

const styleFor = (level: string) => LEVEL_STYLE[level] ?? DEFAULT_STYLE;

const DAY_FULL: Record<Weekday, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export function PoolMap({
  sessions,
  initialDay,
  presentCountFor,
  onOpenSession,
}: {
  sessions: PoolSession[];
  initialDay?: Weekday;
  presentCountFor?: (sessionId: string) => number;
  onOpenSession: (sessionId: string) => void;
}) {
  // Days that actually have sessions, kept in week order.
  const days = useMemo(() => {
    const order: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const present = new Set(sessions.map((s) => s.day));
    return order.filter((d) => present.has(d));
  }, [sessions]);

  const [day, setDay] = useState<Weekday>(
    initialDay && days.includes(initialDay) ? initialDay : (days[0] ?? "Mon"),
  );
  const effectiveDay = days.includes(day) ? day : (days[0] ?? "Mon");

  // Time slots available on the chosen day.
  const slots = useMemo(() => {
    const set = new Set(
      sessions.filter((s) => s.day === effectiveDay).map((s) => `${s.start}–${s.end}`),
    );
    return Array.from(set).sort();
  }, [sessions, effectiveDay]);

  const [slot, setSlot] = useState<string>(slots[0] ?? "");
  const effectiveSlot = slots.includes(slot) ? slot : (slots[0] ?? "");

  const visible = useMemo(
    () => sessions.filter((s) => s.day === effectiveDay && `${s.start}–${s.end}` === effectiveSlot),
    [sessions, effectiveDay, effectiveSlot],
  );

  // Group the concurrent sessions by pool so each involved pool is drawn once.
  const poolGroups = useMemo(() => {
    const map = new Map<string, PoolSession[]>();
    for (const s of visible) {
      (map.get(s.poolId) ?? map.set(s.poolId, []).get(s.poolId)!).push(s);
    }
    return Array.from(map.entries());
  }, [visible]);

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d) => {
          const active = d === effectiveDay;
          return (
            <button
              key={d}
              onClick={() => {
                setDay(d);
                setSlot("");
              }}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted",
              )}
            >
              {DAY_FULL[d]}
            </button>
          );
        })}
      </div>

      {/* Time-slot selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">
          Session time
        </span>
        {slots.map((sl) => {
          const active = sl === effectiveSlot;
          return (
            <button
              key={sl}
              onClick={() => setSlot(sl)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-md text-xs font-medium border inline-flex items-center gap-1.5 transition-colors",
                active ? "bg-info/15 text-info border-info/40" : "bg-card hover:bg-muted",
              )}
            >
              <Clock className="h-3 w-3" />
              {sl}
            </button>
          );
        })}
      </div>

      {poolGroups.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <Waves className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
          No sessions scheduled in this slot.
        </div>
      ) : (
        poolGroups.map(([poolId, poolSessions]) => (
          <PoolLayout
            key={poolId}
            poolId={poolId}
            sessions={poolSessions}
            presentCountFor={presentCountFor}
            onOpenSession={onOpenSession}
          />
        ))
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {Object.entries(LEVEL_STYLE).map(([level, st]) => (
          <span key={level} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", st.dot)} />
            {level}
          </span>
        ))}
      </div>
    </div>
  );
}

function PoolLayout({
  poolId,
  sessions,
  presentCountFor,
  onOpenSession,
}: {
  poolId: string;
  sessions: PoolSession[];
  presentCountFor?: (sessionId: string) => number;
  onOpenSession: (sessionId: string) => void;
}) {
  const pool = poolById[poolId];
  if (!pool) return null;
  const laneCount = pool.lanes;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-soft">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0">
            <Waves className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{pool.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {pool.lengthM} m · {pool.lanes} lanes
            </div>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {sessions.length} session{sessions.length === 1 ? "" : "s"} now
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex gap-2">
          {/* Lane numbers */}
          <div
            className="grid shrink-0"
            style={{ gridTemplateRows: `repeat(${laneCount}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: laneCount }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-center w-6 text-[10px] font-semibold text-muted-foreground"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* The water + session blocks */}
          <div
            className="relative flex-1 rounded-xl overflow-hidden ring-1 ring-sky-300/40 min-h-[260px]"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(56,189,248,0.28), rgba(14,116,144,0.40))",
            }}
          >
            {/* Lane ropes */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(180deg, transparent 0, transparent calc(100%/" +
                  laneCount +
                  " - 2px), rgba(255,255,255,0.55) calc(100%/" +
                  laneCount +
                  " - 2px), rgba(255,255,255,0.55) calc(100%/" +
                  laneCount +
                  "))",
              }}
            />
            {/* Shimmer */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 8px, transparent 8px 22px)",
              }}
            />

            {/* Session blocks laid out across their lane spans */}
            <div
              className="relative grid h-full gap-1.5 p-1.5"
              style={{ gridTemplateRows: `repeat(${laneCount}, minmax(0, 1fr))` }}
            >
              {sessions.map((s) => {
                const st = styleFor(s.level);
                const present = presentCountFor?.(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => onOpenSession(s.id)}
                    style={{ gridRow: `${s.laneFrom} / ${s.laneTo + 1}`, gridColumn: 1 }}
                    className={cn(
                      "rounded-lg border text-left p-2.5 transition-colors shadow-soft flex flex-col justify-between",
                      st.block,
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold leading-tight line-clamp-2">
                        {s.title}
                      </div>
                      <div className="text-[10px] opacity-90 mt-0.5">
                        Lanes {s.laneFrom}–{s.laneTo} · {s.focus}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <div className="flex -space-x-1.5">
                        {s.coachNames.slice(0, 3).map((c) => (
                          <Avatar key={c} name={c} size={20} className="ring-1 ring-white/70" />
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-black/20 rounded px-1.5 py-0.5">
                        <Users className="h-3 w-3" />
                        {present != null ? `${present}/` : ""}
                        {s.swimmerIds.length}
                        <span className="opacity-75">· cap {s.capacity}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Zone strip */}
        <div className="flex flex-wrap gap-2 mt-3">
          {pool.zones.map((z) => (
            <span
              key={z.id}
              className="inline-flex items-center gap-1.5 text-[11px] rounded-md border bg-muted/40 px-2 py-1"
            >
              <span className="font-medium">{z.label}</span>
              <span className="text-muted-foreground">
                · lanes {z.laneFrom}–{z.laneTo} · {z.depth}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
