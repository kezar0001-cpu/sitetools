"use client";

/**
 * PhotoUploader with unified Add Photo button, modal options,
 * and camera overlay for location/timestamp
 */

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { uploadPhoto } from "@/lib/diary/client";
import { validatePhotoFile } from "@/lib/diary/validation";
import type { SiteDiaryPhoto } from "@/lib/diary/types";

interface Props {
  diaryId: string;
  initialPhotos?: SiteDiaryPhoto[];
  onChange?: (photos: SiteDiaryPhoto[]) => void;
  disabled?: boolean;
}

/** Photo categories for quick tagging */
export type PhotoCategory = "safety" | "progress" | "issue" | "delivery" | "general";

export const PHOTO_CATEGORIES: { id: PhotoCategory; label: string; icon: string; color: string }[] = [
  { id: "safety", label: "Safety", icon: "🛡️", color: "bg-emerald-100 text-emerald-700" },
  { id: "progress", label: "Progress", icon: "📈", color: "bg-blue-100 text-blue-700" },
  { id: "issue", label: "Issue", icon: "⚠️", color: "bg-red-100 text-red-700" },
  { id: "delivery", label: "Delivery", icon: "📦", color: "bg-amber-100 text-amber-700" },
  { id: "general", label: "General", icon: "📷", color: "bg-slate-100 text-slate-700" },
];

interface UploadingItem {
  id: string;
  preview: string;
  file: File;
  progress: "uploading" | "done" | "error";
  error?: string;
  category: PhotoCategory;
  caption: string;
  metadata: {
    timestamp: string;
    latitude?: number;
    longitude?: number;
  };
}

interface PhotoMetadata {
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

/** Extract metadata from image file (EXIF) */
async function extractMetadata(file: File): Promise<PhotoMetadata> {
  const metadata: PhotoMetadata = {
    timestamp: new Date().toISOString(),
  };

  // Try to extract EXIF data if available
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    
    // Check for JPEG magic bytes
    if (dataView.getUint16(0, false) === 0xFFD8) {
      let offset = 2;
      while (offset < dataView.byteLength) {
        const marker = dataView.getUint16(offset, false);
        
        // APP1 marker (EXIF)
        if (marker === 0xFFE1) {
          const segmentLength = dataView.getUint16(offset + 2, false);
          const exifOffset = offset + 4;
          
          // Check for EXIF header
          const exifHeader = new TextDecoder().decode(
            new Uint8Array(arrayBuffer.slice(exifOffset, exifOffset + 6))
          );
          
          if (exifHeader.startsWith("Exif")) {
            // Use file modification time as fallback
            metadata.timestamp = new Date(file.lastModified).toISOString();
          }
          offset += 2 + segmentLength;
        } else if (marker === 0xFFD9) {
          // EOI marker
          break;
        } else if ((marker & 0xFF00) === 0xFF00) {
          // Other marker
          const segmentLength = dataView.getUint16(offset + 2, false);
          offset += 2 + segmentLength;
        } else {
          break;
        }
      }
    }
  } catch {
    // Fallback to file metadata
  }

  return metadata;
}

/** Get current geolocation */
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}

/** Reverse geocode coordinates to address using OpenStreetMap Nominatim */
async function getAddressFromCoordinates(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { "User-Agent": "SiteSign Diary App" } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    // Return display name or formatted address
    return data.display_name || null;
  } catch {
    return null;
  }
}

/** Add timestamp and location overlay to image using canvas */
async function addOverlayToImage(
  file: File,
  timestamp: string,
  address?: string | null
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Format timestamp
      const dateStr = new Date(timestamp).toLocaleString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Draw overlay background at bottom
      const padding = 20;
      const lineHeight = 30;
      const textHeight = address ? lineHeight * 2 + padding : lineHeight + padding;
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, canvas.height - textHeight - padding, canvas.width, textHeight + padding);

      // Draw text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
      ctx.textBaseline = "bottom";
      
      // Timestamp
      ctx.fillText(dateStr, padding, canvas.height - padding - (address ? lineHeight : 0));
      
      // Address (truncated if too long)
      if (address) {
        ctx.font = "18px system-ui, -apple-system, sans-serif";
        // Truncate address to fit canvas width
        let displayAddress = address;
        const maxWidth = canvas.width - padding * 2;
        while (ctx.measureText(displayAddress).width > maxWidth && displayAddress.length > 3) {
          displayAddress = displayAddress.slice(0, -4) + "...";
        }
        ctx.fillText(displayAddress, padding, canvas.height - padding);
      }

      // Convert to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not create blob from canvas"));
          return;
        }
        // Create new file with overlay
        const newFile = new File([blob], file.name, { type: file.type });
        resolve(newFile);
      }, file.type, 0.95);
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function PhotoUploader({ diaryId, initialPhotos = [], onChange, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<SiteDiaryPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory>("general");
  const [showModal, setShowModal] = useState(false);
  const [captureMode, setCaptureMode] = useState<"camera" | "gallery" | null>(null);

  const notifyChange = useCallback((next: SiteDiaryPhoto[]) => {
    setPhotos(next);
    onChange?.(next);
  }, [onChange]);

  const processFiles = useCallback(async (files: FileList | null, withOverlay: boolean = false) => {
    if (disabled || !files || files.length === 0) return;

    let position: GeolocationPosition | null = null;
    let address: string | null = null;
    
    // Get geolocation if using camera with overlay
    if (withOverlay) {
      try {
        position = await getCurrentPosition();
        // Reverse geocode to get address
        if (position) {
          address = await getAddressFromCoordinates(
            position.coords.latitude,
            position.coords.longitude
          );
        }
      } catch {
        // Continue without location if geolocation fails
      }
    }

    const items: UploadingItem[] = await Promise.all(
      Array.from(files).map(async (file) => {
        let processedFile = file;
        const timestamp = new Date().toISOString();
        
        // Add overlay for camera captures
        if (withOverlay) {
          try {
            processedFile = await addOverlayToImage(
              file,
              timestamp,
              address
            );
          } catch {
            // Fallback to original file if overlay fails
          }
        }

        const metadata = await extractMetadata(processedFile);
        // Use captured timestamp for camera, file metadata for gallery
        if (withOverlay) {
          metadata.timestamp = timestamp;
          if (position) {
            metadata.latitude = position.coords.latitude;
            metadata.longitude = position.coords.longitude;
          }
        }

        return {
          id: crypto.randomUUID(),
          preview: URL.createObjectURL(processedFile),
          file: processedFile,
          progress: "uploading" as const,
          category: selectedCategory,
          caption: "",
          metadata,
        };
      })
    );

    setUploading((prev) => [...prev, ...items]);
    setShowModal(false);

    // Upload with concurrency limit
    const CONCURRENCY = 3;
    const queue = [...items];
    const running: Promise<void>[] = [];

    const uploadNext = async (item: UploadingItem): Promise<void> => {
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
        const caption = item.caption.trim() || null;
        const photo = await uploadPhoto(diaryId, item.file, caption);
        
        setPhotos((prev) => {
          const next = [...prev, photo];
          onChange?.(next);
          return next;
        });
        
        setUploading((prev) => prev.filter((u) => u.id !== item.id));
        URL.revokeObjectURL(item.preview);
      } catch (err) {
        setUploading((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? { ...u, progress: "error", error: err instanceof Error ? err.message : "Upload failed" }
              : u
          )
        );
      }
    };

    for (const item of queue) {
      if (running.length >= CONCURRENCY) {
        await Promise.race(running);
      }
      const promise = uploadNext(item).finally(() => {
        const index = running.indexOf(promise);
        if (index > -1) running.splice(index, 1);
      });
      running.push(promise);
    }

    await Promise.all(running);
  }, [disabled, diaryId, onChange, selectedCategory]);

  function handleCameraClick() {
    setCaptureMode("camera");
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.capture = "environment";
        inputRef.current.click();
      }
    }, 100);
  }

  function handleGalleryClick() {
    setCaptureMode("gallery");
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.removeAttribute("capture");
        inputRef.current.click();
      }
    }, 100);
  }

  async function handleDelete(photo: SiteDiaryPhoto) {
    if (disabled) return;
    setDeletingId(photo.id);
    try {
      const { deletePhoto } = await import("@/lib/diary/client");
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

  function updateUploadingCaption(id: string, caption: string) {
    setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, caption } : u)));
  }

  const allCount = photos.length + uploading.length;

  return (
    <div className="space-y-4">
      {/* Category selector */}
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 self-center mr-1">Tag:</span>
          {PHOTO_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? cat.color + " ring-2 ring-offset-1 ring-slate-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Single Add Photo button */}
      {!disabled && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-5 text-amber-800 hover:bg-amber-100 active:scale-[0.98] transition-all duration-150"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-semibold">Add Photo</span>
        </button>
      )}

      {/* Hidden file input */}
      {!disabled && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files, captureMode === "camera")}
        />
      )}

      {/* Photo Options Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Photo</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCameraClick}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-6 text-amber-800 hover:bg-amber-100 active:scale-[0.98] transition-all"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-semibold">Camera</span>
                <span className="text-xs text-amber-600">With location</span>
              </button>

              <button
                type="button"
                onClick={handleGalleryClick}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-slate-600 hover:border-slate-400 hover:bg-slate-100 active:scale-[0.98] transition-all"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold">Gallery</span>
                <span className="text-xs text-slate-400">Upload images</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-4 w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Uploading queue with metadata */}
      {uploading.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Uploading ({uploading.filter(u => u.progress === "uploading").length} remaining)
          </p>
          <div className="space-y-2">
            {uploading.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-200">
                  <Image src={item.preview} alt="Preview" fill className="object-cover" />
                  {item.progress === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      PHOTO_CATEGORIES.find(c => c.id === item.category)?.color
                    }`}>
                      {PHOTO_CATEGORIES.find(c => c.id === item.category)?.icon}
                      {PHOTO_CATEGORIES.find(c => c.id === item.category)?.label}
                    </span>
                    {item.metadata.timestamp && (
                      <span className="text-xs text-slate-400">
                        {new Date(item.metadata.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={item.caption}
                    onChange={(e) => updateUploadingCaption(item.id, e.target.value)}
                    placeholder="Add caption..."
                    disabled={item.progress === "uploading"}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                  />

                  {item.progress === "error" && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-red-600">{item.error}</p>
                      <button
                        type="button"
                        onClick={() => removeFailedUpload(item.id)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Saved Photos ({photos.length})
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100">
                {photo.signedUrl ? (
                  <Image src={photo.signedUrl} alt={photo.caption ?? "Site photo"} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {!disabled && (
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
                )}
                {photo.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allCount === 0 && !disabled && (
        <p className="text-sm text-slate-400 text-center py-4">
          No photos yet. Tap Add Photo to get started.
        </p>
      )}
    </div>
  );
}
