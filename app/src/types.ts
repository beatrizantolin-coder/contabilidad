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
}

export interface Category {
  id: ID;
  name: string;
  color: string;
  subcategories: Subcategory[];
}

export type TransactionStatus = "reconciliado" | "pendiente" | "programado" | "anulado";

export type Frequency = "weekly" | "monthly" | "yearly";

export interface Recurring {
  frequency: Frequency;
}

interface TransactionBase {
  id: ID;
  accountId: ID;
  date: string;
  name: string;
  amount: number;
  status: TransactionStatus;
  recurring: Recurring | null;
}

export interface IncomeExpenseTransaction extends TransactionBase {
  type: "income" | "expense";
  categoryId: ID | null;
  subcategoryId: ID | null;
}

export interface TransferOutTransaction extends TransactionBase {
  type: "transfer";
  categoryId: null;
  subcategoryId: null;
  transferGroupId: ID;
  toAccountId: ID;
  toDocId: ID;
  toLabel: string;
}

export interface TransferInTransaction extends TransactionBase {
  type: "transfer_in";
  categoryId: null;
  subcategoryId: null;
  transferGroupId: ID;
  fromAccountId: ID;
  fromDocId: ID;
  fromLabel: string;
}

export type Transaction = IncomeExpenseTransaction | TransferOutTransaction | TransferInTransaction;

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
