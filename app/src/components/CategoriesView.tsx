import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Download, Eraser, Pencil, Plus, Search, Tag, Trash2, TrendingDown, TrendingUp, Upload } from "lucide-react";
import type { Budgets, Category, CategoryKind, ID } from "../types";
import { T, dot, inputStyle, smallBtn } from "../theme";
import { fmt } from "../lib/format";
import { subcategoryColor } from "../lib/color";
import { COL_MARGIN, HEADER_FONT, CONTENT_FONT, longestWord, measureTextWidth, useAutoColumnWidths, type ColDef } from "../lib/columnWidths";
import { ColResizeHandle } from "./ColResizeHandle";
import { Field } from "./Field";
import { KindBadge } from "./KindBadge";

export interface CategorySpend {
  id: ID;
  val: number;
}

type CatTypeFilter = CategoryKind | "all";
type CatShowMode = "categories" | "subcategories" | "all";
type CatSortField = "tipo" | "categoria" | "progreso" | "presupuesto";
interface CatSort {
  field: CatSortField | null;
  dir: "asc" | "desc";
}

const TYPE_SORT_ORDER: Record<CategoryKind, number> = { expense: 0, income: 1, transfer: 2 };
// El chevron de expandir/contraer vive en su propia columna de ancho fijo,
// para que el punto de color y el nombre de Categoria queden siempre
// alineados entre filas de categoria y de subcategoria.
const CHEVRON_WIDTH = 21;
const ACTIONS_WIDTH = 76;

/** 0-70% verde, 71-90% naranja, 91-100%+ rojo; sin presupuesto asignado, null (usa el color propio). */
function budgetColorForRatio(ratio: number): string {
  if (ratio <= 70) return T.income;
  if (ratio <= 90) return "#D9822B";
  return T.expense;
}

function SortHead({ field, label, sort, onSort }: { field: CatSortField; label: string; sort: CatSort; onSort: (field: CatSortField) => void }) {
  const active = sort.field === field;
  return (
    <button
      onClick={() => onSort(field)}
      style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5, color: active ? T.text : T.textMuted, fontWeight: active ? 700 : 600 }}
    >
      {label}
    </button>
  );
}

export function CategoriesView({
  categories,
  budgets,
  spendByCategory,
  spendBySubcategory,
  maxSpend,
  monthIncome,
  monthExpense,
  onNewCategory,
  removeCategory,
  onOpenCategory,
  removeSubcategory,
  onDuplicateCategory,
  onDuplicateSubcategory,
  newCategoryTrigger,
  onExport,
  onImport,
}: {
  categories: Category[];
  budgets: Budgets;
  spendByCategory: CategorySpend[];
  spendBySubcategory: CategorySpend[];
  maxSpend: number;
  monthIncome: number;
  monthExpense: number;
  onNewCategory: (kind: CategoryKind) => void;
  removeCategory: (id: ID) => void;
  onOpenCategory: (id: ID) => void;
  removeSubcategory: (catId: ID, subId: ID) => void;
  /** Copia independiente de la categoria (y sus subcategorias) con " (copia)" en el nombre. */
  onDuplicateCategory: (id: ID) => void;
  /** Copia independiente de la subcategoria con " (copia)" en el nombre. */
  onDuplicateSubcategory: (catId: ID, subId: ID) => void;
  /** Se incrementa desde Documento > Nueva Categoria (menú nativo) para abrir el panel lateral. */
  newCategoryTrigger: number;
  onExport: () => void;
  onImport: () => void;
}) {
  const [catSearch, setCatSearch] = useState("");
  const [catTypeFilter, setCatTypeFilter] = useState<CatTypeFilter>("all");
  const [catShowMode, setCatShowMode] = useState<CatShowMode>("categories");
  const [catSort, setCatSort] = useState<CatSort>({ field: null, dir: "asc" });
  const [expandedCategories, setExpandedCategories] = useState<Set<ID>>(new Set());
  // Anchos de columna fijados a mano: prevalecen sobre el calculo automatico
  // hasta "Limpiar" o reiniciar la app (no se guardan en disco).
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  useEffect(() => {
    if (newCategoryTrigger > 0) onNewCategory(catTypeFilter !== "all" ? catTypeFilter : "expense");
    // eslint-disable-next-line -- solo debe reaccionar al trigger, no a catTypeFilter/onNewCategory
  }, [newCategoryTrigger]);

  function toggleExpanded(id: ID) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function handleSort(field: CatSortField) {
    setCatSort((s) => ({ field, dir: s.field === field && s.dir === "asc" ? "desc" : "asc" }));
  }
  function clearFilters() {
    setCatSearch("");
    setCatTypeFilter("all");
    setCatShowMode("categories");
    setCatSort({ field: null, dir: "asc" });
    setColWidths({});
  }

  function matchesSearch(name: string): boolean {
    return !catSearch.trim() || name.toLowerCase().includes(catSearch.trim().toLowerCase());
  }
  function matchesType(k: CategoryKind): boolean {
    return catTypeFilter === "all" || k === catTypeFilter;
  }

  function catRowData(cat: Category) {
    const val = spendByCategory.find((b) => b.id === cat.id)?.val ?? 0;
    const limit = budgets[cat.id];
    const pct = limit ? Math.min(100, (val / limit) * 100) : Math.min(100, (val / maxSpend) * 100);
    const ratio = limit ? (val / limit) * 100 : 0;
    return { val, limit, pct, ratio };
  }
  function subRowData(sub: { id: ID }) {
    const val = spendBySubcategory.find((b) => b.id === sub.id)?.val ?? 0;
    const limit = budgets[sub.id];
    const pct = limit ? Math.min(100, (val / limit) * 100) : Math.min(100, (val / maxSpend) * 100);
    const ratio = limit ? (val / limit) * 100 : 0;
    return { val, limit, pct, ratio };
  }

  let visibleCategories = categories.filter((c) => matchesType(c.kind));
  if (catShowMode !== "subcategories") {
    visibleCategories = visibleCategories.filter((c) => matchesSearch(c.name) || c.subcategories.some((s) => matchesSearch(s.name)));
  }
  if (catSort.field) {
    const field = catSort.field;
    const dirMul = catSort.dir === "asc" ? 1 : -1;
    visibleCategories = visibleCategories.slice().sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (field === "tipo") { av = TYPE_SORT_ORDER[a.kind]; bv = TYPE_SORT_ORDER[b.kind]; }
      else if (field === "categoria") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (field === "progreso") { av = catRowData(a).ratio; bv = catRowData(b).ratio; }
      else { av = budgets[a.id] || 0; bv = budgets[b.id] || 0; }
      if (av < bv) return -1 * dirMul;
      if (av > bv) return 1 * dirMul;
      return 0;
    });
  }

  let flatSubcats: { cat: Category; sub: Category["subcategories"][number] }[] = [];
  if (catShowMode === "subcategories") {
    categories.filter((c) => matchesType(c.kind)).forEach((cat) => {
      cat.subcategories.filter((s) => matchesSearch(s.name)).forEach((sub) => flatSubcats.push({ cat, sub }));
    });
    if (catSort.field) {
      const field = catSort.field;
      const dirMul = catSort.dir === "asc" ? 1 : -1;
      flatSubcats = flatSubcats.slice().sort((A, B) => {
        let av: number | string;
        let bv: number | string;
        if (field === "tipo") { av = TYPE_SORT_ORDER[A.cat.kind]; bv = TYPE_SORT_ORDER[B.cat.kind]; }
        else if (field === "categoria") { av = A.sub.name.toLowerCase(); bv = B.sub.name.toLowerCase(); }
        else if (field === "progreso") { av = subRowData(A.sub).ratio; bv = subRowData(B.sub).ratio; }
        else { av = budgets[A.sub.id] || 0; bv = budgets[B.sub.id] || 0; }
        if (av < bv) return -1 * dirMul;
        if (av > bv) return 1 * dirMul;
        return 0;
      });
    }
  }

  const tableRef = useRef<HTMLDivElement>(null);
  const catColDefs = useMemo((): ColDef[] => {
    const nameTexts: string[] = [];
    const presupuestoTexts: string[] = [];
    function pushText(name: string, val: number, limit: number | undefined) {
      nameTexts.push(name);
      presupuestoTexts.push(limit ? fmt(val) + " / " + fmt(limit) : "Sin asignar");
    }
    if (catShowMode === "subcategories") {
      flatSubcats.forEach(({ sub }) => {
        const { val, limit } = subRowData(sub);
        pushText(sub.name, val, limit);
      });
    } else {
      visibleCategories.forEach((cat) => {
        const { val, limit } = catRowData(cat);
        pushText(cat.name, val, limit);
        if (catShowMode === "all") {
          cat.subcategories.forEach((sub) => {
            const { val: subVal, limit: subLimit } = subRowData(sub);
            pushText(sub.name, subVal, subLimit);
          });
        }
      });
    }
    const catLongestWord = nameTexts.reduce((max, s) => {
      const w = longestWord(s, CONTENT_FONT);
      return measureTextWidth(w, CONTENT_FONT) > measureTextWidth(max, CONTENT_FONT) ? w : max;
    }, "");
    const catDotIconsWidth = 12 + 7;
    const presupuestoWidest = presupuestoTexts.reduce((mx, s) => Math.max(mx, measureTextWidth(s, CONTENT_FONT)), 0);

    return [
      { key: "tipo", label: "Tipo", natural: () => Math.max(measureTextWidth("Tipo", HEADER_FONT), 16) + COL_MARGIN },
      {
        key: "categoria", label: "Categoria", grow: true,
        natural: () => Math.max(measureTextWidth("Categoria", HEADER_FONT), catDotIconsWidth + measureTextWidth(catLongestWord, CONTENT_FONT)) + COL_MARGIN,
      },
      {
        key: "progreso", label: "Progreso", grow: true,
        natural: () => Math.max(measureTextWidth("Progreso", HEADER_FONT), 100) + COL_MARGIN,
        min: () => Math.max(measureTextWidth("Progreso", HEADER_FONT), 60) + COL_MARGIN,
      },
      { key: "presupuesto", label: "Presupuesto", natural: () => Math.max(measureTextWidth("Presupuesto", HEADER_FONT), presupuestoWidest) + COL_MARGIN },
    ];
  }, [visibleCategories, flatSubcats, catShowMode]);
  const catAutoCols = useAutoColumnWidths(catColDefs, tableRef, colWidths, [visibleCategories, flatSubcats, catShowMode, colWidths]);
  function catColWidth(key: string): number {
    return Math.round(catAutoCols.widths[key] ?? 0);
  }
  const gridColumns = [catColWidth("tipo") + "px", CHEVRON_WIDTH + "px", catColWidth("categoria") + "px", catColWidth("progreso") + "px", catColWidth("presupuesto") + "px", ACTIONS_WIDTH + "px"].join(" ");
  const tableMinWidth = catAutoCols.scroll ? catAutoCols.totalWidth + CHEVRON_WIDTH + ACTIONS_WIDTH : "100%";

  function renderCatRow(cat: Category) {
    const { val, limit, pct, ratio } = catRowData(cat);
    const budgetColor = !limit ? null : budgetColorForRatio(ratio);
    const barColor = !limit ? cat.color : budgetColor!;
    const hasSubs = cat.subcategories.length > 0;
    const expanded = expandedCategories.has(cat.id);
    return (
      <div key={cat.id}>
        <div
          className="accrow"
          onClick={() => onOpenCategory(cat.id)}
          style={{ display: "grid", gridTemplateColumns: gridColumns, alignItems: "center", padding: "9px 0", cursor: "pointer", borderBottom: "1px solid " + T.borderSoft }}
        >
          <span style={{ display: "flex", justifyContent: "center", padding: "0 16px" }}>
            <KindBadge kind={cat.kind} size={16} />
          </span>
          <span style={{ display: "flex", alignItems: "center" }}>
            {hasSubs ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpanded(cat.id); }}
                style={{ background: "none", border: "none", color: T.textMuted, padding: 0, flexShrink: 0 }}
              >
                {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : (
              <span style={{ width: 13, flexShrink: 0 }} />
            )}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", padding: "0 16px" }}>
            <span style={dot(cat.color, 12)} />
            <span style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
          </span>
          <div style={{ padding: "0 16px" }}>
            <div style={{ height: 6, background: T.borderSoft, borderRadius: 3 }}>
              <div style={{ height: 6, borderRadius: 3, width: pct + "%", background: barColor }} />
            </div>
          </div>
          <span className="amount" style={{ fontSize: 13, textAlign: "right", padding: "0 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ color: T.textMuted }}>{fmt(val)}</span>
            {limit ? (
              <>
                {" "}<span style={{ color: T.textMuted }}>/</span> <span style={{ fontWeight: 700, color: budgetColor! }}>{fmt(limit)}</span>
              </>
            ) : (
              <span style={{ color: T.textFaint, fontWeight: 400 }}> / Sin asignar</span>
            )}
          </span>
          <span style={{ display: "flex", justifyContent: "center", gap: 4, padding: "0 16px" }}>
            <button onClick={(e) => { e.stopPropagation(); onOpenCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Editar " + cat.name}>
              <Pencil size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDuplicateCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Duplicar " + cat.name}>
              <Copy size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); removeCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Eliminar " + cat.name}>
              <Trash2 size={12} />
            </button>
          </span>
        </div>
        {hasSubs && expanded && cat.subcategories.filter((s) => matchesSearch(s.name) || matchesSearch(cat.name)).map((sub) => renderSubRow(cat, sub))}
      </div>
    );
  }

  function renderSubRow(cat: Category, sub: Category["subcategories"][number]) {
    const { val, limit, pct, ratio } = subRowData(sub);
    const budgetColor = !limit ? null : budgetColorForRatio(ratio);
    const barColor = !limit ? subcategoryColor(cat.color) : budgetColor!;
    return (
      <div
        key={sub.id}
        onClick={() => onOpenCategory(cat.id)}
        className="accrow"
        style={{ display: "grid", gridTemplateColumns: gridColumns, alignItems: "center", padding: "7px 0", cursor: "pointer", borderBottom: "1px solid " + T.borderSoft, background: T.bgElevated }}
      >
        <span style={{ display: "flex", justifyContent: "center", padding: "0 16px" }}>
          <KindBadge kind={cat.kind} size={14} />
        </span>
        <span />
        <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", padding: "0 16px 0 37px" }}>
          <span style={dot(subcategoryColor(cat.color), 8)} />
          <span style={{ fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.name}</span>
          {catShowMode === "subcategories" && <span style={{ fontSize: 10.5, color: T.textFaint }}>({cat.name})</span>}
        </span>
        <div style={{ padding: "0 16px" }}>
          <div style={{ height: 4, background: T.borderSoft, borderRadius: 2 }}>
            <div style={{ height: 4, borderRadius: 2, width: pct + "%", background: barColor }} />
          </div>
        </div>
        <span className="amount" style={{ fontSize: 11, textAlign: "right", padding: "0 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ color: T.textMuted }}>{fmt(val)}</span>
          {limit ? (
            <>
              {" "}<span style={{ color: T.textMuted }}>/</span> <span style={{ fontWeight: 700, color: budgetColor! }}>{fmt(limit)}</span>
            </>
          ) : (
            <span style={{ color: T.textFaint, fontWeight: 400 }}> / Sin asignar</span>
          )}
        </span>
        <span style={{ display: "flex", justifyContent: "center", gap: 4, padding: "0 16px" }}>
          <button onClick={(e) => { e.stopPropagation(); onOpenCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Editar " + sub.name}>
            <Pencil size={10} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicateSubcategory(cat.id, sub.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Duplicar " + sub.name}>
            <Copy size={10} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); removeSubcategory(cat.id, sub.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Eliminar " + sub.name}>
            <Trash2 size={11} />
          </button>
        </span>
      </div>
    );
  }

  const isEmpty = catShowMode === "subcategories" ? flatSubcats.length === 0 : visibleCategories.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Tag size={17} style={{ color: T.accent }} /> Categorias
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingUp size={13} /> <span className="amount">{fmt(monthIncome)}</span>
          </span>
          <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingDown size={13} /> <span className="amount">{fmt(monthExpense)}</span>
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="Descripcion">
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: T.textFaint }} />
                <input placeholder="Buscar" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 28, width: 170 }} />
              </div>
            </Field>
            <Field label="Tipo">
              <select value={catTypeFilter} onChange={(e) => setCatTypeFilter(e.target.value as CatTypeFilter)} style={{ ...inputStyle, width: 150 }}>
                <option value="all">Todos los tipos</option>
                <option value="expense">Gastos</option>
                <option value="income">Ingresos</option>
                <option value="transfer">Transferencias</option>
              </select>
            </Field>
            <Field label="Mostrar">
              <select value={catShowMode} onChange={(e) => setCatShowMode(e.target.value as CatShowMode)} style={{ ...inputStyle, width: 150 }}>
                <option value="categories">Categorias</option>
                <option value="subcategories">Subcategorias</option>
                <option value="all">Todas</option>
              </select>
            </Field>
            <button onClick={clearFilters} style={smallBtn(false)} aria-label="Limpiar" title="Limpiar">
              <Eraser size={13} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            <button onClick={onExport} style={smallBtn(false)}>
              <Download size={13} />
              <span className="btn-label">Exportar</span>
            </button>
            <button onClick={onImport} style={smallBtn(false)}>
              <Upload size={13} />
              <span className="btn-label">Importar</span>
            </button>
            <button onClick={() => onNewCategory(catTypeFilter !== "all" ? catTypeFilter : "expense")} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "0 13px", height: 30, fontSize: 13, fontWeight: 600, marginLeft: 6 }}>
              <Plus size={14} />
              <span className="btn-label">Nueva categoria</span>
            </button>
          </div>
        </div>
      </div>

      <div ref={tableRef} style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <div style={{ minWidth: tableMinWidth }}>
        <div style={{ display: "grid", gridTemplateColumns: gridColumns, padding: "7px 0", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0 }}>
          <span style={{ padding: "0 16px", position: "relative" }}>
            <SortHead field="tipo" label="Tipo" sort={catSort} onSort={handleSort} />
            <ColResizeHandle colKey="tipo" defaultWidth={catAutoCols.widths.tipo ?? 0} colWidths={colWidths} setColWidths={setColWidths} />
          </span>
          <span />
          <span style={{ padding: "0 16px", position: "relative" }}>
            <SortHead field="categoria" label="Categoria" sort={catSort} onSort={handleSort} />
            <ColResizeHandle colKey="categoria" defaultWidth={catAutoCols.widths.categoria ?? 0} colWidths={colWidths} setColWidths={setColWidths} />
          </span>
          <span style={{ padding: "0 16px", position: "relative" }}>
            <SortHead field="progreso" label="Progreso" sort={catSort} onSort={handleSort} />
            <ColResizeHandle colKey="progreso" defaultWidth={catAutoCols.widths.progreso ?? 0} colWidths={colWidths} setColWidths={setColWidths} />
          </span>
          <span style={{ textAlign: "right", padding: "0 16px" }}>
            <SortHead field="presupuesto" label="Presupuesto" sort={catSort} onSort={handleSort} />
          </span>
          <span />
        </div>
        {isEmpty && <div style={{ fontSize: 13, color: T.textFaint, padding: "18px 24px" }}>Sin categorias que coincidan.</div>}
        {catShowMode === "subcategories" ? flatSubcats.map(({ cat, sub }) => renderSubRow(cat, sub)) : visibleCategories.map((cat) => renderCatRow(cat))}
        </div>
      </div>
    </div>
  );
}
