import { useCallback, useEffect, useRef, useState } from "react";
import type { LedgerDocument } from "../types";
import { genId } from "./id";
import { todayISO } from "./format";
import { generateDueOccurrences } from "./recurring";
import { createDebouncer, deleteDocumentFile, loadDocument, loadManifest, saveDocument, saveManifest } from "./storage";

const debounceSave = createDebouncer(400);

export function emptyDocument(name: string): LedgerDocument {
  return { id: genId(), name, accounts: [], categories: [], transactions: [], budgets: {} };
}

export function useDocuments() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<LedgerDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const prevDocsRef = useRef<LedgerDocument[]>([]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const manifest = await loadManifest();
      const loaded: LedgerDocument[] = [];
      for (const id of manifest.documentIds) {
        try {
          loaded.push(await loadDocument(id));
        } catch (err) {
          console.error("No se pudo cargar el documento " + id, err);
        }
      }
      if (cancelled) return;
      setDocuments(loaded);
      prevDocsRef.current = loaded;
      const active = manifest.activeDocumentId && loaded.some((d) => d.id === manifest.activeDocumentId)
        ? manifest.activeDocumentId
        : loaded[0]?.id ?? null;
      setActiveDocId(active);
      hydratedRef.current = true;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave: cualquier documento cuya referencia haya cambiado desde el
  // último render se persiste a disco (con debounce por documento).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const prev = prevDocsRef.current;
    documents.forEach((doc) => {
      const before = prev.find((d) => d.id === doc.id);
      if (before !== doc) {
        debounceSave("doc:" + doc.id, () => {
          saveDocument(doc).catch((err) => console.error("Error guardando documento", err));
        });
      }
    });
    prevDocsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    debounceSave("manifest", () => {
      saveManifest({ documentIds: documents.map((d) => d.id), activeDocumentId: activeDocId }).catch((err) =>
        console.error("Error guardando el manifiesto", err),
      );
    });
  }, [documents, activeDocId]);

  // Autogeneracion de recurrentes: por cada documento, si alguna serie
  // recurrente tiene una ocurrencia vencida, la anade con estado
  // "programado". Al depender de `documents`, cada tanda generada dispara
  // una nueva pasada, lo que permite ponerse al dia con varias ocurrencias
  // pendientes si la app llevaba tiempo sin abrirse.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const today = todayISO();
    let changed = false;
    const next = documents.map((doc) => {
      const additions = generateDueOccurrences(doc, today);
      if (additions.length === 0) return doc;
      changed = true;
      return { ...doc, transactions: doc.transactions.concat(additions) };
    });
    if (changed) setDocuments(next);
  }, [documents]);

  const updateDoc = useCallback((docId: string, fn: (d: LedgerDocument) => LedgerDocument) => {
    setDocuments((prev) => prev.map((d) => (d.id === docId ? fn(d) : d)));
  }, []);

  const applyToDocs = useCallback((updates: { docId: string; fn: (d: LedgerDocument) => LedgerDocument }[]) => {
    setDocuments((prev) =>
      prev.map((d) => {
        const u = updates.find((x) => x.docId === d.id);
        return u ? u.fn(d) : d;
      }),
    );
  }, []);

  const createDocument = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const doc = emptyDocument(trimmed);
    setDocuments((prev) => prev.concat([doc]));
    setActiveDocId(doc.id);
    return doc.id;
  }, []);

  const removeDocument = useCallback(
    (id: string) => {
      if (documents.length <= 1) return;
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (activeDocId === id) {
        setActiveDocId(documents.find((d) => d.id !== id)?.id ?? null);
      }
      deleteDocumentFile(id).catch((err) => console.error("Error eliminando documento", err));
    },
    [activeDocId, documents],
  );

  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;

  return {
    loading,
    documents,
    activeDocId,
    setActiveDocId,
    activeDoc,
    updateDoc,
    applyToDocs,
    createDocument,
    removeDocument,
  };
}
