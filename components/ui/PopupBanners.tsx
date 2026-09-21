import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { Icons } from '../icons/Icons';
import { ImageWithFallback } from './ImageWithFallback';

export const PopupBanners = () => {
    const { settings, banners } = useStore();
    const [isVisible, setIsVisible] = useState(false);
    
    // Active popup banner: Only from admin settings.popupBanner OR an explicit admin popup banner
    // STRICTLY NEVER show vendor banners (which have vendorId) or normal home slider banners
    const activePopup = useMemo(() => {
        // Priority 1: Directly configured in Admin Settings -> Popup Banner
        if (settings?.popupBanner && settings.popupBanner.enabled && settings.popupBanner.imageUrl?.trim()) {
            return {
                id: `popup_settings_${settings.popupBanner.imageUrl.trim()}`,
                imageUrl: settings.popupBanner.imageUrl.trim(),
                redirectUrl: settings.popupBanner.redirectUrl?.trim(),
                title: settings.popupBanner.title || 'Promotional Offer'
            };
        }

        // Priority 2: Admin banner explicitly marked with isPopup === true (and NOT belonging to any vendor)
        const explicitPopup = (banners || []).find(b => b && b.isPopup === true && !b.vendorId && b.isActive && b.imageUrl);
        if (explicitPopup) {
            return {
                id: explicitPopup.id,
                imageUrl: explicitPopup.imageUrl,
                redirectUrl: explicitPopup.redirectUrl,
                title: explicitPopup.title || 'Promotional Offer'
            };
        }

        return null;
    }, [settings?.popupBanner, banners]);

    const bannerId = activePopup?.id;

    useEffect(() => {
        if (!bannerId) {
            setIsVisible(false);
            return;
        }
        
        const isClosed = sessionStorage.getItem(`bannerClosed_${bannerId}`);
        if (!isClosed) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 600); // Smooth delay
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [bannerId]);

    const handleClose = () => {
        setIsVisible(false);
        if (bannerId) {
            sessionStorage.setItem(`bannerClosed_${bannerId}`, 'true');
        }
    };

    if (!isVisible || !activePopup) {
        return null;
    }

    const BannerContent = (
        <ImageWithFallback
            src={activePopup.imageUrl}
            alt={activePopup.title || "Promotional Banner"}
            className="w-full h-full object-contain bg-white"
        />
    );

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" onClick={handleClose}>
            <div className="relative bg-white rounded-2xl w-full max-w-sm mx-auto shadow-2xl animate-slide-in-up aspect-video overflow-hidden border border-white/20" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={handleClose}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white w-7 h-7 rounded-full shadow-lg flex items-center justify-center z-10 transition-colors cursor-pointer"
                    aria-label="Close Banner"
                >
                    <Icons.x className="w-4 h-4" />
                </button>
                
                {activePopup.redirectUrl ? (
                    <a href={activePopup.redirectUrl} target="_blank" rel="noopener noreferrer" onClick={handleClose} className="block w-full h-full">
                        {BannerContent}
                    </a>
                ) : (
                    <div className="w-full h-full">{BannerContent}</div>
                )}
            </div>
        </div>
    );
};