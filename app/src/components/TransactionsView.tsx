import { useEffect, useState } from "react";
import { ArrowRightLeft, CalendarRange, ChevronDown, ChevronRight, Download, Eraser, FolderPlus, GripVertical, LineChart, Link2, Link2Off, Pencil, Plus, Redo2, Repeat, Save, Search, SlidersHorizontal, Trash2, TrendingDown, TrendingUp, Undo2, Upload, type LucideIcon } from "lucide-react";
import type { Category, Filters, ID, SortColumn, SortState, Transaction } from "../types";
import { T, dot, inputStyle, smallBtn, statusInfo } from "../theme";
import { fmt, shortDate, todayISO } from "../lib/format";
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
  titleIcon: TitleIcon,
  isEmptyGroupView,
  monthIncome,
  monthExpense,
  onClearAll,
  showFilters,
  setShowFilters,
  filters,
  setFilters,
  categories,
  onSaveFilter,
  showMovementsRange,
  setShowMovementsRange,
  onApplyMovementsRange,
  filteredTx,
  selectedIds,
  onSelectRow,
  onShiftSelect,
  onToggleSelect,
  resultingBalance,
  onEdit,
  onRemove,
  onCycleStatus,
  onToggleLink,
  sortBy,
  onSort,
  groupKey,
  groupLabel,
  canReorder,
  onReorderWithinGroup,
  onAdd,
  onSave,
  onSaveAs,
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
  onOpenPrevision,
}: {
  title: string;
  /** Icono del tipo de cuenta, mostrado junto al titulo cuando hay un grupo de cuentas seleccionado (Bancos/Ahorro/Tarjetas/Efectivo). */
  titleIcon?: LucideIcon;
  /** true cuando se ha seleccionado un grupo de cuentas entero (Bancos/Ahorro/Tarjetas/Efectivo) y no hay ningun movimiento que mostrar: solo se muestra el encabezado, sin barra de herramientas, filtros ni tabla vacia. */
  isEmptyGroupView: boolean;
  monthIncome: number;
  monthExpense: number;
  onClearAll: () => void;
  showFilters: boolean;
  setShowFilters: (fn: (s: boolean) => boolean) => void;
  filters: Filters;
  setFilters: (fn: (f: Filters) => Filters) => void;
  categories: Category[];
  onSaveFilter: (name: string) => void;
  showMovementsRange: boolean;
  setShowMovementsRange: (fn: (s: boolean) => boolean) => void;
  onApplyMovementsRange: (from: string, to: string) => void;
  filteredTx: Transaction[];
  selectedIds: Set<ID>;
  onSelectRow: (id: ID) => void;
  onShiftSelect: (id: ID) => void;
  onToggleSelect: (id: ID) => void;
  resultingBalance: (t: Transaction) => number;
  onEdit: (t: Transaction) => void;
  onRemove: (t: Transaction) => void;
  onCycleStatus: (t: Transaction) => void;
  onToggleLink: (t: Transaction) => void;
  sortBy: SortState | null;
  onSort: (column: SortColumn) => void;
  /** Clave de agrupacion visual segun la columna de orden activa; null = sin agrupar (p.ej. Importe). */
  groupKey: (t: Transaction) => string | null;
  groupLabel: (t: Transaction) => string;
  canReorder: boolean;
  onReorderWithinGroup: (draggedId: ID, targetId: ID) => void;
  onAdd: () => void;
  onSave: () => void;
  onSaveAs: () => void;
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
  onOpenPrevision: () => void;
}) {
  const [draggedTxId, setDraggedTxId] = useState<ID | null>(null);
  const [dragOverTxId, setDragOverTxId] = useState<ID | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroupCollapse(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Reordenar movimientos dentro del mismo grupo de empate por arrastre:
  // seguimiento manual del raton (igual que las cuentas del sidebar), en vez
  // de HTML5 drag-and-drop nativo, por fiabilidad bajo WebKitGTK.
  useEffect(() => {
    if (!draggedTxId) return;
    const draggedGroup = filteredTx.find((t) => t.id === draggedTxId) ? groupKey(filteredTx.find((t) => t.id === draggedTxId) as Transaction) : null;
    function onMove(e: MouseEvent) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el?.closest("[data-tx-id]") as HTMLElement | null;
      const rowId = row?.dataset.txId;
      const rowGroup = row?.dataset.txGroup ?? "";
      if (rowId && rowId !== draggedTxId && rowGroup === (draggedGroup ?? "")) {
        setDragOverTxId(rowId);
      } else {
        setDragOverTxId(null);
      }
    }
    function onUp() {
      if (dragOverTxId && draggedTxId && dragOverTxId !== draggedTxId) {
        onReorderWithinGroup(draggedTxId, dragOverTxId);
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
          <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            {TitleIcon && <TitleIcon size={17} style={{ color: T.accent }} />}
            {title}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 3, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingUp size={12} /> <span className="amount">{fmt(monthIncome)}</span>
            </span>
            <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingDown size={12} /> <span className="amount">{fmt(monthExpense)}</span>
            </span>
          </div>
        </div>
        {!isEmptyGroupView && (
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: T.textFaint }} />
            <input
              placeholder="Buscar movimientos"
              value={filters.search}
              onChange={(e) => {
                const val = e.target.value;
                setFilters((f) => ({ ...f, search: val }));
              }}
              style={{ ...inputStyle, paddingLeft: 28, width: 170, height: 30, boxSizing: "border-box" }}
            />
          </div>
          <button onClick={onClearAll} style={smallBtn(false)} aria-label="Limpiar" title="Limpiar">
            <Eraser size={13} />Limpiar
          </button>
          <button onClick={onSave} title="Guardar documento" aria-label="Guardar documento" style={smallBtn(false)}>
            <Save size={12} />
          </button>
          <button onClick={onSaveAs} title="Guardar como" aria-label="Guardar como" style={smallBtn(false)}>
            <FolderPlus size={12} />
          </button>
          <button onClick={onUndo} disabled={!canUndo} title="Deshacer" style={{ ...smallBtn(false), opacity: canUndo ? 1 : 0.4, cursor: canUndo ? "pointer" : "default" }}>
            <Undo2 size={12} />
          </button>
          <button onClick={onRedo} disabled={!canRedo} title="Rehacer" style={{ ...smallBtn(false), opacity: canRedo ? 1 : 0.4, cursor: canRedo ? "pointer" : "default" }}>
            <Redo2 size={12} />
          </button>
          <button
            onClick={() => {
              setShowMovementsRange((s) => !s);
              setShowFilters(() => false);
            }}
            style={smallBtn(showMovementsRange)}
          >
            <CalendarRange size={12} />Movimientos
          </button>
          <button
            onClick={() => {
              setShowFilters((s) => !s);
              setShowMovementsRange(() => false);
            }}
            style={smallBtn(showFilters)}
          >
            <SlidersHorizontal size={12} />Filtros
          </button>
          <button onClick={onExport} style={smallBtn(false)}>
            <Download size={12} />Exportar
          </button>
          <button onClick={onImport} style={smallBtn(false)}>
            <Upload size={12} />Importar
          </button>
          <button onClick={onOpenPrevision} title="Previsión de balance" aria-label="Previsión de balance" style={smallBtn(false)}>
            <LineChart size={12} />
          </button>
          <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "0 13px", height: 30, boxSizing: "border-box", fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Movimiento
          </button>
        </div>
        )}
      </div>

      {!isEmptyGroupView && showFilters && (
        <div className="no-print">
          <FiltersBar filters={filters} setFilters={setFilters} categories={categories} onSaveFilter={onSaveFilter} />
        </div>
      )}
      {!isEmptyGroupView && showMovementsRange && (
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

      {isEmptyGroupView ? (
        <div style={{ flex: 1, padding: "28px 20px", color: T.textMuted, fontSize: 13 }}>No hay movimientos que mostrar.</div>
      ) : (
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, minWidth: GRID_MIN_WIDTH, padding: "7px 20px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0 }}>
          <span />
          <SortableHeader label="Fecha" column="date" sortBy={sortBy} onSort={onSort} />
          <SortableHeader label="Estado" column="status" sortBy={sortBy} onSort={onSort} align="center" />
          <SortableHeader label="Descripcion" column="name" sortBy={sortBy} onSort={onSort} />
          <SortableHeader label="Comentario" column="comment" sortBy={sortBy} onSort={onSort} />
          <SortableHeader label="Importe" column="amount" sortBy={sortBy} onSort={onSort} align="right" />
          <span />
          <span style={{ textAlign: "right" }}>Saldo</span>
          <span />
        </div>

        {filteredTx.length === 0 && <div style={{ padding: "28px 20px", color: T.textMuted, fontSize: 13 }}>Sin movimientos que coincidan. Prueba a limpiar los filtros.</div>}

        {(() => {
          const groups: { key: string; label: string; rows: Transaction[] }[] = [];
          filteredTx.forEach((t) => {
            const key = groupKey(t);
            if (key === null) {
              groups.push({ key: "row-" + t.id, label: "", rows: [t] });
              return;
            }
            const g = groups.length > 0 ? groups[groups.length - 1] : null;
            if (!g || g.key !== key) groups.push({ key, label: groupLabel(t), rows: [t] });
            else g.rows.push(t);
          });
          const today = todayISO();
          return groups.map((g) => {
            const isCollapsed = g.label !== "" && collapsedGroups.has(g.key);
            return (
              <div key={g.key}>
                {g.label !== "" && (
                  <button
                    onClick={() => toggleGroupCollapse(g.key)}
                    style={{ width: "100%", minWidth: GRID_MIN_WIDTH, display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: T.bgElevated, border: "none", borderBottom: "1px solid " + T.borderSoft, cursor: "pointer", textAlign: "left" }}
                  >
                    {isCollapsed ? <ChevronRight size={13} style={{ color: T.textMuted }} /> : <ChevronDown size={13} style={{ color: T.textMuted }} />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{g.label}</span>
                    <span style={{ fontSize: 11, color: T.textFaint }}>({g.rows.length})</span>
                  </button>
                )}
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
                        data-tx-group={groupKey(t) ?? ""}
                        onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                        onClick={(e) => {
                          if (e.shiftKey) onShiftSelect(t.id);
                          else if (e.metaKey || e.ctrlKey) onToggleSelect(t.id);
                          else onSelectRow(t.id);
                        }}
                        style={{
                          display: "grid", gridTemplateColumns: GRID_COLUMNS, minWidth: GRID_MIN_WIDTH, alignItems: "center", padding: "8px 20px", fontSize: 13,
                          borderBottom: "1px solid " + T.borderSoft, opacity: voided ? 0.55 : isDragging ? 0.4 : 1, background: selected ? "#EAF1FC" : "transparent", cursor: "pointer",
                          borderTop: isDragOver ? "2px solid " + T.accent : "2px solid transparent",
                        }}
                      >
                        {canReorder ? (
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
                              onClick={(e) => { e.stopPropagation(); onToggleLink(t); }}
                              title={t.linked ? "Vinculada — clic para desvincular" : "Desvinculada — clic para revincular"}
                              style={{ background: "none", border: "none", color: t.linked ? T.textFaint : T.expense, padding: 2, cursor: "pointer", display: "flex" }}
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
      )}

      {!isEmptyGroupView && (
      <div style={{ borderTop: "1px solid " + T.border, padding: "8px 20px", background: T.bgElevated, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{footerLabel}</span>
        <span className="amount" style={{ fontSize: 14, fontWeight: 700 }}>
          {fmt(footerAmount)}
        </span>
      </div>
      )}
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
        background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer",
        textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5,
        color: active ? T.text : T.textMuted, fontWeight: active ? 700 : 600,
      }}
    >
      {label}
    </button>
  );
}
