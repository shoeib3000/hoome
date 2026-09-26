import React, { useState } from 'react';
import type { PropertyListing } from '../types';
import { compressImage } from '../utils/imageCompressor';

interface Step3PhotosProps {
  data: PropertyListing;
  setData: React.Dispatch<React.SetStateAction<PropertyListing>>;
}

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
];

const Step3Photos: React.FC<Step3PhotosProps> = ({ data, setData }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center md:text-right">
        <h2 className="text-2xl font-black text-slate-800">عکس‌های باکیفیت ملک</h2>
        <p className="text-slate-500 mt-2 font-medium">تصاویر واقعی و نورگیر، شانس بازدید و معامله آگهی شما را تا ۱۰ برابر افزایش می‌دهند.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`p-8 border-3 border-dashed rounded-[2.5rem] text-center transition-all ${
          isDragOver ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
          📸
        </div>
        
        {isUploading ? (
          <div className="py-4 space-y-2">
            <div className="inline-block animate-spin text-2xl">⏳</div>
            <p className="text-sm font-black text-blue-600">در حال بهینه‌سازی و آپلود تصاویر...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <label htmlFor="file-upload" className="inline-flex items-center px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer">
              <span>انتخاب عکس‌ها از گالری / کامپیوتر</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleFileChange} />
            </label>
            <p className="text-xs font-bold text-slate-400">یا عکس‌ها را به این قسمت بکشید و رها کنید (PNG, JPG تا 15MB)</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={addSamplePhotos}
                className="text-xs font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-all"
              >
                + استفاده از ۴ عکس نمونه باکیفیت برای تست سریع
              </button>
            </div>
          </div>
        )}
      </div>

      {data.images.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-700">عکس‌های انتخاب شده ({data.images.length} تصویر)</h3>
            <button
              type="button"
              onClick={() => setData(prev => ({ ...prev, images: [] }))}
              className="text-xs font-bold text-rose-500 hover:underline"
            >
              حذف همه
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.images.map((image, index) => (
              <div key={index} className="relative group rounded-2xl overflow-hidden shadow-md aspect-video border-2 border-white">
                <img src={image} alt={`تصویر ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {index === 0 && (
                  <span className="absolute bottom-2 right-2 bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md">
                    عکس کاور
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 left-2 bg-rose-600 text-white rounded-full p-2 opacity-90 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
                  title="حذف تصویر"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Step3Photos;
