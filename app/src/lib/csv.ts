import Papa from "papaparse";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { Account, Category, Frequency, ID, LedgerDocument, Transaction } from "../types";
import { catInfo } from "./categories";
import { genId, genSeq } from "./id";
import { todayISO } from "./format";
import { readTextFile, writeTextFile } from "./storage";
import { PALETTE } from "../theme";

function accountName(accounts: Account[], id: ID): string {
  return accounts.find((a) => a.id === id)?.name ?? "-";
}

export function buildExportRows(transactions: Transaction[], accounts: Account[], categories: Category[]) {
  return transactions.map((t) => {
    const isTransfer = t.type === "transfer" || t.type === "transfer_in";
    const info = isTransfer ? null : catInfo(categories, t.categoryId, t.subcategoryId);
    return {
      Fecha: t.date,
      Cuenta: accountName(accounts, t.accountId),
      Descripcion: t.name,
      Categoria: isTransfer ? "Transferencia" : info!.name,
      Tipo: t.type === "income" ? "Ingreso" : t.type === "expense" ? "Gasto" : "Transferencia",
      Importe: t.amount,
      Recurrente: t.recurring ? t.recurring.frequency : "",
    };
  });
}

export async function exportTransactionsCsv(docName: string, transactions: Transaction[], accounts: Account[], categories: Category[]): Promise<boolean> {
  const rows = buildExportRows(transactions.slice().reverse(), accounts, categories);
  const csv = Papa.unparse(rows);
  const path = await save({
    defaultPath: docName + "-movimientos.csv",
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });
  if (!path) return false;
  await writeTextFile(path, csv);
  return true;
}

export interface ImportResult {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
}

export function parseImportCsv(csvText: string, accounts: Account[], categories: Category[]): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const byName = new Map<string, ID>();
  accounts.forEach((a) => byName.set(a.name, a.id));
  const nextAccounts = accounts.slice();
  const nextCategories = categories.slice();
  const imported: Transaction[] = [];

  parsed.data.forEach((row) => {
    const accNameField = row.Cuenta?.trim();
    if (!accNameField) return;
    let accId = byName.get(accNameField);
    if (!accId) {
      accId = genId();
      nextAccounts.push({ id: accId, name: accNameField, opening: 0, warning: 0, type: "checking" });
      byName.set(accNameField, accId);
    }
    const tipo = (row.Tipo || "").toLowerCase();
    const type: "income" | "expense" = tipo.indexOf("ingreso") === 0 ? "income" : "expense";
    const catName = (row.Categoria || "Otros").trim();
    let cat = nextCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    if (!cat) {
      cat = { id: genId(), name: catName, color: PALETTE[nextCategories.length % PALETTE.length], subcategories: [] };
      nextCategories.push(cat);
    }
    imported.push({
      id: genId(),
      seq: genSeq(),
      accountId: accId,
      date: row.Fecha || todayISO(),
      name: row.Descripcion || "Importado",
      categoryId: cat.id,
      subcategoryId: null,
      amount: Number(row.Importe) || 0,
      type,
      recurring: row.Recurrente ? { frequency: row.Recurrente as Frequency } : null,
      status: "pendiente",
    });
  });

  return { accounts: nextAccounts, categories: nextCategories, transactions: imported };
}

export async function pickAndImportCsv(doc: LedgerDocument): Promise<ImportResult | null> {
  const path = await open({ multiple: false, filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (!path || Array.isArray(path)) return null;
  const text = await readTextFile(path);
  return parseImportCsv(text, doc.accounts, doc.categories);
}
