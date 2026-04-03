"use client";

import { useState, useCallback } from "react";
import type { SiteDiaryFull } from "@/lib/site-capture/types";
import type { CompanyRole } from "@/lib/workspace/types";
import {
  SiteInductionData,
  parseInductionData,
} from "@/lib/site-capture/induction-types";
import { WorkerDetailsSection } from "./induction/WorkerDetailsSection";
import { HazardAcknowledgementSection } from "./induction/HazardAcknowledgementSection";
import { SiteRulesSection } from "./induction/SiteRulesSection";
import { EmergencyProceduresSection } from "./induction/EmergencyProceduresSection";
import { DeclarationSection } from "./induction/DeclarationSection";
import { PhotosSection } from "./PhotosSection";
import { CompleteExportPanel } from "./CompleteExportPanel";

interface Props {
  diary: SiteDiaryFull;
  onUpdate?: (updated: SiteDiaryFull) => void;
  userRole?: CompanyRole | null;
  userId?: string | null;
}

type Section =
  | "workerDetails"
  | "hazardAcknowledgement"
  | "siteRules"
  | "emergencyProcedures"
  | "declaration"
  | "photos";

export default function InductionEntryForm({ diary: initialDiary, onUpdate }: Props) {
  const [diary, setDiary] = useState<SiteDiaryFull>(initialDiary);
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(["workerDetails", "hazardAcknowledgement", "siteRules", "emergencyProcedures", "declaration"])
  );
  const [saving] = useState<Record<string, boolean>>({});

  // Parse induction data from diary.form_data or use defaults
  const inductionData = parseInductionData(
    (diary as SiteDiaryFull & { induction_data?: unknown }).induction_data ?? null
  );

  const isLocked = diary.status === "completed" || diary.status === "archived";
  const completionPercentage = calculateCompletionPercentage(inductionData);

  const handleSectionUpdate = useCallback(
    (updatedInductionData: SiteInductionData) => {
      const updatedDiary = {
        ...diary,
        induction_data: updatedInductionData,
      } as SiteDiaryFull & { induction_data: SiteInductionData };
      setDiary(updatedDiary);
      onUpdate?.(updatedDiary);
    },
    [diary, onUpdate]
  );

  function toggleSection(section: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  return (
    <div className="space-y-1">
      {/* ── Progress Bar ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium text-slate-600">Induction Completion</span>
          <span className={`font-semibold ${completionPercentage === 100 ? "text-emerald-600" : "text-violet-600"}`}>
            {completionPercentage}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completionPercentage === 100 ? "bg-emerald-500" : "bg-violet-500"
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* ── Worker Details ── */}
      <WorkerDetailsSection
        workerDetails={inductionData.workerDetails}
        isLocked={isLocked}
        isOpen={openSections.has("workerDetails")}
        onToggle={() => toggleSection("workerDetails")}
        onUpdate={(workerDetails) =>
          handleSectionUpdate({ ...inductionData, workerDetails })
        }
        saving={saving}
      />

      {/* ── Hazard Acknowledgement ── */}
      <HazardAcknowledgementSection
        hazards={inductionData.hazards}
        isLocked={isLocked}
        isOpen={openSections.has("hazardAcknowledgement")}
        onToggle={() => toggleSection("hazardAcknowledgement")}
        onUpdate={(hazards) => handleSectionUpdate({ ...inductionData, hazards })}
      />

      {/* ── Site Rules ── */}
      <SiteRulesSection
        siteRules={inductionData.siteRules}
        isLocked={isLocked}
        isOpen={openSections.has("siteRules")}
        onToggle={() => toggleSection("siteRules")}
        onUpdate={(siteRules) => handleSectionUpdate({ ...inductionData, siteRules })}
      />

      {/* ── Emergency Procedures ── */}
      <EmergencyProceduresSection
        emergencyProcedures={inductionData.emergencyProcedures}
        isLocked={isLocked}
        isOpen={openSections.has("emergencyProcedures")}
        onToggle={() => toggleSection("emergencyProcedures")}
        onUpdate={(emergencyProcedures) =>
          handleSectionUpdate({ ...inductionData, emergencyProcedures })
        }
      />

      {/* ── Declaration & Sign-off ── */}
      <DeclarationSection
        signature={inductionData.signature}
        declarationConfirmed={inductionData.declaration.confirmed}
        declarationConfirmedAt={inductionData.declaration.confirmedAt}
        isLocked={isLocked}
        isOpen={openSections.has("declaration")}
        onToggle={() => toggleSection("declaration")}
        onUpdateSignature={(signature) =>
          handleSectionUpdate({ ...inductionData, signature })
        }
        onUpdateDeclaration={(confirmed) =>
          handleSectionUpdate({
            ...inductionData,
            declaration: {
              confirmed,
              confirmedAt: confirmed ? new Date().toISOString() : null,
            },
          })
        }
      />

      {/* ── Photos (Optional) ── */}
      <PhotosSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("photos")}
        onToggle={() => toggleSection("photos")}
        onUpdate={setDiary}
      />

      {/* ── Complete & Export Panel ── */}
      <CompleteExportPanel
        diary={diary}
        onUpdate={(updated) => setDiary(updated)}
      />
    </div>
  );
}

function calculateCompletionPercentage(data: SiteInductionData): number {
  let total = 0;
  let completed = 0;

  // Worker Details (4 required fields)
  total += 4;
  if (data.workerDetails.fullName.trim()) completed++;
  if (data.workerDetails.company.trim()) completed++;
  if (data.workerDetails.trade.trim()) completed++;
  if (data.workerDetails.mobileNumber.trim()) completed++;

  // Hazards
  total += data.hazards.length;
  completed += data.hazards.filter((h) => h.acknowledged).length;

  // Site Rules
  total += data.siteRules.length;
  completed += data.siteRules.filter((r) => r.acknowledged).length;

  // Emergency Procedures (2 required fields)
  total += 2;
  if (data.emergencyProcedures.siteAddress.trim()) completed++;
  if (data.emergencyProcedures.nearestHospital.trim()) completed++;

  // Declaration
  total += 1;
  if (data.declaration.confirmed) completed++;

  // Worker Signature
  total += 1;
  if (data.signature.workerSignatureData) completed++;

  // Officer Signature
  total += 1;
  if (data.signature.officerSignatureData) completed++;

  return Math.round((completed / total) * 100);
}
