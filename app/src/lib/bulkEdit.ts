import type { Category, ID } from "../types";
import { todayISO } from "./format";

export interface BulkEditState {
  date: string;
  categoryId: ID | null;
  subcategoryId: ID | null;
  subsubcategoryId: ID | null;
}

export function emptyBulkEdit(categories: Category[]): BulkEditState {
  return {
    date: todayISO(),
    categoryId: categories[0]?.id ?? null,
    subcategoryId: null,
    subsubcategoryId: null,
  };
}
