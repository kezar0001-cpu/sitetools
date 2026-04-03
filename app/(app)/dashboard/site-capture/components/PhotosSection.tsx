"use client";

import { useCallback } from "react";
import type { SiteDiaryPhoto } from "@/lib/site-capture/types";
import { SectionHeader } from "./SectionHeader";
import PhotoUploader from "./PhotoUploader";

type DiaryWithPhotos = {
  id: string;
  photos: SiteDiaryPhoto[];
};

interface PhotosSectionProps<TDiary extends DiaryWithPhotos> {
  diary: TDiary;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: TDiary) => void;
}

export function PhotosSection<TDiary extends DiaryWithPhotos>({
  diary,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: PhotosSectionProps<TDiary>) {
  const handlePhotosChange = useCallback((photos: SiteDiaryPhoto[]) => {
    onUpdate({ ...diary, photos } as TDiary);
  }, [diary, onUpdate]);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Photos"
          icon={
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={diary.photos.length}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4">
          <PhotoUploader
            diaryId={diary.id}
            initialPhotos={diary.photos}
            onChange={handlePhotosChange}
            disabled={isLocked}
          />
        </div>
      )}
    </div>
  );
}
