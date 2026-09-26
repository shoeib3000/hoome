
import React from 'react';
import type { PropertyListing, PromotionPlan } from '../types';

interface ListingCardProps {
  data: PropertyListing;
  onClick: (listing: PropertyListing) => void;
  onToggleLike?: (id: string) => void;
  promotionPlans?: PromotionPlan[];
}

const ListingCard: React.FC<ListingCardProps> = React.memo(({ data, onClick, onToggleLike, promotionPlans = [] }) => {
  const formattedPrice = data.price ? new Intl.NumberFormat('fa-IR').format(Number(data.price)) : 'توافقی';
  const activePlan = (promotionPlans || []).find(p => p.id === data.promotion);
  
  const isPremium = activePlan && activePlan.priorityLevel > 2;

  const handleClick = React.useCallback(() => {
    onClick(data);
  }, [onClick, data]);

  return (
    <div 
      onClick={handleClick} 
      className={`group cursor-pointer bg-white rounded-[3rem] border transition-all duration-700 overflow-hidden flex flex-col h-full relative 
        ${isPremium ? 'premium-glow border-indigo-200' : 'border-slate-100 hover:border-indigo-300 hover:shadow-2xl hover:translate-y-[-10px]'}`}
    >
      {/* Visual Header */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
          src={data.images[0] || `https://ui-avatars.com/api/?name=Property&background=4F46E5&color=fff&size=512`}
          alt={data.title}
          loading="lazy"
        />
        
        {/* Dynamic Badges */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
            <button 
                onClick={(e) => { e.stopPropagation(); if(onToggleLike) onToggleLike(data.id!); }}
                className={`w-12 h-12 rounded-2xl glass-effect flex items-center justify-center transition-all pointer-events-auto ${data.isLiked ? 'text-rose-500 bg-white' : 'text-white bg-black/20 hover:bg-white/40'}`}
            >
                <svg className={`w-6 h-6 ${data.isLiked ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            </button>
            
            <div className="flex flex-col gap-2 items-end">
                {/* Real Estate Consultant Badge */}
                {(data.isAgentListing || data.ownerRole === 'agent') && (
                    <span className="px-3.5 py-1.5 bg-emerald-600/95 text-white text-[10px] font-black rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5 border border-emerald-400/40 animate-fade-in">
                        <span>🏢</span>
                        <span>{data.agencyName ? `املاک ${data.agencyName}` : 'مشاور املاک'}</span>
                    </span>
                )}
                {activePlan && (
                    <span className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-full shadow-2xl flex items-center gap-2">
                        <span>{activePlan.icon}</span> {activePlan.title}
                    </span>
                )}
                <span className={`px-4 py-2 rounded-full text-[10px] font-black text-white ${data.type === 'sale' ? 'bg-rose-500' : 'bg-indigo-500'}`}>
                    {data.type === 'sale' ? 'فروش' : 'اجاره'}
                </span>
            </div>
        </div>

        {/* Info Overlay (Bottom) */}
        <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">{data.category}</p>
                    <h3 className="text-xl font-black text-white leading-tight group-hover:text-indigo-300 transition-colors">{data.title}</h3>
                </div>
                <div className="text-right">
                    <p className="text-indigo-400 text-[10px] font-black mb-1">قیمت نهایی</p>
                    <p className="text-xl font-black text-white whitespace-nowrap">{formattedPrice}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-8 flex-grow flex flex-col">
        <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-slate-500">
                <span className="text-xs font-black">{data.size} متر</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
                <span className="text-xs font-black">{data.bedrooms} خواب</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
                <span className="text-xs font-black">{data.yearBuilt} ساخت</span>
            </div>
        </div>
        
        <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-6">
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${data.isAgentListing || data.ownerRole === 'agent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {data.isAgentListing || data.ownerRole === 'agent' ? '🏢' : '👤'}
                </div>
                <span className={`text-[10px] font-bold ${data.isAgentListing || data.ownerRole === 'agent' ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
                    {data.isAgentListing || data.ownerRole === 'agent' ? (data.agencyName ? `املاک ${data.agencyName}` : 'مشاور املاک') : 'مالک شخصی'}
                </span>
            </div>
            <p className="text-[10px] font-black text-indigo-600 flex items-center gap-1 group-hover:translate-x-[-5px] transition-transform">
                مشاهده جزئیات <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
            </p>
        </div>
      </div>
    </div>
  );
});

export default ListingCard;
