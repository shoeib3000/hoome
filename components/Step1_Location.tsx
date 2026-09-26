import React from 'react';
import type { PropertyListing, Province } from '../types';
import { IRAN_PROVINCES } from '../data/iranProvinces';

interface Step1LocationProps {
  data: PropertyListing;
  setData: React.Dispatch<React.SetStateAction<PropertyListing>>;
  provinces: Province[];
}

const Step1Location: React.FC<Step1LocationProps> = ({ data, setData, provinces = [] }) => {
  const activeProvinces = provinces && provinces.length > 0 ? provinces : IRAN_PROVINCES;

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setData(prev => ({ ...prev, province: e.target.value, city: '' }));
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setData(prev => ({ ...prev, city: e.target.value }));
  };

  const selectedProvince = activeProvinces.find(p => p.name === data.province);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center md:text-right">
        <h2 className="text-2xl font-black text-slate-800">موقعیت مکانی ملک</h2>
        <p className="text-slate-500 mt-2 font-medium">آدرس دقیق ملک خود را برای نمایش در نقشه انتخاب کنید.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
          <label htmlFor="province" className="block text-sm font-black text-slate-700 mb-2 mr-2">
            انتخاب استان <span className="text-rose-500">*</span>
          </label>
          <select
            id="province"
            name="province"
            value={data.province}
            onChange={handleProvinceChange}
            className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700 appearance-none"
          >
            <option value="">استان را انتخاب کنید...</option>
            {activeProvinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-black text-slate-700 mb-2 mr-2">
            انتخاب شهر <span className="text-rose-500">*</span>
          </label>
          <select
            id="city"
            name="city"
            disabled={!data.province}
            value={data.city}
            onChange={handleCityChange}
            className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700 appearance-none disabled:opacity-50 disabled:bg-slate-50"
          >
            <option value="">شهر را انتخاب کنید...</option>
            {selectedProvince?.cities.map((city, idx) => <option key={idx} value={city}>{city}</option>)}
          </select>
        </div>
      </div>
       <div>
        <label htmlFor="neighborhood" className="block text-sm font-black text-slate-700 mb-2 mr-2">نام محله / خیابان</label>
        <input
          type="text"
          id="neighborhood"
          name="neighborhood"
          value={data.neighborhood}
          onChange={(e) => setData(prev => ({ ...prev, neighborhood: e.target.value }))}
          className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700"
          placeholder="مثال: زعفرانیه، خیابان آصف"
        />
      </div>

      <div className="p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">📍</div>
          <p className="text-xs font-bold text-blue-800 leading-relaxed">
              انتخاب دقیق موقعیت مکانی باعث می‌شود آگهی شما در فیلترهای منطقه‌ای کاربران بیشتر دیده شود.
          </p>
      </div>
    </div>
  );
};

export default Step1Location;