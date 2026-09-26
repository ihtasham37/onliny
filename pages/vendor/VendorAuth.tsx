import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { UserRole } from '../../types';

const VendorAuth = () => {
  const { settings } = useStore();
  const location = useLocation();
  const isVendorRegistrationAllowed = settings?.showVendorPortal !== false && (settings as any)?.allowVendorRegistration !== false;

  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, vendorRegister, user, userData } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // If registration is off, always force Login mode
    if (!isVendorRegistrationAllowed) {
      setIsLogin(true);
    } else if (location.pathname.includes('/register')) {
      setIsLogin(false);
    }
  }, [isVendorRegistrationAllowed, location.pathname]);

  useEffect(() => {
    if (user && userData) {
      if (userData.role === UserRole.Vendor) {
          if (userData.status === 'active') {
            navigate('/vendor', { replace: true });
          } else if (userData.status === 'suspended') {
            setError('Your business account has been suspended. Please contact the administrator for support.');
            setIsLoading(false);
          } else if (userData.status === 'pending') {
              // Stay here and show pending UI
          }
      } else if (userData.role === UserRole.Admin) {
          navigate('/admin', { replace: true });
      }
    }
  }, [user, userData, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin) {
        if (!isVendorRegistrationAllowed) {
            setError('New vendor registration is currently closed by the administrator.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (shopName.length < 3) {
            setError('Shop name must be at least 3 characters');
            return;
        }
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await login(email.trim().toLowerCase(), password);
      } else {
        await vendorRegister(email.trim().toLowerCase(), password, shopName, firstName, lastName, whatsappNumber);
        setIsPendingApproval(true);
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
          setError('Invalid email or password. Please check your credentials.');
      } else {
          setError(msg);
      }
      setIsLoading(false);
    }
  };

  if (isPendingApproval) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-rose-50/40 px-4">
        <div className="w-full max-w-md p-8 text-center bg-white rounded-3xl shadow-xl border border-rose-100">
           <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-xs">
                <Icons.clock className="w-10 h-10" />
            </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Pending Approval</h1>
          <p className="text-gray-600 mt-4 text-sm">
            Your registration for <span className="font-bold text-rose-600">"{userData?.shopName || shopName}"</span> has been submitted.
          </p>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            The administrator will review your request shortly. You will be able to access your vendor panel once approved.
          </p>
          <div className="mt-8">
            <Link to="/">
              <Button className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white border-none py-2.5 rounded-xl font-bold shadow-md shadow-rose-200">
                Back to Store
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-rose-50/40 px-4 py-8 selection:bg-rose-500 selection:text-white">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-white rounded-3xl shadow-xl border border-rose-100">
        <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center mx-auto mb-3.5 shadow-md shadow-rose-200 p-1">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Icons.store className="w-9 h-9 text-white" />
                )}
            </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-serif">
              {isLogin ? (settings?.appName ? `${settings.appName} Login` : 'Account Login') : 'Start Your Business'}
          </h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">
              {isLogin ? 'Sign in to access your Admin or Vendor Dashboard' : 'Create a vendor account to start selling'}
          </p>
        </div>

        {/* Tab Switcher: Only visible when Vendor Registration is enabled in Admin Settings */}
        {isVendorRegistrationAllowed ? (
          <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Sign In
              </button>
              <button 
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Register
              </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && isVendorRegistrationAllowed && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  <Input label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <Input 
                    label="Shop Name" 
                    type="text" 
                    value={shopName} 
                    onChange={(e) => setShopName(e.target.value)} 
                    required 
                    placeholder="My Awesome Store"
                />
                <Input 
                    label="WhatsApp Number" 
                    type="tel" 
                    value={whatsappNumber} 
                    onChange={(e) => setWhatsappNumber(e.target.value)} 
                    required 
                    placeholder="923000000000"
                />
              </>
          )}
          <Input 
            label="Email Address" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="your@email.com"
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-white border border-rose-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <Icons.eyeOff className="w-4 h-4" /> : <Icons.eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {!isLogin && isVendorRegistrationAllowed && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-white border border-rose-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <Icons.eyeOff className="w-4 h-4" /> : <Icons.eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
          )}
          {error && <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">⚠️ {error}</p>}
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold py-3 rounded-xl border-none shadow-md shadow-rose-200" 
            size="lg" 
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                <span>Processing...</span>
              </div>
            ) : (
              <span>{isLogin ? 'Sign In' : 'Register Business'}</span>
            )}
          </Button>
        </form>
        
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2.5 text-center">
            <Link to="/" className="w-full">
                <Button type="button" variant="secondary" className="w-full text-xs font-semibold py-2">
                    ← Back to Storefront (مرکزی اسٹور پر واپس جائیں)
                </Button>
            </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorAuth;
