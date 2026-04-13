"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types (match DB column names)
// ---------------------------------------------------------------------------

type ItemType = "hold" | "witness";
type ItemStatus = "pending" | "signed" | "waived" | "client_hold";

export interface ItpItem {
  id: string;
  session_id: string;
  type: ItemType;
  phase?: string | null;
  title: string;
  description: string;
  sort_order: number;
  slug: string;
  status: ItemStatus;
  signed_off_at: string | null;
  signed_off_by_name: string | null;
  waive_reason?: string | null;
  signature?: string | null;
  reference_standard?: string | null;
  responsibility?: string | null;
  records_required?: string | null;
  acceptance_criteria?: string | null;
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

interface SignoffRecord {
  id: string;
  item_id: string;
  name: string;
  role: string;
  signed_at: string;
  notes?: string;
  dataUrl?: string;
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

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    superintendent: "Superintendent",
    third_party: "Third Party",
    contractor: "Contractor",
    designer: "Designer",
    inspector: "Inspector",
  };
  return labels[role] ?? role;
}

function typeCode(type: ItemType): string {
  if (type === "hold") return "H";
  return "W";
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

      // Fetch sign-off records (with signature images)
      let signoffs: SignoffRecord[] = [];
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const res = await fetch(`/api/itp-signoffs/${session.id}`, {
          headers: { Authorization: `Bearer ${authSession?.access_token ?? ""}` },
        });
        if (res.ok) {
          const data = await res.json() as { signoffs: SignoffRecord[] };
          signoffs = data.signoffs ?? [];
        }
      } catch {
        // Continue without sign-off details
      }

      // Group sign-offs by item_id for quick lookup
      const signoffsByItem = new Map<string, SignoffRecord[]>();
      for (const s of signoffs) {
        const existing = signoffsByItem.get(s.item_id) ?? [];
        existing.push(s);
        signoffsByItem.set(s.item_id, existing);
      }

      // Portrait A4
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      const generatedAt = formatAU(new Date().toISOString());
      const companyName = session.company_name ?? "";
      const projectSite = [session.project_name, session.site_name]
        .filter(Boolean)
        .join(" > ");

      // ── Header ──────────────────────────────────────────────────────────────
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("INSPECTION & TEST PLAN", margin, 16);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(session.task_description, margin, 23);

      let nextY = 23;
      if (companyName) {
        nextY += 5;
        doc.text(companyName, margin, nextY);
      }
      if (projectSite) {
        nextY += 5;
        doc.text(projectSite, margin, nextY);
      }
      nextY += 5;
      doc.text(`Generated: ${generatedAt}`, margin, nextY);

      if (!isComplete) {
        nextY += 5;
        doc.setTextColor(200, 100, 0);
        doc.setFont("helvetica", "bold");
        doc.text("STATUS: DRAFT — IN PROGRESS", margin, nextY);
        doc.setFont("helvetica", "normal");
      }

      // Legend
      nextY += 5;
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text("H = Hold Point (mandatory stop)    W = Witness Point (notification)", margin, nextY);

      doc.setTextColor(0);
      const startY = nextY + 4;

      // ── ITP Summary Table ─────────────────────────────────────────────────
      // Columns: # | Type | Activity/Inspection | Reference Standard | Acceptance Criteria | Status | Signed By
      const hasPhases = items.some((i) => i.phase && i.phase.trim());
      type RowMeta = { kind: "phase"; phase: string } | { kind: "item"; item: ItpItem; num: number };
      const rowMeta: RowMeta[] = [];
      const bodyRows: string[][] = [];

      if (hasPhases) {
        let lastPhase = "";
        let itemNum = 0;
        for (const item of items) {
          const phase = item.phase?.trim() || "General";
          if (phase !== lastPhase) {
            rowMeta.push({ kind: "phase", phase });
            bodyRows.push([{ content: phase, colSpan: 7 } as unknown as string, "", "", "", "", "", ""]);
            lastPhase = phase;
          }
          itemNum++;
          const isSigned = item.status === "signed";
          const isWaived = item.status === "waived";
          const itemSigs = signoffsByItem.get(item.id) ?? [];
          const signerNames = itemSigs.map((s) => `${s.name} (${roleLabel(s.role)})`).join(", ");
          rowMeta.push({ kind: "item", item, num: itemNum });
          bodyRows.push([
            String(itemNum),
            typeCode(item.type),
            item.title,
            item.reference_standard || "—",
            item.acceptance_criteria || item.description || "—",
            isSigned ? "Signed" : isWaived ? "Waived" : "Pending",
            signerNames || ((isSigned || isWaived) && item.signed_off_by_name ? item.signed_off_by_name : ""),
          ]);
        }
      } else {
        items.forEach((item, i) => {
          const isSigned = item.status === "signed";
          const isWaived = item.status === "waived";
          const itemSigs = signoffsByItem.get(item.id) ?? [];
          const signerNames = itemSigs.map((s) => `${s.name} (${roleLabel(s.role)})`).join(", ");
          rowMeta.push({ kind: "item", item, num: i + 1 });
          bodyRows.push([
            String(i + 1),
            typeCode(item.type),
            item.title,
            item.reference_standard || "—",
            item.acceptance_criteria || item.description || "—",
            isSigned ? "Signed" : isWaived ? "Waived" : "Pending",
            signerNames || ((isSigned || isWaived) && item.signed_off_by_name ? item.signed_off_by_name : ""),
          ]);
        });
      }

      autoTable(doc, {
        head: [["#", "Type", "Activity / Inspection", "Reference Standard", "Acceptance Criteria", "Status", "Signed By"]],
        body: bodyRows,
        startY,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: "linebreak",
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
        },
        headStyles: {
          fillColor: [109, 40, 217], // violet-700
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 10, halign: "center", fontStyle: "bold" },
          2: { cellWidth: 50 },
          3: { cellWidth: 30, fontStyle: "italic", fontSize: 6.5 },
          4: { cellWidth: 55 },
          5: { cellWidth: 15, halign: "center" },
          6: { cellWidth: "auto" },
        },
        margin: { left: margin, right: margin },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.section !== "body") return;
          const meta = rowMeta[data.row.index];
          if (!meta) return;

          // Phase header row styling
          if (meta.kind === "phase") {
            data.cell.styles.fillColor = [237, 233, 254]; // violet-100
            data.cell.styles.textColor = [109, 40, 217]; // violet-700
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 7.5;
            return;
          }

          const item = meta.item;

          // Row background by type
          if (item.type === "hold") {
            data.cell.styles.fillColor = [254, 242, 242];
          } else {
            data.cell.styles.fillColor = [255, 251, 235];
          }

          // Type column coloring
          if (data.column.index === 1) {
            if (item.type === "hold") {
              data.cell.styles.textColor = [185, 28, 28];
            } else {
              data.cell.styles.textColor = [146, 64, 14];
            }
          }

          // Status column styling
          if (data.column.index === 5) {
            if (item.status === "signed") {
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fontStyle = "bold";
            } else if (item.status === "pending") {
              data.cell.styles.textColor = [156, 163, 175];
              data.cell.styles.fontStyle = "italic";
            }
          }
        },
      });

      // ── Sign-Off Records ─────────────────────────────────────────────────────
      const itemsWithSignoffs = items.filter((item) => {
        const hasSigs = (signoffsByItem.get(item.id) ?? []).length > 0;
        const isResolved = item.status === "signed" || item.status === "waived";
        return hasSigs || isResolved;
      });

      if (itemsWithSignoffs.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let y = (doc as any).lastAutoTable.finalY + 14;

        if (y + 20 > pageHeight - 20) {
          doc.addPage();
          y = 18;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("SIGN-OFF RECORDS", margin, y);
        y += 10;

        for (const item of itemsWithSignoffs) {
          const isHold = item.type === "hold";
          const itemSigs = signoffsByItem.get(item.id) ?? [];
          const isWaived = item.status === "waived";

          const signatories: { name: string; role: string; signed_at: string; notes?: string; dataUrl?: string }[] =
            itemSigs.length > 0
              ? itemSigs.map((s) => ({ name: s.name, role: s.role, signed_at: s.signed_at, notes: s.notes, dataUrl: s.dataUrl ?? undefined }))
              : item.signed_off_by_name
              ? [{ name: item.signed_off_by_name, role: "", signed_at: item.signed_off_at ?? "" }]
              : [];

          if (signatories.length === 0 && !isWaived) continue;

          const sigH = 20;
          const sigW = 65;

          // Estimate block height
          let blockH = 8; // title
          for (const sig of signatories) {
            blockH += 6; // signer line
            if (sig.notes) blockH += 5; // notes line
            if (sig.dataUrl) blockH += sigH + 4; // signature image
          }
          blockH += 4; // bottom padding

          if (y + blockH > pageHeight - 16) {
            doc.addPage();
            y = 18;
          }

          // Card background
          doc.setFillColor(
            isHold ? 254 : 255,
            isHold ? 242 : 251,
            isHold ? 242 : 235
          );
          doc.roundedRect(margin, y - 3, contentWidth, blockH, 2, 2, "F");

          // Type badge
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(isHold ? 185 : 146, isHold ? 28 : 64, isHold ? 28 : 14);
          doc.text(typeCode(item.type), margin + 2, y + 2);

          // Title
          doc.setFontSize(8.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(15, 23, 42);
          const titleLine = doc.splitTextToSize(item.title, contentWidth - 20) as string[];
          doc.text(titleLine[0], margin + 12, y + 2);
          y += 8;

          // Signatories
          for (const sig of signatories) {
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105); // slate-600
            const parts: string[] = [];
            if (sig.signed_at) parts.push(formatAU(sig.signed_at));
            if (sig.name) parts.push(sig.name);
            if (sig.role) parts.push(roleLabel(sig.role));
            parts.push(isWaived ? "Waived" : "Signed ✓");
            doc.text(parts.join("  ·  "), margin + 4, y);
            y += 6;

            // Notes
            if (sig.notes) {
              doc.setFontSize(7);
              doc.setFont("helvetica", "italic");
              doc.setTextColor(100, 116, 139); // slate-500
              const noteLines = doc.splitTextToSize(`Notes: ${sig.notes}`, contentWidth - 12) as string[];
              doc.text(noteLines[0], margin + 4, y);
              y += 5;
            }

            // Signature image
            if (sig.dataUrl) {
              doc.setFillColor(255, 255, 255);
              doc.roundedRect(margin + 4, y, sigW, sigH, 1, 1, "F");
              doc.addImage(sig.dataUrl, "PNG", margin + 4, y, sigW, sigH);
              y += sigH + 4;
            }
          }

          y += 4;
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
          (doc as any).setGState(new (doc as any).GState({ opacity: 0.07 }));
          doc.setFontSize(52);
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
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160);
        doc.text("Generated by SiteITP · Buildstate", margin, pageHeight - 6);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6, {
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
