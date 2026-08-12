import type { LedgerDocument, Transaction } from "../types";
import { genId, genSeq } from "./id";
import { PALETTE } from "../theme";

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Documento de muestra con cuentas, categorías y movimientos de ejemplo,
 * usado únicamente cuando el usuario elige explícitamente "Abrir un
 * documento de prueba" en la pantalla de bienvenida. Nunca se usa como
 * semilla de un documento nuevo en blanco.
 */
export function createTestDocument(): LedgerDocument {
  const docId = genId();

  const checkingId = genId();
  const savingsId = genId();
  const creditId = genId();

  const catSupermercado = genId();
  const catOcio = genId();
  const catNomina = genId();

  const t: Transaction[] = [];
  const push = (tx: Omit<Transaction, "id" | "seq">) => {
    t.push({ ...tx, id: genId(), seq: genSeq() } as Transaction);
  };

  push({
    accountId: checkingId, date: daysAgoISO(25), name: "Nomina", comment: "",
    categoryId: catNomina, subcategoryId: null, subsubcategoryId: null,
    amount: 2200, type: "income", recurring: { interval: 1, unit: "months", endDate: null }, status: "reconciliado",
  } as Omit<Transaction, "id" | "seq">);
  push({
    accountId: checkingId, date: daysAgoISO(20), name: "Supermercado", comment: "Compra semanal",
    categoryId: catSupermercado, subcategoryId: null, subsubcategoryId: null,
    amount: 86.4, type: "expense", recurring: null, status: "reconciliado",
  } as Omit<Transaction, "id" | "seq">);
  push({
    accountId: checkingId, date: daysAgoISO(12), name: "Cine", comment: "",
    categoryId: catOcio, subcategoryId: null, subsubcategoryId: null,
    amount: 24, type: "expense", recurring: null, status: "reconciliado",
  } as Omit<Transaction, "id" | "seq">);
  push({
    accountId: checkingId, date: daysAgoISO(3), name: "Supermercado", comment: "",
    categoryId: catSupermercado, subcategoryId: null, subsubcategoryId: null,
    amount: 52.1, type: "expense", recurring: null, status: "pendiente",
  } as Omit<Transaction, "id" | "seq">);
  push({
    accountId: creditId, date: daysAgoISO(2), name: "Restaurante", comment: "",
    categoryId: catOcio, subcategoryId: null, subsubcategoryId: null,
    amount: 38.5, type: "expense", recurring: null, status: "pendiente",
  } as Omit<Transaction, "id" | "seq">);

  const transferGroupId = genId();
  push({
    accountId: checkingId, date: daysAgoISO(15), name: "Traspaso a ahorro", comment: "",
    categoryId: null, subcategoryId: null, subsubcategoryId: null,
    amount: 300, type: "transfer", recurring: null, status: "reconciliado",
    transferGroupId, linked: true, toAccountId: savingsId, toDocId: docId, toLabel: "Ahorro",
  } as Omit<Transaction, "id" | "seq">);
  push({
    accountId: savingsId, date: daysAgoISO(15), name: "Traspaso a ahorro", comment: "",
    categoryId: null, subcategoryId: null, subsubcategoryId: null,
    amount: 300, type: "transfer_in", recurring: null, status: "reconciliado",
    transferGroupId, linked: true, fromAccountId: checkingId, fromDocId: docId, fromLabel: "Cuenta corriente",
  } as Omit<Transaction, "id" | "seq">);

  return {
    id: docId,
    name: "Documento de prueba",
    accounts: [
      { id: checkingId, name: "Cuenta corriente", opening: 1500, warning: 0, type: "checking", linkedAccountId: null },
      { id: savingsId, name: "Ahorro", opening: 4000, warning: 0, type: "savings", linkedAccountId: null },
      { id: creditId, name: "Visa", opening: 0, warning: -200, type: "credit", linkedAccountId: checkingId },
    ],
    categories: [
      { id: catSupermercado, name: "Supermercado", color: PALETTE[0], kind: "expense", subcategories: [] },
      { id: catOcio, name: "Ocio", color: PALETTE[4], kind: "expense", subcategories: [] },
      { id: catNomina, name: "Nomina", color: PALETTE[1], kind: "income", subcategories: [] },
    ],
    transactions: t,
    budgets: {},
    savedFilters: [],
  };
}
