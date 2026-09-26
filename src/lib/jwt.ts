import type { BackendUser } from "@/services/api";

export interface JwtTokenPayload {
  user?: Partial<BackendUser>;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string;
  [key: string]: unknown;
}

/**
 * Decodes the JSON payload from a standard or URL-safe base64 JWT token.
 * Does not perform cryptographic signature verification (handled by backend).
 */
export function decodeJwtPayload(token: string): JwtTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    base64 += "=".repeat(padLength);

    let jsonPayload: string;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      jsonPayload = new TextDecoder("utf-8").decode(bytes);
    } catch {
      jsonPayload = atob(base64);
    }

    const payload = JSON.parse(jsonPayload);
    if (payload && typeof payload === "object") {
      return payload as JwtTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Enriches the minimal client user object with claims embedded inside the signed JWT access token
 * (such as role, roleId, permissions, jobBoardAccess).
 */
export function extractUserFromToken(user?: BackendUser | null, token?: string | null): BackendUser {
  const fallback = user || ({} as BackendUser);
  if (!token) return fallback;

  const payload = decodeJwtPayload(token);
  const tokenUser = payload?.user;
  if (!tokenUser || typeof tokenUser !== "object") {
    return fallback;
  }

  return {
    ...tokenUser,
    ...fallback,
    role: fallback.role || tokenUser.role,
    roleId: fallback.roleId || tokenUser.roleId,
    permissions: fallback.permissions || tokenUser.permissions,
  } as BackendUser;
}
