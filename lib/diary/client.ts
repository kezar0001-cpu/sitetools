import { supabase } from "@/lib/supabase";
import { DEFAULT_WEATHER } from "./types";
import type {
  AddEquipmentPayload,
  AddLaborPayload,
  CreateDiaryPayload,
  SiteDiary,
  SiteDiaryEquipment,
  SiteDiaryFull,
  SiteDiaryLabor,
  SiteDiaryPhoto,
  SiteDiaryWithCounts,
  UpdateDiaryPayload,
  WeatherSnapshot,
} from "./types";

// ─────────────────────────────────────────────
// Diaries
// ─────────────────────────────────────────────

/** List diaries for a company, optionally filtered by project. */
export async function getDiaries(
  companyId: string,
  projectId?: string | null
): Promise<SiteDiaryWithCounts[]> {
  let query = supabase
    .from("site_diaries")
    .select(
      `*,
      total_workers:site_diary_labor(worker_count.sum()),
      total_labor_rows:site_diary_labor(count),
      total_equipment_rows:site_diary_equipment(count),
      total_photos:site_diary_photos(count)`
    )
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Normalise Supabase aggregate shapes into flat numeric fields
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as SiteDiary),
    weather: (row.weather as WeatherSnapshot) ?? DEFAULT_WEATHER,
    total_workers: sumAggregate(row.total_workers),
    total_labor_rows: countAggregate(row.total_labor_rows),
    total_equipment_rows: countAggregate(row.total_equipment_rows),
    total_photos: countAggregate(row.total_photos),
  })) as SiteDiaryWithCounts[];
}

/** Fetch a single diary with all related rows. */
export async function getDiaryById(id: string): Promise<SiteDiaryFull | null> {
  const { data, error } = await supabase
    .from("site_diaries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw error;
  }

  const diary = data as SiteDiary;

  const [labor, equipment, photos] = await Promise.all([
    getLabor(id),
    getEquipment(id),
    getPhotos(id),
  ]);

  return {
    ...diary,
    weather: (diary.weather as unknown as WeatherSnapshot) ?? DEFAULT_WEATHER,
    labor,
    equipment,
    photos,
  };
}

/** Create a new diary entry. */
export async function createDiary(payload: CreateDiaryPayload): Promise<SiteDiary> {
  const { data, error } = await supabase
    .from("site_diaries")
    .insert({
      company_id: payload.company_id,
      project_id: payload.project_id ?? null,
      site_id: payload.site_id ?? null,
      date: payload.date ?? new Date().toISOString().slice(0, 10),
      weather: { ...DEFAULT_WEATHER, ...(payload.weather ?? {}) },
      notes: payload.notes ?? null,
      status: payload.status ?? "draft",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiary;
}

/** Submit a diary for review (draft → submitted, or rejected → submitted). */
export async function submitDiary(id: string): Promise<SiteDiary> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("site_diaries")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_by: user?.id ?? null,
      rejection_note: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiary;
}

/** Approve a submitted diary (admin/owner/manager only). */
export async function approveDiary(id: string): Promise<SiteDiary> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("site_diaries")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user?.id ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiary;
}

/** Reject a submitted diary with an optional comment (admin/owner/manager only). */
export async function rejectDiary(id: string, note: string): Promise<SiteDiary> {
  const { data, error } = await supabase
    .from("site_diaries")
    .update({
      status: "rejected",
      rejection_note: note.trim() || null,
      approved_at: null,
      approved_by: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiary;
}

/** Update an existing diary entry. */
export async function updateDiary(id: string, payload: UpdateDiaryPayload): Promise<SiteDiary> {
  const updates: Record<string, unknown> = {};

  if (payload.project_id !== undefined) updates.project_id = payload.project_id;
  if (payload.site_id !== undefined) updates.site_id = payload.site_id;
  if (payload.date !== undefined) updates.date = payload.date;
  if (payload.notes !== undefined) updates.notes = payload.notes;
  if (payload.status !== undefined) updates.status = payload.status;

  // Merge weather patch — preserve existing fields not being updated
  if (payload.weather !== undefined) {
    // Fetch current weather to merge
    const { data: existing } = await supabase
      .from("site_diaries")
      .select("weather")
      .eq("id", id)
      .single();

    const currentWeather = (existing?.weather as WeatherSnapshot) ?? DEFAULT_WEATHER;
    updates.weather = { ...currentWeather, ...payload.weather };
  }

  const { data, error } = await supabase
    .from("site_diaries")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiary;
}

// ─────────────────────────────────────────────
// Labor
// ─────────────────────────────────────────────

export async function getLabor(diaryId: string): Promise<SiteDiaryLabor[]> {
  const { data, error } = await supabase
    .from("site_diary_labor")
    .select("*")
    .eq("diary_id", diaryId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SiteDiaryLabor[];
}

export async function addLabor(
  diaryId: string,
  payload: AddLaborPayload
): Promise<SiteDiaryLabor> {
  const { data, error } = await supabase
    .from("site_diary_labor")
    .insert({
      diary_id: diaryId,
      trade_or_company: payload.trade_or_company.trim(),
      worker_count: payload.worker_count,
      hours_worked: payload.hours_worked,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiaryLabor;
}

export async function deleteLabor(laborId: string): Promise<void> {
  const { error } = await supabase
    .from("site_diary_labor")
    .delete()
    .eq("id", laborId);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// Equipment
// ─────────────────────────────────────────────

export async function getEquipment(diaryId: string): Promise<SiteDiaryEquipment[]> {
  const { data, error } = await supabase
    .from("site_diary_equipment")
    .select("*")
    .eq("diary_id", diaryId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SiteDiaryEquipment[];
}

export async function addEquipment(
  diaryId: string,
  payload: AddEquipmentPayload
): Promise<SiteDiaryEquipment> {
  const { data, error } = await supabase
    .from("site_diary_equipment")
    .insert({
      diary_id: diaryId,
      equipment_type: payload.equipment_type.trim(),
      quantity: payload.quantity,
      hours_used: payload.hours_used,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiaryEquipment;
}

export async function deleteEquipment(equipmentId: string): Promise<void> {
  const { error } = await supabase
    .from("site_diary_equipment")
    .delete()
    .eq("id", equipmentId);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// Photos
// ─────────────────────────────────────────────

const BUCKET = "diary_media";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

/** Upload a photo file to storage and insert a record into site_diary_photos. */
export async function uploadPhoto(
  diaryId: string,
  file: File,
  caption?: string | null
): Promise<SiteDiaryPhoto> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${diaryId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error: insertError } = await supabase
    .from("site_diary_photos")
    .insert({
      diary_id: diaryId,
      storage_path: storagePath,
      caption: caption?.trim() || null,
      uploaded_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (insertError) {
    // Attempt cleanup — fire and forget
    void supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  return data as SiteDiaryPhoto;
}

/** Fetch photo records and attach a signed URL for display. */
export async function getPhotos(diaryId: string): Promise<SiteDiaryPhoto[]> {
  const { data, error } = await supabase
    .from("site_diary_photos")
    .select("*")
    .eq("diary_id", diaryId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const photos = (data ?? []) as SiteDiaryPhoto[];
  if (photos.length === 0) return photos;

  // Batch-generate signed URLs
  const paths = photos.map((p) => p.storage_path);
  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);

  if (signedError) {
    // Return photos without URLs rather than failing entirely
    console.warn("[diary/client] Failed to generate signed URLs:", signedError.message);
    return photos;
  }

  const urlMap = new Map<string, string>(
    (signedData ?? [])
      .filter((s) => s.path !== null)
      .map((s) => [s.path as string, s.signedUrl])
  );

  return photos.map((p) => ({
    ...p,
    signedUrl: urlMap.get(p.storage_path) ?? undefined,
  }));
}

export async function deletePhoto(photo: SiteDiaryPhoto): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([photo.storage_path]);
  // Log but don't block on storage errors (orphan cleanup can be done separately)
  if (storageError) {
    console.warn("[diary/client] Storage delete error:", storageError.message);
  }

  const { error } = await supabase
    .from("site_diary_photos")
    .delete()
    .eq("id", photo.id);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

function sumAggregate(value: unknown): number {
  if (Array.isArray(value)) {
    const first = value[0] as Record<string, unknown> | undefined;
    const v = first?.sum ?? first?.worker_count ?? 0;
    return typeof v === "number" ? v : Number(v) || 0;
  }
  return typeof value === "number" ? value : Number(value) || 0;
}

function countAggregate(value: unknown): number {
  if (Array.isArray(value)) {
    const first = value[0] as Record<string, unknown> | undefined;
    const v = first?.count ?? 0;
    return typeof v === "number" ? v : Number(v) || 0;
  }
  return typeof value === "number" ? value : Number(value) || 0;
}
