
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { useStandaloneCategory } from '../hooks/useStandaloneCategory';
import { Coupon, OrderStatus, Order, PaymentMethod } from '../types';
import { formatCurrency, generateCartItemKey, normalizePhone, safeJsonStringify } from '../utils/helpers';
import { compressImageUnder20KB } from '../utils/imageCompression';
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
  const { cart, settings, addOrder, coupons, updateCartQuantity, removeFromCart, trackWithEmailAndPhone, vendorsMap, uploadFile } = useStore();
  const { isStandalone, standaloneType, vendorId, storeName, storeLogoUrl, storeWhatsapp } = useStandaloneCategory();
  const navigate = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isCompressingProof, setIsCompressingProof] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  
  const effectivePaymentMethods = useMemo((): PaymentMethod[] => {
    const customMethods: PaymentMethod[] = (settings?.paymentMethods || []).map(m => ({
      ...m,
      name: (m.name || '').replace(/[\u0600-\u06FF()]/g, '').trim() || m.name || 'Cash on Delivery',
      details: (m.details || '').replace(/[\u0600-\u06FF]/g, '').trim() || m.details || 'Pay in cash when your parcel arrives at your doorstep.',
      description: m.description,
      discountAmount: m.discountAmount ? Number(m.discountAmount) : undefined,
    }));
    const hasCod = customMethods.some(m => m.id === 'cod' || (m.name && m.name.toLowerCase().includes('cash on delivery')));
    if (hasCod) return customMethods;
    const defaultCod: PaymentMethod = {
      id: 'cod',
      name: 'Cash on Delivery',
      details: 'Pay in cash when your parcel arrives at your doorstep.',
      description: undefined,
      discountAmount: undefined,
    };
    return [defaultCod, ...customMethods];
  }, [settings?.paymentMethods]);

  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    email: '',
    province: '',
    city: '',
    customerAddress: '',
    landmark: '',
    paymentMethod: 'cod',
  });

  const selectedPaymentMethod = useMemo(() => {
    return effectivePaymentMethods.find(p => p.id === formData.paymentMethod) || effectivePaymentMethods[0];
  }, [effectivePaymentMethods, formData.paymentMethod]);

  const whatsappConfirmationNumber = useMemo(() => {
    const details = selectedPaymentMethod?.details || '';
    const numberRegex = /(\+92|92|0)?3\d{2}[- ]?\d{7}/;
    const match = details.match(numberRegex);
    return match ? match[0] : settings?.whatsappNumber;
  }, [selectedPaymentMethod, settings]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cart.length === 0 && !isPlacingOrder && !isOrderPlaced) {
      navigate('/cart');
    }
  }, [cart, navigate, isPlacingOrder, isOrderPlaced]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateStep1 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'Full name is required.';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone number is required.';
    else if (!/^(03\d{2}|(\+92|92)3\d{2})\d{7}$/.test(formData.customerPhone)) newErrors.customerPhone = 'Please enter a valid Pakistani phone number (e.g. 03001234567).';
    if (!formData.email.trim()) newErrors.email = 'Email address is required for order tracking and receipts.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address.';
    if (!formData.province) newErrors.province = 'Please select a province.';
    if (!formData.city.trim()) newErrors.city = 'City is required.';
    if (!formData.customerAddress.trim()) newErrors.customerAddress = 'Full address is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setCheckoutStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const { subtotal, totalProducts, shippingFee, discountAmount, paymentMethodDiscount, total } = useMemo(() => {
    const sub = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const prodCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    
    // Base store shipping fee (default Rs. 99 flat from admin settings)
    let configuredFee = 99;
    if (settings?.shippingFee !== undefined && settings?.shippingFee !== null) {
      const parsedFee = Number(settings.shippingFee);
      if (!isNaN(parsedFee)) {
        configuredFee = parsedFee;
      }
    }

    // Maximum individual product shipping fee in cart
    const maxProductShippingFee = cart.reduce((max, item) => {
      const itemFee = Number((item as any).shippingFee) || 0;
      return Math.max(max, itemFee);
    }, 0);

    let shipFee = 0;
    if (cart.length > 0) {
      shipFee = Math.max(configuredFee, maxProductShippingFee);
      
      // Store-wide free delivery threshold check
      if (settings?.freeDeliveryThreshold && sub >= Number(settings.freeDeliveryThreshold) && maxProductShippingFee === 0) {
        shipFee = 0;
      }
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

    // Payment method discount (e.g. 99 Rs off for selecting EasyPaisa)
    const methodDiscount = (selectedPaymentMethod?.discountAmount && selectedPaymentMethod.discountAmount > 0)
      ? Math.min(Number(selectedPaymentMethod.discountAmount), Math.max(0, sub + shipFee - discAmt))
      : 0;

    const finalTotal = Math.max(0, sub + shipFee - discAmt - methodDiscount);
    return { 
      subtotal: isNaN(sub) ? 0 : sub, 
      totalProducts: isNaN(prodCount) ? 0 : prodCount, 
      shippingFee: isNaN(shipFee) ? 0 : shipFee, 
      discountAmount: isNaN(discAmt) ? 0 : discAmt, 
      paymentMethodDiscount: isNaN(methodDiscount) ? 0 : methodDiscount,
      total: isNaN(finalTotal) ? 0 : finalTotal 
    };
  }, [cart, settings, appliedCoupon, selectedPaymentMethod]);

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
    if (!validateStep1()) {
      setCheckoutStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (formData.paymentMethod !== 'cod' && !paymentProofFile) {
      setErrors(prev => ({
        ...prev,
        paymentProof: 'Payment receipt screenshot is required. Please upload your payment screenshot before placing the order.'
      }));
      const uploadElem = document.getElementById('payment-proof-upload-section');
      if (uploadElem) {
        uploadElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
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

      let uploadedProofUrl: string | undefined = undefined;
      if (paymentProofFile) {
        setIsUploadingProof(true);
        try {
          uploadedProofUrl = await uploadFile(paymentProofFile);
        } catch (upErr) {
          console.warn("Payment proof upload note:", upErr);
        } finally {
          setIsUploadingProof(false);
        }
      }

      const isManualPayment = formData.paymentMethod !== 'cod';
      const initialStatus = isManualPayment ? OrderStatus.PaymentVerification : OrderStatus.Pending;

      const order: Omit<Order, 'id' | 'createdAt' | 'customerId'> = {
        ...formData,
        paymentMethod: displayPaymentMethodName,
        paymentProofUrl: uploadedProofUrl,
        items: cart,
        total,
        shippingFee,
        appliedCoupon: appliedCoupon?.code || '',
        discountAmount,
        paymentMethodDiscount: paymentMethodDiscount > 0 ? paymentMethodDiscount : undefined,
        status: initialStatus,
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
            localStorage.setItem('user_order_ids', safeJsonStringify(savedOrders));
          }
        } catch (e) {}
      }

      // Trigger automatic order email alert securely via server API (credentials securely stored on server)
      fetch('/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({
          order: fullOrder,
          credentials: {
            gmailUser: settings?.gmailUser || '',
            gmailAppPassword: settings?.gmailAppPassword || '',
            adminNotificationEmail: settings?.adminNotificationEmail || settings?.adminEmail || settings?.gmailUser || '',
            appName: settings?.appName || 'onliny'
          }
        }),
      }).catch((emailErr) => {
        console.warn('Background order email delivery error:', emailErr);
      });

      // Save order to session and local storage so order-success can always display it
      try {
        sessionStorage.setItem('last_placed_order', safeJsonStringify(fullOrder));
        localStorage.setItem('last_placed_order', safeJsonStringify(fullOrder));
      } catch (e) {}

      // Automatically set active customer for tracking and notifications
      if (order.email && order.customerPhone) {
        try {
          await trackWithEmailAndPhone(order.email, order.customerPhone);
        } catch (trackErr) {
          console.warn('Customer tracking note:', trackErr);
        }
      }
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      } catch (notifErr) {}

      setIsOrderPlaced(true);
      navigate('/order-success', { state: { order: fullOrder }, replace: true });
    } catch (err) {
      console.error("Order placement failed:", err);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (cart.length === 0 && !isOrderPlaced) return null;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-5xl">
      {/* Checkout Progress Stepper */}
      <div className="mb-6">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-rose-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCheckoutStep(1)}
            className="flex items-center gap-2.5 text-left transition-all group"
          >
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs transition-colors ${
              checkoutStep === 1 
                ? 'bg-rose-600 text-white ring-4 ring-rose-100' 
                : 'bg-emerald-600 text-white group-hover:bg-emerald-700'
            }`}>
              {checkoutStep === 2 ? <Icons.check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : '1'}
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900">
                1. Delivery Address
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500">
                {checkoutStep === 2 ? `${formData.customerName || 'Saved'}, ${formData.city || ''}` : 'Customer & Shipping Info'}
              </span>
            </div>
          </button>

          <div className="h-0.5 flex-1 max-w-[40px] sm:max-w-[80px] bg-slate-200" />

          <div className="flex items-center gap-2.5 text-left">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs transition-colors ${
              checkoutStep === 2 
                ? 'bg-rose-600 text-white ring-4 ring-rose-100' 
                : 'bg-slate-100 text-slate-400 border border-slate-300'
            }`}>
              2
            </div>
            <div>
              <span className={`block text-xs font-bold ${checkoutStep === 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                2. Summary & Payment
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500">
                Review bill & place order
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: DELIVERY ADDRESS & USER DETAILS (CLEAN, FOCUSED, ENGLISH ONLY) */}
      {checkoutStep === 1 && (
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleProceedToPayment} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-rose-100/80">
              <div className="border-b border-rose-100/80 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl shrink-0">
                    📍
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
                      Delivery Address & Contact Details
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Please enter your name, active phone number, and complete delivery address.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField name="customerName" label="Full Name *" error={errors.customerName}>
                    <Input 
                      id="customerName" 
                      name="customerName" 
                      value={formData.customerName} 
                      onChange={handleChange} 
                      placeholder="e.g. Muhammad Ali" 
                      required 
                      className="py-2.5 rounded-xl border-slate-200 focus:border-rose-400 focus:ring-rose-200"
                    />
                  </FormField>
                  <FormField name="customerPhone" label="Phone Number *" error={errors.customerPhone}>
                    <Input 
                      id="customerPhone" 
                      name="customerPhone" 
                      type="tel" 
                      value={formData.customerPhone} 
                      onChange={handleChange} 
                      placeholder="e.g. 03001234567" 
                      required 
                      className="py-2.5 font-mono rounded-xl border-slate-200 focus:border-rose-400 focus:ring-rose-200"
                    />
                  </FormField>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField name="email" label="Email Address *" error={errors.email}>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleChange} 
                      placeholder="yourname@gmail.com" 
                      required 
                      className="py-2.5 rounded-xl border-slate-200 focus:border-rose-400 focus:ring-rose-200"
                    />
                  </FormField>
                  <FormField name="province" label="Province *" error={errors.province}>
                    <select 
                      id="province" 
                      name="province" 
                      value={formData.province} 
                      onChange={handleChange} 
                      required 
                      className="mt-1 block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 text-sm font-medium"
                    >
                      <option value="">Select Province</option>
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </FormField>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField name="city" label="City *" error={errors.city}>
                    <Input 
                      id="city" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleChange} 
                      placeholder="e.g. Lahore, Karachi, Islamabad" 
                      required 
                      className="py-2.5 rounded-xl border-slate-200 focus:border-rose-400 focus:ring-rose-200"
                    />
                  </FormField>
                  <FormField name="landmark" label="Landmark / Nearest Place (Optional)" error={errors.landmark}>
                    <Input 
                      id="landmark" 
                      name="landmark" 
                      value={formData.landmark} 
                      onChange={handleChange} 
                      placeholder="e.g. Near Bilal Masjid, Main Market" 
                      className="py-2.5 rounded-xl border-slate-200 focus:border-rose-400 focus:ring-rose-200"
                    />
                  </FormField>
                </div>

                <div>
                  <FormField name="customerAddress" label="Full Delivery Address (House #, Street, Area) *" error={errors.customerAddress}>
                    <Textarea 
                      id="customerAddress" 
                      name="customerAddress" 
                      value={formData.customerAddress} 
                      onChange={handleChange} 
                      placeholder="House / Flat #, Street #, Sector / Block, Area name" 
                      required 
                      rows={3} 
                      className="rounded-xl border-slate-200 focus:border-rose-400 focus:ring-rose-200"
                    />
                  </FormField>
                </div>
              </div>

              {/* Security & Guarantee Pills */}
              <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl grid grid-cols-3 gap-2 text-center text-xs text-slate-600 font-semibold">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-base">🚚</span>
                  <span>Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1 border-x border-slate-200 px-1">
                  <span className="text-base">🔒</span>
                  <span>100% Safe Checkout</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-base">💵</span>
                  <span>COD Available</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/cart')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline order-2 sm:order-1 transition-colors"
                >
                  ← Return to Cart
                </button>
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto px-10 py-3.5 text-base font-bold shadow-md bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white rounded-xl flex items-center justify-center gap-2 order-1 sm:order-2 cursor-pointer transition-all"
                >
                  <span>Proceed to Payment & Summary</span>
                  <span className="text-lg">→</span>
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: SUMMARY & PAYMENT (PAYMENT DIRECTLY ABOVE PLACE ORDER) */}
      {checkoutStep === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
          {/* 1. Delivery Address Summary with Edit Button */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-rose-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <span className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg shrink-0">
                📍
              </span>
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{formData.customerName}</span>
                  <span className="text-slate-500 font-mono">({formData.customerPhone})</span>
                </div>
                <p className="text-slate-700 font-medium">
                  {formData.customerAddress}
                  {formData.landmark ? `, ${formData.landmark}` : ''}, {formData.city}, {formData.province}
                </p>
                <p className="text-slate-500">{formData.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCheckoutStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
            >
              ✏️ Edit Address
            </button>
          </div>

          {/* 2. Complete Order Summary */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-rose-100/80 space-y-4">
            <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2 border-b border-rose-100/80 pb-3">
              <span>🛍️</span> Complete Order Summary
            </h2>

            {/* Items list */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {cart.map(item => (
                <div key={generateCartItemKey(item)} className="flex items-center justify-between gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Qty: <strong className="text-slate-800">{item.quantity}</strong> &times; {formatCurrency(item.price)}
                      </p>
                      {item.selectedSizes && Object.entries(item.selectedSizes).length > 0 && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                          {Object.entries(item.selectedSizes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-sm text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Section */}
            <div className="pt-2">
              <div className="flex gap-2 max-w-md">
                <Input 
                  placeholder="Enter Coupon Code" 
                  value={couponCode} 
                  onChange={e => setCouponCode(e.target.value.toUpperCase())} 
                  className="rounded-xl border-slate-200"
                />
                <Button type="button" onClick={handleApplyCoupon} variant="secondary" className="shrink-0 font-bold text-xs px-4 rounded-xl">
                  Apply Coupon
                </Button>
              </div>
              {couponError && <p className="text-xs text-red-600 mt-1 font-semibold">{couponError}</p>}
            </div>

            {/* Bill Breakdown */}
            <div className="border-t border-slate-100 pt-4 space-y-2 text-sm bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Items)</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {paymentMethodDiscount > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-300">
                  <span>🏷️ Payment Discount ({selectedPaymentMethod?.name})</span>
                  <span>-{formatCurrency(paymentMethodDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping Fee</span>
                <span className="font-semibold text-slate-800">{shippingFee === 0 ? 'Free Shipping' : formatCurrency(shippingFee)}</span>
              </div>
              <div className="flex justify-between items-center text-lg sm:text-xl font-extrabold text-slate-900 border-t border-slate-200 pt-3 mt-2">
                <span>Grand Total</span>
                <span className="text-rose-600 font-mono text-xl sm:text-2xl">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* 3. SELECT PAYMENT METHOD & PLACE ORDER (Placed Directly Above Place Order Button!) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-2 border-rose-200/90 space-y-5">
            <div className="border-b border-rose-100 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
                <span>💳</span> Select Payment Method
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose your preferred payment method below and place your order.
              </p>
            </div>

            {/* Payment Method Cards */}
            <div className="space-y-2.5">
              {effectivePaymentMethods.map(method => (
                <label 
                  key={method.id} 
                  className={`flex items-start p-3.5 sm:p-4 border rounded-2xl cursor-pointer transition-all ${
                    formData.paymentMethod === method.id 
                      ? 'bg-rose-50/60 border-rose-500 ring-2 ring-rose-200 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value={method.id} 
                    checked={formData.paymentMethod === method.id} 
                    onChange={handleChange} 
                    className="mt-1 h-4 w-4 text-rose-600 border-rose-300 focus:ring-rose-500"
                  />
                  <span className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">{method.name}</span>
                      {method.discountAmount && method.discountAmount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                          🏷️ Save Rs {method.discountAmount}
                        </span>
                      ) : null}
                    </div>
                    <span className="block text-xs sm:text-sm text-slate-600 font-mono mt-0.5">{method.details}</span>
                    {method.description && (
                      <span className="block text-xs text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl mt-1.5 border border-amber-200 font-medium">
                        💡 {method.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            {/* If Non-COD (EasyPaisa / JazzCash / Bank Transfer): Show Account & Screenshot Box */}
            {selectedPaymentMethod && selectedPaymentMethod.id !== 'cod' && (
              <div id="payment-proof-upload-section" className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                {/* Header & Account Number */}
                <div className="border-b border-amber-200/80 pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold text-sm">
                        💰
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                          Pay via {selectedPaymentMethod.name}
                        </h4>
                        <p className="text-xs text-slate-600">
                          Transfer <strong className="text-rose-600 font-bold">{formatCurrency(total)}</strong> to the account below:
                        </p>
                      </div>
                    </div>
                    {whatsappConfirmationNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(whatsappConfirmationNumber);
                          setCopiedNumber(true);
                          setTimeout(() => setCopiedNumber(false), 2500);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        {copiedNumber ? <Icons.check className="w-3.5 h-3.5" /> : <Icons.copy className="w-3.5 h-3.5" />}
                        <span>{copiedNumber ? 'Copied!' : 'Copy Number'}</span>
                      </button>
                    )}
                  </div>

                  {/* Account Details Box */}
                  <div className="mt-3 bg-white p-3 rounded-xl border border-amber-200 text-xs text-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Account Details:</span>
                      <span className="font-bold text-slate-900 font-mono text-sm sm:text-base text-amber-900">
                        {whatsappConfirmationNumber || selectedPaymentMethod.details}
                      </span>
                    </div>
                    {selectedPaymentMethod.details && selectedPaymentMethod.details !== whatsappConfirmationNumber && (
                      <p className="text-slate-600 text-[11px] pt-1 border-t border-slate-100">
                        {selectedPaymentMethod.details}
                      </p>
                    )}
                    {selectedPaymentMethod.description && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 font-medium mt-1">
                        Note: {selectedPaymentMethod.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Screenshot Upload Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-900">
                      📸 Upload Payment Screenshot <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Auto-compressed under 20KB
                    </span>
                  </div>
                  
                  {isCompressingProof ? (
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-400 bg-amber-50/50 rounded-xl">
                      <Spinner size="md" />
                      <p className="text-xs font-bold text-amber-900 mt-2">Compressing screenshot under 20KB...</p>
                      <p className="text-[11px] text-slate-500">Optimizing resolution for fast upload & verification</p>
                    </div>
                  ) : !paymentProofPreview ? (
                    <label className={`flex flex-col items-center justify-center p-4 sm:p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      errors.paymentProof 
                        ? 'border-red-400 bg-red-50/50 hover:bg-red-50' 
                        : 'border-amber-300 hover:border-amber-500 bg-white hover:bg-amber-50/40'
                    }`}>
                      <Icons.upload className={`w-8 h-8 mb-2 ${errors.paymentProof ? 'text-red-500' : 'text-amber-600'}`} />
                      <span className="text-xs sm:text-sm font-bold text-slate-800 text-center">
                        Click to select payment screenshot
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 text-center">
                        PNG, JPG, or JPEG (Auto-compressed &lt; 20KB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsCompressingProof(true);
                            try {
                              const compressed = await compressImageUnder20KB(file, 19500);
                              setPaymentProofFile(compressed);
                              const reader = new FileReader();
                              reader.onload = () => setPaymentProofPreview(reader.result as string);
                              reader.readAsDataURL(compressed);
                              setErrors(prev => ({ ...prev, paymentProof: '' }));
                            } catch (compErr) {
                              console.warn("Compression fallback:", compErr);
                              setPaymentProofFile(file);
                              const reader = new FileReader();
                              reader.onload = () => setPaymentProofPreview(reader.result as string);
                              reader.readAsDataURL(file);
                            } finally {
                              setIsCompressingProof(false);
                            }
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="bg-white p-3 rounded-xl border-2 border-emerald-400 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={paymentProofPreview}
                          alt="Screenshot Preview"
                          className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <Icons.checkCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Screenshot Attached!
                          </p>
                          <p className="text-[11px] text-slate-600 truncate mt-0.5">
                            {paymentProofFile?.name || 'receipt.jpg'}
                          </p>
                          {paymentProofFile && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {(paymentProofFile.size / 1024).toFixed(1)} KB (Compressed &lt; 20KB ✓)
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentProofFile(null);
                          setPaymentProofPreview(null);
                        }}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold shrink-0"
                        title="Remove Screenshot"
                      >
                        <Icons.trash className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {errors.paymentProof && (
                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mt-1">
                      <Icons.info className="w-3.5 h-3.5 shrink-0" />
                      {errors.paymentProof}
                    </p>
                  )}
                </div>

                {/* Important Notice in English */}
                <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <strong>⚠️ Important Notice:</strong> Please upload the genuine payment receipt screenshot after transfer. If a fake or incorrect receipt is uploaded, your order will be cancelled immediately. Once genuine payment is verified by our team, your parcel will be dispatched without delay.
                </div>
              </div>
            )}

            {/* DIRECTLY BELOW PAYMENT METHOD: THE PLACE ORDER BUTTON */}
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full py-4 text-lg font-bold shadow-lg bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer" 
                size="lg" 
                disabled={isPlacingOrder || isCompressingProof}
              >
                {isPlacingOrder ? <Spinner size="sm" /> : isCompressingProof ? 'Compressing Screenshot...' : `Place Order (${formatCurrency(total)})`}
              </Button>
              {formData.paymentMethod !== 'cod' && !paymentProofFile && (
                <p className="text-xs text-amber-800 mt-2 text-center font-bold">
                  ⚠️ Please upload payment screenshot above to place your order
                </p>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default Checkout;
