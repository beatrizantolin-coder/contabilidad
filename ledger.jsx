import React, { useState, useMemo, useEffect, useRef } from "react";
import Papa from "papaparse";
import {
  Plus, Trash2, Wallet, TrendingUp, TrendingDown, X, Pencil,
  Repeat, ArrowRightLeft, Search, Download, Upload, SlidersHorizontal, FolderOpen,
  PiggyBank, CreditCard, CheckCircle2, Circle, CircleDashed, Clock, XCircle,
  CircleDollarSign, Banknote, ChevronDown, ChevronRight, Save, Undo2, Redo2, PanelLeftClose, PanelLeft, List,
  FileText, Link2, FolderPlus, CalendarDays, Eraser, ArrowUpCircle, ArrowDownCircle, ArrowUpDown,
  Calendar as CalendarIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
} from "lucide-react";

const STATUSES = [
  { value: "reconciliado", label: "Reconciliado", color: "#2FA84F", icon: CheckCircle2 },
  { value: "pendiente", label: "Pendiente", color: "#D6A93B", icon: CircleDashed },
  { value: "programado", label: "Programado", color: "#3373DC", icon: Clock },
  { value: "anulado", label: "Cancelado", color: "#E03131", icon: XCircle },
];
const statusInfo = (value) => STATUSES.find((s) => s.value === value) || STATUSES[1];

const ACCOUNT_TYPES = [
  { value: "checking", label: "Cuenta corriente", icon: Wallet },
  { value: "savings", label: "Cuenta de ahorro", icon: PiggyBank },
  { value: "credit", label: "Tarjeta", icon: CreditCard },
  { value: "cash", label: "Efectivo", icon: Banknote },
];
const accountTypeInfo = (value) => ACCOUNT_TYPES.find((t) => t.value === value) || ACCOUNT_TYPES[0];

const T = {
  bg: "#FFFFFF",
  sidebar: "#F3F3F5",
  bgElevated: "#FAFAFB",
  bgInput: "#FFFFFF",
  border: "#E3E3E6",
  borderSoft: "#ECECEE",
  text: "#1D1D1F",
  textMuted: "#8A8A8E",
  textFaint: "#B6B6BA",
  income: "#2FA84F",
  expense: "#D64545",
  accent: "#3373DC",
  transfer: "#8E5FD6",
};

const PALETTE = ["#E2725B", "#E8A33D", "#7FB35C", "#5B8DBF", "#9080C4", "#9A9D93", "#D97FA6", "#4FAFA8", "#D9B23D", "#A97C50"];
function tintColor(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return "#" + [nr, ng, nb].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');";

const UNIT_LABELS = { days: ["dia", "dias"], months: ["mes", "meses"], years: ["ano", "anos"] };
const RECUR_UNITS = [
  { value: "days", label: "Dias" },
  { value: "months", label: "Meses" },
  { value: "years", label: "Anos" },
];
function freqLabel(r) {
  if (!r) return "";
  const labels = UNIT_LABELS[r.unit] || UNIT_LABELS.months;
  const word = Number(r.interval) === 1 ? labels[0] : labels[1];
  return "Cada " + r.interval + " " + word;
}
function freqPerMonth(r) {
  const interval = Number(r.interval) || 1;
  if (r.unit === "days") return 30.44 / interval;
  if (r.unit === "years") return 1 / (interval * 12);
  return 1 / interval;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const endOfYearISO = () => new Date().getFullYear() + "-12-31";
const startOfCurrentMonthISO = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
};
const endOfNthMonthISO = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n + 1, 0);
  return d.toISOString().slice(0, 10);
};
const quickRange = (key) => {
  if (key === "1M") return { from: todayISO(), to: endOfNthMonthISO(0) };
  if (key === "3M") return { from: todayISO(), to: endOfNthMonthISO(3) };
  if (key === "6M") return { from: todayISO(), to: endOfNthMonthISO(6) };
  if (key === "1A") return { from: todayISO(), to: endOfNthMonthISO(12) };
  return { from: todayISO(), to: endOfYearISO() };
};
const endOfCurrentWeekISO = () => {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  return d.toISOString().slice(0, 10);
};
const startOfCurrentWeekISO = () => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
};
const fmt = (n, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);
const shortDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return dd + "/" + mm + "/" + yy;
};
const monthKey = (iso) => iso.slice(0, 7);
const monthYearLabel = (iso) => {
  const d = new Date(iso + "T00:00:00");
  const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const nextDate = (iso, recurring) => {
  const d = new Date(iso + "T00:00:00");
  const interval = Number(recurring && recurring.interval) || 1;
  const unit = (recurring && recurring.unit) || "months";
  if (unit === "days") d.setDate(d.getDate() + interval);
  else if (unit === "years") d.setFullYear(d.getFullYear() + interval);
  else d.setMonth(d.getMonth() + interval);
  return d.toISOString().slice(0, 10);
};

let idCounter = 3000;
const nextId = () => idCounter++;

const seedDocuments = [
  {
    id: 1,
    name: "Personal",
    budgets: { 5001: 300, 5003: 120, 5002: 100 },
    savedFilters: [],
    accounts: [
      { id: 1000, name: "Cuenta corriente", opening: 2450.32, warning: 200, type: "checking" },
      { id: 1001, name: "Ahorro", opening: 6200, warning: 0, type: "savings" },
    ],
    categories: [
      { id: 5000, name: "Vivienda", color: "#3373DC", kind: "expense", subcategories: [] },
      { id: 5001, name: "Alimentacion", color: "#2FA84F", kind: "expense", subcategories: [
        { id: 5101, name: "Supermercado", color: "#2FA84F", subcategories: [] },
        { id: 5102, name: "Restaurantes", color: "#57C77A", subcategories: [] },
      ] },
      { id: 5002, name: "Transporte", color: "#D6A93B", kind: "expense", subcategories: [] },
      { id: 5003, name: "Ocio", color: "#8E5FD6", kind: "expense", subcategories: [] },
      { id: 5004, name: "Salud", color: "#D64545", kind: "expense", subcategories: [] },
      { id: 5005, name: "Ingresos", color: "#3BA6A6", kind: "income", subcategories: [] },
      { id: 5006, name: "Otros", color: "#6B7A8F", kind: "expense", subcategories: [] },

      // --- Importado desde iCompta (capturas), rama B-Nice excluida a proposito ---
      { id: nextId(), name: "Impuestos", color: "#2B2B2E", kind: "expense", subcategories: [
        { id: nextId(), name: "Ayuntamiento", color: "#2B2B2E", subcategories: [] },
        { id: nextId(), name: "Hacienda", color: "#2B2B2E", subcategories: [] },
        { id: nextId(), name: "Otros", color: "#2B2B2E", subcategories: [] },
        { id: nextId(), name: "Seguridad Social", color: "#2B2B2E", subcategories: [] },
      ] },
      { id: nextId(), name: "Prestamos Familiares", color: "#C77B3A", kind: "expense", subcategories: [] },
      { id: nextId(), name: "Servicios", color: "#C9BEEC", kind: "expense", subcategories: [
        { id: nextId(), name: "Limpieza", color: "#C9BEEC", subcategories: [] },
      ] },
      { id: nextId(), name: "Sin categoria", color: "#F5F0D6", kind: "expense", subcategories: [] },
      { id: nextId(), name: "Vacaciones", color: "#D8B94B", kind: "expense", subcategories: [
        { id: nextId(), name: "Alimentacion", color: "#D8B94B", subcategories: [] },
        { id: nextId(), name: "Alojamiento", color: "#D8B94B", subcategories: [] },
        { id: nextId(), name: "Otros", color: "#D8B94B", subcategories: [] },
        { id: nextId(), name: "Transporte", color: "#D8B94B", subcategories: [] },
      ] },
      { id: nextId(), name: "Tranferencias a otras cuentas", color: "#7FA8F0", kind: "expense", subcategories: [] },
      { id: nextId(), name: "CASH", color: "#A855F7", kind: "expense", subcategories: [] },
      { id: nextId(), name: "Colladillo", color: "#7A9E7E", kind: "expense", subcategories: [
        { id: nextId(), name: "Mobiliario", color: "#7A9E7E", subcategories: [] },
      ] },

      { id: nextId(), name: "Alquiler (ingreso)", color: "#8FCB4C", kind: "income", subcategories: [] },
      { id: nextId(), name: "David", color: "#8FCB4C", kind: "income", subcategories: [] },
      { id: nextId(), name: "Intereses Recibidos", color: "#8FCB4C", kind: "income", subcategories: [] },
      { id: nextId(), name: "Nomina Bea", color: "#8FCB4C", kind: "income", subcategories: [] },
      { id: nextId(), name: "Otros ingresos", color: "#8FCB4C", kind: "income", subcategories: [
        { id: nextId(), name: "Devolucion de Gastos (1)", color: "#8FCB4C", subcategories: [] },
        { id: nextId(), name: "Devolucion de Gastos (2)", color: "#8FCB4C", subcategories: [] },
        { id: nextId(), name: "Otras Devoluciones", color: "#8FCB4C", subcategories: [] },
      ] },

      { id: nextId(), name: "Deudas", color: "#D9633B", kind: "expense", subcategories: [] },
      { id: nextId(), name: "Automovil", color: "#F0E6D2", kind: "expense", subcategories: [
        { id: nextId(), name: "Impuestos", color: "#F0E6D2", subcategories: [] },
        { id: nextId(), name: "Seguro", color: "#F0E6D2", subcategories: [] },
      ] },
      { id: nextId(), name: "Bancos", color: "#E08D74", kind: "expense", subcategories: [
        { id: nextId(), name: "Intereses", color: "#E08D74", subcategories: [] },
        { id: nextId(), name: "Comisiones", color: "#E08D74", subcategories: [] },
      ] },
      { id: nextId(), name: "Facturas", color: "#A855D6", kind: "expense", subcategories: [
        { id: nextId(), name: "Agua", color: "#A855D6", subcategories: [] },
        { id: nextId(), name: "Gas", color: "#A855D6", subcategories: [] },
        { id: nextId(), name: "Luz", color: "#A855D6", subcategories: [] },
        { id: nextId(), name: "Movil", color: "#A855D6", subcategories: [] },
        { id: nextId(), name: "Telefono", color: "#A855D6", subcategories: [] },
      ] },
      { id: nextId(), name: "Gastos de trabajo", color: "#1A1A2E", kind: "expense", subcategories: [] },
      { id: nextId(), name: "Gastos Generales", color: "#7FD9A8", kind: "expense", subcategories: [
        { id: nextId(), name: "Aperitivos", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Decoracion", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Farmacia", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Ferreteria", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Gasolina", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Jardin", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Mascotas", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Ocio", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Optica", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Otros", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Parking", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Peaje", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Peluqueria", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Restaurante", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Ropa", color: "#7FD9A8", subcategories: [] },
        { id: nextId(), name: "Transporte", color: "#7FD9A8", subcategories: [] },
      ] },
      { id: nextId(), name: "Hogar", color: "#6B4226", kind: "expense", subcategories: [
        { id: nextId(), name: "Alquiler", color: "#6B4226", subcategories: [] },
      ] },
      { id: 5007, name: "Imprevistos", color: "#D6708F", kind: "expense", subcategories: [
        { id: nextId(), name: "Celebraciones", color: "#D6708F", subcategories: [] },
        { id: 5103, name: "Cuidado Personal", color: "#D6708F", subcategories: [
          { id: 5104, name: "Productos", color: "#D6708F", subcategories: [] },
          { id: 5105, name: "Tratamientos", color: "#E0899F", subcategories: [] },
        ] },
        { id: nextId(), name: "Devolucion Prestamo", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Fisioterapeuta", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Gourmet", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Medico", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Mudanza", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Multas", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Navidad", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Otros", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Prestamos", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Reformas", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Regalos", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Seguros", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Taller", color: "#D6708F", subcategories: [] },
        { id: nextId(), name: "Viajes", color: "#D6708F", subcategories: [] },
      ] },
    ],
    transactions: [
      { id: nextId(), accountId: 1000, date: "2026-06-01", name: "Nomina", categoryId: 5005, subcategoryId: null, amount: 1850, type: "income", recurring: { interval: 1, unit: "months" }, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-06-02", name: "Alquiler estudio", categoryId: 5000, subcategoryId: null, amount: 620, type: "expense", recurring: { interval: 1, unit: "months" }, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-06-05", name: "Supermercado", categoryId: 5001, subcategoryId: 5101, amount: 74.2, type: "expense", recurring: null, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-07-01", name: "Nomina", categoryId: 5005, subcategoryId: null, amount: 1850, type: "income", recurring: { interval: 1, unit: "months" }, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-07-02", name: "Alquiler estudio", categoryId: 5000, subcategoryId: null, amount: 620, type: "expense", recurring: { interval: 1, unit: "months" }, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: "2026-07-10", name: "Gasolina", categoryId: 5002, subcategoryId: null, amount: 58, type: "expense", recurring: null, status: "reconciliado" },
      { id: nextId(), accountId: 1000, date: todayISO(), name: "Nomina", categoryId: 5005, subcategoryId: null, amount: 1850, type: "income", recurring: { interval: 1, unit: "months" }, status: "pendiente" },
      { id: nextId(), accountId: 1000, date: todayISO(), name: "Alquiler estudio", categoryId: 5000, subcategoryId: null, amount: 620, type: "expense", recurring: { interval: 1, unit: "months" }, status: "pendiente" },
      { id: nextId(), accountId: 1000, date: todayISO(), name: "Supermercado", categoryId: 5001, subcategoryId: 5101, amount: 74.2, type: "expense", recurring: null, status: "pendiente" },
    ],
  },
  {
    id: 2,
    name: "B-nice",
    budgets: {},
    savedFilters: [],
    accounts: [
      { id: 2000, name: "Cuenta B-nice", opening: 4100, warning: 0, type: "checking" },
    ],
    categories: [
      { id: 5200, name: "Ingresos", color: "#3BA6A6", kind: "income", subcategories: [{ id: 5201, name: "Facturas clientes", color: "#3BA6A6", subcategories: [] }] },
      { id: 5202, name: "Gastos estudio", color: "#C77B3A", kind: "expense", subcategories: [] },
    ],
    transactions: [
      { id: nextId(), accountId: 2000, date: todayISO(), name: "Factura TIREA", categoryId: 5200, subcategoryId: 5201, amount: 980, type: "income", recurring: null, status: "reconciliado" },
    ],
  },
];

const emptyDraft = (accounts, docId, categories) => ({
  id: null,
  accountId: accounts[0]?.id,
  toDocId: docId,
  toAccountId: accounts[0]?.id,
  date: todayISO(),
  name: "",
  comment: "",
  categoryId: (categories.find((c) => c.kind !== "income") || categories[0])?.id ?? null,
  subcategoryId: null,
  subsubcategoryId: null,
  amount: "",
  type: "expense",
  status: "pendiente",
  recurringOn: false,
  variableAmount: false,
  freqInterval: 1,
  freqUnit: "months",
  freqEndDate: "",
  freqNoEnd: true,
});

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase", color: T.textMuted, fontWeight: 600 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_LABELS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function DatePicker({ value, onChange, disabled, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const initial = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const openPicker = () => {
    if (disabled) return;
    const base = value ? new Date(value + "T00:00:00") : new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  };

  const displayLabel = value ? shortDate(value) : (placeholder || "dd/mm/aaaa");

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInThisMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInThisMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayIso = todayISO();
  const pad2 = (n) => String(n).padStart(2, "0");
  const isoFor = (d) => viewYear + "-" + pad2(viewMonth + 1) + "-" + pad2(d);

  const shiftMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button" onClick={openPicker} disabled={disabled}
        style={Object.assign({}, inputStyle, { textAlign: "left", cursor: disabled ? "default" : "pointer", color: value ? T.text : T.textFaint, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: disabled ? 0.6 : 1 }, style)}
      >
        {displayLabel}
        <CalendarIcon size={13} style={{ color: T.textFaint, flexShrink: 0, marginLeft: 6 }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 41, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 14, boxShadow: "0 8px 28px rgba(0,0,0,0.14)", padding: 16, width: 296 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button type="button" onClick={() => shiftMonth(-1)} style={{ background: "none", border: "none", color: T.textMuted, padding: 6, borderRadius: 8, cursor: "pointer" }} aria-label="Mes anterior">
                <ChevronLeftIcon size={16} />
              </button>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: T.text, fontFamily: "Inter, sans-serif" }}>{MONTH_LABELS[viewMonth]} {viewYear}</span>
              <button type="button" onClick={() => shiftMonth(1)} style={{ background: "none", border: "none", color: T.textMuted, padding: 6, borderRadius: 8, cursor: "pointer" }} aria-label="Mes siguiente">
                <ChevronRightIcon size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: T.textFaint, padding: "4px 0" }}>{w}</div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4 }}>
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const iso = isoFor(d);
                const isToday = iso === todayIso;
                const isSelected = iso === value;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      type="button"
                      onClick={() => { onChange(iso); setOpen(false); }}
                      style={{
                        width: 34, height: 34, borderRadius: "50%", border: isToday && !isSelected ? "1.5px solid " + T.accent : "1.5px solid transparent",
                        background: isSelected ? T.accent : "transparent", color: isSelected ? "#FFFFFF" : T.text,
                        fontSize: 13, fontWeight: isSelected || isToday ? 700 : 500, cursor: "pointer",
                      }}
                    >
                      {d}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid " + T.borderSoft }}>
              <button type="button" onClick={() => { onChange(todayIso); setOpen(false); }} style={{ background: "none", border: "none", color: T.accent, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Hoy</button>
              {value && (
                <button type="button" onClick={() => { onChange(""); setOpen(false); }} style={{ background: "none", border: "none", color: T.textMuted, fontSize: 12.5, cursor: "pointer" }}>Borrar</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ColorSwatches({ value, onChange, size }) {
  const s = size || 16;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {PALETTE.map((c) => (
        <button
          key={c} type="button" onClick={() => onChange(c)}
          style={{
            width: s, height: s, borderRadius: "50%", background: c, padding: 0, cursor: "pointer", border: "none",
            boxShadow: value === c ? "0 0 0 2px #FFFFFF, 0 0 0 4px " + T.accent : "0 0 0 1px rgba(0,0,0,0.06)",
          }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

const MIXED = "__mixed__";
const inputStyle = {
  background: T.bgInput, border: "1px solid " + T.border, borderRadius: 6, padding: "0 10px",
  color: T.text, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", width: "100%",
  height: 30, boxSizing: "border-box",
};
const smallBtn = (active) => ({
  background: active ? "#EAF1FC" : "#FFFFFF", border: "1px solid " + (active ? T.accent : T.border),
  color: active ? T.accent : T.textMuted, borderRadius: 6, padding: "0 10px", fontSize: 12, fontWeight: 600,
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, height: 30, boxSizing: "border-box",
});
const dot = (color, size) => ({ width: size || 8, height: size || 8, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" });

function KindBadge({ kind, size }) {
  const s = size || 16;
  if (kind === "income") return <ArrowUpCircle size={s} style={{ color: T.income, flexShrink: 0 }} />;
  if (kind === "transfer") return (
    <div style={{ width: s, height: s, borderRadius: "50%", border: "1.5px solid " + T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <ArrowUpDown size={s - 6} style={{ color: T.accent }} />
    </div>
  );
  return <ArrowDownCircle size={s} style={{ color: T.expense, flexShrink: 0 }} />;
}

export default function LedgerApp() {
  const [documents, setDocuments] = useState(seedDocuments);
  const historyPastRef = useRef([]);
  const historyFutureRef = useRef([]);
  const isUndoRedoRef = useRef(false);
  const prevDocumentsRef = useRef(seedDocuments);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
    } else {
      historyPastRef.current.push(prevDocumentsRef.current);
      if (historyPastRef.current.length > 50) historyPastRef.current.shift();
      historyFutureRef.current = [];
    }
    prevDocumentsRef.current = documents;
    setHistoryVersion((v) => v + 1);
  }, [documents]);

  function undoLastAction() {
    if (historyPastRef.current.length === 0) return;
    const prev = historyPastRef.current.pop();
    historyFutureRef.current.push(documents);
    isUndoRedoRef.current = true;
    setDocuments(prev);
  }
  function redoLastAction() {
    if (historyFutureRef.current.length === 0) return;
    const next = historyFutureRef.current.pop();
    historyPastRef.current.push(documents);
    isUndoRedoRef.current = true;
    setDocuments(next);
  }
  const [activeDocId, setActiveDocId] = useState(seedDocuments[0].id);
  const [showDocForm, setShowDocForm] = useState(false);
  const [savedDocFeedback, setSavedDocFeedback] = useState(null);
  const [docNameDraft, setDocNameDraft] = useState("");

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];
  const accounts = activeDoc.accounts;
  const transactions = activeDoc.transactions;
  const budgets = activeDoc.budgets;
  const categories = activeDoc.categories;
  const savedFilters = activeDoc.savedFilters || [];

  const [activeAccounts, setActiveAccounts] = useState(new Set());
  const [view, setView] = useState("transactions");
  const [showTxForm, setShowTxForm] = useState(false);
  const [showAccForm, setShowAccForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMovementsRange, setShowMovementsRange] = useState(false);
  const [movementRangeDraft, setMovementRangeDraft] = useState({ from: todayISO(), to: endOfYearISO() });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastClickedId, setLastClickedId] = useState(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEdit, setBulkEdit] = useState({
    date: todayISO(), status: "pendiente", accountId: null,
    categoryId: null, subcategoryId: null, subsubcategoryId: null,
  });
  const [bulkEditTouched, setBulkEditTouched] = useState(new Set());
  const fileInputRef = useRef(null);
  const draggedGroupKeyRef = useRef(null);

  const [filters, setFilters] = useState({ search: "", categories: [], subcategories: [], type: "all", from: "", to: "", matchMode: "all" });
  const [showSaveFilterForm, setShowSaveFilterForm] = useState(false);
  const [programadorSort, setProgramadorSort] = useState("fecha");
  const [collapsedMonths, setCollapsedMonths] = useState(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(230);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNewDestino, setShowNewDestino] = useState(false);
  const [newDestinoDraft, setNewDestinoDraft] = useState({ name: "", opening: "", type: "checking" });
  const [txSort, setTxSort] = useState({ field: "fecha", dir: "desc" });
  const [collapsedProgramadorGroups, setCollapsedProgramadorGroups] = useState(new Set());
  const [catTab, setCatTab] = useState("expense");
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showCatEdit, setShowCatEdit] = useState(false);
  const [catEditId, setCatEditId] = useState(null);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(null);
  const [txDraft, setTxDraft] = useState(emptyDraft(seedDocuments[0].accounts, seedDocuments[0].id, seedDocuments[0].categories));
  const [accDraft, setAccDraft] = useState({ id: null, name: "", opening: "", type: "checking", savingsKind: "savings", cardKind: "debit", paymentMode: "month_end", monthlyPayment: "", linkedAccountId: null, lockType: false });

  const [showCatForm, setShowCatForm] = useState(false);
  const [catDraft, setCatDraft] = useState({ name: "", color: PALETTE[0], kind: "expense" });
  const [subFormFor, setSubFormFor] = useState(null);
  const [subDraft, setSubDraft] = useState({ name: "", color: PALETTE[0] });
  const [colorPickerOpen, setColorPickerOpen] = useState(null);
  const [descColorPickerOpen, setDescColorPickerOpen] = useState(false);
  const [evoRange, setEvoRange] = useState({ from: "", to: "" });
  const [evoCustomDraft, setEvoCustomDraft] = useState({ from: "", to: "" });
  const [evoMarker, setEvoMarker] = useState(null);

  function updateDoc(docId, fn) {
    setDocuments((prev) => prev.map((d) => (d.id === docId ? fn(d) : d)));
  }
  function applyToDocs(updates) {
    setDocuments((prev) => prev.map((d) => {
      const u = updates.find((x) => x.docId === d.id);
      return u ? u.fn(d) : d;
    }));
  }
  function setAccounts(updater) { updateDoc(activeDocId, (d) => Object.assign({}, d, { accounts: typeof updater === "function" ? updater(d.accounts) : updater })); }
  function setTransactions(updater) { updateDoc(activeDocId, (d) => Object.assign({}, d, { transactions: typeof updater === "function" ? updater(d.transactions) : updater })); }
  function setBudgets(updater) { updateDoc(activeDocId, (d) => Object.assign({}, d, { budgets: typeof updater === "function" ? updater(d.budgets) : updater })); }
  function setCategories(updater) { updateDoc(activeDocId, (d) => Object.assign({}, d, { categories: typeof updater === "function" ? updater(d.categories) : updater })); }
  function setSavedFilters(updater) { updateDoc(activeDocId, (d) => Object.assign({}, d, { savedFilters: typeof updater === "function" ? updater(d.savedFilters || []) : updater })); }

  const accountName = (id) => { const a = accounts.find((x) => x.id === id); return a ? a.name : "-"; };

  function catInfo(categoryId, subcategoryId, subsubcategoryId) {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return { name: "-", color: T.textFaint, catName: "-" };
    if (subcategoryId) {
      const sub = cat.subcategories.find((s) => s.id === subcategoryId);
      if (sub) {
        if (subsubcategoryId) {
          const subsub = (sub.subcategories || []).find((s) => s.id === subsubcategoryId);
          if (subsub) return { name: cat.name + " / " + sub.name + " / " + subsub.name, color: tintColor(cat.color, 0.2), catName: cat.name, subName: sub.name, subsubName: subsub.name };
        }
        return { name: cat.name + " / " + sub.name, color: tintColor(cat.color, 0.2), catName: cat.name, subName: sub.name };
      }
    }
    return { name: cat.name, color: cat.color, catName: cat.name };
  }

  const balances = useMemo(() => {
    const map = {};
    accounts.forEach((a) => (map[a.id] = a.opening));
    transactions.forEach((t) => {
      if (t.status === "anulado") return;
      if (t.type === "income") map[t.accountId] = (map[t.accountId] || 0) + Number(t.amount);
      else if (t.type === "expense") map[t.accountId] = (map[t.accountId] || 0) - Number(t.amount);
      else if (t.type === "transfer") map[t.accountId] = (map[t.accountId] || 0) - Number(t.amount);
      else if (t.type === "transfer_in") map[t.accountId] = (map[t.accountId] || 0) + Number(t.amount);
    });
    return map;
  }, [accounts, transactions]);

  const totalBalance = accounts.reduce((s, a) => s + (balances[a.id] || 0), 0);

  const scopeIds = useMemo(() => (activeAccounts.size === 0 ? new Set(accounts.map((a) => a.id)) : activeAccounts), [activeAccounts, accounts]);
  const scopedTotal = useMemo(() => accounts.filter((a) => scopeIds.has(a.id)).reduce((s, a) => s + (balances[a.id] || 0), 0), [accounts, scopeIds, balances]);

  const scoped = useMemo(() => {
    return transactions.filter((t) => scopeIds.has(t.accountId));
  }, [transactions, scopeIds]);

  function hasLocalSibling(t) {
    if (t.type !== "transfer_in" || !t.transferGroupId) return false;
    return transactions.some((x) => x.type === "transfer" && x.transferGroupId === t.transferGroupId);
  }

  const filteredTx = useMemo(() => {
    const dirMul = txSort.dir === "asc" ? 1 : -1;
    const cmp = (a, b) => {
      let av, bv;
      if (txSort.field === "fecha") { av = a.date; bv = b.date; }
      else if (txSort.field === "estado") { av = a.status || ""; bv = b.status || ""; }
      else if (txSort.field === "descripcion") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (txSort.field === "comentario") { av = (a.comment || "").toLowerCase(); bv = (b.comment || "").toLowerCase(); }
      else if (txSort.field === "importe") { av = Number(a.amount); bv = Number(b.amount); }
      else if (txSort.field === "saldo") { av = resultingBalance(a); bv = resultingBalance(b); }
      else { av = a.date; bv = b.date; }
      if (av < bv) return -1 * dirMul;
      if (av > bv) return 1 * dirMul;
      const ar = a.manualRank !== undefined ? a.manualRank : a.id;
      const br = b.manualRank !== undefined ? b.manualRank : b.id;
      return ar - br;
    };
    return scoped
      .filter((t) => t.type !== "transfer_in" || !hasLocalSibling(t))
      .filter((t) => {
        const conds = [];
        if (filters.categories.length > 0) conds.push(filters.categories.includes(t.categoryId));
        if (filters.subcategories.length > 0) conds.push(filters.subcategories.includes(t.subcategoryId));
        if (filters.type !== "all") conds.push(filters.type === "transfer" ? (t.type === "transfer" || t.type === "transfer_in") : t.type === filters.type);
        if (filters.from) conds.push(t.date >= filters.from);
        if (filters.to) conds.push(t.date <= filters.to);
        if (filters.search) conds.push(t.name.toLowerCase().includes(filters.search.toLowerCase()));
        if (conds.length === 0) return true;
        const mode = filters.matchMode || "all";
        if (mode === "any") return conds.some(Boolean);
        if (mode === "none") return conds.every((c) => !c);
        return conds.every(Boolean);
      })
      .slice()
      .sort(cmp);
  }, [scoped, filters, transactions, txSort]);

  const now = new Date();
  const curMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const thisMonthTx = scoped.filter((t) => monthKey(t.date) === curMonthKey);

  const monthIncome = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const reconciledMonthTx = thisMonthTx.filter((t) => t.status === "reconciliado");
  const byCategory = useMemo(() => {
    const map = {};
    reconciledMonthTx.filter((t) => t.type === "expense").forEach((t) => { map[t.categoryId] = (map[t.categoryId] || 0) + Number(t.amount); });
    return Object.entries(map).map((entry) => ({ id: Number(entry[0]), val: entry[1], info: catInfo(Number(entry[0])) })).sort((a, b) => b.val - a.val);
  }, [reconciledMonthTx, categories]);
  const maxCat = Math.max(1, ...byCategory.map((c) => c.val));
  const bySubcategory = useMemo(() => {
    const map = {};
    reconciledMonthTx.filter((t) => t.type === "expense" && t.subcategoryId).forEach((t) => { map[t.subcategoryId] = (map[t.subcategoryId] || 0) + Number(t.amount); });
    return map;
  }, [reconciledMonthTx]);

  const chronological = useMemo(() => {
    return transactions.slice().sort((a, b) => (a.date === b.date ? a.id - b.id : (a.date < b.date ? -1 : 1)));
  }, [transactions]);

  const runningMaps = useMemo(() => {
    const totalOpening = accounts.filter((a) => scopeIds.has(a.id)).reduce((s, a) => s + a.opening, 0);
    const perAccountRunning = {};
    accounts.forEach((a) => (perAccountRunning[a.id] = a.opening));
    let totalRunning = totalOpening;
    const idToTotal = {};
    const idToAccount = {};
    chronological.forEach((t) => {
      const amt = Number(t.amount);
      let sign = 0;
      if (t.status !== "anulado") {
        if (t.type === "income") sign = 1;
        else if (t.type === "expense") sign = -1;
        else if (t.type === "transfer") sign = -1;
        else if (t.type === "transfer_in") sign = 1;
        if (scopeIds.has(t.accountId)) totalRunning += sign * amt;
        perAccountRunning[t.accountId] = (perAccountRunning[t.accountId] || 0) + sign * amt;
      }
      idToTotal[t.id] = totalRunning;
      idToAccount[t.id] = perAccountRunning[t.accountId];
    });
    return { idToTotal: idToTotal, idToAccount: idToAccount };
  }, [chronological, accounts, scopeIds]);

  function pairedTransferId(t) {
    if (t.type === "transfer" && t.transferGroupId) {
      const match = transactions.find((x) => x.type === "transfer_in" && x.transferGroupId === t.transferGroupId);
      if (match && scopeIds.has(t.accountId) && scopeIds.has(match.accountId)) return match.id;
    }
    return t.id;
  }

  function resultingBalance(t) {
    if (t.type === "transfer") return runningMaps.idToTotal[pairedTransferId(t)];
    return runningMaps.idToTotal[t.id];
  }

  const evoPoints = useMemo(() => {
    const openingSum = accounts.filter((a) => scopeIds.has(a.id)).reduce((s, a) => s + a.opening, 0);
    const fullSrc = chronological.filter((t) => scopeIds.has(t.accountId) && (t.type !== "transfer_in" || !hasLocalSibling(t)));

    const today = todayISO();
    const rangeFrom = evoRange.from || today;
    const rangeTo = evoRange.to || endOfYearISO();

    let startBalance = openingSum;
    fullSrc.forEach((t) => {
      if (t.date < rangeFrom) startBalance = resultingBalance(t);
    });

    const startTime = new Date(rangeFrom + "T00:00:00").getTime() - 86400000;
    const realInRange = fullSrc.filter((t) => t.date >= rangeFrom && t.date <= rangeTo);

    // Project recurring series forward past their latest real occurrence, up to
    // the end of the selected range, so the chart shows a genuine forecast rather
    // than just flatlining after today.
    const seriesLatest = {};
    transactions.forEach((t) => {
      if (!t.recurring || t.type === "transfer" || t.type === "transfer_in") return;
      if (!scopeIds.has(t.accountId)) return;
      const key = seriesKeyOf(t);
      if (!seriesLatest[key] || t.date > seriesLatest[key].date) seriesLatest[key] = t;
    });
    const projected = [];
    Object.values(seriesLatest).forEach((tx) => {
      let d = nextDate(tx.date, tx.recurring);
      let guard = 0;
      const until = tx.recurring.until;
      while (d <= rangeTo && guard < 500 && (!until || d <= until)) {
        if (d >= rangeFrom) {
          projected.push({ date: d, amount: Number(tx.amount), sign: tx.type === "income" ? 1 : -1 });
        }
        d = nextDate(d, tx.recurring);
        guard++;
      }
    });

    const events = realInRange
      .map((t) => ({ date: t.date, time: new Date(t.date + "T00:00:00").getTime(), balance: resultingBalance(t), real: true }))
      .concat(projected.map((p) => ({ date: p.date, time: new Date(p.date + "T00:00:00").getTime(), delta: p.sign * p.amount, real: false })))
      .sort((a, b) => (a.date === b.date ? (a.real === b.real ? 0 : (a.real ? -1 : 1)) : (a.date < b.date ? -1 : 1)));

    const pts = [{ time: startTime, balance: startBalance }];
    let running = startBalance;
    events.forEach((e) => {
      running = e.real ? e.balance : running + e.delta;
      pts.push({ time: e.time, balance: running });
    });

    const endTime = new Date(rangeTo + "T00:00:00").getTime();
    if (endTime > pts[pts.length - 1].time) pts.push({ time: endTime, balance: pts[pts.length - 1].balance });
    return pts;
  }, [chronological, accounts, scopeIds, runningMaps, transactions, evoRange]);

  const evoTicks = useMemo(() => {
    if (evoPoints.length === 0) return [];
    const minT = evoPoints[0].time, maxT = evoPoints[evoPoints.length - 1].time;
    const span = maxT - minT || 1;
    const monthsSpan = Math.max(1, Math.round(span / (30 * 86400000)));
    const step = Math.max(1, Math.ceil(monthsSpan / 10));
    const ticks = [];
    const d = new Date(minT);
    d.setDate(1);
    while (d.getTime() <= maxT) {
      ticks.push({ time: d.getTime(), label: d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }) });
      d.setMonth(d.getMonth() + step);
    }
    return ticks;
  }, [evoPoints]);

  const recurringList = useMemo(() => {
    return transactions.filter((t) => t.recurring && t.type !== "transfer_in");
  }, [transactions]);

  const programadorRows = useMemo(() => {
    const latestBySeries = {};
    transactions.forEach((t) => {
      if (!t.recurring || t.type === "transfer" || t.type === "transfer_in") return;
      const key = seriesKeyOf(t);
      if (!latestBySeries[key] || t.date > latestBySeries[key].date) latestBySeries[key] = t;
    });
    return Object.values(latestBySeries)
      .map((anchor) => {
        if (anchor.status === "programado") return { real: true, tx: anchor, date: anchor.date };
        return { real: false, tx: anchor, date: nextDate(anchor.date, anchor.recurring) };
      })
      .filter((row) => !row.tx.recurring.until || row.date <= row.tx.recurring.until);
  }, [transactions]);

  const forecast = useMemo(() => {
    let netPerMonth = 0;
    recurringList.forEach((t) => {
      netPerMonth += (t.type === "income" ? 1 : -1) * Number(t.amount) * freqPerMonth(t.recurring);
    });
    return { netPerMonth: netPerMonth };
  }, [recurringList]);

  function resetDraft() { setTxDraft(emptyDraft(accounts, activeDocId, categories)); setShowTxForm(false); }
  function openScheduledForm() {
    setTxDraft(Object.assign({}, emptyDraft(accounts, activeDocId, categories), { recurringOn: true, status: "programado" }));
    setShowTxForm(true);
  }

  function openProgramadorRow(row) {
    if (row.real) { editTx(row.tx); return; }
    const newTx = Object.assign({}, row.tx, { id: nextId(), date: row.date, status: "programado" });
    setTransactions((prev) => prev.concat([newTx]));
    editTx(newTx);
  }

  function seriesKeyOf(t) {
    return [t.accountId, t.name, t.categoryId || null, t.subcategoryId || null, t.type, Number(t.amount), t.recurring.interval, t.recurring.unit].join("|");
  }

  function removeProgramadorSeries(row) {
    if (!window.confirm("¿Detener esta operación recurrente? Se eliminará la ocurrencia y no se generarán mas en el futuro.")) return;
    const key = seriesKeyOf(row.tx);
    setDocuments((prev) => prev.map((d) => {
      if (d.id !== activeDocId) return d;
      const txs = d.transactions
        .filter((x) => {
          if (!x.recurring) return true;
          if (seriesKeyOf(x) !== key) return true;
          return !(row.real && x.id === row.tx.id);
        })
        .map((x) => {
          if (!x.recurring || seriesKeyOf(x) !== key) return x;
          return Object.assign({}, x, { recurring: null });
        });
      return Object.assign({}, d, { transactions: txs });
    }));
  }

  function findLastCategoryForName(name) {
    if (!name || !name.trim()) return null;
    const matches = transactions
      .filter((t) => t.type !== "transfer" && t.type !== "transfer_in" && t.name.toLowerCase() === name.trim().toLowerCase())
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return matches[0] || null;
  }

  // Cerrar cualquier panel lateral de edicion abierto al cambiar de pantalla o de documento.
  useEffect(() => {
    setShowTxForm(false);
    setShowBulkEdit(false);
    setShowCatEdit(false);
    setCatEditId(null);
    setShowAccForm(false);
    setShowDocForm(false);
    setShowCatForm(false);
  }, [view, activeDocId]);

  useEffect(() => {
    setFilters({ search: "", categories: [], subcategories: [], type: "all", from: "", to: "", matchMode: "all" });
    setSelectedIds(new Set());
  }, [activeDocId]);

  // Auto-post recurring items: whenever a recurring transaction's next occurrence
  // becomes due (its date has arrived), generate it automatically with status
  // "programado" so the user doesn't have to re-enter it every period. Cross-document
  // recurring transfers are skipped here to avoid coordinating two files at once.
  // Also: any movement still marked "programado" whose date has already arrived
  // flips automatically to "pendiente", since it's no longer just a future plan.
  useEffect(() => {
    setDocuments((prevDocs) => {
      const today = todayISO();
      let changed = false;
      const nextDocs = prevDocs.map((doc) => {
        let txs = doc.transactions;

        const dueFlip = txs.filter((t) => t.status === "programado" && t.date <= today);
        if (dueFlip.length > 0) {
          const flipIds = new Set(dueFlip.map((t) => t.id));
          const flipGroupIds = new Set(dueFlip.filter((t) => t.transferGroupId).map((t) => t.transferGroupId));
          txs = txs.map((t) => ((flipIds.has(t.id) || (t.transferGroupId && flipGroupIds.has(t.transferGroupId)))
            ? Object.assign({}, t, { status: "pendiente" })
            : t));
        }

        const seriesMax = {};
        txs.forEach((t) => {
          if (!t.recurring || t.type === "transfer" || t.type === "transfer_in") return;
          const key = seriesKeyOf(t);
          if (!seriesMax[key] || t.date > seriesMax[key].date) seriesMax[key] = t;
        });
        const additions = [];
        const weekLimit = endOfCurrentWeekISO();
        Object.values(seriesMax).forEach((tx) => {
          const nd = nextDate(tx.date, tx.recurring);
          if (nd > weekLimit) return;
          if (tx.recurring.until && nd > tx.recurring.until) return;
          const exists = txs.some((t) => t.date === nd && t.accountId === tx.accountId && t.name === tx.name && t.categoryId === tx.categoryId && t.subcategoryId === tx.subcategoryId && t.type === tx.type && Number(t.amount) === Number(tx.amount));
          if (exists) return;
          additions.push(Object.assign({}, tx, { id: nextId(), date: nd, status: "programado" }));
        });
        if (additions.length === 0 && dueFlip.length === 0) return doc;
        changed = true;
        return Object.assign({}, doc, { transactions: txs.concat(additions) });
      });
      return changed ? nextDocs : prevDocs;
    });
  }, [documents]);

  function submitTx(e) {
    e.preventDefault();
    if (!txDraft.name || !txDraft.amount || !txDraft.accountId) return;
    const effectiveDate = txDraft.date || todayISO();
    const amount = Number(txDraft.amount);
    const recurring = txDraft.recurringOn ? { interval: Number(txDraft.freqInterval) || 1, unit: txDraft.freqUnit, until: txDraft.freqNoEnd ? null : (txDraft.freqEndDate || null), variable: !!txDraft.variableAmount, defaultAmount: amount } : null;

    if (txDraft.type === "transfer") {
      if (txDraft.toDocId === activeDocId && txDraft.toAccountId === txDraft.accountId) return;
      const groupId = nextId();
      const targetDoc = documents.find((d) => d.id === txDraft.toDocId);
      const sourceAccName = accountName(txDraft.accountId);
      const targetAccName = (targetDoc && targetDoc.accounts.find((a) => a.id === txDraft.toAccountId) || {}).name || "-";
      const crossDoc = txDraft.toDocId !== activeDocId;

      const legTransfer = {
        id: nextId(), accountId: txDraft.accountId, date: effectiveDate, name: txDraft.name || "Transferencia",
        categoryId: null, subcategoryId: null, amount, type: "transfer", recurring, transferGroupId: groupId, status: txDraft.status,
        toAccountId: txDraft.toAccountId, toDocId: txDraft.toDocId,
        toLabel: crossDoc ? ((targetDoc ? targetDoc.name : "-") + " - " + targetAccName) : targetAccName,
      };
      const legTransferIn = {
        id: nextId(), accountId: txDraft.toAccountId, date: effectiveDate, name: txDraft.name || "Transferencia",
        categoryId: null, subcategoryId: null, amount, type: "transfer_in", recurring, transferGroupId: groupId, status: txDraft.status,
        fromAccountId: txDraft.accountId, fromDocId: activeDocId,
        fromLabel: crossDoc ? (activeDoc.name + " - " + sourceAccName) : sourceAccName,
      };

      const removeOldGroup = (d) => (txDraft.id
        ? Object.assign({}, d, { transactions: d.transactions.filter((x) => x.transferGroupId !== txDraft.linkedGroupId) })
        : d);

      if (!crossDoc) {
        applyToDocs([{ docId: activeDocId, fn: (d) => {
          const base = txDraft.id ? removeOldGroup(d) : d;
          return Object.assign({}, base, { transactions: base.transactions.concat([legTransfer, legTransferIn]) });
        } }]);
      } else {
        applyToDocs([
          { docId: activeDocId, fn: (d) => {
            const base = txDraft.id ? removeOldGroup(d) : d;
            return Object.assign({}, base, { transactions: base.transactions.concat([legTransfer]) });
          } },
          { docId: txDraft.toDocId, fn: (d) => {
            const base = txDraft.id ? removeOldGroup(d) : d;
            return Object.assign({}, base, { transactions: base.transactions.concat([legTransferIn]) });
          } },
        ]);
      }
    } else if (txDraft.id) {
      setTransactions((prev) => prev.map((t) => t.id === txDraft.id
        ? Object.assign({}, t, { accountId: txDraft.accountId, date: effectiveDate, name: txDraft.name, comment: txDraft.comment, categoryId: txDraft.categoryId, subcategoryId: txDraft.subcategoryId, subsubcategoryId: txDraft.subsubcategoryId, amount, type: txDraft.type, recurring, status: txDraft.status })
        : t));
    } else {
      setTransactions((prev) => prev.concat([{
        id: nextId(), accountId: txDraft.accountId, date: effectiveDate, name: txDraft.name,
        comment: txDraft.comment, categoryId: txDraft.categoryId, subcategoryId: txDraft.subcategoryId, subsubcategoryId: txDraft.subsubcategoryId, amount, type: txDraft.type, recurring, status: txDraft.status,
      }]));
    }
    resetDraft();
  }

  function editTx(t) {
    if (t.type === "transfer" || t.type === "transfer_in") {
      const isIncoming = t.type === "transfer_in";
      setTxDraft({
        id: t.id, linkedGroupId: t.transferGroupId,
        accountId: isIncoming ? t.fromAccountId : t.accountId,
        toDocId: isIncoming ? activeDocId : (t.toDocId || activeDocId),
        toAccountId: isIncoming ? t.accountId : t.toAccountId,
        date: t.date, name: t.name, categoryId: null, subcategoryId: null, amount: String(t.amount),
        type: "transfer", status: t.status || "pendiente", recurringOn: !!t.recurring, variableAmount: !!(t.recurring && t.recurring.variable), freqInterval: t.recurring ? t.recurring.interval : 1, freqUnit: t.recurring ? t.recurring.unit : "months", freqEndDate: (t.recurring && t.recurring.until) || "", freqNoEnd: !(t.recurring && t.recurring.until),
      });
    } else {
      setTxDraft({
        id: t.id, accountId: t.accountId, toDocId: activeDocId, toAccountId: accounts[0]?.id,
        date: t.date, name: t.name, comment: t.comment || "", categoryId: t.categoryId, subcategoryId: t.subcategoryId, subsubcategoryId: t.subsubcategoryId,
        amount: String(t.amount),
        type: t.type, status: t.status || "pendiente", recurringOn: !!t.recurring, variableAmount: !!(t.recurring && t.recurring.variable), freqInterval: t.recurring ? t.recurring.interval : 1, freqUnit: t.recurring ? t.recurring.unit : "months", freqEndDate: (t.recurring && t.recurring.until) || "", freqNoEnd: !(t.recurring && t.recurring.until),
      });
    }
    setShowTxForm(true);
  }

  function removeTx(t) {
    if (t.type === "transfer" || t.type === "transfer_in") {
      setDocuments((prev) => prev.map((d) => Object.assign({}, d, {
        transactions: d.transactions.filter((x) => x.transferGroupId !== t.transferGroupId),
      })));
    } else {
      setTransactions((prev) => prev.filter((x) => x.id !== t.id));
    }
  }

  function cycleStatus(t) {
    const idx = STATUSES.findIndex((s) => s.value === (t.status || "pendiente"));
    const next = STATUSES[(idx + 1) % STATUSES.length].value;
    if (t.type === "transfer" || t.type === "transfer_in") {
      setDocuments((prev) => prev.map((d) => Object.assign({}, d, {
        transactions: d.transactions.map((x) => (x.transferGroupId === t.transferGroupId ? Object.assign({}, x, { status: next }) : x)),
      })));
    } else {
      setTransactions((prev) => prev.map((x) => (x.id === t.id ? Object.assign({}, x, { status: next }) : x)));
    }
  }

  function txGroupKey(t) {
    if (txSort.field === "fecha") return monthKey(t.date);
    if (txSort.field === "estado") return t.status || "";
    if (txSort.field === "descripcion") return t.name;
    if (txSort.field === "comentario") return t.comment || "";
    if (txSort.field === "importe") return String(t.amount);
    return monthKey(t.date);
  }
  function txGroupLabel(t) {
    if (txSort.field === "fecha") return monthYearLabel(t.date);
    if (txSort.field === "estado") return statusInfo(t.status).label;
    if (txSort.field === "descripcion") return t.name;
    if (txSort.field === "comentario") return t.comment || "Sin comentario";
    if (txSort.field === "importe") return fmt(Number(t.amount));
    return monthYearLabel(t.date);
  }
  function reorderWithinGroup(draggedId, targetId) {
    const dragged = transactions.find((t) => t.id === draggedId);
    const target = transactions.find((t) => t.id === targetId);
    if (!dragged || !target || dragged.id === target.id) return;
    if (txGroupKey(dragged) !== txGroupKey(target)) return;
    const draggedRank = dragged.manualRank !== undefined ? dragged.manualRank : dragged.id;
    const targetRank = target.manualRank !== undefined ? target.manualRank : target.id;
    setTransactions((prev) => prev.map((t) => {
      if (t.id === dragged.id) return Object.assign({}, t, { manualRank: targetRank });
      if (t.id === target.id) return Object.assign({}, t, { manualRank: draggedRank });
      return t;
    }));
  }

  function toggleMonthCollapse(key) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function clearSelectionAndFilters() {
    setSelectedIds(new Set());
    setFilters({ search: "", categories: [], subcategories: [], type: "all", from: "", to: "", matchMode: "all" });
    setTxSort({ field: "fecha", dir: "desc" });
    setMovementRangeDraft({ from: todayISO(), to: endOfYearISO() });
    setCollapsedMonths(new Set());
    setShowMovementsRange(false);
    setShowFilters(false);
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleRowClick(e, id) {
    if (e.shiftKey) {
      if (lastClickedId !== null) {
        const ids = filteredTx.map((t) => t.id);
        const lastIdx = ids.indexOf(lastClickedId);
        const curIdx = ids.indexOf(id);
        if (lastIdx !== -1 && curIdx !== -1) {
          const start = Math.min(lastIdx, curIdx);
          const end = Math.max(lastIdx, curIdx);
          const rangeIds = ids.slice(start, end + 1);
          setSelectedIds(new Set(rangeIds));
          return;
        }
      }
      toggleSelect(id);
      setLastClickedId(id);
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      toggleSelect(id);
      setLastClickedId(id);
      return;
    }
    const wasOnlySelected = selectedIds.size === 1 && selectedIds.has(id);
    if (wasOnlySelected) {
      setSelectedIds(new Set());
      resetDraft();
    } else {
      setSelectedIds(new Set([id]));
      const t = transactions.find((x) => x.id === id);
      if (t) editTx(t);
    }
    setLastClickedId(id);
  }

  function duplicateSelected() {
    const items = transactions.filter((t) => selectedIds.has(t.id) && t.type !== "transfer" && t.type !== "transfer_in");
    if (items.length === 0) return;
    setTransactions((prev) => prev.concat(items.map((t) => Object.assign({}, t, { id: nextId(), status: "pendiente" }))));
    setSelectedIds(new Set());
  }

  function deleteSelected() {
    if (!window.confirm("¿Eliminar los movimientos seleccionados?")) return;
    const toDelete = transactions.filter((t) => selectedIds.has(t.id));
    const groupIds = new Set(toDelete.filter((t) => t.transferGroupId).map((t) => t.transferGroupId));
    const plainIds = new Set(toDelete.filter((t) => !t.transferGroupId).map((t) => t.id));
    setDocuments((prev) => prev.map((d) => Object.assign({}, d, {
      transactions: d.transactions.filter((x) => !(groupIds.has(x.transferGroupId) || plainIds.has(x.id))),
    })));
    setSelectedIds(new Set());
  }

  function toggleFilterCategory(id) {
    setFilters((f) => {
      const has = f.categories.includes(id);
      const newCats = has ? f.categories.filter((x) => x !== id) : f.categories.concat([id]);
      const validIds = newCats.length === 0 ? null : new Set(categories.filter((c) => newCats.includes(c.id)).flatMap((c) => c.subcategories.map((s) => s.id)));
      const newSubs = validIds ? f.subcategories.filter((sid) => validIds.has(sid)) : f.subcategories;
      return Object.assign({}, f, { categories: newCats, subcategories: newSubs });
    });
  }

  function toggleFilterSubcategory(id) {
    setFilters((f) => {
      const has = f.subcategories.includes(id);
      return Object.assign({}, f, { subcategories: has ? f.subcategories.filter((x) => x !== id) : f.subcategories.concat([id]) });
    });
  }

  function saveCurrentFilter(e) {
    e.preventDefault();
    if (!saveFilterName.trim()) return;
    setSavedFilters((prev) => prev.concat([{ id: nextId(), name: saveFilterName.trim(), filters: Object.assign({}, filters) }]));
    setSaveFilterName("");
    setShowSaveFilterForm(false);
  }

  function applySavedFilter(sf) {
    setFilters(Object.assign({}, sf.filters));
    setShowFilters(true);
    setView("transactions");
  }

  function removeSavedFilter(id) {
    setSavedFilters((prev) => prev.filter((sf) => sf.id !== id));
  }

  function openBulkEdit() {
    const selected = transactions.filter((t) => selectedIds.has(t.id));
    const fieldsToCheck = ["accountId", "status", "date", "categoryId", "subcategoryId", "subsubcategoryId", "comment", "amount"];
    const draft = {};
    fieldsToCheck.forEach((f) => {
      const values = selected.map((t) => (t[f] === undefined ? null : t[f]));
      const allSame = values.every((v) => v === values[0]);
      draft[f] = allSame ? values[0] : MIXED;
    });
    setBulkEdit(draft);
    setBulkEditTouched(new Set());
    setShowTxForm(false);
    setShowBulkEdit(true);
  }

  function touchBulkField(field, value) {
    setBulkEdit((b) => Object.assign({}, b, { [field]: value }));
    setBulkEditTouched((prev) => new Set(prev).add(field));
  }

  function applyBulkEdit(e) {
    e.preventDefault();
    if (bulkEditTouched.size === 0) { setShowBulkEdit(false); setSelectedIds(new Set()); return; }
    if (!window.confirm("¿Aplicar los cambios a " + selectedIds.size + " movimientos?")) return;
    const selectedTx = transactions.filter((t) => selectedIds.has(t.id));
    const groupIds = new Set(selectedTx.filter((t) => t.transferGroupId).map((t) => t.transferGroupId));
    setDocuments((prev) => prev.map((d) => {
      if (d.id !== activeDocId) return d;
      const txs = d.transactions.map((t) => {
        const isSelected = selectedIds.has(t.id) || (t.transferGroupId && groupIds.has(t.transferGroupId));
        if (!isSelected) return t;
        const isTransferLeg = t.type === "transfer" || t.type === "transfer_in";
        const patch = {};
        bulkEditTouched.forEach((field) => {
          if (isTransferLeg && (field === "accountId" || field === "categoryId" || field === "subcategoryId" || field === "subsubcategoryId")) return;
          patch[field] = bulkEdit[field];
        });
        return Object.assign({}, t, patch);
      });
      return Object.assign({}, d, { transactions: txs });
    }));
    setShowBulkEdit(false);
    setSelectedIds(new Set());
  }

  function createNewDestinoAccount(e) {
    e.preventDefault();
    if (!newDestinoDraft.name.trim()) return;
    const newAcc = { id: nextId(), name: newDestinoDraft.name.trim(), opening: Number(newDestinoDraft.opening) || 0, warning: 0, type: newDestinoDraft.type, linkedAccountId: null };
    updateDoc(txDraft.toDocId, (d) => Object.assign({}, d, { accounts: d.accounts.concat([newAcc]) }));
    setTxDraft((d) => Object.assign({}, d, { toAccountId: newAcc.id }));
    setNewDestinoDraft({ name: "", opening: "", type: "checking" });
    setShowNewDestino(false);
  }

  function addAccount(e) {
    e.preventDefault();
    if (!accDraft.name) return;
    if (accDraft.type === "credit" && !accDraft.linkedAccountId) return;
    if (accDraft.id) {
      setAccounts((prev) => prev.map((a) => (a.id === accDraft.id
        ? Object.assign({}, a, { name: accDraft.name, opening: Number(accDraft.opening) || 0, type: accDraft.type, savingsKind: accDraft.savingsKind, cardKind: accDraft.cardKind, paymentMode: accDraft.paymentMode, monthlyPayment: Number(accDraft.monthlyPayment) || 0, linkedAccountId: accDraft.type === "credit" ? accDraft.linkedAccountId : null })
        : a)));
    } else {
      setAccounts((prev) => prev.concat([{ id: nextId(), name: accDraft.name, opening: Number(accDraft.opening) || 0, warning: 0, type: accDraft.type, savingsKind: accDraft.savingsKind, cardKind: accDraft.cardKind, paymentMode: accDraft.paymentMode, monthlyPayment: Number(accDraft.monthlyPayment) || 0, linkedAccountId: accDraft.type === "credit" ? accDraft.linkedAccountId : null }]));
    }
    setAccDraft({ id: null, name: "", opening: "", type: "checking", savingsKind: "savings", cardKind: "debit", paymentMode: "month_end", monthlyPayment: "", linkedAccountId: null, lockType: false });
    setShowAccForm(false);
  }

  function openAccountForm(type, existing, lockType) {
    if (existing) {
      setAccDraft({ id: existing.id, name: existing.name, opening: String(existing.opening), type: existing.type || "checking", savingsKind: existing.savingsKind || "savings", cardKind: existing.cardKind || "debit", paymentMode: existing.paymentMode || "month_end", monthlyPayment: String(existing.monthlyPayment || ""), linkedAccountId: existing.linkedAccountId || null, lockType: false });
    } else {
      setAccDraft({ id: null, name: "", opening: "", type: type || "checking", savingsKind: "savings", cardKind: "debit", paymentMode: "month_end", monthlyPayment: "", linkedAccountId: null, lockType: !!lockType });
    }
    setShowAccForm(true);
  }

  function removeAccount(id) {
    if (!window.confirm("¿Eliminar esta cuenta y sus movimientos?")) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setTransactions((prev) => prev.filter((t) => t.accountId !== id));
    setActiveAccounts((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleAccountSelect(id, additive) {
    setActiveAccounts((prev) => {
      if (!additive) {
        return prev.size === 1 && prev.has(id) ? new Set() : new Set([id]);
      }
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function addDocument(e) {
    e.preventDefault();
    if (!docNameDraft.trim()) return;
    const newDoc = { id: nextId(), name: docNameDraft.trim(), budgets: {}, accounts: [], categories: [], transactions: [], savedFilters: [] };
    setDocuments((prev) => prev.concat([newDoc]));
    setActiveDocId(newDoc.id);
    setActiveAccounts(new Set());
    setView("transactions");
    setDocNameDraft("");
    setShowDocForm(false);
  }

  function removeDocument(id) {
    if (documents.length <= 1) return;
    if (!window.confirm("¿Eliminar este documento?")) return;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (activeDocId === id) {
      const remaining = documents.filter((d) => d.id !== id);
      setActiveDocId(remaining[0].id);
      setActiveAccounts(new Set());
    }
  }

  function addCategory(e) {
    e.preventDefault();
    if (!catDraft.name.trim()) return;
    setCategories((prev) => prev.concat([{ id: nextId(), name: catDraft.name.trim(), color: catDraft.color, kind: catDraft.kind, subcategories: [] }]));
    setCatDraft({ name: "", color: PALETTE[0], kind: "expense" });
    setShowCatForm(false);
  }
  function removeCategory(catId) {
    if (!window.confirm("¿Eliminar esta categoria?")) return;
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  }
  function setCategoryColor(catId, color) {
    setCategories((prev) => prev.map((c) => (c.id === catId
      ? Object.assign({}, c, { color: color, subcategories: c.subcategories.map((s) => Object.assign({}, s, { color: color, subcategories: (s.subcategories || []).map((ss) => Object.assign({}, ss, { color: color })) })) })
      : c)));
  }
  function setCategoryName(catId, name) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? Object.assign({}, c, { name: name }) : c)));
  }
  function setCategoryKind(catId, kind) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? Object.assign({}, c, { kind: kind }) : c)));
  }
  function addSubcategory(catId, e) {
    e.preventDefault();
    if (!subDraft.name.trim()) return;
    setCategories((prev) => prev.map((c) => (c.id === catId
      ? Object.assign({}, c, { subcategories: c.subcategories.concat([{ id: nextId(), name: subDraft.name.trim(), color: c.color, subcategories: [] }]) })
      : c)));
    setSubDraft({ name: "", color: PALETTE[0] });
    setSubFormFor(null);
  }
  function removeSubcategory(catId, subId) {
    if (!window.confirm("¿Eliminar esta subcategoria?")) return;
    setCategories((prev) => prev.map((c) => (c.id === catId ? Object.assign({}, c, { subcategories: c.subcategories.filter((s) => s.id !== subId) }) : c)));
  }

  function addSubSubcategory(catId, subId, e) {
    e.preventDefault();
    if (!subDraft.name.trim()) return;
    setCategories((prev) => prev.map((c) => (c.id !== catId ? c : Object.assign({}, c, {
      subcategories: c.subcategories.map((s) => (s.id !== subId ? s : Object.assign({}, s, {
        subcategories: (s.subcategories || []).concat([{ id: nextId(), name: subDraft.name.trim(), color: c.color }]),
      }))),
    }))));
    setSubDraft({ name: "", color: PALETTE[0] });
    setSubFormFor(null);
  }
  function removeSubSubcategory(catId, subId, subsubId) {
    setCategories((prev) => prev.map((c) => (c.id !== catId ? c : Object.assign({}, c, {
      subcategories: c.subcategories.map((s) => (s.id !== subId ? s : Object.assign({}, s, {
        subcategories: (s.subcategories || []).filter((ss) => ss.id !== subsubId),
      }))),
    }))));
  }

  function findOrCreateCategory(name) {
    let cat = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!cat) {
      cat = { id: nextId(), name: name, color: PALETTE[categories.length % PALETTE.length], kind: "expense", subcategories: [] };
      setCategories((prev) => prev.concat([cat]));
    }
    return cat;
  }

  function exportCSV() {
    const rows = filteredTx.slice().reverse().map((t) => {
      const info = catInfo(t.categoryId, t.subcategoryId, t.subsubcategoryId);
      return {
        Fecha: t.date, Cuenta: accountName(t.accountId), Descripcion: t.name,
        Categoria: t.type === "transfer" || t.type === "transfer_in" ? "Transferencia" : info.name,
        Tipo: t.type === "income" ? "Ingreso" : t.type === "expense" ? "Gasto" : "Transferencia",
        Importe: t.amount, Recurrente: t.recurring ? (t.recurring.interval + "-" + t.recurring.unit) : "",
      };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = activeDoc.name + "-movimientos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function importCSV(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = Papa.parse(String(reader.result), { header: true, skipEmptyLines: true });
      const data = parsed.data;
      const byName = {};
      accounts.forEach((a) => (byName[a.name] = a.id));
      let nextAccounts = accounts.slice();
      let nextCategories = categories.slice();
      const imported = [];
      data.forEach((row) => {
        const accNameField = row.Cuenta && row.Cuenta.trim();
        if (!accNameField) return;
        let accId = byName[accNameField];
        if (!accId) {
          accId = nextId();
          nextAccounts.push({ id: accId, name: accNameField, opening: 0, warning: 0 });
          byName[accNameField] = accId;
        }
        const tipo = (row.Tipo || "").toLowerCase();
        const type = tipo.indexOf("ingreso") === 0 ? "income" : "expense";
        const catName = (row.Categoria || "Otros").trim();
        let cat = nextCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase() && (c.kind || "expense") === type);
        if (!cat) {
          cat = { id: nextId(), name: catName, color: PALETTE[nextCategories.length % PALETTE.length], kind: type, subcategories: [] };
          nextCategories.push(cat);
        }
        imported.push({
          id: nextId(), accountId: accId, date: row.Fecha || todayISO(), name: row.Descripcion || "Importado",
          categoryId: cat.id, subcategoryId: null, amount: Number(row.Importe) || 0, type: type,
          recurring: row.Recurrente ? (() => {
            const parts = String(row.Recurrente).split("-");
            const unit = ["days", "months", "years"].indexOf(parts[1]) >= 0 ? parts[1] : "months";
            return { interval: Number(parts[0]) || 1, unit: unit };
          })() : null,
        });
      });
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setTransactions((prev) => prev.concat(imported));
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const targetDocAccounts = (documents.find((d) => d.id === txDraft.toDocId) || activeDoc).accounts;
  const selectedCategory = categories.find((c) => c.id === txDraft.categoryId);
  const formCategoryOptions = txDraft.type === "income" ? categories.filter((c) => c.kind === "income") : categories.filter((c) => (c.kind || "expense") !== "income");
  const filterCategoryChoices = filters.type === "income" ? categories.filter((c) => c.kind === "income") : filters.type === "expense" ? categories.filter((c) => (c.kind || "expense") !== "income") : categories;
  const filterCategoryPool = filters.categories.length === 0 ? filterCategoryChoices : filterCategoryChoices.filter((c) => filters.categories.includes(c.id));
  const filterSubcategoryOptions = filterCategoryPool.flatMap((c) => c.subcategories.map((s) => ({ id: s.id, label: c.name + " / " + s.name })));
  const selectedSubcategory = selectedCategory && selectedCategory.subcategories.find((s) => s.id === txDraft.subcategoryId);

  const txForm = showTxForm && (
    <form onSubmit={submitTx} style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      {txDraft.type !== "transfer" && (
        <Field label="Cuenta">
          <select value={txDraft.accountId} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { accountId: Number(e.target.value) }))} style={inputStyle}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}

      {txDraft.type === "transfer" && (
        <>
          <Field label="Vincular (archivo)">
            <select
              value={txDraft.toDocId}
              onChange={(e) => {
                const docId = Number(e.target.value);
                const doc = documents.find((d) => d.id === docId);
                setTxDraft((d) => Object.assign({}, d, { toDocId: docId, toAccountId: doc && doc.accounts[0] ? doc.accounts[0].id : null }));
              }}
              style={inputStyle}
            >
              {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}{doc.id === activeDocId ? " (este archivo)" : ""}</option>)}
            </select>
          </Field>
          <Field label="Cuenta origen">
            <select value={txDraft.accountId} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { accountId: Number(e.target.value) }))} style={inputStyle}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Destino (cuenta)">
            <select
              value={showNewDestino ? "__new__" : (txDraft.toAccountId || "")}
              onChange={(e) => {
                if (e.target.value === "__new__") { setShowNewDestino(true); return; }
                setShowNewDestino(false);
                setTxDraft((d) => Object.assign({}, d, { toAccountId: Number(e.target.value) }));
              }}
              style={inputStyle}
            >
              {targetDocAccounts.length === 0 && <option value="">Sin cuentas en este archivo</option>}
              {targetDocAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              <option value="__new__">+ Anadir nuevo destino...</option>
            </select>
          </Field>
          {showNewDestino && (
            <form onSubmit={createNewDestinoAccount} style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8, padding: 10, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8 }}>
              <input autoFocus placeholder="Nombre de la cuenta destino" value={newDestinoDraft.name} onChange={(e) => setNewDestinoDraft((d) => Object.assign({}, d, { name: e.target.value }))} style={inputStyle} />
              <select value={newDestinoDraft.type} onChange={(e) => setNewDestinoDraft((d) => Object.assign({}, d, { type: e.target.value }))} style={inputStyle}>
                {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input placeholder="Saldo inicial" type="number" step="0.01" value={newDestinoDraft.opening} onChange={(e) => setNewDestinoDraft((d) => Object.assign({}, d, { opening: e.target.value }))} style={inputStyle} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={{ flex: 1, background: T.accent, border: "none", borderRadius: 6, padding: "7px 0", color: "#fff", fontWeight: 600, fontSize: 12.5 }}>Crear y usar</button>
                <button type="button" onClick={() => setShowNewDestino(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 9px", color: T.textMuted }}><X size={12} /></button>
              </div>
            </form>
          )}
        </>
      )}

      <Field label="Tipo">
        <div style={{ display: "flex", gap: 6 }}>
          {[["expense", "Gasto"], ["income", "Ingreso"], ["transfer", "Transf."]].map((pair) => (
            <button
              key={pair[0]} type="button"
              onClick={() => setTxDraft((d) => {
                const wantKind = pair[0] === "income" ? "income" : pair[0] === "expense" ? "expense" : null;
                const currentCat = categories.find((c) => c.id === d.categoryId);
                const stillValid = wantKind && currentCat && (currentCat.kind || "expense") === wantKind;
                const nextCat = stillValid ? currentCat : (wantKind ? categories.find((c) => (c.kind || "expense") === wantKind) : null);
                return Object.assign({}, d, {
                  type: pair[0],
                  categoryId: nextCat ? nextCat.id : d.categoryId,
                  subcategoryId: stillValid ? d.subcategoryId : null,
                  subsubcategoryId: stillValid ? d.subsubcategoryId : null,
                });
              })}
              style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "1px solid " + (txDraft.type === pair[0] ? T.accent : T.border), background: txDraft.type === pair[0] ? "#EAF1FC" : "#FFFFFF", color: txDraft.type === pair[0] ? T.accent : T.textMuted, fontSize: 12, fontWeight: 600 }}
            >
              {pair[1]}
            </button>
          ))}
        </div>
      </Field>
      <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.textMuted }}>
          <input type="checkbox" checked={txDraft.recurringOn} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { recurringOn: e.target.checked }))} />
          Movimiento recurrente
        </label>
        {txDraft.recurringOn && (
          <>
            <Field label="Periodicidad">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, color: T.textMuted }}>Cada</span>
                <input
                  type="number" min="1" value={txDraft.freqInterval}
                  onChange={(e) => setTxDraft((d) => Object.assign({}, d, { freqInterval: e.target.value }))}
                  style={Object.assign({}, inputStyle, { width: 60 })}
                />
                <select value={txDraft.freqUnit} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { freqUnit: e.target.value }))} style={Object.assign({}, inputStyle, { width: 110 })}>
                  {RECUR_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Fecha inicio">
                  <DatePicker value={txDraft.date} onChange={(v) => setTxDraft((d) => Object.assign({}, d, { date: v }))} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Fecha final">
                  <DatePicker
                    value={txDraft.freqEndDate} disabled={txDraft.freqNoEnd}
                    onChange={(v) => setTxDraft((d) => Object.assign({}, d, { freqEndDate: v }))}
                    style={txDraft.freqNoEnd ? { background: T.borderSoft, color: T.textFaint } : {}}
                  />
                </Field>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
              <input type="checkbox" checked={txDraft.freqNoEnd} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { freqNoEnd: e.target.checked }))} />
              Sin fecha final (se repite indefinidamente)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
              <input type="checkbox" checked={!!txDraft.variableAmount} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { variableAmount: e.target.checked }))} />
              Importe variable (las recurrencias usan este importe por defecto hasta que se personalicen)
            </label>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        {selectedCategory && (
          <div style={{ marginTop: 19, height: 34, display: "flex", alignItems: "center", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setDescColorPickerOpen((o) => !o)}
              style={{ background: "none", border: "none", padding: 0, lineHeight: 0 }}
              aria-label="Cambiar color de la categoria"
            >
              <span style={dot(selectedCategory.color, 14)} />
            </button>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <Field label="Descripcion">
            <input
              autoFocus value={txDraft.name}
              onChange={(e) => {
                const val = e.target.value;
                setTxDraft((d) => {
                  let next = Object.assign({}, d, { name: val });
                  if (!d.id) {
                    const match = findLastCategoryForName(val);
                    if (match) next = Object.assign(next, { categoryId: match.categoryId, subcategoryId: match.subcategoryId, subsubcategoryId: match.subsubcategoryId });
                  }
                  return next;
                });
              }}
              style={inputStyle} placeholder="p. ej. Supermercado"
            />
          </Field>
        </div>
      </div>
      {descColorPickerOpen && selectedCategory && (
        <div style={{ marginTop: -6 }}>
          <ColorSwatches value={selectedCategory.color} onChange={(c) => { setCategoryColor(selectedCategory.id, c); setDescColorPickerOpen(false); }} size={14} />
        </div>
      )}

      <Field label="Estado">
        <div style={{ position: "relative" }}>
          {(() => { const SIcon = statusInfo(txDraft.status).icon; return <SIcon size={15} style={{ position: "absolute", left: 10, top: 10, color: statusInfo(txDraft.status).color, pointerEvents: "none", zIndex: 1 }} />; })()}
          <select value={txDraft.status} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { status: e.target.value }))} style={Object.assign({}, inputStyle, { paddingLeft: 34 })}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </Field>

      {!txDraft.recurringOn && (
        <Field label="Fecha">
          <DatePicker value={txDraft.date} onChange={(v) => setTxDraft((d) => Object.assign({}, d, { date: v }))} />
        </Field>
      )}

      <Field label="Importe">
        <input type="number" step="0.01" value={txDraft.amount} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { amount: e.target.value }))} style={inputStyle} placeholder="0.00" />
      </Field>

      {txDraft.type !== "transfer" && (
        <Field label="Categoria">
          <select
            value={txDraft.categoryId || ""}
            onChange={(e) => setTxDraft((d) => Object.assign({}, d, { categoryId: Number(e.target.value), subcategoryId: null, subsubcategoryId: null }))}
            style={inputStyle}
          >
            {formCategoryOptions.length === 0 && <option value="">Sin categorias</option>}
            {formCategoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {txDraft.type !== "transfer" && selectedCategory && selectedCategory.subcategories.length > 0 && (
        <Field label="Subcategoria">
          <select value={txDraft.subcategoryId || ""} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { subcategoryId: e.target.value ? Number(e.target.value) : null, subsubcategoryId: null }))} style={inputStyle}>
            <option value="">Ninguna</option>
            {selectedCategory.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}
      {txDraft.type !== "transfer" && selectedSubcategory && (selectedSubcategory.subcategories || []).length > 0 && (
        <Field label="Sub-subcategoria">
          <select value={txDraft.subsubcategoryId || ""} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { subsubcategoryId: e.target.value ? Number(e.target.value) : null }))} style={inputStyle}>
            <option value="">Ninguna</option>
            {selectedSubcategory.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}

      <Field label="Comentario">
        <input value={txDraft.comment || ""} onChange={(e) => setTxDraft((d) => Object.assign({}, d, { comment: e.target.value }))} style={inputStyle} placeholder="Opcional" />
      </Field>

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
        <button type="button" onClick={resetDraft} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 14px", color: T.textMuted, fontSize: 13 }}>Cancelar</button>
        <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
          {txDraft.id ? "Guardar cambios" : "Guardar movimiento"}
        </button>
      </div>
    </form>
  );

  const bulkCategory = bulkEdit.categoryId && bulkEdit.categoryId !== MIXED ? categories.find((c) => c.id === bulkEdit.categoryId) : null;
  const bulkSubcategory = bulkCategory && bulkEdit.subcategoryId && bulkEdit.subcategoryId !== MIXED ? bulkCategory.subcategories.find((s) => s.id === bulkEdit.subcategoryId) : null;
  const bulkEditForm = showBulkEdit && (
    <form onSubmit={applyBulkEdit} style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>
        Se aplicaran a los {selectedIds.size} movimientos seleccionados solo los campos que cambies aqui. Los que ya dicen "Varios valores" siguen sin tocarse hasta que los edites.
      </p>

      <Field label="Cuenta">
        <select
          value={bulkEdit.accountId === MIXED ? MIXED : (bulkEdit.accountId || "")}
          onChange={(e) => touchBulkField("accountId", Number(e.target.value))}
          style={Object.assign({}, inputStyle, bulkEdit.accountId === MIXED && !bulkEditTouched.has("accountId") ? { color: T.textFaint } : {})}
        >
          {bulkEdit.accountId === MIXED && <option value={MIXED} disabled hidden>Varios valores</option>}
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>

      <Field label="Estado">
        <select
          value={bulkEdit.status === MIXED ? MIXED : bulkEdit.status}
          onChange={(e) => touchBulkField("status", e.target.value)}
          style={Object.assign({}, inputStyle, bulkEdit.status === MIXED && !bulkEditTouched.has("status") ? { color: T.textFaint } : {})}
        >
          {bulkEdit.status === MIXED && <option value={MIXED} disabled hidden>Varios valores</option>}
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </Field>

      <Field label="Fecha">
        <DatePicker
          value={bulkEdit.date === MIXED ? "" : bulkEdit.date}
          placeholder={bulkEdit.date === MIXED ? "Varios valores" : undefined}
          onChange={(v) => touchBulkField("date", v)}
        />
      </Field>

      <Field label="Importe">
        <input
          type="number" step="0.01"
          value={bulkEdit.amount === MIXED ? "" : (bulkEdit.amount === null || bulkEdit.amount === undefined ? "" : bulkEdit.amount)}
          placeholder={bulkEdit.amount === MIXED ? "Varios valores" : "0,00"}
          onChange={(e) => touchBulkField("amount", e.target.value)}
          style={Object.assign({}, inputStyle, bulkEdit.amount === MIXED && !bulkEditTouched.has("amount") ? { color: T.textFaint } : {})}
        />
      </Field>

      <Field label="Categoria">
        <select
          value={bulkEdit.categoryId === MIXED ? MIXED : (bulkEdit.categoryId || "")}
          onChange={(e) => {
            const val = Number(e.target.value);
            setBulkEdit((b) => Object.assign({}, b, { categoryId: val, subcategoryId: null, subsubcategoryId: null }));
            setBulkEditTouched((prev) => new Set(prev).add("categoryId").add("subcategoryId").add("subsubcategoryId"));
          }}
          style={Object.assign({}, inputStyle, bulkEdit.categoryId === MIXED && !bulkEditTouched.has("categoryId") ? { color: T.textFaint } : {})}
        >
          {bulkEdit.categoryId === MIXED && <option value={MIXED} disabled hidden>Varios valores</option>}
          {categories.length === 0 && <option value="">Sin categorias</option>}
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {bulkCategory && bulkCategory.subcategories.length > 0 && (
        <Field label="Subcategoria">
          <select
            value={bulkEdit.subcategoryId === MIXED ? MIXED : (bulkEdit.subcategoryId || "")}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              setBulkEdit((b) => Object.assign({}, b, { subcategoryId: val, subsubcategoryId: null }));
              setBulkEditTouched((prev) => new Set(prev).add("subcategoryId").add("subsubcategoryId"));
            }}
            style={Object.assign({}, inputStyle, bulkEdit.subcategoryId === MIXED && !bulkEditTouched.has("subcategoryId") ? { color: T.textFaint } : {})}
          >
            {bulkEdit.subcategoryId === MIXED && <option value={MIXED} disabled hidden>Varios valores</option>}
            <option value="">Ninguna</option>
            {bulkCategory.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}
      {bulkSubcategory && (bulkSubcategory.subcategories || []).length > 0 && (
        <Field label="Sub-subcategoria">
          <select
            value={bulkEdit.subsubcategoryId === MIXED ? MIXED : (bulkEdit.subsubcategoryId || "")}
            onChange={(e) => touchBulkField("subsubcategoryId", e.target.value ? Number(e.target.value) : null)}
            style={Object.assign({}, inputStyle, bulkEdit.subsubcategoryId === MIXED && !bulkEditTouched.has("subsubcategoryId") ? { color: T.textFaint } : {})}
          >
            {bulkEdit.subsubcategoryId === MIXED && <option value={MIXED} disabled hidden>Varios valores</option>}
            <option value="">Ninguna</option>
            {bulkSubcategory.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}

      <Field label="Comentario">
        <input
          value={bulkEdit.comment === MIXED ? "" : (bulkEdit.comment || "")}
          placeholder={bulkEdit.comment === MIXED ? "Varios valores" : "Opcional"}
          onChange={(e) => touchBulkField("comment", e.target.value)}
          style={Object.assign({}, inputStyle, bulkEdit.comment === MIXED && !bulkEditTouched.has("comment") ? { color: T.textFaint } : {})}
        />
      </Field>

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
        <button type="button" onClick={() => setShowBulkEdit(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 14px", color: T.textMuted, fontSize: 13 }}>Cancelar</button>
        <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
          Aplicar a {selectedIds.size}
        </button>
      </div>
    </form>
  );

  const catEditCategory = categories.find((c) => c.id === catEditId);
  const catCreateForm = showCatForm && (
    <form onSubmit={addCategory} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Nombre">
        <input autoFocus placeholder="Nombre de la categoria" value={catDraft.name} onChange={(e) => setCatDraft((d) => Object.assign({}, d, { name: e.target.value }))} style={inputStyle} />
      </Field>
      <Field label="Color">
        <ColorSwatches value={catDraft.color} onChange={(c) => setCatDraft((d) => Object.assign({}, d, { color: c }))} size={18} />
      </Field>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>Crear</button>
        <button type="button" onClick={() => setShowCatForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 14px", color: T.textMuted, fontSize: 13 }}>Cancelar</button>
      </div>
    </form>
  );

  const catEditForm = showCatEdit && catEditCategory && (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Nombre">
        <input value={catEditCategory.name} onChange={(e) => setCategoryName(catEditCategory.id, e.target.value)} style={inputStyle} />
      </Field>

      <Field label="Tipo">
        <div style={{ display: "flex", gap: 6 }}>
          {[["expense", "Gasto"], ["income", "Ingreso"], ["transfer", "Traspaso"]].map((pair) => (
            <button key={pair[0]} type="button" onClick={() => setCategoryKind(catEditCategory.id, pair[0])} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "1px solid " + (catEditCategory.kind === pair[0] ? T.accent : T.border), background: catEditCategory.kind === pair[0] ? "#EAF1FC" : "#FFFFFF", color: catEditCategory.kind === pair[0] ? T.accent : T.textMuted, fontSize: 12, fontWeight: 600 }}>
              {pair[1]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Color">
        <ColorSwatches value={catEditCategory.color} onChange={(c) => setCategoryColor(catEditCategory.id, c)} size={18} />
      </Field>

      <Field label="Presupuesto mensual">
        <input
          type="number" placeholder="Sin limite" value={budgets[catEditCategory.id] === undefined ? "" : budgets[catEditCategory.id]}
          onChange={(e) => setBudgets((b) => Object.assign({}, b, { [catEditCategory.id]: e.target.value === "" ? undefined : Number(e.target.value) }))}
          style={inputStyle}
        />
      </Field>

      <div>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase", color: T.textMuted, fontWeight: 600 }}>Subcategorias</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {catEditCategory.subcategories.map((sub) => (
            <div key={sub.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "#FFFFFF", border: "1px solid " + T.borderSoft, borderRadius: 6 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5 }}>
                <span style={dot(tintColor(catEditCategory.color, 0.2), 8)} /> {sub.name}
              </span>
              <button onClick={() => removeSubcategory(catEditCategory.id, sub.id)} style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Eliminar " + sub.name}><X size={12} /></button>
            </div>
          ))}
          {catEditCategory.subcategories.length === 0 && (
            <div style={{ fontSize: 12, color: T.textFaint }}>Sin subcategorias todavia.</div>
          )}
        </div>

        {subFormFor === "cat:" + catEditCategory.id ? (
          <form onSubmit={(e) => addSubcategory(catEditCategory.id, e)} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
            <input autoFocus placeholder="Nombre" value={subDraft.name} onChange={(e) => setSubDraft((d) => Object.assign({}, d, { name: e.target.value }))} style={Object.assign({}, inputStyle, { fontSize: 12.5 })} />
            <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Anadir</button>
            <button type="button" onClick={() => setSubFormFor(null)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 8px", color: T.textMuted, flexShrink: 0 }}><X size={12} /></button>
          </form>
        ) : (
          <button onClick={() => { setSubFormFor("cat:" + catEditCategory.id); setSubDraft({ name: "", color: catEditCategory.color }); }} style={{ marginTop: 8, background: "none", border: "1px dashed " + T.border, borderRadius: 6, padding: "7px 10px", color: T.accent, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, width: "100%", justifyContent: "center" }}>
            <Plus size={12} /> Nueva
          </button>
        )}
      </div>

      <button onClick={() => { setShowCatEdit(false); setCatEditId(null); setSubFormFor(null); }} style={{ background: T.accent, border: "none", borderRadius: 6, padding: "9px 0", color: "#fff", fontWeight: 600, fontSize: 13 }}>Listo</button>
    </div>
  );

  return (
    <div style={{ height: "100vh", background: T.bg, color: T.text, fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        .amount { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .rowbtn { opacity: 0; transition: opacity .12s; }
        .accrow:hover .rowbtn { opacity: 1; }
        .accrow:hover { background: ${T.bgElevated}; }
        .navitem:hover { background: #EAEAEC; }
        .doctab:hover .docx { opacity: 1; }
        .catcard:hover .catx { opacity: 1; }
        button { cursor: pointer; }
        ::selection { background: ${T.accent}33; }
        select { appearance: none; -webkit-appearance: none; }
        input[type=checkbox] { accent-color: ${T.accent}; }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: (sidebarCollapsed ? 44 : sidebarWidth) + "px 1fr", height: "100%", border: "1px solid " + T.border, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "relative" }}>
        <aside style={{ background: T.sidebar, borderRight: "1px solid " + T.border, padding: sidebarCollapsed ? "12px 6px" : "12px 10px", overflowY: sidebarCollapsed ? "hidden" : "auto", display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "space-between", marginBottom: 14, flexShrink: 0 }}>
            {!sidebarCollapsed && (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <CircleDollarSign size={20} style={{ color: T.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>Conta-Nice</span>
              </div>
            )}
            <button onClick={() => setSidebarCollapsed((c) => !c)} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label={sidebarCollapsed ? "Expandir menu" : "Contraer menu"}>
              <List size={16} />
            </button>
          </div>

          {sidebarCollapsed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: T.textMuted }}>
              <FileText size={17} title="Documentos" />
              <Wallet size={17} title="Cuentas" />
              <Repeat size={17} title="Programador" />
              <CircleDollarSign size={17} title="Categorias" />
              <SlidersHorizontal size={17} title="Filtros" />
            </div>
          ) : (
          <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 10px 6px" }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600 }}>Documentos</span>
            <button onClick={() => setShowDocForm((s) => !s)} style={{ background: "none", border: "none", color: T.textMuted, padding: 1 }} aria-label="Nuevo documento"><Plus size={13} /></button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {documents.map((d) => (
              <div key={d.id} className="doctab" style={{ display: "flex", flexDirection: "column", gap: 2, background: d.id === activeDocId ? "#FFFFFF" : "transparent", border: "1px solid " + (d.id === activeDocId ? T.border : "transparent"), borderRadius: 6, padding: "3px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <button onClick={() => { setActiveDocId(d.id); setActiveAccounts(new Set()); setView("transactions"); }} style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, fontWeight: d.id === activeDocId ? 700 : 500, color: d.id === activeDocId ? T.text : T.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                    <FileText size={11} /> {d.name}
                  </button>
                  {documents.length > 1 && (
                    <button onClick={() => removeDocument(d.id)} style={{ background: "none", border: "none", color: T.textFaint, padding: "0 3px" }} aria-label={"Eliminar archivo " + d.name}><Trash2 size={10} /></button>
                  )}
                  <button
                    onClick={() => { setSavedDocFeedback(d.id); setTimeout(() => setSavedDocFeedback((cur) => (cur === d.id ? null : cur)), 1200); }}
                    style={{ background: "none", border: "none", color: savedDocFeedback === d.id ? T.income : T.textFaint, padding: "0 3px 0 0" }}
                    aria-label={"Guardar " + d.name} title="Guardar"
                  >
                    {savedDocFeedback === d.id ? <CheckCircle2 size={10} /> : <Save size={10} />}
                  </button>
                  <button style={{ background: "none", border: "none", color: T.textFaint, padding: "0 2px" }} aria-label={"Guardar como " + d.name} title="Guardar como"><FolderPlus size={10} /></button>
                </div>
                {d.id === activeDocId && (
                  <button onClick={() => setShowDocForm(true)} style={{ background: "none", border: "none", color: T.textFaint, padding: 0, display: "flex", alignItems: "center", gap: 3, fontSize: 10 }} aria-label="Vincular documento" title="Vincular documento">
                    <Link2 size={10} /> Vincular
                  </button>
                )}
              </div>
            ))}
          </div>
          {showDocForm && (
            <form onSubmit={addDocument} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input autoFocus placeholder="Nombre del archivo" value={docNameDraft} onChange={(e) => setDocNameDraft(e.target.value)} style={Object.assign({}, inputStyle, { fontSize: 12, padding: "6px 8px" })} />
              <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "0 10px", color: "#fff", fontSize: 12, fontWeight: 600 }}>Crear</button>
              <button type="button" onClick={() => { setShowDocForm(false); setDocNameDraft(""); }} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "0 8px", color: T.textMuted }} aria-label="Cancelar"><X size={13} /></button>
            </form>
          )}

          <div style={{ padding: "2px 8px 14px", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{activeDoc.name}</div>

          <div
            className="navitem"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, background: activeAccounts.size === 0 && view === "transactions" ? "#FFFFFF" : "transparent", boxShadow: activeAccounts.size === 0 && view === "transactions" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", borderRadius: 7, padding: "7px 10px 7px 10px" }}
          >
            <button onClick={() => { setActiveAccounts(new Set()); setView("transactions"); }} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, color: T.text, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
              <CircleDollarSign size={15} style={{ color: T.accent }} /> Grupos de cuentas
            </button>
            <button onClick={() => openAccountForm("checking", null, false)} style={{ background: "none", border: "none", color: T.textFaint, padding: 1, marginLeft: 6 }} aria-label="Anadir cuenta"><Plus size={13} /></button>
          </div>

          {[
            { key: "checking", label: "Cuentas", icon: Wallet },
            { key: "savings", label: "Ahorro", icon: PiggyBank },
            { key: "credit", label: "Tarjetas", icon: CreditCard },
            { key: "cash", label: "Efectivo", icon: Banknote },
          ].map((section) => {
            const SectionIcon = section.icon;
            const group = accounts.filter((a) => (a.type || "checking") === section.key);
            return (
              <div key={section.key} style={{ marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 2px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textFaint, fontWeight: 600 }}>
                    <SectionIcon size={10} /> {section.label}
                  </span>
                  <button onClick={() => openAccountForm(section.key, null, true)} style={{ background: "none", border: "none", color: T.textFaint, padding: 1 }} aria-label={"Anadir " + section.label}><Plus size={11} /></button>
                </div>
                {group.length === 0 && (
                  <div style={{ fontSize: 11, color: T.textFaint, padding: "2px 10px 4px" }}>Sin cuentas.</div>
                )}
                {group.map((a) => {
                  const bal = balances[a.id] || 0;
                  const low = (a.warning && bal < a.warning) || bal < 0;
                  const selected = activeAccounts.size === 0 || activeAccounts.has(a.id);
                  const highlighted = activeAccounts.size > 0 && activeAccounts.has(a.id);
                  return (
                    <div key={a.id} className="accrow navitem" style={{ borderRadius: 7, background: highlighted ? "#FFFFFF" : "transparent", boxShadow: highlighted ? "0 1px 2px rgba(0,0,0,0.06)" : "none", marginBottom: 2, padding: "7px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <button onClick={(e) => { toggleAccountSelect(a.id, e.shiftKey); setView("transactions"); }} style={{ background: "none", border: "none", color: T.text, textAlign: "left", flex: 1, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        <SectionIcon size={12} style={{ color: T.textFaint, flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{a.name}</span>
                      </button>
                      <span className="amount" style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, color: low ? "#8A1F1F" : "#1F6B32", background: low ? "#FBE7E7" : "#E7F5EA" }}>{fmt(bal)}</span>
                      <button onClick={() => openAccountForm(a.type, a)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Editar " + a.name}><Pencil size={11} /></button>
                      <button onClick={() => removeAccount(a.id)} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label={"Eliminar " + a.name}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {showAccForm && (
            <form onSubmit={addAccount} style={{ marginTop: 8, padding: 10, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <input autoFocus placeholder={accDraft.type === "credit" ? "Nombre de la tarjeta" : accDraft.type === "cash" ? "Nombre del monedero" : "Nombre de la cuenta"} value={accDraft.name} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { name: e.target.value }))} style={inputStyle} />
              {!accDraft.lockType && (
                <select value={accDraft.type} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { type: e.target.value, linkedAccountId: e.target.value === "credit" ? d.linkedAccountId : null }))} style={inputStyle}>
                  {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              )}
              {accDraft.type === "savings" && (
                <select value={accDraft.savingsKind} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { savingsKind: e.target.value }))} style={inputStyle}>
                  <option value="savings">Ahorro</option>
                  <option value="investment">Inversion</option>
                </select>
              )}
              {accDraft.type === "credit" && (
                <>
                  <select value={accDraft.cardKind} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { cardKind: e.target.value }))} style={inputStyle}>
                    <option value="debit">Debito</option>
                    <option value="credit">Credito</option>
                  </select>
                  {accDraft.cardKind === "credit" && (
                    <select value={accDraft.paymentMode} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { paymentMode: e.target.value }))} style={inputStyle}>
                      <option value="month_end">A fin de mes</option>
                      <option value="installments">Fraccionada</option>
                      <option value="fixed">Otro: cantidad fija mensual</option>
                    </select>
                  )}
                  {accDraft.cardKind === "credit" && accDraft.paymentMode === "fixed" && (
                    <input type="number" min="0" step="0.01" placeholder="Cantidad fija mensual" value={accDraft.monthlyPayment} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { monthlyPayment: e.target.value }))} style={inputStyle} />
                  )}
                  <select required value={accDraft.linkedAccountId || ""} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { linkedAccountId: e.target.value ? Number(e.target.value) : null }))} style={inputStyle}>
                    <option value="">Selecciona una cuenta asociada</option>
                    {accounts.filter((a) => a.id !== accDraft.id && a.type !== "credit").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </>
              )}
              <input placeholder="Saldo inicial" type="number" step="0.01" value={accDraft.opening} onChange={(e) => setAccDraft((d) => Object.assign({}, d, { opening: e.target.value }))} style={inputStyle} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={{ flex: 1, background: T.accent, border: "none", borderRadius: 6, padding: "7px 0", color: "#fff", fontWeight: 600, fontSize: 12.5 }}>{accDraft.id ? "Guardar" : "Crear"}</button>
                <button type="button" onClick={() => setShowAccForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 9px", color: T.textMuted }}><X size={12} /></button>
              </div>
            </form>
          )}

          <div style={{ marginTop: 22, padding: "0 10px" }}>
            <button
              onClick={() => setView("recurring")}
              className="navitem"
              style={{ width: "100%", textAlign: "left", background: view === "recurring" ? "#FFFFFF" : "transparent", boxShadow: view === "recurring" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Repeat size={12} style={{ color: view === "recurring" ? T.accent : T.textMuted }} /> Programador
              </span>
              {programadorRows.length > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{programadorRows.length}</span>}
            </button>
          </div>

          <div style={{ marginTop: 10, padding: "0 10px" }}>
            <button
              onClick={() => setView("categories")}
              className="navitem"
              style={{ width: "100%", textAlign: "left", background: view === "categories" ? "#FFFFFF" : "transparent", boxShadow: view === "categories" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><List size={12} style={{ color: view === "categories" ? T.accent : T.textMuted }} /> Categorias</span>
              {categories.length > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{categories.length}</span>}
            </button>
          </div>

          <div style={{ marginTop: 10, padding: "0 10px" }}>
            <button
              onClick={() => setView("filters")}
              className="navitem"
              style={{ width: "100%", textAlign: "left", background: view === "filters" ? "#FFFFFF" : "transparent", boxShadow: view === "filters" ? "0 1px 2px rgba(0,0,0,0.06)" : "none", border: "none", borderRadius: 7, padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><SlidersHorizontal size={12} style={{ color: view === "filters" ? T.accent : T.textMuted }} /> Filtros</span>
              {savedFilters.length > 0 && <span className="amount" style={{ fontSize: 10.5, color: T.textFaint }}>{savedFilters.length}</span>}
            </button>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 18 }}>
            <div style={{ borderTop: "1px solid " + T.border, margin: "0 10px", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600 }}>Sumatorio</span>
              <span className="amount" style={{ fontSize: 16, fontWeight: 700, color: totalBalance < 0 ? T.expense : T.text }}>{fmt(totalBalance)}</span>
            </div>
          </div>
          </>
          )}
        </aside>

        {!sidebarCollapsed && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = sidebarWidth;
              const onMove = (moveEvent) => {
                const next = Math.min(420, Math.max(170, startWidth + (moveEvent.clientX - startX)));
                setSidebarWidth(next);
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
            style={{ position: "absolute", left: sidebarWidth - 3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 5 }}
          />
        )}

        <main style={{ background: T.bg, display: "flex", flexDirection: "row", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {view === "recurring" && (() => {
            const sorters = {
              fecha: (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0),
              cuenta: (a, b) => accountName(a.tx.accountId).localeCompare(accountName(b.tx.accountId)) || (a.date < b.date ? -1 : 1),
              periodicidad: (a, b) => freqPerMonth(a.tx.recurring) - freqPerMonth(b.tx.recurring),
              descripcion: (a, b) => a.tx.name.localeCompare(b.tx.name),
              importe: (a, b) => Number(a.tx.amount) - Number(b.tx.amount),
              tipo: (a, b) => a.tx.type.localeCompare(b.tx.type) || (a.date < b.date ? -1 : 1),
            };
            const sorted = programadorRows.slice().sort(sorters[programadorSort] || sorters.fecha);

            const groups = [];
            if (programadorSort === "cuenta") {
              sorted.forEach((row) => {
                const label = accountName(row.tx.accountId);
                let g = groups.find((x) => x.label === label);
                if (!g) { g = { label: label, rows: [] }; groups.push(g); }
                g.rows.push(row);
              });
            } else if (programadorSort === "tipo") {
              sorted.forEach((row) => {
                const label = row.tx.type === "income" ? "Ingresos" : "Gastos";
                let g = groups.find((x) => x.label === label);
                if (!g) { g = { label: label, rows: [] }; groups.push(g); }
                g.rows.push(row);
              });
            } else if (programadorSort === "fecha") {
              sorted.forEach((row) => {
                const label = monthYearLabel(row.date);
                let g = groups.find((x) => x.label === label);
                if (!g) { g = { label: label, rows: [] }; groups.push(g); }
                g.rows.push(row);
              });
            } else {
              groups.push({ label: null, rows: sorted });
            }

            const SortBtn = ({ value, label }) => {
              const active = programadorSort === value;
              return (
                <button
                  onClick={() => setProgramadorSort(value)}
                  style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: active ? T.text : T.textMuted, fontWeight: active ? 700 : 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5, whiteSpace: "nowrap" }}
                >
                  {label}
                </button>
              );
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 4px" }}>
                  <div>
                    <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Repeat size={17} style={{ color: T.accent }} /> Programador</h2>
                    <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Proxima instancia de cada movimiento recurrente en {activeDoc.name}.</p>
                  </div>
                  <button onClick={openScheduledForm} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    <Plus size={14} /> Nueva operacion
                  </button>
                </div>

                {programadorRows.length > 0 && (
                  <div style={{ padding: "10px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 13, color: T.textMuted }}>
                      Neto recurrente: <span className="amount" style={{ color: forecast.netPerMonth < 0 ? T.expense : T.income, fontWeight: 700 }}>{fmt(forecast.netPerMonth)}</span> / mes
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.04em" }}>Agrupar por</span>
                      {[["fecha", "Fecha"], ["cuenta", "Cuenta"], ["tipo", "Tipo"]].map((p) => (
                        <button key={p[0]} onClick={() => setProgramadorSort(p[0])} style={smallBtn(programadorSort === p[0])}>{p[1]}</button>
                      ))}
                    </div>
                  </div>
                )}

                {programadorRows.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.textFaint, padding: "18px 24px" }}>Sin movimientos recurrentes todavia.</div>
                ) : (
                  <div style={{ flex: 1, minHeight: 0, overflow: "auto", marginTop: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "78px 130px 110px 1fr 110px 56px", padding: "7px 24px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0, zIndex: 1 }}>
                      <SortBtn value="fecha" label="Fecha" />
                      <SortBtn value="cuenta" label="Cuenta" />
                      <SortBtn value="periodicidad" label="Periodicidad" />
                      <SortBtn value="descripcion" label="Descripcion" />
                      <span style={{ textAlign: "right" }}><SortBtn value="importe" label="Importe" /></span>
                      <span />
                    </div>

                    {groups.map((g, gi) => {
                      const gKey = g.label || ("g" + gi);
                      const gCollapsed = collapsedProgramadorGroups.has(gKey);
                      return (
                      <div key={gi}>
                        {g.label && (
                          <button
                            onClick={() => setCollapsedProgramadorGroups((prev) => {
                              const next = new Set(prev);
                              if (next.has(gKey)) next.delete(gKey); else next.add(gKey);
                              return next;
                            })}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "8px 24px 4px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                          >
                            {gCollapsed ? <ChevronRight size={12} style={{ color: T.textMuted }} /> : <ChevronDown size={12} style={{ color: T.textMuted }} />}
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>{g.label}</span>
                            <span style={{ fontSize: 10.5, color: T.textFaint }}>({g.rows.length})</span>
                          </button>
                        )}
                        {!gCollapsed && g.rows.map((row) => {
                          const t = row.tx;
                          const info = catInfo(t.categoryId, t.subcategoryId, t.subsubcategoryId);
                          const realColor = t.type === "income" ? T.income : T.expense;
                          return (
                            <div
                              key={t.id + "-" + row.date} className="accrow" onClick={() => openProgramadorRow(row)}
                              style={{ display: "grid", gridTemplateColumns: "78px 130px 110px 1fr 110px 56px", alignItems: "center", padding: "8px 24px", fontSize: 13, borderBottom: "1px solid " + T.borderSoft, cursor: "pointer", opacity: row.real ? 1 : 0.7 }}
                            >
                              <span className="amount" style={{ color: T.textMuted, fontSize: 12 }}>{shortDate(row.date)}</span>
                              <span style={{ color: T.textMuted, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{accountName(t.accountId)}</span>
                              <span style={{ color: T.textMuted, fontSize: 12 }}>{freqLabel(t.recurring)}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 7, color: T.text }}>
                                <span style={dot(info.color, 8)} />
                                {t.name}
                              </span>
                              <span className="amount" style={{ textAlign: "right", color: realColor, fontWeight: 500 }}>
                                {t.type === "income" ? "+" : "-"}{fmt(Math.abs(t.amount))}
                              </span>
                              <span style={{ display: "flex", gap: 4, justifySelf: "end" }}>
                                <button onClick={(e) => { e.stopPropagation(); openProgramadorRow(row); }} style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Editar"><Pencil size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); removeProgramadorSeries(row); }} style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Eliminar"><Trash2 size={12} /></button>
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
          })()}

          {view === "categories" && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 4px" }}>
                <div>
                  <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}><List size={17} style={{ color: T.accent }} /> Categorias</h2>
                  <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Categorias de {activeDoc.name}.</p>
                </div>
                <button
                  onClick={() => {
                    setCatDraft({ name: "", color: PALETTE[0], kind: catTab });
                    setShowCatForm(true);
                    setShowTxForm(false); setShowBulkEdit(false); setShowCatEdit(false); setCatEditId(null);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                >
                  <Plus size={14} /> Nueva
                </button>
              </div>

              <div style={{ display: "flex", gap: 0, padding: "12px 24px 0", borderBottom: "1px solid " + T.borderSoft, flexShrink: 0 }}>
                {[["expense", "Gastos"], ["income", "Ingresos"], ["transfer", "Traspasos"], ["all", "Todas"]].map((pair) => (
                  <button
                    key={pair[0]} onClick={() => setCatTab(pair[0])}
                    style={{ background: "none", border: "none", borderBottom: "2px solid " + (catTab === pair[0] ? T.accent : "transparent"), padding: "8px 4px", marginRight: 18, fontSize: 13, fontWeight: 700, color: catTab === pair[0] ? T.text : T.textMuted, cursor: "pointer" }}
                  >
                    {pair[1]}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                {categories.filter((c) => catTab === "all" || (c.kind || "expense") === catTab).length === 0 && (
                  <div style={{ fontSize: 13, color: T.textFaint, padding: "18px 24px" }}>Sin categorias todavia.</div>
                )}

                {categories.filter((c) => catTab === "all" || (c.kind || "expense") === catTab).map((cat) => {
                  const monthEntry = byCategory.find((b) => b.id === cat.id);
                  const val = monthEntry ? monthEntry.val : 0;
                  const limit = budgets[cat.id];
                  const pct = limit ? Math.min(100, (val / limit) * 100) : Math.min(100, (val / maxCat) * 100);
                  const ratio = limit ? (val / limit) * 100 : 0;
                  const budgetColor = !limit ? cat.color : ratio <= 70 ? T.income : ratio <= 90 ? "#D9822B" : T.expense;
                  const spentColor = !limit ? T.textMuted : ratio <= 70 ? T.income : ratio <= 90 ? "#D9822B" : T.expense;
                  const hasSubs = cat.subcategories.length > 0;
                  const expanded = expandedCategories.has(cat.id);
                  return (
                    <div key={cat.id}>
                      <div
                        className="accrow"
                        onClick={() => { setCatEditId(cat.id); setShowCatEdit(true); setShowTxForm(false); setShowBulkEdit(false); setShowCatForm(false); }}
                        style={{ display: "grid", gridTemplateColumns: "13px 12px 150px 1fr 130px 22px 22px 24px", alignItems: "center", columnGap: 10, padding: "9px 24px", cursor: "pointer", borderBottom: "1px solid " + T.borderSoft }}
                      >
                        {hasSubs ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedCategories((prev) => { const next = new Set(prev); if (next.has(cat.id)) next.delete(cat.id); else next.add(cat.id); return next; }); }}
                            style={{ background: "none", border: "none", color: T.textMuted, padding: 0, flexShrink: 0 }}
                          >
                            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        ) : (
                          <span />
                        )}
                        <span style={dot(cat.color, 12)} />
                        <span style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
                        <div style={{ height: 6, background: T.borderSoft, borderRadius: 3 }}>
                          <div style={{ height: 6, borderRadius: 3, width: pct + "%", background: budgetColor }} />
                        </div>
                        <span className="amount" style={{ fontSize: 13, textAlign: "right" }}>
                          <span style={{ color: spentColor }}>{fmt(val)}</span>
                          {limit ? <span style={{ color: T.textMuted }}>{" / " + fmt(limit)}</span> : null}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); setCatEditId(cat.id); setShowCatEdit(true); setShowTxForm(false); setShowBulkEdit(false); setShowCatForm(false); }} style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Editar " + cat.name}><Pencil size={11} /></button>
                        <button onClick={(e) => { e.stopPropagation(); removeCategory(cat.id); }} style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Eliminar " + cat.name}><Trash2 size={12} /></button>
                        <span style={{ display: "flex", justifyContent: "center" }}><KindBadge kind={cat.kind || "expense"} size={16} /></span>
                      </div>
                      {hasSubs && expanded && cat.subcategories.map((sub) => {
                        const subVal = bySubcategory[sub.id] || 0;
                        const subLimit = budgets[sub.id];
                        const subPct = subLimit ? Math.min(100, (subVal / subLimit) * 100) : Math.min(100, (subVal / maxCat) * 100);
                        const subRatio = subLimit ? (subVal / subLimit) * 100 : 0;
                        const subBudgetColor = !subLimit ? tintColor(cat.color, 0.2) : subRatio <= 70 ? T.income : subRatio <= 90 ? "#D9822B" : T.expense;
                        const subSpentColor = !subLimit ? T.textMuted : subRatio <= 70 ? T.income : subRatio <= 90 ? "#D9822B" : T.expense;
                        return (
                          <div
                            key={sub.id}
                            onClick={() => { setCatEditId(cat.id); setShowCatEdit(true); setShowTxForm(false); setShowBulkEdit(false); setShowCatForm(false); }}
                            className="accrow"
                            style={{ display: "grid", gridTemplateColumns: "13px 12px 150px 1fr 130px 22px 22px 24px", alignItems: "center", columnGap: 10, padding: "7px 24px", cursor: "pointer", borderBottom: "1px solid " + T.borderSoft, background: T.bgElevated }}
                          >
                            <span />
                            <span style={dot(tintColor(cat.color, 0.2), 7)} />
                            <span style={{ fontSize: 12, color: T.text, paddingLeft: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.name}</span>
                            <div style={{ height: 4, background: T.borderSoft, borderRadius: 2 }}>
                              <div style={{ height: 4, borderRadius: 2, width: subPct + "%", background: subBudgetColor }} />
                            </div>
                            <span className="amount" style={{ fontSize: 11, textAlign: "right" }}>
                              <span style={{ color: subSpentColor }}>{fmt(subVal)}</span>
                              {subLimit ? <span style={{ color: T.textMuted }}>{" / " + fmt(subLimit)}</span> : null}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); setCatEditId(cat.id); setShowCatEdit(true); setShowTxForm(false); setShowBulkEdit(false); setShowCatForm(false); }} style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Editar " + sub.name}><Pencil size={10} /></button>
                            <button onClick={(e) => { e.stopPropagation(); removeSubcategory(cat.id, sub.id); }} style={{ background: "none", border: "none", color: T.textFaint, padding: 2, justifySelf: "start" }} aria-label={"Eliminar " + sub.name}><Trash2 size={11} /></button>
                            <span style={{ display: "flex", justifyContent: "center" }}><KindBadge kind={cat.kind || "expense"} size={14} /></span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === "filters" && (
            <div style={{ padding: "20px 24px", overflow: "auto", flex: 1, minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}><SlidersHorizontal size={17} style={{ color: T.accent }} /> Filtros</h2>
                  <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 18px" }}>Filtros guardados en {activeDoc.name}. Haz clic en uno para aplicarlo.</p>
                </div>
                <button onClick={() => { setView("transactions"); setShowFilters(true); }} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  <Plus size={14} /> Nuevo filtro
                </button>
              </div>

              {savedFilters.length === 0 && (
                <div style={{ fontSize: 13, color: T.textFaint }}>
                  Sin filtros guardados todavia. Abre "Filtros" en la tabla de movimientos, ajusta lo que quieras y pulsa "Guardar".
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
                {savedFilters.map((sf) => {
                  const f = sf.filters;
                  const parts = [];
                  if (f.search) parts.push("\"" + f.search + "\"");
                  if (f.categories.length > 0) parts.push(f.categories.length + " categoria" + (f.categories.length === 1 ? "" : "s"));
                  if (f.subcategories.length > 0) parts.push(f.subcategories.length + " subcategoria" + (f.subcategories.length === 1 ? "" : "s"));
                  if (f.type !== "all") parts.push(f.type === "income" ? "Ingresos" : f.type === "expense" ? "Gastos" : "Transferencias");
                  if (f.from) parts.push("desde " + shortDate(f.from));
                  if (f.to) parts.push("hasta " + shortDate(f.to));
                  return (
                    <div key={sf.id} style={{ border: "1px solid " + T.border, borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button onClick={() => applySavedFilter(sf)} style={{ background: "none", border: "none", textAlign: "left", flex: 1, padding: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{sf.name}</div>
                        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{parts.length > 0 ? parts.join(" - ") : "Sin condiciones"}</div>
                      </button>
                      <button onClick={() => removeSavedFilter(sf.id)} style={{ background: "none", border: "none", color: T.textFaint, padding: 4 }} aria-label={"Eliminar filtro " + sf.name}><Trash2 size={13} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === "transactions" && (() => {
            const singleAccount = activeAccounts.size === 1 ? accounts.find((a) => a.id === [...activeAccounts][0]) : null;
            const HeaderIcon = singleAccount ? accountTypeInfo(singleAccount.type).icon : CircleDollarSign;
            return (
          <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid " + T.border, gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <HeaderIcon size={17} style={{ color: T.accent }} />
                {activeAccounts.size === 0
                  ? "Todas las cuentas"
                  : activeAccounts.size === 1
                  ? accountName([...activeAccounts][0])
                  : activeAccounts.size + " cuentas seleccionadas"}
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: T.income, display: "flex", alignItems: "center", gap: 4 }}><TrendingUp size={12} /> <span className="amount">{fmt(monthIncome)}</span></span>
                <span style={{ fontSize: 12, color: T.expense, display: "flex", alignItems: "center", gap: 4 }}><TrendingDown size={12} /> <span className="amount">{fmt(monthExpense)}</span></span>
                <span style={{ fontSize: 12, color: T.textFaint }}>{shortDate(startOfCurrentMonthISO())} - {shortDate(todayISO())}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: T.textFaint }} />
                  <input
                    placeholder="Buscar movimientos"
                    value={filters.search}
                    onChange={(e) => setFilters((f) => Object.assign({}, f, { search: e.target.value }))}
                    style={Object.assign({}, inputStyle, { paddingLeft: 28, width: 170 })}
                  />
                </div>
                <button onClick={clearSelectionAndFilters} style={smallBtn(false)} aria-label="Limpiar seleccion y filtros" title="Limpiar seleccion y filtros"><Eraser size={13} /></button>
                <button onClick={undoLastAction} disabled={historyPastRef.current.length === 0} style={Object.assign({}, smallBtn(false), { opacity: historyPastRef.current.length === 0 ? 0.4 : 1 })} aria-label="Deshacer" title="Deshacer"><Undo2 size={13} /></button>
                <button onClick={redoLastAction} disabled={historyFutureRef.current.length === 0} style={Object.assign({}, smallBtn(false), { opacity: historyFutureRef.current.length === 0 ? 0.4 : 1 })} aria-label="Rehacer" title="Rehacer"><Redo2 size={13} /></button>
                <button
                  onClick={() => { setSavedDocFeedback(activeDocId); setTimeout(() => setSavedDocFeedback((cur) => (cur === activeDocId ? null : cur)), 1200); }}
                  style={smallBtn(false)} aria-label="Guardar" title="Guardar"
                >
                  {savedDocFeedback === activeDocId ? <CheckCircle2 size={13} style={{ color: T.income }} /> : <Save size={13} />}
                </button>
                <button onClick={() => { setShowMovementsRange((s) => !s); setShowFilters(false); }} style={smallBtn(showMovementsRange)}><CalendarDays size={13} />Movimientos</button>
                <button onClick={() => { setShowFilters((s) => !s); setShowMovementsRange(false); }} style={smallBtn(showFilters)}><SlidersHorizontal size={13} />Filtros</button>
                <button onClick={exportCSV} style={smallBtn(false)}><Download size={13} />Exportar</button>
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={smallBtn(false)}><Upload size={13} />Importar</button>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={importCSV} style={{ display: "none" }} />
              </div>
              <button onClick={() => { resetDraft(); setShowTxForm(true); }} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600, marginLeft: 6 }}>
                <Plus size={14} /> Movimiento
              </button>
            </div>
          </div>

          {showMovementsRange && (
            <div style={{ padding: 14, borderBottom: "1px solid " + T.border, background: T.bgElevated, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <button title="Restaurar rango" onClick={() => setMovementRangeDraft({ from: todayISO(), to: endOfYearISO() })} style={smallBtn(false)}><Eraser size={13} /></button>
              {["1M", "3M", "6M", "1A", "Fin de año"].map((key) => <button key={key} onClick={() => setMovementRangeDraft(quickRange(key))} style={smallBtn(false)}>{key}</button>)}
              <Field label="DESDE"><DatePicker value={movementRangeDraft.from} onChange={(v) => setMovementRangeDraft((r) => Object.assign({}, r, { from: v }))} style={{ width: 150 }} /></Field>
              <Field label="HASTA"><DatePicker value={movementRangeDraft.to} onChange={(v) => setMovementRangeDraft((r) => Object.assign({}, r, { to: v }))} style={{ width: 150 }} /></Field>
              <button onClick={() => setFilters((f) => Object.assign({}, f, movementRangeDraft))} style={{ background: T.accent, border: "none", borderRadius: 6, padding: "0 24px", height: 30, color: "#fff", fontWeight: 600, fontSize: 12 }}>Mostrar</button>
            </div>
          )}

          {showFilters && (
            <div style={{ padding: 14, borderBottom: "1px solid " + T.border, background: T.bgElevated }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
                <Field label="Descripcion">
                  <div style={{ position: "relative" }}>
                    <Search size={13} style={{ position: "absolute", left: 9, top: 10, color: T.textFaint }} />
                    <input placeholder="Buscar" value={filters.search} onChange={(e) => setFilters((f) => Object.assign({}, f, { search: e.target.value }))} style={Object.assign({}, inputStyle, { paddingLeft: 28, width: 150 })} />
                  </div>
                </Field>

                <Field label="Tipo">
                  <select
                    value={filters.type}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFilters((f) => {
                        if (val !== "income" && val !== "expense") return Object.assign({}, f, { type: val });
                        const keepCats = f.categories.filter((cid) => {
                          const c = categories.find((x) => x.id === cid);
                          return c && ((val === "income") === (c.kind === "income"));
                        });
                        const validSubIds = new Set(categories.filter((c) => keepCats.includes(c.id)).flatMap((c) => c.subcategories.map((s) => s.id)));
                        const keepSubs = keepCats.length === 0 ? f.subcategories : f.subcategories.filter((sid) => validSubIds.has(sid));
                        return Object.assign({}, f, { type: val, categories: keepCats, subcategories: keepSubs });
                      });
                    }}
                    style={Object.assign({}, inputStyle, { width: 150 })}
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </Field>

                <Field label="Categoria">
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setFilterPopoverOpen((p) => (p === "categoria" ? null : "categoria"))}
                      style={Object.assign({}, inputStyle, { width: 150, textAlign: "left", cursor: "pointer", color: filters.categories.length === 0 ? T.textFaint : T.text })}
                    >
                      {filters.categories.length === 0 ? "Todas" : filters.categories.length + " seleccionada" + (filters.categories.length === 1 ? "" : "s")}
                    </button>
                    {filterPopoverOpen === "categoria" && (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, padding: 8, zIndex: 30, minWidth: 190, maxHeight: 240, overflowY: "auto", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}>
                        {filterCategoryChoices.length === 0 && <div style={{ fontSize: 12, color: T.textFaint, padding: 6 }}>Sin categorias.</div>}
                        {filterCategoryChoices.map((c) => (
                          <button key={c.id} type="button" onClick={() => toggleFilterCategory(c.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 4px", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}>
                            <span style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + (filters.categories.includes(c.id) ? T.accent : T.border), background: filters.categories.includes(c.id) ? T.accent : "#FFFFFF" }} />
                            <span style={dot(c.color, 8)} />
                            <span style={{ fontSize: 12.5 }}>{c.name}</span>
                          </button>
                        ))}
                        <button type="button" onClick={() => setFilterPopoverOpen(null)} style={{ marginTop: 6, width: "100%", background: T.accent, border: "none", borderRadius: 6, padding: "6px 0", color: "#fff", fontSize: 12, fontWeight: 600 }}>Hecho</button>
                      </div>
                    )}
                  </div>
                </Field>

                <Field label="Subcategorias">
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setFilterPopoverOpen((p) => (p === "subcategoria" ? null : "subcategoria"))}
                      style={Object.assign({}, inputStyle, { width: 150, textAlign: "left", cursor: "pointer", color: filters.subcategories.length === 0 ? T.textFaint : T.text })}
                    >
                      {filters.subcategories.length === 0 ? "Todas" : filters.subcategories.length + " seleccionada" + (filters.subcategories.length === 1 ? "" : "s")}
                    </button>
                    {filterPopoverOpen === "subcategoria" && (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#FFFFFF", border: "1px solid " + T.border, borderRadius: 8, padding: 8, zIndex: 30, minWidth: 210, maxHeight: 240, overflowY: "auto", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}>
                        {filterSubcategoryOptions.length === 0 && <div style={{ fontSize: 12, color: T.textFaint, padding: 6 }}>Sin subcategorias.</div>}
                        {filterSubcategoryOptions.map((s) => (
                          <button key={s.id} type="button" onClick={() => toggleFilterSubcategory(s.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 4px", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}>
                            <span style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, border: "2px solid " + (filters.subcategories.includes(s.id) ? T.accent : T.border), background: filters.subcategories.includes(s.id) ? T.accent : "#FFFFFF" }} />
                            <span style={{ fontSize: 12.5 }}>{s.label}</span>
                          </button>
                        ))}
                        <button type="button" onClick={() => setFilterPopoverOpen(null)} style={{ marginTop: 6, width: "100%", background: T.accent, border: "none", borderRadius: 6, padding: "6px 0", color: "#fff", fontSize: 12, fontWeight: 600 }}>Hecho</button>
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Coincidencia">
                  <select
                    value={filters.matchMode || "all"}
                    onChange={(e) => setFilters((f) => Object.assign({}, f, { matchMode: e.target.value }))}
                    style={Object.assign({}, inputStyle, { width: 150 })}
                  >
                    <option value="all">Todas</option>
                    <option value="any">Cualquiera</option>
                    <option value="none">Ninguna</option>
                  </select>
                </Field>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <button title="Limpiar filtros" onClick={() => setFilters({ search: "", categories: [], subcategories: [], type: "all", from: "", to: "", matchMode: "all" })} style={smallBtn(false)}><Eraser size={13} /></button>
                <button onClick={() => setShowSaveFilterForm((s) => !s)} style={smallBtn(showSaveFilterForm)}><Save size={13} />Guardar</button>
                <Field label="DESDE">
                  <DatePicker value={filters.from} onChange={(v) => setFilters((f) => Object.assign({}, f, { from: v }))} style={{ width: 150 }} />
                </Field>
                <Field label="HASTA">
                  <DatePicker value={filters.to} onChange={(v) => setFilters((f) => Object.assign({}, f, { to: v }))} style={{ width: 150 }} />
                </Field>
                <button style={{ background: T.accent, border: "none", borderRadius: 6, padding: "0 24px", height: 30, color: "#fff", fontWeight: 600, fontSize: 12 }}>Mostrar</button>
              </div>

              {showSaveFilterForm && (
                <form onSubmit={saveCurrentFilter} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                  <input autoFocus placeholder="Nombre del filtro" value={saveFilterName} onChange={(e) => setSaveFilterName(e.target.value)} style={Object.assign({}, inputStyle, { width: 200 })} />
                  <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "7px 12px", color: "#fff", fontSize: 12.5, fontWeight: 600 }}>Guardar filtro</button>
                  <button type="button" onClick={() => setShowSaveFilterForm(false)} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 10px", color: T.textMuted, fontSize: 12.5 }}>Cancelar</button>
                </form>
              )}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", background: "#EAF1FC", borderBottom: "1px solid " + T.border }}>
              <span style={{ fontSize: 12.5, color: T.accent, fontWeight: 600 }}>{selectedIds.size} seleccionado{selectedIds.size === 1 ? "" : "s"}</span>
              <button onClick={duplicateSelected} style={smallBtn(false)}>Duplicar</button>
              <button onClick={() => { if (selectedIds.size === 1) { const tx = transactions.find((t) => selectedIds.has(t.id)); if (tx) editTx(tx); } else openBulkEdit(); }} style={smallBtn(false)}>Editar</button>
              <button onClick={deleteSelected} style={Object.assign({}, smallBtn(false), { color: T.expense, borderColor: T.expense })}>Eliminar</button>
            </div>
          )}

          <div
            style={{ flex: 1, overflow: "auto" }}
            onClick={(e) => { if (e.target === e.currentTarget) { resetDraft(); setSelectedIds(new Set()); } }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "74px 76px 1fr 140px 100px 100px 56px", padding: "7px 20px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: T.textMuted, fontWeight: 600, borderBottom: "1px solid " + T.border, background: T.bgElevated, position: "sticky", top: 0 }}>
              {(() => {
                const TxSortBtn = ({ field, label, align }) => {
                  const active = txSort.field === field;
                  return (
                    <button
                      onClick={() => setTxSort((s) => ({ field: field, dir: s.field === field && s.dir === "asc" ? "desc" : "asc" }))}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: align || "left", width: "100%", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5, color: active ? T.text : T.textMuted, fontWeight: active ? 700 : 600 }}
                    >
                      {label}
                    </button>
                  );
                };
                return (
                  <>
                    <TxSortBtn field="fecha" label="Fecha" />
                    <TxSortBtn field="estado" label="Estado" align="center" />
                    <TxSortBtn field="descripcion" label="Descripcion" />
                    <TxSortBtn field="comentario" label="Comentario" />
                    <TxSortBtn field="importe" label="Importe" align="right" />
                    <span style={{ textAlign: "right" }}>Saldo</span>
                    <span />
                  </>
                );
              })()}
            </div>

            {filteredTx.length === 0 && (
              <div style={{ padding: "28px 20px", color: T.textMuted, fontSize: 13 }}>Sin movimientos que coincidan. Prueba a limpiar los filtros.</div>
            )}

            {(() => {
              const groups = [];
              filteredTx.forEach((t) => {
                const key = txGroupKey(t);
                let g = groups.length > 0 ? groups[groups.length - 1] : null;
                if (!g || g.key !== key) { g = { key: key, label: txGroupLabel(t), rows: [] }; groups.push(g); }
                g.rows.push(t);
              });
              return groups.map((g) => {
                const isCollapsed = collapsedMonths.has(g.key);
                return (
                  <div key={g.key}>
                    <button
                      onClick={() => toggleMonthCollapse(g.key)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: T.bgElevated, border: "none", borderBottom: "1px solid " + T.borderSoft, cursor: "pointer", textAlign: "left" }}
                    >
                      {isCollapsed ? <ChevronRight size={13} style={{ color: T.textMuted }} /> : <ChevronDown size={13} style={{ color: T.textMuted }} />}
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{g.label}</span>
                      <span style={{ fontSize: 11, color: T.textFaint }}>({g.rows.length})</span>
                    </button>
                    {!isCollapsed && g.rows.map((t) => {
              const isTransferOut = t.type === "transfer";
              const isTransferIn = t.type === "transfer_in";
              const isTransfer = isTransferOut || isTransferIn;
              const color = t.type === "income" ? T.income : isTransfer ? T.transfer : T.expense;
              const info = isTransfer ? { name: "Transferencia", color: T.transfer } : catInfo(t.categoryId, t.subcategoryId, t.subsubcategoryId);
              const st = statusInfo(t.status);
              const StIcon = st.icon;
              const voided = t.status === "anulado";
              const selected = selectedIds.has(t.id);
              return (
                <div
                  key={t.id} className="accrow"
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(t.id)); draggedGroupKeyRef.current = txGroupKey(t); }}
                  onDragOver={(e) => { if (txGroupKey(t) === (draggedGroupKeyRef.current || "")) e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); const draggedId = Number(e.dataTransfer.getData("text/plain")); reorderWithinGroup(draggedId, t.id); }}
                  onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                  onClick={(e) => handleRowClick(e, t.id)}
                  style={{ display: "grid", gridTemplateColumns: "74px 76px 1fr 140px 100px 100px 56px", alignItems: "center", padding: "8px 20px", fontSize: 13, borderBottom: "1px solid " + T.borderSoft, opacity: voided ? 0.55 : 1, background: selected ? "#EAF1FC" : "transparent", cursor: "pointer" }}
                >
                  <span className="amount" style={{ color: T.textMuted, fontSize: 12 }}>{shortDate(t.date)}</span>
                  <button onClick={(e) => { e.stopPropagation(); cycleStatus(t); }} title={st.label} style={{ display: "flex", alignItems: "center", justifyContent: "center", color: st.color, background: "none", border: "none", padding: 2, width: "100%" }}>
                    <StIcon size={15} />
                  </button>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: voided ? "line-through" : "none" }}>
                    <span style={dot(info.color, 8)} />
                    {isTransfer && <ArrowRightLeft size={12} style={{ color: T.transfer }} />}
                    {t.name}
                    {isTransferOut ? " -> " + t.toLabel : ""}
                    {isTransferIn ? " <- " + t.fromLabel : ""}
                    {t.recurring && <Repeat size={11} style={{ color: T.textFaint }} />}
                  </span>
                  <span style={{ color: T.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.comment || ""}>
                    {t.comment || ""}
                  </span>
                  <span className="amount" style={{ textAlign: "right", color: color, fontWeight: 500 }}>
                    {t.type === "income" || isTransferIn ? "+" : isTransferOut ? "" : "-"}{fmt(Math.abs(t.amount))}
                  </span>
                  <span className="amount" style={{ textAlign: "right", color: resultingBalance(t) < 0 ? T.expense : T.textMuted, fontSize: 12.5 }}>
                    {fmt(resultingBalance(t))}
                  </span>
                  <span style={{ display: "flex", gap: 4, justifySelf: "end" }}>
                    <button onClick={(e) => { e.stopPropagation(); editTx(t); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Editar"><Pencil size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeTx(t); }} className="rowbtn" style={{ background: "none", border: "none", color: T.textFaint, padding: 2 }} aria-label="Eliminar"><Trash2 size={12} /></button>
                  </span>
                </div>
              );
                    })}
                  </div>
                );
              });
            })()}
          </div>

          {(() => {
            const hasData = evoPoints.length > 0;
            const evoMinB = hasData ? Math.min(0, ...evoPoints.map((p) => p.balance)) : 0;
            const evoMaxB = hasData ? Math.max(1, ...evoPoints.map((p) => p.balance)) : 1;
            const evoRangeB = (evoMaxB - evoMinB) || 1;
            const evoMinT = hasData ? evoPoints[0].time : 0;
            const evoMaxT = hasData ? evoPoints[evoPoints.length - 1].time : 1;
            const evoRangeT = (evoMaxT - evoMinT) || 1;
            const evoX = (t) => ((t - evoMinT) / evoRangeT) * 1000;
            const evoY = (b) => 10 + (1 - (b - evoMinB) / evoRangeB) * 118;
            let evoLinePath = "";
            evoPoints.forEach((p, i) => {
              if (i === 0) evoLinePath = "M " + evoX(p.time) + " " + evoY(p.balance);
              else evoLinePath += " L " + evoX(p.time) + " " + evoY(evoPoints[i - 1].balance) + " L " + evoX(p.time) + " " + evoY(p.balance);
            });
            const evoAreaPath = hasData
              ? evoLinePath + " L " + evoX(evoPoints[evoPoints.length - 1].time) + " " + evoY(0) + " L " + evoX(evoPoints[0].time) + " " + evoY(0) + " Z"
              : "";
            const presetActive = (n) => {
              const key = n === 1 ? "1M" : n === 3 ? "3M" : n === 6 ? "6M" : "1A";
              const range = quickRange(key);
              return evoRange.from === range.from && evoRange.to === range.to;
            };
            return (
              <div style={{ borderTop: "1px solid " + T.border }}>
                <div style={{ background: "#E7E7EB", padding: "6px 20px", fontSize: 12.5, fontWeight: 700, color: T.text, borderBottom: "1px solid " + T.border, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span>Prevision de balance</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                    {[[1, "1M"], [3, "3M"], [6, "6M"], [12, "1A"]].map((p) => (
                      <button
                        key={p[0]}
                        onClick={() => { const key = p[0] === 1 ? "1M" : p[0] === 3 ? "3M" : p[0] === 6 ? "6M" : "1A"; const range = quickRange(key); setEvoRange(range); setEvoCustomDraft(range); }}
                        style={{ background: presetActive(p[0]) ? T.accent : "#FFFFFF", color: presetActive(p[0]) ? "#fff" : T.textMuted, border: "1px solid " + (presetActive(p[0]) ? T.accent : T.border), borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}
                      >{p[1]}</button>
                    ))}
                    <button onClick={() => { const range = quickRange("Fin de año"); setEvoRange(range); setEvoCustomDraft(range); }} style={{ background: "#FFFFFF", color: T.textMuted, border: "1px solid " + T.border, borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>Fin de año</button>
                    <DatePicker value={evoCustomDraft.from} onChange={(v) => setEvoCustomDraft((r) => Object.assign({}, r, { from: v }))} style={{ border: "1px solid " + T.border, borderRadius: 5, padding: "0 6px", fontSize: 11, background: "#FFFFFF", color: T.text, width: 112, height: 26 }} />
                    <span style={{ color: T.textFaint }}>-</span>
                    <DatePicker value={evoCustomDraft.to} onChange={(v) => setEvoCustomDraft((r) => Object.assign({}, r, { to: v }))} style={{ border: "1px solid " + T.border, borderRadius: 5, padding: "0 6px", fontSize: 11, background: "#FFFFFF", color: T.text, width: 112, height: 26 }} />
                    <button
                      onClick={() => setEvoRange({ from: evoCustomDraft.from, to: evoCustomDraft.to })}
                      style={{ background: T.accent, border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 600, color: "#fff" }}
                    >Mostrar</button>
                  </div>
                </div>
                {!hasData ? (
                  <div style={{ padding: "18px 20px", color: T.textMuted, fontSize: 12.5 }}>Sin datos suficientes todavia.</div>
                ) : (
                  <div style={{ padding: "12px 44px 8px 20px", background: T.bg, position: "relative" }}>
                    <svg
                      viewBox="0 0 1000 128" width="100%" height="150" preserveAspectRatio="none" style={{ cursor: "crosshair" }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const svgNode = e.currentTarget;
                        const updateMarker = (clientX) => {
                          const rect = svgNode.getBoundingClientRect();
                          const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
                          const clickTime = evoMinT + relX * evoRangeT;
                          let bal = evoPoints[0].balance;
                          for (let i = 0; i < evoPoints.length; i++) { if (evoPoints[i].time <= clickTime) bal = evoPoints[i].balance; else break; }
                          const dateLabel = new Date(clickTime).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
                          setEvoMarker({ xPct: relX * 100, date: dateLabel, balance: bal });
                        };
                        updateMarker(e.clientX);
                        const onMove = (moveEvent) => updateMarker(moveEvent.clientX);
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
                      {evoMarker && (
                        <line x1={evoMarker.xPct * 10} y1="0" x2={evoMarker.xPct * 10} y2="128" stroke={T.text} strokeWidth="1" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
                      )}
                    </svg>
                    {evoMarker && (
                      <div
                        style={{
                          position: "absolute", top: 4,
                          left: "calc(" + evoMarker.xPct + "% + 20px)",
                          transform: evoMarker.xPct > 70 ? "translateX(-100%)" : "translateX(-6px)",
                          background: T.text, color: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 10.5, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        }}
                      >
                        {evoMarker.date} · <span className="amount">{fmt(evoMarker.balance)}</span>
                      </div>
                    )}
                    <span style={{ position: "absolute", right: 4, top: 12 - 6 + (evoY(evoMaxB) / 128) * 126, fontSize: 10, color: T.textMuted }}>{fmt(evoMaxB)}</span>
                    <span style={{ position: "absolute", right: 4, top: 12 - 6 + (evoY(0) / 128) * 126, fontSize: 10, color: T.textMuted }}>{fmt(0)}</span>
                    {evoMinB < 0 && (
                      <span style={{ position: "absolute", right: 4, top: 12 - 6 + (evoY(evoMinB) / 128) * 126, fontSize: 10, color: T.textMuted }}>{fmt(evoMinB)}</span>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textFaint, marginTop: 2 }}>
                      {evoTicks.map((tk, i) => (<span key={i}>{tk.label}</span>))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ borderTop: "1px solid " + T.border, padding: "8px 20px", background: T.bgElevated, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total seleccionado</span>
            <span className="amount" style={{ fontSize: 14, fontWeight: 700 }}>{fmt(scopedTotal)}</span>
          </div>
          </>
            );
          })()}
        </div>

        {(showTxForm || showBulkEdit || showCatEdit || showCatForm) && (
          <div style={{ width: 320, flexShrink: 0, minHeight: 0, borderLeft: "1px solid " + T.border, background: T.bgElevated, overflowY: "auto" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid " + T.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{showCatForm ? "Nueva categoria" : (showCatEdit ? "Editar categoria" : (showBulkEdit ? "Editar " + selectedIds.size + " movimientos" : (txDraft.id ? "Editar movimiento" : "Nuevo movimiento")))}</span>
              <button onClick={() => (showCatForm ? setShowCatForm(false) : (showCatEdit ? (setShowCatEdit(false), setCatEditId(null)) : (showBulkEdit ? setShowBulkEdit(false) : resetDraft())))} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label="Cerrar"><X size={16} /></button>
            </div>
            {showCatForm ? catCreateForm : (showCatEdit ? catEditForm : (showBulkEdit ? bulkEditForm : txForm))}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
