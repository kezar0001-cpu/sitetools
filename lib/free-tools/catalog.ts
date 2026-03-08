import { FreeTool, FreeToolCategory } from "@/lib/free-tools/types";

const toNumber = (value: string): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const sqmPerSheet = 6;
const sqmPerRoll = 36;

const unitFactors: Record<string, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    in: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
};

export const FREE_TOOL_CATEGORIES: FreeToolCategory[] = [
    { id: "quantity-volume", label: "Quantity & Volume", description: "Core quantity takeoff and volume tools for everyday site calculations." },
    { id: "materials", label: "Materials", description: "Material tonnage and ordering helpers for concrete, asphalt, gravel, and fill." },
    { id: "reinforcement", label: "Reinforcement", description: "Mesh and reinforcement calculators for slabs, footings, and civil structures." },
    { id: "earthworks", label: "Earthworks", description: "Bulk earthwork, trenching, and cut/fill calculations for civil projects." },
    { id: "geometry-setout", label: "Geometry & Setout", description: "Slope, chainage, and setout math utilities for field teams." },
    { id: "estimating", label: "Estimating", description: "Simple rate and quantity helpers for fast early-stage pricing." },
    { id: "conversions", label: "Conversions", description: "Unit conversions and quick measurement translators for site teams." },
    { id: "productivity", label: "Productivity", description: "Labour and output calculators to support planning and delivery." },
];

export const FREE_TOOLS: FreeTool[] = [
    {
        slug: "concrete-volume-calculator",
        name: "Concrete Volume Calculator",
        shortDescription: "Calculate concrete volume in cubic metres for slabs, pads, and pours.",
        longDescription: "Quickly estimate concrete volume from length, width, and depth. Built for slab pours, hardstands, footings, and general civil concrete works.",
        seoDescription: "Free concrete volume calculator for civil and construction teams. Calculate m³ for slabs, footings, and pads instantly.",
        category: "quantity-volume",
        status: "live",
        launchPriority: "now",
        trafficPotential: "high",
        funnelTarget: "Connect quantities into Buildstate Planner and future estimating workflows.",
        keywords: ["concrete volume calculator", "concrete m3 calculator", "slab volume calculator"],
        assumptions: ["All dimensions are entered in metres.", "Result excludes waste allowance and overbreak."],
        notes: ["Add 5–10% waste depending on pump setup and finish tolerance.", "For irregular pours, break the shape into multiple rectangles and total the volume."],
        example: "Example: 12m × 4m × 0.15m = 7.2 m³ of concrete.",
        relatedSlugs: ["kerb-volume-calculator", "mesh-calculator", "gravel-fill-calculator"],
        calculator: {
            inputs: [
                { id: "length", label: "Length", type: "number", min: 0, step: 0.01, unit: "m", required: true },
                { id: "width", label: "Width", type: "number", min: 0, step: 0.01, unit: "m", required: true },
                { id: "depth", label: "Depth / Thickness", type: "number", min: 0, step: 0.001, unit: "m", required: true },
            ],
            compute: (values) => {
                const volume = toNumber(values.length) * toNumber(values.width) * toNumber(values.depth);
                return [{ id: "volume", label: "Concrete volume", value: volume, unit: "m³", precision: 3 }];
            },
        },
    },
    {
        slug: "kerb-volume-calculator",
        name: "Kerb Volume Calculator",
        shortDescription: "Estimate kerb concrete volume from length and cross-section dimensions.",
        longDescription: "Calculate kerb and gutter concrete volume using a practical rectangular approximation for fast site estimates.",
        seoDescription: "Free kerb volume calculator for civil construction projects. Estimate concrete m³ for kerbs quickly.",
        category: "quantity-volume",
        status: "live",
        launchPriority: "now",
        trafficPotential: "medium",
        funnelTarget: "Route takeoff outputs into planned Buildstate quantity summaries and dockets.",
        keywords: ["kerb volume calculator", "kerb concrete calculator", "gutter concrete estimate"],
        assumptions: ["Cross section is approximated as width × depth.", "Dimensions are in metres."],
        notes: ["For detailed profiles, split section into simple shapes for greater accuracy."],
        relatedSlugs: ["concrete-volume-calculator", "trench-excavation-calculator"],
        calculator: {
            inputs: [
                { id: "length", label: "Kerb length", type: "number", min: 0, step: 0.01, unit: "m", required: true },
                { id: "width", label: "Average width", type: "number", min: 0, step: 0.001, unit: "m", required: true },
                { id: "depth", label: "Average depth", type: "number", min: 0, step: 0.001, unit: "m", required: true },
            ],
            compute: (values) => {
                const volume = toNumber(values.length) * toNumber(values.width) * toNumber(values.depth);
                return [{ id: "volume", label: "Kerb concrete volume", value: volume, unit: "m³", precision: 3 }];
            },
        },
    },
    {
        slug: "trench-excavation-calculator",
        name: "Trench Excavation Calculator",
        shortDescription: "Calculate trench excavation volume and spoil quantity in cubic metres.",
        longDescription: "Estimate trench excavation volumes for utilities, drainage, and service runs. Useful for planning truck movements and spoil disposal.",
        seoDescription: "Free trench excavation calculator. Calculate trench volume in m³ for civil and utility works.",
        category: "earthworks",
        status: "live",
        launchPriority: "now",
        trafficPotential: "high",
        funnelTarget: "Feed earthworks quantities into Buildstate project planning and productivity tracking.",
        keywords: ["trench excavation calculator", "trench volume calculator", "excavation m3 calculator"],
        assumptions: ["Trench is measured as a uniform rectangular prism."],
        notes: ["Include battering/benching separately where required.", "Apply bulking factors when converting in-situ to loose spoil volumes."],
        relatedSlugs: ["gravel-fill-calculator", "slope-gradient-calculator"],
        calculator: {
            inputs: [
                { id: "length", label: "Trench length", type: "number", min: 0, step: 0.01, unit: "m", required: true },
                { id: "width", label: "Trench width", type: "number", min: 0, step: 0.01, unit: "m", required: true },
                { id: "depth", label: "Trench depth", type: "number", min: 0, step: 0.01, unit: "m", required: true },
            ],
            compute: (values) => {
                const volume = toNumber(values.length) * toNumber(values.width) * toNumber(values.depth);
                return [{ id: "volume", label: "Excavation volume", value: volume, unit: "m³", precision: 3 }];
            },
        },
    },
    {
        slug: "mesh-calculator",
        name: "Mesh Calculator",
        shortDescription: "Estimate reinforcement mesh sheets or rolls from slab area.",
        longDescription: "Calculate approximate mesh quantities based on slab area and selected mesh format. Includes an optional overlap allowance.",
        seoDescription: "Free reinforcement mesh calculator for slabs and civil concrete works. Estimate mesh sheets fast.",
        category: "reinforcement",
        status: "live",
        launchPriority: "now",
        trafficPotential: "high",
        funnelTarget: "Bridge into Buildstate takeoff records and material planning tools.",
        keywords: ["mesh calculator", "reo mesh calculator", "reinforcement sheet calculator"],
        assumptions: ["Coverage uses nominal area per sheet/roll.", "Overlap allowance is applied as a percentage uplift."],
        notes: ["Always verify lap lengths and structural engineer requirements.", "Round up to full sheets/rolls when ordering."],
        relatedSlugs: ["concrete-volume-calculator", "asphalt-tonnage-calculator"],
        calculator: {
            inputs: [
                { id: "area", label: "Area to cover", type: "number", min: 0, step: 0.01, unit: "m²", required: true },
                {
                    id: "format",
                    label: "Mesh format",
                    type: "select",
                    required: true,
                    options: [
                        { label: "Sheet mesh (6 m² each)", value: "sheet" },
                        { label: "Roll mesh (36 m² each)", value: "roll" },
                    ],
                },
                { id: "overlap", label: "Overlap / waste allowance", type: "number", min: 0, step: 0.1, unit: "%", required: true, placeholder: "10" },
            ],
            compute: (values) => {
                const area = toNumber(values.area);
                const overlapFactor = 1 + toNumber(values.overlap) / 100;
                const adjustedArea = area * overlapFactor;
                const coverage = values.format === "roll" ? sqmPerRoll : sqmPerSheet;
                const qty = adjustedArea / coverage;
                return [
                    { id: "adjustedArea", label: "Adjusted coverage area", value: adjustedArea, unit: "m²", precision: 2 },
                    { id: "qty", label: "Mesh required", value: qty, unit: values.format === "roll" ? "rolls" : "sheets", precision: 2 },
                ];
            },
        },
    },
    {
        slug: "asphalt-tonnage-calculator",
        name: "Asphalt Tonnage Calculator",
        shortDescription: "Convert asphalt area and depth into estimated tonnes.",
        longDescription: "Calculate asphalt mass from length, width, depth, and mix density for paving and resurfacing works.",
        seoDescription: "Free asphalt tonnage calculator for civil and road construction. Convert area and depth to tonnes.",
        category: "materials",
        status: "live",
        launchPriority: "now",
        trafficPotential: "high",
        funnelTarget: "Connect estimated tonnage to Buildstate delivery planning and daily records.",
        keywords: ["asphalt tonnage calculator", "asphalt quantity calculator", "road asphalt tonnes"],
        assumptions: ["Depth is entered in millimetres.", "Density defaults to 2.4 t/m³ unless adjusted."],
        notes: ["Check project specs for the nominated mix density.", "Order in practical truckload increments."],
        relatedSlugs: ["gravel-fill-calculator", "unit-converter"],
        calculator: {
            inputs: [
                { id: "length", label: "Length", type: "number", min: 0, step: 0.01, unit: "m", required: true },
                { id: "width", label: "Width", type: "number", min: 0, step: 0.01, unit: "m", required: true },
                { id: "depth", label: "Compacted depth", type: "number", min: 0, step: 1, unit: "mm", required: true },
                { id: "density", label: "Asphalt density", type: "number", min: 0, step: 0.01, unit: "t/m³", required: true, placeholder: "2.4" },
            ],
            compute: (values) => {
                const area = toNumber(values.length) * toNumber(values.width);
                const volume = area * (toNumber(values.depth) / 1000);
                const tonnes = volume * toNumber(values.density || "2.4");
                return [
                    { id: "area", label: "Paving area", value: area, unit: "m²", precision: 2 },
                    { id: "volume", label: "Asphalt volume", value: volume, unit: "m³", precision: 3 },
                    { id: "tonnes", label: "Estimated tonnage", value: tonnes, unit: "t", precision: 2 },
                ];
            },
        },
    },
    {
        slug: "gravel-fill-calculator",
        name: "Gravel / Fill Calculator",
        shortDescription: "Estimate gravel, road base, or fill quantities by volume and tonnes.",
        longDescription: "Calculate compacted material volumes and estimated tonnes for gravel, fill, and imported material layers.",
        seoDescription: "Free gravel and fill calculator for construction. Estimate m³ and tonnes from dimensions and depth.",
        category: "materials",
        status: "live",
        launchPriority: "now",
        trafficPotential: "high",
        funnelTarget: "Natural handoff into Buildstate quantity summaries and cost tracking.",
        keywords: ["gravel calculator", "fill calculator", "road base tonnage calculator"],
        assumptions: ["Depth is entered in millimetres.", "Density can vary by material source and moisture."],
        notes: ["Confirm supplier conversion factors before placing final orders."],
        relatedSlugs: ["trench-excavation-calculator", "asphalt-tonnage-calculator"],
        calculator: {
            inputs: [
                { id: "length", label: "Length", type: "number", min: 0, step: 0.01, unit: "m", required: true },
                { id: "width", label: "Width", type: "number", min: 0, step: 0.01, unit: "m", required: true },
                { id: "depth", label: "Compacted depth", type: "number", min: 0, step: 1, unit: "mm", required: true },
                { id: "density", label: "Material density", type: "number", min: 0, step: 0.01, unit: "t/m³", required: true, placeholder: "1.8" },
            ],
            compute: (values) => {
                const area = toNumber(values.length) * toNumber(values.width);
                const volume = area * (toNumber(values.depth) / 1000);
                const tonnes = volume * toNumber(values.density || "1.8");
                return [
                    { id: "volume", label: "Compacted volume", value: volume, unit: "m³", precision: 3 },
                    { id: "tonnes", label: "Estimated tonnes", value: tonnes, unit: "t", precision: 2 },
                ];
            },
        },
    },
    {
        slug: "slope-gradient-calculator",
        name: "Slope / Gradient Calculator",
        shortDescription: "Calculate slope as percentage, ratio, and angle.",
        longDescription: "Convert rise and run into practical slope outputs for drainage lines, batters, and setout checks.",
        seoDescription: "Free slope and gradient calculator for civil construction. Convert rise/run to % grade, ratio, and degrees.",
        category: "geometry-setout",
        status: "live",
        launchPriority: "now",
        trafficPotential: "medium",
        funnelTarget: "Feeds into setout and planning workflows in Buildstate project modules.",
        keywords: ["slope calculator", "gradient calculator", "rise run calculator"],
        assumptions: ["Rise and run are measured in the same units."],
        notes: ["Use a positive rise for uphill and negative for downhill grades."],
        relatedSlugs: ["trench-excavation-calculator", "unit-converter"],
        calculator: {
            inputs: [
                { id: "rise", label: "Rise", type: "number", step: 0.001, unit: "m", required: true },
                { id: "run", label: "Run", type: "number", min: 0.0001, step: 0.001, unit: "m", required: true },
            ],
            compute: (values) => {
                const rise = toNumber(values.rise);
                const run = toNumber(values.run);
                const grade = (rise / run) * 100;
                const ratio = run / (Math.abs(rise) || 1);
                const angle = (Math.atan(rise / run) * 180) / Math.PI;
                return [
                    { id: "grade", label: "Gradient", value: grade, unit: "%", precision: 2 },
                    { id: "ratio", label: "Slope ratio (1 : x)", value: ratio, precision: 2 },
                    { id: "angle", label: "Angle", value: angle, unit: "°", precision: 2 },
                ];
            },
        },
    },
    {
        slug: "unit-converter",
        name: "Construction Unit Converter",
        shortDescription: "Convert common length units used across civil construction sites.",
        longDescription: "Quickly convert between millimetres, metres, kilometres, feet, inches, and yards while onsite or estimating.",
        seoDescription: "Free construction unit converter for civil teams. Convert mm, m, km, ft, inches, and yards instantly.",
        category: "conversions",
        status: "live",
        launchPriority: "now",
        trafficPotential: "high",
        funnelTarget: "Supports every Buildstate workflow by standardising unit handling.",
        keywords: ["unit converter", "construction converter", "mm to m converter"],
        assumptions: ["Length-only converter in first release."],
        notes: ["Future Buildstate releases can add area, volume, and mass conversions."],
        relatedSlugs: ["asphalt-tonnage-calculator", "slope-gradient-calculator"],
        calculator: {
            inputs: [
                { id: "value", label: "Value", type: "number", step: 0.001, required: true },
                {
                    id: "fromUnit",
                    label: "From",
                    type: "select",
                    required: true,
                    options: [
                        { label: "Millimetres (mm)", value: "mm" },
                        { label: "Centimetres (cm)", value: "cm" },
                        { label: "Metres (m)", value: "m" },
                        { label: "Kilometres (km)", value: "km" },
                        { label: "Inches (in)", value: "in" },
                        { label: "Feet (ft)", value: "ft" },
                        { label: "Yards (yd)", value: "yd" },
                    ],
                },
                {
                    id: "toUnit",
                    label: "To",
                    type: "select",
                    required: true,
                    options: [
                        { label: "Millimetres (mm)", value: "mm" },
                        { label: "Centimetres (cm)", value: "cm" },
                        { label: "Metres (m)", value: "m" },
                        { label: "Kilometres (km)", value: "km" },
                        { label: "Inches (in)", value: "in" },
                        { label: "Feet (ft)", value: "ft" },
                        { label: "Yards (yd)", value: "yd" },
                    ],
                },
            ],
            compute: (values) => {
                const sourceFactor = unitFactors[values.fromUnit || "m"];
                const targetFactor = unitFactors[values.toUnit || "m"];
                const meters = toNumber(values.value) * sourceFactor;
                const converted = meters / targetFactor;
                return [{ id: "converted", label: "Converted value", value: converted, unit: values.toUnit || "m", precision: 5 }];
            },
        },
    },

    // Next launch wave / roadmap tools
    { slug: "topsoil-calculator", name: "Topsoil Calculator", shortDescription: "Estimate topsoil volume for landscaping and rehabilitation areas.", longDescription: "Quick topsoil quantity estimate by area and depth.", seoDescription: "Topsoil calculator for civil and landscaping works.", category: "materials", status: "planned", launchPriority: "next", trafficPotential: "high", funnelTarget: "Ties into material ordering workflows.", keywords: ["topsoil calculator"] },
    { slug: "footing-calculator", name: "Footing Calculator", shortDescription: "Calculate strip and pad footing concrete quantities.", longDescription: "Simple footing quantity helper for tender and site planning.", seoDescription: "Footing concrete calculator.", category: "quantity-volume", status: "planned", launchPriority: "next", trafficPotential: "high", funnelTarget: "Feeds estimated quantities into planner.", keywords: ["footing calculator"] },
    { slug: "cut-fill-calculator", name: "Cut / Fill Calculator", shortDescription: "Estimate cut and fill volumes from area and level differences.", longDescription: "Early-stage earthworks balancing for civil projects.", seoDescription: "Cut fill calculator for earthworks.", category: "earthworks", status: "planned", launchPriority: "next", trafficPotential: "high", funnelTarget: "Natural link to earthworks planning modules.", keywords: ["cut fill calculator"] },
    { slug: "rebar-weight-calculator", name: "Rebar Weight Calculator", shortDescription: "Calculate reinforcement bar weight from diameter and length.", longDescription: "Quick tonnage outputs for reinforcement planning.", seoDescription: "Rebar weight calculator.", category: "reinforcement", status: "planned", launchPriority: "next", trafficPotential: "medium", funnelTarget: "Links into procurement workflows.", keywords: ["rebar weight calculator"] },
    { slug: "chainage-offset-helper", name: "Chainage & Offset Helper", shortDescription: "Convert chainage and offsets for field setout checks.", longDescription: "Basic setout and alignment utility for supervisors.", seoDescription: "Chainage offset calculator.", category: "geometry-setout", status: "planned", launchPriority: "next", trafficPotential: "niche", funnelTarget: "Maps to field execution modules.", keywords: ["chainage calculator"] },
    { slug: "labour-hour-calculator", name: "Labour Hour Calculator", shortDescription: "Calculate total labour hours by crew and shift length.", longDescription: "Simple helper for daywork and quick internal forecasting.", seoDescription: "Labour hour calculator for construction.", category: "productivity", status: "planned", launchPriority: "next", trafficPotential: "medium", funnelTarget: "Upgrade path into Buildstate timesheets.", keywords: ["labour hour calculator"] },
    { slug: "rate-build-up-calculator", name: "Rate Build-Up Calculator", shortDescription: "Build simple unit rates from labour, plant, and material inputs.", longDescription: "Fast estimating helper for early pricing decisions.", seoDescription: "Construction rate build-up calculator.", category: "estimating", status: "planned", launchPriority: "later", trafficPotential: "medium", funnelTarget: "Strong bridge to advanced estimating modules.", keywords: ["rate build up calculator"] },
    { slug: "pipe-volume-calculator", name: "Pipe Volume Calculator", shortDescription: "Calculate pipe internal volume for flushing and testing.", longDescription: "Utility tool for civil and services teams.", seoDescription: "Pipe volume calculator.", category: "quantity-volume", status: "planned", launchPriority: "later", trafficPotential: "niche", funnelTarget: "Connects to inspection and commissioning records.", keywords: ["pipe volume calculator"] },
];

export function getFreeToolBySlug(slug: string): FreeTool | undefined {
    return FREE_TOOLS.find((tool) => tool.slug === slug);
}

export function getLiveFreeTools(): FreeTool[] {
    return FREE_TOOLS.filter((tool) => tool.status === "live");
}

export function getRelatedTools(tool: FreeTool): FreeTool[] {
    const relatedSet = new Set(tool.relatedSlugs ?? []);
    return FREE_TOOLS.filter((item) => relatedSet.has(item.slug));
}
