import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icons } from '../../components/icons/Icons';
import { Spinner } from '../../components/ui/Spinner';

const VendorSettings = () => {
    const { userData, updateVendorProfile } = useAuth();
    const [shopName, setShopName] = useState(userData?.shopName || '');
    const [whatsappNumber, setWhatsappNumber] = useState(userData?.whatsappNumber || '');
    const [shopLogoUrl, setShopLogoUrl] = useState(userData?.shopLogoUrl || '');
    const [shopBannerUrl, setShopBannerUrl] = useState(userData?.shopBannerUrl || '');
    const [description, setDescription] = useState(userData?.description || '');
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [copiedUrl, setCopiedUrl] = useState(false);
    const { uploadFile } = useStore();

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoading(true);
        try {
            const url = await uploadFile(file);
            if (field === 'logo') setShopLogoUrl(url);
            else setShopBannerUrl(url);
        } catch (err) {
            alert('Upload failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;
        
        setIsLoading(true);
        setSuccessMsg('');
        try {
            await updateVendorProfile(userData.uid, {
                shopName,
                whatsappNumber,
                shopLogoUrl,
                shopBannerUrl,
                description
            });
            setSuccessMsg('Shop settings updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            alert('Failed to update shop settings');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 font-serif">Shop Settings & Standalone Website</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Manage your business profile, branding, WhatsApp contact, and standalone storefront link.
                </p>
            </div>

            {/* Standalone Website Live Card */}
            <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-amber-200 border border-white/20">
                            <Icons.checkCircle className="w-3.5 h-3.5 text-emerald-300" />
                            Live Standalone Website
                        </span>
                        <h2 className="text-xl sm:text-2xl font-bold font-serif">
                            {userData?.shopName || 'My Online Store'}
                        </h2>
                        <p className="text-xs text-rose-100 max-w-md">
                            Your customers can visit this dedicated website link, browse only your products and categories, and install your app with your logo and name!
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-center">
                        <button
                            type="button"
                            onClick={copyStoreLink}
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                            <Icons.copy className="w-4 h-4" />
                            <span>{copiedUrl ? 'Copied Link!' : 'Copy Link'}</span>
                        </button>
                        <a
                            href={getStoreUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                        >
                            <Icons.externalLink className="w-4 h-4" />
                            <span>Open Store</span>
                        </a>
                    </div>
                </div>

                {/* Direct Link Preview Bar */}
                <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between gap-2 bg-black/20 rounded-xl px-3.5 py-2 text-xs font-mono text-rose-100">
                    <span className="truncate">{getStoreUrl()}</span>
                    <button 
                        onClick={copyStoreLink}
                        className="text-amber-300 hover:text-white font-sans font-bold text-xs shrink-0 underline ml-2"
                    >
                        Copy
                    </button>
                </div>
            </div>
            
            {/* Settings Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <Input 
                            label="Shop Display Name" 
                            value={shopName} 
                            onChange={e => setShopName(e.target.value)} 
                            placeholder="e.g. Ali's Boutique"
                            required
                        />
                        <p className="text-xs text-slate-500 -mt-2">
                            This name is displayed across your standalone website, order receipts, and when users install your app.
                        </p>
                        
                        <Input 
                            label="WhatsApp Number (for Customer Orders & Inquiries)" 
                            value={whatsappNumber} 
                            onChange={e => setWhatsappNumber(e.target.value)} 
                            placeholder="923000000000"
                            required
                        />
                        <p className="text-xs text-slate-500 -mt-2">
                            Customers will contact this WhatsApp number directly from your store & product pages.
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Shop Tagline / About (Optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Describe your store, specialty, and return or delivery promises..."
                                rows={3}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                            {/* Shop Logo */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-800">
                                    Shop Logo (App Icon)
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                        {shopLogoUrl ? (
                                            <img src={shopLogoUrl} className="w-full h-full object-cover" alt="Shop Logo" />
                                        ) : (
                                            <Icons.image className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-grow space-y-2">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={e => handleFileUpload(e, 'logo')} 
                                            className="text-xs text-slate-500" 
                                        />
                                        <Input 
                                            value={shopLogoUrl} 
                                            onChange={e => setShopLogoUrl(e.target.value)} 
                                            placeholder="Or paste logo image URL" 
                                            className="py-1 text-xs" 
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    This logo appears in your store header, receipts, and PWA mobile app icon.
                                </p>
                            </div>

                            {/* Main Shop Header Banner */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-800">
                                    Primary Store Header Banner
                                </label>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                        {shopBannerUrl ? (
                                            <img src={shopBannerUrl} className="w-full h-full object-cover" alt="Shop Banner" />
                                        ) : (
                                            <Icons.image className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={e => handleFileUpload(e, 'banner')} 
                                            className="text-xs text-slate-500 flex-grow" 
                                        />
                                    </div>
                                    <Input 
                                        value={shopBannerUrl} 
                                        onChange={e => setShopBannerUrl(e.target.value)} 
                                        placeholder="Or paste banner image URL" 
                                        className="py-1 text-xs" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {successMsg && (
                        <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-xl flex items-center gap-2 border border-emerald-100 animate-fade-in text-sm font-bold">
                            <Icons.checkCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white font-bold py-3.5 rounded-xl shadow-md shadow-rose-200 border-none" 
                        size="lg"
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="sm" /> : 'Save Shop Settings'}
                    </Button>
                </form>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2 font-serif">
                    <Icons.alertCircle className="w-5 h-5 text-rose-600" />
                    Account & Business Verification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 block">Registered Email</span>
                        <span className="font-semibold text-slate-800">{userData?.email}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 block">Business Owner</span>
                        <span className="font-semibold text-slate-800">{userData?.firstName} {userData?.lastName}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorSettings;
