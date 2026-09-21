import React from 'react';
import { useStore } from '../hooks/useStore';
import { SEO } from '../components/SEO';
import { Icons } from '../components/icons/Icons';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
    const { settings } = useStore();
    const appName = settings?.appName || 'Onliny';
    const email = settings?.adminEmail || 'ali10cart@gmail.com';
    const whatsapp = settings?.whatsappNumber || '';
    const domain = 'onliny.co.uk';

    return (
        <div className="container mx-auto px-4 max-w-3xl py-6 sm:py-10">
            <SEO 
                title={`Privacy Policy | ${appName}`}
                description={`Read the official Privacy Policy for ${appName} (${domain}). Learn how we protect your personal information, handle secure cash on delivery orders, and ensure data privacy.`}
                canonical={`https://${domain}/#/privacy-policy`}
                keywords={[`${appName} privacy policy`, 'data protection', 'online shopping privacy', 'safe shopping Pakistan', domain]}
            />

            <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-rose-100 space-y-6 text-slate-700 leading-relaxed">
                {/* Header */}
                <div className="border-b border-rose-100 pb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold mb-3">
                        <Icons.lock className="w-3.5 h-3.5" />
                        <span>Security &amp; Trust Guarantee</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
                        Privacy Policy
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Effective Date: Last Updated on <strong>September 20, 2026</strong> • Official policy for <strong>{appName}</strong> ({domain})
                    </p>
                </div>

                <div className="space-y-4 text-sm sm:text-base">
                    <p>
                        Welcome to <strong>{appName}</strong> (<a href={`https://${domain}`} className="text-rose-600 font-medium hover:underline">{domain}</a>). 
                        We deeply value your privacy and are committed to safeguarding your personal information. This Privacy Policy outlines what information we collect, how we use it to fulfill your orders, and how your data is protected under modern security standards.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        1. Information We Collect
                    </h2>
                    <p>
                        When you visit our Progressive Web App (PWA) or place an order via Cash on Delivery (COD), we collect essential order processing details:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                        <li><strong>Contact &amp; Delivery Information:</strong> Full Name, active mobile/WhatsApp phone number, exact delivery address, city, and nearest landmark.</li>
                        <li><strong>Email Address:</strong> Used for digital invoice receipts, tracking links, and order status notifications.</li>
                        <li><strong>Device &amp; Usage Data:</strong> Anonymized browser information, device type, and shopping preferences to provide a fast, personalized experience.</li>
                    </ul>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        2. How We Use Your Information
                    </h2>
                    <p>
                        Your details are exclusively used for legitimate e-commerce operations:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                        <li>Processing and delivering your ordered suits, apparel, and lifestyle items to your doorstep.</li>
                        <li>Courier booking and tracking updates via SMS, WhatsApp, or automated email.</li>
                        <li>Verifying order legitimacy prior to dispatch to prevent fake or returned parcels.</li>
                        <li>Providing dedicated customer assistance for returns, refunds, or product inquiries.</li>
                    </ul>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        3. Zero Data Selling Policy
                    </h2>
                    <p>
                        <strong>We NEVER sell, rent, trade, or monetize your personal details to third-party advertisers.</strong> Your delivery details are strictly shared with trusted registered courier partners (e.g., Leopards, Trax, TCS, CallCourier) solely for delivering your parcel.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        4. Cookies &amp; Local Storage in PWA
                    </h2>
                    <p>
                        Our application utilizes lightweight local storage and PWA cache technology to keep your shopping cart items, wishlist, and recent search history saved securely on your device, enabling rapid loading even on unstable internet connections.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        5. Contact Us Regarding Your Privacy
                    </h2>
                    <p>
                        If you have questions regarding this Privacy Policy or wish to delete or update your contact information, please contact our support team:
                    </p>
                    <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-100 text-sm space-y-1">
                        <p><strong>Brand:</strong> {appName}</p>
                        <p><strong>Official Domain:</strong> <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-rose-700 font-semibold underline">{domain}</a></p>
                        <p><strong>Email:</strong> <a href={`mailto:${email}`} className="text-rose-700 font-semibold underline">{email}</a></p>
                        {whatsapp && <p><strong>WhatsApp Support:</strong> {whatsapp}</p>}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
                    <Link to="/refund-policy" className="text-rose-600 hover:underline font-semibold">Return &amp; Refund Policy →</Link>
                    <Link to="/terms" className="text-rose-600 hover:underline font-semibold">Terms &amp; Conditions →</Link>
                    <Link to="/about" className="text-rose-600 hover:underline font-semibold">About {appName} →</Link>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
