"use client";

import { useEffect, useRef, useState } from "react";
import { FileSearch } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  ITPItem,
  ITPSession,
  ITPTemplate,
  ProjectOption,
  SiteOption,
  CreationMode,
  ImportStep,
  DraftItp,
} from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CreateItpModalProps {
  open: boolean;
  onClose: () => void;
  activeCompanyId: string;
  projects: ProjectOption[];
  allSites: SiteOption[];
  projectFilter: string;
  filterProjectName: string | null;
  templates: ITPTemplate[];
  templatesLoading: boolean;
  onSessionCreated: (session: ITPSession, items: ITPItem[]) => void;
  onTemplateDeleted: (id: string) => void;
  /** Pre-select a creation mode when the modal opens. Defaults to "ai". */
  initialMode?: CreationMode;
}

// ---------------------------------------------------------------------------
// CreateItpModal
// ---------------------------------------------------------------------------

export default function CreateItpModal({
  open,
  onClose,
  activeCompanyId,
  projects,
  allSites,
  projectFilter,
  filterProjectName,
  templates,
  templatesLoading,
  onSessionCreated,
  onTemplateDeleted,
  initialMode = "ai",
}: CreateItpModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [taskDescription, setTaskDescription] = useState("");
  const [creationMode, setCreationMode] = useState<CreationMode>(initialMode);
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectFilter && projectFilter !== "unassigned" ? projectFilter : ""
  );
  const [selectedSiteId, setSelectedSiteId] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");
  const [, setFallbackWarning] = useState(false);

  // Manual creation state
  const [creating, setCreating] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [draftSessions, setDraftSessions] = useState<DraftItp[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importJobStep, setImportJobStep] = useState("");
  const [importJobMessage, setImportJobMessage] = useState("");
  const [importJobPercent, setImportJobPercent] = useState(0);

  const filteredSites = selectedProjectId
    ? allSites.filter((s) => s.project_id === selectedProjectId)
    : allSites;

  // Sync dialog open/close state
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      setCreationMode(initialMode);
      if (initialMode === "import") setImportStep("upload");
      el.showModal();
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear site when project changes
  useEffect(() => {
    setSelectedSiteId("");
  }, [selectedProjectId]);

  function resetForm() {
    setTaskDescription("");
    setCreationMode("ai");
    setSelectedProjectId(projectFilter && projectFilter !== "unassigned" ? projectFilter : "");
    setSelectedSiteId("");
    setImportFile(null);
    setImportStep("upload");
    setDraftSessions([]);
    setFallbackWarning(false);
    setGeneratingStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    if (generating || creating || importing || previewing) return;
    resetForm();
    onClose();
  }

  // ── AI Generate ────────────────────────────────────────────────────────────

  async function handleGenerate() {
    const task = taskDescription.trim();
    if (!task) return;

    setGenerating(true);
    setGeneratingStatus("Analyzing task…");
    setFallbackWarning(false);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch("/api/itp-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          task_description: task,
          company_id: activeCompanyId,
          project_id: selectedProjectId || undefined,
          site_id: selectedSiteId || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = "";
        let currentEvent = "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === "status") {
                setGeneratingStatus(data.message);
              } else if (currentEvent === "done") {
                const result = data as {
                  session: ITPSession;
                  items: ITPItem[];
                  meta: { usedFallback: boolean };
                };
                resetForm();
                onClose();
                onSessionCreated(result.session, result.items);
                if (result.meta.usedFallback) setFallbackWarning(true);
                return;
              } else if (currentEvent === "error") {
                throw new Error(data.error ?? "Generation failed");
              }
            } catch (e) {
              if (currentEvent === "error" || currentEvent === "done") throw e;
            }
            currentEvent = "";
          } else if (line !== "") {
            buffer = lines.slice(i).join("\n");
            break;
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate checklist.");
    } finally {
      setGenerating(false);
      setGeneratingStatus("");
    }
  }

  // ── Manual Create ──────────────────────────────────────────────────────────

  async function handleCreateManual() {
    const task = taskDescription.trim();
    if (!task) return;
    setCreating(true);
    try {
      const { data: session, error } = await supabase
        .from("itp_sessions")
        .insert({
          company_id: activeCompanyId,
          task_description: task,
          project_id: selectedProjectId || null,
          site_id: selectedSiteId || null,
        })
        .select("id, company_id, task_description, created_at, project_id, site_id, status")
        .single();
      if (error || !session) throw error ?? new Error("Failed to create ITP session.");
      resetForm();
      onClose();
      onSessionCreated(session as ITPSession, []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ITP.");
    } finally {
      setCreating(false);
    }
  }

  // ── Template ───────────────────────────────────────────────────────────────

  async function handleUseTemplate(template: ITPTemplate) {
    setCreating(true);
    try {
      const { data: session, error: sessionErr } = await supabase
        .from("itp_sessions")
        .insert({
          company_id: activeCompanyId,
          task_description: template.name,
          project_id: selectedProjectId || null,
          site_id: selectedSiteId || null,
        })
        .select("id, company_id, task_description, created_at, project_id, site_id, status")
        .single();
      if (sessionErr || !session) throw sessionErr ?? new Error("Failed to create session");

      const rows = template.items.map((item, idx) => ({
        session_id: session.id,
        type: item.type,
        title: item.title,
        description: item.description,
        sort_order: idx + 1,
      }));
      const { data: items, error: itemsErr } = await supabase
        .from("itp_items")
        .insert(rows)
        .select("id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng");
      if (itemsErr) throw itemsErr;

      resetForm();
      onClose();
      onSessionCreated(session as ITPSession, (items ?? []) as ITPItem[]);
      toast.success(`ITP created from template "${template.name}"`);
    } catch {
      toast.error("Failed to create ITP from template.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(`/api/itp-templates/${templateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authSession?.access_token ?? ""}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      onTemplateDeleted(templateId);
      toast.success("Template deleted.");
    } catch {
      toast.error("Failed to delete template.");
    }
  }

  // ── Import Preview ─────────────────────────────────────────────────────────

  async function handleImportPreview() {
    if (!importFile) return;
    setPreviewing(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("company_id", activeCompanyId);
      if (selectedProjectId) formData.append("project_id", selectedProjectId);
      if (selectedSiteId) formData.append("site_id", selectedSiteId);

      const res = await fetch("/api/itp-import/preview", {
        method: "POST",
        headers: { Authorization: `Bearer ${authSession?.access_token ?? ""}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
      }
      const data = await res.json() as { sessions: DraftItp[] };
      setDraftSessions(data.sessions);
      setImportStep("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to analyse document.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImportConfirm() {
    if (draftSessions.length === 0) return;
    setImportStep("saving");
    setImporting(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch("/api/itp-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authSession?.access_token ?? ""}` },
        body: JSON.stringify({
          company_id: activeCompanyId,
          project_id: selectedProjectId || undefined,
          site_id: selectedSiteId || undefined,
          sessions: draftSessions,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
      }
      const data = await res.json() as {
        imported: number;
        total_items: number;
        sessions: Array<{ session: ITPSession; items: ITPItem[] }>;
      };
      toast.success(`Imported ${data.imported} ITP${data.imported !== 1 ? "s" : ""} with ${data.total_items} checks`);

      if (data.sessions.length > 0) {
        data.sessions.forEach((s) => onSessionCreated(s.session, s.items));
        resetForm();
        onClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save ITPs.");
      setImportStep("preview");
    } finally {
      setImporting(false);
    }
  }

  function stopImportPoll() {
    if (importPollRef.current) {
      clearInterval(importPollRef.current);
      importPollRef.current = null;
    }
  }

  async function handleImportWithProgress() {
    if (!importFile) return;
    setImporting(true);
    setImportJobStep("uploading");
    setImportJobMessage("Uploading…");
    setImportJobPercent(5);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const accessToken = authSession?.access_token ?? "";

      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("company_id", activeCompanyId);
      if (selectedProjectId) fd.append("project_id", selectedProjectId);
      if (selectedSiteId) fd.append("site_id", selectedSiteId);

      const startRes = await fetch("/api/itp-import/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      if (!startRes.ok) {
        const body = await startRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to start import");
      }
      const { jobId } = await startRes.json() as { jobId: string };
      setImportJobId(jobId);

      importPollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/itp-import/status/${jobId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!statusRes.ok) return;
          const status = await statusRes.json() as {
            step: string;
            message: string;
            percent: number;
            result?: {
              imported: number;
              total_items: number;
              sessions: Array<{ session: ITPSession; items: ITPItem[] }>;
            };
            error?: string;
          };

          setImportJobStep(status.step);
          setImportJobMessage(status.message);
          setImportJobPercent(status.percent);

          if (status.step === "done" && status.result) {
            stopImportPoll();
            setImporting(false);
            setImportJobId(null);
            const data = status.result;
            toast.success(`Imported ${data.imported} ITP${data.imported !== 1 ? "s" : ""} with ${data.total_items} checks`);
            data.sessions.forEach((s) => onSessionCreated(s.session, s.items));
            resetForm();
            onClose();
          } else if (status.step === "error") {
            stopImportPoll();
            setImporting(false);
            setImportJobId(null);
            toast.error(status.message || "Import failed.");
          } else if (status.step === "cancelled") {
            stopImportPoll();
            setImporting(false);
            setImportJobId(null);
            toast.info("Import cancelled.");
          }
        } catch {
          // Poll error — retry on next interval
        }
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start import.");
      setImporting(false);
      setImportJobId(null);
    }
  }

  async function handleCancelImport() {
    if (!importJobId) return;
    stopImportPoll();
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      await fetch(`/api/itp-import/status/${importJobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authSession?.access_token ?? ""}` },
      });
    } catch { /* best effort */ }
    setImporting(false);
    setImportJobId(null);
    setImportJobStep("");
    setImportJobMessage("");
    setImportJobPercent(0);
    toast.info("Import cancelled.");
  }

  const isBusy = generating || creating || importing || previewing;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="backdrop:bg-black/40 bg-white rounded-2xl shadow-xl p-0 w-full max-w-lg border-0 mx-4"
    >
      {/* Modal header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900">New ITP</h2>
        <button
          onClick={handleClose}
          disabled={isBusy}
          className="text-slate-400 hover:text-slate-600 transition-colors text-xl font-bold leading-none disabled:opacity-40"
        >
          ×
        </button>
      </div>

      {/* Modal body */}
      <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Project & Site selectors */}
        {(projects.length > 0 || allSites.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Project <span className="font-normal">(optional)</span>
              </label>
              {projectFilter && projectFilter !== "unassigned" ? (
                <div className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-600 truncate">
                  {filterProjectName}
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={isBusy}
                  className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2 text-sm outline-none bg-white transition-colors disabled:opacity-60"
                >
                  <option value="">— None —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Site <span className="font-normal">(optional)</span>
              </label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                disabled={filteredSites.length === 0 || isBusy}
                className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2 text-sm outline-none bg-white transition-colors disabled:opacity-50"
              >
                <option value="">— None —</option>
                {filteredSites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Creation mode toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            How do you want to build this ITP?
          </label>
          <div id="itp-creation-mode" className="grid grid-cols-2 gap-2">
            {(
              [
                { mode: "ai", label: "✦ AI Generate", active: "bg-violet-100 border-violet-300 text-violet-700" },
                { mode: "manual", label: "✎ Manual", active: "bg-slate-800 border-slate-700 text-white" },
                { mode: "template", label: "⊟ Use Template", active: "bg-amber-100 border-amber-300 text-amber-700" },
                { mode: "import", label: "↑ Import Doc", active: "bg-blue-100 border-blue-300 text-blue-700" },
              ] as const
            ).map(({ mode, label, active }) => (
              <button
                key={mode}
                type="button"
                disabled={isBusy}
                onClick={() => { setCreationMode(mode); if (mode === "import") setImportStep("upload"); }}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${
                  creationMode === mode
                    ? active
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Task description */}
        {creationMode !== "import" && creationMode !== "template" && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Task description
            </label>
            <textarea
              ref={textareaRef}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="e.g. Laying pavers on median island"
              rows={3}
              disabled={isBusy}
              style={{ fontSize: "16px" }}
              className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-4 py-3 resize-none outline-none disabled:opacity-60 placeholder:text-slate-400 transition-colors"
            />
          </div>
        )}

        {/* ── AI generation progress ── */}
        {generating && (
          <div className="space-y-3">
            <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="h-4 w-4 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin shrink-0" />
              <span className="text-sm font-semibold text-violet-700">{generatingStatus}</span>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Import mode ── */}
        {creationMode === "import" && !importing && (
          <div className="space-y-3">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className={importStep === "upload" ? "text-blue-600" : "text-slate-400"}>1 Upload</span>
              <span className="text-slate-300">›</span>
              <span className={importStep === "preview" ? "text-blue-600" : "text-slate-400"}>2 AI Preview</span>
              <span className="text-slate-300">›</span>
              <span className={importStep === "saving" ? "text-blue-600" : "text-slate-400"}>3 Confirm</span>
            </div>

            {importStep === "upload" && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="itp-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={previewing}
                  className="w-full border-2 border-dashed border-blue-300 hover:border-blue-400 bg-blue-50 rounded-2xl py-6 text-center transition-colors disabled:opacity-50"
                >
                  {importFile ? (
                    <div>
                      <p className="text-sm font-semibold text-blue-700 truncate px-4">{importFile.name}</p>
                      <p className="text-xs text-blue-500 mt-1">{(importFile.size / 1024).toFixed(0)} KB — tap to change</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-blue-600">Tap to upload document</p>
                      <p className="text-xs text-blue-400 mt-1">PDF, DOCX, Excel, or TXT (max 10 MB)</p>
                    </div>
                  )}
                </button>
                <button
                  onClick={handleImportPreview}
                  disabled={previewing || !importFile}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
                >
                  {previewing ? "Analysing document…" : "Preview ITPs →"}
                </button>
                <button
                  onClick={handleImportWithProgress}
                  disabled={previewing || !importFile}
                  className="w-full bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-2xl py-3 text-sm active:scale-95 transition-transform"
                >
                  Quick Import (skip preview)
                </button>
              </>
            )}

            {importStep === "preview" && (
              <>
                {draftSessions.length === 0 ? (
                  <div className="flex flex-col items-center text-center py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                      <FileSearch className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">No activities found in this document</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Try a different file or create an ITP manually.
                    </p>
                    <div className="mt-4 flex gap-2 flex-wrap justify-center">
                      <button
                        onClick={() => { setImportStep("upload"); setDraftSessions([]); }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs active:scale-95 transition-transform"
                      >
                        Try a different file
                      </button>
                      <button
                        onClick={() => setCreationMode("manual")}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                      >
                        Create manually
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 font-semibold flex items-center justify-between">
                  <span>{draftSessions.length} ITP{draftSessions.length !== 1 ? "s" : ""} generated · Edit as needed</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {draftSessions.map((draft, si) => (
                    <div key={si} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between gap-2">
                        <input
                          value={draft.task_description}
                          onChange={(e) => {
                            const updated = [...draftSessions];
                            updated[si] = { ...updated[si], task_description: e.target.value };
                            setDraftSessions(updated);
                          }}
                          className="flex-1 text-sm font-semibold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-slate-300 transition-colors"
                          style={{ fontSize: "14px" }}
                        />
                        <button
                          onClick={() => setDraftSessions((prev) => prev.filter((_, i) => i !== si))}
                          className="text-xs text-red-400 hover:text-red-600 shrink-0 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {draft.items.map((item, ii) => (
                          <div key={ii} className="px-4 py-2.5 flex items-start gap-3">
                            <select
                              value={item.type}
                              onChange={(e) => {
                                const updated = [...draftSessions];
                                updated[si].items[ii] = { ...item, type: e.target.value as "witness" | "hold" };
                                setDraftSessions(updated);
                              }}
                              className={`text-xs font-bold rounded-full px-2 py-0.5 border-0 outline-none cursor-pointer shrink-0 ${
                                item.type === "hold" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              <option value="witness">WITNESS</option>
                              <option value="hold">HOLD</option>
                            </select>
                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                value={item.title}
                                onChange={(e) => {
                                  const updated = [...draftSessions];
                                  updated[si].items[ii] = { ...item, title: e.target.value };
                                  setDraftSessions(updated);
                                }}
                                className="w-full text-sm font-semibold text-slate-800 outline-none border-b border-transparent focus:border-slate-300 bg-transparent transition-colors"
                                style={{ fontSize: "14px" }}
                              />
                              <input
                                value={item.description}
                                onChange={(e) => {
                                  const updated = [...draftSessions];
                                  updated[si].items[ii] = { ...item, description: e.target.value };
                                  setDraftSessions(updated);
                                }}
                                className="w-full text-xs text-slate-500 outline-none border-b border-transparent focus:border-slate-300 bg-transparent transition-colors"
                                style={{ fontSize: "13px" }}
                              />
                            </div>
                            <button
                              onClick={() => {
                                const updated = [...draftSessions];
                                updated[si].items = updated[si].items.filter((_, i) => i !== ii);
                                setDraftSessions(updated);
                              }}
                              className="text-xs text-red-300 hover:text-red-500 shrink-0 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleImportConfirm}
                    disabled={importing || draftSessions.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl py-3 text-sm active:scale-95 transition-transform"
                  >
                    {importing ? "Saving…" : `Save ${draftSessions.length} ITP${draftSessions.length !== 1 ? "s" : ""}`}
                  </button>
                  <button
                    onClick={() => { setImportStep("upload"); setDraftSessions([]); }}
                    disabled={importing}
                    className="px-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-2xl text-sm hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Import job progress ── */}
        {importing && importJobId && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-1 text-xs font-semibold flex-wrap">
              {[
                { key: "uploading", label: "Uploading…" },
                { key: "extracting", label: "Extracting…" },
                { key: "analyzing", label: "Analyzing…" },
                { key: "creating", label: "Creating…" },
              ].map((s, idx) => {
                const stepOrder = ["uploading", "extracting", "analyzing", "creating", "done"];
                const currentIdx = stepOrder.indexOf(importJobStep);
                const thisIdx = stepOrder.indexOf(s.key);
                const isActive = thisIdx === currentIdx;
                const isDone = thisIdx < currentIdx;
                return (
                  <div key={s.key} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-slate-300 mx-0.5">›</span>}
                    <span className={`flex items-center gap-1 ${isActive ? "text-blue-600" : isDone ? "text-green-600" : "text-slate-400"}`}>
                      {isDone && <span>✓</span>}
                      {isActive && <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />}
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${importJobPercent}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 text-center">{importJobMessage}</p>
            <button
              onClick={handleCancelImport}
              className="w-full text-sm font-semibold text-red-600 border border-red-200 rounded-2xl py-2.5 hover:bg-red-50 active:scale-95 transition-all"
            >
              Cancel Import
            </button>
          </div>
        )}

        {/* ── Template mode ── */}
        {creationMode === "template" && !creating && (
          <div className="space-y-2">
            {templatesLoading ? (
              <div className="text-center py-6 text-sm text-slate-400">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-1">
                <p className="text-sm font-semibold text-slate-600">No templates yet</p>
                <p className="text-xs text-slate-400">Open an ITP session and save it as a template.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.items.length} item{t.items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <button
                      onClick={() => handleUseTemplate(t)}
                      disabled={creating}
                      className="text-xs font-bold bg-amber-400 hover:bg-amber-500 text-amber-900 rounded-lg px-3 py-1.5 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
                      title="Delete template"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Creating from template spinner ── */}
        {creating && creationMode === "template" && (
          <div className="flex items-center justify-center py-6 gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-600">Creating ITP…</span>
          </div>
        )}
      </div>

      {/* Modal footer — action button (AI / Manual modes) */}
      {!generating && (creationMode === "ai" || creationMode === "manual") && (
        <div className="px-5 pb-5 pt-2">
          {creationMode === "ai" ? (
            <button
              onClick={handleGenerate}
              disabled={generating || !taskDescription.trim()}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
            >
              Generate Checklist
            </button>
          ) : (
            <button
              onClick={handleCreateManual}
              disabled={creating || !taskDescription.trim()}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
            >
              {creating ? "Creating…" : "Create ITP"}
            </button>
          )}
        </div>
      )}
    </dialog>
  );
}
