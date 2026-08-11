import type { Account, Category, ID, TransactionStatus } from "../types";
import { todayISO } from "./format";

export interface BulkEditState {
  dateOn: boolean;
  date: string;
  statusOn: boolean;
  status: TransactionStatus;
  accountOn: boolean;
  accountId: ID | null;
  categoryOn: boolean;
  categoryId: ID | null;
  subcategoryId: ID | null;
  subsubcategoryId: ID | null;
}

export function emptyBulkEdit(accounts: Account[], categories: Category[]): BulkEditState {
  return {
    dateOn: false,
    date: todayISO(),
    statusOn: false,
    status: "pendiente",
    accountOn: false,
    accountId: accounts[0]?.id ?? null,
    categoryOn: false,
    categoryId: categories[0]?.id ?? null,
    subcategoryId: null,
    subsubcategoryId: null,
  };
}
