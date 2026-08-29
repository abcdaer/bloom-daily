import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Flame,
  Scale,
  Target,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  BottomNav,
  DateSheet,
  Empty,
  PageHeader,
  Panel,
} from "@/components/tracker/shell";
import { useAllDays, useSettings } from "@/lib/db";
import {
  dayTotals,
  IDEAL_DAY_POINTS,
  KCAL_PER_KG,
  prettyDate,
  round,
  todayStr,
  type DayTotals,
  type DietEntry,
  type HabitEntry,
  type Settings,
  type StudyEntry,
} from "@/lib/tracker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Daily Tracker" },
      {
        name: "description",
        content: "Points, calories burned, expected weight and day-by-day performance graphs.",
      },
      { property: "og:title", content: "Statistics — Daily Tracker" },
      { property: "og:description", content: "Points, weight trend and daily performance." },
    ],
  }),
  component: StatsPage,
});

type DayRow = { date: string; totals: DayTotals };

function groupByDate<T extends { entry_date: string }>(rows: T[]): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const r of rows) (map[r.entry_date] ??= []).push(r);
  return map;
}

function buildRows(
  settings: Settings,
  diet: DietEntry[],
  habits: HabitEntry[],
  study: StudyEntry[],
  steps: Record<string, number>,
): DayRow[] {
  const d = groupByDate(diet);
  const h = groupByDate(habits);
  const s = groupByDate(study);
  const dates = new Set([
    ...Object.keys(d),
    ...Object.keys(h),
    ...Object.keys(s),
    ...Object.keys(steps),
  ]);
  return [...dates]
    .sort()
    .map((date) => ({
      date,
      totals: dayTotals(settings, d[date] ?? [], h[date] ?? [], s[date] ?? [], steps[date] ?? 0),
    }));
}

function StatsPage() {
  const { data: settings } = useSettings();
  const { data: all, isLoading } = useAllDays();
  const [date, setDate] = useState(todayStr());
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      settings && all ? buildRows(settings, all.diet, all.habits, all.study, all.steps) : [],
    [settings, all],
  );

  if (!settings || isLoading) {
    return (
      <div className="min-h-screen pb-24">
        <PageHeader title="Statistics" icon={<BarChart3 className="size-5" />} />
        <main className="mx-auto max-w-md px-4 pt-4">
          <Empty text="Loading your stats…" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const totalPoints = round(rows.reduce((s, r) => s + r.totals.total, 0));
  const idealPoints = rows.length * IDEAL_DAY_POINTS;
  const kcalBurnt = round(rows.reduce((s, r) => s + Math.max(0, r.totals.deficit), 0));
  const kgLost = round(kcalBurnt / KCAL_PER_KG, 2);
  const expectedWeight = round(settings.start_weight - kgLost, 2);

  const chart = rows.slice(-14).map((r) => ({
    day: prettyDate(r.date).slice(0, 6),
    points: r.totals.total,
    ideal: IDEAL_DAY_POINTS,
    kcal: r.totals.kcal,
    protein: r.totals.protein,
  }));

  const dayRow = rows.find((r) => r.date === date);
  const dayDiet = (all?.diet ?? []).filter((e) => e.entry_date === date);
  const dayHabits = (all?.habits ?? []).filter((e) => e.entry_date === date);
  const dayStudy = (all?.study ?? []).filter((e) => e.entry_date === date);

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        title="Statistics"
        subtitle="Your all-time progress"
        icon={<BarChart3 className="size-5" />}
      />
      <main className="mx-auto max-w-md space-y-4 px-4 pt-4">
        <Panel title="All-time">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              icon={<Trophy className="size-4" />}
              label="Points earned"
              value={`${totalPoints}`}
              sub={`of ${idealPoints} ideal`}
            />
            <Stat
              icon={<Target className="size-4" />}
              label="Consistency"
              value={idealPoints ? `${Math.round((totalPoints / idealPoints) * 100)}%` : "—"}
              sub={`${rows.length} tracked days`}
            />
            <Stat
              icon={<Flame className="size-4" />}
              label="Kcal burnt"
              value={`${kcalBurnt}`}
              sub="total deficit"
            />
            <Stat
              icon={<Scale className="size-4" />}
              label="Expected weight"
              value={`${expectedWeight} kg`}
              sub={`-${kgLost} kg from ${settings.start_weight}`}
            />
          </div>
        </Panel>

        <Panel title="Points vs ideal (last 14 days)">
          {chart.length === 0 ? (
            <Empty text="No data yet — start logging." />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                  />
                  <ReferenceLine y={IDEAL_DAY_POINTS} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="points"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Dashed line = your ideal {IDEAL_DAY_POINTS} points a day (10 kcal + 10 protein + 10
            habit + 30 study).
          </p>
        </Panel>

        <Panel title="Calories per day (last 14 days)">
          {chart.length === 0 ? (
            <Empty text="No data yet." />
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                  />
                  <ReferenceLine
                    y={settings.maintenance_kcal}
                    stroke="var(--color-destructive)"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="kcal" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Where you go above / below ideal">
          {rows.length === 0 ? (
            <Empty text="No tracked days yet." />
          ) : (
            <ul className="space-y-2">
              {rows
                .slice(-7)
                .reverse()
                .map((r) => {
                  const gap = round(r.totals.total - IDEAL_DAY_POINTS);
                  return (
                    <li
                      key={r.date}
                      className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{prettyDate(r.date)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          diet {r.totals.dietPts} · habit {r.totals.habitPts} · study{" "}
                          {r.totals.studyPts}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                          gap >= 0
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive",
                        )}
                      >
                        {gap >= 0 ? "+" : ""}
                        {gap} vs ideal
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </Panel>

        <Panel title="Day report">
          <button
            onClick={() => setOpen(true)}
            className="press w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold"
          >
            {prettyDate(date)} — tap to change date
          </button>
          <DateSheet open={open} onOpenChange={setOpen} value={date} onSelect={setDate} />

          <div className="mt-4 space-y-4">
            <DayTable
              title="Diet"
              head={["Food", "Kcal", "Protein"]}
              rows={dayDiet.map((e) => [e.name, `${e.kcal}`, `${e.protein} g`])}
              footer={
                dayRow
                  ? [
                      "Total",
                      `${dayRow.totals.kcal}`,
                      `${dayRow.totals.protein} g`,
                    ]
                  : undefined
              }
            />
            <DayTable
              title="Habits"
              head={["Habit", "Type", "Pts"]}
              rows={dayHabits.map((e) => [
                e.name,
                e.kind,
                e.kind === "good" ? "+10" : "-10",
              ])}
              footer={dayRow ? ["Total", "", `${dayRow.totals.habitPts}`] : undefined}
            />
            <DayTable
              title="Study"
              head={["Topic", "Hours", "Pts"]}
              rows={dayStudy.map((e) => [e.name, `${e.hours}`, `${round(e.hours * e.weight)}`])}
              footer={dayRow ? ["Total", "", `${dayRow.totals.studyPts}`] : undefined}
            />
          </div>

          {dayRow && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Total label="Steps" value={`${dayRow.totals.steps}`} />
              <Total label="Steps burn" value={`${dayRow.totals.stepBurn} kcal`} />
              <Total label="Net kcal" value={`${dayRow.totals.netKcal}`} />
              <Total label="Deficit" value={`${dayRow.totals.deficit} kcal`} />
              <Total label="Diet points" value={`${dayRow.totals.dietPts} / 20`} />
              <Total
                label="Day total"
                value={`${dayRow.totals.total} / ${IDEAL_DAY_POINTS}`}
              />
            </div>
          )}
        </Panel>

        <Panel title="All days">
          {rows.length === 0 ? (
            <Empty text="Nothing tracked yet." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-1 py-2 text-right">Kcal</th>
                    <th className="px-1 py-2 text-right">Prot</th>
                    <th className="px-1 py-2 text-right">Habit</th>
                    <th className="px-1 py-2 text-right">Study</th>
                    <th className="px-2 py-2 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r) => (
                    <tr key={r.date} className="border-t border-border">
                      <td className="px-2 py-2 font-medium">{prettyDate(r.date)}</td>
                      <td className="px-1 py-2 text-right">{r.totals.kcal}</td>
                      <td className="px-1 py-2 text-right">{r.totals.protein}</td>
                      <td className="px-1 py-2 text-right">{r.totals.habitPts}</td>
                      <td className="px-1 py-2 text-right">{r.totals.studyPts}</td>
                      <td
                        className={cn(
                          "px-2 py-2 text-right font-bold",
                          r.totals.total >= IDEAL_DAY_POINTS ? "text-success" : "text-primary",
                        )}
                      >
                        {r.totals.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <p className="flex items-center justify-center gap-2 pb-2 text-center text-[11px] text-muted-foreground">
          <Activity className="size-3" />
          7,700 kcal deficit ≈ 1 kg lost · 10,000 steps ≈ 400 kcal
        </p>
      </main>
      <BottomNav />
    </div>
  );
}

function DayTable({
  title,
  head,
  rows,
  footer,
}: {
  title: string;
  head: string[];
  rows: string[][];
  footer?: string[] | undefined;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {rows.length === 0 ? (
        <Empty text={`No ${title.toLowerCase()} on this date.`} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
              <tr>
                {head.map((h, i) => (
                  <th key={h} className={cn("px-3 py-2", i > 0 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-t border-border">
                  {r.map((c, ci) => (
                    <td key={ci} className={cn("px-3 py-2", ci > 0 && "text-right")}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
              {footer && (
                <tr className="border-t border-border bg-primary/5 font-bold text-primary">
                  {footer.map((c, ci) => (
                    <td key={ci} className={cn("px-3 py-2", ci > 0 && "text-right")}>
                      {c}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <p className="text-lg font-bold text-primary">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary/5 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-primary">{value}</p>
    </div>
  );
}

export { TrendingDown };
