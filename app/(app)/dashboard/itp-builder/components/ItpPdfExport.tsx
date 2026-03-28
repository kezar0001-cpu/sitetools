"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------------------------------------------------------------------------
// Types (match DB column names)
// ---------------------------------------------------------------------------

type ItemType = "hold" | "witness";
type ItemStatus = "pending" | "signed" | "waived";

export interface ItpItem {
  id: string;
  session_id: string;
  type: ItemType;
  title: string;
  description: string;
  sort_order: number;
  slug: string;
  status: ItemStatus;
  signed_off_at: string | null;
  signed_off_by_name: string | null;
  sign_off_lat: number | null;
  sign_off_lng: number | null;
}

export interface ItpSession {
  id: string;
  company_id: string;
  project_id: string | null;
  site_id: string | null;
  task_description: string;
  created_at: string;
  status: string;
  company_name?: string | null;
  project_name?: string | null;
  site_name?: string | null;
}

interface Props {
  session: ItpSession & { items: ItpItem[] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAU(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ItpPdfExport({ session }: Props) {
  const isComplete = session.status === "complete";

  function handleExport() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const { items } = session;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedAt = formatAU(new Date().toISOString());
    const companyName = session.company_name ?? "";
    const projectSite = [session.project_name, session.site_name]
      .filter(Boolean)
      .join(" › ");

    // ── Header ──────────────────────────────────────────────────────────────
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("INSPECTION & TEST PLAN", 14, 18);

    // ── Sub-header ──────────────────────────────────────────────────────────
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(session.task_description, 14, 27);
    doc.text(`Generated: ${generatedAt}`, 14, 33);

    let nextY = 33;
    if (companyName) {
      nextY += 6;
      doc.text(companyName, 14, nextY);
    }
    if (projectSite) {
      nextY += 6;
      doc.text(projectSite, 14, nextY);
    }

    // Show draft label in header if not complete
    if (!isComplete) {
      nextY += 6;
      doc.setTextColor(200, 100, 0);
      doc.setFont("helvetica", "bold");
      doc.text("STATUS: DRAFT — IN PROGRESS", 14, nextY);
      doc.setFont("helvetica", "normal");
    }

    doc.setTextColor(0);

    const startY = nextY + 7;

    // ── Table body data ──────────────────────────────────────────────────────
    const bodyRows = items.map((item, i) => {
      const isSigned = item.status === "signed";
      const isWaived = item.status === "waived";
      return [
        String(i + 1),
        item.type.toUpperCase(),
        item.title,
        isSigned ? "Signed" : isWaived ? "Waived" : "",
        isSigned && item.signed_off_by_name ? item.signed_off_by_name : "",
        isSigned && item.signed_off_at ? formatAU(item.signed_off_at) : "",
        isSigned && item.sign_off_lat != null && item.sign_off_lng != null
          ? `${item.sign_off_lat.toFixed(5)}, ${item.sign_off_lng.toFixed(5)}`
          : "",
      ];
    });

    // ── autoTable ────────────────────────────────────────────────────────────
    autoTable(doc, {
      head: [["#", "Type", "Title", "Status", "Signed By", "Date/Time", "GPS"]],
      body: bodyRows,
      startY,
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [251, 191, 36],
        textColor: [113, 63, 18],
        fontStyle: "bold",
        halign: "center",
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 16, halign: "center" },
        2: { cellWidth: 45 },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 30 },
        5: { cellWidth: 38 },
        6: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (data: any) => {
        if (data.section !== "body") return;
        const item = items[data.row.index];
        if (!item) return;

        // Row background by point type
        if (item.type === "hold") {
          data.cell.styles.fillColor = [254, 242, 242]; // red-50 #fef2f2
        } else {
          data.cell.styles.fillColor = [255, 251, 235]; // amber-50 #fffbeb
        }

        // Type column: bold + colored text to match card badge
        if (data.column.index === 1) {
          data.cell.styles.fontStyle = "bold";
          if (item.type === "hold") {
            data.cell.styles.textColor = [185, 28, 28]; // red-700
          } else {
            data.cell.styles.textColor = [146, 64, 14]; // amber-800
          }
        }

        // Pending status cell: italic grey
        if (data.column.index === 3 && item.status === "pending") {
          data.cell.styles.textColor = [156, 163, 175];
          data.cell.styles.fontStyle = "italic";
        }
      },
    });

    // ── DRAFT watermark on every page for non-complete sessions ──────────────
    const totalPages = doc.getNumberOfPages();

    if (!isComplete) {
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.saveGraphicsState();
        // Semi-transparent grey watermark text
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.08 }));
        doc.setFontSize(60);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(150, 0, 0);
        // Rotate text diagonally across the page
        const centerX = pageWidth / 2;
        const centerY = pageHeight / 2;
        doc.text("DRAFT — IN PROGRESS", centerX, centerY, {
          align: "center",
          angle: 45,
        });
        doc.restoreGraphicsState();
      }
    }

    // ── Footer on every page ─────────────────────────────────────────────────
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160);
      doc.text("Generated by SiteITP · Buildstate", 14, pageHeight - 8);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - 14, pageHeight - 8, {
        align: "right",
      });
      doc.setTextColor(0);
    }

    // ── Save ─────────────────────────────────────────────────────────────────
    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`itp-${session.id.slice(0, 8)}-${dateStr}.pdf`);
  }

  return (
    <button
      id="itp-pdf-export"
      onClick={handleExport}
      className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl px-4 py-2.5 text-sm active:scale-95 transition-transform"
    >
      Export PDF{!isComplete && " (Draft)"}
    </button>
  );
}
