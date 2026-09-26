import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Settings } from '../types';
import { sanitizeForFirestore, safeJsonStringify } from '../utils/helpers';
import { syncDynamicPWABranding } from '../utils/pwaHelper';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export type SectionSyncKey = 
  | 'branding' 
  | 'shipping' 
  | 'contact' 
  | 'payment' 
  | 'menu' 
  | 'policy' 
  | 'email' 
  | 'liveMode';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastFetchedAt: number | null;
  lastError: string | null;
  activeSection: string | null;
  isOnline: boolean;
}

type SyncListener = (state: SyncState) => void;

class DataSyncService {
  private state: SyncState = {
    status: 'idle',
    lastSyncedAt: null,
    lastFetchedAt: null,
    lastError: null,
    activeSection: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  };

  private listeners: Set<SyncListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.updateOnlineStatus(true));
      window.addEventListener('offline', () => this.updateOnlineStatus(false));
      
      // Load last known sync time from localStorage
      try {
        const stored = localStorage.getItem('onliny_last_firestore_sync');
        if (stored) {
          const num = parseInt(stored, 10);
          if (!isNaN(num)) this.state.lastSyncedAt = num;
        }
      } catch (e) {}
    }
  }

  private updateOnlineStatus(isOnline: boolean) {
    this.state.isOnline = isOnline;
    this.notify();
  }

  public getState(): SyncState {
    return { ...this.state };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(fn => {
      try {
        fn(currentState);
      } catch (e) {
        console.warn("Sync listener notification error:", e);
      }
    });
  }

  private cleanSettings(raw: any): Settings {
    if (!raw) return {} as Settings;
    const s = { ...raw };
    if (s.logoUrl && (s.logoUrl.includes('UklGRtYs') || s.logoUrl.toLowerCase().includes('zivio'))) {
      s.logoUrl = '';
    }
    // Clean Urdu from Cash on Delivery payment details
    if (Array.isArray(s.paymentMethods)) {
      s.paymentMethods = s.paymentMethods.map((m: any) => {
        if (m.id === 'cod' || (m.name && m.name.toLowerCase().includes('cash on delivery'))) {
          const cleanDetails = (m.details || '').replace(/[\u0600-\u06FF]/g, '').trim();
          return {
            ...m,
            name: 'Cash on Delivery',
            details: cleanDetails || 'Pay in cash upon delivery.'
          };
        }
        return m;
      });
    }
    return s as Settings;
  }

  /**
   * Fetch the most up-to-date Settings directly from Firestore 'settings/main'.
   * Prevents stale cache session overwrites.
   */
  public async fetchSettingsFromFirestore(): Promise<{
    success: boolean;
    settings: Settings | null;
    timestamp: number;
    error?: string;
  }> {
    this.state.status = 'syncing';
    this.state.activeSection = 'all';
    this.state.lastError = null;
    this.notify();

    try {
      // 1. Read primary settings doc
      const mainSnap = await getDoc(doc(db, 'settings', 'main'));
      let fetchedSettings: Settings | null = null;

      if (mainSnap.exists()) {
        fetchedSettings = this.cleanSettings(mainSnap.data());
      } else {
        // Fallback: check catalog_bundle doc
        const bundleSnap = await getDoc(doc(db, 'settings', 'catalog_bundle'));
        if (bundleSnap.exists()) {
          const bundleData = bundleSnap.data();
          if (bundleData?.settings) {
            fetchedSettings = this.cleanSettings(bundleData.settings);
          }
        }
      }

      const now = Date.now();
      this.state.lastFetchedAt = now;
      this.state.status = 'synced';
      this.state.activeSection = null;
      this.notify();

      return {
        success: true,
        settings: fetchedSettings,
        timestamp: now
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to fetch settings from Firestore';
      console.error("Firestore settings fetch error:", err);
      this.state.status = 'error';
      this.state.lastError = errMsg;
      this.state.activeSection = null;
      this.notify();

      return {
        success: false,
        settings: null,
        timestamp: Date.now(),
        error: errMsg
      };
    }
  }

  /**
   * Push a complete Settings object to Firestore, update server bundle & browser caches.
   */
  public async pushSettingsToFirestore(
    settingsToSave: Settings,
    sectionName: string = 'all'
  ): Promise<{
    success: boolean;
    timestamp: number;
    error?: string;
  }> {
    this.state.status = 'syncing';
    this.state.activeSection = sectionName;
    this.state.lastError = null;
    this.notify();

    try {
      const sanitized = sanitizeForFirestore(settingsToSave);
      const now = Date.now();

      // 1. Direct write to Firestore settings/main
      await setDoc(doc(db, 'settings', 'main'), sanitized, { merge: true });

      // 2. Also update settings inside settings/catalog_bundle in Firestore
      try {
        await setDoc(doc(db, 'settings', 'catalog_bundle'), {
          settings: sanitized,
          lastUpdated: now
        }, { merge: true });
      } catch (bundleErr) {
        console.warn("catalog_bundle settings sync note:", bundleErr);
      }

      // 3. Update PWA Dynamic Branding in client DOM
      syncDynamicPWABranding({
        appName: settingsToSave.appName,
        logoUrl: settingsToSave.logoUrl
      });

      // 4. Update server disk bundle & PWA icons
      try {
        await fetch('/api/update-branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appName: settingsToSave.appName || 'onliny',
            logoUrl: settingsToSave.logoUrl || ''
          })
        });
      } catch (brandingErr) {
        console.warn("Server branding update note:", brandingErr);
      }

      // 5. Update local browser cache keys
      try {
        const sessionKey = 'ali_cart_catalog_bundle_cache_v1';
        const localKey = 'ali_cart_catalog_bundle_cache_local_v1';
        const currentSession = sessionStorage.getItem(sessionKey);
        if (currentSession) {
          const parsed = JSON.parse(currentSession);
          const updated = { ...parsed, settings: settingsToSave, lastUpdated: now };
          sessionStorage.setItem(sessionKey, safeJsonStringify(updated));
          localStorage.setItem(localKey, JSON.stringify({ cachedAt: now, data: updated }));
        }
        localStorage.setItem('onliny_last_firestore_sync', String(now));
      } catch (cacheErr) {}

      this.state.status = 'synced';
      this.state.lastSyncedAt = now;
      this.state.activeSection = null;
      this.notify();

      return {
        success: true,
        timestamp: now
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to push settings to Firestore';
      console.error("Firestore settings push error:", err);
      this.state.status = 'error';
      this.state.lastError = errMsg;
      this.state.activeSection = null;
      this.notify();

      return {
        success: false,
        timestamp: Date.now(),
        error: errMsg
      };
    }
  }

  /**
   * Push a specific section's settings to Firestore without having to resave the entire form blindly.
   */
  public async pushSectionSettings(
    section: SectionSyncKey,
    sectionData: Partial<Settings>,
    currentSettings: Settings
  ): Promise<{
    success: boolean;
    updatedSettings: Settings;
    timestamp: number;
    error?: string;
  }> {
    const merged: Settings = {
      ...currentSettings,
      ...sectionData
    };

    const res = await this.pushSettingsToFirestore(merged, section);

    return {
      success: res.success,
      updatedSettings: merged,
      timestamp: res.timestamp,
      error: res.error
    };
  }
}

export const dataSyncService = new DataSyncService();
