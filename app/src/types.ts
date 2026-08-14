export type ID = string;

export type AccountType = "checking" | "savings" | "credit" | "cash";

export interface Account {
  id: ID;
  name: string;
  opening: number;
  warning: number;
  type: AccountType;
  /** Solo relevante para tarjetas de credito: cuenta a la que esta asociada. */
  linkedAccountId: ID | null;
}

export type CategoryKind = "expense" | "income" | "transfer";

export interface Subcategory {
  id: ID;
  name: string;
  /** Sin color propio: siempre se deriva del color de la categoría principal (ver lib/color.ts). */
  subcategories: Subcategory[];
}

export interface Category {
  id: ID;
  name: string;
  color: string;
  /** Gasto o ingreso: no se mezclan entre movimientos de distinto tipo. */
  kind: CategoryKind;
  subcategories: Subcategory[];
}

export type TransactionStatus = "reconciliado" | "pendiente" | "programado" | "anulado";

export type RecurUnit = "days" | "months" | "years";

export interface Recurring {
  interval: number;
  unit: RecurUnit;
  /** Si se rellena, la serie deja de generar nuevas ocurrencias a partir de esta fecha (ISO). */
  endDate: string | null;
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
  /** Orden manual dentro de un grupo de empate (mismo valor en la columna de orden activa). Si no está fijado, se usa `seq`. */
  manualRank?: number;
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
  /** Mientras esté vinculada, editar una pata sincroniza la otra. Al desvincular, cada una se edita por separado. */
  linked: boolean;
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
  linked: boolean;
}

export type Transaction = IncomeExpenseTransaction | TransferOutTransaction | TransferInTransaction;

export function isTransferTx(t: Transaction): t is TransferOutTransaction | TransferInTransaction {
  return t.type === "transfer" || t.type === "transfer_in";
}

export interface Budgets {
  [categoryId: string]: number;
}

export interface Filters {
  search: string;
  categories: ID[];
  subcategories: ID[];
  type: "all" | "income" | "expense" | "transfer";
  from: string;
  to: string;
}

/** Saldo no se incluye: no es ordenable (depende del orden cronologico real). */
export type SortColumn = "date" | "status" | "name" | "comment" | "amount";
export interface SortState {
  column: SortColumn;
  dir: "asc" | "desc";
}

export interface SavedFilter {
  id: ID;
  name: string;
  filters: Filters;
}

export interface LedgerDocument {
  id: ID;
  name: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budgets;
  savedFilters: SavedFilter[];
}

export interface Manifest {
  documentIds: ID[];
  activeDocumentId: ID | null;
  /** Ruta en disco recordada por documento, para el botón "Guardar" (guarda directo sin volver a preguntar). */
  savedPaths: Record<ID, string>;
  /** Rutas de documentos abiertos recientemente, mas reciente primero, para Archivo > Abrir Reciente. */
  recentPaths: string[];
  /** Si es true, se salta la ventana de bienvenida al iniciar y se abre directamente el ultimo documento. Por defecto false: la bienvenida se muestra siempre. */
  skipWelcomeOnStart: boolean;
}
