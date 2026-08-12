import { useState } from "react";
import { T, inputStyle, smallBtn } from "../theme";
import { endOfYearISO, monthsAgoISO, todayISO } from "../lib/format";
import { Field } from "./Field";

export function MovementsRangeBar({ onApply }: { onApply: (from: string, to: string) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preset, setPreset] = useState<string | null>(null);

  function applyPreset(key: string, presetFrom: string, presetTo: string) {
    setPreset(key);
    setFrom(presetFrom);
    setTo(presetTo);
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", padding: 14, borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
      <div style={{ display: "flex", gap: 6 }}>
        {(
          [
            ["1m", "1M", () => [monthsAgoISO(1), todayISO()]],
            ["3m", "3M", () => [monthsAgoISO(3), todayISO()]],
            ["6m", "6M", () => [monthsAgoISO(6), todayISO()]],
            ["yearend", "Fin de año", () => [todayISO(), endOfYearISO()]],
          ] as const
        ).map(([key, label, range]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              const [f, t] = range();
              applyPreset(key, f, t);
            }}
            style={smallBtn(preset === key)}
          >
            {label}
          </button>
        ))}
      </div>
      <Field label="dd/mm/aaaa desde">
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setPreset(null);
            setFrom(e.target.value);
          }}
          style={{ ...inputStyle, width: 150 }}
        />
      </Field>
      <Field label="dd/mm/aaaa hasta">
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setPreset(null);
            setTo(e.target.value);
          }}
          style={{ ...inputStyle, width: 150 }}
        />
      </Field>
      <button
        type="button"
        onClick={() => from && to && onApply(from, to)}
        disabled={!from || !to}
        style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 14px", color: "#fff", fontSize: 12.5, fontWeight: 600, opacity: !from || !to ? 0.5 : 1 }}
      >
        Mostrar
      </button>
    </div>
  );
}
