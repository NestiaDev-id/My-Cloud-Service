import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  actor: string;
  ip: string;
  target: string;
  details: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true, index: true },
  actor: { type: String, default: "system" },
  ip: { type: String, default: "unknown" },
  target: { type: String, default: "" },
  details: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now, index: true },
});

// Auto-delete logs older than 90 days
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

/**
 * Record a security-relevant event.
 */
export async function audit(
  action: string,
  opts: { actor?: string; ip?: string; target?: string; details?: string } = {},
) {
  try {
    await AuditLog.create({
      action,
      actor: opts.actor || "system",
      ip: opts.ip || "unknown",
      target: opts.target || "",
      details: opts.details || "",
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write:", err);
  }
}
