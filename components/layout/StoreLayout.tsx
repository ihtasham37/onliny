

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './Navbar'; // This is now the slim Header
import { Footer } from './Footer'; // This is now the BottomNav
import { Spinner } from '../ui/Spinner';
import { lazyRetry } from '../../utils/lazyLoad';
import { PWAInstallBanner } from '../ui/PWAInstallBanner';
import { useStore } from '../../hooks/useStore';

import Home from '../../pages/Home';
import ProductDetail from '../../pages/ProductDetail';
import Cart from '../../pages/Cart';
import Checkout from '../../pages/Checkout';
import OrderSuccess from '../../pages/OrderSuccess';
import Wishlist from '../../pages/Wishlist';
import TrackOrder from '../../pages/TrackOrder';
import Search from '../../pages/Search';
import CategoriesPage from '../../pages/CategoriesPage';
import CategoryProductsPage from '../../pages/CategoryProductsPage';
import MorePage from '../../pages/MorePage';
import BlogPage from '../../pages/BlogPage';
import BlogPostPage from '../../pages/BlogPostPage';
import CommunityPage from '../../pages/CommunityPage';
import PrivacyPolicy from '../../pages/PrivacyPolicy';
import RefundPolicy from '../../pages/RefundPolicy';
import TermsPage from '../../pages/TermsPage';
import AboutUs from '../../pages/AboutUs';
import VendorStore from '../../pages/VendorStore';
import VendorInfoPage from '../../pages/VendorInfoPage';


const StoreLayout = () => {
  const { settings } = useStore();
  const hasAnnouncement = Boolean(settings?.announcementBanner?.enabled && (settings.announcementBanner.text || settings.announcementBanner.linkUrl));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      <PWAInstallBanner />
      <Navbar />
      <main className={`flex-grow container mx-auto px-3 sm:px-4 ${hasAnnouncement ? 'pt-[150px] sm:pt-[160px]' : 'pt-[110px] sm:pt-[118px]'} pb-24`}>
        <Suspense fallback={<div className="flex justify-center items-center h-96"><Spinner size="lg"/></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/index" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/p/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/search" element={<Search />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:categoryId" element={<CategoryProductsPage />} />
            <Route path="/c/:categoryId" element={<CategoryProductsPage />} />
            <Route path="/store/c/:categoryId/categories" element={<CategoriesPage isStandalone={true} />} />
            <Route path="/store/c/:categoryId" element={<CategoryProductsPage isStandalone={true} />} />
            <Route path="/standalone/:categoryId/categories" element={<CategoriesPage isStandalone={true} />} />
            <Route path="/standalone/:categoryId" element={<CategoryProductsPage isStandalone={true} />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:postId" element={<BlogPostPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/return-policy" element={<RefundPolicy />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/terms-and-conditions" element={<TermsPage />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/about-us" element={<AboutUs />} />
            {/* Vendor Standalone Store Routes */}
            <Route path="/store/v/:vendorId" element={<VendorStore />} />
            <Route path="/store/v/:vendorId/info" element={<VendorInfoPage />} />
            <Route path="/store/v/:vendorId/categories" element={<CategoriesPage isStandalone={true} />} />
            <Route path="/vendor-store/:vendorId" element={<VendorStore />} />
            <Route path="/vendor-store/:vendorId/info" element={<VendorInfoPage />} />
            <Route path="/vendor-store/:vendorId/categories" element={<CategoriesPage isStandalone={true} />} />
            <Route path="/store/:vendorId" element={<VendorStore />} />
            <Route path="/store/:vendorId/info" element={<VendorInfoPage />} />
            {/* Catch-all fallback route to ensure default Home page loads */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default StoreLayout;