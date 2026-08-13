import { T, inputStyle } from "../theme";

export function RenameDocumentModal({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="no-print"
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 10, padding: 20, width: 320, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Renombrar documento</div>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
            if (e.key === "Escape") onCancel();
          }}
          style={inputStyle}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCancel} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "7px 12px", color: T.textMuted, fontSize: 12.5 }}>
            Cancelar
          </button>
          <button type="button" onClick={onSubmit} style={{ background: T.accent, border: "none", borderRadius: 6, padding: "7px 14px", color: "#fff", fontWeight: 600, fontSize: 12.5 }}>
            Renombrar
          </button>
        </div>
      </div>
    </div>
  );
}
