import mongoose from "mongoose";

const fileRecordSchema = new mongoose.Schema(
  {
    fileId: { type: String, required: true, unique: true }, // ID dari Google Drive
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    accountId: { type: String, required: true }, // Akun penyimpanan yang digunakan
    isPublic: { type: Boolean, default: false },
    ownerEmail: { type: String },
    // Field khusus untuk TTL (Timer Otomatis)
    expireAt: { type: Date }, 
  },
  { timestamps: true }
);

// Pasang Index TTL: Data akan dihapus otomatis saat waktu 'expireAt' tercapai
// Jika 'expireAt' tidak di-set (untuk file private), data tidak akan pernah dihapus otomatis.
fileRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const FileRecord = mongoose.model("FileRecord", fileRecordSchema);
