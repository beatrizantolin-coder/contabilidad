import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowRightLeft, CalendarRange, ChevronDown, ChevronRight, Download, GripVertical, Link2, Link2Off, Pencil, Plus, Redo2, Repeat, Save, SlidersHorizontal, Trash2, TrendingDown, TrendingUp, Undo2, Upload } from "lucide-react";
import type { Category, Filters, ID, SortColumn, SortState, Transaction } from "../types";
import { T, dot, smallBtn, statusInfo } from "../theme";
import { fmt, monthKey, monthYearLabel, shortDate, todayISO } from "../lib/format";
import { catInfo } from "../lib/categories";
import { FiltersBar } from "./FiltersBar";
import { MovementsRangeBar } from "./MovementsRangeBar";

const GRID_COLUMNS = "18px 74px 76px 1fr 140px 100px 28px 100px 56px";
// Ancho minimo de la tabla: por debajo de este punto se prefiere scroll
// horizontal (el contenedor padre ya tiene overflow:auto) a comprimir las
// columnas hasta que el texto de las cabeceras se solape o se corte.
const GRID_MIN_WIDTH = 760;

export function TransactionsView({
  title,
  monthIncome,
  monthExpense,
  showFilters,
  setShowFilters,
  filters,
  setFilters,
  categories,
  onSaveFilter,
  showMovementsRange,
  setShowMovementsRange,
  onApplyMovementsRange,
  viewRangeIsDefault,
  viewRangeLabel,
  onResetMovementsRange,
  filteredTx,
  selectedIds,
  onShiftSelect,
  resultingBalance,
  onEdit,
  onRemove,
  onCycleStatus,
  onToggleLink,
  sortBy,
  onSort,
  dateSortEnabled,
  onReorderSameDay,
  onAdd,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onImport,
  onClearSelection,
  onDuplicateSelected,
  onBulkEditSelected,
  onDeleteSelected,
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
  onSaveFilter: (name: string) => void;
  showMovementsRange: boolean;
  setShowMovementsRange: (fn: (s: boolean) => boolean) => void;
  onApplyMovementsRange: (from: string, to: string) => void;
  viewRangeIsDefault: boolean;
  viewRangeLabel: string;
  onResetMovementsRange: () => void;
  filteredTx: Transaction[];
  selectedIds: Set<ID>;
  onShiftSelect: (id: ID) => void;
  resultingBalance: (t: Transaction) => number;
  onEdit: (t: Transaction) => void;
  onRemove: (t: Transaction) => void;
  onCycleStatus: (t: Transaction) => void;
  onToggleLink: (t: Transaction) => void;
  sortBy: SortState | null;
  onSort: (column: SortColumn) => void;
  dateSortEnabled: boolean;
  onReorderSameDay: (draggedId: ID, targetId: ID) => void;
  onAdd: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onImport: () => void;
  onClearSelection: () => void;
  onDuplicateSelected: () => void;
  onBulkEditSelected: () => void;
  onDeleteSelected: () => void;
  footerLabel: string;
  footerAmount: number;
  chart?: ReactNode;
}) {
  const [draggedTxId, setDraggedTxId] = useState<ID | null>(null);
  const [dragOverTxId, setDragOverTxId] = useState<ID | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  function toggleMonthCollapse(key: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Reordenar movimientos del mismo dia por arrastre: seguimiento manual del
  // raton (igual que las cuentas del sidebar), en vez de HTML5 drag-and-drop
  // nativo, por la misma fiabilidad bajo WebKitGTK.
  useEffect(() => {
    if (!draggedTxId) return;
    const draggedDate = filteredTx.find((t) => t.id === draggedTxId)?.date;
    function onMove(e: MouseEvent) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el?.closest("[data-tx-id]") as HTMLElement | null;
      const rowId = row?.dataset.txId;
      const rowDate = row?.dataset.txDate;
      if (rowId && rowId !== draggedTxId && rowDate === draggedDate) {
        setDragOverTxId(rowId);
      } else {
        setDragOverTxId(null);
      }
    }
    function onUp() {
      if (dragOverTxId && draggedTxId && dragOverTxId !== draggedTxId) {
        onReorderSameDay(draggedTxId, dragOverTxId);
      }
      setDraggedTxId(null);
      setDragOverTxId(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedTxId, dragOverTxId]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid " + T.border, gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 3, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingUp size={12} /> <span className="amount">{fmt(monthIncome)}</span>
            </span>
            <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingDown size={12} /> <span className="amount">{fmt(monthExpense)}</span>
            </span>
            <span style={{ fontSize: 11, color: T.textFaint }}>
              {viewRangeIsDefault ? "Semana en curso" : viewRangeLabel}
              {!viewRangeIsDefault && (
                <button onClick={onResetMovementsRange} style={{ marginLeft: 6, background: "none", border: "none", color: T.accent, fontSize: 11, fontWeight: 600, padding: 0 }}>
                  Ver semana actual
                </button>
              )}
            </span>
          </div>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onSave} title="Guardar documento" style={{ ...smallBtn(false), padding: "7px 9px" }}>
            <Save size={12} />
          </button>
          <button onClick={onUndo} disabled={!canUndo} title="Deshacer" style={{ ...smallBtn(false), padding: "7px 9px", opacity: canUndo ? 1 : 0.4, cursor: canUndo ? "pointer" : "default" }}>
            <Undo2 size={12} />
          </button>
          <button onClick={onRedo} disabled={!canRedo} title="Rehacer" style={{ ...smallBtn(false), padding: "7px 9px", opacity: canRedo ? 1 : 0.4, cursor: canRedo ? "pointer" : "default" }}>
            <Redo2 size={12} />
          </button>
          <button onClick={() => setShowFilters((s) => !s)} style={smallBtn(showFilters)}>
            <SlidersHorizontal size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            Filtros
          </button>
          <button onClick={() => setShowMovementsRange((s) => !s)} style={smallBtn(showMovementsRange)}>
            <CalendarRange size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            Movimientos
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
        <div className="no-print">
          <FiltersBar filters={filters} setFilters={setFilters} categories={categories} onSaveFilter={onSaveFilter} />
        </div>
      )}
      {showMovementsRange && (
        <div className="no-print">
          <MovementsRangeBar onApply={onApplyMovementsRange} />
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", background: "#EAF1FC", borderBottom: "1px solid " + T.border }}>
          <span style={{ fontSize: 12.5, color: T.accent, fontWeight: 600 }}>
            {selectedIds.size} seleccionado{selectedIds.size === 1 ? "" : "s"}
          </span>
          <button onClick={onClearSelection} style={smallBtn(false)}>
            Borrar
          </button>
          <button onClick={onDuplicateSelected} style={smallBtn(false)}>
            Duplicar
          </button>
          <button onClick={onBulkEditSelected} style={smallBtn(false)}>
            Editar
          </button>
          <button onClick={onDeleteSelected} style={{ ...smallBtn(false), color: T.expense, borderColor: T.expense }}>
            Eliminar
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, minWidth: GRID_MIN_WIDTH, padding: "7px 20px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0 }}>
          <span />
          <SortableHeader label="Fecha" column="date" sortBy={sortBy} onSort={onSort} />
          <SortableHeader label="Estado" column="status" sortBy={sortBy} onSort={onSort} align="center" />
          <SortableHeader label="Descripcion" column="name" sortBy={sortBy} onSort={onSort} />
          <SortableHeader label="Comentario" column="comment" sortBy={sortBy} onSort={onSort} />
          <SortableHeader label="Importe" column="amount" sortBy={sortBy} onSort={onSort} align="right" />
          <span />
          <SortableHeader label="Saldo" column="balance" sortBy={sortBy} onSort={onSort} align="right" />
          <span />
        </div>

        {filteredTx.length === 0 && <div style={{ padding: "28px 20px", color: T.textMuted, fontSize: 13 }}>Sin movimientos que coincidan. Prueba a limpiar los filtros.</div>}

        {(() => {
          const today = todayISO();
          const groups: { key: string; label: string; rows: Transaction[] }[] = [];
          filteredTx.forEach((t) => {
            const key = monthKey(t.date);
            const g = groups.length > 0 ? groups[groups.length - 1] : null;
            if (!g || g.key !== key) groups.push({ key, label: monthYearLabel(t.date), rows: [t] });
            else g.rows.push(t);
          });
          return groups.map((g) => {
            const isCollapsed = collapsedMonths.has(g.key);
            return (
              <div key={g.key}>
                <button
                  onClick={() => toggleMonthCollapse(g.key)}
                  style={{ width: "100%", minWidth: GRID_MIN_WIDTH, display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: T.bgElevated, border: "none", borderBottom: "1px solid " + T.borderSoft, cursor: "pointer", textAlign: "left" }}
                >
                  {isCollapsed ? <ChevronRight size={13} style={{ color: T.textMuted }} /> : <ChevronDown size={13} style={{ color: T.textMuted }} />}
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{g.label}</span>
                  <span style={{ fontSize: 11, color: T.textFaint }}>({g.rows.length})</span>
                </button>
                {!isCollapsed &&
                  g.rows.map((t) => {
                    const isTransferOut = t.type === "transfer";
                    const isTransferIn = t.type === "transfer_in";
                    const isTransfer = isTransferOut || isTransferIn;
                    const color = t.type === "income" || isTransferIn ? T.income : T.expense;
                    const info = isTransfer ? { name: "Transferencia", color: T.transfer } : catInfo(categories, t.categoryId, t.subcategoryId, t.subsubcategoryId);
                    const st = statusInfo(t.status);
                    const StIcon = st.icon;
                    const voided = t.status === "anulado";
                    const selected = selectedIds.has(t.id);
                    const isDragging = draggedTxId === t.id;
                    const isDragOver = dragOverTxId === t.id && draggedTxId !== t.id;
                    // Un movimiento "Programado" cuya fecha aun no llego es un plan
                    // futuro, no un hecho: se atenua para distinguirlo de un
                    // movimiento ya vencido (que ya habria pasado a Pendiente).
                    const isFutureScheduled = t.status === "programado" && t.date > today;
                    const balance = resultingBalance(t);
                    return (
                      <div
                        key={t.id}
                        className="accrow"
                        data-tx-id={t.id}
                        data-tx-date={t.date}
                        onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                        onClick={(e) => (e.shiftKey ? onShiftSelect(t.id) : onEdit(t))}
                        style={{
                          display: "grid", gridTemplateColumns: GRID_COLUMNS, minWidth: GRID_MIN_WIDTH, alignItems: "center", padding: "8px 20px", fontSize: 13,
                          borderBottom: "1px solid " + T.borderSoft, opacity: voided ? 0.55 : isDragging ? 0.4 : 1, background: selected ? "#EAF1FC" : "transparent", cursor: "pointer",
                          borderTop: isDragOver ? "2px solid " + T.accent : "2px solid transparent",
                        }}
                      >
                        {dateSortEnabled ? (
                          <GripVertical
                            size={11}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDraggedTxId(t.id);
                            }}
                            style={{ color: T.textFaint, cursor: "grab" }}
                          />
                        ) : (
                          <span />
                        )}
                        <span className="amount" style={{ color: T.textMuted, fontSize: 12 }}>
                          {shortDate(t.date)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onCycleStatus(t); }}
                          title={st.label}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", color: isFutureScheduled ? T.textFaint : st.color, background: "none", border: "none", padding: 2, width: "100%" }}
                        >
                          <StIcon size={15} />
                        </button>
                        <span style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: voided ? "line-through" : "none" }}>
                          <span style={dot(isFutureScheduled ? T.textFaint : info.color, 8)} />
                          {t.name}
                          {isTransferOut ? " -> " + t.toLabel : ""}
                          {isTransferIn ? " <- " + t.fromLabel : ""}
                          {t.recurring && <Repeat size={11} style={{ color: T.textFaint }} />}
                          {isTransfer && <ArrowRightLeft size={12} style={{ color: T.transfer }} />}
                        </span>
                        <span style={{ color: T.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.comment || ""}>
                          {t.comment || ""}
                        </span>
                        <span className="amount" style={{ textAlign: "right", color: isFutureScheduled ? T.textFaint : color, fontWeight: 500 }}>
                          {t.type === "income" || isTransferIn ? "+" : isTransferOut ? "" : "-"}
                          {fmt(Math.abs(t.amount))}
                        </span>
                        <span style={{ display: "flex", justifyContent: "center" }}>
                          {isTransfer && (
                            <button
                              onClick={(e) => { e.stopPropagation(); if (t.linked) onToggleLink(t); }}
                              title={t.linked ? "Vinculada — clic para desvincular" : "Desvinculada: se edita de forma independiente"}
                              style={{ background: "none", border: "none", color: t.linked ? T.textFaint : T.expense, padding: 2, cursor: t.linked ? "pointer" : "default", display: "flex" }}
                            >
                              {t.linked ? <Link2 size={13} /> : <Link2Off size={13} />}
                            </button>
                          )}
                        </span>
                        <span className="amount" style={{ textAlign: "right", color: isFutureScheduled ? T.textFaint : balance < 0 ? T.expense : T.textMuted, fontSize: 12.5 }}>
                          {fmt(balance)}
                        </span>
                        <span style={{ display: "flex", gap: 4, justifySelf: "end" }}>
                          <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Editar">
                            <Pencil size={12} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onRemove(t); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Eliminar">
                            <Trash2 size={12} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
              </div>
            );
          });
        })()}
      </div>

      <div className="no-print">{chart}</div>

      <div style={{ borderTop: "1px solid " + T.border, padding: "8px 20px", background: T.bgElevated, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{footerLabel}</span>
        <span className="amount" style={{ fontSize: 14, fontWeight: 700 }}>
          {fmt(footerAmount)}
        </span>
      </div>
    </>
  );
}

function SortableHeader({
  label,
  column,
  sortBy,
  onSort,
  align,
}: {
  label: string;
  column: SortColumn;
  sortBy: SortState | null;
  onSort: (column: SortColumn) => void;
  align?: "left" | "center" | "right";
}) {
  const active = sortBy?.column === column;
  return (
    <button
      onClick={() => onSort(column)}
      style={{
        display: "flex", alignItems: "center", gap: 3, justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
        background: "none", border: "none", padding: 0, margin: 0, font: "inherit", color: active ? T.text : "inherit", textTransform: "inherit", letterSpacing: "inherit", cursor: "pointer",
      }}
    >
      {label}
      {active && (sortBy!.dir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
    </button>
  );
}
