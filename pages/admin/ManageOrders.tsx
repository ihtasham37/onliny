import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { useAuth } from '../../hooks/useAuth';
import { Order, OrderStatus } from '../../types';
import { formatCurrency, safeLower, generateCartItemKey, getSelectedSizesEntries, printHtmlContent, getDisplayOrderId, getBaseAppUrl } from '../../utils/helpers';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { Button } from '../../components/ui/Button';
import { copyToClipboard } from '../../utils/shareHelper';

const handleDownloadInvoice = (order: Order, settings?: any, vendorsMap?: Record<string, any>) => {
    const origin = getBaseAppUrl(settings);
    
    // Vendor/Category Store Name & Logo Resolution
    const vendorData = order.vendorId ? vendorsMap?.[order.vendorId] : null;
    const appName = order.storeName || vendorData?.shopName || settings?.appName || 'Online store';
    const storeLogoUrl = order.storeLogoUrl || vendorData?.shopLogoUrl || settings?.logoUrl || '';
    const storeWhatsapp = order.storeWhatsapp || vendorData?.whatsappNumber || settings?.whatsappNumber || '';
    const invoiceTypeLabel = order.sourceStoreType === 'vendor' ? 'Official Vendor Store Invoice' : order.sourceStoreType === 'category' ? 'Official Category Store Invoice' : 'Official Store Invoice & Receipt';

    const paymentMethodDisplay = order.paymentMethod?.toLowerCase() === 'cod' ? 'Cash on Delivery (COD)' : (order.paymentMethod || 'Cash on Delivery');
    const orderCustomId = getDisplayOrderId(order);
    const trackingUrl = `${origin}/?track=${encodeURIComponent(order.customerPhone)}${order.email ? `&email=${encodeURIComponent(order.email)}` : ''}`;

    const itemRows = order.items.map((item, idx) => {
        const sizeEntries = getSelectedSizesEntries(item.selectedSizes);
        const selectedSizes = sizeEntries.length > 0
            ? `<div style="margin-top: 4px; display: inline-block; background-color: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Sizes: ${sizeEntries.map(([cat, size]) => `${cat}: ${size}`).join(' | ')}</div>`
            : '';
        const productIdDisplay = item.customId || item.id;
        const productUrl = `${origin}/?product=${encodeURIComponent(item.id)}`;
        
        return `
        <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
            <td style="padding: 12px 10px; vertical-align: top; width: 68%;">
                <div style="font-weight: 700; color: #0f172a; font-size: 13px; line-height: 1.4;">${item.name}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                    Qty: <strong style="color: #0f172a;">${item.quantity}</strong> &times; ${formatCurrency(item.price)}
                    &bull; <span style="font-family: monospace; color: #475569;">ID: ${productIdDisplay}</span>
                </div>
                ${selectedSizes}
                <div style="margin-top: 8px;">
                    <a href="${productUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 6px 12px; background-color: #be185d; color: #ffffff !important; font-size: 11px; font-weight: 700; border-radius: 6px; text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        🛍️ View Product in Store &rarr;
                    </a>
                </div>
            </td>
            <td style="padding: 12px 10px; vertical-align: top; text-align: right; font-weight: 700; color: #0f172a; font-size: 13px; width: 32%;">
                ${formatCurrency(item.price * item.quantity)}
            </td>
        </tr>
    `}).join('');

    const logoHtml = storeLogoUrl 
        ? `<img src="${storeLogoUrl}" alt="${appName}" style="height: 38px; max-width: 140px; object-fit: contain; margin-bottom: 6px; border-radius: 6px;" />` 
        : '';

    const invoiceHtml = `
    <div style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; box-sizing: border-box; width: 100%; max-width: 100%;">
        
        <!-- Header Banner -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="vertical-align: middle; width: 60%;">
                    ${logoHtml}
                    <div style="font-size: 24px; font-weight: 800; color: #be185d; font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.5px;">
                        ${appName}
                    </div>
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">
                        ${invoiceTypeLabel}
                    </div>
                </td>
                <td style="vertical-align: middle; text-align: right; width: 40%;">
                    <div style="display: inline-block; background-color: #fdf2f8; border: 1px solid #fbcfe8; padding: 4px 10px; border-radius: 8px; text-align: right;">
                        <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #be185d; letter-spacing: 0.5px;">Invoice / Order ID</div>
                        <div style="font-size: 14px; font-weight: 800; color: #0f172a; font-family: monospace;">${orderCustomId}</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Order Meta Details -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; vertical-align: top; padding-right: 8px;">
                        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">Customer / Shipping To:</div>
                        <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${order.customerName}</div>
                        <div style="font-size: 12px; color: #334155; line-height: 1.4; margin-top: 2px;">
                            ${order.customerAddress}<br/>
                            ${order.landmark ? `<span style="color: #64748b;">Landmark: ${order.landmark}</span><br/>` : ''}
                            ${order.city}, ${order.province}
                        </div>
                        <div style="font-size: 12px; color: #0f172a; font-weight: 600; margin-top: 4px;">
                            📞 ${order.customerPhone}
                        </div>
                        ${order.email ? `<div style="font-size: 11px; color: #64748b;">✉️ ${order.email}</div>` : ''}
                    </td>
                    <td style="width: 50%; vertical-align: top; padding-left: 8px; border-left: 1px solid #e2e8f0;">
                        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">Order Info:</div>
                        <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">
                            <span style="color: #64748b;">Date:</span> <strong>${new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                        </div>
                        <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">
                            <span style="color: #64748b;">Payment:</span> <strong style="color: #047857;">${paymentMethodDisplay}</strong>
                        </div>
                        <div style="font-size: 12px; color: #334155; margin-bottom: 6px;">
                            <span style="color: #64748b;">Status:</span> <strong style="text-transform: capitalize; color: #be185d;">${order.status}</strong>
                        </div>
                        <div style="margin-top: 8px;">
                            <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #be185d; color: #ffffff !important; padding: 6px 12px; font-size: 11px; font-weight: 700; border-radius: 6px; text-decoration: none;">
                                📦 Live Tracking Link &rarr;
                            </a>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <thead>
                <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 10px; font-size: 11px; text-align: left; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; width: 68%;">Item Details</th>
                    <th style="padding: 10px; font-size: 11px; text-align: right; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; width: 32%;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
            </tbody>
        </table>

        <!-- Totals Breakdown -->
        <div style="margin-left: auto; width: 100%; max-width: 320px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 3px 0; font-size: 12px; color: #64748b;">Subtotal:</td>
                    <td style="padding: 3px 0; font-size: 12px; font-weight: 700; color: #0f172a; text-align: right;">${formatCurrency(order.total - order.shippingFee + (order.discountAmount || 0))}</td>
                </tr>
                ${order.discountAmount ? `
                <tr>
                    <td style="padding: 3px 0; font-size: 12px; color: #dc2626;">Discount:</td>
                    <td style="padding: 3px 0; font-size: 12px; font-weight: 700; color: #dc2626; text-align: right;">-${formatCurrency(order.discountAmount)}</td>
                </tr>
                ` : ''}
                <tr>
                    <td style="padding: 3px 0; font-size: 12px; color: #64748b;">Shipping Fee:</td>
                    <td style="padding: 3px 0; font-size: 12px; font-weight: 700; color: #0f172a; text-align: right;">${order.shippingFee > 0 ? formatCurrency(order.shippingFee) : 'FREE'}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="padding: 8px 0 2px 0; font-size: 14px; font-weight: 800; color: #0f172a;">Grand Total:</td>
                    <td style="padding: 8px 0 2px 0; font-size: 16px; font-weight: 800; color: #be185d; text-align: right;">${formatCurrency(order.total)}</td>
                </tr>
            </table>
        </div>

        <!-- Footer Notice -->
        <div style="text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 14px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
            Thank you for shopping with <strong style="color: #64748b;">${appName}</strong>.<br/>
            For inquiries or order assistance, please reach out with your Invoice ID: <strong style="color: #475569;">${orderCustomId}</strong>
        </div>
    </div>
    `;

    // Trigger vector text PDF using the print iframe
    printHtmlContent(invoiceHtml, `Invoice-${orderCustomId}`, appName);
};

const CopyableText = ({ text }: { text: string }) => {
    const handleCopy = async () => {
        const success = await copyToClipboard(text);
        if (success) {
            alert('ID Copied!');
        } else {
            alert('ID: ' + text);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <span className="font-mono bg-gray-100 p-1 rounded text-xs">{text}</span>
            <button onClick={handleCopy} title="Copy ID" className="text-gray-500 hover:text-gray-800">
                <Icons.copy className="w-4 h-4" />
            </button>
        </div>
    );
};

const OrderDetailsModal = ({ order, onClose }: { order: Order | null; onClose: () => void }) => {
    if (!order) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                     <h2 className="text-xl font-bold mb-4">Order #{getDisplayOrderId(order)}</h2>
                     <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><Icons.x /></button>
                </div>
                <div className="space-y-4 text-sm">
                    <div>
                        <h3 className="font-semibold mb-1 text-gray-600">Customer Details</h3>
                        <p><strong>Name:</strong> {order.customerName}</p>
                        <p><strong>Phone:</strong> {order.customerPhone}</p>
                        <p><strong>Email:</strong> {order.email || 'Not Provided'}</p>
                        <p><strong>Address:</strong> {`${order.customerAddress}, ${order.city}, ${order.province}`}</p>
                        {order.landmark && <p><strong>Landmark:</strong> {order.landmark}</p>}
                    </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-gray-600">Order Information</h3>
                        <p><strong>Payment:</strong> {order.paymentMethod?.toLowerCase() === 'cod' ? 'Cash on Delivery' : (order.paymentMethod || 'Cash on Delivery')}</p>
                        <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-semibold mb-2">Items:</h3>
                        {order.items.map(item => (
                            <div key={generateCartItemKey(item)} className="flex justify-between items-start py-2">
                                <div>
                                    <p className="font-medium">
                                        <Link to={`/product/${item.id}`} target="_blank" rel="noopener noreferrer" className="text-rose-600 hover:underline font-semibold transition-colors">
                                            {item.name}
                                        </Link>
                                        {' '}x {item.quantity}
                                    </p>
                                    <div className="pl-2 mt-1 text-xs text-gray-500 flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span>Product ID:</span> <CopyableText text={item.customId || item.id} />
                                        </div>
                                    </div>
                                    <div className="pl-2 text-xs text-gray-500">
                                        {(() => {
                                            const sizeEntries = getSelectedSizesEntries(item.selectedSizes);
                                            if (sizeEntries.length === 0) return null;
                                            return (
                                                <p className="text-pink-600 font-semibold">
                                                    Selected Sizes: {sizeEntries.map(([cat, size]) => `${cat}: ${size}`).join(', ')}
                                                </p>
                                            );
                                        })()}
                                        {item.deliveryTime && <p>Delivery: {item.deliveryTime}</p>}
                                        {item.easyReturn ? 
                                            <p>Return: {item.returnPolicy || 'Available'}</p> 
                                            : <p>Return: Not Available</p>}
                                        {item.additionalInfo && <p className="text-blue-600">Notes: {item.additionalInfo}</p>}
                                    </div>
                                </div>
                                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                     <div className="border-t pt-4 font-semibold text-base">
                        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.total - order.shippingFee)}</span></div>
                        <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(order.shippingFee)}</span></div>
                        <div className="flex justify-between text-lg"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                    </div>
                </div>
                <div className="text-right mt-6">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

const ManageOrders = () => {
    const { userData } = useAuth();
    const { myOrders: orders, updateOrderStatus, deleteOrder, isLoading, settings, vendorsMap } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        if (!userData || orders.length === 0) return;
        
        // Find the maximum createdAt timestamp in current orders
        const maxTime = Math.max(...orders.map(o => o.createdAt || 0));
        if (maxTime > 0) {
            if (userData.role === 'admin') {
                localStorage.setItem('adminLastSeenOrderTime', maxTime.toString());
            } else if (userData.role === 'vendor') {
                localStorage.setItem(`vendorLastSeenOrderTime_${userData.uid}`, maxTime.toString());
            }
            // Trigger storage event or custom event so layout sidebar gets notified immediately
            window.dispatchEvent(new Event('orderSeenUpdate'));
        }
    }, [orders, userData]);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchTermLower = safeLower(searchTerm);
            const displayId = safeLower(getDisplayOrderId(order));
            const matchesSearch = safeLower(order.customerName).includes(searchTermLower) || safeLower(order.customerPhone).includes(searchTermLower) || safeLower(order.id).includes(searchTermLower) || displayId.includes(searchTermLower);
            const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, statusFilter]);
    
    const handleDelete = (orderId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this order? This action cannot be undone.')) {
            deleteOrder(orderId);
        }
    };

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Manage Orders</h1>
            <div className="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-col md:flex-row gap-4">
                <Input
                    placeholder="Search by name, phone, or ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-grow"
                />
                <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    className="mt-1 block w-full md:w-auto px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-sm"
                >
                    <option value="All">All Statuses</option>
                    {Object.values(OrderStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>
            
             {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {isLoading && orders.length === 0 ? (
                    <div className="text-center p-8"><Spinner/></div>
                ) : filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-lg shadow-sm p-3 space-y-2 text-sm">
                         <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-gray-800">{order.customerName}</p>
                                <p className="text-xs text-gray-500">{order.customerPhone}</p>
                                <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <p className="font-bold text-base text-pink-600">{formatCurrency(order.total)}</p>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                             <select
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                                className={`text-xs rounded-full px-2 py-1 border-2 focus:outline-none ${
                                    order.status === OrderStatus.Delivered ? 'bg-green-100 text-green-800 border-green-200' :
                                    order.status === OrderStatus.Cancelled ? 'bg-red-100 text-red-800 border-red-200' :
                                    'bg-yellow-100 text-yellow-800 border-yellow-200'
                                }`}
                            >
                                {Object.values(OrderStatus).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} title="View Details"><Icons.eye className="w-5 h-5"/></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(order, settings, vendorsMap)} title="Download Invoice"><Icons.download className="w-5 h-5"/></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(order.id)} className="text-red-600" title="Delete Order"><Icons.trash className="w-5 h-5"/></Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <th className="p-3">Customer</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading && orders.length === 0 ? (
                             <tr><td colSpan={6} className="text-center p-8"><Spinner/></td></tr>
                        ) : filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 text-sm">
                                <td className="p-3 font-medium">{order.customerName}</td>
                                <td className="p-3 text-gray-600">{order.customerPhone}</td>
                                <td className="p-3 font-semibold text-gray-800">{formatCurrency(order.total)}</td>
                                <td className="p-3 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className="p-3">
                                     <select
                                        value={order.status}
                                        onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                                        className={`text-xs rounded-full px-2 py-1 border-2 focus:outline-none ${
                                            order.status === OrderStatus.Delivered ? 'bg-green-100 text-green-800 border-green-200' :
                                            order.status === OrderStatus.Cancelled ? 'bg-red-100 text-red-800 border-red-200' :
                                            order.status === OrderStatus.OnTheWay ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                                        }`}
                                    >
                                        {Object.values(OrderStatus).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSelectedOrder(order)} className="text-blue-600 hover:text-blue-800" title="View Details"><Icons.eye className="w-5 h-5"/></button>
                                        <button onClick={() => handleDownloadInvoice(order, settings, vendorsMap)} className="text-gray-600 hover:text-gray-800" title="Download Invoice"><Icons.download className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(order.id)} className="text-red-600 hover:text-red-800" title="Delete Order"><Icons.trash className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredOrders.length === 0 && !isLoading && (
                    <p className="text-center p-8 text-gray-500">No orders found.</p>
                )}
            </div>
             <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        </div>
    );
};

export default ManageOrders;