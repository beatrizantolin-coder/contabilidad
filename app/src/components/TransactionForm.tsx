import type { LedgerDocument, RecurUnit, TransactionStatus } from "../types";
import type { TxDraft } from "../lib/txDraft";
import { Field } from "./Field";
import { T, inputStyle, STATUSES, RECUR_UNITS } from "../theme";

export function TransactionForm({
  txDraft,
  setTxDraft,
  accounts,
  categories,
  documents,
  activeDocId,
  onDescriptionChange,
  onSubmit,
  onCancel,
}: {
  txDraft: TxDraft;
  setTxDraft: (fn: (d: TxDraft) => TxDraft) => void;
  accounts: LedgerDocument["accounts"];
  categories: LedgerDocument["categories"];
  documents: LedgerDocument[];
  activeDocId: string;
  onDescriptionChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const targetDocAccounts = (documents.find((d) => d.id === txDraft.toDocId) || documents.find((d) => d.id === activeDocId))?.accounts ?? [];
  const selectedCategory = categories.find((c) => c.id === txDraft.categoryId);
  const selectedSubcategory = selectedCategory?.subcategories.find((s) => s.id === txDraft.subcategoryId);

  return (
    <form onSubmit={onSubmit} style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <Field label={txDraft.type === "transfer" ? "Cuenta origen" : "Cuenta"}>
        <select value={txDraft.accountId ?? ""} onChange={(e) => setTxDraft((d) => ({ ...d, accountId: e.target.value }))} style={inputStyle}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      {txDraft.type === "transfer" && (
        <>
          <Field label="Vincular (archivo)">
            <select
              value={txDraft.toDocId}
              onChange={(e) => {
                const docId = e.target.value;
                const doc = documents.find((d) => d.id === docId);
                setTxDraft((d) => ({ ...d, toDocId: docId, toAccountId: doc?.accounts[0]?.id ?? null }));
              }}
              style={inputStyle}
            >
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                  {doc.id === activeDocId ? " (este archivo)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Destino (cuenta)">
            <select value={txDraft.toAccountId ?? ""} onChange={(e) => setTxDraft((d) => ({ ...d, toAccountId: e.target.value }))} style={inputStyle}>
              {targetDocAccounts.length === 0 && <option value="">Sin cuentas en este archivo</option>}
              {targetDocAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      <Field label="Tipo">
        <div style={{ display: "flex", gap: 6 }}>
          {(
            [
              ["expense", "Gasto"],
              ["income", "Ingreso"],
              ["transfer", "Transf."],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTxDraft((d) => ({ ...d, type: value }))}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 6,
                border: "1px solid " + (txDraft.type === value ? T.accent : T.border),
                background: txDraft.type === value ? "#EAF1FC" : "#FFFFFF",
                color: txDraft.type === value ? T.accent : T.textMuted,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.textMuted }}>
          <input type="checkbox" checked={txDraft.recurringOn} onChange={(e) => setTxDraft((d) => ({ ...d, recurringOn: e.target.checked }))} />
          Movimiento recurrente
        </label>
        {txDraft.recurringOn && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12.5, color: T.textMuted }}>Cada</span>
            <input
              type="number"
              min="1"
              value={txDraft.freqInterval}
              onChange={(e) => setTxDraft((d) => ({ ...d, freqInterval: Number(e.target.value) }))}
              style={{ ...inputStyle, width: 60 }}
            />
            <select value={txDraft.freqUnit} onChange={(e) => setTxDraft((d) => ({ ...d, freqUnit: e.target.value as RecurUnit }))} style={{ ...inputStyle, width: 110 }}>
              {RECUR_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Field label="Descripcion">
        <input
          autoFocus
          value={txDraft.name}
          onChange={(e) => {
            const val = e.target.value;
            setTxDraft((d) => ({ ...d, name: val }));
            onDescriptionChange(val);
          }}
          style={inputStyle}
          placeholder="p. ej. Supermercado"
        />
      </Field>

      <Field label="Estado">
        <select value={txDraft.status} onChange={(e) => setTxDraft((d) => ({ ...d, status: e.target.value as TransactionStatus }))} style={inputStyle}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Fecha">
        <input type="date" value={txDraft.date} onChange={(e) => setTxDraft((d) => ({ ...d, date: e.target.value }))} style={inputStyle} />
      </Field>

      <Field label="Importe">
        <input type="number" step="0.01" value={txDraft.amount} onChange={(e) => setTxDraft((d) => ({ ...d, amount: e.target.value }))} style={inputStyle} placeholder="0.00" />
      </Field>

      {txDraft.type !== "transfer" && (
        <Field label="Categoria">
          <select
            value={txDraft.categoryId ?? ""}
            onChange={(e) => setTxDraft((d) => ({ ...d, categoryId: e.target.value || null, subcategoryId: null, subsubcategoryId: null }))}
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
      )}
      {txDraft.type !== "transfer" && selectedCategory && selectedCategory.subcategories.length > 0 && (
        <Field label="Subcategoria">
          <select value={txDraft.subcategoryId ?? ""} onChange={(e) => setTxDraft((d) => ({ ...d, subcategoryId: e.target.value || null, subsubcategoryId: null }))} style={inputStyle}>
            <option value="">Ninguna</option>
            {selectedCategory.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {txDraft.type !== "transfer" && selectedSubcategory && selectedSubcategory.subcategories.length > 0 && (
        <Field label="Sub-subcategoria">
          <select value={txDraft.subsubcategoryId ?? ""} onChange={(e) => setTxDraft((d) => ({ ...d, subsubcategoryId: e.target.value || null }))} style={inputStyle}>
            <option value="">Ninguna</option>
            {selectedSubcategory.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Comentario">
        <input value={txDraft.comment} onChange={(e) => setTxDraft((d) => ({ ...d, comment: e.target.value }))} style={inputStyle} placeholder="Opcional" />
      </Field>

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
          {txDraft.id ? "Guardar cambios" : "Guardar movimiento"}
        </button>
        <button type="button" onClick={onCancel} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 14px", color: T.textMuted, fontSize: 13 }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
