import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { Product, Category } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { formatCurrency, matchCategory, normalizeCategoryName } from '../../utils/helpers';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { ProductModal } from '../../components/admin/ProductModal';
import { MoveCopyProductModal } from '../../components/admin/MoveCopyProductModal';
import { EditCategoryModal } from '../../components/admin/EditCategoryModal';
import { MoveCopyCategoryModal } from '../../components/admin/MoveCopyCategoryModal';

const CategoryProducts = () => {
  const { categoryName: categoryId } = useParams<{ categoryName: string }>(); 
  const { products, deleteProduct, toggleProductVisibility, isLoading, settings, addCategory, updateCategory, deleteCategory, uploadFile } = useStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isMoveCopyModalOpen, setIsMoveCopyModalOpen] = useState(false);
  const [productToMoveCopy, setProductToMoveCopy] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for adding sub-categories
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [isAddingSubCategory, setIsAddingSubCategory] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [newSubCategoryImageFile, setNewSubCategoryImageFile] = useState<File | null>(null);
  const [newSubCategoryImageUrl, setNewSubCategoryImageUrl] = useState('');
  const [bannerInputMode, setBannerInputMode] = useState<'upload' | 'url'>('upload');
  const [newSubCategoryBannerUrls, setNewSubCategoryBannerUrls] = useState<string[]>([]);
  const [newBannerUrlInput, setNewBannerUrlInput] = useState('');
  
  // State for editing/moving sub-categories
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCatMoveCopyOpen, setIsCatMoveCopyOpen] = useState(false);
  const [categoryToMoveCopy, setCategoryToMoveCopy] = useState<Category | null>(null);

  const currentCategory = useMemo(() => {
    const rawId = decodeURIComponent(categoryId || '');
    return (settings?.categories || []).find(c => 
      c.id === rawId || 
      c.id === categoryId || 
      matchCategory(c.name, rawId)
    );
  }, [settings?.categories, categoryId]);

  const isParentCategory = useMemo(() => currentCategory ? !currentCategory.parentId : false, [currentCategory]);
  
  const subCategories = useMemo(() => {
      if (!currentCategory) return [];
      return (settings?.categories || []).filter(c => 
        c.parentId === currentCategory.id || 
        c.parentId === categoryId || 
        c.parentId === currentCategory.name
      );
  }, [settings?.categories, currentCategory, categoryId]);

  const categoryProducts = useMemo(() => {
    if (!currentCategory) return [];
    
    // Find all descendant categories if parent
    const targetCategories: { id: string; name: string }[] = [currentCategory];
    subCategories.forEach(sub => targetCategories.push(sub));

    return products.filter(p => {
      return targetCategories.some(target => matchCategory(p.category, target));
    });
  }, [products, currentCategory, subCategories]);

  const handleAddBannerUrl = () => {
    if (newBannerUrlInput.trim()) {
        setNewSubCategoryBannerUrls(prev => [...prev, newBannerUrlInput.trim()]);
        setNewBannerUrlInput('');
    }
  };

  const handleBannerUpload = async (file: File) => {
    try {
        const url = await uploadFile(file);
        setNewSubCategoryBannerUrls(prev => [...prev, url]);
    } catch (error) { console.error("Banner upload failed", error); }
  };

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCategoryName.trim() || !categoryId) return;
    setIsAddingSubCategory(true);
    try {
        let imageUrl: string | undefined = undefined;
        if (imageInputMode === 'upload' && newSubCategoryImageFile) imageUrl = await uploadFile(newSubCategoryImageFile);
        else if (imageInputMode === 'url' && newSubCategoryImageUrl.trim()) imageUrl = newSubCategoryImageUrl.trim();

        await addCategory(newSubCategoryName, categoryId, imageUrl, newSubCategoryBannerUrls);
        setNewSubCategoryName('');
        setNewSubCategoryImageFile(null); setNewSubCategoryImageUrl('');
        setNewSubCategoryBannerUrls([]); setNewBannerUrlInput('');
    } catch (error) {
        console.error("Failed to add sub-category", error);
        alert("Failed to add sub-category.");
    } finally {
        setIsAddingSubCategory(false);
    }
  };
  
  const openProductModal = (product: Product | null = null) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };
  
  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setIsEditModalOpen(true);
  };

  const openCatMoveCopyModal = (category: Category) => {
      setCategoryToMoveCopy(category);
      setIsCatMoveCopyOpen(true);
  };

  const openMoveCopyModal = (product: Product) => {
    setProductToMoveCopy(product);
    setIsMoveCopyModalOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  const filteredProducts = categoryProducts.filter(p => {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || 
             p.id.toLowerCase().includes(term) || 
             (p.customId && p.customId.toLowerCase().includes(term));
  });

  if (!currentCategory && !isLoading) {
      return <div>Category not found.</div>
  }

  return (
    <div>
        <div className="mb-4">
            <Link to="/admin/categories" className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600">
                <Icons.chevronLeft className="w-4 h-4" />
                Back to All Categories
            </Link>
        </div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 font-serif">Manage "{currentCategory?.name}"</h1>
        {!isParentCategory && (
            <Button onClick={() => openProductModal()} size="md" className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white border-none shadow-md shadow-rose-200">
                <Icons.plus className="w-5 h-5 mr-2" /> Add Product to this Category
            </Button>
        )}
      </div>

      {isParentCategory && (
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border-t-4 border-rose-500">
            <h2 className="text-xl font-bold mb-3 font-serif">Sub-categories of "{currentCategory?.name}"</h2>
            <form onSubmit={handleAddSubCategory} className="space-y-3 p-3 border rounded-md bg-gray-50 mb-4">
                <Input label="New Sub-category Name" placeholder="e.g., Shoes" value={newSubCategoryName} onChange={e => setNewSubCategoryName(e.target.value)} required />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Icon Image (Optional)</label>
                    <div className="flex gap-2 border-b pb-3 mb-3"><Button type="button" size="sm" variant={imageInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('upload')}>Upload</Button><Button type="button" size="sm" variant={imageInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('url')}>URL</Button></div>
                    {imageInputMode === 'upload' ? <Input type="file" accept="image/*" onChange={e => setNewSubCategoryImageFile(e.target.files ? e.target.files[0] : null)} /> : <Input type="url" placeholder="https://example.com/image.png" value={newSubCategoryImageUrl} onChange={e => setNewSubCategoryImageUrl(e.target.value)} />}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banner Images (Optional)</label>
                  <div className="flex gap-2 border-b pb-3 mb-3"><Button type="button" size="sm" variant={bannerInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setBannerInputMode('upload')}>Upload</Button><Button type="button" size="sm" variant={bannerInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setBannerInputMode('url')}>URL</Button></div>
                  {bannerInputMode === 'upload' ? <Input type="file" accept="image/*" multiple onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(handleBannerUpload) }} /> : <div className="flex gap-2"><Input type="url" placeholder="https://example.com/banner.png" value={newBannerUrlInput} onChange={e => setNewBannerUrlInput(e.target.value)} /><Button type="button" onClick={handleAddBannerUrl}>Add</Button></div>}
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {newSubCategoryBannerUrls.map((url, i) => <div key={i} className="relative"><ImageWithFallback src={url} className="w-full h-16 object-cover rounded" /><Button type="button" variant="danger" size="xs" className="absolute top-1 right-1" onClick={() => setNewSubCategoryBannerUrls(p => p.filter((_, idx) => idx !== i))}><Icons.trash className="w-3 h-3"/></Button></div>)}
                  </div>
                </div>
                <Button type="submit" disabled={isAddingSubCategory}>
                    {isAddingSubCategory ? <Spinner size="sm" /> : "Add Sub-category"}
                </Button>
            </form>
            {subCategories.length > 0 ? (
                <div className="space-y-2">
                    {subCategories.map(subCat => (
                        <div key={subCat.id} className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-3 rounded-md gap-3">
                            <div className="flex items-center gap-4 flex-grow">
                                <ImageWithFallback src={subCat.imageUrl} alt={subCat.name} className="w-12 h-12 rounded-md object-cover"/>
                                <span className="font-medium text-gray-700">{subCat.name}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Visible</span>
                                    <button onClick={() => updateCategory(subCat.id, { isVisible: !subCat.isVisible })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${subCat.isVisible ? 'bg-rose-500' : 'bg-gray-200'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${subCat.isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <Link to={`/admin/categories/${subCat.id}`}><Button variant="outline" size="sm">Manage</Button></Link>
                                <Button variant="secondary" size="sm" onClick={() => openCatMoveCopyModal(subCat)}><Icons.copy className="w-4 h-4"/></Button>
                                <Button variant="secondary" size="sm" onClick={() => openEditCategoryModal(subCat)}><Icons.edit className="w-4 h-4"/></Button>
                                <Button variant="danger" size="sm" onClick={() => deleteCategory(subCat.id)}><Icons.trash className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p className="text-sm text-gray-500">No sub-categories yet.</p>}
        </div>
      )}
      
      {!isParentCategory && (
        <>
            <div className="mb-4">
            <Input 
                placeholder={`Search within ${currentCategory?.name}...`} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <h3 className="text-xl font-bold p-4 font-serif">Products in this Category</h3>
            <table className="w-full">
                <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                    <th className="p-3">Image</th>
                    <th className="p-3">Product ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Visible</th>
                    <th className="p-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {isLoading && products.length === 0 ? (
                    <tr><td colSpan={5} className="text-center p-8"><Spinner/></td></tr>
                ) : filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 text-sm">
                    <td className="p-3">
                    <ImageWithFallback src={product.images?.[0]} className="w-12 h-12 object-cover rounded" />
                    </td>
                    <td className="p-3">
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {product.customId || product.id}
                        </span>
                    </td>
                    <td className="p-3 font-medium text-gray-800">{product.name}</td>
                    <td className="p-3">{formatCurrency(product.price)}</td>
                    <td className="p-3">
                        <button 
                        onClick={() => toggleProductVisibility(product.id, !product.isVisible)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${product.isVisible ? 'bg-rose-500' : 'bg-gray-200'}`}
                        >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${product.isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-3">
                            <button onClick={() => openMoveCopyModal(product)} className="text-gray-500 hover:text-gray-700" title="Move/Copy Product"><Icons.copy className="w-5 h-5"/></button>
                            <button onClick={() => openProductModal(product)} className="text-blue-500 hover:text-blue-700" title="Edit Product"><Icons.edit className="w-5 h-5"/></button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="text-red-500 hover:text-red-700" title="Delete Product"><Icons.trash className="w-5 h-5"/></button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            {filteredProducts.length === 0 && !isLoading && (
                <div className="text-center p-8 text-gray-500">No products found in this category.</div>
            )}
            </div>
        </>
      )}


      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        categoryLock={!isParentCategory ? currentCategory?.name : undefined}
      />
      <MoveCopyProductModal
        isOpen={isMoveCopyModalOpen}
        onClose={() => setIsMoveCopyModalOpen(false)}
        product={productToMoveCopy}
      />
       <EditCategoryModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        category={editingCategory} 
        onSave={updateCategory} 
      />
      <MoveCopyCategoryModal isOpen={isCatMoveCopyOpen} onClose={() => setIsCatMoveCopyOpen(false)} category={categoryToMoveCopy} />
    </div>
  );
};

export default CategoryProducts;