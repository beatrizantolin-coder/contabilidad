import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { T } from "../theme";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WEEKDAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

function parseISO(iso: string): { y: string; m: string; d: string } {
  if (!iso) return { y: "", m: "", d: "" };
  const [y, m, d] = iso.split("-");
  return { y: y || "", m: m || "", d: d || "" };
}
function toISO(y: string, m: string, d: string): string {
  if (!y || !m || !d || y.length < 4) return "";
  const yn = Number(y), mn = Number(m), dn = Number(d);
  if (!yn || !mn || !dn || mn < 1 || mn > 12 || dn < 1 || dn > 31) return "";
  return y.padStart(4, "0") + "-" + String(mn).padStart(2, "0") + "-" + String(dn).padStart(2, "0");
}
/** Lunes=0 ... Domingo=6, para alinear la rejilla del calendario. */
function mondayIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function DateField({
  label,
  value,
  onChange,
  width,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  width?: number;
}) {
  const parts = parseISO(value);
  const [day, setDay] = useState(parts.d);
  const [month, setMonth] = useState(parts.m);
  const [year, setYear] = useState(parts.y);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (value ? new Date(value + "T00:00:00").getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (value ? new Date(value + "T00:00:00").getMonth() : new Date().getMonth()));

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = parseISO(value);
    setDay(p.d);
    setMonth(p.m);
    setYear(p.y);
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  useEffect(() => {
    if (!calendarOpen) return;
    function onDocDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setCalendarOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [calendarOpen]);

  function commit(d: string, m: string, y: string) {
    const iso = toISO(y, m, d);
    if (iso) onChange(iso);
  }

  function handleDayChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 2);
    setDay(digits);
    commit(digits, month, year);
    if (digits.length === 2) {
      monthRef.current?.focus();
      monthRef.current?.select();
    }
  }
  function handleMonthChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 2);
    setMonth(digits);
    commit(day, digits, year);
    if (digits.length === 2) {
      yearRef.current?.focus();
      yearRef.current?.select();
    }
  }
  function handleYearChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    const currentYear = String(new Date().getFullYear());
    // Autocompletado del ano: mientras lo escrito siga siendo un prefijo del
    // ano actual, se completa con el resto y se deja seleccionado, para que
    // el usuario pueda aceptarlo tal cual, seguir escribiendo (lo sustituye)
    // o sustituirlo por completo.
    if (digits.length > 0 && digits.length < 4 && currentYear.startsWith(digits)) {
      setYear(currentYear);
      commit(day, month, currentYear);
      requestAnimationFrame(() => yearRef.current?.setSelectionRange(digits.length, 4));
      return;
    }
    setYear(digits);
    commit(day, month, digits);
  }

  function selectDay(y: number, m: number, d: number) {
    const iso = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    onChange(iso);
    setCalendarOpen(false);
  }

  const segStyle = {
    background: T.bgInput,
    border: "none",
    color: T.text,
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    outline: "none",
    textAlign: "center" as const,
    padding: "8px 0",
  };

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadBlank = mondayIndex(firstOfMonth.getDay());
  const cells: (number | null)[] = [];
  for (let i = 0; i < leadBlank; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selDate = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();

  return (
    <div ref={wrapRef} style={{ position: "relative", width: width || 168 }}>
      {label && (
        <span style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase", color: T.textMuted, fontWeight: 600, marginBottom: 6 }}>
          {label}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", background: T.bgInput, border: "1px solid " + T.border, borderRadius: 6, overflow: "hidden" }}>
        <input ref={dayRef} value={day} placeholder="DD" onChange={(e) => handleDayChange(e.target.value)} style={{ ...segStyle, width: 26, paddingLeft: 8 }} />
        <span style={{ color: T.textFaint }}>/</span>
        <input ref={monthRef} value={month} placeholder="MM" onChange={(e) => handleMonthChange(e.target.value)} style={{ ...segStyle, width: 26 }} />
        <span style={{ color: T.textFaint }}>/</span>
        <input ref={yearRef} value={year} placeholder="AAAA" onChange={(e) => handleYearChange(e.target.value)} style={{ ...segStyle, width: 42 }} />
        <button
          type="button"
          onClick={() => setCalendarOpen((o) => !o)}
          style={{ marginLeft: "auto", background: "none", border: "none", color: T.textMuted, padding: "0 8px", display: "flex", alignItems: "center", height: 32 }}
          aria-label="Abrir calendario"
        >
          <CalendarDays size={14} />
        </button>
      </div>

      {calendarOpen && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 40,
            background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)", padding: 16, width: 300,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setViewMonth((m) => { if (m === 0) { setViewYear((y) => y - 1); return 11; } return m - 1; })}
              style={{ background: "none", border: "none", color: T.textMuted, padding: 4, display: "flex" }}
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => { if (m === 11) { setViewYear((y) => y + 1); return 0; } return m + 1; })}
              style={{ background: "none", border: "none", color: T.textMuted, padding: 4, display: "flex" }}
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {WEEKDAY_LETTERS.map((w, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: T.textFaint, padding: "4px 0" }}>
                {w}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const isSelected = !!selDate && selDate.getFullYear() === viewYear && selDate.getMonth() === viewMonth && selDate.getDate() === d;
              const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(viewYear, viewMonth, d)}
                  style={{
                    aspectRatio: "1", width: "100%", borderRadius: 8, border: isToday && !isSelected ? "1px solid " + T.accent : "1px solid transparent",
                    background: isSelected ? T.accent : "transparent", color: isSelected ? "#FFFFFF" : T.text,
                    fontSize: 13, fontWeight: isSelected || isToday ? 700 : 500, display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              const t = new Date();
              setViewYear(t.getFullYear());
              setViewMonth(t.getMonth());
              selectDay(t.getFullYear(), t.getMonth(), t.getDate());
            }}
            style={{ marginTop: 12, width: "100%", background: T.bgElevated, border: "1px solid " + T.border, borderRadius: 6, padding: "7px 0", color: T.accent, fontSize: 12.5, fontWeight: 600 }}
          >
            Hoy
          </button>
        </div>
      )}
    </div>
  );
}
