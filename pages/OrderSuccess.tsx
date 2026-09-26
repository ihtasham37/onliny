import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useStore } from '../hooks/useStore';
import { Icons } from '../components/icons/Icons';
import { formatCurrency, getSelectedSizesEntries, printHtmlContent, getDisplayOrderId, getBaseAppUrl } from '../utils/helpers';

const DownloadAppBanner = () => {
    const { settings } = useStore();

    if (!settings?.appDownloadUrl || settings?.showGetApp === false) {
        return null;
    }
    
    return (
        <div className="bg-[#2c3e50] text-white p-8 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
            <Icons.download className="w-12 h-12 mb-4 opacity-75" />
            <h2 className="text-3xl font-bold mb-2">Download Our App</h2>
            <p className="mb-6 opacity-90 max-w-xs">
                Get the full experience, track orders, and receive exclusive offers.
            </p>
            <Link to="/download-app" className="w-full max-w-xs">
                <Button
                    variant="secondary"
                    className="w-full !bg-white !text-gray-800 hover:!bg-gray-200"
                    size="lg"
                >
                    Get The App
                </Button>
            </Link>
        </div>
    );
};

const OrderSuccess = () => {
  const location = useLocation();
  const { settings, vendorsMap, customerOrders } = useStore();
  const order = location.state?.order || (() => {
    try {
      const saved = sessionStorage.getItem('last_placed_order') || localStorage.getItem('last_placed_order');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    if (customerOrders && customerOrders.length > 0) return customerOrders[0];
    return null;
  })();

  const handleDownloadCustomerReceipt = () => {
    if (!order) return;

    const origin = getBaseAppUrl(settings);
    const trackingUrl = `${origin}/?track=${encodeURIComponent(order.customerPhone)}${order.email ? `&email=${encodeURIComponent(order.email)}` : ''}`;
    
    // Vendor/Category Store Name & Logo Resolution
    const vendorData = order.vendorId ? vendorsMap?.[order.vendorId] : null;
    const appName = order.storeName || vendorData?.shopName || settings?.appName || 'Online store';
    const storeLogoUrl = order.storeLogoUrl || vendorData?.shopLogoUrl || settings?.logoUrl || '';
    const storeWhatsapp = order.storeWhatsapp || vendorData?.whatsappNumber || settings?.whatsappNumber || '';
    const storeWebUrl = order.storeLink || (order.vendorId ? `${origin}/#/store/v/${encodeURIComponent(order.vendorId)}` : `${origin}/#/`);
    const receiptTypeLabel = order.sourceStoreType === 'vendor' ? 'Official Vendor Store Receipt' : order.sourceStoreType === 'category' ? 'Official Category Store Receipt' : 'Official Customer Order Receipt';

    const paymentMethodDisplay = order.paymentMethod?.toLowerCase() === 'cod' ? 'Cash on Delivery (COD)' : (order.paymentMethod || 'Cash on Delivery');
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
    printHtmlContent(receiptHtml, `Receipt-${getDisplayOrderId(order)}`, appName);
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-4 space-y-6">
      <div className="bg-green-100 p-6 rounded-full">
        <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-800">Order Placed Successfully!</h1>
      <p className="text-gray-600 max-w-md">
        Thank you for your purchase. We've received your order and will process it shortly. You'll receive a confirmation call from our team soon.
      </p>

      {/* Modern Order Receipt Preview */}
      {order && (
        <div className="w-full max-w-md bg-white border rounded-xl shadow-sm text-left p-6 mt-4">
          <div className="border-b pb-3 mb-4 flex justify-between items-center">
            <span className="font-bold text-gray-800">Order Summary</span>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            {order.storeName && (
              <p>
                <strong>Store:</strong>{' '}
                <a href={order.storeLink || (order.vendorId ? `#/store/v/${encodeURIComponent(order.vendorId)}` : '#/')} className="text-rose-600 underline font-semibold">
                  {order.storeName}
                </a>
              </p>
            )}
            <p><strong>Name:</strong> {order.customerName}</p>
            <p><strong>Phone:</strong> {order.customerPhone}</p>
            {order.email && <p><strong>Email:</strong> {order.email}</p>}
            <p><strong>Address:</strong> {order.customerAddress}, {order.city}</p>
            <p><strong>Payment Method:</strong> {order.paymentMethod?.toLowerCase() === 'cod' ? 'Cash on Delivery' : (order.paymentMethod || 'Cash on Delivery')}</p>
            <div className="border-t border-b py-2 my-3 space-y-2">
              <span className="block font-semibold text-gray-800 mb-1">Items:</span>
              {order.items.map((item: any, i: number) => {
                const sizeEntries = getSelectedSizesEntries(item.selectedSizes);
                return (
                  <div key={i} className="flex flex-col text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-800">{item.name} x{item.quantity}</span>
                      <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                    {sizeEntries.length > 0 && (
                      <div className="text-[11px] text-pink-600 font-medium mt-0.5">
                        Selected Sizes: {sizeEntries.map(([cat, size]) => `${cat}: ${size}`).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between font-bold text-base text-gray-800 pt-1">
              <span>Total Bill:</span>
              <span className="text-rose-600">{formatCurrency(order.total)}</span>
            </div>
          </div>
          <Button 
            onClick={handleDownloadCustomerReceipt} 
            variant="outline" 
            className="w-full mt-4 flex items-center justify-center gap-2 border-rose-600 text-rose-600 hover:bg-rose-50"
          >
            <Icons.download className="w-4 h-4" />
            <span>Download Receipt</span>
          </Button>
        </div>
      )}

      <div>
        <Link to="/">
          <Button size="lg" className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 border-none">Continue Shopping</Button>
        </Link>
      </div>
      
      <div className="w-full max-w-lg border-t pt-6">
          <div className="bg-rose-50 border-2 border-rose-200 p-5 rounded-lg">
              <h2 className="text-xl font-bold text-rose-900 font-serif">Track Your Order</h2>
              <p className="mt-2 text-rose-700">You can check the status of your order anytime.</p>
              <Link to="/track-order" className="mt-3 inline-block">
                  <Button className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500">Track My Order</Button>
              </Link>
          </div>
      </div>

      <div className="w-full max-w-lg">
        <DownloadAppBanner />
      </div>
    </div>
  );
};

export default OrderSuccess;
