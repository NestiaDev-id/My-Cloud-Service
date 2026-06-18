import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IApiKey extends Document {
  name: string;
  keyHash: string;
  keyPrefix: string;
  expiresAt: Date | null;
  ttlMs: number | null; // Duration in ms to apply to uploaded files
  lastUsedAt: Date | null;
  usageToday: number;
  usageTodayResetAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null, // null = permanent
    },
    ttlMs: {
      type: Number,
      default: null, // null = permanent storage
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    usageToday: {
      type: Number,
      default: 0,
    },
    usageTodayResetAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const ApiKey = mongoose.model<IApiKey>("ApiKey", ApiKeySchema);

// --- Utility Functions ---

const DURATION_MAP: Record<string, number | null> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "14d": 14 * 24 * 60 * 60 * 1000,
  "1m": 30 * 24 * 60 * 60 * 1000,
  "3m": 90 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
  permanent: null,
};

/**
 * Generate a new API key and return both the raw key and its hash.
 */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `mcs_${crypto.randomBytes(24).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.substring(0, 12);
  return { raw, hash, prefix };
}

/**
 * Hash a raw key for lookup.
 */
export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Convert a duration string to milliseconds (or null for permanent).
 */
export function parseDuration(duration: string): number | null {
  return DURATION_MAP[duration] ?? null;
}

/**
 * Calculate expiration date from a duration string.
 */
export function calculateExpiry(duration: string): Date | null {
  const ms = parseDuration(duration);
  if (ms === null) return null;
  return new Date(Date.now() + ms);
}
