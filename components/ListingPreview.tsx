import React from 'react';
import type { PropertyListing } from '../types';
import { getPriceSpelling, toPersianDigits } from '../utils/priceUtils';

interface ListingPreviewProps {
  data: PropertyListing;
}

const BedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
  </svg>
);

const AreaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
  </svg>
);

const ListingPreview: React.FC<ListingPreviewProps> = ({ data }) => {
  const isRent = data.type === 'rent';
  const priceSpelling = getPriceSpelling(data.price);
  const depositSpelling = getPriceSpelling(data.deposit || data.price);
  const rentSpelling = getPriceSpelling(data.rent);

  // Formatted size with decimals
  const formattedSize = data.size ? toPersianDigits(data.size) : '--';

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3]">
        <img 
          className="w-full h-full object-cover" 
          src={data.images[0] || `https://ui-avatars.com/api/?name=ملک&background=4F46E5&color=fff&size=512&font-size=0.33`}
          alt="تصویر ملک"
        />
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 backdrop-blur-md px-3 py-1 text-[10px] font-black rounded-full shadow-sm text-slate-800">
            {isRent ? 'رهن و اجاره' : 'فروش نقدی'}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-black text-slate-900 line-clamp-1">{data.title || 'عنوان آگهی'}</h3>
        <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-tighter">
          {data.city ? `${data.neighborhood ? data.neighborhood + '، ' : ''}${data.city}` : 'موقعیت ثبت نشده'}
        </p>
        
        <div className="flex gap-4 my-4">
          <div className="flex items-center text-slate-600 text-[11px] font-black">
            <AreaIcon />
            <span>{formattedSize} متر</span>
          </div>
          <div className="flex items-center text-slate-600 text-[11px] font-black">
            <BedIcon />
            <span>{data.bedrooms ? toPersianDigits(data.bedrooms) + ' خواب' : '--'}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
          {isRent ? (
            <div className="space-y-0.5 text-right">
              <div className="text-indigo-600 font-black text-xs">
                <span className="text-[10px] text-slate-400 font-normal ml-1">ودیعه:</span>
                {depositSpelling.shortText || 'توافقی'}
              </div>
              {data.rent !== undefined && data.rent !== '' && Number(data.rent) > 0 && (
                <div className="text-amber-600 font-black text-[11px]">
                  <span className="text-[10px] text-slate-400 font-normal ml-1">اجاره:</span>
                  {rentSpelling.shortText}
                </div>
              )}
            </div>
          ) : (
            <span className="text-indigo-600 font-black text-sm">
              {priceSpelling.shortText || 'توافقی'}
            </span>
          )}
          <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingPreview;
