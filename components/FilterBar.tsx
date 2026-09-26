import React, { useState, useEffect } from 'react';
import type { Category } from '../types';

export interface Filters {
    city: string;
    category: string;
    type: 'all' | 'rent' | 'sale';
}

interface FilterBarProps {
    onFilterChange: (filters: Filters) => void;
    categories?: Category[];
}

const FilterBar: React.FC<FilterBarProps> = ({ onFilterChange, categories = [] }) => {
    const [filters, setFilters] = useState<Filters>({
        city: '',
        category: 'all',
        type: 'all',
    });

    useEffect(() => {
        const handler = setTimeout(() => {
            onFilterChange(filters);
        }, 300);
        return () => clearTimeout(handler);
    }, [filters, onFilterChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({...prev, [name]: value }));
    };

    // Standard fallback categories if none are provided
    const displayCategories = categories.length > 0 ? categories : [
        { id: 'apt', name: 'آپارتمان', icon: '🏢' },
        { id: 'house', name: 'ویلایی', icon: '🏡' },
        { id: 'office', name: 'اداری', icon: '💼' },
        { id: 'land', name: 'زمین و کلنگی', icon: '🏗️' }
    ];

    return (
        <div className="glass-effect p-2 sm:p-3 rounded-[2rem] shadow-xl shadow-slate-200/50 mb-10 border border-white/60">
            <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <input 
                        type="text"
                        name="city"
                        value={filters.city}
                        onChange={handleChange}
                        placeholder="کدام شهر هستید؟"
                        className="block w-full pr-11 pl-4 py-3.5 bg-white/50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
                    />
                </div>
                
                <div className="flex gap-2">
                    <select 
                        name="category" 
                        value={filters.category} 
                        onChange={handleChange} 
                        className="bg-white/50 border-none rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm font-bold text-slate-600 appearance-none min-w-[120px] cursor-pointer"
                    >
                        <option value="all">نوع ملک</option>
                        {displayCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>

                    <select 
                        name="type" 
                        value={filters.type} 
                        onChange={handleChange} 
                        className="bg-white/50 border-none rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm font-bold text-slate-600 appearance-none min-w-[120px] cursor-pointer"
                    >
                        <option value="all">همه آگهی‌ها</option>
                        <option value="sale">فروش</option>
                        <option value="rent">اجاره</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
