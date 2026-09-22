import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icons } from '../icons/Icons';
import { useStore } from '../../hooks/useStore';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useStandaloneCategory } from '../../hooks/useStandaloneCategory';
import { safeLower, formatCurrency } from '../../utils/helpers';
import { MediaPreview } from '../ui/MediaPreview';
import { AnnouncementBanner } from '../ui/AnnouncementBanner';

export const Navbar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const { wishlist, settings, products, allProducts, cart } = useStore();
  const { isInstalled } = usePWAInstall();
  const { isStandalone, standaloneCategory, standaloneType, vendorId, storeName, storeLogoUrl, homeUrl } = useStandaloneCategory();
  const wishlistCount = wishlist?.length || 0;
  const cartCount = (cart || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

  const searchPool = useMemo(() => {
    if (isStandalone && (standaloneType === 'vendor' || vendorId)) {
      const vId = vendorId || standaloneCategory?.vendorId;
      return (allProducts || []).filter(p => p.vendorId === vId && p.isVisible !== false);
    }
    return products;
  }, [isStandalone, standaloneType, vendorId, standaloneCategory, allProducts, products]);

  const targetCategoryIds = useMemo(() => {
    if (!isStandalone || !standaloneCategory) return null;
    const ids = new Set<string>([standaloneCategory.id, standaloneCategory.name]);
    const allCats = settings?.categories || [];
    const queue = [standaloneCategory.id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      allCats.filter(c => c.parentId === cur).forEach(c => {
        ids.add(c.id);
        ids.add(c.name);
        queue.push(c.id);
      });
    }
    return ids;
  }, [isStandalone, standaloneCategory, settings?.categories]);

  // Instant fast local search calculation as user types (0ms lag)
  const instantMatches = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw || searchPool.length === 0) return [];
    const q = safeLower(raw);
    const tokens = q.split(/\s+/).filter(t => t.length > 0);

    return searchPool
      .filter(p => p.isVisible && (!targetCategoryIds || targetCategoryIds.has(p.category)))
      .map(p => {
        let score = 0;
        const name = safeLower(p.name);
        const cat = safeLower(p.category);
        const customId = safeLower(p.customId || '');
        const id = safeLower(p.id);

        if (customId === q || id === q) score += 1000;
        if (name.includes(q)) score += 500;
        if (cat.includes(q)) score += 300;
        
        tokens.forEach(t => {
          if (name.includes(t)) score += 100;
          if (cat.includes(t)) score += 80;
        });

        return { product: p, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.product);
  }, [searchQuery, products, targetCategoryIds]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsDropdownOpen(false);
      const searchUrl = isStandalone && standaloneCategory 
        ? `/search?q=${encodeURIComponent(searchQuery.trim())}&category=${encodeURIComponent(standaloneCategory.id)}`
        : `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      navigate(searchUrl);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    navigate(`/product/${productId}`);
  };

  const handleCategoryQuickSearch = (cat: string) => {
    setIsDropdownOpen(false);
    navigate(`/search?q=${encodeURIComponent(cat)}`);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isVendorStore = isStandalone && standaloneType === 'vendor' && Boolean(vendorId);
  const isVendorInfoPage = location.pathname.endsWith('/info');
  const targetLogoUrl = isVendorStore
    ? (isVendorInfoPage ? homeUrl : `/store/v/${encodeURIComponent(vendorId!)}/info`)
    : (isStandalone ? homeUrl : "/");

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs transition-all flex flex-col">
      <AnnouncementBanner />
      
      {/* Row 1: Brand & Top Action Icons */}
      <div className="container mx-auto px-3 sm:px-4 flex justify-between items-center h-13 sm:h-14">
        {/* Brand Logo & Name */}
        <Link 
          to={targetLogoUrl} 
          title={isVendorStore ? (isVendorInfoPage ? "Back to Store Products" : "Click to view Store & Vendor Info") : storeName}
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 group py-1"
        >
          {/* Logo Frame / Brand Icon */}
          <div className="relative shrink-0 flex items-center justify-center">
            {storeLogoUrl ? (
              <img 
                src={storeLogoUrl} 
                alt={storeName} 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shadow-2xs border border-rose-100 group-hover:scale-105 transition-transform" 
              />
            ) : (
              <Icons.brandBag className="w-8 h-8 sm:w-9 sm:h-9 text-slate-900 group-hover:scale-105 transition-transform" />
            )}
          </div>

          {/* App Name & Tagline */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-serif tracking-tight text-slate-950 group-hover:text-pink-600 transition-colors truncate max-w-[160px] sm:max-w-none">
                {storeName}
              </span>
              {isVendorStore && (
                <span className="bg-rose-100 text-rose-700 text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5 shrink-0 border border-rose-200">
                  <Icons.info className="w-2.5 h-2.5" />
                  <span>Info</span>
                </span>
              )}
            </div>
            <span className="text-[7.5px] sm:text-[8.5px] font-bold tracking-[0.22em] text-slate-400 uppercase leading-none mt-0.5">
              SHOP • STYLE • YOU
            </span>
          </div>
        </Link>

        {/* Top Right Action Icons: ONLY Wishlist and Cart (No Profile, No Notification) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {!isInstalled && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install-banner'))}
              className="hidden sm:flex items-center justify-center gap-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full shadow-2xs transition-all active:scale-95"
              title="Install App on Device"
            >
              <Icons.download className="w-3.5 h-3.5" />
              <span>App</span>
            </button>
          )}

          {/* Wishlist Icon */}
          <Link
            to="/wishlist"
            className="relative p-2 text-slate-800 hover:text-pink-600 transition-colors rounded-full hover:bg-slate-100/60"
            aria-label="Wishlist"
          >
            <Icons.heart className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            {wishlistCount > 0 && (
              <span className="absolute 0 top-0.5 right-0.5 bg-pink-500 text-white text-[9px] font-black min-w-[17px] h-[17px] rounded-full flex items-center justify-center ring-2 ring-white px-1 shadow-xs animate-scale-in">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Icon */}
          <Link
            to="/cart"
            className="relative p-2 text-slate-800 hover:text-pink-600 transition-colors rounded-full hover:bg-slate-100/60"
            aria-label="Shopping Cart"
          >
            <Icons.shoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            {cartCount > 0 && (
              <span className="absolute 0 top-0.5 right-0.5 bg-pink-500 text-white text-[9px] font-black min-w-[17px] h-[17px] rounded-full flex items-center justify-center ring-2 ring-white px-1 shadow-xs animate-scale-in">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Row 2: Full-Width Search Input with Dark Filter Button */}
      <div className="container mx-auto px-3 sm:px-4 pb-2.5 pt-0.5 relative" ref={searchContainerRef}>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={isStandalone ? (standaloneType === 'vendor' ? `Search ${storeName}...` : (standaloneCategory ? `Search in ${standaloneCategory.name}...` : `Search ${storeName}...`)) : "Search Women, Men, Kids, Accessories..."}
            className="w-full h-10 sm:h-11 pl-10 sm:pl-11 pr-8 sm:pr-9 rounded-full bg-slate-50/90 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 focus:border-slate-400 focus:outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-all shadow-inner"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Icons.search className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
          </div>

          {/* Quick clear button if search has text */}
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsDropdownOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
              title="Clear search"
            >
              <Icons.x className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </form>

        {/* Instant Search Results Dropdown */}
        {isDropdownOpen && searchQuery.trim().length > 0 && (
          <div className="absolute inset-x-3 sm:inset-x-4 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-slate-100 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-2.5 bg-slate-50 flex items-center justify-between text-xs shrink-0">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>⚡ Instant Suggestions</span>
                <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.2 rounded-full font-bold">
                  {instantMatches.length}
                </span>
              </span>
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="text-[11px] font-bold text-pink-600 hover:text-pink-800 underline cursor-pointer"
              >
                Deep AI Search &rarr;
              </button>
            </div>

            {/* Matches List */}
            {instantMatches.length > 0 ? (
              <div className="max-h-64 sm:max-h-72 overflow-y-auto p-1.5 space-y-1 overscroll-contain">
                {instantMatches.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-pink-50/60 active:bg-pink-100/60 cursor-pointer transition-colors group"
                  >
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <MediaPreview
                        src={product.images?.[0]}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        controls={false}
                        autoPlay={false}
                        muted={true}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-pink-600">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium truncate max-w-[140px]">
                          {product.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-pink-600">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 space-y-1">
                <p className="font-medium">No direct keyword match found in catalog.</p>
                <p className="text-[11px] text-pink-600 font-semibold">
                  Press Search to use Gemini AI semantic recommendations!
                </p>
              </div>
            )}

            {/* Footer Quick Categories */}
            <div className="p-2 bg-slate-50 flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[11px] shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Popular:</span>
              {['Women', 'Men', 'Kids', 'Accessories', 'Shoes', 'Beauty'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleCategoryQuickSearch(tag)}
                  className="shrink-0 bg-white hover:bg-pink-50 text-slate-700 hover:text-pink-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium transition-colors text-[10px]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
