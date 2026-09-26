import React, { useState } from 'react';

interface AuthPromptModalProps {
    onClose: () => void;
    onSuccess: (name: string, phone: string) => void;
}

const AuthPromptModal: React.FC<AuthPromptModalProps> = ({ onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && phone.trim()) {
            onSuccess(name, phone);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[3rem] p-8 sm:p-12 w-full max-w-md shadow-2xl relative border border-white/20">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-xl shadow-blue-500/20">
                        💬
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">گفتگو با آگهی‌دهنده</h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium">برای شروع چت، لطفاً ثبت‌نام کنید یا وارد شوید.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2 mr-2">نام شما</label>
                        <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="مثلا: علی رضایی"
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2 mr-2">شماره تماس</label>
                        <input 
                            type="tel" 
                            required
                            dir="ltr"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0912XXXXXXX"
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-right"
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all mt-4"
                    >
                        تایید و شروع گفتگو
                    </button>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                    >
                        بعداً انجام می‌دهم
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthPromptModal;