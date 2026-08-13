import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Category, CategoryKind, ID } from "../types";
import { PALETTE, T, dot, inputStyle } from "../theme";
import { fmt } from "../lib/format";
import { ColorSwatches } from "./ColorSwatches";

export interface CategorySpend {
  id: ID;
  val: number;
}

export function CategoriesView({
  docName,
  categories,
  budgets,
  spendByCategory,
  maxSpend,
  addCategory,
  removeCategory,
  setCategoryColor,
  addSubcategory,
  removeSubcategory,
  setSubcategoryColor,
  addSubSubcategory,
  removeSubSubcategory,
  setSubSubcategoryColor,
  setBudget,
  newCategoryTrigger,
}: {
  docName: string;
  categories: Category[];
  budgets: Record<ID, number>;
  spendByCategory: CategorySpend[];
  maxSpend: number;
  addCategory: (name: string, color: string, kind: CategoryKind) => void;
  removeCategory: (id: ID) => void;
  setCategoryColor: (id: ID, color: string) => void;
  addSubcategory: (catId: ID, name: string, color: string) => void;
  removeSubcategory: (catId: ID, subId: ID) => void;
  setSubcategoryColor: (catId: ID, subId: ID, color: string) => void;
  addSubSubcategory: (catId: ID, subId: ID, name: string, color: string) => void;
  removeSubSubcategory: (catId: ID, subId: ID, subsubId: ID) => void;
  setSubSubcategoryColor: (catId: ID, subId: ID, subsubId: ID, color: string) => void;
  setBudget: (catId: ID, value: number | undefined) => void;
  /** Se incrementa desde Documento > Nueva Categoria (menú nativo) para abrir el formulario. */
  newCategoryTrigger: number;
}) {
  const [showCatForm, setShowCatForm] = useState(false);
  const [catDraft, setCatDraft] = useState<{ name: string; color: string; kind: CategoryKind }>({ name: "", color: PALETTE[0], kind: "expense" });
  const [subFormFor, setSubFormFor] = useState<string | null>(null);
  const [subDraft, setSubDraft] = useState({ name: "", color: PALETTE[0] });
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

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

  function submitSubcategory(catId: ID, e: React.FormEvent) {
    e.preventDefault();
    if (!subDraft.name.trim()) return;
    addSubcategory(catId, subDraft.name.trim(), subDraft.color);
    setSubDraft({ name: "", color: PALETTE[0] });
    setSubFormFor(null);
  }

  function submitSubSubcategory(catId: ID, subId: ID, e: React.FormEvent) {
    e.preventDefault();
    if (!subDraft.name.trim()) return;
    addSubSubcategory(catId, subId, subDraft.name.trim(), subDraft.color);
    setSubDraft({ name: "", color: PALETTE[0] });
    setSubFormFor(null);
  }

  return (
    <div style={{ padding: "20px 24px", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0 }}>Categorias</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Categorias y subcategorias de {docName}, con su color y presupuesto.</p>
        </div>
        <button onClick={() => setShowCatForm((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600 }}>
          <Plus size={14} /> Nueva categoria
        </button>
      </div>

      {showCatForm && (
        <form onSubmit={submitCategory} style={{ margin: "16px 0", padding: 14, background: T.bgElevated, border: "1px solid " + T.border, borderRadius: 10, display: "flex", flexDirection: "column", gap: 10, maxWidth: 340 }}>
          <input autoFocus placeholder="Nombre de la categoria" value={catDraft.name} onChange={(e) => setCatDraft((d) => ({ ...d, name: e.target.value }))} style={inputStyle} />
          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                ["expense", "Gasto"],
                ["income", "Ingreso"],
              ] as const
            ).map(([value, label]) => (
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
                {label}
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

      {categories.length === 0 && <div style={{ fontSize: 13, color: T.textFaint, marginTop: 18 }}>Sin categorias todavia.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
        {categories.map((cat) => {
          const monthEntry = spendByCategory.find((b) => b.id === cat.id);
          const val = monthEntry ? monthEntry.val : 0;
          const limit = budgets[cat.id];
          const pct = limit ? Math.min(100, (val / limit) * 100) : Math.min(100, (val / maxSpend) * 100);
          const over = !!limit && val > limit;
          return (
            <div key={cat.id} className="catcard" style={{ border: "1px solid " + T.border, borderRadius: 10, padding: 14, maxWidth: 480 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => setColorPickerOpen((p) => (p === "cat:" + cat.id ? null : "cat:" + cat.id))} style={{ background: "none", border: "none", padding: 2, lineHeight: 0 }} aria-label={"Cambiar color de " + cat.name}>
                    <span style={dot(cat.color, 12)} />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</span>
                  <span
                    style={{
                      fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.04em",
                      color: cat.kind === "income" ? T.income : T.textFaint,
                      border: "1px solid " + (cat.kind === "income" ? T.income : T.border),
                      borderRadius: 10, padding: "1px 6px",
                    }}
                  >
                    {cat.kind === "income" ? "Ingreso" : "Gasto"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="amount" style={{ fontSize: 13, color: T.textMuted }}>
                    {fmt(val)}
                    {limit ? " / " + fmt(limit) : ""}
                  </span>
                  <button onClick={() => removeCategory(cat.id)} className="catx" style={{ opacity: 0, background: "none", border: "none", color: T.textFaint }} aria-label={"Eliminar " + cat.name}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {colorPickerOpen === "cat:" + cat.id && (
                <div style={{ marginTop: 8 }}>
                  <ColorSwatches value={cat.color} onChange={(c) => { setCategoryColor(cat.id, c); setColorPickerOpen(null); }} size={14} />
                </div>
              )}

              <div style={{ height: 6, background: T.borderSoft, borderRadius: 3, marginTop: 10 }}>
                <div style={{ height: 6, borderRadius: 3, width: pct + "%", background: over ? T.expense : cat.color }} />
              </div>

              <div style={{ marginTop: 10 }}>
                <input
                  type="number"
                  placeholder="Presupuesto mensual"
                  value={limit === undefined ? "" : limit}
                  onChange={(e) => setBudget(cat.id, e.target.value === "" ? undefined : Number(e.target.value))}
                  style={{ ...inputStyle, fontSize: 12, width: 150 }}
                />
              </div>

              {cat.subcategories.length > 0 && (
                <div style={{ marginTop: 12, paddingLeft: 18, borderLeft: "2px solid " + T.borderSoft, display: "flex", flexDirection: "column", gap: 8 }}>
                  {cat.subcategories.map((sub) => {
                    const subKey = "sub:" + cat.id + ":" + sub.id;
                    const subsubFormKey = "subsub:" + cat.id + ":" + sub.id;
                    const subsubs = sub.subcategories;
                    return (
                      <div key={sub.id}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <button onClick={() => setColorPickerOpen((p) => (p === subKey ? null : subKey))} style={{ background: "none", border: "none", padding: 2, lineHeight: 0 }} aria-label={"Cambiar color de " + sub.name}>
                              <span style={dot(sub.color, 8)} />
                            </button>
                            <span style={{ fontSize: 12.5 }}>{sub.name}</span>
                          </div>
                          <button onClick={() => removeSubcategory(cat.id, sub.id)} style={{ background: "none", border: "none", color: T.textFaint }} aria-label={"Eliminar " + sub.name}>
                            <X size={11} />
                          </button>
                        </div>
                        {colorPickerOpen === subKey && (
                          <div style={{ marginTop: 6 }}>
                            <ColorSwatches value={sub.color} onChange={(c) => { setSubcategoryColor(cat.id, sub.id, c); setColorPickerOpen(null); }} size={12} />
                          </div>
                        )}

                        {subsubs.length > 0 && (
                          <div style={{ marginTop: 6, paddingLeft: 16, borderLeft: "2px solid " + T.borderSoft, display: "flex", flexDirection: "column", gap: 6 }}>
                            {subsubs.map((subsub) => {
                              const subsubKey = "subsub:" + cat.id + ":" + sub.id + ":" + subsub.id;
                              return (
                                <div key={subsub.id}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <button onClick={() => setColorPickerOpen((p) => (p === subsubKey ? null : subsubKey))} style={{ background: "none", border: "none", padding: 2, lineHeight: 0 }} aria-label={"Cambiar color de " + subsub.name}>
                                        <span style={dot(subsub.color, 7)} />
                                      </button>
                                      <span style={{ fontSize: 12 }}>{subsub.name}</span>
                                    </div>
                                    <button onClick={() => removeSubSubcategory(cat.id, sub.id, subsub.id)} style={{ background: "none", border: "none", color: T.textFaint }} aria-label={"Eliminar " + subsub.name}>
                                      <X size={10} />
                                    </button>
                                  </div>
                                  {colorPickerOpen === subsubKey && (
                                    <div style={{ marginTop: 5 }}>
                                      <ColorSwatches value={subsub.color} onChange={(c) => { setSubSubcategoryColor(cat.id, sub.id, subsub.id, c); setColorPickerOpen(null); }} size={11} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {subFormFor === subsubFormKey ? (
                          <form onSubmit={(e) => submitSubSubcategory(cat.id, sub.id, e)} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, paddingLeft: 16 }}>
                            <input autoFocus placeholder="Sub-subcategoria" value={subDraft.name} onChange={(e) => setSubDraft((d) => ({ ...d, name: e.target.value }))} style={{ ...inputStyle, fontSize: 11.5, width: 130 }} />
                            <ColorSwatches value={subDraft.color} onChange={(c) => setSubDraft((d) => ({ ...d, color: c }))} size={11} />
                            <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 11, fontWeight: 600 }}>
                              Anadir
                            </button>
                            <button type="button" onClick={() => setSubFormFor(null)} style={{ background: "none", border: "none", color: T.textFaint }}>
                              <X size={11} />
                            </button>
                          </form>
                        ) : (
                          <button onClick={() => { setSubFormFor(subsubFormKey); setSubDraft({ name: "", color: PALETTE[0] }); }} style={{ marginTop: 6, marginLeft: 16, background: "none", border: "none", color: T.accent, fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <Plus size={10} /> Sub-subcategoria
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {subFormFor === "cat:" + cat.id ? (
                <form onSubmit={(e) => submitSubcategory(cat.id, e)} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, paddingLeft: 18 }}>
                  <input autoFocus placeholder="Subcategoria" value={subDraft.name} onChange={(e) => setSubDraft((d) => ({ ...d, name: e.target.value }))} style={{ ...inputStyle, fontSize: 12, width: 140 }} />
                  <ColorSwatches value={subDraft.color} onChange={(c) => setSubDraft((d) => ({ ...d, color: c }))} size={12} />
                  <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "5px 10px", color: "#fff", fontSize: 11.5, fontWeight: 600 }}>
                    Anadir
                  </button>
                  <button type="button" onClick={() => setSubFormFor(null)} style={{ background: "none", border: "none", color: T.textFaint }}>
                    <X size={12} />
                  </button>
                </form>
              ) : (
                <button onClick={() => { setSubFormFor("cat:" + cat.id); setSubDraft({ name: "", color: PALETTE[0] }); }} style={{ marginTop: 10, marginLeft: 18, background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <Plus size={11} /> Subcategoria
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
