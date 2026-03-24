import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Szyfrowanie / deszyfrowanie `access_token` i `refresh_token` SocialAccount przed zapisem do MySQL i po odczycie.
 * Klucz: **`TOKEN_ENCRYPTION_KEY`** w `.env` (64 znaki hex = 32 bajty, Base64 32 bajty lub dowolny string → SHA-256).
 * Jeśli brak — pochodzenie z **`JWT_SECRET`** (tylko dev; w produkcji ustaw osobny klucz).
 */
const PREFIX = "smenc:v1:";

function getKey32FromEnv(): Buffer {
  const k = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (k) {
    if (/^[0-9a-fA-F]{64}$/.test(k)) return Buffer.from(k, "hex");
    const b64 = Buffer.from(k, "base64");
    if (b64.length === 32) return b64;
    return createHash("sha256").update(k, "utf8").digest();
  }
  const j = process.env.JWT_SECRET;
  if (!j) {
    throw new Error("Ustaw TOKEN_ENCRYPTION_KEY (preferowane) lub JWT_SECRET dla pochodzenia klucza szyfrowania.");
  }
  return createHash("sha256").update(j, "utf8").digest();
}

export const SocialAccountService = {
  /** AES-256-GCM — zapis do kolumny access_token / refresh_token. */
  encryptTokenForStorage(plain: string | null | undefined): string | null | undefined {
    if (plain == null || plain === "") return plain;
    if (plain.startsWith(PREFIX)) return plain;

    const key = getKey32FromEnv();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, enc]);
    return PREFIX + combined.toString("base64url");
  },

  /** Odczyt z bazy — wartości bez prefiksu traktowane jako legacy plaintext. */
  decryptTokenFromStorage(stored: string | null | undefined): string | null | undefined {
    if (stored == null || stored === "") return stored;
    if (!stored.startsWith(PREFIX)) return stored;

    try {
      const key = getKey32FromEnv();
      const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
      const iv = raw.subarray(0, 12);
      const tag = raw.subarray(12, 28);
      const enc = raw.subarray(28);
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    } catch {
      return stored;
    }
  },
};
