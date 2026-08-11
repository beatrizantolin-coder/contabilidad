import { useState } from "react";
import { FolderOpen, Plus, Trash2, Wallet, X } from "lucide-react";
import type { Account, AccountType, ID, LedgerDocument } from "../types";
import { ACCOUNT_TYPES, T, inputStyle } from "../theme";
import { fmt } from "../lib/format";

export function Sidebar({
  documents,
  activeDocId,
  setActiveDocId,
  activeDoc,
  createDocument,
  removeDocument,
  accounts,
  balances,
  totalBalance,
  activeAccount,
  setActiveAccount,
  addAccount,
  removeAccount,
}: {
  documents: LedgerDocument[];
  activeDocId: string;
  setActiveDocId: (id: string) => void;
  activeDoc: LedgerDocument;
  createDocument: (name: string) => void;
  removeDocument: (id: string) => void;
  accounts: Account[];
  balances: Record<ID, number>;
  totalBalance: number;
  activeAccount: ID | "all";
  setActiveAccount: (id: ID | "all") => void;
  addAccount: (name: string, type: AccountType, opening: number) => void;
  removeAccount: (id: ID) => void;
}) {
  const [showDocForm, setShowDocForm] = useState(false);
  const [docNameDraft, setDocNameDraft] = useState("");
  const [showAccForm, setShowAccForm] = useState(false);
  const [accDraft, setAccDraft] = useState<{ name: string; opening: string; type: AccountType }>({ name: "", opening: "", type: "checking" });

  function submitDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!docNameDraft.trim()) return;
    createDocument(docNameDraft);
    setDocNameDraft("");
    setShowDocForm(false);
  }

  function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accDraft.name) return;
    addAccount(accDraft.name, accDraft.type, Number(accDraft.opening) || 0);
    setAccDraft({ name: "", opening: "", type: "checking" });
    setShowAccForm(false);
  }

  return (
    <aside style={{ background: T.sidebar, borderRight: "1px solid " + T.border, padding: "12px 10px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {documents.map((d) => (
          <div
            key={d.id}
            className="doctab"
            style={{
              display: "flex", alignItems: "center", gap: 3,
              background: d.id === activeDocId ? "#FFFFFF" : "transparent",
              border: "1px solid " + (d.id === activeDocId ? T.border : "transparent"),
              borderRadius: 6, padding: "3px 3px 3px 8px",
            }}
          >
            <button
              onClick={() => { setActiveDocId(d.id); setActiveAccount("all"); }}
              style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, fontWeight: d.id === activeDocId ? 700 : 500, color: d.id === activeDocId ? T.text : T.textMuted, display: "flex", alignItems: "center", gap: 4 }}
            >
              <FolderOpen size={11} /> {d.name}
            </button>
            {documents.length > 1 && (
              <button onClick={() => removeDocument(d.id)} className="docx" style={{ opacity: 0, background: "none", border: "none", color: T.textFaint, padding: "0 3px" }} aria-label={"Eliminar archivo " + d.name}>
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => setShowDocForm((s) => !s)} style={{ background: "none", border: "1px dashed " + T.border, borderRadius: 6, padding: "3px 7px", color: T.textMuted }} aria-label="Nuevo archivo">
          <Plus size={11} />
        </button>
      </div>
      {showDocForm && (
        <form onSubmit={submitDoc} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input autoFocus placeholder="Nombre del archivo" value={docNameDraft} onChange={(e) => setDocNameDraft(e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} />
          <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "0 10px", color: "#fff", fontSize: 12, fontWeight: 600 }}>
            Crear
          </button>
        </form>
      )}

      <div style={{ padding: "2px 8px 14px", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{activeDoc.name}</div>

      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, margin: "4px 10px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Cuentas</span>
        <button onClick={() => setShowAccForm(true)} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label="Anadir cuenta">
          <Plus size={13} />
        </button>
      </div>

      <button
        onClick={() => setActiveAccount("all")}
        className="navitem"
        style={{ width: "100%", textAlign: "left", background: activeAccount === "all" ? "#FFFFFF" : "transparent", boxShadow: activeAccount === "all" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 10px", marginBottom: 2, color: T.text, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}
      >
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
                  <button onClick={() => setActiveAccount(a.id)} style={{ background: "none", border: "none", color: T.text, textAlign: "left", flex: 1, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <TypeIcon size={12} style={{ color: T.textFaint, flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{a.name}</span>
                  </button>
                  <span className="amount" style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, color: low ? "#8A1F1F" : "#1F6B32", background: low ? "#FBE7E7" : "#E7F5EA" }}>
                    {fmt(bal)}
                  </span>
                  <button onClick={() => removeAccount(a.id)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Eliminar " + a.name}>
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
          <select value={accDraft.type} onChange={(e) => setAccDraft((d) => ({ ...d, type: e.target.value as AccountType }))} style={inputStyle}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input placeholder="Saldo inicial" type="number" step="0.01" value={accDraft.opening} onChange={(e) => setAccDraft((d) => ({ ...d, opening: e.target.value }))} style={inputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={{ flex: 1, background: T.accent, border: "none", borderRadius: 6, padding: "7px 0", color: "#fff", fontWeight: 600, fontSize: 12.5 }}>
              Crear
            </button>
            <button type="button" onClick={() => setShowAccForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 9px", color: T.textMuted }}>
              <X size={12} />
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: "auto", paddingTop: 18 }}>
        <div style={{ borderTop: "1px solid " + T.border, margin: "0 10px", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600 }}>Sumatorio</span>
          <span className="amount" style={{ fontSize: 16, fontWeight: 700, color: totalBalance < 0 ? T.expense : T.text }}>
            {fmt(totalBalance)}
          </span>
        </div>
      </div>
    </aside>
  );
}
