import { BuildstateModule } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";

interface ModuleCardProps {
    module: BuildstateModule;
    hrefOverride?: string;
}

export function ModuleCard({ module, hrefOverride }: ModuleCardProps) {
    const isLive = module.status === "live";
    const href = hrefOverride ?? module.href;

    return (
        <div 
            className={`relative group flex flex-col h-full bg-white rounded-2xl border p-6 transition-all duration-200
                ${isLive
                    ? "border-gray-200 hover:border-amber-400 shadow-sm hover:shadow-lg translate-y-0 hover:-translate-y-1 cursor-pointer"
                    : "border-gray-100 opacity-60 cursor-not-allowed"
                }
            `}
            onClick={() => isLive && (window.location.href = href)}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl inline-flex ${isLive ? "bg-amber-100 text-amber-700 group-hover:bg-amber-400 group-hover:text-amber-950 transition-colors" : "bg-gray-100 text-gray-500"}`}>
                    {getIcon(module.icon, "h-6 w-6")}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${isLive ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {isLive ? "Workspace" : "Coming Soon"}
                </span>
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mb-2">{module.name}</h3>
            <p className="text-sm font-semibold text-gray-500 mb-3 leading-snug">{module.tagline}</p>
            <p className="text-sm text-gray-600 leading-relaxed flex-1">{module.description}</p>

            <div className={`mt-6 font-bold text-sm flex items-center ${isLive ? "text-amber-600 group-hover:text-amber-700" : "text-gray-400"}`}>
                {isLive ? "Use in workspace" : "Roadmap item"}
                {isLive && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                )}
            </div>
        </div>
    );
}
