
import React, { useState, useMemo, useEffect } from 'react';
import type { 
  PropertyListing, 
  PromotionTier, 
  PromotionPlan, 
  ListingPackage, 
  UserPackage, 
  SupportTicket, 
  TicketMessage, 
  User, 
  Conversation, 
  Activity, 
  ExpirationSettings, 
  ZarinPalConfig, 
  CardPaymentConfig, 
  PaymentReceipt, 
  MeliPayamakConfig, 
  Category, 
  Province, 
  AgentProfile, 
  AdSlot, 
  TrustBadge, 
  BannerSliderConfig,
  SiteBrandingConfig 
} from '../types';
import { getAdminInsights, getAiConfig, saveAiConfig, fetchModels, testAiConnection, syncAiConfigFromServer } from '../services/geminiService';
import { AiConfig } from '../types';
import Panel from '../components/Panel';
import AiAssistant from '../components/AiAssistant';
import StrategicOverviewReport from '../components/StrategicOverviewReport';
import { hashPassword } from '../utils/crypto';
import { sendSms } from '../services/smsService';

interface AdminPageProps {
  listings: PropertyListing[];
  users: User[];
  categories: Category[];
  provinces: Province[];
  promotionPlans: PromotionPlan[];
  listingPackages?: ListingPackage[];
  userPackages?: UserPackage[];
  supportTickets?: SupportTicket[];
  adSlots: AdSlot[];
  trustBadges?: TrustBadge[];
  bannerSliderConfig?: BannerSliderConfig;
  expirationSettings: ExpirationSettings;
  zarinPalConfig: ZarinPalConfig;
  cardPaymentConfig?: CardPaymentConfig;
  paymentReceipts?: PaymentReceipt[];
  meliPayamakConfig: MeliPayamakConfig;
  conversations: Conversation[];
  siteBranding?: SiteBrandingConfig;
  onUpdateSiteBranding?: (branding: SiteBrandingConfig) => void;
  onBackToHome: () => void;
  onLogout: () => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: 'approved' | 'rejected' | 'pending' | 'expired' | 'archived', reason?: string) => void;
  onPromote: (id: string, tier: PromotionTier) => void;
  onUpdatePlans: (plans: PromotionPlan[]) => void;
  onUpdateListingPackages?: (packages: ListingPackage[]) => void;
  onApproveUserPackage?: (id: string) => void;
  onRejectUserPackage?: (id: string, reason?: string) => void;
  onReplyTicket?: (ticketId: string, message: string, newStatus?: any) => void;
  onAdminReplyTicket?: (ticketId: string, message: string) => void;
  onUpdateTicketStatus?: (ticketId: string, status: any) => void;
  onUpdateAdSlots: (slots: AdSlot[]) => void;
  onUpdateTrustBadges?: (badges: TrustBadge[]) => void;
  onUpdateBannerSliderConfig?: (config: BannerSliderConfig) => void;
  onUpdateExpiration: (settings: ExpirationSettings) => void;
  onUpdateZarinPal: (config: ZarinPalConfig) => void;
  onUpdateCardPayment?: (config: CardPaymentConfig) => void;
  onApproveReceipt?: (receiptId: string) => void;
  onRejectReceipt?: (receiptId: string, reason: string) => void;
  onUpdateMeliPayamak: (config: MeliPayamakConfig) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdateProvinces: (provinces: Province[]) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  onRegisterAiHandler: (handler: ((command: string) => Promise<string>) | null) => void;
  onUpdateAdminCredentials: (username: string, passwordHash: string) => void;
  onBackToPwa?: () => void;
  dbConnected?: boolean;
}

type AdminSection = 'overview' | 'listings' | 'finance' | 'tickets' | 'agents' | 'users' | 'packages' | 'ads' | 'settings';
type SettingsTab = 'general' | 'financial' | 'sms' | 'ai' | 'database' | 'categories' | 'provinces';

const AdminPage: React.FC<AdminPageProps> = ({ 
    listings, users, categories, provinces, promotionPlans, listingPackages = [], userPackages = [], supportTickets = [], adSlots, trustBadges = [], bannerSliderConfig = { autoSlideEnabled: true, autoSlideIntervalSeconds: 5 }, expirationSettings, zarinPalConfig, cardPaymentConfig, paymentReceipts = [], meliPayamakConfig, conversations = [], siteBranding, onUpdateSiteBranding, onBackToHome, onLogout, onDelete, onUpdateStatus, onUpdatePlans, onUpdateListingPackages, onApproveUserPackage, onRejectUserPackage, onReplyTicket, onAdminReplyTicket, onUpdateTicketStatus, onUpdateAdSlots, onUpdateTrustBadges, onUpdateBannerSliderConfig, onUpdateExpiration, onUpdateZarinPal, onUpdateCardPayment, onApproveReceipt, onRejectReceipt, onUpdateMeliPayamak, onUpdateCategories, onUpdateProvinces, onUpdateUser, onDeleteUser, onRegisterAiHandler, onUpdateAdminCredentials, onBackToPwa, dbConnected
}) => {
  // Navigation
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('general');
  const [activeAdTab, setActiveAdTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'expired' | 'archived'>('pending');
  const [adSearchQuery, setAdSearchQuery] = useState('');
  const [receiptTab, setReceiptTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Site Branding State
  const [brandingForm, setBrandingForm] = useState<SiteBrandingConfig>(() => siteBranding || {
    siteName: 'آگهی هوشمند املاک',
    siteSubtitle: 'سامانه جامع معاملات و نیازمندی‌های تخصصی ملک',
    logoIcon: '🏢',
    autoRedirectToPwa: true
  });
  const [brandingSaveSuccess, setBrandingSaveSuccess] = useState(false);

  useEffect(() => {
    if (siteBranding) {
      setBrandingForm(siteBranding);
    }
  }, [siteBranding]);

  // Load server-persisted AI config
  useEffect(() => {
    syncAiConfigFromServer().then(cfg => {
      if (cfg) setTempAiConfig(cfg);
    });
  }, []);

  const pendingAdsCount = useMemo(() => listings.filter(l => l.status === 'pending').length, [listings]);
  const pendingReceiptsCount = useMemo(() => paymentReceipts.filter(r => r.status === 'pending').length, [paymentReceipts]);
  const openTicketsCount = useMemo(() => supportTickets.filter(t => t.status === 'open').length, [supportTickets]);

  // Database Logs State
  const [dbLogs, setDbLogs] = useState<Array<{ id: string; timestamp: number; type: 'info' | 'success' | 'error' | 'query'; message: string }>>([]);
  const [dbStats, setDbStats] = useState<any>(null);
  const [isFetchingDbLogs, setIsFetchingDbLogs] = useState(false);

  // User Dossier Full Editing States
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState<'user' | 'agent' | 'admin'>('user');
  const [editUserAvatar, setEditUserAvatar] = useState('');
  const [editAgencyName, setEditAgencyName] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editTrustLevel, setEditTrustLevel] = useState<'silver' | 'gold' | 'diamond'>('silver');
  const [editSpecialties, setEditSpecialties] = useState('');
  const [editIsVerified, setEditIsVerified] = useState(false);
  const [sendUserSmsNotice, setSendUserSmsNotice] = useState(true);

  // Listing Review Comprehensive States
  const [reviewStatus, setReviewStatus] = useState<PropertyListing['status']>('approved');
  const [adminFeedbackNote, setAdminFeedbackNote] = useState('');
  const [sendAdSmsNotice, setSendAdSmsNotice] = useState(true);

  // Modals & Contexts
  const [showAdminLogoutConfirm, setShowAdminLogoutConfirm] = useState(false);
  const [selectedListingForReview, setSelectedListingForReview] = useState<PropertyListing | null>(null);
  const [selectedUserForDossier, setSelectedUserForDossier] = useState<User | null>(null);
  const [rejectModalReceipt, setRejectModalReceipt] = useState<PaymentReceipt | null>(null);
  const [viewReceiptModal, setViewReceiptModal] = useState<PaymentReceipt | null>(null);
  const [receiptRejectReason, setReceiptRejectReason] = useState('');
  const [cardSaveSuccess, setCardSaveSuccess] = useState(false);

  useEffect(() => {
    if (selectedUserForDossier) {
      setEditUserName(selectedUserForDossier.name || '');
      setEditUserUsername((selectedUserForDossier as any).username || '');
      setEditUserPhone(selectedUserForDossier.phone || '');
      setEditUserRole(selectedUserForDossier.role || 'user');
      setEditUserAvatar((selectedUserForDossier as any).avatar || '');
      setEditAgencyName(selectedUserForDossier.agencyName || '');
      setEditLicenseNumber(selectedUserForDossier.licenseNumber || '');
      const tLevel = selectedUserForDossier.trustLevel;
      setEditTrustLevel(tLevel === 'gold' || tLevel === 'diamond' ? tLevel : 'silver');
      setEditSpecialties(Array.isArray(selectedUserForDossier.specialty) ? selectedUserForDossier.specialty.join(', ') : '');
      setEditIsVerified(!!(selectedUserForDossier as any).isVerified);
      setUserNewPassword('');
      setUserPasswordMsg('');
      setSendUserSmsNotice(true);
    }
  }, [selectedUserForDossier]);

  useEffect(() => {
    if (selectedListingForReview) {
      setReviewStatus(selectedListingForReview.status || 'approved');
      setAdminFeedbackNote(selectedListingForReview.rejectionReason || (selectedListingForReview as any).adminNote || '');
      setSendAdSmsNotice(true);
    }
  }, [selectedListingForReview]);

  const fetchDbLogs = async () => {
    setIsFetchingDbLogs(true);
    try {
      const res = await fetch('/api/db-logs');
      if (res.ok) {
        const data = await res.json();
        setDbStats(data);
        if (data.logs) setDbLogs(data.logs);
      }
    } catch (err) {
      console.warn('Error fetching DB logs:', err);
    } finally {
      setIsFetchingDbLogs(false);
    }
  };

  const [dbConfigForm, setDbConfigForm] = useState({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hoome24_db',
    mode: 'local' as 'local' | 'mysql'
  });
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [dbSyncMsg, setDbSyncMsg] = useState('');

  // AI Live Test States
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; text: string } | null>(null);

  const fetchDbConfig = async () => {
    try {
      const res = await fetch('/api/db-config');
      if (res.ok) {
        const data = await res.json();
        setDbConfigForm(prev => ({
          ...prev,
          host: data.config?.host || 'localhost',
          port: Number(data.config?.port || 3306),
          user: data.config?.user || 'root',
          database: data.config?.database || 'hoome24_db',
          mode: data.mode || (data.connected ? 'mysql' : 'local')
        }));
      }
    } catch (e) {}
  };

  const handleTestDbConnection = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await fetch('/api/db-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          host: dbConfigForm.host,
          port: dbConfigForm.port,
          user: dbConfigForm.user,
          password: dbConfigForm.password,
          database: dbConfigForm.database
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbTestResult({ success: true, message: 'ارتباط با سرور MySQL با موفقیت آزمایش شد و تایید گردید! 🟢' });
      } else {
        setDbTestResult({ success: false, message: data.error || 'خطا در برقراری اتصال به سرور دیتابیس MySQL 🔴' });
      }
    } catch (err: any) {
      setDbTestResult({ success: false, message: err.message || 'عدم دسترسی به سرور' });
    } finally {
      setIsTestingDb(false);
      fetchDbLogs();
    }
  };

  const handleInstallOrConnectDb = async () => {
    setIsSavingDb(true);
    setDbTestResult(null);
    try {
      const res = await fetch('/api/db-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'install',
          host: dbConfigForm.host,
          port: dbConfigForm.port,
          user: dbConfigForm.user,
          password: dbConfigForm.password,
          database: dbConfigForm.database,
          payload: {
            listings,
            users,
            categories,
            provinces,
            promotionPlans,
            listingPackages,
            userPackages,
            supportTickets,
            expirationSettings,
            zarinPalConfig,
            cardPaymentConfig,
            paymentReceipts,
            meliPayamakConfig,
            adSlots,
            trustBadges,
            bannerSliderConfig,
            siteBranding,
            conversations
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbTestResult({ success: true, message: 'پایگاه داده MySQL با موفقیت متصل شد و تمام اطلاعات، آگهی‌ها و جداول ذخیره و همگام شدند! 🟢' });
        setDbConfigForm(prev => ({ ...prev, mode: 'mysql' }));
      } else {
        setDbTestResult({ success: false, message: data.error || 'خطا در نصب و راه‌اندازی دیتابیس MySQL 🔴' });
      }
    } catch (err: any) {
      setDbTestResult({ success: false, message: err.message || 'خطا در ارتباط با سرور' });
    } finally {
      setIsSavingDb(false);
      fetchDbLogs();
      fetchDbConfig();
    }
  };

  const handleSwitchToLocalStore = async () => {
    if (!window.confirm('آیا مایلید اتصال MySQL قطع شده و سامانه در حالت حافظه فایلی محلی (Local Store) فعالیت کند؟')) return;
    setIsSavingDb(true);
    try {
      const res = await fetch('/api/db-disconnect', { method: 'POST' });
      if (res.ok) {
        setDbConfigForm(prev => ({ ...prev, mode: 'local' }));
        setDbTestResult({ success: true, message: 'سامانه به حالت حافظه فایلی محلی (Local JSON Store) بازگشت 🟡' });
      }
    } catch (err: any) {
      setDbTestResult({ success: false, message: err.message });
    } finally {
      setIsSavingDb(false);
      fetchDbLogs();
      fetchDbConfig();
    }
  };

  const handleSyncData = async (direction: 'local-to-mysql' | 'mysql-to-local') => {
    setIsSyncingDb(true);
    setDbSyncMsg('');
    try {
      const res = await fetch('/api/db-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          direction,
          payload: direction === 'local-to-mysql' ? {
            listings,
            users,
            categories,
            provinces,
            promotionPlans,
            listingPackages,
            userPackages,
            supportTickets,
            expirationSettings,
            zarinPalConfig,
            cardPaymentConfig,
            paymentReceipts,
            meliPayamakConfig,
            adSlots,
            trustBadges,
            bannerSliderConfig,
            siteBranding,
            conversations
          } : undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbSyncMsg(data.message || 'انتقال و همگام‌سازی با موفقیت انجام گردید.');
      } else {
        setDbSyncMsg('خطا: ' + (data.error || 'عملیات ناموفق بود'));
      }
    } catch (err: any) {
      setDbSyncMsg('خطا: ' + err.message);
    } finally {
      setIsSyncingDb(false);
      fetchDbLogs();
    }
  };

  const handleTestAiPrompt = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await testAiConnection(tempAiConfig);
      if (res.success) {
        setAiTestResult({ success: true, text: res.reply || 'اتصال موفقیت‌آمیز بود.' });
      } else {
        setAiTestResult({ success: false, text: res.error || 'خطا در اتصال به هوش مصنوعی' });
      }
    } catch (err: any) {
      setAiTestResult({ success: false, text: err.message });
    } finally {
      setIsTestingAi(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'settings' && activeSettingsTab === 'database') {
      fetchDbLogs();
      fetchDbConfig();
    }
  }, [activeSection, activeSettingsTab]);

  const [tempExpiration, setTempExpiration] = useState(expirationSettings);
  const [tempZarinPal, setTempZarinPal] = useState(zarinPalConfig);
  const [tempSliderConfig, setTempSliderConfig] = useState<BannerSliderConfig>(bannerSliderConfig);
  useEffect(() => {
    if (bannerSliderConfig) setTempSliderConfig(bannerSliderConfig);
  }, [bannerSliderConfig]);
  const [tempCardPayment, setTempCardPayment] = useState<CardPaymentConfig>(cardPaymentConfig || {
    isEnabled: true,
    bankName: 'بانک ملی ایران',
    cardNumber: '6037-9918-1234-5678',
    accountHolder: 'مدیریت آگهی هوشمند املاک',
    iban: 'IR120170000000123456789012',
    description: 'لطفاً پس از واریز وجه، تصویر فیش و یا شماره پیگیری را جهت بررسی و فعال‌سازی سرویس ارسال نمایید.'
  });
  const [agentModalMode, setAgentModalMode] = useState<'create' | 'edit' | null>(null);
  const [packageModalMode, setPackageModalMode] = useState<'create' | 'edit' | null>(null);
  const [adModalMode, setAdModalMode] = useState<'create' | 'edit' | null>(null);
  const [badgeModalMode, setBadgeModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingPlan, setEditingPlan] = useState<PromotionPlan | null>(null);
  const [editingAd, setEditingAd] = useState<AdSlot | null>(null);
  const [editingBadge, setEditingBadge] = useState<TrustBadge | null>(null);
  const [editingAgent, setEditingAgent] = useState<User | null>(null);
  const [newBadgeData, setNewBadgeData] = useState<TrustBadge>({ id: '', title: '', subtitle: '', imageUrl: '', linkUrl: '', isActive: true });

  // Search States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Password change states
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminPasswordMsg, setAdminPasswordMsg] = useState('');
  const [userNewPassword, setUserNewPassword] = useState('');
  const [userPasswordMsg, setUserPasswordMsg] = useState('');

  // AI & Analytics
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Forms
  const [newAgentData, setNewAgentData] = useState({
    name: '', phone: '', agencyName: '', licenseNumber: '', specialty: [] as string[], trustLevel: 'silver' as 'silver' | 'gold' | 'diamond'
  });
  const [specInput, setSpecInput] = useState('');
  const [newPlanData, setNewPlanData] = useState<PromotionPlan>({
    id: '', title: '', price: '', durationDays: 30, contactVisible: true, priorityLevel: 1, features: [], icon: '📦', color: 'bg-white border-slate-200 text-slate-800'
  });
  const [newAdData, setNewAdData] = useState<AdSlot>({
    id: '', position: 'hero', title: '', imageUrl: '', linkUrl: '', isActive: true, priority: 1
  });
  const [featInput, setFeatInput] = useState('');

  const [tempMeliPayamak, setTempMeliPayamak] = useState(meliPayamakConfig);
  const [tempAiConfig, setTempAiConfig] = useState<AiConfig>(getAiConfig());
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);
  const [smsSaveSuccess, setSmsSaveSuccess] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // Categories states
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏢');
  const [newCatFreeLimit, setNewCatFreeLimit] = useState(1);
  const [newCatFreeDays, setNewCatFreeDays] = useState(20);
  const [newCatPaidPrice, setNewCatPaidPrice] = useState(35000);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryMsg, setCategoryMsg] = useState('');

  // Package Management Tabs & States
  const [activePackageTab, setActivePackageTab] = useState<'promo_plans' | 'listing_packages' | 'user_purchases'>('listing_packages');
  const [isListingPkgModalOpen, setIsListingPkgModalOpen] = useState(false);
  const [editingListingPkg, setEditingListingPkg] = useState<ListingPackage | null>(null);
  const [listingPkgForm, setListingPkgForm] = useState<{
    title: string;
    description: string;
    adCount: number;
    price: number;
    durationDays: number;
    badge: string;
    featuredBonusCount: number;
    ladderBonusCount: number;
    isActive: boolean;
  }>({
    title: '',
    description: '',
    adCount: 5,
    price: 99000,
    durationDays: 30,
    badge: '',
    featuredBonusCount: 0,
    ladderBonusCount: 0,
    isActive: true,
  });

  // Ticket Management States
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'answered' | 'closed'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [ticketActionMsg, setTicketActionMsg] = useState('');

  // Provinces/Cities states
  const [newProvinceName, setNewProvinceName] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [provinceMsg, setProvinceMsg] = useState('');

  // Financial search and export
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');

  const parseAmountToNumber = (amountStr: string | number): number => {
    if (typeof amountStr === 'number') return amountStr;
    if (!amountStr) return 0;
    const cleanStr = String(amountStr)
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[^0-9]/g, '');
    const val = parseInt(cleanStr, 10);
    return isNaN(val) ? 0 : val;
  };

  const financeMetrics = useMemo(() => {
    const approvedReceipts = paymentReceipts.filter(r => r.status === 'approved');
    const pendingReceipts = paymentReceipts.filter(r => r.status === 'pending');
    const rejectedReceipts = paymentReceipts.filter(r => r.status === 'rejected');

    const totalApprovedRevenue = approvedReceipts.reduce((sum, r) => sum + parseAmountToNumber(r.amount), 0);
    const totalPendingRevenue = pendingReceipts.reduce((sum, r) => sum + parseAmountToNumber(r.amount), 0);
    
    const packageRevenue = approvedReceipts
      .filter(r => r.planId === ('package' as any) || r.listingTitle?.includes('پکیج') || r.planTitle?.includes('پکیج') || r.planTitle?.includes('بسته'))
      .reduce((sum, r) => sum + parseAmountToNumber(r.amount), 0);

    const promotionRevenue = Math.max(0, totalApprovedRevenue - packageRevenue);

    return {
      totalApprovedRevenue,
      totalPendingRevenue,
      packageRevenue,
      promotionRevenue,
      approvedCount: approvedReceipts.length,
      pendingCount: pendingReceipts.length,
      rejectedCount: rejectedReceipts.length,
      totalCount: paymentReceipts.length
    };
  }, [paymentReceipts]);

  const stats = useMemo(() => ({
    total: listings.length,
    totalUsers: users.length,
    totalAgents: users.filter(u => u.role === 'agent').length,
    pending: listings.filter(l => l.status === 'pending').length,
    revenue: financeMetrics.totalApprovedRevenue,
  }), [listings, users, financeMetrics]);

  const handleExportFinancialCsv = () => {
    if (paymentReceipts.length === 0) {
      alert('هیچ تراکنش یا فیشی جهت خروجی موجود نیست.');
      return;
    }
    const headers = ['شناسه', 'کاربر', 'شماره تماس', 'عنوان آگهی / پکیج', 'طرح / پکیج', 'مبلغ (تومان)', 'کد پیگیری', 'وضعیت', 'تاریخ'];
    const rows = paymentReceipts.map(r => [
      r.id,
      r.userName || '-',
      r.userPhone || '-',
      `"${(r.listingTitle || '').replace(/"/g, '""')}"`,
      `"${(r.planTitle || '').replace(/"/g, '""')}"`,
      parseAmountToNumber(r.amount),
      r.trackingCode || '-',
      r.status === 'approved' ? 'تایید شده' : r.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی',
      new Date(r.createdAt).toLocaleDateString('fa-IR')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (activeSection === 'overview' && !aiInsight) handleGetInsights();
  }, [activeSection]);

  useEffect(() => {
    onRegisterAiHandler(handleAiCommand);
    return () => {
      onRegisterAiHandler(null);
    };
  }, [listings, users, adSlots, activeSection, activeAdTab, tempAiConfig]);

  const handleGetInsights = async () => {
    setIsInsightLoading(true);
    const report = await getAdminInsights(stats);
    setAiInsight(report);
    setIsInsightLoading(false);
  };

  const filteredUsers = useMemo(() => users.filter(u => u.name.includes(userSearchQuery) || u.phone.includes(userSearchQuery)), [users, userSearchQuery]);
  const filteredAgents = useMemo(() => users.filter(u => u.role === 'agent' && (u.name.includes(agentSearchQuery) || u.phone.includes(agentSearchQuery))), [users, agentSearchQuery]);

  // FIX: Updated handleCreateAgent to support both creating and editing agents
  const handleCreateAgent = () => {
    if (!newAgentData.name || !newAgentData.phone) return;
    
    const isEdit = agentModalMode === 'edit' && editingAgent;
    const agentId = isEdit ? editingAgent.id : 'agent_' + Date.now();
    
    const newUser: User = {
        id: agentId,
        name: newAgentData.name,
        username: newAgentData.phone,
        phone: newAgentData.phone,
        joinDate: isEdit ? editingAgent.joinDate : Date.now(),
        role: 'agent',
        activities: isEdit ? editingAgent.activities : [{ id: 'act_1', type: 'AGENT_VERIFIED', timestamp: Date.now(), details: 'ایجاد حساب کاربری مشاور توسط مدیریت' }],
        agentProfile: {
            licenseNumber: newAgentData.licenseNumber,
            agencyName: newAgentData.agencyName,
            specialty: newAgentData.specialty,
            rating: isEdit ? (editingAgent.agentProfile?.rating ?? 5) : 5,
            totalDeals: isEdit ? (editingAgent.agentProfile?.totalDeals ?? 0) : 0,
            isVerified: true,
            trustLevel: newAgentData.trustLevel
        }
    };
    onUpdateUser(agentId, newUser);
    setAgentModalMode(null);
    setEditingAgent(null);
    setNewAgentData({ name: '', phone: '', agencyName: '', licenseNumber: '', specialty: [], trustLevel: 'silver' });
  };

  const handleAiCommand = async (command: string): Promise<string> => {
    const trimmedCommand = (command || '').trim();
    if (!trimmedCommand) {
      return 'لطفاً دستور یا سوال خود را وارد کنید.';
    }

    try {
      const config = getAiConfig();
      const systemPrompt = `You are an AI assistant for a property listing website's admin panel. You can help the admin navigate the panel, manage ads, and filter listings.
      
      Available tools (respond with a JSON string if you want to use a tool, otherwise respond normally):
      {"tool": "navigateToSection", "section": "overview|listings|users|agents|packages|ads|settings"}
      {"tool": "manageAds", "action": "view|create"}
      {"tool": "filterListings", "status": "pending|approved|rejected|expired"}
      {"tool": "searchUsers", "query": "search term"}
      
      If you want to use a tool, YOUR ENTIRE RESPONSE MUST BE ONLY THE JSON OBJECT.`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: trimmedCommand,
          systemInstruction: systemPrompt,
          config: config
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'پاسخی از هوش مصنوعی دریافت نشد');
      }

      const data = await res.json();
      const responseText = data.text?.trim() || data.choices?.[0]?.message?.content?.trim() || '';

      try {
        const call = JSON.parse(responseText);
        if (call.tool === 'navigateToSection') {
          if (['overview', 'listings', 'users', 'agents', 'packages', 'ads', 'settings'].includes(call.section)) {
            setActiveSection(call.section);
            return `در حال نمایش بخش ${call.section}`;
          } else {
            return `بخش "${call.section}" نامعتبر است.`;
          }
        } else if (call.tool === 'manageAds') {
          setActiveSection('ads');
          if (call.action === 'create') {
            setEditingAd(null);
            setNewAdData({ id: '', position: 'hero', title: '', imageUrl: '', linkUrl: '', isActive: true, priority: 1 });
            setAdModalMode('create');
            return 'بخش تبلیغات باز شد و فرم ایجاد تبلیغ جدید نمایش داده شد.';
          }
          return 'در حال نمایش بخش مدیریت تبلیغات.';
        } else if (call.tool === 'filterListings') {
          if (['pending', 'approved', 'rejected', 'expired'].includes(call.status)) {
            setActiveSection('listings');
            setActiveAdTab(call.status);
            return `در حال نمایش آگهی‌های با وضعیت ${call.status}`;
          } else {
            return `وضعیت "${call.status}" نامعتبر است.`;
          }
        } else if (call.tool === 'searchUsers') {
          setActiveSection('users');
          setUserSearchQuery(call.query);
          return `در حال جستجوی کاربر "${call.query}"`;
        }
      } catch (e) {
        // Not a tool call, just return the text
        return responseText;
      }

      return responseText || 'درخواست شما پردازش شد اما اقدامی شناسایی نشد.';
    } catch (error) {
      console.error('AI Command Error:', error);
      return 'متاسفانه در پردازش دستور شما خطایی رخ داد.';
    }
  };

  const handleSavePackage = () => {
    if (!newPlanData.title || !newPlanData.price) return;
    if (packageModalMode === 'create') {
        onUpdatePlans([...promotionPlans, { ...newPlanData, id: 'plan_' + Date.now() }]);
    } else if (packageModalMode === 'edit' && editingPlan) {
        onUpdatePlans(promotionPlans.map(p => p.id === editingPlan.id ? { ...newPlanData } : p));
    }
    setPackageModalMode(null);
    setEditingPlan(null);
    setFeatInput('');
  };

  const handleSaveAd = () => {
    if (!newAdData.title || !newAdData.imageUrl) return;
    if (adModalMode === 'create') {
        onUpdateAdSlots([...adSlots, { ...newAdData, id: 'ad_slot_' + Date.now() }]);
    } else if (adModalMode === 'edit' && editingAd) {
        onUpdateAdSlots(adSlots.map(s => s.id === editingAd.id ? { ...newAdData } : s));
    }
    setAdModalMode(null);
    setEditingAd(null);
  };

  const handleSaveBadge = () => {
    if (!newBadgeData.title || !newBadgeData.imageUrl) return;
    const currentBadges = trustBadges || [];
    if (badgeModalMode === 'create') {
        onUpdateTrustBadges?.([...currentBadges, { ...newBadgeData, id: 'badge_' + Date.now() }]);
    } else if (badgeModalMode === 'edit' && editingBadge) {
        onUpdateTrustBadges?.(currentBadges.map(b => b.id === editingBadge.id ? { ...newBadgeData } : b));
    }
    setBadgeModalMode(null);
    setEditingBadge(null);
  };

  const SidebarItem = ({ id, label, icon, badge }: { id: AdminSection, label: string, icon: string, badge?: number }) => (
    <button 
      onClick={() => setActiveSection(id)}
      className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 ${activeSection === id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-[1.02]' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-black">{label}</span>
      </div>
      {typeof badge === 'number' && badge > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeSection === id ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-['Vazirmatn']">
      {/* Dynamic Sidebar */}
      <aside className="w-80 h-screen glass-effect border-l border-slate-200 p-8 flex flex-col hidden lg:flex">
        <div className="flex items-center gap-3 mb-12">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
            </div>
            <div>
                <h1 className="text-lg font-black text-slate-900 leading-none">مدیریت هوشمند</h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Panel v4.8</span>
            </div>
        </div>
        <nav className="flex-grow space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
            <SidebarItem id="overview" label="داشبورد آماری" icon="📊" />
            <SidebarItem id="listings" label="تایید محتوا" icon="🏢" badge={pendingAdsCount} />
            <SidebarItem id="finance" label="امور مالی و فیش‌ها" icon="💳" badge={pendingReceiptsCount} />
            <SidebarItem id="tickets" label="تیکت‌های پشتیبانی" icon="🎫" badge={openTicketsCount} />
            <SidebarItem id="agents" label="آزمایشگاه مشاوران" icon="🤵" />
            <SidebarItem id="users" label="مدیریت کاربران" icon="👥" />
            <SidebarItem id="packages" label="مهندسی پکیج‌ها" icon="🚀" />
            <SidebarItem id="ads" label="جایگاه‌های تبلیغاتی" icon="📺" />
            <SidebarItem id="settings" label="تنظیمات سیستم" icon="⚙️" />
        </nav>
        <div className="pt-6 border-t border-slate-200 space-y-2">
            {onBackToPwa && (
              <button 
                onClick={onBackToPwa} 
                className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-black text-xs transition-colors"
              >
                <span>📱</span>
                <span>مشاهده اپلیکیشن PWA</span>
              </button>
            )}
            <button 
              onClick={onBackToHome} 
              className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-black text-xs transition-colors"
            >
              <span>🏠</span>
              <span>مشاهده وب‌سایت</span>
            </button>
            <button 
              onClick={() => setShowAdminLogoutConfirm(true)} 
              className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 font-black text-xs transition-colors"
            >
              <span>🚪</span>
              <span>خروج ایمن از مدیریت</span>
            </button>
        </div>
      </aside>

      {/* Main Administrative Screen */}
      <main className="flex-grow h-screen overflow-y-auto p-4 sm:p-8 lg:p-12 relative custom-scrollbar pb-28 lg:pb-12">
        {/* Desktop Top Header Bar with Live View & Logout */}
        <div className="hidden lg:flex items-center justify-between bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {activeSection === 'overview' && '📊'}
              {activeSection === 'listings' && '🏢'}
              {activeSection === 'finance' && '💳'}
              {activeSection === 'tickets' && '🎫'}
              {activeSection === 'agents' && '🤵'}
              {activeSection === 'users' && '👥'}
              {activeSection === 'packages' && '🚀'}
              {activeSection === 'ads' && '📺'}
              {activeSection === 'settings' && '⚙️'}
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                {activeSection === 'overview' && 'داشبورد استراتژیک و آمار پلتفرم'}
                {activeSection === 'listings' && 'بررسی و تایید آگهی‌های املاک'}
                {activeSection === 'finance' && 'امور مالی، فیش‌های واریزی و درگاه‌ها'}
                {activeSection === 'tickets' && 'مرکز پشتیبانی و تیکت‌های کاربران'}
                {activeSection === 'agents' && 'مدیریت مشاورین و املاک برتر'}
                {activeSection === 'users' && 'مدیریت و پرونده کاربران'}
                {activeSection === 'packages' && 'تعریف و مدیریت پکیج‌ها و پلن‌ها'}
                {activeSection === 'ads' && 'تبلیغات بنری و مجوزهای قانونی'}
                {activeSection === 'settings' && 'تنظیمات سامانه و دسته‌بندی‌ها'}
              </h2>
              <p className="text-xs font-bold text-slate-400">سامانه جامع مدیریت هوشمند معاملات املاک</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onBackToHome}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl font-black text-xs flex items-center gap-2 transition-all"
            >
              <span>🏠</span>
              <span>مشاهده و بازگشت به سایت</span>
            </button>
            <button 
              onClick={() => setShowAdminLogoutConfirm(true)}
              className="px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl font-black text-xs flex items-center gap-2 transition-all"
            >
              <span>🚪</span>
              <span>خروج از پنل</span>
            </button>
          </div>
        </div>

        {/* Mobile & PWA Header Bar */}
        <div className="lg:hidden bg-white rounded-3xl p-4 shadow-sm border border-slate-100 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black text-slate-900 leading-tight">مدیریت در PWA</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">کنترل کامل سیستم از روی موبایل</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={onBackToHome} 
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-slate-200 transition-colors"
              title="مشاهده سایت"
            >
              <span>🏠 سایت</span>
            </button>
            {onBackToPwa && (
              <button 
                onClick={onBackToPwa} 
                className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black flex items-center gap-1 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                title="بازگشت به اپلیکیشن موبایل"
              >
                <span>📱 اپ</span>
              </button>
            )}
            <button 
              onClick={() => setShowAdminLogoutConfirm(true)} 
              className="p-2 text-rose-500 bg-rose-50 rounded-xl text-xs hover:bg-rose-100 transition-colors"
              title="خروج ایمن"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden flex overflow-x-auto gap-2 pb-3 mb-4 border-b border-slate-200/80 scrollbar-hide">
          {[
            { id: 'overview', label: 'داشبورد', icon: '📊' },
            { id: 'listings', label: 'تایید محتوا', icon: '🏢', badge: pendingAdsCount },
            { id: 'finance', label: 'امور مالی', icon: '💳', badge: pendingReceiptsCount },
            { id: 'tickets', label: 'تیکت‌ها', icon: '🎫', badge: openTicketsCount },
            { id: 'users', label: 'کاربران', icon: '👥' },
            { id: 'packages', label: 'پکیج‌ها', icon: '🚀' },
            { id: 'agents', label: 'مشاوران', icon: '🤵' },
            { id: 'ads', label: 'تبلیغات', icon: '📺' },
            { id: 'settings', label: 'تنظیمات', icon: '⚙️' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as AdminSection)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${activeSection === item.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm border border-slate-100'}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>


        {dbConnected && (
          <div className="mb-8 bg-amber-50 border-r-8 border-amber-500 text-amber-900 p-6 rounded-3xl flex items-start gap-4 shadow-sm" dir="rtl">
            <span className="text-3xl mt-0.5">⚠️</span>
            <div>
              <h3 className="text-lg font-black">هشدار امنیتی بسیار مهم برای مدیریت</h3>
              <p className="text-sm mt-1.5 leading-relaxed font-semibold">
                دیتابیس <span className="text-indigo-600 font-bold">MySQL</span> با موفقیت متصل و راه‌اندازی گردیده است. جهت حفظ امنیت پلتفرم و جلوگیری از هرگونه دسترسی غیرمجاز یا بازنویسی اطلاعات، لطفاً دیگر به مسیر <code className="bg-amber-100/80 px-2 py-0.5 rounded text-rose-700 font-mono font-black text-xs">/install</code> مراجعه نکنید و حتماً این مسیر را حذف، مسدود یا غیرفعال سازید.
              </p>
            </div>
          </div>
        )}

        <div className="animate-step">
            {/* OVERVIEW SECTION */}
            {activeSection === 'overview' && (
              <Panel title="گزارش استراتژیک و هوش تجاری پلتفرم" icon="📊">
                <StrategicOverviewReport 
                  listings={listings}
                  users={users}
                  categories={categories}
                  paymentReceipts={paymentReceipts}
                  financeMetrics={financeMetrics}
                  stats={stats}
                  siteBranding={siteBranding}
                  aiInsight={aiInsight}
                  isInsightLoading={isInsightLoading}
                  onRefreshInsights={handleGetInsights}
                  dbConnected={dbConnected}
                />
              </Panel>
            )}

            {/* FINANCE SECTION */}
            {activeSection === 'finance' && (
              <Panel title="امور مالی و فیش‌های کارت به کارت" icon="💳">
                <div className="space-y-8 animate-step">
                  {/* Strategic Financial Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border-r-8 border-emerald-500 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">کل درآمد وصول شده</span>
                      <h4 className="text-2xl font-black text-slate-900">
                        {new Intl.NumberFormat('fa-IR').format(financeMetrics.totalApprovedRevenue)} <span className="text-xs font-bold text-slate-400">تومان</span>
                      </h4>
                      <p className="text-[10px] font-bold text-emerald-600 mt-2">✓ {financeMetrics.approvedCount} تراکنش تایید شده</p>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border-r-8 border-amber-500 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">مبالغ در صف بررسی</span>
                      <h4 className="text-2xl font-black text-slate-900">
                        {new Intl.NumberFormat('fa-IR').format(financeMetrics.totalPendingRevenue)} <span className="text-xs font-bold text-slate-400">تومان</span>
                      </h4>
                      <p className="text-[10px] font-bold text-amber-600 mt-2">⏳ {financeMetrics.pendingCount} فیش در انتظار اقدام</p>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border-r-8 border-indigo-500 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">درآمد بسته‌های آگهی</span>
                      <h4 className="text-2xl font-black text-slate-900">
                        {new Intl.NumberFormat('fa-IR').format(financeMetrics.packageRevenue)} <span className="text-xs font-bold text-slate-400">تومان</span>
                      </h4>
                      <p className="text-[10px] font-bold text-indigo-600 mt-2">📦 سهمیه‌های خریداری شده</p>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border-r-8 border-purple-500 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">درآمد ارتقای آگهی‌ها</span>
                      <h4 className="text-2xl font-black text-slate-900">
                        {new Intl.NumberFormat('fa-IR').format(financeMetrics.promotionRevenue)} <span className="text-xs font-bold text-slate-400">تومان</span>
                      </h4>
                      <p className="text-[10px] font-bold text-purple-600 mt-2">🚀 نردبان، فوری و ویژه</p>
                    </div>
                  </div>

                  {/* Summary Header & Export */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">مدیریت امور مالی و واریزی‌های کارت به کارت</h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">تایید یا رد فیش‌های پرداخت آنلاین و مدیریت شماره کارت‌های پذیرنده</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button 
                        onClick={handleExportFinancialCsv}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border border-slate-200"
                      >
                        <span>📥</span>
                        <span>دریافت خروجی اکسل (CSV)</span>
                      </button>
                      <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-2xl text-xs font-black">
                        ⏳ {paymentReceipts.filter(r => r.status === 'pending').length} فیش در انتظار بررسی
                      </span>
                      <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-2xl text-xs font-black">
                        ✅ {paymentReceipts.filter(r => r.status === 'approved').length} فیش تایید شده
                      </span>
                    </div>
                  </div>

                  {/* Card-to-Card Configuration Panel */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl font-black text-lg">💳</div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base">تنظیمات پرداخت کارت به کارت</h3>
                          <p className="text-xs text-slate-400">اطلاعات حساب بانکی برای نمایش به کاربران در هنگام انتخاب پرداخت کارت به کارت</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
                        <input 
                          type="checkbox" 
                          checked={tempCardPayment.isEnabled} 
                          onChange={e => setTempCardPayment({ ...tempCardPayment, isEnabled: e.target.checked })} 
                          className="w-5 h-5 rounded accent-blue-600"
                        />
                        <span className="text-xs font-black text-slate-700">فعال بودن این روش پرداخت</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">نام بانک</label>
                        <input 
                          type="text" 
                          value={tempCardPayment.bankName} 
                          onChange={e => setTempCardPayment({ ...tempCardPayment, bankName: e.target.value })} 
                          placeholder="مثال: بانک ملی ایران"
                          className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">شماره کارت (16 رقمی)</label>
                        <input 
                          type="text" 
                          value={tempCardPayment.cardNumber} 
                          onChange={e => setTempCardPayment({ ...tempCardPayment, cardNumber: e.target.value })} 
                          placeholder="6037-9918-XXXX-XXXX"
                          dir="ltr"
                          className="w-full bg-slate-50 p-4 rounded-2xl font-mono text-sm border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">صاحب حساب</label>
                        <input 
                          type="text" 
                          value={tempCardPayment.accountHolder} 
                          onChange={e => setTempCardPayment({ ...tempCardPayment, accountHolder: e.target.value })} 
                          placeholder="نام و نام خانوادگی"
                          className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">شماره شبا (IBAN)</label>
                        <input 
                          type="text" 
                          value={tempCardPayment.iban} 
                          onChange={e => setTempCardPayment({ ...tempCardPayment, iban: e.target.value })} 
                          placeholder="IR12017..."
                          dir="ltr"
                          className="w-full bg-slate-50 p-4 rounded-2xl font-mono text-xs border border-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">توضیحات و راهنمای پرداخت برای کاربر</label>
                      <textarea 
                        rows={2}
                        value={tempCardPayment.description || ''} 
                        onChange={e => setTempCardPayment({ ...tempCardPayment, description: e.target.value })} 
                        placeholder="راهنمای نحوه واریز و ثبت فیش..."
                        className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border border-slate-200"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          if (onUpdateCardPayment) {
                            onUpdateCardPayment(tempCardPayment);
                          }
                          setCardSaveSuccess(true);
                          setTimeout(() => setCardSaveSuccess(false), 3000);
                        }} 
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                      >
                        💾 ذخیره تنظیمات کارت به کارت
                      </button>
                      {cardSaveSuccess && <span className="text-xs font-black text-emerald-600">✓ تنظیمات کارت به کارت با موفقیت بروزرسانی شد!</span>}
                    </div>
                  </div>

                  {/* Payment Receipts Verification Queue */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">لیست فیش‌های پرداخت کارت به کارت</h3>
                        <p className="text-xs text-slate-400">بررسی، تایید و یا رد درخواست‌های ارتقای آگهی و خرید پکیج بر اساس فیش‌های ارسالی کاربران</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="جستجو در فیش‌ها (نام، شماره، پیگیری)..." 
                            value={receiptSearchQuery}
                            onChange={e => setReceiptSearchQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {receiptSearchQuery && (
                            <button 
                              onClick={() => setReceiptSearchQuery('')}
                              className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                          <button 
                            onClick={() => setReceiptTab('pending')} 
                            className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${receiptTab === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500'}`}
                          >
                            در انتظار ({paymentReceipts.filter(r => r.status === 'pending').length})
                          </button>
                          <button 
                            onClick={() => setReceiptTab('approved')} 
                            className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${receiptTab === 'approved' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500'}`}
                          >
                            تایید شده ({paymentReceipts.filter(r => r.status === 'approved').length})
                          </button>
                          <button 
                            onClick={() => setReceiptTab('rejected')} 
                            className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${receiptTab === 'rejected' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500'}`}
                          >
                            رد شده ({paymentReceipts.filter(r => r.status === 'rejected').length})
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Grid of Receipts */}
                    {paymentReceipts
                      .filter(r => r.status === receiptTab)
                      .filter(r => {
                        if (!receiptSearchQuery.trim()) return true;
                        const q = receiptSearchQuery.trim().toLowerCase();
                        return (
                          (r.userName && r.userName.toLowerCase().includes(q)) ||
                          (r.userPhone && r.userPhone.includes(q)) ||
                          (r.trackingCode && r.trackingCode.includes(q)) ||
                          (r.listingTitle && r.listingTitle.toLowerCase().includes(q)) ||
                          (r.planTitle && r.planTitle.toLowerCase().includes(q))
                        );
                      })
                      .length === 0 ? (
                      <div className="py-20 text-center text-slate-400 font-black">
                        هیچ فیشی در این دسته یافت نشد.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {paymentReceipts
                          .filter(r => r.status === receiptTab)
                          .filter(r => {
                            if (!receiptSearchQuery.trim()) return true;
                            const q = receiptSearchQuery.trim().toLowerCase();
                            return (
                              (r.userName && r.userName.toLowerCase().includes(q)) ||
                              (r.userPhone && r.userPhone.includes(q)) ||
                              (r.trackingCode && r.trackingCode.includes(q)) ||
                              (r.listingTitle && r.listingTitle.toLowerCase().includes(q)) ||
                              (r.planTitle && r.planTitle.toLowerCase().includes(q))
                            );
                          })
                          .map(r => (
                          <div key={r.id} className="bg-slate-50/80 p-6 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-4">
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-black text-slate-900 text-base">{r.listingTitle}</h4>
                                  <span className="text-xs font-bold text-slate-500">کاربر: {r.userName} ({r.userPhone})</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {r.status === 'approved' ? '✅ تایید شده' : r.status === 'rejected' ? '❌ رد شده' : '⏳ در انتظار تایید'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 bg-white p-4 rounded-2xl text-xs font-bold text-slate-600 mb-3 border border-slate-100">
                                <div>پلن درخواستی: <span className="text-indigo-600 font-black">{r.planTitle}</span></div>
                                <div>مبلغ واریزی: <span className="text-slate-900 font-black">{r.amount} تومان</span></div>
                                <div>کد پیگیری: <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded" dir="ltr">{r.trackingCode}</span></div>
                                <div>تاریخ ثبت: <span className="text-slate-500">{new Date(r.createdAt).toLocaleDateString('fa-IR')}</span></div>
                              </div>

                              {r.rejectionReason && (
                                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 mb-3">
                                  علت رد: {r.rejectionReason}
                                </p>
                              )}

                              {r.receiptImageUrl && (
                                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100">
                                  <img 
                                    src={r.receiptImageUrl} 
                                    alt="فیش واریز" 
                                    className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity border"
                                    onClick={() => setViewReceiptModal(r)}
                                  />
                                  <div>
                                    <span className="text-xs font-black text-slate-800 block">تصویر فیش واریزی</span>
                                    <button 
                                      onClick={() => setViewReceiptModal(r)} 
                                      className="text-xs font-bold text-blue-600 underline mt-1"
                                    >
                                      مشاهده سایز بزرگ تصویر
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons for Pending */}
                            {r.status === 'pending' && (
                              <div className="flex gap-3 pt-2 border-t border-slate-200">
                                <button 
                                  onClick={() => {
                                    if (onApproveReceipt) {
                                      onApproveReceipt(r.id);
                                    }
                                  }}
                                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1"
                                >
                                  <span>✅</span> تایید فیش و فعال‌سازی
                                </button>
                                <button 
                                  onClick={() => {
                                    setRejectModalReceipt(r);
                                    setReceiptRejectReason('');
                                  }}
                                  className="py-3 px-5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-black text-xs transition-all"
                                >
                                  ❌ رد فیش
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reject Modal */}
                  {rejectModalReceipt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                      <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl space-y-6" dir="rtl">
                        <h3 className="text-lg font-black text-slate-900">علت رد فیش واریزی</h3>
                        <p className="text-xs font-bold text-slate-500">
                          آگهی: <span className="text-slate-900">{rejectModalReceipt.listingTitle}</span> - کاربر: <span className="text-slate-900">{rejectModalReceipt.userName}</span>
                        </p>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">دلیل عدم تایید (برای کاربر پیامک خواهد شد)</label>
                          <textarea 
                            rows={3}
                            value={receiptRejectReason} 
                            onChange={e => setReceiptRejectReason(e.target.value)} 
                            placeholder="مثال: کد پیگیری اشتباه است یا واریز به حساب ننشسته است."
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs border border-slate-200"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              if (!receiptRejectReason.trim()) {
                                alert('لطفا علت رد فیش را وارد کنید.');
                                return;
                              }
                              if (onRejectReceipt) {
                                onRejectReceipt(rejectModalReceipt.id, receiptRejectReason.trim());
                              }
                              setRejectModalReceipt(null);
                            }}
                            className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs shadow-xl transition-all"
                          >
                            ثبت عدم تایید
                          </button>
                          <button 
                            onClick={() => setRejectModalReceipt(null)}
                            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs transition-all"
                          >
                            انصراف
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Lightbox Modal */}
                  {viewReceiptModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                      <div className="bg-white rounded-[2.5rem] max-w-2xl w-full p-6 shadow-2xl space-y-4" dir="rtl">
                        <div className="flex justify-between items-center pb-2 border-b">
                          <h3 className="font-black text-slate-900 text-sm">تصویر فیش واریزی - کد پیگیری {viewReceiptModal.trackingCode}</h3>
                          <button onClick={() => setViewReceiptModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">✕</button>
                        </div>
                        <div className="max-h-[70vh] overflow-auto flex justify-center bg-slate-900 rounded-2xl p-2">
                          <img src={viewReceiptModal.receiptImageUrl} alt="فیش" className="max-w-full max-h-[65vh] object-contain rounded-xl" />
                        </div>
                        <div className="text-left">
                          <button onClick={() => setViewReceiptModal(null)} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black">بستن</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            )}

            {/* AGENTS LAB SECTION */}
            {activeSection === 'agents' && (
              <Panel title="مدیریت و رتبه‌بندی مشاورین" icon="🤵">
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                        <div className="relative w-full md:w-96">
                            <input 
                                type="text" 
                                placeholder="جستجو در بین مشاوران املاک..." 
                                value={agentSearchQuery} 
                                onChange={e => setAgentSearchQuery(e.target.value)} 
                                className="w-full px-12 py-4 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold transition-all" 
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        </div>
                        <button 
                            onClick={() => {
                                setEditingAgent(null);
                                setNewAgentData({ name: '', phone: '', agencyName: '', licenseNumber: '', specialty: [], trustLevel: 'silver' });
                                setAgentModalMode('create');
                            }}
                            className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center gap-3"
                        >
                            <span className="text-2xl">+</span> ایجاد مشاور حرفه‌ای
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredAgents.map(agent => (
                            <div key={agent.id} className="glass-card p-8 rounded-[3.5rem] bg-white border border-slate-50 relative overflow-hidden group hover:shadow-2xl transition-all h-[450px] flex flex-col">
                                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] flex items-center justify-center text-2xl ${agent.agentProfile?.trustLevel === 'diamond' ? 'bg-cyan-50 text-cyan-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {agent.agentProfile?.trustLevel === 'diamond' ? '💎' : agent.agentProfile?.trustLevel === 'gold' ? '🥇' : '🥈'}
                                </div>
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-inner border border-white">
                                        {agent.name[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 leading-none mb-2">{agent.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{agent.agentProfile?.agencyName}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 flex-grow">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                                        <span>کد نظام صنفی: {agent.agentProfile?.licenseNumber}</span>
                                        <span className="text-emerald-500 font-black">⭐ {agent.agentProfile?.rating}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {agent.agentProfile?.specialty.map((s, i) => (
                                            <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-black rounded-lg"># {s}</span>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div className="p-4 bg-slate-50 rounded-2xl text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">آگهی فعال</p>
                                            <p className="text-lg font-black text-indigo-600">{listings.filter(l => l.ownerId === agent.id).length}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">قراردادها</p>
                                            <p className="text-lg font-black text-emerald-600">{agent.agentProfile?.totalDeals}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-50 flex gap-2">
                                    <button className="flex-grow py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">مدیریت برند</button>
                                    {/* FIX: Fixed the call to setEditingAgent and populated the form with the agent's current data */}
                                    <button onClick={() => { 
                                        setEditingAgent(agent); 
                                        setNewAgentData({
                                            name: agent.name,
                                            phone: agent.phone,
                                            agencyName: agent.agentProfile?.agencyName || '',
                                            licenseNumber: agent.agentProfile?.licenseNumber || '',
                                            specialty: agent.agentProfile?.specialty || [],
                                            trustLevel: agent.agentProfile?.trustLevel || 'silver'
                                        });
                                        setAgentModalMode('edit'); 
                                    }} className="p-3.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all">⚙️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </Panel>
            )}

            {/* LISTINGS MODERATION */}
            {activeSection === 'listings' && (
              <Panel title="مدیریت، نظارت و فیلترینگ جامع آگهی‌ها" icon="🏢">
                <div className="glass-card rounded-[3.5rem] overflow-hidden border border-white bg-white/50 shadow-xl space-y-6 p-6">
                    {/* Search & Filter Header */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="w-full md:w-96 relative">
                            <input 
                                type="text" 
                                placeholder="جستجو بر اساس عنوان، کد آگهی، شهر، شماره مالک..." 
                                value={adSearchQuery} 
                                onChange={e => setAdSearchQuery(e.target.value)} 
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-xs shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                            />
                            {adSearchQuery && (
                                <button 
                                    onClick={() => setAdSearchQuery('')}
                                    className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="text-xs font-black text-slate-500">
                            مجموع آگهی‌های منطبق: <span className="text-indigo-600 font-extrabold">{listings.filter(l => {
                                if (activeAdTab !== 'all' && l.status !== activeAdTab) return false;
                                if (adSearchQuery.trim()) {
                                    const q = adSearchQuery.toLowerCase().trim();
                                    return (l.title?.toLowerCase().includes(q) || l.id?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q) || (l.contactPhone || (l as any).ownerPhone || '').includes(q));
                                }
                                return true;
                            }).length}</span> مورد
                        </div>
                    </div>

                    {/* Status Tabs */}
                    <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
                        {([
                            { id: 'pending', label: '📥 در انتظار بررسی', count: listings.filter(l => l.status === 'pending').length },
                            { id: 'approved', label: '✅ تایید و منتشر شده', count: listings.filter(l => l.status === 'approved').length },
                            { id: 'rejected', label: '❌ رد شده', count: listings.filter(l => l.status === 'rejected').length },
                            { id: 'expired', label: '📅 منقضی شده', count: listings.filter(l => l.status === 'expired').length },
                            { id: 'archived', label: '📦 آرشیو', count: listings.filter(l => l.status === 'archived').length },
                            { id: 'all', label: '🌐 تمام آگهی‌ها', count: listings.length }
                        ] as const).map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveAdTab(tab.id as any)} 
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                                    activeAdTab === tab.id 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeAdTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Listings Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="text-slate-400 text-[10px] font-black border-b border-slate-100 uppercase tracking-widest bg-slate-50/50">
                                    <th className="px-6 py-4 rounded-r-2xl">آگهی و تصویر</th>
                                    <th className="px-6 py-4">شرایط معامله و قیمت</th>
                                    <th className="px-6 py-4">مشخصات و متراژ</th>
                                    <th className="px-6 py-4">مالک / ثبت‌کننده</th>
                                    <th className="px-6 py-4 text-center">وضعیت فعلی</th>
                                    <th className="px-6 py-4 text-center">تغییر سریع وضعیت</th>
                                    <th className="px-6 py-4 text-left rounded-l-2xl">اقدامات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listings.filter(l => {
                                    if (activeAdTab !== 'all' && l.status !== activeAdTab) return false;
                                    if (adSearchQuery.trim()) {
                                        const q = adSearchQuery.toLowerCase().trim();
                                        return (
                                            (l.title && l.title.toLowerCase().includes(q)) || 
                                            (l.id && l.id.toLowerCase().includes(q)) || 
                                            (l.city && l.city.toLowerCase().includes(q)) || 
                                            (l.neighborhood && l.neighborhood.toLowerCase().includes(q)) ||
                                            ((l.contactPhone || (l as any).ownerPhone || '').includes(q))
                                        );
                                    }
                                    return true;
                                }).map(listing => (
                                    <tr key={listing.id} className="hover:bg-white/90 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 shadow-sm">
                                                    {listing.images && listing.images[0] ? (
                                                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xl">🏡</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-black text-slate-900 block line-clamp-1 max-w-[200px]" title={listing.title}>
                                                        {listing.title}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                                                        {listing.province}، {listing.city} {listing.neighborhood ? `(${listing.neighborhood})` : ''}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-indigo-500 font-bold">
                                                        کد: {listing.id}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                            {listing.type === 'rent' ? (
                                                <div>
                                                    <span className="text-indigo-600 block text-[11px] font-black">رهن: {Number(listing.deposit || 0).toLocaleString('fa-IR')} تومان</span>
                                                    <span className="text-slate-500 block text-[10px]">اجاره: {Number(listing.rent || 0).toLocaleString('fa-IR')} تومان</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <span className="text-emerald-600 block text-[11px] font-black">{Number(listing.price || 0).toLocaleString('fa-IR')} تومان</span>
                                                    <span className="text-[9px] text-slate-400">فروش نقدی</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                            <span>{listing.size} متر</span>
                                            <span className="mx-1">•</span>
                                            <span>{listing.bedrooms} خواب</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <span className="font-bold text-slate-800 block">{listing.contactName || 'کاربر سامانه'}</span>
                                            <span className="font-mono text-slate-500 text-[11px] block dir-ltr text-right">
                                                {listing.contactPhone || (listing as any).ownerPhone || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                                                listing.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                listing.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                listing.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                                listing.status === 'archived' ? 'bg-purple-100 text-purple-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {listing.status === 'approved' ? '✅ تایید شده' :
                                                 listing.status === 'pending' ? '⏳ در انتظار' :
                                                 listing.status === 'rejected' ? '❌ رد شده' :
                                                 listing.status === 'archived' ? '📦 آرشیو' : '📅 منقضی'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <select 
                                                value={listing.status} 
                                                onChange={(e) => {
                                                    const newStat = e.target.value as any;
                                                    onUpdateStatus(listing.id!, newStat);
                                                }}
                                                className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                                            >
                                                <option value="approved">✅ تایید و انتشار</option>
                                                <option value="pending">⏳ در انتظار بررسی</option>
                                                <option value="rejected">❌ رد آگهی</option>
                                                <option value="expired">📅 منقضی شده</option>
                                                <option value="archived">📦 انتقال به آرشیو</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-left">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setSelectedListingForReview(listing)} 
                                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1"
                                                    title="بررسی جامع و نظارت دقیق"
                                                >
                                                    <span>🔍</span>
                                                    <span>بازبینی</span>
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm(`آیا از حذف دائمی آگهی "${listing.title}" اطمینان دارید؟`)) {
                                                            onDelete(listing.id!);
                                                        }
                                                    }} 
                                                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                                                    title="حذف کامل آگهی"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {listings.filter(l => activeAdTab === 'all' || l.status === activeAdTab).length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400 font-bold text-sm">
                                            هیچ آگهی در این وضعیت یافت نشد.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
              </Panel>
            )}

            {/* PACKAGES SECTION */}
            {activeSection === 'packages' && (
              <Panel title="مهندسی و مدیریت پکیج‌های پلتفرم" icon="🚀">
                <div className="space-y-8">
                  {/* Sub-tab Navigation */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-100/80 p-2 rounded-3xl">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActivePackageTab('listing_packages')}
                        className={`px-6 py-3 rounded-2xl font-black text-xs transition-all ${activePackageTab === 'listing_packages' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        📦 بسته‌های سهمیه ثبت آگهی ({listingPackages.length})
                      </button>
                      <button
                        onClick={() => setActivePackageTab('promo_plans')}
                        className={`px-6 py-3 rounded-2xl font-black text-xs transition-all ${activePackageTab === 'promo_plans' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        ⚡ پلن‌های ارتقا (نردبان و فوری) ({promotionPlans.length})
                      </button>
                      <button
                        onClick={() => setActivePackageTab('user_purchases')}
                        className={`px-6 py-3 rounded-2xl font-black text-xs transition-all ${activePackageTab === 'user_purchases' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        👥 سهمیه‌های فعال کاربران ({userPackages.length})
                      </button>
                    </div>

                    {activePackageTab === 'listing_packages' && (
                      <button 
                        onClick={() => {
                          setEditingListingPkg(null);
                          setListingPkgForm({
                            title: '',
                            description: '',
                            adCount: 5,
                            price: 99000,
                            durationDays: 30,
                            badge: '',
                            featuredBonusCount: 0,
                            ladderBonusCount: 0,
                            isActive: true,
                          });
                          setIsListingPkgModalOpen(true);
                        }}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                      >
                        <span>+</span>
                        <span>تعریف بسته آگهی جدید</span>
                      </button>
                    )}

                    {activePackageTab === 'promo_plans' && (
                      <button 
                        onClick={() => {
                          setEditingPlan(null);
                          setNewPlanData({ id: '', title: '', price: '', durationDays: 30, contactVisible: true, priorityLevel: 1, features: [], icon: '📦', color: 'bg-white border-slate-200 text-slate-800' });
                          setPackageModalMode('create');
                        }}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        <span>+</span>
                        <span>ایجاد پلن ارتقای جدید</span>
                      </button>
                    )}
                  </div>

                  {/* LISTING PACKAGES TAB */}
                  {activePackageTab === 'listing_packages' && (
                    <div className="space-y-6">
                      <div className="bg-indigo-50/70 border border-indigo-100 p-5 rounded-3xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">💡</span>
                          <p className="text-xs font-bold text-indigo-900 leading-relaxed">
                            کاربران پس از اتمام سهمیه رایگان هر دسته‌بندی می‌توانند این بسته‌ها را خریداری نموده و پس از تایید مدیریت، سهمیه ثبت آگهی آن‌ها به صورت خودکار فعال می‌گردد.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listingPackages.map(pkg => (
                          <div key={pkg.id} className={`p-7 rounded-[2.5rem] bg-white border-2 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all relative ${pkg.isActive ? 'border-indigo-100' : 'border-slate-200 opacity-60'}`}>
                            {pkg.badge && (
                              <span className="absolute top-4 left-4 px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full shadow">
                                {pkg.badge}
                              </span>
                            )}
                            <div>
                              <div className="flex items-center gap-3 mb-4">
                                <span className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-black border border-indigo-100">
                                  📦
                                </span>
                                <div>
                                  <h4 className="text-lg font-black text-slate-900">{pkg.title}</h4>
                                  <span className="text-xs font-bold text-slate-400">اعتبار: {pkg.durationDays} روز</span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 mb-6 font-medium leading-relaxed">{pkg.description}</p>

                              <div className="p-4 bg-slate-50 rounded-2xl mb-6 space-y-2 border border-slate-100">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-bold">تعداد آگهی مجاز:</span>
                                  <span className="font-black text-indigo-600 text-sm">{pkg.adCount} آگهی</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-bold">هدیه نردبان:</span>
                                  <span className="font-black text-emerald-600">{pkg.ladderBonusCount || 0} عدد</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-bold">هدیه ویژه:</span>
                                  <span className="font-black text-amber-600">{pkg.featuredBonusCount || 0} عدد</span>
                                </div>
                                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                                  <span className="text-slate-700 font-black text-xs">قیمت بسته:</span>
                                  <span className="text-base font-black text-slate-900">
                                    {new Intl.NumberFormat('fa-IR').format(pkg.price)} <span className="text-xs font-bold text-slate-400">تومان</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  const updated = listingPackages.map(p => p.id === pkg.id ? { ...p, isActive: !p.isActive } : p);
                                  onUpdateListingPackages(updated);
                                }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-colors ${pkg.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                              >
                                {pkg.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingListingPkg(pkg);
                                  setListingPkgForm({
                                    title: pkg.title,
                                    description: pkg.description,
                                    adCount: pkg.adCount,
                                    price: pkg.price,
                                    durationDays: pkg.durationDays,
                                    badge: pkg.badge || '',
                                    featuredBonusCount: pkg.featuredBonusCount || 0,
                                    ladderBonusCount: pkg.ladderBonusCount || 0,
                                    isActive: pkg.isActive,
                                  });
                                  setIsListingPkgModalOpen(true);
                                }}
                                className="flex-grow py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors shadow"
                              >
                                ویرایش
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`آیا از حذف بسته "${pkg.title}" اطمینان دارید؟`)) {
                                    onUpdateListingPackages(listingPackages.filter(p => p.id !== pkg.id));
                                  }
                                }}
                                className="p-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs hover:bg-rose-100 transition-colors"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PROMOTION PLANS TAB */}
                  {activePackageTab === 'promo_plans' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {promotionPlans.map(plan => (
                        <div key={plan.id} className={`p-8 rounded-[3.5rem] border-4 flex flex-col group hover:shadow-2xl transition-all ${plan.color.replace('bg-', 'border-')}`}>
                          <div className="flex-grow mb-8">
                            <div className="w-16 h-16 bg-white rounded-[2rem] flex items-center justify-center text-3xl shadow-inner border mb-6">{plan.icon}</div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3">{plan.title}</h3>
                            <p className="text-3xl font-black text-slate-900 mb-6">{new Intl.NumberFormat('fa-IR').format(Number(plan.price))} <span className="text-sm font-bold">تومان</span></p>
                            <ul className="space-y-3">
                              {plan.features.map((f, i) => (
                                <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600"><span className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">✓</span> {f}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingPlan(plan); setNewPlanData(plan); setPackageModalMode('edit'); }} className="flex-grow py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black hover:bg-indigo-700 transition-all shadow-lg">ویرایش</button>
                            <button onClick={() => onUpdatePlans(promotionPlans.filter(p => p.id !== plan.id))} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* USER ACTIVE PURCHASES TAB */}
                  {activePackageTab === 'user_purchases' && (
                    <div className="glass-card rounded-3xl overflow-hidden border border-slate-100 bg-white shadow-md">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900">لیست سهمیه‌های خریداری شده توسط کاربران</h4>
                        <span className="text-xs font-bold text-slate-400">تعداد کل: {userPackages.length}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
                            <tr>
                              <th className="p-4">شناسه / کاربر</th>
                              <th className="p-4">عنوان بسته</th>
                              <th className="p-4 text-center">سهمیه باقیمانده</th>
                              <th className="p-4 text-center">تاریخ فعال‌سازی</th>
                              <th className="p-4 text-center">تاریخ انقضا</th>
                              <th className="p-4 text-center">وضعیت</th>
                              <th className="p-4 text-center">عملیات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                            {userPackages.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                                  هنوز هیچ بسته‌ای توسط کاربران خریداری یا فعال نشده است.
                                </td>
                              </tr>
                            ) : (
                              userPackages.map(up => {
                                const targetUser = users.find(u => u.id === up.userId);
                                return (
                                  <tr key={up.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="p-4">
                                      <div className="flex flex-col">
                                        <span className="text-slate-900 font-black">{targetUser?.name || 'کاربر سیستم'}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{targetUser?.phone || up.userId}</span>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <span className="text-indigo-600 font-black">{up.packageTitle}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-black">
                                        {up.remainingAds} از {up.totalAds} آگهی
                                      </span>
                                    </td>
                                    <td className="p-4 text-center text-slate-500 font-mono">
                                      {new Date(up.activatedAt || up.purchasedAt || Date.now()).toLocaleDateString('fa-IR')}
                                    </td>
                                    <td className="p-4 text-center text-slate-500 font-mono">
                                      {new Date(up.expiresAt || Date.now()).toLocaleDateString('fa-IR')}
                                    </td>
                                    <td className="p-4 text-center">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${up.status === 'active' ? 'bg-emerald-100 text-emerald-700' : up.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {up.status === 'active' ? 'فعال' : up.status === 'pending' ? 'در انتظار' : up.status === 'expired' ? 'منقضی شده' : 'رد شده'}
                                      </span>
                                    </td>
                                    <td className="p-4 text-center">
                                      {up.status === 'pending' && onApproveUserPackage && (
                                        <button 
                                          onClick={() => onApproveUserPackage(up.id)}
                                          className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-black transition-colors"
                                        >
                                          تایید پکیج
                                        </button>
                                      )}
                                      {up.status === 'active' && (
                                        <span className="text-xs text-slate-400 font-bold">فعال است</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            )}

            {/* TICKETS MANAGEMENT SECTION */}
            {activeSection === 'tickets' && (
              <Panel title="مرکز پشتیبانی و تیکت‌های کاربران" icon="🎫">
                <div className="space-y-6">
                  {/* Top Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-black">
                        🎫
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">کل تیکت‌ها</span>
                        <span className="text-xl font-black text-slate-800">{supportTickets.length}</span>
                      </div>
                    </div>

                    <div className="p-5 bg-white rounded-3xl border border-rose-100 shadow-sm flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-black">
                        ⏳
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">در انتظار پاسخ</span>
                        <span className="text-xl font-black text-rose-600">{openTicketsCount}</span>
                      </div>
                    </div>

                    <div className="p-5 bg-white rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-black">
                        ✅
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">پاسخ داده شده</span>
                        <span className="text-xl font-black text-emerald-600">{supportTickets.filter(t => t.status === 'answered').length}</span>
                      </div>
                    </div>

                    <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl font-black">
                        🔒
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">بسته شده</span>
                        <span className="text-xl font-black text-slate-600">{supportTickets.filter(t => t.status === 'closed').length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      {(['all', 'open', 'answered', 'closed'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => setTicketStatusFilter(st)}
                          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${ticketStatusFilter === st ? 'bg-indigo-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {st === 'all' && 'همه تیکت‌ها'}
                          {st === 'open' && 'در انتظار پاسخ'}
                          {st === 'answered' && 'پاسخ داده شده'}
                          {st === 'closed' && 'بسته شده'}
                        </button>
                      ))}
                    </div>

                    <div className="relative flex-grow sm:flex-grow-0 sm:w-72">
                      <input 
                        type="text"
                        placeholder="جستجو در موضوع، شماره تیکت یا کاربر..."
                        value={ticketSearch}
                        onChange={e => setTicketSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Ticket Master-Detail Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Tickets List */}
                    <div className="lg:col-span-5 space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar pr-1">
                      {supportTickets
                        .filter(t => {
                          if (ticketStatusFilter !== 'all' && t.status !== ticketStatusFilter) return false;
                          if (ticketSearch.trim()) {
                            const query = ticketSearch.toLowerCase();
                            return t.subject.toLowerCase().includes(query) ||
                              t.userName.toLowerCase().includes(query) ||
                              t.userPhone.includes(query) ||
                              t.id.toLowerCase().includes(query);
                          }
                          return true;
                        })
                        .map(ticket => (
                          <div
                            key={ticket.id}
                            onClick={() => setSelectedTicketId(ticket.id)}
                            className={`p-5 rounded-3xl cursor-pointer transition-all border ${selectedTicketId === ticket.id ? 'bg-indigo-50/90 border-indigo-300 shadow-md scale-[1.01]' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${ticket.status === 'open' ? 'bg-rose-500 animate-pulse' : ticket.status === 'answered' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                <h5 className="font-black text-slate-900 text-sm">{ticket.subject}</h5>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 font-mono">
                                {new Date(ticket.updatedAt).toLocaleDateString('fa-IR')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                              <span className="font-bold">{ticket.userName} ({ticket.userPhone})</span>
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600">
                                {ticket.department === 'financial' ? 'امور مالی' : ticket.department === 'technical' ? 'فنی' : (ticket.department === 'listings' || (ticket.department as any) === 'listing') ? 'آگهی‌ها' : 'عمومی'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-[10px] font-bold">
                              <span className={`px-2 py-0.5 rounded-md ${ticket.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : ticket.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                اولویت: {ticket.priority === 'urgent' ? 'فوری' : ticket.priority === 'high' ? 'بالا' : ticket.priority === 'medium' ? 'متوسط' : 'عادی'}
                              </span>
                              <span className="text-indigo-600 font-black">
                                {ticket.messages.length} پیام
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Selected Ticket Conversation View */}
                    <div className="lg:col-span-7">
                      {(() => {
                        const activeTicket = supportTickets.find(t => t.id === selectedTicketId) || supportTickets[0];
                        if (!activeTicket) {
                          return (
                            <div className="p-12 bg-white rounded-[3rem] border border-slate-100 text-center text-slate-400">
                              <span className="text-5xl block mb-3">🎫</span>
                              <p className="font-black text-sm">هیچ تیکتی برای نمایش انتخاب نشده است.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[700px]">
                            {/* Ticket Detail Header */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-black text-base text-slate-900">{activeTicket.subject}</h4>
                                  <span className="text-[10px] font-mono font-black text-slate-400">#{activeTicket.id.slice(-6)}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-500">
                                  ارسال کننده: <span className="text-slate-800">{activeTicket.userName}</span> | شماره تماس: <span className="text-slate-800 font-mono">{activeTicket.userPhone}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <select
                                  value={activeTicket.status}
                                  onChange={e => onUpdateTicketStatus(activeTicket.id, e.target.value as any)}
                                  className="bg-white border border-slate-200 text-slate-700 font-black text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="open">🔴 در انتظار پاسخ</option>
                                  <option value="answered">🟢 پاسخ داده شده</option>
                                  <option value="closed">⚪ بسته شده</option>
                                </select>
                              </div>
                            </div>

                            {/* Messages History */}
                            <div className="flex-grow p-6 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/30">
                              {activeTicket.messages.map(msg => (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col ${msg.senderRole === 'admin' ? 'items-start' : 'items-end'}`}
                                >
                                  <div className={`max-w-[80%] p-4 rounded-3xl ${msg.senderRole === 'admin' ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/20' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm'}`}>
                                    <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75">
                                      <span className="font-black">{msg.senderName} ({msg.senderRole === 'admin' ? 'پشتیبانی مدیریت' : 'کاربر'})</span>
                                      <span className="font-mono">{new Date(msg.timestamp || (msg as any).createdAt || Date.now()).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{msg.text || (msg as any).message}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Admin Quick Templates & Composer */}
                            <div className="p-4 border-t border-slate-100 bg-white space-y-3">
                              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-600">
                                <span>پاسخ‌های آماده:</span>
                                <button 
                                  onClick={() => setAdminReplyText('با سلام و احترام، درخواست شما با موفقیت بررسی و تایید شد.')}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                  تایید درخواست
                                </button>
                                <button 
                                  onClick={() => setAdminReplyText('با سلام، لطفاً تصویر فیش واریزی و اطلاعات تراکنش را از بخش مالی مجدداً ارسال نمایید.')}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                  درخواست فیش واریزی
                                </button>
                                <button 
                                  onClick={() => setAdminReplyText('سلام، سهمیه آگهی‌های شما در پنل کاربری شارژ و فعال گردید.')}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                  شارژ سهمیه
                                </button>
                              </div>

                              <div className="flex gap-2">
                                <textarea
                                  rows={2}
                                  value={adminReplyText}
                                  onChange={e => setAdminReplyText(e.target.value)}
                                  placeholder="متن پاسخ رسمی مدیریت به کاربر..."
                                  className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                                <button
                                  onClick={() => {
                                    if (!adminReplyText.trim()) return;
                                    if (onReplyTicket) {
                                      onReplyTicket(activeTicket.id, adminReplyText.trim());
                                    } else if (onAdminReplyTicket) {
                                      onAdminReplyTicket(activeTicket.id, adminReplyText.trim());
                                    }
                                    setAdminReplyText('');
                                    setTicketActionMsg('پاسخ با موفقیت برای کاربر ارسال شد.');
                                    setTimeout(() => setTicketActionMsg(''), 3000);
                                  }}
                                  className="px-6 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                >
                                  <span>ارسال</span>
                                  <span>🚀</span>
                                </button>
                              </div>
                              {ticketActionMsg && (
                                <p className="text-center text-xs font-black text-emerald-600">{ticketActionMsg}</p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            {/* ADS & FOOTER SECTION */}
            {activeSection === 'ads' && (
              <Panel title="مدیریت تبلیغات بنری و مجوزهای فوتر" icon="📺">
                <div className="space-y-12">
                    {/* BANNERS MANAGEMENT */}
                    <div className="space-y-6">
                        {/* SLIDER CONFIGURATION PANEL */}
                        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-8 rounded-[3rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-500/30">
                            <div className="space-y-2 text-center md:text-right">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-[10px] font-black uppercase">
                                    <span>⚙️ تنظیمات اسلایدر خودکار بنرها</span>
                                </div>
                                <h4 className="text-xl font-black text-white">کنترل جابجایی هوشمند بنرهای تبلیغاتی</h4>
                                <p className="text-xs text-indigo-200/80 font-medium">فعال‌سازی اسلایدر خودکار و تعیین زمان مکث روی هر اسلاید (به ثانیه)</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                                <label className="flex items-center gap-3 cursor-pointer text-xs font-black">
                                    <span>اسلایدر خودکار:</span>
                                    <input 
                                        type="checkbox" 
                                        checked={tempSliderConfig.autoSlideEnabled} 
                                        onChange={e => setTempSliderConfig(prev => ({ ...prev, autoSlideEnabled: e.target.checked }))} 
                                        className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
                                    />
                                    <span className={tempSliderConfig.autoSlideEnabled ? 'text-emerald-400' : 'text-slate-400'}>
                                        {tempSliderConfig.autoSlideEnabled ? 'فعال' : 'غیرفعال'}
                                    </span>
                                </label>

                                <div className="h-6 w-px bg-white/20 hidden sm:block"></div>

                                <div className="flex items-center gap-2 text-xs font-black">
                                    <span>مکث (ثانیه):</span>
                                    <select 
                                        value={tempSliderConfig.autoSlideIntervalSeconds} 
                                        onChange={e => setTempSliderConfig(prev => ({ ...prev, autoSlideIntervalSeconds: Number(e.target.value) }))}
                                        className="bg-slate-800 text-white px-4 py-2 rounded-xl border border-white/20 font-bold outline-none cursor-pointer"
                                    >
                                        <option value={3}>۳ ثانیه</option>
                                        <option value={5}>۵ ثانیه</option>
                                        <option value={8}>۸ ثانیه</option>
                                        <option value={10}>۱۰ ثانیه</option>
                                        <option value={15}>۱۵ ثانیه</option>
                                    </select>
                                </div>

                                <button 
                                    onClick={() => {
                                        if (onUpdateBannerSliderConfig) {
                                            onUpdateBannerSliderConfig(tempSliderConfig);
                                            alert('تنظیمات اسلایدر بنرها با موفقیت ذخیره شد.');
                                        }
                                    }}
                                    className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition-all shadow-lg active:scale-95"
                                >
                                    ذخیره تنظیمات
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                            <div>
                                <h4 className="text-xl font-black text-slate-800">جایگاه‌های تبلیغاتی بنری</h4>
                                <p className="text-xs font-bold text-slate-400">نمایش بنرهای تبلیغاتی در هیرو، بین آگهی‌ها، سایدبار و فوتر</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setEditingAd(null);
                                    setNewAdData({ id: '', position: 'hero', title: '', imageUrl: '', linkUrl: '', isActive: true, priority: 1 });
                                    setAdModalMode('create');
                                }}
                                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm"
                            >
                                <span className="text-xl">+</span> ایجاد بنر جدید
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {adSlots.map(slot => (
                                <div key={slot.id} className="glass-card p-8 rounded-[3.5rem] bg-white border border-slate-50 relative overflow-hidden group hover:shadow-2xl transition-all flex flex-col">
                                    <div className="aspect-video rounded-[2.5rem] overflow-hidden mb-6 border border-slate-100 relative">
                                        <img src={slot.imageUrl} className="w-full h-full object-cover" alt={slot.title} />
                                        <div className="absolute top-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black text-indigo-600 shadow-sm">
                                            {slot.position === 'hero' ? '🏠 هیرو' : slot.position === 'in-feed' ? '📰 داخل لیست' : slot.position === 'sidebar' ? '📂 سایدبار' : slot.position === 'footer' ? '🖼️ بنر فوتر' : '⚓ چسبان'}
                                        </div>
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-black text-slate-900 leading-none">{slot.title}</h3>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black ${slot.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {slot.isActive ? 'فعال' : 'غیرفعال'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">اولویت: {slot.priority}</p>
                                        <p className="text-[10px] font-bold text-indigo-500 truncate">{slot.linkUrl}</p>
                                    </div>
                                    <div className="flex gap-2 pt-6 mt-6 border-t border-slate-50">
                                        <button onClick={() => { setEditingAd(slot); setNewAdData(slot); setAdModalMode('edit'); }} className="flex-grow py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black hover:bg-indigo-700 transition-all shadow-lg">ویرایش محتوا</button>
                                        <button onClick={() => onUpdateAdSlots(adSlots.filter(s => s.id !== slot.id))} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TRUST BADGES & LICENSES MANAGEMENT */}
                    <div className="space-y-6 pt-6 border-t border-slate-200">
                        <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                            <div>
                                <h4 className="text-xl font-black text-slate-800">لوگوها و نمادهای مجوز در فوتر (اینماد، ساماندهی و...)</h4>
                                <p className="text-xs font-bold text-slate-400">مدیریت نمادهای اعتماد، پروانه کسب و لوگوهای مجوزات بخش پایین سایت</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setEditingBadge(null);
                                    setNewBadgeData({ id: '', title: '', subtitle: '', imageUrl: '', linkUrl: '#', isActive: true });
                                    setBadgeModalMode('create');
                                }}
                                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm"
                            >
                                <span className="text-xl">+</span> افزودن نماد جدید
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(trustBadges || []).map(badge => (
                                <div key={badge.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center relative group hover:shadow-xl transition-all">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 p-2 border border-slate-100 mb-4 flex items-center justify-center">
                                        <img src={badge.imageUrl} alt={badge.title} className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <h5 className="font-black text-slate-900 text-sm">{badge.title}</h5>
                                    {badge.subtitle && <p className="text-[10px] font-bold text-slate-400 mt-1">{badge.subtitle}</p>}
                                    <span className={`mt-3 px-3 py-1 rounded-full text-[9px] font-black ${badge.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {badge.isActive ? 'فعال' : 'غیرفعال'}
                                    </span>
                                    <div className="flex gap-2 w-full pt-4 mt-4 border-t border-slate-100">
                                        <button 
                                            onClick={() => {
                                                setEditingBadge(badge);
                                                setNewBadgeData(badge);
                                                setBadgeModalMode('edit');
                                            }}
                                            className="flex-grow py-2.5 bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black transition-all"
                                        >
                                            ویرایش
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (onUpdateTrustBadges) {
                                                    onUpdateTrustBadges((trustBadges || []).filter(b => b.id !== badge.id));
                                                }
                                            }}
                                            className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 text-xs transition-all"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              </Panel>
            )}

            {/* SETTINGS SECTION */}
            {activeSection === 'settings' && (
              <Panel title="تنظیمات پیکربندی مرکزی" icon="⚙️">
                <div className="flex gap-4 mb-8 border-b border-slate-200 overflow-x-auto pb-2">
                    {(['general', 'financial', 'sms', 'ai', 'database', 'categories', 'provinces'] as const).map(t => (
                        <button 
                            key={t} 
                            onClick={() => setActiveSettingsTab(t)} 
                            className={`pb-4 px-2 text-sm font-black transition-all border-b-4 whitespace-nowrap ${activeSettingsTab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                            {t === 'general' ? 'عمومی' : t === 'financial' ? 'درگاه پرداخت' : t === 'sms' ? 'پنل پیامک' : t === 'ai' ? 'هوش مصنوعی' : t === 'database' ? 'دیتابیس و لاگ‌ها 🗄️' : t === 'categories' ? 'دسته‌بندی‌ها' : 'استان‌ها و شهرها'}
                        </button>
                    ))}
                </div>
                <div className="animate-step">
                    {activeSettingsTab === 'general' && (
                        <div className="max-w-3xl space-y-10">
                            {/* SITE BRANDING & LOGO */}
                            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200/80 space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🎨</span>
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800">نام سایت، برندینگ و نشان سامانه</h4>
                                        <p className="text-xs text-slate-500">مدیریت نام سامانه، زیرعنوان، آیکون و لوگوی اختصاصی نمایش داده شده در هدر، فوتر و نسخه موبایل</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                        <label className="text-[11px] font-black text-slate-500 block mb-2 uppercase">نام سامانه (عنوان سایت)</label>
                                        <input 
                                            type="text" 
                                            value={brandingForm.siteName} 
                                            onChange={e => setBrandingForm({ ...brandingForm, siteName: e.target.value })} 
                                            className="w-full bg-slate-50 p-3.5 rounded-xl font-black text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="مثلاً: سامانه هوشمند املاک"
                                        />
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                        <label className="text-[11px] font-black text-slate-500 block mb-2 uppercase">زیرعنوان / شعار برند</label>
                                        <input 
                                            type="text" 
                                            value={brandingForm.siteSubtitle} 
                                            onChange={e => setBrandingForm({ ...brandingForm, siteSubtitle: e.target.value })} 
                                            className="w-full bg-slate-50 p-3.5 rounded-xl font-bold text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="مثلاً: جامع‌ترین پلتفرم تخصصی املاک و مستغلات"
                                        />
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                        <label className="text-[11px] font-black text-slate-500 block mb-2 uppercase">آیکون نشان (ایموجی یا نماد)</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="text" 
                                                value={brandingForm.logoIcon} 
                                                onChange={e => setBrandingForm({ ...brandingForm, logoIcon: e.target.value })} 
                                                className="w-20 text-center bg-slate-50 p-3.5 rounded-xl font-black text-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                {['🏢', '🏠', '🏛️', '🏙️', '🏡', '🔑', '📍', '⭐'].map(ico => (
                                                    <button 
                                                        key={ico} 
                                                        type="button" 
                                                        onClick={() => setBrandingForm({ ...brandingForm, logoIcon: ico })}
                                                        className={`w-9 h-9 rounded-xl border text-base flex items-center justify-center transition-all ${brandingForm.logoIcon === ico ? 'border-indigo-600 bg-indigo-50 scale-110 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                                                    >
                                                        {ico}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                        <label className="text-[11px] font-black text-slate-500 block mb-2 uppercase">لینک تصویر اختصاصی لوگو (اختیاری)</label>
                                        <input 
                                            type="text" 
                                            value={brandingForm.logoUrl || ''} 
                                            onChange={e => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })} 
                                            className="w-full bg-slate-50 p-3.5 rounded-xl font-mono text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="https://... یا /logo.png"
                                            dir="ltr"
                                        />
                                    </div>

                                    <div className="col-span-full bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-black text-slate-800 block">هدایت خودکار کاربران موبایل به نسخه برنامه وب (PWA)</label>
                                            <p className="text-xs text-slate-500 mt-1">با فعال بودن این گزینه، کاربرانی که با گوشی همراه یا تبلت وارد می‌شوند به صورت خودکار به محیط استاندارد اپلیکیشن (PWA) هدایت می‌شوند.</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={brandingForm.autoRedirectToPwa ?? true} 
                                            onChange={e => setBrandingForm({ ...brandingForm, autoRedirectToPwa: e.target.checked })} 
                                            className="w-6 h-6 rounded cursor-pointer accent-indigo-600"
                                        />
                                    </div>

                                    {/* Session Security & Auto-Logout */}
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        <label className="text-xs font-black text-slate-800 block mb-1">
                                            ⏱️ مدت زمان خروج خودکار در صورت عدم فعالیت (دقیقه)
                                        </label>
                                        <p className="text-[11px] text-slate-500 mb-3">
                                            به جهت حفظ امنیت، در صورت عدم فعالیت کاربر بعد از این مدت، نشست به طور خودکار خاتمه می‌یابد.
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="120"
                                                value={brandingForm.sessionTimeoutMinutes ?? 10} 
                                                onChange={e => setBrandingForm({ ...brandingForm, sessionTimeoutMinutes: Number(e.target.value) || 10 })} 
                                                className="w-32 bg-white p-3 rounded-xl font-black text-center text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                            />
                                            <span className="text-xs font-bold text-slate-600">دقیقه</span>
                                        </div>
                                    </div>

                                    {/* Active Users Counter Base */}
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        <label className="text-xs font-black text-slate-800 block mb-1">
                                            👥 پایه شمارنده زنده کاربران فعال امروز
                                        </label>
                                        <p className="text-[11px] text-slate-500 mb-3">
                                            تعداد پایه نمایش داده شده در صفحه اصلی همراه با محاسبه پویای بازدیدهای لحظه‌ای.
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number" 
                                                min="100" 
                                                value={brandingForm.activeUsersCountBase ?? 1200} 
                                                onChange={e => setBrandingForm({ ...brandingForm, activeUsersCountBase: Number(e.target.value) || 1200 })} 
                                                className="w-32 bg-white p-3 rounded-xl font-black text-center text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                            />
                                            <span className="text-xs font-bold text-slate-600">کاربر فعال</span>
                                        </div>
                                    </div>

                                    {/* Password Security Policy */}
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <label className="text-sm font-black text-slate-800 block mb-1">
                                                    🔐 سیاست‌های تعیین رمز عبور کاربران (Password Policy)
                                                </label>
                                                <p className="text-xs text-slate-500">
                                                    قوانین امنیتی جهت ثبت‌نام و تغییر رمز عبور کاربران را بر اساس سیاست‌های سامانه تنظیم نمایید.
                                                </p>
                                            </div>
                                            <span className="self-start sm:self-auto px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg">
                                                اعمال خودکار در فرم ثبت‌نام
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                                            {/* Min Length */}
                                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                <label className="text-[11px] font-black text-slate-500 block mb-1.5">
                                                    حداقل طول رمز عبور (کاراکتر)
                                                </label>
                                                <input 
                                                    type="number" 
                                                    min="4" 
                                                    max="20"
                                                    value={brandingForm.passwordPolicy?.minLength ?? 6}
                                                    onChange={e => setBrandingForm({
                                                        ...brandingForm,
                                                        passwordPolicy: {
                                                            minLength: Number(e.target.value) || 6,
                                                            requireNumbers: brandingForm.passwordPolicy?.requireNumbers ?? true,
                                                            requireLetters: brandingForm.passwordPolicy?.requireLetters ?? true,
                                                            requireUppercase: brandingForm.passwordPolicy?.requireUppercase ?? false,
                                                            requireSpecialChars: brandingForm.passwordPolicy?.requireSpecialChars ?? false,
                                                            maxFailedAttempts: brandingForm.passwordPolicy?.maxFailedAttempts ?? 5
                                                        }
                                                    })}
                                                    className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-center text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>

                                            {/* Require Numbers */}
                                            <label className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                                <input 
                                                    type="checkbox"
                                                    checked={brandingForm.passwordPolicy?.requireNumbers ?? true}
                                                    onChange={e => setBrandingForm({
                                                        ...brandingForm,
                                                        passwordPolicy: {
                                                            minLength: brandingForm.passwordPolicy?.minLength ?? 6,
                                                            requireNumbers: e.target.checked,
                                                            requireLetters: brandingForm.passwordPolicy?.requireLetters ?? true,
                                                            requireUppercase: brandingForm.passwordPolicy?.requireUppercase ?? false,
                                                            requireSpecialChars: brandingForm.passwordPolicy?.requireSpecialChars ?? false,
                                                            maxFailedAttempts: brandingForm.passwordPolicy?.maxFailedAttempts ?? 5
                                                        }
                                                    })}
                                                    className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                                                />
                                                <div>
                                                    <span className="text-xs font-black text-slate-800 block">شامل ارقام (0-9)</span>
                                                    <span className="text-[10px] text-slate-400">وجود حداقل یک عدد</span>
                                                </div>
                                            </label>

                                            {/* Require Letters */}
                                            <label className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                                <input 
                                                    type="checkbox"
                                                    checked={brandingForm.passwordPolicy?.requireLetters ?? true}
                                                    onChange={e => setBrandingForm({
                                                        ...brandingForm,
                                                        passwordPolicy: {
                                                            minLength: brandingForm.passwordPolicy?.minLength ?? 6,
                                                            requireNumbers: brandingForm.passwordPolicy?.requireNumbers ?? true,
                                                            requireLetters: e.target.checked,
                                                            requireUppercase: brandingForm.passwordPolicy?.requireUppercase ?? false,
                                                            requireSpecialChars: brandingForm.passwordPolicy?.requireSpecialChars ?? false,
                                                            maxFailedAttempts: brandingForm.passwordPolicy?.maxFailedAttempts ?? 5
                                                        }
                                                    })}
                                                    className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                                                />
                                                <div>
                                                    <span className="text-xs font-black text-slate-800 block">شامل حروف</span>
                                                    <span className="text-[10px] text-slate-400">حروف انگلیسی یا فارسی</span>
                                                </div>
                                            </label>

                                            {/* Require Uppercase */}
                                            <label className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                                <input 
                                                    type="checkbox"
                                                    checked={brandingForm.passwordPolicy?.requireUppercase ?? false}
                                                    onChange={e => setBrandingForm({
                                                        ...brandingForm,
                                                        passwordPolicy: {
                                                            minLength: brandingForm.passwordPolicy?.minLength ?? 6,
                                                            requireNumbers: brandingForm.passwordPolicy?.requireNumbers ?? true,
                                                            requireLetters: brandingForm.passwordPolicy?.requireLetters ?? true,
                                                            requireUppercase: e.target.checked,
                                                            requireSpecialChars: brandingForm.passwordPolicy?.requireSpecialChars ?? false,
                                                            maxFailedAttempts: brandingForm.passwordPolicy?.maxFailedAttempts ?? 5
                                                        }
                                                    })}
                                                    className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                                                />
                                                <div>
                                                    <span className="text-xs font-black text-slate-800 block">حرف بزرگ انگلیسی (A-Z)</span>
                                                    <span className="text-[10px] text-slate-400">حداقل یک حرف بزرگ</span>
                                                </div>
                                            </label>

                                            {/* Require Special Chars */}
                                            <label className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                                <input 
                                                    type="checkbox"
                                                    checked={brandingForm.passwordPolicy?.requireSpecialChars ?? false}
                                                    onChange={e => setBrandingForm({
                                                        ...brandingForm,
                                                        passwordPolicy: {
                                                            minLength: brandingForm.passwordPolicy?.minLength ?? 6,
                                                            requireNumbers: brandingForm.passwordPolicy?.requireNumbers ?? true,
                                                            requireLetters: brandingForm.passwordPolicy?.requireLetters ?? true,
                                                            requireUppercase: brandingForm.passwordPolicy?.requireUppercase ?? false,
                                                            requireSpecialChars: e.target.checked,
                                                            maxFailedAttempts: brandingForm.passwordPolicy?.maxFailedAttempts ?? 5
                                                        }
                                                    })}
                                                    className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                                                />
                                                <div>
                                                    <span className="text-xs font-black text-slate-800 block">کاراکتر خاص (!@#$)</span>
                                                    <span className="text-[10px] text-slate-400">علامت‌های نگارشی و ویژه</span>
                                                </div>
                                            </label>

                                            {/* Max Failed Attempts */}
                                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                <label className="text-[11px] font-black text-slate-500 block mb-1.5">
                                                    حداکثر دفعات تلاش ناموفق
                                                </label>
                                                <input 
                                                    type="number" 
                                                    min="3" 
                                                    max="15"
                                                    value={brandingForm.passwordPolicy?.maxFailedAttempts ?? 5}
                                                    onChange={e => setBrandingForm({
                                                        ...brandingForm,
                                                        passwordPolicy: {
                                                            minLength: brandingForm.passwordPolicy?.minLength ?? 6,
                                                            requireNumbers: brandingForm.passwordPolicy?.requireNumbers ?? true,
                                                            requireLetters: brandingForm.passwordPolicy?.requireLetters ?? true,
                                                            requireUppercase: brandingForm.passwordPolicy?.requireUppercase ?? false,
                                                            requireSpecialChars: brandingForm.passwordPolicy?.requireSpecialChars ?? false,
                                                            maxFailedAttempts: Number(e.target.value) || 5
                                                        }
                                                    })}
                                                    className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-center text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (onUpdateSiteBranding) {
                                                onUpdateSiteBranding(brandingForm);
                                            }
                                            setBrandingSaveSuccess(true);
                                            setTimeout(() => setBrandingSaveSuccess(false), 3500);
                                        }}
                                        className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-md transition-all active:scale-95"
                                    >
                                        💾 ذخیره تنظیمات نام، امنیت و برند سایت
                                    </button>
                                    {brandingSaveSuccess && (
                                        <span className="text-emerald-600 font-bold text-xs animate-fade-in">✓ تنظیمات نام، امنیت و سیاست رمز عبور با موفقیت ذخیره شد!</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-black text-slate-800 mb-2">تنظیمات انقضای آگهی</h4>
                                <p className="text-xs text-slate-500 mb-6">این تنظیمات مشخص می‌کند که آگهی‌های عادی و ویژه پس از چه مدتی منقضی شوند.</p>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-slate-50 p-6 rounded-2xl">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">انقضای آگهی عادی (روز)</label>
                                        <input type="number" value={tempExpiration.defaultLifetimeDays} onChange={e => setTempExpiration({...tempExpiration, defaultLifetimeDays: Number(e.target.value)})} className="w-full bg-white p-4 rounded-xl font-bold text-lg" />
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-2xl">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">اقدام پس از انقضا</label>
                                        <select value={tempExpiration.expiryAction} onChange={e => setTempExpiration({...tempExpiration, expiryAction: e.target.value as any})} className="w-full bg-white p-4 rounded-xl font-bold text-lg">
                                            <option value="archive">آرشیو کردن</option>
                                            <option value="delete">حذف کامل</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 bg-slate-50 p-6 rounded-2xl flex items-center justify-between border border-slate-200">
                                        <div>
                                            <label className="text-sm font-black text-slate-800 block">تایید خودکار آگهی‌های ثبت شده</label>
                                            <p className="text-xs text-slate-500 font-bold">در صورت فعال‌بودن، آگهی‌های جدید کاربران بلافاصله پس از ثبت منتشر می‌شوند و نیاز به تایید دستی نخواهند داشت.</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={tempExpiration.autoApproveListings || false} 
                                            onChange={e => setTempExpiration({...tempExpiration, autoApproveListings: e.target.checked})}
                                            className="w-6 h-6 rounded cursor-pointer accent-indigo-600"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => onUpdateExpiration(tempExpiration)} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg mb-10">ذخیره تنظیمات عمومی</button>
                            
                            <div className="pt-8 border-t border-slate-200">
                                <h4 className="text-lg font-black text-slate-800 mb-2">تغییر رمز عبور مدیریت</h4>
                                <p className="text-xs text-slate-500 mb-6">رمز عبور جدید برای ورود به پنل مدیریت را وارد کنید.</p>
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-2xl">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">رمز عبور جدید</label>
                                        <input type="password" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} className="w-full bg-white p-4 rounded-xl font-bold text-lg" dir="ltr" placeholder="••••••••" />
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            if (newAdminPassword.length < 4) {
                                                setAdminPasswordMsg('رمز عبور باید حداقل 4 کاراکتر باشد');
                                                return;
                                            }
                                            const hash = await hashPassword(newAdminPassword);
                                            onUpdateAdminCredentials('admin', hash);
                                            setNewAdminPassword('');
                                            setAdminPasswordMsg('رمز عبور با موفقیت تغییر کرد.');
                                            setTimeout(() => setAdminPasswordMsg(''), 3000);
                                        }}
                                        className="px-12 py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-colors"
                                    >
                                        بروزرسانی رمز عبور
                                    </button>
                                    {adminPasswordMsg && <p className={`text-sm font-bold mt-2 ${adminPasswordMsg.includes('موفقیت') ? 'text-emerald-500' : 'text-rose-500'}`}>{adminPasswordMsg}</p>}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSettingsTab === 'financial' && (
                        <div className="max-w-3xl space-y-12">
                            {/* ZarinPal Gateway */}
                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                                <div>
                                    <h4 className="text-lg font-black text-slate-800 mb-1">پیکربندی درگاه زرین‌پال (آنلاین)</h4>
                                    <p className="text-xs text-slate-500">اطلاعات مربوط به حساب کاربری زرین‌پال خود را برای پرداخت‌های آنی وارد کنید.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">کد مرچنت (Merchant ID)</label>
                                        <input type="text" value={tempZarinPal.merchantId} onChange={e => setTempZarinPal({...tempZarinPal, merchantId: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-base tracking-widest border border-slate-200" />
                                    </div>
                                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100">
                                        <input type="checkbox" id="sandbox" checked={tempZarinPal.isSandbox} onChange={e => setTempZarinPal({...tempZarinPal, isSandbox: e.target.checked})} className="w-5 h-5 rounded" />
                                        <label htmlFor="sandbox" className="font-bold text-slate-700 text-xs cursor-pointer">فعالسازی حالت آزمایشی (Sandbox)</label>
                                    </div>
                                </div>
                                <button onClick={() => onUpdateZarinPal(tempZarinPal)} className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all">ذخیره تنظیمات زرین‌پال</button>
                            </div>

                            {/* Card to Card Config */}
                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800 mb-1">پیکربندی پرداخت کارت به کارت</h4>
                                        <p className="text-xs text-slate-500">مشخصات حساب بانکی جهت دریافت فیش واریز از کاربران</p>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                                        <input 
                                            type="checkbox" 
                                            checked={tempCardPayment.isEnabled} 
                                            onChange={e => setTempCardPayment({ ...tempCardPayment, isEnabled: e.target.checked })} 
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="text-xs font-bold text-slate-700">فعال بودن</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">نام بانک</label>
                                        <input type="text" value={tempCardPayment.bankName} onChange={e => setTempCardPayment({ ...tempCardPayment, bankName: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm border border-slate-200" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">شماره کارت (16 رقمی)</label>
                                        <input type="text" value={tempCardPayment.cardNumber} onChange={e => setTempCardPayment({ ...tempCardPayment, cardNumber: e.target.value })} dir="ltr" className="w-full bg-slate-50 p-3 rounded-xl font-mono text-sm border border-slate-200" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">نام صاحب حساب</label>
                                        <input type="text" value={tempCardPayment.accountHolder} onChange={e => setTempCardPayment({ ...tempCardPayment, accountHolder: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm border border-slate-200" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">شماره شبا (IBAN)</label>
                                        <input type="text" value={tempCardPayment.iban} onChange={e => setTempCardPayment({ ...tempCardPayment, iban: e.target.value })} dir="ltr" className="w-full bg-slate-50 p-3 rounded-xl font-mono text-xs border border-slate-200" />
                                    </div>
                                </div>

                                <button 
                                    onClick={() => {
                                        if (onUpdateCardPayment) onUpdateCardPayment(tempCardPayment);
                                        setCardSaveSuccess(true);
                                        setTimeout(() => setCardSaveSuccess(false), 3000);
                                    }} 
                                    className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg hover:bg-blue-700 transition-all"
                                >
                                    ذخیره تنظیمات کارت به کارت
                                </button>
                                {cardSaveSuccess && <p className="text-xs font-black text-emerald-600 mt-2">✓ تنظیمات با موفقیت ذخیره شد!</p>}
                            </div>
                        </div>
                    )}
                    {activeSettingsTab === 'sms' && (
                        <div className="max-w-2xl space-y-8">
                            <div>
                                <h4 className="text-lg font-black text-slate-800 mb-2">پیکربندی پنل ملی‌پیامک</h4>
                                <p className="text-xs text-slate-500 mb-6">اطلاعات ورود به پنل پیامکی خود را برای ارسال نوتیفیکیشن‌ها وارد کنید.</p>
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-2xl">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">نام کاربری</label>
                                        <input type="text" value={tempMeliPayamak.username} onChange={e => setTempMeliPayamak({...tempMeliPayamak, username: e.target.value})} className="w-full bg-white p-4 rounded-xl font-bold text-lg" />
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-2xl">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">رمز عبور</label>
                                        <input type="password" value={tempMeliPayamak.password} onChange={e => setTempMeliPayamak({...tempMeliPayamak, password: e.target.value})} className="w-full bg-white p-4 rounded-xl font-bold text-lg" />
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-2xl">
                                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase">شماره فرستنده</label>
                                        <input type="text" value={tempMeliPayamak.senderNumber} onChange={e => setTempMeliPayamak({...tempMeliPayamak, senderNumber: e.target.value})} className="w-full bg-white p-4 rounded-xl font-bold text-lg" />
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                                        <h5 className="font-black text-slate-800 text-sm mb-4">رویدادهای ارسال پیامک</h5>
                                        {[
                                            { key: 'otpLogin', label: 'ورود با رمز یکبار مصرف' },
                                            { key: 'adStatus', label: 'تغییر وضعیت آگهی' },
                                            { key: 'newMessage', label: 'ارسال پیام جدید در چت' },
                                            { key: 'purchaseStatus', label: 'وضعیت خرید / ارتقا آگهی' },
                                            { key: 'loginAlert', label: 'هشدار ورود به حساب' },
                                            { key: 'welcomeMessage', label: 'پیامک خوش‌آمدگویی' },
                                            { key: 'passwordRecovery', label: 'بازیابی رمز عبور' },
                                        ].map((event) => (
                                            <div key={event.key} className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id={`sms-event-${event.key}`}
                                                    checked={tempMeliPayamak.events?.[event.key as keyof typeof tempMeliPayamak.events] ?? true}
                                                    onChange={e => setTempMeliPayamak({
                                                        ...tempMeliPayamak,
                                                        events: {
                                                            ...tempMeliPayamak.events,
                                                            [event.key]: e.target.checked
                                                        }
                                                    })}
                                                    className="w-5 h-5 rounded"
                                                />
                                                <label htmlFor={`sms-event-${event.key}`} className="text-sm font-bold text-slate-700 cursor-pointer">{event.label}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center gap-6">
                                 <button 
                                     onClick={() => {
                                         onUpdateMeliPayamak(tempMeliPayamak);
                                         setSmsSaveSuccess(true);
                                         setTimeout(() => setSmsSaveSuccess(false), 3000);
                                     }} 
                                     className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg transition-colors"
                                 >
                                     ذخیره تنظیمات پیامک
                                 </button>
                                 {smsSaveSuccess && (
                                     <span className="text-emerald-500 font-black text-sm animate-pulse">✓ تنظیمات پنل ملی‌پیامک با موفقیت ذخیره شد!</span>
                                 )}
                             </div>
                        </div>
                    )}
                    {activeSettingsTab === 'ai' && (
                        <div className="max-w-3xl space-y-8 animate-fade-in">
                            <div>
                                <h4 className="text-xl font-black text-slate-800 mb-2">تنظیمات هوش مصنوعی (AI Engine Settings)</h4>
                                <p className="text-xs text-slate-500 mb-6">
                                    پلتفرم هوش مصنوعی از دو روش پشتیبانی می‌کند: کلید مستقیم <strong>Google Gemini</strong> یا سرویس‌های سازگار با <strong>OpenAI (پارس‌پک، OpenRouter و ...)</strong>. تمام درخواست‌ها از طریق پروکسی ایمن سرور هدایت شده و بدون خطای CORS کار می‌کنند.
                                </p>
                                
                                <div className="space-y-6">
                                    {/* Provider Quick Presets */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setTempAiConfig(prev => ({
                                                ...prev,
                                                baseUrl: '',
                                                selectedModel: 'gemini-3.8-flash'
                                            }))}
                                            className={`p-5 rounded-2xl border text-right transition-all ${
                                                !tempAiConfig.baseUrl ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="text-xl block mb-1">✨</span>
                                            <span className="font-black text-slate-800 text-sm block">گوگل جمینای (Google Gemini)</span>
                                            <span className="text-[11px] text-slate-500 mt-1 block">استفاده مستقیم از مدل‌های Gemini 3.8 Flash و Gemini 3.6 Flash با دقت و سرعت فوق‌العاده بالا</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTempAiConfig(prev => ({
                                                ...prev,
                                                baseUrl: 'https://my.parspack.com/api/aistudio/api/v1',
                                                selectedModel: prev.selectedModel || 'gpt-4o-mini'
                                            }))}
                                            className={`p-5 rounded-2xl border text-right transition-all ${
                                                tempAiConfig.baseUrl ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="text-xl block mb-1">⚡</span>
                                            <span className="font-black text-slate-800 text-sm block">پارس‌پک / OpenAI Compatible</span>
                                            <span className="text-[11px] text-slate-500 mt-1 block">پشتیبانی از ارائه‌دهندگان ایرانی و بین‌المللی با پروتکل استاندارد Chat Completions</span>
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
                                        <div>
                                            <label className="text-[11px] font-black text-slate-500 block mb-2 uppercase">کلید دسترسی هوش مصنوعی (API Key)</label>
                                            <input 
                                                type="password" 
                                                value={tempAiConfig.apiKey} 
                                                onChange={e => setTempAiConfig({...tempAiConfig, apiKey: e.target.value})} 
                                                placeholder="کلید API خود را اینجا وارد کنید (مانند AIzaSy... یا sk-...)"
                                                className="w-full bg-white p-4 rounded-xl font-mono text-sm tracking-wider border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none" 
                                            />
                                            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                                                کلید شما بر روی سرور محافظت شده و به مرورگر بازدیدکنندگان نشان داده نمی‌شود.
                                            </p>
                                        </div>

                                        {tempAiConfig.baseUrl !== '' && (
                                            <div>
                                                <label className="text-[11px] font-black text-slate-500 block mb-2 uppercase">آدرس سرور پایه (Base URL)</label>
                                                <input 
                                                    type="text" 
                                                    value={tempAiConfig.baseUrl} 
                                                    onChange={e => setTempAiConfig({...tempAiConfig, baseUrl: e.target.value})} 
                                                    placeholder="https://my.parspack.com/api/aistudio/api/v1"
                                                    className="w-full bg-white p-4 rounded-xl font-mono text-sm text-left border border-slate-200 focus:border-indigo-500 outline-none"
                                                    dir="ltr"
                                                />
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                            <button 
                                                type="button"
                                                onClick={async () => {
                                                    setIsFetchingModels(true);
                                                    try {
                                                        const models = await fetchModels(tempAiConfig.baseUrl, tempAiConfig.apiKey);
                                                        setAvailableModels(models);
                                                        if (models.length > 0 && (!tempAiConfig.selectedModel || tempAiConfig.selectedModel.startsWith('gemini-') && tempAiConfig.baseUrl)) {
                                                            setTempAiConfig(prev => ({ ...prev, selectedModel: models[0].id }));
                                                        }
                                                    } catch(e: any) {
                                                        console.error(e);
                                                    } finally {
                                                        setIsFetchingModels(false);
                                                    }
                                                }}
                                                className="px-6 py-3.5 bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors hover:bg-slate-900 flex items-center justify-center gap-2"
                                            >
                                                {isFetchingModels ? 'در حال دریافت مدل‌ها...' : `🔄 دریافت فهرست مدل‌ها ${availableModels.length > 0 ? `(${availableModels.length} مدل)` : ''}`}
                                            </button>

                                            <button 
                                                type="button"
                                                onClick={handleTestAiPrompt}
                                                disabled={isTestingAi}
                                                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {isTestingAi ? 'در حال ارسال پیام آزمایشی...' : '💬 تست زنده مکالمه با هوش مصنوعی'}
                                            </button>
                                        </div>

                                        {aiTestResult && (
                                            <div className={`p-4 rounded-xl text-xs font-bold leading-relaxed border ${
                                                aiTestResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                                            }`}>
                                                <div className="font-black mb-1">{aiTestResult.success ? '✅ پاسخ دریافت شده از هوش مصنوعی:' : '❌ خطای اتصال:'}</div>
                                                <div className="whitespace-pre-wrap">{aiTestResult.text}</div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[11px] font-black text-slate-500 uppercase">انتخاب مدل فعال</label>
                                            {availableModels.length > 0 && (
                                                <span className="text-[11px] font-bold text-emerald-600">{availableModels.length} مدل شناسایی شد</span>
                                            )}
                                        </div>
                                        <select 
                                            value={tempAiConfig.selectedModel} 
                                            onChange={e => setTempAiConfig({...tempAiConfig, selectedModel: e.target.value})} 
                                            className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-200 outline-none"
                                        >
                                            <optgroup label="مدل‌های رسمی Google Gemini">
                                                <option value="gemini-3.8-flash">Gemini 3.8 Flash (پیشنهاد شده - فوق‌العاده سریع و هوشمند)</option>
                                                <option value="gemini-3.6-flash">Gemini 3.6 Flash (نسخه رسمی مدرن)</option>
                                                <option value="gemini-flash-latest">Gemini Flash Latest</option>
                                                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (فوق‌العاده کم‌مصرف و سریع)</option>
                                            </optgroup>
                                            {tempAiConfig.baseUrl && (
                                                <optgroup label="مدل‌های رایج OpenAI و سازگار">
                                                    <option value="gpt-4o-mini">GPT-4o Mini (سریع و اقتصادی)</option>
                                                    <option value="gpt-4o">GPT-4o (قدرتمند و همه‌منظوره)</option>
                                                    <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                                                    <option value="deepseek-reasoner">DeepSeek Reasoner (R1)</option>
                                                </optgroup>
                                            )}
                                            {availableModels.filter((m: any) => !['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gpt-4o-mini', 'gpt-4o', 'deepseek-chat', 'deepseek-reasoner'].includes(m.id)).length > 0 && (
                                                <optgroup label="مدل‌های دریافت شده از سرور شما">
                                                    {availableModels.filter((m: any) => !['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gpt-4o-mini', 'gpt-4o', 'deepseek-chat', 'deepseek-reasoner'].includes(m.id)).map((m: any) => (
                                                        <option key={m.id} value={m.id}>{m.name || m.id}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
                                        <label className="text-[11px] font-black text-slate-500 block mb-2 uppercase">دستورالعمل سامانه (System Instruction)</label>
                                        <textarea 
                                            value={tempAiConfig.systemInstruction} 
                                            onChange={e => setTempAiConfig({...tempAiConfig, systemInstruction: e.target.value})} 
                                            rows={4}
                                            className="w-full bg-white p-4 rounded-xl font-bold text-sm leading-relaxed border border-slate-200 outline-none"
                                            placeholder="شخصیت، لحن یا دستورالعمل‌های خاص هوش مصنوعی در تولید توضیحات آگهی..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                                <button 
                                    onClick={async () => {
                                        await saveAiConfig(tempAiConfig);
                                        setAiSaveSuccess(true);
                                        setTimeout(() => setAiSaveSuccess(false), 3000);
                                    }} 
                                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg transition-colors"
                                >
                                    💾 ذخیره تنظیمات هوش مصنوعی
                                </button>
                                {aiSaveSuccess && (
                                    <span className="text-emerald-500 font-black text-sm animate-pulse">✓ تنظیمات هوش مصنوعی با موفقیت ذخیره شد!</span>
                                )}
                            </div>
                        </div>
                    )}
                    {activeSettingsTab === 'database' && (
                        <div className="space-y-8 max-w-4xl animate-fade-in">
                            {/* Current Mode Badge and Status */}
                            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`w-3.5 h-3.5 rounded-full ${dbConnected || dbStats?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                                        <h4 className="text-xl font-black text-slate-800">
                                            {dbConnected || dbStats?.connected ? 'پایگاه داده MySQL متصل و فعال است 🟢' : 'حافظه محلی متصل و فعال است (Local JSON Store) 🟡'}
                                        </h4>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500">
                                        در این بخش می‌توانید مشخص کنید داده‌های سامانه در پایگاه داده MySQL ذخیره شوند یا در حافظه محلی مستقل سرور.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={fetchDbLogs} 
                                        disabled={isFetchingDbLogs}
                                        className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
                                    >
                                        {isFetchingDbLogs ? 'در حال دریافت...' : '🔄 بازخوانی آمار'}
                                    </button>
                                </div>
                            </div>

                            {/* Mode Selection Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-6 rounded-3xl border transition-all ${
                                    (dbConnected || dbStats?.connected) ? 'border-emerald-500 bg-emerald-50/40 shadow-sm' : 'border-slate-200 bg-white'
                                }`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-2xl">🐬</span>
                                        {(dbConnected || dbStats?.connected) && (
                                            <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full">حالت فعال فعلی</span>
                                        )}
                                    </div>
                                    <h5 className="font-black text-slate-800 text-base mb-1">پایگاه داده MySQL</h5>
                                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                        ذخیره‌سازی با مقیاس‌پذیری بالا، جداول رابطه‌ای، مناسب برای هاست‌های سی‌پنل، دایرکت‌ادمین و سرورهای ابری.
                                    </p>
                                </div>

                                <div className={`p-6 rounded-3xl border transition-all ${
                                    !(dbConnected || dbStats?.connected) ? 'border-amber-500 bg-amber-50/40 shadow-sm' : 'border-slate-200 bg-white'
                                }`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-2xl">📁</span>
                                        {!(dbConnected || dbStats?.connected) && (
                                            <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full">حالت فعال فعلی</span>
                                        )}
                                    </div>
                                    <h5 className="font-black text-slate-800 text-base mb-1">حافظه فایلی محلی (Local Store)</h5>
                                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                        فعالیت مستقل بر روی سرور بدون نیاز به نصب یا پیکربندی MySQL، مناسب آزمایش، محیط‌های توسعه و راه‌اندازی سریع.
                                    </p>
                                    {(dbConnected || dbStats?.connected) && (
                                        <button
                                            type="button"
                                            onClick={handleSwitchToLocalStore}
                                            disabled={isSavingDb}
                                            className="px-4 py-2 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-xl text-xs font-black transition-colors"
                                        >
                                            سوئیچ به حالت محلی (قطع اتصال دیتابیس)
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Database Configuration Form */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm">
                                <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <span>⚙️</span>
                                    <span>تنظیمات و اطلاعات اتصال MySQL</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 block mb-2">هاست سرور (Host)</label>
                                        <input
                                            type="text"
                                            value={dbConfigForm.host}
                                            onChange={e => setDbConfigForm({...dbConfigForm, host: e.target.value})}
                                            placeholder="localhost یا آدرس آی‌پی"
                                            className="w-full bg-slate-50 p-4 rounded-xl font-mono text-sm border border-slate-200 outline-none focus:border-indigo-500"
                                            dir="ltr"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 block mb-2">پورت اتصال (Port)</label>
                                        <input
                                            type="number"
                                            value={dbConfigForm.port}
                                            onChange={e => setDbConfigForm({...dbConfigForm, port: parseInt(e.target.value) || 3306})}
                                            placeholder="3306"
                                            className="w-full bg-slate-50 p-4 rounded-xl font-mono text-sm border border-slate-200 outline-none focus:border-indigo-500"
                                            dir="ltr"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 block mb-2">نام کاربری دیتابیس (User)</label>
                                        <input
                                            type="text"
                                            value={dbConfigForm.user}
                                            onChange={e => setDbConfigForm({...dbConfigForm, user: e.target.value})}
                                            placeholder="root"
                                            className="w-full bg-slate-50 p-4 rounded-xl font-mono text-sm border border-slate-200 outline-none focus:border-indigo-500"
                                            dir="ltr"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 block mb-2">رمز عبور دیتابیس (Password)</label>
                                        <input
                                            type="password"
                                            value={dbConfigForm.password}
                                            onChange={e => setDbConfigForm({...dbConfigForm, password: e.target.value})}
                                            placeholder="رمز عبور دیتابیس"
                                            className="w-full bg-slate-50 p-4 rounded-xl font-mono text-sm border border-slate-200 outline-none focus:border-indigo-500"
                                            dir="ltr"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="text-[11px] font-black text-slate-500 block mb-2">نام پایگاه داده (Database Name)</label>
                                        <input
                                            type="text"
                                            value={dbConfigForm.database}
                                            onChange={e => setDbConfigForm({...dbConfigForm, database: e.target.value})}
                                            placeholder="hoome24_db"
                                            className="w-full bg-slate-50 p-4 rounded-xl font-mono text-sm border border-slate-200 outline-none focus:border-indigo-500"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>

                                {dbTestResult && (
                                    <div className={`p-4 rounded-2xl text-xs font-bold leading-relaxed border ${
                                        dbTestResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}>
                                        {dbTestResult.message}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-4 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleTestDbConnection}
                                        disabled={isTestingDb}
                                        className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs transition-colors flex items-center gap-2"
                                    >
                                        {isTestingDb ? 'در حال آزمون ارتباط...' : '🔍 تست اتصال به MySQL'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleInstallOrConnectDb}
                                        disabled={isSavingDb}
                                        className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg transition-colors flex items-center gap-2"
                                    >
                                        {isSavingDb ? 'در حال نصب و اتصال...' : '🚀 ذخیره تنظیمات و فعال‌سازی MySQL'}
                                    </button>
                                </div>
                            </div>

                            {/* Data Migration & Synchronization Tool */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm">
                                <div>
                                    <h4 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-1">
                                        <span>🔄</span>
                                        <span>انتقال و همگام‌سازی اطلاعات (Data Sync Tool)</span>
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        انتقال کامل آگهی‌ها، فیش‌ها، کاربران و تنظیمات بین حافظه محلی و پایگاه داده MySQL با یک کلیک.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleSyncData('local-to-mysql')}
                                        disabled={isSyncingDb || !(dbConnected || dbStats?.connected)}
                                        className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 text-right transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="text-lg block mb-1">📤 Local ➔ MySQL</span>
                                        <span className="font-black text-indigo-900 text-sm block mb-1">ارسال داده‌های محلی به دیتابیس MySQL</span>
                                        <span className="text-[11px] text-slate-500 block">تمام آگهی‌ها و اطلاعات ثبت‌شده در سیستم محلی را به دیتابیس منتقل می‌کند.</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSyncData('mysql-to-local')}
                                        disabled={isSyncingDb || !(dbConnected || dbStats?.connected)}
                                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-right transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="text-lg block mb-1">📥 MySQL ➔ Local</span>
                                        <span className="font-black text-slate-800 text-sm block mb-1">پشتیبان‌گیری از MySQL به حافظه محلی</span>
                                        <span className="text-[11px] text-slate-500 block">کل اطلاعات موجود در دیتابیس را به عنوان پشتیبان در حافظه فایلی ذخیره می‌کند.</span>
                                    </button>
                                </div>

                                {isSyncingDb && (
                                    <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs font-bold animate-pulse">
                                        در حال انتقال و همگام‌سازی اطلاعات... لطفاً صبر کنید.
                                    </div>
                                )}
                                {dbSyncMsg && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                                        {dbSyncMsg}
                                    </div>
                                )}
                            </div>

                            {/* Table Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-6 bg-white rounded-3xl border border-slate-100 text-center shadow-sm">
                                    <span className="text-2xl block mb-1">🏢</span>
                                    <span className="text-[10px] font-black text-slate-400 block mb-1">آگهی‌ها</span>
                                    <span className="text-2xl font-black text-indigo-600">{dbStats?.tableCounts?.listings ?? listings.length}</span>
                                </div>
                                <div className="p-6 bg-white rounded-3xl border border-slate-100 text-center shadow-sm">
                                    <span className="text-2xl block mb-1">👥</span>
                                    <span className="text-[10px] font-black text-slate-400 block mb-1">تعداد کاربران</span>
                                    <span className="text-2xl font-black text-emerald-600">{dbStats?.tableCounts?.users ?? users.length}</span>
                                </div>
                                <div className="p-6 bg-white rounded-3xl border border-slate-100 text-center shadow-sm">
                                    <span className="text-2xl block mb-1">💳</span>
                                    <span className="text-[10px] font-black text-slate-400 block mb-1">فیش‌های کارت به کارت</span>
                                    <span className="text-2xl font-black text-blue-600">{dbStats?.tableCounts?.paymentReceipts ?? paymentReceipts.length}</span>
                                </div>
                                <div className="p-6 bg-white rounded-3xl border border-slate-100 text-center shadow-sm">
                                    <span className="text-2xl block mb-1">💬</span>
                                    <span className="text-[10px] font-black text-slate-400 block mb-1">گفتگوها</span>
                                    <span className="text-2xl font-black text-purple-600">{dbStats?.tableCounts?.conversations ?? conversations.length}</span>
                                </div>
                            </div>

                            {/* Real-time DB Logs */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800">لاگ‌های زنده عملیات دیتابیس (Database Audit Logs)</h4>
                                        <p className="text-xs text-slate-500 mt-1">ردگیری تمام تغییرات و ذخیره‌سازی‌ها در پایگاه داده</p>
                                    </div>
                                    <span className="text-xs font-bold bg-slate-100 px-4 py-2 rounded-xl text-slate-600">
                                        تعداد رویدادها: {dbLogs.length}
                                    </span>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-slate-100">
                                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-right text-xs">
                                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 text-slate-400 font-black">
                                                <tr>
                                                    <th className="p-4">زمان ثبت</th>
                                                    <th className="p-4 text-center">نوع رویداد</th>
                                                    <th className="p-4">توضیحات تراکنش دیتابیس</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {dbLogs.length > 0 ? (
                                                    dbLogs.map(log => (
                                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-4 font-mono font-bold text-slate-500 whitespace-nowrap" dir="ltr">
                                                                {new Date(log.timestamp).toLocaleTimeString('fa-IR')}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${
                                                                    log.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                                                    log.type === 'error' ? 'bg-rose-100 text-rose-700' :
                                                                    log.type === 'query' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                                                }`}>
                                                                    {log.type.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 font-bold text-slate-700">
                                                                {log.message}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3} className="p-8 text-center text-slate-400 font-bold">
                                                            در حال حاضر لاگی ثبت نشده است. برای بروزرسانی دکمه بالای صفحه را فشار دهید.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSettingsTab === 'categories' && (
                        <div className="max-w-4xl space-y-8 animate-step">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800">مدیریت هوشمند دسته‌بندی‌ها و سهمیه‌های رایگان</h4>
                                        <p className="text-xs text-slate-500 mt-1">تعیین تعداد آگهی‌های رایگان مجاز در بازه زمانی دلخواه (مثلاً ۱ آگهی رایگان در هر ۲۰ روز) و هزینه آگهی‌های مازاد</p>
                                    </div>
                                    <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-black text-xs rounded-xl border border-indigo-100">
                                        {categories.length} دسته‌بندی فعال
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl p-2 bg-slate-50 rounded-2xl border border-slate-100">{cat.icon}</span>
                                                    <div>
                                                        <span className="font-black text-base text-slate-800 block">{cat.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">شناسه: {cat.id}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button 
                                                        onClick={() => setEditingCategory(editingCategory?.id === cat.id ? null : cat)}
                                                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-colors ${editingCategory?.id === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                    >
                                                        {editingCategory?.id === cat.id ? 'انصراف' : 'تنظیم سهمیه'}
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (window.confirm(`آیا از حذف دسته‌بندی "${cat.name}" اطمینان دارید؟`)) {
                                                                onUpdateCategories(categories.filter(c => c.id !== cat.id));
                                                            }
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-xs transition-colors"
                                                        title="حذف"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <div className="text-slate-600">
                                                    <span className="text-slate-400 block text-[10px] font-normal">سهمیه رایگان:</span>
                                                    <span className="text-indigo-600 font-black">{cat.freeLimitCount ?? 1} آگهی</span> در هر <span className="text-indigo-600 font-black">{cat.freeLimitDays ?? 20} روز</span>
                                                </div>
                                                <div className="text-slate-600">
                                                    <span className="text-slate-400 block text-[10px] font-normal">هزینه آگهی مازاد:</span>
                                                    <span className="text-emerald-600 font-black">{new Intl.NumberFormat('fa-IR').format(cat.paidAdPrice ?? 35000)} تومان</span>
                                                </div>
                                            </div>

                                            {editingCategory?.id === cat.id && (
                                                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                                    <h6 className="text-xs font-black text-indigo-900">ویرایش مشخصات و سهمیه دسته‌بندی {cat.name}</h6>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-500 block mb-1">نام دسته‌بندی</label>
                                                            <input 
                                                                type="text" 
                                                                defaultValue={cat.name}
                                                                id={`cat-name-${cat.id}`}
                                                                className="w-full bg-white p-2 rounded-xl font-bold text-xs border border-indigo-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-500 block mb-1">آیکون (ایموجی)</label>
                                                            <select 
                                                                defaultValue={cat.icon || '🏢'}
                                                                id={`cat-icon-${cat.id}`}
                                                                className="w-full bg-white p-2 rounded-xl font-bold text-xs border border-indigo-200"
                                                            >
                                                                <option value="🏢">🏢 آپارتمان</option>
                                                                <option value="🏡">🏡 ویلایی</option>
                                                                <option value="💼">💼 اداری</option>
                                                                <option value="🏗️">🏗️ زمین / کلنگی</option>
                                                                <option value="🏪">🏪 مغازه / تجاری</option>
                                                                <option value="🌳">🌳 باغ / باغچه</option>
                                                                <option value="🏭">🏭 کارگاه / کارخانه</option>
                                                                <option value="🏠">🏠 مسکونی</option>
                                                                <option value="🏖️">🏖️ ساحلی / تفریحی</option>
                                                                <option value="⛰️">⛰️ کوهستانی / کلبه</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-500 block mb-1">تعداد آگهی رایگان</label>
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                defaultValue={cat.freeLimitCount ?? 1}
                                                                id={`cat-free-${cat.id}`}
                                                                className="w-full bg-white p-2 rounded-xl font-bold text-xs border border-indigo-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-500 block mb-1">بازه زمانی (روز)</label>
                                                            <input 
                                                                type="number" 
                                                                min="1"
                                                                defaultValue={cat.freeLimitDays ?? 20}
                                                                id={`cat-days-${cat.id}`}
                                                                className="w-full bg-white p-2 rounded-xl font-bold text-xs border border-indigo-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-500 block mb-1">قیمت مازاد (تومان)</label>
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                step="1000"
                                                                defaultValue={cat.paidAdPrice ?? 35000}
                                                                id={`cat-price-${cat.id}`}
                                                                className="w-full bg-white p-2 rounded-xl font-bold text-xs border border-indigo-200"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            const catName = (document.getElementById(`cat-name-${cat.id}`) as HTMLInputElement)?.value?.trim() || cat.name;
                                                            const catIcon = (document.getElementById(`cat-icon-${cat.id}`) as HTMLSelectElement)?.value || cat.icon || '🏢';
                                                            const freeCount = Number((document.getElementById(`cat-free-${cat.id}`) as HTMLInputElement)?.value || 1);
                                                            const freeDays = Number((document.getElementById(`cat-days-${cat.id}`) as HTMLInputElement)?.value || 20);
                                                            const paidPrice = Number((document.getElementById(`cat-price-${cat.id}`) as HTMLInputElement)?.value || 35000);
                                                            
                                                            const updated = categories.map(c => c.id === cat.id ? {
                                                                ...c,
                                                                name: catName,
                                                                icon: catIcon,
                                                                freeLimitCount: freeCount,
                                                                freeLimitDays: freeDays,
                                                                paidAdPrice: paidPrice
                                                            } : c);
                                                            onUpdateCategories(updated);
                                                            setEditingCategory(null);
                                                            setCategoryMsg(`تغییرات دسته‌بندی ${catName} با موفقیت ذخیره شد.`);
                                                            setTimeout(() => setCategoryMsg(''), 3000);
                                                        }}
                                                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors shadow"
                                                    >
                                                        ذخیره کامل تغییرات دسته‌بندی
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                                    <h5 className="font-black text-slate-800 text-sm">افزودن دسته‌بندی جدید به همراه تعریف سهمیه</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase mr-2">نام دسته‌بندی</label>
                                            <input 
                                                type="text" 
                                                value={newCatName} 
                                                onChange={e => setNewCatName(e.target.value)} 
                                                placeholder="مثال: زمین کشاورزی، کلنگی" 
                                                className="w-full bg-white p-4 rounded-xl font-bold text-sm border-none shadow-sm" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase mr-2">آیکون (ایموجی)</label>
                                            <select 
                                                value={newCatIcon} 
                                                onChange={e => setNewCatIcon(e.target.value)} 
                                                className="w-full bg-white p-4 rounded-xl font-bold text-sm border-none shadow-sm"
                                            >
                                                <option value="🏢">🏢 آپارتمان</option>
                                                <option value="🏡">🏡 ویلایی</option>
                                                <option value="💼">💼 اداری</option>
                                                <option value="🏗️">🏗️ زمین / کلنگی</option>
                                                <option value="🏪">🏪 مغازه / تجاری</option>
                                                <option value="🌳">🌳 باغ / باغچه</option>
                                                <option value="🏭">🏭 کارگاه / کارخانه</option>
                                                <option value="🏠">🏠 مسکونی</option>
                                                <option value="🏖️">🏖️ ساحلی / تفریحی</option>
                                                <option value="⛰️">⛰️ کوهستانی / کلبه</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2">تعداد آگهی رایگان در هر دوره</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={newCatFreeLimit} 
                                                onChange={e => setNewCatFreeLimit(Number(e.target.value))} 
                                                className="w-full bg-white p-4 rounded-xl font-bold text-sm border-none shadow-sm" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2">بازه دوره سهمیه رایگان (روز)</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={newCatFreeDays} 
                                                onChange={e => setNewCatFreeDays(Number(e.target.value))} 
                                                placeholder="مثلاً 20 روز"
                                                className="w-full bg-white p-4 rounded-xl font-bold text-sm border-none shadow-sm" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2">هزینه آگهی مازاد (تومان)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                step="5000"
                                                value={newCatPaidPrice} 
                                                onChange={e => setNewCatPaidPrice(Number(e.target.value))} 
                                                placeholder="مثلاً 35000"
                                                className="w-full bg-white p-4 rounded-xl font-bold text-sm border-none shadow-sm" 
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => {
                                            if (!newCatName.trim()) {
                                                setCategoryMsg('لطفا نام دسته‌بندی را وارد کنید');
                                                return;
                                            }
                                            const newCat: Category = {
                                                id: 'cat_' + Date.now(),
                                                name: newCatName.trim(),
                                                icon: newCatIcon,
                                                freeLimitCount: newCatFreeLimit,
                                                freeLimitDays: newCatFreeDays,
                                                paidAdPrice: newCatPaidPrice
                                            };
                                            onUpdateCategories([...categories, newCat]);
                                            setNewCatName('');
                                            setNewCatFreeLimit(1);
                                            setNewCatFreeDays(20);
                                            setNewCatPaidPrice(35000);
                                            setCategoryMsg('دسته‌بندی جدید با موفقیت اضافه شد.');
                                            setTimeout(() => setCategoryMsg(''), 3000);
                                        }}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all"
                                    >
                                        ثبت دسته‌بندی جدید
                                    </button>
                                    {categoryMsg && <p className="text-xs font-bold text-emerald-500 text-center mt-2">{categoryMsg}</p>}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSettingsTab === 'provinces' && (
                        <div className="max-w-2xl space-y-8 animate-step">
                            <div>
                                <h4 className="text-lg font-black text-slate-800 mb-2">مدیریت استان‌ها و شهرها</h4>
                                <p className="text-xs text-slate-500 mb-6">در این بخش می‌توانید لیست استان‌ها و شهرهای فعال در پلتفرم را مدیریت کنید.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Province Management */}
                                    <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                                        <h5 className="font-black text-slate-800 text-sm">لیست استان‌ها</h5>
                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                            {provinces.map((prov) => (
                                                <div 
                                                    key={prov.id} 
                                                    onClick={() => setSelectedProvinceId(prov.id)}
                                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${selectedProvinceId === prov.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700'}`}
                                                >
                                                    <span className="font-bold text-sm">{prov.name} ({prov.cities.length} شهر)</span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`آیا از حذف استان "${prov.name}" اطمینان دارید؟`)) {
                                                                onUpdateProvinces(provinces.filter(p => p.id !== prov.id));
                                                                if (selectedProvinceId === prov.id) setSelectedProvinceId('');
                                                            }
                                                        }}
                                                        className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-[10px]"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t border-slate-200 space-y-3">
                                            <input 
                                                type="text" 
                                                value={newProvinceName} 
                                                onChange={e => setNewProvinceName(e.target.value)} 
                                                placeholder="نام استان جدید..." 
                                                className="w-full bg-white p-3 rounded-xl font-bold text-xs border-none" 
                                            />
                                            <button 
                                                onClick={() => {
                                                    if (!newProvinceName.trim()) return;
                                                    const newProv = {
                                                        id: 'prov_' + Date.now(),
                                                        name: newProvinceName.trim(),
                                                        cities: []
                                                    };
                                                    onUpdateProvinces([...provinces, newProv]);
                                                    setNewProvinceName('');
                                                    setSelectedProvinceId(newProv.id);
                                                }}
                                                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-xs"
                                            >
                                                افزودن استان جدید
                                            </button>
                                        </div>
                                    </div>

                                    {/* City Management */}
                                    <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                                        <h5 className="font-black text-slate-800 text-sm">
                                            {selectedProvinceId 
                                                ? `مدیریت شهرهای استان ${provinces.find(p => p.id === selectedProvinceId)?.name}` 
                                                : 'برای مدیریت شهرها، یک استان را انتخاب کنید'}
                                        </h5>
                                        
                                        {selectedProvinceId ? (
                                            <>
                                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                    {(provinces.find(p => p.id === selectedProvinceId)?.cities || []).map((city, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                                            <span className="font-bold text-sm text-slate-700">{city}</span>
                                                            <button 
                                                                onClick={() => {
                                                                    const updatedProvinces = provinces.map(p => {
                                                                        if (p.id === selectedProvinceId) {
                                                                            return { ...p, cities: p.cities.filter(c => c !== city) };
                                                                        }
                                                                        return p;
                                                                    });
                                                                    onUpdateProvinces(updatedProvinces);
                                                                }}
                                                                className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-[10px]"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {(provinces.find(p => p.id === selectedProvinceId)?.cities || []).length === 0 && (
                                                        <p className="text-center text-xs text-slate-400 py-4">شهری در این استان ثبت نشده است.</p>
                                                    )}
                                                </div>

                                                <div className="pt-4 border-t border-slate-200 space-y-3">
                                                    <input 
                                                        type="text" 
                                                        value={newCityName} 
                                                        onChange={e => setNewCityName(e.target.value)} 
                                                        placeholder="نام شهر جدید..." 
                                                        className="w-full bg-white p-3 rounded-xl font-bold text-xs border-none" 
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            if (!newCityName.trim()) return;
                                                            const updatedProvinces = provinces.map(p => {
                                                                if (p.id === selectedProvinceId) {
                                                                    if (p.cities.includes(newCityName.trim())) return p; // prevent duplicates
                                                                    return { ...p, cities: [...p.cities, newCityName.trim()] };
                                                                }
                                                                return p;
                                                            });
                                                            onUpdateProvinces(updatedProvinces);
                                                            setNewCityName('');
                                                        }}
                                                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs"
                                                    >
                                                        افزودن شهر به استان
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-12 text-slate-400">
                                                👈 لطفا از لیست سمت راست یک استان را انتخاب نمایید.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              </Panel>
            )}

            {/* USERS & PACKAGES sections with same premium design... */}
            {activeSection === 'users' && (
              <Panel title="بانک اطلاعات اعضا" icon="👥">
                <div className="glass-card rounded-[3.5rem] overflow-hidden border border-white bg-white/50 shadow-xl">
                    <div className="p-8 border-b border-slate-50"><input type="text" placeholder="جستجو بر اساس نام یا شماره..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full md:w-96 px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" /></div>
                    <table className="w-full text-right">
                        <thead>
                            <tr className="text-slate-400 text-[10px] font-black border-b border-slate-50 uppercase tracking-widest"><th className="px-10 py-6">پروفایل</th><th className="px-10 py-6 text-center">نقش سیستمی</th><th className="px-10 py-6 text-center">عضویت</th><th className="px-10 py-6 text-left">پرونده</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-white transition-colors">
                                    <td className="px-10 py-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black">{user.name[0]}</div><div><span className="text-sm font-black text-slate-800 block">{user.name}</span><span className="text-[10px] font-bold text-slate-400">{user.phone}</span></div></div></td>
                                    <td className="px-10 py-6 text-center"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${user.role === 'agent' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{user.role === 'agent' ? '🤵 مشاور' : '👤 کاربر'}</span></td>
                                    <td className="px-10 py-6 text-center text-xs font-bold text-slate-500">{new Date(user.joinDate).toLocaleDateString('fa-IR')}</td>
                                    <td className="px-10 py-6 text-left"><button onClick={() => setSelectedUserForDossier(user)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black">مشاهده 📂</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </Panel>
            )}
        </div>

        {/* COMPREHENSIVE LISTING REVIEW & MODERATION DOSSIER */}
        {selectedListingForReview && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-3 md:p-6 animate-fade-in">
                <div className="bg-white rounded-[3.5rem] w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-600 rounded-2xl text-white flex items-center justify-center text-2xl shadow-md">
                                🏢
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900">
                                    میز نظارت، بازبینی و مدیریت آگهی
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-bold text-slate-500">
                                    <span>کد سیستمی: <span className="font-mono text-indigo-600">{selectedListingForReview.id}</span></span>
                                    <span>•</span>
                                    <span>تاریخ ثبت: {new Date(selectedListingForReview.createdAt || Date.now()).toLocaleDateString('fa-IR')}</span>
                                    <span>•</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                        selectedListingForReview.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                        selectedListingForReview.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                        selectedListingForReview.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                        selectedListingForReview.status === 'archived' ? 'bg-purple-100 text-purple-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                        وضعیت فعلی: {
                                            selectedListingForReview.status === 'approved' ? 'تایید شده' :
                                            selectedListingForReview.status === 'pending' ? 'در انتظار بررسی' :
                                            selectedListingForReview.status === 'rejected' ? 'رد شده' :
                                            selectedListingForReview.status === 'archived' ? 'آرشیو' : 'منقضی شده'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedListingForReview(null)} 
                            className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 text-2xl font-bold flex items-center justify-center transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-grow overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* Left/Middle: Gallery & Specifications (7 Cols) */}
                            <div className="lg:col-span-7 space-y-6">
                                {/* Photo Gallery */}
                                <div className="space-y-3">
                                    <div className="aspect-[16/10] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner relative group">
                                        {selectedListingForReview.images && selectedListingForReview.images[0] ? (
                                            <img 
                                                src={selectedListingForReview.images[0]} 
                                                alt={selectedListingForReview.title} 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-bold">
                                                <span className="text-4xl mb-2">📷</span>
                                                <span>بدون تصویر اصلی</span>
                                            </div>
                                        )}
                                        {selectedListingForReview.images && selectedListingForReview.images.length > 0 && (
                                            <span className="absolute bottom-3 right-3 px-3 py-1 bg-black/60 text-white rounded-xl text-xs font-mono font-bold backdrop-blur-sm">
                                                {selectedListingForReview.images.length} تصویر
                                            </span>
                                        )}
                                    </div>
                                    {selectedListingForReview.images && selectedListingForReview.images.length > 1 && (
                                        <div className="grid grid-cols-4 gap-2.5">
                                            {selectedListingForReview.images.slice(1, 5).map((img, i) => (
                                                <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Technical Specs Grid */}
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <span>📐</span> مشخصات فنی و سازه‌ای ملک
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
                                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">متراژ زمین/بنا</span>
                                            <span className="text-sm font-black text-slate-800">{selectedListingForReview.size || '—'} متر</span>
                                        </div>
                                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
                                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">تعداد اتاق خواب</span>
                                            <span className="text-sm font-black text-slate-800">{selectedListingForReview.bedrooms || '—'} خواب</span>
                                        </div>
                                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
                                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">سال ساخت / سن</span>
                                            <span className="text-sm font-black text-slate-800">{selectedListingForReview.builtYear || 'نوساز'}</span>
                                        </div>
                                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-center">
                                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">طبقه / تعداد واحد</span>
                                            <span className="text-sm font-black text-slate-800">{selectedListingForReview.floor ? `طبقه ${selectedListingForReview.floor}` : 'همکف/تک'}</span>
                                        </div>
                                    </div>

                                    {/* Features & Amenities */}
                                    {selectedListingForReview.features && selectedListingForReview.features.length > 0 && (
                                        <div className="pt-2">
                                            <span className="text-[11px] font-bold text-slate-400 block mb-2">امکانات رفاهی و تجهیزات:</span>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedListingForReview.features.map((f, i) => (
                                                    <span key={i} className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs">
                                                        ✓ {f}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Full Description */}
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <span>📝</span> متن و شرح کامل آگهی
                                    </h4>
                                    <p className="text-sm font-bold text-slate-800 leading-loose whitespace-pre-line">
                                        {selectedListingForReview.description || 'توضیحاتی برای این آگهی ثبت نشده است.'}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Pricing, Owner Details & Admin Status Actions (5 Cols) */}
                            <div className="lg:col-span-5 space-y-6">
                                {/* Title & Location Box */}
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg inline-block">
                                        {selectedListingForReview.category || 'املاک'} • {selectedListingForReview.type === 'rent' ? 'رهن و اجاره' : 'فروش نقدی'}
                                    </span>
                                    <h4 className="text-lg font-black text-slate-900 leading-snug">
                                        {selectedListingForReview.title}
                                    </h4>
                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                        <span>📍</span>
                                        <span>استان {selectedListingForReview.province}، شهر {selectedListingForReview.city}، منطقه {selectedListingForReview.neighborhood || 'مرکزی'}</span>
                                    </p>
                                    {selectedListingForReview.address && (
                                        <p className="text-xs font-medium text-slate-600 bg-white p-3 rounded-xl border border-slate-200 mt-2">
                                            آدرس کامل: {selectedListingForReview.address}
                                        </p>
                                    )}
                                </div>

                                {/* Financial Terms Box */}
                                <div className="p-6 bg-emerald-50/60 rounded-3xl border border-emerald-100 space-y-3">
                                    <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                                        <span>💰</span> شرایط و مبالغ معامله
                                    </h4>
                                    {selectedListingForReview.type === 'rent' ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-emerald-200/60">
                                                <span className="text-xs font-bold text-slate-500">مبلغ رهن (ودیعه):</span>
                                                <span className="text-base font-black text-emerald-700">{Number(selectedListingForReview.deposit || 0).toLocaleString('fa-IR')} تومان</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-emerald-200/60">
                                                <span className="text-xs font-bold text-slate-500">اجاره ماهیانه:</span>
                                                <span className="text-base font-black text-emerald-700">{Number(selectedListingForReview.rent || 0).toLocaleString('fa-IR')} تومان</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-emerald-200/60">
                                                <span className="text-xs font-bold text-slate-500">قیمت کل:</span>
                                                <span className="text-lg font-black text-emerald-700">{Number(selectedListingForReview.price || 0).toLocaleString('fa-IR')} تومان</span>
                                            </div>
                                            {Number(selectedListingForReview.size) > 0 && Number(selectedListingForReview.price) > 0 && (
                                                <div className="flex justify-between items-center text-xs font-bold text-emerald-800 px-2">
                                                    <span>قیمت هر متر مربع:</span>
                                                    <span>{Math.round(Number(selectedListingForReview.price) / Number(selectedListingForReview.size)).toLocaleString('fa-IR')} تومان</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Owner / Contact Identity */}
                                <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-3">
                                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                        <span>👤</span> مشخصات مالک و ثبت‌کننده آگهی
                                    </h4>
                                    <div className="bg-white p-4 rounded-2xl border border-indigo-100/80 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">نام مخاطب:</span>
                                            <span className="text-sm font-black text-slate-800">{selectedListingForReview.contactName || 'کاربر سامانه'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">شماره تماس مستقیم:</span>
                                            <span className="text-sm font-mono font-black text-indigo-600 dir-ltr">
                                                {selectedListingForReview.contactPhone || (selectedListingForReview as any).ownerPhone || 'ثبت نشده'}
                                            </span>
                                        </div>
                                        {selectedListingForReview.ownerId && (
                                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-100">
                                                <span>شناسه کاربری مالک:</span>
                                                <span className="font-mono">{selectedListingForReview.ownerId}</span>
                                            </div>
                                        )}
                                    </div>
                                    {selectedListingForReview.contactPhone && (
                                        <div className="flex gap-2">
                                            <a 
                                                href={`tel:${selectedListingForReview.contactPhone}`} 
                                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-center text-xs font-black shadow-sm transition-all"
                                            >
                                                📞 تماس تلفنی
                                            </a>
                                            <a 
                                                href={`sms:${selectedListingForReview.contactPhone}`} 
                                                className="flex-1 py-2.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-center text-xs font-black transition-all"
                                            >
                                                💬 پیامک مستقیم
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Admin Status Controls & Decision Maker */}
                                <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl space-y-4">
                                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                        <span>⚖️</span> تصمیم‌گیری و تعیین وضعیت آگهی
                                    </h4>

                                    {/* Status Switcher Buttons */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setReviewStatus('approved')} 
                                            className={`p-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                                reviewStatus === 'approved' ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            ✅ تایید و انتشار
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setReviewStatus('pending')} 
                                            className={`p-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                                reviewStatus === 'pending' ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            ⏳ در انتظار بررسی
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setReviewStatus('rejected')} 
                                            className={`p-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                                reviewStatus === 'rejected' ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            ❌ رد آگهی
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setReviewStatus('archived')} 
                                            className={`p-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                                reviewStatus === 'archived' ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            📦 انتقال به آرشیو
                                        </button>
                                    </div>

                                    {/* Feedback / Reason Note */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 block">
                                            نظر یا دلیل مدیریت (ارسال به کاربر در صورت رد یا تایید):
                                        </label>
                                        <textarea 
                                            value={adminFeedbackNote} 
                                            onChange={e => setAdminFeedbackNote(e.target.value)} 
                                            className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="توضیحات اختیاری یا دلیل رد آگهی..." 
                                            rows={3}
                                        />
                                        
                                        {/* Quick Feedback Presets */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                'قیمت ثبت شده نامتعارف است',
                                                'کیفیت تصاویر مناسب نیست یا خلاف قوانین است',
                                                'مشخصات متراژ یا آدرس ناقص است',
                                                'شماره تماس پاسخگو نیست'
                                            ].map((preset, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setAdminFeedbackNote(preset)}
                                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition-all"
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SMS Notice Checkbox */}
                                    <label className="flex items-center gap-3 cursor-pointer pt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={sendAdSmsNotice} 
                                            onChange={e => setSendAdSmsNotice(e.target.checked)} 
                                            className="w-5 h-5 rounded-md accent-indigo-500" 
                                        />
                                        <span className="text-xs font-bold text-slate-300">
                                            ارسال پیامک اطلاع‌رسانی وضعیت آگهی به شماره مالک 📲
                                        </span>
                                    </label>

                                    {/* Apply & Save Button */}
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            onUpdateStatus(selectedListingForReview.id!, reviewStatus, adminFeedbackNote);
                                            
                                            if (sendAdSmsNotice && (selectedListingForReview.contactPhone || (selectedListingForReview as any).ownerPhone)) {
                                                const phone = selectedListingForReview.contactPhone || (selectedListingForReview as any).ownerPhone;
                                                const statText = reviewStatus === 'approved' ? 'تایید و منتشر شد' : reviewStatus === 'rejected' ? 'رد شد' : reviewStatus === 'archived' ? 'آرشیو شد' : 'در وضعیت انتظار قرار گرفت';
                                                const msg = `کاربر گرامی، آگهی "${selectedListingForReview.title}" ${statText}.${adminFeedbackNote ? '\nتوضیحات مدیریت: ' + adminFeedbackNote : ''}`;
                                                sendSms(phone, msg, 'adStatus', meliPayamakConfig);
                                            }

                                            setSelectedListingForReview(null);
                                        }}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs shadow-lg transition-all active:scale-98"
                                    >
                                        💾 ثبت و اعمال قطعی وضعیت آگهی
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-5 md:p-8 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                        <button 
                            type="button"
                            onClick={() => {
                                if (window.confirm(`آیا از حذف کامل آگهی "${selectedListingForReview.title}" مطمئن هستید؟`)) {
                                    onDelete(selectedListingForReview.id!);
                                    setSelectedListingForReview(null);
                                }
                            }}
                            className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5"
                        >
                            <span>🗑️</span>
                            <span>حذف دائمی این آگهی</span>
                        </button>

                        <button 
                            type="button"
                            onClick={() => setSelectedListingForReview(null)}
                            className="px-8 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl font-black text-xs transition-all"
                        >
                            بستن
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* AD MODAL (Create/Edit) */}
        {adModalMode && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                <div className="bg-white rounded-[4rem] p-12 w-full max-w-3xl shadow-2xl border border-white/20 animate-step overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <h3 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl">📺</div>
                        {adModalMode === 'create' ? 'تعریف جایگاه تبلیغاتی جدید' : 'ویرایش جایگاه تبلیغاتی'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-6">
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">عنوان تبلیغ</label><input type="text" value={newAdData.title} onChange={e => setNewAdData({...newAdData, title: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">آدرس تصویر (URL)</label><input type="text" value={newAdData.imageUrl} onChange={e => setNewAdData({...newAdData, imageUrl: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-left" dir="ltr" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">لینک مقصد (URL)</label><input type="text" value={newAdData.linkUrl} onChange={e => setNewAdData({...newAdData, linkUrl: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-left" dir="ltr" /></div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">موقعیت نمایش</label>
                                <select value={newAdData.position} onChange={e => setNewAdData({...newAdData, position: e.target.value as any})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold">
                                    <option value="hero">هدر اصلی (Hero)</option>
                                    <option value="in-feed">بین آگهی‌ها (In-Feed)</option>
                                    <option value="sidebar">سایدبار (Sidebar)</option>
                                    <option value="footer">بنر داخل فوتر (Footer Banner)</option>
                                    <option value="sticky-footer">فوتر چسبان (Sticky Footer)</option>
                                </select>
                            </div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">اولویت نمایش (عدد بزرگتر = بالاتر)</label><input type="number" value={newAdData.priority} onChange={e => setNewAdData({...newAdData, priority: Number(e.target.value)})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                            <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl">
                                <input type="checkbox" id="ad-active" checked={newAdData.isActive} onChange={e => setNewAdData({...newAdData, isActive: e.target.checked})} className="w-6 h-6 rounded-md" />
                                <label htmlFor="ad-active" className="font-bold text-slate-700">وضعیت فعال بودن</label>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={handleSaveAd} className="flex-grow py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl hover:bg-indigo-700 transition-all">ذخیره جایگاه</button>
                        <button onClick={() => { setAdModalMode(null); setEditingAd(null); }} className="px-12 py-6 bg-slate-100 text-slate-500 rounded-[2rem] font-black hover:bg-slate-200 transition-all">انصراف</button>
                    </div>
                </div>
            </div>
        )}

        {/* TRUST BADGE MODAL (Create/Edit) */}
        {badgeModalMode && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                <div className="bg-white rounded-[4rem] p-12 w-full max-w-xl shadow-2xl border border-white/20 animate-step overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-xl">🛡️</div>
                        {badgeModalMode === 'create' ? 'افزودن نماد مجوز جدید' : 'ویرایش نماد مجوز'}
                    </h3>
                    <div className="space-y-6 mb-8">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">عنوان نماد (مثلا اینماد، ساماندهی)</label>
                            <input type="text" value={newBadgeData.title} onChange={e => setNewBadgeData({...newBadgeData, title: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" placeholder="عنوان نماد..." />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">توضیح کوتاه / زیرعنوان</label>
                            <input type="text" value={newBadgeData.subtitle || ''} onChange={e => setNewBadgeData({...newBadgeData, subtitle: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" placeholder="مثلا نماد اعتماد الکترونیکی..." />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">آدرس تصویر لوگو (URL)</label>
                            <input type="text" value={newBadgeData.imageUrl} onChange={e => setNewBadgeData({...newBadgeData, imageUrl: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-left" dir="ltr" placeholder="https://..." />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">لینک مقصد (URL)</label>
                            <input type="text" value={newBadgeData.linkUrl} onChange={e => setNewBadgeData({...newBadgeData, linkUrl: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-left" dir="ltr" placeholder="https://..." />
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl">
                            <input type="checkbox" id="badge-active" checked={newBadgeData.isActive} onChange={e => setNewBadgeData({...newBadgeData, isActive: e.target.checked})} className="w-6 h-6 rounded-md" />
                            <label htmlFor="badge-active" className="font-bold text-slate-700">وضعیت نمایش در فوتر</label>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={handleSaveBadge} className="flex-grow py-5 bg-emerald-600 text-white rounded-[2rem] font-black shadow-xl hover:bg-emerald-700 transition-all">ذخیره نماد</button>
                        <button onClick={() => { setBadgeModalMode(null); setEditingBadge(null); }} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black hover:bg-slate-200 transition-all">انصراف</button>
                    </div>
                </div>
            </div>
        )}

        {/* PACKAGE MODAL (Create/Edit) */}
        {packageModalMode && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                <div className="bg-white rounded-[4rem] p-12 w-full max-w-3xl shadow-2xl border border-white/20 animate-step overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <h3 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl">🚀</div>
                        {packageModalMode === 'create' ? 'طراحی پکیج فروش جدید' : 'ویرایش پکیج فروش'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-6">
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">عنوان پکیج</label><input type="text" value={newPlanData.title} onChange={e => setNewPlanData({...newPlanData, title: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">قیمت (تومان)</label><input type="number" value={newPlanData.price} onChange={e => setNewPlanData({...newPlanData, price: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">مدت زمان (روز)</label><input type="number" value={newPlanData.durationDays} onChange={e => setNewPlanData({...newPlanData, durationDays: Number(e.target.value)})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                        </div>
                        <div className="space-y-6">
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">آیکون</label><input type="text" value={newPlanData.icon} onChange={e => setNewPlanData({...newPlanData, icon: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">سطح اولویت</label><input type="number" value={newPlanData.priorityLevel} onChange={e => setNewPlanData({...newPlanData, priorityLevel: Number(e.target.value)})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">رنگ پس‌زمینه</label><input type="text" value={newPlanData.color} onChange={e => setNewPlanData({...newPlanData, color: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                        </div>
                        <div className="col-span-full">
                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">امکانات (اینتر برای ثبت)</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {newPlanData.features.map((f, i) => (
                                    <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-700 text-[11px] font-black rounded-xl flex items-center gap-2">{f} <button onClick={() => setNewPlanData({...newPlanData, features: newPlanData.features.filter((_, idx) => idx !== i)})} className="text-rose-400">×</button></span>
                                ))}
                            </div>
                            <input type="text" value={featInput} onChange={e => setFeatInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && featInput) { setNewPlanData({...newPlanData, features: [...newPlanData.features, featInput]}); setFeatInput(''); } }} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" placeholder="ویژگی جدید..." />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={handleSavePackage} className="flex-grow py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl hover:bg-indigo-700 transition-all">ذخیره تغییرات</button>
                        <button onClick={() => { setPackageModalMode(null); setEditingPlan(null); }} className="px-12 py-6 bg-slate-100 text-slate-500 rounded-[2rem] font-black hover:bg-slate-200 transition-all">انصراف</button>
                    </div>
                </div>
            </div>
        )}



        {/* AGENT MODAL (Create/Edit) */}
        {agentModalMode && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                <div className="bg-white rounded-[4rem] p-12 w-full max-w-3xl shadow-2xl border border-white/20 animate-step overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <h3 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl">🤵</div>
                        {agentModalMode === 'create' ? 'تعریف مشاور املاک تایید شده' : 'ویرایش پروفایل مشاور'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-6">
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">نام و نام خانوادگی</label><input type="text" value={newAgentData.name} onChange={e => setNewAgentData({...newAgentData, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">شماره تماس (شناسه)</label><input type="tel" value={newAgentData.phone} onChange={e => setNewAgentData({...newAgentData, phone: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-left" dir="ltr" /></div>
                        </div>
                        <div className="space-y-6">
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">نام آژانس املاک</label><input type="text" value={newAgentData.agencyName} onChange={e => setNewAgentData({...newAgentData, agencyName: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">کد نظام صنفی</label><input type="text" value={newAgentData.licenseNumber} onChange={e => setNewAgentData({...newAgentData, licenseNumber: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" /></div>
                        </div>
                        <div className="col-span-full">
                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">سطح اعتماد (Trust Level)</label>
                            <div className="grid grid-cols-3 gap-4">
                                {(['silver', 'gold', 'diamond'] as const).map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => setNewAgentData({...newAgentData, trustLevel: l})}
                                        className={`py-4 rounded-2xl font-black text-xs transition-all border-2 ${newAgentData.trustLevel === l ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                                    >
                                        {l === 'silver' ? '🥈 نقره‌ای' : l === 'gold' ? '🥇 طلایی' : '💎 الماسی'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="col-span-full">
                            <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 uppercase tracking-widest">تخصص‌ها (اینتر برای ثبت)</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {newAgentData.specialty.map((s, i) => (
                                    <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-700 text-[11px] font-black rounded-xl flex items-center gap-2">
                                        {s} <button onClick={() => setNewAgentData({...newAgentData, specialty: newAgentData.specialty.filter((_, idx) => idx !== i)})} className="text-rose-400">×</button>
                                    </span>
                                ))}
                            </div>
                            <input 
                                type="text" 
                                value={specInput} 
                                onChange={e => setSpecInput(e.target.value)}
                                onKeyDown={e => { if(e.key === 'Enter' && specInput) { setNewAgentData({...newAgentData, specialty: [...newAgentData.specialty, specInput]}); setSpecInput(''); } }}
                                className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold" 
                                placeholder="مثلا: مشارکت در ساخت، کلنگی، نوساز..." 
                            />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={handleCreateAgent} className="flex-grow py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl hover:bg-indigo-700 transition-all">ثبت نهایی مشاور</button>
                        <button onClick={() => { setAgentModalMode(null); setEditingAgent(null); }} className="px-12 py-6 bg-slate-100 text-slate-500 rounded-[2rem] font-black hover:bg-slate-200 transition-all">انصراف</button>
                    </div>
                </div>
            </div>
        )}
        
        {/* USER DOSSIER MODAL */}
        {selectedUserForDossier && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                <div className="bg-white rounded-[4rem] p-10 w-full max-w-2xl shadow-2xl border border-white/20 animate-step overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black">
                                {selectedUserForDossier.name[0] || '👤'}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">پرونده مدیریت کاربر</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">شناسه سیستمی: {selectedUserForDossier.id}</p>
                            </div>
                        </div>
                        <button onClick={() => { setSelectedUserForDossier(null); setUserNewPassword(''); setUserPasswordMsg(''); }} className="text-slate-400 text-3xl hover:text-rose-500 transition-colors">×</button>
                    </div>

                    <div className="space-y-6">
                        {/* BASIC USER INFO */}
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span>👤</span> اطلاعات پایه حساب کاربری
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 block mb-1">نام و نام خانوادگی</label>
                                    <input 
                                        type="text" 
                                        value={editUserName}
                                        onChange={e => setEditUserName(e.target.value)}
                                        className="w-full bg-white p-3.5 rounded-xl font-bold border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 block mb-1">نام کاربری (شناسه یکتا)</label>
                                    <input 
                                        type="text" 
                                        value={editUserUsername}
                                        onChange={e => setEditUserUsername(e.target.value)}
                                        className="w-full bg-white p-3.5 rounded-xl font-bold border border-slate-200 text-sm text-left focus:ring-2 focus:ring-indigo-500 outline-none"
                                        dir="ltr"
                                        placeholder="مثلاً: user_123"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 block mb-1">شماره تلفن همراه</label>
                                    <input 
                                        type="tel" 
                                        value={editUserPhone}
                                        onChange={e => setEditUserPhone(e.target.value)}
                                        className="w-full bg-white p-3.5 rounded-xl font-bold border border-slate-200 text-sm text-left focus:ring-2 focus:ring-indigo-500 outline-none"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 block mb-1">آدرس تصویر پروفایل (URL)</label>
                                    <input 
                                        type="text" 
                                        value={editUserAvatar}
                                        onChange={e => setEditUserAvatar(e.target.value)}
                                        className="w-full bg-white p-3.5 rounded-xl font-bold border border-slate-200 text-sm text-left focus:ring-2 focus:ring-indigo-500 outline-none"
                                        dir="ltr"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-2">نقش سیستمی حساب</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setEditUserRole('user')}
                                        className={`py-3 rounded-xl font-black text-xs transition-all border-2 ${editUserRole === 'user' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        👤 کاربر عادی
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setEditUserRole('agent')}
                                        className={`py-3 rounded-xl font-black text-xs transition-all border-2 ${editUserRole === 'agent' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        🤵 مشاور املاک
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* AGENT SPECIFIC DOSSIER (IF ROLE IS AGENT) */}
                        {editUserRole === 'agent' && (
                            <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4 animate-fade-in">
                                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span>🏢</span> اطلاعات تخصصی مشاور و آژانس املاک
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 block mb-1">نام آژانس / بنگاه املاک</label>
                                        <input 
                                            type="text" 
                                            value={editAgencyName}
                                            onChange={e => setEditAgencyName(e.target.value)}
                                            className="w-full bg-white p-3.5 rounded-xl font-bold border border-indigo-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="مثلاً: املاک بزرگ آریا"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 block mb-1">شماره پروانه کسب / نظام صنفی</label>
                                        <input 
                                            type="text" 
                                            value={editLicenseNumber}
                                            onChange={e => setEditLicenseNumber(e.target.value)}
                                            className="w-full bg-white p-3.5 rounded-xl font-bold border border-indigo-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                                            dir="ltr"
                                            placeholder="REG-12345"
                                        />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="text-[10px] font-black text-slate-500 block mb-1">حوزه‌های تخصص (با کاما جدا کنید)</label>
                                        <input 
                                            type="text" 
                                            value={editSpecialties}
                                            onChange={e => setEditSpecialties(e.target.value)}
                                            className="w-full bg-white p-3.5 rounded-xl font-bold border border-indigo-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="مثلاً: مسکونی، تجاری، رهن و اجاره، ویلایی"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 block mb-2">سطح اعتماد و اعتبار مشاور</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['silver', 'gold', 'diamond'] as const).map(lvl => (
                                            <button 
                                                key={lvl}
                                                type="button"
                                                onClick={() => setEditTrustLevel(lvl)}
                                                className={`py-3 rounded-xl font-black text-xs transition-all border-2 ${editTrustLevel === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                {lvl === 'silver' ? '🥈 نقره‌ای' : lvl === 'gold' ? '🥇 طلایی' : '💎 الماسی'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer pt-2">
                                    <input 
                                        type="checkbox" 
                                        checked={editIsVerified}
                                        onChange={e => setEditIsVerified(e.target.checked)}
                                        className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-indigo-300"
                                    />
                                    <span className="text-xs font-black text-indigo-950">
                                        اعطای نشان مشاور تایید شده رسمی سامانه (Verified Agent Badge) ✅
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* PASSWORD & SMS NOTICES */}
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span>🔒</span> تغییر رمز عبور و اطلاع‌رسانی پیامکی
                            </h4>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-1">رمز عبور جدید (در صورت تمایل به تغییر)</label>
                                <input 
                                    type="password" 
                                    placeholder="در صورت عدم تغییر، این فیلد را خالی بگذارید..." 
                                    value={userNewPassword}
                                    onChange={e => setUserNewPassword(e.target.value)}
                                    className="w-full bg-white p-3.5 rounded-xl font-bold border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    dir="ltr"
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer pt-2">
                                <input 
                                    type="checkbox" 
                                    checked={sendUserSmsNotice}
                                    onChange={e => setSendUserSmsNotice(e.target.checked)}
                                    className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                />
                                <span className="text-xs font-black text-slate-700">
                                    ارسال پیامک تغییر مشخصات و رمز عبور جدید به شماره کاربر 📲
                                </span>
                            </label>
                        </div>

                        {userPasswordMsg && (
                            <div className={`p-4 rounded-2xl text-xs font-black text-center ${userPasswordMsg.includes('موفقیت') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                                {userPasswordMsg}
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-4 pt-2">
                            <button 
                                onClick={async () => {
                                    if (!editUserName.trim() || !editUserPhone.trim()) {
                                        setUserPasswordMsg('لطفا نام و شماره تلفن کاربر را وارد کنید');
                                        return;
                                    }

                                    const updates: Partial<User> & Record<string, any> = {
                                        name: editUserName.trim(),
                                        username: editUserUsername.trim(),
                                        phone: editUserPhone.trim(),
                                        role: editUserRole,
                                        avatar: editUserAvatar.trim() || undefined
                                    };

                                    if (editUserRole === 'agent') {
                                        updates.agencyName = editAgencyName.trim();
                                        updates.licenseNumber = editLicenseNumber.trim();
                                        updates.trustLevel = editTrustLevel;
                                        updates.isVerified = editIsVerified;
                                        updates.specialty = editSpecialties
                                            ? editSpecialties.split(',').map(s => s.trim()).filter(Boolean)
                                            : [];
                                        updates.agentProfile = {
                                            licenseNumber: editLicenseNumber.trim(),
                                            agencyName: editAgencyName.trim(),
                                            specialty: updates.specialty,
                                            rating: (selectedUserForDossier as any).agentProfile?.rating || 5,
                                            totalDeals: (selectedUserForDossier as any).agentProfile?.totalDeals || 0,
                                            isVerified: editIsVerified,
                                            trustLevel: editTrustLevel
                                        };
                                    }

                                    if (userNewPassword.trim()) {
                                        if (userNewPassword.length < 4) {
                                            setUserPasswordMsg('رمز عبور جدید باید حداقل 4 کاراکتر باشد');
                                            return;
                                        }
                                        const hash = await hashPassword(userNewPassword);
                                        updates.password = hash;
                                    }

                                    onUpdateUser(selectedUserForDossier.id, updates);

                                    if (sendUserSmsNotice && editUserPhone) {
                                        const msg = `کاربر گرامی ${editUserName}، اطلاعات حساب کاربری شما در سامانه توسط مدیریت بروزرسانی گردید.${userNewPassword ? '\nرمز عبور جدید شما: ' + userNewPassword : ''}`;
                                        sendSms(editUserPhone, msg, 'passwordRecovery', meliPayamakConfig);
                                    }

                                    setUserPasswordMsg('اطلاعات کاربر با موفقیت در دیتابیس بروزرسانی گردید.');
                                    setTimeout(() => {
                                        setSelectedUserForDossier(null);
                                        setUserPasswordMsg('');
                                    }, 2000);
                                }}
                                className="flex-grow py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-colors text-sm"
                            >
                                💾 ذخیره تغییرات و بروزرسانی پرونده کاربر
                            </button>

                            <button 
                                onClick={() => {
                                    if(window.confirm('آیا از حذف دائمی این کاربر اطمینان دارید؟')) {
                                        onDeleteUser(selectedUserForDossier.id);
                                        setSelectedUserForDossier(null);
                                    }
                                }}
                                className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black hover:bg-rose-600 hover:text-white transition-colors text-sm"
                            >
                                🗑️ حذف کاربر
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* LISTING PACKAGE MODAL (Create/Edit) */}
        {isListingPkgModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3.5rem] p-8 sm:p-10 w-full max-w-2xl shadow-2xl border border-white/20 animate-step overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-xl">
                    📦
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      {editingListingPkg ? 'ویرایش بسته سهمیه آگهی' : 'تعریف بسته سهمیه آگهی جدید'}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold">پکیج‌های خرید آگهی توسط کاربران پس از اتمام سهمیه رایگان</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setIsListingPkgModalOpen(false); setEditingListingPkg(null); }}
                  className="text-slate-400 hover:text-rose-500 text-3xl font-black"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase mr-2">عنوان بسته</label>
                    <input 
                      type="text" 
                      value={listingPkgForm.title} 
                      onChange={e => setListingPkgForm({ ...listingPkgForm, title: e.target.value })} 
                      placeholder="مثلا: پکیج نقره‌ای ۱۰ تایی"
                      className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-xs border border-slate-100" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase mr-2">بج / برچسب نمایشی (اختیاری)</label>
                    <input 
                      type="text" 
                      value={listingPkgForm.badge || ''} 
                      onChange={e => setListingPkgForm({ ...listingPkgForm, badge: e.target.value })} 
                      placeholder="مثلا: پرفروش‌ترین، پیشنهاد ویژه"
                      className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-xs border border-slate-100" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase mr-2">توضیحات بسته</label>
                  <input 
                    type="text" 
                    value={listingPkgForm.description} 
                    onChange={e => setListingPkgForm({ ...listingPkgForm, description: e.target.value })} 
                    placeholder="توضیح کوتاه در مورد امکانات و مزایای بسته..."
                    className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-xs border border-slate-100" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase mr-2">تعداد آگهی مجاز</label>
                    <input 
                      type="number" 
                      min="1"
                      value={listingPkgForm.adCount} 
                      onChange={e => setListingPkgForm({ ...listingPkgForm, adCount: Number(e.target.value) })} 
                      className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-xs border border-slate-100" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase mr-2">قیمت بسته (تومان)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="5000"
                      value={listingPkgForm.price} 
                      onChange={e => setListingPkgForm({ ...listingPkgForm, price: Number(e.target.value) })} 
                      className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-xs border border-slate-100" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase mr-2">مدت اعتبار (روز)</label>
                    <input 
                      type="number" 
                      min="1"
                      value={listingPkgForm.durationDays} 
                      onChange={e => setListingPkgForm({ ...listingPkgForm, durationDays: Number(e.target.value) })} 
                      className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-xs border border-slate-100" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase mr-2">هدیه نردبان رایگان (عدد)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={listingPkgForm.ladderBonusCount || 0} 
                      onChange={e => setListingPkgForm({ ...listingPkgForm, ladderBonusCount: Number(e.target.value) })} 
                      className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-xs border border-slate-100" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase mr-2">هدیه ویژه/فوری رایگان (عدد)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={listingPkgForm.featuredBonusCount || 0} 
                      onChange={e => setListingPkgForm({ ...listingPkgForm, featuredBonusCount: Number(e.target.value) })} 
                      className="w-full bg-slate-50 p-3.5 rounded-2xl font-bold text-xs border border-slate-100" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <input 
                    type="checkbox" 
                    id="pkg-active-checkbox"
                    checked={listingPkgForm.isActive} 
                    onChange={e => setListingPkgForm({ ...listingPkgForm, isActive: e.target.checked })} 
                    className="w-5 h-5 accent-indigo-600 rounded" 
                  />
                  <label htmlFor="pkg-active-checkbox" className="text-xs font-black text-slate-700 cursor-pointer">
                    این بسته برای خرید کاربران در سایت فعال و قابل مشاهده باشد
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    if (!listingPkgForm.title.trim()) {
                      alert('لطفا عنوان بسته را وارد کنید');
                      return;
                    }
                    if (editingListingPkg) {
                      const updated = listingPackages.map(p => p.id === editingListingPkg.id ? {
                        ...p,
                        ...listingPkgForm,
                      } : p);
                      if (onUpdateListingPackages) onUpdateListingPackages(updated);
                    } else {
                      const newPkg: ListingPackage = {
                        id: 'lpkg_' + Date.now(),
                        title: listingPkgForm.title.trim(),
                        description: listingPkgForm.description,
                        adCount: listingPkgForm.adCount,
                        price: listingPkgForm.price,
                        durationDays: listingPkgForm.durationDays,
                        badge: listingPkgForm.badge,
                        featuredBonusCount: listingPkgForm.featuredBonusCount,
                        ladderBonusCount: listingPkgForm.ladderBonusCount,
                        isActive: listingPkgForm.isActive,
                      };
                      if (onUpdateListingPackages) onUpdateListingPackages([...listingPackages, newPkg]);
                    }
                    setIsListingPkgModalOpen(false);
                    setEditingListingPkg(null);
                  }}
                  className="flex-grow py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-emerald-700 transition-all"
                >
                  {editingListingPkg ? '💾 ذخیره تغییرات بسته' : '🚀 ثبت و فعال‌سازی بسته'}
                </button>
                <button 
                  onClick={() => { setIsListingPkgModalOpen(false); setEditingListingPkg(null); }}
                  className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Mobile/PWA Admin Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-2xl">
          {[
            { id: 'overview', label: 'داشبورد', icon: '📊' },
            { id: 'listings', label: 'تایید', icon: '🏢', badge: pendingAdsCount },
            { id: 'finance', label: 'مالی', icon: '💳', badge: pendingReceiptsCount },
            { id: 'users', label: 'کاربران', icon: '👥' },
            { id: 'settings', label: 'تنظیمات', icon: '⚙️' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as AdminSection)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${activeSection === item.id ? 'text-indigo-600 font-black' : 'text-slate-500 font-medium'}`}
            >
              <span className="text-lg relative">
                {item.icon}
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center px-1 shadow-sm border-2 border-white">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {activeSection === item.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-0.5"></span>
              )}
            </button>
          ))}
        </nav>
        {/* MODAL: ADMIN LOGOUT CONFIRM */}
        {showAdminLogoutConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-6 text-center shadow-2xl animate-fade-in border border-slate-100">
              <span className="text-5xl block mb-3">🚪</span>
              <h3 className="text-lg font-black text-slate-800 mb-2">خروج از پنل مدیریت</h3>
              <p className="text-xs text-slate-500 font-medium mb-6">
                آیا از خروج از حساب کاربری مدیریت سیستم اطمینان دارید؟
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAdminLogoutConfirm(false);
                    onLogout();
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-md transition-all"
                >
                  بله، خارج شو
                </button>
                <button
                  onClick={() => setShowAdminLogoutConfirm(false)}
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

export default AdminPage;
