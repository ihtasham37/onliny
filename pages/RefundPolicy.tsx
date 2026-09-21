import React from 'react';
import { useStore } from '../hooks/useStore';
import { SEO } from '../components/SEO';
import { Icons } from '../components/icons/Icons';
import { Link } from 'react-router-dom';

const RefundPolicy = () => {
    const { settings } = useStore();
    const appName = settings?.appName || 'Onliny';
    const email = settings?.adminEmail || 'ali10cart@gmail.com';
    const whatsapp = settings?.whatsappNumber || '';
    const domain = 'onliny.co.uk';

    const customPolicy = settings?.globalReturnPolicy;

    return (
        <div className="container mx-auto px-4 max-w-3xl py-6 sm:py-10">
            <SEO 
                title={`Return & Refund Policy | 7 Days Easy Return | ${appName}`}
                description={`Official 7-day Return & Refund Policy for ${appName} (${domain}). Verified item condition, simple return process, parcel video inspection, and 100% full refund on damaged/incorrect items.`}
                canonical={`https://${domain}/#/refund-policy`}
                keywords={[`${appName} return policy`, '7 days refund', 'exchange policy Pakistan', 'damaged product refund', 'cash on delivery refund', domain]}
            />

            <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-rose-100 space-y-6 text-slate-700 leading-relaxed">
                {/* Header */}
                <div className="border-b border-rose-100 pb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3">
                        <Icons.checkCircle className="w-3.5 h-3.5" />
                        <span>Customer Protection Guarantee</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
                        Return &amp; Refund Policy
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Fair, transparent, customer-first policy for <strong>{appName}</strong> ({domain})
                    </p>
                </div>

                {/* Quick Summary Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-100 text-center">
                        <div className="text-xl font-extrabold text-rose-700">7 Days</div>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">Return Window</div>
                        <div className="text-[11px] text-slate-500 mt-1">From the date of delivery</div>
                    </div>
                    <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 text-center">
                        <div className="text-xl font-extrabold text-emerald-700">100% Refund</div>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">Damaged / Wrong Item</div>
                        <div className="text-[11px] text-slate-500 mt-1">Via Bank Transfer / EasyPaisa / JazzCash</div>
                    </div>
                    <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100 text-center">
                        <div className="text-xl font-extrabold text-amber-700">Parcel Video</div>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">Unboxing Recommended</div>
                        <div className="text-[11px] text-slate-500 mt-1">Fast-tracks instant approval</div>
                    </div>
                </div>

                <div className="space-y-4 text-sm sm:text-base">
                    {customPolicy ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-2">Store Policy Details:</h3>
                            <p className="whitespace-pre-line text-slate-700">{customPolicy}</p>
                        </div>
                    ) : null}

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        1. 7-Day Return Eligibility (7 دن کی واپسی کی سہولت)
                    </h2>
                    <p>
                        Customer satisfaction is our utmost priority at <strong>{appName}</strong>. If your received product is defective, torn, missing pieces, or significantly different from the catalog description/pictures, you can claim a return or exchange within <strong>7 calendar days</strong> from the delivery timestamp.
                    </p>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        2. Valid Conditions for Return Approval
                    </h2>
                    <ul className="list-disc pl-5 space-y-2 text-slate-600">
                        <li><strong>Unstitched Suits / Apparel:</strong> Must not be washed, tailored, ironed, or cut in any form. Original tags and plastic wrap must be intact.</li>
                        <li><strong>Defect / Misprint / Damage:</strong> Clear unboxing photos or a short video showing the defect must be provided to our WhatsApp support team.</li>
                        <li><strong>Wrong Product Delivered:</strong> If a different color, design, or size was delivered by mistake, we arrange reverse pickup or exchange at zero extra cost to you.</li>
                    </ul>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        3. Non-Returnable Cases (جن صورتوں میں واپسی نہیں ہوگی)
                    </h2>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                        <li>Items returned after the 7-day window has expired.</li>
                        <li>Fabrics that have been stitched, altered, washed, or perfumed by the customer.</li>
                        <li>Damage caused by mishandling or improper domestic washing.</li>
                        <li>Minor color variations resulting from studio screen lighting or mobile brightness differences.</li>
                    </ul>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        4. Step-by-Step Return Process (واپسی کا آسان طریقہ)
                    </h2>
                    <ol className="list-decimal pl-5 space-y-2 text-slate-600">
                        <li><strong>Initiate Request:</strong> Message our customer support on WhatsApp or email <code className="bg-rose-50 text-rose-700 px-1 rounded">{email}</code> within 7 days of receiving the parcel.</li>
                        <li><strong>Provide Evidence:</strong> Share your Order ID, courier tracking number, and photos/video showing the defect or issue.</li>
                        <li><strong>Verification:</strong> Our team inspects your claim within 24–48 hours and issues return approval instructions.</li>
                        <li><strong>Dispatch:</strong> Return the parcel via courier to our designated hub address in original packing.</li>
                        <li><strong>Refund or Replacement:</strong> Once received and verified, your replacement is dispatched immediately, or your full refund is sent via <strong>EasyPaisa, JazzCash, or Direct Bank Transfer</strong> within 2–3 business days.</li>
                    </ol>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        5. Need Assistance?
                    </h2>
                    <p>
                        We are here to assist you warmly every step of the way:
                    </p>
                    <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-100 text-sm space-y-1">
                        <p><strong>Store:</strong> {appName} ({domain})</p>
                        <p><strong>Support Email:</strong> <a href={`mailto:${email}`} className="text-rose-700 font-semibold underline">{email}</a></p>
                        {whatsapp && <p><strong>Direct WhatsApp:</strong> {whatsapp}</p>}
                        <p className="text-xs text-slate-500 mt-2">Response time: Typically within 1 to 4 business hours.</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
                    <Link to="/privacy-policy" className="text-rose-600 hover:underline font-semibold">Privacy Policy →</Link>
                    <Link to="/terms" className="text-rose-600 hover:underline font-semibold">Terms &amp; Conditions →</Link>
                    <Link to="/about" className="text-rose-600 hover:underline font-semibold">About {appName} →</Link>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicy;
