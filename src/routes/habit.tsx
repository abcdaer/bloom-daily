import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Repeat, ThumbsDown, ThumbsUp, Trash2, Zap } from "lucide-react";
import { useState } from "react";

import {
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
import { api, fetchDay, useDay, useHabitTemplates, useRefreshDay } from "@/lib/db";
import { habitPoints, prettyDate, todayStr } from "@/lib/tracker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/habit")({
  head: () => ({
    meta: [
      { title: "Habit Tracker — Daily Tracker" },
      { name: "description", content: "Tap to log good and bad habits and earn daily points." },
      { property: "og:title", content: "Habit Tracker — Daily Tracker" },
      { property: "og:description", content: "Tap to log good and bad habits every day." },
    ],
  }),
  component: HabitPage,
});

function HabitPage() {
  const [date, setDate] = useTrackerDate();
  const [tab, setTab] = useState<TabKey>("select");
  if (!date) return null;

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        title="Habits"
        subtitle="Good in, bad out"
        icon={<Repeat className="size-5" />}
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

function SelectTab({ date }: { date: string }) {
  const { data: templates } = useHabitTemplates();
  const { data: day } = useDay(date);
  const refresh = useRefreshDay(date);
  const habits = day?.habits ?? [];
  const pts = habitPoints(habits);

  const log = async (name: string, kind: string) => {
    await api.addHabitEntry({ entry_date: date, name, kind });
    refresh();
    notify(`${name} logged`, kind === "good" ? 10 : -10);
  };

  return (
    <div className="space-y-4">
      <Panel title="Habit points today">
        <p
          className={cn(
            "text-2xl font-bold",
            pts >= 0 ? "text-success" : "text-destructive",
          )}
        >
          {pts >= 0 ? "+" : ""}
          {pts} pts
        </p>
        <p className="text-xs text-muted-foreground">
          {habits.filter((h) => h.kind === "good").length} good ·{" "}
          {habits.filter((h) => h.kind === "bad").length} bad
        </p>
      </Panel>

      <Panel title="Tap a habit to mark it done">
        {templates && templates.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => void log(t.name, t.kind)}
                className={cn(
                  "press rounded-xl border p-3 text-left",
                  t.kind === "good"
                    ? "border-success/40 bg-success/10"
                    : "border-destructive/40 bg-destructive/10",
                )}
              >
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 text-[11px] font-semibold",
                    t.kind === "good" ? "text-success" : "text-destructive",
                  )}
                >
                  {t.kind === "good" ? (
                    <ThumbsUp className="size-3" />
                  ) : (
                    <ThumbsDown className="size-3" />
                  )}
                  {t.kind === "good" ? "+10 pts" : "-10 pts"}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <Empty text="No quick habits yet. Create some in the Quick tab." />
        )}
      </Panel>

      <Panel title={`Logged on ${prettyDate(date)}`}>
        {habits.length === 0 ? (
          <Empty text="Nothing logged yet." />
        ) : (
          <ul className="space-y-2">
            {habits.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{h.name}</p>
                  <p
                    className={cn(
                      "text-[11px] font-semibold",
                      h.kind === "good" ? "text-success" : "text-destructive",
                    )}
                  >
                    {h.kind === "good" ? "+10" : "-10"} pts
                  </p>
                </div>
                <button
                  aria-label="Delete"
                  onClick={async () => {
                    await api.removeEntry("habit_entries", h.id);
                    refresh();
                    notify("Entry removed", h.kind === "good" ? -10 : 10);
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
    </div>
  );
}

function KindPicker({ kind, setKind }: { kind: string; setKind: (k: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {["good", "bad"].map((k) => (
        <button
          key={k}
          onClick={() => setKind(k)}
          className={cn(
            "press rounded-xl border py-2.5 text-xs font-semibold capitalize",
            kind === k
              ? k === "good"
                ? "border-success bg-success text-success-foreground"
                : "border-destructive bg-destructive text-destructive-foreground"
              : "border-border bg-secondary text-secondary-foreground",
          )}
        >
          {k} habit
        </button>
      ))}
    </div>
  );
}

function AddTab({ date }: { date: string }) {
  const refresh = useRefreshDay(date);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("good");

  const save = async (alsoQuick: boolean) => {
    await api.addHabitEntry({ entry_date: date, name: name.trim(), kind });
    if (alsoQuick) await api.addHabitTemplate({ name: name.trim(), kind });
    refresh();
    notify(`${name.trim()} logged`, kind === "good" ? 10 : -10);
    setName("");
  };

  return (
    <Panel title="New habit entry">
      <div className="space-y-3">
        <Field
          label="Habit name"
          value={name}
          onChange={setName}
          placeholder="e.g. Morning walk"
        />
        <KindPicker kind={kind} setKind={setKind} />
        <PrimaryButton disabled={!name.trim()} onClick={() => void save(false)}>
          Save as entry only
        </PrimaryButton>
        <PrimaryButton variant="ghost" disabled={!name.trim()} onClick={() => void save(true)}>
          <Zap className="mr-1 size-4" /> Save + add to Quick
        </PrimaryButton>
      </div>
    </Panel>
  );
}

function QuickTab() {
  const { data: templates, refetch } = useHabitTemplates();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("good");

  return (
    <div className="space-y-4">
      <Panel title="Create a quick habit">
        <div className="space-y-3">
          <Field label="Habit name" value={name} onChange={setName} placeholder="e.g. No sugar" />
          <KindPicker kind={kind} setKind={setKind} />
          <PrimaryButton
            disabled={!name.trim()}
            onClick={async () => {
              await api.addHabitTemplate({ name: name.trim(), kind });
              await refetch();
              notify("Quick habit created");
              setName("");
            }}
          >
            <Zap className="mr-1 size-4" /> Create quick habit
          </PrimaryButton>
        </div>
      </Panel>

      <Panel title="Saved quick habits">
        {templates && templates.length > 0 ? (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p
                    className={cn(
                      "text-[11px] font-semibold",
                      t.kind === "good" ? "text-success" : "text-destructive",
                    )}
                  >
                    {t.kind === "good" ? "Good · +10" : "Bad · -10"}
                  </p>
                </div>
                <button
                  aria-label="Delete"
                  onClick={async () => {
                    await api.removeTemplate("habit_templates", t.id);
                    await refetch();
                    notify("Quick habit deleted");
                  }}
                  className="press text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No quick habits yet." />
        )}
      </Panel>
    </div>
  );
}

function PastTab({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate || todayStr());
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["day", date], queryFn: () => fetchDay(date) });
  const habits = data?.habits ?? [];

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

      <Panel title={`Habits · ${prettyDate(date)}`}>
        {habits.length === 0 ? (
          <Empty text="No habits on this date." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Habit</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{h.name}</td>
                    <td className="px-2 py-2 capitalize">{h.kind}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold",
                        h.kind === "good" ? "text-success" : "text-destructive",
                      )}
                    >
                      {h.kind === "good" ? "+10" : "-10"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 rounded-xl bg-primary/5 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Total habit points</p>
          <p className="text-sm font-bold text-primary">{habitPoints(habits)}</p>
        </div>
      </Panel>
    </div>
  );
}
