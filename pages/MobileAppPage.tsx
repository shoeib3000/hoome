import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Search, 
  MessageSquare, 
  User as UserIcon, 
  Plus, 
  Smartphone, 
  Download, 
  Bell, 
  ChevronLeft, 
  Building2, 
  LogOut, 
  Monitor, 
  Heart, 
  X,
  SlidersHorizontal,
  Compass,
  Package,
  CreditCard,
  Headphones,
  MapPin,
  Check,
  PhoneCall,
  Calendar,
  Share2,
  Grid,
  ListFilter,
  LayoutGrid,
  Sparkles,
  Flame,
  ArrowUpDown,
  Filter,
  Clock,
  Camera,
  Layers,
  ArrowLeft
} from 'lucide-react';
import type { 
  PropertyListing, 
  User, 
  PromotionPlan, 
  AdSlot, 
  Conversation, 
  Category, 
  BannerSliderConfig, 
  SiteBrandingConfig 
} from '../types';
import ListingDetailModal from '../components/ListingDetailModal';
import BannerSlider from '../components/BannerSlider';

interface MobileAppPageProps {
  listings: PropertyListing[];
  promotionPlans: PromotionPlan[];
  adSlots: AdSlot[];
  bannerSliderConfig?: BannerSliderConfig;
  user: User | null;
  conversations: Conversation[];
  categories?: Category[];
  onGoToCreate: () => void;
  onGoToUser: (tab?: string) => void;
  onToggleLike: (id: string) => void;
  onStartChat: (listing: PropertyListing, seeker: User) => void;
  onRegister: (name: string, phone: string) => Promise<User> | User | void;
  onLogout: () => void;
  onSendCommand?: (command: string) => Promise<string>;
  registerAiNavigate?: (navigateFn: (tab: 'home' | 'search' | 'chats' | 'profile') => void) => void;
  registerAiFilter?: (filterFn: (filters: any) => void) => void;
  siteBranding?: SiteBrandingConfig;
  onGoToDesktop?: () => void;
}

const POPULAR_CITIES = ['همه شهرها', 'تهران', 'مشهد', 'اصفهان', 'شیراز', 'کرج', 'تبریز', 'رشت', 'قم', 'اهواز'];

type SortOption = 'newest' | 'cheapest' | 'expensive' | 'largest';
type ViewMode = 'cards' | 'compact';

const MobileAppPage: React.FC<MobileAppPageProps> = ({ 
  listings, 
  promotionPlans, 
  adSlots, 
  bannerSliderConfig,
  user, 
  conversations,
  categories = [],
  onGoToCreate, 
  onGoToUser, 
  onToggleLike, 
  onStartChat, 
  onRegister,
  onLogout,
  siteBranding,
  onGoToDesktop
}) => {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'chats' | 'profile'>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  
  // Filter States
  const [dealType, setDealType] = useState<'all' | 'sale' | 'rent'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchCity, setSearchCity] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [onlyPhotos, setOnlyPhotos] = useState<boolean>(false);
  const [onlyPromoted, setOnlyPromoted] = useState<boolean>(false);
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'under2b' | '2to5b' | 'above5b'>('all');
  const [sizeFilter, setSizeFilter] = useState<'all' | 'under70' | '70to120' | 'above120'>('all');

  // Modals & Triggers
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger Toast Notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // PWA Installation Detector
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwaClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsPwaInstalled(true);
        showToast('اپلیکیشن با موفقیت روی گوشی شما نصب شد');
      }
      setDeferredPrompt(null);
      setShowPwaInstallModal(false);
    } else {
      setShowPwaInstallModal(true);
    }
  };

  // Distinct cities from actual listings for City Selector
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    listings.forEach(l => {
      if (l.city && l.city.trim()) set.add(l.city.trim());
    });
    POPULAR_CITIES.forEach(c => {
      if (c !== 'همه شهرها') set.add(c);
    });
    return Array.from(set);
  }, [listings]);

  // Dynamic Categories from Admin with Count of Listings
  const dynamicCategories = useMemo(() => {
    const defaultPalette = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
      'bg-teal-50 text-teal-700 border-teal-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200'
    ];

    const list = [
      { 
        id: 'all', 
        name: 'همه املاک', 
        icon: '🏠', 
        colorClass: defaultPalette[0],
        count: listings.length 
      }
    ];

    (categories || []).forEach((cat, index) => {
      // Calculate how many listings match this category
      const count = listings.filter(l => {
        const lCat = (l.category || '').toLowerCase().trim();
        const cName = cat.name.toLowerCase().trim();
        const cId = cat.id.toLowerCase().trim();
        return (
          lCat === cName || 
          lCat === cId ||
          (cName.includes('آپارتمان') && (lCat.includes('apt') || lCat.includes('apartment'))) ||
          (cName.includes('ویلا') && (lCat.includes('villa') || lCat.includes('house'))) ||
          (cName.includes('اداری') && (lCat.includes('office') || lCat.includes('commercial'))) ||
          (cName.includes('زمین') && (lCat.includes('land') || lCat.includes('colongy')))
        );
      }).length;

      list.push({
        id: cat.name,
        name: cat.name,
        icon: cat.icon || '🏢',
        colorClass: defaultPalette[(index + 1) % defaultPalette.length],
        count
      });
    });

    return list;
  }, [categories, listings]);

  // Main Listings Filter & Sort
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      // 1. City Filter
      if (searchCity && searchCity !== 'همه شهرها') {
        const c = (l.city || '').toLowerCase().trim();
        if (!c.includes(searchCity.toLowerCase().trim())) return false;
      }

      // 2. Keyword Filter (Title or Neighborhood)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        const inTitle = (l.title || '').toLowerCase().includes(kw);
        const inCity = (l.city || '').toLowerCase().includes(kw);
        const inNeigh = (l.neighborhood || '').toLowerCase().includes(kw);
        const inKeyFeatures = (l.keyFeatures || '').toLowerCase().includes(kw);
        if (!inTitle && !inCity && !inNeigh && !inKeyFeatures) return false;
      }

      // 3. Category Filter
      if (selectedCategory && selectedCategory !== 'all') {
        const lCat = (l.category || '').toLowerCase().trim();
        const sel = selectedCategory.toLowerCase().trim();
        const catObj = (categories || []).find(c => c.name === selectedCategory || c.id === selectedCategory);

        const match = (
          lCat === sel ||
          (catObj && lCat === catObj.name.toLowerCase()) ||
          (catObj && lCat === catObj.id.toLowerCase()) ||
          (sel.includes('آپارتمان') && (lCat.includes('apartment') || lCat.includes('apt') || lCat.includes('آپارتمان'))) ||
          (sel.includes('ویلا') && (lCat.includes('house') || lCat.includes('villa') || lCat.includes('ویلا'))) ||
          (sel.includes('اداری') && (lCat.includes('office') || lCat.includes('تجاری') || lCat.includes('اداری'))) ||
          (sel.includes('زمین') && (lCat.includes('land') || lCat.includes('colongy') || lCat.includes('زمین')))
        );
        if (!match) return false;
      }

      // 4. Deal Type Filter
      if (dealType !== 'all') {
        if (l.type !== dealType) return false;
      }

      // 5. Photos Only Filter
      if (onlyPhotos && (!l.images || l.images.length === 0)) {
        return false;
      }

      // 6. Promoted Only Filter
      if (onlyPromoted && (!l.promotion || l.promotion === 'free')) {
        return false;
      }

      // 7. Budget Filter
      if (budgetFilter !== 'all') {
        const priceNum = Number(l.price) || Number(l.deposit) || 0;
        if (budgetFilter === 'under2b' && priceNum > 2000000000) return false;
        if (budgetFilter === '2to5b' && (priceNum < 2000000000 || priceNum > 5000000000)) return false;
        if (budgetFilter === 'above5b' && priceNum < 5000000000) return false;
      }

      // 8. Size Filter
      if (sizeFilter !== 'all') {
        const sizeNum = Number(l.size) || 0;
        if (sizeFilter === 'under70' && sizeNum > 70) return false;
        if (sizeFilter === '70to120' && (sizeNum < 70 || sizeNum > 120)) return false;
        if (sizeFilter === 'above120' && sizeNum < 120) return false;
      }

      return true;
    }).sort((a, b) => {
      // 1. Promoted / VIP Priority
      const planA = (promotionPlans || []).find(p => p.id === a.promotion)?.priorityLevel || 0;
      const planB = (promotionPlans || []).find(p => p.id === b.promotion)?.priorityLevel || 0;
      if (planB !== planA) return planB - planA;

      // 2. Custom Sort Order
      if (sortBy === 'cheapest') {
        const pA = Number(a.price) || Number(a.deposit) || 0;
        const pB = Number(b.price) || Number(b.deposit) || 0;
        return pA - pB;
      }
      if (sortBy === 'expensive') {
        const pA = Number(a.price) || Number(a.deposit) || 0;
        const pB = Number(b.price) || Number(b.deposit) || 0;
        return pB - pA;
      }
      if (sortBy === 'largest') {
        return (Number(b.size) || 0) - (Number(a.size) || 0);
      }

      // Default: Newest
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [listings, searchCity, searchKeyword, selectedCategory, dealType, onlyPhotos, onlyPromoted, budgetFilter, sizeFilter, sortBy, categories, promotionPlans]);

  // Featured Promoted Listings
  const featuredListings = useMemo(() => {
    return listings.filter(l => {
      const plan = (promotionPlans || []).find(p => p.id === l.promotion);
      return plan && plan.priorityLevel >= 2;
    }).slice(0, 8);
  }, [listings, promotionPlans]);

  // User Specific Conversations
  const userConversations = useMemo(() => {
    if (!user) return [];
    return (conversations || []).filter(c => c.ownerId === user.id || c.seekerId === user.id);
  }, [conversations, user]);

  // Format Persian Price with Unit
  const formatPrice = (val?: string | number) => {
    if (!val || val === '0') return 'توافقی';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 1000000000) {
      const b = (num / 1000000000).toFixed(1).replace('.0', '');
      return `${new Intl.NumberFormat('fa-IR').format(Number(b))} میلیارد تومان`;
    }
    if (num >= 1000000) {
      const m = (num / 1000000).toFixed(0);
      return `${new Intl.NumberFormat('fa-IR').format(Number(m))} میلیون تومان`;
    }
    return `${new Intl.NumberFormat('fa-IR').format(num)} تومان`;
  };

  // Calculate Price Per Square Meter for Sale Properties
  const getPricePerMeter = (price?: string | number, size?: string | number) => {
    const p = Number(price);
    const s = Number(size);
    if (!p || !s || s <= 0) return null;
    const perMeter = Math.round(p / s);
    if (perMeter >= 1000000) {
      const m = (perMeter / 1000000).toFixed(1).replace('.0', '');
      return `متری ${new Intl.NumberFormat('fa-IR').format(Number(m))} میلیون`;
    }
    return `متری ${new Intl.NumberFormat('fa-IR').format(perMeter)}`;
  };

  // Handle Share
  const handleShare = async (e: React.MouseEvent, listing: PropertyListing) => {
    e.stopPropagation();
    const title = listing.title;
    const text = `${listing.title} در ${listing.city} - قیمت: ${formatPrice(listing.price)}`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        showToast('آگهی به اشتراک گذاشته شد');
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard?.writeText(`${text}\n${url}`);
      showToast('لینک آگهی کپی شد');
    }
  };

  // Direct Call Action
  const handleCallOwner = (e: React.MouseEvent, listing: PropertyListing) => {
    e.stopPropagation();
    const phone = listing.contactPhone || (listing.contact && listing.contact.phone);
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      setSelectedListing(listing);
    }
  };

  // Direct Chat Action
  const handleChatOwner = (e: React.MouseEvent, listing: PropertyListing) => {
    e.stopPropagation();
    if (!user) {
      setSelectedListing(listing);
      showToast('برای شروع گفتگو وارد حساب کاربری خود شوید');
    } else {
      onStartChat(listing, user);
    }
  };

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    searchKeyword || 
    (searchCity && searchCity !== 'همه شهرها') || 
    selectedCategory !== 'all' || 
    dealType !== 'all' || 
    onlyPhotos || 
    onlyPromoted || 
    budgetFilter !== 'all' || 
    sizeFilter !== 'all'
  );

  const resetAllFilters = () => {
    setSearchKeyword('');
    setSearchCity('');
    setSelectedCategory('all');
    setDealType('all');
    setOnlyPhotos(false);
    setOnlyPromoted(false);
    setBudgetFilter('all');
    setSizeFilter('all');
    setSortBy('newest');
    showToast('همه فیلترها پاک شدند');
  };

  // ==========================================
  // RENDER: Featured Card View (Full Visual Mode)
  // ==========================================
  const renderFeaturedCard = (listing: PropertyListing) => {
    const plan = (promotionPlans || []).find(p => p.id === listing.promotion);
    const isSpecial = plan && plan.priorityLevel >= 3;
    const isLadder = listing.promotion === 'ladder';
    const imgUrl = listing.images && listing.images.length > 0 
      ? listing.images[0] 
      : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80';
    const photosCount = listing.images ? listing.images.length : 0;
    const perMeterText = listing.type === 'sale' ? getPricePerMeter(listing.price, listing.size) : null;

    return (
      <motion.div
        key={`card-${listing.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setSelectedListing(listing)}
        className={`bg-white rounded-3xl overflow-hidden border transition-all cursor-pointer shadow-xs hover:shadow-md ${
          isSpecial 
            ? 'border-amber-300 ring-2 ring-amber-400/20' 
            : 'border-slate-100 hover:border-slate-200'
        }`}
      >
        {/* Card Image Banner */}
        <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
          <img 
            src={imgUrl} 
            alt={listing.title} 
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
            loading="lazy"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-3 right-3 left-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {plan && (
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-md backdrop-blur-md flex items-center gap-1 ${
                  isSpecial ? 'bg-amber-400 text-slate-950' : 'bg-slate-900/90 text-white'
                }`}>
                  <Sparkles className="w-3 h-3" />
                  {plan.title}
                </span>
              )}
              {isLadder && (
                <span className="text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-md backdrop-blur-md">
                  نردبان
                </span>
              )}
              <span className="text-[10px] font-bold bg-white/90 text-slate-800 px-2.5 py-1 rounded-full shadow-md backdrop-blur-md">
                {listing.type === 'rent' ? 'رهن و اجاره' : 'خرید و فروش'}
              </span>
            </div>

            {/* Like & Share Buttons */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => handleShare(e, listing)}
                className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-md active:scale-90 transition-all backdrop-blur-md"
                aria-label="اشتراک‌گذاری"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (listing.id) {
                    onToggleLike(listing.id);
                    showToast(listing.isLiked ? 'از نشان‌شده‌ها حذف شد' : 'به نشان‌شده‌ها افزوده شد');
                  }
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all backdrop-blur-md ${
                  listing.isLiked 
                    ? 'bg-rose-500 text-white' 
                    : 'bg-white/90 hover:bg-white text-slate-700'
                }`}
                aria-label="نشان کردن"
              >
                <Heart className={`w-4 h-4 ${listing.isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bottom Image Info: Price & Photos count */}
          <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between text-white pointer-events-none">
            <div className="min-w-0 pr-1">
              {listing.type === 'rent' ? (
                <div className="space-y-0.5">
                  <div className="text-xs font-black drop-shadow-md">
                    <span className="text-white/80 font-normal text-[10px] ml-1">ودیعه:</span>
                    {formatPrice(listing.deposit || listing.price)}
                  </div>
                  {listing.rent && (
                    <div className="text-[11px] font-bold text-amber-300 drop-shadow-md">
                      <span className="text-white/80 font-normal text-[10px] ml-1">اجاره ماهیانه:</span>
                      {formatPrice(listing.rent)}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-sm font-black drop-shadow-md text-white">
                    {formatPrice(listing.price)}
                  </div>
                  {perMeterText && (
                    <div className="text-[10px] font-bold text-amber-300 drop-shadow-md">
                      {perMeterText}
                    </div>
                  )}
                </div>
              )}
            </div>

            {photosCount > 0 && (
              <span className="text-[10px] font-bold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                <Camera className="w-3 h-3 text-slate-300" />
                {photosCount} عکس
              </span>
            )}
          </div>
        </div>

        {/* Card Content Details */}
        <div className="p-4 space-y-3">
          {/* Title & Neighborhood */}
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-1 mb-1">
              {listing.title}
            </h3>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {listing.city} {listing.neighborhood ? `· ${listing.neighborhood}` : ''}
              </span>
            </div>
          </div>

          {/* Quick Specs Chips */}
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded-2xl border border-slate-100/80">
            {listing.size ? (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {new Intl.NumberFormat('fa-IR').format(Number(listing.size))} متر
              </span>
            ) : null}
            {listing.bedrooms ? (
              <>
                <span className="text-slate-300">|</span>
                <span>{listing.bedrooms} خواب</span>
              </>
            ) : null}
            {listing.yearBuilt || listing.builtYear ? (
              <>
                <span className="text-slate-300">|</span>
                <span>ساخت {listing.yearBuilt || listing.builtYear}</span>
              </>
            ) : null}
            {listing.category && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-indigo-600 truncate">{listing.category}</span>
              </>
            )}
          </div>

          {/* Actions Bar: Call + Chat */}
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => handleCallOwner(e, listing)}
              className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-emerald-200/60 active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>تماس سریع</span>
            </button>
            <button
              type="button"
              onClick={(e) => handleChatOwner(e, listing)}
              className="flex-1 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-indigo-200/60 active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>گفتگو</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // ==========================================
  // RENDER: Compact List View (Fast Scanner Mode)
  // ==========================================
  const renderCompactCard = (listing: PropertyListing) => {
    const plan = (promotionPlans || []).find(p => p.id === listing.promotion);
    const isSpecial = plan && plan.priorityLevel >= 3;
    const isLadder = listing.promotion === 'ladder';
    const imgUrl = listing.images && listing.images.length > 0 
      ? listing.images[0] 
      : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80';

    return (
      <motion.div
        key={`compact-${listing.id}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => setSelectedListing(listing)}
        className={`bg-white rounded-2xl p-3 border transition-all cursor-pointer relative shadow-xs hover:shadow-md flex gap-3 ${
          isSpecial ? 'border-amber-300 bg-amber-50/15' : 'border-slate-100'
        }`}
      >
        {/* Left Thumbnail */}
        <div className="w-24 h-24 rounded-xl overflow-hidden relative shrink-0 bg-slate-100">
          <img 
            src={imgUrl} 
            alt={listing.title} 
            className="w-full h-full object-cover" 
            loading="lazy"
          />
          {plan && (
            <span className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow">
              ویژه
            </span>
          )}
          <span className="absolute bottom-1.5 right-1.5 bg-slate-900/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
            {listing.type === 'rent' ? 'اجاره' : 'فروش'}
          </span>
        </div>

        {/* Center & Right Details */}
        <div className="flex flex-col justify-between flex-grow min-w-0 py-0.5">
          <div>
            <div className="flex items-start justify-between gap-1 mb-1">
              <h3 className="text-xs font-black text-slate-900 line-clamp-1">
                {listing.title}
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (listing.id) {
                    onToggleLike(listing.id);
                    showToast(listing.isLiked ? 'از نشان‌شده‌ها حذف شد' : 'به نشان‌شده‌ها افزوده شد');
                  }
                }}
                className={`p-1 rounded-lg transition-all shrink-0 active:scale-90 ${
                  listing.isLiked ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-rose-500'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${listing.isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mb-1.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{listing.city} {listing.neighborhood ? `· ${listing.neighborhood}` : ''}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
              {listing.size && <span>{listing.size} م</span>}
              {listing.bedrooms && <span>· {listing.bedrooms} خ</span>}
              {listing.category && <span className="text-indigo-600 truncate">· {listing.category}</span>}
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-indigo-600">
              {listing.type === 'rent' 
                ? `${formatPrice(listing.deposit || listing.price)}` 
                : formatPrice(listing.price)}
            </span>
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              {isLadder && <span className="text-amber-600 bg-amber-50 px-1 py-0.2 rounded font-bold">نردبان</span>}
              <span>{listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('fa-IR') : 'امروز'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ==========================================
  // TAB 1: HOME FEED VIEW
  // ==========================================
  const renderHome = () => (
    <motion.div
      key="tab-home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pb-28 pt-2 space-y-4"
    >
      {/* 1. Quick Search Box Trigger */}
      <div 
        onClick={() => setActiveTab('search')}
        className="w-full bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-slate-400">
          <Search className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-500">
            {searchKeyword ? `جستجو: «${searchKeyword}»` : 'جستجوی ملک، محله، خیابان...'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-xl">
          <Filter className="w-3 h-3" />
          <span>فیلترها</span>
        </div>
      </div>

      {/* 2. Quick Deal Type Segmented Bar */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
        <button
          onClick={() => setDealType('all')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            dealType === 'all' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          همه معاملات
        </button>
        <button
          onClick={() => setDealType('sale')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            dealType === 'sale' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          خرید و فروش
        </button>
        <button
          onClick={() => setDealType('rent')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            dealType === 'rent' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          رهن و اجاره
        </button>
      </div>

      {/* 3. Dynamic Categories Slider (Strictly synced with Admin) */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-indigo-600" /> دسته‌بندی‌های املاک
          </span>
          {selectedCategory !== 'all' && (
            <button 
              onClick={() => setSelectedCategory('all')}
              className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              <span>نمایش همه</span>
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {dynamicCategories.map((cat) => {
            const isSelected = selectedCategory === cat.name || (cat.id === 'all' && selectedCategory === 'all');
            return (
              <button
                key={`cat-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id === 'all' ? 'all' : cat.name)}
                className="flex flex-col items-center gap-1.5 shrink-0 group transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-xs relative ${
                  isSelected 
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-500 ring-offset-2 scale-105' 
                    : 'bg-white text-slate-700 border border-slate-200/80 hover:border-indigo-300'
                }`}>
                  <span>{cat.icon}</span>
                  {cat.count > 0 && (
                    <span className={`absolute -top-1 -right-1 text-[8px] font-black px-1.5 py-0.2 rounded-full border ${
                      isSelected 
                        ? 'bg-amber-400 text-slate-900 border-white' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {cat.count}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-black truncate max-w-[68px] ${
                  isSelected ? 'text-indigo-600' : 'text-slate-600'
                }`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Hero Banner Slider (from Admin Config) */}
      <div className="rounded-2xl overflow-hidden shadow-xs">
        <BannerSlider ads={adSlots} position="hero" config={bannerSliderConfig} />
      </div>

      {/* 5. Featured Promoted Properties Carousel */}
      {featuredListings.length > 0 && selectedCategory === 'all' && dealType === 'all' && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              فایل‌های ویژه و برگزیده
            </span>
            <span className="text-[10px] font-bold text-slate-400">پیشنهادات داغ</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {featuredListings.map((listing) => (
              <div
                key={`feat-${listing.id}`}
                onClick={() => setSelectedListing(listing)}
                className="w-60 shrink-0 bg-white rounded-2xl p-3 border border-amber-200/90 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="aspect-[4/3] rounded-xl overflow-hidden relative mb-2 bg-slate-100">
                  <img 
                    src={listing.images[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80'} 
                    alt={listing.title} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                    ویژه
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 line-clamp-1 mb-1">{listing.title}</h4>
                  <p className="text-[10px] text-slate-400 font-bold mb-2 truncate">{listing.city} {listing.neighborhood ? `· ${listing.neighborhood}` : ''}</p>
                  <p className="text-xs font-black text-indigo-600">{formatPrice(listing.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Feed Controls: Sorting, View Mode & Filters */}
      <div className="pt-2">
        <div className="flex items-center justify-between bg-white rounded-2xl p-2.5 border border-slate-100 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-800">
              {filteredListings.length} آگهی
            </span>
            {hasActiveFilters && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                فیلتر فعال
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl px-2 py-1 outline-none"
            >
              <option value="newest">جدیدترین</option>
              <option value="cheapest">ارزان‌ترین</option>
              <option value="expensive">گران‌ترین</option>
              <option value="largest">بزرگ‌ترین متراژ</option>
            </select>

            {/* View Mode Toggle: Cards vs Compact */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="نمای کارتی بزرگ"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'compact' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="نمای فشرده"
              >
                <ListFilter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Clear Button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] text-slate-400 font-medium">
              نتایج بر اساس فیلترهای انتخابی شما مرتب شدند.
            </span>
            <button
              onClick={resetAllFilters}
              className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>پاک کردن فیلترها</span>
            </button>
          </div>
        )}
      </div>

      {/* 7. Property Feed List */}
      <div className="space-y-3.5 pt-1">
        {filteredListings.length > 0 ? (
          viewMode === 'cards' 
            ? filteredListings.map(renderFeaturedCard)
            : filteredListings.map(renderCompactCard)
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 p-6 space-y-3">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-2xl">
              🔍
            </div>
            <h3 className="text-sm font-black text-slate-800">هیچ ملکی با این فیلترها یافت نشد</h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              می‌توانید فیلتر شهر، دسته‌بندی یا کلمات جستجو را تغییر دهید تا آگهی‌های دیگر نمایش داده شوند.
            </p>
            <button
              onClick={resetAllFilters}
              className="px-4 py-2.5 bg-indigo-600 text-white font-black text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              مشاهده تمامی املاک
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );

  // ==========================================
  // TAB 2: ADVANCED SEARCH & FILTER VIEW
  // ==========================================
  const renderSearch = () => (
    <motion.div
      key="tab-search"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pb-28 pt-2 space-y-4"
    >
      {/* 1. Header with clear button */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">جستجوی هوشمند ملک</h2>
          <p className="text-[11px] text-slate-400 font-medium">فیلتر دقیق بر اساس شهر، قیمت و دسته‌بندی</p>
        </div>
        {hasActiveFilters && (
          <button 
            onClick={resetAllFilters}
            className="text-xs font-black text-rose-500 hover:underline bg-rose-50 px-2.5 py-1 rounded-xl"
          >
            پاک کردن همه
          </button>
        )}
      </div>

      {/* 2. Keyword Search Input */}
      <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 mr-1" />
        <input 
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="جستجو در عنوان ملک، محله یا ویژگی‌ها..."
          className="w-full text-xs font-bold text-slate-800 outline-none bg-transparent placeholder:text-slate-400"
        />
        {searchKeyword && (
          <button onClick={() => setSearchKeyword('')} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. Transaction Deal Type */}
      <div>
        <div className="text-[11px] font-black text-slate-600 mb-2">نوع معامله:</div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setDealType('all')}
            className={`py-2 text-xs font-black rounded-xl border transition-all ${
              dealType === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            همه
          </button>
          <button
            onClick={() => setDealType('sale')}
            className={`py-2 text-xs font-black rounded-xl border transition-all ${
              dealType === 'sale' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            خرید و فروش
          </button>
          <button
            onClick={() => setDealType('rent')}
            className={`py-2 text-xs font-black rounded-xl border transition-all ${
              dealType === 'rent' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            رهن و اجاره
          </button>
        </div>
      </div>

      {/* 4. City Quick Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black text-slate-600">انتخاب شهر:</span>
          <button 
            onClick={() => setShowCityModal(true)}
            className="text-[11px] font-bold text-indigo-600 hover:underline"
          >
            سایر شهرها...
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {POPULAR_CITIES.map((city) => {
            const isSelected = (city === 'همه شهرها' && !searchCity) || searchCity === city;
            return (
              <button
                key={city}
                onClick={() => setSearchCity(city === 'همه شهرها' ? '' : city)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Dynamic Category Chips */}
      <div>
        <div className="text-[11px] font-black text-slate-600 mb-2">دسته‌بندی ملک:</div>
        <div className="flex flex-wrap gap-2">
          {dynamicCategories.map((c) => {
            const isSelected = selectedCategory === c.name || (c.id === 'all' && selectedCategory === 'all');
            return (
              <button
                key={`search-cat-${c.id}`}
                onClick={() => setSelectedCategory(c.id === 'all' ? 'all' : c.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.name}</span>
                {c.count > 0 && <span className="opacity-70 text-[10px]">({c.count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Budget Range Filter */}
      <div>
        <div className="text-[11px] font-black text-slate-600 mb-2">محدوده بودجه / قیمت:</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setBudgetFilter('all')}
            className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
              budgetFilter === 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            همه بودجه‌ها
          </button>
          <button
            onClick={() => setBudgetFilter('under2b')}
            className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
              budgetFilter === 'under2b' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            زیر ۲ میلیارد تومان
          </button>
          <button
            onClick={() => setBudgetFilter('2to5b')}
            className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
              budgetFilter === '2to5b' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            ۲ تا ۵ میلیارد تومان
          </button>
          <button
            onClick={() => setBudgetFilter('above5b')}
            className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
              budgetFilter === 'above5b' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            بالای ۵ میلیارد تومان
          </button>
        </div>
      </div>

      {/* 7. Size Filter */}
      <div>
        <div className="text-[11px] font-black text-slate-600 mb-2">متراژ:</div>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setSizeFilter('all')}
            className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
              sizeFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            همه
          </button>
          <button
            onClick={() => setSizeFilter('under70')}
            className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
              sizeFilter === 'under70' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            زیر ۷۰ م
          </button>
          <button
            onClick={() => setSizeFilter('70to120')}
            className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
              sizeFilter === '70to120' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            ۷۰ تا ۱۲۰ م
          </button>
          <button
            onClick={() => setSizeFilter('above120')}
            className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
              sizeFilter === 'above120' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            بالای ۱۲۰ م
          </button>
        </div>
      </div>

      {/* 8. Quick Switches: Photos Only & Promoted Only */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => setOnlyPhotos(!onlyPhotos)}
          className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between ${
            onlyPhotos ? 'bg-indigo-50 border-indigo-400 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <span className="text-xs font-black">فقط عکس‌دار</span>
          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
            onlyPhotos ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
          }`}>
            {onlyPhotos && <Check className="w-3 h-3" />}
          </div>
        </button>

        <button
          onClick={() => setOnlyPromoted(!onlyPromoted)}
          className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between ${
            onlyPromoted ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <span className="text-xs font-black">فقط فایل‌های ویژه</span>
          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
            onlyPromoted ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'
          }`}>
            {onlyPromoted && <Check className="w-3 h-3" />}
          </div>
        </button>
      </div>

      {/* 9. Results Summary & Button */}
      <div className="pt-2">
        <button
          onClick={() => setActiveTab('home')}
          className="w-full py-3.5 bg-indigo-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>مشاهده {filteredListings.length} ملک منطبق با جستجو</span>
        </button>
      </div>
    </motion.div>
  );

  // ==========================================
  // TAB 3: CHATS VIEW
  // ==========================================
  const renderChats = () => (
    <motion.div
      key="tab-chats"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pb-28 pt-2 space-y-4"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">گفتگوها و پیام‌ها</h2>
          <p className="text-[11px] text-slate-400 font-medium">ارتباط مستقیم با خریداران و مالکین</p>
        </div>
        <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl">
          {userConversations.length} گفتگو
        </span>
      </div>

      {!user ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-black text-slate-800">برای مشاهده پیام‌ها وارد شوید</h3>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            با ورود به حساب کاربری، می‌توانید به تمام پیام‌ها و چت‌های خود دسترسی داشته باشید.
          </p>
          <button
            onClick={() => onGoToUser('messages')}
            className="w-full py-3.5 bg-indigo-600 text-white text-xs font-black rounded-2xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
          >
            ورود به حساب کاربری
          </button>
        </div>
      ) : userConversations.length > 0 ? (
        <div className="space-y-3">
          {userConversations.map(c => {
            const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
            return (
              <div 
                key={c.id} 
                onClick={() => onGoToUser('messages')}
                className="flex items-center gap-3.5 p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md cursor-pointer transition-all active:scale-98"
              >
                <img 
                  src={c.listingImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80'} 
                  className="w-14 h-14 rounded-xl object-cover border border-slate-100 shrink-0" 
                  alt="" 
                />
                <div className="flex-grow min-w-0">
                  <h4 className="text-xs font-black text-slate-900 truncate mb-1">{c.listingTitle}</h4>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {lastMsg ? lastMsg.text : 'هنوز پیامی ارسال نشده است'}
                  </p>
                </div>
                <div className="text-[10px] font-bold text-slate-400 shrink-0">
                  {new Date(c.lastUpdate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 p-6 space-y-3">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-black text-slate-800">هنوز گفتگویی ندارید</h3>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            با کلیک روی دکمه «گفتگو» در صفحه هر ملک، می‌توانید مستقیماً با مالک یا مشاور گفتگو کنید.
          </p>
          <button
            onClick={() => setActiveTab('home')}
            className="px-4 py-2.5 bg-indigo-50 text-indigo-600 text-xs font-black rounded-xl hover:bg-indigo-100 transition-colors"
          >
            مشاهده املاک
          </button>
        </div>
      )}
    </motion.div>
  );

  // ==========================================
  // TAB 4: PROFILE & USER SERVICES VIEW
  // ==========================================
  const renderProfile = () => (
    <motion.div
      key="tab-profile"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pb-28 pt-2 space-y-4"
    >
      {/* 1. User Identity Card */}
      <div className="w-full bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10 mb-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-md border-2 border-white/20 shrink-0">
            {user ? user.name[0] : '؟'}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black truncate">{user ? user.name : 'کاربر مهمان'}</h2>
            <p className="text-xs text-indigo-200/80 font-bold mt-0.5">{user ? user.phone : 'ورود / ثبت‌نام برای امکانات کامل'}</p>
            <div className="mt-1.5 flex items-center gap-2">
              {user?.role === 'agent' ? (
                <span className="text-[10px] font-black bg-emerald-500 text-slate-900 px-2 py-0.5 rounded-full">
                  🏢 مشاور املاک
                </span>
              ) : (
                <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full">
                  👤 حساب کاربری
                </span>
              )}
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                PWA فعال
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
          <div className="bg-white/5 rounded-xl p-2 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => onGoToUser('my-ads')}>
            <span className="text-[10px] text-slate-300 block">آگهی‌های من</span>
            <span className="text-xs font-black text-white mt-0.5 block">
              {user ? listings.filter(l => l.ownerId === user.id).length : 0}
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-2 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => onGoToUser('favorites')}>
            <span className="text-[10px] text-slate-300 block">نشان‌شده‌ها</span>
            <span className="text-xs font-black text-rose-300 mt-0.5 block">
              {listings.filter(l => l.isLiked).length}
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-2 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => onGoToUser('messages')}>
            <span className="text-[10px] text-slate-300 block">پیام‌ها</span>
            <span className="text-xs font-black text-indigo-300 mt-0.5 block">
              {userConversations.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Direct Entrance to Full User Dashboard */}
      <button
        onClick={() => onGoToUser()}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs rounded-2xl flex items-center justify-between px-5 shadow-lg shadow-indigo-500/20 active:scale-98 transition-all"
      >
        <div className="flex items-center gap-2.5">
          <Building2 className="w-5 h-5 text-indigo-200" />
          <span>ورود به پنل کاربری جامع</span>
        </div>
        <ChevronLeft className="w-4 h-4 text-indigo-200" />
      </button>

      {/* 3. User Quick Shortcuts List */}
      <div className="space-y-2">
        <div className="text-[11px] font-black text-slate-400 px-1 pt-1">مدیریت حساب و خدمات:</div>

        <button 
          onClick={() => onGoToUser('ads')} 
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:bg-slate-50 transition-colors active:scale-99"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">آگهی‌های ثبت شده من</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </button>

        <button 
          onClick={() => onGoToUser('packages')} 
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:bg-slate-50 transition-colors active:scale-99"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">بسته‌ها و سهمیه آگهی</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </button>

        <button 
          onClick={() => onGoToUser('tickets')} 
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:bg-slate-50 transition-colors active:scale-99"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">تیکت‌های پشتیبانی</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </button>

        <button 
          onClick={() => onGoToUser('payments')} 
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:bg-slate-50 transition-colors active:scale-99"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">فیش‌های واریزی و تراکنش‌ها</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </button>

        <button 
          onClick={() => onGoToUser('likes')} 
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:bg-slate-50 transition-colors active:scale-99"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">لیست نشان‌شده‌ها (علاقه‌مندی‌ها)</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* 4. PWA & Device Options */}
      <div className="space-y-2 pt-2">
        <div className="text-[11px] font-black text-slate-400 px-1">تنظیمات اپلیکیشن:</div>

        <button 
          onClick={handleInstallPwaClick} 
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:bg-slate-50 transition-colors active:scale-99"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-slate-800 block">نصب اپلیکیشن روی گوشی</span>
              <span className="text-[10px] text-slate-400 font-medium block">افزودن به صفحه اصلی بدون نیاز به استور</span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </button>

        <button 
          onClick={() => { 
            if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pref_desktop', 'true');
            if (onGoToDesktop) {
              onGoToDesktop();
            } else if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
              window.location.reload();
            }
          }} 
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:bg-slate-50 transition-colors active:scale-99"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-slate-800 block">انتقال به نسخه دسکتاپ</span>
              <span className="text-[10px] text-slate-400 font-medium block">مشاهده چیدمان مناسب نمایشگرهای بزرگ</span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </button>

        {user && (
          <button 
            onClick={onLogout} 
            className="w-full flex items-center justify-between p-3.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-colors mt-3 active:scale-99"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-black">خروج از حساب کاربری</span>
            </div>
          </button>
        )}
      </div>
    </motion.div>
  );

  // Bottom Navigation Bar Items (Home, Search, Chats, Profile)
  const navItems = [
    { id: 'home', label: 'خانه', icon: Home },
    { id: 'search', label: 'جستجو', icon: Search },
    { id: 'chats', label: 'پیام‌ها', icon: MessageSquare, badge: userConversations.length },
    { id: 'profile', label: 'حساب من', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative font-['Vazirmatn'] max-w-md mx-auto shadow-2xl overflow-hidden border-x border-slate-200/60 pb-20 select-none">
      
      {/* 1. Clean Native Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          {siteBranding?.logoUrl ? (
            <img src={siteBranding.logoUrl} alt={siteBranding.siteName} className="w-8 h-8 object-contain rounded-xl shadow-xs" />
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs text-sm">
              {siteBranding?.logoIcon || <Building2 className="w-4 h-4" />}
            </div>
          )}
          <div>
            <h1 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
              {siteBranding?.siteName || 'سامانه املاک هوشمند'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-bold text-slate-400">نسخه موبایل (PWA)</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick City Selector Pill */}
          <button 
            onClick={() => setShowCityModal(true)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all active:scale-95"
            title="تغییر شهر"
          >
            <MapPin className="w-3 h-3 text-indigo-600" />
            <span className="truncate max-w-[65px]">{searchCity || 'همه شهرها'}</span>
          </button>

          {/* Quick Install PWA Button (if not installed) */}
          {!isPwaInstalled && (
            <button 
              onClick={handleInstallPwaClick}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all active:scale-95"
              title="نصب اپلیکیشن"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>نصب</span>
            </button>
          )}

          {/* User Profile Quick Button */}
          <button 
            onClick={() => onGoToUser()}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
            title="ورود به پنل کاربری"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{user ? user.name.split(' ')[0] : 'پنل کاربری'}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Content Body with AnimatePresence */}
      <AnimatePresence mode="wait">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'chats' && renderChats()}
        {activeTab === 'profile' && renderProfile()}
      </AnimatePresence>

      {/* 3. Floating Bottom Navigation Bar (2 + Center Button + 2) */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-20 bg-white/95 backdrop-blur-2xl border-t border-slate-100 px-4 flex justify-between items-center z-50 rounded-t-3xl shadow-[0_-8px_25px_rgba(0,0,0,0.06)]">
        {/* Right 2 Tabs: Home & Search */}
        {navItems.slice(0, 2).map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all"
            >
              {isActive && (
                <motion.div 
                  layoutId="activePwaIndicator" 
                  className="absolute inset-0 bg-indigo-50 border border-indigo-100 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <IconComp className={`w-5 h-5 relative z-10 transition-transform ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-black relative z-10 mt-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Center Prominent Floating (+) Create Listing Button */}
        <div className="relative -mt-6">
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onGoToCreate}
            className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/35 border-4 border-white transition-all cursor-pointer"
            title="ثبت آگهی جدید"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </motion.button>
          <span className="text-[9px] font-black text-slate-500 block text-center mt-1">ثبت آگهی</span>
        </div>

        {/* Left 2 Tabs: Chats & Profile */}
        {navItems.slice(2).map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all"
            >
              {isActive && (
                <motion.div 
                  layoutId="activePwaIndicator" 
                  className="absolute inset-0 bg-indigo-50 border border-indigo-100 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <div className="relative z-10">
                <IconComp className={`w-5 h-5 transition-transform ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-400'}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] font-black relative z-10 mt-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 4. City Selection Bottom Sheet / Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[90] flex items-end sm:items-center justify-center p-3 animate-fade-in" onClick={() => setShowCityModal(false)}>
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">انتخاب شهر</h3>
              </div>
              <button onClick={() => setShowCityModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-1.5 pr-1 flex-grow">
              <button
                onClick={() => {
                  setSearchCity('');
                  setShowCityModal(false);
                  showToast('نمایش املاک همه شهرها');
                }}
                className={`w-full text-right p-3 rounded-xl text-xs font-black transition-colors flex items-center justify-between ${
                  !searchCity ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>همه شهرها</span>
                {!searchCity && <Check className="w-4 h-4" />}
              </button>

              {availableCities.map((city) => {
                const isSelected = searchCity === city;
                return (
                  <button
                    key={`modal-city-${city}`}
                    onClick={() => {
                      setSearchCity(city);
                      setShowCityModal(false);
                      showToast(`شهر ${city} انتخاب شد`);
                    }}
                    className={`w-full text-right p-3 rounded-xl text-xs font-black transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{city}</span>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* 5. Native PWA Install Guidance Modal */}
      {showPwaInstallModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setShowPwaInstallModal(false)}>
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-right space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">نصب نسخه اپلیکیشن</h3>
                  <p className="text-[10px] text-slate-400 font-bold">دسترسی سریع و آفلاین بدون استور</p>
                </div>
              </div>
              <button onClick={() => setShowPwaInstallModal(false)} className="text-slate-400 hover:text-rose-500 p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-bold text-slate-600">
              <div className="p-3 bg-slate-50 rounded-2xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[11px] font-black flex items-center justify-center shrink-0">۱</span>
                <p className="leading-relaxed">در مرورگر آیفون (Safari): دکمه <strong className="text-slate-900">Share 📤</strong> را در پایین بزنید.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[11px] font-black flex items-center justify-center shrink-0">۲</span>
                <p className="leading-relaxed">گزینه <strong className="text-slate-900">Add to Home Screen ➕</strong> را لمس کنید.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[11px] font-black flex items-center justify-center shrink-0">۳</span>
                <p className="leading-relaxed">در اندروید (Chrome): دکمه ۳ نقطه را زده و <strong className="text-slate-900">Install App</strong> را انتخاب کنید.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowPwaInstallModal(false)}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-colors"
            >
              متوجه شدم
            </button>
          </motion.div>
        </div>
      )}

      {/* 6. Listing Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-[60]">
          <ListingDetailModal 
            listing={selectedListing} 
            plan={(promotionPlans || []).find(p => p.id === selectedListing.promotion)}
            user={user}
            adSlots={adSlots}
            onClose={() => setSelectedListing(null)}
            onStartChat={onStartChat}
            onRegister={onRegister}
          />
        </div>
      )}

      {/* 7. Toast Notification Floating Feedback */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-xl border border-white/10 flex items-center gap-2 pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          <span>{toastMessage}</span>
        </motion.div>
      )}
    </div>
  );
};

export default MobileAppPage;
