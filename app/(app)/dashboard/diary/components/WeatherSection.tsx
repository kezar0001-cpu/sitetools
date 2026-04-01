"use client";

import { useEffect } from "react";
import { updateDiary } from "@/lib/diary/client";
import {
  WEATHER_CONDITIONS,
  WEATHER_CONDITION_ICONS,
  WEATHER_CONDITION_LABELS,
} from "@/lib/diary/types";
import type { SiteDiaryFull, WeatherCondition } from "@/lib/diary/types";
import { useGPSWeather } from "@/hooks/useGPSWeather";
import { SectionHeader } from "./SectionHeader";

interface WeatherSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: SiteDiaryFull) => void;
  saving: Record<string, boolean>;
  setSaving: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

export function WeatherSection({
  diary,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
  saving,
  setSaving,
}: WeatherSectionProps) {
  const { weather: gpsWeather, isLoading: weatherLoading, error: weatherError, fetchWeather } = useGPSWeather();

  // Apply GPS weather when fetched
  useEffect(() => {
    if (gpsWeather.conditions && !isLocked) {
      void autosave("weather", async () => {
        const updated = await updateDiary(diary.id, { weather: gpsWeather });
        return { ...diary, ...updated };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsWeather.conditions, gpsWeather.temp_min, gpsWeather.temp_max, gpsWeather.wind]);

  async function autosave(field: string, updater: () => Promise<SiteDiaryFull>) {
    setSaving((s) => ({ ...s, [field]: true }));
    try {
      const updated = await updater();
      onUpdate(updated);
    } catch (err) {
      console.error("[WeatherSection] autosave error:", err);
    } finally {
      setSaving((s) => ({ ...s, [field]: false }));
    }
  }

  function handleWeatherCondition(conditions: WeatherCondition) {
    void autosave("weather", async () => {
      const updated = await updateDiary(diary.id, { weather: { ...diary.weather, conditions } });
      return { ...diary, ...updated };
    });
  }

  function handleTempBlur(field: "temp_min" | "temp_max", raw: string) {
    const value = raw === "" ? null : Number(raw);
    if (raw !== "" && Number.isNaN(value)) return;
    void autosave(`weather.${field}`, async () => {
      const updated = await updateDiary(diary.id, { weather: { ...diary.weather, [field]: value } });
      return { ...diary, ...updated };
    });
  }

  function handleWindBlur(wind: string) {
    void autosave("weather.wind", async () => {
      const updated = await updateDiary(diary.id, {
        weather: { ...diary.weather, wind: wind.trim() || null },
      });
      return { ...diary, ...updated };
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Weather"
          icon={<span className="text-lg">🌤️</span>}
          open={isOpen}
          onToggle={onToggle}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 space-y-4 border-t border-slate-100">
          {/* GPS Weather fetch button */}
          {!isLocked && (
            <div className="pt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={fetchWeather}
                disabled={weatherLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-100 text-sky-700 font-medium hover:bg-sky-200 transition-colors disabled:opacity-60"
              >
                {weatherLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {weatherLoading ? "Fetching..." : "Use GPS Weather"}
              </button>
              {weatherError && (
                <span className="text-xs text-red-600">{weatherError}</span>
              )}
            </div>
          )}

          {/* Condition picker */}
          <div className="pt-4">
            <p className="text-sm font-medium text-slate-600 mb-2">Conditions</p>
            <div className="flex flex-wrap gap-2">
              {WEATHER_CONDITIONS.map((cond) => {
                const active = diary.weather?.conditions === cond;
                return (
                  <button
                    key={cond}
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleWeatherCondition(cond)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      active
                        ? "bg-amber-400 border-amber-400 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                    } ${saving["weather"] ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    <span>{WEATHER_CONDITION_ICONS[cond]}</span>
                    <span>{WEATHER_CONDITION_LABELS[cond]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Temp + Wind */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Min °C</label>
              <input
                type="number"
                inputMode="numeric"
                disabled={isLocked}
                defaultValue={diary.weather?.temp_min ?? ""}
                onBlur={(e) => handleTempBlur("temp_min", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                placeholder="e.g. 14"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Max °C</label>
              <input
                type="number"
                inputMode="numeric"
                disabled={isLocked}
                defaultValue={diary.weather?.temp_max ?? ""}
                onBlur={(e) => handleTempBlur("temp_max", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                placeholder="e.g. 28"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Wind</label>
            <input
              type="text"
              disabled={isLocked}
              defaultValue={diary.weather?.wind ?? ""}
              onBlur={(e) => handleWindBlur(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
              placeholder="e.g. 15–20 km/h NW"
            />
          </div>
        </div>
      )}
    </div>
  );
}
