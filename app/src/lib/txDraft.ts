import type { Account, Category, Frequency, ID, TransactionStatus } from "../types";
import { todayISO } from "./format";

export interface TxDraft {
  id: ID | null;
  linkedGroupId?: ID;
  accountId: ID | null;
  toDocId: ID;
  toAccountId: ID | null;
  date: string;
  name: string;
  categoryId: ID | null;
  subcategoryId: ID | null;
  amount: string;
  type: "income" | "expense" | "transfer";
  status: TransactionStatus;
  recurringOn: boolean;
  frequency: Frequency;
}

export function emptyDraft(accounts: Account[], docId: ID, categories: Category[]): TxDraft {
  return {
    id: null,
    accountId: accounts[0]?.id ?? null,
    toDocId: docId,
    toAccountId: accounts[0]?.id ?? null,
    date: todayISO(),
    name: "",
    categoryId: categories[0]?.id ?? null,
    subcategoryId: null,
    amount: "",
    type: "expense",
    status: "pendiente",
    recurringOn: false,
    frequency: "monthly",
  };
}
