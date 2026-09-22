import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { formatCurrency } from '../../utils/helpers';
import { MediaPreview } from './MediaPreview';
import { Icons } from '../icons/Icons';

interface BannerProductShowcaseProps {
    placement: 'home' | string;
    title?: string;
}

export const BannerProductShowcase: React.FC<BannerProductShowcaseProps> = ({ 
    placement, 
    title = "Featured in Banner" 
}) => {
    const { settings, products } = useStore();
    const bannerProductItems = settings?.bannerProducts || [];

    // Filter items matching the placement and active status
    const activeItems = bannerProductItems.filter(item => 
        item.placement === placement && item.isActive !== false
    );

    if (activeItems.length === 0) {
        return null;
    }

    // Resolve products with their banner configs
    const resolvedProducts = activeItems
        .map(item => {
            const product = products.find(p => p.id === item.productId && p.isVisible !== false);
            if (!product) return null;
            return {
                item,
                product
            };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (resolvedProducts.length === 0) {
        return null;
    }

    return (
        <div className="w-full mt-3 bg-gradient-to-r from-rose-50/90 via-amber-50/70 to-rose-50/90 rounded-2xl p-3 sm:p-4 border border-rose-100 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <h3 className="text-xs sm:text-sm font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Icons.sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{title}</span>
                    </h3>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold bg-white text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                    {resolvedProducts.length} {resolvedProducts.length === 1 ? 'Special Deal' : 'Special Deals'}
                </span>
            </div>

            {/* Scrollable / Responsive Products Row */}
            <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-rose-200">
                {resolvedProducts.map(({ item, product }) => {
                    const discountPercent = (Number(product.oldPrice || 0) > Number(product.price))
                        ? Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)
                        : 0;

                    const displayDiscount = item.customDiscountBadge || (discountPercent > 0 ? `${discountPercent}% OFF` : null);

                    return (
                        <div 
                            key={item.id}
                            className="w-48 sm:w-56 shrink-0 bg-white rounded-xl p-2.5 border border-rose-100/80 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all flex flex-col justify-between group"
                        >
                            {/* Product Image & Discount Badge */}
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-50 mb-2">
                                <MediaPreview
                                    src={product.images?.[0]}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    controls={false}
                                    autoPlay={true}
                                    loop={true}
                                    muted={true}
                                />
                                {displayDiscount && (
                                    <span className="absolute top-1.5 left-1.5 bg-rose-600 text-white font-extrabold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded shadow-xs tracking-tight">
                                        {displayDiscount}
                                    </span>
                                )}
                            </div>

                            {/* Product Name & Category */}
                            <div className="mb-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
                                    {product.name}
                                </h4>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {product.category}
                                </p>
                                
                                {/* Price & Old Price */}
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-xs sm:text-sm font-black text-rose-700">
                                        {formatCurrency(product.price)}
                                    </span>
                                    {Number(product.oldPrice || 0) > Number(product.price) ? (
                                        <span className="text-[10px] text-slate-400 line-through">
                                            {formatCurrency(product.oldPrice!)}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {/* View Product Action Button */}
                            <Link
                                to={`/product/${product.id}`}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-[11px] sm:text-xs rounded-lg shadow-2xs active:scale-95 transition-all text-center mt-auto"
                            >
                                <span>View Product</span>
                                <Icons.chevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
