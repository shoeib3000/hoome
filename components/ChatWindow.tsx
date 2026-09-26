import React, { useState, useEffect, useRef } from 'react';
import type { Conversation, User } from '../types';

interface ChatWindowProps {
    conversation: Conversation;
    currentUser: User;
    onSendMessage: (convId: string, text: string) => void;
    onClose: () => void;
}

const PRESET_MESSAGES_SEEKER = [
    'سلام، آیا این ملک هنوز موجود است؟',
    'امکان بازدید حضوری در چه روزها و ساعاتی هست؟',
    'آیا شرایط تبدیل رهن و اجاره قابل مذاکره است؟',
    'لطفاً جهت هماهنگی بیشتر شماره تماس بفرمایید.'
];

const PRESET_MESSAGES_OWNER = [
    'سلام، بله ملک موجود است و می‌توانید برای بازدید تشریف بیاورید.',
    'برای هماهنگی بازدید لطفاً در ساعات کاری تماس بگیرید.',
    'قیمت و شرایط تا حدودی قابل مذاکره و توافق است.',
    'در خدمت شما هستم، چه سوالی در مورد ملک دارید؟'
];

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, currentUser, onSendMessage, onClose }) => {
    const [inputText, setInputText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const isOwner = currentUser.id === conversation.ownerId;
    const isSeeker = currentUser.id === conversation.seekerId;
    const presetMessages = isOwner ? PRESET_MESSAGES_OWNER : PRESET_MESSAGES_SEEKER;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [conversation.messages]);

    const handleSend = (customText?: string) => {
        const text = (customText !== undefined ? customText : inputText).trim();
        if (text) {
            onSendMessage(conversation.id, text);
            if (customText === undefined) {
                setInputText('');
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-[2.5rem] overflow-hidden border border-slate-200/80 shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md">
                <div className="flex items-center gap-3.5">
                    <img 
                        src={conversation.listingImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=120&q=70'} 
                        className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-200" 
                        alt="" 
                    />
                    <div>
                        <h4 className="text-sm font-black text-slate-900 line-clamp-1">{conversation.listingTitle}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[11px] text-slate-500 font-bold">
                                {isOwner ? 'گفتگو با متقاضی / خریدار' : 'گفتگو با آگهی‌دهنده / مالک'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-200/70 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        title="بستن چت"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>

            {/* Quick Listing Info Banner */}
            <div className="px-5 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                    <span>🏢</span>
                    <span className="line-clamp-1">مربوط به آگهی: {conversation.listingTitle}</span>
                </div>
                <span className="text-[10px] font-black text-indigo-700 bg-white px-2.5 py-0.5 rounded-full shadow-xs border border-indigo-200">
                    {isOwner ? 'شما: آگهی‌دهنده' : 'شما: متقاضی'}
                </span>
            </div>

            {/* Messages */}
            <div 
                ref={scrollRef}
                className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40 scroll-smooth"
            >
                {conversation.messages.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <span className="text-4xl block mb-2">👋</span>
                        <p className="font-bold text-xs">هنوز پیامی ارسال نشده است.</p>
                        <p className="text-[11px] text-slate-400 mt-1">با ارسال پیام یا انتخاب پیام‌های آماده زیر گفتگو را شروع کنید.</p>
                    </div>
                )}

                {conversation.messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isSystem = msg.senderId === 'system';

                    if (isSystem) return (
                        <div key={msg.id} className="text-center my-2">
                            <span className="inline-block px-4 py-1.5 bg-slate-200/70 text-slate-600 rounded-full text-[10px] font-black">
                                {msg.text}
                            </span>
                        </div>
                    );

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-[1.5rem] shadow-sm text-xs sm:text-sm font-medium leading-relaxed ${
                                isMe 
                                ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-500/20' 
                                : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                            }`}>
                                <p className="whitespace-pre-line">{msg.text}</p>
                                <div className={`text-[9px] mt-2 font-mono flex items-center gap-1 ${isMe ? 'text-indigo-200 justify-start' : 'text-slate-400 justify-end'}`}>
                                    <span>{new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isMe && <span>✓✓</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Preset Buttons */}
            <div className="px-4 py-2.5 bg-white border-t border-slate-100 overflow-x-auto flex items-center gap-2 scrollbar-hide">
                <span className="text-[10px] font-black text-slate-400 whitespace-nowrap pl-1">پیام‌های آماده:</span>
                {presetMessages.map((msg, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSend(msg)}
                        className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-bold transition-all border border-slate-200/70 active:scale-95 flex-shrink-0"
                    >
                        {msg}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-100 bg-white">
                <div className="relative flex items-center gap-2">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="پیام خود را بنویسید..."
                        className="w-full pl-14 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-xs sm:text-sm"
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={!inputText.trim()}
                        className="absolute left-2 top-2 bottom-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        <span className="text-xs font-black">ارسال</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;