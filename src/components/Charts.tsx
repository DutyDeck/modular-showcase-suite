import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PRIMARY = "var(--primary)";
const PRIMARY_GLOW = "var(--primary-glow)";
const MUTED = "var(--muted-foreground)";
const BORDER = "var(--border)";

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

interface AreaProps {
  data: Array<Record<string, number | string>>;
  xKey: string;
  yKey: string;
  height?: number;
  yFormatter?: (v: number) => string;
}

export function AreaTrend({
  data,
  xKey,
  yKey,
  height = 220,
  yFormatter,
}: AreaProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="brandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.45} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={yFormatter}
            width={48}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number) =>
              yFormatter ? yFormatter(value) : value
            }
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={PRIMARY}
            strokeWidth={2}
            fill="url(#brandFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface LineProps {
  data: Array<Record<string, number | string>>;
  xKey: string;
  series: Array<{ key: string; label: string; color?: string }>;
  height?: number;
}

export function LineTrend({ data, xKey, series, height = 220 }: LineProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
          <XAxis dataKey={xKey} stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? PRIMARY}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BarProps {
  data: Array<Record<string, number | string>>;
  xKey: string;
  yKey: string;
  height?: number;
}

export function BarTrend({ data, xKey, yKey, height = 220 }: BarProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
          <XAxis dataKey={xKey} stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Bar dataKey={yKey} fill={PRIMARY} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DonutProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}

const DEFAULT_COLORS = [PRIMARY, PRIMARY_GLOW, "var(--info)", "var(--success)", "var(--warning)", "var(--destructive)"];

export function Donut({ data, height = 220, centerLabel, centerValue }: DonutProps) {
  return (
    <div style={{ height }} className="relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Pie
            data={data}
            innerRadius="60%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue && <div className="text-2xl font-bold">{centerValue}</div>}
          {centerLabel && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              {centerLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
