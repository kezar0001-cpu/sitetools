"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ProjectSitePlanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold text-slate-800">Something went wrong</h2>
      <p className="text-slate-500 max-w-md">
        An unexpected error occurred while loading this site plan.
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-2 max-w-xl overflow-auto rounded-md bg-slate-100 p-4 text-left text-xs text-red-600">
          {error.message}
          {error.stack ? `\n\n${error.stack}` : ""}
        </pre>
      )}
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Reload page
        </button>
        <Link
          href="/site-plan"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to projects
        </Link>
      </div>
    </div>
  );
}
