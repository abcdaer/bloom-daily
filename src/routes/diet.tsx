import { createFileRoute } from "@tanstack/react-router";
import { Apple, Flame, Footprints, Plus, Trash2, Zap } from "lucide-react";
import { useState } from "react";

import {
  AmountDialog,
  BottomNav,
  DateBar,
  DateSheet,
  Empty,
  Field,
  notify,
  PageHeader,
  Panel,
  PrimaryButton,
  TabBar,
  useTrackerDate,
  type TabKey,
} from "@/components/tracker/shell";
import { api, useDay, useDietTemplates, useRefreshDay, useSaveSettings, useSettings } from "@/lib/db";
import {
  dayTotals,
  kcalPoints,
  proteinPoints,
  prettyDate,
  round,
  todayStr,
  type DietTemplate,
  type Settings,
} from "@/lib/tracker";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchDay } from "@/lib/db";

export const Route = createFileRoute("/diet")({
  head: () => ({
    meta: [
      { title: "Diet Tracker — Daily Tracker" },
      { name: "description", content: "Log meals, protein, calories and steps for any day." },
      { property: "og:title", content: "Diet Tracker — Daily Tracker" },
      { property: "og:description", content: "Log meals, protein, calories and steps." },
    ],
  }),
  component: DietPage,
});

function amountsFrom(t: DietTemplate, amount: number) {
  const factor = t.mode === "gram" ? amount / 100 : amount;
  return { protein: round(t.protein_per_unit * factor), kcal: round(t.kcal_per_unit * factor) };
}

function DietPage() {
  const [date, setDate] = useTrackerDate();
  const [tab, setTab] = useState<TabKey>("select");
  if (!date) return null;

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        title="Diet"
        subtitle="Calories, protein & steps"
        icon={<Apple className="size-5" />}
      />
      <main className="mx-auto max-w-md space-y-4 px-4 pt-4">
        <DateBar date={date} setDate={setDate} />
        <TabBar value={tab} onChange={setTab} />
        {tab === "select" && <SelectTab date={date} />}
        {tab === "add" && <AddTab date={date} />}
        {tab === "quick" && <QuickTab />}
        {tab === "past" && <PastTab initialDate={date} />}
      </main>
      <BottomNav />
    </div>
  );
}

/* ---------------- select ---------------- */

function SelectTab({ date }: { date: string }) {
  const { data: settings } = useSettings();
  const { data: templates } = useDietTemplates();
  const { data: day } = useDay(date);
  const refresh = useRefreshDay(date);
  const [pending, setPending] = useState<DietTemplate | null>(null);
  const [stepsInput, setStepsInput] = useState("");

  if (!settings) return null;
  const diet = day?.diet ?? [];
  const totals = dayTotals(settings, diet, day?.habits ?? [], day?.study ?? [], day?.steps ?? 0);

  const saveFromTemplate = async (t: DietTemplate, amount: number) => {
    const v = amountsFrom(t, amount);
    const before = kcalPoints(totals.kcal, settings) + proteinPoints(totals.protein, settings);
    await api.addDietEntry({
      entry_date: date,
      name: t.name,
      mode: t.mode,
      amount,
      protein: v.protein,
      kcal: v.kcal,
    });
    const after =
      kcalPoints(totals.kcal + v.kcal, settings) +
      proteinPoints(totals.protein + v.protein, settings);
    refresh();
    notify(`${t.name} logged`, after - before);
  };

  return (
    <div className="space-y-4">
      <Panel title="Today's plate">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Calories" value={`${totals.kcal}`} sub={`target ${settings.target_kcal}`} />
          <Metric
            label="Protein"
            value={`${totals.protein} g`}
            sub={`target ${settings.target_protein} g`}
          />
          <Metric
            label="Steps burn"
            value={`${totals.stepBurn} kcal`}
            sub={`${totals.steps} steps`}
          />
          <Metric label="Net kcal" value={`${totals.netKcal}`} sub={`maint ${settings.maintenance_kcal}`} />
        </div>
        <div
          className={cn(
            "mt-3 rounded-xl px-3 py-2 text-xs font-semibold",
            totals.netKcal > settings.maintenance_kcal
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success",
          )}
        >
          {totals.netKcal > settings.maintenance_kcal
            ? `Above maintenance by ${round(totals.netKcal - settings.maintenance_kcal)} kcal — you will gain weight.`
            : `Below maintenance by ${round(settings.maintenance_kcal - totals.netKcal)} kcal — you will lose weight.`}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary p-2 text-xs font-semibold text-secondary-foreground">
          <Flame className="size-4 text-primary" />
          Diet points today: {totals.dietPts} / 20
        </div>
      </Panel>

      <Panel title="Steps walked">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="Steps (10,000 = 400 kcal)"
              value={stepsInput === "" ? String(day?.steps ?? 0) : stepsInput}
              onChange={setStepsInput}
              type="number"
            />
          </div>
          <div className="w-28">
            <PrimaryButton
              onClick={async () => {
                const n = Number(stepsInput || day?.steps || 0);
                await api.setSteps(date, Math.round(n));
                setStepsInput("");
                refresh();
                notify(`${Math.round(n)} steps saved`);
              }}
            >
              <Footprints className="mr-1 size-4" /> Save
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      <Panel title="Quick entries — one tap">
        {templates && templates.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (t.default_amount == null) setPending(t);
                  else void saveFromTemplate(t, t.default_amount);
                }}
                className="press rounded-xl border border-border bg-secondary/60 p-3 text-left"
              >
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.kcal_per_unit} kcal · {t.protein_per_unit} g P /
                  {t.mode === "gram" ? " 100g" : " unit"}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-primary">
                  {t.default_amount == null
                    ? "Tap → ask amount"
                    : `Tap → ${t.default_amount}${t.mode === "gram" ? " g" : " qty"}`}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <Empty text="No quick entries yet. Create some in the Quick tab." />
        )}
      </Panel>

      <Panel title={`Logged on ${prettyDate(date)}`}>
        {diet.length === 0 ? (
          <Empty text="Nothing logged yet." />
        ) : (
          <ul className="space-y-2">
            {diet.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.amount}
                    {e.mode === "gram" ? " g" : " qty"} · {e.kcal} kcal · {e.protein} g protein
                  </p>
                </div>
                <button
                  aria-label="Delete"
                  onClick={async () => {
                    await api.removeEntry("diet_entries", e.id);
                    refresh();
                    notify("Entry removed");
                  }}
                  className="press text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <GoalPanel settings={settings} />

      <AmountDialog
        open={pending !== null}
        onOpenChange={(v) => !v && setPending(null)}
        title={pending ? `How much ${pending.name}?` : ""}
        label={pending?.mode === "gram" ? "Grams eaten" : "Quantity eaten"}
        suffix={pending?.mode === "gram" ? "g" : "qty"}
        onSubmit={(v) => {
          if (pending) void saveFromTemplate(pending, v);
          setPending(null);
        }}
      />
    </div>
  );
}

function GoalPanel({ settings }: { settings: Settings }) {
  const save = useSaveSettings();
  const [form, setForm] = useState({
    maintenance_kcal: String(settings.maintenance_kcal),
    target_kcal: String(settings.target_kcal),
    target_protein: String(settings.target_protein),
    start_weight: String(settings.start_weight),
    goal: settings.goal,
  });

  return (
    <Panel title="My goal & targets">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Maintenance kcal"
          value={form.maintenance_kcal}
          onChange={(v) => setForm({ ...form, maintenance_kcal: v })}
          type="number"
        />
        <Field
          label="Target kcal / day"
          value={form.target_kcal}
          onChange={(v) => setForm({ ...form, target_kcal: v })}
          type="number"
        />
        <Field
          label="Target protein"
          value={form.target_protein}
          onChange={(v) => setForm({ ...form, target_protein: v })}
          type="number"
          suffix="g"
        />
        <Field
          label="Current weight"
          value={form.start_weight}
          onChange={(v) => setForm({ ...form, start_weight: v })}
          type="number"
          suffix="kg"
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["lose", "maintain", "gain"].map((g) => (
          <button
            key={g}
            onClick={() => setForm({ ...form, goal: g })}
            className={cn(
              "press rounded-xl border py-2 text-xs font-semibold capitalize",
              form.goal === g
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-secondary-foreground",
            )}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <PrimaryButton
          onClick={async () => {
            await save.mutateAsync({
              maintenance_kcal: Number(form.maintenance_kcal),
              target_kcal: Number(form.target_kcal),
              target_protein: Number(form.target_protein),
              start_weight: Number(form.start_weight),
              goal: form.goal,
            });
            notify("Goal saved");
          }}
        >
          Save goal
        </PrimaryButton>
      </div>
    </Panel>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-bold text-primary">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ---------------- add ---------------- */

function AddTab({ date }: { date: string }) {
  const refresh = useRefreshDay(date);
  const { data: settings } = useSettings();
  const { data: day } = useDay(date);
  const [mode, setMode] = useState<"gram" | "qty">("gram");
  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [kcal, setKcal] = useState("");
  const [amount, setAmount] = useState("");

  const unit = mode === "gram" ? "100 g" : "quantity";
  const valid = name.trim() !== "" && amount !== "";

  const save = async (alsoQuick: boolean) => {
    const amt = Number(amount);
    const factor = mode === "gram" ? amt / 100 : amt;
    const p = round(Number(protein || 0) * factor);
    const k = round(Number(kcal || 0) * factor);
    await api.addDietEntry({
      entry_date: date,
      name: name.trim(),
      mode,
      amount: amt,
      protein: p,
      kcal: k,
    });
    if (alsoQuick) {
      await api.addDietTemplate({
        name: name.trim(),
        mode,
        protein_per_unit: Number(protein || 0),
        kcal_per_unit: Number(kcal || 0),
        default_amount: amt,
      });
    }
    let pts: number | undefined;
    if (settings && day) {
      const t = dayTotals(settings, day.diet, [], [], 0);
      pts =
        kcalPoints(t.kcal + k, settings) +
        proteinPoints(t.protein + p, settings) -
        (kcalPoints(t.kcal, settings) + proteinPoints(t.protein, settings));
    }
    refresh();
    notify(`${name.trim()} added`, pts);
    setName("");
    setProtein("");
    setKcal("");
    setAmount("");
  };

  return (
    <Panel title="New diet entry">
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(["gram", "qty"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "press rounded-xl border py-2.5 text-xs font-semibold",
              mode === m
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-secondary-foreground",
            )}
          >
            {m === "gram" ? "Qualitative (per 100 g)" : "Quantitative (per unit)"}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <Field label="What did you eat?" value={name} onChange={setName} placeholder="e.g. Paneer" />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={`Protein / ${unit}`}
            value={protein}
            onChange={setProtein}
            type="number"
            suffix="g"
          />
          <Field label={`Kcal / ${unit}`} value={kcal} onChange={setKcal} type="number" />
        </div>
        <Field
          label={mode === "gram" ? "How many grams did you eat?" : "How many units did you eat?"}
          value={amount}
          onChange={setAmount}
          type="number"
          suffix={mode === "gram" ? "g" : "qty"}
        />
        <PrimaryButton disabled={!valid} onClick={() => void save(false)}>
          Save as entry only
        </PrimaryButton>
        <PrimaryButton variant="ghost" disabled={!valid} onClick={() => void save(true)}>
          <Plus className="mr-1 size-4" /> Save + add to Quick
        </PrimaryButton>
      </div>
    </Panel>
  );
}

/* ---------------- quick ---------------- */

function QuickTab() {
  const { data: templates, refetch } = useDietTemplates();
  const [mode, setMode] = useState<"gram" | "qty">("gram");
  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [kcal, setKcal] = useState("");
  const [amount, setAmount] = useState("");
  const unit = mode === "gram" ? "100 g" : "quantity";

  return (
    <div className="space-y-4">
      <Panel title="Create a quick entry">
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["gram", "qty"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "press rounded-xl border py-2.5 text-xs font-semibold",
                mode === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-secondary-foreground",
              )}
            >
              {m === "gram" ? "Per 100 g" : "Per unit"}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <Field label="Food name" value={name} onChange={setName} placeholder="e.g. Whey scoop" />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={`Protein / ${unit}`}
              value={protein}
              onChange={setProtein}
              type="number"
              suffix="g"
            />
            <Field label={`Kcal / ${unit}`} value={kcal} onChange={setKcal} type="number" />
          </div>
          <Field
            label="Default amount (leave blank to be asked each time)"
            value={amount}
            onChange={setAmount}
            type="number"
            suffix={mode === "gram" ? "g" : "qty"}
          />
          <PrimaryButton
            disabled={!name.trim()}
            onClick={async () => {
              await api.addDietTemplate({
                name: name.trim(),
                mode,
                protein_per_unit: Number(protein || 0),
                kcal_per_unit: Number(kcal || 0),
                default_amount: amount === "" ? null : Number(amount),
              });
              await refetch();
              notify("Quick entry created");
              setName("");
              setProtein("");
              setKcal("");
              setAmount("");
            }}
          >
            <Zap className="mr-1 size-4" /> Create quick entry
          </PrimaryButton>
        </div>
      </Panel>

      <Panel title="Saved quick entries">
        {templates && templates.length > 0 ? (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.kcal_per_unit} kcal · {t.protein_per_unit} g P ·{" "}
                    {t.default_amount == null ? "asks amount" : `${t.default_amount} default`}
                  </p>
                </div>
                <button
                  aria-label="Delete"
                  onClick={async () => {
                    await api.removeTemplate("diet_templates", t.id);
                    await refetch();
                    notify("Quick entry deleted");
                  }}
                  className="press text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No quick entries yet." />
        )}
      </Panel>
    </div>
  );
}

/* ---------------- past ---------------- */

function PastTab({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate || todayStr());
  const [open, setOpen] = useState(false);
  const { data: settings } = useSettings();
  const { data } = useQuery({ queryKey: ["day", date], queryFn: () => fetchDay(date) });

  const totals = settings
    ? dayTotals(settings, data?.diet ?? [], [], [], data?.steps ?? 0)
    : null;

  return (
    <div className="space-y-4">
      <Panel title="Show past records">
        <button
          onClick={() => setOpen(true)}
          className="press w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold"
        >
          {prettyDate(date)} — tap to change date
        </button>
        <DateSheet open={open} onOpenChange={setOpen} value={date} onSelect={setDate} />
      </Panel>

      <Panel title={`Entries · ${prettyDate(date)}`}>
        {(data?.diet.length ?? 0) === 0 ? (
          <Empty text="No entries on this date." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Food</th>
                  <th className="px-2 py-2 text-right">Kcal</th>
                  <th className="px-3 py-2 text-right">Protein</th>
                </tr>
              </thead>
              <tbody>
                {data?.diet.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{e.name}</td>
                    <td className="px-2 py-2 text-right">{e.kcal}</td>
                    <td className="px-3 py-2 text-right">{e.protein} g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totals && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Total label="Total kcal" value={`${totals.kcal}`} />
            <Total label="Total protein" value={`${totals.protein} g`} />
            <Total label="Steps" value={`${totals.steps}`} />
            <Total label="Net kcal (after burn)" value={`${totals.netKcal}`} />
          </div>
        )}
      </Panel>
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
