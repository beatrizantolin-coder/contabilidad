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
  idToAccount: Record<ID, number>;
}

export function computeRunningMaps(accounts: Account[], chronological: Transaction[]): RunningMaps {
  const totalOpening = accounts.reduce((s, a) => s + a.opening, 0);
  const perAccountRunning: Record<ID, number> = {};
  accounts.forEach((a) => (perAccountRunning[a.id] = a.opening));
  let totalRunning = totalOpening;
  const idToTotal: Record<ID, number> = {};
  const idToAccount: Record<ID, number> = {};
  chronological.forEach((t) => {
    const delta = signedDelta(t);
    totalRunning += delta;
    perAccountRunning[t.accountId] = (perAccountRunning[t.accountId] || 0) + delta;
    idToTotal[t.id] = totalRunning;
    idToAccount[t.id] = perAccountRunning[t.accountId];
  });
  return { idToTotal, idToAccount };
}

export function hasLocalSibling(t: Transaction, transactions: Transaction[]): boolean {
  if (t.type !== "transfer_in" || !t.transferGroupId) return false;
  return transactions.some((x) => x.type === "transfer" && x.transferGroupId === t.transferGroupId);
}

export function pairedTransferId(t: Transaction, transactions: Transaction[]): ID {
  if (t.type === "transfer" && t.transferGroupId) {
    const match = transactions.find((x) => x.type === "transfer_in" && x.transferGroupId === t.transferGroupId);
    return match ? match.id : t.id;
  }
  return t.id;
}
