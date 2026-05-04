import { createHash, randomBytes, timingSafeEqual } from "crypto";

const DEFAULT_BASE_URL = "http://localhost:3001";

export function createActionRegisterToken(): string {
    return randomBytes(32).toString("base64url");
}

export function hashActionRegisterToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function isValidActionRegisterToken(token: string | null | undefined, tokenHash: string | null | undefined): boolean {
    if (!token || !tokenHash) return false;

    const candidate = hashActionRegisterToken(token);
    const candidateBuffer = Buffer.from(candidate, "hex");
    const storedBuffer = Buffer.from(tokenHash, "hex");

    if (candidateBuffer.length !== storedBuffer.length) return false;
    return timingSafeEqual(candidateBuffer, storedBuffer);
}

export function buildActionRegisterClientUrl(linkId: string, token: string, origin?: string): string {
    const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL;
    return `${baseUrl.replace(/\/$/, "")}/client/action-register/${linkId}?token=${encodeURIComponent(token)}`;
}