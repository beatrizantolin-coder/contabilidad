import { useState } from "react";
import { Eraser, Search } from "lucide-react";
import type { Category, Filters, ID } from "../types";
import { T, dot, inputStyle, smallBtn } from "../theme";
import { Field } from "./Field";
import { DateField } from "./DateField";
import { quickRange, type QuickRangeKey } from "../lib/format";

const QUICK_KEYS: readonly [QuickRangeKey, string][] = [
  ["1M", "1M"],
  ["3M", "3M"],
  ["6M", "6M"],
  ["1A", "1A"],
  ["finDeAno", "Fin de año"],
];

const emptyFilters = (): Filters => ({ search: "", categories: [], subcategories: [], type: "all", from: "", to: "" });

export function FiltersBar({
  filters,
  setFilters,
  categories,
  onSaveFilter,
}: {
  filters: Filters;
  setFilters: (fn: (f: Filters) => Filters) => void;
  categories: Category[];
  onSaveFilter: (name: string) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState<"categoria" | "subcategoria" | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [dateDraft, setDateDraft] = useState({ from: filters.from, to: filters.to });
  const [preset, setPreset] = useState<QuickRangeKey | null>(null);

  function applyPreset(key: QuickRangeKey) {
    setPreset(key);
    setDateDraft(quickRange(key));
  }
  function resetAll() {
    setPreset(null);
    setDateDraft({ from: "", to: "" });
    setFilters(() => emptyFilters());
  }
  function showDateRange() {
    setFilters((f) => ({ ...f, from: dateDraft.from, to: dateDraft.to }));
  }

  const filterCategoryChoices = filters.type === "income" ? categories.filter((c) => c.kind === "income") : filters.type === "expense" ? categories.filter((c) => c.kind !== "income") : categories;
  const filterCategoryPool = filters.categories.length === 0 ? filterCategoryChoices : filterCategoryChoices.filter((c) => filters.categories.includes(c.id));
  const filterSubcategoryOptions = filterCategoryPool.flatMap((c) => c.subcategories.map((s) => ({ id: s.id, label: c.name + " / " + s.name })));

  function handleTypeChange(val: Filters["type"]) {
    setFilters((f) => {
      if (val !== "income" && val !== "expense") return { ...f, type: val };
      const keepCats = f.categories.filter((cid) => {
        const c = categories.find((x) => x.id === cid);
        return !!c && (val === "income") === (c.kind === "income");
      });
      const validSubIds = new Set(categories.filter((c) => keepCats.includes(c.id)).flatMap((c) => c.subcategories.map((s) => s.id)));
      const keepSubs = keepCats.length === 0 ? f.subcategories : f.subcategories.filter((sid) => validSubIds.has(sid));
      return { ...f, type: val, categories: keepCats, subcategories: keepSubs };
    });
  }

  function toggleFilterCategory(id: ID) {
    setFilters((f) => {
      const has = f.categories.includes(id);
      const newCats = has ? f.categories.filter((x) => x !== id) : f.categories.concat([id]);
      const validIds = newCats.length === 0 ? null : new Set(categories.filter((c) => newCats.includes(c.id)).flatMap((c) => c.subcategories.map((s) => s.id)));
      const newSubs = validIds ? f.subcategories.filter((sid) => validIds.has(sid)) : f.subcategories;
      return { ...f, categories: newCats, subcategories: newSubs };
    });
  }

  function toggleFilterSubcategory(id: ID) {
    setFilters((f) => ({ ...f, subcategories: f.subcategories.includes(id) ? f.subcategories.filter((x) => x !== id) : f.subcategories.concat([id]) }));
  }

  function submitSaveFilter(e: React.FormEvent) {
    e.preventDefault();
    if (!saveName.trim()) return;
    onSaveFilter(saveName.trim());
    setSaveName("");
    setShowSaveForm(false);
  }

  return (
    <div style={{ padding: 14, borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <Field label="Descripcion">
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: 10, color: T.textFaint }} />
            <input id="filtros-search-input" placeholder="Buscar" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} style={{ ...inputStyle, paddingLeft: 28, width: 150 }} />
          </div>
        </Field>

        <Field label="Tipo">
          <select value={filters.type} onChange={(e) => handleTypeChange(e.target.value as Filters["type"])} style={{ ...inputStyle, width: 150 }}>
            <option value="all">Todos los tipos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="transfer">Transferencia</option>
          </select>
        </Field>

        <Field label="Categoria">
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setPopoverOpen((p) => (p === "categoria" ? null : "categoria"))}
              style={{ ...inputStyle, width: 150, textAlign: "left", cursor: "pointer", color: filters.categories.length === 0 ? T.textFaint : T.text }}
            >
              {filters.categories.length === 0 ? "Todas" : filters.categories.length + " seleccionada" + (filters.categories.length === 1 ? "" : "s")}
            </button>
            {popoverOpen === "categoria" && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, padding: 8, zIndex: 30, minWidth: 190, maxHeight: 240, overflowY: "auto", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}>
                {filterCategoryChoices.length === 0 && <div style={{ fontSize: 12, color: T.textFaint, padding: 6 }}>Sin categorias.</div>}
                {filterCategoryChoices.map((c) => (
                  <button key={c.id} type="button" onClick={() => toggleFilterCategory(c.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 4px", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + (filters.categories.includes(c.id) ? T.accent : T.border), background: filters.categories.includes(c.id) ? T.accent : "#FFFFFF" }} />
                    <span style={dot(c.color, 8)} />
                    <span style={{ fontSize: 12.5, lineHeight: 1 }}>{c.name}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setPopoverOpen(null)} style={{ marginTop: 6, width: "100%", background: T.accent, border: "none", borderRadius: 6, padding: "6px 0", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                  Hecho
                </button>
              </div>
            )}
          </div>
        </Field>

        <Field label="Subcategorias">
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setPopoverOpen((p) => (p === "subcategoria" ? null : "subcategoria"))}
              style={{ ...inputStyle, width: 150, textAlign: "left", cursor: "pointer", color: filters.subcategories.length === 0 ? T.textFaint : T.text }}
            >
              {filters.subcategories.length === 0 ? "Todas" : filters.subcategories.length + " seleccionada" + (filters.subcategories.length === 1 ? "" : "s")}
            </button>
            {popoverOpen === "subcategoria" && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, padding: 8, zIndex: 30, minWidth: 210, maxHeight: 240, overflowY: "auto", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}>
                {filterSubcategoryOptions.length === 0 && <div style={{ fontSize: 12, color: T.textFaint, padding: 6 }}>Sin subcategorias.</div>}
                {filterSubcategoryOptions.map((s) => (
                  <button key={s.id} type="button" onClick={() => toggleFilterSubcategory(s.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 4px", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, border: "2px solid " + (filters.subcategories.includes(s.id) ? T.accent : T.border), background: filters.subcategories.includes(s.id) ? T.accent : "#FFFFFF" }} />
                    <span style={{ fontSize: 12.5 }}>{s.label}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setPopoverOpen(null)} style={{ marginTop: 6, width: "100%", background: T.accent, border: "none", borderRadius: 6, padding: "6px 0", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                  Hecho
                </button>
              </div>
            )}
          </div>
        </Field>

        <button type="button" title="Limpiar filtros" aria-label="Limpiar filtros" onClick={resetAll} style={{ ...smallBtn(false), padding: "8px 9px" }}>
          <Eraser size={13} />
        </button>

        {QUICK_KEYS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => applyPreset(key)} style={smallBtn(preset === key)}>
            {label}
          </button>
        ))}

        <DateField
          label="Desde"
          value={dateDraft.from}
          onChange={(v) => {
            setPreset(null);
            setDateDraft((r) => ({ ...r, from: v }));
          }}
        />
        <DateField
          label="Hasta"
          value={dateDraft.to}
          onChange={(v) => {
            setPreset(null);
            setDateDraft((r) => ({ ...r, to: v }));
          }}
        />

        <button
          type="button"
          onClick={showDateRange}
          style={{ background: T.accent, border: "none", borderRadius: 6, padding: "0 14px", height: 34, color: "#fff", fontSize: 12.5, fontWeight: 600 }}
        >
          Mostrar
        </button>

        <button onClick={() => setShowSaveForm((s) => !s)} style={smallBtn(showSaveForm)}>
          Guardar
        </button>
      </div>

      {showSaveForm && (
        <form onSubmit={submitSaveFilter} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
          <input autoFocus placeholder="Nombre del filtro" value={saveName} onChange={(e) => setSaveName(e.target.value)} style={{ ...inputStyle, width: 200 }} />
          <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "7px 12px", color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
            Guardar filtro
          </button>
          <button type="button" onClick={() => setShowSaveForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 10px", color: T.textMuted, fontSize: 12.5 }}>
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
