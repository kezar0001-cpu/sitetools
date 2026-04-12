import { Suspense } from "react";
import { PostLoginClient } from "./PostLoginClient";

function PostLoginLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">
        <div className="w-2 h-2 rounded-sm bg-amber-400 mx-auto mb-6" />
        <p className="text-base font-bold text-zinc-100">Checking your account</p>
        <p className="mt-2 text-sm text-zinc-500">Preparing your workspace.</p>
        <div className="mt-6 h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-amber-400 rounded-full animate-pulse" />
        </div>
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
