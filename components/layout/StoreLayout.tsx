

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './Navbar'; // This is now the slim Header
import { Footer } from './Footer'; // This is now the BottomNav
import { Spinner } from '../ui/Spinner';
import { lazyRetry } from '../../utils/lazyLoad';
import { PWAInstallBanner } from '../ui/PWAInstallBanner';
import { useStore } from '../../hooks/useStore';

// Replace standard React.lazy with lazyRetry to automatically handle chunk load errors
const Home = lazyRetry(() => import('../../pages/Home'), 'Home');
const ProductDetail = lazyRetry(() => import('../../pages/ProductDetail'), 'ProductDetail');
const Cart = lazyRetry(() => import('../../pages/Cart'), 'Cart');
const Checkout = lazyRetry(() => import('../../pages/Checkout'), 'Checkout');
const OrderSuccess = lazyRetry(() => import('../../pages/OrderSuccess'), 'OrderSuccess');
const Wishlist = lazyRetry(() => import('../../pages/Wishlist'), 'Wishlist');
const TrackOrder = lazyRetry(() => import('../../pages/TrackOrder'), 'TrackOrder');
const Search = lazyRetry(() => import('../../pages/Search'), 'Search');
const CategoriesPage = lazyRetry(() => import('../../pages/CategoriesPage'), 'CategoriesPage');
const CategoryProductsPage = lazyRetry(() => import('../../pages/CategoryProductsPage'), 'CategoryProductsPage');
const MorePage = lazyRetry(() => import('../../pages/MorePage'), 'MorePage');
const BlogPage = lazyRetry(() => import('../../pages/BlogPage'), 'BlogPage');
const BlogPostPage = lazyRetry(() => import('../../pages/BlogPostPage'), 'BlogPostPage');
const CommunityPage = lazyRetry(() => import('../../pages/CommunityPage'), 'CommunityPage');
const PrivacyPolicy = lazyRetry(() => import('../../pages/PrivacyPolicy'), 'PrivacyPolicy');
const RefundPolicy = lazyRetry(() => import('../../pages/RefundPolicy'), 'RefundPolicy');
const TermsPage = lazyRetry(() => import('../../pages/TermsPage'), 'TermsPage');
const AboutUs = lazyRetry(() => import('../../pages/AboutUs'), 'AboutUs');
const VendorStore = lazyRetry(() => import('../../pages/VendorStore'), 'VendorStore');
const VendorInfoPage = lazyRetry(() => import('../../pages/VendorInfoPage'), 'VendorInfoPage');


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
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/search" element={<Search />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:categoryId" element={<CategoryProductsPage />} />
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