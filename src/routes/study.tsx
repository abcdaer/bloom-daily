import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Trash2, Zap } from "lucide-react";
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
import { api, fetchDay, useDay, useRefreshDay, useStudyTemplates } from "@/lib/db";
import { prettyDate, round, studyPoints, todayStr, type StudyTemplate } from "@/lib/tracker";

export const Route = createFileRoute("/study")({
  head: () => ({
    meta: [
      { title: "Study Tracker — Daily Tracker" },
      { name: "description", content: "Log study topics and hours and earn weighted points." },
      { property: "og:title", content: "Study Tracker — Daily Tracker" },
      { property: "og:description", content: "Log study topics and hours, earn points." },
    ],
  }),
  component: StudyPage,
});

function StudyPage() {
  const [date, setDate] = useTrackerDate();
  const [tab, setTab] = useState<TabKey>("select");
  if (!date) return null;

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        title="Study"
        subtitle="Topics, hours & points"
        icon={<BookOpen className="size-5" />}
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
  const { data: templates } = useStudyTemplates();
  const { data: day } = useDay(date);
  const refresh = useRefreshDay(date);
  const [pending, setPending] = useState<StudyTemplate | null>(null);
  const study = day?.study ?? [];
  const pts = round(studyPoints(study));

  const log = async (t: StudyTemplate, hours: number) => {
    await api.addStudyEntry({ entry_date: date, name: t.name, weight: t.weight, hours });
    refresh();
    notify(`${t.name} · ${hours} h logged`, round(t.weight * hours));
  };

  return (
    <div className="space-y-4">
      <Panel title="Study points today">
        <p className="text-2xl font-bold text-primary">{pts} pts</p>
        <p className="text-xs text-muted-foreground">
          {round(study.reduce((s, e) => s + e.hours, 0))} hours studied · ideal 30 pts
        </p>
      </Panel>

      <Panel title="Tap a topic to log it">
        {templates && templates.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (t.default_hours == null) setPending(t);
                  else void log(t, t.default_hours);
                }}
                className="press rounded-xl border border-border bg-secondary/60 p-3 text-left"
              >
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  weight {t.weight} pts / hour
                </p>
                <p className="mt-1 text-[11px] font-semibold text-primary">
                  {t.default_hours == null
                    ? "Tap → ask hours"
                    : `Tap → ${t.default_hours} h = ${round(t.weight * t.default_hours)} pts`}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <Empty text="No quick topics yet. Create some in the Quick tab." />
        )}
      </Panel>

      <Panel title={`Logged on ${prettyDate(date)}`}>
        {study.length === 0 ? (
          <Empty text="Nothing logged yet." />
        ) : (
          <ul className="space-y-2">
            {study.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.hours} h × {e.weight} = {round(e.hours * e.weight)} pts
                  </p>
                </div>
                <button
                  aria-label="Delete"
                  onClick={async () => {
                    await api.removeEntry("study_entries", e.id);
                    refresh();
                    notify("Entry removed", -round(e.hours * e.weight));
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

      <AmountDialog
        open={pending !== null}
        onOpenChange={(v) => !v && setPending(null)}
        title={pending ? `How long did you study ${pending.name}?` : ""}
        label="Hours studied"
        suffix="h"
        onSubmit={(v) => {
          if (pending) void log(pending, v);
          setPending(null);
        }}
      />
    </div>
  );
}

function AddTab({ date }: { date: string }) {
  const refresh = useRefreshDay(date);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [hours, setHours] = useState("");
  const valid = name.trim() !== "" && hours !== "";

  const save = async (alsoQuick: boolean) => {
    const w = Number(weight || 10);
    const h = Number(hours);
    await api.addStudyEntry({ entry_date: date, name: name.trim(), weight: w, hours: h });
    if (alsoQuick) {
      await api.addStudyTemplate({ name: name.trim(), weight: w, default_hours: h });
    }
    refresh();
    notify(`${name.trim()} logged`, round(w * h));
    setName("");
    setWeight("");
    setHours("");
  };

  return (
    <Panel title="New study entry">
      <div className="space-y-3">
        <Field label="What did you study?" value={name} onChange={setName} placeholder="e.g. DSA" />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Token points / hour"
            value={weight}
            onChange={setWeight}
            type="number"
            placeholder="15"
          />
          <Field label="Hours studied" value={hours} onChange={setHours} type="number" suffix="h" />
        </div>
        <PrimaryButton disabled={!valid} onClick={() => void save(false)}>
          Save as entry only
        </PrimaryButton>
        <PrimaryButton variant="ghost" disabled={!valid} onClick={() => void save(true)}>
          <Zap className="mr-1 size-4" /> Save + add to Quick
        </PrimaryButton>
      </div>
    </Panel>
  );
}

function QuickTab() {
  const { data: templates, refetch } = useStudyTemplates();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [hours, setHours] = useState("");

  return (
    <div className="space-y-4">
      <Panel title="Create a quick topic">
        <div className="space-y-3">
          <Field label="Topic name" value={name} onChange={setName} placeholder="e.g. DSA" />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Token points / hour"
              value={weight}
              onChange={setWeight}
              type="number"
              placeholder="15"
            />
            <Field
              label="Default hours (blank = ask)"
              value={hours}
              onChange={setHours}
              type="number"
              suffix="h"
            />
          </div>
          <PrimaryButton
            disabled={!name.trim()}
            onClick={async () => {
              await api.addStudyTemplate({
                name: name.trim(),
                weight: Number(weight || 10),
                default_hours: hours === "" ? null : Number(hours),
              });
              await refetch();
              notify("Quick topic created");
              setName("");
              setWeight("");
              setHours("");
            }}
          >
            <Zap className="mr-1 size-4" /> Create quick topic
          </PrimaryButton>
        </div>
      </Panel>

      <Panel title="Saved quick topics">
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
                    {t.weight} pts/h ·{" "}
                    {t.default_hours == null ? "asks hours" : `${t.default_hours} h default`}
                  </p>
                </div>
                <button
                  aria-label="Delete"
                  onClick={async () => {
                    await api.removeTemplate("study_templates", t.id);
                    await refetch();
                    notify("Quick topic deleted");
                  }}
                  className="press text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No quick topics yet." />
        )}
      </Panel>
    </div>
  );
}

function PastTab({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate || todayStr());
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["day", date], queryFn: () => fetchDay(date) });
  const study = data?.study ?? [];

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

      <Panel title={`Study · ${prettyDate(date)}`}>
        {study.length === 0 ? (
          <Empty text="No study on this date." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Topic</th>
                  <th className="px-2 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {study.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{e.name}</td>
                    <td className="px-2 py-2 text-right">{e.hours}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">
                      {round(e.hours * e.weight)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-primary/5 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Total hours</p>
            <p className="text-sm font-bold text-primary">
              {round(study.reduce((s, e) => s + e.hours, 0))}
            </p>
          </div>
          <div className="rounded-xl bg-primary/5 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Total points</p>
            <p className="text-sm font-bold text-primary">{round(studyPoints(study))}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
