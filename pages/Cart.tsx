import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { formatCurrency, generateCartItemKey } from '../utils/helpers';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { Button } from '../components/ui/Button';
import { Icons } from '../components/icons/Icons';

const Cart = () => {
  const { cart, updateCartQuantity, removeFromCart, settings } = useStore();
  const navigate = useNavigate();

  const rawSubtotal = cart.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
  const subtotal = isNaN(rawSubtotal) ? 0 : rawSubtotal;
  
  // Calculate shipping fee from cart items or settings fallback
  let shippingFee = cart.reduce((sum, item) => {
    const itemFee = Number(item.shippingFee);
    return sum + (isNaN(itemFee) ? 0 : itemFee);
  }, 0);
  
  if (shippingFee === 0 && settings?.shippingFee !== undefined) {
    const settingsFee = Number(settings.shippingFee);
    shippingFee = isNaN(settingsFee) ? 0 : settingsFee;
  }

  const total = subtotal + (isNaN(shippingFee) ? 0 : shippingFee);

  if (cart.length === 0) {
    return (
      <div className="text-center py-16">
        <Icons.shoppingCart className="w-24 h-24 mx-auto text-gray-300" />
        <h2 className="mt-6 text-2xl font-bold text-gray-800">Your cart is empty</h2>
        <p className="mt-2 text-gray-500">Looks like you haven't added anything to your cart yet.</p>
        <Button onClick={() => navigate('/')} className="mt-6">Start Shopping</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Your Cart</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.map(item => (
            <div key={generateCartItemKey(item)} className="bg-white p-2 rounded-lg shadow-sm flex items-center gap-3">
              <ImageWithFallback src={item.image} alt={item.name} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md" />
              <div className="flex-grow">
                <Link to={`/product/${item.id}`} className="font-semibold text-base sm:text-lg hover:text-teal-600 line-clamp-2">{item.name}</Link>
                {item.selectedSizes && Object.entries(item.selectedSizes).length > 0 && (
                    <div className="text-xs sm:text-sm text-gray-500">
                        {Object.entries(item.selectedSizes).map(([category, size]) => (
                            <span key={category} className="mr-2">{category}: <strong>{size}</strong></span>
                        ))}
                    </div>
                )}
                <p className="text-gray-500 text-sm sm:text-base">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button type="button" variant="ghost" size="xs" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors" onClick={() => updateCartQuantity(item.id, item.quantity - 1, item.selectedSizes)} aria-label="Decrease quantity">
                    <Icons.minus className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <span className="font-semibold text-sm sm:text-base w-6 sm:w-8 text-center">{item.quantity}</span>
                <Button type="button" variant="ghost" size="xs" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors" onClick={() => updateCartQuantity(item.id, item.quantity + 1, item.selectedSizes)} aria-label="Increase quantity">
                    <Icons.plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
              <p className="font-bold w-20 sm:w-24 text-right text-sm sm:text-base">{formatCurrency(item.price * item.quantity)}</p>
              <Button 
                type="button" 
                variant="ghost" 
                size="xs" 
                className="w-8 h-8 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-100"
                onClick={() => removeFromCart(item.id, item.selectedSizes)} 
                aria-label="Remove item"
              >
                <Icons.trash className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow-sm sticky top-24">
            <h2 className="text-2xl font-bold border-b pb-3 mb-3">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Fee</span>
                <span>{formatCurrency(shippingFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-xl border-t pt-3 mt-3">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <Button onClick={() => navigate('/checkout')} className="w-full mt-4" size="lg">Proceed to Checkout</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;