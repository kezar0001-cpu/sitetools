import { useCallback, useEffect, useState } from "react";

export function useColumnSettings() {
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    name: 300,
    dur: 90,
    start: 110,
    finish: 110,
    pred: 120,
    pct: 90,
    status: 120,
    delays: 80,
    assigned: 140,
  });

  const handleToggleColumn = useCallback((col: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }, []);

  const handleColumnResize = useCallback((col: string, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [col]: width }));
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("siteplan-col-widths");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, number>;
      setColumnWidths((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Ignore invalid local storage values.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("siteplan-col-widths", JSON.stringify(columnWidths));
  }, [columnWidths]);

  return {
    hiddenColumns,
    setHiddenColumns,
    columnWidths,
    setColumnWidths,
    handleToggleColumn,
    handleColumnResize,
  };
}
