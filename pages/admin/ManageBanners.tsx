import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { Banner, BannerProductItem, Product, AnnouncementBanner } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { MediaPreview } from '../../components/ui/MediaPreview';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { formatCurrency } from '../../utils/helpers';

// Modal to Add / Edit Banner Image or Video
const BannerModal = ({ isOpen, onClose, banner }: { isOpen: boolean; onClose: () => void; banner: Banner | null; }) => {
    const { addBanner, updateBanner, uploadFile } = useStore();
    const [formData, setFormData] = useState<Omit<Banner, 'id' | 'createdAt'>>({
        imageUrl: '',
        redirectUrl: '',
        isActive: true,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');

    useEffect(() => {
        if (banner) {
            setFormData({
                imageUrl: banner.imageUrl,
                redirectUrl: banner.redirectUrl || '',
                isActive: banner.isActive,
            });
        } else {
            setFormData({ imageUrl: '', redirectUrl: '', isActive: true });
        }
        setUploadError('');
        setIsUploading(false);
    }, [banner, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError('');
        try {
            const url = await uploadFile(file);
            setFormData(prev => ({ ...prev, imageUrl: url }));
        } catch (err: any) {
            setUploadError(err.message || 'An error occurred during upload.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.imageUrl) {
            alert('Please provide an image URL or upload an image.');
            return;
        }
        setIsSubmitting(true);
        try {
            if (banner) {
                await updateBanner({ ...formData, id: banner.id, createdAt: banner.createdAt });
            } else {
                await addBanner(formData);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save banner:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-4">{banner ? 'Edit Slider Banner' : 'Add New Slider Banner'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-800 mb-1">Banner Image or Video</label>
                        <div className="flex gap-2 my-2 border-b border-slate-100 pb-2">
                            <Button type="button" size="sm" variant={imageInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('upload')}>📁 Upload File</Button>
                            <Button type="button" size="sm" variant={imageInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('url')}>🔗 Paste URL</Button>
                        </div>
                        {imageInputMode === 'upload' ? (
                            <div className="space-y-2">
                                <Input type="file" onChange={handleImageUpload} accept="image/*,video/*" disabled={isUploading} />
                                {formData.imageUrl && (
                                    <Input label="Direct URL (or paste URL)" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://example.com/banner.jpg" />
                                )}
                            </div>
                        ) : (
                            <Input label="Image/Video URL" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://example.com/banner.jpg" required />
                        )}
                        {isUploading && <div className="mt-2 flex items-center gap-2 text-xs text-rose-600 font-semibold"><Spinner size="sm" /> <span>Uploading asset...</span></div>}
                        {uploadError && <p className="mt-2 text-xs text-rose-600 font-semibold">{uploadError}</p>}
                        {formData.imageUrl && <MediaPreview src={formData.imageUrl} className="mt-2 w-full h-auto max-h-40 rounded-xl overflow-hidden border shadow-xs" />}
                    </div>

                    <Input label="Redirect URL (Optional)" name="redirectUrl" value={formData.redirectUrl} onChange={handleChange} placeholder="https://yourstore.com/category/sale" />
                    
                    <div className="flex items-center">
                        <input type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500 cursor-pointer" />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 font-medium cursor-pointer">Activate this banner</label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || isUploading}>
                            {isSubmitting ? <Spinner size="sm" /> : 'Save Banner'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Modal to Add / Edit Product in Banner Section
const BannerProductModal = ({ 
    isOpen, 
    onClose, 
    initialItem,
    onSave 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    initialItem: BannerProductItem | null;
    onSave: (item: BannerProductItem) => Promise<void>;
}) => {
    const { products, settings } = useStore();
    const categories = settings?.categories || [];

    const [selectedProductId, setSelectedProductId] = useState('');
    const [placement, setPlacement] = useState<'home' | string>('home');
    const [customDiscountBadge, setCustomDiscountBadge] = useState('');
    const [backgroundMode, setBackgroundMode] = useState<'auto' | 'custom'>('auto');
    const [customColor, setCustomColor] = useState('#2b0914');
    const [isActive, setIsActive] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialItem) {
            setSelectedProductId(initialItem.productId);
            setPlacement(initialItem.placement || 'home');
            setCustomDiscountBadge(initialItem.customDiscountBadge || '');
            setIsActive(initialItem.isActive !== false);
            if (initialItem.backgroundColor && initialItem.backgroundColor !== 'auto') {
                setBackgroundMode('custom');
                setCustomColor(initialItem.backgroundColor);
            } else {
                setBackgroundMode('auto');
                setCustomColor('#2b0914');
            }
        } else {
            setSelectedProductId(products[0]?.id || '');
            setPlacement('home');
            setCustomDiscountBadge('');
            setIsActive(true);
            setBackgroundMode('auto');
            setCustomColor('#2b0914');
        }
        setSearchQuery('');
    }, [initialItem, isOpen, products]);

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(q) || 
            p.category.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    const currentSelectedProduct = products.find(p => p.id === selectedProductId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId) {
            alert('Please select a product to add to the banner.');
            return;
        }

        setIsSaving(true);
        try {
            const bannerItem: BannerProductItem = {
                id: initialItem?.id || `bp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                productId: selectedProductId,
                placement,
                customDiscountBadge: customDiscountBadge.trim() || undefined,
                backgroundMode,
                backgroundColor: backgroundMode === 'custom' ? customColor : 'auto',
                isActive,
                createdAt: initialItem?.createdAt || Date.now(),
            };
            await onSave(bannerItem);
            onClose();
        } catch (error) {
            console.error("Failed to save banner product:", error);
            alert("Failed to save product in banner.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {initialItem ? 'Edit Banner Product' : 'Add Product to Banner Section'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Showcase this product on the Home banner or a specific Category banner.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <Icons.x className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto py-4 flex-1 pr-1">
                    {/* Step 1: Select Product */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            1. Select Product
                        </label>
                        <div className="relative mb-2">
                            <input
                                type="text"
                                placeholder="Search product by name or category..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full text-xs pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-400 focus:outline-none"
                            />
                            <Icons.search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                        </div>

                        <div className="max-h-40 overflow-y-auto border rounded-xl divide-y bg-slate-50/50">
                            {filteredProducts.length === 0 ? (
                                <p className="p-3 text-xs text-center text-gray-400">No matching products found</p>
                            ) : (
                                filteredProducts.slice(0, 50).map(prod => {
                                    const isSelected = prod.id === selectedProductId;
                                    return (
                                        <button
                                            type="button"
                                            key={prod.id}
                                            onClick={() => setSelectedProductId(prod.id)}
                                            className={`w-full flex items-center justify-between p-2 text-left text-xs transition-colors ${
                                                isSelected ? 'bg-rose-100/70 text-rose-900 font-bold' : 'hover:bg-gray-100 text-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-8 h-8 rounded-md bg-white border overflow-hidden shrink-0">
                                                    <MediaPreview src={prod.images?.[0]} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="truncate">
                                                    <div className="truncate font-semibold">{prod.name}</div>
                                                    <div className="text-[10px] text-gray-500">{prod.category}</div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                <span className="font-bold text-rose-600">{formatCurrency(prod.price)}</span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {currentSelectedProduct && (
                            <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border bg-white">
                                    <MediaPreview src={currentSelectedProduct.images?.[0]} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 text-xs">
                                    <span className="text-[10px] font-bold text-rose-500 uppercase">Selected Product</span>
                                    <p className="font-bold text-slate-900 truncate">{currentSelectedProduct.name}</p>
                                    <p className="text-[11px] text-rose-700 font-bold">{formatCurrency(currentSelectedProduct.price)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Banner Adjustment / Placement */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            2. Banner Placement (Home or Specific Category)
                        </label>
                        <select
                            value={placement}
                            onChange={e => setPlacement(e.target.value)}
                            className="w-full text-sm font-medium border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        >
                            <option value="home">🏠 Home Banner (Home Page)</option>
                            <optgroup label="📂 Or Select Specific Category Banner">
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        📁 Category: {cat.name}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                        <p className="text-[11px] text-gray-500 mt-1">
                            {placement === 'home' 
                                ? 'This product will be shown only on the Home page banner section.' 
                                : 'This product will be shown only inside this specific category\'s banner section.'}
                        </p>
                    </div>

                    {/* Step 3: Custom Discount Badge (Optional) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            3. Custom Discount Badge (Optional)
                        </label>
                        <Input
                            placeholder="e.g. 30% OFF, Special Deal, Hot Offer"
                            value={customDiscountBadge}
                            onChange={e => setCustomDiscountBadge(e.target.value)}
                        />
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                            Leave empty to automatically calculate discount percentage from original & sale price.
                        </span>
                    </div>

                    {/* Step 4: Banner Background Color Mode & Selection */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                                4. Banner Background Color
                            </label>
                            <p className="text-[11px] text-gray-500">
                                Match background with product photo automatically or select a custom theme color.
                            </p>
                        </div>

                        {/* Mode Switcher */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setBackgroundMode('auto')}
                                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                                    backgroundMode === 'auto'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <span>✨ Match with Photo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setBackgroundMode('custom')}
                                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                                    backgroundMode === 'custom'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <span>🎨 Select Custom Color</span>
                            </button>
                        </div>

                        {/* Custom Color Selector Section */}
                        {backgroundMode === 'custom' ? (
                            <div className="space-y-2.5 pt-1">
                                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                                    <input
                                        type="color"
                                        value={customColor}
                                        onChange={e => setCustomColor(e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-bold text-slate-700">Selected Hex Color</div>
                                        <input
                                            type="text"
                                            value={customColor}
                                            onChange={e => setCustomColor(e.target.value)}
                                            placeholder="#2b0914"
                                            className="w-full text-xs font-mono font-bold text-slate-800 uppercase bg-transparent focus:outline-none"
                                        />
                                    </div>
                                    <div 
                                        className="w-8 h-8 rounded-lg shadow-inner border border-black/10 shrink-0"
                                        style={{ backgroundColor: customColor }}
                                    />
                                </div>

                                {/* Luxury & Modern Preset Color Swatches */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                            Quick Color Presets:
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            Click any color to apply
                                        </span>
                                    </div>

                                    {/* Presets by categories */}
                                    <div className="space-y-2">
                                        {/* Light & White Shades */}
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Light &amp; White Tones
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    { name: 'Pure White', hex: '#ffffff' },
                                                    { name: 'Snow / Pearl', hex: '#f8fafc' },
                                                    { name: 'Soft Cream', hex: '#fffbeb' },
                                                    { name: 'Light Rose', hex: '#ffe4e6' },
                                                    { name: 'Light Lavender', hex: '#f3e8ff' },
                                                    { name: 'Ice Sky Blue', hex: '#e0f2fe' },
                                                    { name: 'Mint Pastel', hex: '#ecfdf5' },
                                                    { name: 'Light Sand', hex: '#fef3c7' },
                                                ].map(preset => (
                                                    <button
                                                        key={preset.hex}
                                                        type="button"
                                                        onClick={() => setCustomColor(preset.hex)}
                                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                                                            customColor.toLowerCase() === preset.hex.toLowerCase()
                                                                ? 'ring-2 ring-rose-500 border-transparent shadow-xs font-bold text-slate-900 bg-white'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <span 
                                                            className="w-3 h-3 rounded-full shrink-0 border border-slate-300 shadow-xs"
                                                            style={{ backgroundColor: preset.hex }}
                                                        />
                                                        <span>{preset.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Deep Luxury Tones */}
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Deep Luxury Darks
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    { name: 'Obsidian Black', hex: '#090d16' },
                                                    { name: 'Deep Rose', hex: '#2b0914' },
                                                    { name: 'Midnight Navy', hex: '#0b132b' },
                                                    { name: 'Royal Emerald', hex: '#062016' },
                                                    { name: 'Dark Amethyst', hex: '#22092c' },
                                                    { name: 'Warm Bronze', hex: '#2a1b0a' },
                                                    { name: 'Deep Maroon', hex: '#4c0519' },
                                                    { name: 'Slate Gray', hex: '#1e293b' },
                                                    { name: 'Dark Charcoal', hex: '#18181b' },
                                                ].map(preset => (
                                                    <button
                                                        key={preset.hex}
                                                        type="button"
                                                        onClick={() => setCustomColor(preset.hex)}
                                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                                                            customColor.toLowerCase() === preset.hex.toLowerCase()
                                                                ? 'ring-2 ring-rose-500 border-transparent shadow-xs font-bold text-slate-900 bg-white'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <span 
                                                            className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                                                            style={{ backgroundColor: preset.hex }}
                                                        />
                                                        <span>{preset.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Rich & Vibrant Tones */}
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Rich &amp; Vibrant Colors
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    { name: 'Crimson Red', hex: '#dc2626' },
                                                    { name: 'Sapphire Blue', hex: '#2563eb' },
                                                    { name: 'Emerald Teal', hex: '#0d9488' },
                                                    { name: 'Forest Green', hex: '#16a34a' },
                                                    { name: 'Royal Purple', hex: '#7e22ce' },
                                                    { name: 'Warm Amber Gold', hex: '#d97706' },
                                                    { name: 'Coral Rose', hex: '#e11d48' },
                                                    { name: 'Vibrant Magenta', hex: '#c026d3' },
                                                    { name: 'Sunset Orange', hex: '#ea580c' },
                                                ].map(preset => (
                                                    <button
                                                        key={preset.hex}
                                                        type="button"
                                                        onClick={() => setCustomColor(preset.hex)}
                                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                                                            customColor.toLowerCase() === preset.hex.toLowerCase()
                                                                ? 'ring-2 ring-rose-500 border-transparent shadow-xs font-bold text-slate-900 bg-white'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <span 
                                                            className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                                                            style={{ backgroundColor: preset.hex }}
                                                        />
                                                        <span>{preset.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/70 p-2 rounded-lg flex items-center gap-1.5">
                                <Icons.check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                <span>Banner will intelligently sample and mirror the product photo's color tones automatically.</span>
                            </p>
                        )}
                    </div>

                    {/* Step 5: Active Status */}
                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="bannerProductActive"
                            checked={isActive}
                            onChange={e => setIsActive(e.target.checked)}
                            className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
                        />
                        <label htmlFor="bannerProductActive" className="text-xs font-semibold text-slate-800 cursor-pointer">
                            Active (Show in banner)
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Spinner size="sm" /> : 'Save Banner Product'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ManageBanners = () => {
    const { 
        banners, 
        deleteBanner, 
        updateBanner, 
        isLoading, 
        settings, 
        updateSettings, 
        products 
    } = useStore();

    // Homepage Slide Banners state (moved from Admin Settings with visible Delete button)
    const [homepageBannerInputMode, setHomepageBannerInputMode] = useState<'upload' | 'url'>('upload');
    const [homepageBannerUrl, setHomepageBannerUrl] = useState('');
    const [isUploadingHomepageBanner, setIsUploadingHomepageBanner] = useState(false);
    const [homepageBannerUploadError, setHomepageBannerUploadError] = useState('');

    const handleHomepageBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !settings) return;
        setIsUploadingHomepageBanner(true);
        setHomepageBannerUploadError('');
        const uploadedUrls: string[] = [];
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const url = await uploadFile(file);
                uploadedUrls.push(url);
            }
            const updated = [...(settings.bannerUrls || []), ...uploadedUrls];
            await updateSettings({ ...settings, bannerUrls: updated });
        } catch (err: any) {
            setHomepageBannerUploadError(err.message || 'Error uploading banner image');
        } finally {
            setIsUploadingHomepageBanner(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleAddHomepageBannerUrl = async () => {
        if (!homepageBannerUrl.trim() || !settings) return;
        try {
            new URL(homepageBannerUrl.trim());
            const updated = [...(settings.bannerUrls || []), homepageBannerUrl.trim()];
            await updateSettings({ ...settings, bannerUrls: updated });
            setHomepageBannerUrl('');
        } catch (_) {
            alert('Please enter a valid image URL');
        }
    };

    const handleDeleteHomepageBanner = async (index: number) => {
        if (!settings) return;
        if (!window.confirm('Are you sure you want to delete this homepage banner?')) return;
        const updated = (settings.bannerUrls || []).filter((_, i) => i !== index);
        await updateSettings({ ...settings, bannerUrls: updated });
    };

    // Slider modal states
    const [isSliderModalOpen, setIsSliderModalOpen] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

    // Banner product modal states
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedBannerProduct, setSelectedBannerProduct] = useState<BannerProductItem | null>(null);

    // Announcement banner state (Top Play Store / App banner)
    const [announcementState, setAnnouncementState] = useState<AnnouncementBanner>({
        enabled: false,
        text: '',
        linkUrl: '',
        buttonText: 'Get on Play Store'
    });
    const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
    const [announcementSuccess, setAnnouncementSuccess] = useState(false);

    // Popup modal banner state
    const { uploadFile } = useStore();
    const [popupState, setPopupState] = useState<{
        enabled: boolean;
        imageUrl: string;
        redirectUrl: string;
        title: string;
    }>({
        enabled: false,
        imageUrl: '',
        redirectUrl: '',
        title: ''
    });
    const [isSavingPopup, setIsSavingPopup] = useState(false);
    const [isUploadingPopup, setIsUploadingPopup] = useState(false);
    const [popupUploadError, setPopupUploadError] = useState('');
    const [popupSuccess, setPopupSuccess] = useState(false);

    useEffect(() => {
        if (settings?.popupBanner) {
            setPopupState({
                enabled: settings.popupBanner.enabled ?? false,
                imageUrl: settings.popupBanner.imageUrl || '',
                redirectUrl: settings.popupBanner.redirectUrl || '',
                title: settings.popupBanner.title || ''
            });
        }
    }, [settings?.popupBanner]);

    const handlePopupUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingPopup(true);
        setPopupUploadError('');
        try {
            const url = await uploadFile(file);
            setPopupState(prev => ({ ...prev, imageUrl: url }));
        } catch (err: any) {
            setPopupUploadError(err.message || 'Error uploading popup banner image');
        } finally {
            setIsUploadingPopup(false);
        }
    };

    const handleSavePopup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setIsSavingPopup(true);
        try {
            await updateSettings({
                ...settings,
                popupBanner: popupState
            });
            setPopupSuccess(true);
            setTimeout(() => setPopupSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save popup banner:", err);
            alert("Failed to save promotional popup banner.");
        } finally {
            setIsSavingPopup(false);
        }
    };

    useEffect(() => {
        if (settings?.announcementBanner) {
            setAnnouncementState({
                enabled: settings.announcementBanner.enabled ?? false,
                text: settings.announcementBanner.text || '',
                linkUrl: settings.announcementBanner.linkUrl || (settings.playStoreUrl || ''),
                buttonText: settings.announcementBanner.buttonText || 'Get on Play Store'
            });
        } else if (settings?.playStoreUrl) {
            // Backward compatibility: If playStoreUrl was present, prefill it
            setAnnouncementState(prev => ({
                ...prev,
                linkUrl: settings.playStoreUrl || ''
            }));
        }
    }, [settings]);

    const handleSaveAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setIsSavingAnnouncement(true);
        try {
            await updateSettings({
                ...settings,
                announcementBanner: announcementState
            });
            setAnnouncementSuccess(true);
            setTimeout(() => setAnnouncementSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save announcement banner:", err);
            alert("Failed to save announcement banner.");
        } finally {
            setIsSavingAnnouncement(false);
        }
    };

    // Banner Products handlers
    const bannerProductsList = settings?.bannerProducts || [];

    const handleSaveBannerProduct = async (item: BannerProductItem) => {
        if (!settings) return;
        const currentList = settings.bannerProducts || [];
        const existingIndex = currentList.findIndex(bp => bp.id === item.id);
        let updatedList: BannerProductItem[];

        if (existingIndex >= 0) {
            updatedList = [...currentList];
            updatedList[existingIndex] = item;
        } else {
            updatedList = [item, ...currentList];
        }

        await updateSettings({
            ...settings,
            bannerProducts: updatedList
        });
    };

    const handleDeleteBannerProduct = async (itemId: string) => {
        if (!settings) return;
        if (!window.confirm("Remove this product from the banner section?")) return;
        const updatedList = (settings.bannerProducts || []).filter(bp => bp.id !== itemId);
        await updateSettings({
            ...settings,
            bannerProducts: updatedList
        });
    };

    const handleToggleBannerProductActive = async (item: BannerProductItem) => {
        if (!settings) return;
        const updatedList = (settings.bannerProducts || []).map(bp => 
            bp.id === item.id ? { ...bp, isActive: !bp.isActive } : bp
        );
        await updateSettings({
            ...settings,
            bannerProducts: updatedList
        });
    };

    // Category dictionary for lookup
    const categoryMap = useMemo(() => {
        const map: Record<string, string> = {};
        (settings?.categories || []).forEach(c => {
            map[c.id] = c.name;
        });
        return map;
    }, [settings?.categories]);

    // Image/video slider handlers
    const openSliderModal = (banner: Banner | null = null) => {
        setSelectedBanner(banner);
        setIsSliderModalOpen(true);
    };

    const handleDeleteBanner = (banner: Banner) => {
        if (window.confirm(`Are you sure you want to delete this slider banner?`)) {
            deleteBanner(banner);
        }
    };
    
    const toggleBannerActive = (banner: Banner) => {
        updateBanner({ ...banner, isActive: !banner.isActive });
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Banner Management</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage your store's Homepage Carousel Banners, Top Announcement Banner, and Banner Section Featured Products.
                </p>
            </div>

            {/* SECTION: Main Homepage Slider Banners (Moved from Admin Settings with Clean View & Guaranteed Visible Delete) */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-rose-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
                            <Icons.image className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-800">Homepage Slider Banners (ہوم پیج بینرز)</h2>
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                    {(settings?.bannerUrls || []).length} Active
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Upload banner photos or add image links displayed in the storefront hero carousel.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Upload or URL switcher */}
                <div className="mt-4">
                    <div className="flex gap-2 mb-3">
                        <Button
                            type="button"
                            size="sm"
                            variant={homepageBannerInputMode === 'upload' ? 'primary' : 'secondary'}
                            onClick={() => setHomepageBannerInputMode('upload')}
                        >
                            <Icons.upload className="w-3.5 h-3.5 mr-1.5" />
                            Upload Images
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={homepageBannerInputMode === 'url' ? 'primary' : 'secondary'}
                            onClick={() => setHomepageBannerInputMode('url')}
                        >
                            <Icons.externalLink className="w-3.5 h-3.5 mr-1.5" />
                            Add from URL
                        </Button>
                    </div>

                    {homepageBannerInputMode === 'upload' ? (
                        <div className="border-2 border-dashed border-rose-200 hover:border-rose-400 bg-rose-50/40 rounded-2xl p-6 text-center transition-colors">
                            <Icons.image className="mx-auto h-10 w-10 text-rose-400 mb-2" />
                            <label
                                htmlFor="manage-homepage-banner-upload"
                                className="cursor-pointer font-bold text-xs sm:text-sm text-rose-600 hover:text-rose-700 underline block"
                            >
                                <span>Click here to select and upload banner images (PNG, JPG, WEBP)</span>
                                <input
                                    id="manage-homepage-banner-upload"
                                    type="file"
                                    className="sr-only"
                                    multiple
                                    onChange={handleHomepageBannerUpload}
                                    accept="image/*"
                                    disabled={isUploadingHomepageBanner}
                                />
                            </label>
                            <p className="text-[11px] text-slate-400 mt-1">Select one or multiple banners up to 5MB each</p>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="https://example.com/banner-photo.jpg"
                                value={homepageBannerUrl}
                                onChange={e => setHomepageBannerUrl(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddHomepageBannerUrl();
                                    }
                                }}
                                className="flex-1 text-xs"
                            />
                            <Button
                                type="button"
                                onClick={handleAddHomepageBannerUrl}
                                className="shrink-0 text-xs"
                            >
                                Add Image URL
                            </Button>
                        </div>
                    )}

                    {isUploadingHomepageBanner && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                            <Spinner size="sm" />
                            <span>Uploading banner images...</span>
                        </div>
                    )}
                    {homepageBannerUploadError && (
                        <p className="mt-2 text-xs font-semibold text-red-600">{homepageBannerUploadError}</p>
                    )}

                    {/* Fixed, fully-visible list view with guaranteed visible Delete button */}
                    <div className="mt-4 space-y-2.5">
                        {(settings?.bannerUrls || []).length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Icons.image className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                                <p className="text-xs font-bold text-slate-600">No homepage slider banners added yet</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Use the upload box above to add banner images to your storefront carousel.</p>
                            </div>
                        ) : (
                            (settings?.bannerUrls || []).map((url, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between gap-3 p-3 bg-white hover:bg-rose-50/20 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-20 sm:w-28 aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                            <ImageWithFallback
                                                src={url}
                                                alt={`Banner ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 shrink-0">
                                                    Slide #{index + 1}
                                                </span>
                                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                                    Active
                                                </span>
                                            </div>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate" title={url}>
                                                {url.split('/').pop()?.split('?')[0] || `Banner Image ${index + 1}`}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                                                {url}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Prominently visible and styled delete button */}
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteHomepageBanner(index)}
                                        className="px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl border border-rose-200 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
                                        title="Delete this banner"
                                    >
                                        <Icons.trash className="w-4 h-4 shrink-0" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* SECTION 2: Top Announcement & App Play Store Banner */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-rose-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
                            <Icons.bell className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-800">Top Announcement & Play Store Banner</h2>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    announcementState.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {announcementState.enabled ? 'ACTIVE (Visible to All Users)' : 'INACTIVE (Off)'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                This banner shows at the top of every storefront page. Include custom announcement text and your Play Store download link.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSaveAnnouncement} className="mt-5 space-y-4">
                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl">
                        <div>
                            <span className="text-sm font-bold text-rose-900 block">Turn Banner ON for All Users</span>
                            <span className="text-xs text-rose-700">When enabled, every visitor will see this banner at the top of the app.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={announcementState.enabled} 
                                onChange={e => setAnnouncementState({ ...announcementState, enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Banner Text / Announcement Message"
                                placeholder="e.g. Download our official Android App from Google Play Store for exclusive 10% discount & live order tracking!"
                                value={announcementState.text}
                                onChange={e => setAnnouncementState({ ...announcementState, text: e.target.value })}
                            />
                        </div>

                        <div>
                            <Input
                                label="Play Store / App Download Link URL"
                                placeholder="https://play.google.com/store/apps/details?id=com.yourstore.app"
                                value={announcementState.linkUrl}
                                onChange={e => setAnnouncementState({ ...announcementState, linkUrl: e.target.value })}
                            />
                        </div>

                        <div>
                            <Input
                                label="Button Label (Optional)"
                                placeholder="Get on Play Store"
                                value={announcementState.buttonText || ''}
                                onChange={e => setAnnouncementState({ ...announcementState, buttonText: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Live Preview Box */}
                    <div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Live Visitor Preview:</span>
                        <div className="w-full bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 text-white py-2 px-3 sm:px-4 rounded-xl shadow-xs border border-rose-800/30 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 truncate">
                                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                    <Icons.sparkles className="w-2.5 h-2.5 text-amber-200" />
                                </div>
                                <span className="truncate font-medium">
                                    {announcementState.text || 'Download our app for an enhanced shopping experience!'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="bg-white text-rose-700 font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-full shadow-2xs">
                                    {announcementState.buttonText || 'Get on Play Store'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        {announcementSuccess ? (
                            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                <Icons.check className="w-4 h-4" /> Announcement Banner updated successfully!
                            </span>
                        ) : <span />}

                        <Button type="submit" disabled={isSavingAnnouncement}>
                            {isSavingAnnouncement ? <Spinner size="sm" /> : 'Save Announcement Banner'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* SECTION 2: Promotional Popup Modal Banner */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-rose-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xs">
                            <Icons.image className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-800">Promotional Popup Modal Banner</h2>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    popupState.enabled && popupState.imageUrl ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {popupState.enabled && popupState.imageUrl ? 'ACTIVE (Visible to Visitors)' : 'INACTIVE (Off)'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                This popup appears on the visitor's screen with a smooth backdrop. Only your official admin popup will appear (no vendor banners).
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSavePopup} className="mt-5 space-y-4">
                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                        <div>
                            <span className="text-sm font-bold text-slate-900 block">Turn Popup Banner ON / OFF</span>
                            <span className="text-xs text-slate-600">When enabled, visitors will see this special offer dialog on visiting the store.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={popupState.enabled} 
                                onChange={e => setPopupState({ ...popupState, enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Popup Banner Image
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <div className="flex-1 w-full space-y-2">
                                    <Input
                                        placeholder="https://example.com/popup-banner.jpg or upload below"
                                        value={popupState.imageUrl}
                                        onChange={e => setPopupState({ ...popupState, imageUrl: e.target.value })}
                                    />
                                    <div>
                                        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border transition-colors">
                                            <Icons.upload className="w-3.5 h-3.5" />
                                            <span>Upload New Image</span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handlePopupUpload}
                                                className="hidden"
                                                disabled={isUploadingPopup}
                                            />
                                        </label>
                                        {isUploadingPopup && <span className="ml-2 text-xs text-amber-600 font-medium">Uploading image...</span>}
                                        {popupUploadError && <span className="ml-2 text-xs text-red-500">{popupUploadError}</span>}
                                    </div>
                                </div>

                                {popupState.imageUrl && (
                                    <div className="w-32 aspect-video bg-white rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-xs">
                                        <MediaPreview src={popupState.imageUrl} className="w-full h-full object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <Input
                                label="Offer / Banner Title (Optional)"
                                placeholder="e.g. Mega Summer Flash Sale"
                                value={popupState.title}
                                onChange={e => setPopupState({ ...popupState, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <Input
                                label="Target Redirect Link URL (Optional)"
                                placeholder="https://yourstore.com/#/category/women or #/store/c/sale"
                                value={popupState.redirectUrl}
                                onChange={e => setPopupState({ ...popupState, redirectUrl: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        {popupSuccess ? (
                            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                <Icons.check className="w-4 h-4" /> Promotional Popup Banner updated successfully!
                            </span>
                        ) : <span />}

                        <Button type="submit" disabled={isSavingPopup || isUploadingPopup}>
                            {isSavingPopup ? <Spinner size="sm" /> : 'Save Popup Banner'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* SECTION 3: Banner Section Featured Products (Home vs Category Placement) */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-rose-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-800">Featured Products in Banner Section</h2>
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                                {bannerProductsList.length} Products
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Add products into the banner section. Choose whether each product appears on the <strong>Home Banner</strong> or on a specific <strong>Category Banner</strong>.
                        </p>
                    </div>

                    <Button 
                        onClick={() => {
                            setSelectedBannerProduct(null);
                            setIsProductModalOpen(true);
                        }} 
                        size="sm"
                    >
                        <Icons.plus className="w-4 h-4 mr-1.5" /> Add Product to Banner
                    </Button>
                </div>

                {/* Banner Products Table */}
                <div className="mt-4 overflow-x-auto">
                    {bannerProductsList.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                            <Icons.package className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm font-semibold text-gray-600">No products added to banner section yet</p>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-3">
                                Click "Add Product to Banner" to select a product and choose whether it appears on the Home banner or in a Category banner.
                            </p>
                            <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => {
                                    setSelectedBannerProduct(null);
                                    setIsProductModalOpen(true);
                                }}
                            >
                                + Add First Banner Product
                            </Button>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b">
                                <tr>
                                    <th className="p-3">Product</th>
                                    <th className="p-3">Banner Placement</th>
                                    <th className="p-3">Price & Discount</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                                {bannerProductsList.map(item => {
                                    const prod = products.find(p => p.id === item.productId);
                                    const placementName = item.placement === 'home' 
                                        ? '🏠 Home Banner' 
                                        : `📂 Category: ${categoryMap[item.placement] || item.placement}`;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border shrink-0">
                                                        <MediaPreview src={prod?.images?.[0]} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-slate-900 block truncate max-w-[180px] sm:max-w-xs">
                                                            {prod?.name || item.productId}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 block truncate">
                                                            {prod?.category || 'Unknown category'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                    item.placement === 'home' 
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                }`}>
                                                    {placementName}
                                                </span>
                                            </td>

                                            <td className="p-3">
                                                {prod ? (
                                                    <div>
                                                        <span className="font-bold text-rose-700 block">
                                                            {formatCurrency(prod.price)}
                                                        </span>
                                                        {item.customDiscountBadge ? (
                                                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                                                                {item.customDiscountBadge}
                                                            </span>
                                                        ) : (
                                                            prod.oldPrice && prod.oldPrice > prod.price ? (
                                                                <span className="text-[10px] text-slate-400 line-through block">
                                                                    {formatCurrency(prod.oldPrice)} (-{Math.round(((prod.oldPrice - prod.price) / prod.oldPrice) * 100)}%)
                                                                </span>
                                                            ) : null
                                                        )}
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>

                                            <td className="p-3">
                                                <button
                                                    onClick={() => handleToggleBannerProductActive(item)}
                                                    className={`px-2 py-0.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${
                                                        item.isActive !== false 
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {item.isActive !== false ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>

                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedBannerProduct(item);
                                                            setIsProductModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit placement / discount"
                                                    >
                                                        <Icons.edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteBannerProduct(item.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remove from banner"
                                                    >
                                                        <Icons.trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* SECTION 3: Image / Video Slider Banners */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-rose-100">
                <div className="flex justify-between items-center pb-4 border-b border-rose-100 mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Slider Hero Banners (Images / Videos)</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Upload high-definition banner slides or background videos for the store hero carousel.
                        </p>
                    </div>
                    <Button onClick={() => openSliderModal()} size="sm">
                        <Icons.plus className="w-4 h-4 mr-1.5" /> Add Slider Banner
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b">
                            <tr>
                                <th className="p-3">Banner Media</th>
                                <th className="p-3">Redirect URL</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                            {isLoading && banners.length === 0 ? (
                                <tr><td colSpan={4} className="text-center p-8"><Spinner/></td></tr>
                            ) : banners.map(banner => (
                                <tr key={banner.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="p-3">
                                        <div className="w-28 sm:w-36 aspect-video rounded-lg overflow-hidden bg-slate-900 border">
                                            <MediaPreview src={banner.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    </td>
                                    <td className="p-3 text-gray-600 max-w-xs truncate">
                                        {banner.redirectUrl ? (
                                            <a href={banner.redirectUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-rose-600 font-medium">
                                                {banner.redirectUrl}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">Not set</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <button 
                                            onClick={() => toggleBannerActive(banner)} 
                                            className={`px-2 py-0.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${
                                                banner.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {banner.isActive ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openSliderModal(banner)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Banner">
                                                <Icons.edit className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleDeleteBanner(banner)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Banner">
                                                <Icons.trash className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {banners.length === 0 && !isLoading && (
                        <p className="text-center p-8 text-gray-500 text-xs">No hero slider banners found. Click 'Add Slider Banner' to upload one.</p>
                    )}
                </div>
            </div>

            {/* Modals */}
            <BannerModal isOpen={isSliderModalOpen} onClose={() => setIsSliderModalOpen(false)} banner={selectedBanner} />
            <BannerProductModal 
                isOpen={isProductModalOpen} 
                onClose={() => setIsProductModalOpen(false)} 
                initialItem={selectedBannerProduct}
                onSave={handleSaveBannerProduct}
            />
        </div>
    );
};

export default ManageBanners;
