import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Minus, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PALETTE, T, statusInfo } from "./theme";
import { useDocuments } from "./lib/useDocuments";
import { genId, genSeq } from "./lib/id";
import { computeBalances, computeChronological, computeRunningMaps, hasLocalSibling, pairedTransferId } from "./lib/balances";
import { normalizeAccountFields, type AccountDraftFields } from "./lib/accounts";
import { emptyDraft, type TxDraft } from "./lib/txDraft";
import { computeBulkEditDraft, emptyBulkEditState, type BulkEditField, type BulkEditState } from "./lib/bulkEdit";
import { endOfNthMonthISO, fmt, monthKey, monthYearLabel, shortDate, startOfCurrentMonthISO, todayISO } from "./lib/format";
import { computeProgramadorMonthStats, computeProgramadorRows, seriesKey, type ProgramadorRow } from "./lib/recurring";
import { computeEvoPoints, computeEvoTicks, computePrevisionMovements, type EvoRange } from "./lib/evolution";
import { exportCategoriesCsv, exportTransactionsCsv, pickAndImportCategoriesCsv, pickAndImportIcomptaCsv, pickAndImportProgramadorCsv } from "./lib/csv";
import { pickOpenDocumentPath, pickSaveDocumentPath, readDocumentFromPath, saveNewDocumentToDesktop, writeDocumentToPath } from "./lib/docFile";
import { createTestDocument } from "./lib/testSeed";
import { isTransferTx, type Account, type AccountType, type Budgets, type Category, type CategoryKind, type CustomAmountEntry, type Filters, type ID, type LedgerDocument, type SavedFilter, type SortColumn, type SortState, type Transaction } from "./types";
import { ACCOUNT_GROUP_LABELS, ACCOUNT_SECTIONS, Sidebar, type MainView, type SidebarSection } from "./components/Sidebar";
import { TransactionForm } from "./components/TransactionForm";
import { BulkEditForm } from "./components/BulkEditForm";
import { SidePanel } from "./components/SidePanel";
import { TransactionsView } from "./components/TransactionsView";
import { RecurringView } from "./components/RecurringView";
import { CategoriesView } from "./components/CategoriesView";
import { CategoryEditForm } from "./components/CategoryEditForm";
import { FiltersView } from "./components/FiltersView";
import { PrevisionPanel } from "./components/PrevisionPanel";
import { PrevisionFloatPanel } from "./components/PrevisionFloatPanel";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { RenameDocumentModal } from "./components/RenameDocumentModal";
import { CloseDocumentModal } from "./components/CloseDocumentModal";
import { OptionsModal } from "./components/OptionsModal";
import { buildAppMenu, type AppMenuHandlers } from "./lib/appMenu";

const emptyFilters = (): Filters => ({ search: "", categories: [], subcategories: [], type: "all", from: "", to: "", matchMode: "all" });

export default function App() {
  const {
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
    currency,
    setCurrency,
    passwordProtect,
    setPasswordProtect,
  } = useDocuments();
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const [activeAccounts, setActiveAccounts] = useState<Set<ID>>(new Set());
  const [activeAccountTypeGroup, setActiveAccountTypeGroup] = useState<AccountType | null>(null);
  const [lastClickedAccountId, setLastClickedAccountId] = useState<ID | null>(null);
  const [view, setView] = useState<MainView>("transactions");
  const [sidebarWidth, setSidebarWidth] = useState(270);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>("cuentas");
  // Barra de estado global (presente en todas las pantallas): panel flotante
  // de Previsión de balance y zoom de tabla. No se persisten en disco: se
  // reinician al reiniciar la app.
  const [showPrevisionFloat, setShowPrevisionFloat] = useState(false);
  const [rowZoom, setRowZoom] = useState(1);
  const [showTxForm, setShowTxForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [showMovementsRange, setShowMovementsRange] = useState(false);
  const [viewRange, setViewRange] = useState<{ from: string; to: string } | null>(null);
  const [txDraft, setTxDraft] = useState<TxDraft | null>(null);
  const [evoRange, setEvoRange] = useState<EvoRange>({ from: "", to: "" });
  const [selectedIds, setSelectedIds] = useState<Set<ID>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<ID | null>(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEdit, setBulkEdit] = useState<BulkEditState>(emptyBulkEditState());
  const [bulkEditTouched, setBulkEditTouched] = useState<Set<BulkEditField>>(new Set());
  const [showCatEdit, setShowCatEdit] = useState(false);
  const [catEditId, setCatEditId] = useState<ID | null>(null);
  const [catIsNew, setCatIsNew] = useState(false);
  const [sortBy, setSortBy] = useState<SortState | null>(null);
  // La tabla de Movimientos empieza siempre sin agrupar: la agrupacion visual
  // por mes/estado/etc. solo se activa cuando el usuario pulsa una cabecera
  // de columna para ordenar, y se puede desactivar de nuevo con "Limpiar".
  const [groupingActive, setGroupingActive] = useState(false);
  const [showRenameDoc, setShowRenameDoc] = useState(false);
  const [closeDocConfirmId, setCloseDocConfirmId] = useState<ID | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newAccountTrigger, setNewAccountTrigger] = useState(0);
  const [newCategoryTrigger, setNewCategoryTrigger] = useState(0);
  // Estado de sesion (no persistido) que decide si se muestra la bienvenida
  // ahora mismo: null mientras se carga, y una vez cargado se fija segun
  // la preferencia guardada. Se pone a false en cuanto el usuario elige
  // una accion en la bienvenida, para no volver a mostrarla en esta sesion.
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const undoStackRef = useRef<LedgerDocument[]>([]);
  const redoStackRef = useRef<LedgerDocument[]>([]);
  const lastHistoryDocRef = useRef<ID | null>(null);
  const lastHistoryPushRef = useRef(0);

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastHistoryDocRef.current = null;
    setHistoryTick((t) => t + 1);
  }, [activeDocId]);

  // Cualquier panel lateral de edicion abierto (movimiento, edicion en masa
  // o categoria) se cierra solo al cambiar de pantalla o de documento activo.
  useEffect(() => {
    setShowTxForm(false);
    setShowBulkEdit(false);
    setShowCatEdit(false);
    setCatEditId(null);
    setCatIsNew(false);
  }, [view, activeDocId]);

  // Una vez cargados los datos, se decide una unica vez si esta sesion
  // empieza mostrando la bienvenida: siempre se muestra salvo que el
  // usuario haya marcado la casilla "No volver a mostrar" en una sesion
  // anterior (skipWelcomeOnStart), en cuyo caso se abre directo el ultimo
  // documento usado (si existe).
  useEffect(() => {
    if (loading || showWelcome !== null) return;
    setShowWelcome(!activeDoc || !skipWelcomeOnStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  function pushHistory() {
    if (!activeDoc || !activeDocId) return;
    const now = Date.now();
    if (lastHistoryDocRef.current === activeDocId && now - lastHistoryPushRef.current < 800) {
      lastHistoryPushRef.current = now;
      return;
    }
    lastHistoryDocRef.current = activeDocId;
    lastHistoryPushRef.current = now;
    undoStackRef.current = undoStackRef.current.concat([activeDoc]).slice(-50);
    redoStackRef.current = [];
    setHistoryTick((t) => t + 1);
  }

  function undo() {
    if (!activeDocId || !activeDoc || undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = redoStackRef.current.concat([activeDoc]).slice(-50);
    lastHistoryDocRef.current = null;
    updateDoc(activeDocId, () => prev);
    setHistoryTick((t) => t + 1);
  }
  function redo() {
    if (!activeDocId || !activeDoc || redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = undoStackRef.current.concat([activeDoc]).slice(-50);
    lastHistoryDocRef.current = null;
    updateDoc(activeDocId, () => next);
    setHistoryTick((t) => t + 1);
  }
  const canUndo = historyTick >= 0 && undoStackRef.current.length > 0;
  const canRedo = historyTick >= 0 && redoStackRef.current.length > 0;

  function handleSort(column: SortColumn) {
    setGroupingActive(true);
    setSortBy((prev) => {
      if (prev && prev.column === column) return { column, dir: prev.dir === "asc" ? "desc" : "asc" };
      // Cambiar de columna de orden invalida cualquier reordenacion manual
      // (manualRank) hecha bajo el criterio anterior: si no se limpia, sus
      // valores siguen desempatando filas bajo el nuevo criterio y dejan
      // grupos "fantasma" del orden/agrupacion previos.
      setTransactions((txs) => txs.map((t) => (t.manualRank !== undefined ? { ...t, manualRank: undefined } : t)));
      return { column, dir: "asc" };
    });
  }

  function applyMovementsRange(from: string, to: string) {
    setViewRange({ from, to });
    setShowMovementsRange(false);
  }

  const accounts = activeDoc?.accounts ?? [];
  const transactions = activeDoc?.transactions ?? [];
  const categories = activeDoc?.categories ?? [];
  const budgets = activeDoc?.budgets ?? {};
  const savedFilters = activeDoc?.savedFilters ?? [];

  const balances = useMemo(() => computeBalances(accounts, transactions), [accounts, transactions]);
  const totalBalance = accounts.reduce((s, a) => s + (balances[a.id] || 0), 0);

  // Un grupo de cuentas seleccionado (p.ej. Tarjetas) sin ninguna cuenta de
  // ese tipo debe filtrar a "ninguna cuenta", no a "todas": activeAccounts
  // vacio solo significa "sin filtro" cuando no hay ademas un grupo activo.
  const scopeIds = useMemo(
    () => (activeAccounts.size === 0 && !activeAccountTypeGroup ? new Set(accounts.map((a) => a.id)) : activeAccounts),
    [activeAccounts, activeAccountTypeGroup, accounts],
  );
  // "Total seleccionado" de la barra de estado global: suma de los movimientos
  // marcados (no del saldo de las cuentas), igual en cualquier pantalla; 0 sin
  // seleccion.
  const scopedSelectedTotal = useMemo(
    () =>
      selectedIds.size === 0
        ? 0
        : transactions.filter((t) => selectedIds.has(t.id)).reduce((s, t) => s + (t.type === "income" || t.type === "transfer_in" ? t.amount : -t.amount), 0),
    [transactions, selectedIds],
  );

  const chronological = useMemo(() => computeChronological(transactions), [transactions]);
  const runningMaps = useMemo(() => computeRunningMaps(accounts, chronological, scopeIds), [accounts, chronological, scopeIds]);

  function resultingBalance(t: Transaction): number {
    if (t.type === "transfer") return runningMaps.idToTotal[pairedTransferId(t, transactions, scopeIds)];
    return runningMaps.idToTotal[t.id];
  }

  const scoped = useMemo(() => transactions.filter((t) => scopeIds.has(t.accountId)), [transactions, scopeIds]);

  const STATUS_SORT_ORDER: Transaction["status"][] = ["reconciliado", "pendiente", "programado", "anulado"];
  function signedAmount(t: Transaction): number {
    return t.type === "income" || t.type === "transfer_in" ? Number(t.amount) : -Number(t.amount);
  }
  function sortValue(t: Transaction, column: SortColumn): number | string {
    switch (column) {
      case "date":
        return t.date;
      case "status":
        return STATUS_SORT_ORDER.indexOf(t.status || "pendiente");
      case "name":
        return t.name.toLowerCase();
      case "comment":
        return (t.comment || "").toLowerCase();
      case "amount":
        return signedAmount(t);
    }
  }
  /** Desempate: orden manual si se ha fijado arrastrando, si no el orden de creacion. */
  function rankOf(t: Transaction): number {
    return t.manualRank !== undefined ? t.manualRank : t.seq;
  }

  const effectiveSortColumn: SortColumn = sortBy?.column ?? "date";

  // Si el panel de Filtros trae su propio rango de fechas, ese rango explicito
  // sustituye al rango de la vista Movimientos en vez de combinarse con AND.
  // Al abrir un documento no hay ningun filtro de fecha activo por defecto
  // (viewRange es null y filters.from/to estan vacios): se muestran todos
  // los movimientos, y el rango de Movimientos solo se aplica cuando el
  // usuario pulsa "Mostrar" en ese panel.
  const filtersHaveDateRange = !!filters.from || !!filters.to;

  const filteredTx = useMemo(() => {
    const base = scoped
      .filter((t) => t.type !== "transfer_in" || !hasLocalSibling(t, transactions, scopeIds))
      .filter((t) => filtersHaveDateRange || !viewRange || (t.date >= viewRange.from && t.date <= viewRange.to))
      .filter((t) => {
        const conds: boolean[] = [];
        if (filters.categories.length > 0) conds.push(!!t.categoryId && filters.categories.includes(t.categoryId));
        if (filters.subcategories.length > 0) conds.push(!!t.subcategoryId && filters.subcategories.includes(t.subcategoryId));
        if (filters.type !== "all") conds.push(filters.type === "transfer" ? t.type === "transfer" || t.type === "transfer_in" : t.type === filters.type);
        if (filters.from) conds.push(t.date >= filters.from);
        if (filters.to) conds.push(t.date <= filters.to);
        if (filters.search) conds.push(t.name.toLowerCase().includes(filters.search.toLowerCase()));
        if (conds.length === 0) return true;
        if (filters.matchMode === "any") return conds.some(Boolean);
        if (filters.matchMode === "none") return conds.every((c) => !c);
        return conds.every(Boolean);
      })
      .slice();
    const dir = sortBy && sortBy.dir === "asc" ? 1 : -1;
    return base.sort((a, b) => {
      const va = sortValue(a, effectiveSortColumn);
      const vb = sortValue(b, effectiveSortColumn);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return (rankOf(a) - rankOf(b)) * dir;
    });
  }, [scoped, filters, transactions, sortBy, effectiveSortColumn, viewRange, filtersHaveDateRange]);

  // Clave de agrupacion visual: coincide con la columna de orden activa (por
  // fecha se agrupa por mes/año, por estado por su nombre, por descripcion o
  // comentario por su texto exacto). Por importe no se agrupa (valor continuo).
  function txGroupKey(t: Transaction): string | null {
    if (!groupingActive) return null;
    switch (effectiveSortColumn) {
      case "date":
        return monthKey(t.date);
      case "status":
        return t.status || "pendiente";
      case "name":
        return t.name;
      case "comment":
        return t.comment || "";
      case "amount":
        return null;
    }
  }
  function txGroupLabel(t: Transaction): string {
    switch (effectiveSortColumn) {
      case "date":
        return monthYearLabel(t.date);
      case "status":
        return statusInfo(t.status).label;
      case "name":
        return t.name;
      case "comment":
        return t.comment || "Sin comentario";
      case "amount":
        return "";
    }
  }

  // Dentro de un mismo grupo de empate (mismo valor en la columna de orden
  // activa), arrastrar una fila fija su orden relativo via `manualRank`, al
  // margen de si el orden general esta en ascendente o descendente.
  function reorderWithinGroup(draggedId: ID, targetId: ID) {
    if (draggedId === targetId) return;
    const dragged = transactions.find((t) => t.id === draggedId);
    const target = transactions.find((t) => t.id === targetId);
    if (!dragged || !target || txGroupKey(dragged) === null || txGroupKey(dragged) !== txGroupKey(target)) return;
    const draggedRank = rankOf(dragged);
    const targetRank = rankOf(target);
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === dragged.id) return { ...t, manualRank: targetRank };
        if (t.id === target.id) return { ...t, manualRank: draggedRank };
        return t;
      }),
    );
  }

  const curMonthKey = monthKey(todayISO());
  const thisMonthTx = scoped.filter((t) => monthKey(t.date) === curMonthKey);
  const monthIncome = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  // Rango del mes en curso mostrado en el resumen: puramente informativo, no
  // filtra ni limita la lista de movimientos del panel central.
  const monthRangeLabel = shortDate(startOfCurrentMonthISO()) + " - " + shortDate(endOfNthMonthISO(0));

  // Los presupuestos (barras de gasto acumulado en Categorias) solo cuentan
  // movimientos marcados como reconciliados, segun especificacion.
  const reconciledMonthTx = useMemo(() => thisMonthTx.filter((t) => t.status === "reconciliado"), [thisMonthTx]);

  const byCategory = useMemo(() => {
    const map = new Map<ID, number>();
    reconciledMonthTx
      .filter((t) => t.type === "expense" && t.categoryId)
      .forEach((t) => map.set(t.categoryId as ID, (map.get(t.categoryId as ID) || 0) + Number(t.amount)));
    return Array.from(map.entries())
      .map(([id, val]) => ({ id, val }))
      .sort((a, b) => b.val - a.val);
  }, [reconciledMonthTx]);
  const maxCat = Math.max(1, ...byCategory.map((c) => c.val));

  const bySubcategory = useMemo(() => {
    const map = new Map<ID, number>();
    reconciledMonthTx
      .filter((t) => t.type === "expense" && t.subcategoryId)
      .forEach((t) => map.set(t.subcategoryId as ID, (map.get(t.subcategoryId as ID) || 0) + Number(t.amount)));
    return Array.from(map.entries()).map(([id, val]) => ({ id, val }));
  }, [reconciledMonthTx]);

  const programadorRows = useMemo(() => computeProgramadorRows(transactions), [transactions]);
  const programadorMonthStats = useMemo(() => computeProgramadorMonthStats(transactions), [transactions]);

  const evoPoints = useMemo(
    () => computeEvoPoints(accounts, chronological, transactions, scopeIds, resultingBalance, evoRange),
    [accounts, chronological, transactions, scopeIds, runningMaps, evoRange],
  );
  const evoTicks = useMemo(() => computeEvoTicks(evoPoints), [evoPoints]);
  const previsionMovements = useMemo(
    () => computePrevisionMovements(chronological, transactions, scopeIds, evoRange),
    [chronological, transactions, scopeIds, evoRange],
  );

  function setAccounts(fn: (a: Account[]) => Account[]) {
    if (!activeDocId) return;
    pushHistory();
    updateDoc(activeDocId, (d) => ({ ...d, accounts: fn(d.accounts) }));
  }
  function setTransactions(fn: (t: Transaction[]) => Transaction[]) {
    if (!activeDocId) return;
    pushHistory();
    updateDoc(activeDocId, (d) => ({ ...d, transactions: fn(d.transactions) }));
  }
  function setCategories(fn: (c: Category[]) => Category[]) {
    if (!activeDocId) return;
    pushHistory();
    updateDoc(activeDocId, (d) => ({ ...d, categories: fn(d.categories) }));
  }
  function setBudgets(fn: (b: Budgets) => Budgets) {
    if (!activeDocId) return;
    pushHistory();
    updateDoc(activeDocId, (d) => ({ ...d, budgets: fn(d.budgets) }));
  }
  function setSavedFilters(fn: (sf: SavedFilter[]) => SavedFilter[]) {
    if (!activeDocId) return;
    updateDoc(activeDocId, (d) => ({ ...d, savedFilters: fn(d.savedFilters) }));
  }

  function addCategory(name: string, color: string, kind: CategoryKind): ID {
    const id = genId();
    setCategories((prev) => prev.concat([{ id, name, color, kind, subcategories: [] }]));
    return id;
  }
  function removeCategory(id: ID) {
    if (!window.confirm("¿Eliminar esta categoria?")) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }
  function setCategoryName(id: ID, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }
  function setCategoryKind(id: ID, kind: CategoryKind) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, kind } : c)));
  }
  // El color de subcategorias/sub-subcategorias se deriva siempre del de la
  // categoria (ver lib/color.ts), asi que cambiar el color aqui ya "cascada"
  // automaticamente a todos sus descendientes sin tocar sus datos.
  function setCategoryColor(id: ID, color: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
  }
  function addSubcategory(catId: ID, name: string): ID {
    const id = genId();
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, subcategories: c.subcategories.concat([{ id, name, subcategories: [] }]) } : c)));
    return id;
  }
  function removeSubcategory(catId: ID, subId: ID) {
    if (!window.confirm("¿Eliminar esta subcategoria?")) return;
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c)));
  }
  function addSubSubcategory(catId: ID, subId: ID, name: string): ID {
    const id = genId();
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== catId
          ? c
          : { ...c, subcategories: c.subcategories.map((s) => (s.id !== subId ? s : { ...s, subcategories: s.subcategories.concat([{ id, name, subcategories: [] }]) })) },
      ),
    );
    return id;
  }
  function setBudget(catId: ID, value: number | undefined) {
    setBudgets((prev) => ({ ...prev, [catId]: value as number }));
  }

  async function handleSaveDoc(doc: LedgerDocument) {
    try {
      let path = getSavedPath(doc.id);
      if (!path) {
        const picked = await pickSaveDocumentPath(doc.name);
        if (!picked) return;
        path = picked;
        setSavedPath(doc.id, path);
        addRecentPath(path);
      }
      await writeDocumentToPath(doc, path);
      markSaved(doc.id);
    } catch (err) {
      console.error("Error guardando el documento", err);
    }
  }
  async function handleSave() {
    if (!activeDoc) return;
    await handleSaveDoc(activeDoc);
  }
  // "Guardar como": siempre pide una ruta nueva, a diferencia de Guardar
  // (que solo pregunta la primera vez). Actua sobre el documento activo.
  async function handleSaveAs() {
    if (!activeDoc) return;
    try {
      const picked = await pickSaveDocumentPath(activeDoc.name);
      if (!picked) return;
      setSavedPath(activeDoc.id, picked);
      addRecentPath(picked);
      await writeDocumentToPath(activeDoc, picked);
      markSaved(activeDoc.id);
    } catch (err) {
      console.error("Error guardando el documento", err);
    }
  }
  async function handleExport() {
    if (!activeDoc) return;
    try {
      await exportTransactionsCsv(activeDoc.name, filteredTx, accounts, categories);
    } catch (err) {
      console.error("Error exportando CSV", err);
    }
  }
  async function handleImport() {
    if (!activeDoc) return;
    try {
      const result = await pickAndImportIcomptaCsv(activeDoc);
      if (!result) return;
      setAccounts(() => result.accounts);
      setCategories(() => result.categories);
      setTransactions((prev) => prev.concat(result.transactions));
      // La vista de movimientos por defecto muestra solo la semana en
      // curso: sin esto, un CSV con fechas fuera de esa semana parecería
      // no haberse importado, aunque los datos ya esten ahi.
      if (result.transactions.length > 0) {
        const dates = result.transactions.map((t) => t.date);
        setViewRange({ from: dates.reduce((a, b) => (b < a ? b : a)), to: dates.reduce((a, b) => (b > a ? b : a)) });
      }
    } catch (err) {
      console.error("Error importando CSV", err);
    }
  }
  async function handleExportCategories() {
    if (!activeDoc) return;
    try {
      await exportCategoriesCsv(activeDoc.name, categories, budgets);
    } catch (err) {
      console.error("Error exportando categorias CSV", err);
    }
  }
  async function handleImportCategories() {
    if (!activeDoc) return;
    try {
      const result = await pickAndImportCategoriesCsv(categories);
      if (!result) return;
      setCategories(() => result.categories);
      setBudgets((b) => ({ ...b, ...result.budgetPatch }));
    } catch (err) {
      console.error("Error importando categorias CSV", err);
    }
  }
  async function handleImportProgramador() {
    if (!activeDoc) return;
    try {
      const result = await pickAndImportProgramadorCsv(accounts);
      if (!result) return;
      setAccounts(() => result.accounts);
      setTransactions((prev) => prev.concat(result.transactions));
    } catch (err) {
      console.error("Error importando programador CSV", err);
    }
  }

  function addAccount(fields: AccountDraftFields) {
    setAccounts((prev) => prev.concat([{ id: genId(), warning: 0, ...normalizeAccountFields(fields) }]));
  }
  function createDestinoAccount(docId: ID, name: string, type: AccountType, opening: number): ID {
    const id = genId();
    updateDoc(docId, (d) => ({
      ...d,
      accounts: d.accounts.concat([{ id, warning: 0, ...normalizeAccountFields({ name, type, opening, linkedAccountId: null, savingsKind: null, cardKind: null, paymentMode: null, monthlyPayment: null, customIcon: null }) }]),
    }));
    return id;
  }
  function updateAccount(id: ID, fields: AccountDraftFields) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...normalizeAccountFields(fields) } : a)));
  }
  function removeAccount(id: ID) {
    if (!window.confirm("¿Eliminar esta cuenta? Se perderan tambien sus movimientos.")) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setTransactions((prev) => prev.filter((t) => t.accountId !== id));
    setActiveAccounts((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }
  function reorderAccounts(draggedId: ID, targetId: ID) {
    if (draggedId === targetId) return;
    setAccounts((prev) => {
      const draggedIdx = prev.findIndex((a) => a.id === draggedId);
      const targetIdx = prev.findIndex((a) => a.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      const next = prev.slice();
      const [item] = next.splice(draggedIdx, 1);
      const insertIdx = next.findIndex((a) => a.id === targetId);
      next.splice(insertIdx, 0, item);
      return next;
    });
  }
  function handleAccountClick(id: ID, shiftKey: boolean, toggleKey: boolean) {
    closeEditPanels();
    setActiveAccountTypeGroup(null);
    if (toggleKey) {
      setActiveAccounts((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setLastClickedAccountId(id);
      return;
    }
    if (shiftKey && lastClickedAccountId !== null) {
      const orderedIds = ACCOUNT_SECTIONS.flatMap((section) => accounts.filter((a) => (a.type || "checking") === section.key)).map((a) => a.id);
      const lastIdx = orderedIds.indexOf(lastClickedAccountId);
      const curIdx = orderedIds.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        setActiveAccounts(new Set(orderedIds.slice(start, end + 1)));
        setLastClickedAccountId(id);
        return;
      }
    }
    // Clic normal: sustituye la seleccion; si ya era la unica cuenta seleccionada, la deselecciona.
    setActiveAccounts((prev) => (prev.size === 1 && prev.has(id) ? new Set() : new Set([id])));
    setLastClickedAccountId(id);
  }
  function clearAccountSelection() {
    setActiveAccounts(new Set());
    setActiveAccountTypeGroup(null);
    setLastClickedAccountId(null);
  }

  /** Selecciona en bloque todas las cuentas de un tipo (Bancos/Ahorro/Tarjetas/Efectivo) desde la barra lateral. */
  function handleAccountTypeGroupClick(type: AccountType) {
    closeEditPanels();
    const ids = accounts.filter((a) => (a.type || "checking") === type).map((a) => a.id);
    setActiveAccountTypeGroup(type);
    setActiveAccounts(new Set(ids));
    setLastClickedAccountId(null);
    setView("transactions");
    setSidebarSection("cuentas");
  }

  /** Pulsar la cabecera "Cuentas" en general: vuelve al comportamiento normal (todas las cuentas), quitando cualquier seleccion de grupo o de cuenta individual. */
  function handleAccountsHeaderClick() {
    clearAccountSelection();
    setView("transactions");
    setSidebarSection("cuentas");
  }

  function findLastCategoryForName(name: string): Transaction | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const matches = transactions
      .filter((t) => t.type !== "transfer" && t.type !== "transfer_in" && t.name.toLowerCase() === trimmed.toLowerCase())
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return matches[0] || null;
  }
  function handleDescriptionAutocomplete(name: string) {
    if (!txDraft || txDraft.id) return; // solo al crear, no al editar
    const match = findLastCategoryForName(name);
    if (!match || match.type === "transfer" || match.type === "transfer_in") return;
    setTxDraft((d) => (d ? { ...d, categoryId: match.categoryId, subcategoryId: match.subcategoryId, subsubcategoryId: match.subsubcategoryId } : d));
  }

  function openNewTxForm() {
    if (!activeDoc || !activeDocId) return;
    setShowBulkEdit(false);
    setTxDraft(emptyDraft(accounts, activeDocId, categories));
    setShowTxForm(true);
  }
  function openScheduledForm() {
    if (!activeDoc || !activeDocId) return;
    setShowBulkEdit(false);
    setTxDraft({ ...emptyDraft(accounts, activeDocId, categories), recurringOn: true, status: "programado" });
    setShowTxForm(true);
  }
  function resetDraft() {
    setShowTxForm(false);
    setTxDraft(null);
  }

  // Clic en una fila del Programador: si ya es una ocurrencia real, se edita
  // tal cual. Si es solo una prevision (fecha futura aun no generada), se
  // abre su edicion con un borrador "virtual" que aun no existe en
  // `transactions` — no se materializa como movimiento real hasta que se
  // pulsa Guardar (submitTx inserta con ese id si no lo encuentra ya
  // existente); si se cancela, no queda ningun movimiento fantasma.
  function openProgramadorRow(row: ProgramadorRow) {
    if (row.real) {
      editTx(row.tx);
      return;
    }
    const virtualTx = { ...row.tx, id: genId(), seq: genSeq(), date: row.date, status: "programado" as const };
    editTx(virtualTx);
  }

  function openCategoryEdit(id: ID) {
    setShowTxForm(false);
    setShowBulkEdit(false);
    setCatEditId(id);
    setCatIsNew(false);
    setShowCatEdit(true);
  }

  function openNewCategory(kind: CategoryKind) {
    const id = addCategory("Nueva categoria", PALETTE[0], kind);
    setShowTxForm(false);
    setShowBulkEdit(false);
    setCatEditId(id);
    setCatIsNew(true);
    setShowCatEdit(true);
  }

  function otherDocIdOf(t: Transaction): ID {
    if (t.type === "transfer") return t.toDocId;
    if (t.type === "transfer_in") return t.fromDocId;
    return activeDocId as ID;
  }

  function submitTx(e: React.FormEvent) {
    e.preventDefault();
    if (!txDraft || !activeDoc || !activeDocId) return;
    if (!txDraft.name || !txDraft.amount || !txDraft.accountId) return;
    pushHistory();
    const amount = Number(txDraft.amount);
    const effectiveDate = txDraft.date || todayISO();
    const customAmounts: CustomAmountEntry[] = txDraft.variableAmount
      ? txDraft.customAmounts.filter((e) => e.date && e.amount !== "").map((e) => ({ date: e.date, amount: Number(e.amount) || 0 }))
      : [];
    const recurring = txDraft.recurringOn
      ? { interval: Number(txDraft.freqInterval) || 1, unit: txDraft.freqUnit, endDate: txDraft.freqNoEnd ? null : txDraft.recurringEndDate || null, customAmounts }
      : null;

    if (txDraft.type === "transfer") {
      // Pata de transferencia ya desvinculada: se edita ella sola, sin tocar
      // ni recrear la otra (dejaron de sincronizarse al desvincularlas).
      const editingExisting = txDraft.id ? transactions.find((t) => t.id === txDraft.id) : null;
      if (editingExisting && isTransferTx(editingExisting) && !editingExisting.linked) {
        const id = txDraft.id as ID;
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? ({ ...t, accountId: txDraft.accountId!, date: effectiveDate, name: txDraft.name, comment: txDraft.comment, amount, status: txDraft.status, recurring } as Transaction) : t)),
        );
        resetDraft();
        return;
      }
      if (!txDraft.toAccountId) return;
      if (txDraft.toDocId === activeDocId && txDraft.toAccountId === txDraft.accountId) return;
      const groupId = genId();
      const targetDoc = documents.find((d) => d.id === txDraft.toDocId);
      const sourceAccName = accounts.find((a) => a.id === txDraft.accountId)?.name ?? "-";
      const targetAccName = targetDoc?.accounts.find((a) => a.id === txDraft.toAccountId)?.name ?? "-";
      const crossDoc = txDraft.toDocId !== activeDocId;

      const legTransfer: Transaction = {
        id: genId(), seq: genSeq(), accountId: txDraft.accountId, date: effectiveDate, name: txDraft.name || "Transferencia", comment: txDraft.comment,
        categoryId: null, subcategoryId: null, subsubcategoryId: null, amount, type: "transfer", recurring, transferGroupId: groupId, status: txDraft.status,
        toAccountId: txDraft.toAccountId, toDocId: txDraft.toDocId, linked: true,
        toLabel: crossDoc ? (targetDoc ? targetDoc.name : "-") + " - " + targetAccName : targetAccName,
      };
      const legTransferIn: Transaction = {
        id: genId(), seq: genSeq(), accountId: txDraft.toAccountId, date: effectiveDate, name: txDraft.name || "Transferencia", comment: txDraft.comment,
        categoryId: null, subcategoryId: null, subsubcategoryId: null, amount, type: "transfer_in", recurring, transferGroupId: groupId, status: txDraft.status,
        fromAccountId: txDraft.accountId, fromDocId: activeDocId, linked: true,
        fromLabel: crossDoc ? activeDoc.name + " - " + sourceAccName : sourceAccName,
      };

      const linkedGroupId = txDraft.linkedGroupId;
      const editedId = txDraft.id;
      // Al editar, hay que quitar lo que había antes: si ya era una
      // transferencia, las dos patas del grupo antiguo; si era un
      // movimiento normal (Gasto/Ingreso) que se está convirtiendo en
      // transferencia, el propio movimiento original por su id.
      const removeOldGroup = (d: typeof activeDoc) =>
        editedId
          ? { ...d, transactions: d.transactions.filter((x) => (!isTransferTx(x) || x.transferGroupId !== linkedGroupId) && x.id !== editedId) }
          : d;

      if (!crossDoc) {
        applyToDocs([
          {
            docId: activeDocId,
            fn: (d) => {
              const base = txDraft.id ? removeOldGroup(d) : d;
              return { ...base, transactions: base.transactions.concat([legTransfer, legTransferIn]) };
            },
          },
        ]);
      } else {
        applyToDocs([
          {
            docId: activeDocId,
            fn: (d) => {
              const base = txDraft.id ? removeOldGroup(d) : d;
              return { ...base, transactions: base.transactions.concat([legTransfer]) };
            },
          },
          {
            docId: txDraft.toDocId,
            fn: (d) => {
              const base = txDraft.id ? removeOldGroup(d) : d;
              return { ...base, transactions: base.transactions.concat([legTransferIn]) };
            },
          },
        ]);
      }
    } else if (txDraft.id) {
      const id = txDraft.id;
      setTransactions((prev) => {
        const patch = {
          accountId: txDraft.accountId!,
          date: effectiveDate,
          name: txDraft.name,
          comment: txDraft.comment,
          categoryId: txDraft.categoryId,
          subcategoryId: txDraft.subcategoryId,
          subsubcategoryId: txDraft.subsubcategoryId,
          amount,
          type: txDraft.type,
          recurring,
          status: txDraft.status,
        };
        // Una ocurrencia del Programador aun no materializada se edita con un
        // borrador "virtual" que ya trae id pero todavia no existe en
        // `transactions`: si no se encuentra, se inserta con ese mismo id en
        // vez de no hacer nada (comportamiento normal de .map).
        if (!prev.some((t) => t.id === id)) {
          return prev.concat([{ id, seq: genSeq(), ...patch } as Transaction]);
        }
        return prev.map((t) => (t.id === id ? ({ ...t, ...patch } as Transaction) : t));
      });
    } else {
      setTransactions((prev) =>
        prev.concat([
          {
            id: genId(), seq: genSeq(), accountId: txDraft.accountId!, date: effectiveDate, name: txDraft.name, comment: txDraft.comment,
            categoryId: txDraft.categoryId, subcategoryId: txDraft.subcategoryId, subsubcategoryId: txDraft.subsubcategoryId,
            amount, type: txDraft.type, recurring, status: txDraft.status,
          } as Transaction,
        ]),
      );
    }
    resetDraft();
  }

  function editTx(t: Transaction) {
    if (!activeDocId) return;
    setShowBulkEdit(false);
    if (t.type === "transfer" || t.type === "transfer_in") {
      const isIncoming = t.type === "transfer_in";
      setTxDraft({
        id: t.id,
        linkedGroupId: t.transferGroupId,
        accountId: isIncoming ? t.fromAccountId : t.accountId,
        toDocId: isIncoming ? activeDocId : t.toDocId || activeDocId,
        toAccountId: isIncoming ? t.accountId : t.toAccountId,
        date: t.date, name: t.name, comment: t.comment || "", categoryId: null, subcategoryId: null, subsubcategoryId: null, amount: String(t.amount),
        type: "transfer", status: t.status || "pendiente", recurringOn: !!t.recurring, freqInterval: t.recurring ? t.recurring.interval : 1, freqUnit: t.recurring ? t.recurring.unit : "months",
        recurringEndDate: t.recurring?.endDate ?? "", freqNoEnd: !t.recurring?.endDate,
        variableAmount: !!t.recurring && t.recurring.customAmounts.length > 0,
        customAmounts: (t.recurring?.customAmounts ?? []).map((e) => ({ date: e.date, amount: String(e.amount) })),
      });
    } else {
      setTxDraft({
        id: t.id, accountId: t.accountId, toDocId: activeDocId, toAccountId: accounts[0]?.id ?? null,
        date: t.date, name: t.name, comment: t.comment || "", categoryId: t.categoryId, subcategoryId: t.subcategoryId, subsubcategoryId: t.subsubcategoryId,
        amount: String(t.amount),
        type: t.type, status: t.status || "pendiente", recurringOn: !!t.recurring, freqInterval: t.recurring ? t.recurring.interval : 1, freqUnit: t.recurring ? t.recurring.unit : "months",
        recurringEndDate: t.recurring?.endDate ?? "", freqNoEnd: !t.recurring?.endDate,
        variableAmount: !!t.recurring && t.recurring.customAmounts.length > 0,
        customAmounts: (t.recurring?.customAmounts ?? []).map((e) => ({ date: e.date, amount: String(e.amount) })),
      });
    }
    setShowTxForm(true);
  }

  // Boton "Duplicar" del formulario de edicion individual: crea una copia
  // independiente del movimiento abierto y abre esa copia para seguir
  // editandola, sin tocar el original. Las transferencias se excluyen (se
  // editan como par vinculado, igual que en la duplicacion en masa).
  function duplicateCurrentTx() {
    if (!txDraft?.id) return;
    const original = transactions.find((t) => t.id === txDraft.id);
    if (!original || isTransferTx(original)) return;
    pushHistory();
    const copy: Transaction = { ...original, id: genId(), seq: genSeq(), status: "pendiente" as const };
    setTransactions((prev) => prev.concat([copy]));
    editTx(copy);
  }

  function removeTx(t: Transaction) {
    if (!activeDocId) return;
    pushHistory();
    if (isTransferTx(t) && t.linked) {
      const otherDocId = otherDocIdOf(t);
      const groupId = t.transferGroupId;
      const fn = (d: NonNullable<typeof activeDoc>) => ({ ...d, transactions: d.transactions.filter((x) => !isTransferTx(x) || x.transferGroupId !== groupId) });
      applyToDocs([
        { docId: activeDocId, fn },
        { docId: otherDocId, fn },
      ]);
    } else {
      setTransactions((prev) => prev.filter((x) => x.id !== t.id));
    }
  }

  /**
   * Detiene una serie recurrente completa desde el Programador: a diferencia
   * de `removeTx` (que solo borra un movimiento suelto), aqui hay que quitar
   * el campo `recurring` de TODAS las transacciones pasadas de esa misma
   * serie (no solo la ancla mas reciente) — si no, `generateDueOccurrences`
   * la sigue encontrando como serie activa y vuelve a generar la ocurrencia
   * que se acaba de eliminar. El calculo de la serie usa `seriesKey`, la
   * misma clave que usan `computeProgramadorRows`/`computeProgramadorMonthStats`.
   */
  function removeProgramadorSeries(row: ProgramadorRow) {
    if (!window.confirm("¿Detener esta operacion recurrente? Se eliminara la ocurrencia y no se generaran mas en el futuro.")) return;
    const key = seriesKey(row.tx);
    setTransactions((prev) =>
      prev
        .filter((x) => !x.recurring || seriesKey(x) !== key || !(row.real && x.id === row.tx.id))
        .map((x) => (!x.recurring || seriesKey(x) !== key ? x : { ...x, recurring: null })),
    );
  }

  // Icono de cadena de una transferencia: desvincula si esta vinculada, o
  // revincula automaticamente (sin seleccion manual) con la transferencia
  // con la que estaba emparejada si esta desvinculada. En ambos casos la
  // referencia (transferGroupId) se conserva siempre, vinculada o no.
  function toggleTransferLink(t: Transaction) {
    if (!isTransferTx(t) || !activeDocId) return;
    pushHistory();
    const otherDocId = otherDocIdOf(t);
    const groupId = t.transferGroupId;
    const nextLinked = !t.linked;
    const fn = (d: NonNullable<typeof activeDoc>) => ({
      ...d,
      transactions: d.transactions.map((x) => (isTransferTx(x) && x.transferGroupId === groupId ? { ...x, linked: nextLinked } : x)),
    });
    applyToDocs([
      { docId: activeDocId, fn },
      { docId: otherDocId, fn },
    ]);
  }

  function cycleStatus(t: Transaction) {
    if (!activeDocId) return;
    pushHistory();
    const STATUS_ORDER: Transaction["status"][] = ["reconciliado", "pendiente", "programado", "anulado"];
    const idx = STATUS_ORDER.indexOf(t.status || "pendiente");
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    if (isTransferTx(t) && t.linked) {
      const otherDocId = otherDocIdOf(t);
      const groupId = t.transferGroupId;
      const fn = (d: NonNullable<typeof activeDoc>) => ({
        ...d,
        transactions: d.transactions.map((x) => (isTransferTx(x) && x.transferGroupId === groupId ? { ...x, status: next } : x)),
      });
      applyToDocs([
        { docId: activeDocId, fn },
        { docId: otherDocId, fn },
      ]);
    } else {
      setTransactions((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setLastClickedId(null);
  }

  // Boton "Limpiar" de la barra de Movimientos: repone la vista a su estado
  // inicial de un solo golpe (busqueda/filtros, seleccion, orden y
  // agrupacion, rango de fechas y los paneles de Filtros/Movimientos).
  function clearTransactionsView() {
    clearSelection();
    setFilters(emptyFilters());
    setSortBy(null);
    setGroupingActive(false);
    setViewRange(null);
    setShowMovementsRange(false);
    setShowFilters(false);
  }

  // Cualquier cambio de seleccion cierra sin guardar el panel de edicion que
  // estuviera abierto (movimiento, edicion en masa o categoria), igual que
  // pinchar en cualquier otro elemento distinto mientras hay un dialogo
  // abierto (comportamiento general de la app).
  function closeEditPanels() {
    setShowTxForm(false);
    setShowBulkEdit(false);
    setShowCatEdit(false);
    setCatEditId(null);
    setCatIsNew(false);
  }

  /** Clic normal: selecciona este elemento (sustituyendo la seleccion) y abre su edicion a la vez; si ya era la unica seleccion, deselecciona y cierra el panel. */
  function selectRow(id: ID) {
    setLastClickedId(id);
    const wasOnlySelected = selectedIds.size === 1 && selectedIds.has(id);
    if (wasOnlySelected) {
      setSelectedIds(new Set());
      closeEditPanels();
      return;
    }
    setSelectedIds(new Set([id]));
    closeEditPanels();
    const t = transactions.find((x) => x.id === id);
    if (t) editTx(t);
  }

  /** Tras cambiar la seleccion: 0 elementos cierra el panel, 1 abre su edicion completa, varios abre la edicion en masa automaticamente. */
  function openPanelForSelection(ids: Set<ID>) {
    if (ids.size > 1) {
      openBulkEdit(ids);
    } else if (ids.size === 1) {
      const t = transactions.find((x) => ids.has(x.id));
      if (t) editTx(t);
    } else {
      closeEditPanels();
    }
  }

  /** Mayusculas+clic: sustituye la seleccion por el rango entre el ultimo marcado y este. */
  function handleShiftSelect(id: ID) {
    if (lastClickedId !== null) {
      const ids = filteredTx.map((t) => t.id);
      const lastIdx = ids.indexOf(lastClickedId);
      const curIdx = ids.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        const rangeSet = new Set(ids.slice(start, end + 1));
        setSelectedIds(rangeSet);
        setLastClickedId(id);
        openPanelForSelection(rangeSet);
        return;
      }
    }
    const single = new Set([id]);
    setSelectedIds(single);
    setLastClickedId(id);
    openPanelForSelection(single);
  }

  /** Cmd/Ctrl+clic: anade o quita este elemento sin tocar el resto de la seleccion. */
  function handleToggleSelect(id: ID) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    setLastClickedId(id);
    openPanelForSelection(next);
  }

  function duplicateSelected() {
    const items = transactions.filter((t) => selectedIds.has(t.id) && t.type !== "transfer" && t.type !== "transfer_in");
    if (items.length === 0) return;
    setTransactions((prev) => prev.concat(items.map((t) => ({ ...t, id: genId(), seq: genSeq(), status: "pendiente" as const }))));
    setSelectedIds(new Set());
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return;
    if (!window.confirm("¿Eliminar " + selectedIds.size + " movimiento" + (selectedIds.size === 1 ? "" : "s") + " seleccionado" + (selectedIds.size === 1 ? "" : "s") + "?")) return;
    pushHistory();
    const toDelete = transactions.filter((t) => selectedIds.has(t.id));
    const groupIds = new Set(toDelete.filter(isTransferTx).map((t) => t.transferGroupId));
    const plainIds = new Set(toDelete.filter((t) => !isTransferTx(t)).map((t) => t.id));
    const fn = (d: NonNullable<typeof activeDoc>) => ({
      ...d,
      transactions: d.transactions.filter((x) => !((isTransferTx(x) && groupIds.has(x.transferGroupId)) || plainIds.has(x.id))),
    });
    // Las transferencias seleccionadas pueden apuntar a otro documento: hay que limpiar ese grupo alli tambien.
    const otherDocIds = new Set(toDelete.filter(isTransferTx).map((t) => otherDocIdOf(t)));
    applyToDocs(Array.from(new Set([activeDocId as ID, ...otherDocIds])).map((docId) => ({ docId, fn })));
    setSelectedIds(new Set());
  }

  // Supr/Delete elimina los movimientos seleccionados, salvo si el foco esta
  // en un campo editable (para no interferir con borrar texto en un input).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selectedIds.size === 0) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      e.preventDefault();
      deleteSelected();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds, transactions, activeDocId]);

  function openBulkEdit(idsOverride?: Set<ID>) {
    const ids = idsOverride ?? selectedIds;
    setShowTxForm(false);
    const selected = transactions.filter((t) => ids.has(t.id));
    setBulkEdit(computeBulkEditDraft(selected));
    setBulkEditTouched(new Set());
    setShowBulkEdit(true);
  }

  function touchBulkField(field: BulkEditField) {
    setBulkEditTouched((prev) => new Set(prev).add(field));
  }

  function applyBulkEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDocId) return;
    if (bulkEditTouched.size === 0) {
      setShowBulkEdit(false);
      setSelectedIds(new Set());
      return;
    }
    if (!window.confirm("¿Aplicar los cambios a " + selectedIds.size + " movimientos?")) return;
    pushHistory();
    const selectedTx = transactions.filter((t) => selectedIds.has(t.id));
    const groupIds = new Set(selectedTx.filter(isTransferTx).map((t) => t.transferGroupId));
    updateDoc(activeDocId, (d) => {
      const txs = d.transactions.map((t) => {
        const isSelected = selectedIds.has(t.id) || (isTransferTx(t) && groupIds.has(t.transferGroupId));
        if (!isSelected) return t;
        const isTransferLeg = isTransferTx(t);
        const patch: Record<string, unknown> = {};
        bulkEditTouched.forEach((field) => {
          if (isTransferLeg && (field === "accountId" || field === "categoryId" || field === "subcategoryId" || field === "subsubcategoryId")) return;
          patch[field] = bulkEdit[field];
        });
        return { ...t, ...patch } as Transaction;
      });
      return { ...d, transactions: txs };
    });
    setShowBulkEdit(false);
    setSelectedIds(new Set());
  }

  async function handleOpenDocumentFile() {
    try {
      const path = await pickOpenDocumentPath();
      if (!path) return;
      const doc = await readDocumentFromPath(path);
      addDocument(doc);
      addRecentPath(path);
    } catch (err) {
      console.error("Error abriendo el documento", err);
    }
  }
  function handleOpenTestDocument() {
    addDocument(createTestDocument());
  }
  // "Crear un nuevo documento" desde la bienvenida: primero se pide el
  // nombre (formulario propio de WelcomeScreen), luego se crea limpio (sin
  // arrastrar los documentos que estuvieran abiertos antes) y se guarda de
  // inmediato en el Escritorio, sin dialogo adicional.
  async function handleCreateFromWelcome(name: string): Promise<boolean> {
    if (!name.trim()) {
      setWelcomeError("Por favor, introduce un nombre para el nuevo documento.");
      return false;
    }
    const doc = createDocumentReplacing(name);
    if (!doc) return false;
    setWelcomeError(null);
    try {
      const path = await saveNewDocumentToDesktop(doc);
      setSavedPath(doc.id, path);
      addRecentPath(path);
      markSaved(doc.id);
    } catch (err) {
      console.error("Error guardando el documento nuevo en el Escritorio", err);
    }
    return true;
  }
  // "Abrir el ultimo documento usado": si el archivo ya no existe (movido o
  // eliminado), se avisa y el usuario se queda en la bienvenida.
  async function handleOpenLastUsed() {
    const path = recentPaths[0];
    if (!path) return;
    try {
      await openDocumentFromPathReplacing(path);
      setWelcomeError(null);
      setShowWelcome(false);
    } catch (err) {
      console.error("Error abriendo el ultimo documento usado", err);
      setWelcomeError("El ultimo documento usado ya no esta disponible (se ha movido o eliminado). Elige otra opcion.");
    }
  }
  // "Abrir un documento" desde la bienvenida: sustituye (nunca se queda
  // vinculado al documento anterior, a diferencia de "Anadir documento").
  // Si el usuario cancela el selector de archivos, no se cierra la bienvenida.
  async function handleOpenFileFromWelcome() {
    try {
      const path = await pickOpenDocumentPath();
      if (!path) return;
      await openDocumentFromPathReplacing(path);
      setWelcomeError(null);
      setShowWelcome(false);
    } catch (err) {
      console.error("Error abriendo el documento", err);
    }
  }
  function baseNameFromPath(path: string): string {
    const withSlashes = path.replace(/\\/g, "/");
    const last = withSlashes.slice(withSlashes.lastIndexOf("/") + 1);
    return last.replace(/\.nice$/i, "") || path;
  }

  // Archivo > Abrir... / Abrir Reciente: a diferencia de "Anadir documento"
  // (que deja el documento activo tal cual y anade el nuevo al lado), estas
  // dos acciones sustituyen el documento activo por el que se abre. Primero
  // se cierra el anterior y luego se anade el nuevo: si se hiciera al reves,
  // closeDocument leeria un `activeDocId` todavia no actualizado (closure
  // obsoleta dentro del mismo lote de renders) y podria dejar activo un
  // documento equivocado. El anterior nunca se borra del disco, solo deja
  // de estar abierto en esta sesion.
  async function openDocumentFromPathReplacing(path: string) {
    const doc = await readDocumentFromPath(path);
    const prevActiveId = activeDocId;
    if (prevActiveId) closeDocument(prevActiveId);
    addDocument(doc);
    addRecentPath(path);
  }
  async function handleOpenReplacing() {
    try {
      const path = await pickOpenDocumentPath();
      if (!path) return;
      await openDocumentFromPathReplacing(path);
    } catch (err) {
      console.error("Error abriendo el documento", err);
    }
  }
  async function handleOpenRecent(path: string) {
    try {
      await openDocumentFromPathReplacing(path);
    } catch (err) {
      console.error("Error abriendo el documento reciente", err);
    }
  }

  // Doble clic en un .nice desde el Finder: al arrancar, el backend puede
  // tener una ruta pendiente (evento Opened de macOS o argumento de linea de
  // comandos llegado antes de que este efecto se registre); y si la app ya
  // esta abierta, llega en vivo por el evento "open-document-path".
  const openPathHandlerRef = useRef(openDocumentFromPathReplacing);
  useEffect(() => {
    openPathHandlerRef.current = openDocumentFromPathReplacing;
  });
  useEffect(() => {
    if (loading) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const pending = await invoke<string | null>("take_pending_open_path");
        if (pending) {
          await openPathHandlerRef.current(pending);
          setShowWelcome(false);
        }
      } catch (err) {
        console.error("Error comprobando si habia un documento pendiente de abrir", err);
      }
      try {
        unlisten = await listen<string>("open-document-path", async (event) => {
          try {
            await openPathHandlerRef.current(event.payload);
            setShowWelcome(false);
          } catch (err) {
            console.error("Error abriendo el documento recibido del sistema", err);
          }
        });
      } catch (err) {
        console.error("Error escuchando la apertura de documentos del sistema", err);
      }
    })();
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  function duplicateActiveDocument() {
    if (!activeDoc) return;
    addDocument({ ...activeDoc, id: genId(), name: activeDoc.name + " copia" });
  }

  function openRenameDocument() {
    if (!activeDoc) return;
    setRenameValue(activeDoc.name);
    setShowRenameDoc(true);
  }
  function submitRenameDocument() {
    if (!activeDocId || !renameValue.trim()) return;
    updateDoc(activeDocId, (d) => ({ ...d, name: renameValue.trim() }));
    setShowRenameDoc(false);
  }

  function handlePrint() {
    window.print();
  }

  function saveCurrentFilter(name: string) {
    setSavedFilters((prev) => prev.concat([{ id: genId(), name, filters: { ...filters } }]));
  }
  function applySavedFilter(sf: SavedFilter) {
    setFilters({ ...sf.filters });
    setShowFilters(true);
    setView("transactions");
    setSidebarSection("cuentas");
  }
  function removeSavedFilter(id: ID) {
    if (!window.confirm("¿Eliminar este filtro guardado?")) return;
    setSavedFilters((prev) => prev.filter((sf) => sf.id !== id));
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filteredTx.map((t) => t.id)));
  }
  function handleSelectAllMenu() {
    const el = document.activeElement as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      (el as HTMLInputElement | HTMLTextAreaElement).select();
      return;
    }
    selectAllVisible();
  }
  function handleSearchMenu() {
    setShowFilters(() => true);
    setTimeout(() => {
      document.getElementById("filtros-search-input")?.focus();
    }, 50);
  }
  function handleNewDocumentMenu() {
    const base = "Sin título";
    let name = base;
    let n = 2;
    while (documents.some((d) => d.name === name)) {
      name = base + " " + n;
      n++;
    }
    createDocumentReplacing(name);
  }
  function handleCloseDocumentMenu() {
    if (activeDocId) requestCloseDocument(activeDocId);
  }
  // Papelera de una pastilla de documento (barra lateral), o boton rojo de
  // cerrar la ventana (macOS): cierra el documento (nunca borra el archivo
  // del disco; nunca cierra la app entera). Si tiene cambios sin guardar,
  // primero pregunta con el dialogo de 3 opciones; si esta limpio, cierra
  // directamente sin preguntar. Desde la barra lateral no se permite cerrar
  // el ultimo documento abierto (evita quedarse sin ninguno sin querer); el
  // boton rojo de la ventana si lo permite, cayendo a la pantalla de
  // bienvenida cuando no queda ningun documento abierto.
  function requestCloseDocument(id: ID, opts?: { evenIfLast?: boolean }) {
    if (!opts?.evenIfLast && documents.length <= 1) return;
    const doc = documents.find((d) => d.id === id);
    if (doc && isDocDirty(doc)) {
      setCloseDocConfirmId(id);
      return;
    }
    closeDocument(id);
  }
  function closeDocumentNow(id: ID) {
    closeDocument(id);
    setCloseDocConfirmId(null);
  }
  async function saveAndCloseDocument(id: ID) {
    const doc = documents.find((d) => d.id === id);
    if (doc) await handleSaveDoc(doc);
    closeDocumentNow(id);
  }

  // Boton rojo de la ventana (macOS): nunca cierra la app, solo el documento
  // activo (igual que su papelera en la barra lateral). Se usa un ref porque
  // el listener de Tauri se registra una sola vez al montar y debe ejecutar
  // siempre la version mas reciente de la logica de cierre, no la que
  // capturo el closure en el momento de suscribirse.
  const handleWindowCloseRef = useRef<() => void>(() => {});
  handleWindowCloseRef.current = () => {
    if (activeDocId) requestCloseDocument(activeDocId, { evenIfLast: true });
  };
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onCloseRequested((event) => {
        event.preventDefault();
        handleWindowCloseRef.current();
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, []);

  function handleNewFilterMenu() {
    setFilters(emptyFilters());
    setShowFilters(true);
    setView("transactions");
    setSidebarSection("cuentas");
  }
  function handleNewAccountMenu() {
    setView("transactions");
    setSidebarSection("cuentas");
    setNewAccountTrigger((n) => n + 1);
  }
  function handleNewCategoryMenu() {
    setView("categories");
    setSidebarSection("categories");
    setNewCategoryTrigger((n) => n + 1);
  }

  const menuHandlers: AppMenuHandlers = {
    newDocument: handleNewDocumentMenu,
    openWelcome: () => setShowWelcome(true),
    openReplacing: handleOpenReplacing,
    openRecent: handleOpenRecent,
    closeDocument: handleCloseDocumentMenu,
    save: handleSave,
    duplicateDocument: duplicateActiveDocument,
    renameDocument: openRenameDocument,
    exportCsv: handleExport,
    print: handlePrint,
    undo,
    redo,
    duplicateSelected,
    deleteSelected,
    selectAll: handleSelectAllMenu,
    search: handleSearchMenu,
    addDocument: handleOpenDocumentFile,
    newAccount: handleNewAccountMenu,
    newTransaction: openNewTxForm,
    newScheduled: openScheduledForm,
    newCategory: handleNewCategoryMenu,
    newFilter: handleNewFilterMenu,
  };
  const menuHandlersRef = useRef<AppMenuHandlers>(menuHandlers);
  const menuBuildSeqRef = useRef(0);
  useEffect(() => {
    menuHandlersRef.current = menuHandlers;
  });

  // Se identifica cada reconstruccion con un numero de secuencia creciente y
  // solo se aplica la ultima: reconstruir el menu implica rasterizar iconos
  // (asincrono) y con clics rapidos puede terminar antes una reconstruccion
  // mas vieja que una mas nueva, aplicando por error un estado de
  // habilitado/deshabilitado desactualizado en Deshacer/Rehacer.
  useEffect(() => {
    const seq = ++menuBuildSeqRef.current;
    buildAppMenu(menuHandlersRef, { canUndo, canRedo, recentPaths })
      .then((menu) => {
        if (menuBuildSeqRef.current !== seq) return;
        menu.setAsAppMenu().catch((err) => console.error("Error activando el menu nativo", err));
      })
      .catch((err) => console.error("Error construyendo el menu nativo", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, canRedo, recentPaths]);

  if (loading || showWelcome === null) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
        Cargando tus datos...
      </div>
    );
  }

  const accountsTitle = activeAccountTypeGroup
    ? ACCOUNT_GROUP_LABELS[activeAccountTypeGroup]
    : activeAccounts.size === 0
    ? "Todas las cuentas"
    : activeAccounts.size === 1
    ? accounts.find((a) => a.id === [...activeAccounts][0])?.name ?? "-"
    : activeAccounts.size + " cuentas seleccionadas";
  const accountsTitleIcon = activeAccountTypeGroup ? ACCOUNT_SECTIONS.find((s) => s.key === activeAccountTypeGroup)?.icon : undefined;
  const isEmptyGroupView = !!activeAccountTypeGroup && filteredTx.length === 0;

  return (
    <div style={{ height: "100vh", background: T.bg, color: T.text, fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: (sidebarCollapsed ? 44 : sidebarWidth) + "px 1fr", height: "100%", position: "relative" }}>
        {activeDoc && !showWelcome ? (
          <>
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
              documents={documents}
              activeDocId={activeDoc.id}
              setActiveDocId={(id) => {
                setActiveDocId(id);
                clearAccountSelection();
                setView("transactions");
              }}
              onCreateDocument={createDocumentReplacing}
              onRenameDocument={(id, newName) => updateDoc(id, (d) => ({ ...d, name: newName }))}
              onLinkDocument={handleOpenDocumentFile}
              onCloseDocument={requestCloseDocument}
              onSaveDocument={handleSaveDoc}
              onSaveAsDocument={handleSaveAs}
              accounts={accounts}
              balances={balances}
              totalBalance={totalBalance}
              activeAccounts={activeAccounts}
              activeAccountTypeGroup={activeAccountTypeGroup}
              onAccountClick={handleAccountClick}
              onAccountTypeGroupClick={handleAccountTypeGroupClick}
              onAccountsHeaderClick={handleAccountsHeaderClick}
              clearAccountSelection={clearAccountSelection}
              addAccount={addAccount}
              updateAccount={updateAccount}
              removeAccount={removeAccount}
              onReorderAccounts={reorderAccounts}
              newAccountTrigger={newAccountTrigger}
              view={view}
              setView={setView}
              sidebarSection={sidebarSection}
              setSidebarSection={setSidebarSection}
              recurringCount={programadorRows.length}
              categoriesCount={categories.length}
              savedFiltersCount={savedFilters.length}
              onOpenOptions={() => setShowOptionsModal(true)}
            />
            {!sidebarCollapsed && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = sidebarWidth;
                  const onMove = (moveEvent: MouseEvent) => {
                    const next = Math.min(420, Math.max(170, startWidth + (moveEvent.clientX - startX)));
                    setSidebarWidth(next);
                  };
                  const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
                style={{ position: "absolute", left: sidebarWidth - 3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 5 }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            <main style={{ background: T.bg, display: "flex", flexDirection: "row", minWidth: 0, minHeight: 0, flex: 1 }}>
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
                {view === "recurring" && (
                  <RecurringView
                    docName={activeDoc.name}
                    programadorRows={programadorRows}
                    monthIncome={programadorMonthStats.income}
                    monthExpense={programadorMonthStats.expense}
                    monthRangeLabel={monthRangeLabel}
                    accounts={accounts}
                    categories={categories}
                    accountName={(id) => accounts.find((a) => a.id === id)?.name ?? "-"}
                    onNewScheduled={openScheduledForm}
                    onOpenRow={openProgramadorRow}
                    onRemove={removeProgramadorSeries}
                    onImport={handleImportProgramador}
                  />
                )}

                {view === "categories" && (
                  <CategoriesView
                    docName={activeDoc.name}
                    categories={categories}
                    budgets={budgets}
                    spendByCategory={byCategory}
                    spendBySubcategory={bySubcategory}
                    maxSpend={maxCat}
                    monthIncome={monthIncome}
                    monthExpense={monthExpense}
                    onNewCategory={openNewCategory}
                    removeCategory={removeCategory}
                    onOpenCategory={openCategoryEdit}
                    removeSubcategory={removeSubcategory}
                    newCategoryTrigger={newCategoryTrigger}
                    onExport={handleExportCategories}
                    onImport={handleImportCategories}
                  />
                )}

                {view === "filters" && (
                  <FiltersView
                    docName={activeDoc.name}
                    savedFilters={savedFilters}
                    onApply={applySavedFilter}
                    onRemove={removeSavedFilter}
                    onNewFilter={handleNewFilterMenu}
                  />
                )}

                {view === "transactions" && (
                  <TransactionsView
                    title={accountsTitle}
                    titleIcon={accountsTitleIcon}
                    isEmptyGroupView={isEmptyGroupView}
                    monthIncome={monthIncome}
                    monthExpense={monthExpense}
                    onClearAll={clearTransactionsView}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    filters={filters}
                    setFilters={setFilters}
                    categories={categories}
                    onSaveFilter={saveCurrentFilter}
                    filteredTx={filteredTx}
                    selectedIds={selectedIds}
                    onSelectRow={selectRow}
                    onShiftSelect={handleShiftSelect}
                    onToggleSelect={handleToggleSelect}
                    resultingBalance={resultingBalance}
                    onEdit={editTx}
                    onRemove={removeTx}
                    onCycleStatus={cycleStatus}
                    onToggleLink={toggleTransferLink}
                    sortBy={sortBy}
                    onSort={handleSort}
                    groupKey={txGroupKey}
                    groupLabel={txGroupLabel}
                    canReorder={groupingActive && effectiveSortColumn !== "amount"}
                    onReorderWithinGroup={reorderWithinGroup}
                    showMovementsRange={showMovementsRange}
                    setShowMovementsRange={setShowMovementsRange}
                    onApplyMovementsRange={applyMovementsRange}
                    onAdd={openNewTxForm}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onExport={handleExport}
                    onImport={handleImport}
                    accountName={(id) => accounts.find((a) => a.id === id)?.name ?? "-"}
                    rowZoom={rowZoom}
                  />
                )}

                {view === "previsiones" && (
                  <PrevisionPanel
                    points={evoPoints}
                    ticks={evoTicks}
                    movements={previsionMovements}
                    categories={categories}
                    accountName={(id) => accounts.find((a) => a.id === id)?.name ?? "-"}
                    evoRange={evoRange}
                    setEvoRange={setEvoRange}
                  />
                )}
              </div>

              {(showTxForm || showBulkEdit || showCatEdit) && (
                <SidePanel
                  title={showCatEdit ? (catIsNew ? "Nueva categoria" : "Editar categoria") : showBulkEdit ? "Editar " + selectedIds.size + " movimientos" : txDraft?.id ? "Editar movimiento" : "Nuevo movimiento"}
                  onClose={() => {
                    if (showCatEdit) {
                      setShowCatEdit(false);
                      setCatEditId(null);
                      setCatIsNew(false);
                    } else if (showBulkEdit) {
                      setShowBulkEdit(false);
                    } else {
                      resetDraft();
                    }
                  }}
                >
                  {showCatEdit ? (
                    (() => {
                      const catEditCategory = categories.find((c) => c.id === catEditId);
                      return (
                        catEditCategory && (
                          <CategoryEditForm
                            category={catEditCategory}
                            budgets={budgets}
                            hideKind={catIsNew}
                            setCategoryName={setCategoryName}
                            setCategoryKind={setCategoryKind}
                            setCategoryColor={setCategoryColor}
                            setBudget={setBudget}
                            addSubcategory={addSubcategory}
                            removeSubcategory={removeSubcategory}
                            onDone={() => {
                              setShowCatEdit(false);
                              setCatEditId(null);
                              setCatIsNew(false);
                            }}
                          />
                        )
                      );
                    })()
                  ) : showBulkEdit ? (
                    <BulkEditForm
                      bulkEdit={bulkEdit}
                      setBulkEdit={(fn) => setBulkEdit(fn)}
                      touchedFields={bulkEditTouched}
                      touchField={touchBulkField}
                      accounts={accounts}
                      categories={categories}
                      selectedCount={selectedIds.size}
                      onSubmit={applyBulkEdit}
                      onCancel={() => setShowBulkEdit(false)}
                    />
                  ) : (
                    txDraft && (
                      <TransactionForm
                        txDraft={txDraft}
                        setTxDraft={(fn) => setTxDraft((d) => (d ? fn(d) : d))}
                        accounts={accounts}
                        categories={categories}
                        documents={documents}
                        activeDocId={activeDoc.id}
                        onDescriptionChange={handleDescriptionAutocomplete}
                        onCreateCategory={addCategory}
                        onCreateSubcategory={addSubcategory}
                        onCreateSubSubcategory={addSubSubcategory}
                        onCreateDestinoAccount={createDestinoAccount}
                        setCategoryColor={setCategoryColor}
                        onSubmit={submitTx}
                        onCancel={resetDraft}
                        onDuplicate={duplicateCurrentTx}
                      />
                    )
                  )}
                </SidePanel>
              )}
            </main>

            <div style={{ height: 40, flexShrink: 0, borderTop: "1px solid " + T.border, background: T.bgElevated, display: "flex", alignItems: "center", padding: "0 16px", position: "relative" }}>
              <button
                onClick={() => setShowPrevisionFloat((s) => !s)}
                style={{ background: "none", border: "none", color: showPrevisionFloat ? T.accent : T.textFaint, padding: 4, display: "flex" }}
                aria-label="Previsión de balance"
                title="Previsión de balance"
              >
                <LineChart size={16} />
              </button>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 20 }}>
                <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total seleccionado</span>
                <span className="amount" style={{ fontSize: 13, fontWeight: 700 }}>{fmt(scopedSelectedTotal)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid " + T.border, borderRadius: 6, overflow: "hidden" }}>
                <button
                  onClick={() => setRowZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))}
                  style={{ background: "none", border: "none", color: T.textMuted, padding: "5px 9px", borderRight: "1px solid " + T.border }}
                  aria-label="Aumentar tamaño de fila"
                  title="Aumentar tamaño de fila"
                >
                  <Plus size={13} />
                </button>
                <button
                  onClick={() => setRowZoom((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
                  style={{ background: "none", border: "none", color: T.textMuted, padding: "5px 9px" }}
                  aria-label="Reducir tamaño de fila"
                  title="Reducir tamaño de fila"
                >
                  <Minus size={13} />
                </button>
              </div>

              {showPrevisionFloat && (
                <PrevisionFloatPanel
                  movements={previsionMovements}
                  categories={categories}
                  accountName={(id) => accounts.find((a) => a.id === id)?.name ?? "-"}
                  evoRange={evoRange}
                  setEvoRange={setEvoRange}
                  onClose={() => setShowPrevisionFloat(false)}
                />
              )}
            </div>
            </div>
          </>
        ) : (
          <WelcomeScreen
            onCreate={async (name) => {
              const created = await handleCreateFromWelcome(name);
              if (created) setShowWelcome(false);
            }}
            onOpenFile={handleOpenFileFromWelcome}
            onOpenTest={() => {
              handleOpenTestDocument();
              setShowWelcome(false);
            }}
            lastUsedName={recentPaths[0] ? baseNameFromPath(recentPaths[0]) : null}
            onOpenLastUsed={handleOpenLastUsed}
            error={welcomeError}
            skipWelcomeOnStart={skipWelcomeOnStart}
            onToggleSkipWelcome={setSkipWelcomeOnStart}
          />
        )}
      </div>
      {showRenameDoc && <RenameDocumentModal value={renameValue} onChange={setRenameValue} onSubmit={submitRenameDocument} onCancel={() => setShowRenameDoc(false)} />}
      {closeDocConfirmId &&
        (() => {
          const d = documents.find((x) => x.id === closeDocConfirmId);
          if (!d) return null;
          return (
            <CloseDocumentModal
              docName={d.name}
              onSaveAndClose={() => saveAndCloseDocument(d.id)}
              onCloseWithoutSaving={() => closeDocumentNow(d.id)}
              onCancel={() => setCloseDocConfirmId(null)}
            />
          );
        })()}
      {showOptionsModal && (
        <OptionsModal
          currency={currency}
          onChangeCurrency={setCurrency}
          passwordProtect={passwordProtect}
          onTogglePasswordProtect={() => setPasswordProtect(!passwordProtect)}
          onClose={() => setShowOptionsModal(false)}
        />
      )}
    </div>
  );
}
