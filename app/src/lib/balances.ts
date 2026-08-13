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

/**
 * Solo se considera "con hermano local visible" cuando la pata de salida
 * tambien esta dentro del alcance seleccionado: si se ve el documento
 * completo (o ambas cuentas), basta una fila para representar la
 * transferencia; pero si el alcance es solo la cuenta de destino, la pata
 * de entrada debe mostrarse porque es la unica visible en ese alcance.
 */
export function hasLocalSibling(t: Transaction, transactions: Transaction[], scopeIds: Set<ID>): boolean {
  if (t.type !== "transfer_in" || !t.transferGroupId) return false;
  return transactions.some((x) => x.type === "transfer" && x.transferGroupId === t.transferGroupId && scopeIds.has(x.accountId));
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
