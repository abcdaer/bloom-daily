import { Link } from "@tanstack/react-router";
import {
  Apple,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { longDate, prettyDate, shiftDay, toDateStr, todayStr } from "@/lib/tracker";

export function notify(message: string, points?: number) {
  toast.custom(
    () => (
      <div className="surface flex w-[min(88vw,320px)] items-center gap-3 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{message}</p>
          {points !== undefined && (
            <p
              className={cn(
                "text-xs font-semibold",
                points >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {points >= 0 ? "+" : ""}
              {points} points
            </p>
          )}
        </div>
      </div>
    ),
    { duration: 2200 },
  );
}

/* ---------------- date picker ---------------- */

export function DateSheet({
  open,
  onOpenChange,
  value,
  onSelect,
  title = "Choose a date",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: string;
  onSelect: (date: string) => void;
  title?: string;
}) {
  const today = todayStr();
  const quick = [
    { label: "Yesterday", value: shiftDay(today, -1) },
    { label: "Today", value: today },
    { label: "Tomorrow", value: shiftDay(today, 1) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {quick.map((q) => (
            <button
              key={q.label}
              onClick={() => {
                onSelect(q.value);
                onOpenChange(false);
              }}
              className={cn(
                "press rounded-xl border px-2 py-3 text-sm font-semibold",
                value === q.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-secondary-foreground",
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-border p-1">
          <Calendar
            mode="single"
            selected={value ? new Date(`${value}T00:00:00`) : undefined}
            onSelect={(d) => {
              if (!d) return;
              onSelect(toDateStr(d));
              onOpenChange(false);
            }}
            className="mx-auto"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DateBar({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          aria-label="Previous day"
          onClick={() => setDate(shiftDay(date, -1))}
          className="press flex size-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => setOpen(true)}
          className="press flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5"
        >
          <CalendarDays className="size-4 text-primary" />
          <span className="truncate text-sm font-semibold">{prettyDate(date)}</span>
          <span className="truncate text-xs text-muted-foreground">{longDate(date)}</span>
        </button>
        <button
          aria-label="Next day"
          onClick={() => setDate(shiftDay(date, 1))}
          className="press flex size-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <DateSheet open={open} onOpenChange={setOpen} value={date} onSelect={setDate} />
    </>
  );
}

/* ---------------- page chrome ---------------- */

export function PageHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string | undefined;
  icon?: ReactNode | undefined;
}) {
  return (
    <header className="hero-gradient sticky top-0 z-20 rounded-b-3xl px-4 pb-5 pt-4 text-primary-foreground shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="press flex size-9 items-center justify-center rounded-full bg-white/15"
          aria-label="Home"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-bold leading-tight">
            {icon}
            {title}
          </h1>
          {subtitle && <p className="text-xs text-white/75">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

export const SECTION_TABS = [
  { key: "select", label: "Select" },
  { key: "add", label: "Add" },
  { key: "quick", label: "Quick" },
  { key: "past", label: "Past" },
] as const;

export type TabKey = (typeof SECTION_TABS)[number]["key"];

export function TabBar({ value, onChange }: { value: TabKey; onChange: (v: TabKey) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-2xl bg-secondary p-1">
      {SECTION_TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "press rounded-xl py-2 text-xs font-semibold transition-colors",
            value === t.key
              ? "bg-card text-primary shadow-[var(--shadow-soft)]"
              : "text-muted-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="surface p-4">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string | undefined;
  placeholder?: string | undefined;
  suffix?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          value={value}
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-xl bg-background"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = "solid",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "solid" | "ghost";
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "press h-11 w-full rounded-xl text-sm font-semibold",
        variant === "ghost" &&
          "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
      )}
      variant={variant === "solid" ? "default" : "secondary"}
    >
      {children}
    </Button>
  );
}

/* ---------------- bottom nav ---------------- */

const NAV = [
  { to: "/diet", label: "Diet", icon: Apple },
  { to: "/study", label: "Study", icon: BookOpen },
  { to: "/habit", label: "Habit", icon: Repeat },
  { to: "/stats", label: "Stats", icon: BarChart3 },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="press flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold text-muted-foreground data-[status=active]:text-primary"
          >
            <n.icon className="size-5" />
            {n.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function AmountDialog({
  open,
  onOpenChange,
  title,
  label,
  suffix,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  label: string;
  suffix?: string | undefined;
  onSubmit: (value: number) => void;
}) {
  const [val, setVal] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setVal("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-[88vw] rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <Field label={label} value={val} onChange={setVal} type="number" suffix={suffix} />
        <PrimaryButton
          disabled={!val || Number.isNaN(Number(val))}
          onClick={() => {
            onSubmit(Number(val));
            setVal("");
            onOpenChange(false);
          }}
        >
          Save entry
        </PrimaryButton>
      </DialogContent>
    </Dialog>
  );
}

export function useTrackerDate(initial?: string | undefined) {
  const [date, setDate] = useState(initial ?? "");
  useEffect(() => {
    if (!date) setDate(todayStr());
  }, [date]);
  return [date, setDate] as const;
}
