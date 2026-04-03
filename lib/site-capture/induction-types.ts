// Site Induction Types Extension
// This extends the site-capture types with induction-specific data structures

import type { SiteDiaryFull, SiteDiary } from "./types";

// ── Site Induction Data ──

export interface WorkerDetails {
  fullName: string;
  company: string;
  trade: string;
  mobileNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  photoIdUrl: string | null;
  photoIdPath: string | null;
}

export interface HazardItem {
  id: string;
  name: string;
  description: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface SiteRuleItem {
  id: string;
  category: "ppe" | "zone" | "procedure" | "policy";
  name: string;
  description: string;
  acknowledged: boolean;
}

export interface EmergencyProcedures {
  siteAddress: string;
  nearestHospital: string;
  nearestHospitalAddress: string;
  nearestHospitalPhone: string;
  musterPoint: string;
  firstAidOfficerName: string;
  firstAidOfficerContact: string;
  emergencyContactNumber: string;
}

export interface InductionSignature {
  workerSignatureData: string | null;
  workerSignedAt: string | null;
  inductionOfficerName: string;
  officerSignatureData: string | null;
  officerSignedAt: string | null;
}

export interface SiteInductionData {
  workerDetails: WorkerDetails;
  hazards: HazardItem[];
  siteRules: SiteRuleItem[];
  emergencyProcedures: EmergencyProcedures;
  declaration: {
    confirmed: boolean;
    confirmedAt: string | null;
  };
  signature: InductionSignature;
}

// ── Default Values ──

export const DEFAULT_WORKER_DETAILS: WorkerDetails = {
  fullName: "",
  company: "",
  trade: "",
  mobileNumber: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  photoIdUrl: null,
  photoIdPath: null,
};

export const DEFAULT_HAZARDS: HazardItem[] = [
  {
    id: "overhead-power",
    name: "Overhead Power Lines",
    description: "Risk of electrocution from overhead power lines. Maintain safe approach distances.",
    acknowledged: false,
    acknowledgedAt: null,
  },
  {
    id: "underground-services",
    name: "Underground Services",
    description: "Risk of striking underground electrical cables, gas pipes, or water mains. Check before digging.",
    acknowledged: false,
    acknowledgedAt: null,
  },
  {
    id: "mobile-plant",
    name: "Mobile Plant",
    description: "Risk of collision with or being struck by mobile plant and equipment. Stay alert in traffic management zones.",
    acknowledged: false,
    acknowledgedAt: null,
  },
  {
    id: "confined-spaces",
    name: "Confined Spaces",
    description: "Restricted entry areas with potential atmospheric hazards. Entry by permit only.",
    acknowledged: false,
    acknowledgedAt: null,
  },
  {
    id: "working-heights",
    name: "Working at Heights",
    description: "Risk of falls from heights. Use appropriate fall protection and edge protection.",
    acknowledged: false,
    acknowledgedAt: null,
  },
  {
    id: "hazardous-materials",
    name: "Hazardous Materials",
    description: "Exposure to asbestos, chemicals, or other hazardous substances. Follow SDS and PPE requirements.",
    acknowledged: false,
    acknowledgedAt: null,
  },
  {
    id: "traffic-management",
    name: "Traffic Management",
    description: "Risk from vehicle movements. Follow designated pedestrian routes and signage.",
    acknowledged: false,
    acknowledgedAt: null,
  },
];

export const DEFAULT_SITE_RULES: SiteRuleItem[] = [
  // PPE Requirements
  { id: "ppe-hard-hat", category: "ppe", name: "Hard Hat", description: "Must be worn at all times on site", acknowledged: false },
  { id: "ppe-hivis", category: "ppe", name: "Hi-Vis Vest/Shirt", description: "Minimum Class D high-visibility clothing required", acknowledged: false },
  { id: "ppe-safety-boots", category: "ppe", name: "Safety Boots", description: "Steel cap or composite toe boots mandatory", acknowledged: false },
  { id: "ppe-gloves", category: "ppe", name: "Safety Gloves", description: "Task-appropriate gloves for handling materials", acknowledged: false },
  { id: "ppe-glasses", category: "ppe", name: "Safety Glasses", description: "Eye protection required in designated areas", acknowledged: false },
  // No-Go Zones
  { id: "zone-excavations", category: "zone", name: "Excavations", description: "Unauthorised personnel must not enter excavations", acknowledged: false },
  { id: "zone-crane-swing", category: "zone", name: "Crane Swing Areas", description: "Keep clear of crane operating radii", acknowledged: false },
  // Procedures
  { id: "proc-signin", category: "procedure", name: "Sign In/Out", description: "All workers must sign in at entry and sign out when leaving", acknowledged: false },
  { id: "proc-visitor", category: "procedure", name: "Visitor Escort", description: "Visitors must be escorted at all times", acknowledged: false },
  { id: "proc-incident", category: "procedure", name: "Incident Reporting", description: "All incidents and near misses must be reported immediately", acknowledged: false },
  // Policies
  { id: "policy-alcohol", category: "policy", name: "Alcohol & Drugs", description: "Zero tolerance - no alcohol or drugs permitted on site", acknowledged: false },
  { id: "policy-phone", category: "policy", name: "Phone Use", description: "Mobile phone use prohibited while operating plant or in hazardous areas", acknowledged: false },
  { id: "policy-speed", category: "policy", name: "Site Speed Limit", description: "Maximum 20km/h or as signed within site boundaries", acknowledged: false },
];

export const DEFAULT_EMERGENCY_PROCEDURES: EmergencyProcedures = {
  siteAddress: "",
  nearestHospital: "",
  nearestHospitalAddress: "",
  nearestHospitalPhone: "",
  musterPoint: "",
  firstAidOfficerName: "",
  firstAidOfficerContact: "",
  emergencyContactNumber: "000", // Default to emergency services
};

export const DEFAULT_INDUCTION_DATA: SiteInductionData = {
  workerDetails: DEFAULT_WORKER_DETAILS,
  hazards: DEFAULT_HAZARDS,
  siteRules: DEFAULT_SITE_RULES,
  emergencyProcedures: DEFAULT_EMERGENCY_PROCEDURES,
  declaration: {
    confirmed: false,
    confirmedAt: null,
  },
  signature: {
    workerSignatureData: null,
    workerSignedAt: null,
    inductionOfficerName: "",
    officerSignatureData: null,
    officerSignedAt: null,
  },
};

// ── Site Induction with Full Data ──

export interface SiteInductionFull extends SiteDiaryFull {
  inductionData: SiteInductionData;
}

// ── Helper functions ──

export function getHazardProgress(hazards: HazardItem[]): { total: number; acknowledged: number } {
  return {
    total: hazards.length,
    acknowledged: hazards.filter((h) => h.acknowledged).length,
  };
}

export function getSiteRulesProgress(rules: SiteRuleItem[]): { total: number; acknowledged: number } {
  return {
    total: rules.length,
    acknowledged: rules.filter((r) => r.acknowledged).length,
  };
}

export function isInductionComplete(data: SiteInductionData): boolean {
  const hasWorkerDetails = 
    data.workerDetails.fullName.trim() !== "" &&
    data.workerDetails.company.trim() !== "" &&
    data.workerDetails.trade.trim() !== "";
  
  const allHazardsAcknowledged = data.hazards.every((h) => h.acknowledged);
  const allRulesAcknowledged = data.siteRules.every((r) => r.acknowledged);
  const declarationConfirmed = data.declaration.confirmed;
  const hasWorkerSignature = !!data.signature.workerSignatureData;
  const hasOfficerSignature = !!data.signature.officerSignatureData;
  
  return (
    hasWorkerDetails &&
    allHazardsAcknowledged &&
    allRulesAcknowledged &&
    declarationConfirmed &&
    hasWorkerSignature &&
    hasOfficerSignature
  );
}

export function parseInductionData(json: unknown): SiteInductionData {
  if (!json || typeof json !== "object") {
    return DEFAULT_INDUCTION_DATA;
  }
  
  const data = json as Record<string, unknown>;
  
  return {
    workerDetails: {
      ...DEFAULT_WORKER_DETAILS,
      ...(data.workerDetails as Record<string, unknown> || {}),
    },
    hazards: Array.isArray(data.hazards) 
      ? data.hazards.map((h, i) => ({ ...DEFAULT_HAZARDS[i], ...(h as Record<string, unknown>) }))
      : DEFAULT_HAZARDS,
    siteRules: Array.isArray(data.siteRules)
      ? data.siteRules.map((r, i) => ({ ...DEFAULT_SITE_RULES[i], ...(r as Record<string, unknown>) }))
      : DEFAULT_SITE_RULES,
    emergencyProcedures: {
      ...DEFAULT_EMERGENCY_PROCEDURES,
      ...(data.emergencyProcedures as Record<string, unknown> || {}),
    },
    declaration: {
      confirmed: (data.declaration as Record<string, unknown>)?.confirmed === true,
      confirmedAt: (data.declaration as Record<string, unknown>)?.confirmedAt as string || null,
    },
    signature: {
      workerSignatureData: (data.signature as Record<string, unknown>)?.workerSignatureData as string || null,
      workerSignedAt: (data.signature as Record<string, unknown>)?.workerSignedAt as string || null,
      inductionOfficerName: (data.signature as Record<string, unknown>)?.inductionOfficerName as string || "",
      officerSignatureData: (data.signature as Record<string, unknown>)?.officerSignatureData as string || null,
      officerSignedAt: (data.signature as Record<string, unknown>)?.officerSignedAt as string || null,
    },
  };
}
