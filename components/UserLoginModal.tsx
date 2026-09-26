import React, { useState, useMemo, useEffect } from 'react';
import type { User, PasswordPolicyConfig } from '../types';
import { sendSms } from '../services/smsService';
import { 
  User as UserIcon, 
  Phone, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ArrowRight,
  Shield,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserLoginModalProps {
  onClose: () => void;
  onLogin: (user: string, pass: string, isOtp?: boolean) => Promise<boolean>;
  onRegister: (data: Partial<User>) => Promise<User | null>;
  onPasswordReset?: (phone: string, newPass: string) => Promise<boolean>;
  users?: User[];
  passwordPolicy?: PasswordPolicyConfig;
}

const DEFAULT_POLICY: PasswordPolicyConfig = {
  minLength: 6,
  requireNumbers: true,
  requireLetters: true,
  requireUppercase: false,
  requireSpecialChars: false,
  maxFailedAttempts: 5
};

const UserLoginModal: React.FC<UserLoginModalProps> = ({ 
  onClose, 
  onLogin, 
  onRegister, 
  onPasswordReset, 
  users = [],
  passwordPolicy = DEFAULT_POLICY
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'recovery'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    otp: ''
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Active Policy
  const policy = passwordPolicy || DEFAULT_POLICY;

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Password Policy & Strength Evaluation
  const passwordCriteria = useMemo(() => {
    const pwd = formData.password || '';
    const hasMinLength = pwd.length >= (policy.minLength || 6);
    const hasNumbers = !policy.requireNumbers || /\d/.test(pwd);
    const hasLetters = !policy.requireLetters || /[a-zA-Z\u0600-\u06FF]/.test(pwd);
    const hasUppercase = !policy.requireUppercase || /[A-Z]/.test(pwd);
    const hasSpecial = !policy.requireSpecialChars || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
    const matchesConfirm = pwd.length > 0 && pwd === formData.confirmPassword;

    let score = 0;
    if (pwd.length >= 4) score += 20;
    if (hasMinLength) score += 20;
    if (/\d/.test(pwd)) score += 20;
    if (/[a-zA-Z]/.test(pwd)) score += 20;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) || /[A-Z]/.test(pwd)) score += 20;

    let strengthLabel = 'بسیار ضعیف';
    let strengthColor = 'bg-rose-500 text-rose-600';
    if (score >= 80) {
      strengthLabel = 'فوق‌العاده قوی';
      strengthColor = 'bg-emerald-500 text-emerald-600';
    } else if (score >= 60) {
      strengthLabel = 'قوی و مطمئن';
      strengthColor = 'bg-teal-500 text-teal-600';
    } else if (score >= 40) {
      strengthLabel = 'متوسط';
      strengthColor = 'bg-amber-500 text-amber-600';
    }

    const isValid = hasMinLength && hasNumbers && hasLetters && hasUppercase && hasSpecial;

    return {
      hasMinLength,
      hasNumbers,
      hasLetters,
      hasUppercase,
      hasSpecial,
      matchesConfirm,
      score: Math.min(score, 100),
      strengthLabel,
      strengthColor,
      isValid
    };
  }, [formData.password, formData.confirmPassword, policy]);

  const handleSendOtp = async (isForRecovery = false) => {
    setError('');
    setSuccessMsg('');
    const cleanPhone = formData.phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('لطفاً شماره موبایل معتبر (۱۱ رقمی) وارد کنید.');
      return;
    }

    const user = users.find(u => u.phone === cleanPhone);
    if ((activeTab === 'login' || isForRecovery) && !user) {
      setError('کاربری با این شماره موبایل در سامانه ثبت نشده است.');
      return;
    }

    setIsLoading(true);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);

    try {
      const success = await sendSms(cleanPhone, `کد ورود شما به سامانه: ${code}`, 'otpLogin');
      setIsLoading(false);
      setOtpSent(true);
      setOtpCountdown(60);
      setSuccessMsg(`کد تایید ۴ رقمی به شماره ${cleanPhone} ارسال شد.`);
    } catch (e) {
      setIsLoading(false);
      setOtpSent(true);
      setOtpCountdown(60);
      setSuccessMsg(`کد تایید ارسال شد (کد آزمایشی: ${code})`);
    }
  };

  const handleRecoverPassword = async () => {
    setError('');
    setSuccessMsg('');
    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      setError('شماره تماس را جهت بازیابی رمز عبور وارد کنید.');
      return;
    }
    const user = users.find(u => u.phone === cleanPhone);
    if (!user) {
      setError('کاربری با این شماره موبایل در سیستم یافت نشد.');
      return;
    }

    setIsLoading(true);
    const newPassword = 'Hoome' + Math.floor(1000 + Math.random() * 9000) + '!';
    let success = false;

    if (onPasswordReset) {
      success = await onPasswordReset(user.phone, newPassword);
    }

    if (success) {
      await sendSms(
        user.phone, 
        `کاربر گرامی ${user.name}\nنام کاربری شما: ${user.username}\nرمز عبور جدید: ${newPassword}`, 
        'passwordRecovery'
      );
      setSuccessMsg(`رمز عبور جدید با موفقیت صادر و به شماره ${user.phone} پیامک شد.`);
      setTimeout(() => {
        setActiveTab('login');
        setLoginMethod('password');
        setFormData(prev => ({ ...prev, username: user.username, password: newPassword }));
      }, 3500);
    } else {
      setError('خطا در فرآیند بازیابی رمز عبور.');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // 1. LOGIN TAB
    if (activeTab === 'login') {
      if (loginMethod === 'password') {
        if (!formData.username.trim() || !formData.password.trim()) {
          setError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
          return;
        }
        setIsLoading(true);
        const success = await onLogin(formData.username.trim(), formData.password);
        setIsLoading(false);
        if (!success) {
          setError('نام کاربری یا رمز عبور وارد شده نادرست است.');
        } else {
          onClose();
        }
      } else {
        // OTP Login
        if (!otpSent) {
          handleSendOtp();
          return;
        }
        if (formData.otp.trim() !== generatedOtp) {
          setError('کد تایید وارد شده نادرست یا منقضی شده است.');
          return;
        }
        setIsLoading(true);
        const success = await onLogin(formData.phone.trim(), '', true);
        setIsLoading(false);
        if (!success) {
          setError('حساب کاربری با این شماره یافت نشد.');
        } else {
          onClose();
        }
      }
      return;
    }

    // 2. REGISTER TAB
    if (activeTab === 'register') {
      if (!formData.name.trim() || !formData.username.trim() || !formData.phone.trim() || !formData.password) {
        setError('لطفاً تمامی فیلدهای الزامی را تکمیل نمایید.');
        return;
      }

      if (formData.phone.trim().length < 10) {
        setError('شماره موبایل وارد شده معتبر نمی‌باشد.');
        return;
      }

      // Check Password Policy compliance
      if (!passwordCriteria.isValid) {
        if (!passwordCriteria.hasMinLength) {
          setError(`رمز عبور باید حداقل ${policy.minLength || 6} کاراکتر باشد.`);
          return;
        }
        if (!passwordCriteria.hasNumbers) {
          setError('رمز عبور باید شامل حداقل یک عدد (0-9) باشد.');
          return;
        }
        if (!passwordCriteria.hasLetters) {
          setError('رمز عبور باید شامل حروف باشد.');
          return;
        }
        if (!passwordCriteria.hasUppercase) {
          setError('رمز عبور باید شامل حداقل یک حرف بزرگ انگلیسی (A-Z) باشد.');
          return;
        }
        if (!passwordCriteria.hasSpecial) {
          setError('رمز عبور باید شامل حداقل یک کاراکتر خاص (@, #, $, %, ...) باشد.');
          return;
        }
      }

      if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        setError('تکرار رمز عبور با رمز عبور اصلی مطابقت ندارد.');
        return;
      }

      setIsLoading(true);
      const res = await onRegister({
        name: formData.name.trim(),
        username: formData.username.trim(),
        password: formData.password,
        phone: formData.phone.trim()
      });
      setIsLoading(false);

      if (!res) {
        setError('ثبت‌نام با خطا مواجه شد. (احتمالاً نام کاربری یا شماره موبایل تکراری است)');
      } else {
        setSuccessMsg('حساب کاربری شما با موفقیت ایجاد شد! هم‌اکنون وارد شدید.');
        setTimeout(() => onClose(), 1000);
      }
      return;
    }

    // 3. RECOVERY TAB
    if (activeTab === 'recovery') {
      handleRecoverPassword();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in font-['Vazirmatn']" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-white rounded-3xl sm:rounded-[2.5rem] w-full max-w-lg shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] relative border border-slate-100 overflow-hidden my-auto"
      >
        {/* Top Header Accent */}
        <div className="h-2.5 bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-700 w-full" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer z-10"
          title="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header Title & Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3 shadow-inner">
              {activeTab === 'login' && <KeyRound className="w-7 h-7" />}
              {activeTab === 'register' && <UserIcon className="w-7 h-7" />}
              {activeTab === 'recovery' && <ShieldCheck className="w-7 h-7" />}
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeTab === 'login' && 'ورود به حساب کاربری'}
              {activeTab === 'register' && 'ثبت‌نام کاربر جدید'}
              {activeTab === 'recovery' && 'بازیابی رمز عبور'}
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1.5">
              {activeTab === 'login' && 'برای دسترسی به پنل آگهی‌ها و چت‌های خود وارد شوید'}
              {activeTab === 'register' && 'به سامانه هوشمند معاملات املاک خوش آمدید'}
              {activeTab === 'recovery' && 'اطلاعات حساب به شماره موبایل شما پیامک خواهد شد'}
            </p>
          </div>

          {/* Top Segmented Tabs: Login vs Register */}
          <div className="flex p-1 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/60">
            <button 
              type="button"
              onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); setOtpSent(false); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>ورود به حساب</span>
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab('register'); setError(''); setSuccessMsg(''); setOtpSent(false); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>ثبت‌نام جدید</span>
            </button>
          </div>

          {/* Sub-tab for Login Method (Password vs OTP) */}
          {activeTab === 'login' && (
            <div className="flex gap-2 mb-5 pb-3 border-b border-slate-100">
              <button 
                type="button"
                onClick={() => { setLoginMethod('password'); setError(''); setSuccessMsg(''); setOtpSent(false); }}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  loginMethod === 'password'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>ورود با کلمه عبور</span>
              </button>
              <button 
                type="button"
                onClick={() => { setLoginMethod('otp'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  loginMethod === 'otp'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>کد یکبار مصرف (SMS)</span>
              </button>
            </div>
          )}

          {/* Form Area */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. REGISTER SPECIFIC FIELDS */}
            {activeTab === 'register' && (
              <>
                <div>
                  <label className="text-[11px] font-black text-slate-600 block mb-1.5 pr-1">
                    نام و نام خانوادگی <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="مثال: علی رضایی"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-sm text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-600 block mb-1.5 pr-1">
                      شماره موبایل <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="tel" 
                        placeholder="0912..."
                        dir="ltr"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-sm text-right text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-600 block mb-1.5 pr-1">
                      نام کاربری انگلیسی <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Shield className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="username"
                        dir="ltr"
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                        className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-sm text-left text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 block mb-1.5 pr-1 flex justify-between items-center">
                    <span>رمز عبور <span className="text-rose-500">*</span></span>
                    {formData.password && (
                      <span className={`text-[10px] font-extrabold ${passwordCriteria.strengthColor.split(' ')[1]}`}>
                        {passwordCriteria.strengthLabel}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="رمز عبور ایمن"
                      dir="ltr"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pr-10 pl-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-sm text-left text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Progress Bar */}
                  {formData.password && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordCriteria.strengthColor.split(' ')[0]}`}
                        style={{ width: `${passwordCriteria.score}%` }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-600 block mb-1.5 pr-1">
                    تکرار رمز عبور <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      placeholder="تکرار رمز عبور"
                      dir="ltr"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pr-10 pl-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-sm text-left text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Live Password Policy Checklist */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5 text-[11px]">
                  <div className="font-black text-slate-700 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>سیاست‌های امنیتی رمز عبور (تعیین شده توسط مدیریت):</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 font-bold text-slate-600">
                    <div className={`flex items-center gap-1 ${passwordCriteria.hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.hasMinLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                        {passwordCriteria.hasMinLength ? '✓' : '•'}
                      </span>
                      <span>حداقل {policy.minLength || 6} کاراکتر</span>
                    </div>
                    {policy.requireNumbers && (
                      <div className={`flex items-center gap-1 ${passwordCriteria.hasNumbers ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.hasNumbers ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                          {passwordCriteria.hasNumbers ? '✓' : '•'}
                        </span>
                        <span>شامل عدد (0-9)</span>
                      </div>
                    )}
                    {policy.requireLetters && (
                      <div className={`flex items-center gap-1 ${passwordCriteria.hasLetters ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.hasLetters ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                          {passwordCriteria.hasLetters ? '✓' : '•'}
                        </span>
                        <span>شامل حروف</span>
                      </div>
                    )}
                    {policy.requireUppercase && (
                      <div className={`flex items-center gap-1 ${passwordCriteria.hasUppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.hasUppercase ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                          {passwordCriteria.hasUppercase ? '✓' : '•'}
                        </span>
                        <span>حرف بزرگ (A-Z)</span>
                      </div>
                    )}
                    {policy.requireSpecialChars && (
                      <div className={`flex items-center gap-1 ${passwordCriteria.hasSpecial ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.hasSpecial ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                          {passwordCriteria.hasSpecial ? '✓' : '•'}
                        </span>
                        <span>کاراکتر خاص (!@#)</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 2. LOGIN (PASSWORD) FIELDS */}
            {activeTab === 'login' && loginMethod === 'password' && (
              <>
                <div>
                  <label className="text-[11px] font-black text-slate-600 block mb-1.5 pr-1">
                    نام کاربری یا شماره موبایل
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="نام کاربری یا 0912..."
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      className="w-full pr-10 pl-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-sm text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 pr-1">
                    <label className="text-[11px] font-black text-slate-600">
                      رمز عبور
                    </label>
                    <button 
                      type="button" 
                      onClick={() => { setActiveTab('recovery'); setError(''); setSuccessMsg(''); }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      فراموشی رمز عبور؟
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="••••••••"
                      dir="ltr"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pr-10 pl-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-sm text-left text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 3. LOGIN (OTP) FIELDS */}
            {activeTab === 'login' && loginMethod === 'otp' && (
              <>
                <div>
                  <label className="text-[11px] font-black text-slate-600 block mb-1.5 pr-1">
                    شماره موبایل ثبت‌شده
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="tel" 
                      placeholder="09123456789"
                      dir="ltr"
                      disabled={otpSent}
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pr-10 pl-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-sm text-right text-slate-800 disabled:opacity-60"
                    />
                  </div>
                </div>

                {otpSent && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[11px] font-black text-slate-600 block mb-1.5 pr-1">
                      کد ۴ رقمی ارسال شده به پیامک
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        maxLength={4}
                        placeholder="• • • •"
                        dir="ltr"
                        autoFocus
                        value={formData.otp}
                        onChange={e => setFormData({ ...formData, otp: e.target.value.replace(/[^0-9]/g, '') })}
                        className="w-full pr-10 pl-4 py-3.5 bg-slate-50 border-2 border-indigo-500 rounded-xl focus:bg-white outline-none transition-all font-black text-center text-lg tracking-widest text-slate-900"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 px-1">
                      {otpCountdown > 0 ? (
                        <span className="text-slate-500 font-bold text-[11px]">
                          ارسال مجدد تا {otpCountdown} ثانیه دیگر
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>ارسال مجدد کد تایید</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setFormData({ ...formData, otp: '' }); }}
                        className="text-slate-400 hover:text-slate-600 font-bold text-[11px]"
                      >
                        ویرایش شماره
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* 4. RECOVERY TAB FIELDS */}
            {activeTab === 'recovery' && (
              <>
                <div>
                  <label className="text-[11px] font-black text-slate-600 block mb-1.5 pr-1">
                    شماره موبایل جهت دریافت رمز عبور جدید
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="tel" 
                      placeholder="0912..."
                      dir="ltr"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pr-10 pl-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-sm text-right text-slate-800"
                    />
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-[11px] font-bold text-amber-800 leading-relaxed">
                  💡 پس از تایید، یک رمز عبور تصادفی و جدید به شماره همراه شما پیامک می‌شود که می‌توانید با آن وارد شده و در پنل کاربری تغییر دهید.
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Success Message */}
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-bold"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={activeTab === 'login' && loginMethod === 'otp' && !otpSent ? () => handleSendOtp() : handleSubmit}
              disabled={isLoading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال پردازش امن...</span>
                </>
              ) : (
                <>
                  {activeTab === 'login' && loginMethod === 'otp' && !otpSent && 'دریافت کد تایید پیامکی'}
                  {activeTab === 'login' && (loginMethod === 'password' || otpSent) && 'ورود به حساب کاربری'}
                  {activeTab === 'register' && 'تکمیل ثبت‌نام و ورود'}
                  {activeTab === 'recovery' && 'ارسال رمز جدید با پیامک'}
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>

            {/* Bottom Footer Actions */}
            <div className="pt-3 text-center border-t border-slate-100 flex items-center justify-between">
              {activeTab === 'recovery' ? (
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); }}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  بازگشت به فرم ورود
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(activeTab === 'login' ? 'register' : 'login');
                    setError('');
                    setSuccessMsg('');
                    setOtpSent(false);
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  {activeTab === 'login' ? 'حساب کاربری ندارید؟ ثبت‌نام کنید' : 'قبلاً حساب ساخته‌اید؟ وارد شوید'}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default UserLoginModal;
