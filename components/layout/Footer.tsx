import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icons } from '../icons/Icons';
import { useStore } from '../../hooks/useStore';
import { useStandaloneCategory } from '../../hooks/useStandaloneCategory';

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<any>; label: string }) => {
  const { cart } = useStore();
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const isExact = to === "/" || 
    (to.startsWith("/store/c/") && !to.includes("/categories")) || 
    (to.startsWith("/store/v/") && !to.includes("/categories"));

  return (
    <NavLink
      to={to}
      end={isExact}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full relative transition-all group select-none ${
          isActive ? 'text-[#e60067]' : 'text-slate-400 hover:text-[#e60067]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            /* Active State: Clean elevated circle protruding above footer without blurry reflection */
            <div className="flex flex-col items-center justify-center -translate-y-4 sm:-translate-y-4.5 transition-transform duration-300 relative z-20">
              {/* Elevated Floating Button */}
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#d80064] via-[#e60067] to-rose-400 flex items-center justify-center text-white ring-4 ring-white shadow-md transition-all">
                <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white stroke-[2.4]" />
                {label === 'Cart' && cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                    {cartItemCount}
                  </span>
                )}
              </div>
              
              {/* Active Tab Label inside footer */}
              <span className="text-[10px] font-black tracking-tight text-[#e60067] mt-1">
                {label}
              </span>
              {/* Active indicator dot */}
              <span className="w-1.5 h-1.5 rounded-full bg-[#e60067] mt-0.5" />
            </div>
          ) : (
            /* Inactive State: Clean, standard footer layout */
            <div className="flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 transition-all">
              <div className="relative">
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110 text-slate-400 group-hover:text-rose-600" />
                {label === 'Cart' && cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-rose-600 to-amber-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight text-slate-500 group-hover:text-slate-700">
                {label}
              </span>
            </div>
          )}
        </>
      )}
    </NavLink>
  );
};

export const Footer = () => {
  const { isStandalone, standaloneCategory, standaloneType, vendorId, homeUrl } = useStandaloneCategory();

  // Standalone mode (Vendor store or Category store): User sees Home, Categories, Cart, and Track Order dedicated to this store.
  if (isStandalone) {
    const categoriesUrl = standaloneType === 'vendor' && vendorId 
      ? `/store/v/${encodeURIComponent(vendorId)}/categories` 
      : standaloneCategory 
      ? `/store/c/${encodeURIComponent(standaloneCategory.id)}/categories`
      : '/categories';

    return (
      <footer className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur-md border-t border-pink-100 shadow-[0_-2px_15px_rgba(244,63,94,0.08)] overflow-visible">
        <nav className="container mx-auto h-full flex justify-around items-center px-2 max-w-md overflow-visible">
          <NavItem 
            to={homeUrl} 
            icon={Icons.home} 
            label="Home" 
          />
          <NavItem 
            to={categoriesUrl} 
            icon={Icons.category} 
            label="Categories" 
          />
          <NavItem 
            to="/cart" 
            icon={Icons.shoppingCart} 
            label="Cart" 
          />
          <NavItem 
            to="/track-order" 
            icon={Icons.package} 
            label="Track Order" 
          />
        </nav>
      </footer>
    );
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur-md border-t border-pink-100 shadow-[0_-2px_15px_rgba(244,63,94,0.08)] overflow-visible">
      <nav className="container mx-auto h-full flex justify-around items-center px-1 overflow-visible">
        <NavItem to="/" icon={Icons.home} label="Home" />
        <NavItem to="/categories" icon={Icons.category} label="Collections" />
        <NavItem to="/cart" icon={Icons.shoppingCart} label="Cart" />
        <NavItem to="/track-order" icon={Icons.package} label="Track Order" />
        <NavItem to="/more" icon={Icons.more} label="More" />
      </nav>
    </footer>
  );
};
