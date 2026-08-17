import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, CircleDollarSign, CreditCard, FilePlus, FileText, Folder, FolderPlus, GripVertical, Landmark, Link2, PanelLeft, PanelLeftClose, PiggyBank, Pencil, Plus, Repeat, Save, SlidersHorizontal, Tag, Trash2, TrendingUp, X } from "lucide-react";
import type { Account, AccountType, CardKind, ID, LedgerDocument, PaymentMode, SavingsKind } from "../types";
import { ACCOUNT_TYPES, T, inputStyle } from "../theme";
import { fmt } from "../lib/format";
import type { AccountDraftFields } from "../lib/accounts";

export type MainView = "transactions" | "recurring" | "categories" | "filters";
export type SidebarSection = "documentos" | "cuentas" | "recurring" | "categories" | "filters" | "previsiones";

interface AccountSection {
  key: AccountType;
  label: string;
  icon: typeof Landmark;
}

export const ACCOUNT_SECTIONS: AccountSection[] = [
  { key: "checking", label: "Bancos", icon: Landmark },
  { key: "savings", label: "Ahorro", icon: PiggyBank },
  { key: "credit", label: "Tarjetas", icon: CreditCard },
  { key: "cash", label: "Efectivo", icon: Banknote },
];

/** Titulo de cabecera de Movimientos cuando se selecciona un grupo entero de cuentas (Bancos/Ahorro/Tarjetas/Efectivo) desde la barra lateral. */
export const ACCOUNT_GROUP_LABELS: Record<AccountType, string> = {
  checking: "Todos los Bancos",
  savings: "Todos los Ahorros",
  credit: "Todas las Tarjetas",
  cash: "Todo el Efectivo",
};

interface AccDraft {
  id: ID | null;
  name: string;
  opening: string;
  type: AccountType;
  linkedAccountId: ID | null;
  savingsKind: SavingsKind | null;
  cardKind: CardKind | null;
  paymentMode: PaymentMode | null;
  monthlyPayment: string;
  /** Si es true, el formulario oculta el selector de tipo (ya viene implicito por la seccion desde la que se abrio). */
  lockType: boolean;
}

const emptyAccDraft = (type: AccountType, lockType: boolean): AccDraft => ({
  id: null, name: "", opening: "", type, linkedAccountId: null,
  savingsKind: type === "savings" ? "savings" : null,
  cardKind: type === "credit" ? "debit" : null,
  paymentMode: null, monthlyPayment: "", lockType,
});

const ACCOUNT_NAME_LABEL: Record<AccountType, string> = {
  checking: "Nombre de cuenta",
  savings: "Nombre de cuenta",
  credit: "Nombre de la tarjeta",
  cash: "Nombre del monedero",
};

export function Sidebar({
  documents,
  activeDocId,
  setActiveDocId,
  onCreateDocument,
  onRenameDocument,
  onLinkDocument,
  onCloseDocument,
  onSaveDocument,
  onSaveAsDocument,
  accounts,
  balances,
  totalBalance,
  activeAccounts,
  activeAccountTypeGroup,
  onAccountClick,
  onAccountTypeGroupClick,
  onAccountsHeaderClick,
  clearAccountSelection,
  addAccount,
  updateAccount,
  removeAccount,
  onReorderAccounts,
  newAccountTrigger,
  view,
  setView,
  sidebarSection,
  setSidebarSection,
  showPrevision,
  setShowPrevision,
  recurringCount,
  categoriesCount,
  savedFiltersCount,
  collapsed,
  onToggleCollapsed,
}: {
  documents: LedgerDocument[];
  activeDocId: string;
  setActiveDocId: (id: string) => void;
  /** "Nuevo documento": arranca una sesión limpia, sustituyendo la lista de documentos abiertos (a diferencia de "Vincular documento", que añade el elegido a los que ya estaban abiertos). */
  onCreateDocument: (name: string) => void;
  onRenameDocument: (id: string, newName: string) => void;
  /** "Vincular documento": abre el selector nativo de archivos y añade el documento elegido a la sesión (a diferencia de "Nuevo documento", que crea uno en blanco). */
  onLinkDocument: () => void;
  onCloseDocument: (id: string) => void;
  onSaveDocument: (doc: LedgerDocument) => Promise<void>;
  onSaveAsDocument: () => void;
  accounts: Account[];
  balances: Record<ID, number>;
  totalBalance: number;
  activeAccounts: Set<ID>;
  /** Tipo de cuenta cuyo grupo (Bancos/Ahorro/Tarjetas/Efectivo) está seleccionado en bloque, o null si no hay ninguno. */
  activeAccountTypeGroup: AccountType | null;
  onAccountClick: (id: ID, shiftKey: boolean, toggleKey: boolean) => void;
  onAccountTypeGroupClick: (type: AccountType) => void;
  onAccountsHeaderClick: () => void;
  clearAccountSelection: () => void;
  addAccount: (fields: AccountDraftFields) => void;
  updateAccount: (id: ID, fields: AccountDraftFields) => void;
  removeAccount: (id: ID) => void;
  onReorderAccounts: (draggedId: ID, targetId: ID) => void;
  /** Se incrementa desde Documento > Nueva cuenta (menú nativo) para abrir el formulario sin pasar por el "+" de una sección concreta. */
  newAccountTrigger: number;
  view: MainView;
  setView: (v: MainView) => void;
  sidebarSection: SidebarSection;
  setSidebarSection: (s: SidebarSection) => void;
  showPrevision: boolean;
  setShowPrevision: (fn: (s: boolean) => boolean) => void;
  recurringCount: number;
  categoriesCount: number;
  savedFiltersCount: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [showDocForm, setShowDocForm] = useState(false);
  const [docMenuOpen, setDocMenuOpen] = useState(false);
  const [docNameDraft, setDocNameDraft] = useState("");
  const [renamingDocId, setRenamingDocId] = useState<ID | null>(null);
  const [docRenameDraft, setDocRenameDraft] = useState("");
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
    setDocMenuOpen(false);
    setRenamingDocId(null);
  }, [view, activeDocId]);

  function commitDocRename(id: ID) {
    const trimmed = docRenameDraft.trim();
    if (trimmed) onRenameDocument(id, trimmed);
    setRenamingDocId(null);
  }

  function submitDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!docNameDraft.trim()) return;
    onCreateDocument(docNameDraft);
    setDocNameDraft("");
    setShowDocForm(false);
  }

  function openAccountForm(type: AccountType, existing: Account | null, lockType: boolean) {
    if (existing) {
      setAccDraft({
        id: existing.id, name: existing.name, opening: String(existing.opening), type: existing.type, linkedAccountId: existing.linkedAccountId,
        savingsKind: existing.savingsKind ?? (existing.type === "savings" ? "savings" : null),
        cardKind: existing.cardKind ?? (existing.type === "credit" ? "debit" : null),
        paymentMode: existing.paymentMode, monthlyPayment: existing.monthlyPayment != null ? String(existing.monthlyPayment) : "",
        lockType: false,
      });
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
    if (accDraft.type === "credit" && !accDraft.linkedAccountId) return;
    const fields: AccountDraftFields = {
      name: accDraft.name,
      type: accDraft.type,
      opening: Number(accDraft.opening) || 0,
      linkedAccountId: accDraft.linkedAccountId,
      savingsKind: accDraft.savingsKind,
      cardKind: accDraft.cardKind,
      paymentMode: accDraft.paymentMode,
      monthlyPayment: Number(accDraft.monthlyPayment) || 0,
    };
    if (accDraft.id) updateAccount(accDraft.id, fields);
    else addAccount(fields);
    setAccDraft(emptyAccDraft("checking", false));
    setShowAccForm(false);
  }

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
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>Conta-Nice</span>
          </div>
        )}
        <button onClick={onToggleCollapsed} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label={collapsed ? "Expandir menu" : "Contraer menu"}>
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      {!collapsed && <div style={{ borderTop: "1px solid " + T.border, margin: "10px 0 12px" }} />}

      {collapsed ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: T.textMuted }}>
          <button onClick={() => setSidebarSection("documentos")} style={{ background: "none", border: "none", color: sidebarSection === "documentos" ? T.accent : T.textMuted, padding: 4 }} aria-label="Documentos" title="Documentos">
            <FileText size={17} />
          </button>
          <button onClick={() => setShowDocForm((s) => !s)} style={{ background: "none", border: "none", color: T.textMuted, padding: 4 }} aria-label="Añadir documento" title="Añadir documento">
            <Plus size={14} />
          </button>
          <div style={{ width: 20, borderTop: "1px solid " + T.border }} />
          <button onClick={onAccountsHeaderClick} style={{ background: "none", border: "none", color: sidebarSection === "cuentas" ? T.accent : T.textMuted, padding: 4 }} aria-label="Cuentas" title="Cuentas">
            <CircleDollarSign size={17} />
          </button>
          <button onClick={() => onAccountTypeGroupClick("checking")} style={{ background: "none", border: "none", color: activeAccountTypeGroup === "checking" ? T.accent : T.textMuted, padding: 2 }} aria-label="Bancos" title="Bancos">
            <Landmark size={15} />
          </button>
          <button onClick={() => onAccountTypeGroupClick("savings")} style={{ background: "none", border: "none", color: activeAccountTypeGroup === "savings" ? T.accent : T.textMuted, padding: 2 }} aria-label="Ahorro" title="Ahorro">
            <PiggyBank size={15} />
          </button>
          <button onClick={() => onAccountTypeGroupClick("credit")} style={{ background: "none", border: "none", color: activeAccountTypeGroup === "credit" ? T.accent : T.textMuted, padding: 2 }} aria-label="Tarjetas" title="Tarjetas">
            <CreditCard size={15} />
          </button>
          <button onClick={() => onAccountTypeGroupClick("cash")} style={{ background: "none", border: "none", color: activeAccountTypeGroup === "cash" ? T.accent : T.textMuted, padding: 2 }} aria-label="Efectivo" title="Efectivo">
            <Banknote size={15} />
          </button>
          <button onClick={() => openAccountForm("checking", null, false)} style={{ background: "none", border: "none", color: T.textMuted, padding: 4 }} aria-label="Añadir cuenta" title="Añadir cuenta">
            <Plus size={14} />
          </button>
          <div style={{ width: 20, borderTop: "1px solid " + T.border }} />
          <button onClick={() => { setSidebarSection("recurring"); setView("recurring"); }} style={{ background: "none", border: "none", color: sidebarSection === "recurring" ? T.accent : T.textMuted, padding: 4 }} aria-label="Programador" title="Programador">
            <Repeat size={17} />
          </button>
          <button onClick={() => { setSidebarSection("categories"); setView("categories"); }} style={{ background: "none", border: "none", color: sidebarSection === "categories" ? T.accent : T.textMuted, padding: 4 }} aria-label="Categorias" title="Categorias">
            <Tag size={15} />
          </button>
          <button onClick={() => { setSidebarSection("filters"); setView("filters"); }} style={{ background: "none", border: "none", color: sidebarSection === "filters" ? T.accent : T.textMuted, padding: 4 }} aria-label="Filtros" title="Filtros">
            <SlidersHorizontal size={17} />
          </button>
          <button
            onClick={() => { setSidebarSection("previsiones"); setShowPrevision((s) => !s); }}
            style={{ background: "none", border: "none", color: sidebarSection === "previsiones" && showPrevision ? T.accent : T.textMuted, padding: 4 }}
            aria-label="Previsiones"
            title="Previsiones"
          >
            <TrendingUp size={17} />
          </button>
        </div>
      ) : (
      <>
      <div style={{ padding: "0 2px", position: "relative" }}>
        <button
          onClick={() => setSidebarSection("documentos")}
          className="navitem"
          style={{ width: "100%", textAlign: "left", background: sidebarSection === "documentos" ? "#FFFFFF" : "transparent", boxShadow: sidebarSection === "documentos" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}
        >
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Folder size={13} style={{ color: sidebarSection === "documentos" ? T.accent : T.textMuted }} /> Documentos
          </span>
          <span onClick={(e) => { e.stopPropagation(); setDocMenuOpen((s) => !s); }} style={{ color: T.textMuted, display: "flex" }}>
            <Plus size={13} />
          </span>
        </button>
        {docMenuOpen && (
          <>
            <div onClick={() => setDocMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <div style={{ position: "absolute", top: "100%", right: 10, marginTop: 2, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,0.1)", zIndex: 41, minWidth: 190, overflow: "hidden" }}>
              <button
                onClick={() => { setDocMenuOpen(false); onLinkDocument(); }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "9px 12px", fontSize: 12.5, color: T.text, display: "flex", alignItems: "center", gap: 7 }}
              >
                <Link2 size={13} style={{ color: T.textMuted }} /> Vincular documento
              </button>
              <button
                onClick={() => { setDocMenuOpen(false); setShowDocForm(true); }}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "9px 12px", fontSize: 12.5, color: T.text, display: "flex", alignItems: "center", gap: 7, borderTop: "1px solid " + T.borderSoft }}
              >
                <FilePlus size={13} style={{ color: T.textMuted }} /> Nuevo documento
              </button>
            </div>
          </>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 14, padding: "0 6px 0 12px" }}>
        {documents.map((d, docIndex) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: 190, flexShrink: 0, background: d.id === activeDocId ? "#FFFFFF" : "transparent", border: "1px solid " + (d.id === activeDocId ? T.border : T.borderSoft), borderRadius: 7, padding: "6px 8px" }}>
              {renamingDocId === d.id ? (
                <input
                  autoFocus
                  value={docRenameDraft}
                  onChange={(e) => setDocRenameDraft(e.target.value)}
                  onBlur={() => commitDocRename(d.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitDocRename(d.id);
                    if (e.key === "Escape") setRenamingDocId(null);
                  }}
                  style={{ fontSize: 12, fontWeight: 700, border: "1px solid " + T.accent, borderRadius: 4, padding: "1px 4px", width: 90, minWidth: 0 }}
                />
              ) : (
                <button
                  onClick={() => { setActiveDocId(d.id); clearAccountSelection(); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setRenamingDocId(d.id); setDocRenameDraft(d.name); }}
                  style={{ background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: d.id === activeDocId ? 700 : 500, color: d.id === activeDocId ? T.text : T.textMuted, display: "flex", alignItems: "center", gap: 5, overflow: "hidden", minWidth: 0, flex: 1, textAlign: "left" }}
                >
                  <FileText size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                </button>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <button onClick={() => onCloseDocument(d.id)} style={{ background: "none", border: "none", color: T.textFaint, padding: "0 2px" }} aria-label={"Cerrar archivo " + d.name}>
                  <Trash2 size={11} />
                </button>
                <button
                  onClick={() => handleSaveDocumentClick(d)}
                  style={{ background: "none", border: "none", color: savedDocFeedback === d.id ? T.income : T.textFaint, padding: "0 2px" }}
                  aria-label={"Guardar " + d.name}
                  title="Guardar"
                >
                  {savedDocFeedback === d.id ? <CheckCircle2 size={11} /> : <Save size={11} />}
                </button>
                <button onClick={onSaveAsDocument} style={{ background: "none", border: "none", color: T.textFaint, padding: "0 2px" }} aria-label={"Guardar como " + d.name} title="Guardar como">
                  <FolderPlus size={11} />
                </button>
              </span>
            </div>
            {docIndex === documents.length - 2 && <Link2 size={13} style={{ color: T.text, flexShrink: 0 }} />}
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
            <X size={13} />
          </button>
        </form>
      )}

      <div style={{ borderTop: "1px solid " + T.border, margin: "14px 10px 4px" }} />
      <div style={{ padding: "0 2px", marginTop: 6 }}>
        <div
          className="navitem"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: sidebarSection === "cuentas" ? "#FFFFFF" : "transparent", boxShadow: sidebarSection === "cuentas" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", borderRadius: 7, padding: "7px 8px" }}
        >
          <button onClick={onAccountsHeaderClick} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <CircleDollarSign size={13} style={{ color: sidebarSection === "cuentas" ? T.accent : T.textMuted }} /> Cuentas
            </span>
          </button>
          <button onClick={() => openAccountForm("checking", null, false)} style={{ background: "none", border: "none", color: T.textFaint, padding: 1 }} aria-label="Anadir cuenta">
            <Plus size={13} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        {ACCOUNT_SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const group = accounts.filter((a) => (a.type || "checking") === section.key);
          const groupActive = activeAccountTypeGroup === section.key;
          return (
            <div key={section.key} style={{ marginBottom: 4 }}>
              <div
                className="navitem"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 8px 16px", marginBottom: 6, borderRadius: 6, background: groupActive ? "#FFFFFF" : "transparent", boxShadow: groupActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}
              >
                <button
                  onClick={() => onAccountTypeGroupClick(section.key)}
                  style={{ background: "none", border: "none", padding: "2px 0", display: "flex", alignItems: "center", gap: 5, flex: 1, textAlign: "left" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: groupActive ? T.accent : T.textFaint, fontWeight: 700 }}>
                    <SectionIcon size={11} /> {section.label}
                  </span>
                </button>
                <button onClick={() => openAccountForm(section.key, null, true)} style={{ background: "none", border: "none", color: T.textFaint, padding: 1 }} aria-label={"Anadir " + section.label}>
                  <Plus size={11} />
                </button>
              </div>
              {group.length === 0 && <div style={{ fontSize: 11, color: T.textFaint, padding: "2px 10px 4px 18px" }}>Sin cuentas.</div>}
              {group.map((a) => {
                const bal = balances[a.id] || 0;
                const low = (a.warning && bal < a.warning) || bal < 0;
                const highlighted = !activeAccountTypeGroup && activeAccounts.has(a.id);
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
                      padding: "7px 10px 7px 18px",
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
                    <button
                      onClick={(e) => { onAccountClick(a.id, e.shiftKey, e.metaKey || e.ctrlKey); setSidebarSection("cuentas"); setView("transactions"); }}
                      style={{ background: "none", border: "none", color: T.text, textAlign: "left", flex: 1, padding: 0, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
                    >
                      <SectionIcon size={11} style={{ color: T.textFaint, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    </button>
                    <span className="amount" style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20, color: low ? "#8A1F1F" : "#1F6B32", background: low ? "#FBE7E7" : "#E7F5EA", flexShrink: 0 }}>
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
      </div>

      {showAccForm && (
        <form onSubmit={submitAccount} style={{ marginTop: 8, padding: 10, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <input autoFocus placeholder={ACCOUNT_NAME_LABEL[accDraft.type]} value={accDraft.name} onChange={(e) => setAccDraft((d) => ({ ...d, name: e.target.value }))} style={inputStyle} />
          {!accDraft.lockType && (
            <select
              value={accDraft.type}
              onChange={(e) => {
                const type = e.target.value as AccountType;
                setAccDraft((d) => ({
                  ...d, type,
                  linkedAccountId: type === "credit" ? d.linkedAccountId : null,
                  savingsKind: type === "savings" ? d.savingsKind ?? "savings" : null,
                  cardKind: type === "credit" ? d.cardKind ?? "debit" : null,
                  paymentMode: type === "credit" ? d.paymentMode : null,
                }));
              }}
              style={inputStyle}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          {accDraft.type === "savings" && (
            <select value={accDraft.savingsKind ?? "savings"} onChange={(e) => setAccDraft((d) => ({ ...d, savingsKind: e.target.value as SavingsKind }))} style={inputStyle}>
              <option value="savings">Ahorro</option>
              <option value="investment">Inversion</option>
            </select>
          )}
          {accDraft.type === "credit" && (
            <>
              <select
                value={accDraft.cardKind ?? "debit"}
                onChange={(e) => setAccDraft((d) => ({ ...d, cardKind: e.target.value as CardKind, paymentMode: e.target.value === "credit" ? d.paymentMode : null }))}
                style={inputStyle}
              >
                <option value="debit">Debito</option>
                <option value="credit">Credito</option>
              </select>
              <select value={accDraft.linkedAccountId ?? ""} onChange={(e) => setAccDraft((d) => ({ ...d, linkedAccountId: e.target.value || null }))} required style={inputStyle}>
                <option value="">Cuenta asociada (obligatoria)</option>
                {accounts.filter((a) => a.id !== accDraft.id).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {accDraft.cardKind === "credit" && (
                <select value={accDraft.paymentMode ?? "month_end"} onChange={(e) => setAccDraft((d) => ({ ...d, paymentMode: e.target.value as PaymentMode }))} style={inputStyle}>
                  <option value="month_end">A fin de mes</option>
                  <option value="installments">Fraccionada</option>
                  <option value="fixed">Otro (cantidad fija mensual)</option>
                </select>
              )}
              {accDraft.cardKind === "credit" && accDraft.paymentMode === "fixed" && (
                <input
                  placeholder="Cantidad fija mensual"
                  type="number"
                  step="0.01"
                  value={accDraft.monthlyPayment}
                  onChange={(e) => setAccDraft((d) => ({ ...d, monthlyPayment: e.target.value }))}
                  style={inputStyle}
                />
              )}
            </>
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

      <div style={{ borderTop: "1px solid " + T.border, margin: "14px 10px 10px" }} />
      <div style={{ marginTop: 12, padding: "0 2px" }}>
        <button
          onClick={() => { setSidebarSection("recurring"); setView("recurring"); }}
          className="navitem"
          style={{ width: "100%", textAlign: "left", background: sidebarSection === "recurring" ? "#FFFFFF" : "transparent", boxShadow: sidebarSection === "recurring" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Repeat size={13} style={{ color: sidebarSection === "recurring" ? T.accent : T.textMuted }} /> Programador
          </span>
          {recurringCount > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{recurringCount}</span>}
        </button>
      </div>

      <div style={{ marginTop: 6, padding: "0 2px" }}>
        <button
          onClick={() => { setSidebarSection("categories"); setView("categories"); }}
          className="navitem"
          style={{ width: "100%", textAlign: "left", background: sidebarSection === "categories" ? "#FFFFFF" : "transparent", boxShadow: sidebarSection === "categories" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Tag size={13} style={{ color: sidebarSection === "categories" ? T.accent : T.textMuted }} /> Categorias
          </span>
          {categoriesCount > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{categoriesCount}</span>}
        </button>
      </div>

      <div style={{ marginTop: 6, padding: "0 2px" }}>
        <button
          onClick={() => { setSidebarSection("filters"); setView("filters"); }}
          className="navitem"
          style={{ width: "100%", textAlign: "left", background: sidebarSection === "filters" ? "#FFFFFF" : "transparent", boxShadow: sidebarSection === "filters" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <SlidersHorizontal size={13} style={{ color: sidebarSection === "filters" ? T.accent : T.textMuted }} /> Filtros
          </span>
          {savedFiltersCount > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{savedFiltersCount}</span>}
        </button>
      </div>

      <div style={{ marginTop: 6, padding: "0 2px" }}>
        <button
          onClick={() => { setSidebarSection("previsiones"); setShowPrevision((s) => !s); }}
          className="navitem"
          style={{ width: "100%", textAlign: "left", background: sidebarSection === "previsiones" && showPrevision ? "#FFFFFF" : "transparent", boxShadow: sidebarSection === "previsiones" && showPrevision ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={13} style={{ color: sidebarSection === "previsiones" && showPrevision ? T.accent : T.textMuted }} /> Previsiones
          </span>
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
