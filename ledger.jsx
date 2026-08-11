import React, { useState, useMemo, useEffect, useRef } from "react";
import Papa from "papaparse";
import {
  Plus, Trash2, Wallet, TrendingUp, TrendingDown, X, Pencil,
  Repeat, ArrowRightLeft, Search, Download, Upload, SlidersHorizontal, FolderOpen,
  PiggyBank, CreditCard, CheckCircle2, Circle, CircleDashed, Clock, XCircle,
} from "lucide-react";

const STATUSES = [
  { value: "reconciliado", label: "Reconciliado", color: "#2FA84F", icon: CheckCircle2 },
  { value: "pendiente", label: "Pendiente", color: "#D6A93B", icon: CircleDashed },
  { value: "programado", label: "Programado", color: "#3373DC", icon: Clock },
  { value: "anulado", label: "Anulado", color: "#E03131", icon: XCircle },
];
const statusInfo = (value) => STATUSES.find((s) => s.value === value) || STATUSES[1];

const ACCOUNT_TYPES = [
  { value: "checking", label: "Cuenta corriente", icon: Wallet },
  { value: "savings", label: "Cuenta de ahorro", icon: PiggyBank },
  { value: "credit", label: "Tarjeta de credito", icon: CreditCard },
];
const accountTypeInfo = (value) => ACCOUNT_TYPES.find((t) => t.value === value) || ACCOUNT_TYPES[0];

const T = {
  bg: "#FFFFFF",
  sidebar: "#F3F3F5",
  bgElevated: "#FAFAFB",
  bgInput: "#FFFFFF",
  border: "#E3E3E6",
  borderSoft: "#ECECEE",
  text: "#1D1D1F",
  textMuted: "#8A8A8E",
  textFaint: "#B6B6BA",
  income: "#2FA84F",
  expense: "#D64545",
  accent: "#3373DC",
  transfer: "#8E5FD6",
};

const PALETTE = ["#3373DC", "#2FA84F", "#D64545", "#D6A93B", "#8E5FD6", "#3BA6A6", "#D6708F", "#6B7A8F", "#C77B3A", "#57C77A"];

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');";

const FREQUENCIES = [
  { value: "monthly", label: "Mensual", perMonth: 1 },
  { value: "weekly", label: "Semanal", perMonth: 52 / 12 },
  { value: "yearly", label: "Anual", perMonth: 1 / 12 },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);
const shortDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
const monthKey = (iso) => iso.slice(0, 7);
const nextDate = (iso, freqValue) => {
  const d = new Date(iso + "T00:00:00");
  if (freqValue === "weekly") d.setDate(d.getDate() + 7);
  else if (freqValue === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

let idCounter = 3000;
const nextId = () => idCounter++;

const seedDocuments = [
  {
    id: 1,
    name: "Personal",
    budgets: { 5001: 300, 5003: 120, 5002: 100 },
    accounts: [
      { id: 1000, name: "Cuenta corriente", opening: 2450.32, warning: 200, type: "checking" },
      { id: 1001, name: "Ahorro", opening: 6200, warning: 0, type: "savings" },
    ],
    categories: [
      { id: 5000, name: "Vivienda", color: "#3373DC", subcategories: [] },
      { id: 5001, name: "Alimentacion", color: "#2FA84F", subcategories: [
        { id: 5101, name: "Supermercado", color: "#2FA84F" },
        { id: 5102, name: "Restaurantes", color: "#57C77A" },
      ] },
      { id: 5002, name: "Transporte", color: "#D6A93B", subcategories: [] },
      { id: 5003, name: "Ocio", color: "#8E5FD6", subcategories: [] },
      { id: 5004, name: "Salud", color: "#D64545", subcategories: [] },
      { id: 5005, name: "Ingresos", color: "#3BA6A6", subcategories: [] },
      { id: 5006, name: "Otros", color: "#6B7A8F", subcategories: [] },
    ],
    transactions: [
      { id: nextId(), accountId: 1000, date: "2026-06-01", name: "Nomina", categoryId: 5005, subcategoryId: null, amount: 1850, type: "income", recurring: { frequency: "monthly" }, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-06-02", name: "Alquiler estudio", categoryId: 5000, subcategoryId: null, amount: 620, type: "expense", recurring: { frequency: "monthly" }, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-06-05", name: "Supermercado", categoryId: 5001, subcategoryId: 5101, amount: 74.2, type: "expense", recurring: null, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-07-01", name: "Nomina", categoryId: 5005, subcategoryId: null, amount: 1850, type: "income", recurring: { frequency: "monthly" }, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-07-02", name: "Alquiler estudio", categoryId: 5000, subcategoryId: null, amount: 620, type: "expense", recurring: { frequency: "monthly" }, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-07-10", name: "Gasolina", categoryId: 5002, subcategoryId: null, amount: 58, type: "expense", recurring: null, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: todayISO(), name: "Nomina", categoryId: 5005, subcategoryId: null, amount: 1850, type: "income", recurring: { frequency: "monthly" }, status: "pendiente" },
      { id: nextId(), accountId: 1000, date: todayISO(), name: "Alquiler estudio", categoryId: 5000, subcategoryId: null, amount: 620, type: "expense", recurring: { frequency: "monthly" }, status: "pendiente" },
      { id: nextId(), accountId: 1000, date: todayISO(), name: "Supermercado", categoryId: 5001, subcategoryId: 5101, amount: 74.2, type: "expense", recurring: null, status: "pendiente" },
    ],
  },
  {
    id: 2,
    name: "B-nice",
    budgets: {},
    accounts: [
      { id: 2000, name: "Cuenta B-nice", opening: 4100, warning: 0, type: "checking" },
    ],
    categories: [
      { id: 5200, name: "Ingresos", color: "#3BA6A6", subcategories: [{ id: 5201, name: "Facturas clientes", color: "#3BA6A6" }] },
      { id: 5202, name: "Gastos estudio", color: "#C77B3A", subcategories: [] },
    ],
    transactions: [
      { id: nextId(), accountId: 2000, date: todayISO(), name: "Factura TIREA", categoryId: 5200, subcategoryId: 5201, amount: 980, type: "income", recurring: null, status: "reconciliado" },
    ],
  },
];

const emptyDraft = (accounts, docId, categories) => ({
  id: null,
  accountId: accounts[0]?.id,
  toDocId: docId,
  toAccountId: accounts[0]?.id,
  date: todayISO(),
  name: "",
  categoryId: categories[0]?.id ?? null,
  subcategoryId: null,
  amount: "",
  type: "expense",
  status: "pendiente",
  recurringOn: false,
  frequency: "monthly",
});

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase", color: T.textMuted, fontWeight: 600 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorSwatches({ value, onChange, size }) {
  const s = size || 16;
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {PALETTE.map((c) => (
        <button
          key={c} type="button" onClick={() => onChange(c)}
          style={{ width: s, height: s, borderRadius: "50%", background: c, padding: 0, cursor: "pointer", border: value === c ? "2px solid #1D1D1F" : "2px solid transparent", boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

const inputStyle = {
  background: T.bgInput, border: "1px solid " + T.border, borderRadius: 6, padding: "8px 10px",
  color: T.text, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", width: "100%",
};
const smallBtn = (active) => ({
  background: active ? "#EAF1FC" : "#FFFFFF", border: "1px solid " + (active ? T.accent : T.border),
  color: active ? T.accent : T.textMuted, borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 600,
});
const dot = (color, size) => ({ width: size || 8, height: size || 8, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" });

export default function LedgerApp() {
  const [documents, setDocuments] = useState(seedDocuments);
  const [activeDocId, setActiveDocId] = useState(seedDocuments[0].id);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docNameDraft, setDocNameDraft] = useState("");

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];
  const accounts = activeDoc.accounts;
  const transactions = activeDoc.transactions;
  const budgets = activeDoc.budgets;
  const categories = activeDoc.categories;

  const [activeAccount, setActiveAccount] = useState("all");
  const [view, setView] = useState("transactions");
  const [showTxForm, setShowTxForm] = useState(false);
  const [showAccForm, setShowAccForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef(null);

  const [filters, setFilters] = useState({ search: "", category: "all", type: "all", from: "", to: "" });
  const [txDraft, setTxDraft] = useState(emptyDraft(seedDocuments[0].accounts, seedDocuments[0].id, seedDocuments[0].categories));
  const [accDraft, setAccDraft] = useState({ name: "", opening: "", type: "checking" });

  const [showCatForm, setShowCatForm] = useState(false);
  const [catDraft, setCatDraft] = useState({ name: "", color: PALETTE[0] });
  const [subFormFor, setSubFormFor] = useState(null);
  const [subDraft, setSubDraft] = useState({ name: "", color: PALETTE[0] });
  const [colorPickerOpen, setColorPickerOpen] = useState(null);
  const [evoRange, setEvoRange] = useState({ from: "", to: "" });

  function updateDoc(docId, fn) {
    setDocuments((prev) => prev.map((d) => (d.id === docId ? fn(d) : d)));
  }
  function applyToDocs(updates) {
    setDocuments((prev) => prev.map((d) => {
      const u = updates.find((x) => x.docId === d.id);
      return u ? u.fn(d) : d;
    }));
  }
  function setAccounts(updater) { updateDoc(activeDocId, (d) => Object.assign({}, d, { accounts: typeof updater === "function" ? updater(d.accounts) : updater })); }
  function setTransactions(updater) { updateDoc(activeDocId, (d) => Object.assign({}, d, { transactions: typeof updater === "function" ? updater(d.transactions) : updater })); }
  function setBudgets(updater) { updateDoc(activeDocId, (d) => Object.assign({}, d, { budgets: typeof updater === "function" ? updater(d.budgets) : updater })); }
  function setCategories(updater) { updateDoc(activeDocId, (d) => Object.assign({}, d, { categories: typeof updater === "function" ? updater(d.categories) : updater })); }

  const accountName = (id) => { const a = accounts.find((x) => x.id === id); return a ? a.name : "-"; };

  function catInfo(categoryId, subcategoryId) {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return { name: "-", color: T.textFaint, catName: "-" };
    if (subcategoryId) {
      const sub = cat.subcategories.find((s) => s.id === subcategoryId);
      if (sub) return { name: cat.name + " / " + sub.name, color: sub.color, catName: cat.name, subName: sub.name };
    }
    return { name: cat.name, color: cat.color, catName: cat.name };
  }

  const balances = useMemo(() => {
    const map = {};
    accounts.forEach((a) => (map[a.id] = a.opening));
    transactions.forEach((t) => {
      if (t.status === "anulado") return;
      if (t.type === "income") map[t.accountId] = (map[t.accountId] || 0) + Number(t.amount);
      else if (t.type === "expense") map[t.accountId] = (map[t.accountId] || 0) - Number(t.amount);
      else if (t.type === "transfer") map[t.accountId] = (map[t.accountId] || 0) - Number(t.amount);
      else if (t.type === "transfer_in") map[t.accountId] = (map[t.accountId] || 0) + Number(t.amount);
    });
    return map;
  }, [accounts, transactions]);

  const totalBalance = accounts.reduce((s, a) => s + (balances[a.id] || 0), 0);

  const scoped = useMemo(() => {
    return activeAccount === "all" ? transactions : transactions.filter((t) => t.accountId === activeAccount);
  }, [transactions, activeAccount]);

  function hasLocalSibling(t) {
    if (t.type !== "transfer_in" || !t.transferGroupId) return false;
    return transactions.some((x) => x.type === "transfer" && x.transferGroupId === t.transferGroupId);
  }

  const filteredTx = useMemo(() => {
    return scoped
      .filter((t) => t.type !== "transfer_in" || !hasLocalSibling(t))
      .filter((t) => filters.category === "all" || t.categoryId === filters.category)
      .filter((t) => filters.type === "all" || (filters.type === "transfer" ? (t.type === "transfer" || t.type === "transfer_in") : t.type === filters.type))
      .filter((t) => !filters.from || t.date >= filters.from)
      .filter((t) => !filters.to || t.date <= filters.to)
      .filter((t) => !filters.search || t.name.toLowerCase().includes(filters.search.toLowerCase()))
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [scoped, filters, transactions]);

  const now = new Date();
  const curMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const thisMonthTx = scoped.filter((t) => monthKey(t.date) === curMonthKey);

  const monthIncome = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const byCategory = useMemo(() => {
    const map = {};
    thisMonthTx.filter((t) => t.type === "expense").forEach((t) => { map[t.categoryId] = (map[t.categoryId] || 0) + Number(t.amount); });
    return Object.entries(map).map((entry) => ({ id: Number(entry[0]), val: entry[1], info: catInfo(Number(entry[0])) })).sort((a, b) => b.val - a.val);
  }, [thisMonthTx, categories]);
  const maxCat = Math.max(1, ...byCategory.map((c) => c.val));

  const chronological = useMemo(() => {
    return transactions.slice().sort((a, b) => (a.date === b.date ? a.id - b.id : (a.date < b.date ? -1 : 1)));
  }, [transactions]);

  const runningMaps = useMemo(() => {
    const totalOpening = accounts.reduce((s, a) => s + a.opening, 0);
    const perAccountRunning = {};
    accounts.forEach((a) => (perAccountRunning[a.id] = a.opening));
    let totalRunning = totalOpening;
    const idToTotal = {};
    const idToAccount = {};
    chronological.forEach((t) => {
      const amt = Number(t.amount);
      let sign = 0;
      if (t.status !== "anulado") {
        if (t.type === "income") sign = 1;
        else if (t.type === "expense") sign = -1;
        else if (t.type === "transfer") sign = -1;
        else if (t.type === "transfer_in") sign = 1;
        totalRunning += sign * amt;
        perAccountRunning[t.accountId] = (perAccountRunning[t.accountId] || 0) + sign * amt;
      }
      idToTotal[t.id] = totalRunning;
      idToAccount[t.id] = perAccountRunning[t.accountId];
    });
    return { idToTotal: idToTotal, idToAccount: idToAccount };
  }, [chronological, accounts]);

  function pairedTransferId(t) {
    if (t.type === "transfer" && t.transferGroupId) {
      const match = transactions.find((x) => x.type === "transfer_in" && x.transferGroupId === t.transferGroupId);
      return match ? match.id : t.id;
    }
    return t.id;
  }

  function resultingBalance(t) {
    if (activeAccount === "all") {
      if (t.type === "transfer") return runningMaps.idToTotal[pairedTransferId(t)];
      return runningMaps.idToTotal[t.id];
    }
    if (t.accountId === activeAccount) return runningMaps.idToAccount[t.id];
    return runningMaps.idToAccount[pairedTransferId(t)];
  }

  const evoPoints = useMemo(() => {
    const openingSum = accounts.reduce((s, a) => s + a.opening, 0);
    const accOpening = activeAccount === "all" ? openingSum : (accounts.find((a) => a.id === activeAccount)?.opening || 0);
    const fullSrc = (activeAccount === "all"
      ? chronological.filter((t) => t.type !== "transfer_in" || !hasLocalSibling(t))
      : chronological.filter((t) => t.accountId === activeAccount && (t.type !== "transfer_in" || !hasLocalSibling(t))));
    if (fullSrc.length === 0) return [];

    const rangeFrom = evoRange.from || null;
    const rangeTo = evoRange.to || null;

    let startBalance = accOpening;
    fullSrc.forEach((t) => {
      if (!rangeFrom || t.date < rangeFrom) startBalance = resultingBalance(t);
    });

    const effectiveFrom = rangeFrom || fullSrc[0].date;
    const startTime = new Date(effectiveFrom + "T00:00:00").getTime() - 86400000;
    const inRange = fullSrc.filter((t) => (!rangeFrom || t.date >= rangeFrom) && (!rangeTo || t.date <= rangeTo));

    const pts = [{ time: startTime, balance: startBalance }];
    inRange.forEach((t) => {
      pts.push({ time: new Date(t.date + "T00:00:00").getTime(), balance: resultingBalance(t) });
    });

    const endTime = rangeTo ? new Date(rangeTo + "T00:00:00").getTime() : new Date(todayISO() + "T00:00:00").getTime();
    if (endTime > pts[pts.length - 1].time) pts.push({ time: endTime, balance: pts[pts.length - 1].balance });
    return pts;
  }, [chronological, accounts, activeAccount, runningMaps, transactions, evoRange]);

  const evoTicks = useMemo(() => {
    if (evoPoints.length === 0) return [];
    const minT = evoPoints[0].time, maxT = evoPoints[evoPoints.length - 1].time;
    const span = maxT - minT || 1;
    const monthsSpan = Math.max(1, Math.round(span / (30 * 86400000)));
    const step = Math.max(1, Math.ceil(monthsSpan / 10));
    const ticks = [];
    const d = new Date(minT);
    d.setDate(1);
    while (d.getTime() <= maxT) {
      ticks.push({ time: d.getTime(), label: d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }) });
      d.setMonth(d.getMonth() + step);
    }
    return ticks;
  }, [evoPoints]);

  const recurringList = useMemo(() => {
    return transactions.filter((t) => t.recurring && t.type !== "transfer_in");
  }, [transactions]);

  const forecast = useMemo(() => {
    let netPerMonth = 0;
    recurringList.forEach((t) => {
      const freq = FREQUENCIES.find((f) => f.value === t.recurring.frequency);
      const perMonth = freq ? freq.perMonth : 1;
      netPerMonth += (t.type === "income" ? 1 : -1) * Number(t.amount) * perMonth;
    });
    return { netPerMonth: netPerMonth };
  }, [recurringList]);

  function resetDraft() { setTxDraft(emptyDraft(accounts, activeDocId, categories)); setShowTxForm(false); }
  function openScheduledForm() {
    setTxDraft(Object.assign({}, emptyDraft(accounts, activeDocId, categories), { recurringOn: true, status: "programado" }));
    setShowTxForm(true);
  }

  // Auto-post recurring items: whenever a recurring transaction's next occurrence
  // becomes due (its date has arrived), generate it automatically with status
  // "programado" so the user doesn't have to re-enter it every period. Cross-document
  // recurring transfers are skipped here to avoid coordinating two files at once.
  useEffect(() => {
    setDocuments((prevDocs) => {
      const today = todayISO();
      let changed = false;
      const nextDocs = prevDocs.map((doc) => {
        const txs = doc.transactions;
        const seriesMax = {};
        txs.forEach((t) => {
          if (!t.recurring || t.type === "transfer" || t.type === "transfer_in") return;
          const key = [t.accountId, t.name, t.categoryId, t.subcategoryId, t.type, t.amount, t.recurring.frequency].join("|");
          if (!seriesMax[key] || t.date > seriesMax[key].date) seriesMax[key] = t;
        });
        const additions = [];
        Object.values(seriesMax).forEach((tx) => {
          const nd = nextDate(tx.date, tx.recurring.frequency);
          if (nd > today) return;
          const exists = txs.some((t) => t.date === nd && t.accountId === tx.accountId && t.name === tx.name && t.categoryId === tx.categoryId && t.subcategoryId === tx.subcategoryId && t.type === tx.type && Number(t.amount) === Number(tx.amount));
          if (exists) return;
          additions.push(Object.assign({}, tx, { id: nextId(), date: nd, status: "programado" }));
        });
        if (additions.length === 0) return doc;
        changed = true;
        return Object.assign({}, doc, { transactions: txs.concat(additions) });
      });
      return changed ? nextDocs : prevDocs;
    });
  }, [documents]);

  function submitTx(e) {
    e.preventDefault();
    if (!txDraft.name || !txDraft.amount || !txDraft.accountId) return;
    const amount = Number(txDraft.amount);
    const recurring = txDraft.recurringOn ? { frequency: txDraft.frequency } : null;

    if (txDraft.type === "transfer") {
      if (txDraft.toDocId === activeDocId && txDraft.toAccountId === txDraft.accountId) return;
      const groupId = nextId();
      const targetDoc = documents.find((d) => d.id === txDraft.toDocId);
      const sourceAccName = accountName(txDraft.accountId);
      const targetAccName = (targetDoc && targetDoc.accounts.find((a) => a.id === txDraft.toAccountId) || {}).name || "-";
      const crossDoc = txDraft.toDocId !== activeDocId;

      const legTransfer = {
        id: nextId(), accountId: txDraft.accountId, date: txDraft.date, name: txDraft.name || "Transferencia",
        categoryId: null, subcategoryId: null, amount, type: "transfer", recurring, transferGroupId: groupId, status: txDraft.status,
        toAccountId: txDraft.toAccountId, toDocId: txDraft.toDocId,
        toLabel: crossDoc ? ((targetDoc ? targetDoc.name : "-") + " - " + targetAccName) : targetAccName,
      };
      const legTransferIn = {
        id: nextId(), accountId: txDraft.toAccountId, date: txDraft.date, name: txDraft.name || "Transferencia",
        categoryId: null, subcategoryId: null, amount, type: "transfer_in", recurring, transferGroupId: groupId, status: txDraft.status,
        fromAccountId: txDraft.accountId, fromDocId: activeDocId,
        fromLabel: crossDoc ? (activeDoc.name + " - " + sourceAccName) : sourceAccName,
      };

      const removeOldGroup = (d) => (txDraft.id
        ? Object.assign({}, d, { transactions: d.transactions.filter((x) => x.transferGroupId !== txDraft.linkedGroupId) })
        : d);

      if (!crossDoc) {
        applyToDocs([{ docId: activeDocId, fn: (d) => {
          const base = txDraft.id ? removeOldGroup(d) : d;
          return Object.assign({}, base, { transactions: base.transactions.concat([legTransfer, legTransferIn]) });
        } }]);
      } else {
        applyToDocs([
          { docId: activeDocId, fn: (d) => {
            const base = txDraft.id ? removeOldGroup(d) : d;
            return Object.assign({}, base, { transactions: base.transactions.concat([legTransfer]) });
          } },
          { docId: txDraft.toDocId, fn: (d) => {
            const base = txDraft.id ? removeOldGroup(d) : d;
            return Object.assign({}, base, { transactions: base.transactions.concat([legTransferIn]) });
          } },
        ]);
      }
    } else if (txDraft.id) {
      setTransactions((prev) => prev.map((t) => t.id === txDraft.id
        ? Object.assign({}, t, { accountId: txDraft.accountId, date: txDraft.date, name: txDraft.name, categoryId: txDraft.categoryId, subcategoryId: txDraft.subcategoryId, amount, type: txDraft.type, recurring, status: txDraft.status })
        : t));
    } else {
      setTransactions((prev) => prev.concat([{
        id: nextId(), accountId: txDraft.accountId, date: txDraft.date, name: txDraft.name,
        categoryId: txDraft.categoryId, subcategoryId: txDraft.subcategoryId, amount, type: txDraft.type, recurring, status: txDraft.status,
      }]));
    }
    resetDraft();
  }

  function editTx(t) {
    if (t.type === "transfer" || t.type === "transfer_in") {
      const isIncoming = t.type === "transfer_in";
      setTxDraft({
        id: t.id, linkedGroupId: t.transferGroupId,
        accountId: isIncoming ? t.fromAccountId : t.accountId,
        toDocId: isIncoming ? activeDocId : (t.toDocId || activeDocId),
        toAccountId: isIncoming ? t.accountId : t.toAccountId,
        date: t.date, name: t.name, categoryId: null, subcategoryId: null, amount: String(t.amount),
        type: "transfer", status: t.status || "pendiente", recurringOn: !!t.recurring, frequency: t.recurring ? t.recurring.frequency : "monthly",
      });
    } else {
      setTxDraft({
        id: t.id, accountId: t.accountId, toDocId: activeDocId, toAccountId: accounts[0]?.id,
        date: t.date, name: t.name, categoryId: t.categoryId, subcategoryId: t.subcategoryId, amount: String(t.amount),
        type: t.type, status: t.status || "pendiente", recurringOn: !!t.recurring, frequency: t.recurring ? t.recurring.frequency : "monthly",
      });
    }
    setShowTxForm(true);
  }

  function removeTx(t) {
    if (t.type === "transfer" || t.type === "transfer_in") {
      setDocuments((prev) => prev.map((d) => Object.assign({}, d, {
        transactions: d.transactions.filter((x) => x.transferGroupId !== t.transferGroupId),
      })));
    } else {
      setTransactions((prev) => prev.filter((x) => x.id !== t.id));
    }
  }

  function cycleStatus(t) {
    const idx = STATUSES.findIndex((s) => s.value === (t.status || "pendiente"));
    const next = STATUSES[(idx + 1) % STATUSES.length].value;
    if (t.type === "transfer" || t.type === "transfer_in") {
      setDocuments((prev) => prev.map((d) => Object.assign({}, d, {
        transactions: d.transactions.map((x) => (x.transferGroupId === t.transferGroupId ? Object.assign({}, x, { status: next }) : x)),
      })));
    } else {
      setTransactions((prev) => prev.map((x) => (x.id === t.id ? Object.assign({}, x, { status: next }) : x)));
    }
  }

  function addAccount(e) {
    e.preventDefault();
    if (!accDraft.name) return;
    setAccounts((prev) => prev.concat([{ id: nextId(), name: accDraft.name, opening: Number(accDraft.opening) || 0, warning: 0, type: accDraft.type }]));
    setAccDraft({ name: "", opening: "", type: "checking" });
    setShowAccForm(false);
  }

  function removeAccount(id) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setTransactions((prev) => prev.filter((t) => t.accountId !== id));
    if (activeAccount === id) setActiveAccount("all");
  }

  function addDocument(e) {
    e.preventDefault();
    if (!docNameDraft.trim()) return;
    const newDoc = { id: nextId(), name: docNameDraft.trim(), budgets: {}, accounts: [], categories: [], transactions: [] };
    setDocuments((prev) => prev.concat([newDoc]));
    setActiveDocId(newDoc.id);
    setActiveAccount("all");
    setView("transactions");
    setDocNameDraft("");
    setShowDocForm(false);
  }

  function removeDocument(id) {
    if (documents.length <= 1) return;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (activeDocId === id) {
      const remaining = documents.filter((d) => d.id !== id);
      setActiveDocId(remaining[0].id);
      setActiveAccount("all");
    }
  }

  function addCategory(e) {
    e.preventDefault();
    if (!catDraft.name.trim()) return;
    setCategories((prev) => prev.concat([{ id: nextId(), name: catDraft.name.trim(), color: catDraft.color, subcategories: [] }]));
    setCatDraft({ name: "", color: PALETTE[0] });
    setShowCatForm(false);
  }
  function removeCategory(catId) {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  }
  function setCategoryColor(catId, color) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? Object.assign({}, c, { color: color }) : c)));
  }
  function addSubcategory(catId, e) {
    e.preventDefault();
    if (!subDraft.name.trim()) return;
    setCategories((prev) => prev.map((c) => (c.id === catId
      ? Object.assign({}, c, { subcategories: c.subcategories.concat([{ id: nextId(), name: subDraft.name.trim(), color: subDraft.color }]) })
      : c)));
    setSubDraft({ name: "", color: PALETTE[0] });
    setSubFormFor(null);
  }
  function removeSubcategory(catId, subId) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? Object.assign({}, c, { subcategories: c.subcategories.filter((s) => s.id !== subId) }) : c)));
  }
  function setSubcategoryColor(catId, subId, color) {
    setCategories((prev) => prev.map((c) => (c.id === catId
      ? Object.assign({}, c, { subcategories: c.subcategories.map((s) => (s.id === subId ? Object.assign({}, s, { color: color }) : s)) })
      : c)));
  }

  function findOrCreateCategory(name) {
    let cat = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!cat) {
      cat = { id: nextId(), name: name, color: PALETTE[categories.length % PALETTE.length], subcategories: [] };
      setCategories((prev) => prev.concat([cat]));
    }
    return cat;
  }

  function exportCSV() {
    const rows = filteredTx.slice().reverse().map((t) => {
      const info = catInfo(t.categoryId, t.subcategoryId);
      return {
        Fecha: t.date, Cuenta: accountName(t.accountId), Descripcion: t.name,
        Categoria: t.type === "transfer" || t.type === "transfer_in" ? "Transferencia" : info.name,
        Tipo: t.type === "income" ? "Ingreso" : t.type === "expense" ? "Gasto" : "Transferencia",
        Importe: t.amount, Recurrente: t.recurring ? t.recurring.frequency : "",
      };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = activeDoc.name + "-movimientos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function importCSV(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = Papa.parse(String(reader.result), { header: true, skipEmptyLines: true });
      const data = parsed.data;
      const byName = {};
      accounts.forEach((a) => (byName[a.name] = a.id));
      let nextAccounts = accounts.slice();
      let nextCategories = categories.slice();
      const imported = [];
      data.forEach((row) => {
        const accNameField = row.Cuenta && row.Cuenta.trim();
        if (!accNameField) return;
        let accId = byName[accNameField];
        if (!accId) {
          accId = nextId();
          nextAccounts.push({ id: accId, name: accNameField, opening: 0, warning: 0 });
          byName[accNameField] = accId;
        }
        const tipo = (row.Tipo || "").toLowerCase();
        const type = tipo.indexOf("ingreso") === 0 ? "income" : "expense";
        const catName = (row.Categoria || "Otros").trim();
        let cat = nextCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
        if (!cat) {
          cat = { id: nextId(), name: catName, color: PALETTE[nextCategories.length % PALETTE.length], subcategories: [] };
          nextCategories.push(cat);
        }
        imported.push({
          id: nextId(), accountId: accId, date: row.Fecha || todayISO(), name: row.Descripcion || "Importado",
          categoryId: cat.id, subcategoryId: null, amount: Number(row.Importe) || 0, type: type,
          recurring: row.Recurrente ? { frequency: row.Recurrente } : null,
        });
      });
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setTransactions((prev) => prev.concat(imported));
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const targetDocAccounts = (documents.find((d) => d.id === txDraft.toDocId) || activeDoc).accounts;
  const selectedCategory = categories.find((c) => c.id === txDraft.categoryId);

  const txForm = showTxForm && (
    <form onSubmit={submitTx} style={{ background: T.bgElevated, borderBottom: "1px solid " + T.border, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <Field label="Descripcion">
        <input autoFocus value={txDraft.name} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { name: e.target.value }))} style={inputStyle} placeholder="p. ej. Supermercado" />
      </Field>
      <Field label="Importe">
        <input type="number" step="0.01" value={txDraft.amount} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { amount: e.target.value }))} style={inputStyle} placeholder="0.00" />
      </Field>
      <Field label={txDraft.type === "transfer" ? "Cuenta origen" : "Cuenta"}>
        <select value={txDraft.accountId} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { accountId: Number(e.target.value) }))} style={inputStyle}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>

      {txDraft.type !== "transfer" && (
        <Field label="Categoria">
          <select
            value={txDraft.categoryId || ""}
            onChange={(e) => setTxDraft((d) => Object.assign({}, d, { categoryId: Number(e.target.value), subcategoryId: null }))}
            style={inputStyle}
          >
            {categories.length === 0 && <option value="">Sin categorias</option>}
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {txDraft.type !== "transfer" && selectedCategory && selectedCategory.subcategories.length > 0 && (
        <Field label="Subcategoria">
          <select value={txDraft.subcategoryId || ""} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { subcategoryId: e.target.value ? Number(e.target.value) : null }))} style={inputStyle}>
            <option value="">Ninguna</option>
            {selectedCategory.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}

      {txDraft.type === "transfer" && (
        <>
          <Field label="Archivo destino">
            <select
              value={txDraft.toDocId}
              onChange={(e) => {
                const docId = Number(e.target.value);
                const doc = documents.find((d) => d.id === docId);
                setTxDraft((d) => Object.assign({}, d, { toDocId: docId, toAccountId: doc && doc.accounts[0] ? doc.accounts[0].id : null }));
              }}
              style={inputStyle}
            >
              {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}{doc.id === activeDocId ? " (este archivo)" : ""}</option>)}
            </select>
          </Field>
          <Field label="Cuenta destino">
            <select value={txDraft.toAccountId || ""} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { toAccountId: Number(e.target.value) }))} style={inputStyle}>
              {targetDocAccounts.length === 0 && <option value="">Sin cuentas en este archivo</option>}
              {targetDocAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </>
      )}

      <Field label="Fecha">
        <input type="date" value={txDraft.date} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { date: e.target.value }))} style={inputStyle} />
      </Field>
      <Field label="Estado">
        <select value={txDraft.status} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { status: e.target.value }))} style={inputStyle}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </Field>
      <Field label="Tipo">
        <div style={{ display: "flex", gap: 6 }}>
          {[["expense", "Gasto"], ["income", "Ingreso"], ["transfer", "Transf."]].map((pair) => (
            <button key={pair[0]} type="button" onClick={() => setTxDraft((d) => Object.assign({}, d, { type: pair[0] }))} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "1px solid " + (txDraft.type === pair[0] ? T.accent : T.border), background: txDraft.type === pair[0] ? "#EAF1FC" : "#FFFFFF", color: txDraft.type === pair[0] ? T.accent : T.textMuted, fontSize: 12, fontWeight: 600 }}>
              {pair[1]}
            </button>
          ))}
        </div>
      </Field>
      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.textMuted }}>
          <input type="checkbox" checked={txDraft.recurringOn} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { recurringOn: e.target.checked }))} />
          Movimiento recurrente
        </label>
        {txDraft.recurringOn && (
          <select value={txDraft.frequency} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { frequency: e.target.value }))} style={Object.assign({}, inputStyle, { width: 140 })}>
            {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        )}
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 2 }}>
        <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
          {txDraft.id ? "Guardar cambios" : "Guardar movimiento"}
        </button>
        <button type="button" onClick={resetDraft} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 14px", color: T.textMuted, fontSize: 13 }}>Cancelar</button>
      </div>
    </form>
  );

  return (
    <div style={{ minHeight: "100%", background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        .amount { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .rowbtn { opacity: 0; transition: opacity .12s; }
        .accrow:hover .rowbtn { opacity: 1; }
        .accrow:hover { background: ${T.bgElevated}; }
        .navitem:hover { background: #EAEAEC; }
        .doctab:hover .docx { opacity: 1; }
        .catcard:hover .catx { opacity: 1; }
        button { cursor: pointer; }
        ::selection { background: ${T.accent}33; }
        select { appearance: none; -webkit-appearance: none; }
        input[type=checkbox] { accent-color: ${T.accent}; }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: 560, border: "1px solid " + T.border, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <aside style={{ background: T.sidebar, borderRight: "1px solid " + T.border, padding: "12px 10px", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {documents.map((d) => (
              <div key={d.id} className="doctab" style={{ display: "flex", alignItems: "center", gap: 3, background: d.id === activeDocId ? "#FFFFFF" : "transparent", border: "1px solid " + (d.id === activeDocId ? T.border : "transparent"), borderRadius: 6, padding: "3px 3px 3px 8px" }}>
                <button onClick={() => { setActiveDocId(d.id); setActiveAccount("all"); setView("transactions"); }} style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, fontWeight: d.id === activeDocId ? 700 : 500, color: d.id === activeDocId ? T.text : T.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                  <FolderOpen size={11} /> {d.name}
                </button>
                {documents.length > 1 && (
                  <button onClick={() => removeDocument(d.id)} className="docx" style={{ opacity: 0, background: "none", border: "none", color: T.textFaint, padding: "0 3px" }} aria-label={"Eliminar archivo " + d.name}><X size={10} /></button>
                )}
              </div>
            ))}
            <button onClick={() => setShowDocForm((s) => !s)} style={{ background: "none", border: "1px dashed " + T.border, borderRadius: 6, padding: "3px 7px", color: T.textMuted }} aria-label="Nuevo archivo"><Plus size={11} /></button>
          </div>
          {showDocForm && (
            <form onSubmit={addDocument} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input autoFocus placeholder="Nombre del archivo" value={docNameDraft} onChange={(e) => setDocNameDraft(e.target.value)} style={Object.assign({}, inputStyle, { fontSize: 12, padding: "6px 8px" })} />
              <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "0 10px", color: "#fff", fontSize: 12, fontWeight: 600 }}>Crear</button>
            </form>
          )}

          <div style={{ padding: "2px 8px 14px", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{activeDoc.name}</div>

          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, margin: "4px 10px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Cuentas</span>
            <button onClick={() => setShowAccForm(true)} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label="Anadir cuenta"><Plus size={13} /></button>
          </div>

          <button onClick={() => { setActiveAccount("all"); setView("transactions"); }} className="navitem" style={{ width: "100%", textAlign: "left", background: activeAccount === "all" && view === "transactions" ? "#FFFFFF" : "transparent", boxShadow: activeAccount === "all" && view === "transactions" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 10px", marginBottom: 2, color: T.text, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
            <Wallet size={14} style={{ color: T.accent }} /> Todas las cuentas
          </button>

          {ACCOUNT_TYPES.map((typeInfo) => {
            const group = accounts.filter((a) => (a.type || "checking") === typeInfo.value);
            if (group.length === 0) return null;
            const TypeIcon = typeInfo.icon;
            return (
              <div key={typeInfo.value} style={{ marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textFaint, fontWeight: 600, padding: "6px 10px 2px" }}>
                  <TypeIcon size={10} /> {typeInfo.label}
                </div>
                {group.map((a) => {
                  const bal = balances[a.id] || 0;
                  const low = (a.warning && bal < a.warning) || bal < 0;
                  return (
                    <div key={a.id} className="accrow navitem" style={{ borderRadius: 7, background: activeAccount === a.id ? "#FFFFFF" : "transparent", boxShadow: activeAccount === a.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none", marginBottom: 2, padding: "7px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <button onClick={() => { setActiveAccount(a.id); setView("transactions"); }} style={{ background: "none", border: "none", color: T.text, textAlign: "left", flex: 1, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        <TypeIcon size={12} style={{ color: T.textFaint, flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{a.name}</span>
                      </button>
                      <span className="amount" style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, color: low ? "#8A1F1F" : "#1F6B32", background: low ? "#FBE7E7" : "#E7F5EA" }}>{fmt(bal)}</span>
                      <button onClick={() => removeAccount(a.id)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Eliminar " + a.name}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {showAccForm && (
            <form onSubmit={addAccount} style={{ marginTop: 8, padding: 10, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <input autoFocus placeholder="Nombre de la cuenta" value={accDraft.name} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { name: e.target.value }))} style={inputStyle} />
              <select value={accDraft.type} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { type: e.target.value }))} style={inputStyle}>
                {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input placeholder="Saldo inicial" type="number" step="0.01" value={accDraft.opening} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { opening: e.target.value }))} style={inputStyle} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={{ flex: 1, background: T.accent, border: "none", borderRadius: 6, padding: "7px 0", color: "#fff", fontWeight: 600, fontSize: 12.5 }}>Crear</button>
                <button type="button" onClick={() => setShowAccForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 9px", color: T.textMuted }}><X size={12} /></button>
              </div>
            </form>
          )}

          <div style={{ marginTop: 22, padding: "0 10px" }}>
            <button
              onClick={() => setView("recurring")}
              className="navitem"
              style={{ width: "100%", textAlign: "left", background: view === "recurring" ? "#FFFFFF" : "transparent", boxShadow: view === "recurring" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Repeat size={12} /> Programador
              </span>
              {recurringList.length > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{recurringList.length}</span>}
            </button>
          </div>

          <div style={{ marginTop: 10, padding: "0 10px" }}>
            <button
              onClick={() => setView("categories")}
              className="navitem"
              style={{ width: "100%", textAlign: "left", background: view === "categories" ? "#FFFFFF" : "transparent", boxShadow: view === "categories" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600 }}>Categorias</span>
              {categories.length > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{categories.length}</span>}
            </button>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 18 }}>
            <div style={{ borderTop: "1px solid " + T.border, margin: "0 10px", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600 }}>Sumatorio</span>
              <span className="amount" style={{ fontSize: 16, fontWeight: 700, color: totalBalance < 0 ? T.expense : T.text }}>{fmt(totalBalance)}</span>
            </div>
          </div>
        </aside>

        <main style={{ background: T.bg, display: "flex", flexDirection: "column" }}>

          {view !== "transactions" && txForm}

          {view === "recurring" && (
            <div style={{ padding: "20px 24px", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div>
                  <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0 }}>Programador</h2>
                  <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Movimientos recurrentes en {activeDoc.name}.</p>
                </div>
                <button onClick={openScheduledForm} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600 }}>
                  <Plus size={14} /> Nueva programada
                </button>
              </div>

              {recurringList.length === 0 && (
                <div style={{ fontSize: 13, color: T.textFaint, marginTop: 18 }}>Sin movimientos recurrentes todavia.</div>
              )}

              {recurringList.length > 0 && (
                <div style={{ margin: "18px 0", fontSize: 13, color: T.textMuted }}>
                  Neto recurrente: <span className="amount" style={{ color: forecast.netPerMonth < 0 ? T.expense : T.income, fontWeight: 700 }}>{fmt(forecast.netPerMonth)}</span> / mes
                </div>
              )}

              {recurringList.length > 0 && (
                <div style={{ border: "1px solid " + T.border, borderRadius: 10, overflow: "hidden" }}>
                  {recurringList.map((t, i) => {
                    const freq = FREQUENCIES.find((f) => f.value === t.recurring.frequency);
                    const info = catInfo(t.categoryId, t.subcategoryId);
                    const color = t.type === "income" ? T.income : t.type === "transfer" ? T.transfer : T.expense;
                    return (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i === recurringList.length - 1 ? "none" : "1px solid " + T.borderSoft }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span style={Object.assign({ marginTop: 5 }, dot(info.color, 9))} />
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t.name}</div>
                            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{info.name} - {freq ? freq.label : t.recurring.frequency} - {accountName(t.accountId)} - proxima {shortDate(nextDate(t.date, t.recurring.frequency))}</div>
                          </div>
                        </div>
                        <span className="amount" style={{ fontSize: 14, color: color, fontWeight: 600 }}>{t.type === "income" ? "+" : "-"}{fmt(Math.abs(t.amount))}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === "categories" && (
            <div style={{ padding: "20px 24px", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div>
                  <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0 }}>Categorias</h2>
                  <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Categorias y subcategorias de {activeDoc.name}, con su color y presupuesto.</p>
                </div>
                <button onClick={() => setShowCatForm((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600 }}>
                  <Plus size={14} /> Nueva categoria
                </button>
              </div>

              {showCatForm && (
                <form onSubmit={addCategory} style={{ margin: "16px 0", padding: 14, background: T.bgElevated, border: "1px solid " + T.border, borderRadius: 10, display: "flex", flexDirection: "column", gap: 10, maxWidth: 340 }}>
                  <input autoFocus placeholder="Nombre de la categoria" value={catDraft.name} onChange={(e) => setCatDraft((d) => Object.assign({}, d, { name: e.target.value }))} style={inputStyle} />
                  <ColorSwatches value={catDraft.color} onChange={(c) => setCatDraft((d) => Object.assign({}, d, { color: c }))} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "7px 14px", color: "#fff", fontWeight: 600, fontSize: 12.5 }}>Crear</button>
                    <button type="button" onClick={() => setShowCatForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 10px", color: T.textMuted, fontSize: 12.5 }}>Cancelar</button>
                  </div>
                </form>
              )}

              {categories.length === 0 && <div style={{ fontSize: 13, color: T.textFaint, marginTop: 18 }}>Sin categorias todavia.</div>}

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
                {categories.map((cat) => {
                  const monthEntry = byCategory.find((b) => b.id === cat.id);
                  const val = monthEntry ? monthEntry.val : 0;
                  const limit = budgets[cat.id];
                  const pct = limit ? Math.min(100, (val / limit) * 100) : Math.min(100, (val / maxCat) * 100);
                  const over = limit && val > limit;
                  return (
                    <div key={cat.id} className="catcard" style={{ border: "1px solid " + T.border, borderRadius: 10, padding: 14, maxWidth: 480 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            onClick={() => setColorPickerOpen((p) => (p === "cat:" + cat.id ? null : "cat:" + cat.id))}
                            style={{ background: "none", border: "none", padding: 2, lineHeight: 0 }}
                            aria-label={"Cambiar color de " + cat.name}
                          >
                            <span style={dot(cat.color, 12)} />
                          </button>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="amount" style={{ fontSize: 13, color: T.textMuted }}>{fmt(val)}{limit ? " / " + fmt(limit) : ""}</span>
                          <button onClick={() => removeCategory(cat.id)} className="catx" style={{ opacity: 0, background: "none", border: "none", color: T.textFaint }} aria-label={"Eliminar " + cat.name}><Trash2 size={13} /></button>
                        </div>
                      </div>

                      {colorPickerOpen === "cat:" + cat.id && (
                        <div style={{ marginTop: 8 }}>
                          <ColorSwatches value={cat.color} onChange={(c) => { setCategoryColor(cat.id, c); setColorPickerOpen(null); }} size={14} />
                        </div>
                      )}

                      <div style={{ height: 6, background: T.borderSoft, borderRadius: 3, marginTop: 10 }}>
                        <div style={{ height: 6, borderRadius: 3, width: pct + "%", background: over ? T.expense : cat.color }} />
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <input
                          type="number" placeholder="Presupuesto mensual" value={limit === undefined ? "" : limit}
                          onChange={(e) => setBudgets((b) => Object.assign({}, b, { [cat.id]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                          style={Object.assign({}, inputStyle, { fontSize: 12, width: 150 })}
                        />
                      </div>

                      {cat.subcategories.length > 0 && (
                        <div style={{ marginTop: 12, paddingLeft: 18, borderLeft: "2px solid " + T.borderSoft, display: "flex", flexDirection: "column", gap: 8 }}>
                          {cat.subcategories.map((sub) => {
                            const subKey = "sub:" + cat.id + ":" + sub.id;
                            return (
                              <div key={sub.id}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <button
                                      onClick={() => setColorPickerOpen((p) => (p === subKey ? null : subKey))}
                                      style={{ background: "none", border: "none", padding: 2, lineHeight: 0 }}
                                      aria-label={"Cambiar color de " + sub.name}
                                    >
                                      <span style={dot(sub.color, 8)} />
                                    </button>
                                    <span style={{ fontSize: 12.5 }}>{sub.name}</span>
                                  </div>
                                  <button onClick={() => removeSubcategory(cat.id, sub.id)} style={{ background: "none", border: "none", color: T.textFaint }} aria-label={"Eliminar " + sub.name}><X size={11} /></button>
                                </div>
                                {colorPickerOpen === subKey && (
                                  <div style={{ marginTop: 6 }}>
                                    <ColorSwatches value={sub.color} onChange={(c) => { setSubcategoryColor(cat.id, sub.id, c); setColorPickerOpen(null); }} size={12} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {subFormFor === cat.id ? (
                        <form onSubmit={(e) => addSubcategory(cat.id, e)} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, paddingLeft: 18 }}>
                          <input autoFocus placeholder="Subcategoria" value={subDraft.name} onChange={(e) => setSubDraft((d) => Object.assign({}, d, { name: e.target.value }))} style={Object.assign({}, inputStyle, { fontSize: 12, width: 140 })} />
                          <ColorSwatches value={subDraft.color} onChange={(c) => setSubDraft((d) => Object.assign({}, d, { color: c }))} size={12} />
                          <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "5px 10px", color: "#fff", fontSize: 11.5, fontWeight: 600 }}>Anadir</button>
                          <button type="button" onClick={() => setSubFormFor(null)} style={{ background: "none", border: "none", color: T.textFaint }}><X size={12} /></button>
                        </form>
                      ) : (
                        <button onClick={() => { setSubFormFor(cat.id); setSubDraft({ name: "", color: PALETTE[0] }); }} style={{ marginTop: 10, marginLeft: 18, background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                          <Plus size={11} /> Subcategoria
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === "transactions" && (
          <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid " + T.border, gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{activeAccount === "all" ? "Todas las cuentas" : accountName(activeAccount)}</div>
              <div style={{ display: "flex", gap: 14, marginTop: 3 }}>
                <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}><TrendingUp size={12} /> <span className="amount">{fmt(monthIncome)}</span></span>
                <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}><TrendingDown size={12} /> <span className="amount">{fmt(monthExpense)}</span></span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setShowFilters((s) => !s)} style={smallBtn(showFilters)}><SlidersHorizontal size={12} style={{ verticalAlign: -1, marginRight: 4 }} />Filtros</button>
              <button onClick={exportCSV} style={smallBtn(false)}><Download size={12} style={{ verticalAlign: -1, marginRight: 4 }} />Exportar</button>
              <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={smallBtn(false)}><Upload size={12} style={{ verticalAlign: -1, marginRight: 4 }} />Importar</button>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={importCSV} style={{ display: "none" }} />
              <button onClick={() => { resetDraft(); setShowTxForm(true); }} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600 }}>
                <Plus size={14} /> Movimiento
              </button>
            </div>
          </div>

          {showFilters && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 14, borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
              <div style={{ position: "relative", flex: "1 1 180px" }}>
                <Search size={13} style={{ position: "absolute", left: 9, top: 10, color: T.textFaint }} />
                <input placeholder="Buscar descripcion" value={filters.search} onChange={(e) => setFilters((f) => Object.assign({}, f, { search: e.target.value }))} style={Object.assign({}, inputStyle, { paddingLeft: 28 })} />
              </div>
              <select value={filters.category} onChange={(e) => setFilters((f) => Object.assign({}, f, { category: e.target.value === "all" ? "all" : Number(e.target.value) }))} style={Object.assign({}, inputStyle, { width: 160 })}>
                <option value="all">Todas las categorias</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={filters.type} onChange={(e) => setFilters((f) => Object.assign({}, f, { type: e.target.value }))} style={Object.assign({}, inputStyle, { width: 130 })}>
                <option value="all">Todos los tipos</option>
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
                <option value="transfer">Transferencia</option>
              </select>
              <input type="date" value={filters.from} onChange={(e) => setFilters((f) => Object.assign({}, f, { from: e.target.value }))} style={Object.assign({}, inputStyle, { width: 140 })} />
              <input type="date" value={filters.to} onChange={(e) => setFilters((f) => Object.assign({}, f, { to: e.target.value }))} style={Object.assign({}, inputStyle, { width: 140 })} />
              <button onClick={() => setFilters({ search: "", category: "all", type: "all", from: "", to: "" })} style={smallBtn(false)}>Limpiar</button>
            </div>
          )}

          {txForm}

          <div style={{ flex: 1, overflow: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "70px 40px 1fr 110px 110px 56px", padding: "7px 20px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0 }}>
              <span>Fecha</span><span>Estado</span><span>Descripcion</span><span style={{ textAlign: "right" }}>Importe</span><span style={{ textAlign: "right" }}>Saldo</span><span />
            </div>

            {filteredTx.length === 0 && (
              <div style={{ padding: "28px 20px", color: T.textMuted, fontSize: 13 }}>Sin movimientos que coincidan. Prueba a limpiar los filtros.</div>
            )}

            {filteredTx.map((t) => {
              const isTransferOut = t.type === "transfer";
              const isTransferIn = t.type === "transfer_in";
              const isTransfer = isTransferOut || isTransferIn;
              const color = t.type === "income" ? T.income : isTransfer ? T.transfer : T.expense;
              const info = isTransfer ? { name: "Transferencia", color: T.transfer } : catInfo(t.categoryId, t.subcategoryId);
              const st = statusInfo(t.status);
              const StIcon = st.icon;
              const voided = t.status === "anulado";
              return (
                <div key={t.id} className="accrow" style={{ display: "grid", gridTemplateColumns: "70px 40px 1fr 110px 110px 56px", alignItems: "center", padding: "8px 20px", fontSize: 13, borderBottom: "1px solid " + T.borderSoft, opacity: voided ? 0.55 : 1 }}>
                  <span className="amount" style={{ color: T.textMuted, fontSize: 12 }}>{shortDate(t.date)}</span>
                  <button onClick={() => cycleStatus(t)} title={st.label + " - clic para cambiar"} style={{ display: "flex", alignItems: "center", color: st.color, background: "none", border: "none", padding: 2 }}>
                    <StIcon size={14} />
                  </button>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: voided ? "line-through" : "none" }}>
                    <span style={dot(info.color, 8)} />
                    {isTransfer && <ArrowRightLeft size={12} style={{ color: T.transfer }} />}
                    {t.name}
                    {isTransferOut ? " -> " + t.toLabel : ""}
                    {isTransferIn ? " <- " + t.fromLabel : ""}
                    {t.recurring && <Repeat size={11} style={{ color: T.textFaint }} />}
                  </span>
                  <span className="amount" style={{ textAlign: "right", color: color, fontWeight: 500 }}>
                    {t.type === "income" || isTransferIn ? "+" : isTransferOut ? "" : "-"}{fmt(Math.abs(t.amount))}
                  </span>
                  <span className="amount" style={{ textAlign: "right", color: resultingBalance(t) < 0 ? T.expense : T.textMuted, fontSize: 12.5 }}>
                    {fmt(resultingBalance(t))}
                  </span>
                  <span style={{ display: "flex", gap: 4, justifySelf: "end" }}>
                    <button onClick={() => editTx(t)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Editar"><Pencil size={12} /></button>
                    <button onClick={() => removeTx(t)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Eliminar"><Trash2 size={12} /></button>
                  </span>
                </div>
              );
            })}
          </div>

          {(() => {
            const hasData = evoPoints.length > 0;
            const evoMinB = hasData ? Math.min(0, ...evoPoints.map((p) => p.balance)) : 0;
            const evoMaxB = hasData ? Math.max(1, ...evoPoints.map((p) => p.balance)) : 1;
            const evoRangeB = (evoMaxB - evoMinB) || 1;
            const evoMinT = hasData ? evoPoints[0].time : 0;
            const evoMaxT = hasData ? evoPoints[evoPoints.length - 1].time : 1;
            const evoRangeT = (evoMaxT - evoMinT) || 1;
            const evoX = (t) => ((t - evoMinT) / evoRangeT) * 1000;
            const evoY = (b) => 10 + (1 - (b - evoMinB) / evoRangeB) * 118;
            let evoLinePath = "";
            evoPoints.forEach((p, i) => {
              if (i === 0) evoLinePath = "M " + evoX(p.time) + " " + evoY(p.balance);
              else evoLinePath += " L " + evoX(p.time) + " " + evoY(evoPoints[i - 1].balance) + " L " + evoX(p.time) + " " + evoY(p.balance);
            });
            const evoAreaPath = hasData
              ? evoLinePath + " L " + evoX(evoPoints[evoPoints.length - 1].time) + " " + evoY(0) + " L " + evoX(evoPoints[0].time) + " " + evoY(0) + " Z"
              : "";
            const monthsAgoISO = (n) => {
              const d = new Date();
              d.setMonth(d.getMonth() - n);
              return d.toISOString().slice(0, 10);
            };
            const presetActive = (n) => evoRange.to === "" && evoRange.from === monthsAgoISO(n);
            return (
              <div style={{ borderTop: "1px solid " + T.border }}>
                <div style={{ background: "#E7E7EB", padding: "6px 20px", fontSize: 12.5, fontWeight: 700, color: T.text, borderBottom: "1px solid " + T.border, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span>Evolucion del balance</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                    {[[1, "1M"], [3, "3M"], [6, "6M"], [12, "1A"]].map((p) => (
                      <button
                        key={p[0]}
                        onClick={() => setEvoRange({ from: monthsAgoISO(p[0]), to: "" })}
                        style={{ background: presetActive(p[0]) ? T.accent : "#FFFFFF", color: presetActive(p[0]) ? "#fff" : T.textMuted, border: "1px solid " + (presetActive(p[0]) ? T.accent : T.border), borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}
                      >{p[1]}</button>
                    ))}
                    <button
                      onClick={() => setEvoRange({ from: "", to: "" })}
                      style={{ background: evoRange.from === "" && evoRange.to === "" ? T.accent : "#FFFFFF", color: evoRange.from === "" && evoRange.to === "" ? "#fff" : T.textMuted, border: "1px solid " + (evoRange.from === "" && evoRange.to === "" ? T.accent : T.border), borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}
                    >Todo</button>
                    <input type="date" value={evoRange.from} onChange={(e) => setEvoRange((r) => Object.assign({}, r, { from: e.target.value }))} style={{ border: "1px solid " + T.border, borderRadius: 5, padding: "3px 6px", fontSize: 11, background: "#FFFFFF", color: T.text }} />
                    <span style={{ color: T.textFaint }}>-</span>
                    <input type="date" value={evoRange.to} onChange={(e) => setEvoRange((r) => Object.assign({}, r, { to: e.target.value }))} style={{ border: "1px solid " + T.border, borderRadius: 5, padding: "3px 6px", fontSize: 11, background: "#FFFFFF", color: T.text }} />
                  </div>
                </div>
                {!hasData ? (
                  <div style={{ padding: "18px 20px", color: T.textMuted, fontSize: 12.5 }}>Sin datos suficientes todavia.</div>
                ) : (
                  <div style={{ padding: "12px 44px 8px 20px", background: T.bg, position: "relative" }}>
                    <svg viewBox="0 0 1000 128" width="100%" height="150" preserveAspectRatio="none">
                      <line x1="0" y1={evoY(evoMaxB)} x2="1000" y2={evoY(evoMaxB)} stroke={T.borderSoft} strokeDasharray="4 3" />
                      {evoMinB < 0 && <line x1="0" y1={evoY(evoMinB)} x2="1000" y2={evoY(evoMinB)} stroke={T.borderSoft} strokeDasharray="4 3" />}
                      <line x1="0" y1={evoY(0)} x2="1000" y2={evoY(0)} stroke={T.border} strokeWidth="1" />
                      <path d={evoAreaPath} fill={T.accent} fillOpacity="0.13" stroke="none" />
                      <path d={evoLinePath} fill="none" stroke={T.accent} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <span style={{ position: "absolute", right: 4, top: 12 - 6 + (evoY(evoMaxB) / 128) * 126, fontSize: 10, color: T.textMuted }}>{fmt(evoMaxB)}</span>
                    <span style={{ position: "absolute", right: 4, top: 12 - 6 + (evoY(0) / 128) * 126, fontSize: 10, color: T.textMuted }}>{fmt(0)}</span>
                    {evoMinB < 0 && (
                      <span style={{ position: "absolute", right: 4, top: 12 - 6 + (evoY(evoMinB) / 128) * 126, fontSize: 10, color: T.textMuted }}>{fmt(evoMinB)}</span>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textFaint, marginTop: 2 }}>
                      {evoTicks.map((tk, i) => (<span key={i}>{tk.label}</span>))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ borderTop: "1px solid " + T.border, padding: "8px 20px", background: T.bgElevated, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total cuenta actual</span>
            <span className="amount" style={{ fontSize: 14, fontWeight: 700 }}>{fmt(activeAccount === "all" ? totalBalance : (balances[activeAccount] || 0))}</span>
          </div>
          </>
          )}
        </main>
      </div>
    </div>
  );
}
