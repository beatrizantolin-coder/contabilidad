import type { Account, Category, ID, RecurUnit, RecurringAmountMode, TransactionStatus } from "../types";
import { todayISO } from "./format";

export interface TxDraft {
  id: ID | null;
  linkedGroupId?: ID;
  accountId: ID | null;
  toDocId: ID;
  toAccountId: ID | null;
  date: string;
  name: string;
  comment: string;
  categoryId: ID | null;
  subcategoryId: ID | null;
  subsubcategoryId: ID | null;
  amount: string;
  type: "income" | "expense" | "transfer";
  status: TransactionStatus;
  recurringOn: boolean;
  freqInterval: number;
  freqUnit: RecurUnit;
  recurringEndDate: string;
  /** Si es true, la serie se repite indefinidamente y `recurringEndDate` se ignora. */
  freqNoEnd: boolean;
  /** "fixed" (por defecto): todas las recurrencias usan el mismo importe. "variable": cada ocurrencia hasta fin de ano es personalizable via `overrides`. */
  amountMode: RecurringAmountMode;
  /** Solo con amountMode "variable": importes personalizados por fecha de ocurrencia (ISO -> importe en texto). */
  overrides: Record<string, string>;
}

export function emptyDraft(accounts: Account[], docId: ID, categories: Category[]): TxDraft {
  return {
    id: null,
    accountId: accounts[0]?.id ?? null,
    toDocId: docId,
    toAccountId: accounts[0]?.id ?? null,
    date: todayISO(),
    name: "",
    comment: "",
    categoryId: categories[0]?.id ?? null,
    subcategoryId: null,
    subsubcategoryId: null,
    amount: "",
    type: "expense",
    status: "pendiente",
    recurringOn: false,
    freqInterval: 1,
    freqUnit: "months",
    recurringEndDate: "",
    freqNoEnd: true,
    amountMode: "fixed",
    overrides: {},
  };
}
