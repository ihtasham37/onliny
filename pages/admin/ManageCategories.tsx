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
    const { settings, addCategory, deleteCategory, updateCategory, isLoading, products, uploadFile } = useStore();
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

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Manage Categories</h1>
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
                <h2 className="text-xl font-bold mb-3">Existing Parent Categories</h2>
                <div className="mb-4"><Input placeholder="Search categories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                {isLoading && categories.length === 0 ? <div className="text-center py-8"><Spinner /></div> : topLevelCategories.length > 0 ? (
                    <div className="space-y-2">
                        {topLevelCategories.map(category => (
                            <div key={category.id} className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-3 rounded-md gap-3">
                                <div className="flex items-center gap-4 flex-grow">
                                    <ImageWithFallback src={category.imageUrl} alt={category.name} className="w-12 h-12 rounded-md object-cover"/>
                                    <div>
                                        <span className="font-medium text-gray-800">{category.name}</span>
                                        <span className="ml-3 text-sm text-gray-500 block">({productCounts[category.id] || 0} products)</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
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
