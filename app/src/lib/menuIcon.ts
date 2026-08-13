import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Image as TauriImage } from "@tauri-apps/api/image";

interface LucideProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Rasteriza un icono de lucide-react a una imagen nativa (RGBA) que la barra
 * de menu de macOS puede usar. Se dibuja en un <canvas> fuera de pantalla en
 * vez de generar PNGs en el build, para no depender de herramientas de
 * rasterizado externas y mantener los mismos iconos que ya usa el resto de
 * la interfaz.
 */
export async function lucideToMenuIcon(Icon: ComponentType<LucideProps>, size = 16, color = "#1D1D1F"): Promise<TauriImage> {
  const raw = renderToStaticMarkup(createElement(Icon, { size, color, strokeWidth: 2 }));
  const svg = raw.includes("xmlns=") ? raw : raw.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  const dataUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));

  const img = new window.Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar el icono " + Icon.displayName));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el contexto 2D para rasterizar el icono");
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  return TauriImage.new(new Uint8Array(data), size, size);
}
