import type { Account, AccountType, Category, CategoryKind, Filters, LedgerDocument, Recurring, SavedFilter, Subcategory, Transaction, TransactionStatus } from "../types";
import { genSeq } from "./id";

/* eslint-disable @typescript-eslint/no-explicit-any */

function migrateSubcategory(raw: any): Subcategory {
  return {
    id: raw.id,
    name: raw.name,
    subcategories: Array.isArray(raw.subcategories) ? raw.subcategories.map(migrateSubcategory) : [],
  };
}

function migrateCategory(raw: any): Category {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color,
    kind: (raw.kind as CategoryKind) || "expense",
    subcategories: Array.isArray(raw.subcategories) ? raw.subcategories.map(migrateSubcategory) : [],
  };
}

function migrateRecurring(raw: any): Recurring | null {
  if (!raw) return null;
  const endDate = typeof raw.endDate === "string" ? raw.endDate : null;
  if (typeof raw.interval === "number" && typeof raw.unit === "string") {
    return { interval: raw.interval, unit: raw.unit, endDate };
  }
  // Formato antiguo: { frequency: "monthly" | "weekly" | "yearly" }
  if (raw.frequency === "weekly") return { interval: 7, unit: "days", endDate };
  if (raw.frequency === "yearly") return { interval: 1, unit: "years", endDate };
  return { interval: 1, unit: "months", endDate };
}

function migrateAccount(raw: any): Account {
  return {
    id: raw.id,
    name: raw.name,
    opening: Number(raw.opening) || 0,
    warning: Number(raw.warning) || 0,
    type: (raw.type as AccountType) || "checking",
    linkedAccountId: raw.linkedAccountId ?? null,
  };
}

function migrateTransaction(raw: any): Transaction {
  const base = {
    id: raw.id,
    seq: typeof raw.seq === "number" ? raw.seq : genSeq(),
    accountId: raw.accountId,
    date: raw.date,
    name: raw.name,
    comment: typeof raw.comment === "string" ? raw.comment : "",
    amount: raw.amount,
    status: (raw.status as TransactionStatus) || "pendiente",
    recurring: migrateRecurring(raw.recurring),
    manualRank: typeof raw.manualRank === "number" ? raw.manualRank : undefined,
  };
  if (raw.type === "transfer" || raw.type === "transfer_in") {
    return { ...raw, ...base, categoryId: null, subcategoryId: null, subsubcategoryId: null, linked: raw.linked !== false } as Transaction;
  }
  return {
    ...base,
    type: raw.type,
    categoryId: raw.categoryId ?? null,
    subcategoryId: raw.subcategoryId ?? null,
    subsubcategoryId: raw.subsubcategoryId ?? null,
  } as Transaction;
}

function migrateFilters(raw: any): Filters {
  return {
    search: typeof raw?.search === "string" ? raw.search : "",
    categories: Array.isArray(raw?.categories) ? raw.categories : [],
    subcategories: Array.isArray(raw?.subcategories) ? raw.subcategories : [],
    type: raw?.type === "income" || raw?.type === "expense" || raw?.type === "transfer" ? raw.type : "all",
    from: typeof raw?.from === "string" ? raw.from : "",
    to: typeof raw?.to === "string" ? raw.to : "",
  };
}

function migrateSavedFilter(raw: any): SavedFilter {
  return { id: raw.id, name: raw.name, filters: migrateFilters(raw.filters) };
}

/**
 * Normaliza un documento tal como viene del disco (que puede ser de una
 * versión anterior del formato: categorías de 2 niveles, recurrencia con
 * `frequency` fija, sin `comment`/`subsubcategoryId`/`kind`/`linkedAccountId`/
 * `savedFilters`) al esquema actual. Se aplica siempre al cargar, sea el
 * documento viejo o nuevo.
 */
export function migrateDocument(raw: any): LedgerDocument {
  return {
    id: raw.id,
    name: raw.name,
    accounts: Array.isArray(raw.accounts) ? raw.accounts.map(migrateAccount) : [],
    categories: Array.isArray(raw.categories) ? raw.categories.map(migrateCategory) : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions.map(migrateTransaction) : [],
    budgets: raw.budgets && typeof raw.budgets === "object" ? raw.budgets : {},
    savedFilters: Array.isArray(raw.savedFilters) ? raw.savedFilters.map(migrateSavedFilter) : [],
  };
}
