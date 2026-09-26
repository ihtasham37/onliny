
import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { useStore } from '../../hooks/useStore';
import { UserRole } from '../../types';

const Dashboard = React.lazy(() => import('./Dashboard'));
const ManageProducts = React.lazy(() => import('./ManageProducts'));
const ManageCategories = React.lazy(() => import('./ManageCategories'));
const CategoryProducts = React.lazy(() => import('./CategoryProducts'));
const ManageOrders = React.lazy(() => import('./ManageOrders'));
const Settings = React.lazy(() => import('./Settings'));
const ManageCoupons = React.lazy(() => import('./ManageCoupons'));
const ManageBanners = React.lazy(() => import('./ManageBanners'));
const ManageBlog = React.lazy(() => import('./ManageBlog')); // Renamed from ManageUpdates
const ManageVendors = React.lazy(() => import('./ManageVendors'));
const ManageChallans = React.lazy(() => import('./ManageChallans'));
const ManageUserDetails = React.lazy(() => import('./ManageUserDetails'));

type SidebarLinkProps = {
    to: string;
    children: React.ReactNode;
    badge?: number;
    icon?: React.ReactNode;
};

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, children, badge, icon }) => {
    const location = useLocation();
    const fullPath = `/admin${to === '/' ? '' : to}`;
    const isActive = location.pathname.startsWith(fullPath) && (to !== '/' || location.pathname === '/admin');

    return (
        <Link 
            to={`/admin${to === '/' ? '' : to}`} 
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all relative text-sm ${
                isActive 
                ? 'bg-gradient-to-r from-rose-500/25 to-amber-500/15 text-rose-300 font-bold border-l-4 border-rose-500 shadow-sm' 
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
        >
            <div className="flex items-center gap-3 min-w-0">
                {icon && <span className={`shrink-0 ${isActive ? 'text-rose-400' : 'text-slate-400'}`}>{icon}</span>}
                <span className="font-medium truncate">{children}</span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span className="bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center shadow-sm shrink-0">
                    {badge}
                </span>
            )}
        </Link>
    );
};

const getPageTitle = (pathname: string) => {
    if (pathname.endsWith('/admin')) return 'Dashboard';
    if (pathname.includes('/products')) return 'Manage Products';
    if (pathname.startsWith('/admin/categories/')) return 'Category Products';
    if (pathname.includes('/categories')) return 'Manage Categories';
    if (pathname.includes('/orders')) return 'Manage Orders';
    if (pathname.includes('/coupons')) return 'Manage Coupons';
    if (pathname.includes('/banners')) return 'Manage Banners';
    if (pathname.includes('/updates')) return 'Manage Articles';
    if (pathname.includes('/challans')) return 'Manage Challans';
    if (pathname.includes('/user-details')) return 'User Details';
    if (pathname.includes('/settings')) return 'Store Settings';
    return 'Admin Panel';
};

const AdminLayout = () => {
  const { logout, user, userData } = useAuth();
  const { 
    settings: appSettings, 
    myOrders, 
    loadOrders,
    exportCatalogSnapshot
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const updateCount = () => {
      const lastSeen = parseInt(localStorage.getItem('adminLastSeenOrderTime') || '0', 10);
      const count = myOrders.filter(o => (o.createdAt || 0) > lastSeen).length;
      setNewOrderCount(count);
    };

    updateCount();

    window.addEventListener('orderSeenUpdate', updateCount);
    return () => window.removeEventListener('orderSeenUpdate', updateCount);
  }, [myOrders]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setIsAuthCheckComplete(true);
      if (!currentUser) {
        navigate('/login', { replace: true });
      }
    });

    const timer = setTimeout(() => {
      setIsAuthCheckComplete(true);
    }, 1500);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [navigate]);

  useEffect(() => {
    if (isAuthCheckComplete) {
      if (!user) {
        navigate('/login', { replace: true });
      } else if (userData) {
        if (userData.role === UserRole.Vendor) {
          navigate('/vendor', { replace: true });
        } else if (userData.role !== UserRole.Admin) {
          navigate('/login', { replace: true });
        }
      }
    }
  }, [isAuthCheckComplete, user, userData, navigate]);

  useEffect(() => {
    if (userData?.role === UserRole.Admin) {
      loadOrders?.();
    }
  }, [userData, loadOrders]);
  
  useEffect(() => {
    if (isSidebarOpen) {
        setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn("Logout error:", err);
    }
    navigate('/login', { replace: true });
  };

  if (!isAuthCheckComplete || !userData || userData.role !== UserRole.Admin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-300">
        <Spinner size="lg" />
        <p className="mt-4 text-xs font-semibold tracking-wider text-rose-400">Verifying Admin Access...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity" 
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`bg-slate-900 text-white w-64 fixed inset-y-0 left-0 md:static md:translate-x-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out z-50 flex flex-col h-full max-h-screen border-r border-slate-800 shadow-2xl md:shadow-none select-none`}>
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80 shrink-0">
            <Link to="/admin" className="flex items-center gap-2.5 text-2xl font-bold text-white tracking-tight min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-md shrink-0">
                    <Icons.sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-serif text-base font-bold bg-gradient-to-r from-white via-rose-100 to-amber-100 bg-clip-text text-transparent truncate">
                    {appSettings?.appName ? `${appSettings.appName} Admin` : 'Online store Admin'}
                </span>
            </Link>
            <button className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800" onClick={() => setIsSidebarOpen(false)}>
              <Icons.x className="w-5 h-5" />
            </button>
        </div>

        {/* Scrollable Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 overscroll-contain">
          <SidebarLink to="/" icon={<Icons.home className="w-4 h-4" />}>Dashboard</SidebarLink>
          <SidebarLink to="/products" icon={<Icons.package className="w-4 h-4" />}>Products</SidebarLink>
          <SidebarLink to="/categories" icon={<Icons.category className="w-4 h-4" />}>Categories</SidebarLink>
          <SidebarLink to="/orders" badge={newOrderCount} icon={<Icons.shoppingCart className="w-4 h-4" />}>Orders</SidebarLink>
          <SidebarLink to="/coupons" icon={<Icons.ticket className="w-4 h-4" />}>Coupons</SidebarLink>
          <SidebarLink to="/banners" icon={<Icons.image className="w-4 h-4" />}>Banners</SidebarLink>
          <SidebarLink to="/updates" icon={<Icons.edit className="w-4 h-4" />}>Articles</SidebarLink>
          <SidebarLink to="/vendors" icon={<Icons.user className="w-4 h-4" />}>Vendors</SidebarLink>
          <SidebarLink to="/challans" icon={<Icons.dollarSign className="w-4 h-4" />}>Manage Challans</SidebarLink>
          <SidebarLink to="/user-details" icon={<Icons.users className="w-4 h-4" />}>User Details</SidebarLink>
          <SidebarLink to="/settings" icon={<Icons.settings className="w-4 h-4" />}>Settings</SidebarLink>
        </nav>

        {/* Bottom Fixed Section */}
        <div className="p-3 border-t border-slate-800/80 shrink-0 bg-slate-900">
             <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl transition-colors text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 text-sm cursor-pointer">
                <Icons.logOut className="w-4 h-4" />
                <span className="font-medium">Logout</span>
            </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
         <header className="bg-white border-b border-slate-200 shadow-xs flex justify-between items-center px-4 py-3">
            <div className="flex items-center gap-3">
              <button className="text-slate-600 md:hidden p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setIsSidebarOpen(true)}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
              </button>
              <h1 className="text-lg md:text-xl font-bold text-slate-800 font-serif">{getPageTitle(location.pathname)}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  setIsSyncing(true);
                  setSyncToast(null);
                  try {
                    const res = await exportCatalogSnapshot();
                    setSyncToast(res);
                    setTimeout(() => setSyncToast(null), 5000);
                  } catch (e: any) {
                    setSyncToast({ success: false, message: e?.message || 'Sync failed' });
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer border border-emerald-400/30"
                title="Publish all products, banners, logo, and settings live to app & website storefront"
              >
                {isSyncing ? (
                  <>
                    <Spinner size="sm" />
                    <span>Syncing Website...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">🔄</span>
                    <span>Sync Website Data</span>
                  </>
                )}
              </button>

              <Link 
                to="/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Open Public Store in new tab"
              >
                <span>🛍️</span>
                <span className="hidden sm:inline">View Store</span>
              </Link>
            </div>
        </header>

        {/* Sync Success / Result Toast Overlay */}
        {syncToast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 border backdrop-blur-md transition-all ${
            syncToast.success 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/80' 
            : 'bg-rose-950/90 text-rose-200 border-rose-500/80'
          }`}>
            <span className="text-base">{syncToast.success ? '✅' : '❌'}</span>
            <span>{syncToast.message}</span>
          </div>
        )}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-3 md:p-6">
            <Suspense fallback={<div className="flex justify-center p-16"><Spinner size="lg"/></div>}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<ManageProducts />} />
                  <Route path="/categories" element={<ManageCategories />} />
                  <Route path="/categories/:categoryName" element={<CategoryProducts />} />
                  <Route path="/orders" element={<ManageOrders />} />
                  <Route path="/coupons" element={<ManageCoupons />} />
                  <Route path="/banners" element={<ManageBanners />} />
                  <Route path="/updates" element={<ManageBlog />} />
                  <Route path="/vendors" element={<ManageVendors />} />
                  <Route path="/challans" element={<ManageChallans />} />
                  <Route path="/user-details" element={<ManageUserDetails />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
            </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;