/**
 * Timezone utilities and constants for site management
 * Focus on Australia/New Zealand timezones for construction industry
 */

export interface TimezoneOption {
  value: string; // IANA timezone identifier
  label: string; // Display name
  shortCode: string; // Short code like "AEST", "AEDT", "NZST"
  region: string; // Region for grouping (e.g., "Australia", "New Zealand")
}

/**
 * Common AU/NZ timezones for construction sites
 */
export const COMMON_TIMEZONES: TimezoneOption[] = [
  // Australia - Eastern
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)", shortCode: "AEST", region: "Australia" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)", shortCode: "AEST", region: "Australia" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)", shortCode: "AEST", region: "Australia" },
  { value: "Australia/Canberra", label: "Canberra (AEST/AEDT)", shortCode: "AEST", region: "Australia" },
  { value: "Australia/Hobart", label: "Hobart (AEST/AEDT)", shortCode: "AEST", region: "Australia" },

  // Australia - Central
  { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)", shortCode: "ACST", region: "Australia" },
  { value: "Australia/Darwin", label: "Darwin (ACST)", shortCode: "ACST", region: "Australia" },
  { value: "Australia/Broken_Hill", label: "Broken Hill (ACST/ACDT)", shortCode: "ACST", region: "Australia" },

  // Australia - Western
  { value: "Australia/Perth", label: "Perth (AWST)", shortCode: "AWST", region: "Australia" },
  { value: "Australia/Eucla", label: "Eucla (ACWST)", shortCode: "ACWST", region: "Australia" },

  // New Zealand
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)", shortCode: "NZST", region: "New Zealand" },
  { value: "Pacific/Wellington", label: "Wellington (NZST/NZDT)", shortCode: "NZST", region: "New Zealand" },
  { value: "Pacific/Christchurch", label: "Christchurch (NZST/NZDT)", shortCode: "NZST", region: "New Zealand" },
  { value: "Pacific/Chatham", label: "Chatham Islands (CHAST/CHADT)", shortCode: "CHAST", region: "New Zealand" },

  // Pacific Islands (common for construction)
  { value: "Pacific/Fiji", label: "Fiji (FJT/FJST)", shortCode: "FJT", region: "Pacific" },
  { value: "Pacific/Guam", label: "Guam (ChST)", shortCode: "ChST", region: "Pacific" },
  { value: "Pacific/Noumea", label: "New Caledonia (NCT)", shortCode: "NCT", region: "Pacific" },
  { value: "Pacific/Port_Moresby", label: "Papua New Guinea (PGT)", shortCode: "PGT", region: "Pacific" },
];

/**
 * Get the browser's detected timezone using Intl API
 * Falls back to Australia/Sydney if detection fails
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Australia/Sydney";
  }
}

/**
 * Get the default timezone for new sites
 * Uses browser timezone if it's in our common list, otherwise defaults to Australia/Sydney
 */
export function getDefaultTimezone(): string {
  const browserTz = getBrowserTimezone();
  const isKnown = COMMON_TIMEZONES.some((tz) => tz.value === browserTz);
  return isKnown ? browserTz : "Australia/Sydney";
}

/**
 * Get timezone option by IANA value
 */
export function getTimezoneOption(value: string): TimezoneOption | undefined {
  return COMMON_TIMEZONES.find((tz) => tz.value === value);
}

/**
 * Get a short display code for a timezone (e.g., "AEST", "NZST")
 * Falls back to the IANA identifier last segment if not in our list
 */
export function getTimezoneShortCode(timezone: string | null | undefined): string {
  if (!timezone) return "UTC";

  const option = getTimezoneOption(timezone);
  if (option) return option.shortCode;

  // Fallback: extract last part of IANA identifier
  const parts = timezone.split("/");
  return parts[parts.length - 1] || "UTC";
}

/**
 * Format a date according to the site's timezone
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = timezone || "Australia/Sydney";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  try {
    return new Intl.DateTimeFormat("en-AU", {
      ...defaultOptions,
      timeZone: tz,
    }).format(d);
  } catch {
    // Fallback if timezone is invalid
    return new Intl.DateTimeFormat("en-AU", defaultOptions).format(d);
  }
}

/**
 * Group timezones by region for dropdown display
 */
export function getTimezonesByRegion(): Record<string, TimezoneOption[]> {
  return COMMON_TIMEZONES.reduce((acc, tz) => {
    if (!acc[tz.region]) acc[tz.region] = [];
    acc[tz.region].push(tz);
    return acc;
  }, {} as Record<string, TimezoneOption[]>);
}
