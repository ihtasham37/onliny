import React, { useState, useEffect } from 'react';
import { Category } from '../../types';
import { Button } from '../ui/Button';
import { Icons } from '../icons/Icons';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { copyToClipboard } from '../../utils/shareHelper';
import { useStore } from '../../hooks/useStore';
import { Spinner } from '../ui/Spinner';

interface StandaloneLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  productCount?: number;
}

export const StandaloneLinkModal: React.FC<StandaloneLinkModalProps> = ({
  isOpen,
  onClose,
  category,
  productCount = 0,
}) => {
  const { settings, updateCategory, uploadFile } = useStore();
  const [copiedType, setCopiedType] = useState<'direct' | 'social' | null>(null);

  // Storefront custom branding state
  const [storeName, setStoreName] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sync state whenever modal opens or category changes
  useEffect(() => {
    if (category) {
      setStoreName(category.storeName || category.name || '');
      setStoreLogoUrl(category.storeLogoUrl || category.imageUrl || '');
      setLogoFile(null);
      setSaveToast(null);
    }
  }, [category, isOpen]);

  if (!isOpen || !category) return null;

  const appName = settings?.appName || 'Online Store';
  const origin = window.location.origin;
  const currentDisplayName = storeName.trim() || category.storeName || category.name;
  
  // 1. Direct App Route (opens inside app directly)
  const directUrl = `${origin}/#/store/c/${encodeURIComponent(category.id)}`;
  
  // 2. Dynamic Social Share URL (WhatsApp/Facebook generates rich banner preview)
  const bannerImg = (category.bannerImageUrls && category.bannerImageUrls[0]) || category.imageUrl || settings?.logoUrl || '';
  const shareParams = new URLSearchParams({
    type: 'standalone',
    id: category.id,
    title: `${currentDisplayName} Official Store`,
    desc: `Explore exclusive ${currentDisplayName} collection. Verified quality, best prices & fast delivery!`,
    image: bannerImg,
    app: currentDisplayName || appName
  });
  const socialShareUrl = `${origin}/share?${shareParams.toString()}`;

  const handleCopy = async (url: string, type: 'direct' | 'social') => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 3000);
    }
  };

  const handleWhatsAppShare = () => {
    const message = `🛍️ *${currentDisplayName} Official Store*\n\nExplore our dedicated ${currentDisplayName} storefront with exclusive styles, verified quality & cash on delivery!\n\n👉 Shop Now: ${socialShareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePreview = () => {
    window.open(directUrl, '_blank');
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setIsUploadingLogo(true);
    try {
      const uploadedUrl = await uploadFile(file);
      setStoreLogoUrl(uploadedUrl);
    } catch (err) {
      console.error('Failed to upload logo', err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!category) return;
    setIsSavingBranding(true);
    try {
      let finalLogo = storeLogoUrl.trim();
      if (logoFile && !finalLogo) {
        finalLogo = await uploadFile(logoFile);
        setStoreLogoUrl(finalLogo);
      }

      await updateCategory(category.id, {
        storeName: storeName.trim() || category.name,
        storeLogoUrl: finalLogo || undefined,
      });

      setSaveToast('Branding updated in real-time!');
      setTimeout(() => setSaveToast(null), 4000);
    } catch (error) {
      console.error('Failed to save store branding:', error);
      setSaveToast('Failed to save branding');
      setTimeout(() => setSaveToast(null), 3000);
    } finally {
      setIsSavingBranding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full border border-rose-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-amber-600 p-4 sm:p-5 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <Icons.x className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 p-1 backdrop-blur-xs shrink-0 overflow-hidden border border-white/30">
              <ImageWithFallback
                src={storeLogoUrl || category.imageUrl}
                alt={currentDisplayName}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                Dedicated Storefront
              </span>
              <h3 className="text-lg sm:text-xl font-black">{currentDisplayName}</h3>
              <p className="text-xs text-rose-100 font-medium">
                {productCount} products ready to show in standalone website
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Toast Notice */}
          {saveToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
              <Icons.checkCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveToast}</span>
            </div>
          )}

          {/* Real-time Branding Feature: Store Name & Store Logo */}
          <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                <Icons.sparkles className="w-4 h-4 text-rose-600" />
                <span>Storefront Branding (Name & Logo)</span>
              </span>
              <span className="text-[10px] font-bold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                ⚡ Real-time
              </span>
            </div>
            
            {/* Store Name Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">
                Custom Store Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={`Default: ${category.name}`}
                className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 font-medium"
              />
              <p className="text-[10px] text-slate-500">
                This name will appear on the standalone website's header, banner, and WhatsApp links.
              </p>
            </div>

            {/* Store Logo Input */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700">
                  Custom Store Logo
                </label>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-rose-200 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setLogoInputMode('upload')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      logoInputMode === 'upload' ? 'bg-rose-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoInputMode('url')}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      logoInputMode === 'url' ? 'bg-rose-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Image URL
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Logo Preview */}
                <div className="w-12 h-12 rounded-xl bg-white border-2 border-rose-200 overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs">
                  {isUploadingLogo ? (
                    <Spinner size="sm" />
                  ) : storeLogoUrl ? (
                    <img src={storeLogoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Icons.image className="w-5 h-5 text-rose-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {logoInputMode === 'upload' ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-600 file:text-white hover:file:bg-rose-700 cursor-pointer w-full"
                    />
                  ) : (
                    <input
                      type="url"
                      value={storeLogoUrl}
                      onChange={(e) => setStoreLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full bg-white border border-rose-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
                    />
                  )}
                  {storeLogoUrl && (
                    <button
                      type="button"
                      onClick={() => { setStoreLogoUrl(''); setLogoFile(null); }}
                      className="text-[10px] text-rose-600 hover:underline mt-0.5 inline-block"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-1 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveBranding}
                disabled={isSavingBranding || isUploadingLogo}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {isSavingBranding ? (
                  <>
                    <Spinner size="sm" />
                    <span className="ml-1.5">Saving...</span>
                  </>
                ) : (
                  <>
                    <Icons.check className="w-3.5 h-3.5 mr-1" />
                    <span>Save Branding</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 1. WhatsApp / Social Share Link (Recommended) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>WhatsApp & Social Media Link (Recommended)</span>
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Shows Rich Preview Card
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              When sent on WhatsApp, Facebook, or Telegram, this link displays the {currentDisplayName} banner, logo, and title.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={socialShareUrl}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 select-all font-mono"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => handleCopy(socialShareUrl, 'social')}
                className={`shrink-0 font-bold ${
                  copiedType === 'social' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                {copiedType === 'social' ? (
                  <>
                    <Icons.check className="w-3.5 h-3.5 mr-1" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Icons.copy className="w-3.5 h-3.5 mr-1" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 2. Direct Website URL */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800">
              Direct In-App Route
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directUrl}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 select-all font-mono"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCopy(directUrl, 'direct')}
                className={`shrink-0 font-bold ${
                  copiedType === 'direct' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : ''
                }`}
              >
                {copiedType === 'direct' ? (
                  <>
                    <Icons.check className="w-3.5 h-3.5 mr-1" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Icons.copy className="w-3.5 h-3.5 mr-1" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <Icons.share2 className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <Icons.externalLink className="w-4 h-4" />
              <span>Preview Storefront</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 flex justify-end border-t border-slate-100 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
