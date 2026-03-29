"use client";

import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ITPSession, ITPItem, AuditLogEntry } from "./types";
import ItpPdfExport from "./ItpPdfExport";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SessionHeaderProps {
  session: ITPSession;
  items: ITPItem[];
  projectName: string | null;
  siteName: string | null;
  companyName: string | null;
  updatingStatus: boolean;
  showSessionQR: boolean;
  showSaveTemplate: boolean;
  showAuditTrail: boolean;
  templateName: string;
  savingTemplate: boolean;
  auditLogs: AuditLogEntry[];
  auditLoading: boolean;
  fallbackWarning: boolean;
  onStatusChange: (status: string) => void;
  onToggleSessionQR: () => void;
  onToggleSaveTemplate: () => void;
  onToggleAuditTrail: () => void;
  onTemplateNameChange: (name: string) => void;
  onSaveTemplate: () => void;
  onDeleteClick: () => void;
  onDismissFallback: () => void;
  onLoadAuditLog: () => void;
}

// ---------------------------------------------------------------------------
// SessionHeader
// ---------------------------------------------------------------------------

export default function SessionHeader({
  session,
  items,
  projectName,
  siteName,
  companyName,
  updatingStatus,
  showSessionQR,
  showSaveTemplate,
  showAuditTrail,
  templateName,
  savingTemplate,
  auditLogs,
  auditLoading,
  fallbackWarning,
  onStatusChange,
  onToggleSessionQR,
  onToggleSaveTemplate,
  onToggleAuditTrail,
  onTemplateNameChange,
  onSaveTemplate,
  onDeleteClick,
  onDismissFallback,
  onLoadAuditLog,
}: SessionHeaderProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const sessionUrl = `${baseUrl}/itp-sign/session/${session.id}`;
  const signedCount = items.filter((i) => i.status === "signed").length;

  return (
    <div className="space-y-3">
      {/* Fallback warning banner */}
      {fallbackWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-700">
            <span className="font-bold">AI generation failed</span> — standard template used.
          </p>
          <button
            onClick={onDismissFallback}
            className="text-amber-400 hover:text-amber-600 transition-colors text-lg font-bold leading-none shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 leading-snug">
            {session.task_description}
          </h2>
          {(projectName || siteName) && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {[projectName, siteName].filter(Boolean).join(" › ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <span className="text-xs text-slate-400">
            {signedCount}/{items.length} signed
          </span>
          {/* Status badge */}
          {session.status === "active" && (
            <span className="text-xs font-semibold bg-green-100 text-green-700 rounded-full px-2.5 py-0.5">
              Active
            </span>
          )}
          {session.status === "complete" && (
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5">
              Complete
            </span>
          )}
          {session.status === "archived" && (
            <span className="text-xs font-semibold bg-slate-100 text-slate-500 rounded-full px-2.5 py-0.5">
              Archived
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {session.status === "active" && (
          <button
            onClick={() => onStatusChange("complete")}
            disabled={updatingStatus}
            className="text-xs font-semibold text-green-700 border border-green-200 bg-green-50 rounded-xl px-3 py-1.5 hover:bg-green-100 active:scale-95 transition-all disabled:opacity-50"
          >
            Mark Complete
          </button>
        )}
        {session.status === "complete" && (
          <>
            <button
              onClick={() => onStatusChange("active")}
              disabled={updatingStatus}
              className="text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 rounded-xl px-3 py-1.5 hover:bg-amber-100 active:scale-95 transition-all disabled:opacity-50"
            >
              Reopen
            </button>
            <button
              onClick={() => onStatusChange("archived")}
              disabled={updatingStatus}
              className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
            >
              Archive
            </button>
          </>
        )}
        {session.status === "archived" && (
          <button
            onClick={() => onStatusChange("active")}
            disabled={updatingStatus}
            className="text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 rounded-xl px-3 py-1.5 hover:bg-amber-100 active:scale-95 transition-all disabled:opacity-50"
          >
            Reactivate
          </button>
        )}
        <button
          onClick={() => {
            navigator.clipboard.writeText(sessionUrl).then(() =>
              toast.success("Session link copied to clipboard!")
            );
          }}
          className="text-xs font-semibold text-violet-700 border border-violet-200 bg-violet-50 rounded-xl px-3 py-1.5 hover:bg-violet-100 active:scale-95 transition-all"
        >
          Share Session
        </button>
        <ItpPdfExport
          session={{
            ...session,
            company_name: companyName,
            project_name: projectName ?? null,
            site_name: siteName ?? null,
            items,
          }}
        />
        <button
          onClick={onToggleSessionQR}
          className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-50 active:scale-95 transition-transform"
        >
          {showSessionQR ? "Hide QR" : "QR Code"}
        </button>
        <button
          onClick={onToggleSaveTemplate}
          className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-50 active:scale-95 transition-transform"
        >
          Save as Template
        </button>
        <button
          onClick={() => {
            onToggleAuditTrail();
            if (!showAuditTrail) onLoadAuditLog();
          }}
          className={`text-xs font-semibold border rounded-xl px-3 py-1.5 active:scale-95 transition-all ${
            showAuditTrail
              ? "bg-slate-800 border-slate-700 text-white"
              : "text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Audit Trail
        </button>
        <button
          onClick={onDeleteClick}
          className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
          title="Delete this ITP"
        >
          Delete
        </button>
      </div>

      {/* Session QR panel */}
      {showSessionQR && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Scan to sign off all items
          </p>
          <QRCodeSVG value={sessionUrl} size={200} level="H" />
          <p className="text-xs text-slate-400 break-all text-center max-w-xs">{sessionUrl}</p>
        </div>
      )}

      {/* Save as Template panel */}
      {showSaveTemplate && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            Save as Template
          </p>
          <input
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            placeholder="Template name (e.g. Concrete Footing Pour)"
            style={{ fontSize: "16px" }}
            className="w-full border-2 border-amber-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm bg-white transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={onSaveTemplate}
              disabled={savingTemplate || !templateName.trim()}
              className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-bold rounded-xl py-2.5 text-sm active:scale-95 transition-transform"
            >
              {savingTemplate ? "Saving…" : "Save Template"}
            </button>
            <button
              onClick={() => { onToggleSaveTemplate(); onTemplateNameChange(""); }}
              className="px-4 bg-white border border-amber-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Audit Trail panel */}
      {showAuditTrail && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Audit Trail</p>
          {auditLoading ? (
            <div className="text-center py-4 text-sm text-slate-400">Loading…</div>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">No audit records yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-bold uppercase px-1.5 py-0.5 rounded-full text-[10px] ${
                        log.action === "sign"
                          ? "bg-green-100 text-green-700"
                          : log.action === "waive"
                          ? "bg-slate-100 text-slate-600"
                          : log.action === "create"
                          ? "bg-violet-100 text-violet-700"
                          : log.action === "delete"
                          ? "bg-red-100 text-red-700"
                          : log.action === "archive"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-slate-400 shrink-0">
                      {new Date(log.performed_at).toLocaleString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {log.new_values && (
                    <p className="text-slate-500 mt-1 truncate">
                      {Object.entries(log.new_values)
                        .filter(([k]) => !k.includes("_id"))
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")
                        .slice(0, 100)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
