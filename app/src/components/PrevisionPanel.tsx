import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Ban, LineChart } from "lucide-react";
import { T, dot, tinyBtn } from "../theme";
import { fmt, quickRange, shortDate, todayISO, endOfYearISO, type QuickRangeKey } from "../lib/format";
import type { EvoPoint, EvoRange, EvoTick, PrevisionMovement } from "../lib/evolution";
import type { Category, ID } from "../types";
import { catInfo } from "../lib/categories";
import { KindBadge } from "./KindBadge";
import { DateField } from "./DateField";

const QUICK_KEYS: readonly [QuickRangeKey, string][] = [
  ["1M", "1M"],
  ["3M", "3M"],
  ["6M", "6M"],
  ["1A", "1A"],
  ["finDeAno", "Fin de año"],
];

const GRID_TEMPLATE = "74px 50px 130px 1fr 110px 100px 40px";

interface EvoMarker {
  xPct: number;
  date: string;
  balance: number;
}

function previsionRowKey(m: PrevisionMovement): string {
  return m.tx.id + "|" + m.date;
}

export function PrevisionPanel({
  points,
  ticks,
  movements,
  /** Saldo acumulado justo antes del inicio del rango (apertura de cuentas + historico real anterior). */
  baseline,
  categories,
  accountName,
  evoRange,
  setEvoRange,
}: {
  points: EvoPoint[];
  ticks: EvoTick[];
  movements: PrevisionMovement[];
  baseline: number;
  categories: Category[];
  accountName: (id: ID) => string;
  evoRange: EvoRange;
  setEvoRange: (fn: (r: EvoRange) => EvoRange) => void;
}) {
  const [draft, setDraft] = useState<EvoRange>({ from: evoRange.from, to: evoRange.to });
  const [preset, setPreset] = useState<QuickRangeKey | null>(null);
  const [marker, setMarker] = useState<EvoMarker | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [chartHeight, setChartHeight] = useState(150);

  function toggleExcluded(m: PrevisionMovement) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      const key = previsionRowKey(m);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Saldo real acumulado dia a dia (cronologico, de mas antiguo a mas
  // reciente): las filas excluidas se marcan pero no aportan a la suma. La
  // lista se muestra despues en orden inverso (mas reciente primero), pero
  // el saldo de cada fila refleja siempre este calculo cronologico real.
  const movementsWithBalance = useMemo(() => {
    let running = baseline;
    return movements.map((m) => {
      const excluded = excludedIds.has(previsionRowKey(m));
      if (!excluded) running += m.tx.type === "income" || m.tx.type === "transfer_in" ? m.amount : -m.amount;
      return { ...m, balance: running, excluded };
    });
  }, [movements, baseline, excludedIds]);

  const includedMovements = movements.filter((m) => !excludedIds.has(previsionRowKey(m)));
  const previsionIncome = includedMovements.filter((m) => m.tx.type === "income").reduce((s, m) => s + m.amount, 0);
  const previsionExpense = includedMovements.filter((m) => m.tx.type === "expense").reduce((s, m) => s + m.amount, 0);
  const previsionRangeFrom = evoRange.from || todayISO();
  const previsionRangeTo = evoRange.to || endOfYearISO();

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
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid " + T.border, background: T.bgElevated, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <LineChart size={17} style={{ color: T.accent }} /> Previsiones
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: T.textMuted }}>Movimientos previstos:</span>
          <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowUpCircle size={13} /> <span className="amount">{fmt(previsionIncome)}</span>
          </span>
          <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowDownCircle size={13} /> <span className="amount">{fmt(previsionExpense)}</span>
          </span>
          <span style={{ fontSize: 12, color: T.textFaint }}>
            {shortDate(previsionRangeFrom)} - {shortDate(previsionRangeTo)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-start", marginTop: 12 }}>
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
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {movements.length === 0 ? (
          <div style={{ fontSize: 12.5, color: T.textFaint, padding: "16px 24px" }}>Sin movimientos previstos en este rango.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, padding: "6px 20px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.borderSoft, background: T.bgElevated, position: "sticky", top: 0 }}>
              <span>Fecha</span>
              <span style={{ textAlign: "center" }}>Tipo</span>
              <span>Cuenta</span>
              <span>Descripcion</span>
              <span style={{ textAlign: "right" }}>Importe</span>
              <span style={{ textAlign: "right" }}>Saldo</span>
              <span />
            </div>
            {movementsWithBalance
              .slice()
              .reverse()
              .map((m, idx) => {
                const t = m.tx;
                const isTransfer = t.type === "transfer" || t.type === "transfer_in";
                const info = isTransfer ? { color: T.transfer } : catInfo(categories, t.categoryId, t.subcategoryId, t.subsubcategoryId);
                const color = t.type === "income" ? T.income : isTransfer ? T.transfer : T.expense;
                const strike = m.excluded ? "line-through" : "none";
                return (
                  <div
                    key={t.id + "-" + m.date + "-" + idx}
                    style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, alignItems: "center", padding: "6px 20px", fontSize: 12, borderBottom: "1px solid " + T.borderSoft, opacity: m.excluded ? 0.5 : m.real ? 1 : 0.7 }}
                  >
                    <span className="amount" style={{ color: T.textMuted, fontSize: 11.5, textDecoration: strike }}>
                      {shortDate(m.date)}
                    </span>
                    <span style={{ display: "flex", justifyContent: "center" }}>
                      <KindBadge kind={isTransfer ? "transfer" : t.type === "income" ? "income" : "expense"} size={13} />
                    </span>
                    <span style={{ color: T.textMuted, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: strike }}>{accountName(t.accountId)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textDecoration: strike }}>
                      <span style={dot(info.color, 7)} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                    </span>
                    <span className="amount" style={{ textAlign: "right", color: m.excluded ? T.textFaint : color, fontWeight: 500, textDecoration: strike }}>
                      {t.type === "income" ? "+" : "-"}
                      {fmt(Math.abs(m.amount))}
                    </span>
                    <span className="amount" style={{ textAlign: "right", color: m.balance < 0 ? T.expense : T.textMuted, fontSize: 11.5 }}>
                      {fmt(m.balance)}
                    </span>
                    <span style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        onClick={() => toggleExcluded(m)}
                        className={m.excluded ? "" : "rowbtn"}
                        style={{ background: "none", border: "none", color: m.excluded ? T.accent : T.textFaint, padding: 2 }}
                        aria-label={m.excluded ? "Incluir en la previsión" : "Excluir de la previsión"}
                        title={m.excluded ? "Incluir en la previsión" : "Excluir de la previsión"}
                      >
                        <Ban size={13} />
                      </button>
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
        <div style={{ padding: "16px 44px 8px 20px", background: T.bg, position: "relative", flexShrink: 0, borderTop: "1px solid " + T.border }}>
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startHeight = chartHeight;
              const onMove = (ev: MouseEvent) => setChartHeight(Math.max(80, Math.min(500, startHeight - (ev.clientY - startY))));
              const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
              };
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
            }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, cursor: "row-resize", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Arrastra para ajustar la altura del grafico"
          >
            <span style={{ width: 36, height: 3, borderRadius: 2, background: T.border }} />
          </div>
          <svg
            viewBox="0 0 1000 128"
            width="100%"
            height={chartHeight}
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
