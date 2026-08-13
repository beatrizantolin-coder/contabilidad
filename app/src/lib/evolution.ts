import type { Account, ID, Transaction } from "../types";
import { hasLocalSibling } from "./balances";
import { endOfYearISO, nextDate, todayISO } from "./format";

export interface EvoPoint {
  time: number;
  balance: number;
}

export interface EvoRange {
  from: string;
  to: string;
}

function seriesKey(t: Transaction): string {
  return [t.accountId, t.name, t.categoryId, t.subcategoryId, t.type, t.amount, t.recurring?.interval, t.recurring?.unit].join("|");
}

type EvoEvent = { date: string; time: number } & ({ real: true; balance: number } | { real: false; delta: number });

/**
 * Combina el historico real (hasta el punto de partida del rango) con una
 * proyeccion: cada serie recurrente se extiende, mas alla de su ultima
 * ocurrencia real, hasta el final del rango elegido, sin crear esas
 * ocurrencias como movimientos reales (solo para dibujar la previsión).
 */
export function computeEvoPoints(
  accounts: Account[],
  chronological: Transaction[],
  transactions: Transaction[],
  scopeIds: Set<ID>,
  resultingBalance: (t: Transaction) => number,
  evoRange: EvoRange,
): EvoPoint[] {
  const openingSum = accounts.filter((a) => scopeIds.has(a.id)).reduce((s, a) => s + a.opening, 0);
  const fullSrc = chronological.filter((t) => scopeIds.has(t.accountId) && (t.type !== "transfer_in" || !hasLocalSibling(t, transactions, scopeIds)));

  const rangeFrom = evoRange.from || todayISO();
  const rangeTo = evoRange.to || endOfYearISO();

  let startBalance = openingSum;
  fullSrc.forEach((t) => {
    if (t.date < rangeFrom) startBalance = resultingBalance(t);
  });

  const startTime = new Date(rangeFrom + "T00:00:00").getTime() - 86400000;
  const realInRange = fullSrc.filter((t) => t.date >= rangeFrom && t.date <= rangeTo);

  const seriesLatest = new Map<string, Transaction>();
  transactions.forEach((t) => {
    if (!t.recurring || t.type === "transfer" || t.type === "transfer_in") return;
    if (!scopeIds.has(t.accountId)) return;
    const key = seriesKey(t);
    const current = seriesLatest.get(key);
    if (!current || t.date > current.date) seriesLatest.set(key, t);
  });
  const projected: { date: string; delta: number }[] = [];
  seriesLatest.forEach((tx) => {
    if (!tx.recurring) return;
    let d = nextDate(tx.date, tx.recurring);
    let guard = 0;
    while (d <= rangeTo && guard < 500) {
      if (d >= rangeFrom) projected.push({ date: d, delta: (tx.type === "income" ? 1 : -1) * Number(tx.amount) });
      d = nextDate(d, tx.recurring);
      guard++;
    }
  });

  const realEvents: EvoEvent[] = realInRange.map((t) => ({ date: t.date, time: new Date(t.date + "T00:00:00").getTime(), real: true, balance: resultingBalance(t) }));
  const projectedEvents: EvoEvent[] = projected.map((p) => ({ date: p.date, time: new Date(p.date + "T00:00:00").getTime(), real: false, delta: p.delta }));
  const events: EvoEvent[] = realEvents.concat(projectedEvents).sort((a, b) => (a.date === b.date ? (a.real === b.real ? 0 : a.real ? -1 : 1) : a.date < b.date ? -1 : 1));

  const pts: EvoPoint[] = [{ time: startTime, balance: startBalance }];
  let running = startBalance;
  events.forEach((e) => {
    running = e.real ? e.balance : running + e.delta;
    pts.push({ time: e.time, balance: running });
  });

  const endTime = new Date(rangeTo + "T00:00:00").getTime();
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
