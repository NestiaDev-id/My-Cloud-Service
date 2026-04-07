import { FileCache } from "../models/FileCache.js";

// TTL Default: 5 menit (300,000 ms)
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * MongoDB-based Cache with TTL
 */
class MongoCache {
  /**
   * Menyimpan data ke MongoDB Cache
   * @param key - Unique identifier untuk data
   * @param data - Data yang akan disimpan
   * @param ttl - Time To Live dalam milliseconds (default: 5 menit)
   */
  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    const expireAt = new Date(Date.now() + ttl);
    try {
      await FileCache.findOneAndUpdate(
        { key },
        { data, expireAt },
        { upsert: true, new: true },
      );
    } catch (error) {
      console.error(`[Cache Error] Failed to set cache for ${key}:`, error);
    }
  }

  /**
   * Mengambil data dari MongoDB Cache
   * @returns Object dengan data dan metadata, atau null jika tidak ada/expired
   */
  async get<T>(key: string): Promise<{ data: T; age: number } | null> {
    try {
      const entry = await FileCache.findOne({ key });
      if (!entry) return null;

      const age = Date.now() - new Date(entry.createdAt).getTime();

      return {
        data: entry.data as T,
        age,
      };
    } catch (error) {
      console.error(`[Cache Error] Failed to get cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Menghapus cache berdasarkan pattern (prefix)
   * @param pattern - Prefix pattern untuk di-match
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const result = await FileCache.deleteMany({
        key: { $regex: `^${pattern}` },
      });
      console.log(
        `[Cache] Invalidated ${result.deletedCount} entries matching "${pattern}"`,
      );
      return result.deletedCount;
    } catch (error) {
      console.error(
        `[Cache Error] Failed to invalidate cache for ${pattern}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Menghapus satu key spesifik
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await FileCache.deleteOne({ key });
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`[Cache Error] Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Membersihkan semua cache
   */
  async clear(): Promise<void> {
    try {
      await FileCache.deleteMany({});
      console.log(`[Cache] Cleared all entries`);
    } catch (error) {
      console.error(`[Cache Error] Failed to clear cache:`, error);
    }
  }
}

// Singleton instance
export const cache = new MongoCache();

/**
 * Helper untuk generate cache key yang konsisten
 */
export function getCacheKey(params: {
  accountId: string;
  folderId?: string;
  query?: string;
  pageToken?: string;
}): string {
  const { accountId, folderId = "root", query = "", pageToken = "" } = params;
  return `files:${accountId}:${folderId}:${query}:${pageToken}`;
}

/**
 * Helper untuk invalidate semua cache dari satu akun
 */
export async function invalidateAccountCache(accountId: string): Promise<number> {
  return cache.invalidate(`files:${accountId}`);
}

/**
 * Helper untuk invalidate cache folder tertentu
 */
export async function invalidateFolderCache(
  accountId: string,
  folderId: string = "root",
): Promise<number> {
  return cache.invalidate(`files:${accountId}:${folderId}`);
}
