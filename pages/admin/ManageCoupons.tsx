
import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { useAuth } from '../../hooks/useAuth';
import { Coupon, UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';

const CouponModal = ({ isOpen, onClose, coupon }: { isOpen: boolean; onClose: () => void; coupon: Coupon | null; }) => {
    const { addCoupon, updateCoupon } = useStore();
    const [formData, setFormData] = useState<Omit<Coupon, 'id' | 'createdAt'>>({
        code: '', description: '', discountType: 'percentage', discountValue: 10,
        minBill: 0, minProducts: 1, freeShipping: false,
        validFrom: new Date().getTime(),
        validTo: new Date(new Date().setDate(new Date().getDate() + 30)).getTime(),
        assignment: 'none'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (coupon) {
            setFormData({
                code: coupon.code, description: coupon.description, discountType: coupon.discountType,
                discountValue: coupon.discountValue, minBill: coupon.minBill, minProducts: coupon.minProducts,
                freeShipping: coupon.freeShipping, validFrom: coupon.validFrom, validTo: coupon.validTo,
                assignment: coupon.assignment
            });
        } else {
            // Reset to defaults for new coupon
             setFormData({
                code: '', description: '', discountType: 'percentage', discountValue: 10,
                minBill: 0, minProducts: 1, freeShipping: false,
                validFrom: new Date().getTime(),
                validTo: new Date(new Date().setDate(new Date().getDate() + 30)).getTime(),
                assignment: 'none'
            });
        }
    }, [coupon, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData({ ...formData, [name]: checked });
        } else if (type === 'date') {
            setFormData({ ...formData, [name]: new Date(value).getTime() });
        }
        else {
            const isNumber = ['discountValue', 'minBill', 'minProducts'].includes(name);
            let parsedVal: any = value;
            if (isNumber) {
                const p = parseFloat(value);
                parsedVal = isNaN(p) ? 0 : p;
            }
            setFormData({ ...formData, [name]: parsedVal });
        }
    };
    
    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '')});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (coupon) {
                await updateCoupon({ ...formData, id: coupon.id, createdAt: coupon.createdAt });
            } else {
                await addCoupon(formData);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save coupon:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Helper to convert timestamp to 'YYYY-MM-DD'
    const formatDate = (timestamp: number) => new Date(timestamp).toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">{coupon ? 'Edit Coupon' : 'Add New Coupon'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Coupon Code" name="code" value={formData.code} onChange={handleCodeChange} required placeholder="SUMMER25" />
                    <Textarea label="Description (for internal use)" name="description" value={formData.description} onChange={handleChange} rows={2} required />
                    
                    <fieldset className="p-3 border rounded-md">
                        <legend className="font-semibold px-2 text-gray-700">Discount</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Discount Type</label>
                                <select name="discountType" value={formData.discountType} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-600 sm:text-sm">
                                    <option value="percentage">Percentage</option>
                                    <option value="flat">Flat Amount</option>
                                </select>
                            </div>
                            <Input label="Discount Value" name="discountValue" type="number" step="0.01" value={formData.discountValue} onChange={handleChange} required />
                        </div>
                    </fieldset>

                    <fieldset className="p-3 border rounded-md">
                        <legend className="font-semibold px-2 text-gray-700">Rules</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <Input label="Minimum Bill" name="minBill" type="number" step="0.01" value={formData.minBill} onChange={handleChange} />
                             <Input label="Minimum Products" name="minProducts" type="number" step="1" value={formData.minProducts} onChange={handleChange} />
                        </div>
                         <div className="flex items-center mt-4">
                            <input type="checkbox" id="freeShipping" name="freeShipping" checked={formData.freeShipping} onChange={handleChange} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                            <label htmlFor="freeShipping" className="ml-2 block text-sm text-gray-900">Offer Free Shipping</label>
                        </div>
                    </fieldset>

                     <fieldset className="p-3 border rounded-md">
                        <legend className="font-semibold px-2 text-gray-700">Validity & Display</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Valid From" name="validFrom" type="date" value={formatDate(formData.validFrom)} onChange={handleChange} required />
                            <Input label="Valid To" name="validTo" type="date" value={formatDate(formData.validTo)} onChange={handleChange} required />
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Display Assignment</label>
                            <select name="assignment" value={formData.assignment} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-600 sm:text-sm">
                                <option value="none">None (Do not display publicly)</option>
                                <option value="banner">Homepage Banner</option>
                                <option value="product">Product Card Tag</option>
                                <option value="both">Both (Banner & Product Grid)</option>
                            </select>
                        </div>
                    </fieldset>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" /> : 'Save Coupon'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ManageCoupons = () => {
    const { coupons: allCoupons, deleteCoupon, isLoading } = useStore();
    const { userData } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

    const coupons = React.useMemo(() => {
        if (!userData) return allCoupons;
        if (userData.role === UserRole.Vendor) {
            return allCoupons.filter(c => c.vendorId === userData.uid);
        }
        return allCoupons;
    }, [allCoupons, userData]);

    const openModal = (coupon: Coupon | null = null) => {
        setSelectedCoupon(coupon);
        setIsModalOpen(true);
    };

    const handleDelete = (coupon: Coupon) => {
        if (window.confirm(`Are you sure you want to delete the coupon "${coupon.code}"?`)) {
            deleteCoupon(coupon.id);
        }
    };

    const getStatus = (coupon: Coupon) => {
        const now = Date.now();
        if (now < coupon.validFrom) return { text: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
        if (now > coupon.validTo) return { text: 'Expired', color: 'bg-gray-100 text-gray-800' };
        return { text: 'Active', color: 'bg-green-100 text-green-800' };
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Manage Coupons</h1>
                <Button onClick={() => openModal()} size="md">
                    <Icons.plus className="w-5 h-5 mr-2" /> Add Coupon
                </Button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <tr>
                            <th className="p-3">Code</th>
                            <th className="p-3">Discount</th>
                            <th className="p-3">Validity</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                     <tbody className="divide-y divide-gray-200">
                        {isLoading && coupons.length === 0 ? (
                             <tr><td colSpan={5} className="text-center p-8"><Spinner/></td></tr>
                        ) : coupons.map(coupon => {
                            const status = getStatus(coupon);
                            return (
                                <tr key={coupon.id} className="hover:bg-gray-50 text-sm">
                                    <td className="p-3">
                                        <p className="font-bold text-gray-800">{coupon.code}</p>
                                        <p className="text-xs text-gray-500">{coupon.description}</p>
                                    </td>
                                    <td className="p-3 font-medium">
                                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
                                        {coupon.freeShipping && <span className="ml-2 text-xs text-green-600">(+ Free Shipping)</span>}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                        {new Date(coupon.validFrom).toLocaleDateString()} - {new Date(coupon.validTo).toLocaleDateString()}
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                            {status.text}
                                        </span>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        <div className="flex gap-3">
                                            <button onClick={() => openModal(coupon)} className="text-blue-500 hover:text-blue-700" title="Edit Coupon"><Icons.edit className="w-5 h-5"/></button>
                                            <button onClick={() => handleDelete(coupon)} className="text-red-500 hover:text-red-700" title="Delete Coupon"><Icons.trash className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {coupons.length === 0 && !isLoading && (
                    <p className="text-center p-8 text-gray-500">No coupons found. Click 'Add Coupon' to create one.</p>
                )}
            </div>
            <CouponModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} coupon={selectedCoupon} />
        </div>
    );
};

export default ManageCoupons;
