import { CatalogBundle } from '../context/AppContext';
import rawCatalog from './staticCatalog.json';

export const INITIAL_STATIC_CATALOG: CatalogBundle = {
  products: ((rawCatalog as any).products || []) as any,
  settings: ((rawCatalog as any).settings || {}) as any,
  banners: ((rawCatalog as any).banners || []) as any,
  coupons: ((rawCatalog as any).coupons || []) as any,
  updatePosts: ((rawCatalog as any).updatePosts || []) as any,
  challans: ((rawCatalog as any).challans || []) as any,
  vendorsStatus: ((rawCatalog as any).vendorsStatus || {}) as any,
  vendorsMap: ((rawCatalog as any).vendorsMap || {}) as any,
  lastUpdated: (rawCatalog as any).lastUpdated || Date.now()
};
