import React, { useEffect, useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Icons } from '../icons/Icons';
import { useStore } from '../../hooks/useStore';
import { useStandaloneCategory } from '../../hooks/useStandaloneCategory';

export const PWAInstallBanner = () => {
    const { isInstallable, isInstalled, isIOS, installPWA } = usePWAInstall();
    const { settings } = useStore();
    const { isStandalone, storeName, storeLogoUrl } = useStandaloneCategory();

    const rawName = storeName || settings?.appName || 'onliny';
    const appName = rawName.toLowerCase() === 'online store' ? 'onliny' : rawName;
    const logoUrl = storeLogoUrl || settings?.logoUrl || '';

    const [isVisible, setIsVisible] = useState(false);
    const [isPrompting, setIsPrompting] = useState(false);
    const [guideModalOpen, setGuideModalOpen] = useState(false);

    useEffect(() => {
        // Clear old blocks from previous sessions
        try {
            localStorage.removeItem('pwa_popup_dismissed_at');
            localStorage.removeItem('pwa_popup_dismissed');
            sessionStorage.removeItem('pwa_popup_dismissed');
        } catch (e) {}

        // Don't show if already opened in standalone mode
        if (isInstalled) {
            return;
        }

        // Check if dismissed in the last 2 minutes of this tab session
        try {
            const tempDismissed = sessionStorage.getItem('pwa_banner_temp_dismissed');
            if (tempDismissed) {
                const elapsed = Date.now() - parseInt(tempDismissed, 10);
                if (elapsed < 120 * 1000) {
                    return;
                }
            }
        } catch (e) {}

        // Trigger banner on visit after a short smooth delay
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 500);

        const handleExternalOpen = () => {
            setIsVisible(true);
        };
        window.addEventListener('open-pwa-install-banner', handleExternalOpen);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('open-pwa-install-banner', handleExternalOpen);
        };
    }, [isInstalled]);

    const handleDismiss = () => {
        setIsVisible(false);
        setIsPrompting(false);
        try {
            sessionStorage.setItem('pwa_banner_temp_dismissed', Date.now().toString());
        } catch (e) {}
    };

    const handleInstallClick = async () => {
        setIsPrompting(true);
        try {
            if (isIOS) {
                setGuideModalOpen(true);
                return;
            }
            const installed = await installPWA();
            if (installed) {
                setIsVisible(false);
            } else {
                setGuideModalOpen(true);
            }
        } catch (err) {
            console.error('Install PWA error:', err);
            setGuideModalOpen(true);
        } finally {
            setIsPrompting(false);
        }
    };

    if (!isVisible || isInstalled) return null;

    return (
        <>
            <aside 
                aria-label="Install App Banner"
                className="fixed bottom-16 sm:bottom-5 inset-x-2.5 sm:inset-x-auto sm:right-5 sm:max-w-sm z-[60] animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
            >
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 shadow-xl border border-rose-200/80 text-slate-800 flex items-center justify-between gap-2.5">
                    {/* App Logo & Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-sm shrink-0 overflow-hidden flex items-center justify-center">
                            {logoUrl ? (
                                <img src={logoUrl} alt={appName} className="w-full h-full object-cover rounded-[10px] bg-white aspect-square" />
                            ) : (
                                <Icons.logo className="w-5 h-5 text-white" />
                            )}
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                                    {appName} App
                                </h4>
                                <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                                    ⚡ 1 MB
                                </span>
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate font-medium mt-0.5">
                                Official Mobile App • 1-Click Install
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={handleInstallClick}
                            disabled={isPrompting}
                            className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-extrabold text-[11px] sm:text-xs px-3 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                        >
                            {isPrompting ? (
                                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Icons.download className="w-3.5 h-3.5" />
                            )}
                            <span>Install</span>
                        </button>

                        <button
                            onClick={handleDismiss}
                            aria-label="Close"
                            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <Icons.x className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </aside>

            {guideModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-rose-100">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <Icons.download className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-sm">Install {appName} App</h3>
                            </div>
                            <button onClick={() => setGuideModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <Icons.x className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="py-4 space-y-3 text-xs text-gray-700">
                            {isIOS ? (
                                <>
                                    <p>1. Safari browser ke neeche <strong>Share</strong> button <Icons.share className="inline w-3.5 h-3.5 text-rose-600 mb-0.5 mx-0.5" /> par tap karein.</p>
                                    <p>2. Neeche scroll karke <strong>Add to Home Screen</strong> select karein.</p>
                                    <p>3. Ooper <strong>Add</strong> dabayein, app install ho jayegi!</p>
                                </>
                            ) : (
                                <>
                                    <div className="text-rose-700 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                                        💡 Shortcut ke bajaye full App install karne ke liye:
                                    </div>
                                    <p>1. Chrome ke ooper 3-dots menu <strong>(⋮)</strong> par tap karein.</p>
                                    <p>2. Menu mein <strong>"Install app"</strong> (یا <strong>"Add to Home screen"</strong>) par click karein.</p>
                                    <p>3. <strong>"Install"</strong> par tap karein. App official mobile icon ke sath phone mein download ho jayegi!</p>
                                </>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setGuideModalOpen(false)}
                            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs active:scale-98 transition-all"
                        >
                            Got It / سمجھ آ گئی
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
