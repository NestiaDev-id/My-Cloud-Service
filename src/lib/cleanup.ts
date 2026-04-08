import { StorageAccount } from "../models/Account.js";
import { listFiles, deleteFile, getDriveClient } from "../lib/google.js";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Scan setiap 5 menit
const MAX_AGE_MS = 30 * 60 * 1000; // File dihapus setelah 30 menit

/**
 * Menghapus file di PUBLIC_FOLDER_ID yang sudah melewati batas waktu.
 * Menggunakan akun pertama (Master Account) untuk melakukan operasi.
 */
async function cleanupPublicFolder(): Promise<void> {
  const publicFolderId = process.env.PUBLIC_FOLDER_ID;
  if (!publicFolderId) return;

  try {
    // Gunakan akun pertama untuk operasi penghapusan
    const masterAccount = await StorageAccount.findOne({
      isActive: true,
      status: "connected",
    });

    if (!masterAccount) {
      console.warn("[Cleanup] Tidak ada akun aktif untuk menjalankan cleanup.");
      return;
    }

    // Ambil semua file di folder publik
    const drive = getDriveClient(masterAccount.refreshToken);
    const { data } = await drive.files.list({
      q: `'${publicFolderId}' in parents and trashed = false`,
      fields: "files(id, name, createdTime)",
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = data.files || [];
    if (files.length === 0) return;

    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      if (!file.createdTime || !file.id) continue;

      const fileAge = now - new Date(file.createdTime).getTime();
      if (fileAge > MAX_AGE_MS) {
        try {
          await deleteFile(masterAccount.refreshToken, file.id);
          deletedCount++;
          console.log(`[Cleanup] Dihapus: ${file.name} (umur: ${Math.round(fileAge / 60000)} menit)`);
        } catch (err) {
          console.error(`[Cleanup] Gagal menghapus ${file.name}:`, (err as Error).message);
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`[Cleanup] Selesai. ${deletedCount} file dihapus dari folder publik.`);
    }
  } catch (error) {
    console.error("[Cleanup] Error saat menjalankan cleanup:", error);
  }
}

/**
 * Memulai periodic cleanup job.
 * Dipanggil dari index.ts saat server dimulai.
 */
export function startCleanupJob(): void {
  const publicFolderId = process.env.PUBLIC_FOLDER_ID;
  if (!publicFolderId) {
    console.log("[Cleanup] PUBLIC_FOLDER_ID tidak di-set. Cleanup job dilewati.");
    return;
  }

  console.log(`[Cleanup] Job dimulai. Interval: ${CLEANUP_INTERVAL_MS / 60000} menit. Max age: ${MAX_AGE_MS / 60000} menit.`);

  // Jalankan pertama kali setelah 30 detik (beri waktu DB connect)
  setTimeout(() => {
    cleanupPublicFolder();
    // Lalu jalankan secara periodik
    setInterval(cleanupPublicFolder, CLEANUP_INTERVAL_MS);
  }, 30_000);
}
