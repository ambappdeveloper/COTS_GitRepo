/**
 * The workload counters on the springboard's side panel (v1.1).
 *
 * Pure functions over the same records the dashboard reads, so the two screens can never
 * disagree — the numbers here are the numbers there, not a second interpretation.
 *
 * Only the "due in period" counter is scoped by the year/month selector. Late, due today
 * and due within seven days are measured against today, because that is what those words
 * mean; scoping them to an arbitrary month would silently print zero and read as broken.
 */

import { TODAY, addDays, isOverdue } from "../domain/calc";
import type { IsoDate, RiskItem, Shipment } from "../domain/types";

export interface Period {
  year: number;
  /** 1–12. */
  month: number;
}

export interface CounterRow {
  key: string;
  label: string;
  count: number;
  to: string;
  hint: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export function periodFromIso(d: IsoDate = TODAY): Period {
  const [y, m] = d.split("-");
  return { year: Number(y), month: Number(m) };
}

export function inPeriod(date: IsoDate | undefined, p: Period): boolean {
  if (!date) return false;
  const [y, m] = date.split("-");
  return Number(y) === p.year && Number(m) === p.month;
}

/** Milestones a person could still act on: not done, not ruled out, and dated. */
export function actionableMilestones(shipments: Shipment[]): { shipmentId: string; date: IsoDate }[] {
  return shipments.flatMap((s) =>
    s.milestones
      .filter((m) => m.targetDate && m.state !== "completed" && m.state !== "not_applicable")
      .map((m) => ({ shipmentId: s.id, date: m.targetDate as IsoDate })),
  );
}

export function homeCounters(
  shipments: Shipment[],
  risks: RiskItem[],
  period: Period,
  today: IsoDate = TODAY,
): CounterRow[] {
  const due = actionableMilestones(shipments);
  const sevenDaysOut = addDays(today, 7);

  const late = due.filter((d) => isOverdue(d.date, today)).length;
  const dueToday = due.filter((d) => d.date === today).length;
  const dueSeven = due.filter((d) => d.date > today && d.date <= sevenDaysOut).length;
  const duePeriod = due.filter((d) => inPeriod(d.date, period)).length;
  const open = shipments.filter((s) => s.status !== "closed" && s.status !== "cancelled").length;
  const unacknowledged = risks.filter((r) => !r.acknowledged).length;

  return [
    {
      key: "late",
      label: "Late",
      count: late,
      to: "/exceptions",
      hint: `Milestones with a target date before ${today} that are still open`,
    },
    { key: "today", label: "Today", count: dueToday, to: "/dashboard", hint: "Milestones due today" },
    {
      key: "seven",
      label: "Seven days",
      count: dueSeven,
      to: "/dashboard",
      hint: `Milestones due between tomorrow and ${sevenDaysOut}`,
    },
    {
      key: "period",
      label: `Due in ${monthName(period.month)}`,
      count: duePeriod,
      to: "/dashboard",
      hint: `Milestones with a target date in ${monthName(period.month)} ${period.year}`,
    },
    {
      key: "risks",
      label: "Open risks",
      count: unacknowledged,
      to: "/exceptions",
      hint: "Risks and exceptions nobody has acknowledged",
    },
    {
      key: "open",
      label: "Open shipments",
      count: open,
      to: "/shipments",
      hint: "Shipments that are neither closed nor cancelled",
    },
  ];
}

/** Years offered by the period selector: those the demo milestones actually fall in. */
export function availableYears(shipments: Shipment[], today: IsoDate = TODAY): number[] {
  const years = new Set<number>([periodFromIso(today).year]);
  for (const d of actionableMilestones(shipments)) years.add(Number(d.date.slice(0, 4)));
  for (const s of shipments) {
    for (const m of s.milestones) if (m.actualDate) years.add(Number(m.actualDate.slice(0, 4)));
  }
  return [...years].sort((a, b) => a - b);
}
