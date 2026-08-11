import type { Account, Category } from "../types";
import { STATUSES, T, inputStyle } from "../theme";
import type { BulkEditState } from "../lib/bulkEdit";

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
    <form onSubmit={onSubmit} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>Marca solo los campos que quieras cambiar. Lo demas se queda igual en cada movimiento.</p>

      <div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.text, fontWeight: 600 }}>
          <input type="checkbox" checked={bulkEdit.dateOn} onChange={(e) => setBulkEdit((b) => ({ ...b, dateOn: e.target.checked }))} />
          Fecha
        </label>
        {bulkEdit.dateOn && <input type="date" value={bulkEdit.date} onChange={(e) => setBulkEdit((b) => ({ ...b, date: e.target.value }))} style={{ ...inputStyle, marginTop: 6 }} />}
      </div>

      <div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.text, fontWeight: 600 }}>
          <input type="checkbox" checked={bulkEdit.statusOn} onChange={(e) => setBulkEdit((b) => ({ ...b, statusOn: e.target.checked }))} />
          Estado
        </label>
        {bulkEdit.statusOn && (
          <select value={bulkEdit.status} onChange={(e) => setBulkEdit((b) => ({ ...b, status: e.target.value as BulkEditState["status"] }))} style={{ ...inputStyle, marginTop: 6 }}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.text, fontWeight: 600 }}>
          <input type="checkbox" checked={bulkEdit.accountOn} onChange={(e) => setBulkEdit((b) => ({ ...b, accountOn: e.target.checked }))} />
          Cuenta
        </label>
        {bulkEdit.accountOn && (
          <select value={bulkEdit.accountId ?? ""} onChange={(e) => setBulkEdit((b) => ({ ...b, accountId: e.target.value }))} style={{ ...inputStyle, marginTop: 6 }}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        {bulkEdit.accountOn && <p style={{ fontSize: 10.5, color: T.textFaint, margin: "4px 0 0" }}>No afecta a las transferencias seleccionadas.</p>}
      </div>

      <div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.text, fontWeight: 600 }}>
          <input type="checkbox" checked={bulkEdit.categoryOn} onChange={(e) => setBulkEdit((b) => ({ ...b, categoryOn: e.target.checked }))} />
          Categoria
        </label>
        {bulkEdit.categoryOn && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            <select
              value={bulkEdit.categoryId ?? ""}
              onChange={(e) => setBulkEdit((b) => ({ ...b, categoryId: e.target.value || null, subcategoryId: null, subsubcategoryId: null }))}
              style={inputStyle}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {bulkCategory && bulkCategory.subcategories.length > 0 && (
              <select value={bulkEdit.subcategoryId ?? ""} onChange={(e) => setBulkEdit((b) => ({ ...b, subcategoryId: e.target.value || null, subsubcategoryId: null }))} style={inputStyle}>
                <option value="">Sin subcategoria</option>
                {bulkCategory.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            {bulkSubcategory && bulkSubcategory.subcategories.length > 0 && (
              <select value={bulkEdit.subsubcategoryId ?? ""} onChange={(e) => setBulkEdit((b) => ({ ...b, subsubcategoryId: e.target.value || null }))} style={inputStyle}>
                <option value="">Sin sub-subcategoria</option>
                {bulkSubcategory.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {bulkEdit.categoryOn && <p style={{ fontSize: 10.5, color: T.textFaint, margin: "4px 0 0" }}>No afecta a las transferencias seleccionadas.</p>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
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
