import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Icons } from '../components/icons/Icons';
import { formatCurrency, generateCartItemKey, getDisplayOrderId, getSelectedSizesEntries, printHtmlContent, getBaseAppUrl } from '../utils/helpers';
import { Order, OrderStatus } from '../types';

const DownloadAppBanner = () => {
    const { settings } = useStore();

    if (settings?.showGetApp === false) {
        return null;
    }

    if (!settings?.playStoreUrl) {
        return null;
    }

    return (
        <div className="bg-[#2c3e50] text-white p-8 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
            <Icons.download className="w-12 h-12 mb-4 opacity-75" />
            <h2 className="text-2xl font-bold mb-2">Shop Better with Our App</h2>
            <p className="mb-6 opacity-90 max-w-xs text-sm">
                Track your orders instantly and get exclusive app-only discounts.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                {settings?.playStoreUrl && (
                    <a href={settings.playStoreUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-90 transition-opacity">
                        <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                            alt="Get it on Google Play" 
                            className="h-12 mx-auto"
                        />
                    </a>
                )}
            </div>
        </div>
    );
};

const OrderItemCard: React.FC<{ order: Order }> = ({ order }) => {
    const { settings, vendorsMap } = useStore();

    const handleDownloadCustomerReceipt = () => {
        if (!order) return;
    
        const origin = getBaseAppUrl(settings);
        const vendorData = order.vendorId ? vendorsMap?.[order.vendorId] : null;
        const appName = order.storeName || vendorData?.shopName || settings?.appName || 'onliny';
        const storeLogoUrl = order.storeLogoUrl || vendorData?.shopLogoUrl || settings?.logoUrl || '';
        const storeWebUrl = order.storeLink || (order.vendorId ? `${origin}/#/store/v/${encodeURIComponent(order.vendorId)}` : `${origin}/#/`);
        const receiptTypeLabel = order.sourceStoreType === 'vendor' ? 'Official Vendor Store Receipt' : order.sourceStoreType === 'category' ? 'Official Category Store Receipt' : 'Official Customer Order Receipt';
        const paymentMethodDisplay = order.paymentMethod?.toLowerCase() === 'cod' ? 'Cash on Delivery (COD)' : (order.paymentMethod || 'Cash on Delivery');
        const trackingUrl = `${origin}/#/track-order?phone=${encodeURIComponent(order.customerPhone)}${order.email ? `&email=${encodeURIComponent(order.email)}` : ''}`;
        const orderCustomId = getDisplayOrderId(order);
    
        const itemRows = order.items.map((item: any, idx: number) => {
            const sizeEntries = getSelectedSizesEntries(item.selectedSizes);
            const selectedSizes = sizeEntries.length > 0
                ? `<div style="margin-top: 4px; display: inline-block; background-color: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Sizes: ${sizeEntries.map(([cat, size]) => `${cat}: ${size}`).join(' | ')}</div>`
                : '';
            const productUrl = `${origin}/#/product/${encodeURIComponent(item.id)}`;
            return `
            <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
                <td style="padding: 12px 10px; vertical-align: top; width: 68%;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 13px; line-height: 1.4;">${item.name}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                        Qty: <strong style="color: #0f172a;">${item.quantity}</strong> &times; ${formatCurrency(item.price)}
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
    
        const receiptHtml = `
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
                            ${receiptTypeLabel}
                        </div>
                        <div style="font-size: 11px; color: #be185d; font-weight: 600; margin-top: 4px;">
                            🌐 <a href="${storeWebUrl}" target="_blank" style="color: #be185d; font-weight: 700; text-decoration: underline;">${appName}</a>
                        </div>
                    </td>
                    <td style="vertical-align: middle; text-align: right; width: 40%;">
                        <div style="display: inline-block; background-color: #fdf2f8; border: 1px solid #fbcfe8; padding: 4px 10px; border-radius: 8px; text-align: right;">
                            <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #be185d; letter-spacing: 0.5px;">Order Receipt</div>
                            <div style="font-size: 14px; font-weight: 800; color: #0f172a; font-family: monospace;">${orderCustomId}</div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Order Details -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding-right: 8px;">
                            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">Delivered To:</div>
                            <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${order.customerName}</div>
                            <div style="font-size: 12px; color: #334155; line-height: 1.4; margin-top: 2px;">
                                ${order.customerAddress}<br/>
                                ${order.landmark ? `<span style="color: #64748b;">Landmark: ${order.landmark}</span><br/>` : ''}
                                ${order.city}, ${order.province}
                            </div>
                            <div style="font-size: 12px; color: #0f172a; font-weight: 600; margin-top: 4px;">
                                📞 ${order.customerPhone}
                            </div>
                        </td>
                        <td style="width: 50%; vertical-align: top; padding-left: 8px; border-left: 1px solid #e2e8f0;">
                            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">Order Summary:</div>
                            <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">
                                <span style="color: #64748b;">Date:</span> <strong>${new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                            </div>
                            <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">
                                <span style="color: #64748b;">Payment:</span> <strong style="color: #047857;">${paymentMethodDisplay}</strong>
                            </div>
                            <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">
                                <span style="color: #64748b;">Status:</span> <strong style="text-transform: capitalize; color: #be185d;">${order.status}</strong>
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

            <!-- Live Track Box -->
            <div style="margin-top: 20px; padding: 16px; background-color: #fdf2f8; border-radius: 12px; border: 1px solid #fbcfe8; text-align: center;">
                <div style="font-size: 13px; font-weight: 800; color: #9d174d; margin-bottom: 6px;">Live Delivery Status</div>
                <div style="margin-bottom: 6px;">
                    <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #be185d; color: #ffffff !important; padding: 8px 20px; font-size: 12px; font-weight: 700; text-decoration: none; border-radius: 9999px;">
                        Track Order Live &rarr;
                    </a>
                </div>
                <div style="font-size: 11px; color: #701a75;">
                    Phone: <strong>${order.customerPhone}</strong>
                </div>
            </div>

            <div style="margin-top: 24px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px dashed #e2e8f0; padding-top: 12px;">
                <p style="margin: 0;">Thank you for shopping with <strong style="color: #64748b;">${appName}</strong>!</p>
                ${storeWhatsapp ? `<p style="margin: 4px 0 0 0;">Customer Support WhatsApp: <strong style="color: #047857;">${storeWhatsapp}</strong></p>` : '<p style="margin: 4px 0 0 0;">If you have any questions, contact us via WhatsApp or support channel.</p>'}
            </div>
        </div>
        `;
    
        // Generate and trigger text-based PDF via print iframe
        printHtmlContent(receiptHtml, `Receipt-${orderCustomId}`, appName);
    };

    const storeDisplayLink = order.storeLink || (order.vendorId ? `#/store/v/${encodeURIComponent(order.vendorId)}` : '#/');

    return (
        <div className="bg-white p-4 rounded-xl shadow-xs border border-rose-100 hover:border-rose-200 transition-all">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900">Your Order</h3>
                    {order.storeName && (
                        <p className="text-xs text-rose-600 font-semibold mb-0.5">
                            Store: <a href={storeDisplayLink} className="underline">{order.storeName}</a>
                        </p>
                    )}
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    order.status === OrderStatus.Delivered ? 'bg-emerald-100 text-emerald-800' :
                    order.status === OrderStatus.Cancelled ? 'bg-rose-100 text-rose-800' :
                    order.status === OrderStatus.Shipped ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                }`}>{order.status}</span>
            </div>
            <div className="border-t border-slate-100 pt-2.5 mt-2 space-y-1">
                {order.items.map(item => (
                    <div key={generateCartItemKey(item)} className="flex justify-between text-xs sm:text-sm py-1">
                        <span className="font-medium text-slate-800">{item.name} &times; {item.quantity}</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                ))}
            </div>
            <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={handleDownloadCustomerReceipt} className="text-rose-600 border-rose-300 hover:bg-rose-50 font-semibold text-xs py-1.5 px-3">
                    <Icons.download className="w-3.5 h-3.5 mr-1.5" /> Download Receipt
                </Button>
                <div className="text-sm font-bold text-rose-600">
                    Total: {formatCurrency(order.total)}
                </div>
            </div>
        </div>
    );
};

const TrackOrder = () => {
    const { activeCustomer, customerOrders, trackWithEmailAndPhone, customerLogout, isLoading: isContextLoading } = useStore();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const refreshCustomerOrders = useCallback(async () => {
        const targetPhone = activeCustomer?.phone || phone;
        const targetEmail = activeCustomer?.email || email;
        if (targetPhone || targetEmail) {
            setIsLoading(true);
            try {
                await trackWithEmailAndPhone(targetEmail, targetPhone);
            } finally {
                setIsLoading(false);
            }
        }
    }, [activeCustomer, phone, email, trackWithEmailAndPhone]);

    useEffect(() => {
        try {
            const searchParams = new URLSearchParams(location.search);
            const hash = window.location.hash || '';
            const hashSearchIndex = hash.indexOf('?');
            const hashParams = hashSearchIndex !== -1 ? new URLSearchParams(hash.substring(hashSearchIndex)) : new URLSearchParams();

            const queryPhone = searchParams.get('phone') || searchParams.get('track') || hashParams.get('phone') || hashParams.get('track') || '';
            const queryEmail = searchParams.get('email') || hashParams.get('email') || '';

            if (queryPhone || queryEmail) {
                if (queryPhone) setPhone(queryPhone);
                if (queryEmail) setEmail(queryEmail);
                setIsLoading(true);
                trackWithEmailAndPhone(queryEmail, queryPhone).finally(() => setIsLoading(false));
            } else if (activeCustomer) {
                // Auto-refresh orders if customer was already saved in localStorage
                refreshCustomerOrders();
            }
        } catch (e) {}
    }, [location.search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const cleanPhone = phone.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanPhone) {
            setError('Phone number is required (فون نمبر لکھنا ضروری ہے).');
            return;
        }

        if (!cleanEmail) {
            setError('Email address is required (ای میل ایڈریس لکھنا ضروری ہے).');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
            setError('Please enter a valid email address (درست ای میل درج کریں).');
            return;
        }

        setIsLoading(true);
        try {
            const success = await trackWithEmailAndPhone(cleanEmail, cleanPhone);
            if (!success) {
                setError('No orders found for this Phone Number and Email. Please check your details and try again.');
            }
        } catch (err) {
            console.error("Tracking Error:", err);
            setError("An error occurred while finding your order. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (activeCustomer && customerOrders.length > 0) {
        return (
            <div className="container mx-auto px-2 sm:px-4 max-w-4xl py-4 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-xs border border-rose-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h1 className="text-2xl font-bold font-serif text-slate-900">Tracked Orders</h1>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Showing orders for Phone: <strong>{activeCustomer.phone}</strong> {activeCustomer.email ? `| Email: ${activeCustomer.email}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={refreshCustomerOrders}
                            disabled={isLoading || isContextLoading}
                            className="text-xs font-semibold flex items-center gap-1.5"
                        >
                            {isLoading ? <Spinner size="sm" /> : <Icons.refresh className="w-3.5 h-3.5" />}
                            <span>Refresh</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={customerLogout}
                            className="text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                            Sign Out / Change
                        </Button>
                    </div>
                </div>

                {isContextLoading || isLoading ? (
                    <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>
                ) : (
                    <div className="space-y-4">
                        {customerOrders.map(order => <OrderItemCard key={order.id} order={order} />)}
                    </div>
                )}

                <div className="mt-8">
                    <DownloadAppBanner />
                </div>
            </div>
        );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 px-2 py-4">
        <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-white rounded-3xl shadow-xl border border-rose-100">
            <div className="text-center space-y-3">
                <div className="inline-block p-4 bg-gradient-to-tr from-rose-100 to-amber-100 rounded-2xl shadow-xs">
                    <Icons.search className="w-10 h-10 text-rose-600" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-serif">Track Your Order</h1>
                <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
                    Enter your Phone Number and Email Address to track your order status live.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Input
                        label="Phone Number / فون نمبر *"
                        type="tel"
                        name="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="03001234567"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Order place karte waqt diya gaya mobile number.</p>
                </div>

                <div>
                    <Input
                        label="Email Address / ای میل ایڈریس *"
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Aapka email address jis par order confirmation bheji gayi.</p>
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                        ⚠️ {error}
                    </div>
                )}

                <Button
                    type="submit"
                    variant="primary"
                    className="w-full !py-3 !text-base bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 border-none shadow-md shadow-rose-200 font-bold rounded-xl"
                    size="lg"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Spinner size="sm" />
                            <span>Tracking Order...</span>
                        </div>
                    ) : (
                        <span>Track Order (آرڈر ٹریک کریں)</span>
                    )}
                </Button>
            </form>
        </div>

        <div className="w-full max-w-md">
            <DownloadAppBanner />
        </div>
      </div>
    );
};

export default TrackOrder;
