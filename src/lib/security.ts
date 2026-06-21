/**
 * Security utilities: input sanitization, brute-force protection, and audit logging.
 */

// --- Input Sanitization ---

/**
 * Sanitize a string to prevent injection attacks.
 * Strips dangerous characters used in SQL/NoSQL injection and XSS.
 */
export function sanitizeInput(str: string): string {
  return str
    .replace(/[<>"'`;\\]/g, "") // Strip XSS and injection chars
    .replace(/\.\./g, "")       // Strip path traversal
    .trim();
}

/**
 * Validate that a composite ID matches the expected format (mongoId:googleFileId).
 */
export function isValidCompositeId(id: string): boolean {
  const parts = id.split(":");
  if (parts.length !== 2) return false;
  // MongoDB ObjectId: 24 hex chars. Google File ID: alphanumeric + dash/underscore.
  const mongoIdRegex = /^[0-9a-f]{24}$/i;
  const googleIdRegex = /^[a-zA-Z0-9_-]+$/;
  return mongoIdRegex.test(parts[0]) && googleIdRegex.test(parts[1]);
}

/**
 * Validate that a file name is safe.
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>"'`;\\]/g, "")  // Strip XSS chars
    .replace(/\.\./g, "")        // Strip path traversal
    .replace(/[/\\]/g, "")       // Strip directory separators
    .substring(0, 255)           // Max length
    .trim();
}

/**
 * Validate MIME type format.
 */
export function isValidMimeType(mimeType: string): boolean {
  return /^[a-z]+\/[a-z0-9.+-]+$/i.test(mimeType);
}

// --- Brute-Force Protection ---

interface FailedAttempt {
  count: number;
  blockedUntil: number;
  firstAttemptAt: number;
}

const failedAttempts = new Map<string, FailedAttempt>();
const MAX_FAILED_ATTEMPTS = 5;
const FAILED_WINDOW_MS = 15 * 60 * 1000;  // 15 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000;  // 30 minutes

/**
 * Check if an IP is currently blocked due to too many failed attempts.
 */
export function isBlocked(ip: string): boolean {
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.blockedUntil) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

/**
 * Record a failed authentication attempt from an IP.
 * Returns true if the IP is now blocked.
 */
export function recordFailedAttempt(ip: string): boolean {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry || now > entry.firstAttemptAt + FAILED_WINDOW_MS) {
    // Start fresh window
    failedAttempts.set(ip, {
      count: 1,
      blockedUntil: 0,
      firstAttemptAt: now,
    });
    return false;
  }

  entry.count++;

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    console.warn(`[Security] IP ${ip} BLOCKED — ${MAX_FAILED_ATTEMPTS} failed API key attempts.`);
    return true;
  }

  return false;
}

/**
 * Clear a failed attempt record (e.g., after successful auth).
 */
export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// --- Rate Limiter for Key Generation ---

const keyGenLimiter = new Map<string, { count: number; resetAt: number }>();
const KEY_GEN_MAX = 3;
const KEY_GEN_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if an admin can generate more API keys (max 3 per hour).
 */
export function canGenerateKey(identifier: string): boolean {
  const now = Date.now();
  const entry = keyGenLimiter.get(identifier);

  if (!entry || now > entry.resetAt) {
    keyGenLimiter.set(identifier, { count: 1, resetAt: now + KEY_GEN_WINDOW_MS });
    return true;
  }

  if (entry.count >= KEY_GEN_MAX) return false;

  entry.count++;
  return true;
}
