import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  /** Callback saat trigger tercapai */
  onLoadMore: () => void;
  /** Apakah masih ada data untuk dimuat */
  hasMore: boolean;
  /** Apakah sedang loading */
  isLoading: boolean;
  /** Jarak dari bottom sebelum trigger (pixel) */
  threshold?: number;
  /** Apakah fitur enabled */
  enabled?: boolean;
}

/**
 * Hook untuk infinite scrolling dengan Intersection Observer
 *
 * Menggunakan Intersection Observer API untuk mendeteksi kapan
 * user scroll mendekati bottom list, lalu trigger load more.
 *
 * @example
 * const { sentinelRef } = useInfiniteScroll({
 *   onLoadMore: () => fetchMore(),
 *   hasMore: pagination.hasMore,
 *   isLoading: isLoadingMore,
 * });
 *
 * return (
 *   <div>
 *     {files.map(f => <FileItem key={f.id} file={f} />)}
 *     <div ref={sentinelRef} /> {// Invisible trigger element}
 *   </div>
 * );
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 200,
  enabled = true,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(isLoading);

  // Keep loading ref updated
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      // Trigger load more jika:
      // 1. Element terlihat (intersecting)
      // 2. Masih ada data (hasMore)
      // 3. Tidak sedang loading
      // 4. Feature enabled
      if (entry.isIntersecting && hasMore && !isLoadingRef.current && enabled) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, enabled],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) return;

    const observer = new IntersectionObserver(handleIntersect, {
      // null = viewport
      root: null,
      // Trigger sebelum element benar-benar terlihat
      rootMargin: `${threshold}px`,
      // Trigger segera saat mulai terlihat
      threshold: 0,
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect, threshold, enabled]);

  return {
    /** Ref untuk element sentinel (tempatkan di akhir list) */
    sentinelRef,
  };
}

export default useInfiniteScroll;
