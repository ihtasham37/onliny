
import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { Settings, SizeCategory } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';

const ManageSizes = () => {
    const { settings, updateSettings, isLoading } = useStore();
    const [sizeCategories, setSizeCategories] = useState<SizeCategory[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newSizeInputs, setNewSizeInputs] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings?.sizeCategories) {
            setSizeCategories(settings.sizeCategories.map(cat => ({
                ...cat,
                sizes: [...cat.sizes]
            })));
        }
    }, [settings]);

    const handleSave = async () => {
        if (settings) {
            setIsSaving(true);
            const newSettings: Settings = { ...settings, sizeCategories: sizeCategories };
            await updateSettings(newSettings);
            setIsSaving(false);
        }
    };

    const addCategory = () => {
        if (newCategoryName.trim() && !sizeCategories.some(c => c.categoryName === newCategoryName.trim())) {
            setSizeCategories([...sizeCategories, { categoryName: newCategoryName.trim(), sizes: [] }]);
            setNewCategoryName('');
        }
    };

    const deleteCategory = (categoryName: string) => {
        if (window.confirm(`Are you sure you want to delete the "${categoryName}" category? This cannot be undone.`)) {
            setSizeCategories(sizeCategories.filter(c => c.categoryName !== categoryName));
        }
    };

    const addSize = (categoryName: string) => {
        const sizeValue = newSizeInputs[categoryName]?.trim();
        if (sizeValue) {
            setSizeCategories(sizeCategories.map(c => {
                if (c.categoryName === categoryName && !c.sizes.includes(sizeValue)) {
                    return { ...c, sizes: [...c.sizes, sizeValue] };
                }
                return c;
            }));
            setNewSizeInputs({ ...newSizeInputs, [categoryName]: '' });
        }
    };

    const deleteSize = (categoryName: string, sizeToDelete: string) => {
        setSizeCategories(sizeCategories.map(c => {
            if (c.categoryName === categoryName) {
                return { ...c, sizes: c.sizes.filter(s => s !== sizeToDelete) };
            }
            return c;
        }));
    };
    
    if (isLoading && !settings) {
        return <div className="flex justify-center p-16"><Spinner size="lg"/></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Product Sizes</h1>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Spinner size="sm"/> : 'Save Changes'}
                </Button>
            </div>

            <div className="space-y-6">
                {sizeCategories.map((category) => (
                    <div key={category.categoryName} className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{category.categoryName}</h2>
                            <Button variant="danger" size="sm" onClick={() => deleteCategory(category.categoryName)}>
                                <Icons.trash className="w-4 h-4"/>
                                Delete Category
                            </Button>
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-gray-700">Size Options</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {category.sizes.map(size => (
                                    <span key={size} className="flex items-center bg-pink-100 text-pink-800 text-sm font-medium px-3 py-1 rounded-full">
                                        {size}
                                        <button onClick={() => deleteSize(category.categoryName, size)} className="ml-2 text-pink-600 hover:text-pink-800">
                                            <Icons.x className="w-3 h-3"/>
                                        </button>
                                    </span>
                                ))}
                                {category.sizes.length === 0 && <p className="text-xs text-gray-400">No sizes added yet.</p>}
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <Input
                                placeholder="Add new size (e.g., XL)"
                                value={newSizeInputs[category.categoryName] || ''}
                                onChange={e => setNewSizeInputs({ ...newSizeInputs, [category.categoryName]: e.target.value })}
                            />
                            <Button onClick={() => addSize(category.categoryName)}>Add Size</Button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border-t-4 border-pink-500">
                <h2 className="text-xl font-bold mb-4">Add New Size Category</h2>
                 <p className="text-sm text-gray-500 mb-4">Create a new category for sizes, like "Shoe Size" or "Trouser Waist".</p>
                <div className="flex gap-2">
                    <Input
                        placeholder="e.g., Shirt Size"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                    />
                    <Button onClick={addCategory}>Create Category</Button>
                </div>
            </div>
        </div>
    );
};

export default ManageSizes;