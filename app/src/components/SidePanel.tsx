import type { ReactNode } from "react";
import { X } from "lucide-react";
import { T } from "../theme";

export function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      style={{
        position: "fixed", top: 0, bottom: 40, right: 0, width: 320, zIndex: 50,
        borderLeft: "1px solid " + T.border, background: T.bgElevated, overflowY: "auto",
        boxShadow: "-4px 0 16px rgba(0,0,0,0.08)", animation: "slideInPanel .18s ease-out",
      }}
    >
      <div style={{ padding: "12px 16px", borderBottom: "1px solid " + T.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textMuted, padding: 2 }} aria-label="Cerrar">
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}
