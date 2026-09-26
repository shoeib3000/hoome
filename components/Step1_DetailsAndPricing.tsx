import React, { useState, useEffect, useMemo } from 'react';
import type { PropertyListing, Category, Province } from '../types';
import { estimatePrice } from '../services/geminiService';
import { IRAN_PROVINCES } from '../data/iranProvinces';
import { 
  toEnglishDigits, 
  toPersianDigits, 
  formatThousands, 
  normalizeDecimalInput, 
  getPriceSpelling 
} from '../utils/priceUtils';

interface Step1DetailsAndPricingProps {
  data: PropertyListing;
  setData: React.Dispatch<React.SetStateAction<PropertyListing>>;
  categories: Category[];
  provinces: Province[];
}

const COMMON_AMENITIES = [
  'پارکینگ اختصاصی',
  'آسانسور',
  'انباری سندی',
  'بالکن / تراس',
  'سند تک‌برگ',
  'بازسازی شده کامل',
  'نگهبانی ۲۴ ساعته',
  'درب ضدسرقت',
  'کابینت های‌گلاس',
  'سیستم گرمایش/سرمایش پکیج',
  'نورگیر عالی (رو به آفتاب)',
  'مستر روم',
  'استخر / سونا / جکوزی',
  'دوربین مداربسته',
  'آیفون تصویری',
  'کف سرامیک / پارکت',
  'گاز رومیزی و هود',
  'سالن اجتماعات / لابی'
];

// Reusable Smart Price Input with Full Decimal Support
interface DecimalPriceInputProps {
  label: string;
  value: number | '';
  onChange: (val: number | '') => void;
  placeholder?: string;
  defaultUnit?: 'billion' | 'million' | 'toman';
  actionButton?: React.ReactNode;
  subtitle?: string;
}

const DecimalPriceInput: React.FC<DecimalPriceInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'مبلغ را وارد نمایید',
  defaultUnit = 'billion',
  actionButton,
  subtitle
}) => {
  const [unitMode, setUnitMode] = useState<'billion' | 'million' | 'toman'>(() => {
    if (value && typeof value === 'number') {
      if (value >= 1000000000 && value % 1000000 === 0) return 'billion';
      if (value >= 1000000 && value % 1000 === 0) return 'million';
    }
    return defaultUnit;
  });

  const [inputText, setInputText] = useState<string>(() => {
    if (value === '' || value === undefined || value === null) return '';
    const num = Number(value);
    if (isNaN(num)) return '';
    if (unitMode === 'billion') {
      const b = (num / 1000000000);
      return b.toLocaleString('en-US', { maximumFractionDigits: 4 });
    }
    if (unitMode === 'million') {
      const m = (num / 1000000);
      return m.toLocaleString('en-US', { maximumFractionDigits: 3 });
    }
    return formatThousands(num);
  });

  useEffect(() => {
    if (value === '' || value === undefined || value === null) {
      setInputText('');
      return;
    }
    const num = Number(value);
    if (isNaN(num)) return;

    if (unitMode === 'billion') {
      const b = num / 1000000000;
      const currentParsed = Number(toEnglishDigits(inputText)) * 1000000000;
      if (currentParsed !== num) {
        setInputText(b.toLocaleString('en-US', { maximumFractionDigits: 4 }));
      }
    } else if (unitMode === 'million') {
      const m = num / 1000000;
      const currentParsed = Number(toEnglishDigits(inputText)) * 1000000;
      if (currentParsed !== num) {
        setInputText(m.toLocaleString('en-US', { maximumFractionDigits: 3 }));
      }
    } else {
      const currentParsed = Number(toEnglishDigits(inputText).replace(/,/g, ''));
      if (currentParsed !== num) {
        setInputText(formatThousands(num));
      }
    }
  }, [value, unitMode]);

  const handleUnitChange = (newUnit: 'billion' | 'million' | 'toman') => {
    setUnitMode(newUnit);
    if (value === '' || isNaN(Number(value)) || Number(value) === 0) {
      setInputText('');
      return;
    }
    const num = Number(value);
    if (newUnit === 'billion') {
      const b = num / 1000000000;
      setInputText(b.toLocaleString('en-US', { maximumFractionDigits: 4 }));
    } else if (newUnit === 'million') {
      const m = num / 1000000;
      setInputText(m.toLocaleString('en-US', { maximumFractionDigits: 3 }));
    } else {
      setInputText(formatThousands(num));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeDecimalInput(raw);

    if (normalized === '') {
      setInputText('');
      onChange('');
      return;
    }

    if (unitMode === 'billion') {
      setInputText(normalized);
      const bFloat = parseFloat(normalized);
      if (!isNaN(bFloat)) {
        const tomanVal = Math.round(bFloat * 1000000000);
        onChange(tomanVal);
      }
    } else if (unitMode === 'million') {
      setInputText(normalized);
      const mFloat = parseFloat(normalized);
      if (!isNaN(mFloat)) {
        const tomanVal = Math.round(mFloat * 1000000);
        onChange(tomanVal);
      }
    } else {
      const formatted = formatThousands(normalized);
      setInputText(formatted);
      const cleanNum = parseFloat(normalized);
      onChange(isNaN(cleanNum) ? '' : cleanNum);
    }
  };

  const addQuickAmount = (amountTomans: number) => {
    const current = Number(value) || 0;
    const nextVal = current + amountTomans;
    onChange(nextVal);
  };

  const spelling = useMemo(() => getPriceSpelling(value), [value]);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-black text-slate-800 flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-rose-500">*</span>
          {subtitle && <span className="text-[11px] font-normal text-slate-400">({subtitle})</span>}
        </label>

        {/* Unit Selector */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-black">
          <button
            type="button"
            onClick={() => handleUnitChange('billion')}
            className={`px-3 py-1 rounded-lg transition-all ${
              unitMode === 'billion' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            میلیارد
          </button>
          <button
            type="button"
            onClick={() => handleUnitChange('million')}
            className={`px-3 py-1 rounded-lg transition-all ${
              unitMode === 'million' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            میلیون
          </button>
          <button
            type="button"
            onClick={() => handleUnitChange('toman')}
            className={`px-3 py-1 rounded-lg transition-all ${
              unitMode === 'toman' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            تومان کامل
          </button>
        </div>
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-28 pr-5 py-4 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-black text-base text-slate-800 placeholder-slate-400"
          dir="ltr"
        />
        <div className="absolute left-3 flex items-center gap-2 pointer-events-none">
          <span className="text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
            {unitMode === 'billion' ? 'میلیارد تومان' : unitMode === 'million' ? 'میلیون تومان' : 'تومان'}
          </span>
        </div>
      </div>

      {/* Verbal Preview & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {spelling && spelling.fullWords ? (
          <div className="text-xs font-black text-indigo-600 bg-indigo-50/70 border border-indigo-100 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
            <span>🗣️</span>
            <span>{spelling.fullWords}</span>
          </div>
        ) : (
          <div className="text-[11px] font-medium text-slate-400">
            {unitMode === 'billion' ? 'مثال: برای ۲ میلیارد و ۵۰۰ میلیون تومان، عدد 2.5 را بنویسید.' : 'مبلغ را وارد نمایید.'}
          </div>
        )}

        {actionButton}
      </div>

      {/* Quick Add Presets */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] font-bold text-slate-400 ml-1">افزایش سریع:</span>
        {unitMode === 'billion' ? (
          <>
            <button type="button" onClick={() => addQuickAmount(500000000)} className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">+ ۵۰۰ م</button>
            <button type="button" onClick={() => addQuickAmount(1000000000)} className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">+ ۱ میلیارد</button>
            <button type="button" onClick={() => addQuickAmount(2000000000)} className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">+ ۲ میلیارد</button>
            <button type="button" onClick={() => addQuickAmount(5000000000)} className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">+ ۵ میلیارد</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => addQuickAmount(50000000)} className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">+ ۵۰ م</button>
            <button type="button" onClick={() => addQuickAmount(100000000)} className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">+ ۱۰۰ م</button>
            <button type="button" onClick={() => addQuickAmount(500000000)} className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">+ ۵۰۰ م</button>
          </>
        )}
      </div>
    </div>
  );
};

const Step1DetailsAndPricing: React.FC<Step1DetailsAndPricingProps> = ({
  data,
  setData,
  categories = [],
  provinces = []
}) => {
  const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);
  const [estimateResult, setEstimateResult] = useState<string>('');

  const activeProvinces = provinces && provinces.length > 0 ? provinces : IRAN_PROVINCES;
  const selectedProvince = activeProvinces.find(p => p.name === data.province);

  const handleEstimatePrice = async () => {
    setIsEstimatingPrice(true);
    setEstimateResult('');
    try {
      const result = await estimatePrice({
        size: data.size !== '' ? Number(data.size) : 100,
        neighborhood: data.neighborhood || data.city || 'تهران',
        city: data.city || 'تهران',
        category: data.category
      });
      setEstimateResult(result);
    } catch (e: any) {
      setEstimateResult('خطا در برآورد هوشمند قیمت.');
    } finally {
      setIsEstimatingPrice(false);
    }
  };

  const handleToggleAmenity = (amenity: string) => {
    const currentFeatures = data.keyFeatures ? data.keyFeatures.split('،').map(f => f.trim()).filter(Boolean) : [];
    let updated: string[];
    if (currentFeatures.includes(amenity)) {
      updated = currentFeatures.filter(f => f !== amenity);
    } else {
      updated = [...currentFeatures, amenity];
    }
    setData(prev => ({ ...prev, keyFeatures: updated.join('، ') }));
  };

  const currentFeaturesList = useMemo(() => {
    return data.keyFeatures ? data.keyFeatures.split('،').map(f => f.trim()).filter(Boolean) : [];
  }, [data.keyFeatures]);

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* 1. Category & Deal Type */}
      <div className="bg-slate-50/70 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>🏷️</span> دسته‌بندی و نوع معامله
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1">نوع ملک و قصد واگذاری را انتخاب کنید.</p>
          </div>

          {/* Deal Type Switch */}
          <div className="p-1.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-1 shadow-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setData(prev => ({ ...prev, type: 'sale' }))}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${
                data.type === 'sale' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏷️ فروش نقدی
            </button>
            <button
              type="button"
              onClick={() => setData(prev => ({ ...prev, type: 'rent' }))}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${
                data.type === 'rent' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔑 رهن و اجاره
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <div>
          <label className="block text-xs font-black text-slate-600 mb-3">دسته‌بندی کاربری ملک:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {categories.map(cat => {
              const isSelected = data.category === cat.name || data.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, category: cat.name }))}
                  className={`p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 group ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-md shadow-indigo-100 scale-[1.02]' 
                      : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon || '🏢'}</span>
                  <span className="text-xs font-black">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Location Section */}
      <div className="bg-slate-50/70 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>📍</span> موقعیت و آدرس ملک
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">استان، شهر و نام محله برای جستجوی دقیق‌تر کاربران.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">استان <span className="text-rose-500">*</span></label>
            <select
              value={data.province}
              onChange={(e) => setData(prev => ({ ...prev, province: e.target.value, city: '' }))}
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-xs text-slate-800"
            >
              <option value="">انتخاب استان...</option>
              {activeProvinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">شهر <span className="text-rose-500">*</span></label>
            <select
              disabled={!data.province}
              value={data.city}
              onChange={(e) => setData(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-xs text-slate-800 disabled:opacity-50 disabled:bg-slate-100"
            >
              <option value="">انتخاب شهر...</option>
              {selectedProvince?.cities.map((city, idx) => <option key={idx} value={city}>{city}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">محله / خیابان</label>
            <input
              type="text"
              value={data.neighborhood || ''}
              onChange={(e) => setData(prev => ({ ...prev, neighborhood: e.target.value }))}
              placeholder="مثال: نیاوران، خیابان یاسر"
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-xs text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* 3. Physical Specs */}
      <div className="bg-slate-50/70 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>📐</span> مشخصات فنی و متراژ
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">مشخصات ساختاری و ابعاد ملک را وارد نمایید.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">متراژ (مترمربع) <span className="text-rose-500">*</span></label>
            <input
              type="number"
              value={data.size}
              onChange={(e) => setData(prev => ({ ...prev, size: e.target.value === '' ? '' : Number(e.target.value) }))}
              placeholder="مثال: 120"
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-xs text-slate-800"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">تعداد خواب</label>
            <select
              value={data.bedrooms}
              onChange={(e) => setData(prev => ({ ...prev, bedrooms: e.target.value === '' ? '' : Number(e.target.value) }))}
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs text-slate-800"
            >
              <option value="">بدون خواب / فلت</option>
              <option value="1">۱ خواب</option>
              <option value="2">۲ خواب</option>
              <option value="3">۳ خواب</option>
              <option value="4">۴ خواب</option>
              <option value="5">۵ خواب و بیشتر</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">سرویس بهداشتی</label>
            <select
              value={data.bathrooms}
              onChange={(e) => setData(prev => ({ ...prev, bathrooms: e.target.value === '' ? '' : Number(e.target.value) }))}
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs text-slate-800"
            >
              <option value="">نامشخص</option>
              <option value="1">۱ سرویس</option>
              <option value="2">۲ سرویس</option>
              <option value="3">۳ سرویس و بیشتر</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">سال ساخت</label>
            <input
              type="text"
              value={data.yearBuilt}
              onChange={(e) => {
                const val = e.target.value;
                const eng = toEnglishDigits(val);
                const num = Number(eng);
                setData(prev => ({ ...prev, yearBuilt: val === '' ? '' : (isNaN(num) ? '' : num) }));
              }}
              placeholder="مثال: 1402 یا 1398"
              className="w-full px-4 py-3.5 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 4. Pricing & Valuation */}
      <div className="bg-slate-50/70 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>💰</span> قیمت‌گذاری و ارزش‌گذاری
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {data.type === 'sale' ? 'قیمت کل فروش ملک را وارد نمایید.' : 'مبلغ رهن (ودیعه) و اجاره ماهانه را تعیین کنید.'}
          </p>
        </div>

        {data.type === 'sale' ? (
          <div className="space-y-4">
            <DecimalPriceInput
              label="قیمت کل فروش"
              value={data.price !== '' ? Number(data.price) : ''}
              onChange={(val) => setData(prev => ({ ...prev, price: val }))}
              placeholder="مثال: 6.5 (میلیارد)"
              defaultUnit="billion"
              actionButton={
                <button
                  type="button"
                  onClick={handleEstimatePrice}
                  disabled={isEstimatingPrice}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs rounded-xl shadow-xs hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>✨</span>
                  <span>{isEstimatingPrice ? 'در حال برآورد...' : 'تخمین هوشمند قیمت'}</span>
                </button>
              }
            />

            {estimateResult && (
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl text-xs font-bold text-purple-900 flex items-start gap-2.5 animate-fade-in">
                <span className="text-lg">🤖</span>
                <div className="leading-relaxed whitespace-pre-wrap">{estimateResult}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DecimalPriceInput
              label="مبلغ ودیعه (رهن)"
              value={data.deposit !== undefined && data.deposit !== '' ? Number(data.deposit) : (data.price !== '' ? Number(data.price) : '')}
              onChange={(val) => setData(prev => ({ ...prev, deposit: val, price: val }))}
              placeholder="مثال: 500 (میلیون)"
              defaultUnit="million"
            />

            <DecimalPriceInput
              label="اجاره ماهانه"
              value={data.rent !== undefined && data.rent !== '' ? Number(data.rent) : ''}
              onChange={(val) => setData(prev => ({ ...prev, rent: val }))}
              placeholder="مثال: 15 (میلیون)"
              defaultUnit="million"
            />
          </div>
        )}
      </div>

      {/* 5. Key Amenities & Features */}
      <div className="bg-slate-50/70 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 space-y-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>✨</span> امکانات و ویژگی‌های برجسته
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">با کلیک روی گزینه‌ها، امکانات ملک را به سرعت انتخاب کنید.</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {COMMON_AMENITIES.map((amenity, idx) => {
            const isChecked = currentFeaturesList.includes(amenity);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleToggleAmenity(amenity)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isChecked 
                    ? 'bg-indigo-600 text-white shadow-xs font-black scale-105' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{isChecked ? '✓' : '+'}</span>
                <span>{amenity}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <input
            type="text"
            value={data.keyFeatures}
            onChange={(e) => setData(prev => ({ ...prev, keyFeatures: e.target.value }))}
            placeholder="سایر امکانات دلخواه (با ویرگول جدا کنید: انباری بزرگ، نورپردازی، سرایداری...)"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};

export default Step1DetailsAndPricing;
