import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import type { SavedFilter } from "../types";
import { T } from "../theme";
import { shortDate } from "../lib/format";

export function FiltersView({
  docName,
  savedFilters,
  onApply,
  onRemove,
  onNewFilter,
}: {
  docName: string;
  savedFilters: SavedFilter[];
  onApply: (sf: SavedFilter) => void;
  onRemove: (id: string) => void;
  onNewFilter: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <SlidersHorizontal size={17} style={{ color: T.accent }} /> Filtros
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: T.textMuted }}>Filtros guardados en {docName}. Haz clic en uno para aplicarlo.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 12 }}>
          <button onClick={onNewFilter} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "0 13px", height: 30, fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Nuevo filtro
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px", overflow: "auto", flex: 1, minHeight: 0 }}>
        {savedFilters.length === 0 && (
          <div style={{ fontSize: 13, color: T.textFaint }}>
            Sin filtros guardados todavia. Abre "Filtros" en la tabla de movimientos, ajusta lo que quieras y pulsa "Guardar".
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
          {savedFilters.map((sf) => {
            const f = sf.filters;
            const parts: string[] = [];
            if (f.search) parts.push('"' + f.search + '"');
            if (f.categories.length > 0) parts.push(f.categories.length + " categoria" + (f.categories.length === 1 ? "" : "s"));
            if (f.subcategories.length > 0) parts.push(f.subcategories.length + " subcategoria" + (f.subcategories.length === 1 ? "" : "s"));
            if (f.type !== "all") parts.push(f.type === "income" ? "Ingresos" : f.type === "expense" ? "Gastos" : "Transferencias");
            if (f.from) parts.push("desde " + shortDate(f.from));
            if (f.to) parts.push("hasta " + shortDate(f.to));
            return (
              <div key={sf.id} style={{ border: "1px solid " + T.border, borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => onApply(sf)} style={{ background: "none", border: "none", textAlign: "left", flex: 1, padding: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{sf.name}</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{parts.length > 0 ? parts.join(" - ") : "Sin condiciones"}</div>
                </button>
                <button onClick={() => onRemove(sf.id)} style={{ background: "none", border: "none", color: T.textFaint, padding: 4 }} aria-label={"Eliminar filtro " + sf.name}>
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
