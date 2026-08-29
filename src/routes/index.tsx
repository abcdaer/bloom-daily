import { createFileRoute, Link } from "@tanstack/react-router";
import { Apple, BarChart3, BookOpen, ChevronRight, Flame, Repeat, Trophy } from "lucide-react";

import { BottomNav, Panel } from "@/components/tracker/shell";
import heroImage from "@/assets/hero-motivation.jpg";
import { useDay, useSettings } from "@/lib/db";
import { dayTotals, IDEAL_DAY_POINTS, longDate, todayStr } from "@/lib/tracker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily Tracker — Diet, Habits & Study" },
      {
        name: "description",
        content:
          "A fast personal mobile tracker for diet, habits, study hours and daily points.",
      },
      { property: "og:title", content: "Daily Tracker — Diet, Habits & Study" },
      {
        property: "og:description",
        content: "Track calories, protein, habits and study points every day.",
      },
    ],
  }),
  component: Home,
});

const SECTIONS = [
  {
    to: "/diet",
    label: "Diet",
    desc: "Calories, protein & steps",
    icon: Apple,
  },
  { to: "/study", label: "Study", desc: "Topics, hours & points", icon: BookOpen },
  { to: "/habit", label: "Habits", desc: "Good in, bad out", icon: Repeat },
  { to: "/stats", label: "Statistics", desc: "Points, weight & graphs", icon: BarChart3 },
] as const;

function Home() {
  const today = todayStr();
  const { data: settings } = useSettings();
  const { data: day } = useDay(today);
  const totals =
    settings && day ? dayTotals(settings, day.diet, day.habits, day.study, day.steps) : null;

  return (
    <div className="min-h-screen pb-24">
      <header className="hero-gradient rounded-b-3xl px-5 pb-8 pt-8 text-primary-foreground">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          {longDate(today)}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">Show up for yourself today</h1>
        <p className="mt-1 text-sm text-white/80">
          Small daily entries. Big yearly change.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <HeroStat label="Points" value={totals ? `${totals.total}` : "—"} />
          <HeroStat label="Kcal" value={totals ? `${totals.kcal}` : "—"} />
          <HeroStat label="Protein" value={totals ? `${totals.protein}g` : "—"} />
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pt-4">
        <div className="surface overflow-hidden">
          <img
            src={heroImage}
            alt="Illustration of a runner with books and weights"
            width={1024}
            height={640}
            className="h-36 w-full object-cover"
          />
          <div className="flex items-center gap-3 px-4 py-3">
            <Trophy className="size-5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Ideal day = <span className="font-bold text-primary">{IDEAL_DAY_POINTS} points</span>{" "}
              — 10 calories, 10 protein, 10 habits, 30 study.
            </p>
          </div>
        </div>

        <Panel title="Track something">
          <div className="space-y-2">
            {SECTIONS.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="press flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-3 py-3"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{s.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{s.desc}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Panel>

        {totals && (
          <Panel title="Today at a glance">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Mini label="Diet points" value={`${totals.dietPts} / 20`} />
              <Mini label="Habit points" value={`${totals.habitPts}`} />
              <Mini label="Study points" value={`${totals.studyPts}`} />
              <Mini label="Steps burn" value={`${totals.stepBurn} kcal`} />
            </div>
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-secondary p-2 text-[11px] font-semibold">
              <Flame className="size-4 text-primary" />
              {totals.total >= IDEAL_DAY_POINTS
                ? "You are already at your ideal day. Keep going!"
                : `${IDEAL_DAY_POINTS - totals.total} points to your ideal day.`}
            </p>
          </Panel>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-primary">{value}</p>
    </div>
  );
}
