import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Budgets, Category, CategoryKind, ID } from "../types";
import { T, dot, inputStyle } from "../theme";
import { subcategoryColor } from "../lib/color";
import { Field } from "./Field";
import { ColorSwatches } from "./ColorSwatches";

const KIND_OPTIONS: readonly [CategoryKind, string][] = [
  ["expense", "Gasto"],
  ["income", "Ingreso"],
  ["transfer", "Traspaso"],
];

export function CategoryEditForm({
  category,
  budgets,
  hideKind,
  setCategoryName,
  setCategoryKind,
  setCategoryColor,
  setBudget,
  addSubcategory,
  removeSubcategory,
  onDone,
}: {
  category: Category;
  budgets: Budgets;
  /** Oculta el selector de tipo al crear una categoria nueva: el tipo ya viene asignado por la pestana activa. */
  hideKind?: boolean;
  setCategoryName: (id: ID, name: string) => void;
  setCategoryKind: (id: ID, kind: CategoryKind) => void;
  setCategoryColor: (id: ID, color: string) => void;
  setBudget: (catId: ID, value: number | undefined) => void;
  addSubcategory: (catId: ID, name: string) => ID;
  removeSubcategory: (catId: ID, subId: ID) => void;
  onDone: () => void;
}) {
  const [showSubForm, setShowSubForm] = useState(false);
  const [subName, setSubName] = useState("");

  function submitSubcategory(e: React.FormEvent) {
    e.preventDefault();
    if (!subName.trim()) return;
    addSubcategory(category.id, subName.trim());
    setSubName("");
    setShowSubForm(false);
  }

  const limit = budgets[category.id];

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Nombre">
        <input value={category.name} onChange={(e) => setCategoryName(category.id, e.target.value)} style={inputStyle} />
      </Field>

      {!hideKind && (
        <Field label="Tipo">
          <div style={{ display: "flex", gap: 6 }}>
            {KIND_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategoryKind(category.id, value)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 6,
                  border: "1px solid " + (category.kind === value ? T.accent : T.border),
                  background: category.kind === value ? "#EAF1FC" : "#FFFFFF",
                  color: category.kind === value ? T.accent : T.textMuted,
                  fontSize: 12, fontWeight: 600,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Color">
        <ColorSwatches value={category.color} onChange={(c) => setCategoryColor(category.id, c)} size={18} />
      </Field>

      <Field label="Presupuesto mensual">
        <input
          type="number"
          placeholder="Sin limite"
          value={limit === undefined ? "" : limit}
          onChange={(e) => setBudget(category.id, e.target.value === "" ? undefined : Number(e.target.value))}
          style={inputStyle}
        />
      </Field>

      <div>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase", color: T.textMuted, fontWeight: 600 }}>Subcategorias</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {category.subcategories.map((sub) => {
            const subLimit = budgets[sub.id];
            return (
              <div key={sub.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", background: "#FFFFFF", border: "1px solid " + T.borderSoft, borderRadius: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, minWidth: 0, flex: 1 }}>
                  <span style={{ flexShrink: 0, ...dot(subcategoryColor(category.color), 8) }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.name}</span>
                </span>
                <input
                  type="number"
                  placeholder="Sin limite"
                  value={subLimit === undefined ? "" : subLimit}
                  onChange={(e) => setBudget(sub.id, e.target.value === "" ? undefined : Number(e.target.value))}
                  style={{ ...inputStyle, width: 84, padding: "5px 8px", fontSize: 12 }}
                />
                <button onClick={() => removeSubcategory(category.id, sub.id)} style={{ background: "none", border: "none", color: T.textFaint, padding: 2, flexShrink: 0 }} aria-label={"Eliminar " + sub.name}>
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {category.subcategories.length === 0 && <div style={{ fontSize: 12, color: T.textFaint }}>Sin subcategorias todavia.</div>}
        </div>

        {showSubForm ? (
          <form onSubmit={submitSubcategory} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
            <input autoFocus placeholder="Nombre" value={subName} onChange={(e) => setSubName(e.target.value)} style={{ ...inputStyle, fontSize: 12.5 }} />
            <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              Anadir
            </button>
            <button type="button" onClick={() => setShowSubForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 8px", color: T.textMuted, flexShrink: 0 }}>
              <X size={12} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowSubForm(true)}
            style={{ marginTop: 8, background: "none", border: "1px dashed " + T.border, borderRadius: 6, padding: "7px 10px", color: T.accent, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, width: "100%", justifyContent: "center" }}
          >
            <Plus size={12} /> Anadir subcategoria
          </button>
        )}
      </div>

      <button onClick={onDone} style={{ background: T.accent, border: "none", borderRadius: 6, padding: "9px 0", color: "#fff", fontWeight: 600, fontSize: 13 }}>
        Listo
      </button>
    </div>
  );
}
