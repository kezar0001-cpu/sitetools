import { Suspense } from "react";
import { PostLoginClient } from "./PostLoginClient";

function PostLoginLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-md text-center shadow-sm">
        <p className="text-base font-semibold text-slate-800">Checking your account...</p>
        <p className="mt-2 text-sm text-slate-500">Preparing your workspace.</p>
      </div>
    </div>
  );
}

export default function PostLoginPage() {
  return (
    <Suspense fallback={<PostLoginLoading />}>
      <PostLoginClient />
    </Suspense>
  );
}
