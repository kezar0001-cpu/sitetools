// Dynamic import utilities for heavy libraries
// Prevents large libraries from being included in the initial bundle

/* eslint-disable @typescript-eslint/no-explicit-any */

// Module caches - persists across component renders
let jsPDFCache: { jsPDF: any; autoTable: any } | null = null;
let xlsxCache: any | null = null;
let signatureCanvasCache: any | null = null;

// Preload promises for parallel loading
let jsPDFPreloadPromise: Promise<void> | null = null;
let xlsxPreloadPromise: Promise<any> | null = null;
let signatureCanvasPreloadPromise: Promise<any> | null = null;

/**
 * Dynamically import jsPDF and jspdf-autotable
 * Cached after first load
 */
export async function loadJsPDF(): Promise<{ jsPDF: any; autoTable: any }> {
  if (jsPDFCache) {
    return jsPDFCache;
  }

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  jsPDFCache = { jsPDF, autoTable };
  return jsPDFCache;
}

/**
 * Preload jsPDF libraries in background
 * Call on hover or when export is likely
 */
export function preloadJsPDF(): void {
  if (jsPDFPreloadPromise || jsPDFCache) return;
  
  jsPDFPreloadPromise = loadJsPDF().then(() => undefined);
}

/**
 * Dynamically import XLSX library
 * Cached after first load
 */
export async function loadXLSX(): Promise<any> {
  if (xlsxCache) {
    return xlsxCache;
  }

  const xlsx = await import("xlsx");
  xlsxCache = xlsx;
  return xlsx;
}

/**
 * Preload XLSX library in background
 * Call on hover or when export is likely
 */
export function preloadXLSX(): void {
  if (xlsxPreloadPromise || xlsxCache) return;
  
  xlsxPreloadPromise = loadXLSX();
}

/**
 * Dynamically import react-signature-canvas
 * Cached after first load
 */
export async function loadSignatureCanvas(): Promise<any> {
  if (signatureCanvasCache) {
    return signatureCanvasCache;
  }

  const signatureModule = await import("react-signature-canvas");
  signatureCanvasCache = signatureModule;
  return signatureCanvasCache;
}

/**
 * Preload react-signature-canvas in background
 * Call when signature section is likely to be opened
 */
export function preloadSignatureCanvas(): void {
  if (signatureCanvasPreloadPromise || signatureCanvasCache) return;
  
  signatureCanvasPreloadPromise = loadSignatureCanvas();
}
