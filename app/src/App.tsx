import { useState } from "react";
import { FolderOpen, Plus, X } from "lucide-react";
import { T, inputStyle } from "./theme";
import { useDocuments } from "./lib/useDocuments";

export default function App() {
  const { loading, documents, activeDocId, setActiveDocId, activeDoc, createDocument, removeDocument } = useDocuments();
  const [showDocForm, setShowDocForm] = useState(false);
  const [docNameDraft, setDocNameDraft] = useState("");

  function submitNewDocument(e: React.FormEvent) {
    e.preventDefault();
    createDocument(docNameDraft);
    setDocNameDraft("");
    setShowDocForm(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
        Cargando tus datos...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: "100vh" }}>
        <aside style={{ background: T.sidebar, borderRight: "1px solid " + T.border, padding: "12px 10px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {documents.map((d) => (
              <div
                key={d.id}
                className="doctab"
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: d.id === activeDocId ? "#FFFFFF" : "transparent",
                  border: "1px solid " + (d.id === activeDocId ? T.border : "transparent"),
                  borderRadius: 6, padding: "3px 3px 3px 8px",
                }}
              >
                <button
                  onClick={() => setActiveDocId(d.id)}
                  style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, fontWeight: d.id === activeDocId ? 700 : 500, color: d.id === activeDocId ? T.text : T.textMuted, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <FolderOpen size={11} /> {d.name}
                </button>
                {documents.length > 1 && (
                  <button onClick={() => removeDocument(d.id)} className="docx" style={{ opacity: 0, background: "none", border: "none", color: T.textFaint, padding: "0 3px" }} aria-label={"Eliminar archivo " + d.name}>
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setShowDocForm((s) => !s)} style={{ background: "none", border: "1px dashed " + T.border, borderRadius: 6, padding: "3px 7px", color: T.textMuted }} aria-label="Nuevo archivo">
              <Plus size={11} />
            </button>
          </div>

          {showDocForm && (
            <form onSubmit={submitNewDocument} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input autoFocus placeholder="Nombre del archivo" value={docNameDraft} onChange={(e) => setDocNameDraft(e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} />
              <button type="submit" style={{ background: T.accent, border: "none", borderRadius: 6, padding: "0 10px", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                Crear
              </button>
            </form>
          )}

          {activeDoc && <div style={{ padding: "2px 8px 14px", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{activeDoc.name}</div>}
        </aside>

        <main style={{ background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          {!activeDoc ? (
            <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13.5, maxWidth: 320 }}>
              Todavia no tienes ningun archivo. Crea el primero con el boton “+” de la barra lateral (p. ej. “Personal”).
            </div>
          ) : (
            <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13.5 }}>
              Archivo <strong style={{ color: T.text }}>{activeDoc.name}</strong> cargado y persistido en disco.
              <br />
              Cuentas, movimientos y el resto de funcionalidad llegan en la Parte 2.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
