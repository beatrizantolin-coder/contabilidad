import { T } from "../theme";

/**
 * Tirador de redimensionado manual para la cabecera de una columna: al
 * arrastrar, fija su ancho en `colWidths` (por clave de columna), lo que la
 * excluye del reparto automatico hasta que se pulse "Limpiar" o se
 * reinicie la app (estado solo de sesion).
 */
export function ColResizeHandle({
  colKey,
  defaultWidth,
  colWidths,
  setColWidths,
}: {
  colKey: string;
  defaultWidth: number;
  colWidths: Record<string, number>;
  setColWidths: (fn: (w: Record<string, number>) => Record<string, number>) => void;
}) {
  return (
    <span
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = colWidths[colKey] ?? defaultWidth;
        const onMove = (ev: MouseEvent) => {
          const next = Math.max(30, startWidth + (ev.clientX - startX));
          setColWidths((w) => ({ ...w, [colKey]: next }));
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      }}
      style={{ position: "absolute", right: 0, top: -6, bottom: -6, width: 9, cursor: "col-resize", display: "flex", justifyContent: "center", zIndex: 2 }}
      title="Arrastra para ajustar el ancho"
    >
      <span style={{ width: 1, background: T.border, height: "100%" }} />
    </span>
  );
}
