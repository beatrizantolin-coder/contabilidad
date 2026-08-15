import Papa from "papaparse";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { Account, AccountType, Category, ID, LedgerDocument, Subcategory, Transaction, TransactionStatus } from "../types";
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
    const info = isTransfer ? null : catInfo(categories, t.categoryId, t.subcategoryId, t.subsubcategoryId);
    return {
      Fecha: t.date,
      Cuenta: accountName(accounts, t.accountId),
      Descripcion: t.name,
      Comentario: t.comment || "",
      Categoria: isTransfer ? "Transferencia" : info!.name,
      Tipo: t.type === "income" ? "Ingreso" : t.type === "expense" ? "Gasto" : "Transferencia",
      Importe: t.amount,
      Recurrente: t.recurring ? t.recurring.interval + "-" + t.recurring.unit : "",
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

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Admite "1234,56", "1.234,56" (europeo) y "1,234.56" / "-14.93" (con punto decimal). */
function parseAmount(raw: string | undefined): number {
  let s = (raw || "").trim();
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  return Number(s) || 0;
}

/** "DD/MM/AAAA" (o "DD/MM/AA") -> "AAAA-MM-DD". Null si no coincide con el patron. */
function parseSpanishDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const dd = m[1];
  const mm = m[2];
  let yyyy = m[3];
  if (yyyy.length === 2) yyyy = (Number(yyyy) < 70 ? "20" : "19") + yyyy;
  return yyyy + "-" + mm.padStart(2, "0") + "-" + dd.padStart(2, "0");
}

function mapEstado(raw: string | undefined): TransactionStatus {
  const key = normalizeKey(raw || "");
  if (key.startsWith("reconcil")) return "reconciliado";
  if (key.startsWith("programad")) return "programado";
  if (key.startsWith("anulad")) return "anulado";
  return "pendiente";
}

function guessAccountType(raw: string | undefined): AccountType {
  const key = normalizeKey(raw || "");
  if (key.includes("ahorro")) return "savings";
  if (key.includes("tarjeta") || key.includes("credito")) return "credit";
  return "checking";
}

/**
 * Importa el formato de exportación de iCompta: separador coma o punto y
 * coma (auto-detectado por PapaParse), fecha DD/MM/AAAA, el signo del
 * importe determina ingreso/gasto, "Cuenta" y "Categoría" vienen anidadas
 * con " : " (el primer segmento de Cuenta es el tipo de cuenta; el primer
 * segmento de Categoría es un prefijo Gastos/Ingresos redundante que se
 * ignora).
 */
export function parseIcomptaCsv(csvText: string, accounts: Account[], categories: Category[]): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normalizeKey(h),
  });

  const nextAccounts = accounts.slice();
  const accByName = new Map<string, ID>();
  nextAccounts.forEach((a) => accByName.set(normalizeKey(a.name), a.id));

  const nextCategories = categories.slice();

  const imported: Transaction[] = [];

  parsed.data.forEach((row) => {
    const cuentaRaw = (row.cuenta || "").trim();
    if (!cuentaRaw) return;

    const accSegments = cuentaRaw.split(":").map((s) => s.trim());
    const accTypeSeg = accSegments[0];
    const accName = accSegments.length > 1 ? accSegments.slice(1).join(":").trim() : accTypeSeg;
    const accType = guessAccountType(accTypeSeg);

    let accId = accByName.get(normalizeKey(accName));
    if (!accId) {
      accId = genId();
      nextAccounts.push({ id: accId, name: accName, opening: 0, warning: 0, type: accType, linkedAccountId: null, savingsKind: null, cardKind: null, paymentMode: null, monthlyPayment: null });
      accByName.set(normalizeKey(accName), accId);
    }

    const amount = parseAmount(row.importe);
    const type: "income" | "expense" = amount < 0 ? "expense" : "income";
    const status = mapEstado(row.estado);
    const dateIso = parseSpanishDate(row.fecha) || todayISO();

    const catSegments = (row.categoria || "")
      .split(":")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    // Con prefijo ("Gastos : X" o "Gastos : X : Y"): [0] se ignora, [1] es la
    // categoria, [2] la subcategoria. Sin prefijo (una sola columna, p. ej.
    // "Tranferencias a otras cuentas"): ese unico segmento ES la categoria.
    const catName = (catSegments.length > 1 ? catSegments[1] : catSegments[0]) || "Sin categoria";
    const subName = catSegments.length > 1 ? catSegments[2] : undefined;

    let catIndex = nextCategories.findIndex((c) => normalizeKey(c.name) === normalizeKey(catName) && c.kind === type);
    if (catIndex === -1) {
      const newCat: Category = { id: genId(), name: catName, color: PALETTE[nextCategories.length % PALETTE.length], kind: type, subcategories: [] };
      nextCategories.push(newCat);
      catIndex = nextCategories.length - 1;
    }
    let cat = nextCategories[catIndex];

    let subId: ID | null = null;
    if (subName) {
      let subIndex = cat.subcategories.findIndex((s) => normalizeKey(s.name) === normalizeKey(subName));
      if (subIndex === -1) {
        const newSub: Subcategory = { id: genId(), name: subName, subcategories: [] };
        cat = { ...cat, subcategories: cat.subcategories.concat([newSub]) };
        nextCategories[catIndex] = cat;
        subIndex = cat.subcategories.length - 1;
      }
      subId = cat.subcategories[subIndex].id;
    }

    imported.push({
      id: genId(),
      seq: genSeq(),
      accountId: accId,
      date: dateIso,
      name: row.nombre || "Importado",
      comment: row.comentario || "",
      categoryId: cat.id,
      subcategoryId: subId,
      subsubcategoryId: null,
      amount: Math.abs(amount),
      type,
      recurring: null,
      status,
    });
  });

  return { accounts: nextAccounts, categories: nextCategories, transactions: imported };
}

export async function pickAndImportIcomptaCsv(doc: LedgerDocument): Promise<ImportResult | null> {
  const path = await open({ multiple: false, filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (!path || Array.isArray(path)) return null;
  const text = await readTextFile(path);
  return parseIcomptaCsv(text, doc.accounts, doc.categories);
}
