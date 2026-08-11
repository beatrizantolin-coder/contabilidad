import type { ReactNode } from "react";
import { ArrowRightLeft, Download, Pencil, Plus, Repeat, Search, SlidersHorizontal, Trash2, TrendingDown, TrendingUp, Upload } from "lucide-react";
import type { Category, ID, Transaction } from "../types";
import { T, dot, inputStyle, smallBtn, statusInfo } from "../theme";
import { fmt, shortDate } from "../lib/format";
import { catInfo } from "../lib/categories";

export interface Filters {
  search: string;
  category: ID | "all";
  type: "all" | "income" | "expense" | "transfer";
  from: string;
  to: string;
}

export function TransactionsView({
  title,
  monthIncome,
  monthExpense,
  showFilters,
  setShowFilters,
  filters,
  setFilters,
  categories,
  filteredTx,
  resultingBalance,
  onEdit,
  onRemove,
  onCycleStatus,
  onAdd,
  onExport,
  onImport,
  footerLabel,
  footerAmount,
  chart,
}: {
  title: string;
  monthIncome: number;
  monthExpense: number;
  showFilters: boolean;
  setShowFilters: (fn: (s: boolean) => boolean) => void;
  filters: Filters;
  setFilters: (fn: (f: Filters) => Filters) => void;
  categories: Category[];
  filteredTx: Transaction[];
  resultingBalance: (t: Transaction) => number;
  onEdit: (t: Transaction) => void;
  onRemove: (t: Transaction) => void;
  onCycleStatus: (t: Transaction) => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  footerLabel: string;
  footerAmount: number;
  chart?: ReactNode;
}) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid " + T.border, gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 3 }}>
            <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingUp size={12} /> <span className="amount">{fmt(monthIncome)}</span>
            </span>
            <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingDown size={12} /> <span className="amount">{fmt(monthExpense)}</span>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowFilters((s) => !s)} style={smallBtn(showFilters)}>
            <SlidersHorizontal size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            Filtros
          </button>
          <button onClick={onExport} style={smallBtn(false)}>
            <Download size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            Exportar
          </button>
          <button onClick={onImport} style={smallBtn(false)}>
            <Upload size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            Importar
          </button>
          <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Movimiento
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 14, borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
          <div style={{ position: "relative", flex: "1 1 180px" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: 10, color: T.textFaint }} />
            <input placeholder="Buscar descripcion" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} style={{ ...inputStyle, paddingLeft: 28 }} />
          </div>
          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value === "all" ? "all" : e.target.value }))} style={{ ...inputStyle, width: 160 }}>
            <option value="all">Todas las categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as Filters["type"] }))} style={{ ...inputStyle, width: 130 }}>
            <option value="all">Todos los tipos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="transfer">Transferencia</option>
          </select>
          <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} style={{ ...inputStyle, width: 140 }} />
          <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} style={{ ...inputStyle, width: 140 }} />
          <button onClick={() => setFilters(() => ({ search: "", category: "all", type: "all", from: "", to: "" }))} style={smallBtn(false)}>
            Limpiar
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "70px 40px 1fr 110px 110px 56px", padding: "7px 20px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0 }}>
          <span>Fecha</span>
          <span>Estado</span>
          <span>Descripcion</span>
          <span style={{ textAlign: "right" }}>Importe</span>
          <span style={{ textAlign: "right" }}>Saldo</span>
          <span />
        </div>

        {filteredTx.length === 0 && <div style={{ padding: "28px 20px", color: T.textMuted, fontSize: 13 }}>Sin movimientos que coincidan. Prueba a limpiar los filtros.</div>}

        {filteredTx.map((t) => {
          const isTransferOut = t.type === "transfer";
          const isTransferIn = t.type === "transfer_in";
          const isTransfer = isTransferOut || isTransferIn;
          const color = t.type === "income" ? T.income : isTransfer ? T.transfer : T.expense;
          const info = isTransfer ? { name: "Transferencia", color: T.transfer } : catInfo(categories, t.categoryId, t.subcategoryId);
          const st = statusInfo(t.status);
          const StIcon = st.icon;
          const voided = t.status === "anulado";
          return (
            <div key={t.id} className="accrow" style={{ display: "grid", gridTemplateColumns: "70px 40px 1fr 110px 110px 56px", alignItems: "center", padding: "8px 20px", fontSize: 13, borderBottom: "1px solid " + T.borderSoft, opacity: voided ? 0.55 : 1 }}>
              <span className="amount" style={{ color: T.textMuted, fontSize: 12 }}>
                {shortDate(t.date)}
              </span>
              <button onClick={() => onCycleStatus(t)} title={st.label + " - clic para cambiar"} style={{ display: "flex", alignItems: "center", color: st.color, background: "none", border: "none", padding: 2 }}>
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
              <span className="amount" style={{ textAlign: "right", color, fontWeight: 500 }}>
                {t.type === "income" || isTransferIn ? "+" : isTransferOut ? "" : "-"}
                {fmt(Math.abs(t.amount))}
              </span>
              <span className="amount" style={{ textAlign: "right", color: resultingBalance(t) < 0 ? T.expense : T.textMuted, fontSize: 12.5 }}>
                {fmt(resultingBalance(t))}
              </span>
              <span style={{ display: "flex", gap: 4, justifySelf: "end" }}>
                <button onClick={() => onEdit(t)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Editar">
                  <Pencil size={12} />
                </button>
                <button onClick={() => onRemove(t)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Eliminar">
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {chart}

      <div style={{ borderTop: "1px solid " + T.border, padding: "8px 20px", background: T.bgElevated, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{footerLabel}</span>
        <span className="amount" style={{ fontSize: 14, fontWeight: 700 }}>
          {fmt(footerAmount)}
        </span>
      </div>
    </>
  );
}
