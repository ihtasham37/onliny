import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useStandaloneCategory } from '../hooks/useStandaloneCategory';
import { Icons } from '../components/icons/Icons';
import { Button } from '../components/ui/Button';
import { AppUser } from '../types';
import { SEO } from '../components/SEO';
import { copyToClipboard, shareContent } from '../utils/shareHelper';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { FullPageSpinner } from '../components/ui/Spinner';

const VendorInfoPage: React.FC = () => {
  const params = useParams<{ vendorId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { allProducts, vendorsMap, banners, settings, coupons } = useStore();
  const { vendorId: hookVendorId } = useStandaloneCategory();

  const vendorId = useMemo(() => {
    if (params.vendorId && params.vendorId !== 'v') {
      return decodeURIComponent(params.vendorId);
    }
    const match = location.pathname.match(/(?:\/store\/v\/|\/vendor-store\/)([^/?#]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return hookVendorId || params.vendorId || '';
  }, [params.vendorId, location.pathname, hookVendorId]);

  const [vendorData, setVendorData] = useState<AppUser | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Look up vendor
  useEffect(() => {
    if (!vendorId) return;

    if (vendorsMap && vendorsMap[vendorId]) {
      setVendorData(vendorsMap[vendorId]);
      return;
    }

    try {
      const cached = localStorage.getItem(`standalone_vendor_${vendorId}`);
      if (cached) {
        setVendorData(JSON.parse(cached));
      }
    } catch (e) {
      console.error('Error reading vendor cache:', e);
    }
  }, [vendorId, vendorsMap]);

  // Vendor's products
  const vendorProducts = useMemo(() => {
    if (!vendorId) return [];
    return (allProducts || []).filter(p => p.vendorId === vendorId && p.isVisible);
  }, [allProducts, vendorId]);

  // Vendor's categories
  const vendorCategories = useMemo(() => {
    if (!vendorId) return [];
    return (settings?.categories || []).filter(c => c.vendorId === vendorId && c.isVisible);
  }, [settings?.categories, vendorId]);

  // Vendor's coupons
  const vendorCoupons = useMemo(() => {
    if (!vendorId) return [];
    return (coupons || []).filter(c => (!c.validTo || c.validTo > Date.now()) && c.vendorId === vendorId);
  }, [coupons, vendorId]);

  // Vendor banners
  const vendorBanners = useMemo(() => {
    if (!vendorId) return [];
    const directBanners = (banners || [])
      .filter(b => b.isActive && b.vendorId === vendorId && b.imageUrl)
      .map(b => b.imageUrl);

    const profileBanners = vendorData?.shopBanners || (vendorData?.shopBannerUrl ? [vendorData.shopBannerUrl] : []);
    const merged = Array.from(new Set([...directBanners, ...profileBanners]));
    return merged;
  }, [vendorId, banners, vendorData]);

  const storeDisplayName = vendorData?.shopName || 'Vendor Store';
  const storeLogo = vendorData?.shopLogoUrl || '';
  const homeStoreUrl = `/store/v/${encodeURIComponent(vendorId)}`;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/#/store/v/${encodeURIComponent(vendorId)}`;
    await shareContent({
      type: 'store',
      id: vendorId,
      title: `${storeDisplayName} - Official Online Store`,
      description: vendorData?.shopDescription || `Visit ${storeDisplayName} to browse verified collections & order online.`,
      image: storeLogo || vendorBanners[0] || settings?.logoUrl || '',
      appName: storeDisplayName
    }, (msg) => {
      setShareToast(msg);
      setTimeout(() => setShareToast(null), 3000);
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/store/v/${encodeURIComponent(vendorId)}`;
    copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!vendorData && !vendorId) {
    return <FullPageSpinner />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 px-2 sm:px-4 pb-12 animate-fade-in">
      <SEO 
        title={`${storeDisplayName} - Store Profile & Information`}
        description={vendorData?.shopDescription || `Official store information for ${storeDisplayName}. Browse verified products, contact via WhatsApp, and shop securely.`}
        image={storeLogo || vendorBanners[0]}
      />

      {/* Toast Notification */}
      {(shareToast || copied) && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-2xl shadow-xl border border-rose-500/40 text-xs font-bold flex items-center gap-2 animate-fade-in backdrop-blur-md">
          <Icons.checkCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareToast || 'Store link copied to clipboard!'}</span>
        </div>
      )}

      {/* Top Navigation Bar: Back to Store button */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Link
          to={homeStoreUrl}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-rose-50 border border-rose-200 text-slate-800 hover:text-rose-600 shadow-2xs transition-all active:scale-95"
        >
          <Icons.chevronLeft className="w-4 h-4 text-rose-600" />
          <span>Back to Store</span>
        </Link>

        <span className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
          Store Information
        </span>
      </div>

      {/* Store Cover Banner & Profile Card */}
      <div className="rounded-3xl overflow-hidden bg-white shadow-sm border border-rose-100">
        {/* Banner Cover */}
        <div className="h-36 sm:h-48 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 relative overflow-hidden">
          {vendorBanners[0] ? (
            <img 
              src={vendorBanners[0]} 
              alt={storeDisplayName} 
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <Icons.store className="w-24 h-24" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        </div>

        {/* Profile Details */}
        <div className="px-4 sm:px-6 pb-6 pt-12 sm:pt-14 relative">
          {/* Store Logo floating over cover */}
          <div className="absolute -top-10 sm:-top-12 left-4 sm:left-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 shadow-lg border border-rose-100 overflow-hidden flex items-center justify-center">
              {storeLogo ? (
                <ImageWithFallback 
                  src={storeLogo} 
                  fallbackSrc="/placeholder.svg"
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 font-serif font-black text-2xl">
                  {storeDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-900 tracking-tight">
                {storeDisplayName}
              </h1>
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                <Icons.checkCircle className="w-3.5 h-3.5 text-amber-600" />
                Verified Vendor
              </span>
            </div>

            {vendorData?.shopDescription ? (
              <p className="text-sm text-slate-700 leading-relaxed bg-rose-50/40 p-3.5 rounded-2xl border border-rose-100/60">
                {vendorData.shopDescription}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Official online boutique for {storeDisplayName}. Offering verified fashion, kids wear, and accessories with nationwide fast delivery.
              </p>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 py-2">
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <div className="text-lg sm:text-xl font-black text-rose-700">{vendorProducts.length}</div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Products</div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <div className="text-lg sm:text-xl font-black text-slate-800">{vendorCategories.length}</div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Categories</div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <div className="text-lg sm:text-xl font-black text-amber-600">{vendorCoupons.length}</div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Discounts</div>
              </div>
            </div>

            {/* Contact & Store Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
              {vendorData?.whatsappNumber && (
                <a 
                  href={`https://wa.me/${vendorData.whatsappNumber}?text=${encodeURIComponent(`Hello ${storeDisplayName}, I want to enquire about products in your store.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98"
                >
                  <Icons.whatsapp className="w-4 h-4" />
                  <span>WhatsApp Vendor</span>
                </a>
              )}

              <button 
                onClick={handleShare}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98"
              >
                <Icons.share className="w-4 h-4" />
                <span>Share Store Link</span>
              </button>

              <button 
                onClick={handleCopyLink}
                className="sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Icons.copy className="w-4 h-4 text-slate-500" />
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Guarantees & Shopping Assurance */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-rose-100 space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Icons.checkCircle className="w-4 h-4 text-emerald-600" />
          <span>Shopping Guarantees & Policies</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50/40 border border-rose-100/60">
            <Icons.checkCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-800">100% Verified Quality</div>
              <div className="text-slate-500 mt-0.5">Every product is reviewed and fulfilled with verified store standards.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50/40 border border-rose-100/60">
            <Icons.package className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-800">Cash on Delivery (COD)</div>
              <div className="text-slate-500 mt-0.5">Pay conveniently on delivery at your doorstep across Pakistan.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50/40 border border-rose-100/60">
            <Icons.package className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-800">Direct Order Tracking</div>
              <div className="text-slate-500 mt-0.5">Real-time status updates via SMS, WhatsApp, and tracking codes.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50/40 border border-rose-100/60">
            <Icons.messageCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-800">Direct Support</div>
              <div className="text-slate-500 mt-0.5">Reach out anytime via WhatsApp for sizing advice or product questions.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Big Call to Action: Shop Now */}
      <div className="text-center pt-2">
        <Link
          to={homeStoreUrl}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-extrabold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-98 text-sm"
        >
          <Icons.shoppingCart className="w-4 h-4" />
          <span>Browse All {vendorProducts.length} Products in Store</span>
        </Link>
      </div>
    </div>
  );
};

export default VendorInfoPage;
