/**
 * CMS credential store.
 *
 * Priority:
 *   1. cms-credentials.json  (written by the /cms/recover tool — gitignored)
 *   2. CMS_ADMIN_* environment variables
 *   3. Hard-coded development defaults
 *
 * This file is server-only — never import it from client components.
 */

import fs from "fs";
import path from "path";

const CREDENTIALS_FILE = path.join(process.cwd(), "cms-credentials.json");

interface CmsCredentials {
  username: string;
  password: string;
}

function readCredentialsFile(): CmsCredentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) return null;
    const raw = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "username" in parsed &&
      "password" in parsed &&
      typeof (parsed as Record<string, unknown>).username === "string" &&
      typeof (parsed as Record<string, unknown>).password === "string"
    ) {
      return parsed as CmsCredentials;
    }
    return null;
  } catch {
    return null;
  }
}

export function getCmsCredentials(): CmsCredentials {
  const fromFile = readCredentialsFile();
  if (fromFile) return fromFile;

  return {
    username: process.env.CMS_ADMIN_USERNAME ?? "admin",
    password: process.env.CMS_ADMIN_PASSWORD ?? "admin123",
  };
}

export function writeCmsCredentials(credentials: CmsCredentials): void {
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2) + "\n", "utf-8");
}

/** Returns true when a recovery token has been configured in the environment. */
export function recoveryEnabled(): boolean {
  const token = process.env.CMS_RECOVERY_TOKEN ?? "";
  return token.length >= 16;
}

/** Validates the supplied token against the environment variable. */
export function validateRecoveryToken(token: string): boolean {
  const configured = process.env.CMS_RECOVERY_TOKEN ?? "";
  if (configured.length < 16) return false;
  return token === configured;
}
