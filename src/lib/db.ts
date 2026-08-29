import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  DietEntry,
  DietTemplate,
  HabitEntry,
  HabitTemplate,
  Settings,
  StudyEntry,
  StudyTemplate,
} from "./tracker";

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  maintenance_kcal: 2200,
  target_kcal: 2000,
  target_protein: 120,
  start_weight: 70,
  goal: "lose",
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    staleTime: 60_000,
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;
      return {
        id: 1,
        maintenance_kcal: Number(data.maintenance_kcal),
        target_kcal: Number(data.target_kcal),
        target_protein: Number(data.target_protein),
        start_weight: Number(data.start_weight),
        goal: data.goal,
      };
    },
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Settings, "id">) => {
      const { error } = await supabase
        .from("settings")
        .upsert({ id: 1, ...values, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

/* ---------------- templates ---------------- */

export function useDietTemplates() {
  return useQuery({
    queryKey: ["diet_templates"],
    queryFn: async (): Promise<DietTemplate[]> => {
      const { data, error } = await supabase
        .from("diet_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        mode: t.mode,
        protein_per_unit: Number(t.protein_per_unit),
        kcal_per_unit: Number(t.kcal_per_unit),
        default_amount: t.default_amount === null ? null : Number(t.default_amount),
      }));
    },
  });
}

export function useHabitTemplates() {
  return useQuery({
    queryKey: ["habit_templates"],
    queryFn: async (): Promise<HabitTemplate[]> => {
      const { data, error } = await supabase
        .from("habit_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t) => ({ id: t.id, name: t.name, kind: t.kind }));
    },
  });
}

export function useStudyTemplates() {
  return useQuery({
    queryKey: ["study_templates"],
    queryFn: async (): Promise<StudyTemplate[]> => {
      const { data, error } = await supabase
        .from("study_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        weight: Number(t.weight),
        default_hours: t.default_hours === null ? null : Number(t.default_hours),
      }));
    },
  });
}

/* ---------------- day data ---------------- */

export type DayData = {
  diet: DietEntry[];
  habits: HabitEntry[];
  study: StudyEntry[];
  steps: number;
};

export async function fetchDay(date: string): Promise<DayData> {
  const [diet, habits, study, steps] = await Promise.all([
    supabase.from("diet_entries").select("*").eq("entry_date", date).order("created_at"),
    supabase.from("habit_entries").select("*").eq("entry_date", date).order("created_at"),
    supabase.from("study_entries").select("*").eq("entry_date", date).order("created_at"),
    supabase.from("step_logs").select("steps").eq("entry_date", date).maybeSingle(),
  ]);
  if (diet.error) throw diet.error;
  if (habits.error) throw habits.error;
  if (study.error) throw study.error;
  return {
    diet: (diet.data ?? []).map((e) => ({
      id: e.id,
      entry_date: e.entry_date,
      name: e.name,
      mode: e.mode,
      amount: Number(e.amount),
      protein: Number(e.protein),
      kcal: Number(e.kcal),
    })),
    habits: (habits.data ?? []).map((e) => ({
      id: e.id,
      entry_date: e.entry_date,
      name: e.name,
      kind: e.kind,
    })),
    study: (study.data ?? []).map((e) => ({
      id: e.id,
      entry_date: e.entry_date,
      name: e.name,
      weight: Number(e.weight),
      hours: Number(e.hours),
    })),
    steps: Number(steps.data?.steps ?? 0),
  };
}

export function useDay(date: string) {
  return useQuery({
    queryKey: ["day", date],
    queryFn: () => fetchDay(date),
  });
}

export function useRefreshDay(date: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["day", date] });
    void qc.invalidateQueries({ queryKey: ["all-days"] });
  };
}

/* ---------------- all days (stats) ---------------- */

export type AllDays = {
  diet: DietEntry[];
  habits: HabitEntry[];
  study: StudyEntry[];
  steps: Record<string, number>;
};

export function useAllDays() {
  return useQuery({
    queryKey: ["all-days"],
    queryFn: async (): Promise<AllDays> => {
      const [diet, habits, study, steps] = await Promise.all([
        supabase.from("diet_entries").select("*"),
        supabase.from("habit_entries").select("*"),
        supabase.from("study_entries").select("*"),
        supabase.from("step_logs").select("*"),
      ]);
      if (diet.error) throw diet.error;
      if (habits.error) throw habits.error;
      if (study.error) throw study.error;
      if (steps.error) throw steps.error;
      const stepMap: Record<string, number> = {};
      for (const s of steps.data ?? []) stepMap[s.entry_date] = Number(s.steps);
      return {
        diet: (diet.data ?? []).map((e) => ({
          id: e.id,
          entry_date: e.entry_date,
          name: e.name,
          mode: e.mode,
          amount: Number(e.amount),
          protein: Number(e.protein),
          kcal: Number(e.kcal),
        })),
        habits: (habits.data ?? []).map((e) => ({
          id: e.id,
          entry_date: e.entry_date,
          name: e.name,
          kind: e.kind,
        })),
        study: (study.data ?? []).map((e) => ({
          id: e.id,
          entry_date: e.entry_date,
          name: e.name,
          weight: Number(e.weight),
          hours: Number(e.hours),
        })),
        steps: stepMap,
      };
    },
  });
}

/* ---------------- writers ---------------- */

export const api = {
  addDietEntry: async (row: {
    entry_date: string;
    name: string;
    mode: string;
    amount: number;
    protein: number;
    kcal: number;
  }) => {
    const { error } = await supabase.from("diet_entries").insert(row);
    if (error) throw error;
  },
  addDietTemplate: async (row: {
    name: string;
    mode: string;
    protein_per_unit: number;
    kcal_per_unit: number;
    default_amount: number | null;
  }) => {
    const { error } = await supabase.from("diet_templates").insert(row);
    if (error) throw error;
  },
  setSteps: async (entry_date: string, steps: number) => {
    const { error } = await supabase.from("step_logs").upsert({ entry_date, steps });
    if (error) throw error;
  },
  addHabitEntry: async (row: { entry_date: string; name: string; kind: string }) => {
    const { error } = await supabase.from("habit_entries").insert(row);
    if (error) throw error;
  },
  addHabitTemplate: async (row: { name: string; kind: string }) => {
    const { error } = await supabase.from("habit_templates").insert(row);
    if (error) throw error;
  },
  addStudyEntry: async (row: {
    entry_date: string;
    name: string;
    weight: number;
    hours: number;
  }) => {
    const { error } = await supabase.from("study_entries").insert(row);
    if (error) throw error;
  },
  addStudyTemplate: async (row: { name: string; weight: number; default_hours: number | null }) => {
    const { error } = await supabase.from("study_templates").insert(row);
    if (error) throw error;
  },
  removeEntry: async (
    table: "diet_entries" | "habit_entries" | "study_entries",
    id: string,
  ) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  },
  removeTemplate: async (
    table: "diet_templates" | "habit_templates" | "study_templates",
    id: string,
  ) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  },
};
