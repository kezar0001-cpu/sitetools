"use client";

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSiteCount: number;
  isLoading: boolean;
}

export function BulkActionsModal({
  isOpen,
  onClose,
  onConfirm,
  onSiteCount,
  isLoading,
}: BulkActionsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={() => !isLoading && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-slate-900">Sign out all visitors?</h3>
        <p className="mt-2 text-sm text-slate-600">
          This will sign out{" "}
          <span className="font-bold text-slate-900">
            {onSiteCount} visitor{onSiteCount !== 1 ? "s" : ""}
          </span>{" "}
          currently on site.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-60 text-white font-bold rounded-xl px-4 py-2.5 text-sm"
          >
            {isLoading ? "Signing out..." : "Confirm sign out"}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-bold rounded-xl px-4 py-2.5 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
