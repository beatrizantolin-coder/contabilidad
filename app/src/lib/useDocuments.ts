import { useCallback, useEffect, useRef, useState } from "react";
import type { LedgerDocument } from "../types";
import { genId } from "./id";
import { todayISO } from "./format";
import { applyRecurringDueLogic } from "./recurring";
import { createDebouncer, loadDocument, loadManifest, saveDocument, saveManifest } from "./storage";

const debounceSave = createDebouncer(400);

export function emptyDocument(name: string): LedgerDocument {
  return { id: genId(), name, accounts: [], categories: [], transactions: [], budgets: {}, savedFilters: [] };
}

export function useDocuments() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<LedgerDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [savedPaths, setSavedPaths] = useState<Record<string, string>>({});
  // Instantanea (JSON) del contenido del documento en el momento del ultimo
  // guardado manual (Guardar/Guardar como). Se usa para decidir si hay
  // cambios sin guardar al cerrar un documento (ver isDocDirty).
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>({});
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [skipWelcomeOnStart, setSkipWelcomeOnStartState] = useState(false);
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
      setSavedPaths(manifest.savedPaths);
      setRecentPaths(manifest.recentPaths);
      setSkipWelcomeOnStartState(manifest.skipWelcomeOnStart);
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
      saveManifest({
        documentIds: documents.map((d) => d.id),
        activeDocumentId: activeDocId,
        savedPaths,
        recentPaths,
        skipWelcomeOnStart,
      }).catch((err) => console.error("Error guardando el manifiesto", err));
    });
  }, [documents, activeDocId, savedPaths, recentPaths, skipWelcomeOnStart]);

  // Autogeneracion de recurrentes + vencimiento automatico: por cada
  // documento, cualquier movimiento "programado" cuya fecha ya llego pasa a
  // "pendiente", y si alguna serie recurrente tiene una ocurrencia vencida,
  // se anade con estado "programado". Al depender de `documents`, cada
  // tanda generada dispara una nueva pasada, lo que permite ponerse al dia
  // con varias ocurrencias pendientes si la app llevaba tiempo sin abrirse.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const today = todayISO();
    let changed = false;
    const next = documents.map((doc) => {
      const nextTxs = applyRecurringDueLogic(doc, today);
      if (!nextTxs) return doc;
      changed = true;
      return { ...doc, transactions: nextTxs };
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

  /**
   * "Nuevo documento" desde el menu, la barra lateral o la ventana de
   * bienvenida: arranca una sesion limpia — ningun documento previamente
   * abierto se arrastra a la vista (a diferencia de "Vincular documento",
   * que anade el elegido a los que ya estaban abiertos via `addDocument`).
   * Los documentos anteriores no se borran de disco, solo dejan de estar
   * abiertos en esta sesion (se pueden reabrir con "Abrir..." o "Abrir Reciente").
   */
  const createDocumentReplacing = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const doc = emptyDocument(trimmed);
    setDocuments([doc]);
    setActiveDocId(doc.id);
    return doc;
  }, []);

  /** Marca el documento como "guardado" ahora mismo (tras un Guardar/Guardar como con exito): su contenido actual pasa a ser la referencia para isDocDirty. */
  const markSaved = useCallback(
    (id: string) => {
      const doc = documents.find((d) => d.id === id);
      if (!doc) return;
      setSavedSnapshots((prev) => ({ ...prev, [id]: JSON.stringify(doc) }));
    },
    [documents],
  );

  /** Sin guardado manual previo: "sucio" si tiene contenido real. Con guardado previo: "sucio" si el contenido actual difiere de esa instantanea. */
  const isDocDirty = useCallback(
    (doc: LedgerDocument): boolean => {
      const snapshot = savedSnapshots[doc.id];
      if (snapshot === undefined) {
        return doc.accounts.length > 0 || doc.transactions.length > 0 || doc.categories.length > 0 || Object.keys(doc.budgets).length > 0 || doc.savedFilters.length > 0;
      }
      return JSON.stringify(doc) !== snapshot;
    },
    [savedSnapshots],
  );

  /**
   * Cierra un documento: lo quita de la lista de documentos abiertos en esta
   * sesion. Nunca borra el archivo del disco (ver instrucciones: la papelera
   * de cada pastilla de documento cierra, no elimina).
   */
  const closeDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (activeDocId === id) {
        setActiveDocId(documents.find((d) => d.id !== id)?.id ?? null);
      }
      setSavedPaths((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSavedSnapshots((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [activeDocId, documents],
  );

  const addDocument = useCallback((doc: LedgerDocument) => {
    setDocuments((prev) => (prev.some((d) => d.id === doc.id) ? prev : prev.concat([doc])));
    setActiveDocId(doc.id);
  }, []);

  const getSavedPath = useCallback((docId: string) => savedPaths[docId], [savedPaths]);

  const setSavedPath = useCallback((docId: string, path: string) => {
    setSavedPaths((prev) => ({ ...prev, [docId]: path }));
  }, []);

  const addRecentPath = useCallback((path: string) => {
    setRecentPaths((prev) => [path, ...prev.filter((p) => p !== path)].slice(0, 8));
  }, []);

  const setSkipWelcomeOnStart = useCallback((value: boolean) => {
    setSkipWelcomeOnStartState(value);
  }, []);

  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;

  return {
    loading,
    documents,
    activeDocId,
    setActiveDocId,
    activeDoc,
    updateDoc,
    applyToDocs,
    createDocumentReplacing,
    addDocument,
    closeDocument,
    markSaved,
    isDocDirty,
    getSavedPath,
    setSavedPath,
    recentPaths,
    addRecentPath,
    skipWelcomeOnStart,
    setSkipWelcomeOnStart,
  };
}
