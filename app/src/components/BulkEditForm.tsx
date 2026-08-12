import type { Account, Category } from "../types";
import { STATUSES, T, inputStyle } from "../theme";
import type { BulkEditState } from "../lib/bulkEdit";
import { Field } from "./Field";

export function BulkEditForm({
  bulkEdit,
  setBulkEdit,
  accounts,
  categories,
  selectedCount,
  onSubmit,
  onCancel,
}: {
  bulkEdit: BulkEditState;
  setBulkEdit: (fn: (b: BulkEditState) => BulkEditState) => void;
  accounts: Account[];
  categories: Category[];
  selectedCount: number;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const bulkCategory = categories.find((c) => c.id === bulkEdit.categoryId);
  const bulkSubcategory = bulkCategory?.subcategories.find((s) => s.id === bulkEdit.subcategoryId);

  return (
    <form onSubmit={onSubmit} style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>
        Se aplicara a los {selectedCount} movimientos seleccionados. No afecta a la cuenta ni categoria de las transferencias.
      </p>

      <Field label="Cuenta">
        <select value={bulkEdit.accountId ?? ""} onChange={(e) => setBulkEdit((b) => ({ ...b, accountId: e.target.value }))} style={inputStyle}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Categoria">
        <select
          value={bulkEdit.categoryId ?? ""}
          onChange={(e) => setBulkEdit((b) => ({ ...b, categoryId: e.target.value || null, subcategoryId: null, subsubcategoryId: null }))}
          style={inputStyle}
        >
          {categories.length === 0 && <option value="">Sin categorias</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      {bulkCategory && bulkCategory.subcategories.length > 0 && (
        <Field label="Subcategoria">
          <select value={bulkEdit.subcategoryId ?? ""} onChange={(e) => setBulkEdit((b) => ({ ...b, subcategoryId: e.target.value || null, subsubcategoryId: null }))} style={inputStyle}>
            <option value="">Ninguna</option>
            {bulkCategory.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {bulkSubcategory && bulkSubcategory.subcategories.length > 0 && (
        <Field label="Sub-subcategoria">
          <select value={bulkEdit.subsubcategoryId ?? ""} onChange={(e) => setBulkEdit((b) => ({ ...b, subsubcategoryId: e.target.value || null }))} style={inputStyle}>
            <option value="">Ninguna</option>
            {bulkSubcategory.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Estado">
        <select value={bulkEdit.status} onChange={(e) => setBulkEdit((b) => ({ ...b, status: e.target.value as BulkEditState["status"] }))} style={inputStyle}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Fecha">
        <input type="date" value={bulkEdit.date} onChange={(e) => setBulkEdit((b) => ({ ...b, date: e.target.value }))} style={inputStyle} />
      </Field>

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
          Aplicar a {selectedCount}
        </button>
        <button type="button" onClick={onCancel} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 14px", color: T.textMuted, fontSize: 13 }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
