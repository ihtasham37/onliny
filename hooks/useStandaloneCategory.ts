import { useMemo, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from './useStore';
import { Category, Product, AppUser } from '../types';
import { safeJsonStringify } from '../utils/helpers';

export type StandaloneType = 'vendor' | 'category' | null;

interface StandaloneState {
  type: StandaloneType;
  id: string | null;
}

function getInitialStandaloneState(): StandaloneState {
  try {
    if (typeof window === 'undefined') return { type: null, id: null };

    const fullPath = window.location.pathname + window.location.hash;
    const hash = window.location.hash || '';

    // If the URL is explicitly root / home, ALWAYS clear standalone session and load default store Home
    if (!hash || hash === '#' || hash === '#/' || hash === '#/home' || hash === '#/index') {
      try {
        sessionStorage.removeItem('standalone_type');
        sessionStorage.removeItem('standalone_id');
        sessionStorage.removeItem('standalone_category_id');
      } catch {}
      return { type: null, id: null };
    }

    // 1. Check vendor path (/store/v/:id, /vendor-store/:id)
    const vendorMatch = fullPath.match(/(?:\/store\/v\/|\/vendor-store\/)([^/?#]+)/);
    if (vendorMatch && vendorMatch[1]) {
      const id = decodeURIComponent(vendorMatch[1]);
      sessionStorage.setItem('standalone_type', 'vendor');
      sessionStorage.setItem('standalone_id', id);
      return { type: 'vendor', id };
    }

    // 2. Check category path (/store/c/:id, /standalone/:id)
    const catMatch = fullPath.match(/(?:\/store\/c\/|\/standalone\/)([^/?#]+)/);
    if (catMatch && catMatch[1]) {
      const id = decodeURIComponent(catMatch[1]);
      sessionStorage.setItem('standalone_type', 'category');
      sessionStorage.setItem('standalone_id', id);
      sessionStorage.setItem('standalone_category_id', id);
      return { type: 'category', id };
    }

    // 3. Check /store/:id where id is not 'c'
    const genericStoreMatch = fullPath.match(/\/store\/([^/?#]+)/);
    if (genericStoreMatch && genericStoreMatch[1] && genericStoreMatch[1] !== 'c') {
      const id = decodeURIComponent(genericStoreMatch[1]);
      sessionStorage.setItem('standalone_type', 'vendor');
      sessionStorage.setItem('standalone_id', id);
      return { type: 'vendor', id };
    }

    // 4. Check search params
    const searchParams = new URLSearchParams(window.location.search || '');
    const vendorParam = searchParams.get('vendor') || searchParams.get('v');
    if (vendorParam) {
      sessionStorage.setItem('standalone_type', 'vendor');
      sessionStorage.setItem('standalone_id', vendorParam);
      return { type: 'vendor', id: vendorParam };
    }

    const catParam = searchParams.get('store') || (searchParams.get('type') === 'standalone' ? searchParams.get('id') : null);
    if (catParam) {
      sessionStorage.setItem('standalone_type', 'category');
      sessionStorage.setItem('standalone_id', catParam);
      sessionStorage.setItem('standalone_category_id', catParam);
      return { type: 'category', id: catParam };
    }

    // 5. Fallback to sessionStorage ONLY if inside active sub-flow like cart or checkout originating from a vendor
    if (hash.startsWith('#/cart') || hash.startsWith('#/checkout') || hash.startsWith('#/product/')) {
      const storedType = sessionStorage.getItem('standalone_type') as StandaloneType;
      const storedId = sessionStorage.getItem('standalone_id') || sessionStorage.getItem('standalone_category_id');
      if (storedType && storedId) {
        return { type: storedType, id: storedId };
      }
    }

    return { type: null, id: null };
  } catch {
    return { type: null, id: null };
  }
}

export const useStandaloneCategory = () => {
  const location = useLocation();
  const { settings, vendorsMap, allProducts, banners } = useStore();
  const [standaloneState, setStandaloneState] = useState<StandaloneState>(getInitialStandaloneState);

  // Track path changes and sync standalone state
  useEffect(() => {
    const pathname = location.pathname;

    // Vendor store paths
    if (pathname.startsWith('/store/v/') || pathname.startsWith('/vendor-store/')) {
      const prefix = pathname.startsWith('/store/v/') ? '/store/v/' : '/vendor-store/';
      const raw = pathname.replace(prefix, '');
      const extractedId = decodeURIComponent(raw.split('/')[0] || '');
      if (extractedId) {
        try {
          sessionStorage.setItem('standalone_type', 'vendor');
          sessionStorage.setItem('standalone_id', extractedId);
        } catch {}
        setStandaloneState({ type: 'vendor', id: extractedId });
        return;
      }
    }

    // Category store paths
    if (pathname.startsWith('/store/c/') || pathname.startsWith('/standalone/')) {
      const prefix = pathname.startsWith('/store/c/') ? '/store/c/' : '/standalone/';
      const raw = pathname.replace(prefix, '');
      const extractedId = decodeURIComponent(raw.split('/')[0] || '');
      if (extractedId) {
        try {
          sessionStorage.setItem('standalone_type', 'category');
          sessionStorage.setItem('standalone_id', extractedId);
          sessionStorage.setItem('standalone_category_id', extractedId);
        } catch {}
        setStandaloneState({ type: 'category', id: extractedId });
        return;
      }
    }

    // Generic /store/:vendorId path (if not /store/c/...)
    if (pathname.startsWith('/store/') && !pathname.startsWith('/store/c/') && !pathname.startsWith('/store/v/')) {
      const raw = pathname.replace('/store/', '');
      const extractedId = decodeURIComponent(raw.split('/')[0] || '');
      if (extractedId) {
        try {
          sessionStorage.setItem('standalone_type', 'vendor');
          sessionStorage.setItem('standalone_id', extractedId);
        } catch {}
        setStandaloneState({ type: 'vendor', id: extractedId });
        return;
      }
    }

    // Explicit main store routes clear (homepage, main categories/collections, blog, more)
    if (pathname === '/' || pathname === '/categories' || pathname === '/more' || pathname === '/blog' || pathname === '/community') {
      try {
        sessionStorage.removeItem('standalone_type');
        sessionStorage.removeItem('standalone_id');
        sessionStorage.removeItem('standalone_category_id');
      } catch {}
      setStandaloneState({ type: null, id: null });
      return;
    }

    // Keep existing session state on internal routes (/cart, /checkout, /product/:id, etc.)
    try {
      const storedType = sessionStorage.getItem('standalone_type') as StandaloneType;
      const storedId = sessionStorage.getItem('standalone_id') || sessionStorage.getItem('standalone_category_id');
      if (storedId && (storedId !== standaloneState.id || storedType !== standaloneState.type)) {
        setStandaloneState({ type: storedType || 'category', id: storedId });
      }
    } catch {}
  }, [location.pathname, standaloneState.id, standaloneState.type]);

  const allCategories = useMemo(() => settings?.categories || [], [settings]);

  // Category standalone details
  const standaloneCategory = useMemo<Category | null>(() => {
    if (standaloneState.type !== 'category' || !standaloneState.id) return null;
    return allCategories.find(c => c.id === standaloneState.id || c.name.toLowerCase() === standaloneState.id?.toLowerCase()) || null;
  }, [standaloneState, allCategories]);

  // Vendor standalone details
  const vendorData = useMemo<AppUser | null>(() => {
    if (standaloneState.type !== 'vendor' || !standaloneState.id) return null;
    const vendor = vendorsMap?.[standaloneState.id];
    if (vendor) return vendor;

    // Check localStorage cached vendor brand
    try {
      const cached = localStorage.getItem(`standalone_vendor_${standaloneState.id}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return null;
  }, [standaloneState, vendorsMap]);

  // Synchronize local brand cache
  useEffect(() => {
    if (standaloneCategory) {
      try {
        localStorage.setItem(`standalone_brand_${standaloneCategory.id}`, safeJsonStringify({
          storeName: standaloneCategory.storeName || standaloneCategory.name,
          storeLogoUrl: standaloneCategory.storeLogoUrl || standaloneCategory.imageUrl || '',
        }));
      } catch {}
    }
    if (vendorData && standaloneState.id) {
      try {
        localStorage.setItem(`standalone_vendor_${standaloneState.id}`, safeJsonStringify(vendorData));
      } catch {}
    }
  }, [standaloneCategory, vendorData, standaloneState.id]);

  const clearStandalone = useCallback(() => {
    try {
      sessionStorage.removeItem('standalone_type');
      sessionStorage.removeItem('standalone_id');
      sessionStorage.removeItem('standalone_category_id');
    } catch {}
    setStandaloneState({ type: null, id: null });
  }, []);

  const isStandalone = Boolean(standaloneState.id);
  const standaloneType = standaloneState.type;

  // Resolve Store Branding
  let storeName = settings?.appName || 'Online Store';
  let storeLogoUrl = settings?.logoUrl || '';
  let storeWhatsapp = settings?.whatsappNumber || '';
  let homeUrl = '/';

  if (standaloneType === 'vendor' && standaloneState.id) {
    storeName = vendorData?.shopName || 'Vendor Boutique';
    storeLogoUrl = vendorData?.shopLogoUrl || '';
    storeWhatsapp = vendorData?.whatsappNumber || settings?.whatsappNumber || '';
    homeUrl = `/store/v/${encodeURIComponent(standaloneState.id)}`;
  } else if (standaloneType === 'category' && standaloneCategory) {
    storeName = standaloneCategory.storeName || standaloneCategory.name || 'Category Store';
    storeLogoUrl = standaloneCategory.storeLogoUrl || standaloneCategory.imageUrl || '';
    homeUrl = `/store/c/${encodeURIComponent(standaloneCategory.id)}`;
  }

  // Filter products for standalone store
  const storeProducts = useMemo<Product[]>(() => {
    if (!isStandalone || !standaloneState.id) return [];
    if (standaloneType === 'vendor') {
      return (allProducts || []).filter(p => p.vendorId === standaloneState.id && p.isVisible);
    }
    if (standaloneType === 'category' && standaloneCategory) {
      const descendants = new Set<string>([standaloneCategory.id, standaloneCategory.name]);
      const queue = [standaloneCategory.id];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        allCategories.filter(c => c.parentId === cur).forEach(c => {
          descendants.add(c.id);
          descendants.add(c.name);
          queue.push(c.id);
        });
      }
      return (allProducts || []).filter(p => p.isVisible && descendants.has(p.category));
    }
    return [];
  }, [isStandalone, standaloneType, standaloneState.id, standaloneCategory, allProducts, allCategories]);

  // Filter categories for standalone store
  const storeCategories = useMemo<Category[]>(() => {
    if (!isStandalone || !standaloneState.id) return [];
    if (standaloneType === 'vendor') {
      return allCategories.filter(c => c.vendorId === standaloneState.id && c.isVisible);
    }
    if (standaloneType === 'category' && standaloneCategory) {
      return allCategories.filter(c => c.isVisible && (c.parentId === standaloneCategory.id || c.parentId === standaloneCategory.name));
    }
    return [];
  }, [isStandalone, standaloneType, standaloneState.id, standaloneCategory, allCategories]);

  // Filter banners for standalone store
  const storeBanners = useMemo<string[]>(() => {
    if (!isStandalone || !standaloneState.id) return [];
    if (standaloneType === 'vendor') {
      if (vendorData?.shopBanners && vendorData.shopBanners.length > 0) {
        return vendorData.shopBanners;
      }
      if (vendorData?.shopBannerUrl) {
        return [vendorData.shopBannerUrl];
      }
      const vendorDbBanners = (banners || []).filter(b => b.vendorId === standaloneState.id && b.isActive && b.imageUrl);
      if (vendorDbBanners.length > 0) {
        return vendorDbBanners.map(b => b.imageUrl);
      }
      return [];
    }
    if (standaloneType === 'category' && standaloneCategory) {
      if (standaloneCategory.bannerImageUrls && standaloneCategory.bannerImageUrls.length > 0) {
        return standaloneCategory.bannerImageUrls;
      }
      if (standaloneCategory.imageUrl) {
        return [standaloneCategory.imageUrl];
      }
    }
    return [];
  }, [isStandalone, standaloneType, standaloneState.id, vendorData, standaloneCategory, banners]);

  return {
    isStandalone,
    standaloneType,
    vendorId: standaloneType === 'vendor' ? standaloneState.id : null,
    categoryId: standaloneType === 'category' ? standaloneState.id : null,
    standaloneCategory,
    vendorData,
    storeName,
    storeLogoUrl,
    storeWhatsapp,
    homeUrl,
    storeProducts,
    storeCategories,
    storeBanners,
    clearStandalone,
  };
};
