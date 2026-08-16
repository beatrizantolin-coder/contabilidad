import type { Account, Category, ID } from "../types";
import { T, STATUSES, inputStyle } from "../theme";
import { MIXED, type BulkEditField, type BulkEditState } from "../lib/bulkEdit";
import { Field } from "./Field";
import { DateField } from "./DateField";

export function BulkEditForm({
  bulkEdit,
  setBulkEdit,
  touchedFields,
  touchField,
  accounts,
  categories,
  selectedCount,
  onSubmit,
  onCancel,
}: {
  bulkEdit: BulkEditState;
  setBulkEdit: (fn: (b: BulkEditState) => BulkEditState) => void;
  touchedFields: Set<BulkEditField>;
  touchField: (field: BulkEditField) => void;
  accounts: Account[];
  categories: Category[];
  selectedCount: number;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const bulkCategory = bulkEdit.categoryId && bulkEdit.categoryId !== MIXED ? categories.find((c) => c.id === bulkEdit.categoryId) : null;
  const bulkSubcategory = bulkCategory && bulkEdit.subcategoryId && bulkEdit.subcategoryId !== MIXED ? bulkCategory.subcategories.find((s) => s.id === bulkEdit.subcategoryId) : null;

  function mixedStyle(field: BulkEditField) {
    return bulkEdit[field] === MIXED && !touchedFields.has(field) ? { color: T.textFaint } : {};
  }
  function set<K extends keyof BulkEditState>(field: K, value: BulkEditState[K]) {
    setBulkEdit((b) => ({ ...b, [field]: value }));
    touchField(field);
  }

  return (
    <form onSubmit={onSubmit} style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>
        Se aplicaran a los {selectedCount} movimientos seleccionados solo los campos que cambies aqui. Los que ya dicen "Varios valores" siguen sin tocarse hasta que los edites.
      </p>

      <Field label="Cuenta">
        <select value={bulkEdit.accountId === MIXED ? MIXED : bulkEdit.accountId} onChange={(e) => set("accountId", e.target.value as ID)} style={{ ...inputStyle, ...mixedStyle("accountId") }}>
          {bulkEdit.accountId === MIXED && (
            <option value={MIXED} disabled hidden>
              Varios valores
            </option>
          )}
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Estado">
        <select value={bulkEdit.status} onChange={(e) => set("status", e.target.value as BulkEditState["status"])} style={{ ...inputStyle, ...mixedStyle("status") }}>
          {bulkEdit.status === MIXED && (
            <option value={MIXED} disabled hidden>
              Varios valores
            </option>
          )}
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={bulkEdit.date === MIXED && !touchedFields.has("date") ? "Fecha (Varios valores)" : "Fecha"}>
        <DateField value={bulkEdit.date === MIXED ? "" : bulkEdit.date} onChange={(v) => set("date", v)} />
      </Field>

      <Field label="Importe">
        <input
          type="number"
          step="0.01"
          value={bulkEdit.amount === MIXED ? "" : bulkEdit.amount}
          placeholder={bulkEdit.amount === MIXED ? "Varios valores" : "0,00"}
          onChange={(e) => set("amount", Number(e.target.value))}
          style={{ ...inputStyle, ...mixedStyle("amount") }}
        />
      </Field>

      <Field label="Categoria">
        <select
          value={bulkEdit.categoryId === MIXED ? MIXED : bulkEdit.categoryId ?? ""}
          onChange={(e) => {
            const val = e.target.value || null;
            setBulkEdit((b) => ({ ...b, categoryId: val, subcategoryId: null, subsubcategoryId: null }));
            touchField("categoryId");
            touchField("subcategoryId");
            touchField("subsubcategoryId");
          }}
          style={{ ...inputStyle, ...mixedStyle("categoryId") }}
        >
          {bulkEdit.categoryId === MIXED && (
            <option value={MIXED} disabled hidden>
              Varios valores
            </option>
          )}
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
          <select
            value={bulkEdit.subcategoryId === MIXED ? MIXED : bulkEdit.subcategoryId ?? ""}
            onChange={(e) => {
              const val = e.target.value || null;
              setBulkEdit((b) => ({ ...b, subcategoryId: val, subsubcategoryId: null }));
              touchField("subcategoryId");
              touchField("subsubcategoryId");
            }}
            style={{ ...inputStyle, ...mixedStyle("subcategoryId") }}
          >
            {bulkEdit.subcategoryId === MIXED && (
              <option value={MIXED} disabled hidden>
                Varios valores
              </option>
            )}
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
          <select value={bulkEdit.subsubcategoryId === MIXED ? MIXED : bulkEdit.subsubcategoryId ?? ""} onChange={(e) => set("subsubcategoryId", e.target.value || null)} style={{ ...inputStyle, ...mixedStyle("subsubcategoryId") }}>
            {bulkEdit.subsubcategoryId === MIXED && (
              <option value={MIXED} disabled hidden>
                Varios valores
              </option>
            )}
            <option value="">Ninguna</option>
            {bulkSubcategory.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Comentario">
        <input
          value={bulkEdit.comment === MIXED ? "" : bulkEdit.comment}
          placeholder={bulkEdit.comment === MIXED ? "Varios valores" : "Opcional"}
          onChange={(e) => set("comment", e.target.value)}
          style={{ ...inputStyle, ...mixedStyle("comment") }}
        />
      </Field>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
        <button type="button" onClick={onCancel} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 14px", color: T.textMuted, fontSize: 13 }}>
          Cancelar
        </button>
        <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
          Aplicar a {selectedCount}
        </button>
      </div>
    </form>
  );
}
