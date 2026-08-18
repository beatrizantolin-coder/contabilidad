import { invoke } from "@tauri-apps/api/core";
import type { LedgerDocument, Manifest } from "../types";
import { migrateDocument } from "./migrate";

const CURRENCIES = ["EUR", "GBP", "USD"] as const;

export async function loadManifest(): Promise<Manifest> {
  const raw = await invoke<unknown>("read_manifest");
  if (!raw || typeof raw !== "object")
    return { documentIds: [], activeDocumentId: null, savedPaths: {}, recentPaths: [], skipWelcomeOnStart: false, currency: "EUR", passwordProtect: false };
  const m = raw as Partial<Manifest>;
  return {
    documentIds: Array.isArray(m.documentIds) ? m.documentIds : [],
    activeDocumentId: typeof m.activeDocumentId === "string" ? m.activeDocumentId : null,
    savedPaths: m.savedPaths && typeof m.savedPaths === "object" ? m.savedPaths : {},
    recentPaths: Array.isArray(m.recentPaths) ? m.recentPaths.filter((p): p is string => typeof p === "string") : [],
    skipWelcomeOnStart: typeof m.skipWelcomeOnStart === "boolean" ? m.skipWelcomeOnStart : false,
    currency: (CURRENCIES as readonly string[]).includes(m.currency as string) ? (m.currency as Manifest["currency"]) : "EUR",
    passwordProtect: typeof m.passwordProtect === "boolean" ? m.passwordProtect : false,
  };
}

export async function saveManifest(manifest: Manifest): Promise<void> {
  await invoke("write_manifest", { manifest });
}

export async function loadDocument(id: string): Promise<LedgerDocument> {
  const raw = await invoke<unknown>("read_document", { id });
  return migrateDocument(raw);
}

export async function saveDocument(doc: LedgerDocument): Promise<void> {
  await invoke("write_document", { id: doc.id, document: doc });
}

export async function deleteDocumentFile(id: string): Promise<void> {
  await invoke("delete_document", { id });
}

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  await invoke("write_text_file", { path, contents });
}

/**
 * Ejecuta `fn` un tiempo (ms) después de la última llamada con la misma
 * `key`, cancelando cualquier ejecución pendiente para esa clave. Se usa
 * para no escribir a disco en cada pulsación de tecla.
 */
export function createDebouncer(delayMs: number) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return function debounced(key: string, fn: () => void) {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn();
      }, delayMs),
    );
  };
}
