import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Building2, Send, X, Bot, Compass, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AiAssistantProps {
  onClose: () => void;
  onSendCommand: (command: string) => Promise<string>;
}

const QUICK_SUGGESTIONS = [
  '🏠 ارزان‌ترین آپارتمان‌ها',
  '🔑 املاک رهن و اجاره',
  '📝 راهنمای ثبت آگهی ملک',
  '🏢 شرایط مشاورین املاک'
];

const AiAssistant: React.FC<AiAssistantProps> = ({ onClose, onSendCommand }) => {
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string; time?: string }[]>([
    { 
      sender: 'ai', 
      text: 'سلام! من دستیار ملک هستم 🏢✨\nدر پیدا کردن بهترین ملک، مشاوره قیمت، رهن و اجاره، یا ثبت و مدیریت آگهی‌ها در سامانه چطور می‌توانم کمکتان کنم؟',
      time: 'هم‌اکنون'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isLoading) return;

    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...messages, { sender: 'user' as const, text: textToSend, time: timeStr }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await onSendCommand(textToSend);
      // Clean any raw navigate or filter tags from user-facing text if needed, but keep the helpful text
      const cleanReply = (aiResponse || 'پاسخی از دستیار دریافت نشد.').replace(/\[NAVIGATE:.*?\]/g, '').replace(/\[FILTER:.*?\]/g, '').trim();
      setMessages(prev => [...prev, { 
        sender: 'ai' as const, 
        text: cleanReply || aiResponse || 'درخواست شما بررسی شد.',
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      setMessages(prev => [...prev, { 
        sender: 'ai' as const, 
        text: error?.message || 'متاسفانه در برقراری ارتباط با دستیار خطایی رخ داد. لطفاً دوباره تلاش کنید.',
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] w-full max-w-md animate-fade-in-up" dir="rtl">
      <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.3)] border border-indigo-100/80 flex flex-col h-[75vh] max-h-[640px] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 p-2.5">
                <Building2 className="w-full h-full stroke-[2.2]" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
              </span>
            </div>
            
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-white tracking-tight">دستیار ملک</h3>
                <span className="px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/40 rounded-full text-[10px] font-black text-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" /> هوشمند
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/80 font-medium flex items-center gap-1 mt-0.5">
                <span>مشاور و راهنمای ۲۴ ساعته پلتفرم</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition-all relative z-10"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestions */}
        <div className="bg-slate-50/90 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0">
          {QUICK_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(item.replace(/^[^\s]+\s/, ''))}
              disabled={isLoading}
              className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-xl border border-slate-200/70 hover:border-indigo-200 transition-all whitespace-nowrap shadow-2xs flex-shrink-0 disabled:opacity-50"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-grow p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-start flex-row-reverse' : 'justify-start'}`}
            >
              {msg.sender === 'ai' ? (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm p-1.5">
                  <Building2 className="w-full h-full" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white flex-shrink-0 text-xs font-bold shadow-sm">
                  شما
                </div>
              )}

              <div 
                className={`p-3.5 sm:p-4 rounded-2xl max-w-[82%] text-xs sm:text-sm font-medium leading-relaxed shadow-2xs ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-bl-sm font-normal' 
                    : 'bg-white border border-slate-100 text-slate-800 rounded-br-sm'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>
                {msg.time && (
                  <div className={`text-[9px] mt-1.5 text-right font-mono ${msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {msg.time}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-end gap-2.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 p-1.5 shadow-sm">
                <Building2 className="w-full h-full" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                  <span className="mr-2 text-[11px] text-slate-400">دستیار ملک در حال تفکر...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder="سوال یا دستور خود را بنویسید (مثلاً: آپارتمان در تهران)..."
              className="flex-grow px-3 py-2 bg-transparent border-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
              disabled={isLoading}
            />
            <button 
              onClick={() => handleSend()} 
              disabled={isLoading || !input.trim()} 
              className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 disabled:shadow-none flex-shrink-0"
              title="ارسال پیام"
            >
              <Send className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
          <div className="mt-1.5 text-center text-[10px] text-slate-400 font-medium">
            پشتیبانی از تحلیل هوشمند املاک و راهنمایی کاربران
          </div>
        </div>

      </div>
    </div>
  );
};

export default AiAssistant;
