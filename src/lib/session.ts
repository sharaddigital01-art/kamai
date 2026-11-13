export interface SessionPayload {
  id: string;
  email: string | null;
  phone?: string | null;
  name?: string | null;
  role?: string;
  referralCode?: string;
  subIdPrefix?: string;
  createdAt?: string;
}

export function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.ADMIN_SECRET ||
    process.env.CLICK_HASH_SECRET ||
    "kamai-karo-secret-auth-key-2026"
  );
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    const b = bytes[i];
    if (b !== undefined) binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    const b = bytes[i];
    if (b !== undefined) binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Creates a cryptographically signed session token:
 * format: <base64url_json_payload>.<base64url_hmac_sha256>
 * Works in both Node.js and Edge Runtime (uses Web Crypto API).
 */
export async function signAuthPayload(payload: SessionPayload): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const data = toBase64Url(jsonStr);
  const key = await getCryptoKey(getAuthSecret());
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  const sigStr = bytesToBase64Url(new Uint8Array(sig));
  return `${data}.${sigStr}`;
}

/**
 * Verifies and parses the session token.
 * Prevents forged client cookies from escalating privileges or spoofing identities.
 * Works in both Node.js and Edge Runtime.
 */
export async function verifyAuthPayload(
  cookieVal?: string | null
): Promise<{ payload: SessionPayload; isSigned: boolean } | null> {
  if (!cookieVal) return null;

  // 1. Signed token verification (<payload>.<signature>)
  const dotIndex = cookieVal.lastIndexOf(".");
  if (dotIndex > 0) {
    const data = cookieVal.slice(0, dotIndex);
    const sig = cookieVal.slice(dotIndex + 1);
    try {
      const key = await getCryptoKey(getAuthSecret());
      const sigBytes = base64UrlToBytes(sig);
      const isValid = await crypto.subtle.verify(
        "HMAC",
        key,
        sigBytes as unknown as BufferSource,
        new TextEncoder().encode(data)
      );

      if (isValid) {
        const decoded = fromBase64Url(data);
        const parsed = JSON.parse(decoded);
        if (parsed?.id) {
          return { payload: parsed, isSigned: true };
        }
      }
    } catch {
      // Signature mismatch or invalid encoding
    }
    return null;
  }

  // 2. Legacy unsigned cookie support (graceful backward compatibility for existing sessions)
  try {
    const decoded = decodeURIComponent(cookieVal);
    const parsed = JSON.parse(decoded);
    if (parsed?.id) {
      // Never trust role from an unsigned cookie: force role to USER
      return {
        payload: {
          ...parsed,
          role: "USER",
        },
        isSigned: false,
      };
    }
  } catch {
    // Malformed JSON
  }

  return null;
}
