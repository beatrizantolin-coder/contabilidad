import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import type { Category, ID, Transaction } from "../types";
import type { ProgramadorRow } from "../lib/recurring";
import { T, dot, smallBtn } from "../theme";
import { fmt, freqLabel, freqPerMonth, monthYearLabel, shortDate } from "../lib/format";
import { catInfo } from "../lib/categories";

const GRID_COLUMNS = "80px 130px 70px 100px 1fr 100px 56px";

type ProgramadorSort = "fecha" | "cuenta" | "tipo" | "periodicidad" | "descripcion" | "importe";

export function RecurringView({
  docName,
  programadorRows,
  netPerMonth,
  categories,
  accountName,
  onNewScheduled,
  onOpenRow,
  onRemove,
}: {
  docName: string;
  programadorRows: ProgramadorRow[];
  netPerMonth: number;
  categories: Category[];
  accountName: (id: ID) => string;
  onNewScheduled: () => void;
  onOpenRow: (row: ProgramadorRow) => void;
  onRemove: (t: Transaction) => void;
}) {
  const [sortBy, setSortBy] = useState<ProgramadorSort>("fecha");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const sorters: Record<ProgramadorSort, (a: ProgramadorRow, b: ProgramadorRow) => number> = {
    fecha: (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0),
    cuenta: (a, b) => accountName(a.tx.accountId).localeCompare(accountName(b.tx.accountId)) || (a.date < b.date ? -1 : 1),
    tipo: (a, b) => a.tx.type.localeCompare(b.tx.type) || (a.date < b.date ? -1 : 1),
    periodicidad: (a, b) => (a.tx.recurring ? freqPerMonth(a.tx.recurring) : 0) - (b.tx.recurring ? freqPerMonth(b.tx.recurring) : 0),
    descripcion: (a, b) => a.tx.name.localeCompare(b.tx.name),
    importe: (a, b) => Number(a.tx.amount) - Number(b.tx.amount),
  };
  const sorted = programadorRows.slice().sort(sorters[sortBy]);

  const groups: { label: string | null; rows: ProgramadorRow[] }[] = [];
  if (sortBy === "cuenta") {
    sorted.forEach((row) => {
      const label = accountName(row.tx.accountId);
      let g = groups.find((x) => x.label === label);
      if (!g) {
        g = { label, rows: [] };
        groups.push(g);
      }
      g.rows.push(row);
    });
  } else if (sortBy === "tipo") {
    sorted.forEach((row) => {
      const label = row.tx.type === "income" ? "Ingresos" : "Gastos";
      let g = groups.find((x) => x.label === label);
      if (!g) {
        g = { label, rows: [] };
        groups.push(g);
      }
      g.rows.push(row);
    });
  } else if (sortBy === "fecha") {
    sorted.forEach((row) => {
      const label = monthYearLabel(row.date);
      let g = groups.find((x) => x.label === label);
      if (!g) {
        g = { label, rows: [] };
        groups.push(g);
      }
      g.rows.push(row);
    });
  } else {
    groups.push({ label: null, rows: sorted });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 4px" }}>
        <div>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0 }}>Programador</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Proxima instancia de cada movimiento recurrente en {docName}.</p>
        </div>
        <button onClick={onNewScheduled} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          <Plus size={14} /> Nueva operacion
        </button>
      </div>

      {programadorRows.length > 0 && (
        <div style={{ padding: "10px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 13, color: T.textMuted }}>
            Neto recurrente:{" "}
            <span className="amount" style={{ color: netPerMonth < 0 ? T.expense : T.income, fontWeight: 700 }}>
              {fmt(netPerMonth)}
            </span>{" "}
            / mes
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.04em" }}>Agrupar por</span>
            {(
              [
                ["fecha", "Fecha"],
                ["cuenta", "Cuenta"],
                ["tipo", "Tipo"],
              ] as const
            ).map(([value, label]) => (
              <button key={value} onClick={() => setSortBy(value)} style={smallBtn(sortBy === value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {programadorRows.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textFaint, padding: "18px 24px" }}>Sin movimientos recurrentes todavia.</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", marginTop: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, padding: "7px 24px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0, zIndex: 1 }}>
            <SortHeader value="fecha" label="Fecha" sortBy={sortBy} setSortBy={setSortBy} />
            <SortHeader value="cuenta" label="Cuenta" sortBy={sortBy} setSortBy={setSortBy} />
            <SortHeader value="tipo" label="Tipo" sortBy={sortBy} setSortBy={setSortBy} />
            <SortHeader value="periodicidad" label="Periodicidad" sortBy={sortBy} setSortBy={setSortBy} />
            <SortHeader value="descripcion" label="Descripcion" sortBy={sortBy} setSortBy={setSortBy} />
            <span style={{ textAlign: "right" }}>
              <SortHeader value="importe" label="Importe" sortBy={sortBy} setSortBy={setSortBy} align="right" />
            </span>
            <span />
          </div>

          {groups.map((g, gi) => {
            const gKey = g.label || "g" + gi;
            const gCollapsed = collapsedGroups.has(gKey);
            return (
            <div key={gi}>
              {g.label && (
                <button
                  onClick={() =>
                    setCollapsedGroups((prev) => {
                      const next = new Set(prev);
                      if (next.has(gKey)) next.delete(gKey);
                      else next.add(gKey);
                      return next;
                    })
                  }
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "8px 24px 4px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  {gCollapsed ? <ChevronRight size={12} style={{ color: T.textMuted }} /> : <ChevronDown size={12} style={{ color: T.textMuted }} />}
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>{g.label}</span>
                  <span style={{ fontSize: 10.5, color: T.textFaint }}>({g.rows.length})</span>
                </button>
              )}
              {!gCollapsed && g.rows.map((row) => {
                const t = row.tx;
                if (!t.recurring) return null;
                const info = t.type === "income" || t.type === "expense" ? catInfo(categories, t.categoryId, t.subcategoryId, t.subsubcategoryId) : { name: "-", color: T.textFaint };
                const realColor = t.type === "income" ? T.income : T.expense;
                return (
                  <div
                    key={t.id + "-" + row.date}
                    className="accrow"
                    onClick={() => onOpenRow(row)}
                    style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, alignItems: "center", padding: "8px 24px", fontSize: 13, borderBottom: "1px solid " + T.borderSoft, cursor: "pointer", opacity: row.real ? 1 : 0.7 }}
                  >
                    <span className="amount" style={{ color: T.textMuted, fontSize: 12 }}>
                      {shortDate(row.date)}
                    </span>
                    <span style={{ color: T.textMuted, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{accountName(t.accountId)}</span>
                    <span style={{ color: t.type === "income" ? T.income : T.expense, fontSize: 12 }}>{t.type === "income" ? "Ingreso" : "Gasto"}</span>
                    <span style={{ color: T.textMuted, fontSize: 12 }}>{freqLabel(t.recurring)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, color: T.text }}>
                      <span style={dot(info.color, 8)} />
                      {t.name}
                    </span>
                    <span style={{ textAlign: "right" }}>
                      {t.recurring.amountMode === "variable" && (
                        <span style={{ fontSize: 9.5, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.03em", marginRight: 6 }}>Variable</span>
                      )}
                      <span className="amount" style={{ color: realColor, fontWeight: 500 }}>
                        {t.type === "income" ? "+" : "-"}
                        {fmt(Math.abs(t.amount))}
                      </span>
                    </span>
                    <span style={{ display: "flex", gap: 4, justifySelf: "end" }}>
                      <button onClick={(e) => { e.stopPropagation(); onOpenRow(row); }} style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Editar">
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (row.real) onRemove(t); }}
                        style={{ background: "none", border: "none", color: row.real ? T.textFaint : T.borderSoft, padding: 2, cursor: row.real ? "pointer" : "default" }}
                        aria-label="Eliminar"
                        disabled={!row.real}
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortHeader({
  value,
  label,
  sortBy,
  setSortBy,
  align,
}: {
  value: ProgramadorSort;
  label: string;
  sortBy: ProgramadorSort;
  setSortBy: (v: ProgramadorSort) => void;
  align?: "left" | "right";
}) {
  const active = sortBy === value;
  return (
    <button
      onClick={() => setSortBy(value)}
      style={{
        display: "flex", alignItems: "center", gap: 3, justifyContent: align === "right" ? "flex-end" : "flex-start",
        background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer",
        textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5,
        color: active ? T.text : T.textMuted, fontWeight: active ? 700 : 600,
      }}
    >
      {label}
    </button>
  );
}
