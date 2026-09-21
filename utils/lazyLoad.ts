import { lazy, ComponentType } from 'react';

/**
 * A wrapper around React.lazy that attempts to refresh the page if loading the component fails.
 * This is common in SPAs when a new deployment occurs, causing old chunk filenames to be deleted
 * from the server, resulting in a ChunkLoadError for users with the old index.html cached.
 */
export const lazyRetry = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  name: string = 'Component'
) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error: any) {
      console.error(`Failed to load ${name}:`, error);

      const isChunkLoadError =
        error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.message?.includes('error loading dynamically imported module');

      if (isChunkLoadError) {
        const lastRefreshed = sessionStorage.getItem(`retry-${name}-timestamp`);
        const now = Date.now();

        // If never refreshed before or last refresh was over 15s ago, refresh cleanly
        if (!lastRefreshed || now - parseInt(lastRefreshed, 10) > 15000) {
          sessionStorage.setItem(`retry-${name}-timestamp`, now.toString());
          window.location.reload();
          return new Promise(() => {});
        }
      }

      // If already refreshed recently or another error, throw to Error Boundary
      throw error;
    }
  });
};
