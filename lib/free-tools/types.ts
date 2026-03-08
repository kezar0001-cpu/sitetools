export type FreeToolCategoryId =
    | "quantity-volume"
    | "materials"
    | "reinforcement"
    | "earthworks"
    | "geometry-setout"
    | "estimating"
    | "conversions"
    | "productivity";

export interface FreeToolCategory {
    id: FreeToolCategoryId;
    label: string;
    description: string;
}

export type ToolStatus = "live" | "planned";
export type ToolAccess = "public" | "workspace";
export type ToolCapability = "core" | "advanced";

export interface ToolInputOption {
    label: string;
    value: string;
}

export interface ToolInputDefinition {
    id: string;
    label: string;
    type: "number" | "select";
    required?: boolean;
    min?: number;
    step?: number;
    placeholder?: string;
    unit?: string;
    options?: ToolInputOption[];
}

export interface CalculatorResult {
    id: string;
    label: string;
    value: number;
    unit?: string;
    precision?: number;
}

export interface CalculatorDefinition {
    inputs: ToolInputDefinition[];
    compute: (values: Record<string, string>) => CalculatorResult[];
}

export interface FreeTool {
    slug: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    seoDescription: string;
    category: FreeToolCategoryId;
    status: ToolStatus;
    access?: ToolAccess;
    capability?: ToolCapability;
    launchPriority: "now" | "next" | "later";
    trafficPotential: "high" | "medium" | "niche";
    funnelTarget: string;
    keywords: string[];
    notes?: string[];
    assumptions?: string[];
    example?: string;
    relatedSlugs?: string[];
    calculator?: CalculatorDefinition;
}
