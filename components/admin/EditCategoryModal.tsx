import React, { useState, useEffect, useMemo } from 'react';
import { Category } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { useStore } from '../../hooks/useStore';
import { MediaPreview } from '../ui/MediaPreview';
import { Icons } from '../icons/Icons';
import { safeJsonStringify } from '../../utils/helpers';

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onSave: (id: string, newData: Partial<Omit<Category, 'id'>>) => Promise<void>;
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({ isOpen, onClose, category, onSave }) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  
  // State for multiple banners
  const [bannerInputMode, setBannerInputMode] = useState<'upload' | 'url'>('upload');
  const [bannerImageUrls, setBannerImageUrls] = useState<string[]>([]);
  const [newBannerUrlInput, setNewBannerUrlInput] = useState('');

  // State for standalone branding
  const [storeName, setStoreName] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeLogoFile, setStoreLogoFile] = useState<File | null>(null);
  const [storeLogoMode, setStoreLogoMode] = useState<'upload' | 'url'>('upload');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadFile, settings } = useStore();

  useEffect(() => {
    if (category) {
      setName(category.name);
      setParentId(category.parentId);
      setImageUrl(category.imageUrl || '');
      setBannerImageUrls(category.bannerImageUrls || []);
      setStoreName(category.storeName || '');
      setStoreLogoUrl(category.storeLogoUrl || '');
      setImageFile(null);
      setStoreLogoFile(null);
      setNewBannerUrlInput('');
    }
  }, [category, isOpen]);

  const availableParents = useMemo(() => {
    if (!settings?.categories || !category) return [];
    const descendantIds = new Set<string>();
    const queue = [category.id];
    descendantIds.add(category.id);
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = settings.categories.filter(c => c.parentId === currentId);
        for (const child of children) {
            descendantIds.add(child.id);
            queue.push(child.id);
        }
    }
    return settings.categories.filter(c => !descendantIds.has(c.id));
  }, [settings, category]);

  if (!isOpen || !category) return null;

  const handleAddBannerUrl = () => {
    if (newBannerUrlInput.trim()) {
        setBannerImageUrls(prev => [...prev, newBannerUrlInput.trim()]);
        setNewBannerUrlInput('');
    }
  };

  const handleBannerUpload = async (file: File) => {
    try {
        const url = await uploadFile(file);
        setBannerImageUrls(prev => [...prev, url]);
    } catch (error) { console.error("Banner upload failed", error); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        let finalImageUrl = imageUrl;
        if (imageInputMode === 'upload' && imageFile) finalImageUrl = await uploadFile(imageFile);

        let finalStoreLogoUrl = storeLogoUrl;
        if (storeLogoMode === 'upload' && storeLogoFile) finalStoreLogoUrl = await uploadFile(storeLogoFile);
        
        const newData: Partial<Omit<Category, 'id'>> = {};
        if (name.trim() && name.trim() !== category.name) newData.name = name.trim();
        if (parentId !== category.parentId) newData.parentId = parentId;
        if (finalImageUrl !== (category.imageUrl || '')) newData.imageUrl = finalImageUrl;
        if (storeName.trim() !== (category.storeName || '')) newData.storeName = storeName.trim() || undefined;
        if (finalStoreLogoUrl !== (category.storeLogoUrl || '')) newData.storeLogoUrl = finalStoreLogoUrl || undefined;
        
        // Compare stringified arrays to check for changes in banners
        if (safeJsonStringify(bannerImageUrls) !== safeJsonStringify(category.bannerImageUrls || [])) {
            newData.bannerImageUrls = bannerImageUrls;
        }
        
        if (Object.keys(newData).length > 0) {
            await onSave(category.id, newData);
        }
    } catch (error) {
        console.error("Failed to update category:", error);
    } finally {
        setIsSubmitting(false);
        onClose();
    }
  };

  const previewSrc = imageFile ? URL.createObjectURL(imageFile) : imageUrl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Edit Category</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Category Name" value={name} onChange={(e) => setName(e.target.value)} required />
          
          {!category.vendorId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Parent Category</label>
              <select value={parentId || ''} onChange={e => setParentId(e.target.value || null)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-600 sm:text-sm">
                  <option value="">None (Top-level)</option>
                  {availableParents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon Image</label>
            <MediaPreview src={previewSrc} className="w-24 h-24 my-2" />
            <div className="flex gap-2 my-2 border-b pb-3"><Button type="button" size="sm" variant={imageInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('upload')}>Upload New</Button><Button type="button" size="sm" variant={imageInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('url')}>Change URL</Button></div>
            {imageInputMode === 'upload' ? <Input key="edit-cat-img-file" type="file" accept="image/*,video/*" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} /> : <Input key="edit-cat-img-url" type="url" placeholder="https://example.com/image.png" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Banner Media (16:9 Aspect Ratio)</label>
             <div className="flex gap-2 border-b pb-3 mb-3"><Button type="button" size="sm" variant={bannerInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setBannerInputMode('upload')}>Upload</Button><Button type="button" size="sm" variant={bannerInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setBannerInputMode('url')}>URL</Button></div>
              {bannerInputMode === 'upload' ? <Input key="edit-cat-banner-file" type="file" accept="image/*,video/*" multiple onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(handleBannerUpload) }} /> : <div className="flex gap-2"><Input key="edit-cat-banner-url" type="url" placeholder="https://example.com/banner.mp4" value={newBannerUrlInput} onChange={e => setNewBannerUrlInput(e.target.value)} /><Button type="button" onClick={handleAddBannerUrl}>Add</Button></div>}
              <div className="mt-2 grid grid-cols-3 gap-2">
                {bannerImageUrls.map((url, i) => <div key={i} className="relative"><MediaPreview src={url} className="w-full h-16" /><Button type="button" variant="danger" size="xs" className="absolute top-1 right-1" onClick={() => setBannerImageUrls(p => p.filter((_, idx) => idx !== i))}><Icons.trash className="w-3 h-3"/></Button></div>)}
              </div>
          </div>

          {/* Dedicated Storefront Branding (Admin platform categories only, not for vendor categories) */}
          {!category?.vendorId && (
            <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200/80 space-y-3">
              <span className="text-xs font-bold text-rose-900 block">
                🎨 Dedicated Standalone Storefront Branding
              </span>
              <Input
                label="Custom Store Name (Standalone Website)"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={`Default: ${name || 'Category Name'}`}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Custom Storefront Logo
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-rose-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                    {storeLogoFile ? (
                      <img src={URL.createObjectURL(storeLogoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : storeLogoUrl ? (
                      <img src={storeLogoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Icons.image className="w-5 h-5 text-rose-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-1.5 mb-1.5">
                      <Button type="button" size="xs" variant={storeLogoMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setStoreLogoMode('upload')}>Upload</Button>
                      <Button type="button" size="xs" variant={storeLogoMode === 'url' ? 'primary' : 'secondary'} onClick={() => setStoreLogoMode('url')}>URL</Button>
                      {storeLogoUrl && (
                        <button type="button" onClick={() => { setStoreLogoUrl(''); setStoreLogoFile(null); }} className="text-[10px] text-rose-600 hover:underline ml-auto">
                          Remove
                        </button>
                      )}
                    </div>
                    {storeLogoMode === 'upload' ? (
                      <input type="file" accept="image/*" onChange={e => setStoreLogoFile(e.target.files ? e.target.files[0] : null)} className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-600 file:text-white cursor-pointer w-full" />
                    ) : (
                      <Input type="url" placeholder="https://example.com/logo.png" value={storeLogoUrl} onChange={e => setStoreLogoUrl(e.target.value)} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-4 pt-6 mt-4 border-t">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" /> : 'Save Changes'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};