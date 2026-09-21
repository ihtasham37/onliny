
import React, { useState, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { AppUser, UserRole } from '../../types';

const ManageChallans = () => {
    const { addChallan, challans, deleteChallan, vendorsMap } = useStore();
    const [bankAccount, setBankAccount] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showVendorSelection, setShowVendorSelection] = useState(false);
    const [vendors, setVendors] = useState<AppUser[]>(Object.values(vendorsMap || {}));
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
    const [isLoadingVendors, setIsLoadingVendors] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [viewingVendorsChallan, setViewingVendorsChallan] = useState<any | null>(null);

    const fetchVendors = async () => {
        setIsLoadingVendors(true);
        try {
            const q = query(collection(db, 'users'), where('role', '==', UserRole.Vendor));
            const snap = await getDocs(q);
            setVendors(snap.docs.map(d => d.data() as AppUser));
        } catch (err) {
            console.error("Error fetching vendors:", err);
        } finally {
            setIsLoadingVendors(false);
        }
    };

    React.useEffect(() => {
        const cached = Object.values(vendorsMap || {});
        if (cached.length > 0) {
            setVendors(cached);
        } else {
            fetchVendors();
        }
    }, [vendorsMap]);

    const handleGenerateClick = () => {
        if (!bankAccount || !amount) {
            alert("Please fill in bank account and amount");
            return;
        }
        setShowVendorSelection(true);
        fetchVendors();
    };

    const handleSend = async () => {
        if (selectedVendorIds.length === 0) {
            alert("Please select at least one vendor");
            return;
        }
        setIsGenerating(true);
        try {
            await addChallan({
                bankAccount,
                amount: parseFloat(amount),
                description,
                vendorIds: selectedVendorIds
            });
            alert("Challan sent successfully!");
            setBankAccount('');
            setAmount('');
            setDescription('');
            setSelectedVendorIds([]);
            setShowVendorSelection(false);
        } catch (err) {
            console.error("Error sending challan:", err);
            alert("Failed to send challan");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleVendor = (id: string) => {
        setSelectedVendorIds(prev => 
            prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Manage Challans</h1>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Generate Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Icons.plusCircle className="w-5 h-5 text-teal-600" />
                        Generate New Challan
                    </h2>
                    <div className="space-y-4">
                        <Input 
                            label="Bank Account Number" 
                            value={bankAccount} 
                            onChange={e => setBankAccount(e.target.value)}
                            placeholder="Enter bank account details"
                        />
                        <Input 
                            label="Amount (PKR)" 
                            type="number"
                            value={amount} 
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                        <Textarea 
                            label="Description / Detail" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Monthly payment, registration fee, etc."
                            rows={3}
                        />
                        <Button 
                            onClick={handleGenerateClick} 
                            className="w-full bg-teal-600 hover:bg-teal-700"
                            disabled={isGenerating}
                        >
                            {isGenerating ? <Spinner size="sm" /> : "Send to Vendors"}
                        </Button>
                    </div>
                </div>

                {/* History */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Icons.history className="w-5 h-5 text-teal-600" />
                        Challan History
                    </h2>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {challans.length > 0 ? (
                            challans.map(challan => (
                                <div key={challan.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200 relative group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-bold text-teal-600">{challan.amount.toLocaleString()} PKR</span>
                                        <span className="text-[10px] text-gray-400">{new Date(challan.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1"><strong>Bank:</strong> {challan.bankAccount}</p>
                                    <p className="text-xs text-gray-600 line-clamp-2"><strong>Details:</strong> {challan.description}</p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                            Sent to {challan.vendorIds.length} vendors
                                        </span>
                                    </div>
                                    <div className="absolute top-2 right-2">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(openDropdownId === challan.id ? null : challan.id);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <Icons.moreVertical className="w-4 h-4" />
                                        </button>
                                        
                                        {openDropdownId === challan.id && (
                                            <>
                                                {/* Backdrop to close dropdown on outside click */}
                                                <div className="fixed inset-0 z-10" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdownId(null);
                                                }} />
                                                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setViewingVendorsChallan(challan);
                                                            setOpenDropdownId(null);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <Icons.eye className="w-3.5 h-3.5 text-gray-400" />
                                                        View Vendors
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm("Are you sure you want to delete this challan?")) {
                                                                deleteChallan(challan.id);
                                                            }
                                                            setOpenDropdownId(null);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        <Icons.trash className="w-3.5 h-3.5 text-red-500" />
                                                        Delete Challan
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-8 text-gray-400 text-sm">No challans generated yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Vendor Selection Modal */}
            {showVendorSelection && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-teal-600 text-white">
                            <h3 className="font-bold">Select Vendors</h3>
                            <button onClick={() => setShowVendorSelection(false)}>
                                <Icons.x className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-4">
                            {isLoadingVendors ? (
                                <div className="py-12 flex justify-center"><Spinner size="lg" /></div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm text-gray-500">{selectedVendorIds.length} selected</span>
                                        <button 
                                            onClick={() => setSelectedVendorIds(selectedVendorIds.length === vendors.length ? [] : vendors.map(v => v.uid))}
                                            className="text-xs text-teal-600 font-bold hover:underline"
                                        >
                                            {selectedVendorIds.length === vendors.length ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>
                                    {vendors.map(vendor => (
                                        <label 
                                            key={vendor.uid} 
                                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedVendorIds.includes(vendor.uid) ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                    {vendor.shopLogoUrl ? (
                                                        <img src={vendor.shopLogoUrl} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-teal-100 text-teal-600 font-bold uppercase">
                                                            {vendor.shopName?.[0] || vendor.firstName?.[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{vendor.shopName}</p>
                                                    <p className="text-[10px] text-gray-500">{vendor.email}</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 accent-teal-600 rounded"
                                                checked={selectedVendorIds.includes(vendor.uid)}
                                                onChange={() => toggleVendor(vendor.uid)}
                                            />
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setShowVendorSelection(false)}>Cancel</Button>
                            <Button 
                                className="flex-1 bg-teal-600" 
                                disabled={selectedVendorIds.length === 0 || isGenerating}
                                onClick={handleSend}
                            >
                                {isGenerating ? <Spinner size="sm" /> : `Send to ${selectedVendorIds.length} Vendor(s)`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Vendors Modal */}
            {viewingVendorsChallan && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-teal-600 text-white">
                            <h3 className="font-bold">Challan Vendors ({viewingVendorsChallan.vendorIds.length})</h3>
                            <button onClick={() => setViewingVendorsChallan(null)}>
                                <Icons.x className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4 bg-teal-50 border-b">
                            <p className="text-sm font-bold text-teal-800">{viewingVendorsChallan.amount.toLocaleString()} PKR</p>
                            <p className="text-[11px] text-teal-700 font-medium truncate">Account: {viewingVendorsChallan.bankAccount}</p>
                            {viewingVendorsChallan.description && (
                                <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">Description: {viewingVendorsChallan.description}</p>
                            )}
                        </div>

                        <div className="flex-grow overflow-y-auto p-4 space-y-3">
                            {viewingVendorsChallan.vendorIds.map((vendorId: string) => {
                                const vendor = vendors.find(v => v.uid === vendorId);
                                return (
                                    <div key={vendorId} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {vendor?.shopLogoUrl ? (
                                                <img src={vendor.shopLogoUrl} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="font-bold text-teal-600 uppercase text-sm">
                                                    {vendor?.shopName?.[0] || vendor?.firstName?.[0] || 'V'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-800 text-sm truncate">
                                                {vendor?.shopName || 'Unknown Vendor'}
                                            </p>
                                            <p className="text-[10px] text-gray-500 truncate">{vendor?.email}</p>
                                            {vendor?.whatsappNumber && (
                                                <p className="text-[10px] text-teal-600 font-medium">WhatsApp: {vendor.whatsappNumber}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t bg-gray-50">
                            <Button className="w-full bg-teal-600" onClick={() => setViewingVendorsChallan(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageChallans;
