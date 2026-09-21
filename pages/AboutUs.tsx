import React from 'react';
import { useStore } from '../hooks/useStore';
import { SEO } from '../components/SEO';
import { Icons } from '../components/icons/Icons';
import { Link } from 'react-router-dom';

const AboutUs = () => {
    const { settings } = useStore();
    const appName = settings?.appName || 'Onliny';
    const email = settings?.adminEmail || 'ali10cart@gmail.com';
    const whatsapp = settings?.whatsappNumber || '';
    const domain = 'onliny.co.uk';

    return (
        <div className="container mx-auto px-4 max-w-3xl py-6 sm:py-10">
            <SEO 
                title={`About Us | Official Store | ${appName}`}
                description={`Learn about ${appName} (${domain}) - Pakistan's trusted online fashion and lifestyle shopping platform. Verified premium fabrics, wholesale-direct prices, and reliable Cash on Delivery.`}
                canonical={`https://${domain}/#/about`}
                keywords={[`about ${appName}`, `${appName} Pakistan`, 'online boutique Pakistan', 'trusted online store', domain]}
            />

            <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-rose-100 space-y-6 text-slate-700 leading-relaxed">
                {/* Header Banner */}
                <div className="border-b border-rose-100 pb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold mb-3">
                        <Icons.star className="w-3.5 h-3.5" />
                        <span>About Our Story &amp; Vision</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
                        About {appName}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Your Trusted Partner for Curated Fashion, Unstitched Fabrics &amp; Lifestyle Collections across Pakistan
                    </p>
                </div>

                {/* Core Brand Values */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 text-center">
                        <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
                            <Icons.shieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">Verified Quality</h3>
                        <p className="text-xs text-slate-500 mt-1">Hand-inspected fabric textures, prints, and colors before dispatch.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 text-center">
                        <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
                            <Icons.truck className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">Fast Cash on Delivery</h3>
                        <p className="text-xs text-slate-500 mt-1">Safe nationwide doorstep delivery via top tier courier services.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
                            <Icons.refresh className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">7-Day Easy Returns</h3>
                        <p className="text-xs text-slate-500 mt-1">Customer-first policy with fast refund or replacement guarantee.</p>
                    </div>
                </div>

                <div className="space-y-4 text-sm sm:text-base">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Our Mission
                    </h2>
                    <p>
                        At <strong>{appName}</strong> (<a href={`https://${domain}`} className="text-rose-600 font-semibold hover:underline">{domain}</a>), our mission is simple: to make premium, high-quality fashion accessible to families across all provinces and cities of Pakistan without unfair retail markups.
                    </p>
                    <p>
                        We bridge the gap between quality manufacturing hubs and your wardrobe. Every product featured on our store is selected for superior craftsmanship, skin-friendly dyes, and authentic trending designs.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Why Thousands Trust {appName}
                    </h2>
                    <ul className="list-disc pl-5 space-y-2 text-slate-600">
                        <li><strong>No Compromise on Fabric:</strong> High-density lawn, chiffon, cambric, and winter fabrics with accurate pictures and unedited video previews.</li>
                        <li><strong>Transparent Pricing:</strong> Competitive factory-direct prices with regular discount vouchers and zero hidden service fees.</li>
                        <li><strong>Live WhatsApp Assistance:</strong> Real human support to assist you with sizing, fabric details, and real-time delivery status tracking.</li>
                        <li><strong>PWA Mobile App Experience:</strong> Install our Progressive Web App directly to your phone’s home screen with zero app-store delays for instantaneous browsing.</li>
                    </ul>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Get In Touch With Our Team
                    </h2>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-1">
                        <p><strong>Official Brand Name:</strong> {appName}</p>
                        <p><strong>Website:</strong> <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-rose-700 font-semibold underline">{domain}</a></p>
                        <p><strong>Customer Inquiries &amp; Orders:</strong> <a href={`mailto:${email}`} className="text-rose-700 font-semibold underline">{email}</a></p>
                        {whatsapp && <p><strong>Direct Helpline / WhatsApp:</strong> {whatsapp}</p>}
                        <p className="text-xs text-slate-500 mt-2">Available Monday to Saturday: 10:00 AM – 8:00 PM (PKT)</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
                    <Link to="/refund-policy" className="text-rose-600 hover:underline font-semibold">7-Day Return &amp; Refund Policy →</Link>
                    <Link to="/privacy-policy" className="text-rose-600 hover:underline font-semibold">Privacy Policy →</Link>
                    <Link to="/terms" className="text-rose-600 hover:underline font-semibold">Terms &amp; Conditions →</Link>
                </div>
            </div>
        </div>
    );
};

export default AboutUs;
