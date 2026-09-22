import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Product, BannerProductItem } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { MediaPreview } from './MediaPreview';
import { Icons } from '../icons/Icons';

interface BannerProductSlideProps {
    product: Product;
    bannerConfig: BannerProductItem;
}

export const BannerProductSlide: React.FC<BannerProductSlideProps> = ({
    product,
    bannerConfig,
}) => {
    const [matchedColor, setMatchedColor] = useState<string | null>(null);
    const imageUrl = product.images?.[0];

    // Automatically extract dominant matching color from product image if custom color isn't explicitly set
    useEffect(() => {
        if (bannerConfig.backgroundColor && bannerConfig.backgroundColor !== 'auto') {
            return;
        }
        if (!imageUrl) return;

        let isMounted = true;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        img.onload = () => {
            if (!isMounted) return;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 16;
                canvas.height = 16;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, 16, 16);
                const data = ctx.getImageData(0, 0, 16, 16).data;
                let r = 0, g = 0, b = 0, count = 0;

                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    if (alpha > 120) {
                        const brightness = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
                        // Avoid extreme whites or pitch blacks to isolate actual garment/item tones
                        if (brightness > 25 && brightness < 235) {
                            r += data[i];
                            g += data[i + 1];
                            b += data[i + 2];
                            count++;
                        }
                    }
                }

                if (count > 0) {
                    const avgR = Math.round(r / count);
                    const avgG = Math.round(g / count);
                    const avgB = Math.round(b / count);
                    setMatchedColor(`rgb(${avgR}, ${avgG}, ${avgB})`);
                }
            } catch {
                // If CORS blocks canvas pixel read, ambient blurred photo still provides accurate match
            }
        };

        return () => {
            isMounted = false;
        };
    }, [imageUrl, bannerConfig.backgroundColor]);

    const discountPercent = (Number(product.oldPrice || 0) > Number(product.price))
        ? Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)
        : 0;

    const displayDiscount = bannerConfig.customDiscountBadge || (discountPercent > 0 ? `${discountPercent}% OFF` : null);

    // Determine background gradient styling
    const customBg = bannerConfig.backgroundColor && bannerConfig.backgroundColor !== 'auto'
        ? bannerConfig.backgroundColor
        : null;

    const backgroundOverlayStyle = useMemo(() => {
        if (customBg) {
            return {
                background: `linear-gradient(135deg, ${customBg}fa 0%, ${customBg}d0 45%, #050811 100%)`
            };
        }
        if (matchedColor) {
            return {
                background: `radial-gradient(ellipse at 70% 40%, ${matchedColor}bb 0%, rgba(15, 23, 42, 0.94) 65%, #050811 100%)`
            };
        }
        return {
            background: 'linear-gradient(to right, rgba(2, 6, 23, 0.96), rgba(15, 23, 42, 0.90), rgba(76, 5, 25, 0.85))'
        };
    }, [customBg, matchedColor]);

    return (
        <Link 
            to={`/product/${product.id}`}
            className="block relative w-full h-full group select-none overflow-hidden"
            title={`View ${product.name}`}
        >
            {/* Ambient Blurred Background of Product Image for Optical Color Matching */}
            {imageUrl && (
                <img 
                    src={imageUrl} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover blur-2xl scale-135 opacity-45 select-none pointer-events-none transition-all duration-700" 
                    referrerPolicy="no-referrer"
                />
            )}
            
            {/* Dynamic Background Overlay - Matches Photo or Admin-Selected Custom Color */}
            <div 
                className="absolute inset-0 pointer-events-none transition-colors duration-500" 
                style={backgroundOverlayStyle}
            />

            {/* Slide Content Layout */}
            <div className="relative z-10 w-full h-full p-2.5 sm:p-5 md:p-6 flex items-center justify-between gap-3 sm:gap-6">
                {/* Left: Product Image Box */}
                <div className="relative h-full aspect-square max-h-[92%] rounded-xl sm:rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 shadow-xl shrink-0 flex items-center justify-center p-1 sm:p-2 group-hover:scale-[1.02] transition-transform duration-300">
                    <MediaPreview 
                        src={imageUrl} 
                        className="w-full h-full object-contain rounded-lg sm:rounded-xl" 
                        controls={false} 
                        autoPlay={true} 
                        loop={true} 
                        muted={true} 
                    />
                    
                    {/* Discount Badge */}
                    {displayDiscount && (
                        <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-black text-[9px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg shadow-md tracking-tight uppercase">
                            {displayDiscount}
                        </span>
                    )}
                </div>

                {/* Right: Product Details & View Product CTA */}
                <div className="flex-1 min-w-0 flex flex-col justify-center h-full text-white pr-2 sm:pr-4">
                    {/* Featured Deal Tag */}
                    <div className="inline-flex items-center gap-1 sm:gap-1.5 text-amber-300 font-extrabold text-[9px] sm:text-xs uppercase tracking-wider mb-0.5 sm:mb-1">
                        <Icons.sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Featured Special Deal</span>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-xs sm:text-base md:text-xl lg:text-2xl font-black text-white line-clamp-2 leading-tight drop-shadow-sm group-hover:text-rose-200 transition-colors">
                        {product.name}
                    </h3>

                    {/* Category */}
                    <p className="text-[9px] sm:text-xs text-slate-300 font-medium truncate mt-0.5 sm:mt-1">
                        {product.category}
                    </p>

                    {/* Price & Old Price */}
                    <div className="flex items-baseline gap-1.5 sm:gap-2.5 mt-1 sm:mt-2">
                        <span className="text-xs sm:text-lg md:text-xl font-black text-rose-400 drop-shadow-xs">
                            {formatCurrency(product.price)}
                        </span>
                        {Number(product.oldPrice || 0) > Number(product.price) ? (
                            <span className="text-[9px] sm:text-xs text-slate-400 line-through">
                                {formatCurrency(product.oldPrice!)}
                            </span>
                        ) : null}
                    </div>

                    {/* View Product CTA Button */}
                    <div className="mt-1.5 sm:mt-3">
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-rose-600 to-rose-700 group-hover:from-rose-500 group-hover:to-rose-600 text-white font-extrabold text-[9px] sm:text-xs px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-md transition-all active:scale-95">
                            <span>View Product</span>
                            <Icons.chevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};
