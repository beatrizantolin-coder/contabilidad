import { useState } from "react";
import type { CategoryKind, ID, LedgerDocument, RecurUnit, TransactionStatus } from "../types";
import type { TxDraft } from "../lib/txDraft";
import { Field } from "./Field";
import { ColorSwatches } from "./ColorSwatches";
import { T, dot, inputStyle, STATUSES, RECUR_UNITS, PALETTE } from "../theme";

const NEW_OPTION = "__new__";

export function TransactionForm({
  txDraft,
  setTxDraft,
  accounts,
  categories,
  documents,
  activeDocId,
  onDescriptionChange,
  onCreateCategory,
  onCreateSubcategory,
  onCreateSubSubcategory,
  setCategoryColor,
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
  onCreateCategory: (name: string, color: string, kind: CategoryKind) => ID;
  onCreateSubcategory: (catId: ID, name: string) => ID;
  onCreateSubSubcategory: (catId: ID, subId: ID, name: string) => ID;
  setCategoryColor: (id: ID, color: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const targetDocAccounts = (documents.find((d) => d.id === txDraft.toDocId) || documents.find((d) => d.id === activeDocId))?.accounts ?? [];
  const selectedCategory = categories.find((c) => c.id === txDraft.categoryId);
  const selectedSubcategory = selectedCategory?.subcategories.find((s) => s.id === txDraft.subcategoryId);
  const formCategoryOptions = txDraft.type === "income" ? categories.filter((c) => c.kind === "income") : categories.filter((c) => c.kind !== "income");

  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PALETTE[0]);

  const [newSubOpen, setNewSubOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");

  const [newSubSubOpen, setNewSubSubOpen] = useState(false);
  const [newSubSubName, setNewSubSubName] = useState("");

  const [descColorPickerOpen, setDescColorPickerOpen] = useState(false);

  function submitNewCategory() {
    if (!newCatName.trim()) return;
    const kind: CategoryKind = txDraft.type === "income" ? "income" : "expense";
    const id = onCreateCategory(newCatName.trim(), newCatColor, kind);
    setTxDraft((d) => ({ ...d, categoryId: id, subcategoryId: null, subsubcategoryId: null }));
    setNewCatName("");
    setNewCatColor(PALETTE[0]);
    setNewCatOpen(false);
  }
  function submitNewSubcategory() {
    if (!newSubName.trim() || !selectedCategory) return;
    const id = onCreateSubcategory(selectedCategory.id, newSubName.trim());
    setTxDraft((d) => ({ ...d, subcategoryId: id, subsubcategoryId: null }));
    setNewSubName("");
    setNewSubOpen(false);
  }
  function submitNewSubSubcategory() {
    if (!newSubSubName.trim() || !selectedCategory || !selectedSubcategory) return;
    const id = onCreateSubSubcategory(selectedCategory.id, selectedSubcategory.id, newSubSubName.trim());
    setTxDraft((d) => ({ ...d, subsubcategoryId: id }));
    setNewSubSubName("");
    setNewSubSubOpen(false);
  }

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
              onClick={() =>
                setTxDraft((d) => {
                  const wantKind = value === "income" ? "income" : value === "expense" ? "expense" : null;
                  const currentCat = categories.find((c) => c.id === d.categoryId);
                  const stillValid = !!wantKind && !!currentCat && currentCat.kind === wantKind;
                  const nextCat = stillValid ? currentCat : wantKind ? categories.find((c) => c.kind === wantKind) : undefined;
                  // Al pasar a Transferencia, la cuenta destino no puede coincidir con
                  // la de origen (si no, "guardar" no haría nada silenciosamente).
                  const toAccountId =
                    value === "transfer" && (d.toAccountId === d.accountId || !d.toAccountId)
                      ? (accounts.find((a) => a.id !== d.accountId)?.id ?? d.toAccountId)
                      : d.toAccountId;
                  return {
                    ...d,
                    type: value,
                    toDocId: value === "transfer" ? activeDocId : d.toDocId,
                    toAccountId,
                    categoryId: nextCat ? nextCat.id : d.categoryId,
                    subcategoryId: stillValid ? d.subcategoryId : null,
                    subsubcategoryId: stillValid ? d.subsubcategoryId : null,
                  };
                })
              }
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

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.textMuted }}>
          <input type="checkbox" checked={txDraft.recurringOn} onChange={(e) => setTxDraft((d) => ({ ...d, recurringOn: e.target.checked }))} />
          Movimiento recurrente
        </label>
        {txDraft.recurringOn && (
          <>
            <Field label="Periodicidad">
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
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Fecha inicio">
                  <input type="date" value={txDraft.date} onChange={(e) => setTxDraft((d) => ({ ...d, date: e.target.value }))} style={inputStyle} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Fecha final">
                  <input
                    type="date"
                    value={txDraft.recurringEndDate}
                    disabled={txDraft.freqNoEnd}
                    onChange={(e) => setTxDraft((d) => ({ ...d, recurringEndDate: e.target.value }))}
                    style={txDraft.freqNoEnd ? { ...inputStyle, background: T.borderSoft, color: T.textFaint } : inputStyle}
                  />
                </Field>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
              <input type="checkbox" checked={txDraft.freqNoEnd} onChange={(e) => setTxDraft((d) => ({ ...d, freqNoEnd: e.target.checked }))} />
              Sin fecha final (se repite indefinidamente)
            </label>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        {selectedCategory && (
          <button
            type="button"
            onClick={() => setDescColorPickerOpen((o) => !o)}
            style={{ background: "none", border: "none", padding: "0 0 8px 0", lineHeight: 0, flexShrink: 0 }}
            aria-label="Cambiar color de la categoria"
          >
            <span style={dot(selectedCategory.color, 14)} />
          </button>
        )}
        <div style={{ flex: 1 }}>
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
        </div>
      </div>
      {descColorPickerOpen && selectedCategory && (
        <div style={{ marginTop: -6 }}>
          <ColorSwatches value={selectedCategory.color} onChange={(c) => { setCategoryColor(selectedCategory.id, c); setDescColorPickerOpen(false); }} size={14} />
        </div>
      )}

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
            onChange={(e) => {
              const val = e.target.value;
              if (val === NEW_OPTION) {
                setNewCatOpen(true);
                return;
              }
              setTxDraft((d) => ({ ...d, categoryId: val || null, subcategoryId: null, subsubcategoryId: null }));
            }}
            style={inputStyle}
          >
            {formCategoryOptions.length === 0 && <option value="">Sin categorias</option>}
            {formCategoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW_OPTION}>+ Nueva categoria</option>
          </select>
        </Field>
      )}
      {txDraft.type !== "transfer" && newCatOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: T.bgElevated, border: "1px solid " + T.border, borderRadius: 8 }}>
          <input
            autoFocus
            placeholder="Nombre de la categoria"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitNewCategory();
              }
            }}
            style={inputStyle}
          />
          <ColorSwatches value={newCatColor} onChange={setNewCatColor} size={14} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={submitNewCategory} style={{ background: T.accent, border: "none", borderRadius: 6, padding: "6px 12px", color: "#fff", fontWeight: 600, fontSize: 12 }}>
              Crear
            </button>
            <button type="button" onClick={() => setNewCatOpen(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "6px 10px", color: T.textMuted, fontSize: 12 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {txDraft.type !== "transfer" && selectedCategory && (
        <Field label="Subcategoria">
          <select
            value={txDraft.subcategoryId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === NEW_OPTION) {
                setNewSubOpen(true);
                return;
              }
              setTxDraft((d) => ({ ...d, subcategoryId: val || null, subsubcategoryId: null }));
            }}
            style={inputStyle}
          >
            <option value="">Ninguna</option>
            {selectedCategory.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value={NEW_OPTION}>+ Nueva subcategoria</option>
          </select>
        </Field>
      )}
      {txDraft.type !== "transfer" && selectedCategory && newSubOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: T.bgElevated, border: "1px solid " + T.border, borderRadius: 8 }}>
          <input
            autoFocus
            placeholder="Nombre de la subcategoria"
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitNewSubcategory();
              }
            }}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={submitNewSubcategory} style={{ background: T.accent, border: "none", borderRadius: 6, padding: "6px 12px", color: "#fff", fontWeight: 600, fontSize: 12 }}>
              Crear
            </button>
            <button type="button" onClick={() => setNewSubOpen(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "6px 10px", color: T.textMuted, fontSize: 12 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {txDraft.type !== "transfer" && selectedCategory && selectedSubcategory && (
        <Field label="Sub-subcategoria">
          <select
            value={txDraft.subsubcategoryId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === NEW_OPTION) {
                setNewSubSubOpen(true);
                return;
              }
              setTxDraft((d) => ({ ...d, subsubcategoryId: val || null }));
            }}
            style={inputStyle}
          >
            <option value="">Ninguna</option>
            {selectedSubcategory.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value={NEW_OPTION}>+ Nueva sub-subcategoria</option>
          </select>
        </Field>
      )}
      {txDraft.type !== "transfer" && selectedCategory && selectedSubcategory && newSubSubOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: T.bgElevated, border: "1px solid " + T.border, borderRadius: 8 }}>
          <input
            autoFocus
            placeholder="Nombre de la sub-subcategoria"
            value={newSubSubName}
            onChange={(e) => setNewSubSubName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitNewSubSubcategory();
              }
            }}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={submitNewSubSubcategory} style={{ background: T.accent, border: "none", borderRadius: 6, padding: "6px 12px", color: "#fff", fontWeight: 600, fontSize: 12 }}>
              Crear
            </button>
            <button type="button" onClick={() => setNewSubSubOpen(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "6px 10px", color: T.textMuted, fontSize: 12 }}>
              Cancelar
            </button>
          </div>
        </div>
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
