import React, { useState } from 'react';
import { hashPassword } from '../utils/crypto';

interface InstallPageProps {
  onSetupSuccess: (adminCreds: { username: string; passwordHash: string }) => void;
  onBackToHome: () => void;
}

export const InstallPage: React.FC<InstallPageProps> = ({ onSetupSuccess, onBackToHome }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('smart_realestate');
  
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('');
  const [adminPassConfirm, setAdminPassConfirm] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/db-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, database })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message || 'اتصال موفقیت‌آمیز بود!' });
      } else {
        setTestResult({ success: false, message: data.error || 'خطا در برقراری ارتباط با دیتابیس' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'خطای شبکه' });
    } finally {
      setTesting(false);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass !== adminPassConfirm) {
      setSetupError('رمز عبور و تایید آن مطابقت ندارند');
      return;
    }
    if (!adminPass) {
      setSetupError('رمز عبور مدیر نمی‌تواند خالی باشد');
      return;
    }

    setSettingUp(true);
    setSetupError(null);

    try {
      const adminPassHash = await hashPassword(adminPass);
      const res = await fetch('/api/db-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port,
          user,
          password,
          database,
          adminUser,
          adminPassHash
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSetupSuccess({ username: adminUser, passwordHash: adminPassHash });
      } else {
        setSetupError(data.error || 'خطا در راه‌اندازی دیتابیس');
      }
    } catch (err: any) {
      setSetupError(err.message || 'خطای شبکه در تکمیل راه‌اندازی');
    } finally {
      setSettingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans" dir="rtl">
      <div className="w-full max-w-2xl bg-white border border-slate-200/80 shadow-2xl rounded-[2.5rem] overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-50"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight">راه‌اندازی دیتابیس MySQL</h1>
            <p className="text-slate-400 mt-2 text-sm font-medium">پلتفرم مدیریت هوشمند املاک نسل سوم</p>
          </div>
          
          {/* Progress Indicators */}
          <div className="flex items-center gap-4 mt-8 relative z-10">
            <div className={`flex items-center gap-2 text-xs font-bold ${step === 1 ? 'text-blue-400' : 'text-emerald-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step === 1 ? 'border-blue-400 bg-blue-500/10' : 'border-emerald-400 bg-emerald-500'}`}>
                {step > 1 ? '✓' : '۱'}
              </span>
              <span>اتصال دیتابیس</span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-800"></div>
            <div className={`flex items-center gap-2 text-xs font-bold ${step === 2 ? 'text-blue-400' : 'text-slate-500'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step === 2 ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 bg-slate-800'}`}>
                ۲
              </span>
              <span>تنظیم حساب کاربری</span>
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-8 sm:p-12">
          
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-blue-800 text-sm leading-relaxed font-medium">
                <p className="font-bold mb-1">اتصال به پایگاه داده MySQL:</p>
                <p>لطفاً اطلاعات دسترسی به دیتابیس MySQL خود را به دقت وارد کنید. سیستم پس از اتصال موفق، جداول مورد نیاز را به صورت خودکار ایجاد و داده‌های پیش‌فرض را به آن منتقل خواهد کرد.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">آدرس سرور دیتابیس (Host)</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                    placeholder="localhost یا 127.0.0.1"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">پورت اتصال (Port)</label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-mono"
                    placeholder="3306"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">نام کاربری دیتابیس (User)</label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                    placeholder="root"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">رمز عبور دیتابیس (Password)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                    placeholder="••••••••"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 text-sm font-bold mb-2">نام دیتابیس (Database Name)</label>
                  <input
                    type="text"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                    placeholder="smart_realestate"
                  />
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-2 ${testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                  <span>{testResult.success ? '✓' : '⚠'}</span>
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-6 py-3.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {testing ? 'در حال تست...' : 'تست اتصال دیتابیس'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!testResult || !testResult.success}
                  className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <span>مرحله بعد (اطلاعات مدیر)</span>
                  <span>←</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleCompleteSetup} className="space-y-6">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-amber-900 text-sm leading-relaxed font-medium">
                <p className="font-bold mb-1">تعیین مشخصات ورود مدیر ارشد:</p>
                <p>در این مرحله نام کاربری و رمز عبور دلخواه برای مدیریت سامانه را وارد کنید. این مشخصات جایگزین مقادیر پیش‌فرض خواهند شد و در دیتابیس ایمن و هش شده ذخیره می‌گردند.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">نام کاربری مدیر (Admin Username)</label>
                  <input
                    type="text"
                    required
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">رمز عبور مدیر (Admin Password)</label>
                  <input
                    type="password"
                    required
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                    placeholder="رمز عبور ایمن وارد کنید"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">تایید رمز عبور مدیر</label>
                  <input
                    type="password"
                    required
                    value={adminPassConfirm}
                    onChange={(e) => setAdminPassConfirm(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                    placeholder="تکرار رمز عبور"
                  />
                </div>
              </div>

              {setupError && (
                <div className="p-4 rounded-xl border bg-rose-50 border-rose-100 text-rose-800 text-sm font-bold flex items-center gap-2">
                  <span>⚠</span>
                  <span>{setupError}</span>
                </div>
              )}

              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  بازگشت
                </button>

                <button
                  type="submit"
                  disabled={settingUp}
                  className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {settingUp ? 'در حال نصب و راه‌اندازی...' : 'ذخیره و تکمیل نهایی'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
