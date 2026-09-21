import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useStandaloneCategory } from '../hooks/useStandaloneCategory';
import { ProductCard } from '../components/ProductCard';
import { Spinner } from '../components/ui/Spinner';
import { Icons } from '../components/icons/Icons';
import { MediaPreview } from '../components/ui/MediaPreview';
import { Product, BannerProductItem } from '../types';
import { SEO } from '../components/SEO';
import { shareContent } from '../utils/shareHelper';
import { formatCurrency } from '../utils/helpers';
import { BannerProductSlide } from '../components/ui/BannerProductSlide';
import { VerticalScrollColumn, useBannerHeight } from '../components/ui/VerticalProductSlider';

interface CategoryProductsPageProps {
    isStandalone?: boolean;
}

const CategoryProductsPage: React.FC<CategoryProductsPageProps> = ({ isStandalone = false }) => {
    const { categoryId } = useParams<{ categoryId: string }>();
    const location = useLocation();
    const { products, allProducts, isLoading, settings } = useStore();
    const { isStandalone: isStandaloneHook, standaloneCategory, standaloneType, vendorId, storeName, storeLogoUrl, homeUrl } = useStandaloneCategory();
    const [shuffledProducts, setShuffledProducts] = useState<Product[]>([]);
    const [sortBy, setSortBy] = useState<'all' | 'price-low' | 'price-high'>('all');
    const [viewMode, setViewMode] = useState<'rows' | 'grid'>('rows');
    const { bannerRef, bannerHeight } = useBannerHeight();

    const isStandaloneMode = Boolean(
        isStandalone || 
        isStandaloneHook ||
        location.pathname.startsWith('/store/c/') || 
        location.pathname.startsWith('/store/v/') || 
        location.pathname.startsWith('/vendor-store/') || 
        location.pathname.startsWith('/standalone/')
    );

    const [shareToast, setShareToast] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    
    // State for banner slider
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef<number | null>(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const allCategories = useMemo(() => {
        const cats = settings?.categories || [];
        if (isStandaloneMode && (standaloneType === 'vendor' || vendorId)) {
            return cats.filter(c => c && c.vendorId === vendorId);
        }
        if (!isStandaloneMode) {
            // Main app: strictly exclude vendor categories
            return cats.filter(c => c && (!c.vendorId || c.vendorId === 'admin'));
        }
        return cats;
    }, [settings?.categories, isStandaloneMode, standaloneType, vendorId]);
    
    // Find category: either by route param categoryId or by standaloneCategory ID
    const currentCategory = useMemo(() => {
        if (categoryId) {
            return allCategories.find(c => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase());
        }
        return standaloneCategory;
    }, [allCategories, categoryId, standaloneCategory]);

    const subCategories = useMemo(() => {
        if (!currentCategory) return [];
        return allCategories.filter(c => c.isVisible && c.parentId === currentCategory.id);
    }, [allCategories, currentCategory]);
    
    const isParentCategory = useMemo(() => currentCategory ? !currentCategory.parentId : false, [currentCategory]);

    // Check if user is on the main standalone home page or a subcategory inside standalone mode
    const isStandaloneRoot = Boolean(
        isStandaloneMode && 
        standaloneCategory && 
        currentCategory && 
        (currentCategory.id === standaloneCategory.id || location.pathname.endsWith(`/store/c/${encodeURIComponent(standaloneCategory.id)}`))
    );

    const currentDisplayName = (isStandaloneMode && currentCategory?.storeName) || 
                               (isStandaloneMode && standaloneCategory?.storeName) || 
                               currentCategory?.name || 
                               storeName;

    const currentDisplayLogo = (isStandaloneMode && currentCategory?.storeLogoUrl) || 
                               (isStandaloneMode && standaloneCategory?.storeLogoUrl) || 
                               currentCategory?.imageUrl || 
                               storeLogoUrl;

    const productsToShow = useMemo(() => {
        if (!currentCategory) return [];

        // STRICT ISOLATION:
        // If current category belongs to a vendor, and we are NOT in that vendor's standalone store:
        // DO NOT show vendor products in the main app!
        if (currentCategory.vendorId && (!isStandaloneMode || vendorId !== currentCategory.vendorId)) {
            return [];
        }

        const sourceProducts = currentCategory.vendorId
            ? (allProducts || []).filter(p => p.vendorId === currentCategory.vendorId)
            : products;

        if (isParentCategory) {
            const descendantCategoryIdsOrNames = new Set<string>();
            const queue: string[] = [currentCategory.id];
            
            while(queue.length > 0) {
                const currentId = queue.shift()!;
                const children = allCategories.filter(c => c.parentId === currentId);
                for (const child of children) {
                    if(child.parentId) {
                        descendantCategoryIdsOrNames.add(child.name);
                        descendantCategoryIdsOrNames.add(child.id);
                    }
                    queue.push(child.id);
                }
            }
            return sourceProducts.filter(p => p.isVisible && (descendantCategoryIdsOrNames.has(p.category) || p.category === currentCategory.id || p.category === currentCategory.name));
        }
        
        return sourceProducts.filter(p => p.isVisible && (p.category === currentCategory.id || p.category === currentCategory.name));

    }, [products, allProducts, currentCategory, allCategories, isParentCategory, isStandaloneMode, vendorId]);

    useEffect(() => {
        const shuffled = [...productsToShow];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setShuffledProducts(shuffled);
    }, [productsToShow]);

    const sortedProducts = useMemo(() => {
        const list = [...shuffledProducts];
        if (sortBy === 'price-low') {
            list.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-high') {
            list.sort((a, b) => b.price - a.price);
        }
        return list;
    }, [shuffledProducts, sortBy]);

    // Product rows of 5 for horizontal swipeable display matching Home.tsx
    const productRows = useMemo(() => {
        const chunked: Product[][] = [];
        for (let i = 0; i < sortedProducts.length; i += 5) {
            chunked.push(sortedProducts.slice(i, i + 5));
        }
        return chunked;
    }, [sortedProducts]);

    const leftSideProducts = useMemo(() => {
        return productsToShow.slice(0, 10);
    }, [productsToShow]);

    const rightSideProducts = useMemo(() => {
        return productsToShow.length > 10 ? productsToShow.slice(10, 20) : productsToShow.slice(0, 10);
    }, [productsToShow]);
    
    type CategoryBannerSlideItem = 
      | { type: 'media'; id: string; url: string }
      | { type: 'product'; id: string; product: Product; bannerConfig: BannerProductItem };

    const bannerSlides = useMemo<CategoryBannerSlideItem[]>(() => {
        const slides: CategoryBannerSlideItem[] = [];

        // 1. Media banners
        const mediaUrls = (currentCategory?.bannerImageUrls && currentCategory.bannerImageUrls.length > 0)
            ? currentCategory.bannerImageUrls
            : (currentCategory?.bannerUrls && currentCategory.bannerUrls.length > 0)
                ? currentCategory.bannerUrls
                : currentCategory?.imageUrl ? [currentCategory.imageUrl] : [];

        mediaUrls.forEach((url, i) => {
            slides.push({ type: 'media', id: `media-${i}`, url });
        });

        // 2. Banner products assigned to this category
        if (currentCategory?.id) {
            const catBannerProducts = (settings?.bannerProducts || []).filter(
                item => item.placement === currentCategory.id && item.isActive !== false
            );
            catBannerProducts.forEach(item => {
                const prod = products.find(p => p.id === item.productId && p.isVisible !== false);
                if (prod) {
                    slides.push({
                        type: 'product',
                        id: `prod-${item.id}`,
                        product: prod,
                        bannerConfig: item,
                    });
                }
            });
        }

        return slides;
    }, [currentCategory, settings?.bannerProducts, products]);

    // Keep currentIndex bounded
    useEffect(() => {
        if (currentIndex >= bannerSlides.length && bannerSlides.length > 0) {
            setCurrentIndex(0);
        }
    }, [bannerSlides.length, currentIndex]);

    const nextSlide = useCallback(() => {
        if (bannerSlides.length <= 1) return;
        setCurrentIndex(prev => (prev >= bannerSlides.length - 1 ? 0 : prev + 1));
    }, [bannerSlides.length]);

    const prevSlide = useCallback(() => {
        if (bannerSlides.length <= 1) return;
        setCurrentIndex(prev => (prev === 0 ? bannerSlides.length - 1 : prev - 1));
    }, [bannerSlides.length]);

    const startTimer = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (bannerSlides.length > 1) {
            intervalRef.current = window.setInterval(nextSlide, 4500);
        }
    }, [bannerSlides.length, nextSlide]);

    const stopTimer = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const handleManualNav = (action: () => void) => {
        stopTimer();
        action();
        startTimer();
    };

    const nextSlideManual = () => {
        handleManualNav(nextSlide);
    };

    const prevSlideManual = () => {
        handleManualNav(prevSlide);
    };

    const goToSlide = (index: number) => {
        handleManualNav(() => setCurrentIndex(index));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (touchStartX.current - touchEndX.current > 50) {
            nextSlideManual();
        }
        if (touchStartX.current - touchEndX.current < -50) {
            prevSlideManual();
        }
    };

    useEffect(() => {
        startTimer();
        return () => stopTimer();
    }, [startTimer]);

    const parentCategory = useMemo(() => {
        if (!currentCategory?.parentId) return null;
        return allCategories.find(c => c.id === currentCategory.parentId);
    }, [allCategories, currentCategory]);

    const heroImage = useMemo(() => {
        const mediaSlide = bannerSlides.find(s => s.type === 'media');
        if (mediaSlide && 'url' in mediaSlide) return mediaSlide.url;
        const prodSlide = bannerSlides.find(s => s.type === 'product');
        if (prodSlide && 'product' in prodSlide && prodSlide.product.images?.[0]) return prodSlide.product.images[0];
        return currentDisplayLogo || '';
    }, [bannerSlides, currentDisplayLogo]);

    const handleShareCategory = async () => {
        if (!currentCategory) return;
        setIsSharing(true);
        const origin = window.location.origin;
        const bannerImg = heroImage;
        
        const shareParams = new URLSearchParams({
            type: 'standalone',
            id: currentCategory.id,
            title: `${currentDisplayName} Official Store`,
            desc: `Explore exclusive ${currentDisplayName} collection. Verified quality, best prices & fast delivery!`,
            image: bannerImg,
            app: currentDisplayName
        });
        const smartShareUrl = `${origin}/share?${shareParams.toString()}`;

        await shareContent({
            type: 'category',
            id: currentCategory.id,
            title: `${currentDisplayName} Official Store`,
            description: `Explore exclusive ${currentDisplayName} products with fast delivery & best prices.`,
            image: bannerImg,
            appName: currentDisplayName,
        }, (msg) => {
            setShareToast(msg);
            setTimeout(() => setShareToast(null), 3000);
        });
        setIsSharing(false);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <Spinner size="lg" />
                <p className="text-xs font-semibold text-rose-600 animate-pulse">
                    Loading {currentDisplayName || 'Storefront'}...
                </p>
            </div>
        );
    }

    if (!currentCategory) {
        return (
            <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-sm border border-rose-100 max-w-md mx-auto my-8">
                <Icons.search className="w-16 h-16 mx-auto mb-4 text-rose-300" />
                <h2 className="text-xl font-bold text-slate-800">Category Not Found</h2>
                <p className="text-xs text-slate-500 mt-1 mb-6">The category you requested may have been moved or updated.</p>
                <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 text-white font-bold text-xs shadow-md hover:bg-rose-700 transition-all">
                    <Icons.home className="w-4 h-4" />
                    <span>Return to Home</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20 md:pb-8">
            <SEO 
                title={isStandaloneMode ? `${currentDisplayName} Official Store` : `${currentDisplayName} Products`}
                description={`Browse ${currentDisplayName} collection. Shop verified quality products with cash on delivery & nationwide fast shipping.`}
                image={heroImage}
                type="website"
                schema={[
                    {
                        "@context": "https://schema.org",
                        "@type": "Store",
                        "name": `${currentDisplayName} Official Store`,
                        "description": `Official ${currentDisplayName} storefront. Verified authentic items and fast home delivery.`,
                        "image": heroImage || currentDisplayLogo,
                        "currenciesAccepted": "PKR",
                        "paymentAccepted": "Cash on Delivery",
                        "priceRange": "PKR"
                    },
                    {
                        "@context": "https://schema.org",
                        "@type": "CollectionPage",
                        "name": `${currentDisplayName} Catalog`,
                        "description": `Catalog of items available in ${currentDisplayName}.`,
                        "mainEntity": {
                            "@type": "ItemList",
                            "numberOfItems": sortedProducts.length,
                            "itemListElement": sortedProducts.slice(0, 12).map((p, idx) => ({
                                "@type": "ListItem",
                                "position": idx + 1,
                                "name": p.name,
                                "image": p.images?.[0] || currentDisplayLogo,
                                "offers": {
                                    "@type": "Offer",
                                    "price": p.price,
                                    "priceCurrency": "PKR",
                                    "availability": "https://schema.org/InStock"
                                }
                            }))
                        }
                    }
                ]}
            />

            {/* Share Toast */}
            {shareToast && (
                <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-2xl shadow-xl border border-rose-500/40 text-xs font-bold flex items-center gap-2 animate-fade-in backdrop-blur-md">
                    <Icons.checkCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{shareToast}</span>
                </div>
            )}

            {/* Top Navigation Bar: Handles Standalone Subcategory Navigation & Share */}
            <div className="flex items-center justify-between gap-2 px-1">
                {isStandaloneMode ? (
                    !isStandaloneRoot && standaloneCategory ? (
                        /* When viewing a sub-category in standalone mode: Clear, prominent 1-tap Home button */
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Link 
                                to={homeUrl} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-rose-50 border border-rose-200 text-slate-800 hover:text-rose-600 shadow-2xs transition-all active:scale-95 shrink-0"
                            >
                                <Icons.home className="w-3.5 h-3.5 text-rose-600" />
                                <span className="truncate max-w-[120px] sm:max-w-none">
                                    {standaloneCategory.storeName || standaloneCategory.name} Home
                                </span>
                            </Link>
                            <Link
                                to={`/store/c/${encodeURIComponent(standaloneCategory.id)}/categories`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 shadow-2xs transition-all active:scale-95 shrink-0"
                            >
                                <Icons.category className="w-3.5 h-3.5 text-rose-600" />
                                <span>Categories</span>
                            </Link>
                        </div>
                    ) : (
                        /* Root Standalone Storefront Badge with Logo */
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-rose-200 text-rose-800 shadow-2xs">
                            {currentDisplayLogo ? (
                                <img src={currentDisplayLogo} alt={currentDisplayName} className="w-4 h-4 rounded-full object-cover border border-rose-300" />
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            )}
                            <span className="truncate max-w-[180px] sm:max-w-none">
                                {currentDisplayName} Official Store
                            </span>
                        </div>
                    )
                ) : (
                    <Link 
                        to={parentCategory ? `/category/${parentCategory.id}` : "/categories"} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-rose-50 border border-rose-200 text-slate-700 hover:text-rose-600 shadow-2xs transition-all active:scale-95"
                    >
                        <Icons.chevronLeft className="w-4 h-4 text-rose-600" />
                        <span className="truncate max-w-[130px] sm:max-w-none">
                            {parentCategory ? parentCategory.name : 'All Categories'}
                        </span>
                    </Link>
                )}

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleShareCategory}
                        disabled={isSharing}
                        aria-label="Share this store"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                        <Icons.share2 className="w-3.5 h-3.5" />
                        <span>{isStandaloneMode ? 'Share Store' : 'Share'}</span>
                    </button>
                </div>
            </div>

            {/* Desktop Hero Layout: Center 16:9 Banner + Left/Right Vertical Scrolling Product Lists (Strictly matching Banner Height) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-start">
                {/* Left Vertical Scrolling Column (Desktop Only - Strictly locked to Banner Height) */}
                <div 
                    className="hidden lg:block lg:col-span-3 min-h-0 overflow-hidden"
                    style={{ height: bannerHeight ? `${bannerHeight}px` : undefined }}
                >
                    <VerticalScrollColumn
                        title="Recommended"
                        badge="For You"
                        products={leftSideProducts}
                        height={bannerHeight}
                    />
                </div>

                {/* Center 16:9 Banner Slider (Matching Home.tsx exact aspect ratio & styling) */}
                <div className="col-span-1 lg:col-span-6 min-h-0">
                    <div 
                        ref={bannerRef}
                        className="relative w-full aspect-[16/9] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md group border border-rose-100 bg-slate-900"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {bannerSlides.length > 0 ? (
                            <div className="flex transition-transform duration-500 ease-in-out h-full w-full" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                                {bannerSlides.map((slide, index) => (
                                    <div key={slide.id || index} className="w-full h-full flex-shrink-0 relative">
                                        {slide.type === 'media' ? (
                                            <MediaPreview 
                                                src={slide.url} 
                                                className="w-full h-full object-cover" 
                                                autoPlay={true} 
                                                loop={true} 
                                                muted={true} 
                                                controls={false} 
                                            />
                                        ) : (
                                            <BannerProductSlide 
                                                product={slide.product} 
                                                bannerConfig={slide.bannerConfig} 
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Fallback when no banner uploaded: Premium branded 16:9 boutique hero */
                            <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-rose-700 via-rose-600 to-amber-600 flex items-center justify-between p-4 sm:p-8 text-white">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />
                                
                                <div className="relative z-10 max-w-[70%]">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-100 border border-white/20">
                                        <Icons.sparkles className="w-3 h-3 text-amber-200" />
                                        <span>Official Storefront</span>
                                    </span>
                                    <h1 className="text-xl sm:text-3xl md:text-4xl font-serif font-black text-white mt-1.5 tracking-tight drop-shadow-sm leading-tight">
                                        {currentDisplayName}
                                    </h1>
                                    <p className="text-[11px] sm:text-sm text-rose-100 font-medium mt-1 line-clamp-1">
                                        {productsToShow.length > 0 
                                             ? `Explore ${productsToShow.length} verified products with express delivery` 
                                            : 'Handpicked styles & verified premium quality'}
                                    </p>
                                </div>

                                <div className="relative z-10 w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg shrink-0 overflow-hidden">
                                    {currentDisplayLogo ? (
                                        <img src={currentDisplayLogo} alt={currentDisplayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <Icons.sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-amber-200" />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Chic bottom banner title overlay only on media slides */}
                        {bannerSlides.length > 0 && bannerSlides[currentIndex]?.type === 'media' && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 sm:p-4 flex items-end justify-between pointer-events-none">
                                <div className="flex items-center gap-2">
                                    {currentDisplayLogo && (
                                        <img src={currentDisplayLogo} alt={currentDisplayName} className="w-8 h-8 rounded-full border border-white/80 object-cover shadow-sm" />
                                    )}
                                    <div>
                                        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-300 font-bold drop-shadow-sm block">
                                            {isStandaloneMode ? 'Official Collection' : (parentCategory?.name || 'Collection')}
                                        </span>
                                        <h1 className="text-base sm:text-xl font-black text-white tracking-tight drop-shadow-md">
                                            {currentDisplayName}
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Slider Navigation Dots & Controls (Exact same styling as Home.tsx) */}
                        {bannerSlides.length > 1 && (
                            <>
                                <button 
                                    onClick={prevSlideManual} 
                                    className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/40 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs z-20 cursor-pointer"
                                    aria-label="Previous slide"
                                >
                                    <Icons.chevronLeft className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={nextSlideManual} 
                                    className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/40 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs z-20 cursor-pointer"
                                    aria-label="Next slide"
                                >
                                    <Icons.chevronRight className="w-5 h-5" />
                                </button>
                                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                                    {bannerSlides.map((_, index) => (
                                        <button 
                                            key={index} 
                                            onClick={() => goToSlide(index)} 
                                            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${index === currentIndex ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/75'}`}
                                            aria-label={`Go to slide ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Vertical Scrolling Column (Desktop Only - Strictly locked to Banner Height) */}
                <div 
                    className="hidden lg:block lg:col-span-3 min-h-0 overflow-hidden"
                    style={{ height: bannerHeight ? `${bannerHeight}px` : undefined }}
                >
                    <VerticalScrollColumn
                        title="Trending Deals"
                        badge="Top Picks"
                        products={rightSideProducts}
                        height={bannerHeight}
                    />
                </div>
            </div>

            {/* Sub-categories Section: Only shown if NOT on standalone mode root (as user requested: sub-categories available via Categories tab) */}
            {!isStandaloneMode && subCategories.length > 0 && (
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
                                Sub-categories
                            </h2>
                            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                {subCategories.length}
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">Swipe to explore →</span>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x">
                        {subCategories.map(subCat => {
                            const count = products.filter(p => p.isVisible && (p.category === subCat.id || p.category === subCat.name)).length;
                            return (
                                <Link 
                                    key={subCat.id} 
                                    to={`/category/${subCat.id}`} 
                                    className="group shrink-0 flex flex-col items-center gap-1.5 w-20 sm:w-24 text-center snap-start transition-transform active:scale-95"
                                >
                                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-rose-100 bg-white p-0.5 shadow-2xs group-hover:shadow-md group-hover:border-rose-400 transition-all flex items-center justify-center">
                                        {subCat.imageUrl ? (
                                            <MediaPreview 
                                                src={subCat.imageUrl} 
                                                className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300" 
                                                controls={false} 
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-rose-50 to-amber-50 rounded-xl flex items-center justify-center text-rose-500">
                                                <Icons.sparkles className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] sm:text-xs font-bold text-slate-800 group-hover:text-rose-600 line-clamp-1 max-w-full leading-tight">
                                        {subCat.name}
                                    </span>
                                    {count > 0 && (
                                        <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full border border-rose-100/60">
                                            {count} items
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Sort / Filter Bar & View Mode Toggle */}
            {productsToShow.length > 0 && (
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-1">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => setSortBy('all')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${sortBy === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                        >
                            All ({productsToShow.length})
                        </button>
                        <button
                            onClick={() => setSortBy('price-low')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${sortBy === 'price-low' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                        >
                            Price: Low to High
                        </button>
                        <button
                            onClick={() => setSortBy('price-high')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${sortBy === 'price-high' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
                        >
                            Price: High to Low
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shrink-0">
                        <button
                            onClick={() => setViewMode('rows')}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${viewMode === 'rows' ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Swipeable rows view"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="6" x2="21" y2="6"/>
                                <line x1="3" y1="12" x2="21" y2="12"/>
                                <line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Grid view"
                        >
                            <Icons.category className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Products Section: Identical to Home.tsx style and layout */}
            {sortedProducts.length > 0 ? (
                <div>
                    <h2 className="text-xl font-extrabold font-serif text-slate-900 mb-4 px-1 border-l-4 border-rose-600 pl-3">
                        Trending & Featured Collections
                    </h2>

                    {viewMode === 'rows' ? (
                        /* Horizontal Swipeable Rows (Exactly matching Home.tsx) */
                        <div className="space-y-4">
                            {productRows.map((row, rowIndex) => (
                                <div 
                                    key={`row-${rowIndex}`} 
                                    className="flex overflow-x-auto gap-3 pb-3 -mx-4 px-4 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                >
                                    {row.map((item, itemIndex) => {
                                        const key = `row-${rowIndex}-product-${item.id}-${itemIndex}`;
                                        const wrapperClasses = "w-2/5 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0";
                                        return (
                                            <div key={key} className={wrapperClasses}>
                                                <ProductCard product={item} />
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Exact Responsive Grid View (matching Home responsive breakpoints) */
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
                            {sortedProducts.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-gray-100 p-8">
                    <Icons.search className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                    <h3 className="text-lg font-semibold text-slate-800">No products available</h3>
                    <p className="text-sm text-slate-500 mt-1">There are no active products in "{currentDisplayName}" at the moment.</p>
                </div>
            )}

            {/* Mobile Trust Strip (Identical to Home.tsx styling) */}
            <div className="grid grid-cols-3 gap-2 py-3 px-2 bg-gradient-to-r from-rose-50/80 via-white to-rose-50/80 rounded-2xl border border-rose-100/70 text-center shadow-2xs mt-4">
                <div className="flex flex-col items-center justify-center p-1">
                    <span className="text-base">⚡</span>
                    <span className="text-[10px] font-bold text-slate-800 mt-0.5">Fast Delivery</span>
                    <span className="text-[8px] text-slate-400">All Pakistan</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1 border-x border-rose-100">
                    <span className="text-base">💎</span>
                    <span className="text-[10px] font-bold text-slate-800 mt-0.5">100% Genuine</span>
                    <span className="text-[8px] text-slate-400">Verified Quality</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1">
                    <span className="text-base">🤝</span>
                    <span className="text-[10px] font-bold text-slate-800 mt-0.5">Easy Return</span>
                    <span className="text-[8px] text-slate-400">Doorstep Support</span>
                </div>
            </div>
        </div>
    );
};

export default CategoryProductsPage;
