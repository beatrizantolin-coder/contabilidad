import { useMemo, useRef, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronRight, Copy, Download, Eraser, Pencil, Plus, Repeat, Search, Trash2, Upload } from "lucide-react";
import type { Account, Category, ID } from "../types";
import { isVariableSeries, occurrenceAmount, type ProgramadorRow } from "../lib/recurring";
import { T, dot, inputStyle, smallBtn } from "../theme";
import { fmt, freqLabel, freqPerMonth, monthYearLabel, shortDate } from "../lib/format";
import { catInfo } from "../lib/categories";
import { exportProgramadorCsv } from "../lib/csv";
import { COL_MARGIN, HEADER_FONT, CONTENT_FONT, MONO_FONT, longestWord, measureTextWidth, useAutoColumnWidths, widestTextWidth, type ColDef } from "../lib/columnWidths";
import { Field } from "./Field";
import { KindBadge } from "./KindBadge";

// Icono de accion (editar/duplicar/detener) siempre a ancho fijo, fuera del
// motor de medicion dinamica.
const ACTIONS_WIDTH = 72;

type ProgTypeFilter = "all" | "income" | "expense" | "transfer";
type ProgGroupBy = "none" | "fecha" | "cuenta" | "tipo" | "periodicidad" | "recurrencia";
type ProgSortField = "fecha" | "cuenta" | "tipo" | "periodicidad" | "descripcion" | "recurrencia" | "importe";
interface ProgSort {
  field: ProgSortField | null;
  dir: "asc" | "desc";
}

function SortHead({ field, label, align, sort, onSort }: { field: ProgSortField; label: string; align?: "left" | "right"; sort: ProgSort; onSort: (field: ProgSortField) => void }) {
  const active = sort.field === field;
  return (
    <button
      onClick={() => onSort(field)}
      style={{ background: "none", border: "none", padding: 0, textAlign: align || "left", cursor: "pointer", color: active ? T.text : T.textMuted, fontWeight: active ? 700 : 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5, whiteSpace: "nowrap", width: "100%" }}
    >
      {label}
    </button>
  );
}

export function RecurringView({
  docName,
  programadorRows,
  monthIncome,
  monthExpense,
  monthRangeLabel,
  accounts,
  categories,
  accountName,
  onNewScheduled,
  onOpenRow,
  onRemove,
  onDuplicate,
  onImport,
}: {
  docName: string;
  programadorRows: ProgramadorRow[];
  monthIncome: number;
  monthExpense: number;
  monthRangeLabel: string;
  accounts: Account[];
  categories: Category[];
  accountName: (id: ID) => string;
  onNewScheduled: () => void;
  onOpenRow: (row: ProgramadorRow) => void;
  /** Detiene la serie recurrente completa de esta fila (no solo el movimiento de la fecha ancla). */
  onRemove: (row: ProgramadorRow) => void;
  /** Crea una copia independiente de la serie completa (nuevo id, no vinculada al original). */
  onDuplicate: (row: ProgramadorRow) => void;
  onImport: () => void;
}) {
  const [progSearch, setProgSearch] = useState("");
  const [progAccountFilter, setProgAccountFilter] = useState<Set<ID>>(new Set());
  const [progAccountPopoverOpen, setProgAccountPopoverOpen] = useState(false);
  const [progTypeFilter, setProgTypeFilter] = useState<ProgTypeFilter>("all");
  const [progGroupBy, setProgGroupBy] = useState<ProgGroupBy>("none");
  const [progSort, setProgSort] = useState<ProgSort>({ field: null, dir: "desc" });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function handleSort(field: ProgSortField) {
    setProgSort((s) => (s.field === field ? { field, dir: s.dir === "desc" ? "asc" : "desc" } : { field, dir: "desc" }));
  }
  function clearFilters() {
    setProgSearch("");
    setProgAccountFilter(new Set());
    setProgTypeFilter("all");
    setProgGroupBy("none");
    setProgSort({ field: null, dir: "desc" });
    setCollapsedGroups(new Set());
  }

  function matchesSearch(name: string): boolean {
    return !progSearch.trim() || name.toLowerCase().includes(progSearch.trim().toLowerCase());
  }

  const filteredRows = programadorRows.filter(
    (row) => matchesSearch(row.tx.name) && (progAccountFilter.size === 0 || progAccountFilter.has(row.tx.accountId)) && (progTypeFilter === "all" || row.tx.type === progTypeFilter),
  );

  const tableRef = useRef<HTMLDivElement>(null);
  const progColDefs = useMemo((): ColDef[] => {
    const fechaTexts = programadorRows.map((row) => shortDate(row.date));
    const cuentaTexts = programadorRows.map((row) => accountName(row.tx.accountId));
    const periodicidadTexts = programadorRows.map((row) => (row.tx.recurring ? freqLabel(row.tx.recurring) : ""));
    const importeTexts = programadorRows.map((row) => {
      const amt = row.tx.recurring ? occurrenceAmount(Number(row.tx.amount), row.tx.recurring, row.date) : Number(row.tx.amount);
      return (row.tx.type === "income" ? "+" : "-") + fmt(Math.abs(amt));
    });
    const descLongestWord = programadorRows.reduce((max, row) => {
      const w = longestWord(row.tx.name, CONTENT_FONT);
      return measureTextWidth(w, CONTENT_FONT) > measureTextWidth(max, CONTENT_FONT) ? w : max;
    }, "");
    const descIconsWidth = 8 + 7;

    return [
      { key: "fecha", label: "Fecha", natural: () => Math.max(measureTextWidth("Fecha", HEADER_FONT), widestTextWidth(fechaTexts, MONO_FONT)) + COL_MARGIN },
      { key: "cuenta", label: "Cuenta", natural: () => Math.max(measureTextWidth("Cuenta", HEADER_FONT), widestTextWidth(cuentaTexts, CONTENT_FONT)) + COL_MARGIN, min: () => measureTextWidth("Cuenta", HEADER_FONT) + COL_MARGIN },
      { key: "tipo", label: "Tipo", natural: () => Math.max(measureTextWidth("Tipo", HEADER_FONT), 16) + COL_MARGIN },
      {
        key: "periodicidad", label: "Periodicidad",
        natural: () => Math.max(measureTextWidth("Periodicidad", HEADER_FONT), widestTextWidth(periodicidadTexts, CONTENT_FONT)) + COL_MARGIN,
        min: () => measureTextWidth("Periodicidad", HEADER_FONT) + COL_MARGIN,
      },
      {
        key: "descripcion", label: "Descripcion", grow: true,
        natural: () => Math.max(measureTextWidth("Descripcion", HEADER_FONT), descIconsWidth + measureTextWidth(descLongestWord, CONTENT_FONT)) + COL_MARGIN,
      },
      { key: "recurrencia", label: "Recurrencia", natural: () => Math.max(measureTextWidth("Recurrencia", HEADER_FONT), measureTextWidth("Variable", CONTENT_FONT)) + COL_MARGIN },
      { key: "importe", label: "Importe", natural: () => Math.max(measureTextWidth("Importe", HEADER_FONT), widestTextWidth(importeTexts, MONO_FONT)) + COL_MARGIN },
    ];
  }, [programadorRows, accountName]);
  const progAutoCols = useAutoColumnWidths(progColDefs, tableRef, {}, [programadorRows]);
  function progColWidth(key: string): number {
    return Math.round(progAutoCols.widths[key] ?? 0);
  }
  const gridColumns = ["fecha", "cuenta", "tipo", "periodicidad", "descripcion", "recurrencia", "importe"].map((k) => progColWidth(k) + "px").join(" ") + " " + ACTIONS_WIDTH + "px";
  const tableMinWidth = progAutoCols.scroll ? progAutoCols.totalWidth + ACTIONS_WIDTH : "100%";

  async function handleExport() {
    try {
      await exportProgramadorCsv(docName, filteredRows, accounts);
    } catch (err) {
      console.error("Error exportando programador CSV", err);
    }
  }

  const sorters: Record<ProgSortField, (a: ProgramadorRow, b: ProgramadorRow) => number> = {
    fecha: (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0),
    cuenta: (a, b) => accountName(a.tx.accountId).localeCompare(accountName(b.tx.accountId)) || (a.date < b.date ? -1 : 1),
    tipo: (a, b) => a.tx.type.localeCompare(b.tx.type) || (a.date < b.date ? -1 : 1),
    periodicidad: (a, b) => (a.tx.recurring ? freqPerMonth(a.tx.recurring) : 0) - (b.tx.recurring ? freqPerMonth(b.tx.recurring) : 0),
    descripcion: (a, b) => a.tx.name.localeCompare(b.tx.name),
    recurrencia: (a, b) => Number(isVariableSeries(a.tx.recurring)) - Number(isVariableSeries(b.tx.recurring)),
    importe: (a, b) => Number(a.tx.amount) - Number(b.tx.amount),
  };

  const activeField = progSort.field;
  const dirMul = progSort.dir === "asc" ? 1 : -1;
  const sorted = activeField ? filteredRows.slice().sort((a, b) => dirMul * sorters[activeField](a, b)) : filteredRows.slice().sort(sorters.fecha);

  const groupField: ProgGroupBy | null = progGroupBy !== "none" ? progGroupBy : (activeField as ProgGroupBy | null);
  function groupLabelFor(row: ProgramadorRow): string | null {
    if (groupField === "cuenta") return accountName(row.tx.accountId);
    if (groupField === "tipo") return row.tx.type === "income" ? "Ingresos" : row.tx.type === "expense" ? "Gastos" : "Transferencias";
    if (groupField === "fecha") return monthYearLabel(row.date);
    if (groupField === "periodicidad") return row.tx.recurring ? freqLabel(row.tx.recurring) : "";
    if (groupField === "recurrencia") return isVariableSeries(row.tx.recurring) ? "Variable" : "Fija";
    return null;
  }
  const groups: { label: string | null; rows: ProgramadorRow[] }[] = [];
  if (groupField) {
    sorted.forEach((row) => {
      const label = groupLabelFor(row);
      const g = groups.length > 0 ? groups[groups.length - 1] : null;
      if (!g || g.label !== label) groups.push({ label, rows: [row] });
      else g.rows.push(row);
    });
  } else {
    groups.push({ label: null, rows: sorted });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Repeat size={17} style={{ color: T.accent }} /> Programador
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: T.textMuted }}>Movimientos recurrentes:</span>
          <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowUpCircle size={13} /> <span className="amount">{fmt(monthIncome)}</span>
          </span>
          <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowDownCircle size={13} /> <span className="amount">{fmt(monthExpense)}</span>
          </span>
          <span style={{ fontSize: 12, color: T.textFaint }}>{monthRangeLabel}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="Descripcion">
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: T.textFaint }} />
                <input placeholder="Buscar" value={progSearch} onChange={(e) => setProgSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 28, width: 160 }} />
              </div>
            </Field>
            <Field label="Cuenta">
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setProgAccountPopoverOpen((s) => !s)}
                  style={{ ...inputStyle, width: 150, textAlign: "left", cursor: "pointer", color: progAccountFilter.size === 0 ? T.textFaint : T.text }}
                >
                  {progAccountFilter.size === 0 ? "Todas" : progAccountFilter.size + " seleccionada" + (progAccountFilter.size === 1 ? "" : "s")}
                </button>
                {progAccountPopoverOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, padding: 8, zIndex: 30, minWidth: 190, maxHeight: 240, overflowY: "auto", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}>
                    <button type="button" onClick={() => setProgAccountFilter(new Set())} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 4px", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}>
                      <span style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, border: "2px solid " + (progAccountFilter.size === 0 ? T.accent : T.border), background: progAccountFilter.size === 0 ? T.accent : "#FFFFFF" }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>Todas</span>
                    </button>
                    <div style={{ borderTop: "1px solid " + T.borderSoft, margin: "4px 0" }} />
                    {accounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setProgAccountFilter((prev) => { const next = new Set(prev); if (next.has(a.id)) next.delete(a.id); else next.add(a.id); return next; })}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 4px", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
                      >
                        <span style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, border: "2px solid " + (progAccountFilter.has(a.id) ? T.accent : T.border), background: progAccountFilter.has(a.id) ? T.accent : "#FFFFFF" }} />
                        <span style={{ fontSize: 12.5 }}>{a.name}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => setProgAccountPopoverOpen(false)} style={{ marginTop: 6, width: "100%", background: T.accent, border: "none", borderRadius: 6, padding: "6px 0", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                      Hecho
                    </button>
                  </div>
                )}
              </div>
            </Field>
            <Field label="Tipo">
              <select value={progTypeFilter} onChange={(e) => setProgTypeFilter(e.target.value as ProgTypeFilter)} style={{ ...inputStyle, width: 150 }}>
                <option value="all">Todos los tipos</option>
                <option value="expense">Gastos</option>
                <option value="income">Ingresos</option>
                <option value="transfer">Transferencias</option>
              </select>
            </Field>
            <Field label="Agrupar">
              <select value={progGroupBy} onChange={(e) => setProgGroupBy(e.target.value as ProgGroupBy)} style={{ ...inputStyle, width: 150 }}>
                <option value="none">Ninguna</option>
                <option value="fecha">Fecha</option>
                <option value="cuenta">Cuenta</option>
                <option value="tipo">Tipo</option>
                <option value="periodicidad">Periodicidad</option>
                <option value="recurrencia">Recurrencia</option>
              </select>
            </Field>
            <button onClick={clearFilters} style={smallBtn(false)} aria-label="Limpiar" title="Limpiar">
              <Eraser size={13} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            <button onClick={handleExport} style={smallBtn(false)}>
              <Download size={13} />
              <span className="btn-label">Exportar</span>
            </button>
            <button onClick={onImport} style={smallBtn(false)}>
              <Upload size={13} />
              <span className="btn-label">Importar</span>
            </button>
            <button onClick={onNewScheduled} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "0 13px", height: 30, fontSize: 13, fontWeight: 600, marginLeft: 6 }}>
              <Plus size={14} />
              <span className="btn-label">Nueva operacion</span>
            </button>
          </div>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textFaint, padding: "18px 24px" }}>Sin movimientos recurrentes que coincidan.</div>
      ) : (
        <div ref={tableRef} style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <div style={{ minWidth: tableMinWidth }}>
          <div style={{ display: "grid", gridTemplateColumns: gridColumns, padding: "7px 0", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0, zIndex: 1 }}>
            <span style={{ padding: "0 16px" }}>
              <SortHead field="fecha" label="Fecha" sort={progSort} onSort={handleSort} />
            </span>
            <span style={{ padding: "0 16px" }}>
              <SortHead field="cuenta" label="Cuenta" sort={progSort} onSort={handleSort} />
            </span>
            <span style={{ textAlign: "center", padding: "0 16px" }}>Tipo</span>
            <span style={{ padding: "0 16px" }}>
              <SortHead field="periodicidad" label="Periodicidad" sort={progSort} onSort={handleSort} />
            </span>
            <span style={{ padding: "0 16px" }}>
              <SortHead field="descripcion" label="Descripcion" sort={progSort} onSort={handleSort} />
            </span>
            <span style={{ textAlign: "center", padding: "0 16px" }}>
              <SortHead field="recurrencia" label="Recurrencia" sort={progSort} onSort={handleSort} />
            </span>
            <span style={{ textAlign: "right", padding: "0 16px" }}>
              <SortHead field="importe" label="Importe" align="right" sort={progSort} onSort={handleSort} />
            </span>
            <span />
          </div>

          {groups.map((g, gi) => {
            const gKey = g.label || "g" + gi;
            const gCollapsed = collapsedGroups.has(gKey);
            return (
              <div key={gi}>
                {g.label && (
                  <button
                    onClick={() => setCollapsedGroups((prev) => { const next = new Set(prev); if (next.has(gKey)) next.delete(gKey); else next.add(gKey); return next; })}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "8px 24px 4px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  >
                    {gCollapsed ? <ChevronRight size={12} style={{ color: T.textMuted }} /> : <ChevronDown size={12} style={{ color: T.textMuted }} />}
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>{g.label}</span>
                    <span style={{ fontSize: 10.5, color: T.textFaint }}>({g.rows.length})</span>
                  </button>
                )}
                {!gCollapsed &&
                  g.rows.map((row) => {
                    const t = row.tx;
                    const isTransfer = t.type === "transfer" || t.type === "transfer_in";
                    const info = isTransfer ? { color: T.transfer } : catInfo(categories, t.categoryId, t.subcategoryId, t.subsubcategoryId);
                    const amt = t.recurring ? occurrenceAmount(Number(t.amount), t.recurring, row.date) : Number(t.amount);
                    const realColor = t.type === "income" ? T.income : isTransfer ? T.transfer : T.expense;
                    const variable = isVariableSeries(t.recurring);
                    return (
                      <div
                        key={t.id + "-" + row.date}
                        className="accrow"
                        onClick={() => onOpenRow(row)}
                        style={{ display: "grid", gridTemplateColumns: gridColumns, alignItems: "center", padding: "8px 0", fontSize: 13, borderBottom: "1px solid " + T.borderSoft, cursor: "pointer", opacity: row.real ? 1 : 0.7 }}
                      >
                        <span className="amount" style={{ color: T.textMuted, fontSize: 12, padding: "0 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {shortDate(row.date)}
                        </span>
                        <span style={{ color: T.textMuted, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 16px" }}>{accountName(t.accountId)}</span>
                        <span style={{ display: "flex", justifyContent: "center", padding: "0 16px" }}>
                          <KindBadge kind={isTransfer ? "transfer" : (t.type as "income" | "expense")} size={15} />
                        </span>
                        <span style={{ color: T.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 16px" }}>{t.recurring ? freqLabel(t.recurring) : ""}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 7, color: T.text, overflow: "hidden", padding: "0 16px" }}>
                          <span style={dot(info.color, 8)} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                        </span>
                        <span style={{ textAlign: "center", fontSize: 11.5, color: variable ? T.accent : T.textFaint, fontWeight: variable ? 600 : 400, padding: "0 16px" }}>{variable ? "Variable" : "Fija"}</span>
                        <span className="amount" style={{ textAlign: "right", color: realColor, fontWeight: 500, padding: "0 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.type === "income" ? "+" : "-"}
                          {fmt(Math.abs(amt))}
                        </span>
                        <span style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); onOpenRow(row); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Editar">
                            <Pencil size={12} />
                          </button>
                          {!isTransfer && (
                            <button onClick={(e) => { e.stopPropagation(); onDuplicate(row); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Duplicar">
                              <Copy size={12} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemove(row); }}
                            className="rowbtn"
                            style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }}
                            aria-label="Detener operacion recurrente"
                            title="Detener operacion recurrente"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
