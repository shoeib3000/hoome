import React, { useState } from 'react';
import type { PropertyListing, User, PromotionPlan, AdSlot } from '../types';
import AuthPromptModal from './AuthPromptModal';

interface ListingDetailModalProps {
  listing: PropertyListing;
  plan?: PromotionPlan;
  user: User | null;
  adSlots?: AdSlot[];
  onClose: () => void;
  onStartChat: (listing: PropertyListing, seeker: User) => void;
  onRegister: (name: string, phone: string) => Promise<User> | User | void;
}

const BedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
);
const AreaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
    </svg>
);

const ListingDetailModal: React.FC<ListingDetailModalProps> = ({ listing, plan, user, adSlots = [], onClose, onStartChat, onRegister }) => {
  const [selectedImage, setSelectedImage] = useState(listing.images[0]);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showRealContact, setShowRealContact] = useState(false);

  const sidebarAd = adSlots.find(s => s.isActive && s.position === 'sidebar');

  const formattedPrice = listing.price ? new Intl.NumberFormat('fa-IR').format(Number(listing.price)) : 'توافقی';
  
  // Logic: Contact info might be hidden for basic ads if configured in types.ts (currently all plans show it)
  const isContactVisible = plan ? plan.contactVisible : true;

  const handleChatClick = () => {
    if (user) onStartChat(listing, user);
    else setShowAuthPrompt(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 transition-all animate-step" onClick={onClose}>
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row border border-white/20" onClick={(e) => e.stopPropagation()}>
        <div className="w-full md:w-3/5 bg-slate-50 relative p-6 flex flex-col min-h-[300px] md:min-h-0 shrink-0 md:shrink">
            <div className="flex-grow rounded-[2rem] overflow-hidden shadow-inner bg-slate-200 h-full">
                <img src={selectedImage || `https://ui-avatars.com/api/?name=Property`} className="w-full h-full object-cover" />
            </div>
            {listing.images.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                    {listing.images.map((img, idx) => (
                        <button key={idx} onClick={() => setSelectedImage(img)} className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-4 transition-all ${selectedImage === img ? 'border-blue-600' : 'border-white'}`}>
                            <img src={img} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
            <button onClick={onClose} className="absolute top-8 right-8 w-12 h-12 glass-effect rounded-2xl flex items-center justify-center text-slate-800 hover:bg-white transition-all shadow-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>

        <div className="md:w-2/5 p-8 sm:p-12 overflow-y-auto flex flex-col">
            <div className="mb-8">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${plan?.id === 'diamond' ? 'bg-cyan-100 text-cyan-700' : 'bg-blue-50 text-blue-700'}`}>
                        {listing.category} {plan?.id !== 'none' && `(${plan?.title})`}
                    </span>
                    {(listing.isAgentListing || listing.ownerRole === 'agent') && (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-sm">
                            <span>🏢</span>
                            <span>{listing.agencyName ? `مشاور املاک (${listing.agencyName})` : 'مشاور املاک تایید شده'}</span>
                        </span>
                    )}
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-2 leading-tight">{listing.title}</h2>
                <p className="text-slate-500 font-medium flex items-center"><svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>{listing.city}، {listing.neighborhood}</p>
            </div>

            <div className="flex gap-6 py-6 border-y border-slate-100 mb-8">
                <div className="flex items-center"><AreaIcon /><div><p className="text-[10px] text-slate-400 font-bold uppercase">متراژ</p><p className="text-sm font-black text-slate-800">{listing.size} متر</p></div></div>
                <div className="flex items-center"><BedIcon /><div><p className="text-[10px] text-slate-400 font-bold uppercase">خواب</p><p className="text-sm font-black text-slate-800">{listing.bedrooms} اتاق</p></div></div>
            </div>

            <div className="mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">توضیحات ملک</h3>
                <p className="text-slate-600 leading-relaxed text-sm font-medium">{listing.description}</p>
            </div>

            <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col gap-4">
                {sidebarAd && (
                    <div className="mb-4 bg-indigo-50 rounded-2xl p-4 border border-indigo-100 overflow-hidden relative group">
                        <div className="flex items-center gap-4">
                            <img src={sidebarAd.imageUrl} className="w-12 h-12 rounded-xl object-cover" alt="ad" />
                            <div className="flex-grow">
                                <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">پیشنهاد حامی</h5>
                                <p className="text-xs font-bold text-slate-800 leading-tight">{sidebarAd.title}</p>
                            </div>
                            <a href={sidebarAd.linkUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                            </a>
                        </div>
                    </div>
                )}
                {/* Advertiser info badge box */}
                <div className={`p-4 rounded-2xl flex items-center justify-between ${(listing.isAgentListing || listing.ownerRole === 'agent') ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${(listing.isAgentListing || listing.ownerRole === 'agent') ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700'}`}>
                            {(listing.isAgentListing || listing.ownerRole === 'agent') ? '🏢' : '👤'}
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold">نوع آگهی‌دهنده</p>
                            <p className="text-xs font-black text-slate-800">
                                {(listing.isAgentListing || listing.ownerRole === 'agent') ? (listing.agencyName ? `مشاور املاک (${listing.agencyName})` : 'مشاور املاک') : 'مالک شخصی'}
                            </p>
                        </div>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${(listing.isAgentListing || listing.ownerRole === 'agent') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {(listing.isAgentListing || listing.ownerRole === 'agent') ? 'مشاور تایید شده' : 'مالک عادی'}
                    </span>
                </div>

                <div className="flex justify-between items-center"><span className="text-slate-400 text-sm font-bold">قیمت</span><span className="text-2xl font-black text-blue-700">{formattedPrice} <span className="text-xs font-medium">تومان</span></span></div>
                
                {/* Contact Actions Based on User Configuration */}
                {listing.contactMethod === 'chat_only' || listing.showPhoneNumber === false ? (
                    <div className="space-y-2">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                            <span className="text-[11px] font-bold text-blue-800 flex items-center justify-center gap-1.5">
                                <span>🔒💬</span>
                                <span>مالک ارتباط از طریق چت را انتخاب نموده و شماره تماس مخفی است.</span>
                            </span>
                        </div>
                        <button 
                            onClick={handleChatClick} 
                            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 text-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                            شروع چت و گفتگو با مالک
                        </button>
                    </div>
                ) : listing.contactMethod === 'phone_only' ? (
                    <div className="space-y-2">
                        <button 
                            onClick={() => setShowRealContact(true)}
                            className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            {showRealContact ? (listing.contactPhone || '09123456789') : 'نمایش شماره تماس مستقیم'}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onClick={handleChatClick} className="py-5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 text-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                            چت با مالک
                        </button>
                        {isContactVisible ? (
                            <button 
                                onClick={() => setShowRealContact(true)}
                                className="py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl text-sm"
                            >
                                {showRealContact ? (listing.contactPhone || '09123456789') : 'نمایش تماس'}
                            </button>
                        ) : (
                            <div className="py-5 bg-slate-100 text-slate-400 rounded-2xl font-bold flex items-center justify-center text-xs text-center px-4">اطلاعات تماس محدود</div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
      {showAuthPrompt && <AuthPromptModal onClose={() => setShowAuthPrompt(false)} onSuccess={(n, p) => { onRegister(n, p); setShowAuthPrompt(false); }} />}
    </div>
  );
};

export default ListingDetailModal;