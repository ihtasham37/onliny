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
      
      // Check session storage to prevent infinite reload loops
      const pageHasAlreadyBeenForceRefreshed = JSON.parse(
        window.sessionStorage.getItem(`retry-${name}-refreshed`) || 'false'
      );

      const isChunkLoadError = 
        error?.name === 'ChunkLoadError' || 
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch dynamically imported module');

      // Only attempt a single reload if it is genuinely a missing chunk in production
      if (!pageHasAlreadyBeenForceRefreshed && isChunkLoadError && !import.meta.env.DEV) {
        window.sessionStorage.setItem(`retry-${name}-refreshed`, 'true');
        window.location.reload();
        return new Promise(() => {});
      }

      // If not a chunk load error or already refreshed, let Error Boundary handle it gracefully without crashing/reloading
      throw error;
    }
  });
};