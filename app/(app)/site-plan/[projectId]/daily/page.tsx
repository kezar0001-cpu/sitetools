"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  CloudRain,
  CloudLightning,
  CloudSun,
  CloudFog,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  Plus,
  Trash2,
  FileDown,
  ArrowLeftRight,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks, useUpdateTask, useCreateTask, useDeleteTask } from "@/hooks/useSitePlanTasks";
import { useProjectDelayLogs, useCreateDelayLog } from "@/hooks/useSitePlanDelays";
import {
  useDailyReport,
  useDebouncedReportSave,
} from "@/hooks/useSitePlanDailyReport";
import type {
  WeatherCondition,
  SiteStatus,
} from "@/hooks/useSitePlanDailyReport";
import type {
  SitePlanTask,
  TaskType,
  DelayCategory,
  SitePlanDelayLog,
} from "@/types/siteplan";
import { STATUS_LABELS, DELAY_CATEGORIES } from "@/types/siteplan";
import { StatusBadge } from "../../components/StatusBadge";
import { ProgressBar } from "../../components/ProgressSlider";
import { SitePlanBottomNav } from "../../components/SitePlanBottomNav";
import { TaskListSkeleton } from "../../components/Skeleton";
import { QueryProvider } from "@/components/QueryProvider";

// ─── Weather / status config ─────────────────────────────────

const WEATHER_OPTIONS: { value: WeatherCondition; label: string; icon: typeof Sun }[] = [
  { value: "sunny", label: "Sunny", icon: Sun },
  { value: "partly_cloudy", label: "Partly Cloudy", icon: CloudSun },
  { value: "overcast", label: "Overcast", icon: CloudFog },
  { value: "rain", label: "Rain", icon: CloudRain },
  { value: "heavy_rain", label: "Heavy Rain", icon: CloudRain },
  { value: "extreme", label: "Extreme", icon: CloudLightning },
];

const SITE_STATUS_OPTIONS: { value: SiteStatus; label: string; color: string }[] = [
  { value: "on_programme", label: "On Programme", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "at_risk", label: "At Risk", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "delayed", label: "Delayed", color: "bg-red-100 text-red-700 border-red-200" },
];

// ─── Date helpers ───────────────────────────────────────────

function formatDateISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Inline Delay Form ──────────────────────────────────────

function InlineDelayForm({
  task,
  projectId,
  onClose,
}: {
  task: SitePlanTask;
  projectId: string;
  onClose: () => void;
}) {
  const createDelay = useCreateDelayLog();
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<DelayCategory>("Weather");
  const [impacts, setImpacts] = useState(true);

  const handleSubmit = () => {
    if (!reason.trim()) return;
    createDelay.mutate(
      {
        payload: {
          task_id: task.id,
          delay_days: days,
          delay_reason: reason.trim(),
          delay_category: category,
          impacts_completion: impacts,
        },
        projectId,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-red-700">Log Delay</span>
        <button onClick={onClose} className="p-1 hover:bg-red-100 rounded min-w-[28px] min-h-[28px] flex items-center justify-center">
          <X className="h-3.5 w-3.5 text-red-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
          className="border border-red-200 rounded px-2 py-1.5 text-sm min-h-[36px]"
          placeholder="Days"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as DelayCategory)}
          className="border border-red-200 rounded px-2 py-1.5 text-sm min-h-[36px]"
        >
          {DELAY_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for delay..."
        rows={2}
        className="w-full border border-red-200 rounded px-2 py-1.5 text-sm resize-none"
      />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={impacts} onChange={(e) => setImpacts(e.target.checked)} className="w-3.5 h-3.5" />
        Shifts schedule
      </label>
      <button
        onClick={handleSubmit}
        disabled={!reason.trim() || createDelay.isPending}
        className="w-full px-3 py-2 text-xs font-medium text-white bg-red-600 rounded min-h-[36px] disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {createDelay.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {createDelay.isPending ? "Logging..." : "Log Delay"}
      </button>
    </div>
  );
}

// ─── Comment Form ───────────────────────────────────────────

function InlineCommentForm({
  task,
  projectId,
  onClose,
}: {
  task: SitePlanTask;
  projectId: string;
  onClose: () => void;
}) {
  const updateTask = useUpdateTask();
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (!comment.trim()) return;
    const existing = task.comments || "";
    const timestamp = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const newComments = existing
      ? `${existing}\n[${timestamp}] ${comment.trim()}`
      : `[${timestamp}] ${comment.trim()}`;
    updateTask.mutate(
      { id: task.id, projectId, updates: { comments: newComments } },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-700">Add Comment</span>
        <button onClick={onClose} className="p-1 hover:bg-blue-100 rounded min-w-[28px] min-h-[28px] flex items-center justify-center">
          <X className="h-3.5 w-3.5 text-blue-400" />
        </button>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Enter comment..."
        rows={2}
        className="w-full border border-blue-200 rounded px-2 py-1.5 text-sm resize-none"
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={!comment.trim() || updateTask.isPending}
        className="w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded min-h-[36px] disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {updateTask.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {updateTask.isPending ? "Saving..." : "Add Comment"}
      </button>
    </div>
  );
}

// ─── Add Task Form ──────────────────────────────────────────

function AddTaskForm({
  projectId,
  taskCount,
  onClose,
}: {
  projectId: string;
  taskCount: number;
  onClose: () => void;
}) {
  const createTask = useCreateTask();
  const [name, setName] = useState("");
  const [type, setType] = useState<TaskType>("task");
  const [startDate, setStartDate] = useState(formatDateISO(new Date()));
  const [duration, setDuration] = useState(7);
  const [responsible, setResponsible] = useState("");

  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + duration);
    return formatDateISO(d);
  }, [startDate, duration]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    createTask.mutate(
      {
        project_id: projectId,
        name: name.trim(),
        type,
        start_date: startDate,
        end_date: endDate,
        responsible: responsible || undefined,
        sort_order: taskCount,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-green-700">Add New Task</span>
        <button onClick={onClose} className="p-1 hover:bg-green-100 rounded min-w-[28px] min-h-[28px] flex items-center justify-center">
          <X className="h-4 w-4 text-green-400" />
        </button>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Task name"
        className="w-full border border-green-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
        autoFocus
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TaskType)}
          className="border border-green-200 rounded-lg px-2 py-2 text-sm min-h-[44px]"
        >
          <option value="phase">Phase</option>
          <option value="task">Task</option>
          <option value="subtask">Subtask</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-green-200 rounded-lg px-2 py-2 text-sm min-h-[44px]"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full border border-green-200 rounded-lg px-2 py-2 text-sm min-h-[44px]"
          />
          <span className="text-xs text-green-600 shrink-0">days</span>
        </div>
      </div>
      <input
        type="text"
        value={responsible}
        onChange={(e) => setResponsible(e.target.value)}
        placeholder="Responsible party"
        className="w-full border border-green-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
      />
      <button
        onClick={handleSubmit}
        disabled={!name.trim() || createTask.isPending}
        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg min-h-[44px] disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {createTask.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {createTask.isPending ? "Adding..." : "Add Task"}
      </button>
    </div>
  );
}

// ─── Reschedule Form ────────────────────────────────────────

function RescheduleForm({
  task,
  projectId,
  onClose,
}: {
  task: SitePlanTask;
  projectId: string;
  onClose: () => void;
}) {
  const updateTask = useUpdateTask();
  const [startDate, setStartDate] = useState(task.start_date);
  const [endDate, setEndDate] = useState(task.end_date);

  const handleSubmit = () => {
    updateTask.mutate(
      { id: task.id, projectId, updates: { start_date: startDate, end_date: endDate } },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-amber-700">Reschedule</span>
        <button onClick={onClose} className="p-1 hover:bg-amber-100 rounded min-w-[28px] min-h-[28px] flex items-center justify-center">
          <X className="h-3.5 w-3.5 text-amber-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-amber-600">New Start</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-amber-200 rounded px-2 py-1.5 text-sm min-h-[36px]"
          />
        </div>
        <div>
          <label className="text-[10px] text-amber-600">New End</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-amber-200 rounded px-2 py-1.5 text-sm min-h-[36px]"
          />
        </div>
      </div>
      {(startDate !== task.start_date || endDate !== task.end_date) && (
        <p className="text-[10px] text-amber-600">
          This may cascade to dependent tasks.
        </p>
      )}
      <button
        onClick={handleSubmit}
        disabled={updateTask.isPending}
        className="w-full px-3 py-2 text-xs font-medium text-white bg-amber-600 rounded min-h-[36px] disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {updateTask.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {updateTask.isPending ? "Saving..." : "Reschedule"}
      </button>
    </div>
  );
}

// ─── Task Due Card ──────────────────────────────────────────

function TaskDueCard({
  task,
  projectId,
  delayCount,
}: {
  task: SitePlanTask;
  projectId: string;
  delayCount: number;
}) {
  const updateTask = useUpdateTask();
  const deleteTaskMut = useDeleteTask();
  const [activeForm, setActiveForm] = useState<"delay" | "comment" | "reschedule" | "remove" | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [progress, setProgress] = useState(task.progress);

  const indent = task.type === "phase" ? 0 : task.type === "task" ? 1 : 2;
  const isPhase = task.type === "phase";

  const handleProgressChange = useCallback(
    (val: number) => {
      setProgress(val);
      updateTask.mutate({ id: task.id, projectId, updates: { progress: val } });
    },
    [task.id, projectId, updateTask]
  );

  const handleMarkComplete = () => {
    setProgress(100);
    updateTask.mutate({
      id: task.id,
      projectId,
      updates: { progress: 100, status: "completed", actual_end: formatDateISO(new Date()) },
    });
  };

  const handleRemove = () => {
    if (!removeReason.trim()) return;
    deleteTaskMut.mutate(
      { id: task.id, projectId },
      {
        onSuccess: () => {
          setActiveForm(null);
          toast.success("Task removed", { duration: 3000 });
        },
        onError: () => {
          toast.error("Failed to remove task", { duration: Infinity });
        },
      }
    );
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isPhase ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"
      }`}
      style={{ marginLeft: indent * 12 }}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className={`text-xs ${isPhase ? "font-bold uppercase text-slate-700" : task.type === "subtask" ? "text-slate-500" : "font-medium text-slate-900"}`}>
              {task.name}
            </span>
            {delayCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {delayCount}
              </span>
            )}
          </div>
          <StatusBadge status={task.status} />
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          <ProgressBar value={progress} className="flex-1" />
          <input
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => handleProgressChange(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-14 text-center text-xs border border-slate-200 rounded px-1 py-1 min-h-[28px] tabular-nums"
          />
          <span className="text-xs text-slate-400">%</span>
        </div>

        {/* Responsible */}
        {(task.responsible || task.assigned_to) && (
          <p className="text-xs text-slate-500 mb-2">
            {task.responsible || task.assigned_to}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveForm(activeForm === "delay" ? null : "delay")}
            className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded min-h-[32px] ${
              activeForm === "delay" ? "bg-red-100 text-red-700" : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Log Delay
          </button>
          <button
            onClick={() => setActiveForm(activeForm === "comment" ? null : "comment")}
            className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded min-h-[32px] ${
              activeForm === "comment" ? "bg-blue-100 text-blue-700" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            Comment
          </button>
          <button
            onClick={handleMarkComplete}
            disabled={task.progress >= 100 || updateTask.isPending}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-green-50 text-green-600 hover:bg-green-100 rounded min-h-[32px] disabled:opacity-40"
          >
            {updateTask.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Complete
          </button>
          <button
            onClick={() => setActiveForm(activeForm === "reschedule" ? null : "reschedule")}
            className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded min-h-[32px] ${
              activeForm === "reschedule" ? "bg-amber-100 text-amber-700" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
            }`}
          >
            <ArrowLeftRight className="h-3 w-3" />
            Reschedule
          </button>
          <button
            onClick={() => setActiveForm(activeForm === "remove" ? null : "remove")}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-slate-50 text-slate-500 hover:bg-slate-100 rounded min-h-[32px]"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>

      {/* Inline forms */}
      <div className="px-3 pb-3">
        {activeForm === "delay" && (
          <InlineDelayForm
            task={task}
            projectId={projectId}
            onClose={() => setActiveForm(null)}
          />
        )}
        {activeForm === "comment" && (
          <InlineCommentForm
            task={task}
            projectId={projectId}
            onClose={() => setActiveForm(null)}
          />
        )}
        {activeForm === "reschedule" && (
          <RescheduleForm
            task={task}
            projectId={projectId}
            onClose={() => setActiveForm(null)}
          />
        )}
        {activeForm === "remove" && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 mt-2">
            <span className="text-xs font-semibold text-slate-700">Remove Task</span>
            <textarea
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              placeholder="Reason for removal (required)"
              rows={2}
              className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm resize-none"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleRemove}
                disabled={!removeReason.trim() || deleteTaskMut.isPending}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded min-h-[36px] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteTaskMut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {deleteTaskMut.isPending ? "Removing..." : "Confirm Remove"}
              </button>
              <button
                onClick={() => setActiveForm(null)}
                className="px-3 py-2 text-xs text-slate-500 min-h-[36px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Design Change Form ─────────────────────────────────────

function DesignChangeForm({
  projectId,
  tasks,
  onClose,
}: {
  projectId: string;
  tasks: SitePlanTask[];
  onClose: () => void;
}) {
  const updateTask = useUpdateTask();
  const [description, setDescription] = useState("");
  const [affectedTaskId, setAffectedTaskId] = useState(tasks[0]?.id ?? "");

  const handleSubmit = () => {
    if (!description.trim() || !affectedTaskId) return;
    const task = tasks.find((t) => t.id === affectedTaskId);
    if (!task) return;

    const timestamp = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const changeLog = `[DESIGN CHANGE ${timestamp}] ${description.trim()}`;
    const notes = task.notes ? `${task.notes}\n${changeLog}` : changeLog;
    updateTask.mutate(
      { id: task.id, projectId, updates: { notes } },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-purple-700">Log Design Change</span>
        <button onClick={onClose} className="p-1 hover:bg-purple-100 rounded min-w-[28px] min-h-[28px] flex items-center justify-center">
          <X className="h-4 w-4 text-purple-400" />
        </button>
      </div>
      <select
        value={affectedTaskId}
        onChange={(e) => setAffectedTaskId(e.target.value)}
        className="w-full border border-purple-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
      >
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.wbs_code} {t.name}
          </option>
        ))}
      </select>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the design change or variation..."
        rows={3}
        className="w-full border border-purple-200 rounded-lg px-3 py-2.5 text-sm resize-none"
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={!description.trim() || updateTask.isPending}
        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg min-h-[44px] disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {updateTask.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {updateTask.isPending ? "Saving..." : "Log Change"}
      </button>
    </div>
  );
}

// ─── Export button ───────────────────────────────────────────

function ExportButton({
  date,
  tasks,
  delayLogs,
  weather,
  temperature,
  siteStatus,
  summaryNote,
}: {
  date: Date;
  tasks: SitePlanTask[];
  delayLogs: SitePlanDelayLog[];
  weather: WeatherCondition;
  temperature: string;
  siteStatus: SiteStatus;
  summaryNote: string;
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      doc.setFontSize(16);
      doc.text("Daily Site Summary", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(10);
      doc.text(formatDateDisplay(date), pageWidth / 2, 28, { align: "center" });

      doc.setFontSize(9);
      let y = 38;
      doc.text(`Weather: ${weather.replace("_", " ")} | Temp: ${temperature || "N/A"}`, 14, y);
      y += 6;
      doc.text(`Site Status: ${siteStatus.replace("_", " ")}`, 14, y);
      y += 6;
      if (summaryNote) {
        doc.text(`Summary: ${summaryNote}`, 14, y);
        y += 6;
      }
      y += 4;

      doc.setFontSize(11);
      doc.text("Tasks Due Today", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["WBS", "Task", "Status", "Progress", "Responsible"]],
        body: tasks.map((t) => [
          t.wbs_code,
          t.name,
          STATUS_LABELS[t.status],
          `${t.progress}%`,
          t.responsible || t.assigned_to || "",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 65, 85] },
      });

      if (delayLogs.length > 0) {
        const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.text("Delays Logged Today", 14, finalY);
        autoTable(doc, {
          startY: finalY + 4,
          head: [["Task", "Days", "Category", "Reason"]],
          body: delayLogs.map((log) => {
            const task = tasks.find((t) => t.id === log.task_id);
            return [task?.name || "Unknown", `+${log.delay_days}d`, log.delay_category, log.delay_reason];
          }),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 38, 38] },
        });
      }

      doc.save(`daily-summary-${formatDateISO(date)}.pdf`);
    } catch {
      // PDF export failed silently
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 min-h-[44px] disabled:opacity-50"
    >
      <FileDown className="h-4 w-4" />
      {exporting ? "Exporting..." : "Export PDF"}
    </button>
  );
}

// ─── Main Daily Summary ─────────────────────────────────────

function DailySummaryInner() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { data: project } = useSitePlanProject(projectId);
  const { data: tasks, isLoading } = useSitePlanTasks(projectId);
  const { data: allDelayLogs } = useProjectDelayLogs(projectId);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [showDesignChange, setShowDesignChange] = useState(false);
  const [overdueExpanded, setOverdueExpanded] = useState(false);

  const selectedDateISO = formatDateISO(selectedDate);

  // ── Persist daily report metadata ────────────────────────
  const { report, updateReport } = useDailyReport(projectId, selectedDateISO);
  const debouncedSave = useDebouncedReportSave(updateReport);

  // Derive controlled values: fall back to defaults when no DB record yet
  const weather: WeatherCondition = report?.weather ?? "sunny";
  const temperatureNum = report?.temperature ?? null;
  const siteStatus = report?.site_status ?? "on_programme";
  const summaryNote = report?.notes ?? "";

  const setWeather = (v: WeatherCondition) => updateReport({ weather: v });
  const setTemperature = (v: number | null) => debouncedSave({ temperature: v });
  const setSiteStatus = (v: typeof siteStatus) => updateReport({ site_status: v });
  const setSummaryNote = (v: string) => debouncedSave({ notes: v || null });

  // ── Task filtering ────────────────────────────────────────
  // dueOnSelectedDate: tasks whose end_date is exactly selectedDate
  const dueOnSelectedDate = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => t.end_date === selectedDateISO);
  }, [tasks, selectedDateISO]);

  // overdueActive: tasks whose end_date < selectedDate AND not yet complete
  const overdueActive = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => t.end_date < selectedDateISO && t.progress < 100);
  }, [tasks, selectedDateISO]);

  // ── Delay logs for selected date ─────────────────────────
  const todayDelayLogs = useMemo(() => {
    if (!allDelayLogs) return [];
    return allDelayLogs.filter((log) => isSameDay(new Date(log.logged_at), selectedDate));
  }, [allDelayLogs, selectedDate]);

  const delayCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (allDelayLogs) {
      for (const log of allDelayLogs) {
        map.set(log.task_id, (map.get(log.task_id) ?? 0) + 1);
      }
    }
    return map;
  }, [allDelayLogs]);

  const navigateDay = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push(`/site-plan/${projectId}`)}
              className="p-1.5 rounded-lg hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5 text-slate-400" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {project?.name ?? "Loading..."} — Daily Summary
              </h1>
            </div>
          </div>

          {/* View toggles (desktop) */}
          <div className="hidden md:flex items-center gap-2 mt-1">
            <div className="flex items-center border border-slate-200 rounded-md ml-auto">
              <button
                onClick={() => router.push(`/site-plan/${projectId}`)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-l-md"
              >
                List
              </button>
              <button
                onClick={() => router.push(`/site-plan/${projectId}/gantt`)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                Gantt
              </button>
              <button
                onClick={() => router.push(`/site-plan/${projectId}/summary`)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                Summary
              </button>
              <span className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-r-md">
                Daily
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
          {isLoading ? (
            <TaskListSkeleton />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
              {/* ─── HEADER SECTION ─── */}
              <div className="space-y-4">
                {/* Date selector */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigateDay(-1)}
                    className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-400" />
                  </button>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">
                      {formatDateDisplay(selectedDate)}
                    </p>
                    {isSameDay(selectedDate, new Date()) && (
                      <span className="text-xs font-medium text-blue-600">Today</span>
                    )}
                  </div>
                  <button
                    onClick={() => navigateDay(1)}
                    className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                {/* Weather + Temperature */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {WEATHER_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setWeather(value)}
                        title={label}
                        className={`p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${
                          weather === value
                            ? "bg-blue-100 text-blue-600 ring-2 ring-blue-300"
                            : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={temperatureNum ?? ""}
                    onChange={(e) =>
                      setTemperature(e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="°C"
                    className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                  />
                </div>

                {/* Site status */}
                <div className="flex items-center gap-2">
                  {SITE_STATUS_OPTIONS.map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => setSiteStatus(value)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border min-h-[44px] ${
                        siteStatus === value ? color + " ring-2 ring-offset-1" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Summary note */}
                <textarea
                  value={summaryNote}
                  onChange={(e) => setSummaryNote(e.target.value)}
                  placeholder="Daily summary notes..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none min-h-[44px]"
                />
              </div>

              {/* ─── DUE TODAY ─── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-800">
                    Due Today ({dueOnSelectedDate.length})
                  </h2>
                  <ExportButton
                    date={selectedDate}
                    tasks={dueOnSelectedDate}
                    delayLogs={todayDelayLogs}
                    weather={weather}
                    temperature={temperatureNum != null ? String(temperatureNum) : ""}
                    siteStatus={siteStatus}
                    summaryNote={summaryNote}
                  />
                </div>

                {dueOnSelectedDate.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    No tasks due on this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dueOnSelectedDate.map((task) => (
                      <TaskDueCard
                        key={task.id}
                        task={task}
                        projectId={projectId}
                        delayCount={delayCountMap.get(task.id) ?? 0}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ─── OVERDUE TASKS (collapsible) ─── */}
              {overdueActive.length > 0 && (
                <div>
                  <button
                    onClick={() => setOverdueExpanded((v) => !v)}
                    className="flex items-center gap-2 w-full text-left mb-3"
                  >
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${overdueExpanded ? "" : "-rotate-90"}`}
                    />
                    <h2 className="text-sm font-bold text-slate-800">
                      Overdue Tasks ({overdueActive.length})
                    </h2>
                  </button>

                  {overdueExpanded && (
                    <div className="space-y-3">
                      {overdueActive.map((task) => (
                        <TaskDueCard
                          key={task.id}
                          task={task}
                          projectId={projectId}
                          delayCount={delayCountMap.get(task.id) ?? 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── PROGRAMME CHANGES ─── */}
              <div>
                <h2 className="text-sm font-bold text-slate-800 mb-3">
                  Programme Changes
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowAddTask(!showAddTask)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg min-h-[44px] ${
                      showAddTask
                        ? "bg-green-100 text-green-700"
                        : "bg-green-50 text-green-600 hover:bg-green-100"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Add Task
                  </button>
                  <button
                    onClick={() => setShowDesignChange(!showDesignChange)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg min-h-[44px] ${
                      showDesignChange
                        ? "bg-purple-100 text-purple-700"
                        : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Design Change
                  </button>
                </div>

                {showAddTask && (
                  <div className="mt-3">
                    <AddTaskForm
                      projectId={projectId}
                      taskCount={tasks?.length ?? 0}
                      onClose={() => setShowAddTask(false)}
                    />
                  </div>
                )}

                {showDesignChange && tasks && tasks.length > 0 && (
                  <div className="mt-3">
                    <DesignChangeForm
                      projectId={projectId}
                      tasks={tasks}
                      onClose={() => setShowDesignChange(false)}
                    />
                  </div>
                )}
              </div>

              {/* ─── TODAY'S DELAYS ─── */}
              <div>
                <h2 className="text-sm font-bold text-slate-800 mb-3">
                  Today&apos;s Delays ({todayDelayLogs.length})
                </h2>
                {todayDelayLogs.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    No delays logged on this date.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayDelayLogs.map((log) => {
                      const task = tasks?.find((t) => t.id === log.task_id);
                      return (
                        <div
                          key={log.id}
                          className="p-3 border border-red-200 bg-red-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-red-700">
                              +{log.delay_days}d
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                              {log.delay_category}
                            </span>
                            {log.impacts_completion && (
                              <span className="text-[10px] text-red-600">Shifts schedule</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700">{log.delay_reason}</p>
                          {task && (
                            <p className="text-xs text-slate-500 mt-1">
                              Task: {task.wbs_code} {task.name}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <SitePlanBottomNav projectId={projectId} />
    </div>
  );
}

export default function DailySummaryPage() {
  return (
    <QueryProvider>
      <DailySummaryInner />
    </QueryProvider>
  );
}
