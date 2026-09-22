import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { formatCurrency, safeJsonStringify } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { MediaPreview } from '../components/ui/MediaPreview';
import { ProductCard } from '../components/ProductCard';
import { Icons } from '../components/icons/Icons';
import { Textarea } from '../components/ui/Textarea';
import { Accordion } from '../components/ui/Accordion';
import { Product, AppUser } from '../types';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { getSmartShareUrl, shareContent, copyToClipboard } from '../utils/shareHelper';
import { useStandaloneCategory } from '../hooks/useStandaloneCategory';

const ProductCarouselRow: React.FC<{ products: Product[] }> = ({ products }) => {
    if (products.length === 0) return null;

    return (
        <div className="flex overflow-x-auto gap-3 pb-3 -mx-4 px-4 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {products.map(product => (
                <div key={product.id} className="w-2/5 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0">
                    <ProductCard product={product} />
                </div>
            ))}
        </div>
    );
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, allProducts, addToCart, isLoading, settings, wishlist, toggleWishlist, coupons, vendorsMap } = useStore();
  const { isStandalone, standaloneCategory } = useStandaloneCategory();
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [sizeError, setSizeError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const sizeSectionRef = React.useRef<HTMLDivElement>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);

  const product = useMemo(() => (allProducts || []).find(p => p.id === id), [allProducts, id]);
  const [vendorData, setVendorData] = useState<AppUser | null>(null);

  const applicableCoupons = useMemo(() => {
    if (!product) return [];
    const now = Date.now();
    return coupons.filter(c => {
      const isVendorMatch = product.vendorId ? c.vendorId === product.vendorId : !c.vendorId;
      const isValid = c.validFrom <= now && c.validTo >= now;
      return isVendorMatch && isValid;
    });
  }, [coupons, product]);

  useEffect(() => {
    if (!product?.vendorId) {
      setVendorData(null);
      return;
    }
    // Check vendorsMap from 1-read bundle (0 Firestore reads)
    if (vendorsMap && vendorsMap[product.vendorId]) {
      setVendorData(vendorsMap[product.vendorId]);
      return;
    }
    // Fallback using product shop name metadata without any network query
    setVendorData({
      uid: product.vendorId,
      shopName: product.shopName || 'Verified Store Vendor',
      email: '',
      role: 'vendor',
      status: 'active',
      createdAt: 0
    } as AppUser);
  }, [product, vendorsMap]);

  const productSizeCategories = useMemo(() => product?.sizeCategories || [], [product]);
  const isInWishlist = useMemo(() => wishlist.includes(product?.id || ''), [wishlist, product]);

  const productCategoryObj = useMemo(() => {
    if (!product || !settings?.categories) return null;
    return settings.categories.find(
      c => (product.vendorId ? c.vendorId === product.vendorId : (!c.vendorId || c.vendorId === 'admin')) &&
           (c.id === product.category || c.name.toLowerCase() === (product.category || '').toLowerCase())
    );
  }, [product, settings?.categories]);

  const categoryName = useMemo(() => {
    return productCategoryObj?.name || product?.category || 'Category';
  }, [productCategoryObj, product?.category]);

  const categoryId = useMemo(() => {
    return productCategoryObj?.id || product?.category || '';
  }, [productCategoryObj, product?.category]);

  // Strictly filter products belonging to the SAME category / subcategory family
  const relatedSameCategoryProducts = useMemo(() => {
    if (!product) return [];

    const sourceProducts = product.vendorId
      ? (allProducts || []).filter(p => p.vendorId === product.vendorId)
      : products;

    const allCats = settings?.categories || [];
    const validCatIdentifiers = new Set<string>();

    if (product.category) {
      validCatIdentifiers.add(product.category.toLowerCase().trim());
    }

    if (productCategoryObj) {
      validCatIdentifiers.add(productCategoryObj.id.toLowerCase().trim());
      validCatIdentifiers.add(productCategoryObj.name.toLowerCase().trim());

      // If this category has a parent, include sibling categories or parent context
      if (productCategoryObj.parentId) {
        const parent = allCats.find(c => c.id === productCategoryObj.parentId);
        if (parent) {
          validCatIdentifiers.add(parent.id.toLowerCase().trim());
          validCatIdentifiers.add(parent.name.toLowerCase().trim());
          // Siblings under same parent
          const siblings = allCats.filter(c => c.parentId === parent.id);
          siblings.forEach(s => {
            validCatIdentifiers.add(s.id.toLowerCase().trim());
            validCatIdentifiers.add(s.name.toLowerCase().trim());
          });
        }
      } else {
        // If it's a parent category, include all its children subcategories
        const children = allCats.filter(c => c.parentId === productCategoryObj.id);
        children.forEach(ch => {
          validCatIdentifiers.add(ch.id.toLowerCase().trim());
          validCatIdentifiers.add(ch.name.toLowerCase().trim());
        });
      }
    }

    // Filter ONLY matching products from the same category, excluding current product
    const matching = sourceProducts.filter(p => {
      if (p.id === id || !p.isVisible) return false;
      const pCat = (p.category || '').toLowerCase().trim();
      return validCatIdentifiers.has(pCat);
    });

    // Shuffle for natural variation within the category
    const shuffled = [...matching];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [products, product, id, settings?.categories, productCategoryObj]);

  const productRows = useMemo(() => {
    if (!product || relatedSameCategoryProducts.length === 0) return [];
    
    const row1 = relatedSameCategoryProducts.slice(0, 10);
    const row2 = relatedSameCategoryProducts.slice(10, 20);
    const row3 = relatedSameCategoryProducts.slice(20, 30);
    
    return [row1, row2, row3].filter(row => row.length > 0);
  }, [relatedSameCategoryProducts, product]);


  useEffect(() => {
    if (product) {
      setMainImage(product.images?.[0] || null);
      setSelectedSizes({});
      setAdditionalInfo('');
      setQuantity(1);
      window.scrollTo(0, 0);

      // Record user interest for personalized recommendations
      if (product.category) {
        try {
          const stored = localStorage.getItem('user_interests') || '{}';
          const interests = JSON.parse(stored);
          interests[product.category] = (interests[product.category] || 0) + 1;
          localStorage.setItem('user_interests', safeJsonStringify(interests));
        } catch (e) {
          // ignore storage errors
        }
      }
    }
  }, [product]);

  if (isLoading && !product) {
    return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button onClick={() => navigate('/')} className="mt-4">Go to Homepage</Button>
      </div>
    );
  }

  const handleSizeChange = (categoryName: string, size: string) => {
    setSelectedSizes(prev => {
      const updated = { ...prev, [categoryName]: size };
      // Check if all size categories are now filled
      if (product?.sizeCategories && product.sizeCategories.every(c => updated[c.categoryName])) {
        setSizeError('');
      } else {
        const nextMissing = product?.sizeCategories?.find(c => !updated[c.categoryName]);
        if (nextMissing) {
          setSizeError(`Please select your ${nextMissing.categoryName}!`);
        } else {
          setSizeError('');
        }
      }
      return updated;
    });
  };

  const validateSizes = () => {
    if (product?.sizeCategories && product.sizeCategories.length > 0) {
      const missingCat = product.sizeCategories.find(c => !selectedSizes[c.categoryName]);
      if (missingCat) {
        const errorText = `Please select your ${missingCat.categoryName}!`;
        setSizeError(errorText);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);

        // Smoothly scroll screen directly to the size selection section
        if (sizeSectionRef.current) {
          const rect = sizeSectionRef.current.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetY = rect.top + scrollTop - 120; // 120px offset to keep header and alert nicely visible
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });
        }
        return false;
      }
    }
    setSizeError('');
    return true;
  };
  
  const handleAddToCart = () => {
      if (!validateSizes()) return;
      setSizeError('');
      addToCart(product, quantity, selectedSizes, additionalInfo);
  };

  const handleBuyNow = () => {
      if (!validateSizes()) return;
      setSizeError('');
      addToCart(product, quantity, selectedSizes, additionalInfo);
      navigate('/checkout');
  }

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product) {
      toggleWishlist(product.id);
    }
  };

  const [shareToast, setShareToast] = useState<string | null>(null);

  const handleShareProduct = async () => {
    if (!product) return;
    const appName = settings?.appName || 'Online store';
    const firstImage = product.images?.[0] || settings?.logoUrl || '';
    
    await shareContent({
      type: 'product',
      id: product.id,
      title: product.name,
      description: product.description || `Buy ${product.name} at ${appName}. Price: ${formatCurrency(product.price)}.`,
      image: firstImage,
      price: product.price,
      appName: appName,
    }, (msg) => {
      setShareToast(msg);
      setTimeout(() => setShareToast(null), 3500);
    });
    setShowShareMenu(false);
  };

  const copyProductLink = handleShareProduct;

  const smartShareUrl = useMemo(() => {
    if (!product) return '';
    return getSmartShareUrl({
      type: 'product',
      id: product.id,
      title: product.name,
      description: product.description,
      image: product.images?.[0],
      price: product.price,
      appName: settings?.appName || 'Online store',
    });
  }, [product, settings?.appName]);

  const whatsappNumber = vendorData?.whatsappNumber || settings?.whatsappNumber;
  const whatsappMessage = `Hello! I’m interested in this product:\n*${product.name}* (Rs. ${Number(product.price).toLocaleString()})\n${smartShareUrl}`;
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` : '#';
  const shippingFeeText = typeof product.shippingFee === 'number' ? formatCurrency(product.shippingFee) : 'Calculated at checkout';

  return (
    <div className="container mx-auto max-w-5xl" key={id}>
      <SEO 
        title={`${product.name} | Best Price in Pakistan | ${settings?.appName || 'onliny'}`} 
        description={product.description || `Buy ${product.name} at ${settings?.appName || 'onliny'} (${settings?.storeDomain || 'onliny.co.uk'}). Price: ${formatCurrency(product.price)}. Cash on delivery across Pakistan with 7-day return guarantee.`}
        image={product.images?.[0]}
        price={product.price}
        type="product"
        canonical={`https://onliny.co.uk/#/product/${product.id}`}
        keywords={[product.name, product.category || 'Fashion', 'buy online Pakistan', 'Cash on Delivery', 'onliny', 'onliny.co.uk']}
        schema={{
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "image": product.images || [],
            "description": product.description || `${product.name} available at onliny.co.uk`,
            "sku": product.id,
            "offers": {
                "@type": "Offer",
                "url": `https://onliny.co.uk/#/product/${product.id}`,
                "priceCurrency": "PKR",
                "price": product.price,
                "availability": "https://schema.org/InStock",
                "itemCondition": "https://schema.org/NewCondition",
                "hasMerchantReturnPolicy": {
                    "@type": "MerchantReturnPolicy",
                    "applicableCountry": "PK",
                    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                    "merchantReturnDays": 7,
                    "returnMethod": "https://schema.org/ReturnByMail",
                    "returnFees": "https://schema.org/FreeReturn"
                },
                "seller": {
                    "@type": "Organization",
                    "name": product.shopName || settings?.appName || "onliny"
                }
            }
        }}
      />
      
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-rose-500/40 text-xs sm:text-sm font-bold flex items-center gap-2 animate-fade-in backdrop-blur-md">
            <Icons.checkCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{shareToast}</span>
        </div>
      )}
      
      <Breadcrumbs items={[
          { 
            label: product.vendorId 
              ? (product.shopName || vendorData?.shopName || 'Store') 
              : (isStandalone && standaloneCategory ? (standaloneCategory.storeName || standaloneCategory.name) : categoryName), 
            href: product.vendorId
              ? `/store/v/${encodeURIComponent(product.vendorId)}`
              : (isStandalone && standaloneCategory 
                ? `/store/c/${standaloneCategory.id}` 
                : (categoryId ? `/category/${categoryId}` : `/categories`))
          },
          { label: product.name, href: `/product/${product.id}` }
      ]} />

      <div className="bg-white p-2 sm:p-3 rounded-lg shadow-md mb-20 md:mb-0">
        {/* Shop Header Banner & Logo - Compact & Attractive on Mobile */}
        <div 
          onClick={() => {
            if (product.vendorId) {
              navigate(`/store/v/${encodeURIComponent(product.vendorId)}`);
            } else if (isStandalone && standaloneCategory) {
              navigate(`/store/c/${standaloneCategory.id}`);
            } else {
              navigate('/');
            }
          }}
          className="relative h-14 sm:h-20 md:h-24 rounded-2xl overflow-hidden mb-3.5 bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 shadow-sm border border-rose-100 cursor-pointer hover:shadow-md transition-all group"
          role="button"
          aria-label="Visit store"
        >
          {((isStandalone && (standaloneCategory?.bannerImageUrls?.[0] || standaloneCategory?.bannerUrls?.[0])) || (product.vendorId ? vendorData?.shopBannerUrl : (settings?.storeBannerUrl || settings?.bannerUrls?.[0]))) && (
            <ImageWithFallback 
              src={isStandalone && standaloneCategory ? ((standaloneCategory.bannerImageUrls && standaloneCategory.bannerImageUrls[0]) || (standaloneCategory.bannerUrls && standaloneCategory.bannerUrls[0]) || '') : (product.vendorId ? (vendorData?.shopBannerUrl || '') : (settings?.storeBannerUrl || settings?.bannerUrls?.[0] || ''))} 
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/25 backdrop-blur-[0.5px]" />
          
          <div className="relative h-full px-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 border-white/90 bg-white overflow-hidden shadow-sm flex items-center justify-center shrink-0">
                {isStandalone && standaloneCategory ? (
                  (standaloneCategory.storeLogoUrl || standaloneCategory.imageUrl) ? (
                    <ImageWithFallback src={standaloneCategory.storeLogoUrl || standaloneCategory.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.store className="w-4 h-4 sm:w-6 sm:h-6 text-rose-600" />
                  )
                ) : product.vendorId ? (
                  vendorData?.shopLogoUrl ? (
                    <ImageWithFallback src={vendorData.shopLogoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.store className="w-4 h-4 sm:w-6 sm:h-6 text-rose-600" />
                  )
                ) : (
                  settings?.logoUrl ? (
                    <ImageWithFallback src={settings.logoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.store className="w-4 h-4 sm:w-6 sm:h-6 text-rose-600" />
                  )
                )}
              </div>
              <div className="text-white min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs sm:text-base font-bold tracking-tight truncate drop-shadow-xs font-serif">
                    {isStandalone && standaloneCategory 
                      ? (standaloneCategory.storeName || `${standaloneCategory.name} Store`)
                      : (product.vendorId ? (product.shopName || 'Vendor') : (settings?.appName || 'Official Store'))}
                  </h2>
                  {(!product.vendorId || vendorData?.status === 'active' || isStandalone) && (
                    <Icons.checkCircle className="w-3.5 h-3.5 text-amber-300 fill-amber-400/20 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] sm:text-[11px] bg-white/20 text-white px-2 py-0.2 rounded-full font-medium backdrop-blur-xs">
                    {isStandalone ? 'Dedicated Storefront' : (!product.vendorId ? 'Official Store' : 'Verified Business')}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 pl-2">
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-rose-900 bg-white/95 hover:bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xs backdrop-blur-md group-hover:bg-white group-hover:scale-105 transition-all">
                <span>Visit Store</span>
                <span className="text-rose-600">&rarr;</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-2">
          {/* Image Gallery */}
          <div className="space-y-1 max-w-[280px] mx-auto md:max-w-none">
            <div className="relative">
                <div className="border border-rose-100 rounded-2xl overflow-hidden aspect-square shadow-sm bg-white">
                  <MediaPreview 
                    key={mainImage} 
                    src={mainImage || product.images?.[0]} 
                    className="w-full h-full" 
                  />
                </div>
                 <button 
                    onClick={handleToggleWishlist}
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                    aria-label={isInWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                    className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-2 text-slate-700 hover:text-rose-600 hover:scale-110 shadow-sm transition-all duration-200 z-10"
                >
                    <Icons.diamond className={`w-5 h-5 transition-all ${isInWishlist ? 'fill-rose-600 stroke-rose-600' : 'fill-none'}`} />
                </button>
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {product.images.map((img, index) => (
                  <button 
                    key={index} 
                    onClick={() => setMainImage(img)} 
                    className={`flex-shrink-0 aspect-square border-2 rounded-xl overflow-hidden transition-all duration-200 focus:outline-none ring-offset-2 ring-rose-400 ${mainImage === img ? 'border-rose-600 scale-105 ring-2 shadow-xs' : 'border-rose-100 hover:border-rose-300'}`}
                    aria-label={`View media ${index + 1}`}
                  >
                    <MediaPreview src={img} className="w-full h-full" controls={false} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col space-y-2 p-0 sm:p-1">
            <div className="flex justify-between items-start relative">
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">{product.category}</span>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => product.vendorId ? navigate(`/store/${product.vendorId}`) : navigate('/')}
                  className="flex flex-col items-end group"
                >
                    <div className="flex items-center gap-1 text-[10px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded-full font-bold border border-rose-200/80 hover:bg-rose-100 transition-colors">
                      {product.vendorId ? (
                        vendorData?.shopLogoUrl ? (
                          <ImageWithFallback src={vendorData.shopLogoUrl} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <Icons.store className="w-3 h-3" />
                        )
                      ) : (
                        settings?.logoUrl ? (
                          <ImageWithFallback src={settings.logoUrl} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <Icons.store className="w-3 h-3" />
                        )
                      )}
                      {product.vendorId ? (product.shopName || 'Vendor') : (settings?.appName || 'Store')}
                    </div>
                    {(!product.vendorId || vendorData?.status === 'active') && (
                        <span className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-wider">
                          {!product.vendorId ? 'Official Store' : 'Verified Business'}
                        </span>
                    )}
                </button>
                
                <button 
                  onClick={handleShareProduct}
                  title="Share product with image preview"
                  aria-label="Share product"
                  className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-full transition-colors flex items-center gap-1 text-xs font-bold px-2.5"
                >
                  <Icons.share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>

                <div className="relative">
                  <button 
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    aria-label="More options"
                  >
                    <Icons.moreVertical className="w-4 h-4" />
                  </button>
                  
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white shadow-xl rounded-xl border border-rose-100 py-1 w-44 z-30 animate-fade-in">
                      <button 
                        onClick={handleShareProduct}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-rose-50 text-slate-700 font-semibold"
                      >
                        <Icons.share2 className="w-3.5 h-3.5 text-rose-600" />
                        Share Product Link
                      </button>
                      <button 
                        onClick={copyProductLink}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-rose-50 text-slate-700 font-medium border-t border-slate-100"
                      >
                        <Icons.copy className="w-3.5 h-3.5 text-slate-500" />
                        Copy Smart Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <h1 className="text-xl font-bold font-serif text-slate-900 tracking-tight">{product.name}</h1>
            
            <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-rose-700 tracking-tight">{formatCurrency(product.price)}</p>
                {product.oldPrice && <p className="text-sm text-slate-400 line-through">{formatCurrency(product.oldPrice)}</p>}
            </div>

            {productSizeCategories.length > 0 && (
              <div 
                ref={sizeSectionRef}
                id="product-size-section"
                className={`rounded-2xl transition-all duration-300 p-3 space-y-3 ${
                  sizeError 
                    ? `bg-rose-50/90 border-2 border-rose-500 shadow-lg shadow-rose-200/60 ring-4 ring-rose-200/50 ${isShaking ? 'animate-shake' : ''}` 
                    : 'bg-slate-50/70 border border-rose-100/80'
                }`}
              >
                  {/* Prominent Attention Alert at the top of the Size Section */}
                  {sizeError && (
                    <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-rose-600 via-rose-600 to-pink-600 text-white text-xs font-black px-3.5 py-2.5 rounded-xl shadow-sm animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span>⚠️ {sizeError}</span>
                      </div>
                      <span className="text-[10px] bg-white/20 uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-xs font-black shrink-0">
                        Required
                      </span>
                    </div>
                  )}

                  {productSizeCategories.map(cat => {
                     const isMissingThis = !selectedSizes[cat.categoryName] && !!sizeError;
                     return (
                       <div key={cat.categoryName} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className={`block text-xs font-bold transition-colors ${
                              isMissingThis ? 'text-rose-600 font-extrabold flex items-center gap-1.5' : 'text-slate-800'
                            }`}>
                              <span>{cat.categoryName}:</span>
                              {isMissingThis && (
                                <span className="text-[10px] bg-rose-200/90 text-rose-800 px-1.5 py-0.2 rounded-md font-extrabold animate-pulse">
                                  Select Option
                                </span>
                              )}
                            </label>
                            {selectedSizes[cat.categoryName] && (
                              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                ✓ {selectedSizes[cat.categoryName]}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.sizes.map(size => {
                              const isSelected = selectedSizes[cat.categoryName] === size;
                              return (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => handleSizeChange(cat.categoryName, size)}
                                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border-2 flex items-center justify-center gap-1.5 transition-all duration-200 focus:outline-none cursor-pointer ${
                                    isSelected
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs scale-105 ring-2 ring-rose-300 ring-offset-1'
                                        : isMissingThis
                                        ? 'bg-white text-slate-800 border-rose-300 hover:border-rose-500 hover:bg-rose-50/80 shadow-xs'
                                        : 'bg-white text-slate-800 border-rose-100 hover:bg-rose-50 hover:border-rose-200'
                                    }`}
                                >
                                    {size}
                                </button>
                              );
                            })}
                          </div>
                      </div>
                     );
                  })}
              </div>
            )}


            <div className="pt-1">
                <label htmlFor="additionalInfo" className="block text-xs font-semibold text-slate-700 mb-0.5">Special Instructions / Customization (Optional)</label>
                <Textarea
                  id="additionalInfo"
                  name="additionalInfo"
                  value={additionalInfo}
                  onChange={e => setAdditionalInfo(e.target.value)}
                  rows={2}
                  placeholder="Enter baby size note, color preference or gift message..."
                  className="py-1.5 text-xs"
                />
            </div>
            
             <div className="flex items-center gap-3 pt-1">
              <label htmlFor="quantity" className="text-xs font-bold text-slate-800">Quantity:</label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 transition-colors border border-rose-100" onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Decrease quantity">
                    <Icons.minus className="w-3.5 h-3.5" />
                </Button>
                <span id="quantity" className="text-base font-extrabold text-slate-900 w-8 text-center">{quantity}</span>
                <Button type="button" variant="ghost" size="sm" className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 transition-colors border border-rose-100" onClick={() => setQuantity(q => q + 1)} aria-label="Increase quantity">
                    <Icons.plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-rose-100 pt-2">
          <Accordion title="Product Details">
              <div className="text-sm text-slate-700 space-y-2">
                <p><strong>Category:</strong> {product.category}</p>
                <div className="whitespace-pre-wrap">
                    {product.description || 'No details available.'}
                </div>
              </div>
          </Accordion>
          <Accordion title="Shipping & Returns">
               <div className="text-sm text-slate-700 space-y-2">
                  <p><strong>Shipping Fee:</strong> {shippingFeeText}</p>
                  {product.deliveryTime && <p><strong>Estimated Delivery:</strong> {product.deliveryTime}</p>}
                  {product.easyReturn && (
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                          <Icons.checkCircle className="w-4 h-4 text-emerald-600"/>
                          <span>7 Days Easy Return &amp; Replacement Available</span>
                      </div>
                  )}
                  {product.returnPolicy ? (
                      <p><strong>Return Policy:</strong> {product.returnPolicy}</p>
                  ) : settings?.globalReturnPolicy ? (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 whitespace-pre-line">
                          <strong>Store Return Policy:</strong> {settings.globalReturnPolicy}
                      </div>
                  ) : (
                      <p className="text-xs text-slate-600">Standard 7-day return policy applies on damaged, defective, or incorrect items.</p>
                  )}
                  <div className="pt-1">
                      <Link to="/refund-policy" className="text-xs text-rose-600 font-bold hover:underline inline-flex items-center gap-1">
                          <span>Read full Return &amp; Refund Policy</span>
                          <Icons.chevronRight className="w-3 h-3" />
                      </Link>
                  </div>
              </div>
          </Accordion>
        </div>
      
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-2.5 border-t border-rose-100 md:static md:mt-3 md:p-1 md:border-0 md:shadow-none shadow-[0_-4px_16px_rgba(244,63,94,0.08)] z-20 flex flex-col gap-2 rounded-2xl">
            {sizeError && (
              <button
                type="button"
                onClick={() => {
                  if (sizeSectionRef.current) {
                    const rect = sizeSectionRef.current.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const targetY = rect.top + scrollTop - 120;
                    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
                  }
                }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-rose-200 flex items-center justify-between transition-colors animate-fade-in cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-rose-600 font-extrabold animate-bounce">↑</span>
                  <span>{sizeError}</span>
                </span>
                <span className="text-[10px] text-rose-600 underline font-semibold">Tap to select</span>
              </button>
            )}

            <div className="flex gap-2">
                <Button 
                    onClick={handleAddToCart} 
                    size="sm" 
                    variant="outline"
                    className="flex-1 py-2.5 rounded-xl border-2 border-rose-300 text-rose-700 hover:bg-rose-50 font-bold"
                >
                    Add to Cart
                </Button>

                {(settings?.whatsappNumber || vendorData?.whatsappNumber) && (
                    <a 
                        href={whatsappLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 py-2 px-3 text-xs flex-1 shadow-xs"
                    >
                        <Icons.whatsapp className="w-4 h-4" />
                        <span>Order via WhatsApp</span>
                    </a>
                )}
            </div>
            
            <Button 
                onClick={handleBuyNow} 
                size="md" 
                variant="primary" 
                className="w-full py-3 rounded-xl font-extrabold text-base shadow-md"
            >
                Buy Now
            </Button>

            {/* Applicable Coupons */}
            {applicableCoupons.length > 0 && (
                <div className="mt-2">
                    <p className="text-[10px] font-bold text-rose-800 mb-1 px-1 uppercase tracking-wider">Available Store Coupons & Discounts</p>
                    <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
                        {applicableCoupons.map(coupon => (
                            <div key={coupon.id} className="flex-shrink-0 bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 flex flex-col min-w-[150px]">
                                <span className="text-rose-800 font-bold text-xs uppercase">{coupon.code}</span>
                                <span className="text-[10px] text-slate-600 line-clamp-1">{coupon.description}</span>
                                <div className="mt-1.5 flex items-center justify-between">
                                    <span className="text-[11px] font-black text-rose-700">
                                        {coupon.discountType === 'flat' ? `${coupon.discountValue} PKR Off` : `${coupon.discountValue}% Off`}
                                    </span>
                                    <button 
                                        onClick={async () => {
                                            await copyToClipboard(coupon.code);
                                            alert(`Coupon code ${coupon.code} copied!`);
                                        }}
                                        className="text-[10px] bg-white border border-rose-300 text-rose-700 font-bold px-2 py-0.5 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {productRows.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
              More in {categoryName}
            </h2>
            {categoryId && (
              <button 
                onClick={() => navigate(`/category/${categoryId}`)}
                className="text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <span>View All</span>
                <Icons.chevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="space-y-4">
            {productRows.map((products, index) => (
                <ProductCarouselRow key={index} products={products} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;