import type { ReactNode } from "react";
import { X } from "lucide-react";
import { T } from "../theme";

export function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ width: 320, flexShrink: 0, borderLeft: "1px solid " + T.border, background: T.bgElevated, overflowY: "auto" }}>
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
