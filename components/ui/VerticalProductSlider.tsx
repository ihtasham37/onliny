import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types';
import { MediaPreview } from './MediaPreview';
import { formatCurrency } from '../../utils/helpers';

// Hook to measure and track the exact height of the central banner
export const useBannerHeight = () => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [bannerHeight, setBannerHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (bannerRef.current) {
        const rect = bannerRef.current.getBoundingClientRect();
        if (rect.height > 0) {
          const newHeight = Math.round(rect.height);
          setBannerHeight(prev => {
            if (prev !== null && Math.abs(prev - newHeight) <= 2) {
              return prev;
            }
            return newHeight;
          });
        }
      }
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    window.addEventListener('resize', updateHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return { bannerRef, bannerHeight };
};

// Compact side product card for vertical desktop sliders
export const SideProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const discountPercent = (Number(product.oldPrice || 0) > Number(product.price))
    ? Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100) 
    : 0;

  return (
    <Link 
      to={`/product/${product.id}`} 
      className="group flex items-center gap-2 p-1.5 bg-white rounded-xl border border-rose-100 shadow-2xs hover:shadow-xs hover:border-rose-300 transition-all duration-200 shrink-0"
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-rose-50 shrink-0 border border-rose-100/50">
        <MediaPreview
          src={product.images?.[0]}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          controls={false}
          autoPlay={true}
          loop={true}
          muted={true}
        />
        {discountPercent > 0 && (
          <span className="absolute top-0.5 left-0.5 bg-rose-600 text-white text-[8px] font-bold px-1 py-0.2 rounded shadow-2xs">
            -{discountPercent}%
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[11px] font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors leading-tight">
          {product.name}
        </h4>
        <p className="text-[9px] text-slate-400 truncate mt-0.5">{product.category}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs font-black text-rose-700">{formatCurrency(product.price)}</span>
          {Number(product.oldPrice || 0) > Number(product.price) ? (
            <span className="text-[9px] text-slate-400 line-through">{formatCurrency(product.oldPrice!)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
};

export interface VerticalScrollColumnProps {
  title: string;
  badge: string;
  products: Product[];
  height?: number | null;
}

// Strictly height-bounded vertical product slider that matches the banner height
export const VerticalScrollColumn: React.FC<VerticalScrollColumnProps> = ({ 
  title, 
  badge, 
  products, 
  height 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || products.length <= 1) return;

    let animationFrameId: number;
    let scrollPos = el.scrollTop || 0;

    // Upward sliding: increasing scrollTop moves items upward
    const scrollStep = () => {
      if (!containerRef.current) return;
      scrollPos += 0.45;
      const maxHalf = containerRef.current.scrollHeight / 2;
      if (maxHalf > 0 && scrollPos >= maxHalf) {
        scrollPos = 0;
      }
      containerRef.current.scrollTop = scrollPos;
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    const onMouseEnter = () => cancelAnimationFrame(animationFrameId);
    const onMouseLeave = () => {
      if (containerRef.current) {
        scrollPos = containerRef.current.scrollTop;
      }
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('touchstart', onMouseEnter, { passive: true });
    el.addEventListener('touchend', onMouseLeave, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (el) {
        el.removeEventListener('mouseenter', onMouseEnter);
        el.removeEventListener('mouseleave', onMouseLeave);
        el.removeEventListener('touchstart', onMouseEnter);
        el.removeEventListener('touchend', onMouseLeave);
      }
    };
  }, [products]);

  if (products.length === 0) return null;

  // Duplicate items for seamless infinite upward scroll loop
  const displayList = [...products, ...products];

  return (
    <div 
      className="flex flex-col w-full bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-rose-100 p-2 shadow-xs overflow-hidden box-border"
      style={{ 
        height: height ? `${height}px` : '100%', 
        maxHeight: height ? `${height}px` : '100%' 
      }}
    >
      {/* Header bar matching banner rounded styling */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-rose-100/70 shrink-0 px-1">
        <span className="text-xs font-extrabold font-serif text-rose-950 tracking-tight flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse inline-block" />
          {title}
        </span>
        <span className="text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 px-2 py-0.5 rounded-full shadow-2xs">
          {badge}
        </span>
      </div>

      {/* Product list with top & bottom edge fade, strictly bound to the banner height */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-white/90 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-white/90 to-transparent z-10" />

        <div
          ref={containerRef}
          className="h-full overflow-y-auto space-y-1.5 pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {displayList.map((product, idx) => (
            <SideProductCard key={`${product.id}-${idx}`} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};
