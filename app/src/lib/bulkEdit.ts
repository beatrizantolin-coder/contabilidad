import type { Account, Category, ID, TransactionStatus } from "../types";
import { todayISO } from "./format";

export interface BulkEditState {
  date: string;
  status: TransactionStatus;
  accountId: ID | null;
  categoryId: ID | null;
  subcategoryId: ID | null;
  subsubcategoryId: ID | null;
}

export function emptyBulkEdit(accounts: Account[], categories: Category[]): BulkEditState {
  return {
    date: todayISO(),
    status: "pendiente",
    accountId: accounts[0]?.id ?? null,
    categoryId: categories[0]?.id ?? null,
    subcategoryId: null,
    subsubcategoryId: null,
  };
}
