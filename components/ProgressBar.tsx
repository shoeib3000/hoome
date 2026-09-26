import React from 'react';
import { WIZARD_STEPS } from '../constants';
import type { WizardStep } from '../types';

interface ProgressBarProps {
  currentStep: WizardStep;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => {
  const currentIndex = Math.max(0, WIZARD_STEPS.findIndex(step => step.id === currentStep));

  return (
    <div className="w-full max-w-xl mx-auto px-2" dir="rtl">
      <div className="flex items-center justify-between relative">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-6 right-6 h-1.5 bg-slate-100 -translate-y-1/2 rounded-full -z-10"></div>
        
        {/* Active Progress Fill */}
        <div 
          className="absolute top-1/2 right-6 h-1.5 bg-gradient-to-l from-indigo-600 to-blue-500 -translate-y-1/2 rounded-full -z-10 transition-all duration-500"
          style={{ width: `${(currentIndex / Math.max(1, WIZARD_STEPS.length - 1)) * (100 - 16)}%` }}
        ></div>

        {WIZARD_STEPS.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.id} className="flex items-center gap-2 group">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-300 shadow-md ${
                  isCurrent 
                    ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white scale-110 ring-4 ring-indigo-100 shadow-indigo-500/30' 
                    : isActive 
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                      : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}
              >
                {isActive && !isCurrent ? '✓' : step.stepNumber || index + 1}
              </div>
              <div className="hidden sm:block text-right">
                <span className={`block text-[10px] font-black uppercase tracking-wider ${
                  isCurrent ? 'text-indigo-600' : isActive ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  مرحله {index + 1}
                </span>
                <span className={`block text-xs font-bold ${
                  isCurrent ? 'text-slate-900 font-black' : 'text-slate-500'
                }`}>
                  {step.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
