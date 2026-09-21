
import React, { useMemo, useRef } from 'react';
import { useStore } from '../../hooks/useStore';
import { useAuth } from '../../hooks/useAuth';
import { Icons } from '../../components/icons/Icons';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/helpers';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const Challans = () => {
    const { challans } = useStore();
    const { userData } = useAuth();
    const challanRef = useRef<HTMLDivElement>(null);

    const myChallans = useMemo(() => {
        if (!userData) return [];
        return challans.filter(c => c.vendorIds.includes(userData.uid));
    }, [challans, userData]);

    const handleDownload = (challan: any) => {
        const element = document.createElement('div');
        element.innerHTML = `
            <div style="padding: 40px; font-family: sans-serif; color: #333; line-height: 1.6;">
                <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #0d9488; padding-bottom: 20px;">
                    <h1 style="color: #0d9488; margin: 0; font-size: 28px;">PAYMENT CHALLAN</h1>
                    <p style="margin: 5px 0; color: #666;">Generated on ${new Date(challan.createdAt).toLocaleDateString()}</p>
                </div>
                
                <div style="margin-bottom: 30px; display: flex; justify-content: space-between;">
                    <div style="flex: 1;">
                        <h3 style="margin-bottom: 10px; color: #444; font-size: 14px; text-transform: uppercase;">Vendor Details:</h3>
                        <p style="margin: 2px 0;"><strong>Name:</strong> ${userData?.firstName} ${userData?.lastName}</p>
                        <p style="margin: 2px 0;"><strong>Email:</strong> ${userData?.email}</p>
                        <p style="margin: 2px 0;"><strong>Shop:</strong> ${userData?.shopName}</p>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <h3 style="margin-bottom: 10px; color: #444; font-size: 14px; text-transform: uppercase;">Challan ID:</h3>
                        <p style="margin: 2px 0; font-family: monospace;">#${challan.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                </div>

                <div style="background: #f0fdfa; padding: 25px; border-radius: 12px; border: 1px solid #ccfbf1; margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <span style="font-size: 16px; font-weight: bold; color: #111;">Payable Amount:</span>
                        <span style="font-size: 24px; font-weight: bold; color: #0d9488;">${challan.amount.toLocaleString()} PKR</span>
                    </div>
                    <div style="border-top: 1px solid #ccfbf1; pt: 15px;">
                        <p style="margin: 10px 0 5px 0; font-size: 14px;"><strong>Bank Details:</strong></p>
                        <p style="margin: 0; font-size: 18px; font-family: monospace; letter-spacing: 1px; color: #111;">${challan.bankAccount}</p>
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <h3 style="margin-bottom: 10px; color: #444; font-size: 14px; text-transform: uppercase;">Description:</h3>
                    <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #555;">${challan.description}</p>
                </div>

                <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
                    <p>This is a system-generated challan. Please ensure payment is made to the correct account.</p>
                    <p>Thank you for your business!</p>
                </div>
            </div>
        `;

        const opt = {
            margin: 0,
            filename: `Challan_${userData?.shopName.replace(/\s+/g, '_')}_${new Date(challan.createdAt).getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        } as any;

        html2pdf().from(element).set(opt).save();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">My Challans</h1>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b flex items-center gap-3 bg-teal-50">
                    <Icons.fileText className="w-6 h-6 text-teal-600" />
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Pending Payments</h2>
                        <p className="text-xs text-gray-500">List of payment challans sent by administration</p>
                    </div>
                </div>

                <div className="divide-y">
                    {myChallans.length > 0 ? (
                        myChallans.map(challan => (
                            <div key={challan.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-teal-600">{challan.amount.toLocaleString()} PKR</span>
                                        <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Unpaid</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-800">{challan.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Icons.calendar className="w-3.5 h-3.5" />
                                            {new Date(challan.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Icons.creditCard className="w-3.5 h-3.5" />
                                            Account: {challan.bankAccount.substring(0, 10)}...
                                        </span>
                                    </div>
                                </div>
                                
                                <Button 
                                    onClick={() => handleDownload(challan)}
                                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700"
                                >
                                    <Icons.download className="w-4 h-4" />
                                    Download Challan
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <Icons.checkCircle className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                            <h3 className="text-gray-500 font-medium">No pending challans</h3>
                            <p className="text-xs text-gray-400 mt-1">You are all caught up! No payment requests found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Challans;
