import { supabase } from "@/lib/supabase";
import { DEFAULT_WEATHER } from "./types";
import {
  AddEquipmentPayload,
  AddIssuePayload,
  AddLaborPayload,
  CreateDiaryPayload,
  SiteDiary,
  SiteDiaryEquipment,
  SiteDiaryFull,
  SiteDiaryIssue,
  SiteDiaryLabor,
  SiteDiaryPhoto,
  SiteDiaryWithCounts,
  UpdateDiaryPayload,
  WeatherSnapshot,
} from "./types";
import { getSiteById } from "@/lib/workspace/client";

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

  if (!error) {
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

  // Fallback: if PostgREST aggregates are not supported or FK relationship isn't recognised,
  // query just the diaries without counts.
  let fallbackQuery = supabase
    .from("site_diaries")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (projectId) {
    fallbackQuery = fallbackQuery.eq("project_id", projectId);
  }

  const { data: fallbackData, error: fallbackError } = await fallbackQuery;
  if (fallbackError) throw fallbackError;

  return (fallbackData ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as SiteDiary),
    weather: (row.weather as WeatherSnapshot) ?? DEFAULT_WEATHER,
    total_workers: 0,
    total_labor_rows: 0,
    total_equipment_rows: 0,
    total_photos: 0,
  })) as SiteDiaryWithCounts[];
}

/** List diaries grouped by project and site for organized display */
export async function getDiariesGroupedByProjectSite(
  companyId: string,
  projectId?: string | null
): Promise<{
  projects: Array<{
    id: string;
    name: string;
    sites: Array<{
      id: string;
      name: string;
      diaries: SiteDiaryWithCounts[];
    }>;
    unassignedDiaries: SiteDiaryWithCounts[];
  }>;
  unassignedDiaries: SiteDiaryWithCounts[];
}> {
  const allDiaries = await getDiaries(companyId, projectId);
  
  // Get projects and sites for mapping
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId);
    
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, project_id")
    .eq("company_id", companyId);

  const projectMap = new Map((projects ?? []).map(p => [p.id, p.name]));
  const siteMap = new Map((sites ?? []).map(s => [s.id, { name: s.name, project_id: s.project_id }]));

  // Group diaries
  const projectGroups = new Map<string, SiteDiaryWithCounts[]>();
  const unassignedDiaries: SiteDiaryWithCounts[] = [];

  allDiaries.forEach(diary => {
    if (diary.project_id && projectMap.has(diary.project_id)) {
      if (!projectGroups.has(diary.project_id)) {
        projectGroups.set(diary.project_id, []);
      }
      projectGroups.get(diary.project_id)!.push(diary);
    } else {
      unassignedDiaries.push(diary);
    }
  });

  // Build final structure
  const result = {
    projects: Array.from(projectGroups.entries()).map(([projectId, projectDiaries]) => {
      const siteGroups = new Map<string, SiteDiaryWithCounts[]>();
      const projectUnassigned: SiteDiaryWithCounts[] = [];

      projectDiaries.forEach(diary => {
        if (diary.site_id) {
          if (!siteGroups.has(diary.site_id)) {
            siteGroups.set(diary.site_id, []);
          }
          siteGroups.get(diary.site_id)!.push(diary);
        } else {
          projectUnassigned.push(diary);
        }
      });

      return {
        id: projectId,
        name: projectMap.get(projectId) || 'Unknown Project',
        sites: Array.from(siteGroups.entries()).map(([siteId, siteDiaries]) => ({
          id: siteId,
          name: siteMap.get(siteId)?.name || 'Unknown Site',
          diaries: siteDiaries
        })),
        unassignedDiaries: projectUnassigned
      };
    }),
    unassignedDiaries
  };

  return result;
}

/** Fetch a single diary with all related rows. Photos are returned without signed URLs;
 *  call getDiaryPhotoUrls() separately on the detail view mount to get fresh 7-day signed URLs. */
export async function getDiaryById(id: string): Promise<SiteDiaryFull | null> {
  try {
    const { data, error } = await supabase
      .from("site_diaries")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[diary/client] getDiaryById error:", error.code, error.message);
      if (error.code === "PGRST116") return null; // row not found
      throw error;
    }

    const diary = data as SiteDiary;

    const [labor, equipment, issues] = await Promise.all([
      getLabor(id),
      getEquipment(id),
      getIssues(id),
    ]);

    const photos = await getPhotos(id);

    return {
      ...diary,
      weather: (diary.weather as WeatherSnapshot) ?? DEFAULT_WEATHER,
      labor,
      equipment,
      photos,
      issues,
    };
  } catch (err) {
    console.error("[diary/client] getDiaryById failed:", err instanceof Error ? err.message : err);
    throw err;
  }
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

/** Archive a diary entry (soft archive by changing status). */
export async function archiveDiary(id: string): Promise<SiteDiary> {
  const { data, error } = await supabase
    .from("site_diaries")
    .update({
      status: "archived",
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiary;
}

/** Restore an archived diary to draft status. */
export async function restoreDiary(id: string): Promise<SiteDiary> {
  const { data, error } = await supabase
    .from("site_diaries")
    .update({
      status: "draft",
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiary;
}

/** Delete a diary entry permanently (admin/owner only). 
 * This will cascade delete all related records (labor, equipment, photos, issues).
 */
export async function deleteDiary(id: string): Promise<void> {
  const { error } = await supabase
    .from("site_diaries")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

/** Update an existing diary entry. */
export async function updateDiary(id: string, payload: UpdateDiaryPayload): Promise<SiteDiary> {
  const updates: Record<string, unknown> = {};

  if (payload.project_id !== undefined) updates.project_id = payload.project_id;
  if (payload.site_id !== undefined) updates.site_id = payload.site_id;
  if (payload.date !== undefined) updates.date = payload.date;
  if (payload.notes !== undefined) updates.notes = payload.notes;
  if (payload.work_completed !== undefined) updates.work_completed = payload.work_completed;
  if (payload.planned_works !== undefined) updates.planned_works = payload.planned_works;
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
// Issues
// ─────────────────────────────────────────────

export async function getIssues(diaryId: string): Promise<SiteDiaryIssue[]> {
  const { data, error } = await supabase
    .from("site_diary_issues")
    .select("*")
    .eq("diary_id", diaryId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SiteDiaryIssue[];
}

export async function addIssue(
  diaryId: string,
  payload: AddIssuePayload
): Promise<SiteDiaryIssue> {
  const { data, error } = await supabase
    .from("site_diary_issues")
    .insert({
      diary_id: diaryId,
      type: payload.type,
      description: payload.description.trim(),
      responsible_party: payload.responsible_party?.trim() || null,
      delay_hours: payload.delay_hours ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteDiaryIssue;
}

export async function deleteIssue(issueId: string): Promise<void> {
  const { error } = await supabase
    .from("site_diary_issues")
    .delete()
    .eq("id", issueId);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// Photos
// ─────────────────────────────────────────────

const BUCKET = "diary_media";
const SIGNED_URL_TTL = 60 * 60; // 1 hour (used for temporary URLs when needed)

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
      .filter((s: { path: string | null; signedUrl: string }) => s.path !== null)
      .map((s: { path: string | null; signedUrl: string }) => [s.path as string, s.signedUrl])
  );

  return photos.map((p) => ({
    ...p,
    signedUrl: urlMap.get(p.storage_path) ?? undefined,
  }));
}

/**
 * Fetch photo records with fresh 7-day signed URLs by calling the
 * `get-diary-photo-urls` Edge Function. Call this on diary detail view mount
 * instead of relying on any cached or bundled URLs.
 */
export async function getDiaryPhotoUrls(diaryId: string): Promise<SiteDiaryPhoto[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || !token) {
      // Fall back to client-side signed URL generation if env/auth not available
      return getPhotos(diaryId);
    }

    const functionUrl = `${supabaseUrl}/functions/v1/get-diary-photo-urls`;

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ diary_id: diaryId }),
    });

    if (!res.ok) {
      console.warn("[diary/client] get-diary-photo-urls returned", res.status, "— falling back to client-side generation");
      return getPhotos(diaryId);
    }

    const json = await res.json() as { photos?: SiteDiaryPhoto[] };
    return json.photos ?? [];
  } catch (err) {
    // Network/fetch errors - fall back to client-side generation
    console.warn("[diary/client] Edge function fetch failed:", err instanceof Error ? err.message : err);
    return getPhotos(diaryId);
  }
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
// Equipment Catalog & AI Parsing
// ─────────────────────────────────────────────

import type { EquipmentCatalog, ParsedEquipment } from "./types";

/** Fetch company's equipment catalog for memory/reuse feature */
export async function getEquipmentCatalog(companyId: string): Promise<EquipmentCatalog[]> {
  const { data, error } = await supabase
    .from("equipment_catalog")
    .select("*")
    .eq("company_id", companyId)
    .order("equipment_type", { ascending: true });

  if (error) {
    console.error("[diary/client] getEquipmentCatalog error:", error.message);
    throw error;
  }
  return (data ?? []) as EquipmentCatalog[];
}

/** Add equipment to company catalog */
export async function addEquipmentCatalog(
  companyId: string,
  equipment: Omit<EquipmentCatalog, "id" | "company_id" | "created_at" | "updated_at">
): Promise<EquipmentCatalog> {
  const { data, error } = await supabase
    .from("equipment_catalog")
    .upsert({
      company_id: companyId,
      equipment_type: equipment.equipment_type.trim(),
      default_quantity: equipment.default_quantity ?? 1,
      default_hours: equipment.default_hours ?? 8,
      category: equipment.category?.trim() || null,
    }, { onConflict: "company_id,equipment_type" })
    .select()
    .single();

  if (error) {
    console.error("[diary/client] addEquipmentCatalog error:", error.message);
    throw error;
  }
  return data as EquipmentCatalog;
}

/** Delete equipment from catalog */
export async function deleteEquipmentCatalog(id: string): Promise<void> {
  const { error } = await supabase
    .from("equipment_catalog")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * Parse natural language equipment input using rule-based AI
 * Examples:
 * - "30t excavator, 2 units, 8 hours" → { equipment_type: "30t Excavator", quantity: 2, hours_used: 8 }
 * - "concrete mixer 5 hours" → { equipment_type: "Concrete Mixer", quantity: 1, hours_used: 5 }
 * - "3 dump trucks" → { equipment_type: "Dump Truck", quantity: 3, hours_used: 8 }
 */
export function parseNaturalLanguageEquipment(input: string): ParsedEquipment[] {
  const results: ParsedEquipment[] = [];
  
  // Split by common separators (comma, semicolon, newline, "and")
  const items = input.split(/[,;\n]|\band\b/i).map(s => s.trim()).filter(Boolean);
  
  for (const item of items) {
    const parsed = parseSingleEquipment(item);
    if (parsed) {
      results.push(parsed);
    }
  }
  
  return results;
}

/** Parse a single equipment item from natural language */
function parseSingleEquipment(input: string): ParsedEquipment | null {
  if (!input || input.length < 2) return null;
  
  let equipment_type = input;
  let quantity = 1;
  let hours_used = 8; // Default hours
  let category: string | null = null;
  
  // Extract hours - patterns: "X hours", "X hrs", "X hr", "Xh"
  const hoursMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  if (hoursMatch) {
    hours_used = parseFloat(hoursMatch[1]);
    equipment_type = equipment_type.replace(hoursMatch[0], "").trim();
  }
  
  // Extract quantity - patterns: "X units", "X qty", number at start
  const qtyUnitMatch = input.match(/(\d+)\s*(?:units?|qty|quantity|pcs?|pieces?)\b/i);
  if (qtyUnitMatch) {
    quantity = parseInt(qtyUnitMatch[1], 10);
    equipment_type = equipment_type.replace(qtyUnitMatch[0], "").trim();
  } else {
    // Check for number at the very start (e.g., "3 excavators")
    const startNumMatch = equipment_type.match(/^(\d+)\s+/);
    if (startNumMatch) {
      quantity = parseInt(startNumMatch[1], 10);
      equipment_type = equipment_type.replace(startNumMatch[0], "").trim();
    }
  }
  
  // Clean up equipment type
  equipment_type = equipment_type
    .replace(/\s+/g, " ") // Normalize spaces
    .replace(/^(?:of|with)\s+/i, "") // Remove leading "of" or "with"
    .trim();
  
  // Capitalize first letter of each word
  equipment_type = equipment_type.replace(/\b\w/g, c => c.toUpperCase());
  
  // Detect category based on keywords
  const lowerType = equipment_type.toLowerCase();
  if (/excavator|dozer|bulldozer|loader|grader|compactor|roller|crane|plant/i.test(lowerType)) {
    category = "Plant";
  } else if (/truck|ute|van|vehicle|car|forklift/i.test(lowerType)) {
    category = "Vehicle";
  } else if (/mixer|pump|generator|compressor|saw|drill|tool/i.test(lowerType)) {
    category = "Equipment";
  }
  
  if (!equipment_type) return null;
  
  return {
    equipment_type,
    quantity,
    hours_used,
    category,
  };
}

/**
 * Update existing equipment entry
 */
export async function updateEquipment(
  id: string,
  updates: Partial<Pick<SiteDiaryEquipment, "equipment_type" | "quantity" | "hours_used">>
): Promise<SiteDiaryEquipment> {
  const { data, error } = await supabase
    .from("site_diary_equipment")
    .update({
      ...updates,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[diary/client] updateEquipment error:", error.message);
    throw error;
  }
  return data as SiteDiaryEquipment;
}

// ─────────────────────────────────────────────
// SiteSign Integration - Labor Import
// ─────────────────────────────────────────────

export interface SiteSignLaborEntry {
  company_name: string;
  worker_count: number;
  total_hours: number;
  workers: Array<{
    full_name: string;
    hours: number;
    signed_in_at: string;
    signed_out_at: string | null;
  }>;
}

/**
 * Fetch SiteSign visitor records for a site on a specific date,
 * aggregating workers by company name for diary labor entry.
 */
export async function getSiteSignLabor(
  siteId: string,
  date: string // ISO date: YYYY-MM-DD (local date at site)
): Promise<SiteSignLaborEntry[]> {
  // Fetch site to get timezone
  const site = await getSiteById(siteId);
  const timezone = site?.timezone || 'Australia/Sydney';
  
  // Convert local date to UTC range based on site's timezone
  // This ensures we query the correct UTC times that correspond to the site's local day
  const startOfDayLocal = new Date(`${date}T00:00:00`);
  const endOfDayLocal = new Date(`${date}T23:59:59.999`);
  
  // Format as ISO strings for query (these will be interpreted as local times)
  const startRange = startOfDayLocal.toISOString().slice(0, 10) + 'T00:00:00';
  const endRange = endOfDayLocal.toISOString().slice(0, 10) + 'T23:59:59';

  console.log('[getSiteSignLabor] Site timezone:', timezone, 'Local date:', date);
  console.log('[getSiteSignLabor] Query range:', startRange, 'to', endRange);

  const { data, error } = await supabase
    .from('site_visits')
    .select('company_name, full_name, signed_in_at, signed_out_at')
    .eq('site_id', siteId)
    .in('visitor_type', ['Worker', 'Subcontractor'])
    .gte('signed_in_at', startRange)
    .lte('signed_in_at', endRange)
    .order('company_name', { ascending: true });

  if (error) {
    console.error('[diary/client] getSiteSignLabor error:', error.message);
    throw error;
  }

  const visits = data ?? [];
  console.log('[getSiteSignLabor] Raw visits returned:', visits.length);
  visits.forEach((v, i) => {
    console.log(`[getSiteSignLabor] Raw[${i}]: ${v.full_name} | ${v.company_name} | ${v.signed_in_at}`);
  });

  if (visits.length === 0) return [];

  // Filter to only include visits that fall on the requested local date
  // by checking the UTC timestamp converted to site's local date
  const siteDateVisits = visits.filter((v) => {
    const visitDate = new Date(v.signed_in_at);
    // Format the UTC timestamp as a date string in the site's timezone
    const visitLocalDate = visitDate.toLocaleDateString('en-AU', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').reverse().join('-'); // Convert DD/MM/YYYY to YYYY-MM-DD
    const matches = visitLocalDate === date;
    console.log(`[getSiteSignLabor] Filter: ${v.full_name} | UTC: ${v.signed_in_at} | Local: ${visitLocalDate} | Target: ${date} | Match: ${matches}`);
    return matches;
  });

  console.log('[getSiteSignLabor] Visits after date filter:', siteDateVisits.length);

  if (siteDateVisits.length === 0) return [];

  // Group by company_name (normalized to lowercase)
  const grouped = new Map<string, typeof siteDateVisits>();
  for (const visit of siteDateVisits) {
    const key = (visit.company_name?.trim() || 'Unknown').toLowerCase();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(visit);
  }

  console.log('[getSiteSignLabor] Grouped by company:', grouped.size, 'companies');
  grouped.forEach((visits, company) => {
    console.log(`[getSiteSignLabor] Company "${company}": ${visits.length} visits`, visits.map(v => v.full_name));
  });

  // Calculate hours and build result
  const results: SiteSignLaborEntry[] = [];
  grouped.forEach((companyVisits, company_name) => {
    let totalHours = 0;
    const workers = companyVisits.map((v: { full_name: string; signed_in_at: string; signed_out_at: string | null }) => {
      const signedIn = new Date(v.signed_in_at);
      const signedOut = v.signed_out_at ? new Date(v.signed_out_at) : null;
      const hours = signedOut
        ? Math.round(((signedOut.getTime() - signedIn.getTime()) / (1000 * 60 * 60)) * 10) / 10
        : 0;
      totalHours += hours;
      return {
        full_name: v.full_name,
        hours,
        signed_in_at: v.signed_in_at,
        signed_out_at: v.signed_out_at,
      };
    });

    results.push({
      company_name,
      worker_count: workers.length,
      total_hours: Math.round(totalHours * 10) / 10,
      workers,
    });
  });

  console.log('[getSiteSignLabor] Final results:', results);
  return results;
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
