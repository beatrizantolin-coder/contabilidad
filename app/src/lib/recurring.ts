import { isTransferTx, type LedgerDocument, type Recurring, type Transaction } from "../types";
import { genId, genSeq } from "./id";
import { currentWeekRange, endOfNthMonthISO, endOfYearISO, nextDate, startOfCurrentMonthISO } from "./format";

/** Importe efectivo de una ocurrencia: el personalizado para esa fecha si existe, si no el predeterminado. */
export function occurrenceAmount(defaultAmount: number, recurring: Recurring | null, date: string): number {
  const entry = recurring?.customAmounts.find((e) => e.date === date);
  return entry ? entry.amount : defaultAmount;
}

/** Una serie es "Variable" (algun importe personalizado por fecha) frente a "Fija" (siempre el mismo importe). */
export function isVariableSeries(recurring: Recurring | null): boolean {
  return !!recurring && recurring.customAmounts.length > 0;
}

/** Fechas de las proximas ocurrencias de una serie, desde `fromDate` (excluida) hasta `untilISO` inclusive. */
export function upcomingOccurrenceDates(fromDate: string, recurring: Recurring, untilISO: string = endOfYearISO()): string[] {
  const dates: string[] = [];
  let d = nextDate(fromDate, recurring);
  let guard = 0;
  while (d <= untilISO && guard < 500) {
    if (recurring.endDate && d > recurring.endDate) break;
    dates.push(d);
    d = nextDate(d, recurring);
    guard++;
  }
  return dates;
}

/** Clave de agrupacion de una serie recurrente (cuenta+nombre+categoria+importe+frecuencia). Usada de forma consistente en todos los calculos relacionados con el Programador: generacion automatica, contadores y al detener una serie. */
export function seriesKey(t: Transaction): string {
  return [t.accountId, t.name, t.categoryId, t.subcategoryId, t.type, t.amount, t.recurring?.interval, t.recurring?.unit].join("|");
}

/**
 * Para cada serie recurrente (agrupada por cuenta+nombre+categoria+importe+frecuencia),
 * genera la siguiente ocurrencia si su fecha cae dentro de la semana en curso (ya vencida
 * o todavia por llegar esta semana). Las ocurrencias mas lejanas en el futuro no se crean
 * todavia como movimiento real; el Programador las muestra igualmente como prevision.
 * Se llama repetidas veces (una por cada nueva tanda de `documents`) hasta ponerse al dia,
 * para cubrir el caso de abrir la app tras varios periodos sin usarla.
 */
export function generateDueOccurrences(doc: LedgerDocument): Transaction[] {
  const txs = doc.transactions;
  const weekLimit = currentWeekRange().to;
  const seriesMax = new Map<string, Transaction>();
  txs.forEach((t) => {
    if (!t.recurring || t.type === "transfer" || t.type === "transfer_in") return;
    const key = seriesKey(t);
    const current = seriesMax.get(key);
    if (!current || t.date > current.date) seriesMax.set(key, t);
  });

  const additions: Transaction[] = [];
  seriesMax.forEach((tx) => {
    if (!tx.recurring) return;
    const nd = nextDate(tx.date, tx.recurring);
    if (nd > weekLimit) return;
    if (tx.recurring.endDate && nd > tx.recurring.endDate) return;
    // Importe fijo: siempre el predeterminado de la serie. Variable: el
    // personalizado para esta fecha si existe, si no tambien el predeterminado.
    const ndAmount = occurrenceAmount(Number(tx.amount), tx.recurring, nd);
    const exists = txs.some(
      (t) =>
        t.date === nd &&
        t.accountId === tx.accountId &&
        t.name === tx.name &&
        t.categoryId === tx.categoryId &&
        t.subcategoryId === tx.subcategoryId &&
        t.type === tx.type,
    );
    if (exists) return;
    additions.push({ ...tx, id: genId(), seq: genSeq(), date: nd, amount: ndAmount, status: "programado" } as Transaction);
  });
  return additions;
}

export interface ProgramadorMonthStats {
  income: number;
  expense: number;
}

/**
 * Proyecta, para cada serie recurrente, todas sus ocurrencias (real ancla +
 * futuras) que caen dentro del mes en curso, y suma su importe por tipo.
 * A diferencia de `computeProgramadorRows` (una fila por serie), aqui se
 * enumeran todas las ocurrencias del mes: una serie diaria puede aportar
 * varias.
 */
export function computeProgramadorMonthStats(transactions: Transaction[]): ProgramadorMonthStats {
  const start = startOfCurrentMonthISO();
  const end = endOfNthMonthISO(0);
  const latestBySeries = new Map<string, Transaction>();
  transactions.forEach((t) => {
    if (!t.recurring || t.type === "transfer" || t.type === "transfer_in") return;
    const key = seriesKey(t);
    const current = latestBySeries.get(key);
    if (!current || t.date > current.date) latestBySeries.set(key, t);
  });

  let income = 0;
  let expense = 0;
  latestBySeries.forEach((tx) => {
    const recurring = tx.recurring as Recurring;
    let d = tx.date;
    if (d >= start && d <= end) {
      const amt = occurrenceAmount(Number(tx.amount), recurring, d);
      if (tx.type === "income") income += amt;
      else expense += amt;
    }
    let guard = 0;
    while (guard < 60) {
      d = nextDate(d, recurring);
      guard++;
      if (recurring.endDate && d > recurring.endDate) break;
      if (d > end) break;
      if (d >= start) {
        const amt = occurrenceAmount(Number(tx.amount), recurring, d);
        if (tx.type === "income") income += amt;
        else expense += amt;
      }
    }
  });
  return { income, expense };
}

export interface ProgramadorRow {
  /** true = ocurrencia real ya generada (editable/eliminable), false = mera prevision de la proxima fecha. */
  real: boolean;
  tx: Transaction;
  date: string;
}

/**
 * Una fila por serie recurrente: si la ultima ocurrencia de la serie sigue
 * "programada" (dentro de la semana en curso), se muestra esa, editable. Si
 * no (la ultima ya vencio y paso a pendiente, o no se ha generado todavia),
 * se muestra una prevision atenuada con la fecha teorica siguiente.
 */
export function computeProgramadorRows(transactions: Transaction[]): ProgramadorRow[] {
  const latestBySeries = new Map<string, Transaction>();
  transactions.forEach((t) => {
    if (!t.recurring || t.type === "transfer" || t.type === "transfer_in") return;
    const key = seriesKey(t);
    const current = latestBySeries.get(key);
    if (!current || t.date > current.date) latestBySeries.set(key, t);
  });
  return Array.from(latestBySeries.values()).map((anchor) => {
    if (anchor.status === "programado") return { real: true, tx: anchor, date: anchor.date };
    return { real: false, tx: anchor, date: nextDate(anchor.date, anchor.recurring as Recurring) };
  });
}

/**
 * Aplica, para un documento, las dos transiciones automaticas ligadas a la
 * fecha de hoy: (1) cualquier movimiento "programado" cuya fecha ya llego
 * pasa a "pendiente" (ya no es solo un plan futuro), y (2) se generan las
 * siguientes ocurrencias vencidas de cada serie recurrente. Devuelve el
 * nuevo array de transacciones, o `null` si no habia nada que cambiar.
 */
export function applyRecurringDueLogic(doc: LedgerDocument, today: string): Transaction[] | null {
  let txs = doc.transactions;
  let changed = false;

  const dueFlip = txs.filter((t) => t.status === "programado" && t.date <= today);
  if (dueFlip.length > 0) {
    const flipIds = new Set(dueFlip.map((t) => t.id));
    const flipGroupIds = new Set(dueFlip.filter(isTransferTx).map((t) => t.transferGroupId));
    txs = txs.map((t) => (flipIds.has(t.id) || (isTransferTx(t) && flipGroupIds.has(t.transferGroupId)) ? { ...t, status: "pendiente" } : t));
    changed = true;
  }

  const additions = generateDueOccurrences({ ...doc, transactions: txs });
  if (additions.length > 0) {
    txs = txs.concat(additions);
    changed = true;
  }

  return changed ? txs : null;
}
