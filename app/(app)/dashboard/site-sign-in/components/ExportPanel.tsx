"use client";

interface ExportPanelProps {
  hasRecords: boolean;
  isPdfLoading: boolean;
  isXlsxLoading: boolean;
  onExportCSV: () => void;
  onExportXLSX: () => void;
  onExportPDF: () => void;
  onPreloadXLSX: () => void;
  onPreloadPDF: () => void;
}

export function ExportPanel({
  hasRecords,
  isPdfLoading,
  isXlsxLoading,
  onExportCSV,
  onExportXLSX,
  onExportPDF,
  onPreloadXLSX,
  onPreloadPDF,
}: ExportPanelProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={onExportCSV}
        disabled={!hasRecords}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg"
      >
        Export CSV
      </button>
      <button
        onClick={onExportXLSX}
        onMouseEnter={onPreloadXLSX}
        disabled={!hasRecords || isXlsxLoading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-2"
      >
        {isXlsxLoading && (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {isXlsxLoading ? "Loading..." : "Export Excel"}
      </button>
      <button
        onClick={onExportPDF}
        onMouseEnter={onPreloadPDF}
        disabled={!hasRecords || isPdfLoading}
        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-2"
      >
        {isPdfLoading && (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {isPdfLoading ? "Loading..." : "Export PDF"}
      </button>
    </div>
  );
}
