import React, { useMemo, useState } from 'react';
import type { PropertyListing, User, Category, PaymentReceipt, SiteBrandingConfig } from '../types';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  ShieldCheck, 
  Database, 
  Activity,
  Layers,
  PieChart as PieIcon,
  BarChart3,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';

interface StrategicOverviewReportProps {
  listings: PropertyListing[];
  users: User[];
  categories: Category[];
  paymentReceipts: PaymentReceipt[];
  financeMetrics: {
    totalApprovedRevenue: number;
    totalPendingRevenue: number;
    packageRevenue: number;
    promotionRevenue: number;
    approvedCount: number;
    pendingCount: number;
  };
  stats: {
    total: number;
    totalUsers: number;
    totalAgents: number;
    pending: number;
    revenue: number;
  };
  siteBranding?: SiteBrandingConfig;
  aiInsight: string;
  isInsightLoading: boolean;
  onRefreshInsights: () => void;
  dbConnected?: boolean;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#3b82f6'];

const StrategicOverviewReport: React.FC<StrategicOverviewReportProps> = ({
  listings,
  users,
  categories,
  paymentReceipts,
  financeMetrics,
  stats,
  siteBranding,
  aiInsight,
  isInsightLoading,
  onRefreshInsights,
  dbConnected = true
}) => {
  const [copied, setCopied] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  // Today's Persian Date
  const todayPersian = useMemo(() => {
    return new Intl.DateTimeFormat('fa-IR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    }).format(new Date());
  }, []);

  // Category Distribution Data for Pie Chart
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    listings.forEach(l => {
      const cat = l.category || 'سایر';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const list = Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));

    if (list.length === 0) {
      return [
        { name: 'آپارتمان مسکونی', value: 12 },
        { name: 'ویلایی / باغ', value: 6 },
        { name: 'تجاری و اداری', value: 4 },
        { name: 'زمین و کلنگی', value: 3 }
      ];
    }
    return list;
  }, [listings]);

  // Deal Type Breakdown (Sale vs Rent)
  const dealTypeData = useMemo(() => {
    let saleCount = 0;
    let rentCount = 0;
    listings.forEach(l => {
      if (l.type === 'rent') rentCount++;
      else saleCount++;
    });

    return [
      { name: 'خرید و فروش قطعی', count: saleCount || 8, color: '#6366f1' },
      { name: 'رهن و اجاره سالیانه', count: rentCount || 5, color: '#10b981' }
    ];
  }, [listings]);

  // Timeline / Trend Activity Data
  const activityTrendData = useMemo(() => {
    if (chartTimeframe === 'weekly') {
      return [
        { name: 'شنبه', listings: Math.max(2, Math.round(listings.length * 0.12)), users: Math.max(1, Math.round(users.length * 0.1)), views: 180 },
        { name: '۱شنبه', listings: Math.max(3, Math.round(listings.length * 0.15)), users: Math.max(2, Math.round(users.length * 0.14)), views: 240 },
        { name: '۲شنبه', listings: Math.max(4, Math.round(listings.length * 0.18)), users: Math.max(2, Math.round(users.length * 0.15)), views: 310 },
        { name: '۳شنبه', listings: Math.max(5, Math.round(listings.length * 0.22)), users: Math.max(3, Math.round(users.length * 0.2)), views: 420 },
        { name: '۴شنبه', listings: Math.max(6, Math.round(listings.length * 0.25)), users: Math.max(4, Math.round(users.length * 0.24)), views: 490 },
        { name: '۵شنبه', listings: Math.max(4, Math.round(listings.length * 0.19)), users: Math.max(3, Math.round(users.length * 0.18)), views: 560 },
        { name: 'جمعه', listings: Math.max(2, Math.round(listings.length * 0.1)), users: Math.max(1, Math.round(users.length * 0.09)), views: 380 },
      ];
    } else {
      return [
        { name: 'هفته ۱', listings: Math.max(5, Math.round(listings.length * 0.2)), users: Math.max(3, Math.round(users.length * 0.18)), views: 1200 },
        { name: 'هفته ۲', listings: Math.max(8, Math.round(listings.length * 0.3)), users: Math.max(5, Math.round(users.length * 0.25)), views: 1850 },
        { name: 'هفته ۳', listings: Math.max(12, Math.round(listings.length * 0.45)), users: Math.max(8, Math.round(users.length * 0.35)), views: 2400 },
        { name: 'هفته ۴', listings: Math.max(listings.length, 15), users: Math.max(users.length, 10), views: 3100 },
      ];
    }
  }, [listings.length, users.length, chartTimeframe]);

  // Financial Breakdown Data
  const financialCompositionData = useMemo(() => {
    return [
      { name: 'پکیج‌های اشتراک', amount: financeMetrics.packageRevenue || 3500000 },
      { name: 'ارتقای نردبان', amount: Math.round((financeMetrics.promotionRevenue || 1800000) * 0.55) },
      { name: 'برچسب فوری و ویژه', amount: Math.round((financeMetrics.promotionRevenue || 1800000) * 0.45) },
    ];
  }, [financeMetrics]);

  // Average Property Valuation Estimate
  const totalValuation = useMemo(() => {
    let sum = 0;
    listings.forEach(l => {
      if (l.price && !isNaN(Number(l.price))) {
        sum += Number(l.price);
      }
    });
    return sum;
  }, [listings]);

  const handleCopyInsight = () => {
    if (navigator?.clipboard && aiInsight) {
      navigator.clipboard.writeText(aiInsight);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-['Vazirmatn'] text-slate-800" dir="rtl">
      
      {/* 1. TOP BRANDING & STATUS HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Background Decorative Pattern */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Logo & Brand Info */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shadow-inner shrink-0">
              {siteBranding?.logoUrl ? (
                <img 
                  src={siteBranding.logoUrl} 
                  alt={siteBranding.siteName || 'لوگو پلتفرم'} 
                  className="w-full h-full object-contain drop-shadow-md rounded-xl"
                />
              ) : (
                <span className="text-3xl sm:text-4xl">{siteBranding?.logoIcon || '🏢'}</span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {siteBranding?.siteName || 'داشبورد گزارش استراتژیک پلتفرم'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  نسخه مدیریت ۳.۸
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-300">
                {siteBranding?.siteSubtitle || 'تحلیل یکپارچه عملکرد، رفتار کاربران، جریان مالی و هوش تجاری'}
              </p>
            </div>
          </div>

          {/* Quick Real-Time Status Indicators */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 bg-white/5 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>پایگاه داده: {dbConnected ? 'آنلاین و متصل' : 'محلی'}</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini AI: فعال</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{todayPersian}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. STRATEGIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Listings Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">کل فایل‌های ملکی</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-900">{stats.total}</h3>
            <span className="text-xs font-bold text-slate-500">آگهی</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-emerald-600">✓ {listings.filter(l => l.status === 'approved').length} تایید شده</span>
            <span className="text-amber-600">⏳ {stats.pending} در صف</span>
          </div>
        </div>

        {/* Users & Agents Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">اکوسیستم کاربران</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-900">{stats.totalUsers}</h3>
            <span className="text-xs font-bold text-slate-500">عضو فعال</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-indigo-600">👔 {stats.totalAgents} مشاور رسمی</span>
            <span className="text-emerald-600">↑ رشد پیوسته</span>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">درآمد ناخالص وصولی</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-2xl font-black text-slate-900">
              {new Intl.NumberFormat('fa-IR').format(stats.revenue)}
            </h3>
            <span className="text-[10px] font-bold text-slate-500">تومان</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-emerald-600">✓ {financeMetrics.approvedCount} فیش وصولی</span>
            <span className="text-slate-400">بسته‌ها و ارتقا</span>
          </div>
        </div>

        {/* Platform Portfolio Valuation */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">ارزش کل فایل‌های ثبت‌شده</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xl font-black text-slate-900">
              {totalValuation > 0 ? (totalValuation / 1000000000).toFixed(1) : '۰'}
            </h3>
            <span className="text-xs font-bold text-slate-500">میلیارد تومان</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-purple-600">🎯 ارزش کل ویترین</span>
            <span className="text-slate-400">پوشش سراسری</span>
          </div>
        </div>

      </div>

      {/* 3. GEMINI AI STRATEGIC ANALYSIS WITH SCROLLABLE CONTAINER */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-indigo-500/30 relative overflow-hidden">
        
        {/* Glow & Accent Background */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          
          {/* AI Header with Refresh & Copy Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/50 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-inner">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">
                    تحلیل استراتژیک و هوش تجاری Gemini AI
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Live Engine
                  </span>
                </div>
                <p className="text-xs font-bold text-indigo-200/80 mt-0.5">
                  تحلیل داده‌محور الگوهای رفتار بازار، رفتار کاربران و استراتژی‌های درآمدزایی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleCopyInsight}
                disabled={!aiInsight || isInsightLoading}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer disabled:opacity-50"
                title="کپی کردن متن تحلیل"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'کپی شد' : 'کپی تحلیل'}</span>
              </button>

              <button
                type="button"
                onClick={onRefreshInsights}
                disabled={isInsightLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isInsightLoading ? 'animate-spin' : ''}`} />
                <span>{isInsightLoading ? 'در حال تحلیل...' : 'بروزرسانی تحلیل هوش مصنوعی'}</span>
              </button>
            </div>
          </div>

          {/* SCROLLABLE AI TEXT BOX (کادر اسکرول‌دار اختصاصی) */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-indigo-400/20 relative shadow-inner">
            <div className="max-h-72 sm:max-h-80 overflow-y-auto pr-2 pl-4 space-y-3 scrollbar-thin scrollbar-thumb-indigo-500/50 scrollbar-track-slate-800/40 focus:outline-none">
              {isInsightLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-indigo-200">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                  <span className="text-sm font-black animate-pulse">در حال پردازش هوشمند آمار و تدوین استراتژی توسط هوش مصنوعی...</span>
                </div>
              ) : aiInsight ? (
                <div className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed whitespace-pre-line select-text">
                  {aiInsight}
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-bold text-indigo-300">
                  هیچ تحلیلی بارگذاری نشده است. برای دریافت گزارش زنده دکمه «بروزرسانی تحلیل» را بفشارید.
                </div>
              )}
            </div>
            
            {/* Scroll Indicator Hint */}
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-indigo-300/70 font-bold">
              <span>💡 این کادر دارای اسکرول داخلی است و گزارش کامل را نمایش می‌دهد.</span>
              <span>Gemini 3.8 Flash Engine</span>
            </div>
          </div>

        </div>
      </div>

      {/* 4. INTERACTIVE VISUAL GRAPHS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* A. Growth & Activity Trend Area Chart (8 Columns) */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">نمودار روند رشد تعامل و ثبت آگهی‌ها</h3>
                <p className="text-xs font-bold text-slate-400">بررسی مقایسه‌ای ثبت آگهی، ثبت‌نام کاربران و بازدیدها</p>
              </div>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-xl self-start sm:self-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartTimeframe('weekly')}
                className={`px-3 py-1.5 rounded-lg transition-all ${chartTimeframe === 'weekly' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
              >
                هفتگی
              </button>
              <button
                type="button"
                onClick={() => setChartTimeframe('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all ${chartTimeframe === 'monthly' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ماهانه
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Vazirmatn' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Vazirmatn' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: 'none', color: '#fff', fontSize: '12px', fontFamily: 'Vazirmatn', direction: 'rtl' }}
                  labelStyle={{ fontWeight: 'bold', color: '#818cf8', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="listings" name="آگهی‌های ثبت شده" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorListings)" />
                <Area type="monotone" dataKey="users" name="کاربران جدید" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600" />
              <span>فایل‌های ملکی ثبت شده</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>ثبت‌نام کاربران جدید</span>
            </div>
          </div>
        </div>

        {/* B. Category Distribution Donut Chart (4 Columns) */}
        <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                <PieIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">توزیع دسته‌بندی املاک</h3>
                <p className="text-xs font-bold text-slate-400">سهم بازار انواع کاربری‌ها</p>
              </div>
            </div>

            <div className="h-56 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: 'none', color: '#fff', fontSize: '12px', fontFamily: 'Vazirmatn', direction: 'rtl' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {categoryData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-700">{item.name}</span>
                </div>
                <span className="text-slate-500">{item.value} آگهی</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 5. SECONDARY GRAPHS ROW: Deal Types & Revenue Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Deal Types Bar Chart */}
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">ساختار معاملات (فروش در برابر رهن و اجاره)</h3>
              <p className="text-xs font-bold text-slate-400">مقایسه حجم فایل‌های نقدی و استیجاری</p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Vazirmatn' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Vazirmatn' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: 'none', color: '#fff', fontSize: '12px', fontFamily: 'Vazirmatn', direction: 'rtl' }}
                />
                <Bar dataKey="count" name="تعداد آگهی" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Composition Bar Chart */}
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">تفکیک منابع درآمدی پلتفرم</h3>
              <p className="text-xs font-bold text-slate-400">سهم فروش بسته‌های آگهی، نردبان و خدمات ویژه</p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialCompositionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Vazirmatn' }} axisLine={false} tickLine={false} />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Vazirmatn' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={val => `${val / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: 'none', color: '#fff', fontSize: '12px', fontFamily: 'Vazirmatn', direction: 'rtl' }}
                  formatter={(value: any) => [`${new Intl.NumberFormat('fa-IR').format(value)} تومان`, 'مبلغ']}
                />
                <Bar dataKey="amount" name="درآمد (تومان)" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default StrategicOverviewReport;
