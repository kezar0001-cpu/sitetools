"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase";

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
  waive_reason?: string | null;
  signature?: string | null;
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
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { items } = session;

      // Fetch signature images (non-critical — PDF is still useful without them)
      const sigMap = new Map<string, string>(); // slug → data URL
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const res = await fetch(`/api/itp-signatures/${session.id}`, {
          headers: { Authorization: `Bearer ${authSession?.access_token ?? ""}` },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            signatures: { slug: string; dataUrl: string }[];
          };
          for (const sig of data.signatures ?? []) {
            sigMap.set(sig.slug, sig.dataUrl);
          }
        }
      } catch {
        // Continue without signatures
      }

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const generatedAt = formatAU(new Date().toISOString());
      const companyName = session.company_name ?? "";
      const projectSite = [session.project_name, session.site_name]
        .filter(Boolean)
        .join(" › ");

      // ── Header ──────────────────────────────────────────────────────────────
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("INSPECTION & TEST PLAN", margin, 18);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(session.task_description, margin, 27);
      doc.text(`Generated: ${generatedAt}`, margin, 33);

      let nextY = 33;
      if (companyName) {
        nextY += 6;
        doc.text(companyName, margin, nextY);
      }
      if (projectSite) {
        nextY += 6;
        doc.text(projectSite, margin, nextY);
      }

      if (!isComplete) {
        nextY += 6;
        doc.setTextColor(200, 100, 0);
        doc.setFont("helvetica", "bold");
        doc.text("STATUS: DRAFT — IN PROGRESS", margin, nextY);
        doc.setFont("helvetica", "normal");
      }

      doc.setTextColor(0);
      const startY = nextY + 7;

      // ── Summary table ────────────────────────────────────────────────────────
      const bodyRows = items.map((item, i) => {
        const isSigned = item.status === "signed";
        const isWaived = item.status === "waived";
        const notes = isWaived && item.waive_reason ? item.waive_reason : "";
        return [
          String(i + 1),
          item.type.toUpperCase(),
          item.title,
          isSigned ? "Signed" : isWaived ? "Waived" : "Pending",
          (isSigned || isWaived) && item.signed_off_by_name
            ? item.signed_off_by_name
            : "",
          (isSigned || isWaived) && item.signed_off_at
            ? formatAU(item.signed_off_at)
            : "",
          notes,
        ];
      });

      autoTable(doc, {
        head: [["#", "Type", "Title", "Status", "Signed By", "Date/Time", "Notes"]],
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
          2: { cellWidth: 42 },
          3: { cellWidth: 18, halign: "center" },
          4: { cellWidth: 28 },
          5: { cellWidth: 32 },
          6: { cellWidth: "auto" },
        },
        margin: { left: margin, right: margin },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.section !== "body") return;
          const item = items[data.row.index];
          if (!item) return;

          if (item.type === "hold") {
            data.cell.styles.fillColor = [254, 242, 242];
          } else {
            data.cell.styles.fillColor = [255, 251, 235];
          }

          if (data.column.index === 1) {
            data.cell.styles.fontStyle = "bold";
            if (item.type === "hold") {
              data.cell.styles.textColor = [185, 28, 28];
            } else {
              data.cell.styles.textColor = [146, 64, 14];
            }
          }

          if (data.column.index === 3 && item.status === "pending") {
            data.cell.styles.textColor = [156, 163, 175];
            data.cell.styles.fontStyle = "italic";
          }
        },
      });

      // ── Sign-Off Records ─────────────────────────────────────────────────────
      const resolvedItems = items.filter(
        (item) => item.status === "signed" || item.status === "waived"
      );

      if (resolvedItems.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let y = (doc as any).lastAutoTable.finalY + 14;

        if (y + 20 > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("SIGN-OFF RECORDS", margin, y);
        y += 10;

        for (const item of resolvedItems) {
          const isHold = item.type === "hold";
          const hasSig = item.status === "signed" && sigMap.has(item.slug);
          const sigH = 26;
          const sigW = 80;
          const noteLines =
            item.waive_reason
              ? (doc.splitTextToSize(
                  `Notes: ${item.waive_reason}`,
                  pageWidth - margin * 2 - 4
                ) as string[])
              : [];
          const blockH =
            7 + // title row
            6 + // meta row
            (hasSig ? sigH + 4 : 0) +
            (noteLines.length > 0 ? noteLines.length * 4.5 + 3 : 0) +
            6; // bottom padding

          if (y + blockH > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }

          // Card background
          doc.setFillColor(
            isHold ? 254 : 255,
            isHold ? 242 : 251,
            isHold ? 242 : 235
          );
          doc.roundedRect(margin, y - 4, pageWidth - margin * 2, blockH, 2, 2, "F");

          // Type badge
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(
            isHold ? 185 : 146,
            isHold ? 28 : 64,
            isHold ? 28 : 14
          );
          doc.text(item.type.toUpperCase(), margin + 2, y + 1);

          // Title
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(15, 23, 42);
          const titleLine = doc.splitTextToSize(
            item.title,
            pageWidth - margin * 2 - 26
          ) as string[];
          doc.text(titleLine[0], margin + 24, y + 1);
          y += 7;

          // Meta: date · name · status
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          const metaParts: string[] = [];
          if (item.signed_off_at) metaParts.push(formatAU(item.signed_off_at));
          if (item.signed_off_by_name) metaParts.push(item.signed_off_by_name);
          metaParts.push(item.status === "waived" ? "Waived" : "Signed");
          doc.text(metaParts.join("  ·  "), margin + 2, y);
          y += 6;

          // Signature image
          if (hasSig) {
            const dataUrl = sigMap.get(item.slug)!;
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin + 2, y, sigW, sigH, 1, 1, "F");
            doc.addImage(dataUrl, "PNG", margin + 2, y, sigW, sigH);
            y += sigH + 4;
          }

          // Notes
          if (noteLines.length > 0) {
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100, 116, 139);
            doc.text(noteLines, margin + 2, y);
            y += noteLines.length * 4.5 + 3;
          }

          y += 6;
          doc.setTextColor(0);
        }
      }

      // ── DRAFT watermark on every page ────────────────────────────────────────
      const totalPages = doc.getNumberOfPages();

      if (!isComplete) {
        for (let p = 1; p <= totalPages; p++) {
          doc.setPage(p);
          doc.saveGraphicsState();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (doc as any).setGState(new (doc as any).GState({ opacity: 0.08 }));
          doc.setFontSize(60);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(150, 0, 0);
          doc.text("DRAFT — IN PROGRESS", pageWidth / 2, pageHeight / 2, {
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
        doc.text("Generated by SiteITP · Buildstate", margin, pageHeight - 8);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
          align: "right",
        });
        doc.setTextColor(0);
      }

      // ── Save ─────────────────────────────────────────────────────────────────
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`itp-${session.id.slice(0, 8)}-${dateStr}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl px-4 py-2.5 text-sm active:scale-95 transition-transform disabled:opacity-70"
    >
      {exporting ? "Exporting…" : `Export PDF${!isComplete ? " (Draft)" : ""}`}
    </button>
  );
}
