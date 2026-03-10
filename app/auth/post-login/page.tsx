import { Suspense } from "react";
import { PostLoginClient } from "./PostLoginClient";

function PostLoginLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-md text-center shadow-sm">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-600">Checking your account...</p>
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
