import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { Category } from '../../types';
import { safeLower, matchCategory } from '../../utils/helpers';
import { EditCategoryModal } from '../../components/admin/EditCategoryModal';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { MoveCopyCategoryModal } from '../../components/admin/MoveCopyCategoryModal';
import { StandaloneLinkModal } from '../../components/admin/StandaloneLinkModal';

const ManageCategories = () => {
    const { settings, addCategory, deleteCategory, updateCategory, updateSettings, isLoading, products, uploadFile } = useStore();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
    const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null);
    const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
    
    // State for multiple banners
    const [bannerInputMode, setBannerInputMode] = useState<'upload' | 'url'>('upload');
    const [newCategoryBannerUrls, setNewCategoryBannerUrls] = useState<string[]>([]);
    const [newBannerUrlInput, setNewBannerUrlInput] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isMoveCopyModalOpen, setIsMoveCopyModalOpen] = useState(false);
    const [categoryToMoveCopy, setCategoryToMoveCopy] = useState<Category | null>(null);
    const [isStandaloneModalOpen, setIsStandaloneModalOpen] = useState(false);
    const [standaloneCategoryTarget, setStandaloneCategoryTarget] = useState<Category | null>(null);
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
    const [reorderList, setReorderList] = useState<Category[]>([]);

    // Only manage platform/admin categories in Admin panel (strictly exclude vendor-owned categories)
    const categories = useMemo(() => (settings?.categories || []).filter(c => c && c.id && (!c.vendorId || c.vendorId === 'admin')), [settings]);

    const productCounts = useMemo(() => {
        const finalCounts: Record<string, number> = {};
        categories.forEach(cat => {
             const targetCategories: { id: string; name: string }[] = [cat];
             const queue = [cat.id];
             while(queue.length > 0) {
                 const curr = queue.shift()!;
                 const children = categories.filter(c => c.parentId === curr);
                 children.forEach(c => {
                     targetCategories.push(c);
                     queue.push(c.id);
                 });
             }
             
             finalCounts[cat.id] = products.filter(p => p.isVisible && targetCategories.some(target => matchCategory(p.category, target))).length;
        });
        
        return finalCounts;
    }, [products, categories]);

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
        } catch (error) { console.error("Banner upload failed", error); }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsSubmitting(true);
        try {
            let imageUrl: string | undefined = undefined;
            if (imageInputMode === 'upload' && newCategoryImageFile) imageUrl = await uploadFile(newCategoryImageFile);
            else if (imageInputMode === 'url' && newCategoryImageUrl.trim()) imageUrl = newCategoryImageUrl.trim();

            await addCategory(newCategoryName, null, imageUrl, newCategoryBannerUrls);
            setNewCategoryName(''); setNewCategoryImageFile(null); setNewCategoryImageUrl('');
            setNewCategoryBannerUrls([]); setNewBannerUrlInput('');
        } catch (error) {
            console.error("Failed to add category", error);
        } finally { setIsSubmitting(false); }
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setIsEditModalOpen(true);
    };

    const openMoveCopyModal = (category: Category) => {
        setCategoryToMoveCopy(category);
        setIsMoveCopyModalOpen(true);
    };
    
    const topLevelCategories = useMemo(() => {
        const lowerSearch = safeLower(searchTerm);
        return categories.filter(c => !c.parentId && safeLower(c.name).includes(lowerSearch));
    }, [categories, searchTerm]);

    // Handle Moving Category Position Up/Down
    const handleMoveOrder = async (categoryId: string, direction: 'up' | 'down') => {
        if (!settings?.categories) return;
        const allCats = [...settings.categories];
        const topCats = allCats.filter(c => !c.parentId && (!c.vendorId || c.vendorId === 'admin'));
        const index = topCats.findIndex(c => c.id === categoryId);
        if (index === -1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= topCats.length) return;

        const itemA = topCats[index];
        const itemB = topCats[targetIndex];

        const realIndexA = allCats.findIndex(c => c.id === itemA.id);
        const realIndexB = allCats.findIndex(c => c.id === itemB.id);

        if (realIndexA !== -1 && realIndexB !== -1) {
            allCats[realIndexA] = itemB;
            allCats[realIndexB] = itemA;
            await updateSettings({ ...settings, categories: allCats });
        }
    };

    const openReorderModal = () => {
        const topCats = (settings?.categories || []).filter(c => !c.parentId && (!c.vendorId || c.vendorId === 'admin'));
        setReorderList([...topCats]);
        setIsReorderModalOpen(true);
    };

    const moveReorderItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= reorderList.length) return;
        const updated = [...reorderList];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;
        setReorderList(updated);
    };

    const saveReorderedList = async () => {
        if (!settings?.categories) return;
        const allCats = [...settings.categories];
        const subAndVendorCats = allCats.filter(c => c.parentId || (c.vendorId && c.vendorId !== 'admin'));
        
        // Combine reordered top categories with their subcategories
        const finalCategories: Category[] = [...reorderList, ...subAndVendorCats];
        await updateSettings({ ...settings, categories: finalCategories });
        setIsReorderModalOpen(false);
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Manage Categories</h1>
                <Button 
                    type="button" 
                    variant="primary" 
                    onClick={openReorderModal}
                    className="inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                    <Icons.list className="w-4 h-4" />
                    <span>Reorder Collections (ترتیب تبدیل کریں)</span>
                </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border-t-4 border-teal-500">
                <h2 className="text-xl font-bold mb-3">Add New Parent Category</h2>
                <form onSubmit={handleAddCategory} className="space-y-3">
                    <Input label="Category Name" placeholder="e.g., Men's Fashion" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category Image (Optional)</label>
                        <div className="flex gap-2 border-b pb-3 mb-3"><Button type="button" size="sm" variant={imageInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('upload')}>Upload</Button><Button type="button" size="sm" variant={imageInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('url')}>URL</Button></div>
                        {imageInputMode === 'upload' ? <Input key="admin-cat-img-file" type="file" accept="image/*" onChange={e => setNewCategoryImageFile(e.target.files ? e.target.files[0] : null)} /> : <Input key="admin-cat-img-url" type="url" placeholder="https://example.com/image.png" value={newCategoryImageUrl} onChange={e => setNewCategoryImageUrl(e.target.value)} />}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Banner Images (Optional - 16:9 Aspect Ratio)</label>
                        <div className="flex gap-2 border-b pb-3 mb-3"><Button type="button" size="sm" variant={bannerInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setBannerInputMode('upload')}>Upload</Button><Button type="button" size="sm" variant={bannerInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setBannerInputMode('url')}>URL</Button></div>
                        {bannerInputMode === 'upload' ? <Input key="admin-cat-banner-file" type="file" accept="image/*" multiple onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(handleBannerUpload) }} /> : <div className="flex gap-2"><Input key="admin-cat-banner-url" type="url" placeholder="https://example.com/banner.png" value={newBannerUrlInput} onChange={e => setNewBannerUrlInput(e.target.value)} /><Button type="button" onClick={handleAddBannerUrl}>Add</Button></div>}
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {newCategoryBannerUrls.map((url, i) => <div key={i} className="relative"><ImageWithFallback src={url} className="w-full h-16 object-cover rounded" /><Button type="button" variant="danger" size="xs" className="absolute top-1 right-1" onClick={() => setNewCategoryBannerUrls(p => p.filter((_, idx) => idx !== i))}><Icons.trash className="w-3 h-3"/></Button></div>)}
                        </div>
                    </div>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" /> : 'Create Category'}</Button>
                </form>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                    <h2 className="text-xl font-bold">Existing Parent Categories</h2>
                    <span className="text-xs text-slate-500">Use (↑ / ↓) to arrange order on Collection page</span>
                </div>

                <div className="mb-4"><Input placeholder="Search categories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                
                {isLoading && categories.length === 0 ? <div className="text-center py-8"><Spinner /></div> : topLevelCategories.length > 0 ? (
                    <div className="space-y-2">
                        {topLevelCategories.map((category, idx) => (
                            <div key={category.id} className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 hover:bg-slate-100/80 transition-colors p-3 rounded-md gap-3 border border-slate-200/70">
                                <div className="flex items-center gap-3 sm:gap-4 flex-grow w-full sm:w-auto">
                                    {/* Order Position Badge & Up/Down Arrows */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                                            {idx + 1}
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                type="button"
                                                disabled={idx === 0}
                                                onClick={() => handleMoveOrder(category.id, 'up')}
                                                className="p-1 rounded bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-700 border border-slate-200 cursor-pointer text-xs"
                                                title="Move Up on Collection Page"
                                            >
                                                <Icons.chevronUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={idx === topLevelCategories.length - 1}
                                                onClick={() => handleMoveOrder(category.id, 'down')}
                                                className="p-1 rounded bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-700 border border-slate-200 cursor-pointer text-xs"
                                                title="Move Down on Collection Page"
                                            >
                                                <Icons.chevronDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <ImageWithFallback src={category.imageUrl} alt={category.name} className="w-12 h-12 rounded-full object-cover border border-rose-200 shrink-0"/>
                                    <div className="min-w-0">
                                        <span className="font-bold text-gray-800 block truncate">{category.name}</span>
                                        <span className="text-xs text-gray-500 block">({productCounts[category.id] || 0} products)</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto justify-end">
                                    {/* Standalone Website Link Generator */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStandaloneCategoryTarget(category);
                                            setIsStandaloneModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                                        title="Generate Standalone Website Link for this category"
                                    >
                                        <Icons.externalLink className="w-3.5 h-3.5" />
                                        <span>Standalone Link</span>
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-500">Visible</span>
                                        <button onClick={() => updateCategory(category.id, { isVisible: !category.isVisible })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${category.isVisible ? 'bg-teal-600' : 'bg-gray-200'}`}>
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${category.isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <Link to={`/admin/categories/${encodeURIComponent(category.id)}`}><Button variant="outline" size="sm">Manage</Button></Link>
                                    <Button variant="secondary" size="sm" onClick={() => openMoveCopyModal(category)}><Icons.copy className="w-4 h-4" /></Button>
                                    <Button variant="secondary" size="sm" onClick={() => openEditModal(category)}><Icons.edit className="w-4 h-4"/></Button>
                                    <Button variant="danger" size="sm" onClick={() => deleteCategory(category.id)}><Icons.trash className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-center py-8 text-gray-500">No top-level categories found.</p>}
            </div>

            {/* Reorder Categories Modal */}
            {isReorderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Custom Category Order (ترتیب بدلیں)</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Arrange the order how categories appear on Collections & Home page</p>
                            </div>
                            <button 
                                onClick={() => setIsReorderModalOpen(false)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                            >
                                <Icons.x className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 space-y-2">
                            {reorderList.map((cat, index) => (
                                <div 
                                    key={cat.id} 
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                            {index + 1}
                                        </span>
                                        <ImageWithFallback src={cat.imageUrl} alt={cat.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                                        <span className="font-bold text-sm text-slate-800 truncate">{cat.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => moveReorderItem(index, 'up')}
                                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 disabled:opacity-30 border border-slate-200 cursor-pointer"
                                            title="Move Up"
                                        >
                                            <Icons.chevronUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={index === reorderList.length - 1}
                                            onClick={() => moveReorderItem(index, 'down')}
                                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 disabled:opacity-30 border border-slate-200 cursor-pointer"
                                            title="Move Down"
                                        >
                                            <Icons.chevronDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsReorderModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={saveReorderedList}>
                                Save Order (ترتیب محفوظ کریں)
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <EditCategoryModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} category={editingCategory} onSave={updateCategory} />
            <MoveCopyCategoryModal isOpen={isMoveCopyModalOpen} onClose={() => setIsMoveCopyModalOpen(false)} category={categoryToMoveCopy} />
            <StandaloneLinkModal 
                isOpen={isStandaloneModalOpen} 
                onClose={() => setIsStandaloneModalOpen(false)} 
                category={standaloneCategoryTarget} 
                productCount={standaloneCategoryTarget ? (productCounts[standaloneCategoryTarget.id] || 0) : 0} 
            />
        </div>
    );
};

export default ManageCategories;
