

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { Settings as SettingsType } from '../../types';
import { SectionSyncKey } from '../../services/dataSyncService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { safeLower } from '../../utils/helpers';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { LogoAdjusterModal } from '../../components/admin/LogoAdjusterModal';

const Settings = () => {
    const { 
        settings, 
        updateSettings, 
        isLoading, 
        uploadFile, 
        deleteFile,
        isFirebaseLiveMode, 
        toggleFirebaseMode,
        exportCatalogSnapshot,
        refreshCatalog,
        fetchLatestSettingsFromFirestore,
        pushSectionSettingsToFirestore,
        syncState
    } = useStore();
    const defaultSettingsData: SettingsType = {
        appName: settings?.appName || 'onliny',
        storeDomain: settings?.storeDomain || '',
        logoUrl: settings?.logoUrl || '',
        storeBannerUrl: settings?.storeBannerUrl || '',
        bannerUrls: settings?.bannerUrls || [],
        shippingFee: settings?.shippingFee !== undefined && settings?.shippingFee !== null ? Number(settings.shippingFee) : 99,
        whatsappNumber: settings?.whatsappNumber || '',
        adminEmail: settings?.adminEmail || '',
        paymentMethods: settings?.paymentMethods || [{ id: 'cod', name: 'Cash on Delivery', details: 'Pay in cash upon delivery.' }],
        sizeCategories: settings?.sizeCategories || [],
        categories: settings?.categories || [],
        whatsappGroupUrl: settings?.whatsappGroupUrl || '',
        whatsappChannelUrl: settings?.whatsappChannelUrl || '',
        telegramChannelUrl: settings?.telegramChannelUrl || '',
        youtubeChannelUrl: settings?.youtubeChannelUrl || '',
        instagramChannelUrl: settings?.instagramChannelUrl || '',
        facebookPageUrl: settings?.facebookPageUrl || '',
        showJoinCommunity: settings?.showJoinCommunity ?? true,
        showLatestUpdates: settings?.showLatestUpdates ?? true,
        showGetApp: settings?.showGetApp ?? true,
        showContactWhatsapp: settings?.showContactWhatsapp ?? true,
        showContactEmail: settings?.showContactEmail ?? true,
        playStoreUrl: settings?.playStoreUrl || '',
        adminNotificationEmail: settings?.adminNotificationEmail || '',
        gmailUser: settings?.gmailUser || '',
        gmailAppPassword: settings?.gmailAppPassword || '',
        enableOrderEmailAlerts: settings?.enableOrderEmailAlerts ?? true,
        globalReturnPolicy: settings?.globalReturnPolicy || '',
    };

    const [formData, setFormData] = useState<SettingsType>(defaultSettingsData);
    const [paymentInput, setPaymentInput] = useState({ id: '', name: '', details: ''});
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingFirestore, setIsFetchingFirestore] = useState(false);
    const [activeSyncSection, setActiveSyncSection] = useState<string | null>(null);
    const [syncToast, setSyncToast] = useState<{ success: boolean; message: string } | null>(null);
    const [isSyncingStatic, setIsSyncingStatic] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const [bannerUploadError, setBannerUploadError] = useState('');
    const [bannerInputMode, setBannerInputMode] = useState<'upload' | 'url'>('upload');
    const [bannerUrl, setBannerUrl] = useState('');
    const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
    const [storeBannerInputMode, setStoreBannerInputMode] = useState<'upload' | 'url'>('upload');
    const [isAdjusterOpen, setIsAdjusterOpen] = useState<boolean>(false);
    const [adjusterImageSrc, setAdjusterImageSrc] = useState<string>('');
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showAppPassword, setShowAppPassword] = useState(false);
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [emailSaveSuccess, setEmailSaveSuccess] = useState(false);

    // Initial mount: Automatically fetch fresh settings from Firestore Cloud to prevent stale session overwrites
    useEffect(() => {
        let isMounted = true;
        const autoFetchFirestore = async () => {
            setIsFetchingFirestore(true);
            try {
                const fresh = await fetchLatestSettingsFromFirestore();
                if (fresh && isMounted) {
                    setFormData(prev => ({
                        ...(prev || {}),
                        ...fresh,
                        appName: fresh.appName || 'onliny',
                        shippingFee: fresh.shippingFee !== undefined && fresh.shippingFee !== null ? Number(fresh.shippingFee) : 99
                    } as SettingsType));
                }
            } catch (err) {
                console.warn("Auto-sync from Firestore on mount note:", err);
            } finally {
                if (isMounted) setIsFetchingFirestore(false);
            }
        };

        const fetchEmailSettings = async () => {
            try {
                const res = await fetch('/api/get-email-settings');
                const data = await res.json();
                if (data.success && data.settings && isMounted) {
                    setFormData(prev => ({
                        ...(prev || {}),
                        gmailUser: data.settings.gmailUser || prev?.gmailUser || '',
                        gmailAppPassword: data.settings.gmailAppPassword || prev?.gmailAppPassword || '',
                        adminNotificationEmail: data.settings.adminNotificationEmail || prev?.adminNotificationEmail || ''
                    } as SettingsType));
                }
            } catch (err) {}
        };

        autoFetchFirestore();
        fetchEmailSettings();
        return () => { isMounted = false; };
    }, [fetchLatestSettingsFromFirestore]);
    
    useEffect(() => {
        if (settings) {
            const settingsCopy: SettingsType = {
                ...settings,
                appName: settings.appName || 'onliny',
                storeDomain: settings.storeDomain || 'https://onliny.co.uk',
                logoUrl: settings.logoUrl || '',
                storeBannerUrl: settings.storeBannerUrl || '',
                bannerUrls: [...(settings.bannerUrls || [])],
                shippingFee: settings.shippingFee !== undefined && settings.shippingFee !== null ? Number(settings.shippingFee) : 99,
                whatsappNumber: settings.whatsappNumber || '',
                adminEmail: settings.adminEmail || '',
                paymentMethods: (settings.paymentMethods || []).map(p => ({ ...p })),
                sizeCategories: (settings.sizeCategories || []).map(sc => ({ ...sc, sizes: [...(sc.sizes || [])] })),
                categories: settings.categories || [],
                whatsappGroupUrl: settings.whatsappGroupUrl || '',
                whatsappChannelUrl: settings.whatsappChannelUrl || '',
                telegramChannelUrl: settings.telegramChannelUrl || '',
                youtubeChannelUrl: settings.youtubeChannelUrl || '',
                instagramChannelUrl: settings.instagramChannelUrl || '',
                facebookPageUrl: settings.facebookPageUrl || '',
                showJoinCommunity: settings.showJoinCommunity ?? true,
                showLatestUpdates: settings.showLatestUpdates ?? true,
                showGetApp: settings.showGetApp ?? true,
                showContactWhatsapp: settings.showContactWhatsapp ?? true,
                showContactEmail: settings.showContactEmail ?? true,
                playStoreUrl: settings.playStoreUrl || '',
                adminNotificationEmail: settings.adminNotificationEmail || '',
                gmailUser: settings.gmailUser || '',
                gmailAppPassword: settings.gmailAppPassword || '',
                enableOrderEmailAlerts: settings.enableOrderEmailAlerts ?? true,
                globalReturnPolicy: settings.globalReturnPolicy || '',
            };
            setFormData(settingsCopy);
        } else {
            setFormData(null);
        }
    }, [settings]);
    
    const handleFetchFromFirestore = async () => {
        setIsFetchingFirestore(true);
        setSyncToast(null);
        try {
            const fresh = await fetchLatestSettingsFromFirestore();
            if (fresh) {
                setFormData(prev => ({
                    ...(prev || {}),
                    ...fresh,
                    appName: fresh.appName || 'onliny',
                    storeDomain: fresh.storeDomain || 'https://onliny.co.uk',
                    shippingFee: fresh.shippingFee !== undefined && fresh.shippingFee !== null ? Number(fresh.shippingFee) : 99
                } as SettingsType));
                setSyncToast({
                    success: true,
                    message: "تازہ ترین ترتیبات فائر اسٹور سے کامیابی سے حاصل ہو گئیں! (Fresh settings fetched from Firestore Cloud!)"
                });
            } else {
                setSyncToast({
                    success: true,
                    message: "فائر اسٹور ڈیٹا پہلے سے مکمل ہم آہنگ ہے۔ (Settings are already up-to-date with Firestore Cloud.)"
                });
            }
        } catch (err: any) {
            setSyncToast({
                success: false,
                message: `فائر اسٹور سے حاصل کرنے میں خرابی: ${err?.message || 'Error fetching from Firestore'}`
            });
        } finally {
            setIsFetchingFirestore(false);
            setTimeout(() => setSyncToast(null), 5000);
        }
    };

    const handleSyncSection = async (section: SectionSyncKey, sectionTitle: string, partialData: Partial<SettingsType>) => {
        if (!formData) return;
        setActiveSyncSection(section);
        setSyncToast(null);
        try {
            const success = await pushSectionSettingsToFirestore(section, partialData);
            if (success) {
                setSyncToast({
                    success: true,
                    message: `✅ ${sectionTitle} کامیابی سے فائر اسٹور پر پش ہو گیا! (${sectionTitle} successfully pushed to Firestore Cloud!)`
                });
            } else {
                setSyncToast({
                    success: false,
                    message: `❌ ${sectionTitle} محفوظ نہیں ہو سکا۔ (Failed to push ${sectionTitle})`
                });
            }
        } catch (e: any) {
            setSyncToast({
                success: false,
                message: `ایرر: ${e?.message || 'Error syncing section'}`
            });
        } finally {
            setActiveSyncSection(null);
            setTimeout(() => setSyncToast(null), 4000);
        }
    };

    const handleSave = async () => {
        if (formData) {
            setIsSaving(true);
            setSyncToast(null);
            try {
                const settingsToSave: SettingsType = {
                    ...formData,
                    isFirebaseLiveMode: isFirebaseLiveMode
                };
                // Securely save credentials to server-side isolated config
                if (formData.gmailUser || formData.gmailAppPassword) {
                    await fetch('/api/save-email-settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            gmailUser: formData.gmailUser,
                            gmailAppPassword: formData.gmailAppPassword,
                            adminNotificationEmail: formData.adminNotificationEmail,
                            appName: formData.appName || 'onliny'
                        })
                    }).catch(err => console.warn("Failed to save email settings to server:", err));
                }
                await updateSettings(settingsToSave);
                setSyncToast({
                    success: true,
                    message: "✅ تمام ترتیبات فائر اسٹور، سرور بنڈل اور PWA پر کامیابی سے محفوظ ہو گئیں! (All settings pushed to Firestore!)"
                });
            } catch (error: any) {
                console.error("Failed to save settings:", error);
                setSyncToast({
                    success: false,
                    message: `❌ ترتیبات محفوظ کرنے میں ایرر: ${error?.message || 'Error saving settings'}`
                });
            } finally {
                setIsSaving(false);
                setTimeout(() => setSyncToast(null), 5000);
            }
        }
    };

    const handleSendTestEmail = async () => {
        const sendTo = (formData?.adminNotificationEmail || formData?.gmailUser || '').trim();
        if (!formData?.gmailUser || !formData?.gmailAppPassword) {
            alert("Baraye meherbani pehle 'Sender Gmail Address' aur 'Google 16-Character App Password' enter karein!");
            return;
        }
        if (!sendTo) {
            alert("Please enter your Gmail address to receive the test email.");
            return;
        }
        setIsTestingEmail(true);
        setTestEmailResult(null);
        try {
            const res = await fetch('/api/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toEmail: sendTo,
                    credentials: {
                        gmailUser: formData.gmailUser.trim(),
                        gmailAppPassword: formData.gmailAppPassword.trim(),
                        adminNotificationEmail: sendTo,
                        appName: formData.appName || 'Zivio Store',
                    },
                }),
            });
            const data = await res.json();
            if (data.success) {
                setTestEmailResult({
                    success: true,
                    message: data.message || `✅ Test email sent successfully to ${sendTo}! Check your inbox.`,
                });
            } else {
                setTestEmailResult({
                    success: false,
                    message: `❌ ${data.message || data.error || 'Please check your Gmail and 16-character App Password.'}`,
                });
            }
        } catch (err: any) {
            setTestEmailResult({
                success: false,
                message: `❌ Error connecting to server: ${err.message}`,
            });
        } finally {
            setIsTestingEmail(false);
        }
    };

    const handleSaveEmailCredentials = async () => {
        if (!formData) return;
        setIsSavingEmail(true);
        setEmailSaveSuccess(false);
        try {
            await fetch('/api/save-email-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gmailUser: (formData.gmailUser || '').trim(),
                    gmailAppPassword: (formData.gmailAppPassword || '').trim(),
                    adminNotificationEmail: (formData.adminNotificationEmail || '').trim(),
                    appName: formData.appName || 'onliny'
                })
            });
            await pushSectionSettingsToFirestore('all', {
                gmailUser: (formData.gmailUser || '').trim(),
                gmailAppPassword: (formData.gmailAppPassword || '').trim(),
                adminNotificationEmail: (formData.adminNotificationEmail || '').trim(),
                enableOrderEmailAlerts: formData.enableOrderEmailAlerts ?? true
            });
            setEmailSaveSuccess(true);
            setTimeout(() => setEmailSaveSuccess(false), 5000);
        } catch (err: any) {
            console.error("Error saving email settings:", err);
            alert("Could not save email credentials: " + (err?.message || 'Error'));
        } finally {
            setIsSavingEmail(false);
        }
    };

    const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            if (uploadEvent.target?.result) {
                setAdjusterImageSrc(uploadEvent.target.result as string);
                setIsAdjusterOpen(true);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleApplyAdjustedLogo = async (processedFile: File) => {
        if (!formData) return;
        const oldUrl = formData.logoUrl;
        setIsSaving(true);
        try {
            const url = await uploadFile(processedFile);
            setFormData({ ...formData, logoUrl: url });
            if (oldUrl && oldUrl.startsWith('http') && !oldUrl.includes('data:')) {
                await deleteFile(oldUrl).catch(() => {});
            }
        } catch (err: any) {
            alert(err.message || 'An error occurred during logo upload.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenAdjusterForExisting = () => {
        if (!formData?.logoUrl) return;
        setAdjusterImageSrc(formData.logoUrl);
        setIsAdjusterOpen(true);
    };

    const handleStoreBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !formData) return;

        const oldUrl = formData.storeBannerUrl;
        setIsSaving(true);
        try {
            const url = await uploadFile(file);
            setFormData({ ...formData, storeBannerUrl: url });
            if (oldUrl) await deleteFile(oldUrl);
        } catch (err: any) {
            alert(err.message || 'An error occurred during store banner upload.');
        } finally {
            setIsSaving(false);
        }
    };

    const initializeSettings = async () => {
        const defaultSettings: SettingsType = {
            appName: 'onliny',
            storeDomain: 'https://onliny.co.uk',
            bannerUrls: [],
            shippingFee: 99,
            whatsappNumber: '03026947034',
            adminEmail: 'support@onliny.co.uk',
            paymentMethods: [{ id: 'cod', name: 'Cash on Delivery', details: 'Pay in cash upon delivery.' }],
            categories: [],
            sizeCategories: [],
            whatsappGroupUrl: '',
            whatsappChannelUrl: '',
            telegramChannelUrl: '',
            youtubeChannelUrl: '',
            instagramChannelUrl: '',
            facebookPageUrl: '',
            showJoinCommunity: true,
            showLatestUpdates: true,
            showGetApp: true,
            showContactWhatsapp: true,
            showContactEmail: true,
        };
        setIsSaving(true);
        try {
            await updateSettings(defaultSettings);
        } catch (error) {
            console.error("Failed to initialize settings:", error);
            alert("There was an error initializing settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !formData) return;

        setIsUploadingBanner(true);
        setBannerUploadError('');
        
        const uploadedUrls: string[] = [];
        try {
            for (const file of files) {
                const url = await uploadFile(file);
                uploadedUrls.push(url);
            }
            setFormData(prev => prev ? ({ ...prev, bannerUrls: [...prev.bannerUrls, ...uploadedUrls]}) : null);
        } catch (err: any) {
            setBannerUploadError(err.message || 'An error occurred during upload.');
            console.error(err);
        } finally {
            setIsUploadingBanner(false);
        }
    };

    const handleAddBannerUrl = () => {
        if (bannerUrl.trim()) {
            try {
                new URL(bannerUrl.trim());
                if (formData) {
                    setFormData({ ...formData, bannerUrls: [...formData.bannerUrls, bannerUrl.trim()] });
                }
                setBannerUrl('');
            } catch (_) {
                alert('Please enter a valid URL.');
            }
        }
    };
    
    if (isLoading) return <div className="flex justify-center p-16"><Spinner size="lg"/></div>;
    if (!settings) return (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-4">Initialize Store Settings</h2>
            <p className="text-gray-600 mb-6">Store settings are not configured. Click the button below to create them with default values.</p>
            <Button onClick={initializeSettings} disabled={isSaving}>{isSaving ? <Spinner size="sm" /> : 'Initialize Settings'}</Button>
        </div>
    );
    if (!formData) return <div className="flex justify-center p-16"><Spinner size="lg"/></div>;

    const addPaymentMethod = () => {
        if (formData && paymentInput.name && paymentInput.details) {
            const newMethod = {...paymentInput, id: safeLower(paymentInput.name).replace(/\s+/g, '-') + Date.now()};
            setFormData({...formData, paymentMethods: [...formData.paymentMethods, newMethod]});
            setPaymentInput({id: '', name: '', details: ''});
        }
    };
     const removePaymentMethod = (id: string) => {
        if (formData) setFormData({...formData, paymentMethods: formData.paymentMethods.filter(p => p.id !== id)});
    };

    if (!formData) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[50vh]">
                <Spinner size="lg" />
                <p className="mt-4 text-xs font-semibold text-slate-500">Loading Store Settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Global Sync Toast Notification */}
            {syncToast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 border backdrop-blur-md transition-all ${
                    syncToast.success 
                    ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/80 shadow-emerald-900/40' 
                    : 'bg-rose-950/95 text-rose-200 border-rose-500/80 shadow-rose-900/40'
                }`}>
                    <span className="text-base">{syncToast.success ? '✅' : '❌'}</span>
                    <span className="leading-tight">{syncToast.message}</span>
                </div>
            )}

            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-serif tracking-tight">Store Settings</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Configure store identity, branding, shipping rates, contact channels, and system integrations.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving || isFetchingFirestore}
                        className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-md font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2"
                    >
                        {isSaving ? <Spinner size="sm"/> : <Icons.save className="w-4 h-4" />}
                        <span>Save All Changes</span>
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 font-serif">General &amp; Store Identity</h2>
                            <p className="text-xs text-slate-500">Store branding, app name, logo, domain, and primary contacts</p>
                        </div>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleSyncSection('branding', 'Store Identity & Branding', {
                                appName: formData.appName,
                                storeDomain: formData.storeDomain,
                                whatsappNumber: formData.whatsappNumber,
                                adminEmail: formData.adminEmail,
                                logoUrl: formData.logoUrl,
                                storeBannerUrl: formData.storeBannerUrl
                            })}
                            disabled={isSaving || activeSyncSection === 'branding'}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                        >
                            {activeSyncSection === 'branding' ? <Spinner size="sm" /> : <Icons.cloud className="w-3.5 h-3.5 text-rose-600" />}
                            <span>Save Branding to Firestore</span>
                        </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Input label="App Name" value={formData.appName} onChange={e => setFormData({...formData, appName: e.target.value})} placeholder="e.g. My Online Store" />
                            <Input 
                                label="Custom Domain / Website URL (Optional)" 
                                value={formData.storeDomain || ''} 
                                onChange={e => setFormData({...formData, storeDomain: e.target.value})} 
                                placeholder="e.g. https://mybrand.com (Leave empty for auto-detect)" 
                            />
                            <Input label="WhatsApp Number" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} />
                            <Input label="Admin Contact Email" type="email" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} />
                        </div>
                        <div className="space-y-6 border-l md:border-l-0 md:pl-0 pl-4 border-gray-100 flex flex-col justify-start">
                            {/* Store & Mobile App Logo Box */}
                            <div className="bg-gradient-to-br from-rose-50/50 to-amber-50/40 p-4 rounded-2xl border border-rose-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                                            <span>📱 App Logo & Mobile Branding</span>
                                            <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                                                ایپ کا لوگو
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            This logo appears on the mobile top navbar, splash screen, and home screen app icon.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap sm:flex-nowrap items-start gap-4">
                                    {/* Main Logo Preview (Always Circular) */}
                                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                                        <div className="w-20 h-20 rounded-full border-2 border-rose-300 shadow-md flex items-center justify-center bg-white overflow-hidden p-1 aspect-square">
                                            {formData.logoUrl ? (
                                                <img src={formData.logoUrl} className="w-full h-full object-cover rounded-full aspect-square" alt="App Logo" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-rose-50 text-rose-600 font-extrabold text-2xl font-serif rounded-full">
                                                    {formData.appName?.[0] || 'Z'}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500">⭕ Circular Logo</span>
                                        {formData.logoUrl && (
                                            <button
                                                type="button"
                                                onClick={handleOpenAdjusterForExisting}
                                                className="text-[10px] font-bold text-rose-700 bg-rose-100/80 hover:bg-rose-200 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 shadow-2xs"
                                            >
                                                🔍 Zoom / Adjust
                                            </button>
                                        )}
                                    </div>

                                    {/* Upload / URL Controls */}
                                    <div className="flex-1 space-y-2.5 min-w-[200px]">
                                        <div className="flex flex-wrap gap-2">
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant={logoInputMode === 'upload' ? 'primary' : 'secondary'} 
                                                className="px-3 py-1 h-8 text-xs font-bold"
                                                onClick={() => setLogoInputMode('upload')}
                                            >
                                                Upload &amp; Zoom
                                            </Button>
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant={logoInputMode === 'url' ? 'primary' : 'secondary'} 
                                                className="px-3 py-1 h-8 text-xs font-bold"
                                                onClick={() => setLogoInputMode('url')}
                                            >
                                                Image URL
                                            </Button>
                                            {formData.logoUrl && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    className="px-2 py-1 h-8 text-xs text-rose-600 hover:bg-rose-50"
                                                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {logoInputMode === 'upload' ? (
                                            <div className="relative">
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleLogoFileSelect} 
                                                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-600 file:text-white hover:file:bg-rose-700 cursor-pointer shadow-xs"
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    ⚡ Selecting an image opens the <strong>Interactive Circular Cropper &amp; Zoom Adjuster</strong> (لوگو زوم اور گول ایڈجسٹمنٹ).
                                                </p>
                                            </div>
                                        ) : (
                                            <Input 
                                                placeholder="https://example.com/logo.png" 
                                                value={formData.logoUrl || ''} 
                                                onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                                                className="text-xs py-1 h-8"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Live Mobile Screen Mockup Preview */}
                                <div className="mt-3 pt-3 border-t border-rose-100/80">
                                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                                        <span>📱 Live Mobile Screen Preview (موبائل اسکرین پر گول لوگو)</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Mobile Header Preview */}
                                        <div className="bg-white p-2.5 rounded-xl border border-rose-200 shadow-xs space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                1. Mobile Header (ٹاپ بار)
                                            </span>
                                            <div className="h-10 bg-white/95 rounded-lg border border-rose-100 flex items-center px-2 gap-2 shadow-inner">
                                                <div className="w-7 h-7 rounded-full border border-rose-300 overflow-hidden shrink-0 flex items-center justify-center bg-rose-50 aspect-square">
                                                    {formData.logoUrl ? (
                                                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-rose-600">{formData.appName?.[0] || 'Z'}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[11px] font-extrabold font-serif text-rose-800 truncate leading-tight">
                                                        {formData.appName || 'Store'}
                                                    </div>
                                                    <div className="text-[8px] text-amber-700 font-semibold leading-none">
                                                        Luxury Kids Wear
                                                    </div>
                                                </div>
                                                <div className="w-16 h-5 bg-rose-50 rounded-full border border-rose-100 flex items-center px-1.5 text-[8px] text-slate-400">
                                                    Search...
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mobile App Icon Preview */}
                                        <div className="bg-white p-2.5 rounded-xl border border-rose-200 shadow-xs space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                2. Mobile App Icon (موبائل ہوم اسکرین)
                                            </span>
                                            <div className="h-10 bg-slate-900 rounded-lg flex items-center px-3 gap-2 shadow-inner">
                                                <div className="w-7 h-7 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center overflow-hidden border border-white/40 shrink-0 aspect-square">
                                                    {formData.logoUrl ? (
                                                        <img src={formData.logoUrl} alt="App Icon" className="w-full h-full object-cover rounded-full" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-rose-600">{formData.appName?.[0] || 'Z'}</span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-bold text-white truncate">
                                                    {formData.appName || 'Store'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Store Header Banner Row */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <h3 className="font-bold text-sm text-gray-700">Official Store Header Banner</h3>
                                <p className="text-xs text-gray-400">This banner displays on the product detail page for official store items.</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                                        {formData.storeBannerUrl ? (
                                            <img src={formData.storeBannerUrl} className="w-full h-full object-cover" alt="Banner" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-teal-100 text-teal-600 font-bold uppercase text-xs text-center p-1">
                                                No Banner
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant={storeBannerInputMode === 'upload' ? 'primary' : 'secondary'} 
                                                className="px-3 py-1 h-8 text-xs"
                                                onClick={() => setStoreBannerInputMode('upload')}
                                            >
                                                Upload File
                                            </Button>
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant={storeBannerInputMode === 'url' ? 'primary' : 'secondary'} 
                                                className="px-3 py-1 h-8 text-xs"
                                                onClick={() => setStoreBannerInputMode('url')}
                                            >
                                                Add URL
                                            </Button>
                                        </div>
                                        
                                        {storeBannerInputMode === 'upload' ? (
                                            <div className="relative">
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleStoreBannerUpload} 
                                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                                                />
                                            </div>
                                        ) : (
                                            <Input 
                                                placeholder="https://example.com/banner.png" 
                                                value={formData.storeBannerUrl || ''} 
                                                onChange={e => setFormData({ ...formData, storeBannerUrl: e.target.value })}
                                                className="text-xs py-1 h-8"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Flat Order Shipping Fee Settings */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-rose-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-rose-100 gap-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
                                <Icons.truck className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Order Shipping Fee (آرڈر شیپنگ فیس)</h2>
                                <p className="text-xs text-slate-500">
                                    Set standard flat shipping fee for orders. Yeh fee sirf Checkout page par add hogi.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <span className="self-start sm:self-auto text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                                Flat Rate: Rs. {formData.shippingFee ?? 99}
                            </span>
                            <Button 
                                type="button" 
                                size="sm" 
                                variant="secondary"
                                onClick={() => handleSyncSection('shipping', 'Shipping Fee', {
                                    shippingFee: formData.shippingFee
                                })}
                                disabled={isSaving || activeSyncSection === 'shipping'}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 shrink-0"
                            >
                                {activeSyncSection === 'shipping' ? <Spinner size="sm" /> : <Icons.cloud className="w-3.5 h-3.5 text-rose-600" />}
                                <span>Save Shipping to Firestore</span>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3 max-w-xl">
                        <div>
                            <Input 
                                label="Flat Shipping Fee in PKR (روپے میں فلیٹ شیپنگ فیس)" 
                                type="number" 
                                min="0"
                                value={formData.shippingFee ?? 99} 
                                onChange={e => {
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    setFormData({ ...formData, shippingFee: val });
                                }}
                                placeholder="99" 
                            />
                            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                                💡 <strong>یہ کیسے کام کرتی ہے:</strong> کارٹ میں چاہے 1 پروڈکٹ ہو، 2 ہوں یا 5 ہوں، کسٹمر سے پورے آرڈر پر صرف ایک بار یہ فیس لی جائے گی۔ پروڈکٹ اور کارٹ پیج پر پروڈکٹ کی اصل قیمت بغیر شیپنگ فیس کے شو ہوگی اور یہ رقم صرف <strong>Checkout پیج</strong> پر آرڈر ٹوٹل میں جمع ہوگی۔
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-gray-100 gap-2">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">App Menu Visibility Options</h2>
                            <p className="text-sm text-gray-500">Toggle visibility of these shortcuts and contact methods in the user-facing "More Options" menu.</p>
                        </div>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleSyncSection('menu', 'Menu Visibility', {
                                showJoinCommunity: formData.showJoinCommunity,
                                showLatestUpdates: formData.showLatestUpdates,
                                showGetApp: formData.showGetApp,
                                showContactWhatsapp: formData.showContactWhatsapp,
                                showContactEmail: formData.showContactEmail,
                                showVendorPortal: formData.showVendorPortal
                            })}
                            disabled={isSaving || activeSyncSection === 'menu'}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                        >
                            {activeSyncSection === 'menu' ? <Spinner size="sm" /> : <Icons.cloud className="w-3.5 h-3.5 text-teal-600" />}
                            <span>Save Menu to Firestore</span>
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showJoinCommunity ?? true} 
                                onChange={e => setFormData({...formData, showJoinCommunity: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Join Our Community"</span>
                                <span className="text-xs text-gray-400">Renders link to the social groups / pages</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showLatestUpdates ?? true} 
                                onChange={e => setFormData({...formData, showLatestUpdates: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Articles"</span>
                                <span className="text-xs text-gray-400">Renders link to the articles / news updates page</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showGetApp ?? true} 
                                onChange={e => setFormData({...formData, showGetApp: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Get The App"</span>
                                <span className="text-xs text-gray-400">Renders button to download the APK if set</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showContactWhatsapp ?? true} 
                                onChange={e => setFormData({...formData, showContactWhatsapp: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Contact on WhatsApp"</span>
                                <span className="text-xs text-gray-400">Renders option to directly chat on WhatsApp</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showContactEmail ?? true} 
                                onChange={e => setFormData({...formData, showContactEmail: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Contact by Email"</span>
                                <span className="text-xs text-gray-400">Renders direct email option to your admin contact email</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border-2 border-rose-200 bg-rose-50/40 rounded-lg cursor-pointer hover:bg-rose-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 border-gray-300"
                                checked={formData.showVendorPortal ?? true} 
                                onChange={e => setFormData({...formData, showVendorPortal: e.target.checked})} 
                            />
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-sm text-slate-800 block">Show "Business / Vendor Portal" &amp; Registration</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">Vendor</span>
                                </div>
                                <span className="text-xs text-slate-500">More پیج پر وینڈر کا بٹن دکھائیں اور رجسٹریشن کی اجازت دیں (بند کرنے پر بٹن اور رجسٹریشن فارم ہائیڈ ہو جائیں گے)</span>
                            </div>
                        </label>
                    </div>
                </div>
                {/* Global Store Return & Refund Policy Editor */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-rose-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-rose-100 gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <Icons.refresh className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Return &amp; Refund Policy (واپسی کی پالیسی)</h2>
                                <p className="text-xs text-slate-500">Yeh policy aapki website ke Return Policy page aur har product page par show hoti hai.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                Markaz-Style 7-Day Standard
                            </span>
                            <Button 
                                type="button" 
                                size="sm" 
                                variant="secondary"
                                onClick={() => handleSyncSection('policy', 'Return Policy', {
                                    globalReturnPolicy: formData.globalReturnPolicy
                                })}
                                disabled={isSaving || activeSyncSection === 'policy'}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1.5 shrink-0"
                            >
                                {activeSyncSection === 'policy' ? <Spinner size="sm" /> : <Icons.cloud className="w-3.5 h-3.5 text-emerald-600" />}
                                <span>Save Policy to Firestore</span>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Store Return Policy Text (اردو یا انگلش میں پالیسی لکھیں)
                            </label>
                            <textarea
                                rows={5}
                                value={formData.globalReturnPolicy || ''}
                                onChange={e => setFormData({ ...formData, globalReturnPolicy: e.target.value })}
                                placeholder="Example: 7 days easy return & refund available. Parcel khol kar check karein, agar parcel defective, damaged ya ghalat niklay to foran hamare WhatsApp par unboxing video send karein. 100% full refund ya exchange guaranteed."
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-sans leading-relaxed text-slate-800 placeholder:text-slate-400"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                💡 Agar aap is box ko blank chorein ge to system ki taraf se standard <strong>7-Day Easy Return &amp; Replacement Policy</strong> har product par automatically display hogi.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-100 gap-2">
                        <div>
                            <h2 className="text-xl font-bold">Community Links</h2>
                            <p className="text-sm text-gray-500">Add links to your social media channels. They will appear on the "Join Community" page. Leave blank to hide.</p>
                        </div>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleSyncSection('contact', 'Community Links', {
                                whatsappGroupUrl: formData.whatsappGroupUrl,
                                whatsappChannelUrl: formData.whatsappChannelUrl,
                                telegramChannelUrl: formData.telegramChannelUrl,
                                youtubeChannelUrl: formData.youtubeChannelUrl,
                                instagramChannelUrl: formData.instagramChannelUrl,
                                facebookPageUrl: formData.facebookPageUrl
                            })}
                            disabled={isSaving || activeSyncSection === 'contact'}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                        >
                            {activeSyncSection === 'contact' ? <Spinner size="sm" /> : <Icons.cloud className="w-3.5 h-3.5 text-indigo-600" />}
                            <span>Save Links to Firestore</span>
                        </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input label="WhatsApp Group URL" value={formData.whatsappGroupUrl || ''} onChange={e => setFormData({...formData, whatsappGroupUrl: e.target.value})} />
                        <Input label="WhatsApp Channel URL" value={formData.whatsappChannelUrl || ''} onChange={e => setFormData({...formData, whatsappChannelUrl: e.target.value})} />
                        <Input label="Telegram Channel URL" value={formData.telegramChannelUrl || ''} onChange={e => setFormData({...formData, telegramChannelUrl: e.target.value})} />
                        <Input label="YouTube Channel URL" value={formData.youtubeChannelUrl || ''} onChange={e => setFormData({...formData, youtubeChannelUrl: e.target.value})} />
                        <Input label="Instagram Page URL" value={formData.instagramChannelUrl || ''} onChange={e => setFormData({...formData, instagramChannelUrl: e.target.value})} />
                        <Input label="Facebook Page URL" value={formData.facebookPageUrl || ''} onChange={e => setFormData({...formData, facebookPageUrl: e.target.value})} />
                    </div>
                </div>
                 {/* Homepage Banners Notice: Moved to dedicated Banner Management section */}
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                             <Icons.image className="w-5 h-5" />
                         </div>
                         <div>
                             <h3 className="font-bold text-slate-800 text-sm">Homepage Banners Moved to Banner Management</h3>
                             <p className="text-xs text-slate-500 mt-0.5">
                                 Homepage slider images and banners are now managed in the dedicated Banner Management section with improved photo previews and delete buttons.
                             </p>
                         </div>
                     </div>
                     <Link 
                         to="/admin/banners" 
                         className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 text-white text-xs font-bold rounded-xl shadow-xs hover:from-rose-700 hover:to-amber-700 transition-all shrink-0 text-center"
                     >
                         Manage Banners Here →
                     </Link>
                 </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-100 gap-2">
                        <div>
                            <h2 className="text-xl font-bold">Payment Methods</h2>
                            <p className="text-xs text-gray-500">Configure checkout payment options (COD, EasyPaisa, JazzCash, Bank Transfer)</p>
                        </div>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleSyncSection('payment', 'Payment Methods', {
                                paymentMethods: formData.paymentMethods
                            })}
                            disabled={isSaving || activeSyncSection === 'payment'}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                        >
                            {activeSyncSection === 'payment' ? <Spinner size="sm" /> : <Icons.cloud className="w-3.5 h-3.5 text-amber-600" />}
                            <span>Save Payments to Firestore</span>
                        </Button>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border p-4 rounded-md mb-4">
                        <Input value={paymentInput.name} onChange={e => setPaymentInput({...paymentInput, name: e.target.value})} placeholder="Method Name"/>
                        <Input value={paymentInput.details} onChange={e => setPaymentInput({...paymentInput, details: e.target.value})} placeholder="Details"/>
                        <Button type="button" onClick={addPaymentMethod}>Add Method</Button>
                    </div>
                    <div className="mt-4 space-y-2">
                        {formData.paymentMethods.map(method => (
                            <div key={method.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <div><p className="font-semibold">{method.name}</p><p className="text-sm text-gray-500">{method.details}</p></div>
                                <button onClick={() => removePaymentMethod(method.id)} className="text-red-500"><Icons.trash className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-2">Mobile App & Announcement Banner</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        The Play Store link is now managed directly from the Announcement Banner in Banner Management, where you can toggle it ON/OFF, write custom text, and display it to all store visitors.
                    </p>
                    
                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Icons.bell className="w-5 h-5 text-rose-600" />
                            <div>
                                <h4 className="text-sm font-bold text-rose-900">App Download & Announcement Banner</h4>
                                <p className="text-xs text-rose-700">Configure banner message, Play Store link, and active status.</p>
                            </div>
                        </div>
                        <a 
                            href="#/banners"
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                        >
                            Manage Banner
                        </a>
                    </div>

                    <div className="mt-6 bg-teal-50 p-4 rounded-xl border border-teal-100">
                        <div className="flex items-center gap-3 text-teal-800 mb-2">
                            <Icons.smartphone className="w-5 h-5" />
                            <h3 className="font-bold text-sm uppercase tracking-tight">PWA App Enabled</h3>
                        </div>
                        <p className="text-xs text-teal-700 leading-relaxed">
                            Your store automatically works as a Progressive Web App (PWA). Customers can install it directly from their browser on Android, iOS, and Desktop without needing an app store.
                        </p>
                    </div>
                </div>

                {/* Automatic Order Email Notification (Google SMTP) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                                <Icons.mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Order Email Notifications (Google SMTP)</h2>
                                <p className="text-xs text-slate-500">Instant automatic order alerts sent to your email inbox via Google SMTP</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Google SMTP (100% Free)
                        </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Jab bhi koi customer order place kare ga, to aapke diye gaye <strong>Gmail Address</strong> aur <strong>Google App Password</strong> ke zariye order ki mukammal details (Customer Name, Phone number, Address, Items, aur Total Bill) automatically aap ki email par send ho jayegi.
                    </p>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span>🔑 Google SMTP Login Credentials</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Input 
                                        label="Sender Gmail Address" 
                                        placeholder="aliihtasham20@gmail.com" 
                                        value={formData.gmailUser || ''} 
                                        onChange={e => setFormData({...formData, gmailUser: e.target.value})} 
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Aapka Gmail account jahan se email send hogi.</p>
                                </div>

                                <div>
                                    <div className="relative">
                                        <Input 
                                            type={showAppPassword ? 'text' : 'password'}
                                            label="Google 16-Character App Password" 
                                            placeholder="abcd efgh ijkl mnop" 
                                            value={formData.gmailAppPassword || ''} 
                                            onChange={e => setFormData({...formData, gmailAppPassword: e.target.value})} 
                                        />
                                        <button 
                                            type="button" 
                                            className="absolute right-3 top-9 text-xs text-slate-500 hover:text-slate-700 font-medium"
                                            onClick={() => setShowAppPassword(!showAppPassword)}
                                        >
                                            {showAppPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Google Account security se 16 letters ka banaya gaya App Password.</p>
                                </div>
                            </div>

                            <div>
                                <Input 
                                    label="Order Notification Receive Email (Optional - Dusri Email par lene ke liye)" 
                                    placeholder={formData.gmailUser || "aliihtasham20@gmail.com"} 
                                    value={formData.adminNotificationEmail || ''} 
                                    onChange={e => setFormData({...formData, adminNotificationEmail: e.target.value})} 
                                />
                                <p className="text-xs text-slate-400 mt-1">Agar khali choren ge to order alerts upar wali Gmail par hi deliver hon gi.</p>
                            </div>
                        </div>

                        {/* Step-by-Step Guide Box */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
                            <p className="font-bold text-amber-950 text-sm mb-1">📖 1-Minute Easy Guide (Google 16-Character App Password Kaise Banaye?):</p>
                            <p>1. Apne Google Account Security mein jayein: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-rose-600 font-semibold underline">myaccount.google.com/security</a></p>
                            <p>2. Check karein ke <strong>2-Step Verification</strong> ON hai (agar ON nahi hai to ON karein).</p>
                            <p>3. Search bar mein <strong>"App Passwords"</strong> likh kar open karein (ya 2-Step Verification ke page par sab se neeche App Passwords par click karein).</p>
                            <p>4. App name mein <strong>"Zivio Store"</strong> likhein aur <em>Create</em> dabayein. Google aapko 16 letters ka password show karega (maslan: <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-mono text-amber-900">abcd efgh ijkl mnop</code>). Woh password yahan paste karein aur neeche <strong>Save Settings</strong> dabayein!</p>
                        </div>

                        {/* Test Email Button and Status */}
                        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <Button 
                                type="button" 
                                onClick={handleSaveEmailCredentials} 
                                disabled={isSavingEmail}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm flex items-center gap-2 text-xs py-2.5 px-4 rounded-xl"
                            >
                                {isSavingEmail ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Saving Password...</span>
                                    </>
                                ) : emailSaveSuccess ? (
                                    <>
                                        <span>✅</span>
                                        <span>Saved Successfully!</span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.save className="w-4 h-4" />
                                        <span>Save Google Credentials</span>
                                    </>
                                )}
                            </Button>

                            <Button 
                                type="button" 
                                onClick={handleSendTestEmail} 
                                disabled={isTestingEmail}
                                className="bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-sm text-xs py-2.5 px-4 rounded-xl"
                            >
                                {isTestingEmail ? (
                                    <div className="flex items-center gap-2">
                                        <Spinner size="sm" />
                                        <span>Sending Test Email...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Icons.mail className="w-4 h-4" />
                                        <span>Send Test Email</span>
                                    </div>
                                )}
                            </Button>

                            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                                <input 
                                    type="checkbox" 
                                    checked={formData.enableOrderEmailAlerts ?? true}
                                    onChange={e => setFormData({...formData, enableOrderEmailAlerts: e.target.checked})}
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                                />
                                <span className="font-medium">Enable automatic order email alerts</span>
                            </label>
                        </div>

                        {testEmailResult && (
                            <div className={`p-3.5 rounded-xl text-sm border font-medium ${
                                testEmailResult.success 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}>
                                {testEmailResult.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* ☁️ Cloudflare Pages Production Environment Variables Guide */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-700 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
                                ☁️
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Cloudflare Pages Environment Variables</h2>
                                <p className="text-xs text-slate-400">Add these variables in Cloudflare Dashboard: <strong>Settings &gt; Environment Variables &gt; Production</strong></p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Required for Live Hosting
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300 border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700 text-slate-400">
                                    <th className="py-2 px-3 font-semibold">Variable Name</th>
                                    <th className="py-2 px-3 font-semibold">Purpose</th>
                                    <th className="py-2 px-3 font-semibold">Status / Value Hint</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                <tr>
                                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">GEMINI_API_KEY</td>
                                    <td className="py-2.5 px-3">AI Search &amp; Auto-Link Scraping Feature</td>
                                    <td className="py-2.5 px-3 text-emerald-400">Required (Google AI Studio Key)</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">RESEND_API_KEY</td>
                                    <td className="py-2.5 px-3">Instant Order Email Delivery (3000 free/mo)</td>
                                    <td className="py-2.5 px-3 text-emerald-400">Recommended for Cloudflare Edge</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">ADMIN_NOTIFICATION_EMAIL</td>
                                    <td className="py-2.5 px-3">Where to receive order notification alerts</td>
                                    <td className="py-2.5 px-3 text-slate-300">e.g. ali10cart@gmail.com</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">APP_NAME</td>
                                    <td className="py-2.5 px-3">Store name shown on emails &amp; headers</td>
                                    <td className="py-2.5 px-3 text-slate-300">e.g. {formData?.appName || 'Zivio'}</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">CLOUDINARY_CLOUD_NAME</td>
                                    <td className="py-2.5 px-3">Direct image uploads from browser/admin</td>
                                    <td className="py-2.5 px-3 text-slate-300">Cloudinary Dashboard Cloud Name</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">CLOUDINARY_API_KEY</td>
                                    <td className="py-2.5 px-3">Signed image upload authentication</td>
                                    <td className="py-2.5 px-3 text-slate-300">Cloudinary API Key</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">CLOUDINARY_API_SECRET</td>
                                    <td className="py-2.5 px-3">Signed image upload secret</td>
                                    <td className="py-2.5 px-3 text-slate-300">Cloudinary API Secret</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-4">Admin Security</h2>
                    <p className="text-sm text-gray-500 mb-2">To change your admin password, please use the Firebase Authentication console.</p>
                </div>
            </div>

            {/* Circular Logo Adjuster & Cropper Modal */}
            <LogoAdjusterModal
                isOpen={isAdjusterOpen}
                onClose={() => setIsAdjusterOpen(false)}
                imageSrc={adjusterImageSrc}
                onApply={handleApplyAdjustedLogo}
                appName={formData?.appName || 'Store'}
            />
        </div>
    );
};

export default Settings;