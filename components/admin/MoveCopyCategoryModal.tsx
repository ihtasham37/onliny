import React, { useState, useEffect, useMemo } from 'react';
import { Category } from '../../types';
import { useStore } from '../../hooks/useStore';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Icons } from '../icons/Icons';

interface MoveCopyCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}

export const MoveCopyCategoryModal: React.FC<MoveCopyCategoryModalProps> = ({ isOpen, onClose, category }) => {
  const { settings, moveCategory, copyCategory } = useStore();
  const [action, setAction] = useState<'move' | 'copy'>('move');
  const [destinationParentId, setDestinationParentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableParents = useMemo(() => {
    if (!settings?.categories || !category) return [];
    
    // Find all descendant IDs of the category being moved/copied
    const descendantIds = new Set<string>();
    const queue: string[] = [category.id];
    descendantIds.add(category.id);
    
    while(queue.length > 0) {
        const currentId = queue.shift()!;
        const children = settings.categories.filter(c => c.parentId === currentId);
        for (const child of children) {
            descendantIds.add(child.id);
            queue.push(child.id);
        }
    }
    // A category cannot be moved into itself or one of its own children
    return settings.categories.filter(c => !descendantIds.has(c.id));
  }, [settings, category]);

  useEffect(() => {
    if (isOpen) {
        setAction('move');
        setDestinationParentId(null);
    }
  }, [isOpen]);

  if (!isOpen || !category) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (action === 'move') {
        await moveCategory(category.id, destinationParentId);
        alert(`Category "${category.name}" moved successfully.`);
      } else {
        await copyCategory(category.id, destinationParentId);
        alert(`Category "${category.name}" copied successfully.`);
      }
      onClose();
    } catch (error) {
      console.error(`Failed to ${action} category:`, error);
      alert(`An error occurred. Could not ${action} the category.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Move/Copy Category</h2>
            <button onClick={onClose}><Icons.x/></button>
        </div>
        <p className="text-sm my-4">Category: <span className="font-semibold">{category.name}</span></p>
        
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
              2. Select New Parent Category
            </label>
            <select
              id="destinationCategory"
              value={destinationParentId || ''}
              onChange={(e) => setDestinationParentId(e.target.value || null)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-600 sm:text-sm"
            >
              <option value="">None (Top-level)</option>
              {availableParents.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 mt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`}
          </Button>
        </div>
      </div>
    </div>
  );
};