import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Category } from '../../types';
import { Icons } from '../icons/Icons';

interface HorizontalCategorySliderProps {
  categories: Category[];
  title?: string;
  subtitle?: string;
  viewAllUrl?: string;
  getProductCount?: (cat: Category) => number;
}

export const HorizontalCategorySlider: React.FC<HorizontalCategorySliderProps> = ({
  categories,
  title = "Shop by category",
  subtitle,
  viewAllUrl = "/categories",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // 2 rows of categories, 2 items per row in 1 view = 4 items per view
  const totalPages = Math.ceil(categories.length / 4);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    if (clientWidth > 0) {
      const page = Math.round(scrollLeft / clientWidth);
      setCurrentSlideIndex(Math.min(totalPages - 1, Math.max(0, page)));
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

  const slideHorizontal = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === 'right' ? clientWidth : -clientWidth;
    scrollRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!categories || categories.length === 0) return null;

  return (
    <section className="relative w-full py-2">
      {/* Stylish Header without unwanted badges or arrow buttons as requested */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gradient-to-b from-rose-600 via-pink-600 to-amber-500 rounded-sm shrink-0" />
          <h2 className="text-lg sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>

        {viewAllUrl && (
          <Link
            to={viewAllUrl}
            className="text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 group px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
          >
            <span>View All</span>
            <Icons.chevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* 2 Horizontal Lines (2 Rows) of Categories sliding horizontally */}
      {/* 2 items per line in 1 view (auto-cols = 50%), choras (rectangular rounded-md) corners, strictly NO product counting */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="grid grid-rows-2 grid-flow-col auto-cols-[calc(50%-5px)] sm:auto-cols-[calc(50%-7px)] md:auto-cols-[calc(33.33%-8px)] gap-2.5 sm:gap-3.5 overflow-x-auto snap-x snap-mandatory py-1 px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollBehavior: 'smooth' }}
        >
          {categories.map((cat, idx) => {
            const bgImage = cat.imageUrl || (cat.bannerImageUrls && cat.bannerImageUrls[0]) || '';
            const targetUrl = `/category/${encodeURIComponent(cat.id)}`;

            return (
              <Link
                key={cat.id || idx}
                to={targetUrl}
                className="group relative w-full aspect-[16/9] rounded-md sm:rounded-lg overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 block border border-slate-200/90 bg-slate-900 snap-start active:scale-[0.99]"
              >
                {/* Background Image filling full 16:9 card */}
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
                    <Icons.category className="w-8 h-8 sm:w-10 sm:h-10 text-white/30" />
                  </div>
                )}

                {/* Dark gradient scrim overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent group-hover:from-black/90 group-hover:via-black/35 transition-all duration-300" />

                {/* Text overlay placed at bottom-left - STRICTLY NO PRODUCT COUNT */}
                <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5 flex flex-col justify-end text-white pointer-events-none">
                  <h3 className="font-serif font-bold text-xs sm:text-sm md:text-base text-white tracking-wide drop-shadow-md group-hover:text-rose-100 transition-colors line-clamp-1">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Horizontal page slide indicators (reflecting 4 items per page across 2 rows) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {Array.from({ length: totalPages }).map((_, pageIdx) => (
              <button
                key={pageIdx}
                onClick={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                      left: pageIdx * scrollRef.current.clientWidth,
                      behavior: 'smooth',
                    });
                  }
                }}
                aria-label={`Go to category slide ${pageIdx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  pageIdx === currentSlideIndex
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
