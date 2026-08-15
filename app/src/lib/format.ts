import type { Recurring } from "../types";

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const fmt = (n: number, currency = "EUR"): string =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);

export const shortDate = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return dd + "/" + mm + "/" + yy;
};

export const monthKey = (iso: string): string => iso.slice(0, 7);

export const monthYearLabel = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Rango lunes-domingo de la semana en curso (vista por defecto de la tabla de movimientos). */
export const currentWeekRange = (): { from: string; to: string } => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmtDate(monday), to: fmtDate(sunday) };
};

export const endOfYearISO = (): string => {
  const d = new Date();
  return d.getFullYear() + "-12-31";
};

export const startOfCurrentMonthISO = (): string => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
};

export const startOfCurrentWeekISO = (): string => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
};

export const endOfCurrentWeekISO = (): string => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return d.toISOString().slice(0, 10);
};

/** Ultimo dia del mes que cae `n` meses despues del actual (n=0 => fin de este mes). */
export const endOfNthMonthISO = (n: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + n + 1, 0);
  return d.toISOString().slice(0, 10);
};

export type QuickRangeKey = "1M" | "3M" | "6M" | "1A" | "finDeAno";

/**
 * Rangos rapidos compartidos por Movimientos, Filtros y Prevision de balance:
 * todos empiezan hoy. 1M/3M/6M/1A llegan hasta el ultimo dia del mes N meses
 * despues (1A = mismo mes del ano siguiente); "Fin de ano" llega al 31/12.
 */
export const quickRange = (key: QuickRangeKey): { from: string; to: string } => {
  const from = todayISO();
  if (key === "1M") return { from, to: endOfNthMonthISO(0) };
  if (key === "3M") return { from, to: endOfNthMonthISO(3) };
  if (key === "6M") return { from, to: endOfNthMonthISO(6) };
  if (key === "1A") return { from, to: endOfNthMonthISO(12) };
  return { from, to: endOfYearISO() };
};

export const nextDate = (iso: string, recurring: Recurring): string => {
  const d = new Date(iso + "T00:00:00");
  const interval = Number(recurring.interval) || 1;
  if (recurring.unit === "days") d.setDate(d.getDate() + interval);
  else if (recurring.unit === "years") d.setFullYear(d.getFullYear() + interval);
  else d.setMonth(d.getMonth() + interval);
  return d.toISOString().slice(0, 10);
};

const UNIT_LABELS: Record<Recurring["unit"], [string, string]> = {
  days: ["dia", "dias"],
  months: ["mes", "meses"],
  years: ["ano", "anos"],
};

export const freqLabel = (r: Recurring | null): string => {
  if (!r) return "";
  const labels = UNIT_LABELS[r.unit] || UNIT_LABELS.months;
  const word = Number(r.interval) === 1 ? labels[0] : labels[1];
  return "Cada " + r.interval + " " + word;
};

export const freqPerMonth = (r: Recurring): number => {
  const interval = Number(r.interval) || 1;
  if (r.unit === "days") return 30.44 / interval;
  if (r.unit === "years") return 1 / (interval * 12);
  return 1 / interval;
};
