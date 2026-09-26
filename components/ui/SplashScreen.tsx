import React from 'react';
import { motion } from 'motion/react';
import { useStandaloneCategory } from '../../hooks/useStandaloneCategory';
import { useStore } from '../../hooks/useStore';

export const SplashScreen = () => {
    const { settings } = useStore();
    const { isStandalone, storeName, storeLogoUrl } = useStandaloneCategory();

    const displayLogo = storeLogoUrl || settings?.logoUrl || '';
    const rawName = storeName || settings?.appName || 'onliny';
    const displayName = rawName.toLowerCase() === 'online store' ? 'onliny' : rawName;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-gradient-to-b from-[#fffcfd] via-[#fff8f9] to-[#fbf2f4] py-14 px-6 overflow-hidden select-none">
            {/* Ambient Radial Luxury Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-rose-200/50 via-amber-200/40 to-pink-200/50 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Top Brand Tag */}
            <motion.div 
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-2.5 text-[11px] font-bold tracking-[0.3em] uppercase text-rose-800/80"
            >
                <span>Pakistan's Luxury Fashion</span>
                <span className="text-amber-500 text-[9px]">✦</span>
                <span>Boutique</span>
            </motion.div>

            {/* Center Visual: Sleek Circular Logo with Glowing Rings & Diamond Accent */}
            <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center my-auto relative"
            >
                {/* Brand Logo with Glowing Halo */}
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
                    {/* Animated Outer Pulsing Ring */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500/20 to-amber-500/20 blur-md animate-pulse" />
                    
                    {/* Rotating Dashed Orbit */}
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                        className="absolute -inset-2.5 rounded-full border border-dashed border-rose-300/60 pointer-events-none"
                    />

                    {/* Logo Outer Shell */}
                    <div className="relative w-full h-full rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-amber-500 shadow-[0_16px_36px_rgba(225,29,72,0.2)] flex items-center justify-center border-2 border-white">
                        <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center p-1.5 shadow-inner">
                            {displayLogo ? (
                                <img
                                    src={displayLogo}
                                    alt={displayName}
                                    className="w-full h-full object-cover rounded-full aspect-square"
                                    style={{ aspectRatio: '1 / 1' }}
                                />
                            ) : (
                                <img
                                    src="/default-logo.svg"
                                    alt={displayName}
                                    className="w-full h-full object-contain p-2 rounded-full aspect-square bg-white"
                                    style={{ aspectRatio: '1 / 1' }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Typography Brand Block */}
                <motion.div
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="mt-6 flex flex-col items-center"
                >
                    <h1 className="text-3xl sm:text-4xl font-black tracking-[0.2em] text-slate-900 uppercase font-serif">
                        {displayName}
                    </h1>

                    {/* Diamond Line Divider */}
                    <div className="flex items-center gap-3 my-2.5">
                        <span className="h-[1px] w-12 bg-gradient-to-r from-transparent via-amber-400 to-rose-400" />
                        <span className="text-amber-600 text-xs">◆</span>
                        <span className="h-[1px] w-12 bg-gradient-to-l from-transparent via-amber-400 to-rose-400" />
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-600 tracking-wide">
                        {isStandalone ? 'Official Standalone Boutique' : 'Curated Fashion, Unstitched Suits & Lifestyle'}
                    </p>

                    <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 border border-rose-200/80 shadow-xs text-[11px] font-bold text-rose-700">
                        <span>Cash on Delivery</span>
                        <span className="text-amber-500">•</span>
                        <span>7 Days Easy Return</span>
                    </div>
                </motion.div>
            </motion.div>

            {/* Bottom Progress Bar & Loading Indicator */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="flex flex-col items-center gap-2 pb-2"
            >
                <div className="w-36 h-1.5 bg-rose-100 rounded-full overflow-hidden relative shadow-inner">
                    <motion.div
                        className="absolute inset-y-0 w-16 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 rounded-full"
                        animate={{ x: [-64, 144] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>
                <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-slate-400">
                    Loading Store...
                </span>
            </motion.div>
        </div>
    );
};

