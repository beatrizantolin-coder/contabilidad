import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import type { Category, CategoryKind, ID } from "../types";
import { PALETTE, T, dot, inputStyle } from "../theme";
import { fmt } from "../lib/format";
import { subcategoryColor } from "../lib/color";
import { ColorSwatches } from "./ColorSwatches";

export interface CategorySpend {
  id: ID;
  val: number;
}

const TABS: readonly [CategoryKind, string][] = [
  ["expense", "Gastos"],
  ["income", "Ingresos"],
  ["transfer", "Traspasos"],
];

export function CategoriesView({
  docName,
  categories,
  budgets,
  spendByCategory,
  maxSpend,
  addCategory,
  removeCategory,
  onOpenCategory,
  newCategoryTrigger,
}: {
  docName: string;
  categories: Category[];
  budgets: Record<ID, number>;
  spendByCategory: CategorySpend[];
  maxSpend: number;
  addCategory: (name: string, color: string, kind: CategoryKind) => void;
  removeCategory: (id: ID) => void;
  onOpenCategory: (id: ID) => void;
  /** Se incrementa desde Documento > Nueva Categoria (menú nativo) para abrir el formulario. */
  newCategoryTrigger: number;
}) {
  const [showCatForm, setShowCatForm] = useState(false);
  const [catDraft, setCatDraft] = useState<{ name: string; color: string; kind: CategoryKind }>({ name: "", color: PALETTE[0], kind: "expense" });
  const [catTab, setCatTab] = useState<CategoryKind>("expense");
  const [expandedCategories, setExpandedCategories] = useState<Set<ID>>(new Set());

  useEffect(() => {
    if (newCategoryTrigger > 0) setShowCatForm(true);
  }, [newCategoryTrigger]);

  function submitCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catDraft.name.trim()) return;
    addCategory(catDraft.name.trim(), catDraft.color, catDraft.kind);
    setCatDraft({ name: "", color: PALETTE[0], kind: "expense" });
    setShowCatForm(false);
  }

  function toggleExpanded(id: ID) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tabCategories = categories.filter((c) => (c.kind || "expense") === catTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 4px" }}>
        <div>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0 }}>Categorias</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Categorias de {docName}.</p>
        </div>
        <button onClick={() => setShowCatForm((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          <Plus size={14} /> Nueva categoria
        </button>
      </div>

      {showCatForm && (
        <form onSubmit={submitCategory} style={{ margin: "14px 24px", padding: 14, background: T.bgElevated, border: "1px solid " + T.border, borderRadius: 10, display: "flex", flexDirection: "column", gap: 10, maxWidth: 340 }}>
          <input autoFocus placeholder="Nombre de la categoria" value={catDraft.name} onChange={(e) => setCatDraft((d) => ({ ...d, name: e.target.value }))} style={inputStyle} />
          <div style={{ display: "flex", gap: 6 }}>
            {TABS.map(([value]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCatDraft((d) => ({ ...d, kind: value }))}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 6,
                  border: "1px solid " + (catDraft.kind === value ? T.accent : T.border),
                  background: catDraft.kind === value ? "#EAF1FC" : "#FFFFFF",
                  color: catDraft.kind === value ? T.accent : T.textMuted,
                  fontSize: 12, fontWeight: 600,
                }}
              >
                {value === "expense" ? "Gasto" : value === "income" ? "Ingreso" : "Traspaso"}
              </button>
            ))}
          </div>
          <ColorSwatches value={catDraft.color} onChange={(c) => setCatDraft((d) => ({ ...d, color: c }))} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "7px 14px", color: "#fff", fontWeight: 600, fontSize: 12.5 }}>
              Crear
            </button>
            <button type="button" onClick={() => setShowCatForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 10px", color: T.textMuted, fontSize: 12.5 }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

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
          const over = !!limit && val > limit;
          const hasSubs = cat.subcategories.length > 0;
          const expanded = expandedCategories.has(cat.id);
          return (
            <div key={cat.id}>
              <div
                className="accrow"
                onClick={() => onOpenCategory(cat.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 24px", cursor: "pointer", borderBottom: "1px solid " + T.borderSoft }}
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
                  <span style={{ width: 13, flexShrink: 0 }} />
                )}
                <span style={dot(cat.color, 12)} />
                <span style={{ fontSize: 13.5, fontWeight: 600, flexShrink: 0, width: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
                <div style={{ flex: 1, height: 6, background: T.borderSoft, borderRadius: 3 }}>
                  <div style={{ height: 6, borderRadius: 3, width: pct + "%", background: over ? T.expense : cat.color }} />
                </div>
                <span className="amount" style={{ fontSize: 13, color: T.textMuted, flexShrink: 0, minWidth: 130, textAlign: "right" }}>
                  {fmt(val)}
                  {limit ? " / " + fmt(limit) : ""}
                </span>
                <button onClick={(e) => { e.stopPropagation(); onOpenCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Editar " + cat.name}>
                  <Pencil size={11} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeCategory(cat.id); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Eliminar " + cat.name}>
                  <Trash2 size={12} />
                </button>
              </div>
              {hasSubs &&
                expanded &&
                cat.subcategories.map((sub) => (
                  <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 24px 8px 47px", borderBottom: "1px solid " + T.borderSoft, background: T.bgElevated }}>
                    <span style={dot(subcategoryColor(cat.color), 9)} />
                    <span style={{ fontSize: 12.5, color: T.text }}>{sub.name}</span>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
