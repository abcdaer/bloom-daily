export const KCAL_PER_STEP = 400 / 10000;
export const KCAL_PER_KG = 7700;
export const IDEAL_DAY_POINTS = 60;

export type Settings = {
  id: number;
  maintenance_kcal: number;
  target_kcal: number;
  target_protein: number;
  start_weight: number;
  goal: string;
};

export type DietEntry = {
  id: string;
  entry_date: string;
  name: string;
  mode: string;
  amount: number;
  protein: number;
  kcal: number;
};

export type DietTemplate = {
  id: string;
  name: string;
  mode: string;
  protein_per_unit: number;
  kcal_per_unit: number;
  default_amount: number | null;
};

export type HabitEntry = { id: string; entry_date: string; name: string; kind: string };
export type HabitTemplate = { id: string; name: string; kind: string };
export type StudyEntry = {
  id: string;
  entry_date: string;
  name: string;
  weight: number;
  hours: number;
};
export type StudyTemplate = {
  id: string;
  name: string;
  weight: number;
  default_hours: number | null;
};

/* ---------- dates ---------- */

export function toDateStr(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function shiftDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + delta);
  return toDateStr(dt);
}

export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function prettyDate(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return "Today";
  if (dateStr === shiftDay(today, -1)) return "Yesterday";
  if (dateStr === shiftDay(today, 1)) return "Tomorrow";
  return parseDateStr(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function longDate(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ---------- points ---------- */

export function round(n: number, p = 1): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

export function kcalPoints(totalKcal: number, settings: Settings): number {
  if (totalKcal <= settings.maintenance_kcal) return 10;
  const over = totalKcal - settings.maintenance_kcal;
  return Math.max(0, 10 - Math.floor(over / 100));
}

export function proteinPoints(totalProtein: number, settings: Settings): number {
  if (totalProtein >= settings.target_protein) return 10;
  const under = settings.target_protein - totalProtein;
  return Math.max(0, 10 - Math.floor(under / 5));
}

export function habitPoints(entries: HabitEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.kind === "good" ? 10 : -10), 0);
}

export function studyPoints(entries: StudyEntry[]): number {
  return entries.reduce((sum, e) => sum + e.weight * e.hours, 0);
}

export type DayTotals = {
  kcal: number;
  protein: number;
  steps: number;
  stepBurn: number;
  netKcal: number;
  deficit: number;
  dietPts: number;
  habitPts: number;
  studyPts: number;
  total: number;
};

export function dayTotals(
  settings: Settings,
  diet: DietEntry[],
  habits: HabitEntry[],
  study: StudyEntry[],
  steps: number,
): DayTotals {
  const kcal = diet.reduce((s, e) => s + e.kcal, 0);
  const protein = diet.reduce((s, e) => s + e.protein, 0);
  const stepBurn = steps * KCAL_PER_STEP;
  const netKcal = kcal - stepBurn;
  const dietPts = diet.length ? kcalPoints(kcal, settings) + proteinPoints(protein, settings) : 0;
  const hPts = habitPoints(habits);
  const sPts = studyPoints(study);
  return {
    kcal: round(kcal),
    protein: round(protein),
    steps,
    stepBurn: round(stepBurn),
    netKcal: round(netKcal),
    deficit: round(settings.maintenance_kcal + stepBurn - kcal),
    dietPts,
    habitPts: hPts,
    studyPts: round(sPts),
    total: round(dietPts + hPts + sPts),
  };
}
