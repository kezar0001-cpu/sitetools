"use client";

/**
 * GPS Weather hook for auto-fetching weather based on device location
 * Falls back to manual entry when GPS unavailable
 */

import { useState, useCallback, useEffect } from "react";
import type { WeatherSnapshot, WeatherCondition } from "@/lib/diary/types";
import { DEFAULT_WEATHER, WEATHER_CONDITIONS } from "@/lib/diary/types";

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

// OpenWeatherMap condition mapping to our weather types
function mapWeatherCondition(owmCondition: string, owmId: number): WeatherCondition {
  // Thunderstorm
  if (owmId >= 200 && owmId < 300) return "storm";
  // Drizzle / Rain
  if (owmId >= 300 && owmId < 400) return "light-rain";
  if (owmId >= 500 && owmId < 600) return owmId < 502 ? "light-rain" : "heavy-rain";
  // Snow
  if (owmId >= 600 && owmId < 700) return "heavy-rain";
  // Atmosphere (fog, mist, haze)
  if (owmId >= 700 && owmId < 800) {
    if (owmId === 701 || owmId === 721 || owmId === 741) return "fog";
    if (owmId === 711 || owmId === 731 || owmId === 761) return "windy";
    return "overcast";
  }
  // Clear
  if (owmId === 800) return "sunny";
  // Clouds
  if (owmId > 800 && owmId < 900) {
    if (owmId === 801 || owmId === 802) return "partly-cloudy";
    return "overcast";
  }
  // Wind
  if (owmId >= 950 && owmId < 960) return "windy";

  // Fallback to string matching
  const condition = owmCondition.toLowerCase();
  if (condition.includes("thunder") || condition.includes("storm")) return "storm";
  if (condition.includes("heavy rain") || condition.includes("downpour")) return "heavy-rain";
  if (condition.includes("rain") || condition.includes("drizzle")) return "light-rain";
  if (condition.includes("snow") || condition.includes("sleet") || condition.includes("hail")) return "heavy-rain";
  if (condition.includes("fog") || condition.includes("mist")) return "fog";
  if (condition.includes("wind") || condition.includes("breez")) return "windy";
  if (condition.includes("overcast") || condition.includes("cloud") && condition.includes("heavy")) return "overcast";
  if (condition.includes("partly")) return "partly-cloudy";
  if (condition.includes("clear") || condition.includes("sunny")) return "sunny";

  return "partly-cloudy";
}

export function useGPSWeather(): GPSWeatherState & GPSWeatherActions {
  const [weather, setWeather] = useState<WeatherSnapshot>(DEFAULT_WEATHER);
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

      // Fetch weather from API
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
      if (!apiKey) {
        throw new Error("Weather API not configured");
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      // Map to our weather format
      const conditions = mapWeatherCondition(data.weather?.[0]?.main ?? "", data.weather?.[0]?.id ?? 0);
      const tempMin = data.main?.temp_min ? Math.round(data.main.temp_min) : null;
      const tempMax = data.main?.temp_max ? Math.round(data.main.temp_max) : null;
      const windSpeed = data.wind?.speed ? Math.round(data.wind.speed * 3.6) : null; // m/s to km/h
      const windDeg = data.wind?.deg;
      
      // Format wind string
      let wind: string | null = null;
      if (windSpeed) {
        const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const direction = windDeg ? directions[Math.round(windDeg / 45) % 8] : "";
        wind = `${windSpeed} km/h${direction ? ` ${direction}` : ""}`;
      }

      // Try to get location name
      try {
        const geoResponse = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`
        );
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData?.[0]?.name) {
            setLocationName(geoData[0].name);
          }
        }
      } catch {
        // Silent fail on reverse geocoding
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
    setWeather(DEFAULT_WEATHER);
    setError(null);
    setHasLocation(false);
    setLocationName(null);
  }, []);

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
