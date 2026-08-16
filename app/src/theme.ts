import type { CSSProperties } from "react";
import {
  CheckCircle2, CircleDashed, Clock, XCircle,
  Wallet, PiggyBank, CreditCard, Banknote,
  type LucideIcon,
} from "lucide-react";
import type { AccountType, RecurUnit, TransactionStatus } from "./types";

export const T = {
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

export const PALETTE = [
  "#E2725B", "#E8A33D", "#7FB35C", "#5B8DBF", "#9080C4",
  "#9A9D93", "#D97FA6", "#4FAFA8", "#D9B23D", "#A97C50",
];

export interface StatusInfo {
  value: TransactionStatus;
  label: string;
  color: string;
  icon: LucideIcon;
}

export const STATUSES: StatusInfo[] = [
  { value: "reconciliado", label: "Reconciliado", color: "#2FA84F", icon: CheckCircle2 },
  { value: "pendiente", label: "Pendiente", color: "#D6A93B", icon: CircleDashed },
  { value: "programado", label: "Programado", color: "#3373DC", icon: Clock },
  { value: "anulado", label: "Anulado", color: "#E03131", icon: XCircle },
];

export const statusInfo = (value: TransactionStatus | undefined): StatusInfo =>
  STATUSES.find((s) => s.value === value) || STATUSES[1];

export interface AccountTypeInfo {
  value: AccountType;
  label: string;
  icon: LucideIcon;
}

export const ACCOUNT_TYPES: AccountTypeInfo[] = [
  { value: "checking", label: "Cuenta corriente", icon: Wallet },
  { value: "savings", label: "Cuenta de ahorro", icon: PiggyBank },
  { value: "credit", label: "Tarjeta", icon: CreditCard },
  { value: "cash", label: "Efectivo", icon: Banknote },
];

export const accountTypeInfo = (value: AccountType | undefined): AccountTypeInfo =>
  ACCOUNT_TYPES.find((t) => t.value === value) || ACCOUNT_TYPES[0];

export interface RecurUnitInfo {
  value: RecurUnit;
  label: string;
}

export const RECUR_UNITS: RecurUnitInfo[] = [
  { value: "days", label: "Dias" },
  { value: "months", label: "Meses" },
  { value: "years", label: "Anos" },
];

export const inputStyle: CSSProperties = {
  background: T.bgInput,
  border: "1px solid " + T.border,
  borderRadius: 6,
  padding: "8px 10px",
  color: T.text,
  fontFamily: "Inter, sans-serif",
  fontSize: 13,
  outline: "none",
  width: "100%",
};

export const smallBtn = (active: boolean): CSSProperties => ({
  background: active ? "#EAF1FC" : "#FFFFFF",
  border: "1px solid " + (active ? T.accent : T.border),
  color: active ? T.accent : T.textMuted,
  borderRadius: 6,
  padding: "0 10px",
  fontSize: 12,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  height: 30,
  boxSizing: "border-box",
});

/** Version reducida (24px) de smallBtn, reservada a los presets rapidos de rango de fechas (1M/3M/6M/1A/Fin de año). */
export const tinyBtn = (active: boolean): CSSProperties => ({
  background: active ? T.accent : "#FFFFFF",
  color: active ? "#fff" : T.textMuted,
  border: "1px solid " + (active ? T.accent : T.border),
  borderRadius: 5,
  padding: "0 8px",
  fontSize: 11,
  fontWeight: 600,
  height: 24,
  boxSizing: "border-box",
});

export const dot = (color: string, size?: number): CSSProperties => ({
  width: size || 8,
  height: size || 8,
  borderRadius: "50%",
  background: color,
  flexShrink: 0,
  display: "inline-block",
});
