import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Product } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { formatCurrency } from '../../utils/helpers';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { ProductModal } from '../../components/admin/ProductModal';
import { MoveCopyProductModal } from '../../components/admin/MoveCopyProductModal';

const ManageProducts = () => {
  const { myProducts: products, deleteProduct, toggleProductVisibility, isLoading } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isMoveCopyModalOpen, setIsMoveCopyModalOpen] = useState(false);
  const [productToMoveCopy, setProductToMoveCopy] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const openModal = (product: Product | null = null) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };
  
  const openMoveCopyModal = (product: Product) => {
    setProductToMoveCopy(product);
    setIsMoveCopyModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  const filteredProducts = products.filter(p => {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || 
             p.category.toLowerCase().includes(term) ||
             p.id.toLowerCase().includes(term) ||
             (p.customId && p.customId.toLowerCase().includes(term));
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Manage All Products</h1>
        <Button onClick={() => openModal()} size="md">
             <Icons.plus className="w-5 h-5 mr-2" /> Add New Product
        </Button>
      </div>
      
      <div className="mb-4">
          <Input 
            placeholder="Search products..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">Product ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Price</th>
              <th className="p-3">Category</th>
              <th className="p-3">Visible</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading && products.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8"><Spinner/></td></tr>
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
                <td className="p-3 text-gray-500">{product.category}</td>
                <td className="p-3">
                  <button 
                    onClick={() => toggleProductVisibility(product.id, !product.isVisible)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${product.isVisible ? 'bg-teal-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${product.isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-3">
                        <button onClick={() => openMoveCopyModal(product)} className="text-gray-500 hover:text-gray-700" title="Move/Copy Product"><Icons.copy className="w-5 h-5"/></button>
                        <button onClick={() => openModal(product)} className="text-blue-500 hover:text-blue-700" title="Edit Product"><Icons.edit className="w-5 h-5"/></button>
                        <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700" title="Delete Product"><Icons.trash className="w-5 h-5"/></button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && !isLoading && (
            <div className="text-center p-8 text-gray-500">No products found.</div>
        )}
      </div>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
      />
      <MoveCopyProductModal
        isOpen={isMoveCopyModalOpen}
        onClose={() => setIsMoveCopyModalOpen(false)}
        product={productToMoveCopy}
      />
    </div>
  );
};

export default ManageProducts;