export type ID = string;

export type AccountType = "checking" | "savings" | "credit";

export interface Account {
  id: ID;
  name: string;
  opening: number;
  warning: number;
  type: AccountType;
}

export interface Subcategory {
  id: ID;
  name: string;
  color: string;
  /** Sub-subcategorías (solo se usa un nivel más en la UI). */
  subcategories: Subcategory[];
}

export interface Category {
  id: ID;
  name: string;
  color: string;
  subcategories: Subcategory[];
}

export type TransactionStatus = "reconciliado" | "pendiente" | "programado" | "anulado";

export type RecurUnit = "days" | "months" | "years";

export interface Recurring {
  interval: number;
  unit: RecurUnit;
}

interface TransactionBase {
  id: ID;
  /** Orden de creación, usado para desempatar movimientos con la misma fecha. */
  seq: number;
  accountId: ID;
  date: string;
  name: string;
  comment: string;
  amount: number;
  status: TransactionStatus;
  recurring: Recurring | null;
}

export interface IncomeExpenseTransaction extends TransactionBase {
  type: "income" | "expense";
  categoryId: ID | null;
  subcategoryId: ID | null;
  subsubcategoryId: ID | null;
}

export interface TransferOutTransaction extends TransactionBase {
  type: "transfer";
  categoryId: null;
  subcategoryId: null;
  subsubcategoryId: null;
  transferGroupId: ID;
  toAccountId: ID;
  toDocId: ID;
  toLabel: string;
}

export interface TransferInTransaction extends TransactionBase {
  type: "transfer_in";
  categoryId: null;
  subcategoryId: null;
  subsubcategoryId: null;
  transferGroupId: ID;
  fromAccountId: ID;
  fromDocId: ID;
  fromLabel: string;
}

export type Transaction = IncomeExpenseTransaction | TransferOutTransaction | TransferInTransaction;

export function isTransferTx(t: Transaction): t is TransferOutTransaction | TransferInTransaction {
  return t.type === "transfer" || t.type === "transfer_in";
}

export interface Budgets {
  [categoryId: string]: number;
}

export interface LedgerDocument {
  id: ID;
  name: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budgets;
}

export interface Manifest {
  documentIds: ID[];
  activeDocumentId: ID | null;
}
