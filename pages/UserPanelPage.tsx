import React, { useState } from 'react';
import type { 
  PropertyListing, 
  User, 
  PromotionTier, 
  PromotionPlan, 
  Conversation, 
  PaymentReceipt, 
  CardPaymentConfig, 
  ZarinPalConfig,
  ListingPackage, 
  UserPackage, 
  SupportTicket,
  Category,
  SiteBrandingConfig
} from '../types';
import Header from '../components/Header';
import ListingCard from '../components/ListingCard';
import ListingDetailModal from '../components/ListingDetailModal';
import PromoteModal from '../components/PromoteModal';
import ChatWindow from '../components/ChatWindow';

interface UserPanelPageProps {
  user: User | null;
  listings: PropertyListing[];
  promotionPlans: PromotionPlan[];
  listingPackages?: ListingPackage[];
  userPackages?: UserPackage[];
  conversations: Conversation[];
  paymentReceipts?: PaymentReceipt[];
  supportTickets?: SupportTicket[];
  cardPaymentConfig?: CardPaymentConfig;
  zarinPalConfig?: ZarinPalConfig;
  categories?: Category[];
  siteBranding?: SiteBrandingConfig;
  initialTab?: 'my-ads' | 'packages' | 'messages' | 'tickets' | 'payments' | 'favorites';
  onBackToHome: () => void;
  onLogout: () => void;
  onGoToCreate: () => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string) => void;
  onPromote: (id: string, tier: PromotionTier) => void;
  onSubmitReceipt?: (receiptData: any) => void;
  onSendMessage: (convId: string, text: string) => void;
  onBuyPackage?: (pkg: ListingPackage, paymentMethod: 'card_to_card' | 'zarinpal', receiptData?: any) => void;
  onCreateTicket?: (ticketData: { subject: string; department: any; priority: any; message: string }) => void;
  onSendTicketMessage?: (ticketId: string, text: string) => void;
  onBackToPwa?: () => void;
}

const UserPanelPage: React.FC<UserPanelPageProps> = ({ 
    user, 
    listings, 
    promotionPlans, 
    listingPackages = [], 
    userPackages = [], 
    conversations, 
    paymentReceipts = [], 
    supportTickets = [],
    cardPaymentConfig, 
    zarinPalConfig,
    categories = [],
    siteBranding,
    initialTab,
    onBackToHome, 
    onLogout, 
    onGoToCreate,
    onDelete, 
    onToggleLike, 
    onPromote, 
    onSubmitReceipt, 
    onSendMessage,
    onBuyPackage,
    onCreateTicket,
    onSendTicketMessage,
    onBackToPwa
}) => {
  const [activeTab, setActiveTab] = useState<'my-ads' | 'packages' | 'messages' | 'tickets' | 'payments' | 'favorites'>(initialTab || 'my-ads');
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [promotingAd, setPromotingAd] = useState<PropertyListing | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  // Package Purchase Modal State
  const [selectedPackageForBuy, setSelectedPackageForBuy] = useState<ListingPackage | null>(null);
  const [pkgPaymentMethod, setPkgPaymentMethod] = useState<'card_to_card' | 'zarinpal'>('card_to_card');
  const [pkgTrackingCode, setPkgTrackingCode] = useState('');
  const [pkgReceiptImage, setPkgReceiptImage] = useState('');
  const [pkgBuyingSuccess, setPkgBuyingSuccess] = useState('');

  // Ticket creation modal state
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDepartment, setTicketDepartment] = useState<'general' | 'financial' | 'technical' | 'listings' | 'agent'>('general');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [ticketInitialMessage, setTicketInitialMessage] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Logout confirm modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const userPhoneClean = user?.phone ? user.phone.replace(/\D/g, '') : '';
  const myAds = user ? listings.filter(l => {
    if (l.ownerId && l.ownerId === user.id) return true;
    if (userPhoneClean) {
      const cPhone = (l.contactPhone || (l as any).ownerPhone || l.contact?.phone || '').replace(/\D/g, '');
      if (cPhone && cPhone === userPhoneClean) return true;
    }
    return false;
  }) : []; 
  const favorites = listings.filter(l => l.isLiked);
  const myConversations = user ? conversations.filter(c => c.ownerId === user.id || c.seekerId === user.id) : [];
  const myReceipts = user ? paymentReceipts.filter(r => r.userId === user.id || (userPhoneClean && r.userPhone && r.userPhone.replace(/\D/g, '') === userPhoneClean)) : [];
  const myUserPackages = user ? userPackages.filter(p => p.userId === user.id) : [];
  const activeUserPackages = myUserPackages.filter(p => p.status === 'active' && p.remainingAds > 0 && p.expiresAt > Date.now());
  const totalRemainingAds = activeUserPackages.reduce((acc, curr) => acc + curr.remainingAds, 0);
  const myTickets = user ? supportTickets.filter(t => t.userId === user.id) : [];
  const activeTicket = myTickets.find(t => t.id === activeTicketId);

  const getStatusBadge = (status: PropertyListing['status'], reason?: string) => {
    switch (status) {
      case 'pending': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[11px] font-black shadow-sm flex items-center gap-1">⏳ در انتظار تایید</span>;
      case 'approved': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-black shadow-sm flex items-center gap-1">✅ تایید شده</span>;
      case 'rejected': return (
        <div className="flex flex-col items-end gap-1">
          <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[11px] font-black shadow-sm flex items-center gap-1">❌ تایید نشد</span>
          {reason && <p className="text-[10px] text-rose-600 font-bold bg-white/95 p-1.5 rounded-xl border border-rose-200 max-w-[160px] shadow-sm">دلیل: {reason}</p>}
        </div>
      );
      case 'expired': return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[11px] font-black shadow-sm flex items-center gap-1">📅 منقضی شده</span>;
      default: return null;
    }
  };

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketInitialMessage.trim()) return;
    if (onCreateTicket) {
      onCreateTicket({
        subject: ticketSubject.trim(),
        department: ticketDepartment,
        priority: ticketPriority,
        message: ticketInitialMessage.trim()
      });
    }
    setTicketSubject('');
    setTicketInitialMessage('');
    setIsTicketModalOpen(false);
  };

  const handleSendTicketReply = () => {
    if (!ticketReplyText.trim() || !activeTicketId) return;
    if (onSendTicketMessage) {
      onSendTicketMessage(activeTicketId, ticketReplyText.trim());
    }
    setTicketReplyText('');
  };

  const handlePackagePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageForBuy) return;

    if (pkgPaymentMethod === 'card_to_card' && !pkgTrackingCode.trim()) {
      alert('لطفاً شماره پیگیری یا ۴ رقم آخر کارت را وارد نمایید.');
      return;
    }

    if (onBuyPackage) {
      onBuyPackage(selectedPackageForBuy, pkgPaymentMethod, {
        trackingCode: pkgTrackingCode,
        receiptImageUrl: pkgReceiptImage,
        amount: selectedPackageForBuy.price.toLocaleString('fa-IR')
      });
    }

    setPkgBuyingSuccess('درخواست خرید بسته با موفقیت ثبت شد و پس از تایید مالی مدیریت فعال می‌گردد.');
    setTimeout(() => {
      setSelectedPackageForBuy(null);
      setPkgBuyingSuccess('');
      setPkgTrackingCode('');
      setPkgReceiptImage('');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      <Header onGoToCreate={onGoToCreate} onHomeClick={onBackToHome} isUserView={true} userName={user?.name} siteBranding={siteBranding} />
      
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Top Action & Navigation Bar */}
        <div className="bg-white rounded-3xl p-5 mb-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBackToHome}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all active:scale-95"
              title="بازگشت به صفحه قبل و صفحه اصلی سایت"
            >
              <span>←</span>
              <span>بازگشت به سایت</span>
            </button>

            <button 
              onClick={onGoToCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <span>➕</span>
              <span>ثبت آگهی جدید</span>
            </button>

            {onBackToPwa && (
              <button 
                onClick={onBackToPwa}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs border border-indigo-200 transition-all active:scale-95 cursor-pointer"
                title="بازگشت به اپلیکیشن موبایل (PWA)"
              >
                <span>📱</span>
                <span>بازگشت به وب‌اپلیکیشن (PWA)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-700">{user?.name || 'کاربر گرامی'}</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded-md">
                {user?.role === 'agent' ? 'مشاور املاک' : 'کاربر عادی'}
              </span>
            </div>

            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs border border-rose-200 transition-all active:scale-95"
              title="خروج از حساب کاربری"
            >
              <span>🚪</span>
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* User Summary Widget */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
              🏡
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">کل آگهی‌های من</span>
              <span className="text-xl font-black text-slate-800">{myAds.length} آگهی</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
              📦
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">سهمیه آگهی باقیمانده</span>
              <span className="text-xl font-black text-emerald-600">{totalRemainingAds} آگهی</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
              💬
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">پیام‌ها و چت‌ها</span>
              <span className="text-xl font-black text-slate-800">{myConversations.length} گفتگو</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
              🎫
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">تیکت‌های پشتیبانی</span>
              <span className="text-xl font-black text-slate-800">{myTickets.length} تیکت</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-3xl border border-slate-200/70 shadow-sm">
          <button 
            onClick={() => setActiveTab('my-ads')} 
            className={`flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'my-ads' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>🏡</span>
            <span>آگهی‌های من ({myAds.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('packages')} 
            className={`flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'packages' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>📦</span>
            <span>پکیج و سهمیه آگهی</span>
          </button>

          <button 
            onClick={() => setActiveTab('messages')} 
            className={`flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'messages' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>💬</span>
            <span>چت و پیام‌ها ({myConversations.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('tickets')} 
            className={`flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'tickets' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>🎫</span>
            <span>پشتیبانی و تیکت ({myTickets.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('payments')} 
            className={`flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'payments' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>💳</span>
            <span>فیش‌ها و پرداخت‌ها ({myReceipts.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('favorites')} 
            className={`flex-1 min-w-[120px] py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'favorites' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>❤️</span>
            <span>نشان‌شده‌ها ({favorites.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="min-h-[500px]">
          
          {/* TAB: MY ADS */}
          {activeTab === 'my-ads' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-800">مدیریت آگهی‌های ثبت‌شده</h2>
                  <p className="text-xs text-slate-500 mt-1">مشاهده وضعیت تایید، ارتقا و ویرایش یا حذف آگهی‌ها</p>
                </div>
                <button 
                  onClick={onGoToCreate}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <span>➕</span>
                  <span>افزودن آگهی جدید</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myAds.map((listing) => (
                  <div key={listing.id} className="relative group bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <ListingCard data={listing} onClick={() => setSelectedListing(listing)} promotionPlans={promotionPlans} />
                    <div className="absolute top-4 right-4 z-10">{getStatusBadge(listing.status, listing.rejectionReason)}</div>
                    
                    <div className="mt-3 p-3 bg-slate-50 rounded-2xl flex items-center justify-between gap-2">
                      <button 
                        onClick={() => setPromotingAd(listing)} 
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black rounded-xl shadow-sm hover:opacity-95 flex items-center justify-center gap-1.5"
                      >
                        <span>🚀</span>
                        <span>ارتقای آگهی</span>
                      </button>

                      <button 
                        onClick={() => {
                          if (confirm('آیا از حذف این آگهی اطمینان دارید؟')) {
                            onDelete(listing.id!);
                          }
                        }} 
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                        title="حذف آگهی"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}

                {myAds.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-8">
                    <span className="text-5xl block mb-3">🏡</span>
                    <h3 className="text-lg font-black text-slate-700 mb-2">هنوز آگهی ثبت نکرده‌اید</h3>
                    <p className="text-xs text-slate-400 font-bold mb-6 max-w-md mx-auto">
                      هم‌اکنون اولین آگهی فروش یا رهن و اجاره ملک خود را ثبت کنید تا در سریع‌ترین زمان دیده شود.
                    </p>
                    <button 
                      onClick={onGoToCreate}
                      className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                    >
                      ثبت آگهی رایگان
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PACKAGES */}
          {activeTab === 'packages' && (
            <div className="space-y-8">
              {/* Active User Packages */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-black text-indigo-300 uppercase tracking-widest block mb-1">وضعیت اشتراک شما</span>
                    <h3 className="text-2xl font-black text-white">سهمیه فعال آگهی: {totalRemainingAds} عدد</h3>
                    <p className="text-xs text-slate-300 font-medium mt-2 max-w-xl">
                      با داشتن پکیج فعال، هنگام ثبت آگهی نیازی به پرداخت تکی ندارید و آگهی‌های شما بلافاصله پس از بررسی فعال خواهند شد.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const el = document.getElementById('available-packages');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3 bg-white text-indigo-950 hover:bg-indigo-50 rounded-2xl font-black text-xs shadow-lg transition-all"
                  >
                    خرید پکیج جدید ↓
                  </button>
                </div>

                {/* Active packages list */}
                {activeUserPackages.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {activeUserPackages.map(pkg => (
                      <div key={pkg.id} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-black text-sm text-white">{pkg.packageTitle}</span>
                          <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full">فعال</span>
                        </div>
                        <div className="text-xs text-slate-300 flex justify-between">
                          <span>باقیمانده: {pkg.remainingAds} از {pkg.totalAds}</span>
                          <span>انقضا: {new Date(pkg.expiresAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Free ad limit information by categories */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/80 shadow-sm">
                <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>قوانین سهمیه رایگان دسته‌بندی‌ها</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map(cat => (
                    <div key={cat.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <span className="font-black text-xs text-slate-800 block">{cat.name}</span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {cat.freeLimitCount ? `${cat.freeLimitCount} آگهی رایگان در هر ${cat.freeLimitDays || 20} روز` : 'نامحدود رایگان'}
                          </span>
                        </div>
                      </div>
                      {cat.paidAdPrice && (
                        <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                          اضافی: {cat.paidAdPrice.toLocaleString('fa-IR')} ت
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Packages to Buy */}
              <div id="available-packages" className="space-y-4">
                <div className="text-right">
                  <h3 className="text-xl font-black text-slate-800">بسته‌های خرید سهمیه آگهی</h3>
                  <p className="text-xs text-slate-500 mt-1">با خرید بسته‌های تخفیف‌دار، هزینه ثبت هر آگهی را تا ۶۰٪ کاهش دهید.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {listingPackages.map(pkg => (
                    <div key={pkg.id} className="bg-white rounded-[2.5rem] p-6 border-2 border-slate-100 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden">
                      {pkg.badge && (
                        <span className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
                          {pkg.badge}
                        </span>
                      )}
                      <div>
                        <span className="text-3xl block mb-2">📦</span>
                        <h4 className="text-lg font-black text-slate-800">{pkg.title}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">{pkg.description}</p>
                        
                        <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs font-bold text-slate-700">
                          <div className="flex justify-between">
                            <span>تعداد سهمیه آگهی:</span>
                            <span className="font-black text-indigo-600 text-sm">{pkg.adCount} آگهی</span>
                          </div>
                          <div className="flex justify-between">
                            <span>مدت اعتبار بسته:</span>
                            <span className="font-black text-slate-800">{pkg.durationDays} روز</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-slate-200">
                            <span>قیمت کل:</span>
                            <span className="font-black text-emerald-600 text-base">{pkg.price.toLocaleString('fa-IR')} تومان</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setSelectedPackageForBuy(pkg)}
                        className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span>خرید و فعال‌سازی بسته</span>
                        <span>←</span>
                      </button>
                    </div>
                  ))}

                  {listingPackages.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white rounded-3xl text-slate-400 font-bold text-xs">
                      درحال حاضر بسته‌ای توسط مدیریت تعریف نشده است.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MESSAGES / CHAT */}
          {activeTab === 'messages' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[550px]">
              {/* Conversations List */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-5 space-y-3 overflow-y-auto max-h-[600px] shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-800">لیست گفتگوها</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                    {myConversations.length}
                  </span>
                </div>

                {myConversations.map((c) => {
                  const isActive = activeConversation?.id === c.id;
                  const lastMsg = c.messages[c.messages.length - 1];
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveConversation(c)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-right ${
                        isActive 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <img 
                        src={c.listingImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=120&q=70'} 
                        className="w-12 h-12 rounded-xl object-cover shadow-sm flex-shrink-0" 
                        alt="" 
                      />
                      <div className="flex-grow min-w-0">
                        <h4 className={`text-xs font-black line-clamp-1 ${isActive ? 'text-white' : 'text-slate-900'}`}>{c.listingTitle}</h4>
                        <p className={`text-[11px] font-medium truncate mt-1 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {lastMsg ? lastMsg.text : 'هنوز پیامی ارسال نشده است'}
                        </p>
                        <span className={`text-[9px] block mt-1 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {new Date(c.lastUpdate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {myConversations.length === 0 && (
                  <div className="text-center py-20 text-slate-400 font-bold text-xs">
                    <span className="text-4xl block mb-2">💬</span>
                    هنوز گفتگویی برای آگهی‌های شما آغاز نشده است.
                  </div>
                )}
              </div>

              {/* Active Chat Window */}
              <div className="md:col-span-2 min-h-[450px]">
                {activeConversation ? (
                  <ChatWindow
                    conversation={myConversations.find(c => c.id === activeConversation.id) || activeConversation}
                    currentUser={user!}
                    onSendMessage={onSendMessage}
                    onClose={() => setActiveConversation(null)}
                  />
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-200/80 p-8 text-center shadow-sm">
                    <span className="text-5xl mb-4">💬</span>
                    <h4 className="font-black text-slate-800 text-base mb-1">گفتگویی انتخاب نشده است</h4>
                    <p className="text-slate-400 font-bold text-xs max-w-sm">
                      از لیست سمت راست، یک گفتگو را انتخاب کنید تا پیام‌های ردوبدل شده را مشاهده و پاسخ دهید.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: TICKETS & SUPPORT */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800">مرکز پشتیبانی و تیکت</h2>
                  <p className="text-xs text-slate-500 mt-1">ارتباط مستقیم با کارشناسان و مدیریت جهت سوالات فنی، مالی یا آگهی‌ها</p>
                </div>

                <button 
                  onClick={() => setIsTicketModalOpen(true)}
                  className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20"
                >
                  <span>🎫</span>
                  <span>ارسال تیکت جدید</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tickets List */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-5 space-y-3 overflow-y-auto max-h-[600px] shadow-sm">
                  <h3 className="text-base font-black text-slate-800 pb-3 border-b border-slate-100">تیکت‌های شما</h3>
                  
                  {myTickets.map(ticket => {
                    const isSelected = activeTicketId === ticket.id;
                    const statusBg = 
                      ticket.status === 'answered' ? 'bg-emerald-100 text-emerald-700' :
                      ticket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                      ticket.status === 'waiting' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
                    
                    const statusText = 
                      ticket.status === 'answered' ? 'پاسخ داده شد' :
                      ticket.status === 'open' ? 'در انتظار بررسی' :
                      ticket.status === 'waiting' ? 'منتظر پاسخ کاربر' : 'بسته شده';

                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setActiveTicketId(ticket.id)}
                        className={`w-full text-right p-4 rounded-2xl border transition-all ${
                          isSelected 
                            ? 'bg-amber-500 border-amber-500 text-white shadow-md' 
                            : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : statusBg}`}>
                            {statusText}
                          </span>
                          <span className={`text-[10px] font-mono ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                            #{ticket.ticketNumber}
                          </span>
                        </div>

                        <h4 className={`text-xs font-black line-clamp-1 mb-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {ticket.subject}
                        </h4>

                        <div className={`text-[10px] flex justify-between ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                          <span>{ticket.department === 'financial' ? 'مالی' : ticket.department === 'technical' ? 'فنی' : 'عمومی'}</span>
                          <span>{new Date(ticket.updatedAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                      </button>
                    );
                  })}

                  {myTickets.length === 0 && (
                    <div className="text-center py-16 text-slate-400 font-bold text-xs">
                      <span className="text-4xl block mb-2">🎫</span>
                      هنوز تیکت پشتیبانی ثبت نکرده‌اید.
                    </div>
                  )}
                </div>

                {/* Ticket Conversation View */}
                <div className="md:col-span-2">
                  {activeTicket ? (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-6 shadow-sm flex flex-col h-[550px]">
                      {/* Ticket Header */}
                      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-slate-400">#{activeTicket.ticketNumber}</span>
                            <h3 className="font-black text-slate-900 text-base">{activeTicket.subject}</h3>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            بخش: {activeTicket.department} | اولویت: {activeTicket.priority}
                          </span>
                        </div>
                        <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-xl">
                          {activeTicket.status === 'answered' ? '✅ پاسخ کارشناس' : '⏳ در حال بررسی'}
                        </span>
                      </div>

                      {/* Messages thread */}
                      <div className="flex-grow overflow-y-auto p-4 space-y-4 my-4 bg-slate-50/50 rounded-2xl">
                        {activeTicket.messages.map(msg => {
                          const isAdmin = msg.senderRole === 'admin';
                          return (
                            <div key={msg.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed ${
                                isAdmin 
                                  ? 'bg-amber-500 text-white rounded-bl-none shadow-sm' 
                                  : 'bg-white text-slate-800 rounded-br-none border border-slate-200 shadow-sm'
                              }`}>
                                <div className="flex justify-between items-center gap-4 mb-2 pb-1 border-b border-black/10">
                                  <span className="font-black text-[11px]">{msg.senderName} {isAdmin && '(پشتیبان مدیریت)'}</span>
                                  <span className="text-[9px] opacity-75">{new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="whitespace-pre-line">{msg.text}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply input */}
                      {activeTicket.status !== 'closed' ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={ticketReplyText}
                            onChange={(e) => setTicketReplyText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendTicketReply()}
                            placeholder="ارسال پیام تکمیلی..."
                            className="flex-grow px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500"
                          />
                          <button 
                            onClick={handleSendTicketReply}
                            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
                          >
                            ارسال
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-100 rounded-xl text-center text-xs font-bold text-slate-500">
                          این تیکت بسته شده است.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-200/80 p-8 text-center shadow-sm">
                      <span className="text-5xl mb-4">🎫</span>
                      <h4 className="font-black text-slate-800 text-base mb-1">یک تیکت را انتخاب کنید</h4>
                      <p className="text-slate-400 font-bold text-xs max-w-sm">
                        برای مشاهده تاریخچه پیام‌ها یا پاسخگویی، تیکت مورد نظر را از لیست انتخاب فرمایید یا تیکت جدید ثبت کنید.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-800">تاریخچه فیش‌های واریزی و تراکنش‌ها</h2>
                <p className="text-xs text-slate-500 mt-1">مشاهده فیش‌های کارت به کارت، وضعیت بررسی توسط حسابداری و فاکتورها</p>
              </div>

              {myReceipts.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs">
                  هیچ فیش واریزی ثبت نشده است.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myReceipts.map(r => (
                    <div key={r.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 block mb-1">
                              {r.type === 'package' ? 'خرید پکیج' : 'ارتقای آگهی'}
                            </span>
                            <h4 className="font-black text-slate-900 text-base">
                              {r.packageTitle || r.listingTitle || 'پرداخت سرویس'}
                            </h4>
                          </div>
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${
                            r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                            r.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {r.status === 'approved' ? '✅ تایید و فعال شد' : r.status === 'rejected' ? '❌ رد شده' : '⏳ در انتظار بررسی'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs font-bold text-slate-600 mb-4">
                          <div>عنوان: <span className="text-indigo-600 font-black">{r.planTitle || r.packageTitle || 'سرویس'}</span></div>
                          <div>مبلغ: <span className="text-slate-900 font-black">{r.amount} تومان</span></div>
                          <div>کد پیگیری: <span className="font-mono text-slate-900" dir="ltr">{r.trackingCode || '—'}</span></div>
                          <div>تاریخ: <span className="text-slate-500">{new Date(r.createdAt).toLocaleDateString('fa-IR')}</span></div>
                        </div>

                        {r.rejectionReason && (
                          <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 mb-4">
                            علت عدم تایید: {r.rejectionReason}
                          </p>
                        )}
                      </div>

                      {r.receiptImageUrl && (
                        <div className="mt-2 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400">تصویر فیش واریزی</span>
                          <a href={r.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-indigo-600 underline">
                            مشاهده تصویر فیش
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: FAVORITES */}
          {activeTab === 'favorites' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-black text-slate-800">آگهی‌های نشان‌شده (علاقه‌مندی‌ها)</h2>
                <p className="text-xs text-slate-500 mt-1">آگهی‌هایی که برای بررسی و مقایسه بعدی ذخیره کرده‌اید</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map((listing) => (
                  <div key={listing.id} className="relative group bg-white rounded-3xl p-2 border border-slate-100 shadow-sm">
                    <ListingCard data={listing} onClick={() => setSelectedListing(listing)} promotionPlans={promotionPlans} />
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleLike(listing.id!); }}
                      className="absolute top-4 left-4 p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full shadow-md z-10 transition-all"
                      title="حذف از نشان‌شده‌ها"
                    >
                      ❤️
                    </button>
                  </div>
                ))}
                {favorites.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs">
                    هیچ آگهی نشان نشده است.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* MODAL: DETAIL */}
        {selectedListing && (
          <ListingDetailModal 
            listing={selectedListing} 
            user={user} 
            plan={(promotionPlans || []).find(p => p.id === selectedListing.promotion)} 
            onClose={() => setSelectedListing(null)} 
            onStartChat={(l, s) => {
              setSelectedListing(null);
              setActiveTab('messages');
              let conv = myConversations.find(c => c.listingId === l.id && c.seekerId === s.id);
              if (!conv) {
                const newConv = {
                  id: 'c_' + Date.now(),
                  listingId: l.id!,
                  listingTitle: l.title,
                  listingImage: l.images[0] || '',
                  ownerId: l.ownerId!,
                  seekerId: s.id,
                  messages: [],
                  lastUpdate: Date.now()
                };
                setActiveConversation(newConv);
              } else {
                setActiveConversation(conv);
              }
            }} 
            onRegister={() => ({} as User)} 
          />
        )}

        {/* MODAL: PROMOTE */}
        {promotingAd && (
          <PromoteModal 
            listingId={promotingAd.id}
            listingTitle={promotingAd.title} 
            promotionPlans={promotionPlans} 
            cardPaymentConfig={cardPaymentConfig}
            currentUser={user}
            onClose={() => setPromotingAd(null)} 
            onSelect={(tier) => { onPromote(promotingAd.id!, tier); setPromotingAd(null); }} 
            onSubmitReceipt={(receiptData) => {
              if (onSubmitReceipt) {
                onSubmitReceipt(receiptData);
              }
              setPromotingAd(null);
            }}
          />
        )}

        {/* MODAL: BUY PACKAGE */}
        {selectedPackageForBuy && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-black text-indigo-600 block mb-1">خرید بسته سهمیه آگهی</span>
                  <h3 className="text-xl font-black text-slate-800">{selectedPackageForBuy.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedPackageForBuy(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 font-black"
                >
                  ✕
                </button>
              </div>

              {pkgBuyingSuccess ? (
                <div className="p-6 bg-emerald-50 text-emerald-800 rounded-2xl text-center font-bold text-sm">
                  {pkgBuyingSuccess}
                </div>
              ) : (
                <form onSubmit={handlePackagePurchaseSubmit} className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs font-bold text-slate-700">
                    <div className="flex justify-between">
                      <span>تعداد آگهی مجاز:</span>
                      <span className="font-black text-indigo-600">{selectedPackageForBuy.adCount} آگهی</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مدت اعتبار:</span>
                      <span className="font-black text-slate-800">{selectedPackageForBuy.durationDays} روز</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span>مبلغ قابل پرداخت:</span>
                      <span className="font-black text-emerald-600 text-base">{selectedPackageForBuy.price.toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2">انتخاب روش پرداخت:</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPkgPaymentMethod('card_to_card')}
                        className={`p-4 rounded-2xl border text-center font-black text-xs transition-all ${
                          pkgPaymentMethod === 'card_to_card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        💳 کارت به کارت
                      </button>
                      <button
                        type="button"
                        onClick={() => setPkgPaymentMethod('zarinpal')}
                        className={`p-4 rounded-2xl border text-center font-black text-xs transition-all ${
                          pkgPaymentMethod === 'zarinpal' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        ⚡ درگاه آنلاین زرین‌پال
                      </button>
                    </div>
                  </div>

                  {pkgPaymentMethod === 'card_to_card' && cardPaymentConfig?.isEnabled && (
                    <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-2 text-xs">
                      <p className="font-black text-amber-900">اطلاعات حساب واریز:</p>
                      <p className="text-slate-700">بانک: <span className="font-bold">{cardPaymentConfig.bankName}</span></p>
                      <p className="text-slate-700">شماره کارت: <span className="font-black text-indigo-700 font-mono" dir="ltr">{cardPaymentConfig.cardNumber}</span></p>
                      <p className="text-slate-700">بنام: <span className="font-bold">{cardPaymentConfig.accountHolder}</span></p>
                    </div>
                  )}

                  {pkgPaymentMethod === 'card_to_card' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          شماره پیگیری / شماره ارجاع فیش <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={pkgTrackingCode}
                          onChange={(e) => setPkgTrackingCode(e.target.value)}
                          placeholder="مثال: 98451230 یا ۴ رقم آخر کارت"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          آدرس یا لینک تصویر فیش (اختیاری)
                        </label>
                        <input 
                          type="text" 
                          value={pkgReceiptImage}
                          onChange={(e) => setPkgReceiptImage(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg transition-all"
                    >
                      {pkgPaymentMethod === 'zarinpal' ? 'اتصال به درگاه و پرداخت' : 'ثبت فیش و درخواست فعال‌سازی'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPackageForBuy(null)}
                      className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-2xl transition-all"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL: CREATE TICKET */}
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-black text-amber-600 block mb-1">پشتیبانی آنلاین</span>
                  <h3 className="text-xl font-black text-slate-800">ارسال تیکت جدید</h3>
                </div>
                <button 
                  onClick={() => setIsTicketModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 font-black"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    موضوع تیکت <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="مثال: سوال در خصوص واریز فیش پکیج یا آگهی"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">دپارتمان مربوطه</label>
                    <select
                      value={ticketDepartment}
                      onChange={(e) => setTicketDepartment(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500"
                    >
                      <option value="general">عمومی و راهنمایی</option>
                      <option value="financial">امور مالی و واریزی‌ها</option>
                      <option value="listings">مدیریت آگهی‌ها</option>
                      <option value="technical">پشتیبانی فنی</option>
                      <option value="agent">امور مشاورین و دفاتر</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">اولویت</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500"
                    >
                      <option value="low">کم</option>
                      <option value="medium">متوسط</option>
                      <option value="high">زیاد</option>
                      <option value="urgent">فوری</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    شرح درخواست / متن پیام <span className="text-rose-500">*</span>
                  </label>
                  <textarea 
                    required
                    rows={4}
                    value={ticketInitialMessage}
                    onChange={(e) => setTicketInitialMessage(e.target.value)}
                    placeholder="توضیحات کامل درخواست خود را بنویسید..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-2xl shadow-lg transition-all"
                  >
                    ثبت و ارسال تیکت
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTicketModalOpen(false)}
                    className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-2xl transition-all"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: LOGOUT CONFIRM */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-6 text-center shadow-2xl animate-fade-in">
              <span className="text-5xl block mb-3">🚪</span>
              <h3 className="text-lg font-black text-slate-800 mb-2">خروج از حساب کاربری</h3>
              <p className="text-xs text-slate-500 font-medium mb-6">
                آیا مایلید از حساب کاربری خود خارج شوید؟ برای ثبت یا ارتقای آگهی‌ها نیاز به ورود مجدد خواهید داشت.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    onLogout();
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-md transition-all"
                >
                  بله، خارج شو
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl transition-all"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default UserPanelPage;
