import { Lock, Settings, X } from "lucide-react";
import type { Currency } from "../types";
import { T, inputStyle } from "../theme";
import { Field } from "./Field";

export function OptionsModal({
  currency,
  onChangeCurrency,
  passwordProtect,
  onTogglePasswordProtect,
  onClose,
}: {
  currency: Currency;
  onChangeCurrency: (value: Currency) => void;
  passwordProtect: boolean;
  onTogglePasswordProtect: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="no-print"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, width: 320, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
            <Settings size={16} style={{ color: T.accent }} /> Opciones
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <Field label="Moneda">
          <select value={currency} onChange={(e) => onChangeCurrency(e.target.value as Currency)} style={inputStyle}>
            <option value="EUR">€ Euro</option>
            <option value="GBP">£ Libra</option>
            <option value="USD">$ Dolar</option>
          </select>
        </Field>

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={13} style={{ color: T.textMuted }} /> Proteger con contraseña
          </span>
          <button
            onClick={onTogglePasswordProtect}
            style={{ width: 38, height: 22, borderRadius: 11, border: "none", background: passwordProtect ? T.accent : T.borderSoft, position: "relative", cursor: "pointer" }}
            aria-label="Proteger con contraseña"
          >
            <span style={{ position: "absolute", top: 2, left: passwordProtect ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </button>
        </div>

        <button onClick={onClose} style={{ marginTop: 20, width: "100%", background: T.accent, border: "none", borderRadius: 6, padding: "8px 0", color: "#fff", fontSize: 13, fontWeight: 600 }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
