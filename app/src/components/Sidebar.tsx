import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, CircleDollarSign, CreditCard, FolderOpen, GripVertical, PanelLeft, PanelLeftClose, PiggyBank, Pencil, Plus, Repeat, Save, Trash2, Wallet, X } from "lucide-react";
import type { Account, AccountType, ID, LedgerDocument } from "../types";
import { ACCOUNT_TYPES, T, inputStyle } from "../theme";
import { fmt } from "../lib/format";

export type MainView = "transactions" | "recurring" | "categories" | "filters";

interface AccountSection {
  key: AccountType;
  label: string;
  icon: typeof Wallet;
}

export const ACCOUNT_SECTIONS: AccountSection[] = [
  { key: "checking", label: "Cuentas", icon: Wallet },
  { key: "savings", label: "Ahorro", icon: PiggyBank },
  { key: "credit", label: "Tarjetas", icon: CreditCard },
  { key: "cash", label: "Efectivo", icon: Banknote },
];

interface AccDraft {
  id: ID | null;
  name: string;
  opening: string;
  type: AccountType;
  linkedAccountId: ID | null;
  /** Si es true, el formulario oculta el selector de tipo (ya viene implicito por la seccion desde la que se abrio). */
  lockType: boolean;
}

const emptyAccDraft = (type: AccountType, lockType: boolean): AccDraft => ({ id: null, name: "", opening: "", type, linkedAccountId: null, lockType });

export function Sidebar({
  documents,
  activeDocId,
  setActiveDocId,
  activeDoc,
  createDocument,
  removeDocument,
  onSaveDocument,
  accounts,
  balances,
  totalBalance,
  activeAccounts,
  onAccountClick,
  clearAccountSelection,
  addAccount,
  updateAccount,
  removeAccount,
  onReorderAccounts,
  newAccountTrigger,
  view,
  setView,
  recurringCount,
  categoriesCount,
  savedFiltersCount,
  collapsed,
  onToggleCollapsed,
}: {
  documents: LedgerDocument[];
  activeDocId: string;
  setActiveDocId: (id: string) => void;
  activeDoc: LedgerDocument;
  createDocument: (name: string) => void;
  removeDocument: (id: string) => void;
  onSaveDocument: (doc: LedgerDocument) => Promise<void>;
  accounts: Account[];
  balances: Record<ID, number>;
  totalBalance: number;
  activeAccounts: Set<ID>;
  onAccountClick: (id: ID, shiftKey: boolean) => void;
  clearAccountSelection: () => void;
  addAccount: (name: string, type: AccountType, opening: number, linkedAccountId: ID | null) => void;
  updateAccount: (id: ID, name: string, type: AccountType, opening: number, linkedAccountId: ID | null) => void;
  removeAccount: (id: ID) => void;
  onReorderAccounts: (draggedId: ID, targetId: ID) => void;
  /** Se incrementa desde Documento > Nueva cuenta (menú nativo) para abrir el formulario sin pasar por el "+" de una sección concreta. */
  newAccountTrigger: number;
  view: MainView;
  setView: (v: MainView) => void;
  recurringCount: number;
  categoriesCount: number;
  savedFiltersCount: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [showDocForm, setShowDocForm] = useState(false);
  const [docNameDraft, setDocNameDraft] = useState("");
  const [showAccForm, setShowAccForm] = useState(false);
  const [accDraft, setAccDraft] = useState<AccDraft>(emptyAccDraft("checking", false));
  const [draggedAccountId, setDraggedAccountId] = useState<ID | null>(null);
  const [dragOverAccountId, setDragOverAccountId] = useState<ID | null>(null);
  const [savedDocFeedback, setSavedDocFeedback] = useState<string | null>(null);

  async function handleSaveDocumentClick(d: LedgerDocument) {
    await onSaveDocument(d);
    setSavedDocFeedback(d.id);
    setTimeout(() => setSavedDocFeedback((cur) => (cur === d.id ? null : cur)), 1200);
  }

  // Reordenar cuentas por arrastre: se sigue el raton manualmente (en vez de
  // usar el HTML5 drag-and-drop nativo) porque bajo WebKitGTK el gesto de
  // arrastre nativo no siempre se dispara de forma fiable.
  useEffect(() => {
    if (!draggedAccountId) return;
    function onMove(e: MouseEvent) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el?.closest("[data-account-id]") as HTMLElement | null;
      const rowId = row?.dataset.accountId;
      const rowType = row?.dataset.accountType;
      const draggedType = accounts.find((a) => a.id === draggedAccountId)?.type || "checking";
      if (rowId && rowId !== draggedAccountId && rowType === draggedType) {
        setDragOverAccountId(rowId);
      } else {
        setDragOverAccountId(null);
      }
    }
    function onUp() {
      if (dragOverAccountId && draggedAccountId && dragOverAccountId !== draggedAccountId) {
        onReorderAccounts(draggedAccountId, dragOverAccountId);
      }
      setDraggedAccountId(null);
      setDragOverAccountId(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedAccountId, dragOverAccountId]);

  // Los formularios de añadir documento/cuenta son estado local de esta
  // barra lateral: se cierran solos al cambiar de vista o de documento
  // activo, igual que los paneles laterales de App.tsx.
  useEffect(() => {
    setShowDocForm(false);
    setShowAccForm(false);
  }, [view, activeDocId]);

  function submitDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!docNameDraft.trim()) return;
    createDocument(docNameDraft);
    setDocNameDraft("");
    setShowDocForm(false);
  }

  function openAccountForm(type: AccountType, existing: Account | null, lockType: boolean) {
    if (existing) {
      setAccDraft({ id: existing.id, name: existing.name, opening: String(existing.opening), type: existing.type, linkedAccountId: existing.linkedAccountId, lockType: false });
    } else {
      setAccDraft(emptyAccDraft(type, lockType));
    }
    setShowAccForm(true);
  }

  useEffect(() => {
    if (newAccountTrigger > 0) openAccountForm("checking", null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAccountTrigger]);

  function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accDraft.name) return;
    const opening = Number(accDraft.opening) || 0;
    const linkedAccountId = accDraft.type === "credit" ? accDraft.linkedAccountId : null;
    if (accDraft.id) updateAccount(accDraft.id, accDraft.name, accDraft.type, opening, linkedAccountId);
    else addAccount(accDraft.name, accDraft.type, opening, linkedAccountId);
    setAccDraft(emptyAccDraft("checking", false));
    setShowAccForm(false);
  }

  const goToAccounts = () => setView("transactions");

  return (
    <aside
      className="no-print"
      style={{
        background: T.sidebar, borderRight: "1px solid " + T.border, padding: collapsed ? "12px 6px" : "12px 10px",
        overflowY: collapsed ? "hidden" : "auto", height: "100%", minHeight: 0, display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", marginBottom: 14, flexShrink: 0 }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <CircleDollarSign size={20} style={{ color: T.accent, flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>Contabilidad</span>
          </div>
        )}
        <button onClick={onToggleCollapsed} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label={collapsed ? "Expandir menu" : "Contraer menu"}>
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {collapsed ? null : (
      <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 10px 6px" }}>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600 }}>Documentos</span>
        <button onClick={() => setShowDocForm((s) => !s)} style={{ background: "none", border: "none", color: T.textMuted, padding: 1 }} aria-label="Nuevo archivo">
          <Plus size={13} />
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {documents.map((d) => (
          <div
            key={d.id}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              background: d.id === activeDocId ? "#FFFFFF" : "transparent",
              border: "1px solid " + (d.id === activeDocId ? T.border : "transparent"),
              borderRadius: 6, padding: "3px 3px 3px 8px",
            }}
          >
            <button
              onClick={() => { setActiveDocId(d.id); clearAccountSelection(); }}
              style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, fontWeight: d.id === activeDocId ? 700 : 500, color: d.id === activeDocId ? T.text : T.textMuted, display: "flex", alignItems: "center", gap: 4 }}
            >
              <FolderOpen size={11} /> {d.name}
            </button>
            <button onClick={() => removeDocument(d.id)} style={{ background: "none", border: "none", color: T.textFaint, padding: "0 3px" }} aria-label={"Eliminar archivo " + d.name}>
              <Trash2 size={10} />
            </button>
            <button
              onClick={() => handleSaveDocumentClick(d)}
              style={{ background: "none", border: "none", color: savedDocFeedback === d.id ? T.income : T.textFaint, padding: "0 3px 0 0" }}
              aria-label={"Guardar " + d.name}
              title="Guardar"
            >
              {savedDocFeedback === d.id ? <CheckCircle2 size={10} /> : <Save size={10} />}
            </button>
          </div>
        ))}
      </div>
      {showDocForm && (
        <form onSubmit={submitDoc} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input autoFocus placeholder="Nombre del archivo" value={docNameDraft} onChange={(e) => setDocNameDraft(e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} />
          <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "0 10px", color: "#fff", fontSize: 12, fontWeight: 600 }}>
            Crear
          </button>
          <button
            type="button"
            onClick={() => { setShowDocForm(false); setDocNameDraft(""); }}
            style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "0 8px", color: T.textMuted }}
            aria-label="Cancelar"
          >
            <X size={12} />
          </button>
        </form>
      )}

      <div style={{ padding: "2px 8px 14px", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{activeDoc.name}</div>

      <div
        className="navitem"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, background: activeAccounts.size === 0 && view === "transactions" ? "#FFFFFF" : "transparent", boxShadow: activeAccounts.size === 0 && view === "transactions" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", borderRadius: 7, padding: "7px 8px 7px 10px" }}
      >
        <button
          onClick={() => { clearAccountSelection(); goToAccounts(); }}
          style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, color: T.text, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}
        >
          <CircleDollarSign size={14} style={{ color: T.accent }} /> Grupos de cuentas
        </button>
        <button onClick={() => openAccountForm("checking", null, false)} style={{ background: "none", border: "none", color: T.textFaint, padding: 1, marginLeft: 6 }} aria-label="Anadir cuenta">
          <Plus size={13} />
        </button>
      </div>

      {ACCOUNT_SECTIONS.map((section) => {
        const SectionIcon = section.icon;
        const group = accounts.filter((a) => (a.type || "checking") === section.key);
        return (
          <div key={section.key} style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 2px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textFaint, fontWeight: 600 }}>
                <SectionIcon size={10} /> {section.label}
              </span>
              <button onClick={() => openAccountForm(section.key, null, true)} style={{ background: "none", border: "none", color: T.textFaint, padding: 1 }} aria-label={"Anadir " + section.label}>
                <Plus size={11} />
              </button>
            </div>
            {group.length === 0 && <div style={{ fontSize: 11, color: T.textFaint, padding: "2px 10px 4px" }}>Sin cuentas.</div>}
            {group.map((a) => {
              const bal = balances[a.id] || 0;
              const low = (a.warning && bal < a.warning) || bal < 0;
              const highlighted = activeAccounts.has(a.id);
              const isDragging = draggedAccountId === a.id;
              const isDragOver = dragOverAccountId === a.id && draggedAccountId !== a.id;
              return (
                <div
                  key={a.id}
                  className="accrow navitem"
                  data-account-id={a.id}
                  data-account-type={a.type || "checking"}
                  style={{
                    borderRadius: 7,
                    background: highlighted ? "#FFFFFF" : "transparent",
                    boxShadow: highlighted ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    marginBottom: 2,
                    padding: "7px 10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 6,
                    opacity: isDragging ? 0.4 : 1,
                    borderTop: isDragOver ? "2px solid " + T.accent : "2px solid transparent",
                  }}
                >
                  <GripVertical
                    size={11}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDraggedAccountId(a.id);
                    }}
                    style={{ color: T.textFaint, flexShrink: 0, cursor: "grab" }}
                  />
                  <button onClick={(e) => { onAccountClick(a.id, e.shiftKey); goToAccounts(); }} style={{ background: "none", border: "none", color: T.text, textAlign: "left", flex: 1, padding: 0, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <SectionIcon size={12} style={{ color: T.textFaint, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  </button>
                  <span className="amount" style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, color: low ? "#8A1F1F" : "#1F6B32", background: low ? "#FBE7E7" : "#E7F5EA", flexShrink: 0 }}>
                    {fmt(bal)}
                  </span>
                  <button onClick={() => openAccountForm(a.type, a, false)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, flexShrink: 0 }} aria-label={"Editar " + a.name}>
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => removeAccount(a.id)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, flexShrink: 0 }} aria-label={"Eliminar " + a.name}>
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}

      {showAccForm && (
        <form onSubmit={submitAccount} style={{ marginTop: 8, padding: 10, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <input autoFocus placeholder="Nombre de la cuenta" value={accDraft.name} onChange={(e) => setAccDraft((d) => ({ ...d, name: e.target.value }))} style={inputStyle} />
          {!accDraft.lockType && (
            <select
              value={accDraft.type}
              onChange={(e) => setAccDraft((d) => ({ ...d, type: e.target.value as AccountType, linkedAccountId: e.target.value === "credit" ? d.linkedAccountId : null }))}
              style={inputStyle}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          {accDraft.type === "credit" && (
            <select value={accDraft.linkedAccountId ?? ""} onChange={(e) => setAccDraft((d) => ({ ...d, linkedAccountId: e.target.value || null }))} style={inputStyle}>
              <option value="">Sin cuenta asociada</option>
              {accounts.filter((a) => a.id !== accDraft.id).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <input placeholder="Saldo inicial" type="number" step="0.01" value={accDraft.opening} onChange={(e) => setAccDraft((d) => ({ ...d, opening: e.target.value }))} style={inputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={{ flex: 1, background: T.accent, border: "none", borderRadius: 6, padding: "7px 0", color: "#fff", fontWeight: 600, fontSize: 12.5 }}>
              {accDraft.id ? "Guardar" : "Crear"}
            </button>
            <button type="button" onClick={() => setShowAccForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 9px", color: T.textMuted }}>
              <X size={12} />
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: 22, padding: "0 10px" }}>
        <button
          onClick={() => { clearAccountSelection(); setView("recurring"); }}
          className="navitem"
          style={{ width: "100%", textAlign: "left", background: view === "recurring" ? "#FFFFFF" : "transparent", boxShadow: view === "recurring" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Repeat size={12} /> Programador
          </span>
          {recurringCount > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{recurringCount}</span>}
        </button>
      </div>

      <div style={{ marginTop: 10, padding: "0 10px" }}>
        <button
          onClick={() => { clearAccountSelection(); setView("categories"); }}
          className="navitem"
          style={{ width: "100%", textAlign: "left", background: view === "categories" ? "#FFFFFF" : "transparent", boxShadow: view === "categories" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600 }}>Categorias</span>
          {categoriesCount > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{categoriesCount}</span>}
        </button>
      </div>

      <div style={{ marginTop: 10, padding: "0 10px" }}>
        <button
          onClick={() => { clearAccountSelection(); setView("filters"); }}
          className="navitem"
          style={{ width: "100%", textAlign: "left", background: view === "filters" ? "#FFFFFF" : "transparent", boxShadow: view === "filters" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600 }}>Filtros</span>
          {savedFiltersCount > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{savedFiltersCount}</span>}
        </button>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 18 }}>
        <div style={{ borderTop: "1px solid " + T.border, margin: "0 10px", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600 }}>Sumatorio</span>
          <span className="amount" style={{ fontSize: 16, fontWeight: 700, color: totalBalance < 0 ? T.expense : T.text }}>
            {fmt(totalBalance)}
          </span>
        </div>
      </div>
      </>
      )}
    </aside>
  );
}
