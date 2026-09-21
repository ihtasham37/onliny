
import React, { useState, useEffect, useMemo } from 'react';
import { Product, UserRole } from '../../types';
import { useStore } from '../../hooks/useStore';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Icons } from '../icons/Icons';

interface MoveCopyProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const MoveCopyProductModal: React.FC<MoveCopyProductModalProps> = ({ isOpen, onClose, product }) => {
  const { settings, moveProduct, copyProduct } = useStore();
  const { userData } = useAuth();
  const [action, setAction] = useState<'move' | 'copy'>('move');
  const [destinationCategory, setDestinationCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVendor = userData?.role === UserRole.Vendor;
  const vendorId = userData?.uid;

  const relevantCategories = useMemo(() => {
    const all = (settings?.categories || []).filter(c => c && typeof c.name === 'string');
    if (isVendor && vendorId) {
      return all.filter(c => c.vendorId === vendorId);
    }
    return all.filter(c => !c.vendorId);
  }, [settings?.categories, isVendor, vendorId]);

  const availableMoveCategories = useMemo(() => {
    return relevantCategories.map(c => c.name).filter(name => name !== product?.category);
  }, [relevantCategories, product?.category]);

  const availableCopyCategories = useMemo(() => {
    return relevantCategories.map(c => c.name);
  }, [relevantCategories]);

  useEffect(() => {
    if (isOpen && product) {
        setAction('move');
        setDestinationCategory(availableMoveCategories[0] || '');
    }
  }, [isOpen, product, availableMoveCategories]);

  if (!isOpen || !product) return null;

  const handleSubmit = async () => {
    if (!destinationCategory) {
      alert('Please select a destination category.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (action === 'move') {
        await moveProduct(product.id, destinationCategory);
        alert(`Product "${product.name}" moved to "${destinationCategory}".`);
      } else {
        await copyProduct(product.id, destinationCategory);
        alert(`Product "${product.name}" copied to "${destinationCategory}".`);
      }
      onClose();
    } catch (error) {
      console.error(`Failed to ${action} product:`, error);
      alert(`An error occurred. Could not ${action} the product.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Move/Copy Product</h2>
            <button onClick={onClose}><Icons.x/></button>
        </div>
        <p className="text-sm my-4">Product: <span className="font-semibold">{product.name}</span></p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">1. Select Action</label>
            <div className="flex gap-2 mt-1">
              <Button variant={action === 'move' ? 'primary' : 'secondary'} onClick={() => setAction('move')}>Move</Button>
              <Button variant={action === 'copy' ? 'primary' : 'secondary'} onClick={() => setAction('copy')}>Copy</Button>
            </div>
          </div>

          <div>
            <label htmlFor="destinationCategory" className="block text-sm font-medium text-gray-700">
              2. {action === 'move' ? 'Move to Category' : 'Copy to Category'}
            </label>
            <select
              id="destinationCategory"
              value={destinationCategory}
              onChange={(e) => setDestinationCategory(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-600 sm:text-sm"
            >
              <option value="">Select destination...</option>
              {(action === 'move' ? availableMoveCategories : availableCopyCategories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 mt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !destinationCategory}>
            {isSubmitting ? <Spinner size="sm" /> : `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`}
          </Button>
        </div>
      </div>
    </div>
  );
};