import { open, save } from "@tauri-apps/plugin-dialog";
import type { LedgerDocument } from "../types";
import { migrateDocument } from "./migrate";
import { readTextFile, writeTextFile } from "./storage";

export async function pickOpenDocumentPath(): Promise<string | null> {
  const path = await open({ multiple: false, filters: [{ name: "Documento", extensions: ["json"] }] });
  if (!path || Array.isArray(path)) return null;
  return path;
}

export async function readDocumentFromPath(path: string): Promise<LedgerDocument> {
  const text = await readTextFile(path);
  return migrateDocument(JSON.parse(text));
}

export async function pickSaveDocumentPath(suggestedName: string): Promise<string | null> {
  const path = await save({
    defaultPath: suggestedName + ".json",
    filters: [{ name: "Documento", extensions: ["json"] }],
  });
  return path ?? null;
}

export async function writeDocumentToPath(doc: LedgerDocument, path: string): Promise<void> {
  await writeTextFile(path, JSON.stringify(doc, null, 2));
}
