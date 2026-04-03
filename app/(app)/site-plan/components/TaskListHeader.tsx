"use client";

import { useMemo, useState } from "react";
import { COLUMN_DEFS } from "./TaskRow";

type HeaderAction = "hide" | "insert_left" | "insert_right" | "sort_asc" | "sort_desc";

interface TaskListHeaderProps {
  hiddenColumns?: Set<string>;
  onToggleColumn?: (col: string) => void;
  columnWidths?: Record<string, number>;
  onColumnResize?: (col: string, width: number) => void;
  onColumnAction?: (col: string, action: HeaderAction) => void;
}

export function TaskListHeader({
  hiddenColumns = new Set(),
  onToggleColumn,
  columnWidths,
  onColumnResize,
  onColumnAction,
}: TaskListHeaderProps) {
  const [menu, setMenu] = useState<{ x: number; y: number; col: string } | null>(null);

  const show = (col: string) => !hiddenColumns.has(col);
  const widthOf = (col: string, fallback: number) => columnWidths?.[col] ?? fallback;

  const cols = useMemo(
    () => [
      { id: "dur", label: "Duration", width: 90, className: "" },
      { id: "start", label: "Start", width: 110, className: "" },
      { id: "finish", label: "Finish", width: 110, className: "" },
      { id: "pred", label: "Predecessors", width: 120, className: "hidden lg:block" },
      { id: "pct", label: "% Complete", width: 90, className: "" },
      { id: "status", label: "Status", width: 120, className: "hidden lg:block" },
      { id: "delays", label: "Delays", width: 80, className: "" },
      { id: "assigned", label: "Assigned", width: 140, className: "hidden lg:block" },
    ],
    []
  );

  const startResize = (e: React.MouseEvent, col: string, startWidth: number) => {
    e.preventDefault();
    const startX = e.clientX;
    const move = (ev: MouseEvent) => {
      const nextWidth = Math.max(60, startWidth + (ev.clientX - startX));
      onColumnResize?.(col, nextWidth);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const renderHeader = (id: string, label: string, fallback: number, className = "") => {
    if (!show(id)) return null;
    return (
      <div
        key={id}
        className={`relative shrink-0 text-center py-1.5 border-r border-slate-300 select-none ${className}`}
        style={{ width: widthOf(id, fallback) }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, col: id });
        }}
      >
        {label}
        <div
          className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
          onMouseDown={(e) => startResize(e, id, widthOf(id, fallback))}
        />
      </div>
    );
  };

  return (
    <>
      <div className="hidden md:flex items-center border-b-2 border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-h-[32px] sticky top-0 z-10">
        <div className="w-7 shrink-0" />
        <div className="sticky left-0 z-[6] w-10 shrink-0 text-center border-r border-slate-300 py-1.5 bg-slate-100">#</div>
        <div className="relative shrink-0 min-w-[120px] px-2 py-1.5 border-r border-slate-300" style={{ width: widthOf("name", 300) }} onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, col: "name" }); }}>
          Task Name
          <div className="absolute top-0 right-0 h-full w-2 cursor-col-resize" onMouseDown={(e) => startResize(e, "name", widthOf("name", 300))} />
        </div>

        {cols.map((c) => renderHeader(c.id, c.label, c.width, c.className))}
      </div>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div className="fixed z-50 bg-white border border-slate-200 rounded-md shadow-xl py-1 min-w-[210px]" style={{ top: menu.y, left: menu.x }}>
            {menu.col !== "name" && (
              <button onClick={() => { onColumnAction?.(menu.col, "hide"); onToggleColumn?.(menu.col); setMenu(null); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">Hide Column</button>
            )}
            <button onClick={() => { onColumnAction?.(menu.col, "insert_left"); setMenu(null); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">Insert Column Left</button>
            <button onClick={() => { onColumnAction?.(menu.col, "insert_right"); setMenu(null); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">Insert Column Right</button>
            <button onClick={() => { onColumnAction?.(menu.col, "sort_asc"); setMenu(null); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">Sort A→Z</button>
            <button onClick={() => { onColumnAction?.(menu.col, "sort_desc"); setMenu(null); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">Sort Z→A</button>
            <div className="my-1 border-t border-slate-100" />
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase">Column Visibility</div>
            {COLUMN_DEFS.map((col) => (
              <button key={col.id} onClick={() => onToggleColumn?.(col.id)} className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">
                <span className={`w-3 h-3 rounded border ${hiddenColumns.has(col.id) ? "border-slate-300" : "bg-blue-600 border-blue-600"}`} />
                {col.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
