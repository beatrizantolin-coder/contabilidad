import type { Account, ID, Transaction } from "../types";
import { hasLocalSibling } from "./balances";
import { todayISO } from "./format";

export interface EvoPoint {
  time: number;
  balance: number;
}

export interface EvoRange {
  from: string;
  to: string;
}

export function computeEvoPoints(
  accounts: Account[],
  chronological: Transaction[],
  transactions: Transaction[],
  scopeIds: Set<ID>,
  resultingBalance: (t: Transaction) => number,
  evoRange: EvoRange,
): EvoPoint[] {
  const openingSum = accounts.filter((a) => scopeIds.has(a.id)).reduce((s, a) => s + a.opening, 0);
  const fullSrc = chronological.filter((t) => scopeIds.has(t.accountId) && (t.type !== "transfer_in" || !hasLocalSibling(t, transactions)));
  if (fullSrc.length === 0) return [];

  const rangeFrom = evoRange.from || null;
  const rangeTo = evoRange.to || null;

  let startBalance = openingSum;
  fullSrc.forEach((t) => {
    if (!rangeFrom || t.date < rangeFrom) startBalance = resultingBalance(t);
  });

  const effectiveFrom = rangeFrom || fullSrc[0].date;
  const startTime = new Date(effectiveFrom + "T00:00:00").getTime() - 86400000;
  const inRange = fullSrc.filter((t) => (!rangeFrom || t.date >= rangeFrom) && (!rangeTo || t.date <= rangeTo));

  const pts: EvoPoint[] = [{ time: startTime, balance: startBalance }];
  inRange.forEach((t) => {
    pts.push({ time: new Date(t.date + "T00:00:00").getTime(), balance: resultingBalance(t) });
  });

  const endTime = rangeTo ? new Date(rangeTo + "T00:00:00").getTime() : new Date(todayISO() + "T00:00:00").getTime();
  if (endTime > pts[pts.length - 1].time) pts.push({ time: endTime, balance: pts[pts.length - 1].balance });
  return pts;
}

export interface EvoTick {
  time: number;
  label: string;
}

export function computeEvoTicks(points: EvoPoint[]): EvoTick[] {
  if (points.length === 0) return [];
  const minT = points[0].time;
  const maxT = points[points.length - 1].time;
  const span = maxT - minT || 1;
  const monthsSpan = Math.max(1, Math.round(span / (30 * 86400000)));
  const step = Math.max(1, Math.ceil(monthsSpan / 10));
  const ticks: EvoTick[] = [];
  const d = new Date(minT);
  d.setDate(1);
  while (d.getTime() <= maxT) {
    ticks.push({ time: d.getTime(), label: d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }) });
    d.setMonth(d.getMonth() + step);
  }
  return ticks;
}
