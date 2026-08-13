import { open, save } from "@tauri-apps/plugin-dialog";
import { desktopDir, join } from "@tauri-apps/api/path";
import type { LedgerDocument } from "../types";
import { migrateDocument } from "./migrate";
import { readTextFile, writeTextFile } from "./storage";

export async function pickOpenDocumentPath(): Promise<string | null> {
  const path = await open({ multiple: false, filters: [{ name: "Documento", extensions: ["nice"] }] });
  if (!path || Array.isArray(path)) return null;
  return path;
}

export async function readDocumentFromPath(path: string): Promise<LedgerDocument> {
  const text = await readTextFile(path);
  return migrateDocument(JSON.parse(text));
}

export async function pickSaveDocumentPath(suggestedName: string): Promise<string | null> {
  let defaultPath = suggestedName + ".nice";
  try {
    defaultPath = await join(await desktopDir(), defaultPath);
  } catch (err) {
    console.error("No se pudo resolver el Escritorio, se usa la ruta por defecto del sistema", err);
  }
  const path = await save({
    defaultPath,
    filters: [{ name: "Documento", extensions: ["nice"] }],
  });
  return path ?? null;
}

export async function writeDocumentToPath(doc: LedgerDocument, path: string): Promise<void> {
  await writeTextFile(path, JSON.stringify(doc, null, 2));
}
