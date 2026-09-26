import React, { useState } from 'react';
import type { PromotionTier, PromotionPlan, CardPaymentConfig, ZarinPalConfig, User } from '../types';
import { compressImage } from '../utils/imageCompressor';

interface PromoteModalProps {
    listingId?: string;
    listingTitle: string;
    promotionPlans: PromotionPlan[];
    cardPaymentConfig?: CardPaymentConfig;
    zarinPalConfig?: ZarinPalConfig;
    currentUser?: User | null;
    onClose: () => void;
    onSelect: (tier: PromotionTier) => void;
    onSubmitReceipt?: (receiptData: {
        listingId: string;
        listingTitle: string;
        planId: PromotionTier;
        planTitle: string;
        amount: string;
        trackingCode: string;
        receiptImageUrl: string;
    }) => void;
}

const PromoteModal: React.FC<PromoteModalProps> = ({ 
    listingId = 'l1', 
    listingTitle, 
    promotionPlans, 
    cardPaymentConfig, 
    zarinPalConfig,
    currentUser,
    onClose, 
    onSelect,
    onSubmitReceipt
}) => {
    const [selectedPlan, setSelectedPlan] = useState<PromotionPlan | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'online'>('card');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Card-to-card submission state
    const [senderCardLast4, setSenderCardLast4] = useState('');
    const [trackingCode, setTrackingCode] = useState('');
    const [transferDate, setTransferDate] = useState(() => new Date().toLocaleDateString('fa-IR'));
    const [receiptImage, setReceiptImage] = useState<string>('');
    const [userNotes, setUserNotes] = useState('');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
    const [receiptError, setReceiptError] = useState('');
    const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);

    const isCardEnabled = cardPaymentConfig?.isEnabled !== false;
    const isOnlineEnabled = zarinPalConfig?.isEnabled !== false;

    const copyToClipboard = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressingReceipt(true);
            try {
                const compressed = await compressImage(file, 1200, 1200, 0.82);
                setReceiptImage(compressed);
            } catch (err) {
                console.error("Failed to compress receipt image:", err);
            } finally {
                setIsCompressingReceipt(false);
            }
        }
    };

    const handleOnlinePayment = (plan: PromotionPlan) => {
        setIsProcessing(true);
        setTimeout(() => {
            onSelect(plan.id);
            setIsProcessing(false);
            onClose();
        }, 2200);
    };

    const handleCardPaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan) return;
        
        if (!trackingCode.trim()) {
            setReceiptError('لطفاً شماره پیگیری یا شماره ارجاع واریز را وارد کنید.');
            return;
        }

        if (senderCardLast4 && senderCardLast4.length !== 4) {
            setReceiptError('لطفاً دقیقاً ۴ رقم آخر شماره کارت خود را وارد کنید.');
            return;
        }

        setReceiptError('');
        setIsProcessing(true);

        const receiptImageUrl = receiptImage || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=70';

        setTimeout(() => {
            if (onSubmitReceipt) {
                onSubmitReceipt({
                    listingId,
                    listingTitle,
                    planId: selectedPlan.id,
                    planTitle: selectedPlan.title,
                    amount: selectedPlan.price,
                    trackingCode: trackingCode.trim() + (senderCardLast4 ? ` (کارت: ${senderCardLast4})` : ''),
                    receiptImageUrl
                });
            } else {
                onSelect(selectedPlan.id);
            }
            setIsProcessing(false);
            setIsSubmittedSuccess(true);
        }, 1200);
    };

    // Calculate Rials from Toman string (e.g. '۱۴۹,۰۰۰' or '149000')
    const getRialValue = (priceStr: string) => {
        const clean = priceStr.replace(/[^0-9]/g, '');
        const num = parseInt(clean, 10);
        if (isNaN(num)) return '';
        return (num * 10).toLocaleString('fa-IR');
    };

    if (isProcessing) {
        return (
            <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-fade-in">
                <div className="text-center max-w-sm">
                    <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-3xl">
                            {paymentMethod === 'online' ? '💳' : '🏦'}
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">
                        {paymentMethod === 'online' ? 'در حال اتصال به درگاه پرداخت' : 'در حال ثبت فیش واریزی'}
                    </h2>
                    <p className="text-indigo-200 font-bold text-sm">
                        {paymentMethod === 'online' ? 'در حال برقراری ارتباط با شاپرک...' : 'اطلاعات در سامانه مالی هوشمند ثبت می‌گردد...'}
                    </p>
                    <p className="text-slate-400 text-xs mt-8">لطفاً صفحه را نبندید و شکیبا باشید.</p>
                </div>
            </div>
        );
    }

    if (isSubmittedSuccess) {
        return (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-[3.5rem] p-8 sm:p-12 w-full max-w-lg shadow-2xl text-center relative border border-slate-100">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner animate-bounce">
                        ✓
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">فیش واریز با موفقیت ثبت شد</h3>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed mb-6">
                        رسید و مشخصات واریز کارت‌به‌کارت شما دریافت شد و به <span className="text-indigo-600 font-black">بخش مدیریت مالی سایت</span> ارسال گردید. به محض تایید توسط مدیریت، بسته «{selectedPlan?.title}» به صورت خودکار برای آگهی شما فعال خواهد شد.
                    </p>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8 text-right text-xs font-bold space-y-2.5">
                        <div className="flex justify-between text-slate-600"><span>عنوان آگهی:</span> <span className="text-slate-900 font-black">{listingTitle}</span></div>
                        <div className="flex justify-between text-slate-600"><span>بسته ارتقا:</span> <span className="text-indigo-600 font-black">{selectedPlan?.title}</span></div>
                        <div className="flex justify-between text-slate-600"><span>مبلغ واریزی:</span> <span className="text-emerald-600 font-black">{selectedPlan?.price} تومان</span></div>
                        <div className="flex justify-between text-slate-600"><span>کد پیگیری:</span> <span className="font-mono text-slate-900 font-black bg-white px-2 py-0.5 rounded border border-slate-200" dir="ltr">{trackingCode}</span></div>
                        <div className="flex justify-between text-slate-600"><span>وضعیت:</span> <span className="text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-black">در انتظار بررسی مدیریت</span></div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-full py-4.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        متوجه شدم و بستن
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-[3.5rem] p-6 sm:p-10 w-full max-w-4xl shadow-2xl relative border border-white/20 my-8 max-h-[92vh] overflow-y-auto">
                
                {/* HEADER */}
                <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full mb-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                            <span className="text-[10px] font-black text-indigo-700">افزایش چشمگیر بازدید ملک</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">ارتقای هوشمند آگهی</h2>
                        <p className="text-slate-500 mt-1 font-bold text-xs sm:text-sm">آگهی «{listingTitle}» را به صدر نتایج جستجو بیاورید.</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors text-slate-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                {!selectedPlan ? (
                    /* STEP 1: CHOOSE PLAN */
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {promotionPlans.map((plan) => (
                                <div 
                                    key={plan.id}
                                    className={`p-8 rounded-[2.5rem] border-2 transition-all hover:scale-105 flex flex-col cursor-pointer group ${plan.color} ${plan.id === 'special' ? 'ring-4 ring-rose-200 shadow-xl' : ''} ${plan.id === 'premium' ? 'ring-4 ring-amber-200 shadow-xl' : ''}`}
                                    onClick={() => setSelectedPlan(plan)}
                                >
                                    <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">{plan.icon}</div>
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="text-xl font-black">{plan.title}</h3>
                                        {plan.durationDays > 0 ? (
                                            <span className="text-[11px] font-black bg-white/70 px-2.5 py-0.5 rounded-lg">{plan.durationDays} روزه</span>
                                        ) : (
                                            <span className="text-[11px] font-black bg-white/70 px-2.5 py-0.5 rounded-lg">فوری</span>
                                        )}
                                    </div>
                                    <p className="text-2xl font-black mb-6">{plan.price} <span className="text-xs font-bold opacity-70">تومان</span></p>
                                    
                                    <ul className="space-y-3 mb-8 flex-grow">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-center text-xs font-bold gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40"></div>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <button className="w-full py-4 bg-white/80 backdrop-blur-md rounded-2xl text-xs font-black border border-white/40 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                        انتخاب و ادامه پرداخت
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[2.5rem] border border-blue-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl flex-shrink-0 shadow-md">💡</div>
                            <div className="text-xs sm:text-sm font-bold text-blue-900 leading-relaxed">
                                <span className="font-black">روش‌های پرداخت پشتیبانی‌شده:</span> امکان واریز سریع کارت به کارت به شماره کارت بانکی سایت همراه با ثبت فیش، و همچنین پرداخت مستقیم اینترنتی برای تمامی مشتریان فراهم است.
                            </div>
                        </div>
                    </div>
                ) : (
                    /* STEP 2: PAYMENT METHOD & CARD-TO-CARD REDESIGN */
                    <div className="space-y-8 animate-step">
                        {/* SELECTED PLAN SUMMARY */}
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl shadow-sm">
                                    {selectedPlan.icon}
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">طرح انتخابی</span>
                                    <h4 className="text-lg font-black text-slate-900">{selectedPlan.title}</h4>
                                    <p className="text-xs font-bold text-slate-500">
                                        مبلغ قابل پرداخت: <span className="text-indigo-600 font-black text-base">{selectedPlan.price} تومان</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedPlan(null)} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors">
                                تغییر بسته
                            </button>
                        </div>

                        {/* PAYMENT METHOD TABS */}
                        <div>
                            <label className="text-xs font-black text-slate-400 block mb-3 uppercase tracking-widest mr-2">روش پرداخت را انتخاب نمایید</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {isCardEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        className={`p-5 rounded-2xl border-2 font-black text-right transition-all flex items-center gap-4 ${paymentMethod === 'card' ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 shadow-md ring-2 ring-emerald-200' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md">🏦</div>
                                        <div>
                                            <div className="text-sm font-black">کارت به کارت (واریز دستی)</div>
                                            <div className="text-[11px] text-slate-500 font-bold mt-0.5">انتقال وجه از موبایل بانک و آپلود فیش</div>
                                        </div>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('online')}
                                    className={`p-5 rounded-2xl border-2 font-black text-right transition-all flex items-center gap-4 ${paymentMethod === 'online' ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-md ring-2 ring-indigo-200' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md">💳</div>
                                    <div>
                                        <div className="text-sm font-black">درگاه پرداخت اینترنتی آنلاین</div>
                                        <div className="text-[11px] text-slate-500 font-bold mt-0.5">اتصال مستقیم به زرین‌پال و فعال‌سازی فوری</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* REDESIGNED CARD TO CARD EXPERIENCE */}
                        {paymentMethod === 'card' && isCardEnabled && (
                            <div className="space-y-8 animate-fade-in">
                                
                                {/* 1. REALISTIC IRANIAN BANK CARD UI */}
                                <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/10">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                    
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-xl">
                                                🏦
                                            </div>
                                            <div>
                                                <span className="font-black text-base text-amber-300">{cardPaymentConfig?.bankName || 'بانک ملی ایران'}</span>
                                                <span className="text-[10px] text-slate-400 block">حساب تجاری رسمی پلتفرم</span>
                                            </div>
                                        </div>
                                        <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black px-3.5 py-1.5 rounded-full">
                                            پذیرنده معتبر
                                        </span>
                                    </div>

                                    {/* CARD NUMBER */}
                                    <div className="my-6 bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="text-center sm:text-right">
                                            <div className="text-[11px] font-bold text-slate-300 mb-1">شماره کارت مقصد:</div>
                                            <div className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-amber-300" dir="ltr">
                                                {cardPaymentConfig?.cardNumber || '6037-9918-1234-5678'}
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => copyToClipboard(cardPaymentConfig?.cardNumber || '6037991812345678', 'card')}
                                            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg active:scale-95"
                                        >
                                            {copiedField === 'card' ? '✓ کپی شد!' : '📋 کپی شماره کارت'}
                                        </button>
                                    </div>

                                    {/* DETAILS GRID */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold text-slate-200">
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                            <span className="text-slate-400 block text-[10px] mb-1">نام صاحب حساب:</span>
                                            <span className="font-black text-white text-sm">{cardPaymentConfig?.accountHolder || 'مدیریت آگهی املاک'}</span>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                            <span className="text-slate-400 block text-[10px] mb-1">مبلغ واریز:</span>
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-emerald-400 text-sm">{selectedPlan.price} تومان</span>
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(selectedPlan.price.replace(/[^0-9]/g, ''), 'amount')}
                                                    className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-emerald-300"
                                                >
                                                    {copiedField === 'amount' ? '✓' : 'کپی'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                                            <div>
                                                <span className="text-slate-400 block text-[10px] mb-1">شماره شبا (IBAN):</span>
                                                <span className="font-mono text-slate-200 text-[10px]" dir="ltr">{cardPaymentConfig?.iban || 'IR120170000000123456789012'}</span>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => copyToClipboard(cardPaymentConfig?.iban || 'IR120170000000123456789012', 'iban')}
                                                className="text-[10px] bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg text-indigo-200"
                                            >
                                                {copiedField === 'iban' ? '✓' : 'کپی'}
                                            </button>
                                        </div>
                                    </div>

                                    {cardPaymentConfig?.description && (
                                        <p className="mt-4 text-[11px] text-indigo-200 font-bold bg-white/5 p-3 rounded-xl border border-white/5">
                                            💡 {cardPaymentConfig.description}
                                        </p>
                                    )}
                                </div>

                                {/* 2. RECEIPT SUBMISSION FORM */}
                                <form onSubmit={handleCardPaymentSubmit} className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm">۲</span>
                                        <h4 className="text-lg font-black text-slate-800">
                                            ثبت مشخصات واریز کارت به کارت
                                        </h4>
                                    </div>

                                    {receiptError && (
                                        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold animate-shake">
                                            ⚠️ {receiptError}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <div>
                                            <label className="text-xs font-black text-slate-700 block mb-2">
                                                شماره پیگیری / ارجاع *
                                            </label>
                                            <input 
                                                type="text" 
                                                value={trackingCode}
                                                onChange={e => setTrackingCode(e.target.value)}
                                                className="w-full bg-white p-4 rounded-2xl border border-slate-200 font-mono font-bold text-left text-sm tracking-widest focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                                                placeholder="مثلا: 9823410582"
                                                dir="ltr"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-black text-slate-700 block mb-2">
                                                ۴ رقم آخر کارت شما
                                            </label>
                                            <input 
                                                type="text" 
                                                maxLength={4}
                                                value={senderCardLast4}
                                                onChange={e => setSenderCardLast4(e.target.value.replace(/[^0-9]/g, ''))}
                                                className="w-full bg-white p-4 rounded-2xl border border-slate-200 font-mono font-bold text-center text-sm tracking-widest focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                                                placeholder="مثلا: 5412"
                                                dir="ltr"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-black text-slate-700 block mb-2">
                                                تاریخ واریز
                                            </label>
                                            <input 
                                                type="text" 
                                                value={transferDate}
                                                onChange={e => setTransferDate(e.target.value)}
                                                className="w-full bg-white p-4 rounded-2xl border border-slate-200 font-bold text-center text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                                                placeholder="۱۴۰۳/۰۶/۱۵"
                                            />
                                        </div>
                                    </div>

                                    {/* UPLOAD RECEIPT IMAGE */}
                                    <div>
                                        <label className="text-xs font-black text-slate-700 block mb-2">
                                            تصویر فیش یا اسکرین‌شات رسید انتقال وجه (اختیاری اما تسریع‌کننده تایید)
                                        </label>
                                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleReceiptUpload}
                                                className="w-full text-xs font-bold file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                            />
                                            {isCompressingReceipt && (
                                                <span className="text-xs text-indigo-600 font-black animate-pulse">در حال آماده‌سازی تصویر...</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* RECEIPT PREVIEW */}
                                    {receiptImage && (
                                        <div className="flex items-center gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                            <img src={receiptImage} alt="فیش واریز" className="w-20 h-16 rounded-xl object-cover border border-emerald-200 shadow-sm" />
                                            <div>
                                                <span className="text-xs font-black text-emerald-800 block">تصویر فیش با موفقیت ضمیمه گردید</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setReceiptImage('')}
                                                    className="text-[11px] font-bold text-rose-600 hover:underline mt-1"
                                                >
                                                    حذف تصویر
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 flex flex-col sm:flex-row gap-4">
                                        <button 
                                            type="submit"
                                            className="flex-grow py-5 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <span>✓</span> ثبت نهایی فیش و ارسال به مدیریت مالی
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setSelectedPlan(null)}
                                            className="px-8 py-5 bg-slate-200 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-300 transition-all"
                                        >
                                            انصراف
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ONLINE PAYMENT OPTION */}
                        {paymentMethod === 'online' && (
                            <div className="bg-indigo-50/60 p-8 rounded-[2.5rem] border border-indigo-100 text-center space-y-6">
                                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg shadow-indigo-500/20">
                                    🔒
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-indigo-950">پرداخت آنلاین و آنی از طریق شبکه شاپرک</h4>
                                    <p className="text-xs font-bold text-indigo-700/80 max-w-md mx-auto mt-2 leading-relaxed">
                                        با تمام کارتهای عضو شتاب می‌توانید به درگاه امن پرداخت متصل شوید. بلافاصله پس از تکمیل تراکنش، طرح {selectedPlan.title} به صورت خودکار فعال خواهد شد.
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleOnlinePayment(selectedPlan)}
                                    className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    انتقال به درگاه شاپرک و پرداخت {selectedPlan.price} تومان
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromoteModal;
