import type { Frequency } from "../types";

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const fmt = (n: number, currency = "EUR"): string =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);

export const shortDate = (iso: string): string =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" });

export const monthKey = (iso: string): string => iso.slice(0, 7);

export const nextDate = (iso: string, freq: Frequency): string => {
  const d = new Date(iso + "T00:00:00");
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};
