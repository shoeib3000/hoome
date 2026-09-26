import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Fingerprint, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Building2,
  X
} from 'lucide-react';
import type { SiteBrandingConfig } from '../types';

interface AdminLoginModalProps {
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<boolean>;
  siteBranding?: SiteBrandingConfig;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose, onLogin, siteBranding }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(true);
      setErrorMessage('لطفاً نام کاربری و رمز عبور را وارد نمایید.');
      return;
    }

    setIsLoading(true);
    setError(false);

    try {
      const success = await onLogin(username, password);
      if (!success) {
        setError(true);
        setErrorMessage('نام کاربری یا رمز عبور مدیر نادرست است.');
        setPassword('');
      }
    } catch (err) {
      setError(true);
      setErrorMessage('خطایی در برقراری ارتباط با سرور رخ داد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in font-['Vazirmatn']"
      onClick={onClose}
      dir="rtl"
    >
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Main Glass Card */}
      <div 
        className={`relative w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-slate-700/60 shadow-2xl overflow-hidden transition-all duration-300 ${
          error ? 'animate-shake ring-2 ring-rose-500/50' : 'ring-1 ring-white/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Neon Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 left-6 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20"
          title="بستن و بازگشت به سایت"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 sm:p-10 space-y-7">
          
          {/* Header & Brand Emblem */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex items-center justify-center mb-1">
              {/* Outer Glow Ring */}
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-slate-900 p-0.5 shadow-xl shadow-indigo-500/25">
                <div className="w-full h-full bg-slate-900/90 backdrop-blur-md rounded-[1.4rem] flex items-center justify-center">
                  {siteBranding?.logoUrl ? (
                    <img 
                      src={siteBranding.logoUrl} 
                      alt="لوگو" 
                      className="w-11 h-11 object-contain drop-shadow" 
                    />
                  ) : (
                    <div className="relative flex items-center justify-center">
                      <ShieldCheck className="w-10 h-10 text-indigo-400" />
                      <KeyRound className="w-4 h-4 text-emerald-400 absolute -bottom-1 -right-1" />
                    </div>
                  )}
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  ورود به پنل مدیریت
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs font-bold text-slate-400 mt-1.5">
                {siteBranding?.siteName || 'سامانه هوشمند مدیریت و نیازمندی‌های تخصصی املاک'}
              </p>
            </div>
          </div>

          {/* Form Controls */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                <span>نام کاربری مدیر</span>
                <span className="text-[10px] text-slate-500 font-mono">Username</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5 text-indigo-400" />
                </div>
                <input
                  autoFocus
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(false);
                  }}
                  placeholder="نام کاربری مدیر را وارد نمایید..."
                  className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-white text-sm font-bold rounded-2xl pr-12 pl-4 py-3.5 outline-none transition-all placeholder:text-slate-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                <span>رمز عبور امنیتی</span>
                <span className="text-[10px] text-slate-500 font-mono">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5 text-indigo-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-white text-sm font-bold rounded-2xl pr-12 pl-12 py-3.5 outline-none transition-all placeholder:text-slate-500 text-left font-mono tracking-widest"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Security Status */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <span>به‌خاطر سپردن نشست ورود</span>
              </label>

              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                <Fingerprint className="w-3 h-3" />
                <span>SSL 256-Bit</span>
              </div>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{errorMessage || 'نام کاربری یا رمز عبور نامعتبر است.'}</p>
                </div>
              </div>
            )}

            {/* Submit & Cancel Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>در حال احراز هویت امن...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>تایید و ورود به پنل مدیریت</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>انصراف و بازگشت به صفحه اصلی</span>
              </button>
            </div>

          </form>

        </div>

        {/* Bottom Security Footer */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-8 py-3.5 text-center text-[11px] font-bold text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>مرکز فرماندهی یکپارچه مدیریت سامانه هوشمند املاک</span>
        </div>

      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.35s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default AdminLoginModal;
