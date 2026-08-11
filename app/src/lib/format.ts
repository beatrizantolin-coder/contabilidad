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
