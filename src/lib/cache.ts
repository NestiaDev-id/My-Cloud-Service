/**
 * In-Memory Cache with TTL (Time To Live)
 *
 * Digunakan untuk menyimpan hasil query Google Drive sementara
 * agar mengurangi pemanggilan API berlebihan.
 *
 * Cache Key Format: "files:{accountId}:{folderId}:{query}:{pageToken}"
 *
 * Contoh:
 * - "files:acc123:root::page1" → File root folder, halaman 1
 * - "files:acc123:folder456::page2" → File di folder456, halaman 2
 * - "files:acc123:root:budget:" → Hasil pencarian "budget" di root
 */

// TTL Default: 5 menit (300,000 ms)
const DEFAULT_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expireAt: number;
  createdAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Menyimpan data ke cache
   * @param key - Unique identifier untuk data
   * @param data - Data yang akan disimpan
   * @param ttl - Time To Live dalam milliseconds (default: 5 menit)
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    const now = Date.now();
    this.store.set(key, {
      data,
      expireAt: now + ttl,
      createdAt: now,
    });

    // Cleanup expired entries periodically (every 100 sets)
    if (this.store.size % 100 === 0) {
      this.cleanup();
    }
  }

  /**
   * Mengambil data dari cache
   * @returns Object dengan data dan metadata, atau null jika tidak ada/expired
   */
  get<T>(key: string): { data: T; age: number } | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();

    // Cek apakah sudah expired
    if (now > entry.expireAt) {
      this.store.delete(key);
      return null;
    }

    return {
      data: entry.data as T,
      age: now - entry.createdAt,
    };
  }

  /**
   * Cek apakah key ada di cache (dan belum expired)
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Menghapus cache berdasarkan pattern (untuk invalidasi setelah CRUD)
   * Contoh: invalidate("files:acc123:folder456") akan menghapus semua
   * cache yang key-nya dimulai dengan pattern tersebut
   *
   * @param pattern - Prefix pattern untuk di-match
   * @returns Jumlah entry yang dihapus
   */
  invalidate(pattern: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key);
        count++;
      }
    }
    console.log(`[Cache] Invalidated ${count} entries matching "${pattern}"`);
    return count;
  }

  /**
   * Menghapus satu key spesifik
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Membersihkan semua cache
   */
  clear(): void {
    const size = this.store.size;
    this.store.clear();
    console.log(`[Cache] Cleared all ${size} entries`);
  }

  /**
   * Membersihkan entry yang sudah expired
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expireAt) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      console.log(`[Cache] Cleanup: removed ${count} expired entries`);
    }
    return count;
  }

  /**
   * Statistik cache untuk monitoring
   */
  stats() {
    const now = Date.now();
    let expiredCount = 0;

    for (const entry of this.store.values()) {
      if (now > entry.expireAt) expiredCount++;
    }

    return {
      totalEntries: this.store.size,
      expiredEntries: expiredCount,
      activeEntries: this.store.size - expiredCount,
    };
  }
}

// Singleton instance
export const cache = new MemoryCache();

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
export function invalidateAccountCache(accountId: string): number {
  return cache.invalidate(`files:${accountId}`);
}

/**
 * Helper untuk invalidate cache folder tertentu
 */
export function invalidateFolderCache(
  accountId: string,
  folderId: string = "root",
): number {
  return cache.invalidate(`files:${accountId}:${folderId}`);
}
