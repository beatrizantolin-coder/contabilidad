import { useEffect, useMemo, useState, type RefObject } from "react";

let measureCanvas: HTMLCanvasElement | null = null;

/** Ancho real (en px) de un texto con una fuente CSS dada, usando un <canvas> oculto. */
export function measureTextWidth(text: string, font: string): number {
  if (!text) return 0;
  try {
    if (!measureCanvas) measureCanvas = document.createElement("canvas");
    const ctx = measureCanvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.font = font;
    return ctx.measureText(String(text)).width;
  } catch {
    const sizeMatch = /([\d.]+)px/.exec(font);
    const size = sizeMatch ? Number(sizeMatch[1]) : 13;
    return String(text).length * size * 0.55;
  }
}

/** La palabra mas larga (visualmente, no por numero de caracteres) de un texto. */
export function longestWord(text: string, font = "13px Inter, sans-serif"): string {
  if (!text) return "";
  const words = String(text).split(/\s+/).filter(Boolean);
  return words.reduce((a, b) => (measureTextWidth(b, font) > measureTextWidth(a, font) ? b : a), "");
}

/** Ancho del texto mas ancho de una lista, con la misma fuente. */
export function widestTextWidth(texts: string[], font: string): number {
  return texts.reduce((mx, s) => Math.max(mx, measureTextWidth(s, font)), 0);
}

/** Padding horizontal de cada celda: 16px a cada lado. */
export const COL_MARGIN = 32;
export const HEADER_FONT = "600 10.5px Inter, sans-serif";
export const CONTENT_FONT = "13px Inter, sans-serif";
export const MONO_FONT = "13px 'IBM Plex Mono', monospace";

export interface ColDef {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  /** Ancho ideal (sin comprimir) de la columna: cabecera vs. contenido mas ancho. */
  natural: () => number;
  /** Ancho minimo antes de recurrir a scroll horizontal. Por defecto, igual a natural(). */
  min?: () => number;
  /** Si no cabe todo el contenido a su ancho natural, esta columna absorbe el espacio sobrante en vez de comprimirse (p.ej. Descripcion). */
  grow?: boolean;
}

export interface AutoColumnWidthsResult {
  widths: Record<string, number>;
  scroll: boolean;
  totalWidth: number;
  template: string;
}

/**
 * Calcula el ancho de cada columna midiendo texto real (cabecera vs.
 * contenido), con reduccion proporcional hasta el minimo de cada columna
 * cuando no cabe todo, y scroll horizontal solo cuando ni los minimos caben.
 * Las columnas con un ancho manual (fijado por el usuario arrastrando su
 * tirador) se respetan tal cual y no participan en el reparto automatico.
 */
export function computeAutoColumnWidths(cols: ColDef[], containerWidth: number, manualWidths: Record<string, number>): AutoColumnWidthsResult {
  const manual = manualWidths || {};
  const manualCols = cols.filter((c) => manual[c.key] != null);
  const autoColsList = cols.filter((c) => manual[c.key] == null);
  const sumManual = manualCols.reduce((s, c) => s + (manual[c.key] as number), 0);
  const availableForAuto = containerWidth > 0 ? Math.max(0, containerWidth - sumManual) : 0;

  const natural: Record<string, number> = {};
  const min: Record<string, number> = {};
  autoColsList.forEach((c) => {
    const m = c.min ? c.min() : c.natural();
    const n = Math.max(c.natural(), m);
    natural[c.key] = n;
    min[c.key] = m;
  });
  const sumNatural = autoColsList.reduce((s, c) => s + natural[c.key], 0);
  const sumMin = autoColsList.reduce((s, c) => s + min[c.key], 0);
  const autoWidths: Record<string, number> = {};
  let scroll = false;

  if (availableForAuto <= 0 || sumNatural === availableForAuto) {
    autoColsList.forEach((c) => {
      autoWidths[c.key] = natural[c.key];
    });
    if (containerWidth > 0 && sumNatural > availableForAuto) scroll = true;
  } else if (sumNatural < availableForAuto) {
    autoColsList.forEach((c) => {
      autoWidths[c.key] = natural[c.key];
    });
    const growCols = autoColsList.filter((c) => c.grow);
    if (growCols.length > 0) {
      const spare = availableForAuto - sumNatural;
      const growSumNatural = growCols.reduce((s, c) => s + natural[c.key], 0) || 1;
      growCols.forEach((c) => {
        autoWidths[c.key] = natural[c.key] + spare * (natural[c.key] / growSumNatural);
      });
    }
  } else if (sumMin >= availableForAuto) {
    autoColsList.forEach((c) => {
      autoWidths[c.key] = min[c.key];
    });
    scroll = true;
  } else {
    const excessTotal = sumNatural - sumMin;
    const excessAvail = availableForAuto - sumMin;
    const scale = excessTotal > 0 ? excessAvail / excessTotal : 0;
    autoColsList.forEach((c) => {
      autoWidths[c.key] = min[c.key] + (natural[c.key] - min[c.key]) * scale;
    });
  }

  const widths: Record<string, number> = {};
  cols.forEach((c) => {
    widths[c.key] = manual[c.key] != null ? (manual[c.key] as number) : autoWidths[c.key];
  });
  const totalWidth = cols.reduce((s, c) => s + widths[c.key], 0);
  const template = cols.map((c) => Math.round(widths[c.key]) + "px").join(" ");
  return { widths, scroll, totalWidth, template };
}

/**
 * Version-hook de computeAutoColumnWidths: sigue el ancho real del
 * contenedor con ResizeObserver y recalcula cuando cambian `deps` (p.ej. los
 * propios datos de la tabla, el zoom, las columnas visibles o los anchos
 * manuales).
 */
export function useAutoColumnWidths(cols: ColDef[], containerRef: RefObject<HTMLElement | null>, manualWidths: Record<string, number>, deps: unknown[]): AutoColumnWidthsResult {
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeAutoColumnWidths(cols, containerWidth, manualWidths), [containerWidth, manualWidths, ...deps]);
}
