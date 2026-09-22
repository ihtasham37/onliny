
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { UserRole } from '../../types';

const VendorAuth = () => {
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

  useEffect(() => {
    if (user && userData) {
      if (userData.role === UserRole.Vendor) {
          if (userData.status === 'active') {
            navigate('/vendor');
          } else if (userData.status === 'suspended') {
            setError('Your business account has been suspended. Please contact the administrator for support.');
            setIsLoading(false);
          } else if (userData.status === 'pending') {
              // Stay here and show pending UI
          }
      } else if (userData.role === UserRole.Admin) {
          navigate('/admin');
      }
    }
  }, [user, userData, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin) {
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
        await login(email, password);
      } else {
        await vendorRegister(email, password, shopName, firstName, lastName, whatsappNumber);
        setIsPendingApproval(true);
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
          setError('Invalid email or password.');
      } else {
          setError(msg);
      }
      setIsLoading(false);
    }
  };

  if (isPendingApproval) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-rose-50/50 px-4">
        <div className="w-full max-w-md p-8 text-center bg-white rounded-3xl shadow-xl border border-rose-100">
           <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                <Icons.clock className="w-10 h-10" />
            </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Pending Approval</h1>
          <p className="text-gray-600 mt-4">
            Your registration for <span className="font-bold text-rose-600">"{userData?.shopName || shopName}"</span> has been submitted.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            The administrator will review your request shortly. You will be able to access your panel once approved.
          </p>
          <div className="mt-8">
            <Link to="/">
              <Button className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white border-none">Back to Store</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-rose-50/50 px-4 py-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-3xl shadow-xl border border-rose-100">
        <div className="text-center">
            <div className="bg-gradient-to-tr from-rose-500 to-amber-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-rose-200">
                <Icons.store className="w-9 h-9 text-white" />
            </div>
          <h1 className="text-3xl font-bold text-gray-900 font-serif">
              {isLogin ? 'Business Login' : 'Start Your Business'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
              {isLogin ? 'Sign in to manage your shop' : 'Create a vendor account to start selling'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Login
            </button>
            <button 
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Register
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
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
            label="Business Email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="vendor@myshop.com"
          />
          <Input 
            label="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="••••••••"
          />
          {!isLogin && (
              <Input 
                label="Confirm Password" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                placeholder="••••••••"
              />
          )}
          {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">{error}</p>}
          <Button type="submit" className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-medium py-3 rounded-xl border-none shadow-md shadow-rose-200" size="lg" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : (isLogin ? 'Sign In' : 'Register Business')}
          </Button>
        </form>
        
         <div className="mt-4 pt-4 border-t flex flex-col gap-3">
             <Link to="/" className="w-full">
                <Button type="button" variant="secondary" className="w-full">
                    Back to Store
                </Button>
            </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorAuth;
