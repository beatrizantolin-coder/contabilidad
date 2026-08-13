import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Category, ID, Transaction } from "../types";
import type { ProgramadorRow } from "../lib/recurring";
import { T, dot, statusInfo } from "../theme";
import { fmt, freqLabel, monthYearLabel, shortDate } from "../lib/format";
import { catInfo } from "../lib/categories";

const GRID_COLUMNS = "80px 130px 110px 60px 1fr 110px 56px";

type ProgramadorSort = "fecha" | "cuenta" | "descripcion" | "importe";

export function RecurringView({
  docName,
  programadorRows,
  netPerMonth,
  categories,
  accountName,
  onNewScheduled,
  onEdit,
  onRemove,
}: {
  docName: string;
  programadorRows: ProgramadorRow[];
  netPerMonth: number;
  categories: Category[];
  accountName: (id: ID) => string;
  onNewScheduled: () => void;
  onEdit: (t: Transaction) => void;
  onRemove: (t: Transaction) => void;
}) {
  const [sortBy, setSortBy] = useState<ProgramadorSort>("fecha");
  const programadoInfo = statusInfo("programado");
  const ClockIcon = programadoInfo.icon;

  const sorters: Record<ProgramadorSort, (a: ProgramadorRow, b: ProgramadorRow) => number> = {
    fecha: (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0),
    cuenta: (a, b) => accountName(a.tx.accountId).localeCompare(accountName(b.tx.accountId)) || (a.date < b.date ? -1 : 1),
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
          <Plus size={14} /> Nueva programada
        </button>
      </div>

      {programadorRows.length > 0 && (
        <div style={{ padding: "10px 24px 0", fontSize: 13, color: T.textMuted }}>
          Neto recurrente:{" "}
          <span className="amount" style={{ color: netPerMonth < 0 ? T.expense : T.income, fontWeight: 700 }}>
            {fmt(netPerMonth)}
          </span>{" "}
          / mes
        </div>
      )}

      {programadorRows.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textFaint, padding: "18px 24px" }}>Sin movimientos recurrentes todavia.</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", marginTop: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, padding: "7px 24px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0, zIndex: 1 }}>
            <SortHeader value="fecha" label="Fecha" sortBy={sortBy} setSortBy={setSortBy} />
            <SortHeader value="cuenta" label="Cuenta" sortBy={sortBy} setSortBy={setSortBy} />
            <span style={{ textTransform: "uppercase", fontWeight: 700, color: T.text }}>Periodicidad</span>
            <span style={{ textAlign: "center", textTransform: "uppercase", fontWeight: 700, color: T.text }}>Estado</span>
            <SortHeader value="descripcion" label="Descripcion" sortBy={sortBy} setSortBy={setSortBy} />
            <span style={{ textAlign: "right" }}>
              <SortHeader value="importe" label="Importe" sortBy={sortBy} setSortBy={setSortBy} align="right" />
            </span>
            <span />
          </div>

          {groups.map((g, gi) => (
            <div key={gi}>
              {g.label && <div style={{ padding: "8px 24px 4px", fontSize: 11.5, fontWeight: 700, color: T.accent }}>{g.label}</div>}
              {g.rows.map((row) => {
                const t = row.tx;
                if (!t.recurring) return null;
                const info = t.type === "income" || t.type === "expense" ? catInfo(categories, t.categoryId, t.subcategoryId, t.subsubcategoryId) : { name: "-", color: T.textFaint };
                const realColor = t.type === "income" ? T.income : T.expense;
                return (
                  <div
                    key={t.id + "-" + row.date}
                    className="accrow"
                    onClick={() => row.real && onEdit(t)}
                    style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, alignItems: "center", padding: "8px 24px", fontSize: 13, borderBottom: "1px solid " + T.borderSoft, cursor: row.real ? "pointer" : "default", opacity: row.real ? 1 : 0.7 }}
                  >
                    <span className="amount" style={{ color: T.textMuted, fontSize: 12 }}>
                      {shortDate(row.date)}
                    </span>
                    <span style={{ color: T.textMuted, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{accountName(t.accountId)}</span>
                    <span style={{ color: T.textMuted, fontSize: 12 }}>{freqLabel(t.recurring)}</span>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", color: programadoInfo.color }}>
                      <ClockIcon size={15} />
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, color: T.text }}>
                      <span style={dot(info.color, 8)} />
                      {t.name}
                    </span>
                    <span className="amount" style={{ textAlign: "right", color: realColor, fontWeight: 500 }}>
                      {t.type === "income" ? "+" : "-"}
                      {fmt(Math.abs(t.amount))}
                    </span>
                    <span style={{ display: "flex", gap: 4, justifySelf: "end" }}>
                      {row.real && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Editar">
                            <Pencil size={12} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onRemove(t); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Eliminar">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
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
        background: "none", border: "none", padding: 0, margin: 0, font: "inherit", cursor: "pointer",
        color: active ? T.text : "inherit", textTransform: "inherit", letterSpacing: "inherit", fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}
