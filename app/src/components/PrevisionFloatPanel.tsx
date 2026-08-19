import { useState } from "react";
import { LineChart, X } from "lucide-react";
import { T, dot, tinyBtn } from "../theme";
import { fmt, quickRange, shortDate, type QuickRangeKey } from "../lib/format";
import type { EvoRange, PrevisionMovement } from "../lib/evolution";
import type { Category, ID } from "../types";
import { catInfo } from "../lib/categories";
import { DateField } from "./DateField";

const QUICK_KEYS: readonly [QuickRangeKey, string][] = [
  ["1M", "1M"],
  ["3M", "3M"],
  ["6M", "6M"],
  ["1A", "1A"],
  ["finDeAno", "Fin de año"],
];

/** Panel flotante de Previsión de balance, independiente de la pantalla
 * central Previsiones: se abre desde el icono de la barra de estado y se
 * desliza hacia arriba desde ella, sin ocupar toda la pantalla. */
export function PrevisionFloatPanel({
  movements,
  categories,
  accountName,
  evoRange,
  setEvoRange,
  onClose,
}: {
  movements: PrevisionMovement[];
  categories: Category[];
  accountName: (id: ID) => string;
  evoRange: EvoRange;
  setEvoRange: (fn: (r: EvoRange) => EvoRange) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<EvoRange>({ from: evoRange.from, to: evoRange.to });
  const [preset, setPreset] = useState<QuickRangeKey | null>(null);

  function applyPreset(key: QuickRangeKey) {
    setPreset(key);
    const range = quickRange(key);
    setDraft(range);
    setEvoRange(() => range);
  }
  function showCustomRange() {
    setPreset(null);
    setEvoRange(() => ({ ...draft }));
  }

  return (
    <div
      style={{
        position: "absolute", bottom: "100%", left: 0, right: 0, maxHeight: 420, background: "#FFFFFF",
        borderTop: "1px solid " + T.border, boxShadow: "0 -8px 20px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", zIndex: 40,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 4px" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
          <LineChart size={15} style={{ color: T.accent }} /> Previsión de balance
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label="Cerrar">
          <X size={15} />
        </button>
      </div>
      <div style={{ padding: "8px 20px 14px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {QUICK_KEYS.map(([key, label]) => (
          <button key={key} onClick={() => applyPreset(key)} style={tinyBtn(preset === key)}>
            {label}
          </button>
        ))}
        <DateField value={draft.from} width={112} onChange={(v) => { setPreset(null); setDraft((r) => ({ ...r, from: v })); }} />
        <span style={{ color: T.textFaint }}>-</span>
        <DateField value={draft.to} width={112} onChange={(v) => { setPreset(null); setDraft((r) => ({ ...r, to: v })); }} />
        <button onClick={showCustomRange} style={tinyBtn(false)}>
          Mostrar
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {movements.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textFaint, padding: "10px 20px" }}>Sin movimientos previstos en este rango.</div>
        ) : (
          movements.slice(0, 30).map((m, idx) => {
            const t = m.tx;
            const isTransfer = t.type === "transfer" || t.type === "transfer_in";
            const info = isTransfer ? { color: T.transfer } : catInfo(categories, t.categoryId, t.subcategoryId, t.subsubcategoryId);
            const color = t.type === "income" ? T.income : isTransfer ? T.transfer : T.expense;
            return (
              <div
                key={t.id + "-" + m.date + "-" + idx}
                style={{ display: "grid", gridTemplateColumns: "74px 130px 1fr 110px", alignItems: "center", padding: "5px 20px", fontSize: 12, borderBottom: "1px solid " + T.borderSoft, opacity: m.real ? 1 : 0.6 }}
              >
                <span className="amount" style={{ color: T.textMuted, fontSize: 11.5 }}>
                  {shortDate(m.date)}
                </span>
                <span style={{ color: T.textMuted, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{accountName(t.accountId)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                  <span style={dot(info.color, 7)} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                </span>
                <span className="amount" style={{ textAlign: "right", color, fontWeight: 500 }}>
                  {t.type === "income" ? "+" : "-"}
                  {fmt(Math.abs(m.amount))}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
