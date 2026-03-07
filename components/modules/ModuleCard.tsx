import Link from "next/link";
import { BuildstateModule } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";

export function ModuleCard({ module }: { module: BuildstateModule }) {
    const isLive = module.status === "live";

    return (
        <Link
            href={module.href}
            className={`relative group flex flex-col h-full bg-white rounded-2xl border p-6 transition-all duration-200
        ${isLive
                    ? "border-gray-200 hover:border-amber-400 shadow-sm hover:shadow-lg translate-y-0 hover:-translate-y-1"
                    : "border-gray-100 opacity-70 hover:opacity-100 hover:border-gray-300"
                }
      `}
        >
            <div className="flex justify-between items-start mb-4">
                <div
                    className={`p-3 rounded-xl inline-flex
            ${isLive
                            ? "bg-amber-100 text-amber-700 group-hover:bg-amber-400 group-hover:text-amber-950 transition-colors"
                            : "bg-gray-100 text-gray-500"
                        }
          `}
                >
                    {getIcon(module.icon, "h-6 w-6")}
                </div>
                {!isLive && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        Planned
                    </span>
                )}
                {isLive && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                        Live
                    </span>
                )}
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mb-2">
                {module.name}
            </h3>
            <p className="text-sm font-semibold text-gray-500 mb-3 leading-snug">
                {module.tagline}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed flex-1">
                {module.description}
            </p>

            {isLive && (
                <div className="mt-6 font-bold text-amber-600 text-sm flex items-center group-hover:text-amber-700">
                    Open module
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            )}
        </Link>
    );
}
