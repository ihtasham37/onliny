import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { formatCurrency } from '../utils/helpers';
import { MediaPreview } from './ui/MediaPreview';
import { useStore } from '../hooks/useStore';
import { Icons } from './icons/Icons';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { coupons, wishlist, toggleWishlist, addToCart } = useStore();
  const navigate = useNavigate();
  const [justAdded, setJustAdded] = useState(false);
  
  if (!product) return null; // Safety guard

  const isInWishlist = useMemo(() => wishlist.includes(product.id), [wishlist, product.id]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.sizeCategories && product.sizeCategories.length > 0) {
      navigate(`/product/${product.id}`);
      return;
    }
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  const hasProductDeals = useMemo(() => {
    const now = Date.now();
    return coupons.some(c => c.assignment === 'product' && c.validFrom <= now && c.validTo >= now);
  }, [coupons]);

  const discountPercent = product.oldPrice && product.oldPrice > product.price 
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) 
    : 0;

  return (
    <Link 
      to={`/product/${product.id}`} 
      className="group rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-pink-200/85 hover:border-pink-300 shadow-[0_3px_14px_rgba(244,63,94,0.07)] hover:shadow-[0_8px_24px_rgba(244,63,94,0.15)] flex flex-col transition-all duration-300 active:scale-[0.98] h-full relative"
      aria-label={`View details for ${product.name}`}
    >
      {/* Product Image Area */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-rose-50/50 via-pink-50/20 to-white">
        <MediaPreview
          src={product.images?.[0]}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          controls={false}
          autoPlay={true}
          loop={true}
          muted={true}
        />
        
        {/* Scalloped Pink Discount Badge (Top-Left, matching uploaded photo) */}
        {discountPercent > 0 ? (
          <div className="absolute top-2 left-2 z-10 flex flex-col items-center justify-center filter drop-shadow-xs pointer-events-none">
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 flex flex-col items-center justify-center">
              {/* 12-Lobed scalloped flower background */}
              <svg viewBox="0 0 50 50" className="absolute inset-0 w-full h-full fill-[#e60067]">
                <path d="M25,3 C27.5,3 29.5,5.5 32,6.5 C34.5,7.5 37.5,7.5 39.5,9.5 C41.5,11.5 41.5,14.5 42.5,17 C43.5,19.5 46,21.5 46,24 C46,26.5 43.5,28.5 42.5,31 C41.5,33.5 41.5,36.5 39.5,38.5 C37.5,40.5 34.5,40.5 32,41.5 C29.5,42.5 27.5,45 25,45 C22.5,45 20.5,42.5 18,41.5 C15.5,40.5 12.5,40.5 10.5,38.5 C8.5,36.5 8.5,33.5 7.5,31 C6.5,28.5 4,26.5 4,24 C4,21.5 6.5,19.5 7.5,17 C8.5,14.5 8.5,11.5 10.5,9.5 C12.5,7.5 15.5,7.5 18,6.5 C20.5,5.5 22.5,3 25,3 Z" />
              </svg>
              <div className="relative z-10 flex flex-col items-center justify-center text-white leading-none pt-0.5">
                <span className="text-[10px] sm:text-[11px] font-black tracking-tight">-{discountPercent}%</span>
                <span className="text-[7px] sm:text-[8px] font-extrabold uppercase tracking-widest mt-0.5 opacity-95">OFF</span>
              </div>
            </div>
          </div>
        ) : hasProductDeals ? (
          <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-amber-500 to-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
            ✨ DEAL
          </div>
        ) : null}

        {/* Circular Floating White Heart Wishlist Button (Top-Right, matching photo) */}
        <button 
          type="button"
          onClick={handleToggleWishlist}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white hover:bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-md shadow-slate-900/10 hover:scale-110 active:scale-95 transition-all z-10 cursor-pointer"
        >
          <Icons.heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${isInWishlist ? 'fill-[#e60067] text-[#e60067]' : 'fill-rose-500/20 text-rose-500'}`} />
        </button>

        {/* Free Delivery Badge */}
        {product.freeDelivery && (
          <div className="absolute bottom-4 left-2 z-10">
            <div className="bg-white/95 backdrop-blur-xs text-[#e60067] text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-xs border border-pink-100 flex items-center gap-1">
              <Icons.package className="w-2.5 h-2.5 text-[#e60067]" />
              <span>Free Delivery</span>
            </div>
          </div>
        )}
      </div>

      {/* Curved White Transition Divider with subtle pink accent swoosh */}
      <div className="relative -mt-3.5 z-10">
        <svg viewBox="0 0 300 24" className="w-full h-4 sm:h-5 block" preserveAspectRatio="none">
          {/* Subtle pink accent curve peeking underneath on the right */}
          <path d="M0,18 Q120,4 210,12 T300,4 L300,24 L0,24 Z" fill="#fbcfe8" opacity="0.65" />
          {/* Main smooth white curve matching photo */}
          <path d="M0,12 Q140,2 220,12 T300,6 L300,24 L0,24 Z" fill="#ffffff" />
        </svg>
      </div>
      
      {/* Card Content Body (Matches uploaded photo layout) */}
      <div className="bg-white px-2.5 sm:px-3 pb-2.5 pt-0 flex-grow flex flex-col justify-between">
        <div>
          {/* Product Title with Pink Vertical Pill Indicator on Left */}
          <div className="flex items-start gap-1.5">
            <span className="w-1 sm:w-1.2 h-5 sm:h-6 bg-[#e60067] rounded-full shrink-0 mt-0.5" />
            <h3 className="text-xs sm:text-[13px] font-extrabold text-slate-800 group-hover:text-[#e60067] transition-colors line-clamp-2 leading-tight">
              {product.name}
            </h3>
          </div>

          {/* Soft Pink Category Pill Badge */}
          <div className="mt-1 pl-2.5 sm:pl-2.5">
            <span className="inline-block bg-pink-100/90 text-[#e60067] text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md leading-none">
              {product.category}
            </span>
          </div>
        </div>
        
        {/* Price & Floating Cart Button Row */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-pink-50 pl-0.5">
          {/* Prices: Bold Pink Current Price + Crossed Out Old Price */}
          <div className="flex items-baseline flex-wrap gap-1">
            <span className="text-sm sm:text-base font-black text-[#e60067] tracking-tight">
              {formatCurrency(product.price)}
            </span>
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="text-[10px] sm:text-xs text-slate-400 line-through font-medium">
                {formatCurrency(product.oldPrice)}
              </span>
            )}
          </div>

          {/* Floating Round Cart Button with festive sparkle marks */}
          <div className="relative shrink-0 ml-1.5">
            {/* Festive pink sparkle dashes above button */}
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-pink-400 absolute -top-2 right-1.5 pointer-events-none opacity-80" fill="none">
              <path d="M12 2v3M5.5 5.5l2 2M18.5 5.5l-2 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>

            <button
              type="button"
              onClick={handleAddToCart}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 cursor-pointer ${
                justAdded 
                  ? 'bg-emerald-600 shadow-emerald-500/30 scale-105' 
                  : 'bg-[#e60067] hover:bg-[#c70058] shadow-pink-500/35 hover:shadow-pink-500/50 hover:scale-105 active:scale-95'
              }`}
              title={justAdded ? "Added!" : "Add to Cart"}
            >
              {justAdded ? (
                <Icons.check className="w-4 h-4 text-white stroke-[3]" />
              ) : (
                <Icons.shoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};
