
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { ProductCard } from '../components/ProductCard';
import { FullPageSpinner } from '../components/ui/Spinner';
import { MediaPreview } from '../components/ui/MediaPreview';
import { Icons } from '../components/icons/Icons';
import { Button } from '../components/ui/Button';
import { Coupon, Product, BannerProductItem } from '../types';
import { PopupBanners } from '../components/ui/PopupBanners';
import { SEO } from '../components/SEO';
import { formatCurrency } from '../utils/helpers';
import { BannerProductSlide } from '../components/ui/BannerProductSlide';
import { VerticalScrollColumn, useBannerHeight } from '../components/ui/VerticalProductSlider';

const CouponBannerCard: React.FC<{coupon: Coupon}> = ({ coupon }) => (
    <div className="w-full h-full flex-shrink-0 bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white/20 p-2 rounded-full mb-1 backdrop-blur-sm">
            <Icons.ticket className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight drop-shadow-md">{coupon.code}</h2>
        <p className="mt-0.5 text-xs font-medium opacity-90">{coupon.description}</p>
        <div className="mt-2 inline-block bg-white text-fuchsia-800 font-bold px-4 py-1 rounded-full shadow-lg text-[10px] uppercase tracking-wide">
            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `Save ${coupon.discountValue}`}
            {coupon.minBill > 0 && ` on orders over ${coupon.minBill}`}
        </div>
    </div>
);

// New component for coupons shown in the product grid
const CouponGridCard: React.FC<{coupon: Coupon}> = ({ coupon }) => (
    <div className="group rounded-lg overflow-hidden shadow-md hover:shadow-xl flex flex-col bg-gradient-to-br from-pink-500 to-orange-400 text-white transition-all duration-300 h-full items-center justify-center p-4 text-center relative border-2 border-white/20">
         <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            Coupon
         </div>
         <Icons.ticket className="w-10 h-10 mb-2 opacity-90" />
         <h3 className="text-2xl font-black tracking-wider mb-1 border-2 border-dashed border-white/50 px-3 py-1 rounded-md bg-white/10">{coupon.code}</h3>
         <p className="text-sm font-medium leading-tight opacity-95 line-clamp-2 mb-3">{coupon.description}</p>
         <div className="bg-white text-pink-600 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `FLAT OFF`}
         </div>
    </div>
);

// Helper function to chunk an array into smaller arrays of a specific size.
const chunk = <T,>(arr: T[], size: number): T[][] => {
    const chunkedArr: T[][] = [];
    if (!arr) return chunkedArr;
    for (let i = 0; i < arr.length; i += size) {
        chunkedArr.push(arr.slice(i, i + size));
    }
    return chunkedArr;
};

// Luxury visual category avatar mapper
const getCategoryAvatar = (catName: string, customImg?: string) => {
  if (customImg) return customImg;
  const lower = (catName || '').toLowerCase();
  if (lower.includes('women') || lower.includes('female') || lower.includes('girl') || lower.includes('lawn') || lower.includes('frock')) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80';
  }
  if (lower.includes('men') || lower.includes('boy') || lower.includes('male') || lower.includes('gent') || lower.includes('kurta')) {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80';
  }
  if (lower.includes('kid') || lower.includes('baby') || lower.includes('child') || lower.includes('infant') || lower.includes('romper')) {
    return 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=300&q=80';
  }
  if (lower.includes('access') || lower.includes('bag') || lower.includes('purse') || lower.includes('wallet') || lower.includes('gift')) {
    return 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&q=80';
  }
  if (lower.includes('shoe') || lower.includes('foot') || lower.includes('sneaker') || lower.includes('boot')) {
    return 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&q=80';
  }
  if (lower.includes('beauty') || lower.includes('cosmetic') || lower.includes('makeup') || lower.includes('perfume')) {
    return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80';
  }
  return 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&q=80';
};

const Home = () => {
  const { products, settings, coupons, isLoading, banners: dbBanners } = useStore();
  const [shuffledProducts, setShuffledProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { bannerRef, bannerHeight } = useBannerHeight();
  
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const intervalRef = useRef<number | null>(null);

  type HomeBannerSlideItem = 
    | { type: 'media'; id: string; url: string; redirectUrl?: string }
    | { type: 'product'; id: string; product: Product; bannerConfig: BannerProductItem }
    | { type: 'coupon'; id: string; coupon: Coupon };

  const bannerSlides = useMemo<HomeBannerSlideItem[]>(() => {
    const slides: HomeBannerSlideItem[] = [];
    const addedUrls = new Set<string>();

    // 1. Media banners: DB banners + settings.bannerUrls
    const activeDbBanners = (dbBanners || []).filter(b => b.isActive && !b.vendorId && !b.isPopup && b.imageUrl);
    activeDbBanners.forEach(b => {
      slides.push({
        type: 'media',
        id: `db-${b.id}`,
        url: b.imageUrl,
        redirectUrl: b.redirectUrl
      });
      addedUrls.add(b.imageUrl);
    });

    const settingsBanners = settings?.bannerUrls || [];
    settingsBanners.forEach((url, idx) => {
      if (url && !addedUrls.has(url)) {
        slides.push({
          type: 'media',
          id: `setting-${idx}`,
          url
        });
        addedUrls.add(url);
      }
    });

    // 2. Featured Products assigned to Home Banner
    const homeBannerProducts = (settings?.bannerProducts || []).filter(
      item => item.placement === 'home' && item.isActive !== false
    );

    homeBannerProducts.forEach(item => {
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

    // 3. Guaranteed High-Fashion Hero Slide if no custom banners exist
    if (slides.length === 0) {
      slides.push({
        type: 'media',
        id: 'default-luxury-hero',
        url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=85',
        redirectUrl: '/categories'
      });
    }

    return slides;
  }, [dbBanners, settings?.bannerUrls, settings?.bannerProducts, products]);

  // Keep currentIndex bounded
  useEffect(() => {
    if (currentIndex >= bannerSlides.length && bannerSlides.length > 0) {
      setCurrentIndex(0);
    }
  }, [bannerSlides.length, currentIndex]);

  // Categories from collection page (settings.categories)
  const categoriesToShow = useMemo(() => {
    const direct = (settings?.categories || []).filter(c => 
      c && c.isVisible && !c.parentId && (!c.vendorId || c.vendorId === 'admin')
    );
    if (direct.length > 0) return direct;
    return [
      { id: 'women', name: 'Women', isVisible: true },
      { id: 'men', name: 'Men', isVisible: true },
      { id: 'kids', name: 'Kids', isVisible: true },
      { id: 'accessories', name: 'Accessories', isVisible: true },
      { id: 'shoes', name: 'Shoes', isVisible: true },
      { id: 'beauty', name: 'Beauty', isVisible: true }
    ];
  }, [settings?.categories]);

  // Personalized Interest & Randomized Product Order on Page Load/Open
  useEffect(() => {
    const visible = products.filter(p => p.isVisible);
    if (visible.length === 0) return;

    // 1. Get saved user interests from localStorage
    let userInterests: Record<string, number> = {};
    try {
      const stored = localStorage.getItem('user_interests');
      if (stored) userInterests = JSON.parse(stored);
    } catch (e) {
      console.error("Interest storage read error", e);
    }

    // 2. Fisher-Yates shuffle for randomized order every single load
    const shuffle = <T,>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const interestedCategories = Object.keys(userInterests).filter(cat => userInterests[cat] > 0);
    
    const interestMatches = visible.filter(p => interestedCategories.includes(p.category));
    const generalProducts = visible.filter(p => !interestedCategories.includes(p.category));

    const shuffledInterest = shuffle(interestMatches);
    const shuffledGeneral = shuffle(generalProducts);

    // Combine interested and general items randomly
    const finalMixed: Product[] = [];
    let i = 0, g = 0;
    while (i < shuffledInterest.length || g < shuffledGeneral.length) {
      if (i < shuffledInterest.length) finalMixed.push(shuffledInterest[i++]);
      if (i < shuffledInterest.length) finalMixed.push(shuffledInterest[i++]);
      if (g < shuffledGeneral.length) finalMixed.push(shuffledGeneral[g++]);
      if (g < shuffledGeneral.length) finalMixed.push(shuffledGeneral[g++]);
    }

    setShuffledProducts(finalMixed.length > 0 ? finalMixed : shuffle(visible));
  }, [products]);

  // Left & Right Side Columns (Desktop auto-sliding columns strictly constrained to banner height)
  const leftSideProducts = useMemo(() => {
    if (shuffledProducts.length === 0) return [];
    if (shuffledProducts.length <= 4) return shuffledProducts;
    return shuffledProducts.slice(0, Math.ceil(shuffledProducts.length / 2));
  }, [shuffledProducts]);

  const rightSideProducts = useMemo(() => {
    if (shuffledProducts.length === 0) return [];
    if (shuffledProducts.length <= 4) return [...shuffledProducts].reverse();
    return shuffledProducts.slice(Math.ceil(shuffledProducts.length / 2));
  }, [shuffledProducts]);

  const displayItems = useMemo(() => {
    return shuffledProducts;
  }, [shuffledProducts]);
  
  // Chunk all displayable items into horizontally scrollable rows of 5.
  const productRows = useMemo(() => {
    return chunk(displayItems, 5);
  }, [displayItems]);

  const nextSlide = useCallback(() => {
    if (bannerSlides.length <= 1) return;
    setCurrentIndex(prev => (prev >= bannerSlides.length - 1 ? 0 : prev + 1));
  }, [bannerSlides.length]);
  
  const startSlider = useCallback(() => {
      if (intervalRef.current) {
          clearInterval(intervalRef.current);
      }
      if (bannerSlides.length > 1) {
          intervalRef.current = window.setInterval(nextSlide, 4500);
      }
  }, [nextSlide, bannerSlides.length]);

  useEffect(() => {
    if (bannerSlides.length > 1) {
        startSlider();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }
  }, [bannerSlides.length, startSlider]);

  const handleManualNav = (action: () => void) => {
      action();
      startSlider();
  }

  const prevSlide = () => {
    if (bannerSlides.length <= 1) return;
    handleManualNav(() => setCurrentIndex(prev => (prev === 0 ? bannerSlides.length - 1 : prev - 1)));
  };
  
  const nextSlideManual = () => {
      handleManualNav(nextSlide);
  }
  
  const goToSlide = (index: number) => {
      handleManualNav(() => setCurrentIndex(index));
  }

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

  if (isLoading && products.length === 0) {
    return <FullPageSpinner />;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <SEO 
        title="Online Shopping Pakistan | Baby Clothing, Boy Clothes, Girlfriend & Boyfriend Gifts | onliny" 
        description={`Shop onliny (onliny.co.uk) - Pakistan's premier online store for baby clothing, boy clothes, romantic girlfriend gifts, boyfriend gifts, couple hampers, and women's fashion with fast Cash on Delivery (COD) across Pakistan & 7-day easy returns.`}
        canonical="https://onliny.co.uk/"
        keywords={[
            'onliny',
            'onliny.co.uk',
            'online shopping Pakistan',
            'baby clothing',
            'baby clothing Pakistan',
            'baby clothes online',
            'baby boy clothes',
            'baby girl clothes',
            'baba suit Pakistan',
            'infant wear',
            'newborn baby gifts',
            'boy clothing',
            'boy clothing Pakistan',
            'boys clothes',
            'boys kurta pajama',
            'boys shirts',
            'boys casual wear',
            'kids fashion Pakistan',
            'gifts',
            'online gifts Pakistan',
            'gifts for girlfriend',
            'girlfriend gifts',
            'romantic gifts for girlfriend',
            'girlfriend birthday gift',
            'anniversary gift for girlfriend',
            'gifts for boyfriend',
            'boyfriend gifts',
            'romantic gifts for boyfriend',
            'boyfriend birthday gift',
            'gifts for him',
            'couple gifts Pakistan',
            'surprise gift hampers',
            'women clothing Pakistan',
            'lawn suits Pakistan',
            'unstitched suits',
            'stitched 3 piece suits',
            'designer replica suits',
            'cash on delivery Pakistan',
            'COD shopping',
            'Pakistani dresses online',
            settings?.appName || 'onliny'
        ]}
        schema={[
            {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": settings?.appName || "onliny",
                "url": "https://onliny.co.uk",
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://onliny.co.uk/#/search?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                }
            },
            {
                "@context": "https://schema.org",
                "@type": "Store",
                "name": settings?.appName || "onliny",
                "url": "https://onliny.co.uk",
                "logo": settings?.logoUrl || "https://onliny.co.uk/pwa-512x512.png",
                "email": "ali10cart@gmail.com",
                "description": "Online shopping store in Pakistan specializing in baby clothing, boy clothing, gifts for girlfriend and boyfriend, couples hampers, and women fashion with Cash on Delivery.",
                "hasOfferCatalog": {
                    "@type": "OfferCatalog",
                    "name": "Featured Store Collections",
                    "itemListElement": [
                        { "@type": "OfferCatalog", "name": "Baby Clothing" },
                        { "@type": "OfferCatalog", "name": "Boy Clothing" },
                        { "@type": "OfferCatalog", "name": "Gifts for Girlfriend" },
                        { "@type": "OfferCatalog", "name": "Gifts for Boyfriend" },
                        { "@type": "OfferCatalog", "name": "Couple Gifts & Hampers" },
                        { "@type": "OfferCatalog", "name": "Women & Girls Fashion" }
                    ]
                }
            },
            {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": settings?.appName || "onliny",
                "url": "https://onliny.co.uk",
                "logo": settings?.logoUrl || "https://onliny.co.uk/pwa-512x512.png",
                "email": "ali10cart@gmail.com"
            }
        ]}
      />

      {/* Desktop Hero Layout: Center Banner + Left/Right Vertical Scrolling Product Lists (Strictly matching Banner Height) */}
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

        {/* Center Banner Slider */}
        <div className="col-span-1 lg:col-span-6 min-h-0">
          {bannerSlides.length > 0 && (
            <div 
              ref={bannerRef}
              className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm group bg-slate-900 border border-slate-100"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex transition-transform duration-500 ease-in-out h-full" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {bannerSlides.map((slide, index) => (
                  <div key={slide.id || index} className="w-full h-full flex-shrink-0 relative">
                    {slide.type === 'media' ? (
                      slide.redirectUrl ? (
                        <Link to={slide.redirectUrl} className="block w-full h-full">
                          <MediaPreview src={slide.url} className="w-full h-full object-cover" autoPlay={true} loop={true} muted={true} controls={false} />
                        </Link>
                      ) : (
                        <MediaPreview src={slide.url} className="w-full h-full object-cover" autoPlay={true} loop={true} muted={true} controls={false} />
                      )
                    ) : slide.type === 'product' ? (
                      <BannerProductSlide 
                        product={slide.product} 
                        bannerConfig={slide.bannerConfig} 
                      />
                    ) : (
                      <CouponBannerCard coupon={slide.coupon} />
                    )}
                  </div>
                ))}
              </div>

              {bannerSlides.length > 1 && (
                <>
                  {/* Left Arrow Button */}
                  <button 
                    onClick={prevSlide} 
                    className="absolute top-1/2 -translate-y-1/2 left-2.5 sm:left-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-all z-20 cursor-pointer shadow-md opacity-90 group-hover:opacity-100 active:scale-95" 
                    aria-label="Previous slide"
                  >
                    <Icons.chevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  {/* Right Arrow Button */}
                  <button 
                    onClick={nextSlideManual} 
                    className="absolute top-1/2 -translate-y-1/2 right-2.5 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-all z-20 cursor-pointer shadow-md opacity-90 group-hover:opacity-100 active:scale-95" 
                    aria-label="Next slide"
                  >
                    <Icons.chevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  {/* Dots with pink active pill */}
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                    {bannerSlides.map((_, index) => (
                      <button 
                        key={index} 
                        onClick={() => goToSlide(index)} 
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          index === currentIndex 
                            ? 'bg-pink-500 w-5 sm:w-6 shadow-xs' 
                            : 'bg-white/60 hover:bg-white w-2'
                        }`} 
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
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

      {/* Categories from Collection Page (Circular layout with shining glow, direct link to category page, no All button) */}
      <div className="pt-0.5 pb-0">
        <div className="flex items-center justify-between mb-2 sm:mb-2.5 px-1">
          <h2 className="text-lg sm:text-xl font-extrabold font-serif text-slate-900 px-1 border-l-4 border-rose-600 pl-3 tracking-tight">
            Explore Categories
          </h2>
          <Link 
            to="/categories" 
            className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-0.5 group"
          >
            <span>View All</span>
            <Icons.chevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Horizontal Scrollable Glowing Circular Categories */}
        <div className="flex items-center gap-3.5 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10 overflow-x-auto pb-2 pt-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {categoriesToShow.map((cat) => {
            const avatarUrl = getCategoryAvatar(cat.name, cat.imageUrl);

            return (
              <Link
                key={cat.id}
                to={`/category/${encodeURIComponent(cat.id)}`}
                className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer text-center outline-none"
              >
                {/* Clean Circular Avatar Container */}
                <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400 shadow-xs border border-pink-100/80 group-hover:scale-105 transition-all duration-300">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-full overflow-hidden bg-slate-100 border border-white">
                    <img
                      src={avatarUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Category Label */}
                <span className="text-xs sm:text-xs md:text-sm lg:text-base font-extrabold text-slate-800 group-hover:text-pink-600 transition-colors tracking-tight text-center max-w-[72px] sm:max-w-[85px] md:max-w-[105px] lg:max-w-[135px] xl:max-w-[155px] truncate">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Products Section with Luxury Heading */}
      <div className="pt-0">
        <h2 className="text-lg sm:text-xl font-extrabold font-serif text-slate-900 mb-2 sm:mb-3 px-1 border-l-4 border-rose-600 pl-3 tracking-tight">
          Trending & Featured Collections
        </h2>
        {productRows.length > 0 ? (
            <div className="space-y-4">
                {productRows.map((row, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="flex overflow-x-auto gap-3 pb-3 -mx-4 px-4 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {row.map((item, itemIndex) => {
                            const key = 'code' in item ? `row-${rowIndex}-coupon-${item.id}-${itemIndex}` : `row-${rowIndex}-product-${item.id}`;
                            // Responsive widths: 2.5 on mobile, 3 on sm, 4 on md, exactly 5 on lg/xl
                            const wrapperClasses = "w-[42%] sm:w-[30%] md:w-[23%] lg:w-[calc(20%-9.6px)] flex-shrink-0";

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
            <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
                <Icons.search className="w-10 h-10 mx-auto mb-2.5 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No products found</h3>
                <p className="text-xs text-slate-500 mt-1">There are no products available in the store yet.</p>
            </div>
        )}
      </div>
      <PopupBanners />
    </div>
  );
};

export default Home;
