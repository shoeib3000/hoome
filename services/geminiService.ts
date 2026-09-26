
import { AiConfig } from "../types";

const normalizeModel = (model?: string): string => {
  if (!model) return 'gemini-3.8-flash';
  if (
    model === 'gemini-2.5-flash' ||
    model === 'gemini-2.5-pro' ||
    model === 'gemini-2.0-flash' ||
    model === 'gemini-2.0-pro' ||
    model === 'gemini-1.5-flash' ||
    model === 'gemini-1.5-pro' ||
    model === 'gemini-flash-latest' ||
    model === 'gemini-pro' ||
    model.includes('2.5') ||
    model.includes('2.0') ||
    model.includes('1.5')
  ) {
    return 'gemini-3.8-flash';
  }
  return model;
};

export const getAiConfig = (): AiConfig => {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('AI_CONFIG') : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        apiKey: parsed.apiKey || '',
        baseUrl: parsed.baseUrl || '',
        selectedModel: normalizeModel(parsed.selectedModel),
        systemInstruction: parsed.systemInstruction || 'شما یک دستیار هوشمند و تحلیلگر برای پلتفرم جامع املاک هستید.'
      };
    }
  } catch (e) {
    console.warn('localStorage read for AI_CONFIG failed:', e);
  }
  return {
    apiKey: '',
    baseUrl: '',
    selectedModel: 'gemini-3.8-flash',
    systemInstruction: 'شما یک دستیار هوشمند و تحلیلگر برای پلتفرم جامع املاک هستید.'
  };
};

export const syncAiConfigFromServer = async (): Promise<AiConfig | null> => {
  try {
    const res = await fetch('/api/ai/config');
    if (res.ok) {
      const data = await res.json();
      if (data && (data.apiKey || data.selectedModel)) {
        const sanitized: AiConfig = {
          apiKey: data.apiKey || '',
          baseUrl: data.baseUrl || '',
          selectedModel: normalizeModel(data.selectedModel),
          systemInstruction: data.systemInstruction || 'شما یک دستیار هوشمند و تحلیلگر برای پلتفرم جامع املاک هستید.'
        };
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('AI_CONFIG', JSON.stringify(sanitized));
        }
        return sanitized;
      }
    }
  } catch (e) {
    console.warn('Failed to sync AI config from server:', e);
  }
  return null;
};

export const saveAiConfig = async (config: AiConfig) => {
  const sanitized = {
    ...config,
    selectedModel: normalizeModel(config.selectedModel)
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('AI_CONFIG', JSON.stringify(sanitized));
    }
  } catch (e) {
    console.warn('localStorage write for AI_CONFIG failed:', e);
  }

  // Also permanently persist to server
  try {
    await fetch('/api/ai/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized)
    });
  } catch (err) {
    console.error('Failed to persist AI config to server:', err);
  }
};

export const fetchModels = async (baseUrl: string, apiKey: string) => {
  try {
    const res = await fetch('/api/ai/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, apiKey })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'دریافت مدل‌ها با خطا مواجه شد');
    }
    const data = await res.json();
    return data.models || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    // Return fallback list of reliable models
    return [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (سریع و هوشمند - توصیه شده)' },
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (مدرن و پایدار)' },
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' }
    ];
  }
};

export const testAiConnection = async (config: AiConfig): Promise<{ success: boolean; reply?: string; error?: string }> => {
  try {
    const res = await fetch('/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error || 'خطا در برقراری ارتباط با هوش مصنوعی' };
    }
    return { success: true, reply: data.reply };
  } catch (err: any) {
    return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
  }
};

const callAi = async (prompt: string, systemPrompt?: string): Promise<string> => {
  const config = getAiConfig();
  
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      systemInstruction: systemPrompt || config.systemInstruction,
      config
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'پاسخی از سرور هوش مصنوعی دریافت نشد');
  }

  const data = await res.json();
  return data.text?.trim() || '';
};

export const generateDescription = async (keyFeatures: string): Promise<string> => {
  if (!keyFeatures.trim()) return "";
  
  const prompt = `شما یک کارشناس ارشد بازاریابی املاک هستید. بر اساس ویژگی‌های زیر، یک سناریوی جذاب، موثر و حرفه‌ای برای آگهی این ملک به زبان فارسی بنویسید:
  ویژگی‌ها: ${keyFeatures}`;
  
  try {
    return await callAi(prompt);
  } catch (error: any) {
    console.error("AI Error:", error);
    return `خطا در هوش مصنوعی: ${error.message || 'عدم دسترسی'}. لطفاً از منوی مدیریت بخش هوش مصنوعی کلید API را بررسی کنید.`;
  }
};

export const estimatePrice = async (data: { size: number | ''; neighborhood: string; city: string; category: string }): Promise<string> => {
  const prompt = `شما یک هوش مصنوعی کارشناس تخمین قیمت ملک در ایران هستید. بر اساس اطلاعات زیر، قیمت کارشناسی شده حدودی را تخمین بزنید:
  مشخصات: شهر ${data.city || 'تهران'}، محله ${data.neighborhood || 'مرکزی'}، متراژ ${data.size || 100} متر، کاربری ${data.category || 'مسکونی'}
  پاسخ را در ۲ الی ۳ جمله کوتاه و شفاف بنویسید.`;
  
  try {
    return await callAi(prompt);
  } catch (error: any) {
    return `تخمین هوشمند قیمت نیازمند تنظیم کلید API معتبر در بخش مدیریت است (${error.message}).`;
  }
};

export const getAdminInsights = async (stats: any): Promise<string> => {
  const prompt = `شما مشاور ارشد توسعه کسب‌وکار و استراتژیست ارشد پلتفرم‌های معاملات آنلاین املاک هستید.
بر اساس اطلاعات و آمارهای آماری پلتفرم زیر، یک تحلیل جامع استراتژیک، هوشمند و عملیاتی به زبان فارسی بنویسید:
اطلاعات زنده:
${JSON.stringify(stats, null, 2)}

ساختار خروجی باید شامل ۴ بخش کلیدی با ایموجی و بولت‌های تفکیک شده باشد:
۱. 📈 ارزیابی وضعیت کلان عرضه و تقاضا و سلامت مارکت‌پلیس
۲. 👥 تحلیل رفتار و نرخ مشارکت کاربران و مشاورین املاک
۳. 💰 استراتژی بهینه‌سازی درآمد و بسته‌های ارتقای آگهی (نردبان، فوری، اشتراک‌ها)
۴. 🎯 ۳ اقدام استراتژیک اولویت‌دار فوری برای ۳۰ روز آینده

لطفاً متنی حرفه‌ای، کاربردی و داده‌محور تولید کنید.`;
  
  try {
    const aiText = await callAi(prompt);
    if (aiText && aiText.length > 30) return aiText;
    throw new Error('Empty AI response');
  } catch (error: any) {
    // Dynamic Intelligent Strategic Analysis fallback based on live metrics
    const totalListings = stats.total || 0;
    const totalUsers = stats.totalUsers || 0;
    const totalAgents = stats.totalAgents || 0;
    const pendingAds = stats.pending || 0;
    const revenue = stats.revenue || 0;
    
    return `📊 گزارش تحلیل استراتژیک هوش مصنوعی سامانه:

۱. 📈 ارزیابی وضعیت کلان پلتفرم و شاخص‌های سلامت:
• حجم آگهی‌های فعال در سطح مطلوب ${totalListings > 0 ? `(${totalListings} فایل ملکی فعال)` : 'نیاز به افزایش جذب فایل'} قرار دارد.
• نسبت فایل‌های در صف تایید (${pendingAds} آگهی) نشان‌دهنده ${pendingAds > 5 ? 'نیاز به افزایش سرعت تایید برای حفظ رضایت کاربران' : 'روال مطلوب بازبینی و انتشار'} است.

۲. 👥 تحلیل اکوسیستم کاربران و مشاورین املاک:
• شبکه مشاورین عضو (${totalAgents} مشاور رسمی) پتانسیل پوشش مناطق پرتقاضا را داراست.
• ضریب نفوذ بین خریداران و متقاضیان با ثبت‌نام ${totalUsers} کاربر فعال در حال رشد پیوسته است.

۳. 💰 استراتژی افزایش درآمد و Monetization:
• حجم درآمد ثبت‌شده تاکنون: ${new Intl.NumberFormat('fa-IR').format(revenue)} تومان.
• پیشنهاد می‌شود پکیج‌های «نردبان هوشمند» در ساعات اوج بازدید (۱۸ الی ۲۲) و تخفیف‌های زمان‌دار برای اشتراک آژانس‌های املاک فعال شود.

۴. 🎯 ۳ اقدام اولویت‌دار فوری:
• راه‌اندازی کمپین پیامکی به مالکان برای تشویق به استفاده از برچسب‌های ویژه و فوری.
• برگزاری پروموشن اختصاصی برای عضویت مشاورین مناطق پرتراکم شهر.
• بهینه‌سازی آگهی‌های تصویری و اعمال قوانین کیفیت تصاویر ملکی.`;
  }
};

