import { T } from "../theme";
import { fmt } from "../lib/format";
import type { EvoPoint, EvoRange, EvoTick } from "../lib/evolution";

const monthsAgoISO = (n: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

export function BalanceChart({ points, ticks, evoRange, setEvoRange }: { points: EvoPoint[]; ticks: EvoTick[]; evoRange: EvoRange; setEvoRange: (fn: (r: EvoRange) => EvoRange) => void }) {
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

  const presetActive = (n: number) => evoRange.to === "" && evoRange.from === monthsAgoISO(n);

  return (
    <div style={{ borderTop: "1px solid " + T.border }}>
      <div style={{ background: "#E7E7EB", padding: "6px 20px", fontSize: 12.5, fontWeight: 700, color: T.text, borderBottom: "1px solid " + T.border, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span>Evolucion del balance</span>
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
              onClick={() => setEvoRange(() => ({ from: monthsAgoISO(n), to: "" }))}
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
          <button
            onClick={() => setEvoRange(() => ({ from: "", to: "" }))}
            style={{
              background: evoRange.from === "" && evoRange.to === "" ? T.accent : "#FFFFFF",
              color: evoRange.from === "" && evoRange.to === "" ? "#fff" : T.textMuted,
              border: "1px solid " + (evoRange.from === "" && evoRange.to === "" ? T.accent : T.border),
              borderRadius: 5,
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Todo
          </button>
          <input type="date" value={evoRange.from} onChange={(e) => setEvoRange((r) => ({ ...r, from: e.target.value }))} style={{ border: "1px solid " + T.border, borderRadius: 5, padding: "3px 6px", fontSize: 11, background: "#FFFFFF", color: T.text }} />
          <span style={{ color: T.textFaint }}>-</span>
          <input type="date" value={evoRange.to} onChange={(e) => setEvoRange((r) => ({ ...r, to: e.target.value }))} style={{ border: "1px solid " + T.border, borderRadius: 5, padding: "3px 6px", fontSize: 11, background: "#FFFFFF", color: T.text }} />
        </div>
      </div>
      {!hasData ? (
        <div style={{ padding: "18px 20px", color: T.textMuted, fontSize: 12.5 }}>Sin datos suficientes todavia.</div>
      ) : (
        <div style={{ padding: "12px 44px 8px 20px", background: T.bg, position: "relative" }}>
          <svg viewBox="0 0 1000 128" width="100%" height="150" preserveAspectRatio="none">
            <line x1="0" y1={evoY(evoMaxB)} x2="1000" y2={evoY(evoMaxB)} stroke={T.borderSoft} strokeDasharray="4 3" />
            {evoMinB < 0 && <line x1="0" y1={evoY(evoMinB)} x2="1000" y2={evoY(evoMinB)} stroke={T.borderSoft} strokeDasharray="4 3" />}
            <line x1="0" y1={evoY(0)} x2="1000" y2={evoY(0)} stroke={T.border} strokeWidth="1" />
            <path d={evoAreaPath} fill={T.accent} fillOpacity="0.13" stroke="none" />
            <path d={evoLinePath} fill="none" stroke={T.accent} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          </svg>
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
