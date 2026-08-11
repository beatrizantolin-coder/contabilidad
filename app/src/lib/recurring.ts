import type { LedgerDocument, Transaction } from "../types";
import { genId, genSeq } from "./id";
import { nextDate } from "./format";

function seriesKey(t: Transaction): string {
  return [t.accountId, t.name, t.categoryId, t.subcategoryId, t.type, t.amount, t.recurring?.frequency].join("|");
}

/**
 * Para cada serie recurrente (agrupada por cuenta+nombre+categoria+importe+frecuencia),
 * genera la siguiente ocurrencia si su fecha ya se ha cumplido. Se llama repetidas veces
 * (una por cada nueva tanda de `documents`) hasta ponerse al dia, para cubrir el caso de
 * abrir la app tras varios periodos sin usarla.
 */
export function generateDueOccurrences(doc: LedgerDocument, today: string): Transaction[] {
  const txs = doc.transactions;
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
    const nd = nextDate(tx.date, tx.recurring.frequency);
    if (nd > today) return;
    const exists = txs.some(
      (t) =>
        t.date === nd &&
        t.accountId === tx.accountId &&
        t.name === tx.name &&
        t.categoryId === tx.categoryId &&
        t.subcategoryId === tx.subcategoryId &&
        t.type === tx.type &&
        Number(t.amount) === Number(tx.amount),
    );
    if (exists) return;
    additions.push({ ...tx, id: genId(), seq: genSeq(), date: nd, status: "programado" } as Transaction);
  });
  return additions;
}
