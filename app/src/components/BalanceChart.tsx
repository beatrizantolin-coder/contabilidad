import { useState } from "react";
import { T } from "../theme";
import { fmt } from "../lib/format";
import type { EvoPoint, EvoRange, EvoTick } from "../lib/evolution";

const firstOfMonthISO = (): string => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
};
const endOfNthMonthISO = (n: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + n + 1, 0);
  return d.toISOString().slice(0, 10);
};

interface EvoMarker {
  xPct: number;
  date: string;
  balance: number;
}

export function BalanceChart({ points, ticks, evoRange, setEvoRange }: { points: EvoPoint[]; ticks: EvoTick[]; evoRange: EvoRange; setEvoRange: (fn: (r: EvoRange) => EvoRange) => void }) {
  const [customDraft, setCustomDraft] = useState<EvoRange>({ from: evoRange.from, to: evoRange.to });
  const [marker, setMarker] = useState<EvoMarker | null>(null);

  const hasData = points.length > 0;
  const evoMinB = hasData ? Math.min(0, ...points.map((p) => p.balance)) : 0;
  const evoMaxB = hasData ? Math.max(1, ...points.map((p) => p.balance)) : 1;
  const evoRangeB = evoMaxB - evoMinB || 1;
  const evoMinT = hasData ? points[0].time : 0;
  const evoMaxT = hasData ? points[points.length - 1].time : 1;
  const evoRangeT = evoMaxT - evoMinT || 1;
  const evoX = (t: number) => ((t - evoMinT) / evoRangeT) * 1000;
  const evoY = (b: number) => 10 + (1 - (b - evoMinB) / evoRangeB) * 118;

  let evoLinePath = "";
  points.forEach((p, i) => {
    if (i === 0) evoLinePath = "M " + evoX(p.time) + " " + evoY(p.balance);
    else evoLinePath += " L " + evoX(p.time) + " " + evoY(points[i - 1].balance) + " L " + evoX(p.time) + " " + evoY(p.balance);
  });
  const evoAreaPath = hasData ? evoLinePath + " L " + evoX(points[points.length - 1].time) + " " + evoY(0) + " L " + evoX(points[0].time) + " " + evoY(0) + " Z" : "";

  const presetActive = (n: number) => evoRange.from === firstOfMonthISO() && evoRange.to === endOfNthMonthISO(n - 1);

  function applyPreset(n: number) {
    const range = { from: firstOfMonthISO(), to: endOfNthMonthISO(n - 1) };
    setEvoRange(() => range);
    setCustomDraft(range);
    setMarker(null);
  }

  return (
    <div style={{ borderTop: "1px solid " + T.border }}>
      <div style={{ background: "#E7E7EB", padding: "6px 20px", fontSize: 12.5, fontWeight: 700, color: T.text, borderBottom: "1px solid " + T.border, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span>Prevision de balance</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
          {(
            [
              [1, "1M"],
              [3, "3M"],
              [6, "6M"],
              [12, "1A"],
            ] as const
          ).map(([n, label]) => (
            <button
              key={n}
              onClick={() => applyPreset(n)}
              style={{
                background: presetActive(n) ? T.accent : "#FFFFFF",
                color: presetActive(n) ? "#fff" : T.textMuted,
                border: "1px solid " + (presetActive(n) ? T.accent : T.border),
                borderRadius: 5,
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}
          <input
            type="date"
            value={customDraft.from}
            onChange={(e) => setCustomDraft((r) => ({ ...r, from: e.target.value }))}
            style={{ border: "1px solid " + T.border, borderRadius: 5, padding: "3px 6px", fontSize: 11, background: "#FFFFFF", color: T.text }}
          />
          <span style={{ color: T.textFaint }}>-</span>
          <input
            type="date"
            value={customDraft.to}
            onChange={(e) => setCustomDraft((r) => ({ ...r, to: e.target.value }))}
            style={{ border: "1px solid " + T.border, borderRadius: 5, padding: "3px 6px", fontSize: 11, background: "#FFFFFF", color: T.text }}
          />
          <button
            onClick={() => {
              setEvoRange(() => ({ ...customDraft }));
              setMarker(null);
            }}
            style={{ background: T.accent, border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 600, color: "#fff" }}
          >
            Mostrar
          </button>
        </div>
      </div>
      {!hasData ? (
        <div style={{ padding: "18px 20px", color: T.textMuted, fontSize: 12.5 }}>Sin datos suficientes todavia.</div>
      ) : (
        <div style={{ padding: "12px 44px 8px 20px", background: T.bg, position: "relative" }}>
          <svg
            viewBox="0 0 1000 128"
            width="100%"
            height="150"
            preserveAspectRatio="none"
            style={{ cursor: "crosshair" }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              const clickTime = evoMinT + relX * evoRangeT;
              let bal = points[0].balance;
              for (let i = 0; i < points.length; i++) {
                if (points[i].time <= clickTime) bal = points[i].balance;
                else break;
              }
              const dateLabel = new Date(clickTime).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
              setMarker({ xPct: relX * 100, date: dateLabel, balance: bal });
            }}
          >
            <line x1="0" y1={evoY(evoMaxB)} x2="1000" y2={evoY(evoMaxB)} stroke={T.borderSoft} strokeDasharray="4 3" />
            {evoMinB < 0 && <line x1="0" y1={evoY(evoMinB)} x2="1000" y2={evoY(evoMinB)} stroke={T.borderSoft} strokeDasharray="4 3" />}
            <line x1="0" y1={evoY(0)} x2="1000" y2={evoY(0)} stroke={T.border} strokeWidth="1" />
            <path d={evoAreaPath} fill={T.accent} fillOpacity="0.13" stroke="none" />
            <path d={evoLinePath} fill="none" stroke={T.accent} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            {marker && <line x1={marker.xPct * 10} y1="0" x2={marker.xPct * 10} y2="128" stroke={T.text} strokeWidth="1" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />}
          </svg>
          {marker && (
            <div
              style={{
                position: "absolute",
                top: 4,
                left: "calc(" + marker.xPct + "% + 20px)",
                transform: marker.xPct > 70 ? "translateX(-100%)" : "translateX(-6px)",
                background: T.text,
                color: "#fff",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 10.5,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              {marker.date} · <span className="amount">{fmt(marker.balance)}</span>
            </div>
          )}
          <span style={{ position: "absolute", right: 4, top: 12 - 6 + (evoY(evoMaxB) / 128) * 126, fontSize: 10, color: T.textMuted }}>{fmt(evoMaxB)}</span>
          <span style={{ position: "absolute", right: 4, top: 12 - 6 + (evoY(0) / 128) * 126, fontSize: 10, color: T.textMuted }}>{fmt(0)}</span>
          {evoMinB < 0 && <span style={{ position: "absolute", right: 4, top: 12 - 6 + (evoY(evoMinB) / 128) * 126, fontSize: 10, color: T.textMuted }}>{fmt(evoMinB)}</span>}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textFaint, marginTop: 2 }}>
            {ticks.map((tk, i) => (
              <span key={i}>{tk.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
