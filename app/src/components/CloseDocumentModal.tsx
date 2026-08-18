import { T } from "../theme";

export function CloseDocumentModal({
  docName,
  onSaveAndClose,
  onCloseWithoutSaving,
  onCancel,
}: {
  docName: string;
  onSaveAndClose: () => void;
  onCloseWithoutSaving: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, width: 320, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>Cerrar "{docName}"</div>
        <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 16px" }}>
          ¿Quieres guardar los cambios antes de cerrar este documento? El archivo nunca se elimina del disco, solo se cierra.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onSaveAndClose} style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 0", color: "#fff", fontSize: 13, fontWeight: 600 }}>
            Guardar y cerrar
          </button>
          <button onClick={onCloseWithoutSaving} style={{ background: "none", border: "1px solid " + T.border, borderRadius: 6, padding: "8px 0", color: T.text, fontSize: 13, fontWeight: 600 }}>
            Cerrar sin guardar
          </button>
          <button onClick={onCancel} style={{ background: "none", border: "none", padding: "6px 0", color: T.textMuted, fontSize: 12.5 }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
