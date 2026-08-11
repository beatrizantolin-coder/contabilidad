import type { Account, AccountType, Category, LedgerDocument, Recurring, Subcategory, Transaction, TransactionStatus } from "../types";
import { genSeq } from "./id";

/* eslint-disable @typescript-eslint/no-explicit-any */

function migrateSubcategory(raw: any): Subcategory {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color,
    subcategories: Array.isArray(raw.subcategories) ? raw.subcategories.map(migrateSubcategory) : [],
  };
}

function migrateCategory(raw: any): Category {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color,
    subcategories: Array.isArray(raw.subcategories) ? raw.subcategories.map(migrateSubcategory) : [],
  };
}

function migrateRecurring(raw: any): Recurring | null {
  if (!raw) return null;
  if (typeof raw.interval === "number" && typeof raw.unit === "string") {
    return { interval: raw.interval, unit: raw.unit };
  }
  // Formato antiguo: { frequency: "monthly" | "weekly" | "yearly" }
  if (raw.frequency === "weekly") return { interval: 7, unit: "days" };
  if (raw.frequency === "yearly") return { interval: 1, unit: "years" };
  return { interval: 1, unit: "months" };
}

function migrateAccount(raw: any): Account {
  return {
    id: raw.id,
    name: raw.name,
    opening: Number(raw.opening) || 0,
    warning: Number(raw.warning) || 0,
    type: (raw.type as AccountType) || "checking",
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
  };
  if (raw.type === "transfer" || raw.type === "transfer_in") {
    return { ...raw, ...base, categoryId: null, subcategoryId: null, subsubcategoryId: null } as Transaction;
  }
  return {
    ...base,
    type: raw.type,
    categoryId: raw.categoryId ?? null,
    subcategoryId: raw.subcategoryId ?? null,
    subsubcategoryId: raw.subsubcategoryId ?? null,
  } as Transaction;
}

/**
 * Normaliza un documento tal como viene del disco (que puede ser de una
 * versión anterior del formato: categorías de 2 niveles, recurrencia con
 * `frequency` fija, sin `comment`/`subsubcategoryId`) al esquema actual.
 * Se aplica siempre al cargar, sea el documento viejo o nuevo.
 */
export function migrateDocument(raw: any): LedgerDocument {
  return {
    id: raw.id,
    name: raw.name,
    accounts: Array.isArray(raw.accounts) ? raw.accounts.map(migrateAccount) : [],
    categories: Array.isArray(raw.categories) ? raw.categories.map(migrateCategory) : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions.map(migrateTransaction) : [],
    budgets: raw.budgets && typeof raw.budgets === "object" ? raw.budgets : {},
  };
}
