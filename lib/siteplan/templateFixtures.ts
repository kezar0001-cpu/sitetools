import type { HierarchicalTask } from "@/hooks/useSitePlanTasks";

export type TemplateId = "residential_build" | "commercial_fitout" | "blank";

export interface SitePlanTemplate {
  id: TemplateId;
  label: string;
  description: string;
  /** Emoji or short string for visual identity */
  emoji: string;
  phaseCount: number;
  taskCount: number;
  /** Returns tasks relative to the given start date */
  buildTasks: (start: Date) => HierarchicalTask[];
}

// ─── Date helpers ────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Builder helpers ─────────────────────────────────────────

type TasksBuilder = {
  tasks: HierarchicalTask[];
  phase: (name: string, startDay: number, endDay: number) => number;
  task: (
    parentIdx: number,
    name: string,
    startDay: number,
    endDay: number,
    responsible?: string,
  ) => void;
  milestone: (parentIdx: number, name: string, day: number) => void;
};

function makeBuilder(start: Date): TasksBuilder {
  const tasks: HierarchicalTask[] = [];
  let idx = 0;

  const d = (offset: number) => isoDate(addDays(start, offset));

  const phase = (name: string, startDay: number, endDay: number): number => {
    const i = idx++;
    tasks.push({
      _tempIndex: i,
      _parentIndex: -1,
      name,
      type: "phase",
      start_date: d(startDay),
      end_date: d(endDay),
      sort_order: i,
    });
    return i;
  };

  const task = (
    parentIdx: number,
    name: string,
    startDay: number,
    endDay: number,
    responsible?: string,
  ): void => {
    const i = idx++;
    tasks.push({
      _tempIndex: i,
      _parentIndex: parentIdx,
      name,
      type: "task",
      start_date: d(startDay),
      end_date: d(endDay),
      responsible: responsible ?? undefined,
      sort_order: i,
    });
  };

  const milestone = (parentIdx: number, name: string, day: number): void => {
    const i = idx++;
    tasks.push({
      _tempIndex: i,
      _parentIndex: parentIdx,
      name,
      type: "milestone",
      start_date: d(day),
      end_date: d(day),
      sort_order: i,
    });
  };

  return { tasks, phase, task, milestone };
}

// ─── Residential Build ───────────────────────────────────────
// ~26-week new residential construction programme

function buildResidentialTasks(start: Date): HierarchicalTask[] {
  const { tasks, phase, task, milestone } = makeBuilder(start);

  const p1 = phase("Site Preparation", 0, 13);
  task(p1, "Site clearing and survey", 0, 6, "Earthworks");
  task(p1, "Temporary site facilities", 7, 13, "Site Manager");

  const p2 = phase("Foundations", 14, 34);
  task(p2, "Excavation and footings", 14, 20, "Earthworks");
  task(p2, "Reinforcement and formwork", 21, 27, "Concretor");
  task(p2, "Slab pour and cure", 28, 34, "Concretor");

  const p3 = phase("Frame", 35, 69);
  task(p3, "Wall framing", 35, 48, "Framer");
  task(p3, "Roof trusses", 49, 55, "Framer");
  task(p3, "Roof sheeting", 56, 69, "Roofer");

  const p4 = phase("Lock-up", 70, 111);
  task(p4, "External cladding / brickwork", 70, 97, "Bricklayer");
  task(p4, "Windows and exterior doors", 84, 97, "Glazier");
  task(p4, "Garage door installation", 98, 111, "Carpenter");

  const p5 = phase("Fit-out", 112, 167);
  task(p5, "Internal linings and plasterboard", 112, 125, "Plasterer");
  task(p5, "Services rough-in (MEP)", 126, 139, "Services");
  task(p5, "Joinery and cabinetry", 140, 153, "Carpenter");
  task(p5, "Painting", 154, 167, "Painter");

  const p6 = phase("Completion", 168, 181);
  task(p6, "Flooring and finishes", 168, 174, "Flooring");
  task(p6, "Landscaping", 175, 181, "Landscaper");
  milestone(p6, "Handover", 181);

  return tasks;
}

// ─── Commercial Fitout ───────────────────────────────────────
// ~16-week commercial interior fitout programme

function buildCommercialTasks(start: Date): HierarchicalTask[] {
  const { tasks, phase, task, milestone } = makeBuilder(start);

  const p1 = phase("Demolition & Make Good", 0, 13);
  task(p1, "Strip existing fitout", 0, 6, "Demolition");
  task(p1, "Make good to base building", 7, 13, "Builder");

  const p2 = phase("Services Rough-in", 14, 41);
  task(p2, "Mechanical / HVAC rough-in", 14, 27, "Mechanical");
  task(p2, "Electrical rough-in", 14, 27, "Electrician");
  task(p2, "Data and communications", 28, 41, "Data / Comms");

  const p3 = phase("Partitions & Ceilings", 28, 55);
  task(p3, "Stud partitions", 28, 41, "Carpenter");
  task(p3, "Suspended ceiling grid", 42, 55, "Ceiling Contractor");

  const p4 = phase("Finishes", 56, 83);
  task(p4, "Floor covering installation", 56, 69, "Flooring");
  task(p4, "Painting", 63, 76, "Painter");
  task(p4, "Joinery installation", 70, 83, "Carpenter");

  const p5 = phase("Services Final Fix", 84, 97);
  task(p5, "Lighting final fix", 84, 90, "Electrician");
  task(p5, "HVAC commissioning", 84, 90, "Mechanical");
  task(p5, "AV / IT installation", 91, 97, "AV / IT");

  const p6 = phase("Practical Completion", 98, 111);
  task(p6, "Defects inspection", 98, 104, "Site Manager");
  task(p6, "Defects rectification", 105, 111, "Builder");
  milestone(p6, "PC achieved", 111);

  return tasks;
}

// ─── Blank Schedule ──────────────────────────────────────────
// Minimal scaffold — one phase, one task to get started

function buildBlankTasks(start: Date): HierarchicalTask[] {
  const { tasks, phase, task } = makeBuilder(start);

  const p1 = phase("Phase 1", 0, 27);
  task(p1, "First task", 0, 13);

  return tasks;
}

// ─── Template registry ───────────────────────────────────────

export const SITEPLAN_TEMPLATES: SitePlanTemplate[] = [
  {
    id: "residential_build",
    label: "Residential Build",
    description: "New home construction from site prep to handover",
    emoji: "🏠",
    phaseCount: 6,
    taskCount: 15,
    buildTasks: buildResidentialTasks,
  },
  {
    id: "commercial_fitout",
    label: "Commercial Fitout",
    description: "Interior fitout from demo to practical completion",
    emoji: "🏢",
    phaseCount: 6,
    taskCount: 14,
    buildTasks: buildCommercialTasks,
  },
  {
    id: "blank",
    label: "Blank Schedule",
    description: "Start from scratch with an empty programme",
    emoji: "📋",
    phaseCount: 1,
    taskCount: 1,
    buildTasks: buildBlankTasks,
  },
];
