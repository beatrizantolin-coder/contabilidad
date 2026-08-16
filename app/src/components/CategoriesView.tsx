import { useEffect, useState } from "react";
import { ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronRight, Download, Eraser, Pencil, Plus, Search, Tag, Trash2, TrendingDown, TrendingUp, Upload } from "lucide-react";
import type { Budgets, Category, CategoryKind, ID } from "../types";
import { T, dot, inputStyle, smallBtn } from "../theme";
import { fmt } from "../lib/format";
import { subcategoryColor } from "../lib/color";
import { Field } from "./Field";

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
const GRID_TEMPLATE = "36px 190px 1fr 150px 22px 22px";

/** 0-70% verde, 71-90% naranja, 91-100%+ rojo; sin presupuesto asignado, null (usa el color propio). */
function budgetColorForRatio(ratio: number): string {
  if (ratio <= 70) return T.income;
  if (ratio <= 90) return "#D9822B";
  return T.expense;
}

function KindBadge({ kind, size }: { kind: CategoryKind; size: number }) {
  if (kind === "income") return <ArrowUpCircle size={size} style={{ color: T.income, flexShrink: 0 }} />;
  if (kind === "transfer")
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", border: "1.5px solid " + T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <ArrowLeftRight size={size - 6} style={{ color: T.accent }} />
      </div>
    );
  return <ArrowDownCircle size={size} style={{ color: T.expense, flexShrink: 0 }} />;
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
  docName,
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
  newCategoryTrigger,
  onExport,
  onImport,
  showPrevision,
  onTogglePrevision,
}: {
  docName: string;
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
  /** Se incrementa desde Documento > Nueva Categoria (menú nativo) para abrir el panel lateral. */
  newCategoryTrigger: number;
  onExport: () => void;
  onImport: () => void;
  showPrevision: boolean;
  onTogglePrevision: () => void;
}) {
  const [catSearch, setCatSearch] = useState("");
  const [catTypeFilter, setCatTypeFilter] = useState<CatTypeFilter>("all");
  const [catShowMode, setCatShowMode] = useState<CatShowMode>("categories");
  const [catSort, setCatSort] = useState<CatSort>({ field: null, dir: "asc" });
  const [expandedCategories, setExpandedCategories] = useState<Set<ID>>(new Set());

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
          style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, alignItems: "center", columnGap: 10, padding: "9px 24px", cursor: "pointer", borderBottom: "1px solid " + T.borderSoft }}
        >
          <span style={{ display: "flex", justifyContent: "center" }}>
            <KindBadge kind={cat.kind} size={16} />
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
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
            <span style={dot(cat.color, 12)} />
            <span style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
          </span>
          <div style={{ height: 6, background: T.borderSoft, borderRadius: 3 }}>
            <div style={{ height: 6, borderRadius: 3, width: pct + "%", background: barColor }} />
          </div>
          <span className="amount" style={{ fontSize: 13, textAlign: "right" }}>
            <span style={{ color: T.textMuted }}>{fmt(val)}</span>
            {limit ? (
              <>
                {" "}<span style={{ color: T.textMuted }}>/</span> <span style={{ fontWeight: 700, color: budgetColor! }}>{fmt(limit)}</span>
              </>
            ) : (
              <span style={{ color: T.textFaint, fontWeight: 400 }}> / Sin asignar</span>
            )}
          </span>
          <button onClick={(e) => { e.stopPropagation(); onOpenCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Editar " + cat.name}>
            <Pencil size={11} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); removeCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Eliminar " + cat.name}>
            <Trash2 size={12} />
          </button>
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
        style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, alignItems: "center", columnGap: 10, padding: "7px 24px", cursor: "pointer", borderBottom: "1px solid " + T.borderSoft, background: T.bgElevated }}
      >
        <span style={{ display: "flex", justifyContent: "center" }}>
          <KindBadge kind={cat.kind} size={14} />
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 21, overflow: "hidden" }}>
          <span style={dot(subcategoryColor(cat.color), 8)} />
          <span style={{ fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.name}</span>
          {catShowMode === "subcategories" && <span style={{ fontSize: 10.5, color: T.textFaint }}>({cat.name})</span>}
        </span>
        <div style={{ height: 4, background: T.borderSoft, borderRadius: 2 }}>
          <div style={{ height: 4, borderRadius: 2, width: pct + "%", background: barColor }} />
        </div>
        <span className="amount" style={{ fontSize: 11, textAlign: "right" }}>
          <span style={{ color: T.textMuted }}>{fmt(val)}</span>
          {limit ? (
            <>
              {" "}<span style={{ color: T.textMuted }}>/</span> <span style={{ fontWeight: 700, color: budgetColor! }}>{fmt(limit)}</span>
            </>
          ) : (
            <span style={{ color: T.textFaint, fontWeight: 400 }}> / Sin asignar</span>
          )}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onOpenCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Editar " + sub.name}>
          <Pencil size={10} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); removeSubcategory(cat.id, sub.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Eliminar " + sub.name}>
          <Trash2 size={11} />
        </button>
      </div>
    );
  }

  const isEmpty = catShowMode === "subcategories" ? flatSubcats.length === 0 : visibleCategories.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 4px", gap: 10, flexWrap: "nowrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Tag size={17} style={{ color: T.accent }} /> Categorias
          </h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Categorias de {docName}.</p>
          <div style={{ display: "flex", gap: 14, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingUp size={12} /> <span className="amount">{fmt(monthIncome)}</span>
            </span>
            <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingDown size={12} /> <span className="amount">{fmt(monthExpense)}</span>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button onClick={onTogglePrevision} title="Previsión de balance" aria-label="Previsión de balance" style={smallBtn(showPrevision)}>
            <TrendingUp size={12} />
          </button>
          <button onClick={onExport} style={smallBtn(false)}>
            <Download size={13} />Exportar
          </button>
          <button onClick={onImport} style={smallBtn(false)}>
            <Upload size={13} />Importar
          </button>
          <button onClick={() => onNewCategory(catTypeFilter !== "all" ? catTypeFilter : "expense")} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "0 13px", height: 30, fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Nueva categoria
          </button>
        </div>
      </div>

      <div style={{ padding: 14, borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
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
      </div>

      <div style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, columnGap: 10, padding: "7px 24px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
        <SortHead field="tipo" label="Tipo" sort={catSort} onSort={handleSort} />
        <SortHead field="categoria" label="Categoria" sort={catSort} onSort={handleSort} />
        <SortHead field="progreso" label="Progreso" sort={catSort} onSort={handleSort} />
        <span style={{ textAlign: "right" }}>
          <SortHead field="presupuesto" label="Presupuesto" sort={catSort} onSort={handleSort} />
        </span>
        <span />
        <span />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {isEmpty && <div style={{ fontSize: 13, color: T.textFaint, padding: "18px 24px" }}>Sin categorias que coincidan.</div>}
        {catShowMode === "subcategories" ? flatSubcats.map(({ cat, sub }) => renderSubRow(cat, sub)) : visibleCategories.map((cat) => renderCatRow(cat))}
      </div>
    </div>
  );
}
