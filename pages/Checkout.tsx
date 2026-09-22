
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useStandaloneCategory } from '../hooks/useStandaloneCategory';
import { Coupon, OrderStatus, Order } from '../types';
import { formatCurrency, generateCartItemKey, normalizePhone } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Spinner } from '../components/ui/Spinner';
import { Icons } from '../components/icons/Icons';

const provinces = [
    'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan',
    'Gilgit-Baltistan', 'Islamabad Capital Territory', 'Azad Kashmir',
];

type FormFieldProps = {
    name: string;
    label: string;
    error?: string;
    children: React.ReactNode;
};

const FormField: React.FC<FormFieldProps> = ({ name, label, error, children }) => (
    <div>
        <label htmlFor={name} className="block text-xs font-medium text-gray-700">{label}</label>
        {children}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
);

const Checkout = () => {
  const { cart, settings, addOrder, coupons, updateCartQuantity, removeFromCart, trackWithEmailAndPhone, vendorsMap } = useStore();
  const { isStandalone, standaloneType, vendorId, storeName, storeLogoUrl, storeWhatsapp } = useStandaloneCategory();
  const navigate = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    email: '',
    province: '',
    city: '',
    customerAddress: '',
    landmark: '',
    paymentMethod: settings?.paymentMethods?.[0]?.id || 'cod',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cart.length === 0 && !isPlacingOrder) {
      navigate('/cart');
    }
  }, [cart, navigate, isPlacingOrder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'Full name is required.';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone number is required.';
    else if (!/^(03\d{2}|(\+92|92)3\d{2})\d{7}$/.test(formData.customerPhone)) newErrors.customerPhone = 'Please enter a valid Pakistani phone number.';
    if (!formData.province) newErrors.province = 'Please select a province.';
    if (!formData.city.trim()) newErrors.city = 'City is required.';
    if (!formData.customerAddress.trim()) newErrors.customerAddress = 'Full address is required.';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const { subtotal, totalProducts, shippingFee, discountAmount, total } = useMemo(() => {
    const sub = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const prodCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    
    // Calculate shipping fee from cart items or settings fallback
    let shipFee = cart.reduce((sum, item) => {
      const itemFee = Number(item.shippingFee);
      return sum + (isNaN(itemFee) ? 0 : itemFee);
    }, 0);
    
    if (shipFee === 0 && settings?.shippingFee !== undefined) {
      const settingsFee = Number(settings.shippingFee);
      shipFee = isNaN(settingsFee) ? 0 : settingsFee;
    }

    let discAmt = 0;

    if (appliedCoupon) {
      const minBill = Number(appliedCoupon.minBill) || 0;
      const minProducts = Number(appliedCoupon.minProducts) || 0;
      const discountValue = Number(appliedCoupon.discountValue) || 0;
      
      const couponVendorId = appliedCoupon.vendorId || '';
      const couponItems = cart.filter(item => {
        if (couponVendorId) {
          return item.vendorId === couponVendorId;
        } else {
          return !item.vendorId;
        }
      });
      
      const couponSub = couponItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const couponProdCount = couponItems.reduce((acc, item) => acc + item.quantity, 0);

      if (couponSub >= minBill && couponProdCount >= minProducts) {
        if (appliedCoupon.freeShipping) shipFee = 0;
        if (appliedCoupon.discountType === 'flat') {
          discAmt = Math.min(discountValue, couponSub);
        } else {
          discAmt = (couponSub * discountValue) / 100;
        }
      } else {
        setAppliedCoupon(null);
        setCouponError(`Coupon requirements not met for eligible items. Min bill for these items: ${minBill}, Min products: ${minProducts}.`);
      }
    }

    const finalTotal = sub + shipFee - discAmt;
    return { 
      subtotal: isNaN(sub) ? 0 : sub, 
      totalProducts: isNaN(prodCount) ? 0 : prodCount, 
      shippingFee: isNaN(shipFee) ? 0 : shipFee, 
      discountAmount: isNaN(discAmt) ? 0 : discAmt, 
      total: isNaN(finalTotal) ? 0 : finalTotal 
    };
  }, [cart, settings, appliedCoupon]);

  const handleApplyCoupon = () => {
    setCouponError('');
    setAppliedCoupon(null);
    const now = Date.now();
    const coupon = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase() && c.validFrom <= now && c.validTo >= now);
    
    if (coupon) {
      const couponVendorId = coupon.vendorId || '';
      const couponItems = cart.filter(item => {
        if (couponVendorId) {
          return item.vendorId === couponVendorId;
        } else {
          return !item.vendorId;
        }
      });
      
      const couponSub = couponItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const couponProdCount = couponItems.reduce((acc, item) => acc + item.quantity, 0);

      if (couponItems.length === 0) {
        setCouponError('This coupon is not valid for any items currently in your cart.');
      } else if (couponSub >= coupon.minBill && couponProdCount >= coupon.minProducts) {
        setAppliedCoupon(coupon);
        setCouponCode('');
      } else {
        setCouponError(`Your eligible cart items for this coupon do not meet the requirements. Min bill of matching items: ${coupon.minBill}, Min products of matching items: ${coupon.minProducts}.`);
      }
    } else {
      setCouponError('Invalid or expired coupon code.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsPlacingOrder(true);
    try {
      const displayPaymentMethodName = (settings?.paymentMethods || []).find(p => p.id === formData.paymentMethod)?.name || formData.paymentMethod;
      
      // Resolve store name and vendor details for receipt & tracking
      const cartVendorId = vendorId || cart.find(i => i.vendorId)?.vendorId || undefined;
      const allItemVendorIds = Array.from(new Set([
        ...(cartVendorId ? [cartVendorId] : []),
        ...cart.map(i => i.vendorId).filter(Boolean)
      ])) as string[];

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const resolvedStoreLink = cartVendorId 
        ? `${origin}/#/store/v/${encodeURIComponent(cartVendorId)}`
        : `${origin}/#/`;

      const resolvedStoreName = isStandalone && storeName 
        ? storeName 
        : (cartVendorId && vendorsMap?.[cartVendorId]?.shopName)
        ? vendorsMap[cartVendorId].shopName
        : (settings?.appName || 'Online store');
      const resolvedStoreLogo = isStandalone && storeLogoUrl
        ? storeLogoUrl
        : (cartVendorId && vendorsMap?.[cartVendorId]?.shopLogoUrl)
        ? vendorsMap[cartVendorId].shopLogoUrl
        : (settings?.logoUrl || '');
      const resolvedStoreWhatsapp = isStandalone && storeWhatsapp
        ? storeWhatsapp
        : (cartVendorId && vendorsMap?.[cartVendorId]?.whatsappNumber)
        ? vendorsMap[cartVendorId].whatsappNumber
        : (settings?.whatsappNumber || '');

      const order: Omit<Order, 'id' | 'createdAt' | 'customerId'> = {
        ...formData,
        paymentMethod: displayPaymentMethodName,
        items: cart,
        total,
        shippingFee,
        appliedCoupon: appliedCoupon?.code || '',
        discountAmount,
        status: OrderStatus.Pending,
        ...(isStandalone && { sourceStoreType: standaloneType || undefined }),
        ...(cartVendorId && { vendorId: cartVendorId }),
        vendorIds: allItemVendorIds.length > 0 ? allItemVendorIds : ['admin'],
        storeName: resolvedStoreName,
        storeLogoUrl: resolvedStoreLogo,
        storeWhatsapp: resolvedStoreWhatsapp,
        storeLink: resolvedStoreLink,
      };
      const orderId = await addOrder(order);
      const fullOrder = { ...order, id: orderId, createdAt: Date.now() };

      // Save customer info locally for PWA realtime order status notifications
      if (order.customerPhone) {
        try {
          localStorage.setItem('user_last_phone', order.customerPhone);
          const savedOrders = JSON.parse(localStorage.getItem('user_order_ids') || '[]');
          if (!savedOrders.includes(orderId)) {
            savedOrders.push(orderId);
            localStorage.setItem('user_order_ids', JSON.stringify(savedOrders));
          }
        } catch (e) {}
      }

      // Trigger automatic order email alert securely via server API (credentials securely stored on server)
      fetch('/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: fullOrder,
          credentials: {
            adminNotificationEmail: settings?.adminNotificationEmail || settings?.adminEmail || settings?.gmailUser || '',
            appName: settings?.appName || 'Zivio Store'
          }
        }),
      }).catch((emailErr) => {
        console.warn('Background order email delivery error:', emailErr);
      });

      // Automatically set active customer for tracking and notifications
      if (order.email && order.customerPhone) {
          await trackWithEmailAndPhone(order.email, order.customerPhone);
      }
      if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
      }
      navigate('/order-success', { state: { order: fullOrder } });
    } catch (err) {
      console.error("Order placement failed:", err);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const selectedPaymentMethod = useMemo(() => {
    return (settings?.paymentMethods || []).find(p => p.id === formData.paymentMethod);
  }, [settings, formData.paymentMethod]);

  const whatsappConfirmationNumber = useMemo(() => {
    const details = selectedPaymentMethod?.details || '';
    const numberRegex = /(\+92|92|0)?3\d{2}[- ]?\d{7}/;
    const match = details.match(numberRegex);
    return match ? match[0] : settings?.whatsappNumber;
  }, [selectedPaymentMethod, settings]);

  const whatsappLink = `https://wa.me/${normalizePhone(whatsappConfirmationNumber || '')}`;

  if (cart.length === 0) return null;

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-3">Shipping Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField name="customerName" label="Full Name *" error={errors.customerName}>
                <Input id="customerName" name="customerName" value={formData.customerName} onChange={handleChange} required />
              </FormField>
              <FormField name="customerPhone" label="Phone Number *" error={errors.customerPhone}>
                <Input id="customerPhone" name="customerPhone" type="tel" value={formData.customerPhone} onChange={handleChange} required />
              </FormField>
              <FormField name="email" label="Email Address (Optional)" error={errors.email}>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </FormField>
              <FormField name="province" label="Province *" error={errors.province}>
                <select id="province" name="province" value={formData.province} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-rose-200 rounded-xl shadow-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 sm:text-sm">
                  <option value="">Select Province</option>
                  {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField name="city" label="City *" error={errors.city}>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} required />
              </FormField>
              <FormField name="landmark" label="Landmark / Area (Optional)" error={errors.landmark}>
                <Input id="landmark" name="landmark" value={formData.landmark} onChange={handleChange} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField name="customerAddress" label="Full Address (House #, Street, Area) *" error={errors.customerAddress}>
                  <Textarea id="customerAddress" name="customerAddress" value={formData.customerAddress} onChange={handleChange} required rows={3} />
                </FormField>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-xs border border-rose-100">
            <h2 className="text-xl font-bold font-serif text-slate-900 mb-3">Payment Method</h2>
            <div className="space-y-2">
              {(settings?.paymentMethods || []).map(method => (
                <label key={method.id} className="flex items-center p-3 border border-rose-100 rounded-xl cursor-pointer has-[:checked]:bg-rose-50 has-[:checked]:border-rose-400 transition-colors">
                  <input type="radio" name="paymentMethod" value={method.id} checked={formData.paymentMethod === method.id} onChange={handleChange} className="h-4 w-4 text-rose-600 border-rose-300 focus:ring-rose-500"/>
                  <span className="ml-3">
                    <span className="font-semibold text-slate-800">{method.name}</span>
                    <span className="block text-sm text-slate-500">{method.details}</span>
                  </span>
                </label>
              ))}
            </div>
            {selectedPaymentMethod && selectedPaymentMethod.id !== 'cod' && (
              <div className="mt-4 bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 rounded-r-xl flex items-start gap-3">
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 pt-1" aria-label="Send payment confirmation on WhatsApp">
                      <Icons.whatsapp className="w-6 h-6 text-emerald-600" />
                  </a>
                  <div>
                      <h4 className="font-bold">Payment Confirmation: {selectedPaymentMethod.name}</h4>
                      <p className="text-sm mt-1">
                          After payment, please send your screenshot to: <br/>
                          <strong className="font-mono text-slate-900">{whatsappConfirmationNumber}</strong>
                      </p>
                  </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-xl shadow-xs border border-rose-100 sticky top-24">
            <h2 className="text-2xl font-bold font-serif text-slate-900 border-b border-rose-100 pb-3 mb-3">Your Order</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {cart.map(item => (
                <div key={generateCartItemKey(item)} className="border-b border-rose-50 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                      <span className="font-medium text-sm line-clamp-1 flex-grow text-slate-800">{item.name} x {item.quantity}</span>
                      <span className="text-sm font-bold text-rose-700">{formatCurrency(item.price * item.quantity)}</span>
                      <button type="button" onClick={() => removeFromCart(item.id, item.selectedSizes)}><Icons.trash className="w-4 h-4 text-rose-500 hover:text-rose-700"/></button>
                  </div>
                  {item.selectedSizes && Object.entries(item.selectedSizes).length > 0 && (
                    <div className="text-[11px] text-rose-600 font-semibold pl-1 mt-0.5">
                      {Object.entries(item.selectedSizes).map(([cat, size]) => `${cat}: ${size}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-rose-100">
                <div className="flex gap-2">
                    <Input placeholder="Coupon Code" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                    <Button type="button" onClick={handleApplyCoupon} variant="secondary" className="flex-shrink-0">Apply</Button>
                </div>
                {couponError && <p className="text-xs text-red-600 mt-1 font-semibold">{couponError}</p>}
            </div>
            <div className="space-y-2 mt-4 pt-4 border-t border-rose-100 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {appliedCoupon && <div className="flex justify-between text-rose-700 font-bold"><span>Discount ({appliedCoupon.code})</span><span>-{formatCurrency(discountAmount)}</span></div>}
              <div className="flex justify-between text-slate-600"><span>Shipping</span><span>{formatCurrency(shippingFee)}</span></div>
              <div className="flex justify-between font-extrabold text-xl font-serif text-slate-900 border-t border-rose-100 pt-3 mt-3"><span>Total</span><span className="text-rose-700">{formatCurrency(total)}</span></div>
            </div>
            <Button type="submit" className="w-full mt-4 shadow-md py-3 text-base font-bold" size="lg" disabled={isPlacingOrder}>
              {isPlacingOrder ? <Spinner size="sm" /> : `Place Order (${formatCurrency(total)})`}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
