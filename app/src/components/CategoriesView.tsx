import { useEffect, useState } from "react";
import { ArrowRightLeft, ChevronDown, ChevronRight, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import type { Category, CategoryKind, ID } from "../types";
import { T, dot } from "../theme";
import { fmt } from "../lib/format";
import { subcategoryColor } from "../lib/color";

export interface CategorySpend {
  id: ID;
  val: number;
}

type CatTab = CategoryKind | "all";

const TABS: readonly [CatTab, string][] = [
  ["expense", "Gastos"],
  ["income", "Ingresos"],
  ["transfer", "Traspasos"],
  ["all", "Todas"],
];

const ROW_COLUMNS = "13px 14px 12px 150px 1fr 130px 22px 22px";

/** 0-70% verde, 71-90% naranja, 91-100%+ rojo; sin presupuesto asignado siempre verde. */
function budgetColor(val: number, limit: number | undefined): string {
  if (!limit) return T.income;
  const ratio = (val / limit) * 100;
  if (ratio <= 70) return T.income;
  if (ratio <= 90) return "#D9822B";
  return T.expense;
}

function KindIcon({ kind }: { kind: CategoryKind }) {
  if (kind === "income") return <TrendingUp size={12} style={{ color: T.income }} />;
  if (kind === "transfer") return <ArrowRightLeft size={12} style={{ color: T.transfer }} />;
  return <TrendingDown size={12} style={{ color: T.expense }} />;
}

export function CategoriesView({
  docName,
  categories,
  budgets,
  spendByCategory,
  spendBySubcategory,
  maxSpend,
  onNewCategory,
  removeCategory,
  onOpenCategory,
  removeSubcategory,
  newCategoryTrigger,
}: {
  docName: string;
  categories: Category[];
  budgets: Record<ID, number>;
  spendByCategory: CategorySpend[];
  spendBySubcategory: CategorySpend[];
  maxSpend: number;
  onNewCategory: (kind: CategoryKind) => void;
  removeCategory: (id: ID) => void;
  onOpenCategory: (id: ID) => void;
  removeSubcategory: (catId: ID, subId: ID) => void;
  /** Se incrementa desde Documento > Nueva Categoria (menú nativo) para abrir el panel lateral. */
  newCategoryTrigger: number;
}) {
  const [catTab, setCatTab] = useState<CatTab>("expense");
  const [expandedCategories, setExpandedCategories] = useState<Set<ID>>(new Set());

  useEffect(() => {
    if (newCategoryTrigger > 0) onNewCategory(catTab === "all" ? "expense" : catTab);
    // eslint-disable-next-line -- solo debe reaccionar al trigger, no a catTab/onNewCategory
  }, [newCategoryTrigger]);

  function toggleExpanded(id: ID) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tabCategories = catTab === "all" ? categories : categories.filter((c) => (c.kind || "expense") === catTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 4px" }}>
        <div>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0 }}>Categorias</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Categorias de {docName}.</p>
        </div>
        <button onClick={() => onNewCategory(catTab === "all" ? "expense" : catTab)} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          <Plus size={14} /> Nueva categoria
        </button>
      </div>

      <div style={{ display: "flex", gap: 0, padding: "12px 24px 0", borderBottom: "1px solid " + T.borderSoft, flexShrink: 0 }}>
        {TABS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setCatTab(value)}
            style={{ background: "none", border: "none", borderBottom: "2px solid " + (catTab === value ? T.accent : "transparent"), padding: "8px 4px", marginRight: 18, fontSize: 13, fontWeight: 700, color: catTab === value ? T.text : T.textMuted, cursor: "pointer" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {tabCategories.length === 0 && <div style={{ fontSize: 13, color: T.textFaint, padding: "18px 24px" }}>Sin categorias todavia.</div>}

        {tabCategories.map((cat) => {
          const monthEntry = spendByCategory.find((b) => b.id === cat.id);
          const val = monthEntry ? monthEntry.val : 0;
          const limit = budgets[cat.id];
          const pct = limit ? Math.min(100, (val / limit) * 100) : Math.min(100, (val / maxSpend) * 100);
          const barColor = budgetColor(val, limit);
          const hasSubs = cat.subcategories.length > 0;
          const expanded = expandedCategories.has(cat.id);
          return (
            <div key={cat.id}>
              <div
                className="accrow"
                onClick={() => onOpenCategory(cat.id)}
                style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, alignItems: "center", columnGap: 10, padding: "9px 24px", cursor: "pointer", borderBottom: "1px solid " + T.borderSoft }}
              >
                {hasSubs ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(cat.id);
                    }}
                    style={{ background: "none", border: "none", color: T.textMuted, padding: 0, flexShrink: 0 }}
                  >
                    {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                ) : (
                  <span />
                )}
                <KindIcon kind={cat.kind || "expense"} />
                <span style={dot(cat.color, 12)} />
                <span style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
                <div style={{ height: 6, background: T.borderSoft, borderRadius: 3 }}>
                  <div style={{ height: 6, borderRadius: 3, width: pct + "%", background: barColor }} />
                </div>
                <span className="amount" style={{ fontSize: 13, color: T.textMuted, textAlign: "right" }}>
                  {fmt(val)}
                  {limit ? " / " + fmt(limit) : ""}
                </span>
                <button onClick={(e) => { e.stopPropagation(); onOpenCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Editar " + cat.name}>
                  <Pencil size={11} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Eliminar " + cat.name}>
                  <Trash2 size={12} />
                </button>
              </div>
              {hasSubs &&
                expanded &&
                cat.subcategories.map((sub) => {
                  const subVal = spendBySubcategory.find((b) => b.id === sub.id)?.val ?? 0;
                  const subLimit = budgets[sub.id];
                  const subPct = subLimit ? Math.min(100, (subVal / subLimit) * 100) : Math.min(100, (subVal / maxSpend) * 100);
                  const subBarColor = budgetColor(subVal, subLimit);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => onOpenCategory(cat.id)}
                      className="accrow"
                      style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, alignItems: "center", columnGap: 10, padding: "7px 24px", cursor: "pointer", borderBottom: "1px solid " + T.borderSoft, background: T.bgElevated }}
                    >
                      <span />
                      <span />
                      <span style={dot(subcategoryColor(cat.color), 7)} />
                      <span style={{ fontSize: 12, color: T.text, paddingLeft: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.name}</span>
                      <div style={{ height: 4, background: T.borderSoft, borderRadius: 2 }}>
                        <div style={{ height: 4, borderRadius: 2, width: subPct + "%", background: subBarColor }} />
                      </div>
                      <span className="amount" style={{ fontSize: 11, color: T.textMuted, textAlign: "right" }}>
                        {fmt(subVal)}
                        {subLimit ? " / " + fmt(subLimit) : ""}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); onOpenCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Editar " + sub.name}>
                        <Pencil size={10} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeSubcategory(cat.id, sub.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Eliminar " + sub.name}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
