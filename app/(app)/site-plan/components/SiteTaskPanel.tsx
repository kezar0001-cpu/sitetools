"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { DelayCategory, SitePlanTask } from "@/types/siteplan";
import { StatusBadge } from "./StatusBadge";
import { useUpdateProgress, useUpdateTask } from "@/hooks/useSitePlanTasks";
import { useCreateDelayLog } from "@/hooks/useSitePlanDelays";

interface SiteTaskPanelProps {
  task: SitePlanTask;
  onClose: () => void;
  onDelayLogged?: () => void;
}

type DelayChoice = {
  label: string;
  category: DelayCategory;
};

const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

const DELAY_CHOICES: DelayChoice[] = [
  { label: "Weather", category: "Weather" },
  { label: "Labour", category: "Subcontractor" },
  { label: "Materials", category: "Materials" },
  { label: "Design", category: "Design Change" },
  { label: "Client", category: "Scope Change" },
  { label: "Other", category: "Other" },
];

const DELAY_REASON_BY_LABEL: Record<DelayChoice["label"], string> = {
  Weather: "weather",
  Labour: "labour",
  Materials: "materials",
  Design: "design",
  Client: "client",
  Other: "other",
};

export function SiteTaskPanel({ task, onClose, onDelayLogged }: SiteTaskPanelProps) {
  const updateProgress = useUpdateProgress();
  const updateTask = useUpdateTask();
  const createDelayLog = useCreateDelayLog();

  const [progressNote, setProgressNote] = useState("");
  const [showProgressSaved, setShowProgressSaved] = useState(false);

  const [isDelayOpen, setIsDelayOpen] = useState(false);
  const [delayCategory, setDelayCategory] = useState<DelayChoice>(DELAY_CHOICES[0]);
  const [delayDays, setDelayDays] = useState(1);
  const [impactsCompletion, setImpactsCompletion] = useState(true);
  const [delayReason, setDelayReason] = useState(DELAY_REASON_BY_LABEL[DELAY_CHOICES[0].label]);

  const [comments, setComments] = useState(task.comments ?? "");

  const isBusy = updateProgress.isPending || updateTask.isPending || createDelayLog.isPending;

  const canLogDelay = delayDays > 0 && delayReason.trim().length > 0;


  const handleProgressTap = (progressAfter: number) => {
    if (progressAfter === task.progress) return;

    const note = progressNote.trim() || undefined;

    updateProgress.mutate(
      {
        taskId: task.id,
        projectId: task.project_id,
        progressBefore: task.progress,
        progressAfter,
        statusAfter:
          progressAfter === 100
            ? "completed"
            : task.progress === 0 && progressAfter > 0 && task.status === "not_started"
              ? "in_progress"
              : undefined,
        note,
      },
      {
        onSuccess: () => {
          setShowProgressSaved(true);
          setTimeout(() => setShowProgressSaved(false), 700);
          setProgressNote("");
        },
      }
    );
  };

  const handleCommentsBlur = () => {
    const next = comments.trim();
    const previous = task.comments?.trim() ?? "";
    if (next === previous) return;

    updateTask.mutate({
      id: task.id,
      projectId: task.project_id,
      updates: { comments: next.length > 0 ? next : null },
    });
  };

  const resetDelayForm = () => {
    setDelayCategory(DELAY_CHOICES[0]);
    setDelayDays(1);
    setImpactsCompletion(true);
    setDelayReason(DELAY_REASON_BY_LABEL[DELAY_CHOICES[0].label]);
  };

  const handleLogDelay = () => {
    if (!canLogDelay) return;

    createDelayLog.mutate(
      {
        payload: {
          task_id: task.id,
          delay_days: delayDays,
          delay_reason: delayReason.trim(),
          delay_category: delayCategory.category,
          impacts_completion: impactsCompletion,
        },
        projectId: task.project_id,
      },
      {
        onSuccess: () => {
          toast.success("Delay logged");
          resetDelayForm();
          setIsDelayOpen(false);
          onDelayLogged?.();
        },
      }
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="animate-slide-up fixed inset-x-0 bottom-0 z-50 flex h-[65dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-up">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200" />

        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900">{task.name}</h2>
          </div>
          <div className="ml-2 flex items-center gap-2">
            <StatusBadge status={task.status} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close task panel"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <section className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700">Update Progress</h3>
              {showProgressSaved ? <Check className="h-4 w-4 text-emerald-600" /> : null}
            </div>
            <div className="space-y-2">
              {PROGRESS_STEPS.map((value) => {
                const isSelected = task.progress === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleProgressTap(value)}
                    disabled={isBusy}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {value}%
                  </button>
                );
              })}
            </div>
            <div>
              <label htmlFor="progress-note" className="mb-1 block text-xs font-medium text-slate-600">
                Progress note (optional)
              </label>
              <input
                id="progress-note"
                type="text"
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                placeholder="Add a short note"
                className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
            <button
              type="button"
              onClick={() => setIsDelayOpen((prev) => !prev)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-semibold text-amber-800">⚠ Log a delay</span>
              {isDelayOpen ? <ChevronUp className="h-4 w-4 text-amber-700" /> : <ChevronDown className="h-4 w-4 text-amber-700" />}
            </button>

            {isDelayOpen ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {DELAY_CHOICES.map((choice) => {
                    const active = delayCategory.label === choice.label;
                    return (
                      <button
                        key={choice.label}
                        type="button"
                        onClick={() => {
                          setDelayCategory(choice);
                          setDelayReason(DELAY_REASON_BY_LABEL[choice.label]);
                        }}
                        className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                          active
                            ? "border-amber-600 bg-amber-600 text-white"
                            : "border-amber-200 bg-white text-amber-800"
                        }`}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white p-2">
                  <button
                    type="button"
                    onClick={() => setDelayDays((prev) => Math.max(1, prev - 1))}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-200"
                    aria-label="Decrease delay days"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="text-sm font-semibold text-slate-700">{delayDays} day{delayDays === 1 ? "" : "s"}</div>
                  <button
                    type="button"
                    onClick={() => setDelayDays((prev) => prev + 1)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-200"
                    aria-label="Increase delay days"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Pushes programme?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImpactsCompletion(true)}
                      className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                        impactsCompletion
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setImpactsCompletion(false)}
                      className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                        !impactsCompletion
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                <textarea
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  rows={2}
                  placeholder="Delay notes"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />

                <button
                  type="button"
                  onClick={handleLogDelay}
                  disabled={!canLogDelay || createDelayLog.isPending}
                  className="min-h-[44px] w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createDelayLog.isPending ? "Logging..." : "Log Delay"}
                </button>
              </div>
            ) : null}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Notes</h3>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              onBlur={handleCommentsBlur}
              rows={4}
              placeholder="Notes / comments"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </section>
        </div>
      </aside>
    </>
  );
}
