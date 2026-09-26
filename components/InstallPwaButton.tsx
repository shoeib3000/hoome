import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const InstallPwaButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-black text-indigo-600 bg-indigo-50/90 hover:bg-indigo-600 hover:text-white transition-all rounded-xl border border-indigo-200 shadow-sm"
        title="نصب اپلیکیشن PWA بر روی دستگاه"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>نصب اپلیکیشن</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center px-3 py-2 text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all rounded-xl border border-slate-200"
        >
          <svg className="w-4 h-4 ml-1.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          نصب در آیفون
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 text-right" dir="rtl">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  📱
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">نصب در Safari iOS</h3>
                  <p className="text-xs text-slate-500 font-medium">افزودن به صفحه اصلی آیفون و آیپد</p>
                </div>
              </div>
              <div className="space-y-3 text-xs font-bold text-slate-700 leading-relaxed">
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">۱</span>
                  <p>در نوار پایین مرورگر سافاری روی دکمه اشتراک‌گذاری (<span className="text-indigo-600 font-mono font-black">Share ⎋</span>) ضربه بزنید.</p>
                </div>
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">۲</span>
                  <p>منو را به پایین اسکرول کرده و گزینه <span className="text-indigo-600 font-black">Add to Home Screen</span> (افزودن به صفحه اصلی) را انتخاب کنید.</p>
                </div>
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">۳</span>
                  <p>روی گزینه <span className="text-indigo-600 font-black">Add</span> در گوشه بالا ضربه بزنید تا آیکون به گوشی شما اضافه شود.</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export default InstallPwaButton;
