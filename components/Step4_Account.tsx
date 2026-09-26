import React from 'react';
import type { User, PropertyListing } from '../types';

interface Step4AccountProps {
  userData: { 
    name: string; 
    phone: string; 
    password?: string;
    isAgent?: boolean;
    agencyName?: string;
  };
  setUserData: React.Dispatch<React.SetStateAction<{ 
    name: string; 
    phone: string; 
    password?: string;
    isAgent?: boolean;
    agencyName?: string;
  }>>;
  propertyData: PropertyListing;
  setPropertyData: React.Dispatch<React.SetStateAction<PropertyListing>>;
  isLoggedIn: boolean;
  user?: User | null;
  isAgentListing?: boolean;
  agencyName?: string;
}

const Step4Account: React.FC<Step4AccountProps> = ({ 
  userData, 
  setUserData, 
  propertyData,
  setPropertyData,
  isLoggedIn, 
  user
}) => {
  const isAgentUser = user?.role === 'agent';
  const showPhone = propertyData.showPhoneNumber ?? true;
  const contactMethod = propertyData.contactMethod || 'all';

  const handleContactMethodChange = (method: 'all' | 'chat_only' | 'phone_only') => {
    setPropertyData(prev => ({
      ...prev,
      contactMethod: method,
      showPhoneNumber: method === 'chat_only' ? false : true
    }));
  };

  const handleTogglePhone = (show: boolean) => {
    setPropertyData(prev => ({
      ...prev,
      showPhoneNumber: show,
      contactMethod: !show ? 'chat_only' : (prev.contactMethod === 'chat_only' ? 'all' : prev.contactMethod)
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Account Info Section */}
      {isLoggedIn ? (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-blue-50/60 rounded-[3rem] border border-blue-100">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl shadow-xl shadow-blue-500/20 mb-4">
            ✓
          </div>
          <h2 className="text-xl font-black text-slate-800">شما با حساب «{user?.name}» وارد شده‌اید</h2>
          <p className="text-slate-500 mt-1 text-sm font-bold">شماره ثبت‌شده: {user?.phone}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center md:text-right">
            <h2 className="text-2xl font-black text-slate-800">مشخصات صاحب آگهی</h2>
            <p className="text-slate-500 mt-2 font-medium">برای ثبت و مدیریت آگهی، اطلاعات خود را وارد نمایید.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 mr-2">نام و نام خانوادگی</label>
              <input
                type="text"
                value={userData.name}
                onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold"
                placeholder="مثال: مهدی رضایی"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 mr-2">شماره موبایل</label>
              <input
                type="tel"
                dir="ltr"
                value={userData.phone}
                onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-right"
                placeholder="0912XXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 mr-2">رمز عبور دلخواه (ورود به پنل)</label>
              <input
                type="password"
                dir="ltr"
                value={userData.password || ''}
                onChange={(e) => setUserData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-right"
                placeholder="••••••"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Contact Method & Phone Visibility (User Controlled) */}
      <div className="p-6 sm:p-8 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span>🔒</span>
            <span>تنظیمات نحوه ارتباط و حریم خصوصی شماره تماس</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            شما می‌توانید مشخص کنید خریداران چگونه با شما ارتباط برقرار کنند و آیا شماره موبایل شما به صورت عمومی نمایش داده شود یا خیر.
          </p>
        </div>

        {/* Contact Method Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleContactMethodChange('all')}
            className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${contactMethod === 'all' ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-200' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">📞💬</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${contactMethod === 'all' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                {contactMethod === 'all' && <div className="w-2 h-2 rounded-full bg-white"></div>}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-800">تماس تلفنی و چت آنلاین</p>
              <p className="text-[10px] text-slate-500 mt-1">پیشنهادی — حداکثر بازدهی آگهی</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleContactMethodChange('chat_only')}
            className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${contactMethod === 'chat_only' ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-200' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">💬🛡️</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${contactMethod === 'chat_only' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                {contactMethod === 'chat_only' && <div className="w-2 h-2 rounded-full bg-white"></div>}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-800">فقط چت درون‌برنامه‌ای</p>
              <p className="text-[10px] text-blue-600 mt-1 font-bold">شماره موبایل کاملاً مخفی می‌ماند</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleContactMethodChange('phone_only')}
            className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${contactMethod === 'phone_only' ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-200' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">📱⚡</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${contactMethod === 'phone_only' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                {contactMethod === 'phone_only' && <div className="w-2 h-2 rounded-full bg-white"></div>}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-800">فقط تماس تلفنی مستقیم</p>
              <p className="text-[10px] text-slate-500 mt-1">ارتباط مستقیم تلفنی با متقاضیان</p>
            </div>
          </button>
        </div>

        {/* Phone Visibility Switch */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-black text-slate-800">نمایش مستقیم شماره موبایل در متن آگهی</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {showPhone 
                ? 'شماره تماس شما برای بازدیدکنندگان و خریداران قابل مشاهده خواهد بود.' 
                : 'شماره تماس شما مخفی است و متقاضیان فقط از طریق چت پیام ارسال می‌کنند.'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input 
              type="checkbox" 
              checked={showPhone} 
              onChange={(e) => handleTogglePhone(e.target.checked)} 
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* 3. Automatic Real Estate Consultant Badge Notice (Strictly Admin-Governed) */}
      <div className={`p-6 rounded-[2.5rem] border transition-all ${isAgentUser ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-300 shadow-sm' : 'bg-slate-50/70 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${isAgentUser ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-600'}`}>
            {isAgentUser ? '🏢' : '👤'}
          </div>
          <div className="flex-grow">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900">
                {isAgentUser ? 'وضعیت تایید شده: مشاور / آژانس املاک' : 'نوع هویت آگهی: مالک شخصی'}
              </h4>
              {isAgentUser && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                  ✅ تایید رسمی مدیریت
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              {isAgentUser 
                ? `حساب کاربری شما توسط مدیریت به عنوان مشاور املاک تایید شده است. این آگهی به صورت خودکار با برچسب رسمی «مشاور املاک ${user?.agencyName ? `(${user.agencyName})` : ''}» ثبت و منتشر خواهد شد.`
                : 'این آگهی با عنوان «مالک شخصی» ثبت می‌شود. اعطای برچسب و نقش مشاور املاک صرفاً پس از بررسی مدارک و توسط مدیریت سامانه انجام می‌گردد.'}
            </p>
          </div>
        </div>
      </div>

      {/* Informational Box */}
      <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
          <h4 className="text-amber-800 font-bold text-sm">رمزنگاری و امنیت اطلاعات</h4>
          <p className="text-amber-700 text-xs mt-1 leading-relaxed">تمامی اطلاعات و داده‌های تماس بر اساس استانداردهای امنیتی رمزنگاری شده و بر اساس انتخاب شما به کاربران نمایش داده خواهد شد.</p>
        </div>
      </div>
    </div>
  );
};

export default Step4Account;
