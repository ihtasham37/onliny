import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { useAuth } from '../../hooks/useAuth';
import { Product, SizeCategory, Category, UserRole } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Spinner } from '../ui/Spinner';
import { Icons } from '../icons/Icons';
import { MediaPreview } from '../ui/MediaPreview';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categoryLock?: string;
}

// Helper to build a flat list of categories with indentation for the dropdown
const getCategoryOptions = (categories: Category[]): { id: string, name: string }[] => {
    type CategoryNode = Category & { children: CategoryNode[] };
    const categoryMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];
    const options: { id: string, name: string }[] = [];

    categories.forEach(c => categoryMap.set(c.id, { ...c, children: [] }));
    categories.forEach(c => {
        if (c.parentId && categoryMap.has(c.parentId)) categoryMap.get(c.parentId)?.children.push(categoryMap.get(c.id)!);
        else roots.push(categoryMap.get(c.id)!);
    });

    const traverse = (node: CategoryNode, depth: number) => {
        options.push({ id: node.name, name: `${'— '.repeat(depth)}${node.name}` });
        node.children.forEach(child => traverse(child, depth + 1));
    };
    roots.forEach(root => traverse(root, 0));
    return options;
};

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, categoryLock }) => {
  const { addProduct, updateProduct, uploadFile, settings } = useStore();
  const { userData } = useAuth();
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt'>>({ name: '', customId: '', description: '', price: 0, oldPrice: 0, category: '', images: [], isVisible: true, sizeCategories: [], deliveryTime: 'Delivery in 3 Days', easyReturn: false, returnPolicy: '', shippingFee: 0, freeDelivery: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [newSizeInputs, setNewSizeInputs] = useState<Record<number, string>>({});
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // AI Assistant State
  const [aiInput, setAiInput] = useState('');
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showAiBox, setShowAiBox] = useState(true);

  const isVendor = userData?.role === UserRole.Vendor;
  const vendorId = userData?.uid;

  const categoryOptions = useMemo(() => {
    const allCats = (settings?.categories || []).filter(c => c && typeof c.name === 'string');
    
    // Vendor only sees their direct categories
    if (isVendor && vendorId) {
      return allCats
        .filter(c => c.vendorId === vendorId)
        .map(c => ({ id: c.name, name: c.name }));
    }

    // Admin mode: only allow selecting child categories if parent-child hierarchy exists
    const nonVendorCats = allCats.filter(c => !c.vendorId);
    const hasChildren = nonVendorCats.some(c => c.parentId);
    if (hasChildren) {
      const childCategoryNames = new Set(nonVendorCats.filter(c => c.parentId).map(c => c.name));
      return getCategoryOptions(nonVendorCats).filter(opt => childCategoryNames.has(opt.id));
    }
    return nonVendorCats.map(c => ({ id: c.name, name: c.name }));
  }, [settings?.categories, isVendor, vendorId]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name, customId: product.customId || '', description: product.description, price: product.price, oldPrice: product.oldPrice || 0,
        category: product.category, images: product.images, isVisible: product.isVisible, sizeCategories: product.sizeCategories || [],
        deliveryTime: product.deliveryTime || 'Delivery in 3 Days', easyReturn: product.easyReturn || false,
        returnPolicy: product.returnPolicy || '', shippingFee: product.shippingFee || 0, freeDelivery: product.freeDelivery || false
      });
    } else {
      setFormData({ 
          name: '', customId: '', description: '', price: 0, oldPrice: 0, 
          category: categoryLock || categoryOptions[0]?.id || '', 
          images: [], isVisible: true, sizeCategories: [], deliveryTime: 'Delivery in 3 Days', 
          easyReturn: false, returnPolicy: '', shippingFee: 0, freeDelivery: false 
      });
    }
    setUploadError(''); 
    setIsUploading(false); 
    setNewCategoryName(''); 
    setNewSizeInputs({});
    setAiInput('');
    setAiMessage(null);
    setAiStatus('idle');
  }, [product, isOpen, settings, categoryLock, categoryOptions]);

  const handleAiExtract = async () => {
    if (!aiInput.trim()) {
      setAiMessage('Please enter a product link or paste product description text.');
      setAiStatus('error');
      return;
    }

    setIsAiExtracting(true);
    setAiMessage(null);
    setAiStatus('idle');

    try {
      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: aiInput.trim(),
          preferredType: 'product_extraction'
        })
      });

      const res = await response.json();
      if (res && res.success && res.data) {
        const extracted = res.data.type === 'product_extraction' ? res.data.product : (res.data.product || res.data);
        if (extracted) {
          // Parse price
          let parsedPrice = formData.price;
          if (extracted.price !== null && extracted.price !== undefined) {
            const numStr = String(extracted.price).replace(/[^0-9.]/g, '');
            if (numStr) {
              const pVal = parseFloat(numStr);
              if (!isNaN(pVal)) parsedPrice = pVal;
            }
          }

          // Smart category matching
          let matchedCat = formData.category;
          if (!categoryLock && extracted.category && categoryOptions.length > 0) {
            const targetCat = String(extracted.category).toLowerCase();
            const found = categoryOptions.find(opt => {
              const optClean = opt.name.toLowerCase().replace(/—\s*/g, '');
              return optClean.includes(targetCat) || targetCat.includes(optClean) || targetCat.includes(opt.id.toLowerCase());
            });
            if (found) {
              matchedCat = found.id;
            }
          }

          // Image URLs
          const incomingImages: string[] = Array.isArray(extracted.image_urls)
            ? extracted.image_urls.filter((u: any) => typeof u === 'string' && u.trim().startsWith('http'))
            : [];

          // Size categories extraction
          let incomingSizeCategories: SizeCategory[] = formData.sizeCategories || [];
          if (Array.isArray(extracted.size_categories) && extracted.size_categories.length > 0) {
            incomingSizeCategories = extracted.size_categories.map((sc: any) => ({
              categoryName: sc.categoryName || 'Size',
              sizes: Array.isArray(sc.sizes) ? sc.sizes.map((s: any) => String(s).trim()).filter(Boolean) : []
            })).filter((sc: any) => sc.sizes.length > 0);
          } else if (Array.isArray(extracted.sizes) && extracted.sizes.length > 0) {
            incomingSizeCategories = [{
              categoryName: 'Size',
              sizes: extracted.sizes.map((s: any) => String(s).trim()).filter(Boolean)
            }];
          }

          if (incomingImages.length > 0) {
            setImageInputMode('url');
          }

          setFormData(prev => ({
            ...prev,
            name: extracted.title && !extracted.title.startsWith('http') ? extracted.title : prev.name,
            description: extracted.description && !extracted.description.startsWith('http') ? extracted.description : prev.description,
            price: parsedPrice,
            customId: extracted.sku || prev.customId || '',
            category: matchedCat || prev.category,
            sizeCategories: incomingSizeCategories.length > 0 ? incomingSizeCategories : prev.sizeCategories,
            shippingFee: extracted.shipping_fee !== undefined && extracted.shipping_fee !== null ? extracted.shipping_fee : prev.shippingFee,
            deliveryTime: extracted.delivery_time || prev.deliveryTime || 'Delivery in 3-5 Days',
            images: incomingImages.length > 0 
              ? [...new Set([...prev.images, ...incomingImages])] 
              : prev.images
          }));

          const totalSizes = incomingSizeCategories.reduce((acc, c) => acc + c.sizes.length, 0);
          setAiStatus('success');
          setAiMessage(`✨ Extracted "${extracted.title || 'Product'}" (${parsedPrice ? `PKR ${parsedPrice}` : ''}) successfully! ${totalSizes > 0 ? `${totalSizes} size(s) created.` : ''} ${incomingImages.length > 0 ? `${incomingImages.length} image(s) loaded.` : ''}`);
        } else {
          setAiStatus('error');
          setAiMessage('Could not extract complete details from this input. Please check the text or link.');
        }
      } else {
        setAiStatus('error');
        setAiMessage(res?.error || 'AI Assistant could not process this link. You can fill details manually.');
      }
    } catch (err: any) {
      console.error('AI Auto-Fill error:', err);
      setAiStatus('error');
      setAiMessage('Failed to connect to AI Assistant. Please check connection.');
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    else setFormData({ ...formData, [name]: type === 'number' ? parseFloat(value) : value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      setIsUploading(true); setUploadError('');
      try {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < e.target.files.length; i++) {
          const file = e.target.files[i];
          const url = await uploadFile(file);
          uploadedUrls.push(url);
        }
        setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls]}));
      } catch (err: any) { setUploadError(err.message || 'Upload error.'); } 
      finally { setIsUploading(false); }
  };

  const handleAddImageUrl = () => {
    if (imageUrl.trim()) {
        try { new URL(imageUrl.trim()); setFormData(prev => ({ ...prev, images: [...prev.images, imageUrl.trim()] })); setImageUrl(''); } 
        catch (_) { alert('Invalid URL.'); }
    }
  };

  const handleCreateAndAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName || formData.sizeCategories?.some(c => c.categoryName.toLowerCase() === trimmedName.toLowerCase())) {
        alert("Category name is empty or already exists."); return;
    }
    setFormData(prev => ({ ...prev, sizeCategories: [...(prev.sizeCategories || []), { categoryName: trimmedName, sizes: [] }] }));
    setNewCategoryName('');
  };

  const removeCategory = (i: number) => setFormData(prev => ({ ...prev, sizeCategories: (prev.sizeCategories || []).filter((_, idx) => idx !== i) }));
  const addSize = (i: number) => {
      const size = newSizeInputs[i]?.trim();
      if (size && formData.sizeCategories) {
          const newCats = formData.sizeCategories.map(c => ({...c, sizes: [...c.sizes]}));
          if (!newCats[i].sizes.includes(size)) {
              newCats[i].sizes.push(size);
              setFormData(prev => ({ ...prev, sizeCategories: newCats }));
              setNewSizeInputs(prev => ({ ...prev, [i]: '' }));
          }
      }
  };
  const removeSize = (catIdx: number, sizeIdx: number) => {
    if (!formData.sizeCategories) return;
    const newCats = formData.sizeCategories.map(c => ({...c, sizes: [...c.sizes]}));
    newCats[catIdx].sizes.splice(sizeIdx, 1);
    setFormData(prev => ({ ...prev, sizeCategories: newCats }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) { alert('Please select a category.'); return; }
    setIsSubmitting(true);
    try {
      if (product) await updateProduct({ ...formData, id: product.id, createdAt: product.createdAt });
      else await addProduct(formData);
      onClose();
    } catch (error) { console.error("Failed to save product", error); } 
    finally { setIsSubmitting(false); }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button 
            type="button" 
            onClick={() => setShowAiBox(!showAiBox)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow hover:opacity-90 transition-all flex items-center gap-1.5"
          >
            <span>✨</span> {showAiBox ? 'Hide AI Assistant' : '✨ Markaz AI Auto-Fill'}
          </button>
        </div>

        {/* Gemini E-Commerce AI Assistant (Type 1: Markaz Link & Product Extraction) */}
        {showAiBox && !product && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-pink-50/80 border-2 border-indigo-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <span className="font-bold text-sm text-indigo-900">Markaz & E-Commerce AI Assistant</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white">Gemini AI</span>
              </div>
            </div>
            
            <p className="text-xs text-indigo-800 mb-3">
              Paste any <strong>Markaz product link</strong>, <strong>website URL</strong>, or <strong>raw product text/description</strong>. Gemini will automatically extract title, price, description, category, and image URLs!
            </p>

            <div className="space-y-2">
              <textarea
                rows={2}
                placeholder="Paste Markaz app link (e.g. https://markaz.app/...) or product raw text here..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                disabled={isAiExtracting}
                className="w-full text-xs p-2.5 rounded-lg border border-indigo-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  {aiMessage && (
                    <div className={`text-xs px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 ${
                      aiStatus === 'success' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      <span>{aiStatus === 'success' ? '✅' : '⚠️'}</span>
                      <span className="truncate">{aiMessage}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={isAiExtracting || !aiInput.trim()}
                  onClick={handleAiExtract}
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow whitespace-nowrap"
                >
                  {isAiExtracting ? (
                    <span className="flex items-center gap-1.5">
                      <Spinner size="sm" /> Extracting Details...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span>✨</span> Auto-Fill with AI
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" name="name" value={formData.name} onChange={handleChange} required />
          <Input label="Custom Product ID (for Admin)" name="customId" value={formData.customId || ''} onChange={handleChange} placeholder="e.g., SKU-12345" />
          <Textarea label="Description" name="description" value={formData.description} onChange={handleChange} rows={3} required />
          <div className="grid grid-cols-2 gap-4"><Input label="Price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required /><Input label="Old Price (Optional)" name="oldPrice" type="number" step="0.01" value={formData.oldPrice} onChange={handleChange} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <select id="category" name="category" value={formData.category} onChange={handleChange} required disabled={!!categoryLock} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-600 sm:text-sm disabled:bg-gray-100">
                    <option value="">Select a Category</option>
                    {categoryOptions.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                {categoryOptions.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600 font-medium">
                    {isVendor 
                      ? 'No categories found. Please create a category in "Categories & Banners" first.'
                      : 'No categories found. Please create a category first.'}
                  </p>
                )}
            </div>
            <Input label="Shipping Fee" name="shippingFee" type="number" step="1" value={formData.shippingFee || 0} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size Categories</label>
            <div className="p-3 border rounded-md space-y-3">
              {(formData.sizeCategories || []).map((cat, i) => (
                  <fieldset key={i} className="bg-gray-50 p-3 rounded-lg border">
                      <legend className="font-semibold px-2 flex justify-between items-center w-full"><span>{cat.categoryName}</span><Button type="button" variant="danger" size="xs" onClick={() => removeCategory(i)}><Icons.trash className="w-3 h-3"/></Button></legend>
                      <div className="flex flex-wrap gap-2 pt-2">{cat.sizes.map((s, si) => (<span key={si} className="flex items-center bg-white border border-gray-300 px-2 py-1 rounded text-sm">{s}<button type="button" onClick={() => removeSize(i, si)} className="ml-2 text-red-500"><Icons.x className="w-3 h-3" /></button></span>))}</div>
                      <div className="flex gap-2 mt-2"><Input placeholder="Add size" value={newSizeInputs[i] || ''} onChange={(e) => setNewSizeInputs(p => ({...p, [i]: e.target.value}))} className="h-8 text-sm"/><Button type="button" size="sm" onClick={() => addSize(i)}>Add</Button></div>
                  </fieldset>
              ))}
            </div>
            <div className="mt-4 bg-gray-50 p-3 rounded-md border">
                <h4 className="text-sm font-bold mb-2">Add New Size Category</h4>
                <div className="flex gap-2 items-center"><Input placeholder="e.g., Shirt Size" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /><Button type="button" onClick={handleCreateAndAddCategory}>Create</Button></div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                Product Images {formData.images.length > 0 && <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-medium ml-1">{formData.images.length} Loaded</span>}
              </label>
              <div className="flex gap-1">
                <Button type="button" size="xs" variant={imageInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('upload')}>File Upload</Button>
                <Button type="button" size="xs" variant={imageInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('url')}>Image URL / Link</Button>
              </div>
            </div>
            
            <div className="my-2">
              {imageInputMode === 'upload' ? (
                <Input type="file" multiple onChange={handleFileUpload} accept="image/*,video/*" disabled={isUploading} />
              ) : (
                <div className="flex gap-2">
                  <Input 
                    placeholder="Paste image preview URL (e.g. https://static.markaz.app/...)" 
                    value={imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)} 
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); }}}
                  />
                  <Button type="button" onClick={handleAddImageUrl} className="self-end shrink-0">Add URL</Button>
                </div>
              )}
            </div>

            {isUploading && <div className="mt-2"><Spinner size="sm" /></div>}
            {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
            
            {formData.images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative group bg-white p-1 rounded-md border border-gray-200 shadow-sm flex flex-col items-center">
                    <MediaPreview src={img} className="w-full h-24 object-cover rounded" />
                    <span className="text-[10px] text-gray-400 truncate w-full px-1 mt-1 block" title={img}>
                      {img.replace(/^https?:\/\//, '')}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) })} 
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition-opacity opacity-80 group-hover:opacity-100"
                      title="Remove image"
                    >
                      <Icons.trash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1 italic">No images added yet. Paste a product link in the AI box or add URLs above.</p>
            )}
          </div>
          <div className="space-y-2 border p-3 rounded-md bg-gray-50">
              <h4 className="font-semibold text-sm">Delivery & Returns</h4>
              <Input label="Delivery Time" name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} />
              <div className="flex items-center gap-4">
                  <div className="flex items-center"><input type="checkbox" id="freeDelivery" name="freeDelivery" checked={formData.freeDelivery} onChange={handleChange} className="h-4 w-4 text-teal-600" /><label htmlFor="freeDelivery" className="ml-2 block text-sm">Free Delivery</label></div>
                  <div className="flex items-center"><input type="checkbox" id="easyReturn" name="easyReturn" checked={formData.easyReturn} onChange={handleChange} className="h-4 w-4 text-teal-600" /><label htmlFor="easyReturn" className="ml-2 block text-sm">Easy Return</label></div>
              </div>
              {formData.easyReturn && (<Input label="Return Policy" name="returnPolicy" value={formData.returnPolicy} onChange={handleChange} />)}
          </div>
          <div className="flex items-center"><input type="checkbox" id="isVisible" name="isVisible" checked={formData.isVisible} onChange={handleChange} className="h-4 w-4 text-teal-600" /><label htmlFor="isVisible" className="ml-2 block text-sm">Visible in store</label></div>
          <div className="flex justify-end gap-4 pt-4 border-t"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting || isUploading}>{isSubmitting ? <Spinner size="sm" /> : (product ? 'Save Changes' : 'Add Product')}</Button></div>
        </form>
      </div>
    </div>
  );
};