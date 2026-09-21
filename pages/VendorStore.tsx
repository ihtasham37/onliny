import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useStandaloneCategory } from '../hooks/useStandaloneCategory';
import { ProductCard } from '../components/ProductCard';
import { FullPageSpinner } from '../components/ui/Spinner';
import { MediaPreview } from '../components/ui/MediaPreview';
import { Icons } from '../components/icons/Icons';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Coupon, Product, AppUser } from '../types';
import { SEO } from '../components/SEO';
import { formatCurrency } from '../utils/helpers';
import { copyToClipboard } from '../utils/shareHelper';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { VerticalScrollColumn, useBannerHeight } from '../components/ui/VerticalProductSlider';

// Coupon card for center banner carousel
const CouponBannerCard: React.FC<{ coupon: Coupon }> = ({ coupon }) => (
  <div className="w-full h-full flex-shrink-0 bg-gradient-to-br from-rose-600 via-pink-600 to-amber-500 text-white flex flex-col items-center justify-center p-4 text-center">
    <div className="bg-white/20 p-2 rounded-full mb-1 backdrop-blur-sm">
      <Icons.ticket className="w-6 h-6" />
    </div>
    <h2 className="text-xl font-extrabold tracking-tight drop-shadow-md">{coupon.code}</h2>
    <p className="mt-0.5 text-xs font-medium opacity-90">{coupon.description}</p>
    <div className="mt-2 inline-block bg-white text-rose-800 font-bold px-4 py-1 rounded-full shadow-lg text-[10px] uppercase tracking-wide">
      {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `Save ${coupon.discountValue}`}
      {coupon.minBill > 0 && ` on orders over ${coupon.minBill}`}
    </div>
  </div>
);

// Coupon card shown in product rows/grid
const CouponGridCard: React.FC<{ coupon: Coupon }> = ({ coupon }) => (
  <div className="group rounded-2xl overflow-hidden shadow-sm hover:shadow-md flex flex-col bg-gradient-to-br from-pink-500 to-orange-400 text-white transition-all duration-300 h-full items-center justify-center p-4 text-center relative border-2 border-white/20 aspect-[3/4]">
    <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
      Discount Coupon
    </div>
    <Icons.ticket className="w-9 h-9 mb-2 opacity-90" />
    <h3 className="text-xl font-black tracking-wider mb-1 border-2 border-dashed border-white/50 px-3 py-1 rounded-lg bg-white/10">{coupon.code}</h3>
    <p className="text-xs font-medium leading-tight opacity-95 line-clamp-2 mb-2">{coupon.description}</p>
    <div className="bg-white text-pink-600 text-xs font-bold px-3 py-1 rounded-full shadow-xs">
      {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `Special Offer`}
    </div>
  </div>
);

// Chunk helper for rows of 5 items
const chunk = <T,>(arr: T[], size: number): T[][] => {
  const chunkedArr: T[][] = [];
  if (!arr) return chunkedArr;
  for (let i = 0; i < arr.length; i += size) {
    chunkedArr.push(arr.slice(i, i + size));
  }
  return chunkedArr;
};

const VendorStore = () => {
  const params = useParams<{ vendorId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { allProducts, isLoading, vendorsMap, banners, coupons, settings } = useStore();
  const { vendorId: hookVendorId } = useStandaloneCategory();
  const { bannerRef, bannerHeight } = useBannerHeight();

  const vendorId = useMemo(() => {
    if (params.vendorId && params.vendorId !== 'v') {
      return decodeURIComponent(params.vendorId);
    }
    const match = location.pathname.match(/(?:\/store\/v\/|\/vendor-store\/)([^/?#]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return hookVendorId || params.vendorId || '';
  }, [params.vendorId, location.pathname, hookVendorId]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryCat = searchParams.get('category') || searchParams.get('cat');
  const [vendorData, setVendorData] = useState<AppUser | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(queryCat || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (queryCat) {
      setSelectedCategory(queryCat);
    }
  }, [queryCat]);

  useEffect(() => {
    if (!vendorId) {
      setVendorData(null);
      return;
    }
    if (vendorsMap && vendorsMap[vendorId]) {
      setVendorData(vendorsMap[vendorId]);
      return;
    }
    const matchingProduct = (allProducts || []).find(p => p.vendorId === vendorId);
    setVendorData({
      uid: vendorId,
      shopName: matchingProduct?.shopName || 'Vendor Boutique',
      email: '',
      role: 'vendor',
      status: 'active',
      createdAt: 0
    } as AppUser);
  }, [vendorId, vendorsMap, allProducts]);

  // Vendor categories
  const vendorCategories = useMemo(() => {
    return (settings?.categories || []).filter(c => c.vendorId === vendorId && c.isVisible !== false);
  }, [settings?.categories, vendorId]);

  // Vendor products
  const vendorProducts = useMemo(() => {
    if (!vendorId) return [];
    return (allProducts || []).filter(p => p.vendorId === vendorId && p.isVisible !== false);
  }, [allProducts, vendorId]);

  // Active Category & Active Category Banners
  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return vendorCategories.find(c => c.name === selectedCategory || c.id === selectedCategory) || null;
  }, [selectedCategory, vendorCategories]);

  const activeCategoryBanners = useMemo(() => {
    if (!activeCategoryObj) return [];
    const list: string[] = [];
    if (activeCategoryObj.bannerImageUrls && Array.isArray(activeCategoryObj.bannerImageUrls)) {
      activeCategoryObj.bannerImageUrls.forEach(u => u && !list.includes(u) && list.push(u));
    }
    if (activeCategoryObj.bannerUrls && Array.isArray(activeCategoryObj.bannerUrls)) {
      activeCategoryObj.bannerUrls.forEach(u => u && !list.includes(u) && list.push(u));
    }
    if (activeCategoryObj.imageUrl && !list.includes(activeCategoryObj.imageUrl)) {
      list.push(activeCategoryObj.imageUrl);
    }
    return list;
  }, [activeCategoryObj]);

  // Vendor banners
  const vendorBanners = useMemo(() => {
    const list: string[] = [];
    const directBanners = (banners || []).filter(b => b.vendorId === vendorId && b.isActive !== false);
    directBanners.forEach(b => {
      if (b.imageUrl && !list.includes(b.imageUrl)) list.push(b.imageUrl);
    });

    if (vendorData?.shopBanners && Array.isArray(vendorData.shopBanners)) {
      vendorData.shopBanners.forEach(img => {
        if (img && !list.includes(img)) list.push(img);
      });
    }

    if (vendorData?.shopBannerUrl && !list.includes(vendorData.shopBannerUrl)) {
      list.push(vendorData.shopBannerUrl);
    }

    return list;
  }, [banners, vendorId, vendorData]);

  // Vendor active coupons
  const vendorCoupons = useMemo(() => {
    return (coupons || []).filter(c => c.vendorId === vendorId);
  }, [coupons, vendorId]);

  // Combined carousel items:
  // If viewing a category: Show that category's banner(s)
  // If viewing All Collections: Show vendor banners + coupon cards
  const sliderItems = useMemo(() => {
    if (selectedCategory !== 'all' && activeCategoryObj) {
      if (activeCategoryBanners.length > 0) {
        return activeCategoryBanners.map(url => ({ type: 'banner' as const, data: url }));
      }
      return [];
    }

    const bannerItems = vendorBanners.map(url => ({ type: 'banner' as const, data: url }));
    const couponItems = vendorCoupons
      .filter(c => c.assignment === 'banner' || c.assignment === 'both')
      .map(coupon => ({ type: 'coupon' as const, data: coupon }));
    return [...bannerItems, ...couponItems];
  }, [selectedCategory, activeCategoryObj, activeCategoryBanners, vendorBanners, vendorCoupons]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory]);

  // Slider controls
  const nextSlide = useCallback(() => {
    if (sliderItems.length <= 1) return;
    setCurrentIndex(prev => (prev === sliderItems.length - 1 ? 0 : prev + 1));
  }, [sliderItems.length]);

  const startSlider = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sliderItems.length > 1) {
      intervalRef.current = window.setInterval(nextSlide, 4500);
    }
  }, [nextSlide, sliderItems.length]);

  useEffect(() => {
    startSlider();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startSlider]);

  const handleManualNav = (action: () => void) => {
    action();
    startSlider();
  };

  const prevSlide = () => {
    handleManualNav(() => setCurrentIndex(prev => (prev === 0 ? sliderItems.length - 1 : prev - 1)));
  };

  const nextSlideManual = () => {
    handleManualNav(nextSlide);
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
      prevSlide();
    }
  };

  const filteredProducts = useMemo(() => {
    return vendorProducts.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory || p.subCategory === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [vendorProducts, selectedCategory, searchQuery]);

  // Desktop side products (recommended & trending)
  const leftSideProducts = useMemo(() => {
    return vendorProducts.slice(0, 6);
  }, [vendorProducts]);

  const rightSideProducts = useMemo(() => {
    return vendorProducts.slice(6, 12);
  }, [vendorProducts]);

  // Display items for the horizontal scroll rows (chunk of 5)
  const productRows = useMemo(() => {
    // Interleave vendor coupons into the products stream
    const items: (Product | Coupon)[] = [...filteredProducts];
    if (vendorCoupons.length > 0 && selectedCategory === 'all' && !searchQuery) {
      vendorCoupons.forEach((cp, idx) => {
        const insertPos = Math.min((idx + 1) * 4, items.length);
        items.splice(insertPos, 0, cp);
      });
    }
    return chunk(items, 5);
  }, [filteredProducts, vendorCoupons, selectedCategory, searchQuery]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: vendorData?.shopName || 'Online Store',
      text: `Shop from ${vendorData?.shopName || 'this store'} online with direct delivery!`,
      url: url
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {}
    }

    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (isLoading && vendorProducts.length === 0) {
    return <FullPageSpinner />;
  }

  if (!vendorData) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-rose-100 p-8 max-w-xl mx-auto my-12 shadow-sm">
        <Icons.store className="w-16 h-16 mx-auto text-rose-300 mb-4" />
        <h2 className="text-2xl font-bold font-serif text-slate-800">Store Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">The store you are looking for does not exist or has been moved.</p>
        <Button onClick={() => navigate('/')} className="mt-6">Explore Home App</Button>
      </div>
    );
  }

  const storeDisplayName = vendorData.shopName || 'Storefront';
  const storeLogo = vendorData.shopLogoUrl || '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      <SEO 
        title={`${storeDisplayName} - Official Store`}
        description={vendorData.shopDescription || `Shop directly from ${storeDisplayName}. Exclusive collection, fast shipping, and verified seller quality.`}
        image={storeLogo || vendorBanners[0]}
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Store",
            "name": storeDisplayName,
            "image": storeLogo || undefined,
            "description": vendorData.shopDescription || `Official store of ${storeDisplayName}`
          }
        ]}
      />

      {/* Slim Top Bar: Store identity & Store Information navigation */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to={`/store/v/${encodeURIComponent(vendorId)}/info`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-rose-50 border border-rose-200 text-slate-800 hover:text-rose-600 shadow-2xs transition-all active:scale-95 shrink-0"
            title="Click to view full vendor profile & contact info"
          >
            {storeLogo ? (
              <img src={storeLogo} alt={storeDisplayName} className="w-4 h-4 rounded-full object-cover border border-rose-300" />
            ) : (
              <Icons.store className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span className="truncate max-w-[130px] sm:max-w-none">{storeDisplayName}</span>
            <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full font-extrabold border border-rose-200/60 flex items-center gap-0.5">
              <Icons.info className="w-2.5 h-2.5" />
              <span>Info</span>
            </span>
          </Link>

          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 shadow-2xs transition-all active:scale-95 shrink-0"
            >
              <Icons.chevronLeft className="w-3.5 h-3.5" />
              <span>All Collections</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            to={`/store/v/${encodeURIComponent(vendorId)}/info`}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-rose-50 border border-rose-200 text-slate-700 shadow-2xs transition-all"
          >
            <Icons.info className="w-3.5 h-3.5 text-rose-500" />
            <span>Store Info</span>
          </Link>

          {vendorData.whatsappNumber && (
            <a 
              href={`https://wa.me/${vendorData.whatsappNumber}?text=${encodeURIComponent(`Hello ${storeDisplayName}, I want to order from your store.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
            >
              <Icons.whatsapp className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">WhatsApp</span>
            </a>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            className="border-rose-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 h-8 px-2.5 rounded-full text-xs font-bold shadow-2xs flex items-center gap-1"
          >
            <Icons.share className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </Button>
        </div>
      </div>

      {/* 1. TOP BANNER: Center Banner Slider + Left & Right Scrolling Columns (Strictly matching Banner Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-start">
        {/* Left Column (Desktop Only - Strictly locked to Banner Height) */}
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

        {/* Center Banner Slider */}
        <div className="col-span-1 lg:col-span-6 min-h-0">
          <div 
            ref={bannerRef}
            className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl sm:rounded-3xl shadow-md group border border-rose-100 bg-slate-900"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {sliderItems.length > 0 ? (
              <div 
                className="flex transition-transform duration-500 ease-in-out h-full" 
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {sliderItems.map((item, index) => (
                  <div key={index} className="w-full h-full flex-shrink-0 relative">
                    {item.type === 'banner' ? (
                      <MediaPreview 
                        src={item.data as string} 
                        className="w-full h-full object-cover" 
                        autoPlay={true} 
                        loop={true} 
                        muted={true} 
                        controls={false} 
                      />
                    ) : (
                      <CouponBannerCard coupon={item.data as Coupon} />
                    )}
                  </div>
                ))}
              </div>
            ) : selectedCategory !== 'all' && activeCategoryObj ? (
              /* Category Banner when no dedicated banner uploaded */
              <div className="w-full h-full bg-gradient-to-br from-rose-700 via-rose-600 to-amber-600 text-white flex items-center justify-between p-4 sm:p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)] pointer-events-none" />
                <div className="relative z-10 max-w-[70%]">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-100 border border-white/20">
                    <Icons.sparkles className="w-3 h-3 text-amber-200" />
                    <span>{storeDisplayName}</span>
                  </span>
                  <h1 className="text-xl sm:text-3xl font-serif font-black text-white mt-1.5 tracking-tight drop-shadow-sm">
                    {activeCategoryObj.name}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-rose-100 font-medium mt-1">
                    {filteredProducts.length} items available in this category
                  </p>
                </div>
                <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg shrink-0 overflow-hidden">
                  {activeCategoryObj.imageUrl ? (
                    <img src={activeCategoryObj.imageUrl} alt={activeCategoryObj.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.category className="w-8 h-8 text-amber-200" />
                  )}
                </div>
              </div>
            ) : (
              /* Fallback Branded Store Banner if vendor hasn't uploaded banner yet */
              <div className="w-full h-full bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
                  <Icons.store className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-serif drop-shadow-md">
                  {storeDisplayName}
                </h2>
                <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-md">
                  Welcome to our official online showcase. Explore quality selections and special offers.
                </p>
              </div>
            )}

            {/* If category banner active and banners exist, display bottom category pill */}
            {selectedCategory !== 'all' && activeCategoryObj && sliderItems.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 sm:p-4 flex items-end justify-between pointer-events-none">
                <div className="flex items-center gap-2">
                  {activeCategoryObj.imageUrl && (
                    <img src={activeCategoryObj.imageUrl} alt={activeCategoryObj.name} className="w-7 h-7 rounded-full border border-white/80 object-cover shadow-sm" />
                  )}
                  <div>
                    <span className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-300 font-bold drop-shadow-sm block">
                      Category Collection
                    </span>
                    <h2 className="text-sm sm:text-lg font-black text-white tracking-tight drop-shadow-md">
                      {activeCategoryObj.name}
                    </h2>
                  </div>
                </div>
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border border-white/30">
                  {filteredProducts.length} Items
                </span>
              </div>
            )}

            {sliderItems.length > 1 && (
              <>
                <button 
                  onClick={prevSlide} 
                  className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/40 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <Icons.chevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={nextSlideManual} 
                  className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/40 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <Icons.chevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {sliderItems.map((_, index) => (
                    <button 
                      key={index} 
                      onClick={() => goToSlide(index)} 
                      className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/75'}`} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column (Desktop Only - Strictly locked to Banner Height) */}
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

      {/* 2. CATEGORIES LINE: Horizontal row of vendor categories directly below the Banner */}
      {vendorCategories.length > 0 && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-rose-100 p-2 sm:p-2.5 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-xs'
                  : 'bg-rose-50/60 text-slate-700 border border-rose-100/80 hover:bg-rose-100/60'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>
                <Icons.sparkles className="w-3 h-3" />
              </div>
              <span>All Collections</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${selectedCategory === 'all' ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {vendorProducts.length}
              </span>
            </button>

            {vendorCategories.map(cat => {
              const catCount = vendorProducts.filter(p => p.category === cat.name || p.subCategory === cat.name || p.category === cat.id).length;
              const isSelected = selectedCategory === cat.name || selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-xs'
                      : 'bg-rose-50/60 text-slate-700 border border-rose-100/80 hover:bg-rose-100/60'
                  }`}
                >
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/60" />
                  ) : (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>
                      <Icons.category className="w-3 h-3" />
                    </div>
                  )}
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {catCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. PRODUCTS: Horizontal scroll rows of 5 products with coupons (Matching Home.tsx) */}

      {/* Featured Collections / Product Horizontal Rows & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold font-serif text-slate-900 border-l-4 border-rose-600 pl-3">
            {selectedCategory === 'all' ? 'Trending & Featured Collections' : `${selectedCategory} Collection`}
          </h2>

          <div className="relative w-full sm:w-64">
            <Icons.search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="Search products in this store..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 rounded-xl border-rose-100 focus:border-rose-500"
            />
          </div>
        </div>

        {productRows.length > 0 ? (
          <div className="space-y-4">
            {productRows.map((row, rowIndex) => (
              <div 
                key={`row-${rowIndex}`} 
                className="flex overflow-x-auto gap-3 pb-3 -mx-2 px-2 sm:-mx-4 sm:px-4 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {row.map((item, itemIndex) => {
                  const key = 'code' in item ? `row-${rowIndex}-coupon-${item.id}-${itemIndex}` : `row-${rowIndex}-product-${item.id}`;
                  const wrapperClasses = "w-2/5 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0";

                  return (
                    <div key={key} className={wrapperClasses}>
                      {'code' in item ? (
                        <CouponGridCard coupon={item as unknown as Coupon} />
                      ) : (
                        <ProductCard product={item as Product} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center shadow-xs border border-dashed border-rose-200">
            <Icons.search className="w-12 h-12 mx-auto text-rose-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No products found</h3>
            <p className="text-xs text-slate-500 mt-1">Try searching with different keywords or choosing another category.</p>
            {(selectedCategory !== 'all' || searchQuery) && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                className="mt-4 text-xs rounded-xl"
              >
                Reset Filter
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorStore;
