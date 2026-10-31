import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Unbiased base62 (rejection sampling: 248 = 62 × 4). 8 chars ≈ 2.1e14 combinations. */
export function randomCode(length = 8): string {
  let out = "";
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < 248) out += ALPHABET.charAt(b % 62);
      if (out.length === length) break;
    }
  }
  return out;
}

/** Generates a fast 6-character short slug (base62) */
export function generateShortSlug(length = 6): string {
  return randomCode(length);
}
