

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { Icons } from '../components/icons/Icons';
import { usePWAInstall } from '../hooks/usePWAInstall';

const MorePage = () => {
    const { settings } = useStore();
    const { isInstalled, isInstallable, isIOS, installPWA } = usePWAInstall();
    const [guideOpen, setGuideOpen] = useState(false);
    const [guideType, setGuideType] = useState<'ios' | 'android'>('android');

    const whatsappLink = settings?.whatsappNumber ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}` : '';
    const emailLink = settings?.adminEmail ? `mailto:${settings.adminEmail}` : '';

    const hasCommunityLinks = 
        settings?.whatsappGroupUrl ||
        settings?.whatsappChannelUrl ||
        settings?.telegramChannelUrl ||
        settings?.youtubeChannelUrl ||
        settings?.instagramChannelUrl ||
        settings?.facebookPageUrl;

    const handleInstallClick = async () => {
        if (isIOS) {
            setGuideType('ios');
            setGuideOpen(true);
        } else {
            const installed = await installPWA();
            if (!installed) {
                setGuideType('android');
                setGuideOpen(true);
            }
        }
    };

    const mainListItems = [
        { label: 'Join Our Community', href: '/community', icon: Icons.users, isExternal: false, show: (settings?.showJoinCommunity ?? true) && !!hasCommunityLinks },
        { label: 'Blog & Updates', href: '/blog', icon: Icons.star, isExternal: false, show: settings?.showLatestUpdates ?? true },
        { label: 'Business / Vendor Portal', href: '/vendor/login', icon: Icons.store, isExternal: false, show: settings?.showVendorPortal ?? true },
        { label: 'Admin Login', href: '/admin/login', icon: Icons.user, isExternal: false },
        { label: 'Contact on WhatsApp', href: whatsappLink, icon: Icons.whatsapp, isExternal: true, show: (settings?.showContactWhatsapp ?? true) && !!whatsappLink },
        { label: 'Contact by Email', href: emailLink, icon: Icons.envelope, isExternal: true, show: (settings?.showContactEmail ?? true) && !!emailLink },
    ].filter(item => item.show !== false);

    const policyItems = [
        { label: 'About Us', href: '/about', icon: Icons.info, badge: 'Our Story' },
        { label: 'Return & Refund Policy', href: '/refund-policy', icon: Icons.refresh, badge: '7 Days' },
        { label: 'Privacy Policy', href: '/privacy-policy', icon: Icons.lock, badge: 'Protected' },
        { label: 'Terms & Conditions', href: '/terms', icon: Icons.fileText, badge: 'Legal' },
    ];

    return (
        <div className="container mx-auto px-4 max-w-md pb-6 space-y-5">
            {/* App & Store Brand Header Card */}
            <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 rounded-2xl p-5 text-white shadow-md flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 p-1 backdrop-blur-md shrink-0 flex items-center justify-center overflow-hidden border-2 border-white/60 shadow-md aspect-square">
                    {settings?.logoUrl ? (
                        <img 
                            src={settings.logoUrl} 
                            alt={settings.appName || 'App Logo'} 
                            className="w-full h-full object-cover rounded-full bg-white aspect-square" 
                        />
                    ) : (
                        <div className="text-2xl font-extrabold font-serif text-white">
                            {settings?.appName?.[0] || '✨'}
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <h2 className="text-xl font-bold font-serif truncate leading-tight">
                        {settings?.appName || 'Zivio'}
                    </h2>
                    <p className="text-xs text-rose-100/90 font-medium mt-0.5">
                        Official Mobile App & Store
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-amber-200 border border-white/20">
                        v1.0 • PWA Ready
                    </span>
                </div>
            </div>
            
            {/* Main Navigation & Portals */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-rose-100">
                <ul className="divide-y divide-gray-200">
                    {mainListItems.map((item) => (
                         <li key={item.label}>
                             {item.isExternal ? (
                                 <a
                                     href={item.href}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                 >
                                     <div className="flex items-center gap-4">
                                         <item.icon className="w-6 h-6 text-gray-500" />
                                         <span className="font-medium text-gray-800">{item.label}</span>
                                     </div>
                                     <Icons.chevronRight className="w-5 h-5 text-gray-400" />
                                 </a>
                             ) : (
                                 <Link
                                     to={item.href}
                                     className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                 >
                                      <div className="flex items-center gap-4">
                                         <item.icon className="w-6 h-6 text-gray-500" />
                                         <span className="font-medium text-gray-800">{item.label}</span>
                                     </div>
                                     <Icons.chevronRight className="w-5 h-5 text-gray-400" />
                                 </Link>
                             )}
                         </li>
                    ))}
                    {!isInstalled && (
                        <li>
                            <button
                                type="button"
                                onClick={handleInstallClick}
                                className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors text-left text-rose-700 bg-gradient-to-r from-rose-50/70 to-amber-50/50 cursor-pointer"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-amber-600 text-white flex items-center justify-center shadow-xs">
                                        <Icons.download className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-slate-900 block text-sm">Install {settings?.appName || 'Onliny'} App</span>
                                            <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">Only 1 MB</span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-medium">Standalone Mobile App • 1-Click Fast Install</span>
                                    </div>
                                </div>
                                <span className="text-xs bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold px-3 py-1 rounded-full shadow-xs">
                                    Install
                                </span>
                            </button>
                        </li>
                    )}
                </ul>
            </div>

            {/* Legal, Trust & Policies Section */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-rose-100">
                <div className="bg-rose-50/70 px-4 py-2.5 border-b border-rose-100/80 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                        <Icons.shieldCheck className="w-3.5 h-3.5 text-rose-600" />
                        <span>Trust, Policies &amp; Store Info</span>
                    </span>
                    <span className="text-[10px] font-semibold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                        100% Verified
                    </span>
                </div>
                <ul className="divide-y divide-gray-100">
                    {policyItems.map((item) => (
                        <li key={item.label}>
                            <Link
                                to={item.href}
                                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-rose-50/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-sm text-slate-800 group-hover:text-rose-700 transition-colors">
                                        {item.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.badge && (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {item.badge}
                                        </span>
                                    )}
                                    <Icons.chevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Official Store Footer Credits */}
            <div className="text-center pt-2 text-xs text-slate-400 space-y-1">
                <p>© 2026 <strong>{settings?.appName || 'Onliny'}</strong>. All Rights Reserved.</p>
                <p className="text-[11px] text-slate-400">
                    Official domain: <a href="https://onliny.co.uk" target="_blank" rel="noopener noreferrer" className="text-rose-600 hover:underline">onliny.co.uk</a> • Support: <a href="mailto:ali10cart@gmail.com" className="text-rose-600 hover:underline">ali10cart@gmail.com</a>
                </p>
            </div>

            {guideOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-100">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-sm">
                                {guideType === 'ios' ? 'Install on iPhone / iPad' : `Install ${settings?.appName || 'Onliny'} App`}
                            </h3>
                            <button onClick={() => setGuideOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <Icons.x className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="py-4 space-y-3 text-xs text-gray-700">
                            {guideType === 'ios' ? (
                                <>
                                    <p>1. Tap the <strong>Share</strong> button <Icons.share className="inline w-3.5 h-3.5 text-rose-600 mb-0.5 mx-0.5" /> in Safari.</p>
                                    <p>2. Tap <strong>Add to Home Screen</strong>.</p>
                                    <p>3. Tap <strong>Add</strong> at top right to complete installation.</p>
                                </>
                            ) : (
                                <>
                                    <div className="text-rose-700 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                                        💡 Shortcut ke bajaye full App install karne ke liye:
                                    </div>
                                    <p>1. Chrome ke ooper 3-dots menu <strong>(⋮)</strong> par tap karein.</p>
                                    <p>2. Menu mein <strong>"Install app"</strong> (یا <strong>"Add to Home screen"</strong>) par click karein.</p>
                                    <p>3. <strong>"Install"</strong> dabayein. App official mobile app ban kar download ho jayegi!</p>
                                </>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setGuideOpen(false)}
                            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs"
                        >
                            Got It / سمجھ آ گئی
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


export default MorePage;