import React, { useState, useMemo } from 'react';
import type { PropertyListing, WizardStep, User, Category, Province, PromotionPlan, CardPaymentConfig, ZarinPalConfig, PromotionTier, ListingPackage, UserPackage } from '../types';
import { WIZARD_STEPS } from '../constants';
import ProgressBar from '../components/ProgressBar';
import Step1DetailsAndPricing from '../components/Step1_DetailsAndPricing';
import Step2MediaAndContact from '../components/Step2_MediaAndContact';
import ListingPreview from '../components/ListingPreview';
import PromoteModal from '../components/PromoteModal';

interface CreateListingPageProps {
    user: User | null;
    categories: Category[];
    provinces: Province[];
    promotionPlans?: PromotionPlan[];
    listingPackages?: ListingPackage[];
    userPackages?: UserPackage[];
    userListings?: PropertyListing[];
    cardPaymentConfig?: CardPaymentConfig;
    zarinPalConfig?: ZarinPalConfig;
    onListingSubmit: (data: PropertyListing, newUser?: { name: string, phone: string, password?: string, isAgent?: boolean, agencyName?: string }) => Promise<PropertyListing | void> | PropertyListing | void;
    onPromote?: (id: string, tier: PromotionTier) => void;
    onSubmitReceipt?: (receiptData: any) => void;
    onBuyPackage?: (pkg: ListingPackage, paymentMethod: 'card_to_card' | 'zarinpal', receiptData?: any) => void;
    onGoToUser?: () => void;
    onBackToHome: () => void;
}

const CreateListingPage: React.FC<CreateListingPageProps> = ({ 
  user, 
  categories, 
  provinces, 
  promotionPlans = [], 
  listingPackages = [],
  userPackages = [],
  userListings = [],
  cardPaymentConfig, 
  zarinPalConfig, 
  onListingSubmit, 
  onPromote, 
  onSubmitReceipt, 
  onBuyPackage,
  onGoToUser, 
  onBackToHome 
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [stepError, setStepError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdListing, setCreatedListing] = useState<PropertyListing | null>(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState<boolean>(false);
  const [agencyName, setAgencyName] = useState<string>(user?.agencyName || user?.agentProfile?.agencyName || '');

  // Package modal state
  const [isPackageBuyModalOpen, setIsPackageBuyModalOpen] = useState<boolean>(false);
  const [selectedPkg, setSelectedPkg] = useState<ListingPackage | null>(null);
  const [pkgPaymentMethod, setPkgPaymentMethod] = useState<'card_to_card' | 'zarinpal'>('card_to_card');
  const [pkgTrackingCode, setPkgTrackingCode] = useState('');
  const [pkgReceiptImage, setPkgReceiptImage] = useState('');
  const [pkgSuccessMsg, setPkgSuccessMsg] = useState('');

  const initialPropertyData: PropertyListing = {
    title: '',
    type: 'sale',
    category: categories[0]?.name || 'آپارتمان',
    province: provinces[0]?.name || 'تهران',
    city: provinces[0]?.cities?.[0] || 'تهران',
    neighborhood: '',
    size: '',
    bedrooms: '',
    bathrooms: '',
    yearBuilt: '',
    keyFeatures: '',
    description: '',
    price: '',
    deposit: '',
    rent: '',
    images: [],
    status: 'pending',
    promotion: 'none',
    createdAt: 0,
    expiryDate: 0,
    isAgentListing: user?.role === 'agent',
    ownerRole: user?.role === 'agent' ? 'agent' : 'user',
    agencyName: user?.role === 'agent' ? (user?.agencyName || user?.agentProfile?.agencyName || '') : undefined,
    contactMethod: 'all',
    showPhoneNumber: true
  };

  const [propertyData, setPropertyData] = useState<PropertyListing>(initialPropertyData);
  const [userData, setUserData] = useState<{ name: string; phone: string; password?: string; isAgent?: boolean; agencyName?: string }>({ 
    name: '', 
    phone: '', 
    password: '',
    isAgent: false,
    agencyName: ''
  });

  const currentStepIndex = useMemo(() => Math.max(0, WIZARD_STEPS.findIndex(step => step.id === currentStep)), [currentStep]);

  // User Quota Computations
  const activeUserPackage = useMemo(() => {
    if (!user) return null;
    return (userPackages || []).find(up => 
      up.userId === user.id && 
      up.status === 'active' && 
      up.remainingAds > 0 && 
      up.expiresAt > Date.now()
    );
  }, [user, userPackages]);

  const categoryQuotaInfo = useMemo(() => {
    const selectedCatName = propertyData.category;
    const catObj = categories.find(c => c.name === selectedCatName || c.id === selectedCatName);
    const freeDays = catObj?.freeAdLimitDays || catObj?.freeLimitDays || 30;
    const maxFree = catObj?.maxFreeAdsPerPeriod || catObj?.freeLimitCount || 1;

    if (!user) {
      return { freeRemaining: maxFree, maxFree, usedInPeriod: 0, freeDays };
    }

    const now = Date.now();
    const periodMs = freeDays * 86400000;
    const userCategoryAds = (userListings || []).filter(l => 
      l.ownerId === user.id && 
      (l.category === selectedCatName || l.category === catObj?.id) &&
      (now - l.createdAt < periodMs)
    );

    const usedInPeriod = userCategoryAds.length;
    const freeRemaining = Math.max(0, maxFree - usedInPeriod);

    return { freeRemaining, maxFree, usedInPeriod, freeDays };
  }, [user, propertyData.category, categories, userListings]);

  const totalAvailableQuota = (activeUserPackage ? activeUserPackage.remainingAds : 0) + categoryQuotaInfo.freeRemaining;
  const isQuotaExhausted = user ? (totalAvailableQuota <= 0) : false;

  const handleConfirmBuyPackage = () => {
    if (!selectedPkg || !onBuyPackage) return;
    if (pkgPaymentMethod === 'card_to_card' && (!pkgTrackingCode.trim() || !pkgReceiptImage.trim())) {
      setStepError('لطفاً کد پیگیری و تصویر فیش واریزی را وارد فرمایید.');
      return;
    }

    onBuyPackage(selectedPkg, pkgPaymentMethod, {
      trackingCode: pkgTrackingCode.trim() || 'PAY_' + Date.now(),
      receiptImageUrl: pkgReceiptImage.trim() || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=70'
    });

    setPkgSuccessMsg(`سفارش پکیج "${selectedPkg.title}" با موفقیت ثبت شد.`);
    setTimeout(() => {
      setIsPackageBuyModalOpen(false);
      setSelectedPkg(null);
      setPkgSuccessMsg('');
      setStepError('');
    }, 2000);
  };

  const validateStep1 = (): boolean => {
    setStepError('');
    if (!propertyData.province) {
      setStepError('لطفاً استان ملک را انتخاب فرمایید.');
      return false;
    }
    if (!propertyData.city) {
      setStepError('لطفاً شهر ملک را انتخاب فرمایید.');
      return false;
    }
    if (propertyData.size === '' || isNaN(Number(propertyData.size)) || Number(propertyData.size) <= 0) {
      setStepError('لطفاً متراژ ملک را به عدد وارد فرمایید.');
      return false;
    }
    if (propertyData.type === 'rent') {
      const hasDeposit = propertyData.deposit !== '' && !isNaN(Number(propertyData.deposit)) && Number(propertyData.deposit) >= 0;
      const hasRent = propertyData.rent !== '' && !isNaN(Number(propertyData.rent)) && Number(propertyData.rent) >= 0;
      const hasPrice = propertyData.price !== '' && !isNaN(Number(propertyData.price)) && Number(propertyData.price) > 0;
      if (!hasDeposit && !hasRent && !hasPrice) {
        setStepError('لطفاً مبلغ ودیعه (رهن) یا اجاره ماهانه را مشخص فرمایید.');
        return false;
      }
    } else {
      if (propertyData.price === '' || isNaN(Number(propertyData.price)) || Number(propertyData.price) <= 0) {
        setStepError('لطفاً مبلغ یا قیمت کل ملک را وارد فرمایید.');
        return false;
      }
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    setStepError('');
    if (!propertyData.title.trim()) {
      setStepError('لطفاً یک عنوان مناسب و جذاب برای آگهی بنویسید.');
      return false;
    }
    if (!user) {
      if (!userData.name.trim()) {
        setStepError('لطفاً نام و نام خانوادگی خود را وارد فرمایید.');
        return false;
      }
      const cleanPhone = userData.phone.trim().replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setStepError('لطفاً یک شماره همراه معتبر (مثلاً 09121234567) وارد کنید.');
        return false;
      }
    }
    return true;
  };

  const goToNextStep = () => {
    if (currentStep === 'details' || currentStepIndex === 0) {
      if (!validateStep1()) return;
      setCurrentStep('media_contact');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousStep = () => {
    setStepError('');
    setCurrentStep('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleSubmit = async () => {
    if (!validateStep1()) {
      setCurrentStep('details');
      return;
    }
    if (!validateStep2()) return;

    if (user && isQuotaExhausted) {
      setStepError('سهمیه ثبت آگهی رایگان و پکیج شما به پایان رسیده است. جهت ثبت این آگهی لطفاً پکیج جدید خریداری نمایید.');
      setIsPackageBuyModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    setStepError('');
    try {
      const isAgent = user?.role === 'agent';
      const finalAgency = isAgent ? (user?.agencyName || user?.agentProfile?.agencyName || agencyName || undefined) : undefined;
      
      const payload: PropertyListing = {
        ...propertyData,
        isAgentListing: isAgent,
        ownerRole: isAgent ? 'agent' : 'user',
        agencyName: finalAgency,
        contactPhone: !user ? userData.phone : (user.phone || propertyData.contactPhone)
      };

      const result = await onListingSubmit(payload, !user ? userData : undefined);
      if (result && typeof result === 'object' && 'id' in result) {
        setCreatedListing(result as PropertyListing);
      } else {
        setCreatedListing({
          ...payload,
          id: 'ad_' + Date.now(),
          status: 'pending'
        });
      }
    } catch (err: any) {
      setStepError('خطا در ثبت آگهی: ' + (err.message || 'لطفاً مجدداً تلاش کنید.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setPropertyData(initialPropertyData);
    setCreatedListing(null);
    setCurrentStep('details');
    setStepError('');
  };

  // SUCCESS VIEW AFTER SUBMITTING
  if (createdListing) {
    return (
      <div className="min-h-screen pb-32 pt-12" dir="rtl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-[3.5rem] p-8 sm:p-14 shadow-2xl border border-slate-100 text-center space-y-8 animate-fade-in">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-inner animate-bounce">
              🎉
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900">آگهی شما با موفقیت ثبت شد!</h1>
              <p className="text-slate-500 font-bold mt-2 text-sm sm:text-base">
                اطلاعات آگهی «{createdListing.title}» در سامانه ذخیره گردید.
              </p>
            </div>

            {/* AD SUMMARY CARD */}
            <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 text-right space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-500">شناسه پیگیری آگهی:</span>
                <span className="font-mono text-xs font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200" dir="ltr">
                  {createdListing.id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">وضعیت انتشار:</span>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${
                  createdListing.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {createdListing.status === 'approved' ? '✅ تایید و منتشر شده' : '⏳ در صف بررسی مدیریت'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">موقعیت:</span>
                <span className="text-xs font-black text-slate-800">{createdListing.province}، {createdListing.city} {createdListing.neighborhood ? `(${createdListing.neighborhood})` : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">قیمت:</span>
                <span className="text-xs font-black text-indigo-600">
                  {createdListing.type === 'rent'
                    ? `${Number(createdListing.deposit || createdListing.price || 0).toLocaleString('fa-IR')} تومان ودیعه ${createdListing.rent ? ' / ' + Number(createdListing.rent).toLocaleString('fa-IR') + ' تومان اجاره' : ''}`
                    : `${Number(createdListing.price).toLocaleString('fa-IR')} تومان`}
                </span>
              </div>
            </div>

            {/* UPSELL PROMOTION BANNER */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[3rem] shadow-xl text-right space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚀</span>
                <div>
                  <h3 className="text-lg font-black text-amber-300">مایلید آگهی شما ۱۰ برابر سریع‌تر معامله شود؟</h3>
                  <p className="text-xs font-bold text-slate-300 mt-0.5">با ارتقای آگهی به بسته نردبان، ویژه یا فوری، ملک خود را در صدر نتایج قرار دهید.</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black rounded-2xl shadow-lg hover:from-amber-300 hover:to-amber-400 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
                >
                  <span>⚡</span> ارتقای فوری آگهی (کارت‌به‌کارت / درگاه بانکی)
                </button>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {onGoToUser && (
                <button
                  type="button"
                  onClick={onGoToUser}
                  className="flex-1 py-4.5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                >
                  👤 مشاهده در پنل کاربری من
                </button>
              )}
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 py-4.5 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
              >
                ➕ ثبت یک آگهی جدید دیگر
              </button>
              <button
                type="button"
                onClick={onBackToHome}
                className="flex-1 py-4.5 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-900 transition-all active:scale-95"
              >
                🏠 بازگشت به صفحه اصلی
              </button>
            </div>
          </div>
        </div>

        {/* PROMOTE MODAL */}
        {isPromoteModalOpen && createdListing && (
          <PromoteModal
            listingId={createdListing.id}
            listingTitle={createdListing.title}
            promotionPlans={promotionPlans}
            cardPaymentConfig={cardPaymentConfig}
            zarinPalConfig={zarinPalConfig}
            currentUser={user}
            onClose={() => setIsPromoteModalOpen(false)}
            onSelect={(tier) => {
              if (onPromote && createdListing.id) {
                onPromote(createdListing.id, tier);
              }
              setIsPromoteModalOpen(false);
            }}
            onSubmitReceipt={onSubmitReceipt}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" dir="rtl">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-start">
          
          {/* Live Preview Sidebar (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-8">
            <button 
              onClick={onBackToHome} 
              className="group mb-8 inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center ml-2 shadow-sm border border-slate-100 group-hover:bg-indigo-50">
                <svg className="w-4 h-4 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
              بازگشت به صفحه اصلی
            </button>

            <div className="p-1 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-[2.5rem] overflow-hidden">
              <div className="bg-white/40 backdrop-blur-xl p-2 rounded-[2.3rem] border border-white/50">
                <div className="flex items-center justify-between px-6 py-4">
                  <h2 className="text-base font-black text-slate-800 uppercase tracking-tighter">پیش‌نمایش زنده آگهی</h2>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <ListingPreview data={propertyData} />
              </div>
            </div>
          </aside>
          
          {/* Main Wizard Form */}
          <main className="lg:col-span-8">
            <div className="glass-card bg-white/90 backdrop-blur-xl rounded-[3rem] p-6 sm:p-12 min-h-[600px] flex flex-col shadow-xl border border-slate-100">
              
              {/* Header & Step Indicator */}
              <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                    ثبت سریع و هوشمند آگهی ملک
                  </h1>
                  <p className="text-slate-500 font-medium mt-1 text-xs sm:text-sm">
                    فرآیند ثبت آگهی در ۲ مرحله آسان و سریع طراحی شده است.
                  </p>
                </div>
                <div className="sm:w-80 shrink-0">
                  <ProgressBar currentStep={currentStep} />
                </div>
              </header>

              {/* USER QUOTA STATUS INDICATOR BAR */}
              {user && (
                <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
                  isQuotaExhausted 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : activeUserPackage 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                }`}>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-xl">
                      {isQuotaExhausted ? '⚠️' : activeUserPackage ? '📦' : '🎁'}
                    </span>
                    <div>
                      {activeUserPackage ? (
                        <span>
                          پکیج فعال: <strong className="font-black text-emerald-700">{activeUserPackage.packageTitle}</strong> ({activeUserPackage.remainingAds} آگهی سهمیه باقی‌مانده)
                        </span>
                      ) : categoryQuotaInfo.freeRemaining > 0 ? (
                        <span>
                          سهمیه رایگان در «{propertyData.category}»: <strong className="font-black text-indigo-700">{categoryQuotaInfo.freeRemaining} آگهی رایگان</strong> باقی مانده است.
                        </span>
                      ) : (
                        <span className="font-black text-rose-700">
                          سهمیه رایگان شما در دسته‌بندی «{propertyData.category}» به اتمام رسیده است.
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPackageBuyModalOpen(true)}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 shrink-0 shadow-sm ${
                      isQuotaExhausted 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 animate-pulse' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    {isQuotaExhausted ? '⚡ خرید فوری پکیج سهمیه' : '🛒 مشاهده و ارتقای پکیج‌ها'}
                  </button>
                </div>
              )}

              {/* ERROR NOTIFICATION BANNER */}
              {stepError && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-3 animate-shake">
                  <span className="text-base">⚠️</span>
                  <span>{stepError}</span>
                </div>
              )}

              {/* Active Step Content */}
              <div key={currentStep} className="flex-grow animate-step">
                {currentStep === 'details' ? (
                  <Step1DetailsAndPricing
                    data={propertyData}
                    setData={setPropertyData}
                    categories={categories}
                    provinces={provinces}
                  />
                ) : (
                  <Step2MediaAndContact
                    data={propertyData}
                    setData={setPropertyData}
                    userData={userData}
                    setUserData={setUserData}
                    user={user}
                  />
                )}
              </div>

              {/* Navigation Actions */}
              <div className="mt-12 flex justify-between items-center pt-8 border-t border-slate-100">
                <div className="flex-1">
                  {currentStep !== 'details' && (
                    <button 
                      type="button"
                      onClick={goToPreviousStep} 
                      disabled={isSubmitting}
                      className="inline-flex items-center px-8 py-4 text-xs sm:text-sm font-bold rounded-2xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
                      </svg>
                      بازگشت به مرحله ۱ (مشخصات و قیمت)
                    </button>
                  )}
                </div>
                
                <div className="flex-1 flex justify-end">
                  {currentStep === 'details' ? (
                    <button 
                      type="button"
                      onClick={goToNextStep} 
                      className="inline-flex items-center px-10 py-4 text-xs sm:text-sm font-black rounded-2xl shadow-xl shadow-indigo-500/25 text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all active:scale-95 cursor-pointer"
                    >
                      مرحله بعدی (تصاویر، متن و ثبت)
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
                      </svg>
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleSubmit} 
                      disabled={isSubmitting}
                      className={`inline-flex items-center px-10 py-4 text-xs sm:text-sm font-black rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                        isQuotaExhausted
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
                      }`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⏳</span> در حال ثبت آگهی...
                        </span>
                      ) : isQuotaExhausted ? (
                        <span className="flex items-center gap-2">
                          🛒 خرید پکیج جهت ثبت
                        </span>
                      ) : (
                        <>
                          تایید نهایی و انتشار آگهی
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>

      {/* EMBEDDED PACKAGE PURCHASE MODAL */}
      {isPackageBuyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in dir-rtl">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">خرید پکیج سهمیه ثبت آگهی</h3>
                <p className="text-xs text-slate-500 mt-1">با انتخاب پکیج، سهمیه آگهی شما بلافاصله افزایش می‌یابد.</p>
              </div>
              <button 
                onClick={() => { setIsPackageBuyModalOpen(false); setSelectedPkg(null); setPkgSuccessMsg(''); }}
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {pkgSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center space-y-3">
                <span className="text-4xl block">🎉</span>
                <p className="font-black text-base">{pkgSuccessMsg}</p>
                <p className="text-xs text-emerald-600">پکیج در صف فعال‌سازی قرار گرفت. می‌توانید فرم ثبت آگهی را ادامه دهید.</p>
              </div>
            ) : !selectedPkg ? (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-600">پکیج مورد نظر خود را انتخاب نمایید:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {listingPackages.filter(p => p.isActive).map(pkg => (
                    <div 
                      key={pkg.id} 
                      onClick={() => setSelectedPkg(pkg)}
                      className="p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 bg-slate-50/50 hover:bg-indigo-50/30 cursor-pointer transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
                    >
                      {pkg.badge && (
                        <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                          {pkg.badge}
                        </span>
                      )}
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">{pkg.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1">{pkg.description}</p>
                      </div>
                      <div className="border-t border-slate-200 pt-3">
                        <div className="text-xs text-slate-500">سهمیه: <strong className="text-slate-900 font-black">{pkg.adCount} آگهی</strong></div>
                        <div className="text-sm font-black text-indigo-600 mt-1">{pkg.price.toLocaleString('fa-IR')} تومان</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-indigo-500 block">پکیج انتخابی:</span>
                    <strong className="text-sm font-black text-indigo-900">{selectedPkg.title} ({selectedPkg.adCount} آگهی)</strong>
                  </div>
                  <button onClick={() => setSelectedPkg(null)} className="text-xs text-indigo-600 underline font-bold">تغییر پکیج</button>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">روش پرداخت:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPkgPaymentMethod('card_to_card')}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                        pkgPaymentMethod === 'card_to_card' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      💳 کارت به کارت
                    </button>
                    <button
                      type="button"
                      onClick={() => setPkgPaymentMethod('zarinpal')}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                        pkgPaymentMethod === 'zarinpal' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      🟡 درگاه زرین‌پال
                    </button>
                  </div>
                </div>

                {pkgPaymentMethod === 'card_to_card' && cardPaymentConfig && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                    <div className="font-bold text-slate-800">مشخصات حساب جهت واریز:</div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">بانک:</span>
                      <span className="font-bold">{cardPaymentConfig.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">شماره کارت:</span>
                      <span className="font-mono font-bold text-slate-900" dir="ltr">{cardPaymentConfig.cardNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">به نام:</span>
                      <span className="font-bold">{cardPaymentConfig.accountHolder}</span>
                    </div>

                    <div className="pt-2 space-y-2">
                      <input 
                        type="text" 
                        placeholder="کد پیگیری واریز (شماره ارجاع)"
                        value={pkgTrackingCode}
                        onChange={e => setPkgTrackingCode(e.target.value)}
                        className="w-full bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs outline-none focus:border-indigo-500"
                      />
                      <input 
                        type="text" 
                        placeholder="لینک یا آدرس فیش پرداخت"
                        value={pkgReceiptImage}
                        onChange={e => setPkgReceiptImage(e.target.value)}
                        className="w-full bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmBuyPackage}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-200 transition-all active:scale-95"
                  >
                    تایید و ثبت سفارش پکیج
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPkg(null)}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateListingPage;
