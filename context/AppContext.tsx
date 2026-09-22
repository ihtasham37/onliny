import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext, useMemo } from 'react';
import { 
    getFirestore, collection, doc, onSnapshot, orderBy, query, addDoc, setDoc, deleteDoc, updateDoc, where, getDocs, writeBatch, getDoc
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

  addToCart: (product: Product, quantity: number, selectedSizes?: Record<string, string>, additionalInfo?: string) => void;
  removeFromCart: (productId: string, selectedSizes?: Record<string, string>) => void;
  updateCartQuantity: (productId: string, quantity: number, selectedSizes?: Record<string, string>) => void;
  clearCart: () => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
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
}

const getInitialSettings = (): Settings => {
  try {
    const sessionCached = sessionStorage.getItem('ali_cart_catalog_bundle_cache_v1');
    if (sessionCached) {
      const parsed = JSON.parse(sessionCached);
      if (parsed?.settings?.appName) return parsed.settings;
    }
    const localCached = localStorage.getItem('ali_cart_catalog_bundle_cache_local_v1');
    if (localCached) {
      const parsed = JSON.parse(localCached);
      if (parsed?.data?.settings?.appName) return parsed.data.settings;
    }
  } catch (e) {}
  if (INITIAL_STATIC_CATALOG.settings && (INITIAL_STATIC_CATALOG.settings as any).appName) {
    return INITIAL_STATIC_CATALOG.settings as unknown as Settings;
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
  } as unknown as Settings;
};

const getInitialProducts = (): Product[] => {
  try {
    const sessionCached = sessionStorage.getItem('ali_cart_catalog_bundle_cache_v1');
    if (sessionCached) {
      const parsed = JSON.parse(sessionCached);
      if (Array.isArray(parsed?.products) && parsed.products.length > 0) return parsed.products;
    }
    const localCached = localStorage.getItem('ali_cart_catalog_bundle_cache_local_v1');
    if (localCached) {
      const parsed = JSON.parse(localCached);
      if (Array.isArray(parsed?.data?.products) && parsed.data.products.length > 0) return parsed.data.products;
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
    // Main app store displays ONLY platform/admin products.
    // Vendor products are strictly isolated to their own standalone website link.
    return allProducts.filter(p => !p.vendorId || p.vendorId === 'admin');
  }, [allProducts]);
  
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

  const [activeCustomer, setActiveCustomer] = useSessionStorage<{ email: string, phone: string } | null>('active-tracking-id', null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  const [isFirebaseLiveMode, setIsFirebaseLiveMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ali_cart_firebase_mode');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const toggleFirebaseMode = useCallback((enabled?: boolean) => {
    setIsFirebaseLiveMode(prev => {
      const next = typeof enabled === 'boolean' ? enabled : !prev;
      try {
        localStorage.setItem('ali_cart_firebase_mode', String(next));
      } catch (e) {}
      if (next) {
        // If switched to Live mode, refresh from Firestore
        loadCatalog(true);
      }
      return next;
    });
  }, []);
  
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

  const applyBundleData = useCallback((data: Partial<CatalogBundle>) => {
    if (Array.isArray(data.products)) setAllProducts(data.products);
    if (data.settings) setSettings(data.settings);
    if (Array.isArray(data.banners)) setBanners(data.banners);
    if (Array.isArray(data.coupons)) setCoupons(data.coupons);
    if (Array.isArray(data.updatePosts)) setUpdatePosts(data.updatePosts);
    if (Array.isArray(data.challans)) setChallans(data.challans);
    if (data.vendorsStatus) setVendorsStatus(data.vendorsStatus);
    if (data.vendorsMap) setVendorsMap(data.vendorsMap);
  }, []);

  const syncCatalogBundle = useCallback(async (overrides?: Partial<CatalogBundle>) => {
    try {
      const rawSettings = overrides?.settings ?? settings;
      const safeSettings = rawSettings ? { ...rawSettings } : rawSettings;
      if (safeSettings && (safeSettings as any).gmailAppPassword) {
        delete (safeSettings as any).gmailAppPassword;
      }

      const bundleToSave: CatalogBundle = {
        products: overrides?.products ?? allProducts,
        settings: safeSettings,
        banners: overrides?.banners ?? banners,
        coupons: overrides?.coupons ?? coupons,
        updatePosts: overrides?.updatePosts ?? updatePosts,
        challans: overrides?.challans ?? challans,
        vendorsStatus: overrides?.vendorsStatus ?? vendorsStatus,
        vendorsMap: overrides?.vendorsMap ?? vendorsMap,
        lastUpdated: Date.now()
      };
      await setDoc(doc(db, 'settings', 'catalog_bundle'), sanitizeForFirestore(bundleToSave), { merge: true });
      try {
        sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(bundleToSave));
        localStorage.setItem(CATALOG_LOCAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: bundleToSave }));
      } catch (e) {}
    } catch (e) {
      console.warn("Could not sync catalog bundle:", e);
    }
  }, [allProducts, settings, banners, coupons, updatePosts, challans, vendorsStatus, vendorsMap]);

  const addProduct = async (data: Omit<Product, 'id' | 'createdAt'>) => {
    const isVendor = userData?.role === UserRole.Vendor;
    const vendorId = isVendor ? userData.uid : (data.vendorId || undefined);
    const shopName = isVendor ? (userData.shopName || 'Vendor Store') : (data.shopName || (vendorId ? '' : (settings?.appName || 'Store')));
    const productData = sanitizeForFirestore({
        ...data,
        createdAt: Date.now(),
        ...(vendorId && { vendorId, shopName }),
        ...(userData?.role === UserRole.Admin && !data.shopName && !vendorId && {
            shopName: settings?.appName || 'Store'
        })
    });
    const docRef = await addDoc(collection(db, 'products'), productData);
    const newProd = { id: docRef.id, ...productData } as Product;
    const updated = [newProd, ...allProducts];
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
  };
  const updateProduct = async (data: Product) => {
    const existing = allProducts.find(p => p.id === data.id);
    const mergedData: Product = {
      ...existing,
      ...data,
      ...(existing?.vendorId && !data.vendorId ? { vendorId: existing.vendorId, shopName: existing.shopName } : {})
    };
    const cleanData = sanitizeForFirestore(mergedData);
    await setDoc(doc(db, 'products', mergedData.id), cleanData);
    const updated = allProducts.map(p => p.id === data.id ? cleanData : p);
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
  };
  const deleteProduct = async (id: string) => {
    const prod = allProducts.find(p => p.id === id);
    if (prod?.images) await Promise.all(prod.images.map(url => deleteFile(url)));
    await deleteDoc(doc(db, 'products', id));
    const updated = allProducts.filter(p => p.id !== id);
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
  };
  const toggleProductVisibility = async (id: string, isVisible: boolean) => {
    await updateDoc(doc(db, 'products', id), { isVisible });
    const updated = allProducts.map(p => p.id === id ? { ...p, isVisible } : p);
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
  };
  const moveProduct = async (id: string, newCategory: string) => {
    await updateDoc(doc(db, 'products', id), { category: newCategory });
    const updated = allProducts.map(p => p.id === id ? { ...p, category: newCategory } : p);
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
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
        customerPhone: phone, 
        email: orderData.email.trim().toLowerCase(),
        createdAt: Date.now() 
    });
    const docRef = await addDoc(collection(db, 'orders'), cleanedData);
    
    clearCart();
    return docRef.id;
  };
  
  const updateOrderStatus = async (id: string, status: OrderStatus) => await updateDoc(doc(db, 'orders', id), { status });
  const deleteOrder = async (id: string) => await deleteDoc(doc(db, 'orders', id));
  
  const updateSettings = async (data: Settings) => {
    setSettings(data);
    try {
      const currentBundleStr = sessionStorage.getItem(CATALOG_SESSION_CACHE_KEY);
      if (currentBundleStr) {
        const parsed = JSON.parse(currentBundleStr);
        const updated = { ...parsed, settings: data, lastUpdated: Date.now() };
        sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(updated));
        localStorage.setItem(CATALOG_LOCAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: updated }));
      }
    } catch (e) {}

    await setDoc(doc(db, 'settings', 'main'), sanitizeForFirestore(data), { merge: true });
    await syncCatalogBundle({ settings: data });
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
    await syncCatalogBundle({ updatePosts: updated });
  };
  const updateUpdatePost = async (post: UpdatePost) => {
    await setDoc(doc(db, 'updatePosts', post.id), post);
    const updated = updatePosts.map(p => p.id === post.id ? post : p);
    setUpdatePosts(updated);
    await syncCatalogBundle({ updatePosts: updated });
  };
  const deleteUpdatePost = async (post: UpdatePost) => {
    await deleteDoc(doc(db, 'updatePosts', post.id));
    const updated = updatePosts.filter(p => p.id !== post.id);
    setUpdatePosts(updated);
    await syncCatalogBundle({ updatePosts: updated });
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
      const inputEmail = email.trim().toLowerCase();
      
      // Query by phone from orders collection to find matching orders
      const q = query(collection(db, 'orders'), where('customerPhone', '==', normPhone));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
          // Filter by email in memory
          const foundOrders = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Order))
            .filter(o => o.email?.toLowerCase() === inputEmail);
          
          if (foundOrders.length > 0) {
              setActiveCustomer({ email: inputEmail, phone: normPhone });
              return true;
          }
      }
      return false;
  };
  
  const customerLogout = () => {
      setActiveCustomer(null);
      setCustomerOrders([]);
  };

  useEffect(() => {
    // Customer phone from active customer or local storage
    const targetPhone = activeCustomer?.phone || localStorage.getItem('user_last_phone');
    if (!targetPhone) return;

    let isInitialLoad = true;
    
    // Request notification permission if default
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    const normTargetPhone = normalizePhone(targetPhone);
    const q = query(collection(db, 'orders'), where('customerPhone', '==', normTargetPhone));
    
    const unsub = onSnapshot(q, snap => {
        if (!isInitialLoad) {
            snap.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    const order = { id: change.doc.id, ...change.doc.data() } as Order;
                    
                    // Sound effect for status update
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(() => {});

                    const orderDisplayId = (order as any).customId || order.id.substring(0, 6).toUpperCase();
                    const notifTitle = `Order Status Updated - ${settings?.appName || 'Zivio Store'}`;
                    const notifBody = `Your order #${orderDisplayId} is now: ${order.status.toUpperCase()} (آپ کے آرڈر کا اسٹیٹس: ${order.status})`;

                    // 1. Browser/PWA Native Notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        try {
                            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                                navigator.serviceWorker.ready.then(reg => {
                                    reg.showNotification(notifTitle, {
                                        body: notifBody,
                                        icon: '/favicon.svg',
                                        badge: '/pwa-192x192.png',
                                        tag: `order-update-${order.id}`,
                                        data: { url: `/?track=${encodeURIComponent(targetPhone)}` }
                                    });
                                });
                            } else {
                                new Notification(notifTitle, {
                                    body: notifBody,
                                    icon: '/favicon.svg'
                                });
                            }
                        } catch (e) {
                            new Notification(notifTitle, { body: notifBody, icon: '/favicon.svg' });
                        }
                    } else {
                        // Fallback alert
                        alert(`📦 ${notifTitle}\n${notifBody}`);
                    }
                }
            });
        }
        isInitialLoad = false;

        if (activeCustomer) {
            const results = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Order))
                .filter(o => !activeCustomer.email || o.email?.toLowerCase() === activeCustomer.email.toLowerCase());
            
            setCustomerOrders(results.sort((a, b) => b.createdAt - a.createdAt));
        }
    });
    return () => unsub();
  }, [activeCustomer, settings]);
  
  const addCoupon = async (data: Omit<Coupon, 'id' | 'createdAt'>) => {
    const couponData = sanitizeForFirestore({
      ...data,
      createdAt: Date.now(),
      vendorId: userData?.role === UserRole.Vendor ? userData.uid : (data.vendorId || null)
    });
    const docRef = await addDoc(collection(db, 'coupons'), couponData);
    const newCoupon = { id: docRef.id, ...couponData };
    const updated = [newCoupon, ...coupons];
    setCoupons(updated);
    await syncCatalogBundle({ coupons: updated });
  };
  const updateCoupon = async (data: Coupon) => {
    const cleanData = sanitizeForFirestore(data);
    await setDoc(doc(db, 'coupons', data.id), cleanData);
    const updated = coupons.map(c => c.id === data.id ? cleanData : c);
    setCoupons(updated);
    await syncCatalogBundle({ coupons: updated });
  };
  const deleteCoupon = async (id: string) => {
    await deleteDoc(doc(db, 'coupons', id));
    const updated = coupons.filter(c => c.id !== id);
    setCoupons(updated);
    await syncCatalogBundle({ coupons: updated });
  };

  const exportCatalogSnapshot = useCallback(async () => {
    try {
      const rawSettings = settings || INITIAL_STATIC_CATALOG.settings;
      const safeSettings = rawSettings ? { ...rawSettings } : rawSettings;
      if (safeSettings && (safeSettings as any).gmailAppPassword) {
        delete (safeSettings as any).gmailAppPassword;
      }

      const bundleToSave: CatalogBundle = {
        products: allProducts.length > 0 ? allProducts : INITIAL_STATIC_CATALOG.products,
        settings: safeSettings,
        banners: banners,
        coupons: coupons,
        updatePosts: updatePosts,
        challans: challans,
        vendorsStatus: vendorsStatus,
        vendorsMap: vendorsMap,
        lastUpdated: Date.now()
      };

      // 1. Save in local browser storage
      try {
        sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(bundleToSave));
        localStorage.setItem(CATALOG_LOCAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: bundleToSave }));
      } catch (e) {}

      // 2. Save on server-side disk static JSON (if endpoint is available)
      try {
        await fetch('/api/save-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ catalog: bundleToSave })
        });
      } catch (err) {
        console.warn("Could not save to /api/save-catalog (fallback to client store):", err);
      }

      // 3. If currently in Firebase mode, sync to Firestore bundle doc
      try {
        await setDoc(doc(db, 'settings', 'catalog_bundle'), sanitizeForFirestore(bundleToSave), { merge: true });
      } catch (dbErr) {
        console.warn("Firestore bundle doc sync skipped:", dbErr);
      }

      return {
        success: true,
        message: 'Static catalog snapshot created & synced successfully!',
        data: bundleToSave
      };
    } catch (e: any) {
      console.error("Export catalog error:", e);
      return {
        success: false,
        message: e?.message || 'Failed to export catalog snapshot'
      };
    }
  }, [allProducts, settings, banners, coupons, updatePosts, challans, vendorsStatus, vendorsMap]);

  const loadCatalog = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);

    const isLive = localStorage.getItem('ali_cart_firebase_mode') !== 'false';

    // 1. Instant Cache Render (Stale-While-Revalidate for 0ms initial load)
    try {
      const cached = sessionStorage.getItem(CATALOG_SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
          applyBundleData(parsed);
          setIsLoading(false);
        }
      } else {
        const localCached = localStorage.getItem(CATALOG_LOCAL_CACHE_KEY);
        if (localCached) {
          const parsedLocal = JSON.parse(localCached);
          if (parsedLocal?.data?.products && parsedLocal.data.products.length > 0) {
            applyBundleData(parsedLocal.data);
            setIsLoading(false);
          }
        }
      }
    } catch (e) {}

    // 2. Fetch Live Data from Firestore
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

      // If Firestore contains products, prioritize real Firestore items over static defaults
      const finalProducts = loadedProducts.length > 0 ? loadedProducts : INITIAL_STATIC_CATALOG.products;

      const compiledBundle: CatalogBundle = {
        products: finalProducts,
        settings: loadedSettings || INITIAL_STATIC_CATALOG.settings,
        banners: loadedBanners,
        coupons: loadedCoupons,
        updatePosts: loadedUpdates,
        challans: loadedChallans,
        vendorsStatus: vStatus,
        vendorsMap: vMap,
        lastUpdated: Date.now()
      };

      applyBundleData(compiledBundle);
      try {
        sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(compiledBundle));
        localStorage.setItem(CATALOG_LOCAL_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: compiledBundle }));
      } catch (e) {}

      // Keep catalog_bundle doc updated in Firestore
      try {
        await setDoc(doc(db, 'settings', 'catalog_bundle'), sanitizeForFirestore(compiledBundle), { merge: true });
      } catch (writeErr) {}
    } catch (fallbackErr) {
      console.warn("Error fetching live Firestore catalog, keeping cached data or static fallback:", fallbackErr);
      // Fallback only if no products have been loaded
      if (!sessionStorage.getItem(CATALOG_SESSION_CACHE_KEY) && !localStorage.getItem(CATALOG_LOCAL_CACHE_KEY)) {
        applyBundleData(INITIAL_STATIC_CATALOG);
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyBundleData]);

  const refreshCatalog = useCallback(async () => {
    await loadCatalog(true);
  }, [loadCatalog]);

  const addBanner = async (data: Omit<Banner, 'id' | 'createdAt'>) => {
    const effectiveVendorId = data.vendorId !== undefined ? data.vendorId : (userData?.role === UserRole.Vendor ? userData.uid : undefined);
    const bannerData = sanitizeForFirestore({ 
      ...data, 
      createdAt: Date.now(),
      ...(effectiveVendorId && { vendorId: effectiveVendorId })
    });
    const docRef = await addDoc(collection(db, 'banners'), bannerData);
    const newBanner = { id: docRef.id, ...bannerData };
    const updated = [newBanner, ...banners];
    setBanners(updated);
    await syncCatalogBundle({ banners: updated });
  };
  const updateBanner = async (data: Banner) => {
    const cleanData = sanitizeForFirestore(data);
    await setDoc(doc(db, 'banners', data.id), cleanData);
    const updated = banners.map(b => b.id === data.id ? cleanData : b);
    setBanners(updated);
    await syncCatalogBundle({ banners: updated });
  };
  const deleteBanner = async (banner: Banner) => {
    if(banner.imageUrl) await deleteFile(banner.imageUrl);
    await deleteDoc(doc(db, 'banners', banner.id));
    const updated = banners.filter(b => b.id !== banner.id);
    setBanners(updated);
    await syncCatalogBundle({ banners: updated });
  };

  const addChallan = async (data: Omit<Challan, 'id' | 'createdAt'>) => {
    const challanData = sanitizeForFirestore({ ...data, createdAt: Date.now() });
    const docRef = await addDoc(collection(db, 'challans'), challanData);
    const newChallan = { id: docRef.id, ...challanData };
    const updated = [newChallan, ...challans];
    setChallans(updated);
    await syncCatalogBundle({ challans: updated });
  };

  const deleteChallan = async (id: string) => {
    await deleteDoc(doc(db, 'challans', id));
    const updated = challans.filter(c => c.id !== id);
    setChallans(updated);
    await syncCatalogBundle({ challans: updated });
  };

  useEffect(() => {
    // 1-Read Visit Fetch: Loads bundle once per visit
    loadCatalog();

    let unsubOrders = () => {}, unsubChat = () => {}, unsubUserData = () => {};
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      unsubOrders(); unsubChat(); unsubUserData();
      if (currentUser) {
        let previousStatus: string | null = null;
        unsubUserData = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
            if (snap.exists()) {
                const uData = snap.data() as AppUser;
                setUserData(uData);

                // Notify pending vendor on acceptance/approval
                if (previousStatus === 'pending' && uData.status === 'active') {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(() => {});
                    
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('Account Approved!', {
                            body: `Congratulations ${uData.firstName}! Your vendor shop "${uData.shopName}" has been accepted. You can now access your dashboard.`,
                            icon: '/favicon.svg'
                        });
                    } else {
                        alert(`Congratulations! Your vendor shop "${uData.shopName}" has been accepted.`);
                    }
                }
                previousStatus = uData.status;
            } else {
                setUserData({
                    uid: currentUser.uid,
                    email: currentUser.email || '',
                    role: UserRole.Admin,
                    status: 'active',
                    createdAt: Date.now()
                });
            }
        });
        let isInitialOrdersLoad = true;
        const sessionStartTime = Date.now();
        
        // Helper to get already notified order IDs
        const getNotifiedOrders = (): Set<string> => {
          try {
            const raw = localStorage.getItem('admin_notified_order_ids');
            return new Set(raw ? JSON.parse(raw) : []);
          } catch {
            return new Set();
          }
        };

        const markOrderNotified = (orderId: string) => {
          try {
            const notified = getNotifiedOrders();
            notified.add(orderId);
            localStorage.setItem('admin_notified_order_ids', JSON.stringify(Array.from(notified).slice(-200)));
          } catch {}
        };

        // Admin notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
            const notifiedSet = getNotifiedOrders();

            if (!isInitialOrdersLoad) {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const order = { id: change.doc.id, ...change.doc.data() } as Order;
                        const isVendor = userData?.role === UserRole.Vendor;
                        const isAdmin = !userData?.role || userData.role === UserRole.Admin;
                        
                        const isForThisVendor = isVendor && order.vendorIds?.includes(currentUser.uid);
                        const isForAdmin = isAdmin && (!order.vendorIds || order.vendorIds.length === 0 || order.vendorIds.includes('admin'));

                        // ONLY notify if order was created after this session started AND not already notified
                        const isNewInThisSession = (order.createdAt || 0) >= (sessionStartTime - 10000);
                        const notYetNotified = !notifiedSet.has(order.id);

                        if ((isForThisVendor || isForAdmin) && isNewInThisSession && notYetNotified) {
                            markOrderNotified(order.id);

                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                            audio.play().catch(() => {});

                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification('New Order Received!', {
                                    body: `Order from ${order.customerName} for ${order.total.toLocaleString()} PKR.`,
                                    icon: '/favicon.svg'
                                });
                            }
                        }
                    }
                });
            } else {
                // On initial snapshot load, mark ALL existing orders as seen so they never trigger notifications
                snap.docs.forEach(d => markOrderNotified(d.id));
            }
            isInitialOrdersLoad = false;
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        });
        unsubChat = onSnapshot(query(collection(db, "chatMessages"), orderBy("timestamp", "asc")), (snap) => setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage))));
      } else { setOrders([]); setChatMessages([]); }
    });

    return () => {
      unsubOrders(); unsubChat(); unsubUserData(); unsubAuth();
    };
  }, [loadCatalog]);

  const value = {
    products, allProducts, cart, orders, settings, chatMessages, coupons, banners, updatePosts,
    isLoading, error, user, userData, myProducts, myOrders, wishlist, activeCustomer, customerOrders,
    addToCart, removeFromCart, updateCartQuantity, clearCart,
    addProduct, updateProduct, deleteProduct, toggleProductVisibility, moveProduct, copyProduct,
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
    refreshCatalog
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};