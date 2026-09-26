import React, { useState, useRef, useEffect } from 'react';
import InstallPwaButton from './InstallPwaButton';
import type { SiteBrandingConfig, User } from '../types';

interface HeaderProps {
    onGoToCreate: () => void;
    onGoToAdmin?: () => void;
    onGoToUser?: (tab?: string) => void;
    onGoToPwa?: () => void;
    onHomeClick?: () => void;
    onFilterRentOnly?: () => void;
    onFilterSaleOnly?: () => void;
    onFilterAgentsOnly?: () => void;
    onLogout?: () => void;
    isAdminView?: boolean;
    isUserView?: boolean;
    userName?: string;
    user?: User | null;
    userRole?: 'user' | 'agent' | 'admin';
    isAdminAuthenticated?: boolean;
    siteBranding?: SiteBrandingConfig;
}

const Header: React.FC<HeaderProps> = ({ 
    onGoToCreate, 
    onGoToAdmin, 
    onGoToUser, 
    onGoToPwa, 
    onHomeClick, 
    onFilterRentOnly,
    onFilterSaleOnly,
    onFilterAgentsOnly,
    onLogout, 
    isAdminView, 
    isUserView, 
    userName, 
    user,
    userRole,
    isAdminAuthenticated, 
    siteBranding
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const siteName = siteBranding?.siteName || 'سامانه هوشمند ملک';
  const siteSlogan = siteBranding?.siteSubtitle || 'مرجع تخصصی معاملات، رهن و اجاره و خرید ملک';
  const effectiveRole = user?.role || userRole || 'user';
  const effectiveName = user?.name || userName;
  const isAgent = effectiveRole === 'agent' || !!user?.agentProfile || !!user?.agencyName;

  // Track scroll state for elevation shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavHome = () => {
    setIsMobileMenuOpen(false);
    if (onHomeClick) {
      onHomeClick();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleNavPwa = () => {
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/pwa');
    }
    if (onGoToPwa) onGoToPwa();
  };

  const handleNavUser = (tab?: string) => {
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
    if (onGoToUser) onGoToUser(tab);
  };

  const handleNavAdmin = () => {
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
    if (onGoToAdmin) onGoToAdmin();
  };

  const handleNavCreate = () => {
    setIsMobileMenuOpen(false);
    onGoToCreate();
  };

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border-b border-slate-200/90' 
        : 'bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-2xs'
    }`} dir="rtl">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 sm:h-22">
          
          {/* 1. Brand Logo & Site Title */}
          <div className="flex items-center gap-6 lg:gap-8">
            <div 
              className="flex items-center group cursor-pointer select-none" 
              onClick={handleNavHome}
              title="بازگشت به صفحه اصلی"
            >
              {siteBranding?.logoUrl ? (
                <img 
                  src={siteBranding.logoUrl} 
                  alt={siteName} 
                  className="h-11 w-11 sm:h-12 sm:w-12 object-contain rounded-2xl shadow-md mr-1 group-hover:scale-105 transition-transform" 
                />
              ) : (
                <div className="relative group-hover:scale-105 transition-all duration-300">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 p-2">
                    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                  </span>
                </div>
              )}
              
              <div className="mr-3 text-right">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 tracking-tight">
                    {siteName}
                  </h1>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    هوشمند
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 hidden sm:block mt-0.5 truncate max-w-xs">
                  {siteSlogan}
                </p>
              </div>
            </div>

            {/* 2. Desktop Navigation Menu */}
            {!isAdminView && !isUserView && (
              <nav className="hidden lg:flex items-center gap-1.5 mr-2 border-r border-slate-200/80 pr-4">
                <button 
                  onClick={handleNavHome}
                  className="px-3.5 py-2 text-xs font-black text-slate-700 hover:text-indigo-600 rounded-xl hover:bg-slate-100/80 transition-all flex items-center gap-1.5"
                >
                  <span className="text-sm">🏠</span>
                  <span>صفحه اصلی</span>
                </button>

                {onFilterRentOnly && (
                  <button 
                    onClick={onFilterRentOnly}
                    className="px-3.5 py-2 text-xs font-black text-slate-700 hover:text-indigo-600 rounded-xl hover:bg-slate-100/80 transition-all flex items-center gap-1.5"
                  >
                    <span className="text-sm">🔑</span>
                    <span>رهن و اجاره</span>
                  </button>
                )}

                {onFilterSaleOnly && (
                  <button 
                    onClick={onFilterSaleOnly}
                    className="px-3.5 py-2 text-xs font-black text-slate-700 hover:text-indigo-600 rounded-xl hover:bg-slate-100/80 transition-all flex items-center gap-1.5"
                  >
                    <span className="text-sm">🏷️</span>
                    <span>خرید و فروش</span>
                  </button>
                )}

                {onFilterAgentsOnly && (
                  <button 
                    onClick={onFilterAgentsOnly}
                    className="px-3.5 py-2 text-xs font-black text-emerald-700 hover:text-emerald-800 rounded-xl hover:bg-emerald-50/80 transition-all flex items-center gap-1.5"
                  >
                    <span className="text-sm">🏢</span>
                    <span>مشاورین املاک</span>
                  </button>
                )}

                <button 
                  onClick={handleNavPwa}
                  className="px-3.5 py-2 text-xs font-black text-slate-700 hover:text-indigo-600 rounded-xl hover:bg-slate-100/80 transition-all flex items-center gap-1.5"
                >
                  <span className="text-sm">📱</span>
                  <span>اپلیکیشن PWA</span>
                </button>
              </nav>
            )}
          </div>
          
          {/* 3. Action Buttons & User Profile (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            {!isAdminView && !isUserView && (
              <>
                <InstallPwaButton />

                {isAdminAuthenticated && onGoToAdmin && (
                  <button
                    onClick={handleNavAdmin}
                    className="inline-flex items-center px-3.5 py-2.5 text-xs font-black text-amber-900 bg-amber-100 hover:bg-amber-200 transition-all rounded-2xl border border-amber-300/80 shadow-xs active:scale-95"
                    title="ورود به پنل مدیریت سامانه"
                  >
                    <span className="ml-1.5">⚡</span>
                    پنل مدیریت
                  </button>
                )}

                {/* User Dropdown / Login Button */}
                <div className="relative" ref={userDropdownRef}>
                  {effectiveName ? (
                    <div>
                      <button
                        onClick={() => setIsUserDropdownOpen(prev => !prev)}
                        className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all duration-200 shadow-2xs hover:shadow-xs group"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm transition-transform group-hover:scale-105 ${
                          isAgent 
                            ? 'bg-gradient-to-tr from-emerald-600 to-teal-600' 
                            : 'bg-gradient-to-tr from-indigo-600 to-blue-600'
                        }`}>
                          {isAgent ? '🏢' : effectiveName[0]}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{effectiveName}</p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                            isAgent ? 'text-emerald-700 bg-emerald-100/80' : 'text-indigo-700 bg-indigo-100/80'
                          }`}>
                            {isAgent ? 'مشاور رسمی املاک' : 'حساب کاربری'}
                          </span>
                        </div>
                        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {isUserDropdownOpen && (
                        <div className="absolute left-0 mt-2.5 w-60 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-fade-in text-right">
                          <div className="px-3.5 py-3 border-b border-slate-100 mb-1.5 bg-slate-50/70 rounded-xl">
                            <p className="text-xs font-black text-slate-900">{effectiveName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold font-mono" dir="ltr">{user?.phone || 'کاربر گرامی'}</p>
                            {isAgent && (
                              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-md border border-emerald-200">
                                <span>✓</span> مشاور املاک تایید شده
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleNavUser('my_listings')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors"
                          >
                            <span>📋</span>
                            <span>مدیریت آگهی‌های من</span>
                          </button>

                          <button
                            onClick={() => handleNavUser('chat')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors"
                          >
                            <span>💬</span>
                            <span>پیام‌ها و چت آنلاین</span>
                          </button>

                          <button
                            onClick={() => handleNavUser('packages')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors"
                          >
                            <span>📦</span>
                            <span>پکیج‌ها و تعرفه‌ها</span>
                          </button>

                          <button
                            onClick={() => handleNavUser('tickets')}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors"
                          >
                            <span>🎫</span>
                            <span>تیکت‌های پشتیبانی</span>
                          </button>

                          <div className="border-t border-slate-100 my-1"></div>

                          {onLogout && (
                            <button
                              onClick={() => { setIsUserDropdownOpen(false); onLogout(); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <span>🚪</span>
                              <span>خروج از حساب کاربری</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNavUser()}
                      className="inline-flex items-center px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 transition-all active:scale-95 shadow-2xs"
                    >
                      <span className="ml-1.5">👤</span>
                      <span>ورود / عضویت</span>
                    </button>
                  )}
                </div>
              </>
            )}
            
            {/* Primary Action Button: Create Listing */}
            <button
              onClick={handleNavCreate}
              className="group relative inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 font-black text-white text-xs sm:text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 ml-1.5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>ثبت رایگان آگهی</span>
            </button>
          </div>

          {/* 4. Mobile Controls & Hamburger */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={handleNavCreate}
              className="inline-flex items-center px-3.5 py-2 font-black text-white text-xs bg-indigo-600 rounded-xl shadow-xs active:scale-95"
            >
              <span className="ml-1">+</span>
              ثبت آگهی
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              aria-label="باز کردن منو"
              className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* 5. Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 animate-fade-in shadow-2xl">
          {/* User Profile Bar in Mobile */}
          {effectiveName ? (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black ${
                  isAgent ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}>
                  {isAgent ? '🏢' : effectiveName[0]}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">{effectiveName}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{isAgent ? 'مشاور املاک تایید شده' : 'کاربر عادی'}</p>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onLogout(); }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl border border-rose-100"
                >
                  خروج
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleNavUser()}
              className="w-full py-3 px-4 bg-indigo-50 text-indigo-700 font-black text-xs rounded-2xl flex items-center justify-center gap-2 border border-indigo-100"
            >
              <span>👤</span>
              <span>ورود یا ثبت‌نام در سامانه</span>
            </button>
          )}

          {/* Navigation Items in Mobile */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleNavHome}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-right text-xs font-black text-slate-800 flex items-center gap-2 border border-slate-100"
            >
              <span>🏠</span>
              <span>صفحه اصلی</span>
            </button>
            <button
              onClick={handleNavPwa}
              className="p-3 bg-indigo-50/70 hover:bg-indigo-100 rounded-2xl text-right text-xs font-black text-indigo-700 flex items-center gap-2 border border-indigo-100"
            >
              <span>📱</span>
              <span>اپلیکیشن PWA</span>
            </button>
            {onFilterRentOnly && (
              <button
                onClick={() => { setIsMobileMenuOpen(false); onFilterRentOnly(); }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-right text-xs font-black text-slate-800 flex items-center gap-2 border border-slate-100"
              >
                <span>🔑</span>
                <span>رهن و اجاره</span>
              </button>
            )}
            {onFilterSaleOnly && (
              <button
                onClick={() => { setIsMobileMenuOpen(false); onFilterSaleOnly(); }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-right text-xs font-black text-slate-800 flex items-center gap-2 border border-slate-100"
              >
                <span>🏷️</span>
                <span>خرید و فروش</span>
              </button>
            )}
            <button
              onClick={() => handleNavUser('my_listings')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-right text-xs font-black text-slate-800 flex items-center gap-2 border border-slate-100"
            >
              <span>📋</span>
              <span>آگهی‌های من</span>
            </button>
            <button
              onClick={() => handleNavUser('chat')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-right text-xs font-black text-slate-800 flex items-center gap-2 border border-slate-100"
            >
              <span>💬</span>
              <span>پیام‌ها و چت</span>
            </button>
          </div>

          {isAdminAuthenticated && onGoToAdmin && (
            <button
              onClick={handleNavAdmin}
              className="w-full py-3 px-4 bg-amber-100 text-amber-900 font-black text-xs rounded-2xl flex items-center justify-center gap-2 border border-amber-200"
            >
              <span>⚡</span>
              <span>ورود مستقیم به پنل مدیریت</span>
            </button>
          )}

          <div className="pt-2">
            <button
              onClick={handleNavCreate}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20"
            >
              <span>+</span>
              <span>ثبت رایگان آگهی ملک</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
