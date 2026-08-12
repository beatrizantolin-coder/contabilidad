import type { Account, ID, Transaction } from "../types";

function signedDelta(t: Transaction): number {
  if (t.status === "anulado") return 0;
  const amt = Number(t.amount);
  if (t.type === "income") return amt;
  if (t.type === "expense") return -amt;
  if (t.type === "transfer") return -amt;
  return amt; // transfer_in
}

export function computeBalances(accounts: Account[], transactions: Transaction[]): Record<ID, number> {
  const map: Record<ID, number> = {};
  accounts.forEach((a) => (map[a.id] = a.opening));
  transactions.forEach((t) => {
    map[t.accountId] = (map[t.accountId] || 0) + signedDelta(t);
  });
  return map;
}

export function computeChronological(transactions: Transaction[]): Transaction[] {
  return transactions
    .slice()
    .sort((a, b) => (a.date === b.date ? a.seq - b.seq : a.date < b.date ? -1 : 1));
}

export interface RunningMaps {
  idToTotal: Record<ID, number>;
}

/**
 * Saldo encadenado cronológico, acumulado solo sobre las cuentas incluidas
 * en `scopeIds` (el conjunto de cuentas seleccionadas en la barra lateral;
 * "todas las cuentas" se representa pasando el conjunto completo).
 */
export function computeRunningMaps(accounts: Account[], chronological: Transaction[], scopeIds: Set<ID>): RunningMaps {
  const totalOpening = accounts.filter((a) => scopeIds.has(a.id)).reduce((s, a) => s + a.opening, 0);
  let totalRunning = totalOpening;
  const idToTotal: Record<ID, number> = {};
  chronological.forEach((t) => {
    if (scopeIds.has(t.accountId)) totalRunning += signedDelta(t);
    idToTotal[t.id] = totalRunning;
  });
  return { idToTotal };
}

export function hasLocalSibling(t: Transaction, transactions: Transaction[]): boolean {
  if (t.type !== "transfer_in" || !t.transferGroupId) return false;
  return transactions.some((x) => x.type === "transfer" && x.transferGroupId === t.transferGroupId);
}

/**
 * Id de movimiento a usar para leer el saldo encadenado de una transferencia:
 * si ambos extremos estan dentro del alcance seleccionado, se usa el id del
 * leg de entrada (para no contar el movimiento dos veces en la misma
 * columna); si no, cada leg lee su propio saldo acumulado.
 */
export function pairedTransferId(t: Transaction, transactions: Transaction[], scopeIds: Set<ID>): ID {
  if (t.type === "transfer" && t.transferGroupId) {
    const match = transactions.find((x) => x.type === "transfer_in" && x.transferGroupId === t.transferGroupId);
    if (match && scopeIds.has(t.accountId) && scopeIds.has(match.accountId)) return match.id;
  }
  return t.id;
}
