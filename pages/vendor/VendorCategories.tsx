import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { Category } from '../../types';
import { safeLower } from '../../utils/helpers';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { EditCategoryModal } from '../../components/admin/EditCategoryModal';

const VendorCategories = () => {
    const { userData } = useAuth();
    const { settings, addCategory, deleteCategory, updateCategory, isLoading, allProducts, uploadFile } = useStore();
    
    const [newCategoryName, setNewCategoryName] = useState('');
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
    const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null);
    const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
    
    // Banner images state
    const [bannerInputMode, setBannerInputMode] = useState<'upload' | 'url'>('upload');
    const [newCategoryBannerUrls, setNewCategoryBannerUrls] = useState<string[]>([]);
    const [newBannerUrlInput, setNewBannerUrlInput] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [copiedUrl, setCopiedUrl] = useState(false);

    // Vendor's categories
    const vendorCategories = useMemo(() => {
        if (!userData?.uid) return [];
        return (settings?.categories || []).filter(c => c && c.vendorId === userData.uid);
    }, [settings?.categories, userData?.uid]);

    // Product counts for this vendor's categories
    const productCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        const vendorProducts = (allProducts || []).filter(p => p.vendorId === userData?.uid);
        
        vendorProducts.forEach(p => {
            counts[p.category] = (counts[p.category] || 0) + 1;
        });

        const finalCounts: Record<string, number> = {};
        vendorCategories.forEach(cat => {
            finalCounts[cat.id] = counts[cat.name] || counts[cat.id] || 0;
        });

        return finalCounts;
    }, [allProducts, vendorCategories, userData?.uid]);

    const handleAddBannerUrl = () => {
        if (newBannerUrlInput.trim()) {
            setNewCategoryBannerUrls(prev => [...prev, newBannerUrlInput.trim()]);
            setNewBannerUrlInput('');
        }
    };

    const handleBannerUpload = async (file: File) => {
        try {
            const url = await uploadFile(file);
            setNewCategoryBannerUrls(prev => [...prev, url]);
        } catch (error) {
            console.error("Banner upload failed", error);
            alert("Banner upload failed");
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim() || !userData?.uid) return;
        setIsSubmitting(true);
        try {
            let imageUrl: string | undefined = undefined;
            if (imageInputMode === 'upload' && newCategoryImageFile) {
                imageUrl = await uploadFile(newCategoryImageFile);
            } else if (imageInputMode === 'url' && newCategoryImageUrl.trim()) {
                imageUrl = newCategoryImageUrl.trim();
            }

            // Vendor categories are always direct top-level categories (no parent category)
            await addCategory(newCategoryName.trim(), null, imageUrl, newCategoryBannerUrls, userData.uid);
            
            setNewCategoryName('');
            setNewCategoryImageFile(null);
            setNewCategoryImageUrl('');
            setNewCategoryBannerUrls([]);
            setNewBannerUrlInput('');
        } catch (error) {
            console.error("Failed to add category", error);
            alert("Failed to add category");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setIsEditModalOpen(true);
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
                    <h1 className="text-2xl font-bold text-slate-800 font-serif">Store Categories & Banners</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Create custom categories for your store and assign products directly to them.
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

            {/* Add New Category Form */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                        <Icons.plus className="w-5 h-5" />
                    </div>
                    <span>Add New Category</span>
                </h2>

                <form onSubmit={handleAddCategory} className="space-y-4">
                    <div>
                        <Input 
                            label="Category Name" 
                            placeholder="e.g. Summer Lawn, Unstitched, Party Wear, Perfumes, Footwear" 
                            value={newCategoryName} 
                            onChange={e => setNewCategoryName(e.target.value)} 
                            required 
                        />
                    </div>

                    {/* Thumbnail Image */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Category Thumbnail (Icon / Card Cover)
                        </label>
                        <div className="flex gap-2 border-b border-slate-100 pb-2 mb-3">
                            <Button 
                                type="button" 
                                size="xs" 
                                variant={imageInputMode === 'upload' ? 'primary' : 'secondary'} 
                                onClick={() => setImageInputMode('upload')}
                            >
                                Upload Image
                            </Button>
                            <Button 
                                type="button" 
                                size="xs" 
                                variant={imageInputMode === 'url' ? 'primary' : 'secondary'} 
                                onClick={() => setImageInputMode('url')}
                            >
                                Paste Image URL
                            </Button>
                        </div>
                        {imageInputMode === 'upload' ? (
                            <Input 
                                key="cat-img-file"
                                type="file" 
                                accept="image/*" 
                                onChange={e => setNewCategoryImageFile(e.target.files ? e.target.files[0] : null)} 
                            />
                        ) : (
                            <Input 
                                key="cat-img-url"
                                type="url" 
                                placeholder="https://example.com/thumbnail.png" 
                                value={newCategoryImageUrl} 
                                onChange={e => setNewCategoryImageUrl(e.target.value)} 
                            />
                        )}
                    </div>

                    {/* Category Promotional Banners */}
                    <div className="pt-2 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-800 mb-1">
                            Category Banners (16:9 Aspect Ratio)
                        </label>
                        <p className="text-xs text-slate-500 mb-3">
                            Add one or more top promotional banners that will be showcased when customers browse this category on your store.
                        </p>
                        
                        <div className="flex gap-2 border-b border-slate-100 pb-2 mb-3">
                            <Button 
                                type="button" 
                                size="xs" 
                                variant={bannerInputMode === 'upload' ? 'primary' : 'secondary'} 
                                onClick={() => setBannerInputMode('upload')}
                            >
                                Upload Banners
                            </Button>
                            <Button 
                                type="button" 
                                size="xs" 
                                variant={bannerInputMode === 'url' ? 'primary' : 'secondary'} 
                                onClick={() => setBannerInputMode('url')}
                            >
                                Add Banner URL
                            </Button>
                        </div>

                        {bannerInputMode === 'upload' ? (
                            <Input 
                                key="cat-banner-file"
                                type="file" 
                                accept="image/*" 
                                multiple 
                                onChange={e => { 
                                    if (e.target.files) {
                                        Array.from(e.target.files).forEach(handleBannerUpload);
                                    }
                                }} 
                            />
                        ) : (
                            <div className="flex gap-2">
                                <Input 
                                    key="cat-banner-url"
                                    type="url" 
                                    placeholder="https://example.com/banner.png" 
                                    value={newBannerUrlInput} 
                                    onChange={e => setNewBannerUrlInput(e.target.value)} 
                                />
                                <Button type="button" onClick={handleAddBannerUrl}>
                                    Add Banner
                                </Button>
                            </div>
                        )}

                        {newCategoryBannerUrls.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {newCategoryBannerUrls.map((url, i) => (
                                    <div key={i} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[16/9] group bg-slate-900">
                                        <ImageWithFallback src={url} className="w-full h-full object-cover" />
                                        <Button 
                                            type="button" 
                                            variant="danger" 
                                            size="xs" 
                                            className="absolute top-1.5 right-1.5 shadow-md" 
                                            onClick={() => setNewCategoryBannerUrls(p => p.filter((_, idx) => idx !== i))}
                                        >
                                            <Icons.trash className="w-3.5 h-3.5"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <Button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white font-bold py-2.5 px-6 rounded-xl border-none shadow-md shadow-rose-200"
                        >
                            {isSubmitting ? <Spinner size="sm" /> : 'Create Category'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* List of Existing Categories */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-slate-800">
                        My Categories ({vendorCategories.length})
                    </h2>
                    <div className="w-full sm:w-64">
                        <Input 
                            placeholder="Search categories..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div>

                {isLoading && vendorCategories.length === 0 ? (
                    <div className="text-center py-10"><Spinner /></div>
                ) : vendorCategories.length > 0 ? (
                    <div className="space-y-3">
                        {vendorCategories
                            .filter(c => safeLower(c.name).includes(safeLower(searchTerm)))
                            .map(category => {
                                const count = productCounts[category.id] || 0;
                                const parentCat = vendorCategories.find(c => c.id === category.parentId);
                                const bannerCount = category.bannerImageUrls?.length || 0;

                                return (
                                    <div key={category.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 hover:bg-slate-100/80 p-4 rounded-xl gap-3 border border-slate-200/70 transition-all">
                                        <div className="flex items-center gap-3.5 flex-grow min-w-0">
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300/50 shadow-2xs">
                                                <ImageWithFallback src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 truncate text-sm sm:text-base">
                                                        {category.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                    <span>{count} Products</span>
                                                    <span>•</span>
                                                    <span className={bannerCount > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                                                        {bannerCount} {bannerCount === 1 ? 'Banner' : 'Banners'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                                            <div className="flex items-center gap-1.5 mr-2">
                                                <span className="text-xs text-slate-500">Visible</span>
                                                <button 
                                                    onClick={() => updateCategory(category.id, { isVisible: !category.isVisible })} 
                                                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${category.isVisible ? 'bg-emerald-600' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${category.isVisible ? 'translate-x-5' : 'translate-x-1'}`} />
                                                </button>
                                            </div>

                                            <Button variant="secondary" size="xs" onClick={() => openEditModal(category)}>
                                                <Icons.edit className="w-3.5 h-3.5 mr-1"/> Edit / Banners
                                            </Button>

                                            <Button variant="danger" size="xs" onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete category "${category.name}"?`)) {
                                                    deleteCategory(category.id);
                                                }
                                            }}>
                                                <Icons.trash className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8">
                        <Icons.category className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <h3 className="text-base font-bold text-slate-700">No Categories Created Yet</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            Create categories with thumbnail icons and banners above to organize your standalone store catalog.
                        </p>
                    </div>
                )}
            </div>

            {/* Edit Category Modal */}
            <EditCategoryModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                category={editingCategory} 
                onSave={updateCategory} 
            />
        </div>
    );
};

export default VendorCategories;
