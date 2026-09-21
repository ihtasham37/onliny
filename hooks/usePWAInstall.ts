import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if early interceptor in index.html already captured the prompt
    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      setIsInstallable(true);
    }

    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handlePromptReady = () => {
      if ((window as any).deferredPWAInstallPrompt) {
        setDeferredPrompt((window as any).deferredPWAInstallPrompt);
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
      setIsInstallable(false);
      try {
        localStorage.setItem('pwa_app_installed', 'true');
      } catch (e) {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async (): Promise<boolean> => {
    // 1. If prompt is immediately ready, trigger it
    let promptEvent = deferredPrompt || (window as any).deferredPWAInstallPrompt;

    // 2. If not yet ready, wait briefly for browser event to finish firing
    if (!promptEvent) {
      promptEvent = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
        let timer: any = null;
        const handler = (e: any) => {
          clearTimeout(timer);
          window.removeEventListener('pwa-prompt-ready', handler);
          resolve(e.detail || (window as any).deferredPWAInstallPrompt || null);
        };
        window.addEventListener('pwa-prompt-ready', handler);
        timer = setTimeout(() => {
          window.removeEventListener('pwa-prompt-ready', handler);
          resolve((window as any).deferredPWAInstallPrompt || null);
        }, 1200);
      });
    }

    if (!promptEvent) {
      return false;
    }

    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        (window as any).deferredPWAInstallPrompt = null;
        setIsInstallable(false);
        try {
          localStorage.setItem('pwa_app_installed', 'true');
        } catch (e) {}
        return true;
      }
    } catch (err) {
      console.error('Error during native PWA install prompt:', err);
    }
    return false;
  };

  return { isInstallable, isInstalled, isIOS, installPWA };
}

