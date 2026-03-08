export interface PublicMediaAsset {
  key: string;
  type: "image" | "video";
  src: string;
  poster?: string;
  alt: string;
  width: number;
  height: number;
  sources: {
    label: string;
    license: string;
    url?: string;
  }[];
}

export const PUBLIC_MEDIA: Record<string, PublicMediaAsset> = {
  siteSignHero: {
    key: "site-sign-hero",
    type: "image",
    src: "/branding/site-sign-hero-field.svg",
    alt: "Civil site supervisor reviewing live SiteSign attendance on a tablet beside a QR check-in board.",
    width: 1400,
    height: 900,
    sources: [{ label: "Buildstate local production slot", license: "Internal artwork slot (replaceable with licensed stock)" }],
  },
  sitePlanWorkflow: {
    key: "site-plan-workflow",
    type: "image",
    src: "/branding/site-plan-workflow.svg",
    alt: "Project engineer coordinating programme updates with plans and task sequencing on site.",
    width: 1200,
    height: 800,
    sources: [{ label: "Buildstate local production slot", license: "Internal artwork slot (replaceable with licensed stock)" }],
  },
  workspaceApps: {
    key: "workspace-apps",
    type: "image",
    src: "/branding/workspace-apps-coordination.svg",
    alt: "Civil delivery team linking field checks, planning, and progress records across workspace apps.",
    width: 1200,
    height: 800,
    sources: [{ label: "Buildstate local production slot", license: "Internal artwork slot (replaceable with licensed stock)" }],
  },
  operationsLoop: {
    key: "operations-loop",
    type: "video",
    src: "/branding/site-operations-loop.mp4",
    poster: "/branding/video-poster.svg",
    alt: "Looped support media showing civil coordination workflow from field check to planning update.",
    width: 1280,
    height: 720,
    sources: [{ label: "Buildstate local production slot", license: "Video slot reserved for approved licensed footage" }],
  },
};
