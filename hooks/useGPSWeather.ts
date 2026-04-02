"use client";

/**
 * GPS Weather hook using Open-Meteo (free, no API key required)
 * https://open-meteo.com/
 */

import { useState, useCallback } from "react";
import type { WeatherSnapshot, WeatherCondition } from "@/lib/diary/types";
import { DEFAULT_WEATHER } from "@/lib/diary/types";

export interface GPSWeatherState {
  weather: WeatherSnapshot;
  isLoading: boolean;
  error: string | null;
  hasLocation: boolean;
  locationName: string | null;
}

export interface GPSWeatherActions {
  fetchWeather: () => Promise<void>;
  setManualWeather: (weather: Partial<WeatherSnapshot>) => void;
  reset: () => void;
}

// WMO Weather interpretation codes (WW)
// https://open-meteo.com/en/docs
function mapWeatherCode(code: number): WeatherCondition {
  // 0: Clear sky
  if (code === 0) return "sunny";
  // 1, 2, 3: Mainly clear, partly cloudy, overcast
  if (code === 1) return "partly-cloudy";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "overcast";
  // 45, 48: Fog
  if (code === 45 || code === 48) return "fog";
  // 51, 53, 55: Drizzle
  if (code >= 51 && code <= 55) return "light-rain";
  // 56, 57: Freezing drizzle
  if (code === 56 || code === 57) return "light-rain";
  // 61, 63, 65: Rain
  if (code === 61) return "light-rain";
  if (code === 63 || code === 65) return "heavy-rain";
  // 66, 67: Freezing rain
  if (code === 66 || code === 67) return "heavy-rain";
  // 71, 73, 75: Snow fall
  if (code >= 71 && code <= 75) return "heavy-rain";
  // 77: Snow grains
  if (code === 77) return "heavy-rain";
  // 80, 81, 82: Rain showers
  if (code === 80) return "light-rain";
  if (code === 81 || code === 82) return "heavy-rain";
  // 85, 86: Snow showers
  if (code === 85 || code === 86) return "heavy-rain";
  // 95, 96, 99: Thunderstorm
  if (code >= 95) return "storm";

  return "partly-cloudy";
}

export function useGPSWeather(initialWeather?: WeatherSnapshot): GPSWeatherState & GPSWeatherActions {
  const [weather, setWeather] = useState<WeatherSnapshot>(initialWeather ?? DEFAULT_WEATHER);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get device location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        });
      });

      const { latitude, longitude } = position.coords;
      setHasLocation(true);

      // Fetch weather from Open-Meteo (free, no API key needed)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_min,temperature_2m_max&timezone=auto&forecast_days=1`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      // Extract current weather data
      const current = data.current;
      const daily = data.daily;

      // Map to our format
      const conditions = mapWeatherCode(current?.weather_code ?? 0);
      const tempMin = daily?.temperature_2m_min?.[0] ? Math.round(daily.temperature_2m_min[0]) : null;
      const tempMax = daily?.temperature_2m_max?.[0] ? Math.round(daily.temperature_2m_max[0]) : null;
      const windSpeed = current?.wind_speed_10m ? Math.round(current.wind_speed_10m) : null;
      const windDeg = current?.wind_direction_10m;

      // Format wind string
      let wind: string | null = null;
      if (windSpeed !== null) {
        const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const direction = windDeg ? directions[Math.round(windDeg / 45) % 8] : "";
        wind = `${windSpeed} km/h${direction ? ` ${direction}` : ""}`;
      }

      setWeather({
        conditions,
        temp_min: tempMin,
        temp_max: tempMax,
        wind,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch weather";
      setError(errorMsg);

      // Handle specific geolocation errors
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. Enable location services to auto-fetch weather.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location unavailable. Check your GPS signal.");
        } else if (err.code === err.TIMEOUT) {
          setError("Location request timed out. Try again.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setManualWeather = useCallback((partial: Partial<WeatherSnapshot>) => {
    setWeather((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setWeather(initialWeather ?? DEFAULT_WEATHER);
    setError(null);
    setHasLocation(false);
    setLocationName(null);
  }, [initialWeather]);

  return {
    weather,
    isLoading,
    error,
    hasLocation,
    locationName,
    fetchWeather,
    setManualWeather,
    reset,
  };
}
