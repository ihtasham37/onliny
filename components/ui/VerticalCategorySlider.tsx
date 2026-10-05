import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Category } from '../../types';
import { Icons } from '../icons/Icons';

interface VerticalCategorySliderProps {
  categories: Category[];
  title?: string;
  subtitle?: string;
  viewAllUrl?: string;
  getProductCount?: (cat: Category) => number;
}

export const VerticalCategorySlider: React.FC<VerticalCategorySliderProps> = ({
  categories,
  title = "Shop by category",
  subtitle,
  viewAllUrl = "/categories",
  getProductCount,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(categories.length / 4);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setCanScrollUp(scrollTop > 10);
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);

    const pageHeight = clientHeight;
    if (pageHeight > 0) {
      const page = Math.round(scrollTop / pageHeight);
      setCurrentPage(Math.min(totalPages - 1, Math.max(0, page)));
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [categories.length, totalPages]);

  const slideVertical = (direction: 'up' | 'down') => {
    if (!scrollRef.current) return;
    const { clientHeight } = scrollRef.current;
    const scrollAmount = direction === 'down' ? clientHeight : -clientHeight;
    scrollRef.current.scrollBy({
      top: scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!categories || categories.length === 0) return null;

  return (
    <section className="relative w-full py-2">
      {/* Header matching reference image: Shop by category */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Vertical Slide Controls if more than 4 categories */}
          {categories.length > 4 && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => slideVertical('up')}
                disabled={!canScrollUp}
                aria-label="Slide up categories"
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all ${
                  canScrollUp
                    ? 'bg-white text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer active:scale-95'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                <Icons.chevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => slideVertical('down')}
                disabled={!canScrollDown}
                aria-label="Slide down categories"
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all ${
                  canScrollDown
                    ? 'bg-white text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer active:scale-95'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                <Icons.chevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {viewAllUrl && (
            <Link
              to={viewAllUrl}
              className="text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 group px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <span>View All</span>
              <Icons.chevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>

      {/* 2-Column Vertical Sliding Container: exactly 4 categories visible in 1 view (2x2 grid) */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 overflow-y-auto max-h-[300px] sm:max-h-[360px] md:max-h-[440px] snap-y snap-mandatory py-1 px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollBehavior: 'smooth' }}
        >
          {categories.map((cat, idx) => {
            const bgImage = cat.imageUrl || (cat.bannerImageUrls && cat.bannerImageUrls[0]) || '';
            const count = getProductCount ? getProductCount(cat) : undefined;
            const targetUrl = `/category/${encodeURIComponent(cat.id)}`;

            return (
              <Link
                key={cat.id || idx}
                to={targetUrl}
                className="group relative w-full h-[140px] sm:h-[170px] md:h-[210px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 block border border-slate-200/80 bg-slate-900 snap-start active:scale-[0.98]"
              >
                {/* Background Image filling full card */}
                {bgImage ? (
                  <img
                    src={bgImage}
                    alt={cat.name}
                    loading={idx < 4 ? 'eager' : 'lazy'}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 via-rose-950 to-slate-900 flex items-center justify-center">
                    <Icons.category className="w-10 h-10 text-white/30" />
                  </div>
                )}

                {/* Dark gradient scrim overlay matching reference image */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent group-hover:from-black/90 group-hover:via-black/45 transition-all duration-300" />

                {/* Text overlay placed at bottom-left */}
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-5 flex flex-col justify-end text-white pointer-events-none">
                  <h3 className="font-serif font-bold text-base sm:text-lg md:text-xl text-white tracking-wide drop-shadow-md group-hover:text-rose-100 transition-colors line-clamp-1">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Vertical page slide indicators if multiple 4-item views exist */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {Array.from({ length: totalPages }).map((_, pageIdx) => (
              <button
                key={pageIdx}
                onClick={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                      top: pageIdx * scrollRef.current.clientHeight,
                      behavior: 'smooth',
                    });
                  }
                }}
                aria-label={`Go to category slide ${pageIdx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  pageIdx === currentPage
                    ? 'w-6 bg-rose-600'
                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
