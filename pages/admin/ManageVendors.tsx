
import React, { useState, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { db } from '../../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { AppUser, UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';

const ManageVendors = () => {
    const { vendorsMap, syncCatalogBundle } = useStore();
    const initialVendors = useMemo(() => Object.values(vendorsMap || {}), [vendorsMap]);
    const [vendors, setVendors] = useState<AppUser[]>(initialVendors);
    const [isLoading, setIsLoading] = useState(initialVendors.length === 0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Keep vendors in sync with 1-read bundle
    React.useEffect(() => {
        if (initialVendors.length > 0) {
            setVendors(initialVendors);
            setIsLoading(false);
        } else {
            fetchVendors();
        }
    }, [initialVendors]);

    const fetchVendors = async () => {
        setIsRefreshing(true);
        try {
            const q = query(collection(db, 'users'), where('role', '==', UserRole.Vendor));
            const snap = await getDocs(q);
            const fetched = snap.docs.map(d => ({ ...d.data() } as AppUser));
            setVendors(fetched);
            // Also sync bundle with latest vendors
            const newMap: Record<string, AppUser> = {};
            fetched.forEach(v => { newMap[v.uid] = v; });
            if (syncCatalogBundle) {
                await syncCatalogBundle({ vendorsMap: newMap });
            }
        } catch (err) {
            console.error("Error fetching vendors:", err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const toggleVendorStatus = async (vendor: AppUser) => {
        const newStatus: 'active' | 'suspended' = vendor.status === 'active' ? 'suspended' : 'active';
        try {
            await updateDoc(doc(db, 'users', vendor.uid), { status: newStatus });
            const updated = vendors.map(v => v.uid === vendor.uid ? { ...v, status: newStatus } : v);
            setVendors(updated);
            const newMap: Record<string, AppUser> = {};
            updated.forEach(v => { newMap[v.uid] = v; });
            if (syncCatalogBundle) {
                await syncCatalogBundle({ vendorsMap: newMap });
            }
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const approveVendor = async (vendor: AppUser) => {
        try {
            await updateDoc(doc(db, 'users', vendor.uid), { status: 'active' });
            const updated = vendors.map(v => v.uid === vendor.uid ? { ...v, status: 'active' as const } : v);
            setVendors(updated);
            const newMap: Record<string, AppUser> = {};
            updated.forEach(v => { newMap[v.uid] = v; });
            if (syncCatalogBundle) {
                await syncCatalogBundle({ vendorsMap: newMap });
            }
            alert(`Vendor "${vendor.shopName}" approved!`);
        } catch (err) {
            alert('Failed to approve vendor');
        }
    };

    const handleDeleteVendor = async (uid: string) => {
        if (window.confirm('Are you sure you want to delete this vendor? This will NOT delete their auth account but will remove their business profile.')) {
            try {
                await deleteDoc(doc(db, 'users', uid));
                const updated = vendors.filter(v => v.uid !== uid);
                setVendors(updated);
                const newMap: Record<string, AppUser> = {};
                updated.forEach(v => { newMap[v.uid] = v; });
                if (syncCatalogBundle) {
                    await syncCatalogBundle({ vendorsMap: newMap });
                }
                alert('Vendor profile removed.');
            } catch (err) {
                alert('Failed to delete vendor.');
            }
        }
    };

    const filteredVendors = vendors.filter(v => 
        v.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Manage Vendors</h1>
                    <p className="text-xs text-teal-600 font-semibold mt-0.5">Instant 1-Read architecture active ({vendors.length} vendors cached)</p>
                </div>
                <Button onClick={fetchVendors} variant="secondary" disabled={isRefreshing}>
                    <Icons.refreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> {isRefreshing ? 'Refreshing...' : 'Refresh from DB'}
                </Button>
            </div>

            <div className="mb-6">
                <Input 
                    placeholder="Search by shop, email, or name..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <th className="p-4">Business / Name</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Joined At</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-8 text-center"><Spinner /></td></tr>
                        ) : filteredVendors.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No vendors found.</td></tr>
                        ) : filteredVendors.map(vendor => (
                            <tr key={vendor.uid} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                            vendor.status === 'active' ? 'bg-teal-100 text-teal-600' :
                                            vendor.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                            {vendor.shopName?.[0]?.toUpperCase() || 'V'}
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-800 block">{vendor.shopName}</span>
                                            <span className="text-xs text-gray-500">{vendor.firstName} {vendor.lastName}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="text-sm">
                                        <div className="text-gray-800">{vendor.email}</div>
                                        <div className="text-teal-600 font-medium">WA: {vendor.whatsappNumber}</div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                        vendor.status === 'active' ? 'bg-green-100 text-green-700' :
                                        vendor.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                        {vendor.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-gray-500">
                                    {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <a
                                            href={`/#/store/v/${encodeURIComponent(vendor.uid)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="View Standalone Store"
                                        >
                                            <Icons.externalLink className="w-5 h-5" />
                                        </a>
                                        {vendor.status === 'pending' && (
                                            <Button size="sm" onClick={() => approveVendor(vendor)} className="bg-teal-600 h-8">
                                                Approve
                                            </Button>
                                        )}
                                        {vendor.status !== 'pending' && (
                                            <button 
                                                onClick={() => toggleVendorStatus(vendor)}
                                                className={`p-2 rounded-lg transition-colors ${vendor.status === 'active' ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}
                                                title={vendor.status === 'active' ? "Suspend Vendor" : "Activate Vendor"}
                                            >
                                                {vendor.status === 'active' ? <Icons.xCircle className="w-5 h-5" /> : <Icons.checkCircle className="w-5 h-5" />}
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDeleteVendor(vendor.uid)}
                                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Delete Profile"
                                        >
                                            <Icons.trash className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>
        </div>
    );
};

export default ManageVendors;
