
import React, { useState, useMemo, useEffect } from 'react';
import type { PropertyListing, User, PromotionPlan, AdSlot, Category, TrustBadge, BannerSliderConfig, SiteBrandingConfig } from '../types';
import Header from '../components/Header';
import FilterBar, { Filters } from '../components/FilterBar';
import ListingCard from '../components/ListingCard';
import ListingDetailModal from '../components/ListingDetailModal';
import Footer from '../components/Footer';
import BannerSlider from '../components/BannerSlider';

interface HomePageProps {
  listings: PropertyListing[];
  promotionPlans: PromotionPlan[];
  adSlots: AdSlot[];
  trustBadges?: TrustBadge[];
  bannerSliderConfig?: BannerSliderConfig;
  siteBranding?: SiteBrandingConfig;
  user: User | null;
  filters: Filters;
  categories: Category[];
  onFiltersChange: (filters: Filters) => void;
  onGoToCreate: () => void;
  onGoToAdmin: () => void;
  onGoToUser: (tab?: string) => void;
  onGoToPwa?: () => void;
  onGoToInstall?: () => void;
  onToggleLike: (id: string) => void;
  onStartChat: (listing: PropertyListing, seeker: User) => void;
  onRegister: (name: string, phone: string) => Promise<User> | User | void;
  onLogout?: () => void;
  isAdminAuthenticated?: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ listings, promotionPlans, adSlots, trustBadges = [], bannerSliderConfig, siteBranding, user, filters, categories, onFiltersChange, onGoToCreate, onGoToAdmin, onGoToUser, onGoToPwa, onGoToInstall, onToggleLike, onStartChat, onRegister, onLogout, isAdminAuthenticated = false }) => {
    const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
    const [activeUsersCount, setActiveUsersCount] = useState<number>(() => (siteBranding?.activeUsersCountBase || 1200) + 48);

    useEffect(() => {
        let isMounted = true;
        const fetchActiveCount = async () => {
            try {
                const res = await fetch('/api/stats/active-users');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.activeUsers) {
                        setActiveUsersCount(data.activeUsers);
                    }
                }
            } catch (e) {
                const base = siteBranding?.activeUsersCountBase || 1200;
                const dynamic = Math.floor((new Date().getMinutes() * 7) % 85);
                if (isMounted) setActiveUsersCount(base + dynamic);
            }
        };

        fetchActiveCount();
        const interval = setInterval(fetchActiveCount, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [siteBranding?.activeUsersCountBase]);

    const activeAds = useMemo(() => adSlots.filter(s => s.isActive).sort((a, b) => b.priority - a.priority), [adSlots]);
    const heroAds = useMemo(() => activeAds.filter(s => s.position === 'hero'), [activeAds]);
    const inFeedAds = useMemo(() => activeAds.filter(s => s.position === 'in-feed'), [activeAds]);
    const sidebarAds = useMemo(() => activeAds.filter(s => s.position === 'sidebar'), [activeAds]);
    const stickyFooterAd = useMemo(() => (activeAds || []).find(s => s.position === 'sticky-footer'), [activeAds]);

    const filteredListings = useMemo(() => {
        const filtered = listings.filter(listing => {
            const cityMatch = filters.city ? listing.city.toLowerCase().includes(filters.city.trim().toLowerCase()) : true;
            
            let categoryMatch = true;
            if (filters.category && filters.category !== 'all') {
                const targetCat = filters.category.toLowerCase().trim();
                const catObj = categories.find(c => c.name === filters.category || c.id === filters.category);
                const lCat = (listing.category || '').toLowerCase().trim();
                
                categoryMatch = (
                    lCat === targetCat ||
                    (catObj && lCat === catObj.name.toLowerCase()) ||
                    (catObj && lCat === catObj.id.toLowerCase()) ||
                    (targetCat === 'آپارتمان' && (lCat === 'apartment' || lCat === 'apt')) ||
                    ((targetCat === 'ویلایی' || targetCat === 'ویلایی و خانه') && (lCat === 'house' || lCat === 'villa' || lCat === 'ویلایی')) ||
                    ((targetCat === 'اداری' || targetCat === 'اداری و تجاری') && (lCat === 'office' || lCat === 'اداری')) ||
                    (targetCat === 'زمین و کلنگی' && (lCat === 'land' || lCat === 'colongy'))
                );
            }

            const typeMatch = filters.type !== 'all' ? listing.type === filters.type : true;
            return cityMatch && categoryMatch && typeMatch;
        });

        return [...filtered].sort((a, b) => {
            const planA = (promotionPlans || []).find(p => p.id === a.promotion)?.priorityLevel || 0;
            const planB = (promotionPlans || []).find(p => p.id === b.promotion)?.priorityLevel || 0;
            if (planB !== planA) return planB - planA;
            return b.createdAt - a.createdAt;
        });
    }, [listings, filters, promotionPlans, categories]);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/30">
            <Header 
                onGoToCreate={onGoToCreate} 
                onGoToAdmin={onGoToAdmin} 
                onGoToUser={onGoToUser} 
                onGoToPwa={onGoToPwa}
                onLogout={onLogout}
                onHomeClick={() => onFiltersChange({ city: '', category: 'all', type: 'all' })}
                onFilterRentOnly={() => onFiltersChange({ city: '', category: 'all', type: 'rent' })}
                onFilterSaleOnly={() => onFiltersChange({ city: '', category: 'all', type: 'sale' })}
                onFilterAgentsOnly={() => onFiltersChange({ city: '', category: 'all', type: 'all' })}
                userName={user?.name} 
                user={user}
                userRole={user?.role}
                isAdminAuthenticated={isAdminAuthenticated}
                siteBranding={siteBranding}
            />
            
            <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 flex-grow w-full pb-12">
                {/* Creative Hero Section */}
                <div className="relative mb-20 flex flex-col lg:flex-row gap-10 items-center">
                    <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute top-20 -left-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
                    
                    <div className="relative text-center md:text-right flex-grow">
                        <div className="inline-flex items-center px-4 py-2 bg-white/50 border border-indigo-100 rounded-full mb-6 animate-float">
                            <span className="flex h-2 w-2 rounded-full bg-indigo-500 ml-2"></span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">پلتفرم املاک نسل سوم</span>
                        </div>
                        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.15]">
                            جستجوی <span className="text-indigo-600 relative">هوشمند<svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 25 0, 50 5 T 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" /></svg></span> <br />
                            برای زندگی <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">رویایی</span>
                        </h2>
                        <p className="mt-8 text-slate-500 text-lg sm:text-xl font-medium max-w-2xl leading-relaxed">
                            تلاقی هوش مصنوعی و املاک؛ اینجا آگهیها فقط اطلاعات نیستند، بلکه فرصتهایی هستند که هوش مصنوعی برای شما تحلیل کرده است.
                        </p>
                        
                        <div className="mt-12 flex flex-wrap gap-4 justify-center md:justify-start">
                             <button onClick={onGoToCreate} className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-2xl hover:bg-indigo-600 transition-all active:scale-95">شروع ثبت آگهی</button>
                             <div className="flex -space-x-4 overflow-hidden items-center mr-6 rtl:space-x-reverse">
                                {[
                                    { name: 'م', bg: 'from-pink-500 to-rose-500' },
                                    { name: 'آ', bg: 'from-purple-500 to-indigo-500' },
                                    { name: 'س', bg: 'from-blue-500 to-cyan-500' },
                                    { name: 'ر', bg: 'from-amber-500 to-orange-500' }
                                ].map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`inline-flex h-12 w-12 rounded-full ring-4 ring-white items-center justify-center font-black text-sm text-white bg-gradient-to-br ${item.bg} shadow-md`}
                                        style={{ marginLeft: idx > 0 ? '-1rem' : '0' }}
                                    >
                                        {item.name}
                                    </div>
                                ))}
                                <span className="mr-6 text-sm font-bold text-slate-600 flex items-center gap-1.5 bg-white/80 px-3.5 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>+{new Intl.NumberFormat('fa-IR').format(activeUsersCount)} کاربر فعال امروز</span>
                                </span>
                             </div>
                        </div>
                    </div>

                    {/* Hero Ads Carousel */}
                    <BannerSlider ads={adSlots} position="hero" config={bannerSliderConfig} />
                </div>

                {/* Dynamic Category Showcase Grid */}
                {categories && categories.length > 0 && (
                  <div className="mb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 px-1">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                          دسته‌بندی‌های تخصصی املاک
                        </h3>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          انتخاب سریع دسته‌بندی و دسترسی به فایل‌های تایید شده
                        </p>
                      </div>
                      {filters.category !== 'all' && (
                        <button
                          onClick={() => onFiltersChange({ ...filters, category: 'all' })}
                          className="self-start sm:self-auto px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                        >
                          <span>✕</span>
                          <span>نمایش همه املاک</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                      <button
                        onClick={() => onFiltersChange({ ...filters, category: 'all' })}
                        className={`p-4 rounded-3xl border text-right transition-all flex flex-col justify-between group active:scale-95 cursor-pointer ${
                          filters.category === 'all'
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 border-transparent ring-2 ring-indigo-500 ring-offset-2'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700 shadow-xs hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl p-2 rounded-2xl bg-white/20 backdrop-blur-md">🌐</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            filters.category === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {listings.length} ملک
                          </span>
                        </div>
                        <div>
                          <span className={`text-sm font-black block truncate ${filters.category === 'all' ? 'text-white' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                            همه املاک
                          </span>
                          <span className={`text-[11px] font-bold block mt-0.5 ${filters.category === 'all' ? 'text-indigo-100' : 'text-slate-400'}`}>
                            تمامی فایل‌ها
                          </span>
                        </div>
                      </button>

                      {categories.map((cat) => {
                        const isSelected = filters.category === cat.name || filters.category === cat.id;
                        const count = listings.filter(l => {
                          const lCat = (l.category || '').toLowerCase().trim();
                          const cName = cat.name.toLowerCase().trim();
                          const cId = cat.id.toLowerCase().trim();
                          return (
                            lCat === cName ||
                            lCat === cId ||
                            (cName === 'آپارتمان' && (lCat === 'apartment' || lCat === 'apt')) ||
                            ((cName === 'ویلایی' || cName === 'ویلایی و خانه') && (lCat === 'house' || lCat === 'villa' || lCat === 'ویلایی')) ||
                            ((cName === 'اداری' || cName === 'اداری و تجاری') && (lCat === 'office' || lCat === 'اداری')) ||
                            (cName === 'زمین و کلنگی' && (lCat === 'land' || lCat === 'colongy'))
                          );
                        }).length;

                        return (
                          <button
                            key={cat.id}
                            onClick={() => onFiltersChange({ ...filters, category: isSelected ? 'all' : cat.name })}
                            className={`p-4 rounded-3xl border text-right transition-all flex flex-col justify-between group active:scale-95 cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 border-transparent ring-2 ring-indigo-500 ring-offset-2 scale-[1.02]'
                                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700 shadow-xs hover:border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-2xl p-2 rounded-2xl ${isSelected ? 'bg-white/20' : 'bg-slate-50 border border-slate-100'}`}>
                                {cat.icon || '🏢'}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                              }`}>
                                {count} ملک
                              </span>
                            </div>
                            <div>
                              <span className={`text-sm font-black block truncate ${isSelected ? 'text-white' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                                {cat.name}
                              </span>
                              <span className={`text-[11px] font-bold block mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {count > 0 ? `${count} فایل موجود` : 'بدون فایل'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="sticky top-24 z-30 mb-12">
                   <FilterBar onFilterChange={onFiltersChange} categories={categories} />
                </div>

                {/* Listing Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                    {filteredListings.map((listing, idx) => (
                        <React.Fragment key={listing.id}>
                            <div className="animate-step" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <ListingCard 
                                    data={listing} 
                                    onClick={setSelectedListing} 
                                    onToggleLike={onToggleLike} 
                                    promotionPlans={promotionPlans}
                                />
                            </div>
                            {/* In-feed Ad Slider every 8 items */}
                            {(idx + 1) % 8 === 0 && inFeedAds.length > 0 && (
                                <div className="col-span-full my-10">
                                    <BannerSlider ads={adSlots} position="in-feed" config={bannerSliderConfig} />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {filteredListings.length === 0 && (
                    <div className="text-center py-32 glass-card rounded-[4rem]">
                        <div className="text-6xl mb-6 opacity-20">🔍</div>
                        <p className="text-slate-500 font-black text-xl">متأسفانه ملکی با این مشخصات پیدا نکردیم.</p>
                        <button onClick={() => onFiltersChange({city:'', category:'all', type:'all'})} className="mt-4 text-indigo-600 font-bold underline">پاک کردن فیلترها</button>
                    </div>
                )}
            </main>

            <Footer 
                onGoToCreate={onGoToCreate}
                onGoToUser={() => onGoToUser()}
                onGoToPwa={onGoToPwa}
                onGoToInstall={onGoToInstall}
                onSelectCategory={(cat) => onFiltersChange({ ...filters, category: cat })}
                categories={categories}
                adSlots={adSlots}
                trustBadges={trustBadges}
                siteBranding={siteBranding}
            />

            {selectedListing && (
                <ListingDetailModal 
                    listing={selectedListing} 
                    plan={(promotionPlans || []).find(p => p.id === selectedListing.promotion)}
                    user={user}
                    onClose={() => setSelectedListing(null)}
                    onStartChat={onStartChat}
                    onRegister={onRegister}
                />
            )}

            {/* Sticky Footer Ad */}
            {stickyFooterAd && (
                <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 flex justify-center pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[2.5rem] p-4 flex items-center gap-6 max-w-2xl w-full pointer-events-auto animate-step">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                            <img src={stickyFooterAd.imageUrl} className="w-full h-full object-cover" alt="ad" loading="lazy" />
                        </div>
                        <div className="flex-grow">
                            <h4 className="text-sm font-black text-slate-900">{stickyFooterAd.title}</h4>
                            <p className="text-[10px] font-bold text-slate-400">پیشنهاد ویژه برای شما</p>
                        </div>
                        <a href={stickyFooterAd.linkUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg">مشاهده</a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;
