import { useMemo, useState } from "react";
import { T } from "./theme";
import { useDocuments } from "./lib/useDocuments";
import { genId, genSeq } from "./lib/id";
import { computeBalances, computeChronological, computeRunningMaps, hasLocalSibling, pairedTransferId } from "./lib/balances";
import { emptyDraft, type TxDraft } from "./lib/txDraft";
import { monthKey, todayISO } from "./lib/format";
import { isTransferTx, type Account, type AccountType, type ID, type Transaction } from "./types";
import { Sidebar } from "./components/Sidebar";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionsView, type Filters } from "./components/TransactionsView";

export default function App() {
  const { loading, documents, activeDocId, setActiveDocId, activeDoc, updateDoc, applyToDocs, createDocument, removeDocument } = useDocuments();

  const [activeAccount, setActiveAccount] = useState<ID | "all">("all");
  const [showTxForm, setShowTxForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ search: "", category: "all", type: "all", from: "", to: "" });
  const [txDraft, setTxDraft] = useState<TxDraft | null>(null);

  const accounts = activeDoc?.accounts ?? [];
  const transactions = activeDoc?.transactions ?? [];
  const categories = activeDoc?.categories ?? [];

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

  function setAccounts(fn: (a: Account[]) => Account[]) {
    if (!activeDocId) return;
    updateDoc(activeDocId, (d) => ({ ...d, accounts: fn(d.accounts) }));
  }
  function setTransactions(fn: (t: Transaction[]) => Transaction[]) {
    if (!activeDocId) return;
    updateDoc(activeDocId, (d) => ({ ...d, transactions: fn(d.transactions) }));
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
            />
            <main style={{ background: T.bg, display: "flex", flexDirection: "column" }}>
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
                footerLabel="Total cuenta actual"
                footerAmount={activeAccount === "all" ? totalBalance : balances[activeAccount] || 0}
              />
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
