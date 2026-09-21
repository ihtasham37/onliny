import React from 'react';
import { useStore } from '../hooks/useStore';
import { SEO } from '../components/SEO';
import { Icons } from '../components/icons/Icons';
import { Link } from 'react-router-dom';

const TermsPage = () => {
    const { settings } = useStore();
    const appName = settings?.appName || 'Onliny';
    const email = settings?.adminEmail || 'ali10cart@gmail.com';
    const domain = 'onliny.co.uk';

    return (
        <div className="container mx-auto px-4 max-w-3xl py-6 sm:py-10">
            <SEO 
                title={`Terms and Conditions | ${appName}`}
                description={`Terms and Conditions of service for ${appName} (${domain}). Guidelines on ordering, Cash on Delivery, pricing, order confirmation, and customer rights.`}
                canonical={`https://${domain}/#/terms`}
                keywords={[`${appName} terms`, 'terms of service', 'COD terms Pakistan', 'e-commerce legal rules', domain]}
            />

            <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-rose-100 space-y-6 text-slate-700 leading-relaxed">
                {/* Header */}
                <div className="border-b border-rose-100 pb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-3">
                        <Icons.fileText className="w-3.5 h-3.5" />
                        <span>User Agreement</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
                        Terms &amp; Conditions
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Please review these terms before placing an order on <strong>{appName}</strong> ({domain})
                    </p>
                </div>

                <div className="space-y-4 text-sm sm:text-base">
                    <p>
                        By accessing, installing, browsing, or placing an order through <strong>{appName}</strong> (<a href={`https://${domain}`} className="text-rose-600 font-semibold hover:underline">{domain}</a>), you agree to comply with and be bound by the following terms and conditions.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        1. Order Placement &amp; Phone Verification
                    </h2>
                    <p>
                        To ensure fast nationwide delivery and protect genuine buyers, all Cash on Delivery (COD) orders require a valid, reachable Pakistani mobile/WhatsApp phone number. 
                        We reserve the right to call or message to verify delivery details before parcel dispatch. Unverified or unresponsive orders may be cancelled to prevent delivery failures.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        2. Pricing &amp; Stock Availability
                    </h2>
                    <p>
                        All prices listed on <strong>{appName}</strong> are in Pakistani Rupees (PKR) and include product costs. Shipping/delivery fees are clearly specified during checkout before order submission. 
                        While we strive for accurate inventory levels, in the rare event an item is out of stock after order submission, our team will promptly notify you with an alternative or immediate cancellation.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        3. Shipping &amp; Delivery Commitments
                    </h2>
                    <p>
                        Parcels are dispatched within 24–48 working hours. Standard delivery across major cities of Pakistan takes 2 to 4 business days, and remote areas take 3 to 6 days. Delivery timelines may experience minor delays during extreme weather or public holidays.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        4. Fair Return Compliance
                    </h2>
                    <p>
                        All customers are entitled to our transparent <strong>7-Day Return Policy</strong> for damaged, defective, or incorrect items as detailed on our <Link to="/refund-policy" className="text-rose-600 font-semibold hover:underline">Return &amp; Refund Policy page</Link>.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        5. Intellectual Property &amp; Platform Use
                    </h2>
                    <p>
                        Content, catalog designs, imagery, and code powering {appName} are protected under copyright laws. Misuse of the platform, fraudulent order spamming, or harassment of delivery couriers will lead to permanent blacklisting.
                    </p>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-1">
                        <p><strong>Official Entity:</strong> {appName} Online Store</p>
                        <p><strong>Website:</strong> <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-rose-700 font-semibold underline">{domain}</a></p>
                        <p><strong>Legal &amp; Support Contact:</strong> <a href={`mailto:${email}`} className="text-rose-700 font-semibold underline">{email}</a></p>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
                    <Link to="/privacy-policy" className="text-rose-600 hover:underline font-semibold">Privacy Policy →</Link>
                    <Link to="/refund-policy" className="text-rose-600 hover:underline font-semibold">Return &amp; Refund Policy →</Link>
                    <Link to="/about" className="text-rose-600 hover:underline font-semibold">About {appName} →</Link>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
