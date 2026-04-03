"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  PrestartChecklistFull,
  PlantDetails,
  ChecklistItem,
  ChecklistDefect,
  OperatorDeclaration,
  SupervisorSignOff,
} from "@/lib/site-capture/types";
import type { Project, Site } from "@/lib/workspace/types";
import type { CompanyRole } from "@/lib/workspace/types";
import { PlantDetailsSection } from "./prestart/PlantDetailsSection";
import { ChecklistItemsSection } from "./prestart/ChecklistItemsSection";
import { DefectsSection } from "./prestart/DefectsSection";
import { OperatorDeclarationSection } from "./prestart/OperatorDeclarationSection";
import { SupervisorSignOffSection } from "./prestart/SupervisorSignOffSection";

interface PrestartChecklistFormProps {
  checklist: PrestartChecklistFull;
  onUpdate?: (updated: PrestartChecklistFull) => void;
  projects: Project[];
  sites: Site[];
  userRole?: CompanyRole | null;
  userId?: string | null;
}

type Section =
  | "plantDetails"
  | "checklistItems"
  | "defects"
  | "operatorDeclaration"
  | "supervisorSignOff";

function calculateProgress(checklist: PrestartChecklistFull): number {
  let score = 0;

  // Plant details complete (+30%)
  const pd = checklist.plantDetails;
  if (
    pd.equipmentType.trim() &&
    pd.makeModel.trim() &&
    pd.regoOrId.trim() &&
    pd.operatorName.trim()
  ) {
    score += 30;
  }

  // All checklist items checked (+30%)
  const allChecked = checklist.checklistItems.every((i) => i.status !== null);
  if (allChecked) score += 30;

  // Operator declaration complete (+20%)
  if (checklist.operatorDeclaration?.signature) score += 20;

  // Supervisor sign-off complete (+20%)
  if (checklist.supervisorSignOff?.signature) score += 20;

  return score;
}

function getProgressColor(score: number): string {
  if (score === 100) return "bg-emerald-500";
  if (score >= 80) return "bg-emerald-400";
  if (score >= 60) return "bg-amber-400";
  if (score >= 40) return "bg-amber-500";
  return "bg-amber-500";
}

function getProgressText(score: number): string {
  if (score === 100) return "Complete";
  if (score >= 80) return "Almost there";
  if (score >= 60) return "Good progress";
  if (score >= 40) return "In progress";
  return "Getting started";
}

export default function PrestartChecklistForm({
  checklist: initialChecklist,
  onUpdate,
  projects,
  sites,
  userRole,
}: PrestartChecklistFormProps) {
  const [checklist, setChecklist] = useState<PrestartChecklistFull>(initialChecklist);

  // Default open sections - essential sections open by default
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set<Section>(["plantDetails", "checklistItems"])
  );

  const isLocked = checklist.status === "completed" || checklist.status === "archived";

  // Check if user can sign off (manager, admin, owner)
  const canSignOff = useMemo(() => {
    return userRole === "owner" || userRole === "admin" || userRole === "manager";
  }, [userRole]);

  // Check for uncleared critical defects
  const hasUnclearedCriticalDefects = useMemo(() => {
    return checklist.defects.some(
      (d) => d.severity === "critical" && !d.clearedBeforeOperation
    );
  }, [checklist.defects]);

  // Calculate completion progress
  const progress = calculateProgress(checklist);

  // Wrapper for updates that syncs local state and notifies parent
  const handleUpdate = useCallback(
    (updates: Partial<PrestartChecklistFull>) => {
      const updated = { ...checklist, ...updates };
      setChecklist(updated);
      onUpdate?.(updated);
    },
    [checklist, onUpdate]
  );

  function toggleSection(section: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function handlePlantDetailsUpdate(details: PlantDetails) {
    handleUpdate({ plantDetails: details });
  }

  function handleChecklistItemsUpdate(
    items: ChecklistItem[],
    defects: ChecklistDefect[]
  ) {
    handleUpdate({
      checklistItems: items,
      defects,
      hasUnclearedCriticalDefects: defects.some(
        (d) => d.severity === "critical" && !d.clearedBeforeOperation
      ),
    });
  }

  function handleDefectsUpdate(defects: ChecklistDefect[]) {
    handleUpdate({
      defects,
      hasUnclearedCriticalDefects: defects.some(
        (d) => d.severity === "critical" && !d.clearedBeforeOperation
      ),
    });
  }

  function handleOperatorDeclarationUpdate(
    declaration: OperatorDeclaration | null
  ) {
    handleUpdate({ operatorDeclaration: declaration });
  }

  function handleSupervisorSignOffUpdate(signOff: SupervisorSignOff | null) {
    handleUpdate({ supervisorSignOff: signOff });
  }

  // Mock photo upload handler (integrate with actual upload function)
  async function handlePhotoUpload(file: File): Promise<string> {
    // This would integrate with your actual photo upload function
    // For now, return a mock path - replace with actual implementation
    return `/uploads/${Date.now()}-${file.name}`;
  }

  return (
    <div className="space-y-1">
      {/* ── Critical Warning Banner ── */}
      {hasUnclearedCriticalDefects && (
        <div className="rounded-2xl bg-red-50 border-2 border-red-300 p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-base font-bold text-red-800">
                ⚠️ Equipment Not Safe for Operation
              </p>
              <p className="text-sm text-red-700 mt-1">
                Critical defects have been identified and not cleared. This
                equipment must not be operated until all critical issues are
                resolved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Progress Bar ── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden px-4 py-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-700">
            Checklist Completion
          </p>
          <p className="text-sm font-medium text-slate-600">{progress}%</p>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor(
              progress
            )} transition-all duration-500 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">{getProgressText(progress)}</p>
      </div>

      {/* ── Plant Details ── */}
      <PlantDetailsSection
        details={checklist.plantDetails}
        isLocked={isLocked}
        isOpen={openSections.has("plantDetails")}
        onToggle={() => toggleSection("plantDetails")}
        onUpdate={handlePlantDetailsUpdate}
        projects={projects}
        sites={sites}
      />

      {/* ── Checklist Items ── */}
      <ChecklistItemsSection
        items={checklist.checklistItems}
        defects={checklist.defects}
        isLocked={isLocked}
        isOpen={openSections.has("checklistItems")}
        onToggle={() => toggleSection("checklistItems")}
        onUpdate={handleChecklistItemsUpdate}
      />

      {/* ── Defects ── */}
      <DefectsSection
        defects={checklist.defects}
        isLocked={isLocked}
        isOpen={openSections.has("defects")}
        onToggle={() => toggleSection("defects")}
        onUpdate={handleDefectsUpdate}
        onPhotoUpload={handlePhotoUpload}
      />

      {/* ── Operator Declaration ── */}
      <OperatorDeclarationSection
        declaration={checklist.operatorDeclaration}
        isLocked={isLocked}
        isOpen={openSections.has("operatorDeclaration")}
        onToggle={() => toggleSection("operatorDeclaration")}
        onUpdate={handleOperatorDeclarationUpdate}
      />

      {/* ── Supervisor Sign-Off ── */}
      <SupervisorSignOffSection
        signOff={checklist.supervisorSignOff}
        isLocked={isLocked}
        isOpen={openSections.has("supervisorSignOff")}
        onToggle={() => toggleSection("supervisorSignOff")}
        onUpdate={handleSupervisorSignOffUpdate}
        canSignOff={canSignOff}
      />

      {/* ── Submit/Complete Panel ── */}
      {!isLocked && (
        <div className="mt-6 space-y-3">
          {/* Warning if not ready to submit */}
          {progress < 100 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Complete all required sections before submitting the
                  checklist.
                </span>
              </div>
            </div>
          )}

          {/* Critical defect warning for submit */}
          {hasUnclearedCriticalDefects && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Cannot submit: Critical defects must be cleared or supervisor
                  must select &quot;Not Cleared&quot; decision.
                </span>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            disabled={progress < 100 || hasUnclearedCriticalDefects}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 text-white text-base font-bold shadow-lg hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Complete Checklist
          </button>

          <p className="text-xs text-center text-slate-500">
            Completing locks the checklist and generates the prestart record.
            Uncleared critical defects prevent completion.
          </p>
        </div>
      )}

      {/* ── Completed indicator ── */}
      {isLocked && (
        <div className="mt-6 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Checklist Completed
        </div>
      )}
    </div>
  );
}
