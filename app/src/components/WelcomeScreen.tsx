import { useState } from "react";
import { AlertTriangle, FilePlus2, FlaskConical, FolderClock, FolderOpen } from "lucide-react";
import { T } from "../theme";
import { APP_VERSION } from "../lib/version";

export function WelcomeScreen({
  onCreate,
  onOpenFile,
  onOpenTest,
  lastUsedName,
  onOpenLastUsed,
  error,
  skipWelcomeOnStart,
  onToggleSkipWelcome,
}: {
  onCreate: (name: string) => void;
  onOpenFile: () => void;
  onOpenTest: () => void;
  lastUsedName: string | null;
  onOpenLastUsed: () => void;
  error: string | null;
  skipWelcomeOnStart: boolean;
  onToggleSkipWelcome: (value: boolean) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, height: "100%" }}>
      <div style={{ textAlign: "center", maxWidth: 440, width: "100%" }}>
        <img src="/app-icon.png" alt="" width={64} height={64} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Bienvenido a Conta-Nice</div>
        <p style={{ fontSize: 11.5, color: T.textFaint, margin: "0 0 10px" }}>© B-Nice design 2026 · Version {APP_VERSION}</p>
        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 26px" }}>Elige cómo quieres empezar.</p>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              textAlign: "left",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={15} style={{ color: "#DC2626", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: "#991B1B" }}>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onCreate(name);
              setName("");
            }}
            style={{ border: "1px solid " + T.border, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FilePlus2 size={16} style={{ color: T.accent }} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Crear un nuevo documento</span>
            </div>
            <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>Empieza completamente en blanco: sin cuentas, categorías ni movimientos.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                placeholder="Nombre del documento (p. ej. Personal)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ flex: 1, border: "1px solid " + T.border, borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "Inter, sans-serif" }}
              />
              <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "8px 14px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
                Crear
              </button>
            </div>
          </form>

          {lastUsedName && (
            <button
              onClick={onOpenLastUsed}
              style={{ border: "1px solid " + T.border, borderRadius: 10, padding: 16, background: "#fff", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FolderClock size={16} style={{ color: T.accent }} />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Abrir el último documento usado</span>
              </div>
              <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>{lastUsedName}</p>
            </button>
          )}

          <button
            onClick={onOpenFile}
            style={{ border: "1px solid " + T.border, borderRadius: 10, padding: 16, background: "#fff", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FolderOpen size={16} style={{ color: T.accent }} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Abrir un documento</span>
            </div>
            <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>Elige un archivo de documento guardado previamente en tu Mac.</p>
          </button>

          <button
            onClick={onOpenTest}
            style={{ border: "1px solid " + T.border, borderRadius: 10, padding: 16, background: "#fff", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FlaskConical size={16} style={{ color: T.accent }} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Abrir un documento de prueba</span>
            </div>
            <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>Con cuentas, categorías y movimientos de ejemplo, solo para explorar la app.</p>
          </button>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 18, fontSize: 12, color: T.textMuted, cursor: "pointer", justifyContent: "center" }}>
          <input type="checkbox" checked={skipWelcomeOnStart} onChange={(e) => onToggleSkipWelcome(e.target.checked)} style={{ margin: 0 }} />
          No volver a mostrar esta pantalla al iniciar
        </label>
      </div>
    </div>
  );
}
