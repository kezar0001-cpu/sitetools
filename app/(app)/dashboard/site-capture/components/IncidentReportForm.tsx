"use client";

import { useState, useCallback } from "react";
import type { SiteDiaryFull } from "@/lib/site-capture/types";
import type { CompanyRole } from "@/lib/workspace/types";
import { PhotosSection } from "./PhotosSection";
import { DiaryProgress } from "./DiaryProgress";
import { CompleteExportPanel } from "./CompleteExportPanel";
import {
  IncidentDetailsSection,
  type IncidentDetails,
  type IncidentType,
} from "./IncidentDetailsSection";
import {
  PersonsInvolvedSection,
  type PersonInvolved,
} from "./PersonsInvolvedSection";
import {
  WitnessesSection,
  type Witness,
} from "./WitnessesSection";
import {
  ImmediateActionsSection,
  type ImmediateAction,
} from "./ImmediateActionsSection";
import {
  CausalFactorsSection,
  type CausalFactorsData,
} from "./CausalFactorsSection";
import {
  CorrectiveActionsSection,
  type CorrectiveAction,
} from "./CorrectiveActionsSection";
import {
  DeclarationSection,
  type Declaration,
} from "./DeclarationSection";

interface Props {
  diary: SiteDiaryFull;
  onUpdate?: (updated: SiteDiaryFull) => void;
  userRole?: CompanyRole | null;
  userId?: string | null;
  projects?: Array<{ id: string; name: string }>;
  sites?: Array<{ id: string; name: string }>;
}

type Section =
  | "incidentDetails"
  | "personsInvolved"
  | "witnesses"
  | "immediateActions"
  | "causalFactors"
  | "correctiveActions"
  | "photos"
  | "declaration";

const HIGH_SEVERITY_TYPES: IncidentType[] = ["Injury", "Dangerous Occurrence"];

export default function IncidentReportForm({
  diary: initialDiary,
  onUpdate,
  projects = [],
  sites = [],
}: Props) {
  const [diary, setDiary] = useState<SiteDiaryFull>(initialDiary);

  // Initialize form data from diary or defaults
  const [incidentDetails, setIncidentDetails] = useState<IncidentDetails>(() => {
    const formData = (diary as unknown as { form_data?: { incidentDetails?: IncidentDetails } }).form_data;
    return (
      formData?.incidentDetails ?? {
        incidentType: null,
        date: diary.date ?? new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        exactLocation: "",
        projectId: diary.project_id,
        siteId: diary.site_id,
        reportedBy: "",
        description: diary.notes ?? "",
        photosRequired: false,
      }
    );
  });

  const [personsInvolved, setPersonsInvolved] = useState<PersonInvolved[]>(() => {
    const formData = (diary as unknown as { form_data?: { personsInvolved?: PersonInvolved[] } }).form_data;
    return formData?.personsInvolved ?? [];
  });

  const [witnesses, setWitnesses] = useState<Witness[]>(() => {
    const formData = (diary as unknown as { form_data?: { witnesses?: Witness[] } }).form_data;
    return formData?.witnesses ?? [];
  });

  const [immediateActions, setImmediateActions] = useState<ImmediateAction[]>(() => {
    const formData = (diary as unknown as { form_data?: { immediateActions?: ImmediateAction[] } }).form_data;
    return formData?.immediateActions ?? [];
  });

  const [safetyStatus, setSafetyStatus] = useState<{ areaMadeSafe: boolean | null; workStopped: boolean | null }>(
    () => {
      const formData = (diary as unknown as { form_data?: { safetyStatus?: { areaMadeSafe: boolean | null; workStopped: boolean | null } } }).form_data;
      return formData?.safetyStatus ?? { areaMadeSafe: null, workStopped: null };
    }
  );

  const [causalFactors, setCausalFactors] = useState<CausalFactorsData>(() => {
    const formData = (diary as unknown as { form_data?: { causalFactors?: CausalFactorsData } }).form_data;
    return formData?.causalFactors ?? { factors: [], otherDetails: "" };
  });

  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>(() => {
    const formData = (diary as unknown as { form_data?: { correctiveActions?: CorrectiveAction[] } }).form_data;
    return formData?.correctiveActions ?? [];
  });

  const [declaration, setDeclaration] = useState<Declaration>(() => {
    const formData = (diary as unknown as { form_data?: { declaration?: Declaration } }).form_data;
    const today = new Date().toISOString().slice(0, 10);
    return (
      formData?.declaration ?? {
        preparedBy: "",
        preparerSignature: "",
        preparedDate: today,
        reviewedBy: "",
        reviewerSignature: "",
        reviewedDate: today,
      }
    );
  });

  // All sections open by default for incident report
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set([
      "incidentDetails",
      "personsInvolved",
      "witnesses",
      "immediateActions",
      "causalFactors",
      "correctiveActions",
      "photos",
      "declaration",
    ])
  );

  const isLocked = diary.status === "completed" || diary.status === "archived";

  // Check for high-severity incident
  const isHighSeverity = incidentDetails.incidentType && HIGH_SEVERITY_TYPES.includes(incidentDetails.incidentType);

  // Check if declaration is complete
  const isDeclarationComplete =
    declaration.preparedBy &&
    declaration.preparerSignature &&
    declaration.preparedDate &&
    declaration.reviewedBy &&
    declaration.reviewerSignature &&
    declaration.reviewedDate;

  // Wrapper for section updates that syncs local diary state
  const handleSectionUpdate = useCallback(
    (updated: SiteDiaryFull) => {
      setDiary(updated);
      onUpdate?.(updated);
    },
    [onUpdate]
  );

  function toggleSection(section: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  // Persist form data to diary when any section changes
  function persistFormData() {
    const formData = {
      incidentDetails,
      personsInvolved,
      witnesses,
      immediateActions,
      safetyStatus,
      causalFactors,
      correctiveActions,
      declaration,
    };

    const updatedDiary = {
      ...diary,
      notes: incidentDetails.description,
      project_id: incidentDetails.projectId,
      site_id: incidentDetails.siteId,
      form_data: formData,
    } as unknown as SiteDiaryFull;

    setDiary(updatedDiary);
    onUpdate?.(updatedDiary);
  }

  return (
    <div className="space-y-4">
      {/* ── Progress Bar ── */}
      <DiaryProgress diary={diary} />

      {/* ── High Severity Warning Banner ── */}
      {isHighSeverity && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-red-900">High-Severity Incident</h3>
              <p className="text-sm text-red-800 mt-1">
                This incident may require regulator notification — generate a formal Incident Notification via SiteDocs.
              </p>
              <button
                type="button"
                onClick={() => {
                  // Navigate to SiteDocs or trigger notification generation
                  window.open("/dashboard/site-docs?template=incident-notification", "_blank");
                }}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Incident Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Incident Details ── */}
      <IncidentDetailsSection
        diary={diary}
        details={incidentDetails}
        onUpdate={(details) => {
          setIncidentDetails(details);
          // Auto-persist on change
          setTimeout(persistFormData, 0);
        }}
        isLocked={isLocked}
        isOpen={openSections.has("incidentDetails")}
        onToggle={() => toggleSection("incidentDetails")}
        projects={projects}
        sites={sites}
      />

      {/* ── Persons Involved ── */}
      <PersonsInvolvedSection
        persons={personsInvolved}
        onUpdate={(persons) => {
          setPersonsInvolved(persons);
          setTimeout(persistFormData, 0);
        }}
        isLocked={isLocked}
        isOpen={openSections.has("personsInvolved")}
        onToggle={() => toggleSection("personsInvolved")}
      />

      {/* ── Witnesses ── */}
      <WitnessesSection
        witnesses={witnesses}
        onUpdate={(witnesses) => {
          setWitnesses(witnesses);
          setTimeout(persistFormData, 0);
        }}
        isLocked={isLocked}
        isOpen={openSections.has("witnesses")}
        onToggle={() => toggleSection("witnesses")}
      />

      {/* ── Immediate Actions ── */}
      <ImmediateActionsSection
        actions={immediateActions}
        onUpdate={(actions) => {
          setImmediateActions(actions);
          setTimeout(persistFormData, 0);
        }}
        areaMadeSafe={safetyStatus.areaMadeSafe}
        workStopped={safetyStatus.workStopped}
        onSafetyUpdate={(updates) => {
          setSafetyStatus((prev) => ({ ...prev, ...updates }));
          setTimeout(persistFormData, 0);
        }}
        isLocked={isLocked}
        isOpen={openSections.has("immediateActions")}
        onToggle={() => toggleSection("immediateActions")}
      />

      {/* ── Causal Factors ── */}
      <CausalFactorsSection
        data={causalFactors}
        onUpdate={(data) => {
          setCausalFactors(data);
          setTimeout(persistFormData, 0);
        }}
        isLocked={isLocked}
        isOpen={openSections.has("causalFactors")}
        onToggle={() => toggleSection("causalFactors")}
      />

      {/* ── Corrective Actions ── */}
      <CorrectiveActionsSection
        actions={correctiveActions}
        onUpdate={(actions) => {
          setCorrectiveActions(actions);
          setTimeout(persistFormData, 0);
        }}
        isLocked={isLocked}
        isOpen={openSections.has("correctiveActions")}
        onToggle={() => toggleSection("correctiveActions")}
      />

      {/* ── Photos ── */}
      <PhotosSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("photos")}
        onToggle={() => toggleSection("photos")}
        onUpdate={handleSectionUpdate}
      />

      {/* ── Declaration ── */}
      <DeclarationSection
        declaration={declaration}
        onUpdate={(decl) => {
          setDeclaration(decl);
          setTimeout(persistFormData, 0);
        }}
        isLocked={isLocked}
        isOpen={openSections.has("declaration")}
        onToggle={() => toggleSection("declaration")}
        isComplete={isDeclarationComplete}
      />

      {/* ── Complete & Export Panel ── */}
      <CompleteExportPanel diary={diary} onUpdate={handleSectionUpdate} />
    </div>
  );
}
