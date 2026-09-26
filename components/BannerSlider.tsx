import React, { useState, useEffect, useRef } from 'react';
import type { AdSlot, BannerSliderConfig } from '../types';

interface BannerSliderProps {
  ads: AdSlot[];
  position: AdSlot['position'];
  config?: BannerSliderConfig;
  className?: string;
}

const BannerSlider: React.FC<BannerSliderProps> = ({ ads, position, config, className = '' }) => {
  // First match target position, if fewer than 2, blend in other active ads so slider can rotate
  let activeAds = ads
    .filter(ad => ad.isActive && ad.position === position)
    .sort((a, b) => b.priority - a.priority);

  if (activeAds.length < 2) {
    const others = ads
      .filter(ad => ad.isActive && ad.position !== position)
      .sort((a, b) => b.priority - a.priority);
    activeAds = [...activeAds, ...others];
  }

  // Fallback defaults if list is completely empty
  if (activeAds.length === 0) {
    activeAds = [
      { id: 'ad_def_1', position: 'hero', title: 'فرصت استثنایی سرمایه‌گذاری ملکی و پیش‌فروش برج‌های ساحلی', imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 3 },
      { id: 'ad_def_2', position: 'hero', title: 'ویلای لوکس کوهستانی با سند تک‌برگ و چشم‌انداز ابدی', imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 2 },
      { id: 'ad_def_3', position: 'hero', title: 'پنت‌هاوس مدرن با امکانات هتلینگ و روف‌گاردن اختصاصی', imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 1 }
    ];
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const autoSlideEnabled = config?.autoSlideEnabled ?? true;
  const intervalSeconds = Math.max(3, config?.autoSlideIntervalSeconds ?? 5);

  useEffect(() => {
    // Reset index if out of bounds
    if (currentIndex >= activeAds.length && activeAds.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeAds.length, currentIndex]);

  useEffect(() => {
    if (!autoSlideEnabled || isPaused || activeAds.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeAds.length);
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoSlideEnabled, isPaused, activeAds.length, intervalSeconds, currentIndex]);

  if (activeAds.length === 0) return null;

  const currentAd = activeAds[currentIndex] || activeAds[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + activeAds.length) % activeAds.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % activeAds.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        // Swiped left (Next in RTL)
        setCurrentIndex(prev => (prev + 1) % activeAds.length);
      } else {
        // Swiped right (Prev in RTL)
        setCurrentIndex(prev => (prev - 1 + activeAds.length) % activeAds.length);
      }
    }
    touchStartX.current = null;
  };

  // Render for HERO position
  if (position === 'hero') {
    return (
      <div 
        className={`w-full lg:w-96 flex-shrink-0 ${className}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white rounded-[3rem] overflow-hidden shadow-2xl">
            <a href={currentAd.linkUrl || '#'} target="_blank" rel="noopener noreferrer" className="block relative">
              <div className="relative h-64 overflow-hidden bg-slate-900">
                <img 
                  key={currentAd.id}
                  src={currentAd.imageUrl} 
                  className="w-full h-full object-cover transition-opacity duration-700 ease-in-out" 
                  alt={currentAd.title} 
                  loading="lazy" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                <div className="absolute top-4 right-4 px-3 py-1 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full shadow-lg">
                  پیشنهاد ویژه حامی
                </div>
                {activeAds.length > 1 && (
                  <div className="absolute top-4 left-4 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black rounded-full border border-white/20" dir="ltr">
                    {currentIndex + 1} / {activeAds.length}
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-slate-900 leading-snug">{currentAd.title}</h3>
                <div className="mt-4 flex items-center justify-between text-xs font-black text-indigo-600">
                  <span>مشاهده جزئیات آگهی ویژه</span>
                  <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">←</span>
                </div>
              </div>
            </a>

            {/* Slider Navigation Arrows */}
            {activeAds.length > 1 && (
              <>
                <button 
                  onClick={handlePrev}
                  className="absolute right-3 top-1/2 -translate-y-12 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md text-slate-800 flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all font-black text-sm z-10"
                  title="قبلی"
                >
                  ›
                </button>
                <button 
                  onClick={handleNext}
                  className="absolute left-3 top-1/2 -translate-y-12 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md text-slate-800 flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all font-black text-sm z-10"
                  title="بعدی"
                >
                  ‹
                </button>

                {/* Dots */}
                <div className="flex justify-center items-center gap-1.5 pb-4">
                  {activeAds.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                      className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200 hover:bg-slate-300'}`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render for IN-FEED or default position
  return (
    <div 
      className={`w-full ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[3rem] p-1 overflow-hidden shadow-2xl relative group">
        <div className="bg-white rounded-[2.9rem] overflow-hidden flex flex-col md:flex-row items-center relative">
          <div className="w-full md:w-2/5 h-56 md:h-64 relative overflow-hidden bg-slate-900">
            <img 
              key={currentAd.id}
              src={currentAd.imageUrl} 
              className="w-full h-full object-cover transition-all duration-700 ease-in-out" 
              alt={currentAd.title} 
              loading="lazy" 
            />
            {activeAds.length > 1 && (
              <div className="absolute top-4 left-4 px-3 py-1 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black rounded-full border border-white/20" dir="ltr">
                {currentIndex + 1} / {activeAds.length}
              </div>
            )}
          </div>
          <div className="p-8 md:p-10 flex-grow text-center md:text-right flex flex-col justify-between h-full w-full">
            <div>
              <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full mb-4 inline-block uppercase tracking-widest border border-indigo-100">
                پیشنهاد حامیان پلتفرم
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4 leading-tight">{currentAd.title}</h3>
            </div>
            
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <a 
                href={currentAd.linkUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all active:scale-95 inline-flex items-center gap-2"
              >
                مشاهده جزئیات
                <svg className="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </a>

              {activeAds.length > 1 && (
                <div className="flex items-center gap-2 mr-auto">
                  <button 
                    onClick={handlePrev} 
                    className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white flex items-center justify-center font-black transition-all shadow-sm"
                    title="قبلی"
                  >
                    ›
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white flex items-center justify-center font-black transition-all shadow-sm"
                    title="بعدی"
                  >
                    ‹
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Carousel Bottom Dots */}
        {activeAds.length > 1 && (
          <div className="flex justify-center items-center gap-1.5 py-2.5 bg-slate-900/90 backdrop-blur-md">
            {activeAds.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-indigo-400' : 'w-2 bg-slate-600 hover:bg-slate-400'}`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerSlider;
