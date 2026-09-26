import React, { useState, useEffect, useMemo } from 'react';
import type { PropertyListing, Category } from '../types';
import { generateDescription, estimatePrice } from '../services/geminiService';
import { 
  toEnglishDigits, 
  toPersianDigits, 
  formatThousands, 
  normalizeDecimalInput, 
  getPriceSpelling 
} from '../utils/priceUtils';

interface Step2DetailsProps {
  data: PropertyListing;
  setData: React.Dispatch<React.SetStateAction<PropertyListing>>;
  categories: Category[];
}

const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10.868 2.884c.321.64.321 1.415 0 2.055l-1.414 2.828a1 1 0 00.52 1.528l2.828 1.414c.64.321 1.415.321 2.055 0l2.828-1.414a1 1 0 00.52-1.528l-1.414-2.828c-.321-.64-.321-1.415 0-2.055l1.414-2.828a1 1 0 00-.52-1.528l-2.828-1.414c-.64-.321-1.415-.321-2.055 0l-2.828 1.414a1 1 0 00-.52 1.528l1.414 2.828z" clipRule="evenodd" />
  </svg>
);

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
  // Mode: 'billion' (اعشاری میلیارد), 'million' (اعشاری میلیون), 'toman' (تومان کامل با کاما)
  const [unitMode, setUnitMode] = useState<'billion' | 'million' | 'toman'>(() => {
    if (value && typeof value === 'number') {
      if (value >= 1000000000 && value % 1000000 === 0) return 'billion';
      if (value >= 1000000 && value % 1000 === 0) return 'million';
    }
    return defaultUnit;
  });

  // Display text in the active input
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

  // Keep inputText in sync if external value changes (e.g. from AI estimate)
  useEffect(() => {
    if (value === '' || value === undefined || value === null) {
      setInputText('');
      return;
    }
    const num = Number(value);
    if (isNaN(num)) return;

    if (unitMode === 'billion') {
      const b = num / 1000000000;
      // Only update if different to avoid cursor jumps
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

  // Handle unit mode switch
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

  // Handle typing inside the input
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
      // Full Tomans with auto-formatting
      const formatted = formatThousands(normalized);
      setInputText(formatted);
      const cleanNum = parseFloat(normalized);
      onChange(isNaN(cleanNum) ? '' : cleanNum);
    }
  };

  // Quick preset adder
  const addQuickAmount = (amountTomans: number) => {
    const current = Number(value) || 0;
    const nextVal = current + amountTomans;
    onChange(nextVal);
  };

  // Verbal and decimal preview
  const spelling = useMemo(() => getPriceSpelling(value), [value]);

  return (
    <div className="space-y-2 bg-slate-50/60 p-4 rounded-3xl border border-slate-100 transition-all">
      {/* Header and Label */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="text-sm font-black text-slate-800 block">
            {label}
          </label>
          {subtitle && (
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
        {actionButton}
      </div>

      {/* Unit Selector Tabs with Decimal highlight */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          type="button"
          onClick={() => handleUnitChange('billion')}
          className={`flex-1 py-1.5 px-2 text-xs font-black rounded-xl transition-all ${
            unitMode === 'billion'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          میلیارد تومان (اعشاری)
        </button>
        <button
          type="button"
          onClick={() => handleUnitChange('million')}
          className={`flex-1 py-1.5 px-2 text-xs font-black rounded-xl transition-all ${
            unitMode === 'million'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          میلیون تومان (اعشاری)
        </button>
        <button
          type="button"
          onClick={() => handleUnitChange('toman')}
          className={`flex-1 py-1.5 px-2 text-xs font-black rounded-xl transition-all ${
            unitMode === 'toman'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          تومان کامل
        </button>
      </div>

      {/* Main Input Box */}
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={inputText}
          onChange={handleInputChange}
          className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-black text-indigo-700 text-xl text-left"
          placeholder={
            unitMode === 'billion'
              ? 'مثال: ۲.۵ یا ۳.۷۵'
              : unitMode === 'million'
              ? 'مثال: ۱۵۰.۵ یا ۸۵'
              : placeholder
          }
          dir="ltr"
        />
        <div className="absolute top-1/2 -translate-y-1/2 right-4 text-xs font-black text-slate-400 pointer-events-none">
          {unitMode === 'billion' ? 'میلیارد تومان' : unitMode === 'million' ? 'میلیون تومان' : 'تومان'}
        </div>
      </div>

      {/* Live Decimal & Verbal Spellout */}
      {value !== '' && Number(value) > 0 && (
        <div className="p-3 bg-white rounded-2xl border border-indigo-100 shadow-2xs space-y-1 animate-fade-in">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-500 font-bold">معادل به عدد:</span>
            <span className="text-indigo-600 font-black">
              {spelling.shortText}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 border-t border-slate-100">
            <span>مبلغ به حروف:</span>
            <span className="text-slate-700 font-black">
              {spelling.fullWords}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium text-left dir-ltr font-mono">
            {formatThousands(Number(value))} تومان
          </div>
        </div>
      )}

      {/* Quick Helper Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-hide text-[10px] font-bold text-slate-500">
        <span className="shrink-0 text-slate-400">افزودن سریع:</span>
        <button
          type="button"
          onClick={() => addQuickAmount(100000000)}
          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shrink-0 transition-colors"
        >
          +۱۰۰ میلیون
        </button>
        <button
          type="button"
          onClick={() => addQuickAmount(500000000)}
          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shrink-0 transition-colors"
        >
          +۵۰۰ میلیون
        </button>
        <button
          type="button"
          onClick={() => addQuickAmount(1000000000)}
          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shrink-0 transition-colors"
        >
          +۱ میلیارد
        </button>
        {value !== '' && Number(value) > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setInputText('');
            }}
            className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg shrink-0 transition-colors"
          >
            پاک کردن
          </button>
        )}
      </div>
    </div>
  );
};

const Step2Details: React.FC<Step2DetailsProps> = ({ data, setData, categories }) => {
  const [isDescLoading, setIsDescLoading] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [priceTip, setPriceTip] = useState('');
  
  // Generic change handler for standard inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Size supports decimals (float)
    if (name === 'size') {
      const normalized = normalizeDecimalInput(value);
      setData(prev => ({ 
        ...prev, 
        size: normalized === '' ? '' : parseFloat(normalized) 
      }));
      return;
    }

    const isIntegerNumeric = ['bedrooms', 'bathrooms', 'yearBuilt'].includes(name);
    setData(prev => ({ 
      ...prev, 
      [name]: isIntegerNumeric ? (value === '' ? '' : parseInt(value, 10)) : value 
    }));
  };

  // AI Description Generator
  const handleGenerateDescription = async () => {
    setIsDescLoading(true);
    const description = await generateDescription(data.keyFeatures);
    setData(prev => ({ ...prev, description }));
    setIsDescLoading(false);
  };

  // AI Price Estimator
  const handleEstimatePrice = async () => {
    if (!data.size || !data.neighborhood) {
      setPriceTip('لطفاً ابتدا متراژ و محله را تکمیل فرمایید تا هوش مصنوعی بتواند برآورد دقیقی ارائه دهد.');
      return;
    }
    setIsPriceLoading(true);
    const tip = await estimatePrice({ 
      size: data.size, 
      neighborhood: data.neighborhood, 
      city: data.city, 
      category: data.category 
    });
    setPriceTip(tip);
    setIsPriceLoading(false);
  };

  // Calculate Price Per Square Meter (with decimals)
  const pricePerMeter = useMemo(() => {
    if (data.type !== 'sale' || !data.price || !data.size) return null;
    const p = Number(data.price);
    const s = Number(data.size);
    if (isNaN(p) || isNaN(s) || s <= 0 || p <= 0) return null;
    const perMeter = p / s;
    return getPriceSpelling(perMeter);
  }, [data.price, data.size, data.type]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title & Introduction */}
      <div className="text-center md:text-right">
        <h2 className="text-2xl font-black text-slate-800">جزئیات، مشخصات و قیمت‌گذاری ملک</h2>
        <p className="text-slate-500 mt-2 font-medium">
          اطلاعات فنی و قیمت ملک را با دقت تکمیل نمایید. ارقام اعشاری در تمامی فیلدهای متراژ و قیمت به طور کامل پشتیبانی می‌شوند.
        </p>
      </div>
      
      {/* Listing Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-black text-slate-700 mb-2 mr-2">
          عنوان جذاب برای آگهی
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={data.title}
          onChange={handleChange}
          className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-bold"
          placeholder="مثال: آپارتمان ۱۲۰ متری، کلید نخورده با ویو ابدی"
        />
      </div>

      {/* Deal Type & Property Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="type" className="block text-sm font-black text-slate-700 mb-2 mr-2">
            نوع واگذاری
          </label>
          <select 
            id="type" 
            name="type" 
            value={data.type} 
            onChange={handleChange} 
            className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-bold text-slate-700 appearance-none cursor-pointer"
          >
            <option value="sale">فروش نقدی</option>
            <option value="rent">رهن و اجاره</option>
          </select>
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-black text-slate-700 mb-2 mr-2">
            دسته‌بندی ملک
          </label>
          <select 
            id="category" 
            name="category" 
            value={data.category} 
            onChange={handleChange} 
            className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-bold text-slate-700 appearance-none cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Dimensions & Specifications (with Decimal support for Size) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="size" className="block text-xs font-black text-slate-600 mb-2">
            متراژ (متر مربع - اعشاری)
          </label>
          <input 
            type="number" 
            step="any"
            id="size" 
            name="size" 
            value={data.size} 
            onChange={handleChange} 
            placeholder="مثال: ۸۵.۵"
            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-left" 
            dir="ltr"
          />
          {data.size && (
            <span className="text-[10px] text-slate-400 font-bold block mt-1">
              {toPersianDigits(data.size)} متر مربع
            </span>
          )}
        </div>
        <div>
          <label htmlFor="bedrooms" className="block text-xs font-black text-slate-600 mb-2">
            تعداد اتاق
          </label>
          <input 
            type="number" 
            id="bedrooms" 
            name="bedrooms" 
            value={data.bedrooms} 
            onChange={handleChange} 
            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-left" 
            dir="ltr"
          />
        </div>
        <div>
          <label htmlFor="bathrooms" className="block text-xs font-black text-slate-600 mb-2">
            سرویس بهداشتی
          </label>
          <input 
            type="number" 
            id="bathrooms" 
            name="bathrooms" 
            value={data.bathrooms} 
            onChange={handleChange} 
            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-left" 
            dir="ltr"
          />
        </div>
        <div>
          <label htmlFor="yearBuilt" className="block text-xs font-black text-slate-600 mb-2">
            سال ساخت
          </label>
          <input 
            type="number" 
            id="yearBuilt" 
            name="yearBuilt" 
            value={data.yearBuilt} 
            onChange={handleChange} 
            placeholder="مثال: ۱۴۰۲"
            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-left" 
            dir="ltr"
          />
        </div>
      </div>
      
      {/* ======================================================== */}
      {/* SECTION: PRICE REGISTRATION WITH FULL DECIMAL SUPPORT   */}
      {/* ======================================================== */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800">
              {data.type === 'rent' ? 'مبالغ رهن و اجاره' : 'قیمت‌گذاری فروش ملک'}
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              امکان ثبت اعشار به صورت میلیارد، میلیون و تومان کامل با محاسبه لحظه‌ای
            </p>
          </div>
          <button 
            type="button" 
            onClick={handleEstimatePrice}
            className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 transition-colors border border-indigo-100"
            disabled={isPriceLoading}
          >
            <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>تخمین هوشمند قیمت</span>
          </button>
        </div>

        {/* AI Estimation Result Alert */}
        {priceTip && (
          <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl text-xs font-bold text-indigo-800 leading-relaxed animate-fade-in shadow-xs">
            💡 {isPriceLoading ? 'در حال برآورد و تحلیل توسط هوش مصنوعی...' : priceTip}
          </div>
        )}

        {/* Case 1: SALE (فروش نقدی) */}
        {data.type === 'sale' && (
          <div className="space-y-4">
            <DecimalPriceInput
              label="قیمت کل فروش (تومان)"
              subtitle="برای ورود سریع می‌توانید اعشار میلیارد یا میلیون وارد کنید (مثلاً ۲.۵)"
              value={data.price}
              onChange={(newVal) => setData(prev => ({ ...prev, price: newVal }))}
              defaultUnit="billion"
              placeholder="مثال: ۲۵۰۰۰۰۰۰۰۰ یا ۲.۵"
            />

            {/* Calculated Price Per Square Meter */}
            {pricePerMeter && (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/70 rounded-2xl flex items-center justify-between text-xs font-black text-emerald-800 animate-fade-in">
                <span>محاسبه خودکار قیمت هر متر مربع:</span>
                <span className="text-emerald-700 font-black">
                  متری {pricePerMeter.shortText}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Case 2: RENT (رهن و اجاره) */}
        {data.type === 'rent' && (
          <div className="space-y-5">
            {/* Deposit (ودیعه / رهن) */}
            <DecimalPriceInput
              label="مبلغ ودیعه / رهن (تومان)"
              subtitle="امکان ورود اعشاری بر حسب میلیارد یا میلیون (مثلاً ۱۵۰.۵ یا ۱.۲)"
              value={data.deposit !== undefined ? data.deposit : data.price}
              onChange={(newVal) => setData(prev => ({ 
                ...prev, 
                deposit: newVal,
                price: newVal || prev.rent || ''
              }))}
              defaultUnit="million"
              placeholder="مثال: ۱۰۰۰۰۰۰۰۰ یا ۱۵۰"
            />

            {/* Monthly Rent (اجاره ماهیانه) */}
            <DecimalPriceInput
              label="اجاره ماهیانه (تومان)"
              subtitle="مبلغ اجاره پرداختی هر ماه (یا صفر در صورت رهن کامل)"
              value={data.rent !== undefined ? data.rent : ''}
              onChange={(newVal) => setData(prev => ({ 
                ...prev, 
                rent: newVal,
                price: prev.deposit || newVal || ''
              }))}
              defaultUnit="million"
              placeholder="مثال: ۵۰۰۰۰۰۰ یا ۷.۵"
            />

            {/* Full Mortgage Quick Preset */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setData(prev => ({ ...prev, rent: 0 }))}
                className="text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors"
              >
                رهن کامل (اجاره صفر)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Property Description Writer */}
      <div className="space-y-4 p-6 border-2 border-indigo-200 bg-indigo-50/40 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none"></div>
        <label htmlFor="keyFeatures" className="block text-sm font-black text-indigo-900">
          نویسنده هوشمند املاک (Gemini AI)
        </label>
        <p className="text-[11px] font-bold text-indigo-600">
          ویژگی‌های مثبت ملک را اینجا بنویسید تا هوش مصنوعی یک متن جذاب برای شما تولید کند.
        </p>
        <textarea
          id="keyFeatures"
          name="keyFeatures"
          rows={3}
          value={data.keyFeatures}
          onChange={handleChange}
          className="w-full px-5 py-4 bg-white border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 outline-none font-medium text-sm"
          placeholder="مثال: نورگیر عالی، دسترسی به مترو، بازسازی شده با متریال ایتالیایی..."
        />
        <button
          type="button"
          onClick={handleGenerateDescription}
          disabled={isDescLoading || !data.keyFeatures}
          className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-sm font-black rounded-2xl shadow-xl shadow-indigo-500/20 text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-all disabled:bg-indigo-300 disabled:shadow-none cursor-pointer"
        >
          {isDescLoading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <SparklesIcon className="w-5 h-5 ml-2" />
          )}
          {isDescLoading ? 'در حال نگارش توسط هوش مصنوعی...' : 'تولید متن آگهی حرفه‌ای با هوش مصنوعی'}
        </button>
      </div>
      
      {/* Final Description Editor */}
      <div>
        <label htmlFor="description" className="block text-sm font-black text-slate-700 mb-2 mr-2">
          توضیحات نهایی آگهی
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          value={data.description}
          onChange={handleChange}
          className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-medium text-sm leading-relaxed"
          placeholder="توضیحات تولید شده یا دست‌نویس خود را می‌توانید اینجا ویرایش نمایید."
        />
      </div>
    </div>
  );
};

export default Step2Details;
