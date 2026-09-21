import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { Icons } from '../icons/Icons';

export const AnnouncementBanner: React.FC = () => {
    const { settings } = useStore();
    const announcement = settings?.announcementBanner;
    const [isDismissed, setIsDismissed] = useState(false);

    const isEnabled = Boolean(announcement?.enabled && (announcement?.text || announcement?.linkUrl));

    // Allow user to dismiss for current session, but if text or link changes, show it again
    useEffect(() => {
        if (!isEnabled || !announcement) return;
        const bannerKey = `announcement_dismissed_${announcement.text || ''}_${announcement.linkUrl || ''}`;
        try {
            const dismissed = sessionStorage.getItem(bannerKey);
            if (dismissed === 'true') {
                setIsDismissed(true);
            } else {
                setIsDismissed(false);
            }
        } catch (e) {
            setIsDismissed(false);
        }
    }, [isEnabled, announcement?.text, announcement?.linkUrl]);

    if (!isEnabled || isDismissed || !announcement) {
        return null;
    }

    const handleDismiss = () => {
        setIsDismissed(true);
        try {
            const bannerKey = `announcement_dismissed_${announcement.text || ''}_${announcement.linkUrl || ''}`;
            sessionStorage.setItem(bannerKey, 'true');
        } catch (e) {}
    };

    const isPlayStoreLink = announcement.linkUrl?.toLowerCase().includes('play.google.com');

    return (
        <aside 
            aria-label="Announcement"
            className="w-full bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 text-white py-2 px-3 sm:px-4 shadow-sm border-b border-rose-800/30 text-xs sm:text-sm select-none"
        >
            <div className="container mx-auto flex items-center justify-between gap-2 max-w-7xl">
                {/* Content with icon and text */}
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-center sm:justify-start">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        {isPlayStoreLink ? (
                            <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
                                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                            </svg>
                        ) : (
                            <Icons.sparkles className="w-3 h-3 text-amber-200" />
                        )}
                    </div>
                    
                    <span className="font-medium text-white tracking-tight truncate leading-tight">
                        {announcement.text || 'Download our app for an enhanced shopping experience!'}
                    </span>
                </div>

                {/* Action button & Dismiss */}
                <div className="flex items-center gap-2 shrink-0">
                    {announcement.linkUrl && (
                        <a
                            href={announcement.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-white text-rose-700 hover:bg-amber-50 active:scale-95 font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full shadow-xs transition-all shrink-0"
                        >
                            {isPlayStoreLink ? (
                                <svg className="w-3 h-3 fill-current text-rose-600" viewBox="0 0 24 24">
                                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                                </svg>
                            ) : (
                                <Icons.download className="w-3 h-3 text-rose-600" />
                            )}
                            <span>{announcement.buttonText || (isPlayStoreLink ? 'Get on Play Store' : 'Download App')}</span>
                        </a>
                    )}

                    <button
                        onClick={handleDismiss}
                        aria-label="Dismiss banner"
                        className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <Icons.x className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </aside>
    );
};
