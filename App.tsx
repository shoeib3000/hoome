

import React, { useState, useEffect, Suspense, lazy } from 'react';
import type { 
  PropertyListing, 
  User, 
  PromotionTier, 
  PromotionPlan, 
  Conversation, 
  Message, 
  Activity, 
  ExpirationSettings, 
  ZarinPalConfig, 
  CardPaymentConfig, 
  PaymentReceipt, 
  MeliPayamakConfig, 
  Category, 
  Province, 
  AdSlot, 
  TrustBadge, 
  BannerSliderConfig,
  ListingPackage,
  UserPackage,
  SupportTicket,
  TicketMessage,
  SiteBrandingConfig
} from './types';
import { mockListings } from './data/mockData';
import { IRAN_PROVINCES } from './data/iranProvinces';

const DEFAULT_BANNER_SLIDER_CONFIG: BannerSliderConfig = {
  autoSlideEnabled: true,
  autoSlideIntervalSeconds: 5
};

const DEFAULT_LISTING_PACKAGES: ListingPackage[] = [
  {
    id: 'lpkg_starter',
    title: 'پکیج برنزی ۵ تایی',
    description: 'مناسب مالکین شخصی با سهمیه ثبت ۵ آگهی ملک',
    adCount: 5,
    price: 90000,
    durationDays: 30,
    badge: 'اقتصادی',
    ladderBonusCount: 1,
    featuredBonusCount: 0,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'lpkg_silver',
    title: 'پکیج نقره‌ای ۱۵ تایی',
    description: 'پرفروش‌ترین بسته ویژه مشاورین و فعالان املاک همراه با هدیه نردبان و فوری',
    adCount: 15,
    price: 240000,
    durationDays: 60,
    badge: 'پیشنهاد ویژه',
    ladderBonusCount: 3,
    featuredBonusCount: 1,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'lpkg_gold',
    title: 'پکیج طلایی ۴۰ تایی VIP',
    description: 'ویژه آژانس‌های املاک و مشاورین حرفه‌ای با تخفیف ویژه و هدایای اختصاصی',
    adCount: 40,
    price: 550000,
    durationDays: 90,
    badge: 'حرفه‌ای',
    ladderBonusCount: 10,
    featuredBonusCount: 5,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_SUPPORT_TICKETS: SupportTicket[] = [];

import HomePage from './pages/HomePage';
const CreateListingPage = lazy(() => import('./pages/CreateListingPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const UserPanelPage = lazy(() => import('./pages/UserPanelPage'));
const MobileAppPage = lazy(() => import('./pages/MobileAppPage'));
const InstallPage = lazy(() => import('./pages/InstallPage').then(m => ({ default: m.InstallPage })));
import ErrorBoundary from './components/ErrorBoundary';

import AdminLoginModal from './components/AdminLoginModal';
import UserLoginModal from './components/UserLoginModal';
import { Filters } from './components/FilterBar';
import AiAssistant from './components/AiAssistant';
import OfflineIndicator from './components/OfflineIndicator';
import ToastNotification, { ToastMessage } from './components/ToastNotification';
import { Sparkles, Building2 } from 'lucide-react';
import { getAiConfig, syncAiConfigFromServer } from './services/geminiService';
import { hashPassword, hashPasswordSync, verifyPassword, encryptDataSync, decryptDataSync } from './utils/crypto';

const DEFAULT_PLANS: PromotionPlan[] = [
  { id: 'ladder', title: 'نردبان', price: '۳۹,۰۰۰', durationDays: 0, contactVisible: true, priorityLevel: 1, features: ['بازگشت آنی به بالای لیست', 'افزایش بازدید فوری'], color: 'bg-slate-100 border-slate-200 text-slate-700', icon: '🪜' },
  { id: 'urgent', title: 'فوری', price: '۹۹,۰۰۰', durationDays: 7, contactVisible: true, priorityLevel: 3, features: ['برچسب "فوری" برای ۷ روز', 'نمایش در نتایج بالاتر', 'تمایز رنگی در لیست'], color: 'bg-rose-50 border-rose-200 text-rose-800', icon: '🔥' },
  { id: 'special', title: 'ویژه', price: '۲۴۹,۰۰۰', durationDays: 45, contactVisible: true, priorityLevel: 4, features: ['نمایش در اسلایدر صفحه اصلی', 'بالاترین اولویت نمایش', 'نشان "ویژه" و درخشش نئونی', '۴۵ روز اعتبار'], color: 'bg-cyan-50 border-cyan-200 text-cyan-800', icon: '💎' }
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'apt', name: 'آپارتمان', icon: '🏢', freeAdLimitDays: 20, maxFreeAdsPerPeriod: 1 },
  { id: 'house', name: 'ویلایی و خانه', icon: '🏡', freeAdLimitDays: 20, maxFreeAdsPerPeriod: 1 },
  { id: 'office', name: 'اداری و تجاری', icon: '💼', freeAdLimitDays: 15, maxFreeAdsPerPeriod: 1 },
  { id: 'land', name: 'زمین و کلنگی', icon: '🏗️', freeAdLimitDays: 30, maxFreeAdsPerPeriod: 1 },
  { id: 'garden', name: 'باغ و باغچه', icon: '🌳', freeAdLimitDays: 20, maxFreeAdsPerPeriod: 1 },
  { id: 'shop', name: 'مغازه و غرفه', icon: '🏪', freeAdLimitDays: 15, maxFreeAdsPerPeriod: 1 }
];

const DEFAULT_PROVINCES: Province[] = IRAN_PROVINCES;

const DEFAULT_EXPIRATION: ExpirationSettings = {
  defaultLifetimeDays: 30,
  expiryAction: 'archive',
  autoCleanupEnabled: true
};

const DEFAULT_ZARINPAL: ZarinPalConfig = { merchantId: '', isSandbox: true, isEnabled: false };
const DEFAULT_CARD_PAYMENT: CardPaymentConfig = {
  isEnabled: true,
  bankName: 'بانک ملی ایران',
  cardNumber: '6037-9918-1234-5678',
  accountHolder: 'مدیریت آگهی هوشمند املاک',
  iban: 'IR120170000000123456789012',
  description: 'لطفاً پس از واریز وجه، تصویر فیش و یا شماره پیگیری را جهت بررسی و فعال‌سازی سرویس ارسال نمایید.'
};
const DEFAULT_MELIPAYAMAK: MeliPayamakConfig = { 
  username: '', 
  senderNumber: '', 
  isEnabled: false,
  events: {
    otpLogin: true,
    adStatus: true,
    newMessage: true,
    purchaseStatus: true,
    loginAlert: true,
    welcomeMessage: true,
    passwordRecovery: true,
  }
};

const DEFAULT_AD_SLOTS: AdSlot[] = [
  { id: 'ad_hero_1', position: 'hero', title: 'فرصت استثنایی سرمایه‌گذاری ملکی', imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 1 },
  { id: 'ad_feed_1', position: 'in-feed', title: 'تسهیلات و وام مسکن', imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 1 },
  { id: 'ad_sidebar_1', position: 'sidebar', title: 'طراحی دکوراسیون و بازسازی', imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 1 },
  { id: 'ad_footer_1', position: 'footer', title: 'بیمه آتش‌سوزی و حوادث ساختمان', imageUrl: 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1200&q=70', linkUrl: '#', isActive: true, priority: 1 }
];

const DEFAULT_TRUST_BADGES: TrustBadge[] = [
  { id: 'badge_enamad', title: 'اینماد', subtitle: 'نماد اعتماد الکترونیکی', imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=200&q=80', linkUrl: 'https://enamad.ir', isActive: true },
  { id: 'badge_samandehi', title: 'ساماندهی', subtitle: 'نشان ثبت رسانه‌های دیجیتال', imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=200&q=80', linkUrl: 'https://samandehi.ir', isActive: true },
  { id: 'badge_union', title: 'اتحادیه املاک', subtitle: 'پروانه کسب تخصصی املاک', imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=200&q=80', linkUrl: '#', isActive: true },
  { id: 'badge_zarinpal', title: 'درگاه زرین‌پال', subtitle: 'تضمین امنیت پرداخت', imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67568d0d9f?auto=format&fit=crop&w=200&q=80', linkUrl: 'https://zarinpal.com', isActive: true }
];

const DEFAULT_SITE_BRANDING: SiteBrandingConfig = {
  siteName: 'آگهی هوشمند املاک',
  siteSubtitle: 'سامانه جامع معاملات و نیازمندی‌های تخصصی ملک',
  logoUrl: '',
  logoIcon: '🏢',
  autoRedirectToPwa: true,
  sessionTimeoutMinutes: 10,
  activeUsersCountBase: 1200,
  passwordPolicy: {
    minLength: 6,
    requireNumbers: true,
    requireLetters: true,
    requireUppercase: false,
    requireSpecialChars: false,
    maxFailedAttempts: 5
  }
};

const App: React.FC = () => {
  const loadStorage = <T,>(key: string, defaultVal: T): T => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultVal;
      }
    } catch (e) {
      console.warn('localStorage read failed for key:', key, e);
    }
    return defaultVal;
  };

  const [page, setPage] = useState<'home' | 'create' | 'admin' | 'user' | 'pwa' | 'install'>(() => loadStorage('currentPage', 'home'));
  const [dbConnected, setDbConnected] = useState(false);
  const [isServerLoaded, setIsServerLoaded] = useState(false);

  const [listings, setListings] = useState<PropertyListing[]>(() => loadStorage('listings', []));
  const [users, setUsers] = useState<User[]>(() => loadStorage('users', []));
  const [categories, setCategories] = useState<Category[]>(() => loadStorage('categories', DEFAULT_CATEGORIES));
  const [provinces, setProvinces] = useState<Province[]>(() => loadStorage('provinces', DEFAULT_PROVINCES));
  const [promotionPlans, setPromotionPlans] = useState<PromotionPlan[]>(() => loadStorage('promotionPlans', DEFAULT_PLANS));
  const [listingPackages, setListingPackages] = useState<ListingPackage[]>(() => loadStorage('listingPackages', DEFAULT_LISTING_PACKAGES));
  const [userPackages, setUserPackages] = useState<UserPackage[]>(() => loadStorage('userPackages', []));
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => loadStorage('supportTickets', DEFAULT_SUPPORT_TICKETS));
  const [expirationSettings, setExpirationSettings] = useState<ExpirationSettings>(() => loadStorage('expirationSettings', DEFAULT_EXPIRATION));
  const [zarinPalConfig, setZarinPalConfig] = useState<ZarinPalConfig>(() => loadStorage('zarinPalConfig', DEFAULT_ZARINPAL));
  const [cardPaymentConfig, setCardPaymentConfig] = useState<CardPaymentConfig>(() => loadStorage('cardPaymentConfig', DEFAULT_CARD_PAYMENT));
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>(() => loadStorage('paymentReceipts', []));
  const [meliPayamakConfig, setMeliPayamakConfig] = useState<MeliPayamakConfig>(() => loadStorage('meliPayamakConfig', DEFAULT_MELIPAYAMAK));
  const [adSlots, setAdSlots] = useState<AdSlot[]>(() => loadStorage('adSlots', DEFAULT_AD_SLOTS));
  const [trustBadges, setTrustBadges] = useState<TrustBadge[]>(() => loadStorage('trustBadges', DEFAULT_TRUST_BADGES));
  const [bannerSliderConfig, setBannerSliderConfig] = useState<BannerSliderConfig>(() => loadStorage('bannerSliderConfig', DEFAULT_BANNER_SLIDER_CONFIG));
  const [siteBranding, setSiteBranding] = useState<SiteBrandingConfig>(() => loadStorage('siteBranding', DEFAULT_SITE_BRANDING));
  const [conversations, setConversations] = useState<Conversation[]>(() => loadStorage('conversations', []));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const activeRole = localStorage.getItem('activeSessionRole');
      if (activeRole === 'admin') return null;
      const stored = localStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const activeRole = localStorage.getItem('activeSessionRole');
      if (activeRole === 'user') return false;
      return localStorage.getItem('isAdminAuthenticated') === 'true';
    }
    return false;
  });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [userPanelTab, setUserPanelTab] = useState<'my-ads' | 'packages' | 'messages' | 'tickets' | 'payments' | 'favorites'>('my-ads');
  const [homeFilters, setHomeFilters] = useState<Filters>({ city: '', category: 'all', type: 'all' });
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [activeAiHandler, setActiveAiHandler] = useState<((command: string) => Promise<string>) | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Global Instant Toast Notification State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const lastActivityRef = React.useRef<number>(Date.now());
  const sessionIdRef = React.useRef<string>(
    typeof sessionStorage !== 'undefined' 
      ? (sessionStorage.getItem('app_session_id') || (() => {
          const sid = 'sess_' + Math.random().toString(36).substring(2, 10);
          sessionStorage.setItem('app_session_id', sid);
          return sid;
        })())
      : 'sess_' + Math.random().toString(36).substring(2, 10)
  );

  // Track user activity for auto-logout and heartbeat
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });

    // Active session ping to backend
    const currentSessionId = sessionIdRef.current;
    const pingHeartbeat = () => {
      fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId })
      }).catch(() => {});
    };

    pingHeartbeat();
    const heartbeatInterval = setInterval(pingHeartbeat, 40000);

    // Auto-logout inactivity checker
    const checkInactivity = () => {
      if (!currentUser && !isAdminAuthenticated) return;
      
      const timeoutMinutes = siteBranding?.sessionTimeoutMinutes || 10;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs) {
        const wasAdmin = isAdminAuthenticated;
        handleLogout();
        const msg = wasAdmin 
          ? `به دلیل عدم فعالیت بیش از ${timeoutMinutes} دقیقه، نشست مدیریت جهت حفظ امنیت سامانه به صورت خودکار بسته شد.`
          : `به دلیل عدم فعالیت به مدت بیش از ${timeoutMinutes} دقیقه، جهت حفظ امنیت از حساب کاربری خود خارج شدید.`;
        setSessionNotice(msg);
        setTimeout(() => setSessionNotice(null), 8000);
      }
    };

    const inactivityInterval = setInterval(checkInactivity, 15000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('click', updateActivity);
      clearInterval(heartbeatInterval);
      clearInterval(inactivityInterval);
    };
  }, [currentUser, isAdminAuthenticated, siteBranding?.sessionTimeoutMinutes]);

  const pwaNavigateRef = React.useRef<((tab: 'home' | 'search' | 'chats' | 'profile' | 'ai') => void) | null>(null);
  const pwaFilterRef = React.useRef<((filters: any) => void) | null>(null);

  // Check DB status and fetch initial data from server on startup
  useEffect(() => {
    const initApp = async () => {
      try {
        const dbRes = await fetch('/api/db-status');
        if (dbRes.ok) {
          const dbStatus = await dbRes.json();
          setDbConnected(dbStatus.connected);
        }

        const dataRes = await fetch('/api/data');
        if (dataRes.ok) {
          const data = await dataRes.json();
          if (data) {
            if (Array.isArray(data.listings)) setListings(data.listings);
            if (Array.isArray(data.users)) setUsers(data.users);
            if (Array.isArray(data.categories) && data.categories.length > 0) setCategories(data.categories);
            if (Array.isArray(data.provinces) && data.provinces.length > 0) setProvinces(data.provinces);
            if (Array.isArray(data.promotionPlans) && data.promotionPlans.length > 0) setPromotionPlans(data.promotionPlans);
            if (Array.isArray(data.listingPackages)) setListingPackages(data.listingPackages);
            if (Array.isArray(data.userPackages)) setUserPackages(data.userPackages);
            if (Array.isArray(data.supportTickets)) setSupportTickets(data.supportTickets);
            if (data.expirationSettings) setExpirationSettings(data.expirationSettings);
            if (data.zarinPalConfig) setZarinPalConfig(data.zarinPalConfig);
            if (data.cardPaymentConfig) setCardPaymentConfig(data.cardPaymentConfig);
            if (Array.isArray(data.paymentReceipts)) setPaymentReceipts(data.paymentReceipts);
            if (data.meliPayamakConfig) setMeliPayamakConfig(data.meliPayamakConfig);
            if (Array.isArray(data.adSlots)) setAdSlots(data.adSlots);
            if (Array.isArray(data.trustBadges)) setTrustBadges(data.trustBadges);
            if (data.bannerSliderConfig) setBannerSliderConfig(data.bannerSliderConfig);
            if (data.siteBranding) setSiteBranding(data.siteBranding);
            if (Array.isArray(data.conversations)) setConversations(data.conversations);
            if (data.adminCredentials) setAdminCredentials(data.adminCredentials);
            if (data.currentUser) setCurrentUser(data.currentUser);
          }
        }
      } catch (err) {
        console.warn('Backend server sync error:', err);
      } finally {
        setIsServerLoaded(true);
      }
    };

    initApp();

    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      const params = new URLSearchParams(search);
      const pageParam = params.get('page');

      // Sync category, city, type filters from URL params
      const catParam = params.get('category');
      const cityParam = params.get('city');
      const typeParam = params.get('type') as 'all' | 'rent' | 'sale';

      if (catParam || cityParam || typeParam) {
        setHomeFilters(prev => ({
          city: cityParam !== null ? cityParam : prev.city,
          category: catParam !== null ? catParam : prev.category,
          type: (typeParam === 'rent' || typeParam === 'sale') ? typeParam : prev.type
        }));
      }

      if (path.startsWith('/category/')) {
        const catName = decodeURIComponent(path.replace('/category/', '').trim());
        if (catName) {
          setHomeFilters(prev => ({ ...prev, category: catName }));
          setPage('home');
          return;
        }
      }

      const isHoomAdmin = path === '/hoomadmin' || path === '/hoomadmin/' || pageParam === 'hoomadmin' || hash === '#hoomadmin' || path === '/hoomeadmin24' || path === '/admin' || pageParam === 'admin' || hash === '#admin';
      if (isHoomAdmin) {
        const authed = typeof localStorage !== 'undefined' && localStorage.getItem('isAdminAuthenticated') === 'true';
        if (authed) {
          setIsAdminAuthenticated(true);
          setPage('admin');
        } else {
          setShowAdminLogin(true);
        }
      } else if (path === '/pwa' || path === '/mobile' || path === '/app' || pageParam === 'pwa' || hash === '#pwa') {
        setPage('pwa');
      } else if (path === '/install' || pageParam === 'install') {
        setPage('install');
      } else if (path === '/create' || pageParam === 'create') {
        setPage('create');
      } else if (path === '/user' || pageParam === 'user') {
        setPage('user');
      } else {
        const isMobileDevice = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
        const hasExplicitDesktop = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pref_desktop') === 'true';
        if (isMobileDevice && !hasExplicitDesktop && (siteBranding?.autoRedirectToPwa ?? true) && (path === '/' || path === '') && !pageParam && !hash) {
          setPage('pwa');
        }
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
    };
  }, []);

  // Multi-tab instant live sync channel and server polling
  const syncChannelRef = React.useRef<BroadcastChannel | null>(null);
  const lastSyncedVersionRef = React.useRef<number>(Date.now());

  useEffect(() => {
    // 1. Same-device multi-tab instant sync via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('smart_property_sync');
      channel.onmessage = (event) => {
        const { key, value } = event.data || {};
        if (!key || value === undefined) return;
        if (key === 'categories' && Array.isArray(value)) setCategories(value);
        if (key === 'listings' && Array.isArray(value)) setListings(value);
        if (key === 'promotionPlans' && Array.isArray(value)) setPromotionPlans(value);
        if (key === 'listingPackages' && Array.isArray(value)) setListingPackages(value);
        if (key === 'userPackages' && Array.isArray(value)) setUserPackages(value);
        if (key === 'supportTickets' && Array.isArray(value)) setSupportTickets(value);
        if (key === 'expirationSettings' && value) setExpirationSettings(value);
        if (key === 'zarinPalConfig' && value) setZarinPalConfig(value);
        if (key === 'cardPaymentConfig' && value) setCardPaymentConfig(value);
        if (key === 'paymentReceipts' && Array.isArray(value)) setPaymentReceipts(value);
        if (key === 'meliPayamakConfig' && value) setMeliPayamakConfig(value);
        if (key === 'adSlots' && Array.isArray(value)) setAdSlots(value);
        if (key === 'trustBadges' && Array.isArray(value)) setTrustBadges(value);
        if (key === 'bannerSliderConfig' && value) setBannerSliderConfig(value);
        if (key === 'siteBranding' && value) setSiteBranding(value);
        if (key === 'conversations' && Array.isArray(value)) setConversations(value);
      };
      syncChannelRef.current = channel;
    }

    // 2. Real-time background server sync (polls every 3.5 seconds)
    let isMounted = true;
    const pollServerSync = async () => {
      try {
        const res = await fetch('/api/sync-version');
        if (res.ok) {
          const { version } = await res.json();
          if (version && version > lastSyncedVersionRef.current) {
            lastSyncedVersionRef.current = version;
            const dataRes = await fetch('/api/data');
            if (dataRes.ok) {
              const data = await dataRes.json();
              if (data && isMounted) {
                if (data.categories && Array.isArray(data.categories)) setCategories(data.categories);
                if (data.provinces && Array.isArray(data.provinces)) setProvinces(data.provinces);
                if (data.listings && Array.isArray(data.listings)) setListings(data.listings);
                if (data.users && Array.isArray(data.users)) setUsers(data.users);
                if (data.promotionPlans && Array.isArray(data.promotionPlans)) setPromotionPlans(data.promotionPlans);
                if (data.listingPackages && Array.isArray(data.listingPackages)) setListingPackages(data.listingPackages);
                if (data.userPackages && Array.isArray(data.userPackages)) setUserPackages(data.userPackages);
                if (data.supportTickets && Array.isArray(data.supportTickets)) setSupportTickets(data.supportTickets);
                if (data.expirationSettings) setExpirationSettings(data.expirationSettings);
                if (data.zarinPalConfig) setZarinPalConfig(data.zarinPalConfig);
                if (data.cardPaymentConfig) setCardPaymentConfig(data.cardPaymentConfig);
                if (data.paymentReceipts && Array.isArray(data.paymentReceipts)) setPaymentReceipts(data.paymentReceipts);
                if (data.meliPayamakConfig) setMeliPayamakConfig(data.meliPayamakConfig);
                if (data.adSlots && Array.isArray(data.adSlots)) setAdSlots(data.adSlots);
                if (data.trustBadges && Array.isArray(data.trustBadges)) setTrustBadges(data.trustBadges);
                if (data.bannerSliderConfig) setBannerSliderConfig(data.bannerSliderConfig);
                if (data.siteBranding) setSiteBranding(data.siteBranding);
                if (data.conversations && Array.isArray(data.conversations)) setConversations(data.conversations);
              }
            }
          }
        }
      } catch (e) {
        // Silently catch network blip
      }
    };

    const pollInterval = setInterval(pollServerSync, 3500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (syncChannelRef.current) {
        syncChannelRef.current.close();
      }
    };
  }, []);

  // Sync AI settings from server on initial load
  useEffect(() => {
    syncAiConfigFromServer();
  }, []);

  const safeSaveStorage = (key: string, value: any) => {
    // 1. Save to local storage for backward compatibility and fast loads
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('localStorage write failed for key:', key, e);
    }

    // 2. Broadcast immediately across open browser tabs for zero-latency sync
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({ key, value, timestamp: Date.now() });
      } catch (err) {}
    }

    // 3. Push to server backend (MySQL database or fallback local-store.json)
    if (isServerLoaded) {
      fetch('/api/save-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      }).catch(err => console.error(`Failed to save state ${key} to server:`, err));
    }
  };

  // Sync state mutations to storage
  useEffect(() => { safeSaveStorage('listings', listings); }, [listings, isServerLoaded]);
  useEffect(() => { safeSaveStorage('users', users); }, [users, isServerLoaded]);
  useEffect(() => { safeSaveStorage('categories', categories); }, [categories, isServerLoaded]);
  useEffect(() => { safeSaveStorage('provinces', provinces); }, [provinces, isServerLoaded]);
  useEffect(() => { safeSaveStorage('promotionPlans', promotionPlans); }, [promotionPlans, isServerLoaded]);
  useEffect(() => { safeSaveStorage('listingPackages', listingPackages); }, [listingPackages, isServerLoaded]);
  useEffect(() => { safeSaveStorage('userPackages', userPackages); }, [userPackages, isServerLoaded]);
  useEffect(() => { safeSaveStorage('supportTickets', supportTickets); }, [supportTickets, isServerLoaded]);
  useEffect(() => { safeSaveStorage('expirationSettings', expirationSettings); }, [expirationSettings, isServerLoaded]);
  useEffect(() => { safeSaveStorage('zarinPalConfig', zarinPalConfig); }, [zarinPalConfig, isServerLoaded]);
  useEffect(() => { safeSaveStorage('cardPaymentConfig', cardPaymentConfig); }, [cardPaymentConfig, isServerLoaded]);
  useEffect(() => { safeSaveStorage('paymentReceipts', paymentReceipts); }, [paymentReceipts, isServerLoaded]);
  useEffect(() => { safeSaveStorage('meliPayamakConfig', meliPayamakConfig); }, [meliPayamakConfig, isServerLoaded]);
  useEffect(() => { safeSaveStorage('adSlots', adSlots); }, [adSlots, isServerLoaded]);
  useEffect(() => { safeSaveStorage('trustBadges', trustBadges); }, [trustBadges, isServerLoaded]);
  useEffect(() => { safeSaveStorage('bannerSliderConfig', bannerSliderConfig); }, [bannerSliderConfig, isServerLoaded]);
  useEffect(() => { safeSaveStorage('siteBranding', siteBranding); }, [siteBranding, isServerLoaded]);
  useEffect(() => { safeSaveStorage('conversations', conversations); }, [conversations, isServerLoaded]);
  useEffect(() => { safeSaveStorage('currentUser', currentUser); }, [currentUser, isServerLoaded]);
  useEffect(() => { safeSaveStorage('currentPage', page); }, [page, isServerLoaded]);
  useEffect(() => { safeSaveStorage('isAdminAuthenticated', isAdminAuthenticated); }, [isAdminAuthenticated, isServerLoaded]);

  // Update dynamic document title from siteBranding
  useEffect(() => {
    if (typeof document !== 'undefined' && siteBranding?.siteName) {
      document.title = `${siteBranding.siteName} ${siteBranding.siteSubtitle ? `- ${siteBranding.siteSubtitle}` : ''}`;
    }
  }, [siteBranding]);

  
  const [adminCredentials, setAdminCredentials] = useState<{username: string, passwordHash: string}>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('ADMIN_CREDS');
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('localStorage read for ADMIN_CREDS failed:', e);
    }
    
    // Check if custom credentials are provided via environment variables (for server deployment)
    try {
      const envUser = import.meta.env.VITE_ADMIN_USERNAME;
      const envPass = import.meta.env.VITE_ADMIN_PASSWORD;
      if (envUser && envPass) {
        return { username: envUser.trim(), passwordHash: hashPasswordSync(envPass.trim()) };
      }
    } catch (e) {
      console.warn('import.meta.env access failed:', e);
    }
    
    return { username: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' }; // admin/admin
  });

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ADMIN_CREDS', JSON.stringify(adminCredentials));
      }
    } catch (e) {
      console.warn('localStorage write failed for ADMIN_CREDS:', e);
    }
    safeSaveStorage('adminCredentials', adminCredentials);
  }, [adminCredentials, isServerLoaded]);

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdminAuthenticated(false);
    setShowAdminLogin(false);
    setShowUserAuth(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('isAdminAuthenticated');
      localStorage.removeItem('activeSessionRole');
    }
    setPage('home');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleUserLogin = async (u: string, p: string, isOtp = false) => {
    let f: User | undefined;
    if (isOtp) {
      f = users.find(x => x.phone === u || x.username === u);
    } else {
      f = users.find(x => (x.username === u || x.phone === u) && x.password && verifyPassword(p, x.password));
    }

    if (f) {
      setCurrentUser(f);
      setIsAdminAuthenticated(false); // SINGLE PANEL CONSTRAINT: End admin session
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(f));
        localStorage.setItem('activeSessionRole', 'user');
        localStorage.removeItem('isAdminAuthenticated');
      }
      setShowUserAuth(false);
      if (f.phone) {
        import('./services/smsService').then(({ sendSms }) => {
          sendSms(f!.phone!, `کاربر گرامی ${f!.name}، ورود به حساب کاربری با موفقیت ثبت شد.`, 'loginAlert');
        });
      }
      return true;
    }
    return false;
  };

  const handleUserRegister = async (data: { name: string; phone: string; password?: string; role?: 'user' | 'agent' } | Partial<User>): Promise<User> => {
    const phone = data.phone || '';
    const existing = users.find(u => u.phone === phone);
    if (existing) {
      setCurrentUser(existing);
      setIsAdminAuthenticated(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(existing));
        localStorage.setItem('activeSessionRole', 'user');
        localStorage.removeItem('isAdminAuthenticated');
      }
      setShowUserAuth(false);
      return existing;
    }
    const hash = data.password ? await hashPassword(data.password) : undefined;
    const isAgent = data.role === 'agent' || (data as any).isAgent;
    const newUser: User = {
      id: 'u_' + Date.now(),
      name: data.name || (isAgent ? 'مشاور املاک' : 'کاربر جدید'),
      username: phone,
      phone: phone,
      password: hash,
      role: isAgent ? 'agent' : ((data.role as any) || 'user'),
      agencyName: (data as any).agencyName || undefined,
      joinDate: Date.now(),
      activities: [{
        id: 'act_' + Date.now(),
        type: 'LOGIN',
        timestamp: Date.now(),
        details: isAgent ? 'ثبت‌نام مشاور و آژانس املاک' : 'ثبت‌نام و عضویت در پلتفرم'
      }]
    };
    setUsers(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    setIsAdminAuthenticated(false); // SINGLE PANEL CONSTRAINT: End admin session
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      localStorage.setItem('activeSessionRole', 'user');
      localStorage.removeItem('isAdminAuthenticated');
    }
    setShowUserAuth(false);
    return newUser;
  };

  const handleListingSubmit = (listingData: PropertyListing | Omit<PropertyListing, 'id' | 'createdAt' | 'status' | 'promotion' | 'expiryDate'>, newUser?: { name: string; phone: string; password?: string; isAgent?: boolean; agencyName?: string }): PropertyListing => {
    let effectiveUser = currentUser;
    if (newUser && newUser.phone && !currentUser) {
      effectiveUser = handleUserRegister({ ...newUser, role: newUser.isAgent ? 'agent' : 'user' }) as any;
    }
    const newId = (listingData as PropertyListing).id || ('ad_' + Date.now());
    const isAgent = effectiveUser?.role === 'agent' || (listingData as PropertyListing).isAgentListing || (listingData as PropertyListing).ownerRole === 'agent';
    const agencyName = (listingData as PropertyListing).agencyName || effectiveUser?.agencyName || effectiveUser?.agentProfile?.agencyName;
    
    const newListing: PropertyListing = {
      ...listingData,
      id: newId,
      ownerId: effectiveUser?.id,
      ownerRole: isAgent ? 'agent' : 'user',
      isAgentListing: isAgent,
      agencyName: isAgent ? (agencyName || 'مشاور املاک') : undefined,
      status: expirationSettings.autoApproveListings ? 'approved' : 'pending',
      promotion: (listingData as PropertyListing).promotion || 'none',
      createdAt: (listingData as PropertyListing).createdAt || Date.now(),
      expiryDate: (listingData as PropertyListing).expiryDate || (Date.now() + (expirationSettings.defaultLifetimeDays * 86400000))
    };
    setListings(prev => [newListing, ...prev]);

    // Check and deduct from active user package quota
    if (effectiveUser) {
      let packageWasDeducted = false;
      let remainingQuotaCount = 0;

      setUserPackages(prev => {
        return prev.map(up => {
          if (!packageWasDeducted && up.userId === effectiveUser!.id && up.status === 'active' && up.remainingAds > 0 && up.expiresAt > Date.now()) {
            packageWasDeducted = true;
            remainingQuotaCount = up.remainingAds - 1;
            return {
              ...up,
              remainingAds: remainingQuotaCount
            };
          }
          return up;
        });
      });

      if (packageWasDeducted) {
        addToast({
          type: 'success',
          title: 'آگهی ثبت شد (کسر سهمیه پکیج)',
          message: `آگهی "${newListing.title}" ثبت گردید. سهمیه باقی‌مانده از پکیج شما: ${remainingQuotaCount} آگهی.`
        });
      } else {
        addToast({
          type: 'success',
          title: 'آگهی با موفقیت ثبت شد',
          message: `آگهی "${newListing.title}" ثبت شد و در صف بررسی مدیریت قرار گرفت.`
        });
      }

      logActivity(effectiveUser.id, 'AD_POSTED', `ثبت آگهی "${newListing.title}" ${isAgent ? '(با برچسب مشاور املاک)' : ''}`);
    } else {
      addToast({
        type: 'success',
        title: 'آگهی با موفقیت ثبت شد',
        message: `آگهی "${newListing.title}" ثبت شد.`
      });
    }
    setPage('home');
    return newListing;
  };

  const handlePasswordReset = async (phone: string, newPass: string) => {
    const hash = await hashPassword(newPass);
    setUsers(prev => prev.map(u => u.phone === phone ? { ...u, password: hash } : u));
    return true;
  };

  const handleAdminLogin = async (username: string, pass: string): Promise<boolean> => {
    const trimmedUser = username.trim();
    const trimmedPass = pass.trim();
    
    let isMatch = false;
    // 1. Check against active credentials (either loaded from localStorage or set via environment variables)
    if (trimmedUser === adminCredentials.username && verifyPassword(trimmedPass, adminCredentials.passwordHash)) {
      isMatch = true;
    }
    
    // 2. Direct check against environment variables to ensure bypass if state is out of sync
    const envUser = import.meta.env.VITE_ADMIN_USERNAME;
    const envPass = import.meta.env.VITE_ADMIN_PASSWORD;
    if (!isMatch && envUser && envPass && trimmedUser === envUser.trim() && trimmedPass === envPass.trim()) {
      isMatch = true;
    }

    // 3. Fallback to default admin/admin for emergency/new server setup if no custom credentials are set or as back-up
    if (!isMatch && trimmedUser === 'admin' && trimmedPass === 'admin') {
      isMatch = true;
    }

    if (isMatch) {
      setIsAdminAuthenticated(true);
      setCurrentUser(null); // SINGLE PANEL CONSTRAINT: End regular user session
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('isAdminAuthenticated', 'true');
        localStorage.setItem('activeSessionRole', 'admin');
        localStorage.removeItem('currentUser');
      }
      setShowAdminLogin(false);
      setPage('admin');
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/hoomadmin');
      }
      return true;
    }
    
    return false;
  };

  const handleGlobalAiCommand = async (command: string): Promise<string> => {
    const trimmedCommand = (command || '').trim();
    if (!trimmedCommand) {
      return 'لطفاً دستور یا سوال خود را بنویسید تا بتوانم کمکتان کنم.';
    }

    if (page === 'admin' && activeAiHandler) {
      return await activeAiHandler(trimmedCommand);
    }

    const config = getAiConfig();

    try {
      const prompt = `شما "دستیار ملک" - دستیار و مشاور املاک هوشمند و متخصص برای کاربران سامانه املاک هستید. کاربر پیامی فرستاده است.
شما باید با زبان فارسی صمیمی، محترمانه، راهنمایانه و دقیق به او کمک کنید.
علاوه بر پاسخ متنی، در صورت نیاز می‌توانید در انتهای پاسختان از ابزارهای زیر با تگ مخصوص استفاده کنید:

1. برای هدایت کاربر به صفحات سایت:
[NAVIGATE: <page>]
مقادیر مجاز برای <page>: 'home' (صفحه اصلی و لیست املاک), 'create' (ثبت آگهی جدید), 'admin' (پنل مدیریت), 'user' (پنل کاربری و چت‌ها), 'pwa' (اپلیکیشن موبایل)

2. برای اعمال خودکار فیلتر یا جستجوی املاک در صفحه:
[FILTER: {"city": "<نام_شهر>", "category": "<apartment|house|office|land|garden|shop|all>", "type": "<rent|sale|all>"}]

اطلاعات نمونه آگهی‌های فعال در سامانه:
${JSON.stringify(listings.filter(l => l.status === 'approved').slice(0, 15).map(l => ({ id: l.id, title: l.title, price: l.price, type: l.type, category: l.category, city: l.city, neighborhood: l.neighborhood })))}

${config.systemInstruction ? `دستورالعمل سیستم: ${config.systemInstruction}` : ''}

پیام کاربر: ${trimmedCommand}`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          systemInstruction: config.systemInstruction || 'شما دستیار ملک، مشاور متخصص و خوش‌برخورد املاک هستید.',
          config
        })
      });

      let reply = '';
      if (res.ok) {
        const data = await res.json();
        reply = data.text?.trim() || data.choices?.[0]?.message?.content?.trim() || '';
      }

      // Intelligent Dynamic Fallback if server response is empty or offline
      if (!reply) {
        const lower = trimmedCommand.toLowerCase();
        if (lower.includes('ثبت') || lower.includes('آگهی جدید') || lower.includes('گذاشتن ملک') || lower.includes('چطور آگهی')) {
          reply = 'برای ثبت آگهی ملکتان کافیست به صفحه «ثبت آگهی» مراجعه نمایید؛ مشخصات ملک، قیمت و تصاویر را وارد کرده و پس از تایید مدیریت، آگهی شما منتشر خواهد شد.\nهم‌اکنون شما را به صفحه ثبت آگهی هدایت می‌کنم.\n[NAVIGATE: create]';
        } else if (lower.includes('ارزان') || lower.includes('قیمت مناسب') || lower.includes('کمترین قیمت')) {
          const approved = listings.filter(l => l.status === 'approved' && l.price && Number(l.price) > 0);
          const cheapest = approved.sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 3);
          if (cheapest.length > 0) {
            const listText = cheapest.map(c => `• ${c.title} در ${c.city || 'نامشخص'} (${new Intl.NumberFormat('fa-IR').format(Number(c.price))} تومان)`).join('\n');
            reply = `🏠 اقتصادی‌ترین املاک موجود در سامانه:\n${listText}\n\nفهرست املاک را برای مشاهده موارد ارزان‌تر برایتان باز کردم.\n[FILTER: {"type": "sale", "category": "all"}]`;
          } else {
            reply = 'در حال حاضر موارد قیمت مناسب در صفحه اصلی قرار دارند. شما را به لیست املاک هدایت می‌کنم.\n[NAVIGATE: home]';
          }
        } else if (lower.includes('اجاره') || lower.includes('رهن')) {
          const rentListings = listings.filter(l => l.status === 'approved' && l.type === 'rent');
          reply = `در حال حاضر ${rentListings.length} مورد ملک رهن و اجاره‌ای در سامانه فعال است. لیست این املاک را برایتان آماده کردم.\n[FILTER: {"type": "rent", "category": "all"}]`;
        } else if (lower.includes('آپارتمان') || lower.includes('خرید')) {
          const aptListings = listings.filter(l => l.status === 'approved' && (l.category === 'apt' || l.category === 'آپارتمان'));
          reply = `تعداد ${aptListings.length} مورد آپارتمان فعال در سامانه موجود است. صفحه املاک برای شما فیلتر شد.\n[FILTER: {"category": "apt", "type": "all"}]`;
        } else if (lower.includes('ویلا') || lower.includes('خانه')) {
          const houseListings = listings.filter(l => l.status === 'approved' && (l.category === 'house' || l.category === 'ویلایی'));
          reply = `تعداد ${houseListings.length} مورد ویلا و خانه ویلایی در سامانه ثبت شده است.\n[FILTER: {"category": "house", "type": "all"}]`;
        } else if (lower.includes('مشاور') || lower.includes('املاک') || lower.includes('آژانس')) {
          reply = 'کاربران گرامی در صورتی که توسط مدیریت نقش آن‌ها به «مشاور املاک» ارتقاء یابد، برچسب رسمی مشاور املاک به صورت خودکار بر روی تمامی آگهی‌های ثبت‌شده آن‌ها درج خواهد شد و می‌توانند پکیج‌های ثبت آگهی چندتایی تهیه کنند.';
        } else if (lower.includes('نردبان') || lower.includes('فوری') || lower.includes('ویژه') || lower.includes('تعرفه')) {
          reply = 'در این سامانه می‌توانید برای دیده شدن بهتر آگهی از امکانات «نردبان» (انتقال به ابتدای لیست)، نشان «فوری» (برچسب آتشین و متمایز) و نشان «ویژه» (نمایش در اسلایدر ویژه بالای صفحه) استفاده نمایید.';
        } else if (lower.includes('مدیر') || lower.includes('ادمین') || lower.includes('پنل')) {
          reply = 'جهت ورود به پنل مدیریت می‌توانید از دکمه ورود مدیریت در انتهای سایت یا آدرس مستقیم /admin استفاده نمایید.\n[NAVIGATE: admin]';
        } else {
          reply = `سلام! به عنوان «دستیار هوشمند ملک»، می‌توانم در جستجو و فیلتر املاک، مشاوره خرید و رهن و اجاره، تخمین قیمت، یا راهنمایی ثبت آگهی در خدمت شما باشم. مایلید چه ملکی را بررسی کنیم؟`;
        }
      }

      const navMatch = reply.match(/\[NAVIGATE:\s*'?"?(\w+)'?"?\]/);
      if (navMatch) {
        const targetPage = navMatch[1] as any;
        if (page === 'pwa') {
          setTimeout(() => {
            if (targetPage === 'home' && pwaNavigateRef.current) {
              pwaNavigateRef.current('home');
            } else if (targetPage === 'user' && pwaNavigateRef.current) {
              if (!currentUser) {
                setShowUserAuth(true);
              } else {
                pwaNavigateRef.current('chats');
              }
            } else if (targetPage === 'create') {
              setPage('create');
            } else if (targetPage === 'pwa' && pwaNavigateRef.current) {
              pwaNavigateRef.current('home');
            }
          }, 1500);
        } else {
          if (['home', 'create', 'admin', 'user', 'pwa'].includes(targetPage)) {
            setTimeout(() => {
              if (targetPage === 'admin' && !isAdminAuthenticated) {
                setShowAdminLogin(true);
              } else if (targetPage === 'user' && !currentUser) {
                setShowUserAuth(true);
              } else {
                setPage(targetPage);
              }
            }, 1500);
          }
        }
      }

      const filterMatch = reply.match(/\[FILTER:\s*(\{.*?\})\]/);
      if (filterMatch) {
        try {
          const filterData = JSON.parse(filterMatch[1]);
          setTimeout(() => {
            if (page === 'pwa' && pwaFilterRef.current) {
              pwaFilterRef.current(filterData);
            } else {
              setPage('home');
              setHomeFilters({
                city: filterData.city || '',
                category: filterData.category || 'all',
                type: filterData.type || 'all'
              });
            }
          }, 1500);
        } catch (e) {
          console.error("Filter parse error:", e);
        }
      }

      const cleanReply = reply
        .replace(/\[NAVIGATE:.*?\]/g, "")
        .replace(/\[FILTER:.*?\]/g, "")
        .trim();

      return cleanReply;
    } catch (error) {
      console.error("Global AI Command Error:", error);
      return "سلام! من دستیار ملک هستم. در پیدا کردن آپارتمان، ویلا، مغازه یا رهن و اجاره در خدمت شما هستم. چطور می‌توانم کمکتان کنم؟";
    }
  };

  // Expiration Monitor Task
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setListings(prev => {
        let changed = false;
        const next = prev.map(l => {
          if (l.status === 'approved' && l.expiryDate < now) {
            changed = true;
            return { ...l, status: 'expired' as const };
          }
          return l;
        });
        return changed ? next : prev;
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const logActivity = (userId: string, type: Activity['type'], details: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? {
      ...u,
      activities: [{ id: 'act_' + Math.random(), type, timestamp: Date.now(), details }, ...u.activities]
    } : u));
  };

  const handlePromote = (adId: string, tier: PromotionTier) => {
    const plan = promotionPlans.find(p => p.id === tier);
    if (!plan) return;

    setListings(prev => prev.map(l => {
      if (l.id === adId) {
        const newExpiry = plan.durationDays > 0 
          ? Date.now() + (plan.durationDays * 86400000)
          : l.expiryDate; // Keep existing expiry date for ladder

        return { ...l, promotion: tier, expiryDate: newExpiry, lastPromotedAt: Date.now() };
      }
      return l;
    }));
    
    const ad = listings.find(l => l.id === adId);
    if (ad?.ownerId) {
      logActivity(ad.ownerId, 'AD_PROMOTED', `ارتقای آگهی "${ad.title}" به سطح ${plan.title}`);
      const owner = users.find(u => u.id === ad.ownerId);
      if (owner && owner.phone) {
        import('./services/smsService').then(({ sendSms }) => {
          sendSms(owner.phone, `آگهی شما با عنوان "${ad.title}" با موفقیت به سطح ${plan.title} ارتقا یافت.`, 'purchaseStatus');
        });
      }
    }
  };

  const handleCreateReceipt = (receiptData: {
    listingId: string;
    listingTitle: string;
    planId: PromotionTier;
    planTitle: string;
    amount: string;
    trackingCode: string;
    receiptImageUrl: string;
  }) => {
    const newReceipt: PaymentReceipt = {
      id: 'receipt_' + Date.now(),
      userId: currentUser?.id || 'guest',
      userName: currentUser?.name || 'کاربر میهمان',
      userPhone: currentUser?.phone || 'نامشخص',
      listingId: receiptData.listingId,
      listingTitle: receiptData.listingTitle,
      planId: receiptData.planId,
      planTitle: receiptData.planTitle,
      amount: receiptData.amount,
      paymentMethod: 'card_to_card',
      receiptImageUrl: receiptData.receiptImageUrl,
      trackingCode: receiptData.trackingCode,
      status: 'pending',
      createdAt: Date.now()
    };

    setPaymentReceipts(prev => [newReceipt, ...prev]);

    if (currentUser) {
      logActivity(currentUser.id, 'PAYMENT_SUCCESS', `ثبت فیش واریز کارت‌به‌کارت برای آگهی "${receiptData.listingTitle}" (کد پیگیری: ${receiptData.trackingCode})`);
    }
  };

  const handleApproveReceipt = (receiptId: string) => {
    const receipt = paymentReceipts.find(r => r.id === receiptId);
    if (!receipt) return;

    setPaymentReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, status: 'approved', reviewedAt: Date.now() } : r));
    
    // If it's a promotion plan
    if (receipt.listingId && receipt.planId && receipt.planId !== ('package' as any)) {
      handlePromote(receipt.listingId, receipt.planId);
    }

    // If it's a package purchase, find and approve user package
    if (receipt.planId === ('package' as any) || receipt.listingTitle?.includes('خرید پکیج')) {
      setUserPackages(prev => prev.map(up => {
        if (up.userId === receipt.userId && up.status === 'pending') {
          return { ...up, status: 'active', approvedAt: Date.now() };
        }
        return up;
      }));
    }

    if (receipt.userPhone) {
      import('./services/smsService').then(({ sendSms }) => {
        sendSms(receipt.userPhone, `فیش واریزی شما برای "${receipt.listingTitle}" تایید شد و خدمت ${receipt.planTitle} با موفقیت فعال گردید.`, 'purchaseStatus');
      });
    }
  };

  const handleRejectReceipt = (receiptId: string, reason: string) => {
    const receipt = paymentReceipts.find(r => r.id === receiptId);
    if (!receipt) return;

    setPaymentReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, status: 'rejected', rejectionReason: reason, reviewedAt: Date.now() } : r));

    if (receipt.planId === ('package' as any) || receipt.listingTitle?.includes('خرید پکیج')) {
      setUserPackages(prev => prev.map(up => {
        if (up.userId === receipt.userId && up.status === 'pending') {
          return { ...up, status: 'rejected' };
        }
        return up;
      }));
    }

    if (receipt.userPhone) {
      import('./services/smsService').then(({ sendSms }) => {
        sendSms(receipt.userPhone, `متاسفانه فیش واریزی شما برای "${receipt.listingTitle}" به علت زیر تایید نشد:\n${reason}`, 'purchaseStatus');
      });
    }
  };

  const handleBuyPackage = (pkg: ListingPackage, paymentMethodOrReceipt?: 'card_to_card' | 'zarinpal' | { trackingCode: string, receiptImageUrl: string }, maybeReceipt?: { trackingCode: string, receiptImageUrl: string }) => {
    if (!currentUser) return;
    const receiptData = typeof paymentMethodOrReceipt === 'object' ? paymentMethodOrReceipt : maybeReceipt;
    const paymentMethod = typeof paymentMethodOrReceipt === 'string' ? paymentMethodOrReceipt : 'card_to_card';
    const userPkgId = 'upkg_' + Date.now();
    const newUserPkg: UserPackage = {
      id: userPkgId,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone || '',
      packageId: pkg.id,
      packageTitle: pkg.title,
      totalAds: pkg.adCount,
      adQuota: pkg.adCount,
      remainingAds: pkg.adCount,
      pricePaid: pkg.price,
      ladderBonusRemaining: pkg.ladderBonusCount || 0,
      featuredBonusRemaining: pkg.featuredBonusCount || 0,
      purchasedAt: Date.now(),
      expiresAt: Date.now() + (pkg.durationDays * 86400000),
      status: 'pending'
    };
    setUserPackages(prev => [newUserPkg, ...prev]);

    if (receiptData) {
      const newReceipt: PaymentReceipt = {
        id: 'receipt_' + Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        userPhone: currentUser.phone || '',
        listingId: '',
        listingTitle: `خرید پکیج: ${pkg.title}`,
        planId: 'package' as any,
        planTitle: pkg.title,
        amount: pkg.price.toLocaleString('fa-IR'),
        paymentMethod: paymentMethod,
        receiptImageUrl: receiptData.receiptImageUrl,
        trackingCode: receiptData.trackingCode,
        status: 'pending',
        createdAt: Date.now()
      };
      setPaymentReceipts(prev => [newReceipt, ...prev]);
    }

    logActivity(currentUser.id, 'PAYMENT_SUCCESS', `سفارش پکیج "${pkg.title}" ثبت شد.`);
  };

  const handleApproveUserPackage = (userPkgId: string) => {
    setUserPackages(prev => prev.map(up => {
      if (up.id === userPkgId) {
        if (up.userPhone) {
          import('./services/smsService').then(({ sendSms }) => {
            sendSms(up.userPhone, `پکیج "${up.packageTitle}" شما تایید و سهمیه ${up.adQuota} آگهی با موفقیت فعال گردید.`, 'purchaseStatus');
          });
        }
        return { ...up, status: 'active', approvedAt: Date.now() };
      }
      return up;
    }));
  };

  const handleRejectUserPackage = (userPkgId: string, reason?: string) => {
    setUserPackages(prev => prev.map(up => {
      if (up.id === userPkgId) {
        if (up.userPhone) {
          import('./services/smsService').then(({ sendSms }) => {
            sendSms(up.userPhone, `درخواست پکیج "${up.packageTitle}" شما تایید نشد.${reason ? ' علت: ' + reason : ''}`, 'purchaseStatus');
          });
        }
        return { ...up, status: 'rejected' };
      }
      return up;
    }));
  };

  const handleCreateTicket = (data: { subject: string, department: SupportTicket['department'], priority: 'low' | 'medium' | 'high' | 'urgent', message: string }) => {
    if (!currentUser) return;
    const newTicket: SupportTicket = {
      id: 't_' + Date.now(),
      ticketNumber: String(Math.floor(1000 + Math.random() * 9000)),
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone || '',
      subject: data.subject,
      department: data.department,
      priority: data.priority,
      status: 'open',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: 'tm_' + Date.now(),
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: 'user',
          text: data.message,
          timestamp: Date.now()
        }
      ]
    };
    setSupportTickets(prev => [newTicket, ...prev]);
    logActivity(currentUser.id, 'TICKET_CREATED', `تیکت پشتیبانی با موضوع "${data.subject}" ایجاد شد.`);
  };

  const handleUserSendTicketMessage = (ticketId: string, text: string) => {
    if (!currentUser) return;
    setSupportTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const newMsg: TicketMessage = {
          id: 'tm_' + Date.now(),
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: 'user',
          text,
          timestamp: Date.now()
        };
        return {
          ...t,
          status: 'open',
          updatedAt: Date.now(),
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    }));
  };

  const handleAdminReplyTicket = (ticketId: string, text: string) => {
    setSupportTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const newMsg: TicketMessage = {
          id: 'tm_' + Date.now(),
          senderId: 'admin',
          senderName: 'پشتیبانی مدیریت',
          senderRole: 'admin',
          text,
          timestamp: Date.now()
        };
        if (t.userPhone) {
          import('./services/smsService').then(({ sendSms }) => {
            sendSms(t.userPhone, `پاسخ جدیدی برای تیکت شماره #${t.ticketNumber} ثبت شد.\nجهت مشاهده به پنل کاربری مراجعه کنید.`, 'newMessage');
          });
        }
        return {
          ...t,
          status: 'answered',
          updatedAt: Date.now(),
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    }));
  };

  const handleUpdateTicketStatus = (ticketId: string, status: SupportTicket['status']) => {
    setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, updatedAt: Date.now() } : t));
  };

  const handleHomeFiltersChange = (newFilters: Filters) => {
    setHomeFilters(newFilters);
    if (typeof window !== 'undefined' && page === 'home') {
      const params = new URLSearchParams(window.location.search);
      if (newFilters.category && newFilters.category !== 'all') {
        params.set('category', newFilters.category);
      } else {
        params.delete('category');
      }
      if (newFilters.city) {
        params.set('city', newFilters.city);
      } else {
        params.delete('city');
      }
      if (newFilters.type && newFilters.type !== 'all') {
        params.set('type', newFilters.type);
      } else {
        params.delete('type');
      }
      const q = params.toString();
      const newUrl = q ? `/?${q}` : '/';
      window.history.replaceState({ page: 'home' }, '', newUrl);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const targetPath = page === 'home' ? '/' : `/${page}`;
      if (path !== targetPath && !path.startsWith('/hoomadmin') && !path.startsWith('/hoomeadmin24') && !path.startsWith('/category/')) {
        window.history.replaceState({ page }, '', targetPath);
      }
    }
  }, [page]);

  return (
    <ErrorBoundary>
      <div style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
        <OfflineIndicator />
        {sessionNotice && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[90%] bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-amber-500/50 flex items-center gap-3 animate-fade-in text-xs font-bold" dir="rtl">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div className="flex-grow leading-relaxed">{sessionNotice}</div>
            <button onClick={() => setSessionNotice(null)} className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg text-xs">بستن</button>
          </div>
        )}
        <Suspense fallback={<div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50"><div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-slate-500 font-bold">در حال بارگذاری...</p></div>}>
          {page === 'home' && (
        <HomePage 
          listings={listings.filter(l => l.status === 'approved')} 
          promotionPlans={promotionPlans}
          adSlots={adSlots}
          trustBadges={trustBadges}
          bannerSliderConfig={bannerSliderConfig}
          siteBranding={siteBranding}
          user={currentUser}
          filters={homeFilters}
          categories={categories}
          isAdminAuthenticated={isAdminAuthenticated}
          onFiltersChange={handleHomeFiltersChange}
          onGoToCreate={() => setPage('create')} 
          onGoToAdmin={() => isAdminAuthenticated ? setPage('admin') : setShowAdminLogin(true)} 
          onGoToUser={() => currentUser ? setPage('user') : setShowUserAuth(true)}
          onGoToPwa={() => setPage('pwa')}
          onGoToInstall={() => setPage('install')}
          onToggleLike={(id) => setListings(prev => prev.map(l => l.id === id ? {...l, isLiked: !l.isLiked} : l))}
          onStartChat={(l, s) => { setConversations(prev => [...prev, { id: 'c'+Date.now(), listingId: l.id!, listingTitle: l.title, listingImage: l.images[0], ownerId: l.ownerId!, seekerId: s.id, messages: [], lastUpdate: Date.now() }]); setPage('user'); }}
          onRegister={(n, p) => handleUserRegister({ name: n, phone: p })}
          onLogout={handleLogout}
        />
      )}
      {page === 'create' && (
        <CreateListingPage 
          user={currentUser}
          categories={categories}
          provinces={provinces}
          promotionPlans={promotionPlans}
          listingPackages={listingPackages}
          userPackages={userPackages}
          userListings={listings.filter(l => l.ownerId === currentUser?.id)}
          cardPaymentConfig={cardPaymentConfig}
          zarinPalConfig={zarinPalConfig}
          onListingSubmit={handleListingSubmit} 
          onPromote={handlePromote}
          onSubmitReceipt={handleCreateReceipt}
          onBuyPackage={handleBuyPackage}
          onGoToUser={() => currentUser ? setPage('user') : setShowUserAuth(true)}
          onBackToHome={() => setPage('home')}
        />
      )}
      {page === 'admin' && (
        <AdminPage 
          listings={listings} 
          users={users}
          categories={categories}
          provinces={provinces}
          promotionPlans={promotionPlans}
          listingPackages={listingPackages}
          userPackages={userPackages}
          supportTickets={supportTickets}
          adSlots={adSlots}
          trustBadges={trustBadges}
          bannerSliderConfig={bannerSliderConfig}
          expirationSettings={expirationSettings}
          zarinPalConfig={zarinPalConfig}
          cardPaymentConfig={cardPaymentConfig}
          paymentReceipts={paymentReceipts}
          meliPayamakConfig={meliPayamakConfig}
          conversations={conversations}
          siteBranding={siteBranding}
          onUpdateSiteBranding={(branding) => {
            setSiteBranding(branding);
            safeSaveStorage('siteBranding', branding);
          }}
          dbConnected={dbConnected}
          onBackToHome={() => setPage('home')}
          onBackToPwa={() => setPage('pwa')}
          onLogout={handleLogout}
          onDelete={(id) => setListings(prev => prev.filter(l => l.id !== id))}
          onUpdateStatus={(id, status) => {
            setListings(prev => {
              const updated = prev.map(l => l.id === id ? {...l, status} : l);
              const listing = prev.find(l => l.id === id);
              if (listing) {
                const owner = users.find(u => u.id === listing.ownerId);
                if (owner && owner.phone) {
                  let msg = '';
                  if (status === 'approved') msg = `آگهی شما با عنوان "${listing.title}" تایید و در سایت منتشر شد.`;
                  if (status === 'rejected') msg = `آگهی شما با عنوان "${listing.title}" رد شد. جهت بررسی به پنل کاربری مراجعه کنید.`;
                  if (msg) {
                    import('./services/smsService').then(({ sendSms }) => sendSms(owner.phone, msg, 'adStatus'));
                  }
                }
              }
              return updated;
            });
          }}
          onPromote={handlePromote}
          onUpdatePlans={setPromotionPlans}
          onUpdateListingPackages={setListingPackages}
          onApproveUserPackage={handleApproveUserPackage}
          onRejectUserPackage={handleRejectUserPackage}
          onUpdateTicketStatus={handleUpdateTicketStatus}
          onAdminReplyTicket={handleAdminReplyTicket}
          onUpdateAdSlots={setAdSlots}
          onUpdateTrustBadges={setTrustBadges}
          onUpdateBannerSliderConfig={setBannerSliderConfig}
          onUpdateExpiration={setExpirationSettings}
          onUpdateZarinPal={setZarinPalConfig}
          onUpdateCardPayment={setCardPaymentConfig}
          onApproveReceipt={handleApproveReceipt}
          onRejectReceipt={handleRejectReceipt}
          onUpdateMeliPayamak={setMeliPayamakConfig}
          onUpdateCategories={setCategories}
          onUpdateProvinces={setProvinces}
          onUpdateUser={(uid, up) => setUsers(prev => {
            const exists = prev.find(u => u.id === uid);
            if (exists) {
              return prev.map(u => u.id === uid ? {...u, ...up} : u);
            }
            return [...prev, { ...up, id: uid } as User];
          })}
          onDeleteUser={(uid) => setUsers(prev => prev.filter(u => u.id !== uid))}
          onRegisterAiHandler={setActiveAiHandler}
          onUpdateAdminCredentials={(username, passwordHash) => {
            const newCreds = { username, passwordHash };
            setAdminCredentials(newCreds);
            localStorage.setItem('ADMIN_CREDS', JSON.stringify(newCreds));
          }}
        />
      )}
      {page === 'user' && (
        <UserPanelPage 
          user={currentUser}
          initialTab={userPanelTab}
          listings={listings}
          categories={categories}
          promotionPlans={promotionPlans}
          listingPackages={listingPackages}
          userPackages={userPackages}
          supportTickets={supportTickets}
          conversations={conversations}
          paymentReceipts={paymentReceipts}
          cardPaymentConfig={cardPaymentConfig}
          zarinPalConfig={zarinPalConfig}
          siteBranding={siteBranding}
          onGoToCreate={() => setPage('create')}
          onBackToHome={() => setPage('home')}
          onBackToPwa={() => setPage('pwa')}
          onLogout={handleLogout}
          onDelete={(id) => setListings(prev => prev.filter(l => l.id !== id))}
          onToggleLike={(id) => setListings(prev => prev.map(l => l.id === id ? {...l, isLiked: !l.isLiked} : l))}
          onPromote={handlePromote}
          onSubmitReceipt={handleCreateReceipt}
          onBuyPackage={handleBuyPackage}
          onCreateTicket={handleCreateTicket}
          onSendTicketMessage={handleUserSendTicketMessage}
          onSendMessage={(cid, text) => {
            setConversations(prev => {
              const updated = prev.map(c => c.id === cid ? {...c, messages: [...c.messages, {id: 'm'+Date.now(), senderId: currentUser?.id!, text, timestamp: Date.now()}], lastUpdate: Date.now()} : c);
              const conv = updated.find(c => c.id === cid);
              if (conv) {
                const receiverId = conv.ownerId === currentUser?.id ? conv.seekerId : conv.ownerId;
                const receiver = users.find(u => u.id === receiverId);
                if (receiver && receiver.phone) {
                  import('./services/smsService').then(({ sendSms }) => {
                    sendSms(receiver.phone, `پیام جدیدی در مورد آگهی "${conv.listingTitle}" دریافت کردید.\nمتن پیام: ${text}`, 'newMessage');
                  });
                }
              }
              return updated;
            });
          }}
        />
      )}
      {page === 'pwa' && (
        <MobileAppPage 
          listings={listings.filter(l => l.status === 'approved')} 
          promotionPlans={promotionPlans}
          adSlots={adSlots}
          user={currentUser}
          conversations={conversations}
          categories={categories}
          siteBranding={siteBranding}
          onGoToCreate={() => setPage('create')} 
          onGoToUser={(t) => { 
            if (t) {
              const tabMap: Record<string, 'my-ads' | 'packages' | 'messages' | 'tickets' | 'payments' | 'favorites'> = {
                'ads': 'my-ads',
                'my-ads': 'my-ads',
                'packages': 'packages',
                'messages': 'messages',
                'chats': 'messages',
                'tickets': 'tickets',
                'payments': 'payments',
                'likes': 'favorites',
                'favorites': 'favorites'
              };
              setUserPanelTab(tabMap[t] || 'my-ads');
            } else {
              setUserPanelTab('my-ads');
            }
            if (!currentUser) {
              setShowUserAuth(true);
            } else { 
              setPage('user'); 
            }
          }}
          onToggleLike={(id) => setListings(prev => prev.map(l => l.id === id ? {...l, isLiked: !l.isLiked} : l))}
          onStartChat={(l, s) => { 
            const existing = conversations.find(c => c.listingId === l.id && c.seekerId === s.id);
            if(!existing) setConversations(prev => [...prev, { id: 'c'+Date.now(), listingId: l.id!, listingTitle: l.title, listingImage: l.images[0], ownerId: l.ownerId!, seekerId: s.id, messages: [], lastUpdate: Date.now() }]); 
            setUserPanelTab('messages');
            setPage('user'); 
          }}
          onRegister={(n, p) => handleUserRegister({ name: n, phone: p })}
          onLogout={handleLogout}
          onSendCommand={handleGlobalAiCommand}
          registerAiNavigate={(fn) => { pwaNavigateRef.current = fn; }}
          registerAiFilter={(fn) => { pwaFilterRef.current = fn; }}
          onGoToDesktop={() => {
            if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pref_desktop', 'true');
            setPage('home');
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
          }}
        />
      )}
      {page === 'install' && (
        <InstallPage 
          onSetupSuccess={(creds) => {
            setAdminCredentials(creds);
            setDbConnected(true);
            setPage('home');
            window.history.pushState({}, '', '/');
          }}
          onBackToHome={() => {
            setPage('home');
            window.history.pushState({}, '', '/');
          }}
        />
      )}
      </Suspense>
      {showAdminLogin && (
        <AdminLoginModal 
          onClose={() => { 
            setShowAdminLogin(false); 
            setPage('home'); 
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/'); 
          }} 
          onLogin={handleAdminLogin} 
          siteBranding={siteBranding}
        />
      )}
      {showUserAuth && (
        <UserLoginModal 
          onClose={() => setShowUserAuth(false)} 
          onLogin={handleUserLogin} 
          onRegister={handleUserRegister} 
          onPasswordReset={handlePasswordReset} 
          users={users} 
          passwordPolicy={siteBranding?.passwordPolicy}
        />
      )}
      
      {isAiAssistantOpen && (
        <AiAssistant 
          onClose={() => setIsAiAssistantOpen(false)} 
          onSendCommand={handleGlobalAiCommand} 
        />
      )}

      {/* Floating global AI button: دستیار ملک */}
      {page !== 'pwa' && !isAiAssistantOpen && (
        <button 
          onClick={() => setIsAiAssistantOpen(true)} 
          className="fixed bottom-6 left-6 z-[100] group flex items-center gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white pl-5 pr-3.5 py-2.5 rounded-full shadow-[0_10px_35px_rgba(79,70,229,0.35)] hover:shadow-indigo-500/40 border border-indigo-500/30 hover:border-indigo-400 hover:scale-105 transition-all duration-300 cursor-pointer animate-fade-in"
          title="دستیار هوشمند ملک"
        >
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 flex items-center justify-center text-white shadow-md p-2.5 group-hover:rotate-12 transition-transform duration-300">
              <Building2 className="w-full h-full stroke-[2.2]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
            </span>
          </div>
          <div className="flex flex-col items-start pr-1 text-right">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">دستیار ملک</span>
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            </div>
            <span className="text-[10px] font-bold text-indigo-200/80">مشاور هوشمند</span>
          </div>
        </button>
      )}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />
      </div>
    </ErrorBoundary>
  );
};

export default App;
