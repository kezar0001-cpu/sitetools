"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadPhoto, deletePhoto } from "@/lib/diary/client";
import { validatePhotoFile } from "@/lib/diary/validation";
import type { SiteDiaryPhoto } from "@/lib/diary/types";

interface Props {
  diaryId: string;
  initialPhotos?: SiteDiaryPhoto[];
  onChange?: (photos: SiteDiaryPhoto[]) => void;
}

interface UploadingItem {
  id: string; // temp ID
  preview: string;
  file: File;
  progress: "uploading" | "done" | "error";
  error?: string;
}

export default function PhotoUploader({ diaryId, initialPhotos = [], onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<SiteDiaryPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function notifyChange(next: SiteDiaryPhoto[]) {
    setPhotos(next);
    onChange?.(next);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const items: UploadingItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      preview: URL.createObjectURL(file),
      file,
      progress: "uploading" as const,
    }));

    setUploading((prev) => [...prev, ...items]);

    await Promise.all(
      items.map(async (item) => {
        const validation = validatePhotoFile(item.file);
        if (!validation.valid) {
          setUploading((prev) =>
            prev.map((u) =>
              u.id === item.id ? { ...u, progress: "error", error: validation.errors.file } : u
            )
          );
          return;
        }

        try {
          const photo = await uploadPhoto(diaryId, item.file);
          notifyChange([...photos, photo]);
          setPhotos((prev) => {
            const next = [...prev, photo];
            onChange?.(next);
            return next;
          });
          setUploading((prev) => prev.filter((u) => u.id !== item.id));
          // Revoke preview blob
          URL.revokeObjectURL(item.preview);
        } catch (err) {
          setUploading((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? {
                    ...u,
                    progress: "error",
                    error: err instanceof Error ? err.message : "Upload failed.",
                  }
                : u
            )
          );
        }
      })
    );
  }

  async function handleDelete(photo: SiteDiaryPhoto) {
    setDeletingId(photo.id);
    try {
      await deletePhoto(photo);
      const next = photos.filter((p) => p.id !== photo.id);
      notifyChange(next);
    } catch (err) {
      console.error("[PhotoUploader] delete error:", err);
    } finally {
      setDeletingId(null);
    }
  }

  function removeFailedUpload(id: string) {
    setUploading((prev) => {
      const item = prev.find((u) => u.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((u) => u.id !== id);
    });
  }

  const allCount = photos.length + uploading.length;

  return (
    <div className="space-y-4">
      {/* Upload trigger button — large tap target for mobile */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-slate-500 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 active:scale-[0.98] transition-all duration-150"
      >
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-base font-medium">
          {allCount === 0 ? "Add photos" : "Add more photos"}
        </span>
        <span className="text-sm">Tap to open camera or gallery</span>
      </button>

      {/* Hidden file input — capture="environment" opens rear camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Photo grid */}
      {allCount > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {/* Saved photos */}
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100">
              {photo.signedUrl ? (
                <Image
                  src={photo.signedUrl}
                  alt={photo.caption ?? "Site photo"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {/* Delete overlay */}
              <button
                type="button"
                onClick={() => handleDelete(photo)}
                disabled={deletingId === photo.id}
                aria-label="Delete photo"
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {deletingId === photo.id ? (
                  <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          ))}

          {/* Uploading / error items */}
          {uploading.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
              <Image
                src={item.preview}
                alt="Uploading…"
                fill
                className="object-cover"
              />
              {item.progress === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}
              {item.progress === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-900/70 p-2">
                  <svg className="w-6 h-6 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.27 16A2 2 0 005.07 19z" />
                  </svg>
                  <p className="text-xs text-red-100 text-center leading-tight line-clamp-2">
                    {item.error ?? "Upload failed"}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFailedUpload(item.id)}
                    className="mt-1 text-xs text-white underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {allCount > 0 && (
        <p className="text-xs text-slate-400 text-center">
          {photos.length} photo{photos.length !== 1 ? "s" : ""} saved
          {uploading.filter((u) => u.progress === "uploading").length > 0 &&
            ` · ${uploading.filter((u) => u.progress === "uploading").length} uploading…`}
        </p>
      )}
    </div>
  );
}
