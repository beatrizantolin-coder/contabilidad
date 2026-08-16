import type { ID, Transaction, TransactionStatus } from "../types";

/** Marca un campo cuyo valor difiere entre los movimientos seleccionados ("Varios valores"), hasta que el usuario lo edite explicitamente. */
export const MIXED = "__mixed__" as const;
export type Mixed = typeof MIXED;

export interface BulkEditState {
  accountId: ID | Mixed;
  status: TransactionStatus | Mixed;
  date: string | Mixed;
  amount: number | Mixed;
  categoryId: ID | null | Mixed;
  subcategoryId: ID | null | Mixed;
  subsubcategoryId: ID | null | Mixed;
  comment: string | Mixed;
}

export type BulkEditField = keyof BulkEditState;

function pick<T>(selected: Transaction[], getter: (t: Transaction) => T): T | Mixed {
  const values = selected.map(getter);
  return values.every((v) => v === values[0]) ? values[0] : MIXED;
}

/** Construye el borrador inicial de edicion en masa: cada campo toma el valor comun a todos los movimientos seleccionados, o MIXED si difieren. */
export function computeBulkEditDraft(selected: Transaction[]): BulkEditState {
  return {
    accountId: pick(selected, (t) => t.accountId),
    status: pick(selected, (t) => t.status),
    date: pick(selected, (t) => t.date),
    amount: pick(selected, (t) => Number(t.amount)),
    categoryId: pick(selected, (t) => t.categoryId),
    subcategoryId: pick(selected, (t) => t.subcategoryId),
    subsubcategoryId: pick(selected, (t) => t.subsubcategoryId),
    comment: pick(selected, (t) => t.comment || ""),
  };
}

/** Estado inicial antes de abrir la edicion en masa por primera vez (nunca se renderiza tal cual: openBulkEdit siempre lo repone con computeBulkEditDraft). */
export function emptyBulkEditState(): BulkEditState {
  return { accountId: MIXED, status: MIXED, date: MIXED, amount: MIXED, categoryId: MIXED, subcategoryId: MIXED, subsubcategoryId: MIXED, comment: MIXED };
}
