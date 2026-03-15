"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open) {
            dialog.showModal();
        } else {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            onCancel={onCancel}
            className="rounded-2xl shadow-2xl border-0 p-0 w-full max-w-sm backdrop:bg-black/50"
        >
            <div className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-600 whitespace-pre-line">{description}</p>
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
