import React, { useState } from 'react';
import type { PropertyListing, User } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { generateDescription } from '../services/geminiService';

interface Step2MediaAndContactProps {
  data: PropertyListing;
  setData: React.Dispatch<React.SetStateAction<PropertyListing>>;
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
  user: User | null;
}

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
];

const Step2MediaAndContact: React.FC<Step2MediaAndContactProps> = ({
  data,
  setData,
  userData,
  setUserData,
  user
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingAiDesc, setIsGeneratingAiDesc] = useState(false);
  const [aiNotice, setAiNotice] = useState('');

  const isLoggedIn = !!user;

  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const compressedPromises = files.map(file => compressImage(file, 1280, 1280, 0.82));
      const newImages = await Promise.all(compressedPromises);
      setData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    } catch (error) {
      console.error("Error compressing and uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addSamplePhotos = () => {
    setData(prev => ({
      ...prev,
      images: Array.from(new Set([...prev.images, ...SAMPLE_PHOTOS]))
    }));
  };

  const removeImage = (index: number) => {
    setData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleGenerateAiDescription = async () => {
    setIsGeneratingAiDesc(true);
    setAiNotice('');
    try {
      const summaryFeatures = [
        `نوع ملک: ${data.category}`,
        `نوع واگذاری: ${data.type === 'rent' ? 'رهن و اجاره' : 'فروش'}`,
        `موقعیت: ${data.province}، ${data.city} ${data.neighborhood ? `(محله ${data.neighborhood})` : ''}`,
        `متراژ: ${data.size || '100'} مترمربع`,
        data.bedrooms ? `تعداد خواب: ${data.bedrooms} خواب` : '',
        data.yearBuilt ? `سال ساخت: ${data.yearBuilt}` : '',
        data.keyFeatures ? `امکانات: ${data.keyFeatures}` : '',
        data.type === 'sale' && data.price ? `قیمت: ${Number(data.price).toLocaleString('fa-IR')} تومان` : '',
        data.type === 'rent' ? `ودیعه: ${Number(data.deposit || data.price || 0).toLocaleString('fa-IR')} تومان - اجاره: ${Number(data.rent || 0).toLocaleString('fa-IR')} تومان` : ''
      ].filter(Boolean).join(' | ');

      const desc = await generateDescription(summaryFeatures);
      if (desc) {
        setData(prev => ({ ...prev, description: desc }));
        setAiNotice('✨ متن جذاب آگهی توسط هوش مصنوعی با موفقیت تولید شد.');
        setTimeout(() => setAiNotice(''), 4000);
      }
    } catch (err: any) {
      setAiNotice('خطا در تولید هوشمند متن.');
    } finally {
      setIsGeneratingAiDesc(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* 1. Photos Section */}
      <div className="bg-slate-50/70 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📸</span> تصاویر باکیفیت ملک
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              تصاویر واضح شانس تماس خریداران و مستاجران را چندین برابر می‌کند.
            </p>
          </div>

          <button
            type="button"
            onClick={addSamplePhotos}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all self-start sm:self-auto"
          >
            🖼️ استفاده از تصاویر نمونه باکیفیت
          </button>
        </div>

        {/* Upload Box */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`p-8 border-3 border-dashed rounded-3xl text-center transition-all ${
            isDragOver ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-300 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
            📷
          </div>
          
          <h4 className="text-sm font-black text-slate-800">عکس‌ها را اینجا بکشید یا برای انتخاب کلیک کنید</h4>
          <p className="text-xs font-medium text-slate-400 mt-1">فرمت‌های مجاز: JPG, PNG, WebP (فشرده‌سازی خودکار و سریع)</p>
          
          <label className="mt-4 inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-md transition-all active:scale-95">
            {isUploading ? 'در حال بهینه‌سازی و بارگذاری...' : '📁 انتخاب فایل‌های تصویر'}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Uploaded Gallery */}
        {data.images && data.images.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600">تصاویر انتخاب‌شده ({data.images.length} تصویر):</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {data.images.map((img, idx) => (
                <div key={idx} className="relative group rounded-2xl overflow-hidden aspect-video border border-slate-200 shadow-xs bg-slate-100">
                  <img src={img} alt={`تصویر ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600/90 text-white rounded-lg flex items-center justify-center text-xs opacity-90 group-hover:opacity-100 transition-opacity"
                    title="حذف تصویر"
                  >
                    ✕
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      کاور اصلی
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Title & AI Description */}
      <div className="bg-slate-50/70 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>📝</span> عنوان و متن آگهی
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">یک عنوان جذاب و توضیحات کامل برای معرفی ملک بنویسید.</p>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-xs font-black text-slate-700 mb-2">عنوان آگهی <span className="text-rose-500">*</span></label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="مثال: آپارتمان ۱۴۰ متری نوساز غرق در نور / سعادت‌آباد"
            className="w-full px-4 py-3.5 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-black text-sm text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* AI Description Generator & Textarea */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-black text-slate-700">توضیحات تکمیلی آگهی</label>
            <button
              type="button"
              onClick={handleGenerateAiDescription}
              disabled={isGeneratingAiDesc}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-black text-xs rounded-xl shadow-md hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
            >
              <span>✨</span>
              <span>{isGeneratingAiDesc ? 'در حال نگارش هوشمند سناریو...' : 'تولید متن هوشمند با هوش مصنوعی (جمینای)'}</span>
            </button>
          </div>

          {aiNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
              <span>✓</span>
              <span>{aiNotice}</span>
            </div>
          )}

          <textarea
            rows={5}
            value={data.description}
            onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="توضیحات مربوط به دسترسی‌ها، نقشه داخلی، وضعیت مشاعات، شرایط معامله و تحویل ملک..."
            className="w-full p-4 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 outline-none font-medium text-xs leading-relaxed text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* 3. Account / Contact Preferences */}
      <div className="bg-slate-50/70 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>👤</span> اطلاعات تماس و صاحب آگهی
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">مشخصات صاحب آگهی و تنظیمات حریم خصوصی شماره تماس.</p>
        </div>

        {isLoggedIn ? (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-2xl flex items-center justify-center text-lg font-black shadow-sm">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-900">{user.name}</h4>
                  {user.role === 'agent' && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black">
                      مشاور املاک رسمی
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">شماره تماس ثبت‌شده: <strong className="font-mono text-slate-800" dir="ltr">{user.phone}</strong></p>
              </div>
            </div>

            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-100 self-start sm:self-auto">
              ✓ حساب کاربری متصل است
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2">نام و نام خانوادگی <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={userData.name}
                onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="مثال: علی محمدی"
                className="w-full px-4 py-3 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2">شماره همراه <span className="text-rose-500">*</span></label>
              <input
                type="tel"
                value={userData.phone}
                onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0912XXXXXXX"
                dir="ltr"
                className="w-full px-4 py-3 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2">رمز عبور دلخواه (اختیاری جهت پنل)</label>
              <input
                type="password"
                value={userData.password || ''}
                onChange={(e) => setUserData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="رمز عبور برای مدیریت آگهی"
                dir="ltr"
                className="w-full px-4 py-3 bg-white border-2 border-slate-200/80 rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Contact Preferences */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h5 className="text-xs font-black text-slate-800">شیوه تماس متقاضیان:</h5>
            <p className="text-[11px] text-slate-500 mt-0.5">می‌توانید تعیین کنید کاربران فقط از طریق چت پیام دهند یا با شماره تماس بگیرند.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setData(prev => ({ ...prev, contactMethod: 'all', showPhoneNumber: true }))}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                data.contactMethod !== 'chat_only' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-100 text-slate-600'
              }`}
            >
              📞 تماس تلفنی و چت
            </button>
            <button
              type="button"
              onClick={() => setData(prev => ({ ...prev, contactMethod: 'chat_only', showPhoneNumber: false }))}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                data.contactMethod === 'chat_only' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-100 text-slate-600'
              }`}
            >
              💬 فقط چت داخل سایت
            </button>
          </div>
        </div>
      </div>

      {/* 4. Instant Review Summary */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h4 className="text-base font-black text-amber-300">خلاصه مشخصات آگهی جهت انتشار نهایی</h4>
            <p className="text-xs text-slate-300 mt-0.5">اطلاعات را مرور نموده و در صورت تایید، دکمه «تایید نهایی و انتشار» را بزنید.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <span className="text-slate-400 block text-[10px]">نوع و دسته:</span>
            <strong className="text-white font-bold">{data.category} ({data.type === 'rent' ? 'رهن و اجاره' : 'فروش'})</strong>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <span className="text-slate-400 block text-[10px]">موقعیت:</span>
            <strong className="text-white font-bold">{data.province || '—'}، {data.city || '—'} {data.neighborhood ? `(${data.neighborhood})` : ''}</strong>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <span className="text-slate-400 block text-[10px]">متراژ و خواب:</span>
            <strong className="text-white font-bold">{data.size || '—'} متر {data.bedrooms ? `| ${data.bedrooms} خواب` : ''}</strong>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <span className="text-slate-400 block text-[10px]">قیمت / ودیعه:</span>
            <strong className="text-amber-300 font-bold">
              {data.type === 'rent' 
                ? `${Number(data.deposit || data.price || 0).toLocaleString('fa-IR')} ودیعه`
                : `${Number(data.price || 0).toLocaleString('fa-IR')} تومان`}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2MediaAndContact;
