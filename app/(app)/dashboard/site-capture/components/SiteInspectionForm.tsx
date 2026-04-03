"use client";

import { useState, useCallback, useMemo } from "react";
import type { SiteDiaryFull, SiteInspectionFull, InspectionDetails, InspectionItem, InspectionItemResult, InspectionDefect, InspectionObservation, InspectionOutcomeData, InspectionSignOff } from "@/lib/site-capture/types";
import type { CompanyRole } from "@/lib/workspace/types";
import { InspectionDetailsSection } from "./InspectionDetailsSection";
import { InspectionItemsSection } from "./InspectionItemsSection";
import { DefectsFoundSection } from "./DefectsFoundSection";
import { ObservationsSection } from "./ObservationsSection";
import { OutcomeSection } from "./OutcomeSection";
import { SiteInspectionSignOffSection } from "./SiteInspectionSignOffSection";
import { DiaryProgress } from "./DiaryProgress";

interface SiteInspectionFormProps {
  diary: SiteDiaryFull;
  onUpdate?: (updated: SiteDiaryFull) => void;
  onSubmit?: () => Promise<void>;
  userRole?: CompanyRole | null;
  userId?: string | null;
}

type Section = "inspectionDetails" | "inspectionItems" | "defects" | "observations" | "outcome" | "signOff";
type SiteInspectionDiary = SiteDiaryFull & {
  site_inspection_data?: InspectionDetails | null;
  inspection_items?: SiteInspectionFull["items"];
  inspection_defects?: SiteInspectionFull["defects"];
  inspection_observations?: SiteInspectionFull["observations"];
  inspection_outcome?: InspectionOutcomeData | null;
  inspection_sign_off?: InspectionSignOff | null;
};

export default function SiteInspectionForm({ 
  diary: initialDiary, 
  onUpdate, 
  onSubmit,
}: SiteInspectionFormProps) {
  const [diary, setDiary] = useState<SiteInspectionDiary>(initialDiary as SiteInspectionDiary);
  
  // All sections open by default for inspection form
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set<Section>(["inspectionDetails", "inspectionItems", "defects", "observations", "outcome", "signOff"])
  );
  
  const [submitting, setSubmitting] = useState(false);

  // Derived state
  const isLocked = diary.status === "completed" || diary.status === "archived";
  
  // Get inspection data from the diary
  const inspectionData = diary.site_inspection_data;
  const inspectionItems = useMemo(() => diary.inspection_items ?? [], [diary.inspection_items]);
  const defects = useMemo(() => diary.inspection_defects ?? [], [diary.inspection_defects]);
  const observations = useMemo(() => diary.inspection_observations ?? [], [diary.inspection_observations]);
  const outcome = diary.inspection_outcome || null;
  const signOff = diary.inspection_sign_off || null;

  // Calculate fail count for outcome section
  const failCount = useMemo(() => 
    inspectionItems.filter(item => item.result === "Fail").length,
    [inspectionItems]
  );

  function toggleSection(section: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  // Handle inspection items changes with auto-population
  const handleItemsChange = useCallback((items: InspectionItem[]) => {
    const updatedDiary = { ...diary, inspection_items: items };
    
    // Auto-populate defects from Fail items
    const newDefectsFromFails = items
      .filter(item => item.result === "Fail" && !defects.some(d => d.inspection_item_id === item.id))
      .map(item => ({
        id: `temp-defect-${item.id}`,
        diary_id: diary.id,
        inspection_item_id: item.id,
        description: `Failed: ${item.description}`,
        location: null,
        severity: "minor" as const,
        photo_paths: item.photo_paths || [],
        rectification_required: null,
        assigned_to: null,
        due_date: null,
        status: "open" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
        completed_by: null,
      }));
    
    // Auto-populate observations from Observation items  
    const newObservationsFromItems = items
      .filter(item => item.result === "Observation" && !observations.some(o => o.inspection_item_id === item.id))
      .map(item => ({
        id: `temp-obs-${item.id}`,
        diary_id: diary.id,
        inspection_item_id: item.id,
        description: item.description,
        reference: item.reference,
        priority: "medium" as const,
        action_required: null,
        assigned_to: null,
        due_date: null,
        status: "open" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
        completed_by: null,
      }));

    if (newDefectsFromFails.length > 0) {
      updatedDiary.inspection_defects = [...defects, ...newDefectsFromFails];
    }
    if (newObservationsFromItems.length > 0) {
      updatedDiary.inspection_observations = [...observations, ...newObservationsFromItems];
    }
    
    setDiary(updatedDiary);
    onUpdate?.(updatedDiary);
  }, [diary, defects, observations, onUpdate]);

  // Handle result change on individual item
  const handleItemResultChange = useCallback((itemId: string, result: InspectionItemResult) => {
    // This is called when a result changes - defects/observations are handled in handleItemsChange
    // But we might want to auto-update outcome based on failures
    if (result === "Fail" && outcome?.outcome === "Approved") {
      const updatedOutcome: InspectionOutcomeData = {
        ...outcome,
        outcome: "Re-inspection Required",
      };
      setDiary(prev => ({ ...prev, inspection_outcome: updatedOutcome }));
    }
  }, [outcome]);

  // Handle defects changes
  const handleDefectsChange = useCallback((newDefects: InspectionDefect[]) => {
    const updatedDiary = { ...diary, inspection_defects: newDefects };
    setDiary(updatedDiary);
    onUpdate?.(updatedDiary);
  }, [diary, onUpdate]);

  // Handle observations changes
  const handleObservationsChange = useCallback((newObservations: InspectionObservation[]) => {
    const updatedDiary = { ...diary, inspection_observations: newObservations };
    setDiary(updatedDiary);
    onUpdate?.(updatedDiary);
  }, [diary, onUpdate]);

  // Handle outcome changes
  const handleOutcomeChange = useCallback((newOutcome: InspectionOutcomeData) => {
    const updatedDiary = { ...diary, inspection_outcome: newOutcome };
    setDiary(updatedDiary);
    onUpdate?.(updatedDiary);
  }, [diary, onUpdate]);

  // Handle sign-off changes
  const handleSignOffChange = useCallback((newSignOff: InspectionSignOff) => {
    const updatedDiary = { ...diary, inspection_sign_off: newSignOff };
    setDiary(updatedDiary);
    onUpdate?.(updatedDiary);
  }, [diary, onUpdate]);

  // Check if form is ready for submission
  const canSubmit = useMemo(() => {
    return !!(
      inspectionData?.inspection_type &&
      inspectionItems.length > 0 &&
      outcome?.outcome &&
      signOff?.inspector_signature &&
      signOff?.sign_off_date
    );
  }, [inspectionData, inspectionItems.length, outcome, signOff]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    
    setSubmitting(true);
    try {
      await onSubmit?.();
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, submitting, onSubmit]);

  return (
    <div className="space-y-1">
      {/* ── Progress Bar ── */}
      <DiaryProgress diary={diary as SiteDiaryFull} />

      {/* ── Inspection Details ── */}
      <InspectionDetailsSection
        diary={diary as SiteDiaryFull}
        isLocked={isLocked}
        isOpen={openSections.has("inspectionDetails")}
        onToggle={() => toggleSection("inspectionDetails")}
        onUpdate={() => {}}
        projects={[]}
        sites={[]}
        details={inspectionData ?? undefined}
        onDetailsChange={(details) => {
          const updatedDiary = { ...diary, site_inspection_data: details };
          setDiary(updatedDiary);
          onUpdate?.(updatedDiary);
        }}
      />

      {/* ── Inspection Items / Checklist ── */}
      <InspectionItemsSection
        diary={diary as SiteDiaryFull}
        isLocked={isLocked}
        isOpen={openSections.has("inspectionItems")}
        onToggle={() => toggleSection("inspectionItems")}
        items={inspectionItems}
        inspectionType={inspectionData?.inspection_type || "Routine"}
        onItemsChange={handleItemsChange}
        onResultChange={handleItemResultChange}
      />

      {/* ── Defects Found ── */}
      <DefectsFoundSection
        diary={diary as SiteDiaryFull}
        isLocked={isLocked}
        isOpen={openSections.has("defects")}
        onToggle={() => toggleSection("defects")}
        defects={defects}
        onDefectsChange={handleDefectsChange}
      />

      {/* ── Observations ── */}
      <ObservationsSection
        diary={diary as SiteDiaryFull}
        isLocked={isLocked}
        isOpen={openSections.has("observations")}
        onToggle={() => toggleSection("observations")}
        observations={observations}
        onObservationsChange={handleObservationsChange}
      />

      {/* ── Outcome ── */}
      <OutcomeSection
        diary={diary as SiteDiaryFull}
        isLocked={isLocked}
        isOpen={openSections.has("outcome")}
        onToggle={() => toggleSection("outcome")}
        outcome={outcome}
        onOutcomeChange={handleOutcomeChange}
        failCount={failCount}
      />

      {/* ── Sign Off ── */}
      <SiteInspectionSignOffSection
        diary={diary as SiteDiaryFull}
        isLocked={isLocked}
        isOpen={openSections.has("signOff")}
        onToggle={() => toggleSection("signOff")}
        signOff={signOff}
        onSignOffChange={handleSignOffChange}
      />

      {/* ── Submit Panel ── */}
      {!isLocked && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-800">Submit Inspection</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {canSubmit 
                    ? "All required fields are complete. Ready to submit." 
                    : "Complete all required sections before submitting."}
                </p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Inspection
                  </>
                )}
              </button>
            </div>

            {/* Missing requirements */}
            {!canSubmit && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-2">Required before submission:</p>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  {!inspectionData?.inspection_type && <li>Select an inspection type</li>}
                  {inspectionItems.length === 0 && <li>Add at least one inspection item</li>}
                  {!outcome?.outcome && <li>Set the inspection outcome</li>}
                  {!signOff?.inspector_signature && <li>Add inspector signature</li>}
                  {!signOff?.sign_off_date && <li>Set inspection date</li>}
                </ul>
              </div>
            )}

            {/* Follow-up warning */}
            {outcome?.outcome === "Not Approved" || outcome?.outcome === "Re-inspection Required" ? (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Note:</span> A follow-up inspection record will be automatically created 
                  in <strong>draft</strong> status after submission.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
