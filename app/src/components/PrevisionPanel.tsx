import { useState } from "react";
import { TrendingUp, X } from "lucide-react";
import { T, dot, tinyBtn } from "../theme";
import { fmt, quickRange, shortDate, type QuickRangeKey } from "../lib/format";
import type { EvoPoint, EvoRange, EvoTick, PrevisionMovement } from "../lib/evolution";
import type { Category } from "../types";
import { catInfo } from "../lib/categories";
import { DateField } from "./DateField";

const QUICK_KEYS: readonly [QuickRangeKey, string][] = [
  ["1M", "1M"],
  ["3M", "3M"],
  ["6M", "6M"],
  ["1A", "1A"],
  ["finDeAno", "Fin de año"],
];

interface EvoMarker {
  xPct: number;
  date: string;
  balance: number;
}

export function PrevisionPanel({
  points,
  ticks,
  movements,
  categories,
  accountName,
  evoRange,
  setEvoRange,
  onClose,
}: {
  points: EvoPoint[];
  ticks: EvoTick[];
  movements: PrevisionMovement[];
  categories: Category[];
  accountName: (id: string) => string;
  evoRange: EvoRange;
  setEvoRange: (fn: (r: EvoRange) => EvoRange) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<EvoRange>({ from: evoRange.from, to: evoRange.to });
  const [preset, setPreset] = useState<QuickRangeKey | null>(null);
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
    <div style={{ borderTop: "1px solid " + T.border, display: "flex", flexDirection: "column", height: 440, flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 4px", flexShrink: 0 }}>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={17} style={{ color: T.accent }} /> Prevision de balance
        </h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label="Cerrar previsión">
          <X size={17} />
        </button>
      </div>

      <div style={{ padding: "10px 24px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-start" }}>
          {QUICK_KEYS.map(([key, label]) => (
            <button key={key} onClick={() => applyPreset(key)} style={tinyBtn(preset === key)}>
              {label}
            </button>
          ))}
          <DateField
            value={draft.from}
            width={124}
            onChange={(v) => {
              setPreset(null);
              setDraft((r) => ({ ...r, from: v }));
            }}
          />
          <span style={{ color: T.textFaint }}>-</span>
          <DateField
            value={draft.to}
            width={124}
            onChange={(v) => {
              setPreset(null);
              setDraft((r) => ({ ...r, to: v }));
            }}
          />
          <button onClick={showCustomRange} style={tinyBtn(false)}>
            Mostrar
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", borderTop: "1px solid " + T.border }}>
        {movements.length === 0 ? (
          <div style={{ fontSize: 12.5, color: T.textFaint, padding: "16px 24px" }}>Sin movimientos previstos en este rango.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "74px 130px 1fr 110px", padding: "6px 24px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.borderSoft, background: T.bgElevated, position: "sticky", top: 0 }}>
              <span>Fecha</span>
              <span>Cuenta</span>
              <span>Descripcion</span>
              <span style={{ textAlign: "right" }}>Importe</span>
            </div>
            {movements.map((m, idx) => {
              const t = m.tx;
              const isTransfer = t.type === "transfer" || t.type === "transfer_in";
              const info = isTransfer ? { color: T.transfer } : catInfo(categories, t.categoryId, t.subcategoryId, t.subsubcategoryId);
              const color = t.type === "income" ? T.income : isTransfer ? T.transfer : T.expense;
              return (
                <div key={t.id + "-" + m.date + "-" + idx} style={{ display: "grid", gridTemplateColumns: "74px 130px 1fr 110px", alignItems: "center", padding: "6px 24px", fontSize: 12, borderBottom: "1px solid " + T.borderSoft, opacity: m.real ? 1 : 0.6 }}>
                  <span className="amount" style={{ color: T.textMuted, fontSize: 11.5 }}>
                    {shortDate(m.date)}
                  </span>
                  <span style={{ color: T.textMuted, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{accountName(t.accountId)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                    <span style={dot(info.color, 7)} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  </span>
                  <span className="amount" style={{ textAlign: "right", color, fontWeight: 500, fontSize: 12 }}>
                    {t.type === "income" ? "+" : "-"}
                    {fmt(Math.abs(m.amount))}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {!hasData ? (
        <div style={{ padding: "18px 20px", color: T.textMuted, fontSize: 12.5, flexShrink: 0 }}>Sin datos suficientes todavia.</div>
      ) : (
        <div style={{ padding: "12px 44px 8px 20px", background: T.bg, position: "relative", flexShrink: 0, borderTop: "1px solid " + T.border }}>
          <svg
            viewBox="0 0 1000 128"
            width="100%"
            height="150"
            preserveAspectRatio="none"
            style={{ cursor: "crosshair" }}
            onMouseDown={(e) => {
              e.preventDefault();
              // Se captura el nodo SVG en una variable normal (no en el evento
              // de React, que deja de ser valido en cuanto termina este
              // manejador) para poder seguir leyendo su posicion durante el
              // arrastre, en los listeners de mousemove/mouseup de window.
              const svgNode = e.currentTarget;
              const updateMarker = (clientX: number) => {
                const rect = svgNode.getBoundingClientRect();
                const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
                const clickTime = evoMinT + relX * evoRangeT;
                let bal = points[0].balance;
                for (let i = 0; i < points.length; i++) {
                  if (points[i].time <= clickTime) bal = points[i].balance;
                  else break;
                }
                const dateLabel = new Date(clickTime).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
                setMarker({ xPct: relX * 100, date: dateLabel, balance: bal });
              };
              updateMarker(e.clientX);
              const onMove = (moveEvent: MouseEvent) => updateMarker(moveEvent.clientX);
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
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
