import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type CmsHeroMediaSettings = {
  heroVideoUrl: string;
  heroVideoPosterUrl: string;
  heroCardImageUrl: string;
};

const SETTINGS_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "cms-hero-media.json");

function sanitizeLocalAssetPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();

  if (!normalized.startsWith("/")) {
    return fallback;
  }

  return normalized;
}

function sanitizeVideoPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();

  if (normalized.startsWith("/") || normalized.startsWith("https://") || normalized.startsWith("http://")) {
    return normalized;
  }

  return fallback;
}

export function mergeHeroMediaSettings(
  defaults: CmsHeroMediaSettings,
  candidate?: Partial<CmsHeroMediaSettings> | null,
): CmsHeroMediaSettings {
  return {
    heroVideoUrl: sanitizeVideoPath(candidate?.heroVideoUrl, defaults.heroVideoUrl),
    heroVideoPosterUrl: sanitizeLocalAssetPath(candidate?.heroVideoPosterUrl, defaults.heroVideoPosterUrl),
    heroCardImageUrl: sanitizeLocalAssetPath(candidate?.heroCardImageUrl, defaults.heroCardImageUrl),
  };
}

export async function readCmsHeroMediaSettings(
  defaults: CmsHeroMediaSettings,
): Promise<CmsHeroMediaSettings> {
  try {
    const content = await readFile(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(content) as Partial<CmsHeroMediaSettings>;
    return mergeHeroMediaSettings(defaults, parsed);
  } catch {
    return defaults;
  }
}

export async function saveCmsHeroMediaSettings(
  values: Partial<CmsHeroMediaSettings>,
  defaults: CmsHeroMediaSettings,
): Promise<CmsHeroMediaSettings> {
  const merged = mergeHeroMediaSettings(defaults, values);
  await mkdir(SETTINGS_DIR, { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}
