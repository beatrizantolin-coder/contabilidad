import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, CalendarDays, ChevronDown, ChevronRight, Download, Eraser, Eye, GripVertical, Link2, Link2Off, Pencil, Plus, Redo2, Repeat, Search, SlidersHorizontal, Trash2, TrendingDown, TrendingUp, Undo2, Upload, type LucideIcon } from "lucide-react";
import type { Category, Filters, ID, SortColumn, SortState, Transaction } from "../types";
import { T, dot, inputStyle, smallBtn, statusInfo } from "../theme";
import { endOfCurrentMonthISO, fmt, shortDate, startOfCurrentMonthISO, todayISO } from "../lib/format";
import { catInfo } from "../lib/categories";
import { FiltersBar } from "./FiltersBar";
import { MovementsRangeBar } from "./MovementsRangeBar";
import { KindBadge } from "./KindBadge";

/** Columnas opcionales que el usuario puede mostrar/ocultar desde "Ver columnas". */
type VisibleCols = { cuenta: boolean; tipo: boolean; estado: boolean; comentario: boolean };

function buildGridColumns(v: VisibleCols): string {
  return [
    "18px",
    "74px",
    v.cuenta ? "110px" : null,
    v.tipo ? "50px" : null,
    v.estado ? "76px" : null,
    "1fr",
    v.comentario ? "140px" : null,
    "100px",
    "28px",
    "100px",
    "56px",
  ]
    .filter((x): x is string => x !== null)
    .join(" ");
}

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
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onImport,
  accountName,
  rowZoom,
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
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onImport: () => void;
  accountName: (id: ID) => string;
  /** Zoom de fila de la barra de estado global: escala el alto de fila y el tamaño de fuente de la tabla. */
  rowZoom: number;
}) {
  const [draggedTxId, setDraggedTxId] = useState<ID | null>(null);
  const [dragOverTxId, setDragOverTxId] = useState<ID | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<VisibleCols>({ cuenta: false, tipo: false, estado: true, comentario: true });
  const [showColMenu, setShowColMenu] = useState(false);
  const gridColumns = useMemo(() => buildGridColumns(visibleCols), [visibleCols]);

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
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          {TitleIcon && <TitleIcon size={17} style={{ color: T.accent }} />}
          {title}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: T.textMuted }}>Movimientos recientes:</span>
          <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingUp size={13} /> <span className="amount">{fmt(monthIncome)}</span>
          </span>
          <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingDown size={13} /> <span className="amount">{fmt(monthExpense)}</span>
          </span>
          <span style={{ fontSize: 12, color: T.textFaint }}>
            {shortDate(startOfCurrentMonthISO())} - {shortDate(endOfCurrentMonthISO())}
          </span>
        </div>
        {!isEmptyGroupView && (
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
                <Eraser size={13} />
              </button>
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowColMenu((s) => !s)} style={smallBtn(showColMenu)} aria-label="Ver columnas" title="Ver columnas">
                  <Eye size={13} />
                </button>
                {showColMenu && (
                  <>
                    <div onClick={() => setShowColMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                    <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,0.1)", zIndex: 41, minWidth: 150, padding: 6 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", fontSize: 12.5, cursor: "pointer" }}>
                        <input type="checkbox" checked={visibleCols.cuenta} onChange={(e) => { const checked = e.target.checked; setVisibleCols((c) => ({ ...c, cuenta: checked })); }} /> Cuenta
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", fontSize: 12.5, cursor: "pointer" }}>
                        <input type="checkbox" checked={visibleCols.tipo} onChange={(e) => { const checked = e.target.checked; setVisibleCols((c) => ({ ...c, tipo: checked })); }} /> Tipo
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", fontSize: 12.5, cursor: "pointer" }}>
                        <input type="checkbox" checked={visibleCols.estado} onChange={(e) => { const checked = e.target.checked; setVisibleCols((c) => ({ ...c, estado: checked })); }} /> Estado
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", fontSize: 12.5, cursor: "pointer" }}>
                        <input type="checkbox" checked={visibleCols.comentario} onChange={(e) => { const checked = e.target.checked; setVisibleCols((c) => ({ ...c, comentario: checked })); }} /> Comentario
                      </label>
                    </div>
                  </>
                )}
              </div>
              <button onClick={onUndo} disabled={!canUndo} title="Deshacer" style={{ ...smallBtn(false), opacity: canUndo ? 1 : 0.4, cursor: canUndo ? "pointer" : "default" }}>
                <Undo2 size={13} />
              </button>
              <button onClick={onRedo} disabled={!canRedo} title="Rehacer" style={{ ...smallBtn(false), opacity: canRedo ? 1 : 0.4, cursor: canRedo ? "pointer" : "default" }}>
                <Redo2 size={13} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setShowMovementsRange((s) => !s);
                    setShowFilters(() => false);
                  }}
                  style={smallBtn(showMovementsRange)}
                >
                  <CalendarDays size={13} />
                  <span className="btn-label">Movimientos</span>
                </button>
                <button
                  onClick={() => {
                    setShowFilters((s) => !s);
                    setShowMovementsRange(() => false);
                  }}
                  style={smallBtn(showFilters)}
                >
                  <SlidersHorizontal size={13} />
                  <span className="btn-label">Filtros</span>
                </button>
                <button onClick={onExport} style={smallBtn(false)}>
                  <Download size={13} />
                  <span className="btn-label">Exportar</span>
                </button>
                <button onClick={onImport} style={smallBtn(false)}>
                  <Upload size={13} />
                  <span className="btn-label">Importar</span>
                </button>
              </div>
              <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "0 13px", height: 30, boxSizing: "border-box", fontSize: 13, fontWeight: 600, marginLeft: 6 }}>
                <Plus size={14} />
                <span className="btn-label">Movimiento</span>
              </button>
            </div>
          </div>
        )}
        {isEmptyGroupView && (
          <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "0 13px", height: 30, boxSizing: "border-box", fontSize: 13, fontWeight: 600, marginTop: 12 }}>
            <Plus size={14} /> Movimiento
          </button>
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

      {isEmptyGroupView ? (
        <div style={{ flex: 1, padding: "28px 20px", color: T.textMuted, fontSize: 13 }}>No hay movimientos que mostrar.</div>
      ) : (
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: gridColumns, minWidth: GRID_MIN_WIDTH, padding: "7px 20px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0 }}>
          <span />
          <SortableHeader label="Fecha" column="date" sortBy={sortBy} onSort={onSort} />
          {visibleCols.cuenta && <span>Cuenta</span>}
          {visibleCols.tipo && <span style={{ textAlign: "center" }}>Tipo</span>}
          {visibleCols.estado && <SortableHeader label="Estado" column="status" sortBy={sortBy} onSort={onSort} align="center" />}
          <SortableHeader label="Descripcion" column="name" sortBy={sortBy} onSort={onSort} />
          {visibleCols.comentario && <SortableHeader label="Comentario" column="comment" sortBy={sortBy} onSort={onSort} />}
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
                          display: "grid", gridTemplateColumns: gridColumns, minWidth: GRID_MIN_WIDTH, alignItems: "center", padding: Math.round(8 * rowZoom) + "px 20px", fontSize: Math.round(13 * rowZoom),
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
                        {visibleCols.cuenta && (
                          <span style={{ color: T.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {accountName(t.accountId)}
                          </span>
                        )}
                        {visibleCols.tipo && (
                          <span style={{ display: "flex", justifyContent: "center" }}>
                            <KindBadge kind={isTransfer ? "transfer" : t.type === "income" ? "income" : "expense"} size={14} />
                          </span>
                        )}
                        {visibleCols.estado && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCycleStatus(t); }}
                            title={st.label}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", color: isFutureScheduled ? T.textFaint : st.color, background: "none", border: "none", padding: 2, width: "100%" }}
                          >
                            <StIcon size={15} />
                          </button>
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: voided ? "line-through" : "none" }}>
                          <span style={dot(isFutureScheduled ? T.textFaint : info.color, 8)} />
                          {t.name}
                          {isTransferOut ? " -> " + t.toLabel : ""}
                          {isTransferIn ? " <- " + t.fromLabel : ""}
                          {t.recurring && <Repeat size={11} style={{ color: T.textFaint }} />}
                          {isTransfer && <ArrowRightLeft size={12} style={{ color: T.transfer }} />}
                        </span>
                        {visibleCols.comentario && (
                          <span style={{ color: T.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.comment || ""}>
                            {t.comment || ""}
                          </span>
                        )}
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
