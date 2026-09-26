import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useStandaloneCategory } from '../hooks/useStandaloneCategory';
import { Icons } from '../components/icons/Icons';
import { Spinner } from '../components/ui/Spinner';
import { SEO } from '../components/SEO';
import { shareContent } from '../utils/shareHelper';
import { matchCategory } from '../utils/helpers';

interface CategoriesPageProps {
    isStandalone?: boolean;
}

const CategoriesPage: React.FC<CategoriesPageProps> = ({ isStandalone: isStandaloneProp = false }) => {
    const { settings, products, allProducts, isLoading } = useStore();
    const { isStandalone: isStandaloneHook, standaloneCategory, standaloneType, vendorId } = useStandaloneCategory();
    const isStandaloneMode = Boolean(isStandaloneProp || isStandaloneHook);
    const [shareToast, setShareToast] = useState<string | null>(null);

    // In vendor standalone mode: show ONLY that vendor's direct categories.
    // In category standalone mode: show only sub-categories belonging to that standalone category.
    // In global main store: show ONLY platform/admin categories (STRICTLY EXCLUDE VENDOR CATEGORIES).
    const categoriesToShow = useMemo(() => {
        // 1. Vendor standalone storefront
        if (isStandaloneMode && (standaloneType === 'vendor' || vendorId)) {
            const vId = vendorId || standaloneCategory?.vendorId;
            return (settings?.categories || []).filter(c => c && c.isVisible && c.vendorId === vId);
        }

        // 2. Category standalone storefront
        if (isStandaloneMode && standaloneCategory) {
            const subCats = settings?.categories?.filter(c => 
                c && c.isVisible && (c.parentId === standaloneCategory.id || c.parentId === standaloneCategory.name)
            ) || [];
            return subCats;
        }

        // 3. Global main app store: ONLY show platform/admin categories
        return (settings?.categories || []).filter(c => 
            c && c.isVisible && !c.parentId && (!c.vendorId || c.vendorId === 'admin')
        );
    }, [isStandaloneMode, standaloneType, vendorId, standaloneCategory, settings?.categories]);

    const getCategoryProductCount = (category: any) => {
        const allCats = settings?.categories || [];
        const targetCategories: { id: string; name: string }[] = [category];
        const queue = [category.id];
        while (queue.length > 0) {
            const cur = queue.shift()!;
            allCats.filter(c => c.parentId === cur).forEach(c => {
                targetCategories.push(c);
                queue.push(c.id);
            });
        }
        const sourceProducts = category.vendorId 
            ? (allProducts || []).filter(p => p.vendorId === category.vendorId)
            : products;
        return sourceProducts?.filter(p => p.isVisible && targetCategories.some(target => matchCategory(p.category, target))).length || 0;
    };

    const handleShareCategory = async (e: React.MouseEvent, category: any) => {
        e.preventDefault();
        e.stopPropagation();
        const bannerImg = category.imageUrl || (category.bannerImageUrls && category.bannerImageUrls[0]) || (isStandaloneMode && standaloneCategory?.imageUrl) || settings?.logoUrl || '';
        const appName = isStandaloneMode && standaloneCategory ? `${standaloneCategory.name} Store` : (settings?.appName || 'Online store');

        await shareContent({
            type: 'category',
            id: category.id,
            title: `${category.name} - ${appName}`,
            description: `Browse ${category.name} collection on ${appName} - Top quality products & fast delivery!`,
            image: bannerImg,
            appName: appName,
        }, (msg) => {
            setShareToast(msg);
            setTimeout(() => setShareToast(null), 3500);
        });
    };

    if (isLoading && !settings) {
        return (
            <div className="flex justify-center items-center h-96">
                <Spinner size="lg" />
            </div>
        );
    }

    const categoriesSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": categoriesToShow.map((category, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": category.name,
            "url": `https://onliny.co.uk/#/category/${category.id}`
        }))
    };

    const pageTitle = isStandaloneMode && standaloneCategory 
        ? `${standaloneCategory.name} Categories & Collections | onliny` 
        : "Product Categories & Collections | onliny";
    const pageDescription = isStandaloneMode && standaloneCategory
        ? `Explore all sub-categories and curated styles in ${standaloneCategory.name} at ${settings?.appName || 'onliny'}.`
        : `Explore all product categories at ${settings?.appName || 'onliny'}. Find unstitched suits, stitched lawn collections, menswear, and lifestyle products with Cash on Delivery across Pakistan.`;

    return (
        <div className="container mx-auto max-w-6xl px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
            <SEO 
                title={pageTitle}
                description={pageDescription}
                canonical="https://onliny.co.uk/#/categories"
                schema={categoriesSchema}
                keywords={[...categoriesToShow.map(c => c.name), 'onliny categories', 'unstitched suits', 'stitched lawn', 'Pakistani fashion collections', 'onliny.co.uk']}
            />

            {/* Toast Notification */}
            {shareToast && (
                <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-rose-500/40 text-xs sm:text-sm font-bold flex items-center gap-2 animate-fade-in backdrop-blur-md">
                    <Icons.checkCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{shareToast}</span>
                </div>
            )}

            {/* Back to Standalone Store Home Header if in standalone mode */}
            {isStandaloneMode && standaloneCategory && (
                <div className="flex items-center justify-between gap-2 mb-4">
                    <Link
                        to={`/store/c/${encodeURIComponent(standaloneCategory.id)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-rose-50 border border-rose-200 text-slate-700 hover:text-rose-600 shadow-2xs transition-all active:scale-95"
                    >
                        <Icons.chevronLeft className="w-4 h-4 text-rose-600" />
                        <span>Back to {standaloneCategory.storeName || standaloneCategory.name} Home</span>
                    </Link>
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 shadow-2xs">
                        {categoriesToShow.length} Sub-categories
                    </span>
                </div>
            )}
            
            <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {isStandaloneMode && standaloneCategory ? `${standaloneCategory.storeName || standaloneCategory.name} Categories` : 'All Categories'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    {isStandaloneMode && standaloneCategory 
                        ? `Explore curated sub-categories & collections in ${standaloneCategory.storeName || standaloneCategory.name}`
                        : 'Select a category to explore premium curated collections'}
                </p>
            </div>

            {categoriesToShow.length > 0 ? (
                /* 2 categories per line on laptop/tablet (md:grid-cols-2), 1 per line on mobile */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {categoriesToShow.map((category, idx) => {
                        const bgImage = category.imageUrl || (category.bannerImageUrls && category.bannerImageUrls[0]) || '';
                        const productCount = getCategoryProductCount(category);
                        const categoryUrl = isStandaloneMode && (standaloneType === 'vendor' || vendorId)
                            ? `/store/v/${encodeURIComponent(vendorId || category.vendorId || '')}?category=${encodeURIComponent(category.name)}`
                            : `/category/${category.id}`;

                        return (
                            <Link
                                key={category.id}
                                to={categoryUrl}
                                className="group relative w-full aspect-[16/9] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 block border border-slate-200/80 bg-slate-900"
                            >
                                {/* 16:9 Full Frame Background Image */}
                                {bgImage ? (
                                    <img 
                                        src={bgImage} 
                                        alt={category.name}
                                        loading={idx < 4 ? "eager" : "lazy"}
                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-800 via-rose-950 to-slate-900 flex items-center justify-center">
                                        <Icons.sparkles className="w-16 h-16 text-white/20" />
                                    </div>
                                )}

                                {/* High-Contrast Cinematic Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 group-hover:from-black/90 group-hover:via-black/45 transition-all duration-300" />

                                {/* Category Title & Info Overlaid on top */}
                                <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5 md:p-6 text-white">
                                    {/* Top badge and share button */}
                                    <div className="flex justify-between items-center z-10">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900/85 border border-white/30 text-white shadow-md">
                                            <span>Collection</span>
                                            {productCount > 0 && <span>• {productCount} items</span>}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleShareCategory(e, category)}
                                                aria-label={`Share ${category.name}`}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/85 hover:bg-rose-600 text-white border border-white/30 hover:border-rose-400/50 shadow-md transition-all cursor-pointer active:scale-95"
                                            >
                                                <Icons.share2 className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Share</span>
                                            </button>
                                            <div className="w-8 h-8 rounded-full bg-slate-900/85 border border-white/30 flex items-center justify-center text-white group-hover:bg-rose-600 group-hover:border-rose-500 group-hover:translate-x-1 transition-all duration-300 shadow-md">
                                                <Icons.chevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Main Category Title */}
                                    <div>
                                        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide drop-shadow-md group-hover:text-rose-200 transition-colors">
                                            {category.name}
                                        </h2>
                                        <div className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-slate-200 font-medium opacity-90 group-hover:opacity-100 transition-opacity">
                                            <span>Explore Products</span>
                                            <Icons.chevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
                    <Icons.search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <h3 className="text-lg font-semibold text-slate-800">
                        {isStandaloneMode && standaloneCategory ? 'No Sub-categories Found' : 'No Categories Found'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {isStandaloneMode && standaloneCategory 
                            ? `All products in ${standaloneCategory.name} are available directly on the store home page.`
                            : "The store owner hasn't added any product categories yet."}
                    </p>
                    {isStandaloneMode && standaloneCategory && (
                        <Link 
                            to={`/store/c/${encodeURIComponent(standaloneCategory.id)}`}
                            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition-colors"
                        >
                            <Icons.home className="w-4 h-4" />
                            <span>Go to Store Home</span>
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;
