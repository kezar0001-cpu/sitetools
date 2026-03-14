import type {
  AddEquipmentPayload,
  AddLaborPayload,
  CreateDiaryPayload,
  UpdateDiaryPayload,
  WeatherCondition,
} from "./types";
import { WEATHER_CONDITIONS } from "./types";

// ── Validation result ──
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

function ok(): ValidationResult {
  return { valid: true, errors: {} };
}

function fail(errors: Record<string, string>): ValidationResult {
  return { valid: false, errors };
}

// ── Helpers ──
function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidWeatherCondition(value: unknown): value is WeatherCondition {
  return typeof value === "string" && WEATHER_CONDITIONS.includes(value as WeatherCondition);
}

// ── Diary validators ──
export function validateCreateDiary(payload: Partial<CreateDiaryPayload>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!payload.company_id || typeof payload.company_id !== "string") {
    errors.company_id = "Company ID is required.";
  }

  if (payload.date !== undefined && !isValidDate(payload.date)) {
    errors.date = "Date must be a valid date (YYYY-MM-DD).";
  }

  if (payload.weather?.conditions !== undefined && !isValidWeatherCondition(payload.weather.conditions)) {
    errors["weather.conditions"] = "Invalid weather condition.";
  }

  if (
    payload.weather?.temp_min !== undefined &&
    payload.weather.temp_min !== null &&
    !Number.isFinite(payload.weather.temp_min)
  ) {
    errors["weather.temp_min"] = "Min temperature must be a number.";
  }

  if (
    payload.weather?.temp_max !== undefined &&
    payload.weather.temp_max !== null &&
    !Number.isFinite(payload.weather.temp_max)
  ) {
    errors["weather.temp_max"] = "Max temperature must be a number.";
  }

  if (
    payload.weather?.temp_min !== undefined &&
    payload.weather?.temp_max !== undefined &&
    payload.weather.temp_min !== null &&
    payload.weather.temp_max !== null &&
    payload.weather.temp_min > payload.weather.temp_max
  ) {
    errors["weather.temp_min"] = "Min temperature cannot exceed max temperature.";
  }

  return Object.keys(errors).length === 0 ? ok() : fail(errors);
}

export function validateUpdateDiary(payload: Partial<UpdateDiaryPayload>): ValidationResult {
  const errors: Record<string, string> = {};

  if (payload.date !== undefined && !isValidDate(payload.date)) {
    errors.date = "Date must be a valid date (YYYY-MM-DD).";
  }

  if (payload.weather?.conditions !== undefined && !isValidWeatherCondition(payload.weather.conditions)) {
    errors["weather.conditions"] = "Invalid weather condition.";
  }

  if (
    payload.weather?.temp_min !== undefined &&
    payload.weather.temp_min !== null &&
    !Number.isFinite(payload.weather.temp_min)
  ) {
    errors["weather.temp_min"] = "Min temperature must be a number.";
  }

  if (
    payload.weather?.temp_max !== undefined &&
    payload.weather.temp_max !== null &&
    !Number.isFinite(payload.weather.temp_max)
  ) {
    errors["weather.temp_max"] = "Max temperature must be a number.";
  }

  if (
    payload.weather?.temp_min !== undefined &&
    payload.weather?.temp_max !== undefined &&
    payload.weather.temp_min !== null &&
    payload.weather.temp_max !== null &&
    payload.weather.temp_min > payload.weather.temp_max
  ) {
    errors["weather.temp_min"] = "Min temperature cannot exceed max temperature.";
  }

  return Object.keys(errors).length === 0 ? ok() : fail(errors);
}

// ── Labor validator ──
export function validateLabor(payload: Partial<AddLaborPayload>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!payload.trade_or_company || payload.trade_or_company.trim().length === 0) {
    errors.trade_or_company = "Trade or company name is required.";
  }

  if (
    payload.worker_count === undefined ||
    !Number.isInteger(payload.worker_count) ||
    payload.worker_count < 1
  ) {
    errors.worker_count = "Worker count must be a whole number of at least 1.";
  }

  if (
    payload.hours_worked === undefined ||
    !Number.isFinite(payload.hours_worked) ||
    payload.hours_worked <= 0
  ) {
    errors.hours_worked = "Hours worked must be greater than 0.";
  }

  return Object.keys(errors).length === 0 ? ok() : fail(errors);
}

// ── Equipment validator ──
export function validateEquipment(payload: Partial<AddEquipmentPayload>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!payload.equipment_type || payload.equipment_type.trim().length === 0) {
    errors.equipment_type = "Equipment type is required.";
  }

  if (
    payload.quantity === undefined ||
    !Number.isInteger(payload.quantity) ||
    payload.quantity < 1
  ) {
    errors.quantity = "Quantity must be a whole number of at least 1.";
  }

  if (
    payload.hours_used === undefined ||
    !Number.isFinite(payload.hours_used) ||
    payload.hours_used <= 0
  ) {
    errors.hours_used = "Hours used must be greater than 0.";
  }

  return Object.keys(errors).length === 0 ? ok() : fail(errors);
}

// ── Photo validator ──
export function validatePhotoFile(file: File): ValidationResult {
  const errors: Record<string, string> = {};
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.file = "Only JPEG, PNG, WebP, HEIC, or HEIF images are allowed.";
  }

  if (file.size > MAX_SIZE_BYTES) {
    errors.file = `File size must not exceed 20 MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`;
  }

  return Object.keys(errors).length === 0 ? ok() : fail(errors);
}
