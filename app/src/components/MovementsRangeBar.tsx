import { useState } from "react";
import { Eraser } from "lucide-react";
import { T, smallBtn } from "../theme";
import { quickRange, todayISO, endOfYearISO, type QuickRangeKey } from "../lib/format";
import { DateField } from "./DateField";

const QUICK_KEYS: readonly [QuickRangeKey, string][] = [
  ["1M", "1M"],
  ["3M", "3M"],
  ["6M", "6M"],
  ["1A", "1A"],
  ["finDeAno", "Fin de año"],
];

const defaultRange = () => ({ from: todayISO(), to: endOfYearISO() });

export function MovementsRangeBar({ onApply }: { onApply: (from: string, to: string) => void }) {
  const [draft, setDraft] = useState(defaultRange());
  const [preset, setPreset] = useState<QuickRangeKey | null>(null);

  function applyPreset(key: QuickRangeKey) {
    setPreset(key);
    setDraft(quickRange(key));
  }
  function reset() {
    setPreset(null);
    setDraft(defaultRange());
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", justifyContent: "flex-end", padding: 14, borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
      <button type="button" title="Restaurar rango" aria-label="Restaurar rango" onClick={reset} style={{ ...smallBtn(false), padding: "8px 9px" }}>
        <Eraser size={13} />
      </button>
      {QUICK_KEYS.map(([key, label]) => (
        <button key={key} type="button" onClick={() => applyPreset(key)} style={smallBtn(preset === key)}>
          {label}
        </button>
      ))}
      <DateField
        label="Desde"
        value={draft.from}
        onChange={(v) => {
          setPreset(null);
          setDraft((r) => ({ ...r, from: v }));
        }}
      />
      <DateField
        label="Hasta"
        value={draft.to}
        onChange={(v) => {
          setPreset(null);
          setDraft((r) => ({ ...r, to: v }));
        }}
      />
      <button
        type="button"
        onClick={() => draft.from && draft.to && onApply(draft.from, draft.to)}
        disabled={!draft.from || !draft.to}
        style={{ background: T.accent, border: "none", borderRadius: 6, padding: "0 14px", height: 34, color: "#fff", fontSize: 12.5, fontWeight: 600, opacity: !draft.from || !draft.to ? 0.5 : 1 }}
      >
        Mostrar
      </button>
    </div>
  );
}
