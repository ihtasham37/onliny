import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { Banner } from '../../types';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';

const VendorBanners = () => {
    const { userData, updateVendorProfile } = useAuth();
    const { banners, addBanner, updateBanner, deleteBanner, uploadFile, isLoading } = useStore();

    const [bannerInputMode, setBannerInputMode] = useState<'upload' | 'url'>('upload');
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [bannerTitle, setBannerTitle] = useState('');
    const [redirectUrl, setRedirectUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const vendorBanners = useMemo(() => {
        if (!userData?.uid) return [];
        return (banners || []).filter(b => b && b.vendorId === userData.uid);
    }, [banners, userData?.uid]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setBannerFile(file);
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        } else {
            setPreviewUrl('');
        }
    };

    const handleAddBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData?.uid) return;
        setIsSubmitting(true);
        setSuccessMessage('');
        try {
            let finalImageUrl = '';
            if (bannerInputMode === 'upload' && bannerFile) {
                finalImageUrl = await uploadFile(bannerFile);
            } else if (bannerInputMode === 'url' && bannerUrl.trim()) {
                finalImageUrl = bannerUrl.trim();
            }

            if (!finalImageUrl) {
                alert('Please select or provide a banner image');
                setIsSubmitting(false);
                return;
            }

            // Save to banners collection
            const bannerPayload: Omit<Banner, 'id' | 'createdAt'> = {
                imageUrl: finalImageUrl,
                isActive: true,
                vendorId: userData.uid
            };
            if (bannerTitle.trim()) {
                bannerPayload.title = bannerTitle.trim();
            }
            if (redirectUrl.trim()) {
                bannerPayload.redirectUrl = redirectUrl.trim();
            }

            await addBanner(bannerPayload);

            // Synchronize with user's shopBanners profile
            try {
                const currentBanners = userData.shopBanners || [];
                const updatedBanners = [finalImageUrl, ...currentBanners.filter(b => b !== finalImageUrl)];
                await updateVendorProfile(userData.uid, {
                    shopBanners: updatedBanners,
                    ...(!userData.shopBannerUrl ? { shopBannerUrl: finalImageUrl } : {})
                });
            } catch (syncErr) {
                console.warn('Sync to profile:', syncErr);
            }

            setBannerFile(null);
            setPreviewUrl('');
            setBannerUrl('');
            setBannerTitle('');
            setRedirectUrl('');
            setSuccessMessage('Banner published successfully! It will now appear on your store home page.');
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (error) {
            console.error('Failed to add banner', error);
            alert('Failed to upload banner. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBanner = async (banner: Banner) => {
        if (!window.confirm('Delete this banner?')) return;
        try {
            await deleteBanner(banner);
            if (userData?.uid) {
                const currentBanners = (userData.shopBanners || []).filter(b => b !== banner.imageUrl);
                await updateVendorProfile(userData.uid, {
                    shopBanners: currentBanners
                });
            }
        } catch (err) {
            console.error('Error deleting banner', err);
        }
    };

    const handleSetAsPrimary = async (imageUrl: string) => {
        if (!userData?.uid) return;
        try {
            await updateVendorProfile(userData.uid, {
                shopBannerUrl: imageUrl
            });
            setSuccessMessage('Set as primary storefront header banner!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            alert('Failed to set primary banner');
        }
    };

    const getStoreUrl = () => {
        if (typeof window === 'undefined' || !userData?.uid) return '';
        return `${window.location.origin}/#/store/v/${encodeURIComponent(userData.uid)}`;
    };

    const copyStoreLink = () => {
        const url = getStoreUrl();
        navigator.clipboard.writeText(url);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2500);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-serif">Storefront Banners</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Upload top sliding banners (16:9) to promote special sales, new collections, or discounts on your store website.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={copyStoreLink}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                        <Icons.copy className="w-4 h-4" />
                        <span>{copiedUrl ? 'Copied Link!' : 'Copy Store Link'}</span>
                    </button>
                    <a
                        href={getStoreUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white transition-all flex items-center gap-1.5 shadow-md shadow-rose-200"
                    >
                        <Icons.externalLink className="w-4 h-4" />
                        <span>View Live Store</span>
                    </a>
                </div>
            </div>

            {/* Add Banner Form */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                        <Icons.plus className="w-5 h-5" />
                    </div>
                    <span>Add Promotional Banner</span>
                </h2>

                {successMessage && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <Icons.checkCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <form onSubmit={handleAddBanner} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Banner Title / Caption (Optional)" 
                            placeholder="e.g. Mega Summer Sale - 30% OFF" 
                            value={bannerTitle} 
                            onChange={e => setBannerTitle(e.target.value)} 
                        />
                        <Input 
                            label="Target URL or Link (Optional)" 
                            placeholder="e.g. /product/123 or https://..." 
                            value={redirectUrl} 
                            onChange={e => setRedirectUrl(e.target.value)} 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Banner Image (Recommended 16:9 Landscape)
                        </label>
                        <div className="flex gap-2 border-b border-slate-100 pb-2 mb-3">
                            <Button 
                                type="button" 
                                size="xs" 
                                variant={bannerInputMode === 'upload' ? 'primary' : 'secondary'} 
                                onClick={() => setBannerInputMode('upload')}
                            >
                                Upload Image
                            </Button>
                            <Button 
                                type="button" 
                                size="xs" 
                                variant={bannerInputMode === 'url' ? 'primary' : 'secondary'} 
                                onClick={() => setBannerInputMode('url')}
                            >
                                Paste Image URL
                            </Button>
                        </div>

                        {bannerInputMode === 'upload' ? (
                            <div className="space-y-2">
                                <Input 
                                    key="vendor-banner-file"
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    required={!previewUrl}
                                />
                                {previewUrl && (
                                    <div className="relative rounded-xl overflow-hidden border border-rose-200 aspect-[16/9] max-w-sm mt-2 shadow-xs">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs">
                                            Preview
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Input 
                                    key="vendor-banner-url"
                                    type="url" 
                                    placeholder="https://example.com/banner.png" 
                                    value={bannerUrl} 
                                    onChange={e => setBannerUrl(e.target.value)} 
                                    required={!bannerUrl}
                                />
                                {bannerUrl && (
                                    <div className="relative rounded-xl overflow-hidden border border-rose-200 aspect-[16/9] max-w-sm mt-2 shadow-xs">
                                        <ImageWithFallback src={bannerUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white font-bold py-2.5 px-6 rounded-xl border-none shadow-md shadow-rose-200"
                    >
                        {isSubmitting ? <Spinner size="sm" /> : 'Publish Banner'}
                    </Button>
                </form>
            </div>

            {/* List of Existing Banners */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Active Store Banners ({vendorBanners.length})
                </h2>

                {isLoading && vendorBanners.length === 0 ? (
                    <div className="text-center py-10"><Spinner /></div>
                ) : vendorBanners.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vendorBanners.map(banner => {
                            const isPrimary = userData?.shopBannerUrl === banner.imageUrl;
                            return (
                                <div key={banner.id} className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[16/9] shadow-sm group">
                                    <ImageWithFallback src={banner.imageUrl} alt={banner.title || 'Banner'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-4 text-white">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${banner.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-slate-200'}`}>
                                                    {banner.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                                {isPrimary && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                                                        Primary Header
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetAsPrimary(banner.imageUrl)}
                                                    className="p-1 text-amber-400 hover:text-amber-300 transition-colors"
                                                    title="Set as Main Store Banner"
                                                >
                                                    <Icons.star className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateBanner({ ...banner, isActive: !banner.isActive })}
                                                    className="p-1 text-slate-300 hover:text-white transition-colors"
                                                    title={banner.isActive ? 'Disable' : 'Enable'}
                                                >
                                                    {banner.isActive ? <Icons.checkCircle className="w-4 h-4 text-emerald-400" /> : <Icons.alertCircle className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBanner(banner)}
                                                    className="p-1 text-rose-400 hover:text-rose-300 transition-colors"
                                                    title="Delete Banner"
                                                >
                                                    <Icons.trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            {banner.title && (
                                                <h3 className="font-bold text-white text-base drop-shadow-md">
                                                    {banner.title}
                                                </h3>
                                            )}
                                            {banner.redirectUrl && (
                                                <p className="text-xs text-slate-300 truncate mt-0.5 opacity-80">
                                                    Link: {banner.redirectUrl}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8">
                        <Icons.image className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <h3 className="text-base font-bold text-slate-700">No Banners Added Yet</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            Add banners above to display an attractive slider carousel on the home page of your standalone store.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorBanners;
