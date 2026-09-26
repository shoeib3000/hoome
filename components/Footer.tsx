import React from 'react';
import type { AdSlot, TrustBadge, SiteBrandingConfig, Category } from '../types';

interface FooterProps {
  onGoToCreate?: () => void;
  onGoToUser?: () => void;
  onGoToPwa?: () => void;
  onGoToInstall?: () => void;
  onSelectCategory?: (category: string) => void;
  categories?: Category[];
  adSlots?: AdSlot[];
  trustBadges?: TrustBadge[];
  siteBranding?: SiteBrandingConfig;
}

export const Footer: React.FC<FooterProps> = ({
  onGoToCreate,
  onGoToUser,
  onGoToPwa,
  onGoToInstall,
  onSelectCategory,
  categories = [],
  adSlots = [],
  trustBadges = [],
  siteBranding
}) => {
  // Filter active footer banner ads
  const footerAds = adSlots.filter(s => s.isActive && (s.position === 'footer' || s.position === 'sticky-footer'));
  const activeBadges = trustBadges.filter(b => b.isActive);

  const siteTitle = siteBranding?.siteName || 'آگهی هوشمند املاک';
  const siteDesc = siteBranding?.siteSubtitle || 'سامانه جامع معاملات و خرید و فروش ملک';

  return (
    <footer className="bg-slate-900 text-slate-300 relative border-t border-slate-800 font-sans pt-10 pb-8 mt-16" dir="rtl">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* 1. Promotional Banner Ad (If configured) */}
        {footerAds.length > 0 && (
          <div className="rounded-3xl overflow-hidden border border-slate-700/70 bg-gradient-to-r from-slate-800 via-slate-850 to-indigo-950 p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3 px-1">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                تبلیغات اسپانسر
              </span>
              <span className="text-[10px] text-slate-500">حامیان سامانه</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {footerAds.slice(0, 2).map((ad) => (
                <a
                  key={ad.id}
                  href={ad.linkUrl || '#'}
                  target={ad.linkUrl && ad.linkUrl.startsWith('http') ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="group flex flex-col sm:flex-row items-center bg-slate-900/80 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-indigo-500 transition-all shadow-md"
                >
                  <div className="w-full sm:w-44 h-28 overflow-hidden relative flex-shrink-0 bg-slate-950">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3.5 flex flex-col justify-between flex-grow w-full">
                    <h4 className="text-white font-bold text-xs sm:text-sm group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {ad.title}
                    </h4>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-indigo-400 font-bold">
                      <span>مشاهده جزئیات</span>
                      <span>←</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Category Quick Links */}
        {categories.length > 0 && onSelectCategory && (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-300 mb-3">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>دسته‌بندی‌های املاک</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSelectCategory('all')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors"
              >
                🌐 همه املاک
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCategory(c.name)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <span>{c.icon || '🏢'}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. Main 2-Column Balanced Layout: Address & Contact | Legal Trust Badges & Licenses */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-2">
          
          {/* Column 1: Site Info & Official Address (Col 6) */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              {siteBranding?.logoUrl ? (
                <img src={siteBranding.logoUrl} alt={siteTitle} className="w-9 h-9 object-contain rounded-lg" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/30">
                  {siteBranding?.logoIcon || '🏢'}
                </div>
              )}
              <div>
                <h3 className="text-base font-black text-white">{siteTitle}</h3>
                <p className="text-[11px] text-slate-400 font-medium">{siteDesc}</p>
              </div>
            </div>

            {/* Address Box */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 text-xs space-y-2.5">
              <div className="flex items-start gap-2 text-slate-300">
                <span className="text-sm mt-0.5">📍</span>
                <div>
                  <span className="font-bold text-white block mb-0.5">نشانی دفتر مرکزی:</span>
                  <span className="leading-relaxed text-slate-300">تهران، خیابان ولیعصر، نرسیده به میدان ونک، برج فناوری و نوآوری املاک، طبقه ۱۲</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-700/50 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">📞 تلفن تماس:</span>
                  <a href="tel:02191008080" className="text-indigo-300 font-mono font-bold hover:underline dir-ltr">۰۲۱ - ۹۱۰۰۸۰۸۰</a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">⏰ ساعات پاسخگویی:</span>
                  <span className="text-slate-300">۸:۰۰ الی ۲۰:۰۰</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Legal Trust Badges / Licenses (Col 6) */}
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center justify-between border-r-2 border-emerald-500 pr-2.5">
              <h4 className="text-xs font-black text-white">مجوزهای قانونی و نمادهای اعتماد</h4>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">تایید شده</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {activeBadges.map((badge) => (
                <a
                  key={badge.id}
                  href={badge.linkUrl || '#'}
                  target={badge.linkUrl && badge.linkUrl.startsWith('http') ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="bg-slate-800/80 border border-slate-700 hover:border-emerald-500 p-2 rounded-xl flex flex-col items-center text-center group transition-all"
                  title={badge.title}
                >
                  <div className="w-11 h-11 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden mb-1.5 shadow-inner">
                    <img
                      src={badge.imageUrl}
                      alt={badge.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        (e.target as HTMLElement).parentElement!.innerHTML = '<span class="text-base">🛡️</span>';
                      }}
                    />
                  </div>
                  <span className="text-white text-[10px] font-bold group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {badge.title}
                  </span>
                </a>
              ))}
            </div>

            <div className="pt-2 text-[10px] text-slate-500 text-left flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>سامانه مجهز به گواهی امنیتی SSL و رمزنگاری داده‌ها</span>
            </div>
          </div>

        </div>

        {/* 3. Sleek Copyright Bar */}
        <div className="pt-6 border-t border-slate-800 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} {siteTitle} — تمامی حقوق مادی و معنوی محفوظ است.
        </div>

      </div>
    </footer>
  );
};

export default Footer;
