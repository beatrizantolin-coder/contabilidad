import { useMemo, useState } from "react";
import { FREQUENCIES, T } from "./theme";
import { useDocuments } from "./lib/useDocuments";
import { genId, genSeq } from "./lib/id";
import { computeBalances, computeChronological, computeRunningMaps, hasLocalSibling, pairedTransferId } from "./lib/balances";
import { emptyDraft, type TxDraft } from "./lib/txDraft";
import { monthKey, todayISO } from "./lib/format";
import { computeEvoPoints, computeEvoTicks, type EvoRange } from "./lib/evolution";
import { exportTransactionsCsv, pickAndImportCsv } from "./lib/csv";
import { isTransferTx, type Account, type AccountType, type Budgets, type Category, type ID, type Transaction } from "./types";
import { Sidebar, type MainView } from "./components/Sidebar";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionsView, type Filters } from "./components/TransactionsView";
import { RecurringView } from "./components/RecurringView";
import { CategoriesView } from "./components/CategoriesView";
import { BalanceChart } from "./components/BalanceChart";

export default function App() {
  const { loading, documents, activeDocId, setActiveDocId, activeDoc, updateDoc, applyToDocs, createDocument, removeDocument } = useDocuments();

  const [activeAccount, setActiveAccount] = useState<ID | "all">("all");
  const [view, setView] = useState<MainView>("transactions");
  const [showTxForm, setShowTxForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ search: "", category: "all", type: "all", from: "", to: "" });
  const [txDraft, setTxDraft] = useState<TxDraft | null>(null);
  const [evoRange, setEvoRange] = useState<EvoRange>({ from: "", to: "" });

  const accounts = activeDoc?.accounts ?? [];
  const transactions = activeDoc?.transactions ?? [];
  const categories = activeDoc?.categories ?? [];
  const budgets = activeDoc?.budgets ?? {};

  const balances = useMemo(() => computeBalances(accounts, transactions), [accounts, transactions]);
  const totalBalance = accounts.reduce((s, a) => s + (balances[a.id] || 0), 0);

  const chronological = useMemo(() => computeChronological(transactions), [transactions]);
  const runningMaps = useMemo(() => computeRunningMaps(accounts, chronological), [accounts, chronological]);

  function resultingBalance(t: Transaction): number {
    if (activeAccount === "all") {
      if (t.type === "transfer") return runningMaps.idToTotal[pairedTransferId(t, transactions)];
      return runningMaps.idToTotal[t.id];
    }
    if (t.accountId === activeAccount) return runningMaps.idToAccount[t.id];
    return runningMaps.idToAccount[pairedTransferId(t, transactions)];
  }

  const scoped = useMemo(
    () => (activeAccount === "all" ? transactions : transactions.filter((t) => t.accountId === activeAccount)),
    [transactions, activeAccount],
  );

  const filteredTx = useMemo(() => {
    return scoped
      .filter((t) => t.type !== "transfer_in" || !hasLocalSibling(t, transactions))
      .filter((t) => filters.category === "all" || t.categoryId === filters.category)
      .filter((t) => filters.type === "all" || (filters.type === "transfer" ? t.type === "transfer" || t.type === "transfer_in" : t.type === filters.type))
      .filter((t) => !filters.from || t.date >= filters.from)
      .filter((t) => !filters.to || t.date <= filters.to)
      .filter((t) => !filters.search || t.name.toLowerCase().includes(filters.search.toLowerCase()))
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [scoped, filters, transactions]);

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
      const freq = FREQUENCIES.find((f) => f.value === t.recurring!.frequency);
      const perMonth = freq ? freq.perMonth : 1;
      net += (t.type === "income" ? 1 : -1) * Number(t.amount) * perMonth;
    });
    return net;
  }, [recurringList]);

  const evoPoints = useMemo(
    () => computeEvoPoints(accounts, chronological, transactions, activeAccount, resultingBalance, evoRange),
    [accounts, chronological, transactions, activeAccount, runningMaps, evoRange],
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

  function addCategory(name: string, color: string) {
    setCategories((prev) => prev.concat([{ id: genId(), name, color, subcategories: [] }]));
  }
  function removeCategory(id: ID) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }
  function setCategoryColor(id: ID, color: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
  }
  function addSubcategory(catId: ID, name: string, color: string) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, subcategories: c.subcategories.concat([{ id: genId(), name, color }]) } : c)));
  }
  function removeSubcategory(catId: ID, subId: ID) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c)));
  }
  function setSubcategoryColor(catId: ID, subId: ID, color: string) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, subcategories: c.subcategories.map((s) => (s.id === subId ? { ...s, color } : s)) } : c)));
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
      const result = await pickAndImportCsv(activeDoc);
      if (!result) return;
      setAccounts(() => result.accounts);
      setCategories(() => result.categories);
      setTransactions((prev) => prev.concat(result.transactions));
    } catch (err) {
      console.error("Error importando CSV", err);
    }
  }

  function addAccount(name: string, type: AccountType, opening: number) {
    setAccounts((prev) => prev.concat([{ id: genId(), name, opening, warning: 0, type }]));
  }
  function removeAccount(id: ID) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setTransactions((prev) => prev.filter((t) => t.accountId !== id));
    if (activeAccount === id) setActiveAccount("all");
  }

  function openNewTxForm() {
    if (!activeDoc || !activeDocId) return;
    setTxDraft(emptyDraft(accounts, activeDocId, categories));
    setShowTxForm(true);
  }
  function openScheduledForm() {
    if (!activeDoc || !activeDocId) return;
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
    const recurring = txDraft.recurringOn ? { frequency: txDraft.frequency } : null;

    if (txDraft.type === "transfer") {
      if (!txDraft.toAccountId) return;
      if (txDraft.toDocId === activeDocId && txDraft.toAccountId === txDraft.accountId) return;
      const groupId = genId();
      const targetDoc = documents.find((d) => d.id === txDraft.toDocId);
      const sourceAccName = accounts.find((a) => a.id === txDraft.accountId)?.name ?? "-";
      const targetAccName = targetDoc?.accounts.find((a) => a.id === txDraft.toAccountId)?.name ?? "-";
      const crossDoc = txDraft.toDocId !== activeDocId;

      const legTransfer: Transaction = {
        id: genId(), seq: genSeq(), accountId: txDraft.accountId, date: txDraft.date, name: txDraft.name || "Transferencia",
        categoryId: null, subcategoryId: null, amount, type: "transfer", recurring, transferGroupId: groupId, status: txDraft.status,
        toAccountId: txDraft.toAccountId, toDocId: txDraft.toDocId,
        toLabel: crossDoc ? (targetDoc ? targetDoc.name : "-") + " - " + targetAccName : targetAccName,
      };
      const legTransferIn: Transaction = {
        id: genId(), seq: genSeq(), accountId: txDraft.toAccountId, date: txDraft.date, name: txDraft.name || "Transferencia",
        categoryId: null, subcategoryId: null, amount, type: "transfer_in", recurring, transferGroupId: groupId, status: txDraft.status,
        fromAccountId: txDraft.accountId, fromDocId: activeDocId,
        fromLabel: crossDoc ? activeDoc.name + " - " + sourceAccName : sourceAccName,
      };

      const linkedGroupId = txDraft.linkedGroupId;
      const removeOldGroup = (d: typeof activeDoc) =>
        txDraft.id ? { ...d, transactions: d.transactions.filter((x) => !isTransferTx(x) || x.transferGroupId !== linkedGroupId) } : d;

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
                categoryId: txDraft.categoryId,
                subcategoryId: txDraft.subcategoryId,
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
            id: genId(), seq: genSeq(), accountId: txDraft.accountId!, date: txDraft.date, name: txDraft.name,
            categoryId: txDraft.categoryId, subcategoryId: txDraft.subcategoryId, amount, type: txDraft.type, recurring, status: txDraft.status,
          } as Transaction,
        ]),
      );
    }
    resetDraft();
  }

  function editTx(t: Transaction) {
    if (!activeDocId) return;
    if (t.type === "transfer" || t.type === "transfer_in") {
      const isIncoming = t.type === "transfer_in";
      setTxDraft({
        id: t.id,
        linkedGroupId: t.transferGroupId,
        accountId: isIncoming ? t.fromAccountId : t.accountId,
        toDocId: isIncoming ? activeDocId : t.toDocId || activeDocId,
        toAccountId: isIncoming ? t.accountId : t.toAccountId,
        date: t.date, name: t.name, categoryId: null, subcategoryId: null, amount: String(t.amount),
        type: "transfer", status: t.status || "pendiente", recurringOn: !!t.recurring, frequency: t.recurring ? t.recurring.frequency : "monthly",
      });
    } else {
      setTxDraft({
        id: t.id, accountId: t.accountId, toDocId: activeDocId, toAccountId: accounts[0]?.id ?? null,
        date: t.date, name: t.name, categoryId: t.categoryId, subcategoryId: t.subcategoryId, amount: String(t.amount),
        type: t.type, status: t.status || "pendiente", recurringOn: !!t.recurring, frequency: t.recurring ? t.recurring.frequency : "monthly",
      });
    }
    setShowTxForm(true);
  }

  function removeTx(t: Transaction) {
    if (!activeDocId) return;
    if (t.type === "transfer" || t.type === "transfer_in") {
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

  function cycleStatus(t: Transaction) {
    if (!activeDocId) return;
    const STATUS_ORDER: Transaction["status"][] = ["reconciliado", "pendiente", "programado", "anulado"];
    const idx = STATUS_ORDER.indexOf(t.status || "pendiente");
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    if (t.type === "transfer" || t.type === "transfer_in") {
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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
        Cargando tus datos...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: "100vh" }}>
        {activeDoc ? (
          <>
            <Sidebar
              documents={documents}
              activeDocId={activeDoc.id}
              setActiveDocId={(id) => {
                setActiveDocId(id);
                setActiveAccount("all");
              }}
              activeDoc={activeDoc}
              createDocument={createDocument}
              removeDocument={removeDocument}
              accounts={accounts}
              balances={balances}
              totalBalance={totalBalance}
              activeAccount={activeAccount}
              setActiveAccount={setActiveAccount}
              addAccount={addAccount}
              removeAccount={removeAccount}
              view={view}
              setView={setView}
              recurringCount={recurringList.length}
              categoriesCount={categories.length}
            />
            <main style={{ background: T.bg, display: "flex", flexDirection: "column" }}>
              {view !== "transactions" && showTxForm && txDraft && (
                <TransactionForm
                  txDraft={txDraft}
                  setTxDraft={(fn) => setTxDraft((d) => (d ? fn(d) : d))}
                  accounts={accounts}
                  categories={categories}
                  documents={documents}
                  activeDocId={activeDoc.id}
                  onSubmit={submitTx}
                  onCancel={resetDraft}
                />
              )}

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
                  setBudget={setBudget}
                />
              )}

              {view === "transactions" && (
                <>
                  {showTxForm && txDraft && (
                    <TransactionForm
                      txDraft={txDraft}
                      setTxDraft={(fn) => setTxDraft((d) => (d ? fn(d) : d))}
                      accounts={accounts}
                      categories={categories}
                      documents={documents}
                      activeDocId={activeDoc.id}
                      onSubmit={submitTx}
                      onCancel={resetDraft}
                    />
                  )}
                  <TransactionsView
                    title={activeAccount === "all" ? "Todas las cuentas" : accounts.find((a) => a.id === activeAccount)?.name ?? "-"}
                    monthIncome={monthIncome}
                    monthExpense={monthExpense}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    filters={filters}
                    setFilters={setFilters}
                    categories={categories}
                    filteredTx={filteredTx}
                    resultingBalance={resultingBalance}
                    onEdit={editTx}
                    onRemove={removeTx}
                    onCycleStatus={cycleStatus}
                    onAdd={openNewTxForm}
                    onExport={handleExport}
                    onImport={handleImport}
                    footerLabel="Total cuenta actual"
                    footerAmount={activeAccount === "all" ? totalBalance : balances[activeAccount] || 0}
                    chart={<BalanceChart points={evoPoints} ticks={evoTicks} evoRange={evoRange} setEvoRange={setEvoRange} />}
                  />
                </>
              )}
            </main>
          </>
        ) : (
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13.5, maxWidth: 340 }}>
              Todavia no tienes ningun archivo.
              <br />
              Crea el primero para empezar (p. ej. “Personal”).
              <NewDocumentInline onCreate={createDocument} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewDocumentInline({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCreate(name);
        setName("");
      }}
      style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}
    >
      <input autoFocus placeholder="Nombre del archivo" value={name} onChange={(e) => setName(e.target.value)} style={{ border: "1px solid " + T.border, borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "Inter, sans-serif" }} />
      <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 14px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
        Crear
      </button>
    </form>
  );
}
