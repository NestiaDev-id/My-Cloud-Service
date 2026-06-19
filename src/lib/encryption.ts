import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment.
 * Falls back to a warning if not set (for development).
 */
function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    console.warn(
      "[Security] ENCRYPTION_KEY is missing or invalid. Using fallback key (NOT SAFE FOR PRODUCTION).",
    );
    return crypto.createHash("sha256").update("dev-fallback-key").digest();
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a plain text string using AES-256-GCM.
 * Returns: iv:authTag:ciphertext (all hex-encoded, colon-separated)
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * Input format: iv:authTag:ciphertext (all hex-encoded)
 */
export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    // If not encrypted format, return as-is (backward compatibility with existing plaintext tokens)
    return encryptedText;
  }

  const [ivHex, authTagHex, ciphertext] = parts;

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    // If decryption fails, the data might be plaintext (pre-encryption era)
    console.warn("[Security] Decryption failed — data may be plaintext (legacy).");
    return encryptedText;
  }
}

/**
 * Check if a string looks like it was encrypted by us.
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split(":");
  if (parts.length !== 3) return false;
  // Check if all parts look like valid hex
  return parts.every((p) => /^[0-9a-f]+$/i.test(p));
}
