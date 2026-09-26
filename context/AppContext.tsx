import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext, useMemo, useRef } from 'react';
import { 
    getFirestore, collection, doc, onSnapshot, orderBy, query, addDoc, setDoc, deleteDoc, updateDoc, where, getDocs, writeBatch, getDoc, limit
} from 'firebase/firestore';
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User
} from 'firebase/auth';
import { db, auth } from '../firebase';
import { 
    Product, CartItem, Order, Settings, ChatMessage, OrderStatus, Customer, Coupon, Banner, Category, UpdatePost, ContentBlock,
    AppUser, UserRole, Challan
} from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSessionStorage } from '../hooks/useSessionStorage';
import { normalizePhone, generateCartItemKey, sanitizeForFirestore, safeJsonStringify } from '../utils/helpers';
import { compressImage, fileToDataUri } from '../utils/compression';
import { INITIAL_STATIC_CATALOG } from '../data/staticCatalog';
import { syncDynamicPWABranding } from '../utils/pwaHelper';
import { dataSyncService, SyncState, SectionSyncKey } from '../services/dataSyncService';

export interface CatalogBundle {
  products: Product[];
  settings: Settings | null;
  banners: Banner[];
  coupons: Coupon[];
  updatePosts: UpdatePost[];
  challans: Challan[];
  vendorsStatus: Record<string, string>;
  vendorsMap: Record<string, AppUser>;
  lastUpdated: number;
}

export interface AppContextType {
  products: Product[];
  allProducts: Product[];
  cart: CartItem[];
  orders: Order[];
  settings: Settings | null;
  chatMessages: ChatMessage[];
  coupons: Coupon[];
  banners: Banner[];
  updatePosts: UpdatePost[];
  isLoading: boolean;
  error: string | null;
  user: User | null;
  userData: AppUser | null;
  myProducts: Product[];
  myOrders: Order[];
  wishlist: string[];
  activeCustomer: { email: string, phone: string } | null;
  customerOrders: Order[];
  challans: Challan[];
  vendorsMap: Record<string, AppUser>;
  isFirebaseLiveMode: boolean;
  toggleFirebaseMode: (enabled?: boolean) => void;
  exportCatalogSnapshot: () => Promise<{ success: boolean; message: string; data?: CatalogBundle }>;
  syncCatalogBundle: (overrides?: Partial<CatalogBundle>) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  loadOrders: (limitCount?: number) => Promise<void>;
  trackOrderById: (orderId: string) => Promise<Order | null>;

  addToCart: (product: Product, quantity: number, selectedSizes?: Record<string, string>, additionalInfo?: string) => void;
  removeFromCart: (productId: string, selectedSizes?: Record<string, string>) => void;
  updateCartQuantity: (productId: string, quantity: number, selectedSizes?: Record<string, string>) => void;
  clearCart: () => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  deleteAllProducts: () => Promise<void>;
  toggleProductVisibility: (productId: string, isVisible: boolean) => Promise<void>;
  moveProduct: (productId: string, newCategory: string) => Promise<void>;
  copyProduct: (productId: string, destinationCategory: string) => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'customerId'>) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  sendChatMessage: (message: string, sessionId: string) => Promise<void>;
  sendAdminReply: (sessionId: string, text: string) => Promise<void>;
  deleteChatMessage: (messageId: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  addCategory: (name: string, parentId: string | null, imageUrl?: string, bannerImageUrls?: string[], vendorId?: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategory: (categoryId: string, newData: Partial<Omit<Category, 'id'>>) => Promise<void>;
  moveCategory: (categoryId: string, newParentId: string | null) => Promise<void>;
  copyCategory: (categoryId: string, newParentId: string | null) => Promise<void>;
  addUpdatePost: (post: Omit<UpdatePost, 'id' | 'createdAt'>) => Promise<void>;
  updateUpdatePost: (post: UpdatePost) => Promise<void>;
  deleteUpdatePost: (post: UpdatePost) => Promise<void>;
  toggleWishlist: (productId: string) => void;
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (fileUrl: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  vendorRegister: (email: string, pass: string, shopName: string, firstName: string, lastName: string, whatsappNumber: string) => Promise<void>;
  updateVendorProfile: (uid: string, data: Partial<AppUser>) => Promise<void>;
  logout: () => Promise<void>;
  trackWithEmailAndPhone: (email: string, phone: string) => Promise<boolean>;
  customerLogout: () => void;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'createdAt'>) => Promise<void>;
  updateCoupon: (coupon: Coupon) => Promise<void>;
  deleteCoupon: (couponId: string) => Promise<void>;
  addBanner: (banner: Omit<Banner, 'id' | 'createdAt'>) => Promise<void>;
  updateBanner: (banner: Banner) => Promise<void>;
  deleteBanner: (banner: Banner) => Promise<void>;
  addChallan: (challan: Omit<Challan, 'id' | 'createdAt'>) => Promise<void>;
  deleteChallan: (challanId: string) => Promise<void>;
  fetchLatestSettingsFromFirestore: () => Promise<Settings | null>;
  pushSectionSettingsToFirestore: (section: SectionSyncKey | 'all', partialData: Partial<Settings>) => Promise<boolean>;
  syncState: SyncState;
}

const getInitialSettings = (): Settings => {
  try {
    const sessionCached = sessionStorage.getItem('ali_cart_catalog_bundle_cache_v1');
    if (sessionCached) {
      const parsed = JSON.parse(sessionCached);
      if (parsed?.settings?.appName) return { ...parsed.settings, isFirebaseLiveMode: true };
    }
    const localCached = localStorage.getItem('ali_cart_catalog_bundle_cache_local_v1');
    if (localCached) {
      const parsed = JSON.parse(localCached);
      if (parsed?.data?.settings?.appName) return { ...parsed.data.settings, isFirebaseLiveMode: true };
    }
  } catch (e) {}
  if (INITIAL_STATIC_CATALOG.settings && (INITIAL_STATIC_CATALOG.settings as any).appName) {
    return { ...(INITIAL_STATIC_CATALOG.settings as unknown as Settings), isFirebaseLiveMode: true };
  }
  return {
    appName: 'onliny',
    logoUrl: '',
    storeBannerUrl: '',
    whatsappNumber: '03026947034',
    categories: [],
    showContactEmail: true,
    showGetApp: false,
    adminNotificationEmail: '',
    gmailUser: '',
    gmailAppPassword: '',
    enableOrderEmailAlerts: true,
    isFirebaseLiveMode: true,
  } as unknown as Settings;
};

const getInitialProducts = (): Product[] => {
  try {
    const sessionCached = sessionStorage.getItem('ali_cart_catalog_bundle_cache_v1');
    if (sessionCached) {
      const parsed = JSON.parse(sessionCached);
      if (Array.isArray(parsed?.products)) return parsed.products;
    }
    const localCached = localStorage.getItem('ali_cart_catalog_bundle_cache_local_v1');
    if (localCached) {
      const parsed = JSON.parse(localCached);
      if (Array.isArray(parsed?.data?.products)) return parsed.data.products;
    }
  } catch (e) {}

  // If store was already initialized by admin or user, honor empty products state
  try {
    if (localStorage.getItem('onliny_catalog_initialized') === 'true') {
      return [];
    }
  } catch (e) {}

  return (INITIAL_STATIC_CATALOG.products || []) as Product[];
};

export const defaultAppContextValue: AppContextType = {
  products: [],
  allProducts: [],
  cart: [],
  orders: [],
  settings: getInitialSettings(),
  chatMessages: [],
  coupons: [],
  banners: [],
  updatePosts: [],
  isLoading: false,
  error: null,
  user: null,
  userData: null,
  myProducts: [],
  myOrders: [],
  wishlist: [],
  activeCustomer: null,
  customerOrders: [],
  challans: [],
  vendorsMap: {},
  isFirebaseLiveMode: false,
  toggleFirebaseMode: () => {},
  exportCatalogSnapshot: async () => ({ success: true, message: '' }),
  addToCart: () => {},
  removeFromCart: () => {},
  updateCartQuantity: () => {},
  clearCart: () => {},
  addProduct: async () => {},
  updateProduct: async () => {},
  deleteProduct: async () => {},
  deleteAllProducts: async () => {},
  toggleProductVisibility: async () => {},
  moveProduct: async () => {},
  copyProduct: async () => {},
  addOrder: async () => '',
  updateOrderStatus: async () => {},
  deleteOrder: async () => {},
  sendChatMessage: async () => {},
  sendAdminReply: async () => {},
  deleteChatMessage: async () => {},
  updateSettings: async () => {},
  addCategory: async () => {},
  deleteCategory: async () => {},
  updateCategory: async () => {},
  moveCategory: async () => {},
  copyCategory: async () => {},
  addUpdatePost: async () => {},
  updateUpdatePost: async () => {},
  deleteUpdatePost: async () => {},
  toggleWishlist: () => {},
  uploadFile: async () => '',
  deleteFile: async () => {},
  login: async () => {},
  register: async () => {},
  vendorRegister: async () => {},
  updateVendorProfile: async () => {},
  logout: async () => {},
  trackWithEmailAndPhone: async () => false,
  customerLogout: () => {},
  addCoupon: async () => {},
  updateCoupon: async () => {},
  deleteCoupon: async () => {},
  addBanner: async () => {},
  updateBanner: async () => {},
  deleteBanner: async () => {},
  addChallan: async () => {},
  deleteChallan: async () => {},
  syncCatalogBundle: async () => {},
  refreshCatalog: async () => {},
  loadOrders: async () => {},
  trackOrderById: async () => null,
  fetchLatestSettingsFromFirestore: async () => null,
  pushSectionSettingsToFirestore: async () => false,
  syncState: dataSyncService.getState(),
};

export const AppContext = createContext<AppContextType>(defaultAppContextValue);

export const useStore = (): Omit<AppContextType, 'user' | 'login' | 'logout'> => {
  const context = useContext(AppContext) || defaultAppContextValue;
  const { user, login, logout, ...storeData } = context;
  return storeData;
};

const apiRequest = async (endpoint: string, body: any) => {
    try {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: isFormData ? {} : { 'Content-Type': 'application/json' },
            body: isFormData ? body : (typeof body === 'string' ? body : safeJsonStringify(body))
        });
        if (!response.ok) throw new Error(`Server status: ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'API request failed');
        return result;
    } catch (error) {
        console.error(`API Error:`, error instanceof Error ? error.message : String(error));
        throw error;
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allProducts, setAllProducts] = useState<Product[]>(getInitialProducts);
  const [publishedProducts, setPublishedProducts] = useState<Product[]>(getInitialProducts);
  const [vendorsStatus, setVendorsStatus] = useState<Record<string, string>>(() => INITIAL_STATIC_CATALOG.vendorsStatus || {});
  const [vendorsMap, setVendorsMap] = useState<Record<string, AppUser>>(() => INITIAL_STATIC_CATALOG.vendorsMap || {});

  const [cart, setCart] = useLocalStorage<CartItem[]>('cart', []);
  const [wishlist, setWishlist] = useLocalStorage<string[]>('wishlist', []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings>(getInitialSettings);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>(() => INITIAL_STATIC_CATALOG.coupons || []);
  const [banners, setBanners] = useState<Banner[]>(() => INITIAL_STATIC_CATALOG.banners || []);
  const [challans, setChallans] = useState<Challan[]>(() => INITIAL_STATIC_CATALOG.challans || []);
  const [updatePosts, setUpdatePosts] = useState<UpdatePost[]>(() => INITIAL_STATIC_CATALOG.updatePosts || []);
  const [isLoading, setIsLoading] = useState<boolean>(() => getInitialProducts().length === 0);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);

  const products = useMemo(() => {
    // Main customer app store displays ONLY platform/admin products from the published catalog snapshot.
    // Un-synced working changes in Admin Panel remain in draft until Admin clicks "Sync Website Data".
    return publishedProducts.filter(p => !p.vendorId || p.vendorId === 'admin');
  }, [publishedProducts]);
  
  const myProducts = useMemo(() => {
    if (!userData) return [];
    if (userData.role === UserRole.Admin) return allProducts;
    return allProducts.filter(p => p.vendorId === userData.uid);
  }, [allProducts, userData]);

  const myOrders = useMemo(() => {
    if (!userData) return [];
    if (userData.role === UserRole.Admin) return orders;
    return orders.filter(o => 
      o.vendorIds?.includes(userData.uid) || 
      (o as any).vendorId === userData.uid ||
      o.items.some(i => i.vendorId === userData.uid || allProducts.find(p => p.id === i.id)?.vendorId === userData.uid)
    );
  }, [orders, allProducts, userData]);

  const [activeCustomer, setActiveCustomer] = useState<{ email: string, phone: string } | null>(() => {
    try {
      const saved = localStorage.getItem('onliny_tracked_customer') || sessionStorage.getItem('active-tracking-id');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [customerOrders, setCustomerOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('onliny_customer_orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [lastCatalogTimestamp, setLastCatalogTimestamp] = useState<number>(0);

  useEffect(() => {
    try {
      if (activeCustomer) {
        localStorage.setItem('onliny_tracked_customer', JSON.stringify(activeCustomer));
      }
    } catch (e) {}
  }, [activeCustomer]);

  useEffect(() => {
    try {
      if (customerOrders && customerOrders.length > 0) {
        localStorage.setItem('onliny_customer_orders', JSON.stringify(customerOrders));
      }
    } catch (e) {}
  }, [customerOrders]);

  const [isFirebaseLiveMode, setIsFirebaseLiveMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ali_cart_firebase_mode');
      return saved === 'false' ? false : true; // Default to true (Live Firebase Mode)
    } catch {
      return true;
    }
  });
  
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    // Strictly compress image to < 20 KB
    const processedFile = await compressImage(file);
    
    try {
      const formData = new FormData();
      formData.append('file', processedFile);
      const result = await apiRequest('/api/upload', formData);
      if (result && result.url) {
        return result.url;
      }
    } catch (apiErr) {
      console.warn('Backend/Edge upload endpoint note, using direct compressed asset:', apiErr);
    }
    
    // Direct lightweight compressed Data URI fallback (< 20 KB data URI is ultra-fast and reliable)
    return await fileToDataUri(processedFile);
  }, []);

  const deleteFile = useCallback(async (fileUrl: string): Promise<void> => {
    if (!fileUrl?.includes('cloudinary')) return;
    await apiRequest('/api/delete', safeJsonStringify({ fileUrl }));
  }, []);
  
  const addToCart = (product: Product, quantity: number, selectedSizes?: Record<string, string>, additionalInfo?: string) => {
    setCart(prev => {
      const itemKey = generateCartItemKey({ id: product.id, selectedSizes });
      const existing = prev.find(i => generateCartItemKey(i) === itemKey);
      if (existing) return prev.map(i => generateCartItemKey(i) === itemKey ? { ...i, quantity: i.quantity + quantity } : i);
      return [...prev, { id: product.id, customId: product.customId, name: product.name, price: product.price, image: product.images[0], quantity, selectedSizes, deliveryTime: product.deliveryTime, easyReturn: product.easyReturn, returnPolicy: product.returnPolicy, additionalInfo, shippingFee: product.shippingFee, vendorId: product.vendorId }];
    });
    alert(`${product.name} added to cart!`);
  };

  const removeFromCart = (productId: string, selectedSizes?: Record<string, string>) => {
    const itemKey = generateCartItemKey({ id: productId, selectedSizes });
    setCart(prev => prev.filter(i => generateCartItemKey(i) !== itemKey));
  };
  
  const updateCartQuantity = (productId: string, quantity: number, selectedSizes?: Record<string, string>) => {
      if (quantity <= 0) removeFromCart(productId, selectedSizes);
      else {
          const itemKey = generateCartItemKey({ id: productId, selectedSizes });
          setCart(prev => prev.map(i => generateCartItemKey(i) === itemKey ? { ...i, quantity } : i));
      }
  };
  
  const clearCart = () => setCart([]);

  const CATALOG_SESSION_CACHE_KEY = 'ali_cart_catalog_bundle_cache_v1';
  const CATALOG_LOCAL_CACHE_KEY = 'ali_cart_catalog_bundle_cache_local_v1';
  const CATALOG_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes fresh

  const latestStateRef = useRef({
    allProducts,
    settings,
    banners,
    coupons,
    updatePosts,
    challans,
    vendorsStatus,
    vendorsMap
  });

  useEffect(() => {
    latestStateRef.current = {
      allProducts,
      settings,
      banners,
      coupons,
      updatePosts,
      challans,
      vendorsStatus,
      vendorsMap
    };
  }, [allProducts, settings, banners, coupons, updatePosts, challans, vendorsStatus, vendorsMap]);

  const applyBundleData = useCallback((data: Partial<CatalogBundle>) => {
    if (data.lastUpdated && typeof data.lastUpdated === 'number') {
      setLastCatalogTimestamp(prev => Math.max(prev, data.lastUpdated!));
    }
    if (Array.isArray(data.products)) {
      setPublishedProducts(data.products);
      // Synchronize working products if user is not currently logged in as admin
      if (!userData || userData.role !== UserRole.Admin) {
        setAllProducts(data.products);
      }
    }
    if (data.settings) {
      const rawMethods = data.settings.paymentMethods || [];
      const sanitizedMethods = rawMethods.map(m => ({
        ...m,
        name: (m.name || '').replace(/[\u0600-\u06FF()]/g, '').trim() || m.name || 'Cash on Delivery',
        details: (m.details || '').replace(/[\u0600-\u06FF]/g, '').trim() || m.details || 'Pay upon receiving your order.'
      }));
      const hasCod = sanitizedMethods.some(m => m.id === 'cod' || (m.name && m.name.toLowerCase().includes('cash on delivery')));
      const defaultCod = {
        id: 'cod',
        name: 'Cash on Delivery',
        details: 'Pay upon receiving your order.'
      };
      const finalPaymentMethods = hasCod ? sanitizedMethods : [defaultCod, ...sanitizedMethods];
      const settingsWithCod = { ...data.settings, paymentMethods: finalPaymentMethods, isFirebaseLiveMode: true };

      if (!userData || userData.role !== UserRole.Admin) {
        setSettings(settingsWithCod);
      }
      setIsFirebaseLiveMode(true);
      try {
        localStorage.setItem('ali_cart_firebase_mode', 'true');
      } catch (e) {}
      syncDynamicPWABranding({
        appName: data.settings.appName,
        logoUrl: data.settings.logoUrl,
      });
    }
    if (Array.isArray(data.banners)) {
      setBanners(data.banners);
    }
    if (Array.isArray(data.coupons)) {
      setCoupons(data.coupons);
    }
    if (Array.isArray(data.updatePosts)) setUpdatePosts(data.updatePosts);
    if (Array.isArray(data.challans)) setChallans(data.challans);
    if (data.vendorsStatus) setVendorsStatus(data.vendorsStatus);
    if (data.vendorsMap) setVendorsMap(data.vendorsMap);
  }, [userData]);

  const syncCatalogBundle = useCallback(async (overrides?: Partial<CatalogBundle>) => {
    try {
      const current = latestStateRef.current;
      const rawSettings = overrides?.settings ?? current.settings;
      const safeSettings = rawSettings ? { ...rawSettings } : rawSettings;

      const productsToSave = overrides?.products !== undefined
        ? overrides.products
        : current.allProducts;

      const couponsToSave = overrides?.coupons !== undefined ? overrides.coupons : current.coupons;
      const bannersToSave = overrides?.banners !== undefined ? overrides.banners : current.banners;

      const bundleToSave: CatalogBundle = {
        products: productsToSave,
        settings: safeSettings,
        banners: bannersToSave,
        coupons: couponsToSave,
        updatePosts: overrides?.updatePosts ?? current.updatePosts,
        challans: overrides?.challans ?? current.challans,
        vendorsStatus: overrides?.vendorsStatus ?? current.vendorsStatus,
        vendorsMap: overrides?.vendorsMap ?? current.vendorsMap,
        lastUpdated: Date.now()
      };
      
      // 1. Sync to Firestore bundle doc in cloud
      try {
        await setDoc(doc(db, 'settings', 'catalog_bundle'), sanitizeForFirestore(bundleToSave), { merge: true });
      } catch (dbErr) {
        console.warn("Firestore bundle doc sync skipped:", dbErr);
      }

      // 2. Cache in local browser storage
      try {
        localStorage.setItem('onliny_catalog_initialized', 'true');
        sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(bundleToSave));
        localStorage.setItem(CATALOG_LOCAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: bundleToSave }));
      } catch (e) {}

      // 3. Keep static JSON catalog on server synced immediately across all devices
      try {
        await fetch('/api/save-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ catalog: bundleToSave })
        });
      } catch (apiErr) {
        console.warn("Could not save to /api/save-catalog:", apiErr);
      }
    } catch (e) {
      console.warn("Could not sync catalog bundle:", e);
    }
  }, []);

  const addProduct = async (data: Omit<Product, 'id' | 'createdAt'>) => {
    const isVendor = userData?.role === UserRole.Vendor;
    const vendorId = isVendor ? userData.uid : (data.vendorId || undefined);
    const shopName = isVendor ? (userData.shopName || 'Vendor Store') : (data.shopName || (vendorId ? '' : (settings?.appName || 'Store')));
    const generatedId = (data as any).id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const productData = sanitizeForFirestore({
        ...data,
        id: generatedId,
        createdAt: Date.now(),
        ...(vendorId && { vendorId, shopName }),
        ...(userData?.role === UserRole.Admin && !data.shopName && !vendorId && {
            shopName: settings?.appName || 'Store'
        })
    });
    const newProd = productData as Product;
    const updated = [newProd, ...allProducts];
    setAllProducts(updated);

    // Save individual product document to Firestore
    try {
      await setDoc(doc(db, 'products', generatedId), productData);
    } catch (e) {
      console.warn("Firestore individual product save skipped:", e);
    }
  };

  const updateProduct = async (data: Product) => {
    const existing = allProducts.find(p => p.id === data.id);
    const mergedData: Product = {
      ...existing,
      ...data,
      ...(existing?.vendorId && !data.vendorId ? { vendorId: existing.vendorId, shopName: existing.shopName } : {})
    };
    const cleanData = sanitizeForFirestore(mergedData);
    const updated = allProducts.map(p => p.id === data.id ? cleanData : p);
    setAllProducts(updated);

    // Update individual product document in Firestore
    try {
      await setDoc(doc(db, 'products', data.id), cleanData, { merge: true });
    } catch (e) {
      console.warn("Firestore individual product update skipped:", e);
    }
  };

  const deleteProduct = async (id: string) => {
    const p = allProducts.find(item => item.id === id);
    if (p && p.images && p.images.length > 0) {
      for (const img of p.images) {
        if (img && img.includes('cloudinary')) {
          await deleteFile(img);
        }
      }
    }
    const updated = allProducts.filter(item => item.id !== id);
    setAllProducts(updated);

    // Delete individual product document from Firestore
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      console.warn("Firestore product delete skipped:", e);
    }
  };

  const deleteAllProducts = async () => {
    const updated: Product[] = [];
    setAllProducts(updated);

    // Delete all products from Firestore
    try {
      const snap = await getDocs(collection(db, 'products'));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'products', d.id));
      }
    } catch (e) {
      console.warn("Firestore delete all products skipped:", e);
    }
  };

  const toggleProductVisibility = async (id: string, isVisible: boolean) => {
    const updated = allProducts.map(p => p.id === id ? { ...p, isVisible } : p);
    setAllProducts(updated);
    try {
      await updateDoc(doc(db, 'products', id), { isVisible });
    } catch (e) {}
  };
  const moveProduct = async (id: string, newCategory: string) => {
    const updated = allProducts.map(p => p.id === id ? { ...p, category: newCategory } : p);
    setAllProducts(updated);
    try {
      await updateDoc(doc(db, 'products', id), { category: newCategory });
    } catch (e) {}
  };
  const copyProduct = async (id: string, cat: string) => {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) throw new Error("Product not found");
    const { id: _, createdAt: __, ...newData } = prod;
    await addProduct({ ...newData, category: cat, name: `${newData.name} (Copy)` });
  };

    const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'customerId'>) => {
    const phone = normalizePhone(orderData.customerPhone);
    const cleanedData = sanitizeForFirestore({
        ...orderData, 
        customerPhone: phone || orderData.customerPhone, 
        email: orderData.email ? orderData.email.trim().toLowerCase() : '',
        createdAt: Date.now() 
    });
    const docRef = await addDoc(collection(db, 'orders'), cleanedData);
    
    // Save/Upsert customer record in Firestore 'customers' collection
    try {
      const phoneKey = phone || (orderData.customerPhone ? orderData.customerPhone.replace(/[^a-zA-Z0-9]/g, '') : '') || (orderData.email ? orderData.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') : `cust_${Date.now()}`);
      const customerDocRef = doc(db, 'customers', phoneKey);
      const customerDocSnap = await getDoc(customerDocRef);
      if (customerDocSnap.exists()) {
        const existingCustomer = customerDocSnap.data();
        const updatedOrdersCount = (Number(existingCustomer.ordersCount) || 1) + 1;
        const updatedTotalSpent = (Number(existingCustomer.totalSpent) || 0) + (Number(orderData.total) || 0);
        const existingStatusList = Array.isArray(existingCustomer.statusList) ? existingCustomer.statusList : [];
        const updatedStatusList = Array.from(new Set([...existingStatusList, OrderStatus.Pending]));
        
        await setDoc(customerDocRef, sanitizeForFirestore({
          name: orderData.customerName || existingCustomer.name || 'Customer',
          phone: phone || orderData.customerPhone || existingCustomer.phone || '',
          email: (orderData.email ? orderData.email.trim().toLowerCase() : '') || existingCustomer.email || '',
          city: orderData.city || existingCustomer.city || '',
          province: orderData.province || existingCustomer.province || '',
          customerAddress: orderData.customerAddress || existingCustomer.customerAddress || '',
          landmark: orderData.landmark || existingCustomer.landmark || '',
          ordersCount: updatedOrdersCount,
          totalSpent: updatedTotalSpent,
          lastOrderDate: Date.now(),
          firstOrderDate: existingCustomer.firstOrderDate || existingCustomer.createdAt || Date.now(),
          lastOrderId: docRef.id,
          statusList: updatedStatusList,
          updatedAt: Date.now()
        }), { merge: true });
      } else {
        await setDoc(customerDocRef, sanitizeForFirestore({
          name: orderData.customerName || 'Customer',
          phone: phone || orderData.customerPhone || '',
          email: orderData.email ? orderData.email.trim().toLowerCase() : '',
          city: orderData.city || '',
          province: orderData.province || '',
          customerAddress: orderData.customerAddress || '',
          landmark: orderData.landmark || '',
          ordersCount: 1,
          totalSpent: Number(orderData.total) || 0,
          lastOrderDate: Date.now(),
          firstOrderDate: Date.now(),
          lastOrderId: docRef.id,
          statusList: [OrderStatus.Pending],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }));
      }
    } catch (custErr) {
      console.warn("Firestore customer collection record save note:", custErr);
    }
    
    // Immediately persist placed order to local tracking state
    const placedOrder = { ...cleanedData, id: docRef.id } as Order;
    setCustomerOrders(prev => [placedOrder, ...prev.filter(o => o.id !== docRef.id)]);
    const currentCustomer = { email: orderData.email ? orderData.email.trim().toLowerCase() : '', phone: phone || orderData.customerPhone };
    setActiveCustomer(currentCustomer);
    try {
      localStorage.setItem('onliny_tracked_customer', JSON.stringify(currentCustomer));
      const existingStored: Order[] = JSON.parse(localStorage.getItem('onliny_customer_orders') || '[]');
      localStorage.setItem('onliny_customer_orders', JSON.stringify([placedOrder, ...existingStored.filter(o => o.id !== docRef.id)]));
    } catch (e) {}

    clearCart();
    return docRef.id;
  };
  
  const updateOrderStatus = async (id: string, status: OrderStatus) => await updateDoc(doc(db, 'orders', id), { status });
  const deleteOrder = async (id: string) => await deleteDoc(doc(db, 'orders', id));
  
  const updateSettings = async (data: Settings) => {
    setSettings(data);
    syncDynamicPWABranding({
      appName: data.appName,
      logoUrl: data.logoUrl,
    });
    try {
      await setDoc(doc(db, 'settings', 'main'), sanitizeForFirestore(data), { merge: true });
    } catch (e) {
      console.warn("Firestore settings save skipped:", e);
    }
  };
  
  const addCategory = async (name: string, parentId: string | null, imageUrl?: string, bannerImageUrls?: string[], vendorId?: string) => {
    if (!settings) return;
    const trimmedName = name.trim();
    const existingCategories = (settings.categories || []).filter(c => c && typeof c.name === 'string');
    if (!trimmedName) { alert("Category name cannot be empty."); return; }
    
    const effectiveVendorId = vendorId !== undefined ? vendorId : (userData?.role === UserRole.Vendor ? userData.uid : undefined);
    const isDuplicate = existingCategories.some(c => 
      c.name.toLowerCase() === trimmedName.toLowerCase() && 
      (c.vendorId || undefined) === (effectiveVendorId || undefined)
    );
    if (isDuplicate) { alert(`Category "${trimmedName}" already exists.`); return; }

    const newCategory: Category = { 
      id: `cat_${Date.now()}`, 
      name: trimmedName, 
      parentId, 
      isVisible: true, 
      ...(imageUrl && { imageUrl }), 
      ...(bannerImageUrls && bannerImageUrls.length > 0 && { bannerImageUrls }),
      ...(effectiveVendorId && { vendorId: effectiveVendorId })
    };
    await updateSettings({ ...settings, categories: [...existingCategories, newCategory] });
  };

  const deleteCategory = async (id: string) => {
    if (!settings?.categories) return;
    const allCategories = settings.categories;
    const remainingCategories = allCategories.filter(c => c.id !== id && c.parentId !== id);
    try {
      localStorage.removeItem(`standalone_brand_${id}`);
    } catch (e) {}
    await updateSettings({ ...settings, categories: remainingCategories });
  };
  
  const updateCategory = async (id: string, newData: Partial<Omit<Category, 'id'>>) => {
    if (!settings?.categories) return;
    const updatedCategories = settings.categories.map(c => c.id === id ? { ...c, ...newData } : c);
    
    // Immediately persist brand in dedicated instant-read key
    if (newData.storeName !== undefined || newData.storeLogoUrl !== undefined) {
      try {
        const existingRaw = localStorage.getItem(`standalone_brand_${id}`);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        localStorage.setItem(`standalone_brand_${id}`, JSON.stringify({
          storeName: newData.storeName !== undefined ? (newData.storeName || '') : (existing.storeName || ''),
          storeLogoUrl: newData.storeLogoUrl !== undefined ? (newData.storeLogoUrl || '') : (existing.storeLogoUrl || '')
        }));
      } catch (e) {}
    }

    await updateSettings({ ...settings, categories: updatedCategories });
  };

  const moveCategory = async (categoryId: string, newParentId: string | null) => await updateCategory(categoryId, { parentId: newParentId });
  const copyCategory = async (categoryId: string, newParentId: string | null) => {
    if (!settings?.categories) return;
    const cat = settings.categories.find(c => c.id === categoryId);
    if (cat) await addCategory(`${cat.name} Copy`, newParentId, cat.imageUrl, cat.bannerImageUrls);
  };
  
  const addUpdatePost = async (post: Omit<UpdatePost, 'id' | 'createdAt'>) => {
    const postData = { ...post, createdAt: Date.now() };
    const docRef = await addDoc(collection(db, 'updatePosts'), postData);
    const newPost = { id: docRef.id, ...postData };
    const updated = [newPost, ...updatePosts];
    setUpdatePosts(updated);
  };
  const updateUpdatePost = async (post: UpdatePost) => {
    await setDoc(doc(db, 'updatePosts', post.id), post);
    const updated = updatePosts.map(p => p.id === post.id ? post : p);
    setUpdatePosts(updated);
  };
  const deleteUpdatePost = async (post: UpdatePost) => {
    await deleteDoc(doc(db, 'updatePosts', post.id));
    const updated = updatePosts.filter(p => p.id !== post.id);
    setUpdatePosts(updated);
  };

  const sendChatMessage = async (text: string, sessionId: string) => {
    await addDoc(collection(db, 'chatMessages'), { sessionId, text, sender: 'user', timestamp: Date.now() });
  };
  const sendAdminReply = async (sessionId: string, text: string) => {
    await addDoc(collection(db, 'chatMessages'), { sessionId, text, sender: 'admin', timestamp: Date.now() });
  };
  const deleteChatMessage = async (id: string) => {
    await deleteDoc(doc(db, 'chatMessages', id));
  };

  const toggleWishlist = (id: string) => setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };
  const register = async (email: string, pass: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser: AppUser = {
          uid: cred.user.uid,
          email: email.toLowerCase(),
          role: UserRole.Admin, // Default to admin for now if they use this, but we'll use specific ones
          status: 'active',
          createdAt: Date.now()
      };
      await setDoc(doc(db, 'users', cred.user.uid), newUser);
  };

  const vendorRegister = async (email: string, pass: string, shopName: string, firstName: string, lastName: string, whatsappNumber: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser: AppUser = {
          uid: cred.user.uid,
          email: email.toLowerCase(),
          role: UserRole.Vendor,
          firstName,
          lastName,
          shopName,
          whatsappNumber,
          status: 'pending',
          createdAt: Date.now()
      };
      await setDoc(doc(db, 'users', cred.user.uid), newUser);
  };

  const updateVendorProfile = async (uid: string, data: Partial<AppUser>) => {
      const cleanData = sanitizeForFirestore(data);
      await updateDoc(doc(db, 'users', uid), cleanData);
      setUserData(prev => prev && prev.uid === uid ? { ...prev, ...cleanData } : prev);
      const updatedMap = {
        ...vendorsMap,
        [uid]: { ...(vendorsMap[uid] || { uid, role: UserRole.Vendor }), ...cleanData } as AppUser
      };
      setVendorsMap(updatedMap);
      await syncCatalogBundle({ vendorsMap: updatedMap });
  };

  const logout = async () => await signOut(auth);
  
  const trackWithEmailAndPhone = async (email: string, phone: string) => {
      const normPhone = normalizePhone(phone);
      const rawPhone = phone ? phone.trim() : '';
      const inputEmail = email ? email.trim().toLowerCase() : '';
      
      try {
        let foundOrders: Order[] = [];
        
        // 1. Query by normalized phone
        if (normPhone) {
          const q = query(collection(db, 'orders'), where('customerPhone', '==', normPhone), limit(25));
          const snap = await getDocs(q);
          if (!snap.empty) {
            foundOrders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
          }
        }
        
        // 2. Query by raw phone if not found
        if (foundOrders.length === 0 && rawPhone && rawPhone !== normPhone) {
          const q2 = query(collection(db, 'orders'), where('customerPhone', '==', rawPhone), limit(25));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            foundOrders = snap2.docs.map(d => ({ id: d.id, ...d.data() } as Order));
          }
        }

        // 3. Query by email if still empty
        if (foundOrders.length === 0 && inputEmail) {
          const q3 = query(collection(db, 'orders'), where('email', '==', inputEmail), limit(25));
          const snap3 = await getDocs(q3);
          if (!snap3.empty) {
            foundOrders = snap3.docs.map(d => ({ id: d.id, ...d.data() } as Order));
          }
        }

        if (foundOrders.length > 0) {
            if (inputEmail) {
                const emailFiltered = foundOrders.filter(o => o.email?.toLowerCase() === inputEmail);
                if (emailFiltered.length > 0) foundOrders = emailFiltered;
            }
            foundOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const customerObj = { email: inputEmail || foundOrders[0].email || '', phone: normPhone || rawPhone || foundOrders[0].customerPhone };
            setActiveCustomer(customerObj);
            setCustomerOrders(foundOrders);
            try {
              localStorage.setItem('onliny_tracked_customer', JSON.stringify(customerObj));
              localStorage.setItem('onliny_customer_orders', JSON.stringify(foundOrders));
            } catch (e) {}
            return true;
        }
      } catch (err) {
        console.warn("Track orders error:", err);
      }
      return false;
  };

  const trackOrderById = async (orderId: string): Promise<Order | null> => {
      const cleanId = orderId.trim();
      if (!cleanId) return null;
      try {
          // Direct 1-read document fetch! Exactly 1 read!
          const docSnap = await getDoc(doc(db, 'orders', cleanId));
          if (docSnap.exists()) {
              const order = { id: docSnap.id, ...docSnap.data() } as Order;
              setCustomerOrders([order]);
              setActiveCustomer({ email: order.email || '', phone: order.customerPhone });
              return order;
          }
          // If customer typed custom ID, check with limit(1)
          const q = query(collection(db, 'orders'), where('customId', '==', cleanId), limit(1));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
              const order = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as Order;
              setCustomerOrders([order]);
              setActiveCustomer({ email: order.email || '', phone: order.customerPhone });
              return order;
          }
      } catch (err) {
          console.warn("Track order by ID error:", err);
      }
      return null;
  };
  
  const customerLogout = () => {
      setActiveCustomer(null);
      setCustomerOrders([]);
      try {
        localStorage.removeItem('onliny_tracked_customer');
        localStorage.removeItem('onliny_customer_orders');
      } catch (e) {}
  };
  
  const addCoupon = async (data: Omit<Coupon, 'id' | 'createdAt'>) => {
    const couponId = (data as any).id || `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const couponData = sanitizeForFirestore({
      ...data,
      id: couponId,
      createdAt: Date.now(),
      vendorId: userData?.role === UserRole.Vendor ? userData.uid : (data.vendorId || null)
    });
    const newCoupon = couponData as Coupon;
    const updated = [newCoupon, ...coupons];
    setCoupons(updated);

    try {
      await setDoc(doc(db, 'coupons', couponId), couponData);
    } catch (e) {
      console.warn("Firestore coupon save skipped:", e);
    }
  };

  const updateCoupon = async (data: Coupon) => {
    const cleanData = sanitizeForFirestore(data);
    const updated = coupons.map(c => c.id === data.id ? cleanData : c);
    setCoupons(updated);

    try {
      await setDoc(doc(db, 'coupons', data.id), cleanData, { merge: true });
    } catch (e) {
      console.warn("Firestore coupon update skipped:", e);
    }
  };

  const deleteCoupon = async (id: string) => {
    const updated = coupons.filter(c => c.id !== id);
    setCoupons(updated);

    try {
      await deleteDoc(doc(db, 'coupons', id));
    } catch (e) {
      console.warn("Firestore coupon delete skipped:", e);
    }
  };

  const exportCatalogSnapshot = useCallback(async () => {
    try {
      // 1. Fetch fresh live state directly from Firestore for ALL collections to detect all updates & deletions
      let freshProducts = allProducts;
      let freshBanners = banners;
      let freshCoupons = coupons;
      let freshChallans = challans;
      let freshUpdates = updatePosts;
      let freshSettings = settings || INITIAL_STATIC_CATALOG.settings;
      let freshVendorsStatus = vendorsStatus;
      let freshVendorsMap = vendorsMap;

      try {
        const [settingsSnap, productsSnap, couponsSnap, bannersSnap, challansSnap, updatesSnap, vendorsSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'main')),
          getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'coupons'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'banners'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'challans'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'updatePosts'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'users'), where('role', '==', UserRole.Vendor)))
        ]);

        if (settingsSnap.exists()) {
          freshSettings = settingsSnap.data() as Settings;
        }
        if (!productsSnap.empty) {
          freshProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        }
        if (!couponsSnap.empty) {
          freshCoupons = couponsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
        }
        if (!bannersSnap.empty) {
          freshBanners = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Banner));
        }
        if (!challansSnap.empty) {
          freshChallans = challansSnap.docs.map(d => ({ id: d.id, ...d.data() } as Challan));
        }
        if (!updatesSnap.empty) {
          freshUpdates = updatesSnap.docs.map(d => ({ id: d.id, ...d.data() } as UpdatePost));
        }

        const vStatus: Record<string, string> = {};
        const vMap: Record<string, AppUser> = {};
        vendorsSnap.docs.forEach(d => {
          const u = d.data() as AppUser;
          vStatus[d.id] = u.status;
          vMap[d.id] = { ...u, uid: d.id };
        });
        if (vendorsSnap.docs.length > 0) {
          freshVendorsStatus = vStatus;
          freshVendorsMap = vMap;
        }
      } catch (firestoreFetchErr) {
        console.warn("Snapshot direct Firestore fetch warning (falling back to current memory state):", firestoreFetchErr);
      }

      const safeSettings = freshSettings ? { ...freshSettings } : freshSettings;

      const bundleToSave: CatalogBundle = {
        products: freshProducts,
        settings: safeSettings,
        banners: freshBanners,
        coupons: freshCoupons,
        updatePosts: freshUpdates,
        challans: freshChallans,
        vendorsStatus: freshVendorsStatus,
        vendorsMap: freshVendorsMap,
        lastUpdated: Date.now()
      };

      // 2. Immediately update current React state across app
      applyBundleData(bundleToSave);

      // 3. Save in local browser storage
      try {
        localStorage.setItem('onliny_catalog_initialized', 'true');
        sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(bundleToSave));
        localStorage.setItem(CATALOG_LOCAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: bundleToSave }));
      } catch (e) {}

      // 4. Save on server-side static JSON file (/api/save-catalog) so all laptops, mobiles, and visitors get exact same data
      try {
        await fetch('/api/save-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ catalog: bundleToSave })
        });
      } catch (err) {
        console.warn("Could not save to /api/save-catalog:", err);
      }

      // 5. Sync to Firestore bundle doc
      try {
        await setDoc(doc(db, 'settings', 'catalog_bundle'), sanitizeForFirestore(bundleToSave), { merge: true });
      } catch (dbErr) {
        console.warn("Firestore bundle doc sync skipped:", dbErr);
      }

      return {
        success: true,
        message: 'تمام ڈیٹا ویب سائٹ اور تمام صارفین پر لائیو اپڈیٹ ہو گیا ہے! (Website Synced Live Successfully!)',
        data: bundleToSave
      };
    } catch (e: any) {
      console.error("Export catalog error:", e);
      return {
        success: false,
        message: e?.message || 'Failed to export catalog snapshot'
      };
    }
  }, [allProducts, settings, banners, coupons, updatePosts, challans, vendorsStatus, vendorsMap, applyBundleData]);

  const loadAdminLiveState = useCallback(async () => {
    try {
      const [settingsSnap, productsSnap, couponsSnap, bannersSnap, challansSnap, updatesSnap, vendorsSnap] = await Promise.all([
        getDoc(doc(db, 'settings', 'main')),
        getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'coupons'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'banners'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'challans'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'updatePosts'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'users'), where('role', '==', UserRole.Vendor)))
      ]);

      const loadedSettings = settingsSnap.exists() ? (settingsSnap.data() as Settings) : null;
      const loadedProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      const loadedCoupons = couponsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
      const loadedBanners = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Banner));
      const loadedChallans = challansSnap.docs.map(d => ({ id: d.id, ...d.data() } as Challan));
      const loadedUpdates = updatesSnap.docs.map(d => ({ id: d.id, ...d.data() } as UpdatePost));
      
      const vStatus: Record<string, string> = {};
      const vMap: Record<string, AppUser> = {};
      vendorsSnap.docs.forEach(d => {
        const u = d.data() as AppUser;
        vStatus[d.id] = u.status;
        vMap[d.id] = { ...u, uid: d.id };
      });

      const liveBundle: CatalogBundle = {
        products: loadedProducts.length > 0 ? loadedProducts : allProducts,
        settings: loadedSettings || settings || INITIAL_STATIC_CATALOG.settings,
        banners: loadedBanners,
        coupons: loadedCoupons,
        updatePosts: loadedUpdates,
        challans: loadedChallans,
        vendorsStatus: vStatus,
        vendorsMap: vMap,
        lastUpdated: Date.now()
      };

      applyBundleData(liveBundle);
    } catch (err) {
      console.warn("loadAdminLiveState warning:", err);
    }
  }, [allProducts, settings, applyBundleData]);

  const loadCatalog = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);

    // 1. Instant Cache Render (renders immediately from session/local cache)
    let hasLoadedData = false;
    try {
      const cached = sessionStorage.getItem(CATALOG_SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
          applyBundleData(parsed);
          hasLoadedData = true;
          setIsLoading(false);
          if (!forceRefresh) return;
        }
      } else {
        const localCached = localStorage.getItem(CATALOG_LOCAL_CACHE_KEY);
        if (localCached) {
          const parsedLocal = JSON.parse(localCached);
          if (parsedLocal?.data && Array.isArray(parsedLocal.data.products) && parsedLocal.data.products.length > 0) {
            applyBundleData(parsedLocal.data);
            hasLoadedData = true;
            setIsLoading(false);
            if (!forceRefresh) return;
          }
        }
      }
    } catch (e) {}

    // 2. Load Published Static Catalog Bundle from server (0 Firestore reads!)
    try {
      const res = await fetch(`/api/catalog-data?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && Array.isArray(json.data.products)) {
          applyBundleData(json.data);
          try {
            sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(json.data));
            localStorage.setItem(CATALOG_LOCAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: json.data }));
          } catch (e) {}
          setIsLoading(false);
          return;
        }
      }
    } catch (staticErr) {
      console.warn("Static catalog load note:", staticErr);
    }

    if (!hasLoadedData) {
      applyBundleData(INITIAL_STATIC_CATALOG);
    }
    setIsLoading(false);
  }, [applyBundleData]);

  const refreshCatalog = useCallback(async () => {
    await loadCatalog(true);
  }, [loadCatalog]);

  // Periodically and on window focus, check for updated static catalog from server (0 Firestore reads!)
  useEffect(() => {
    const checkCatalogUpdates = async () => {
      try {
        const res = await fetch(`/api/catalog-data?_t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && Array.isArray(json.data.products)) {
            const serverTimestamp = json.data.lastUpdated || 0;
            if (serverTimestamp > lastCatalogTimestamp) {
              applyBundleData(json.data);
              try {
                sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(json.data));
                localStorage.setItem(CATALOG_LOCAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: json.data }));
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    };

    const handleFocus = () => {
      checkCatalogUpdates();
    };

    window.addEventListener('focus', handleFocus);
    const interval = setInterval(checkCatalogUpdates, 15000);

    // Real-time Firestore instant listener for catalog_bundle
    // As soon as Admin clicks 'Sync Website Data', all customer screens update in < 200ms real-time
    const unsubRealtimeBundle = onSnapshot(doc(db, 'settings', 'catalog_bundle'), (snapshot) => {
      if (snapshot.exists()) {
        const bundle = snapshot.data() as CatalogBundle;
        if (bundle && Array.isArray(bundle.products)) {
          applyBundleData(bundle);
          try {
            sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(bundle));
            localStorage.setItem(CATALOG_LOCAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: bundle }));
          } catch (e) {}
        }
      }
    }, (err) => {
      console.warn("Realtime catalog_bundle subscription note:", err);
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
      unsubRealtimeBundle();
    };
  }, [lastCatalogTimestamp, applyBundleData]);

  const toggleFirebaseMode = useCallback((enabled?: boolean) => {
    setIsFirebaseLiveMode(prev => {
      const next = typeof enabled === 'boolean' ? enabled : !prev;
      try {
        localStorage.setItem('ali_cart_firebase_mode', String(next));
      } catch (e) {}

      // Synchronize in settings and push to Firestore + static catalog file
      setSettings(currentSettings => {
        const updated: Settings = currentSettings 
          ? { ...currentSettings, isFirebaseLiveMode: next } 
          : ({ ...getInitialSettings(), isFirebaseLiveMode: next } as Settings);
        
        syncCatalogBundle({ settings: updated });
        try {
          setDoc(doc(db, 'settings', 'main'), sanitizeForFirestore({ isFirebaseLiveMode: next }), { merge: true });
        } catch (e) {}
        return updated;
      });

      if (next) {
        // If switched to Live mode, refresh from Firestore
        loadCatalog(true);
      }
      return next;
    });
  }, [syncCatalogBundle, loadCatalog]);

  const addBanner = async (data: Omit<Banner, 'id' | 'createdAt'>) => {
    const effectiveVendorId = data.vendorId !== undefined ? data.vendorId : (userData?.role === UserRole.Vendor ? userData.uid : undefined);
    const bannerId = (data as any).id || `banner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const bannerData = sanitizeForFirestore({ 
      ...data,
      id: bannerId,
      createdAt: Date.now(),
      ...(effectiveVendorId && { vendorId: effectiveVendorId })
    });
    const newBanner = bannerData as Banner;
    const updated = [newBanner, ...banners];
    setBanners(updated);

    try {
      await setDoc(doc(db, 'banners', bannerId), bannerData);
    } catch (e) {
      console.warn("Firestore banner save skipped:", e);
    }
  };

  const updateBanner = async (data: Banner) => {
    const cleanData = sanitizeForFirestore(data);
    const updated = banners.map(b => b.id === data.id ? cleanData : b);
    setBanners(updated);

    try {
      await setDoc(doc(db, 'banners', data.id), cleanData, { merge: true });
    } catch (e) {
      console.warn("Firestore banner update skipped:", e);
    }
  };

  const deleteBanner = async (banner: Banner) => {
    if(banner.imageUrl) await deleteFile(banner.imageUrl);
    const updated = banners.filter(b => b.id !== banner.id);
    setBanners(updated);

    try {
      await deleteDoc(doc(db, 'banners', banner.id));
    } catch (e) {
      console.warn("Firestore banner delete skipped:", e);
    }
  };

  const addChallan = async (data: Omit<Challan, 'id' | 'createdAt'>) => {
    const challanId = (data as any).id || `challan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const challanData = sanitizeForFirestore({
      ...data,
      id: challanId,
      createdAt: Date.now()
    });
    const newChallan = challanData as Challan;
    const updated = [newChallan, ...challans];
    setChallans(updated);

    try {
      await setDoc(doc(db, 'challans', challanId), challanData);
    } catch (e) {
      console.warn("Firestore challan save skipped:", e);
    }
  };

  const deleteChallan = async (id: string) => {
    const updated = challans.filter(c => c.id !== id);
    setChallans(updated);

    try {
      await deleteDoc(doc(db, 'challans', id));
    } catch (e) {
      console.warn("Firestore challan delete skipped:", e);
    }
  };

  // On-demand Orders Fetch for Admin
  const loadOrders = useCallback(async (limitCount = 150) => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch (err) {
      console.warn("loadOrders error:", err);
    }
  }, []);

  useEffect(() => {
    // 1-Read Visit Fetch: Loads bundle once per visit
    loadCatalog();

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user profile doc once (1 read) upon login
        try {
          const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userSnap.exists()) {
            const uData = userSnap.data() as AppUser;
            setUserData(uData);
          } else {
            setUserData({
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: UserRole.Admin,
              status: 'active',
              createdAt: Date.now()
            });
          }
        } catch (e) {
          setUserData({
            uid: currentUser.uid,
            email: currentUser.email || '',
            role: UserRole.Admin,
            status: 'active',
            createdAt: Date.now()
          });
        }
        // Load live Firestore collections for admin/vendor editing
        loadAdminLiveState();
      } else {
        setUserData(null);
        setOrders([]);
        setChatMessages([]);
      }
    });

    return () => {
      unsubAuth();
    };
  }, [loadCatalog]);

  const [syncState, setSyncState] = useState<SyncState>(() => dataSyncService.getState());

  useEffect(() => {
    const unsub = dataSyncService.subscribe(setSyncState);
    return unsub;
  }, []);

  const fetchLatestSettingsFromFirestore = useCallback(async (): Promise<Settings | null> => {
    try {
      const res = await dataSyncService.fetchSettingsFromFirestore();
      if (res.success && res.settings) {
        setSettings(res.settings);
        syncDynamicPWABranding({
          appName: res.settings.appName,
          logoUrl: res.settings.logoUrl,
        });
        return res.settings;
      }
    } catch (err) {
      console.warn("fetchLatestSettingsFromFirestore error:", err);
    }
    return null;
  }, []);

  const pushSectionSettingsToFirestore = useCallback(async (
    section: SectionSyncKey | 'all',
    partialData: Partial<Settings>
  ): Promise<boolean> => {
    try {
      const current = settings || getInitialSettings();
      const merged: Settings = {
        ...current,
        ...partialData
      };
      setSettings(merged);
      syncDynamicPWABranding({
        appName: merged.appName,
        logoUrl: merged.logoUrl,
      });

      // Write direct to firestore doc settings/main
      await setDoc(doc(db, 'settings', 'main'), sanitizeForFirestore(merged), { merge: true });

      // Also call dataSyncService to sync state
      await dataSyncService.pushSectionSettings(section as SectionSyncKey, partialData, current);
      return true;
    } catch (err) {
      console.error("pushSectionSettingsToFirestore error:", err);
      return false;
    }
  }, [settings]);

  const value = {
    products, allProducts, cart, orders, settings, chatMessages, coupons, banners, updatePosts,
    isLoading, error, user, userData, myProducts, myOrders, wishlist, activeCustomer, customerOrders,
    addToCart, removeFromCart, updateCartQuantity, clearCart,
    addProduct, updateProduct, deleteProduct, deleteAllProducts, toggleProductVisibility, moveProduct, copyProduct,
    addOrder, updateOrderStatus, deleteOrder,
    sendChatMessage, sendAdminReply, deleteChatMessage,
    updateSettings, addCategory, deleteCategory, updateCategory, moveCategory, copyCategory,
    addUpdatePost, updateUpdatePost, deleteUpdatePost,
    toggleWishlist, uploadFile, deleteFile,
    login, register, vendorRegister, updateVendorProfile, logout, trackWithEmailAndPhone, customerLogout,
    addCoupon, updateCoupon, deleteCoupon, addBanner, updateBanner, deleteBanner,
    addChallan, deleteChallan,
    challans,
    vendorsMap,
    isFirebaseLiveMode,
    toggleFirebaseMode,
    exportCatalogSnapshot,
    syncCatalogBundle,
    refreshCatalog,
    loadOrders,
    trackOrderById,
    fetchLatestSettingsFromFirestore,
    pushSectionSettingsToFirestore,
    syncState
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};