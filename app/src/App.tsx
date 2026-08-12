import { useEffect, useMemo, useState } from "react";
import { T } from "./theme";
import { useDocuments } from "./lib/useDocuments";
import { genId, genSeq } from "./lib/id";
import { computeBalances, computeChronological, computeRunningMaps, hasLocalSibling, pairedTransferId } from "./lib/balances";
import { emptyDraft, type TxDraft } from "./lib/txDraft";
import { emptyBulkEdit, type BulkEditState } from "./lib/bulkEdit";
import { currentWeekRange, freqPerMonth, monthKey, shortDate, todayISO } from "./lib/format";
import { computeEvoPoints, computeEvoTicks, type EvoRange } from "./lib/evolution";
import { exportTransactionsCsv, pickAndImportIcomptaCsv } from "./lib/csv";
import { pickOpenDocumentPath, readDocumentFromPath } from "./lib/docFile";
import { createTestDocument } from "./lib/testSeed";
import { isTransferTx, type Account, type AccountType, type Budgets, type Category, type CategoryKind, type Filters, type ID, type SavedFilter, type SortColumn, type SortState, type Transaction } from "./types";
import { ACCOUNT_SECTIONS, Sidebar, type MainView } from "./components/Sidebar";
import { TransactionForm } from "./components/TransactionForm";
import { BulkEditForm } from "./components/BulkEditForm";
import { SidePanel } from "./components/SidePanel";
import { TransactionsView } from "./components/TransactionsView";
import { RecurringView } from "./components/RecurringView";
import { CategoriesView } from "./components/CategoriesView";
import { FiltersView } from "./components/FiltersView";
import { BalanceChart } from "./components/BalanceChart";
import { WelcomeScreen } from "./components/WelcomeScreen";

const emptyFilters = (): Filters => ({ search: "", categories: [], subcategories: [], type: "all", from: "", to: "" });

export default function App() {
  const { loading, documents, activeDocId, setActiveDocId, activeDoc, updateDoc, applyToDocs, createDocument, addDocument, removeDocument } = useDocuments();

  const [activeAccounts, setActiveAccounts] = useState<Set<ID>>(new Set());
  const [lastClickedAccountId, setLastClickedAccountId] = useState<ID | null>(null);
  const [view, setView] = useState<MainView>("transactions");
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
  const [bulkEdit, setBulkEdit] = useState<BulkEditState>(emptyBulkEdit([], []));
  const [sortBy, setSortBy] = useState<SortState | null>(null);

  function handleSort(column: SortColumn) {
    setSortBy((prev) => (prev && prev.column === column ? { column, dir: prev.dir === "asc" ? "desc" : "asc" } : { column, dir: "asc" }));
  }

  function applyMovementsRange(from: string, to: string) {
    setViewRange({ from, to });
    setShowMovementsRange(false);
  }
  function resetMovementsRange() {
    setViewRange(null);
  }

  const accounts = activeDoc?.accounts ?? [];
  const transactions = activeDoc?.transactions ?? [];
  const categories = activeDoc?.categories ?? [];
  const budgets = activeDoc?.budgets ?? {};
  const savedFilters = activeDoc?.savedFilters ?? [];

  const balances = useMemo(() => computeBalances(accounts, transactions), [accounts, transactions]);
  const totalBalance = accounts.reduce((s, a) => s + (balances[a.id] || 0), 0);

  const scopeIds = useMemo(() => (activeAccounts.size === 0 ? new Set(accounts.map((a) => a.id)) : activeAccounts), [activeAccounts, accounts]);
  const scopedTotal = useMemo(() => accounts.filter((a) => scopeIds.has(a.id)).reduce((s, a) => s + (balances[a.id] || 0), 0), [accounts, scopeIds, balances]);

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
      case "balance":
        return resultingBalance(t);
    }
  }

  const effectiveViewRange = viewRange ?? currentWeekRange();

  const filteredTx = useMemo(() => {
    const base = scoped
      .filter((t) => t.type !== "transfer_in" || !hasLocalSibling(t, transactions))
      .filter((t) => t.date >= effectiveViewRange.from && t.date <= effectiveViewRange.to)
      .filter((t) => filters.categories.length === 0 || (t.categoryId && filters.categories.includes(t.categoryId)))
      .filter((t) => filters.subcategories.length === 0 || (t.subcategoryId && filters.subcategories.includes(t.subcategoryId)))
      .filter((t) => filters.type === "all" || (filters.type === "transfer" ? t.type === "transfer" || t.type === "transfer_in" : t.type === filters.type))
      .filter((t) => !filters.from || t.date >= filters.from)
      .filter((t) => !filters.to || t.date <= filters.to)
      .filter((t) => !filters.search || t.name.toLowerCase().includes(filters.search.toLowerCase()))
      .slice();
    if (!sortBy) {
      return base.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
    const dir = sortBy.dir === "asc" ? 1 : -1;
    return base.sort((a, b) => {
      const va = sortValue(a, sortBy.column);
      const vb = sortValue(b, sortBy.column);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [scoped, filters, transactions, sortBy, runningMaps, effectiveViewRange.from, effectiveViewRange.to]);

  const curMonthKey = monthKey(todayISO());
  const thisMonthTx = scoped.filter((t) => monthKey(t.date) === curMonthKey);
  const monthIncome = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const byCategory = useMemo(() => {
    const map = new Map<ID, number>();
    thisMonthTx
      .filter((t) => t.type === "expense" && t.categoryId)
      .forEach((t) => map.set(t.categoryId as ID, (map.get(t.categoryId as ID) || 0) + Number(t.amount)));
    return Array.from(map.entries())
      .map(([id, val]) => ({ id, val }))
      .sort((a, b) => b.val - a.val);
  }, [thisMonthTx]);
  const maxCat = Math.max(1, ...byCategory.map((c) => c.val));

  const recurringList = useMemo(() => transactions.filter((t) => t.recurring && t.type !== "transfer_in"), [transactions]);
  const forecastNetPerMonth = useMemo(() => {
    let net = 0;
    recurringList.forEach((t) => {
      if (!t.recurring) return;
      net += (t.type === "income" ? 1 : -1) * Number(t.amount) * freqPerMonth(t.recurring);
    });
    return net;
  }, [recurringList]);

  const evoPoints = useMemo(
    () => computeEvoPoints(accounts, chronological, transactions, scopeIds, resultingBalance, evoRange),
    [accounts, chronological, transactions, scopeIds, runningMaps, evoRange],
  );
  const evoTicks = useMemo(() => computeEvoTicks(evoPoints), [evoPoints]);

  function setAccounts(fn: (a: Account[]) => Account[]) {
    if (!activeDocId) return;
    updateDoc(activeDocId, (d) => ({ ...d, accounts: fn(d.accounts) }));
  }
  function setTransactions(fn: (t: Transaction[]) => Transaction[]) {
    if (!activeDocId) return;
    updateDoc(activeDocId, (d) => ({ ...d, transactions: fn(d.transactions) }));
  }
  function setCategories(fn: (c: Category[]) => Category[]) {
    if (!activeDocId) return;
    updateDoc(activeDocId, (d) => ({ ...d, categories: fn(d.categories) }));
  }
  function setBudgets(fn: (b: Budgets) => Budgets) {
    if (!activeDocId) return;
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
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }
  function setCategoryColor(id: ID, color: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
  }
  function addSubcategory(catId: ID, name: string, color: string): ID {
    const id = genId();
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, subcategories: c.subcategories.concat([{ id, name, color, subcategories: [] }]) } : c)));
    return id;
  }
  function removeSubcategory(catId: ID, subId: ID) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c)));
  }
  function setSubcategoryColor(catId: ID, subId: ID, color: string) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, subcategories: c.subcategories.map((s) => (s.id === subId ? { ...s, color } : s)) } : c)));
  }
  function addSubSubcategory(catId: ID, subId: ID, name: string, color: string): ID {
    const id = genId();
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== catId
          ? c
          : { ...c, subcategories: c.subcategories.map((s) => (s.id !== subId ? s : { ...s, subcategories: s.subcategories.concat([{ id, name, color, subcategories: [] }]) })) },
      ),
    );
    return id;
  }
  function removeSubSubcategory(catId: ID, subId: ID, subsubId: ID) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== catId ? c : { ...c, subcategories: c.subcategories.map((s) => (s.id !== subId ? s : { ...s, subcategories: s.subcategories.filter((ss) => ss.id !== subsubId) })) },
      ),
    );
  }
  function setSubSubcategoryColor(catId: ID, subId: ID, subsubId: ID, color: string) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== catId
          ? c
          : { ...c, subcategories: c.subcategories.map((s) => (s.id !== subId ? s : { ...s, subcategories: s.subcategories.map((ss) => (ss.id === subsubId ? { ...ss, color } : ss)) })) },
      ),
    );
  }
  function setBudget(catId: ID, value: number | undefined) {
    setBudgets((prev) => ({ ...prev, [catId]: value as number }));
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
    } catch (err) {
      console.error("Error importando CSV", err);
    }
  }

  function addAccount(name: string, type: AccountType, opening: number, linkedAccountId: ID | null) {
    setAccounts((prev) => prev.concat([{ id: genId(), name, opening, warning: 0, type, linkedAccountId: type === "credit" ? linkedAccountId : null }]));
  }
  function updateAccount(id: ID, name: string, type: AccountType, opening: number, linkedAccountId: ID | null) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, name, type, opening, linkedAccountId: type === "credit" ? linkedAccountId : null } : a)));
  }
  function removeAccount(id: ID) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setTransactions((prev) => prev.filter((t) => t.accountId !== id));
    setActiveAccounts((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }
  function handleAccountClick(id: ID, shiftKey: boolean) {
    if (!shiftKey) {
      setActiveAccounts(new Set([id]));
      setLastClickedAccountId(id);
      return;
    }
    if (lastClickedAccountId !== null) {
      const orderedIds = ACCOUNT_SECTIONS.flatMap((section) => accounts.filter((a) => (a.type || "checking") === section.key)).map((a) => a.id);
      const lastIdx = orderedIds.indexOf(lastClickedAccountId);
      const curIdx = orderedIds.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        const rangeIds = orderedIds.slice(start, end + 1);
        setActiveAccounts((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((rid) => next.add(rid));
          return next;
        });
        setLastClickedAccountId(id);
        return;
      }
    }
    setActiveAccounts((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setLastClickedAccountId(id);
  }
  function clearAccountSelection() {
    setActiveAccounts(new Set());
    setLastClickedAccountId(null);
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

  function otherDocIdOf(t: Transaction): ID {
    if (t.type === "transfer") return t.toDocId;
    if (t.type === "transfer_in") return t.fromDocId;
    return activeDocId as ID;
  }

  function submitTx(e: React.FormEvent) {
    e.preventDefault();
    if (!txDraft || !activeDoc || !activeDocId) return;
    if (!txDraft.name || !txDraft.amount || !txDraft.accountId) return;
    const amount = Number(txDraft.amount);
    const recurring = txDraft.recurringOn ? { interval: Number(txDraft.freqInterval) || 1, unit: txDraft.freqUnit, endDate: txDraft.recurringEndDate || null } : null;

    if (txDraft.type === "transfer") {
      // Pata de transferencia ya desvinculada: se edita ella sola, sin tocar
      // ni recrear la otra (dejaron de sincronizarse al desvincularlas).
      const editingExisting = txDraft.id ? transactions.find((t) => t.id === txDraft.id) : null;
      if (editingExisting && isTransferTx(editingExisting) && !editingExisting.linked) {
        const id = txDraft.id as ID;
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? ({ ...t, accountId: txDraft.accountId!, date: txDraft.date, name: txDraft.name, comment: txDraft.comment, amount, status: txDraft.status, recurring } as Transaction) : t)),
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
        id: genId(), seq: genSeq(), accountId: txDraft.accountId, date: txDraft.date, name: txDraft.name || "Transferencia", comment: txDraft.comment,
        categoryId: null, subcategoryId: null, subsubcategoryId: null, amount, type: "transfer", recurring, transferGroupId: groupId, status: txDraft.status,
        toAccountId: txDraft.toAccountId, toDocId: txDraft.toDocId, linked: true,
        toLabel: crossDoc ? (targetDoc ? targetDoc.name : "-") + " - " + targetAccName : targetAccName,
      };
      const legTransferIn: Transaction = {
        id: genId(), seq: genSeq(), accountId: txDraft.toAccountId, date: txDraft.date, name: txDraft.name || "Transferencia", comment: txDraft.comment,
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
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id
            ? ({
                ...t,
                accountId: txDraft.accountId!,
                date: txDraft.date,
                name: txDraft.name,
                comment: txDraft.comment,
                categoryId: txDraft.categoryId,
                subcategoryId: txDraft.subcategoryId,
                subsubcategoryId: txDraft.subsubcategoryId,
                amount,
                type: txDraft.type,
                recurring,
                status: txDraft.status,
              } as Transaction)
            : t,
        ),
      );
    } else {
      setTransactions((prev) =>
        prev.concat([
          {
            id: genId(), seq: genSeq(), accountId: txDraft.accountId!, date: txDraft.date, name: txDraft.name, comment: txDraft.comment,
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
        recurringEndDate: t.recurring?.endDate ?? "",
      });
    } else {
      setTxDraft({
        id: t.id, accountId: t.accountId, toDocId: activeDocId, toAccountId: accounts[0]?.id ?? null,
        date: t.date, name: t.name, comment: t.comment || "", categoryId: t.categoryId, subcategoryId: t.subcategoryId, subsubcategoryId: t.subsubcategoryId,
        amount: String(t.amount),
        type: t.type, status: t.status || "pendiente", recurringOn: !!t.recurring, freqInterval: t.recurring ? t.recurring.interval : 1, freqUnit: t.recurring ? t.recurring.unit : "months",
        recurringEndDate: t.recurring?.endDate ?? "",
      });
    }
    setShowTxForm(true);
  }

  function removeTx(t: Transaction) {
    if (!activeDocId) return;
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

  function toggleTransferLink(t: Transaction) {
    if (!isTransferTx(t) || !activeDocId || !t.linked) return;
    const otherDocId = otherDocIdOf(t);
    const groupId = t.transferGroupId;
    const fn = (d: NonNullable<typeof activeDoc>) => ({
      ...d,
      transactions: d.transactions.map((x) => (isTransferTx(x) && x.transferGroupId === groupId ? { ...x, linked: false } : x)),
    });
    applyToDocs([
      { docId: activeDocId, fn },
      { docId: otherDocId, fn },
    ]);
  }

  function cycleStatus(t: Transaction) {
    if (!activeDocId) return;
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

  function handleShiftSelect(id: ID) {
    if (lastClickedId !== null) {
      const ids = filteredTx.map((t) => t.id);
      const lastIdx = ids.indexOf(lastClickedId);
      const curIdx = ids.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        const rangeIds = ids.slice(start, end + 1);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((rid) => next.add(rid));
          return next;
        });
        setLastClickedId(id);
        return;
      }
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setLastClickedId(id);
  }

  function duplicateSelected() {
    const items = transactions.filter((t) => selectedIds.has(t.id) && t.type !== "transfer" && t.type !== "transfer_in");
    if (items.length === 0) return;
    setTransactions((prev) => prev.concat(items.map((t) => ({ ...t, id: genId(), seq: genSeq(), status: "pendiente" as const }))));
    setSelectedIds(new Set());
  }

  function deleteSelected() {
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

  function openBulkEdit() {
    setShowTxForm(false);
    setBulkEdit(emptyBulkEdit(accounts, categories));
    setShowBulkEdit(true);
  }

  function applyBulkEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDocId) return;
    const selectedTx = transactions.filter((t) => selectedIds.has(t.id));
    const groupIds = new Set(selectedTx.filter(isTransferTx).map((t) => t.transferGroupId));
    updateDoc(activeDocId, (d) => {
      const txs = d.transactions.map((t) => {
        const isSelected = selectedIds.has(t.id) || (isTransferTx(t) && groupIds.has(t.transferGroupId));
        if (!isSelected) return t;
        const isTransferLeg = isTransferTx(t);
        const patch: Partial<Transaction> = { date: bulkEdit.date, status: bulkEdit.status };
        if (!isTransferLeg) {
          (patch as Record<string, unknown>).accountId = bulkEdit.accountId;
          (patch as Record<string, unknown>).categoryId = bulkEdit.categoryId;
          (patch as Record<string, unknown>).subcategoryId = bulkEdit.subcategoryId;
          (patch as Record<string, unknown>).subsubcategoryId = bulkEdit.subsubcategoryId;
        }
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
    } catch (err) {
      console.error("Error abriendo el documento", err);
    }
  }
  function handleOpenTestDocument() {
    addDocument(createTestDocument());
  }

  function saveCurrentFilter(name: string) {
    setSavedFilters((prev) => prev.concat([{ id: genId(), name, filters: { ...filters } }]));
  }
  function applySavedFilter(sf: SavedFilter) {
    setFilters({ ...sf.filters });
    setShowFilters(true);
    setView("transactions");
  }
  function removeSavedFilter(id: ID) {
    setSavedFilters((prev) => prev.filter((sf) => sf.id !== id));
  }

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
        Cargando tus datos...
      </div>
    );
  }

  const accountsTitle =
    activeAccounts.size === 0 ? "Todas las cuentas" : activeAccounts.size === 1 ? accounts.find((a) => a.id === [...activeAccounts][0])?.name ?? "-" : activeAccounts.size + " cuentas seleccionadas";

  return (
    <div style={{ height: "100vh", background: T.bg, color: T.text, fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", height: "100%" }}>
        {activeDoc ? (
          <>
            <Sidebar
              documents={documents}
              activeDocId={activeDoc.id}
              setActiveDocId={(id) => {
                setActiveDocId(id);
                clearAccountSelection();
                setView("transactions");
              }}
              activeDoc={activeDoc}
              createDocument={createDocument}
              removeDocument={removeDocument}
              accounts={accounts}
              balances={balances}
              totalBalance={totalBalance}
              activeAccounts={activeAccounts}
              onAccountClick={handleAccountClick}
              clearAccountSelection={clearAccountSelection}
              addAccount={addAccount}
              updateAccount={updateAccount}
              removeAccount={removeAccount}
              view={view}
              setView={setView}
              recurringCount={recurringList.length}
              categoriesCount={categories.length}
              savedFiltersCount={savedFilters.length}
            />
            <main style={{ background: T.bg, display: "flex", flexDirection: "row", minWidth: 0, minHeight: 0 }}>
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
                {view === "recurring" && (
                  <RecurringView
                    docName={activeDoc.name}
                    recurringList={recurringList}
                    netPerMonth={forecastNetPerMonth}
                    categories={categories}
                    accountName={(id) => accounts.find((a) => a.id === id)?.name ?? "-"}
                    onNewScheduled={openScheduledForm}
                  />
                )}

                {view === "categories" && (
                  <CategoriesView
                    docName={activeDoc.name}
                    categories={categories}
                    budgets={budgets}
                    spendByCategory={byCategory}
                    maxSpend={maxCat}
                    addCategory={addCategory}
                    removeCategory={removeCategory}
                    setCategoryColor={setCategoryColor}
                    addSubcategory={addSubcategory}
                    removeSubcategory={removeSubcategory}
                    setSubcategoryColor={setSubcategoryColor}
                    addSubSubcategory={addSubSubcategory}
                    removeSubSubcategory={removeSubSubcategory}
                    setSubSubcategoryColor={setSubSubcategoryColor}
                    setBudget={setBudget}
                  />
                )}

                {view === "filters" && <FiltersView docName={activeDoc.name} savedFilters={savedFilters} onApply={applySavedFilter} onRemove={removeSavedFilter} />}

                {view === "transactions" && (
                  <TransactionsView
                    title={accountsTitle}
                    monthIncome={monthIncome}
                    monthExpense={monthExpense}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    filters={filters}
                    setFilters={setFilters}
                    categories={categories}
                    onSaveFilter={saveCurrentFilter}
                    filteredTx={filteredTx}
                    selectedIds={selectedIds}
                    onShiftSelect={handleShiftSelect}
                    resultingBalance={resultingBalance}
                    onEdit={editTx}
                    onRemove={removeTx}
                    onCycleStatus={cycleStatus}
                    onToggleLink={toggleTransferLink}
                    sortBy={sortBy}
                    onSort={handleSort}
                    showMovementsRange={showMovementsRange}
                    setShowMovementsRange={setShowMovementsRange}
                    onApplyMovementsRange={applyMovementsRange}
                    viewRangeIsDefault={viewRange === null}
                    viewRangeLabel={shortDate(effectiveViewRange.from) + " - " + shortDate(effectiveViewRange.to)}
                    onResetMovementsRange={resetMovementsRange}
                    onAdd={openNewTxForm}
                    onExport={handleExport}
                    onImport={handleImport}
                    onClearSelection={clearSelection}
                    onDuplicateSelected={duplicateSelected}
                    onBulkEditSelected={openBulkEdit}
                    onDeleteSelected={deleteSelected}
                    footerLabel="Total seleccionado"
                    footerAmount={scopedTotal}
                    chart={<BalanceChart points={evoPoints} ticks={evoTicks} evoRange={evoRange} setEvoRange={setEvoRange} />}
                  />
                )}
              </div>

              {(showTxForm || showBulkEdit) && (
                <SidePanel
                  title={showBulkEdit ? "Editar " + selectedIds.size + " movimientos" : txDraft?.id ? "Editar movimiento" : "Nuevo movimiento"}
                  onClose={() => (showBulkEdit ? setShowBulkEdit(false) : resetDraft())}
                >
                  {showBulkEdit ? (
                    <BulkEditForm
                      bulkEdit={bulkEdit}
                      setBulkEdit={(fn) => setBulkEdit(fn)}
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
                        onSubmit={submitTx}
                        onCancel={resetDraft}
                      />
                    )
                  )}
                </SidePanel>
              )}
            </main>
          </>
        ) : (
          <WelcomeScreen onCreate={createDocument} onOpenFile={handleOpenDocumentFile} onOpenTest={handleOpenTestDocument} />
        )}
      </div>
    </div>
  );
}
