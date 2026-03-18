"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────

export type WeatherCondition =
  | "sunny"
  | "partly_cloudy"
  | "overcast"
  | "rain"
  | "heavy_rain"
  | "extreme";

export type SiteStatus = "on_programme" | "at_risk" | "delayed";

export interface DailyReport {
  id: string;
  project_id: string;
  report_date: string;
  weather: WeatherCondition | null;
  temperature: number | null;
  site_status: SiteStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReportPayload {
  weather?: WeatherCondition | null;
  temperature?: number | null;
  site_status?: SiteStatus;
  notes?: string | null;
}

// ─── Query key ───────────────────────────────────────────────

function reportKey(projectId: string, date: string) {
  return ["siteplan", "daily-report", projectId, date];
}

// ─── Hook ────────────────────────────────────────────────────

/**
 * Loads and upserts the daily report for a given project + date.
 * Call `updateReport(payload)` to persist changes — callers are
 * responsible for debouncing if needed.
 */
export function useDailyReport(projectId: string, date: string) {
  const qc = useQueryClient();

  // Realtime subscription so other sessions see updates instantly
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`siteplan_daily_reports_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "siteplan_daily_reports",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          qc.invalidateQueries({
            queryKey: ["siteplan", "daily-report", projectId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, qc]);

  const query = useQuery<DailyReport | null>({
    queryKey: reportKey(projectId, date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("siteplan_daily_reports")
        .select("*")
        .eq("project_id", projectId)
        .eq("report_date", date)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!projectId && !!date,
  });

  const mutation = useMutation({
    mutationFn: async (payload: DailyReportPayload) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("siteplan_daily_reports")
        .upsert(
          {
            project_id: projectId,
            report_date: date,
            created_by: user?.id ?? null,
            ...payload,
          },
          { onConflict: "project_id,report_date" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as DailyReport;
    },
    onSuccess: (data) => {
      qc.setQueryData(reportKey(projectId, date), data);
    },
  });

  const updateReport = useCallback(
    (payload: DailyReportPayload) => {
      mutation.mutate(payload);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.mutate]
  );

  return {
    report: query.data,
    isLoading: query.isLoading,
    updateReport,
    isPending: mutation.isPending,
  };
}

// ─── Debounced auto-save helper ──────────────────────────────

const AUTOSAVE_MS = 800;

/**
 * Returns a debounced version of `updateReport` so text fields
 * don't fire a network request on every keystroke.
 */
export function useDebouncedReportSave(
  updateReport: (payload: DailyReportPayload) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (payload: DailyReportPayload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        updateReport(payload);
      }, AUTOSAVE_MS);
    },
    [updateReport]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return save;
}
