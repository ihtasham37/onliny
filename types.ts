

export interface SizeCategory {
  categoryName: string;
  sizes: string[];
}

export interface Category {
  id: string; // Unique ID for the category
  name: string;
  parentId: string | null; // ID of the parent category, null for top-level
  isVisible: boolean;
  imageUrl?: string;
  bannerImageUrls?: string[]; // Changed from bannerImageUrl to support multiple banners
  bannerUrls?: string[]; // Convenience alias for banners
  storeName?: string; // Custom store name for standalone storefront
  storeLogoUrl?: string; // Custom store logo for standalone storefront
  vendorId?: string; // ID of the vendor who owns this category for their standalone store
}

export enum UserRole {
  Admin = "admin",
  Vendor = "vendor"
}

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  shopName?: string;
  shopLogoUrl?: string;
  shopBannerUrl?: string;
  shopBanners?: string[]; // Multiple store banners for standalone vendor website
  shopDescription?: string;
  whatsappNumber?: string;
  description?: string;
  customDomain?: string;
  status: 'pending' | 'active' | 'suspended';
  createdAt: number;
}

export interface Product {
  id: string;
  customId?: string; // Admin-facing custom product identifier
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: string; // Should store category ID now
  subCategory?: string;
  images: string[];
  isVisible: boolean;
  createdAt: number;
  sizeCategories?: SizeCategory[];
  deliveryTime?: string;
  easyReturn?: boolean;
  returnPolicy?: string;
  shippingFee?: number;
  freeDelivery?: boolean;
  vendorId?: string; // ID of the vendor who owns this product
  shopName?: string; // Name of the shop for display
}

export interface CartItem {
  id: string;
  customId?: string; // Carry over custom ID to the cart
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedSizes?: Record<string, string>;
  deliveryTime?: string;
  easyReturn?: boolean;
  returnPolicy?: string;
  additionalInfo?: string;
  shippingFee?: number;
  vendorId?: string;
}

export enum OrderStatus {
  Pending = "Pending",
  OnTheWay = "On The Way",
  Delivered = "Delivered",
  Cancelled = "Cancelled",
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  minBill: number;
  minProducts: number;
  freeShipping: boolean;
  validFrom: number; // Storing as timestamp
  validTo: number;   // Storing as timestamp
  assignment: 'banner' | 'product' | 'both' | 'none';
  vendorId?: string; // null or empty for admin coupons
  createdAt: number;
}

export interface Challan {
  id: string;
  bankAccount: string;
  amount: number;
  description: string;
  vendorIds: string[]; // IDs of vendors this challan is sent to
  createdAt: number;
}


export interface Order {
  id:string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  province: string;
  city: string;
  landmark?: string;
  email: string;
  items: CartItem[];
  total: number;
  shippingFee: number;
  appliedCoupon?: string;
  discountAmount?: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: number;
  vendorIds?: string[]; // IDs of vendors involved in this order
  sourceStoreType?: 'vendor' | 'category' | 'main';
  storeName?: string;
  storeLogoUrl?: string;
  storeWhatsapp?: string;
  storeLink?: string;
  vendorId?: string;
  categoryId?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  details: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  text: string;
  sender: 'user' | 'ai' | 'admin';
  timestamp: number;
}

export interface Banner {
  id: string;
  imageUrl: string;
  redirectUrl?: string;
  isActive: boolean;
  createdAt: number;
  title?: string;
  vendorId?: string; // ID of the vendor who owns this banner for their standalone store
  isPopup?: boolean; // If specifically designated as a popup banner
}

// Type definitions for the new block-based content editor
export type ContentBlock = {
    id: string;
    type: 'heading' | 'text' | 'image' | 'ad' | 'link' | 'youtube';
    content: string; // For heading, text, link text, youtube ID/link
    imageUrl?: string; // For image, ad
    redirectUrl?: string; // For ad, link URL
};

export interface UpdatePost {
    id: string;
    title: string;
    contentBlocks: ContentBlock[]; // Replaces simple content and imageUrl
    createdAt: number;
}

export interface AnnouncementBanner {
    enabled: boolean;
    text: string;
    linkUrl: string;
    buttonText?: string;
}

export interface PopupBannerSettings {
    enabled: boolean;
    imageUrl: string;
    redirectUrl?: string;
    title?: string;
}

export interface BannerProductItem {
    id: string;
    productId: string;
    placement: 'home' | string; // 'home' or category id (e.g. 'cat_123')
    customDiscountBadge?: string;
    backgroundColor?: string; // Custom hex color e.g. '#2b0914' or undefined for auto photo match
    backgroundMode?: 'auto' | 'custom';
    isActive: boolean;
    createdAt: number;
}

export interface Settings {
    bannerUrls: string[];
    shippingFee: number; // No longer used in UI, kept for data structure
    whatsappNumber: string;
    paymentMethods: PaymentMethod[];
    categories?: Category[];
    sizeCategories?: SizeCategory[];
    adminEmail?: string;
    appName?: string; // New field for app name
    storeDomain?: string; // Custom store domain (e.g. https://mybrand.com)
    logoUrl?: string; // New field for custom logo URL
    storeBannerUrl?: string; // New field for official store banner URL
    appDownloadUrl?: string; // App download URL
    appFileName?: string; // App download file name
    whatsappGroupUrl?: string;
    whatsappChannelUrl?: string;
    telegramChannelUrl?: string;
    youtubeChannelUrl?: string;
    instagramChannelUrl?: string;
    facebookPageUrl?: string;
    showJoinCommunity?: boolean;
    showLatestUpdates?: boolean;
    showGetApp?: boolean;
    showContactWhatsapp?: boolean;
    showContactEmail?: boolean;
    showVendorPortal?: boolean; // Controls visibility of Vendor Portal button and access to Vendor Registration
    playStoreUrl?: string;
    adminNotificationEmail?: string;
    gmailUser?: string;
    gmailAppPassword?: string;
    brevoApiKey?: string;
    brevoSenderEmail?: string;
    enableOrderEmailAlerts?: boolean;
    announcementBanner?: AnnouncementBanner;
    popupBanner?: PopupBannerSettings;
    bannerProducts?: BannerProductItem[];
    globalReturnPolicy?: string; // Global return and refund policy (Markaz-style 7-day policy by default)
}

export interface AppNotification {
    id: string;
    userId: string; // 'admin' or customer ID
    title: string;
    message: string;
    type: 'order_placed' | 'order_status_changed';
    link?: string;
    isRead: boolean;
    createdAt: number;
}

export interface RagProductScore {
    id: string;
    matchScore: number;
    matchReason?: string;
}

export interface RagSearchResponse {
    detectedIntent: string;
    detectedCategory: string;
    suggestedKeywords: string[];
    aiSummary: string;
    rankedProductIds: RagProductScore[];
}
